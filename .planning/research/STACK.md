# Stack Research

**Domain:** Local-first, Docker-Composed business web app — deterministic PT/PERT effort estimation tool with PDF export for IT-management consultants
**Researched:** 2026-05-16
**Confidence:** HIGH (versions verified against PyPI/npm metadata; framework patterns verified via Context7 + official docs; SQLite-Decimal caveat and WeasyPrint native deps confirmed against authoritative sources)

## Executive Stack Decision

A pragmatic, mainstream Python + React stack — fully locked-in by user requirements. The only real design freedom is at the *library* layer (forms, tables, state, validation glue) and at *configuration knobs* (sync vs async, Decimal handling, container base image, Tailwind v3 vs v4). The recommendations below resolve those knobs in favour of the smallest stable footprint that fits a single-user, desktop-grade tool which may later run on PostgreSQL behind auth.

**Three load-bearing decisions** (rationale in dedicated sections below):
1. **Sync SQLAlchemy 2.x**, not async — single-user, local SQLite, fits FastAPI's `def`-route ergonomics; async adds complexity with zero benefit at this scale.
2. **`Decimal` (not `float`) everywhere money/PT calculations cross trust boundaries**, with explicit `Numeric(precision, scale, asdecimal=True)` columns and a `TypeDecorator` on SQLite to preserve precision.
3. **Tailwind v4 + shadcn/ui** (not v3, not HeadlessUI standalone) — current shadcn CLI defaults to v4, components are German-text-friendly, and the "copy-paste" model dodges versioning churn.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Python** | 3.12 (slim-bookworm) | Backend runtime | 3.12 is the conservatively current LTS-ish choice; WeasyPrint 68.x supports 3.10–3.13. Choosing 3.12 over 3.13 trades nothing meaningful and is more widely battle-tested in production Debian images. |
| **FastAPI** | 0.136.x | HTTP API framework | Mandated by user. Pydantic v2 is default since 0.100; OpenAPI schema auto-generation is the canonical way to keep the React client in sync with the Python schema. Use `fastapi[standard]` to pull in uvicorn + httpx + python-multipart + jinja2 in one install. |
| **Uvicorn** | 0.47.x | ASGI server | Standard pairing with FastAPI; bundled by `fastapi[standard]`. Use `--workers 1` locally; one worker is sufficient for single-user. |
| **Pydantic** | 2.13.x | Validation + DTOs | v2 (rust core) is 5–50x faster than v1, supports `Decimal` with `max_digits`/`decimal_places` constraints natively, ships `model_dump()` with stable JSON modes. Required by FastAPI ≥ 0.100. |
| **SQLAlchemy** | 2.0.x (sync API) | ORM | Sync 2.0 with the new `Mapped[]` typed-attribute style. PostgreSQL portability is preserved: SQLite default + Postgres-ready via `DATABASE_URL`. Async would add `aiosqlite`/`asyncpg`, complicate testing, and gain nothing for one user. |
| **Alembic** | 1.18.x | Schema migrations | Required from day one because the project must move SQLite → PostgreSQL without breaking. Even single-table apps benefit — autogenerate against `Base.metadata` keeps `weights.json` snapshot column types consistent across DBs. |
| **WeasyPrint** | 68.1 | HTML/CSS → PDF | Mandated. Strong CSS Paged Media support, sane defaults for fonts/typography, deterministic output. Caveat: requires native libs (Pango, Cairo, harfbuzz, fonts) — see Docker section. |
| **Jinja2** | 3.1.x | HTML templates for PDF | Pairs with WeasyPrint: render HTML template → pass to WeasyPrint. Bundled by `fastapi[standard]`. |
| **React** | 19.2.x | Frontend UI | 19 is stable, shadcn/ui defaults to it, all major component libs updated. Use it in plain client-side mode — **no SSR, no Server Components** (Vite RSC is still niche; for a local-first tool it adds zero value). |
| **Vite** | 7.x (stable channel) | Dev server + bundler | Note: Vite 8 was published on npm but is bleeding-edge (Rolldown bundler). For a business app shipping on Docker, pin to Vite 7 LTS-track. Use `@vitejs/plugin-react` 5.x. |
| **Tailwind CSS** | 4.3.x | Styling | v4 is the current default in shadcn/ui CLI. Uses the `@tailwindcss/vite` plugin (no `tailwind.config.js` needed for basic theming — config goes into CSS via `@theme`). Significantly faster builds than v3. |
| **shadcn/ui** | latest CLI (`shadcn@3.x`) | Component primitives | Copy-paste components built on Radix UI. Perfect fit for form-heavy admin/dashboard German UI: accessible, professional aesthetic, no opinionated brand colors. Avoids npm churn — components live in your repo. |
| **TypeScript** | 5.7.x | Frontend type safety | Standard for any React+Vite project in 2026; required by shadcn/ui templates. |

### Supporting Libraries — Frontend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-hook-form** | 7.76.x | Form state | All forms (estimation input, admin weights editor). Uncontrolled-first → minimal re-renders, scales to 30+ fields without performance work. |
| **zod** | 4.x | Schema validation | Pair with react-hook-form via `@hookform/resolvers/zod`. Mirror the Pydantic schema on the client to catch errors before submitting; share string-validation rules (e.g. Projektskizze max 600 Zeichen). |
| **@hookform/resolvers** | 5.2.x | RHF ↔ Zod adapter | Required glue between the two above. |
| **@tanstack/react-query** | 5.100.x | Server state | Cache `GET /estimates`, list view filters, the `/admin/weights` payload. Handles invalidation cleanly after admin saves. Avoids hand-rolled `useEffect(fetch)` patterns. |
| **@tanstack/react-table** | 8.21.x | History table | Verlaufsansicht: sorting (Datum/Name/PT), filtering by Projekttyp, search by Projektname — TanStack Table is headless so it composes with shadcn/ui table primitives without restyling. |
| **zustand** | 5.0.x | Client-only state | **Only if needed** (e.g. multi-step form draft, "letzter genutzter ‚Erstellt von‘" value persisted across mounts). For a single-page form, react-hook-form alone may suffice. Default: include but use sparingly. |
| **react-router** | 7.15.x | Routing | `/`, `/new`, `/estimates/:id`, `/admin`. React Router 7 is the merged successor to v6 + Remix routing — use the data-router mode. |
| **lucide-react** | latest | Icons | Default icon set shipped with shadcn/ui. Professional, line-style — matches the "no spielerische Elemente" constraint. |
| **clsx + tailwind-merge** | latest | Conditional class composition | Pulled in transitively by shadcn/ui's `cn()` helper. |

### Supporting Libraries — Backend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **alembic** | 1.18.x | Migrations | Run on container start (`alembic upgrade head`) before uvicorn. Initial revision creates the `estimates` table; future revisions add `user_id` (nullable) when auth is bolted on. |
| **python-multipart** | latest | Multipart parsing | Required if any upload endpoint is added later; bundled by `fastapi[standard]`. |
| **httpx** | latest | Testing | Use FastAPI's `TestClient` (built on httpx) for backend tests. Bundled by `fastapi[standard]`. |
| **pytest** + **pytest-asyncio** | latest | Test runner | Pytest with `pytest-asyncio` even on sync codebase — keeps the door open for one async endpoint if needed. |
| **ruff** | latest | Linter + formatter | Replaces black + isort + flake8 in one tool. 2026 standard. |
| **mypy** or **pyright** | latest | Type checker | Pyright is faster; either works with SQLAlchemy 2.0's typed attributes. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Frontend package manager | shadcn/ui CLI defaults to it; faster + disk-efficient vs npm. `npm` is also fine — pick one and stick with it. |
| **uv** (Astral) | Python package manager | Use `uv` for dependency resolution and lockfile (`uv.lock`). 10–100x faster than pip, has deterministic resolution, integrates cleanly with Docker (`uv sync --frozen`). |
| **docker** + **docker-compose v2** | Container orchestration | docker-compose v2 (the Go plugin) is required — v1 (Python) is EOL. The user invokes `docker compose up` (without hyphen). |
| **vitest** | Frontend tests | Vite-native test runner; reuses Vite config. Replaces Jest for new Vite projects. |
| **playwright** (optional) | E2E tests | Only if user wants browser-driven smoke tests of the full estimate → PDF flow. Add post-MVP. |

## Installation

### Backend (`backend/pyproject.toml` dependencies)

```toml
[project]
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi[standard]>=0.136,<0.137",
  "uvicorn[standard]>=0.47",
  "pydantic>=2.13,<3.0",
  "sqlalchemy>=2.0.40,<2.1",
  "alembic>=1.18,<2.0",
  "weasyprint>=68.1,<69",
  "jinja2>=3.1.6",
]

[dependency-groups]
dev = [
  "pytest>=8",
  "pytest-asyncio>=0.24",
  "httpx>=0.28",
  "ruff>=0.8",
  "pyright>=1.1.380",
]
```

### Frontend (`frontend/package.json`)

```bash
# Bootstrap
pnpm create vite@latest frontend -- --template react-ts
cd frontend
pnpm add react@^19 react-dom@^19 react-router@^7
pnpm add @tanstack/react-query@^5 @tanstack/react-table@^8
pnpm add react-hook-form@^7 zod@^4 @hookform/resolvers@^5
pnpm add zustand@^5
pnpm add lucide-react clsx tailwind-merge

# Tailwind v4 + shadcn
pnpm add -D tailwindcss@^4 @tailwindcss/vite@^4
pnpm dlx shadcn@latest init   # interactive: pick "Vite", Tailwind v4 detected automatically
pnpm dlx shadcn@latest add button input form table dialog select textarea label dropdown-menu

# Dev tooling
pnpm add -D @types/node @vitejs/plugin-react vitest @testing-library/react
```

### Docker base image

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 \
    fonts-dejavu fonts-liberation \
    curl \
 && rm -rf /var/lib/apt/lists/*
# ... (uv install, code copy, alembic upgrade, uvicorn)
```

```dockerfile
# frontend/Dockerfile
FROM node:22-alpine AS build
# ... pnpm build →
FROM nginx:1.27-alpine
# serve dist/ on port 3000
```

## Critical Stack Decisions — Deep Dives

### Decision 1: Sync vs Async SQLAlchemy → **SYNC**

**Recommendation:** Sync SQLAlchemy 2.0 with sync FastAPI routes (`def`, not `async def`) for DB-touching endpoints.

**Rationale:**
- Target load: 1 user, sub-second response budget for estimate calc, single SQLite file. Async adds zero throughput at concurrency=1.
- Sync 2.0 with `Mapped[]` typing is excellent and the testing story is simpler (`Session` is a regular context manager; no `pytest-asyncio` plumbing on every test).
- WeasyPrint is fully synchronous — even an async stack would block the event loop during PDF generation unless wrapped in `run_in_threadpool`. Going sync top-to-bottom is honest.
- Postgres migration story is unaffected: `psycopg[binary]` driver works sync; if a future high-concurrency Postgres deployment demands async, the SQLAlchemy 2.0 codebase migrates with mechanical changes (`Session` → `AsyncSession`, `select(...).execute()` → `await session.execute(...)`).

**Don't:** Mix `async def` routes that call sync SQLAlchemy — this blocks the event loop and is worse than going pure-sync.

**Confidence:** HIGH (community consensus on benchmarks: async helps under load, hurts or no-ops at low concurrency; verified via FastAPI/SQLAlchemy guidance and benchmarks).

---

### Decision 2: Decimal Handling for €/PT → **CRITICAL**

**Recommendation:** Use `decimal.Decimal` end-to-end for any monetary or PT value that is stored, displayed, or computed against multipliers.

**Why this is load-bearing:** PERT calculations multiply 9+ correction factors against a base sum. With `float`, accumulated rounding drift will cause snapshots to disagree across machines, breaking the "reproducible after weights change" guarantee.

**The SQLite gotcha (must surface):**
- SQLite has **no native DECIMAL/NUMERIC type**. SQLAlchemy's `Numeric(asdecimal=True)` on SQLite will internally convert to `float` during DBAPI round-trips, then back to `Decimal` — and this conversion is **not lossless**. SQLAlchemy emits a `SAWarning` about this.
- **Mitigation:** Use one of:
  1. **Store as TEXT** via a `TypeDecorator` that serializes `Decimal` → ISO decimal string for SQLite, and uses native `NUMERIC` on PostgreSQL. Recommended for this project — preserves precision in the local-first SQLite case and "just works" on Postgres.
  2. Store as **integer cents/milli-PT** (e.g. PT × 1000 as INTEGER). Most precision-safe; ugliest API.
- PostgreSQL has true `NUMERIC` — no workaround needed there. The TypeDecorator approach is portable.

**Pydantic side:**
```python
from decimal import Decimal
from pydantic import BaseModel, Field

class EstimationInput(BaseModel):
    daily_rate_eur: Decimal = Field(max_digits=10, decimal_places=2, gt=0)
    pages: int = Field(ge=0)
    # ...

class EstimationResult(BaseModel):
    pt_pert: Decimal = Field(max_digits=10, decimal_places=2)
    # JSON output is a string by default — keeps full precision; tell frontend to format
```

**Rounding policy:**
- Use `decimal.localcontext()` with `ROUND_HALF_UP` for *display* rounding (PT to 1 decimal, € to 2 decimals).
- **Never round intermediate results** — round only at the boundary (PDF rendering, dashboard formatting).
- Document the rounding policy in `methodik.txt` so the audit story is airtight.

**Frontend:**
- Receive `Decimal` as **string** from JSON (Pydantic's default). Don't parse to JS `Number` — render directly with `Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, useGrouping: true })`.
- For €: `new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(...)`. Handles German formatting (1.234,56 €) natively.

**Confidence:** HIGH (SQLite decimal limitation confirmed in SQLAlchemy docs + sqlalchemy-stubs/sqlmodel guidance; Pydantic v2 Decimal support confirmed via Pydantic docs).

---

### Decision 3: WeasyPrint Docker dependencies → **MUST DOCUMENT**

**Recommendation:** Use `python:3.12-slim-bookworm` (Debian) — **NOT Alpine** — for the backend container.

**Why not Alpine:**
- Alpine uses musl libc; WeasyPrint's Pango/Cairo path resolution via `ctypes.util.find_library` fails on Alpine without manual patching (documented WeasyPrint issue). Buildable, but every upgrade is friction.
- Alpine image is "smaller" only if you ignore that pango/cairo/gdk-pixbuf-dev/-runtime balloon it back up.

**Required Debian packages** (verified against WeasyPrint 68.1 official docs):
```
libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0
```
For wheel install (the common path). If you need source builds, add `libjpeg-dev libopenjp2-7-dev libffi-dev` — usually not needed because WeasyPrint ships wheels for Python 3.12 on linux/amd64 + linux/arm64.

**German umlauts in PDF — fonts gotcha:**
- `python:3.12-slim-bookworm` ships **no fonts by default**. Without fonts, WeasyPrint will fall back to a generic glyph and German text (ä, ö, ü, ß) may render poorly or as boxes in some viewers.
- **Install fonts explicitly:**
  ```
  apt-get install -y fonts-dejavu fonts-liberation
  ```
  `fonts-dejavu` has comprehensive Latin coverage including German umlauts. `fonts-liberation` matches Arial/Times metrics — useful for consultancy-style documents.
- For a more polished consultancy look, consider `fonts-inter` or copy a corporate font into `/usr/local/share/fonts/` and run `fc-cache -f` in the Dockerfile.
- **In CSS:** Set `@font-face` or `font-family: 'DejaVu Sans', sans-serif;` — don't rely on browser defaults; WeasyPrint won't have Chrome's font fallback magic.

**Confidence:** HIGH (Pango/Cairo deps verified against WeasyPrint 68.1 docs; font absence in slim images is a well-known Docker fact).

---

### Decision 4: React 19 vs 18 → **REACT 19**

**Recommendation:** React 19.2.

**Rationale:**
- shadcn/ui and the broader Radix UI ecosystem ship React 19-ready components.
- New features (`use()`, action transitions, ref-as-prop) make form code cleaner.
- **No Server Components** — they're irrelevant for a Vite + FastAPI split-architecture app. Use 100% client-side React. Adding RSC over Vite is bleeding-edge (`@vitejs/plugin-rsc` is still maturing) and has no payoff for a local-first tool.

**Vite version caveat:** Vite **8** ships Rolldown bundler (Rust) and was published recently; for production stability, target **Vite 7.x**. shadcn/ui's Vite template targets Vite 7 today.

**Confidence:** HIGH (npm versions verified; ecosystem state verified via shadcn/ui docs).

---

### Decision 5: PDF library — keep WeasyPrint, but know the tradeoffs

**Recommendation:** **WeasyPrint** (mandated and correct).

**Alternatives surveyed:**

| Library | Strengths | Weaknesses | When to pick over WeasyPrint |
|---------|-----------|------------|------------------------------|
| **WeasyPrint** 68.x | Excellent CSS Paged Media; reuse web templates; deterministic; print-grade typography | Native deps (Pango/Cairo); slower than Chrome-based; layout quirks for complex flex/grid | **Default for documents-from-HTML** |
| **xhtml2pdf** | Pure Python, no native deps | Old (Reportlab under the hood); poor CSS support; ugly defaults | Only if you cannot install native libs |
| **ReportLab** | Programmatic, low-level, fast, mature | Imperative API; you draw boxes — no HTML; very verbose | If you need pixel-perfect form-fill PDFs or charts WeasyPrint can't render |
| **Playwright PDF** | Pixel-perfect Chrome rendering; full modern CSS (grid, flexbox, filters) | Heavy: bundles Chromium (~300MB); slower per-PDF; overkill for static reports | If your PDF requires JS rendering or modern CSS features WeasyPrint stumbles on |
| **pyhtml2pdf / pyppeteer** | Similar to Playwright | Less maintained; same Chromium weight | Don't use — Playwright is the modern equivalent |

**Why WeasyPrint stays winner for *this* project:**
- Consultant reports are typography-heavy static documents — WeasyPrint's CSS Paged Media (running headers, page numbers, page-break-inside, `@page` rules) is **better** than Chrome here.
- Determinism matters: the same input must produce byte-identical PDFs for reproducibility audits. WeasyPrint is more deterministic than Chromium.
- Native-deps cost is paid once in the Dockerfile and never again.

**Confidence:** HIGH (well-trodden 2026 Python-PDF landscape).

---

### Decision 6: i18n & Localization → **No library needed**

**Recommendation:** No i18n library. Hard-code German strings. Use `Intl` API for numbers/dates.

**Rationale:**
- UI is German-only by explicit constraint. Pulling in i18next adds runtime weight and indirection for a constraint that is **out of scope**.
- For dates: `new Date().toLocaleDateString('de-DE')` → `16.05.2026`.
- For numbers/€: `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
- For backend (PDF, scope text): Python `babel` library is overkill; use `f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")` or — cleaner — `locale.format_string()` with `de_DE.UTF-8` locale (must be installed in the container: `apt-get install -y locales && locale-gen de_DE.UTF-8`).

**If German locale is needed in the container:**
```dockerfile
RUN apt-get install -y locales \
 && sed -i '/de_DE.UTF-8/s/^# //' /etc/locale.gen \
 && locale-gen
ENV LANG=de_DE.UTF-8 LC_ALL=de_DE.UTF-8
```

**Confidence:** HIGH (Intl API is universally supported; locale-gen pattern is standard Debian practice).

---

### Decision 7: Docker Compose structure → **two services, healthcheck-gated**

**Recommended `docker-compose.yml` shape:**

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/app/data       # SQLite + future user uploads
      - ./config:/app/config   # weights.json + methodik.txt
    environment:
      DATABASE_URL: sqlite:///./data/estimates.db
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8000/health"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
```

**Key patterns:**
- **Healthcheck on backend:** FastAPI `GET /health` returns 200 + minimal payload. Frontend `depends_on: condition: service_healthy` blocks startup until backend is ready — prevents the "404 on first page load" race.
- **curl in backend image:** add `curl` to apt packages or use `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"` to avoid adding curl.
- **Persistent volumes:** `./data` and `./config` as bind-mounts (visible to user) — supports the "Berater bearbeitet weights.json direkt" escape hatch.
- **Frontend served by nginx:** Vite is dev-only; production frontend is `pnpm build` → static `dist/` → nginx. No node in the final frontend image.
- **No database service in v1:** SQLite is a file, no separate container. When migrating to PostgreSQL, add a `db` service with `condition: service_healthy` on the backend's `depends_on`.

**Restart policy:** `unless-stopped` — survives daemon reboots without restarting after `docker compose down`.

**Confidence:** HIGH (healthcheck + depends_on pattern is documented 2026 best practice).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Sync SQLAlchemy 2.0 | Async SQLAlchemy + aiosqlite | If concurrency becomes a real constraint (>50 concurrent users on Postgres). Not now. |
| Pydantic v2 + Decimal | Pydantic v2 + integer-cents | If you find SQLite Decimal precision still drifts after the TypeDecorator. Integer cents is bulletproof but uglier. |
| WeasyPrint | Playwright PDF | If users demand pixel-perfect Chrome rendering or you need to embed live charts (Chart.js) in the PDF. |
| Tailwind v4 + shadcn | Tailwind v3 + HeadlessUI | Tailwind v3 if you have a corporate design system already configured for v3. Otherwise v4 is the future. |
| React Hook Form + Zod | Formik | Formik is older, slower, more re-renders; only pick if your team has deep Formik muscle memory. |
| TanStack Table | AG Grid Community | AG Grid only if you need spreadsheet-like cell editing or virtualization for 10k+ rows. Overkill here. |
| Zustand | Jotai / Redux Toolkit | Jotai if you prefer atomic state; Redux Toolkit if multiple devs already know it. For one developer + small surface area, Zustand wins. |
| TanStack Query | SWR | SWR is similar but smaller ecosystem; TanStack Query is the stronger 2026 default. |
| Alembic | SQLModel-managed migrations | Alembic is more verbose but battle-tested; SQLModel's migration story is thinner. |
| `python:3.12-slim-bookworm` | `python:3.13-slim-bookworm` | 3.13 only if you specifically need its features (free-threading, JIT). Otherwise 3.12 is the production-safer pick. |
| `python:3.12-slim-bookworm` | `python:3.12-alpine` | Never for WeasyPrint. Pango/Cairo on musl is friction without payoff. |
| `node:22-alpine` (frontend build) | `node:22-bookworm` | Alpine is fine for the **frontend** build stage — no native deps required. Stay with alpine here. |
| nginx (serve frontend) | Vite preview / Caddy | nginx is rock-solid for static SPA serving; Caddy is fine too but adds an unfamiliar binary. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`float`** for €/PT calculations | Accumulated rounding drift breaks snapshot reproducibility | `decimal.Decimal` with explicit precision |
| **SQLite `REAL` column for money** | Stores as 64-bit float; same drift problem | `TypeDecorator` storing as TEXT or PostgreSQL-style NUMERIC |
| **Pydantic v1** | EOL, slower, different API | Pydantic v2 (required by FastAPI 0.100+ anyway) |
| **Async SQLAlchemy in v1** | Complexity without benefit at concurrency=1 | Sync 2.0 with `Mapped[]` typed attributes |
| **Alpine Linux for the backend** | WeasyPrint Pango path resolution is fragile on musl | `python:3.12-slim-bookworm` |
| **`python:3.12-slim` without fonts** | German umlauts may render as boxes in PDF | Install `fonts-dejavu fonts-liberation` |
| **Vite 8 in production** (today) | Bleeding edge (Rolldown bundler) | Vite 7.x — wait for v8 to stabilize |
| **React Server Components on Vite** | Requires bleeding-edge `@vitejs/plugin-rsc`; no benefit for local-first SPA | Plain client-side React 19 |
| **HeadlessUI alone** for component primitives | Smaller scope than Radix, less complete | shadcn/ui (built on Radix) |
| **i18next** for v1 | YAGNI — UI is German-only | Plain string literals + `Intl` API |
| **Tailwind v3** for a greenfield project | v4 is faster, simpler config, shadcn defaults to v4 | Tailwind v4 + `@tailwindcss/vite` |
| **`tailwind.config.js` heavyweight customization** | v4 prefers CSS-first config via `@theme` | Put theme tokens in CSS, not JS |
| **Formik** | Slower, more re-renders than RHF | react-hook-form |
| **Redux** for v1 | Boilerplate-heavy for this surface area | Zustand (only if needed) + TanStack Query for server state |
| **Storing weights.json in DB** | User explicitly chose filesystem; defeats easy Admin reset/version | Filesystem `config/weights.json` mounted as volume |
| **`docker-compose` v1 (Python)** | EOL since 2023 | `docker compose` v2 (Go plugin), no hyphen |
| **`fastapi[all]` extra** | Pulls in things you don't need; legacy alias | `fastapi[standard]` — explicit, current canonical extra |

## Stack Patterns by Variant

**If the project later requires PostgreSQL:**
- Change only `DATABASE_URL` → `postgresql+psycopg://user:pass@db:5432/estimates`
- Add `psycopg[binary]>=3.2` to dependencies
- Add `db` service in `docker-compose.yml` with healthcheck
- TypeDecorator for Decimal collapses to plain `Numeric` — no app code changes
- Alembic migrations run unchanged

**If the project later requires auth:**
- Add `user_id` column (already designed as nullable) via Alembic migration
- Adopt `fastapi-users` (Context7-verified, mature) or a custom JWT stack
- No data model rewrite needed

**If PDF needs Chrome-level CSS:**
- Swap WeasyPrint for `playwright` (Python package): `pip install playwright && playwright install chromium`
- Image grows by ~300MB; build time grows; accept the cost
- Reuse the same Jinja2 templates with minor CSS tweaks

**If concurrency grows past ~50 users:**
- Promote backend to multi-worker (`uvicorn --workers 4` or `gunicorn -k uvicorn.workers.UvicornWorker`)
- Reconsider async SQLAlchemy (mechanical migration since you used 2.0 typed API)
- Add Redis for TanStack Query server-side caching of admin weights endpoint

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| FastAPI 0.136 | Pydantic 2.13, SQLAlchemy 2.0, Python 3.10–3.13 | `fastapi[standard]` extras are the canonical install since ~0.110 |
| Pydantic 2.13 | Python 3.9–3.13 | Decimal support via `Field(max_digits=, decimal_places=)` |
| SQLAlchemy 2.0 | Pydantic 2.x via `pydantic.dataclasses` or separate DTOs | Don't auto-bind ORM models to Pydantic — keep `EstimationORM` and `EstimationDTO` separate |
| WeasyPrint 68.1 | Python ≥ 3.10 | Requires Pango ≥ 1.44 on host; Debian bookworm has 1.50 |
| Alembic 1.18 | SQLAlchemy ≥ 1.4 | `alembic.ini` env.py needs minor edits for 2.0-style models |
| React 19.2 | TypeScript 5.3+, Vite 5/6/7, react-router 7 | All shadcn/ui components verified |
| Vite 7.x | Node ≥ 20.19 or ≥ 22.12 | Vite 8 requires same but ships Rolldown |
| Tailwind v4 | `@tailwindcss/vite` 4.x, PostCSS 8.x | No tailwind.config.js needed; theme in CSS via `@theme` |
| shadcn/ui (3.x CLI) | Tailwind v4, React 19, TypeScript | Components are copied into your repo — version locking is moot |
| TanStack Query 5 | React 18 or 19 | Same |
| TanStack Table 8.21 | React 16.8+ | Headless; composes with shadcn primitives |
| react-hook-form 7.76 | React 17, 18, 19 | Use `@hookform/resolvers/zod` v5+ for Zod 4 compatibility |
| zod 4 | TypeScript 5.x | `@hookform/resolvers` 5.x added Zod 4 support |

## Sources

- **Context7 / `/fastapi/fastapi`** — FastAPI 0.136 confirmed (versions list); dependency injection + Pydantic v2 integration patterns
- **Context7 / `/websites/sqlalchemy_en_20`** — SQLAlchemy 2.0 sync/async typed API, `Mapped[]`, `Numeric.asdecimal`
- **Context7 / `/pydantic/pydantic`** — Pydantic v2 Decimal field constraints, JSON serialization defaults
- **Context7 / `/kozea/weasyprint`** — WeasyPrint 68.x docs + Pango/Cairo deps
- **Context7 / `/react-hook-form/documentation`** — RHF v7.76 patterns
- **Context7 / `/tanstack/query` & `/tanstack/table`** — Current TanStack patterns (Query 5.x, Table 8.x)
- **Context7 / `/pmndrs/zustand`** — Zustand 5.x
- **Context7 / `/shadcn-ui/ui`** — shadcn 3.x with Tailwind v4 + React 19
- [PyPI: FastAPI 0.136.1](https://pypi.org/project/fastapi/) — current release verified
- [PyPI: SQLAlchemy 2.0.49](https://pypi.org/project/SQLAlchemy/) — current release verified
- [PyPI: WeasyPrint 68.1](https://pypi.org/project/weasyprint/) — current release + Python ≥ 3.10 verified
- [PyPI: Pydantic 2.13.4](https://pypi.org/project/pydantic/) — current release verified
- [PyPI: Alembic 1.18.4](https://pypi.org/project/alembic/) — current release verified
- [PyPI: aiosqlite 0.22.1](https://pypi.org/project/aiosqlite/) — only relevant if async is later adopted
- [npm: react@19.2.6](https://www.npmjs.com/package/react), [vite@8.0.13 / 7.x stable](https://www.npmjs.com/package/vite), [tailwindcss@4.3.0](https://www.npmjs.com/package/tailwindcss), [@tanstack/react-query@5.100.10](https://www.npmjs.com/package/@tanstack/react-query), [@tanstack/react-table@8.21.3](https://www.npmjs.com/package/@tanstack/react-table), [zustand@5.0.13](https://www.npmjs.com/package/zustand), [react-hook-form@7.76.0](https://www.npmjs.com/package/react-hook-form), [zod@4.4.3](https://www.npmjs.com/package/zod) — versions verified
- [WeasyPrint 68.1 first-steps docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html) — Debian apt package list verified (HIGH confidence)
- [SQLAlchemy 2.0 Type Hierarchy](https://docs.sqlalchemy.org/en/20/core/type_basics.html) — Numeric.asdecimal semantics verified
- [SQLModel: Decimal Numbers](https://sqlmodel.tiangolo.com/advanced/decimal/) — SQLite Decimal limitation corroborated
- [shadcn/ui Vite + Tailwind v4 install guide](https://ui.shadcn.com/docs/installation/vite) — current Vite + Tailwind v4 setup
- [shadcn/ui Tailwind v4 migration guide](https://ui.shadcn.com/docs/tailwind-v4) — v4 compatibility status
- [FastAPI dependencies-with-yield docs](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/) — session lifecycle pattern
- [Python `decimal` docs — localcontext + rounding](https://docs.python.org/3/library/decimal.html) — ROUND_HALF_UP semantics
- [Pydantic Fields docs](https://docs.pydantic.dev/latest/concepts/fields/) — Decimal field constraints

---

*Stack research for: local-first FastAPI + React PT estimation tool with PDF export*
*Researched: 2026-05-16*
