import { describe, it, expect, beforeAll } from "vitest";
import {
  isResidentialCategory,
  validateGradVsBuildingCategory,
  validateAuditorGradMatchesPlan,
  mapLegacyGradeToNew,
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
      // Cazul: auditorul a luat plan superior dar atestatul real e IIci.
      // Sprint v6.3 — mesajul e unificat (effectiveGrade=IIci indiferent de sursă).
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "Ici", auditorGrad: "IIci", buildingCategory: "BIR",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.message).toMatch(/nu poate fi certificată de un auditor AE IIci/);
      expect(r.legalRef).toMatch(/Art\. 6 alin\. \(2\)/);
      expect(r.upgradePath).toBe("AE Ici");
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

  describe("validateGradVsBuildingCategory — Sprint v6.3 reguli scope/public", () => {
    it("blochează AE IIci la scop=renovare chiar pe rezidențial (Art. 6 alin. 2)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "RI", scopCpe: "renovare",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.message).toMatch(/renovare/i);
      expect(r.upgradePath).toBe("AE Ici");
    });
    it("blochează AE IIci la schimbare destinație (scop nepermis)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "RI", scopCpe: "schimbare_destinatie",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
    });
    it("blochează AE IIci la clădire publică rezidențială (case protocol)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "RI", scopCpe: "construire", isPublic: true,
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.legalRef).toMatch(/L\.372\/2005/);
    });
    it("blochează AE IIci la vânzare bloc întreg (RC + vanzare)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "RC", scopCpe: "vanzare",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.message).toMatch(/bloc.*întreg/i);
    });
    it("blochează AE IIci la apartament construire individuală (BC + construire)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "BC", scopCpe: "construire",
      });
      expect(r.valid).toBe(false);
      expect(r.severity).toBe("blocking");
      expect(r.message).toMatch(/apartament/i);
    });
    it("permite AE IIci pe casă construire (RI + construire)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "RI", scopCpe: "construire",
      });
      expect(r.valid).toBe(true);
    });
    it("permite AE IIci pe apartament vânzare (BC + vanzare)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "IIci", auditorGrad: "IIci",
        buildingCategory: "BC", scopCpe: "vanzare",
      });
      expect(r.valid).toBe(true);
    });
    it("permite AE Ici la orice scop pe orice categorie (Art. 6 alin. 1)", () => {
      for (const scop of ["construire", "vanzare", "inchiriere", "renovare", "receptie"]) {
        for (const cat of ["RI", "RC", "BC", "BIR", "SP", "SC", "AL"]) {
          const r = validateGradVsBuildingCategory({
            gradMdlpaRequired: "Ici", auditorGrad: "Ici",
            buildingCategory: cat, scopCpe: scop, isPublic: false,
          });
          expect(r.valid, `cat=${cat} scop=${scop}`).toBe(true);
        }
      }
    });
    it("permite AE Ici pe clădire publică (Art. 6 alin. 1 lit. a)", () => {
      const r = validateGradVsBuildingCategory({
        gradMdlpaRequired: "Ici", auditorGrad: "Ici",
        buildingCategory: "RI", scopCpe: "construire", isPublic: true,
      });
      expect(r.valid).toBe(true);
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

  describe("mapLegacyGradeToNew — T5 Sprint Tranziție 2026", () => {
    it("'grad I civile' → Ici cu confidence high", () => {
      const r = mapLegacyGradeToNew("grad I civile");
      expect(r.grade).toBe("Ici");
      expect(r.confidence).toBe("high");
    });

    it("'grad II civile' → IIci cu confidence high", () => {
      const r = mapLegacyGradeToNew("grad II civile");
      expect(r.grade).toBe("IIci");
      expect(r.confidence).toBe("high");
    });

    it("'GRADUL II CIVILE' (uppercase) → IIci", () => {
      const r = mapLegacyGradeToNew("GRADUL II CIVILE");
      expect(r.grade).toBe("IIci");
    });

    it("'grad I+II constructii' → Ici (permisiv) cu confidence high", () => {
      const r = mapLegacyGradeToNew("grad I+II constructii");
      expect(r.grade).toBe("Ici");
      expect(r.confidence).toBe("high");
      expect(r.interpretation).toMatch(/permisiv/);
    });

    it("'grad I și II civile' (combinație lingvistică) → Ici", () => {
      const r = mapLegacyGradeToNew("grad I și II civile");
      expect(r.grade).toBe("Ici");
      expect(r.confidence).toBe("high");
    });

    it("'auditor energetic grad I instalații' → Ici", () => {
      const r = mapLegacyGradeToNew("auditor energetic grad I instalații");
      expect(r.grade).toBe("Ici");
    });

    it("text gol → null cu interpretare clarificare", () => {
      const r = mapLegacyGradeToNew("");
      expect(r.grade).toBe(null);
      expect(r.confidence).toBe("low");
      expect(r.interpretation).toMatch(/gol|lipsă/);
    });

    it("null sau undefined → null", () => {
      expect(mapLegacyGradeToNew(null).grade).toBe(null);
      expect(mapLegacyGradeToNew(undefined).grade).toBe(null);
    });

    it("text fără grade detectabile → null", () => {
      const r = mapLegacyGradeToNew("auditor energetic atestat");
      expect(r.grade).toBe(null);
      expect(r.confidence).toBe("low");
    });

    it("input non-string → null safe", () => {
      expect(mapLegacyGradeToNew(123).grade).toBe(null);
      expect(mapLegacyGradeToNew({}).grade).toBe(null);
    });
  });

});
