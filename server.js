/* ============================================================
 *  STICK BLADE ARENA — multiplayer relay server
 *  Serves index.html and relays WebSocket messages between
 *  players in the same room. Dumb relay (no simulation) so it
 *  stays light and tunnels cleanly through ngrok.
 *
 *  Run:   npm install      (once)
 *         npm start        (or: node server.js)
 *  Share: ngrok http 3000  ->  give friends the https URL + room code
 * ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { Firestore } = require('@google-cloud/firestore');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// --- leaderboard (Firestore) --------------------------------------------
// Durable + serverless: on Cloud Run the client auto-authenticates via the
// service account (Application Default Credentials) and the DB persists across
// cold starts and redeploys — no volume or keep-warm needed. Locally it needs
// GOOGLE_APPLICATION_CREDENTIALS or the Firestore emulator (FIRESTORE_EMULATOR_HOST);
// if neither is set the game still runs, just without leaderboard persistence.
// Each board is a single-field descending orderBy, so Firestore's automatic
// single-field indexes cover it — no composite index setup required.
const LB_LIMIT = 10;
let fsdb = null;
try {
  fsdb = new Firestore({ ignoreUndefinedProperties: true });
  console.log('  Leaderboard: Firestore client initialised');
} catch (e) {
  console.error('  Leaderboard: Firestore unavailable (' + e.message + ') — scores disabled.');
  fsdb = null;
}

function cleanName(n) { return ('' + (n == null ? '' : n)).replace(/[\x00-\x1f]/g, '').trim().slice(0, 14) || 'Anon'; }
function clampInt(v, max) { v = Math.floor(Number(v)); if (!isFinite(v) || v < 0) return 0; return v > max ? max : v; }
function emptyBoards() { return { practice: { score: [], wave: [], kills: [] }, mp: { kills: [] } }; }

async function topBy(coll, field) {
  const snap = await fsdb.collection(coll).orderBy(field, 'desc').limit(LB_LIMIT).get();
  return snap.docs.map((d) => { const v = d.data(); return { name: v.name, score: v.score, wave: v.wave, kills: v.kills, deaths: v.deaths }; });
}
async function readLeaderboards() {
  if (!fsdb) return emptyBoards();
  const [score, wave, kills, mpKills] = await Promise.all([
    topBy('practice', 'score'), topBy('practice', 'wave'), topBy('practice', 'kills'), topBy('mp', 'kills'),
  ]);
  return { practice: { score, wave, kills }, mp: { kills: mpKills } };
}
async function submitScore(m) {
  if (!fsdb || !m) return;
  const name = cleanName(m.name);
  const ts = Date.now();
  if (m.mode === 'mp') {
    await fsdb.collection('mp').add({ name, kills: clampInt(m.kills, 100000), deaths: clampInt(m.deaths, 100000), ts });
  } else {
    await fsdb.collection('practice').add({ name, score: clampInt(m.score, 100000000), wave: clampInt(m.wave, 100000), kills: clampInt(m.kills, 100000), ts });
  }
}

// --- static file serving (index.html only, plus a health check) ---
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/' || url === '') url = '/index.html';
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }

  // --- leaderboard API ---
  if (url === '/api/leaderboard' && req.method === 'GET') {
    readLeaderboards()
      .then((data) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); })
      .catch((e) => { console.error('leaderboard read failed:', e.message); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(emptyBoards())); });
    return;
  }
  if (url === '/api/score' && req.method === 'POST') {
    let body = ''; let tooBig = false;
    req.on('error', () => {});
    req.on('data', (c) => { body += c; if (body.length > 4096) { tooBig = true; req.destroy(); } });
    req.on('end', () => {
      if (tooBig) return;
      let m = null; try { m = JSON.parse(body); } catch (e) {}
      submitScore(m).catch((e) => console.error('score write failed:', e.message));  // fire-and-forget
      res.writeHead(204); res.end();
    });
    return;
  }
  const file = path.join(ROOT, path.normalize(url).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- rooms ---
const wss = new WebSocket.Server({ server });
const rooms = new Map();           // code -> { code, ownerId, max, members: Map(id -> ws) }
let nextId = 1;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function makeCode() {
  let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]; }
  while (rooms.has(c));
  return c;
}
function send(ws, obj) { try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); } catch (e) {} }
function broadcast(room, obj, exceptId) {
  for (const [id, ws] of room.members) if (id !== exceptId) send(ws, obj);
}
function freeSlot(room) {
  const used = new Set(); for (const [, ws] of room.members) used.add(ws.slot);
  for (let s = 0; s < room.max; s++) if (!used.has(s)) return s;
  return room.members.size; // fallback (shouldn't happen due to full check)
}
function roster(room) {
  const list = [];
  for (const [id, ws] of room.members) list.push({ id, name: ws.name, slot: ws.slot });
  return list;
}
function leaveRoom(ws) {
  const room = rooms.get(ws.room);
  if (!room) return;
  room.members.delete(ws.id);
  broadcast(room, { t: 'peerLeft', id: ws.id });
  if (room.members.size === 0) { rooms.delete(room.code); }
  else if (room.ownerId === ws.id) {
    // transfer ownership to an arbitrary remaining member
    room.ownerId = room.members.keys().next().value;
    broadcast(room, { t: 'owner', id: room.ownerId });
  }
  ws.room = null;
}

wss.on('connection', (ws) => {
  ws.id = nextId++;
  ws.room = null;
  ws.name = 'Fighter';
  ws.slot = 0;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    switch (m.t) {
      case 'create': {
        if (ws.room) leaveRoom(ws);
        ws.name = ('' + (m.name || 'Fighter')).slice(0, 14) || 'Fighter';
        const max = Math.max(2, Math.min(8, (m.max | 0) || 4));
        const code = makeCode();
        ws.slot = 0;
        const room = { code, ownerId: ws.id, max, members: new Map([[ws.id, ws]]) };
        rooms.set(code, room);
        ws.room = code;
        send(ws, { t: 'created', code, id: ws.id, slot: 0, max, owner: ws.id, players: roster(room) });
        break;
      }
      case 'join': {
        const code = ('' + (m.code || '')).toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { t: 'error', m: 'Room "' + code + '" not found.' }); break; }
        if (room.members.size >= room.max) { send(ws, { t: 'error', m: 'Room is full (' + room.max + ' players).' }); break; }
        if (ws.room) leaveRoom(ws);
        ws.name = ('' + (m.name || 'Fighter')).slice(0, 14) || 'Fighter';
        ws.slot = freeSlot(room);
        ws.room = code;
        room.members.set(ws.id, ws);
        send(ws, { t: 'joined', code, id: ws.id, slot: ws.slot, max: room.max, owner: room.ownerId, players: roster(room) });
        broadcast(room, { t: 'peerJoined', id: ws.id, name: ws.name, slot: ws.slot }, ws.id);
        break;
      }
      case 'leave': {
        leaveRoom(ws);
        break;
      }
      // relayed gameplay messages — server stamps the sender id
      case 'state':
      case 'hit':
      case 'parried':
      case 'fx':
      case 'died':
      case 'respawn':
      case 'chat': {
        const room = rooms.get(ws.room);
        if (!room) break;
        m.id = ws.id;
        broadcast(room, m, ws.id);
        break;
      }
    }
  });

  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => {});
});

// keepalive ping (drops dead ngrok/idle connections)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; try { ws.ping(); } catch (e) {}
  });
}, 30000);
wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
  console.log('========================================================');
  console.log('  STICK BLADE ARENA server running');
  console.log('  Local:   http://localhost:' + PORT);
  console.log('  Online:  run  "ngrok http ' + PORT + '"  and share the https URL');
  console.log('           (friends open the URL, then enter the room code)');
  console.log('========================================================');
});
