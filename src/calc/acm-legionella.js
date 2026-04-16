// ═══════════════════════════════════════════════════════════════
// ACM LEGIONELLA — calcul supliment energetic tratament termic
// ═══════════════════════════════════════════════════════════════
// Baze legale RO:
//   • HG 1425/2006 — Regulament sanitar general clădiri publice
//   • Ord. MS 1002/2015 — Norme igienico-sanitare unități medicale
//   • HG 857/2011 — Calitatea apei potabile (supliment)
//   • VDI 6023 (standard german adoptat de facto în proiectare hoteluri/spitale)
//
// Cerințe:
//   • Boilere > 400 L: T_set ≥ 60 °C permanent ȘI tratament săptămânal 70 °C ≥ 3 min
//   • Clădiri publice (SA/HC/ED/GR/CC): T_set ≥ 60 °C permanent
//   • Clădiri rezidențiale individuale: T_set ≥ 55 °C recomandat
//   • Circuit recirculare: T_retur ≥ 55 °C la returul cel mai depărtat
// ═══════════════════════════════════════════════════════════════

// Clădiri cu risc ridicat Legionella (ocupare vulnerabilă + rețele mari)
export const HIGH_RISK_CATEGORIES = new Set([
  "SA", "SPA_H", "CL", "ST", "LB_MED", "AS_SOC",   // medical
  "HC", "HO_LUX", "HOSTEL",                         // turism / cazare colectivă
  "GR", "CP",                                       // grădiniță, cămin
  "SP", "PSC", "SALA_POL", "FIT", "SPA_W",          // dușuri sport / wellness
  "CC",                                             // centre culturale cu cazare
]);

// Clădiri cu risc mediu (publice cu ACM distribuită)
export const MEDIUM_RISK_CATEGORIES = new Set([
  "RC", "RA",                                       // bloc / apartament
  "BI", "AD", "BA_OFF",                             // birouri mari cu dușuri
  "ED", "SC", "LI", "UN",                           // educație
  "REST", "CANTINE",                                // bucătărie
]);

export function getLegionellaRiskLevel(category, volumeL) {
  if (HIGH_RISK_CATEGORIES.has(category)) return "high";
  if (MEDIUM_RISK_CATEGORIES.has(category) && volumeL > 400) return "high";
  if (MEDIUM_RISK_CATEGORIES.has(category)) return "medium";
  if (volumeL > 400) return "medium";
  return "low";
}

// Praguri de temperatură (°C)
export const LEGIONELLA_THRESHOLDS = {
  storage_safe:      60,  // T_stocare ≥ 60°C inhibă multiplicarea
  circulation_safe:  55,  // T_retur recirculare ≥ 55°C
  treatment_shock:   70,  // tratament termic șoc (min 3 min/săptămână)
  storage_min_publ:  60,  // minim pentru clădiri publice
  storage_min_resid: 55,  // minim recomandat rezidențial
  growth_zone_low:   25,  // sub 25°C fără risc semnificativ
  growth_zone_high:  45,  // 25-45°C zonă de înmulțire maximă
};

/**
 * Calculează suplimentul energetic pentru tratament anti-Legionella
 *
 * @param {object} params
 * @param {number} params.volume_L        — volum boiler [L]
 * @param {number} params.T_set           — temperatură setată permanent [°C]
 * @param {string} params.category        — cod categorie clădire (RI/RC/SA/HC...)
 * @param {boolean} params.hasTreatment   — tratament termic periodic activ
 * @param {string} params.treatmentFreq   — "daily" | "weekly" | "none"
 * @param {number} params.T_treatment     — temperatură șoc termic [°C] (tipic 70)
 * @param {number} params.insulFactor     — factor izolație boiler (pentru pierderi suplimentare)
 * @returns {object}
 */
export function calcLegionellaOverhead({
  volume_L = 0,
  T_set = 55,
  category = "RI",
  hasTreatment = false,
  treatmentFreq = "none",
  T_treatment = 70,
  insulFactor = 0.70,  // clasa B default
} = {}) {
  const risk = getLegionellaRiskLevel(category, volume_L);
  const minRequired = HIGH_RISK_CATEGORIES.has(category) ? LEGIONELLA_THRESHOLDS.storage_min_publ
                    : (volume_L > 400 ? LEGIONELLA_THRESHOLDS.storage_min_publ : LEGIONELLA_THRESHOLDS.storage_min_resid);

  const warnings = [];
  const recommendations = [];

  // 1. Verificare T_set vs. cerință normativă
  const compliant_tset = T_set >= minRequired;
  if (!compliant_tset) {
    warnings.push(
      `Legionella (risc ${risk}): T_set = ${T_set}°C < ${minRequired}°C cerință ${HIGH_RISK_CATEGORIES.has(category) ? "Ord. MS 1002/2015" : "HG 1425/2006"}`
    );
    recommendations.push(
      `Creșteți T_set la cel puțin ${minRequired}°C permanent (supliment energetic: +${Math.round(20 + insulFactor * 15)}%)`
    );
  }

  // 2. Supliment pierderi stocare la T_set crescută (față de 50°C referință)
  // Formula simplificată: fiecare 5°C suplimentari peste 50°C = +10% pierderi standby
  let overhead_standby_kWh = 0;
  if (volume_L > 0 && T_set > 50) {
    // Pierderi standby de bază (EN 50440) la T_set=65°C ref: (0.45√V + 0.007V) × insulFactor
    const baseline_standby = (0.45 * Math.sqrt(volume_L) + 0.007 * volume_L) * insulFactor;
    // Diferență proporțională cu (T_set - T_ambient) / (65 - 20) raportat la 55 baseline normal
    const extra_fraction = Math.max(0, (T_set - 50) / 15); // 0 la 50°C, 1 la 65°C
    overhead_standby_kWh = baseline_standby * extra_fraction * 0.15 * 365; // 15% din baseline pe diferență
  }

  // 3. Supliment tratament termic periodic (dacă hasTreatment)
  // Energie pentru a încălzi volumul de la T_set la T_treatment și menține 1h
  let overhead_treatment_kWh = 0;
  if (hasTreatment && volume_L > 0 && T_treatment > T_set) {
    const Q_heat_up = volume_L * 4.186 * (T_treatment - T_set) / 3600; // kWh/ciclu
    const cycles_per_year = treatmentFreq === "daily" ? 365
                          : treatmentFreq === "weekly" ? 52
                          : 0;
    // Energie menținere 1h la T_treatment (pierderi amplificate)
    const Q_maintain = volume_L > 0 ? 0.6 * insulFactor * (T_treatment - 20) / 45 : 0; // kWh/ciclu
    overhead_treatment_kWh = (Q_heat_up + Q_maintain) * cycles_per_year;
  }

  // 4. Recomandări dacă risc high fără tratament
  if (risk === "high" && !hasTreatment && volume_L < 400 && T_set < LEGIONELLA_THRESHOLDS.storage_safe) {
    recommendations.push(
      "Clădire cu risc ridicat: recomandat tratament termic săptămânal 70°C (3 min) SAU T_set permanent 60°C"
    );
  }
  if (risk === "high" && volume_L > 400 && !hasTreatment) {
    warnings.push(
      "Boiler > 400L în clădire publică: tratament săptămânal 70°C OBLIGATORIU conform VDI 6023 / Ord. MS 1002/2015"
    );
  }

  // 5. Recirculare recomandată la T ≥ 55°C
  // Notă: verificarea actuală se face în acm-en15316.js (circulatie). Aici semnalizăm doar.

  const total_overhead_kWh = Math.round(overhead_standby_kWh + overhead_treatment_kWh);
  const overhead_pct = 0; // calculat în downstream vs. Q_total

  return {
    risk,                                 // "low" | "medium" | "high"
    minRequired,                          // T_set minim conform normativ [°C]
    compliant: compliant_tset && (risk !== "high" || hasTreatment || volume_L <= 400 || T_set >= LEGIONELLA_THRESHOLDS.storage_safe),
    overhead_kWh: total_overhead_kWh,
    overhead_standby_kWh: Math.round(overhead_standby_kWh),
    overhead_treatment_kWh: Math.round(overhead_treatment_kWh),
    overhead_pct,                         // % din Q_total (calculat downstream)
    warnings,
    recommendations,
    reference: "HG 1425/2006 + Ord. MS 1002/2015 + VDI 6023",
  };
}
