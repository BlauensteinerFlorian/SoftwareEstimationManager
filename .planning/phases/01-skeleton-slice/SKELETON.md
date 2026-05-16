# Walking Skeleton — Software Estimation Manager

**Phase:** 1
**Generated:** 2026-05-16

## Capability Proven End-to-End

A user opens `http://localhost:3000` in their browser, enters a `pages` count and selects a `complexity` level in a German-localized form, clicks "Berechnen", and sees a backend-calculated PT number rendered as `Aufwand: N PT` — proving the docker-compose topology, nginx reverse-proxy, FastAPI request/response contract, Pydantic validation, and `/api/health`-gated service boot all work end-to-end with no manual setup beyond `docker compose up`.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend framework | FastAPI 0.136.x on Python 3.12-slim-bookworm | User-locked in CLAUDE.md; Pydantic v2 default, OpenAPI auto-gen keeps the React client in sync. slim-bookworm (NOT alpine) is mandatory for Phase 4 WeasyPrint (Pango/Cairo on musl is fragile) — locked from day 1 to avoid image migration later. |
| Backend package manager | `uv` (Astral) 0.11.14 via `COPY --from=ghcr.io/astral-sh/uv` | 10–100× faster than pip; deterministic via `uv.lock`; canonical multi-stage pattern documented in https://docs.astral.sh/uv/guides/integration/docker/. |
| ASGI server | uvicorn (bundled via `fastapi[standard]`) | One worker, single-user local-first; sync top-to-bottom is honest (no async benefit at concurrency=1). |
| Validation | Pydantic v2 with `Literal["low","medium","high","very_high"]` + `Field(ge=0, le=10_000)` | Pitfall #17 anti-anchoring (no default on `complexity`); DoS hardening on `pages` (security upper bound per RESEARCH §Security). |
| Frontend framework | React 19.2.x + Vite 7.3.x (NOT Vite 8) + TypeScript 5.9 | CLAUDE.md-locked; Vite 8 ships bleeding-edge Rolldown bundler not yet production-tested. plugin-react `^5.2.0` is the LAST version Vite-7-compatible (6.x requires Vite 8). |
| Styling | Tailwind CSS v4.3 via `@tailwindcss/vite` plugin + `@import "tailwindcss";` | v4 CSS-first config; no `tailwind.config.js` for Phase 1. shadcn/ui defaults to v4. |
| Frontend package manager | pnpm via corepack (Node 22) | shadcn-CLI default; disk-efficient; corepack ships with Node 22 so no extra install. |
| HTTP topology | Same-Origin via nginx reverse-proxy (NO CORS) | nginx (frontend container) serves SPA static + `proxy_pass /api/* → backend:8000` over compose-internal DNS. Browser sees ONE origin — eliminates CORS as a design concern, not a configuration concern (Pitfall #16 by-design prevention). |
| Container orchestration | docker compose v2 (NO `version:` key), healthcheck-gated `depends_on: condition: service_healthy` | Pitfall #15 prevention: long-form `depends_on` blocks frontend startup until `/api/health` returns 200, eliminating the "first page-load 502" race. |
| Backend host exposure | `expose: ["8000"]` ONLY (NOT `ports:`) | INFRA-04: backend reachable on compose-internal network only; SOLE host port is frontend `3000:80`. Smaller attack surface. |
| Persistence | Bind-mounts `./data:/app/data` + `./config:/app/config`; `DATABASE_URL` env var (read but unused in Phase 1) | Phase 3 will write SQLite to `./data`, Phase 4-5 will write `./config/methodik.txt` + `./config/weights.json`. Bind-mounts (not named volumes) chosen so the user can edit `weights.json` directly via filesystem as an escape hatch (Admin-UI-bypass). |
| Healthcheck | `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"` | urllib is stdlib; no `apt-get install curl` needed in the slim-bookworm image. Exits 0/non-zero on HTTP success/failure. Cadence: interval 10s, timeout 3s, retries 5, start_period 5s. |
| Frontend serving | nginx:1.27-alpine static serve + `try_files $uri $uri/ /index.html` | SPA fallback for Phase 2 React Router (Pitfall #6 pre-emptively addressed). `client_max_body_size 1m` (PDFs in Phase 4 are downloads, not uploads). |
| Directory layout (backend) | `backend/app/{__init__.py, main.py, routers/{__init__,health,estimates}.py, schemas/{__init__,estimate}.py}` | D-04: sub-package split ANTICIPATES TECH-01 layer separation. Phase 2 will add `engine/` + `services/`; Phase 3 will add `models/` + `db/`. Import-linting that enforces the separation is Phase 2 work (when `engine/` exists). |
| Directory layout (frontend) | `frontend/src/{main.tsx, App.tsx, index.css, api/client.ts, components/{EstimateForm,ResultPanel}.tsx}` | D-05: exactly five TS files in Phase 1. Phase 2 will add `components/parameter-table/`, `components/factors/`, `lib/format.ts`, `schemas/` (Zod). |
| API URL pattern (frontend) | Relative `fetch('/api/estimates')` — NEVER `http://localhost:8000/...` | Pitfall #2 prevention: relative URLs resolve correctly via Vite dev-proxy (out-of-Docker dev loop) AND nginx production proxy. Single source of truth. |
| Deployment target | Single-host docker compose (lokal-first); cloud migration scaffolded but deferred | PROJECT.md constraint: must boot with `docker compose up`. Stateless backend + bind-mounts + `DATABASE_URL` env-var + `user_id NULL` schema seam (Phase 3) make cloud migration purely additive. |
| Container user | `root` in both containers (v1) | D-Discretion: lokal-first on Berater-Laptop with Docker Desktop (macOS/Windows) → no UID/GID issues on bind-mounts. Pitfall #14 explicitly accepted; `USER appuser` hardening is a future phase. |
| Logging | `logging.basicConfig(level=logging.INFO)` | D-Discretion: structured logging via `logging.config.dictConfig` is Phase 4+ work (when log volume justifies it). |

## Stack Touched in Phase 1

- [x] Project scaffold (FastAPI app, Vite React build, two Dockerfiles, multi-stage builds for both, uv + pnpm lockfiles)
- [x] Routing — `/api/health` (GET) and `/api/estimates` (POST) under nginx `/api/*` reverse-proxy
- [x] Database — explicitly NOT in this slice; `DATABASE_URL` env var is read and logged but NO DB code exists (Phase 3 owns persistence). Bind-mount target `./data` is created and verified writable for the eventual SQLite file.
- [x] UI — `EstimateForm` (pages + complexity inputs, no defaults) wired to `postEstimate()` API client, `ResultPanel` rendering `Aufwand: N PT`
- [x] Deployment — `docker compose up --wait` boots the full local stack in <120s on a Berater-Laptop (Docker Desktop macOS); only host port 3000 exposed

## Out of Scope (Deferred to Later Slices)

Anything that is NOT in this skeleton. Be explicit — this list prevents future phases from re-litigating Phase 1's minimalism.

- **PERT engine, Decimal arithmetic, WeightsSnapshot, all 5 parameters, all 4 correction factors, day rate, all real form fields** → Phase 2
- **SQLAlchemy 2.0 models, Alembic migrations, JSON columns, history list, clone, CSV export, reproducibility regression test** → Phase 3
- **WeasyPrint, Jinja2 templates, German Babel locale, fonts-dejavu/liberation, methodik.txt seeding, PDF download endpoint** → Phase 4
- **`/admin` editor surface, atomic write with flock, Pydantic validation before save, mtime cache invalidation, reset-to-defaults** → Phase 5
- **CORS middleware** — eliminated by Same-Origin nginx topology; will NEVER be added
- **CI/CD pipeline** — local-first constraint; CI is a follow-up project after v1 ships
- **pytest, vitest, ruff, ESLint, pyright** — Phase 2 introduces pytest+ruff (engine tests are Phase 2 core); vitest+ESLint follow when frontend complexity warrants
- **shadcn/ui components** — Phase 2 brings them in with the real form (Phase 1 uses bare Tailwind utilities on native HTML)
- **react-router, react-hook-form, zod, @tanstack/react-query, @tanstack/react-table, zustand, lucide-react** — Phase 2 only
- **Decimal type aliases (MoneyDecimal, PTDecimal), `@field_serializer` for JSON-stringification** — Phase 2 (Decimal pattern lock)
- **i18n library** — German-only by constraint; native `Intl.NumberFormat('de-DE')` + Python `locale` is sufficient; never need i18next
- **Authentication, sessions, /admin protection** — `user_id NULL` schema seam lands in Phase 3 (auth-readiness); real auth is v2
- **HTTPS / TLS** — local-only, plain HTTP is fine
- **Structured logging, log aggregation, metrics, telemetry** — local-first prohibits external services
- **Browser E2E tests (Playwright)** — manual browser checkpoint in Plan 03 is sufficient for Phase 1

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2 — Engine & Form:** Replace the throwaway 2-field form + hardcoded multiplier map with the full input form (stammdaten + 5 parameters with complexity + 4 correction factors with no defaults + day rate + assumptions + exclusions) and a pure-function PERT engine with Decimal arithmetic end-to-end. Add `WeightsSnapshot` as the single source of truth for reproducibility. Build the dashboard (PERT overview, P50/P80/P90, phases, risk indicator, scope text) with German Intl locale formatting. Keep the SAME `POST /api/estimates` URL and the SAME nginx reverse-proxy; only the request/response schema and the engine internals grow.

- **Phase 3 — Persistence & History:** Add SQLAlchemy 2.0 + Decimal TypeDecorator + Alembic baseline migration. Persist `Estimate` with three JSON columns (`inputs`, `weights_snapshot`, `result`) + `parent_estimate_id` + nullable `user_id` (auth-readiness seam from day 1 of the table). Add history view with search/filter/sort/clone/delete/CSV-export. Add the critical reproducibility regression test that verifies `calculate(stored.inputs, stored.weights_snapshot) == stored.result` over all persisted estimates. The `DATABASE_URL` env var (set in Phase 1 compose, ignored by Phase 1 code) finally gets consumed.

- **Phase 4 — PDF Export:** Add WeasyPrint with full Pango/Cairo/font-system deps to the backend image (this is when slim-bookworm pays off — Alpine would be hostile to this). Add Jinja2 templates + handwritten print CSS for professional consultancy-look. German locale via Babel. Cover sheet + page numbers + footer + methodology + disclaimer. Build-time smoke test against the Tofu-Box regression (`HTML(string='<p>äöü</p>').write_pdf(...)` must produce correct German umlauts). Full README with backup, PostgreSQL migration, reset paths (INFRA-10) replaces the two-sentence Phase-1 README.

- **Phase 5 — Admin Configuration:** Build the `/admin` write surface (base weights, 4 correction-factor tables + project type, PERT multipliers, phase distribution with live "Summe 100" indicator, languages curve / roles / user ranges, methodology textarea, disclaimer textarea, reset-to-defaults). Atomic-write `weights.json` with `fcntl.flock` + Pydantic schema validation before `os.replace` + mtime-cache invalidation + per-request snapshot pinning. The Phase-1-empty `./config` bind-mount finally gets `weights.json` written to it. Phase 1's `client_max_body_size 1m` in nginx.conf remains sufficient (admin payloads are small).
