import { describe, it, expect } from "vitest";
import { calcSRI, calcBACSEnergyImpact, calcEVChargers, checkSolarReady, checkMajorRenovConformity, SRI_DOMAINS } from "../epbd.js";

describe("EPBD — SRI (Smart Readiness Indicator)", () => {
  it("BACS clasa A + PV + HP → SRI > 60", () => {
    const r = calcSRI({}, {}, {}, { type: "LED_PRO", controlType: "PREZ_DAY" },
      { enabled: true }, { enabled: true }, { enabled: true }, "A");
    expect(r.total).toBeGreaterThan(60);
    expect(r.grade).toMatch(/[AB]/);
  });

  it("BACS clasa D fără regenerabile → SRI < 30", () => {
    const r = calcSRI({}, {}, {}, {}, {}, {}, {}, "D");
    expect(r.total).toBeLessThan(30);
  });

  it("3 domenii SRI definite", () => {
    expect(SRI_DOMAINS).toHaveLength(3);
    const sum = SRI_DOMAINS.reduce((s, d) => s + d.weight, 0);
    expect(sum).toBeCloseTo(1, 1);
  });
});

describe("BACS Energy Impact — EN 15232-1", () => {
  it("Clasa A reduce consumul de încălzire", () => {
    const r = calcBACSEnergyImpact("A", "RI", 10000, 2000, 1000, 500, 3000);
    expect(r.savingHeating_pct).toBeGreaterThan(20);
    expect(r.savingTotal_kwh).toBeGreaterThan(0);
  });

  it("Clasa D crește consumul", () => {
    const r = calcBACSEnergyImpact("D", "RI", 10000, 2000, 1000, 500, 3000);
    expect(r.savingHeating_pct).toBeLessThan(0);
  });
});

describe("EV Chargers — EPBD Art.12", () => {
  it("Clădire nouă rezidențială >3 locuri → obligatoriu", () => {
    const r = calcEVChargers(10, "RI", true, false);
    expect(r.required).toBe(true);
    expect(r.chargers).toBeGreaterThanOrEqual(1);
  });

  it("0 locuri parcare → null", () => {
    expect(calcEVChargers(0, "RI", true, false)).toBeNull();
  });
});

describe("Solar Ready — EPBD Art.11", () => {
  it("Clădire fără PV → scor mic", () => {
    const r = checkSolarReady({}, {});
    expect(r.score).toBeLessThan(4);
  });
});

describe("Conformitate U renovare majoră", () => {
  it("Element cu U mic → conform", () => {
    const r = checkMajorRenovConformity(
      [{ type: "PE", layers: [{ thickness: 300, lambda: 0.46 }, { thickness: 100, lambda: 0.036 }] }],
      [], "RI"
    );
    expect(r.allConform).toBe(true);
  });
});
