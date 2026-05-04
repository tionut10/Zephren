/**
 * glazingCalc.js — Funcții pure extrase din WizardGlazing.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 *
 * Formula U total = U_vitraj*(1-fr) + U_ramă*fr + ΔU_spacer  (ISO 10077-1)
 *
 * Sprint Catalog NEUTRAL 30 apr 2026: extindere GLAZING_DB + FRAME_DB cu
 * intrările din glazingTypes.json (22) + frameTypes.json (17), mapate la
 * schema legacy (icon + desc generate automat dacă lipsesc).
 */

import GLAZING_TYPES_DATA from "../../../data/glazingTypes.json";
import FRAME_TYPES_DATA from "../../../data/frameTypes.json";

// ── Legacy entries (păstrate pentru backward compat + UI rich) ──────────────
const _LEGACY_GLAZING = [
  { name: "Simplu vitraj",                u: 5.80, g: 0.85, icon: "⬜", desc: "Vechi / ne-izolant — renovare urgentă recomandată" },
  { name: "Dublu vitraj (4-12-4)",        u: 2.80, g: 0.75, icon: "🟦", desc: "Standard anii '90 — nu atinge nZEB" },
  { name: "Dublu vitraj termoizolant",    u: 1.60, g: 0.65, icon: "🟦", desc: "Minim acceptabil renovare" },
  { name: "Dublu vitraj Low-E",           u: 1.10, g: 0.50, icon: "🟩", desc: "Atinge nZEB rezidențial (U ≤ 1.11)" },
  { name: "Triplu vitraj",                u: 0.90, g: 0.50, icon: "🟩", desc: "Nou rezidențial — performanță bună" },
  { name: "Triplu vitraj Low-E",          u: 0.70, g: 0.45, icon: "🟩", desc: "Premium — clădiri pasive" },
  { name: "Triplu vitraj 2×Low-E",        u: 0.50, g: 0.40, icon: "🟩", desc: "Top performanță — casa pasivă" },
];

const _LEGACY_FRAMES = [
  { name: "PVC (5 camere)",       u: 1.30, icon: "◽", desc: "Cel mai folosit — raport bun preț/performanță" },
  { name: "PVC (6-7 camere)",     u: 1.10, icon: "◽", desc: "Premium PVC — nZEB-ready" },
  { name: "Lemn stratificat",     u: 1.40, icon: "🟫", desc: "Estetic — întreținere periodică" },
  { name: "Aluminiu fără RPT",    u: 5.00, icon: "▫️", desc: "NU folosi în climă rece — punte termică majoră" },
  { name: "Aluminiu cu RPT",      u: 2.00, icon: "▫️", desc: "Acceptabil — RPT = ruperea punții termice" },
  { name: "Lemn-aluminiu",        u: 1.20, icon: "🟫", desc: "Premium combo — lemn interior, aluminiu exterior" },
];

// ── Helper: pictograma generată automat după Ug (vitraje) sau material (rame)
function _autoIconGlazing(ug) {
  if (ug >= 3) return "⬜";
  if (ug >= 1.5) return "🟦";
  return "🟩";
}
function _autoIconFrame(material) {
  if (material === "lemn") return "🟫";
  if (material === "aluminiu") return "▫️";
  if (material === "compozit") return "🟪";
  if (material === "hibrid") return "🟧";
  return "◽";
}

// ── Extindere din glazingTypes.json (41 entries v2.0, deduplicate după name)
// Batch C (4 mai 2026): include uși/skylight/curtain wall via elementCategory.
const _EXTENDED_GLAZING = (GLAZING_TYPES_DATA.glazings || []).map(gl => ({
  id: gl.id,
  name: gl.label,
  shortLabel: gl.shortLabel,
  u: gl.ug,
  g: gl.g,
  tlight: gl.tlight,
  composition: gl.composition,
  era: gl.era,
  icon: _autoIconGlazing(gl.ug),
  desc: gl.notes ? gl.notes.slice(0, 100) : (gl.composition || ""),
  tags: gl.tags || [],
  source: gl.source,
  // Batch C: propagă elementCategory pentru filtrare în UI
  elementCategory: gl.elementCategory || "window",
  brand: null, supplierId: null, affiliateUrl: null, sponsored: false,
}));

// ── Categorii element vitrat — pentru filtrare UI (P1-3 fix) ─────────────
// Sursă: glazingTypes.json v2.0 elementCategories[]
export const ELEMENT_CATEGORIES = GLAZING_TYPES_DATA.elementCategories || [
  { id: "window",      label: "Fereastră" },
  { id: "door",        label: "Ușă exterioară" },
  { id: "skylight",    label: "Skylight / luminator" },
  { id: "curtainwall", label: "Perete cortină" },
];

/**
 * Filtrează vitrajele (window/door/skylight/curtainwall).
 * @param {string} category - "window" | "door" | "skylight" | "curtainwall"
 * @returns {Array} entries cu elementCategory egal
 */
export function filterGlazingByCategory(category) {
  return GLAZING_DB.filter(g =>
    g.elementCategory === category ||
    (!g.elementCategory && category === "window") // legacy fallback
  );
}

/**
 * Returnează numărul de intrări per categorie (pentru afișare statistică UI).
 * @returns {Object} { window: N, door: N, skylight: N, curtainwall: N }
 */
export function countByCategory() {
  const counts = { window: 0, door: 0, skylight: 0, curtainwall: 0 };
  GLAZING_DB.forEach(g => {
    const cat = g.elementCategory || "window";
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}

const _glazingNames = new Set(_LEGACY_GLAZING.map(g => g.name.toLowerCase()));
export const GLAZING_DB = [
  ..._LEGACY_GLAZING,
  ..._EXTENDED_GLAZING.filter(g => !_glazingNames.has(g.name.toLowerCase())),
];

// ── Extindere din frameTypes.json (17 entries, deduplicate după name) ──────
const _EXTENDED_FRAMES = (FRAME_TYPES_DATA.frames || []).map(fr => ({
  id: fr.id,
  name: fr.label,
  shortLabel: fr.shortLabel,
  u: fr.uf,
  material: fr.material,
  thickness_mm: fr.thickness_mm,
  chambers: fr.chambers,
  era: fr.era,
  icon: _autoIconFrame(fr.material),
  desc: fr.notes ? fr.notes.slice(0, 100) : (fr.material || ""),
  tags: fr.tags || [],
  source: fr.source,
  brand: null, supplierId: null, affiliateUrl: null, sponsored: false,
}));

const _frameNames = new Set(_LEGACY_FRAMES.map(f => f.name.toLowerCase()));
export const FRAME_DB = [
  ..._LEGACY_FRAMES,
  ..._EXTENDED_FRAMES.filter(f => !_frameNames.has(f.name.toLowerCase())),
];

// ── U_REF vitraj (Mc 001-2022) ────────────────────────────────────────────
export const U_REF_GLAZING = { nzeb_res: 1.11, nzeb_nres: 1.20, renov: 1.20, door: 1.30 };

// ── ψ_spacer parametrizat (EN ISO 10077-1:2017 §5.4 + Annex E) ─────────────
// Valori bilingv RO/EN cu surse normative explicite. P1-1 fix.
export const SPACER_TYPES = [
  {
    id: "alu_clasic",
    label: "Aluminiu clasic (spacer rece)",
    labelEn: "Aluminium classic (cold spacer)",
    psi: 0.10,
    psiRange: { min: 0.08, max: 0.11 },
    desc: "Spacer aluminiu standard. Punte termică majoră — interzis nZEB.",
    source: "EN ISO 10077-1:2017 Annex E Tab. E.1",
    era: "pre1995",
  },
  {
    id: "alu_modern",
    label: "Aluminiu modificat (TGI/U-channel)",
    labelEn: "Aluminium modified (TGI/U-channel)",
    psi: 0.08,
    psiRange: { min: 0.06, max: 0.09 },
    desc: "Spacer alu cu profil U sau TGI. Tranziție 1995-2010.",
    source: "EN ISO 10077-1:2017 Annex E Tab. E.1",
    era: "1995-2010",
  },
  {
    id: "warm_edge_std",
    label: "Warm-edge standard (TGI / Swisspacer V / Thermix)",
    labelEn: "Warm-edge standard",
    psi: 0.05,
    psiRange: { min: 0.04, max: 0.06 },
    desc: "Spacer plastic/inox cu rupere termică. Tipic 2010-2020.",
    source: "EN ISO 10077-1:2017 Annex E Tab. E.1",
    era: "2010-2020",
  },
  {
    id: "warm_edge_premium",
    label: "Warm-edge premium (Swisspacer Ultimate / Super Spacer)",
    labelEn: "Warm-edge premium",
    psi: 0.03,
    psiRange: { min: 0.025, max: 0.04 },
    desc: "Spacer silicon/spumă cu performanță superioară. Standard nZEB.",
    source: "EN ISO 10077-1:2017 Annex E + EN ISO 12567-1",
    era: "nzeb-2020+",
  },
  {
    id: "foam_passivhaus",
    label: "Foam Passivhaus (Super Spacer TriSeal / Ödland)",
    labelEn: "Foam Passivhaus-certified",
    psi: 0.025,
    psiRange: { min: 0.02, max: 0.03 },
    desc: "Spacer foam certificat PHI. Necesar Uw ≤ 0.80 W/m²K.",
    source: "Passivhaus Institut Component Database; EN ISO 10077-1",
    era: "nzeb-2020+",
  },
];

/**
 * Returnează obiectul SPACER_TYPES pentru un id sau heuristic din numele ramei.
 * Backward compat: numele ramei "Aluminiu" → alu_clasic; altfel → warm_edge_std.
 *
 * @param {string} spacerId - id explicit din SPACER_TYPES
 * @param {string} frameName - fallback dacă spacerId lipsește
 * @returns {object} entry SPACER_TYPES
 */
export function resolveSpacer(spacerId, frameName) {
  if (spacerId) {
    const found = SPACER_TYPES.find(s => s.id === spacerId);
    if (found) return found;
  }
  // Heuristic legacy pentru compat retroactiv
  const isAlu = (frameName || "").toLowerCase().includes("aluminiu");
  return isAlu ? SPACER_TYPES[0] : SPACER_TYPES[2]; // alu_clasic / warm_edge_std
}

/**
 * Returnează U_ref nZEB pentru vitraj/ușă vitrată.
 * @param {string}  category - Categoria clădirii (RI, RC, RA = rezidențial)
 * @param {boolean} isDoor   - True dacă e ușă vitrată
 * @returns {number}
 */
export function getURefGlazing(category, isDoor) {
  if (isDoor) return U_REF_GLAZING.door;
  return ["RI", "RC", "RA"].includes(category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
}

/**
 * Calculează U total fereastră (ISO 10077-1).
 * U_total = U_vitraj*(1-fr) + U_ramă*fr + ψ_spacer*P_sticlă/A
 *
 * P1-1 fix: spacerId parametru explicit (înlocuiește heuristic 0.04/0.08).
 * Compat retroactiv: dacă spacerId lipsește, folosește euristica legacy.
 *
 * @param {string} glazingName  - Numele din GLAZING_DB
 * @param {string} frameName    - Numele din FRAME_DB
 * @param {number|string} frameRatio - Fracție ramă în % (ex: 30 pentru 30%)
 * @param {number|string} area  - Suprafața totală în m²
 * @param {string} [spacerId]   - id SPACER_TYPES (alu_clasic, warm_edge_std, etc.)
 * @returns {{ u, g, uGlass, uFrame, deltaUSpacer, psiSpacer, spacerLabel }}
 */
export function computeUTotal(glazingName, frameName, frameRatio, area, spacerId) {
  const gl = GLAZING_DB.find(g => g.name === glazingName);
  const fr = FRAME_DB.find(f => f.name === frameName);
  if (!gl || !fr) return { u: 0, g: 0, uFrame: 0, deltaUSpacer: 0, psiSpacer: 0, spacerLabel: "", warnings: [] };

  // P2-2: validări fără clamp tăcut — collect warnings, propagate input invalid
  const warnings = [];
  const fRatioRaw = parseFloat(frameRatio);
  const aRaw = parseFloat(area);
  if (!Number.isFinite(fRatioRaw) || fRatioRaw <= 0) warnings.push("Fracție ramă invalidă — folosit fallback 30%");
  if (!Number.isFinite(aRaw) || aRaw <= 0) warnings.push("Suprafață invalidă — calcul dezactivat");
  if (gl.u <= 0) warnings.push(`U_g=${gl.u} ≤ 0 — vitraj invalid`);
  if (fr.u <= 0) warnings.push(`U_f=${fr.u} ≤ 0 — ramă invalidă`);

  // Dacă A invalid, nu calculăm — întoarcem rezultat clar invalid
  if (!Number.isFinite(aRaw) || aRaw <= 0) {
    return { u: 0, g: 0, uFrame: fr.u, uGlass: gl.u, deltaUSpacer: 0, psiSpacer: 0, spacerLabel: "", warnings };
  }

  const fRatio = (Number.isFinite(fRatioRaw) && fRatioRaw > 0 ? fRatioRaw : 30) / 100;
  const a = aRaw; // NU mai aplicăm Math.max(...,0.5) silentios
  const aspect = Math.sqrt(a);
  const perimGlass = aspect > 0 ? 2 * (aspect + aspect * 0.7) : 4;
  const spacer = resolveSpacer(spacerId, fr.name);
  const psiSpacer = spacer.psi;
  const deltaUSpacer = a > 0 ? psiSpacer * perimGlass / a : 0;
  const uTotal = gl.u * (1 - fRatio) + fr.u * fRatio + deltaUSpacer;
  const gEff = gl.g * (1 - fRatio);

  if (uTotal < 0) warnings.push("U_total < 0 — verifică datele de intrare");

  return {
    u: uTotal,
    g: gEff,
    uFrame: fr.u,
    uGlass: gl.u,
    deltaUSpacer,
    psiSpacer,
    spacerLabel: spacer.label,
    spacerId: spacer.id,
    warnings,
  };
}
