/**
 * reference-building.js — Calcul clădire de referință (Mc 001-2022).
 *
 * Audit 2 mai 2026 — P1.9: înainte qf_ref_t/qf_ref_e erau calculate prin
 * scalare proporțională (qf_real × ep_ref/ep_real). Mc 001-2022 cere bilanț
 * pe clădire de referință cu echipamente standard:
 *   - U_ref pe elementele de anvelopă (din getURefNZEB)
 *   - η_ref încălzire = 0.92 (centrală condensare standard)
 *   - η_ref ACM = 0.85
 *   - EER_ref răcire = 3.5
 *   - hrEta_ref = 0 (clădirea de referință nu are recuperare căldură)
 *   - Sistem iluminat LED standard (LENI_ref ~ 8 kWh/(m²·an) rezidențial)
 *
 * Această implementare este un BILANȚ APROXIMATIV pentru output-uri DOCX/XML,
 * NU înlocuiește calculul EnergyPlus/SR EN ISO 52016-1 detaliat. Pentru
 * audit complet (Pas 7 / Step 8), se folosește reference-building EnergyPlus.
 *
 * Fallback: dacă inputs lipsesc (instSummary undefined etc.), folosim
 * scalarea proporțională (compatibil cu comportamentul vechi) cu un flag
 * `usedFallback: true` în output.
 */

import { getURefNZEB } from "../data/u-reference.js";

// Echipamente standard clădire de referință (Mc 001-2022 Cap. 5).
const REF_ETA_HEATING = 0.92;   // Centrală condensare
const REF_ETA_ACM = 0.85;       // Boiler standard
const REF_EER_COOLING = 3.5;    // Split inverter standard
const REF_HR_VENT = 0;          // Fără recuperare căldură
const REF_LENI = 8;             // LED standard rezidențial (kWh/(m²·an))

/**
 * @typedef {Object} RefBuildingInput
 * @property {Object} building       — { category, areaUseful, ... }
 * @property {Object} climate        — { ngz, theta_e, ... }
 * @property {Object} instSummary    — { qf_h, qf_w, qf_c, qf_v, qf_l, ep_total_m2, hasCool, hrEta }
 * @property {number} epRefMax       — prag nZEB EP (kWh/(m²·an))
 * @property {number} [epFinal]      — EP real al clădirii (pentru fallback proportional)
 * @property {Array}  [opaqueElements]
 * @property {Array}  [glazingElements]
 * @property {Function} [calcOpaqueR]
 *
 * @typedef {Object} RefBuildingResult
 * @property {number} qf_h           — Energie finală încălzire referință
 * @property {number} qf_w           — Energie finală ACM referință
 * @property {number} qf_c           — Energie finală răcire referință
 * @property {number} qf_v           — Energie finală ventilare referință
 * @property {number} qf_l           — Energie finală iluminat referință
 * @property {number} qf_thermal     — qf_h + qf_w (total termic specific m²)
 * @property {number} qf_electric    — qf_c + qf_v + qf_l (total electric specific m²)
 * @property {number} ep_total_m2    — EP total referință (kWh/(m²·an))
 * @property {string} method         — "fallback_proportional" | "ref_equipment"
 * @property {boolean} usedFallback  — true dacă s-a folosit scalarea proporțională
 */

/**
 * Calcul bilanț clădire de referință.
 *
 * Strategia:
 *   1. Dacă instSummary lipsește → fallback proporțional (qf_real × epRefMax/epFinal)
 *   2. Dacă instSummary există → bilanț cu echipamente standard:
 *      - qf_h_ref = qf_h_real × (η_real / η_ref) — nevoia termică e aceeași;
 *        doar randamentul diferă. Pentru clădirea cu η_real > 0:
 *        qf_h_ref = qf_h_real × (η_total_real / η_ref_combined)
 *      - qf_w_ref = qf_w_real × (η_real_acm / η_ref_acm)
 *      - qf_c_ref = qf_c_real × (EER_real / EER_ref)
 *      - qf_v_ref = qf_v_real × (1 - hrEta_real) / (1 - hrEta_ref)  [hrEta_ref=0]
 *      - qf_l_ref = LENI_ref × Au (înlocuit cu standard, nu scalare)
 *
 * Această abordare e mai precisă decât scalarea totală epRef/epFinal, fiindcă
 * recunoaște că nevoia de căldură e identică pentru aceeași anvelopă, iar
 * referința doar standardizează echipamentele.
 *
 * @param {RefBuildingInput} input
 * @returns {RefBuildingResult}
 */
export function calcReferenceBuilding(input) {
  const {
    building = {},
    instSummary,
    epRefMax,
    epFinal,
  } = input || {};

  const Au = parseFloat(building.areaUseful) || 0;

  // ──────────────────────────────────────────
  // FALLBACK: inputs lipsă → scalare proporțională (comportament vechi)
  // ──────────────────────────────────────────
  if (!instSummary || !Number.isFinite(epFinal) || epFinal <= 0 || !Number.isFinite(epRefMax)) {
    return makeFallback(input);
  }

  // Energie finală reală pe utilități (kWh/an total clădire)
  const qf_h_real = parseFloat(instSummary.qf_h) || 0;
  const qf_w_real = parseFloat(instSummary.qf_w) || 0;
  const qf_c_real = parseFloat(instSummary.qf_c) || 0;
  const qf_v_real = parseFloat(instSummary.qf_v) || 0;
  const qf_l_real = parseFloat(instSummary.qf_l) || 0;

  // Randamente reale (fallback la valori standard dacă lipsesc)
  const eta_h_real = clamp01(instSummary.eta_total_h, REF_ETA_HEATING);
  const eta_w_real = clamp01(instSummary.eta_total_w, REF_ETA_ACM);
  const eer_real = parseFloat(instSummary.eer) || REF_EER_COOLING;
  const hrEta_real = clamp01(instSummary.hrEta, 0);

  // Bilanț clădire de referință
  // qf_ref = qf_real × (η_real / η_ref) — nevoia termică e aceeași
  // (anvelopa standardizează la U_ref, dar pentru output rapid păstrăm
  //  nevoia reală și standardizăm doar randamentele).
  const qf_h_ref = eta_h_real > 0 ? qf_h_real * (eta_h_real / REF_ETA_HEATING) : qf_h_real;
  const qf_w_ref = eta_w_real > 0 ? qf_w_real * (eta_w_real / REF_ETA_ACM) : qf_w_real;
  const qf_c_ref = eer_real > 0 ? qf_c_real * (eer_real / REF_EER_COOLING) : qf_c_real;
  const qf_v_ref = (1 - hrEta_real) > 0
    ? qf_v_real * (1 - REF_HR_VENT) / (1 - hrEta_real)
    : qf_v_real;
  // Iluminat: standard LENI_ref × Au (nu scalare)
  const qf_l_ref = REF_LENI * Au;

  // Specific m²
  const qf_thermal_m2 = Au > 0 ? (qf_h_ref + qf_w_ref) / Au : 0;
  const qf_electric_m2 = Au > 0 ? (qf_c_ref + qf_v_ref + qf_l_ref) / Au : 0;

  return {
    qf_h: qf_h_ref,
    qf_w: qf_w_ref,
    qf_c: qf_c_ref,
    qf_v: qf_v_ref,
    qf_l: qf_l_ref,
    qf_thermal: qf_thermal_m2,
    qf_electric: qf_electric_m2,
    ep_total_m2: epRefMax,
    method: "ref_equipment",
    usedFallback: false,
  };
}

/**
 * Fallback proporțional (compatibil cu comportamentul vechi):
 *   qf_ref = qf_real × (epRefMax / epFinal)
 * @param {RefBuildingInput} input
 * @returns {RefBuildingResult}
 */
function makeFallback(input) {
  const { instSummary, epRefMax, epFinal, building = {} } = input || {};
  const Au = parseFloat(building.areaUseful) || 0;
  const scale = (Number.isFinite(epFinal) && epFinal > 0 && Number.isFinite(epRefMax))
    ? epRefMax / epFinal
    : 1;

  const qf_h = (parseFloat(instSummary?.qf_h) || 0) * scale;
  const qf_w = (parseFloat(instSummary?.qf_w) || 0) * scale;
  const qf_c = (parseFloat(instSummary?.qf_c) || 0) * scale;
  const qf_v = (parseFloat(instSummary?.qf_v) || 0) * scale;
  const qf_l = (parseFloat(instSummary?.qf_l) || 0) * scale;

  return {
    qf_h, qf_w, qf_c, qf_v, qf_l,
    qf_thermal: Au > 0 ? (qf_h + qf_w) / Au : 0,
    qf_electric: Au > 0 ? (qf_c + qf_v + qf_l) / Au : 0,
    ep_total_m2: epRefMax || 0,
    method: "fallback_proportional",
    usedFallback: true,
  };
}

/** Forțează valoare în [0, 1] cu fallback. */
function clamp01(v, fallback) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 1) return Math.min(n, 5); // permite COP > 1 (HP) dar caps
  return n;
}

/** Constante exportate pentru testare/inspecție. */
export const REF_EQUIPMENT = Object.freeze({
  REF_ETA_HEATING,
  REF_ETA_ACM,
  REF_EER_COOLING,
  REF_HR_VENT,
  REF_LENI,
});

// Re-export getURefNZEB pentru convenience (nu folosit acum în calc, dar
// disponibil pentru extensii viitoare — bilanț per element opac).
export { getURefNZEB };
