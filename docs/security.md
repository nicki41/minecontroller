# Security

## Threat model notice

This panel grants the api container access to the host's Docker socket — that is **functionally equivalent to root on the host** if the api process is ever compromised. Given that:

- Only run it in a trusted, **single-tenant** environment (one operator, one organization) — not as multi-tenant SaaS without additional isolation (e.g. a separate VM per customer).
- Put the panel behind a TLS-terminating reverse proxy (`COOKIE_SECURE=true`); don't expose it directly over plain HTTP.
- Treat `SESSION_SECRET` like a root password.

## Hardening in place

Checked against the OWASP Top 10-relevant categories:

| Area | Implementation |
|---|---|
| Authentication | Argon2id password hashing; constant-time login comparison (a dummy hash is checked for unknown usernames, preventing user enumeration via timing); signed, httpOnly session cookies with sliding expiration |
| Authorization / RBAC | Every route checks the required permission server-side, plus per-server access level where relevant; privilege-escalation guards stop non-Owners from granting the Owner role or permissions they don't hold themselves (see `roles.service.ts` / `users.service.ts` and their tests). Details: [architecture.md](architecture.md#access-control-rbac) |
| CSRF | `@fastify/csrf-protection`, token bound to a separate secret cookie (not the session), enforced on every mutating `/api` route |
| Path traversal | Every file access goes through `safeResolve()` — a syntactic check against `../`/absolute paths, plus a runtime check against symlink escapes via `fs.realpath` |
| ZIP uploads | Protected against zip-slip (every entry path is checked against the target directory) and decompression bombs (caps on entry count and total size) |
| Command injection | Player names and console commands are validated and stripped of newlines before being sent over RCON; RCON is a binary protocol, not a shell invocation |
| SSRF | File downloads from Modrinth are restricted server-side to `https://cdn.modrinth.com` (hostname allowlist), checked before any fetch is made |
| Docker API abuse | Minecraft containers run with `no-new-privileges`, a fixed `PidsLimit`, explicit memory/CPU limits, and Docker's already-restricted default capability set (no extra `CapDrop: ALL` — `itzg/docker-minecraft-server` needs `CAP_CHOWN`/`CAP_SETUID`/`CAP_SETGID` etc. for its own root-to-minecraft-user switch in its entrypoint; chasing an exact capability list against a third-party image proved brittle — see the comment in `DockerMinecraftRuntime.ts`. The Minecraft process itself still ends up non-root, just via the image's own mechanism rather than ours). The frontend has no direct Docker API access — only the API layer does. |
| SQL injection | Exclusively through Prisma (parameterized queries); no raw SQL strings built from user input |
| Rate limiting | The login endpoint is rate-limited to slow down brute-force attempts |

## Known, accepted residual risks

- **Docker socket access itself** (see above) — architecturally required for the panel's core function; not further reducible without Docker-in-Docker or a remote Docker API, which would trade "simple and maintainable" for a much larger attack surface and operational burden.
- **Monaco web workers are disabled** for build-compatibility reasons (see the comment in `CodeEditor.tsx`) — a pure feature loss (no extended IntelliSense), not a security issue.
