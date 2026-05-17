---
phase: 01
slug: skeleton-slice
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-16
approved: 2026-05-17
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 01-RESEARCH.md §"Validation Architecture" + §"Phase Requirements → Test Map".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None installed in Phase 1** (D-Discretion locks minimal tooling — pytest/vitest follow in Phase 2). Validation via shell smoke tests executed against the live compose stack. |
| **Config file** | None |
| **Quick run command** | `docker compose up -d --build --wait --wait-timeout 120 && curl -fsS http://localhost:3000/api/health \| jq -e '.status == "ok"'` |
| **Full suite command** | Six labeled smoke commands in `01-03-PLAN.md` Task 2 `<verify><automated>` — sequenced via `set -e` with `echo "SMOKE-NN: ..."` labels for failure attribution. |
| **Estimated runtime** | ~30 seconds (after first `--build` which can take 60-120s for base image pulls) |

---

## Sampling Rate

- **After every task commit:** No automated tests in Phase 1 (no framework installed). Manual `curl`/grep checks after compose-affecting tasks.
- **After every plan wave:** Smoke-test suite (six labeled commands) executed sequentially.
- **Before `/gsd:verify-work`:** All six smoke commands green AND human browser checkpoint (Task 3 of 01-03) approved.
- **Max feedback latency:** ~30 seconds for the full smoke matrix once images are built.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | INFRA-05 (partial) | T-01-01 / T-01-04 | Pydantic rejects unknown complexity / negative pages / pages > 10_000 with HTTP 422; `pt: float` computed via skeleton multipliers | structural | `test -f backend/Dockerfile && test -f backend/pyproject.toml && grep -q 'expose:' backend/Dockerfile && grep -q '"pages": Field(ge=0, le=10_000' backend/app/schemas/estimate.py \|\| grep -q 'pages: int = Field(ge=0, le=10_000' backend/app/schemas/estimate.py` | ✅ (file created in same task) | ⬜ pending |
| 01-01-T2 | 01 | 1 | INFRA-05, INFRA-07 | T-01-05 | Backend logs `DATABASE_URL=sqlite:///./data/estimates.db` on startup; `/api/health` returns 200 with `{status,version,timestamp}` payload | structural | `grep -q 'os.getenv("DATABASE_URL"' backend/app/main.py && grep -q '"/health"' backend/app/routers/health.py && grep -q 'timestamp' backend/app/routers/health.py` | ✅ | ⬜ pending |
| 01-01-T3 | 01 | 1 | INFRA-05 (deps lock) | T-01-SC | Reproducible Python dependency graph | structural | `test -s backend/uv.lock` | ✅ | ⬜ pending |
| 01-02-T1 | 02 | 2 | INFRA-03 | T-02-02 | Frontend uses relative `/api/estimates` URL; nginx reverse-proxies `/api/*` → `http://backend:8000/api/`; SPA fallback ready | structural | `grep -q "fetch('/api/estimates'" frontend/src/api/client.ts && ! grep -q 'http://localhost:8000' frontend/src/api/client.ts && grep -q 'proxy_pass http://backend:8000/api/' frontend/nginx.conf && grep -q 'try_files \$uri \$uri/ /index.html' frontend/nginx.conf` | ✅ | ⬜ pending |
| 01-02-T2 | 02 | 2 | INFRA-03 (deps lock) | T-02-SC | Reproducible Node dependency graph | structural | `test -s frontend/pnpm-lock.yaml && grep -E 'vite@7\.' frontend/pnpm-lock.yaml && ! grep -E 'vite@8\.' frontend/pnpm-lock.yaml` | ✅ | ⬜ pending |
| 01-03-T1 | 03 | 3 | INFRA-01, INFRA-04, INFRA-05, INFRA-06, INFRA-07 | T-03-01 / T-03-02 | docker-compose.yml binds only port 3000 (frontend); backend uses `expose: ["8000"]`; `depends_on.backend.condition: service_healthy`; bind-mounts `./data` + `./config` | structural | `test -f docker-compose.yml && ! grep -q '^version:' docker-compose.yml && grep -q 'expose:' docker-compose.yml && grep -q '"3000:80"' docker-compose.yml && grep -q 'condition: service_healthy' docker-compose.yml && grep -q './data:/app/data' docker-compose.yml && grep -q './config:/app/config' docker-compose.yml` | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-01 | 03 | 3 | INFRA-01 | T-03-02 | `docker compose up -d --build --wait` exits 0; all services `running` | smoke | `docker compose ps --format json \| jq -e 'all(.State == "running")'` | ✅ (compose stack up) | ⬜ pending |
| 01-03-T2-SMOKE-02 | 03 | 3 | INFRA-03 | T-02-02 | End-to-end round-trip: POST to `/api/estimates` via nginx returns calculated PT | smoke | `curl -sf -X POST http://localhost:3000/api/estimates -H 'content-type: application/json' -d '{"pages":10,"complexity":"medium"}' \| jq -e '.pt == 15'` | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-03 | 03 | 3 | INFRA-04 | T-03-01 | Backend port 8000 NOT reachable from host (Information Disclosure mitigation) | smoke | `! curl -sf --max-time 2 http://localhost:8000/api/health` | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-04 | 03 | 3 | INFRA-05 | — | Backend reads `DATABASE_URL` env with SQLite default and logs it | smoke | `docker compose logs backend \| grep -F 'DATABASE_URL='` | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-05 | 03 | 3 | INFRA-06 | — | Bind-mount targets persist (host `./data` and `./config` directories tracked via `.gitkeep`) | smoke | `test -f ./data/.gitkeep && test -f ./config/.gitkeep` + `docker compose exec backend test -f /app/data/<marker> && test -f /app/config/<marker>` after `touch` round-trip | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-06a | 03 | 3 | INFRA-07 | T-03-02 | `/api/health` returns D-06 payload contract (status, version, timestamp) | smoke | `curl -sf http://localhost:3000/api/health \| jq -e '.status == "ok" and (.version\|type=="string") and (.timestamp\|type=="string")'` | ✅ | ⬜ pending |
| 01-03-T2-SMOKE-06b | 03 | 3 | INFRA-07 | T-03-02 | Docker healthcheck has transitioned to `healthy` state; exactly one service health-marked (backend only) | smoke | `docker compose ps --format json \| jq -e '[.[] \| select(.Service=="backend" and .Health=="healthy")] \| length == 1'` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Phase 1 has no test framework — all validation is structural (grep/test) on artifacts plus shell smoke tests against the live compose stack. **There is no traditional Wave 0 (no test scaffolding needed).** The "Wave 0 artifact" in this phase is the compose stack itself: the docker-compose.yml + both Dockerfiles must exist before SMOKE-01..06 can be executed.

Dependencies (in lieu of test files):

- [ ] `backend/Dockerfile`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/app/main.py`, `backend/app/routers/{health,estimates}.py`, `backend/app/schemas/estimate.py` — produced by Plan 01
- [ ] `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/src/**` — produced by Plan 02
- [ ] `docker-compose.yml`, `data/.gitkeep`, `config/.gitkeep`, root `.gitignore`/`.dockerignore`/`.env.example`/`README.md` — produced by Plan 03 Task 1
- [ ] Docker Desktop running on host with Compose v2 (precondition; documented in `user_setup`)
- [ ] `jq` available on host for smoke command JSON parsing (fallback `grep` acceptable)

*Test framework installation (pytest, vitest) is deferred to Phase 2 per D-Discretion. Phase 2 will introduce a true Wave 0 for engine + form-validation tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser renders form with `<option value="" disabled>— bitte wählen —</option>` and no pre-selected complexity (Pitfall #17 anti-anchoring) | ROADMAP Phase 1 Goal 2 / D-01 | Headless browser test (Playwright) is out-of-scope for Phase 1 per D-Discretion ("minimal tooling"); placeholder rendering + greying is a visual property | See `01-03-PLAN.md` Task 3 `<how-to-verify>` steps 3-4. User opens http://localhost:3000, inspects Komplexität dropdown placeholder, confirms greyed-out state. |
| Happy-path round-trip produces "Aufwand: 15 PT" green panel | ROADMAP Phase 1 Goal 2 | Same — DOM rendering verification | See `01-03-PLAN.md` Task 3 step 5. User enters pages=10, selects complexity=medium, clicks Berechnen, observes green panel. |
| Error-path validation shows "Bitte alle Felder ausfüllen." in red | D-01 (no defaults forces explicit choice) | DOM rendering verification | See `01-03-PLAN.md` Task 3 step 6. |
| DevTools Network tab confirms request targets `/api/estimates` (relative URL), NOT `http://localhost:8000/...` | Pitfall #2 / T-02-02 | DevTools is a browser-developer-only surface; no automated equivalent in Phase 1 (Playwright is Phase 5 candidate) | See `01-03-PLAN.md` Task 3 step 7. |

These four manual checks are consolidated into the single `checkpoint:human-verify` gate at the end of Plan 03. The executor MUST pause for user "approved" before declaring Phase 1 complete.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are explicitly structural/manual (no missing `<automated>` blocks)
- [x] Sampling continuity: at most one task (01-03-T1) without a runtime smoke command — followed immediately by SMOKE-01..06b in the next task, so no 3 consecutive tasks lack runtime validation
- [x] No traditional Wave 0 needed (no test framework in Phase 1); compose-stack artifacts gate the smoke matrix
- [x] No watch-mode flags (`docker compose up -d` is detached; smoke commands are one-shot)
- [x] Feedback latency < 30s after first build
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-17
