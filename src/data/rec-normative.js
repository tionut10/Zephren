/**
 * Sprint 27 P2.11 — Mapare REC_* → articol normativ exact
 *
 * Folosit de UI (Step6Certificate, Step7Audit, AuditReportChapters) pentru
 * afișarea referinței normative sub fiecare recomandare. Nu schimbă logica,
 * doar îmbogățește output-ul cu trasabilitate normativă.
 *
 * Sursa cheilor: api/generate-document.py CHECKBOX_KEYWORD_MAP (S25 P0.2 a
 * adăugat 14 chei noi REC_*).
 */

export const REC_NORMATIVE = Object.freeze({
  // Anvelopă
  REC_PE_INSULATE:    "Mc 001-2022 Tab 2.4 (nZEB rez) / 2.10a (renovare)",
  REC_PB_INSULATE:    "Mc 001-2022 Tab 2.4 (PB) / 2.10a",
  REC_PT_INSULATE:    "Mc 001-2022 Tab 2.4 (PT/PP) / 2.10a",
  REC_PL_INSULATE:    "Mc 001-2022 Tab 2.4 (PL/SE) / 2.10a",
  REC_SARPANTA:       "Mc 001-2022 §3.4 + Tab 2.4 (PT mansardă)",
  REC_GLAZING:        "Mc 001-2022 Tab 2.5 (nZEB) + L.238/2024 Art.6",
  REC_GRILES_VENT:    "Mc 001-2022 Anexa V + EN 16798-1",
  REC_SHADING:        "Mc 001-2022 Anexa E + SR EN 13363-1 (g_eff)",

  // Instalații încălzire / ACM
  REC_HEAT_PIPES:     "Mc 001-2022 §VI + EN 15316-3 (distribuție)",
  REC_DHW_PIPES:      "EN 15316-3 §6.5 + Mc 001-2022 §VII (ACM)",
  REC_HEAT_INSULATE:  "EN 15316-3 §6.4 (izolație conducte)",
  REC_DHW_INSULATE:   "EN 15316-3 §6.5 (izolație conducte ACM)",
  REC_THERM_VALVES:   "Mc 001-2022 §VI + EN 215 (robinete termostatice)",
  REC_BAL_VALVES:     "Mc 001-2022 §VI + EN 14336 (vane echilibrare)",
  REC_AIR_QUALITY:    "EN 16798-1 + EN 15665 (vent. minim CO₂ ≤ 1200 ppm)",
  REC_FLOW_METERS:    "L.121/2014 art. 7 + Ord. ANRE 35/2017 (contoare ACM)",
  REC_HEAT_METERS:    "L.121/2014 art. 7 + EN 15500 (contoare încălzire)",
  REC_LOW_FLOW:       "EN 16297 (armături sanitare cu consum redus)",
  REC_DHW_RECIRC:     "EN 15316-3 §6.5 (recirculare bloc)",

  // Echipamente
  REC_AUTOMATION:     "SR EN ISO 52120-1:2022 (BACS clasa C minim)",
  REC_HEAT_EQUIP:     "EU Reg. 813/2013 ErP + Mc 001-2022 §VI",
  REC_VENT_EQUIP:     "EU Reg. 1253/2014 ErP + EN 13141-7",
  REC_LIGHT_LED:      "Mc 001-2022 §V + EN 15193-1 (LENI)",
  REC_PRESENCE_SENS:  "EN 15193-1 Anexa F (factori control PD)",
  REC_HEAT_RECOVERY:  "Mc 001-2022 Anexa V + EN 16798-3 (η ≥ 70%)",

  // Regenerabile
  REC_RENEWABLES:     "L.238/2024 Art.6 (RER ≥ 30% nZEB)",
});

/**
 * Returnează articolul normativ pentru o cheie REC_* (sau null dacă nu e mapat).
 * @param {string} key - Cheia REC_* (ex: "REC_PE_INSULATE")
 * @returns {string|null}
 */
export function getRecNormative(key) {
  return REC_NORMATIVE[key] ?? null;
}

/**
 * Întoarce numărul total de chei REC_* mapate (pentru sanity check teste).
 */
export function recNormativeCount() {
  return Object.keys(REC_NORMATIVE).length;
}
