/**
 * anexa-recommendations-aeIIci.js — Wrapper recomandări Anexa 1+2 pentru AE IIci.
 *
 * Sprint audit-mai2026 F4 — implementare nouă conform planului aprobat.
 *
 * Context: Conform Ord. MDLPA 348/2026 Art. 6 alin. (2), auditorul **AE IIci**
 * (grad II civile) emite CPE rezidențial cu Anexa 1+2 OBLIGATORII, dar NU are
 * acces la Pas 7 (audit energetic detaliat cu cost-optimă, NPV, finanțare PNRR).
 * Recomandările minime conform Mc 001-2022 Cap. 9 (anvelopă → tâmplărie →
 * punți → sisteme → RES → iluminat → etanșeitate) trebuie totuși generate
 * automat în Anexa 1+2 pentru tier IIci.
 *
 * Acest modul este un **wrapper subțire** peste motorul existent
 * `generateCpeRecommendations()` (Sprint P1.4, 2 mai 2026) care:
 *   1. Apelează motorul standard (nu duplică logica de calcul)
 *   2. Forțează `savings = "necalculat (necesită Pas 7 — plan AE Ici sau superior)"`
 *      pentru tier IIci (suprascrie financialAnalysis dacă există accidental)
 *   3. Verifică `coverage` per categorie Mc 001 Cap. 9 (A/B/C/D/E/F)
 *   4. Anotează lista cu metadata { tier, legalBasis, sourceVersion } pentru
 *      trasabilitate audit MDLPA
 *
 * NU MODIFICĂ generatorul CPE PDF + Anexa 1+2 — output-ul `recommendations` se
 * injectează în câmpul existent al payload-ului ÎNAINTE de generator (caller
 * responsibility).
 *
 * @see src/calc/cpe-recommendations.js — motor unificat (Sprint P1.4)
 * @see Ord. MDLPA 348/2026 Art. 6 alin. (2) — gradele AE Ici / AE IIci
 * @see Mc 001-2022 Cap. 9 — ordine intervenții
 */

import { generateCpeRecommendations } from "../calc/cpe-recommendations.js";

/**
 * Tier-uri suportate. Determină modul de îmbogățire al recomandărilor.
 */
export const TIER = Object.freeze({
  AE_IICI: "AE IIci",      // Grad II civile — DOAR CPE rezidențial
  AE_ICI: "AE Ici",        // Grad I civile — CPE + audit + nZEB
  EXPERT: "Expert",        // Step 8 + BIM + Pașaport detaliat
});

/**
 * Categorii Mc 001-2022 Cap. 9 — ordine intervenții obligatorii.
 * Folosit pentru calculul `coverage`.
 */
export const CAP9_CATEGORIES = Object.freeze({
  ANVELOPA:    "Anvelopă",      // A1-A4
  INSTALATII:  "Instalații",    // B1-B3
  SRE:         "SRE",           // C1-C2
  ILUMINAT:    "Iluminat",      // D1
  ETANSEITATE: "Etanșeitate",   // E1
  BLOC_MULTI:  "Bloc multi-apartament", // F1
});

/**
 * Determină tier-ul auditor pe baza grad MDLPA și plan Zephren.
 *
 * Regula: planul comercial poate fi MAI MIC decât gradul MDLPA real
 * (ex: auditor Ici care folosește plan IIci pentru a economisi 900 RON/lună —
 * vezi CLAUDE.md filozofie pricing v7.1). Returnăm tier conservator (minim
 * dintre cele 2 — plan-ul comercial determină accesul UI).
 *
 * @param {Object} args
 * @param {string} [args.userPlan] — planGating ID (free/edu/audit/pro/expert/birou/enterprise)
 * @param {string} [args.gradMdlpa] — codul gradului real ("II ci" / "I ci" / etc.)
 * @returns {"AE IIci"|"AE Ici"|"Expert"}
 */
export function determineTier({ userPlan, gradMdlpa } = {}) {
  // Plan comercial determină accesul UI
  const planLower = String(userPlan || "").toLowerCase();
  if (planLower.includes("expert") || planLower.includes("birou") || planLower.includes("enterprise")) {
    return TIER.EXPERT;
  }
  // IIci (cu doi „I") trebuie verificat ÎNAINTE de Ici simplu, altfel substring
  // "ici" în "iici" îl deviază eronat. Acceptăm „iici", „audit-ii", „ae iici".
  if (planLower.includes("iici") || planLower.includes("audit-ii") || planLower.includes("ae ii")) {
    return TIER.AE_IICI;
  }
  if (planLower.includes("pro") || planLower.includes("ici") || planLower === "audit-ici") {
    return TIER.AE_ICI;
  }
  // Default conservator: IIci (planul cel mai restrictiv care permite CPE)
  return TIER.AE_IICI;
}

/**
 * Calculează coverage per categorie Mc 001 Cap. 9.
 *
 * @param {Array} recommendations — output din generateCpeRecommendations
 * @returns {Object} { ANVELOPA, INSTALATII, SRE, ILUMINAT, ETANSEITATE, BLOC_MULTI,
 *                     missingHighPriority: string[], hasAny: boolean }
 */
export function calcCoverage(recommendations) {
  const cov = {
    ANVELOPA: false,
    INSTALATII: false,
    SRE: false,
    ILUMINAT: false,
    ETANSEITATE: false,
    BLOC_MULTI: false,
  };
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return { ...cov, missingHighPriority: [], hasAny: false };
  }
  recommendations.forEach((r) => {
    const cat = String(r.category || "");
    if (cat === CAP9_CATEGORIES.ANVELOPA) cov.ANVELOPA = true;
    else if (cat === CAP9_CATEGORIES.INSTALATII) cov.INSTALATII = true;
    else if (cat === CAP9_CATEGORIES.SRE) cov.SRE = true;
    else if (cat === CAP9_CATEGORIES.ILUMINAT) cov.ILUMINAT = true;
    else if (cat === CAP9_CATEGORIES.ETANSEITATE) cov.ETANSEITATE = true;
    else if (cat === CAP9_CATEGORIES.BLOC_MULTI) cov.BLOC_MULTI = true;
  });
  // Determină ce categorii cu priorități înalte lipsesc (informativ)
  const highPriorityCats = recommendations
    .filter((r) => r.priority === "înaltă")
    .map((r) => r.category);
  const missingHighPriority = Object.values(CAP9_CATEGORIES).filter(
    (cat) => !highPriorityCats.includes(cat) && !cov[Object.keys(CAP9_CATEGORIES).find(k => CAP9_CATEGORIES[k] === cat)],
  );
  return {
    ...cov,
    missingHighPriority,
    hasAny: Object.values(cov).some(Boolean),
  };
}

/**
 * Eticheta de savings pentru tier IIci — text generic conform planului
 * (recomandările minime fără analiză cost-optimă detaliată).
 */
const SAVINGS_IICI_LABEL = "necalculat (necesită Pas 7 — plan AE Ici sau superior)";

/**
 * Generează recomandările pentru Anexa 1+2 cu metadata îmbogățită per tier.
 *
 * Pentru AE IIci:
 *   - Apelează motorul standard fără financialAnalysis (sau cu null) ca savings
 *     să rămână valorile DEFAULT din motor (ex: "15-25%", "8-15%") — acestea
 *     sunt valori de referință generice din Mc 001-2022 Cap. 9, NU calculate
 *     pe baza clădirii specifice.
 *   - Suprascrie cu SAVINGS_IICI_LABEL doar dacă financialAnalysis a fost
 *     pasat (ar fi o eroare conceptuală pentru IIci — Pas 7 e blocat).
 *
 * Pentru AE Ici / Expert:
 *   - Apelează motorul cu financialAnalysis dacă disponibil → savings calculat
 *     real din Pas 7.
 *
 * @param {Object} ctx — context Mc 001 standard (vezi cpe-recommendations.js)
 * @param {Object} [opts]
 * @param {"AE IIci"|"AE Ici"|"Expert"} [opts.tier] — explicit (override determineTier)
 * @param {string} [opts.userPlan] — pentru determineTier
 * @param {string} [opts.gradMdlpa] — pentru determineTier
 * @returns {{ recommendations: Array, coverage: Object, tier: string,
 *             legalBasis: string, sourceVersion: string }}
 */
export function generateAnexaRecommendations(ctx = {}, opts = {}) {
  const tier = opts.tier || determineTier({
    userPlan: opts.userPlan,
    gradMdlpa: opts.gradMdlpa,
  });

  // Pentru AE IIci: NU pasăm financialAnalysis (nu are sens — Pas 7 e blocat).
  // Motorul va folosi valorile DEFAULT din Mc 001 Cap. 9 ("15-25%", etc.) sau
  // "necalculat (necesită Pas 7)" pentru ramurile fără default explicit.
  const ctxForTier =
    tier === TIER.AE_IICI
      ? { ...ctx, financialAnalysis: null }
      : ctx;

  const rawRecs = generateCpeRecommendations(ctxForTier) || [];

  // Pentru AE IIci, dacă vine prin eroare un saving calculat numeric din altă
  // sursă (ex: cached), suprascriem cu label generic.
  const recommendations =
    tier === TIER.AE_IICI
      ? rawRecs.map((r) => {
          // Păstrăm valorile default Mc 001 ("15-25%", "8-15%", etc.) — acestea
          // sunt intervale normate, nu calcul specific. Înlocuim DOAR dacă
          // savings e un procent numeric simplu (din financialAnalysis cached).
          const isCalculatedNumeric = /^\d+%$/.test(String(r.savings || ""));
          return isCalculatedNumeric
            ? { ...r, savings: SAVINGS_IICI_LABEL }
            : r;
        })
      : rawRecs;

  const coverage = calcCoverage(recommendations);

  return {
    recommendations,
    coverage,
    tier,
    legalBasis:
      tier === TIER.AE_IICI
        ? "Ord. MDLPA 348/2026 Art. 6 alin. (2) — recomandări minime CPE rezidențial conform Mc 001-2022 Cap. 9"
        : tier === TIER.AE_ICI
        ? "Ord. MDLPA 348/2026 Art. 6 alin. (1) — audit energetic complet + analiza cost-optimă (Reg. UE 244/2012 republicat 2025/2273)"
        : "Ord. MDLPA 348/2026 Art. 6 alin. (1) — audit Expert + Step 8 module avansate (BIM, Pașaport detaliat LCC)",
    sourceVersion: "audit-mai2026/F4 (Mc 001-2022 Cap. 9 + Sprint P1.4 motor unificat)",
  };
}

/**
 * Helper rapid pentru text afișat în Anexa 2 — bază juridică + lista categorii
 * acoperite. Folosit de generatoare CPE (Step6Certificate + CpeAnexa).
 *
 * @param {Object} anexaResult — output din generateAnexaRecommendations
 * @returns {string} text formatat pentru Anexa 2 footer
 */
export function formatAnexaLegalNote(anexaResult) {
  if (!anexaResult) return "";
  const cov = anexaResult.coverage || {};
  const covered = Object.entries(CAP9_CATEGORIES)
    .filter(([k]) => cov[k])
    .map(([, v]) => v)
    .join(", ");
  return [
    `Tier auditor: ${anexaResult.tier}.`,
    `Bază juridică: ${anexaResult.legalBasis}.`,
    covered ? `Categorii acoperite: ${covered}.` : "Nicio recomandare aplicabilă (clădire conformă).",
  ].join(" ");
}
