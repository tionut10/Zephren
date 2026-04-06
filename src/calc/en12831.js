// ═══════════════════════════════════════════════════════════════
// SARCINĂ TERMICĂ DE VÂRF — SR EN 12831-1:2017 (metoda simplificată)
// Utilizat pentru dimensionarea instalațiilor de încălzire/răcire
// ═══════════════════════════════════════════════════════════════

import _en12831Data from "../data/en12831-data.json";

export const THETA_INT_DESIGN = _en12831Data.THETA_INT_DESIGN;
export const SAFETY_FACTOR = _en12831Data.SAFETY_FACTOR;

// Corecție altitudine — presiune atmosferică mai mică → densitate aer mai mică
function altitudeCorrection(alt) {
  return Math.pow(1 - 0.0000226 * (alt || 0), 5.256);
}

// ─── Calcul sarcină termică de vârf per element de anvelopă ───
function calcElementLoad(area, U, tau, tInt, tExt) {
  return area * U * tau * Math.max(0, tInt - tExt); // W
}

export function calcPeakThermalLoad(params) {
  const {
    opaqueElements,   // array elemente opace cu {area, U sau layers, type, tau}
    glazingElements,  // array vitraj cu {area, u, orientation}
    thermalBridges,   // array punți termice cu {length, psi}
    V,                // volum încălzit [m³]
    Au,               // arie utilă [m³]
    n50,              // rata infiltrații [h⁻¹]
    hrEta,            // eficiență recuperare căldură [0-1]
    climate,          // obiect climat cu theta_e (temp calcul iarnă) și alt
    category,         // cod categorie clădire
    structure,        // tip structură
    windExposure,     // expunere vânt
    reheatingPower,   // putere suplimentară reîncălzire după pauză [W/m²]
  } = params;

  if (!climate || !Au || !V) return null;

  const tExt = climate.theta_e || -15; // temperatura exterioară de calcul [°C]
  const tInt = THETA_INT_DESIGN[category] || 20;
  const deltaT = tInt - tExt;
  const alt = climate.alt || 0;
  const altCorr = altitudeCorrection(alt);
  const isRes = ["RI","RC","RA"].includes(category || "RI");

  // ─── 1. Pierderi prin transmisie H_T [W/K] ───
  let H_T = 0;
  const elementLoads = [];

  (opaqueElements || []).forEach(el => {
    const area = parseFloat(el.area) || 0;
    let U;
    if (el.U) {
      U = parseFloat(el.U);
    } else {
      const R = (el.layers || []).reduce((r, l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
      U = 1 / Math.max(R, 0.05);
    }
    const tau = el.tau !== undefined ? el.tau : 1.0;
    const load = area * U * tau; // W/K
    H_T += load;
    elementLoads.push({ name: el.name || el.type, area, U: Math.round(U*100)/100, tau, load_WK: Math.round(load*10)/10 });
  });

  (glazingElements || []).forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    const U = parseFloat(gl.u) || 2.5;
    const load = area * U;
    H_T += load;
    elementLoads.push({ name: "Vitrare " + (gl.orientation || ""), area, U, tau: 1.0, load_WK: Math.round(load*10)/10 });
  });

  // Punți termice
  let H_TB = 0;
  (thermalBridges || []).forEach(tb => {
    const psiL = (parseFloat(tb.length)||0) * (parseFloat(tb.psi)||0);
    H_TB += psiL;
  });
  H_T += H_TB;

  // ─── 2. Pierderi prin ventilare H_V [W/K] ───
  // Schimb aer minim igienic
  const n_min = 0.5; // h⁻¹ — minim igienic
  // Infiltrații (calculul e_shield din n50)
  const e_shield = windExposure === "expus" ? 0.15 : windExposure === "protejat" ? 0.02 : 0.07;
  const n_inf = n50 * e_shield;
  const n_eff = Math.max(n_min, n_inf); // schimb de aer efectiv [h⁻¹]
  const H_V_raw = 0.34 * n_eff * V * altCorr; // W/K (0.34 = ρ×c/3600 ptr aer uscat)
  const H_V = H_V_raw * (1 - (hrEta || 0)); // cu recuperare căldură

  // ─── 3. Sarcină termică de vârf Φ_H_design [W] ───
  const H_total = H_T + H_V; // W/K
  const phi_H_design_raw = H_total * deltaT; // W — la temperatura de calcul

  // Factor de siguranță
  const sf = isRes ? SAFETY_FACTOR.rezidential : SAFETY_FACTOR.nerezidential;
  const phi_H_design = phi_H_design_raw * sf;

  // ─── 4. Sarcină de reîncălzire (clădiri cu funcționare intermitentă) ───
  const phi_reheat = reheatingPower ? (reheatingPower * Au) : 0;
  const phi_H_total = phi_H_design + phi_reheat;

  // ─── 5. Putere specifică [W/m²] ───
  const phi_specific = Au > 0 ? phi_H_total / Au : 0;

  // ─── 6. Clasificare sistem de încălzire recomandat ───
  let systemRec;
  if (phi_H_total < 3000) systemRec = "Electrice directe / IR panou";
  else if (phi_H_total < 8000) systemRec = "Pompă de căldură mini-split sau aer-apă 6-8 kW";
  else if (phi_H_total < 15000) systemRec = "Pompă de căldură aer-apă 10-14 kW";
  else if (phi_H_total < 30000) systemRec = "Pompă de căldură aer-apă 15-25 kW sau cazan condensare";
  else systemRec = "Instalație centralizată. Consultați proiectant HVAC.";

  return {
    tExt, tInt, deltaT,
    H_T: Math.round(H_T * 10) / 10,
    H_V: Math.round(H_V * 10) / 10,
    H_TB: Math.round(H_TB * 10) / 10,
    H_total: Math.round(H_total * 10) / 10,
    phi_H_design: Math.round(phi_H_design),
    phi_H_total: Math.round(phi_H_total),
    phi_specific: Math.round(phi_specific * 10) / 10,
    phi_reheat: Math.round(phi_reheat),
    safetyFactor: sf,
    systemRecommendation: systemRec,
    elementLoads,
    method: "SR EN 12831-1:2017 (metodă simplificată)",
  };
}

// ─── Sarcină termică de răcire — estimare simplificată (SR EN 15243) ───
export function calcPeakCoolingLoad(params) {
  const { Au, glazingElements, climate, internalGains, ventFlow } = params;
  if (!Au || !climate) return null;

  const tExtSummer = Math.max.apply(null, (climate.temp_month || []).slice(5, 8)) + 5; // +5°C amplitudine de vârf
  const tIntCool = 26; // setpoint răcire [°C]

  // Câștiguri solare maxime (luni de vară)
  let Q_sol_max = 0;
  const mFracSummer = 0.14; // fracție solară iulie (luna de vârf)
  (glazingElements || []).forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    const g = parseFloat(gl.g) || 0.5;
    const fr = (parseFloat(gl.frameRatio) || 25) / 100;
    const solarKey = gl.orientation === "Orizontal" ? "Oriz" : (gl.orientation || "S");
    const solarIrrad = (climate.solar && climate.solar[solarKey]) || 400;
    Q_sol_max += area * g * (1 - fr) * solarIrrad * mFracSummer * 1000 / (30 * 24); // W estimat
  });

  // Câștiguri interne [W]
  const Q_int = (internalGains || 6) * Au; // W/m² × Au

  // Sarcina de răcire estimată
  const Q_cooling = Math.max(0, Q_sol_max + Q_int - (ventFlow || 0) * 0.34 * (tExtSummer - tIntCool));
  const phi_C_m2 = Au > 0 ? Q_cooling / Au : 0;

  return {
    tExtSummer: Math.round(tExtSummer * 10) / 10,
    tIntCool,
    Q_sol_max: Math.round(Q_sol_max),
    Q_int: Math.round(Q_int),
    phi_C_total: Math.round(Q_cooling),
    phi_C_m2: Math.round(phi_C_m2 * 10) / 10,
    coolingSysRec: Q_cooling < 5000 ? "Răcire pasivă + umbrire" :
                   Q_cooling < 15000 ? "Pompă căldură reversibilă 10-12 kW" :
                   "Sistem VRF sau chiller",
    method: "Estimare simplificată (SR EN 15243)",
  };
}
