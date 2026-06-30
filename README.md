# Stick Blade Arena

A browser-based 2D stickman sword fighter — articulated stick figures, light/heavy attacks,
**charged heavies**, blocking & parries, **dodge-rolls with i-frames**, **blade-on-blade clash
locks**, **cinematic slow-mo finishes**, **boss waves**, a **kill-streak announcer**, screen shake,
hit-stop, blood/sparks, sword trails, a haunted parallax night sky, and fully procedural WebAudio
sound. Two modes:

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

### Blade clash & slow-mo finish (both modes)

- **Clash lock** — when two opposing fighters' blades cross mid-swing, they **lock** instead of
  passing through: hitstop, a camera punch-in, twin spark fans, a ringing-steel sound. The stronger
  blow (heavy beats light, weighted by weapon) **wins the lock** and is free to swing again; the
  loser is staggered and flung back. Equal power → both deflect apart. In PvP each client resolves
  the clash for its own fighter, so it works cleanly over the relay netcode.
- **Slow-mo finish** — the killing blow drops time to ~20% and eases it back over half a second,
  with a cool "adrenaline tunnel" vignette, a white flash, a deep camera zoom, and a descending
  *whoom*. The **final kill of a wave** gets an extra-dramatic, longer version. In PvP the killer
  gets the slow-mo when the kill is confirmed.

### Combat moves (both modes)

- **Dodge-roll / dash** — tap `L` (or **double-tap** a direction; **DASH** button on touch) for a quick
  burst with **invincibility frames** and an afterimage smear, on a short cooldown. Escape combos,
  dodge through attacks, or close distance. The i-frames work in PvP too.
- **Charged heavy** — *hold* the heavy button to wind up; an aura grows and crackles, then **release**
  to strike. A near-full charge **breaks an enemy's guard** (only a perfect parry still stops it) and
  hits much harder with extra knockback and a snappier swing. A quick tap is just a normal heavy.

### Boss waves (Practice)

Every **5th wave** a **giant stickman boss** rises (its own intro banner + on-screen **health bar**).
It telegraphs a **ground slam** — a danger ring fills under it, then a shockwave erupts that damages
and launches you unless you **dash, jump, or block** in time. Beat it for a big slow-mo finish, a
score bounty, and a **weapon-up + health** drop.

### Announcer

Rapid and sustained kills trigger callouts with a sound sting — **First Blood**, **Double / Triple /
Multi / Monster Kill** (kills in quick succession), and spree milestones **Killing Spree → Rampage →
Unstoppable → Godlike**. Dying resets your spree. A **FIGHT!** / **DEATHMATCH** banner opens each run.

### Enemy taunts (Practice)

Enemies and bosses now **talk back**. A little speech bubble pops above a fighter (with a short, muffled
voice grunt) on three beats:

- **On spawn** — they size you up as the wave begins (*"Fresh meat."*, *"RAAAGH!"*, the boss bellows
  *"You DARE enter my arena?"*). Bubbles are staggered so the whole wave doesn't shout at once.
- **At low HP** (≤35%) — a wounded snarl, fired once (*"Just… a scratch!"*, *"This cannot be!"*).
- **On a kill** — whoever lands the killing blow on you gloats (*"Stay down."*, *"Insignificant."*).

Each archetype (grunt / berserker / heavy / boss) has its own voice and lines; bosses get larger,
gruffer bubbles. Aggressive lines glow red and shout.

### Cinematic intro (Practice)

Each Practice run opens with a ~3-second **walk-in cutscene**: the arena dims to a backlit silhouette
behind cinematic letterbox bars, your stickman strides in from off-screen while the waiting enemies
stand ready, the lights come up, and then the **FIGHT!** banner drops and play begins. Press any key
(or tap) to **skip** it.

### Mid-arena pickups (Practice)

Glowing tokens rise from the ground each wave — a beam of light with a bobbing core. Walk over one
to grab it:

| Pickup | Effect |
|---|---|
| ❤ **Health** | Restores 35% HP (more likely to appear when you're hurt) |
| 🔥 **Fury** | 8s rampage: **+60% damage, +30% speed, 30% lifesteal**, glowing aura + HUD timer |
| 💣 **Bomb** | Grab-to-detonate AoE nuke — 240px blast with falloff damage and launch knockback |
| ⤴ **Weapon Up** | Instantly bumps your kill-streak weapon one tier |

### 🌙 Blood Moon (Practice)

Every **4th wave** turns into a Blood Moon: the moon bleeds crimson with a red corona, the sky
washes red, lightning cracks and a howl rises, and a big banner announces it. The enemies grow
restless — **+2 fighters, all enraged**: faster, hit harder, far more aggressive, and they barely
block. To balance the chaos, Blood Moon waves drop **two pickups** instead of one.

### Atmosphere

A stormy, haunted night arena: drifting parallax mountains & fog, a glowing moon, **rain**, periodic
**lightning** (flash + bolt + thunder), flickering **torches**, dead trees, rocks, **gravestones and
skulls**, plus juicy **blood** spray, mist and lingering ground stains.

**Night life & horror:** a flock of **bats** wheels across the sky (and scatters when lightning
strikes), pairs of **glowing eyes** blink in the dark treeline, eerie **will-o'-wisp spirits** drift
along the ground, and a distant **howl** sounds at random intervals.

## Controls

| Action | Keys |
|---|---|
| Move | `A` / `D` (or ← →) |
| Jump | `W` / `Space` (or ↑) |
| Light slash | `J` / **Left click** |
| Heavy attack | `K` / **Right click** — **hold to charge** (guard-breaks near full), release to strike |
| Dodge-roll / dash | `L` or **double-tap** `A`/`D` — i-frames + short cooldown |
| Block & parry | `S` / `Shift` (or ↓) — a block in the first 0.16 s **parries** and stuns the attacker |
| Scoreboard (online) | hold `Tab` |
| Menu / leave | `Esc` |

### Mobile / touch

On phones and tablets the controls appear automatically (and hide again on desktop):

- **Left side — floating joystick:** touch anywhere on the left to move; push **up** to jump.
- **Right side — action buttons:** 🗡 Slash · 💥 Heavy (hold to charge) · ⚡ Dash · ⤒ Jump · 🛡 Block (hold to block / tap-and-hold for a parry).
- **Top-right:** 🔊 / 🔇 mute toggle (saved across reloads) and ⛶ fullscreen.
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
