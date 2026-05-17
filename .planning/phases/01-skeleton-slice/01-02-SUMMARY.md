---
phase: 01-skeleton-slice
plan: 02
subsystem: infra
tags: [vite, react19, tailwind4, nginx, walking-skeleton, frontend, pnpm, typescript]

# Dependency graph
requires:
  - phase: 01-skeleton-slice
    provides: backend POST /api/estimates schema (Plan 01-01)
provides:
  - frontend/ source tree (5 TypeScript files per D-05)
  - Vite 7 + React 19 + Tailwind 4 toolchain with locked dependency tree
  - frontend/Dockerfile (multi-stage node:22-alpine -> nginx:1.27-alpine)
  - frontend/nginx.conf reverse-proxy declaration (INFRA-03)
  - frontend/pnpm-lock.yaml (82 resolved packages, no peer-dep warnings)
affects:
  - 01-03 compose-wireup (builds the frontend image, runs docker compose up smoke test)
  - phase 02 (will replace plain fetch+useState with react-hook-form+zod+TanStack Query and add the full estimation form)

# Tech tracking
tech-stack:
  added:
    - react@19.2.6
    - react-dom@19.2.6
    - vite@7.3.3
    - "@vitejs/plugin-react@5.2.0"
    - "@tailwindcss/vite@4.3.0"
    - tailwindcss@4.3.0
    - typescript@5.9.3
    - "@types/react@19.2.x"
    - "@types/react-dom@19.2.x"
  patterns:
    - "Multi-stage Docker: node build stage -> nginx runtime stage (no Node in production image)"
    - "Relative /api/ URL contract: nginx proxies in prod, Vite dev server proxies locally"
    - "Anti-anchoring placeholder: empty-string disabled option forces explicit complexity choice (Pitfall #17)"
    - "TypeScript project-references (tsconfig.json + tsconfig.app.json + tsconfig.node.json) split browser vs Node compilation contexts"
    - "Tailwind v4 CSS-first import (@import \"tailwindcss\") replaces tailwind.config.js"

key-files:
  created:
    - frontend/package.json
    - frontend/pnpm-lock.yaml
    - frontend/tsconfig.json
    - frontend/tsconfig.app.json
    - frontend/tsconfig.node.json
    - frontend/vite.config.ts
    - frontend/index.html
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/index.css
    - frontend/src/api/client.ts
    - frontend/src/components/EstimateForm.tsx
    - frontend/src/components/ResultPanel.tsx
    - frontend/nginx.conf
    - frontend/Dockerfile
    - .planning/phases/01-skeleton-slice/deferred-items.md
  modified: []

key-decisions:
  - "Chose TypeScript project-references variant (tsconfig.json + tsconfig.app.json + tsconfig.node.json) over single-file tsconfig. Modern Vite-React-TS scaffold default; allows the Node-only vite.config.ts to be type-checked with different lib settings than browser source."
  - "pnpm 9.15.0 activated via corepack (host system had ancient pnpm 6.11.0 baseline; corepack prepare pnpm@9.15.0 --activate). Lockfile format is v9, compatible with the Dockerfile's node:22-alpine + corepack runtime."
  - "Frontend api/client.ts uses fetch + plain JS Number for pt response in Phase 1 (the Pydantic backend serializes the skeleton's float pt as JSON number). Phase 2 will switch to Decimal-as-string per Decision 2 of CLAUDE.md."

patterns-established:
  - "Same-origin contract via nginx: frontend code never hardcodes backend host/port; nginx location /api/ proxy_pass http://backend:8000/api/ is the single integration seam."
  - "No-default form inputs: useState<T | ''>('') for all required dropdowns/numbers in Phase 1 forms (Pitfall #17 anti-anchoring carried forward to Phase 2's much larger form)."
  - "Strict locked Vite-7 ecosystem: explicit caret/tilde pins prevent silent Vite-8 / plugin-react-6 / TS-6 upgrades that break compat (Pitfall #1)."

requirements-completed: [INFRA-03]

# Metrics
duration: ~10min
completed: 2026-05-17
---

# Phase 1 Plan 2: Frontend skeleton scaffold Summary

**React 19 + Vite 7 + Tailwind 4 walking-skeleton frontend (pages + complexity form, plain fetch, nginx reverse-proxy to backend:8000), 15 files, 82 locked pnpm packages, zero peer-dep warnings.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-17T08:14Z
- **Completed:** 2026-05-17T08:25Z
- **Tasks:** 2
- **Files created:** 15 (14 frontend + 1 deferred-items tracker)

## Accomplishments
- Complete frontend/ source tree per D-05: 5 TypeScript files (main.tsx, App.tsx, api/client.ts, components/EstimateForm.tsx, components/ResultPanel.tsx) plus index.html, index.css, vite.config.ts, tsconfig trio, package.json
- nginx.conf with SPA fallback (try_files for Phase-2 routing readiness, Pitfall #6) and proxy_pass http://backend:8000/api/ (INFRA-03 reverse-proxy contract)
- Multi-stage Dockerfile (node:22-alpine builder -> nginx:1.27-alpine runtime) ready for Plan 01-03 compose build
- D-01 form: pages (useState<number | ''>('') ) + complexity (useState<Complexity | ''>('')) with placeholder-disabled option preventing anchoring bias (Pitfall #17)
- pnpm-lock.yaml generated via corepack pnpm@9.15.0 with zero ERESOLVE / peer-dep warnings -- Vite-7 ecosystem locked

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold frontend/ source tree, configs, nginx, Dockerfile** - `53d52ee` (feat)
2. **Task 2: Generate frontend/pnpm-lock.yaml** - `ed07eb2` (chore)

## Files Created/Modified

**Frontend source (13):**
- `frontend/package.json` - Locked manifest: vite@^7.3.3, @vitejs/plugin-react@^5.2.0, react@^19.2.6, react-dom@^19.2.6, tailwindcss@^4.3.0, @tailwindcss/vite@^4.3.0, typescript@~5.9.0, @types/react@^19.2.0, @types/react-dom@^19.2.0
- `frontend/pnpm-lock.yaml` - 82 resolved packages, vite@7.3.3 / @vitejs/plugin-react@5.2.0 / react@19.2.6 / tailwindcss@4.3.0 / typescript@5.9.3 (no 8.x / 6.x anywhere)
- `frontend/tsconfig.json` - Project-references root: references tsconfig.app.json + tsconfig.node.json
- `frontend/tsconfig.app.json` - Browser compilation: target ES2022, lib [ES2022, DOM, DOM.Iterable], jsx react-jsx, moduleResolution bundler, strict + noEmit + isolatedModules
- `frontend/tsconfig.node.json` - Node compilation for vite.config.ts: target ES2022, lib [ES2023], strict + noEmit
- `frontend/vite.config.ts` - @vitejs/plugin-react + @tailwindcss/vite + dev proxy /api -> localhost:8000, sourcemap false
- `frontend/index.html` - lang=de, title Software-Aufwandsschätzung, script /src/main.tsx
- `frontend/src/main.tsx` - StrictMode + createRoot, imports ./index.css
- `frontend/src/App.tsx` - useState<number | null>, h1 + EstimateForm + ResultPanel, no router
- `frontend/src/index.css` - Single line: @import "tailwindcss" (v4 CSS-first config)
- `frontend/src/api/client.ts` - Complexity / EstimateRequest / EstimateResponse types + postEstimate(req) calling relative '/api/estimates' (never localhost:8000)
- `frontend/src/components/EstimateForm.tsx` - D-01 form: pages (number | '') + complexity (Complexity | '') with disabled placeholder, German error "Bitte alle Felder ausfüllen.", "Berechne…"/"Berechnen" button
- `frontend/src/components/ResultPanel.tsx` - Returns null if pt===null, else renders "Aufwand: {String(pt)} PT" (no Intl.NumberFormat in Phase 1)

**Frontend infra (2):**
- `frontend/nginx.conf` - listen 80, location / { try_files $uri $uri/ /index.html }, location /api/ { proxy_pass http://backend:8000/api/ + forward headers + client_max_body_size 1m + proxy_read_timeout 30s }
- `frontend/Dockerfile` - FROM node:22-alpine AS builder (corepack + pnpm install --frozen-lockfile + pnpm build) -> FROM nginx:1.27-alpine (copy dist/ and nginx.conf, EXPOSE 80)

**Phase tracker (1):**
- `.planning/phases/01-skeleton-slice/deferred-items.md` - Notes for Plan 01-03 that root .gitignore must cover node_modules/ and dist/

## Decisions Made

- **tsconfig variant: project-references (with tsconfig.app.json).** The plan explicitly permits either variant. Project-references is the modern Vite-React-TS scaffold default and cleanly splits browser vs Node compilation. Cost: one extra config file (tsconfig.app.json) added to the Dockerfile's COPY line.
- **pnpm version: 9.15.0 via corepack.** Host system shipped corepack-baseline pnpm@6.11.0, but lockfile-v9 is what the Dockerfile (node:22-alpine + corepack runtime) expects. `corepack prepare pnpm@9.15.0 --activate` produced the right format.
- **Anchoring bias: enforced.** EstimateForm complexity state uses `useState<Complexity | ''>('')` with `<option value="" disabled>— bitte wählen —</option>` as the first option. User MUST actively choose; no default introduces a frame for "what's normal".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tsconfig.app.json to frontend/Dockerfile COPY line**
- **Found during:** Task 1 (Dockerfile authoring)
- **Issue:** Plan's Dockerfile excerpt copies only `tsconfig.json tsconfig.node.json vite.config.ts index.html`. With the chosen project-references variant, `tsconfig.json` references `tsconfig.app.json` -- without that file in the build context, `tsc -b` would fail with "Cannot find referenced project tsconfig.app.json" during `pnpm build`.
- **Fix:** Added `tsconfig.app.json` to the same COPY layer in frontend/Dockerfile.
- **Files modified:** frontend/Dockerfile
- **Verification:** All three tsconfig files exist; Dockerfile COPY layer now matches the project-references tree.
- **Committed in:** 53d52ee (Task 1)

**2. [Rule 2 - Missing Critical] Created deferred-items.md tracker for .gitignore gap**
- **Found during:** Task 2 (after pnpm install)
- **Issue:** `pnpm install` creates `frontend/node_modules/` (~150MB), which has no .gitignore coverage yet. Root .gitignore covers only `.claude/`. If a future task ran `git add .`, node_modules would be committed.
- **Fix:** Did NOT modify .gitignore (out of scope -- Plan 01-03 owns the canonical .gitignore per RESEARCH §"Root — .gitignore"). Instead created `.planning/phases/01-skeleton-slice/deferred-items.md` so Plan 03 cannot miss this dependency. Verified `git status --short` aggregates node_modules to a single line, so accidental staging is unlikely but possible.
- **Files modified:** .planning/phases/01-skeleton-slice/deferred-items.md (new)
- **Verification:** Tracker file exists and is staged in the Task 2 commit.
- **Committed in:** ed07eb2 (Task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes preserve plan boundaries (Plan 03 still owns .gitignore) while preventing the documented failure modes. No scope creep -- the project-references variant was explicitly permitted by the plan; the Dockerfile-COPY addition is the necessary consequence.

## Issues Encountered

- **Host pnpm baseline was pnpm@6.11.0.** Corepack's `pnpm` shim resolved to the ancient version. Resolved by running `corepack prepare pnpm@9.15.0 --activate` before `pnpm install`. The Dockerfile uses corepack inside node:22-alpine where this isn't a concern.
- **Bash shell drops late command output in long compound chains.** Cosmetic; verification was performed across multiple smaller commands and all acceptance criteria are demonstrably satisfied (file existence, version pins, grep contracts).

## Pitfall Compliance

| Pitfall | Rule | Verified |
|---------|------|----------|
| #1 | Vite-7 + plugin-react-5 + TS-5.9 peer-deps locked | `grep '"vite"' package.json` -> `^7.3.3`; lockfile resolves vite@7.3.3; zero peer-dep warnings during install |
| #2 | No hardcoded http://localhost:8000 in frontend/src | `grep -r 'http://localhost:8000' frontend/src/` -> no matches (exit 1) |
| #6 | nginx SPA fallback present | `grep 'try_files $uri $uri/ /index.html' frontend/nginx.conf` -> match |
| #17 | Anti-anchoring placeholder on complexity dropdown | `grep 'value="" disabled' EstimateForm.tsx` -> `<option value="" disabled>— bitte wählen —</option>` |
| Phase-2 boundary | No Intl.NumberFormat anywhere | `grep -r 'Intl.NumberFormat' frontend/src/` -> no matches |

## Self-Check: PASSED

Created files (all 15 verified present, all 14 frontend files match plan's acceptance criteria):
- FOUND: frontend/package.json
- FOUND: frontend/pnpm-lock.yaml
- FOUND: frontend/tsconfig.json
- FOUND: frontend/tsconfig.app.json
- FOUND: frontend/tsconfig.node.json
- FOUND: frontend/vite.config.ts
- FOUND: frontend/index.html
- FOUND: frontend/src/main.tsx
- FOUND: frontend/src/App.tsx
- FOUND: frontend/src/index.css
- FOUND: frontend/src/api/client.ts
- FOUND: frontend/src/components/EstimateForm.tsx
- FOUND: frontend/src/components/ResultPanel.tsx
- FOUND: frontend/nginx.conf
- FOUND: frontend/Dockerfile

Commits verified:
- FOUND: 53d52ee (Task 1: feat scaffold)
- FOUND: ed07eb2 (Task 2: chore lockfile)

## Next Phase Readiness

**Ready for Plan 01-03 (compose-wireup):**
- frontend/Dockerfile builds without external state (lockfile present, all configs present)
- nginx.conf declares the reverse-proxy upstream `backend:8000` that Plan 03's docker-compose.yml will provide via service-network DNS
- frontend/pnpm-lock.yaml prevents Vite-8 / plugin-react-6 / TS-6 from sneaking in
- Same-origin /api/* contract held end-to-end (relative URL in client.ts + nginx proxy_pass)

**Reminder for Plan 01-03:**
- Add `node_modules/` and `dist/` to root .gitignore (tracked in deferred-items.md)
- Compose smoke test should POST `{pages: 10, complexity: "medium"}` and assert `{pt: 15.0}` (skeleton math from Plan 01-01)

---
*Phase: 01-skeleton-slice*
*Completed: 2026-05-17*
