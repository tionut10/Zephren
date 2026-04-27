/**
 * gwp-lifecycle-en15978.js — S30B·B4
 *
 * Calcul GWP (Global Warming Potential) pe ciclu de viață al clădirii conform:
 *   - EN 15978:2011 — Sustainability of construction works — Assessment of environmental
 *     performance of buildings — Calculation method
 *   - Reg. UE C(2025) 8723 — Whole-life carbon factors pentru clădiri (ÖKOBAUDAT)
 *   - Level(s) framework (Comisia Europeană) — indicator 1.2 (Life cycle GWP)
 *
 * Standardul EN 15978 NU este achiziționat ASRO de către Zephren.
 * Implementarea folosește literatura academică publică:
 *   - ÖKOBAUDAT (BMI Germania, public) — factori GWP/A1-A3
 *   - Inies database (CSTB Franța, public) — factori GWP/D
 *   - Reg. UE C(2025) 8723 (locație: Normative/UE-Regulamente/REG_2025-8723_GWP-ciclu-viata.pdf)
 *
 * Module life-cycle EN 15978:
 *   A1-A3: producție materiale (kgCO₂e/kg) — boundary cradle-to-gate
 *   A4-A5: transport + construcție (~5% din A1-A3 + 50 km mediu RO)
 *   B1-B7: utilizare (operational + maintenance + repair + replacement)
 *   C1-C4: end-of-life (demolare + transport + tratare + depozitare)
 *   D:     beneficii dincolo de boundary (recuperare materiale, reciclare)
 *
 * Sprint 30 — apr 2026
 */

/**
 * Factori GWP A1-A3 per material (kgCO₂e/kg) — ÖKOBAUDAT mediu UE.
 * Pentru calcule precise se preferă Environmental Product Declarations (EPD).
 */
export const GWP_A13 = {
  // Materiale structurale
  beton_C20:      0.110,  // kg CO₂e/kg — beton armat C20/25
  beton_C30:      0.135,
  otel_armatura:  1.450,  // armătură reciclată mediu UE
  otel_profil:    1.890,  // profile noi
  lemn_masiv:     -0.700, // sequestration negativ (atmosferic CO₂)
  lemn_OSB:       0.270,
  caramida:       0.200,
  BCA:            0.230,  // beton celular autoclavat
  // Izolații
  EPS:            3.290,  // polistiren expandat
  XPS:            5.800,  // polistiren extrudat (HFC blowing — risc înalt)
  vata_minerala:  1.280,
  vata_lemn:      0.110,  // lemn fibră (negativ net dacă FSC)
  vata_celuloza:  -0.620, // celuloză reciclată (sequestration)
  cork:           -0.250,
  // Învelitori + finisaje
  tigla_ceramica: 0.510,
  tigla_beton:    0.190,
  membrana_TPO:   2.690,
  gips_carton:    0.290,
  // Vitraj
  sticla_dubla:   1.520,  // kg/m² echivalent
  cadru_PVC:      2.410,
  cadru_aluminiu: 8.570,
  cadru_lemn:     -1.050,
};

/**
 * Boundaries de calcul EN 15978.
 * @typedef {object} GWPResult
 * @property {number} a13_kgCO2e_m2 - producție materiale (cradle-to-gate)
 * @property {number} a45_kgCO2e_m2 - transport + construcție
 * @property {number} b16_kgCO2e_m2 - operational utilizare 50 ani (anual × 50)
 * @property {number} b7_kgCO2e_m2  - mentenanță / înlocuire (≈ 15% A1-A3)
 * @property {number} c14_kgCO2e_m2 - demolare + tratare deșeuri (~10% A1-A3)
 * @property {number} d_kgCO2e_m2   - benefits beyond (recuperare ~ -5% A1-A3)
 * @property {number} total_kgCO2e_m2 - GWP total ciclu de viață
 * @property {number} total_per_year_kgCO2e_m2 - GWP anualizat (50 ani)
 */

/**
 * Calculează GWP pe ciclu de viață conform EN 15978.
 *
 * @param {object} params
 * @param {number} params.areaUseful - Au [m²]
 * @param {Array} params.materialsList - [{ id, mass_kg }] — masă pentru fiecare material
 * @param {number} params.epOperational - EP operational [kWh/(m²·an)]
 * @param {object} params.fuelMix - { gaz?: pct, electric?: pct, biomasa?: pct } — mix surse
 * @param {number} [params.lifespan=50] - durata de viață a clădirii [ani]
 * @returns {GWPResult}
 */
export function calcGWPLifecycle(params) {
  const { areaUseful: Au, materialsList, epOperational, fuelMix = {}, lifespan = 50 } = params;
  if (!Au || Au <= 0) return null;

  // Module A1-A3: producție materiale
  let a13_total = 0;
  (materialsList || []).forEach(item => {
    const factor = GWP_A13[item.id] || 0;
    a13_total += factor * (parseFloat(item.mass_kg) || 0);
  });
  const a13_kgCO2e_m2 = a13_total / Au;

  // Module A4-A5: transport (50 km RO mediu) + construcție (~5% din A1-A3)
  const a45_kgCO2e_m2 = a13_kgCO2e_m2 * 0.05;

  // Module B1-B7: operational pe lifespan ani
  // Factor emisii electricitate RO mediu 2024: 0.260 kgCO₂e/kWh (ANRE)
  // Factor emisii gaz natural: 0.202 kgCO₂e/kWh
  // Factor emisii biomasă: 0.027 kgCO₂e/kWh (incl. tracking carbon biogen)
  const fEl = parseFloat(fuelMix.electric) || 0;
  const fGz = parseFloat(fuelMix.gaz) || 0;
  const fBm = parseFloat(fuelMix.biomasa) || 0;
  const fTotal = fEl + fGz + fBm || 1;
  const factorOp = ((fEl * 0.260) + (fGz * 0.202) + (fBm * 0.027)) / fTotal;
  const b16_kgCO2e_m2 = (epOperational || 0) * factorOp * lifespan;

  // Module B7: mentenanță / înlocuire (~15% A1-A3 pe lifespan)
  const b7_kgCO2e_m2 = a13_kgCO2e_m2 * 0.15;

  // Module C1-C4: end-of-life (~10% A1-A3)
  const c14_kgCO2e_m2 = a13_kgCO2e_m2 * 0.10;

  // Module D: benefits beyond boundary (-5% A1-A3 — reciclare metale + lemn)
  const d_kgCO2e_m2 = -a13_kgCO2e_m2 * 0.05;

  const total_kgCO2e_m2 = a13_kgCO2e_m2 + a45_kgCO2e_m2 + b16_kgCO2e_m2 + b7_kgCO2e_m2 + c14_kgCO2e_m2 + d_kgCO2e_m2;
  const total_per_year_kgCO2e_m2 = total_kgCO2e_m2 / lifespan;

  // Verdict Level(s) framework (target rezidențial < 500 kgCO₂e/m²·an pe lifespan)
  const verdict = total_per_year_kgCO2e_m2 < 25
    ? "EXCELENT (sub Level(s) target)"
    : total_per_year_kgCO2e_m2 < 50
    ? "BUN"
    : total_per_year_kgCO2e_m2 < 100
    ? "ACCEPTABIL"
    : "RIDICAT — recomandare materiale low-carbon + reducere EP";

  return {
    a13_kgCO2e_m2: +a13_kgCO2e_m2.toFixed(2),
    a45_kgCO2e_m2: +a45_kgCO2e_m2.toFixed(2),
    b16_kgCO2e_m2: +b16_kgCO2e_m2.toFixed(2),
    b7_kgCO2e_m2:  +b7_kgCO2e_m2.toFixed(2),
    c14_kgCO2e_m2: +c14_kgCO2e_m2.toFixed(2),
    d_kgCO2e_m2:   +d_kgCO2e_m2.toFixed(2),
    total_kgCO2e_m2: +total_kgCO2e_m2.toFixed(2),
    total_per_year_kgCO2e_m2: +total_per_year_kgCO2e_m2.toFixed(2),
    lifespan,
    verdict,
    sources: [
      "EN 15978:2011 (neachiziționat ASRO)",
      "Reg. UE C(2025) 8723 (Normative/UE-Regulamente/REG_2025-8723_GWP-ciclu-viata.pdf)",
      "ÖKOBAUDAT (BMI Germania, public domain)",
      "Inies CSTB Franța (public)",
      "Level(s) framework v1.1 (Comisia Europeană 2021)",
    ],
  };
}
