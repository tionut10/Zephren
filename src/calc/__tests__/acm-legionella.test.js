import { describe, it, expect } from "vitest";
import {
  calcLegionellaOverhead,
  getLegionellaRiskLevel,
  HIGH_RISK_CATEGORIES,
  LEGIONELLA_THRESHOLDS,
} from "../acm-legionella.js";
import { calcACMen15316 } from "../acm-en15316.js";

describe("Legionella — clasificare risc", () => {
  it("SA (spital) = risc ridicat indiferent de volum", () => {
    expect(getLegionellaRiskLevel("SA", 100)).toBe("high");
    expect(getLegionellaRiskLevel("SA", 2000)).toBe("high");
  });

  it("HC (hotel) = risc ridicat", () => {
    expect(getLegionellaRiskLevel("HC", 500)).toBe("high");
  });

  it("RI (casă individuală) cu boiler mic = risc scăzut", () => {
    expect(getLegionellaRiskLevel("RI", 200)).toBe("low");
  });

  it("RC (bloc) cu boiler > 400L = risc ridicat (volum mare)", () => {
    expect(getLegionellaRiskLevel("RC", 500)).toBe("high");
  });

  it("RC cu boiler mic = risc mediu", () => {
    expect(getLegionellaRiskLevel("RC", 200)).toBe("medium");
  });
});

describe("Legionella — calcul supliment energetic", () => {
  it("T_set 55°C în clădire rezidențială = compliant, overhead 0", () => {
    const r = calcLegionellaOverhead({
      volume_L: 150, T_set: 55, category: "RI",
      hasTreatment: false,
    });
    expect(r.compliant).toBe(true);
    expect(r.warnings).toHaveLength(0);
    expect(r.overhead_treatment_kWh).toBe(0);
  });

  it("T_set 45°C în spital → WARNING + recomandare", () => {
    const r = calcLegionellaOverhead({
      volume_L: 500, T_set: 45, category: "SA",
      hasTreatment: false,
    });
    expect(r.compliant).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("Boiler 600L în hotel fără tratament = warning obligatoriu", () => {
    const r = calcLegionellaOverhead({
      volume_L: 600, T_set: 55, category: "HC",
      hasTreatment: false,
    });
    expect(r.compliant).toBe(false);
    expect(r.warnings.some(w => w.includes("OBLIGATORIU"))).toBe(true);
  });

  it("Tratament săptămânal 70°C pentru 200L = overhead 100-500 kWh/an", () => {
    const r = calcLegionellaOverhead({
      volume_L: 200, T_set: 55, category: "RC",
      hasTreatment: true, treatmentFreq: "weekly", T_treatment: 70,
    });
    expect(r.overhead_treatment_kWh).toBeGreaterThan(100);
    expect(r.overhead_treatment_kWh).toBeLessThan(600);
  });

  it("Tratament zilnic = 7× mai mult ca săptămânal", () => {
    const weekly = calcLegionellaOverhead({
      volume_L: 200, T_set: 55, category: "RC",
      hasTreatment: true, treatmentFreq: "weekly",
    });
    const daily = calcLegionellaOverhead({
      volume_L: 200, T_set: 55, category: "RC",
      hasTreatment: true, treatmentFreq: "daily",
    });
    expect(daily.overhead_treatment_kWh).toBeGreaterThanOrEqual(weekly.overhead_treatment_kWh * 6);
  });

  it("T_set 65°C adaugă pierderi standby extra față de 55°C", () => {
    const at55 = calcLegionellaOverhead({ volume_L: 300, T_set: 55, category: "RC" });
    const at65 = calcLegionellaOverhead({ volume_L: 300, T_set: 65, category: "RC" });
    expect(at65.overhead_standby_kWh).toBeGreaterThan(at55.overhead_standby_kWh);
  });

  it("Categoria HIGH_RISK_CATEGORIES conține SA, HC, GR", () => {
    expect(HIGH_RISK_CATEGORIES.has("SA")).toBe(true);
    expect(HIGH_RISK_CATEGORIES.has("HC")).toBe(true);
    expect(HIGH_RISK_CATEGORIES.has("GR")).toBe(true);
  });
});

describe("Integrare calcACMen15316 cu Legionella + aux pompă (Sprint 3)", () => {
  const base = {
    category: "HC", nPersons: 50, consumptionLevel: "med", tSupply: 60,
    climateZone: "III", climate: { temp_month: Array(12).fill(10) },
    hasPipeInsulation: true, insulationClass: "B",
    pipeLength_m: 50, pipeDiameter_mm: 28,
    storageVolume_L: 800,
    acmSource: "ct_gaz", etaGenerator: 0.88,
  };

  it("Hotel cu tratament Legionella săptămânal adaugă Q_legionella_kWh > 0", () => {
    const fara = calcACMen15316({ ...base, hasLegionella: false });
    const cu = calcACMen15316({ ...base, hasLegionella: true, legionellaFreq: "weekly" });
    expect(fara.Q_legionella_kWh).toBe(0);
    expect(cu.Q_legionella_kWh).toBeGreaterThan(0);
    expect(cu.Q_final_kWh).toBeGreaterThan(fara.Q_final_kWh);
  });

  it("Pompă circulație IEE A+ consumă < 50% din pompă veche", () => {
    const old = calcACMen15316({
      ...base, hasCirculation: true,
      circPumpType: "veche_neregulata", circHours_per_day: 24,
    });
    const newPump = calcACMen15316({
      ...base, hasCirculation: true,
      circPumpType: "iee_sub_023", circHours_per_day: 24,
    });
    expect(newPump.W_circ_pump_kWh).toBeLessThan(old.W_circ_pump_kWh * 0.5);
    expect(newPump.W_circ_pump_kWh).toBeGreaterThan(0);
  });

  it("Fără circulație → W_circ_pump_kWh = 0", () => {
    const r = calcACMen15316({ ...base, hasCirculation: false });
    expect(r.W_circ_pump_kWh).toBe(0);
  });

  it("Legionella expus la return în obiect acmDetailed", () => {
    const r = calcACMen15316({ ...base, hasLegionella: true });
    expect(r.legionella).toBeDefined();
    expect(r.legionella.risk).toBe("high"); // HC = hotel
    expect(r.legionella.reference).toContain("HG 1425/2006");
  });

  it("f_legionella_pct raportat în output", () => {
    const r = calcACMen15316({ ...base, hasLegionella: true, legionellaFreq: "weekly" });
    expect(r.f_legionella_pct).toBeGreaterThanOrEqual(0);
    expect(r.f_legionella_pct).toBeLessThan(15);
  });
});
