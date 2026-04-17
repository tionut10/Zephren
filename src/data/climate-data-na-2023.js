// ===============================================================
// DATE CLIMATICE OFICIALE — SR EN ISO 52010-1:2017/NA:2023
// ===============================================================
//
// Sursa primară: Anexa Națională României la SR EN ISO 52010-1:2017
// (publicată nov. 2023, factură ASRO 148552 / 17.04.2026).
//
// Conține:
//   A. 9 stații meteo de referință oficiale (Tab A.2.1–A.2.9 din NA:2023)
//   B. 51 localități suplimentare preluate din climate.json (sursă Mc 001-2022)
//      → total 60 localități, depășește ținta de 41 din NA:2023
//
// Valori GZE (grade-zile încălzire):
//   - `gzeConv` = grade-zile conventional pentru calibrare (bază 12°C, pe
//     durata sezonului de încălzire) — conform SR 4839:2014 §4.2 +
//     Mc 001-2022 Cap. 3.3.2. Unități: K·zi/an.
//   - `gze20Calc` = GZE base 20°C derivat din temperaturile lunare
//     (utilizat pentru metoda quasi-staționară ISO 52016-1).
//
// Scop: permite funcției `normalizeConsumption()` să corecteze consumul
// real al unui an cu iarnă blândă/rece la condiții climatice convenționale.
// Formula: k_clim = gzeConv_conventional / gze_real_an_masurat
//
// Precautii:
//   - Nu folosi aceste valori pentru dimensionare HVAC (→ SR EN 12831-1)
//   - Pentru calcul orar (ISO 52016-1 §6.5) sunt necesare date TMY
//     (Ordinul OMTCT 2210/2013 — 8760h/an)
//
// Referințe: SPRINT_00_standards_integration.md + STANDARDE_FORMULE_REFERINTA.md
// ===============================================================

import climateJson from "./climate.json";

// Zile pe lună (an non-bisect standard) — ISO 52016-1 Tab A.22
export const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Calculează GZE (grade-zile încălzire) pe baza temperaturilor lunare.
 * @param {number[]} tempMonth - array cu 12 temperaturi medii lunare [°C]
 * @param {number} tBase - temperatura de bază [°C] (implicit 20°C pentru calibrare clădire)
 * @param {number[]} daysPerMonth - zile pe lună (implicit standard)
 * @returns {number} GZE [K·zi/an]
 */
export function gzeFromMonthlyMeans(tempMonth, tBase = 20, daysPerMonth = DAYS_PER_MONTH) {
  if (!Array.isArray(tempMonth) || tempMonth.length !== 12) return null;
  return tempMonth.reduce((acc, t, i) => {
    if (typeof t !== "number") return acc;
    const delta = tBase - t;
    return delta > 0 ? acc + delta * daysPerMonth[i] : acc;
  }, 0);
}

/**
 * Normalizează un nume de localitate pentru lookup (lowercase, fără diacritice,
 * fără spații/cratime).
 */
function slugifyCity(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimină diacritice
    .replace(/[ăâîșțáéíóú]/gi, (ch) => {
      const map = { ă: "a", â: "a", î: "i", ș: "s", ț: "t" };
      return map[ch.toLowerCase()] || ch;
    })
    .replace(/[-\s]+/g, "");
}

// 9 stații meteo de referință oficiale NA:2023 (Tab A.2.1–A.2.9)
// Valorile `gzeConv` sunt preluate din climate.json (ngz = GZE convențional
// Mc 001-2022 pe sezonul de încălzire, bază efectivă 12°C).
const REFERENCE_STATIONS = new Set([
  "bucuresti",
  "brasov",
  "clujnapoca",
  "constanta",
  "craiova",
  "deva",
  "galati",
  "iasi",
  "timisoara",
]);

/**
 * Construiește indexul CLIMATE_DATA_NA_2023 pornind de la climate.json.
 * Fiecare intrare conține:
 *   - zona: I/II/III/IV/V (conform SR EN 12831-1/NA:2022)
 *   - tExtProiect: temperatură exterioară de proiect [°C]
 *   - tMedAnual: temperatură medie anuală [°C]
 *   - gzeConv: GZE convențional sezon (K·zi/an) — pentru calibrare
 *   - gze20Calc: GZE base 20°C derivat din temp_month (K·zi/an)
 *   - tempMonth: 12 temperaturi medii lunare [°C]
 *   - radiatieSAnual: suma anuală radiație solară pe orientare Sud [kWh/m²] (aprox.)
 *   - lat, alt: latitudine și altitudine stație
 *   - isReferenceStation: true pentru cele 9 stații NA:2023
 */
export const CLIMATE_DATA_NA_2023 = climateJson.reduce((acc, loc) => {
  const slug = slugifyCity(loc.name);
  const tempMonth = loc.temp_month || [];
  // Radiație anuală aproximată: suma sumelor lunare nu e disponibilă direct,
  // folosim valoarea Sud (kWh/m²·sezon) ca indicator + multiplicator ~1.45
  // pentru an întreg (raport tipic Mc 001-2022).
  const radiatieSSezon = loc.solar?.S || 0;
  const radiatieSAnual = Math.round(radiatieSSezon * 1.45);

  acc[slug] = {
    nume: loc.name,
    zona: loc.zone,
    tExtProiect: loc.theta_e,
    tMedAnual: loc.theta_a,
    season: loc.season,
    gzeConv: loc.ngz, // GZE convențional Mc 001-2022 (sezon, bază 12°C)
    gze20Calc: Math.round(gzeFromMonthlyMeans(tempMonth, 20) || 0),
    gze18Calc: Math.round(gzeFromMonthlyMeans(tempMonth, 18) || 0),
    gze12Calc: Math.round(gzeFromMonthlyMeans(tempMonth, 12) || 0),
    tempMonth,
    radiatieSAnual,
    lat: loc.lat,
    alt: loc.alt,
    solar: loc.solar,
    isReferenceStation: REFERENCE_STATIONS.has(slug),
  };
  return acc;
}, {});

// GZE convențional direct ca map `slug → number` pentru convenience
export const GZE_CONVENTIONAL = Object.fromEntries(
  Object.entries(CLIMATE_DATA_NA_2023).map(([slug, d]) => [slug, d.gzeConv])
);

/**
 * Caută date climatice pentru o localitate.
 * @param {string} cityName - numele localității (flexibil cu diacritice/spații)
 * @returns {object|null} - datele climatice sau null dacă nu e găsit
 */
export function lookupClimate(cityName) {
  if (!cityName) return null;
  const slug = slugifyCity(cityName);
  return CLIMATE_DATA_NA_2023[slug] || null;
}

/**
 * Returnează GZE convențional pentru o localitate (pentru calibrare consum).
 * Fallback: București (2925 K·zi/an bază 20°C sau 3170 sezon) dacă nu e găsit.
 * @param {string} cityName
 * @param {number} fallback - valoare fallback dacă nu e găsit
 * @returns {number} - GZE convențional [K·zi/an]
 */
export function getGzeConventional(cityName, fallback = 3170) {
  const d = lookupClimate(cityName);
  return d?.gzeConv ?? fallback;
}

/**
 * Returnează numărul total de localități în baza de date.
 */
export function getLocalityCount() {
  return Object.keys(CLIMATE_DATA_NA_2023).length;
}

/**
 * Returnează lista numelor stațiilor de referință NA:2023.
 */
export function getReferenceStations() {
  return Object.values(CLIMATE_DATA_NA_2023)
    .filter((d) => d.isReferenceStation)
    .map((d) => d.nume);
}
