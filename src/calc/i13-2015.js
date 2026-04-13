// ═══════════════════════════════════════════════════════════════
// NORMATIV I13-2015 (mod. Ord. MDLPA 170/2023)
// Proiectare, executare și exploatare instalații de încălzire centrală
// ═══════════════════════════════════════════════════════════════
//
// Referințe:
//   - I13-2015 (Ord. MLPAT 2015) + modificări Ord. MDLPA 170/2023
//   - SR EN 12831-1:2017 — sarcină termică de calcul
//   - SR EN 442-1/2 — corpuri de încălzire (radiatoare)
//   - SR EN 14825:2022 — pompe de căldură SCOP/SEER
//   - Mc 001-2022 Cap. 3 — randamente instalații
//
// Acest modul acoperă:
//   1. Selecție corpuri de încălzire (tip, putere nominală, corecții)
//   2. Dimensionare conducte (viteză, pierdere sarcină)
//   3. Verificare debit agent termic
//   4. Echilibrare hidraulică
//   5. Verificare regim termic (75/65, 55/45, 35/30)
//   6. Conformitate nZEB (I13-2015 Art.1.2 mod. 2023)
// ═══════════════════════════════════════════════════════════════

// ── 1. REGIMURI TERMICE — I13-2015 Art. 5.2 (mod. 2023) ──────────
// Regimuri de funcționare ale sistemului de încălzire
export const THERMAL_REGIMES = [
  { id: "HT_75_65",  label: "Temperatură înaltă 75/65°C (clasic radiatoare)",   tFlow: 75, tReturn: 65, deltaT: 10 },
  { id: "MT_65_50",  label: "Temperatură medie 65/50°C (condensare + radiatoare)", tFlow: 65, tReturn: 50, deltaT: 15 },
  { id: "LT_55_45",  label: "Temperatură joasă 55/45°C (PC + radiatoare supradimensionate)", tFlow: 55, tReturn: 45, deltaT: 10 },
  { id: "VLT_45_35", label: "Temperatură foarte joasă 45/35°C (PC + pardoseală radiantă)", tFlow: 45, tReturn: 35, deltaT: 10 },
  { id: "FH_35_30",  label: "Pardoseală radiantă 35/30°C (bază joasă)",         tFlow: 35, tReturn: 30, deltaT: 5 },
];

// ── 2. PUTERE NOMINALĂ RADIATOARE — SR EN 442-1/2 ────────────────
// Puterea nominală se dă la ΔT = 50K (75/65/20°C, regim EN 442)
// Corecție la alt regim: Q_real = Q_nom × (ΔT_real / 50)^n
// n = exponent radiator: 1.3 (radiatoare oțel), 1.33 (fontă), 1.25 (aluminiu)
// ΔT_real = (tFlow + tReturn) / 2 - tRoom
export const RADIATOR_EXPONENTS = {
  otel_panou:  1.30, // radiatoare oțel panou tip 11/21/22/33
  fonta:       1.33, // radiatoare fontă coloane
  aluminiu:    1.25, // radiatoare aluminiu
  tubular:     1.30, // radiatoare tubulare design
  convector:   1.40, // convectoare (predominant convecție)
  pardoseala:  1.10, // încălzire în pardoseală (predominant radiație)
};

/**
 * Calculează puterea reală a unui radiator la un regim termic diferit de nominal (75/65/20)
 * Conform SR EN 442-2:2014 + I13-2015 Art. 5.3
 *
 * @param {number} Q_nom    - Putere nominală [W] la ΔT=50K (regim EN 442: 75/65/20)
 * @param {number} tFlow    - Temperatura de ducere [°C]
 * @param {number} tReturn  - Temperatura de întoarcere [°C]
 * @param {number} tRoom    - Temperatura camerei [°C] (implicit 20)
 * @param {string} radType  - Tip radiator din RADIATOR_EXPONENTS
 * @returns {{ Q_real, correctionFactor, deltaT_real }}
 */
export function calcRadiatorPowerAtRegime(Q_nom, tFlow, tReturn, tRoom, radType) {
  tRoom = tRoom || 20;
  const n = RADIATOR_EXPONENTS[radType] || 1.30;
  const deltaT_nom = 50; // ΔT nominal EN 442 = (75+65)/2 - 20 = 50K
  const deltaT_real = (tFlow + tReturn) / 2 - tRoom;

  if (deltaT_real <= 0) return { Q_real: 0, correctionFactor: 0, deltaT_real: 0 };

  const correctionFactor = Math.pow(deltaT_real / deltaT_nom, n);
  const Q_real = Q_nom * correctionFactor;

  return {
    Q_real: Math.round(Q_real),
    correctionFactor: Math.round(correctionFactor * 1000) / 1000,
    deltaT_real: Math.round(deltaT_real * 10) / 10,
    deltaT_nom,
    n,
  };
}

// ── 3. DIMENSIONARE CONDUCTE — I13-2015 Art. 7 ──────────────────
// Criteriu: viteza agentului termic în conducte < v_max
// v_max = 0.5 m/s (legătură la corpuri), 0.8 m/s (coloane), 1.2 m/s (distribuție)
// Pierdere de sarcină liniară R: 50-150 Pa/m (optim 80-120 Pa/m)

export const PIPE_VELOCITY_LIMITS = {
  radiator_connection: 0.5,  // m/s — legătură la corpul de încălzire
  riser:               0.8,  // m/s — coloane verticale
  branch:              1.0,  // m/s — ramuri distribuție
  main:                1.2,  // m/s — conducte magistrale
  floor_heating:       0.5,  // m/s — circuite pardoseală radiantă
};

// Diametre standard conducte PPR/Cu (interior) [mm]
const PIPE_DIAMETERS = [10, 12, 15, 20, 25, 32, 40, 50, 65, 80, 100];

/**
 * Calculează debitul de agent termic și selectează diametrul conductei
 * Conform I13-2015 Art. 7.2 + SR EN 12831-1
 *
 * @param {number} Q_thermal - Sarcina termică transportată [W]
 * @param {number} deltaT    - Diferența de temperatură ducere-întoarcere [K]
 * @param {string} pipeType  - Tip conductă din PIPE_VELOCITY_LIMITS
 * @returns {{ massFlow, volumeFlow, selectedDiameter, velocity, R_linear, conform }}
 */
export function calcPipeSizing(Q_thermal, deltaT, pipeType) {
  if (!Q_thermal || !deltaT) return null;

  // cp_water = 4186 J/(kg·K), rho_water ≈ 980 kg/m³ (la 55°C)
  const cp_water = 4186;
  const rho_water = 980;

  // Debit masic [kg/s] = Q / (cp × ΔT)
  const massFlow = Q_thermal / (cp_water * deltaT);
  // Debit volumic [m³/s]
  const volumeFlow = massFlow / rho_water;
  // Debit volumic [L/h] (pentru afișare practică)
  const volumeFlow_Lh = volumeFlow * 3600 * 1000;

  const v_max = PIPE_VELOCITY_LIMITS[pipeType] || 1.0;

  // Selectare diametru: A = V̇ / v_max → d = 2 × sqrt(A/π)
  const A_min = volumeFlow / v_max; // m²
  const d_min = 2 * Math.sqrt(A_min / Math.PI) * 1000; // mm

  // Selectăm cel mai mic diametru standard >= d_min
  let selectedDiameter = PIPE_DIAMETERS[PIPE_DIAMETERS.length - 1];
  for (const d of PIPE_DIAMETERS) {
    if (d >= d_min) { selectedDiameter = d; break; }
  }

  // Viteză reală cu diametrul selectat
  const A_real = Math.PI * Math.pow(selectedDiameter / 2000, 2); // m²
  const velocity = volumeFlow / A_real; // m/s

  // Pierdere de sarcină liniară R [Pa/m] — Darcy-Weisbach simplificat
  // R ≈ 8 × f × ρ × v² / (π² × d⁵) sau estimare practică:
  // R ≈ 0.25 × ρ × v² / d (aproximare pentru Re turbulent, țevi netede)
  const R_linear = 0.25 * rho_water * Math.pow(velocity, 2) / (selectedDiameter / 1000);

  return {
    massFlow_kgs: Math.round(massFlow * 10000) / 10000,
    volumeFlow_Lh: Math.round(volumeFlow_Lh * 10) / 10,
    selectedDiameter_mm: selectedDiameter,
    velocity_ms: Math.round(velocity * 100) / 100,
    v_max,
    R_linear_Pa_m: Math.round(R_linear),
    R_optimal: R_linear >= 50 && R_linear <= 150,
    conform: velocity <= v_max,
  };
}

// ── 4. ECHILIBRARE HIDRAULICĂ — I13-2015 Art. 8 ─────────────────
/**
 * Verifică echilibrarea hidraulică a circuitelor
 * Conform I13-2015 Art. 8.3: diferența de presiune între circuite < 15%
 *
 * @param {Array} circuits - Array cu { name, Q_w, length_m, diameter_mm }
 * @returns {{ balanced, maxImbalance_pct, circuits }}
 */
export function checkHydraulicBalance(circuits) {
  if (!circuits || !circuits.length) return null;

  const results = circuits.map(c => {
    const Q = c.Q_w || 0;
    const L = c.length_m || 10;
    const d = c.diameter_mm || 20;
    const rho = 980;
    const cp = 4186;
    const deltaT = c.deltaT || 10;

    const massFlow = Q / (cp * deltaT);
    const A = Math.PI * Math.pow(d / 2000, 2);
    const v = A > 0 ? (massFlow / rho) / A : 0;
    // Pierdere de sarcină totală estimată: R × L × 1.3 (factor accesorii locale)
    const R = d > 0 ? 0.25 * rho * Math.pow(v, 2) / (d / 1000) : 0;
    const deltaP = R * L * 1.3; // Pa

    return { ...c, massFlow_kgs: massFlow, velocity_ms: v, deltaP_Pa: Math.round(deltaP) };
  });

  const pressures = results.map(r => r.deltaP_Pa);
  const maxP = Math.max.apply(null, pressures);
  const minP = Math.min.apply(null, pressures.filter(p => p > 0));
  const maxImbalance = maxP > 0 ? ((maxP - minP) / maxP) * 100 : 0;

  return {
    balanced: maxImbalance <= 15, // I13-2015 Art. 8.3: max 15% diferență
    maxImbalance_pct: Math.round(maxImbalance * 10) / 10,
    threshold_pct: 15,
    circuits: results,
  };
}

// ── 5. VERIFICARE CONFORMITATE nZEB — I13-2015 Art. 1.2 (mod. 2023) ──
/**
 * Verifică dacă sistemul de încălzire este compatibil cu cerințele nZEB
 * Conform I13-2015 Art. 1.2 modificat prin Ord. MDLPA 170/2023
 *
 * Cerințe nZEB pentru instalații de încălzire:
 * - Sursa trebuie să aibă η_gen ≥ 0.90 sau COP ≥ 3.0
 * - Distribuția trebuie să aibă η_dist ≥ 0.92
 * - Reglajul trebuie să fie minim zonal (η_ctrl ≥ 0.90)
 * - Temperatura de ducere ≤ 55°C recomandat (compatibil PC)
 * - Recuperare căldură ventilare η ≥ 0.70
 *
 * @param {Object} system - { eta_gen, isCOP, eta_dist, eta_ctrl, tFlow, hrEta }
 * @returns {{ nzebConform, checks, recommendations }}
 */
export function checkI13nZEBConformity(system) {
  const checks = [];
  const recommendations = [];

  // Sursă de căldură
  const isCOP = system.isCOP || false;
  const eta_gen = parseFloat(system.eta_gen) || 0;
  if (isCOP) {
    const copOk = eta_gen >= 3.0;
    checks.push({ item: "COP sursă de căldură", value: eta_gen, threshold: "≥ 3.0", conform: copOk });
    if (!copOk) recommendations.push("Pompă de căldură cu COP ≥ 3.0 (aer-apă inverter sau sol-apă)");
  } else {
    const etaOk = eta_gen >= 0.90;
    checks.push({ item: "Randament sursă", value: eta_gen, threshold: "≥ 0.90", conform: etaOk });
    if (!etaOk) recommendations.push("Cazan condensare (η ≥ 1.05) sau pompă de căldură");
  }

  // Distribuție
  const eta_dist = parseFloat(system.eta_dist) || 0;
  const distOk = eta_dist >= 0.92;
  checks.push({ item: "Randament distribuție", value: eta_dist, threshold: "≥ 0.92", conform: distOk });
  if (!distOk) recommendations.push("Izolarea conductelor conform EN ISO 12241 (min. 30 mm MW sau 20 mm PUR)");

  // Reglaj
  const eta_ctrl = parseFloat(system.eta_ctrl) || 0;
  const ctrlOk = eta_ctrl >= 0.90;
  checks.push({ item: "Randament reglaj", value: eta_ctrl, threshold: "≥ 0.90", conform: ctrlOk });
  if (!ctrlOk) recommendations.push("Reglaj zonal cu compensare climatică sau TRV + termostat ambiental");

  // Regim termic (recomandat ≤ 55°C pentru compatibilitate PC)
  const tFlow = parseFloat(system.tFlow) || 75;
  const tempOk = tFlow <= 55;
  checks.push({ item: "Temperatură ducere", value: tFlow + "°C", threshold: "≤ 55°C (recomandat)", conform: tempOk });
  if (!tempOk) recommendations.push("Trecere la regim 55/45°C sau 45/35°C (necesită redimensionare corpuri)");

  // Recuperare căldură ventilare
  const hrEta = parseFloat(system.hrEta) || 0;
  const hrOk = hrEta >= 0.70;
  checks.push({ item: "Recuperare căldură ventilare", value: (hrEta * 100) + "%", threshold: "≥ 70%", conform: hrOk });
  if (!hrOk) recommendations.push("VMC dublă flux cu recuperare ≥ 75% (echipament certificat EN 308)");

  const nConform = checks.filter(c => c.conform).length;
  const nzebConform = nConform === checks.length;

  return {
    nzebConform,
    nConform,
    totalChecks: checks.length,
    checks,
    recommendations,
    verdict: nzebConform
      ? "CONFORM I13-2015 (mod. 2023) — sistem compatibil nZEB"
      : `NECONFORM — ${checks.length - nConform} criterii nesatisfăcute`,
  };
}

// ── 6. SELECȚIE RAPIDĂ CORPURI DE ÎNCĂLZIRE — I13-2015 Art. 5 ────
/**
 * Selectează tipul și dimensiunea corpului de încălzire per cameră
 *
 * @param {number} Q_room    - Sarcina termică a camerei [W] (din EN 12831)
 * @param {string} roomType  - Tip cameră: "dormitor", "living", "baie", "bucatarie", "hol", "birou"
 * @param {Object} regime    - Regim termic { tFlow, tReturn }
 * @param {string} radType   - Tip radiator preferat
 * @returns {{ Q_nom_needed, recommendation, radType, regime }}
 */
export function selectHeatingBody(Q_room, roomType, regime, radType) {
  if (!Q_room) return null;

  const tFlow = regime?.tFlow || 75;
  const tReturn = regime?.tReturn || 65;
  const tRoom = roomType === "baie" ? 24 : 20; // I13-2015: băi = 24°C, rest = 20°C

  const n = RADIATOR_EXPONENTS[radType] || 1.30;
  const deltaT_real = (tFlow + tReturn) / 2 - tRoom;
  const deltaT_nom = 50;

  if (deltaT_real <= 0) return { error: "Regim termic insuficient — ΔT ≤ 0" };

  const correctionFactor = Math.pow(deltaT_real / deltaT_nom, n);
  // Puterea nominală necesară (la ΔT=50K) = Q_room / correctionFactor
  const Q_nom_needed = Q_room / correctionFactor;
  // Marjă de siguranță 10%
  const Q_nom_selected = Q_nom_needed * 1.10;

  // Recomandare tip
  let recommendation;
  if (roomType === "baie") {
    recommendation = `Radiator port-prosop nominal ≥ ${Math.round(Q_nom_selected)} W (la 75/65/24°C)`;
  } else if (tFlow <= 35) {
    recommendation = `Pardoseală radiantă — suprafață activă necesară ≈ ${Math.round(Q_room / 70)} m² (la 70 W/m² maxim)`;
  } else if (Q_room > 2000) {
    recommendation = `Ventiloconvector sau 2× radiatoare oțel panou tip 22/33, total nominal ≥ ${Math.round(Q_nom_selected)} W`;
  } else {
    recommendation = `Radiator oțel panou nominal ≥ ${Math.round(Q_nom_selected)} W (la ΔT=50K standard EN 442)`;
  }

  return {
    Q_room,
    tRoom,
    Q_nom_needed: Math.round(Q_nom_needed),
    Q_nom_selected: Math.round(Q_nom_selected),
    correctionFactor: Math.round(correctionFactor * 1000) / 1000,
    regime: { tFlow, tReturn, deltaT_real: Math.round(deltaT_real * 10) / 10 },
    recommendation,
    radType: radType || "otel_panou",
  };
}
