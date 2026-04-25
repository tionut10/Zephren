/**
 * Tests Sprint C Task 4 — sandbox-sensitivity calc
 */
import { describe, it, expect } from "vitest";
import {
  SENSITIVITY_FACTORS,
  SANDBOX_PRESETS,
  calcSandboxEP,
  estimateEnergyClass,
} from "../sandbox-sensitivity.js";

describe("SENSITIVITY_FACTORS — structură", () => {
  it("conține toți factorii cheie pentru anvelopă + HVAC + iluminat + RER", () => {
    const required = ["U_perete", "U_geam", "U_acoperis", "U_planseu", "n50",
                      "eta_gen", "hrEta", "W_p", "pv_kWp", "solar_m2"];
    required.forEach(k => {
      expect(SENSITIVITY_FACTORS[k], k).toBeDefined();
      expect(SENSITIVITY_FACTORS[k]).toHaveProperty("default");
      expect(SENSITIVITY_FACTORS[k]).toHaveProperty("min");
      expect(SENSITIVITY_FACTORS[k]).toHaveProperty("max");
      expect(SENSITIVITY_FACTORS[k]).toHaveProperty("sensitivity");
      expect(SENSITIVITY_FACTORS[k]).toHaveProperty("label");
    });
  });

  it("min ≤ default ≤ max pentru toți factorii", () => {
    Object.entries(SENSITIVITY_FACTORS).forEach(([k, f]) => {
      expect(f.min, k + ".min").toBeLessThanOrEqual(f.default);
      expect(f.default, k + ".default").toBeLessThanOrEqual(f.max);
    });
  });
});

describe("calcSandboxEP — comportament de bază", () => {
  it("returnează zero/empty când epBase e 0 sau invalid", () => {
    expect(calcSandboxEP(0, {})).toEqual({ epNew: 0, deltaEP: 0, deltaPercent: 0, breakdown: [] });
    expect(calcSandboxEP(null, {})).toEqual({ epNew: 0, deltaEP: 0, deltaPercent: 0, breakdown: [] });
  });

  it("fără modificări (param-uri default) → ΔEP ≈ 0", () => {
    const r = calcSandboxEP(150, {
      U_perete: 0.40, U_geam: 1.40, n50: 4.0,
    });
    expect(Math.abs(r.deltaEP)).toBeLessThan(0.5);
    expect(r.epNew).toBeCloseTo(150, 0);
  });

  it("îmbunătățire izolație pereți (U 0.40 → 0.20) → ΔEP < 0", () => {
    const r = calcSandboxEP(150, { U_perete: 0.20 });
    expect(r.deltaEP).toBeLessThan(0);
    expect(r.epNew).toBeLessThan(150);
  });

  it("degradare izolație (U 0.40 → 0.80) → ΔEP > 0", () => {
    const r = calcSandboxEP(150, { U_perete: 0.80 });
    expect(r.deltaEP).toBeGreaterThan(0);
    expect(r.epNew).toBeGreaterThan(150);
  });

  it("VMC HR 0 → 0.80 reduce EP", () => {
    const r = calcSandboxEP(150, { hrEta: 0.80 });
    expect(r.deltaEP).toBeLessThan(0);
  });

  it("PV 5 kWp reduce EP (efect direct)", () => {
    const r = calcSandboxEP(150, { pv_kWp: 5.0 });
    expect(r.deltaEP).toBeLessThan(0);
  });

  it("efect cumulativ — toate măsurile combinate produc reducere mai mare", () => {
    const single = calcSandboxEP(200, { U_perete: 0.20 });
    const combined = calcSandboxEP(200, {
      U_perete: 0.20, U_geam: 1.10, n50: 1.5, hrEta: 0.80,
    });
    expect(combined.deltaEP).toBeLessThan(single.deltaEP);
  });

  it("breakdown sortat descrescător după impact absolut", () => {
    const r = calcSandboxEP(200, {
      U_perete: 0.20,    // impact mare
      W_p: 6.0,           // impact mic
      n50: 2.0,           // impact mediu
    });
    expect(r.breakdown.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < r.breakdown.length - 1; i++) {
      expect(Math.abs(r.breakdown[i].contributionEP))
        .toBeGreaterThanOrEqual(Math.abs(r.breakdown[i + 1].contributionEP));
    }
  });

  it("clamp la EP min 5 + max 3× baseline", () => {
    // Forțează variație extremă spre minim
    const rLow = calcSandboxEP(150, {
      U_perete: 0.05, U_geam: 0.50, n50: 0.6, hrEta: 0.95, eta_gen: 1.10, pv_kWp: 30,
    });
    expect(rLow.epNew).toBeGreaterThanOrEqual(5);
    // Forțează variație extremă spre maxim
    const rHigh = calcSandboxEP(150, {
      U_perete: 1.50, U_geam: 3.00, n50: 12.0, eta_gen: 0.50,
    });
    expect(rHigh.epNew).toBeLessThanOrEqual(150 * 3);
  });

  it("ignoră chei necunoscute fără crash", () => {
    expect(() => calcSandboxEP(150, { foo_bar: 999 })).not.toThrow();
    const r = calcSandboxEP(150, { foo_bar: 999 });
    expect(r.epNew).toBeCloseTo(150, 0);
  });
});

describe("SANDBOX_PRESETS — structură", () => {
  it("conține minim 5 preset-uri", () => {
    expect(SANDBOX_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it("primul preset e baseline (params gol)", () => {
    expect(SANDBOX_PRESETS[0].id).toBe("preset_baseline");
    expect(Object.keys(SANDBOX_PRESETS[0].params).length).toBe(0);
  });

  it("preset_full_nzeb produce reducere EP mai mare decât preset_anvelopa_min", () => {
    const baseEP = 200;
    const minimal = calcSandboxEP(baseEP,
      SANDBOX_PRESETS.find(p => p.id === "preset_anvelopa_min").params);
    const fullNzeb = calcSandboxEP(baseEP,
      SANDBOX_PRESETS.find(p => p.id === "preset_full_nzeb").params);
    expect(fullNzeb.deltaEP).toBeLessThan(minimal.deltaEP);
  });

  it("toate preset-urile au id unic + label + icon + description", () => {
    const ids = new Set();
    SANDBOX_PRESETS.forEach(p => {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
    });
  });
});

describe("estimateEnergyClass — clase Mc 001-2022", () => {
  const cases = [
    { ep: 30,  cls: "A+" },
    { ep: 50,  cls: "A+" },
    { ep: 75,  cls: "A" },
    { ep: 120, cls: "B" },
    { ep: 175, cls: "C" },
    { ep: 250, cls: "D" },
    { ep: 350, cls: "E" },
    { ep: 500, cls: "F" },
    { ep: 700, cls: "G" },
  ];
  cases.forEach(({ ep, cls }) => {
    it(`EP ${ep} → ${cls}`, () => {
      expect(estimateEnergyClass(ep).class).toBe(cls);
    });
  });

  it("returnează „—\" pentru EP null/0/negativ", () => {
    expect(estimateEnergyClass(0).class).toBe("—");
    expect(estimateEnergyClass(null).class).toBe("—");
    expect(estimateEnergyClass(-10).class).toBe("—");
  });
});
