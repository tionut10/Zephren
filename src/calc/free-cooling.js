// ═══════════════════════════════════════════════════════════════
// FREE COOLING NOCTURN — Sprint 9b (17 apr 2026)
// Referință normativă: SR EN 16798-9:2017 + SR EN ISO 13790:2009 §12.2
// Formula generală (EN 16798-9 §6.2):
//   Q_free = Σ_nopti [max(0, (θ_int_day − θ_ext_noapte) × V_free × ρ × c_p × t)]
//
// Acest modul e un wrapper peste calcNightVentilation (night-ventilation.js)
// care adaugă:
//   - Defaults per categorie clădire (birouri/școli ON, rezidențial OFF)
//   - Capping 40% din Q_NC (limită realistă EN 16798-9 pentru climate temperate)
//   - API simplu "economia evitată [kWh/an]" pentru integrare în useInstallationSummary
// ═══════════════════════════════════════════════════════════════

import { calcNightVentilation } from "./night-ventilation.js";

// Constante fizice — SI uniti (EN 16798-9 §5.4)
const RHO_AIR = 1.2;       // kg/m³
const CP_AIR  = 1005;      // J/(kg·K)

// Defaults per categorie clădire (mapează CPE RO categoria → recomandare free cooling)
// ON: clădirile cu program diurn și masă termică utilă → câștig mare
// OFF: clădirile ocupate nocturn → risc confort (zgomot, securitate)
export const FREE_COOLING_DEFAULTS_BY_CATEGORY = {
  // Rezidențial — ocupare nocturnă, risc confort → OFF default
  RI: { enabled: false, reason: "Ocupare nocturnă — risc confort termic" },
  RC: { enabled: false, reason: "Ocupare nocturnă — risc confort termic" },
  RA: { enabled: false, reason: "Ocupare nocturnă — risc confort termic" },
  // Birouri / administrativ — ocupare 8-18 → ON default
  BI: { enabled: true,  reason: "Birouri: ocupare diurnă, masă termică exploatabilă" },
  AD: { enabled: true,  reason: "Administrativ: ocupare diurnă" },
  // Școli — ocupare 8-16 → ON default (economie 30-40%)
  SC: { enabled: true,  reason: "Școală: ocupare 8-16, potențial mare" },
  ED: { enabled: true,  reason: "Educație: ocupare diurnă" },
  // Comerț / retail — ocupare 10-22, mai scurt → ON default (economie moderată)
  CO: { enabled: true,  reason: "Comerț: ocupare 10-22" },
  // Spitale — ocupare 24/24 → OFF (nu se poate opri răcirea)
  SA: { enabled: false, reason: "Spital: ocupare 24/24, răcire continuă" },
  HC: { enabled: false, reason: "Sănătate: ocupare 24/24" },
  // Sport — ocupare variabilă → OFF default (siguranță)
  SP: { enabled: false, reason: "Sport: risc confort pe parcurs eveniment" },
  // Alimentație — ocupare seară → OFF
  AL: { enabled: false, reason: "Alimentație publică: ocupare seară" },
};

/**
 * Returnează recomandarea default pentru free cooling pe categoria unei clădiri.
 * @param {string} category - cod categorie CPE (RI, BI, SC, etc.)
 * @returns {{ enabled: boolean, reason: string }}
 */
export function getFreeCoolingDefault(category) {
  return FREE_COOLING_DEFAULTS_BY_CATEGORY[category]
    || { enabled: true, reason: "Default: activ pentru categorii necunoscute" };
}

/**
 * Calculează beneficiul free cooling nocturn (reducere Q_NC).
 *
 * Formula EN 16798-9 simplificată în regim quasi-static lunar:
 *   Q_free = m_dot × c_p × ΔT × t_noapte × zile_sezon / 1000 [kWh]
 *   cu m_dot = ρ × n_night × V / 3600 [kg/s]
 * Cap realist: min(Q_free, 40% × Q_NC_raw) — conform EN 16798-9 §7.4.2.
 *
 * @param {object} params
 * @param {number} params.Q_NC_raw - sarcina frigorifică înainte de free cooling [kWh/an]
 * @param {number} params.Au - arie utilă răcită [m²]
 * @param {number} params.V - volum interior [m³]
 * @param {number} params.n_night - rată schimb aer nocturn [h⁻¹] (default 2.0)
 * @param {number} params.theta_int_day - setpoint răcire [°C] (default 26)
 * @param {number} params.theta_ext_night_avg - temperatură exterioară medie noapte iulie/august [°C]
 * @param {number} params.HDD_cool - grade-zile răcire baza 18°C [°C·zile]
 * @param {number} params.days_cooling_season - zile sezon răcire (default 120)
 * @param {string} params.comfortCategory - "I"|"II"|"III"|"IV" (default "II")
 * @param {number} params.thermalMass - capacitate termică [kJ/(m²·K)] (default 165)
 * @param {number} params.cap - limită procentuală maximă din Q_NC_raw (default 0.40)
 * @returns {{ Q_avoided: number, feasible: boolean, reduction_pct: number, details: object }}
 */
export function calcFreeCoolingBenefit({
  Q_NC_raw,
  Au               = 100,
  V                = 250,
  n_night          = 2.0,
  theta_int_day    = 26,
  theta_ext_night_avg = 18,
  HDD_cool         = 150,
  days_cooling_season = 120,
  comfortCategory  = "II",
  thermalMass      = 165,
  cap              = 0.40,
} = {}) {
  // Delegare calcul fizic către night-ventilation.js (validat S3b)
  const nv = calcNightVentilation({
    Au, V, n_night,
    theta_int_day, theta_ext_night_avg,
    HDD_cool, days_cooling_season,
    comfortCategory, thermalMass,
  });

  // Cap la fracțiunea din Q_NC_raw (EN 16798-9 limită practică climate temperate)
  const Q_NC_safe = Math.max(0, Number(Q_NC_raw) || 0);
  const max_allowed = Q_NC_safe * cap;

  const Q_avoided = nv.feasible
    ? Math.min(max_allowed, nv.Q_free_cooling_kWh)
    : 0;

  const reduction_pct = Q_NC_safe > 0
    ? Math.round((Q_avoided / Q_NC_safe) * 1000) / 10  // 1 zecimală
    : 0;

  return {
    Q_avoided: Math.round(Q_avoided),
    feasible: nv.feasible,
    reduction_pct,
    details: {
      Q_NC_before:         Math.round(Q_NC_safe),
      Q_NC_after:          Math.round(Math.max(0, Q_NC_safe - Q_avoided)),
      delta_T:             nv.delta_T,
      Q_free_raw:          nv.Q_free_cooling_kWh,
      cap_applied:         Q_avoided === max_allowed && nv.Q_free_cooling_kWh > max_allowed,
      eta_mass:            nv.eta_mass,
      tau_h:               nv.tau_h,
      comfortCategory,
      n_night,
    },
    reference: "SR EN 16798-9:2017 §6.2 + EN ISO 13790:2009 §12.2",
    RHO_AIR,
    CP_AIR,
  };
}

/**
 * Shortcut: calcul rapid pentru UI. Returnează doar economia totală [kWh/an].
 */
export function quickFreeCoolingEstimate(params) {
  const r = calcFreeCoolingBenefit(params);
  return r.Q_avoided;
}
