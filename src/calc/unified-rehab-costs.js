/**
 * unified-rehab-costs.js — Sursă canonică unică pentru costuri reabilitare.
 *
 * Sprint Pas 7 docs (6 mai 2026) — fix P0-1: rezolvă inconsistența MAJORĂ
 * între Deviz estimativ PDF (28.281 €), CPE Estimat Post-Rehab (94.614 RON)
 * și Pașaport Renovare PDF (79.597 RON) pentru aceeași clădire + scenariu.
 *
 * Calculează SINGURUL adevăr pentru:
 *   - Cantități per măsură (arii din opaqueElements + glazingElements reale)
 *   - Preț unitar din REHAB_COSTS (EUR/m² sau EUR/buc)
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

import { REHAB_COSTS } from "../data/rehab-costs.js";
import { getEurRonSync } from "../data/rehab-prices.js";

/**
 * Construiește lista canonică de măsuri din rehabScenarioInputs + elemente reale.
 *
 * @param {Object} inputs - rehabScenarioInputs (addInsulWall, replaceWindows, etc.)
 * @param {Array<Object>} opaqueElements - Step 2 elemente opace [{type:'PE',area:'120'},...]
 * @param {Array<Object>} glazingElements - Step 2 vitraje
 * @param {Object} [options] - { includeNormatives: true, eurRon: 5.05 }
 * @returns {Array<Measure>} listă canonică [{id, label, system, qty, unit,
 *                                            unitPriceEUR, costEUR, costRON,
 *                                            normativ, lifespan_years}]
 */
export function buildCanonicalMeasures(inputs, opaqueElements = [], glazingElements = [], options = {}) {
  const { eurRon = getEurRonSync() || 5.05 } = options;
  const measures = [];
  if (!inputs || typeof inputs !== "object") return measures;

  // Helper: convertește EUR în RON cu cursul curent
  const toRON = (eur) => Math.round(eur * eurRon);

  // ── 1. TERMOIZOLARE PEREȚI EXTERIORI ──
  if (inputs.addInsulWall) {
    const t = parseInt(inputs.insulWallThickness) || 10;
    const wallArea = (opaqueElements || [])
      .filter(el => el.type === "PE")
      .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
    const unitPrice = REHAB_COSTS.insulWall[t] ?? 42; // fallback 10cm
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
    const unitPrice = REHAB_COSTS.insulRoof[t] ?? 42; // fallback 15cm
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
    const unitPrice = REHAB_COSTS.insulBasement[t] ?? 45; // fallback 8cm
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
    // Caută cea mai apropiată valoare U în REHAB_COSTS.windows
    const availableUs = Object.keys(REHAB_COSTS.windows).map(Number).sort((a, b) => a - b);
    const closestU = availableUs.reduce((prev, curr) =>
      Math.abs(curr - newU) < Math.abs(prev - newU) ? curr : prev
    );
    const unitPrice = REHAB_COSTS.windows[closestU];
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
    const tier = eff >= 90 ? "hr90" : eff >= 80 ? "hr80" : "hr70";
    const costEUR = REHAB_COSTS[tier];
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
    // Putere estimată ~4 kW pentru apartament 65m², ~10 kW pentru casă 150m²
    // Folosim 6 kW ca default rezonabil; la nevoie input separat
    const powerKw = parseFloat(inputs.hpPower) || 6;
    const unitPrice = REHAB_COSTS.hpPerKw || 900;
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
    const unitPrice = REHAB_COSTS.pvPerM2 || 180;
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
    const unitPrice = REHAB_COSTS.solarThPerM2 || 380;
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
    eurRon = getEurRonSync() || 5.05,
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
};
