# Deferred Items — Phase 01 Skeleton Slice

Items discovered during execution that are out of the current task's scope and intentionally deferred to the appropriate downstream plan.

## From Plan 01-02 (Frontend scaffold)

- **`.gitignore` must cover `frontend/node_modules/` and `frontend/dist/`** — currently `pnpm install` produces a `frontend/node_modules/` directory that is correctly listed in `git status` but not yet ignored at the repo level. Plan 01-03 (which already covers `.gitignore` per RESEARCH §"Root — .gitignore" at line 993) must include `node_modules/` and `dist/` patterns so these don't get accidentally staged. Verified via `git status --short` after `pnpm install`: directory aggregates to a single `?? frontend/node_modules/` line, no individual files are tracked yet. **Action for Plan 03:** ensure the root `.gitignore` covers `node_modules/`, `dist/`, `build/`, plus the existing `.claude/`.
