# Software Estimation Manager

## What This Is

Lokale Web-App für IT-Management-Berater und IT-Projektmanager zur strukturierten Aufwandsschätzung von Software-Projekten in Person-Tagen (PT). Nutzer geben Projekt-Parameter (Pages, Use Cases, Business Objects, Interfaces, Batches mit Komplexitäts-Einstufungen) und globale Korrekturfaktoren ein; das Tool berechnet eine deterministische PERT-Schätzung mit Phasenverteilung und erzeugt einen strukturierten PDF-Bericht. Deployment via `docker-compose up` — lokal-first, cloud-ready.

## Core Value

**Reproduzierbare, nachvollziehbare PT-Schätzungen mit Snapshot der verwendeten Gewichte je Schätzung** — wenn alles andere wegfällt, muss eine eingegebene Parameter-Kombination zu einer korrekten, dokumentierten und als PDF exportierbaren Schätzung führen, die auch nach Änderung der Gewichte unverändert reproduzierbar bleibt.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Eingabe & Validierung**

- [ ] Projekt-Stammdaten erfassen: Projektname, Projektskizze (Textarea max 600 Zeichen), Projekttyp (Neuentwicklung / Erweiterung / Migration / Legacy-Migration)
- [ ] Parameter-Tabelle erfassen: für Pages, Use Cases, Business Objects, Interfaces, Batches jeweils Anzahl + Komplexität (low / medium / high / very high)
- [ ] Languages (1–10) und Roles (1–30) als numerische Eingaben mit Bereichsvalidierung
- [ ] Concurrent Users als 5-stufiger Range-Dropdown (<50 / 50–200 / 201–1000 / 1001–10000 / >10000)
- [ ] Vier globale Korrekturfaktoren als 5-stufige Dropdowns (sehr günstig bis sehr ungünstig): Technologie-Reife, Team-Erfahrung, Qualität/Compliance, Dokumentationspflicht
- [ ] Tagessatz (€/PT) pro Schätzung erfassen für €-Ausweis
- [ ] "Erstellt von"-Feld pro Schätzung manuell eingebbar, vorbefüllt mit letztem genutzten Wert

**Schätzlogik**

- [ ] Basisgewichte aus `weights.json` laden (deterministisch, konfigurierbar)
- [ ] Standardformel: ML = (Pages × LangFaktor + UseCases + BusinessObjects + Interfaces + Batches) × RolesFaktor × UserFaktor × Tech × Team × Quality × Doc × ProjectType
- [ ] PERT-Berechnung: Optimistisch = ML × 0.75, Pessimistisch = ML × 1.55, PERT = (O + 4M + P)/6, Standardabweichung = (P − O)/6
- [ ] Phasenverteilung auf Most_Likely: Anforderungen 12% / Architektur 15% / Implementierung 42% / Test 18% / Deployment 5% / PM 8%

**Output (Web)**

- [ ] Ergebnis-Dashboard: PERT-Übersicht (O/M/P/PERT), Phasen-Tabelle, Parameter-Zusammenfassung, aktive Korrekturfaktoren
- [ ] Generierter Scope-Text in Deutsch: Projektzusammenfassung, Umfang, Aufwand, Annahmen
- [ ] Risikohinweis im Scope-Text, sobald irgendein Korrekturfaktor > 1.15

**PDF-Export**

- [ ] WeasyPrint-basierter PDF-Bericht mit Deckblatt (Projektname, Datum, Erstellt von), Scope-Beschreibung, Parameter-Tabelle, Aufwandsschätzung (PERT + Phasen), Annahmen und Korrekturfaktoren, Methodik-Boilerplate
- [ ] €-Ausweis im PDF (PT × Tagessatz, gesamt und pro Phase)

**Persistierung & Verlauf**

- [ ] SQLAlchemy-basierte Speicherung jeder Schätzung (id, name, timestamp, alle Parameter als JSON, Ergebnis-PT)
- [ ] **Snapshot der verwendeten Gewichte pro Schätzung** — gespeicherte Schätzungen sind reproduzierbar, auch nachdem Admin globale Gewichte ändert
- [ ] Schätzungen sind **clone-only / immutable** — geänderte Schätzungen entstehen ausschließlich als neue Einträge per Klon
- [ ] Verlaufsansicht: Liste aller Schätzungen mit Löschen, Suche nach Projektname, Filter nach Projekttyp, Sortierung (Datum/Name/PT)
- [ ] Schätzung wieder öffnen (read-only View) und als Basis für neue Schätzung klonen

**Admin-Bereich (`/admin`)**

- [ ] Gewichtungstabelle (Basisgewichte) editierbar via strukturiertem Formular
- [ ] Korrekturfaktoren (alle 5 Stufen × 4 Kategorien + Projekttyp) editierbar
- [ ] PERT-Faktoren (0.75 / 1.55) editierbar
- [ ] Methodik-Boilerplate-Text editierbar
- [ ] Reset auf Defaults

**Infrastruktur**

- [ ] React + Vite + Tailwind Frontend (Port 3000)
- [ ] FastAPI Backend (Port 8000), stateless
- [ ] SQLAlchemy mit `DATABASE_URL` env var (default `sqlite:///./data/estimates.db`, cloud-ready für PostgreSQL)
- [ ] `docker-compose up` startet beide Services
- [ ] Persistente Volumes für `data/` (DB) und `config/` (weights.json, methodik.txt)

### Out of Scope

- **Authentifizierung / Multi-User** — v1 ist Einzelnutzer-lokal; Architektur muss Auth jedoch nachrüstbar halten (siehe Constraints), daher z. B. nullable `user_id`-Spalten und keine Single-User-Annahmen in Datenmodell/Routes
- **Admin-Schutz (Login/Passwort)** — v1 ohne Schutz, weil Einzelnutzer-lokal; bei späterer Multi-User-Erweiterung wird voller Auth-Stack nachgezogen
- **Editieren bestehender Schätzungen** — bewusst clone-only, um Audit-Trail kostenlos zu erhalten
- **Versionshistorie pro Schätzung** — durch clone-only-Modell überflüssig
- **Import/Export von `weights.json` via UI** — v1 nur direkter UI-Editor + Reset; Datei-basierter Austausch via Admin auf Filesystem-Ebene möglich
- **Phasenspezifische Tagessätze** — v1 ein einheitlicher €/PT-Satz pro Schätzung; Architekt vs. Entwickler-Differenzierung erst bei Bedarf
- **Mehrsprachigkeit der UI** — v1 ausschließlich Deutsch (Labels, Outputs, PDF); andere Sprachen explizit ausgeschlossen
- **Versionsverwaltung der Gewichte (Audit-Log der Admin-Änderungen)** — durch Snapshot-pro-Schätzung bereits gelöst; separates Admin-Audit-Log überflüssig
- **Cost-Reporting jenseits €/PT × PT** — v1 zeigt nur Tagessatz-basiertes €; keine Stundensätze, keine Mehrwährungen, kein Forex
- **Real-time Collaboration / WebSockets** — Single-User, keine Notwendigkeit

## Context

- **Zielgruppe**: IT-Management-Berater und IT-Projektmanager. UI muss professionell und klar strukturiert wirken; keine spielerischen Elemente, keine Gamification, keine Animationen ohne Zweck.
- **Sprache**: Durchgängig Deutsch — Labels, Validierungs-Hinweise, Scope-Texte, Risikohinweise, PDF-Inhalt. Code, Variablennamen, Commits in Englisch (industry standard).
- **Estimation-Domäne**: PERT-basierte Schätzung mit Komplexitäts-gewichteten Parametern ist gängige Praxis im IT-Consulting; das Tool kodifiziert eine konkrete Hausmethodik. Gewichte sind ausdrücklich konfigurierbar, damit verschiedene Beratungs-Häuser oder Methodik-Versionen abgebildet werden können.
- **Lokal-first**: Primärer Use Case ist `docker-compose up` auf dem Berater-Laptop. Kein Cloud-Login, kein Telemetry-Backchannel.
- **Cloud-ready**: Backend ist stateless, einzig veränderlicher State liegt in DB (via `DATABASE_URL`) und Config-Volume (`weights.json`, `methodik.txt`). Migration zu PostgreSQL ist explizites Ziel — keine SQLite-spezifischen Features verwenden, die in Postgres fehlen.
- **Frontend stack rationale**: React + Vite + Tailwind ist 2026 der pragmatische Default für lokale Tools — schneller Dev-Loop, kein SSR nötig, gutes Component-Ökosystem für Forms/Tables/Dashboards.
- **PDF stack rationale**: WeasyPrint (HTML + CSS → PDF) erlaubt Reuse der Web-Templates und sauberes Typografie-Handling für Geschäftsdokumente; ReportLab wurde implizit verworfen wegen höherem Boilerplate.

## Constraints

- **Tech stack**: React + Vite + Tailwind (Frontend), FastAPI (Backend), SQLAlchemy + SQLite default, WeasyPrint (PDF), Docker Compose — vom Nutzer vorgegeben, nicht verhandelbar
- **Sprache UI/Outputs**: Deutsch — Zielgruppe und Geschäftskontext erfordern es
- **Sprache Code**: Englisch — Standardpraxis, keine deutschen Bezeichner in Code
- **Deployment**: Muss mit einem `docker-compose up` startbar sein — kein manueller Setup-Schritt
- **Stateless Backend**: Kein In-Memory-State zwischen Requests; jeder relevante State in DB oder Config-Volume — Cloud-Migrations-Voraussetzung
- **Daten-Schema**: Tabellen so designen, dass nachträgliches Hinzufügen von `user_id` (nullable FK) kein Breaking Change wird — Auth-Erweiterbarkeit
- **Reproduzierbarkeit**: Gespeicherte Schätzungen sind unveränderlich; deren Berechnungsergebnis darf sich nicht ändern, auch wenn globale Gewichte angepasst werden — Snapshot der Gewichte pro Schätzung ist hart erforderlich
- **PDF-Qualität**: Berater geben das PDF an Kunden weiter — Layout muss professionell sein, keine Default-WeasyPrint-Optik ohne CSS-Polish
- **No external services**: v1 darf keine externen APIs / Cloud-Services aufrufen (Telemetry, Analytics, Auth-Provider) — verletzt Lokal-first-Annahme
- **Performance**: Schätzung berechnen + Dashboard rendern < 1s; PDF generieren < 5s auf Standard-Berater-Laptop (8GB RAM, M-Serie / Intel i5)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Einzelnutzer-lokal in v1, Multi-User nachrüstbar | Einfacher Scope für v1; Architektur (nullable user_id, stateless backend, env-driven DB) lässt Auth später nachziehen | — Pending |
| Clone-only Schätzungen (immutable) | Audit-Trail gratis, keine Versionsverwaltung pro Schätzung nötig, einfacheres mentales Modell | — Pending |
| Snapshot der Gewichte pro Schätzung | Reproduzierbarkeit auch nach Admin-Änderung; löst gleichzeitig "wie ändere ich Gewichte ohne alte Schätzungen zu brechen" | — Pending |
| Languages-Faktor wirkt nur auf Pages, alle anderen Faktoren multiplikativ aufs Gesamt | Vom Nutzer explizit gewählte Standardformel | — Pending |
| Risikohinweis wenn EIN Faktor > 1.15 | Sensitiv genug um echte Risiken zu zeigen, nicht Spam-Pegel | — Pending |
| Concurrent Users als Range-Dropdown statt Zahl | User-Faktor basiert ohnehin auf Ranges; Eingabe = Berechnung 1:1, weniger Abstimmungsfehler | — Pending |
| PT + Tagessatz → € im PDF (single rate) | Sichtbarer Mehrwert für Berater ohne Phasen-Differenzierungs-Komplexität | — Pending |
| WeasyPrint für PDF | HTML/CSS-Reuse von Web-Templates; Standardweg für Geschäftsdokumente in Python | — Pending |
| `weights.json` als Persistenz für Gewichte (statt DB-Tabelle) | Konfigurierbarkeit + Versionierbarkeit via Filesystem; Admin-Reset trivial | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 after initialization*
