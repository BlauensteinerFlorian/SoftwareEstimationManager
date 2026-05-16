# Roadmap: Software Estimation Manager

## Overview

Lokale Web-App für deterministische PT/PERT-Schätzungen mit reproduzierbaren Snapshots und WeasyPrint-PDF — Build als vertikaler Slice in 5 Phasen: zuerst die Spine (docker-compose + nginx + minimal round-trip) beweisen, dann die Engine vertiefen, persistieren, exportieren, und zuletzt die Admin-Schreibfläche. Reihenfolge ist forschungsbasiert (vgl. research/SUMMARY.md): Engine-Korrektheit und Schema-Form werden vor Persistenz gefroren, Persistenz vor PDF, PDF vor Admin — weil Reproduzierbarkeit und Snapshot-Vollständigkeit (Core Value) rückwirkend nicht retrofittable sind ohne Migrationsschmerz.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Skeleton Slice** - docker-compose + nginx reverse-proxy + minimaler FastAPI/React-Round-Trip, der eine einzelne berechnete Zahl ausliefert (die Spine)
- [ ] **Phase 2: Engine & Form** - reine PERT-Engine mit Decimal-end-to-end, vollständiger Eingabe-Form, WeightsSnapshot-Modell, Dashboard mit PERT + P50/P80/P90 + Phasen + Risikohinweis (in-memory, ohne DB)
- [ ] **Phase 3: Persistence & History** - SQLAlchemy 2.0 + Decimal-TypeDecorator + Alembic; drei JSON-Spalten (`inputs`, `weights_snapshot`, `result`); voller Verlauf mit Suche/Filter/Sort/Klonen/CSV; Reproduzierbarkeits-Regressionstest
- [ ] **Phase 4: PDF Export** - WeasyPrint mit Pango/Cairo/Font-System-Deps, Jinja2-Templates, deutsches Format via Babel, Deckblatt + Seitenzahlen + Methodik + Haftungsausschluss, Build-Zeit-Smoketest
- [ ] **Phase 5: Admin Configuration** - atomic-write `weights.json` mit flock + Pydantic-Validierung + mtime-Cache-Invalidierung, alle Editoren (Gewichte, Faktoren, PERT-Multiplikatoren, Phasen, Methodik, Haftungsausschluss), Reset, Live-"Summe 100"-Indikator

## Phase Details

### Phase 1: Skeleton Slice
**Goal**: Beweise die docker-compose-Topologie, nginx-Reverse-Proxy, das Request/Response-Vertragsmuster und die Deployment-Story end-to-end — `docker compose up` bootet zwei Services, der Browser POSTet via `/api/*` durch nginx an FastAPI und bekommt eine berechnete Zahl zurück
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. Nutzer führt `docker compose up` aus und ohne weitere manuelle Schritte starten Frontend + Backend; nur Port 3000 ist auf dem Host exponiert, Port 8000 nicht
  2. Nutzer öffnet http://localhost:3000 im Browser, sendet via Eingabe-Form einen POST an `/api/estimates` (nginx reverse-proxied zu `backend:8000`), und sieht eine vom Backend berechnete Zahl gerendert — Same-Origin, kein CORS-Setup
  3. `./data` und `./config` sind als Bind-Mounts persistent über Container-Neustarts; `DATABASE_URL` wird aus Env gelesen mit SQLite-Default
  4. `/api/health` antwortet 200; docker-compose `depends_on` mit `condition: service_healthy` blockiert Frontend-Startup bis Backend bereit ist
**Plans**: TBD

### Phase 2: Engine & Form
**Goal**: Engine-Korrektheit und Schema-Form vor Persistenz festfrieren — vollständige PERT-Engine als pure Funktion mit Decimal end-to-end, `WeightsSnapshot` als Single Source of Truth, vollständige Eingabe-Form mit allen Parametern und Faktoren, Dashboard mit PERT + P50/P80/P90 + Phasen + Risikohinweis + Scope-Text auf Deutsch — alles in-memory ohne DB
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-06, INPUT-07, INPUT-08, PARAM-01, PARAM-02, PARAM-03, PARAM-04, PARAM-05, PARAM-06, PARAM-07, PARAM-08, FACT-01, FACT-02, FACT-03, FACT-04, TEXT-01, TEXT-02, CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, REPRO-01, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, TECH-01, TECH-02, TECH-04, TECH-08, TECH-09
**Success Criteria** (what must be TRUE):
  1. Nutzer füllt das vollständige Schätz-Formular aus (Stammdaten + 5 Parameter mit Komplexität + Languages/Roles/User-Range + 4 Korrekturfaktoren mit Pflicht-Auswahl ohne Default + Tagessatz + Annahmen + Ausschlüsse), klickt "Berechnen" und das Dashboard rendert in unter 1 s mit PERT-Übersicht (O/M/P/PERT/σ), Konfidenz-Zeile (P50/P80/P90), Phasen-Tabelle mit PT und €, deutscher Lokalisierung (`1.234,56 €`, `31.12.2026`) und generiertem Scope-Text auf Deutsch
  2. Sobald irgendein globaler Korrekturfaktor > 1.15 ist, erscheint im Dashboard und im Scope-Text ein Risikohinweis mit Verweis auf den konkreten Faktor
  3. Regressionstest grün: identische Inputs + identischer `WeightsSnapshot` liefern bit-identische Ergebnisse über zwei Aufrufe (Engine ist deterministisch pur, kein I/O, kein globaler State); CI-Linter verbietet `engine/`-Imports aus `models/`, `db/`, `schemas/`, FastAPI
  4. Decimal-Präzisions-Test grün: 7-fache Faktor-Multiplikation produziert kein Float-Drift; alle Decimal-Felder werden im API-JSON als Strings serialisiert; Frontend formatiert via `Intl.NumberFormat('de-DE')` ohne Parse-zu-Number
  5. Pro Request wird ein vollständiger `WeightsSnapshot` (Basisgewichte + alle 5 Faktor-Tabellen + PERT-Multiplikatoren + Phasenverteilung + Languages-Kurve + User-Range + Roles) konstruiert und mit dem Result an den Client zurückgegeben — Snapshot-Vollständigkeit ist provable durch die Engine-Signatur `calculate(inputs, snapshot)`
**Plans**: TBD
**UI hint**: yes

### Phase 3: Persistence & History
**Goal**: Sobald Engine und Schema stehen, ist Persistenz eine dünne Schicht darüber — `Estimate`-Modell mit drei JSON-Spalten (`inputs`, `weights_snapshot`, `result`), `parent_estimate_id` und nullable `user_id` von Tag 1, voller Verlauf mit Suche/Filter/Sort/Löschen/Klonen, CSV-Export, kritischer Reproduzierbarkeits-Regressionstest
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, PERS-05, PERS-06, PERS-07, PERS-08, PERS-09, PERS-10, REPRO-02, REPRO-03, TECH-03, TECH-05, TECH-10, INFRA-09
**Success Criteria** (what must be TRUE):
  1. Nutzer berechnet eine Schätzung, Container wird neugestartet, die Schätzung ist im Verlauf weiterhin sichtbar mit korrekter PT-Zahl, deutschem Datum und vollständigen Metadaten (Name, Projekttyp, Erstellt von)
  2. Nutzer kloned eine Schätzung — die neue Schätzung trägt `parent_estimate_id` auf den Quell-Datensatz und der Klon kann unabhängig editiert/neu-berechnet werden, ohne die Quell-Schätzung zu mutieren (clone-only / immutable)
  3. Kritischer Reproduzierbarkeits-Regressionstest grün: speichere Schätzung → mutiere `weights.json` direkt auf der Disk → öffne die Schätzung erneut → `result` ist UNVERÄNDERT; analog für `calculate(stored.inputs, stored.weights_snapshot) == stored.result` über alle persistierten Schätzungen
  4. SQLite/PostgreSQL Decimal-Round-Trip-Test grün: Decimal-Spalten werden via `TypeDecorator` als TEXT in SQLite und nativ `NUMERIC` in PostgreSQL gespeichert; Round-Trip-Equality verifiziert auf beiden DBs; Alembic-Baseline-Migration ist in Versionskontrolle
  5. Verlauf zeigt alle Schätzungen mit Suche nach Projektname (case-insensitive substring), Multi-Select-Filter nach Projekttyp, Sortierung nach Datum/Name/PERT-PT (auf/ab); Nutzer kann CSV exportieren mit Semikolon-Trennzeichen und `de_DE`-Zahlenformat; `user_id NULL` Spalte und `get_current_user_optional()` Stub sind vorhanden (Auth-Readiness-Seam) ohne v1-Funktionalität
**Plans**: TBD
**UI hint**: yes

### Phase 4: PDF Export
**Goal**: WeasyPrint mit allen Pango/Cairo/Font-System-Deps im Backend-Image, Jinja2-Templates und handgeschriebenes Print-CSS, deutsche Lokalisierung via Babel `locale='de_DE'`, professionelles Deckblatt mit Kundenmetadaten, Seitenzahlen + Fußzeile + Haftungsausschluss, Default-`methodik.txt` mit fachlich validiertem Inhalt, Build-Zeit-Smoketest gegen Tofu-Box-Regression
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07, PDF-08, PDF-09, PDF-10, PDF-11, PDF-12, PDF-13, INFRA-02, INFRA-08, INFRA-10, TECH-07
**Success Criteria** (what must be TRUE):
  1. Nutzer klickt im Dashboard auf "Als PDF" und bekommt innerhalb von 5 s ein PDF-Download mit Deckblatt (Projektname, `client_name`, `project_id`, Datum, `valid_until`, Erstellt von), Scope-Beschreibung (Zusammenfassung + Umfang + Annahmen-Block + Ausschlüsse-Block + Risikohinweise), Parameter-Tabelle, Aufwandsschätzung (PERT + P50/P80/P90 + Phasen mit PT und €), aktiven Korrekturfaktoren, Methodik-Boilerplate, Haftungsausschluss, Fußzeile mit "Seite x/y" + Projektname + `project_id`
  2. Build-Zeit-Smoketest grün: `HTML(string='<p>äöü</p>').write_pdf(...)` im Backend-Image produziert eine PDF-Datei mit korrekt gerenderten Umlauten (keine Tofu-Boxen) — `fonts-dejavu` + `fonts-liberation` im Image, `libpango-1.0-0`/`libpangoft2-1.0-0`/`libharfbuzz-subset0`/`fontconfig` installiert
  3. PDF rendert in unter 3 s für eine Standard-Schätzung; lange Tabellen brechen sauber über Seiten ohne mid-row-split und mit wiederholtem `thead` auf jeder Seite; Datum/Zahlen/Währung im PDF im deutschen Format (`31.12.2026`, `1.234,56`, `1.234,56 €`)
  4. WeasyPrint läuft mit `url_fetcher=disallow_external` — kein Netzwerk-Request während PDF-Render verifizierbar (Offline-Mode-Smoketest); `package.json`-Audit verifiziert keine CDN- oder Telemetry-Abhängigkeiten zur Laufzeit
  5. Default-`methodik.txt` (Verfahren/Formel/Korrekturfaktoren/Phasenmodell/Annahmen-Disclaimer/Gewährleistungsklausel/Gültigkeit) wird beim First-Run-Boot in `./config/` geseedet wenn fehlend; README dokumentiert First-Run-Setup, Backup, PostgreSQL-Migration und Reset-Pfad
**Plans**: TBD
**UI hint**: yes

### Phase 5: Admin Configuration
**Goal**: Vollständige `/admin`-Schreibfläche für alle konfigurierbaren Knöpfe — Basisgewichte, 4 Korrekturfaktor-Tabellen + Projekttyp, PERT-Multiplikatoren, Phasenverteilung mit Live-"Summe 100"-Indikator, Languages-Kurve / Roles / User-Ranges, Methodik-Text, Haftungsausschluss, Reset-auf-Defaults — atomic-write mit flock + Pydantic-Validierung vor Schreiben + mtime-Cache-Invalidierung + per-Request-Snapshot-Pinning
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, ADMIN-12, TECH-06
**Success Criteria** (what must be TRUE):
  1. Admin editiert ein Basisgewicht in `/admin`, klickt Speichern, der nächste neu erzeugte `Estimate` verwendet den neuen Wert in seiner Berechnung; eine vor der Änderung gespeicherte Schätzung zeigt beim erneuten Öffnen einen UNVERÄNDERTEN `result` — Reproduzierbarkeit über Admin-Änderungen hinweg
  2. Phasenverteilungs-Editor zeigt live "Summe: x / 100" — der Speichern-Button ist gesperrt, wenn Summe ≠ 100.00; der gleiche Validator greift beim Datei-Load (Backend startet nicht mit korrupter `weights.json`)
  3. Schreibvorgang ist atomic (tempfile → fsync → `os.replace`) und durch `fcntl.flock` LOCK_EX|LOCK_NB geschützt — ein zweiter konkurrierender Schreibversuch liefert HTTP 409; die ganze Schreibtransaktion wird Pydantic-validiert bevor `os.replace` stattfindet, eine fehlerhafte Eingabe lässt die alte Datei unverändert
  4. "Reset auf Defaults"-Button mit Bestätigungs-Dialog setzt alle Werte aus dem ausgelieferten `weights.default.json` und `methodik.default.txt` zurück; alle Editor-Felder (Basisgewichte, 4 Korrekturfaktoren × 5 Stufen, Projekttyp, PERT-Multiplikatoren, Phasenverteilung, Languages-Kurve, Roles, User-Ranges, Methodik-Textarea, Haftungsausschluss-Textarea) sind über strukturierte Formulare bedienbar
  5. Frontend-Tests (Vitest) decken Admin-Editor-Flows: live-"Summe 100"-Indikator-Blockade, Decimal-Roundtrip durch Form-Inputs, deutsches Datums-/Währungsformat, 409-Anzeige bei konkurrierendem Save
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Skeleton Slice | 0/TBD | Not started | - |
| 2. Engine & Form | 0/TBD | Not started | - |
| 3. Persistence & History | 0/TBD | Not started | - |
| 4. PDF Export | 0/TBD | Not started | - |
| 5. Admin Configuration | 0/TBD | Not started | - |

---
*Roadmap created: 2026-05-16*
*Coverage: 97/97 v1 requirements mapped — no orphans, no duplicates*
