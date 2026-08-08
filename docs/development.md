# Development setup

For local development without a full Docker rebuild on every change.

**Prerequisites**: Node.js ≥ 20, npm, and a local Docker daemon (needed for the Minecraft container-management features). No separate database to install — SQLite runs embedded.

```bash
npm install
cp .env.example .env
echo 'DATABASE_URL=file:./prisma/dev.db' >> .env   # local dev only, see the .env comment
npm run prisma:migrate -w apps/api
npm run dev
```

`npm run dev` starts `packages/shared` in watch mode, the API (`tsx watch`), and the Vite frontend dev server, all in parallel. The frontend runs on its own Vite port and proxies API requests to the locally running API.

## Scripts

Run from the repo root — these operate across all workspaces:

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check across all workspaces (builds `packages/shared` first) |
| `npm run test` | All Vitest suites (shared, api, web) |
| `npm run test:api` | API test suite only |
| `npm run build` | Production build, all workspaces |
| `npm run lint` | Placeholder only — no ESLint config exists in this repo yet |
| `npm run prisma:studio` | Prisma Studio, for inspecting the database |

Tests run completely without a real database or Docker daemon — Prisma and Docker calls are replaced with fakes/mocks in the relevant unit tests. See `apps/api/src/**/*.test.ts`.

To run a single test file or a single test case with Vitest:

```bash
npm run test -w apps/api -- src/modules/roles/roles.service.test.ts
npm run test -w apps/api -- src/modules/roles/roles.service.test.ts -t "test name"
```
