# Phase 1: Skeleton Slice - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 1-Skeleton Slice
**Areas discussed:** Skeleton-Round-Trip Scope

---

## Skeleton-Round-Trip Scope

Initial Auswahl der Diskussions-Areas (multiSelect aus vier Optionen). Drei Areas wurden **nicht** ausgewählt:

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton-Round-Trip Scope | Was genau gibt der Nutzer ein und welche Zahl kommt zurück? Bestimmt die Throwaway-Form. | ✓ |
| Dev-Modus-Topologie | Ein docker-compose.yml (immer nginx) oder Dev-Override mit Vite HMR? | |
| Container-User & Bind-Mount-Perms | Root vs. non-root mit UID/GID-Mapping (Pitfall #14)? | |
| Tooling-Tiefe im Skeleton | Nur Round-Trip-Code vs. pytest+vitest+ruff+ESLint+strukturiertes Logging? | |

**User's choice:** Nur "Skeleton-Round-Trip Scope" — die anderen drei wurden bewusst nicht diskutiert; CONTEXT.md hält die research-gestützten Defaults für diese Bereiche unter "Claude's Discretion" fest.

---

### Q1 — Umfang des Round-Trips

| Option | Description | Selected |
|--------|-------------|----------|
| ARCHITECTURE-Vorschlag (Recommended) | Form: `pages` + `pages_complexity` (Dropdown low/medium/high/very_high). Backend: Lookup-Map `{low:1.0, medium:1.5, high:2.5, very_high:4.0}` → `pt = pages × multiplier`. Beweist Form-State + Validation + Dropdown-UX. | ✓ |
| Minimaler Round-Trip | Form: nur `pages`. Backend: `pt = pages × 1.5` (Konstante). Weniger Code, aber Dropdown-Pattern erst in Phase 2. | |
| Reicher (zwei Parameter) | Form: `pages` + `complexity` + `use_cases`. Bleed-Risiko Richtung Phase 2. | |

**User's choice:** ARCHITECTURE-Vorschlag.
**Notes:** Etabliert das Dropdown-Pattern und das Enum-Validierungs-Muster bereits hier. `pages_complexity`-Dropdown hat in der Skeleton-Form **keinen Default** — etabliert Pitfall-#17-Anti-Anchoring schon im Skeleton. Lookup-Map-Werte sind **explizit beliebig**, nicht die echten Phase-2-Basisgewichte.

---

### Q2 — Backend-Code-Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-Package-Struktur von Tag 1 (Recommended) | `backend/app/{main.py, routers/health.py, routers/estimates.py, schemas/estimate.py}` + analog Frontend `src/{App.tsx, api/, components/}`. Phase 2 erweitert ohne Refactoring. | ✓ |
| Single-File-Minimal | `backend/app/main.py` enthält alles. Phase 2 muss splitten — Mini-Refactoring. | |

**User's choice:** Sub-Package-Struktur von Tag 1.
**Notes:** Schicht-Trennungs-Vorbereitung (TECH-01). `engine/`, `services/`, `models/`, `db/` werden in Phase 1 **nicht** angelegt — kommen mit den Phasen, in denen sie zum ersten Mal Code enthalten. Frontend analog: nur die fünf Files, die der Skeleton-Round-Trip braucht; kein `react-router` in Phase 1 (nur eine Route).

---

### Q3 — `/api/health` Payload

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | `{"status": "ok"}` | |
| Reicher (Version + Timestamp) | `{"status": "ok", "version": "0.1.0", "timestamp": "..."}` | ✓ |
| Mit Dependency-Check schon hier | `{"status": "ok", "checks": {"config_dir": "readable", "data_dir": "writable"}}` | |

**User's choice:** Reicher (Version + Timestamp).
**Notes:** Version-Feld hilft beim Debug; Phase 3 erweitert um `db`-Feld additiv (kein Breaking Change). Der `depends_on`-Healthcheck verifiziert nur HTTP 200, nicht Payload-Inhalt — Erweiterungen brechen Boot nicht.

---

## Claude's Discretion

Areas, die der User explizit nicht diskutieren wollte; Claude entscheidet basierend auf research/STACK + research/ARCHITECTURE:

- **Package Manager Backend:** `uv` (Astral) mit `uv.lock` — STACK §Development Tools.
- **Package Manager Frontend:** `pnpm` (shadcn/ui-CLI-Default), npm akzeptabel falls Planner pragmatisch wählt.
- **Container User:** `root` für v1 (lokal-first, macOS-Desktop-primärer-Use-Case, kein Linux-UID-Drama). Cloud-Hardening später.
- **Dev-Modus-Topologie:** Single `docker-compose.yml` für Production-Boot; Dev-Loop via `pnpm dev` lokal + `vite.config.ts`-Proxy `/api → http://localhost:8000`. Kein `docker-compose.dev.yml`-Override in Phase 1.
- **Tooling-Tiefe in Phase 1:** Minimal — kein pytest-/vitest-Scaffold, kein ruff/ESLint, kein `logging.config.dictConfig`. Standard-`logging.basicConfig` reicht. Phase 2 zieht ruff + pytest ein.
- **nginx.conf:** Nahezu wörtliche Übernahme aus ARCHITECTURE.md Pattern 1.
- **Healthcheck-Test-Kommando:** Python urllib statt curl (kein zusätzliches apt-Paket).
- **First-Run-Seed-Verhalten:** Phase 1 seedet nichts in `./config` oder `./data` — die Bind-Mount-Existenz ist der einzige Vertrag.

## Deferred Ideas

Keine. Diskussion blieb strikt im Phase-1-Scope. Bei Spannung während Plan-Erstellung gilt: nur die vier Success Criteria aus ROADMAP.md liefern, alles andere wartet auf Phase 2+.
