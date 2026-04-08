import { describe, it, expect } from "vitest";
import { evaluateBACS, BACS_FUNCTIONS } from "../bacs-en15232.js";

describe("BACS EN 15232-1 — Evaluare detaliată", () => {
  it("15 funcții definite", () => {
    expect(BACS_FUNCTIONS).toHaveLength(15);
  });

  it("Suma ponderilor ≈ 1.0", () => {
    const sum = BACS_FUNCTIONS.reduce((s, f) => s + f.weight, 0);
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it("Toate funcțiile clasa A → clasă globală A", () => {
    const eval_A = {};
    BACS_FUNCTIONS.forEach(f => eval_A[f.id] = "A");
    const r = evaluateBACS(eval_A);
    expect(r.globalClass).toBe("A");
    expect(r.normalizedScore).toBe(100);
    expect(r.estimatedSavings).toBeGreaterThan(30);
  });

  it("Toate funcțiile clasa D → clasă globală D", () => {
    const eval_D = {};
    BACS_FUNCTIONS.forEach(f => eval_D[f.id] = "D");
    const r = evaluateBACS(eval_D);
    expect(r.globalClass).toBe("D");
    expect(r.normalizedScore).toBe(0);
  });

  it("Mix B/C → clasă globală B sau C", () => {
    const eval_mix = {};
    BACS_FUNCTIONS.forEach((f, i) => eval_mix[f.id] = i % 2 === 0 ? "B" : "C");
    const r = evaluateBACS(eval_mix);
    expect(["B", "C"]).toContain(r.globalClass);
  });

  it("Grupare per categorie funcționează", () => {
    const eval_A = {};
    BACS_FUNCTIONS.forEach(f => eval_A[f.id] = "A");
    const r = evaluateBACS(eval_A);
    expect(Object.keys(r.byGroup)).toContain("Încălzire");
    expect(Object.keys(r.byGroup)).toContain("Ventilare");
    expect(Object.keys(r.byGroup)).toContain("Iluminat");
  });

  it("Recomandări generate pentru funcții slabe", () => {
    const eval_weak = {};
    BACS_FUNCTIONS.forEach(f => eval_weak[f.id] = "D");
    const r = evaluateBACS(eval_weak);
    expect(r.weakFunctions.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("null input → null", () => {
    expect(evaluateBACS(null)).toBeNull();
  });

  it("EPBD Art.14 conformitate — clasa A/B = conform", () => {
    const eval_A = {};
    BACS_FUNCTIONS.forEach(f => eval_A[f.id] = "A");
    expect(evaluateBACS(eval_A).epbd14Compliant).toBe(true);

    const eval_D = {};
    BACS_FUNCTIONS.forEach(f => eval_D[f.id] = "D");
    expect(evaluateBACS(eval_D).epbd14Compliant).toBe(false);
  });
});
