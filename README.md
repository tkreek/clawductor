# 🪶 Clawductor

A web-based mission control for [OpenClaw](https://github.com/openclaw/openclaw). Manage tasks, agents, files, skills, and cron jobs from your browser — with password protection and a first-run onboarding flow.

## Features

- **Kanban task board** — dispatch tasks to your OpenClaw agents, track status in real-time
- **Shared subagent profiles** — create and configure named specialists with custom identity and memory
- **File browser** — browse task output files
- **Skills viewer** — see installed OpenClaw skills
- **Cron manager** — schedule recurring tasks
- **Gateway status** — live connection indicator + context window usage bar
- **Password protected** — session-based auth, no public exposure
- **Onboarding** — guided first-run setup, works with local or remote OpenClaw instances

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) running somewhere (local or remote)
- Your OpenClaw **gateway token** (found in your OpenClaw config)
- Docker (recommended) or Node.js 22+

---

## Quick Start (Docker)

### 1. Clone

```bash
git clone https://github.com/yourname/clawductor.git
cd clawductor
```

### 2. Run

```bash
docker build -t clawductor .
docker run -d \
  --name clawductor \
  --network host \
  -v $(pwd)/data:/data \
  -p 3000:3000 \
  clawductor
```

> **Note:** `--network host` is required if your OpenClaw gateway is running on the same machine (localhost). For a remote gateway (EC2 etc.), you can omit it and use a standard bridge network.

### 3. Open

Navigate to `http://localhost:3000` — you'll be guided through setup.

---

## Quick Start (Docker Compose)

If you have an existing `docker-compose.yml` (e.g. alongside Nginx Proxy Manager):

```yaml
services:
  clawductor:
    build: /path/to/clawductor
    container_name: clawductor
    restart: unless-stopped
    network_mode: host        # remove if gateway is remote
    environment:
      - PORT=3000
      - DATA_DIR=/data
    volumes:
      - /path/to/clawductor/data:/data
```

---

## Quick Start (Node.js)

```bash
npm install
npm run build
DATA_DIR=./data node build
```

---

## First-Run Setup

On first visit, Clawductor walks you through:

1. **Instance Name** — a label shown in the header (e.g. "Thomas's Server")
2. **Gateway Location** — choose:
   - **Local** — OpenClaw running on the same machine (`http://127.0.0.1:18789`)
   - **Remote** — Enter a custom URL (e.g. `http://your-ec2-ip:18789`)
3. **Gateway Token** — your OpenClaw gateway token
4. **Admin Password** — protects the web UI

All config is stored in a local SQLite database under `DATA_DIR`.

---

## Finding Your Gateway Token

Run on the machine where OpenClaw is installed:

```bash
openclaw gateway status
```

Or check your OpenClaw config file. The token is a long hex string used to authenticate API calls to the gateway.

---

## Exposing to the Internet (Optional)

To access Clawductor remotely, put it behind a reverse proxy with HTTPS.

**With Nginx Proxy Manager:**
- Forward Hostname: `172.17.0.1` (or `localhost` if on host network)
- Forward Port: `3000`

**With Tailscale Funnel:**
```bash
tailscale funnel 3000
```

---

## Environment Variables

| Variable   | Default          | Description                        |
|------------|------------------|------------------------------------|
| `PORT`     | `3000`           | HTTP port to listen on             |
| `DATA_DIR` | `./data`         | Directory for SQLite database      |

All other config (gateway URL, token, password) is stored in the database via the setup UI.

---

## Shared Subagent Profiles

Clawductor now treats persistent named specialists as **shared subagent profiles**, not as a Clawductor-only agent database.

By default, profiles are stored at:

```text
$WORKSPACE_DIR/clawductor/subagent-profiles.json
```

On many local installs this will be:

```text
/home/<user>/.openclaw/workspace/clawductor/subagent-profiles.json
```

Each profile contains durable fields such as:
- `name`
- `icon`
- `identity`
- `memory`
- timestamps

When you dispatch a task from Clawductor, it spawns a real OpenClaw subagent run using the selected profile's identity and memory.

### Important integration note for your main assistant

If you want your main OpenClaw assistant (for example Tegid, Claude, Codex, etc.) to behave consistently with Clawductor, you should explicitly teach it to check the shared profile file when the user asks to:

- create a new subagent/profile/specialist
- list available subagents/profiles
- use a named specialist
- update a specialist's memory, identity, or description

Recommended rule of thumb:

- **Persistent named specialists** = entries in `subagent-profiles.json`
- **Running workers** = OpenClaw subagent/session spawns created from those profiles when work is dispatched

Without this instruction, your assistant may still treat Clawductor profiles and native OpenClaw subagent runs as separate concepts.

---

## Development

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`.

---

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) + TypeScript
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- [@sveltejs/adapter-node](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) for production builds
