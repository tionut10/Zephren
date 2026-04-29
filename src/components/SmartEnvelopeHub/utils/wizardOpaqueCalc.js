/**
 * wizardOpaqueCalc.js — Funcții pure extrase din WizardOpaque.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 *
 * Sprint 29 apr 2026: extindere de la 5 → 16 tipuri de element și de la 7 →
 * 73+ soluții tip catalog NEUTRAL (typicalSolutions.json). Catalogul vechi
 * `LAYER_PRESETS` rămâne ca fallback compat retroactiv pentru teste vechi —
 * dar codul nou folosește direct `getSolutionsForElementType` din
 * `typicalSolutions.js`.
 */

import MATERIALS_DB from "../../../data/materials.json";
import { U_REF_NZEB_RES, U_REF_NZEB_NRES, getURefNZEB } from "../../../data/u-reference.js";
import { ELEMENT_TYPES, ELEMENT_TYPES_LEGACY_5, getElementType } from "../../../data/elementTypes.js";
import {
  TYPICAL_SOLUTIONS,
  filterSolutions,
  getSolutionsForElementType,
  buildLegacyLayerPresets,
} from "../../../data/typicalSolutions.js";

export { U_REF_NZEB_RES, U_REF_NZEB_NRES, getURefNZEB };
export { ELEMENT_TYPES, getElementType };
export { TYPICAL_SOLUTIONS, filterSolutions, getSolutionsForElementType };

// ── Wizard ELEMENT_TYPES (16 tipuri complete) ────────────────────────────────
// Compat: ELEMENT_TYPES_WIZARD legacy = subset 5 tipuri (PE, PT, PP, PL, PB)
//         ELEMENT_TYPES_WIZARD_FULL = toate 16 tipurile noi
export const ELEMENT_TYPES_WIZARD_FULL = ELEMENT_TYPES.map(t => ({
  id: t.id,
  label: t.label,
  shortLabel: t.shortLabel,
  icon: t.icon,
  category: t.category,
  tau: t.tau,
  rsi: t.rsi,
  rse: t.rse,
}));

// Subset legacy compat (5 tipuri originale) — pentru teste vechi care
// verifică `expect(ELEMENT_TYPES_WIZARD).toHaveLength(5)`.
export const ELEMENT_TYPES_WIZARD = ELEMENT_TYPES_WIZARD_FULL.filter(t =>
  ELEMENT_TYPES_LEGACY_5.includes(t.id)
);

// ── LAYER_PRESETS legacy (compat retroactiv) ─────────────────────────────────
// Generat dinamic din typicalSolutions.json — primele 3 soluții cu tag
// `popular` sau `default` per tip element.
export const LAYER_PRESETS = buildLegacyLayerPresets();

/**
 * Construiește un strat din materials.json pe baza numelui — propagă TOATE câmpurile.
 * @param {string} name         - Numele materialului
 * @param {number} thicknessMm  - Grosimea în mm
 * @returns {Object} layer cu material, matName, thickness, lambda, rho, mu, cp, src
 */
export function buildLayerFromMaterialName(name, thicknessMm) {
  const mat = MATERIALS_DB.find(m => m.name === name);
  if (!mat) {
    return { material: name, matName: name, thickness: thicknessMm, lambda: 0, rho: 0, mu: 0, cp: 0, src: "" };
  }
  return {
    material: mat.name,
    matName: mat.name,
    thickness: thicknessMm,
    lambda: mat.lambda ?? 0,
    rho: mat.rho ?? 0,
    mu: mat.mu ?? 0,
    cp: mat.cp ?? 0,
    src: mat.src ?? "",
  };
}

/**
 * Aplică o soluție tip din catalog peste un element nou — convertește
 * layer-urile (material + thickness mm) la formatul wizard cu λ/ρ/μ/cp/src
 * propagate din materials.json.
 *
 * @param {string} solutionId — ID din TYPICAL_SOLUTIONS (ex. "PE-zid-pre1970-30")
 * @returns {Object|null} { id, label, layers: [...completeLayers] }
 */
export function applyTypicalSolution(solutionId) {
  const sol = TYPICAL_SOLUTIONS.find(s => s.id === solutionId);
  if (!sol) return null;
  return {
    ...sol,
    layers: sol.layers.map(l => buildLayerFromMaterialName(l.material, l.thickness)),
  };
}
