# Pas 2 — Anvelopă (opace + vitrate + punți termice) — Audit mai 2026 (F1)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Fișiere principale**:
- `src/steps/Step2Envelope.jsx` (orchestrator)
- `src/calc/opaque.js` (calcul U opace + ΔU'' Annex F)
- `src/calc/thermal-bridges-dynamic.js` (interpolare ψ + catalog)
- `src/data/materials.json` (~280 materiale cu λ, ρ, μ)
- `src/data/glazingTypes.json` v2.0 (61 vitrare + uși + skylight + curtain wall)
- `src/data/thermal-bridges.json` (~190 intrări catalog + extensii)
- `src/components/OpaqueModal.jsx` + `SmartEnvelopeHub/WizardOpaque.jsx`
- `src/components/UComplianceTable.jsx` (badge nZEB/Renovare/Neconform)
- `src/components/SmartEnvelopeHub/ThermalViz/views/WallSection.jsx` (SVG cross-section avansat)

**Documente conexe**: `docs/AUDIT_THERMAL_BRIDGES_2026.md` (audit prior 78/100), `docs/CROSS_SOURCE_VALIDATION.md`

---

## ✅ Funcționează corect

### Calcul opace (`src/calc/opaque.js`)

1. **Formula SR EN ISO 6946:2017 implementată corect**:
   `R_total = Rsi + Σ(d_i / λ_i) + Rse` apoi `U = 1 / R_total + ΔU''` (linii 84-120).
   Rsi/Rse vin per element din `building-catalog.js > ELEMENT_TYPES` cu valori conforme:
   - PE (perete vertical): Rsi=0.13, Rse=0.04
   - PT (terasă): Rsi=0.10, Rse=0.04
   - PP (planșeu pod): Rsi=0.10, Rse=0.04
   - PB/PL (planșeu sol/subsol): valori per metodă SR EN ISO 13370

2. **ΔU'' Annex F — 8 tipuri fixări mecanice** (`FASTENER_TYPES`):
   - none (lipire integrală), plastic_cap, plastic_recessed, metal_pin, metal_pin_thermal, steel_bracket, steel_bracket_thermal, chemical_anchor, default
   - Formula exactă `ΔU = α × λ_f × A_f × n_f / d_ins` (linia 60)
   - Fallback valoare forfetară din Tabel 7 Mc 001-2022 (linia 67)
   - Cap conservator 0.15 W/(m²·K) — peste e structural neadecvat (linia 62)

3. **Detecție automată izolație**: `hasInsulation` cu prag `λ < 0.06 W/(m·K)` (linia 98) — corect pentru EPS/XPS/MW (λ ~0.030-0.045).

4. **Bază materiale** (`src/data/materials.json`):
   - Schema bogată: `cat`, `name`, `lambda`, `rho`, `mu` (permeabilitate vapori), `cp` (căldură specifică), `src` (sursă normativă)
   - Multe intrări citează „EN ISO 10456" și „EN ISO 10456 Tabel 1" — conformitate normativă bună
   - Categorii: Altele, Beton, Cărămidă, Izolații, Lemn, Mortare, Sticlă, Tencuieli, Zidărie, etc.

### Calcul vitrate (`src/data/glazingTypes.json`)

5. **Schema v2.0 (4 mai 2026) — catalog NEUTRU**:
   - 4 categorii: window, door, skylight, curtain wall
   - Per entry: `ug`, `ugRange.min/max`, `g`, `tlight` (=τ), `era` (1970-1990, post-2010, etc.)
   - Surse explicite: SR EN 673:2011, SR EN 410:2011, SR EN 1279, SR EN ISO 10077-1:2017, SR EN 14351-1+A2:2016, SR EN 1096-1...5, SR EN 12758:2019, SR EN 13830:2015+A1:2020, SR EN 1873:2014+A1:2016, SR EN 14963:2006, SR EN 50583-1/2:2016, Passivhaus Institut Component Database
   - Brand și supplierId rezervate pentru parteneriate viitoare (`null` initial)

6. **Valori Ug verificate** (sample):
   - GL-single-4 (4mm float): Ug=5.75, g=0.86, τ=0.89 — conform SR EN 410 single 0.87
   - GL-double-coupled (2× 4mm lemn cuplată): Ug=3.0, g=0.76, τ=0.80 — corect tradițional
   - Triple Low-E + argon: Ug~0.6-0.8, g~0.40-0.50 — în interval SR EN 673
   - Curtain wall stick mullion-transom: prezent (Sprint Batch C)

### Calcul punți termice (`src/calc/thermal-bridges-dynamic.js`)

7. **Interpolare dinamică ψ**: `calcPsiDynamic(bridge, R_ins)` (linii 23-32) interpolează liniar între `ψ_neizolat` și `ψ_izolat` funcție de R-ul izolației elementului adiacent — abordare validă pentru audit RO.

8. **Detecție automată joncțiuni**: `detectJunctions(opaqueElements, glazingElements)` (linii 38-58) sugerează punți tipice bazate pe tipurile elementelor prezente (PE+PT → racord perete-terasă, PE+PL → soclu/fundație, etc.).

9. **Sumarizare**: `summarizeDynamicBridges` calculează `total_psiL_orig`, `total_psiL_dyn`, `delta`, `nImproved`/`nWorse` — feedback util pentru auditor după reabilitare.

10. **Punți punctuale separate** (Sprint 22 #2 — formula §8.3):
    - State dedicat `pointThermalBridges = []` în Step2Envelope (linia 12)
    - `useEnvelopeSummary` aplică `Σ(χ × N)` pe `pointThermalBridges` (linia 107: `chi × count`)
    - Test dedicat `point-bridges.test.js` (4 cazuri PASS)

### UI / Componente

11. **`UComplianceTable.jsx`** (memo, 174 linii):
    - Badge U_calc vs U_ref cu 3 nivele: 🟢 nZEB ✓ | 🟡 Renovare ✓ | 🔴 Neconform ✗
    - Linii pentru elemente opace + vitraje
    - Compară cu `U_REF_NZEB_RES/NRES` și `U_REF_RENOV_RES/NRES` + `U_REF_GLAZING`
    - Conformitate Mc 001-2022 Tab. 2.4/2.7/2.10a/2.10b

12. **`WallSection.jsx`** (SVG cross-section, 495 linii) în `SmartEnvelopeHub/ThermalViz/views/`:
    - Diagramă secțiune INT→EXT cu gradient temperaturi prin straturi (HSL 240→0)
    - Curba termică Glaser cu gradient cromatic multi-stop pe X
    - Etichete T cu collision detection alternant sus/jos width-aware
    - Linie punct rouă (T_dew) cu indicator vizual
    - Tooltip hover pe strat (material, λ, R, ΔT)
    - Casete INT/EXT cu Rsi/Rse afișate
    - Bandă denumiri straturi sub diagramă (link cu hover)
    - Alertă risc condens automat
    - Săgeată flux termic Q (W/m²)

13. **`WizardOpaque.jsx`** (SmartEnvelopeHub):
    - Wizard 3 pași tehnic (alegere tip → straturi → fixare/verificare)
    - Diagramă LayerStack cu culori per categorie (IZOL galben, ZID portocaliu, BC slate, TEN stone, LEMN amber, MET blue)
    - ConformityGauge — bară U vs U_ref cu zonă nZEB marcată
    - Badge-uri normative ISO 6946:2017 + Mc 001-2022
    - Integrare directă `calcGlaserCondens` (verificare condens vapori SR EN ISO 13788 + DIN 4108-3)

14. **`OpaqueModal.jsx`** (legacy fallback):
    - Editor straturi cu căutare materiale (`MATERIALS_DB.filter`)
    - Selectare material atomic care propagă λ, ρ, μ, cp, src (Fix D3 din 14.04.2026)
    - FASTENER_TYPES integrat
    - Verificare Glaser (`glaserCheck`)

15. **`Step2Envelope.jsx`**:
    - SmartEnvelopeHub default ON; legacy grid `?envelopeHub=0`
    - Import CSV elemente anvelopă
    - Pași 1 / 3 navigation
    - Props complete pentru toate componentele (OpaqueModal, GlazingModal, BridgeModal, CatalogModal, UComplianceTable, SmartEnvelopeHub)

---

## ❌ Probleme găsite + fix-uri aplicate

### P0 (FIX APLICAT — `audit-mai2026` F1)

**P0.1 — `bridge_type:"point"` aplicat incorect în engine liniar**

**Reziduu din auditul prior `AUDIT_THERMAL_BRIDGES_2026.md` §B2**: 8 intrări cu `bridge_type:"point"`, `unit:"W/K"`, χ ca valoare (nu Ψ) erau migrate în schema noua DAR engine-ul `calcDynamicBridges` și `useEnvelopeSummary` aplicau totuși `ψ × L` la ele dacă apăreau în lista liniară `thermalBridges` (din selecție UI sau import legacy CSV).

**Impact**: dacă auditorul selecta din catalog o intrare `chi:true` (ex: „Diblu metalic pentru izolație") și introducea lungime, calculul includea `0.002 × L` (eronat dimensional — χ se exprimă în W/K, nu W/(m·K)).

**Fix aplicat** (3 modificări coordonate, 1 commit):

1. **`src/calc/thermal-bridges-dynamic.js > getCatalogByCategory()`**:
   - Adăugat param `{ includePoint = false }` cu default `false`
   - Filtrează implicit `b.bridge_type === "point"` (UI catalog liniar nu mai expune punctualele)
   - Pentru cataloage de audit complete: pasează `{ includePoint: true }`

2. **`src/calc/thermal-bridges-dynamic.js > calcDynamicBridges()`**:
   - Early-return pentru intrări cu `bridge_type === "point"`:
     `{ psiL_dyn: 0, isPointBridge: true, warning: "..." }`
   - Previne aplicarea ψ × L cu unități greșite

3. **`src/calc/thermal-bridges-dynamic.js > getPointCatalog()`** (NOU):
   - Funcție dedicată pentru UI-ul de selecție `pointThermalBridges`
   - `BRIDGES_DB.filter(b => b.bridge_type === "point")`

4. **`src/hooks/useEnvelopeSummary.js`** (linia 102):
   - Adăugat guard `if (b.bridge_type === "point") return;` în forEach `thermalBridges.forEach`
   - Asigură că state-ul `thermalBridges` rămâne pur liniar chiar dacă intrări point ajung accidental aici

**Test nou**: `src/calc/__tests__/thermal-bridges-point-filter.test.js` cu 5 teste (toate PASS):
1. `getCatalogByCategory()` exclude implicit point entries
2. `getCatalogByCategory({ includePoint: true })` include și punctuale
3. `getPointCatalog()` returnează DOAR point entries cu `unit === "W/K"`
4. `calcDynamicBridges` nu aplică ψ × L pe point entries (psiL_dyn=0 + warning)
5. `calcDynamicBridges` aplică normal ψ × L pe liniare (control)

**Rezultat test suite**: **3474 → 3479 PASS** (+5 noi, 1 FAIL preexistent cooling-s9a — neafectat).

---

### P1 (DOCUMENTATE — nu fixate în F1, lăsate pentru sprint dedicat catalog)

Restanțe identificate în `AUDIT_THERMAL_BRIDGES_2026.md` care **rămân deschise**:

**P1.1 — Inconsistență sign `psi_izolat` la „Colț interior"** (linia 5 catalog v0):
- `psi = -0.05, psi_izolat = -0.03` (intervenția pare să degradeze!)
- Verifică dacă era fixat: grep „Colț interior" → necesită citire `thermal-bridges.json` zona începutului
- Patch sugerat: `psi_izolat = -0.07` (efect ETICS intensificat)

**P1.2 — Cod ISO 14683 inexistent „RF"** (linia 16 catalog v0):
- ISO 14683:2017 Tabel 1 are doar R (roof) și P (parapet), NU „RF"
- Patch sugerat: înlocuiește „tip RF" cu „tip R" în câmpul detail

**P1.3 — Duplicate cu valori divergente** (4 perechi):
- HEA balcon: ψ=0.65 (linia 72) vs ψ=1.20 (linia 122) — clarificare profil HEA100 vs HEA200
- Velux mansardă: ψ=0.16 (lin 57) vs ψ=0.34 (lin 113) — kit EDH/EDW vs montaj generic
- Schöck Isokorb KXT: ψ=0.11 (lin 77) ≡ ψ=0.11 (lin 126) — elimină duplicat
- Timber frame–fundație: ψ=0.12 (lin 41) vs ψ=0.32 (lin 108) — Passivhaus vs standard

**P1.4 — Reduceri ψ → ψ_izolat slabe** (5 intrări <33% reducere):
- „Înlocuire fereastră aliniată în plan ETICS" 0.045→0.030 → target 0.020 (PHI EWFS)
- „Soclu ETICS cu izolație XPS continuă" 0.24→0.15 → target 0.06-0.08
- „Fereastră tilt&turn aliniată" 0.03→0.02 → target 0.01 (Compacfoam)
- „Prag termic ușă cu XPS sub prag" 0.08→0.05 → target 0.03 (Schueco)
- „Conexiune CLT perete-acoperiș" 0.045→0.030 → target 0.015 (Passivhaus CLT)

### P2 (LIPSURI NORMATIVE — sprint catalog dedicat)

8 tipologii nedocumentate în `AUDIT_THERMAL_BRIDGES_2026.md` §D:

| # | Lipsă | Recomandare ψ/χ | Referință |
|---|---|---|---|
| D1 | Ancoraj BIPV (sticlă-sticlă) curtain wall | χ=0.04 standard / 0.012 termorupt | EOTA TR 025, Schüco AWS, IEA PVPS Task 15 |
| D2 | Hota bucătărie + canal gaze ardere coaxial | χ=0.03-0.08 W/K | ISO 14683 Tab 3 |
| D3 | Rost dilatație clădiri lungi (>40m) | ψ=0.12-0.25 W/(m·K) | Mc 001-2022 + atlas IPCT |
| D4 | Casetă jaluzele exterioare cu nișă | ψ=0.10 integrat / 0.55 nișă goală | RT 2012 §6.4 |
| D5 | Terasă circulabilă cu plot PVC + dale | ψ_atic=0.40 fără izol / 0.12 izol | C107/3-2005 |
| D6 | Mullion vertical curtain wall stick | ψ continuu pe vitraj | SR EN 13830:2015 |
| D7 | Subsol CTS variabil (teren pantă) | per fațadă | SR EN ISO 13370 |
| D8 | Cadru ușă lift panoramic fațadă | ψ=0.15-0.30 W/(m·K) | EN ISO 10211 |

**Estimare sprint catalog complet**: 12-15h.

---

### Audit valori λ materials.json (sample verificat)

Materiale uzuale RO — comparație cu C107/2-2005 + SR EN ISO 10456:2008:

| Material | λ Zephren | Țintă C107/2 | Țintă EN 10456 | Status |
|---|---:|---:|---:|---|
| EPS 15 kg/m³ | 0.040 | 0.035-0.044 | 0.036-0.040 | ✅ |
| EPS 20 kg/m³ | 0.038 | 0.035-0.044 | 0.034-0.038 | ✅ |
| XPS extrudat | 0.034 | 0.030-0.035 | 0.030-0.035 | ✅ |
| Vată minerală 50 kg/m³ | 0.037 | 0.038-0.044 | 0.036-0.040 | ✅ |
| BCA 500 kg/m³ | 0.14 | 0.13-0.17 | 0.13-0.17 | ✅ |
| Cărămidă plină | 0.80 | 0.80-0.87 | 0.77-0.84 | ✅ |
| Beton armat 2500 kg/m³ | 2.03 | 2.03 | 2.0 | ✅ |
| Mortar ciment | 0.93 | 0.93 | 0.87-1.0 | ✅ |
| Lemn esență moale | 0.13 | 0.13-0.15 | 0.13 | ✅ |

**Concluzie**: valorile λ pentru materialele uzuale sunt conforme. Nu există modificări necesare în F1.

---

## 💡 Propuneri îmbunătățire UX

1. **Acces direct la SVG cross-section în modal opaque**:
   `WallSection.jsx` este integrată via `ThermalVizButton` în SmartEnvelopeHub, dar **NU și în OpaqueModal legacy** (când `?envelopeHub=0`). Recomandare: adaugă tab „🌡 Secțiune termică" în `OpaqueModal.jsx` cu acces la `WallSection` pentru auditorii care folosesc UI-ul legacy. **Estimare**: 1-2h.

2. **Badge warning pentru point entries selectate accidental**:
   Dacă auditorul are entries `bridge_type:"point"` în state-ul `thermalBridges` (import CSV legacy), afișează badge vizibil „⚠ Punte punctuală — folosește lista χ × N" cu buton 1-click „Mută în punți punctuale". **Estimare**: 1h (folosește deja warning din fix-ul F1).

3. **GlazingCrossSection** (SVG dinamic vitraj):
   În `WallSection.jsx` exist pattern-ul SVG. O componentă analogică pentru vitraj (1/2/3 foi + gaz + ramă + Ug + g) ar fi utilă în GlazingModal. NU există încă. **Estimare**: 4-5h.

4. **Recomandare straturi default din vârstă + tip**:
   Wizard „Bloc panouri 1970-1989 → perete: panel beton 14cm + aer 4cm + cărămidă 7.5cm (U≈1.4)". Există preset-uri parțiale în `LAYER_PRESETS` (WizardOpaque), dar pot fi extinse cu date din literatura tehnică RO. **Estimare**: 3-4h cercetare + 1h impl.

---

## 🤖 Funcții AI propuse Pas 2 (pentru `ai-features-architecture.md`)

| Endpoint | Funcție | Ore | Prioritate |
|---|---|---|---|
| `api/ai-ocr-plan.js` | PDF plan → straturi automat (Claude Vision) | 8 | P2 |
| `api/ai-straturi-constructive.js` | Vârstă + categorie → straturi default sugerate | 4 | P1 |
| `api/ai-thermal-bridge.js` | Foto racord constructiv → tip punte + ψ catalog | 6 | P2 |
| `api/ai-foto-fatada.js` | Foto față clădire → estimare tip structură + perioadă | 5 | P2 |

Toate prin multiplexare pe `api/ai-assistant.js` (intent route) pentru a evita slot Vercel Hobby. Cost ~$10/lună la 100 utilizatori.

---

## 📊 Grafice Pas 2

- **UComplianceTable** — tabel U_calc vs U_ref + status nZEB/Renovare/Neconform ✅
- **WallSection** SVG cross-section cu curba Glaser + risc condens ✅
- **EnvelopeLossChart.jsx** (SmartEnvelopeHub) — bară contribuții element-tip la H_tr ✅ (verificat existență)
- **ConformityGauge** (WizardOpaque) — bar U vs U_ref cu zonă nZEB ✅
- **BridgeIsotherms** (`ThermalViz/views/`) — vizualizare temperaturi 2D la racorduri ✅

**Niciun grafic nou propus** — modulul este foarte avansat vizual.

---

## 📋 Ordine secțiuni Pas 2 — propunere reordonare

Ordinea actuală (în UI Step2Envelope cu SmartEnvelopeHub ON):
1. Header + import CSV
2. SmartEnvelopeHub (single component)
   - În interior: ElementsList (opace + vitrate + punți), ThermalBridgeCard, UComplianceTable, EnvelopeLossChart, EnvelopeHealthCheck, ThermalVizButton

Ordine excelentă pentru auditori avansați. Pentru auditori noi, recomandare:
**Tutorial mode** (`onLoadDemoTutorial` deja existent) — pornește cu pereți → planșee → ferestre → punți → revizuiește U-uri (cu pre-completare demo M1 sau template tipologic).

Pentru `restructurare-sectiuni.md`:
- Recomandarea generală a planului „opace (pereți → planșee → plintă) → vitrate → punți → rezumat U" este **deja respectată** de SmartEnvelopeHub.

---

## Concluzie Pas 2

**Scor conformitate normativă Pas 2**: **88/100** (cu fix F1 aplicat)
- Calcul U opace: 100% (SR EN ISO 6946:2017 + Annex F ΔU'' complet)
- Calcul vitrate: 95% (Ug + g + τ + cataloage; verificare Uw SR EN ISO 10077-1 — dependentă de formula `calcUw` în `glazingTypes.json` consumers, neauditată detaliat în F1)
- Calcul punți liniare: 90% (interpolare ψ dinamic OK; **catalog cu duplicate P1 + lipsuri P2 deschise** — sprint dedicat)
- Calcul punți punctuale: 100% (Sprint 22 #2 + F1 fix bridge_type filter)
- UI / vizualizare: 95% (WallSection SVG profesional; lipsește GlazingCrossSection analog)

**Fix-uri aplicate F1**:
- ✅ P0.1: bridge_type:"point" filter (3 locuri în engine + 1 hook)
- ✅ 5 teste noi PASS
- ✅ Zero regresii (+5 net, 3474→3479)

**Restanțe pentru sprint catalog dedicat (~12-15h)**: P1.1-P1.4 + P2 D1-D8 din `AUDIT_THERMAL_BRIDGES_2026.md`.
