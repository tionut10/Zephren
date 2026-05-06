/**
 * @vitest-environment jsdom
 *
 * Tests pentru extensiile passport-export.js (Sprint Pas 7 docs 6 mai 2026):
 *   - getApplicableFundingPrograms (logică selectare programe RO 2026)
 *   - exportPassportPDF cu date COMPLETE (multi-page A4)
 *   - Format helpers fmtNum + fmtRON
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { exportPassportPDF, _internals } from "../passport-export.js";
import { buildRenovationPassport } from "../../calc/renovation-passport.js";

const { getApplicableFundingPrograms, fmtNum, fmtRON, CLASS_COLORS_PDF } = _internals;

describe("passport-export _internals", () => {
  describe("fmtNum", () => {
    it("formatează cu virgulă RO ca separator zecimal", () => {
      expect(fmtNum(123.456, 2)).toBe("123,46");
      expect(fmtNum(0, 1)).toBe("0,0");
    });

    it("returnează — pentru valori non-finite", () => {
      expect(fmtNum(NaN)).toBe("—");
      expect(fmtNum(Infinity)).toBe("—");
      expect(fmtNum(undefined)).toBe("—");
    });
  });

  describe("fmtRON", () => {
    it("formatează cu separator de mii ro-RO", () => {
      const r = fmtRON(123456);
      expect(r).toMatch(/123.456/); // poate folosi . sau spațiu
    });

    it("returnează — pentru 0 sau invalid", () => {
      expect(fmtRON(0)).toBe("—");
      expect(fmtRON(null)).toBe("—");
      expect(fmtRON(NaN)).toBe("—");
    });
  });

  describe("CLASS_COLORS_PDF", () => {
    it("conține toate clasele A-G", () => {
      ["A", "B", "C", "D", "E", "F", "G"].forEach((c) => {
        expect(CLASS_COLORS_PDF[c]).toHaveLength(3);
      });
    });
  });

  describe("getApplicableFundingPrograms", () => {
    const buildSample = (category, hasEnvelope = true, hasRenewable = false) => ({
      building: { category },
      roadmap: {
        phases: [
          {
            measures: [
              hasEnvelope ? { name: "Termoizolare pereți", category: "Anvelopă" } : null,
              hasRenewable ? { name: "Sistem fotovoltaic PV", category: "Regenerabile" } : null,
            ].filter(Boolean),
          },
        ],
      },
    });

    it("rezidențial cu anvelopă → PNRR Locuințe eligibil", () => {
      const programs = getApplicableFundingPrograms(buildSample("RA", true, false));
      const pnrr = programs.find((p) => p.name.includes("PNRR") && /locuințe/i.test(p.name));
      expect(pnrr).toBeDefined();
      expect(pnrr.eligibil).toBe(true);
    });

    it("clădire publică (BI) → PNRR Clădiri publice eligibil", () => {
      const programs = getApplicableFundingPrograms(buildSample("BI", true, false));
      const pnrr = programs.find((p) => p.name.includes("PNRR") && p.name.includes("publice"));
      expect(pnrr).toBeDefined();
    });

    it("rezidențial cu PV → AFM Casa Verde Plus PV eligibil", () => {
      const programs = getApplicableFundingPrograms(buildSample("RA", false, true));
      const afm = programs.find((p) => p.name.includes("Casa Verde") && p.name.includes("Fotovoltaice"));
      expect(afm).toBeDefined();
      expect(afm.eligibil).toBe(true);
    });

    it("nerezidențial NU primește AFM PV (doar locuințe)", () => {
      const programs = getApplicableFundingPrograms(buildSample("BI", false, true));
      const afm = programs.find((p) => p.name.includes("Casa Verde") && p.name.includes("Fotovoltaice"));
      expect(afm).toBeUndefined();
    });

    it("clădire publică mare (BI/SA/ED) → ELENA disponibil ca opțiune", () => {
      const programs = getApplicableFundingPrograms(buildSample("BI", true, false));
      const elena = programs.find((p) => p.name.includes("ELENA"));
      expect(elena).toBeDefined();
    });

    it("toate clădirile primesc opțiunea credit verde BNR", () => {
      ["RA", "RC", "RI", "BI", "ED", "AL"].forEach((cat) => {
        const programs = getApplicableFundingPrograms(buildSample(cat, true, false));
        const credit = programs.find((p) => p.name.includes("Credit verde"));
        expect(credit).toBeDefined();
      });
    });

    it("creditul verde devine eligibil când există anvelopă SAU regenerabile", () => {
      const cu = getApplicableFundingPrograms(buildSample("RA", true, false));
      const credit1 = cu.find((p) => p.name.includes("Credit verde"));
      expect(credit1.eligibil).toBe(true);

      // Sample fără anvelopă/regenerabile
      const fara = getApplicableFundingPrograms({ building: { category: "RA" }, roadmap: { phases: [] } });
      const credit2 = fara.find((p) => p.name.includes("Credit verde"));
      expect(credit2.eligibil).toBe(false);
    });
  });
});

describe("exportPassportPDF — extins multi-page", () => {
  let clickSpy;
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const buildFullPassport = () =>
    buildRenovationPassport({
      cpeCode: "CE-2026-01875",
      building: {
        address: "Bd. Tomis 287",
        category: "RA",
        areaUseful: 65,
        yearBuilt: 1972,
        cadastralNumber: "12345",
      },
      instSummary: { ep_total_m2: 280, ep_nren_m2: 270, ep_ren_m2: 10, co2_total_m2: 65, energyClass: "G" },
      renewSummary: { rer: 5 },
      climate: { zone: "II" },
      auditor: { name: "ing. Test", certNr: "CT-01875", category: "AE Ici", firm: "Test SRL" },
      phasedPlan: {
        strategy: "balanced",
        totalYears: 5,
        annualBudget: 50000,
        energyPrice: 0.45,
        discountRate: 0.04,
        phases: [
          {
            year: 2027,
            measures: [
              { id: "m1", name: "Termoizolare pereți 10cm", category: "Anvelopă",
                ep_reduction_kWh_m2: 60, co2_reduction: 14, cost_RON: 25000, lifespan_years: 30 },
              { id: "m2", name: "Înlocuire ferestre tripan", category: "Anvelopă",
                ep_reduction_kWh_m2: 40, co2_reduction: 9, cost_RON: 20000, lifespan_years: 25 },
            ],
            phaseCost_RON: 45000,
            cumulativeCost_RON: 45000,
            ep_after: 180,
            class_after: "E",
            annualSaving_RON: 4500,
          },
          {
            year: 2029,
            measures: [
              { id: "m3", name: "Pompă căldură aer-apă", category: "Instalații",
                ep_reduction_kWh_m2: 50, co2_reduction: 12, cost_RON: 30000, lifespan_years: 20 },
              { id: "m4", name: "Sistem PV 5 kWp", category: "Regenerabile",
                ep_reduction_kWh_m2: 35, co2_reduction: 8, cost_RON: 22000, lifespan_years: 25 },
            ],
            phaseCost_RON: 52000,
            cumulativeCost_RON: 97000,
            ep_after: 95,
            class_after: "C",
            annualSaving_RON: 5800,
          },
        ],
        epTrajectory: [280, 180, 95],
        classTrajectory: ["G", "E", "C"],
        summary: { ep_final: 95, class_final: "C", nzeb_reached: false },
      },
      mepsStatus: { thresholds: { ep2030: 110, ep2nd: 90, milestone2: 2035 }, level: "noncompliant" },
      financialSummary: {
        totalInvest_RON: 97000,
        npv: 35000,
        irr: 8.5,
        paybackSimple: 12.4,
        paybackDiscounted: 14.8,
        perspective: "financial",
      },
      fundingEligible: { maxGrantCombined: 30000, programs: ["PNRR C5", "AFM Casa Verde"] },
      changeReason: "Test sprint",
      changedBy: "Test",
    });

  it("generează PDF cu blob valid pentru pașaport complet", async () => {
    const passport = buildFullPassport();
    const r = await exportPassportPDF(passport, {
      building: passport.building,
      auditor: { name: "ing. Test", atestat: "CT-01875", grade: "AE Ici", company: "Test SRL" },
      energyClass: "G",
      epPrimary: 280,
    });
    expect(r.size).toBeGreaterThan(5000); // PDF cu măsuri + grafic + tabele > 5KB
    expect(r.filename).toMatch(/^pasaport_renovare_.*\.pdf$/i);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("merge cu plan etapizat fără măsuri", async () => {
    const passport = buildRenovationPassport({
      building: { address: "X", category: "RA", areaUseful: 100 },
      instSummary: { ep_total_m2: 200, energyClass: "F" },
    });
    const r = await exportPassportPDF(passport);
    expect(r.size).toBeGreaterThan(2000);
  });

  it("filename respectă convenția pasaport_renovare_<id>_<date>", async () => {
    const passport = buildFullPassport();
    const r = await exportPassportPDF(passport);
    expect(r.filename).toMatch(/^pasaport_renovare_[0-9a-f]{8}_\d{4}-\d{2}-\d{2}\.pdf$/i);
  });

  it("acceptă filename custom", async () => {
    const passport = buildFullPassport();
    const r = await exportPassportPDF(passport, { filename: "custom.pdf" });
    expect(r.filename).toBe("custom.pdf");
  });
});
