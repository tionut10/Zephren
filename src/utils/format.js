/**
 * format.js — Helpere unificate de formatare numerică și unități de măsură.
 *
 * Audit 2 mai 2026 — P1.16: înainte existau 3+ variante pentru același helper:
 *   - `fmt(v, d)` în CpeAnexa.jsx (toFixed + dot)
 *   - `fmtRo(v, d)` în CpeAnexa.jsx (toFixed + comma)
 *   - `fmtRo(v, dec=1)` în Step6Certificate.jsx (idem)
 *   - implementări inline pe diverse path-uri DOCX/XML
 *
 * UNIT_LABEL e sursa unică pentru convenția de unități în output-urile
 * CPE oficiale (format MDLPA cu virgulă: „kWh/m²,an").
 * Pentru output-uri tehnice / XML / comentarii cod folosim notația ISO
 * cu punct mediu: „kWh/(m²·an)".
 */

/**
 * Format numeric localizat (RO=virgulă, EN=punct).
 * @param {number|string} value
 * @param {number} decimals
 * @param {"RO"|"EN"} lang
 * @returns {string}
 */
export function fmtNum(value, decimals = 1, lang = "RO") {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(lang === "RO" ? "ro-RO" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false, // CPE/audit: fără separator mii (consistent cu MDLPA)
  });
}

/** Format procent (cu simbol). */
export function fmtPct(value, decimals = 1, lang = "RO") {
  return `${fmtNum(value, decimals, lang)}%`;
}

/** Format suprafață (m²). */
export function fmtArea(value, decimals = 1, lang = "RO") {
  return `${fmtNum(value, decimals, lang)} m²`;
}

/** Format volum (m³). */
export function fmtVolume(value, decimals = 1, lang = "RO") {
  return `${fmtNum(value, decimals, lang)} m³`;
}

/**
 * Format dată per limbă.
 * RO: dd.mm.yyyy (format MDLPA)
 * EN: yyyy-mm-dd (ISO 8601)
 *
 * @param {string|Date} date
 * @param {"RO"|"EN"} lang
 * @returns {string}
 */
export function fmtDate(date, lang = "RO") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  if (lang === "EN") {
    return d.toISOString().slice(0, 10);
  }
  // RO: dd.mm.yyyy
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Convenții oficiale pentru unități de măsură.
 *
 * Sursă unică pentru toate output-urile CPE/Anexă/XML. Pentru documentele
 * MDLPA folosim formatul „kWh/m²,an" (cu virgulă, ortografia oficială
 * Ord. 16/2023). Pentru notații tehnice/ISO folosim „kWh/(m²·an)".
 */
export const UNIT_LABEL = Object.freeze({
  // CPE oficial — format MDLPA cu virgulă
  EP_OFFICIAL: "kWh/m²,an",
  CO2_OFFICIAL: "kgCO₂/m²,an",
  // Notație tehnică ISO 52000
  EP_ISO: "kWh/(m²·an)",
  CO2_ISO: "kgCO₂eq/(m²·an)",
  // Unități fizice
  AREA: "m²",
  VOLUME: "m³",
  POWER: "kW",
  POWER_W: "W",
  ENERGY_YEAR: "kWh/an",
  TEMPERATURE: "°C",
  N50: "1/h",
  U_VALUE: "W/(m²·K)",
  R_VALUE: "(m²·K)/W",
  G_VALUE: "W/(m³·K)",
});

/**
 * Format complet valoare + unitate (ex. „125,3 kWh/m²,an").
 * @param {number|string} value
 * @param {string} unit — etichetă unitate (folosește UNIT_LABEL.X)
 * @param {number} decimals
 * @param {"RO"|"EN"} lang
 * @returns {string}
 */
export function fmtWithUnit(value, unit, decimals = 1, lang = "RO") {
  return `${fmtNum(value, decimals, lang)} ${unit}`;
}
