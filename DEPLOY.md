# Deploying Stick Blade Arena to Google Cloud

The game is a small **Node + WebSocket relay** that serves `index.html` and forwards
messages between players in a room. Rooms are kept **in memory**, so every player in a
match must be served by the **same instance**. The recommended host is **Cloud Run** with
`--max-instances=1` (one always-shared instance — more than enough for friends).

The browser client auto-detects HTTPS and connects over `wss://`, so **no code changes are
needed** — Cloud Run's managed TLS just works.

---

## Option A — Cloud Run (recommended)

### 1. One-time prerequisites

1. Install the gcloud CLI: <https://cloud.google.com/sdk/docs/install>
2. Sign in and pick your project (create one in the Cloud Console first, with **billing enabled**):

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. Enable the APIs used to build & run the container:

   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

### 2. Deploy (from this folder)

```bash
gcloud run deploy stick-blade-arena \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --max-instances 1 \
  --concurrency 250 \
  --timeout 3600
```

- `--source .` builds the image from the included `Dockerfile` via Cloud Build, then deploys it.
- `--max-instances 1` keeps all players on one instance so they share the in-memory rooms. **Do not raise this** unless you add a shared backend (see "Scaling" below).
- `--concurrency 250` lets up to 250 simultaneous players share that instance.
- `--timeout 3600` is the max WebSocket connection length (60 min — Cloud Run's ceiling). After that a client is dropped and simply re-joins.
- `--allow-unauthenticated` makes it a public game anyone with the link can open.

When it finishes, gcloud prints a **Service URL** like
`https://stick-blade-arena-xxxxxxxxxx-uc.a.run.app`.

### 3. Play

Open the Service URL → **Play Online — PvP** → one person **Creates** a room and shares the
4-letter code; everyone else opens the same URL and **Joins** with that code. (Practice vs AI
works for anyone immediately.)

### Updating later

Re-run the same `gcloud run deploy …` command — it builds a new revision and switches traffic
to it automatically.

### Optional: no cold starts

By default the instance scales to zero when idle (cheapest; the first visitor waits a couple of
seconds for a cold start). To keep it warm:

```bash
gcloud run services update stick-blade-arena --region us-central1 --min-instances 1
```

(That keeps one instance running 24/7, which costs a bit even when idle.)

---

## Scaling beyond one instance (only if you need it)

`--max-instances 1` is required because rooms live in each instance's memory. To run multiple
instances (hundreds+ of concurrent players), the relay would need to share state across
instances — e.g. push room membership and messages through **Cloud Memorystore (Redis) pub/sub**
and enable `--session-affinity`. That's a code change to `server.js`; ask if you want it. For
playing with friends, a single instance is the right call.

---

## Option B — Compute Engine VM (alternative)

If you'd rather run a plain always-on server with a fixed IP:

1. Create an `e2-micro` VM (in the free-tier regions it's free), allow HTTP/HTTPS in the firewall.
2. SSH in, install Node 20+, copy the project, `npm ci --omit=dev`.
3. Run it under a process manager: `PORT=8080 pm2 start server.js` (or a systemd unit).
4. Put **Caddy** or **Nginx** in front for automatic HTTPS on your domain (needed for `wss://`),
   or point a load balancer at it. Open the HTTPS URL and play.

This gives unlimited session length and multi-instance-free simplicity, at the cost of managing
the VM and TLS yourself. Cloud Run is less work for this game.

---

## Notes / troubleshooting

- **It must be HTTPS for online play.** Browsers block `wss://` from an `https://` page only if
  the socket is insecure; Cloud Run serves HTTPS so the client uses `wss://` automatically. Don't
  serve the page over plain `http://` on a custom setup.
- **`/health`** returns `ok` — handy for uptime checks.
- **Cost:** with `--min-instances 0` (default) and Cloud Run's free tier, occasional play is
  effectively free. A warm instance (`--min-instances 1`) is a small monthly cost.
- **Region:** `us-central1` is just an example — pick one near your players for lower latency.
