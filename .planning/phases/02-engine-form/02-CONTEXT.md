# Phase 2: Engine & Form - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 liefert die **Engine-Korrektheit + Schema-Form**, bevor in Phase 3 Persistenz dazukommt:

- Pure PERT-Engine als deterministische Funktion `calculate(inputs, snapshot)` mit Decimal end-to-end (kein float, ROUND_HALF_UP)
- Vollständiges Eingabe-Formular (Stammdaten + 5 Parameter mit Komplexität + Languages/Roles/Users + 4 Korrekturfaktoren mit Pflicht-Auswahl ohne Default + Tagessatz + Annahmen + Ausschlüsse)
- Dashboard mit PERT/Konfidenz/Phasen-Tabelle/€/Faktoren-Anzeige/Scope-Text — deutsche Lokalisierung
- `WeightsSnapshot` als Single Source of Truth: pro Request vollständiger Snapshot, mit Result zurück an den Client
- Alles in-memory, keine DB, kein PDF, keine History, kein Admin-Editor

**Was diese Phase NICHT liefert** (Scope-Bleed-Schutz):

- SQLAlchemy-Persistenz, History, Clone, CSV-Export → Phase 3
- WeasyPrint, Jinja2, deutsches PDF, methodik.txt → Phase 4
- Admin-Editor `/admin`, atomic-write `weights.json`, ADMIN-* Requirements → Phase 5

Die echten Lieferobjekte (Code + Patterns) aus Phase 2 sind die Engine + Decimal-Pattern + Snapshot-Vertrag, die in allen späteren Phasen unverändert weitergetragen werden.

</domain>

<decisions>
## Implementation Decisions

### Form-Layout & UX

- **D-01: Lineare Single-Page-Form mit Card-Sections** — Form lebt unter `/new`, alle Felder untereinander gruppiert in 4 visuellen Sections via shadcn `Card`:
  1. **Stammdaten** — Projektname, Projekttyp, Skizze, Kundenname, Projekt-ID, Gültigkeit-bis, Erstellt-von, Tagessatz
  2. **Parameter** — Pages, Use Cases, Business Objects, Interfaces, Batches (jeweils Anzahl + Komplexitäts-Dropdown) + Languages + Roles + Concurrent-Users
  3. **Faktoren** — Tech-Reife, Team-Erfahrung, Quality/Compliance, Dokumentationspflicht (jeweils 5-stufige Selects, Pflicht, KEINE Defaults — Anti-Anchoring per D-01 aus Phase 1 fortgesetzt)
  4. **Annahmen & Ausschlüsse** — zwei Textareas (max 1500 Zeichen, mit Live-Zähler)
  Berechnen-Button **sticky am unteren Viewport-Rand** (immer sichtbar während Scroll). Begründung: Berater scrollt einmal durch, kein versteckter Kontext, kein Tab-Wechsel-Aufwand für Rückblick. Ablehnungsgrund Accordion: Pflichtfelder dürfen nicht in collapsed Sections versteckt sein.

- **D-02: shadcn/ui in Phase 2 einziehen** — shadcn-CLI 3.x mit Tailwind v4 installieren. Komponenten landen in `frontend/src/components/ui/`. Konkrete Komponenten für Phase 2: `card`, `input`, `select` (Radix Select-Wrapper), `textarea`, `label`, `button`, `tooltip`, `form` (react-hook-form-Integration). Phasen 3 (Table für History) und 5 (Tabs/Dialog/AlertDialog für Admin) bauen auf der gleichen `components/ui/`-Basis auf. Konkrete Phase-2-Bare-Tailwind-Komponenten aus Phase 1 (`EstimateForm.tsx`, `ResultPanel.tsx`) werden in Phase 2 ersetzt.

### Dashboard-Layout & Risiko-Surfacing

- **D-03: Kennzahlen-Grid oben + Sektion-Stack unten** — Dashboard lebt unter `/result`. Aufbau von oben nach unten:
  1. **Kennzahlen-Card** — 4-Spalten-Grid mit den Headline-PT: PERT / P50 / P80 / P90 (große Zahlen, deutsche Formatierung `102,3 PT`, Tooltip mit Konfidenz-Erklärung an P50/P80/P90)
  2. **PERT-Detail-Card** — O / Most_Likely / P / σ (kleinere Schrift, ergänzende Kontext-Info)
  3. **Phasen-Tabelle-Card** — 6 Zeilen (Anforderungen 12% / Architektur 15% / Implementierung 42% / Test 18% / Deployment 5% / PM 8%) mit PT + € pro Phase, deutsche Lokalisierung
  4. **Faktoren-Card** — Multiplikator-Anzeige pro 4 Korrekturfaktoren + Projekttyp + Languages-Kurve + User-Range + Roles
  5. **Scope-Text-Card** — generierter deutscher Fließtext (Projekt-Zusammenfassung, Umfang, Aufwand, Annahmen, Ausschlüsse, Risikohinweise)
  Berater haben das Wichtigste (Headline-PT + €) sofort sichtbar, ohne dass Detail-Information verloren geht.

- **D-04: Risikohinweis dual surfacen — Banner oben + Absatz im Scope-Text** — Wenn EIN Faktor-Multiplikator > 1.15 ist:
  - **Banner**: ganz oben im Dashboard ein gelb/oranger `Alert` (shadcn `alert` Variant `warning`) mit Icon `lucide-react/AlertTriangle`, Titel "Risikoindikator", Body: "Faktor [Name] ist auf [Stufe] eingestellt (Multiplikator [Wert])"
  - **Scope-Text**: eigener Absatz "Risikoindikatoren:" mit identischer Formulierung
  Begründung: Banner schützt vor Übersehen in der UI, Scope-Text-Absatz sorgt dafür dass das Risiko-Statement im PDF-Export (Phase 4) automatisch erscheint, ohne dass Phase 4 das nochmal generieren muss. PDF-Selbstständigkeit ist Kern-Wert (PROJECT.md).

### Routing & State

- **D-05: react-router 7 in Phase 2 einziehen** — react-router-Install jetzt, nicht Phase 3. Routes:
  - `/` redirects auf `/new`
  - `/new` = `EstimateForm.tsx` (Form-Page)
  - `/result` = `Dashboard.tsx` (Result-Page; result kommt via `location.state` aus dem Router, noch keine URL-Params weil keine DB)
  Phase 3 erweitert um `/estimates` (History), `/estimates/:id` (Read-only Detail), `/estimates/new?clone_from=:id` (Clone-Pre-Fill) — die Phase-2-Routes bleiben unverändert. Browser-Back von `/result` führt zurück auf `/new` mit erhaltenen Form-Werten (react-hook-form lokal-State). State überlebt KEIN Browser-Reload — das ist OK, da Phase 3 die Persistenz dazu liefert.

### WeightsSnapshot & Engine-Loading

- **D-06: weights.default.json gebundelt + First-Run-Copy nach `./config`** — Backend bundelt im Container-Image `backend/app/data/weights.default.json` mit allen Default-Gewichten (Basisgewichte für 5 Parameter × 4 Komplexitäten, alle 5 Faktor-Tabellen × 5 Stufen + Projekttyp, PERT-Multiplikatoren, Phasenverteilung, Languages-Kurve, User-Range, Roles). Beim FastAPI-Startup:
  ```python
  if not (CONFIG_DIR / "weights.json").exists():
      shutil.copyfile(BUNDLED_DEFAULTS, CONFIG_DIR / "weights.json")
  ```
  Phase 5 (Admin) schreibt dieselbe Datei via atomic-write. Vorteil: Phase 2 testet bereits den finalen Load-Pfad (`./config/weights.json` aus Bind-Mount), Phase 5 muss nur die Schreibfläche bauen und kann auf `weights.default.json` als "Reset auf Defaults"-Anker (ADMIN-08) referenzieren.

- **D-07: Pro-Request Read-and-Parse, kein Cache in Phase 2** — Bei jedem `POST /api/estimates` liest der `WeightsLoader.load()` die Datei frisch und parst sie via Pydantic-Schema in den `WeightsSnapshot`. Performance-Budget: weights.json ist <5KB, Decimal-Parse + Pydantic-Validate ist im Sub-Millisekunden-Bereich → kein Risiko für DASH-10 (<1s). Phase 5 baut darauf mtime-basierten Cache + Invalidierung (ADMIN-11) — diese Optimierung kommt MIT der Admin-UI, weil dann erst die Anforderung an "live update without restart" entsteht. Phase 2 muss diese Komplexität NICHT vorwegnehmen.

### Decimal-Präzision & Display-Rundung

- **D-08: Volle Decimal-Präzision in Engine, Display-Rundung erst am Edge** — Engine arbeitet intern mit unbegrenzter Decimal-Präzision (Python-Default-Context, kein `quantize()` während Berechnung). Rundung ausschließlich:
  - **PT**: 1 Nachkommastelle via `Decimal("0.1")` mit `ROUND_HALF_UP` — Anzeige `"102,3 PT"`, Phasen ebenfalls 1 Nachkommastelle
  - **€**: 2 Nachkommastellen via `Decimal("0.01")` mit `ROUND_HALF_UP` — Anzeige `"15.480,75 €"`
  - σ (Standardabweichung): 1 Nachkommastelle wie PT
  Rundungslogik lebt im Backend bei der JSON-Serialisierung (`@field_serializer` auf `PTDecimal` / `MoneyDecimal` quantize-then-stringify). Frontend bekommt bereits gerundete Strings und formatiert nur noch deutsche Lokalisierung (`Intl.NumberFormat('de-DE')` für Tausender-Punkt + Komma). Phasen-Summen-Drift (sum(round(p)) ≠ round(sum(p))) ist durch 1-Nachkommastelle vernachlässigbar; Doku-Hinweis in methodik.txt (Phase 4) erklärt das.

### Claude's Discretion

Folgende Bereiche werden bewusst **nicht** im Detail diskutiert. Planner entscheidet pragmatisch nach existierenden Patterns und canonical refs:

- **Pydantic-Schema-Struktur** — Granularität (Mega-Schema vs. nested) und Aufteilung in Module entscheidet Planner. Lock: TECH-02 verlangt `MoneyDecimal` und `PTDecimal` als Type-Aliase mit `@field_serializer`. Engine-Input und Engine-Output sind separate Pydantic-Klassen, kein gemeinsamer DTO. Frontend-Zod-Schemas spiegeln 1:1 die Backend-Pydantic-Schemas.
- **Scope-Text-Generierung** — Empfehlung Planner: Jinja2-Template `scope_text.de.j2` im Backend (gleiche Lib die Phase 4 für PDF nutzt — Konsistenz). Generiert wird im Backend nach Berechnung, kommt im API-Response-Body mit zurück. Frontend rendert als Plain-Text in `<pre>` oder `<div>`. Begründung: gleicher Text in UI und PDF, eine Quelle.
- **Engine-Test-Strategie** — Empfehlung Planner: Drei Schichten:
  1. Pure-Function-Property-Tests (Hypothesis): identische `(inputs, snapshot)` → identische Result über 1000+ generierte Inputs
  2. Decimal-Drift-Test: 7-fache Faktor-Multiplikation auf ML, vergleiche mit Float-Berechnung → muss messbar abweichen, Decimal-Pfad muss nicht
  3. Goldene Test-Cases: 5 hand-gerechnete Sample-Estimates mit bekannten Ergebnissen (z.B. aus historischen Excel-Sheets), die als `tests/fixtures/golden_estimates.json` festgelegt sind
- **Engine-Layering** — Empfehlung Planner: `backend/app/engine/__init__.py` exportiert nur `calculate`, `WeightsSnapshot`, `EstimateInputs`, `EstimateResult`. Sub-Module: `engine/core.py` (calculate), `engine/types.py` (Decimal-Aliase + Pydantic-Modelle), `engine/scope.py` (Scope-Text-Generator). Importlinter-Regel (TECH-01): `engine/` darf NICHT aus `models/`, `db/`, `routers/`, `services/` importieren. Linter-Setup in `pyproject.toml` via `ruff` oder dediziertes `importlinter`-Tool.
- **`load_weights()` Implementierung** — Empfehlung Planner: `backend/app/services/weights_loader.py` mit Klasse `WeightsLoader.load(path: Path) -> WeightsSnapshot`. Liegt in `services/` (nicht `engine/`), weil I/O. Engine bekommt fertigen Snapshot per Argument (CALC-07). Phase 5 erweitert die Klasse um Cache+Invalidierung; Phase 2 hat nur einen `load()`-Aufruf pro Request.
- **shadcn/ui-Variante** — Empfehlung Planner: New-York-Style (shadcn-Default), Slate Neutralton, kein Brand-Color in Phase 2 (CLAUDE.md "keine spielerische Elemente"). `components.json` mit `style: "new-york"`, `baseColor: "slate"`.
- **Sticky Berechnen-Button-Implementierung** — Empfehlung Planner: `position: sticky; bottom: 0` mit weißem Hintergrund + leichtem Shadow. Disabled wenn Form invalid (react-hook-form `formState.isValid`). Auf Mobile via Tailwind responsive klassen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projekt-Grundlagen (immer zuerst lesen)
- `.planning/PROJECT.md` — Core Value (Reproduzierbarkeit), Constraints (Tech-Stack-Lock, Deutsch UI/Outputs, stateless Backend, Performance-Budgets)
- `.planning/REQUIREMENTS.md` — Phase-2-Requirements: INPUT-01..08, PARAM-01..08, FACT-01..04, TEXT-01..02, CALC-01..07, REPRO-01, DASH-01..10, TECH-01, TECH-02, TECH-04, TECH-08, TECH-09
- `.planning/ROADMAP.md` §"Phase 2: Engine & Form" — alle 5 Success Criteria

### Phase-1-Vorgaben (Pattern-Lock weiterführen)
- `.planning/phases/01-skeleton-slice/01-CONTEXT.md` — D-04 (Backend-Sub-Package-Layout), D-05 (Frontend-Layout), D-02 (POST /api/estimates URL+Pattern bleibt), Anti-Anchoring (keine Defaults auf Pflichtfeldern)
- `.planning/phases/01-skeleton-slice/01-03-SUMMARY.md` — fertige Walking-Skeleton, `docker compose up` läuft, weights.json bind-mount in `./config` ist bereit

### Stack & Versionen (versionsstrikt)
- `CLAUDE.md` §"Technology Stack" — Decimal-Handling Decision 2 (TypeDecorator, ROUND_HALF_UP), TECH-02 MoneyDecimal/PTDecimal, react-hook-form 7.76, zod 4, @tanstack/react-query 5, shadcn/ui 3.x CLI mit Tailwind v4, react-router 7.15
- `CLAUDE.md` §"Decision 2: Decimal Handling for €/PT → CRITICAL" — Hinweise zu Decimal-Pitfalls, `localcontext` mit `ROUND_HALF_UP`, NIE Zwischen-Rundung
- `.planning/research/STACK.md` §"Supporting Libraries — Frontend" — react-hook-form + zod Patterns, @hookform/resolvers v5 für Zod 4

### Architektur & Patterns
- `.planning/research/ARCHITECTURE.md` §"Pattern 2: Pure Engine" — Engine-Signatur, Layering, Test-Patterns
- `.planning/research/ARCHITECTURE.md` §"Phase 2 — Engine & Form" — Recommended Phase Structure
- `.planning/research/FEATURES.md` — falls vorhanden, deutsche Lokalisierungs-Patterns für Intl.NumberFormat + Babel
- `.planning/research/PITFALLS.md` — Pitfall #1 (Float-Drift), #2 (Decimal-JSON-Serialisierung), #17 (Anti-Anchoring), und Phase-2-relevante Pitfalls

### shadcn/ui Setup
- `https://ui.shadcn.com/docs/installation/vite` — Vite + Tailwind v4 Install-Guide
- `https://ui.shadcn.com/docs/components/form` — Form-Komponente mit react-hook-form-Integration
- `https://ui.shadcn.com/docs/tailwind-v4` — v4-Compat-Status

### react-router 7
- `https://reactrouter.com/start/declarative/installation` — Daten-Router-Modus für Vite

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (aus Phase 1)

- **`backend/app/main.py`** — FastAPI-App-Bootstrap, Logger-Setup, Routers eingebunden. Phase 2 erweitert um `engine/`-Imports und einen `startup_event` für `seed_config()` (D-06).
- **`backend/app/routers/estimates.py`** — `POST /api/estimates` mit Skeleton-Body `{pages, complexity}` → `{pt}`. Phase 2 ersetzt vollständig den Request-/Response-Body durch das volle Schema. URL und Methode bleiben.
- **`backend/app/routers/health.py`** — `GET /api/health` Payload `{status, version, timestamp}`. Phase 2 verändert nicht — bleibt für docker-compose Healthcheck-Vertrag stabil.
- **`backend/app/schemas/estimate.py`** — Pydantic-Skeleton-Schema. Wird in Phase 2 vollständig umgebaut zu `EstimateInputs` + `EstimateResult` + `WeightsSnapshot` + Type-Aliase. Path bleibt gleich.
- **`frontend/src/api/client.ts`** — `postEstimate` Funktion. Wird in Phase 2 erweitert um `react-query`-Mutation-Wrapper; relative `/api/`-URLs bleiben (D-Discretion aus Phase 1).
- **`frontend/src/App.tsx`** — Root-Component. Phase 2 wird `BrowserRouter` mit den Routes `/new` + `/result` einsetzen.
- **`frontend/src/components/EstimateForm.tsx`** — Skeleton-Form. Wird in Phase 2 vollständig ersetzt, Datei bleibt mit volle Form-Implementation.
- **`frontend/src/components/ResultPanel.tsx`** — Skeleton-Ergebnis. Wird in Phase 2 ersetzt durch `Dashboard.tsx` mit den 5 Card-Sections (D-03).
- **`./config/` Bind-Mount** — leer, Phase 2 schreibt beim Boot `weights.json` dorthin (D-06).
- **`./data/` Bind-Mount** — bleibt leer in Phase 2 (Phase 3 schreibt dort SQLite-File).

### Established Patterns

- **Sub-Package-Layout (D-04 Phase 1)** — Phase 2 fügt hinzu: `backend/app/engine/` (pure functions), `backend/app/services/` (WeightsLoader, ScopeGenerator).
- **Relative `/api/`-URLs (Phase 1 D-Discretion)** — Frontend nutzt weiter `fetch('/api/estimates')`. nginx-Reverse-Proxy unverändert.
- **Anti-Anchoring (Phase 1 D-01)** — auf alle Pflicht-Selects ausgeweitet: Komplexität pro Parameter, alle 4 Korrekturfaktoren, Projekttyp, Concurrent Users.
- **TypeScript-Strict (Phase 1)** — alle neuen Components mit korrektem Typing, Decimal-Werte als `string` typisiert (TECH-02).

### Integration Points

- **`POST /api/estimates`** — bleibt URL-stabil, Schema wird erweitert (Skeleton war 2 Felder → Full ~30 Felder). Phase 3 erweitert dieses Endpoint um Persistierung (Side-Effect: DB-Insert), Response-Schema bekommt `id`-Feld.
- **`./config/weights.json`** — Phase 2 ist der erste Konsument; Phase 5 wird Producer (Admin-Schreibfläche). Schema-Vertrag muss in `WeightsSnapshot` Pydantic-Schema stabil definiert sein.
- **`/api/health`** — Phase 2 könnte den Payload erweitern um `weights: "loaded" | "missing"` (Smoke-Indicator). Aber: docker-compose Healthcheck prüft nur HTTP-200, Erweiterung ist optional. Planner entscheidet.

</code_context>

<specifics>
## Specific Ideas

- **Sticky-Footer Berechnen-Button** — fest am Viewport unten während Form-Scroll, mit Schatten zur Form. Inhalt: `Berechnen` + (rechts) live-Validation-Counter "X Felder fehlen" wenn nicht alle Pflichtfelder gesetzt.
- **Skizze-Live-Counter** — Pattern aus INPUT-02 (max 600 Zeichen) wird auf beide Textareas (TEXT-01, TEXT-02, jeweils max 1500) ausgeweitet. Zähler-Format `523 / 600` (rot ab 95%).
- **Erstellt-von Pre-Fill** — INPUT-07 verlangt localStorage-Pre-Fill. Phase 2 setzt das in der Form auf: bei Form-Mount `localStorage.getItem('estimation:last_creator')` lesen; bei Berechnen-Submit `setItem('estimation:last_creator', value)`.
- **PERT-Detail-Tooltip** — Berater haben oft Fragen wie "was ist σ" — Tooltips an P50/P80/P90 und σ erklären in einem Satz (`Standardabweichung der PERT-Verteilung`, `Konfidenz: 50% der Schätzungen liegen unter diesem Wert`).
- **Faktoren-Anzeige im Dashboard** — pro Faktor zeige Stufen-Label + numerischen Multiplikator, z.B. `Tech-Reife: günstig (×0,95)`. Berater muss sofort verstehen wo das Risiko herkommt.
- **Phase 2 baut KEINEN Print-Preview-Modus** — PDF kommt Phase 4. Dashboard ist UI-only.

</specifics>
