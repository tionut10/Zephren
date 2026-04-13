// ═══════════════════════════════════════════════════════════════
// DEBIT VENTILARE IGIENIC — SR EN 16798-1:2019/NA:2019 (înlocuiește EN 15251)
// Metode: per persoană, per suprafață, per zonă
// Categorii calitate aer interior: I (superioară), II (normală), III (moderată), IV (minimă)
// ═══════════════════════════════════════════════════════════════

// Debite specifice [L/s·persoană] — EN 16798-1 Tabel B.2
export const VENT_PER_PERSON = {
  I:   10.0,  // calitate superioară (spații premium, sensibili)
  II:   7.0,  // calitate normală (recomandată general)
  III:  4.0,  // calitate moderată (existente, renovări)
  IV:   2.5,  // minimă (situații de compromis)
};

// Debite specifice [L/s·m²] — EN 16798-1 Tabel B.2 (emisii din clădire/mobilier)
export const VENT_PER_M2 = {
  I:   1.0,
  II:  0.7,
  III: 0.4,
  IV:  0.2,
};

// Densitate de ocupare [m²/persoană] per categorie de clădire — EN 16798-1 Tabel B.4
export const OCCUPANCY_DENSITY = {
  RI: 30,   // casă individuală
  RC: 25,   // bloc rezidențial
  RA: 25,   // apartament
  BI: 10,   // birouri open-space
  ED:  4,   // săli de clasă (maxim)
  SA: 10,   // spitale (zonă generală)
  HC: 20,   // hotel (cameră + zone comune)
  CO:  5,   // comerț (densitate medie)
  SP:  5,   // sport (maxim)
  AL: 15,   // altele (mixt)
};

// Ore de ocupare per zi [h] per categorie
export const OCCUPANCY_HOURS = {
  RI: 16, RC: 16, RA: 16, // rezidențial — inclusiv noapte pentru dormitoare
  BI: 10, ED: 8,  SA: 24, HC: 14, CO: 10, SP: 6, AL: 10,
};

// Consum ventilare [kWh/m²·an] estimat per sistem
export const VENT_ENERGY = {
  NATURAL:    0.0,
  NATURAL_A:  0.0,
  MECA_SUP:   4.5,
  MECA_EXT:   3.0,
  BALANTA:    7.0,
  HR70:       5.0,  // recuperare 70%
  HR80:       5.5,  // recuperare 80%
  HR90:       6.0,  // recuperare 90%
  UTA:        8.0,
};

export function calcVentilationFlow(params) {
  const {
    Au,           // arie utilă [m²]
    H,            // înălțime medie [m]
    category,     // cod categorie
    ieqCategory,  // "I", "II", "III", "IV"
    ventType,     // ID sistem ventilare
    occupancy,    // număr persoane (opțional, calculat din densitate dacă lipsă)
    hrEta,        // eficiență recuperare căldură [0-1]
    climate,      // pentru calcul recuperare energie
  } = params;

  if (!Au) return null;

  const iqCat = ieqCategory || "II";
  const V = Au * (H || 2.8); // volum [m³]

  // Număr persoane estimat
  const density = OCCUPANCY_DENSITY[category] || 15; // m²/persoană
  const nPersons = occupancy || Math.ceil(Au / density);

  // Debit per persoană + per suprafață (metodă combinată EN 16798-1 §6.3.3.2)
  const qPerson = VENT_PER_PERSON[iqCat]; // L/s·pers
  const qArea = VENT_PER_M2[iqCat];       // L/s·m²
  const q_total_LS = qPerson * nPersons + qArea * Au; // L/s
  const q_total_M3H = q_total_LS * 3.6;               // m³/h
  const n_air = V > 0 ? q_total_M3H / V : 0;          // schimburi aer/h

  // Verificare față de minim igienic (0.5 ach sau 7 L/s·pers)
  const q_min_LS = Math.max(0.5 * V / 3.6, 7 * nPersons);
  const qConform = q_total_LS >= q_min_LS;

  // Energie ventilare [kWh/an]
  const ventEnergyFactor = VENT_ENERGY[ventType] || 4.5;
  const ventEnergyKwh = Au * ventEnergyFactor;

  // Recuperare căldură — economie
  const hrEffect = hrEta || 0;
  const heatLoss_LS = q_total_LS * 0.0012 * 3600; // W la ΔT=1K (ρ×c×Q)
  const heatSavedKwh = hrEffect > 0 ? heatLoss_LS * 25 * (climate?.ngz || 3000) / 1000000 * hrEffect : 0;

  // CO₂ estimat [ppm] la ocupare maximă (verificare EN 16798-1 §6.2)
  // CO₂ exterior ~420 ppm (2026); producție internă ~20 L/h·pers (activitate ușoară)
  const co2Ext = 420; // ppm
  const co2Prod_LS = nPersons * 20 / 3600; // L/s producție CO₂
  const co2_steady = co2Ext + (co2Prod_LS / q_total_LS) * 1e6; // ppm — Ecuația Pettenkofer
  const co2Limit = iqCat === "I" ? 550 : iqCat === "II" ? 800 : iqCat === "III" ? 1350 : 1800;
  const co2Conform = co2_steady <= co2Limit;

  // Clasificare
  let cls, color;
  if (n_air >= 1.0 && co2Conform) { cls = "Excelent"; color = "#22c55e"; }
  else if (n_air >= 0.5 && co2Conform) { cls = "Conform"; color = "#84cc16"; }
  else if (n_air >= 0.3) { cls = "Limită"; color = "#eab308"; }
  else { cls = "Insuficient"; color = "#ef4444"; }

  return {
    nPersons,
    q_total_LS: Math.round(q_total_LS * 10) / 10,
    q_total_M3H: Math.round(q_total_M3H * 10) / 10,
    q_min_LS: Math.round(q_min_LS * 10) / 10,
    n_air: Math.round(n_air * 100) / 100,
    co2_steady: Math.round(co2_steady),
    co2Limit,
    co2Conform,
    qConform,
    ventEnergyKwh: Math.round(ventEnergyKwh),
    heatSavedKwh: Math.round(heatSavedKwh),
    ieqCategory: iqCat,
    classification: cls, color,
    verdict: co2Conform && qConform ? `Ventilare corespunzătoare Cat. ${iqCat} (CO₂ ≤ ${co2Limit} ppm)` :
             `Debit insuficient — CO₂ estimat ${Math.round(co2_steady)} ppm (limită: ${co2Limit} ppm)`,
    recommendation: n_air < 0.5 ? "Creșteți debitul de ventilare sau treceți la sistem mecanic controlat." :
                    !co2Conform ? "Creșteți debitele sau instalați controlul ventilării pe CO₂." : null,
    method: "SR EN 16798-1:2019/NA:2019 — metoda combinată (persoană + suprafață)",
  };
}

// ═══════════════════════════════════════════════════════════════
// TVOC — Compuși Organici Volatili Totali (SR EN 16798-1 Annex B3)
// ═══════════════════════════════════════════════════════════════

// Limite TVOC per categorie IEQ [µg/m³] — EN 16798-1 Tabel B.7
const TVOC_LIMITS = {
  I:    200,  // Calitate superioară — sensibili, spitale, grădinițe
  II:   300,  // Calitate normală — birouri, școli, rezidențial nou
  III:  500,  // Calitate moderată — rezidențial existent, renovări
  IV:  1000,  // Calitate minimă — depozite, garaje ventilate
};

// Rate de emisie TVOC tipice per sursă [µg/(m²·h)] — EN 16798-1 Tabel B.8 + BREEAM
const TVOC_EMISSION_RATES = {
  "mobilier_nou":       200,   // mobilier nou, PAL, MDF
  "pardoseala_PVC":     150,   // pardoseli PVC, linoleum
  "pardoseala_lemn":     30,   // parchet lăcuit
  "vopsea_proaspata":   500,   // primele 28 zile
  "vopsea_veche":        20,   // după 6 luni
  "izolatie_EPS":        10,   // polistiren expandat
  "covor_sintetic":     120,   // covoare sintetice noi
  "beton_simplu":         5,   // materiale minerale
};

/**
 * Estimare concentrație TVOC și conformitate
 * SR EN 16798-1:2019/NA:2019 Annex B3
 *
 * C_TVOC = (Σ emisii × Au) / (q_ventilare × 3600) + C_exterior
 *
 * @param {object} params
 * @param {number} params.Au — suprafață utilă [m²]
 * @param {number} params.q_vent_m3h — debit ventilare [m³/h]
 * @param {string[]} params.sources — surse prezente (chei din TVOC_EMISSION_RATES)
 * @param {string} params.ieqCategory — categorie IEQ țintă (I/II/III/IV)
 * @param {number} [params.tvocExterior=50] — TVOC exterior [µg/m³]
 * @returns {{ tvoc_estimated, tvoc_limit, conform, category, sources_detail }}
 */
export function calcTVOC({ Au, q_vent_m3h, sources, ieqCategory = "II", tvocExterior = 50 }) {
  if (!Au || !q_vent_m3h) return null;

  // Suma emisiilor interne
  let totalEmission = 0; // µg/h
  const sourcesDetail = [];

  (sources || ["vopsea_veche", "pardoseala_lemn"]).forEach(src => {
    const rate = TVOC_EMISSION_RATES[src] || 0;
    const emission = rate * Au;
    totalEmission += emission;
    sourcesDetail.push({ source: src, rate, emission_ugh: Math.round(emission) });
  });

  // Concentrație la echilibru: C = E / Q + C_ext
  const q_m3s = q_vent_m3h / 3600;
  const tvoc_estimated = q_m3s > 0
    ? Math.round(totalEmission / (q_m3s * 1e6) + tvocExterior)
    : 9999;
  const tvoc_limit = TVOC_LIMITS[ieqCategory] || 300;
  const conform = tvoc_estimated <= tvoc_limit;

  // Debit minim necesar pentru conformitate TVOC
  const q_min_tvoc_m3h = totalEmission > 0
    ? Math.round(totalEmission / ((tvoc_limit - tvocExterior) * 1e6 / 3600) * 10) / 10
    : 0;

  return {
    tvoc_estimated,
    tvoc_limit,
    conform,
    category: ieqCategory,
    q_min_tvoc_m3h,
    sources_detail: sourcesDetail,
    verdict: conform
      ? `TVOC ≤ ${tvoc_limit} µg/m³ — conform Cat. ${ieqCategory}`
      : `TVOC ${tvoc_estimated} µg/m³ > ${tvoc_limit} µg/m³ — creșteți ventilarea sau reduceți sursele`,
    method: "SR EN 16798-1:2019/NA:2019 Annex B3",
  };
}

export { TVOC_LIMITS, TVOC_EMISSION_RATES };
