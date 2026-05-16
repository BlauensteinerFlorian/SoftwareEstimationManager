# Project Research Summary

**Project:** Software Estimation Manager
**Domain:** Local-first, Docker-Composed business web app — deterministic PT/PERT effort estimation tool with PDF export for German IT-management consultants
**Researched:** 2026-05-16
**Confidence:** HIGH (versions verified against PyPI/npm; framework patterns verified via Context7 + official docs; estimation-domain pitfalls verified against peer-reviewed sources; feature gaps triangulated against commercial tools and German IT-consulting practice)

## Executive Summary

This is a single-user, local-first PT/PERT estimation tool for German IT consultants — entirely mainstream stack-wise (FastAPI + React + WeasyPrint + Docker Compose), but the **load-bearing requirement is reproducibility**: a saved estimate must produce identical PT and identical PDF output forever, even after the admin retunes global weights. That single constraint cascades into every architectural decision (snapshot-per-estimate JSON column, pure-function engine, clone-only persistence, Decimal-everywhere) and is what separates a competent build from a calculator that lies to its users six months in.

The recommended approach is a **vertical-slice build in 5 phases** (Skeleton → Engine → Persistence → PDF → Admin), with the spine — `docker compose up` returning a calculated PT in the browser — proven in Phase 1 before any depth is added. The stack is fully locked by the user; the meaningful decisions are at the library layer (sync SQLAlchemy 2.0, Pydantic-v2-with-Decimal-TypeDecorator, Tailwind v4 + shadcn/ui on React 19, nginx reverse-proxy for same-origin) and at the data-model seams (`weights_snapshot` JSON column, `parent_estimate_id` nullable FK from day one, `user_id` nullable column from Phase 3). The PRD already covers ~80% of expected functionality; feature research identified **10 P1 "table-stakes" gap-closers** (assumptions field, exclusions field, client metadata, P50/P80/P90 row, CSV export, PDF page numbers/footer, parent_estimate_id, default methodik content) that must be folded into REQUIREMENTS.md before scoping is frozen.

The dominant risks are all "looks done but isn't" failure modes: (1) float-arithmetic drift silently breaking reproducibility; (2) WeasyPrint in slim Docker rendering German umlauts as tofu boxes; (3) incomplete weights snapshots omitting correction factors or PERT multipliers; (4) race conditions on `weights.json` mid-PDF-render; (5) anchoring bias from pre-filled correction-factor defaults laundering consultant laziness into client-facing PDF rigor. PITFALLS.md flags 8 Critical items — these must shape PLAN.md task ordering, not appear as "polish" at the end of Phase 5.

## Key Findings

### Recommended Stack

Mainstream Python + React, every version pinned against verified 2026 metadata. Three load-bearing library choices: **sync SQLAlchemy 2.0** (async adds zero benefit at concurrency=1 and WeasyPrint is sync anyway), **Decimal end-to-end with a SQLite-aware TypeDecorator** (SQLite has no native NUMERIC; default `Numeric(asdecimal=True)` round-trips through float and breaks precision), and **Tailwind v4 + shadcn/ui on React 19** (current shadcn CLI defaults; copy-paste components dodge npm churn).

**Core technologies:**
- **Python 3.12** (slim-bookworm, NOT alpine) — WeasyPrint Pango/Cairo path resolution is fragile on musl
- **FastAPI 0.136 + Pydantic 2.13 + Uvicorn 0.47** — `fastapi[standard]` pulls uvicorn/httpx/jinja2 in one install
- **SQLAlchemy 2.0 (sync) + Alembic 1.18** — `Mapped[]` typed style; Alembic from Phase 3 for SQLite→Postgres path
- **WeasyPrint 68.1** — HTML/CSS→PDF; native deps `libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fonts-dejavu fonts-liberation` mandatory in Dockerfile
- **React 19.2 + Vite 7.x (NOT 8) + TypeScript 5.7** — plain client-side, no SSR/RSC
- **Tailwind v4 + shadcn/ui (CLI 3.x)** — CSS-first `@theme` config, no `tailwind.config.js` boilerplate
- **react-hook-form + zod + @hookform/resolvers** — uncontrolled forms; zod schemas mirror Pydantic on the client
- **TanStack Query v5 + TanStack Table v8** — server cache + headless history table composing with shadcn primitives
- **uv + pnpm** — fast deterministic package managers; `uv sync --frozen` in Docker

### Expected Features

PRD covers ~80% of competent-tool baseline. Feature research identified **ten P1 table-stakes gap-closers** REQUIREMENTS.md must pick up.

**Must have (v1 table stakes — already in PRD):**
- PERT 3-point (O/M/P/PERT) with σ, complexity-weighted parameter table, 4 global correction factors, 6-phase distribution
- **Snapshot of weights per estimate** (the reproducibility anchor — this IS a differentiator vs commercial tools)
- Clone-only immutable persistence, history list with search/filter/sort, read-only re-open
- WeasyPrint PDF with cover, scope text, parameter table, € via Tagessatz×PT
- Admin UI for weights / correction factors / PERT multipliers / methodik boilerplate / reset

**Must have (v1 P1 GAP-CLOSERS — add to REQUIREMENTS.md):**
1. **P50/P80/P90 confidence row** in dashboard + PDF — analytical from PERT(µ=PERT, σ=(P−O)/6); ~10 LOC; closes "false precision" anti-pattern
2. **Per-estimate Annahmen textarea** (≤1500 chars) — every German IT-estimation source mandates per-estimate assumption documentation; today only generic methodik boilerplate exists
3. **Per-estimate Ausschlüsse / Out-of-scope textarea** — defensive-contracting standard ("Nicht enthalten ist: …")
4. **`client_name` field** on estimate — appears on PDF cover; without it the PDF is generic
5. **`project_id` field** (optional free text) — appears on PDF cover + footer; clients refer to estimates by their internal IDs
6. **`valid_until` date** (default = +30 days) — German offer-validity convention; undated offers treated as unlimited
7. **`parent_estimate_id` nullable FK** auto-populated on clone — **schema-now, UI-later**; linchpin for v2 diff view; retrofitting later = migration pain
8. **CSV export endpoint** (parameters + result rows) — consultants live in Excel; PDF-only forces re-keying
9. **PDF page numbers + footer** (project name + project_id + "Seite x/y") + explicit Haftungsausschluss/disclaimer text — business-document baseline
10. **Default `methodik.txt` content** — PRD requires the boilerplate exist but doesn't define it; ~7-paragraph default in FEATURES.md (Verfahren / Formel / Korrekturfaktoren / Phasenmodell / Annahmen-Disclaimer / Gewährleistungsklausel / Gültigkeit)

**Should have (v2 differentiators — defer post-launch):** estimate-to-estimate diff view (exploits parent_estimate_id), sensitivity / tornado view, project templates (per-Projekttyp pre-fill), XLSX multi-sheet export, confidence band SVG chart, Draft/Final status flag + watermark.

**Defer (v3+):** calibration / actuals tracking (requires ≥20 completed estimates for signal), cone of uncertainty viz, multi-user / auth (architecture is already auth-ready), multiple methodik-text variants, logo upload.

**Anti-features (explicit do-NOT-build with documented rationale):** Monte Carlo (analytical PERT is mathematically equivalent at this granularity), AI/LLM suggestions (violates reproducibility + no-external-services), multi-currency / FX, real-time collaboration / WebSockets, Jira / ADO / Excel re-import (kills audit trail), in-place editing (kills immutability — clone-only IS the audit trail), multi-method cross-validation (COCOMO + FP + UCP in parallel — academic), Wideband Delphi, Story Points, per-phase Tagessätze, share-via-link.

### Architecture Approach

Two containers, **one exposed port**: nginx-served frontend on `:3000` reverse-proxies `/api/*` to the backend on the docker network — same-origin from the browser's POV, no CORS, backend port not exposed to host. Backend is a layered FastAPI app with a **hard architectural seam between `engine/` (pure functions, no I/O) and everything else** so the PERT calculator is provably deterministic. Persistent state lives in two bind-mounted volumes: `./data` (SQLite DB) and `./config` (`weights.json` + `methodik.txt`, human-editable, atomic-write semantics, mtime-cached in memory).

**Major components:**
1. **`frontend` container** (nginx:alpine) — serves built Vite SPA; reverse-proxies `/api/*` to backend; single browser-facing port 3000
2. **`backend` container** (python:3.12-slim-bookworm + uvicorn) — FastAPI HTTP API + estimation engine + WeasyPrint PDF rendering; stateless
3. **`engine/`** (pure Python sub-package) — `calculator.py`, `phases.py`, `scope_text.py`; **MUST NOT** import from `models/`, `db/`, `schemas/`, or FastAPI; takes plain dataclasses in, returns plain dataclasses out; signature `calculate(inputs: EstimateInputs, snapshot: WeightsSnapshot) → EstimateResult` with NO fallback to `load_weights()`
4. **`services/`** (workflow layer) — orchestrates `load weights → snapshot → engine → persist`; marshals ORM ↔ engine dataclasses
5. **`models/Estimate`** — the snapshot-pattern row: stores **three JSON columns** (`inputs`, `weights_snapshot`, `result`) plus scalar metadata; `user_id INTEGER NULL` from day one (auth-readiness seam); `parent_estimate_id` nullable FK auto-populated on clone (Phase 3, no v1 UI)
6. **`pdf/`** (WeasyPrint renderer + Jinja2 templates + print CSS) — `url_fetcher=local_only` to enforce lokal-first; fonts bundled into image
7. **`config/loader.py`** — atomic-rename writes (`os.replace`), `threading.Lock`, mtime-invalidated in-memory cache; seeded from `backend/app/seed/weights.default.json` if missing on startup

**Three architectural patterns that ARE the product:**
- **Snapshot = inputs + weights + result (three JSON columns)** — historical display path reads `row.result` directly, NEVER recomputes from current weights; recompute exists only as explicit verification operation
- **Pure engine boundary** — calculator takes one `WeightsSnapshot` parameter; no global state; identical inputs ⇒ identical output forever
- **Auth-readiness seam** — `user_id: int | None` column + `get_current_user_optional() → None` dependency stub in v1; when auth ships, only behaviour changes, no schema migration

### Critical Pitfalls

PITFALLS.md catalogues 25 pitfalls; **8 are Critical** and threaten Core Value directly. All 8 must be on the PLAN.md radar in their respective phases, not deferred to "polish".

1. **Float accumulation in factor chains** (P1) — 7–8 chained multiplications + float = silent off-by-PT errors in client offers. **Avoid:** Decimal everywhere, `Decimal(str(value))` never `Decimal(float)`, `ROUND_HALF_UP` documented in methodik.txt, quantize ONLY at presentation. **Phase 2.**
2. **Pydantic v2 Decimal serialization surprises** (P2) — v2 serializes Decimal as JSON string with full trailing precision; OpenAPI client breaks. **Avoid:** single `MoneyDecimal`/`PTDecimal` type alias with `@field_serializer`; frontend treats Decimal fields as strings. **Phase 2.**
3. **Incomplete weights snapshot** (P3) — naive "save the weights table" misses correction factors, PERT multipliers, phase percentages, language curve, user-range factors → admin tune destroys old estimates' reproducibility. **Avoid:** ONE `WeightsSnapshot` Pydantic model as single source of truth; calculator signature `calculate(inputs, snapshot)` with no global-weights fallback; CI regression test loads every stored estimate and asserts recompute-equals-stored. **Phase 2/3.**
4. **Race on `weights.json` mid-PDF-render** (P4) — admin save + concurrent PDF read = partial JSON / inconsistent estimate-vs-PDF / file truncation on crash. **Avoid:** atomic rename (`tempfile` → `flush` → `fsync` → `os.replace`), in-memory cache + mtime-invalidation, `WeightsSnapshot` pinned per request at request entry, Pydantic-validate before write, `fcntl.flock` LOCK_EX|LOCK_NB → 409 on contention, keep `weights.json.bak`. **Phase 5.**
5. **WeasyPrint in slim Docker → tofu boxes / import crash** (P5) — `pip install weasyprint` alone is not enough; missing libpango/cairo/harfbuzz = container crash loop; missing fonts = German umlauts as empty boxes in client PDFs. **Avoid:** `python:3.12-slim-bookworm` NOT alpine, explicit apt install of pango/cairo/harfbuzz/fontconfig + `fonts-dejavu fonts-liberation`, build-time smoke test `HTML(string='<p>äöü</p>').write_pdf(...)`, runtime test asserts PDF byte length > floor. **Phase 4.**
6. **WeasyPrint table page-break + memory blowup** (P6) — 2-pass table layout is memory-hungry; long tables blow 5s budget; mid-cell row splits and missing repeated headers are known bugs. **Avoid:** plain hand-written print CSS (NOT Tailwind in PDF templates), `thead { display: table-header-group; }`, `tr { page-break-inside: avoid; }`, perf test asserts < 3s render. **Phase 4.**
7. **SQLite stores Decimal as REAL → silent precision loss** (P7) — default `Numeric` against SQLite issues SAWarning and stores as float64. **Avoid:** `TypeDecorator` storing Decimal as TEXT on SQLite, delegating to native `NUMERIC` on Postgres; CI round-trip equality test on both. **Phase 3.**
8. **Phase percentages don't sum to 100 after admin edit** (P8) — admin edits one cell, sum drifts to 98, every subsequent estimate silently underestimates. **Avoid:** Pydantic validator `sum(phases.values()) == Decimal('100.00')` at save AND at file load (refuse to start if disk-corrupted), live "sum: 98 / 100 ⚠️" UI indicator blocking save. **Phase 5 + Phase 2.**

**Domain pitfalls of equal importance:** anchoring bias from defaults (P17 — NO defaults on subjective inputs; factor dropdowns start at "— bitte wählen —", required; day rate IS okay to pre-fill); PERT triangular assumption misleads on long-tailed tasks (P18 — display "Spannweite O–P", not "Standardabweichung" to two decimals); local-first violation via implicit external requests (P21 — `HTML(url_fetcher=disallow_external)`, audit `package.json`, CI offline-mode smoke test); German formatting wrong (P22 — centralized `app/format.py` using `babel.numbers.format_currency(..., locale='de_DE')`; CI grep for `:.2f` on money paths).

## Implications for Roadmap

Combined research strongly indicates a **5-phase vertical-slice ordering** that builds the spine before depth. This is the recommended ROADMAP.md structure.

### Phase 1: Skeleton Slice (vertical, the spine)
**Rationale:** Prove docker-compose topology, nginx reverse proxy, request/response contract, and deployment story end-to-end before any depth. Worst case to discover problems is now, not Phase 5.
**Delivers:** `docker compose up` boots two services; user enters one parameter (pages + complexity), sees a number rendered in the browser via `/api/estimates` proxied through nginx.
**Addresses:** Same-origin reverse-proxy topology (PITFALLS #12, #16), Docker bind-mount UID/GID (#14), healthcheck-gated `depends_on` (#15).
**Avoids:** Pitfall 16 (CORS misconfig) by design; Pitfall 15 (first-run race) via `/health` endpoint from day one.

### Phase 2: Real Engine + Real Schema (deepens the spine)
**Rationale:** Lock in correctness of calculation core BEFORE persistence — Decimal handling, Pydantic schema design, pure-engine boundary, and snapshot scope cannot be retrofitted without rewriting downstream.
**Delivers:** Full parameter table, all factors, real PERT formula, `WeightsSnapshot` Pydantic model = single source of truth, phase distribution, σ + P50/P80/P90 row, risk note when factor > 1.15; in-memory only (no DB).
**Implements:** `engine/` pure-function package; `schemas/` Pydantic DTOs; `seed/weights.default.json`; full frontend form with all factors.
**Addresses:** P50/P80/P90 row (FEATURES P1 #1), per-estimate Annahmen/Ausschlüsse textareas (#2, #3), client_name + project_id + valid_until metadata (#4, #5, #6).
**Avoids:** Pitfalls 1 (float drift), 2 (Pydantic Decimal surprises), 17 (anchoring bias — no defaults on subjective inputs), 18 (label "Spannweite", not σ).

### Phase 3: Persistence + History (adds DB layer)
**Rationale:** Once engine is right and schema is locked, persistence is a thin layer over it. CRITICAL: the snapshot-write pattern + parent_estimate_id + auth-readiness seam all land here, because adding them later requires migrations.
**Delivers:** Estimates persist across restart; full Verlauf with search/filter/sort/delete/clone; clone navigates to `/estimates/new?clone_from=:id` with pre-filled form (no DB write until Berechnen).
**Implements:** `models/Estimate` with three JSON columns (`inputs`, `weights_snapshot`, `result`), `user_id: int | None` (auth-readiness seam from Pattern 5), `parent_estimate_id` nullable FK auto-populated on clone (FEATURES P1 #7 — schema NOW, UI in v2), SQLAlchemy Decimal `TypeDecorator` (P7 fix), SQLite WAL + busy_timeout pragmas (P9), Alembic baseline migration.
**Addresses:** CSV export endpoint (FEATURES P1 #8), parent_estimate_id schema decision (#7).
**Avoids:** Pitfalls 3 (incomplete snapshot — CI regression test asserts recompute-from-snapshot equals stored), 7 (SQLite Decimal precision), 9 (SQLite contention), 10 (SQLite-specific SQL — ORM-only, no raw text()), 25 (single-user assumption baked in — user_id column + parameterized list queries from day one).
**Critical regression test:** save estimate → edit `weights.json` directly on disk → re-open the estimate → result UNCHANGED.

### Phase 4: PDF Export (adds output layer)
**Rationale:** PDF only matters once estimates are real and persisted. Building it earlier forces awkward "render from form state" code that gets thrown away. Dockerfile work (Pango/Cairo/fonts) cannot be deferred — pure infrastructure correctness.
**Delivers:** Click button → professional German-language PDF with cover (project name, client_name, project_id, valid_until, Erstellt von), scope text, parameter table, PERT + P50/P80/P90 + phase distribution, Annahmen + Ausschlüsse + Methodik-Boilerplate + Haftungsausschluss, footer with page numbers + project_id, € via Tagessatz×PT.
**Uses:** WeasyPrint 68.1, Jinja2 templates, plain hand-written print CSS (NOT Tailwind), Babel for `de_DE` number/currency/date formatting.
**Implements:** `pdf/renderer.py`, `pdf/templates/estimate.html.j2`, `pdf/static/print.css` with `@page` rules + `thead { display: table-header-group; }`, backend Dockerfile with apt deps + font bundles + `fc-cache -fv` + build-time smoke test.
**Addresses:** PDF page numbers + footer + disclaimer (FEATURES P1 #9), default methodik.txt content (#10).
**Avoids:** Pitfalls 5 (tofu boxes — fonts-dejavu/fonts-liberation in image), 6 (table page-break + memory blowup — minimal CSS, perf test < 3s), 21 (external requests — `HTML(url_fetcher=disallow_external)`), 22 (German formatting — centralized `format.py`).

### Phase 5: Admin UI (adds config write surface)
**Rationale:** Admin is the smallest user-value contributor (one user, one machine — they could `vi weights.json`). Maximum scope for procrastination → belongs at the end where slipping it has minimum impact. BUT the atomic-write + lock + validation work is non-trivial and Critical.
**Delivers:** `/admin` web routes — `WeightsEditor`, `FactorsEditor` (4 correction factors × 5 stufen + Projekttyp), `PertFactorsEditor` (optimistic/pessimistic multipliers), `MethodikEditor` (textarea), "Reset to defaults" button.
**Implements:** `weights_service.save_weights` with atomic rename + threading.Lock + Pydantic validation before write + mtime cache invalidation; `routers/admin.py` GET/PUT/POST endpoints; live "sum 100" indicator UI blocking save when phase percentages drift.
**Avoids:** Pitfalls 4 (race condition mid-PDF-render — atomic write + per-request snapshot pinning), 8 (phase % ≠ 100 — validator at save AND at load), 13 (Tailwind dynamic class purge — full-literal class map in the live "sum" indicator).

### Phase Ordering Rationale

- **Spine-first** (vertical Phase 1): all subsequent phases require working docker-compose + nginx proxy + service-name DNS; discovering problems here is cheap.
- **Engine before DB** (Phase 2 before 3): snapshot scope, Decimal types, and Pydantic schemas are what the DB must persist; reversing forces ORM-driven schema design that mis-shapes the engine.
- **DB before PDF** (Phase 3 before 4): PDF needs persisted estimates to render against; rendering from form state is throwaway work.
- **PDF before Admin** (Phase 4 before 5): a working PDF defines what fields admin even needs to expose.
- **Auth-readiness, parent_estimate_id, and user_id all land in Phase 3** as cheap insurance; none has UI surface in v1.
- **Cross-cutting work** (logging, error-handling JSON envelope, README updates) layered into each phase, not its own phase.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 4 (PDF Export):** WeasyPrint Pango/Cairo Dockerfile incantations are version-sensitive; print CSS for German typography + repeating table headers has known bugs (Kozea/WeasyPrint #732, #413); Babel locale handling on slim images may require explicit locale-gen step. Research at plan-phase time against current WeasyPrint version and chosen base image.
- **Phase 5 (Admin):** atomic-write + file-lock + cache-invalidation patterns deserve a brief lookup (Python `atomicwrites` library, `fcntl.flock` semantics on Linux vs macOS bind mounts) to nail down before coding.

Phases with well-documented standard patterns (likely skip research-phase):
- **Phase 1 (Skeleton):** docker-compose two-service nginx reverse-proxy fully covered in ARCHITECTURE.md Pattern 1 with working configs.
- **Phase 2 (Engine):** PERT math is closed-form; Pydantic v2 + Decimal patterns are pinned in STACK.md Decision 2; pure-function engine boundary is in ARCHITECTURE.md Pattern 2.
- **Phase 3 (Persistence):** SQLAlchemy 2.0 Mapped[] + TypeDecorator + JSON column + Alembic baseline are all standard; snapshot pattern is in ARCHITECTURE.md Pattern 3.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against PyPI/npm 2026-05-16; framework patterns via Context7 + official docs; SQLite-Decimal caveat and WeasyPrint native deps confirmed against authoritative sources |
| Features | MEDIUM-HIGH | Commercial-tool feature lists (SEER/SLIM/Devtimate/Doofer), PMI/AACE practice, German IT-consulting sources triangulated; 10 P1 gap-closers strongly supported; exact German phrasing of methodik.txt is MEDIUM and should be validated with a real consultant |
| Architecture | HIGH on stack-conventional decisions (layering, snapshot column, Vite proxy); MEDIUM on reverse-proxy-vs-two-service trade-off (both valid; reverse-proxy recommended with explicit rationale) |
| Pitfalls | HIGH — most verified against official docs / well-known GitHub issues (WeasyPrint #1565, #2225, #1104, #413, #732; SQLAlchemy #1759; Pydantic #7457); estimation-domain bias verified against peer-reviewed sources (ACM SIGSOFT anchoring, Cohen's d ≈ 1.19) |

**Overall confidence:** HIGH

### Gaps to Address

- **Default `methodik.txt` exact wording** — FEATURES.md proposes 7 paragraphs; precise German phrasing should be validated against a real consulting deliverable. Handle in Phase 4 planning.
- **PDF font licensing** — `fonts-dejavu` covers German umlauts; polished consultancy look may want a serif (e.g. `fonts-noto-serif` or PT Serif). Decide before bundling into image.
- **Clone-UX exact semantics** — research recommends "/estimates/new?clone_from=:id with pre-fill, no DB write until Berechnen"; alternative ("immediately persist a copy") is also valid. Handle in Phase 3 planning.
- **PostgreSQL-on-day-1 vs SQLite-only-v1 CI matrix** — constraint says SQLite default, Postgres-ready. Confirm with user at Phase 3 planning whether to add CI matrix entry against Postgres now or defer.
- **PDF/A archival compliance** (Pitfall 24) — likely "we archive these for 10 years" request from real consulting clients. Confirm with user before v1 that PDF/A is Out of Scope; design Phase 4 with embedded fonts + no external assets + sRGB color profile as cheap insurance regardless.
- **Cloud-migration `WeightsStore` abstraction** (Pitfall 23) — file-based config breaks on read-only serverless filesystems. Define `WeightsStore` interface with `FileWeightsStore` implementation in Phase 5; `DbWeightsStore` is a v2+ task only if cloud deploy materializes.

## Sources

### Primary (HIGH confidence)
- **Context7 verified** — `/fastapi/fastapi` (0.136), `/websites/sqlalchemy_en_20`, `/pydantic/pydantic`, `/kozea/weasyprint`, `/react-hook-form/documentation`, `/tanstack/query` & `/tanstack/table`, `/pmndrs/zustand`, `/shadcn-ui/ui`
- **PyPI** — FastAPI 0.136.1, SQLAlchemy 2.0.49, WeasyPrint 68.1, Pydantic 2.13.4, Alembic 1.18.4
- **npm** — react 19.2.6, vite 7.x stable / 8.0.13 bleeding, tailwindcss 4.3.0, @tanstack/react-query 5.100.10, @tanstack/react-table 8.21.3, zustand 5.0.13, react-hook-form 7.76.0, zod 4.4.3
- WeasyPrint 68.1 first-steps docs; SQLAlchemy 2.0 Type Hierarchy; SQLModel Decimal Numbers; shadcn/ui Vite + Tailwind v4 install guide
- WeasyPrint GitHub issues #1565, #2225, #1104, #413, #732; SQLAlchemy issue #1759; Pydantic issues #7457, #5072
- ACM SIGSOFT: Anchoring and adjustment in software estimation (Cohen's d ≈ 1.19)

### Secondary (MEDIUM confidence)
- zhanymkanov/fastapi-best-practices; FastAPI Project Structure 2026 guides (zestminds, dev.to/thesius_code)
- Outsidein.dev Vertical Slice; Vite proxy + production parity strategy (shukebeta blog 2026-05-06; Vite Server Options docs)
- Galorath / IQRM / Conzit / project-management.info for PERT, sensitivity analysis, Monte Carlo coverage; PMI Monte Carlo in cost estimating
- Devtimate, Doofer, SEER-SEM, SLIM-Estimate feature pages — competitor benchmarking
- Projektmagazin, Bundesverwaltungsamt Orghandbuch, Bosshart Consulting, GI Fachgruppe WI-PM, Consulting LIFE — German PT/PERT references
- comp/lex, Karrierebibel, Lean Management Beratung — German IT-Vertragspraxis, Gültigkeit, Annahmen-Doku
- SQLite WAL docs + oldmoe's blog + SkyPilot blog — concurrent write transactions
- Vite Discussions #14007, Issue #16143 — Docker + Vite HMR `usePolling` pattern

### Tertiary (LOW confidence — validate during implementation)
- Exact German phrasing of default `methodik.txt`
- PDF/A archival requirement (anecdotal; confirm with user)
- PDF font choice for "consultancy look" (functional correctness via fonts-dejavu confirmed; serif/sans aesthetic is licensing-dependent)

---
*Research completed: 2026-05-16*
*Ready for roadmap: yes*
