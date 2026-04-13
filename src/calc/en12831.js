// ═══════════════════════════════════════════════════════════════
// SARCINĂ TERMICĂ DE VÂRF — SR EN 12831-1:2017/NA:2022 + C91:2024 (metoda simplificată)
// Utilizat pentru dimensionarea instalațiilor de încălzire/răcire
// ═══════════════════════════════════════════════════════════════

import _en12831Data from "../data/en12831-data.json";

export const THETA_INT_DESIGN = _en12831Data.THETA_INT_DESIGN;
export const SAFETY_FACTOR = _en12831Data.SAFETY_FACTOR;
export const GROUND_TEMP_CORR = _en12831Data.GROUND_TEMP_CORR;
export const GROUND_WATER_FACTOR = _en12831Data.GROUND_WATER_FACTOR;
export const THETA_ME_ANNUAL = _en12831Data.THETA_ME_ANNUAL;

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

  // ─── C91:2024 — factori corectie sol ───
  const climateZone = climate.zone || "III";
  const fg1 = GROUND_TEMP_CORR.fg1;
  const fg2 = GROUND_TEMP_CORR.fg2[climateZone] || 0.35;
  const thetaMeAnnual = THETA_ME_ANNUAL[climateZone] || 9.5;
  const gwDepth = params.groundWaterDepth || "over_3m";
  const Gw = GROUND_WATER_FACTOR[gwDepth] || 1.0;

  // ─── 1. Pierderi prin transmisie H_T [W/K] ───
  let H_T = 0;
  let H_T_ground = 0;
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
    // SR EN 12831-1 §6.6.2 + NA:2022/C91:2024 Tab.A17/A18: planșeu pe sol
    if (el.type === "PL" || el.type === "PB") {
      // Φ_ground = fg1 × fg2 × (A × U × Gw) × (θ_int - θ_me,an)
      const load_ground = fg1 * fg2 * area * U * Gw;
      H_T_ground += load_ground;
      elementLoads.push({ name: el.name || el.type, area, U: Math.round(U*100)/100, tau, load_WK: Math.round(load_ground*10)/10, ground: true, fg1, fg2, Gw });
    } else {
      const load = area * U * tau; // W/K
      H_T += load;
      elementLoads.push({ name: el.name || el.type, area, U: Math.round(U*100)/100, tau, load_WK: Math.round(load*10)/10 });
    }
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
  // Pierderi elemente normale: H_T × (θ_int - θ_ext)
  // Pierderi sol C91:2024: H_T_ground × (θ_int - θ_me,annual) — deltaT diferit
  const deltaTground = tInt - thetaMeAnnual;
  const phi_T_normal = H_T * deltaT;
  const phi_T_ground = H_T_ground * deltaTground;
  const H_total = H_T + H_T_ground + H_V; // W/K (pentru afișare)
  const phi_H_design_raw = phi_T_normal + phi_T_ground + H_V * deltaT; // W

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
    H_T_ground: Math.round(H_T_ground * 10) / 10,
    fg1, fg2, Gw, thetaMeAnnual,
    method: "SR EN 12831-1:2017/NA:2022 + C91:2024 (metodă simplificată)",
  };
}

// ═══════════════════════════════════════════════════════════════
// SARCINĂ TERMICĂ DE RĂCIRE — SR EN 15243:2007 §6 + CIBSE Guide A
// Metodă: bilanț termic instantaneu la ora de vârf (iulie, 14:00-15:00)
// Include: câștiguri solare diferențiate pe orientare, câștiguri interne,
//          transmisie prin anvelopă, ventilare, componentă latentă
// ═══════════════════════════════════════════════════════════════

// Iradianță solară de vârf pe orientare [W/m²] — luna iulie, 14:00, latitudine ~45°N
// Sursa: SR EN ISO 52010-1:2017/NA:2023 / PVGIS / CIBSE Guide A Tabel 2.31
const SOLAR_PEAK_W_M2 = {
  N:  80,  NE: 150, E:  350, SE: 500,
  S:  550, SV: 650, V:  600, NV: 200,
  Oriz: 800,
};

// Câștiguri interne de vârf [W/m²] per categorie — SR EN 15243 Tabel A.1, CIBSE Guide A Tabel 6.2
const INTERNAL_GAINS_PEAK = {
  RI: 5, RC: 5, RA: 5,       // rezidențial: iluminat + electrocasnice + ocupanți
  BI: 25, AD: 25,             // birouri: 12 W/m² echipamente + 8 W/m² iluminat + 5 W/m² ocupanți
  ED: 15, SA: 20,             // educație, sănătate
  HC: 15, CO: 25, SP: 20,    // hotel, comerț, sport
  AL: 20,
};

// Factor de amortizare datorat inerției termice — CIBSE Guide A Tabel 6.13
// Structuri grele absorb ~30-40% din câștigurile instantanee
const THERMAL_INERTIA_FACTOR = {
  "Structură metalică": 0.95,       // aproape fără amortizare
  "Structură lemn": 0.90,
  "Panouri prefabricate mari": 0.75,
  "Cadre beton armat": 0.70,
  "Zidărie portantă": 0.65,        // amortizare semnificativă
  "Pereți cortină + beton": 0.75,
  "BCA + cadre beton": 0.70,
  "Structură mixtă": 0.75,
};

export function calcPeakCoolingLoad(params) {
  const {
    Au, V,
    opaqueElements,
    glazingElements,
    climate,
    category,
    structure,
    internalGains,  // override câștiguri interne [W/m²]
    ventFlow,       // debit ventilare [m³/h]
    hrEta,          // eficiență recuperare (nu aplicabilă vara decât entalpic)
    occupants,      // nr. ocupanți (opțional)
    shadingFactor,  // factor umbrire exterior 0-1 (storuri, brise-soleil)
  } = params;

  if (!Au || !climate) return null;

  // ── 1. Temperatura exterioară de calcul vara ──
  // Mc 001-2022: temperatura medie a celei mai calde luni + amplitudine diurnă / 2
  // Amplitudine diurnă tipică România: 8-12°C (SR EN ISO 52010-1:2017/NA:2023)
  const tempSummer = climate.temp_month || [];
  const tExtMean = Math.max.apply(null, tempSummer.slice(5, 8)); // media lunii celei mai calde
  const diurnalAmplitude = climate.diurnal_amplitude || 10; // °C, implicit 10K
  const tExtPeak = tExtMean + diurnalAmplitude / 2; // temperatura de calcul la ora de vârf
  const tIntCool = 26; // setpoint răcire [°C] — SR EN 16798-1:2019/NA:2019 Cat. II
  const deltaTc = tExtPeak - tIntCool;

  // ── 2. Câștiguri solare prin elemente vitrate [W] ──
  // Formula: Φ_sol = Σ (A_gl × g × (1-f_frame) × I_sol,peak × f_shading)
  const sf = parseFloat(shadingFactor) || 1.0; // 1.0 = fără umbrire
  let Q_sol_peak = 0;
  const solarBreakdown = [];

  (glazingElements || []).forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    const g = parseFloat(gl.g) || 0.50;
    const fr = (parseFloat(gl.frameRatio) || 25) / 100;
    const ori = gl.orientation || "S";

    let I_peak;
    if (ori === "Mixt") {
      // Distribuție medie pe toate orientările
      I_peak = Object.values(SOLAR_PEAK_W_M2).reduce((s, v) => s + v, 0) / Object.keys(SOLAR_PEAK_W_M2).length;
    } else {
      I_peak = SOLAR_PEAK_W_M2[ori] || SOLAR_PEAK_W_M2["S"];
    }

    const phi_sol = area * g * (1 - fr) * I_peak * sf;
    Q_sol_peak += phi_sol;
    solarBreakdown.push({
      orientation: ori, area, g, I_peak,
      phi_sol: Math.round(phi_sol),
    });
  });

  // ── 3. Câștiguri interne [W] ──
  const q_int = internalGains || INTERNAL_GAINS_PEAK[category] || 20;
  const Q_int_peak = q_int * Au;

  // Câștiguri ocupanți (componentă senzibilă + latentă)
  // EN 15243: 75 W senzibil + 55 W latent per persoană (activitate sedentară)
  const nOccupants = occupants || Math.max(1, Math.round(Au / 20)); // estimare: 20 m²/pers
  const Q_occ_sensible = nOccupants * 75;
  const Q_occ_latent = nOccupants * 55;

  // ── 4. Pierderi/câștiguri prin transmisie [W] ──
  // Vara: anvelopa transmite căldură din exterior → interior când tExt > tInt
  let Q_trans = 0;
  (opaqueElements || []).forEach(el => {
    const area = parseFloat(el.area) || 0;
    const U = el.U ? parseFloat(el.U) : 0.35;
    Q_trans += area * U * Math.max(0, deltaTc);
  });
  (glazingElements || []).forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    const U = parseFloat(gl.u) || 2.0;
    Q_trans += area * U * Math.max(0, deltaTc);
  });

  // ── 5. Sarcina de ventilare [W] ──
  const Vdot = ventFlow || (0.5 * (V || Au * 2.8)); // m³/h, implicit 0.5 ach
  // Componentă senzibilă: 0.34 × V̇ × ΔT
  const Q_vent_sensible = deltaTc > 0 ? 0.34 * Vdot * deltaTc : 0;
  // Componentă latentă estimată: ~30% din senzibilă în climat temperat-continental
  const Q_vent_latent = Q_vent_sensible * 0.30;

  // ── 6. Total câștiguri instantanee [W] ──
  const Q_gains_total = Q_sol_peak + Q_int_peak + Q_occ_sensible + Q_trans + Q_vent_sensible;

  // ── 7. Factor de amortizare inerție termică ──
  const f_inertia = THERMAL_INERTIA_FACTOR[structure] || 0.75;
  const Q_sensible = Q_gains_total * f_inertia;
  const Q_latent = Q_occ_latent + Q_vent_latent;
  const Q_cooling_total = Q_sensible + Q_latent;

  // ── 8. Factor de siguranță — EN 15243 recomandă 1.10 ──
  const sf_cool = 1.10;
  const phi_C_design = Q_cooling_total * sf_cool;
  const phi_C_m2 = Au > 0 ? phi_C_design / Au : 0;

  // ── 9. Recomandare sistem ──
  let coolingSysRec;
  if (phi_C_design < 2000) coolingSysRec = "Răcire pasivă + ventilare nocturnă + umbrire";
  else if (phi_C_design < 5000) coolingSysRec = "Split monosplit / multisplit 2-5 kW";
  else if (phi_C_design < 12000) coolingSysRec = "Pompă căldură reversibilă aer-apă 5-12 kW";
  else if (phi_C_design < 30000) coolingSysRec = "Sistem VRF multisplit 12-28 kW";
  else if (phi_C_design < 100000) coolingSysRec = "Chiller răcit cu aer 30-100 kW + fan coil-uri";
  else coolingSysRec = "Chiller centralizat + distribuție apă răcită. Consultați proiectant HVAC.";

  // ── 10. Raport SHR (Sensible Heat Ratio) ──
  const SHR = Q_cooling_total > 0 ? Q_sensible / Q_cooling_total : 1;

  return {
    tExtPeak: Math.round(tExtPeak * 10) / 10,
    tExtMean: Math.round(tExtMean * 10) / 10,
    tIntCool,
    diurnalAmplitude,
    deltaTc: Math.round(deltaTc * 10) / 10,
    Q_sol_peak: Math.round(Q_sol_peak),
    Q_int_peak: Math.round(Q_int_peak),
    Q_occ_sensible: Math.round(Q_occ_sensible),
    Q_occ_latent: Math.round(Q_occ_latent),
    Q_trans: Math.round(Q_trans),
    Q_vent_sensible: Math.round(Q_vent_sensible),
    Q_vent_latent: Math.round(Q_vent_latent),
    Q_sensible: Math.round(Q_sensible),
    Q_latent: Math.round(Q_latent),
    f_inertia,
    SHR: Math.round(SHR * 100) / 100,
    phi_C_design: Math.round(phi_C_design),
    phi_C_m2: Math.round(phi_C_m2 * 10) / 10,
    safetyFactor: sf_cool,
    coolingSysRec,
    solarBreakdown,
    method: "SR EN 15243:2007 §6 + CIBSE Guide A (bilanț instantaneu la ora de vârf)",
  };
}
