# Phase 1: Skeleton Slice - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 beweist die **End-to-End-Topologie** des Stacks — nichts mehr, nichts weniger:

- `docker compose up` bootet zwei Services (backend, frontend) ohne weitere manuelle Schritte
- Der Browser POSTet via `/api/estimates` durch den nginx-Reverse-Proxy an FastAPI und bekommt eine berechnete Zahl zurück, same-origin, kein CORS
- Bind-Mounts `./data` und `./config` sind persistent über Container-Neustarts; `DATABASE_URL` env-driven mit SQLite-Default; einziger exposed Port ist Frontend `:3000`
- `/api/health` liefert 200 für `depends_on: condition: service_healthy`

**Was diese Phase NICHT liefert** (gehört in spätere Phasen, kein Scope-Bleed):

- Reale PERT-Engine, Decimal-Pattern, `WeightsSnapshot` → Phase 2
- DB-Persistenz, SQLAlchemy-Modelle, Alembic → Phase 3
- WeasyPrint, Jinja2-Templates, deutsche Lokalisierung → Phase 4
- Admin-Schreibfläche, atomic-write, Validierung → Phase 5

Die Skeleton-Form ist explizit **Throwaway-Code** — sie wird in Phase 2 durch die vollständige Eingabe-Form ersetzt. Der einzige Code, der über Phase 1 hinaus Bestand hat, ist die Infrastruktur (Dockerfiles, docker-compose.yml, nginx.conf, Project-Layout, `/api/health`-Vertrag) und das `/api/estimates`-Endpoint-Muster (URL + JSON-Request/Response-Shape).

</domain>

<decisions>
## Implementation Decisions

### Skeleton-Round-Trip Scope

- **D-01: Form-Eingabefelder** — Zwei Felder: `pages` (Integer-Input, ≥ 0) + `pages_complexity` (Dropdown mit den vier Stufen `low` / `medium` / `high` / `very_high`). Kein Default auf der Complexity (pflicht) — etabliert Pitfall-#17-Anti-Anchoring-Pattern schon hier, auch wenn die Form throwaway ist.
- **D-02: API-Vertrag `POST /api/estimates`** — Request-Body: `{"pages": int, "complexity": "low" | "medium" | "high" | "very_high"}`. Response: `{"pt": number}`. Phase 2 erweitert dieses Endpoint zu seinem vollständigen Schema; der Pfad und das Basis-Muster (POST → JSON-In → JSON-Out mit `pt`-Feld) bleiben stabil.
- **D-03: Skeleton-Berechnungsformel** — Hart kodierte Lookup-Map im Backend: `{low: 1.0, medium: 1.5, high: 2.5, very_high: 4.0}`, dann `pt = pages × multiplier`. Diese Konstanten sind **explizit nicht** die Phase-2-Basisgewichte — die Skeleton-Multiplikatoren sind beliebig und beweisen nur den Round-Trip. Phase 2 ersetzt diese Logik vollständig durch `weights.json`-getriebene Engine. **Keine** Decimal-Aliase, **keine** Pydantic-`MoneyDecimal`/`PTDecimal`-Typen in Phase 1 — der Decimal-Pattern-Lock kommt in Phase 2 (Pitfall #1 + #2 sind Phase-2-Themen).

### Backend Code-Layout

- **D-04: Sub-Package-Struktur ab Tag 1** — `backend/app/{main.py, routers/{__init__.py, health.py, estimates.py}, schemas/{__init__.py, estimate.py}}`. Phase 2 erweitert um `engine/`, `services/` ohne Refactoring; Phase 3 fügt `models/`, `db/` hinzu. Die strikte Schicht-Trennung aus TECH-01 (`engine/` darf nicht `models/`, `db/`, `schemas/` oder FastAPI importieren) wird durch das frühe Layout vorbereitet, aber erst in Phase 2 durch einen Import-Linter durchgesetzt.
- **D-05: Frontend-Layout analog** — `frontend/src/{main.tsx, App.tsx, api/client.ts, components/EstimateForm.tsx, components/ResultPanel.tsx}`. Skeleton enthält genau diese fünf TypeScript-Files. Phase 2 erweitert um `components/parameter-table/`, `components/factors/`, `lib/format.ts` (Intl.NumberFormat-Wrapper für `de_DE`), `schemas/` (Zod-Schemas). React-Router wird in Phase 1 noch nicht installiert — die Skeleton-App hat nur eine Route (die Wurzel `/`).

### Health-Endpoint

- **D-06: `/api/health` Payload** — `200 OK` mit `{"status": "ok", "version": "0.1.0", "timestamp": "<ISO-8601 UTC>"}`. Die `version` wird aus einer einzelnen Quelle gelesen (entweder `pyproject.toml` via `importlib.metadata.version("estimation-manager-backend")` oder eine `__version__`-Konstante in `app/__init__.py` — Planner entscheidet). Phase 3 erweitert den Payload um `db: "connected" | "unavailable"` ohne Breaking Change (zusätzliches Feld, bestehende Felder bleiben). Phase 5 kann optional `config: "readable"` ergänzen. Der `depends_on`-Healthcheck prüft nur den HTTP-200-Status, **nicht** den Payload-Inhalt — d. h. die Erweiterungen brechen den Boot-Vertrag nicht.

### Claude's Discretion

Folgende Bereiche wurden bewusst **nicht** diskutiert. Für diese gelten die research/STACK-Defaults; Planner soll sie als "soft-locked" behandeln und nur abweichen, wenn ein konkreter Grund auftaucht:

- **Package Manager Backend:** `uv` (Astral) mit `uv.lock` und `uv sync --frozen` im Dockerfile (STACK §Development Tools). Nicht `pip` + `requirements.txt`.
- **Package Manager Frontend:** `pnpm` (shadcn/ui-CLI-Default, schneller, disk-effizient). `package-lock.json` ist akzeptabel falls Planner stattdessen npm wählt — entscheide pragmatisch beim Plan-Schreiben.
- **Container User:** Container laufen in v1 als `root` (default `python:3.12-slim-bookworm` und `nginx:alpine` Defaults). Begründung: Lokal-first, Single-User auf Berater-Laptop (macOS/Windows mit Docker Desktop → keine Linux-UID/GID-Probleme bei Bind-Mounts). Bei Cloud-Migration (siehe research/PITFALLS Pitfall #14) wird ein `USER appuser` + UID-Mapping in einem späteren Hardening-Phase ergänzt.
- **Dev-Modus-Topologie:** Single `docker-compose.yml` für `docker compose up`-Production-Boot. Für den **Dev-Loop** während Phase-2+-Entwicklung läuft der Frontend lokal via `pnpm dev` außerhalb von Docker mit `vite.config.ts`-Proxy `/api → http://localhost:8000`, während Backend optional in Docker laufen kann. Kein `docker-compose.dev.yml`-Override in Phase 1 — kann später nachgezogen werden, wenn der Dev-Loop schmerzhaft wird. (research/ARCHITECTURE.md §"Dev mode" + Vite Proxy.)
- **Tooling-Tiefe in Phase 1:** **Minimal.** Kein pytest-/vitest-Scaffold, kein ruff/ESLint-Setup, kein strukturiertes Logging (`logging.config.dictConfig`) in Phase 1. Standard-Python-`logging.basicConfig(level=INFO)` reicht. Phase 2 zieht ruff + pytest ein (Engine-Tests sind Phase-2-Kernlieferobjekt); ESLint/Prettier + vitest folgen, sobald Frontend-Komplexität es rechtfertigt. CI/CD (GitHub Actions) ist v1 **out of scope** (lokal-first; siehe PROJECT.md Constraints).
- **nginx.conf-Vorlage:** Übernimm research/ARCHITECTURE.md §Pattern 1 nahezu wörtlich (location `/`, location `/api/`, `proxy_pass http://backend:8000/api/`, `client_max_body_size 1m` — kann auf 5m hochgezogen werden, wenn PDF-Uploads in Phase 4 gebraucht werden, was nicht der Fall ist; PDFs sind Download, nicht Upload).
- **Healthcheck-Test-Kommando:** `["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]` aus ARCHITECTURE.md übernehmen — vermeidet `curl` im Backend-Image (kein zusätzliches apt-Paket).
- **First-Run-Seed-Verhalten:** Phase 1 seedet **nichts** in `./config` oder `./data`. `weights.default.json`-Seeding ist Phase-2-Thema (kommt mit der Engine); `methodik.default.txt`-Seeding ist Phase-4-Thema; SQLite-DB-File entsteht in Phase 3. Phase 1 verifiziert nur, dass die Bind-Mounts existieren und beschreibbar sind (implizit durch den ersten Container-Start; kein expliziter Boot-Check nötig).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projekt-Grundlagen (immer zuerst lesen)
- `.planning/PROJECT.md` — Core Value (Reproduzierbarkeit + Snapshot), Constraints (Tech-Stack-Lock, Deutsch UI, stateless Backend, lokal-first, no external services, Performance-Budgets)
- `.planning/REQUIREMENTS.md` §"Infrastruktur & Deployment" — INFRA-01 bis INFRA-07 sind die Phase-1-Akzeptanzkriterien (INFRA-02/08/10 sind Phase-4, INFRA-09 ist Phase-3)
- `.planning/ROADMAP.md` §"Phase 1: Skeleton Slice" — Success Criteria 1–4

### Stack & Versionen
- `CLAUDE.md` §"Technology Stack" — Versionen exakt einhalten: Python 3.12 slim-bookworm, FastAPI 0.136, Pydantic 2.13, Vite 7 (NICHT 8), React 19.2, Tailwind v4, nginx:alpine
- `CLAUDE.md` §"Decision 7: Docker Compose structure" — zwei Services, Healthcheck-gated, persistente Bind-Mounts, Frontend serviert via nginx
- `.planning/research/STACK.md` — Detaillierte Versionsbegründungen, "What NOT to Use" Tabelle (kein Alpine fürs Backend, kein Vite 8, kein React Server Components, kein i18n-Library)

### Architektur & Topologie
- `.planning/research/ARCHITECTURE.md` §"Pattern 1: Reverse-Proxy via Single Frontend Container" — nginx.conf-Vorlage, Multi-Stage Dockerfile (`node:20-alpine` build → `nginx:alpine` serve), Dev-Modus via `vite.config.ts` proxy
- `.planning/research/ARCHITECTURE.md` §"Phase 1 — Skeleton Slice" — Recommended Phase Structure §1 (genau das, was diese Phase liefert)
- `.planning/research/ARCHITECTURE.md` §"Service Topology" — `docker-compose.yml`-Skizze inkl. Healthcheck-Befehl + Bind-Mount-Pfade + `expose: ["8000"]` (NICHT `ports:` fürs Backend)
- `.planning/research/ARCHITECTURE.md` §"Anti-Pattern 4: CORS" + §"Boundary Mapping" — warum same-origin via Reverse-Proxy statt CORS

### Pitfalls relevant für Phase 1
- `.planning/research/PITFALLS.md` Pitfall #12 (Dev vs. Prod Vite-URL-Drift) — `vite.config.ts` Proxy nutzen, nicht hardcoded `http://localhost:8000` im Frontend-Code
- `.planning/research/PITFALLS.md` Pitfall #15 (First-Run-Race) — `/api/health` + `depends_on: condition: service_healthy` ist die Lösung
- `.planning/research/PITFALLS.md` Pitfall #16 (CORS misconfig) — Vermeidung durch Reverse-Proxy by design, KEINE `CORSMiddleware` in FastAPI
- `.planning/research/PITFALLS.md` Pitfall #14 (Docker Bind-Mount UID/GID) — bewusst akzeptiert für v1 (root-Container); siehe D-Discretion oben

### Out-of-Scope-Anker (Phase-1-spezifisch)
- `.planning/REQUIREMENTS.md` §"v1 Requirements" — alle INPUT-/PARAM-/FACT-/CALC-/DASH-/PDF-/PERS-/ADMIN-Requirements sind **explizit nicht** Phase-1-Scope. Wenn der Researcher/Planner Decimal-Handling, Engine-Korrektheit, Snapshot-Pattern, Admin-UI oder PDF-Rendering anfasst — STOP, das ist eine andere Phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

Keine — Codebase ist greenfield. Nur `.planning/` und `CLAUDE.md` existieren. Phase 1 schreibt sämtlichen Code von Null.

### Established Patterns

- **`.planning/research/ARCHITECTURE.md` Pattern 1, Pattern 2 (Pure Engine — wird in Phase 2 aktiviert), Pattern 5 (Auth-Readiness Seam — wird in Phase 3 aktiviert)** — diese Muster sind die Architektur-Schienen, auf denen alle Phasen fahren. Phase 1 etabliert nur Pattern 1 vollständig.
- **Schicht-Trennung (TECH-01)** — Phase 1 legt die Verzeichnisse `routers/` und `schemas/` an, auch wenn `engine/`, `services/`, `models/` erst später kommen. Das Import-Linting (Lint-Regel "kein FastAPI/SQLAlchemy in `engine/`") wird in Phase 2 hinzugefügt, wenn `engine/` existiert.

### Integration Points

- **`docker-compose.yml` + Bind-Mounts** — `./data` und `./config` werden hier zum ersten Mal gemountet. Phase 3 schreibt in `./data/estimates.db`, Phase 4 in `./config/methodik.txt`, Phase 5 in `./config/weights.json`. Phase 1 sorgt nur dafür, dass die Mounts existieren und beschreibbar sind.
- **nginx `/api/` location** — wird in Phase 1 für `POST /api/estimates` + `GET /api/health` etabliert. Phasen 2–5 fügen weitere Endpoints unter `/api/` hinzu (`GET /api/estimates`, `GET /api/estimates/:id`, `POST /api/estimates/:id/clone`, `GET /api/pdf/:id`, `GET/PUT /api/admin/weights`, etc.) — die nginx-Config bleibt unverändert, weil der Prefix `/api/` alle erschlägt.
- **`DATABASE_URL` env var** — wird in Phase 1 im docker-compose.yml gesetzt (Default `sqlite:///./data/estimates.db`), aber von Phase 1 **noch nicht** gelesen (kein DB-Code). Phase 3 aktiviert es im Backend.

</code_context>

<specifics>
## Specific Ideas

- **Frontend-Form-Look in Phase 1:** Bare Tailwind-Utility-Classes auf nativen HTML-Elementen (`<input>`, `<select>`, `<button>`). Kein shadcn/ui-CLI-Install in Phase 1 — shadcn-Components werden in Phase 2 hinzugezogen, wenn die echte Eingabe-Form mit Validation/Errors/Tooltips kommt. Begründung: Skeleton-Form ist throwaway, jeder Aufwand in Komponenten-Schliff ist verschwendet.
- **Skeleton-Result-Anzeige:** Reiner Text `"Aufwand: {pt} PT"` ohne weitere Formatierung. Phase 2 ersetzt durch das vollständige Dashboard mit deutscher Lokalisierung. Phase 1 nutzt einfach `String(pt)` — `Intl.NumberFormat`-Wrapper kommt in Phase 2.
- **README-First-Run-Doku:** Phase 1 legt ein minimales `README.md` an mit zwei Sätzen: "Voraussetzungen: Docker Desktop + Docker Compose v2. Start: `docker compose up`." Die ausführliche README mit Backup, PostgreSQL-Migration, Reset-Pfad (INFRA-10) ist Phase-4-Lieferobjekt.

</specifics>

<deferred>
## Deferred Ideas

Keine — die Diskussion blieb strikt im Phase-1-Scope. Die ARCHITECTURE-/STACK-Empfehlungen für nicht-diskutierte Bereiche (Dev-Override, Container-User, Tooling-Tiefe, Package Manager) sind oben unter "Claude's Discretion" als soft-locked Defaults dokumentiert — Planner kann begründet abweichen.

Falls während Plan-Erstellung Spannung mit Phase-2-Vorgriffen entsteht (z. B. "sollte ich nicht jetzt schon `engine/` anlegen?"), gilt die Regel: **Phase 1 macht nur, was die vier Success Criteria der Roadmap fordern. Alles andere wartet auf Phase 2.**

</deferred>

---

*Phase: 1-Skeleton Slice*
*Context gathered: 2026-05-16*
