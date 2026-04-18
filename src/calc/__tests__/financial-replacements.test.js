import { describe, it, expect } from "vitest";
import { calcFinancialAnalysis } from "../financial.js";

describe("Replacements intermediare + valoare reziduală EN 15459-1 Anexa B", () => {
  // Rate: 4% explicit pentru consistența cu expectedDelta (folosim 1.04)
  const baseParams = {
    investCost:  50000,
    annualSaving:  5000,
    annualMaint:    500,
    discountRate:     4,   // explicit 4%
    escalation:       3,
    period:          30,
  };

  // ─── Replacements ──────────────────────────────────────────────────────────

  it("replacement la an 15 crește globalCost cu cost/1.04^15", () => {
    const base    = calcFinancialAnalysis({ ...baseParams, replacementCosts: [] });
    const withRep = calcFinancialAnalysis({
      ...baseParams,
      replacementCosts: [{ year: 15, cost: 5000, component: "boiler" }],
    });
    const expectedDelta = 5000 / Math.pow(1.04, 15);
    // globalCost este Math.round() → toleranță ±1 RON
    expect(Math.abs((base.globalCost - withRep.globalCost) - (-expectedDelta))).toBeLessThan(2);
  });

  it("replacement după perioadă NU afectează globalCost", () => {
    const base    = calcFinancialAnalysis({ ...baseParams, replacementCosts: [] });
    const withRep = calcFinancialAnalysis({
      ...baseParams,
      replacementCosts: [{ year: 35, cost: 5000, component: "boiler" }], // după period=30
    });
    expect(withRep.globalCost).toBeCloseTo(base.globalCost, 0);
  });

  it("replacements multiple cresc globalCost proporțional", () => {
    const base     = calcFinancialAnalysis({ ...baseParams, replacementCosts: [] });
    const with2Rep = calcFinancialAnalysis({
      ...baseParams,
      replacementCosts: [
        { year: 10, cost: 3000, component: "LED" },
        { year: 20, cost: 3000, component: "LED" },
      ],
    });
    const delta1 = 3000 / Math.pow(1.04, 10);
    const delta2 = 3000 / Math.pow(1.04, 20);
    const expectedGlobalDiff = delta1 + delta2;
    expect(Math.abs((base.globalCost - with2Rep.globalCost) - (-expectedGlobalDiff))).toBeLessThan(2);
  });

  // ─── B/C Ratio EN 15459-1 B.1.3 ───────────────────────────────────────────

  it("B/C ratio cu mentenanță < B/C fără mentenanță", () => {
    const noMaint   = calcFinancialAnalysis({ ...baseParams, annualMaint: 0 });
    const withMaint = calcFinancialAnalysis({ ...baseParams, annualMaint: 500 });
    expect(withMaint.bcRatio).toBeLessThan(noMaint.bcRatio);
  });

  it("B/C ratio cu replacement < B/C fără replacement (numitor mai mare)", () => {
    const noRep   = calcFinancialAnalysis({ ...baseParams, replacementCosts: [] });
    const withRep = calcFinancialAnalysis({
      ...baseParams,
      replacementCosts: [{ year: 15, cost: 5000, component: "boiler" }],
    });
    expect(withRep.bcRatio).toBeLessThan(noRep.bcRatio);
  });

  it("B/C ratio fără mentenanță și fără replacement: numitor = investCost", () => {
    // Verifică că formula de bază e consistentă
    const r = calcFinancialAnalysis({ ...baseParams, annualMaint: 0, replacementCosts: [] });
    // totalBenefits / investCost
    let totalBenefits = 0;
    const rate = 0.04, esc = 0.03;
    for (let b = 1; b <= 30; b++) {
      totalBenefits += (5000 * Math.pow(1 + esc, b - 1)) / Math.pow(1 + rate, b);
    }
    const expectedBC = totalBenefits / 50000;
    expect(r.bcRatio).toBeCloseTo(expectedBC, 1);
  });

  // ─── Valoare reziduală liniară ─────────────────────────────────────────────

  it("valoare reziduală 25% pentru componentă 40 ani în perioadă 30 ani", () => {
    const result = calcFinancialAnalysis({
      ...baseParams,
      componentsForResidual: [{ name: "anvelopă", invest: 60000, lifespan: 40, startYear: 0 }],
    });
    // ageAtEnd = 30 % 40 = 30; remaining = 40-30 = 10; residual = 60000*(10/40) = 15000
    const expectedResidual = 15000 / Math.pow(1.04, 30);
    expect(result.residualTotal).toBeCloseTo(expectedResidual, 0);
  });

  it("valoare reziduală 0% pentru LED 10 ani în perioadă 30 ani (ciclu complet)", () => {
    const result = calcFinancialAnalysis({
      ...baseParams,
      componentsForResidual: [{ name: "LED", invest: 4000, lifespan: 10, startYear: 20 }],
    });
    // ageAtEnd = (30-20) % 10 = 0; remaining = 0 → residual = 0
    expect(result.residualTotal).toBeCloseTo(0, 1);
  });

  it("valoare reziduală pentru ferestre 30 ani în perioadă 30 ani = 0 (tocmai terminate)", () => {
    const result = calcFinancialAnalysis({
      ...baseParams,
      componentsForResidual: [{ name: "ferestre", invest: 18000, lifespan: 30, startYear: 0 }],
    });
    // ageAtEnd = 30 % 30 = 0 → remaining = 0 → residual = 0
    expect(result.residualTotal).toBeCloseTo(0, 1);
  });

  it("componentsForResidual gol → fallback la residualValue clasic", () => {
    const withResidualValue = calcFinancialAnalysis({ ...baseParams, residualValue: 5000 });
    const withEmptyComponents = calcFinancialAnalysis({
      ...baseParams,
      residualValue: 5000,
      componentsForResidual: [],
    });
    // cu [] → fallback la residualValue / disc_factor
    const expected = 5000 / Math.pow(1.04, 30);
    expect(withEmptyComponents.residualTotal).toBeCloseTo(expected, 0);
    expect(withResidualValue.residualTotal).toBeCloseTo(expected, 0);
  });

  it("globalCost scade când componentsForResidual are valoare reziduală pozitivă", () => {
    const noResidual = calcFinancialAnalysis({ ...baseParams });
    const withResidual = calcFinancialAnalysis({
      ...baseParams,
      componentsForResidual: [{ name: "anvelopă", invest: 60000, lifespan: 40, startYear: 0 }],
    });
    expect(withResidual.globalCost).toBeLessThan(noResidual.globalCost);
  });
});
