import { describe, it, expect } from "vitest";
import { calcGWPDetailed, GWP_FACTORS, GWP_GLAZING } from "../gwp.js";

// ═══════════════════════════════════════════════════════════════
// Teste unitare — GWP Lifecycle (EN 15978:2011)
// ═══════════════════════════════════════════════════════════════

const perete = {
  type: "PE",
  area: 50,
  layers: [
    { material: "Cărămidă cu goluri (GVP)", thickness: 250, lambda: 0.45, rho: 800 },
    { material: "Polistiren expandat EPS 80", thickness: 100, lambda: 0.038, rho: 20 },
    { material: "Tencuială var-ciment", thickness: 20, lambda: 0.87, rho: 1800 },
  ],
};

const fereastra = { type: "Dublu vitraj Low-E", area: 4, u: 1.1, g: 0.6 };

describe("GWP_FACTORS — date din JSON", () => {
  it("conține materiale de bază", () => {
    expect(GWP_FACTORS["Cărămidă cu goluri (GVP)"]).toBe(0.20);
    expect(GWP_FACTORS["Polistiren expandat EPS 80"]).toBe(3.30);
    expect(GWP_FACTORS["Beton armat"]).toBe(0.13);
  });

  it("materialele lemnoase au GWP negativ (sechestrare CO2)", () => {
    expect(GWP_FACTORS["CLT (Cross Laminated Timber)"]).toBeLessThan(0);
    expect(GWP_FACTORS["Lemn moale (brad/molid)"]).toBeLessThan(0);
  });

  it("materialele cu impact mare (aerogel, VIP) au GWP > 5", () => {
    expect(GWP_FACTORS["Aerogel"]).toBeGreaterThan(5);
    expect(GWP_FACTORS["Vacuum Insulation Panel (VIP)"]).toBeGreaterThan(5);
  });
});

describe("GWP_GLAZING — date din JSON", () => {
  it("conține tipuri de vitraj standard", () => {
    expect(GWP_GLAZING["Dublu vitraj Low-E"]).toBeDefined();
    expect(GWP_GLAZING["Triplu vitraj"]).toBeDefined();
    expect(GWP_GLAZING["default"]).toBeDefined();
  });

  it("GWP triplu vitraj > dublu vitraj (mai mult material)", () => {
    expect(GWP_GLAZING["Triplu vitraj"].gwp).toBeGreaterThan(GWP_GLAZING["Dublu vitraj (4-12-4)"].gwp);
  });

  it("fiecare intrare are proprietățile gwp și label", () => {
    Object.values(GWP_GLAZING).forEach(entry => {
      expect(typeof entry.gwp).toBe("number");
      expect(typeof entry.label).toBe("string");
    });
  });
});

describe("calcGWPDetailed — validare returnare null", () => {
  it("returnează null pentru arie utilă 0", () => {
    expect(calcGWPDetailed([perete], [], 0, 50)).toBeNull();
  });

  it("returnează null pentru elemente opace goale", () => {
    expect(calcGWPDetailed([], [fereastra], 100, 50)).toBeNull();
  });

  it("returnează null pentru undefined", () => {
    expect(calcGWPDetailed(undefined, undefined, 100, 50)).toBeNull();
  });
});

describe("calcGWPDetailed — calcul perete simplu", () => {
  const result = calcGWPDetailed([perete], [], 100, 50);

  it("returnează obiect valid", () => {
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  it("totalGWP > 0 pentru materiale cu emisii pozitive", () => {
    expect(result.totalGWP).toBeGreaterThan(0);
  });

  it("gwpPerM2 = totalGWP / areaUseful", () => {
    expect(result.gwpPerM2).toBeCloseTo(result.totalGWP / 100, 0);
  });

  it("gwpPerM2Year = gwpPerM2 / lifetime", () => {
    expect(result.gwpPerM2Year).toBeCloseTo(result.gwpPerM2 / 50, 1);
  });

  it("modulele A+B+C-D = total (cu toleranță rotunjire)", () => {
    const reconstructed = result.gwp_A1A3 + result.gwp_A4 + result.gwp_A5
      + result.gwp_B2B3 + result.gwp_B4 + result.gwp_C - result.gwp_D;
    expect(Math.abs(reconstructed - result.totalGWP)).toBeLessThan(10);
  });

  it("clasificare este non-goală", () => {
    expect(result.classification).toBeTruthy();
    expect(typeof result.classification).toBe("string");
  });

  it("lifetime din parametru (50 ani)", () => {
    expect(result.lifetime).toBe(50);
  });

  it("benchmarkNZEB = 15 kgCO2eq/(m²·an)", () => {
    expect(result.benchmarkNZEB).toBe(15);
  });
});

describe("calcGWPDetailed — cu ferestre", () => {
  const result = calcGWPDetailed([perete], [fereastra], 100, 50);

  it("returnează obiect valid cu ferestre", () => {
    expect(result).not.toBeNull();
  });

  it("totalGWP cu ferestre > totalGWP fără ferestre", () => {
    const fara = calcGWPDetailed([perete], [], 100, 50);
    expect(result.totalGWP).toBeGreaterThan(fara.totalGWP);
  });
});

describe("calcGWPDetailed — material lemnos (GWP negativ A1-A3)", () => {
  const pereteleLemn = {
    type: "PE",
    area: 50,
    layers: [
      { material: "CLT (Cross Laminated Timber)", thickness: 200, lambda: 0.13, rho: 500 },
    ],
  };
  const result = calcGWPDetailed([pereteleLemn], [], 100, 50);

  it("gwp_A1A3 negativ pentru lemn (sechestrare CO2)", () => {
    expect(result.gwp_A1A3).toBeLessThan(0);
  });

  it("credit D > 0 (reciclare / sechestrare)", () => {
    expect(result.gwp_D).toBeGreaterThan(0);
  });
});

describe("calcGWPDetailed — durată viață implicită 50 ani", () => {
  const r50 = calcGWPDetailed([perete], [], 100);
  it("utilizează 50 ani implicit", () => {
    expect(r50.lifetime).toBe(50);
  });
});
