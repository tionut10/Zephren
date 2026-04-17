/**
 * Cogenerare CHP (Combined Heat and Power) — calcul detaliat
 * Referințe:
 * - SR EN 15316-4-4:2017 — Sisteme de generare căldură, cogenerare
 * - SR EN 50465:2015 — Aparate de cogenerare pe gaz
 * - Directiva 2012/27/UE — Eficiență energetică (art.14 — cogenerare)
 * - SR EN ISO 52000-1:2017 — Factori de energie primară
 * - Mc 001-2022 — Metodologia de calcul certificare energetică (România)
 *
 * Sprint 6 (17 apr 2026): aliniere constante cu FUELS (constants.js) și FP_ELEC (u-reference.js)
 *   - FP_ELEC_GRID: 2.50 → 2.62 (Mc 001-2022 valoare oficială)
 *   - CHP_FUEL_FACTORS: derivate din FUELS (gaz=1.17/0.202, biogaz=0.00+1.00/0.025, hidrogen=0.00+1.00/0.000, motorina=1.10/0.263, gpl=1.15/0.227)
 *
 * Principiu: cogenerarea produce simultan energie electrică și termică
 * dintr-un singur combustibil, cu eficiență totală 85-92%, reducând
 * consumul de energie primară și emisiile de CO₂ față de producerea
 * separată.
 */

import { FUELS } from "../data/constants.js";
import { FP_ELEC } from "../data/u-reference.js";

// ── Catalog tipuri CHP ──────────────────────────────────────────
// Parametri tipici conform EN 50465 + date producători
export const CHP_TYPES_CATALOG = {
  micro_stirling: {
    label: "Micro-CHP Stirling (0.5-1 kW_el)",
    eta_elec: 0.15, eta_th: 0.75, power_range: [0.5, 1],
    lifetime_h: 60_000, maintenance_eur_h: 0.02,
  },
  micro_ice: {
    label: "Micro-CHP Motor ICE (1-5 kW_el)",
    eta_elec: 0.25, eta_th: 0.63, power_range: [1, 5],
    lifetime_h: 40_000, maintenance_eur_h: 0.03,
  },
  mini_ice: {
    label: "Mini-CHP Motor ICE (5-50 kW_el)",
    eta_elec: 0.30, eta_th: 0.55, power_range: [5, 50],
    lifetime_h: 50_000, maintenance_eur_h: 0.025,
  },
  medium_ice: {
    label: "CHP Motor ICE (50-500 kW_el)",
    eta_elec: 0.35, eta_th: 0.50, power_range: [50, 500],
    lifetime_h: 60_000, maintenance_eur_h: 0.02,
  },
  gas_turbine: {
    label: "CHP Turbină gaz (>500 kW_el)",
    eta_elec: 0.33, eta_th: 0.48, power_range: [500, 10_000],
    lifetime_h: 80_000, maintenance_eur_h: 0.015,
  },
  fuel_cell: {
    label: "CHP Celulă de combustibil (0.7-5 kW_el)",
    eta_elec: 0.40, eta_th: 0.45, power_range: [0.7, 5],
    lifetime_h: 80_000, maintenance_eur_h: 0.01,
  },
};

// ── Factori combustibil derivați din FUELS (constants.js) ────────
// Sprint 6: eliminare hardcodări locale, sursă unică de adevăr Mc 001-2022
// CHP → FUELS id mapping: natural_gas→gaz, biogas→biogas, lpg→gpl, hydrogen→hidrogen, diesel→motorina
function fuelFromConstants(fuelId, label, price_ron_kWh) {
  const f = FUELS.find(x => x.id === fuelId);
  if (!f) {
    // fallback protector — nu ar trebui atins dacă FUELS e corect definit
    return { label, fp: 1.17, co2_kg_kWh: 0.202, price_ron_kWh };
  }
  return {
    label: label || f.label,
    fp: f.fP_tot,              // factor energie primară total (nren + ren)
    fp_nren: f.fP_nren,
    fp_ren: f.fP_ren,
    co2_kg_kWh: f.fCO2,
    price_ron_kWh: price_ron_kWh ?? f.price_lei_kwh,
  };
}

export const CHP_FUEL_FACTORS = {
  natural_gas: fuelFromConstants("gaz",      "Gaz natural",                   0.31),
  biogas:      fuelFromConstants("biogas",   "Biogaz",                        0.42),
  lpg:         fuelFromConstants("gpl",      "GPL (gaz petrolier lichefiat)", 0.52),
  hydrogen:    fuelFromConstants("hidrogen", "Hidrogen verde",                1.20),
  diesel:      fuelFromConstants("motorina", "Motorină",                      0.75),
};

// ── Factori referință producere separată ─────────────────────────
// Conform Directiva 2012/27/UE Anexa II
const REF_ETA_ELEC = 0.40; // eficiență referință centrală electrică
const REF_ETA_TH  = 0.90;  // eficiență referință centrală termică
const FP_ELEC_GRID = FP_ELEC; // = 2.62 (Mc 001-2022, u-reference.js) — Sprint 6 aliniat
const PRICE_ELEC_RON_KWH = 1.40; // preț electricitate [RON/kWh]

/**
 * Calcul detaliat cogenerare CHP
 *
 * @param {object} params
 * @param {number} params.powerElec_kW — putere electrică instalată [kW]
 * @param {number} params.eta_elec — eficiență electrică [0-1] (sau din catalog)
 * @param {number} params.eta_th — eficiență termică [0-1] (sau din catalog)
 * @param {number} params.operatingHours — ore de funcționare anuale [h/an] (default 5000)
 * @param {string} params.fuelType — tip combustibil (cheie din CHP_FUEL_FACTORS)
 * @param {number} params.heatDemand_kWh — necesarul termic anual al clădirii [kWh/an]
 * @param {number} params.elecDemand_kWh — necesarul electric anual al clădirii [kWh/an]
 * @param {string} params.chpType — tip CHP (cheie din CHP_TYPES_CATALOG)
 * @param {number} params.investCost_ron — cost investiție [RON] (default estimare)
 * @returns {object} rezultat complet CHP
 */
export function calcCHP({
  powerElec_kW = 5,
  eta_elec,
  eta_th,
  operatingHours = 5000,
  fuelType = "natural_gas",
  heatDemand_kWh = 30_000,
  elecDemand_kWh = 10_000,
  chpType = "mini_ice",
  investCost_ron = null,
} = {}) {
  // ── 1. Selectare parametri din catalog ─────────────────────
  const catalog = CHP_TYPES_CATALOG[chpType] || CHP_TYPES_CATALOG.mini_ice;
  const fuel = CHP_FUEL_FACTORS[fuelType] || CHP_FUEL_FACTORS.natural_gas;

  const etaE = eta_elec ?? catalog.eta_elec;
  const etaT = eta_th ?? catalog.eta_th;
  const efficiency_total = etaE + etaT;

  // ── 2. Producție energie ───────────────────────────────────
  // Energie electrică produsă [kWh/an]
  const Q_elec_kWh = powerElec_kW * operatingHours;

  // Putere termică corespunzătoare [kW]
  const powerTh_kW = etaE > 0 ? powerElec_kW * (etaT / etaE) : 0;

  // Energie termică produsă [kWh/an]
  const Q_heat_kWh = powerTh_kW * operatingHours;

  // ── 3. Consum combustibil ──────────────────────────────────
  // Q_fuel = Q_elec / η_elec = Q_heat / η_th
  const fuel_kWh = etaE > 0 ? Q_elec_kWh / etaE : 0;

  // ── 4. Acoperire necesaruri clădire ────────────────────────
  // Fracție din necesarul termic/electric acoperit de CHP
  const heat_coverage_pct = heatDemand_kWh > 0
    ? Math.min(100, Math.round(Q_heat_kWh / heatDemand_kWh * 100))
    : 0;
  const elec_coverage_pct = elecDemand_kWh > 0
    ? Math.min(100, Math.round(Q_elec_kWh / elecDemand_kWh * 100))
    : 0;

  // ── 5. Economie energie primară ────────────────────────────
  // Conform Directiva 2012/27/UE: PES (Primary Energy Saving)
  // PES = 1 - 1 / (η_elec/η_ref_elec + η_th/η_ref_th)
  const PES_denominator = etaE / REF_ETA_ELEC + etaT / REF_ETA_TH;
  const PES = PES_denominator > 0 ? 1 - 1 / PES_denominator : 0;
  const PES_pct = Math.round(PES * 100);

  // Energie primară economisită [kWh/an]
  const ep_ref_elec = Q_elec_kWh * FP_ELEC_GRID; // referință rețea electrică
  const ep_ref_heat = Q_heat_kWh * fuel.fp / REF_ETA_TH; // referință centrală termică
  const ep_chp = fuel_kWh * fuel.fp;
  const ep_saved_kWh = Math.max(0, (ep_ref_elec + ep_ref_heat) - ep_chp);

  // ── 6. Reducere CO₂ ───────────────────────────────────────
  // CO₂ producere separată (electricitate din rețea + centrală termică)
  const co2_ref_elec = Q_elec_kWh * 0.30; // factor emisie rețea RO ≈ 0.30 kgCO₂/kWh
  const co2_ref_heat = Q_heat_kWh / REF_ETA_TH * fuel.co2_kg_kWh;
  const co2_chp = fuel_kWh * fuel.co2_kg_kWh;
  const co2_saved_kg = Math.max(0, Math.round((co2_ref_elec + co2_ref_heat) - co2_chp));

  // ── 7. Analiză financiară ──────────────────────────────────
  // Cost combustibil CHP
  const fuel_cost_ron = fuel_kWh * fuel.price_ron_kWh;
  // Mentenanță
  const maintenance_ron = operatingHours * catalog.maintenance_eur_h * 5; // EUR→RON ≈ 5
  // Venituri / economii
  const elec_savings_ron = Math.min(Q_elec_kWh, elecDemand_kWh) * PRICE_ELEC_RON_KWH;
  const elec_surplus_kWh = Math.max(0, Q_elec_kWh - elecDemand_kWh);
  const elec_surplus_ron = elec_surplus_kWh * PRICE_ELEC_RON_KWH * 0.60; // preț vânzare ≈ 60% din retail
  const heat_savings_ron = Math.min(Q_heat_kWh, heatDemand_kWh) * fuel.price_ron_kWh / (REF_ETA_TH);

  const total_savings_ron = elec_savings_ron + elec_surplus_ron + heat_savings_ron;
  const total_costs_ron = fuel_cost_ron + maintenance_ron;
  const net_savings_ron = Math.max(0, total_savings_ron - total_costs_ron);

  // Cost investiție estimat: ~1500 RON/kW_el (micro) → 5000 RON/kW_el (fuel cell)
  const invest = investCost_ron ?? (powerElec_kW * 3500);
  const payback_years = net_savings_ron > 0
    ? Math.round(invest / net_savings_ron * 10) / 10
    : null;

  // ── 8. Recomandări ─────────────────────────────────────────
  const recommendations = [];
  if (PES_pct >= 10) {
    recommendations.push(
      `Cogenerare de înaltă eficiență (PES=${PES_pct}% ≥ 10%) — eligibilă pentru subvenții conform Dir.2012/27/UE.`
    );
  }
  if (PES_pct < 10) {
    recommendations.push(
      `PES sub 10% (${PES_pct}%) — nu se califică drept cogenerare de înaltă eficiență.`
    );
  }
  if (heat_coverage_pct > 100) {
    recommendations.push(
      "Producție termică depășește necesarul — supradimensionare CHP, reduceți puterea sau orele."
    );
  }
  if (operatingHours < 3000) {
    recommendations.push(
      "Ore de funcționare scăzute (<3000h) — payback prelungit, verificați fezabilitatea."
    );
  }
  if (efficiency_total < 0.80) {
    recommendations.push(
      `Eficiență totală scăzută (${Math.round(efficiency_total * 100)}%) — verificați parametrii echipamentului.`
    );
  }

  return {
    // Producție
    Q_heat_kWh:         Math.round(Q_heat_kWh),
    Q_elec_kWh:         Math.round(Q_elec_kWh),
    fuel_kWh:           Math.round(fuel_kWh),
    powerTh_kW:         Math.round(powerTh_kW * 10) / 10,
    // Eficiență
    eta_elec:           Math.round(etaE * 100) / 100,
    eta_th:             Math.round(etaT * 100) / 100,
    efficiency_total:   Math.round(efficiency_total * 100) / 100,
    PES_pct,
    // Acoperire
    heat_coverage_pct,
    elec_coverage_pct,
    // CO₂
    co2_saved_kg,
    // Energie primară
    ep_saved_kWh:       Math.round(ep_saved_kWh),
    // Financiar
    financial: {
      fuel_cost_ron:      Math.round(fuel_cost_ron),
      maintenance_ron:    Math.round(maintenance_ron),
      elec_savings_ron:   Math.round(elec_savings_ron),
      heat_savings_ron:   Math.round(heat_savings_ron),
      net_savings_ron:    Math.round(net_savings_ron),
      invest_ron:         Math.round(invest),
      payback_years,
    },
    // Verdict
    recommendations,
    chpType,
    fuelType,
    reference: "SR EN 15316-4-4:2017 + Directiva 2012/27/UE + Mc 001-2022",
  };
}
