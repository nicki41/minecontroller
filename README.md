<p align="center">
  <img src="docs/assets/logo.svg" width="96" height="96" alt="minecontroller logo">
</p>

<h1 align="center">minecontroller</h1>

A self-hosted management panel for multiple Minecraft servers. Each server runs in its own Docker container (base image [`itzg/docker-minecraft-server`](https://github.com/itzg/docker-minecraft-server)), managed through a Fastify/TypeScript API with an embedded SQLite database and a React UI. One container, no separate database service — `docker compose up -d` is all it takes.

**Features:** server creation wizard (Vanilla / Paper / Fabric / Forge / NeoForge) · live console · file manager with a Monaco editor · Modrinth plugin/mod search and install · player management (whitelist / op / kick / ban) · multi-user with role-based and per-server access control · audit log · manual backups · per-server RAM/CPU limits.

## Table of contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Starting the panel](#starting-the-panel)
- [First-time setup](#first-time-setup)
- [Documentation](#documentation)

## Architecture

Everything the panel itself needs runs in a single container; every managed Minecraft server is a separate sibling container, created via the host's Docker socket.

```mermaid
flowchart LR
    Browser(["Browser"])

    subgraph Host["Docker host"]
        subgraph APIC["api container"]
            WEB["React SPA"]
            API["Fastify API<br/>+ embedded SQLite"]
        end
        subgraph MC1["mc-server-1"]
            S1["itzg/docker-minecraft-server"]
        end
        subgraph MC2["mc-server-2"]
            S2["itzg/docker-minecraft-server"]
        end
        DSOCK[("docker.sock")]
    end

    Browser -- "HTTPS" --> WEB
    Browser -- "HTTPS /api, wss /ws" --> API
    API -- "create / start / stop / logs" --> DSOCK
    DSOCK -.manages.-> MC1
    DSOCK -.manages.-> MC2
    API -- "RCON, over mc_net" --> S1
    API -- "RCON, over mc_net" --> S2
```

Full breakdown — component diagram, server-creation flow, RBAC model, and the reasoning behind these choices — is in **[docs/architecture.md](docs/architecture.md)**.

## Prerequisites

- Docker Engine 24+ with Docker Compose v2 (`docker compose`, not the legacy `docker-compose`)
- A Linux host, or Docker Desktop (Windows/macOS) with the WSL2 backend enabled
- At least as much RAM as the sum of all planned Minecraft servers, plus roughly 256 MB for the panel itself (SQLite runs embedded in the same process — no separate DB service needed)
- Free ports: the panel port (default `3000`) and one port per Minecraft server out of the configured range (default `25565`–`25664`)
- No separate Node.js install required for pure Docker operation (see [docs/development.md](docs/development.md) for local development without containers)

## Setup

```bash
git clone <this-repository>
cd minecontroller
cp .env.example .env
```

Then edit `.env` — in particular, `SESSION_SECRET` and `HOST_DATA_PATH` **must** be adjusted. Nothing needs to be configured for the database. See **[docs/configuration.md](docs/configuration.md)** for the full variable reference, including why `HOST_DATA_PATH` is a separate value from the API's internal `/data` path.

## Starting the panel

```bash
docker compose up -d
```

This builds/starts the single `api` container (which automatically creates or migrates the SQLite database under `data/db.sqlite` on boot, via `prisma migrate deploy`) and serves the panel at `http://localhost:<PANEL_PORT>` (default `3000`) — frontend, API, and database all run in the same container/process.

Follow logs:

```bash
docker compose logs -f api
```

Stop the panel (data is preserved):

```bash
docker compose down
```

## First-time setup

On the very first visit to `http://localhost:3000`, the panel detects that no user exists yet and walks you through creating the first admin account. Further users, backups, updates, and troubleshooting are covered in **[docs/operations.md](docs/operations.md)**.

## Documentation

| Doc | Covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Component diagram, server-creation sequence, RBAC model, directory layout, design decisions |
| [docs/configuration.md](docs/configuration.md) | Full `.env` reference, the `HOST_DATA_PATH` sibling-container problem |
| [docs/operations.md](docs/operations.md) | First admin account, backups, updates, troubleshooting |
| [docs/security.md](docs/security.md) | Threat model, hardening measures (OWASP-mapped), accepted residual risks |
| [docs/development.md](docs/development.md) | Local dev setup without a full Docker rebuild, npm scripts, running tests |
