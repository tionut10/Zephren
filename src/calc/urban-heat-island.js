/**
 * Corecție Urban Heat Island (UHI) — efect insulă de căldură urbană
 * Referințe:
 * - ASHRAE 55:2020 — Condiții de mediu termic pentru ocupanți
 * - ISO 15743:2008 — Ergonomia mediului termic
 * - SR EN ISO 15927-4:2005 — Date climatice orare (corecție locală)
 * - SR EN ISO 52010-1:2017/NA:2023 — Date climatice externe (conversie)
 * - Oke, T.R. (1982) — „The energetic basis of UHI" Q.J.R.Met.Soc.
 *
 * Principiu: în zonele urbane dense, temperatura exterioară este
 * mai ridicată decât în mediul rural din cauza masei termice a
 * clădirilor, reducerii vegetației și generării de căldură antropică.
 * Acest efect reduce necesarul de încălzire iarna dar crește
 * necesarul de răcire vara.
 */

// ── Temperaturi medii lunare de referință (rural, zona III România) ──
// Utilizate ca bază dacă nu se furnizează date climatice specifice
const THETA_EXT_MONTH_REF = [
  -1.5, 0.5, 5.5, 11.0, 16.5, 20.0, 22.0, 21.5, 16.5, 11.0, 5.0, 0.5
];

/**
 * Factori de intensitate UHI per categorie urbană
 * deltaT_max: UHI maxim nocturn [K] conform Oke (1982) + ASHRAE
 * deltaT_avg: UHI mediu anual [K]
 */
export const UHI_INTENSITY_FACTORS = {
  rural:        { deltaT_max: 0.0, deltaT_avg: 0.0, label: "Rural / sat" },
  suburban_low: { deltaT_max: 1.0, deltaT_avg: 0.5, label: "Suburban — densitate mică" },
  suburban:     { deltaT_max: 2.0, deltaT_avg: 1.0, label: "Suburban — densitate medie" },
  urban:        { deltaT_max: 3.5, deltaT_avg: 1.8, label: "Urban — densitate medie" },
  urban_dense:  { deltaT_max: 5.0, deltaT_avg: 2.5, label: "Urban dens — centru oraș" },
  urban_core:   { deltaT_max: 7.0, deltaT_avg: 3.5, label: "Centru metropolitan dens" },
};

// ── Factor sezonier UHI ─────────────────────────────────────────
// UHI e mai pronunțat vara (radiație + antropic) și noaptea
// Valori relative per lună (1.0 = maxim vara)
const UHI_SEASONAL_FACTOR = [
  0.50, 0.55, 0.65, 0.75, 0.90, 1.00, 1.00, 0.95, 0.80, 0.65, 0.55, 0.50
];

/**
 * Estimare categorie urbană din parametri cantitativi
 * @param {number} population — populație oraș
 * @param {number} buildingDensity — densitate construcție [%] (0-100)
 * @param {number} greenAreaPct — procent spații verzi [%] (0-100)
 * @param {number} distanceCenterKm — distanța față de centrul orașului [km]
 * @returns {string} cheie din UHI_INTENSITY_FACTORS
 */
function classifyUrbanContext(population, buildingDensity, greenAreaPct, distanceCenterKm) {
  // Scor compozit bazat pe populație, densitate, vegetație, proximitate centru
  let score = 0;

  // Populație (efect logaritmic — Oke 1982: ΔT ∝ log(P))
  if (population > 1_000_000) score += 4;
  else if (population > 300_000) score += 3;
  else if (population > 100_000) score += 2;
  else if (population > 30_000) score += 1;

  // Densitate construcție
  if (buildingDensity > 70) score += 3;
  else if (buildingDensity > 50) score += 2;
  else if (buildingDensity > 30) score += 1;

  // Spații verzi (efect negativ — mitigare UHI)
  if (greenAreaPct > 40) score -= 2;
  else if (greenAreaPct > 25) score -= 1;

  // Distanța față de centru (gradient UHI)
  if (distanceCenterKm < 1) score += 2;
  else if (distanceCenterKm < 3) score += 1;
  else if (distanceCenterKm > 10) score -= 1;

  // Mapare scor → categorie
  if (score >= 7) return "urban_core";
  if (score >= 5) return "urban_dense";
  if (score >= 3) return "urban";
  if (score >= 1) return "suburban";
  if (score >= 0) return "suburban_low";
  return "rural";
}

/**
 * Calcul corecție Urban Heat Island
 *
 * @param {object} params
 * @param {number} params.lat — latitudine [°] (default 44.4 — București)
 * @param {number} params.lon — longitudine [°] (default 26.1)
 * @param {number} params.population — populație oraș (default 100000)
 * @param {number} params.buildingDensity — densitate construcție [%] (default 45)
 * @param {number} params.greenAreaPct — procent spații verzi [%] (default 20)
 * @param {number} params.distanceCenterKm — distanța de centru [km] (default 3)
 * @param {number[]} params.theta_ext_month — temperaturi medii exterioare lunare [°C]
 *        (12 valori, default referință zona III)
 * @param {number} params.HDD — grade-zile încălzire de referință [°C·zi] (default 2800)
 * @param {number} params.CDD — grade-zile răcire de referință [°C·zi] (default 150)
 * @returns {object} rezultat corecție UHI
 */
export function calcUHI({
  lat = 44.4,
  lon = 26.1,
  population = 100_000,
  buildingDensity = 45,
  greenAreaPct = 20,
  distanceCenterKm = 3,
  theta_ext_month = null,
  HDD = 2800,
  CDD = 150,
} = {}) {
  // ── 1. Clasificare context urban ───────────────────────────
  const urbanClass = classifyUrbanContext(population, buildingDensity, greenAreaPct, distanceCenterKm);
  const uhi = UHI_INTENSITY_FACTORS[urbanClass];

  // ── 2. Temperaturi de bază ─────────────────────────────────
  const baseMonthly = theta_ext_month && theta_ext_month.length === 12
    ? theta_ext_month
    : THETA_EXT_MONTH_REF;

  // ── 3. Corecție lunară UHI ─────────────────────────────────
  // ΔT_uhi(lună) = ΔT_avg × factor_sezonier(lună)
  const deltaT_month = UHI_SEASONAL_FACTOR.map(f => Math.round(uhi.deltaT_avg * f * 10) / 10);
  const theta_ext_corrected_month = baseMonthly.map((t, i) =>
    Math.round((t + deltaT_month[i]) * 10) / 10
  );

  // ── 4. ΔT UHI mediu anual ─────────────────────────────────
  const deltaT_uhi = Math.round(uhi.deltaT_avg * 10) / 10;

  // ── 5. Impact asupra necesarului de încălzire ──────────────
  // HDD_corr = HDD × (1 - deltaT_avg / theta_base_heating)
  // θ_base = 15°C (pragul de încălzire)
  const theta_base_heat = 15;
  const HDD_reduction_factor = deltaT_uhi / theta_base_heat;
  const heating_reduction_pct = Math.round(HDD_reduction_factor * 100);
  const HDD_corrected = Math.round(HDD * (1 - HDD_reduction_factor));

  // ── 6. Impact asupra necesarului de răcire ─────────────────
  // CDD_corr = CDD × (1 + deltaT_avg / theta_base_cooling)
  // θ_base_cool = 10°C (sensibilitate mai mare)
  const theta_base_cool = 10;
  const CDD_increase_factor = deltaT_uhi / theta_base_cool;
  const cooling_increase_pct = Math.round(CDD_increase_factor * 100);
  const CDD_corrected = Math.round(CDD * (1 + CDD_increase_factor));

  // ── 7. Recomandări ─────────────────────────────────────────
  const recommendations = [];
  if (deltaT_uhi >= 2.0) {
    recommendations.push(
      `Efect UHI semnificativ (+${deltaT_uhi}°C) — utilizați temperaturi corectate în calculul energetic.`
    );
  }
  if (cooling_increase_pct >= 15) {
    recommendations.push(
      `Necesarul de răcire crește cu ~${cooling_increase_pct}% — prioritizați protecția solară și ventilația nocturnă.`
    );
  }
  if (greenAreaPct < 15 && deltaT_uhi >= 1.5) {
    recommendations.push(
      "Spații verzi insuficiente (<15%) — vegetația perimetrală reduce UHI cu 1-2°C."
    );
  }
  if (heating_reduction_pct >= 5) {
    recommendations.push(
      `Necesarul de încălzire se reduce cu ~${heating_reduction_pct}% datorită UHI — nu supradimensionați centralele.`
    );
  }
  if (deltaT_uhi < 0.5) {
    recommendations.push(
      "Efect UHI neglijabil — nu sunt necesare corecții suplimentare."
    );
  }

  return {
    // Clasificare
    urbanClass,
    urbanLabel:              uhi.label,
    deltaT_uhi,
    deltaT_month,
    // Temperaturi corectate
    theta_ext_corrected_month,
    // Impact încălzire
    heating_reduction_pct,
    HDD_corrected,
    // Impact răcire
    cooling_increase_pct,
    CDD_corrected,
    // Parametri intrare
    population,
    buildingDensity,
    greenAreaPct,
    distanceCenterKm,
    lat, lon,
    // Verdict
    recommendations,
    reference: "ASHRAE 55:2020 + ISO 15743:2008 + Oke (1982)",
  };
}
