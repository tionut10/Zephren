import { describe, it, expect } from "vitest";
import { calcPMV, calcOperativeTemp, calcMRT } from "../pmv-ppd.js";

describe("PMV/PPD — ISO 7730:2005 / ASHRAE 55-2020", () => {
  it("Condiții confort neutru — PMV ≈ 0, PPD < 10%", () => {
    const r = calcPMV({ ta: 22, tr: 22, va: 0.1, rh: 50, met: 1.2, clo: 1.0 });
    expect(r.pmv).toBeGreaterThan(-0.5);
    expect(r.pmv).toBeLessThan(0.5);
    expect(r.ppd).toBeLessThan(10);
    expect(r.category).toMatch(/^[AB]/);
    expect(r.IEQ_class).toMatch(/^I{1,2}$/);
  });

  it("Mediu cald — PMV > 1, PPD > 25%", () => {
    const r = calcPMV({ ta: 30, tr: 30, va: 0.1, rh: 60, met: 1.2, clo: 0.5 });
    expect(r.pmv).toBeGreaterThan(1);
    expect(r.ppd).toBeGreaterThan(25);
    expect(r.sensation).toMatch(/[Cc]ald/);
  });

  it("Mediu rece — PMV < -1, PPD > 25%", () => {
    const r = calcPMV({ ta: 14, tr: 12, va: 0.2, rh: 50, met: 1.0, clo: 1.0 });
    expect(r.pmv).toBeLessThan(-1);
    expect(r.ppd).toBeGreaterThan(25);
    expect(r.sensation).toMatch(/[Rr]ece|[Rr]ăcoros/);
  });

  it("PPD minim la PMV = 0 (5% conform ISO 7730)", () => {
    // PPD formula: 100 - 95*exp(-0.03353*0 - 0.2179*0) = 100 - 95 = 5%
    const r = calcPMV({ ta: 22, tr: 22, va: 0.1, rh: 50, met: 1.2, clo: 0.9 });
    // PMV poate nu fi exact 0, dar PPD trebuie ≥ 5%
    expect(r.ppd).toBeGreaterThanOrEqual(5);
  });

  it("Validare intrări — aruncă eroare la ta lipsă", () => {
    expect(() => calcPMV({})).toThrow();
  });

  it("Validare intrări — aruncă eroare la ta extremă", () => {
    expect(() => calcPMV({ ta: 100 })).toThrow();
  });

  it("Categorii ISO 7730 corecte", () => {
    // Cat A: |PMV| ≤ 0.2
    const a = calcPMV({ ta: 22, tr: 22, va: 0.1, rh: 50, met: 1.2, clo: 0.95 });
    if (Math.abs(a.pmv) <= 0.2) expect(a.category).toBe("A");
    // Cat D: |PMV| > 0.7
    const d = calcPMV({ ta: 30, tr: 30, va: 0.1, rh: 70, met: 1.5, clo: 0.5 });
    expect(d.category).toMatch(/D/);
  });

  it("Recomandări generate corect pentru mediu cald", () => {
    const r = calcPMV({ ta: 28, tr: 28, va: 0.1, rh: 65, met: 1.2, clo: 0.5 });
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});

describe("Temperatura operativă — ISO 7730", () => {
  it("La va mic → to ponderat între ta și tr", () => {
    const to = calcOperativeTemp(22, 20, 0.001);
    // Formula: (ta * sqrt(10*va) + tr) / (1 + sqrt(10*va))
    // La va=0.001: sqrt(0.01) = 0.1 → (22*0.1 + 20) / 1.1 ≈ 20.18
    expect(to).toBeGreaterThan(19);
    expect(to).toBeLessThan(22);
  });

  it("La viteză mare aer → ponderare către ta", () => {
    const to = calcOperativeTemp(22, 18, 1.0);
    expect(to).toBeGreaterThan(20); // mai aproape de ta
  });
});

describe("MRT — Temperatura radiantă medie", () => {
  it("Suprafețe uniforme → MRT = temperatura suprafețelor", () => {
    const mrt = calcMRT([
      { temp: 20, area: 10 },
      { temp: 20, area: 10 },
    ]);
    expect(mrt).toBeCloseTo(20, 0);
  });

  it("Suprafață rece + caldă → MRT intermediar", () => {
    const mrt = calcMRT([
      { temp: 10, area: 5 },
      { temp: 30, area: 5 },
    ]);
    expect(mrt).toBeGreaterThan(10);
    expect(mrt).toBeLessThan(30);
  });

  it("Array gol → aruncă eroare", () => {
    expect(() => calcMRT([])).toThrow();
  });
});
