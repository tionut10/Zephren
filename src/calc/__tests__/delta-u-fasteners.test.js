/**
 * delta-u-fasteners.test.js — Sprint 22 #1
 * Corecție ΔU″ pentru fixări mecanice (dibluri / conectori) ce traversează izolația.
 * Referință: ISO 6946:2017 Annex F + Mc 001-2022 Tabel 2.19
 *
 * Formula exactă: ΔU = α · λ_f · A_f · n_f / d_ins
 * - α = factor de corecție (0.6 sau 0.8 după geometrie)
 * - λ_f = conductivitate termică fixare [W/(m·K)]
 * - A_f = secțiune transversală fixare [m²]
 * - n_f = număr fixări pe m²
 * - d_ins = grosime strat izolant [m]
 */
import { describe, it, expect } from "vitest";
import { calcOpaqueR, calcDeltaU, FASTENER_TYPES } from "../opaque.js";

describe("Sprint 22 #1 — ΔU″ fixări mecanice (ISO 6946:2017 Annex F)", () => {
  it("Fără fixări mecanice (lipire integrală) → ΔU″ = 0", () => {
    const r = calcOpaqueR(
      [
        { thickness: 15, lambda: 0.87 },     // tencuială
        { thickness: 250, lambda: 0.46 },    // cărămidă
        { thickness: 100, lambda: 0.036 },   // EPS 100mm
        { thickness: 10, lambda: 0.87 },     // tencuială exterior
      ],
      "PE",
      { type: "none" }
    );
    expect(r.deltaU).toBe(0);
    expect(r.u).toBeCloseTo(r.u_base, 3);
    expect(r.fastenerLabel).toMatch(/Fără fixări/i);
  });

  it("Diblu plastic cu cap (6 buc/m², EPS 100mm) → ΔU″ mic (~0.003)", () => {
    const r = calcOpaqueR(
      [
        { thickness: 15, lambda: 0.87 },
        { thickness: 250, lambda: 0.46 },
        { thickness: 100, lambda: 0.036 },
        { thickness: 10, lambda: 0.87 },
      ],
      "PE",
      { type: "plastic_cap" }
    );
    // α·λ·A·n/d = 0.8·0.30·50.3e-6·6/0.1 = 0.000724
    expect(r.deltaU).toBeGreaterThan(0);
    expect(r.deltaU).toBeLessThan(0.01);
    expect(r.u).toBeGreaterThan(r.u_base);
  });

  it("Diblu cu tijă metalică (6 buc/m², EPS 100mm) → ΔU″ semnificativ (~0.064)", () => {
    const r = calcOpaqueR(
      [
        { thickness: 15, lambda: 0.87 },
        { thickness: 250, lambda: 0.46 },
        { thickness: 100, lambda: 0.036 },
        { thickness: 10, lambda: 0.87 },
      ],
      "PE",
      { type: "metal_pin" }
    );
    // α·λ·A·n/d = 0.8·17.0·78.5e-6·6/0.1 = 0.06405
    expect(r.deltaU).toBeCloseTo(0.064, 2);
    expect(r.deltaU_method).toMatch(/Annex F/i);
  });

  it("Consolă metalică oțel (fațadă ventilată, 3 buc/m²) → ΔU″ mare (~0.136)", () => {
    const r = calcOpaqueR(
      [
        { thickness: 15, lambda: 0.87 },
        { thickness: 250, lambda: 0.46 },
        { thickness: 100, lambda: 0.036 },
      ],
      "PE",
      { type: "steel_bracket" }
    );
    // α·λ·A·n/d = 0.8·50.0·113.1e-6·3/0.1 = 0.1357
    // Cap la 0.15
    expect(r.deltaU).toBeGreaterThan(0.1);
    expect(r.deltaU).toBeLessThanOrEqual(0.15);
  });

  it("Densitate n_f personalizată (10 buc/m²) → ΔU″ crește proporțional", () => {
    // Folosim metal_pin (λ_f=17.0) ca să avem valori > precizia de rotunjire (1e-3)
    const rDefault = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "metal_pin" } // n_f default = 6 → ΔU″ ≈ 0.064
    );
    const rDense = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "metal_pin", n_f: 10 } // ΔU″ ≈ 0.107
    );
    // 10/6 ≈ 1.67x
    expect(rDense.deltaU / rDefault.deltaU).toBeCloseTo(10 / 6, 1);
  });

  it("Diblu cu rupere punte termică reduce ΔU″ cu ~75% față de metal standard", () => {
    const rMetal = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 150, lambda: 0.036 }],
      "PE",
      { type: "metal_pin" }           // λ_f = 17.0
    );
    const rThermal = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 150, lambda: 0.036 }],
      "PE",
      { type: "metal_pin_thermal" }   // λ_f = 4.0
    );
    // Ratio ≈ 4.0/17.0 ≈ 0.235 (reducere 76%)
    expect(rThermal.deltaU / rMetal.deltaU).toBeCloseTo(4.0 / 17.0, 1);
  });

  it("Izolație mai groasă (200mm) → ΔU″ se înjumătățește vs. 100mm", () => {
    const r100 = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "metal_pin" }
    );
    const r200 = calcOpaqueR(
      [{ thickness: 15, lambda: 0.87 }, { thickness: 200, lambda: 0.036 }],
      "PE",
      { type: "metal_pin" }
    );
    // ΔU ∝ 1/d → raport 2x
    expect(r100.deltaU / r200.deltaU).toBeCloseTo(2.0, 1);
  });

  it("Perete fără izolație → ΔU″ = 0 indiferent de tip fixare", () => {
    const r = calcOpaqueR(
      [
        { thickness: 250, lambda: 0.46 },
        { thickness: 15, lambda: 0.87 },
      ],
      "PE",
      { type: "metal_pin" }
    );
    expect(r.deltaU).toBe(0);
    expect(r.deltaU_method).toMatch(/fără izolație/i);
  });

  it("ΔU″ este cap-uit la 0.15 W/(m²·K) (fixare structural neadecvată)", () => {
    // Densitate absurd de mare (20 buc/m²) pe consolă metalică
    const r = calcOpaqueR(
      [{ thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "steel_bracket", n_f: 20 }
    );
    expect(r.deltaU).toBeLessThanOrEqual(0.15);
  });

  it("calcDeltaU fără d_ins → folosește valoare forfetară (ISO 6946 Tabel 7)", () => {
    const res = calcDeltaU("metal_pin"); // fără d_ins, fără n_f
    expect(res.deltaU).toBe(FASTENER_TYPES.metal_pin.deltaU_flat); // 0.04
    expect(res.method).toMatch(/forfetară|Tabel/i);
  });

  it("Ancorare chimică (fără punte termică) → ΔU″ forfetar = 0", () => {
    const r = calcOpaqueR(
      [{ thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "chemical_anchor" }
    );
    // λ_f = 0.50 → ΔU = 0.8·0.50·50.3e-6·4/0.1 = 8.05e-4 (foarte mic)
    expect(r.deltaU).toBeLessThan(0.002);
  });

  it("Backward compat: calcOpaqueR fără fastenerOpts → type='default' (metal standard)", () => {
    const rDefault = calcOpaqueR(
      [{ thickness: 100, lambda: 0.036 }],
      "PE"
    );
    const rExplicit = calcOpaqueR(
      [{ thickness: 100, lambda: 0.036 }],
      "PE",
      { type: "default" }
    );
    expect(rDefault.deltaU).toBe(rExplicit.deltaU);
  });

  it("Impact U: ΔU″ metal pin (100mm EPS) crește U cu ~25-30% la perete izolat bine", () => {
    const r = calcOpaqueR(
      [
        { thickness: 15, lambda: 0.87 },
        { thickness: 250, lambda: 0.46 },
        { thickness: 100, lambda: 0.036 },
        { thickness: 10, lambda: 0.87 },
      ],
      "PE",
      { type: "metal_pin" }
    );
    const pctIncrease = (r.u - r.u_base) / r.u_base * 100;
    expect(pctIncrease).toBeGreaterThan(15);
    expect(pctIncrease).toBeLessThan(40);
  });

  it("FASTENER_TYPES expune toate tipurile așteptate", () => {
    const expected = [
      "none", "plastic_cap", "plastic_recessed",
      "metal_pin", "metal_pin_thermal",
      "steel_bracket", "steel_bracket_thermal",
      "chemical_anchor", "default",
    ];
    expected.forEach(key => {
      expect(FASTENER_TYPES[key]).toBeDefined();
      expect(FASTENER_TYPES[key].label).toBeTruthy();
      expect(typeof FASTENER_TYPES[key].alpha).toBe("number");
    });
  });
});
