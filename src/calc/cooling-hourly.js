// ═══════════════════════════════════════════════════════════════
// CALCUL SARCINĂ FRIGORIFICĂ ORARĂ — SR EN ISO 52016-1:2017/NA:2023 simplificat
// Metodă hibridă: ISO 52016-1 §6.5 (transfer termic) +
//                 CIBSE Guide A cap.5 (câștiguri solare pe orientări)
// Orientări: N, NE, E, SE, S, SV, V, NV, Orizontal
// ═══════════════════════════════════════════════════════════════

// ---------------------------------------------------------------
// DATE INTERNE DE REFERINȚĂ — Câștiguri interne per destinație
// ---------------------------------------------------------------

/**
 * Câștiguri interne de răcire [W/m²] per destinație de utilizare.
 * Valori conform CIBSE Guide A Tabel 6.3 și NP 048 RO.
 * Includ: persoane (sensibil + latent), echipamente, iluminat.
 */
export const COOLING_INTERNAL_GAINS = {
  office: {
    label:         "Birouri",
    people_W_m2:   8,     // 1 pers/10 m², 80 W sensibil/persoană
    equipment_W_m2: 15,   // calculatoare + ecrane
    lighting_W_m2:  12,
    total_W_m2:    35,
    occupancy_h:   [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0], // profil orar 0-23
  },
  retail: {
    label:         "Comerț / retail",
    people_W_m2:   12,    // densitate mare vizitatori
    equipment_W_m2: 8,    // case de marcat, frigidere
    lighting_W_m2:  20,   // iluminat comercial intens
    total_W_m2:    40,
    occupancy_h:   [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  },
  residential: {
    label:         "Rezidențial",
    people_W_m2:   4,     // 2-4 pers în apartament tipic
    equipment_W_m2: 5,    // TV, electronice casnice
    lighting_W_m2:  6,
    total_W_m2:    15,
    occupancy_h:   [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
  },
  school: {
    label:         "Școală / educație",
    people_W_m2:   20,    // 30-40 elevi/clasă, densitate mare
    equipment_W_m2: 5,
    lighting_W_m2:  10,
    total_W_m2:    35,
    occupancy_h:   [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  },
  hospital: {
    label:         "Spital / sănătate",
    people_W_m2:   10,    // pacienți + personal + echipamente medicale
    equipment_W_m2: 25,   // echipamente medicale cu disipare mare
    lighting_W_m2:  15,
    total_W_m2:    50,
    occupancy_h:   [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 24/24
  },
};

// ---------------------------------------------------------------
// DATE CLIMATICE IMPLICITE — Radiație solară per orientare [kWh/m²/lună]
// Valori pentru România (lat ≈ 45.5°N), conform PVGIS / SR 1907-2:2014
// ---------------------------------------------------------------

/**
 * Radiație solară globală pe plan vertical per orientare [kWh/m²/lună].
 * Sursa: PVGIS 5.2, Irr PVGIS-ERA5, București 44.4°N 26.1°E.
 * Indexuri luni: 0=Ian, 1=Feb, ..., 11=Dec
 */
const SOLAR_IRRADIANCE = {
  N:         [  8,  12,  24,  38,  50,  55,  53,  40,  25,  14,   7,   6],
  NE:        [  9,  16,  33,  52,  70,  76,  73,  56,  34,  18,   8,   7],
  E:         [ 22,  40,  71,  93, 112, 118, 114,  97,  74,  46,  22,  17],
  SE:        [ 45,  72, 103, 110, 116, 116, 114, 108,  98,  74,  45,  37],
  S:         [ 62,  92, 113, 104,  98,  92,  94, 107, 114,  95,  62,  53],
  SV:        [ 46,  72, 104, 110, 116, 116, 114, 108,  99,  75,  45,  38],
  V:         [ 22,  40,  71,  93, 113, 118, 115,  97,  75,  47,  22,  17],
  NV:        [  9,  16,  33,  52,  70,  76,  73,  56,  34,  18,   8,   7],
  Orizontal: [ 30,  54, 105, 147, 177, 190, 186, 162, 118,  73,  34,  25],
};

/** Număr de zile per lună */
const DAYS_PER_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

/** Denumiri luni în română */
const MONTH_NAMES = [
  "Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie",
  "Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"
];

/**
 * Temperaturi exterioare medii lunare [°C] — valori implicite România (medie națională).
 * Conform SR 1907-2:2014 și date INMH.
 */
const TEMP_EXT_DEFAULT = [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1];

/**
 * Factori de umbrire sezonieri per orientare.
 * Sud: protecție naturală mai mare vara (cornișe, unghi solar înalt).
 * Est/Vest: expunere maximă dimineața/seara.
 * Valorile reprezintă fracția din radiație care trece prin umbrir extern.
 */
const SEASONAL_SHADING = {
  //              Ian  Feb  Mar  Apr  Mai  Iun  Iul  Aug  Sep  Oct  Nov  Dec
  N:         [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  NE:        [1.0, 1.0, 0.9, 0.85,0.85,0.85,0.85,0.85,0.9, 1.0, 1.0, 1.0],
  E:         [1.0, 1.0, 0.9, 0.85,0.80,0.80,0.80,0.80,0.85,0.9, 1.0, 1.0],
  SE:        [1.0, 0.95,0.85,0.75,0.70,0.65,0.65,0.70,0.80,0.90,1.0, 1.0],
  S:         [1.0, 0.90,0.75,0.60,0.50,0.45,0.45,0.55,0.65,0.85,1.0, 1.0],
  SV:        [1.0, 0.95,0.85,0.75,0.70,0.65,0.65,0.70,0.80,0.90,1.0, 1.0],
  V:         [1.0, 1.0, 0.9, 0.85,0.80,0.80,0.80,0.80,0.85,0.9, 1.0, 1.0],
  NV:        [1.0, 1.0, 0.9, 0.85,0.85,0.85,0.85,0.85,0.9, 1.0, 1.0, 1.0],
  Orizontal: [1.0, 0.95,0.85,0.75,0.70,0.65,0.65,0.70,0.80,0.90,0.95,1.0],
};

/**
 * Profil orar solar — distribuție câștigului solar în cursul zilei per orientare.
 * Indexuri 0-23; valorile sunt ponderi relative (suma = 1.0).
 * Bazat pe curba solară la lat 45°N (simplificat).
 */
const SOLAR_HOURLY_PROFILE = {
  E:    [0,0,0,0,0,0.02,0.08,0.14,0.17,0.16,0.13,0.10,0.08,0.06,0.04,0.02,0,0,0,0,0,0,0,0],
  SE:   [0,0,0,0,0,0.01,0.05,0.10,0.14,0.16,0.16,0.14,0.11,0.08,0.05,0,0,0,0,0,0,0,0,0],
  S:    [0,0,0,0,0,0,0.02,0.06,0.10,0.14,0.16,0.17,0.16,0.14,0.10,0.05,0,0,0,0,0,0,0,0],
  SV:   [0,0,0,0,0,0,0,0.02,0.06,0.10,0.14,0.16,0.17,0.16,0.14,0.10,0.05,0,0,0,0,0,0,0],
  V:    [0,0,0,0,0,0,0,0.01,0.02,0.04,0.07,0.10,0.14,0.17,0.17,0.14,0.08,0.04,0.02,0,0,0,0,0],
  NV:   [0,0,0,0,0,0,0,0,0.01,0.02,0.04,0.07,0.10,0.14,0.17,0.17,0.14,0.08,0.04,0.03,0.02,0,0,0],
  N:    [0,0,0,0,0,0.02,0.05,0.08,0.10,0.10,0.10,0.10,0.10,0.10,0.08,0.07,0.05,0.03,0.02,0,0,0,0,0],
  NE:   [0,0,0,0,0,0.03,0.08,0.13,0.16,0.14,0.12,0.10,0.09,0.07,0.04,0.02,0.02,0,0,0,0,0,0,0],
  Orizontal: [0,0,0,0,0,0.01,0.05,0.09,0.12,0.14,0.15,0.15,0.14,0.10,0.07,0.04,0.02,0.01,0.01,0,0,0,0,0],
};

// Normalizare profil solar (asigurare sumă = 1.0)
Object.keys(SOLAR_HOURLY_PROFILE).forEach(orient => {
  const prof = SOLAR_HOURLY_PROFILE[orient];
  const sum = prof.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let h = 0; h < 24; h++) prof[h] = prof[h] / sum;
  }
});

// ---------------------------------------------------------------
// FUNCȚIE PRINCIPALĂ — calcCoolingHourly
// ---------------------------------------------------------------

/**
 * Calculează sarcina frigorifică orară detaliată per orientare.
 * Metodă: ISO 52016-1 simplificat (transfer termic anvelopă) +
 *         CIBSE Guide A (câștiguri solare detaliate per orientare).
 *
 * @param {object} params
 * @param {number} params.Au                - Arie utilă [m²]
 * @param {number} params.V                 - Volum interior [m³]
 * @param {Array}  params.glazingElements   - Elemente vitrate: [{ area, orientation, g, u, shadingCoeff }]
 * @param {Array}  params.opaqueElements    - Elemente opace: [{ area, type, u }]
 * @param {object} params.climate           - { temp_month, lat, lon, zone }
 * @param {number} params.theta_int_cool    - Setpoint răcire [°C], implicit 26
 * @param {number} params.occupancy         - Persoane/m²
 * @param {string} params.internalGainsType - "office"|"residential"|"retail"|"school"|"hospital"
 * @param {number} params.shadingExternal   - Factor umbire externă globală 0-1 (0=umbrit total)
 * @returns {object} Sarcina frigorifică detaliată
 */
export function calcCoolingHourly({
  Au                = 100,
  V                 = 250,
  glazingElements   = [],
  opaqueElements    = [],
  climate           = {},
  theta_int_cool    = 26,
  occupancy         = 0.1,
  internalGainsType = "office",
  shadingExternal   = 0.7,
} = {}) {

  // ── Validare și valori implicite ─────────────────────────────────────
  const temp_month = (climate.temp_month && climate.temp_month.length === 12)
    ? climate.temp_month
    : TEMP_EXT_DEFAULT;

  const gainProfile = COOLING_INTERNAL_GAINS[internalGainsType]
    || COOLING_INTERNAL_GAINS.office;

  // Câștiguri interne [W] — total pentru spațiu
  const Q_int_W = gainProfile.total_W_m2 * Au;

  // ── Coeficient global de transfer termic H_tr [W/K] ─────────────────
  // Calculat din elementele opace + vitrate
  let H_tr = 0;

  // Elemente opace (pereți, acoperiș, planșeu)
  (opaqueElements || []).forEach(el => {
    if (el.area > 0 && el.u > 0) H_tr += el.area * el.u;
  });

  // Elemente vitrate
  (glazingElements || []).forEach(el => {
    if (el.area > 0 && el.u > 0) H_tr += el.area * el.u;
  });

  // Fallback: H_tr estimat din Au (clădire medie renovată ~0.8 W/m²K anvelopă)
  if (H_tr === 0 && Au > 0) {
    H_tr = Au * 0.8;
  }

  // ── Coeficient de ventilare H_ve [W/K] ──────────────────────────────
  // ACH implicit: 0.5 vol/h (ventilare naturală minimă)
  const ACH = (climate.zone === "rece" || climate.zone === "I") ? 0.4 : 0.5;
  const H_ve = (V * ACH * 1.2 * 1005) / 3600; // [W/K]

  // ── Calcul lunar ─────────────────────────────────────────────────────
  const monthly = [];
  let Q_annual_kWh   = 0;
  let peak_kW        = 0;
  let peak_month     = 0;
  let peak_hour      = 14; // implicit ora 14 (valoare de start)

  // Distribuție structurală (acumulare ponderată)
  let sum_solar      = 0;
  let sum_internal   = 0;
  let sum_trans      = 0;
  let sum_vent       = 0;

  // Sarcini per orientare [kWh/an]
  const byOrientationMap = {};

  for (let m = 0; m < 12; m++) {
    const T_e_mean = temp_month[m];
    const days     = DAYS_PER_MONTH[m];
    const hours    = days * 24;

    // ── Câștiguri solare per lună [kWh] ─────────────────────────────
    let Q_solar_month_kWh = 0;

    (glazingElements || []).forEach(el => {
      const orient = normalizeOrientation(el.orientation);
      const irr    = (SOLAR_IRRADIANCE[orient] || SOLAR_IRRADIANCE.S)[m]; // kWh/m²/lună
      const g      = el.g || 0.6;                   // factor solar câștig vitraj
      const sc     = el.shadingCoeff != null ? el.shadingCoeff : 1.0; // umbrir extern element
      const seas   = (SEASONAL_SHADING[orient] || SEASONAL_SHADING.S)[m]; // umbrir sezonier
      const shadow = shadingExternal * sc * seas;    // factor combinat umbrir

      const Q_sol_el = el.area * g * irr * shadow;  // kWh/lună pentru element
      Q_solar_month_kWh += Q_sol_el;

      // Acumulare per orientare
      if (!byOrientationMap[orient]) {
        byOrientationMap[orient] = { area_m2: 0, Q_total_kWh: 0, peak_W: 0 };
      }
      byOrientationMap[orient].area_m2 += el.area;
      byOrientationMap[orient].Q_total_kWh += Q_sol_el;
    });

    // ── Câștiguri interne per lună [kWh] ────────────────────────────
    // Profil orar de ocupare × câștig total
    const avgOccupancyFactor = gainProfile.occupancy_h.reduce((a, b) => a + b, 0) / 24;
    const Q_internal_month_kWh = (Q_int_W * avgOccupancyFactor * hours) / 1000;

    // ── Transfer termic per lună [kWh] ───────────────────────────────
    // Răcire activă doar când T_e > theta_int_cool (contribuție transmisie pozitivă)
    const delta_T_trans = T_e_mean - theta_int_cool;
    const Q_trans_month_kWh = delta_T_trans > 0
      ? (H_tr * delta_T_trans * hours) / 1000
      : 0;

    // Componenta de ventilare
    const Q_vent_month_kWh = delta_T_trans > 0
      ? (H_ve * delta_T_trans * hours) / 1000
      : 0;

    // ── Sarcina totală de răcire per lună [kWh] ─────────────────────
    const Q_total_month_kWh = Math.max(0,
      Q_solar_month_kWh + Q_internal_month_kWh + Q_trans_month_kWh + Q_vent_month_kWh
    );

    // ── Zile-grad de răcire (Cooling Degree Days, bază 18°C) ────────
    const CDD = Math.max(0, (T_e_mean - 18) * days);

    monthly.push({
      month:              MONTH_NAMES[m],
      month_idx:          m + 1,
      Q_solar_kWh:        Math.round(Q_solar_month_kWh * 10) / 10,
      Q_internal_kWh:     Math.round(Q_internal_month_kWh * 10) / 10,
      Q_transmission_kWh: Math.round(Q_trans_month_kWh * 10) / 10,
      Q_ventilation_kWh:  Math.round(Q_vent_month_kWh * 10) / 10,
      Q_total_kWh:        Math.round(Q_total_month_kWh * 10) / 10,
      CDD:                Math.round(CDD),
    });

    Q_annual_kWh += Q_total_month_kWh;

    // Acumulare pentru structura sarcinii
    sum_solar    += Q_solar_month_kWh;
    sum_internal += Q_internal_month_kWh;
    sum_trans    += Q_trans_month_kWh;
    sum_vent     += Q_vent_month_kWh;

    // ── Sarcina de vârf [kW] — estimată din luna de vârf ────────────
    // Metodă: sarcina orară maximă în ziua de design (T_e = T_e_max + 5°C)
    const T_e_design = T_e_mean + 5; // temperatură de calcul design (mai conservatoare)
    const Q_peak_h   = calcPeakHour({
      T_e_design, theta_int_cool,
      H_tr, H_ve,
      Q_int_W, gainProfile,
      glazingElements, m, shadingExternal,
    });

    if (Q_peak_h.peak_kW > peak_kW) {
      peak_kW    = Q_peak_h.peak_kW;
      peak_month = m + 1;
      peak_hour  = Q_peak_h.peak_hour;
    }
  }

  // ── Sarcina de vârf per orientare ────────────────────────────────────
  const totalOrientQ = Object.values(byOrientationMap)
    .reduce((s, o) => s + o.Q_total_kWh, 0);

  const byOrientation = Object.entries(byOrientationMap).map(([orient, data]) => ({
    orientation:      orient,
    area_m2:          Math.round(data.area_m2 * 10) / 10,
    peak_W:           Au > 0
      ? Math.round(peak_kW * 1000 * (data.Q_total_kWh / Math.max(totalOrientQ, 1)))
      : 0,
    contribution_pct: totalOrientQ > 0
      ? Math.round(data.Q_total_kWh / totalOrientQ * 1000) / 10
      : 0,
  }));

  // ── Structura sarcinii [%] ────────────────────────────────────────────
  const totalSum = sum_solar + sum_internal + sum_trans + sum_vent;
  const pct = (v) => totalSum > 0 ? Math.round(v / totalSum * 1000) / 10 : 0;

  const breakdown = {
    solar_pct:          pct(sum_solar),
    internal_pct:       pct(sum_internal),
    transmission_pct:   pct(sum_trans),
    ventilation_pct:    pct(sum_vent),
  };

  // ── Recomandări automate ──────────────────────────────────────────────
  const recommendations = generateRecommendations({
    breakdown, byOrientation, peak_kW, Au,
    glazingElements, shadingExternal,
  });

  return {
    peak_kW:      Math.round(peak_kW * 100) / 100,
    peak_kW_m2:   Au > 0 ? Math.round(peak_kW * 1000 / Au * 10) / 10 : 0,
    peak_month,
    peak_hour,
    monthly,
    Q_annual_kWh: Math.round(Q_annual_kWh),
    breakdown,
    byOrientation,
    recommendations,
    meta: {
      method:       "ISO 52016-1 simplificat + CIBSE Guide A",
      theta_setpoint: theta_int_cool,
      H_tr_W_K:     Math.round(H_tr * 10) / 10,
      H_ve_W_K:     Math.round(H_ve * 10) / 10,
      internalGainsType,
    },
  };
}

// ---------------------------------------------------------------
// FUNCȚII AUXILIARE
// ---------------------------------------------------------------

/**
 * Normalizează denumirea orientării la una din cheile standard.
 * Acceptă: "S", "Sud", "south", "SE", "Sud-Est" etc.
 */
function normalizeOrientation(raw) {
  if (!raw) return "S";
  const upper = String(raw).toUpperCase().replace(/[-_\s]/g, "");
  const MAP = {
    "N": "N", "NORD": "N", "NORTH": "N",
    "NE": "NE", "NORDEST": "NE", "NORTHEAST": "NE",
    "E": "E", "EST": "E", "EAST": "E",
    "SE": "SE", "SUDEST": "SE", "SOUTHEAST": "SE",
    "S": "S", "SUD": "S", "SOUTH": "S",
    "SV": "SV", "SUDVEST": "SV", "SW": "SV", "SOUTHWEST": "SV",
    "V": "V", "VEST": "V", "W": "V", "WEST": "V",
    "NV": "NV", "NORDVEST": "NV", "NW": "NV", "NORTHWEST": "NV",
    "ORIZONTAL": "Orizontal", "HORIZONTAL": "Orizontal", "H": "Orizontal",
  };
  return MAP[upper] || "S";
}

/**
 * Calculează sarcina de vârf orară pentru o lună dată.
 * Returnează peak_kW și peak_hour (0-23).
 *
 * @param {object} p - Parametri de calcul
 * @returns {{ peak_kW: number, peak_hour: number }}
 */
function calcPeakHour(p) {
  const {
    T_e_design, theta_int_cool,
    H_tr, H_ve,
    Q_int_W, gainProfile,
    glazingElements, m, shadingExternal,
  } = p;

  let peak_kW   = 0;
  let peak_hour = 14;

  for (let h = 0; h < 24; h++) {
    // Câștig intern orar [W]
    const occFactor = gainProfile.occupancy_h[h] || 0;
    const Q_int_h   = Q_int_W * occFactor;

    // Câștig solar orar [W] per toate elementele vitrate
    let Q_sol_h = 0;
    (glazingElements || []).forEach(el => {
      const orient  = normalizeOrientation(el.orientation);
      const profile = SOLAR_HOURLY_PROFILE[orient] || SOLAR_HOURLY_PROFILE.S;
      const irr_mo  = (SOLAR_IRRADIANCE[orient] || SOLAR_IRRADIANCE.S)[m]; // kWh/m²/lună
      const days    = DAYS_PER_MONTH[m];
      const irr_h   = irr_mo * 1000 / (days * 24); // W/m² medie orară lunară
      const g       = el.g || 0.6;
      const sc      = el.shadingCoeff != null ? el.shadingCoeff : 1.0;
      const seas    = (SEASONAL_SHADING[orient] || SEASONAL_SHADING.S)[m];
      const shadow  = shadingExternal * sc * seas;
      // Distribuție orară prin profil
      Q_sol_h += el.area * g * irr_h * shadow * profile[h] * 24; // [W]
    });

    // Transfer termic prin anvelopă [W]
    const Q_tr_h = Math.max(0, (H_tr + H_ve) * (T_e_design - theta_int_cool));

    // Sarcina frigorifică orară [kW]
    const Q_h_kW = (Q_int_h + Q_sol_h + Q_tr_h) / 1000;

    if (Q_h_kW > peak_kW) {
      peak_kW   = Q_h_kW;
      peak_hour = h;
    }
  }

  return { peak_kW: Math.round(peak_kW * 100) / 100, peak_hour };
}

/**
 * Generează recomandări de reducere a sarcinii frigorifice
 * pe baza structurii sarcinii și a caracteristicilor clădirii.
 *
 * @param {object} p
 * @returns {string[]} Lista de recomandări
 */
function generateRecommendations({ breakdown, byOrientation, peak_kW, Au, glazingElements, shadingExternal }) {
  const recs = [];
  const density_W_m2 = Au > 0 ? (peak_kW * 1000 / Au) : 0;

  // Recomandări bazate pe structura sarcinii
  if (breakdown.solar_pct > 40) {
    recs.push(
      "Câștigurile solare reprezintă >" + breakdown.solar_pct + "% din sarcina frigorifică — " +
      "se recomandă protecție solară externă (jaluzele, brise-soleil, markize)."
    );
  }

  if (breakdown.solar_pct > 30) {
    // Verifică orientările cu contribuție mare
    const highSolarOrients = byOrientation
      .filter(o => o.contribution_pct > 25)
      .map(o => o.orientation);
    if (highSolarOrients.length > 0) {
      recs.push(
        "Orientările " + highSolarOrients.join(", ") + " au contribuție solară ridicată. " +
        "Se recomandă geamuri cu factor g ≤ 0.35 sau umbrire externă reglabilă."
      );
    }
  }

  if (breakdown.internal_pct > 35) {
    recs.push(
      "Câștigurile interne ridicate (" + breakdown.internal_pct + "%) — " +
      "se recomandă iluminat LED eficient (≤8 W/m²) și echipamente cu disipare redusă."
    );
  }

  if (breakdown.ventilation_pct > 20) {
    recs.push(
      "Componenta de ventilare semnificativă (" + breakdown.ventilation_pct + "%) — " +
      "se recomandă free-cooling nocturn și sisteme VMC cu bypass de vară."
    );
  }

  // Recomandare bazată pe densitatea sarcinii
  if (density_W_m2 > 100) {
    recs.push(
      "Densitate sarcină ridicată (" + Math.round(density_W_m2) + " W/m²) — " +
      "se recomandă verificarea dimensionării sistemului de răcire și audit termic."
    );
  } else if (density_W_m2 > 60) {
    recs.push(
      "Densitate sarcină moderată (" + Math.round(density_W_m2) + " W/m²) — " +
      "soluție răcire optimă: pompe de căldură reversibile sau chiller eficient."
    );
  }

  // Recomandare umbrir
  if (shadingExternal > 0.8) {
    recs.push(
      "Factorul de umbrir extern este redus (Fsh=" + shadingExternal + "). " +
      "Instalarea de umbriri externe reglabile poate reduce sarcina solară cu 30-50%."
    );
  }

  // Recomandare masă termică
  recs.push(
    "Masa termică ridicată a pereților și planșeelor reduce vârful de sarcină zilnic cu 15-25%. " +
    "Se recomandă evitarea finisajelor ușoare pe structuri grele."
  );

  // Orientare favorabilă acoperiș
  const hasHorizontal = (glazingElements || []).some(el =>
    normalizeOrientation(el.orientation) === "Orizontal"
  );
  if (hasHorizontal) {
    recs.push(
      "Suprafețe vitrate orizontale (luminatoare) au câștig solar maxim vara — " +
      "se recomandă protecție solară internă reflectorizantă sau geam electrocromo."
    );
  }

  return recs;
}
