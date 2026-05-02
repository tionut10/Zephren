import { describe, it, expect } from "vitest";
import {
  getBasicPositionFactor,
  getDetailedPositionFactor,
  calcApartmentEP,
  resolvePositionKey,
  BASE_FACTORS,
  ORIENTATION_FACTORS,
  CLIMATE_ZONE_FACTORS,
} from "../anexa7-position-factors.js";

describe("resolvePositionKey", () => {
  it("ground floor + corner → ground_corner", () => {
    expect(resolvePositionKey({ groundFloor: true, corner: true })).toBe("ground_corner");
  });
  it("top floor + interior → top_interior", () => {
    expect(resolvePositionKey({ topFloor: true, corner: false })).toBe("top_interior");
  });
  it("floor='P' (parter) tratat ca ground", () => {
    expect(resolvePositionKey({ floor: "P" })).toBe("ground_interior");
  });
  it("floor=0 numeric tratat ca ground", () => {
    expect(resolvePositionKey({ floor: 0 })).toBe("ground_interior");
  });
  it("default mid_interior pentru apt fără floags", () => {
    expect(resolvePositionKey({ floor: 2 })).toBe("mid_interior");
  });
  it("input null/undefined → mid_interior safe", () => {
    expect(resolvePositionKey(null)).toBe("mid_interior");
  });
});

describe("getBasicPositionFactor — compatibil cu codul vechi", () => {
  it("returnează factor tabular per poziție", () => {
    expect(getBasicPositionFactor({ groundFloor: true })).toBe(1.10);
    expect(getBasicPositionFactor({ groundFloor: true, corner: true })).toBe(1.18);
    expect(getBasicPositionFactor({ topFloor: true, corner: true })).toBe(1.15);
    expect(getBasicPositionFactor({ floor: 2, corner: true })).toBe(1.07);
  });
  it("apt curent interior = 0.95 (audit P1.14 — sub 1.0)", () => {
    expect(getBasicPositionFactor({ floor: 2 })).toBe(0.95);
  });
});

describe("getDetailedPositionFactor — formula deplină", () => {
  it("aplică corecție orientare Sud (factor 0.95)", () => {
    const r = getDetailedPositionFactor(
      { topFloor: true, corner: true },
      { predominantOrientation: "S" }
    );
    // base 1.15 × orientation 0.95 × climate 1.0 = 1.0925
    expect(r.factor).toBeCloseTo(1.0925, 3);
    expect(r.breakdown.orientation).toBe(0.95);
    expect(r.breakdown.base).toBe(1.15);
  });

  it("aplică corecție orientare Nord (factor 1.05)", () => {
    const r = getDetailedPositionFactor(
      { topFloor: true, corner: true },
      { predominantOrientation: "N" }
    );
    // base 1.15 × orientation 1.05 × climate 1.0 = 1.2075
    expect(r.factor).toBeCloseTo(1.2075, 3);
    expect(r.breakdown.orientation).toBe(1.05);
  });

  it("orientare array → media factorilor", () => {
    const r = getDetailedPositionFactor(
      { groundFloor: true, corner: true },
      { predominantOrientation: ["S", "N"] }
    );
    // (0.95 + 1.05) / 2 = 1.0 → fără efect net
    expect(r.breakdown.orientation).toBe(1.0);
  });

  it("mid_interior NU primește corecție orientare (interior complet)", () => {
    const r = getDetailedPositionFactor(
      { floor: 2 },
      { predominantOrientation: "S" }
    );
    // mid_interior nu are pereți exteriori → orientation forțat la 1.0
    expect(r.breakdown.orientation).toBe(1.0);
    expect(r.factor).toBe(0.95);
  });

  it("aplică corecție climatică zona V (1.09)", () => {
    const r = getDetailedPositionFactor(
      { topFloor: true, corner: true },
      { predominantOrientation: "S", climateZone: "V" }
    );
    // 1.15 × 0.95 × 1.09 = 1.190825 → 1.191
    expect(r.factor).toBeCloseTo(1.191, 2);
  });

  it("zonă climatică I (mai caldă) reduce factorul", () => {
    const r = getDetailedPositionFactor(
      { groundFloor: true, corner: true },
      { climateZone: "I" }
    );
    // 1.18 × 1.0 × 0.97 = 1.1446 → 1.145
    expect(r.factor).toBeCloseTo(1.145, 2);
    expect(r.breakdown.climate).toBe(0.97);
  });

  it("fără opts → același rezultat ca getBasicPositionFactor", () => {
    const apts = [
      { groundFloor: true, corner: true },
      { topFloor: true },
      { floor: 1 },
    ];
    apts.forEach((apt) => {
      const detailed = getDetailedPositionFactor(apt);
      const basic = getBasicPositionFactor(apt);
      expect(detailed.factor).toBeCloseTo(basic, 3);
    });
  });
});

describe("calcApartmentEP", () => {
  it("EP_apt = EP_bloc × factor", () => {
    const r = calcApartmentEP(100, { topFloor: true, corner: true });
    // 100 × 1.15 = 115
    expect(r.ep).toBe(115);
    expect(r.factor).toBe(1.15);
  });

  it("EP_apt cu corecție orientare + climă", () => {
    const r = calcApartmentEP(100,
      { topFloor: true, corner: true },
      { predominantOrientation: "S", climateZone: "II" }
    );
    // 100 × 1.15 × 0.95 × 1.0 = 109.25
    expect(r.ep).toBeCloseTo(109.25, 1);
  });

  it("EP_bloc=0 sau invalid → 0", () => {
    expect(calcApartmentEP(0, { floor: 1 }).ep).toBe(0);
    expect(calcApartmentEP("abc", { floor: 1 }).ep).toBe(0);
  });
});

describe("constante normative", () => {
  it("BASE_FACTORS imutabilă (Object.freeze)", () => {
    expect(Object.isFrozen(BASE_FACTORS)).toBe(true);
  });
  it("ORIENTATION_FACTORS S < N (aporturi solare reduc pierderi)", () => {
    expect(ORIENTATION_FACTORS.S).toBeLessThan(ORIENTATION_FACTORS.N);
  });
  it("CLIMATE_ZONE_FACTORS monoton crescător I→V", () => {
    expect(CLIMATE_ZONE_FACTORS.I).toBeLessThan(CLIMATE_ZONE_FACTORS.II);
    expect(CLIMATE_ZONE_FACTORS.II).toBeLessThan(CLIMATE_ZONE_FACTORS.III);
    expect(CLIMATE_ZONE_FACTORS.III).toBeLessThan(CLIMATE_ZONE_FACTORS.IV);
    expect(CLIMATE_ZONE_FACTORS.IV).toBeLessThan(CLIMATE_ZONE_FACTORS.V);
  });
});
