# Arhitectura Prețurilor Zephren — Ghid pentru Dezvoltatori

> **Audiență:** dezvoltatori care lucrează cu costurile de reabilitare, prețurile energiei, conversia EUR/RON și emiterea de documente cu sume.
> **Ultim update:** 9 mai 2026 (post Sprint Audit Prețuri MARATON)

---

## §1. Sursele canonice

Lanțul de prețuri Zephren are **3 surse canonice** + 1 strat de **indexare temporală** + 1 strat de **prezentare UI**:

```
┌─────────────────────────────────────────────────────────────────┐
│                  STRAT PREZENTARE (UI + PDF)                     │
│       currency-context.js (fmtMoney + getCurrencyMode)           │
│         ↓ folosit de: Step5 NPV, CostOptimal, Ofertă             │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│              STRAT INDEXARE INFLAȚIE (Tier 1)                    │
│           cost-index.js (Eurostat sts_copi_q RO)                 │
│   ↓ aplicat în Step5 + OfertaReabilitare ca multiplicator        │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                  STRAT CALCUL CANONIC                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ rehab-prices.js  │  │  energy-prices.js│  │ material-prices│ │
│  │  (3 scenarii     │  │  (4 preseturi    │  │  (Step8 tab    │ │
│  │   low/mid/high)  │  │   ANRE 2025)     │  │   materiale)   │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│           ↑                    ↑                    ↑           │
│  ┌────────┴──────────┐  ┌──────┴───────┐  ┌────────┴────────┐  │
│  │ getPrice/getPrice │  │ getEnergyPrice│  │ MATERIAL_PRICES │  │
│  │ RON/calcPackage   │  │ FromPreset    │  │ _2025 obj static│  │
│  └───────────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│              CONSUMERS (calc engine + UI + PDF)                  │
│   unified-rehab-costs.buildCanonicalMeasures (CPE/Pașaport/Deviz)│
│   ROICalculator / PVDegradation / OfertaReabilitare              │
│   smart-rehab.js / heat-pump-sizing / chp-detailed / vmc-hr      │
│   energy-calc.jsx financialAnalysis                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## §2. `rehab-prices.js` — sursa canonică pentru reabilitare

**Locație:** `src/data/rehab-prices.js`
**Schemă:** 3 scenarii pentru fiecare item: `{ low, mid, high, lifespan, unit }`
**Categorii:**
- `envelope` — pereți (eps/mw/pur), acoperiș (eps/xps/mw), planșeu, ferestre (u070/u090/u110/u140), etanșare
- `heating` — cazane condensație, pompe căldură (hp_aw_8/12/16, hp_aa_multisplit), solar termic, ACM
- `cooling` — chillere, VMC HR (gross + full-install)
- `renewables` — PV (per kWp), CHP (3 tier-uri micro/small/commercial), biomasă
- `lighting` — LED, senzori, DALI
- `bacs` — automatizare clase A/B/C/D

**API public:**
```js
import {
  REHAB_PRICES,           // raw object
  getPrice,               // (cat, item, scenario='mid') → { price, unit, lifespan }
  getPriceRON,            // identic cu RON convertit (curs live BNR)
  calcPackageCost,        // (measures[]) → { low, mid, high } total EUR
  getEurRonSync,          // sync (cache localStorage 24h)
  getLiveEurRon,          // async (Frankfurter API + cache)
  setUserEurRon,          // override sessionStorage
  getCHPInvestmentPerKW,  // (power_kW, scenario) → tier auto-selectat
} from "./data/rehab-prices.js";
```

**Curs EUR/RON:**
- Sursă primară: Frankfurter API (gratuit, ECB ≈ BNR)
- Cache: `localStorage` 24h
- Override: `sessionStorage` per sesiune
- Fallback: `REHAB_PRICES.eur_ron_fallback` = 5.10

---

## §3. `cost-index.js` — Tier 1 indexare inflație

**Locație:** `src/data/cost-index.js`
**Sursă:** Eurostat `sts_copi_q` (Construction Cost Index, residential RO, quarterly)
**URL:** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_copi_q?geo=RO&unit=I21&s_adj=NSA&format=JSON`

**Comportament:**
- Pre-fetch în background la mount Step5/OfertaReabilitare
- Cache 30 zile localStorage
- Fallback factor = 1.0 (no inflation, prețurile rehab-prices.js Q1 2026 baseline)
- Sanitize: factor între 0.5–3.0 (rezistă la outlier)

**API public:**
```js
import {
  getCostInflationFactor,         // async fetch + cache
  getCostInflationFactorSync,     // sync — cache sau fallback
  getInflationAdjustedPrice,      // wrapper rehab-prices cu factor aplicat
  getInflationAdjustedPriceRON,   // identic în RON
  setUserCostInflationOverride,   // what-if testing
} from "./data/cost-index.js";
```

---

## §4. `currency-context.js` — strat prezentare global

**Locație:** `src/data/currency-context.js`
**Componentă:** `src/components/CurrencyToggle.jsx`

**3 moduri (persistate în localStorage):**
- `auto` — afișează ambele monede unde relevant (default)
- `EUR` — toate sumele convertite la EUR
- `RON` — toate sumele convertite la RON

**Hook React:**
```js
import { useCurrencyMode } from "./components/CurrencyToggle.jsx";
import { fmtMoney } from "./data/currency-context.js";

function MyComponent() {
  const currencyMode = useCurrencyMode();
  return <div>{fmtMoney(5100, "RON", { target: currencyMode, eurRon: 5.10 })}</div>;
}
```

**Format output:**
- `auto` + sursa "RON": `"5.100 RON (1.000 EUR)"`
- `EUR`: `"1.000 EUR"`
- `RON`: `"5.100 RON"`

---

## §5. `unified-rehab-costs.js` — calcul canonic 3 documente

**Locație:** `src/calc/unified-rehab-costs.js`
**Folosit de:** CPE Post-Rehab PDF + Pașaport Renovare + Foaie de parcurs

**Funcție principală:**
```js
import { buildCanonicalMeasures, buildFinancialSummary } from "./calc/unified-rehab-costs.js";

const measures = buildCanonicalMeasures(
  rehabScenarioInputs,    // { addInsulWall, insulWallThickness, addHP, hpPower, ... }
  opaqueElements,         // [{ type: 'PE', area: '150' }, ...]
  glazingElements,        // [{ area: '20' }, ...]
  { eurRon: 5.10, scenario: 'mid' }
);
// measures[i] = { id, label, qty, unit, costEUR, costRON, normativ, ... }

const summary = buildFinancialSummary(measures, {
  eurRon: 5.10,
  qfSavedKwh: 100 * Au,
  energyPriceEURperKwh: 0.13,
  tvaRate: 0.21,
});
// summary = { totalEUR, totalRON, totalWithTvaRON, paybackYears, ... }
```

**Helperi interni `_internals`** pentru selecție tier:
- `_resolveWallKey(thickness, type)` — wall_eps_10cm/15cm, wall_mw_10cm/15cm, wall_pur_8cm
- `_resolveRoofKey(thickness, type)` — roof_eps_15cm, roof_xps_12cm, roof_mw_25cm
- `_resolveWindowKey(U)` — windows_u070/u090/u110/u140

---

## §6. Convenții pentru noi consumatori

### Cum scriu cod NOU care folosește prețuri:

**❌ Greșit — hardcoded:**
```js
const wallCost = wallArea * 42; // 42 EUR/m² hardcoded
const eurRon = 5.10; // curs hardcoded
```

**✅ Corect — canonic:**
```js
import { getPrice, getEurRonSync, REHAB_PRICES } from "../data/rehab-prices.js";

const wallCost = wallArea * getPrice("envelope", "wall_eps_10cm", "mid").price;
const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
```

**✅ Pentru afișare în UI:**
```js
import { fmtMoney } from "../data/currency-context.js";
import { useCurrencyMode } from "./CurrencyToggle.jsx";

const mode = useCurrencyMode();
return <span>{fmtMoney(costRON, "RON", { target: mode, eurRon })}</span>;
```

**✅ Pentru telemetrie (analitică):**
```js
import { logPriceEvent } from "../data/price-telemetry.js";

logPriceEvent("scenario.changed", { mode: "mid", multiplier: 1.0 });
logPriceEvent("outlier.flagged", { level: "warn-high", deltaPct: 25 });
```

---

## §7. Test suite obligatoriu

Orice modificare de prețuri trebuie să treacă următoarele teste:

1. `rehab-prices.test.js` — schema canonică (3 scenarii pentru fiecare item)
2. `cost-index.test.js` — Eurostat fetch + cache + fallback
3. `cross-document-consistency.test.js` — paritate Deviz↔CPE↔Pașaport ±5%
4. `demo-financial-snapshot.test.js` — regresie demo M1-M5
5. `cost-outlier-detector.test.js` — detecție outlier ±0.85/+0.18
6. `currency-context.test.js` + `currency-cross-integration.test.js` — round-trip EUR↔RON
7. `price-telemetry.test.js` — FIFO 1000 events

**Pentru actualizarea snapshot-urilor după modificări deliberate:** `npm run test -- -u`

---

## §8. Restanțe (P4 deferred)

| Task | Estimare | Status |
|---|---:|---|
| **P4.4** PDF generators consume `fmtMoney` + `getCurrencyMode` (dual EUR/RON export automat) | 4-5h | Deferred |
| **P4.5** Backend telemetrie endpoint serverless `/api/_deferred/price-analytics` | 2h | Deferred (post Vercel Pro) |
| **P4.airtightness** Reactivare opt-in airtightness în Deviz cu param explicit | 1h | Deferred (modificare API) |
| Migrare `material-prices.js` la rehab-prices canonic | 2-3h | Deferred (schemă diferită — material-only vs sistem instalat) |

---

## §9. Referințe rapide

- **Raport audit complet:** `docs/AUDIT_PRETURI_2026-05-09.md` (50+ locații analizate, §7 status post-sprint)
- **Test snapshot M1-M5:** `src/calc/__tests__/__snapshots__/demo-financial-snapshot.test.js.snap`
- **Memory pointer Sprint:** `~/.claude/.../sprint_p3_6_imbunatatiri_09may2026.md`

---

**Întrebări sau probleme?** Consultați secțiunea §6 pentru convenții, §7 pentru teste obligatorii, §8 pentru restanțe deferred. Pentru orice modificare a `rehab-prices.js`, asigurați-vă că **demo-financial-snapshot.test.js** este actualizat cu confirmare deliberată (`npm run test -- -u`).
