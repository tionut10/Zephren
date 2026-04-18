import { describe, it, expect } from "vitest";
import { calcFinancialAnalysis, calcAllPerspectives } from "../financial.js";

describe("3 perspective economice EN 15459-1 + Reg. 2025/2273", () => {
  const baseParams = {
    investCost:      50000,
    annualSaving:     5000,
    annualMaint:       500,
    period:             30,
    annualEnergyKwh: 12000,
  };

  it("perspectiva socială (3%) produce NPV mai mare decât cea financiară (4%) — rată mai mică", () => {
    const fin = calcFinancialAnalysis({ ...baseParams, perspective: "financial" });
    const soc = calcFinancialAnalysis({ ...baseParams, perspective: "social"    });
    expect(fin).not.toBeNull();
    expect(soc).not.toBeNull();
    expect(soc.npv).toBeGreaterThan(fin.npv);
  });

  it("perspectiva macroeconomică exclude TVA (adjustedInvest = invest / 1.19)", () => {
    const macro = calcFinancialAnalysis({ ...baseParams, perspective: "macroeconomic" });
    expect(macro).not.toBeNull();
    expect(macro.adjustedInvest).toBeCloseTo(50000 / 1.19, 0);
    expect(macro.vatExcluded).toBe(true);
  });

  it("perspectiva financiară NU exclude TVA", () => {
    const fin = calcFinancialAnalysis({ ...baseParams, perspective: "financial" });
    expect(fin.vatExcluded).toBe(false);
    expect(fin.adjustedInvest).toBeCloseTo(50000, 0);
  });

  it("calcAllPerspectives returnează toate 3 perspectivele", () => {
    const all = calcAllPerspectives(baseParams);
    expect(all).toHaveProperty("financial");
    expect(all).toHaveProperty("social");
    expect(all).toHaveProperty("macroeconomic");
  });

  it("calcAllPerspectives — câmpul perspective e setat corect per rezultat", () => {
    const all = calcAllPerspectives(baseParams);
    expect(all.financial?.perspective).toBe("financial");
    expect(all.social?.perspective).toBe("social");
    expect(all.macroeconomic?.perspective).toBe("macroeconomic");
  });

  it("calcAllPerspectives — perspectiva macroeconomică are NPV diferit față de financiară", () => {
    const all = calcAllPerspectives(baseParams);
    // Macro are invest/1.19 (mai mic) + rata 4% → NPV diferit față de financial cu invest plin
    expect(all.macroeconomic?.npv).not.toBe(all.financial?.npv);
  });

  it("fără perspectivă — backward compat: folosește rata implicită 5%", () => {
    const r = calcFinancialAnalysis({ ...baseParams });
    const finWith5 = calcFinancialAnalysis({ ...baseParams, discountRate: 5 });
    // Ambele ar trebui să producă NPV identic (rată 5% explicit vs. default 5%)
    expect(r.npv).toBe(finWith5.npv);
  });

  it("rata explicită suprascrie perspectiva default", () => {
    // Dacă se trece explicit discountRate=6% cu perspectiva financial, se folosește 6%
    const finDefault4 = calcFinancialAnalysis({ ...baseParams, perspective: "financial" });
    const finExplicit6 = calcFinancialAnalysis({ ...baseParams, perspective: "financial", discountRate: 6 });
    expect(finExplicit6.npv).toBeLessThan(finDefault4.npv); // rată mai mare → NPV mai mic
  });

  it("perspectiva socială are label corect", () => {
    const soc = calcFinancialAnalysis({ ...baseParams, perspective: "social" });
    expect(soc.perspectiveLabel).toContain("Social");
  });

  it("perspectiva macroeconomică are label corect", () => {
    const macro = calcFinancialAnalysis({ ...baseParams, perspective: "macroeconomic" });
    expect(macro.perspectiveLabel).toContain("TVA");
  });
});
