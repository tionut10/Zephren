import { describe, it, expect } from "vitest";
import { calcFinancialAnalysis } from "../financial.js";

// ═══════════════════════════════════════════════════════════════
// calcFinancialAnalysis — analiză financiară reabilitare EN 15459
// ═══════════════════════════════════════════════════════════════

describe("calcFinancialAnalysis", () => {
  const baseParams = {
    investCost: 30000,    // EUR
    annualSaving: 2000,   // EUR/an
    annualMaint: 200,     // EUR/an
    discountRate: 5,      // %
    escalation: 3,        // %
    period: 30,           // ani
    residualValue: 5000,  // EUR
  };

  it("returnează rezultat valid pentru parametri corecți", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r).not.toBeNull();
    expect(typeof r.npv).toBe("number");
    expect(typeof r.irr).toBe("number");
    expect(typeof r.paybackSimple).toBe("number");
    expect(typeof r.bcRatio).toBe("number");
    expect(typeof r.globalCost).toBe("number");
  });

  it("returnează null pentru investiție 0 sau negativă", () => {
    expect(calcFinancialAnalysis({ ...baseParams, investCost: 0 })).toBeNull();
    expect(calcFinancialAnalysis({ ...baseParams, investCost: -1000 })).toBeNull();
  });

  it("returnează null pentru economie 0", () => {
    expect(calcFinancialAnalysis({ ...baseParams, annualSaving: 0 })).toBeNull();
  });

  it("NPV este pozitiv pentru investiție profitabilă", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.npv).toBeGreaterThan(0);
    expect(r.verdict).toBe("PROFITABIL");
  });

  it("NPV este negativ pentru investiție neprofitabilă", () => {
    const unprofitable = {
      investCost: 100000,
      annualSaving: 500,
      annualMaint: 300,
      discountRate: 8,
      escalation: 1,
      period: 10,
      residualValue: 0,
    };
    const r = calcFinancialAnalysis(unprofitable);
    expect(r.npv).toBeLessThan(0);
    expect(r.verdict).toBe("NEPROFITABIL");
  });

  it("payback simplu este calculat corect", () => {
    const simple = {
      investCost: 10000,
      annualSaving: 2000,
      annualMaint: 0,
      discountRate: 0,
      escalation: 0,
      period: 30,
      residualValue: 0,
    };
    const r = calcFinancialAnalysis(simple);
    // 10000 / 2000 = 5 ani exact
    expect(r.paybackSimple).toBeCloseTo(5, 0);
  });

  it("payback cu escaladare este mai scurt decât fără", () => {
    const noEsc = calcFinancialAnalysis({ ...baseParams, escalation: 0 });
    const withEsc = calcFinancialAnalysis({ ...baseParams, escalation: 5 });
    // Escaladarea prețului energiei face economia să crească → payback mai scurt
    if (noEsc.paybackSimple && withEsc.paybackSimple) {
      expect(withEsc.paybackSimple).toBeLessThan(noEsc.paybackSimple);
    }
  });

  it("cashFlows are lungimea period + 1 (anul 0 = investiție)", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.cashFlows).toHaveLength(baseParams.period + 1);
    expect(r.cashFlows[0]).toBe(-baseParams.investCost);
  });

  it("IRR este pozitiv pentru investiție profitabilă", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.irr).toBeGreaterThan(0);
  });

  it("B/C ratio > 1 pentru investiție profitabilă", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.bcRatio).toBeGreaterThan(1);
  });

  it("B/C ratio < 1 pentru investiție neprofitabilă", () => {
    const unprofitable = {
      investCost: 100000,
      annualSaving: 500,
      annualMaint: 0,
      discountRate: 10,
      escalation: 0,
      period: 10,
      residualValue: 0,
    };
    const r = calcFinancialAnalysis(unprofitable);
    expect(r.bcRatio).toBeLessThan(1);
  });

  it("valoarea reziduală crește NPV-ul", () => {
    const noResidual = calcFinancialAnalysis({ ...baseParams, residualValue: 0 });
    const withResidual = calcFinancialAnalysis({ ...baseParams, residualValue: 10000 });
    expect(withResidual.npv).toBeGreaterThan(noResidual.npv);
  });

  it("mentenanța reduce NPV-ul", () => {
    const noMaint = calcFinancialAnalysis({ ...baseParams, annualMaint: 0 });
    const withMaint = calcFinancialAnalysis({ ...baseParams, annualMaint: 500 });
    expect(withMaint.npv).toBeLessThan(noMaint.npv);
  });

  it("cumulativeCF pornește negativ și crește", () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.cumulativeCF[0]).toBe(-baseParams.investCost);
    // La final ar trebui să fie pozitiv (investiție profitabilă)
    expect(r.cumulativeCF[r.cumulativeCF.length - 1]).toBeGreaterThan(0);
  });

  it("folosește valori implicite pentru parametrii opționali", () => {
    const minimal = { investCost: 10000, annualSaving: 1000 };
    const r = calcFinancialAnalysis(minimal);
    expect(r).not.toBeNull();
    // discountRate default = 5, escalation default = 3, period default = 30
    expect(r.cashFlows).toHaveLength(31); // 30 + 1
  });
});
