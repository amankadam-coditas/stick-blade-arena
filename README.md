# Stick Blade Arena

A browser-based 2D stickman sword fighter — articulated stick figures, light/heavy attacks,
blocking & parries, screen shake, hit-stop, blood/sparks, sword trails, a parallax night sky,
and fully procedural WebAudio sound. Two modes:

- **Practice vs AI** — wave-survival against grunt / berserker / heavy enemies that approach,
  telegraph, block and fight back. No server needed; just open the page.
- **Online PvP Deathmatch** — create a room, share a 4-letter code, and brawl with friends.
  Each player has their own health and **respawns 3s after dying**. Live kill/death scoreboard
  (hold **Tab**). The room owner sets the **max player count (2–8)**.

### Kill-streak weapons (both modes)

In **PvP** and **Practice vs AI**, every kill upgrades your weapon (caps at the knife). In PvP it
does **not** reset on death; in Practice it resets when you start a new run. An upgrade toast shows
your new weapon:

`Sword → Hammer → Pan → Spear → Knife`

| Weapon | Reach | Damage | Feel |
|---|---|---|---|
| Sword | medium (~118px) | normal | balanced starter |
| Hammer | short (~106px) | high (×1.75) | heavy, big knockback |
| Pan | short (~104px) | medium (×1.3) | quick bonk |
| Spear | long (~154px) | medium (×1.15) | poke from range |
| Knife | shortest (~94px) | highest (×2.1) | glass-cannon finisher |

### Atmosphere

A stormy night arena: drifting parallax mountains & fog, a glowing moon, **rain**, periodic
**lightning** (flash + bolt + thunder), flickering **torches**, dead trees and rocks, plus juicy
**blood** spray, mist and lingering ground stains.

## Controls

| Action | Keys |
|---|---|
| Move | `A` / `D` (or ← →) |
| Jump | `W` / `Space` (or ↑) |
| Light slash | `J` / **Left click** |
| Heavy attack | `K` / **Right click** |
| Block & parry | `S` / `Shift` (or ↓) — a block in the first 0.16 s **parries** and stuns the attacker |
| Scoreboard (online) | hold `Tab` |
| Menu / leave | `Esc` |

### Mobile / touch

On phones and tablets the controls appear automatically (and hide again on desktop):

- **Left side — floating joystick:** touch anywhere on the left to move; push **up** to jump.
- **Right side — action buttons:** 🗡 Slash · 💥 Heavy · ⤒ Jump · 🛡 Block (hold to block / tap-and-hold for a parry).
- **Fullscreen button** (⛶, top-right) toggles fullscreen.
- The controls are deliberately low-opacity so the fight stays visible. Play in **landscape** —
  a prompt appears if you're in portrait.

## Run it locally

```bash
npm install      # once — installs the 'ws' WebSocket library
npm start        # starts the server on http://localhost:3000
```

Open <http://localhost:3000>. Practice mode works immediately. For online play, the server
must be running (the page and the WebSocket share the same port).

> Tip: change the port with `PORT=8080 npm start`.

## Play online with friends (ngrok)

1. Start the server: `npm start` (listens on port **3000**).
2. In another terminal, expose it:

   ```bash
   ngrok http 3000
   ```

3. ngrok prints an `https://….ngrok-free.app` URL. **Share that URL with your friends.**
4. Everyone opens the URL → **Play Online — PvP** → enter a name.
5. One person clicks **Create Room** (pick max players) and reads out the **4-letter room code**.
6. Everyone else clicks **Join Room**, types the code, and you're all in the same arena.

The same ngrok HTTPS URL carries both the page and the real-time game traffic (WebSocket over
`wss://`), so there's nothing else to configure.

## How the netcode works (brief)

`server.js` is a lightweight **relay** (no game simulation): it serves `index.html`, groups
players into rooms, and forwards messages between members of a room. Each client simulates its
own fighter and is **authoritative over its own health, blocking, death and respawn**. When your
blade connects, your client sends a `hit` to the victim, who applies the damage (or blocks /
parries) and broadcasts the result. This keeps it responsive and simple over an ngrok tunnel —
ideal for playing with friends. (It is not anti-cheat hardened; it's built for friendly matches.)

## Files

- `index.html` — the entire game client (engine + rendering + audio + networking + menus).
- `server.js` — Node HTTP + WebSocket relay server (room management).
- `package.json` — declares the single dependency (`ws`) and the `start` script.
