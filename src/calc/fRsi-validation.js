/**
 * fRsi-validation.js — Sprint G4 (audit OPUS Max thermal bridges)
 *
 * Validează factorul de temperatură superficială fRsi al punților termice
 * selectate într-un proiect împotriva pragului SR EN ISO 13788:2012 §6.
 *
 * Cerințe normative:
 *   - SR EN ISO 13788:2012 §6 — fRsi ≥ 0,75 obligatoriu pentru spații
 *     rezidențiale RO la T_int=20°C, T_ext_min=-15°C, HR_int=50%
 *   - Mc 001-2022 §11.5 — verificare condens superficial cerută în CPE
 *   - WHO Guidelines for Indoor Air Quality: Dampness and Mould (2009)
 *     — corelare fRsi < 0,65 cu prevalență Stachybotrys (>3x risc)
 *
 * Praguri folosite (per metadata `priority_criteria`):
 *   ≥ 0,80 → A (fără risc)
 *   0,75 – 0,80 → B (acceptabil HR ≤ 50%)
 *   0,70 – 0,75 → C (atenție, HR 50–60%)
 *   0,65 – 0,70 → D (condens sezonier)
 *   < 0,65 → E (risc Stachybotrys frecvent — REFUZ EXPORT)
 */

import { getBridgeDetails } from "./thermal-bridges-metadata.js";

const FRSI_MIN_RESIDENTIAL = 0.75;
const FRSI_MIN_PUBLIC = 0.80;       // spitale, școli, creșe
const FRSI_CRITICAL = 0.65;          // sub acest prag — REFUZ semnătură

/**
 * Returnează pragul fRsi minim conform categoriei clădirii.
 * @param {string} category - 'residential' | 'office' | 'school' | 'hospital' etc.
 */
export function getFRsiThreshold(category) {
  const c = (category || "").toLowerCase();
  if (/spital|hospital|cresa|cresă|gradinita|grădiniță|school|scoala|școala/.test(c)) {
    return FRSI_MIN_PUBLIC;
  }
  return FRSI_MIN_RESIDENTIAL;
}

/**
 * Severitate per fRsi.
 * @param {number} fRsi
 * @returns {'A'|'B'|'C'|'D'|'E'} — A=cel mai bun, E=critic
 */
export function classifyFRsi(fRsi) {
  const n = Number(fRsi);
  if (!Number.isFinite(n)) return "E";
  if (n >= 0.80) return "A";
  if (n >= 0.75) return "B";
  if (n >= 0.70) return "C";
  if (n >= 0.65) return "D";
  return "E";
}

/**
 * Validează un set de punți termice împotriva pragului fRsi.
 *
 * @param {Array<{name:string, psi:number|string, length:number|string}>} bridges
 *   — punțile selectate în proiect
 * @param {object} opts
 * @param {string} [opts.buildingCategory] — pentru prag dinamic (rezidențial/public)
 * @returns {{
 *   valid: boolean,
 *   threshold: number,
 *   problems: Array<{name, fRsi, classification, severity}>,
 *   critical: Array<...>,
 *   warning: Array<...>,
 *   missingMetadata: Array<string>
 * }}
 */
export function validateBridgesFRsi(bridges, { buildingCategory = "residential" } = {}) {
  const threshold = getFRsiThreshold(buildingCategory);
  const problems = [];
  const critical = [];   // sub 0,65 — STOP
  const warning = [];    // 0,65–0,75 — necesită override
  const missingMetadata = [];

  if (!Array.isArray(bridges) || bridges.length === 0) {
    return { valid: true, threshold, problems: [], critical: [], warning: [], missingMetadata: [] };
  }

  bridges.forEach(b => {
    const name = b?.name || "(fără nume)";
    const details = getBridgeDetails(name);

    if (!details || !Number.isFinite(details.fRsi_typical)) {
      missingMetadata.push(name);
      return;
    }

    const fRsi = details.fRsi_typical;
    if (fRsi < threshold) {
      const severity = fRsi < FRSI_CRITICAL ? "critical" : "warning";
      const entry = {
        name,
        fRsi,
        classification: classifyFRsi(fRsi),
        severity,
        threshold,
        gap: Math.round((threshold - fRsi) * 1000) / 1000,
      };
      problems.push(entry);
      if (severity === "critical") critical.push(entry);
      else warning.push(entry);
    }
  });

  return {
    valid: critical.length === 0 && warning.length === 0,
    threshold,
    problems,
    critical,
    warning,
    missingMetadata,
  };
}

/**
 * Generează text de motivare obligatorie pentru override (folosit în modal).
 * @param {Array} problems
 * @returns {string} text minim de șabloane
 */
export function suggestOverrideRationale(problems) {
  if (!problems || problems.length === 0) return "";
  const types = [...new Set(problems.map(p => p.classification))];
  if (types.includes("E") || types.includes("D")) {
    return "Auditorul confirmă că proprietarul a fost informat despre riscul de condens sezonier și mucegai (fRsi < 0,75) și acceptă răspunderea pentru remedierea ulterioară. Detaliile critice sunt marcate în Anexa 2 ca prioritate de intervenție 4-5.";
  }
  return "Auditorul confirmă că valoarea fRsi sub 0,75 corespunde unui spațiu cu HR sub 50% (climat interior controlat) sau unei tipologii constructive specifice (vernacular RO, monument istoric) unde îmbunătățirea ar afecta valoarea patrimonială. Justificarea detaliată este consemnată în memoriul tehnic.";
}
