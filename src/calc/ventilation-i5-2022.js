/**
 * ventilation-i5-2022.js — S30B·B8
 *
 * Verificare conformitate ventilare conform I 5-2022 (Normativ ventilare clădiri RO).
 *
 * Surse:
 *   - I 5-2022 (Normativ pentru proiectarea, executarea și exploatarea instalațiilor de ventilare,
 *     climatizare și pompe de căldură)
 *   - SR EN 16798-1:2019/NA:2019 (categorii confort interior I/II/III/IV)
 *   - I 5-2022 cap.4 — debit aer proaspăt minim per persoană / m²
 *   - I 5-2022 cap.5 — filtrare F7+ pentru clădiri publice / sănătate
 *
 * Sprint 30 — apr 2026
 */

/** Debit minim aer proaspăt per persoană (l/s) — EN 16798-1 cat. II (default) */
export const VENT_FLOW_PER_PERSON_LS = {
  I:   10.0,  // 36 m³/h — cea mai bună calitate (spitale, săli importante)
  II:  7.0,   // 25 m³/h — DEFAULT (sediile, locuințe noi, clase școală)
  III: 4.0,   // 14 m³/h — minim acceptat (clădiri existente neliminate)
  IV:  2.5,   // 9 m³/h  — sub minim, NEACCEPTAT pentru construcții noi
};

/** Eficiență minimă recuperator căldură (HRV) per categoria clădirii */
export const HRV_MIN_EFFICIENCY = {
  RI: 0.0,    // rezidențial — nu obligatoriu (recomandat ≥ 75%)
  RA: 0.0,
  RC: 0.0,
  CP: 0.0,
  BI: 0.75,   // birouri — obligatoriu HRV ≥ 75% (clădiri noi)
  ED: 0.75,   // educație — obligatoriu HRV ≥ 75%
  SA: 0.80,   // sănătate — obligatoriu HRV ≥ 80%
  CO: 0.75,   // comerciale — obligatoriu HRV ≥ 75%
  HC: 0.75,   // cazare hoteluri
  SP: 0.65,   // sport — relaxat
};

/** Filtru aer minim per categorie (clasă ISO 16890) */
export const FILTER_CLASS_MIN = {
  RI: "ePM10 50%",  // rezidențial — F5/F6 echivalent
  RA: "ePM10 50%",
  RC: "ePM10 50%",
  CP: "ePM10 50%",
  BI: "F7",         // ePM2.5 65% — birouri publice
  ED: "F7",         // educație
  SA: "F7+H13",     // sănătate — F7 + HEPA H13
  CO: "F7",
  HC: "F7",
};

/**
 * Verifică conformitatea ventilare conform I 5-2022 + EN 16798-1.
 *
 * @param {object} ventilation - { type, hrEfficiency?, flowPerPersonLs?, flowTotalLs?, filterClass? }
 * @param {object} building - { category, areaUseful, occupants? }
 * @param {string} category_target - "I"|"II"|"III"|"IV" (default "II")
 * @returns {object} { conform, issues, recommendations, sources }
 */
export function checkVentilationI52022(ventilation, building, category_target = "II") {
  const issues = [];
  const recommendations = [];
  const cat = building?.category || "RI";

  if (!ventilation) {
    return {
      conform: false,
      issues: ["Date ventilare absente"],
      recommendations: ["Completați secțiunea ventilare în Pasul 3 cu tip + debit + filtru."],
      sources: ["I 5-2022 cap.4"],
    };
  }

  // 1. Verificare debit aer proaspăt per persoană
  const flowPerPersonRequired = VENT_FLOW_PER_PERSON_LS[category_target] || 7.0;
  const flowPerPerson = parseFloat(ventilation.flowPerPersonLs) || 0;
  if (flowPerPerson > 0 && flowPerPerson < flowPerPersonRequired) {
    issues.push(`Debit aer proaspăt ${flowPerPerson.toFixed(1)} l/s/pers < minim ${flowPerPersonRequired} l/s/pers (cat. ${category_target})`);
    recommendations.push(`Crește debit la ≥ ${flowPerPersonRequired} l/s/persoană pentru categoria ${category_target} confort.`);
  }

  // 2. Verificare HRV (recuperator căldură) pentru clădiri nerezidențiale
  const hrvMinReq = HRV_MIN_EFFICIENCY[cat] || 0;
  const hrvActual = parseFloat(ventilation.hrEfficiency) / 100 || 0;
  if (hrvMinReq > 0 && (!ventilation.type?.includes("HR") || hrvActual < hrvMinReq)) {
    issues.push(`Recuperator căldură absent / insuficient pentru ${cat}: necesar η ≥ ${(hrvMinReq * 100).toFixed(0)}%`);
    recommendations.push(`Instalare VMC dublu flux cu η_HRV ≥ ${(hrvMinReq * 100).toFixed(0)}% (I 5-2022).`);
  }

  // 3. Verificare filtru aer
  const filterReq = FILTER_CLASS_MIN[cat] || "ePM10 50%";
  const filterActual = ventilation.filterClass || "";
  if (cat !== "RI" && cat !== "RA" && cat !== "RC" && filterActual && !filterActual.includes("F7") && !filterActual.includes("F8") && !filterActual.includes("F9")) {
    issues.push(`Filtru aer ${filterActual} insuficient pentru ${cat} — necesar ${filterReq}`);
    recommendations.push(`Echipare CTA cu filtru ${filterReq} (I 5-2022 + ISO 16890).`);
  }

  // 4. Verificare debit total (per m² Au) — minim 0.5 vol/h
  const Au = parseFloat(building?.areaUseful) || 0;
  const flowTotalLs = parseFloat(ventilation.flowTotalLs) || 0;
  if (Au > 0 && flowTotalLs > 0) {
    const flowM3h = flowTotalLs * 3.6;
    const volume = parseFloat(building?.volume) || (Au * 2.7);
    const ach = flowM3h / volume;
    if (ach < 0.3) {
      issues.push(`Schimb aer ${ach.toFixed(2)} h⁻¹ < minim 0.3 h⁻¹ (I 5-2022 cap.4)`);
    }
  }

  return {
    conform: issues.length === 0,
    issues,
    recommendations,
    category_target,
    requiredFlowPerPersonLs: flowPerPersonRequired,
    requiredHRV: hrvMinReq,
    requiredFilter: filterReq,
    sources: [
      "I 5-2022 — Normativ ventilare RO (cap.4 debit, cap.5 filtrare)",
      "SR EN 16798-1:2019/NA:2019 — categorii confort interior",
      "ISO 16890:2016 — clasificare filtre aer",
    ],
  };
}
