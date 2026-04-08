import { describe, it, expect } from "vitest";
import { calcVMCHR, getSFPClass, recommendVMCType } from "../vmc-hr.js";

describe("VMC cu recuperare căldură — EN 13779 / EN 16798-3", () => {
  it("VMC cu HR 85% — economie termică > 0", () => {
    const r = calcVMCHR({ Au: 100, V: 280, n_vent: 0.5, eta_hr: 0.85, sfp: 0.5, HDD: 2800, theta_int: 20, theta_e_mean: 10 });
    expect(r.Q_recovered_kWh).toBeGreaterThan(0);
    expect(r.E_saved_thermal_kWh).toBeGreaterThan(0);
  });

  it("Fără HR (eta=0) — Q_recovered = 0", () => {
    const r = calcVMCHR({ Au: 100, V: 280, n_vent: 0.5, eta_hr: 0, sfp: 0.3 });
    expect(r.Q_recovered_kWh).toBe(0);
  });

  it("SFP clasificare corectă", () => {
    expect(getSFPClass(400)).toBe("SFP1");
    expect(getSFPClass(700)).toBe("SFP2");
    expect(getSFPClass(1200)).toBe("SFP3");
    expect(getSFPClass(1800)).toBe("SFP4");
  });

  it("Recomandări generate per categorie", () => {
    const recs = recommendVMCType("RI", "III", true);
    expect(recs.length).toBeGreaterThan(0);
  });
});
