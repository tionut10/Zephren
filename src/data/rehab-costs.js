/**
 * rehab-costs.js — ⚠️ LEGACY · @deprecated
 *
 * @deprecated FOLOSIȚI `src/data/rehab-prices.js` (3 scenarii low/mid/high cu
 * helperi getPrice/getPriceRON/calcPackageCost + curs EUR/RON live BNR + Tier 1
 * indexare inflație Eurostat) sau `src/calc/unified-rehab-costs.js` (canonical
 * deja migrat la rehab-prices în P3.1).
 *
 * STATUS POST-P3.1 + P3.2 (9 mai 2026):
 *   ✅ unified-rehab-costs.js — MIGRAT la rehab-prices canonic (P3.1)
 *   ✅ Step6Certificate.jsx — dead import ELIMINAT (P3.2)
 *   ⚠️ src/energy-calc.jsx — încă folosește REHAB_COSTS + REHAB_COSTS_2025
 *      (~7 utilizări la liniile 1893-1917, calc rapid investiție RehabComparator).
 *   ⚠️ src/steps/Step7Audit.jsx — încă folosește REHAB_COSTS (~5 utilizări la
 *      liniile 309-330, calc CPE Post-Rehab cost breakdown).
 *
 * Migrarea completă a fost amânată (P4 deferred) datorită riscului cascade pe
 * CPE certificate logic — necesită sprint dedicat cu testing extensiv pe
 * Step6/Step7 (testing-ul curent acoperă unified-rehab-costs migrat).
 *
 * ZONE_COLORS este folosit doar pentru UI (culori zone climatice I-V) — NU
 * are legătură cu prețurile reabilitare.
 *
 * Comparație legacy vs canonic mid (referință):
 *   insulWall[10]: 42 (legacy) → 49 (mid canonic, low 42 ✓)
 *   insulRoof[15]: 42 (legacy) → 32 (mid canonic, supraestimat)
 *   pvPerM2: 180 → pv_kwp.mid 1.100 EUR/kWp (schemă diferită)
 *   hpPerKw: 900 → hp_aw_12kw.mid/12 = 750 EUR/kW
 *
 * Trigger eliminare completă: cerere explicită „lansează P4 elimină rehab-costs"
 * + buget 4-6h pentru refactor + testing Step6/Step7.
 */

export const ZONE_COLORS = { I:"#22c55e", II:"#eab308", III:"#f97316", IV:"#ef4444", V:"#7c3aed" };

export const REHAB_COSTS = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  hpPerKw: 900,
  solarThPerM2: 380,
};

export const REHAB_COSTS_2025 = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  pvPerKwp: 1100,
  hpAerApa: 900,
  hpSolApa: 1400,
  solarThPerM2: 380,
  bmsSimple: 2000, bmsComplex: 8000,
  evCharger: 1500,
};
