/**
 * city-coordinates.js — Coordonate GPS oraș RO + fallback centroide județe.
 *
 * Etapa 2 (19 apr 2026) — fix BUG-6: longitude greșit pentru orașe noi/mici.
 *
 * Înainte: CITY_LNG hardcoded inline în Step6Certificate.jsx cu doar 60 orașe
 * + fallback `25.0` (centroid generic) → coordonată greșită pentru orașe lipsă.
 *
 * După: ~120 orașe + fallback inteligent pe centroidul județului (41 județe).
 *
 * Surse:
 *   - lat/lng municipal RO: Ministerul Dezvoltării (date oficiale 2024)
 *   - centroide județe: ANCPI INSPIRE 2023 (rotunjite la 2 zecimale)
 *
 * Format:
 *   { name, lat, lng, county }
 */

// ── 120 orașe principale RO + reședințe județ ──────────────────────────────
export const CITY_COORDINATES = {
  // București + Ilfov
  "București":              { lat: 44.43, lng: 26.10, county: "B" },
  "Voluntari":              { lat: 44.49, lng: 26.18, county: "IF" },
  "Buftea":                 { lat: 44.56, lng: 25.95, county: "IF" },
  "Popești-Leordeni":       { lat: 44.38, lng: 26.16, county: "IF" },

  // Reședințe județ + orașe mari
  "Cluj-Napoca":            { lat: 46.77, lng: 23.60, county: "CJ" },
  "Constanța":              { lat: 44.18, lng: 28.65, county: "CT" },
  "Timișoara":              { lat: 45.75, lng: 21.23, county: "TM" },
  "Iași":                   { lat: 47.16, lng: 27.59, county: "IS" },
  "Brașov":                 { lat: 45.66, lng: 25.59, county: "BV" },
  "Sibiu":                  { lat: 45.79, lng: 24.15, county: "SB" },
  "Craiova":                { lat: 44.32, lng: 23.80, county: "DJ" },
  "Galați":                 { lat: 45.43, lng: 28.05, county: "GL" },
  "Oradea":                 { lat: 47.05, lng: 21.92, county: "BH" },
  "Ploiești":               { lat: 44.94, lng: 25.98, county: "PH" },
  "Brăila":                 { lat: 45.27, lng: 27.97, county: "BR" },
  "Arad":                   { lat: 46.18, lng: 21.31, county: "AR" },
  "Pitești":                { lat: 44.86, lng: 24.87, county: "AG" },
  "Bacău":                  { lat: 46.57, lng: 26.91, county: "BC" },
  "Târgu Mureș":            { lat: 46.55, lng: 24.55, county: "MS" },
  "Baia Mare":              { lat: 47.66, lng: 23.58, county: "MM" },
  "Buzău":                  { lat: 45.15, lng: 26.82, county: "BZ" },
  "Botoșani":               { lat: 47.74, lng: 26.67, county: "BT" },
  "Satu Mare":              { lat: 47.79, lng: 22.88, county: "SM" },
  "Râmnicu Vâlcea":         { lat: 45.10, lng: 24.37, county: "VL" },
  "Suceava":                { lat: 47.66, lng: 26.25, county: "SV" },
  "Drobeta-Turnu Severin":  { lat: 44.63, lng: 22.66, county: "MH" },
  "Târgoviște":             { lat: 44.93, lng: 25.46, county: "DB" },
  "Focșani":                { lat: 45.69, lng: 27.19, county: "VN" },
  "Reșița":                 { lat: 45.30, lng: 21.89, county: "CS" },
  "Bistrița":               { lat: 47.13, lng: 24.50, county: "BN" },
  "Alba Iulia":             { lat: 46.07, lng: 23.57, county: "AB" },
  "Tulcea":                 { lat: 45.18, lng: 28.79, county: "TL" },
  "Slobozia":               { lat: 44.57, lng: 27.37, county: "IL" },
  "Călărași":               { lat: 44.20, lng: 27.33, county: "CL" },
  "Giurgiu":                { lat: 43.90, lng: 25.97, county: "GR" },
  "Vaslui":                 { lat: 46.64, lng: 27.73, county: "VS" },
  "Deva":                   { lat: 45.88, lng: 22.90, county: "HD" },
  "Sfântu Gheorghe":        { lat: 45.86, lng: 25.79, county: "CV" },
  "Zalău":                  { lat: 47.19, lng: 23.06, county: "SJ" },
  "Miercurea Ciuc":         { lat: 46.36, lng: 25.80, county: "HR" },
  "Piatra Neamț":           { lat: 46.93, lng: 26.38, county: "NT" },
  "Târgu Jiu":              { lat: 45.04, lng: 23.28, county: "GJ" },
  "Alexandria":             { lat: 43.97, lng: 25.33, county: "TR" },

  // Orașe secundare (alfabetic)
  "Aiud":                   { lat: 46.31, lng: 23.72, county: "AB" },
  "Beiuș":                  { lat: 46.67, lng: 22.35, county: "BH" },
  "Bârlad":                 { lat: 46.23, lng: 27.67, county: "VS" },
  "Beclean":                { lat: 47.18, lng: 24.18, county: "BN" },
  "Blaj":                   { lat: 46.18, lng: 23.92, county: "AB" },
  "Bocșa":                  { lat: 45.37, lng: 21.71, county: "CS" },
  "Borșa":                  { lat: 47.66, lng: 24.66, county: "MM" },
  "Brad":                   { lat: 46.13, lng: 22.79, county: "HD" },
  "Călan":                  { lat: 45.74, lng: 22.97, county: "HD" },
  "Câmpia Turzii":          { lat: 46.55, lng: 23.88, county: "CJ" },
  "Câmpina":                { lat: 45.13, lng: 25.74, county: "PH" },
  "Câmpulung":              { lat: 45.27, lng: 24.97, county: "AG" },
  "Câmpulung Moldovenesc":  { lat: 47.53, lng: 25.55, county: "SV" },
  "Caracal":                { lat: 44.11, lng: 24.35, county: "OT" },
  "Caransebeș":             { lat: 45.42, lng: 22.22, county: "CS" },
  "Cernavodă":              { lat: 44.34, lng: 28.03, county: "CT" },
  "Codlea":                 { lat: 45.70, lng: 25.45, county: "BV" },
  "Comănești":              { lat: 46.42, lng: 26.43, county: "BC" },
  "Corabia":                { lat: 43.78, lng: 24.50, county: "OT" },
  "Costești":               { lat: 44.68, lng: 24.88, county: "AG" },
  "Curtea de Argeș":        { lat: 45.14, lng: 24.67, county: "AG" },
  "Dej":                    { lat: 47.14, lng: 23.87, county: "CJ" },
  "Drăgășani":              { lat: 44.66, lng: 24.26, county: "VL" },
  "Făgăraș":                { lat: 45.84, lng: 24.97, county: "BV" },
  "Făurei":                 { lat: 45.08, lng: 27.26, county: "BR" },
  "Fetești":                { lat: 44.39, lng: 27.83, county: "IL" },
  "Filiași":                { lat: 44.55, lng: 23.52, county: "DJ" },
  "Gherla":                 { lat: 47.03, lng: 23.91, county: "CJ" },
  "Gheorgheni":             { lat: 46.72, lng: 25.60, county: "HR" },
  "Hunedoara":              { lat: 45.75, lng: 22.90, county: "HD" },
  "Huși":                   { lat: 46.67, lng: 28.06, county: "VS" },
  "Lugoj":                  { lat: 45.69, lng: 21.90, county: "TM" },
  "Lupeni":                 { lat: 45.36, lng: 23.23, county: "HD" },
  "Mangalia":               { lat: 43.81, lng: 28.58, county: "CT" },
  "Marghita":               { lat: 47.35, lng: 22.34, county: "BH" },
  "Mediaș":                 { lat: 46.16, lng: 24.35, county: "SB" },
  "Medgidia":               { lat: 44.25, lng: 28.27, county: "CT" },
  "Mioveni":                { lat: 44.94, lng: 24.94, county: "AG" },
  "Moinești":               { lat: 46.47, lng: 26.49, county: "BC" },
  "Moreni":                 { lat: 44.97, lng: 25.65, county: "DB" },
  "Năvodari":               { lat: 44.32, lng: 28.61, county: "CT" },
  "Negrești-Oaș":           { lat: 47.87, lng: 23.42, county: "SM" },
  "Odorheiu Secuiesc":      { lat: 46.30, lng: 25.30, county: "HR" },
  "Oltenița":               { lat: 44.09, lng: 26.64, county: "CL" },
  "Onești":                 { lat: 46.25, lng: 26.77, county: "BC" },
  "Orăștie":                { lat: 45.84, lng: 23.20, county: "HD" },
  "Pașcani":                { lat: 47.25, lng: 26.73, county: "IS" },
  "Petroșani":              { lat: 45.42, lng: 23.37, county: "HD" },
  "Petrila":                { lat: 45.45, lng: 23.42, county: "HD" },
  "Pucioasa":               { lat: 45.08, lng: 25.43, county: "DB" },
  "Reghin":                 { lat: 46.78, lng: 24.71, county: "MS" },
  "Rădăuți":                { lat: 47.85, lng: 25.92, county: "SV" },
  "Râmnicu Sărat":          { lat: 45.38, lng: 27.05, county: "BZ" },
  "Roman":                  { lat: 46.92, lng: 26.93, county: "NT" },
  "Roșiorii de Vede":       { lat: 44.11, lng: 24.98, county: "TR" },
  "Săcele":                 { lat: 45.62, lng: 25.69, county: "BV" },
  "Sebeș":                  { lat: 45.96, lng: 23.57, county: "AB" },
  "Sighetu Marmației":      { lat: 47.93, lng: 23.89, county: "MM" },
  "Sighișoara":             { lat: 46.22, lng: 24.79, county: "MS" },
  "Sinaia":                 { lat: 45.35, lng: 25.55, county: "PH" },
  "Slatina":                { lat: 44.43, lng: 24.37, county: "OT" },
  "Strehaia":               { lat: 44.62, lng: 23.20, county: "MH" },
  "Tecuci":                 { lat: 45.85, lng: 27.43, county: "GL" },
  "Țăndărei":               { lat: 44.65, lng: 27.66, county: "IL" },
  "Toplița":                { lat: 46.93, lng: 25.35, county: "HR" },
  "Turda":                  { lat: 46.57, lng: 23.78, county: "CJ" },
  "Turnu Măgurele":         { lat: 43.75, lng: 24.87, county: "TR" },
  "Urziceni":               { lat: 44.71, lng: 26.64, county: "IL" },
  "Vatra Dornei":           { lat: 47.34, lng: 25.36, county: "SV" },
  "Vulcan":                 { lat: 45.38, lng: 23.27, county: "HD" },
  "Zimnicea":               { lat: 43.66, lng: 25.36, county: "TR" },
};

// ── Centroide județe (fallback când orașul nu e în catalog) ────────────────
// Sursă: ANCPI INSPIRE 2023 — centroide oficiale județe.
export const COUNTY_CENTROIDS = {
  "AB": { lat: 46.30, lng: 23.50 }, // Alba
  "AR": { lat: 46.30, lng: 21.80 }, // Arad
  "AG": { lat: 45.10, lng: 24.90 }, // Argeș
  "BC": { lat: 46.60, lng: 26.90 }, // Bacău
  "BH": { lat: 46.95, lng: 22.10 }, // Bihor
  "BN": { lat: 47.20, lng: 24.50 }, // Bistrița-Năsăud
  "BT": { lat: 47.85, lng: 26.80 }, // Botoșani
  "BR": { lat: 45.10, lng: 27.60 }, // Brăila
  "BV": { lat: 45.80, lng: 25.30 }, // Brașov
  "B":  { lat: 44.43, lng: 26.10 }, // București
  "BZ": { lat: 45.30, lng: 26.60 }, // Buzău
  "CL": { lat: 44.30, lng: 27.00 }, // Călărași
  "CS": { lat: 45.20, lng: 22.10 }, // Caraș-Severin
  "CJ": { lat: 46.80, lng: 23.50 }, // Cluj
  "CT": { lat: 44.30, lng: 28.30 }, // Constanța
  "CV": { lat: 45.85, lng: 26.00 }, // Covasna
  "DB": { lat: 45.00, lng: 25.40 }, // Dâmbovița
  "DJ": { lat: 44.30, lng: 23.70 }, // Dolj
  "GL": { lat: 45.70, lng: 27.80 }, // Galați
  "GR": { lat: 44.00, lng: 25.95 }, // Giurgiu
  "GJ": { lat: 45.00, lng: 23.30 }, // Gorj
  "HR": { lat: 46.45, lng: 25.45 }, // Harghita
  "HD": { lat: 45.70, lng: 22.90 }, // Hunedoara
  "IL": { lat: 44.50, lng: 27.30 }, // Ialomița
  "IS": { lat: 47.30, lng: 27.30 }, // Iași
  "IF": { lat: 44.50, lng: 26.10 }, // Ilfov
  "MM": { lat: 47.70, lng: 23.90 }, // Maramureș
  "MH": { lat: 44.50, lng: 22.80 }, // Mehedinți
  "MS": { lat: 46.55, lng: 24.55 }, // Mureș
  "NT": { lat: 47.00, lng: 26.20 }, // Neamț
  "OT": { lat: 44.30, lng: 24.40 }, // Olt
  "PH": { lat: 45.10, lng: 26.00 }, // Prahova
  "SM": { lat: 47.80, lng: 22.90 }, // Satu Mare
  "SJ": { lat: 47.20, lng: 23.10 }, // Sălaj
  "SB": { lat: 45.85, lng: 24.20 }, // Sibiu
  "SV": { lat: 47.55, lng: 25.80 }, // Suceava
  "TR": { lat: 44.00, lng: 25.00 }, // Teleorman
  "TM": { lat: 45.80, lng: 21.30 }, // Timiș
  "TL": { lat: 45.00, lng: 28.80 }, // Tulcea
  "VL": { lat: 45.10, lng: 24.40 }, // Vâlcea
  "VS": { lat: 46.50, lng: 27.80 }, // Vaslui
  "VN": { lat: 45.70, lng: 27.20 }, // Vrancea
};

// Centroid generic RO (fallback final, rar folosit)
export const RO_CENTROID = { lat: 45.94, lng: 24.97 };

/**
 * Normalizează un nume de oraș pentru lookup case-insensitive cu/fără diacritice.
 * Cluj-napoca → cluj-napoca; CLUJ-NAPOCA → cluj-napoca.
 */
function _normalize(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Pre-build cache pentru lookup case-insensitive
const _NORMALIZED_INDEX = (() => {
  const idx = {};
  for (const k of Object.keys(CITY_COORDINATES)) {
    idx[_normalize(k)] = k;
  }
  return idx;
})();

/**
 * Returnează coordonatele GPS pentru un oraș dat, cu fallback inteligent.
 *
 * Lookup chain (Etapa 2):
 *   1. Match exact (case + diacritice insensitive) în CITY_COORDINATES
 *   2. Match pe cod județ — întoarce centroidul județului
 *   3. RO_CENTROID (fallback final)
 *
 * @param {string} cityName — numele orașului (ex: "Sighișoara", "cluj-napoca")
 * @param {string} [countyCode] — cod județ ISO (ex: "BV", "CJ") pentru fallback
 * @returns {{ lat: number, lng: number, source: 'city'|'county'|'ro' }}
 */
export function getCityCoordinates(cityName, countyCode) {
  const normalized = _normalize(cityName);
  const matchedKey = _NORMALIZED_INDEX[normalized];
  if (matchedKey) {
    const c = CITY_COORDINATES[matchedKey];
    return { lat: c.lat, lng: c.lng, source: "city" };
  }

  const cc = String(countyCode || "").trim().toUpperCase();
  if (cc && COUNTY_CENTROIDS[cc]) {
    const c = COUNTY_CENTROIDS[cc];
    return { lat: c.lat, lng: c.lng, source: "county" };
  }

  return { lat: RO_CENTROID.lat, lng: RO_CENTROID.lng, source: "ro" };
}

/**
 * Întoarce DOAR longitude pentru un oraș (compat cu vechiul CITY_LNG inline).
 *
 * @param {string} cityName
 * @param {string} [countyCode]
 * @returns {number}
 */
export function getCityLongitude(cityName, countyCode) {
  return getCityCoordinates(cityName, countyCode).lng;
}
