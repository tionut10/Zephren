/**
 * glaser-condens.js — S30B·B1
 *
 * Wrapper API unificat pentru calculul Glaser condens, conform:
 *   - SR EN ISO 13788:2012 §4.4 (metoda Glaser)
 *   - C 107/6-2002 (Normativ verificare condens vapori, MDLPA)
 *   - NP 057-2002 (Hidroizolații cădiri, MDLPA)
 *   - Glaser 1959 (formula originală) + DIN 4108-3 (validare)
 *
 * Standardul SR EN ISO 13788 NU este achiziționat ASRO de către Zephren.
 * Implementarea folosește literatura academică publică:
 *   - https://en.wikipedia.org/wiki/Glaser_method
 *   - DIN 4108-3 (2018) — verificare difuzie vapori în construcții
 *   - NP 057-2002 (în Normative/NP/MDLPA_NP_057_2002.pdf) — referință RO
 *
 * Algoritm principal delegat către `calcGlaserMonthly` din `glaser.js`
 * (deja implementat în Sprint 22 cu pSat over-water/over-ice + balance an).
 *
 * API S30B (compatibil cu spec sprint S30):
 *   calcGlaserCondens(element, climateLunar) → {
 *     hasCondens, totalCondensYear_kg_m2, balancePerYear_kg_m2, monthlyDetail
 *   }
 *
 * Sprint 30 — apr 2026
 */

import { calcGlaserMonthly } from "./glaser.js";

/**
 * Calculează condensul prin difuzia vaporilor (metoda Glaser) pentru un element.
 *
 * @param {object} element - { layers: [{ thickness_mm/thickness, lambda, mu? }], orientation?, area? }
 * @param {object} climateLunar - { tIntMonth?: [12], rhIntMonth?: [12], tExtMonth?: [12], rhExtMonth?: [12], temp_month, rh_month, zone }
 * @returns {object|null} { hasCondens, totalCondensYear_kg_m2, balancePerYear_kg_m2, monthlyDetail, verdict, sources }
 */
export function calcGlaserCondens(element, climateLunar) {
  if (!element || !Array.isArray(element.layers) || element.layers.length === 0) {
    return null;
  }
  if (!climateLunar) return null;

  // Mapare semnătura wrapper → format legacy calcGlaserMonthly
  const climate = {
    temp_month: climateLunar.tExtMonth || climateLunar.temp_month,
    rh_month:   climateLunar.rhExtMonth || climateLunar.rh_month,
    zone:       climateLunar.zone || "II",
  };
  if (!climate.temp_month || climate.temp_month.length !== 12) return null;

  // Temperatura interioară medie anuală (default 20°C). RH int default 55%.
  const tIntAvg = Array.isArray(climateLunar.tIntMonth)
    ? climateLunar.tIntMonth.reduce((s, t) => s + t, 0) / 12
    : 20;
  const rhIntAvg = Array.isArray(climateLunar.rhIntMonth)
    ? (climateLunar.rhIntMonth.reduce((s, r) => s + r, 0) / 12)
    : 55;

  const result = calcGlaserMonthly(element.layers, climate, tIntAvg, rhIntAvg);
  if (!result) return null;

  // Conversie unitate g/m² → kg/m² (împărțim la 1000)
  const totalCondensYear_kg_m2 = (result.winterAccum || 0) / 1000;
  const balancePerYear_kg_m2 = ((result.winterAccum || 0) - (result.summerEvap || 0)) / 1000;
  const hasCondens = result.maxCumulative > 0;

  return {
    hasCondens,
    totalCondensYear_kg_m2: +totalCondensYear_kg_m2.toFixed(4),
    balancePerYear_kg_m2: +balancePerYear_kg_m2.toFixed(4),
    annualOk: result.annualOk,
    verdict: result.verdict,
    monthlyDetail: result.monthly,
    layers: result.layers,
    // Surse documentate (literatura academică pentru SR EN ISO 13788 neachiziționat)
    sources: [
      "SR EN ISO 13788:2012 §4.4 (metoda Glaser, neachiziționat ASRO)",
      "C 107/6-2002 — verificare condens vapori (MDLPA)",
      "NP 057-2002 — hidroizolații clădiri (MDLPA)",
      "DIN 4108-3:2018 — verificare difuzie vapori (validare paralelă)",
      "Glaser 1959 — formula originală difuzie vapori",
    ],
  };
}

/** Reexport API legacy pentru backward compat. */
export { calcGlaserMonthly, glaserCheck, pSatMagnus } from "./glaser.js";
