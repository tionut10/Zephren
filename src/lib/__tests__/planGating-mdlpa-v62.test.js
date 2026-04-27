/**
 * planGating-mdlpa-v62.test.js — Sprint v6.2 (27 apr 2026)
 *
 * Teste pentru helper-urile noi MDLPA Ord. 348/2026:
 *   - getRequiredMdlpaGrade
 *   - canCertifyBuildingCategory
 *   - getAllowedBuildingCategories
 *   - aliases noi în resolvePlan: aeici, aeiici, ae_ici, ae_iici
 */

import { describe, it, expect } from "vitest";
import {
  PLAN_FEATURES,
  resolvePlan,
  canAccess,
  getRequiredMdlpaGrade,
  canCertifyBuildingCategory,
  getAllowedBuildingCategories,
} from "../planGating.js";

describe("getRequiredMdlpaGrade — Ord. MDLPA 348/2026 Art. 5", () => {
  it("Free: null (fără cerere atestat)", () => {
    expect(getRequiredMdlpaGrade("free")).toBe(null);
  });
  it("Edu: null (watermark didactic)", () => {
    expect(getRequiredMdlpaGrade("edu")).toBe(null);
  });
  it("Audit (AE IIci): IIci", () => {
    expect(getRequiredMdlpaGrade("audit")).toBe("IIci");
  });
  it("Pro (AE Ici): Ici", () => {
    expect(getRequiredMdlpaGrade("pro")).toBe("Ici");
  });
  it("Expert / Birou / Enterprise: Ici", () => {
    expect(getRequiredMdlpaGrade("expert")).toBe("Ici");
    expect(getRequiredMdlpaGrade("birou")).toBe("Ici");
    expect(getRequiredMdlpaGrade("enterprise")).toBe("Ici");
  });
});

describe("canCertifyBuildingCategory — Art. 6 Ord. 348/2026", () => {
  it("AE IIci permite RI/RC/RA/BC", () => {
    for (const cat of ["RI", "RC", "RA", "BC"]) {
      expect(canCertifyBuildingCategory("audit", cat), `cat=${cat}`).toBe(true);
    }
  });
  it("AE IIci respinge nerezidențial", () => {
    for (const cat of ["BIR", "SP", "SC", "HOT", "COM", "AL"]) {
      expect(canCertifyBuildingCategory("audit", cat), `cat=${cat}`).toBe(false);
    }
  });
  it("AE Ici permite TOATE", () => {
    for (const cat of ["RI", "RC", "BIR", "SP", "AL", "IU", "HAL"]) {
      expect(canCertifyBuildingCategory("pro", cat), `cat=${cat}`).toBe(true);
    }
  });
  it("Free / Edu permit toate (demo / didactic)", () => {
    expect(canCertifyBuildingCategory("free", "BIR")).toBe(true);
    expect(canCertifyBuildingCategory("edu", "BIR")).toBe(true);
  });
  it("categorie lipsă → permis (UI nu blochează inutil)", () => {
    expect(canCertifyBuildingCategory("audit", "")).toBe(true);
    expect(canCertifyBuildingCategory("audit", null)).toBe(true);
  });
});

describe("getAllowedBuildingCategories", () => {
  it("AE IIci returnează listă restrânsă", () => {
    const list = getAllowedBuildingCategories("audit");
    expect(Array.isArray(list)).toBe(true);
    expect(list).toContain("RI");
    expect(list).toContain("BC");
    expect(list).not.toContain("BIR");
  });
  it("AE Ici returnează null (nicio restricție)", () => {
    expect(getAllowedBuildingCategories("pro")).toBe(null);
    expect(getAllowedBuildingCategories("expert")).toBe(null);
    expect(getAllowedBuildingCategories("birou")).toBe(null);
  });
});

describe("resolvePlan — alias-uri brand AE Ici/IIci v6.2", () => {
  it("aeici → pro", () => {
    expect(resolvePlan("aeici")).toBe("pro");
    expect(resolvePlan("AEICI")).toBe("pro");
  });
  it("aeiici → audit", () => {
    expect(resolvePlan("aeiici")).toBe("audit");
    expect(resolvePlan("AEIICI")).toBe("audit");
  });
  it("ae_ici / ae_iici", () => {
    expect(resolvePlan("ae_ici")).toBe("pro");
    expect(resolvePlan("ae_iici")).toBe("audit");
  });
  it("alias-urile vechi rămân funcționale", () => {
    expect(resolvePlan("starter")).toBe("audit");
    expect(resolvePlan("standard")).toBe("pro");
    expect(resolvePlan("professional")).toBe("expert");
  });
});

describe("PLAN_FEATURES — câmpuri noi MDLPA v6.2", () => {
  it("toate planurile au câmpurile MDLPA noi definite", () => {
    for (const plan of Object.keys(PLAN_FEATURES)) {
      const t = PLAN_FEATURES[plan];
      expect(t, `plan=${plan}`).toHaveProperty("gradMdlpaRequired");
      expect(t, `plan=${plan}`).toHaveProperty("auditEnergetic");
      expect(t, `plan=${plan}`).toHaveProperty("nzebReport");
      expect(t, `plan=${plan}`).toHaveProperty("buildingCategoryRestricted");
    }
  });

  it("audit (AE IIci): nzebReport=false, auditEnergetic=false", () => {
    expect(PLAN_FEATURES.audit.nzebReport).toBe(false);
    expect(PLAN_FEATURES.audit.auditEnergetic).toBe(false);
    expect(PLAN_FEATURES.audit.buildingCategoryRestricted).toEqual(["RI", "RC", "RA", "BC"]);
  });

  it("pro (AE Ici): nzebReport=true, auditEnergetic=true, fără restricții categorie", () => {
    expect(PLAN_FEATURES.pro.nzebReport).toBe(true);
    expect(PLAN_FEATURES.pro.auditEnergetic).toBe(true);
    expect(PLAN_FEATURES.pro.buildingCategoryRestricted).toBe(null);
  });

  it("expert/birou/enterprise: extind AE Ici", () => {
    for (const plan of ["expert", "birou", "enterprise"]) {
      expect(PLAN_FEATURES[plan].gradMdlpaRequired, plan).toBe("Ici");
      expect(PLAN_FEATURES[plan].nzebReport, plan).toBe(true);
      expect(PLAN_FEATURES[plan].auditEnergetic, plan).toBe(true);
    }
  });
});

describe("canAccess — feature nzebReport (AE Ici only)", () => {
  it("AE IIci nu are acces la raport nZEB", () => {
    expect(canAccess("audit", "nzebReport")).toBe(false);
  });
  it("AE Ici / Expert / Birou / Enterprise au acces", () => {
    for (const plan of ["pro", "expert", "birou", "enterprise"]) {
      expect(canAccess(plan, "nzebReport"), plan).toBe(true);
    }
  });
  it("Edu are acces (didactic)", () => {
    expect(canAccess("edu", "nzebReport")).toBe(true);
  });
  it("Free nu are acces", () => {
    expect(canAccess("free", "nzebReport")).toBe(false);
  });
});
