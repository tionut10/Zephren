/**
 * VMC cu Recuperare de Căldură — calcul performanță și economii
 * Referințe:
 * - SR EN 16798-1:2019/NA:2019 / SR EN 16798-3:2017 — Ventilare clădiri
 * - SR EN 13779:2007 — Ventilare clădiri nerezidențiale (SFP)
 * - I5-2022 — Normativ instalații de ventilare și climatizare
 * - SR EN ISO 52016-1:2017/NA:2023 — Calcul energie ventilare
 * - SR EN 308:1997 — Schimbătoare de căldură aer-aer (test η)
 */

// Sprint Audit Prețuri P2.4 (9 mai 2026) — tarife energie ANRE + curs EUR/RON live
// Sprint Audit Prețuri P3.3 (9 mai 2026) — getPrice canonic pentru full-install
import { getEnergyPriceFromPreset } from "../data/energy-prices.js";
import { getEurRonSync, getPrice, REHAB_PRICES } from "../data/rehab-prices.js";

// SFP limite conform EN 13779 Tabel B.5 + I5-2022
export const SFP_CLASSES = {
  SFP1: { max: 500,  label: "SFP1 — Eficiență maximă (≤500 W/(m³/s))" },
  SFP2: { max: 750,  label: "SFP2 — Eficiență ridicată (≤750 W/(m³/s))" },
  SFP3: { max: 1250, label: "SFP3 — Eficiență medie (≤1250 W/(m³/s))" },
  SFP4: { max: 2000, label: "SFP4 — Eficiență standard (≤2000 W/(m³/s))" },
};

export function getSFPClass(sfp_W_m3s) {
  if (sfp_W_m3s <= 500)  return "SFP1";
  if (sfp_W_m3s <= 750)  return "SFP2";
  if (sfp_W_m3s <= 1250) return "SFP3";
  if (sfp_W_m3s <= 2000) return "SFP4";
  return "SFP5+";
}

// Temperatura minimă de îngheț pentru schimbătorul de căldură (fără bypass)
// θ_frost = θ_int × (1 − 1/η_hr) → sub aceasta se activează preîncălzire sau bypass
export function calcFrostProtectionThreshold(theta_int, eta_hr) {
  if (!eta_hr || eta_hr <= 0) return null;
  return Math.round((theta_int * (1 - 1 / eta_hr)) * 10) / 10;
}

/**
 * Calcul complet VMC-HR
 * @param {object} params
 * @param {number} params.Au — suprafață utilă [m²]
 * @param {number} params.V — volum [m³]
 * @param {number} params.n_vent — rata schimb aer ventilare [h⁻¹]
 * @param {number} params.eta_hr — eficiență recuperare termică [0–1]
 * @param {number} params.sfp — Specific Fan Power [kW/(m³/s)] (formă stocată în VENTILATION_TYPES)
 * @param {number} params.theta_int — temperatură interioară [°C]
 * @param {number} params.theta_e_mean — temperatură medie anuală [°C]
 * @param {number} params.HDD — grade-zile încălzire [°C·zile]
 * @param {number} params.eta_gen — eficiență generator căldură [0–1]
 * @param {number} params.fp_heating — factor primar încălzire
 * @param {number} params.t_op_h — ore funcționare anuale [h/an]
 * @param {boolean} params.hasEnthalpy — recuperare entalpică (latentă + sensibilă)
 */
export function calcVMCHR({
  Au = 100,
  V = 250,
  n_vent = 0.5,
  eta_hr = 0,
  sfp = 1.0,           // kW/(m³/s) — conform VENTILATION_TYPES (Fix Sprint 1: era eronat W/(m³/h))
  theta_int = 20,
  theta_e_mean = 10,   // temp medie anuală
  HDD = 2800,          // grade-zile încălzire
  eta_gen = 0.85,
  fp_heating = 1.1,
  t_op_h = 8760,
  hasEnthalpy = false,
}) {
  const rho_air = 1.2;    // kg/m³
  const cp_air  = 0.278;  // Wh/(kg·K) = 1000/3600

  // Debit volumetric [m³/h]
  const q_vent_m3h = n_vent * V;
  // [m³/s]
  const q_vent_m3s = q_vent_m3h / 3600;

  // ── Energie ventilare fără recuperare (referință naturală/extracție simplă) ──
  // Q_vent_ref = ρ·cp·q·(θint - θe_mean)·HDD_h / 1000 [kWh/an]
  // Aproximat: Q = ρ·cp·q·HDD·24 (HDD în °C·zile)
  const Q_vent_ref_kWh = rho_air * cp_air * q_vent_m3h * HDD * 24 / 1000;

  // ── Energie recuperată de schimbătorul HR ──
  const Q_recovered_kWh = eta_hr > 0
    ? Q_vent_ref_kWh * eta_hr
    : 0;

  // ── Energie termică economisită (la generator) ──
  // Trebuie mai puțin combustibil la boiler/sistem de încălzire
  const E_saved_thermal_kWh = Q_recovered_kWh / Math.max(0.5, eta_gen);
  const E_saved_primary_kWh = E_saved_thermal_kWh * fp_heating;

  // ── Energie electrică ventilator ──
  // SFP din VENTILATION_TYPES e în kW/(m³/s), deci:
  // P_fan [W] = SFP [kW/(m³/s)] × q [m³/s] × 1000
  // E_fan [kWh] = P_fan × t_op / 1000
  // Fix Sprint 1 (17 apr 2026): corectat din supoziția eronată W/(m³/h)
  const P_fan_W = sfp * q_vent_m3s * 1000;
  const E_fan_kWh = P_fan_W * t_op_h / 1000;

  // Energie fan ref naturală (fără ventilator, sau extracție simplă SFP ≈ 0.36 kW/(m³/s))
  const P_fan_ref_W = 0.36 * q_vent_m3s * 1000; // extracție simplă ~360 W/(m³/s)
  const E_fan_ref_kWh = P_fan_ref_W * t_op_h / 1000;
  const E_fan_extra_kWh = Math.max(0, E_fan_kWh - E_fan_ref_kWh);

  // ── Economie netă energie primară ──
  const E_net_primary_kWh = E_saved_primary_kWh - E_fan_extra_kWh * 2.5; // fp electricitate ≈ 2.5

  // ── Economie per m² ──
  const E_saved_per_m2 = Au > 0 ? Math.round(E_saved_thermal_kWh / Au * 10) / 10 : 0;
  const E_net_per_m2 = Au > 0 ? Math.round(E_net_primary_kWh / Au * 10) / 10 : 0;

  // ── SFP în W/(m³/s) pentru clasificare (conversie din kW/(m³/s)) ──
  const sfp_W_m3s = q_vent_m3s > 0 ? P_fan_W / q_vent_m3s : sfp * 1000;
  const sfpClass = getSFPClass(sfp_W_m3s);

  // ── Temperatura minimă fără îngheț ──
  const t_frost = eta_hr > 0
    ? calcFrostProtectionThreshold(theta_int, eta_hr)
    : null;
  const frostRisk = t_frost !== null && theta_e_mean < t_frost + 5;

  // ── Eficiență entalpică (recuperare umezeală) ──
  // Aproximare: recuperare latentă ≈ 40% din total entalpy pentru η_enth ≈ η_sens
  const Q_enthalpy_extra = hasEnthalpy ? Q_recovered_kWh * 0.35 : 0;

  // ── Confort — reducere curent de aer rece (draft) ──
  // Aer insuflt la ~(θint - η_hr*(θint-θe)) °C
  const theta_supply = theta_int - eta_hr * (theta_int - theta_e_mean);
  const draftRisk = theta_supply < 16; // sub 16°C = disconfort

  // ── Reducere CO₂ ──
  const co2_saved_kg = E_saved_primary_kWh * 0.24; // factor emisie mediu rețea termică/gaz

  // ── Costuri și payback estimat ──
  // Sprint Audit Prețuri P3.3 (9 mai 2026) — migrat la rehab-prices canonic full-install
  // (cooling.vmc_hr_full_install_per_m2 + vmc_hr_full_install_fixed). Anterior 150 EUR/m² + 800 EUR
  // hardcoded. Include: centrală + tubulatură + grile + izolație canal + comandă + manoperă.
  const fullInstallPerM2 = getPrice("cooling", "vmc_hr_full_install_per_m2", "mid")?.price || 150;
  const fullInstallFixed = getPrice("cooling", "vmc_hr_full_install_fixed", "mid")?.price || 800;
  const cost_hr_eur = fullInstallPerM2 * Au + fullInstallFixed;
  // Sprint Audit Prețuri P2.4 — tarife din ANRE casnic_2025 (RON) → conv. EUR via curs live
  const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
  const energy_price_eur_kwh = getEnergyPriceFromPreset("gaz", "casnic_2025") / eurRon;
  const elec_price_eur_kwh = getEnergyPriceFromPreset("electricitate", "casnic_2025") / eurRon;
  const saving_eur_year = E_saved_thermal_kWh * energy_price_eur_kwh;
  const extra_elec_cost = E_fan_extra_kWh * elec_price_eur_kwh;
  const net_saving_eur = Math.max(0, saving_eur_year - extra_elec_cost);
  const payback_years = net_saving_eur > 0 ? Math.round(cost_hr_eur / net_saving_eur * 10) / 10 : null;

  return {
    // Debite
    q_vent_m3h:  Math.round(q_vent_m3h),
    q_vent_m3s:  Math.round(q_vent_m3s * 1000) / 1000,
    // Energii
    Q_vent_ref_kWh:    Math.round(Q_vent_ref_kWh),
    Q_recovered_kWh:   Math.round(Q_recovered_kWh),
    E_saved_thermal_kWh: Math.round(E_saved_thermal_kWh),
    E_saved_primary_kWh: Math.round(E_saved_primary_kWh),
    E_fan_kWh:         Math.round(E_fan_kWh),
    E_fan_extra_kWh:   Math.round(E_fan_extra_kWh),
    E_net_primary_kWh: Math.round(E_net_primary_kWh),
    Q_enthalpy_extra:  Math.round(Q_enthalpy_extra),
    E_saved_per_m2,
    E_net_per_m2,
    // SFP
    P_fan_W:     Math.round(P_fan_W),
    sfp_W_m3s:   Math.round(sfp_W_m3s),
    sfpClass,
    // Confort / siguranță
    t_frost,
    frostRisk,
    theta_supply:  Math.round(theta_supply * 10) / 10,
    draftRisk,
    // CO₂
    co2_saved_kg: Math.round(co2_saved_kg),
    // Economie
    cost_hr_eur:    Math.round(cost_hr_eur),
    saving_eur_year: Math.round(saving_eur_year),
    net_saving_eur:  Math.round(net_saving_eur),
    payback_years,
  };
}

/**
 * Recomandare tip VMC bazată pe categoria clădirii + zonă climatică
 */
export function recommendVMCType(category, zone, isNew) {
  const recs = [];
  if (!isNew) {
    recs.push({ text: "VMC dublă flux cu HR ≥75% — compatibil reabilitare", priority: "high" });
  }
  if (["RI"].includes(category)) {
    recs.push({ text: "VMC centralizată cu schimbător contra-curent η ≥85% recomandată pentru case noi", priority: "high" });
    recs.push({ text: "VMC descentralizată per cameră — variantă pentru renovare fără conducte", priority: "medium" });
  }
  if (["RC","RA"].includes(category)) {
    recs.push({ text: "VMC per apartament cu recuperare η ≥75% — varianta optimă pentru bloc", priority: "high" });
    recs.push({ text: "VMC centralizată pe scară (shaft vertical) — costuri mai mici per apart.", priority: "medium" });
  }
  if (["AL","BI","OF","HC","SA","ED"].includes(category)) {
    recs.push({ text: "UTA centralizată cu recuperare entalpică η ≥75% pentru spații nerezidențiale", priority: "high" });
    recs.push({ text: "SFP ≤ 1250 W/(m³/s) — clasa SFP3 conform EN 13779", priority: "medium" });
  }
  if (zone === "I" || zone === "II") {
    recs.push({ text: "Protecție anti-îngheț obligatorie (zonă rece) — bypass sau preîncălzire electrică", priority: "high" });
  }
  if (isNew) {
    recs.push({ text: "Norme Pasivhaus recomandă η ≥75% și SFP ≤0,45 Wh/m³ pentru certificare", priority: "info" });
  }
  return recs;
}
