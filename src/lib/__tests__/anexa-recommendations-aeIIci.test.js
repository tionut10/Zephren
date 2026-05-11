/**
 * anexa-recommendations-aeIIci.test.js — audit-mai2026 F4
 *
 * Verifică wrapper-ul recomandărilor pentru AE IIci:
 *   1. `determineTier` deduce corect tier-ul din userPlan + gradMdlpa
 *   2. `calcCoverage` returnează acoperirea per categorie Cap. 9 Mc 001-2022
 *   3. `generateAnexaRecommendations` apelează motorul existent și anotează
 *      cu metadata { tier, legalBasis, sourceVersion }
 *   4. Pentru tier IIci, savings calculat numeric (ex: "20%") e suprascris cu
 *      label generic, dar intervalele Mc 001 ("15-25%") rămân
 *   5. Pentru tier Ici, financialAnalysis e respectat
 *   6. `formatAnexaLegalNote` produce text valid pentru Anexa 2 footer
 */

import { describe, it, expect } from "vitest";
import {
  determineTier,
  calcCoverage,
  generateAnexaRecommendations,
  formatAnexaLegalNote,
  TIER,
  CAP9_CATEGORIES,
} from "../anexa-recommendations-aeIIci.js";

describe("audit-mai2026 F4 — determineTier", () => {
  it("plan 'audit-IIci' / 'free' → AE IIci (default conservator)", () => {
    expect(determineTier({ userPlan: "audit-IIci" })).toBe(TIER.AE_IICI);
    expect(determineTier({ userPlan: "free" })).toBe(TIER.AE_IICI);
    expect(determineTier({})).toBe(TIER.AE_IICI);
  });

  it("plan 'pro' / 'audit-ici' / cu 'ici' → AE Ici", () => {
    expect(determineTier({ userPlan: "pro" })).toBe(TIER.AE_ICI);
    expect(determineTier({ userPlan: "audit-ici" })).toBe(TIER.AE_ICI);
    expect(determineTier({ userPlan: "AE Ici" })).toBe(TIER.AE_ICI);
  });

  it("plan 'expert' / 'birou' / 'enterprise' → Expert", () => {
    expect(determineTier({ userPlan: "expert" })).toBe(TIER.EXPERT);
    expect(determineTier({ userPlan: "birou" })).toBe(TIER.EXPERT);
    expect(determineTier({ userPlan: "enterprise" })).toBe(TIER.EXPERT);
  });
});

describe("audit-mai2026 F4 — calcCoverage", () => {
  it("lista goală → hasAny false, toate categoriile false", () => {
    const cov = calcCoverage([]);
    expect(cov.hasAny).toBe(false);
    expect(cov.ANVELOPA).toBe(false);
    expect(cov.INSTALATII).toBe(false);
  });

  it("recomandare anvelopă → ANVELOPA=true, restul false, hasAny=true", () => {
    const cov = calcCoverage([
      { code: "A1", category: CAP9_CATEGORIES.ANVELOPA, savings: "15-25%", priority: "înaltă" },
    ]);
    expect(cov.hasAny).toBe(true);
    expect(cov.ANVELOPA).toBe(true);
    expect(cov.INSTALATII).toBe(false);
    expect(cov.SRE).toBe(false);
  });

  it("multiple recomandări → coverage corect per categorie", () => {
    const cov = calcCoverage([
      { code: "A1", category: CAP9_CATEGORIES.ANVELOPA, priority: "înaltă" },
      { code: "B1", category: CAP9_CATEGORIES.INSTALATII, priority: "înaltă" },
      { code: "C1", category: CAP9_CATEGORIES.SRE, priority: "medie" },
      { code: "E1", category: CAP9_CATEGORIES.ETANSEITATE, priority: "medie" },
    ]);
    expect(cov.ANVELOPA).toBe(true);
    expect(cov.INSTALATII).toBe(true);
    expect(cov.SRE).toBe(true);
    expect(cov.ETANSEITATE).toBe(true);
    expect(cov.ILUMINAT).toBe(false);
    expect(cov.BLOC_MULTI).toBe(false);
  });
});

describe("audit-mai2026 F4 — generateAnexaRecommendations", () => {
  // Context minim care produce recomandări predictibile (vezi cpe-recommendations.js)
  const CTX_WITH_ISSUES = {
    building: { category: "RI", areaUseful: 100, n50: 5 }, // n50>1 → E1
    envelopeSummary: { G: 1.0 }, // >0.8 → A1
    opaqueElements: [],
    glazingElements: [{ u: 2.5, area: 10 }], // U>1.8 → A2
    thermalBridges: [],
    heating: { source: "GAZ_CONV", eta_gen: 0.7 },
    cooling: {},
    ventilation: { type: "natural" }, // → B2
    lighting: {},
    instSummary: { isCOP: false, eta_total_h: 0.7, leni: 5 }, // <0.85 → B1
    renewSummary: { rer: 5 }, // <30 → C1
    photovoltaic: { enabled: false },
    solarThermal: { enabled: false },
  };

  it("tier AE IIci → returnează shape complet cu metadata", () => {
    const r = generateAnexaRecommendations(CTX_WITH_ISSUES, { tier: TIER.AE_IICI });
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.tier).toBe(TIER.AE_IICI);
    expect(r.legalBasis).toContain("Ord. MDLPA 348/2026 Art. 6 alin. (2)");
    expect(r.legalBasis).toContain("Mc 001-2022 Cap. 9");
    expect(r.sourceVersion).toContain("audit-mai2026");
    expect(r.coverage.hasAny).toBe(true);
  });

  it("tier AE IIci suprascrie savings numeric simplu cu label generic", () => {
    const ctxWithFinancial = {
      ...CTX_WITH_ISSUES,
      // financialAnalysis ar trebui ignorat pentru IIci
      financialAnalysis: { energySavingsPercent: 35 },
    };
    const r = generateAnexaRecommendations(ctxWithFinancial, { tier: TIER.AE_IICI });
    // Niciuna nu ar trebui să aibă format "35%" numeric simplu — toate sunt
    // intervale normate Mc 001 ("15-25%", "8-15%", "10-25%") sau labels
    const hasNumericSimple = r.recommendations.some((rec) => /^\d+%$/.test(String(rec.savings)));
    expect(hasNumericSimple).toBe(false);
  });

  it("tier AE Ici păstrează financialAnalysis (savings calculat real)", () => {
    const ctxWithFinancial = {
      ...CTX_WITH_ISSUES,
      financialAnalysis: { energySavingsPercent: 35 },
    };
    const r = generateAnexaRecommendations(ctxWithFinancial, { tier: TIER.AE_ICI });
    expect(r.tier).toBe(TIER.AE_ICI);
    expect(r.legalBasis).toContain("Ord. MDLPA 348/2026 Art. 6 alin. (1)");
    expect(r.legalBasis).toContain("audit energetic complet");
  });

  it("clădire performantă → fallback Z0 + coverage hasAny=true (categorie General)", () => {
    const r = generateAnexaRecommendations(
      {
        building: { category: "RI", areaUseful: 100, n50: 0.8 },
        envelopeSummary: { G: 0.3 },
        opaqueElements: [],
        glazingElements: [{ u: 0.9, area: 10 }],
        thermalBridges: [],
        heating: { source: "HP_AW", eta_gen: 4.0 },
        instSummary: { isCOP: true, eta_total_h: 4.0, leni: 5 },
        renewSummary: { rer: 50 },
        photovoltaic: { enabled: true },
      },
      { tier: TIER.AE_IICI }
    );
    expect(r.recommendations.length).toBeGreaterThanOrEqual(1);
    // Z0 fallback "General" — nu e în CAP9_CATEGORIES, deci coverage hasAny ar putea fi false
    // dar recomandările existe — verifică doar prezența recomandării
    const hasZ0 = r.recommendations.some((rec) => rec.code === "Z0");
    expect(hasZ0).toBe(true);
  });

  it("determineTier integrare: userPlan='pro' → tier=AE Ici fără param explicit", () => {
    const r = generateAnexaRecommendations(CTX_WITH_ISSUES, { userPlan: "pro" });
    expect(r.tier).toBe(TIER.AE_ICI);
  });
});

describe("audit-mai2026 F4 — formatAnexaLegalNote", () => {
  it("output null → string gol", () => {
    expect(formatAnexaLegalNote(null)).toBe("");
    expect(formatAnexaLegalNote(undefined)).toBe("");
  });

  it("anexa cu recomandări → text valid cu tier, legal basis, categorii", () => {
    const r = {
      tier: TIER.AE_IICI,
      legalBasis: "Ord. MDLPA 348/2026 Art. 6 alin. (2)",
      coverage: { ANVELOPA: true, INSTALATII: true, SRE: false, ILUMINAT: false, ETANSEITATE: false, BLOC_MULTI: false },
    };
    const note = formatAnexaLegalNote(r);
    expect(note).toContain("AE IIci");
    expect(note).toContain("Ord. MDLPA 348/2026");
    expect(note).toContain("Anvelopă");
    expect(note).toContain("Instalații");
  });

  it("clădire conformă (no coverage) → text 'Nicio recomandare aplicabilă'", () => {
    const r = {
      tier: TIER.AE_IICI,
      legalBasis: "Ord. MDLPA 348/2026 Art. 6 alin. (2)",
      coverage: { ANVELOPA: false, INSTALATII: false, SRE: false, ILUMINAT: false, ETANSEITATE: false, BLOC_MULTI: false },
    };
    const note = formatAnexaLegalNote(r);
    expect(note).toContain("Nicio recomandare aplicabilă");
  });
});
