import { describe, it, expect } from "vitest";
import { calcAirInfiltration, calcNaturalLighting } from "../infiltration.js";

describe("Infiltrare aer — ISO 13829 / EN ISO 9972", () => {
  it("n50 = 0.6 → Pasivhaus", () => {
    const r = calcAirInfiltration(0.6, 300, 200);
    expect(r.classification).toBe("Pasivhaus");
  });

  it("n50 = 8 → Slab etanș", () => {
    const r = calcAirInfiltration(8, 300, 200);
    expect(r.classification).toBe("Slab etanș");
  });

  it("Pierderi termice > 0 kW", () => {
    const r = calcAirInfiltration(4, 300, 200);
    expect(r.lossKW).toBeGreaterThan(0);
  });

  it("n50 = 0 → null", () => {
    expect(calcAirInfiltration(0, 300, 200)).toBeNull();
  });
});

describe("Iluminat natural — EN 15193-1", () => {
  it("Ferestre mari → FLZ > 3%", () => {
    const r = calcNaturalLighting([{ area: 20, orientation: "S", g: 0.6 }], 80);
    expect(r.flz).toBeGreaterThan(2);
  });

  it("Fără ferestre → null", () => {
    expect(calcNaturalLighting([], 80)).toBeNull();
  });
});
