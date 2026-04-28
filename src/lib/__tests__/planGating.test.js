/**
 * planGating.test.js — Unit tests pentru gating v6.0
 * Sprint Pricing v6.0 (25 apr 2026)
 */

import { describe, it, expect } from "vitest";
import {
  PLAN_FEATURES,
  resolvePlan,
  canAccess,
  getLimit,
  getOverageCost,
  isEduValid,
} from "../planGating.js";

describe("resolvePlan — backward compat", () => {
  it("returnează 'free' pentru null/undefined", () => {
    expect(resolvePlan(null)).toBe("free");
    expect(resolvePlan(undefined)).toBe("free");
    expect(resolvePlan("")).toBe("free");
  });

  it("rezolvă numele canonice v6.0", () => {
    expect(resolvePlan("free")).toBe("free");
    expect(resolvePlan("edu")).toBe("edu");
    expect(resolvePlan("audit")).toBe("audit");
    expect(resolvePlan("pro")).toBe("pro");
    expect(resolvePlan("expert")).toBe("expert");
    expect(resolvePlan("birou")).toBe("birou");
    expect(resolvePlan("enterprise")).toBe("enterprise");
  });

  it("mapează aliasurile vechi v5.x", () => {
    expect(resolvePlan("starter")).toBe("audit");           // 199 RON
    expect(resolvePlan("standard")).toBe("pro");            // 499 RON
    expect(resolvePlan("professional")).toBe("expert");     // 799 → 899
    expect(resolvePlan("business")).toBe("birou");          // 749/u → 1.890 flat
    expect(resolvePlan("asociatie")).toBe("birou");
  });

  it("acceptă case-insensitive", () => {
    expect(resolvePlan("PRO")).toBe("pro");
    expect(resolvePlan("Edu")).toBe("edu");
  });
});

describe("canAccess — gating per feature", () => {
  it("Free are acces la calculator basic dar NU la export oficial", () => {
    expect(canAccess("free", "exportDOCX")).toBe(true);     // cu watermark
    expect(canAccess("free", "exportXML")).toBe(false);
    expect(canAccess("free", "submitMDLPA")).toBe(false);
    expect(canAccess("free", "step7Audit")).toBe(false);
    expect(canAccess("free", "step8Advanced")).toBe(false);
    expect(canAccess("free", "aiPack")).toBe(false);
    expect(canAccess("free", "bimPack")).toBe(false);
  });

  it("AE IIci (audit, 499) are export oficial + AI Pack dar NU Step 7/8 nici BIM", () => {
    // v7.0 update (29 apr 2026): AI Pack INCLUS pe TOATE planurile plătite (era doar Pro+ în v6.x)
    expect(canAccess("audit", "exportDOCX")).toBe(true);
    expect(canAccess("audit", "exportXML")).toBe(true);
    expect(canAccess("audit", "submitMDLPA")).toBe(true);
    expect(canAccess("audit", "auditorStamp")).toBe(true);
    expect(canAccess("audit", "step7Audit")).toBe(false);   // diferențiator vs AE Ici
    expect(canAccess("audit", "step8Advanced")).toBe(false);
    expect(canAccess("audit", "aiPack")).toBe(true);        // v7.0: AI Pack INCLUS
    expect(canAccess("audit", "ocrInvoice")).toBe(true);
    expect(canAccess("audit", "ocrCPE")).toBe(true);
    expect(canAccess("audit", "chatImport")).toBe(true);
    expect(canAccess("audit", "bimPack")).toBe(false);
  });

  it("AE Ici (pro, 1.299) are Step 7 + AI Pack dar NU Step 8 nici BIM", () => {
    // Pașaport gated global de RENOVATION_PASSPORT_ENABLED kill-switch (false până la EPBD 29 mai 2026)
    expect(canAccess("pro", "step7Audit")).toBe(true);      // ✅ Pro distinctiv
    expect(canAccess("pro", "step8Advanced")).toBe(false);
    expect(canAccess("pro", "aiPack")).toBe(true);          // ✅ AI Pack inclus
    expect(canAccess("pro", "ocrInvoice")).toBe(true);
    expect(canAccess("pro", "ocrCPE")).toBe(true);
    expect(canAccess("pro", "chatImport")).toBe(true);
    expect(canAccess("pro", "bimPack")).toBe(false);        // BIM doar Expert+
    expect(canAccess("pro", "pasaportBasic")).toBe(false);  // kill-switch off până la lansare EPBD 29 mai 2026
    expect(canAccess("pro", "pasaportDetailed")).toBe(false);
    expect(canAccess("pro", "bacsSimple")).toBe(true);
    expect(canAccess("pro", "bacsDetailed")).toBe(false);   // detaliat doar Expert+
    expect(canAccess("pro", "gwpReport")).toBe(true);
  });

  it("Expert (2.499) are Step 8 COMPLET + BIM Pack", () => {
    // v7.0 update: maxCertsPerMonth standardizat la 30 (era 60 în v6.x); diferențierea e prin features, nu volum
    expect(canAccess("expert", "step8Advanced")).toBe(true);
    expect(canAccess("expert", "bimPack")).toBe(true);      // ✅ BIM inclus
    expect(canAccess("expert", "ifcImport")).toBe(true);
    expect(canAccess("expert", "monteCarloEP")).toBe(true);
    expect(canAccess("expert", "pasivhaus")).toBe(true);
    expect(canAccess("expert", "thermovision")).toBe(true);
    expect(canAccess("expert", "portfolioMulti")).toBe(true);
    expect(canAccess("expert", "bacsDetailed")).toBe(true);
    expect(canAccess("expert", "sriDetailed")).toBe(true);
    expect(canAccess("expert", "mepsOptimizer")).toBe(true);
    expect(canAccess("expert", "pasaportDetailed")).toBe(false);  // kill-switch off până la lansare EPBD 29 mai 2026
    // Single user încă, fără team features
    expect(canAccess("expert", "teamDashboard")).toBe(false);
    expect(canAccess("expert", "whiteLabel")).toBe(false);
    expect(canAccess("expert", "apiAccess")).toBe(false);
  });

  it("Birou (1.890) are tot Expert + multi-user + white-label + API", () => {
    expect(canAccess("birou", "step8Advanced")).toBe(true);
    expect(canAccess("birou", "bimPack")).toBe(true);
    expect(canAccess("birou", "teamDashboard")).toBe(true); // ✅ Team
    expect(canAccess("birou", "whiteLabel")).toBe(true);    // ✅ White-label
    expect(canAccess("birou", "apiAccess")).toBe(true);     // ✅ API
    expect(canAccess("birou", "calendarTeam")).toBe(true);
    expect(canAccess("birou", "accountManager")).toBe(true);
    expect(canAccess("birou", "slaGuaranteed")).toBe(false); // SLA doar Enterprise
  });

  it("Enterprise are tot + SLA 99.9%", () => {
    expect(canAccess("enterprise", "slaGuaranteed")).toBe(true);
    expect(canAccess("enterprise", "accountManager")).toBe(true);
    expect(canAccess("enterprise", "step8Advanced")).toBe(true);
    expect(canAccess("enterprise", "bimPack")).toBe(true);
    expect(canAccess("enterprise", "whiteLabel")).toBe(true);
  });

  it("Edu are TOATE funcțiile dar export oficial BLOCAT", () => {
    expect(canAccess("edu", "step7Audit")).toBe(true);
    expect(canAccess("edu", "step8Advanced")).toBe(true);
    expect(canAccess("edu", "aiPack")).toBe(true);
    expect(canAccess("edu", "bimPack")).toBe(true);
    expect(canAccess("edu", "monteCarloEP")).toBe(true);
    expect(canAccess("edu", "pasivhaus")).toBe(true);
    // BLOCAT — protecție EPBD
    expect(canAccess("edu", "exportXML")).toBe(false);
    expect(canAccess("edu", "submitMDLPA")).toBe(false);
    expect(canAccess("edu", "auditorStamp")).toBe(false);
    // Watermark obligatoriu
    expect(PLAN_FEATURES.edu.cpeWatermark).toBe(true);
    expect(PLAN_FEATURES.edu.isEdu).toBe(true);
  });

  it("returnează false pentru feature inexistent", () => {
    expect(canAccess("pro", "feature_inventat_inexistent")).toBe(false);
  });
});

describe("getLimit — limite numerice", () => {
  it("returnează corect maxCertsPerMonth", () => {
    // v7.0 update: volum CPE/lună standardizat la 30 pentru audit/pro/expert
    // (diferențierea e prin features funcționale, nu prin volum)
    expect(getLimit("free", "maxCertsPerMonth")).toBe(3);
    expect(getLimit("edu", "maxCertsPerMonth")).toBe(100);   // hard cap anti-abuse
    expect(getLimit("audit", "maxCertsPerMonth")).toBe(30);  // v7.0 (era 8 în v6.x)
    expect(getLimit("pro", "maxCertsPerMonth")).toBe(30);
    expect(getLimit("expert", "maxCertsPerMonth")).toBe(30); // v7.0 (era 60 în v6.x)
    expect(getLimit("birou", "maxCertsPerMonth")).toBe(9999);
    expect(getLimit("enterprise", "maxCertsPerMonth")).toBe(9999);
  });

  it("returnează corect maxUsers", () => {
    expect(getLimit("free", "maxUsers")).toBe(1);
    expect(getLimit("edu", "maxUsers")).toBe(1);
    expect(getLimit("pro", "maxUsers")).toBe(1);
    expect(getLimit("birou", "maxUsers")).toBe(5);
    expect(getLimit("enterprise", "maxUsers")).toBe(999);
  });

  it("returnează corect supportEmailHours", () => {
    expect(getLimit("audit", "supportEmailHours")).toBe(48);
    expect(getLimit("pro", "supportEmailHours")).toBe(24);
    expect(getLimit("expert", "supportEmailHours")).toBe(24);
    expect(getLimit("birou", "supportEmailHours")).toBe(12);
    expect(getLimit("enterprise", "supportEmailHours")).toBe(4);
    expect(getLimit("edu", "supportEmailHours")).toBe(72);
  });
});

describe("getOverageCost — tiered overage", () => {
  it("Free + Edu + Birou + Enterprise NU au overage", () => {
    expect(getOverageCost("free", 5)).toBe(0);
    expect(getOverageCost("edu", 50)).toBe(0);
    expect(getOverageCost("birou", 200)).toBe(0);
    expect(getOverageCost("enterprise", 500)).toBe(0);
  });

  it("AE IIci (audit, 30 + 6 burst = 36) tiered 39→69→99", () => {
    // v7.0 update: 30 CPE/lună standard + burst 20% (era 8+2=10 în v6.x)
    expect(getOverageCost("audit", 1)).toBe(0);
    expect(getOverageCost("audit", 30)).toBe(0);
    expect(getOverageCost("audit", 36)).toBe(0);          // burst
    expect(getOverageCost("audit", 37)).toBe(39);         // tier 1
    expect(getOverageCost("audit", 50)).toBe(39);
    expect(getOverageCost("audit", 51)).toBe(69);         // tier 2
    expect(getOverageCost("audit", 65)).toBe(69);
    expect(getOverageCost("audit", 66)).toBe(99);         // tier 3 → forțează AE Ici
    expect(getOverageCost("audit", 100)).toBe(99);
  });

  it("AE Ici (pro, 30 + 6 burst = 36) tiered 39→69→99", () => {
    // v7.0 update: tier-uri 39→69→99 (era 49→79→99 în v6.x)
    expect(getOverageCost("pro", 30)).toBe(0);
    expect(getOverageCost("pro", 36)).toBe(0);            // burst
    expect(getOverageCost("pro", 37)).toBe(39);           // tier 1 (v7.0)
    expect(getOverageCost("pro", 50)).toBe(39);
    expect(getOverageCost("pro", 51)).toBe(69);           // tier 2 (v7.0)
    expect(getOverageCost("pro", 65)).toBe(69);
    expect(getOverageCost("pro", 66)).toBe(99);           // tier 3 → forțează Expert
    expect(getOverageCost("pro", 100)).toBe(99);
  });

  it("Expert (30 + 6 burst = 36) tiered 39→69→99", () => {
    // v7.0 update: maxCertsPerMonth standardizat la 30 (era 60 în v6.x)
    expect(getOverageCost("expert", 30)).toBe(0);
    expect(getOverageCost("expert", 36)).toBe(0);         // burst
    expect(getOverageCost("expert", 37)).toBe(39);        // tier 1
    expect(getOverageCost("expert", 50)).toBe(39);
    expect(getOverageCost("expert", 51)).toBe(69);        // tier 2
    expect(getOverageCost("expert", 65)).toBe(69);
    expect(getOverageCost("expert", 66)).toBe(99);        // tier 3 → forțează Birou
    expect(getOverageCost("expert", 100)).toBe(99);
  });
});

describe("isEduValid — validare dovadă educațională", () => {
  it("returnează false dacă plan != edu", () => {
    expect(isEduValid({ plan: "pro" })).toBe(false);
    expect(isEduValid({ plan: "free" })).toBe(false);
    expect(isEduValid({ plan: null })).toBe(false);
    expect(isEduValid(null)).toBe(false);
  });

  it("returnează false dacă lipsește eduValidationDate", () => {
    expect(isEduValid({ plan: "edu" })).toBe(false);
    expect(isEduValid({ plan: "edu", eduValidationDate: null })).toBe(false);
  });

  it("returnează true în primul an de la activare", () => {
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    expect(isEduValid({ plan: "edu", eduValidationDate: sixMonthsAgo.toISOString() })).toBe(true);
  });

  it("returnează false după 12 luni (necesită reînnoire)", () => {
    const today = new Date();
    const oneYearTwoMonthsAgo = new Date(today);
    oneYearTwoMonthsAgo.setMonth(oneYearTwoMonthsAgo.getMonth() - 14);
    expect(isEduValid({ plan: "edu", eduValidationDate: oneYearTwoMonthsAgo.toISOString() })).toBe(false);
  });
});

describe("Acceptance criteria Sprint v6.0", () => {
  it("8 plans definite", () => {
    const expectedPlans = ["free", "edu", "audit", "pro", "expert", "birou", "enterprise"];
    for (const p of expectedPlans) {
      expect(PLAN_FEATURES[p]).toBeDefined();
    }
  });

  it("Pro (popular) include Step 1-7 complet + AI Pack", () => {
    const pro = PLAN_FEATURES.pro;
    expect(pro.step7Audit).toBe(true);
    expect(pro.aiPack).toBe(true);
    expect(pro.exportXML).toBe(true);
    expect(pro.submitMDLPA).toBe(true);
    expect(pro.pasaportBasic).toBe(true);
    expect(pro.gwpReport).toBe(true);
    expect(pro.bacsSimple).toBe(true);
    expect(pro.sriAuto).toBe(true);
    expect(pro.mepsBinar).toBe(true);
    // NU în Pro
    expect(pro.step8Advanced).toBe(false);
    expect(pro.bimPack).toBe(false);
    expect(pro.pasaportDetailed).toBe(false);
  });

  it("Expert adaugă Step 8 + BIM peste Pro", () => {
    const expert = PLAN_FEATURES.expert;
    expect(expert.step8Advanced).toBe(true);
    expect(expert.bimPack).toBe(true);
    expect(expert.bacsDetailed).toBe(true);
    expect(expert.sriDetailed).toBe(true);
    expect(expert.mepsOptimizer).toBe(true);
    expect(expert.pasaportDetailed).toBe(true);
  });

  it("Birou flat + multi-user + white-label", () => {
    const birou = PLAN_FEATURES.birou;
    expect(birou.maxUsers).toBe(5);
    expect(birou.multiUser).toBe(true);
    expect(birou.teamDashboard).toBe(true);
    expect(birou.whiteLabel).toBe(true);
    expect(birou.apiAccess).toBe(true);
    expect(birou.maxCertsPerMonth).toBe(9999); // nelimitat
  });

  it("EDU CPE nelimitat (cap 100) + watermark obligatoriu + XML blocat", () => {
    const edu = PLAN_FEATURES.edu;
    expect(edu.maxCertsPerMonth).toBe(100);
    expect(edu.cpeWatermark).toBe(true);
    expect(edu.exportXML).toBe(false);
    expect(edu.submitMDLPA).toBe(false);
    expect(edu.auditorStamp).toBe(false);
    expect(edu.isEdu).toBe(true);
  });
});
