---
phase: 01-skeleton-slice
plan: 03
subsystem: infra
tags: [docker-compose, nginx, healthcheck, smoke-test, walking-skeleton, pnpm, typescript]

# Dependency graph
requires:
  - phase: 01-skeleton-slice
    provides: backend POST /api/estimates + health endpoint (Plan 01-01)
  - phase: 01-skeleton-slice
    provides: frontend Vite build + nginx.conf reverse-proxy (Plan 01-02)
provides:
  - docker-compose.yml: two-service healthcheck-gated orchestration
  - Root infrastructure: .gitignore, .dockerignore, .env.example, README.md
  - Bind-mount targets: data/.gitkeep, config/.gitkeep
  - Smoke-matrix: all 6 INFRA requirements verified end-to-end
  - Walking skeleton proven: browser → nginx → FastAPI → response
affects:
  - phase 02 (full form replaces 2-field skeleton; same compose topology, same nginx proxy contract)
  - phase 03 (SQLite lands in ./data; DATABASE_URL already set in compose)
  - phase 04 (WeasyPrint deps added to backend image; bind-mounts already in place)
  - phase 05 (weights.json written to ./config; bind-mount already in place)

# Tech tracking
tech-stack:
  added:
    - "@types/node@22.19.19 (devDep) — required by Vite 7.x type defs (Buffer, Request, Response)"
    - "pnpm@9.15.0 (pinned in Dockerfile via npm install -g instead of corepack)"
  patterns:
    - "Docker Compose v2 (no version: key) with healthcheck-gated depends_on condition: service_healthy"
    - "Backend expose: [\"8000\"] not ports: — compose-internal only (INFRA-04)"
    - "Frontend is SOLE host-port owner: 3000:80"
    - "urllib-based healthcheck (no curl install needed in slim-bookworm)"
    - "Bind-mounts as host-visible bind paths, not named volumes (user can edit weights.json directly)"
    - "Pin pnpm version in Dockerfile to avoid corepack pulling latest major with breaking changes"

key-files:
  created:
    - docker-compose.yml
    - .env.example
    - .dockerignore
    - README.md
    - data/.gitkeep
    - config/.gitkeep
  modified:
    - .gitignore (appended Python/frontend/data patterns)
    - frontend/Dockerfile (pnpm@9.15.0 pin instead of corepack)
    - frontend/package.json (@types/node added)
    - frontend/tsconfig.node.json (types: ["node"] added)
    - frontend/pnpm-lock.yaml (regenerated with @types/node)

key-decisions:
  - "Pin pnpm@9.15.0 in Dockerfile instead of corepack — corepack resolves to pnpm 11.x which blocks esbuild build scripts by default (ERR_PNPM_IGNORED_BUILDS)"
  - "Add @types/node to devDependencies — Vite 7.x type definitions reference Buffer/Request/Response/WebSocket; tsc -b fails without it"
  - "tsconfig.node.json types: [\"node\"] — explicit Node types for vite.config.ts compilation context"

patterns-established:
  - "Docker path: npm install -g pnpm@X.Y.Z (pinned) > corepack (floating version, breaking risk)"
  - "Vite 7 + TypeScript + tsc -b requires @types/node in devDeps and tsconfig.node.json types:[node]"

requirements-completed: [INFRA-01, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07]

# Metrics
duration: ~90min (incl. two build-fix iterations)
completed: 2026-05-17
---

# Phase 01 Plan 03: Docker-Compose Wireup Summary

**Two-service Compose stack wired and smoke-tested: nginx→FastAPI round-trip proven, backend port hidden, bind-mounts persistent, healthcheck-gated boot confirmed — walking skeleton fully alive.**

## Performance

- **Duration:** ~90 min (including 2 build-fix iterations)
- **Started:** 2026-05-17T08:47Z
- **Completed:** 2026-05-17T13:07Z
- **Tasks:** 3 (Task 1 auto, Task 2 auto + smoke, Task 3 human checkpoint)
- **Files modified:** 10

## Accomplishments

- `docker compose up --build --wait` boots the full stack in <120s from cold, no manual steps
- All 6 smoke commands green: INFRA-01 through INFRA-07 materially satisfied
- Backend port 8000 confirmed NOT reachable from host (SMOKE-03 connection refused)
- Bind-mount persistence proved across `docker compose restart backend` (SMOKE-05)
- Health payload contract verified: `{status: ok, version: 0.1.0, timestamp: <ISO UTC>}`
- Docker healthcheck status: `healthy` on backend; frontend intentionally has no healthcheck

## Task Commits

1. **Task 1: Root infrastructure files** — `0fb1214` (chore: create docker-compose.yml and supporting files)
2. **Build fixes (deviations)** — `1686917` (fix: pin pnpm@9.15.0, add @types/node, tsconfig.node types)
3. **Task 3: Human browser checkpoint** — smoke matrix passed, browser round-trip approved

## Files Created/Modified

- `docker-compose.yml` — two-service orchestration, healthcheck-gated, bind-mounted, expose-only backend
- `.env.example` — documents DATABASE_URL for future env-file usage
- `.dockerignore` — excludes node_modules, .planning/, __pycache__, .venv, dist, *.md
- `.gitignore` — appended Python/frontend/data patterns; data/*.db excluded, .gitkeep files tracked
- `README.md` — two-sentence German first-run guide
- `data/.gitkeep` — VCS-trackable bind-mount target for Phase 3 SQLite
- `config/.gitkeep` — VCS-trackable bind-mount target for Phase 5 weights.json
- `frontend/Dockerfile` — pnpm@9.15.0 pin via npm install -g (replaces corepack)
- `frontend/package.json` — @types/node ^22.0.0 added to devDependencies
- `frontend/tsconfig.node.json` — `"types": ["node"]` added for vite.config.ts context

## Decisions Made

- **pnpm version pin in Dockerfile:** corepack resolves to pnpm 11.x which introduced strict build-script blocking (`ERR_PNPM_IGNORED_BUILDS`). Pinning to 9.15.0 (matching local pnpm) avoids this and keeps lockfile format stable.
- **@types/node as devDependency:** Vite 7.3.x includes type definitions that reference Node.js globals. Without `@types/node`, `tsc -b` fails with "Cannot find name 'Buffer'" errors in Vite's own type files.

## Deviations from Plan

### Auto-fixed Issues

**1. pnpm 11.x ERR_PNPM_IGNORED_BUILDS**
- **Found during:** Task 2 — first `docker compose up --build` attempt
- **Issue:** corepack downloaded pnpm 11.1.2 which blocks esbuild's postinstall script by default
- **Fix:** Replaced `corepack enable && pnpm install` with `npm install -g pnpm@9.15.0 --quiet && pnpm install` in `frontend/Dockerfile`
- **Files modified:** frontend/Dockerfile
- **Verification:** Subsequent build completed install stage successfully
- **Committed in:** `1686917`

**2. TypeScript TS2580/TS2304 — missing Node type globals**
- **Found during:** Task 2 — second build attempt after pnpm fix
- **Issue:** `tsc -b` failed: Vite 7.3.x type defs reference `Buffer`, `Request`, `Response`, `WebSocket` — these require `@types/node` to resolve
- **Fix:** Added `"@types/node": "^22.0.0"` to devDependencies; added `"types": ["node"]` to `tsconfig.node.json`; regenerated pnpm-lock.yaml
- **Files modified:** frontend/package.json, frontend/tsconfig.node.json, frontend/pnpm-lock.yaml
- **Verification:** `tsc -b && vite build` succeeded; dist/ generated (195kB JS, 8.5kB CSS)
- **Committed in:** `1686917`

---

**Total deviations:** 2 auto-fixed (1 build toolchain, 1 TypeScript types)
**Impact on plan:** Both fixes necessary for Docker build to succeed. No scope creep — infrastructure spec unchanged.

## Issues Encountered

- Port 3000 was occupied by WienerLinienAnzeige `node server.js` (PID 2320) — killed before smoke tests
- Docker CLI not in default PATH for Claude Code sandbox; resolved with `/Applications/Docker.app/Contents/Resources/bin`

## Smoke Matrix Results

| ID | Requirement | Command | Result |
|----|-------------|---------|--------|
| SMOKE-01 | INFRA-01: services running | `docker compose ps \| jq 'all(.State=="running")'` | PASS |
| SMOKE-02 | INFRA-03: nginx→FastAPI | POST /api/estimates pages=10 complexity=medium | PASS (`{"pt":15.0}`) |
| SMOKE-03 | INFRA-04: backend hidden | `curl localhost:8000` must fail | PASS (connection refused) |
| SMOKE-04 | INFRA-05: DATABASE_URL logged | `docker compose logs backend \| grep DATABASE_URL` | PASS |
| SMOKE-05 | INFRA-06: bind-mount persist | touch + restart + exec test | PASS |
| SMOKE-06 | INFRA-07: health payload + Docker status | curl /api/health + docker inspect | PASS (`healthy`) |

## Next Phase Readiness

- Walking skeleton complete and live at `http://localhost:3000`
- Phase 2 can replace the 2-field skeleton form with the full estimation form without touching compose/nginx
- `DATABASE_URL` is already wired in compose; Phase 3 only needs to add the SQLAlchemy engine
- `./config` bind-mount is empty and ready for Phase 5's weights.json

---
*Phase: 01-skeleton-slice*
*Completed: 2026-05-17*
