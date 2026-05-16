# @rotshop/backend

Fastify + SQLite (Drizzle) + BullMQ backend for Rotshop.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
```

## Run

```bash
npm run dev       # tsx watch — restarts on changes
npm start         # one-shot
npm run typecheck # tsc --noEmit (uses ../shared via tsconfig paths)
```

Default port: `http://localhost:3000`.

The server **bootstraps the SQLite schema automatically on startup** (`ensureSchema()`), so a fresh DB file works out of the box. For schema changes, use Drizzle Kit:

```bash
npm run db:generate   # create migration from schema diff
npm run db:push       # apply schema to DB
```

## Routes

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/api/health` | ✅ | health + db check |
| POST | `/api/submit` | ✅ | clone repo, Claude metadata extraction, store |
| PATCH | `/api/submit/:id` | ✅ | submitter edits |
| POST | `/api/discover` | ✅ | keyword match + fit lines |
| GET | `/api/modules` | ✅ | list visible modules |
| GET | `/api/modules/:slug` | ✅ | detail + apiSnippet + reviews |
| GET | `/api/review` | 🚧 501 | admin: queue of sandboxed modules |
| POST | `/api/review/:id/approve` | 🚧 501 | admin approve |
| POST | `/api/review/:id/reject` | 🚧 501 | admin reject |
| GET | `/api/dashboard` | 🚧 501 | submitter stats |
| POST | `/api/keys/generate` | 🚧 501 | admin: issue API keys |
| POST | `/v1/:module/:action` | 🚧 501 | customer-facing proxy |

## Dependencies

- **`@rotshop/shared`** linked via `file:../shared` — all request/response types live there. **Do not duplicate or redefine them here.**
- **Redis** (optional in dev) — required for BullMQ sandbox queue. Without Redis the submit endpoint still works; modules sit in `pending_sandbox_test` until a worker can run.
- **Docker** (optional in dev) — required for sandbox testing and the live proxy. Not needed for submit/discover/modules.
- **Anthropic API key** (optional in dev) — without it, repo analysis falls back to a heuristic based on README + manifest contents.

## Env

See `.env.example`. Required for full functionality: `ANTHROPIC_API_KEY`, `REDIS_URL`, `DOCKER_SOCKET`.
