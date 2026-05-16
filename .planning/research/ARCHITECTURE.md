# Architecture Research

**Domain:** Local-first, cloud-ready web app for deterministic PT estimation (React/Vite/Tailwind FE + FastAPI/SQLAlchemy BE + WeasyPrint PDF, deployed via docker-compose).
**Researched:** 2026-05-16
**Confidence:** HIGH on stack-conventional decisions (FastAPI layering, Vite proxy, JSON snapshot column); MEDIUM on reverse-proxy-vs-two-service trade-off (both are valid; we recommend one with explicit rationale).

---

## Standard Architecture

### System Overview — Recommended Topology (Reverse-Proxy via Single Frontend Container)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Browser  (http://localhost:3000)                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTP (same-origin)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  frontend  container  (nginx:alpine, port 3000 host → 80 container)  │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐  │
│  │  /            → static     │  │  /api/*       → proxy_pass     │  │
│  │  /admin       → static     │  │                 backend:8000   │  │
│  │  /assets/*    → static     │  │  /api/pdf/*   → proxy_pass     │  │
│  └────────────────────────────┘  └─────────────────┬──────────────┘  │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │ Docker network
                                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│  backend  container  (python:3.12-slim + uvicorn, internal port 8000)│
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐  │
│  │  routers/    │→│  services/   │→│ engine.py   │ │ pdf/         │  │
│  │  (HTTP)      │ │  (workflow)  │ │ (pure func) │ │ (WeasyPrint) │  │
│  └──────┬───────┘ └──────┬───────┘ └─────────────┘ └──────────────┘  │
│         │                │                                            │
│         │         ┌──────▼───────┐ ┌──────────────┐                  │
│         └────────►│  schemas/    │ │  models/     │                  │
│                   │  (Pydantic)  │ │ (SQLAlchemy) │                  │
│                   └──────────────┘ └──────┬───────┘                  │
│                                           │                          │
│                                  ┌────────▼─────────┐                │
│                                  │   db/session.py  │                │
│                                  └────────┬─────────┘                │
└───────────────────────────────────────────┼──────────────────────────┘
                                            │
                ┌───────────────────────────┼────────────────────────┐
                │                           │                        │
                ▼                           ▼                        ▼
        ┌───────────────┐         ┌─────────────────┐       ┌──────────────┐
        │ ./data        │         │ ./config        │       │ DATABASE_URL │
        │ (bind volume) │         │ (bind volume)   │       │ (env)        │
        │ estimates.db  │         │ weights.json    │       │              │
        │               │         │ methodik.txt    │       │ default:     │
        └───────────────┘         └─────────────────┘       │ sqlite:///./data│
                                                            └──────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `frontend` container | Serve built Vite SPA (`dist/`); reverse-proxy `/api/*` to backend; terminate browser HTTP on port 3000 | `nginx:alpine` + custom `nginx.conf` |
| `backend` container | HTTP API + estimation engine + PDF rendering; stateless; reads/writes DB and config volume | `python:3.12-slim` + `uvicorn` + FastAPI |
| `routers/` | HTTP routing only; validate (via Pydantic), call service, return DTO | Thin (≤ 20 lines per endpoint) |
| `services/` | Orchestrate workflow: load weights → call engine → persist → return | Plain Python classes/modules, no HTTP awareness |
| `engine.py` | Pure deterministic PERT calculation; no DB, no I/O, no FastAPI imports | Pure functions only |
| `models/` | SQLAlchemy ORM definitions (`Estimate`) | SQLAlchemy 2.0 declarative |
| `schemas/` | Pydantic request/response DTOs; never imported by `engine.py` | Pydantic v2 |
| `pdf/` | WeasyPrint renderer + Jinja2 HTML templates + print CSS | Templates in `pdf/templates/`, CSS in `pdf/static/` |
| `db/session.py` | Engine, sessionmaker, `get_db()` FastAPI dependency | SQLAlchemy 2.0 + dependency injection |
| `config/loader.py` | Read/write `weights.json` and `methodik.txt`; atomic-write semantics; in-memory cache with mtime invalidation | `pathlib` + `tempfile` + `os.replace` |
| `./data` volume | Persistent SQLite DB across container restarts | Docker bind mount `./data:/app/data` |
| `./config` volume | Editable config files (survive container rebuild) | Docker bind mount `./config:/app/config` |

---

## Recommended Project Structure

### Mono-repo Layout (root)

```
EstimationManager/
├── docker-compose.yml          # Single source of truth for local dev + run
├── .env.example                # Documented env vars; copied to .env on first run
├── .gitignore                  # Ignore .env, ./data/*.db, node_modules, __pycache__
├── README.md                   # Quick start: docker-compose up
│
├── frontend/                   # React + Vite SPA
│   ├── Dockerfile              # Multi-stage: node:20 build → nginx:alpine serve
│   ├── nginx.conf              # Reverse-proxy config (see Pattern 1)
│   ├── package.json
│   ├── vite.config.ts          # Dev proxy /api → http://backend:8000 (dev only)
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx            # Entry; mounts <App /> at #root
│       ├── App.tsx             # Top-level router (React Router)
│       ├── routes/             # Route components (page-level)
│       │   ├── EstimateNew.tsx       # POST /api/estimates flow
│       │   ├── EstimateView.tsx      # GET /api/estimates/:id
│       │   ├── EstimateList.tsx      # GET /api/estimates (Verlauf)
│       │   └── Admin.tsx             # GET/PUT /api/admin/weights
│       ├── features/                 # Vertical slices (one folder per domain feature)
│       │   ├── estimate/
│       │   │   ├── EstimateForm.tsx        # react-hook-form + zod schema
│       │   │   ├── EstimateResultPanel.tsx # Dashboard display
│       │   │   ├── ParameterTable.tsx
│       │   │   ├── api.ts                  # TanStack Query hooks for /api/estimates
│       │   │   └── schema.ts               # zod schemas (shared with form + API)
│       │   ├── history/
│       │   │   ├── HistoryTable.tsx
│       │   │   ├── HistoryFilters.tsx
│       │   │   └── api.ts
│       │   └── admin/
│       │       ├── WeightsEditor.tsx
│       │       ├── FactorsEditor.tsx
│       │       ├── MethodikEditor.tsx
│       │       └── api.ts
│       ├── components/               # Shared dumb components (no domain knowledge)
│       │   ├── ui/                   # Button, Input, Select, Card, Table primitives
│       │   ├── Layout.tsx
│       │   └── Header.tsx
│       ├── lib/                      # Cross-cutting utilities
│       │   ├── api-client.ts         # fetch wrapper with base URL = '' (same-origin)
│       │   ├── format.ts             # German number/date formatting
│       │   └── query-client.ts       # TanStack Query client config
│       ├── stores/                   # Zustand stores (client-only UI state)
│       │   └── ui.ts                 # e.g. last-used "Erstellt von" value
│       └── styles/
│           └── index.css             # Tailwind directives + globals
│
├── backend/                    # FastAPI service
│   ├── Dockerfile              # python:3.12-slim + WeasyPrint system deps
│   ├── pyproject.toml          # uv/pip-compile project metadata
│   ├── requirements.txt        # Pinned deps (uvicorn, fastapi, sqlalchemy, weasyprint, jinja2)
│   ├── alembic.ini             # (Phase ≥ 2) DB migrations
│   ├── migrations/             # (Phase ≥ 2) Alembic revisions
│   │   └── versions/
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app factory, router includes, CORS-as-noop
│       ├── config.py           # Pydantic Settings (env vars: DATABASE_URL, CONFIG_DIR, DATA_DIR)
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── estimates.py    # /api/estimates  (POST, GET, GET/:id, DELETE/:id, POST/:id/clone)
│       │   ├── pdf.py          # /api/estimates/:id/pdf
│       │   └── admin.py        # /api/admin/weights, /api/admin/methodik, /api/admin/reset
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── estimate.py     # EstimateInput, EstimateOutput, EstimateSummary
│       │   ├── weights.py      # WeightsConfig (mirrors weights.json structure)
│       │   └── common.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── estimate_service.py    # create_estimate(), get_estimate(), list_estimates(), clone_estimate()
│       │   ├── weights_service.py     # load_weights(), save_weights(), reset_to_defaults()
│       │   └── pdf_service.py         # render_pdf(estimate) -> bytes
│       ├── engine/
│       │   ├── __init__.py
│       │   ├── calculator.py          # PURE: calculate_pt(inputs, weights) -> EstimateResult
│       │   ├── phases.py              # PURE: distribute_phases(ml, phase_weights)
│       │   └── scope_text.py          # PURE: generate_scope_text(estimate, weights, lang='de')
│       ├── models/
│       │   ├── __init__.py
│       │   ├── base.py                # DeclarativeBase
│       │   └── estimate.py            # Estimate model with nullable user_id, JSON snapshot column
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py             # engine, SessionLocal, get_db dependency
│       │   └── init.py                # create_all() for dev / fallback when no Alembic
│       ├── pdf/
│       │   ├── __init__.py
│       │   ├── renderer.py            # WeasyPrint HTML(...).write_pdf()
│       │   ├── templates/
│       │   │   ├── estimate.html.j2   # Jinja2 — same data as web view but print-formatted
│       │   │   └── _partials/
│       │   └── static/
│       │       ├── print.css          # @page rules, German typography
│       │       └── logo.svg
│       └── seed/
│           ├── weights.default.json   # Bundled-in defaults (used for reset + first-run seed)
│           └── methodik.default.txt
│
├── data/                       # SQLite DB lives here (bind-mounted into backend)
│   └── .gitkeep                # Folder tracked; *.db files gitignored
│
├── config/                     # weights.json + methodik.txt (bind-mounted into backend)
│   └── .gitkeep                # Files seeded on first run from backend/app/seed/
│
└── tests/                      # Mirror backend structure for unit tests
    ├── backend/
    │   ├── test_calculator.py        # Pure engine tests — no fixtures, no DB
    │   ├── test_estimate_service.py  # With in-memory SQLite
    │   └── test_pdf_render.py        # Smoke test: PDF bytes > 0, contains expected text
    └── frontend/
        └── (Vitest tests co-located in src/ as *.test.ts)
```

### Structure Rationale

- **`frontend/` and `backend/` as siblings at root** — Mono-repo with two clearly bounded subprojects. Each has its own `Dockerfile`, dependencies, and toolchain. No shared code in v1; if shared types are ever needed (e.g. generated OpenAPI client), introduce a `shared/` directory then.
- **`data/` and `config/` at root** — Bind-mounted into the backend container. Putting them at the project root (not inside `backend/`) makes the persistent state visible and easy to back up; the user can copy/zip these two folders to migrate state.
- **`backend/app/` package layout (not flat)** — Standard FastAPI convention. `app.main:app` is the uvicorn target. Keeps `pyproject.toml`, `Dockerfile`, and tests outside the importable package.
- **Engine as its own sub-package (`engine/`), not inside `services/`** — Hard architectural boundary: `engine/*` files MUST NOT import from `models/`, `db/`, `schemas/`, or FastAPI. Enforced by code review (and optionally by `import-linter`). This guarantees the engine is testable with plain dicts and gives us reproducibility because the engine has zero side-effects.
- **`schemas/` separate from `models/`** — Pydantic DTOs ≠ SQLAlchemy ORM. Avoids the trap of leaking DB columns into API responses. Schemas can evolve independently of DB schema.
- **`features/` (vertical slices) in frontend** — Each user-facing domain (estimate, history, admin) is a self-contained folder. Avoids the "1000 components in one bucket" problem. Shared primitives live in `components/ui/`.
- **`seed/` directory with bundled defaults** — Critical for `docker-compose up` first-run: backend startup hook copies `seed/*.default.*` to `./config/` if and only if the target files don't already exist. Lets users wipe `./config/` to reset.

---

## Architectural Patterns

### Pattern 1: Reverse-Proxy via Single Frontend Container (RECOMMENDED)

**What:** The `frontend` container runs `nginx:alpine` and serves both the built SPA static files AND reverse-proxies `/api/*` to the `backend` container. The browser only ever talks to port 3000. Backend port 8000 is NOT exposed to host.

**When to use:** This project (always — local-first single-user app where same-origin simplifies everything).

**Trade-offs:**
- ✅ **No CORS configuration needed** (everything is same-origin from browser's POV)
- ✅ **Single URL for the user**: `http://localhost:3000` for both UI and admin
- ✅ **Matches production topology** (cloud deployment would use the same nginx config)
- ✅ **Backend port not exposed** = smaller attack surface
- ❌ Slightly more complex Dockerfile (multi-stage: node build → nginx serve)
- ❌ Live-reload during dev requires Vite dev server (not nginx), so dev and prod compose files differ slightly

**Example — `frontend/nginx.conf`:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: all client-side routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy (same-origin from browser perspective)
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # PDF can be large; give it room
        proxy_read_timeout 30s;
        proxy_send_header off;
        client_max_body_size 1m;
    }
}
```

**Example — `frontend/Dockerfile` (multi-stage):**
```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Dev mode:** Use `vite.config.ts` proxy (`/api → http://backend:8000`) when running `npm run dev` against a local backend. Same `/api` paths work in dev and prod, so no client code changes between environments.

### Pattern 2: Pure Engine Module (Hard Boundary)

**What:** `backend/app/engine/` contains only pure functions. Inputs and outputs are plain dataclasses or dicts. No DB, no FastAPI, no I/O.

**When to use:** Always for the PERT calculator. The reproducibility constraint (snapshot-based recompute must produce identical results forever) demands a pure function.

**Trade-offs:**
- ✅ Testable in isolation with hand-crafted dicts (no DB fixtures)
- ✅ Reproducibility provable: given identical inputs, identical outputs
- ✅ Can be promoted to a CLI, a library, or a different language port without surgery
- ❌ Small ergonomic cost: services must marshal ORM → dict before calling

**Example:**
```python
# backend/app/engine/calculator.py
from dataclasses import dataclass

@dataclass(frozen=True)
class EstimateInputs:
    pages: int
    pages_complexity: str        # 'low' | 'medium' | 'high' | 'very_high'
    use_cases: int
    use_cases_complexity: str
    # ... all other parameters
    languages: int
    roles: int
    concurrent_users_band: str   # '<50' | '50-200' | ...
    factor_tech: str             # 'sehr_guenstig' ... 'sehr_unguenstig'
    factor_team: str
    factor_quality: str
    factor_doc: str
    project_type: str            # 'neuentwicklung' | 'erweiterung' | 'migration' | 'legacy'

@dataclass(frozen=True)
class EstimateResult:
    most_likely: float
    optimistic: float
    pessimistic: float
    pert: float
    std_dev: float
    phases: dict[str, float]     # {'anforderungen': 12.3, 'architektur': ...}
    risk_warning: bool

def calculate(inputs: EstimateInputs, weights: dict) -> EstimateResult:
    """Pure: no I/O, no global state. Identical (inputs, weights) → identical result, forever."""
    ml = _most_likely(inputs, weights)
    o = ml * weights['pert']['optimistic_factor']    # default 0.75
    p = ml * weights['pert']['pessimistic_factor']   # default 1.55
    pert = (o + 4 * ml + p) / 6
    std_dev = (p - o) / 6
    phases = _distribute_phases(ml, weights['phase_distribution'])
    risk = _any_factor_above(inputs, weights, threshold=1.15)
    return EstimateResult(ml, o, p, pert, std_dev, phases, risk)
```

### Pattern 3: Snapshot Column for Immutable Reproducibility

**What:** Each `Estimate` row stores a complete copy of the weights used at calculation time, as a JSON column. Historical estimates recompute (or just read) from their own snapshot, never from current `weights.json`.

**When to use:** Always for this project. This pattern is the architectural realization of the "Schätzungen are immutable / clone-only / reproducible after weight changes" requirement.

**Trade-offs:**
- ✅ Trivially reproducible — view of a historical estimate never depends on the current state of `weights.json`
- ✅ No version table, no audit table, no "weights v3.2" foreign key — schema stays flat
- ✅ Clone is a row-copy with `id` reset and `created_at` reset; snapshot survives unchanged
- ❌ Storage cost (weights.json ≈ 5 KB × N estimates — negligible for single-user tool)
- ❌ Cannot query "all estimates that used weight X" without scanning JSON (out of scope for v1)

**Decision: ALSO store the computed result in the same row.** Two reasons: (1) faster history list display (no need to recompute on every page load), (2) defends against engine code drift — a recalculation bug introduced in Phase 4 won't silently change the displayed PT of a Phase-2 estimate. Recompute is then a verification operation, not a display path.

**Example — `backend/app/models/estimate.py`:**
```python
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Estimate(Base):
    __tablename__ = "estimates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    project_sketch: Mapped[str] = mapped_column(String(600), default="")
    project_type: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    created_by: Mapped[str] = mapped_column(String(100), default="")  # free-text v1
    daily_rate_eur: Mapped[float] = mapped_column(Float, default=0.0)

    # Full input parameters — JSON for schema flexibility
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Weights snapshot AT TIME OF CALCULATION — the reproducibility anchor
    weights_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Cached result — display path; recomputable from (inputs, weights_snapshot) for verification
    result: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Auth-readiness seam — see Pattern 5
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
```

### Pattern 4: Config-as-File with Atomic Write + Mtime Cache

**What:** `weights.json` and `methodik.txt` live on the `./config` bind-mounted volume. Backend reads them at startup, caches in memory, and re-reads when file mtime changes. Writes (from admin UI) go through an atomic rename to avoid torn writes.

**When to use:** When config is human-readable, versionable, AND admin-editable. This project ticks all three boxes; storing weights in the DB would lose the "easy to back up / version-control / share via filesystem" property the user explicitly chose.

**Trade-offs:**
- ✅ Operator can `cat`, `diff`, `git`, copy weights.json without touching the DB
- ✅ Reset = `rm config/weights.json && restart` (seeded from `seed/weights.default.json`)
- ✅ Atomic rename prevents half-written file ever being read
- ❌ Concurrent admin writes need a file lock (`fcntl.flock`) — but v1 is single-user, so a process-level `threading.Lock` is sufficient
- ❌ Cache invalidation by mtime requires `os.stat()` per read — negligible cost

**Example — `backend/app/services/weights_service.py`:**
```python
import json
import os
import tempfile
import threading
from pathlib import Path

_lock = threading.Lock()
_cache: dict | None = None
_cache_mtime: float = 0.0

def load_weights(config_dir: Path) -> dict:
    global _cache, _cache_mtime
    path = config_dir / "weights.json"
    if not path.exists():
        _seed_from_defaults(config_dir)
    mtime = path.stat().st_mtime
    if _cache is None or mtime != _cache_mtime:
        with path.open("r", encoding="utf-8") as f:
            _cache = json.load(f)
        _cache_mtime = mtime
    return _cache  # caller MUST treat as read-only (deep-copy before mutating)

def save_weights(config_dir: Path, new_weights: dict) -> None:
    global _cache, _cache_mtime
    path = config_dir / "weights.json"
    with _lock:
        # Atomic write: temp file in same dir + os.replace
        fd, tmp_path = tempfile.mkstemp(dir=config_dir, suffix=".json.tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(new_weights, f, indent=2, ensure_ascii=False)
            os.replace(tmp_path, path)  # atomic on POSIX
        except Exception:
            os.unlink(tmp_path)
            raise
        _cache = new_weights
        _cache_mtime = path.stat().st_mtime
```

### Pattern 5: Auth-Readiness Seam (Without Implementing Auth)

**What:** Every persisted row that "belongs to a user" carries a nullable `user_id: int | None`. Every router accepting create-write operations takes a `current_user: User | None = Depends(get_current_user_optional)`. In v1, `get_current_user_optional` always returns `None`. The DB column defaults to `NULL`.

**When to use:** Whenever a project will plausibly grow multi-user but doesn't ship that way. This project is explicitly such a project.

**Trade-offs:**
- ✅ Adding auth later is purely additive: implement real `get_current_user_optional`, backfill nothing (NULL = "anonymous v1")
- ✅ No schema migration needed when auth ships — only behaviour change (the column already exists)
- ✅ Routes that need filtering by user already have the dependency injection point
- ❌ Slight ceremony cost (one extra dependency, one extra nullable column)
- ❌ Risk of forgetting and writing a query that doesn't filter by user_id — mitigated by code review checklist post-auth

**Example — `backend/app/routers/estimates.py`:**
```python
from typing import Annotated
from fastapi import APIRouter, Depends
from app.schemas.estimate import EstimateInput, EstimateOutput
from app.services.estimate_service import EstimateService
from app.auth import get_current_user_optional, User

router = APIRouter(prefix="/api/estimates", tags=["estimates"])

@router.post("", response_model=EstimateOutput, status_code=201)
def create_estimate(
    payload: EstimateInput,
    service: Annotated[EstimateService, Depends()],
    user: Annotated[User | None, Depends(get_current_user_optional)],
):
    user_id = user.id if user else None
    return service.create(payload, user_id=user_id)

# backend/app/auth.py — v1 stub
async def get_current_user_optional() -> "User | None":
    return None  # Phase ≥ later: parse JWT / session cookie
```

The "Erstellt von" form field is a separate concern — it's free-text metadata about who claims authorship of the estimate. It stays as `created_by: str` on the row and is NOT auth-coupled. When real auth ships, `user_id` becomes the source of truth for ownership, while `created_by` remains an editable display field (some consultants may want to attribute estimates to a colleague).

---

## Data Flow

### Flow 1: "User submits new estimate" (Hot Path)

```
[Browser: EstimateForm.tsx]
    │ user clicks "Berechnen"
    ▼
[react-hook-form + zod schema validates client-side]
    │ valid
    ▼
[POST /api/estimates with EstimateInput JSON]    ─── via nginx ───►   [backend:8000]
                                                                          │
[FastAPI: routers/estimates.py::create_estimate]  ◄───────────────────────┘
    │ Pydantic validates again (defense in depth)
    ▼
[services/estimate_service.py::create]
    │ 1. weights = weights_service.load_weights()   (in-memory cache hit)
    │ 2. snapshot = deep_copy(weights)              (freeze for reproducibility)
    │ 3. inputs_dc = EstimateInputs(**payload.dict())
    │ 4. result = engine.calculator.calculate(inputs_dc, snapshot)   ◄── PURE
    │ 5. estimate = Estimate(name=..., inputs=payload.dict(),
    │                       weights_snapshot=snapshot,
    │                       result=asdict(result),
    │                       user_id=user_id)
    │ 6. db.add(estimate); db.commit(); db.refresh(estimate)
    ▼
[Pydantic EstimateOutput response]    ────► [Browser: redirect to /estimates/:id]
                                                  │
                                                  ▼
                                          [EstimateResultPanel renders result]
                                          [Risk warning shown if result.risk_warning]
```

**Performance budget:** Steps 1–6 < 200ms on SQLite. Total round-trip including FE render < 1s ✓ meets constraint.

### Flow 2: "User opens historical estimate" (Cold Path)

```
[Browser: GET /estimates/:id route]
    │
    ▼
[GET /api/estimates/:id]   ────►   [routers/estimates.py::get_estimate]
                                       │
                                       ▼
                                   [services/estimate_service.py::get_by_id]
                                       │ SELECT * FROM estimates WHERE id = :id
                                       ▼
                                   [Estimate row returned]
                                       │ NO recomputation
                                       │ NO load of current weights.json
                                       ▼
                                   [Return row.result + row.inputs + row.weights_snapshot]
    ◄──────────────────────────────────┘
[EstimateResultPanel renders exactly what was stored]
```

**Key invariant:** This flow MUST NOT call `engine.calculate()`. The stored `result` is the source of truth for display. Recompute only as a verification utility (`POST /api/estimates/:id/verify` — not in v1 scope but a natural future endpoint).

### Flow 3: "Admin saves weights" (Config Write)

```
[Browser: Admin/WeightsEditor.tsx]
    │ user edits weight table, clicks "Speichern"
    ▼
[PUT /api/admin/weights with full WeightsConfig JSON]
    │
    ▼
[routers/admin.py::update_weights]
    │ Pydantic schema validates structure (all required keys present, numbers in range)
    ▼
[services/weights_service.py::save_weights(new_weights)]
    │ 1. acquire threading.Lock
    │ 2. write to ./config/weights.json.tmp
    │ 3. os.replace(tmp, final)        ◄── atomic
    │ 4. invalidate in-memory cache (_cache = new_weights; mtime = stat())
    │ 5. release lock
    ▼
[200 OK]
```

**Crucially, this does NOT touch existing estimates.** Every existing estimate already carries its own `weights_snapshot` and is unaffected. Only the next NEW estimate (or clone) will use the new weights.

### Flow 4: "Clone estimate"

```
[Browser: history list, click "Klonen" on row :id]
    │
    ▼
[POST /api/estimates/:id/clone]   ──►   [routers/estimates.py::clone_estimate]
                                            │
                                            ▼
                                        [services/estimate_service.py::clone]
                                            │ 1. source = db.get(Estimate, id)
                                            │ 2. ?? "fresh weights" vs "snapshot weights" ??
                                            │    DECISION: clone uses CURRENT weights.json
                                            │    (clone semantics = "start a new estimate
                                            │    pre-filled with these inputs", not
                                            │    "duplicate this row verbatim")
                                            │ 3. weights = weights_service.load_weights()
                                            │ 4. snapshot = deep_copy(weights)
                                            │ 5. result = engine.calculate(source.inputs, snapshot)
                                            │ 6. new_row = Estimate(name=source.name + " (Kopie)",
                                            │                       inputs=source.inputs,
                                            │                       weights_snapshot=snapshot,
                                            │                       result=asdict(result))
                                            │ 7. db.add(new_row); db.commit()
                                            ▼
                                        [Return new EstimateOutput]
    ◄───────────────────────────────────────┘
[Browser navigates to /estimates/:new_id]
```

**Defer to /gsd:plan-phase:** Should clone open the form pre-filled for editing (and only persist on save), or immediately persist a copy? The flow above shows "immediately persist". An equally valid model is "navigate to /estimates/new?clone_from=:id" with the form pre-filled and no DB write until the user clicks Berechnen. The latter is cleaner — recommend it. Either way, the source estimate is untouched (immutability preserved).

### Flow 5: "PDF export"

```
[Browser: EstimateResultPanel, click "Als PDF"]
    │
    ▼
[GET /api/estimates/:id/pdf]   ──►   [routers/pdf.py::download_pdf]
                                          │
                                          ▼
                                      [services/pdf_service.py::render]
                                          │ 1. estimate = db.get(Estimate, id)
                                          │ 2. html = jinja_env.get_template("estimate.html.j2")
                                          │           .render(estimate=estimate,
                                          │                   methodik=load_methodik(),
                                          │                   euro=estimate.result['pert']
                                          │                        * estimate.daily_rate_eur)
                                          │ 3. pdf_bytes = HTML(string=html, base_url=...)
                                          │           .write_pdf(stylesheets=[print.css])
                                          ▼
                                      [Return StreamingResponse(
                                              pdf_bytes,
                                              media_type='application/pdf',
                                              headers={'Content-Disposition':
                                                       f'attachment; filename="estimate_{id}.pdf"'})]
    ◄─────────────────────────────────────┘
[Browser triggers download]
```

**Performance budget:** WeasyPrint render typically 1–3s for a 5–8 page document. ✓ meets < 5s constraint. Cache nothing in v1 — single-user, infrequent operation.

### State Management (Frontend)

```
[Server State]                        [Client/UI State]
┌──────────────────────┐             ┌─────────────────────┐
│  TanStack Query      │             │  Zustand            │
│  ────────────        │             │  ────────────       │
│  - estimate list     │             │  - last-used        │
│  - estimate by id    │             │    "Erstellt von"   │
│  - weights (admin)   │             │  - history filter   │
│  - methodik (admin)  │             │    state            │
│                      │             │  - UI theme prefs   │
│  Cache key: ['/api/  │             │                     │
│   estimates']        │             │  Persisted to       │
│  Invalidate on POST/ │             │  localStorage       │
│  PUT/DELETE          │             │                     │
└──────────┬───────────┘             └──────────┬──────────┘
           │                                    │
           │   (no overlap — strict separation) │
           ▼                                    ▼
        ┌─────────────────────────────────────────┐
        │            React Components             │
        │  - useQuery() for server data           │
        │  - useStore() for client UI state       │
        │  - react-hook-form for form local state │
        └─────────────────────────────────────────┘
```

**Rule:** TanStack Query owns the cache of anything that came from `/api/*`. Zustand owns nothing that came from the server. Form state is owned by react-hook-form (with zod resolver) and is local to the form component.

---

## Build / Phase Ordering for Roadmap

### Recommended Phase Structure (Vertical Slice First, Then Layer)

Build a **paper-thin vertical slice** that proves the contract end-to-end, then add layers. This protects against the "perfect backend, no UI" or "beautiful UI, no engine" failure modes.

#### Phase 1 — Skeleton Slice (vertical, the spine)
**Goal:** User can enter ONE parameter group (just `pages` + `pages_complexity`) and see a number on screen.

- `docker-compose.yml` with two services, ports 3000 / 8000, both bind volumes
- `backend/`: FastAPI hello-world + one endpoint `POST /api/estimates` that returns `{"pt": pages * 1.5}` (no DB, no engine)
- `frontend/`: Vite + Tailwind shell, one form, one result display, calls `/api/estimates` through nginx proxy
- `frontend/Dockerfile` with multi-stage nginx serve
- Decision validated: reverse-proxy works; no CORS; same-origin
- **Deliverable:** `docker-compose up`, enter `pages=10, complexity=medium`, see "15 PT" rendered

**Why this first:** Proves the docker-compose topology, the nginx reverse proxy, the request/response contract, the deployment story. Everything else builds on this skeleton. Worst case to discover problems is now, not Phase 5.

#### Phase 2 — Real Engine + Real Schema (deepens the spine)
**Goal:** Full parameter table, all factors, real PERT calculation, all in memory (no DB yet).

- `backend/app/engine/calculator.py` — pure functions, full formula from PROJECT.md
- `backend/app/engine/phases.py` — phase distribution
- `backend/app/schemas/estimate.py` — complete Pydantic input/output
- `backend/app/config.py` — Pydantic Settings (env-driven config)
- `backend/app/seed/weights.default.json` — bundled defaults; loaded by `weights_service.load_weights` from `./config/weights.json` (seeded on first run)
- Full frontend form with react-hook-form + zod for all parameters, all factors, complexity dropdowns
- Result panel shows PERT (O / M / P / σ), phase distribution, risk warning
- Comprehensive engine unit tests (no DB needed — pure functions)
- **Deliverable:** Full estimation works end-to-end, no persistence. Refresh = lose everything.

#### Phase 3 — Persistence + History (adds DB layer)
**Goal:** Estimates survive page refresh; history page lists them.

- `backend/app/models/estimate.py` — full ORM model with `inputs`, `weights_snapshot`, `result`, `user_id` (nullable), `created_by`
- `backend/app/db/session.py` — SQLAlchemy engine reading `DATABASE_URL`, `./data/estimates.db` default
- `backend/app/db/init.py` — `create_all()` on startup (Alembic can be deferred to Phase 4+ if user wants PostgreSQL on day-1)
- Service layer: `create`, `get_by_id`, `list_paginated`, `delete`, `clone`
- Frontend: `EstimateList.tsx` (Verlauf), filters (project type), sort (date / name / PT), search (project name)
- "Klonen" navigates to form with `?clone_from=:id` query param
- **Deliverable:** Estimates persist, can be listed/filtered/deleted, can be re-opened (read-only) and cloned

**Critical test in this phase:** Save estimate → change `weights.json` directly on disk → re-open the estimate → result is UNCHANGED. This validates the snapshot pattern. Worth a dedicated test case in `tests/backend/test_estimate_service.py`.

#### Phase 4 — PDF Export (adds output layer)
**Goal:** Click button, get professional PDF.

- `backend/app/pdf/templates/estimate.html.j2` — full template (Deckblatt, Scope, Parameter, PERT-Tabelle, Phasen, Annahmen, Methodik)
- `backend/app/pdf/static/print.css` — `@page` rules, German typography, professional layout
- `backend/app/services/pdf_service.py` — renders Jinja2 template, runs WeasyPrint, returns bytes
- Backend Dockerfile: add WeasyPrint system dependencies (`libpango-1.0-0`, `libharfbuzz0b`, etc.)
- `routers/pdf.py::download_pdf` endpoint
- Frontend: "PDF herunterladen" button in `EstimateResultPanel`
- **Deliverable:** PDF that a consultant would hand to a client — typography clean, €-Ausweis included

**Why PDF after history:** PDF only matters once estimates are real and persisted. Building PDF before persistence forces awkward "generate from form state" code that gets thrown away.

#### Phase 5 — Admin UI (adds config write surface)
**Goal:** Edit weights / factors / methodik through the web, no SSH-into-container required.

- `backend/app/services/weights_service.py::save_weights` with atomic write + lock + cache invalidation
- `backend/app/routers/admin.py` — `GET /api/admin/weights`, `PUT /api/admin/weights`, `POST /api/admin/reset`, same for methodik
- Frontend route `/admin` with `WeightsEditor`, `FactorsEditor`, `MethodikEditor` (textarea)
- "Reset to defaults" button → copies `seed/weights.default.json` over `./config/weights.json`
- **Deliverable:** Full configurability via UI; the system can be tuned by a consultant without devops

**Why admin last:** Admin is the smallest user-value contributor (one user, one machine — they can `vi weights.json`). Maximum scope for procrastination. Belongs at the end where slipping it has minimum impact.

### Cross-cutting work (small, integrated into phases above, not their own phase)

- **Auth-readiness seam:** Land `user_id` nullable column + `get_current_user_optional()` stub in Phase 3 (when the model exists). Zero cost; pays off when auth ships.
- **Logging:** Standard `logging.config.dictConfig` setup in `app/main.py` from Phase 1; structured logs by Phase 4.
- **Error handling:** FastAPI exception handlers for validation errors → uniform JSON shape `{"error": "...", "details": [...]}` from Phase 2.
- **README:** Updated at end of each phase to reflect current capability.

---

## Service Topology

### Recommended: Two Containers, One Exposed Port

```yaml
# docker-compose.yml (sketch — Phase 1 ready)
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=sqlite:///./data/estimates.db
      - CONFIG_DIR=/app/config
      - DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    # NOTE: no `ports:` — backend not exposed to host
    expose:
      - "8000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 10s
      timeout: 3s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:80"     # ONLY exposed port
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

# No explicit `networks:` block — Docker Compose creates a default bridge
# network where services can resolve each other by name (backend, frontend).
# No volumes: block — using bind mounts (./data, ./config) only.
```

### Alternative Considered: Two Exposed Ports + CORS

```
Browser
  │  CORS preflight + actual request
  ├──► localhost:3000 (Vite dev / nginx serve frontend static)
  └──► localhost:8000 (FastAPI with CORSMiddleware allow_origins=['http://localhost:3000'])
```

**Why we reject this for v1:**
- Two URLs the user has to know about → confusing
- CORS preflight on every cross-origin request → ~50ms latency tax
- `allow_origins` must be configured per deployment (localhost vs deployed host)
- Production deployment would still want a reverse proxy → why build something we'll throw away?
- Backend port exposed to host = unnecessary attack surface

**When we'd choose two-port:** If the frontend needed to talk to ALSO another backend (e.g. a public API) that wasn't behind our proxy. Not the case here.

### Sidecar PDF Service?

**Considered:** Run WeasyPrint as a separate container (`pdf` service).

**Rejected for v1:**
- WeasyPrint is a Python library, not a service — there's no protocol or server, you'd have to wrap it in another FastAPI just to call it via HTTP
- PDF rendering is < 5s, infrequent (manual user action), and CPU-bound — no benefit from isolation
- Adds a third container, a third image, a third health check, more failure modes
- The system-dependency cost of WeasyPrint (cairo, pango, harfbuzz) goes into the backend image once and stays there

**When we'd reconsider:** If PDF rendering became a high-throughput operation (e.g. nightly batch reports) or if WeasyPrint started crashing in ways that needed isolation. Both unlikely.

---

## Frontend Architecture Decisions

| Concern | Recommendation | Rationale |
|---------|----------------|-----------|
| Routing | **React Router v6** | Stable, SPA-friendly, well-documented. TanStack Router is also excellent but introduces a learning surface this project doesn't need. |
| Client state | **Zustand** | Minimal boilerplate; only used for UI prefs (last "Erstellt von", filter state). Avoid for server data. |
| Server state | **TanStack Query (React Query) v5** | Cache, refetch, invalidation, optimistic updates — all the things rolling-your-own would mess up. |
| Form state | **react-hook-form + zod resolver** | Performant (no re-render on every keystroke), zod schemas can be shared with API contracts. |
| HTTP client | **Native `fetch` wrapped in `lib/api-client.ts`** | No axios needed; one wrapper handles JSON, errors, base URL (= `''` for same-origin). |
| Component library | **Tailwind primitives + headless components (Radix UI for menus/dropdowns/dialogs)** | Avoid heavy component libs (MUI) — they fight Tailwind. Build form primitives in `components/ui/`. |
| Number/date formatting | `Intl.NumberFormat('de-DE')`, `Intl.DateTimeFormat('de-DE')` | Native, no library, German locale built-in. |
| Testing | **Vitest + React Testing Library** | Same toolchain as Vite, fast. |

### Frontend Vertical Slice Convention

Every domain feature lives in `frontend/src/features/<domain>/` with:
- A `schema.ts` (zod) shared by form + API client
- An `api.ts` exporting TanStack Query hooks (`useEstimates`, `useCreateEstimate`)
- One or more `.tsx` components specific to the feature
- Co-located `.test.ts` files

Components in `components/` are pure presentational primitives with no domain knowledge.

---

## Config Strategy

### Environment Variables (`.env`)

```bash
# .env.example  (committed; user copies to .env)
DATABASE_URL=sqlite:///./data/estimates.db
CONFIG_DIR=/app/config
DATA_DIR=/app/data
LOG_LEVEL=INFO
```

- Loaded by Pydantic `Settings` in `backend/app/config.py`
- `docker-compose.yml` passes via `env_file: .env`
- Production cloud deployment overrides `DATABASE_URL` with PostgreSQL URI

### `weights.json` Hot-Reload Behaviour

- **Read path:** `weights_service.load_weights()` checks file mtime on every call. Cache hit if unchanged. Cost ≈ 100µs per request (acceptable).
- **Write path:** Admin UI writes through atomic rename + cache invalidation (see Pattern 4).
- **Editing on disk:** A user can directly edit `./config/weights.json` while the container is running. The next request will see the change (mtime changed) and reload. This is a feature, not a bug — it's the "I just want to edit the file" escape hatch.
- **Validation on read:** Bad JSON raises at startup or on first read after edit. Service returns 500 to admin UI; user fixes the file or `docker-compose restart backend`.
- **What about race between admin UI write and direct file edit?** Possible but harmless in single-user context: last writer wins. Documented in admin UI ("Bei direkten Datei-Edits Backend neustarten" — German).

### First-Run Seeding

On backend startup (`app/main.py`):
```python
@app.on_event("startup")
def seed_config_if_missing():
    config_dir = settings.config_dir
    seed_dir = Path(__file__).parent / "seed"
    for filename in ("weights.json", "methodik.txt"):
        target = config_dir / filename
        if not target.exists():
            shutil.copy(seed_dir / f"{filename.split('.')[0]}.default.{filename.split('.')[-1]}", target)
            log.info(f"Seeded {target} from defaults")
```

User can delete `./config/weights.json` and restart → defaults re-seeded. This IS the reset mechanism, exposed via UI as a button.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, local | Current architecture. SQLite + bind-mounted config. ✓ |
| 1 user, cloud-deployed (e.g. small VM) | Swap `DATABASE_URL` to managed Postgres; bind mounts become named volumes or cloud disks. **No code changes.** |
| 5–50 users (small team) | Add real auth (Pattern 5 seam activates). Backend already stateless — can run multiple replicas behind the nginx proxy. Sticky sessions not required. SQLite → Postgres mandatory (concurrent writes). |
| 50+ users | Move PDF generation to a job queue (Redis + RQ or Celery) — currently synchronous, would tie up workers. Consider splitting `engine/` out as a library if a separate service consumes it. |

### Scaling Priorities (Order of Things That Break)

1. **SQLite write contention** breaks first if multi-user (~5+ concurrent writes/sec). Mitigation: already planned via `DATABASE_URL` → PostgreSQL. No code change.
2. **PDF generation blocks workers** breaks next at sustained concurrent generation. Mitigation: async render via job queue. Currently synchronous fine for human-driven workflow.
3. **In-memory `weights.json` cache won't sync across multiple backend replicas** breaks at horizontal scale. Mitigation: short TTL (re-stat on every request — already implemented) makes propagation worst-case sub-second; or move weights to DB. Defer until needed.

---

## Anti-Patterns

### Anti-Pattern 1: "Smart Routers" (Business Logic in HTTP Handlers)

**What people do:** Put `calculate()`, DB queries, and weight loading directly in the router function so "everything is in one place".

**Why it's wrong:**
- Untestable without spinning up HTTP
- Mixes HTTP concerns (status codes, headers) with domain concerns (estimation math)
- Refactoring the URL changes the business logic

**Do this instead:** Router parses input → calls service → returns DTO. Three lines after Pydantic validation. All meat in `services/` and `engine/`.

### Anti-Pattern 2: "Engine That Knows About SQLAlchemy"

**What people do:** Pass `Estimate` ORM objects into `engine.calculate()` to "avoid duplication".

**Why it's wrong:**
- Couples the pure math layer to the DB schema
- Lazy-loading relationships fires queries during calculation = unpredictable performance
- ORM objects mutate; engine assumes immutability → bugs

**Do this instead:** Engine takes plain dataclasses or dicts. Service layer marshals: `EstimateInputs(**ormobj.inputs)`.

### Anti-Pattern 3: "Recompute Historical Estimates From Current Weights"

**What people do:** When opening a historical estimate, re-run `engine.calculate(inputs, current_weights)` to "always show fresh numbers".

**Why it's wrong:**
- Violates the core reproducibility requirement
- Past estimates silently change when admin tweaks weights
- Audit trail destroyed

**Do this instead:** Stored estimates display from their `result` column. Recompute from `weights_snapshot` only as an explicit verification operation.

### Anti-Pattern 4: "Weights in the DB Instead of a File"

**What people do:** Put weights in a `weights` table with a `version` column, write Alembic migrations to evolve them.

**Why it's wrong:**
- Loses the "diff-able / git-trackable / human-editable" property of `weights.json`
- Reset and import/export become DB operations instead of file operations
- Snapshot-per-estimate still required → DB versioning is redundant complexity

**Do this instead:** Keep weights as `./config/weights.json`. Snapshot into each estimate row at write time. The Pydantic schema for `WeightsConfig` is the validation source of truth.

### Anti-Pattern 5: "CORS Everything" with Two Exposed Ports

**What people do:** Set `allow_origins=["*"]` in FastAPI CORS middleware to "make development easier".

**Why it's wrong:**
- Production security hole
- Confusing dual-port deployment
- Preflight latency on every API call

**Do this instead:** Reverse-proxy via nginx (Pattern 1). FastAPI never sees a cross-origin request from the SPA. No CORSMiddleware needed at all.

### Anti-Pattern 6: "Read weights.json Per Request, No Cache"

**What people do:** Open and parse the file on every call to `load_weights()` to "always be fresh".

**Why it's wrong:**
- Disk I/O on every request = unnecessary latency
- File system errors become request errors

**Do this instead:** In-memory cache with `os.stat().st_mtime` invalidation (Pattern 4). One `stat()` syscall (≈ µs), parse only on change.

---

## Integration Points

### External Services

| Service | Integration | Notes |
|---------|-------------|-------|
| (none) | — | v1 has no external service integrations by constraint. No analytics, no auth provider, no cloud storage. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Browser ↔ `frontend` nginx | HTTPS/HTTP (port 3000) | Same-origin for both static and `/api/*` |
| `frontend` nginx ↔ `backend` uvicorn | HTTP (port 8000, container network only) | Service name `backend` resolves via Docker DNS |
| `backend` ↔ SQLite | File path (`./data/estimates.db` bind-mounted) | Single-file DB, no separate DB container in v1 |
| `backend` ↔ config files | File path (`./config/*` bind-mounted) | Atomic-rename writes, mtime-based cache |
| `routers/` ↔ `services/` | Direct function call | FastAPI dependency injection wires sessions |
| `services/` ↔ `engine/` | Direct function call with plain dataclasses | One-way — engine never imports services |
| `services/` ↔ `models/` | SQLAlchemy ORM via `Session` dependency | Session per request |

---

## Decisions Deferred to /gsd:plan-phase

1. **Alembic vs `create_all()` from Phase 3 or Phase 4** — `create_all()` is fine for SQLite in development; Alembic is required before going to PostgreSQL. If PostgreSQL is wanted on day-1 in cloud, Alembic moves to Phase 3. Default: introduce Alembic in Phase 3 anyway (cheap insurance).
2. **Clone semantics: persist immediately vs. pre-fill form** — Recommended: pre-fill form (no DB write until user clicks Berechnen). Defer concrete UX choice to Phase 3 planning.
3. **Exact `weights.json` schema** — Structure (factor names, levels, project type keys) should be derived from PROJECT.md's formula and the admin UI mockup. Locking down the JSON shape is a Phase 2 task once factors are concrete.
4. **Frontend route map** — Sketched here (`/`, `/estimates`, `/estimates/:id`, `/estimates/new`, `/admin`) but final IA (information architecture) lives in Phase 1's UI design step.
5. **Logging / observability detail level** — Beyond standard request logging, defer. No metrics endpoint in v1 (single-user).
6. **Error display in German UI** — Centralised error toast vs inline form errors vs both. Defer to Phase 2 (when forms are real).
7. **Pagination shape** — cursor vs offset for `/api/estimates`. For single-user history < 10k rows, offset is fine; revisit at Phase 3 planning.
8. **PDF font choice and licensing** — German business documents conventionally use serif (e.g. PT Serif, Source Serif Pro) for body, sans (Inter, Roboto) for tables. Defer to Phase 4 design step; licence must permit redistribution in Docker image.

---

## Sources

- [zhanymkanov/fastapi-best-practices (GitHub)](https://github.com/zhanymkanov/fastapi-best-practices) — Layered router/service/repository pattern
- [FastAPI Project Structure: Production Guide 2026 (zestminds)](https://www.zestminds.com/blog/fastapi-project-structure/) — Module organization conventions
- [Production-Ready FastAPI Project Structure (2026 Guide)](https://dev.to/thesius_code_7a136ae718b7/production-ready-fastapi-project-structure-2026-guide-b1g)
- [Beginner's Guide for Containerizing FastAPI + React with NGINX (Medium)](https://vardhmanandroid2015.medium.com/beginners-guide-for-containerizing-application-deploying-a-full-stack-fastapi-and-react-app-001f2cac08a8) — Reverse-proxy topology
- [Serving Vite.js React with FastAPI via Docker (GitHub Discussion)](https://github.com/fastapi/fastapi/discussions/5134)
- [Why Vite dev server needs a proxy (and production doesn't)](https://blog.shukebeta.com/2026/05/06/why-vite-dev-server-needs-a-proxy-and-production-doesnt) — Confirms dev-proxy + prod-nginx parity strategy
- [Vite Server Options — proxy config](https://vite.dev/config/server-options)
- [Mutation Tracking — SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/mutable.html) — JSON column tradeoffs
- [Beware of JSON fields in SQLAlchemy (Adrià Mercader)](https://amercader.net/blog/beware-of-json-fields-in-sqlalchemy/) — Pitfalls; informs decision to treat snapshot as write-once
- [Installing WeasyPrint — Debian deps](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html)
- [WeasyPrint install instructions for Alpine Linux (Issue #699)](https://github.com/Kozea/WeasyPrint/issues/699)
- [Safe atomic file writes for JSON in Python 3 (Gist)](https://gist.github.com/therightstuff/cbdcbef4010c20acc70d2175a91a321f) — Pattern 4 source
- [Building an Enterprise-Level React App (TanStack Router, Zustand, Tailwind, Shadcn)](https://onebyzero.substack.com/p/building-an-enterprise-level-react-app) — FE structure
- [The Ultimate React Tech Stack: TypeScript, Tailwind, Zustand, React Query (Medium)](https://medium.com/@dewantanjilhossain/the-ultimate-react-tech-stack-typescript-tailwind-zustand-and-react-query-5e475819bd96) — State separation rule
- [Multi-Tenant Architecture with FastAPI (Medium)](https://medium.com/@koushiksathish3/multi-tenant-architecture-with-fastapi-design-patterns-and-pitfalls-aa3f9e75bf8c) — Auth-readiness patterns
- [Define and manage volumes in Docker Compose](https://docs.docker.com/reference/compose-file/volumes/)
- [Bind mounts | Docker Docs](https://docs.docker.com/engine/storage/bind-mounts/)
- [3 - Vertical Slice (Outside-In Frontend Development)](https://outsidein.dev/react/vertical-slice/) — Build-order rationale

---
*Architecture research for: Software Estimation Manager (PT estimation web app)*
*Researched: 2026-05-16*
