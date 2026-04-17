/**
 * renewable-systems.js — DEPRECATED SHIM (Sprint 6, 17 apr 2026)
 *
 * @deprecated Fișierul original (600 LOC) era COMPLET ORFAN — zero consumatori
 * în codebase. Conținea cataloage paralele (SOLAR_THERMAL_SYSTEMS,
 * PHOTOVOLTAIC_SYSTEMS, HEAT_PUMP_TYPES, BIOMASS_SYSTEMS, CHP_SYSTEMS,
 * VENTILATION_SYSTEMS, LIGHTING_SYSTEMS) duplicate față de sursa canonică
 * din `src/data/constants.js` (SOLAR_THERMAL_TYPES, PV_TYPES, HEAT_SOURCES,
 * BIOMASS_TYPES, etc.).
 *
 * Sprint 6 a păstrat doar `SMALL_WIND_TURBINES` (unicul set valoros fără
 * duplicat în constants.js) pentru integrare viitoare în Step 4 Eolian
 * (Sprint 7: formula Betz + clase vânt IEC 61400).
 *
 * MIGRARE: codul nou NU trebuie să importe nimic din acest fișier.
 * Pentru tipuri PV/solar-termic/biomasă/PC/CHP — folosiți constants.js.
 *
 * Referințe: AUDIT_12_step8_renewables.md §8 (recomandare P9), SPRINT_06_regenerabile_raport.md
 */

// Re-export din sursa canonică pentru orice cod legacy care ar ajunge să importe
export {
  SOLAR_THERMAL_TYPES as SOLAR_THERMAL_SYSTEMS,
  PV_TYPES as PHOTOVOLTAIC_SYSTEMS,
  HEAT_SOURCES as HEAT_PUMP_TYPES,
  BIOMASS_TYPES as BIOMASS_SYSTEMS,
} from "./constants.js";

export { CHP_TYPES_CATALOG as CHP_SYSTEMS } from "../calc/chp-detailed.js";

// ── Turbine eoliene mici ────────────────────────────────────────────
// Singurul set fără duplicat în constants.js. Păstrat pentru Sprint 7 (formula Betz + IEC 61400).
// Producție anuală estimată pentru clase de vânt I-III (România — Dobrogea, Moldova, Banat Sud).
export const SMALL_WIND_TURBINES = [
  {
    id: "WT_1KW",
    label: "Turbină eoliană 1 kW (orizontală, micro)",
    power_nominal_kw: 1,
    rotor_diameter_m: 2.5,
    annual_production_kwh: 2000,
    wind_class: "I-II",
    price_eur: 3000,
    notes: "Micro-turbină, pentru sit cu vânt bun (V_med ≥ 5 m/s)",
  },
  {
    id: "WT_5KW",
    label: "Turbină eoliană 5 kW (orizontală, mică)",
    power_nominal_kw: 5,
    rotor_diameter_m: 6.0,
    annual_production_kwh: 12000,
    wind_class: "II-III",
    price_eur: 15000,
    notes: "Mediu, pentru ferme și proprietăți mari",
  },
  {
    id: "WT_10KW",
    label: "Turbină eoliană 10 kW (orizontală, mică)",
    power_nominal_kw: 10,
    rotor_diameter_m: 8.0,
    annual_production_kwh: 25000,
    wind_class: "III",
    price_eur: 30000,
    notes: "Pentru sit cu vânt excelent (V_med ≥ 7 m/s, Dobrogea)",
  },
];
