/**
 * tau-dynamic.test.js — Sprint 22 #3
 * Calcul τ dinamic pentru spații neîncălzite adiacente.
 *
 * Referințe:
 *  - Mc 001-2022 Anexa A.9.3
 *  - SR EN ISO 13789:2017 §8.4
 *
 * Formula: τ = (θ_i − θ_u) / (θ_i − θ_e), clamp [0, 1]
 */
import { describe, it, expect } from "vitest";
import { calcDynamicTau, resolveTau, THETA_U_DEFAULT } from "../tau-dynamic.js";

describe("Sprint 22 #3 — calcDynamicTau (Mc 001-2022 Anexa A.9.3)", () => {
  it("Subsol tipic (θ_i=20, θ_u=10, θ_e=-15) → τ ≈ 0.286", () => {
    // τ = (20-10)/(20-(-15)) = 10/35 = 0.2857
    expect(calcDynamicTau(20, 10, -15)).toBeCloseTo(0.286, 2);
  });

  it("Pod neîncălzit (θ_i=20, θ_u=5, θ_e=-15) → τ ≈ 0.429", () => {
    // τ = (20-5)/35 = 15/35 = 0.4286
    expect(calcDynamicTau(20, 5, -15)).toBeCloseTo(0.429, 2);
  });

  it("Casa scării călduroasă (θ_i=20, θ_u=15, θ_e=-15) → τ ≈ 0.143", () => {
    // τ = (20-15)/35 = 0.1429
    expect(calcDynamicTau(20, 15, -15)).toBeCloseTo(0.143, 2);
  });

  it("Spațiu adiacent la exterior (θ_u = θ_e) → τ = 1", () => {
    expect(calcDynamicTau(20, -15, -15)).toBe(1);
  });

  it("Spațiu adiacent încălzit (θ_u > θ_i) → τ = 0 (clamp)", () => {
    expect(calcDynamicTau(20, 22, -15)).toBe(0);
  });

  it("Spațiu adiacent mai rece ca exteriorul (θ_u < θ_e) → τ = 1 (clamp)", () => {
    // τ = (20-(-20))/(20-(-15)) = 40/35 = 1.143 → clamp 1
    expect(calcDynamicTau(20, -20, -15)).toBe(1);
  });

  it("Valori invalide → 1 (fail-safe conservativ)", () => {
    expect(calcDynamicTau(NaN, 10, -15)).toBe(1);
    expect(calcDynamicTau(20, null, -15)).toBe(1);
    expect(calcDynamicTau(20, 10, undefined)).toBe(1);
    expect(calcDynamicTau(20, 10, 20)).toBe(1); // Δ=0 degenerat
  });

  it("Valori tipice climă caldă (θ_e=-5) → τ este mai mare (mai multe pierderi)", () => {
    const tauCold = calcDynamicTau(20, 10, -20);  // clima rece: τ = 10/40 = 0.25
    const tauMild = calcDynamicTau(20, 10, -5);   // clima blândă: τ = 10/25 = 0.40
    expect(tauMild).toBeGreaterThan(tauCold);
  });
});

describe("Sprint 22 #3 — resolveTau cascadă prioritate", () => {
  const heating = { theta_int: 20, tBasement: 10, tAttic: 5, tStaircase: 15 };
  const theta_e = -15;

  it("(1) Override per element (el.theta_u) are prioritate maximă", () => {
    const el = { type: "PB", theta_u: 8 }; // override 8°C
    const r = resolveTau(el, heating, theta_e, 0.5);
    expect(r.source).toBe("element-override");
    // τ = (20-8)/35 = 0.3429
    expect(r.tau).toBeCloseTo(0.343, 2);
  });

  it("(2) Fallback la heating.tBasement pentru PB/PS", () => {
    const el = { type: "PB" };
    const r = resolveTau(el, heating, theta_e, 0.5);
    expect(r.source).toBe("heating-global");
    expect(r.tau).toBeCloseTo(0.286, 2);
  });

  it("(2) Fallback la heating.tAttic pentru PP", () => {
    const el = { type: "PP" };
    const r = resolveTau(el, heating, theta_e, 0.9);
    expect(r.source).toBe("heating-global");
    expect(r.tau).toBeCloseTo(0.429, 2);
  });

  it("(2) Fallback la heating.tStaircase pentru PR", () => {
    const el = { type: "PR" };
    const r = resolveTau(el, heating, theta_e, 0.5);
    expect(r.source).toBe("heating-global");
    expect(r.tau).toBeCloseTo(0.143, 2);
  });

  it("(3) Fără heating.tBasement → folosește THETA_U_DEFAULT.PB = 10", () => {
    const el = { type: "PB" };
    const minimalHeating = { theta_int: 20 };
    const r = resolveTau(el, minimalHeating, theta_e, 0.5);
    expect(r.source).toBe("mc001-default");
    expect(r.tau).toBeCloseTo(0.286, 2);
  });

  it("(4) Element fără type neîncălzit (PE) → τ static", () => {
    const el = { type: "PE" };
    const r = resolveTau(el, heating, theta_e, 1.0);
    expect(r.source).toBe("static");
    expect(r.tau).toBe(1.0);
  });

  it("Override cu string vid → ignoră (fallback la global)", () => {
    const el = { type: "PB", theta_u: "" };
    const r = resolveTau(el, heating, theta_e, 0.5);
    expect(r.source).not.toBe("element-override");
    expect(r.source).toBe("heating-global");
  });

  it("Override cu valoare non-numerică → ignoră", () => {
    const el = { type: "PB", theta_u: "abc" };
    const r = resolveTau(el, heating, theta_e, 0.5);
    expect(r.source).not.toBe("element-override");
  });

  it("THETA_U_DEFAULT expune toate tipurile neîncălzite standard", () => {
    expect(THETA_U_DEFAULT.PP).toBe(5);
    expect(THETA_U_DEFAULT.PB).toBe(10);
    expect(THETA_U_DEFAULT.PS).toBe(10);
    expect(THETA_U_DEFAULT.PR).toBe(15);
  });

  it("Override cu θ_u = 0°C (pod geros) → τ ≈ 0.571 (pierderi mai mari)", () => {
    const el = { type: "PP", theta_u: 0 };
    const r = resolveTau(el, heating, theta_e, 0.9);
    expect(r.source).toBe("element-override");
    // τ = (20-0)/35 = 0.5714
    expect(r.tau).toBeCloseTo(0.571, 2);
  });
});
