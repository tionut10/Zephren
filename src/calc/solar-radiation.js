// ═══════════════════════════════════════════════════════════════
// MODEL RADIAȚIE SOLARĂ — SR EN ISO 52010-1:2017/NA:2023
// Calcul iradianță pe suprafețe orientate/înclinate din date orizontale
// Metodă: descompunere directă + difuză izotropică + reflectată de sol
// Sprint 20 (23 apr 2026): integrare umbrire orizont + albedo sezonier
// ═══════════════════════════════════════════════════════════════

import { directBeamVisibility, skyViewFactor } from "./horizon.js";

const DEG = Math.PI / 180;

/**
 * Declinație solară [°] — Spencer (1971), recomandat de ISO 52010-1 §6.2
 * @param {number} dayOfYear — ziua anului (1-365)
 */
export function solarDeclination(dayOfYear) {
  const B = (360 / 365) * (dayOfYear - 81) * DEG;
  return 23.45 * Math.sin(B);
}

/**
 * Ecuația timpului [minute] — Spencer (1971)
 */
export function equationOfTime(dayOfYear) {
  const B = (360 / 365) * (dayOfYear - 1) * DEG;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B));
}

/**
 * Unghiul orar solar [°]
 * @param {number} hour — ora solară locală (0-23, cu zecimale)
 * @param {number} eot — ecuația timpului [min]
 * @param {number} longitude — longitudine [°] (pozitiv Est)
 * @param {number} stdMeridian — meridianul standard al fusului orar [°] (România: 30)
 */
export function hourAngle(hour, eot, longitude, stdMeridian) {
  const solarTime = hour + (eot / 60) + ((longitude - stdMeridian) / 15);
  return (solarTime - 12) * 15;
}

/**
 * Înălțimea solară [°] și azimutul solar [°]
 * @param {number} lat — latitudine [°]
 * @param {number} decl — declinație [°]
 * @param {number} ha — unghi orar [°]
 * @returns {{ altitude: number, azimuth: number }}
 */
export function solarPosition(lat, decl, ha) {
  const sinAlt = Math.sin(lat * DEG) * Math.sin(decl * DEG) +
    Math.cos(lat * DEG) * Math.cos(decl * DEG) * Math.cos(ha * DEG);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;

  const cosAz = (Math.sin(decl * DEG) - Math.sin(lat * DEG) * sinAlt) /
    (Math.cos(lat * DEG) * Math.cos(altitude * DEG) + 1e-10);
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG;
  if (ha > 0) azimuth = 360 - azimuth;
  return { altitude, azimuth };
}

/**
 * Unghi de incidență pe suprafață orientată [°]
 * ISO 52010-1 §6.5.3
 * @param {number} lat — latitudine [°]
 * @param {number} decl — declinație [°]
 * @param {number} ha — unghi orar [°]
 * @param {number} tilt — înclinare suprafață față de orizontală [°] (0=orizontal, 90=vertical)
 * @param {number} surfAzimuth — azimut suprafață [°] (0=Sud, 90=Vest, -90=Est, 180=Nord)
 */
export function incidenceAngle(lat, decl, ha, tilt, surfAzimuth) {
  const cosTheta =
    Math.sin(decl * DEG) * Math.sin(lat * DEG) * Math.cos(tilt * DEG) -
    Math.sin(decl * DEG) * Math.cos(lat * DEG) * Math.sin(tilt * DEG) * Math.cos(surfAzimuth * DEG) +
    Math.cos(decl * DEG) * Math.cos(lat * DEG) * Math.cos(tilt * DEG) * Math.cos(ha * DEG) +
    Math.cos(decl * DEG) * Math.sin(lat * DEG) * Math.sin(tilt * DEG) * Math.cos(surfAzimuth * DEG) * Math.cos(ha * DEG) +
    Math.cos(decl * DEG) * Math.sin(tilt * DEG) * Math.sin(surfAzimuth * DEG) * Math.sin(ha * DEG);
  return Math.acos(Math.max(0, Math.min(1, cosTheta))) / DEG;
}

// Azimut suprafață per orientare cardinală [° față de Sud]
const SURFACE_AZIMUTH = {
  S: 0, SV: 45, V: 90, NV: 135, N: 180, NE: -135, E: -90, SE: -45, Oriz: 0,
};

// ═══════════════════════════════════════════════════════════════
// Albedo sezonier per zonă climatică RO — SR EN ISO 52010-1 §6.4.3 + IPCC AR6
// Sprint 20 (23 apr 2026): înainte era 0.2 constant anual → supraestimare
// radiație reflectată iarnă în zonele montane (zăpadă persistentă).
// Valori: IPCC AR6 Tab 7.SM.1 + ASHRAE Handbook Fundamentals 2021.
//
// Strat de zăpadă recent: ρ = 0.80-0.90 (ASHRAE)
// Strat de zăpadă vechi / murdar: ρ = 0.40-0.60
// Iarbă uscată / sol gol: ρ = 0.15-0.25 (default 0.20)
// ═══════════════════════════════════════════════════════════════
const ALBEDO_SEASONAL = {
  // Zonă I (Litoral, Constanța) — fără zăpadă persistentă
  I:   [0.25, 0.22, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.25],
  // Zonă II (București, Timișoara) — zăpadă ocazională dec-feb
  II:  [0.35, 0.30, 0.22, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.22, 0.30],
  // Zonă III (Cluj, Iași) — zăpadă persistentă dec-mar
  III: [0.55, 0.50, 0.35, 0.22, 0.20, 0.20, 0.20, 0.20, 0.20, 0.22, 0.30, 0.50],
  // Zonă IV (Brașov, Miercurea Ciuc) — iarnă lungă cu zăpadă
  IV:  [0.70, 0.65, 0.50, 0.25, 0.20, 0.20, 0.20, 0.20, 0.20, 0.25, 0.45, 0.65],
  // Zonă V (munte, Predeal-Sinaia) — zăpadă nov-apr
  V:   [0.80, 0.75, 0.65, 0.40, 0.25, 0.22, 0.20, 0.20, 0.22, 0.35, 0.60, 0.75],
};

/**
 * Albedo pentru luna și zona climatică date
 * @param {string} zone — "I" | "II" | "III" | "IV" | "V"
 * @param {number} month — 0-11 (ian-dec)
 * @returns {number} — reflectanța solului [0-1]
 */
export function getSeasonalAlbedo(zone, month) {
  const table = ALBEDO_SEASONAL[zone] || ALBEDO_SEASONAL.III;
  return table[Math.max(0, Math.min(11, month | 0))];
}

export { ALBEDO_SEASONAL };

/**
 * Iradianță pe suprafață orientată — model izotropic difuz (Liu & Jordan)
 * ISO 52010-1 §6.5.4 — metoda simplificată
 *
 * @param {number} Gb_h — iradianță directă pe plan orizontal [W/m²]
 * @param {number} Gd_h — iradianță difuză pe plan orizontal [W/m²]
 * @param {number} altitude — înălțime solară [°]
 * @param {number} theta — unghi de incidență [°]
 * @param {number} tilt — înclinare suprafață [°]
 * @param {number} rho_g — albedo sol (reflectanță, implicit 0.2)
 * @returns {{ G_b_tilted, G_d_tilted, G_r_tilted, G_total }}
 */
export function irradianceOnSurface(Gb_h, Gd_h, altitude, theta, tilt, rho_g = 0.2) {
  const Gh = Gb_h + Gd_h; // iradianță globală orizontală
  const sinAlt = Math.sin(altitude * DEG);

  // Directă pe suprafața înclinată
  const G_b_tilted = sinAlt > 0.05 && theta < 90
    ? Gb_h * Math.cos(theta * DEG) / sinAlt
    : 0;

  // Difuză izotropică — model Liu & Jordan
  const G_d_tilted = Gd_h * (1 + Math.cos(tilt * DEG)) / 2;

  // Reflectată de sol
  const G_r_tilted = Gh * rho_g * (1 - Math.cos(tilt * DEG)) / 2;

  return {
    G_b_tilted: Math.max(0, G_b_tilted),
    G_d_tilted: Math.max(0, G_d_tilted),
    G_r_tilted: Math.max(0, G_r_tilted),
    G_total: Math.max(0, G_b_tilted) + G_d_tilted + G_r_tilted,
  };
}

/**
 * Calcul iradianță lunară pe 9 orientări [kWh/m²·lună]
 * ISO 52010-1 §6.5 — integrat pe luni, latitudine dată
 *
 * @param {number} lat — latitudine [°]
 * @param {number[]} Gh_monthly — iradianță globală lunară orizontală [kWh/m²·lună] (12 valori)
 * @param {number} [diffuseRatio=0.45] — fracțiunea difuză din global (kt corecție, implicit 0.45)
 * @param {string} [climateZone="III"] — zona climatică RO (I-V) pentru albedo sezonier
 * @param {string|object} [horizonProfile] — profil orizont (cheie HORIZON_PROFILES sau obiect elevations)
 * @returns {{ [orientation: string]: number[] }} — 9 orientări × 12 luni
 */
export function calcMonthlyIrradianceAllOrientations(lat, Gh_monthly, diffuseRatio = 0.45, climateZone = "III", horizonProfile = null) {
  const orientations = ["N", "NE", "E", "SE", "S", "SV", "V", "NV", "Oriz"];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const result = {};

  orientations.forEach(ori => { result[ori] = new Array(12).fill(0); });

  // Sky view factor pentru componenta difuză (Sprint 20)
  const svf = horizonProfile ? skyViewFactor(horizonProfile) : 1.0;

  for (let m = 0; m < 12; m++) {
    const dayMid = daysInMonth.slice(0, m).reduce((a, b) => a + b, 0) + Math.round(daysInMonth[m] / 2);
    const decl = solarDeclination(dayMid);
    const Gh_day_Wh = (Gh_monthly[m] * 1000) / daysInMonth[m]; // Wh/m²·zi
    // Albedo sezonier conform climateZone (Sprint 20 — iarna cu zăpadă)
    const rho_g_month = getSeasonalAlbedo(climateZone, m);

    // Fracțiune directă/difuză
    const Gd_day_Wh = Gh_day_Wh * diffuseRatio;
    const Gb_day_Wh = Gh_day_Wh - Gd_day_Wh;

    orientations.forEach(ori => {
      const tilt = ori === "Oriz" ? 0 : 90;
      const surfAz = SURFACE_AZIMUTH[ori];
      let sum_Wh = 0;

      // Integrare orară simplificată (6:00 — 20:00)
      for (let h = 6; h <= 19; h++) {
        const ha = (h - 12) * 15;
        const pos = solarPosition(lat, decl, ha);
        if (pos.altitude <= 0) continue;

        const Gb_h = Gb_day_Wh / 10; // W/m² instant (aprox din Wh zilnic / ~10 ore soare)
        const Gd_h = Gd_day_Wh / 10;
        const theta = incidenceAngle(lat, decl, ha, tilt, surfAz);

        // Sprint 20: corecție directă cu umbrire orizont
        const beamVisible = horizonProfile
          ? directBeamVisibility(pos.altitude, pos.azimuth - 180, horizonProfile) // convenție: az geografic - 180 → az față de S
          : 1.0;
        const Gb_eff = Gb_h * beamVisible;
        const Gd_eff = Gd_h * svf; // difuza redusă de sky view factor

        const irr = irradianceOnSurface(Gb_eff, Gd_eff, pos.altitude, theta, tilt, rho_g_month);
        sum_Wh += irr.G_total; // 1 oră × W/m² = Wh/m²
      }

      result[ori][m] = Math.round(sum_Wh * daysInMonth[m] / 1000 * 10) / 10; // kWh/m²·lună
    });
  }

  return result;
}
