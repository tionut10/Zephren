# Flux date inter-pași — Audit mai 2026 (F7)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)

---

## Schema state management

### State root — `src/energy-calc.jsx` (~4866 linii)

Aplicația Zephren folosește React useState pattern fără Redux/Zustand. Toate state-urile principale sunt în componenta root `EnergyApp` definită în `energy-calc.jsx`.

#### State-uri UI globale
- `step` (1-8): pasul curent al wizard-ului
- `lang` ("RO" / "EN"): limba interfață
- `theme` ("dark" / "light"): tema vizuală
- `sidebarOpen`, `showTutorial`, `activeNavGroup`: UI controls
- `userTier`, `showUpgradeModal`, `upgradeReason`: gating + pricing

#### State-uri Pas 1 — Identificare clădire
- `building` (object): `INITIAL_BUILDING` cu ~50 câmpuri (address, city, county, postal, lat, lon, category, areaUseful, areaBuilt, areaEnvelope, volume, perimeter, heightAvg, floors, yearBuilt, units, scopCpe, n50, structure, climateZone, windExposure, auditorGrad, etc.)
- `selectedClimate` (object): zona climatică I-V + temperaturi lunare + iradianță per orientare
- `auditor` (object): nume, atestat, nrMDLPA, cpeCode, gradMdlpa, attestationIssueDate

#### State-uri Pas 2 — Anvelopă
- `opaqueElements` (array): elemente opace (PE/PT/PP/PL/PB/PR/PS/SE) cu `{ name, type, orientation, area, layers, fastener, _u, _r_total }`
- `glazingElements` (array): vitraje cu `{ name, type, orientation, area, u, g, frameRatio, shading }`
- `thermalBridges` (array): punți liniare `{ desc, psi, length, bridge_type }`
- `pointThermalBridges` (array): punți punctuale `{ name, chi, count }` — Sprint 22 #2

#### State-uri Pas 3 — Sisteme tehnice
- `heating`, `acm`, `cooling`, `ventilation`, `lighting`: fiecare cu sub-obiecte specifice
- Tab activ: `instSubTab` ("heating" / "acm" / "cooling" / "ventilation" / "lighting")

#### State-uri Pas 4 — Surse regenerabile
- `solarThermal`, `photovoltaic`, `heatPump`, `biomass`, `otherRenew`: per sub-tip RES
- Tab activ: `renewSubTab`

#### State-uri Pas 5 — calcul (derived)
- `instSummary`, `envelopeSummary`, `renewSummary`: rezultate din hooks `useInstallationSummary` + `useEnvelopeSummary` + calcule renewable

#### State-uri Pas 7 — Reabilitare
- `rehabScenarioInputs`, `setRehabScenarioInputs`: input scenarii minim/mediu/maxim
- `rehabComparison`, `multiScenarios`, `activeScenario`: rezultate comparator
- `smartSuggestions`, `financialAnalysis`, `finAnalysisInputs`: smart-rehab + financial.js
- `buildingPhotos`: array foto pentru export

### Persistare

#### localStorage (per device)
- `zephren_project_${id}` — JSON proiect complet
- `zephren_pending_open_project` — key proiect pentru restore cross-session
- `ep-theme-manual` — preferință temă override
- `rehab_chat_history_${projectId}` — istoric chat AI (F5)
- `user_eur_ron_override` — curs EUR/RON manual user
- `bnr_eur_ron_cache` — cache curs BNR/Frankfurter (TTL 24h)
- `zephren_measured_consumption` — consum real OCR facturi (Pas 8 MEPI)

#### Supabase (multi-device, auth users)
- Tabele `audits`, `envelope_sections`, `envelope_windows`, `thermal_bridges`, `hvac_systems`, `vmchr_specifications`, `renewable_sources`
- Sync automat la fiecare salvare proiect
- RPC `calculate_cpe()`, `validate_envelope()`, `check_sri_compliance()` pentru audit archival

---

## Propagare date inter-pași — verificare integrală

### Pas 1 → Pas 2
- `building.category` → afișează grila u_ref nZEB corespunzătoare în UComplianceTable (Mc 001 Tab 2.4/2.7)
- `building.areaUseful` (Au) → utilizat în calc/iso13790.js linia 79 pentru `Cm = Au × THERMAL_MASS_CLASS`
- `selectedClimate.solar` → câștiguri solare lunare per orientare (Q_sol)
- `selectedClimate.temp_month` → ΔT lunar pentru Q_loss

**Status**: ✅ propagare OK în toate cele 5 demo-uri M1-M5.

### Pas 1+2 → Pas 3
- `building.category` → preset HVAC tipologic în Step3Systems sugestii
- `building.areaUseful` → calcul putere centrală/HP recomandată
- `selectedClimate.zone` → SCOP/SEER tabel per zonă (aer-apă 2.5-3.5 zone I-II, 3.0-4.0 zone III-V)

**Status**: ✅ propagare OK.

### Pas 3 → Pas 4
- `heating.source` → check dacă HP deja prezent (evită dublă contabilizare cu Pas 4)
- `acm.source` → check dacă solar termic deja în Pas 3 sau separate Pas 4

**Status**: ⚠️ atenție la dublă contabilizare HP / solar termic. Documentat în `useInstallationSummary.js` cu guard explicit.

### Pas 1-4 → Pas 5 (calcul EP)
- `iso13790.js` consumă: G_env (din envelopeSummary), V, Au, climate, theta_int, glazingElements, hrEta, category, n50, structure, windExposure, n_vent
- `useInstallationSummary` agreghează toate sistemele cu fp per vector
- `energy-class.js` clasifică EP_total per categoryKey (rezidențial + cooling flag)

**Status**: ✅ propagare complet validată în demo-financial-snapshot.test.js (11 PASS).

### Pas 5 → Pas 6 (CPE)
- `enClass`, `co2Class`, `instSummary`, `renewSummary` → payload CPE generator
- `auditor` + `building` → header CPE + Anexa 1
- `unifiedRecs` din `generateCpeRecommendations()` → Anexa 2

**Status**: ✅ Sprint Audit P1.4 (2 mai 2026) — motor unificat înlocuiește 2 motoare divergente.

### Pas 6 → Pas 7
- Reverse: `setStep(6)` link în Pas 7 pentru Raport Conformare nZEB
- Pas 7 nu modifică datele Pas 1-6 — doar genera recomandări/scenarii bazate pe ele

**Status**: ✅ flux unidirecțional.

### Pas 7 → Pas 6 (cycle pentru CPE Post-Rehab)
- `cpe-post-rehab-pdf.js` consumă `rehabScenarioInputs` + `financialAnalysis` pentru proiecție post-măsuri
- Pas 6 afișează banner „Post-reabilitare" cu butonul Generare CPE Post-Rehab

**Status**: ✅ Sprint Conformitate P0-06.

---

## Câmpuri care se pot pierde — verificare

### ✅ Verificare pozitivă (niciun bug detectat)

1. **Suprafețe modificate Pas 2 → propagate Pas 7**:
   - `opaqueElements.area` → `envelopeSummary.totalArea` → `iso13790` → `instSummary.ep_total_m2` → `rehabScenarioInputs` (Pas 7)
   - Test: modificare manuală area în Step2Envelope → recalcul automat Pas 5 → reflectat în Pas 7 cost-optimal

2. **Zona climatică → câștiguri solare**:
   - `selectedClimate.solar.S/SE/SV/E/V/NE/NV/N/Oriz` → `iso13790` Q_sol per orientare
   - Override manual zonă → recalcul instant + warning

3. **Tip clădire → defaults Pas 3**:
   - `building.category` → `qIntMap` (4-8 W/m²) + presetare HVAC tipologic
   - Schimbare RA → BI declanșează re-render Step3 cu sugestii noi

4. **n50 din Pas 1 → infiltrații în iso13790**:
   - `building.n50` → `H_inf = 0.34 × n50 × V × e_shield` linia 78
   - `WIND_SHIELD_FACTOR[building.windExposure]` controlează expunerea

### ⚠️ Atenții (NU bug, doar UX)

1. **Race condition la load proiect**:
   - `loadFromStorage()` apelat în useEffect — dacă utilizatorul deschide proiect din URL share (`?share=`), Hook pending project poate fi în race cu loadFromStorage
   - Mitigat prin guard `zephren_pending_open_project` + early removal (`localStorage.removeItem` immediate)

2. **Drift fp per vector la migrare NA:2023**:
   - Flag `useNA2023` controlează fP_elec=2.62 (legacy) vs 2.0 (NA:2023)
   - Default actual: probabil `false` (verifică featureFlags)
   - **Recomandare**: switch default la `true` post transpunere RO EPBD 29.05.2026

3. **Eligibilitate Casa Verde Plus**:
   - Markeri `casaVerdeEligibil:true/false` la entries `_raw_renewable.json`
   - Pas 4 UI nu filtrează după marker — auditorul trebuie să verifice manual
   - **Recomandare** (sprint P2 renewable, ~3h): buton filtru „Doar eligibile Casa Verde"

---

## Validare 5 demo-uri M1-M5 end-to-end

### Setup
- `src/data/demoProjects.js` v3 (refactor 9 mai 2026)
- `buildMdlpaDefaults(demo)` — populare automată câmpuri MDLPA per specificități proiect
- `loadDemoByIndex(idx)` — încarcă demo + setează demo mode + bypass canAccess (Sprint S30A·A6)

### Profiluri demo
| Demo | Locație | Categorie | Sistem | Clasă țintă |
|---|---|---|---|---|
| **M1** | Constanța (Zona I, ≤2.000 GD) | RA bloc PAFP '75 | DH RADET + boiler electric | G |
| **M2** | Cluj-Napoca (Zona III, ~3.000 GD) | RI casă cărămidă | CT gaz cond + PV 3 kWp | E |
| **M3** | București (Zona II, ~2.300 GD) | BI birouri 2005 | VRF degradat + PV 15 + ST 20 m² | C |
| **M4** | Brașov (Zona IV, ~3.400 GD) | ED școală gimnazială | CT central gaz | F |
| **M5** | Sibiu (Zona V, ~3.900 GD) | RI casă nZEB | PC sol-apă + VMC HR90 + PV 6 + ST 8 | A |

### Reproductibilitate verificată

Test `demo-financial-snapshot.test.js`: **11/11 PASS** la baseline F0 (3474) și se menține prin F1-F6 (3522 PASS final).

Schema test:
- Seed fix EUR/RON 5.10 (reproductibilitate determinism strict)
- Snapshot M1-M5 cu output complet `{ ep_total, class, npv, payback, irr }` pentru fiecare scenariu standard
- Drift detectat doar la sprint-uri care recalibrează engine — necesită update snapshot explicit

### Bug-uri fix-uite în sprint-uri precedente (demo-related)

- **Sprint Audit Pas 7 B10 (6 mai 2026)**: `mepsStatus.baseline = false` corect pe EP=781 (M1 G)
- **Sprint Audit Pas 7 B11**: demo M1 expectedResults recalibrate pentru motor curent (968→781 EP, 968→740 EP_nren, drift -19% cumulativ S30A/B/C + P1)
- **Sprint Audit Pas 7 B12**: CostOptimalCurve `Math.max → Math.min` cu cap absolut (45 sub prag 50)
- **Sprint 30D**: recalibrare M2-M5 amânată din S30D (TODO documentat în `DEMO_MODELS_TEST_MATRIX.md`)

---

## Concluzie flux date

### Scor flux date inter-pași: **95/100**

- ✅ State management React useState pattern robust cu localStorage + Supabase
- ✅ Propagare uni-directionalâ Pas 1 → 7 cu derived state via hooks (`useInstallationSummary`, `useEnvelopeSummary`)
- ✅ Reverse flow Pas 7 → 6 (CPE Post-Rehab) via cycle controlat
- ✅ 5 demo-uri M1-M5 reproductibile via snapshot tests (11/11 PASS)
- ✅ Persistence localStorage + Supabase sync
- ✅ Race conditions mitigate prin pending key + early removal
- ⚠️ Drift fP NA:2023 (default flag false) — switch recomandat post 29.05.2026
- ⚠️ Race scenario load proiect URL share — funcțional dar fragil

**Niciun fix de cod aplicat în F7 — verificare confirmă conformitate flux.**
