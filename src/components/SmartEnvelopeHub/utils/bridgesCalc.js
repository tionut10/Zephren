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

// ── Metoda globală ΔU_tb forfetar — Mc 001-2022 §3.2.6 ───────────────────────
// Alternativă la calculul detaliat ψ × L pentru auditori care nu au atlas
// punți disponibil. Aplicare: ΔU_tb se adaugă la fiecare U opac al elementelor
// din anvelopă (efect echivalent cu pierdere globală suplimentară).
//
// Sursă: Mc 001-2022 §3.2.6 Tab. 3.18 + ISO 14683:2017 §6.4 metoda C.
//
// Trei niveluri de calitate execuție:
//   A — execuție foarte bună (Passivhaus, atestat) → ΔU_tb = 0.05 W/m²K
//   B — execuție bună (standard nZEB respectat)    → ΔU_tb = 0.10 W/m²K
//   C — execuție medie (renovare pre-2010)         → ΔU_tb = 0.15 W/m²K
export const GLOBAL_TB_LEVELS = [
  {
    id: "A",
    label: "A — Execuție foarte bună",
    deltaU: 0.05,
    desc: "Passivhaus / clădiri certificate / atlas punți respectat",
    source: "Mc 001-2022 §3.2.6 Tab. 3.18",
  },
  {
    id: "B",
    label: "B — Execuție bună",
    deltaU: 0.10,
    desc: "Standard nZEB respectat / detalii constructive corecte",
    source: "Mc 001-2022 §3.2.6 Tab. 3.18",
  },
  {
    id: "C",
    label: "C — Execuție medie",
    deltaU: 0.15,
    desc: "Renovare pre-2010 / detalii constructive cu compromisuri",
    source: "Mc 001-2022 §3.2.6 Tab. 3.18",
  },
];

/**
 * Calculează pierderea globală echivalentă (W/K) pentru metoda forfetar ΔU_tb.
 * Folosit ca alternativă la Σ(ψ·L) când auditorul alege metoda globală.
 *
 * @param {string} levelId - "A" | "B" | "C"
 * @param {number} areaEnvelope - Suprafață anvelopă opacă [m²]
 * @returns {{ deltaU: number, totalLoss: number, level: object } | null}
 */
export function computeGlobalTbLoss(levelId, areaEnvelope) {
  const level = GLOBAL_TB_LEVELS.find(l => l.id === levelId);
  if (!level || !areaEnvelope || areaEnvelope <= 0) return null;
  return {
    deltaU: level.deltaU,
    totalLoss: level.deltaU * areaEnvelope,
    level,
  };
}

// ── Clase calitate calcul Ψ (ISO 14683:2017 §7.3) ───────────────────────────
// Folosit pentru documentarea sursei de date — afectează încrederea în Σ(ψ·L).
// P1-8 fix: introducerea explicită a clasei A/B/C/D în queue.
export const PSI_QUALITY_CLASSES = [
  {
    id: "A",
    label: "A — Calcul numeric 2D/3D certificat",
    desc: "THERM, Flixo, Heat3D, Bisco. Marja eroare ±0.005 W/(m·K).",
    color: "emerald",
    confidence: "Foarte ridicată",
  },
  {
    id: "B",
    label: "B — Atlas verificat",
    desc: "ROCKWOOL, Schöck, NSAI TD, BRE. Calcule certificate per detaliu.",
    color: "sky",
    confidence: "Ridicată",
  },
  {
    id: "C",
    label: "C — Default ISO 14683 Annex C",
    desc: "Valori conservative (~+50% vs A). Fallback când lipsesc detalii.",
    color: "amber",
    confidence: "Medie (conservativ)",
  },
  {
    id: "D",
    label: "D — Estimare empirică / nevalidată",
    desc: "Fără sursă citabilă. Pentru audit indicativ, NU pentru certificare.",
    color: "red",
    confidence: "Redusă",
  },
];

// ── Surse referință acceptate pentru ψ — UI dropdown ────────────────────────
export const PSI_SOURCES = [
  { id: "iso_14683_annex_c",  label: "ISO 14683:2017 Annex C (default catalog)" },
  { id: "atlas_rockwool",     label: "ROCKWOOL Thermal Bridge Atlas" },
  { id: "atlas_schock",       label: "Schöck Isokorb Catalogue" },
  { id: "atlas_nsai_td",      label: "NSAI TD (Ireland)" },
  { id: "atlas_bre",          label: "BRE 497 / BR 443 (UK)" },
  { id: "calc_2d_therm",      label: "Calcul 2D — THERM/Flixo (proiectant)" },
  { id: "calc_2d_heat3d",     label: "Calcul 3D — Heat3D / Bisco" },
  { id: "passivhaus_db",      label: "Passivhaus Institut Component DB" },
  { id: "experimental",       label: "Măsurare experimentală in situ" },
  { id: "empiric",            label: "Estimare empirică (audit indicativ)" },
];

/**
 * Returnează clasa de calitate per ID.
 * @param {string} classId - "A" | "B" | "C" | "D"
 * @returns {object|null}
 */
export function getPsiQualityClass(classId) {
  return PSI_QUALITY_CLASSES.find(c => c.id === classId) || null;
}

// ── Tooltip-uri educaționale per tip punte (P2-8 fix) ────────────────────────
// Conțin: ce E punte, când APARE, cum se ELIMINĂ. Folosit ca tooltip pe
// fiecare quick-pick din WizardBridges pentru a învăța auditorul.
const EDUCATION_TOOLTIPS = [
  {
    match: (n) => /Plan[șs]eu intermediar/i.test(n),
    text: "Punte la joncțiunea perete exterior cu planșeul intermediar (ex. între etaj 1-2). Apare când planșeul beton armat traversează izolația ETICS. Se elimină prin continuitatea izolației pe toată înălțimea fațadei (overlap ≥ 50 mm peste planșeu)."
  },
  {
    match: (n) => /Plan[șs]eu teras[ăa]/i.test(n),
    text: "Punte la joncțiunea perete-acoperiș plat. Apare prin întreruperea izolației la cota atic. Se elimină prin izolație continuă pe atic + ETICS care urcă peste cornișa atic-ului (terasă inversă reduce semnificativ ψ)."
  },
  {
    match: (n) => /Plan[șs]eu peste subsol/i.test(n),
    text: "Punte la joncțiunea perete-planșeu peste subsol neîncălzit. Apare la trecerea de la perete subteran la perete deasupra cotei ±0.00. Se elimină prin izolație perimetrală XPS 80-100 mm sub și peste planșeu (continuitate la nivel sol)."
  },
  {
    match: (n) => /Soclu|Fundație|fundație/i.test(n),
    text: "Punte la cota soclu — joncțiunea perete-fundație. Risc condens ridicat în zona inferioară. Se elimină prin izolație XPS perimetrală pe soclu (min. 50 cm sub cota teren) + ETICS continuu."
  },
  {
    match: (n) => /Col[țt] exterior/i.test(n),
    text: "Punte geometrică la colțurile exterioare ale clădirii (90° convex). Apare prin reducerea ariei exterioare cu izolație vs. aria interioară. Atenuată cu izolație continuă; valori mici (ψ≈0.05-0.10) — uneori chiar negative la colțuri concave (câștig)."
  },
  {
    match: (n) => /Glaf|Pervaz|Buiandrug/i.test(n),
    text: "Punte la perimetrul ferestrei (sus/jos/lateral). Apare prin întreruperea izolației ETICS la cadrul ferestrei. Se elimină prin retragerea ferestrei către exterior + ETICS care urcă pe ramă (≥ 30 mm) + bandă elastică etanșare."
  },
  {
    match: (n) => /Jamb[ăa]|Montant/i.test(n),
    text: "Punte verticală pe lateralul ferestrei. Soluție similară cu glaful: ETICS care continuă pe ramă + bandă etanșare elastică pe perimetru. Importantă pentru evitarea condensului la colțuri reci."
  },
  {
    match: (n) => /Prag/i.test(n),
    text: "Punte la pragul ușii exterioare. Apare prin trecerea pardoselii încălzite cu pragul rece. Se elimină prin prag termic (RTT) cu pad poliamidă + bandă elastică sub prag (sigilare PUR sau bentonita)."
  },
  {
    match: (n) => /Consol[ăa]|Balcon/i.test(n),
    text: "Punte termică majoră (ψ=0.50-0.74 W/m·K) la balcoane traversante. Element critic — pierdere echivalentă cu 8-12 m² perete. Se elimină prin: (1) ruptură termică Schöck/HALFEN Isokorb (ψ→0.06-0.10), sau (2) console suspendate cu izolație continuă perete-balcon."
  },
  {
    match: (n) => /St[âa]lp|Coloan[ăa]/i.test(n),
    text: "Punte verticală prin stâlp beton/metal în peretele exterior. Apare prin diferența λ stâlp (1.7-50 W/m·K) vs. zidărie BCA (0.15). Se elimină prin grosime ETICS suplimentară 30-50 mm pe traseul stâlpului sau placare cu izolație în jurul stâlpului."
  },
  {
    match: (n) => /Grind[ăa]|Centur[ăa]/i.test(n),
    text: "Punte orizontală la grinzi/centuri beton armat în perete. Similar cu stâlpii — λ-mismatch beton vs. zidărie. Se elimină prin overlap izolație 30-50 mm peste grindă, atenție la traseul firelor de armare."
  },
  {
    match: (n) => /Coam[ăa]/i.test(n),
    text: "Punte la vârful acoperișului șarpantă (coama). Apare prin întreruperea izolației între căpriori la coamă. Se elimină prin overlap izolație ≥ 30 mm + bandă auto-adezivă etanșă coamă (Klober Permo)."
  },
  {
    match: (n) => /Corni[șs][ăa]|Strea[șs]in[ăa]/i.test(n),
    text: "Punte la streașina/cornișa acoperișului în pantă. Apare la marginea acoperișului unde izolația între căpriori se întâlnește cu peretele exterior. Se elimină prin sarking continuu peste perete-streașină (cel mai eficient)."
  },
  {
    match: (n) => /Atic/i.test(n),
    text: "Punte la atic — element vertical deasupra terasei. Atic neizolat = pierdere semnificativă (efect thermal flag). Se elimină prin izolație ETICS atât pe interior cât și exterior atic + acoperire izolată pe top atic."
  },
  {
    match: (n) => /Țeav[ăa]|Canal|Trecere/i.test(n),
    text: "Punte prin trecerea conductelor (apa, gaze, ventilație) prin perete exterior. Apare prin întreruperea izolației și material conductor (oțel, PVC). Se elimină prin manșete ETICS perimetrale + spume PUR de etanșare."
  },
  {
    match: (n) => /Co[șs]/i.test(n),
    text: "Punte la coșul de fum/ventilație care străbate izolația. λ-mismatch zidărie coș (0.7-1.4) vs. izolație (0.04). Se elimină prin izolație radială 50-80 mm pe traseul coșului în pod + carcasă izolată."
  },
  {
    match: (n) => /Rolet[ăa]|caset[ăa]/i.test(n),
    text: "Punte la caseta rolete deasupra ferestrei. Apare prin volumul gol pentru rulou + perete subțire spre interior. Se elimină prin caseta cu izolație internă PIR/EPS (35 mm) + etanșare etoșă perimetrală."
  },
  {
    match: (n) => /Rost/i.test(n),
    text: "Punte la rost vertical/orizontal panou prefabricat (specific RO 1965-1990). λ-mismatch panou intern (BCA) vs. fâșie centrală oțel. Se elimină DIFICIL prin sigilarea rostului cu PU + ETICS overlap perimetral. Tipic ψ=0.20-0.40 (mare!)."
  },
];

/**
 * Returnează tooltip-ul educațional pentru o punte specifică.
 * Diferit de getLengthRule() — explică ce ESTE punte și cum se elimină.
 *
 * @param {string} bridgeName - Numele punții
 * @returns {string|null} Tooltip multi-linie sau null dacă nu match
 */
export function getEducationTooltip(bridgeName) {
  if (!bridgeName) return null;
  const tip = EDUCATION_TOOLTIPS.find(t => t.match(bridgeName));
  return tip ? tip.text : null;
}
