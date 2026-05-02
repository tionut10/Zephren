import { describe, it, expect } from "vitest";
import {
  fmtNum, fmtPct, fmtArea, fmtVolume, fmtDate, fmtWithUnit,
  UNIT_LABEL,
} from "../format.js";

describe("fmtNum — format localizat", () => {
  it("RO folosește virgulă", () => {
    expect(fmtNum(123.456, 1, "RO")).toBe("123,5");
    expect(fmtNum(0.5, 2, "RO")).toBe("0,50");
  });
  it("EN folosește punct", () => {
    expect(fmtNum(123.456, 1, "EN")).toBe("123.5");
    expect(fmtNum(0.5, 2, "EN")).toBe("0.50");
  });
  it("acceptă string", () => {
    expect(fmtNum("42.7", 1)).toBe("42,7");
  });
  it("returnează — pentru NaN/null/undefined/non-numeric", () => {
    expect(fmtNum(null)).toBe("—");
    expect(fmtNum(undefined)).toBe("—");
    expect(fmtNum("abc")).toBe("—");
    expect(fmtNum(NaN)).toBe("—");
  });
  it("decimals=0 elimină zecimale", () => {
    expect(fmtNum(123.7, 0)).toBe("124");
  });
  it("fără separator mii (consistent cu MDLPA)", () => {
    expect(fmtNum(12345.6, 1, "RO")).toBe("12345,6");
    expect(fmtNum(12345.6, 1, "EN")).toBe("12345.6");
  });
});

describe("fmtPct, fmtArea, fmtVolume — wrappers cu unitate", () => {
  it("fmtPct adaugă %", () => {
    expect(fmtPct(35.5)).toBe("35,5%");
  });
  it("fmtArea adaugă m²", () => {
    expect(fmtArea(120, 1, "RO")).toBe("120,0 m²");
  });
  it("fmtVolume adaugă m³", () => {
    expect(fmtVolume(300, 0)).toBe("300 m³");
  });
});

describe("fmtDate — format per limbă", () => {
  it("RO: dd.mm.yyyy", () => {
    expect(fmtDate("2026-05-02", "RO")).toBe("02.05.2026");
  });
  it("EN: ISO 8601", () => {
    expect(fmtDate("2026-05-02", "EN")).toBe("2026-05-02");
  });
  it("acceptă Date object", () => {
    const d = new Date(2026, 4, 2); // luna e 0-indexed
    expect(fmtDate(d, "RO")).toBe("02.05.2026");
  });
  it("returnează — pentru date invalide", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
    expect(fmtDate("")).toBe("—");
  });
});

describe("fmtWithUnit — format complet", () => {
  it("EP RO format MDLPA", () => {
    expect(fmtWithUnit(125.3, UNIT_LABEL.EP_OFFICIAL, 1, "RO")).toBe("125,3 kWh/m²,an");
  });
  it("EP ISO format tehnic", () => {
    expect(fmtWithUnit(125.3, UNIT_LABEL.EP_ISO, 1, "RO")).toBe("125,3 kWh/(m²·an)");
  });
  it("U-value W/(m²·K)", () => {
    expect(fmtWithUnit(0.3, UNIT_LABEL.U_VALUE, 2, "RO")).toBe("0,30 W/(m²·K)");
  });
});

describe("UNIT_LABEL — convenții oficiale", () => {
  it("EP_OFFICIAL = MDLPA cu virgulă", () => {
    expect(UNIT_LABEL.EP_OFFICIAL).toBe("kWh/m²,an");
  });
  it("EP_ISO = ISO 52000 cu punct mediu", () => {
    expect(UNIT_LABEL.EP_ISO).toBe("kWh/(m²·an)");
  });
  it("CO2_OFFICIAL include kgCO₂", () => {
    expect(UNIT_LABEL.CO2_OFFICIAL).toContain("kgCO₂");
  });
  it("este immutable (frozen)", () => {
    expect(Object.isFrozen(UNIT_LABEL)).toBe(true);
  });
});
