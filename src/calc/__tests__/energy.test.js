import { describe, it, expect } from "vitest";
import { getEnergyClass, getCO2Class } from "../classification.js";
import { calcMonthlyISO13790, calcUtilFactor } from "../iso13790.js";
import CLIMATE_DB from "../../data/climate.json";

const bucuresti = CLIMATE_DB.find(c => c.name === "București");

// ═══════════════════════════════════════════════════════════════
// Clasificare energetică — getEnergyClass
// ═══════════════════════════════════════════════════════════════

describe("getEnergyClass", () => {
  it("clasifică A+ pentru consum foarte scăzut", () => {
    const r = getEnergyClass(30, "RI_nocool");
    expect(r.cls).toBe("A+");
    expect(r.idx).toBe(0);
  });

  it("clasifică A pentru consum scăzut sub pragul A", () => {
    const r = getEnergyClass(100, "RI_nocool");
    expect(r.cls).toBe("A");
    expect(r.idx).toBe(1);
  });

  it("clasifică B pentru consum mediu-scăzut", () => {
    const r = getEnergyClass(150, "RI_nocool");
    expect(r.cls).toBe("B");
  });

  it("clasifică G pentru consum foarte ridicat", () => {
    const r = getEnergyClass(800, "RI_nocool");
    expect(r.cls).toBe("G");
    expect(r.idx).toBe(7);
  });

  it("returnează scor între 1 și 100", () => {
    const r = getEnergyClass(50, "RI_nocool");
    expect(r.score).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("returnează placeholder pentru categorie necunoscută", () => {
    const r = getEnergyClass(100, "INEXISTENT");
    expect(r.cls).toBe("—");
    expect(r.idx).toBe(-1);
  });

  it("funcționează pentru birouri (BI)", () => {
    const r = getEnergyClass(50, "BI");
    expect(r.cls).toBe("A+");
    // 68 e pragul A+ pentru BI
    const r2 = getEnergyClass(90, "BI");
    expect(r2.cls).toBe("A");
  });

  it("clasifică corect la limita exactă a pragului", () => {
    // RI_nocool thresholds: [78, 110, 220, 340, 460, 575, 690]
    const r = getEnergyClass(78, "RI_nocool");
    expect(r.cls).toBe("A+"); // ep <= 78 → A+
  });

  it("clădire net-zero (EP=0 după regenerabile) → clasa A+, nu —", () => {
    const r = getEnergyClass(0, "RI_nocool");
    expect(r.cls).toBe("A+");
    expect(r.idx).toBe(0);
  });

  it("clădire net-pozitivă (EP negativ după regenerabile) → clasa A+", () => {
    const r = getEnergyClass(-15, "RI_nocool");
    expect(r.cls).toBe("A+");
    expect(r.idx).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Clasificare CO2 — getCO2Class
// ═══════════════════════════════════════════════════════════════

describe("getCO2Class", () => {
  it("clasifică A+ pentru emisii foarte scăzute", () => {
    const r = getCO2Class(5, "RI");
    expect(r.cls).toBe("A+");
  });

  it("clasifică G pentru emisii foarte ridicate", () => {
    const r = getCO2Class(200, "RI");
    expect(r.cls).toBe("G");
  });

  it("folosește categoria AL ca fallback", () => {
    const r = getCO2Class(5, "CATEGORIE_INEXISTENTA");
    expect(r.cls).toBeDefined();
    expect(["A+", "A", "B", "C", "D", "E", "F", "G"]).toContain(r.cls);
  });
});

// ═══════════════════════════════════════════════════════════════
// ISO 13790 lunar — integrare rapidă cu date climatice reale
// ═══════════════════════════════════════════════════════════════

describe("calcMonthlyISO13790 — integrare cu date climatice București", () => {
  const baseParams = {
    G_env: 150,      // W/K coeficient global pierderi
    V: 250,          // m³ volum interior
    Au: 100,         // m² suprafață utilă
    climate: bucuresti,
    theta_int: 20,
    glazingElements: [{ area: 15, g: 0.5, frameRatio: 25, orientation: "S" }],
    shadingFactor: 0.9,
    category: "RI",
    n50: 4,
    structure: "Zidărie portantă",
  };

  it("returnează 12 rezultate lunare", () => {
    const results = calcMonthlyISO13790(baseParams);
    expect(results).not.toBeNull();
    expect(results).toHaveLength(12);
  });

  it("cererea de încălzire este pozitivă iarna (Ianuarie)", () => {
    const results = calcMonthlyISO13790(baseParams);
    // Ianuarie: temp ext = -1.5°C, deci deltaT > 0
    expect(results[0].qH_nd).toBeGreaterThan(0);
    expect(results[0].name).toBe("Ian");
  });

  it("cererea de răcire este 0 iarna", () => {
    const results = calcMonthlyISO13790(baseParams);
    // Lunile cu temp ext < 15°C nu au răcire
    expect(results[0].qC_nd).toBe(0); // Ianuarie
    expect(results[1].qC_nd).toBe(0); // Februarie
    expect(results[11].qC_nd).toBe(0); // Decembrie
  });

  it("Q_loss > 0 pentru luni cu deltaT pozitiv", () => {
    const results = calcMonthlyISO13790(baseParams);
    for (const m of results) {
      if (m.deltaT > 0) {
        expect(m.Q_loss).toBeGreaterThan(0);
      }
    }
  });

  it("returnează null pentru parametri lipsă", () => {
    expect(calcMonthlyISO13790({ G_env: 150 })).toBeNull();
    expect(calcMonthlyISO13790({ climate: bucuresti })).toBeNull();
  });
});
