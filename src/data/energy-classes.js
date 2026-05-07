// ===============================================================
// GRILE CLASARE ENERGETICA — Cap. 5 Mc 001-2022
// ===============================================================

export const ENERGY_CLASSES_DB = {
  RI_cool: { label:"Case individuale (cu răcire)", thresholds:[91,129,257,390,522,652,783] },
  RI_nocool: { label:"Case individuale (fără răcire)", thresholds:[78,110,220,340,460,575,690] },
  RC_cool: { label:"Bloc locuințe colective (cu răcire)", thresholds:[73,101,198,297,396,495,595] },
  RC_nocool: { label:"Bloc locuințe colective (fără răcire)", thresholds:[60,84,168,260,352,440,528] },
  RA_cool: { label:"Apartament (cu răcire)", thresholds:[73,101,198,297,396,495,595] },
  RA_nocool: { label:"Apartament (fără răcire)", thresholds:[60,84,168,260,352,440,528] },
  BI: { label:"Birouri", thresholds:[68,97,193,302,410,511,614] },
  ED: { label:"Educație", thresholds:[48,68,135,246,358,447,536] },
  SA: { label:"Sănătate", thresholds:[117,165,331,501,671,838,1005] },
  HC: { label:"Hotel / Cazare", thresholds:[67,93,188,321,452,565,678] },
  CO: { label:"Comercial", thresholds:[88,124,248,320,393,492,591] },
  SP: { label:"Sport", thresholds:[75,104,206,350,494,617,741] },
  AL: { label:"Altele", thresholds:[68,97,193,302,410,511,614] },
};

export const CLASS_LABELS = ["A+","A","B","C","D","E","F","G"];
export const CLASS_COLORS = ["#009B00","#32C831","#00FF00","#FFFF00","#F39C00","#FF6400","#FE4101","#FE0000"];

// Praguri nZEB per categorie [kWh/(m2·an)] energie primara + RER minim
// Praguri nZEB conform Mc 001-2022 Tabel 2.10a — diferentiate pe zone climatice I-V
// ep_max: [zona I, zona II, zona III, zona IV, zona V] kWh/(m2·an) energie primara totala
// rer_min: 30% minim surse regenerabile (Legea 238/2024 Art.6)
// rer_onsite_min: 10% pe amplasament (Legea 238/2024 + 20% prin garantii de origine)
// ZEB (EPBD 2024/1275): ep_max * 0.9, fara emisii fosile on-site — termen transpunere 29 mai 2026
export const NZEB_THRESHOLDS = {
  RI: { ep_max: [120, 128, 133, 141, 148], rer_min: 30, rer_onsite_min: 10 },
  RC: { ep_max: [99, 104, 106, 110, 113], rer_min: 30, rer_onsite_min: 10 },
  RA: { ep_max: [99, 104, 106, 110, 113], rer_min: 30, rer_onsite_min: 10 },
  BI: { ep_max: [95, 98, 99, 101, 103], rer_min: 30, rer_onsite_min: 10 },
  ED: { ep_max: [62, 67, 71, 77, 82], rer_min: 30, rer_onsite_min: 10 },
  SA: { ep_max: [163, 169, 171, 175, 179], rer_min: 30, rer_onsite_min: 10 },
  HC: { ep_max: [97, 101, 104, 107, 112], rer_min: 30, rer_onsite_min: 10 },
  CO: { ep_max: [96, 103, 108, 115, 121], rer_min: 30, rer_onsite_min: 10 },
  SP: { ep_max: [93, 98, 100, 104, 108], rer_min: 30, rer_onsite_min: 10 },
  AL: { ep_max: [95, 98, 99, 101, 103], rer_min: 30, rer_onsite_min: 10 },
};

// Praguri CO2 per categorie [kg CO2/(m2·an)] — A+ la G (7 praguri)
// Conform Mc 001-2022 Tabele 5.7-5.14 (valorile TOTAL CO2)
export const CO2_CLASSES_DB = {
  RI: { thresholds: [16.1, 22.8, 45.5, 70.1, 94.8, 118.4, 142.1] },
  RC: { thresholds: [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9] },
  RA: { thresholds: [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9] },
  BI: { thresholds: [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4] },
  ED: { thresholds: [8.3, 11.6, 23.0, 42.5, 62.2, 77.6, 93.1] },
  SA: { thresholds: [19.7, 27.8, 55.8, 84.0, 112.3, 140.2, 168.1] },
  HC: { thresholds: [11.8, 16.4, 33.1, 57.0, 80.6, 100.7, 120.8] },
  CO: { thresholds: [15.4, 21.6, 43.4, 54.5, 65.7, 82.3, 98.9] },
  SP: { thresholds: [12.3, 17.0, 33.7, 57.4, 81.2, 101.4, 121.7] },
  AL: { thresholds: [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4] },
};

export const WATER_TEMP_MONTH = [5, 5, 7, 9, 12, 15, 17, 17, 14, 11, 8, 6];

// ===============================================================
// CR-2 (7 mai 2026) — GRILE CLASARE PER UTILITATE — Mc 001-2022 Tab I.1
// ===============================================================
//
// Audit 7 mai 2026: Anexa 1+2 DOCX afișa clase greșite pentru utilități:
//   - ACM 171,8 kWh/m²·an clasificat „C" (corect: G — >109)
//   - Iluminat 43,2 kWh/m²·an clasificat „A+" (corect: F — 42-50)
// Cauza: helper-ul getUtilClass folosea grila WHOLE-BUILDING (ENERGY_CLASSES_DB)
// pentru a clasifica valori PER-SERVICE. Mc 001-2022 prevede grile separate.
//
// Praguri exprimate ca array de 7 valori (limite superioare A+, A, B, C, D, E, F).
// Clasa G = orice valoare peste ultima limită.
//
// Sursa pragurilor:
//   - Mc 001-2022 Anexa I Tab I.1 (rezidențial RI/RC/RA)
//   - Mc 001-2022 Anexa I Tab I.2-I.5 (nerezidențial — extrapolat din BI)
//
// Pentru categorii fără date specifice (ED/SA/HC/CO/SP/AL): folosim BI ca fallback
// pentru utilitățile mecanice (vent/iluminat) + RC pentru ACM (cea mai apropiată
// de profilul rezidențial mixt). Utilizatorul poate ajusta în Step 8 dacă e nevoie.
export const SERVICE_CLASSES_DB = {
  // REZIDENȚIAL (Mc 001-2022 Tab I.1)
  RI: {
    heating:     [30, 42, 84, 150, 217, 271, 325],
    dhw:         [21, 29, 57, 65, 73, 91, 109],
    cooling:     [13, 18, 35, 46, 56, 70, 85],
    ventilation: [4, 5, 9, 13, 17, 21, 26],
    lighting:    [5, 7, 13, 23, 33, 42, 50],
  },
  RC: {
    heating:     [30, 42, 84, 150, 217, 271, 325],
    dhw:         [21, 29, 57, 65, 73, 91, 109],
    cooling:     [13, 18, 35, 46, 56, 70, 85],
    ventilation: [4, 5, 9, 13, 17, 21, 26],
    lighting:    [5, 7, 13, 23, 33, 42, 50],
  },
  RA: {
    heating:     [30, 42, 84, 150, 217, 271, 325],
    dhw:         [21, 29, 57, 65, 73, 91, 109],
    cooling:     [13, 18, 35, 46, 56, 70, 85],
    ventilation: [4, 5, 9, 13, 17, 21, 26],
    lighting:    [5, 7, 13, 23, 33, 42, 50],
  },
  // NEREZIDENȚIAL (Mc 001-2022 Tab I.2-I.5 + extrapolări)
  BI: {
    heating:     [25, 35, 70, 130, 195, 245, 295],
    dhw:         [4, 6, 12, 18, 25, 32, 40],
    cooling:     [13, 19, 38, 60, 82, 102, 122],
    ventilation: [10, 14, 28, 45, 60, 75, 90],
    lighting:    [10, 14, 28, 45, 60, 75, 90],
  },
  ED: {
    heating:     [25, 35, 70, 130, 195, 245, 295],
    dhw:         [4, 6, 12, 18, 25, 32, 40],
    cooling:     [10, 14, 28, 45, 60, 75, 90],
    ventilation: [8, 12, 24, 38, 50, 65, 78],
    lighting:    [8, 12, 24, 38, 50, 65, 78],
  },
  SA: {
    heating:     [50, 70, 140, 240, 340, 425, 510],
    dhw:         [25, 35, 70, 100, 130, 165, 195],
    cooling:     [20, 28, 56, 90, 122, 153, 183],
    ventilation: [25, 35, 70, 110, 150, 188, 225],
    lighting:    [12, 17, 34, 55, 75, 95, 115],
  },
  HC: {
    heating:     [25, 35, 70, 130, 195, 245, 295],
    dhw:         [25, 35, 70, 100, 130, 165, 195],
    cooling:     [13, 19, 38, 60, 82, 102, 122],
    ventilation: [10, 14, 28, 45, 60, 75, 90],
    lighting:    [10, 14, 28, 45, 60, 75, 90],
  },
  CO: {
    heating:     [25, 35, 70, 130, 195, 245, 295],
    dhw:         [4, 6, 12, 18, 25, 32, 40],
    cooling:     [20, 28, 56, 90, 122, 153, 183],
    ventilation: [12, 17, 34, 55, 75, 95, 115],
    lighting:    [15, 21, 42, 68, 92, 115, 138],
  },
  SP: {
    heating:     [30, 42, 84, 155, 232, 290, 348],
    dhw:         [10, 14, 28, 45, 60, 75, 90],
    cooling:     [13, 19, 38, 60, 82, 102, 122],
    ventilation: [15, 21, 42, 68, 92, 115, 138],
    lighting:    [10, 14, 28, 45, 60, 75, 90],
  },
  AL: {
    heating:     [25, 35, 70, 130, 195, 245, 295],
    dhw:         [4, 6, 12, 18, 25, 32, 40],
    cooling:     [13, 19, 38, 60, 82, 102, 122],
    ventilation: [10, 14, 28, 45, 60, 75, 90],
    lighting:    [10, 14, 28, 45, 60, 75, 90],
  },
};

/**
 * Returnează clasa energetică A+..G pentru o utilitate specifică
 * a clădirii, folosind grilele Mc 001-2022 Tab I.1.
 *
 * @param {number} epValue — EP specific al utilității [kWh/m²·an]
 * @param {"heating"|"dhw"|"cooling"|"ventilation"|"lighting"} service
 * @param {string} category — categorie clădire (RI/RC/RA/BI/ED/SA/HC/CO/SP/AL)
 * @returns {string} — A+, A, B, C, D, E, F, G sau „—" dacă nedefinit
 */
export function getServiceClass(epValue, service, category = "AL") {
  if (!Number.isFinite(epValue) || epValue < 0) return "—";
  // Aliase: dhw / acm / acc — toate trimise la „dhw"
  const svcKey = service === "acm" || service === "acc" ? "dhw" : service;
  const cat = SERVICE_CLASSES_DB[category] || SERVICE_CLASSES_DB.AL;
  const thresholds = cat[svcKey];
  if (!Array.isArray(thresholds)) return "—";
  for (let i = 0; i < thresholds.length; i++) {
    if (epValue <= thresholds[i]) return CLASS_LABELS[i];
  }
  return CLASS_LABELS[CLASS_LABELS.length - 1]; // G
}
