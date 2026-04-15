/**
 * wizardOpaqueCalc.js — Funcții pure extrase din WizardOpaque.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 */

import MATERIALS_DB from "../../../data/materials.json";
import { U_REF_NZEB_RES, U_REF_NZEB_NRES, getURefNZEB } from "../../../data/u-reference.js";
export { U_REF_NZEB_RES, U_REF_NZEB_NRES, getURefNZEB };

// ── Tipuri elemente (subset cu cele 5 tipice) ────────────────────────────────
export const ELEMENT_TYPES_WIZARD = [
  { id: "PE", label: "Perete exterior",         icon: "🧱", tau: 1.0, rsi: 0.13, rse: 0.04 },
  { id: "PT", label: "Planșeu terasă",          icon: "🏛", tau: 1.0, rsi: 0.10, rse: 0.04 },
  { id: "PP", label: "Planșeu sub pod",          icon: "🏠", tau: 0.9, rsi: 0.10, rse: 0.10 },
  { id: "PL", label: "Placă pe sol",             icon: "🏗", tau: 0.5, rsi: 0.17, rse: 0.00 },
  { id: "PB", label: "Planșeu peste subsol",     icon: "🕳", tau: 0.5, rsi: 0.17, rse: 0.17 },
];

// ── Presets standard — straturi din exterior la interior ──────────────────────
export const LAYER_PRESETS = {
  PE: [
    {
      id: "PE-clasic",
      label: "Cărămidă 30 + EPS 10",
      desc: "Cel mai frecvent ansamblu rezidențial România",
      layers: [
        { material: "Tencuială acrilică (exterior)", thickness: 5 },
        { material: "EPS 031 (λ=0.031 — Neopor/grafitat)", thickness: 100 },
        { material: "Cărămidă plină", thickness: 300 },
        { material: "Tencuială de ipsos", thickness: 15 },
      ],
    },
    {
      id: "PE-bca",
      label: "BCA 25 + vată 10",
      desc: "Ansamblu modern eficient energetic",
      layers: [
        { material: "Tencuială acrilică (exterior)", thickness: 5 },
        { material: "Vată bazaltică fațadă", thickness: 100 },
        { material: "BCA (beton celular autoclavizat)", thickness: 250 },
        { material: "Tencuială de ipsos", thickness: 15 },
      ],
    },
    {
      id: "PE-prefab",
      label: "BA 25 + EPS 15",
      desc: "Panou prefabricat termoizolat (blocuri 1960-1990)",
      layers: [
        { material: "Tencuială acrilică (exterior)", thickness: 5 },
        { material: "EPS 031 (λ=0.031 — Neopor/grafitat)", thickness: 150 },
        { material: "Beton armat", thickness: 250 },
        { material: "Tencuială de ipsos", thickness: 15 },
      ],
    },
  ],
  PT: [
    {
      id: "PT-clasic",
      label: "Terasă BA + EPS 20",
      desc: "Terasă circulabilă modernă",
      layers: [
        { material: "Mortar de pozare gresie (M15)", thickness: 30 },
        { material: "EPS 031 (λ=0.031 — Neopor/grafitat)", thickness: 200 },
        { material: "Membrană EPDM", thickness: 3 },
        { material: "Beton armat", thickness: 180 },
        { material: "Tencuială de ipsos", thickness: 15 },
      ],
    },
  ],
  PP: [
    {
      id: "PP-pod",
      label: "Planșeu pod + vată 20",
      desc: "Vată bazaltică în pod necirculabil",
      layers: [
        { material: "Vată bazaltică acoperiș", thickness: 200 },
        { material: "Beton armat", thickness: 150 },
        { material: "Tencuială de ipsos", thickness: 15 },
      ],
    },
  ],
  PL: [
    {
      id: "PL-clasic",
      label: "Placă pe sol + XPS 10",
      desc: "Placă monolită pe XPS sub șapă",
      layers: [
        { material: "Mortar de pozare gresie (M15)", thickness: 20 },
        { material: "Șapă autonivelantă", thickness: 50 },
        { material: "XPS 200 kPa (fundații ușoare, λ=0.034)", thickness: 100 },
        { material: "Beton armat", thickness: 150 },
      ],
    },
  ],
  PB: [
    {
      id: "PB-subsol",
      label: "Planșeu peste subsol + EPS 10",
      desc: "Subsol neîncălzit",
      layers: [
        { material: "Mortar de pozare gresie (M15)", thickness: 20 },
        { material: "Șapă autonivelantă", thickness: 50 },
        { material: "EPS 031 (λ=0.031 — Neopor/grafitat)", thickness: 100 },
        { material: "Beton armat", thickness: 200 },
      ],
    },
  ],
};

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
