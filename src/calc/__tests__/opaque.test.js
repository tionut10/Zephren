import { describe, it, expect } from "vitest";
import { calcOpaqueR } from "../opaque.js";

describe("Calcul R/U element opac — ISO 6946:2017", () => {
  it("Perete BCA 30cm + EPS 10cm → U < 0.30", () => {
    const r = calcOpaqueR([
      { thickness: 50, lambda: 0.70 },
      { thickness: 100, lambda: 0.036 },
      { thickness: 300, lambda: 0.22 },
      { thickness: 15, lambda: 0.87 },
    ], "PE");
    expect(r.u).toBeLessThan(0.30);
    expect(r.deltaU).toBe(0.064); // ISO 6946:2017 Annex F exact: default fastener M10 oțel, 6/m², EPS 100mm
  });

  it("Perete fără izolație → U > 1.0", () => {
    const r = calcOpaqueR([
      { thickness: 250, lambda: 0.46 },
      { thickness: 15, lambda: 0.87 },
    ], "PE");
    expect(r.u).toBeGreaterThan(1.0);
    expect(r.deltaU).toBe(0); // fără izolație → fără corecție
  });

  it("Fără straturi → U implicit", () => {
    const r = calcOpaqueR([], "PE");
    expect(r.u).toBeCloseTo(5.88, 0);
  });

  it("Terasă (PT) are rsi/rse diferite de perete", () => {
    const pe = calcOpaqueR([{ thickness: 200, lambda: 1.74 }], "PE");
    const pt = calcOpaqueR([{ thickness: 200, lambda: 1.74 }], "PT");
    expect(pe.r_total).not.toBe(pt.r_total); // rsi/rse diferite
  });
});
