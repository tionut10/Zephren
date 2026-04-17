// ═══════════════════════════════════════════════════════════════════════════
// EN 16798-1:2019 — Energy performance of buildings — Ventilation & IAQ
// Module: calcul calitate aer interior, categorii confort, debite ventilare.
// Referință: EN 16798-1:2019 Annex B, tabelele B.1, B.2, B.3, B.4, B.5, B.6
// Transpunere naționala: standard român SR EN 16798-1:2020
//
// @roadmap Sprint 2 Ventilație (AUDIT_10 §8.2 #7,#8): integrare IDA categories în UI Step3
// @status ORPHAN (parțial) — momentan folosit în teste + Step8Advanced; auto-completare debit
//         pe baza categoriei IDA urmează în Sprint 2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tabel B.1 — Categorii concentrație CO₂ interior deasupra concentrației ext.
 * Δ = CO₂_int − CO₂_ext (concentrații în ppm)
 */
export const CO2_CATEGORIES = {
  I:   { deltaMax: 550,  label: "Excelent (categoria I)",     description: "Performanță înaltă, sensibilitate ridicată" },
  II:  { deltaMax: 800,  label: "Normal (categoria II)",      description: "Normal pentru clădiri noi/renovate" },
  III: { deltaMax: 1350, label: "Acceptabil (categoria III)", description: "Acceptabil pentru clădiri existente" },
  IV:  { deltaMax: Infinity, label: "Sub standard (categoria IV)", description: "Nu îndeplinește minim EN 16798" },
};

/**
 * Tabel B.2 — Debite de aer pentru categorii non-rezidențial
 * l/s per persoană + l/s per m² (pentru emisii low-polluting building)
 */
export const AIR_RATES_NONRES = {
  // Cat: { perPerson (l/s/pers), perArea (l/s/m²) }
  I:   { perPerson: 10.0, perArea: 1.0, totalBase: 20.0 },
  II:  { perPerson: 7.0,  perArea: 0.7, totalBase: 14.0 },
  III: { perPerson: 4.0,  perArea: 0.4, totalBase: 8.0 },
  IV:  { perPerson: 2.5,  perArea: 0.25, totalBase: 5.0 },
};

/**
 * Tabel B.3 — Debite pentru rezidențial (per dwelling unit)
 * l/s total minim + l/s per persoană
 */
export const AIR_RATES_RES = {
  I:   { totalMin_L_s: 0.49, perPerson_L_s: 7.0, perArea_L_s_m2: 0.49 },
  II:  { totalMin_L_s: 0.42, perPerson_L_s: 5.0, perArea_L_s_m2: 0.42 },
  III: { totalMin_L_s: 0.35, perPerson_L_s: 4.0, perArea_L_s_m2: 0.35 },
  IV:  { totalMin_L_s: 0.23, perPerson_L_s: 2.5, perArea_L_s_m2: 0.23 },
};

/**
 * Tabel B.4 — Temperaturi operaționale confort (iarnă/vară)
 */
export const OPERATIVE_TEMP = {
  I:   { winterMin: 21.0, winterMax: 25.0, summerMin: 23.5, summerMax: 25.5 },
  II:  { winterMin: 20.0, winterMax: 25.0, summerMin: 23.0, summerMax: 26.0 },
  III: { winterMin: 19.0, winterMax: 25.0, summerMin: 22.0, summerMax: 27.0 },
  IV:  { winterMin: 17.0, winterMax: 25.0, summerMin: 21.0, summerMax: 28.0 },
};

/**
 * Tabel B.5 — Umiditate relativă confort (în %)
 * Implicit pentru toate categoriile: 25..60% (vară), 25..60% (iarnă).
 * Categoria I are range mai strâns pe recomandări.
 */
export const HUMIDITY_RANGE = {
  I:   { rhMin: 30, rhMax: 50 },
  II:  { rhMin: 25, rhMax: 60 },
  III: { rhMin: 20, rhMax: 70 },
  IV:  { rhMin: 15, rhMax: 75 },
};

/**
 * Tabel B.6 — PMV / PPD pentru confort termic (EN ISO 7730 + EN 16798 sync)
 */
export const PMV_PPD_LIMITS = {
  I:   { pmvMin: -0.2, pmvMax: 0.2, ppdMax: 6 },
  II:  { pmvMin: -0.5, pmvMax: 0.5, ppdMax: 10 },
  III: { pmvMin: -0.7, pmvMax: 0.7, ppdMax: 15 },
  IV:  { pmvMin: -1.0, pmvMax: 1.0, ppdMax: 25 },
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. calcIAQCategory — determină categoria IAQ din CO₂
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @param {number} co2Interior - ppm (interior)
 * @param {number} co2Exterior - ppm (ambient, tipic 400–450 ppm)
 * @returns {{category: string, delta: number, description: string}}
 */
export function calcIAQCategory(co2Interior, co2Exterior = 420) {
  if (!isFinite(co2Interior) || co2Interior <= 0) {
    return { category: "IV", delta: 0, description: "Date CO₂ invalide" };
  }
  const delta = co2Interior - co2Exterior;
  for (const cat of ["I", "II", "III", "IV"]) {
    if (delta <= CO2_CATEGORIES[cat].deltaMax) {
      return { category: cat, delta, description: CO2_CATEGORIES[cat].label };
    }
  }
  return { category: "IV", delta, description: CO2_CATEGORIES.IV.label };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. calcRequiredAirflowEN16798 — debit ventilare necesar
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Calculează debit total aer proaspăt conform EN 16798-1 Table B.2/B.3.
 *
 * @param {object} params
 * @param {string} params.category - 'I' | 'II' | 'III' | 'IV'
 * @param {string} params.buildingType - 'residential' | 'nonresidential'
 * @param {number} params.areaUseful_m2 - suprafața utilă
 * @param {number} params.nOccupants - număr ocupanți design
 * @param {boolean} [params.lowPolluting=true] - emisii scăzute (materiale certificate)
 * @returns {{airflow_L_s: number, airflow_m3_h: number, ach: number, byPerson: number, byArea: number}}
 */
export function calcRequiredAirflowEN16798({ category = "II", buildingType = "residential",
                                              areaUseful_m2, nOccupants, lowPolluting = true }) {
  const Au = parseFloat(areaUseful_m2) || 0;
  const nOcc = parseFloat(nOccupants) || 0;

  let airflow_L_s = 0;
  let byPerson = 0;
  let byArea = 0;

  if (buildingType === "residential") {
    const rates = AIR_RATES_RES[category] || AIR_RATES_RES.II;
    byPerson = rates.perPerson_L_s * nOcc;
    byArea = rates.perArea_L_s_m2 * Au;
    airflow_L_s = Math.max(byPerson + byArea, rates.totalMin_L_s * Au);
  } else {
    const rates = AIR_RATES_NONRES[category] || AIR_RATES_NONRES.II;
    byPerson = rates.perPerson * nOcc;
    byArea = rates.perArea * Au;
    // Non-residential: dacă materiale emisii scăzute, folosim base. Altfel *1.5
    const factor = lowPolluting ? 1.0 : 1.5;
    airflow_L_s = (byPerson + byArea) * factor;
  }

  const airflow_m3_h = airflow_L_s * 3.6; // L/s → m³/h
  const volume_m3 = Au * 2.7; // înălțime medie 2.7 m (estimare)
  const ach = volume_m3 > 0 ? airflow_m3_h / volume_m3 : 0;

  return {
    airflow_L_s: Math.round(airflow_L_s * 10) / 10,
    airflow_m3_h: Math.round(airflow_m3_h * 10) / 10,
    ach: Math.round(ach * 100) / 100,
    byPerson: Math.round(byPerson * 10) / 10,
    byArea: Math.round(byArea * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. calcThermalComfortCategory — verifică PMV/PPD
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @param {number} pmv - Predicted Mean Vote (-3..+3)
 * @param {number} ppd - Predicted Percentage Dissatisfied (0..100)
 * @returns {{category: string, pmvOk: boolean, ppdOk: boolean, recommendation: string}}
 */
export function calcThermalComfortCategory(pmv, ppd) {
  if (!isFinite(pmv) || !isFinite(ppd)) {
    return { category: "IV", pmvOk: false, ppdOk: false, recommendation: "Date PMV/PPD lipsă" };
  }
  for (const cat of ["I", "II", "III", "IV"]) {
    const lim = PMV_PPD_LIMITS[cat];
    const pmvOk = pmv >= lim.pmvMin && pmv <= lim.pmvMax;
    const ppdOk = ppd <= lim.ppdMax;
    if (pmvOk && ppdOk) {
      return {
        category: cat, pmvOk, ppdOk,
        recommendation: `Confort termic în categoria ${cat} (PMV ∈ [${lim.pmvMin}, ${lim.pmvMax}], PPD ≤ ${lim.ppdMax}%)`,
      };
    }
  }
  return {
    category: "IV", pmvOk: false, ppdOk: false,
    recommendation: "Confort termic sub standardul EN 16798-1 (necesită intervenție HVAC)",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. calcHumidityComfort — verifică umiditate relativă
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @param {number} rh - RH actual (%)
 * @param {string} category - 'I' | 'II' | 'III' | 'IV'
 * @returns {{ok: boolean, range: object, recommendation: string}}
 */
export function calcHumidityComfort(rh, category = "II") {
  const range = HUMIDITY_RANGE[category] || HUMIDITY_RANGE.II;
  if (!isFinite(rh)) return { ok: false, range, recommendation: "Date umiditate lipsă" };
  const ok = rh >= range.rhMin && rh <= range.rhMax;
  let rec = "";
  if (!ok) {
    if (rh < range.rhMin) rec = `RH = ${rh}% — prea uscat. Instalare umidificator pentru cat. ${category} (${range.rhMin}..${range.rhMax}%).`;
    else rec = `RH = ${rh}% — prea umed. Ventilare suplimentară / dezumidificare (${range.rhMin}..${range.rhMax}%).`;
  } else {
    rec = `RH = ${rh}% — în range confort cat. ${category}.`;
  }
  return { ok, range, recommendation: rec };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. calcOverallIEQCategory — cel mai slab subsistem determină categoria IEQ
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Combinare IAQ + confort termic + umiditate pentru categorie globală IEQ.
 * Principiul EN 16798-1: IEQ = min(all subsystems).
 *
 * @param {object} params
 * @param {string} params.iaqCategory - rezultat calcIAQCategory.category
 * @param {string} params.thermalCategory - rezultat calcThermalComfortCategory.category
 * @param {boolean} [params.humidityOk=true] - din calcHumidityComfort
 * @param {string} [params.humidityCategory="II"]
 * @returns {{category: string, breakdown: object, overallScore: number}}
 */
export function calcOverallIEQCategory({ iaqCategory, thermalCategory, humidityOk = true, humidityCategory = "II" }) {
  const catRank = { I: 1, II: 2, III: 3, IV: 4 };
  const catByRank = { 1: "I", 2: "II", 3: "III", 4: "IV" };

  const ranks = [];
  if (iaqCategory) ranks.push(catRank[iaqCategory]);
  if (thermalCategory) ranks.push(catRank[thermalCategory]);
  if (humidityCategory && humidityOk) ranks.push(catRank[humidityCategory]);
  if (humidityCategory && !humidityOk) ranks.push(4); // umiditate fail → cat IV

  const worstRank = ranks.length > 0 ? Math.max(...ranks) : 4;
  const overallCategory = catByRank[worstRank];

  const overallScore = ranks.length > 0
    ? Math.round((1 - (worstRank - 1) / 3) * 100) // cat I = 100, cat IV = 0
    : 0;

  return {
    category: overallCategory,
    breakdown: {
      iaq: iaqCategory || "n/a",
      thermal: thermalCategory || "n/a",
      humidity: humidityOk ? (humidityCategory || "n/a") : "fail",
    },
    overallScore,
  };
}
