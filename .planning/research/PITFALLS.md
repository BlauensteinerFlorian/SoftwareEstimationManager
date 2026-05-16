# Pitfalls Research

**Domain:** PT/PERT software estimation tool (FastAPI + React + WeasyPrint + Docker Compose, local-first, German-language IT consulting context)
**Researched:** 2026-05-16
**Confidence:** HIGH (most pitfalls verified against official docs / well-known GitHub issues / industry research; estimation-domain bias pitfalls verified against peer-reviewed sources)

> Reading order for roadmap planners: Critical pitfalls 1–8 are calculation/reproducibility/PDF correctness — they directly threaten the project's Core Value ("reproduzierbare, nachvollziehbare PT-Schätzungen"). Pitfalls 9–16 are stack/infrastructure (WeasyPrint, SQLite, Docker, Vite). Pitfalls 17–22 are domain/UX/methodology. Pitfalls 23–25 are forward-looking (cloud migration).

---

## Critical Pitfalls

### Pitfall 1: Float accumulation in multiplicative factor chains

**What goes wrong:**
The standard formula chains 7–8 multiplications: `ML = (Pages × LangFaktor + UseCases + BusinessObjects + Interfaces + Batches) × RolesFaktor × UserFaktor × Tech × Team × Quality × Doc × ProjectType`. With Python `float` (IEEE 754 binary), each multiplication introduces a small representation error. `0.1 + 0.2 == 0.30000000000000004` is the classic example — but here, a chain like `1.1 × 1.05 × 0.95 × 1.2 × 1.15 × 1.0 × 1.08` produces a result that differs from the "obvious" decimal answer by ~1e-15. That is harmless until the result is divided by another factor, rounded, then multiplied again — at which point `12.5` becomes `12.4999999...` and floor-rounding emits `12` PT instead of `13` PT. The consultant then writes `12 PT × 1.200 € = 14,400 €` on a client offer that should have been `15,600 €`.

**Why it happens:**
Developers default to `float` because Python is duck-typed and floats "look like numbers". Pydantic v2 accepts `float` everywhere by default. JSON has no `Decimal` primitive. SQLite has no native `DECIMAL` type. Every layer in the stack nudges you toward float.

**How to avoid:**
- Use `decimal.Decimal` for **every** number that participates in the chain: weights, factors, intermediate products, PT results, € amounts. Never mix `Decimal` and `float` in one expression (Python raises `TypeError`; mixing via `+ 0.0` silently downgrades).
- Set context precision explicitly: `getcontext().prec = 28` (default) is fine; do not let it shrink.
- Apply `quantize()` **only at presentation boundaries** (display, PDF, JSON response). Never quantize intermediate results — that introduces premature rounding drift.
- Pin a single rounding mode project-wide. Choose `ROUND_HALF_UP` (intuitive for clients: 12.5 → 13). Banker's rounding (`ROUND_HALF_EVEN`, Python's `round()` default) is mathematically nicer but surprises clients: 12.5 → 12, 13.5 → 14. Document the choice in `methodik.txt`.
- Validate `weights.json` on load: convert numerics to `Decimal` immediately via `Decimal(str(value))` — never `Decimal(float_value)`, which propagates the float's binary noise into the Decimal.

**Warning signs:**
- Any test like `assert calculate(...) == 12.5` (float equality is meaningless).
- Any `from decimal import Decimal` accompanied by `float()` casts.
- Snapshot tests where two runs of the same input produce different last-digit values.
- "It works in dev but the PDF shows 14.99 instead of 15.00".

**Phase to address:** **Calculation Core** phase (foundational — must precede anything that consumes results). Critical.

---

### Pitfall 2: Pydantic v2 Decimal serialization surprises

**What goes wrong:**
Pydantic v2 changed Decimal handling vs. v1. By default v2 serializes `Decimal` as a JSON **string** (e.g. `"1.460000000000000000"`), preserving precision but breaking frontends that expect a number for arithmetic or chart axes. Worse: the **validation schema** (input) and **serialization schema** (output) differ for `Decimal` — generated OpenAPI clients can produce type mismatches. And if you accept `Decimal` from a request body, a JSON client sending `1.46` (number) gets float→Decimal coercion with the float's representation noise unless you configure `model_config = ConfigDict(...)` carefully.

**Why it happens:**
v1 → v2 migration. Tutorials still show v1 patterns. Most FastAPI examples use `float`, so the Decimal path is under-documented.

**How to avoid:**
- Define a single `MoneyDecimal` and `PTDecimal` type alias with `@field_serializer` decorators that emit canonical strings (e.g. `"15.50"` for €, `"12.5"` for PT — two decimals for money, one for PT).
- On the request side, accept `str | Decimal` and validate via `@field_validator(mode='before')`, doing `Decimal(str(v))`. Never accept raw `float` for weights or factors in API payloads.
- Frontend: treat all numeric fields from the API as strings, parse to `Number` only at display time, never round-trip through JS numbers if the value will be persisted back.
- Disable `/docs` and `/openapi.json` in production via `FastAPI(docs_url=None, openapi_url=None)` gated on `ENV=production` — both for security and to avoid documenting types you don't want clients depending on.

**Warning signs:**
- TypeScript compile errors saying "Type 'string' is not assignable to type 'number'".
- API responses where `pt_estimate` is `"12.500000000000000000"` (preserved trailing zeros).
- Two independent serializers (one in router, one in repository) producing different precision.

**Phase to address:** **API Schema & Calculation Core** phase. Critical.

---

### Pitfall 3: Weights snapshot is incomplete (reproducibility broken)

**What goes wrong:**
The project requires that a saved estimate reproduces identically even after admin edits global `weights.json`. The naive implementation snapshots "the weights table" — but the formula consumes more than the base weights: it consumes the four 5-step correction factors (Tech/Team/Quality/Doc, 20 values), the ProjectType factor (4 values), the PERT optimistic/pessimistic multipliers (0.75 / 1.55), the phase distribution percentages (6 values summing to 100), and the Languages and Users factor curves. **Forgetting any one knob** means: admin tunes "Risk → Quality factor for 'sehr ungünstig'" from 1.30 → 1.40, opens an old estimate, and the dashboard now shows different PT than the PDF that was sent to the client six months ago. The audit trail is destroyed silently — no error, just inconsistency.

**Why it happens:**
Snapshot scope is defined implicitly. "We save the weights" is interpreted as "the base weights table" because that's the most visible config. Other knobs sit elsewhere in the codebase and don't feel like "weights".

**How to avoid:**
- Define **one** `WeightsSnapshot` Pydantic model that is the single source of truth for "everything a calculation depends on". Fields: `base_weights`, `complexity_factors`, `correction_factors` (Tech/Team/Quality/Doc), `project_type_factors`, `pert_factors`, `phase_distribution`, `language_factor_curve`, `user_factor_ranges`, plus a `schema_version` integer.
- The calculator function signature is **exactly one** parameter for config: `calculate(inputs: EstimateInputs, snapshot: WeightsSnapshot) -> EstimateResult`. There is no fallback to "current global weights". No `load_weights()` call inside the calculator. This makes "did we snapshot it" trivially provable by type signature.
- Persist the snapshot as `estimates.weights_snapshot` JSON column (one DB column, not five). On open, hydrate and pass to calculator.
- Add a regression test: load every persisted estimate, recompute from snapshot, assert result equals stored result. Run in CI on every commit. If it ever fails, the snapshot scope drifted.
- Version the snapshot: when fields are added, `schema_version` increments and a migrator upgrades old snapshots in-place on read (filling defaults). Never silently default a missing field at compute time.

**Warning signs:**
- The calculator imports `weights_loader` or reads `weights.json` directly.
- Tests pass with `snapshot=current_weights`; no test exercises "snapshot != current".
- The Pydantic model for the snapshot has fewer fields than the admin form has inputs.

**Phase to address:** **Calculation Core** phase, alongside **Persistence**. Critical — this *is* the Core Value.

---

### Pitfall 4: Admin edits `weights.json` mid-PDF-generation (read-during-write)

**What goes wrong:**
Two scenarios. (a) Admin clicks Save at the same moment a PDF render reads `weights.json` → partial JSON → `json.JSONDecodeError`, render crashes, consultant retries, but the next render uses NEW weights, so the on-screen estimate and the PDF disagree. (b) Two admin tabs both edit, last-write wins, but the "loser" had unsaved good changes silently discarded. (c) A power failure during write leaves `weights.json` empty or truncated — backend won't start.

**Why it happens:**
`open(path, 'w').write(json.dumps(...))` is not atomic. Python flushes to userspace buffer, then OS buffer, then disk — at any point in that chain another reader sees garbage. No file locks by default.

**How to avoid:**
- **Atomic write pattern**: `json.dump` to a sibling temp file in the same directory → `file.flush()` → `os.fsync(file.fileno())` → `os.replace(tmp_path, final_path)`. `os.replace` is atomic on POSIX and Windows. Same-directory is mandatory (cross-device replace fails).
- **Reader pattern**: read once into memory at startup AND on a "weights changed" signal (e.g. polling mtime or a `/admin/weights/reload` endpoint). The calculator/PDF code never re-reads the file mid-request.
- **Read-vs-snapshot contract**: as soon as a request begins, copy the current in-memory weights into the request's `WeightsSnapshot`. The render is then pinned for the lifetime of the request — even if admin saves at request millisecond 200, the request at millisecond 50 will still finish with the old weights.
- **Validate before replace**: parse the to-be-written JSON, validate against the Pydantic snapshot schema, **then** write. If validation fails, return 400 to the admin tab and leave the file untouched.
- **Single-writer lock**: `fcntl.flock(LOCK_EX | LOCK_NB)` around the write. If lock is taken, return 409 Conflict. Concurrent admin tabs see "another save is in progress, retry".
- Optional but cheap: keep `weights.json.bak` as a previous-known-good copy. If startup load fails, fall back to backup and emit a loud error.

**Warning signs:**
- Code that opens the same file twice in one request handler.
- Save endpoint that does `path.write_text(json.dumps(data))` directly.
- No mtime check or in-memory cache of weights — the file is re-read on every PT calculation.

**Phase to address:** **Admin & Config Persistence** phase. Critical.

---

### Pitfall 5: WeasyPrint in slim Docker images → "tofu boxes" or import crash

**What goes wrong:**
WeasyPrint is **not a pip-only** dependency. It is a Python binding around system shared libraries: Pango (≥1.44), Cairo, GDK-PixBuf, HarfBuzz, FontConfig, and fonts. `python:3.12-slim` (the common base) deliberately omits these. Symptoms cascade: (1) `OSError: cannot load library 'pango-1.0-0'` at import → container restart loop; (2) import succeeds but no fonts are registered → German umlauts (ä, ö, ü, ß) render as empty boxes ("tofu") in the PDF; (3) `@font-face` references to fonts that exist on dev macOS but not in the container → mixed: titles in fallback font, body in the requested font.

**Why it happens:**
WeasyPrint's pip install pulls only the Python wrapper. System libs must come from `apt-get`. Slim images are "slim" precisely because they removed them. Developers test locally on macOS where Homebrew has the libs; CI passes too because most CI images are full Debian; production breaks first.

**How to avoid:**
- **Base image**: use `python:3.12-slim-bookworm` (NOT alpine — musl + Pango is a well-known compatibility minefield) and explicitly install: `apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 libgdk-pixbuf-2.0-0 libffi8 shared-mime-info fonts-dejavu fonts-liberation fontconfig`.
- **Fonts for German**: `fonts-dejavu` and `fonts-liberation` cover umlauts fully. For "professional consulting look", bundle a serif (e.g. `fonts-noto-serif`) or a licensed corporate font into the image at `/usr/share/fonts/truetype/corporate/` and run `fc-cache -fv` in the same `RUN` layer. **Never** rely on `@import url('https://fonts.googleapis.com/...')` — violates local-first promise (Pitfall 21).
- **Verify at build time**: add a smoke test in the Dockerfile: `RUN python -c "from weasyprint import HTML; HTML(string='<p>äöü</p>').write_pdf('/tmp/t.pdf')"`. Fails the build if libs/fonts are missing.
- **Smoke test in tests**: one test renders a known string with umlauts and asserts the PDF byte length > some floor (tofu PDFs are notably smaller than properly-rendered ones because glyph subsetting drops missing chars).
- **Pin versions**: pin `weasyprint==X.Y.Z` and document the Pango version it expects. WeasyPrint major versions have broken Pango compatibility (see issues #602, #1565, #2225 on Kozea/WeasyPrint).

**Warning signs:**
- Dockerfile installs WeasyPrint via pip with no `apt-get` step.
- The PDF rendering test isn't run inside the same image used in production.
- Locale headers/footers in the PDF look "fine on dev, weird in prod".
- Build size suddenly drops by 100MB — someone removed fonts thinking they were bloat.

**Phase to address:** **PDF Rendering** phase + **Docker / Deployment** phase. Critical for credibility (broken umlauts in a client-facing PDF kills the product).

---

### Pitfall 6: WeasyPrint table page-break and memory blowup

**What goes wrong:**
The PDF report contains tables (parameter table, phase distribution, € breakdown). WeasyPrint's table rendering is **slow and memory-hungry** — a 50-row table can comfortably consume hundreds of MB and several seconds. With multiple medium tables and a 5s performance budget, you can blow the budget. Worse, page breaks in tables are buggy: a row split mid-cell, a header row that doesn't repeat on page 2, or `page-break-inside: avoid` that fights `@page` rules (known WeasyPrint issue #732).

**Why it happens:**
WeasyPrint computes table layout in two passes and holds the full table in memory. CSS print spec around tables is itself underspecified, and WeasyPrint's interpretation differs from Chrome's.

**How to avoid:**
- Keep tables small. This product's tables are inherently small (5 parameter rows, 6 phase rows) — that's an asset; don't add "estimate history" or similar that would balloon.
- Use `table { page-break-inside: auto; } tr { page-break-inside: avoid; }` to keep rows intact but allow tables to span pages. Test with deliberately long content (a 600-character "Projektskizze" expanded into multiple lines).
- Use `thead { display: table-header-group; }` so the table header repeats on continuation pages.
- Avoid CSS frameworks in print stylesheets. Tailwind is fine for the web UI but the PDF template should use **plain hand-written CSS** — every unused selector costs cascade time in WeasyPrint.
- Set explicit `<base href="...">` and absolute paths for any images/SVG; relative paths break under WeasyPrint depending on cwd.
- Add a perf test: render a representative estimate and assert wall time < 3s (leaving headroom under the 5s budget).

**Warning signs:**
- The print template imports `tailwind.css` or includes runtime-generated class names.
- PDF tests take > 10s in CI.
- Memory profile shows WeasyPrint dominating heap.

**Phase to address:** **PDF Rendering** phase. Important.

---

### Pitfall 7: SQLite stores Decimal as REAL → silent precision loss

**What goes wrong:**
SQLite has no native `DECIMAL` type. SQLAlchemy's default behavior for `Numeric` against SQLite issues a `SAWarning` and falls back to storing as `REAL` (floating-point) — round-tripping a `Decimal('1.234567890123456789')` returns `Decimal('1.234567890123457')` (truncated to float64 precision). For PT values the loss is invisible (we display 1–2 decimal places). For € values it can produce off-by-one-cent on large totals. For the **weights snapshot** stored as a JSON column it's a question of whether `json.dumps(Decimal(...))` did the conversion or whether some layer cast to float on the way in.

**Why it happens:**
SQLite is "typeless storage class" — the column type is a hint, not enforced. SQLAlchemy can't make REAL behave like DECIMAL without help.

**How to avoid:**
- Use a custom `TypeDecorator` that stores `Decimal` as **TEXT** in SQLite: serialize on bind, `Decimal(str(...))` on result. SQLAlchemy docs and the SQLModel docs both recommend this. PostgreSQL native `NUMERIC` is unaffected (the same TypeDecorator can delegate to the dialect-native path for PG via `impl=Numeric, cache_ok=True` and an `if dialect.name == 'sqlite'` branch).
- For the JSON snapshot column, use SQLAlchemy `JSON` type. On SQLite this is TEXT; on PG it's `JSONB`. Serialize Decimals to strings before storing (`json.dumps(d, default=str)`), and on read parse with a custom hook that converts known-decimal fields back to Decimal.
- Add a round-trip test: write Decimal('1.234567890123456789'), read back, assert equality. Run against SQLite AND Postgres in CI (testcontainers or a postgres service).

**Warning signs:**
- A `SAWarning: SQLite Decimal type does not...` in test output (people often suppress it).
- The DB column type is `Float` or `Numeric` without a `TypeDecorator`.
- `assert stored == original` uses `pytest.approx`.

**Phase to address:** **Persistence** phase. Critical.

---

### Pitfall 8: Phase distribution percentages don't sum to 100 after admin edit

**What goes wrong:**
The default distribution is `12 + 15 + 42 + 18 + 5 + 8 = 100`. Admin edits one cell to "10" (intending to redistribute) and saves. Now `10 + 15 + 42 + 18 + 5 + 8 = 98`. Every subsequent estimate quietly underestimates total PT by 2% relative to the sum of phases — or, depending on implementation, the dashboard shows phase percentages that round-display as 100% but the underlying numbers don't add up. The client sees `Anforderungen 1.2 PT + Architektur 1.5 PT + ... = 9.8 PT` but `Gesamt-ML = 10.0 PT`.

**Why it happens:**
Six independent inputs; the constraint "sum = 100" is implicit, not enforced. Easy to forget in form validation.

**How to avoid:**
- **Validate at save time**: server-side Pydantic validator on the snapshot — `sum(phases.values()) == Decimal('100.00')` (exact, with Decimal). Reject with 422 if not.
- **Validate at load time**: assert on every load of `weights.json`. If the file on disk is corrupted to sum ≠ 100, refuse to start (loud failure beats silent wrong numbers).
- **UI feedback**: live "sum: 98.00 / 100.00 ⚠️" indicator below the form, blocking the save button until 100. Optional: a "normalize to 100" button that proportionally adjusts.
- **Property test**: hypothesis-based test that asserts phase sum equality after any valid edit path.

**Warning signs:**
- The phase fields are six independent number inputs with no "sum" computed in the UI.
- The save endpoint accepts the partial without checking the sum.
- A client noticed it (too late).

**Phase to address:** **Admin** phase + **Calculation Core** invariants. Critical for correctness of output.

---

## Important Pitfalls

### Pitfall 9: SQLite write contention with multiple Uvicorn workers

**What goes wrong:**
Local dev usually runs Uvicorn with `--reload` (one worker). Production defaults to `uvicorn --workers 4` or `gunicorn -w 4`. SQLite serializes writes (one global writer lock). Under concurrent admin "Save weights" + estimate-create requests, workers contend and fail instantly without `busy_timeout` set. Production crash rate has been documented to drop ~40% just from setting `busy_timeout`.

**Why it happens:**
The default `busy_timeout` is 0 — concurrent writers don't wait, they crash with `SQLITE_BUSY`. WAL mode is also not on by default.

**How to avoid:**
- Set `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;` on every connection. Use SQLAlchemy `event.listen(engine, "connect", ...)` to apply on connect.
- Use `connect_args={"check_same_thread": False}` (FastAPI dispatches across threads).
- Pin worker count to 1 for v1 (single-user app — there's no concurrency to win). Document in README. Going forward (multi-user/cloud), Postgres is the answer, not more SQLite workers.
- Avoid long-held write transactions. Wrap each request handler's DB work in a short transaction.

**Warning signs:**
- `OperationalError: database is locked` in logs.
- The docker-compose file specifies `--workers 4` for the FastAPI service.
- No engine-connect event handler in code.

**Phase to address:** **Infrastructure / Persistence** phase. Important.

---

### Pitfall 10: SQLite-specific SQL leaks in, breaking Postgres-readiness

**What goes wrong:**
The constraint says "no SQLite-specific features that fail in Postgres". Easy to violate silently: using `INSERT OR REPLACE`, `||` for concatenation when an arg is NULL (works differently), implicit type affinity (storing `"42"` in an INTEGER column), `strftime()`-style date functions, `AUTOINCREMENT` vs `SERIAL`/`IDENTITY`, JSON path syntax (`json_extract` vs `->>`). Most don't error — they just give different answers on Postgres.

**Why it happens:**
Developers write raw SQL or use SQLAlchemy-Core functions that map to dialect-specific SQL. SQLite is permissive, Postgres is strict.

**How to avoid:**
- Use SQLAlchemy ORM / Core expression language exclusively. No raw `text("SELECT ...")` queries. If you must, parametrize and test against both dialects.
- For JSON queries against the snapshot column, **only** query JSON in Python after fetching, not via SQL. Avoids `json_extract` vs `->>` divergence.
- For booleans: use SQLAlchemy `Boolean` type, not 0/1 integers.
- For UUIDs/IDs: use `Integer` autoincrement (works on both) or `String(36)` for UUIDs. Don't use `UUID` SQLAlchemy type — its native PG type isn't portable to SQLite.
- For datetimes: store UTC `DateTime(timezone=False)` and convert at the edges. Avoid `func.now()`-dependent behaviors that differ.
- **CI strategy**: run the full test suite against both SQLite AND Postgres (testcontainers-postgres or a CI service). Tests passing on SQLite alone are not enough.

**Warning signs:**
- Raw SQL strings in the codebase.
- The test matrix has only one DB.
- Use of `pragma_*` functions in queries.

**Phase to address:** **Persistence** phase + **CI Setup**. Important.

---

### Pitfall 11: Vite HMR silently broken in Docker

**What goes wrong:**
Frontend dev container with bind-mounted source: file save on host doesn't trigger HMR in container because Docker bind mounts don't forward inotify events into the container on macOS/Windows (and unreliably on Linux). Developer thinks "the change didn't apply", does a full container restart on every save, dev loop becomes 30s instead of 200ms. Often masked because the HTTP connection drops eventually and a manual refresh "works", so devs assume it's slow rather than broken.

**Why it happens:**
chokidar (Vite's file watcher) relies on OS events; bind mounts don't propagate them. Specific to Docker-on-Mac / Docker-on-WSL.

**How to avoid:**
- `vite.config.ts`: `server: { host: '0.0.0.0', port: 3000, watch: { usePolling: true, interval: 1000 }, hmr: { clientPort: 3000 } }`.
- `docker-compose.yml` frontend service: `environment: CHOKIDAR_USEPOLLING=true`.
- Mount source at `/app` and add a separate **named volume** for `/app/node_modules` so host's `node_modules` (different OS/arch) doesn't shadow the container's installed deps.
- Document in README: "if HMR is sluggish, lower `watch.interval` at the cost of CPU".

**Warning signs:**
- File saves don't update browser within 1–2 seconds.
- "Why does my CSS change take 30s?" in team chat.
- No `usePolling` config in `vite.config.ts`.

**Phase to address:** **Frontend Setup / Docker** phase. Important (dev velocity).

---

### Pitfall 12: Vite ENV vars not prefixed with `VITE_`

**What goes wrong:**
Vite only injects environment variables prefixed with `VITE_` into the client bundle. Developers set `API_URL=http://backend:8000` in `.env`, reference `import.meta.env.API_URL` in code, get `undefined`, then either hardcode `localhost:8000` (breaks in Docker network where the backend is at `backend:8000`) or expose all envs by mistake.

**Why it happens:**
This is a security feature — by default Vite refuses to inject server-side envs into the client to prevent leaking secrets. The prefix is the opt-in.

**How to avoid:**
- All client-facing env vars use `VITE_` prefix: `VITE_API_BASE_URL`.
- Resolve the API base URL by environment: dev → `http://localhost:8000`; in Docker → `http://backend:8000`; in production → `/api` (same-origin proxy via nginx/Caddy).
- For the local-first scenario where backend and frontend are on the same `docker-compose up`, the cleanest design is **same-origin**: serve the frontend from the backend (FastAPI `StaticFiles`) or put a tiny reverse proxy in front. That eliminates CORS and the env-var-per-environment problem.

**Warning signs:**
- CORS errors in browser console.
- `import.meta.env.API_URL` printing `undefined`.
- API URL hardcoded as a string in the source.

**Phase to address:** **Frontend Setup** phase. Important.

---

### Pitfall 13: Tailwind purges dynamic class names

**What goes wrong:**
Code like `<span className={\`text-${severity}-600\`}>` where `severity ∈ {'red','yellow','green'}` — Tailwind's JIT compiler can't see the full class name in source, purges `text-red-600` / `text-yellow-600` / `text-green-600` from the production bundle, and the risk-color indicator in the dashboard renders unstyled.

**Why it happens:**
Tailwind scans source text for literal class strings. Template literals with variables are invisible to it.

**How to avoid:**
- **Never build class names dynamically.** Always write full literals:
  ```tsx
  const severityClass = {
    low: 'text-green-600',
    med: 'text-yellow-600',
    high: 'text-red-600',
  }[severity];
  ```
- If unavoidable (e.g. classes generated server-side), use `safelist` in `tailwind.config.js` with explicit list or regex patterns.
- Add a manual smoke test in CI: build production, grep the resulting CSS for known dynamic classes.

**Warning signs:**
- "It looks fine in dev but the colors are missing in prod".
- Template-literal class strings in JSX.
- A `safelist` empty in config + dynamic classes in code.

**Phase to address:** **Frontend Build** phase. Nice-to-mitigate (cheap fix once known).

---

### Pitfall 14: Docker volume UID/GID mismatch — DB file unwritable

**What goes wrong:**
Container runs as UID 1000 inside; host bind-mounted `./data` is owned by host UID 501 (macOS) or 1001 (Linux dev). Container can't write `estimates.db`, SQLAlchemy errors `unable to open database file` on first migration. Or worse, the file gets created with mixed ownership and subsequent `docker-compose down && up` produces "permission denied" only sometimes.

**Why it happens:**
Bind mounts preserve host ownership. Container processes need a UID that matches the directory owner.

**How to avoid:**
- Prefer **named volumes** for the DB (`data:/app/data` in compose with `volumes: data:` declared). Named volumes are Docker-managed, owned by the container user automatically. Trade-off: less inspectable from host.
- If bind-mount is required for inspectability (a consultant wants to back up `data/`): pass `user: "${UID}:${GID}"` in docker-compose and document `export UID=$(id -u) GID=$(id -g)` in README. Alternatively, an entrypoint script that `chown`s the volume on startup.
- For `config/` (weights.json, methodik.txt): bind-mount is *good* — admin wants to edit by hand sometimes. Same UID-matching applies.
- Cross-platform line endings: `.gitattributes` with `* text=auto eol=lf` and `*.sh eol=lf` to prevent Windows users committing CRLF that break shell scripts.

**Warning signs:**
- "Works on my Mac, breaks on the Linux laptop".
- Files written by the container appear as root-owned on the host.
- Compose file has bind-mounts for DB but no `user:` directive.

**Phase to address:** **Docker / Deployment** phase. Important (first-run experience).

---

### Pitfall 15: docker-compose `depends_on` doesn't wait for readiness

**What goes wrong:**
`depends_on: [backend]` on the frontend service only waits for the backend **container** to start, not for the backend HTTP server to be **ready**. Frontend boots, hits `http://backend:8000/api/estimates`, gets connection refused, shows a broken UI on first `docker-compose up`. Re-running fixes it (backend is ready by then), which makes the bug intermittent and easy to dismiss.

**Why it happens:**
Default `depends_on` is "start order" only. Healthcheck-gated depends_on is opt-in.

**How to avoid:**
- Define a `healthcheck` on the backend service: `test: ["CMD", "curl", "-f", "http://localhost:8000/health"]` (implement `GET /health` returning 200 once DB migrations are done).
- Use `depends_on: { backend: { condition: service_healthy } }` (long-form syntax).
- The frontend should retry-with-backoff on initial API failure regardless — server-side health is no excuse for fragile client-side init.

**Warning signs:**
- README says "if it doesn't work, run docker-compose up again".
- No `/health` endpoint exists.
- `depends_on` is the short-form string list.

**Phase to address:** **Docker / Deployment** phase. Important.

---

### Pitfall 16: CORS misconfig in production

**What goes wrong:**
Dev uses permissive CORS (`allow_origins=["*"]`). It accidentally ships to prod. Or the opposite: prod CORS is locked down and the browser blocks legitimate requests; developer "fixes" it by setting `allow_origins=["*"]` again. With cookies/auth (future), `allow_origins=["*"] + allow_credentials=True` is rejected by browsers anyway.

**Why it happens:**
CORS is fiddly. Examples copy-paste wildcards. The same-origin approach is "boring" so people skip it.

**How to avoid:**
- Same-origin design (see Pitfall 12) **eliminates CORS entirely** for v1. Serve frontend assets from the backend OR via a reverse proxy on one port. This is the cleanest local-first answer.
- If CORS is unavoidable: `allow_origins=[FRONTEND_ORIGIN]` (single explicit string from env), `allow_credentials=False` until auth is needed.

**Warning signs:**
- `allow_origins=["*"]` in code committed to main.
- Browser console errors about preflight.
- Two ports exposed publicly when one would suffice.

**Phase to address:** **Backend Setup** phase. Important.

---

## Domain & Methodology Pitfalls

### Pitfall 17: Anchoring bias from default values

**What goes wrong:**
Pre-filled defaults (e.g. "Tech-Reife = neutral", default complexity = "medium", default day rate = €1.200) become anchors. Consultants under time pressure accept defaults without thinking, then the tool's authoritative output (PERT, € total, PDF) **launders the consultant's lack of consideration** into client-facing precision. Worse than a hand-calculated estimate because the PDF *looks* rigorous. Research shows anchors have large effects on software estimates (Cohen's d ≈ 1.19) regardless of estimator experience.

**Why it happens:**
Defaults exist for UX speed; their bias-inducing power is undervalued.

**How to avoid:**
- **Don't pre-fill correction factors.** Force the user to pick. The four correction-factor dropdowns should start with no selection (e.g. "— bitte wählen —") and be required.
- **Don't pre-fill complexity.** Same logic: each parameter row requires an explicit complexity choice.
- **Day rate IS okay to pre-fill** with last-used value (functional UX win, less methodologically loaded).
- Add a methodology boilerplate paragraph to the PDF: "Schätzung basiert auf Annahmen des Erstellers; tatsächliche Aufwände können abweichen." This contextualizes the numbers as estimates, not predictions. Already in the requirements as "Methodik-Boilerplate" — make sure it's prominent.
- Show "Erstellt von" + date prominently on PDF so accountability is human, not algorithmic.

**Warning signs:**
- Form fields with default values for any subjective parameter.
- No required-field validation; user can submit a form with everything default.
- Methodology disclaimer hidden in PDF appendix.

**Phase to address:** **Frontend Forms / UX** phase. Important.

---

### Pitfall 18: PERT triangular assumption misleads on long-tailed tasks

**What goes wrong:**
`PERT = (O + 4M + P) / 6` and `σ = (P - O) / 6` assume a beta-PERT distribution (concentrated around M). For software projects with rare-but-catastrophic risks (the "we discovered the integration partner has no API" surprise), the real distribution is **long-tailed right** — a small probability of a 5x blow-up. PERT's fixed weighting (1:4:1) understates that tail. Showing σ as a precise number ("± 3.2 PT") creates a false sense of statistical rigor.

**Why it happens:**
PERT is industry-standard and looks scientific. The underlying assumption (symmetric beta around M) is rarely verified.

**How to avoid:**
- Don't display σ to two decimals — display a range (`O–P` or 80% confidence interval) and label it "Spannweite", not "Standardabweichung". Less precision = honest precision.
- Make the optimistic/pessimistic multipliers (0.75 / 1.55) admin-editable (already in requirements) so different consulting houses can model their actual historical distribution. Default to 0.75 / 1.55 but document it as "Hausannahme, anpassbar".
- The risk note ("wenn ein Faktor > 1.15") is a good softening — keep it; consider triggering it also when the spread `(P - O) / M` exceeds a threshold.
- Methodology boilerplate: explicit caveat that PERT assumes a specific distribution shape and is unreliable for high-uncertainty / black-swan projects.

**Warning signs:**
- σ displayed to 4 decimal places.
- No risk note in PDF for high-uncertainty estimates.
- No documentation of the distributional assumption in `methodik.txt`.

**Phase to address:** **Calculation Core** + **Output / Methodology** phase. Important.

---

### Pitfall 19: Clone-only UX creates "fix-a-typo" friction

**What goes wrong:**
Consultant created an estimate, noticed a typo in the project name. Clone-only means: clone, fix typo, delete original. That's three clicks instead of one Edit. With 50 estimates accumulated, the verlauf gets polluted with near-duplicates if consultants don't disciplined-delete the old ones. Audit benefit (every change is a new immutable record) competes with daily usability.

**Why it happens:**
Audit-immutability is the right architectural call for **value** (parameters, weights) — but project name / Projektskizze are **labels**, not values, and immutability over labels is friction without benefit.

**How to avoid:**
- Surface the constraint: design two endpoints — `/estimates/:id` is fully immutable for the *calculated* fields; allow `PATCH /estimates/:id/labels` for `name`, `description`, `created_by` (the three pure-label fields). These don't affect the calculation result, so reproducibility is preserved.
- Alternatively, accept the constraint and make clone+delete a two-click flow with a "Clone & replace" affordance.
- Document the trade-off in the UI: "Werte sind unveränderlich (Audit-Schutz); Beschriftungen können editiert werden."

**Warning signs:**
- Consultant feedback: "I have 20 versions of the same estimate because of typos."
- Verlauf clutters with `Projekt X`, `Projekt X (Kopie)`, `Projekt X (Kopie 2)`.
- No way to fix the "Erstellt von" name after save.

**Phase to address:** **Persistence / UX** phase. Nice-to-mitigate (depends on user feedback).

---

### Pitfall 20: Garbage-in/authoritative-out

**What goes wrong:**
Consultant enters quick guesses ("3 Pages, 5 Use Cases, medium complexity"), tool emits a PDF with PERT calculation to one decimal place, € total to the cent, professional layout — and the client takes that PDF as a rigorous offer. The PDF's polish exceeds the inputs' rigor.

**Why it happens:**
The whole **point** of the tool is to produce client-facing output. The same polish that makes it valuable as an offer document makes it dangerous as an internal sanity check.

**How to avoid:**
- Differentiate "internal preview" vs "client PDF". The dashboard is for the consultant; the PDF is for the client. Make PDF generation a deliberate, two-click action with a "Are these inputs realistic? (Brief sanity check)" prompt.
- Always include in PDF: "Annahmen" section listing the input parameters + correction factors + day rate explicitly. The client can challenge them. This already maps to existing requirement.
- Display PT to **one** decimal place, not three. € to whole euros, not cents (you don't have cent precision in the inputs).
- Boilerplate methodology text: "Diese Schätzung basiert auf der zum Erstellungszeitpunkt vorliegenden Information. Bei Detail-Ausarbeitung der Anforderungen kann sich der Aufwand ändern."

**Warning signs:**
- PDF shows numbers with implied precision the inputs don't justify.
- No "Annahmen" section in the PDF.
- No friction between "open form" and "send PDF to client".

**Phase to address:** **Output / PDF Methodology** phase. Important.

---

### Pitfall 21: Local-first violation via implicit external requests

**What goes wrong:**
The "no external calls" promise gets violated unintentionally: (1) `<link href="https://fonts.googleapis.com/...">` in the print template; (2) a Tailwind / shadcn template that loads icons from a CDN; (3) `import 'react-pdf'` with an upstream PDF font fetch; (4) WeasyPrint's HTML parser hitting an `<img src="https://...">`; (5) telemetry libraries (Sentry, PostHog) auto-init; (6) browser-native autofill / spellcheck for `Projektname` posting to OS-level services (lesser concern but worth knowing). On an air-gapped consultant laptop, PDF generation silently 30s-stalls waiting for DNS.

**Why it happens:**
Modern web tooling defaults to hosted services. "Local-first" requires active vigilance.

**How to avoid:**
- WeasyPrint: pass `url_fetcher=disallow_external_fetcher` to `HTML(...)` — a small function that returns 404 for non-`file://` URLs. Pin all assets locally.
- Frontend build: audit `package.json`; no analytics libraries; no CDN-loaded icons (use `lucide-react` / `heroicons` as packages, not CDN).
- Fonts bundled into the Docker image (Pitfall 5); print template references them via `@font-face { src: url('file:///usr/share/fonts/...') }` or relative paths under `/app/static/fonts/`.
- Add a CI check: `docker-compose up` + offline mode (network disabled) + smoke test of estimate creation + PDF generation. If anything hangs or 404s, the promise is broken.
- Document in README: "Tool funktioniert ohne Internetverbindung — bei Problemen wende dich an den Admin."

**Warning signs:**
- `fonts.googleapis.com` in HTML/CSS.
- `Sentry.init(...)` in main.tsx.
- An `<img>` tag with an external URL in the PDF template.
- Lighthouse network tab in dev shows requests to non-localhost domains.

**Phase to address:** **PDF Rendering** + **Frontend Setup** phase. Important.

---

### Pitfall 22: German formatting wrong (date / currency / decimal separator)

**What goes wrong:**
Default Python `f"{value:,.2f}"` → `1,234.56` (US format). Default `datetime.isoformat()` → `2026-05-16` (ISO; not "wrong" but not German consulting-document idiom). Mixing: PDF shows `1,234.56 €` on one line and `1.234,56 €` on the next because two different code paths formatted. Client looks at the PDF, instinctively flags "der Berater hat den Preis verschoben" — credibility damaged.

**Why it happens:**
Python defaults are en_US. Babel / `locale.setlocale` aren't used.

**How to avoke:**
- Use `babel.numbers.format_currency(decimal_value, 'EUR', locale='de_DE')` → `'1.234,56 €'`. CLDR-backed, not OS-dependent (relevant: the macOS dev box and the slim Linux container have different locales installed).
- Use `babel.dates.format_date(d, format='medium', locale='de_DE')` → `'16. Mai 2026'`. Or short → `'16.05.2026'`. Pick one and apply project-wide.
- Centralize formatting in **one** module (`app/format.py`). Every PDF/UI place that displays money/dates imports from there. Code review: any `:.2f` or `strftime("%m/%d/...")` is a bug.
- For decimal separator in inputs (the user typing "1,5" PT): the form should accept comma OR period; the parser normalizes. Pydantic `field_validator(mode='before')` doing `value.replace(',', '.')`.

**Warning signs:**
- `f"{€value:.2f}"` anywhere.
- Date formatting via `strftime` instead of Babel.
- Inputs reject "1,5" but accept "1.5".

**Phase to address:** **Output / PDF** phase + **Forms**. Important for credibility.

---

## Forward-Looking Pitfalls

### Pitfall 23: Cloud migration assumes writable filesystem

**What goes wrong:**
Architecture today writes to two places: SQLite DB file in `./data/` and `weights.json` in `./config/`. Many serverless platforms (fly.io machines have ephemeral disk by default, Cloud Run has read-only filesystem except `/tmp`, Vercel functions are read-only) cannot persist filesystem writes between requests. SQLite needs a persistent volume mount; `weights.json` needs to live somewhere durable.

**Why it happens:**
Local-first naturally uses files. Cloud abstractions hide that "write to disk" is a privilege.

**How to avoid:**
- Document the cloud path now even if not implemented: `weights.json` will move into the database as a `config` table (one row, JSON column) for cloud deploys. Same Pydantic snapshot type; just different storage backend. Plan the abstraction now: a `WeightsStore` interface with `FileWeightsStore` (v1) and `DbWeightsStore` (cloud) implementations.
- SQLite path: cloud deploy uses Postgres via `DATABASE_URL` — already designed.
- Avoid temp file writes that don't make it to a real volume. Anything written under `/tmp` should be considered ephemeral; the PDF output should be returned as a streaming response, not persisted to disk and served via static file.

**Warning signs:**
- `open("config/weights.json", "w")` calls scattered in the codebase.
- No `WeightsStore` abstraction.
- Plans to deploy to Cloud Run / Lambda with "we'll figure out persistence later".

**Phase to address:** **Architecture decisions** before final persistence design. Nice-to-mitigate (deferred but architecturally relevant).

---

### Pitfall 24: PDF/A archival compliance creeps in late

**What goes wrong:**
A client says "we archive offers for 10 years, need PDF/A-2b". WeasyPrint can produce PDF/A but it requires extra config (pdfa option, embedded fonts, no transparent images, color profile). Bolted on at the end, this means redoing the PDF rendering pipeline.

**Why it happens:**
PDF/A is a niche compliance requirement; easy to defer until it's urgent.

**How to avoid:**
- v1: confirm with target user(s) that PDF/A is not required. Document in PROJECT.md as Out of Scope.
- v2 readiness: if it might be needed, ensure: (a) all fonts are embedded in the PDF (WeasyPrint does this by default for system fonts, but check via `pdffonts` tool); (b) no external assets referenced; (c) color profile is set to sRGB. These are good practices anyway.
- If PDF/A becomes a hard requirement, evaluate `pikepdf` post-processing to add PDF/A metadata, OR switch the renderer (ReportLab has PDF/A support).

**Warning signs:**
- Client says "we archive these" and there's no PDF/A discussion.
- PDFs reference system fonts that aren't embedded.

**Phase to address:** **PDF / Compliance** phase if scoped. Nice-to-mitigate.

---

### Pitfall 25: Single-user assumption baked into models despite "Auth-Ready" promise

**What goes wrong:**
PROJECT.md mandates "Tabellen so designen, dass nachträgliches Hinzufügen von `user_id` (nullable FK) kein Breaking Change wird." Easy to violate: queries like `SELECT * FROM estimates ORDER BY created_at` will return everyone's estimates when multi-user lands; unique constraints like `UNIQUE(name)` will conflict across users; the "letzter Erstellt-von-Name" auto-fill is a per-process global instead of per-user.

**Why it happens:**
Hard to think about multi-tenancy when there's no auth. Easy to write code that's structurally wedded to single-user.

**How to avoid:**
- Add `user_id INTEGER NULL` to every domain table now (estimates, future tables). Default NULL. Indexes assume `user_id` will be a filter dimension.
- Repository functions: every list/search query takes a `user_id: int | None` arg. v1 always passes `None` → filters to `WHERE user_id IS NULL`. Multi-user flip later just wires `current_user.id` in.
- Unique constraints: any future ones should be `UNIQUE(user_id, name)` from day one.
- "Last used Erstellt-von" — store in a `user_preferences` table (with `user_id IS NULL` for single-user), not in a singleton or env var. Future-proof.

**Warning signs:**
- A `SELECT * FROM estimates` with no `user_id` filter.
- "Last used" stored in memory or in a file shared across users.
- Unique constraints that don't include `user_id`.

**Phase to address:** **Persistence / Schema** phase. Important — once data is collected, retrofitting `user_id` is a migration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `float` instead of `Decimal` "just for now" | Fewer type conversions | Off-by-cent / off-by-PT errors that surface in front of clients | Never |
| Skip atomic write for `weights.json` | One less line of code | Corrupted config file blocks startup; lost admin edits | Never |
| Hard-code API base URL `http://localhost:8000` | Saves env var plumbing | Breaks the moment frontend is served from anywhere else | Demo only, never production-bound |
| Single Tailwind class string with template literal | Convenient dynamic styling | Class purged in prod, broken UI | Never — use map dict |
| Read `weights.json` on every API request | Always "fresh" config | File contention, ~5x latency floor, atomicity nightmare | Never — cache in memory |
| `INSERT OR REPLACE` (SQLite syntax) | One-line upsert | Breaks Postgres readiness | Never (use SQLAlchemy `merge()` or explicit check-then-insert) |
| Skip CI test against Postgres | Faster CI | "SQLite-portable" claim becomes false silently | When cloud migration is permanently out of scope (not the case here) |
| Default-filled correction factor dropdowns | One less click | Anchoring bias on every estimate | Never — these are domain-loaded |
| `allow_origins=["*"]` in FastAPI | No CORS errors in dev | Security risk + breaks `allow_credentials` | Local-only, never deployed |
| No healthcheck on backend service | One less file | Frontend fails first `docker-compose up`, dismissed as flaky | Never |
| Skip German locale formatting in v1 | Faster v1 | Client receives "1,234.56 €" PDF — embarrassment | Never (the locale is THE point of v1) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WeasyPrint ↔ Docker | `pip install weasyprint` only, no `apt-get` for Pango/Cairo | Install system libs in same Dockerfile layer + smoke test render in build |
| WeasyPrint ↔ Fonts | Rely on system default fonts → umlauts as tofu | Bundle `fonts-dejavu` or `fonts-liberation` + `fc-cache -fv` |
| WeasyPrint ↔ External URLs | Print template fetches CDN fonts/images | Disable network fetcher: `HTML(url_fetcher=local_only)` |
| SQLAlchemy ↔ SQLite Decimal | Default `Numeric` falls back to REAL with SAWarning | `TypeDecorator` storing Decimal as TEXT for SQLite |
| SQLAlchemy ↔ JSON column | Different syntax for SQLite vs Postgres in JSON queries | Use SQLAlchemy `JSON` type, query in Python not SQL |
| Pydantic v2 ↔ Decimal | v2 serializes as JSON string with full trailing precision | `@field_serializer` formatting Decimals to chosen precision |
| FastAPI ↔ CORS | `allow_origins=["*"]` + `allow_credentials=True` (browsers reject) | Same-origin via static-files or single proxy port |
| FastAPI ↔ OpenAPI in prod | `/docs` exposed to internet | `FastAPI(docs_url=None, openapi_url=None)` gated by env |
| Vite ↔ Docker bind mount | inotify events not propagated → no HMR | `usePolling: true` + named volume for `node_modules` |
| Tailwind ↔ Production build | Dynamic class names purged | Full literals via map dict OR explicit `safelist` |
| Docker Compose ↔ Service order | `depends_on` waits for start, not health | `service_healthy` condition + `/health` endpoint |
| Docker Compose ↔ Bind mount UID | Container UID ≠ host UID → permission denied | `user: ${UID}:${GID}` or named volume |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| WeasyPrint rendering large tables | PDF generation > 5s | Keep tables small; minimal CSS in print template | > 50 rows or > 200 KB HTML |
| Re-reading `weights.json` per request | Calc latency floor grows with file size | Load once at startup, refresh on mtime change | Multi-user (concurrent reads + write) |
| SQLite write contention | `OperationalError: database is locked` | WAL mode + `busy_timeout=5000` + single worker | > 2 concurrent writers |
| `response_model` overhead per request | 50+% CPU on serialization | Use `TypeAdapter` for repeated types; consider raw `ORJSONResponse` for hot paths | High RPS — but this app is single-user, never hot |
| Tailwind dev build large | First page load slow in dev | JIT mode (default in v4); narrow `content` paths in config | Not really a concern at this scale |
| Vite watching `node_modules` | High CPU with polling enabled | Add `node_modules` to `watch.ignored` (default but verify) | macOS / WSL dev |

---

## Security Mistakes (Domain-Specific)

| Mistake | Risk | Prevention |
|---------|------|------------|
| `/admin` unprotected in deployed env (even single-user) | Anyone on the network can rewrite weights | v1 is local-only; document loudly that exposing port 8000 publicly without adding auth is a deployment misuse |
| OpenAPI `/docs` exposed publicly | Information disclosure of internal endpoints | `docs_url=None` in production env config |
| User-entered Projektskizze rendered as HTML in PDF | XSS / template injection in WeasyPrint | Use Jinja `\|escape` (default); never `\|safe` user-controlled content |
| Filename injection via Projektname in PDF download | `Content-Disposition: filename=...` with user input | Sanitize filename: alphanumeric + `_`, max 50 chars |
| SQL injection via search (Projektname filter) | DB compromise | SQLAlchemy ORM parametrization (never `f"WHERE name = '{q}'"`) |
| `weights.json` writable by world on host bind mount | Local admin escalation | Restrict directory permissions to user; document `chmod 700 config/` |
| Backup of `data/estimates.db` contains client confidential project info | Data leak via cloud backup tools (Time Machine, Dropbox) | Document: store the directory outside auto-backup paths OR encrypt the db file |
| Telemetry / crash reports leaking customer project names | Confidentiality breach | No third-party SDKs in v1; if added later, scrub PII |
| Logs containing project names + €-amounts written to stdout | Visible in container logs / log aggregator | Log only IDs and timing, never input content |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Defaults on subjective inputs (correction factors) | Anchoring bias, inflated apparent rigor | No-default placeholder, required selection |
| Showing PT to 3 decimal places | False precision | One decimal; round PT before display, not before storage |
| Showing σ ("Standardabweichung 3.2 PT") | Implies statistical rigor that doesn't exist | Show as "Spannweite O–P", drop σ from UI |
| Verlauf grows unboundedly | Clone-only → typo cleanup nightmare | Allow PATCH on label-only fields (name, description, created_by) |
| Risk note shown only when factor > 1.15 | Threshold feels arbitrary | Also show when O–P spread > some % of M; document threshold in methodology |
| German labels mixed with English buttons | Unprofessional feel | Audit: every visible string is German except in code |
| Errors shown only as HTTP status | "Why doesn't this work?" | German error messages mapped from Pydantic validation errors |
| Admin save with invalid weights bricks the app | Recovery requires file-system access | Validate before save; reject 422; never write invalid JSON |
| PDF download named `estimate.pdf` | Hard to find in a folder of 50 client estimates | Filename: `Schaetzung_{Projektname}_{YYYY-MM-DD}.pdf` |
| Day rate input in € but no euro sign visible | Possible misinterpretation as $ | Always show "€/PT" suffix |

---

## "Looks Done But Isn't" Checklist

- [ ] **Calculation:** Often missing — single source of truth for rounding mode. Verify: `grep -r ROUND_ src/` returns one and only one mode.
- [ ] **Weights snapshot:** Often missing — at least one input that *affects* the calculation. Verify: load an estimate from 6 months ago in a tool branch where admin defaults differ, assert displayed PT == stored PT.
- [ ] **PDF:** Often missing — German umlauts rendering. Verify: render a test PDF with "Schäfer & Müller GmbH — Projektskizze über Ölhändler" and visually inspect.
- [ ] **PDF:** Often missing — euro formatting. Verify: PDF shows `1.234,56 €` (not `1,234.56 €` or `1234.56 EUR`).
- [ ] **PDF:** Often missing — date formatting. Verify: PDF shows `16.05.2026` or `16. Mai 2026`, not `2026-05-16` or `05/16/2026`.
- [ ] **PDF:** Often missing — embedded fonts. Verify: `pdffonts output.pdf` shows all fonts as "embedded yes".
- [ ] **PDF:** Often missing — table page-break handling. Verify: force a long enough estimate that the parameter table spans pages, confirm header repeats.
- [ ] **Admin / weights.json:** Often missing — validation BEFORE write. Verify: try to save invalid JSON (sum ≠ 100), confirm file untouched.
- [ ] **Admin / weights.json:** Often missing — atomic write. Verify: `kill -9` mid-save in a test, confirm file is either fully old or fully new, never truncated.
- [ ] **Docker:** Often missing — health-gated frontend dependency. Verify: `docker-compose up` cold-start succeeds without manual retry.
- [ ] **Docker:** Often missing — UID matching for bind mounts. Verify: `docker-compose up` then check `ls -la data/` from host shows your UID, not root.
- [ ] **Frontend:** Often missing — production build smoke test for dynamic Tailwind classes. Verify: build prod, load app, all colored status indicators have the right color.
- [ ] **Frontend:** Often missing — HMR works through Docker. Verify: edit a `.tsx`, see update in browser within 2s.
- [ ] **Local-first:** Often missing — network-disabled smoke test. Verify: `docker network disconnect bridge <container>` then create estimate + generate PDF, both succeed.
- [ ] **Reproducibility:** Often missing — CI regression on all stored estimates. Verify: a CI job loads N persisted estimates, recomputes, asserts equality.
- [ ] **Postgres-readiness:** Often missing — test suite runs against Postgres too. Verify: CI has a matrix entry with `DATABASE_URL=postgresql://...`.
- [ ] **Production:** Often missing — `/docs` disabled outside dev. Verify: `curl :8000/docs` returns 404 when `ENV=production`.
- [ ] **Single-user assumption:** Often missing — `user_id` nullable column on every domain table. Verify: schema review.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Float used instead of Decimal in calculation | MEDIUM | Add Decimal-only types; mass-fix call sites; backfill recompute all stored estimates with stored snapshot to verify no drift; if drift detected, version the result with a "computed_with_float_legacy" flag |
| Weights snapshot incomplete | HIGH | Define complete snapshot schema; migration script for old rows fills missing fields with snapshot's contemporaneous defaults; flag rows as "imputed", never present them as "reproduced" |
| WeasyPrint missing Pango in prod image | LOW | Add the apt-get line, rebuild — one-line fix |
| Tofu boxes in deployed PDFs | LOW–MEDIUM | Add font packages to image, run `fc-cache`, retest; clients already have bad PDFs — communicate and re-issue |
| SQLite Decimal precision loss already in stored data | MEDIUM | Add TypeDecorator going forward; backfill is impossible (data lost); document the limit, never re-roundtrip old rows through float |
| `weights.json` corrupted | LOW | Restore from `weights.json.bak` if implemented; otherwise restore from container's default copy |
| Postgres-incompatible SQL committed | MEDIUM | Refactor each query; rerun full test against Postgres in CI |
| Single-user assumption baked in | HIGH | Schema migration adding `user_id`; refactor every query; backfill old rows with default user; UX redesign of "yours vs others" |
| External-fetch leak in PDF | MEDIUM | Configure `url_fetcher` to block non-local; identify leaked URLs from logs; replace with bundled assets |
| Anchoring-bias outputs already in client PDFs | LOW (operational) | Future PDFs only — past damage is reputational; add disclaimer prominently going forward |

---

## Pitfall-to-Phase Mapping

This mapping informs phase ordering: phases earlier in the dependency chain prevent more downstream pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Float in factor chains | Calculation Core | Test: chained-multiplication property test asserting Decimal-only |
| 2. Pydantic v2 Decimal serialization | API Schema / Calculation Core | Type adapter test; OpenAPI snapshot |
| 3. Incomplete weights snapshot | Calculation Core + Persistence | CI: reproduce-all-stored-estimates test |
| 4. weights.json race condition | Admin / Config Persistence | Test: concurrent save + read returns valid JSON always |
| 5. WeasyPrint missing Pango/fonts | PDF Rendering + Docker | Build-time smoke test in Dockerfile; render-with-umlauts assertion |
| 6. WeasyPrint table page-break | PDF Rendering | Visual snapshot test of long estimate |
| 7. SQLite Decimal precision loss | Persistence | Roundtrip equality test on SQLite AND Postgres |
| 8. Phase % ≠ 100 | Admin + Calculation Core | Pydantic validator; load-time assertion |
| 9. SQLite write contention | Infrastructure / Persistence | Engine connect-event handler sets WAL + busy_timeout |
| 10. SQLite-specific SQL | Persistence + CI | Test matrix: SQLite + Postgres |
| 11. Vite HMR in Docker | Frontend Setup | Manual smoke: edit + save + observe |
| 12. Vite ENV var prefix | Frontend Setup | Build with prod env, grep bundle for hardcoded URLs |
| 13. Tailwind class purge | Frontend Build | Prod build smoke check for known dynamic classes |
| 14. Docker volume UID/GID | Docker / Deployment | `docker-compose up` cold-start on Linux & macOS |
| 15. depends_on without healthcheck | Docker / Deployment | First-run smoke test from clean state |
| 16. CORS misconfig | Backend Setup | Same-origin design (avoids the issue) |
| 17. Anchoring bias from defaults | Frontend Forms / UX | No-default required-selection on subjective fields |
| 18. PERT triangular misuse | Calc Core + Methodology | Methodik.txt documents limitations; UI labels honest |
| 19. Clone-only friction | Persistence / UX | PATCH endpoint for label-only fields |
| 20. Authoritative-looking garbage out | Output / Methodology | "Annahmen" section mandatory in PDF; one-decimal display |
| 21. Local-first violation | PDF Rendering + Frontend | Offline smoke test in CI |
| 22. German format wrong | Output / PDF + Forms | Centralized `format.py`; CI grep for `:.2f` on money |
| 23. Cloud filesystem assumptions | Architecture | `WeightsStore` interface defined now |
| 24. PDF/A compliance | Out of Scope / PDF | Confirm with user; embed fonts proactively |
| 25. Single-user baked in | Persistence / Schema | `user_id NULL` column day-1; query filters parameterized |

**Phase ordering implication:** Calculation Core → Persistence → API → PDF → Admin → Frontend → Docker/Deploy. The first three host the bulk of critical pitfalls and downstream phases inherit their correctness.

---

## Sources

### Stack / Infrastructure
- [WeasyPrint: First Steps install requirements](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html)
- [Kozea/WeasyPrint Issue #1565: cannot load library 'pango-1.0'](https://github.com/Kozea/WeasyPrint/issues/1565)
- [Kozea/WeasyPrint Issue #2225: Pango library missing](https://github.com/Kozea/WeasyPrint/issues/2225)
- [Kozea/WeasyPrint Issue #1104: memory blowup with large tables](https://github.com/Kozea/WeasyPrint/issues/1104)
- [Kozea/WeasyPrint Issue #413: Table breaks across pages](https://github.com/Kozea/WeasyPrint/issues/413)
- [Kozea/WeasyPrint Issue #732: page-break-inside avoid breaks @page](https://github.com/Kozea/WeasyPrint/issues/732)
- [pydantic/pydantic Issue #7457: Decimals serialized as strings](https://github.com/pydantic/pydantic/issues/7457)
- [pydantic/pydantic Issue #5072: JSON schema parsing vs serialization](https://github.com/pydantic/pydantic/issues/5072)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [FastAPI metadata and docs URLs](https://fastapi.tiangolo.com/tutorial/metadata/)
- [TestDriven: Disabling FastAPI OpenAPI docs](https://testdriven.io/tips/80107066-795c-4026-b7df-e250cdcd3dac/)
- [sqlalchemy/sqlalchemy Issue #1759: SQLite arbitrary precision broken](https://github.com/sqlalchemy/sqlalchemy/issues/1759)
- [Python Tutorials: Decimal in SQLAlchemy with SQLite (TypeDecorator)](https://www.pythontutorials.net/blog/how-should-i-handle-decimal-in-sqlalchemy-sqlite/)
- [SQLModel: Decimal Numbers](https://sqlmodel.tiangolo.com/advanced/decimal/)
- [SQLite WAL documentation](https://sqlite.org/wal.html)
- [Abusing SQLite to handle concurrency — SkyPilot blog](https://blog.skypilot.co/abusing-sqlite-to-handle-concurrency/)
- [Concurrent write transactions in SQLite — oldmoe's blog](https://oldmoe.blog/2024/07/08/the-write-stuff-concurrent-write-transactions-in-sqlite/)
- [vitejs/vite Discussion #14007: Docker + Vite HMR](https://github.com/vitejs/vite/discussions/14007)
- [vitejs/vite Issue #16143: HMR not working in Docker demo](https://github.com/vitejs/vite/issues/16143)
- [Tailwind safelist & dynamic class purging](https://blogs.perficient.com/2025/08/19/understanding-tailwind-css-safelist-keep-your-dynamic-classes-safe/)
- [Docker bind mount UID/GID guide](https://www.buildwithmatija.com/blog/how-to-fix-permission-denied-when-manipulating-files-in-docker-container)
- [Docker volume ownership fixes (UID/GID) — Modexa](https://medium.com/@Modexa/7-docker-volume-ownership-fixes-uid-gid-the-python-way-23b59e703a83)
- [Babel: Numbers and Currencies](https://babel.pocoo.org/en/latest/api/numbers.html)
- [Babel: Number Formatting locale=de_DE](https://babel.pocoo.org/en/latest/numbers.html)

### Atomic writes & file locking
- [Python atomicwrites library (untitaker)](https://github.com/untitaker/python-atomicwrites)
- [ELL Blog: Avoid data corruption by syncing to disk](https://blog.elijahlopez.ca/posts/data-corruption-atomic-writing/)
- [GeeksforGeeks: File locking in Python (fcntl.flock)](https://www.geeksforgeeks.org/python/file-locking-in-python/)
- [Apenwarr: Everything you never wanted to know about file locking](https://apenwarr.ca/log/20101213)

### Rounding / Decimal
- [Real Python: How to round numbers in Python (rounding modes)](https://realpython.com/python-rounding/)
- [Banker's rounding vs ROUND_HALF_UP — note.nkmk.me](https://note.nkmk.me/en/python-round-decimal-quantize/)

### Estimation domain
- [ACM SIGSOFT: Anchoring and adjustment in software estimation](https://dl.acm.org/doi/10.1145/1095430.1081761)
- [Cognitive Biases in Software Engineering: A Systematic Mapping Study (PDF)](https://www.researchgate.net/publication/328410759_Cognitive_Biases_in_Software_Engineering_A_Systematic_Mapping_Study)
- [Embedded Artistry: Improving Estimation — Human Biases](https://embeddedartistry.com/blog/2020/03/09/improving-our-estimation-abilities-human-biases/)
- [Lumivero: Cost estimating — Triangular vs PERT](https://lumivero.com/resources/blog/cost-estimating-triangular-vs-pert/)
- [Project-Management.info: Three-Point Estimating and PERT Distribution](https://project-management.info/three-point-estimating-pert/)
- [Statistically Mitigating Subjective Estimates with PERT (IJISRT PDF)](https://ijisrt.com/assets/upload/files/IJISRT24SEP164.pdf)
- [Galorath: Three-Point Estimating](https://galorath.com/estimation/three-point-estimating/)
- [Stoneridge Software: Why software project estimates are almost always low](https://stoneridgesoftware.com/why-are-software-project-estimates-almost-always-low/)

---
*Pitfalls research for: Software Estimation Manager (FastAPI + React + WeasyPrint + Docker Compose, local-first, de-DE consulting context)*
*Researched: 2026-05-16*
