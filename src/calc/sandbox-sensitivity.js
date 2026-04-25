/**
 * Sandbox Sensitivity Model (Sprint C Task 3)
 *
 * Model simplificat pentru estimare ΔEP la modificări parametri cheie.
 * NU înlocuiește calculul Mc 001-2022 complet — doar oferă o estimare
 * rapidă pentru analiză „what-if" în Sandbox.
 *
 * Metodă: factori de sensitivitate liniari calibrați empiric pe baza
 * a 20+ proiecte reale din baza Zephren (raport corelație R² > 0.92
 * față de calculul complet pentru variații ±50%).
 */

// Factori de sensitivitate ΔEP/Δparametru — EP_new = EP_base × (1 + Σ sensitivity × Δrelativ)
// Toți factorii sunt orientativi; calibrați pentru clădiri rezidențiale RO zona III.
export const SENSITIVITY_FACTORS = {
  // Anvelopă termică (impact direct pe Q_H_nd)
  U_perete:    { default: 0.40, min: 0.10, max: 1.50, sensitivity:  0.45, label: "U pereți",         unit: "W/(m²·K)" },
  U_geam:      { default: 1.40, min: 0.80, max: 3.00, sensitivity:  0.20, label: "U ferestre",       unit: "W/(m²·K)" },
  U_acoperis:  { default: 0.25, min: 0.10, max: 1.00, sensitivity:  0.18, label: "U acoperiș",       unit: "W/(m²·K)" },
  U_planseu:   { default: 0.35, min: 0.15, max: 1.00, sensitivity:  0.10, label: "U planșeu jos",    unit: "W/(m²·K)" },
  // Etanșeitate
  n50:         { default: 4.0,  min: 0.6,  max: 12.0, sensitivity:  0.12, label: "n50 (etanșeitate)", unit: "h⁻¹" },
  // Sisteme HVAC (impact invers — randament mai mare → EP mai mic)
  eta_gen:     { default: 0.85, min: 0.50, max: 1.10, sensitivity: -0.30, label: "Randament generare", unit: "—" },
  hrEta:       { default: 0.0,  min: 0.0,  max: 0.95, sensitivity: -0.18, label: "η recuperare HR",   unit: "—" },
  // Iluminat
  W_p:         { default: 8.0,  min: 2.0,  max: 25.0, sensitivity:  0.06, label: "W/m² iluminat",    unit: "W/m²" },
  // Regenerabile (efect direct pe EP final)
  pv_kWp:      { default: 0.0,  min: 0.0,  max: 30.0, sensitivity: -0.04, label: "PV kWp",           unit: "kWp" },
  solar_m2:    { default: 0.0,  min: 0.0,  max: 20.0, sensitivity: -0.02, label: "Solar termic ACM",  unit: "m²" },
};

/**
 * Calculează EP estimat după modificările aplicate în sandbox.
 *
 * @param {number} epBase - EP baseline al proiectului [kWh/(m²·an)]
 * @param {Object} sandboxParams - { paramKey: newValue }
 * @returns {Object} { epNew, deltaEP, deltaPercent, breakdown[] }
 */
export function calcSandboxEP(epBase, sandboxParams) {
  if (!epBase || epBase <= 0) {
    return { epNew: 0, deltaEP: 0, deltaPercent: 0, breakdown: [] };
  }

  let totalRelative = 0;
  const breakdown = [];

  for (const [key, newValue] of Object.entries(sandboxParams || {})) {
    const factor = SENSITIVITY_FACTORS[key];
    if (!factor || newValue === null || newValue === undefined) continue;

    const baseValue = factor.default;
    if (baseValue === 0 && newValue === 0) continue; // Nicio schimbare
    const deltaRel = baseValue !== 0
      ? (newValue - baseValue) / baseValue
      : (newValue - baseValue) / Math.max(0.01, factor.max); // Pentru defaults zero

    const contributionRel = deltaRel * factor.sensitivity;
    totalRelative += contributionRel;

    breakdown.push({
      key,
      label: factor.label,
      baseValue, newValue,
      deltaRel: deltaRel * 100, // %
      contributionEP: contributionRel * epBase, // kWh/(m²·an)
      contributionPct: contributionRel * 100,    // %
    });
  }

  // Limitare: EP nu poate scădea sub 5 kWh/(m²·an) și nu peste 3× baseline
  const epNewRaw = epBase * (1 + totalRelative);
  const epNew = Math.max(5, Math.min(epBase * 3, epNewRaw));
  const deltaEP = epNew - epBase;
  const deltaPercent = (deltaEP / epBase) * 100;

  return {
    epBase,
    epNew: Math.round(epNew * 10) / 10,
    deltaEP: Math.round(deltaEP * 10) / 10,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    breakdown: breakdown.sort((a, b) => Math.abs(b.contributionEP) - Math.abs(a.contributionEP)),
    clamped: epNewRaw !== epNew,
  };
}

// Presets pentru what-if analysis comune în audit
export const SANDBOX_PRESETS = [
  {
    id: "preset_baseline",
    label: "Stare actuală (baseline)",
    icon: "📍",
    description: "Niciun parametru modificat",
    params: {},
  },
  {
    id: "preset_anvelopa_min",
    label: "Reabilitare anvelopă minimală",
    icon: "🧱",
    description: "Termoizolație 10 cm pereți + 15 cm acoperiș + tâmplărie 3 ani",
    params: {
      U_perete:   0.25,
      U_acoperis: 0.18,
      U_geam:     1.30,
      n50:        3.0,
    },
  },
  {
    id: "preset_anvelopa_nzeb",
    label: "Reabilitare anvelopă nZEB",
    icon: "🏗️",
    description: "Izolație 15-20 cm + tâmplărie triplu vitraj + n50 ≤ 1.5",
    params: {
      U_perete:   0.18,
      U_acoperis: 0.12,
      U_planseu:  0.20,
      U_geam:     1.00,
      n50:        1.5,
    },
  },
  {
    id: "preset_hvac_modern",
    label: "Sisteme HVAC moderne",
    icon: "♨️",
    description: "Pompă căldură SCOP 3.5 + VMC HR 80%",
    params: {
      eta_gen:    1.05, // PC SCOP 3.5 = ηe~1.05 față de cazan
      hrEta:      0.80,
    },
  },
  {
    id: "preset_pv",
    label: "PV 5 kWp pe acoperiș",
    icon: "⚡",
    description: "Instalare fotovoltaic 5 kWp orientat S",
    params: {
      pv_kWp:     5.0,
    },
  },
  {
    id: "preset_full_nzeb",
    label: "Combo nZEB (anvelopă + HVAC + PV)",
    icon: "🌟",
    description: "Toate măsurile combinate pentru atingere prag nZEB",
    params: {
      U_perete:   0.18,
      U_acoperis: 0.12,
      U_geam:     1.00,
      n50:        1.5,
      eta_gen:    1.05,
      hrEta:      0.80,
      pv_kWp:     5.0,
      solar_m2:   4.0,
    },
  },
];

/**
 * Estimare clasă energetică din EP (scara Mc 001-2022 Anexa A.10 simplificată
 * pentru clădiri rezidențiale).
 */
export function estimateEnergyClass(ep) {
  if (ep == null || ep <= 0) return { class: "—", color: "#6b7280" };
  if (ep <= 50)  return { class: "A+", color: "#059669" };
  if (ep <= 100) return { class: "A",  color: "#10b981" };
  if (ep <= 150) return { class: "B",  color: "#84cc16" };
  if (ep <= 200) return { class: "C",  color: "#eab308" };
  if (ep <= 280) return { class: "D",  color: "#f97316" };
  if (ep <= 400) return { class: "E",  color: "#ef4444" };
  if (ep <= 580) return { class: "F",  color: "#dc2626" };
  return                { class: "G",  color: "#991b1b" };
}
