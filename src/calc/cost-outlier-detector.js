/**
 * cost-outlier-detector.js — Sprint Îmbunătățiri #2 (9 mai 2026)
 *
 * Detectează valori anormale de investiție introduse de auditor și avertizează
 * cu badge UI „⚠️ Investiție pare {sub-evaluată / supra-evaluată} cu X% vs
 * benchmark categorie {RI/RC/etc.}".
 *
 * Logica: compară valoarea introdusă cu benchmark calculat din rehab-prices.js
 * pentru o renovare profundă tipică (anvelopă completă + HP + PV) la suprafața
 * utilă a clădirii. Tolerează ±50% (low-high bandă × ±20% buffer).
 *
 * @module calc/cost-outlier-detector
 */

import { REHAB_PRICES, getEurRonSync } from "../data/rehab-prices.js";

// Praguri sensibilitate detecție (relativ la benchmark mid):
//   - sub LOW × 0.7 → SUB-EVALUAT FOARTE → roșu critic
//   - sub LOW       → SUB-EVALUAT        → amber
//   - între LOW–HIGH → OK                 → verde
//   - peste HIGH    → SUPRA-EVALUAT      → amber
//   - peste HIGH × 1.5 → SUPRA-EVALUAT FOARTE → roșu critic
const THRESHOLD_LOW_CRIT  = 0.70;
const THRESHOLD_HIGH_CRIT = 1.50;

/**
 * Calculează benchmark investiție pentru o renovare TIPICĂ (anvelopă + HP + PV)
 * la suprafața utilă dată. Returnează gama low/mid/high în RON.
 *
 * Pachetul tipic include:
 *   - Pereți EPS 10cm (factor 2.5 × Au, ETICS)
 *   - Acoperiș EPS 15cm (Au)
 *   - Ferestre U≤1.10 (factor 0.15 × Au tâmplărie)
 *   - Pompă căldură 8 kW (set complet)
 *   - PV 5 kWp
 *   - Sumă pe scenariu × curs RON live
 *
 * @param {number} areaUseful - suprafață utilă m²
 * @param {Object} [options]
 * @param {number} [options.eurRon] - curs (default: live BNR)
 * @returns {{ low: number, mid: number, high: number, eurRon: number, breakdown: Object }}
 */
export function calcBenchmarkInvestmentRON(areaUseful, options = {}) {
  const Au = parseFloat(areaUseful) || 0;
  if (Au <= 0) return { low: 0, mid: 0, high: 0, eurRon: 0, breakdown: {} };
  const eurRon = options.eurRon || getEurRonSync() || REHAB_PRICES.eur_ron_fallback;

  const w = REHAB_PRICES.envelope.wall_eps_10cm;
  const r = REHAB_PRICES.envelope.roof_eps_15cm;
  const win = REHAB_PRICES.envelope.windows_u110;
  const hp = REHAB_PRICES.heating.hp_aw_8kw;
  const pv = REHAB_PRICES.renewables.pv_kwp;

  const breakdown = {};
  let low = 0, mid = 0, high = 0;

  // Pereți (factor 2.5 × Au pentru aria pereților exteriori tipic case 1 etaj)
  for (const sc of ["low", "mid", "high"]) {
    const wallEUR  = w[sc] * Au * 2.5;
    const roofEUR  = r[sc] * Au;
    const winEUR   = win[sc] * Au * 0.15;
    const hpEUR    = hp[sc];
    const pvEUR    = pv[sc] * 5;
    const totalEUR = wallEUR + roofEUR + winEUR + hpEUR + pvEUR;
    const totalRON = totalEUR * eurRon;
    if (sc === "low")  low  = totalRON;
    if (sc === "mid")  mid  = totalRON;
    if (sc === "high") high = totalRON;
    breakdown[sc] = {
      wallRON:  Math.round(wallEUR * eurRon),
      roofRON:  Math.round(roofEUR * eurRon),
      winRON:   Math.round(winEUR * eurRon),
      hpRON:    Math.round(hpEUR * eurRon),
      pvRON:    Math.round(pvEUR * eurRon),
      totalRON: Math.round(totalRON),
    };
  }
  return {
    low:  Math.round(low),
    mid:  Math.round(mid),
    high: Math.round(high),
    eurRon,
    breakdown,
  };
}

/**
 * Detectează dacă o investiție este outlier vs benchmark.
 *
 * @param {number} investRON - investiție introdusă (RON)
 * @param {number} areaUseful - m²
 * @param {Object} [options]
 * @param {string} [options.category] - RI/RC/RA/etc. (pentru context categorie)
 * @returns {{
 *   level: 'ok' | 'warn-low' | 'warn-high' | 'critical-low' | 'critical-high' | 'unknown',
 *   message: string,
 *   benchmark: { low, mid, high, eurRon },
 *   deltaPct: number,
 *   ratio: number
 * }}
 */
export function detectOutlier(investRON, areaUseful, options = {}) {
  const inv = parseFloat(investRON) || 0;
  const Au = parseFloat(areaUseful) || 0;
  const benchmark = calcBenchmarkInvestmentRON(Au, options);
  if (inv <= 0 || Au <= 0 || benchmark.mid <= 0) {
    return {
      level: "unknown",
      message: "Date insuficiente pentru benchmark (suprafață utilă sau investiție lipsă).",
      benchmark,
      deltaPct: 0,
      ratio: 0,
    };
  }

  const ratio = inv / benchmark.mid;
  const deltaPct = Math.round((ratio - 1) * 100);
  const cat = options.category || "general";

  // Critical sub-evaluat (sub 70% din low)
  if (inv < benchmark.low * THRESHOLD_LOW_CRIT) {
    return {
      level: "critical-low",
      message: `⚠️ Investiție sub-evaluată CRITIC pentru categoria ${cat}: ${deltaPct}% sub mid (${(inv / 1000).toFixed(0)}k vs benchmark ${(benchmark.low / 1000).toFixed(0)}–${(benchmark.high / 1000).toFixed(0)}k RON). Verificați scopul lucrărilor.`,
      benchmark, deltaPct, ratio,
    };
  }
  // Sub-evaluat (între 70%×low și low)
  if (inv < benchmark.low) {
    return {
      level: "warn-low",
      message: `⚠️ Investiție sub-evaluată pentru categoria ${cat}: ${deltaPct}% sub mid. Banda tipică: ${(benchmark.low / 1000).toFixed(0)}–${(benchmark.high / 1000).toFixed(0)}k RON pentru ${Au} m².`,
      benchmark, deltaPct, ratio,
    };
  }
  // Critical supra-evaluat (peste 150% × high)
  if (inv > benchmark.high * THRESHOLD_HIGH_CRIT) {
    return {
      level: "critical-high",
      message: `⚠️ Investiție supra-evaluată CRITIC pentru categoria ${cat}: +${deltaPct}% peste mid (${(inv / 1000).toFixed(0)}k vs benchmark ${(benchmark.low / 1000).toFixed(0)}–${(benchmark.high / 1000).toFixed(0)}k RON). Verificați costuri excepționale.`,
      benchmark, deltaPct, ratio,
    };
  }
  // Supra-evaluat (între high și high×1.5)
  if (inv > benchmark.high) {
    return {
      level: "warn-high",
      message: `⚠️ Investiție supra-evaluată pentru categoria ${cat}: +${deltaPct}% peste mid. Banda tipică: ${(benchmark.low / 1000).toFixed(0)}–${(benchmark.high / 1000).toFixed(0)}k RON pentru ${Au} m².`,
      benchmark, deltaPct, ratio,
    };
  }
  // OK (între low și high)
  return {
    level: "ok",
    message: `✓ Investiție în banda normală (${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs mid). Benchmark: ${(benchmark.low / 1000).toFixed(0)}–${(benchmark.high / 1000).toFixed(0)}k RON.`,
    benchmark, deltaPct, ratio,
  };
}

export const _internals = {
  THRESHOLD_LOW_CRIT,
  THRESHOLD_HIGH_CRIT,
};
