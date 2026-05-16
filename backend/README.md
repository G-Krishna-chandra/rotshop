# @rotshop/backend

Fastify + SQLite (Drizzle) + BullMQ + Docker backend for Rotshop.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # optionally fill in ANTHROPIC_API_KEY
```

## Run

```bash
npm run dev        # tsx watch — restarts on changes
npm start          # one-shot
npm run worker     # standalone BullMQ worker process (also auto-starts in-process from npm start)
npm run typecheck  # tsc --noEmit (uses ../shared via tsconfig paths)
```

Default port: `http://localhost:3000`.

The server **bootstraps the SQLite schema automatically on startup** (`ensureSchema()`), so a fresh DB file works out of the box. For schema changes, use Drizzle Kit:

```bash
npm run db:generate   # create migration from schema diff
npm run db:push       # apply schema to DB
```

### Optional infrastructure

```bash
# Redis (for BullMQ — without it submit falls back to inline simulated sandbox)
docker compose -f docker/docker-compose.yml up -d redis

# Real Docker sandboxing requires the Docker daemon. SANDBOX_MODE=auto
# detects the daemon and falls back to 'simulate' when it's not running.
```

## Sandbox modes (`SANDBOX_MODE`)

| Mode | Behavior |
|---|---|
| `auto` (default) | Probe Docker at startup; use `docker` if reachable, otherwise `simulate` |
| `docker` | Real per-module container build + I/O contract test; fails jobs if Docker is unreachable |
| `simulate` | Skip Docker entirely; mark every submission as passed after a short delay (great for demos) |
| `skip` | Don't process sandbox jobs at all |

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | health + db liveness |
| POST | `/api/submit` | — | clone repo, Claude metadata extraction, store, enqueue sandbox |
| PATCH | `/api/submit/:id` | — | submitter edits |
| POST | `/api/discover` | — | keyword match + fit lines |
| GET | `/api/modules` | — | list visible modules |
| GET | `/api/modules/:slug` | — | detail + apiSnippet + reviews |
| POST | `/api/admin/token` | secret | dev-only admin JWT issuance |
| GET | `/api/admin/token` | secret | dev-only admin JWT issuance (query form) |
| GET | `/api/review` | admin JWT | queue of sandbox_passed/pending_review modules |
| POST | `/api/review/:id/approve` | admin JWT | approve → status `live` |
| POST | `/api/review/:id/reject` | admin JWT | reject with reason |
| POST | `/api/keys/generate` | admin JWT | mint a customer API key (returned once) |
| POST | `/v1/:module/:action` | API key | customer-facing module proxy |
| GET | `/api/dashboard` | — | 🚧 501 — aggregator coming in a later step |

## Dependencies

- **`@rotshop/shared`** linked via `file:../shared` — all request/response types live there. **Do not duplicate or redefine them here.**
- **Redis** (optional in dev) — when present, sandbox jobs run via the BullMQ worker. When absent, the submit route runs the sandbox flow inline (fire-and-forget) so the lifecycle still completes.
- **Docker** (optional in dev) — required only for real sandbox testing and the live proxy. `SANDBOX_MODE=simulate` keeps the full pipeline functional without it.
- **Anthropic API key** (optional in dev) — without it, repo analysis falls back to a manifest/README heuristic.

## End-to-end demo flow

With nothing but Node.js installed, you can exercise the entire pipeline:

```bash
# 1) Submit a repo (clone + Claude or heuristic analysis + queue sandbox)
curl -X POST http://localhost:3000/api/submit \
  -H 'Content-Type: application/json' \
  -d '{"githubUrl":"https://github.com/sindresorhus/cli-spinners","submitterEmail":"you@example.com"}'

# 2) Wait a couple seconds, confirm the module is sandbox_passed
curl http://localhost:3000/api/modules/cli-spinners

# 3) Mint an admin token (POST is preferred; secret comes from ADMIN_JWT_SECRET)
TOKEN=$(curl -sS -X POST http://localhost:3000/api/admin/token \
  -H 'Content-Type: application/json' \
  -d '{"secret":"dev-change-me-immediately"}' | jq -r .token)

# 4) Approve the module to flip it to 'live'
curl -X POST "http://localhost:3000/api/review/<module-id>/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"looks good"}'

# 5) Issue an API key for a customer
KEY=$(curl -sS -X POST http://localhost:3000/api/keys/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"customerEmail":"buyer@example.com","rateLimitPerHour":100}' | jq -r .key)

# 6) Call the module through the proxy
curl -X POST http://localhost:3000/v1/cli-spinners/invoke \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello"}'
```

In `simulate` mode (default when Docker is off) step 6 returns a deterministic echo of the request; in `docker` mode it cold-starts (or warm-reuses) the module's container and forwards the request.

## Env

See `.env.example`. Nothing is required for the basic dev experience. For full production:
- `ANTHROPIC_API_KEY` — real repo analysis (otherwise heuristic)
- `REDIS_URL` — durable job queue (otherwise inline sandbox)
- `DOCKER_SOCKET` — real sandboxing (otherwise simulate)
- `ADMIN_JWT_SECRET` — change from the default before opening port 3000 publicly
