/**
 * Tests pentru unified-rehab-costs.js — helper canonic pentru toate cele 3 documente.
 *
 * Sprint Pas 7 docs (6 mai 2026) P0-1 — verifică unicitatea sursei de adevăr
 * pentru costuri reabilitare (Deviz + CPE Estimat + Pașaport).
 */
import { describe, it, expect } from "vitest";
import {
  buildCanonicalMeasures,
  buildFinancialSummary,
  canonicalToPhasedMeasures,
  _internals,
} from "../unified-rehab-costs.js";

const sampleInputs = () => ({
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
  hpPower: "6",
  addPV: true,
  pvArea: "20",
  addSolarTh: false,
});

const sampleOpaque = () => [
  { type: "PE", area: "120" },
  { type: "PE", area: "80" },
  { type: "PP", area: "85" },
  { type: "PB", area: "50" },
];

const sampleGlazing = () => [
  { type: "F", area: "12", u: "1.4" },
  { type: "F", area: "8", u: "1.4" },
];

describe("unified-rehab-costs — buildCanonicalMeasures", () => {
  it("returnează listă goală pentru inputs null", () => {
    expect(buildCanonicalMeasures(null, [], [], { eurRon: 5.0 })).toEqual([]);
  });

  it("calculează arii din opaqueElements REALE (nu valori hardcoded)", () => {
    const m = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon: 5.0 });
    const wall = m.find(x => x.id === "insul_wall");
    expect(wall.qty).toBe(200); // 120 + 80 (suma PE)
    const roof = m.find(x => x.id === "insul_roof");
    expect(roof.qty).toBe(85);
    const win = m.find(x => x.id === "replace_windows");
    expect(win.qty).toBe(20); // 12 + 8
  });

  it("toate măsurile au cost EUR + RON cu cursul corect aplicat", () => {
    const eurRon = 5.05;
    const m = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon });
    m.forEach(mm => {
      expect(mm.costEUR).toBeGreaterThan(0);
      expect(mm.costRON).toBe(Math.round(mm.costEUR * eurRon));
    });
  });

  it("măsurile au câmpurile așteptate (id, label, qty, unit, cost*, normativ, lifespan)", () => {
    const m = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon: 5.0 });
    expect(m.length).toBeGreaterThan(0);
    const wall = m[0];
    expect(wall).toHaveProperty("id");
    expect(wall).toHaveProperty("label");
    expect(wall).toHaveProperty("qty");
    expect(wall).toHaveProperty("unit");
    expect(wall).toHaveProperty("costEUR");
    expect(wall).toHaveProperty("costRON");
    expect(wall).toHaveProperty("normativ");
    expect(wall).toHaveProperty("lifespan_years");
    expect(wall).toHaveProperty("priority");
  });

  it("nu include măsurile NEbifate", () => {
    const m = buildCanonicalMeasures(
      { addInsulWall: true, insulWallThickness: "10" },
      sampleOpaque(),
      sampleGlazing(),
      { eurRon: 5.0 }
    );
    expect(m).toHaveLength(1);
    expect(m[0].id).toBe("insul_wall");
  });

  it("PV + solar termic au unitate m² și cost proporțional cu suprafața", () => {
    const m = buildCanonicalMeasures(
      { addPV: true, pvArea: "30", addSolarTh: true, solarThArea: "6" },
      [], [], { eurRon: 5.0 }
    );
    const pv = m.find(x => x.id === "pv_system");
    const solar = m.find(x => x.id === "solar_thermal");
    expect(pv.qty).toBe(30);
    expect(pv.unit).toBe("m²");
    expect(solar.qty).toBe(6);
    expect(solar.costEUR).toBeGreaterThan(pv.costEUR / 30 * 5); // solar > PV per m²
  });

  it("HR cu η>=90 folosește hr90 din REHAB_COSTS, η<80 folosește hr70", () => {
    const m1 = buildCanonicalMeasures({ addHR: true, hrEfficiency: "92" }, [], [], { eurRon: 5.0 });
    const m2 = buildCanonicalMeasures({ addHR: true, hrEfficiency: "75" }, [], [], { eurRon: 5.0 });
    expect(m1[0].costEUR).toBeGreaterThan(m2[0].costEUR);
  });
});

describe("unified-rehab-costs — buildFinancialSummary", () => {
  it("calculează total EUR + RON cu TVA 21%", () => {
    const measures = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon: 5.05 });
    const fin = buildFinancialSummary(measures, { eurRon: 5.05, qfSavedKwh: 5000 });
    expect(fin.totalEUR).toBeGreaterThan(0);
    expect(fin.totalRON).toBeGreaterThan(0);
    expect(fin.totalWithTvaEUR).toBe(Math.round(fin.totalEUR * 1.21));
  });

  it("calculează economii anuale și payback", () => {
    const measures = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon: 5.0 });
    const fin = buildFinancialSummary(measures, { qfSavedKwh: 10000, energyPriceEURperKwh: 0.13 });
    expect(fin.annualSavingEUR).toBe(1300);
    expect(fin.paybackYears).toBeGreaterThan(0);
    expect(fin.paybackYears).toBeLessThan(50);
  });

  it("payback null când qfSaved=0", () => {
    const fin = buildFinancialSummary([{ costEUR: 1000, costRON: 5000 }], { qfSavedKwh: 0 });
    expect(fin.paybackYears).toBeNull();
  });
});

describe("unified-rehab-costs — canonicalToPhasedMeasures", () => {
  it("convertește în format compatibil cu calcPhasedRehabPlan", () => {
    const canonical = buildCanonicalMeasures(sampleInputs(), sampleOpaque(), sampleGlazing(), { eurRon: 5.0 });
    const phased = canonicalToPhasedMeasures(canonical);
    expect(phased.length).toBe(canonical.length);
    phased.forEach(p => {
      expect(p).toHaveProperty("ep_reduction_kWh_m2");
      expect(p).toHaveProperty("co2_reduction");
      expect(p).toHaveProperty("cost_RON");
      expect(p).toHaveProperty("lifespan_years");
    });
  });

  it("acceptă override-uri ΔEP per id măsură", () => {
    const canonical = buildCanonicalMeasures(
      { addInsulWall: true, insulWallThickness: "10" },
      sampleOpaque(), [], { eurRon: 5.0 }
    );
    const phased = canonicalToPhasedMeasures(canonical, { epReductions: { insul_wall: 99 } });
    expect(phased[0].ep_reduction_kWh_m2).toBe(99);
  });
});

describe("unified-rehab-costs — _internals.estimateEpReduction", () => {
  it("acopere toate ID-urile de măsură", () => {
    const ids = ["insul_wall", "insul_roof", "insul_basement", "replace_windows",
                 "vmc_hr", "heat_pump", "pv_system", "solar_thermal"];
    ids.forEach(id => {
      const m = { id, qty: 10 };
      expect(_internals.estimateEpReduction(m)).toBeGreaterThan(0);
    });
  });

  it("PV scale liniar cu suprafața", () => {
    const m1 = _internals.estimateEpReduction({ id: "pv_system", qty: 10 });
    const m2 = _internals.estimateEpReduction({ id: "pv_system", qty: 20 });
    expect(m2).toBe(m1 * 2);
  });
});
