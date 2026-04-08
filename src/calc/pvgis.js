/**
 * PVGIS 5.2 API — iradianță solară și producție PV
 * Sursa: https://re.jrc.ec.europa.eu/pvg_tools/en/
 * API public, fără autentificare, CORS permis
 * Include fallback offline cu date estimate pentru România.
 */

// Endpoint PVGIS 5.2
const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_2";

// Producție anuală PV estimată per zonă climatică România [kWh/kWp]
// Sursa: PVGIS medii multianuale, lat 44-48°N
const OFFLINE_PV_YIELD = {
  I: 1250,  // zona I (Dobrogea, câmpie sudică) — iradianță mare
  II: 1180, // zona II (Muntenia, Moldova)
  III: 1120, // zona III (Transilvania)
  IV: 1060, // zona IV (sub-carpatic)
  V: 950,   // zona V (munte)
};

// Iradianță globală orizontală estimată [kWh/m²/an] per zonă
const OFFLINE_GH_ANNUAL = { I: 1450, II: 1350, III: 1280, IV: 1200, V: 1050 };

// Iradianță lunară estimată [kWh/m²/lună] distribuție medie România
const OFFLINE_MONTHLY_FRACTION = [0.04, 0.055, 0.085, 0.105, 0.125, 0.13, 0.135, 0.125, 0.095, 0.065, 0.04, 0.03];

/**
 * Estimare offline producție PV bazată pe zona climatică.
 * Folosită ca fallback când PVGIS API nu răspunde.
 */
function getOfflinePVEstimate(peakPower_kWp, climateZone) {
  const zone = climateZone || "III";
  const specificYield = OFFLINE_PV_YIELD[zone] || 1120;
  const ghAnnual = OFFLINE_GH_ANNUAL[zone] || 1280;

  return {
    monthly: OFFLINE_MONTHLY_FRACTION.map((f, i) => ({
      month: i + 1,
      E_m: Math.round(peakPower_kWp * specificYield * f * 10) / 10,
      H_i_m: Math.round(ghAnnual * f * 10) / 10,
    })),
    E_annual: Math.round(peakPower_kWp * specificYield),
    specific_yield: specificYield,
    performance_ratio: 0.82,
    source: "Offline estimate (PVGIS unavailable)",
    offline: true,
  };
}

function getOfflineClimateEstimate(climateZone) {
  const zone = climateZone || "III";
  const ghAnnual = OFFLINE_GH_ANNUAL[zone] || 1280;

  return {
    monthly: OFFLINE_MONTHLY_FRACTION.map((f, i) => ({
      month: i + 1,
      Gh: Math.round(ghAnnual * f * 10) / 10,
      Gd: Math.round(ghAnnual * f * 0.45 * 10) / 10, // ~45% difuză
    })),
    annual_Gh: ghAnnual,
    source: "Offline estimate (PVGIS unavailable)",
    offline: true,
  };
}

/**
 * Obține date iradianță orizontală + climatică pentru o locație.
 * Falls back to offline estimates if PVGIS API is unavailable.
 */
export async function fetchPVGISClimate(lat, lon, options = {}) {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    outputformat: "json",
    browser: 0,
    ...options
  });
  const url = `${PVGIS_BASE}/MRcalc?${params}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`PVGIS API error: ${resp.status}`);
    const data = await resp.json();
    return parsePVGISClimate(data);
  } catch (err) {
    console.warn("[PVGIS] Climate fetch failed, using offline estimate:", err.message);
    return getOfflineClimateEstimate(options.climateZone);
  }
}

/**
 * Calcul producție anuală PV pentru un sistem dat.
 * Falls back to offline estimates if PVGIS API is unavailable.
 */
export async function fetchPVGISProduction(lat, lon, peakPower_kWp, tilt = 35, azimuth = 0, climateZone) {
  const params = new URLSearchParams({
    lat: lat.toFixed(4), lon: lon.toFixed(4),
    peakpower: peakPower_kWp,
    mountingplace: "building",
    loss: 14,
    angle: tilt,
    aspect: azimuth,
    outputformat: "json",
    browser: 0,
  });
  const url = `${PVGIS_BASE}/PVcalc?${params}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`PVGIS PV error: ${resp.status}`);
    const data = await resp.json();
    return parsePVGISProduction(data);
  } catch (err) {
    console.warn("[PVGIS] Production fetch failed, using offline estimate:", err.message);
    return getOfflinePVEstimate(peakPower_kWp, climateZone);
  }
}

function parsePVGISClimate(data) {
  // Parseaza răspunsul PVGIS MRcalc
  const monthly = data?.outputs?.monthly?.fixed || [];
  return {
    monthly: monthly.map(m => ({
      month: m.month,
      Gh: m.H_h,    // Iradianță globală orizontală [kWh/m²/lună]
      Gd: m.Hd_h,   // Iradianță difuză orizontală
    })),
    annual_Gh: data?.outputs?.totals?.fixed?.H_h || null,
    source: "PVGIS 5.2",
  };
}

function parsePVGISProduction(data) {
  const monthly = data?.outputs?.monthly || [];
  const totals = data?.outputs?.totals?.fixed || {};
  return {
    monthly: monthly.map(m => ({
      month: m.month,
      E_m: m.E_m,      // Producție lunară [kWh]
      H_i_m: m.H_i_m,  // Iradianță pe plan înclinat
    })),
    E_annual: totals.E_y || null,   // kWh/an
    specific_yield: totals.E_y && data.inputs?.mounting_system?.fixed?.peak_power
      ? totals.E_y / data.inputs.mounting_system.fixed.peak_power : null,
    performance_ratio: totals.PR || null,
    source: "PVGIS 5.2",
  };
}
