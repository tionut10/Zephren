import { describe, it, expect } from "vitest";
import { calcSummerComfort } from "../summer-comfort.js";

const climate = { temp_month: [-3,-1,5,12,18,22,24,24,19,12,5,-1], zone:"II", solar:{S:390,E:200,V:200} };
const layers = [
  { thickness: 50, lambda: 0.70, rho: 1600 },
  { thickness: 100, lambda: 0.036, rho: 25 },
  { thickness: 250, lambda: 0.46, rho: 1200 },
  { thickness: 15, lambda: 0.87, rho: 1800 },
];

describe("Confort vară — C107/7-2002", () => {
  it("Perete izolat — factor amortizare 0-1", () => {
    const r = calcSummerComfort(layers, climate, "S");
    expect(r).not.toBeNull();
    // D mare → dampingFactor = e^(-D/2) poate fi foarte mic (→ 0 rotunjit)
    expect(r.dampingFactor).toBeGreaterThanOrEqual(0);
    expect(r.dampingFactor).toBeLessThanOrEqual(1);
  });

  it("Defazaj termic > 0 ore", () => {
    const r = calcSummerComfort(layers, climate, "S");
    expect(r.phaseShift).toBeGreaterThan(0);
  });

  it("Temperatura operativă calculată", () => {
    const r = calcSummerComfort(layers, climate, "S");
    expect(r.T_operative).toBeGreaterThan(20);
    expect(r.T_operative).toBeLessThan(40);
  });

  it("Fără straturi → null", () => {
    expect(calcSummerComfort([], climate, "S")).toBeNull();
  });
});
