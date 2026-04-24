/**
 * thermal-bridges-layers.js — Stratigrafii tipice românești + factori corecție ψ
 *
 * Oferă:
 *   - Catalog 20 stratigrafii standard (pereți PE / planșeu terasă PT / pod PP /
 *     planșeu sol PL) cu straturi detaliate exterior→interior, λ, R strat și U total
 *   - Factori corecție ψ pe combinații (punte, tipologie constructivă)
 *   - Calculator U din straturi conform SR EN ISO 6946:2017
 *   - Sugestii automate stratigrafie pe baza anului construcției
 *
 * Referințe normative (toate în vigoare 2026):
 *   - C107/3-2005 (consolidat Ord. 2513/2010 + Ord. 386/2016) — Anexa E (valori λ),
 *     Anexa G (clasificare punți), Anexa K (catalog punți uzuale), Tabele 1-73
 *   - C107/1-2005 — Calcul coeficienți globali izolare termică locuințe
 *   - C107/6-2002 — Pardoseli
 *   - Mc 001-2022 — Ord. MDLPA 16/2023, Anexa B (punți în audit)
 *   - SR EN ISO 6946:2017 — Rezistență termică elemente (metodă stratificare)
 *   - SR EN ISO 12524 / EN ISO 10456 — Valori λ tabelare materiale construcție
 *   - SR EN ISO 13370:2017 — Transfer termic prin sol
 *   - SR EN ISO 14683:2017 — Punți termice, valori implicite
 *   - SR EN ISO 10211:2017 — Calcule detaliate punți (2D/3D)
 *   - SR EN ISO 13788 — Condens superficial (fRsi pentru evaluare risc)
 *   - SR EN ISO 52016-1:2017 + A1:2025 — Sarcini termice orar (per strat)
 *   - EN 13162-13171 — Specificații izolații MW/EPS/XPS/PUR/PF
 */

import DATA from "../data/thermal-bridges-constructions.json";
import { classifyIsoLevel } from "./thermal-bridges-metadata.js";

// ── Constante publice ────────────────────────────────────────────────────────

export const CONSTRUCTIONS_META = DATA._meta;
export const CONSTRUCTIONS_NORMATIVE_BASIS = DATA._meta.normative_basis;
export const CONSTRUCTIONS_LAMBDA_SOURCES = DATA._meta.lambda_sources;

/** Rsi / Rse conform SR EN ISO 6946:2017 Tab. 7 */
export const SURFACE_RESISTANCES = DATA._meta.Rsi_Rse;

// ── Categorii de elemente ────────────────────────────────────────────────────

export const ELEMENT_CATEGORIES = {
  PE: { name_ro: "Perete exterior", name_en: "External wall" },
  PT: { name_ro: "Planșeu terasă", name_en: "Flat roof / terrace" },
  PP: { name_ro: "Planșeu pod (șarpantă)", name_en: "Loft floor / pitched roof" },
  PL: { name_ro: "Planșeu pe sol", name_en: "Ground-bearing slab" },
  PB: { name_ro: "Planșeu peste subsol neîncălzit", name_en: "Floor above unheated basement" },
};

// ── Helperi de acces ─────────────────────────────────────────────────────────

/**
 * Returnează toate stratigrafiile din catalog.
 * @returns {Array<object>}
 */
export function getAllConstructions() {
  return Object.values(DATA.constructions);
}

/**
 * Returnează stratigrafiile filtrate după categorie (PE/PT/PP/PL).
 * @param {string} category
 * @returns {Array<object>}
 */
export function getConstructionsByCategory(category) {
  return getAllConstructions().filter(c => c.category === category);
}

/**
 * Returnează o stratigrafie după ID (ex. "PE-01").
 * @param {string} id
 * @returns {object|null}
 */
export function getConstructionById(id) {
  return DATA.constructions[Object.keys(DATA.constructions).find(k => DATA.constructions[k].id === id)] || null;
}

/**
 * Returnează straturile unei stratigrafii (exterior → interior).
 * @param {string} id
 * @returns {Array<object>}
 */
export function getConstructionLayers(id) {
  const c = getConstructionById(id);
  return c?.layers_ext_to_int || [];
}

// ── Calcul U/R din straturi (SR EN ISO 6946:2017) ────────────────────────────

/**
 * Calculează R total (m²·K/W) dintr-o listă de straturi folosind SR EN ISO 6946:2017.
 * Include Rsi + Rse (rezistențe superficiale) în funcție de orientarea elementului.
 *
 * @param {Array<{d_mm: number, lambda: number|null, R: number}>} layers
 * @param {string} orientation - "perete_vertical" | "planseu_ascendent_vertical"
 *   | "planseu_descendent_vertical" | "sol"
 * @returns {number} R total [m²·K/W]
 */
export function calcRFromLayers(layers, orientation = "perete_vertical") {
  if (!Array.isArray(layers) || layers.length === 0) return 0;

  const surfaces = SURFACE_RESISTANCES[orientation] || SURFACE_RESISTANCES.perete_vertical;
  let R = surfaces.Rsi + surfaces.Rse;

  for (const layer of layers) {
    // Dacă R e dat direct (de ex. pentru spațiu de aer), folosim valoarea
    if (typeof layer.R === "number" && layer.R > 0) {
      R += layer.R;
      continue;
    }
    // Altfel calculăm R = d/λ (d în m, λ în W/(m·K))
    if (typeof layer.d_mm === "number" && typeof layer.lambda === "number" && layer.lambda > 0) {
      R += (layer.d_mm / 1000) / layer.lambda;
    }
  }

  return Math.round(R * 1000) / 1000;
}

/**
 * Calculează U total (W/(m²·K)) dintr-o stratigrafie.
 * @param {string} id - ID stratigrafie
 * @param {string} orientation - orientare (opțional)
 * @returns {number} U [W/(m²·K)]
 */
export function calcUFromConstruction(id, orientation) {
  const c = getConstructionById(id);
  if (!c) return 0;

  // Dacă e deja calculat în JSON, întoarcem valoarea declarată
  if (typeof c.U_total === "number") return c.U_total;

  // Altfel calculăm din straturi
  const defaultOrientation =
    c.category === "PT" ? "planseu_ascendent_vertical" :
    c.category === "PP" ? "planseu_ascendent_vertical" :
    c.category === "PL" ? "sol" :
    "perete_vertical";

  const R = calcRFromLayers(c.layers_ext_to_int, orientation || defaultOrientation);
  return R > 0 ? Math.round((1 / R) * 1000) / 1000 : 0;
}

// ── Factori corecție ψ ──────────────────────────────────────────────────────

/**
 * Returnează factorul multiplicativ pentru ajustarea ψ pe baza
 * tipologiei constructive. Default 1.0 dacă nu există override.
 *
 * @param {string} bridgeName - numele punții (cheie din thermal-bridges.json)
 * @param {string} constructionId - ID stratigrafie (ex. "PE-01")
 * @returns {number} factor (0.4...1.6)
 */
export function getPsiFactor(bridgeName, constructionId) {
  const overrides = DATA.psi_variations[bridgeName];
  if (!overrides || typeof overrides[constructionId] !== "number") return 1.0;
  return overrides[constructionId];
}

/**
 * Returnează ψ ajustat pentru combinația (punte, stratigrafie).
 * @param {object} bridge - intrare din thermal-bridges.json cu câmpul psi
 * @param {string} constructionId
 * @returns {{ psi_base: number, factor: number, psi_adjusted: number,
 *             iso_class_base: string, iso_class_adjusted: string }}
 */
export function adjustPsiForConstruction(bridge, constructionId) {
  const psi_base = Number(bridge.psi) || 0;
  const factor = getPsiFactor(bridge.name, constructionId);
  const psi_adjusted = Math.round(psi_base * factor * 1000) / 1000;
  return {
    psi_base,
    factor,
    psi_adjusted,
    iso_class_base: classifyIsoLevel(psi_base),
    iso_class_adjusted: classifyIsoLevel(psi_adjusted),
  };
}

// ── Sugestii automate ───────────────────────────────────────────────────────

/**
 * Sugerează o stratigrafie probabilă pe baza anului și a categoriei clădirii.
 * Heuristic bazat pe practica constructivă românească:
 *   - <1945: zidărie piatră izolație interioară
 *   - 1960-1990: IPCT panouri prefabricate
 *   - 1990-2005: cărămidă cu EPS (reabilitat)
 *   - 2005-2015: cărămidă GVP + EPS 10-15
 *   - 2015+: BCA + EPS/MW 15+ cm (NZEB)
 *   - Case lemn: timber frame / CLT / SIP
 *
 * @param {object} params - { year: number, structureType?: string }
 * @returns {string|null} construction id recomandat sau null
 */
export function suggestConstruction({ year, structureType }) {
  if (structureType) {
    const s = structureType.toLowerCase();
    if (s.includes("clt")) return "PE-08";
    if (s.includes("sip")) return "PE-09";
    if (s.includes("lemn") || s.includes("timber")) return "PE-07";
    if (s.includes("ipct") || s.includes("prefab")) return "PE-06";
    if (s.includes("piatr")) return "PE-10";
    if (s.includes("bca")) return year && year >= 2020 ? "PE-04" : "PE-03";
    if (s.includes("beton") && s.includes("monolit")) return "PE-05";
  }

  if (typeof year !== "number") return null;
  if (year < 1945) return "PE-10";
  if (year >= 1960 && year <= 1990) return "PE-06";
  if (year >= 1991 && year <= 2005) return "PE-01";
  if (year >= 2006 && year <= 2015) return "PE-02";
  if (year >= 2016 && year <= 2020) return "PE-03";
  if (year >= 2021) return "PE-04";
  return "PE-02";
}

// ── Raport straturi (pentru UI/print) ────────────────────────────────────────

/**
 * Returnează un rezumat text al straturilor pentru o stratigrafie.
 * Format: "[EPS 100mm λ=0,040] + [Cărămidă 250mm λ=0,80] + ..."
 * @param {string} id
 * @returns {string}
 */
export function formatLayersSummary(id) {
  const layers = getConstructionLayers(id);
  if (!layers.length) return "";
  return layers.map(l => {
    const mat = l.material.split(/[(,]/)[0].trim();
    const d = l.d_mm != null ? `${l.d_mm}mm` : "—";
    const lambda = typeof l.lambda === "number" ? `λ=${l.lambda.toFixed(3)}` : "";
    return `[${mat} ${d}${lambda ? " " + lambda : ""}]`;
  }).join(" + ");
}

/**
 * Verifică dacă o stratigrafie satisface U_max conform C107/Mc 001-2022.
 * @param {string} constructionId
 * @param {number} U_max - valoare maximă admisă [W/(m²·K)]
 * @returns {{ compliant: boolean, U: number, U_max: number, margin: number }}
 */
export function checkConstructionCompliance(constructionId, U_max) {
  const U = calcUFromConstruction(constructionId);
  return {
    compliant: U <= U_max,
    U,
    U_max,
    margin: Math.round((U_max - U) * 1000) / 1000,
  };
}
