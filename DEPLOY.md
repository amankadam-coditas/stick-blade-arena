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
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com
   ```

   (The leaderboard uses Firestore — see "Leaderboard persistence" below for its one-time setup.)

### 2. Deploy (from this folder)

```bash
gcloud run deploy stick-blade-arena \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --max-instances 1 \
  --concurrency 250 \
  --timeout 3600
```

> **Region:** this game is deployed to **`asia-south1` (Mumbai)** for low latency to players in
> India. Pick the region nearest your players — `us-central1` (Iowa), `europe-west1` (Belgium),
> `asia-southeast1` (Singapore), etc. The region is part of the Service URL, so changing it
> produces a **new URL**.

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
gcloud run services update stick-blade-arena --region asia-south1 --min-instances 1
```

(That keeps one instance running 24/7, which costs a bit even when idle.)

---

## Leaderboard persistence (Firestore)

The game keeps a **Firestore** leaderboard with practice boards (Score / Wave / Kills) and an
online PvP board (Kills). The server reads/writes it via `/api/leaderboard` and `/api/score`
(collections `practice` and `mp`). Firestore is serverless and **durable** — data survives cold
starts *and* redeploys with **no volume, no keep-warm instance, and no code changes** — and fits
comfortably in the perpetual free tier (1 GiB storage + 20K writes / 50K reads per day).

### One-time setup

1. Enable the API and create the database (Native mode). The Firestore **location is set once per
   project and cannot be changed later**, so pick your region deliberately:

   ```bash
   gcloud services enable firestore.googleapis.com
   gcloud firestore databases create --location=asia-south1
   ```

   (Use a multi-region like `nam5` or `eur3` for wider redundancy if you prefer.)

2. **Permissions:** the Cloud Run service runs as the project's default compute service account,
   which needs Firestore access. On a fresh project grant it once:

   ```bash
   PROJECT_ID=$(gcloud config get-value project)
   PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
   gcloud projects add-iam-policy-binding "$PROJECT_ID" \
     --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
     --role="roles/datastore.user"
   ```

   (If the service account still has the broad `Editor` role from a new project, this is already
   covered — but granting `datastore.user` explicitly is the least-privilege choice.)

That's it — the normal `gcloud run deploy` command above needs no extra flags. The boards are
created lazily on first write; single-field descending indexes are auto-created by Firestore.

### Notes

- **Local dev:** without credentials the game still runs — the leaderboard just won't persist.
  To test it locally, either run the Firestore emulator and set `FIRESTORE_EMULATOR_HOST`, or set
  `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key.
- **Scores are client-reported** (the server is a relay and can't verify them), so treat the board
  as friendly bragging rights, not anti-cheat-grade.

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
- **Region:** deployed to `asia-south1` (Mumbai) for India. Pick one near your players for lower latency.
