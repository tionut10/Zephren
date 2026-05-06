/**
 * @vitest-environment jsdom
 *
 * Tests pentru cpe-post-rehab-pdf.js — generator CPE estimat post-reabilitare.
 * Verifică helperi interne (buildMeasuresList, estimateAnnualEnergyCostRON) +
 * generarea PDF end-to-end (download triggered, blob valid, filename pattern).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  exportCpePostRehabPDF,
  _internals,
} from "../cpe-post-rehab-pdf.js";
// Sprint Pas 7 docs (6 mai 2026) — buildMeasuresList e acum adaptor peste
// helper-ul canonic. Testele folosesc direct buildCanonicalMeasures (sursa unică).
import { buildCanonicalMeasures } from "../../calc/unified-rehab-costs.js";

const { estimateAnnualEnergyCostRON, FUEL_PRICE_RON_KWH, CLASS_COLORS_RGB } = _internals;
// Adaptor: convertește format canonical → format vechi {label, area, cost} pentru testele existente.
const buildMeasuresList = (inputs, opaque, glazing) => {
  return buildCanonicalMeasures(inputs, opaque, glazing).map(m => ({
    label: m.label, area: m.qty, cost: m.costRON,
  }));
};

const sampleRehabComparison = () => ({
  original: { ep: 280, co2: 65, cls: "G", qfTotal: 18000 },
  rehab:    { ep: 95,  co2: 22, cls: "C", qfTotal: 6500 },
  savings:  { epPct: 66.1, co2Pct: 66.2, qfSaved: 11500 },
});

const sampleRehabInputs = () => ({
  addInsulWall: true,
  insulWallThickness: "10",
  addInsulRoof: true,
  insulRoofThickness: "15",
  addInsulBasement: false,
  replaceWindows: true,
  newWindowU: "0.9",
  addHR: true,
  hrEfficiency: "85",
  addHP: true,
  hpCOP: "4.2",
  addPV: true,
  pvArea: "30",
  addSolarTh: false,
});

const sampleOpaque = () => [
  { type: "PE", area: "120" },
  { type: "PE", area: "80" },
  { type: "PP", area: "85" },
  { type: "PB", area: "85" },
];

const sampleGlazing = () => [
  { type: "F", area: "12", u: "1.4" },
  { type: "F", area: "8", u: "1.4" },
];

const sampleREHAB_COSTS = {
  insulWall: { 5: 30, 10: 40, 15: 50 },
  insulRoof: { 10: 25, 15: 30, 20: 35 },
  insulBasement: { 5: 30, 8: 40, 10: 50 },
  windows: { 0.9: 200, 1.0: 180, 1.1: 160 },
  hr80: 5000,
  hr90: 6500,
  pvPerM2: 250,
  solarThPerM2: 350,
};

describe("cpe-post-rehab-pdf — internals", () => {
  describe("FUEL_PRICE_RON_KWH", () => {
    it("conține combustibilii principali RO", () => {
      expect(FUEL_PRICE_RON_KWH.electricitate).toBeGreaterThan(0);
      expect(FUEL_PRICE_RON_KWH.gaz).toBeGreaterThan(0);
      expect(FUEL_PRICE_RON_KWH.biomasa).toBeGreaterThan(0);
      expect(FUEL_PRICE_RON_KWH.termoficare).toBeGreaterThan(0);
    });

    it("electricitate > gaz (raport corect 2025)", () => {
      expect(FUEL_PRICE_RON_KWH.electricitate).toBeGreaterThan(FUEL_PRICE_RON_KWH.gaz);
    });
  });

  describe("CLASS_COLORS_RGB", () => {
    it("conține toate clasele A-G cu RGB triplete", () => {
      ["A", "B", "C", "D", "E", "F", "G"].forEach((c) => {
        expect(CLASS_COLORS_RGB[c]).toHaveLength(3);
        expect(CLASS_COLORS_RGB[c].every((v) => v >= 0 && v <= 255)).toBe(true);
      });
    });
  });

  describe("estimateAnnualEnergyCostRON", () => {
    it("calculează cost mix 70% combustibil principal + 30% electricitate", () => {
      const cost = estimateAnnualEnergyCostRON(10000, "gaz");
      // 10000 * (0.45*0.7 + 1.40*0.3) = 10000 * 0.735 = 7350
      expect(cost).toBeCloseTo(7350, 0);
    });

    it("fallback la gaz pentru combustibil necunoscut", () => {
      const c1 = estimateAnnualEnergyCostRON(10000, "gaz");
      const c2 = estimateAnnualEnergyCostRON(10000, "necunoscut");
      expect(c2).toBeCloseTo(c1, 0);
    });

    it("electricitate are cel mai mare cost (mix 70% elec + 30% elec)", () => {
      const elec = estimateAnnualEnergyCostRON(10000, "electricitate");
      const gaz = estimateAnnualEnergyCostRON(10000, "gaz");
      expect(elec).toBeGreaterThan(gaz);
    });

    it("returnează 0 pentru qfTotal=0", () => {
      expect(estimateAnnualEnergyCostRON(0, "gaz")).toBe(0);
    });
  });

  describe("buildMeasuresList", () => {
    it("returnează listă goală pentru rehabInputs null", () => {
      expect(buildMeasuresList(null, [], [], {})).toEqual([]);
    });

    it("include toate măsurile bifate", () => {
      const m = buildMeasuresList(sampleRehabInputs(), sampleOpaque(), sampleGlazing(), sampleREHAB_COSTS);
      expect(m.length).toBeGreaterThanOrEqual(6); // wall + roof + windows + HR + HP + PV
      const labels = m.map((x) => x.label).join(" | ");
      expect(labels).toContain("pereți");
      expect(labels).toContain("acoperiș");
      expect(labels).toContain("tâmplărie");
      expect(labels).toContain("recuperare");
      expect(labels).toContain("Pompă");
      expect(labels).toContain("fotovoltaic");
    });

    it("calculează aria totală pentru pereți (suma elementelor PE)", () => {
      const m = buildMeasuresList(sampleRehabInputs(), sampleOpaque(), sampleGlazing(), sampleREHAB_COSTS);
      const wall = m.find((x) => x.label.includes("pereți"));
      expect(wall.area).toBe(200); // 120 + 80
    });

    it("măsurile au cost numeric pozitiv (cu excepția HP fără cost)", () => {
      const m = buildMeasuresList(sampleRehabInputs(), sampleOpaque(), sampleGlazing(), sampleREHAB_COSTS);
      m.forEach((mm) => {
        if (mm.cost !== null) {
          expect(mm.cost).toBeGreaterThan(0);
        }
      });
    });

    it("nu include măsurile NEbifate", () => {
      const m = buildMeasuresList(
        { addInsulWall: true, insulWallThickness: "10" },
        sampleOpaque(), sampleGlazing(), sampleREHAB_COSTS
      );
      expect(m).toHaveLength(1);
      expect(m[0].label).toContain("pereți");
    });
  });
});

describe("cpe-post-rehab-pdf — exportCpePostRehabPDF", () => {
  let urlSpy;
  let clickSpy;
  beforeEach(() => {
    urlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("aruncă eroare dacă lipsește rehabComparison", async () => {
    await expect(
      exportCpePostRehabPDF({ building: { address: "Test" } })
    ).rejects.toThrow(/scenariul/i);
  });

  it("generează PDF cu blob valid pentru date complete", async () => {
    const r = await exportCpePostRehabPDF({
      building: { address: "Bd. Tomis 287", category: "RA", areaUseful: 65, yearBuilt: 1972 },
      auditor: { name: "ing. Test", atestat: "CT-01875", grade: "AE Ici", company: "Test SRL" },
      rehabComparison: sampleRehabComparison(),
      rehabScenarioInputs: sampleRehabInputs(),
      opaqueElements: sampleOpaque(),
      glazingElements: sampleGlazing(),
      REHAB_COSTS: sampleREHAB_COSTS,
      instSummary: { fuel: { id: "gaz" } },
      cpeCodeBase: "CE-2026-01875",
    });

    expect(r.size).toBeGreaterThan(2000); // PDF valid > 2KB
    expect(r.filename).toMatch(/cpe_estimat_post_reabilitare_.*\.pdf$/i);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("filename include slug din adresă", async () => {
    const r = await exportCpePostRehabPDF({
      building: { address: "Strada Mare 42", areaUseful: 100 },
      rehabComparison: sampleRehabComparison(),
      rehabScenarioInputs: sampleRehabInputs(),
      opaqueElements: sampleOpaque(),
      glazingElements: sampleGlazing(),
      REHAB_COSTS: sampleREHAB_COSTS,
    });
    expect(r.filename).toContain("Strada_Mare_42");
  });

  it("respectă filename custom dacă e furnizat", async () => {
    const r = await exportCpePostRehabPDF({
      building: { address: "X" },
      rehabComparison: sampleRehabComparison(),
      filename: "custom_test.pdf",
    });
    expect(r.filename).toBe("custom_test.pdf");
  });

  it("merge fără auditor (date opționale)", async () => {
    const r = await exportCpePostRehabPDF({
      building: { address: "X", areaUseful: 100 },
      rehabComparison: sampleRehabComparison(),
    });
    expect(r.size).toBeGreaterThan(1500);
  });

  it("acceptă cls ca object {cls} sau string", async () => {
    const r1 = await exportCpePostRehabPDF({
      building: { address: "X", areaUseful: 100 },
      rehabComparison: {
        original: { ep: 280, co2: 65, cls: { cls: "G" } },
        rehab:    { ep: 95,  co2: 22, cls: { cls: "C" } },
        savings:  { epPct: 66, co2Pct: 66, qfSaved: 10000 },
      },
    });
    expect(r1.size).toBeGreaterThan(1500);
  });
});
