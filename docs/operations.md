# Operations

Day-to-day running of the panel: first admin setup, backups, updates, and troubleshooting. For initial installation, see the [main README](../README.md).

## Table of contents

- [First admin account](#first-admin-account)
- [Backups](#backups)
- [Updates](#updates)
- [Troubleshooting](#troubleshooting)

## First admin account

On the very first visit to `http://localhost:3000`, the panel detects that no user exists yet and shows a setup wizard for creating the first admin account (the `Owner` role, with every permission). The endpoint behind it, `POST /api/auth/setup`, only works server-side **while the database has zero users** — once the first account is created it's permanently locked, regardless of what the frontend shows.

Additional users are created afterwards under **Admin → Users** by an Owner/Admin, including role assignment and optional per-server access (full or view-only, per server).

## Backups

Every server has a manual backup action under **Server → Settings → Backups**. A backup is a `tar` archive of the server's entire data directory, stored under `data/backups/<serverId>/` — deliberately **outside** the server's own data directory, so a restore can never overwrite the archive it's restoring from.

- **Create**: works any time, including while the server is running (world data can theoretically be inconsistent if the server writes mid-backup — stop the server first if you need a guaranteed-consistent snapshot).
- **Restore**: requires a stopped server; replaces the entire data directory with the backup's contents.
- **Delete**: removes only the archive file, never the live data directory.

For offsite protection, periodically back up the whole `data/` folder externally as well (e.g. `rsync`/`restic` from the host) — the built-in backup feature is not a substitute for an external 3-2-1 backup strategy. Since the SQLite database (`data/db.sqlite`, plus its `-wal`/`-shm` companion files under WAL mode) also lives in this folder, an external `data/` backup automatically covers users, roles, the audit log, and server metadata too — ideally stop the api container briefly first so the SQLite files aren't being written to mid-copy.

## Updates

```bash
docker compose pull
docker compose up -d
```

That's it — no `git clone`/`git pull` needed for a normal deployment, since `docker-compose.yml` and `.env` are the only files a deployment actually needs, and `api` is pulled pre-built from GHCR. (Building from source instead, e.g. for local development? See [CONTRIBUTING.md](../CONTRIBUTING.md).)

Database migrations are applied automatically when the api container starts, via `prisma migrate deploy` (see [`docker/entrypoint.sh`](../docker/entrypoint.sh)) — no manual migration step needed. Running Minecraft server containers are unaffected by a panel update, since they're independent containers.

## Troubleshooting

**`EACCES` / permission denied writing to `data/`**
The api container runs with a fixed UID/GID `1000:1000`. If the host's `data/` folder has different ownership:
```bash
sudo chown -R 1000:1000 ./data
```

**Newly created servers get stuck in `INSTALLING`, or the container finds no data**
Usually a misconfigured `HOST_DATA_PATH` — see [configuration.md](configuration.md#host_data_path-the-sibling-container-problem). Check with `docker inspect <container>` and confirm the `Binds` entry points at a host path that actually exists.

**Server creation fails with "Provisioning failed unexpectedly", logs show `EACCES /var/run/docker.sock`**
The `node` user inside the container didn't have access to the host-mounted Docker socket, because the socket's group GID on the host didn't match the container's GID. The entrypoint script detects the socket's actual GID at startup and adds `node` to a matching group automatically (see `docker/entrypoint.sh`) — no manual action needed. If it still happens, pull the latest image (`docker compose pull api && docker compose up -d`) — an old image may predate this fix.

**Server creation fails with "Port already used"**
The chosen or auto-assigned port is already taken by another server, or `MC_PORT_RANGE_MIN`/`MAX` is too narrow for the number of servers you're running.

**Live console shows nothing / commands don't arrive**
The server must be fully up (status `Running`) — for panel-managed servers the console is a direct stdin/stdout attach to the container, which only exists once the Minecraft process is actually running; for legacy servers, commands go over RCON, which only responds once Minecraft has finished booting. See [architecture.md](architecture.md#console-attached-stdin-not-rcon).

**`database is locked` / `SQLITE_BUSY` in the logs**
Can happen under brief concurrent SQLite writes. The panel enables WAL mode and a 5-second `busy_timeout` on startup, which makes this practically a non-issue in normal use — if it still happens (e.g. under heavy parallel load), restart the api container. For serious multi-user load with lots of concurrent writes, SQLite simply isn't the right tool — see [architecture.md](architecture.md#design-decisions).
