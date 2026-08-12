# Configuration reference

All variables are documented inline in [`.env.example`](../.env.example) — copy it to `.env` and adjust. This page covers the ones worth understanding before you change them.

## Core variables

| Variable | Meaning |
|---|---|
| `SESSION_SECRET` | Long random value used to sign sessions, CSRF tokens, and legacy-path servers' derived RCON password (see [architecture.md](architecture.md#console-attached-stdin-not-rcon)). Generate with `openssl rand -hex 32`. **Treat this like a root password** — anyone who has it can forge any session. |
| `WEB_ORIGIN` | The panel's publicly reachable URL (used for cookie and CORS settings). Set this to the real `https://` domain in production. |
| `COOKIE_SECURE` | Leave `true` once a reverse proxy terminates TLS in front of the panel. Only set `false` for plain local `http://` use without TLS. |
| `HOST_DATA_PATH` | Normally left unset — auto-detected. See [below](#host_data_path-the-sibling-container-problem). |
| `MC_PORT_RANGE_MIN` / `MC_PORT_RANGE_MAX` | Port range the panel picks a free port from when creating new servers. |
| `MINECRAFT_IMAGE` | Docker image used for itzg-managed Minecraft server containers. Must stay compatible with `itzg/docker-minecraft-server`'s `VERSION`/`TYPE`/`EULA` env-var contract and RCON support. |
| `RUNTIME_IMAGE_BASE` | Registry/repo prefix for the panel-managed Java runtime images (`:java8`/`:java17`/`:java21`/`:java25`), pulled automatically on first use. Only change this for a fork or a local test build. |

## `HOST_DATA_PATH`: the sibling-container problem

The api container mounts `./data` at `/data` and works internally with that path (`DATA_PATH=/data`). But when the API creates a *new* Minecraft server container, it does so by talking directly to the **host's** Docker daemon over the Docker socket — and the daemon has no idea what `/data` means from inside the api container. It needs the path exactly as it exists **on the host** to set up the matching bind mount for the new sibling container.

```mermaid
flowchart LR
    subgraph Host["Docker host filesystem"]
        HD["/home/you/minecontroller/data<br/>(HOST_DATA_PATH)"]
    end

    subgraph APIC["api container"]
        AD["/data<br/>(DATA_PATH)"]
    end

    subgraph MC["new mc-server container"]
        MD["/data<br/>(bind-mounted by the API<br/>using HOST_DATA_PATH, not DATA_PATH)"]
    end

    HD -- "bind mount<br/>(compose)" --> AD
    HD -- "bind mount<br/>(dockerode, using HOST_DATA_PATH)" --> MD
```

Both containers end up mounting the same host directory, so the API needs that host-side path — but it doesn't need to be told it by hand. On startup it asks the Docker daemon to inspect **its own container** (Docker sets a container's hostname to its own ID by default, and `docker-compose.yml` doesn't override that) and reads the host-side source of its own `/data` mount straight out of the answer. No absolute path to type in, and nothing to get wrong.

This only fails to auto-detect in non-standard setups — rootless Docker, Podman, a container hostname overridden elsewhere, or the api container not actually being the one Docker thinks it is. If a newly created server gets stuck in `INSTALLING`, or the panel logs "Could not auto-detect the host path for the data volume" at startup, set `HOST_DATA_PATH` explicitly:

```
# Linux/macOS:
HOST_DATA_PATH=/home/youruser/minecontroller/data
# Windows + Docker Desktop:
HOST_DATA_PATH=//c/Users/you/minecontroller/data
```

Either way, you can confirm it worked by inspecting a newly created server's container with `docker inspect <container>` and checking its `Binds` entry points at a host path that actually exists.
