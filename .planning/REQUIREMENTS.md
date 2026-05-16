# Requirements: Software Estimation Manager

**Defined:** 2026-05-16
**Core Value:** Reproduzierbare, nachvollziehbare PT-Schätzungen mit Snapshot der verwendeten Gewichte je Schätzung — gespeicherte Schätzungen bleiben unverändert reproduzierbar, auch nach Admin-Änderung der globalen Gewichte.

## v1 Requirements

### Stammdaten (Eingabe)

- [ ] **INPUT-01**: Nutzer kann Projektname (Textfeld, pflicht, max 200 Zeichen) erfassen
- [ ] **INPUT-02**: Nutzer kann Projektskizze als Textarea erfassen (max 600 Zeichen, Live-Zähler)
- [ ] **INPUT-03**: Nutzer kann Projekttyp aus Dropdown wählen: Neuentwicklung / Erweiterung / Migration / Legacy-Migration
- [ ] **INPUT-04**: Nutzer kann Kundenname (`client_name`, Textfeld, optional) erfassen — erscheint auf PDF-Deckblatt
- [ ] **INPUT-05**: Nutzer kann Projekt-ID (`project_id`, Textfeld, optional) erfassen — erscheint auf PDF-Deckblatt und in Fußzeile
- [ ] **INPUT-06**: Nutzer kann Gültigkeit-bis-Datum (`valid_until`, Datepicker, Default = heute + 30 Tage) erfassen
- [ ] **INPUT-07**: Nutzer kann "Erstellt von" (Textfeld, pflicht) erfassen, vorbefüllt mit dem zuletzt verwendeten Wert (localStorage)
- [ ] **INPUT-08**: Nutzer kann Tagessatz in € (Decimal, pflicht, > 0) erfassen

### Parameter-Eingabe

- [ ] **PARAM-01**: Nutzer kann für Pages Anzahl (Integer ≥ 0) und Komplexität (low / medium / high / very_high) erfassen
- [ ] **PARAM-02**: Nutzer kann für Use Cases Anzahl + Komplexität erfassen
- [ ] **PARAM-03**: Nutzer kann für Business Objects Anzahl + Komplexität erfassen
- [ ] **PARAM-04**: Nutzer kann für Interfaces Anzahl + Komplexität erfassen
- [ ] **PARAM-05**: Nutzer kann für Batches Anzahl + Komplexität erfassen
- [ ] **PARAM-06**: Nutzer kann Languages-Anzahl (Zahl 1–10, mit Bereichsvalidierung) erfassen
- [ ] **PARAM-07**: Nutzer kann Roles-Anzahl (Zahl 1–30, mit Bereichsvalidierung) erfassen
- [ ] **PARAM-08**: Nutzer kann Concurrent Users als 5-stufigen Range-Dropdown wählen: <50 / 50–200 / 201–1000 / 1001–10000 / >10000

### Globale Korrekturfaktoren (Eingabe)

- [ ] **FACT-01**: Nutzer wählt Technologie-Reife aus 5-stufigem Dropdown (sehr günstig bis sehr ungünstig) — pflicht, kein Default (Anti-Anchoring-Bias)
- [ ] **FACT-02**: Nutzer wählt Team-Erfahrung aus 5-stufigem Dropdown — pflicht, kein Default
- [ ] **FACT-03**: Nutzer wählt Qualität/Compliance-Anforderungen aus 5-stufigem Dropdown — pflicht, kein Default
- [ ] **FACT-04**: Nutzer wählt Dokumentationspflicht aus 5-stufigem Dropdown — pflicht, kein Default

### Per-Schätzung Annahmen & Ausschlüsse

- [ ] **TEXT-01**: Nutzer kann Annahmen-Textarea (max 1500 Zeichen, optional) je Schätzung erfassen — fließt ins PDF ein
- [ ] **TEXT-02**: Nutzer kann Ausschlüsse-Textarea (max 1500 Zeichen, optional) je Schätzung erfassen — fließt als "Nicht enthalten ist:" ins PDF ein

### Schätzlogik (Engine)

- [ ] **CALC-01**: Engine lädt Basisgewichte aus `weights.json` (konfigurierbar, atomic-rename writes)
- [ ] **CALC-02**: Engine berechnet Most_Likely (ML) per Standardformel:
      `ML = (Pages × LangFaktor + UseCases + BusinessObjects + Interfaces + Batches) × RolesFaktor × UserFaktor × Tech × Team × Quality × Doc × ProjectType`
- [ ] **CALC-03**: Engine berechnet PERT: Optimistisch = ML × 0.75, Pessimistisch = ML × 1.55, PERT = (O + 4M + P)/6, Standardabweichung σ = (P − O)/6 — Multiplikatoren konfigurierbar
- [ ] **CALC-04**: Engine berechnet P50/P80/P90 analytisch aus PERT-Verteilung (µ=PERT, σ=(P−O)/6)
- [ ] **CALC-05**: Engine berechnet Phasenverteilung auf Most_Likely: Anforderungen 12% / Architektur 15% / Implementierung 42% / Test 18% / Deployment 5% / PM 8% — Prozentsätze konfigurierbar, Summe = 100 zwingend
- [ ] **CALC-06**: Engine arbeitet durchgängig mit `Decimal` (kein float), Rundungsmodus `ROUND_HALF_UP`, dokumentiert
- [ ] **CALC-07**: Engine-Funktion `calculate(inputs, snapshot)` ist pur — kein I/O, kein globaler State, keine Fallback-Lookups auf `load_weights()`; identische Inputs ⇒ identische Outputs deterministisch

### Reproduzierbarkeit (Snapshot)

- [ ] **REPRO-01**: Beim Erzeugen einer Schätzung wird ein vollständiger `WeightsSnapshot` (Basisgewichte + alle 5 Korrekturfaktor-Tabellen + PERT-Multiplikatoren + Phasenverteilung + Languages-Kurve + User-Range-Faktoren + Roles-Faktoren) erstellt und unverändert in der DB persistiert
- [ ] **REPRO-02**: Beim Öffnen einer historischen Schätzung wird `result` direkt aus der DB gelesen — keine Re-Berechnung mit aktuellen Gewichten
- [ ] **REPRO-03**: CI-Regressionstest lädt jede gespeicherte Schätzung und prüft: `calculate(stored.inputs, stored.weights_snapshot) == stored.result`

### Ergebnis-Dashboard

- [ ] **DASH-01**: Dashboard zeigt PERT-Übersicht: Optimistisch / Most_Likely / Pessimistisch / PERT in PT
- [ ] **DASH-02**: Dashboard zeigt Konfidenz-Zeile: P50 / P80 / P90 in PT mit Erläuterungs-Tooltip
- [ ] **DASH-03**: Dashboard zeigt Phasen-Tabelle mit absoluten PT je Phase + Anteil
- [ ] **DASH-04**: Dashboard zeigt Parameter-Zusammenfassung (Pages/UCs/BOs/Interfaces/Batches mit Anzahl × Komplexität)
- [ ] **DASH-05**: Dashboard zeigt aktive Korrekturfaktoren (jede der 4 Kategorien + Projekttyp) mit gewähltem Multiplikator
- [ ] **DASH-06**: Dashboard zeigt €-Auswertung: Gesamt-€ (PERT × Tagessatz) und €-Anteil pro Phase
- [ ] **DASH-07**: Dashboard zeigt generierten Scope-Text auf Deutsch: Projektzusammenfassung, Umfang, Aufwand, Annahmen
- [ ] **DASH-08**: Dashboard zeigt Risikohinweis im Scope-Text, sobald EIN globaler Korrekturfaktor > 1.15 ist — mit Hinweis auf den konkreten Faktor
- [ ] **DASH-09**: Dashboard nutzt deutsche Lokalisierung (`de_DE`): Datum `31.12.2026`, Zahlen `1.234,56`, Währung `1.234,56 €`
- [ ] **DASH-10**: Dashboard rendert < 1s nach `Berechnen`-Klick auf Standard-Berater-Laptop

### PDF-Export

- [ ] **PDF-01**: Nutzer kann mit einem Klick ein PDF des angezeigten Schätz-Berichts erzeugen und herunterladen
- [ ] **PDF-02**: PDF enthält Deckblatt mit: Projektname, `client_name`, `project_id`, Datum, `valid_until`, `Erstellt von`
- [ ] **PDF-03**: PDF enthält Scope-Beschreibung (Zusammenfassung + Umfang + Annahmen-Block + Ausschlüsse-Block + Risikohinweise)
- [ ] **PDF-04**: PDF enthält Parameter-Tabelle (alle 5 Parameter mit Anzahl × Komplexität, Languages, Roles, Concurrent Users)
- [ ] **PDF-05**: PDF enthält Aufwandsschätzung: PERT (O/M/P/PERT/σ), P50/P80/P90, Phasenverteilung (PT + €)
- [ ] **PDF-06**: PDF enthält aktive Korrekturfaktoren mit den gewählten Stufen und Multiplikator-Werten
- [ ] **PDF-07**: PDF enthält Methodik-Boilerplate-Text (aus `methodik.txt`)
- [ ] **PDF-08**: PDF hat Fußzeile mit Projektname, `project_id`, "Seite x / y" auf jeder Seite
- [ ] **PDF-09**: PDF enthält Haftungsausschluss-Text am Ende (konfigurierbar)
- [ ] **PDF-10**: PDF rendert deutsche Umlaute korrekt (Font-Bundling `fonts-dejavu` + `fonts-liberation` im Docker-Image, Build-Zeit-Smoketest)
- [ ] **PDF-11**: PDF-Tabellen brechen sauber über Seiten (`thead { display: table-header-group; }`, `tr { page-break-inside: avoid; }`) — kein mid-row split, kein doppelter Header-Bug
- [ ] **PDF-12**: PDF nutzt deutsches Format: Datum `31.12.2026`, Zahlen `1.234,56`, Währung `1.234,56 €` (via Babel `locale='de_DE'`)
- [ ] **PDF-13**: PDF-Rendering < 5s für eine Standard-Schätzung; WeasyPrint mit `url_fetcher=disallow_external` (keine Netzwerk-Requests)

### Persistierung & Verlauf

- [ ] **PERS-01**: Jede berechnete Schätzung wird in der DB persistiert mit: `id`, `name`, `created_at`, `created_by`, vollständiger `inputs` (JSON), `weights_snapshot` (JSON), `result` (JSON), `parent_estimate_id` (nullable FK), `user_id` (nullable, Auth-Readiness-Seam)
- [ ] **PERS-02**: Schätzungen sind unveränderlich (clone-only) — kein Edit-Endpoint, keine Update-Operation auf bestehende Datensätze
- [ ] **PERS-03**: Nutzer kann Schätzung klonen — Klon kopiert `inputs` in das Eingabe-Formular auf `/estimates/new?clone_from=:id`; neue Berechnung erzeugt neuen Datensatz mit `parent_estimate_id = :id`
- [ ] **PERS-04**: Nutzer kann historische Schätzung in Read-Only-Ansicht öffnen (Dashboard-Layout, alle Werte aus persistiertem `result` ohne Re-Compute)
- [ ] **PERS-05**: Nutzer kann Schätzung aus dem Verlauf löschen (Bestätigungs-Dialog)
- [ ] **PERS-06**: Verlauf zeigt Liste aller Schätzungen mit Spalten: Datum, Name, Projekttyp, PERT (PT), Erstellt von
- [ ] **PERS-07**: Verlauf bietet Suche nach Projektname (case-insensitive substring)
- [ ] **PERS-08**: Verlauf bietet Filter nach Projekttyp (Multi-Select)
- [ ] **PERS-09**: Verlauf bietet Sortierung nach Datum / Name / PERT-PT (auf- und absteigend)
- [ ] **PERS-10**: Nutzer kann Schätzung als CSV exportieren (Parameter + Ergebnis-Zeilen, `de_DE`-kompatibel mit Semikolon-Trennzeichen)

### Admin-Bereich `/admin`

- [ ] **ADMIN-01**: `/admin` bietet strukturierten Editor für Basisgewichte (5 Parameter × 4 Komplexitäts-Stufen = 20 Decimal-Felder)
- [ ] **ADMIN-02**: `/admin` bietet strukturierten Editor für die 4 Korrekturfaktor-Tabellen + Projekttyp-Faktoren (alle 5 Stufen × 4 Kategorien + 4 Projekttyp-Werte)
- [ ] **ADMIN-03**: `/admin` bietet Editor für PERT-Multiplikatoren (Optimistisch-Multiplikator, Pessimistisch-Multiplikator)
- [ ] **ADMIN-04**: `/admin` bietet Editor für Phasenverteilung — Live-Indikator "Summe: x / 100" sperrt Speichern, wenn Summe ≠ 100.00
- [ ] **ADMIN-05**: `/admin` bietet Editor für Languages-Kurve, Roles-Faktoren, User-Range-Faktoren
- [ ] **ADMIN-06**: `/admin` bietet Textarea für Methodik-Boilerplate (`methodik.txt`)
- [ ] **ADMIN-07**: `/admin` bietet Textarea für Haftungsausschluss-Text
- [ ] **ADMIN-08**: `/admin` bietet "Reset auf Defaults"-Button mit Bestätigungs-Dialog — setzt alle Werte aus dem ausgelieferten `weights.default.json` zurück
- [ ] **ADMIN-09**: Admin-Speichern validiert das gesamte Schema vor Schreiben; bei Fehler bleibt die alte Datei intakt
- [ ] **ADMIN-10**: Admin-Schreibvorgang ist atomic (tempfile → fsync → `os.replace`) und durch `fcntl.flock` LOCK_EX|LOCK_NB geschützt; konkurrierende Schreibversuche liefern 409
- [ ] **ADMIN-11**: Beim Speichern wird die In-Memory-Cache-Invalidierung (mtime-basiert) ausgelöst; nachfolgende Schätzungs-Requests pinnen ihren `WeightsSnapshot` beim Request-Eintritt
- [ ] **ADMIN-12**: `methodik.txt` wird mit fachlich validiertem Default-Inhalt ausgeliefert (Verfahren, Formel, Korrekturfaktoren, Phasenmodell, Annahmen-Disclaimer, Gewährleistungsklausel, Gültigkeit)

### Infrastruktur & Deployment

- [ ] **INFRA-01**: `docker compose up` startet alle Services ohne weitere manuelle Schritte
- [ ] **INFRA-02**: Backend-Image basiert auf `python:3.12-slim-bookworm` und installiert WeasyPrint-Systemdeps (`libpango-1.0-0`, `libpangoft2-1.0-0`, `libharfbuzz-subset0`, `fontconfig`, `fonts-dejavu`, `fonts-liberation`)
- [ ] **INFRA-03**: Frontend-Image baut Vite-SPA und serviert sie via nginx; nginx reverse-proxied `/api/*` zum Backend-Container über das Docker-Netzwerk
- [ ] **INFRA-04**: Backend-Port (8000) ist NICHT auf den Host gemapped; einziger exposed Port ist Frontend `:3000`
- [ ] **INFRA-05**: Backend liest `DATABASE_URL` aus Env; Default `sqlite:///./data/estimates.db`; kein hardcoded Pfad oder hardcoded Schema-Annahme
- [ ] **INFRA-06**: Persistente Bind-Mounts für `./data` (DB) und `./config` (`weights.json`, `methodik.txt`)
- [ ] **INFRA-07**: Backend bietet `/api/health`-Endpoint; docker-compose `depends_on` mit `condition: service_healthy` für Frontend
- [ ] **INFRA-08**: Build-Zeit-Smoketest im Backend-Image: `HTML(string='<p>äöü</p>').write_pdf(...)` muss erfolgreich erzeugen — verhindert Tofu-Box-Regression vor Deploy
- [ ] **INFRA-09**: Alembic-Migrationen ab Phase 3 in Versionskontrolle; SQLite und PostgreSQL beide unterstützt durch Decimal `TypeDecorator`
- [ ] **INFRA-10**: README dokumentiert: First-Run-Setup, Backup von `./data` + `./config`, Migration auf PostgreSQL via `DATABASE_URL`, Reset-Pfad

### Querschnitt (Tech & Qualität)

- [ ] **TECH-01**: Backend hat strikte Schicht-Trennung: `engine/` (pure functions, keine I/O-Imports), `services/` (Workflows), `routers/` (HTTP), `models/` (SQLAlchemy), `schemas/` (Pydantic) — durchgesetzt via Import-Linting
- [ ] **TECH-02**: Pydantic v2 mit Type-Aliasen `MoneyDecimal` und `PTDecimal` (mit `@field_serializer` für JSON-Stringifizierung); Frontend behandelt Decimal-Felder als Strings
- [ ] **TECH-03**: SQLAlchemy 2.0 sync mit `Mapped[]`-Style; Decimal-Spalten via `TypeDecorator` (TEXT auf SQLite, native `NUMERIC` auf PostgreSQL)
- [ ] **TECH-04**: Frontend-Formular nutzt `react-hook-form` + `zod`; Zod-Schemas spiegeln Pydantic-Schemas für identische Validierung auf beiden Seiten
- [ ] **TECH-05**: Backend-Tests decken Engine ≥ 95 %, Snapshot-Reproduzierbarkeit (regression test), Atomic-write + Validation der `weights.json`, Phasen-Summe-Validator
- [ ] **TECH-06**: Frontend-Tests (Vitest) decken Formular-Validierung, Decimal-Roundtrip, Datums-/Währungsformatierung in `de_DE`
- [ ] **TECH-07**: Keine externen Netzwerk-Requests zur Laufzeit (kein CDN, kein Telemetry, keine Analytics); CI-Check verifiziert via `package.json`-Audit und Offline-Mode-Smoketest
- [ ] **TECH-08**: Alle UI-Labels, Validierungs-Meldungen, Scope-Texte, Risikohinweise und PDF-Inhalte ausschließlich auf Deutsch
- [ ] **TECH-09**: Code, Variablen-Namen, Commit-Messages auf Englisch
- [ ] **TECH-10**: Auth-Readiness-Seam: `user_id INTEGER NULL` Spalte in `estimates`, `get_current_user_optional()` Dependency-Stub (returns None in v1); spätere Auth-Erweiterung ist rein additiv

## v2 Requirements

Anerkannte Erweiterungen für nächstes Release, nicht in v1-Roadmap.

### Diff & Vergleich

- **V2-DIFF-01**: Side-by-side Diff-View zwischen zwei Schätzungen (nutzt `parent_estimate_id` aus v1-Schema)
- **V2-DIFF-02**: Highlight veränderter Parameter und Faktoren zwischen Original und Klon

### Sensitivität & Visualisierung

- **V2-SENS-01**: Tornado-Chart: Auswirkung jedes Korrekturfaktors auf das PERT-Ergebnis
- **V2-SENS-02**: Confidence-Band-SVG (P50/P80/P90 als visueller Balken)
- **V2-SENS-03**: "Was wäre wenn"-Slider auf dem Dashboard

### Templates & Wiederverwendbarkeit

- **V2-TMPL-01**: Projekt-Templates je Projekttyp (z. B. "Migration CRUD App") mit vorbefüllten Parameter-Bereichen
- **V2-TMPL-02**: Speichern eigener Templates aus bestehenden Schätzungen

### Export-Erweiterung

- **V2-XPORT-01**: XLSX-Export mit mehreren Tabellenblättern (Übersicht, Parameter, Phasen, Annahmen)
- **V2-XPORT-02**: Draft / Final Status-Flag mit Wasserzeichen auf "Draft"-PDFs

### Multi-User & Auth

- **V2-AUTH-01**: Login mit Benutzername/Passwort (Hash-Verfahren: bcrypt/argon2)
- **V2-AUTH-02**: Rollen-System (Berater / Admin)
- **V2-AUTH-03**: Geschützter `/admin`-Bereich (nur Admin-Rolle)
- **V2-AUTH-04**: Benutzer-Filter im Verlauf (eigene vs. alle Schätzungen)

## Out of Scope

Explizit ausgeschlossen. Dokumentiert, um Scope-Creep zu verhindern.

| Feature | Reason |
|---------|--------|
| Authentifizierung in v1 | Einzelnutzer-lokal; Architektur via `user_id NULL` und `get_current_user_optional()` bereits auth-ready, deshalb in v2 ohne Migration ergänzbar |
| Admin-Schutz (Login/Passwort) in v1 | Lokaler Single-User; gleicher Auth-Stack wird in v2 mitgezogen |
| Editieren bestehender Schätzungen | Clone-only ist die Kern-Audit-Trail-Garantie; Edit würde Reproduzierbarkeit aushöhlen |
| Versionshistorie pro Schätzung | Durch Clone-only-Modell überflüssig; jeder Klon ist die "neue Version" |
| Import / Export von `weights.json` via UI | v1 nutzt nur strukturierten Editor + Reset; Datei-Austausch via Filesystem-Volume möglich |
| Phasenspezifische Tagessätze | v1 = ein einheitlicher €/PT-Satz; Differenzierung erst bei klar gemessenem Bedarf |
| Mehrsprachigkeit der UI | v1 ausschließlich Deutsch; andere Sprachen ergeben in Zielgruppe keinen Mehrwert |
| Versionsverwaltung der Admin-Gewichts-Änderungen | Snapshot-pro-Schätzung löst Reproduzierbarkeit; separates Audit-Log überflüssig |
| Multi-Währung / FX | Einzelmarkt-Tool; Komplexität verzerrt UI |
| Real-time Collaboration / WebSockets | Single-User-Tool; keine Notwendigkeit |
| Monte-Carlo-Simulation | PERT analytisch + P50/P80/P90 ist mathematisch äquivalent auf dieser Granularität; Monte Carlo = "false sophistication" |
| AI-/LLM-Vorschläge für Parameter | Verletzt Lokal-first (kein externer Service) und Reproduzierbarkeit (Modell-Drift) |
| Jira / ADO / Excel Re-Import von Schätzungen | Kills Audit-Trail; jede Schätzung muss eindeutig im Tool entstehen |
| COCOMO II / Function Points / UCP als Parallel-Methoden | Methoden-Cross-Validation = "false sophistication" auf v1-Granularität; Hausmethodik PERT genügt |
| Wideband Delphi / Story Points | Andere Methodik-Familie; nicht im Hausmethodik-Korridor |
| Share-via-Link / öffentliche Schätzungs-URLs | Sicherheitsrisiko bei späterer Multi-User-Erweiterung; PDF-Versand bleibt der Kanal |
| Gantt-Chart / Termin-Planung | Schätzung ≠ Planung; Tool-Scope bleibt auf Aufwandsschätzung |
| Logo-Upload / Branding | Default ist neutrales Layout; v3-Polish-Thema |
| Kalibrierung mit Ist-Daten | Braucht ≥ 20 abgeschlossene Projekte als Datenbasis; v3+-Thema |
| Cloud-Auto-Deploy (Fly.io, Cloud Run) | Lokal-first ist primärer Use Case; Architektur bleibt cloud-fähig, Deploy-Pipeline ist Folgeprojekt |
| PDF/A-Archivierungs-Konformität | Embedded Fonts + sRGB-Color-Profile + kein external Asset sind ohnehin Pflicht — formelle PDF/A-Validierung erst bei expliziter Kunden-Anforderung |

## Traceability

Welche Phasen welche Requirements abdecken — befüllt durch Roadmapper am 2026-05-16.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 2 | Pending |
| INPUT-02 | Phase 2 | Pending |
| INPUT-03 | Phase 2 | Pending |
| INPUT-04 | Phase 2 | Pending |
| INPUT-05 | Phase 2 | Pending |
| INPUT-06 | Phase 2 | Pending |
| INPUT-07 | Phase 2 | Pending |
| INPUT-08 | Phase 2 | Pending |
| PARAM-01 | Phase 2 | Pending |
| PARAM-02 | Phase 2 | Pending |
| PARAM-03 | Phase 2 | Pending |
| PARAM-04 | Phase 2 | Pending |
| PARAM-05 | Phase 2 | Pending |
| PARAM-06 | Phase 2 | Pending |
| PARAM-07 | Phase 2 | Pending |
| PARAM-08 | Phase 2 | Pending |
| FACT-01 | Phase 2 | Pending |
| FACT-02 | Phase 2 | Pending |
| FACT-03 | Phase 2 | Pending |
| FACT-04 | Phase 2 | Pending |
| TEXT-01 | Phase 2 | Pending |
| TEXT-02 | Phase 2 | Pending |
| CALC-01 | Phase 2 | Pending |
| CALC-02 | Phase 2 | Pending |
| CALC-03 | Phase 2 | Pending |
| CALC-04 | Phase 2 | Pending |
| CALC-05 | Phase 2 | Pending |
| CALC-06 | Phase 2 | Pending |
| CALC-07 | Phase 2 | Pending |
| REPRO-01 | Phase 2 | Pending |
| REPRO-02 | Phase 3 | Pending |
| REPRO-03 | Phase 3 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |
| DASH-07 | Phase 2 | Pending |
| DASH-08 | Phase 2 | Pending |
| DASH-09 | Phase 2 | Pending |
| DASH-10 | Phase 2 | Pending |
| PDF-01 | Phase 4 | Pending |
| PDF-02 | Phase 4 | Pending |
| PDF-03 | Phase 4 | Pending |
| PDF-04 | Phase 4 | Pending |
| PDF-05 | Phase 4 | Pending |
| PDF-06 | Phase 4 | Pending |
| PDF-07 | Phase 4 | Pending |
| PDF-08 | Phase 4 | Pending |
| PDF-09 | Phase 4 | Pending |
| PDF-10 | Phase 4 | Pending |
| PDF-11 | Phase 4 | Pending |
| PDF-12 | Phase 4 | Pending |
| PDF-13 | Phase 4 | Pending |
| PERS-01 | Phase 3 | Pending |
| PERS-02 | Phase 3 | Pending |
| PERS-03 | Phase 3 | Pending |
| PERS-04 | Phase 3 | Pending |
| PERS-05 | Phase 3 | Pending |
| PERS-06 | Phase 3 | Pending |
| PERS-07 | Phase 3 | Pending |
| PERS-08 | Phase 3 | Pending |
| PERS-09 | Phase 3 | Pending |
| PERS-10 | Phase 3 | Pending |
| ADMIN-01 | Phase 5 | Pending |
| ADMIN-02 | Phase 5 | Pending |
| ADMIN-03 | Phase 5 | Pending |
| ADMIN-04 | Phase 5 | Pending |
| ADMIN-05 | Phase 5 | Pending |
| ADMIN-06 | Phase 5 | Pending |
| ADMIN-07 | Phase 5 | Pending |
| ADMIN-08 | Phase 5 | Pending |
| ADMIN-09 | Phase 5 | Pending |
| ADMIN-10 | Phase 5 | Pending |
| ADMIN-11 | Phase 5 | Pending |
| ADMIN-12 | Phase 5 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 4 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 1 | Pending |
| INFRA-08 | Phase 4 | Pending |
| INFRA-09 | Phase 3 | Pending |
| INFRA-10 | Phase 4 | Pending |
| TECH-01 | Phase 2 | Pending |
| TECH-02 | Phase 2 | Pending |
| TECH-03 | Phase 3 | Pending |
| TECH-04 | Phase 2 | Pending |
| TECH-05 | Phase 3 | Pending |
| TECH-06 | Phase 5 | Pending |
| TECH-07 | Phase 4 | Pending |
| TECH-08 | Phase 2 | Pending |
| TECH-09 | Phase 2 | Pending |
| TECH-10 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 97 total (8 INPUT + 8 PARAM + 4 FACT + 2 TEXT + 7 CALC + 3 REPRO + 10 DASH + 13 PDF + 10 PERS + 12 ADMIN + 10 INFRA + 10 TECH)
- Mapped to phases: 97 ✓
- Unmapped: 0 ✓

**Per-phase counts:**
- Phase 1 (Skeleton Slice): 6 requirements
- Phase 2 (Engine & Form): 45 requirements
- Phase 3 (Persistence & History): 16 requirements
- Phase 4 (PDF Export): 17 requirements
- Phase 5 (Admin Configuration): 13 requirements
- Total: 97 ✓

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-16 after roadmap creation — Traceability table populated, header count corrected from 95 to 97 (8+8+4+2+7+3+10+13+10+12+10+10)*
