# Audit prețuri hardcodate — Zephren · 9 mai 2026

**Auditor:** Claude Opus 4.7 1M (sesiune OPUS MAX)
**Working dir:** `D:\Claude Projects\Zephren\energy-app`
**Sursă canonică:** `src/data/rehab-prices.js` (3 scenarii low/mid/high · curs EUR/RON live BNR · fallback **5.10**)
**Ultim commit:** `70a8c88 fix(npv-chart): calibrare costuri măsuri la prețuri reale piața RO 2025`
**Stare git:** clean (doar `changelog.generated.js` + `program-stats.generated.js` modificate)

---

## Rezumat executiv

| Categorie | Locații | Impact |
|---|---:|---|
| 🔴 **CRITICE** (nerealiste / single-scenariu / inconsistență EUR↔RON) | **6** | NPV chart Pas 5, OfertaReabilitare, material-prices EUR/RON 5.00 vs 5.10, ROICalculator curs 4.97 vechi, PVDegradation auto-investment, Step5 NPV măsuri cu costuri 2-3× sub piața RO Q1 2026 |
| 🟠 **MODERATE** (hardcode care ar trebui să folosească canonic) | **12** | Step7Audit fallback electricitate 1.40, vmc-hr 150 EUR/m² + 800 fix, heat-pump-sizing 600/900/1800 EUR/kW, smart-rehab 1100 EUR/kWp, rehab-comparator 55/15 EUR/m²Au, chp-detailed 3500 EUR/kW_el, MEPSCheck 1500/2500/3500 RON/m², AuditReport text 250 EUR/m², historic-buildings 28/110 RON/m²·cm, grey-water-hr 0.12 EUR/kWh, fallback `\|\| 5.05` × 12 fișiere (vs canonic 5.10) |
| 🟢 **OK** (deja folosesc canonic via `getPrice`/`getEurRonSync`/`getEnergyPriceFromPreset`) | **8** | LCCAnalysis, CostOptimalCurve, rehab-cost (overlay PRICES_CANONICAL), unified-rehab-costs, Step7Audit (preț kWh live cu fallback ANRE), PasaportBasic, rehab-comparator (`pv_per_kwp` doar), Step6Certificate (via unified) |

**Concluzii:**
1. **Sursa canonică `rehab-prices.js` există și e completă** — 3 scenarii × 6 categorii × ~30 itemi, helperi `getPrice/getPriceRON/getEurRonSync/calcPackageCost` bine proiectați.
2. **Două surse paralele LEGACY** continuă să fie folosite: `rehab-costs.js` (REHAB_COSTS, fără low/mid/high) și `material-prices.js` (cu `EUR_TO_RON = 5.00` static). Ambele creează inconsistență.
3. **Pas 5 NPV chart subevaluează costurile cu 2–3×** vs prețul real Q1 2026 (vezi tabel detaliat #5.1 mai jos) — risc credibilitate raport pentru auditor.
4. **OfertaReabilitare nu are nicio bază de prețuri proprie** — investiția vine integral de la utilizator (input number) sau pașaport. Nu are 3 scenarii (default/optim/conservator). Cere refactor pentru a oferi sugestii prepopulate scenariu MID + selector low/mid/high (Task D).
5. **Inconsistență fallback EUR/RON**: canonic = 5.10, dar 12 locuri folosesc `|| 5.05` (cosmetic, deoarece `getEurRonSync()` întoarce mereu 5.10 cache/fallback — fallback-ul `|| 5.05` e dead code).

---

## 1. Locații CRITICE (impact direct UI / risc credibilitate)

### 1.1 `src/steps/Step5Calculation.jsx:1489-1496` — NPV chart 5 măsuri SUBEVALUATE 2–3×

```js
const measures = [
  // costuri calibrate la piața RO 2025 (supply + manoperă)
  { name: "Termoizolație pereți",  short: "Pereți",   cost: Au * 2.5 * 110,  savePct: 0.18, color: "#3b82f6" },
  { name: "Ferestre triple",         short: "Ferestre", cost: Au * 0.15 * 1100,savePct: 0.12, color: "#a855f7" },
  { name: "Termoizolație acoperiș", short: "Acoperiș", cost: Au * 55,          savePct: 0.10, color: "#f97316" },
  { name: "Pompă de căldură",        short: "Pompă",    cost: 35000,           savePct: 0.30, color: "#22c55e" },
  { name: "PV 5kWp",                 short: "PV 5kWp",  cost: 20000,           savePct: 0.15, color: "#facc15" },
];
```

**Comparație cu canonic `rehab-prices.js × 5.10 RON/EUR`:**

| Măsură | Hardcoded actual (RON) | Canonic mid (RON) | Δ | Verdict |
|---|---:|---:|---:|---|
| Pereți EPS 10 cm (per m² perete) | **110** | 49 EUR × 5.10 = **250** | −56% | 🔴 SUBEVALUAT 2.27× |
| Ferestre triple U≤1.10 (per m² fereastră) | **1.100** | 200 EUR × 5.10 = **1.020** | +8% | 🟢 ACCEPTABIL |
| Acoperiș EPS 15 cm (per m² Au) | **55** | 32 EUR × 5.10 = **163** | −66% | 🔴 SUBEVALUAT 3× |
| Pompă căldură 12 kW | **35.000** | 9.000 EUR × 5.10 = **45.900** | −24% | 🟠 SUBEVALUAT 24% |
| PV 5 kWp | **20.000** (= 4.000/kWp) | 1.100 EUR × 5.10 × 5 = **28.050** | −29% | 🟠 SUBEVALUAT 29% |

**Impact UI:**
- Grafic NPV cu break-even prea optimist (pereți păreau să se amortizeze în 5–8 ani vs realist 10–14 ani).
- Tabel sub grafic afișează aceleași valori subevaluate → afectează credibilitatea raportului în fața auditorului.
- Visibil în Pas 5 doar pentru AE Ici / Expert (`<GradeGate feature="npvCurve">`), deci IIci nu e afectat.

**Fix recomandat (Task A):** import `REHAB_PRICES + getEurRonSync` și calculează 3 scenarii bandă (low/mid/high) cu polygon translucent pentru bandă + polyline mid solidă (ca în prompt).

---

### 1.2 `src/data/material-prices.js:33` — `EUR_TO_RON = 5.00` static

```js
// Curs EUR/RON orientativ
export const EUR_TO_RON = 5.00;
```

**Impact:**
- Folosit în `Step8Advanced.jsx` (3920–3955) pentru a afișa prețuri materiale în RON/EUR + footer „Curs EUR/RON utilizat: 1 EUR = 5.00 RON" — vizibil utilizatorului.
- Diferă de fallback canonic (5.10) și de cursul live BNR (~5.05–5.15 actual).
- Inconsistență: utilizatorul poate vedea două valori diferite EUR/RON în aceeași sesiune (Step8 = 5.00 fix, restul aplicației = curs BNR live).

**Fix recomandat (Task B):** `import { getEurRonSync, REHAB_PRICES } from './rehab-prices.js'; const EUR_TO_RON = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;`

---

### 1.3 `src/components/ROICalculator.jsx:18-75` — DEFAULT_MEASURES cu curs FIX 4.97 (vechi)

```js
const DEFAULT_MEASURES = [
  { id: "izolatie_ext",    costPerM2: 209,   ... }, // 42 EUR/m² × 4.97 (rehab-prices: wall_eps_10cm mid)
  { id: "izolatie_pod",    costPerM2: 338,   ... }, // 68 EUR/m² × 4.97 (rehab-prices: roof_mw_25cm mid)
  { id: "ferestre_pvc",    costPerM2: 1392,  ... }, // 280 EUR/m² × 4.97
  { id: "centrala_cond",   costFixed: 8698,  ... }, // 1.750 EUR × 4.97
  { id: "panouri_solare",  costFixed: 9940,  ... }, // 2.000 EUR × 4.97
  { id: "izolatie_planseu",costPerM2: 159,   ... }, // 32 EUR/m² × 4.97
  { id: "pompa_caldura",   costFixed: 32305, ... }, // 6.500 EUR × 4.97
];
```

**Probleme:**
1. Curs **4.97** congelat la timpul scrierii (vs canonic actual **5.10**). Toate valorile RON sunt cu **2.6% sub realitate**.
2. Snapshot static al rehab-prices mid → orice update în `rehab-prices.js` NU se propagă automat aici.
3. Inconsistență cu graficul NPV Pas 5 (care folosește alte valori hardcodate, DIFERITE).

**Impact UI:**
- Componentă vizibilă utilizatorilor proprietari (lansare landing page) — afectează credibilitatea pre-vânzare.
- Afișează „Recuperare medie: X ani" cu erori sistematice ~3% în RON.

**Fix recomandat (NU este în prompt — propus pentru P2):** mapare la `getPriceRON()` ca în `LCCAnalysis.jsx` (helper `_p`). Decizie deferred.

---

### 1.4 `src/components/PVDegradation.jsx:58-59,122` — investiție auto 4.000 RON/kWp

```js
// Investiție: 800 EUR/kWp × 5 RON/EUR ≈ 4000 RON/kWp, sau custom
const investAuto = P0 * 4000;
...
placeholder:`auto: ${Math.round((parseFloat(pvPower)||5)*4000)} RON`
```

**Probleme:**
- 800 EUR/kWp este **27% sub** rehab-prices.pv_kwp.mid (1.100 EUR/kWp).
- Curs 5.00 RON/EUR (vs canonic 5.10).
- Rezultat: 4.000 RON/kWp vs realist 5.610 RON/kWp = **−29% subevaluat**.

**Impact:** afișează NPV / payback PV prea optimist în PVDegradation modal.

**Fix recomandat (NU în prompt — P2):** import `getPrice('renewables', 'pv_kwp', 'mid') × getEurRonSync()`.

---

### 1.5 `src/data/rehab-costs.js:8-32` — sursă LEGACY paralelă cu rehab-prices.js

```js
export const REHAB_COSTS = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},   // EUR/m² — single scenariu
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180, hpPerKw: 900, solarThPerM2: 380,
};
export const REHAB_COSTS_2025 = { ... }; // duplicat aproape identic + bms/evCharger
```

**Comparație cu rehab-prices mid (EUR):**

| Item REHAB_COSTS | Valoare | rehab-prices canonic | Verdict |
|---|---:|---:|---|
| insulWall[10] | 42 | wall_eps_10cm.mid = 49 | −14% |
| insulWall[15] | 62 | wall_eps_15cm.mid = 68 | −9% |
| insulRoof[15] | 42 | roof_eps_15cm.mid = 32 | +31% |
| insulRoof[25] | 68 | roof_mw_25cm.mid = 68 | 🟢 IDENTIC |
| windows[1.10] | 200 | windows_u110.mid = 200 | 🟢 IDENTIC |
| windows[0.90] | 280 | windows_u090.mid = 280 | 🟢 IDENTIC |
| hr80 | 5.500 | vmc_hr_80_per_m2.mid = 22 EUR/m²Au (×100m² = 2.200) | +150% (set vs m²) |
| hpPerKw | 900 | hp_aw_12kw.mid / 12 = 750 | +20% |
| pvPerM2 | 180 | pv_kwp.mid / 5 ≈ 220 (panou ~5m²/kWp) | −18% (m² vs kWp) |
| solarThPerM2 | 380 | solar_thermal_4m2.mid / 4 = 500 | −24% |

**Lanț de dependențe `rehab-costs.js`:**
```
rehab-costs.js
  ← energy-calc.jsx (REHAB_COSTS, REHAB_COSTS_2025)
  ← Step7Audit.jsx (REHAB_COSTS)
  ← Step6Certificate.jsx (REHAB_COSTS)
  ← unified-rehab-costs.js (REHAB_COSTS)
      ← Step7Audit.jsx (buildCanonicalMeasures)
      ← cpe-post-rehab-pdf.js
      ← report-generators.js
```

**Strategie:** Task C = doar marcare `@deprecated` (NU ștergere). Migrarea efectivă rămâne pentru post-Vercel-Pro din cauza riscului cascade pe 3 documente PDF.

---

### 1.6 `src/components/OfertaReabilitare.jsx` — NU are bază de prețuri, default scenariu LIPSEȘTE

**Stare actuală:**
- Investiția vine integral din `s.investitie` (input `<input type="number">` linia 396).
- Dacă există `passport`, `mkScenariiFromPassport()` prepopulează din pașaport (`phaseCost_RON` sumă pe faze) — implicit este scenariul folosit de pașaport (mid, vezi PasaportBasic.jsx:54).
- Nu există selector low/mid/high.
- Comentariu user-facing: *„Prețurile sunt estimative. Auditul energetic detaliat va preciza costurile exacte."* (linia 264) — bun ca disclaimer, dar fără referință la sursa rehab-prices.

**Fix recomandat (Task D):** scenariu default = **mid**, selector `[Optimist (low) ▾ / Realist (mid) / Conservator (high)]`, recalculare investiție din `calcPackageCost(measures, scenario)` la schimbare. Footer: *„Prețuri orientative {year} · sursa: piața RO + HG 907/2016 · curs EUR/RON: {eurRon} (BNR live)"*.

---

## 2. Locații MODERATE (hardcode non-canonic — DEFER P2)

### 2.1 Fallback-uri energie (RON/kWh) hardcodate

| Locație | Hardcode | Sursă canonică | Severitate |
|---|---|---|---|
| `Step7Audit.jsx:551-552` | `electricitate=1.40, gaz=0.45, default=0.35` (fallback când buildFinancialSummary fail) | `getEnergyPriceFromPreset(fuelId, "casnic_2025")` → 1.29 / 0.31 / 0.40 | 🟠 dead-code (fallback rar) |
| `Step5Calculation.jsx:1482-1483` | `gaz=0.31, electricitate=1.10, alt=0.30` (fallback când `energyPrices[fuelId]` lipsește) | idem | 🟠 fallback acceptabil pentru chart |
| `vmc-hr.js:131-133` | `0.12 EUR/kWh gaz, 0.28 EUR/kWh electricitate` | `getEnergyPriceFromPreset / getEurRonSync` | 🟠 |
| `grey-water-hr.js:62` | `energyPriceEurKwh default 0.12` | idem | 🟢 acceptabil ca default param |
| `unified-rehab-costs.js:251` | `energyPriceEURperKwh default 0.13` | idem | 🟢 acceptabil ca default param |

### 2.2 Costuri unitare HVAC/PV hardcodate

| Locație | Hardcode | Canonic mid (EUR) | Δ |
|---|---|---:|---:|
| `vmc-hr.js:130` | `cost_hr_eur = 150 × Au + 800` | vmc_hr_80_per_m2 = 22 EUR/m²Au | +580% (suprasta!) |
| `heat-pump-sizing.js:179` | `costEquipment = phi × 600` (HP sol-apă) | hp_aw_12kw = 750 EUR/kW | −20% |
| `heat-pump-sizing.js:262` | `costPerKw = 1800 (GA) sau 900 (default)` | 750 EUR/kW | +140% / +20% |
| `chp-detailed.js:187` | `invest = power × 3500` EUR/kW_el | chp_micro_1kwe = 11.000 EUR/set | n/a (schemă diferită) |
| `smart-rehab.js:256` | `costPV = pvKwp × 1100` | pv_kwp.mid = 1.100 | 🟢 IDENTIC (dar hardcode duplicat) |
| `rehab-comparator.js:26-31` | `hp_airwater: 55 EUR/m²Au, solar_th: 15 EUR/m²Au, pv_3kwp: 180 (depr)` | gross-rate non-comparabil | 🟠 normalizat per Au |
| `MEPSCheck.jsx:136-138` | `1500/2500/3500 RON/m²` (renovare ușoară/medie/profundă) | benchmark piață, NU rehab-prices | 🟠 acceptabil ca brut |
| `historic-buildings.js:155,169` | `28 / 110 RON/m²·cm` (calcar / aerogel) | specializat, fără canonic | 🟢 acceptabil |
| `AuditReport.jsx:181,192,202` | text PDF: `~250 EUR/m², 8.000-15.000 EUR, 4.500-6.000 EUR` | text static, nu calcul | 🟠 |

### 2.3 Inconsistență fallback EUR/RON `|| 5.05` (canonic = 5.10)

**12 locații** folosesc `getEurRonSync() || 5.05` în timp ce `REHAB_PRICES.eur_ron_fallback = 5.10`:

```
src/data/energy-prices-live.js:105
src/components/PasaportBasic.jsx:112
src/calc/unified-rehab-costs.js:38, 249
src/steps/Step7Audit.jsx:371, 1137, 1623, 1723, 2123, 2198, 2343, 2713
```

**Impact:** dead-code (deoarece `getEurRonSync()` întoarce mereu 5.10 sau cache/override valid). Cosmetic, dar inconsistent.

**Fix recomandat (P2):** înlocuire bulk `|| 5.05` → `|| 5.10` sau `|| REHAB_PRICES.eur_ron_fallback` (import).

---

## 3. Locații OK (folosesc canonic — NU modifica)

| Locație | Pattern canonic | Status |
|---|---|---|
| `src/components/LCCAnalysis.jsx:25` | `_p('envelope', 'wall_eps_10cm', 280)` via `getPriceRON()` | ✅ |
| `src/components/CostOptimalCurve.jsx:676` | text footer „Prețuri: rehab-prices.js Q1 2026" | ✅ |
| `src/calc/rehab-cost.js:10,219-228` | overlay `PRICES_CANONICAL` din `getPrice()` | ✅ |
| `src/calc/unified-rehab-costs.js:24-25` | `getEurRonSync()` (fallback 5.05 dar canonic) | ✅ logic / 🟠 fallback |
| `src/calc/rehab-comparator.js:28` | `_p('renewables', 'pv_kwp', 1100)` | ✅ pentru pv |
| `src/components/PasaportBasic.jsx:54,112` | `Math.round(costEur × eurRon)` cu `getEurRonSync()` | ✅ logic / 🟠 fallback |
| `src/steps/Step7Audit.jsx:1137-1139` | `getEnergyPriceFromPreset(fuelId, "casnic_2025")` + override sessionStorage + live Eurostat | ✅ |
| `src/steps/Step6Certificate.jsx` | folosește unified-rehab-costs (canonic prin lanț) | ✅ tranzitiv |

---

## 4. Tabel comparativ rehab-prices.js (canonic) vs rehab-costs.js (legacy)

> Pentru migrarea Task C `@deprecated`. Toate valorile EUR.

| Element | rehab-costs.js (legacy) | rehab-prices.js mid | rehab-prices.js bandă (low–high) | Decizie |
|---|---:|---:|---:|---|
| **Pereți EPS 10cm** | 42 | 49 | 42 – 60 | low ≈ legacy ✓ — folosi mid 49 |
| **Pereți EPS 15cm** | 62 | 68 | 58 – 82 | low ≈ legacy ✓ — folosi mid 68 |
| **Acoperiș EPS 15cm** | 42 | 32 | 28 – 40 | legacy SUPRASTA — folosi mid 32 |
| **Acoperiș MW 25cm** | 68 | 68 | 55 – 82 | identic |
| **Subsol XPS 10cm** | 56 | 32 | 28 – 38 | legacy SUPRASTA 75% — folosi mid 32 |
| **Ferestre U≤1.10** | 200 | 200 | 170 – 240 | identic |
| **Ferestre U≤0.90** | 280 | 280 | 240 – 330 | identic |
| **VMC HR 80%** | 5.500 fix | 22/m²Au | 18 – 28/m²Au | schemă diferită (set vs m²) — verificare per proiect |
| **HP aer-apă (per kW)** | 900 | 750 (12kW÷12) | 583 – 958 | legacy peste mid, în bandă |
| **PV (per kWp)** | 900 (180/m² × 5m²/kWp) | 1.100 | 900 – 1.350 | legacy = low ✓ |
| **Solar termic ACM (per m²)** | 380 | 500 (2.000/4m²) | 400 – 625 | legacy SUB low — folosi low 400 |

**Concluzie:** majoritar legacy = scenariul **low** sau ușor sub low. Migrarea măsurilor existente la `mid` înseamnă +10–25% costuri afișate. Aceasta e mai realistă vs piața Q1 2026.

---

## 5. Plan implementare Faza 2

### 5.1 Task A — NPV chart 3 scenarii bandă (`Step5Calculation.jsx:1489`)

**Scope:** mapare `MEASURE_DEFS[]` cu `costFn(Au, eurRon)` returnând `{low, mid, high}`. Render SVG cu polygon bandă + polyline low/high punctate + polyline mid solidă + break-even pe mid + label end-of-line. Badge sub titlu cu sursă + curs.

**Fișiere modificate:** 1 (Step5Calculation.jsx ~50 linii adăugate, ~30 linii înlocuite).

**Risc regresie:** mic — chart e izolat, gated `npvCurve`.

**Estimare:** 60–90 min implementare + 15 min teste vizuale.

### 5.2 Task B — `material-prices.js` EUR/RON dinamic (linia 33)

**Scope:** înlocuire `const EUR_TO_RON = 5.00` cu `import { getEurRonSync, REHAB_PRICES } ... ; const EUR_TO_RON = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;`. Verificare propagare în Step8Advanced.jsx tab materiale.

**Fișiere modificate:** 1 (material-prices.js, 2 linii).

**Risc regresie:** foarte mic — doar valoare numerică.

**Estimare:** 10 min + 5 min testare vizuală Step8 tab materiale.

### 5.3 Task C — `rehab-costs.js` `@deprecated` (doar comentariu)

**Scope:** adăugare JSDoc `@deprecated` cu trimitere la `rehab-prices.js` și listă fișiere care încă folosesc legacy. Fără modificări de cod logic.

**Fișiere modificate:** 1 (rehab-costs.js, ~6 linii comentariu).

**Risc regresie:** zero.

**Estimare:** 5 min.

### 5.4 Task D — `OfertaReabilitare.jsx` scenariu MID + selector

**Scope:**
1. Adăugare state `[scenarioMode, setScenarioMode] = useState('mid')`.
2. Selector UI 3 butoane (Optimist / Realist / Conservator) lângă „Adaugă scenariu".
3. Refactor `mkScenariiFromPassport` → `mkScenariiFromPassportAndPrices` care folosește `calcPackageCost(measures, scenarioMode)` din rehab-prices.
4. Recalculare live la schimbare via `useMemo`.
5. Footer extins cu sursa + curs EUR/RON.

**Fișiere modificate:** 1 (OfertaReabilitare.jsx, ~40 linii noi, ~20 înlocuite).

**Risc regresie:** moderat — componentă cu PDF gen, trebuie testat că PDF-ul reflectă scenariul activ.

**Estimare:** 90–120 min implementare + 30 min testare PDF + UI.

### 5.5 Reguli pentru toate task-urile

1. ✅ Citit complet `rehab-prices.js` și `unified-rehab-costs.js` ÎNAINTE de orice edit.
2. ✅ NU modifica `rehab-costs.js` (doar comentariu @deprecated).
3. ✅ NU modifica `unified-rehab-costs.js` (risc cascade 3 PDF-uri).
4. ✅ După fiecare task: `npm run test -- --reporter=dot`.
5. ✅ Commit local după fiecare task + teste OK (mesaj clar, fără emoji, în RO cu diacritice).
6. ✅ NU push / NU deploy fără confirmare explicită.
7. ✅ STOP și raport dacă un task afectează > 3 fișiere neașteptate.

---

## 6. Restanțe pentru sprinturi viitoare (NU în acest prompt)

P2 propus (după confirmarea Faza 2 actuală):
- ROICalculator.jsx → migrare DEFAULT_MEASURES la `getPriceRON()` cu curs live.
- PVDegradation.jsx → fallback investiție din `getPrice('renewables', 'pv_kwp', 'mid')`.
- Step5Calculation.jsx + Step7Audit.jsx → eliminare fallback-uri energie hardcodate (`gaz=0.31`, `electricitate=1.40` etc.) în favoarea `getEnergyPriceFromPreset()`.
- vmc-hr.js, heat-pump-sizing.js, chp-detailed.js → migrare la `getPrice()` din rehab-prices canonic.
- Bulk replace `|| 5.05` → `|| REHAB_PRICES.eur_ron_fallback` (12 locații).
- Auditare suggestions-catalog.js (priceRange `min/max`/RON) — verificare aliniere cu rehab-prices și consolidare schema.

P3 propus:
- Migrare integrală `unified-rehab-costs.js` → `rehab-prices.js` cu păstrare backward-compat pentru CPE Post-Rehab + Pașaport + Deviz PDF.
- Eliminare `rehab-costs.js` complet.

---

**STOP — sfârșit Faza 1. Aștept confirmarea utilizatorului pentru declanșarea Faza 2 (Task A → B → C → D, secvențial cu commit local după fiecare).**

---

# §7. Status POST-SPRINT (9 mai 2026 — 22:30 EEST)

Sprint Audit Prețuri MARATON FINALIZAT cu **10+ commit-uri** cumulative. Bilanț punct cu punct vs raport inițial:

## §7.1 — Status itemi CRITICI (Faza 1 §1 inițial)

| # Original | Locație | Stare INIȚIALĂ | Stare POST-SPRINT |
|---:|---|---|---|
| 1.1 | Step5 NPV chart hardcoded 2-3× subevaluat | 🔴 critic | ✅ **REZOLVAT** Task A — 3 scenarii bandă din `rehab-prices.js` canonic |
| 1.2 | `material-prices.js` EUR/RON 5.00 fix | 🔴 critic | ✅ **REZOLVAT** Task B — `getEurRonSync()` BNR live |
| 1.3 | `ROICalculator` curs 4.97 vechi | 🔴 critic | ✅ **REZOLVAT** P2.1 — `getPriceRON('mid')` live |
| 1.4 | `PVDegradation` 4000 RON/kWp | 🔴 critic | ✅ **REZOLVAT** P2.2 — 5610 RON/kWp via `getPrice('renewables', 'pv_kwp')` |
| 1.5 | `rehab-costs.js` legacy paralel | 🔴 critic | ✅ **REZOLVAT** P3.2 + P4.6 — fișier ELIMINAT, `ZONE_COLORS` extras în `zone-colors.js` |
| 1.6 | `OfertaReabilitare` fără 3 scenarii | 🔴 critic | ✅ **REZOLVAT** Task D — selector low/mid/high cu multiplicator (0.85/1.0/1.18) + GHID modal |

**Bilanț CRITICE: 6/6 REZOLVATE ✅**

## §7.2 — Status itemi MODERATE (Faza 1 §2 inițial)

| # | Locație | Stare POST-SPRINT |
|---:|---|---|
| 2.1.a | `Step7Audit:551` electricitate=1.40 fallback | ✅ P2.3 — `getEnergyPriceFromPreset(fuel, "casnic_2025")` |
| 2.1.b | `Step5Calculation:1482` fallback gaz=0.31, electricitate=1.10 | ✅ P2.3 — `getEnergyPriceFromPreset` |
| 2.1.c | `vmc-hr.js:131-133` 0.12/0.28 EUR/kWh | ✅ P2.4 — `getEnergyPriceFromPreset` + curs canonic |
| 2.2.a | `vmc-hr.js:130` 150 EUR/m² + 800 fix hardcoded | ✅ P3.3 — `vmc_hr_full_install_per_m2` + `_fixed` în `rehab-prices` |
| 2.2.b | `heat-pump-sizing.js` 600/900/1800 EUR/kW | ✅ P2.4 + P4.7 — `getPrice('heating', 'hp_aw_*')` cu scaling per putere |
| 2.2.c | `chp-detailed.js` 3500 RON/kW_el flat | ✅ P3.4 — `getCHPInvestmentPerKW(power)` cu 3 tier-uri (micro/small/commercial) |
| 2.2.d | `smart-rehab.js` 1100 EUR/kWp duplicat | ✅ P2.4 — `getPrice('renewables', 'pv_kwp')` |
| 2.2.e | `rehab-comparator.js` 55/15 EUR/m²Au gross | ✅ P2.4 — comentarii canonice explicite (gross-rate intenționat) |
| 2.2.f | `MEPSCheck.jsx:136-138` 1500/2500/3500 RON/m² | 🟡 NU MODIFICAT — heuristică separată, nu prețuri unitare |
| 2.2.g | `historic-buildings.js` 28/110 RON/m²·cm | 🟡 NU MODIFICAT — clădiri istorice specializate |
| 2.2.h | `AuditReport.jsx:181,192,202` text PDF | 🟡 NU MODIFICAT — text estimativ, nu calcul |
| 2.3 | Bulk `\|\| 5.05` × 12 fișiere | ✅ P2.5 — `\|\| REHAB_PRICES.eur_ron_fallback` |

**Bilanț MODERATE: 9/12 REZOLVATE, 3 confirmate ca exclus din scope (MEPS heuristic / istoric specializat / text PDF).**

## §7.3 — Itemi NOI rezolvați (dincolo de raport inițial)

Sprint a depășit scope-ul Faza 2 inițial cu următoarele:

- **Tier 1** — Indexare inflație construcții via Eurostat `sts_copi_q` (modul nou `cost-index.js` + 29 teste)
- **#1** Cross-document consistency tests (Deviz↔CPE↔Pașaport, paritate **<5% post-P4.7** vs ~70% inițial)
- **#2** Outlier warnings auditor cu 5 levels (`cost-outlier-detector.js` + 17 teste)
- **#3** Currency switch global Auto/EUR/RON (`currency-context.js` + `CurrencyToggle.jsx`, integrat în Step5 NPV + CostOptimalCurve + OfertaReabilitare)
- **#4** Telemetrie prețuri `Pret.{action}` FIFO 1000 (`price-telemetry.js` + 15 teste)
- **#5** Snapshot regression demo M1-M5 (11 snapshots, 3 revisions)
- **#6** GHID modal auditor scenariu cu tabel orientativ (locație/sezon/tip clădire)
- **P4.1** energy-calc.jsx RehabComparator inline migrat la canonic
- **P4.2** Step7Audit cost breakdown migrat la canonic
- **P4.3+P4.7** `rehab-cost.js` Deviz Estimativ migrare completă (formula incrementală → flat `getPrice`)
- **P4.6** `rehab-costs.js` ELIMINAT COMPLET (fișier șters din index)
- **A** Reactivare tab `oferta_reab` în Step8Advanced (toate îmbunătățirile vizibile auditor)
- **B** CurrencyToggle integrat activ în 3 componente cheie

## §7.4 — Test suite

| Sprint | PASS | Note |
|---|---:|---|
| Pre-Sprint (baseline) | 3.326 | Linia de bază 9 mai 2026 |
| Post Tier 1 + P2 | 3.370 | +44 teste |
| Post P3 + 6 îmbunătățiri | 3.437 | +67 teste |
| Post P4 + A+B+P4.7+D+E | **3.444** | +118 cumulativ |

**1 fail preexistent `cooling-s9a.test.js` (fără legătură cu prețuri).**

## §7.5 — Restanțe DEFERRED (NU lansa autonom)

- **P4.4** PDF generators consume `fmtMoney` + `getCurrencyMode` (dual EUR/RON export automat) — 4-5h
- **P4.5** Backend telemetrie endpoint serverless `_deferred/price-analytics` — 2h post Vercel Pro
- **P4.airtightness** Reactivare opt-in airtightness în Deviz cu param `addAirtightness: true`

## §7.6 — Concluzie practică

**Auditorul beneficiază imediat de:**
1. **NPV chart Pas 5** cu prețuri realiste piață Q1 2026 (anterior subevaluare 2-3×)
2. **CPE Post-Rehab + Pașaport + Foaie de parcurs** — toate 3 documente folosesc același helper canonic (paritate <5% vs Deviz)
3. **Selector low/mid/high** în Ofertă cu GHID profesional + outlier warnings
4. **Currency toggle** Auto/EUR/RON în UI principal (PDF dual currency în P4.4 deferred)
5. **Indexare automată inflație** Eurostat — prețurile se actualizează fără recalibrare manuală

**Documentele oficiale Pas 6 (CPE + Anexa 1+2)** nu au fost afectate numeric — clasele energetice și datele clădirii rămân neatinse. Anexa 2 are doar îmbunătățire arhitecturală (PV cost via `getPrice` în loc de hardcode 1100, valoare numerică identică).

