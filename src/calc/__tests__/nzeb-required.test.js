/**
 * Sprint 8 mai 2026 — teste helper requiresNZEBReport()
 * Acoperă toate ramurile (excepții Art. 4 L.372/2005 + cazuri obligatorii Art. 13¹ + opționale).
 */
import { describe, it, expect } from "vitest";
import { requiresNZEBReport, isNZEBReportRequired } from "../nzeb-required.js";

describe("requiresNZEBReport — gating juridic raport nZEB", () => {

  describe("Cazuri OBLIGATORII (Art. 13¹ L.372/2005 + Art. 9 EPBD)", () => {
    it("Clădire nouă scopCpe=construire → required", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RC", areaUseful: 800,
      });
      expect(r.required).toBe(true);
      expect(r.severity).toBe("required");
      expect(r.article).toContain("Art. 13");
    });

    it("Recepție clădire nouă (scopCpe=receptie) → required", () => {
      const r = requiresNZEBReport({
        scopCpe: "receptie", category: "BI", areaUseful: 1200,
      });
      expect(r.required).toBe(true);
      expect(r.severity).toBe("required");
    });

    it("Proiectare (scopCpe=proiectare) → required", () => {
      const r = requiresNZEBReport({
        scopCpe: "proiectare", category: "RA", areaUseful: 65,
      });
      expect(r.required).toBe(true);
    });

    it("Renovare majoră (scopCpe=renovare) → required (Art. 9 EPBD)", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare", category: "RC", areaUseful: 800,
      });
      expect(r.required).toBe(true);
      expect(r.severity).toBe("required");
      expect(r.article).toContain("Art. 9 EPBD");
    });

    it("Renovare majoră (scopCpe=renovare_majora — alias explicit demo) → required", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare_majora", category: "RC", areaUseful: 800,
      });
      expect(r.required).toBe(true);
    });
  });

  describe("EXCEPȚII Art. 4 L.372/2005 R2", () => {
    it("Clădire <50 m² → exempted (lit. f)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RI", areaUseful: 45,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. f)");
      expect(r.reason).toMatch(/45/);
    });

    it("Au=50 fix → NU este exceptat (limita strict <50)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RI", areaUseful: 50,
      });
      expect(r.required).toBe(true);
    });

    it("Monument istoric isHistoric=true → exempted (lit. a)", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare", category: "RC", areaUseful: 800,
        isHistoric: true,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. a)");
    });

    it("LMI clasa A → exempted", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare", category: "AL", areaUseful: 1200,
        lmiClass: "A",
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.reason).toContain("clasa LMI A");
    });

    it("LMI clasa B → exempted", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare", category: "AL", areaUseful: 800,
        lmiClass: "B",
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
    });

    it("LMI clasa C → NU este exempted (doar A/B sunt monumente)", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare", category: "RC", areaUseful: 800,
        lmiClass: "C",
      });
      expect(r.required).toBe(true);
    });

    it("Loc de cult isReligious=true → exempted (lit. b)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "AL", areaUseful: 600,
        isReligious: true,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. b)");
    });

    it("Clădire provizorie isProvisional=true → exempted (lit. c)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "AL", areaUseful: 200,
        isProvisional: true,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. c)");
    });

    it("Clădire industrială cat=IN → exempted (lit. d)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "IN", areaUseful: 5000,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. d)");
    });

    it("Casă de vacanță (RA, ocupare 3 luni/an) → exempted (lit. e)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RA", areaUseful: 80,
        occupancyMonths: 3,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("exempted");
      expect(r.article).toContain("lit. e)");
    });

    it("Casă cu ocupare 4 luni/an → NU mai e exceptată (limita ≥ 4)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RA", areaUseful: 80,
        occupancyMonths: 4,
      });
      expect(r.required).toBe(true);
    });

    it("Ocupare scăzută pe nerezidențial NU se aplică", () => {
      // Birou cu ocupare 3 luni nu intră în excepție (e doar pentru RI/RC/RA)
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "BI", areaUseful: 800,
        occupancyMonths: 3,
      });
      expect(r.required).toBe(true);
    });
  });

  describe("Cazuri OPȚIONALE — CPE existent", () => {
    it("CPE vânzare → optional (nu obligatoriu)", () => {
      const r = requiresNZEBReport({
        scopCpe: "vanzare", category: "RA", areaUseful: 65,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("optional");
      expect(r.reason).toMatch(/vânzare/i);
    });

    it("CPE închiriere → optional", () => {
      const r = requiresNZEBReport({
        scopCpe: "inchiriere", category: "BI", areaUseful: 200,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("optional");
      expect(r.reason).toMatch(/închiriere/i);
    });

    it("CPE informare → optional", () => {
      const r = requiresNZEBReport({
        scopCpe: "informare", category: "RC", areaUseful: 500,
      });
      expect(r.severity).toBe("optional");
    });

    it("Scop nespecificat → optional cu mesaj de verificare manuală", () => {
      const r = requiresNZEBReport({
        category: "RC", areaUseful: 500,
      });
      expect(r.required).toBe(false);
      expect(r.severity).toBe("optional");
    });
  });

  describe("Edge cases", () => {
    it("Building null → optional fallback prudent", () => {
      const r = requiresNZEBReport(null);
      expect(r.required).toBe(false);
      expect(r.severity).toBe("optional");
    });

    it("Building {} (gol) → optional fallback", () => {
      const r = requiresNZEBReport({});
      expect(r.required).toBe(false);
    });

    it("Au lipsă (NaN) NU declanșează excepția <50", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RC", areaUseful: "",
      });
      // NaN nu trece testul "Au < 50" → continuă spre OBLIGATORIU
      expect(r.required).toBe(true);
    });

    it("Au=0 NU declanșează excepția <50 (filtrare zgomot)", () => {
      const r = requiresNZEBReport({
        scopCpe: "construire", category: "RC", areaUseful: 0,
      });
      expect(r.required).toBe(true);
    });

    it("scopCpe cu majuscule → normalizat la lowercase", () => {
      const r = requiresNZEBReport({
        scopCpe: "CONSTRUIRE", category: "RC", areaUseful: 800,
      });
      expect(r.required).toBe(true);
    });
  });

  describe("isNZEBReportRequired sugar", () => {
    it("Întoarce doar boolean", () => {
      expect(isNZEBReportRequired({ scopCpe: "construire", category: "RC", areaUseful: 800 })).toBe(true);
      expect(isNZEBReportRequired({ scopCpe: "vanzare", category: "RA", areaUseful: 65 })).toBe(false);
    });
  });

  describe("Compatibilitate cu demo M1 (Bd. Tomis 287)", () => {
    it("Demo M1 (RA renovare 65 m²) → required", () => {
      const r = requiresNZEBReport({
        scopCpe: "renovare",
        category: "RA",
        areaUseful: 65,
      });
      expect(r.required).toBe(true);
      expect(r.severity).toBe("required");
    });
  });
});
