/**
 * bridgesCalc.js — Funcții pure extrase din WizardBridges.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 *
 * Sprint Audit Pas 2 (4 mai 2026) — extindere acoperire wizard:
 *   - MAIN_CATEGORIES păstrate la 6 (compat retroactiv test legacy)
 *   - CATEGORY_GROUPS adaugă pattern matching la cele 31 categorii reale
 *     din thermal-bridges.json (acoperire 12% → 100%)
 *   - getAllInGroup(groupKey) returnează TOATE punțile dintr-o grupă
 *   - LENGTH_RULES + getLengthRule(name) — ghidaj ISO 14683 §5 per tip
 */

import THERMAL_BRIDGES_DB from "../../../data/thermal-bridges.json";

// ── Categorii principale (top 6) — LEGACY, păstrate pentru getQuickPicks ────
export const MAIN_CATEGORIES = [
  { id: "Joncțiuni pereți", icon: "🧱", label: "Joncțiuni pereți",
    hint: "Planșee, colțuri, socluri, subsol" },
  { id: "Ferestre",         icon: "🪟", label: "Ferestre & glafuri",
    hint: "Perimetrul tâmplăriei, praguri, pervazuri" },
  { id: "Balcoane",         icon: "🏛", label: "Balcoane & logii",
    hint: "Console, parapeți, ruptoare termice" },
  { id: "Acoperiș",         icon: "🏠", label: "Acoperiș & cornișe",
    hint: "Coame, streașini, luminatoare, atice" },
  { id: "Stâlpi/grinzi",    icon: "📏", label: "Stâlpi & grinzi",
    hint: "Structură beton/metalică în perete" },
  { id: "Instalații",       icon: "⚙️", label: "Instalații",
    hint: "Țevi, canale, coșuri, casete rolete" },
];

// ── Grupe extinse cu pattern matching ────────────────────────────────────────
// Fiecare grupă include MAI MULTE categorii din thermal-bridges.json prin
// `subCats` (array de string-uri exact match) și `subCatPattern` (regex opțional).
// Acoperirea totală = 31/31 categorii reale prin GROUP `subCats` distincte.
//
// Sursă numărătoare reală thermal-bridges.json (204 punți):
//   Fundații și subsol 15 / Joncțiuni pereți tipuri speciale 11 /
//   Fațade și ferestre avansate 10 / Joncțiuni speciale 9 /
//   Joncțiuni pereți 9 / Ferestre și uși tipuri speciale 9 /
//   Structuri din lemn 8 / Retrofit ETICS 8 / Instalații avansate 8 /
//   Balcoane și logii tipuri speciale 8 / Acoperiș tipuri speciale 8 /
//   Acoperiș avansat 8 / Structuri speciale 7 / Passivhaus / nZEB 7 /
//   Structuri prefabricate 6 / Sisteme ETICS 6 / Instalații tipuri speciale 6 /
//   Ferestre 6 / Elemente punctuale (chi) 6 / Balcoane avansate 6 /
//   Acoperiș 6 / Stâlpi/grinzi 5 / Sandwich panel 5 / Instalații 4 /
//   CLT / Mass Timber 4 / Balcoane 4 / Balcoane moderne 4 /
//   Vernacular RO 3 / Fundații moderne 3 / Acoperiș complex 3 /
//   Curtain wall 2
export const CATEGORY_GROUPS = [
  {
    key: "perete",
    icon: "🧱",
    label: "Joncțiuni pereți & socluri",
    hint: "Colțuri, planșee, socluri, fundații, fațade prefabricate, ETICS",
    subCats: [
      "Joncțiuni pereți",
      "Joncțiuni pereți – tipuri speciale",
      "Joncțiuni speciale",
      "Fundații și subsol",
      "Fundații moderne",
      "Sisteme ETICS",
      "Retrofit ETICS",
      "Structuri prefabricate",
      "Sandwich panel",
      "Vernacular RO",
    ],
  },
  {
    key: "fereastra",
    icon: "🪟",
    label: "Ferestre, uși & fațade vitrate",
    hint: "Glafuri, praguri, jambe, perete cortină, fațade avansate",
    subCats: [
      "Ferestre",
      "Ferestre și uși – tipuri speciale",
      "Fațade și ferestre avansate",
      "Curtain wall",
    ],
  },
  {
    key: "balcon",
    icon: "🏛",
    label: "Balcoane, logii & console",
    hint: "Balcoane traversante, ruptură termică Schöck, console metalice",
    subCats: [
      "Balcoane",
      "Balcoane moderne",
      "Balcoane avansate",
      "Balcoane și logii – tipuri speciale",
    ],
  },
  {
    key: "acoperis",
    icon: "🏠",
    label: "Acoperiș, atic & cornișe",
    hint: "Coame, streașini, atice, terase verzi, mansarde complexe",
    subCats: [
      "Acoperiș",
      "Acoperiș avansat",
      "Acoperiș complex",
      "Acoperiș – tipuri speciale",
    ],
  },
  {
    key: "structura",
    icon: "📏",
    label: "Stâlpi, grinzi & structură",
    hint: "Beton armat, metal, lemn CLT, structuri speciale",
    subCats: [
      "Stâlpi/grinzi",
      "Structuri din lemn",
      "Structuri speciale",
      "CLT / Mass Timber",
    ],
  },
  {
    key: "instalatii",
    icon: "⚙️",
    label: "Instalații, coșuri & rolete",
    hint: "Țevi, canale, coșuri fum, casete rolete, treceri",
    subCats: [
      "Instalații",
      "Instalații avansate",
      "Instalații – tipuri speciale",
    ],
  },
  {
    key: "passivhaus",
    icon: "🌟",
    label: "Passivhaus / nZEB premium",
    hint: "Detalii ψ < 0.05 W/(m·K), certificate PHI",
    subCats: ["Passivhaus / nZEB"],
  },
  {
    key: "punctuale",
    icon: "•",
    label: "Punți punctuale χ [W/K]",
    hint: "Fixatori, ancore, console punctuale (×N nu ×L)",
    subCats: ["Elemente punctuale (chi)"],
  },
];

/**
 * Returnează primele 4 punți termice din categoria specificată (LEGACY).
 * Compat retroactiv cu wizardBridges.test.js care cere exact-match pe `cat`.
 *
 * @param {string} catId - ID exact al categoriei din MAIN_CATEGORIES
 * @returns {Array} max 4 bridge-uri cu { name, psi, cat, ... }
 */
export function getQuickPicks(catId) {
  const all = THERMAL_BRIDGES_DB.filter(b => b.cat === catId);
  return all.slice(0, 4);
}

/**
 * Returnează TOATE punțile termice dintr-o grupă (toate sub-categoriile).
 * Folosit de WizardBridges.jsx pentru extinderea acoperirii la 100% catalog.
 *
 * @param {string} groupKey - Cheie grupă din CATEGORY_GROUPS (perete, fereastra, etc.)
 * @returns {Array} toate bridge-urile din toate sub-categoriile grupei
 */
export function getAllInGroup(groupKey) {
  const group = CATEGORY_GROUPS.find(g => g.key === groupKey);
  if (!group) return [];
  return THERMAL_BRIDGES_DB.filter(b => group.subCats.includes(b.cat));
}

/**
 * Grupează punțile dintr-o grupă pe sub-categorie pentru afișare cu separatori.
 * Returnează array de { subCat, bridges } în ordinea din subCats.
 *
 * @param {string} groupKey
 * @returns {Array<{subCat: string, bridges: Array}>}
 */
export function getGroupedInCategory(groupKey) {
  const group = CATEGORY_GROUPS.find(g => g.key === groupKey);
  if (!group) return [];
  return group.subCats
    .map(subCat => ({
      subCat,
      bridges: THERMAL_BRIDGES_DB.filter(b => b.cat === subCat),
    }))
    .filter(g => g.bridges.length > 0);
}

/**
 * Estimează lungimea sugerată (m) pentru o punte termică pe baza geometriei clădirii.
 * @param {string} bridgeName - Numele punții (din thermal-bridges.json)
 * @param {Object} building   - Date clădire (building.areaUseful)
 * @returns {string} lungime estimată ca string (pentru input default)
 */
export function suggestLength(bridgeName, building) {
  const perim = 4 * Math.sqrt(parseFloat(building?.areaUseful) || 100);
  if (bridgeName.includes("Planșeu intermediar"))   return (perim * 0.8).toFixed(1);
  if (bridgeName.includes("Planșeu terasă"))        return perim.toFixed(1);
  if (bridgeName.includes("Planșeu peste subsol"))  return perim.toFixed(1);
  if (bridgeName.includes("Soclu"))                 return perim.toFixed(1);
  if (bridgeName.includes("Colț"))                  return "10";
  if (bridgeName.includes("Glaf"))                  return "24";
  if (bridgeName.includes("Prag"))                  return "4";
  if (bridgeName.includes("Consolă"))               return "8";
  if (bridgeName.includes("Cornișă"))               return perim.toFixed(1);
  if (bridgeName.includes("Coamă"))                 return (perim * 0.4).toFixed(1);
  if (bridgeName.includes("Atic"))                  return perim.toFixed(1);
  if (bridgeName.includes("Stâlp"))                 return "12";
  if (bridgeName.includes("Grindă"))                return "6";
  if (bridgeName.includes("Țeavă") || bridgeName.includes("Canal")) return "2";
  if (bridgeName.includes("Coș"))                   return "8";
  if (bridgeName.includes("Roletă"))                return "6";
  return "5";
}

// ── Reguli de măsurare lungime ψ — ISO 14683:2017 §5 ─────────────────────────
// Convenția catalogului ISO 14683 Annex C: ψ_e calibrat pentru DIMENSIUNI EXTERNE.
// `getLengthRule(bridgeName)` returnează tooltip text scurt pentru UI.
export const LENGTH_RULE_GLOBAL = "ISO 14683:2017 §5 — lungimi măsurate pe DIMENSIUNI EXTERIOARE (perimetru/înălțime ext.). Colțurile se contorizează O SINGURĂ DATĂ.";

const LENGTH_RULES = [
  {
    match: (n) => n.includes("Planșeu intermediar"),
    text: "Lungime = perimetrul EXTERIOR al planșeului intermediar [m]. Per nivel."
  },
  {
    match: (n) => n.includes("Planșeu terasă") || n.includes("Atic"),
    text: "Lungime = perimetrul EXTERIOR al terasei / aticului [m]."
  },
  {
    match: (n) => n.includes("Planșeu peste subsol") || n.includes("Soclu"),
    text: "Lungime = perimetrul EXTERIOR la cota ±0.00 [m]."
  },
  {
    match: (n) => n.includes("Colț"),
    text: "Lungime = înălțimea EXTERIOARĂ a colțului [m]. Contorizat O SINGURĂ DATĂ."
  },
  {
    match: (n) => n.includes("Cornișă") || n.includes("Streașină"),
    text: "Lungime = perimetrul EXTERIOR al cornișei [m]."
  },
  {
    match: (n) => n.includes("Coamă"),
    text: "Lungime = lungimea coamei (vârf acoperiș) [m]. Tipic 40% din perimetru."
  },
  {
    match: (n) => n.includes("Glaf") || n.includes("Pervaz") || n.includes("Buiandrug"),
    text: "Lungime = lățimea EXTERIOARĂ a golului fereastră [m]. Per fereastră × nr. ferestre."
  },
  {
    match: (n) => n.includes("Jambă") || n.includes("Montant"),
    text: "Lungime = înălțimea EXTERIOARĂ a montantului [m]. Per fereastră × 2 (dr+stg)."
  },
  {
    match: (n) => n.includes("Prag"),
    text: "Lungime = lățimea EXTERIOARĂ a pragului ușii [m]. Per ușă."
  },
  {
    match: (n) => n.includes("Consolă") || n.includes("Balcon"),
    text: "Lungime = lățimea EXTERIOARĂ a consolei (frontul balconului) [m]. Per balcon."
  },
  {
    match: (n) => n.includes("Stâlp") || n.includes("Coloană"),
    text: "Lungime = înălțimea EXTERIOARĂ a stâlpului [m]. Per stâlp × nr. stâlpi."
  },
  {
    match: (n) => n.includes("Grindă") || n.includes("Centură"),
    text: "Lungime = lungimea EXTERIOARĂ a grinzii / centurii [m]."
  },
  {
    match: (n) => n.includes("Fundație") || n.includes("fundație") || n.includes("Soclu"),
    text: "Lungime = perimetrul EXTERIOR la cota ±0.00 [m]."
  },
  {
    match: (n) => n.includes("Țeavă") || n.includes("Canal") || n.includes("Trecere"),
    text: "Lungime = lățimea trecerii prin perete [m]. De obicei 0.2-0.5 m per trecere × N."
  },
  {
    match: (n) => n.includes("Coș"),
    text: "Lungime = înălțimea EXTERIOARĂ a coșului în zona izolată [m]."
  },
  {
    match: (n) => n.includes("Roletă") || n.includes("casetă"),
    text: "Lungime = lățimea casetei rolete (egală cu lățimea ferestrei) [m] × nr. casete."
  },
  {
    match: (n) => n.includes("Rost"),
    text: "Lungime = lungimea rostului vertical sau orizontal pe fațadă [m]."
  },
];

/**
 * Returnează regula de măsurare lungime ψ pentru o punte specifică (ISO 14683 §5).
 * Fallback: regula globală "dimensiune EXTERIOARĂ".
 *
 * @param {string} bridgeName - Numele punții
 * @returns {string} Tooltip text (max ~120 caractere)
 */
export function getLengthRule(bridgeName) {
  if (!bridgeName) return LENGTH_RULE_GLOBAL;
  const rule = LENGTH_RULES.find(r => r.match(bridgeName));
  return rule ? rule.text : LENGTH_RULE_GLOBAL;
}
