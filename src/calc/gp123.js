/**
 * GP 123/2004 — Normativ pentru proiectarea sistemelor fotovoltaice
 * Actualizat cu cerințele ANRE Ord. 11/2023 și EPBD Art.14 Solar-Ready
 *
 * Referințe:
 * - GP 123/2004 — Ghid de proiectare sisteme FV
 * - Ordinul ANRE 11/2023 — Prosumatori
 * - SR EN IEC 62548:2016 — Sisteme FV, cerințe de proiectare
 * - EPBD 2024/1275 Art.14 — Solar-Ready obligatoriu
 */

// ── Iradianță globală orizontală medie anuală [kWh/m²/an] pe zone climatice ──
// Sursa: Atlas solar România (PVGIS)
export const SOLAR_PEAK_HOURS = {
  I:   { h_day: 3.0, h_year: 1095, label: "Zona I (N, Moldovaă)" },
  II:  { h_day: 3.3, h_year: 1205, label: "Zona II (Centru-E)" },
  III: { h_day: 3.5, h_year: 1278, label: "Zona III (Centru-V, Banat)" },
  IV:  { h_day: 3.8, h_year: 1387, label: "Zona IV (Muntenia, Oltenia)" },
  V:   { h_day: 4.2, h_year: 1533, label: "Zona V (Dobrogea, Delta)" },
};

// Factori de corecție unghi de inclinare [°] față de optim 35°
export const TILT_CORRECTION = {
  0:  0.82,  10: 0.90, 15: 0.94, 20: 0.96, 25: 0.98,
  30: 0.99,  35: 1.00, 40: 0.99, 45: 0.97, 50: 0.95,
  60: 0.89,  75: 0.78, 90: 0.64,
};

// Factori de corecție orientare (azimut față de S=0°)
export const AZIMUTH_CORRECTION = {
  S:  1.00, SSE: 0.99, SE: 0.97, ESE: 0.92, E:  0.84,
  NE: 0.65, N:  0.50, NV: 0.65, V:  0.84, SV: 0.97, SSV: 0.99,
};

// Limite acceptabile conform GP 123
export const GP123_LIMITS = {
  tilt_min: 10,   // unghi minim [°] — scurgerea apei ploaie
  tilt_max: 60,   // unghi maxim [°] — risc vânt, umbra proprie
  tilt_optimal: { min: 25, max: 45 },
  azimuth_acceptable: 135,  // max deviere față de S [°]
  azimuth_optimal: 45,      // deviere maximă pentru optim
  inverter_ratio_min: 0.80, // Pinv/Ppv minim
  inverter_ratio_max: 1.15, // Pinv/Ppv maxim (supradim. max 15%)
  dc_cable_loss_max: 0.03,  // pierderi cablu DC max 3%
  ac_cable_loss_max: 0.01,  // pierderi cablu AC max 1%
  mismatch_loss: 0.02,      // pierderi mismatch tipice 2%
  temp_loss_coeff: 0.004,   // [-0.4%/°C] coeficient temperatura
  noct_delta: 25,           // NOCT - Ta [°C], tipic 25°C
  min_ppv_per_m2_au: 0.001, // kWp per m² Au, recomandare minimă
  string_voltage_max: 1000, // tensiune max șir DC [V] STS, 1500V utility
};

/**
 * Calcul pierderi sistem conform GP 123 și SR EN IEC 62548
 */
export function calcSystemLosses({
  tiltDeg = 35,
  azimuthDev = 0,     // deviere față de S în grade
  shadingFactor = 0,  // factor umbrire [0-1], 0 = fără umbrire
  tempAvgC = 12,      // temp medie anuală [°C]
  cableLossDC = 0.02,
  cableLossAC = 0.008,
  soilingFactor = 0.03, // murdar/praf
  mismatchLoss = 0.02,
}) {
  // Pierdere temperatură
  const tempLoss = GP123_LIMITS.temp_loss_coeff * GP123_LIMITS.noct_delta * (1 + tempAvgC / 25) * 0.5;

  const totalLoss = 1 -
    (1 - cableLossDC) *
    (1 - cableLossAC) *
    (1 - soilingFactor) *
    (1 - mismatchLoss) *
    (1 - tempLoss) *
    (1 - shadingFactor);

  return {
    cableLossDC,
    cableLossAC,
    soilingFactor,
    mismatchLoss,
    tempLoss: Math.round(tempLoss * 1000) / 1000,
    shadingFactor,
    totalLoss: Math.round(totalLoss * 1000) / 1000,
    systemEfficiency: Math.round((1 - totalLoss) * 1000) / 1000,
  };
}

/**
 * Calcul producție anuală estimată [kWh/an]
 */
export function calcPVProduction({ ppv_kwp, zone = "III", tiltDeg = 35, azimuthDev = 0, etaInverter = 0.97, losses }) {
  const solar = SOLAR_PEAK_HOURS[zone] || SOLAR_PEAK_HOURS.III;
  const tiltSnap = Object.keys(TILT_CORRECTION).map(Number).reduce((prev, curr) =>
    Math.abs(curr - tiltDeg) < Math.abs(prev - tiltDeg) ? curr : prev);
  const fc_tilt = TILT_CORRECTION[tiltSnap] ?? 0.95;

  // Deviere azimut → factor corecție liniar
  const azDev = Math.min(Math.abs(azimuthDev), 180);
  const fc_azimuth = azDev <= 45 ? 1.00 - azDev / 45 * 0.03
    : azDev <= 90 ? 0.97 - (azDev - 45) / 45 * 0.13
    : 0.84 - (azDev - 90) / 90 * 0.34;

  const sysEff = losses?.systemEfficiency ?? 0.82;
  const E_annual = ppv_kwp * solar.h_year * fc_tilt * fc_azimuth * etaInverter * sysEff;

  return {
    h_year: solar.h_year,
    fc_tilt,
    fc_azimuth,
    etaInverter,
    sysEff,
    E_annual: Math.round(E_annual),
    E_per_kwp: Math.round(E_annual / ppv_kwp),
    specific_yield: Math.round(solar.h_year * fc_tilt * fc_azimuth * etaInverter * sysEff),
  };
}

/**
 * Verificare conformitate GP 123 + ANRE + EPBD
 */
export function checkGP123({
  ppv_kwp = 0,
  ppv_area_m2 = 0,
  tiltDeg = 35,
  azimuthLabel = "S",
  azimuthDev = 0,
  pinv_kw = 0,       // putere invertor [kW]
  etaPanel = 0.20,   // eficiență panou [0-1]
  zone = "III",
  au_m2 = 0,         // suprafață utilă clădire
  qConsum_kwh = 0,   // consum total anual [kWh]
  cableLossDC = 0.02,
  shadingFactor = 0,
  tempAvgC = 10,
  isProsumatora = true,
  hasSolarReady = false,
}) {
  const losses = calcSystemLosses({ tiltDeg, azimuthDev, shadingFactor, tempAvgC, cableLossDC });
  const production = calcPVProduction({ ppv_kwp, zone, tiltDeg, azimuthDev, losses });

  // ── Verificări GP 123 ──────────────────────────────────────────────────────
  const checks = [];

  // 1. Putere minimă recomandată
  const ppv_min_rec = au_m2 * GP123_LIMITS.min_ppv_per_m2_au;
  checks.push({
    id: "ppv_min",
    label: "Putere instalată minimă recomandată",
    norm: `GP 123 §4.2 — min ${ppv_min_rec.toFixed(1)} kWp pentru Au=${au_m2} m²`,
    ok: ppv_kwp >= ppv_min_rec || au_m2 === 0,
    value: ppv_kwp.toFixed(2) + " kWp",
    limit: "≥ " + ppv_min_rec.toFixed(2) + " kWp",
    severity: "info",
  });

  // 2. Unghi de inclinare
  const tiltOk = tiltDeg >= GP123_LIMITS.tilt_min && tiltDeg <= GP123_LIMITS.tilt_max;
  const tiltOptimal = tiltDeg >= GP123_LIMITS.tilt_optimal.min && tiltDeg <= GP123_LIMITS.tilt_optimal.max;
  checks.push({
    id: "tilt",
    label: "Unghi de inclinare",
    norm: "GP 123 §4.3.1 — optim 25–45°, acceptabil 10–60°",
    ok: tiltOk,
    optimal: tiltOptimal,
    value: tiltDeg + "°",
    limit: "25–45° optim",
    severity: tiltOk ? (tiltOptimal ? "ok" : "warn") : "error",
  });

  // 3. Orientare (azimut)
  const azOk = azimuthDev <= GP123_LIMITS.azimuth_acceptable;
  const azOptimal = azimuthDev <= GP123_LIMITS.azimuth_optimal;
  checks.push({
    id: "azimuth",
    label: "Orientare panouri",
    norm: "GP 123 §4.3.2 — S±45° optim, max S±135°",
    ok: azOk,
    optimal: azOptimal,
    value: azimuthLabel + (azimuthDev > 0 ? ` (deviere ${azimuthDev}°)` : ""),
    limit: "S ±45° (optim)",
    severity: azOk ? (azOptimal ? "ok" : "warn") : "error",
  });

  // 4. Raport invertor/panou (clipping ratio)
  const invRatio = pinv_kw > 0 ? pinv_kw / ppv_kwp : null;
  const invOk = invRatio !== null
    ? invRatio >= GP123_LIMITS.inverter_ratio_min && invRatio <= GP123_LIMITS.inverter_ratio_max
    : null;
  checks.push({
    id: "inverter_ratio",
    label: "Raport putere invertor/panou",
    norm: "SR EN IEC 62548 §5.4 — 0.80–1.15",
    ok: invOk,
    value: invRatio !== null ? invRatio.toFixed(2) + " (Pinv/Ppv)" : "N/A",
    limit: "0.80–1.15",
    severity: invRatio === null ? "info" : (invOk ? "ok" : "error"),
  });

  // 5. Eficiență panou
  const etaOk = etaPanel >= 0.15 && etaPanel <= 0.25;
  checks.push({
    id: "panel_eta",
    label: "Eficiență modul fotovoltaic",
    norm: "GP 123 §3.1 — min 15% pentru cristalin",
    ok: etaPanel >= 0.15,
    value: (etaPanel * 100).toFixed(1) + "%",
    limit: "≥ 15%",
    severity: etaOk ? "ok" : (etaPanel < 0.12 ? "error" : "warn"),
  });

  // 6. Factorul de umbrire
  const shadowOk = shadingFactor <= 0.10;
  checks.push({
    id: "shading",
    label: "Factor de umbrire",
    norm: "GP 123 §4.3.3 — max 10% umbrire anuală",
    ok: shadowOk,
    value: (shadingFactor * 100).toFixed(1) + "%",
    limit: "≤ 10%",
    severity: shadowOk ? "ok" : (shadingFactor > 0.20 ? "error" : "warn"),
  });

  // 7. Suprafață panou vs suprafață instalată
  const areaNeeded = ppv_kwp / etaPanel;
  const areaOk = ppv_area_m2 === 0 || Math.abs(ppv_area_m2 - areaNeeded) / areaNeeded < 0.20;
  checks.push({
    id: "area",
    label: "Suprafață instalare necesară",
    norm: "GP 123 §4.4 — Anecesară = Ppv / η_panou",
    ok: areaOk || ppv_area_m2 === 0,
    value: ppv_area_m2 > 0 ? ppv_area_m2.toFixed(1) + " m² instalat" : "N/A",
    limit: "~" + areaNeeded.toFixed(1) + " m² necesar",
    severity: "info",
  });

  // 8. Grad de acoperire consum
  const gda = qConsum_kwh > 0 ? production.E_annual / qConsum_kwh : null;
  const gdaOk = gda !== null ? gda >= 0.20 : null;
  checks.push({
    id: "coverage",
    label: "Grad de acoperire consum",
    norm: "Legea 238/2024 Art.6 — min 10% RER on-site recomandat",
    ok: gdaOk ?? true,
    value: gda !== null ? (gda * 100).toFixed(1) + "%" : "N/A",
    limit: "≥ 20% recomandat",
    severity: gda === null ? "info" : (gda >= 0.20 ? "ok" : (gda >= 0.10 ? "warn" : "error")),
  });

  // 9. Prosumator ANRE
  checks.push({
    id: "prosumator",
    label: "Înregistrare prosumator ANRE",
    norm: "Ord. ANRE 11/2023 — obligatoriu pentru Ppv > 1 kWp",
    ok: isProsumatora || ppv_kwp <= 1,
    value: isProsumatora ? "Da" : (ppv_kwp <= 1 ? "N/A (sub 1 kWp)" : "Nu"),
    limit: "Obligatoriu dacă Ppv > 1 kWp",
    severity: (isProsumatora || ppv_kwp <= 1) ? "ok" : "warn",
  });

  // 10. Solar-Ready (EPBD Art.14)
  checks.push({
    id: "solar_ready",
    label: "Pregătire Solar-Ready EPBD Art.14",
    norm: "EPBD 2024/1275 Art.14 — obligatoriu pentru clădiri noi/renovate major",
    ok: hasSolarReady,
    value: hasSolarReady ? "Conformă" : "Neconformă",
    limit: "Infrastructură pre-cablată",
    severity: hasSolarReady ? "ok" : "warn",
  });

  const nrErrors = checks.filter(c => c.severity === "error").length;
  const nrWarnings = checks.filter(c => c.severity === "warn").length;
  const nrOk = checks.filter(c => c.severity === "ok").length;

  return {
    checks,
    losses,
    production,
    nrErrors,
    nrWarnings,
    nrOk,
    conformant: nrErrors === 0,
    gda,
    areaNeeded,
    invRatio,
  };
}
