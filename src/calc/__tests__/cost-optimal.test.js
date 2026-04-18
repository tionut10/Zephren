import { describe, it, expect } from "vitest";
import { paretoFrontier, findOptimum } from "../../components/CostOptimalCurve.jsx";

const COST_OPTIMAL_REF = 50;

describe("CostOptimalCurve — frontieră Pareto", () => {
  const pkgs5 = [
    { id: "a", invest_eur: 10000, ep_final: 300, npv_financial:  5000 },
    { id: "b", invest_eur: 30000, ep_final: 150, npv_financial: 15000 },
    { id: "c", invest_eur: 60000, ep_final:  80, npv_financial: 25000 },
    { id: "d", invest_eur: 40000, ep_final: 200, npv_financial: 12000 },  // dominat de b
    { id: "e", invest_eur:100000, ep_final:  40, npv_financial: 35000 },
  ];

  it("calculează frontiera Pareto pentru 5 pachete (exclude pachetul dominat)", () => {
    const pareto = paretoFrontier(pkgs5);
    const ids = pareto.map(p => p.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
    expect(ids).toContain("e");
    expect(ids).not.toContain("d"); // dominat: invest 40k > b (30k) cu ep 200 > b (150)
    expect(pareto).toHaveLength(4);
  });

  it("frontiera Pareto este sortată ascending după invest_eur", () => {
    const pareto = paretoFrontier(pkgs5);
    for (let i = 1; i < pareto.length; i++) {
      expect(pareto[i].invest_eur).toBeGreaterThanOrEqual(pareto[i - 1].invest_eur);
    }
  });

  it("frontiera Pareto are EP descrescător (fiecare pachet are EP mai mic decât precedentul)", () => {
    const pareto = paretoFrontier(pkgs5);
    for (let i = 1; i < pareto.length; i++) {
      expect(pareto[i].ep_final).toBeLessThan(pareto[i - 1].ep_final);
    }
  });

  it("frontiera pentru 1 pachet returnează acel pachet", () => {
    const pareto = paretoFrontier([pkgs5[0]]);
    expect(pareto).toHaveLength(1);
    expect(pareto[0].id).toBe("a");
  });

  it("frontiera pentru array gol returnează array gol", () => {
    expect(paretoFrontier([])).toHaveLength(0);
  });
});

describe("CostOptimalCurve — punct optim", () => {
  it("găsește pachetul cu EP ≤ 50 și VAN maxim", () => {
    const pkgs = [
      { id: "a", invest_eur: 10000, ep_final: 300, npv_financial:  5000 },
      { id: "b", invest_eur: 40000, ep_final:  45, npv_financial: 20000 },
      { id: "c", invest_eur: 80000, ep_final:  30, npv_financial: 18000 },
    ];
    const opt = findOptimum(pkgs, "financial");
    expect(opt.id).toBe("b");
    expect(opt.ep_final).toBeLessThanOrEqual(COST_OPTIMAL_REF);
  });

  it("fallback la VAN maxim global dacă niciun pachet ≤ 50", () => {
    const pkgs = [
      { id: "a", invest_eur: 10000, ep_final: 300, npv_financial: 5000 },
      { id: "b", invest_eur: 30000, ep_final: 150, npv_financial: 15000 },
    ];
    const opt = findOptimum(pkgs, "financial");
    expect(opt.id).toBe("b");   // VAN maxim
    expect(opt.ep_final).toBeGreaterThan(COST_OPTIMAL_REF);
  });

  it("returnează null pentru array gol", () => {
    expect(findOptimum([], "financial")).toBeNull();
  });

  it("folosește cheia npv_social pentru perspectiva socială", () => {
    const pkgs = [
      { id: "a", invest_eur: 10000, ep_final: 40, npv_financial: 5000, npv_social: 3000 },
      { id: "b", invest_eur: 20000, ep_final: 35, npv_financial: 3000, npv_social: 8000 },
    ];
    const optFin = findOptimum(pkgs, "financial");
    const optSoc = findOptimum(pkgs, "social");
    expect(optFin.id).toBe("a");  // VAN financiar maxim
    expect(optSoc.id).toBe("b");  // VAN social maxim
  });

  it("ignoră pachetele fără câmpul npv corespunzător perspectivei", () => {
    const pkgs = [
      { id: "a", invest_eur: 10000, ep_final: 40, npv_financial: 5000 },
      { id: "b", invest_eur: 20000, ep_final: 35, npv_financial: null }, // invalid
    ];
    const opt = findOptimum(pkgs, "financial");
    expect(opt.id).toBe("a");
  });
});
