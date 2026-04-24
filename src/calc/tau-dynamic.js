/**
 * tau-dynamic.js — Sprint 22 #3
 * Calcul dinamic al factorului de reducere τ pentru elemente adiacente
 * spațiilor neîncălzite (subsoluri, poduri, scări, rosturi).
 *
 * Referințe:
 *  - Mc 001-2022 Anexa A.9.3 (factor de reducere τ pentru spații neîncălzite)
 *  - SR EN ISO 13789:2017 §8.4 (adjacent unconditioned spaces)
 *  - Mc 001-2022 Tabel 2.4 (valori implicite τ per tip element)
 *
 * Formula: τ = (θ_i − θ_u) / (θ_i − θ_e)
 *  - θ_i : temperatura interioară de confort [°C]
 *  - θ_u : temperatura spațiului neîncălzit adiacent [°C]
 *  - θ_e : temperatura exterioară de proiectare [°C]
 *
 * Dacă τ > 1 → clamp la 1 (spațiu adiacent mai rece ca exteriorul)
 * Dacă τ < 0 → clamp la 0 (spațiu adiacent mai cald ca interiorul — fără pierderi)
 */

/**
 * @typedef {object} TauInputs
 * @property {number} theta_i - temperatura interioară [°C]
 * @property {number} theta_u - temperatura spațiului adiacent [°C]
 * @property {number} theta_e - temperatura exterioară [°C]
 */

/**
 * Valori implicite θ_u recomandate de Mc 001-2022 când nu există măsurători.
 * Se poate suprascrie per element în UI.
 */
export const THETA_U_DEFAULT = {
  PP: 5,   // pod neîncălzit (sub acoperiș)
  PB: 10,  // planșeu peste subsol neîncălzit
  PS: 10,  // perete subsol (sub CTS)
  PR: 15,  // perete la rost / casa scării neîncălzită
};

/**
 * Calculează factorul de reducere τ conform Mc 001-2022 Anexa A.9.3.
 *
 * @param {number} theta_i - temperatura interioară [°C]
 * @param {number} theta_u - temperatura spațiului adiacent [°C]
 * @param {number} theta_e - temperatura exterioară [°C]
 * @returns {number} τ ∈ [0, 1]
 */
export function calcDynamicTau(theta_i, theta_u, theta_e) {
  // Respinge null/undefined/"" explicit înainte de coerciție (Number(null)=0)
  if (theta_i === null || theta_i === undefined || theta_i === "") return 1;
  if (theta_u === null || theta_u === undefined || theta_u === "") return 1;
  if (theta_e === null || theta_e === undefined || theta_e === "") return 1;
  const ti = Number(theta_i);
  const tu = Number(theta_u);
  const te = Number(theta_e);
  if (!Number.isFinite(ti) || !Number.isFinite(tu) || !Number.isFinite(te)) return 1;
  const delta = ti - te;
  if (delta === 0) return 1; // degenerat — ΔT nul, fără sens fizic
  const tau = (ti - tu) / delta;
  // Clamp [0, 1]: valori subunitare admise; valori > 1 nu au sens fizic (gradient inversat)
  return Math.max(0, Math.min(1, tau));
}

/**
 * Rezolvă τ pentru un element dat, cu prioritate:
 *   1. element.theta_u (override explicit per element, Sprint 22 #3)
 *   2. heating.tAttic / heating.tBasement / heating.tStaircase (global heating)
 *   3. THETA_U_DEFAULT per tip element (Mc 001-2022 Tabel 2.4)
 *   4. element.tau static (fallback final, ELEMENT_TYPES)
 *
 * @param {object} element - { type, theta_u?, tau? (static) }
 * @param {object} heating - { theta_int, tBasement?, tAttic?, tStaircase? }
 * @param {number} theta_e - temperatura exterioară [°C]
 * @param {number} tauStatic - τ static din ELEMENT_TYPES pentru fallback
 * @returns {{ tau: number, source: string }}
 */
export function resolveTau(element, heating, theta_e, tauStatic) {
  const theta_i = parseFloat(heating?.theta_int) || 20;
  const type = element?.type;

  // (1) Override explicit per element
  const elThetaU = element?.theta_u;
  if (elThetaU !== undefined && elThetaU !== null && elThetaU !== "" && Number.isFinite(parseFloat(elThetaU))) {
    return {
      tau: calcDynamicTau(theta_i, parseFloat(elThetaU), theta_e),
      source: "element-override",
    };
  }

  // (2) Global heating temperatures
  let thetaU;
  if (type === "PB" || type === "PS") {
    thetaU = parseFloat(heating?.tBasement);
  } else if (type === "PP") {
    thetaU = parseFloat(heating?.tAttic);
  } else if (type === "PR") {
    thetaU = parseFloat(heating?.tStaircase);
  }
  if (Number.isFinite(thetaU)) {
    return {
      tau: calcDynamicTau(theta_i, thetaU, theta_e),
      source: "heating-global",
    };
  }

  // (3) Default per tip element (Mc 001-2022)
  if (THETA_U_DEFAULT[type] !== undefined) {
    return {
      tau: calcDynamicTau(theta_i, THETA_U_DEFAULT[type], theta_e),
      source: "mc001-default",
    };
  }

  // (4) Fallback: τ static
  return {
    tau: typeof tauStatic === "number" ? tauStatic : 1,
    source: "static",
  };
}
