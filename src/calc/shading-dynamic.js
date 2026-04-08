/**
 * Shading Dinamic de la Clădiri Vecine — factor de umbrire pe fațadă
 * Referințe:
 * - SR EN ISO 52010-1:2017 — Radiație solară pe suprafețe ale clădirilor
 * - SR EN ISO 13790:2009 — Performanță energetică, metoda de calcul
 * - SR EN ISO 52016-1:2017 — Necesarul de energie, bilanț termic
 * - SR EN 13363-1:2003 — Dispozitive protecție solară
 *
 * Principiu: clădirile vecine generează umbră pe fațada analizată,
 * reducând câștigurile solare. Efectul depinde de înălțimea relativă,
 * distanța dintre clădiri, orientarea fațadei și declinația solară.
 */

// ── Declinație solară medie per lună [°] ────────────────────────
// Aproximare clasică: δ = 23.45 × sin(360/365 × (284 + n))
// Valori medii la mijlocul fiecărei luni
export const SOLAR_DECLINATION_MONTH = [
  -20.9, -13.0, -2.4, 9.4, 18.8, 23.1, 21.2, 13.5, 2.2, -9.6, -18.9, -23.0
];

// ── Azimut solar la amiază per orientare fațadă [°] ─────────────
// Orientarea fațadei determină unghiul de incidență relativ
const AZIMUTH_FACE = {
  S:   0,    // fațadă sud — soare din față la amiază
  SSE: -22,  SSV: 22,
  SE:  -45,  SV:  45,
  ESE: -67,  VSV: 67,
  E:   -90,  V:   90,
  ENE: -112, VNV: 112,
  NE:  -135, NV:  135,
  NNE: -157, NNV: 157,
  N:   180,
};

/**
 * Calcul unghi de înălțime solară la amiaza solară
 * α_solar = 90 - |φ - δ|  (simplificat pentru amiază)
 * @param {number} latDeg — latitudine [°]
 * @param {number} declDeg — declinație solară [°]
 * @returns {number} unghi înălțime solară la amiază [°]
 */
function solarAltitudeNoon(latDeg, declDeg) {
  return 90 - Math.abs(latDeg - declDeg);
}

/**
 * Calcul unghi de umbră generat de clădirea vecină
 * β_shadow = atan(H_adj / D)
 * @param {number} H_adj — diferența de înălțime [m]
 * @param {number} D — distanța între clădiri [m]
 * @returns {number} unghi de umbră [°]
 */
function shadowAngle(H_adj, D) {
  if (D <= 0) return 90;
  return Math.atan(H_adj / D) * (180 / Math.PI);
}

/**
 * Factor de umbrire lunar — fracția din fațadă umbrită
 * Conform EN ISO 52010-1 Secț.6.5 — obstacole externe
 * @param {number} alpha_sun — unghi înălțime solară [°]
 * @param {number} beta_shadow — unghi de umbră [°]
 * @param {number} faceAzimuth — azimutul fațadei [°]
 * @returns {number} factor umbrire [0-1] (0=fără umbră, 1=umbră totală)
 */
function monthlyShadingFactor(alpha_sun, beta_shadow, faceAzimuth) {
  // Dacă soarele e sub unghiul de umbră → umbră
  if (alpha_sun <= 0) return 0; // noapte polară, nu contează
  if (beta_shadow <= 0) return 0; // obstacol mai mic, fără umbră

  // Factor bazat pe raportul unghiuri
  const ratio = Math.min(1, beta_shadow / alpha_sun);

  // Corecție orientare: fațadele laterale primesc mai puțină umbră directă
  const azFactor = Math.max(0, Math.cos(Math.abs(faceAzimuth) * Math.PI / 180));

  // Factor final: cu cât unghiul de umbră e mai mare relativ la soare,
  // cu atât umbrirea e mai intensă
  return Math.min(1, ratio * azFactor);
}

/**
 * Calcul umbrire dinamică de la clădiri vecine
 *
 * @param {object} params
 * @param {string} params.faceOrientation — orientare fațadă ("S","SE","E","N", etc.)
 * @param {number} params.adjacentBuildingHeight — înălțimea clădirii vecine [m]
 * @param {number} params.adjacentBuildingDistance — distanța față de clădirea vecină [m]
 * @param {number} params.buildingHeight — înălțimea clădirii analizate [m] (default 10)
 * @param {number} params.latDeg — latitudine [°] (default 44.4 — București)
 * @param {number} params.floorHeight — înălțimea etajului analizat [m] (default 5,
 *        mijlocul fațadei pentru clădiri mici)
 * @param {number} params.facadeArea — suprafața fațadei analizate [m²] (default 50)
 * @param {number} params.glazingRatio — raport suprafață vitrată / fațadă [0-1] (default 0.25)
 * @returns {object} rezultat umbrire per lună
 */
export function calcBuildingShading({
  faceOrientation = "S",
  adjacentBuildingHeight = 20,
  adjacentBuildingDistance = 15,
  buildingHeight = 10,
  latDeg = 44.4,
  floorHeight = null,
  facadeArea = 50,
  glazingRatio = 0.25,
} = {}) {
  // Înălțimea punctului de analiză (mijlocul fațadei sau specificat)
  const h_analysis = floorHeight ?? (buildingHeight / 2);

  // Diferența de înălțime relevantă (partea obstacolului deasupra punctului de analiză)
  const H_effective = Math.max(0, adjacentBuildingHeight - h_analysis);

  // Unghi de umbră generat de obstacolul vecin
  const beta_shadow_deg = shadowAngle(H_effective, adjacentBuildingDistance);

  // Azimut fațadă
  const faceAz = AZIMUTH_FACE[faceOrientation] ?? 0;

  // ── Calcul per lună ────────────────────────────────────────
  const shadingFactor_month = SOLAR_DECLINATION_MONTH.map((decl, i) => {
    const alpha_sun = solarAltitudeNoon(latDeg, decl);
    const sf = monthlyShadingFactor(alpha_sun, beta_shadow_deg, faceAz);
    return Math.round(sf * 100) / 100;
  });

  // ── Factor de umbrire mediu anual ──────────────────────────
  // Ponderat cu radiația solară relativă per lună
  // (lunile de vară contează mai mult)
  const solarWeights = [0.4, 0.5, 0.7, 0.9, 1.0, 1.0, 1.0, 0.95, 0.8, 0.6, 0.4, 0.35];
  const totalWeight = solarWeights.reduce((s, w) => s + w, 0);
  const avgShading = shadingFactor_month.reduce((s, f, i) => s + f * solarWeights[i], 0) / totalWeight;

  // ── Reducere câștiguri solare ──────────────────────────────
  // EN ISO 13790: câștigurile solare prin ferestre se reduc cu factorul de umbrire
  const solarGain_reduction_pct = Math.round(avgShading * 100);
  const glazingArea = facadeArea * glazingRatio;

  // ── Risc de supraîncălzire ─────────────────────────────────
  // Umbrirea reduce riscul de supraîncălzire vara
  const summerShading = (shadingFactor_month[5] + shadingFactor_month[6] + shadingFactor_month[7]) / 3;
  let overheating_risk;
  if (summerShading >= 0.50) {
    overheating_risk = "scăzut";
  } else if (summerShading >= 0.25) {
    overheating_risk = "moderat";
  } else {
    overheating_risk = "ridicat";
  }

  // ── Recomandări ────────────────────────────────────────────
  const recommendations = [];
  if (avgShading > 0.50) {
    recommendations.push(
      `Umbrire semnificativă (${solarGain_reduction_pct}%) — câștigurile solare pasive iarna sunt ` +
      `reduse semnificativ. Evaluați necesitatea suplimentării încălzirii.`
    );
  }
  if (avgShading < 0.15 && (faceOrientation === "S" || faceOrientation === "SV" || faceOrientation === "SE")) {
    recommendations.push(
      "Umbrire minimă pe fațada sudică — instalați protecție solară exterioară (brise-soleil, copertine)."
    );
  }
  if (beta_shadow_deg > 45) {
    recommendations.push(
      `Unghi de umbră mare (${Math.round(beta_shadow_deg)}°) — fațada este puternic afectată de clădirea vecină.`
    );
  }
  const winterShading = (shadingFactor_month[11] + shadingFactor_month[0] + shadingFactor_month[1]) / 3;
  if (winterShading > 0.60) {
    recommendations.push(
      "Umbrire excesivă iarna — câștiguri solare pasive reduse drastic, necesarul de încălzire crește."
    );
  }

  return {
    // Factor de umbrire lunar [0-1]
    shadingFactor_month,
    avgShading:              Math.round(avgShading * 100) / 100,
    solarGain_reduction_pct,
    // Geometrie
    beta_shadow_deg:         Math.round(beta_shadow_deg * 10) / 10,
    H_effective:             Math.round(H_effective * 10) / 10,
    faceOrientation,
    glazingArea:             Math.round(glazingArea * 10) / 10,
    // Risc
    overheating_risk,
    // Verdict
    recommendations,
    reference: "SR EN ISO 52010-1:2017 + SR EN ISO 13790:2009",
  };
}
