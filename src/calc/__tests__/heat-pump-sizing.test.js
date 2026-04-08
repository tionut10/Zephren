import { describe, it, expect } from "vitest";
import { calcSCOP, calcHeatPumpSizing, calcBoreholeSizing, HP_TYPES, GROUND_TYPES } from "../heat-pump-sizing.js";

const climate = { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1] };

describe("SCOP sezonier — EN 14825:2022", () => {
  it("Aer-apă standard — SCOP între 2.0 și 4.5", () => {
    const r = calcSCOP("AA_STD", climate, 10000, 15000);
    expect(r).not.toBeNull();
    expect(r.scop).toBeGreaterThan(2.0);
    expect(r.scop).toBeLessThan(4.5);
  });

  it("Sol-apă — SCOP mai mare decât aer-apă", () => {
    const ga = calcSCOP("GA", climate, 10000, 15000);
    const aa = calcSCOP("AA_STD", climate, 10000, 15000);
    expect(ga.scop).toBeGreaterThan(aa.scop);
  });

  it("Low-temp aer-apă — SCOP cel mai mare din seria AA", () => {
    const lt = calcSCOP("AA_LT", climate, 10000, 15000);
    const std = calcSCOP("AA_STD", climate, 10000, 15000);
    expect(lt.scop).toBeGreaterThan(std.scop);
  });

  it("Fără climate → null", () => {
    expect(calcSCOP("AA_STD", null, 10000, 15000)).toBeNull();
  });
});

describe("Dimensionare pompă de căldură", () => {
  it("Putere nominală ≥ sarcina / 1000 * 1.10", () => {
    const r = calcHeatPumpSizing({
      phi_H_design: 12000, climate, hpTypeId: "AA_STD",
      emissionSystem: "RAD_OT", Au: 150,
    });
    expect(r).not.toBeNull();
    expect(r.phi_nom_kW).toBeGreaterThanOrEqual(14); // 12000/1000 * 1.1 ≈ 13.2, ceil = 14
  });

  it("Pardoseală → agent temp ≤ 35°C", () => {
    const r = calcHeatPumpSizing({
      phi_H_design: 8000, climate, hpTypeId: "AA_LT",
      emissionSystem: "PARD", Au: 100,
    });
    expect(r.agentTemp).toBe(35);
    expect(r.compatible_floor_heating).toBe(true);
  });
});

describe("Dimensionare sonde geotermale — VDI 4640", () => {
  it("Argilă umedă — lungime sondă rezonabilă", () => {
    const r = calcBoreholeSizing({
      phi_H_design_kW: 10, phi_H_annual_kwh: 15000,
      scop: 4.0, groundTypeId: "argila_umeda",
      operatingHours: 2400,
    });
    expect(r).not.toBeNull();
    expect(r.totalBoreholeLength_m).toBeGreaterThan(30);
    expect(r.totalBoreholeLength_m).toBeLessThan(1000);
    expect(r.nBoreholes).toBeGreaterThanOrEqual(1);
  });

  it("6 tipuri de sol definite", () => {
    expect(GROUND_TYPES.length).toBeGreaterThanOrEqual(6);
  });
});
