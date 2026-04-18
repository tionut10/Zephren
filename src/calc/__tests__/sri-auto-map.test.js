import { describe, it, expect } from "vitest";
import { autoMapSRISelections, computeAutoSRI } from "../sri-auto-map.js";
import { calculateSRI, getDefaultSelections } from "../sri-indicator.js";

describe("autoMapSRISelections", () => {
  it("clădire complet manuală → toate selecțiile la 0", () => {
    const sel = autoMapSRISelections({
      heating: { control: "manual" },
      cooling: { hasCooling: false },
      ventilation: { type: "natural" },
      lighting: { control: "manual" },
      acm: {},
      photovoltaic: {},
      bacsClass: "D",
      building: {},
    });
    expect(sel.H1).toBe(0);
    expect(sel.C1).toBe(0);
    expect(sel.V1).toBe(0);
    expect(sel.L1).toBe(0);
  });

  it("BACS clasa A maximizează M1 (BMS)", () => {
    const sel = autoMapSRISelections({
      heating: { control: "bacs_a" },
      bacsClass: "A",
    });
    expect(sel.M1).toBe(4);
    expect(sel.H1).toBe(4);
  });

  it("PV + baterie → E3 mare", () => {
    const sel = autoMapSRISelections({
      photovoltaic: { enabled: true, battery: true },
    });
    expect(sel.E3).toBeGreaterThanOrEqual(2);
    expect(sel.E2).toBeGreaterThan(0);
  });

  it("EV charging points → EV1 setat", () => {
    const sel = autoMapSRISelections({
      building: { evChargingPoints: 5 },
    });
    expect(sel.EV1).toBe(3);
  });

  it("ventilare cu HR ≥ 80% → V2 nivel maxim", () => {
    const sel = autoMapSRISelections({
      ventilation: { type: "mechanical", hrEfficiency: 85 },
    });
    expect(sel.V2).toBe(3);
  });

  it("ACM cu solar termic + heat pump → W4 maxim", () => {
    const sel = autoMapSRISelections({
      solarThermal: { enabled: true },
      heatPump: { enabled: true },
    });
    expect(sel.W4).toBe(3);
  });
});

describe("computeAutoSRI", () => {
  it("returnează scor + clasă SRI valid", () => {
    const r = computeAutoSRI({
      heating: { control: "termostat" },
      cooling: { hasCooling: true, control: "termostat" },
      ventilation: { type: "mechanical", hrEfficiency: 70 },
      lighting: { control: "presence" },
      acm: { hasRecirculation: true, recircControl: "demand" },
      bacsClass: "C",
    });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "E"]).toContain(r.class);
    expect(r.impact).toHaveProperty("energy_efficiency");
    expect(r.impact).toHaveProperty("flexibility");
    expect(r.impact).toHaveProperty("comfort");
  });

  it("clădire smart (BACS A + PV + EV) > clădire manuală", () => {
    const smart = computeAutoSRI({
      heating: { control: "bacs_a" },
      cooling: { hasCooling: true, control: "bacs_a" },
      ventilation: { type: "mechanical", hrEfficiency: 85, control: "co2" },
      lighting: { control: "smart" },
      photovoltaic: { enabled: true, battery: true },
      heatPump: { enabled: true },
      solarThermal: { enabled: true },
      bacsClass: "A",
      building: { evChargingPoints: 3, energyMonitoring: true },
    });
    const dumb = computeAutoSRI({
      heating: { control: "manual" },
      bacsClass: "D",
    });
    expect(smart.total).toBeGreaterThan(dumb.total);
    expect(smart.total).toBeGreaterThan(50);
  });

  it("rezultatul include selecțiile folosite", () => {
    const r = computeAutoSRI({ heating: { control: "pid" }, bacsClass: "B" });
    expect(r.selections).toBeDefined();
    expect(r.selections.H1).toBe(3);
  });
});

describe("integrare cu calculateSRI", () => {
  it("autoMap + calculateSRI returnează același rezultat ca computeAutoSRI", () => {
    const ctx = {
      heating: { control: "termostat" },
      cooling: { hasCooling: false },
      bacsClass: "C",
    };
    const auto = computeAutoSRI(ctx);
    const sel = autoMapSRISelections(ctx);
    const manual = calculateSRI(sel);
    expect(auto.total).toBe(manual.total);
    expect(auto.class).toBe(manual.class);
  });

  it("default selections produc scor 0", () => {
    const r = calculateSRI(getDefaultSelections());
    expect(r.total).toBe(0);
    expect(r.class).toBe("E");
  });
});
