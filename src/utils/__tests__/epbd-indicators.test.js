/**
 * epbd-indicators.test.js — Teste indicatori EPBD 2024.
 *
 * Sprint 15 — 18 apr 2026
 */
import { describe, it, expect } from "vitest";
import {
  computeEVRequirements,
  checkEVCompliance,
  evaluateIAQ,
  shiftClass2023To2030,
  getDisplayClass,
  SCALE_VERSIONS,
  CO2_PPM_LIMITS,
  PM25_LIMITS,
} from "../epbd-indicators.js";

describe("computeEVRequirements", () => {
  it("rezidențial ≥3 locuri → precablare 50%", () => {
    const req = computeEVRequirements({ category: "RC", parkingSpaces: 10, yearBuilt: 2020 });
    expect(req.applies).toBe(true);
    expect(req.preparedMin).toBe(5);
    expect(req.installedMin).toBe(0);
  });

  it("rezidențial <3 locuri → exceptat", () => {
    const req = computeEVRequirements({ category: "RI", parkingSpaces: 2, yearBuilt: 2020 });
    expect(req.applies).toBe(false);
  });

  it("non-rezidențial nou >20 → 1 pct./10 + precablare 50%", () => {
    const req = computeEVRequirements({ category: "BI", parkingSpaces: 40, yearBuilt: 2025 });
    expect(req.applies).toBe(true);
    expect(req.installedMin).toBe(4);
    expect(req.preparedMin).toBe(20);
  });

  it("non-rezidențial existent >20 → 1 pct./20", () => {
    const req = computeEVRequirements({ category: "BI", parkingSpaces: 40, yearBuilt: 2000 });
    expect(req.applies).toBe(true);
    expect(req.installedMin).toBe(2);
  });

  it("non-rezidențial <5 → exceptat", () => {
    const req = computeEVRequirements({ category: "BI", parkingSpaces: 3, yearBuilt: 2025 });
    expect(req.applies).toBe(false);
  });

  it("fără parcare → exceptat", () => {
    const req = computeEVRequirements({ category: "BI", parkingSpaces: 0 });
    expect(req.applies).toBe(false);
  });
});

describe("checkEVCompliance", () => {
  it("conform când instalat ≥ min + precablat ≥ min", () => {
    const req = { applies: true, installedMin: 2, preparedMin: 10 };
    const res = checkEVCompliance({ installed: 3, prepared: 12, requirements: req });
    expect(res.ok).toBe(true);
    expect(res.gap).toBe(null);
  });

  it("gap calculat când sub minim", () => {
    const req = { applies: true, installedMin: 4, preparedMin: 20 };
    const res = checkEVCompliance({ installed: 1, prepared: 10, requirements: req });
    expect(res.ok).toBe(false);
    expect(res.gap.installed).toBe(3);
    expect(res.gap.prepared).toBe(10);
  });

  it("conform când nu se aplică cerința", () => {
    const res = checkEVCompliance({ installed: 0, prepared: 0, requirements: { applies: false } });
    expect(res.ok).toBe(true);
  });
});

describe("evaluateIAQ", () => {
  it("CO₂ <= 950 → Cat I", () => {
    const res = evaluateIAQ({ co2_max_ppm: 800 });
    expect(res.co2.category).toBe("I");
    expect(res.co2.color).toBe("emerald");
  });

  it("CO₂ 1100 → Cat II", () => {
    const res = evaluateIAQ({ co2_max_ppm: 1100 });
    expect(res.co2.category).toBe("II");
  });

  it("CO₂ 1600 → Cat III", () => {
    const res = evaluateIAQ({ co2_max_ppm: 1600 });
    expect(res.co2.category).toBe("III");
  });

  it("CO₂ >1750 → Cat IV (insuficient)", () => {
    const res = evaluateIAQ({ co2_max_ppm: 2000 });
    expect(res.co2.category).toBe("IV");
    expect(res.co2.color).toBe("red");
  });

  it("PM2.5 ≤ 5 → OMS 2021 conform", () => {
    const res = evaluateIAQ({ pm25_avg: 3 });
    expect(res.pm25.level).toBe("who_2021");
  });

  it("PM2.5 7.5 → conform UE 2030", () => {
    const res = evaluateIAQ({ pm25_avg: 7.5 });
    expect(res.pm25.level).toBe("eu_2030");
  });

  it("PM2.5 30 → depășește toate limitele UE", () => {
    const res = evaluateIAQ({ pm25_avg: 30 });
    expect(res.pm25.level).toBe("exceeded");
  });

  it("lipsă date → null", () => {
    const res = evaluateIAQ({});
    expect(res.co2).toBe(null);
    expect(res.pm25).toBe(null);
  });
});

describe("shiftClass2023To2030", () => {
  it("clădire ZEB → A indiferent de clasa sursă", () => {
    expect(shiftClass2023To2030("A+", true)).toBe("A");
    expect(shiftClass2023To2030("A", true)).toBe("A");
    expect(shiftClass2023To2030("B", true)).toBe("A");
  });

  it("clasele existente shift +1", () => {
    expect(shiftClass2023To2030("A+")).toBe("A");
    expect(shiftClass2023To2030("A")).toBe("B");
    expect(shiftClass2023To2030("B")).toBe("C");
    expect(shiftClass2023To2030("C")).toBe("D");
    expect(shiftClass2023To2030("D")).toBe("E");
    expect(shiftClass2023To2030("E")).toBe("F");
    expect(shiftClass2023To2030("F")).toBe("G");
  });

  it("G rămâne G (fără clasă H)", () => {
    expect(shiftClass2023To2030("G")).toBe("G");
  });
});

describe("getDisplayClass", () => {
  it("scala 2023 → clasa originală", () => {
    expect(getDisplayClass({ energyClass: "B", scaleVersion: "2023" })).toBe("B");
  });

  it("scala 2030_zeb + non-ZEB → shifted", () => {
    expect(getDisplayClass({ energyClass: "B", scaleVersion: "2030_zeb", isZEB: false })).toBe("C");
  });

  it("scala 2030_zeb + ZEB → A", () => {
    expect(getDisplayClass({ energyClass: "A", scaleVersion: "2030_zeb", isZEB: true })).toBe("A");
  });
});

describe("SCALE_VERSIONS", () => {
  it("conține versiunile 2023 și 2030_zeb", () => {
    expect(SCALE_VERSIONS["2023"]).toBeDefined();
    expect(SCALE_VERSIONS["2030_zeb"]).toBeDefined();
    expect(SCALE_VERSIONS["2030_zeb"].zebClass).toBe("A");
    expect(SCALE_VERSIONS["2023"].zebClass).toBe(null);
  });
});

describe("Constante IAQ", () => {
  it("CO2 limite crescător pe categorii I→IV", () => {
    expect(CO2_PPM_LIMITS.I).toBeLessThan(CO2_PPM_LIMITS.II);
    expect(CO2_PPM_LIMITS.II).toBeLessThan(CO2_PPM_LIMITS.III);
    expect(CO2_PPM_LIMITS.III).toBeLessThan(CO2_PPM_LIMITS.IV);
  });

  it("PM2.5 OMS 2021 < UE 2030 < UE actual", () => {
    expect(PM25_LIMITS.who_2021).toBeLessThan(PM25_LIMITS.eu_2030);
    expect(PM25_LIMITS.eu_2030).toBeLessThan(PM25_LIMITS.eu_current);
  });
});
