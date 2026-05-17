# Phase 02: Engine & Form — Research

**Researched:** 2026-05-17
**Domain:** Pure PERT calculation engine + Decimal serialization + react-hook-form/zod form + react-router 7 + shadcn-on-Tailwind-v4
**Confidence:** HIGH (stack is locked in CLAUDE.md and verified there; this research surfaces concrete code-level patterns)

---

## Executive Summary

Phase 02 is a code-pattern phase, not a stack-discovery phase. Every library, version, and design decision was already locked upstream: CLAUDE.md fixes Pydantic 2.13 + SQLAlchemy 2.0 sync + Decimal Decision 2; CONTEXT.md D-01..D-08 lock form structure, dashboard layout, routing, weights loading, and Decimal rendering policy; UI-SPEC.md locks shadcn-on-Tailwind-v4 with the new-york/slate preset, all 10 shadcn components, German copy, color tokens, and accessibility floor. The planner does not need to "research the stack" — the planner needs concrete, copy-pasteable patterns for nine backend integration points and nine frontend integration points so that the executor never has to ask "how do I wire X to Y?"

The two highest-risk surfaces are (1) the **Decimal serialization boundary** — `@field_serializer` on Pydantic Decimal aliases must quantize-then-stringify with `ROUND_HALF_UP` at the JSON-out boundary while the engine stays unquantized internally (Pitfall #1 + #2 + D-08), and (2) the **engine layer isolation** — `engine/` must not import from `models/`, `db/`, `schemas/`, or FastAPI; this is enforced by `import-linter` (separate dedicated tool, not ruff) via a `forbidden` contract in pyproject.toml.

The third surface that needs care is **shadcn-CLI-on-Tailwind-v4-non-interactive** — the CLI requires path aliases pre-configured in tsconfig.json + vite.config.ts before `init` runs, plus a `pnpm dlx shadcn@latest init` invocation that flips `shadcn_initialized: false` to `true` in UI-SPEC.md as the first task of the form-build plan. Wire this in the right order or the init step asks interactive questions and stalls the executor.

**Primary recommendation:** Plan three task waves — (W1) Backend engine + Decimal types + Jinja2 scope template + WeightsLoader + import-linter; (W2) Frontend shadcn-init + path aliases + format helpers + react-router data-router; (W3) Form composition + Dashboard composition + react-query mutation wire-up. W1 and W2 can execute in parallel; W3 depends on both.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Lineare Single-Page-Form mit Card-Sections** — 4 Cards (Stammdaten, Parameter, Faktoren, Annahmen) under `/new`, sticky "Berechnen"-Button at viewport bottom. No accordion, no tabs.
- **D-02: shadcn/ui in Phase 2 einziehen** — shadcn-CLI 3.x with Tailwind v4. Components land in `frontend/src/components/ui/`. Required Phase-2 components: `card`, `input`, `select`, `textarea`, `label`, `button`, `tooltip`, `form`, `alert`, `popover` (per UI-SPEC.md §Design System).
- **D-03: Kennzahlen-Grid oben + Sektion-Stack unten** — Dashboard at `/result`, 5 Cards top-to-bottom: Kennzahlen, PERT-Detail, Phasen-Tabelle, Faktoren, Scope-Text. Risk banner (Card 0) when any factor > 1.15.
- **D-04: Risikohinweis dual surfacen** — Alert banner above Card 1 + identical paragraph in Scope-Text (PDF-Eigenständigkeit für Phase 4).
- **D-05: react-router 7 in Phase 2** — Routes: `/` redirect → `/new`, `/new` = EstimateForm, `/result` = Dashboard. State via `location.state`. Browser-Back preserves form values via react-hook-form local state.
- **D-06: weights.default.json gebundelt + First-Run-Copy** — `backend/app/data/weights.default.json` bundled in image; on FastAPI startup, copy to `./config/weights.json` if missing.
- **D-07: Pro-Request Read-and-Parse, kein Cache** — `WeightsLoader.load()` reads + Pydantic-validates `./config/weights.json` fresh on every `POST /api/estimates`. No mtime cache, no in-memory snapshot. Phase 5 adds caching.
- **D-08: Volle Decimal-Präzision in Engine, Display-Rundung erst am Edge** — Engine: unquantized Decimal. JSON-Serialisierung: `@field_serializer` quantize-then-stringify mit `ROUND_HALF_UP`. PT auf 1 NK (`Decimal("0.1")`), € auf 2 NK (`Decimal("0.01")`), σ auf 1 NK. Frontend formatiert nur deutsche Lokalisierung mit `Intl.NumberFormat('de-DE')`.

### Claude's Discretion

- Pydantic-Schema-Modulstruktur (Granularität, Aufteilung in Module)
- Scope-Text-Generierung — Empfehlung Jinja2-Template (gleiche Lib wie Phase 4 PDF)
- Engine-Test-Strategie — Empfehlung 3-Schichten: Hypothesis-Property-Tests, Decimal-Drift-Test, Golden-Fixtures
- Engine-Layering — Empfehlung `engine/{__init__.py, core.py, types.py, scope.py}`; Importlinter-Regel (TECH-01); Tool-Wahl ruff vs. importlinter
- `WeightsLoader`-Implementierung — Empfehlung `backend/app/services/weights_loader.py`, Klasse `WeightsLoader.load(path: Path) -> WeightsSnapshot`
- shadcn-Variante — New-York-Style, Slate Neutralton
- Sticky-Button-Implementierung — `position: sticky/fixed; bottom: 0`, disabled wenn Form invalid

### Deferred Ideas (OUT OF SCOPE)

- SQLAlchemy-Persistenz, History, Clone, CSV-Export → Phase 3
- WeasyPrint, Jinja2-für-PDF, deutsches PDF, methodik.txt → Phase 4 (Jinja2 wird in Phase 2 **trotzdem** als lib gebracht, für Scope-Text)
- Admin-Editor `/admin`, atomic-write `weights.json`, mtime-Cache, ADMIN-* Requirements → Phase 5
- Print-Preview-Modus, PDF-Generation-UI → Phase 4
- "Schätzung speichern"-Indikator, Toast-System → Phase 3

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPUT-01..08 | Stammdaten-Felder (Projektname, Skizze, Projekttyp, Kunde, ID, valid_until, Erstellt-von, Tagessatz) | Backend Pattern §1 (Pydantic schema), Frontend Pattern §11 (shadcn Form), Pattern §16 (localStorage Pre-Fill) |
| PARAM-01..05 | 5 Parameter (Pages/UCs/BOs/Interfaces/Batches) × Anzahl + Komplexität | Frontend Pattern §12 (Anti-Anchoring Select); Backend Pattern §1 (Pydantic Literal types) |
| PARAM-06..08 | Languages, Roles, Concurrent Users | Backend Pattern §1; Frontend Pattern §12 |
| FACT-01..04 | 4 Faktoren (Tech/Team/Quality/Doc), Pflicht, kein Default | Frontend Pattern §12 (Anti-Anchoring required select with `placeholder="— Bitte wählen —"`) |
| TEXT-01..02 | Annahmen + Ausschlüsse Textareas mit Live-Zähler | Frontend Pattern §17 (form.watch + char counter) |
| CALC-01..07 | PERT-Engine als pure function, Decimal end-to-end, deterministic | Backend Pattern §2 (engine layout), §3 (import-linter), §4 (Hypothesis tests), §5 (Decimal-drift test) |
| REPRO-01 | Vollständiger WeightsSnapshot pro Request mit Result an Client | Backend Pattern §7 (WeightsLoader), §9 (weights.default.json schema) |
| DASH-01..10 | Dashboard mit PERT/P50/P80/P90/Phasen/€/Faktoren/Scope-Text, Risk-Banner, German format, <1s | Frontend Pattern §13 (react-router data-router), §14 (react-query mutation), §15 (Decimal-as-string + Intl) |
| TECH-01 | Layer isolation: engine/ darf nicht models/db/schemas/FastAPI importieren | Backend Pattern §3 (import-linter) |
| TECH-02 | Pydantic v2 mit MoneyDecimal/PTDecimal Type-Aliase + @field_serializer; Frontend behandelt Decimal als String | Backend Pattern §1 (Decimal type aliases); Frontend Pattern §15 (format helpers) |
| TECH-04 | Frontend nutzt react-hook-form + zod, Zod-Schemas spiegeln Pydantic | Frontend Pattern §11 (Form), §12 (Anti-Anchoring) |
| TECH-08 | Alle UI-Labels, Validierungs-Meldungen, Scope-Texte auf Deutsch | UI-SPEC.md §Copywriting Contract (locked literals) |
| TECH-09 | Code, Variablen-Namen auf Englisch | Convention only |

---

## Project Constraints (from CLAUDE.md)

- **Decimal Decision 2** — SQLite has no native DECIMAL; SQLAlchemy `Numeric(asdecimal=True)` against SQLite silently round-trips via float. **Phase 2 does not touch DB** (deferred to Phase 3), but the `@field_serializer` and Decimal-as-string-in-JSON pattern lives in Phase 2 to be DB-ready.
- **Never round intermediate results** — only at the JSON serialize boundary.
- **Receive Decimal as string from JSON** — Pydantic v2 default. Frontend never parses to JS `Number` except inside `Intl.NumberFormat`.
- **No `float` for €/PT** anywhere. Engine uses `Decimal(str(value))` (NOT `Decimal(float)`) when constructing from JSON inputs.
- **`fastapi[standard]` extra** (not `fastapi[all]`) — already present in pyproject.toml.
- **No external network requests at runtime** (TECH-07, deferred-to-Phase-4 enforcement but Phase 2 must not introduce CDN-loaded fonts/icons).
- **CLAUDE.md "What NOT to Use" enforcement:** No `float` for €/PT; no Pydantic v1; no async SQLAlchemy; no `tailwind.config.js` heavy customization (theme in CSS via `@theme`); no `formik`; no Redux; no i18next; no Vite 8.
- **GSD Workflow Enforcement:** All file changes must go through a GSD command. Phase-2 task execution is `/gsd-execute-phase`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Input validation (zod schema mirror) | Browser / Client | API / Backend (Pydantic re-validates) | UX-immediacy on client; defense-in-depth on server |
| PERT calculation | API / Backend (pure `engine/`) | — | Reproducibility demands deterministic, pure function on the server; client never computes |
| Decimal quantization (display rounding) | API / Backend (`@field_serializer` at JSON boundary) | Browser (Intl formatting only) | Single source of truth for rounded values; client only locale-formats already-quantized strings |
| WeightsSnapshot construction | API / Backend (`services/WeightsLoader`) | — | Filesystem I/O; engine is pure and only receives the snapshot |
| Scope-Text-Generation | API / Backend (Jinja2 template) | — | Same lib as Phase 4 PDF; one source for both UI and PDF |
| Route navigation (form ↔ dashboard) | Browser (react-router 7 data-router) | — | Pure client-side SPA; no SSR (CLAUDE.md "no Server Components on Vite") |
| Server-state caching (mutation result) | Browser (@tanstack/react-query 5) | — | Standard pattern; result passed to `/result` route via `location.state` |
| Form-state | Browser (react-hook-form 7.76) | — | Uncontrolled-first, scales to 30+ fields without perf work |
| Char counters, live validation | Browser (react-hook-form `watch` + zod) | — | Pure UX-immediacy |
| localStorage pre-fill (Erstellt-von) | Browser (`localStorage`) | — | Convenience-only, no server roundtrip |
| First-run config seeding | API / Backend (FastAPI lifespan) | — | Container startup, must complete before serving requests |

---

## Standard Stack

The entire stack is **locked by CLAUDE.md** and was researched there via Context7 + PyPI/npm. No re-research needed. The packages below are cited from CLAUDE.md.

### Core (already installed in Phase 1)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| FastAPI | 0.136.x | HTTP API | `[VERIFIED: CLAUDE.md §Core Technologies, backend/pyproject.toml]` |
| Pydantic | 2.13.x | Validation + DTOs | `[VERIFIED: CLAUDE.md, backend/pyproject.toml]` |
| React | 19.2.x | Frontend UI | `[VERIFIED: CLAUDE.md, frontend/package.json]` |
| Vite | 7.x | Bundler | `[VERIFIED: CLAUDE.md, frontend/package.json]` |
| Tailwind CSS | 4.3.x | Styling | `[VERIFIED: CLAUDE.md, frontend/package.json]` |

### Newly installed in Phase 2

#### Backend additions

| Library | Version | Purpose | Source / Disposition |
|---------|---------|---------|---------------------|
| Jinja2 | 3.1.x | Scope-text template rendering (later: PDF in Phase 4) | `[VERIFIED: CLAUDE.md §Core Technologies]` — already pulled in by `fastapi[standard]`; just import |
| import-linter | 2.x | TECH-01 layer-isolation enforcement | `[CITED: import-linter.readthedocs.io/en/stable]` |
| pytest | 8.x | Test runner | `[CITED: CLAUDE.md §Supporting Libraries — Backend]` |
| pytest-asyncio | latest | Async test support (kept for future-proofing) | `[CITED: CLAUDE.md]` |
| hypothesis | 6.x | Property-based tests for engine determinism | `[ASSUMED]` — version per latest stable on PyPI; verify with `pip index versions hypothesis` before pinning |
| ruff | latest | Linter + formatter (replaces black/isort/flake8) | `[CITED: CLAUDE.md §Supporting Libraries]` |

#### Frontend additions

| Library | Version | Purpose | Source / Disposition |
|---------|---------|---------|---------------------|
| react-router | 7.15.x | Client-side routing (data-router mode) | `[VERIFIED: CLAUDE.md §Supporting Libraries — Frontend]` |
| react-hook-form | 7.76.x | Form state | `[VERIFIED: CLAUDE.md]` |
| zod | 4.x | Schema validation | `[VERIFIED: CLAUDE.md]` |
| @hookform/resolvers | 5.2.x or newer | RHF ↔ Zod 4 adapter | `[VERIFIED: CLAUDE.md]` — but see Pitfall §R-6 below: pin to a version that matches the Zod 4 minor in use, else type errors |
| @tanstack/react-query | 5.100.x | Mutation/server-state | `[VERIFIED: CLAUDE.md]` |
| lucide-react | latest | Icons (AlertTriangle, Loader2, info `?`) | `[VERIFIED: CLAUDE.md]` |
| clsx + tailwind-merge | latest | Conditional classes (pulled in by shadcn `cn()` helper) | `[CITED: CLAUDE.md]` |
| shadcn (CLI) | 3.x | Component scaffolder, not a runtime dep | `[VERIFIED: CLAUDE.md + ui.shadcn.com/docs/installation/vite]` |

#### Per-component shadcn installations

These are not npm packages — they are file-copies into `frontend/src/components/ui/`:

`card, input, select, textarea, label, button, tooltip, form, alert, popover` (10 components per UI-SPEC §Design System). Optionally `table` for Phasen-Tabelle (planner decides: plain `<table>` styled with Tailwind is equally acceptable per UI-SPEC §Card 3).

### Installation commands

```bash
# Backend (cwd: backend/)
uv add jinja2 import-linter pytest pytest-asyncio hypothesis ruff
# Pin exact versions in pyproject.toml after first install; verify:
#   uv pip show hypothesis import-linter

# Frontend (cwd: frontend/)
pnpm add react-router@^7.15 react-hook-form@^7.76 zod@^4 @hookform/resolvers@^5.2 \
         @tanstack/react-query@^5.100 lucide-react
# shadcn init + components (see Frontend Pattern §10 for full sequence)
pnpm dlx shadcn@latest init --base-color slate --style new-york
pnpm dlx shadcn@latest add card input select textarea label button tooltip form alert popover
```

**Version verification before pinning:** Planner must run each of these for every new package and document the resolved version + publish date in the task:
```bash
pip index versions hypothesis import-linter         # backend new packages
npm view react-router version                       # frontend new packages
npm view @hookform/resolvers version
npm view @tanstack/react-query version
```

## Package Legitimacy Audit

> slopcheck CLI is not installed in this environment. Per protocol, every newly recommended package below is tagged `[ASSUMED]` unless it appears verbatim in CLAUDE.md's Sources section (which was researched with Context7 + registry verification). The planner MUST insert a `checkpoint:human-verify` task before the `pnpm add` / `uv add` step that confirms each package against the npm/PyPI registry and against the slopcheck output (install slopcheck during W1 if possible).

| Package | Registry | CLAUDE.md cited? | Provenance | Disposition |
|---------|----------|------------------|-----------|-------------|
| `jinja2` | PyPI | Yes (§Core Tech) | `[VERIFIED: CLAUDE.md citing Context7 /websites/sqlalchemy_en_20]` — actually pulled by `fastapi[standard]` already | Approved |
| `import-linter` | PyPI | No | `[CITED: import-linter.readthedocs.io/en/stable]` — official docs verified during this research | Approved; planner pins version after `pip index versions import-linter` |
| `hypothesis` | PyPI | No | `[ASSUMED]` — long-established, well-known property-testing lib; not slopcheck-verified | Approved; planner pins after `pip index versions hypothesis` and human-verifies |
| `pytest`, `pytest-asyncio`, `ruff` | PyPI | Yes (§Dev Tools, §Supporting Libs Backend) | `[VERIFIED: CLAUDE.md]` | Approved |
| `react-router` | npm | Yes (§Supporting Libs Frontend) | `[VERIFIED: CLAUDE.md]` | Approved |
| `react-hook-form` | npm | Yes | `[VERIFIED: CLAUDE.md citing npm registry]` | Approved |
| `zod` | npm | Yes | `[VERIFIED: CLAUDE.md citing npm registry]` | Approved |
| `@hookform/resolvers` | npm | Yes | `[VERIFIED: CLAUDE.md]` | Approved; **planner must pin to a version that has Zod 4.3.x type compatibility** — see Pitfall §R-6 |
| `@tanstack/react-query` | npm | Yes | `[VERIFIED: CLAUDE.md]` | Approved |
| `lucide-react` | npm | Yes | `[VERIFIED: CLAUDE.md §Frontend Icons]` | Approved |
| `shadcn` (CLI, dlx-only) | npm | Yes | `[VERIFIED: CLAUDE.md + ui.shadcn.com/docs/installation/vite]` | Approved; CLI only, not a runtime dep |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck unavailable)
**Packages flagged [SUS]:** none yet — planner inserts a `checkpoint:human-verify` before each `add` task and runs slopcheck if installable

---

## Backend Patterns

> All path references are absolute from repo root: `/Users/florianblauensteiner/Documents/claude_projects/EstimationManager/backend/...`

### Pattern §1 — Pydantic v2 Decimal type aliases with `@field_serializer`

**File:** `backend/app/engine/types.py`

`MoneyDecimal` and `PTDecimal` are reusable type aliases. The serializer runs at JSON-output time only — it does NOT quantize the value in memory, so the engine still sees full Decimal precision. CONTEXT.md D-08 + Pitfall #2 + TECH-02.

```python
# Source: pydantic v2 docs (docs.pydantic.dev/latest/concepts/serialization) +
# CLAUDE.md "Decimal Decision 2" + Pitfall #2.
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated
from pydantic import BaseModel, Field, field_serializer

# Quantizers used at the JSON-out boundary only — never inside the engine.
_PT_QUANTUM = Decimal("0.1")
_MONEY_QUANTUM = Decimal("0.01")

# Type aliases — Annotated lets Pydantic still apply `Field()` constraints uniformly.
MoneyDecimal = Annotated[Decimal, Field(max_digits=18, decimal_places=10)]
PTDecimal = Annotated[Decimal, Field(max_digits=18, decimal_places=10)]
# decimal_places=10 stores precision; the serializer rounds for display.

class EstimateResult(BaseModel):
    pert_pt: PTDecimal
    p50_pt: PTDecimal
    p80_pt: PTDecimal
    p90_pt: PTDecimal
    sigma_pt: PTDecimal
    total_eur: MoneyDecimal
    # ... etc

    @field_serializer(
        "pert_pt", "p50_pt", "p80_pt", "p90_pt", "sigma_pt",
        when_used="json",  # apply only on .model_dump_json() / FastAPI response
    )
    def _ser_pt(self, v: Decimal) -> str:
        return str(v.quantize(_PT_QUANTUM, rounding=ROUND_HALF_UP))

    @field_serializer("total_eur", when_used="json")
    def _ser_money(self, v: Decimal) -> str:
        return str(v.quantize(_MONEY_QUANTUM, rounding=ROUND_HALF_UP))
```

**Key points:**
- `when_used="json"` is critical — it limits the serializer to JSON output. In-Python dict access still returns the unquantized `Decimal`.
- Decimal arrives as `str` from JSON inputs by Pydantic v2 default; convert via `Decimal(str(v))` (NEVER `Decimal(float)`) in any `@field_validator(mode="before")` on input schemas. This is in CLAUDE.md "Decimal Decision 2".
- The serializer returns `str`, not `Decimal`. JSON has no Decimal primitive; string preserves precision and signals to TS to treat it as `string`.

**For input schemas** (`EstimateInputs`), accept `Decimal` directly — Pydantic v2 will coerce string/number JSON. To be defensive against float-noise inputs, wrap with `mode="before"`:

```python
from pydantic import field_validator
class EstimateInputs(BaseModel):
    tagessatz_eur: MoneyDecimal

    @field_validator("tagessatz_eur", mode="before")
    @classmethod
    def _coerce_decimal(cls, v):
        if isinstance(v, float):
            raise ValueError("Decimal-Felder müssen als String oder Integer übergeben werden.")
        return Decimal(str(v))
```

[CITED: docs.pydantic.dev/latest/concepts/serialization/, github.com/pydantic/pydantic/issues/7457]
[VERIFIED: CLAUDE.md §"Decision 2: Decimal Handling for €/PT — CRITICAL"]

---

### Pattern §2 — Pure-engine layout (`engine/{__init__.py, core.py, types.py, scope.py}`)

**Files:**
- `backend/app/engine/__init__.py` — public surface
- `backend/app/engine/types.py` — Pydantic models (`EstimateInputs`, `EstimateResult`, `WeightsSnapshot`) + Decimal aliases (Pattern §1)
- `backend/app/engine/core.py` — `calculate(inputs, snapshot) -> EstimateResult`
- `backend/app/engine/scope.py` — `generate_scope_text(inputs, result, snapshot) -> str` (Jinja2 wrapper, Pattern §6)

`__init__.py`:
```python
# Source: research/ARCHITECTURE.md §Pattern 2 + CONTEXT.md D-Discretion §Engine-Layering
from app.engine.core import calculate
from app.engine.types import (
    EstimateInputs,
    EstimateResult,
    WeightsSnapshot,
    MoneyDecimal,
    PTDecimal,
)
from app.engine.scope import generate_scope_text

__all__ = [
    "calculate",
    "generate_scope_text",
    "EstimateInputs",
    "EstimateResult",
    "WeightsSnapshot",
    "MoneyDecimal",
    "PTDecimal",
]
```

`core.py` — the `calculate` function MUST be pure: no I/O, no globals, no `load_weights()` calls, no `datetime.now()`. Identical `(inputs, snapshot)` → identical `EstimateResult`.

```python
# Source: research/ARCHITECTURE.md §Pattern 2 + REQUIREMENTS.md CALC-02..07.
from decimal import Decimal
from app.engine.types import EstimateInputs, EstimateResult, WeightsSnapshot

def calculate(inputs: EstimateInputs, snapshot: WeightsSnapshot) -> EstimateResult:
    """Pure: no I/O, no global state. Identical (inputs, snapshot) -> identical result.
    Decimal end-to-end. NO quantize() inside this function — quantization happens
    only at the @field_serializer boundary (Pattern §1).
    """
    most_likely = _most_likely(inputs, snapshot)              # Decimal
    optimistic = most_likely * snapshot.pert.optimistic_factor
    pessimistic = most_likely * snapshot.pert.pessimistic_factor
    pert = (optimistic + Decimal(4) * most_likely + pessimistic) / Decimal(6)
    sigma = (pessimistic - optimistic) / Decimal(6)
    p50, p80, p90 = _confidence_intervals(pert, sigma, snapshot)
    phases = _distribute_phases(most_likely, snapshot.phase_distribution)
    total_eur = pert * inputs.tagessatz_eur
    return EstimateResult(
        most_likely_pt=most_likely,
        optimistic_pt=optimistic,
        pessimistic_pt=pessimistic,
        pert_pt=pert,
        sigma_pt=sigma,
        p50_pt=p50,
        p80_pt=p80,
        p90_pt=p90,
        phases=phases,
        total_eur=total_eur,
        # ...
    )
```

Helper functions (`_most_likely`, `_confidence_intervals`, `_distribute_phases`) live in the same module. They are private (`_` prefix), accept the snapshot as an argument, and return Decimal.

**Frozen-snapshot guarantee:** `WeightsSnapshot` is a Pydantic v2 `BaseModel` with `model_config = ConfigDict(frozen=True)` so the engine cannot accidentally mutate it.

[CITED: research/ARCHITECTURE.md lines 276–329]
[VERIFIED: CONTEXT.md D-Discretion §Engine-Layering]

---

### Pattern §3 — `import-linter` for TECH-01 layer isolation (chosen over ruff)

**Tool decision:** `import-linter` (separate, dedicated tool) over `ruff tidy-imports`. Reasons:
1. `import-linter` has a first-class `forbidden` contract type — exactly what TECH-01 asks for.
2. `ruff`'s `tidy-imports` (TID) plugin only forbids relative imports / specific module paths via lint rules; it does not have an architectural-contract concept.
3. `import-linter` runs as `lint-imports` CLI, easily added to a CI step or pre-commit hook later. ruff is fine alongside for general linting (already in our stack).

**File:** `backend/pyproject.toml` — append to existing file:

```toml
[tool.importlinter]
root_package = "app"

[[tool.importlinter.contracts]]
name = "Engine is pure — no FastAPI, no DB, no HTTP schemas"
type = "forbidden"
source_modules = [
    "app.engine",
]
forbidden_modules = [
    "app.routers",
    "app.services",
    "app.schemas",
    "app.models",   # Phase-3 namespace; safe to list now (won't exist yet — import-linter ignores unknown forbidden targets)
    "app.db",       # Phase-3 namespace; same
    "fastapi",
    "sqlalchemy",
    "alembic",
]
```

**Run:** `lint-imports` (no args — reads pyproject.toml).

**CI integration:** Add a `scripts/lint.sh` (or call from the verify task) that runs `lint-imports` after `ruff check` and `pytest`. Non-zero exit means contract violation.

**False-positive avoidance:** `engine/` imports `pydantic` directly — that is **allowed and required** (engine uses Pydantic models for type-safety on its own dataclasses). Do NOT list `pydantic` in `forbidden_modules`. Engine also imports `decimal`, `typing`, etc. — stdlib is always allowed.

[CITED: import-linter.readthedocs.io/en/stable/contract_types/forbidden/]
[CITED: github.com/seddonym/import-linter]
[ASSUMED for version]: `import-linter` v2.x stable as of late 2025; planner must run `pip index versions import-linter` to pin.

---

### Pattern §4 — Hypothesis property tests for engine determinism

**File:** `backend/tests/engine/test_determinism.py`

Three test layers per CONTEXT.md D-Discretion §Engine-Test-Strategie:

```python
# Source: hypothesis.readthedocs.io (CITED) + CONTEXT.md D-Discretion §Engine-Test-Strategie
import json
from decimal import Decimal
from pathlib import Path
from hypothesis import given, strategies as st, settings
from app.engine import calculate, EstimateInputs, WeightsSnapshot

# A fixed valid snapshot used in property tests (loaded once at module level).
_FIXED_SNAPSHOT = WeightsSnapshot.model_validate_json(
    (Path(__file__).parent.parent / "fixtures" / "snapshot_default.json").read_text()
)

# Strategy that builds a valid EstimateInputs with bounded ranges matching REQUIREMENTS.md
# PARAM-01..08 (e.g. pages 0..10000, languages 1..10, roles 1..30).
_INPUT_STRATEGY = st.builds(
    EstimateInputs,
    pages=st.integers(min_value=0, max_value=10_000),
    pages_complexity=st.sampled_from(["low", "medium", "high", "very_high"]),
    use_cases=st.integers(min_value=0, max_value=10_000),
    use_cases_complexity=st.sampled_from(["low", "medium", "high", "very_high"]),
    # ... all other params
    languages=st.integers(min_value=1, max_value=10),
    roles=st.integers(min_value=1, max_value=30),
    concurrent_users_band=st.sampled_from(["<50", "50-200", "201-1000", "1001-10000", ">10000"]),
    factor_tech=st.sampled_from(["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]),
    factor_team=st.sampled_from(["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]),
    factor_quality=st.sampled_from(["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]),
    factor_doc=st.sampled_from(["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]),
    project_type=st.sampled_from(["neuentwicklung", "erweiterung", "migration", "legacy_migration"]),
    tagessatz_eur=st.decimals(min_value=Decimal("100"), max_value=Decimal("5000"),
                              places=2, allow_nan=False, allow_infinity=False),
    # ... etc
)

@given(inputs=_INPUT_STRATEGY)
@settings(max_examples=200, deadline=2000)  # 200 rounds in CI; 2s budget per call
def test_calculate_is_deterministic(inputs: EstimateInputs):
    """Identical (inputs, snapshot) -> identical result (TECH-01, CALC-07)."""
    r1 = calculate(inputs, _FIXED_SNAPSHOT)
    r2 = calculate(inputs, _FIXED_SNAPSHOT)
    # Compare on canonical JSON output to catch any non-determinism in
    # field order, None-vs-missing, etc.
    assert r1.model_dump_json() == r2.model_dump_json()

def test_calculate_no_io_in_engine(tmp_path, monkeypatch):
    """Engine must not perform I/O. Patch open/Path.read_text and assert calculate runs."""
    import builtins
    real_open = builtins.open
    def trap(*a, **kw):
        raise AssertionError(f"engine.calculate() performed I/O via open({a!r}, {kw!r})")
    monkeypatch.setattr(builtins, "open", trap)
    inputs = EstimateInputs.model_validate_json(
        (Path(__file__).parent.parent / "fixtures" / "inputs_typical.json").read_text()
    )
    monkeypatch.setattr(builtins, "open", trap)  # re-arm after fixture read
    result = calculate(inputs, _FIXED_SNAPSHOT)  # must not raise
    assert result is not None

def test_golden_fixtures():
    """5 hand-computed estimates — locked expectations (REPRO-01 spirit)."""
    golden_path = Path(__file__).parent.parent / "fixtures" / "golden_estimates.json"
    cases = json.loads(golden_path.read_text())
    for case in cases:
        inputs = EstimateInputs.model_validate(case["inputs"])
        snapshot = WeightsSnapshot.model_validate(case["snapshot"])
        expected = case["expected_result_json"]  # already-quantized string output
        result_json = json.loads(calculate(inputs, snapshot).model_dump_json())
        for key, expected_value in expected.items():
            assert result_json[key] == expected_value, (
                f"Case {case['name']}: {key} expected {expected_value!r}, got {result_json[key]!r}"
            )
```

**Golden-fixtures format** (`backend/tests/fixtures/golden_estimates.json`):
```json
[
  {
    "name": "Kleine Erweiterung — alle Faktoren neutral",
    "inputs": { "pages": 5, "pages_complexity": "medium", "...": "..." },
    "snapshot": { "...full WeightsSnapshot..." },
    "expected_result_json": {
      "pert_pt": "12.3",
      "p80_pt": "14.5",
      "total_eur": "14760.00"
    }
  },
  ...
]
```

Planner should create 5 cases by hand-calculation; the executor verifies them. These act as a regression net: any change to the formula or weight defaults that shifts a number trips the test.

[CITED: hypothesis.readthedocs.io/en/latest/quickstart.html]
[CITED: CONTEXT.md D-Discretion §Engine-Test-Strategie]

---

### Pattern §5 — Decimal-drift test (proves Decimal beats float over 7-fold multiplication)

**File:** `backend/tests/engine/test_decimal_drift.py`

```python
# Source: research/PITFALLS.md Pitfall #1 + CALC-06.
from decimal import Decimal, ROUND_HALF_UP

# The 7 factors used in a typical ML calculation:
# Tech, Team, Quality, Doc, ProjectType, LanguagesFactor, RolesFactor, UserFactor.
_FACTORS_AS_DECIMAL = [Decimal(s) for s in
    ("1.10", "1.05", "0.95", "1.20", "1.15", "1.00", "1.08", "0.90")
]
_FACTORS_AS_FLOAT = [float(s) for s in
    ("1.10", "1.05", "0.95", "1.20", "1.15", "1.00", "1.08", "0.90")
]

def _multiply(seq):
    acc = seq[0]
    for v in seq[1:]:
        acc = acc * v
    return acc

def test_decimal_path_is_stable():
    """Two passes of Decimal multiplication produce bit-identical results."""
    a = _multiply(_FACTORS_AS_DECIMAL)
    b = _multiply(_FACTORS_AS_DECIMAL)
    assert a == b  # exact equality on Decimal
    # And the result quantizes cleanly:
    assert a.quantize(Decimal("0.0000000001"), rounding=ROUND_HALF_UP) == a.quantize(
        Decimal("0.0000000001"), rounding=ROUND_HALF_UP
    )

def test_float_path_drifts_at_quantize_boundary():
    """Float drift accumulates to a detectable difference vs Decimal."""
    decimal_result = _multiply(_FACTORS_AS_DECIMAL)
    float_result = _multiply(_FACTORS_AS_FLOAT)
    # Convert float to Decimal via str(...) to avoid contaminating the comparison.
    float_as_decimal = Decimal(repr(float_result))
    # Float MUST drift from the exact Decimal result. If they ever match exactly,
    # the test is wrong (or the values aren't pathological enough — change them).
    assert decimal_result != float_as_decimal, (
        "Expected float to drift from Decimal — if they match, the test setup "
        "isn't surfacing the float bug. Adjust factors to a more pathological set."
    )
    # The drift is in the noise floor (~1e-15) but real:
    drift = abs(decimal_result - float_as_decimal)
    assert drift > Decimal("0") and drift < Decimal("1e-13")
```

[CITED: research/PITFALLS.md Pitfall #1, lines 13–35]
[CITED: docs.python.org/3/library/decimal.html]

---

### Pattern §6 — Jinja2 in FastAPI for scope-text generation

**Files:**
- `backend/app/engine/scope.py` — generator function (lives in engine because pure)
- `backend/app/templates/scope_text.de.j2` — German Jinja2 template

`scope.py`:
```python
# Source: jinja.palletsprojects.com/en/3.1.x/api/#jinja2.PackageLoader +
# CONTEXT.md D-Discretion §Scope-Text-Generierung.
from functools import lru_cache
from jinja2 import Environment, PackageLoader, select_autoescape
from app.engine.types import EstimateInputs, EstimateResult, WeightsSnapshot

@lru_cache(maxsize=1)
def _env() -> Environment:
    return Environment(
        loader=PackageLoader("app", "templates"),
        autoescape=select_autoescape(disabled_extensions=("j2",), default_for_string=False),
        # Phase 2: scope text is plain text (not HTML), no autoescape needed.
        # Phase 4 will load HTML templates with autoescape=True for PDF.
        trim_blocks=True,
        lstrip_blocks=True,
    )

def generate_scope_text(
    inputs: EstimateInputs,
    result: EstimateResult,
    snapshot: WeightsSnapshot,
) -> str:
    """Generate German scope text. Pure function — given fixed args, identical output."""
    tmpl = _env().get_template("scope_text.de.j2")
    return tmpl.render(inputs=inputs, result=result, snapshot=snapshot)
```

**Note about purity:** `lru_cache` on `_env()` makes the Environment a singleton — that's an in-memory cache, not I/O. The function itself is still pure given identical args (it always returns the same Environment object, and templates are read-once-cached by Jinja2 internally).

**Template** `backend/app/templates/scope_text.de.j2` (skeleton — planner crafts the full German prose):
```jinja
Projekt {{ inputs.projektname }} ({{ inputs.projekttyp }})
{% if inputs.kundenname %}Kunde: {{ inputs.kundenname }}{% endif %}

Umfang:
{{ inputs.skizze }}

Aufwand:
PERT-Schätzung: {{ result.pert_pt }} PT
Konfidenz-Intervalle: P50 = {{ result.p50_pt }} PT, P80 = {{ result.p80_pt }} PT, P90 = {{ result.p90_pt }} PT
Gesamt-Aufwand: {{ result.total_eur }} € (bei Tagessatz {{ inputs.tagessatz_eur }} €)

{% if inputs.annahmen %}Annahmen:
{{ inputs.annahmen }}{% endif %}

{% if inputs.ausschluesse %}Nicht enthalten ist:
{{ inputs.ausschluesse }}{% endif %}

{% set risk_factors = [] %}
{% for f in result.aktive_faktoren if f.multiplikator > 1.15 %}
  {% set _ = risk_factors.append(f) %}
{% endfor %}
{% if risk_factors %}Risikoindikatoren:
{% for f in risk_factors %}- Faktor {{ f.anzeigename }} ist auf "{{ f.stufen_label }}" eingestellt (Multiplikator ×{{ f.multiplikator }}).
{% endfor %}{% endif %}
```

The Decimal values render via Pydantic's `__str__` — but be aware: `str(Decimal("102.30000"))` returns `"102.30000"`. To render the already-quantized display value, pre-compute formatted strings before passing to the template, OR call `.quantize(...)` inside the template via a custom filter. **Recommended:** pre-compute and attach to the `result` object as already-quantized strings, OR render the template AFTER `model_dump_json()` and pass the dumped dict (already quantized). Planner picks.

**Risk-banner copy** must match UI-SPEC.md §Risk-Banner literally (German wording locked).

[CITED: jinja.palletsprojects.com/en/3.1.x/api/#jinja2.PackageLoader]
[CITED: CONTEXT.md D-Discretion §Scope-Text-Generierung]

---

### Pattern §7 — `WeightsLoader` service (per-request fresh read, no cache)

**File:** `backend/app/services/weights_loader.py`

```python
# Source: CONTEXT.md D-07 (Pro-Request Read-and-Parse, no cache in Phase 2).
import json
from pathlib import Path
from app.engine.types import WeightsSnapshot

class WeightsLoader:
    """Phase-2 implementation: fresh read on every load().
    Phase 5 (ADMIN-11) extends with mtime-based cache + invalidation.
    """

    def __init__(self, config_path: Path):
        self._path = config_path

    def load(self) -> WeightsSnapshot:
        """Read + Pydantic-validate. Raises FileNotFoundError or pydantic.ValidationError."""
        raw = self._path.read_text(encoding="utf-8")
        # Decimal-safe: model_validate_json sends through Pydantic's parser which
        # respects MoneyDecimal/PTDecimal Annotated types (no float coercion).
        return WeightsSnapshot.model_validate_json(raw)
```

**Wired via FastAPI dependency** (`backend/app/routers/estimates.py`):
```python
from fastapi import Depends
from pathlib import Path
from app.services.weights_loader import WeightsLoader
from app.engine import calculate, generate_scope_text, EstimateInputs

# Module-level: path comes from env (CONFIG_DIR/weights.json).
import os
_CONFIG_PATH = Path(os.getenv("CONFIG_DIR", "./config")) / "weights.json"
_loader = WeightsLoader(_CONFIG_PATH)

def get_weights_loader() -> WeightsLoader:
    return _loader

@router.post("/estimates", response_model=EstimateResultResponse)
def create_estimate(
    payload: EstimateInputs,
    loader: WeightsLoader = Depends(get_weights_loader),
) -> EstimateResultResponse:
    snapshot = loader.load()                       # fresh per request
    result = calculate(payload, snapshot)          # pure
    scope_text = generate_scope_text(payload, result, snapshot)
    return EstimateResultResponse(
        result=result,
        snapshot=snapshot,    # REPRO-01: full snapshot back to client
        scope_text=scope_text,
    )
```

**Performance note:** `weights.json` < 5KB, Pydantic-validate < 1ms — far inside DASH-10 (<1s) budget per CONTEXT.md D-07.

[CITED: CONTEXT.md D-07]
[CITED: research/ARCHITECTURE.md §Pattern 4 (mtime version comes in Phase 5)]

---

### Pattern §8 — First-run seed via FastAPI lifespan handler

**File:** `backend/app/main.py` — modify existing file.

FastAPI 0.110+ deprecated `@app.on_event("startup")` in favor of the `lifespan` async context manager.

```python
# Source: fastapi.tiangolo.com/advanced/events/ (CITED).
# Replaces deprecated @app.on_event("startup").
import shutil
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI

log = logging.getLogger(__name__)

BUNDLED_DEFAULTS = Path(__file__).parent / "data" / "weights.default.json"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed config if missing (CONTEXT.md D-06).
    import os
    config_dir = Path(os.getenv("CONFIG_DIR", "./config"))
    config_dir.mkdir(parents=True, exist_ok=True)
    target = config_dir / "weights.json"
    if not target.exists():
        if not BUNDLED_DEFAULTS.exists():
            log.error("Bundled defaults not found at %s — install error?", BUNDLED_DEFAULTS)
            raise RuntimeError(f"Missing bundled defaults: {BUNDLED_DEFAULTS}")
        shutil.copyfile(BUNDLED_DEFAULTS, target)
        log.info("Seeded %s from bundled defaults.", target)
    else:
        log.info("Using existing %s — no seeding needed.", target)
    yield
    # Shutdown: nothing in Phase 2.

app = FastAPI(
    title="Estimation Manager — Backend",
    version=__version__,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)
```

**Container-data-path:** `backend/app/data/weights.default.json` must be included in the Dockerfile `COPY app /app/app` — already the case since `app/` is copied wholesale.

`uv sync --no-editable` packages may strip non-Python files; verify by ensuring `app/data/weights.default.json` exists in the built image (`docker run --rm <image> ls /app/app/data/`). If hatchling strips it, add to `pyproject.toml`:

```toml
[tool.hatch.build.targets.wheel]
packages = ["app"]
include = ["app/data/*.json", "app/templates/*.j2"]
```

[CITED: fastapi.tiangolo.com/advanced/events/]
[VERIFIED: CONTEXT.md D-06]

---

### Pattern §9 — `weights.default.json` schema (canonical structure)

The `WeightsSnapshot` Pydantic model is the schema spec. The file must contain:

| Section | Field | Type | Description |
|---------|-------|------|-------------|
| `base_weights` | `pages`, `use_cases`, `business_objects`, `interfaces`, `batches` | dict[Complexity, Decimal] | 5 parameters × 4 complexities (low/medium/high/very_high) = 20 values |
| `correction_factors` | `tech`, `team`, `quality`, `doc` | dict[Stufe, Decimal] | 4 factor tables × 5 levels (sehr_guenstig/guenstig/neutral/unguenstig/sehr_unguenstig) = 20 values |
| `project_type_factors` | `neuentwicklung`, `erweiterung`, `migration`, `legacy_migration` | dict[str, Decimal] | 4 values |
| `pert` | `optimistic_factor` (=0.75), `pessimistic_factor` (=1.55) | dict[str, Decimal] | 2 values, CALC-03 |
| `phase_distribution` | `anforderungen` (0.12), `architektur` (0.15), `implementierung` (0.42), `test` (0.18), `deployment` (0.05), `pm` (0.08) | dict[str, Decimal] | 6 values, sum = 1.00 exactly (CALC-05 + Pitfall #8) |
| `languages_curve` | function or array mapping `int -> Decimal` for languages 1..10 | dict[int, Decimal] OR formula constants | PARAM-06; planner picks shape |
| `user_range_factors` | dict[Band, Decimal] | dict[str, Decimal] | 5 bands per PARAM-08 |
| `roles_factor` | dict OR formula | dict[int, Decimal] OR constants | PARAM-07 |
| `schema_version` | `1` (integer) | int | Pitfall #3 — version field for forward-compat |

**Pydantic model** (`backend/app/engine/types.py`):
```python
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Complexity = Literal["low", "medium", "high", "very_high"]
Stufe = Literal["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"]
ProjectType = Literal["neuentwicklung", "erweiterung", "migration", "legacy_migration"]
UserBand = Literal["<50", "50-200", "201-1000", "1001-10000", ">10000"]

class BaseWeights(BaseModel):
    model_config = ConfigDict(frozen=True)
    pages: dict[Complexity, Decimal]
    use_cases: dict[Complexity, Decimal]
    business_objects: dict[Complexity, Decimal]
    interfaces: dict[Complexity, Decimal]
    batches: dict[Complexity, Decimal]

class PhaseDistribution(BaseModel):
    model_config = ConfigDict(frozen=True)
    anforderungen: Decimal
    architektur: Decimal
    implementierung: Decimal
    test: Decimal
    deployment: Decimal
    pm: Decimal

    @field_validator("*")
    @classmethod
    def _decimal_from_str(cls, v):
        return Decimal(str(v))

    def total(self) -> Decimal:
        return self.anforderungen + self.architektur + self.implementierung + \
               self.test + self.deployment + self.pm

class WeightsSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)
    schema_version: int = 1
    base_weights: BaseWeights
    correction_factors: dict[Literal["tech", "team", "quality", "doc"], dict[Stufe, Decimal]]
    project_type_factors: dict[ProjectType, Decimal]
    pert: dict[Literal["optimistic_factor", "pessimistic_factor"], Decimal]
    phase_distribution: PhaseDistribution
    languages_curve: dict[int, Decimal]
    user_range_factors: dict[UserBand, Decimal]
    roles_factor: dict[int, Decimal]

    @field_validator("phase_distribution")
    @classmethod
    def _phase_sum_100(cls, v: PhaseDistribution):
        # Pitfall #8 — sum must be exactly 1.00 (Decimal).
        if v.total() != Decimal("1.00"):
            raise ValueError(f"phase_distribution must sum to 1.00, got {v.total()}")
        return v
```

**Canonical default values** (planner refines exact numbers; the structure is fixed):
```json
{
  "schema_version": 1,
  "base_weights": {
    "pages": {"low": "0.5", "medium": "1.0", "high": "2.0", "very_high": "3.5"},
    "use_cases": {"low": "1.0", "medium": "2.0", "high": "4.0", "very_high": "7.0"},
    "business_objects": {"low": "0.3", "medium": "0.8", "high": "1.5", "very_high": "3.0"},
    "interfaces": {"low": "1.5", "medium": "3.0", "high": "6.0", "very_high": "10.0"},
    "batches": {"low": "0.8", "medium": "1.8", "high": "3.5", "very_high": "6.0"}
  },
  "correction_factors": {
    "tech":    {"sehr_guenstig": "0.85", "guenstig": "0.95", "neutral": "1.00", "unguenstig": "1.15", "sehr_unguenstig": "1.30"},
    "team":    {"sehr_guenstig": "0.85", "guenstig": "0.95", "neutral": "1.00", "unguenstig": "1.15", "sehr_unguenstig": "1.30"},
    "quality": {"sehr_guenstig": "0.90", "guenstig": "0.95", "neutral": "1.00", "unguenstig": "1.20", "sehr_unguenstig": "1.40"},
    "doc":     {"sehr_guenstig": "0.95", "guenstig": "1.00", "neutral": "1.05", "unguenstig": "1.20", "sehr_unguenstig": "1.35"}
  },
  "project_type_factors": {
    "neuentwicklung": "1.00", "erweiterung": "0.85", "migration": "1.10", "legacy_migration": "1.30"
  },
  "pert": {"optimistic_factor": "0.75", "pessimistic_factor": "1.55"},
  "phase_distribution": {
    "anforderungen": "0.12", "architektur": "0.15", "implementierung": "0.42",
    "test": "0.18", "deployment": "0.05", "pm": "0.08"
  },
  "languages_curve": {"1": "1.00", "2": "1.05", "3": "1.10", "4": "1.15", "5": "1.20", "6": "1.25", "7": "1.30", "8": "1.35", "9": "1.40", "10": "1.45"},
  "user_range_factors": {"<50": "0.95", "50-200": "1.00", "201-1000": "1.05", "1001-10000": "1.15", ">10000": "1.30"},
  "roles_factor": {"1": "0.95", "5": "1.00", "10": "1.05", "20": "1.15", "30": "1.30"}
}
```

**These default values are [ASSUMED] — they are illustrative, not derived from a specific consulting methodology.** Planner should flag a `checkpoint:human-verify` task to let the user adjust them before they become part of the bundled image. Engine correctness tests should use a `golden_estimates.json` whose expected outputs were hand-calculated against this exact file.

[VERIFIED: REQUIREMENTS.md REPRO-01 + CALC-01..05 + PARAM-01..08]
[ASSUMED: specific default numbers — planner must surface for user confirmation]

---

## Frontend Patterns

> All paths absolute from `/Users/florianblauensteiner/Documents/claude_projects/EstimationManager/frontend/`.

### Pattern §10 — shadcn init non-interactive on Tailwind v4 + React 19

**Wave-order is critical** — these steps MUST happen in this sequence or `pnpm dlx shadcn@latest init` asks interactive questions and stalls:

**Step 1 — Pre-configure path alias** in BOTH `tsconfig.json` and `tsconfig.app.json`:

`frontend/tsconfig.json` (root):
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`frontend/tsconfig.app.json` — add to existing `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Step 2 — Add `path` alias to Vite config** (`frontend/vite.config.ts` — modify existing):
```typescript
import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: false } },
  },
  build: { outDir: "dist", sourcemap: false },
})
```

`node:path` works because `@types/node` is already in devDependencies (Phase-1 lessons learned, see `01-03-SUMMARY.md`).

**Step 3 — Run shadcn init non-interactively:**
```bash
cd frontend
pnpm dlx shadcn@latest init --base-color slate --style new-york --css-variables --yes
```

Flags:
- `--base-color slate` — CONTEXT.md D-Discretion + UI-SPEC.md
- `--style new-york` — CONTEXT.md + shadcn-CLI 3.x default
- `--css-variables` — adds CSS variables to `src/index.css` (UI-SPEC §Color uses them)
- `--yes` — skip confirmation prompts

**Step 4 — Verify outputs:**
- `frontend/components.json` created (committed; flips `shadcn_initialized: false` → `true` in UI-SPEC.md frontmatter)
- `frontend/src/lib/utils.ts` created with `cn()` helper (clsx + tailwind-merge wrapper)
- `frontend/src/index.css` modified — Tailwind import + CSS-variable theme block

**Step 5 — Add the 10 required components:**
```bash
pnpm dlx shadcn@latest add card input select textarea label button tooltip form alert popover --yes
```

Each command writes a file to `frontend/src/components/ui/<component>.tsx`. These files become part of the project source — they are not npm dependencies.

**Custom `--warning` token** for the risk banner (UI-SPEC §Color) — append to `frontend/src/index.css` `@theme` block after init:
```css
@theme inline {
  --color-warning-bg: oklch(0.985 0.045 92);     /* amber-50 */
  --color-warning-border: oklch(0.732 0.176 60); /* amber-500 */
  --color-warning-text: oklch(0.382 0.130 60);   /* amber-800 */
}
```

The shadcn `alert` component variant is then extended in the component file itself to recognize `variant="warning"`.

[CITED: ui.shadcn.com/docs/installation/vite]
[CITED: ui.shadcn.com/docs/tailwind-v4]
[VERIFIED: CONTEXT.md D-02 + D-Discretion §shadcn-Variante + UI-SPEC.md §Design System]

---

### Pattern §11 — shadcn Form + react-hook-form 7.76 + zod 4 wire-up

**File:** `frontend/src/features/estimate/schema.ts` — zod schema mirroring Pydantic.

```typescript
// Source: research/STACK.md §Frontend + CONTEXT.md D-Discretion §Pydantic-Schema-Struktur
// Mirror of backend EstimateInputs (TECH-04: same shape on both sides).
import { z } from "zod"

const COMPLEXITY = ["low", "medium", "high", "very_high"] as const
const STUFE = ["sehr_guenstig", "guenstig", "neutral", "unguenstig", "sehr_unguenstig"] as const
const PROJECT_TYPE = ["neuentwicklung", "erweiterung", "migration", "legacy_migration"] as const
const USER_BAND = ["<50", "50-200", "201-1000", "1001-10000", ">10000"] as const

export const estimateInputsSchema = z.object({
  // Stammdaten
  projektname: z.string().min(1, "Pflichtfeld.").max(200, "Maximum 200 Zeichen."),
  projekttyp: z.enum(PROJECT_TYPE, { message: "Pflichtfeld." }),
  skizze: z.string().max(600, "Text überschreitet das Maximum von 600 Zeichen.").default(""),
  kundenname: z.string().max(200).optional(),
  projekt_id: z.string().max(50).optional(),
  valid_until: z.string()  // ISO date "YYYY-MM-DD" — Pydantic parses to date
    .refine(v => !v || new Date(v) >= new Date(new Date().toDateString()),
            "Gültigkeit-bis darf nicht in der Vergangenheit liegen."),
  erstellt_von: z.string().min(1, "Pflichtfeld."),
  tagessatz_eur: z.string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Bitte gültiges Format eingeben.")
    .refine(v => Number(v.replace(",", ".")) > 0, "Tagessatz muss größer als 0 sein."),
  // Parameter
  pages: z.coerce.number().int().min(0).max(10_000),
  pages_complexity: z.enum(COMPLEXITY, { message: "Pflichtfeld." }),
  // ... use_cases, business_objects, interfaces, batches likewise
  languages: z.coerce.number().int().min(1).max(10),
  roles: z.coerce.number().int().min(1).max(30),
  concurrent_users_band: z.enum(USER_BAND, { message: "Pflichtfeld." }),
  // Faktoren (NO defaults — Anti-Anchoring)
  factor_tech: z.enum(STUFE, { message: "Pflichtfeld." }),
  factor_team: z.enum(STUFE, { message: "Pflichtfeld." }),
  factor_quality: z.enum(STUFE, { message: "Pflichtfeld." }),
  factor_doc: z.enum(STUFE, { message: "Pflichtfeld." }),
  // Text
  annahmen: z.string().max(1500, "Text überschreitet das Maximum von 1500 Zeichen.").default(""),
  ausschluesse: z.string().max(1500, "Text überschreitet das Maximum von 1500 Zeichen.").default(""),
})

export type EstimateInputs = z.infer<typeof estimateInputsSchema>
```

**Note on zod 4 + @hookform/resolvers compat:** zod 4 made internal type-generic changes that cause `Resolver<input<T>, ...>` vs `Resolver<output<T>, ...>` mismatches in `useForm<z.infer<typeof schema>>()`. Pitfall §R-6 lists the workarounds. The recommended workaround is to declare `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>()` explicitly OR import from `zod/v4`:
```typescript
import { z } from "zod/v4"   // alternative import if zod 4 default-export drifts
```

**File:** `frontend/src/features/estimate/EstimateFormPage.tsx`

```typescript
// Source: ui.shadcn.com/docs/components/form (v3 reference, current pattern still valid)
"use client" // safe under Vite (no-op)
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { estimateInputsSchema, type EstimateInputs } from "./schema"
import { postEstimate } from "@/api/estimate"

const LAST_CREATOR_KEY = "estimation:last_creator"

export default function EstimateFormPage() {
  const navigate = useNavigate()

  const form = useForm<EstimateInputs>({
    resolver: zodResolver(estimateInputsSchema),
    mode: "onBlur",                    // validate on blur; live for char counters
    defaultValues: {
      projektname: "",
      skizze: "",
      erstellt_von: localStorage.getItem(LAST_CREATOR_KEY) ?? "",
      // NOTE: NO defaults for projekttyp, all factor_*, all *_complexity, concurrent_users_band
      // (Anti-Anchoring per CONTEXT.md D-Discretion + Phase-1 D-01 + Pitfall #17)
      pages: 0,
      use_cases: 0,
      business_objects: 0,
      interfaces: 0,
      batches: 0,
      languages: 1,
      roles: 1,
      annahmen: "",
      ausschluesse: "",
      tagessatz_eur: "",
    },
  })

  const mutation = useMutation({
    mutationFn: postEstimate,
    onSuccess: (data, variables) => {
      localStorage.setItem(LAST_CREATOR_KEY, variables.erstellt_von)
      navigate("/result", { state: { result: data, inputs: variables } })
    },
  })

  const requiredErrorCount = Object.keys(form.formState.errors).length

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <main className="max-w-4xl mx-auto px-4 py-6 pb-32 space-y-6">
          {/* Card 1 — Stammdaten */}
          <Card>
            <CardHeader><CardTitle>Stammdaten</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projektname"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Projektname <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* ... rest of Stammdaten fields ... */}
            </CardContent>
          </Card>
          {/* Cards 2, 3, 4 — analogous */}
          {mutation.isError && (
            <Alert variant="destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Berechnung fehlgeschlagen. Bitte erneut versuchen."}
            </Alert>
          )}
        </main>
        <footer className="fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-50">
          <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
            {requiredErrorCount > 0 && (
              <span className="text-sm text-slate-500">
                {requiredErrorCount} {requiredErrorCount === 1 ? "Pflichtfeld" : "Pflichtfelder"} fehlen
              </span>
            )}
            <Button type="submit" disabled={!form.formState.isValid || mutation.isPending} className="min-w-32">
              {mutation.isPending ? "Wird berechnet …" : "Berechnen"}
            </Button>
          </div>
        </footer>
      </form>
    </Form>
  )
}
```

[CITED: v3.shadcn.com/docs/components/form — verified via WebFetch in this research]
[VERIFIED: CLAUDE.md §react-hook-form 7.76 + zod 4 + @hookform/resolvers 5.2]

---

### Pattern §12 — Anti-Anchoring required Select (no default, placeholder)

shadcn `Select` is a Radix wrapper. The Anti-Anchoring rule (CONTEXT.md D-01 + Phase-1 D-01 + Pitfall #17) means: no `defaultValue` in the form, no preselected `SelectItem`, placeholder text `— Bitte wählen —`.

```typescript
<FormField
  control={form.control}
  name="factor_tech"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Technologie-Reife <span className="text-destructive">*</span></FormLabel>
      <Select onValueChange={field.onChange} value={field.value} >
        <FormControl>
          <SelectTrigger aria-required="true">
            <SelectValue placeholder="— Bitte wählen —" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="sehr_guenstig">Sehr günstig</SelectItem>
          <SelectItem value="guenstig">Günstig</SelectItem>
          <SelectItem value="neutral">Neutral</SelectItem>
          <SelectItem value="unguenstig">Ungünstig</SelectItem>
          <SelectItem value="sehr_unguenstig">Sehr ungünstig</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Critical:** `field.value` defaults to `undefined` (because the zod schema is `z.enum(STUFE)` without `.default(...)`); Radix Select renders the placeholder when value is undefined.

If the planner adds `defaultValues: { factor_tech: "neutral" }` to `useForm`, the Anti-Anchoring contract is violated. Wave-2 verification step: grep `factor_` and `_complexity` in `defaultValues` and assert none have non-empty default strings.

[VERIFIED: CONTEXT.md D-01 + Phase-1 D-01 + Pitfall #17]

---

### Pattern §13 — react-router 7 data-router setup

**File:** `frontend/src/main.tsx` — replace existing.

```typescript
// Source: reactrouter.com/start/data/installation (verified via WebFetch)
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

const root = document.getElementById("root")!
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

**`App.tsx` is deprecated** — root layout responsibility moves to each page component. If a shared header is needed, wrap routes with a parent layout:

```typescript
const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,    // <Outlet /> renders children
    children: [
      { index: true, loader: () => redirect("/new") },
      { path: "new", element: <EstimateFormPage /> },
      { path: "result", element: <ResultDashboardPage /> },
    ],
  },
])
```

**Note about Browser-Back state preservation** (UI-SPEC §Routing contract):
- Default react-router behavior unmounts a route's component on navigation away
- To preserve form values, either (a) keep the form state in a `useForm` higher up (in the layout) and pass `form` down via context, OR (b) accept that "back from /result" loses form state for now and add localStorage-backed form-state persistence in Phase 3
- UI-SPEC requires only the observable contract: "back from /result shows previously-entered values". Planner picks impl.

[CITED: reactrouter.com/start/data/installation]
[VERIFIED: CONTEXT.md D-05]

---

### Pattern §14 — `@tanstack/react-query` mutation for form submit

**File:** `frontend/src/api/estimate.ts` — wraps existing `client.ts` pattern.

```typescript
// Source: tanstack.com/query/latest/docs/framework/react/guides/mutations
import type { EstimateInputs } from "@/features/estimate/schema"

export interface EstimateResultResponse {
  result: {
    pert_pt: string         // Decimal-as-string (CLAUDE.md TECH-02)
    p50_pt: string
    p80_pt: string
    p90_pt: string
    sigma_pt: string
    most_likely_pt: string
    optimistic_pt: string
    pessimistic_pt: string
    total_eur: string
    phases: Array<{ name: string; anteil: string; pt: string; eur: string }>
    aktive_faktoren: Array<{ kategorie: string; anzeigename: string; stufen_label: string; multiplikator: string }>
  }
  snapshot: unknown   // REPRO-01: full snapshot returned, but Phase 2 only stores it in location.state
  scope_text: string
}

export async function postEstimate(inputs: EstimateInputs): Promise<EstimateResultResponse> {
  const res = await fetch("/api/estimates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  })
  if (!res.ok) {
    if (res.status === 422) {
      const detail = await res.json().catch(() => null)
      const firstMessage = detail?.detail?.[0]?.msg ?? "Eingabe ungültig."
      throw new Error(`Eingabe ungültig: ${firstMessage}.`)
    }
    if (res.status === 500) throw new Error("Serverfehler. Bitte den Administrator informieren.")
    throw new Error("Berechnung fehlgeschlagen. Bitte erneut versuchen.")
  }
  return res.json() as Promise<EstimateResultResponse>
}
```

**Mutation usage** (already shown in Pattern §11 — `useMutation({ mutationFn: postEstimate, onSuccess: navigate(...) })`).

Error messages in `onError` are surfaced via the inline `<Alert variant="destructive">` per UI-SPEC §Error states. The Alert text comes from `mutation.error.message`, which we set explicitly in `postEstimate` for the three known HTTP-status branches.

[CITED: tanstack.com/query/latest/docs/framework/react/guides/mutations]
[VERIFIED: CLAUDE.md §TanStack Query 5.100.x]

---

### Pattern §15 — Decimal-as-string in JSON, German format helpers

**File:** `frontend/src/lib/format.ts` — new file.

```typescript
// Source: UI-SPEC.md §German format examples (locked) + TECH-02 (Decimal as string)
// CRITICAL: Number(str) ONLY inside Intl formatter call; never store the parsed number.
// (TECH-02 + Pitfall #2: avoiding Decimal → JS Number → Decimal round-trip)

const ptFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const multiplierFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** "102.3" -> "102,3 PT" */
export const formatPT = (decimalString: string): string =>
  `${ptFormatter.format(Number(decimalString))} PT`

/** "15480.75" -> "15.480,75 €" */
export const formatEur = (decimalString: string): string =>
  euroFormatter.format(Number(decimalString))

/** "1.05" -> "×1,05" */
export const formatMultiplier = (decimalString: string): string =>
  `×${multiplierFormatter.format(Number(decimalString))}`

/** "2026-12-31" -> "31.12.2026" */
export const formatDate = (isoDate: string): string =>
  dateFormatter.format(new Date(isoDate))

/** 0.42 -> "42 %" (NB: U+00A0 non-breaking space) */
export const formatPercent = (frac: number): string =>
  percentFormatter.format(frac).replace(" ", " ")
```

`Number(decimalString)` is safe here because:
1. The string was already quantized server-side to 1 or 2 decimals (`@field_serializer`), so JS-number precision (15+ significant digits) is far above what we need
2. We use it ONLY for display, never store it back

[VERIFIED: UI-SPEC.md §German format examples + CLAUDE.md "Decimal Decision 2"]

---

### Pattern §16 — localStorage pre-fill in react-hook-form

Shown inline in Pattern §11:
```typescript
defaultValues: {
  erstellt_von: localStorage.getItem("estimation:last_creator") ?? "",
  ...
}
```

And in `onSuccess`:
```typescript
onSuccess: (data, variables) => {
  localStorage.setItem("estimation:last_creator", variables.erstellt_von)
  navigate("/result", { state: { result: data, inputs: variables } })
},
```

**Storage-key contract:** `estimation:last_creator` — pick this key once and document it. Phase 3 will add `estimation:filter_state` for the history page; namespace prefix `estimation:` keeps localStorage from colliding with other apps on the same origin.

**Edge case:** If a user clears localStorage mid-session, `field.value` is the form-state value, not the deleted localStorage. That's correct (form-state is authoritative once mounted). Localstorage is read once at mount.

[VERIFIED: INPUT-07 + CONTEXT.md §specifics §Erstellt-von Pre-Fill]

---

### Pattern §17 — Live char counter

```typescript
import { useWatch } from "react-hook-form"

function CharCounter({ name, max, control }: { name: string; max: number; control: any }) {
  const value = useWatch({ control, name }) ?? ""
  const len = (value as string).length
  const colorClass =
    len > max ? "text-red-600" :
    len >= max * 0.95 ? "text-amber-600" :
    "text-slate-500"
  return (
    <div className={`text-sm text-right ${colorClass} font-normal tabular-nums`}>
      {len} / {max}
    </div>
  )
}

// Usage inside the textarea FormItem:
<FormField
  control={form.control}
  name="skizze"
  render={({ field }) => (
    <FormItem className="md:col-span-2">
      <FormLabel>Projektskizze</FormLabel>
      <FormControl>
        <Textarea {...field} rows={3} />
      </FormControl>
      <CharCounter name="skizze" max={600} control={form.control} />
      <FormMessage />
    </FormItem>
  )}
/>
```

`useWatch` is preferable to `form.watch()` because it scopes re-renders to the counter component only, not the whole form — important for a 30+ field form.

[VERIFIED: INPUT-02 + TEXT-01/02 + UI-SPEC.md §Char counter format]

---

### Pattern §18 — Sticky-footer Berechnen-button

Inline in Pattern §11. Key Tailwind classes per UI-SPEC §`/new` page shell:

```tsx
<footer className="fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-50">
  <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
    {/* Live counter on the LEFT */}
    {requiredErrorCount > 0 && (
      <span className="text-sm text-slate-500">
        {requiredErrorCount} {requiredErrorCount === 1 ? "Pflichtfeld" : "Pflichtfelder"} fehlen
      </span>
    )}
    <Button
      type="submit"
      disabled={!form.formState.isValid || mutation.isPending}
      className="min-w-32"
    >
      {mutation.isPending ? (
        <><Loader2 className="animate-spin mr-2 h-4 w-4" />Wird berechnet …</>
      ) : "Berechnen"}
    </Button>
  </div>
</footer>
```

**Main content gets `pb-32` (128px)** so the last Card doesn't sit underneath the 64px-tall footer.

`requiredErrorCount` derivation: `Object.keys(form.formState.errors).length`. This counts only fields that currently fail validation — with `mode: "onBlur"` and a fully zod-validated schema, this equals the number of missing/invalid Pflichtfelder.

`form.formState.isValid` is true only when zod passes for all fields — automatic gate.

[VERIFIED: UI-SPEC.md §Layout + §Sticky-Footer behavior]

---

## Runtime State Inventory

Phase 2 is **NOT** a rename/refactor phase, but it does introduce persistent state for the first time (the `./config/weights.json` file). Per protocol, document it:

| Category | Items | Action Required |
|----------|-------|------------------|
| Stored data | `./config/weights.json` — first-run seeded from `app/data/weights.default.json`, then editable (Phase 5 admin write) | Phase 2 only seeds + reads. Phase 5 writes. |
| Live service config | None — no external services |  — |
| OS-registered state | None — single Docker container |  — |
| Secrets / env vars | `DATABASE_URL` (read but unused in Phase 2), `CONFIG_DIR` (new, default `./config`) | Document `CONFIG_DIR` in `.env.example` |
| Build artifacts | `backend/app/data/weights.default.json` and `backend/app/templates/*.j2` must be included in the wheel built by hatchling | Verify `pyproject.toml [tool.hatch.build.targets.wheel] include` covers these globs; smoke-test `docker run --rm <image> ls /app/app/data /app/app/templates` |
| localStorage | `estimation:last_creator` (browser-side only) | Namespace prefix `estimation:` reserved for project use |

---

## Common Pitfalls

### Pitfall §R-1: Float drift in factor chains
**Mitigation:** Pattern §1 (Decimal type aliases) + Pattern §5 (Decimal-drift test as regression net). [CITED: research/PITFALLS.md Pitfall #1]

### Pitfall §R-2: Decimal-as-string deserialized to JS Number
**Mitigation:** Pattern §14 (TS interface declares all numeric fields as `string`) + Pattern §15 (`Number(str)` only inside `Intl.NumberFormat` calls). Never `parseFloat(...)` outside the formatter. [CITED: research/PITFALLS.md Pitfall #2]

### Pitfall §R-3: shadcn CLI quirks with Tailwind v4 + React 19
**What goes wrong:** Running `shadcn init` before the path-alias is in `tsconfig.json` causes the CLI to interactively prompt for the alias, or worse, write to a default `~/components` location if you accept a "no path alias" prompt. On Tailwind v4, the CLI now writes `@theme inline` blocks and `@import "tw-animate-css"` — verify the existing `index.css` still parses.
**Mitigation:** Pattern §10 — strict step order (tsconfig + vite.config FIRST, then init, then `--yes`). Verify with `pnpm dev` succeeding after init.
[CITED: ui.shadcn.com/docs/installation/vite + ui.shadcn.com/docs/tailwind-v4]

### Pitfall §R-4: import-linter false-positives on stdlib / pydantic
**What goes wrong:** Adding `pydantic` to `forbidden_modules` accidentally — engine MUST import pydantic for its own models. Same for `decimal`, `typing`, `pathlib`, `jinja2`.
**Mitigation:** Only forbid first-party packages (`app.*`) and HTTP/DB frameworks (`fastapi`, `sqlalchemy`). Allow `pydantic`, `jinja2`, stdlib. Add a smoke `lint-imports` run during W1 verification.
[CITED: import-linter.readthedocs.io/en/stable/contract_types/forbidden/]

### Pitfall §R-5: react-router v7 vs v6 API differences
**What goes wrong:** `react-router-dom` package is deprecated in v7 — everything is now `react-router`. `Routes`/`Route` JSX still works in declarative mode but the data-router (`createBrowserRouter`) is the recommended mode and is required for `loader`-based redirect.
**Mitigation:** Import from `"react-router"`, not `"react-router-dom"`. Use `createBrowserRouter` + `RouterProvider`. Confirmed in Pattern §13 example.
[CITED: reactrouter.com/start/data/installation]

### Pitfall §R-6: zod 4 + @hookform/resolvers type incompatibility
**What goes wrong:** Upgrading to zod 4 breaks `Resolver<input<T>, ...>` vs `Resolver<output<T>, ...>` type inference. TS reports "Type ... is not assignable to type Resolver<...>". Several issues open as of late 2025 on react-hook-form/resolvers.
**Mitigation:** Either:
1. Pin `@hookform/resolvers` to a version that exactly matches the zod 4 minor in use (e.g., zod 4.3.x ↔ resolvers 5.2.2+). Run `npm view @hookform/resolvers version` before pinning. OR
2. Import zod as `import { z } from "zod/v4"` (sub-export) which produces v3-compatible type signatures. OR
3. Type the form generic explicitly: `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({...})`.

Planner picks. Document choice in plan-task notes.

[CITED: github.com/colinhacks/zod/issues/4992 + github.com/react-hook-form/resolvers/issues/799,813,842]

### Pitfall §R-7: Decimal quantize at engine time vs serialize time
**What goes wrong:** A well-meaning developer adds `.quantize(...)` calls in `engine/core.py` for "tidiness". This introduces premature rounding drift that re-cascades through the next multiplication. Two estimates with the same inputs can then diverge if any intermediate is re-multiplied at slightly different precision.
**Mitigation:** Pattern §1 — `@field_serializer(when_used="json")` is the ONE place quantization happens. Engine code must contain ZERO `.quantize()` calls. Add a grep-based test: `grep -r "\.quantize" backend/app/engine/ && exit 1`.
[CITED: research/PITFALLS.md Pitfall #1 lines 23–25]

### Pitfall §R-8: Jinja2 template not packaged in wheel
**What goes wrong:** `hatchling` strips non-Python files by default. The runtime container has `app/templates/scope_text.de.j2` missing; `PackageLoader("app", "templates").get_template(...)` raises `TemplateNotFound`.
**Mitigation:** Add `include = ["app/data/*.json", "app/templates/*.j2"]` to `[tool.hatch.build.targets.wheel]` in `backend/pyproject.toml`. Smoke-test inside the built image. [CITED: hatchling docs — packaging non-Python files]

### Pitfall §R-9: weights.json sums break phase invariant after manual edit
**What goes wrong:** Phase 2 admin edit doesn't exist yet, but a developer/operator may manually edit `weights.json`. If phase distribution drifts from sum=1.00, every estimate underestimates.
**Mitigation:** Pattern §9 — Pydantic validator `_phase_sum_100` raises on load. Backend either rejects the request with 500 + clear error, or refuses to boot if the seeded file is invalid. Add a startup-time validation in the lifespan handler. [CITED: research/PITFALLS.md Pitfall #8]

### Pitfall §R-10: Anti-Anchoring violated by react-hook-form defaultValues
**What goes wrong:** Developer copy-pastes a tutorial that sets `defaultValues: { factor_tech: "neutral", pages_complexity: "medium" }`. Anti-Anchoring lost; Pflichtfeld validation never trips because the field is already "filled".
**Mitigation:** Pattern §12 — explicit verification step in Plan-checker: grep `defaultValues` for any of `factor_`, `_complexity`, `projekttyp`, `concurrent_users_band` having non-empty string defaults. CI gate. [CITED: CONTEXT.md D-01 + Pitfall #17]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 (in container) | Backend runtime | ✓ (via Dockerfile) | 3.12-slim-bookworm | — |
| uv (Astral) | Backend builds | ✓ (Dockerfile pulls from ghcr.io/astral-sh/uv:0.11.14) | 0.11.14 | — |
| pnpm 9.15 (in container) | Frontend builds | ✓ (Phase-1 fix, pinned in frontend/Dockerfile) | 9.15.0 | — |
| Node 22 | Frontend builds | ✓ (via base image) | 22.x | — |
| Docker Desktop | Developer machine | ✓ (verified Phase 1) | 24+ | — |
| ctx7 / Context7 MCP | Documentation lookup at research time | ✗ | — | WebSearch + WebFetch + direct curl of raw GitHub READMEs (used during this research) |
| slopcheck | Package legitimacy at research time | ✗ | — | All packages tagged per protocol; planner inserts `checkpoint:human-verify` per package; install slopcheck during W1 if possible |
| hypothesis (PyPI) | Backend test framework | will be added | pin during install via `pip index versions hypothesis` | — |
| import-linter (PyPI) | Backend TECH-01 enforcement | will be added | pin during install | ruff `tidy-imports` (less expressive — not recommended) |
| Jinja2 | Backend template engine | ✓ (transitively via `fastapi[standard]`) | bundled | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** ctx7 (used WebSearch/WebFetch fallback during research); slopcheck (used per-package `[ASSUMED]` tags with planner verification gate)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | pytest + pytest-asyncio + hypothesis |
| Backend config file | `backend/pyproject.toml` `[tool.pytest.ini_options]` block (planner adds) |
| Backend quick run command | `cd backend && uv run pytest -x tests/engine/` |
| Backend full suite command | `cd backend && uv run pytest && uv run lint-imports && uv run ruff check` |
| Frontend framework | Vitest (CLAUDE.md §Development Tools); add in W2 |
| Frontend config file | `frontend/vitest.config.ts` (new — extends vite.config.ts) |
| Frontend quick run command | `cd frontend && pnpm vitest run --reporter=verbose src/lib/format.test.ts` |
| Frontend full suite command | `cd frontend && pnpm vitest run && pnpm tsc -b` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALC-02 | ML formula correct on golden cases | unit | `uv run pytest tests/engine/test_determinism.py::test_golden_fixtures -x` | ❌ Wave 0 |
| CALC-03 | PERT/σ from ML | unit | `uv run pytest tests/engine/test_pert.py -x` | ❌ Wave 0 |
| CALC-04 | P50/P80/P90 from PERT,σ | unit | `uv run pytest tests/engine/test_confidence.py -x` | ❌ Wave 0 |
| CALC-05 | Phase distribution sums equal ML | unit | `uv run pytest tests/engine/test_phases.py -x` | ❌ Wave 0 |
| CALC-06 | Decimal everywhere (no float drift) | property | `uv run pytest tests/engine/test_decimal_drift.py -x` | ❌ Wave 0 |
| CALC-07 | calculate() pure (no I/O) | unit | `uv run pytest tests/engine/test_determinism.py::test_calculate_no_io_in_engine -x` | ❌ Wave 0 |
| REPRO-01 | Snapshot completeness (round-trip) | property | `uv run pytest tests/engine/test_determinism.py::test_calculate_is_deterministic -x` | ❌ Wave 0 |
| TECH-01 | engine/ doesn't import models/db/schemas/FastAPI | lint | `uv run lint-imports` | ❌ Wave 0 (pyproject.toml block) |
| TECH-02 | Decimal serialized as JSON string | unit | `uv run pytest tests/api/test_decimal_serialization.py -x` | ❌ Wave 0 |
| TECH-04 | zod schema mirrors Pydantic | manual + integration | Hand-verify TS types compile against API response shape | manual |
| TECH-08 | All UI literals German | manual + lint (optional) | `pnpm grep -r "TODO" src/ | grep -i "english"` (best-effort) | manual |
| INPUT-01..08 | Required-field validation | unit | `pnpm vitest run src/features/estimate/schema.test.ts` | ❌ Wave 0 |
| FACT-01..04 | Anti-Anchoring (no defaults) | unit | `pnpm vitest run src/features/estimate/anti-anchoring.test.tsx` | ❌ Wave 0 |
| DASH-09 | German number/currency format | unit | `pnpm vitest run src/lib/format.test.ts` | ❌ Wave 0 |
| DASH-10 | Dashboard renders < 1s | manual smoke | Browser DevTools Performance tab; planner-defined budget check | manual |

### Sampling Rate
- **Per task commit:** `cd backend && uv run pytest -x tests/engine/` (engine isolation tests only — fast feedback)
- **Per wave merge:** `uv run pytest && uv run lint-imports && uv run ruff check` (backend) + `pnpm vitest run && pnpm tsc -b` (frontend)
- **Phase gate:** Full suites green + manual browser smoke (`docker compose up`, fill form, click Berechnen, see Dashboard with German format)

### Wave 0 Gaps

- [ ] `backend/tests/__init__.py` and `backend/tests/conftest.py` (shared fixtures)
- [ ] `backend/tests/fixtures/inputs_typical.json` — one well-formed EstimateInputs JSON
- [ ] `backend/tests/fixtures/snapshot_default.json` — extracted from weights.default.json
- [ ] `backend/tests/fixtures/golden_estimates.json` — 5 hand-computed cases
- [ ] `backend/tests/engine/test_determinism.py` — property + I/O-guard tests
- [ ] `backend/tests/engine/test_decimal_drift.py` — drift test
- [ ] `backend/tests/engine/test_pert.py`, `test_confidence.py`, `test_phases.py` — formula correctness
- [ ] `backend/tests/api/test_decimal_serialization.py` — `@field_serializer` boundary test
- [ ] `frontend/vitest.config.ts` + `frontend/src/lib/format.test.ts` — Vitest scaffold + format-helper tests
- [ ] `frontend/src/features/estimate/anti-anchoring.test.tsx` — assert no defaults on factor + complexity selects
- [ ] Framework installs: `cd backend && uv add --dev pytest pytest-asyncio hypothesis ruff import-linter`; `cd frontend && pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@app.on_event("startup")` in FastAPI | `lifespan` async context manager | FastAPI 0.110+ | Pattern §8 uses lifespan — startup deprecated |
| `react-router-dom` 6.x package | `react-router` 7.x (single package) | RR v7 merge | Pattern §13 imports from `"react-router"` |
| Pydantic v1 with `class Config` | Pydantic v2 `model_config = ConfigDict(...)` | Pydantic 2.x | Pattern §9 uses v2 syntax |
| shadcn CLI styles `default` | `new-york` is now default for new projects | shadcn 3.x | UI-SPEC.md locks `style=new-york` |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 CSS-first `@theme` block | Tailwind v4 release | UI-SPEC.md custom `--warning` token in CSS, no JS config |
| `fastapi[all]` extra | `fastapi[standard]` extra | FastAPI ~0.110 | backend/pyproject.toml already correct |
| Float-based PT calculation | Decimal everywhere + `@field_serializer` | Pydantic v2 era | This entire phase establishes the Decimal pattern |

**Deprecated/outdated:** None affecting Phase 2 directly. CONTEXT.md/UI-SPEC.md/CLAUDE.md are all current.

---

## Recommended File Structure

### Backend — new files in Phase 2

```
backend/
├── pyproject.toml                              # MODIFIED: add deps, add [tool.importlinter], add [tool.hatch.build.targets.wheel] include
├── app/
│   ├── main.py                                 # MODIFIED: add lifespan handler (Pattern §8)
│   ├── data/                                   # NEW directory
│   │   └── weights.default.json                # NEW: Pattern §9 schema
│   ├── templates/                              # NEW directory
│   │   └── scope_text.de.j2                    # NEW: Pattern §6
│   ├── engine/                                 # NEW directory (TECH-01 isolated)
│   │   ├── __init__.py                         # NEW: public exports
│   │   ├── core.py                             # NEW: calculate() — Pattern §2
│   │   ├── types.py                            # NEW: Pydantic models + Decimal aliases — Pattern §1, §9
│   │   └── scope.py                            # NEW: generate_scope_text() — Pattern §6
│   ├── services/                               # NEW directory
│   │   ├── __init__.py                         # NEW: empty
│   │   └── weights_loader.py                   # NEW: WeightsLoader — Pattern §7
│   ├── schemas/
│   │   └── estimate.py                         # MODIFIED: replace skeleton with EstimateInputs/EstimateResultResponse wrappers
│   └── routers/
│       └── estimates.py                        # MODIFIED: replace skeleton with full-schema endpoint — Pattern §7
└── tests/                                      # NEW directory tree
    ├── __init__.py
    ├── conftest.py
    ├── fixtures/
    │   ├── snapshot_default.json
    │   ├── inputs_typical.json
    │   └── golden_estimates.json
    ├── engine/
    │   ├── __init__.py
    │   ├── test_determinism.py                 # Pattern §4
    │   ├── test_decimal_drift.py               # Pattern §5
    │   ├── test_pert.py
    │   ├── test_confidence.py
    │   └── test_phases.py
    ├── api/
    │   ├── __init__.py
    │   └── test_decimal_serialization.py
    └── services/
        ├── __init__.py
        └── test_weights_loader.py
```

### Frontend — new and modified files in Phase 2

```
frontend/
├── components.json                             # NEW (shadcn-CLI output) — Pattern §10
├── tsconfig.json                               # MODIFIED: add baseUrl + @/* alias
├── tsconfig.app.json                           # MODIFIED: add baseUrl + @/* alias
├── vite.config.ts                              # MODIFIED: add resolve.alias.@
├── vitest.config.ts                            # NEW: extends vite config for tests
├── package.json                                # MODIFIED: add react-router, react-hook-form, zod, @hookform/resolvers, @tanstack/react-query, lucide-react; devDeps for vitest stack
├── src/
│   ├── main.tsx                                # MODIFIED: createBrowserRouter + QueryClientProvider — Pattern §13
│   ├── App.tsx                                 # MODIFIED or DELETED: optional layout under RouterProvider — Pattern §13
│   ├── index.css                               # MODIFIED: shadcn CSS variables + custom --warning token
│   ├── lib/
│   │   ├── utils.ts                            # NEW (shadcn-CLI): cn() helper
│   │   ├── format.ts                           # NEW: German Intl helpers — Pattern §15
│   │   └── format.test.ts                      # NEW: Vitest format helper tests
│   ├── api/
│   │   ├── client.ts                           # MODIFIED: keep existing or merge into estimate.ts
│   │   └── estimate.ts                         # NEW: postEstimate + response types — Pattern §14
│   ├── components/
│   │   ├── EstimateForm.tsx                    # DELETED (replaced by features/estimate/EstimateFormPage.tsx)
│   │   ├── ResultPanel.tsx                     # DELETED (replaced by features/estimate/ResultDashboardPage.tsx)
│   │   └── ui/                                 # NEW (shadcn-CLI outputs): card, input, select, textarea, label, button, tooltip, form, alert, popover
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── textarea.tsx
│   │       ├── label.tsx
│   │       ├── button.tsx
│   │       ├── tooltip.tsx
│   │       ├── form.tsx
│   │       ├── alert.tsx
│   │       └── popover.tsx
│   └── features/                               # NEW directory (per research/ARCHITECTURE.md §Frontend Vertical Slice Convention)
│       └── estimate/
│           ├── schema.ts                       # NEW: zod schema — Pattern §11
│           ├── schema.test.ts                  # NEW: zod schema validation tests
│           ├── EstimateFormPage.tsx            # NEW: form with shadcn Form, 4 Cards, sticky footer — Pattern §11, §17, §18
│           ├── ResultDashboardPage.tsx         # NEW: 5 Cards + optional risk-banner Card 0
│           ├── CharCounter.tsx                 # NEW: live char counter — Pattern §17
│           └── anti-anchoring.test.tsx         # NEW: assert no defaults on factor/complexity selects
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `hypothesis` 6.x is the current stable on PyPI | Standard Stack | Planner must pin to actual version via `pip index versions hypothesis`. Low risk — Hypothesis is highly mature. |
| A2 | `import-linter` 2.x is current stable | Standard Stack | Planner must pin via `pip index versions import-linter`. Low risk. |
| A3 | Default values in `weights.default.json` are placeholder, not derived from real consulting methodology | Pattern §9 | HIGH — user must confirm or replace before shipping. Planner inserts `checkpoint:human-verify` task. |
| A4 | `@hookform/resolvers` 5.2+ has Zod 4 support | Stack + Pitfall §R-6 | Medium — Zod 4 minor-version churn causes type errors. Planner must verify exact pinning works. |
| A5 | `node:path` import works under the current TS config | Pattern §10 | Low — Phase 1 already added `@types/node` and `tsconfig.node.json types:[node]`. |
| A6 | `hatchling` strips `*.json` and `*.j2` from wheel unless explicitly included | Pitfall §R-8 | Medium — symptom only appears in runtime container. Planner verifies via `docker run ls /app/app/data`. |
| A7 | UI-SPEC literal "Wert muss zwischen {min} und {max} liegen" is acceptable when displayed via zod refine | Pattern §11 | Low — UI-SPEC mandates the literal, planner picks the mechanism (zod custom message vs static literal). |
| A8 | shadcn `Select` placeholder displays when `field.value` is `undefined` | Pattern §12 | Low — verified Radix Select behavior. Smoke test in W3. |

---

## Open Questions

1. **DASH-04 placement — Parameter-Zusammenfassung as sub-block of Card 2 or new Card?**
   - UI-SPEC §"Open question for planner" recommends (i) sub-block inside an existing Card to honor D-03's 5-Card stack.
   - Planner confirms in the plan; no UI-SPEC amendment needed if (i) is chosen.
   - Recommendation: (i) — appended below the PERT-Detail content in Card 2, OR rendered inside Card 3 (Phasenverteilung) as a "Parameter-Übersicht" mini-table above the phase rows.

2. **`weights.default.json` — exact numeric values for base_weights, factor curves, etc.**
   - Pattern §9 provides a complete placeholder structure but the actual numbers are [ASSUMED] (A3).
   - Planner inserts a `checkpoint:human-verify` task: show user the proposed defaults, let them adjust, only then bundle into image.

3. **Browser-back form-state preservation — context-lift vs accepting state loss**
   - UI-SPEC.md requires the observable contract ("back from /result shows previously-entered values") but lets planner pick the impl.
   - Two options:
     - (a) Lift `useForm` into a layout component that wraps both routes via `<Outlet />` and pass via React Context. More code, true preservation.
     - (b) Accept state loss on Browser-back in Phase 2; Phase 3 adds localStorage-backed draft persistence. Less code, deferred concern.
   - Recommendation: (b) for Phase 2 (mark as known limitation in Phase summary). Phase 3 ships persistence anyway.

4. **Decimal-string rendering inside Jinja2 scope template**
   - Pattern §6 leaves open whether to (i) pre-quantize Decimals before passing to template, or (ii) add a custom Jinja2 filter for quantize-and-format.
   - Recommendation: (i) — pass the already-`model_dump_json()`-serialized dict (with quantized strings) to the template. Keeps template logic minimal.

5. **Optional shadcn `table` component for Phasen-Tabelle**
   - UI-SPEC.md §Card 3 says "shadcn `Table` primitive (added in same install) OR plain `<table>`".
   - Recommendation: add shadcn `table` in the same `pnpm dlx shadcn@latest add ...` invocation — costs nothing (file copies into project) and aesthetically more consistent with other cards.

---

## Security Domain

Security enforcement is enabled by default (config.json doesn't disable it). Phase 2 introduces:
- A POST endpoint that consumes user input
- File-system access to read `./config/weights.json`
- No auth, no external services, no DB (Phase 3 introduces DB)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 2 has no auth (TECH-10 seam in Phase 3); single-user local-first |
| V3 Session Management | no | No sessions in Phase 2 |
| V4 Access Control | no | Single-user, no roles |
| V5 Input Validation | **yes** | Pydantic v2 + zod 4 mirror validation; DoS-bounded numeric ranges (per existing skeleton: pages 0..10_000); reject `float` on Decimal fields |
| V6 Cryptography | no | No secrets, no crypto operations in Phase 2 |
| V7 Error Handling | yes | FastAPI default exception handlers return 422 with structured detail; 500 is the catch-all; no stack-trace leakage in prod (FastAPI default behavior with `debug=False`) |
| V12 File and Resource | yes | `WeightsLoader` reads from a fixed path resolved from env var `CONFIG_DIR` — no user-controlled path traversal possible because the user doesn't supply paths |

### Known Threat Patterns for FastAPI + React stack

| Pattern | STRIDE | Standard Mitigation in Phase 2 |
|---------|--------|--------------------------------|
| JSON-body DoS via large numeric range | Denial of Service | Pydantic `Field(ge=…, le=…)` constraints on every integer; `max_length` on every string (Pattern §1 + zod schema mirror in Pattern §11) |
| Float-noise smuggled into Decimal field | Tampering (data integrity) | Pattern §1 `@field_validator(mode="before")` raises if `float` received |
| Path traversal via filename in API | Information Disclosure | Phase 2 has no file-upload/download endpoints; `WeightsLoader` reads a fixed path. No vector. |
| XSS via Jinja2-rendered scope text echoed to UI | Tampering | Scope text is rendered into the UI as `<div className="whitespace-pre-line">{scope_text}</div>` — React escapes by default. **DO NOT** use `dangerouslySetInnerHTML`. |
| CSRF on POST /api/estimates | Tampering | Phase 1 disables CORS (same-origin via nginx). Same-Origin Policy + no cookies → no classic CSRF vector. Document in Phase summary. |
| ReDoS via zod regex on tagessatz_eur | Denial of Service (client only) | Use anchored, bounded regex; the existing `^\d+([.,]\d{1,2})?$` is linear-time |
| Information leak via OpenAPI in production | Information Disclosure | `/api/docs` and `/api/openapi.json` are currently enabled (Phase 1). Phase 2 is still local-first; planner decides whether to gate behind env var now or in Phase 4 (deployment hardening) |

---

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md §Technology Stack` — locked versions (Pydantic 2.13, FastAPI 0.136, SQLAlchemy 2.0 sync, React 19.2, Vite 7, Tailwind 4.3, shadcn 3.x, react-router 7.15, react-hook-form 7.76, zod 4, @hookform/resolvers 5.2, @tanstack/react-query 5.100)
- `CLAUDE.md §"Decision 2: Decimal Handling for €/PT — CRITICAL"` — Decimal-as-string + `@field_serializer` + ROUND_HALF_UP
- `.planning/phases/02-engine-form/02-CONTEXT.md` — D-01..D-08 locked decisions, all Claude's-Discretion items
- `.planning/phases/02-engine-form/02-UI-SPEC.md` — locked design tokens, copy, accessibility floor, format helpers
- `.planning/REQUIREMENTS.md` — Phase 2 IDs (INPUT-01..08, PARAM-01..08, FACT-01..04, TEXT-01..02, CALC-01..07, REPRO-01, DASH-01..10, TECH-01/02/04/08/09)
- `.planning/research/ARCHITECTURE.md §Pattern 2: Pure Engine Module` (lines 276–329) — engine signature, layering, pure-function guarantee
- `.planning/research/PITFALLS.md` Pitfalls #1, #2, #3, #8, #17 — Decimal drift, Pydantic v2 Decimal, snapshot completeness, phase sum, Anti-Anchoring
- [ui.shadcn.com/docs/installation/vite](https://ui.shadcn.com/docs/installation/vite) — non-interactive init, path aliases, vite.config pattern
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 status, CSS-first config
- [v3.shadcn.com/docs/components/form](https://v3.shadcn.com/docs/components/form) — full Form + react-hook-form + zod example (verified via WebFetch)
- [import-linter.readthedocs.io/en/stable/contract_types/forbidden/](https://import-linter.readthedocs.io/en/stable/contract_types/forbidden/) — forbidden contract TOML syntax
- [reactrouter.com/start/data/installation](https://reactrouter.com/start/data/installation) — createBrowserRouter pattern
- [fastapi.tiangolo.com/advanced/events/](https://fastapi.tiangolo.com/advanced/events/) — lifespan context manager
- [hypothesis.readthedocs.io/en/latest/quickstart.html](https://hypothesis.readthedocs.io/en/latest/quickstart.html) — `@given` + strategies
- [tanstack.com/query/latest/docs/framework/react/guides/mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) — useMutation + onSuccess callback

### Secondary (MEDIUM confidence)

- [docs.pydantic.dev/latest/concepts/serialization/](https://docs.pydantic.dev/latest/concepts/serialization/) — `@field_serializer` semantics
- [github.com/pydantic/pydantic/issues/7457](https://github.com/pydantic/pydantic/issues/7457) — Decimal as string default
- [github.com/colinhacks/zod/issues/4992](https://github.com/colinhacks/zod/issues/4992) — zod 4 + @hookform/resolvers compat
- [github.com/react-hook-form/resolvers/issues/799](https://github.com/react-hook-form/resolvers/issues/799), [#813](https://github.com/react-hook-form/resolvers/issues/813), [#842](https://github.com/react-hook-form/resolvers/issues/842) — type-incompat workarounds
- [github.com/seddonym/import-linter](https://github.com/seddonym/import-linter) — README

### Tertiary (LOW confidence — flagged for planner verification)

- `hypothesis` and `import-linter` exact pinned versions — must verify via `pip index versions` at install time

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions cited from CLAUDE.md which was Context7-verified upstream
- Architecture / engine pattern: HIGH — research/ARCHITECTURE.md Pattern 2 directly applicable
- Decimal serialization: HIGH — Pydantic v2 docs + CLAUDE.md Decision 2 explicit
- Form patterns (shadcn + RHF + zod): MEDIUM — shadcn v3 docs verified; zod 4 type-compat is a known live issue (Pitfall §R-6)
- import-linter pattern: HIGH — official docs verified
- react-router 7 data-router: HIGH — official docs verified
- weights.default.json default values: LOW — placeholder only, planner must `checkpoint:human-verify`
- WeasyPrint/PDF concerns: N/A — deferred to Phase 4

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (30-day window — Pydantic 2.x, FastAPI 0.x, react-router 7.x, zod 4.x, shadcn 3.x are all stable)
