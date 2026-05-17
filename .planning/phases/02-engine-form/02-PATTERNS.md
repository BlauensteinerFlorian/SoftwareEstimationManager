# Phase 02: Engine & Form — Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 47 new or modified files
**Analogs found:** 21 / 47

> Phase 1 shipped a deliberately throwaway walking skeleton: a 2-file backend router stack, a 1-helper API client, a bare-Tailwind form, a barebones result panel, root-mount + single `App.tsx`. Phase 2 keeps the **topology** (router URLs, `/api/` prefix, relative-fetch convention, sub-package layout) but replaces nearly every file body. The analog pool is therefore narrow — many Phase-2 files (engine, hypothesis tests, shadcn primitives, scope template) have **no analog** in-repo and must lean on `02-RESEARCH.md` Patterns §1–§18. The table below makes that split explicit so the planner knows when to copy from Phase 1 vs. when to copy from RESEARCH.md.

---

## File Classification

### Backend (new + modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/app/main.py` (MODIFY: add lifespan) | config | event-driven | `backend/app/main.py` (Phase 1 self-analog) | exact (extend self) |
| `backend/app/routers/estimates.py` (REPLACE body) | controller | request-response | `backend/app/routers/estimates.py` (Phase 1 skeleton) | exact (extend self) |
| `backend/app/routers/health.py` (UNCHANGED — stable healthcheck contract) | controller | request-response | self | n/a — no change |
| `backend/app/schemas/estimate.py` (REPLACE) | model | transform | `backend/app/schemas/estimate.py` (Phase 1 skeleton) | role-match (Pydantic shape only) |
| `backend/app/engine/__init__.py` | utility | transform | no analog | RESEARCH.md §2 |
| `backend/app/engine/core.py` | service (pure) | transform | no analog | RESEARCH.md §2 |
| `backend/app/engine/types.py` | model | transform | `backend/app/schemas/estimate.py` (Pydantic-shape only) | role-match |
| `backend/app/engine/scope.py` | service (pure) | transform | no analog | RESEARCH.md §6 |
| `backend/app/services/__init__.py` | utility | n/a | `backend/app/routers/__init__.py` (empty marker) | exact |
| `backend/app/services/weights_loader.py` | service | file-I/O | no analog | RESEARCH.md §7 |
| `backend/app/data/weights.default.json` | config | n/a | no analog | RESEARCH.md §9 |
| `backend/app/templates/scope_text.de.j2` | template | transform | no analog | RESEARCH.md §6 |
| `backend/pyproject.toml` (MODIFY: deps + linter + wheel-include) | config | n/a | `backend/pyproject.toml` (Phase 1 self-analog) | exact (extend self) |
| `backend/Dockerfile` (UNCHANGED — `COPY app /app/app` already covers new dirs) | config | n/a | self | n/a |
| `backend/tests/__init__.py` | test | n/a | no analog | greenfield |
| `backend/tests/conftest.py` | test | n/a | no analog | RESEARCH.md §4 (fixtures) |
| `backend/tests/fixtures/snapshot_default.json` | fixture | n/a | no analog | mirrors `weights.default.json` |
| `backend/tests/fixtures/inputs_typical.json` | fixture | n/a | no analog | greenfield |
| `backend/tests/fixtures/golden_estimates.json` | fixture | n/a | no analog | greenfield |
| `backend/tests/engine/__init__.py` | test | n/a | no analog | greenfield |
| `backend/tests/engine/test_determinism.py` | test | transform | no analog | RESEARCH.md §4 |
| `backend/tests/engine/test_decimal_drift.py` | test | transform | no analog | RESEARCH.md §5 |
| `backend/tests/engine/test_pert.py` | test | transform | no analog | RESEARCH.md §4 |
| `backend/tests/engine/test_confidence.py` | test | transform | no analog | RESEARCH.md §4 |
| `backend/tests/engine/test_phases.py` | test | transform | no analog | RESEARCH.md §4 |
| `backend/tests/api/__init__.py` | test | n/a | no analog | greenfield |
| `backend/tests/api/test_decimal_serialization.py` | test | request-response | no analog | RESEARCH.md §1 |
| `backend/tests/services/__init__.py` | test | n/a | no analog | greenfield |
| `backend/tests/services/test_weights_loader.py` | test | file-I/O | no analog | RESEARCH.md §7 |

### Frontend (new + modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/components.json` | config | n/a | no analog | RESEARCH.md §10 (CLI-generated) |
| `frontend/tsconfig.json` (MODIFY: add `@/*` paths) | config | n/a | `frontend/tsconfig.json` (Phase 1 self-analog) | exact (extend self) |
| `frontend/tsconfig.app.json` (MODIFY: add `@/*` paths) | config | n/a | `frontend/tsconfig.app.json` (Phase 1 self-analog) | exact (extend self) |
| `frontend/vite.config.ts` (MODIFY: add `resolve.alias["@"]`) | config | n/a | `frontend/vite.config.ts` (Phase 1 self-analog) | exact (extend self) |
| `frontend/vitest.config.ts` | config | n/a | `frontend/vite.config.ts` (extends it) | role-match |
| `frontend/package.json` (MODIFY: add deps) | config | n/a | `frontend/package.json` (Phase 1 self-analog) | exact (extend self) |
| `frontend/src/main.tsx` (REPLACE: + Router + QueryClient) | provider/route | n/a | `frontend/src/main.tsx` (Phase 1 self-analog) | exact (extend self) |
| `frontend/src/App.tsx` (DELETE or REPLACE with layout) | component | n/a | `frontend/src/App.tsx` (Phase 1 self-analog) | exact (extend self) |
| `frontend/src/index.css` (MODIFY: shadcn vars + `--warning`) | config | n/a | `frontend/src/index.css` (Phase 1 self-analog) | exact (extend self) |
| `frontend/src/lib/utils.ts` | utility | n/a | no analog | shadcn-CLI generated |
| `frontend/src/lib/format.ts` | utility | transform | no analog | RESEARCH.md §15 |
| `frontend/src/lib/format.test.ts` | test | transform | no analog | greenfield |
| `frontend/src/api/client.ts` (MODIFY or DELETE) | service | request-response | `frontend/src/api/client.ts` (Phase 1 self-analog) | exact (extend self) |
| `frontend/src/api/estimate.ts` | service | request-response | `frontend/src/api/client.ts` (Phase 1 fetch wrapper) | exact (extend pattern) |
| `frontend/src/components/EstimateForm.tsx` (DELETE) | — | — | — | replaced by features/ page |
| `frontend/src/components/ResultPanel.tsx` (DELETE) | — | — | — | replaced by features/ page |
| `frontend/src/components/ui/card.tsx` … `popover.tsx` (10 files) | component | n/a | no analog | shadcn-CLI generated, RESEARCH.md §10 |
| `frontend/src/features/estimate/schema.ts` | model | transform | no analog | RESEARCH.md §11 (mirrors backend Pydantic) |
| `frontend/src/features/estimate/schema.test.ts` | test | transform | no analog | greenfield |
| `frontend/src/features/estimate/EstimateFormPage.tsx` | component (page) | request-response | `frontend/src/components/EstimateForm.tsx` (Phase 1 skeleton form) | role-match (same intent, total rewrite) |
| `frontend/src/features/estimate/ResultDashboardPage.tsx` | component (page) | transform | `frontend/src/components/ResultPanel.tsx` (Phase 1 skeleton result) | role-match (same intent, total rewrite) |
| `frontend/src/features/estimate/CharCounter.tsx` | component | transform | no analog | RESEARCH.md §17 |
| `frontend/src/features/estimate/anti-anchoring.test.tsx` | test | n/a | no analog | RESEARCH.md §12 |

---

## Pattern Assignments

### Backend

---

#### `backend/app/main.py` (config — event-driven lifespan)

**Analog:** `backend/app/main.py` (Phase 1 self — extend, don't rewrite)

**Phase-1 baseline** (`backend/app/main.py:1-28` — the whole file):
```python
import logging
import os
from fastapi import FastAPI

from app import __version__
from app.routers import estimates, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/estimates.db")
log.info("Starting backend v%s — DATABASE_URL=%s (unused in Phase 1)", __version__, DATABASE_URL)

app = FastAPI(
    title="Estimation Manager — Backend",
    version=__version__,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(estimates.router, prefix="/api", tags=["estimates"])
```

**What to keep:** logging config, `DATABASE_URL` log line (still phase-3 territory), `FastAPI(...)` constructor args, the two `include_router` calls, the "NO CORS middleware" comment.

**What to add (RESEARCH.md §8 — lifespan handler):**
```python
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

BUNDLED_DEFAULTS = Path(__file__).parent / "data" / "weights.default.json"

@asynccontextmanager
async def lifespan(app: FastAPI):
    config_dir = Path(os.getenv("CONFIG_DIR", "./config"))
    config_dir.mkdir(parents=True, exist_ok=True)
    target = config_dir / "weights.json"
    if not target.exists():
        if not BUNDLED_DEFAULTS.exists():
            raise RuntimeError(f"Missing bundled defaults: {BUNDLED_DEFAULTS}")
        shutil.copyfile(BUNDLED_DEFAULTS, target)
        log.info("Seeded %s from bundled defaults.", target)
    else:
        log.info("Using existing %s — no seeding needed.", target)
    yield

app = FastAPI(
    title="Estimation Manager — Backend",
    version=__version__,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,     # NEW
)
```

**What differs from Phase 1:** add `lifespan` kwarg; add `CONFIG_DIR` env-read; add `shutil.copyfile` seed. Phase-1 router-mounting code stays unchanged.

---

#### `backend/app/routers/estimates.py` (controller — request-response, REPLACE body)

**Analog:** `backend/app/routers/estimates.py` (Phase 1 self — same URL contract; new body)

**Phase-1 baseline** (`backend/app/routers/estimates.py:1-23`):
```python
from fastapi import APIRouter
from app.schemas.estimate import EstimateRequest, EstimateResponse

router = APIRouter()

_SKELETON_MULTIPLIER: dict[str, float] = {
    "low": 1.0, "medium": 1.5, "high": 2.5, "very_high": 4.0,
}

@router.post("/estimates", response_model=EstimateResponse)
def create_estimate(req: EstimateRequest) -> EstimateResponse:
    multiplier = _SKELETON_MULTIPLIER[req.complexity]
    pt = req.pages * multiplier
    return EstimateResponse(pt=pt)
```

**What to keep:** `APIRouter()`, the `@router.post("/estimates", response_model=...)` decorator shape, the function-style handler (no class controllers), the `req:` Pydantic-body parameter style. Path `"/estimates"` is **frozen** (D-02 from Phase 1 — URL stable).

**What to replace (RESEARCH.md §7):**
```python
import os
from pathlib import Path
from fastapi import APIRouter, Depends

from app.engine import calculate, generate_scope_text, EstimateInputs
from app.schemas.estimate import EstimateResultResponse
from app.services.weights_loader import WeightsLoader

router = APIRouter()

_CONFIG_PATH = Path(os.getenv("CONFIG_DIR", "./config")) / "weights.json"
_loader = WeightsLoader(_CONFIG_PATH)

def get_weights_loader() -> WeightsLoader:
    return _loader

@router.post("/estimates", response_model=EstimateResultResponse)
def create_estimate(
    payload: EstimateInputs,
    loader: WeightsLoader = Depends(get_weights_loader),
) -> EstimateResultResponse:
    snapshot = loader.load()                    # CONTEXT.md D-07 fresh per request
    result = calculate(payload, snapshot)       # CONTEXT.md D-Discretion engine purity
    scope_text = generate_scope_text(payload, result, snapshot)
    return EstimateResultResponse(
        result=result,
        snapshot=snapshot,                      # REPRO-01 — snapshot back to client
        scope_text=scope_text,
    )
```

**What differs:** drop the hardcoded lookup map; drop Phase-1 `EstimateRequest`/`EstimateResponse` import in favor of `EstimateInputs`/`EstimateResultResponse`; introduce FastAPI `Depends` injection for `WeightsLoader`; route call chain becomes `load → calculate → generate_scope_text → wrap-response`.

---

#### `backend/app/routers/health.py` (UNCHANGED — analog, do not modify)

**Analog:** itself. Phase-1 D-06 froze the payload contract. Phase 2 must not touch the response shape — `docker-compose` healthcheck binds to HTTP-200, but additional fields are out of Phase-2 scope (CONTEXT.md `<code_context>` integration-point note).

For reference (`backend/app/routers/health.py:10-17`):
```python
@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "version": __version__,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
```

The `APIRouter()` + module-level singleton pattern (lines 1-7) is what `estimates.py` re-uses; it is the **canonical router shape** in this codebase.

---

#### `backend/app/schemas/estimate.py` (model — REPLACE body)

**Analog:** `backend/app/schemas/estimate.py` (Phase 1 self — same role; total schema swap)

**Phase-1 baseline** (`backend/app/schemas/estimate.py:1-16`):
```python
from typing import Literal
from pydantic import BaseModel, Field

Complexity = Literal["low", "medium", "high", "very_high"]

class EstimateRequest(BaseModel):
    pages: int = Field(ge=0, le=10_000, description="...")
    complexity: Complexity = Field(description="...")

class EstimateResponse(BaseModel):
    pt: float = Field(description="...")
```

**What to keep:** the `Literal[...]` alias style, the `Field(ge=…, le=…, description="…")` constraint pattern, the file-per-aggregate convention (`schemas/estimate.py`), the German docstrings.

**What to replace (per CONTEXT.md `<code_context>` "Wird in Phase 2 vollständig umgebaut" and RESEARCH.md §1, §9):**

This file now becomes a **thin re-export + response wrapper** because the substantive Pydantic models live in `engine/types.py` (TECH-01 layer-isolation — controllers/routers reach into `engine.types` for the in/out contracts):

```python
# Source: CONTEXT.md D-Discretion §Pydantic-Schema-Struktur (Engine-Input/-Output are SEPARATE DTOs)
from pydantic import BaseModel
from app.engine.types import EstimateInputs, EstimateResult, WeightsSnapshot

# Re-export for backwards-compatible imports from routers.
__all__ = ["EstimateInputs", "EstimateResult", "WeightsSnapshot", "EstimateResultResponse"]

class EstimateResultResponse(BaseModel):
    """Wraps the engine result + the snapshot used + the German scope text.
    REPRO-01: full snapshot returned to client (basis for Phase-3 persistence)."""
    result: EstimateResult
    snapshot: WeightsSnapshot
    scope_text: str
```

**What differs:** no more `EstimateRequest`/`EstimateResponse` (deleted); skeleton `pt: float` is replaced by Decimal-typed `EstimateResult` (lives in `engine/types.py`); response is wrapped to include `snapshot` + `scope_text`.

---

#### `backend/app/engine/__init__.py` (utility — public surface)

**Analog:** no analog in repo. Copy verbatim from RESEARCH.md §2 (lines 280-300):
```python
from app.engine.core import calculate
from app.engine.types import (
    EstimateInputs, EstimateResult, WeightsSnapshot, MoneyDecimal, PTDecimal,
)
from app.engine.scope import generate_scope_text

__all__ = [
    "calculate", "generate_scope_text",
    "EstimateInputs", "EstimateResult", "WeightsSnapshot",
    "MoneyDecimal", "PTDecimal",
]
```

**Why no analog:** `backend/app/routers/__init__.py` and `backend/app/schemas/__init__.py` are both **empty** Phase-1 marker files. `engine/__init__.py` is the first non-empty package marker, and its job (explicit public surface) is unique.

---

#### `backend/app/engine/core.py` (service — pure transform)

**Analog:** no analog. Use RESEARCH.md §2 + REQUIREMENTS.md CALC-02..07.

**Purity contract (RESEARCH.md §2 lines 302-313 + Pitfall §R-7):**
- No I/O, no globals, no `load_weights()`, no `datetime.now()`
- Decimal end-to-end
- **ZERO `.quantize()` calls** anywhere in this file
- Identical `(inputs, snapshot)` → identical `EstimateResult` (verifiable via Hypothesis, RESEARCH.md §4)

Function signature lock:
```python
def calculate(inputs: EstimateInputs, snapshot: WeightsSnapshot) -> EstimateResult:
```

**Closest in-repo "pure function" parallel:** `backend/app/routers/estimates.py` (Phase 1) lines 19-23 — already used a tiny `pages * multiplier` pure expression. The shape "lookup factor in dict → multiply → return" is the kernel pattern that scales up here, but the analog ends at "no I/O, just math on Decimals".

---

#### `backend/app/engine/types.py` (model — Decimal-aware Pydantic)

**Analog:** `backend/app/schemas/estimate.py` (Phase 1) — Pydantic shape only.

**Phase-1 baseline patterns to keep** (from `schemas/estimate.py:5-11`):
- `Complexity = Literal[...]` alias above the models
- `class … (BaseModel):` body with `field: Type = Field(...)`
- German `description=` strings

**What to add (RESEARCH.md §1 lines 208-243 + §9 lines 762-818):**
```python
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

_PT_QUANTUM = Decimal("0.1")
_MONEY_QUANTUM = Decimal("0.01")

MoneyDecimal = Annotated[Decimal, Field(max_digits=18, decimal_places=10)]
PTDecimal = Annotated[Decimal, Field(max_digits=18, decimal_places=10)]

Complexity = Literal["low", "medium", "high", "very_high"]
Stufe = Literal["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]
ProjectType = Literal["neuentwicklung", "erweiterung", "migration", "legacy_migration"]
UserBand = Literal["<50", "50-200", "201-1000", "1001-10000", ">10000"]

class EstimateResult(BaseModel):
    pert_pt: PTDecimal
    p50_pt: PTDecimal
    # ... etc

    @field_serializer("pert_pt", "p50_pt", "p80_pt", "p90_pt", "sigma_pt", when_used="json")
    def _ser_pt(self, v: Decimal) -> str:
        return str(v.quantize(_PT_QUANTUM, rounding=ROUND_HALF_UP))

    @field_serializer("total_eur", when_used="json")
    def _ser_money(self, v: Decimal) -> str:
        return str(v.quantize(_MONEY_QUANTUM, rounding=ROUND_HALF_UP))

class WeightsSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)
    # ... per RESEARCH.md §9 lines 799-817 (BaseWeights, PhaseDistribution incl. _phase_sum_100 validator)
```

**What differs from Phase-1 analog:** `Complexity` literal stays; `pt: float` is **gone forever** (replaced by `PTDecimal`); `@field_serializer(when_used="json")` is the new convention; `ConfigDict(frozen=True)` on snapshot types makes them hashable for `lru_cache` in Phase 5.

---

#### `backend/app/engine/scope.py` (service — pure Jinja2 wrapper)

**Analog:** no analog. Copy from RESEARCH.md §6 lines 554-581 verbatim.

Critical structural notes (already in RESEARCH.md §6):
- `@lru_cache(maxsize=1)` on `_env()` keeps the `Environment` a singleton without breaking purity (function output is deterministic given fixed args)
- `autoescape=select_autoescape(disabled_extensions=("j2",), default_for_string=False)` — Phase 2 generates **plain text**, not HTML. Phase 4 will reuse the same Environment with `autoescape=True` for HTML→PDF.
- `PackageLoader("app", "templates")` resolves `backend/app/templates/scope_text.de.j2` — must survive hatchling wheel-packaging (Pitfall §R-8).

---

#### `backend/app/services/__init__.py` (utility — empty marker)

**Analog:** `backend/app/routers/__init__.py` (Phase 1 file at `backend/app/routers/__init__.py:1` — empty file).

**Pattern to copy:** literally an empty file. Phase-1 already established the "empty `__init__.py` for sub-packages with explicit module imports" convention. The same applies to the new `backend/app/services/__init__.py` and `backend/app/engine/__init__.py` (except engine has explicit exports per Pattern §2).

---

#### `backend/app/services/weights_loader.py` (service — file-I/O)

**Analog:** no analog. Copy from RESEARCH.md §7 lines 626-646.

Key invariants:
- Class with `__init__(self, config_path: Path)` and `load() -> WeightsSnapshot` — Phase 5 extends with `_cached`/`_mtime` fields and an invalidation method; the Phase-2 surface stays.
- Uses `WeightsSnapshot.model_validate_json(raw)` (not `parse_obj`/`model_validate`) so Decimal-as-string-in-JSON goes through Pydantic v2's JSON parser without float coercion.
- Raises `FileNotFoundError` / `pydantic.ValidationError` — caller (FastAPI handler) lets these bubble to 500 in Phase 2 (no try/catch).

**Imports to copy (Phase-1 convention):** `from app.engine.types import WeightsSnapshot` (sub-package-relative path, matching `from app.schemas.estimate import …` in Phase-1 `routers/estimates.py:4`).

---

#### `backend/app/data/weights.default.json` (config — bundled JSON defaults)

**Analog:** no analog. Use exact JSON schema from RESEARCH.md §9 lines 821-848 (already-canonical default values).

**Format rules locked by Pydantic schema (RESEARCH.md §9):**
- All Decimal fields stored as **strings** (`"0.85"`, not `0.85`) — prevents JSON-number coercion to float (Pitfall #2)
- `schema_version: 1` field at top (Pitfall #3 forward-compat)
- `phase_distribution` sum **must equal `1.00` exactly** — validated at load time by `_phase_sum_100` (Pattern §9)

**Wheel packaging:** must be globbed into the wheel via `pyproject.toml` (see next file).

---

#### `backend/app/templates/scope_text.de.j2` (template — German Jinja2 scope text)

**Analog:** no analog. Skeleton in RESEARCH.md §6 lines 586-611.

**Locked German copy:** risk-banner sentences MUST exactly match UI-SPEC.md §"Risk banner copy":
```
Faktor {Faktor-Anzeigename} ist auf "{Stufen-Label}" eingestellt (Multiplikator ×{Wert mit Komma}).
```
This is the dual-surface contract from CONTEXT.md D-04 — same string appears in the UI Alert and in this template, so Phase-4 PDF inherits it for free.

---

#### `backend/pyproject.toml` (config — add deps + linter + wheel-include)

**Analog:** `backend/pyproject.toml` (Phase 1 self).

**Phase-1 baseline** (`backend/pyproject.toml:1-17`):
```toml
[project]
name = "estimation-manager-backend"
version = "0.1.0"
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi[standard]>=0.136,<0.137",
  "uvicorn[standard]>=0.47",
  "pydantic>=2.13,<3.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app"]
```

**Patterns to keep:** version-pin floor/ceiling style (`>=0.136,<0.137`), `fastapi[standard]` (already pulls Jinja2 + python-multipart), hatchling build backend, the `[tool.hatch.build.targets.wheel]` block.

**What to add:**
1. New runtime dep — none (Jinja2 already pulled by `fastapi[standard]`, confirmed in CLAUDE.md §Core Tech and RESEARCH.md "Backend additions" line 125).
2. New dev deps (RESEARCH.md lines 124-130):
   ```toml
   [project.optional-dependencies]
   dev = [
     "pytest>=8.0,<9.0",
     "pytest-asyncio",
     "hypothesis>=6.0,<7.0",
     "import-linter>=2.0,<3.0",
     "ruff",
   ]
   ```
3. **Wheel-include for non-Python data** (Pitfall §R-8) — extend the existing block:
   ```toml
   [tool.hatch.build.targets.wheel]
   packages = ["app"]
   include = ["app/data/*.json", "app/templates/*.j2"]
   ```
4. **import-linter contract** (RESEARCH.md §3, Pitfall §R-4):
   ```toml
   [tool.importlinter]
   root_package = "app"

   [[tool.importlinter.contracts]]
   name = "engine layer isolation"
   type = "forbidden"
   source_modules = ["app.engine"]
   forbidden_modules = ["app.routers", "app.services", "app.schemas", "fastapi", "sqlalchemy"]
   ```
   (allow pydantic, jinja2, decimal, typing, pathlib per Pitfall §R-4)

---

#### `backend/Dockerfile` (UNCHANGED)

**Analog:** itself. `COPY app /app/app` (lines 14-15) already drags in the new `app/data/` and `app/templates/` directories. No Docker change needed for Phase 2 if the wheel-include glob is set per above.

---

#### Backend tests (`backend/tests/**`)

**Analog:** no analog (Phase 1 explicitly skipped tests per CONTEXT.md `<deferred>` and Phase-1 CONTEXT.md D-Discretion §"Tooling-Tiefe in Phase 1").

**Patterns to copy from RESEARCH.md:**

| File | Source pattern | Notes |
|------|---------------|-------|
| `tests/conftest.py` | RESEARCH.md §4 lines 396-409 ("A fixed valid snapshot used in property tests") | Pytest fixtures loading `tests/fixtures/snapshot_default.json` into a `WeightsSnapshot` once per session |
| `tests/fixtures/snapshot_default.json` | RESEARCH.md §9 lines 821-848 | Mirror of `backend/app/data/weights.default.json` (or symlink it — planner decides) |
| `tests/fixtures/inputs_typical.json` | greenfield | One representative `EstimateInputs` payload as JSON |
| `tests/fixtures/golden_estimates.json` | CONTEXT.md D-Discretion §Engine-Test-Strategie (3) | 5 hand-rolled `(inputs, expected_result)` cases — the "known good" suite |
| `tests/engine/test_determinism.py` | RESEARCH.md §4 | Hypothesis property test: `calculate(i, snap) == calculate(i, snap)` over 1000+ generated inputs |
| `tests/engine/test_decimal_drift.py` | RESEARCH.md §5 lines 498-547 | 7-fold factor multiplication, assert Decimal path is stable while a float-baseline drifts |
| `tests/engine/test_pert.py` / `test_confidence.py` / `test_phases.py` | RESEARCH.md §4 + REQUIREMENTS.md CALC-02..05 | Golden-case assertions per REQUIREMENTS.md formula contracts |
| `tests/api/test_decimal_serialization.py` | RESEARCH.md §1 (line 246) | `TestClient` POSTs to `/api/estimates`, asserts response body's PT fields are **JSON strings** with 1 decimal place and total_eur with 2 |
| `tests/services/test_weights_loader.py` | RESEARCH.md §7 + Pitfall §R-9 | Reads valid JSON → returns `WeightsSnapshot`; reads broken sum-≠-1.00 JSON → raises `ValidationError` |

**FastAPI test-client convention to use:** `from fastapi.testclient import TestClient` — already in `fastapi[standard]`. CLAUDE.md §Supporting Libraries — Backend ("Use FastAPI's `TestClient` (built on httpx) for backend tests") locks this.

---

### Frontend

---

#### `frontend/components.json` (config — shadcn-CLI generated)

**Analog:** no analog. Generated by `pnpm dlx shadcn@latest init --base-color slate --style new-york --css-variables --yes` per RESEARCH.md §10 step 3. UI-SPEC.md §"Design System" locks the flags.

**Note:** This file is committed but written by the CLI — do not hand-edit before init.

---

#### `frontend/tsconfig.json` + `frontend/tsconfig.app.json` (config — add `@/*` paths)

**Analog:** themselves (Phase 1 self).

**Phase-1 baseline** (`tsconfig.json:1-8`):
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Phase-1 baseline** (`tsconfig.app.json:1-19` — already has `strict: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"` — all stays).

**What to add (RESEARCH.md §10 lines 866-891):**
- Both files get `compilerOptions: { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }`.
- This must happen **before** `pnpm dlx shadcn@latest init` (Pitfall §R-3 — otherwise shadcn CLI stalls on interactive alias prompt).

---

#### `frontend/vite.config.ts` (config — add `resolve.alias`)

**Analog:** itself (Phase 1 self).

**Phase-1 baseline** (`frontend/vite.config.ts:1-26`):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: false },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})
```

**What to keep:** `react()` + `tailwindcss()` plugin order, the `/api` proxy block (relative-URL contract from Phase 1 D-Discretion + Pitfall #12), the build block.

**What to add (RESEARCH.md §10 step 2 lines 893-910):**
```typescript
import path from "node:path"
// ...
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },     // NEW
  },
  server: { proxy: { /* unchanged */ } },
  build: { /* unchanged */ },
})
```

`node:path` works because `@types/node` is already in devDependencies (`frontend/package.json:23`).

---

#### `frontend/vitest.config.ts` (config — NEW)

**Analog:** `frontend/vite.config.ts` (extends it).

**Pattern to copy from Vite analog:** the `defineConfig` + `plugins` shape. Add Vitest fields:
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
})
```

(`vitest` and `@testing-library/react` go into `devDependencies` — planner adds during install task.)

---

#### `frontend/package.json` (config — add deps)

**Analog:** itself (Phase 1 self).

**Phase-1 baseline** (`frontend/package.json:1-25` — minimal: react, react-dom, vite, tailwindcss, typescript).

**What to add (RESEARCH.md "Frontend additions" lines 132-143):**
```json
"dependencies": {
  "react": "^19.2.6",
  "react-dom": "^19.2.6",
  "react-router": "^7.15.0",
  "react-hook-form": "^7.76.0",
  "zod": "^4.0.0",
  "@hookform/resolvers": "^5.2.0",
  "@tanstack/react-query": "^5.100.0",
  "lucide-react": "latest",
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```
Plus devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.

**Critical gotcha (Pitfall §R-6):** `@hookform/resolvers` must match the zod 4 minor in use — `npm view @hookform/resolvers version` before pinning. Document the resolved version in the planner's install task per RESEARCH.md "Version verification before pinning" (line 167).

---

#### `frontend/src/main.tsx` (provider — REPLACE: + Router + QueryClient)

**Analog:** itself (Phase 1 self).

**Phase-1 baseline** (`frontend/src/main.tsx:1-13`):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**What to keep:** the `createRoot(document.getElementById('root')!)` mount pattern with non-null assertion, the `StrictMode` wrapper, the relative `'./index.css'` import.

**What to replace (RESEARCH.md §13 lines 1162-1192):**
```typescript
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider, redirect } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import EstimateFormPage from "./features/estimate/EstimateFormPage"
import ResultDashboardPage from "./features/estimate/ResultDashboardPage"
import "./index.css"

const router = createBrowserRouter([
  { path: "/", loader: () => redirect("/new") },
  { path: "/new", element: <EstimateFormPage /> },
  { path: "/result", element: <ResultDashboardPage /> },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

**What differs:** `App` import is gone; `RouterProvider` + `QueryClientProvider` wrap; routes defined inline. **Critical:** import from `"react-router"`, NOT `"react-router-dom"` (Pitfall §R-5 — v7 deprecates the `-dom` package).

---

#### `frontend/src/App.tsx` (component — DELETE or REPLACE with layout shell)

**Analog:** itself (Phase 1 self at `frontend/src/App.tsx:1-18`).

**Phase-1 pattern to keep (if kept):** the page-shell convention `<div className="min-h-screen bg-gray-50 p-8"><div className="max-w-xl mx-auto bg-white rounded shadow p-6 space-y-4">` — but Phase 2 widens to `max-w-4xl` per UI-SPEC.md §Spacing.

**Recommendation per RESEARCH.md §13 lines 1195-1209:** Delete `App.tsx`. Each page (`EstimateFormPage`, `ResultDashboardPage`) renders its own shell (UI-SPEC.md §Layout already shows full page-shell HTML for both routes). If a shared header is needed later, wrap with a parent-route `AppLayout` per the RESEARCH.md §13 alternative.

---

#### `frontend/src/index.css` (config — shadcn vars + `--warning` token)

**Analog:** itself (Phase 1 self).

**Phase-1 baseline** (`frontend/src/index.css:1`):
```css
@import "tailwindcss";
```

**What to keep:** the `@import "tailwindcss"` first line.

**What to add (RESEARCH.md §10 step 4 + custom warning token lines 938-947):** shadcn CLI will inject a `@theme` block and CSS variables for the slate palette. After CLI runs, append:
```css
@theme inline {
  --color-warning-bg: oklch(0.985 0.045 92);     /* amber-50 */
  --color-warning-border: oklch(0.732 0.176 60); /* amber-500 */
  --color-warning-text: oklch(0.382 0.130 60);   /* amber-800 */
}
```

UI-SPEC.md §Color locks these tokens for the risk banner only.

---

#### `frontend/src/lib/utils.ts` (utility — shadcn-CLI generated)

**Analog:** no analog. CLI-generated `cn()` helper (clsx + tailwind-merge composition). Standard shadcn boilerplate — copy nothing manually, let the CLI write it.

---

#### `frontend/src/lib/format.ts` (utility — German Intl helpers)

**Analog:** no analog. Copy verbatim from RESEARCH.md §15 lines 1279-1330.

**Critical contract (RESEARCH.md §15 lines 1332-1335 + Pitfall §R-2):** `Number(decimalString)` is allowed **only** inside the `Intl.NumberFormat.format(...)` call argument — never store the parsed number, never `parseFloat(...)` outside the formatter. Backend has already-quantized the string at the `@field_serializer` boundary, so JS-number precision is irrelevant for display.

**Lock-in formats** (UI-SPEC.md §"German format examples"):
- PT: `Decimal("102.3")` → `"102,3 PT"`
- EUR: `Decimal("15480.75")` → `"15.480,75 €"`
- Multiplier: `Decimal("1.05")` → `"×1,05"`
- Date: `"2026-12-31"` → `"31.12.2026"`

---

#### `frontend/src/lib/format.test.ts` (test — Vitest)

**Analog:** no analog. Greenfield. Use Vitest's `describe`/`it`/`expect` with the lock-in formats above as fixture assertions.

---

#### `frontend/src/api/client.ts` (service — REPLACE or DELETE)

**Analog:** itself (Phase 1 self).

**Phase-1 baseline to copy** (`frontend/src/api/client.ts:1-25`):
```typescript
export type Complexity = 'low' | 'medium' | 'high' | 'very_high'

export interface EstimateRequest { pages: number; complexity: Complexity }
export interface EstimateResponse { pt: number }

export async function postEstimate(req: EstimateRequest): Promise<EstimateResponse> {
  const res = await fetch('/api/estimates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API-Fehler ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<EstimateResponse>
}
```

**What to keep verbatim (the canonical fetch wrapper for this codebase):**
- Relative `'/api/estimates'` URL (Pitfall #12, Phase-1 D-Discretion lock)
- `method: 'POST'` + `Content-Type: 'application/json'`
- `if (!res.ok) throw new Error(...)` early-return pattern
- `res.json() as Promise<…>` cast pattern

**What changes:** schema types `EstimateRequest`/`EstimateResponse` move to `frontend/src/features/estimate/schema.ts` (zod-derived `EstimateInputs` + new `EstimateResultResponse` interface). Planner picks: either DELETE this file and put everything in `api/estimate.ts`, OR keep this file as a barrel re-export. RESEARCH.md "Recommended File Structure" (line 1670) calls out this choice.

---

#### `frontend/src/api/estimate.ts` (service — NEW request-response wrapper)

**Analog:** `frontend/src/api/client.ts` (Phase 1 — exact pattern to extend).

**Pattern to copy:** the entire `postEstimate` function shape above (URL, method, headers, error-throw, json-cast).

**What changes (RESEARCH.md §14 lines 1226-1264):**
- Input type changes from `EstimateRequest` → `EstimateInputs` (imported from `@/features/estimate/schema`)
- Output type changes from `EstimateResponse` → `EstimateResultResponse` (NEW interface with `result`, `snapshot`, `scope_text`)
- Error branches expand per UI-SPEC.md §"Error states": 422 → `"Eingabe ungültig: …"`, 500 → `"Serverfehler. Bitte den Administrator informieren."`, other → `"Berechnung fehlgeschlagen. Bitte erneut versuchen."`
- **All Decimal fields typed as `string`** (TECH-02, Pitfall §R-2) — never `number`.

---

#### `frontend/src/components/EstimateForm.tsx` (DELETE)

**Analog:** itself (Phase 1 throwaway).

**Pattern to keep (lessons learned, not code):**
- The `interface Props { onResult: ... }` callback approach is **abandoned** in Phase 2 — react-router `navigate('/result', { state })` replaces it (RESEARCH.md §13).
- The `useState<X | ''>('')` no-default pattern for required selects (`frontend/src/components/EstimateForm.tsx:12` — `useState<Complexity | ''>('')`) is **the Anti-Anchoring contract** (Phase-1 D-01, Pitfall #17). Carries forward to RHF as "no `defaultValues` entry for required selects → `field.value === undefined` → Radix renders placeholder" (RESEARCH.md §12 lines 1150-1152).

---

#### `frontend/src/components/ResultPanel.tsx` (DELETE)

**Analog:** itself (Phase 1 throwaway).

**Pattern to keep (lessons learned, not code):**
- Conditional empty-state (`if (pt === null) return null` at `ResultPanel.tsx:7`) becomes the "empty-state block" in `ResultDashboardPage` for direct-URL/reload landings (UI-SPEC.md §"Empty / unsubmitted state").
- The `String(pt)` no-formatting pattern is **replaced** by `formatPT(str)` from the new `lib/format.ts`.

---

#### `frontend/src/components/ui/*.tsx` (10 files — shadcn primitives)

**Analog:** no analog. All CLI-generated via:
```bash
pnpm dlx shadcn@latest add card input select textarea label button tooltip form alert popover --yes
```
(RESEARCH.md §10 step 5 line 933.)

These files become part of the project source — they are not npm dependencies and the planner does not author them. The exception is the `alert.tsx` `variant="warning"` extension (RESEARCH.md §10 line 947 — small post-CLI edit to add the warning variant using the `--color-warning-*` CSS vars).

---

#### `frontend/src/features/estimate/schema.ts` (model — zod mirror of backend Pydantic)

**Analog:** no analog. Copy from RESEARCH.md §11 lines 962-1001.

**Lock-in correspondences** (TECH-04, RESEARCH.md §11):
- `z.enum(STUFE, { message: "Pflichtfeld." })` — German error message matches UI-SPEC.md §"Error states" exactly
- Decimal fields → `z.string().regex(...)` — never `z.number()` (TECH-02, Pitfall §R-2)
- **NO `.default(...)` on required enums** — Anti-Anchoring (Pitfall §R-10)
- `tagessatz_eur`: accept comma or dot, `.refine(v => Number(v.replace(",", ".")) > 0, ...)` for German keyboard

---

#### `frontend/src/features/estimate/schema.test.ts` (test — zod validation)

**Analog:** no analog. Greenfield. Vitest tests covering each error-message branch (UI-SPEC.md §"Error states") + the Pflichtfeld-no-default contract.

---

#### `frontend/src/features/estimate/EstimateFormPage.tsx` (component — page)

**Analog:** `frontend/src/components/EstimateForm.tsx` (Phase 1 — role-match only).

**Phase-1 patterns to carry forward (conceptually, not literally):**
- The `<form onSubmit={…}>` outer wrapper
- The "set busy → POST → setError → setBusy(false) in finally" submit lifecycle — replaced by `useMutation` (RESEARCH.md §14) but same intent
- The `disabled={busy}` on the submit button — extends to `disabled={!form.formState.isValid || mutation.isPending}` (RESEARCH.md §11 line 1103)
- The "Bitte alle Felder ausfüllen." German error tone — extended to per-field `Pflichtfeld.` plus the footer counter `{N} Pflichtfelder fehlen` (UI-SPEC.md §"Primary CTA")
- The relative `'/api/estimates'` URL ownership delegated to `api/estimate.ts`'s `postEstimate`

**Phase-2 structure (RESEARCH.md §11 lines 1010-1112):** 4 Cards (`Stammdaten` / `Parameter` / `Korrekturfaktoren` / `Annahmen & Ausschlüsse`) inside `<Form {...form}><form onSubmit={form.handleSubmit(...)}>…<footer class="fixed bottom-0 …">…`. Each field uses `<FormField control={form.control} name="…" render={({field}) => <FormItem>…</FormItem>}/>` — shadcn's react-hook-form glue.

**Anti-Anchoring discipline (Pitfall §R-10 / RESEARCH.md §12):** `defaultValues` only contains text fields and numeric defaults; **none** of `projekttyp`, `*_complexity`, `factor_*`, `concurrent_users_band` get a default string.

**localStorage handshake (RESEARCH.md §16 + INPUT-07):**
```typescript
defaultValues: { erstellt_von: localStorage.getItem("estimation:last_creator") ?? "", ... }
// in onSuccess:
localStorage.setItem("estimation:last_creator", variables.erstellt_von)
```

---

#### `frontend/src/features/estimate/ResultDashboardPage.tsx` (component — page)

**Analog:** `frontend/src/components/ResultPanel.tsx` (Phase 1 — role-match only).

**Phase-1 pattern to keep (conceptually):**
- The conditional render guard (`if (pt === null) return null`) becomes the empty-state block when `useLocation().state` is undefined (direct URL navigation, reload)

**Phase-2 structure (UI-SPEC.md §"`/result` — Dashboard page" + CONTEXT.md D-03):**
- Header strip with `<Button variant="outline" onClick={() => navigate('/new')}>Zurück zur Eingabe</Button>` on the right
- Conditional risk banner (Card 0) — `{hasRisk && <Alert variant="warning" role="alert" aria-live="polite">…<AlertTriangle />…</Alert>}` (RESEARCH.md §10 warning variant + UI-SPEC.md §"Risk banner copy")
- 5 Cards in order: Kennzahlen / PERT-Detail / Phasenverteilung / Korrekturfaktoren / Scope-Beschreibung (UI-SPEC.md §"Layout" — exact German titles locked)
- All Decimal renders go through `formatPT` / `formatEur` / `formatMultiplier` from `lib/format.ts`
- Tooltips on `P50` / `P80` / `P90` / `σ` use shadcn `Tooltip` with locked German body (UI-SPEC.md §"Tooltip body text")

---

#### `frontend/src/features/estimate/CharCounter.tsx` (component — live counter)

**Analog:** no analog. Copy verbatim from RESEARCH.md §17 lines 1368-1383.

**Critical:** uses `useWatch({ control, name })` instead of `form.watch()` — scopes re-renders to this component only (RESEARCH.md §17 line 1402). Important for the 30+ field form.

**Color thresholds (UI-SPEC.md §"Char counter format"):**
- `< max × 0.95` → `text-slate-500`
- `>= max × 0.95 && <= max` → `text-amber-600`
- `> max` → `text-red-600`

---

#### `frontend/src/features/estimate/anti-anchoring.test.tsx` (test — verification gate)

**Analog:** no analog. Greenfield. Per RESEARCH.md §12 line 1152 + Pitfall §R-10:

Test contract: render `<EstimateFormPage />`, grep `defaultValues` (via inspection of the rendered selects) — none of `factor_tech` / `factor_team` / `factor_quality` / `factor_doc` / `pages_complexity` / `use_cases_complexity` / `business_objects_complexity` / `interfaces_complexity` / `batches_complexity` / `projekttyp` / `concurrent_users_band` may show a selected option. Each must render the placeholder text `— Bitte wählen —`.

---

## Shared Patterns

### S1 — Relative `/api/` URLs (frontend cross-cutting)

**Source:** `frontend/src/api/client.ts:14` (Phase 1)
**Apply to:** Every new frontend fetch call (`api/estimate.ts` and any future `/api/estimates/:id`, `/api/admin/weights`)

```typescript
const res = await fetch('/api/estimates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(req),
})
```

**Why locked:** Pitfall #12 (Phase 1) — never hardcode `http://localhost:8000`. Both Vite dev-proxy (`vite.config.ts:14`) and nginx prod-proxy route relative `/api/*` paths correctly.

### S2 — Pydantic v2 `BaseModel` + `Field()` style (backend cross-cutting)

**Source:** `backend/app/schemas/estimate.py:8-15` (Phase 1)
**Apply to:** `engine/types.py`, `schemas/estimate.py` (EstimateResultResponse wrapper)

```python
from typing import Literal
from pydantic import BaseModel, Field

class EstimateRequest(BaseModel):
    pages: int = Field(ge=0, le=10_000, description="…")
    complexity: Complexity = Field(description="…")
```

**Phase 2 extension:** `Annotated[Decimal, Field(max_digits=18, decimal_places=10)]` aliases (`MoneyDecimal`, `PTDecimal`) replace `float`. `ConfigDict(frozen=True)` added on snapshot types.

### S3 — APIRouter() module-level singleton (backend cross-cutting)

**Source:** `backend/app/routers/health.py:7` and `backend/app/routers/estimates.py:6` (Phase 1)
**Apply to:** any future router module

```python
from fastapi import APIRouter
router = APIRouter()

@router.post("/estimates", response_model=EstimateResponse)
def create_estimate(req: EstimateRequest) -> EstimateResponse:
    ...
```

**Mount convention** (`backend/app/main.py:24-25`): every router included with `prefix="/api"` and a `tags=[…]` label.

### S4 — Anti-Anchoring required-select pattern (frontend + backend cross-cutting)

**Source:**
- Backend Phase-1 enum-without-default: `backend/app/schemas/estimate.py:11` — `complexity: Complexity = Field(description=...)` (no `= "medium"`)
- Frontend Phase-1 no-`useState` default: `frontend/src/components/EstimateForm.tsx:12` — `const [complexity, setComplexity] = useState<Complexity | ''>('')`

**Apply to:** all Phase-2 Pflicht-Selects — backend zod/Pydantic enums without `.default(...)`, frontend RHF without `defaultValues` entries for these fields.

```python
# Backend — Phase 1 (still valid in Phase 2)
complexity: Complexity = Field(description="Pages-Komplexität (kein Default, Pitfall #17)")
```

```typescript
// Frontend — Phase 1 (carried forward in Phase 2)
const [complexity, setComplexity] = useState<Complexity | ''>('')
// → Phase 2 RHF equivalent: no key for `factor_tech` in defaultValues
```

### S5 — German consultancy-tone error strings (frontend cross-cutting)

**Source:** `frontend/src/components/EstimateForm.tsx:21` (`'Bitte alle Felder ausfüllen.'`) + `frontend/src/api/client.ts:21` (`'API-Fehler ${res.status}: …'`)
**Apply to:** all Phase-2 form validation messages, API-error surfacing, empty-state copy. UI-SPEC.md §"Copywriting Contract" locks exact strings.

```typescript
// Phase-1 baseline tone — extended in Phase 2 to per-field "Pflichtfeld."
if (pages === '' || complexity === '') {
  setError('Bitte alle Felder ausfüllen.')
  return
}
```

### S6 — Bind-mount + `CONFIG_DIR` env-var (backend cross-cutting)

**Source:** `docker-compose.yml:11-12` (Phase 1) — `./config:/app/config` bind-mount declared
**Apply to:** `main.py` lifespan (Pattern §8) + `services/weights_loader.py` (Pattern §7)

```yaml
volumes:
  - ./data:/app/data
  - ./config:/app/config   # INFRA-06 — Phase 1 reserved this for Phase 2's weights.json
```

Backend Phase 2 reads `CONFIG_DIR` env (default `"./config"`); Phase-3 will read `DATABASE_URL` env from the same baseline.

---

## No Analog Found

Files with no close match in the Phase-1 codebase — planner uses RESEARCH.md pattern as the primary reference:

| File | Role | Data Flow | Reason / Source Pattern |
|------|------|-----------|-------------------------|
| `backend/app/engine/core.py` | service (pure) | transform | Pure-function engine — first in repo. RESEARCH.md §2 |
| `backend/app/engine/scope.py` | service (pure) | transform | Jinja2 wrapper — first templated text in repo. RESEARCH.md §6 |
| `backend/app/services/weights_loader.py` | service | file-I/O | First filesystem-reading service. RESEARCH.md §7 |
| `backend/app/data/weights.default.json` | config | n/a | First JSON data file. RESEARCH.md §9 |
| `backend/app/templates/scope_text.de.j2` | template | transform | First Jinja2 template. RESEARCH.md §6 |
| `backend/tests/**` (all) | test | various | Phase 1 explicitly skipped tests (Phase-1 CONTEXT.md D-Discretion §Tooling-Tiefe). RESEARCH.md §4, §5 |
| `frontend/components.json` | config | n/a | shadcn-CLI output — first run in repo. RESEARCH.md §10 |
| `frontend/vitest.config.ts` | config | n/a | First test runner config. Vite-config-shape analog only |
| `frontend/src/lib/utils.ts` | utility | n/a | shadcn-CLI `cn()` boilerplate |
| `frontend/src/lib/format.ts` | utility | transform | First Intl helpers. RESEARCH.md §15 |
| `frontend/src/lib/format.test.ts` | test | transform | First Vitest test. Greenfield |
| `frontend/src/components/ui/*.tsx` (10 files) | component | n/a | shadcn-CLI outputs — RESEARCH.md §10 |
| `frontend/src/features/estimate/schema.ts` | model | transform | First zod schema. RESEARCH.md §11 |
| `frontend/src/features/estimate/schema.test.ts` | test | transform | First feature-level test |
| `frontend/src/features/estimate/CharCounter.tsx` | component | transform | RESEARCH.md §17 |
| `frontend/src/features/estimate/anti-anchoring.test.tsx` | test | n/a | RESEARCH.md §12 verification gate |

---

## Metadata

**Analog search scope:**
- `backend/app/**/*.py` (8 files)
- `backend/Dockerfile`, `backend/pyproject.toml`
- `frontend/src/**/*.{ts,tsx,css}` (7 files)
- `frontend/{package.json,tsconfig*.json,vite.config.ts,index.html,Dockerfile}`
- `docker-compose.yml`

**Files scanned:** 22 Phase-1 source files (full file Reads — all <100 lines except `pyproject.toml` and `docker-compose.yml`).

**Pattern extraction date:** 2026-05-17

**Phase 1 lessons informing Phase 2 analogs:**
- Empty `__init__.py` is the convention for sub-packages with explicit module imports (`backend/app/routers/__init__.py`, `backend/app/schemas/__init__.py`)
- `from app.X.Y import Z` (sub-package absolute) is the import style — no relative imports (`backend/app/main.py:6-7`, `backend/app/routers/estimates.py:4`)
- All Phase-1 files include a `# Source: …` header comment with the authoritative reference (FastAPI tutorial, Pydantic docs, Tailwind install guide) — Phase 2 should continue this convention
- Phase-1 chose **uncontrolled-first** form state (`useState<X | ''>('')`) — this aligns with the react-hook-form-uncontrolled-first model adopted in Phase 2 (RESEARCH.md "Newly installed" §react-hook-form)
- `docker-compose.yml` healthcheck binds **only to HTTP-200** — Phase 2 can extend `/api/health` payload without breaking it, but the entry in CONTEXT.md `<code_context>` integration-point note marks this as **optional** for Phase 2

---

## PATTERN MAPPING COMPLETE

**Phase:** 02 - engine-form
**Files classified:** 47
**Analogs found:** 21 / 47

### Coverage
- Files with exact analog (extend self / direct Phase-1 file): 13
- Files with role-match analog (same intent, total rewrite): 8
- Files with no analog (RESEARCH.md is primary source): 26

### Key Patterns Identified
- All Phase-1 controllers use the `APIRouter()` module-level singleton + `@router.post("/path", response_model=…)` decorator with function-style handlers (Shared Pattern S3) — Phase 2 carries this forward unchanged for the modified `estimates.py`.
- Phase-1 established the Anti-Anchoring contract dually: backend Pydantic enums without `= "default"` and frontend `useState<X | ''>('')` (Shared Pattern S4) — Phase 2 extends this to all 10 required selects across `EstimateInputs` + zod schema + Radix Select rendering.
- Phase-1's `frontend/src/api/client.ts` is the canonical fetch wrapper (relative `/api/` URL + `Content-Type: application/json` + early `if (!res.ok) throw` + `res.json() as Promise<T>` cast) — Phase 2's `api/estimate.ts` copies this shape exactly and extends only the error-branch logic.
- Sub-package layout (`routers/`, `schemas/` in Phase 1; adds `engine/`, `services/`, `data/`, `templates/` in Phase 2) is the locked backend convention; empty `__init__.py` markers are used everywhere except `engine/__init__.py` which exports the public surface (Pattern §2).
- The codebase has **no existing Decimal handling, no existing tests, no existing forms beyond throwaway** — these areas have no analogs and the planner must lean on RESEARCH.md Patterns §1, §4, §5, §11 as primary references.

### File Created
`/Users/florianblauensteiner/Documents/claude_projects/EstimationManager/.planning/phases/02-engine-form/02-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns + RESEARCH.md numbered patterns in PLAN.md files.
