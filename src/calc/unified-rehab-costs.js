/**
 * unified-rehab-costs.js — Sursă canonică unică pentru costuri reabilitare.
 *
 * Sprint Pas 7 docs (6 mai 2026) — fix P0-1: rezolvă inconsistența MAJORĂ
 * între Deviz estimativ PDF (28.281 €), CPE Estimat Post-Rehab (94.614 RON)
 * și Pașaport Renovare PDF (79.597 RON) pentru aceeași clădire + scenariu.
 *
 * Sprint Audit Prețuri P3.1 (9 mai 2026) — MIGRARE INTEGRALĂ la rehab-prices.js
 * canonic. Toate prețurile vin acum din REHAB_PRICES (3 scenarii low/mid/high)
 * via getPrice('category', 'item', 'mid'). Eliminat dependency rehab-costs.js
 * legacy. Mapare detaliată în _resolveCanonicalPrice() de mai jos.
 *
 * Calculează SINGURUL adevăr pentru:
 *   - Cantități per măsură (arii din opaqueElements + glazingElements reale)
 *   - Preț unitar din rehab-prices.js (EUR/m² sau EUR/buc, scenariu mid default)
 *   - Cost total per măsură (EUR + RON cu curs live BNR)
 *   - Sumar global: investiție totală EUR/RON, economii anuale, payback
 *
 * Folosit de:
 *   - report-generators.js → Deviz estimativ PDF
 *   - cpe-post-rehab-pdf.js → CPE Estimat Post-Rehab
 *   - PasaportBasic.jsx (via suggestionsToMeasures) → Pașaport Renovare
 *   - phased-rehab.js (via measures) → Foaie de parcurs
 *
 * Pentru calcul EP post-reabilitare → vezi rehab-comparator.js / smart-rehab.js.
 */

import { getEurRonSync, getPrice, REHAB_PRICES } from "../data/rehab-prices.js";

// ─── Mapping legacy keys → rehab-prices canonical (Sprint P3.1) ──────────────

/**
 * Selectează cea mai apropiată valoare U din rehab-prices.envelope (windows_uXXX).
 * Mapare: 1.40 → windows_u140, 1.10 → windows_u110, 0.90 → windows_u090, 0.70 → windows_u070.
 */
function _resolveWindowKey(uValue) {
  const u = parseFloat(uValue);
  if (u <= 0.80) return "windows_u070";
  if (u <= 1.00) return "windows_u090";
  if (u <= 1.30) return "windows_u110";
  return "windows_u140";
}

/**
 * Selectează cheia rehab-prices pentru termoizolația pereți funcție de grosime.
 * Aproximare: t ≤ 12 → wall_eps_10cm; t > 12 → wall_eps_15cm.
 */
function _resolveWallKey(thickness_cm) {
  return parseInt(thickness_cm, 10) > 12 ? "wall_eps_15cm" : "wall_eps_10cm";
}

/**
 * Selectează cheia rehab-prices pentru acoperiș funcție de grosime.
 * Aproximare: t ≤ 20 → roof_eps_15cm; t > 20 → roof_mw_25cm.
 */
function _resolveRoofKey(thickness_cm) {
  return parseInt(thickness_cm, 10) > 20 ? "roof_mw_25cm" : "roof_eps_15cm";
}

/**
 * Construiește lista canonică de măsuri din rehabScenarioInputs + elemente reale.
 *
 * @param {Object} inputs - rehabScenarioInputs (addInsulWall, replaceWindows, etc.)
 * @param {Array<Object>} opaqueElements - Step 2 elemente opace [{type:'PE',area:'120'},...]
 * @param {Array<Object>} glazingElements - Step 2 vitraje
 * @param {Object} [options] - { eurRon: 5.10, scenario: 'mid' }
 * @returns {Array<Measure>} listă canonică [{id, label, system, qty, unit,
 *                                            unitPriceEUR, costEUR, costRON,
 *                                            normativ, lifespan_years}]
 */
export function buildCanonicalMeasures(inputs, opaqueElements = [], glazingElements = [], options = {}) {
  const { eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback, scenario = "mid" } = options;
  const measures = [];
  if (!inputs || typeof inputs !== "object") return measures;

  const toRON = (eur) => Math.round(eur * eurRon);
  const _price = (cat, key, fb) => getPrice(cat, key, scenario)?.price ?? fb;

  // ── 1. TERMOIZOLARE PEREȚI EXTERIORI ──
  if (inputs.addInsulWall) {
    const t = parseInt(inputs.insulWallThickness) || 10;
    const wallArea = (opaqueElements || [])
      .filter(el => el.type === "PE")
      .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
    // Sprint P3.1 — getPrice canonic; default wall_eps_10cm.mid = 49 EUR/m²
    const unitPrice = _price("envelope", _resolveWallKey(t), 49);
    const costEUR = wallArea * unitPrice;
    measures.push({
      id: "insul_wall",
      label: `Termoizolație pereți ETICS (${t} cm)`,
      system: "Anvelopă",
      category: "Anvelopă",
      qty: wallArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "SR EN 13499/13500 (ETICS), EPS grafitat sau vată minerală",
      lifespan_years: 30,
      priority: 1,
    });
  }

  // ── 2. TERMOIZOLARE ACOPERIȘ / PLANȘEU SUPERIOR ──
  if (inputs.addInsulRoof) {
    const t = parseInt(inputs.insulRoofThickness) || 15;
    const roofArea = (opaqueElements || [])
      .filter(el => el.type === "PP" || el.type === "PT")
      .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
    // Sprint P3.1 — getPrice canonic; default roof_eps_15cm.mid = 32 EUR/m²
    const unitPrice = _price("envelope", _resolveRoofKey(t), 32);
    const costEUR = roofArea * unitPrice;
    measures.push({
      id: "insul_roof",
      label: `Termoizolație acoperiș/planșeu superior (${t} cm)`,
      system: "Anvelopă",
      category: "Anvelopă",
      qty: roofArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "Vată minerală sau XPS, barieră de vapori SR EN ISO 6946",
      lifespan_years: 30,
      priority: 1,
    });
  }

  // ── 3. IZOLAȚIE PLANȘEU PESTE SUBSOL / SOL ──
  if (inputs.addInsulBasement) {
    const t = parseInt(inputs.insulBasementThickness) || 8;
    const baseArea = (opaqueElements || [])
      .filter(el => el.type === "PB" || el.type === "PL")
      .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
    // Sprint P3.1 — basement_xps_10cm.mid = 32 EUR/m² (1 cheie indiferent de grosime)
    const unitPrice = _price("envelope", "basement_xps_10cm", 32);
    const costEUR = baseArea * unitPrice;
    measures.push({
      id: "insul_basement",
      label: `Izolație planșeu subsol (${t} cm)`,
      system: "Anvelopă",
      category: "Anvelopă",
      qty: baseArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "Vată minerală sau polistiren extrudat la pardoseala subsol",
      lifespan_years: 30,
      priority: 2,
    });
  }

  // ── 4. ÎNLOCUIRE TÂMPLĂRIE ──
  if (inputs.replaceWindows) {
    const newU = parseFloat(inputs.newWindowU) || 0.90;
    const winArea = (glazingElements || [])
      .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
    // Sprint P3.1 — _resolveWindowKey selectează tier-ul corect din rehab-prices.envelope
    const winKey = _resolveWindowKey(newU);
    const unitPrice = _price("envelope", winKey, 280); // default windows_u090.mid
    const costEUR = winArea * unitPrice;
    measures.push({
      id: "replace_windows",
      label: `Înlocuire tâmplărie (U_w = ${newU.toFixed(2)} W/m²K)`,
      system: "Anvelopă",
      category: "Anvelopă",
      qty: winArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "PVC sau aluminiu cu rupere de punte termică, geam Low-E argon, SR EN 14351-1",
      lifespan_years: 25,
      priority: 1,
    });
  }

  // ── 5. VENTILARE MECANICĂ CU RECUPERARE CĂLDURĂ ──
  if (inputs.addHR) {
    const eff = parseInt(inputs.hrEfficiency) || 80;
    // Sprint P3.1 — folosim full_install per Au + fixed (P3.3 chei noi în rehab-prices)
    const Au = parseFloat(inputs.Au) || 100;  // fallback 100 m² dacă nu e specificat
    const perM2 = _price("cooling",
      eff >= 90 ? "vmc_hr_full_install_per_m2" : "vmc_hr_full_install_per_m2",
      150);
    const fixed = _price("cooling", "vmc_hr_full_install_fixed", 800);
    // Eficiență 90% adaugă ~30% premium peste 80% (multiplicator empiric)
    const effMultiplier = eff >= 90 ? 1.30 : eff >= 80 ? 1.0 : 0.85;
    const costEUR = (perM2 * Au + fixed) * effMultiplier;
    measures.push({
      id: "vmc_hr",
      label: `Ventilare mecanică cu recuperare (η = ${eff}%)`,
      system: "Instalații",
      category: "Instalații",
      qty: 1,
      unit: "buc",
      unitPriceEUR: costEUR,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "Centrală HRV cu schimbător contracurent, distribuție tubulatură",
      lifespan_years: 20,
      priority: 2,
    });
  }

  // ── 6. POMPĂ DE CĂLDURĂ ──
  if (inputs.addHP) {
    const cop = parseFloat(inputs.hpCOP) || 4.0;
    const powerKw = parseFloat(inputs.hpPower) || 6;
    // Sprint P3.1 + P4.7 — preț per kW selectat funcție de putere (consistent cu rehab-cost.js Deviz):
    //   ≤9 kW → hp_aw_8kw mid 6500/8 ≈ 812 EUR/kW
    //   ≤14 kW → hp_aw_12kw mid 9000/12 = 750 EUR/kW
    //   >14 kW → hp_aw_16kw mid 11500/16 ≈ 718 EUR/kW
    const hpKey = powerKw <= 9 ? "hp_aw_8kw"
                : powerKw <= 14 ? "hp_aw_12kw" : "hp_aw_16kw";
    const refKw = hpKey === "hp_aw_8kw" ? 8 : hpKey === "hp_aw_12kw" ? 12 : 16;
    const hpSetPrice = _price("heating", hpKey, 9000);
    const unitPrice = hpSetPrice / refKw;
    const costEUR = powerKw * unitPrice;
    measures.push({
      id: "heat_pump",
      label: `Pompă căldură aer-apă (COP = ${cop.toFixed(1)}, ${powerKw} kW)`,
      system: "Instalații",
      category: "Instalații",
      qty: powerKw,
      unit: "kW",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "SR EN 14511, refrigerant R290/R32, integrare cu sistem ACM",
      lifespan_years: 20,
      priority: 1,
    });
  }

  // ── 7. PANOURI FOTOVOLTAICE ──
  if (inputs.addPV) {
    const pvArea = parseFloat(inputs.pvArea) || 0;
    // Sprint P3.1 — pv_kwp.mid = 1100 EUR/kWp; ~5 m² panou per kWp
    // Conversie pvArea (m²) → kWp folosind 5 m²/kWp; preț unitar EUR/m² = pv_kwp / 5
    const pvKwpPrice = _price("renewables", "pv_kwp", 1100);
    const unitPrice = pvKwpPrice / 5; // EUR/m² panou
    const costEUR = pvArea * unitPrice;
    measures.push({
      id: "pv_system",
      label: `Panouri fotovoltaice (${pvArea} m²)`,
      system: "Regenerabile",
      category: "Regenerabile",
      qty: pvArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "Module monocristaline + invertor on-grid + montaj acoperiș, SR EN 61215",
      lifespan_years: 25,
      priority: 2,
    });
  }

  // ── 8. COLECTOARE SOLARE TERMICE ──
  if (inputs.addSolarTh) {
    const solarArea = parseFloat(inputs.solarThArea) || 0;
    // Sprint P3.1 — solar_thermal_4m2.mid = 2000 EUR/set 4m² → 500 EUR/m²
    const solarSetPrice = _price("heating", "solar_thermal_4m2", 2000);
    const unitPrice = solarSetPrice / 4; // EUR/m²
    const costEUR = solarArea * unitPrice;
    measures.push({
      id: "solar_thermal",
      label: `Colectoare solare termice (${solarArea} m²)`,
      system: "Regenerabile",
      category: "Regenerabile",
      qty: solarArea,
      unit: "m²",
      unitPriceEUR: unitPrice,
      costEUR,
      costRON: toRON(costEUR),
      normativ: "Colectoare plane sau cu tuburi vidate + boiler bivalent + sistem reglare, SR EN 12975",
      lifespan_years: 25,
      priority: 3,
    });
  }

  return measures;
}

/**
 * Calculează sumarul financiar canonic.
 *
 * @param {Array<Measure>} measures - din buildCanonicalMeasures
 * @param {Object} options
 * @param {number} options.eurRon
 * @param {number} options.qfSavedKwh - kWh economisiți anual (din rehabComparison.savings.qfSaved)
 * @param {number} options.energyPriceEURperKwh - preț mediu energie (default 0.13 EUR/kWh)
 * @param {number} options.tvaRate - cota TVA (default 0.21 = 21%)
 * @returns {Object} { totalEUR, totalRON, totalWithTvaEUR, totalWithTvaRON,
 *                     annualSavingEUR, annualSavingRON, paybackYears }
 */
export function buildFinancialSummary(measures, options = {}) {
  const {
    eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback,
    qfSavedKwh = 0,
    energyPriceEURperKwh = 0.13,
    tvaRate = 0.21,
  } = options;

  const totalEUR = measures.reduce((s, m) => s + (m.costEUR || 0), 0);
  const totalRON = measures.reduce((s, m) => s + (m.costRON || 0), 0);
  const totalWithTvaEUR = totalEUR * (1 + tvaRate);
  const totalWithTvaRON = totalRON * (1 + tvaRate);

  const annualSavingEUR = qfSavedKwh * energyPriceEURperKwh;
  const annualSavingRON = annualSavingEUR * eurRon;
  const paybackYears = annualSavingEUR > 0 ? totalEUR / annualSavingEUR : null;

  return {
    totalEUR: Math.round(totalEUR),
    totalRON: Math.round(totalRON),
    totalWithTvaEUR: Math.round(totalWithTvaEUR),
    totalWithTvaRON: Math.round(totalWithTvaRON),
    annualSavingEUR: Math.round(annualSavingEUR),
    annualSavingRON: Math.round(annualSavingRON),
    paybackYears: paybackYears ? Math.round(paybackYears * 10) / 10 : null,
    eurRon,
    tvaRate,
    qfSavedKwh,
    energyPriceEURperKwh,
  };
}

/**
 * Convertor: măsuri canonice → format așteptat de calcPhasedRehabPlan / Pașaport.
 *
 * @param {Array<Measure>} canonical
 * @param {Object} [options]
 * @param {Object<string,number>} [options.epReductions] - id măsură → ΔEP kWh/m² estimat
 * @returns {Array} măsuri în format calcPhasedRehabPlan
 */
export function canonicalToPhasedMeasures(canonical, options = {}) {
  const { epReductions = {} } = options;
  const co2Factor = 0.230; // kg/kWh mediu RO 2026

  return canonical.map(m => {
    const epRed = epReductions[m.id] ?? estimateEpReduction(m);
    return {
      id: m.id,
      name: m.label,
      category: m.category,
      system: m.system,
      cost_RON: m.costRON,
      cost_EUR: m.costEUR,
      ep_reduction_kWh_m2: epRed,
      co2_reduction: Math.round(epRed * co2Factor * 100) / 100,
      lifespan_years: m.lifespan_years,
      priority: m.priority,
    };
  });
}

/**
 * Estimare ΔEP kWh/m² per măsură când nu avem valori reale calculate.
 * Heuristică pre-calibrată Mc 001-2022 + benchmark-uri PNRR Casa Verde.
 */
function estimateEpReduction(measure) {
  switch (measure.id) {
    case "insul_wall":     return 35;
    case "insul_roof":     return 25;
    case "insul_basement": return 12;
    case "replace_windows":return 22;
    case "vmc_hr":         return 18;
    case "heat_pump":      return 60;
    case "pv_system":      return measure.qty * 1.2; // ~1.2 kWh/m² PV per m² util
    case "solar_thermal":  return measure.qty * 0.8;
    default:               return 10;
  }
}

// Export internal helpers pentru testing
export const _internals = {
  estimateEpReduction,
  _resolveWallKey,
  _resolveRoofKey,
  _resolveWindowKey,
};
