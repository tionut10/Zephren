import { describe, it, expect } from "vitest";
import { calcMonthlyISO13790, calcUtilFactor, THERMAL_MASS_CLASS } from "../iso13790.js";
import CLIMATE_DB from "../../data/climate.json";

const bucuresti = CLIMATE_DB.find(c => c.name === "București");

// ═══════════════════════════════════════════════════════════════
// calcUtilFactor — factorul de utilizare a câștigurilor/pierderilor
// ═══════════════════════════════════════════════════════════════

describe("calcUtilFactor", () => {
  it("returnează 1 pentru gamma < 0", () => {
    expect(calcUtilFactor(-0.5, 3)).toBe(1);
  });

  it("returnează a/(a+1) pentru gamma ≈ 1", () => {
    const a = 4;
    const result = calcUtilFactor(1.0, a);
    expect(result).toBeCloseTo(a / (a + 1), 4);
  });

  it("returnează valoare între 0 și 1 pentru gamma > 0 și gamma < 1", () => {
    const result = calcUtilFactor(0.5, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returnează valoare mică pentru gamma >> 1 (câștiguri mari)", () => {
    const result = calcUtilFactor(5, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.5);
  });

  it("formula exactă: (1 - γ^a) / (1 - γ^(a+1))", () => {
    const gamma = 0.6, a = 3;
    const expected = (1 - Math.pow(gamma, a)) / (1 - Math.pow(gamma, a + 1));
    expect(calcUtilFactor(gamma, a)).toBeCloseTo(expected, 10);
  });

  it("converge spre 1 pentru gamma → 0", () => {
    expect(calcUtilFactor(0.001, 3)).toBeCloseTo(1, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// THERMAL_MASS_CLASS — capacitate termică
// ═══════════════════════════════════════════════════════════════

describe("THERMAL_MASS_CLASS", () => {
  it("conține structuri metalice/lemn ca foarte ușoare", () => {
    expect(THERMAL_MASS_CLASS["Structură metalică"]).toBe(80000);
    expect(THERMAL_MASS_CLASS["Structură lemn"]).toBe(80000);
  });

  it("conține zidărie portantă ca masivă", () => {
    expect(THERMAL_MASS_CLASS["Zidărie portantă"]).toBe(260000);
  });

  it("cadre beton armat = medie", () => {
    expect(THERMAL_MASS_CLASS["Cadre beton armat"]).toBe(165000);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcMonthlyISO13790 — calcul lunar complet
// ═══════════════════════════════════════════════════════════════

describe("calcMonthlyISO13790", () => {
  const params = {
    G_env: 150,
    V: 250,
    Au: 100,
    climate: bucuresti,
    theta_int: 20,
    glazingElements: [{ area: 15, g: 0.5, frameRatio: 25, orientation: "S" }],
    shadingFactor: 0.9,
    category: "RI",
    n50: 4,
    structure: "Cadre beton armat",
  };

  it("returnează exact 12 obiecte lunare", () => {
    const r = calcMonthlyISO13790(params);
    expect(r).toHaveLength(12);
    expect(r[0].name).toBe("Ian");
    expect(r[11].name).toBe("Dec");
  });

  it("încălzire mare iarna, mică vara", () => {
    const r = calcMonthlyISO13790(params);
    // Ianuarie (iarnă) vs. Iulie (vară)
    expect(r[0].qH_nd).toBeGreaterThan(r[6].qH_nd);
  });

  it("cererea de răcire este 0 când temp ext < 15°C", () => {
    const r = calcMonthlyISO13790(params);
    // Lunile cu temp ext < 15: Ian(-1.5), Feb(0.5), Mar(5.5), Apr(11.5), Oct(11), Nov(5), Dec(0.5)
    expect(r[0].qC_nd).toBe(0);
    expect(r[1].qC_nd).toBe(0);
    expect(r[2].qC_nd).toBe(0);
    expect(r[3].qC_nd).toBe(0);
    expect(r[9].qC_nd).toBe(0);
    expect(r[10].qC_nd).toBe(0);
    expect(r[11].qC_nd).toBe(0);
  });

  it("Q_loss > 0 pentru toate lunile cu deltaT pozitiv", () => {
    const r = calcMonthlyISO13790(params);
    for (const m of r) {
      if (m.deltaT > 0) {
        expect(m.Q_loss).toBeGreaterThan(0);
      }
    }
  });

  it("Q_gain conține atât Q_int cât și Q_sol", () => {
    const r = calcMonthlyISO13790(params);
    for (const m of r) {
      expect(m.Q_gain).toBe(m.Q_int + m.Q_sol);
    }
  });

  it("deltaT = theta_int - tExt", () => {
    const r = calcMonthlyISO13790(params);
    for (let i = 0; i < 12; i++) {
      expect(r[i].deltaT).toBeCloseTo(20 - bucuresti.temp_month[i], 5);
    }
  });

  it("eta_H este între 0 și 1", () => {
    const r = calcMonthlyISO13790(params);
    for (const m of r) {
      expect(m.eta_H).toBeGreaterThanOrEqual(0);
      expect(m.eta_H).toBeLessThanOrEqual(1);
    }
  });

  it("funcționează fără glazingElements (Q_sol = 0)", () => {
    const noGlaze = { ...params, glazingElements: null };
    const r = calcMonthlyISO13790(noGlaze);
    expect(r).toHaveLength(12);
    for (const m of r) {
      expect(m.Q_sol).toBe(0);
    }
  });

  it("funcționează cu orientare Mixt", () => {
    const mixParams = {
      ...params,
      glazingElements: [{ area: 20, g: 0.5, frameRatio: 25, orientation: "Mixt" }],
    };
    const r = calcMonthlyISO13790(mixParams);
    expect(r).toHaveLength(12);
    // Mixt distribuie pe N/E/S/V, deci Q_sol > 0
    expect(r[5].Q_sol).toBeGreaterThan(0); // Iunie
  });

  it("recuperare căldură (hrEta) reduce pierderile prin ventilare", () => {
    const noHR = calcMonthlyISO13790({ ...params, hrEta: 0 });
    const withHR = calcMonthlyISO13790({ ...params, hrEta: 0.7 });
    // Cu recuperare, pierderi prin ventilare scad → qH_nd scade
    expect(withHR[0].qH_nd).toBeLessThan(noHR[0].qH_nd);
  });

  it("returnează null fără climate", () => {
    expect(calcMonthlyISO13790({ ...params, climate: null })).toBeNull();
  });

  it("returnează null fără Au", () => {
    expect(calcMonthlyISO13790({ ...params, Au: 0 })).toBeNull();
  });
});
