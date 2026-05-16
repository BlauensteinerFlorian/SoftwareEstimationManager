# Feature Research

**Domain:** Software Effort Estimation Tool (PT/PERT) for IT-Management-Berater (single-user local v1)
**Researched:** 2026-05-16
**Confidence:** MEDIUM-HIGH (commercial-tool feature lists, PMI/AACE practice, German IT-consulting sources triangulated; some "consultant expectation" calls are MEDIUM — flagged inline)

## Executive Orientation

The PROJECT.md spec already covers ~80% of what a competent single-user PT estimation tool needs. The gaps that real consultants will notice are:

1. **No confidence interval on the PERT result** — only O/M/P/PERT shown. P50/P80 is the lingua franca of risk-aware estimation. (cheap to add)
2. **No assumptions/exclusions field per estimate** — methodik-boilerplate is generic; PERT estimates without explicit project-specific assumptions are professionally weak.
3. **No CSV/Excel export** — PDF is for clients, but consultants live in Excel. (cheap to add)
4. **No estimate-to-estimate comparison** — clone-only model gives audit trail but loses the "what changed and why?" view that justifies cloning.
5. **No project templates** — every new estimate starts blank; for a "Migration" vs "Greenfield CRUD" distinction, defaulting parameter ranges saves significant time.

Everything else in the PRD is solid. The 10 questions in the brief are addressed under their respective categories below.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features IT-consultants will assume a serious estimation tool has. Missing = "amateurish" feeling.

| Feature | Why Expected | Complexity | v1/v2/v3 | Notes |
|---------|--------------|------------|----------|-------|
| **PERT 3-point estimate (O/M/P/PERT)** | The whole reason the tool exists; standard PMI practice | S | v1 ✅ | Already in PRD |
| **Parameter table with complexity weighting** | Hausmethodik core; consultants want structured input not guesswork | M | v1 ✅ | Already in PRD |
| **Global correction factors** (Technology/Team/Quality/Doc) | Universally used in IT consulting estimates; Boehm-style cost drivers | S | v1 ✅ | Already in PRD |
| **Phase distribution (Anforderung/Arch/Impl/Test/Deploy/PM)** | Clients ask "wie viel für Test?"; phase split is standard waterfall consulting output | S | v1 ✅ | Already in PRD |
| **Snapshot of weights per estimate (reproducibility)** | Audit trail; PT changes after admin tweak is professionally embarrassing | M | v1 ✅ | Already in PRD — this is actually a differentiator vs many tools |
| **Standardabweichung (σ) explicitly shown** | PERT without σ is incomplete; σ = (P−O)/6 is one line of math | S | v1 ✅ | Already in PRD formula, surface in UI |
| **Confidence intervals: at minimum P50 (= PERT) and P80** | Industry standard per AACE; "Wie sicher ist die Zahl?" is the first question after PT total | S | **v1 add** | Compute from PERT ± Z×σ; P50=PERT, P80≈PERT+0.84·σ, P90≈PERT+1.28·σ. Display as table. **GAP vs PRD** |
| **Assumptions field per estimate (free text)** | German IT estimation literature explicitly requires Annahmen-Dokumentation; PERT without assumptions = false precision | S | **v1 add** | Multi-line textarea, appears in PDF section "Annahmen"; current PRD only has "Annahmen" inside Methodik-Boilerplate, which is generic — needs **per-estimate** field. **GAP vs PRD** |
| **Exclusions/Out-of-scope field per estimate** | Defensive contracting; same pattern as Annahmen but inverted | S | **v1 add** | Common consulting clause: "Nicht enthalten ist: ..." **GAP vs PRD** |
| **Gültigkeitsdatum / Angebotsgültigkeit** | German law treats undated offers as theoretically unlimited; consultants always put a "valid until" date | S | **v1 add** | Date input, appears on PDF cover. Default = +30 days. **GAP vs PRD** |
| **Project metadata (client name, project ID/number)** | Real consulting deliverables identify the client; "Erstellt von" alone is half the metadata | S | **v1 add** | Add `client_name` and optional `project_id` fields. **GAP vs PRD** |
| **PDF with cover, TOC for >5 pages, page numbers, footer** | Business-document baseline; clients judge competence by document polish | M | v1 ✅ (cover) / **v1 add** (TOC, page nbrs, footer) | PRD has cover. Add page numbers + footer with project name/ID. TOC optional if doc ≤ 5 pages. **PARTIAL GAP** |
| **Disclaimer/Haftungsausschluss in PDF** | "Nach bestem Fachwissen, keine Gewähr" is standard German consulting boilerplate | S | **v1 add** | Part of Methodik-Boilerplate; ensure default text includes this. **GAP vs PRD** |
| **History list with search/filter/sort** | Consultants accumulate dozens of estimates per year; navigation is non-negotiable | S | v1 ✅ | Already in PRD |
| **Read-only re-open of past estimate** | Audit defense; "Zeigen Sie mir die Schätzung von Mai 2025" | S | v1 ✅ | Already in PRD |
| **Clone-as-basis for new estimate** | Standard pattern; clone-only is acceptable | S | v1 ✅ | Already in PRD — see "Audit/History" section below for nuance |
| **CSV export of parameter table + result** | Consultants live in Excel; recipients of the PDF often re-key into their own models | S | **v1 add** | Single CSV with all parameter rows + result row. Or two-sheet XLSX. **GAP vs PRD** |
| **Tagessatz × PT = € total + per-phase €** | Money is what the client cares about | S | v1 ✅ | Already in PRD |
| **Reset Methodik-Boilerplate / Weights to defaults** | Safety net for admin experimentation | S | v1 ✅ | Already in PRD |

**v1 critical adds (table stakes gaps vs PRD):** P50/P80/P90 row, per-estimate Annahmen field, per-estimate Ausschlüsse field, Gültigkeit-bis date, client name + project ID metadata, PDF page numbers/footer, explicit disclaimer text, CSV export.

All are S-complexity individually — together ~1 phase of work.

---

### Differentiators (Competitive Advantage)

Features that elevate the tool from "Excel-with-extra-steps" to "this is genuinely useful". Mostly v2 territory.

| Feature | Value Proposition | Complexity | v1/v2/v3 | Notes |
|---------|-------------------|------------|----------|-------|
| **Estimate-to-estimate diff view** | "Was hat sich zwischen V1 und V2 der Schätzung geändert?" — this is the value of clone-only that PRD currently doesn't surface | M | **v2** | Side-by-side: parameter deltas, factor deltas, ΔPT total. Doofer ("Estimation Version Comparison") makes this their main selling point. **HIGH leverage** — answers question 2 in the brief. |
| **Sensitivity / tornado view** | "Welcher Faktor treibt den Aufwand am stärksten?" — flips each correction factor ±1 stufe and shows ΔPT bar chart | M | **v2** | One-at-a-time (OAT) sensitivity; classic SEER/SLIM feature, standard PMI sensitivity-analysis output. Answers question 4. Implementation: 4 factors × 2 directions = 8 re-calculations. Pure compute, no UI rocket-science. |
| **Confidence band visualization** (S-curve or simple bell) | Visual probability distribution for the PDF and dashboard; clients grasp pictures, not numbers | M | v2 | PERT distribution is analytically computable; no need for Monte Carlo at this scale. SVG chart in PDF. |
| **Project templates** ("Greenfield CRUD", "Migration", "Legacy-Migration", "Integration-heavy") | Pre-fill parameter starting values + factor defaults per project type; saves 5–10min per estimate | M | **v2** | Already have Projekttyp field → could surface as template selector that pre-fills the form. Devtimate/Doofer market this. Answers question 6. **HIGH leverage / low risk.** |
| **Multiple methodology selector** (PERT, simple ML-only, single-point) | Some clients want single-number, some want range — toggle output style without rebuilding model | S | v3 | Keep PERT as default; add "Show only ML" toggle for simple clients. Low effort. |
| **Excel/XLSX export (multi-sheet)** | CSV is data, XLSX is presentation; openpyxl is one library away | S | v2 | Adds: cover sheet, params sheet, result sheet, € sheet. Answers question 7. |
| **Cone-of-uncertainty visualization** | Phase-dependent ± range; teaches client that "Schätzung vor Anforderung != Schätzung nach Architektur" | M | v3 | McConnell concept; widening σ for earlier-phase estimates. Educational, nice-to-have. |
| **Methodik-Boilerplate variants / multiple Methodik-Texte** | Different clients = different tone; tech-startup methodik vs. enterprise-procurement methodik | S | v3 | Admin keeps named methodik-text variants, selector per estimate. |
| **PDF Wasserzeichen / "Entwurf" / "Final" status flag** | Estimates often shared in draft state; visible status protects against premature client commitment | S | v2 | Status enum: Draft/Submitted/Accepted. Watermark on PDF if Draft. |
| **Calibration view (post-mortem actuals)** | Record actual-PT after project completion; trend report "Schätzungen sind im Schnitt 18% optimistisch" | L | **v3 only** | Parametric tools (SEER/SLIM) live on this. For single-user v1, only sensible after enough estimates exist (~20+). Answers question 5. **Defer.** |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that *sound* good but hurt the product. The brief explicitly asks for these — they're documented to prevent scope creep when stakeholders ask "warum nicht?".

| Feature | Why Requested | Why Problematic for v1 | Alternative |
|---------|---------------|------------------------|-------------|
| **Monte Carlo simulation** | "Modern" estimation tools have it; SLIM/SEER buzzword | PERT already gives an analytical distribution. MC adds compute complexity, RNG seed-management for reproducibility, and ~zero accuracy gain at this input granularity (5 parameters × 4 complexities). False sophistication. | Provide P50/P80/P90 from analytical PERT distribution (assume normal w/ µ=PERT, σ=(P−O)/6). Same answer, deterministic, reproducible. |
| **Real-time collaboration / WebSockets / co-editing** | "Modern" feel | Single-user-local is the explicit scope. WS adds infrastructure complexity, session state, conflict resolution. Violates "stateless backend" constraint. Multi-user comes later. | Stay clone-only + single-user. Export PDF to share. |
| **AI suggestion / LLM-generated estimates** | Buzzword-driven | Violates "no external services" constraint. Local LLMs are slow on M-series laptops and unreliable for numerical estimation. Undermines reproducibility (non-deterministic). Erodes trust in the explicit methodology. | The whole *point* is structured, defensible, deterministic. LLM is the opposite of this product. |
| **Multi-currency / FX conversion** | "International clients" | v1 single Tagessatz in € is the explicit scope. FX rates need source (external API → violates no-external-services), date-of-rate, rounding rules. Big surface, niche benefit. | One Tagessatz, one currency. Document on PDF: "Alle Beträge in EUR." Client converts if needed. |
| **Gantt chart / scheduling / resource leveling** | "Plan looks like a real project plan" | Scope drift: this is MS Project territory. Phase % is enough abstraction for an *estimate*; calendarisation is project-management territory, downstream. Conflates estimation with planning. | Stay at phase-% level. Export to MS Project / Jira if user wants scheduling. |
| **Jira / Azure DevOps / ticket-import integrations** | "Connect to our backlog" | External APIs (violates no-external-services), authentication, field mapping, error handling, rate limits, vendor lock-in. Each integration = a phase of work + perpetual maintenance. | If user wants to feed Jira items into the estimate, they paste/import via CSV. Pull-from-Jira is v3+ at earliest. |
| **Multi-method cross-validation (run COCOMO II + Function Points + UCP in parallel)** | "Academic completeness" | Each method needs its own parameter set (lines-of-code estimates, UFP weights, technical complexity factors). 4× input burden for marginal validation value. Hausmethodik already encodes the consulting firm's calibrated wisdom — running COCOMO on top doesn't make the number more right. Answers question 1. | One method (PT/PERT with Hausmethodik). Optionally document in Methodik-Boilerplate that other methods exist and were considered. |
| **Wideband Delphi support (multiple estimators, anonymous rounds)** | Agile/Scrum buzzword | Inherently multi-user, requires session management, voting rounds. Single-user-local invalidates this entirely. | Single estimator owns the estimate. Inputs from colleagues can be discussed offline; the *number* lives in this tool. |
| **Story Points integration / Agile mapping** | "We're Agile" | PT is the unit of this tool, deliberately. Story Points are velocity-relative, team-specific, not portable. Mapping PT↔SP requires team velocity (which doesn't exist in a Berater-context). | Out of scope. Stay in PT. Mention in Methodik-Boilerplate that PT is the chosen unit. |
| **Editing existing estimates (in place)** | "Why do I have to clone?" | Violates immutability → kills audit trail → breaks reproducibility constraint. Clone-only is a *feature*, not a limitation. | Explain clone-as-edit in UI ("Diese Schätzung bearbeiten" button → clones). The current "Klonen" UX should be relabelled to communicate "Neue Version anlegen". |
| **Per-phase Tagessätze** (Architekt vs. Entwickler vs. Tester) | "Realistic costing" | Already explicit Out of Scope in PRD. Adds 6 rates per estimate, complicates € reporting, opens debate on which role does which phase. | Stay at single Tagessatz. v2 candidate if users complain. |
| **Per-estimate methodology customization beyond Annahmen** | "This client is special" | If methodology varies per estimate, the tool isn't codifying *a* methodology — it's just a calculator. Erodes the core value (consistent firm methodology). | Methodik-Boilerplate is firm-level (admin). Per-estimate freedom is in Annahmen/Ausschlüsse fields only. |
| **Re-import of Excel/CSV into a saved estimate** | "I tweaked it in Excel and want to bring it back" | Round-trips kill immutability and reproducibility. Re-imported state may not match any deterministic computation path. | Export-only is correct. Re-create in the tool if you want re-import. |
| **Real-time auto-save / draft persistence on every keystroke** | "Modern UX" | Adds state-on-every-form-edit, conflicts with immutability semantics ("when does it become an estimate?"), increases DB writes. | Explicit "Schätzung speichern" button. Loss-of-input acceptable for single-user form completion in <10min. |
| **Sharing via link / web link to estimate** | "Easy to share" | Implies hosting, auth, public URLs. Violates lokal-first. | PDF export covers sharing. |

---

## Question-by-Question Answers (from research brief)

### Q1. Methodology references — companion features needed?
**No.** Stay PT/PERT-only. PERT already provides three-point estimation + σ + confidence intervals; COCOMO II/FP/UCP are alternative *replacement* methods, not companions. Running multiple methods in parallel for cross-validation is academic exercise, not consulting practice. **Mention** in Methodik-Boilerplate that the firm methodology is "PERT-basiert with Komplexitäts-gewichteter Parameter-Tabelle (Variante einer Function-Point-/Use-Case-Point-Hybridmethode)" — that satisfies the "competent estimator knows the field" signal without implementing it.

Confidence: HIGH. The Hausmethodik *is* the calibrated approach; layering COCOMO atop is noise.

### Q2. History/Audit — clone-only too restrictive?
**Partially.** Clone-only is correct for audit/immutability. The missing piece is the **diff view between two estimates** ("V2 hat 3 mehr Pages und Tech-Faktor 0.95 statt 1.05; ΔPT = +12 PT"). Without diff, users will resent re-keying because they can't easily see "what changed and why". Add diff in v2 — it converts clone-only from a limitation into a feature ("traceable change history"). For v1, ensure the read-only view of an estimate shows enough metadata (parent_estimate_id if cloned, timestamp, erstellt_von) so users can navigate the history manually.

Recommendation: **v1 — add `parent_estimate_id` nullable FK** to capture clone lineage. **v2 — add diff view** that exploits this.

### Q3. Risk analysis — confidence intervals table stakes?
**P50/P80 yes, Monte Carlo no.** AACE and PMI practice treats P50/P80 as fundamental to risk-aware estimation; presenting only "PERT = 144 PT" is the "false precision" anti-pattern that Liz Keogh and others flag. Compute analytically from PERT(µ, σ): P50 = µ, P80 ≈ µ + 0.842σ, P90 ≈ µ + 1.282σ. Display as table. Monte Carlo gives the same answer for this input granularity at 100× the implementation cost — anti-feature.

Recommendation: **v1 — add P50/P80/P90 row** to the result dashboard and PDF.

### Q4. Sensitivity analysis — typical?
**Yes, in any tool above basic.** Tornado chart / OAT sensitivity is a SEER-SEM and SLIM standard feature. For a 4-factor model, it's cheap: re-run the formula 8 times (each factor ±1 stufe), tabulate ΔPT. Could be MEDIUM-impact differentiator that nudges the tool above "Excel-with-CSS".

Recommendation: **v2 — sensitivity table + bar chart** (8 rows). Optionally include in PDF as appendix.

### Q5. Calibration / Empirical data — important?
**Yes for credibility, no for v1.** Calibration with actuals is *the* feature that distinguishes SEER/SLIM from a calculator (parametric tools claim up to 400% accuracy improvement from calibration). But it requires (a) data — many completed projects with recorded actuals, (b) statistical modeling that re-fits the weights, (c) discipline to track actuals post-delivery. A single-user-local v1 has none of (a). Defer to v3.

Recommendation: **v3** — adds "Ist-Aufwand"-field per completed estimate + simple deviation report ("Im Schnitt 18% optimistisch über letzte 20 Schätzungen"). Don't auto-re-calibrate weights — show the deviation, let the admin tune manually.

### Q6. Templates / Reusability — typical?
**Yes, big quality-of-life win.** Devtimate, Doofer, and most modern estimation tools have template libraries. The PRD already has the `Projekttyp` enum (Neuentwicklung / Erweiterung / Migration / Legacy-Migration) — extend this so each Projekttyp has admin-configured *default parameter starting values and factor pre-sets*, then form pre-fills on selection. Doesn't bypass user input; just gives a sensible starting point.

Recommendation: **v2** — extend `weights.json` (or new `templates.json`) with per-Projekttyp defaults. On Projekttyp-Auswahl, form pre-fills with those defaults (user can still edit).

### Q7. Export formats — beyond PDF?
**CSV is table stakes. XLSX is nice-to-have. Word/JIRA are anti-features for v1.**
- **CSV (v1):** Consultants will re-key into Excel anyway; CSV saves 5min and avoids transcription errors. Single CSV: parameters + result rows. Implementation: ~50 LOC with Python `csv` module.
- **XLSX (v2):** Multi-sheet, formatted, opens directly in Excel. `openpyxl` is the standard library.
- **Word (anti):** Consultants don't edit estimates in Word; they edit in Excel or read the PDF. Adding `.docx` export = python-docx dependency, layout work, marginal user value.
- **JIRA-friendly format (anti):** Story points and Jira issues live in a different mental model. v3 candidate if a real user requests it.

### Q8. Methodik-Texte — what's typical default content?
The default `methodik.txt` should contain (~ 1 PDF page):
1. **Verfahren**: "Diese Schätzung wurde mit der PERT-Drei-Punkt-Methode auf Basis einer komplexitäts-gewichteten Parametertabelle erstellt. Aufwände werden in Person-Tagen (PT) ausgewiesen."
2. **Formel-Skizze**: kurze Erklärung der ML-Berechnung und O = ML × 0.75, P = ML × 1.55, PERT = (O+4M+P)/6, σ = (P−O)/6
3. **Korrekturfaktoren-Logik**: "Vier globale Korrekturfaktoren bilden Technologie-Reife, Team-Erfahrung, Qualität/Compliance und Dokumentationspflicht ab. Ein Faktor > 1.15 führt zum expliziten Risikohinweis."
4. **Phasenmodell**: nennt die 6 Phasen mit %.
5. **Annahmen-Disclaimer**: "Die Schätzung beruht auf den im Abschnitt 'Annahmen' dokumentierten Informationen. Wesentliche Änderungen des Umfangs oder der Annahmen erfordern eine neue Schätzung."
6. **Gewährleistungs-Klausel** (de-facto Standard in DE-IT-Verträgen): "Die Aufwandsschätzung wurde nach bestem Fachwissen und auf Basis der zum Erstellungszeitpunkt vorliegenden Informationen erstellt. Eine Gewähr für die exakte Übereinstimmung mit dem späteren tatsächlichen Aufwand kann nicht übernommen werden."
7. **Gültigkeit**: "Diese Schätzung ist gültig bis zum auf dem Deckblatt angegebenen Datum."

Recommendation: ship this exact ~7-paragraph default `methodik.txt`. Admins can edit it; if they don't, the document is professionally complete.

Confidence: MEDIUM-HIGH (synthesized from German IT-Vertragspraxis + PMI assumption-documentation guidance).

### Q9. PDF look & feel — table stakes?
**Required (v1):**
- Deckblatt: Projektname, Kunde, Projekt-ID, Datum, Erstellt von, Gültig bis (✅ partial in PRD)
- Page numbers (footer-center or footer-right)
- Footer mit Projekt-Name + Projekt-ID + "Seite x von y"
- Disclaimer auf letzter Seite oder im Methodik-Abschnitt
- Konsistente Schriften (1 sans-serif), klare Tabellen-Formatierung, ausreichend Whitespace
- WeasyPrint kann all dies — CSS-Polish ist der einzige Aufwand

**Nice-to-have (v2):**
- Table of Contents (wenn Dokument > 5 Seiten; bei Standard-Schätzung wahrscheinlich genau 3–4 Seiten, also nicht nötig)
- Firmenlogo im Header (admin-uploadbar)
- "Entwurf"-Wasserzeichen wenn Status = Draft

**Anti (v1):**
- Komplexe Multi-Column-Layouts
- Custom font embedding (Lizenzthema, Komplexität)
- Interaktive PDF-Form-Felder

### Q10. Anti-features (already discussed above)
See Anti-Features table. Argued rationale per item.

### Q11. Out-of-scope detector — defer aggressively
Things real users *will* ask for that should be defer/decline:
- **"Kann ich das aus Jira importieren?"** → "Nein, exportiere die Tickets als CSV und übertrage die Anzahl manuell in die Parameter-Tabelle." (v3+ candidate, but probably permanent No)
- **"Können wir das mit MS Project synchronisieren?"** → "Nein. Exportiere PDF/CSV und plane in MS Project weiter." (anti-feature)
- **"Kann ich das per Link teilen?"** → "Nein, exportiere PDF." (anti-feature — collides with lokal-first)
- **"Kann mein Kollege gleichzeitig editieren?"** → "v1 ist Single-User-lokal." (v2/v3 multi-user)
- **"Können wir Stundensätze verwenden statt Tagessätze?"** → "Nein, PT-basiert; teile durch 8 wenn Stunden nötig." (anti, scope creep)
- **"Kann ich das Excel meines Kollegen importieren?"** → "Nein, re-import bricht die Audit-Trail-Garantie." (anti)
- **"Wir wollen die Schätzung mit der Buchhaltung verknüpfen"** → "Nein, kein ERP-Anschluss." (anti, scope explosion)

---

## Feature Dependencies

```
Persistenz mit Snapshot-Gewichten (v1, PRD)
   ├──enables──> Read-only View past estimates (v1, PRD)
   ├──enables──> Clone for new estimate (v1, PRD)
   │                └──enables──> parent_estimate_id linkage (v1 add)
   │                                  └──enables──> Estimate-to-estimate Diff View (v2)
   └──enables──> Calibration / Actuals tracking (v3)

PERT formula (v1, PRD)
   ├──enables──> σ display (v1, PRD math, surface in UI)
   │                └──enables──> P50/P80/P90 confidence intervals (v1 add)
   │                                  └──enables──> Confidence band SVG chart (v2)
   └──enables──> Sensitivity / Tornado view (v2)

Projekttyp enum (v1, PRD)
   └──enables──> Project Templates with pre-fill defaults (v2)

Per-estimate Annahmen / Ausschlüsse fields (v1 add)
   └──enables──> Defensible PDF deliverable (v1)

CSV export (v1 add)
   └──enables──> XLSX multi-sheet export (v2)

Admin-edited methodik.txt (v1, PRD)
   └──enables──> Methodik-Boilerplate variants (v3)

PDF cover (v1, PRD)
   ├──requires──> Client name + Project ID + Gültig-bis date (v1 add)
   └──enables──> Footer with project ID, page numbers, disclaimer (v1)
```

### Dependency Notes
- **`parent_estimate_id` is the linchpin** for the v2 diff view — must be added in v1 to avoid migration pain later.
- **Snapshot of weights** (already in PRD) is what makes calibration-tracking honest in v3; otherwise old estimates' "actuals deviation" can't be cleanly attributed.
- **Per-estimate Annahmen/Ausschlüsse fields** are independent of everything else; pure form-input additions. **Do these first** — highest value/effort ratio.

---

## MVP Definition

### Launch With (v1) — additions to current PRD

The PRD is a solid v1 already. The following adds close the table-stakes gap:

- [ ] **P50/P80/P90 confidence interval row** in dashboard + PDF — analytical, ~10 LOC. *Essential because*: "false precision" anti-pattern otherwise.
- [ ] **Per-estimate `assumptions` textarea** (max ~1500 char) — appears in PDF as "Annahmen"-Abschnitt. *Essential because*: every German IT estimation guide requires assumption documentation.
- [ ] **Per-estimate `exclusions` textarea** (max ~1500 char) — appears in PDF as "Nicht enthalten"-Abschnitt. *Essential because*: defensive contracting standard.
- [ ] **`client_name` field** on estimate — appears on PDF cover. *Essential because*: PDF without client name is generic.
- [ ] **`project_id` field** (optional, free text) — appears on PDF cover + footer. *Essential because*: clients refer to estimates by their internal IDs.
- [ ] **`valid_until` date field** (default = +30 days) — appears on PDF cover. *Essential because*: German offer-validity convention.
- [ ] **`parent_estimate_id` nullable FK** (auto-populated on clone) — invisible in v1 UI; enables v2 diff. *Essential because*: schema-now-saves-pain-later.
- [ ] **CSV export endpoint** (params + result) — *Essential because*: consultants need data in Excel.
- [ ] **PDF page numbers + footer** (project name + project_id + "Seite x/y") — *Essential because*: business-document baseline.
- [ ] **Disclaimer in default `methodik.txt`** — *Essential because*: legal hygiene.
- [ ] **Default methodik.txt content** as documented above — *Essential because*: PRD says boilerplate exists but doesn't define content; defining it is part of the deliverable.

**v1 total additional scope:** ~11 small items, no item > S complexity. All compatible with the React/FastAPI/SQLAlchemy/WeasyPrint stack already chosen. Estimated ~1 sprint of effort layered on top of the core PRD scope.

### Add After Validation (v1.x → v2)

- [ ] **Estimate-to-estimate diff view** — side-by-side, parameter deltas, factor deltas, ΔPT. *Trigger*: ≥1 user has created ≥3 clones of the same project.
- [ ] **Sensitivity / tornado view** — 4-factor OAT analysis, bar chart. *Trigger*: users asking "welcher Faktor treibt am meisten?".
- [ ] **Confidence band SVG chart** in PDF — visual P50/P80 distribution. *Trigger*: client feedback "Wo ist die Risiko-Visualisierung?".
- [ ] **Project templates** — Projekttyp-driven parameter pre-fill. *Trigger*: ≥5 estimates created; pattern of starting values per Projekttyp emerges.
- [ ] **XLSX multi-sheet export** — formatted Excel with cover/params/results sheets. *Trigger*: users complaining CSV is too raw.
- [ ] **Draft/Final status flag + watermark on PDF**. *Trigger*: estimate accidentally sent in draft state.

### Future Consideration (v2 → v3+)

- [ ] **Calibration / actuals tracking** — *Defer until*: ≥20 completed estimates with actuals captured manually. Earlier than that, no signal.
- [ ] **Cone-of-uncertainty visualization** — Educational; consider if onboarding new users to PERT.
- [ ] **Multiple Methodik-Texte / per-estimate selector** — Only if firm has ≥2 distinct client tones.
- [ ] **Multi-user / auth** — Already on PRD roadmap; PRD architecture supports it (nullable user_id).
- [ ] **Logo upload** in admin for PDF header — Mild visual upgrade.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| P50/P80/P90 confidence row | HIGH | LOW | **P1 (v1)** |
| Per-estimate Annahmen field | HIGH | LOW | **P1 (v1)** |
| Per-estimate Ausschlüsse field | HIGH | LOW | **P1 (v1)** |
| Client name + Project ID metadata | HIGH | LOW | **P1 (v1)** |
| Gültig-bis date | MEDIUM | LOW | **P1 (v1)** |
| PDF page numbers + footer | HIGH | LOW | **P1 (v1)** |
| Disclaimer text in methodik.txt | HIGH | LOW (writing) | **P1 (v1)** |
| Default methodik.txt content | HIGH | LOW (writing) | **P1 (v1)** |
| `parent_estimate_id` FK (invisible) | MEDIUM (sets up v2) | LOW | **P1 (v1)** |
| CSV export | HIGH | LOW | **P1 (v1)** |
| Estimate diff view | HIGH | MEDIUM | **P2 (v2)** |
| Sensitivity / tornado view | HIGH | MEDIUM | **P2 (v2)** |
| Project templates (Projekttyp-pre-fill) | MEDIUM | MEDIUM | **P2 (v2)** |
| Confidence band SVG chart | MEDIUM | MEDIUM | **P2 (v2)** |
| XLSX multi-sheet export | MEDIUM | LOW | **P2 (v2)** |
| Draft/Final status + watermark | MEDIUM | LOW | **P2 (v2)** |
| Cone of uncertainty viz | LOW | MEDIUM | **P3 (v3)** |
| Calibration / actuals tracking | HIGH (long-term) | HIGH | **P3 (v3)** |
| Multiple methodik-text variants | LOW | LOW | **P3 (v3)** |
| Logo upload | LOW | LOW | **P3 (v3)** |
| Monte Carlo simulation | LOW (vs PERT analytical) | HIGH | **Anti** |
| Jira/Azure DevOps integration | LOW (single-user-local) | HIGH | **Anti** |
| AI/LLM suggestions | NEGATIVE (kills reproducibility) | HIGH | **Anti** |
| Multi-currency / FX | LOW | HIGH | **Anti** |
| Gantt / scheduling | LOW (scope creep) | HIGH | **Anti** |
| Wideband Delphi multi-user | N/A (single-user-local) | HIGH | **Anti** |
| Per-phase Tagessätze | LOW | MEDIUM | **Anti / v3 defer** |
| Excel re-import | NEGATIVE (breaks audit) | MEDIUM | **Anti** |

**Priority key:**
- P1: Must have for v1 launch (additions to current PRD)
- P2: Validate-then-add for v2
- P3: Future, requires usage data to justify
- Anti: Explicit do-not-build with documented rationale

---

## Competitor / Reference Feature Analysis

| Feature | SEER-SEM (enterprise) | SLIM-Estimate (enterprise) | Devtimate (modern web) | Doofer (modern web) | This Project (recommended) |
|---------|----------------------|-----------------------------|------------------------|---------------------|----------------------------|
| Three-point / PERT | Built-in | Built-in | Optional | Optional | **v1 ✅** (core) |
| Monte Carlo simulation | Yes | Yes | No | No | **Anti** (analytical PERT sufficient) |
| Confidence intervals (P50/P80) | Yes | Yes | No | No | **v1 add** |
| Sensitivity / tornado | Yes | Yes | No | Partial | **v2** |
| Project templates | Yes (rich) | Yes | Yes (key selling point) | Yes (key selling point) | **v2** |
| Estimate version comparison | Yes | Yes | Partial | Yes (key feature) | **v2** (diff view) |
| Calibration with actuals | Yes (core) | Yes (core) | Limited | Limited | **v3** |
| Multi-method (COCOMO/FP/UCP) | Yes | Yes | No | No | **Anti** (one method) |
| Excel/CSV export | Yes | Yes | Yes | Yes | **v1 (CSV) / v2 (XLSX)** |
| Jira integration | Yes | Yes | Some | Some | **Anti** (lokal-first) |
| PDF export | Yes | Yes | Yes | Yes | **v1 ✅** |
| Multi-user / collaboration | Yes | Yes | Yes | Yes | **v2/v3** (architecture-ready) |
| Pricing model | $$$$ enterprise | $$$$ enterprise | $$ SaaS | $$ SaaS | Free / local |
| Target user | Defense, govt, big-corp | Big-corp IT | Agencies | Agencies | **IT-Berater individual** |

**Strategic positioning:** This tool sits in a unique niche — *single-user-local* PT estimation tool for German IT consultants. Commercial tools (SEER/SLIM) over-serve with multi-method, Monte Carlo, calibration; SaaS tools (Devtimate/Doofer) over-serve with agency/collaboration features but under-serve on rigorous PERT + reproducibility + German consulting conventions (Gültigkeit, Annahmen-Doku, Haftungsausschluss). The PRD's clone-only + snapshot-of-weights + lokal-first stance is genuinely differentiated.

---

## Gap Analysis Summary (vs PROJECT.md Active section)

| Gap | Severity | v1 / v2 / Anti | Effort |
|-----|----------|----------------|--------|
| No P50/P80/P90 row (only O/M/P/PERT) | **HIGH** — false precision anti-pattern | **v1 add** | S |
| No per-estimate Annahmen field (only generic methodik boilerplate) | **HIGH** — every German PM source mandates per-estimate Annahmen-Doku | **v1 add** | S |
| No per-estimate Ausschlüsse / Out-of-scope field | MEDIUM | **v1 add** | S |
| No client_name / project_id metadata | MEDIUM | **v1 add** | S |
| No Gültigkeitsdatum | MEDIUM (German legal convention) | **v1 add** | S |
| No parent_estimate_id FK on clones | LOW (now) / HIGH (for v2 diff) | **v1 add** | S |
| No CSV export | MEDIUM | **v1 add** | S |
| PDF lacks page numbers/footer/disclaimer | MEDIUM | **v1 add** | S |
| Methodik-Boilerplate content undefined | MEDIUM | **v1 define** (writing task) | S |
| No estimate-to-estimate diff view | LOW (now) | v2 | M |
| No sensitivity / tornado view | LOW (now) | v2 | M |
| No project templates (Projekttyp pre-fill) | LOW (now) | v2 | M |
| No Excel re-import | n/a — **Anti** | — | — |
| No Jira import | n/a — **Anti** | — | — |
| No Monte Carlo | n/a — **Anti** (analytical PERT covers it) | — | — |
| No multi-currency | n/a — **Anti** | — | — |
| No multi-method (COCOMO/FP/UCP) | n/a — **Anti** | — | — |

**Bottom line:** 10 small v1 adds close the table-stakes gap. The PRD is right on the big architecture decisions (clone-only, snapshot-weights, lokal-first, Hausmethodik, no multi-user); the gaps are all polish/convention items that take consulting deliverables from "calculated" to "professional".

---

## Sources

### Methodology references
- [PERT Drei-Punkt-Schätzung (Projektmagazin)](https://www.projektmagazin.de/methoden/pert-drei-punkt-schaetzung) — German PM standard reference
- [Aufwandsschätzung (Softwaretechnik) Wikipedia DE](https://de.wikipedia.org/wiki/Aufwandssch%C3%A4tzung_(Softwaretechnik))
- [PERT-Methode Bundesverwaltungsamt Orghandbuch](https://www.orghandbuch.de/Webs/OHB/DE/OrganisationshandbuchNEU/4_MethodenUndTechniken/Methoden_A_bis_Z/PERT_Methode/PERT_Methode_node.html)
- [Bosshart Consulting PERT-Beschreibung (PDF)](https://www.bosshart-consulting.ch/resources/PERT_Beschreibung.pdf)
- [Aufwandsschätzungen in IT-Projekten — GI Fachgruppe WI-PM](https://fg-wi-pm.gi.de/mitteilung/aufwandsschaetzungen-in-it-projekten-bericht-der-community-of-practice-projektmanagement)
- [Drei-Punkt-Schätzung — Consulting LIFE](https://www.consulting-life.de/drei-punkt-schaetzung/)
- [COCOMO/FP/UCP comparative analysis (IJCA 2025)](https://www.ijcaonline.org/archives/volume187/number1/mehta-2025-ijca-924599.pdf)
- [Wikipedia: Software development effort estimation](https://en.wikipedia.org/wiki/Software_development_effort_estimation)
- [GeeksforGeeks: Wideband Delphi and Planning Poker](https://www.geeksforgeeks.org/software-engineering/wideband-delphi-and-planning-poker/)

### Risk analysis & confidence intervals
- [P50 vs P80 vs P90 confidence levels (IQRM)](https://iqrm.net/blog/p50-p80-p90-confidence-level)
- [Monte Carlo simulation in cost estimating (PMI)](https://www.pmi.org/learning/library/monte-carlo-simulation-cost-estimating-6195)
- [Scientific Schedule Estimation: From PERT to Monte Carlo (Conzit)](https://conzit.com/post/scientific-schedule-estimation-from-pert-to-monte-carlo)
- [Galorath: Monte Carlo Simulation methods](https://galorath.com/risk/monte-carlo-simulation/)
- [Galorath: Sensitivity Analysis methods](https://galorath.com/risk/sensitivity-analysis/)
- [Sensitivity Analysis in Schedule Risk: Tornado Charts (IQRM)](https://iqrm.net/blog/sensitivity-analysis-tornado-chart-schedule-risk)

### Commercial tool features (for benchmarking)
- [Galorath SEER for Software](https://galorath.com/seer/solution/software-development/)
- [SEER-SEM Wikipedia](https://en.wikipedia.org/wiki/SEER-SEM)
- [SEER-SEM Pricing/Features (SoftwareSuggest)](https://www.softwaresuggest.com/seer-sem)
- [Devtimate templates and library](https://devtimate.com/templates-and-library/)
- [Devtimate cone of uncertainty in estimation](https://devtimate.com/blog/the-cone-of-uncertainty-in-software-estimation)
- [Doofer Estimation Version Comparison](https://doofer.io/estimation-version/)

### Calibration / Parametric Estimation
- [Parametric Estimating Handbook 4th Edition (DAU)](https://www.dau.edu/sites/default/files/Migrated/ToolAttachments/Parametric%20Handbook%204th%20Edition.pdf)
- [Galorath: Parametric Estimating for Accurate Project Predictions](https://galorath.com/estimation/parametric-estimating/)
- [IBM Research: Comparison of parametric software estimation models](https://research.ibm.com/publications/a-comparison-of-parametric-software-estimation-models-using-real-project-data)

### Consulting deliverable structure & German consulting conventions
- [Consulting SOW template (NMS Consulting)](https://nmsconsulting.com/consulting-sow-template/)
- [How to write consulting proposals like McKinsey (Slideworks)](https://slideworks.io/resources/how-to-write-consulting-proposals-like-mckinsey)
- [Kostenschätzungen im IT-Vertrag (comp/lex)](https://comp-lex.de/alles-ueber-kostenschaetzungen-kostenvoranschlaege/) — German legal angle, Gewährleistungs-Klausel
- [Angebot schreiben: Inhalt, Vorlage & Checkliste (Karrierebibel)](https://karrierebibel.de/angebot-schreiben/) — Gültigkeitsdatum convention
- [Aufwandsschätzung — Lean Management Beratung](https://lean-management-beratung.de/lean-consulting/lean-methoden/aufwandsschaetzung)
- [Realistische Aufwandsschätzung — Projektmagazin](https://www.projektmagazin.de/artikel/realistische-aufwandsschaetzung-schnell-und-systematisch-teil-1_1127239)

### PDF / Business report conventions
- [Boise State COBE Guidelines for Reports](https://www.boisestate.edu/cobe/cobe-writing-style-guide/guidelines-for-reports/)
- [Formatting Your Document — Business Reports Guide (Seneca)](https://pressbooks.senecabooks.ca/busreportguide/part/format/)
- [Walton General Rules of Report Writing (PDF)](https://walton.uark.edu/business-communication-lab/resources/General_Rules_of_Report_Writing.pdf)

### Estimation anti-patterns / Cone of uncertainty
- [Construx: The Cone of Uncertainty (McConnell)](https://www.construx.com/books/the-cone-of-uncertainty/)
- [Liz Keogh: Estimation anti-patterns](https://lizkeogh.com/2009/11/30/estimation-anti-patterns/)
- [McConnell: Software Estimation's Cone of Uncertainty (PDF)](https://athena.ecs.csus.edu/~buckley/CSc231_files/McConell_ConeofUncertainty.pdf)

### Export & integration
- [Atlassian: Export Jira to Excel](https://community.atlassian.com/forums/Jira-questions/How-do-I-export-all-issues-to-excel-or-CSV-with-Jira-project/qaq-p/1423652)
- [Midori Better Excel Exporter for Jira](https://midori-global.com/products/better-excel-exporter-for-jira/cloud/export-samples/jira-software-excel-reports)

---

*Feature research for: Software Estimation Manager (PT/PERT consulting tool)*
*Researched: 2026-05-16*
*Next consumer: REQUIREMENTS.md scoping — use v1 P1 list for must-have feature freeze; v2 list for post-launch roadmap; Anti list for objection-handling.*
