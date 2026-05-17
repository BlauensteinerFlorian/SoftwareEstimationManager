---
phase: 01-skeleton-slice
plan: 01
subsystem: infra
tags: [fastapi, pydantic, uv, docker, python, walking-skeleton, backend-scaffold]

# Dependency graph
requires: []
provides:
  - backend/ FastAPI scaffold (10 source files + uv.lock)
  - POST /api/estimates endpoint (skeleton multiplier map per D-03)
  - GET /api/health endpoint with D-06 payload (status, version, timestamp)
  - Multi-stage uv Dockerfile (python:3.12-slim-bookworm base, uv 0.11.14)
  - Pydantic v2 schemas with DoS-hardened pages field (le=10_000)
  - Single source of truth for backend __version__ ("0.1.0")
affects: [01-02-frontend-scaffold, 01-03-docker-compose, 02-engine, 03-persistence]

# Tech tracking
tech-stack:
  added:
    - fastapi[standard] 0.136 (web framework + uvicorn + httpx + jinja2 + python-multipart)
    - uvicorn[standard] 0.47 (ASGI server)
    - pydantic 2.13 (validation + DTOs)
    - hatchling (PEP 517 build backend)
    - uv 0.11.14 (host-side package manager; brew formula)
  patterns:
    - Sub-package layout (app/{routers,schemas}/) anticipating TECH-01 layer separation
    - Same-origin reverse-proxy topology (NO CORSMiddleware in FastAPI)
    - /api prefix applied centrally in main.py via include_router (routers stay prefix-agnostic)
    - Anchoring-bias anti-pattern (Pitfall #17): Pydantic Field has NO default for `complexity`
    - Version single-source-of-truth: __version__ in app/__init__.py, mirrored in pyproject.toml
    - Multi-stage Docker with uv (two-step uv sync; deps cacheable separate from app code)

key-files:
  created:
    - backend/.python-version (3.12 interpreter pin)
    - backend/pyproject.toml (dependency manifest, version 0.1.0)
    - backend/uv.lock (44 packages resolved + frozen)
    - backend/Dockerfile (multi-stage uv build, EXPOSE 8000)
    - backend/app/__init__.py (__version__ = "0.1.0")
    - backend/app/main.py (FastAPI app, DATABASE_URL env-read, router registration)
    - backend/app/routers/__init__.py (empty package marker)
    - backend/app/routers/health.py (GET /health, D-06 payload)
    - backend/app/routers/estimates.py (POST /estimates, skeleton multiplier map)
    - backend/app/schemas/__init__.py (empty package marker)
    - backend/app/schemas/estimate.py (EstimateRequest/EstimateResponse, Complexity Literal)
  modified: []

key-decisions:
  - "Adopted le=10_000 upper bound on EstimateRequest.pages (RESEARCH §Security DoS hardening) — diverges from the bare ge=0 in the canonical code block; the security recommendation supersedes the bare example"
  - "uv installed via brew (brew install uv) on host (macOS Darwin 24.6.0) — Astral's distribution channel, not a project-level package install"
  - "Comment text 'NO CORSMiddleware' replaced with 'NO CORS middleware' (lowercase second token) so the verifier grep -r 'CORSMiddleware' returns empty as the plan's automated verify expects — semantic intent (no CORS) preserved"

patterns-established:
  - "Same-Origin Reverse-Proxy (No CORS): backend has zero CORSMiddleware references; nginx will handle origin in Plan 03"
  - "Layer Layout for TECH-01: routers/ and schemas/ split established Day 1; engine/, services/, models/, db/ slot in without refactoring"
  - "Version Single Source of Truth: __version__ constant referenced by FastAPI title + /api/health payload"
  - "uv as canonical Python package manager: uv.lock pinned + Dockerfile uses --mount=type=bind for cacheable installs"
  - "DoS hardening at boundary: Pydantic Field(le=10_000) blocks unbounded integer attack before handler runs"

requirements-completed: [INFRA-05, INFRA-07]

# Metrics
duration: ~7min
completed: 2026-05-17
---

# Phase 1 Plan 01: Backend Skeleton Scaffold Summary

**FastAPI 0.136 backend skeleton with /api/health + POST /api/estimates round-trip endpoint, DoS-hardened Pydantic v2 schemas, multi-stage uv Dockerfile, and pinned 44-package uv.lock — ready for Plan 02 frontend scaffold and Plan 03 docker-compose orchestration**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-17T05:55:00Z
- **Completed:** 2026-05-17T06:02:28Z
- **Tasks:** 3 (1 no-op, 2 file-creation)
- **Files created:** 11 (10 source files + 1 lockfile)

## Accomplishments

- Verified slopcheck cleanup (root node_modules/package.json/package-lock.json absent — idempotent)
- Scaffolded full backend/ directory tree with 10 canonical files lifted verbatim from RESEARCH §"Code Examples"
- Pydantic v2 EstimateRequest with security-hardened `pages: int = Field(ge=0, le=10_000, ...)` (T-01-01 mitigation from threat register)
- Hardcoded multiplier map per D-03 (`{low: 1.0, medium: 1.5, high: 2.5, very_high: 4.0}`) — explicitly throwaway, Phase 2 replaces with weights.json engine
- Multi-stage Dockerfile with two-step `uv sync` (deps cacheable separate from app code) on python:3.12-slim-bookworm (NOT alpine, per CLAUDE.md Decision 3)
- Installed uv 0.11.14 on host via `brew install uv`, ran `uv lock` → 44 packages resolved, `uv lock --check` confirms consistency
- Zero CORSMiddleware references anywhere in `backend/app/` (Pitfall #5/#16 prevention by topology)
- `__version__ = "0.1.0"` single source of truth verified across `app/__init__.py` and `pyproject.toml`

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete slopcheck leftovers from repo root** — no commit (no-op; already idempotently clean per prior commit `b849913`)
2. **Task 2: Scaffold backend/ source tree and configuration** — `1d9426b` (feat)
3. **Task 3: Generate backend/uv.lock** — `913bc1e` (chore)

**Plan metadata commit:** [pending — will be added with this SUMMARY commit]

## Files Created/Modified

### Created (11 files)

- `backend/.python-version` — Interpreter pin (`3.12`)
- `backend/pyproject.toml` — Dependency manifest (fastapi[standard] 0.136 + uvicorn 0.47 + pydantic 2.13, hatchling build backend, version 0.1.0)
- `backend/uv.lock` — Frozen 44-package dependency graph (65 KB)
- `backend/Dockerfile` — Multi-stage uv build on python:3.12-slim-bookworm; EXPOSE 8000; CMD uvicorn app.main:app
- `backend/app/__init__.py` — Single line: `__version__ = "0.1.0"`
- `backend/app/main.py` — FastAPI app init, logging.basicConfig, DATABASE_URL env-read with SQLite default + log line, two `include_router` calls with `prefix="/api"`, OpenAPI docs at /api/docs and /api/openapi.json, NO CORS middleware import
- `backend/app/routers/__init__.py` — Empty package marker
- `backend/app/routers/health.py` — `@router.get("/health")` returning `{status: "ok", version: __version__, timestamp: ISO-8601 UTC}` (D-06 payload)
- `backend/app/routers/estimates.py` — `@router.post("/estimates", response_model=EstimateResponse)` with hardcoded `_SKELETON_MULTIPLIER` map per D-03
- `backend/app/schemas/__init__.py` — Empty package marker
- `backend/app/schemas/estimate.py` — `Complexity = Literal["low","medium","high","very_high"]`, `EstimateRequest.pages: int = Field(ge=0, le=10_000, ...)` (security-hardened), `EstimateRequest.complexity: Complexity = Field(...)` (no default, Pitfall #17), `EstimateResponse.pt: float` (D-03 — Decimal is Phase 2)

### Modified

None.

### Deleted

None — slopcheck artifacts were already absent at execution start (idempotent Task 1).

## Decisions Made

- **DoS hardening upper bound on pages**: Set `Field(ge=0, le=10_000, ...)` instead of the bare `ge=0` shown in the RESEARCH §"Code Examples" block. Justification: the same RESEARCH document's §"Security Domain → Phase-1-Härtungs-Empfehlung" explicitly recommends `le=10_000` to mitigate T-01-01 (unbounded integer DoS). The plan also explicitly documents this as the ONE allowed deviation in the action step. 10_000 pages is well beyond any realistic software estimation scenario (matches engine-domain reality + threat register).
- **uv host install via brew**: Used `brew install uv` (Homebrew-maintained formula for Astral's `uv` 0.11.14, identical version to the Dockerfile pin). This is a host development-tool install, not a project dependency package install — not subject to Rule-3 slopsquat exclusion. Plan explicitly authorizes this path for macOS.
- **CORSMiddleware comment lowercase rewrite**: The canonical code block ends with `# NO CORSMiddleware — Same-Origin via nginx reverse-proxy.` But the plan's verify command (`! grep -r 'CORSMiddleware' backend/app/`) requires zero occurrences of the substring anywhere — including in comments. To satisfy the strict verifier while preserving the warning's semantic intent, the comment was rewritten as `# NO CORS middleware — Same-Origin via nginx reverse-proxy (Pitfall #5/#16).` This is a comment-only adjustment; no behavior change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Verification Discrepancy] CORSMiddleware substring in canonical comment block conflicts with strict verifier**
- **Found during:** Task 2 verification pass (`! grep -r 'CORSMiddleware' backend/app/` returned a match)
- **Issue:** The RESEARCH.md §"Backend — app/main.py" canonical code block ends with the comment `# NO CORSMiddleware — Same-Origin via nginx reverse-proxy.`. The string "CORSMiddleware" appears in that comment. The plan's automated verify command and acceptance criterion both require the literal substring to be absent from `backend/app/`. Verbatim lift would fail the verify.
- **Fix:** Edited only that comment line in `backend/app/main.py` to read `# NO CORS middleware — Same-Origin via nginx reverse-proxy (Pitfall #5/#16).` — semantic intent (no CORS) preserved; no import, middleware, or behavior change. Code is otherwise identical to RESEARCH canonical block.
- **Files modified:** `backend/app/main.py`
- **Verification:** `grep -r 'CORSMiddleware' backend/app/` now returns nothing (exit 1) — verifier passes.
- **Committed in:** `1d9426b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 verification-spec discrepancy in canonical source vs. verifier)
**Impact on plan:** No scope creep. No behavior change. Comment-only edit to satisfy the literal grep contract in the plan's automated verify; the security/topology guarantee (no CORS code anywhere) is identical.

## Issues Encountered

- **uv not installed on host**: Expected per plan. Resolved by `brew install uv` (Homebrew formula, version 0.11.14 — matches Dockerfile pin). Unrelated permission-denied error during brew cleanup of an old npm cache (`/usr/local/lib/node_modules/expo-cli/...`) — does not affect uv itself, which installed cleanly to `/usr/local/Cellar/uv/0.11.14`.
- **Bash output truncation during compound verification scripts**: Standard tooling quirk in the executor environment — verification was re-run line-by-line and via files in `/tmp/` to confirm all checks pass.

## User Setup Required

None — no external service configuration required. The backend image is NOT built or run in this plan (that happens in Plan 03's `docker compose up --build` step). Plan 01 only ensures all source artifacts that the build will consume are present, correct, and committed.

## Threat Surface Scan

No new threat surface beyond the plan's `<threat_model>`. Both mitigations recorded in the threat register were applied:

- **T-01-01 (DoS via unbounded `pages`)** → mitigated: `Field(ge=0, le=10_000, ...)` in `backend/app/schemas/estimate.py`
- **T-01-02 (Tampering via unknown `complexity`)** → mitigated: `Literal["low","medium","high","very_high"]` in same schema; Pydantic auto-422 on any other value

T-01-03 / T-01-05 / T-01-06 mitigations are infrastructure-level (compose `expose:` vs `ports:`, nginx config) and are scoped to Plans 02 and 03.

## Next Phase Readiness

- **Plan 02 (frontend scaffold)** is unblocked: TypeScript interfaces in `frontend/src/api/client.ts` must mirror the Pydantic shapes from `backend/app/schemas/estimate.py` (`Complexity` literal union, `EstimateRequest.pages: number / complexity: Complexity`, `EstimateResponse.pt: number`).
- **Plan 03 (docker-compose)** is unblocked: backend/Dockerfile is buildable (uv.lock present so `--mount=type=bind,source=uv.lock` succeeds); healthcheck URL `http://localhost:8000/api/health` is wired (router prefix + path verified).
- No blockers carried forward.

## Self-Check

- [x] backend/.python-version exists
- [x] backend/pyproject.toml exists, declares fastapi[standard]>=0.136,<0.137 + uvicorn[standard]>=0.47 + pydantic>=2.13,<3.0, version = "0.1.0"
- [x] backend/uv.lock exists, non-empty, contains `name = "fastapi"`, `name = "pydantic"`, `name = "uvicorn"` package declarations; `uv lock --check` passes
- [x] backend/Dockerfile exists, line 3: `FROM python:3.12-slim-bookworm AS builder`; contains `COPY --from=ghcr.io/astral-sh/uv:0.11.14`, `EXPOSE 8000`, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
- [x] backend/app/__init__.py exists, content exactly `__version__ = "0.1.0"`
- [x] backend/app/main.py exists, reads `DATABASE_URL` via `os.getenv("DATABASE_URL", "sqlite:///./data/estimates.db")` and logs it; `include_router` with `prefix="/api"` for both health and estimates; does NOT contain CORSMiddleware
- [x] backend/app/routers/__init__.py exists (empty)
- [x] backend/app/routers/health.py exists, defines `@router.get("/health")` returning `{"status": "ok", "version": ..., "timestamp": ...}` (ISO-8601 UTC)
- [x] backend/app/routers/estimates.py exists, defines `_SKELETON_MULTIPLIER = {"low": 1.0, "medium": 1.5, "high": 2.5, "very_high": 4.0}` and `@router.post("/estimates", response_model=EstimateResponse)`
- [x] backend/app/schemas/__init__.py exists (empty)
- [x] backend/app/schemas/estimate.py exists, declares `pages: int = Field(ge=0, le=10_000, ...)`, `complexity: Complexity = Field(...)` with NO default, `pt: float` on EstimateResponse
- [x] No CORSMiddleware string anywhere in backend/app/ (verifier returns exit 1)
- [x] Slopcheck artifacts absent at main repo root: node_modules, package.json, package-lock.json
- [x] Slopcheck artifacts absent at worktree root: node_modules, package.json, package-lock.json
- [x] Commit 1d9426b exists in git log (Task 2)
- [x] Commit 913bc1e exists in git log (Task 3)

## Self-Check: PASSED

---
*Phase: 01-skeleton-slice*
*Plan: 01*
*Completed: 2026-05-17*
