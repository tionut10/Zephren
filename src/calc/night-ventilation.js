/**
 * Ventilație Nocturnă (Free-Cooling) — calcul economii răcire pasivă
 * Referințe:
 * - SR EN 16798-1:2019/NA:2019 — Parametri mediu interior (condiții confort)
 * - SR EN 15251:2007 — Condiții mediu interior (clasificare)
 * - SR EN ISO 13790:2009 — Performanță energetică, bilanț termic
 * - SR EN ISO 52016-1:2017/NA:2023 — Calcul necesarului de energie răcire
 *
 * Principiu: aerul exterior nocturn (mai rece) ventilează clădirea
 * și elimină căldura stocată în masa termică, reducând necesarul
 * de răcire mecanică.
 *
 * @roadmap Sprint 2 Ventilație (AUDIT_10 §8.2 #9) — integrare în motor răcire
 * @status ORPHAN — momentan apelat doar din teste; integrare planificată post-Sprint 1
 */

// ── Constante fizice și de confort ──────────────────────────────
const RHO_AIR = 1.2;       // kg/m³ — densitate aer la 20°C
const CP_AIR  = 1005;      // J/(kg·K) — căldura specifică aer
const CP_AIR_Wh = CP_AIR / 3600; // Wh/(kg·K) ≈ 0.279

// Confort conform EN 16798-1 Tabel NA.2
const THETA_COMFORT = 26;  // °C — limita superioară confort vara

/**
 * Cerințe minime ventilație nocturnă per categorie EN 16798-1 Tab.B.6
 * n_min: rata minimă schimb aer nocturn [h⁻¹]
 * delta_T_min: diferența minimă θ_int - θ_ext pentru fezabilitate [K]
 */
export const NIGHT_VENT_REQUIREMENTS = {
  I:   { n_min: 2.0, delta_T_min: 3, label: "Cat.I — Confort ridicat" },
  II:  { n_min: 1.5, delta_T_min: 3, label: "Cat.II — Confort normal" },
  III: { n_min: 1.0, delta_T_min: 2, label: "Cat.III — Confort moderat" },
  IV:  { n_min: 0.8, delta_T_min: 2, label: "Cat.IV — Confort minim" },
};

// ── Ore de ventilație nocturnă tipice ───────────────────────────
// Perioada 22:00–06:00 = 8 ore/noapte
const NIGHT_HOURS = 8;

/**
 * Calcul ventilație nocturnă (free-cooling)
 *
 * @param {object} params
 * @param {number} params.Au — suprafață utilă [m²]
 * @param {number} params.V — volum interior [m³]
 * @param {number} params.n_night — rata schimb aer nocturn [h⁻¹] (default 2.0)
 * @param {number} params.theta_int_day — temperatura interioară ziua [°C] (default 26)
 * @param {number} params.theta_ext_night_avg — temperatura medie exterioară nocturnă
 *        în sezonul de răcire [°C] (default 18)
 * @param {number} params.HDD_cool — grade-zile răcire [°C·zile] (default 150)
 * @param {number} params.days_cooling_season — zile sezon răcire (default 120)
 * @param {string} params.comfortCategory — categoria de confort "I"-"IV" (default "II")
 * @param {number} params.thermalMass — capacitate termică masă [kJ/(m²·K)]
 *        (default 165 — construcție medie conform EN ISO 13786)
 * @returns {object} rezultat calcul free-cooling
 */
export function calcNightVentilation({
  Au = 100,
  V = 250,
  n_night = 2.0,
  theta_int_day = THETA_COMFORT,
  theta_ext_night_avg = 18,
  HDD_cool = 150,
  days_cooling_season = 120,
  comfortCategory = "II",
  thermalMass = 165,
} = {}) {
  // ── 1. Verificare fezabilitate ─────────────────────────────
  // EN 16798-1: ventilația nocturnă e fezabilă dacă
  // θ_ext_night < θ_comfort - deltaT_min
  const req = NIGHT_VENT_REQUIREMENTS[comfortCategory] || NIGHT_VENT_REQUIREMENTS.II;
  const delta_T = theta_int_day - theta_ext_night_avg;
  const feasible = delta_T >= req.delta_T_min;

  // ── 2. Debit masic de aer nocturn ──────────────────────────
  // q_m³/h = n_night × V
  const q_vol_m3h = n_night * V;
  // m_dot = ρ × q [kg/h]
  const m_dot_kgh = RHO_AIR * q_vol_m3h;

  // ── 3. Putere de răcire nocturnă ──────────────────────────
  // Q_dot = m_dot × cp × ΔT [W]
  // ΔT = θ_int_day - θ_ext_night (media pe noapte)
  const Q_dot_W = m_dot_kgh * CP_AIR_Wh * Math.max(0, delta_T);

  // ── 4. Energie de răcire gratuită pe sezon ─────────────────
  // Q_free = Q_dot × ore/noapte × zile sezon / 1000 [kWh]
  const Q_free_cooling_kWh = Q_dot_W * NIGHT_HOURS * days_cooling_season / 1000;

  // ── 5. Necesarul de răcire de referință (fără free-cooling) ─
  // Estimare simplificată: Q_cool_ref = HDD_cool × Au × 0.1 [kWh]
  // (0.1 kWh/(m²·°C·zi) — coeficient orientativ clădiri rezidențiale)
  const Q_cool_ref_kWh = HDD_cool * Au * 0.10;

  // ── 6. Eficiența masei termice ─────────────────────────────
  // Factor de utilizare masă termică: cu cât masa e mai mare,
  // cu atât se stochează mai multă căldură nocturn
  // EN ISO 13790 Secț.12.2 — factor utilizare ≈ 1 - exp(-τ/τ_ref)
  // τ = C_m / H_vent_night [ore]; τ_ref = 15 ore
  const C_m = thermalMass * Au; // kJ/K
  const H_vent_night = m_dot_kgh * CP_AIR / 3600; // W/K
  const tau_h = H_vent_night > 0 ? (C_m * 1000) / (H_vent_night * 3600) : 0; // ore
  const eta_mass = 1 - Math.exp(-tau_h / 15);

  // Răcire efectivă corectată cu masa termică
  const Q_effective_kWh = Q_free_cooling_kWh * Math.min(1, eta_mass);

  // ── 7. Reducere procentuală ────────────────────────────────
  const reduction_pct = Q_cool_ref_kWh > 0
    ? Math.min(100, Math.round(Q_effective_kWh / Q_cool_ref_kWh * 100))
    : 0;

  // ── 8. Rata de schimb aer necesară minimă ──────────────────
  // Invers: pentru a acoperi X% din necesarul de răcire,
  // n_required = Q_cool_ref / (ρ×cp×V×ΔT×ore×zile) × 1000
  const n_night_required = Q_cool_ref_kWh > 0 && delta_T > 0
    ? Q_cool_ref_kWh * 1000 / (RHO_AIR * CP_AIR_Wh * V * delta_T * NIGHT_HOURS * days_cooling_season)
    : null;

  // ── 9. Recomandări ─────────────────────────────────────────
  const recommendations = [];
  if (!feasible) {
    recommendations.push(
      `Diferență de temperatură insuficientă (${delta_T.toFixed(1)}K < ${req.delta_T_min}K minim). ` +
      `Ventilația nocturnă nu este fezabilă în aceste condiții.`
    );
  }
  if (feasible && thermalMass < 100) {
    recommendations.push(
      "Masa termică redusă limitează eficiența. Construcția ușoară beneficiază mai puțin de free-cooling."
    );
  }
  if (feasible && reduction_pct >= 30) {
    recommendations.push(
      `Reducere semnificativă (${reduction_pct}%) — ventilația nocturnă este o strategie eficientă.`
    );
  }
  if (feasible && n_night < req.n_min) {
    recommendations.push(
      `Rata de ventilare (${n_night} h⁻¹) sub minimul cerut (${req.n_min} h⁻¹) pentru ${req.label}.`
    );
  }
  if (feasible && reduction_pct < 15) {
    recommendations.push(
      "Efect limitat (<15%). Combinați cu protecții solare exterioare pentru rezultate mai bune."
    );
  }

  return {
    // Debite și temperaturi
    q_vol_m3h:           Math.round(q_vol_m3h),
    delta_T:             Math.round(delta_T * 10) / 10,
    Q_dot_W:             Math.round(Q_dot_W),
    // Energii
    Q_free_cooling_kWh:  Math.round(Q_effective_kWh),
    Q_cool_ref_kWh:      Math.round(Q_cool_ref_kWh),
    reduction_pct,
    // Masă termică
    eta_mass:            Math.round(eta_mass * 100) / 100,
    tau_h:               Math.round(tau_h * 10) / 10,
    // Fezabilitate
    n_night_required:    n_night_required !== null ? Math.round(n_night_required * 100) / 100 : null,
    feasible,
    comfortCategory,
    // Verdict
    recommendations,
    reference: "SR EN 16798-1:2019 + SR EN ISO 13790:2009",
  };
}
