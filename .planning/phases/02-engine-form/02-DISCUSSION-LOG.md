# Phase 2 Discussion Log

**Gathered:** 2026-05-17
**Mode:** discuss (4 gray areas + 1 follow-up)

## Gray Areas Presented

User selected ALL four offered areas (multiSelect):
1. Form-Layout & UX-Struktur
2. Dashboard-Layout & Risiko-Surfacing
3. Routing & State-Persistenz
4. WeightsSnapshot-Seeding ohne DB/Admin

Plus follow-up: Decimal Display-Präzision (PT/€ Rundung am Edge)

## Area 1: Form-Layout & UX-Struktur

### Question: Wie soll das vollständige Eingabe-Formular strukturiert sein?

**Options presented:**
- (A) Lineare Single-Page-Form mit Card-Sections — Empfohlen
- (B) Tabs/Stepper (Stammdaten → Parameter → Faktoren → Annahmen)
- (C) Accordion — alle Sections ausklappbar, Defaults eingeklappt außer Stammdaten

**Selected:** A — Lineare Single-Page-Form mit Card-Sections

**Rationale:** Berater scrollt einmal durch ohne versteckten Kontext. Pflichtfelder dürfen nicht in collapsed Sections versteckt sein (Accordion-Ablehnungsgrund). Sticky-Berechnen-Button unten bleibt während Scroll sichtbar.

### Question: shadcn/ui-Komponenten installieren oder weiter mit bare Tailwind?

**Options presented:**
- (A) shadcn/ui jetzt einziehen — Empfohlen
- (B) Bare Tailwind in Phase 2 — shadcn erst Phase 3

**Selected:** A — shadcn/ui in Phase 2 einziehen

**Rationale:** 30+ Felder ohne Form/Select/Tooltip-Primitives wäre UX-schwach + Doppelaufwand. Phasen 3+5 brauchen ohnehin shadcn (History-Table, Admin-Editor). Einmal jetzt installieren, alle späteren Phasen nutzen die gleiche `components/ui/`-Basis.

## Area 2: Dashboard-Layout & Risiko-Surfacing

### Question: Wie soll das Ergebnis-Dashboard strukturiert sein?

**Options presented:**
- (A) Kennzahlen-Grid oben + Phasen-Tabelle + Scope-Text unten — Empfohlen
- (B) Side-by-Side: Kennzahlen links, Scope-Text + Faktoren rechts
- (C) Drilldown: TL;DR-Cards oben + Details aufklappbar

**Selected:** A — Kennzahlen-Grid oben + Sektion-Stack unten

**Rationale:** Klassisches Berater-Dashboard — Headline-PT zuerst, ohne Information zu verbergen. Aufklappen (C) zwingt zu zusätzlichem Klick für PDF-relevanten Volltext. Side-by-Side (B) ist sinnvoll auf breiten Monitoren, aber Single-Column ist linearer für Print-Layout-Erwartung in Phase 4.

### Question: Wie soll der Risikohinweis surfacen, wenn ein Faktor > 1.15 ist?

**Options presented:**
- (A) Banner oben + Inline im Scope-Text — Empfohlen
- (B) Nur inline im Scope-Text
- (C) Nur Banner oben

**Selected:** A — Banner + Scope-Text-Absatz dual

**Rationale:** Banner verhindert Übersehen in UI, Scope-Text-Absatz sorgt dafür dass PDF (Phase 4) das Risiko automatisch mitführt — PDF muss eigenständig sein (PROJECT.md Core Value).

## Area 3: Routing & State-Persistenz

### Question: Wie sollen Form und Dashboard navigatorisch zusammenhängen?

**Options presented:**
- (A) Same-Page Conditional Render — noch kein react-router
- (B) react-router mit /new + /result (clientseitig, in-memory) — Empfohlen
- (C) react-router komplett auf Phase 3 verschieben

**Selected:** B — react-router 7 in Phase 2 einziehen

**Rationale:** Pfad-Vertrag von Anfang an sauber. Phase 3 erweitert Routes (/estimates, /estimates/:id, /estimates/new?clone_from=:id) ohne Phase-2-Code zu brechen. Browser-Back-Verhalten ist sauber (zurück zum Form). Reload-Persistenz fehlt — bewusst akzeptiert weil Phase 3 das DB-seitig löst.

## Area 4: WeightsSnapshot-Seeding ohne DB/Admin

### Question: Wo wohnt 'weights.json' in Phase 2?

**Options presented:**
- (A) Gebundelt im Image als weights.default.json, beim ersten Start nach ./config kopiert — Empfohlen
- (B) Hardcoded Python-Dict, kein File
- (C) Direkt weights.json im Repo committen, kein default-Mechanismus

**Selected:** A — Bundle + First-Run-Copy

**Rationale:** Phase 2 testet bereits den finalen Load-Pfad (./config/weights.json). Phase 5 muss nur die Schreibfläche bauen, kein Migrations-Refactor. `weights.default.json` bleibt als ADMIN-08 "Reset auf Defaults"-Anker. Option C verliert Defaults wenn Bind-Mount-File gelöscht wird.

### Question: Wann lädt das Backend die Weights?

**Options presented:**
- (A) Pro Request einlesen + parsen — Empfohlen für Phase 2
- (B) Einmal beim Boot in Memory + mtime-Watcher
- (C) Einmal beim Boot, keine Invalidierung

**Selected:** A — Pro-Request Read-and-Parse

**Rationale:** Phase 2 hat noch kein Admin-Write, also keine Live-Update-Anforderung. mtime-Watcher (B) ist Phase 5-Aufgabe (ADMIN-11). Performance: <5KB JSON-Parse + Pydantic-Validate ist Sub-Millisekunden — kein Risiko für DASH-10 (<1s Budget). Phase 5 baut auf den Loader und erweitert ihn um Cache+Invalidierung.

## Follow-up: Decimal Display-Präzision

### Question: Wie soll die Decimal-Genauigkeit für Anzeige/PDF aussehen?

**Options presented:**
- (A) PT auf 1 Nachkommastelle, € auf 2 Nachkommastellen, gerundet erst am Edge — Empfohlen
- (B) PT ganzzahlig, € auf 2 Nachkommastellen
- (C) PT auf 2 Nachkommastellen, € auf 2 Nachkommastellen

**Selected:** A — PT 1NK / € 2NK, gerundet am Edge

**Rationale:** Engine bleibt voll-präzise (kein Drift während Berechnung). Frontend bekommt bereits gerundete Strings vom `@field_serializer`. Phasen-Summen-Drift bei 1-NK-Rundung vernachlässigbar; in methodik.txt (Phase 4) zu dokumentieren.

## Scope Creep Captured: None

User hielt sich an die Phase-2-Domain. Keine Versuche, Persistenz/PDF/Admin in Phase 2 zu ziehen.

## Deferred Ideas

Keine separaten neuen Ideen — alle Aspekte hängen an existierenden Phasen 3-5 oder sind bereits dokumentiert.

## Claude's Discretion Items

Folgende technische Implementierungs-Details wurden NICHT zur User-Entscheidung gestellt, sondern als "soft-locked" an den Planner delegiert:

- Pydantic-Schema-Modulstruktur (TECH-02 lockt nur die Type-Aliase)
- Scope-Text-Generierungsmechanismus (Empfehlung: Jinja2-Template — gleiche Lib wie Phase 4 PDF)
- Engine-Test-Strategie (Empfehlung: Hypothesis Property-Tests + Decimal-Drift-Test + Golden-Fixtures)
- Importlinter-Setup (TECH-01 verlangt das Lint, Tool-Wahl: ruff oder importlinter)
- shadcn-Variante (Empfehlung: New-York / Slate Neutral)
- Sticky-Button-Implementierung (Empfehlung: `position: sticky; bottom: 0`)

Begründung: User hat sich für tech-stack-Decisions auf CLAUDE.md verlassen ("CLAUDE.md hat das so geplant"), Planner soll diese pragmatisch umsetzen.

---
*Phase: 02-engine-form*
*Completed: 2026-05-17*
