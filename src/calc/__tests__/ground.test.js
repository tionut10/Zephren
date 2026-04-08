import { describe, it, expect } from "vitest";
import { calcGroundHeatTransfer, calcPsiPerimeter } from "../ground.js";

describe("Transfer termic sol — ISO 13370:2017", () => {
  it("Placă pe sol — U_ground rezonabil", () => {
    const r = calcGroundHeatTransfer(80, 36, 0.35, 0, 1.5);
    expect(r).not.toBeNull();
    expect(r.U_ground).toBeGreaterThan(0.1);
    expect(r.U_ground).toBeLessThan(1.0);
    expect(r.method).toContain("Placă pe sol");
  });

  it("Subsol — U diferit de placă pe sol", () => {
    const placa = calcGroundHeatTransfer(80, 36, 0.35, 0, 1.5);
    const subsol = calcGroundHeatTransfer(80, 36, 0.35, 2.5, 1.5);
    expect(subsol.U_ground).not.toBe(placa.U_ground);
    expect(subsol.method).toContain("Subsol");
  });

  it("Componentă periodică > 0", () => {
    const r = calcGroundHeatTransfer(80, 36, 0.35, 0, 1.5);
    expect(r.H_periodic).toBeGreaterThan(0);
    expect(r.delta_soil).toBeGreaterThan(1); // adâncime penetrare > 1m
  });

  it("psi perimeter — fără izolație = 0.35", () => {
    expect(calcPsiPerimeter(0, 0.035)).toBe(0.35);
  });

  it("psi perimeter — izolație bună scade valoarea", () => {
    // R_ins = 0.10 / 0.035 ≈ 2.86 → psi = 0.18 (conform tabel)
    expect(calcPsiPerimeter(0.10, 0.035)).toBeLessThan(0.25);
    expect(calcPsiPerimeter(0.10, 0.035)).toBeLessThan(calcPsiPerimeter(0, 0.035));
  });
});
