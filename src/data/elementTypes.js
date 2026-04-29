/**
 * elementTypes.js — Catalog complet de tipuri de element constructiv (anvelopă).
 *
 * Extindere de la 5 → 16 tipuri (Sprint Catalog Soluții Tip — 29 apr 2026).
 * Pre-existent: PE, PT, PP, PL, PB (în wizardOpaqueCalc.js).
 * Adăugate: PI, PR, PS, PA, PM, PV, US, UN, AT, AC_VERDE, PI_INTERMED.
 *
 * Câmpuri:
 *   id          — cod scurt (folosit în u-reference.js, suggestions-catalog.js, etc.)
 *   label       — denumire RO cu diacritice
 *   shortLabel  — variant scurt pentru carduri compacte
 *   icon        — emoji pentru selector vizual
 *   category    — perete | acoperiș | planșeu | placă | ușă | atic
 *   tau         — coeficient de reducere a flux-ului (Mc 001-2022 §3.2.4)
 *   rsi, rse    — rezistențe superficiale ISO 6946 Tabel 7
 *   uRefIndex   — cheia în U_REF_NZEB_RES/NRES (poate fi null pt. PI/PI_INTERMED)
 *   inEnvelope  — face parte din anvelopa termică? (false → spațiu interior)
 *   layerOrder  — "EXT_TO_INT" | "TOP_TO_BOTTOM" (informativ pentru UI)
 *
 * Surse normative:
 *   - Mc 001-2022 Tabel 2.4/2.7/2.10a/b (U_ref nZEB / renovare)
 *   - SR EN ISO 6946:2017 Tabel 7 (rezistențe superficiale Rse, Rsi)
 *   - C 107/0-2002 §3 (clasificare elemente anvelopă)
 */

// ── Lista completă (16 tipuri) ──────────────────────────────────────────────
export const ELEMENT_TYPES = [
  // ── PEREȚI ────────────────────────────────────────────────────────────────
  {
    id: "PE", label: "Perete exterior", shortLabel: "Perete ext.",
    icon: "🧱", category: "perete",
    tau: 1.0, rsi: 0.13, rse: 0.04, uRefIndex: "PE",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Perete între spațiu încălzit și aer exterior.",
  },
  {
    id: "PR", label: "Perete către spațiu neîncălzit", shortLabel: "Perete neîncălz.",
    icon: "🚪", category: "perete",
    tau: 0.8, rsi: 0.13, rse: 0.13, uRefIndex: "PR",
    inEnvelope: true, layerOrder: "INT_TO_NONHEATED",
    description: "Perete către casa scării, garaj alipit, depozit neîncălzit.",
  },
  {
    id: "PS", label: "Perete subteran (sub CTS)", shortLabel: "Perete subteran",
    icon: "⛏️", category: "perete",
    tau: 0.5, rsi: 0.13, rse: 0.0, uRefIndex: "PS",
    inEnvelope: true, layerOrder: "EXT_GROUND_TO_INT",
    description: "Perete subsol/demisol în contact cu pământul, sub CTS.",
  },
  {
    id: "PI", label: "Perete interior (între spații încălzite)", shortLabel: "Perete int.",
    icon: "🏠", category: "perete",
    tau: 0.0, rsi: 0.13, rse: 0.13, uRefIndex: null,
    inEnvelope: false, layerOrder: "INT_TO_INT",
    description: "Perete despărțitor între camere — nu transfer termic în anvelopă, doar masă/acustică.",
  },
  {
    id: "AT", label: "Atic / parapet", shortLabel: "Atic",
    icon: "🏛️", category: "atic",
    tau: 1.0, rsi: 0.10, rse: 0.04, uRefIndex: "PE",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Element vertical deasupra nivelului acoperișului (parapet, atic).",
  },

  // ── ACOPERIȘURI ───────────────────────────────────────────────────────────
  {
    id: "PT", label: "Planșeu terasă (acoperiș plat)", shortLabel: "Terasă",
    icon: "🟫", category: "acoperis",
    tau: 1.0, rsi: 0.10, rse: 0.04, uRefIndex: "PT",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Acoperiș plat / terasă circulabilă sau necirculabilă.",
  },
  {
    id: "PA", label: "Acoperiș înclinat (între căpriori)", shortLabel: "Înclinat",
    icon: "🔺", category: "acoperis",
    tau: 1.0, rsi: 0.10, rse: 0.04, uRefIndex: "PT",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Acoperiș tipic mansardă cu izolație între/peste/sub căpriori.",
  },
  {
    id: "PM", label: "Mansardă (plan înclinat sub învelitoare)", shortLabel: "Mansardă",
    icon: "⛰️", category: "acoperis",
    tau: 1.0, rsi: 0.10, rse: 0.04, uRefIndex: "PT",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Plan înclinat al mansardei, atunci când e diferențiat de structură PA.",
  },
  {
    id: "PP", label: "Planșeu sub pod neîncălzit", shortLabel: "Sub pod",
    icon: "🏚️", category: "acoperis",
    tau: 0.9, rsi: 0.10, rse: 0.10, uRefIndex: "PP",
    inEnvelope: true, layerOrder: "TOP_TO_BOTTOM",
    description: "Planșeu între ultimul nivel încălzit și podul necirculabil.",
  },
  {
    id: "AC_VERDE", label: "Acoperiș verde (extensiv/intensiv)", shortLabel: "Acoperiș verde",
    icon: "🌿", category: "acoperis",
    tau: 1.0, rsi: 0.10, rse: 0.04, uRefIndex: "PT",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Acoperiș plat cu strat vegetal, substrat și drenaj.",
  },

  // ── PLANȘEE INFERIOARE / PLĂCI ────────────────────────────────────────────
  {
    id: "PL", label: "Placă pe sol", shortLabel: "Placă sol",
    icon: "🟦", category: "placa",
    tau: 0.5, rsi: 0.17, rse: 0.0, uRefIndex: "PL",
    inEnvelope: true, layerOrder: "BOTTOM_GROUND_TO_TOP",
    description: "Placă în contact direct cu solul (parter fără subsol).",
  },
  {
    id: "PB", label: "Planșeu peste subsol neîncălzit", shortLabel: "Peste subsol",
    icon: "🕳️", category: "planseu",
    tau: 0.5, rsi: 0.17, rse: 0.17, uRefIndex: "PB",
    inEnvelope: true, layerOrder: "TOP_TO_NONHEATED",
    description: "Planșeu între parter încălzit și subsol/demisol neîncălzit.",
  },
  {
    id: "PV", label: "Planșeu peste pasaj/exterior", shortLabel: "Peste pasaj",
    icon: "🌉", category: "planseu",
    tau: 1.0, rsi: 0.17, rse: 0.04, uRefIndex: "PB",
    inEnvelope: true, layerOrder: "TOP_TO_EXT",
    description: "Planșeu deasupra unui pasaj deschis sau spațiu exterior.",
  },
  {
    id: "PI_INTERMED", label: "Planșeu intermediar (între nivele încălzite)", shortLabel: "Intermediar",
    icon: "📐", category: "planseu",
    tau: 0.0, rsi: 0.17, rse: 0.17, uRefIndex: null,
    inEnvelope: false, layerOrder: "TOP_TO_BOTTOM",
    description: "Planșeu între două nivele încălzite — nu intră în calcul anvelopă, doar masă termică/acustică.",
  },

  // ── UȘI OPACE ─────────────────────────────────────────────────────────────
  {
    id: "US", label: "Ușă opacă exterior", shortLabel: "Ușă ext.",
    icon: "🚪", category: "usa",
    tau: 1.0, rsi: 0.13, rse: 0.04, uRefIndex: "SE",
    inEnvelope: true, layerOrder: "EXT_TO_INT",
    description: "Ușă exterioară opacă (fără vitraj sau cu <30% suprafață vitrată).",
  },
  {
    id: "UN", label: "Ușă către spațiu neîncălzit", shortLabel: "Ușă neîncălz.",
    icon: "🚪", category: "usa",
    tau: 0.8, rsi: 0.13, rse: 0.13, uRefIndex: "SE",
    inEnvelope: true, layerOrder: "INT_TO_NONHEATED",
    description: "Ușă către casa scării, garaj alipit etc.",
  },
];

// ── Compat backward — subset original (5 tipuri) ──────────────────────────
export const ELEMENT_TYPES_LEGACY_5 = ["PE", "PT", "PP", "PL", "PB"];

// ── Helpers ───────────────────────────────────────────────────────────────
export function getElementType(id) {
  return ELEMENT_TYPES.find(t => t.id === id) || null;
}

export function getElementTypesByCategory(category) {
  return ELEMENT_TYPES.filter(t => t.category === category);
}

export function getEnvelopeElementTypes() {
  return ELEMENT_TYPES.filter(t => t.inEnvelope);
}

export const ELEMENT_CATEGORIES = [
  { id: "perete", label: "Pereți", icon: "🧱" },
  { id: "acoperis", label: "Acoperișuri", icon: "🔺" },
  { id: "planseu", label: "Planșee", icon: "📐" },
  { id: "placa", label: "Plăci pe sol", icon: "🟦" },
  { id: "usa", label: "Uși opace", icon: "🚪" },
  { id: "atic", label: "Atic / parapet", icon: "🏛️" },
];
