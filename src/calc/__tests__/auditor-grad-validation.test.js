import { describe, it, expect } from "vitest";
import {
  isResidentialCategory,
  validateGradVsBuildingCategory,
  validateAuditorGradMatchesPlan,
  RESIDENTIAL_CATEGORIES,
  NON_RESIDENTIAL_CATEGORIES,
} from "../auditor-grad-validation.js";

describe("auditor-grad-validation — Sprint v6.2 (Ord. MDLPA 348/2026)", () => {

  describe("isResidentialCategory", () => {
    it("recunoaște RI/RC/RA/BC ca rezidențiale", () => {
      for (const cat of ["RI", "RC", "RA", "BC"]) {
        expect(isResidentialCategory(cat)).toBe(true);
      }
    });
    it("respinge categoriile nerezidențiale", () => {
      for (const cat of ["BIR", "SP", "SC", "HOT", "COM", "AL", "IU", "HAL"]) {
        expect(isResidentialCategory(cat)).toBe(false);
      }
    });
    it("acceptă input case-insensitive", () => {
      expect(isResidentialCategory("ri")).toBe(true);
      expect(isResidentialCategory("Ri")).toBe(true);
    });
    it("returnează false pentru null/empty", () => {
      expect(isResidentialCategory(null)).toBe(false);
      expect(isResidentialCategory("")).toBe(false);
      expect(isResidentialCategory(undefined)).toBe(false);
    });
  });

  describe("validateGradVsBuildingCategory — Plan AE IIci (audit)", () => {
    it("blochează AE IIci pe clădire de birouri", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci",
        auditorGrad: "IIci",
        buildingCategory: "BIR",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.upgradePath).toBe("AE Ici");
      expect(r.legalRef).toMatch(/Art\. 6 alin\. \(2\)/);
      expect(r.message).toMatch(/AE IIci/);
    });
    it("blochează AE IIci pe școală/spital/comercial", () => {
      for (const cat of ["SC", "SP", "COM", "HAL", "IU"]) {
        const r = validateGradVsBuildingCategory({
          gradMdlpaRequired: "IIci", auditorGrad: "IIci", buildingCategory: cat,
        });
        expect(r.valid, `cat=${cat}`).toBe(false);
        expect(r.severity).toBe("blocking");
      }
    });
    it("permite AE IIci pe locuință unifamilială (RI)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci", buildingCategory: "RI",
      });
      expect(r.valid).toBe(true);
      expect(r.severity).toBe("ok");
    });
    it("permite AE IIci pe bloc de locuințe (RC/RA/BC)", () => {
      for (const cat of ["RC", "RA", "BC"]) {
        const r = validateGradVsBuildingCategory({
          gradMdlpaRequired: "IIci", auditorGrad: "IIci", buildingCategory: cat,
        });
        expect(r.valid, `cat=${cat}`).toBe(true);
      }
    });
  });

  describe("validateGradVsBuildingCategory — Plan AE Ici (pro)", () => {
    it("permite AE Ici pe TOATE categoriile", () => {
      for (const cat of [...RESIDENTIAL_CATEGORIES, ...NON_RESIDENTIAL_CATEGORIES]) {
        const r = validateGradVsBuildingCategory({
          gradMdlpaRequired: "Ici", auditorGrad: "Ici", buildingCategory: cat,
        });
        expect(r.valid, `cat=${cat}`).toBe(true);
      }
    });
    it("blochează auditor cu atestat IIci pe plan Ici dacă încearcă nerezidențial", () => {
      // Cazul: auditorul a luat plan superior dar atestatul real e IIci
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "Ici", auditorGrad: "IIci", buildingCategory: "BIR",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.message).toMatch(/Atestatul tău MDLPA este AE IIci/);
    });
    it("permite auditor IIci pe plan Ici pentru rezidențial", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "Ici", auditorGrad: "IIci", buildingCategory: "RI",
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("validateGradVsBuildingCategory — edge cases", () => {
    it("Free/Edu (gradMdlpaRequired=null) trec fără validare", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: null, auditorGrad: null, buildingCategory: "BIR",
      });
      expect(r.valid).toBe(true);
      expect(r.severity).toBe("ok");
    });
    it("categorie lipsă → severity info, nu blocking", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci", buildingCategory: "",
      });
      expect(r.valid).toBe(true);
      expect(r.severity).toBe("info");
    });
  });

  describe("validateAuditorGradMatchesPlan", () => {
    it("ok dacă plan nu cere grad", () => {
      const r = validateAuditorGradMatchesPlan({ auditorGrad: null, gradMdlpaRequired: null });
      expect(r.valid).toBe(true);
      expect(r.severity).toBe("ok");
    });
    it("warning dacă plan cere grad și auditorul nu a completat", () => {
      const r = validateAuditorGradMatchesPlan({ auditorGrad: "", gradMdlpaRequired: "IIci" });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("warning");
      expect(r.message).toMatch(/Completează gradul/);
    });
    it("ok dacă AE Ici acoperă cerința AE IIci", () => {
      const r = validateAuditorGradMatchesPlan({ auditorGrad: "Ici", gradMdlpaRequired: "IIci" });
      expect(r.valid).toBe(true);
    });
    it("warning dacă auditor IIci pe plan Ici", () => {
      const r = validateAuditorGradMatchesPlan({ auditorGrad: "IIci", gradMdlpaRequired: "Ici" });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("warning");
    });
  });

});
