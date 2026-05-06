/**
 * cpe-scope-subcategory.js — Sub-categorisare scopuri CPE pentru validitate avansată.
 *
 * Sprint Conformitate P2-15 (7 mai 2026).
 *
 * Permite refactor scopCpe în 2 nivele:
 *   - scopMain: vânzare | închiriere | recepție | informare | renovare | construire | alt
 *   - scopSub: drepturi imobiliare | drepturi reale | locuință | comercial | DTAC | finală | ...
 *
 * Afectează:
 *   - Valabilitate CPE (5 vs 10 ani)
 *   - Cerințe documente specifice (ex: vânzare imobil → notarial vs vânzare drepturi → simplu)
 *   - Cerințe MDLPA per portal
 *
 * NOTE: integrare în Step 1 select scopCpe → 2 dropdowns dependente. NU modificat
 * acum; modulul oferă API-ul pentru integrare ulterioară.
 */

/**
 * Catalog complet sub-categorii.
 */
export const SCOP_CPE_HIERARCHY = Object.freeze({
  vanzare: {
    label: "Vânzare",
    subcategories: [
      { key: "imobil_notarial", label: "Vânzare imobil (act notarial)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "drepturi_reale", label: "Vânzare drepturi reale (uzufruct, abitație)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "vanzare_silita", label: "Vânzare silită (executor)", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
  inchiriere: {
    label: "Închiriere",
    subcategories: [
      { key: "locuinta_pf", label: "Închiriere locuință (PF → PF)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "locuinta_pj", label: "Închiriere locuință (PJ chiriaș)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "comercial", label: "Închiriere comercial (birou/magazin)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "leasing_imobiliar", label: "Leasing imobiliar", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
  receptie: {
    label: "Recepție lucrări",
    subcategories: [
      { key: "dtac", label: "Recepție DTAC (Documentație Tehnică Autorizație Construire)", validityYearsHint: { highClass: 10, lowClass: 10 } },
      { key: "finala", label: "Recepție finală (proces verbal recepție)", validityYearsHint: { highClass: 10, lowClass: 10 } },
      { key: "calitativa", label: "Recepție calitativă (ISC)", validityYearsHint: { highClass: 10, lowClass: 10 } },
    ],
  },
  informare: {
    label: "Informare",
    subcategories: [
      { key: "proprietar", label: "Informare proprietar (uz intern)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "audit_intern", label: "Audit intern organizație (PJ)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "feasibility", label: "Studiu fezabilitate pre-investiție", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
  renovare: {
    label: "Renovare",
    subcategories: [
      { key: "minora", label: "Renovare minoră (<25% anvelopă)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "majora", label: "Renovare majoră (≥25% anvelopă)", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "deep_retrofit", label: "Deep retrofit (≥60% economii)", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
  construire: {
    label: "Construire (nou)",
    subcategories: [
      { key: "nou_rezidential", label: "Construcție nouă rezidențială", validityYearsHint: { highClass: 10, lowClass: 10 } },
      { key: "nou_nerezidential", label: "Construcție nouă nerezidențială", validityYearsHint: { highClass: 10, lowClass: 10 } },
      { key: "extindere", label: "Extindere clădire existentă", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "schimbare_destinatie", label: "Schimbare destinație", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
  alt: {
    label: "Alt scop",
    subcategories: [
      { key: "afm_finantare", label: "Aplicare finanțare AFM", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "por_finantare", label: "Aplicare finanțare POR/FEDR", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "pnrr_finantare", label: "Aplicare finanțare PNRR", validityYearsHint: { highClass: 10, lowClass: 5 } },
      { key: "asigurari", label: "Asigurări imobiliare", validityYearsHint: { highClass: 10, lowClass: 5 } },
    ],
  },
});

/**
 * Returnează lista scopMain (pentru primul dropdown).
 *
 * @returns {Array<{key:string, label:string}>}
 */
export function listScopMain() {
  return Object.entries(SCOP_CPE_HIERARCHY).map(([key, val]) => ({
    key,
    label: val.label,
  }));
}

/**
 * Returnează sub-categoriile pentru un scopMain specific.
 *
 * @param {string} scopMain
 * @returns {Array<{key:string, label:string}>}
 */
export function listScopSubcategories(scopMain) {
  const main = SCOP_CPE_HIERARCHY[scopMain];
  if (!main) return [];
  return main.subcategories.map(s => ({ key: s.key, label: s.label }));
}

/**
 * Returnează valabilitatea recomandată în ani pentru combinația (scopMain, scopSub, energyClass).
 *
 * Logica:
 *   - Recepție / Construire → întotdeauna 10 ani (CPE proaspăt)
 *   - Restul → 10 ani pentru clase A+/A/B/C, 5 ani pentru D/E/F/G (Art. 17 EPBD 2024/1275)
 *
 * @param {string} scopMain
 * @param {string} scopSub
 * @param {string} energyClass — A+ | A | B | C | D | E | F | G
 * @returns {number} 5 sau 10
 */
export function getValidityForScopAndClass(scopMain, scopSub, energyClass) {
  const main = SCOP_CPE_HIERARCHY[scopMain];
  if (!main) return 10; // fallback safe
  const sub = main.subcategories.find(s => s.key === scopSub);
  if (!sub) return 10;
  const isHighClass = ["A+", "A", "B", "C"].includes(String(energyClass || "").toUpperCase());
  return isHighClass ? sub.validityYearsHint.highClass : sub.validityYearsHint.lowClass;
}

/**
 * Verifică dacă o combinație (scopMain, scopSub) e validă.
 *
 * @param {string} scopMain
 * @param {string} scopSub
 * @returns {boolean}
 */
export function isValidScopCombo(scopMain, scopSub) {
  const main = SCOP_CPE_HIERARCHY[scopMain];
  if (!main) return false;
  return main.subcategories.some(s => s.key === scopSub);
}

/**
 * Returnează combinația default pentru un scopMain (prima sub-categorie).
 *
 * @param {string} scopMain
 * @returns {string|null}
 */
export function getDefaultSubcategory(scopMain) {
  const main = SCOP_CPE_HIERARCHY[scopMain];
  if (!main || !main.subcategories.length) return null;
  return main.subcategories[0].key;
}
