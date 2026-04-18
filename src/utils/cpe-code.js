/**
 * Cod unic CPE — format Ord. MDLPA 16/2023 + L.238/2024.
 *
 * Format:
 *   {mdlpaCode}_{YYYY-MM-DD}_{Nume}_{Prenume}_{Serie}_{Număr}_{idxRegistru}_CPE_{hash8}
 *
 * Exemplu:
 *   12345_2026-04-18_Popescu_Ion_RO_4567_12_CPE_a3f7b9c2
 *
 * Segmentele:
 *   - mdlpaCode      : nr. MDLPA al auditorului (cod unic din registru)
 *   - YYYY-MM-DD     : data emiterii CPE
 *   - Nume / Prenume : fără spații, diacritice permise (normalizate în pattern)
 *   - Serie / Număr  : split din auditor.atestat (format "SERIE/NUMAR")
 *   - idxRegistru    : index incremental în registrul local al auditorului
 *   - hash8          : UUID v5 slice(0,8) pentru unicitate globală — deterministic
 *
 * Pentru UUID v5 folosim namespace DNS standard (RFC 4122).
 */
import { v5 as uuidv5 } from "uuid";

// Namespace DNS standard RFC 4122 — valoare fixă pentru reproducibilitate
export const CPE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Generează codul unic CPE pornind de la datele auditorului, clădirii și
 * poziția înregistrării în registrul local.
 *
 * @param {Object} p
 * @param {Object} p.auditor          {lastName, firstName, atestat, mdlpaCode}
 * @param {Object} p.building         (rezervat pentru viitor — ex: cadastru)
 * @param {Date|string} p.date        data emiterii
 * @param {number} p.registryIndex    index în registrul local (1, 2, ...)
 * @returns {string}
 */
export function generateCPECode({ auditor, building, date, registryIndex }) {
  const a = auditor || {};
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) {
    throw new Error("generateCPECode: data invalidă");
  }
  const dateStr = d.toISOString().slice(0, 10);

  // Normalizare nume — fără spații, fără caractere speciale (dar diacritice păstrate)
  const fn = String(a.lastName || "").replace(/\s+/g, "").trim();
  const pn = String(a.firstName || "").replace(/\s+/g, "").trim();

  // Split atestat "SERIE/NUMAR" — ex: "RO/4567"
  const atestatRaw = String(a.atestat || "NONE");
  const [series, number] = atestatRaw.includes("/")
    ? atestatRaw.split("/").map((s) => s.trim())
    : [atestatRaw, ""];

  const mdlpa = String(a.mdlpaCode || "NONE").replace(/\s+/g, "");
  const idx = Number.isFinite(+registryIndex) ? +registryIndex : 1;

  // Hash determinist UUID v5 — primul 8 hex chars
  const hashInput = `${fn}_${pn}_${dateStr}_${mdlpa}_${idx}`;
  const uuid = uuidv5(hashInput, CPE_NAMESPACE);
  const hash8 = uuid.replace(/-/g, "").slice(0, 8);

  return `${mdlpa}_${dateStr}_${fn}_${pn}_${series}_${number}_${idx}_CPE_${hash8}`;
}

/**
 * Validează formatul codului unic CPE.
 *
 * Reguli:
 *   - mdlpaCode = alfanumeric + punct/dash (min 1)
 *   - date = YYYY-MM-DD
 *   - nume/prenume = încep cu majusculă (permite diacritice ĂÂÎȘȚ)
 *   - serie = 2-3 majuscule (ex: RO, BUC)
 *   - număr = cifre
 *   - idxRegistru = cifre
 *   - _CPE_
 *   - hash8 = 8 cifre hex
 *
 * @param {string} code
 * @returns {boolean}
 */
export function validateCPECode(code) {
  if (typeof code !== "string") return false;
  const pattern =
    /^[A-Za-z0-9.\-/]+_\d{4}-\d{2}-\d{2}_[A-ZĂÂÎȘȚ][A-Za-zăâîșțĂÂÎȘȚ\-]*_[A-ZĂÂÎȘȚ][A-Za-zăâîșțĂÂÎȘȚ\-]*_[A-Z]{1,4}_\d+_\d+_CPE_[a-f0-9]{8}$/;
  return pattern.test(code);
}

/**
 * Parsează un cod CPE existent și extrage componentele.
 * Întoarce null dacă formatul e invalid.
 */
export function parseCPECode(code) {
  if (!validateCPECode(code)) return null;
  const parts = code.split("_");
  // format: mdlpa, date, lastName, firstName, series, number, idx, "CPE", hash
  if (parts.length !== 9) return null;
  return {
    mdlpaCode: parts[0],
    date: parts[1],
    lastName: parts[2],
    firstName: parts[3],
    series: parts[4],
    number: parts[5],
    registryIndex: parseInt(parts[6], 10),
    hash8: parts[8],
  };
}
