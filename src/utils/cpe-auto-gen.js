/**
 * cpe-auto-gen.js — Auto-generare cod unic CPE (Sprint 14, Etapa 1 audit 19 apr 2026)
 *
 * Funcție pură care încapsulează logica de derivare a codului unic CPE
 * din datele auditorului (numele se sparge în lastName/firstName, atestat,
 * mdlpaCode, dată, registryIndex). Folosit de useEffect în Step6Certificate
 * pentru a evita un click manual obligatoriu.
 *
 * Întoarce string-ul cod sau null dacă datele sunt insuficiente / invalide.
 */

import { generateCPECode } from "./cpe-code.js";

/**
 * Verifică dacă datele auditorului sunt complete pentru auto-generare.
 *
 * @param {Object} auditor — { name, mdlpaCode, date, atestat?, registryIndex? }
 * @returns {boolean}
 */
export function canAutoGenerateCPE(auditor) {
  if (!auditor || typeof auditor !== "object") return false;
  if (!String(auditor.name || "").trim()) return false;
  if (!String(auditor.mdlpaCode || "").trim()) return false;
  if (!auditor.date) return false;
  return true;
}

/**
 * Derivă lastName și firstName din auditor.name.
 * Convenție Zephren: primul cuvânt = nume de familie, restul = prenume.
 *
 * @param {string} fullName
 * @returns {{ lastName: string, firstName: string }}
 */
export function splitAuditorName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: "", firstName: "" };
  if (parts.length === 1) return { lastName: parts[0], firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

/**
 * Generează codul unic CPE pe baza datelor auditorului + clădirii.
 *
 * Întoarce null dacă datele sunt insuficiente sau dacă generateCPECode aruncă
 * (ex: dată invalidă). Nu aruncă excepții — apelantul poate folosi rezultatul direct.
 *
 * @param {Object} params
 * @param {Object} params.auditor — { name, mdlpaCode, date, atestat?, registryIndex? }
 * @param {Object} params.building — (rezervat — nu folosit de cpe-code curent)
 * @returns {string|null}
 */
export function autoGenerateCPECode({ auditor, building }) {
  if (!canAutoGenerateCPE(auditor)) return null;
  try {
    const { lastName, firstName } = splitAuditorName(auditor.name);
    const code = generateCPECode({
      auditor: {
        lastName,
        firstName,
        atestat: auditor.atestat || "NONE",
        mdlpaCode: auditor.mdlpaCode,
      },
      building: building || {},
      date: auditor.date,
      registryIndex: parseInt(auditor.registryIndex || "1", 10) || 1,
    });
    return code || null;
  } catch (_e) {
    return null;
  }
}
