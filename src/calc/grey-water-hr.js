/**
 * Recuperare Căldură Apă Menajeră Uzată (Grey Water Heat Recovery)
 * Referințe:
 * - SR EN 15316-3:2017 — Distribuție apă caldă menajeră
 * - prEN 12831-3 — Sarcină termică ACM
 * - SR EN 15316-5:2017 — Sisteme stocare ACM
 * - EcoDesign Regulament (EU) 2014/812 — Boilere și acumulatoare
 *
 * Principiu: apa uzată de la dușuri/chiuvete (25-35°C) preîncălzește
 * apa rece de alimentare printr-un schimbător de căldură, reducând
 * necesarul termic pentru preparare ACM.
 */

// ── Constante fizice ────────────────────────────────────────────
const RHO_WATER = 1.0;     // kg/L
const CP_WATER  = 4186;    // J/(kg·K)
const CP_WATER_kWh = CP_WATER / 3_600_000; // kWh/(kg·K) ≈ 0.001163

// ── Consum apă caldă per categorie [L/zi·persoană] ─────────────
// Conform EN 15316-3 Tab.B.1 + Mc 001-2022
const CONSUMPTION_L_DAY = {
  RI: 60,   // casă individuală
  RC: 55,   // bloc rezidențial
  RA: 55,   // apartament
  BI: 8,    // birouri
  ED: 10,   // educație
  SA: 90,   // spital (L/pat)
  HC: 100,  // hotel (L/cameră)
  CO: 5,    // comerț
  SP: 35,   // sport
  AL: 35,   // alte
};

/**
 * Eficiențe tipice schimbătoare de căldură apă uzată
 * Conform specificații producători + EN 15316-3 Anexa C
 */
export const GWHR_EFFICIENCY_BY_TYPE = {
  drain_pipe:      { eta: 0.30, label: "Schimbător pe conducta de scurgere (30%)", cost_eur: 400 },
  shower_tray:     { eta: 0.45, label: "Cadă de duș cu recuperare integrată (45%)", cost_eur: 800 },
  plate_passive:   { eta: 0.55, label: "Schimbător cu plăci pasiv (55%)", cost_eur: 1200 },
  plate_active:    { eta: 0.65, label: "Schimbător cu plăci activ + pompă (65%)", cost_eur: 2000 },
  heat_pump_gwhr:  { eta: 0.80, label: "Pompă de căldură pe apă uzată (80%)", cost_eur: 4500 },
};

// ── Fracție apă gri recuperabilă ────────────────────────────────
// Nu toată apa caldă devine apă gri recuperabilă
// (se exclude WC, mașina de spălat cu detergent, etc.)
const GREY_WATER_FRACTION = 0.65; // 65% din consum ACM → apă gri utilizabilă

/**
 * Calcul recuperare căldură apă menajeră uzată
 *
 * @param {object} params
 * @param {number} params.nPersons — număr persoane/paturi/camere
 * @param {string} params.category — categoria clădirii ("RI","RC","BI", etc.)
 * @param {number} params.eta_hr — eficiență recuperare [0-1] (default 0.45)
 * @param {number} params.tHot — temperatura apei calde de livrare [°C] (default 55)
 * @param {number} params.tCold — temperatura apei reci de alimentare [°C] (default 10)
 * @param {number} params.tDrain — temperatura apei uzate la scurgere [°C] (default 25)
 * @param {string} params.hrType — tip schimbător (cheie din GWHR_EFFICIENCY_BY_TYPE)
 * @param {number} params.energyPriceEurKwh — preț energie [EUR/kWh] (default 0.12)
 * @param {number} params.occupancyDays — zile de ocupare pe an (default 350)
 * @returns {object} rezultat calcul recuperare căldură apă gri
 */
export function calcGreyWaterHR({
  nPersons = 4,
  category = "RI",
  eta_hr,
  tHot = 55,
  tCold = 10,
  tDrain = 25,
  hrType = "shower_tray",
  energyPriceEurKwh = 0.12,
  occupancyDays = 350,
} = {}) {
  if (!nPersons || nPersons <= 0) return null;

  // ── 1. Consum zilnic apă caldă ─────────────────────────────
  const q_specific = CONSUMPTION_L_DAY[category] || CONSUMPTION_L_DAY.AL;
  const q_daily_L = nPersons * q_specific; // L/zi total

  // ── 2. Necesar termic ACM anual ────────────────────────────
  // Q_demand = m × cp × (tHot - tCold) [kWh]
  const Q_demand_daily_kWh = q_daily_L * RHO_WATER * CP_WATER_kWh * (tHot - tCold);
  const Q_demand_kWh_year = Q_demand_daily_kWh * occupancyDays;

  // ── 3. Apă gri disponibilă ────────────────────────────────
  // Doar o fracție din apa caldă devine apă gri recuperabilă
  const q_grey_daily_L = q_daily_L * GREY_WATER_FRACTION;

  // ── 4. Eficiență recuperare ────────────────────────────────
  // Selectare eficiență din catalog sau valoare manuală
  const hrSpec = GWHR_EFFICIENCY_BY_TYPE[hrType] || GWHR_EFFICIENCY_BY_TYPE.shower_tray;
  const eta = eta_hr ?? hrSpec.eta;

  // ── 5. Căldură recuperabilă ────────────────────────────────
  // Q_recoverable = η × m_grey × cp × (tDrain - tCold) [kWh]
  // EN 15316-3 Secț.7.4 — energia recuperabilă din apă uzată
  const deltaT_recovery = Math.max(0, tDrain - tCold);
  const Q_recovered_daily_kWh = eta * q_grey_daily_L * RHO_WATER * CP_WATER_kWh * deltaT_recovery;
  const Q_recovered_kWh_year = Q_recovered_daily_kWh * occupancyDays;

  // ── 6. Economie procentuală ────────────────────────────────
  const savings_pct = Q_demand_kWh_year > 0
    ? Math.round(Q_recovered_kWh_year / Q_demand_kWh_year * 100)
    : 0;

  // ── 7. Temperatura apei preîncălzite ──────────────────────
  // tPreheated = tCold + η × (tDrain - tCold)
  const tPreheated = tCold + eta * deltaT_recovery;

  // ── 8. Analiză financiară ──────────────────────────────────
  const savings_eur_year = Q_recovered_kWh_year * energyPriceEurKwh;
  const cost_estimate_eur = hrSpec.cost_eur * Math.max(1, Math.ceil(nPersons / 10));
  const payback_years = savings_eur_year > 0
    ? Math.round(cost_estimate_eur / savings_eur_year * 10) / 10
    : null;

  // ── 9. CO₂ economisit ─────────────────────────────────────
  // Factor emisie gaz natural ≈ 0.20 kgCO₂/kWh (PCI)
  const co2_saved_kg = Math.round(Q_recovered_kWh_year * 0.20);

  // ── 10. Recomandări ────────────────────────────────────────
  const recommendations = [];
  if (savings_pct >= 15) {
    recommendations.push(
      `Economie semnificativă (${savings_pct}%) — investiție recomandată.`
    );
  }
  if (payback_years !== null && payback_years > 15) {
    recommendations.push(
      `Payback lung (${payback_years} ani) — evaluați opțiuni mai ieftine (drain pipe).`
    );
  }
  if (tDrain < 20) {
    recommendations.push(
      "Temperatura apei uzate scăzută — eficiența recuperării este redusă."
    );
  }
  if (category === "SA" || category === "SP") {
    recommendations.push(
      "Consum mare de apă caldă — recuperarea pe apă gri este deosebit de eficientă."
    );
  }
  if (eta < 0.40) {
    recommendations.push(
      "Eficiență recuperare sub 40% — considerați upgrade la schimbător cu plăci."
    );
  }

  return {
    // Consum
    q_specific,
    q_daily_L:            Math.round(q_daily_L),
    q_grey_daily_L:       Math.round(q_grey_daily_L),
    // Energii
    Q_demand_kWh_year:    Math.round(Q_demand_kWh_year),
    Q_recovered_kWh_year: Math.round(Q_recovered_kWh_year),
    savings_pct,
    // Temperaturi
    tHot, tCold, tDrain,
    tPreheated:           Math.round(tPreheated * 10) / 10,
    // Eficiență
    eta_hr:               Math.round(eta * 100) / 100,
    hrType,
    // Financiar
    savings_eur_year:     Math.round(savings_eur_year),
    cost_estimate_eur:    Math.round(cost_estimate_eur),
    payback_years,
    co2_saved_kg,
    // Verdict
    recommendations,
    reference: "SR EN 15316-3:2017 + prEN 12831-3",
  };
}
