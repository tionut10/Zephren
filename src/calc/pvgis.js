/**
 * PVGIS 5.2 API — iradianță solară și producție PV
 * Sursa: https://re.jrc.ec.europa.eu/pvg_tools/en/
 * API public, fără autentificare, CORS permis
 */

// Endpoint PVGIS 5.2
const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_2";

/**
 * Obține date iradianță orizontală + climatică pentru o locație
 * Returnează date lunare de iradianță
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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`PVGIS API error: ${resp.status}`);
  const data = await resp.json();
  // Extrage date lunare de iradianță
  return parsePVGISClimate(data);
}

/**
 * Calcul producție anuală PV pentru un sistem dat
 */
export async function fetchPVGISProduction(lat, lon, peakPower_kWp, tilt = 35, azimuth = 0) {
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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`PVGIS PV error: ${resp.status}`);
  const data = await resp.json();
  return parsePVGISProduction(data);
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
