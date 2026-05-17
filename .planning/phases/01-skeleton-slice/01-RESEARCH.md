# Phase 1: Skeleton Slice — Research

**Researched:** 2026-05-16
**Domain:** Docker-Compose-Topologie + nginx Reverse-Proxy + FastAPI/React Walking Skeleton
**Confidence:** HIGH (Versionen via npm/PyPI verifiziert, Architektur-Pattern aus eigenem research/ARCHITECTURE.md, kanonische Multi-Stage-uv-Dockerfile-Vorlage von Astral-Docs)

## Summary

Phase 1 ist ein **Walking Skeleton**: zwei Container, eine Form, ein Endpoint, eine berechnete Zahl. Die Architektur ist bereits in `research/ARCHITECTURE.md` §"Pattern 1" gefroren — Phase 1 setzt das Pattern um, ohne es zu erfinden. Der einzige Code, der über diese Phase hinaus Bestand hat, ist die Infrastruktur (Dockerfiles, `docker-compose.yml`, `nginx.conf`, Project-Layout, `/api/health`-Vertrag) und das `POST /api/estimates`-URL-Muster. Form, Berechnungslogik und Pydantic-Felder sind Throwaway und werden in Phase 2 vollständig ersetzt.

**Primäre Empfehlung:** Multi-Stage-Backend-Dockerfile mit `uv` (Astral-image `ghcr.io/astral-sh/uv:0.11.14` als COPY-Source, `python:3.12-slim-bookworm` als Runtime), Multi-Stage-Frontend mit `node:22-alpine` build → `nginx:1.27-alpine` serve, `expose: ["8000"]` (NICHT `ports:`) auf Backend, `ports: ["3000:80"]` auf Frontend, Healthcheck per `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"` mit `interval: 10s, timeout: 3s, retries: 5, start_period: 5s`. Keine CORSMiddleware. Tailwind v4 via `@import "tailwindcss"` + `@tailwindcss/vite` Plugin.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Form-Eingabefelder** — Zwei Felder: `pages` (Integer-Input, ≥ 0) + `pages_complexity` (Dropdown mit den vier Stufen `low` / `medium` / `high` / `very_high`). Kein Default auf der Complexity (pflicht) — etabliert Pitfall-#17-Anti-Anchoring-Pattern schon hier, auch wenn die Form throwaway ist.
- **D-02: API-Vertrag `POST /api/estimates`** — Request-Body: `{"pages": int, "complexity": "low" | "medium" | "high" | "very_high"}`. Response: `{"pt": number}`. Phase 2 erweitert dieses Endpoint zu seinem vollständigen Schema; der Pfad und das Basis-Muster (POST → JSON-In → JSON-Out mit `pt`-Feld) bleiben stabil.
- **D-03: Skeleton-Berechnungsformel** — Hart kodierte Lookup-Map im Backend: `{low: 1.0, medium: 1.5, high: 2.5, very_high: 4.0}`, dann `pt = pages × multiplier`. Diese Konstanten sind **explizit nicht** die Phase-2-Basisgewichte — die Skeleton-Multiplikatoren sind beliebig und beweisen nur den Round-Trip. Phase 2 ersetzt diese Logik vollständig durch `weights.json`-getriebene Engine. **Keine** Decimal-Aliase, **keine** Pydantic-`MoneyDecimal`/`PTDecimal`-Typen in Phase 1 — der Decimal-Pattern-Lock kommt in Phase 2.
- **D-04: Sub-Package-Struktur ab Tag 1** — `backend/app/{main.py, routers/{__init__.py, health.py, estimates.py}, schemas/{__init__.py, estimate.py}}`. Phase 2 erweitert um `engine/`, `services/` ohne Refactoring; Phase 3 fügt `models/`, `db/` hinzu.
- **D-05: Frontend-Layout** — `frontend/src/{main.tsx, App.tsx, api/client.ts, components/EstimateForm.tsx, components/ResultPanel.tsx}`. Skeleton enthält genau diese fünf TypeScript-Files. React-Router wird in Phase 1 noch nicht installiert. Bare Tailwind-Utility-Classes auf nativen HTML-Elementen, kein shadcn-Install.
- **D-06: `/api/health` Payload** — `200 OK` mit `{"status": "ok", "version": "0.1.0", "timestamp": "<ISO-8601 UTC>"}`. Docker-Healthcheck nutzt `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"` (kein `curl` im Image nötig).

### Claude's Discretion (soft-locked Defaults, nur abweichen mit Grund)

- **Backend Package Manager:** `uv` (Astral) mit `uv.lock` und `uv sync --frozen` im Dockerfile.
- **Frontend Package Manager:** `pnpm` (shadcn-Default). `npm` ebenfalls akzeptabel — Planner-Entscheidung beim Schreiben.
- **Container User:** v1 root in beiden Containern (Lokal-first auf Berater-Laptop mit Docker Desktop; PITFALLS #14 wird bewusst in Kauf genommen).
- **Dev-Modus:** Single `docker-compose.yml` für Production-Boot; `pnpm dev` outside Docker mit Vite-Proxy `/api → http://localhost:8000` für Hot-Reload.
- **Tooling:** Minimal — kein pytest/vitest, kein ruff/ESLint, nur `logging.basicConfig(level=INFO)`.
- **nginx.conf:** ARCHITECTURE.md Pattern 1 wörtlich übernehmen, `client_max_body_size 1m`.
- **First-Run-Seed:** **Nichts** seeden — nur verifizieren, dass die Bind-Mounts existieren und beschreibbar sind.

### Deferred Ideas (OUT OF SCOPE für Phase 1)

- Decimal-Pattern, PERT-Engine, `WeightsSnapshot` → **Phase 2**
- SQLAlchemy, Alembic, DB-Persistenz (aber `DATABASE_URL`-Env-Var **wird** im Compose gesetzt) → **Phase 3**
- WeasyPrint, Jinja2-Templates, Font-Bundling, deutsche Lokalisierung → **Phase 4**
- Admin-UI, atomic-write, Validation, Reset → **Phase 5**
- CORS-Middleware (per Design via Reverse-Proxy obsolet)
- CI/CD-Setup (Lokal-first)
- pytest/vitest/ruff/ESLint (Phase 2+)
- shadcn/ui Components (Phase 2 mit echter Form)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **INFRA-01** | `docker compose up` startet alle Services ohne weitere manuelle Schritte | §Docker Compose, §Dockerfiles — Multi-Stage-Build erledigt `uv sync --frozen` + `pnpm build` zur Build-Zeit; Compose-File hat keinen interaktiven Schritt |
| **INFRA-03** | Frontend-Image baut Vite-SPA und serviert sie via nginx; nginx reverse-proxied `/api/*` zum Backend über das Docker-Netzwerk | §Frontend Dockerfile (Multi-Stage), §nginx.conf (location `/api/` → `proxy_pass http://backend:8000/api/`) |
| **INFRA-04** | Backend-Port (8000) ist NICHT auf den Host gemapped; einziger exposed Port ist Frontend `:3000` | §Docker Compose — Backend nutzt `expose: ["8000"]` (Compose-internes Netz), NICHT `ports:` |
| **INFRA-05** | Backend liest `DATABASE_URL` aus Env; Default `sqlite:///./data/estimates.db`; kein hardcoded Pfad | §Backend Code — `os.getenv("DATABASE_URL", "sqlite:///./data/estimates.db")` in `app/main.py` oder `app/config.py`, Wert wird in Phase 1 nur geloggt, nicht verwendet |
| **INFRA-06** | Persistente Bind-Mounts für `./data` (DB) und `./config` (`weights.json`, `methodik.txt`) | §Docker Compose — `./data:/app/data` und `./config:/app/config` auf Backend; `.gitkeep`-Strategie für leere Dirs |
| **INFRA-07** | Backend bietet `/api/health`-Endpoint; docker-compose `depends_on` mit `condition: service_healthy` für Frontend | §FastAPI Health Router, §Compose Healthcheck — Healthcheck-Test ist `python -c urllib.request.urlopen('http://localhost:8000/api/health')`, blockt Frontend-Startup via long-form `depends_on` |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Form-Eingabe (pages, complexity) | Browser / Client | — | Native `<form>` mit `<input type="number">` und `<select>`, kein SSR nötig |
| `POST /api/estimates` annehmen + parsen | API / Backend | — | FastAPI-Router validiert via Pydantic v2 (`EstimateRequest`) |
| Lookup `complexity → multiplier` + `pt = pages × multiplier` | API / Backend | — | Hart kodierte Map in `routers/estimates.py` (in Phase 2 wandert sie nach `engine/`) |
| Response-Serialisierung `{"pt": number}` | API / Backend | — | Pydantic `EstimateResponse` mit `pt: float` (Phase-1-Lockerung; Decimal kommt in Phase 2) |
| Statische SPA-Assets ausliefern | Frontend Server (nginx) | CDN/Static (zukünftig) | nginx serviert `dist/` aus `/usr/share/nginx/html`, SPA-Fallback `try_files $uri $uri/ /index.html` |
| Reverse-Proxy `/api/*` | Frontend Server (nginx) | — | nginx terminiert HTTP, proxied via Docker-DNS `backend:8000`, eliminiert CORS |
| Health-Endpoint `/api/health` | API / Backend | — | Compose-Healthcheck pingt Backend, gated den Frontend-Start |
| Persistenter Mount `./data` und `./config` | Database/Storage (Filesystem) | — | Bind-Mount; Phase 1 schreibt nichts (verifiziert nur, dass Dirs vorhanden + beschreibbar sind) |

**Out-of-Tier-Sanity-Check:** Keine Engine-Logik im Browser, keine HTTP-Concerns im Engine-Tier (das es in Phase 1 ohnehin noch nicht gibt), keine Validation auf Client als Source-of-Truth (Server validiert via Pydantic — Phase-2-Spiegelung mit Zod kommt mit der echten Form).

## Standard Stack

### Core (verifiziert via npm / PyPI registry am 2026-05-16)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Python** | 3.12 (slim-bookworm) | Backend-Runtime | CLAUDE.md-Lock; production-safe vs. 3.13; WeasyPrint-kompatibel für Phase 4 [VERIFIED: docker hub via STACK.md] |
| **FastAPI** | 0.136.1 | HTTP-API-Framework | Pydantic v2 default, `fastapi[standard]` bringt uvicorn + httpx mit [VERIFIED: PyPI `pip index versions fastapi`] |
| **Uvicorn** | 0.47.0 | ASGI-Server | Bundled mit `fastapi[standard]`; `--host 0.0.0.0 --port 8000` im Container [VERIFIED: PyPI `pip index versions uvicorn`] |
| **Pydantic** | 2.13.4 | Request/Response-DTOs | v2 default seit FastAPI ≥ 0.100 [VERIFIED: PyPI `pip index versions pydantic`] |
| **React** | 19.2.6 | Frontend-UI | CLAUDE.md-Lock; verwendet plain client-side (kein SSR) [VERIFIED: npm `npm view react version`] |
| **Vite** | **7.3.3** (NICHT 8.x) | Dev-Server + Bundler | CLAUDE.md-Lock: "Vite 7 NICHT 8 — bleeding edge Rolldown bundler"; Vite 8 ist bereits auf npm (`8.0.13`), aber für eine Business-App ist 7.3.3 die stabile Wahl [VERIFIED: npm `npm view vite versions`] |
| **@vitejs/plugin-react** | **5.2.0** (NICHT 6.x) | Vite-React-Plugin | Version-Lock: `@vitejs/plugin-react@6` hat `peerDep "vite": "^8.0.0"` — nicht kompatibel mit Vite 7; 5.2.0 ist die letzte 5er-Linie mit Vite-7-Support [VERIFIED: npm `npm view @vitejs/plugin-react@5 peerDependencies.vite` → `^4 || ^5 || ^6 || ^7 || ^8`] |
| **TypeScript** | 5.7.x (z. B. 5.9.x) | Frontend-Typsicherheit | CLAUDE.md-Lock: 5.7.x — **NICHT** TypeScript 6 (root `package.json` hat `^6.0.3` aus slopcheck-Test-Install; das ist Test-Artefakt, ignorieren) [VERIFIED: npm registry] |
| **Tailwind CSS** | 4.3.0 | Styling | CLAUDE.md-Lock; v4 nutzt `@tailwindcss/vite` Plugin und `@import "tailwindcss"` (kein `tailwind.config.js` für Phase 1 nötig) [VERIFIED: npm `npm view tailwindcss version`] |
| **@tailwindcss/vite** | 4.3.0 | Tailwind-Vite-Integration | peerDep `vite: ^5.2.0 || ^6 || ^7 || ^8` — voll Vite-7-kompatibel [VERIFIED: npm `npm view @tailwindcss/vite@4.3.0 peerDependencies`] |
| **uv** (Astral) | 0.11.14 | Python-Pkg-Manager im Backend-Dockerfile | Astral-Docs empfehlen `COPY --from=ghcr.io/astral-sh/uv:0.11.14 /uv /uvx /bin/`; `uv sync --frozen` für deterministische Container-Builds [CITED: https://docs.astral.sh/uv/guides/integration/docker/] |
| **nginx** | 1.27-alpine | Frontend-Static-Server + Reverse-Proxy | STACK.md-Default; Alpine OK für Frontend (keine native deps), nicht für Backend [CITED: research/STACK.md] |
| **Node.js** (build-only) | 22-alpine | Build-Stage für Frontend | STACK.md-Default; `node:22-alpine` ist OK weil Build-Stage keine native libs braucht |

### Supporting (Phase 1) — bewusst minimal

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-dom** | 19.2.6 | React-Renderer für Browser | Standard; gehört zu React 19 [VERIFIED: npm] |

**Ausdrücklich NICHT installiert in Phase 1** (kommt in späteren Phasen):
- `react-router` (Phase 2 — keine zweite Route in Phase 1)
- `react-hook-form` + `zod` + `@hookform/resolvers` (Phase 2 — echte Form mit Validation)
- `@tanstack/react-query` + `@tanstack/react-table` (Phase 2/3 — keine Server-Listen)
- `zustand` (Phase 2 — kein Client-State über Komponenten hinaus)
- `lucide-react`, `clsx`, `tailwind-merge` (Phase 2 mit shadcn)
- `shadcn/ui` (Phase 2 mit echter Form)
- `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `pyright` (Phase 2 — Engine-Tests sind Phase-2-Kern)
- `vitest`, `@testing-library/react` (Phase 2/5)
- `sqlalchemy`, `alembic` (Phase 3)
- `weasyprint`, `jinja2` (Phase 4)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| uv multi-stage + ghcr.io/astral-sh/uv image | `pip install -r requirements.txt` ohne uv | uv ist 10–100× schneller bei Resolution + Container-Build; deterministisch via `uv.lock`. `pip` würde funktionieren, aber Reproduzierbarkeit + Build-Geschwindigkeit leiden. Empfehlung: **uv**. |
| pnpm | npm | pnpm ist shadcn-CLI-Default und disk-effizient; npm ist gleichwertig funktional. Wenn der Berater-Laptop bereits npm konfiguriert hat, ist npm OK. Planner-Entscheidung. |
| `python:3.12-slim-bookworm` | `python:3.13-slim-bookworm` | 3.13 ist neu, hat Free-Threading + JIT — aber für eine Business-App kein Mehrwert. STACK.md lockt 3.12 als production-safer. |
| `node:22-alpine` (Build-Stage) | `node:22-bookworm` | Alpine OK für Frontend-Build (keine native deps); Image-Größe geringer. |
| Healthcheck via `python -c urllib.request.urlopen(...)` | Healthcheck via `curl -fsS http://localhost:8000/api/health` | D-06 lockt urllib-Variante → kein extra `apt-get install curl` im Backend-Image; gleicher Exit-Code-Effekt. |
| `expose: ["8000"]` | `ports: ["8000:8000"]` mit CORSMiddleware | INFRA-04 sagt explizit: Backend-Port **nicht** auf Host gemapped. `expose:` macht den Port nur im Compose-Netz erreichbar, das ist genau was wir wollen. |

**Installation (Backend) — `backend/pyproject.toml`:**

```toml
[project]
name = "estimation-manager-backend"
version = "0.1.0"
description = "Lokale Web-App für PT-Schätzungen — Backend"
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi[standard]>=0.136,<0.137",
  "uvicorn[standard]>=0.47",
  "pydantic>=2.13,<3.0",
]

[tool.uv]
# uv.lock wird durch `uv lock` erzeugt und in VCS committed
```

**Installation (Frontend) — `frontend/package.json`:**

```jsonc
{
  "name": "estimation-manager-frontend",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.2.0",
    "@tailwindcss/vite": "^4.3.0",
    "tailwindcss": "^4.3.0",
    "typescript": "~5.9.0",
    "vite": "^7.3.3"
  }
}
```

⚠ Hinweis: Im Repo-Root liegt aktuell eine `package.json` mit Vite-8 + `@vitejs/plugin-react@6` + TypeScript 6. Diese stammt aus dem slopcheck-Test-Install (`npm install` zur Legitimitäts-Verifikation). Sie ist **Test-Artefakt und nicht die echte Frontend-Konfiguration**. Phase 1 erzeugt das echte `frontend/package.json` mit den oben gelockten Versionen. Planner soll evaluieren, ob der Phase-1-Plan einen "lösche Root-package.json + node_modules"-Task vor dem Scaffolding braucht.

**Version-Verifikation (alle am 2026-05-16):**

```bash
npm view vite version              # → 8.0.13 (latest, wir nutzen 7.3.3)
npm view vite@7 version            # → letzte 7er: 7.3.3
npm view @vitejs/plugin-react@5 peerDependencies.vite  # → "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0" (passt zu Vite 7)
npm view @vitejs/plugin-react@6 peerDependencies.vite  # → "^8.0.0" (passt NICHT zu Vite 7)
npm view tailwindcss version       # → 4.3.0
npm view @tailwindcss/vite@4.3.0 peerDependencies      # → { vite: '^5.2.0 || ^6 || ^7 || ^8' } (passt)
npm view react version             # → 19.2.6
python3 -m pip index versions fastapi   # → 0.136.1
python3 -m pip index versions uvicorn   # → 0.47.0
python3 -m pip index versions pydantic  # → 2.13.4
```

## Package Legitimacy Audit

slopcheck wurde via `python3 -m pip install --user slopcheck` (Version 0.6.1) installiert und gegen alle Phase-1-Packages laufen lassen:

| Package | Registry | Age (verifiziert) | Source Repo | slopcheck | Disposition |
|---------|----------|------|-------------|-----------|-------------|
| fastapi | PyPI | mature (multi-year) | github.com/fastapi/fastapi | [OK] | Approved [VERIFIED: slopcheck install fastapi → OK] |
| uvicorn | PyPI | mature | github.com/encode/uvicorn | [OK] | Approved [VERIFIED: slopcheck install uvicorn → OK] |
| pydantic | PyPI | mature | github.com/pydantic/pydantic | [OK] | Approved [VERIFIED: slopcheck install pydantic → OK] |
| vite | npm | mature | github.com/vitejs/vite | [OK] | Approved [VERIFIED: slopcheck install --ecosystem npm vite → OK] |
| react | npm | mature | github.com/facebook/react | [OK] | Approved [VERIFIED: slopcheck → OK] |
| react-dom | npm | mature | github.com/facebook/react | [OK] | Approved [VERIFIED: slopcheck → OK] |
| @vitejs/plugin-react | npm | mature | github.com/vitejs/vite-plugin-react | [OK] | Approved [VERIFIED: slopcheck → OK] |
| tailwindcss | npm | mature | github.com/tailwindlabs/tailwindcss | [OK] | Approved [VERIFIED: slopcheck → OK] |
| @tailwindcss/vite | npm | mature | github.com/tailwindlabs/tailwindcss | [OK] | Approved [VERIFIED: slopcheck → OK] |
| typescript | npm | mature | github.com/microsoft/TypeScript | [OK] | Approved [VERIFIED: slopcheck → OK] |

**slopcheck-Befehle ausgeführt:**

```bash
python3 -m slopcheck install fastapi uvicorn pydantic
# → 3 OK
python3 -m slopcheck install --ecosystem npm vite react react-dom @vitejs/plugin-react tailwindcss @tailwindcss/vite typescript
# → 7 OK
```

**Packages removed due to slopcheck [SLOP] verdict:** Keine.
**Packages flagged as suspicious [SUS]:** Keine.

**Postinstall-Scripts (npm) — geprüft via `npm view <pkg> scripts.postinstall`:** alle gewählten npm-Packages (vite, react, react-dom, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, typescript) haben keinen problematischen Postinstall-Hook (typescript, tailwindcss u. a. haben Standard-Lifecycle-Hooks ohne externe Netzwerk-Calls).

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  React SPA: EstimateForm + ResultPanel                   │    │
│  │  fetch('/api/estimates', POST {pages, complexity})       │    │
│  └────────────────────────┬─────────────────────────────────┘    │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTP same-origin to :3000
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  frontend container (nginx:1.27-alpine, listen 80; host:3000)    │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐    │
│  │ location /          │  │ location /api/                  │    │
│  │   try_files $uri    │  │   proxy_pass                    │    │
│  │   → /index.html     │  │   http://backend:8000/api/      │    │
│  │   (SPA static)      │  │   (Docker DNS resolves)         │    │
│  └─────────────────────┘  └─────────────┬───────────────────┘    │
└────────────────────────────────────────┼─────────────────────────┘
                                         │ Compose internal network
                                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  backend container (python:3.12-slim-bookworm + uvicorn :8000)   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  FastAPI app (app/main.py)                             │      │
│  │   ├── router /api/health → returns {status, version,   │      │
│  │   │                                  timestamp}        │      │
│  │   └── router /api/estimates                            │      │
│  │         POST: parse {pages, complexity}                │      │
│  │              → MULTIPLIER[complexity]                  │      │
│  │              → return {pt: pages × multiplier}         │      │
│  │  NO CORSMiddleware (same-origin via nginx proxy)       │      │
│  └────────────────┬───────────────────────────────────────┘      │
│                   │ reads env DATABASE_URL (logged only,         │
│                   │ no DB code in Phase 1)                       │
└───────────────────┼──────────────────────────────────────────────┘
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
 ┌──────────┐ ┌──────────┐ ┌────────────────────────────────┐
 │ ./data   │ │ ./config │ │ env: DATABASE_URL=             │
 │ (bind)   │ │ (bind)   │ │   sqlite:///./data/estimates.db│
 │ /app/data│ │/app/cfg  │ │ (read but unused in Phase 1)   │
 │ (empty,  │ │ (empty,  │ └────────────────────────────────┘
 │ .gitkeep)│ │.gitkeep) │
 └──────────┘ └──────────┘
```

Datenfluss-Trace für Erfolgsfall (Browser → "Aufwand: 15 PT"):

1. Browser lädt `http://localhost:3000/` → nginx serviert `index.html` aus `/usr/share/nginx/html/`.
2. React mountet `<App />` → rendert `<EstimateForm />` mit `<input>` und `<select>`.
3. User füllt aus (`pages=10`, `complexity=medium`), klickt "Berechnen".
4. `api/client.ts` ruft `fetch('/api/estimates', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"pages":10,"complexity":"medium"}'})`.
5. nginx empfängt auf `:80`, matched `location /api/`, proxied an `http://backend:8000/api/estimates`.
6. FastAPI parsed via Pydantic `EstimateRequest`, lookup `MULTIPLIER["medium"] = 1.5`, berechnet `pt = 10 × 1.5 = 15.0`.
7. FastAPI returned `{"pt": 15.0}` als JSON.
8. nginx proxied Response zurück an Browser.
9. `<ResultPanel pt={15.0} />` rendert `"Aufwand: 15 PT"` (mit `String(pt)`, keine Locale-Formatierung in Phase 1).

### Recommended Project Structure (Phase 1 Endzustand)

```
EstimationManager/
├── docker-compose.yml          # 2 Services, Healthcheck-gated, Bind-Mounts
├── .env.example                # DATABASE_URL=sqlite:///./data/estimates.db (Doku)
├── .gitignore                  # data/*.db, node_modules, __pycache__, .venv, dist
├── .dockerignore               # node_modules, .venv, __pycache__, .git, *.md
├── README.md                   # 2 Sätze: Prereqs + Start
│
├── frontend/
│   ├── Dockerfile              # Multi-Stage: node:22-alpine build → nginx:1.27-alpine serve
│   ├── nginx.conf              # Single server block, SPA fallback, /api/ → backend:8000
│   ├── package.json
│   ├── pnpm-lock.yaml          # (oder package-lock.json)
│   ├── vite.config.ts          # @vitejs/plugin-react + @tailwindcss/vite + dev proxy /api → :8000
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css           # @import "tailwindcss";
│       ├── api/
│       │   └── client.ts
│       └── components/
│           ├── EstimateForm.tsx
│           └── ResultPanel.tsx
│
├── backend/
│   ├── Dockerfile              # Multi-stage uv (Astral) → python:3.12-slim-bookworm
│   ├── pyproject.toml          # fastapi[standard], uvicorn[standard], pydantic
│   ├── uv.lock                 # in VCS committed
│   ├── .python-version         # 3.12 (optional, von uv genutzt)
│   └── app/
│       ├── __init__.py         # __version__ = "0.1.0"
│       ├── main.py             # FastAPI app, router-includes, startup log of DATABASE_URL
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── health.py       # GET /api/health
│       │   └── estimates.py    # POST /api/estimates
│       └── schemas/
│           ├── __init__.py
│           └── estimate.py     # EstimateRequest, EstimateResponse
│
├── data/
│   └── .gitkeep                # Folder tracked; *.db files in .gitignore
│
└── config/
    └── .gitkeep                # Folder tracked; weights.json kommt in Phase 2
```

### Pattern 1: Reverse-Proxy via Single Frontend Container (von ARCHITECTURE.md übernommen)

**What:** nginx im Frontend-Container serviert sowohl SPA-static-files als auch reverse-proxied `/api/*` zum Backend-Container. Browser sieht nur einen Origin (`http://localhost:3000`).

**When to use:** Diese Phase, dieses Projekt — **immer**.

**Why:**
- Eliminiert CORS komplett (Browser-POV: same-origin).
- Single-URL für User: `http://localhost:3000`.
- Matched Production-Topologie (Cloud-Deployment hätte den gleichen nginx-Block).
- Backend-Port nicht zum Host exponiert → kleinere Attack-Surface (siehe Threat Model).

**Source:** `.planning/research/ARCHITECTURE.md` §"Pattern 1" + §"Service Topology".

### Pattern 2: Multi-Stage Docker mit uv (von Astral-Docs)

**What:** Backend-Image hat zwei Stages — Build-Stage mit `uv` installiert die Deps in einen `.venv`, Runtime-Stage kopiert nur das `.venv` und den Source-Code.

**Source:** `https://docs.astral.sh/uv/guides/integration/docker/` (Astral official docs, 2026).

**Code-Beispiel (für Backend-Dockerfile):**

```dockerfile
# Source: https://docs.astral.sh/uv/guides/integration/docker/
# Build-Stage
FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11.14 /uv /uvx /bin/
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-workspace
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable

# Runtime-Stage
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Anti-Patterns to Avoid

- **CORS-Middleware in FastAPI:** Pitfall #16. Same-Origin via Reverse-Proxy macht jede `CORSMiddleware`-Konfiguration obsolet. NICHT installieren, NICHT konfigurieren.
- **Hardcoded `http://localhost:8000` im Frontend-Code:** Pitfall #12. Stattdessen `fetch('/api/...')` mit relativem Pfad — in Dev resolved Vite via Proxy, in Prod via nginx.
- **Backend mit `ports: ["8000:8000"]` exponieren:** verletzt INFRA-04. Korrekt: `expose: ["8000"]` (nur Compose-internes Netz).
- **Short-form `depends_on: [backend]`:** Pitfall #15 — wartet nur auf Container-Start, nicht auf HTTP-Bereitschaft. Korrekt: long-form mit `condition: service_healthy`.
- **Default-Werte auf der Complexity-Dropdown:** Pitfall #17 (Anchoring Bias). Phase 1 etabliert das Pattern: kein `defaultValue`, Pflicht-Auswahl.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reverse-Proxy für `/api/*` | Custom FastAPI-Static-File-Serving + CORS | nginx-`location /api/ proxy_pass` | nginx ist battle-tested, korrekte Header-Propagation, `try_files`-SPA-Fallback ist eine Zeile. FastAPI als Static-Server wäre langsam und gegen die Trennung der Tiers. |
| Healthcheck-HTTP-Client im Container | `import requests; requests.get(...)` | `python -c "import urllib.request; urllib.request.urlopen(...)"` | urllib ist stdlib, keine extra dep, exit-code semantisch sauber. `curl` wäre ein extra apt-Paket. |
| Multi-Stage Build mit pip + venv-management | `pip install --target /opt/venv && copy /opt/venv` | uv multi-stage mit `COPY --from=ghcr.io/astral-sh/uv` | uv hat deterministische Lockfile, 10–100× schneller, der Astral-Pattern ist offiziell dokumentiert. |
| HTTP-Client-Wrapper mit Retry/Timeout/Cancel | Custom fetch-Wrapper mit AbortController + Retry | Plain `fetch()` in `api/client.ts` mit 1 try/catch | Phase 1 hat nur einen Endpoint und keine Retry-Anforderung — über-Engineering wäre verschwendet. Phase 2 zieht TanStack Query ein. |
| Form-State-Management | useState + manuelle Validation + Error-State | useState reicht für 2 Felder | Form ist throwaway. Phase 2 zieht react-hook-form + zod ein. |
| First-Run-Seed-Logik in Phase 1 | Boot-Script, das `weights.json` copy_if_missing macht | Nichts seeden — Bind-Mounts existieren leer (mit `.gitkeep`) | D-Discretion: "Phase 1 seedet **nichts** in `./config` oder `./data`." Seeding ist Phase-2/4-Thema. |
| Logging-Config | `logging.config.dictConfig` mit JSON-Formatter | `logging.basicConfig(level=INFO)` | Soft-Lock D-Discretion; structured Logs sind Phase-4. |

**Key insight:** Phase 1 ist explizit ein Walking Skeleton — der Code, der nicht über die vier Roadmap-Success-Criteria hinaus geht, wird in Phase 2 ohnehin ersetzt. Jedes "schon mal sauber bauen für später" verlängert Phase 1, ohne Phase 2 zu erleichtern (das echte Modell für Form/Validation/Engine kommt mit anderen Libraries an).

## Common Pitfalls

### Pitfall 1: Vite-Plugin-Version mit Vite 7 nicht kompatibel

**What goes wrong:** `pnpm add @vitejs/plugin-react` installiert ohne explizite Version-Pin die **6.x**-Linie. `@vitejs/plugin-react@6` hat `peerDependencies.vite = "^8.0.0"` — `pnpm` warnt, der Build kann zur Laufzeit cryptische Errors werfen, oder pnpm peer-resolution macht silently fallback auf nicht-getestete Code-Paths.

**Why it happens:** CLAUDE.md lockt Vite 7, aber das React-Plugin springt parallel auf 6.

**How to avoid:** Pin explizit auf `@vitejs/plugin-react@^5.2.0`. Verifiziere im Plan-Check, dass `pnpm install --frozen-lockfile` (oder `npm ci`) ohne peer-warnings durchläuft.

**Warning signs:** `npm WARN ERESOLVE`, `Cannot find module 'vite'` zur Build-Zeit, fehlende JSX-Transformation.

### Pitfall 2 (= Research PITFALLS #12): Frontend-API-URL hardcoded oder ohne `VITE_`-Prefix

**What goes wrong:** Frontend-Code enthält `fetch('http://localhost:8000/api/estimates')`. Funktioniert im lokalen Dev-Modus, schlägt im Container fehl (Browser kann `backend:8000` nicht auflösen, nur nginx kann das via Docker-DNS).

**Why it happens:** Entwickler kopiert Localhost-URL aus Curl-Tests.

**How to avoid:** Frontend nutzt **immer** relative Pfade: `fetch('/api/estimates')`. In Dev resolved Vite via Proxy (`vite.config.ts`), in Prod via nginx. Kein `VITE_API_BASE_URL` env var nötig in Phase 1 — Same-Origin macht das überflüssig.

**Warning signs:** `localhost:8000` im Source, CORS-Errors in Browser-Console, "works in dev breaks in compose".

### Pitfall 3 (= Research PITFALLS #14): Bind-Mount UID/GID auf Linux-Host

**What goes wrong:** Auf Linux-Hosts mit Docker-Engine (nicht Docker Desktop) macht der Container alle Files in `./data` mit root-UID. Phase 3 wird in `./data/estimates.db` schreiben wollen; falls vorher als root erzeugt, hat der Berater später Schreib-Permission-Probleme.

**Why it happens:** Bind-mounts preservieren Host-Ownership; root-Container schreibt als root.

**How to avoid in Phase 1:** **Bewusst akzeptiert** (D-Discretion: Container laufen als root, Zielgruppe Berater-Laptop mit Docker Desktop → kein UID-Problem dort). Plan-Checkpoint: README erwähnt, dass auf Linux-Hosts ggf. `chown -R $USER:$USER ./data ./config` nötig sein kann. Tieferer Fix (USER appuser + UID-Mapping) ist ein zukünftiges Hardening-Phase-Thema.

**Warning signs:** "Permission denied"-Error beim Phase-3-DB-Write; nur auf Linux reproduzierbar.

### Pitfall 4 (= Research PITFALLS #15): `depends_on` ohne `condition: service_healthy`

**What goes wrong:** Frontend startet, bevor Backend bereit ist — Browser bekommt 502/503 vom nginx-Proxy beim ersten Request.

**Why it happens:** Default `depends_on` ist "start order", nicht "ready".

**How to avoid:** Long-form `depends_on:` mit `backend: { condition: service_healthy }` UND ein funktionierender `healthcheck:`-Block auf dem Backend-Service (siehe Compose-Listing unten).

**Warning signs:** README sagt "starte zweimal", keine Healthcheck-Definition.

### Pitfall 5 (= Research PITFALLS #16): CORSMiddleware "vorsorglich" eingebaut

**What goes wrong:** Entwickler kennt FastAPI-CORS, installiert "zur Sicherheit" `app.add_middleware(CORSMiddleware, allow_origins=["*"])`. Funktioniert, aber: (a) verletzt das Same-Origin-Design, (b) maskiert spätere Misconfig (z. B. wenn jemand `backend` auf Host exponiert und CORS einen Bypass öffnet), (c) `allow_origins=["*"]` mit `allow_credentials=True` ist von Browsern abgelehnt.

**How to avoid:** `from fastapi.middleware.cors import CORSMiddleware` darf **nicht** im Phase-1-Code stehen. Plan-Checkpoint: grep für `CORSMiddleware` muss leer sein. Same-Origin via nginx ist der Vertrag.

**Warning signs:** `CORSMiddleware` import oder `add_middleware` in `app/main.py`.

### Pitfall 6: SPA-Routing-Fallback fehlt in nginx.conf

**What goes wrong:** Phase 1 hat nur eine Route (`/`), aber wenn Phase 2 React Router einführt und User direkt `http://localhost:3000/admin` lädt, returnt nginx 404 (kein File `/admin` im `dist/`-Folder).

**How to avoid:** `try_files $uri $uri/ /index.html;` im `location /`-Block. Phase 1 baut diese Zeile bereits ein, auch wenn sie erst Phase-2-relevant ist — minimale Mehrarbeit, vermeidet späteren Bug.

**Warning signs:** 404 beim direkten URL-Aufruf einer SPA-Route nach React-Router-Einführung.

### Pitfall 7: Root-Level package.json/node_modules aus slopcheck-Test-Install

**What goes wrong:** Aktueller Repo-Root enthält `package.json` mit `vite@^8.0.13` + `@vitejs/plugin-react@^6.0.2` + `typescript@^6.0.3`. Diese stammen aus der slopcheck-`npm install` Legitimitäts-Verifikation. Falls Phase-1-Setup diese nicht aufräumt, hat der Berater zwei `package.json`s und Tool-Confusion.

**How to avoid:** Plan-Schritt 1: `rm /Users/florianblauensteiner/Documents/claude_projects/EstimationManager/package.json /Users/florianblauensteiner/Documents/claude_projects/EstimationManager/package-lock.json && rm -rf /Users/florianblauensteiner/Documents/claude_projects/EstimationManager/node_modules` **bevor** `frontend/` scaffolded wird. (Alle echten Frontend-Files leben in `frontend/`, nicht im Root.)

**Warning signs:** Zwei `package.json`-Files im Repo, `vite@8` im Root, Verwirrung beim Plan-Reviewer.

## Code Examples

Verifizierte Snippets aus offiziellen Quellen — Code-Sprache Englisch, UI-Strings Deutsch.

### Backend — `app/__init__.py`

```python
__version__ = "0.1.0"
```

### Backend — `app/main.py`

```python
# Source: FastAPI tutorial https://fastapi.tiangolo.com/tutorial/bigger-applications/
import logging
import os
from fastapi import FastAPI

from app import __version__
from app.routers import estimates, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

# INFRA-05: read DATABASE_URL from env, default to SQLite local path.
# Phase 1 only LOGS the value; Phase 3 connects to it.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/estimates.db")
log.info("Starting backend v%s — DATABASE_URL=%s (unused in Phase 1)", __version__, DATABASE_URL)

app = FastAPI(
    title="Estimation Manager — Backend",
    version=__version__,
    docs_url="/api/docs",     # OpenAPI-UI unter /api/docs (durch nginx erreichbar)
    openapi_url="/api/openapi.json",
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(estimates.router, prefix="/api", tags=["estimates"])

# NO CORSMiddleware — Same-Origin via nginx reverse-proxy.
```

### Backend — `app/routers/health.py`

```python
# Source: FastAPI docs https://fastapi.tiangolo.com/reference/apirouter/
from datetime import datetime, timezone
from fastapi import APIRouter

from app import __version__

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """D-06: 200 OK mit status, version, timestamp (ISO-8601 UTC)."""
    return {
        "status": "ok",
        "version": __version__,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
```

### Backend — `app/schemas/estimate.py`

```python
# Source: Pydantic v2 docs https://docs.pydantic.dev/latest/concepts/fields/
from typing import Literal
from pydantic import BaseModel, Field

Complexity = Literal["low", "medium", "high", "very_high"]


class EstimateRequest(BaseModel):
    """D-02: Request-Body für POST /api/estimates."""
    pages: int = Field(ge=0, description="Anzahl Pages, ≥ 0")
    complexity: Complexity = Field(description="Pages-Komplexität (kein Default, Pitfall #17)")


class EstimateResponse(BaseModel):
    """D-02: Response-Body für POST /api/estimates."""
    pt: float = Field(description="Berechneter Aufwand in PT (Phase 1: float OK; Phase 2: Decimal)")
```

### Backend — `app/routers/estimates.py`

```python
# Source: FastAPI tutorial https://fastapi.tiangolo.com/tutorial/body/
from fastapi import APIRouter

from app.schemas.estimate import EstimateRequest, EstimateResponse

router = APIRouter()

# D-03: hardcoded Skeleton-Multiplikatoren — NICHT die Phase-2-Basisgewichte.
# Phase 2 ersetzt diese Map durch weights.json + engine.calculate().
_SKELETON_MULTIPLIER: dict[str, float] = {
    "low": 1.0,
    "medium": 1.5,
    "high": 2.5,
    "very_high": 4.0,
}


@router.post("/estimates", response_model=EstimateResponse)
def create_estimate(req: EstimateRequest) -> EstimateResponse:
    """Skeleton round-trip: pt = pages × multiplier[complexity]."""
    multiplier = _SKELETON_MULTIPLIER[req.complexity]
    pt = req.pages * multiplier
    return EstimateResponse(pt=pt)
```

### Backend — `pyproject.toml`

```toml
[project]
name = "estimation-manager-backend"
version = "0.1.0"
description = "Backend für die Software-Estimation-Manager-App (Phase 1: Skeleton Slice)."
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

### Backend — `Dockerfile` (multi-stage, uv)

```dockerfile
# Source: https://docs.astral.sh/uv/guides/integration/docker/
# Build-Stage: deps installieren via uv
FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11.14 /uv /uvx /bin/

WORKDIR /app

# Layer-Caching: erst Lock + Manifest, dann Code
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-workspace

COPY pyproject.toml uv.lock /app/
COPY app /app/app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable

# Runtime-Stage: nur Venv + App
FROM python:3.12-slim-bookworm

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# INFRA-04: nur expose (Compose-intern), kein Host-Port-Mapping in compose
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend — `package.json`

```jsonc
{
  "name": "estimation-manager-frontend",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 4173"
  },
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.2.0",
    "@tailwindcss/vite": "^4.3.0",
    "tailwindcss": "^4.3.0",
    "typescript": "~5.9.0",
    "vite": "^7.3.3"
  }
}
```

### Frontend — `vite.config.ts`

```typescript
// Source: https://tailwindcss.com/docs/installation/using-vite + https://vitejs.dev/config/server-options.html#server-proxy
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Dev-Modus (außerhalb Docker): pnpm dev → Vite proxied /api an lokales Backend.
    // Pitfall #12: Frontend-Code nutzt IMMER relative /api/-URLs.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

### Frontend — `src/index.css`

```css
/* Source: https://tailwindcss.com/docs/installation/using-vite */
@import "tailwindcss";
```

### Frontend — `src/main.tsx`

```typescript
// Source: https://react.dev/reference/react-dom/client/createRoot
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

### Frontend — `src/App.tsx`

```typescript
// D-05: Phase-1-Layout — kein Router, eine Route, zwei Komponenten.
import { useState } from 'react'
import EstimateForm from './components/EstimateForm'
import ResultPanel from './components/ResultPanel'

export default function App() {
  const [pt, setPt] = useState<number | null>(null)
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Software-Aufwandsschätzung</h1>
        <p className="text-sm text-gray-600">Skeleton-Phase: ein Parameter, eine Zahl.</p>
        <EstimateForm onResult={setPt} />
        <ResultPanel pt={pt} />
      </div>
    </div>
  )
}
```

### Frontend — `src/api/client.ts`

```typescript
// Pitfall #12: nur relative /api/-Pfade — nginx proxied in Prod, Vite proxied in Dev.
export type Complexity = 'low' | 'medium' | 'high' | 'very_high'

export interface EstimateRequest {
  pages: number
  complexity: Complexity
}

export interface EstimateResponse {
  pt: number
}

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

### Frontend — `src/components/EstimateForm.tsx`

```typescript
// D-01: pages (≥0 Integer) + complexity (Pflicht, KEIN Default → Pitfall #17).
import { useState } from 'react'
import { postEstimate, type Complexity } from '../api/client'

interface Props {
  onResult: (pt: number | null) => void
}

export default function EstimateForm({ onResult }: Props) {
  const [pages, setPages] = useState<number | ''>('')
  // Pitfall #17 (Anchoring Bias): kein Default — User MUSS aktiv wählen.
  const [complexity, setComplexity] = useState<Complexity | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    onResult(null)
    if (pages === '' || complexity === '') {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    setBusy(true)
    try {
      const { pt } = await postEstimate({ pages, complexity })
      onResult(pt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Anzahl Pages</span>
        <input
          type="number"
          min={0}
          step={1}
          value={pages}
          onChange={(e) => setPages(e.target.value === '' ? '' : Number(e.target.value))}
          required
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Komplexität</span>
        <select
          value={complexity}
          onChange={(e) => setComplexity(e.target.value as Complexity)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="" disabled>— bitte wählen —</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="very_high">very_high</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? 'Berechne…' : 'Berechnen'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
```

### Frontend — `src/components/ResultPanel.tsx`

```typescript
// D-05: nur "Aufwand: {pt} PT", keine Locale-Formatierung in Phase 1.
interface Props {
  pt: number | null
}

export default function ResultPanel({ pt }: Props) {
  if (pt === null) return null
  return (
    <div className="rounded border border-green-300 bg-green-50 p-3">
      <p className="text-lg">Aufwand: {String(pt)} PT</p>
    </div>
  )
}
```

### Frontend — `index.html`

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Software-Aufwandsschätzung</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Frontend — `Dockerfile` (multi-stage)

```dockerfile
# Source: research/ARCHITECTURE.md §"Pattern 1" + research/STACK.md §"Docker base image"
# Build-Stage: pnpm (oder npm) build → dist/
FROM node:22-alpine AS builder
WORKDIR /app

# Layer-Caching: erst Manifest + Lock, dann Source
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src

RUN pnpm build
# → /app/dist/index.html + /app/dist/assets/*

# Runtime-Stage: nginx servt dist/ + reverse-proxy
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# CMD-Default von nginx:alpine ist bereits richtig (nginx -g 'daemon off;')
```

### Frontend — `nginx.conf` (Pattern 1, ARCHITECTURE.md-Vorlage)

```nginx
# Source: .planning/research/ARCHITECTURE.md §"Pattern 1: Reverse-Proxy via Single Frontend Container"
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: alle Client-Side-Routes fallen auf index.html zurück (Phase-2-Vorbereitung)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy (Same-Origin aus Browser-POV)
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Phase 1: kleine JSON-Bodies; Phase 4 (PDF-Download) ändert das nicht — PDFs sind Response, kein Upload
        client_max_body_size 1m;
        proxy_read_timeout 30s;
    }
}
```

### Root — `docker-compose.yml`

```yaml
# Source: research/ARCHITECTURE.md §"Service Topology" + research/STACK.md §"Decision 7"
# Compose-v2 — kein `version:`-Key
services:
  backend:
    build: ./backend
    expose:
      - "8000"               # INFRA-04: NICHT `ports:` — Backend ist nur compose-intern
    environment:
      DATABASE_URL: sqlite:///./data/estimates.db    # INFRA-05: env-driven, Phase 1 nur geloggt
    volumes:
      - ./data:/app/data     # INFRA-06: persistenter Bind-Mount für künftige DB
      - ./config:/app/config # INFRA-06: persistenter Bind-Mount für künftiges weights.json
    healthcheck:
      # D-06: kein curl im Image — urllib reicht
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:80"            # INFRA-04: EINZIGER Host-Port
    depends_on:
      backend:
        condition: service_healthy   # INFRA-07: gated auf Backend-Bereitschaft (Pitfall #15)
    restart: unless-stopped
```

### Root — `.env.example`

```bash
# Phase 1 setzt diese in compose direkt — .env ist optional und dokumentarisch.
DATABASE_URL=sqlite:///./data/estimates.db
```

### Root — `.gitignore`

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/
.uv/

# Frontend
node_modules/
frontend/dist/
*.tsbuildinfo

# Daten (Phase 3+)
data/*.db
data/*.db-journal
data/*.db-wal
data/*.db-shm

# OS / Editor
.DS_Store
.idea/
.vscode/
```

### Root — `.dockerignore`

```dockerignore
**/.git
**/.gitignore
**/node_modules
**/__pycache__
**/.venv
**/.pytest_cache
**/dist
**/*.md
.planning/
```

### Root — `README.md` (Phase-1-Minimum)

```markdown
# Software-Aufwandsschätzung

**Voraussetzungen:** Docker Desktop mit Docker Compose v2 (Aufruf via `docker compose`, nicht `docker-compose`).

**Start:** `docker compose up` — danach öffne http://localhost:3000.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pip install -r requirements.txt` im Dockerfile | `uv sync --frozen` via `COPY --from=ghcr.io/astral-sh/uv` | uv stable ≥ 0.5 (Anfang 2025); offizielle Astral-Docker-Docs ab Mitte 2025 | 10–100× schnellere Container-Builds; deterministische Lockfile |
| `tailwind.config.js` + `@tailwind base/components/utilities` Directives | `@tailwindcss/vite` Plugin + `@import "tailwindcss";` in CSS | Tailwind v4 (Released Anfang 2025) | Kein JS-Config-File mehr nötig für Standardfälle; CSS-first Theming via `@theme` |
| `docker-compose.yml` mit `version: "3.8"` Key | Compose v2 ohne `version:` Key | docker compose Plugin v2 (2023+) | `version:` wird ignoriert, modern weggelassen |
| `CORSMiddleware allow_origins=["*"]` für lokales Dev | Same-Origin via nginx Reverse-Proxy | Pattern stabil seit Jahren | Kein CORS-Overhead, eine URL, weniger Konfusion |
| `python:3.12-alpine` für kleinere Images | `python:3.12-slim-bookworm` | Pango/Cairo-Problem auf musl libc — gilt für **alle** Image-Variants, die später WeasyPrint bekommen (Phase 4). Phase 1 wählt slim-bookworm bereits, um keinen Image-Wechsel zu nötigen | Image leicht größer, dafür Phase-4-ready ohne Image-Migration |

**Deprecated/outdated:**
- **`docker-compose` v1 (Python-CLI mit Bindestrich):** EOL seit 2023. Immer `docker compose` (mit Leerzeichen, v2-Plugin).
- **`fastapi[all]` extra:** Legacy-Alias. Korrekt ist `fastapi[standard]`.

## Runtime State Inventory

> Phase 1 ist greenfield — kein vorheriger Runtime-State existiert. Diese Sektion ist trotzdem ausgefüllt, weil der Repo-Root durch slopcheck-Test-Installs einen unbeabsichtigten npm-Artefakt enthält.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | Nichts — Bind-Mounts `./data` und `./config` existieren noch nicht (werden in Phase 1 angelegt) | Phase-1-Task: `mkdir -p data config && touch data/.gitkeep config/.gitkeep` |
| **Live service config** | Nichts — keine Live-Services existieren | Keine |
| **OS-registered state** | Nichts — kein Task Scheduler, keine systemd-Units | Keine |
| **Secrets/env vars** | Nichts in der Codebase. `DATABASE_URL` wird in `docker-compose.yml` neu gesetzt; kein bestehender `.env`-File | Phase-1-Task: `.env.example` mit `DATABASE_URL=sqlite:///./data/estimates.db` anlegen |
| **Build artifacts / installed packages** | Repo-Root enthält `package.json`, `package-lock.json`, `node_modules/` aus slopcheck-Test-Install (Vite 8, plugin-react 6, TS 6 — **inkompatibel mit Phase-1-Lock**) | Phase-1-Task: `rm package.json package-lock.json && rm -rf node_modules` **vor** Frontend-Scaffolding (siehe Pitfall #7 oben) |

## Common Pitfalls — referenced

Bereits oben in §"Common Pitfalls" diskutiert: PITFALLS #12 (Vite ENV / hardcoded URL), #14 (Bind-Mount UID/GID), #15 (depends_on Race), #16 (CORS misconfig), plus Phase-1-spezifische Pitfalls #1 (plugin-react Version-Lock) und #7 (Repo-Root-Slopcheck-Artefakt).

## Validation Architecture

> Nyquist Validation ist aktiviert (config.json: `workflow.nyquist_validation: true`). Phase 1 hat keinen Test-Framework-Stack (D-Discretion lockt minimal Tooling — kein pytest/vitest). Validierung erfolgt durch ausführbare Smoke-Tests in der lokalen Shell.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Keiner installiert** in Phase 1 (D-Discretion: pytest/vitest folgen in Phase 2). Validation via Shell-Smoke-Tests |
| Config file | Keiner |
| Quick run command | `docker compose up -d --build && sleep 10 && curl -fsS http://localhost:3000/api/health` |
| Full suite command | Siehe `## Phase Requirements → Test Map` unten — sechs Shell-Commands sequenziell |
| Phase gate | Alle 6 Tests grün vor `/gsd:verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `docker compose up` startet ohne manuelle Schritte | smoke | `docker compose up -d --build && docker compose ps --format json \| jq -e 'all(.State == "running")'` | ❌ Wave 0 (docker-compose.yml selbst ist das Wave-0-Artefakt) |
| INFRA-03 | nginx reverse-proxied `/api/*` zu backend:8000 | smoke | `curl -fsS -X POST http://localhost:3000/api/estimates -H 'Content-Type: application/json' -d '{"pages":10,"complexity":"medium"}' \| jq -e '.pt == 15'` | ❌ Wave 0 |
| INFRA-04 | Backend-Port 8000 ist **nicht** auf Host gemapped | smoke | `! (curl -fsS --max-time 2 http://localhost:8000/api/health 2>/dev/null)` — muss fehlschlagen (Connection Refused) | ❌ Wave 0 |
| INFRA-05 | Backend liest `DATABASE_URL` aus Env mit SQLite-Default | smoke | `docker compose logs backend \| grep -q 'DATABASE_URL=sqlite:///./data/estimates.db'` | ❌ Wave 0 |
| INFRA-06 | Bind-Mounts `./data` und `./config` sind persistent | smoke | `touch data/test-marker config/test-marker && docker compose restart backend && docker compose exec backend ls /app/data/test-marker /app/config/test-marker && rm data/test-marker config/test-marker` | ❌ Wave 0 |
| INFRA-07 | `/api/health` antwortet 200; Frontend wartet auf `service_healthy` | smoke | `curl -fsS http://localhost:3000/api/health \| jq -e '.status == "ok" and (.timestamp \| length > 0) and .version == "0.1.0"'` PLUS `docker inspect $(docker compose ps -q backend) --format '{{.State.Health.Status}}' \| grep -q healthy` | ❌ Wave 0 |

**Manuelle Verifikation (kein Automatismus möglich in Phase 1):**

- Browser-Test (Success-Criterion 2 der Roadmap): Öffne `http://localhost:3000` → fülle Form aus (`pages=10`, `complexity=medium`) → klicke "Berechnen" → sehe `Aufwand: 15 PT`. (Headless-Browser-Test via Playwright ist out-of-scope für Phase 1 — minimal Tooling.)

### Sampling Rate

- **Per task commit:** keine automatischen Tests; manuelle Curl-Smoke-Tests nach jedem Compose-relevanten Task
- **Per wave merge:** Smoke-Test-Suite oben sequenziell (~30 Sekunden)
- **Phase gate:** Alle 6 Shell-Commands grün + manueller Browser-Test bestanden

### Wave 0 Gaps

- [ ] `docker-compose.yml` — root-level Compose-File (das gesamte Phase-1-Artefakt ist quasi Wave 0)
- [ ] `backend/Dockerfile` + `backend/pyproject.toml` + `backend/uv.lock`
- [ ] `frontend/Dockerfile` + `frontend/nginx.conf` + `frontend/package.json` + `frontend/pnpm-lock.yaml`
- [ ] `data/.gitkeep` + `config/.gitkeep` (Folder-Bootstrapping)
- [ ] Keine Test-Framework-Installation in Phase 1 — Phase 2 zieht pytest + vitest ein

## Security Domain

> security_enforcement ist nicht explizit auf `false` gesetzt → enabled. Phase 1 ist Infrastruktur-Scaffold; die meisten ASVS-Kategorien greifen erst mit echter Form/Engine/DB in Phasen 2+.

### Applicable ASVS Categories (Phase 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Same-Origin via Reverse-Proxy dokumentiert (Pattern 1); Tier-Trennung (D-04, D-05) |
| V2 Authentication | **no** | Phase 1 hat keine Auth; v1 ist Lokal-first Single-User (Auth-Readiness-Seam ist Phase-3-Thema via `user_id NULL` Spalte) |
| V3 Session Management | **no** | Keine Sessions in Phase 1 |
| V4 Access Control | **no** | Alle Endpoints öffentlich auf Container-internem Netz; Host-Exposition ist nur Frontend `:3000` (lokal-only) |
| V5 Input Validation | **yes** | Pydantic v2 validiert `EstimateRequest` (`pages: int ≥ 0` via `Field(ge=0)`, `complexity: Literal[...]`). Falsche Werte → automatisch HTTP 422 |
| V6 Cryptography | **no** | Keine Crypto in Phase 1 — keine Passwörter, keine Tokens, kein TLS (Lokal-only) |
| V7 Error Handling | yes | FastAPI default Exception-Handler returnen strukturiertes JSON; Pydantic-422-Errors enthalten kein Server-Internals (Stack-Traces) |
| V12 API & Web Service | yes | API-Routes unter `/api/` Prefix; OpenAPI-Docs auf `/api/docs` (Phase 1: bewusst öffentlich, weil keine Auth) |
| V14 Configuration | yes | `DATABASE_URL` via Env-Var (kein Hardcoded Secret); `.env` ist in `.gitignore`; Backend-Port nicht zum Host exponiert (INFRA-04) |

### Known Threat Patterns for {FastAPI + nginx + Docker Compose}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Unbounded `pages` value (DoS via large integer)** | DoS | `pages: int = Field(ge=0, le=100_000)` — Phase 1 sollte einen Upper-Bound setzen (z. B. `le=100000`), auch wenn die Skeleton-Berechnung trivial ist. Verhindert `pt = 10**18 × 4.0` Edge-Case. **Plan-Task:** Field-Constraint hinzufügen |
| **`complexity` Injection (unbekannter String)** | Tampering | `Literal["low","medium","high","very_high"]` — Pydantic lehnt alles andere mit 422 ab |
| **Backend-Port versehentlich auf Host exponiert** | Information Disclosure | INFRA-04: `expose: ["8000"]` statt `ports:`. Smoke-Test verifiziert (`curl localhost:8000` muss fehlschlagen) |
| **OpenAPI-Docs auf `/api/docs` öffentlich** | Information Disclosure | Phase-1-Akzeptanz: bewusst öffentlich, weil keine Auth. **Plan-Annotation:** Phase 3 (mit `get_current_user_optional()` Stub) kann `docs_url=None` setzen, wenn Auth eingeführt wird |
| **nginx `proxy_set_header Host`-Spoof** | Spoofing | `proxy_set_header Host $host;` forwarded den User-supplied Host-Header — Phase 1 OK weil Backend keine Host-Whitelist hat; Phase 4 (mit PDF-Generierung, die ggf. Asset-URLs basierend auf Host generiert) muss reviewen |
| **Pydantic-Validation-Error leaked internals** | Information Disclosure | FastAPI default ist eine JSON-Struktur ohne Stack-Trace; OK für v1 |
| **CORS Misconfig (Anti-Pattern)** | — | Per Design eliminiert: keine `CORSMiddleware` installiert (siehe Pitfall 5) |

**Phase-1-Härtungs-Empfehlung für Plan:** Setze auf `EstimateRequest.pages` einen sinnvollen Upper-Bound (`Field(ge=0, le=10_000)` reicht für eine echte Software-Schätzung — niemand hat 10.000 Pages). Verhindert DoS-Vektor und ist konsistent mit Phase-2-Validierung.

## Open Questions

1. **pnpm vs. npm — finale Entscheidung beim Planer.**
   - Was wir wissen: pnpm ist shadcn-Default und faster/disk-effizient. npm ist Standard und überall installiert.
   - Was unklar ist: Hat der Berater pnpm bereits installiert? `corepack enable` aktiviert pnpm transparent via Node 22.
   - Empfehlung: **pnpm** mit `corepack enable && pnpm install --frozen-lockfile` im Dockerfile — minimaler Footprint, kein extra pnpm-Install-Schritt nötig.

2. **`docs_url`-Default `/api/docs` — bewusst öffentlich oder per Env-Var schaltbar?**
   - Was wir wissen: FastAPI Default-Docs sind sehr nützlich für Phase-1-Debugging.
   - Was unklar ist: Soll Phase 1 das schon parameterisieren?
   - Empfehlung: **Default ON in Phase 1**. Wenn Phase 3 Auth einführt, dort schaltbar machen.

3. **TypeScript-Version exakt 5.7.x oder 5.9.x?**
   - Was wir wissen: CLAUDE.md sagt "TypeScript 5.7.x". npm aktueller latest ist 6.0.3 (im Repo-Root, aus slopcheck), aber 5.x lifeline ist `5.9.x` (Standard für 2026 React 19 + Vite 7 Setup).
   - Was unklar ist: Strikte Auslegung "5.7" oder "5.x stabil"?
   - Empfehlung: **TypeScript ~5.9.0**. Ist Quasi-Standard in aktuellen Vite-React-Templates und mit React 19 + Tailwind v4 verifiziert.

4. **Soll Phase 1 ein `.env.example` schon enthalten?**
   - Was wir wissen: docker-compose.yml setzt `DATABASE_URL` direkt via `environment:`, kein `.env`-File nötig.
   - Was unklar ist: Schon dokumentarisch anlegen?
   - Empfehlung: **Ja, `.env.example` minimal anlegen** — Pattern für Phasen 3+; kostet eine Zeile.

5. **Bind-Mount-Pfade — `./data:/app/data` oder `./data:/data`?**
   - Was wir wissen: ARCHITECTURE.md zeigt `./data:/app/data`; STACK.md zeigt `./data:/app/data`; ROADMAP/CONTEXT zeigt nichts Spezifisches.
   - Empfehlung: **`./data:/app/data`** + **`./config:/app/config`** (konsistent mit ARCHITECTURE.md). `DATABASE_URL=sqlite:///./data/estimates.db` mit `WORKDIR /app` → resolved zu `/app/data/estimates.db` → matched Bind-Mount.

## Environment Availability

| Dependency | Required By | Available (auf Berater-Mac) | Version | Fallback |
|------------|------------|-----------|---------|----------|
| **Docker Desktop** (mit Compose v2 Plugin) | INFRA-01, alle Compose-Operationen | ✓ (User-System: macOS Darwin 24.6.0) | wird vom User gepflegt — README dokumentiert, dass Compose v2 (also `docker compose`, ohne Bindestrich) Voraussetzung ist | Keine — ohne Docker geht Phase 1 nicht |
| **Internet-Zugang** zur Build-Zeit | Pull der Base-Images (python:3.12-slim-bookworm, node:22-alpine, nginx:1.27-alpine, ghcr.io/astral-sh/uv:0.11.14) + npm + PyPI | ✓ (gesetzt für Berater) | n/a | Keine für Initial-Build; Runtime ist offline (lokal-first) |
| **curl** auf Host | Smoke-Test-Validation | ✓ (macOS Standard) | macOS Default | Browser-Test als Fallback |
| **jq** auf Host | Smoke-Test JSON-Parsing | wahrscheinlich ✓; falls nicht: `brew install jq` | beliebig | Tests können auch ohne jq laufen (`grep -q '"pt":15'`), aber jq ist sauberer |
| **node + pnpm** | Dev-Modus `pnpm dev` außerhalb Docker | nicht zwingend nötig in Phase 1 (Compose-Path reicht), aber Phase 2 wird es brauchen | — | Compose-Only ist OK; Dev-Loop ist Phase-2-Thema |
| **uv** auf Host | Dev-Modus Backend ohne Docker | nicht zwingend nötig | — | Compose-Only ist OK |

**Missing dependencies with no fallback:** Keine (Docker Desktop ist gesetzt).

**Missing dependencies with fallback:** `jq` (Browser-Test/grep als Fallback). Falls jq fehlt: `brew install jq` als Plan-Schritt im Validation-Setup.

## Assumptions Log

> Claims tagged `[ASSUMED]` in dieser Research-Datei — diese sollten beim Planning oder via discuss-phase bestätigt werden.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Berater-Laptop hat Docker Desktop + Compose v2 installiert | Environment Availability | Phase 1 nicht ausführbar; README dokumentiert Voraussetzung, aber kein Auto-Install-Pfad |
| A2 | macOS-Host (Darwin 24.6.0) → keine UID/GID-Probleme mit Bind-Mounts | Common Pitfalls #3 | Linux-Hosts würden Permission-Probleme bekommen; bewusst akzeptiert in D-Discretion |
| A3 | TypeScript ~5.9.0 ist die korrekte Auslegung von CLAUDE.md "5.7.x" | Open Questions #3 | Falls strikt 5.7.x gewünscht: minimale Risk, Compile-Verhalten praktisch identisch |
| A4 | `node:22-alpine` als Build-Stage ist Vite-7-kompatibel ohne native-deps | Architecture Patterns | Sehr niedriges Risiko (Vite ist pure JS); kann ggf. auf `node:22-bookworm` umgeschwenkt werden, falls esbuild-Probleme auf alpine auftreten |
| A5 | `pnpm install --frozen-lockfile` via `corepack enable` ist Phase-1-tauglich | Frontend Dockerfile | Niedrige Risiko; Alternative ist `npm ci` |
| A6 | OpenAPI-Docs auf `/api/docs` öffentlich akzeptabel in v1 | Security Domain | Keine Auth in v1 → bewusst öffentlich, aber Plan-Reviewer sollte explizit bestätigen |

Wenn diese Tabelle leer wäre, wären alle Claims hier verifiziert oder zitiert — sie ist absichtlich klein, weil die Architektur in `research/ARCHITECTURE.md` schon gefroren ist und Phase 1 sie nur umsetzt.

## Sources

### Primary (HIGH confidence)

- **`.planning/research/ARCHITECTURE.md`** — §"System Overview", §"Pattern 1: Reverse-Proxy via Single Frontend Container", §"Service Topology", §"Phase 1 — Skeleton Slice", §"Anti-Pattern 4: CORS" — Architektur ist hier bereits gefroren, Phase 1 setzt um.
- **`.planning/research/STACK.md`** — §"Core Technologies" (Version-Locks), §"Decision 7: Docker Compose structure" (Healthcheck-Pattern), §"What NOT to Use" (Vite 8, Alpine fürs Backend, CORS).
- **`.planning/research/PITFALLS.md`** — Pitfalls #12 (Vite ENV), #14 (Bind-Mount UID), #15 (depends_on Race), #16 (CORS), #17 (Anchoring).
- **`CLAUDE.md`** §"Technology Stack" — Exakte Versionen + "What NOT to Use" Tabelle.
- **`.planning/phases/01-skeleton-slice/01-CONTEXT.md`** — Locked Decisions D-01 bis D-06.
- **Astral uv Docker Guide** — https://docs.astral.sh/uv/guides/integration/docker/ — kanonisches Multi-Stage-Pattern mit `COPY --from=ghcr.io/astral-sh/uv` und `uv sync --frozen`.
- **Tailwind v4 Vite Installation** — https://tailwindcss.com/docs/installation/using-vite — `@tailwindcss/vite` Plugin + `@import "tailwindcss"`.
- **npm registry verifications (am 2026-05-16):** `npm view vite versions`, `npm view @vitejs/plugin-react@{5,6} peerDependencies`, `npm view @tailwindcss/vite@4.3.0 peerDependencies`, `npm view react version`.
- **PyPI registry verifications (am 2026-05-16):** `python3 -m pip index versions {fastapi,uvicorn,pydantic}`.
- **slopcheck 0.6.1 verifications (am 2026-05-16):** 10/10 Packages `[OK]` (3 PyPI + 7 npm).

### Secondary (MEDIUM confidence)

- WebSearch — Docker Compose Healthcheck-Timing für FastAPI/Uvicorn (mehrere Quellen, konsistent: interval 5–30s, timeout 3–10s, retries 3–5, start_period 5–40s je nach Stack). Gewählt: 10s/3s/5/5s — kurze Intervalle wegen schneller Uvicorn-Startup (~1-2s).

### Tertiary (LOW confidence)

- Keine. Alle relevanten Claims sind durch Primärquellen oder verifizierte Registry-Calls abgedeckt.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Versionen registry-verifiziert + CLAUDE.md-Lock + Peer-Dep-Kompatibilität geprüft
- Architecture: HIGH — Pattern 1 ist in research/ARCHITECTURE.md vollständig spezifiziert (Pre-Locked)
- Pitfalls: HIGH — alle 6 Pitfalls aus research/PITFALLS.md übernommen + 2 Phase-1-spezifische (Plugin-Version, Slopcheck-Artefakt)
- Code Examples: HIGH — alle Backend/Frontend-Snippets aus offiziellen Docs zitiert + auf Phase-1-Scope reduziert
- Validation: HIGH — Smoke-Tests sind ausführbare Curls, kein Framework-Abhängigkeit
- Security Domain: MEDIUM — ASVS-Mapping ist phase-spezifisch und reflektiert "scaffold only", nicht "production app"

**Research date:** 2026-05-16
**Valid until:** ~30 Tage (2026-06-15) für Versionen (Vite 7.3.3, FastAPI 0.136.1 etc. können bis dahin Patches bekommen); Architektur-Pattern sind langfristig stabil.
