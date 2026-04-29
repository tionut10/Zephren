/**
 * typicalSolutions.js — Catalog NEUTRU de soluții constructive tipice.
 *
 * Sprint 29 apr 2026: extindere de la 7 preset-uri statice (LAYER_PRESETS în
 * wizardOpaqueCalc.js) la 100+ soluții filtrabile pe era / structură /
 * renovationStatus / element type.
 *
 * Catalog 100% NEUTRU — fără brand-uri, fără linkuri afiliere. Câmpurile
 * `brand`, `supplierId`, `affiliateUrl` sunt rezervate pentru parteneriate
 * post-lansare (același pattern ca suggestions-catalog.js).
 *
 * Structura unei soluții:
 *   id              — slug unic (ex. "PE-zid-pre1970-30")
 *   elementType     — cod tip element (PE, PT, PA, etc. — vezi elementTypes.js)
 *   label           — denumire RO completă (cu diacritice)
 *   shortLabel      — variant scurt pentru carduri compacte
 *   description     — 1 frază tehnică
 *   era             — "pre1970" | "1970-1990" | "1990-2010" | "2010-2020" | "nzeb-2020+"
 *   structure       — "zidarie" | "cadre-ba" | "panou-mare" | "lemn" | "metal" | "mixt"
 *   renovationStatus — "existent" | "renovat" | "nou"
 *   uTypical        — U calculat tipic (W/m²K)
 *   uRange          — { min, max } pentru calcul aproximativ
 *   uClass          — clasa energetică orientativă A+/A/B/.../G
 *   fireClass       — clasa de foc P118/2013 (A1/A2/B/C/D/E/F)
 *   layers          — array { material: string, thickness: mm }
 *                       material = nume EXACT din materials.json
 *                       ordine = EXT → INT (sau echivalent semantic per tip)
 *   tags            — array searchable (audit, nzeb, ro-clasic, low-cost, etc.)
 *   source          — citare normativă explicită
 *   notes           — observație orientativă
 *   ─── rezervat parteneriate ─────────────────────────────────────────────
 *   brand           — null
 *   supplierId      — null
 *   affiliateUrl    — null
 *   sponsored       — false
 *
 * Surse autoritare:
 *   - Mc 001-2022 (toate părțile)
 *   - C 107/0-2002, C 107/1-2005, C 107/2-2005, C 107/3-2005
 *   - STAS 6472/3-89 (clădiri pre-1990)
 *   - GP 058/2000 (reabilitare panou mare)
 *   - SR EN ISO 6946:2017 Annex C
 *   - SR EN ISO 13370:2017 (planșee pe sol)
 *   - P118/2013 (siguranță la foc)
 *   - Ord. MDLPA 16/2023 (anvelopă nZEB)
 *   - SR EN 13830 (perete cortină)
 *   - SR EN 14351-1 (uși exterioare)
 *
 * @module data/typicalSolutions
 */

import TYPICAL_SOLUTIONS_DATA from "./typicalSolutions.json";

// ── Câmpuri rezervate pentru parteneriate viitoare ────────────────────────
const NEUTRAL_FIELDS = {
  brand: null,
  supplierId: null,
  affiliateUrl: null,
  sponsored: false,
};

// ── Catalog complet (sigilat cu câmpurile neutre) ──────────────────────────
export const TYPICAL_SOLUTIONS = TYPICAL_SOLUTIONS_DATA.solutions.map(sol => ({
  ...NEUTRAL_FIELDS,
  ...sol,
}));

// ── Versiune și meta ───────────────────────────────────────────────────────
export const CATALOG_VERSION = TYPICAL_SOLUTIONS_DATA.version;
export const CATALOG_LAST_UPDATED = TYPICAL_SOLUTIONS_DATA.lastUpdated;
export const CATALOG_SOURCES = TYPICAL_SOLUTIONS_DATA.sources;

// ── Constante de filtrare ──────────────────────────────────────────────────
export const ERAS = [
  { id: "pre1970",      label: "Înainte 1970",   yearRange: "<1970" },
  { id: "1970-1990",    label: "1970–1990",      yearRange: "1970-1990" },
  { id: "1990-2010",    label: "1990–2010",      yearRange: "1990-2010" },
  { id: "2010-2020",    label: "2010–2020",      yearRange: "2010-2020" },
  { id: "nzeb-2020+",   label: "nZEB 2020+",     yearRange: ">2020" },
];

export const STRUCTURES = [
  { id: "zidarie",     label: "Zidărie portantă",       icon: "🧱" },
  { id: "cadre-ba",    label: "Cadre BA + zidărie umplere", icon: "🏗️" },
  { id: "panou-mare",  label: "Prefabricat panou mare", icon: "🏢" },
  { id: "lemn",        label: "Lemn (CLT, cadru, masiv)", icon: "🪵" },
  { id: "metal",       label: "Metal (cadre oțel)",     icon: "⚙️" },
  { id: "mixt",        label: "Mixt / hibrid",          icon: "🔀" },
];

export const RENOVATION_STATUSES = [
  { id: "existent",  label: "Existent (audit)",         icon: "🔍" },
  { id: "renovat",   label: "Renovat / reabilitat",     icon: "🔄" },
  { id: "nou",       label: "Construcție nouă",         icon: "🆕" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returnează soluții filtrate după criteriile date.
 * Toate parametrii sunt opționali — dacă nu sunt specificați, nu filtrează.
 *
 * @param {Object} filters
 * @param {string} [filters.elementType] — "PE", "PT", "PA", etc.
 * @param {string} [filters.era] — "pre1970", "nzeb-2020+", etc.
 * @param {string} [filters.structure] — "zidarie", "cadre-ba", etc.
 * @param {string} [filters.renovationStatus] — "existent", "nou", etc.
 * @param {string[]} [filters.tags] — minimum un tag din listă
 * @returns {Array<Object>} Lista soluțiilor care matchează
 */
export function filterSolutions(filters = {}) {
  const { elementType, era, structure, renovationStatus, tags } = filters;
  return TYPICAL_SOLUTIONS.filter(s => {
    if (elementType && s.elementType !== elementType) return false;
    if (era && s.era !== era) return false;
    if (structure && s.structure !== structure) return false;
    if (renovationStatus && s.renovationStatus !== renovationStatus) return false;
    if (tags && tags.length > 0) {
      const sTags = s.tags || [];
      if (!tags.some(t => sTags.includes(t))) return false;
    }
    return true;
  });
}

/**
 * Returnează soluțiile pentru un tip de element, sortate după era (cronologic).
 * @param {string} elementType
 * @returns {Array<Object>}
 */
export function getSolutionsForElementType(elementType) {
  const eraOrder = ERAS.map(e => e.id);
  return TYPICAL_SOLUTIONS
    .filter(s => s.elementType === elementType)
    .sort((a, b) => eraOrder.indexOf(a.era) - eraOrder.indexOf(b.era));
}

/**
 * Returnează soluții grupate după (era × structură) — pentru afișare în UI.
 * @param {string} elementType
 * @returns {Object} cheie = "era_structura", valoare = array soluții
 */
export function getSolutionsGrouped(elementType) {
  const sols = getSolutionsForElementType(elementType);
  const grouped = {};
  sols.forEach(s => {
    const key = `${s.era}_${s.structure}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  return grouped;
}

/**
 * Generează LAYER_PRESETS legacy (compat cu wizardOpaqueCalc.js) din JSON.
 * Reține doar primele 3 soluții/tip pentru a păstra UI-ul curent compact.
 * @returns {Object} { PE: [...], PT: [...], PP: [...], PL: [...], PB: [...] }
 */
export function buildLegacyLayerPresets() {
  const result = {};
  ["PE", "PT", "PP", "PL", "PB"].forEach(type => {
    const sols = getSolutionsForElementType(type)
      .filter(s => s.tags?.includes("popular") || s.tags?.includes("default"))
      .slice(0, 3);
    if (sols.length === 0) {
      // fallback — primele 3 soluții
      result[type] = getSolutionsForElementType(type).slice(0, 3).map(toPresetShape);
    } else {
      result[type] = sols.map(toPresetShape);
    }
  });
  return result;
}

function toPresetShape(s) {
  return {
    id: s.id,
    label: s.shortLabel || s.label,
    desc: s.description,
    layers: s.layers,
  };
}

/**
 * Caută o soluție după id.
 */
export function getSolutionById(id) {
  return TYPICAL_SOLUTIONS.find(s => s.id === id) || null;
}

/**
 * Statistici catalog.
 */
export function getCatalogStats() {
  const byElement = {};
  const byEra = {};
  const byStructure = {};
  TYPICAL_SOLUTIONS.forEach(s => {
    byElement[s.elementType] = (byElement[s.elementType] || 0) + 1;
    byEra[s.era] = (byEra[s.era] || 0) + 1;
    byStructure[s.structure] = (byStructure[s.structure] || 0) + 1;
  });
  return {
    total: TYPICAL_SOLUTIONS.length,
    byElement,
    byEra,
    byStructure,
    version: CATALOG_VERSION,
    lastUpdated: CATALOG_LAST_UPDATED,
  };
}
