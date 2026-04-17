// ═══════════════════════════════════════════════════════════════
// Teste Vitest — Sprint 4b (17 apr 2026) — ACM Solar cuplaj + validări
// ═══════════════════════════════════════════════════════════════
// Acoperire:
//   1. validateACMInputs() — erori / avertizări / info per câmp
//   2. summarizeValidation() — format și culoare badge
//   3. calcACMen15316 — cuplaj solar real (f_sol aplicat EN 15316-4-3)
//   4. Regresie: Legionella persistentă din Sprint 3
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";
import { validateACMInputs, summarizeValidation, SEVERITY } from "../acm-validation.js";
import { calcACMen15316 } from "../acm-en15316.js";

// ─── Factory climă minimală (zona III) ──────────────────────
function climaIII() {
  return {
    zone: "III",
    temp_month: [-1, 1, 6, 12, 17, 21, 23, 23, 18, 12, 6, 1],
    solar: { S: 1200, SE: 1100, SV: 1100, E: 950, V: 950, Oriz: 1100, N: 600, NE: 750, NV: 750 },
    ngz: 3170,
  };
}

// ─── Factory parametri ACM motor de bază ────────────────────
function baseACMParams(overrides = {}) {
  return {
    category: "RI",
    nPersons: 4,
    consumptionLevel: "med",
    tSupply: 55,
    climateZone: "III",
    climate: climaIII(),
    hasPipeInsulation: true,
    hasCirculation: false,
    insulationClass: "B",
    pipeLength_m: 20,
    pipeDiameter_mm: 22,
    storageVolume_L: 200,
    acmSource: "ct_gaz",
    etaGenerator: 0.87,
    solarFraction: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. VALIDĂRI INPUT ACM (Sprint 4b BUG #7)
// ═══════════════════════════════════════════════════════════════
describe("Sprint 4b — validateACMInputs() validări complete", () => {

  it("Configurație validă rezidențial → 0 erori", () => {
    const r = validateACMInputs({
      consumers: "3", dailyLiters: "60", tSupply: "60",
      storageVolume: "150", insulationClass: "B",
      pipeLength: "15", pipeDiameter: "22",
      circRecirculation: false, hasLegionella: false,
    }, { category: "RI", areaUseful: 90 });
    expect(r.errors.length).toBe(0);
    expect(r.blockSubmit).toBe(false);
  });

  it("Consumers negativ → eroare blocantă", () => {
    const r = validateACMInputs({ consumers: "-2" }, { category: "RI", areaUseful: 90 });
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.errors.some(e => e.field === "consumers")).toBe(true);
    expect(r.blockSubmit).toBe(true);
  });

  it("Consumers > 10000 → eroare nerealist", () => {
    const r = validateACMInputs({ consumers: "15000" }, { category: "HC", areaUseful: 50000 });
    expect(r.errors.some(e => e.field === "consumers" && e.message.includes("10 000"))).toBe(true);
  });

  it("dailyLiters > 500 → eroare sanity", () => {
    const r = validateACMInputs({ dailyLiters: "700" }, { category: "RI" });
    expect(r.errors.some(e => e.field === "dailyLiters")).toBe(true);
  });

  it("dailyLiters > 200 rezidențial → avertizare (nu blocant)", () => {
    const r = validateACMInputs({ dailyLiters: "250" }, { category: "RI" });
    expect(r.errors.length).toBe(0);
    expect(r.warnings.some(w => w.field === "dailyLiters")).toBe(true);
  });

  it("tSupply 35°C → eroare (sub prag confort)", () => {
    const r = validateACMInputs({ tSupply: "35" }, { category: "RI" });
    expect(r.errors.some(e => e.field === "tSupply" && e.message.includes("40"))).toBe(true);
  });

  it("tSupply 72°C → avertizare opărire EN 806-2", () => {
    const r = validateACMInputs({ tSupply: "72" }, { category: "RI" });
    expect(r.warnings.some(w => w.field === "tSupply" && w.message.includes("opărire"))).toBe(true);
  });

  it("tSupply 50°C + categorie HIGH_RISK (SA spital) → avertizare Ord. MS 1002/2015", () => {
    const r = validateACMInputs({ tSupply: "50" }, { category: "SA" });
    expect(r.warnings.some(w =>
      w.field === "tSupply" && w.message.includes("60°C") && w.reference?.includes("MS")
    )).toBe(true);
  });

  it("tSupply 50°C rezidențial → avertizare generică Legionella", () => {
    const r = validateACMInputs({ tSupply: "50" }, { category: "RI" });
    expect(r.warnings.some(w => w.field === "tSupply" && w.message.includes("Legionella"))).toBe(true);
  });

  it("storageVolume 15000 L → eroare unități", () => {
    const r = validateACMInputs({ storageVolume: "15000" }, { category: "RI" });
    expect(r.errors.some(e => e.field === "storageVolume")).toBe(true);
  });

  it("storageVolume 500 L fără Legionella → avertizare VDI 6023", () => {
    const r = validateACMInputs({
      storageVolume: "500", hasLegionella: false,
    }, { category: "RC" });
    expect(r.warnings.some(w =>
      w.field === "storageVolume" && w.reference?.includes("VDI")
    )).toBe(true);
  });

  it("storageVolume 0 (instant) → fără erori", () => {
    const r = validateACMInputs({ storageVolume: "0" }, { category: "RA" });
    expect(r.errors.length).toBe(0);
  });

  it("insulationClass invalid → eroare ErP", () => {
    const r = validateACMInputs({ insulationClass: "X" }, { category: "RI" });
    expect(r.errors.some(e => e.field === "insulationClass")).toBe(true);
  });

  it("circHours 26 → eroare (max 24)", () => {
    const r = validateACMInputs({
      circRecirculation: true, circHours: "26",
    }, { category: "HC" });
    expect(r.errors.some(e => e.field === "circHours")).toBe(true);
  });

  it("circHours 22 → avertizare (aproape permanent)", () => {
    const r = validateACMInputs({
      circRecirculation: true, circHours: "22",
    }, { category: "HC" });
    expect(r.warnings.some(w => w.field === "circHours")).toBe(true);
  });

  it("Categorie HIGH_RISK (spital) fără hasLegionella → info recomandare", () => {
    const r = validateACMInputs({ hasLegionella: false }, { category: "SA" });
    expect(r.info.some(i => i.field === "hasLegionella" && i.message.includes("risc"))).toBe(true);
  });

  it("Legionella activat cu T = 55°C → eroare plajă 60-80", () => {
    const r = validateACMInputs({
      hasLegionella: true, legionellaT: "55",
    }, { category: "SA" });
    expect(r.errors.some(e => e.field === "legionellaT")).toBe(true);
  });

  it("Legionella activat cu T = 62°C → avertizare sub 65°C", () => {
    const r = validateACMInputs({
      hasLegionella: true, legionellaT: "62",
    }, { category: "SA" });
    expect(r.warnings.some(w => w.field === "legionellaT")).toBe(true);
  });

  it("Densitate consumatori > 1 pers/m² → avertizare", () => {
    const r = validateACMInputs({ consumers: "200" }, { category: "BI", areaUseful: 100 });
    expect(r.warnings.some(w =>
      w.field === "consumers" && w.message.includes("Densitate")
    )).toBe(true);
  });

  it("Config complet goală (toate undefined) → 0 erori (nimic de validat)", () => {
    const r = validateACMInputs({}, { category: "RI" });
    expect(r.errors.length).toBe(0);
    expect(r.blockSubmit).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. SUMMARIZE VALIDATION — badge UI
// ═══════════════════════════════════════════════════════════════
describe("Sprint 4b — summarizeValidation() badge UI", () => {

  it("Configurație fără probleme → verde 'validă'", () => {
    const r = summarizeValidation({ errors: [], warnings: [], info: [] });
    expect(r.color).toBe("#10b981");
    expect(r.label).toMatch(/valid/i);
  });

  it("1 eroare → roșu 'blocant'", () => {
    const r = summarizeValidation({
      errors: [{ field: "tSupply", message: "x" }], warnings: [], info: [],
    });
    expect(r.color).toBe("#ef4444");
    expect(r.label).toMatch(/blocant/i);
  });

  it("2 avertizări fără erori → galben", () => {
    const r = summarizeValidation({
      errors: [],
      warnings: [{ field: "a", message: "x" }, { field: "b", message: "y" }],
      info: [],
    });
    expect(r.color).toBe("#f59e0b");
    expect(r.label).toMatch(/2/);
  });

  it("Numai info → albastru recomandare", () => {
    const r = summarizeValidation({
      errors: [], warnings: [],
      info: [{ field: "hasLegionella", message: "x" }],
    });
    expect(r.color).toBe("#3b82f6");
    expect(r.label).toMatch(/recomandare/i);
  });

  it("SEVERITY constants exportate corect", () => {
    expect(SEVERITY.ERROR).toBe("error");
    expect(SEVERITY.WARNING).toBe("warning");
    expect(SEVERITY.INFO).toBe("info");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. CUPLAJ SOLAR → ACM (BUG #5 S4b)
// ═══════════════════════════════════════════════════════════════
describe("Sprint 4b — calcACMen15316 cuplaj solar Step 8 (EN 15316-4-3)", () => {

  it("Fără solar (solarFraction=0) → Q_gen_needed = Q_gen_brut", () => {
    const r = calcACMen15316(baseACMParams({ solarFraction: 0 }));
    expect(r).toBeTruthy();
    const brut = r.Q_nd_annual_kWh + r.Q_dist_kWh + r.Q_storage_kWh + (r.Q_legionella_kWh || 0);
    // Q_gen_needed ≈ brut cu toleranță rotunjire
    expect(Math.abs(r.Q_gen_needed_kWh - brut)).toBeLessThan(5);
    expect(r.solarFraction_pct).toBe(0);
    expect(r.Q_solar_kWh).toBe(0);
  });

  it("Solar 45% reducere directă Q_gen_needed", () => {
    const baseline = calcACMen15316(baseACMParams({ solarFraction: 0 }));
    const cuSolar = calcACMen15316(baseACMParams({ solarFraction: 0.45 }));

    const brut = baseline.Q_nd_annual_kWh + baseline.Q_dist_kWh + baseline.Q_storage_kWh + (baseline.Q_legionella_kWh || 0);
    const expectedNeeded = brut * 0.55;

    expect(Math.abs(cuSolar.Q_gen_needed_kWh - expectedNeeded)).toBeLessThan(10);
    expect(cuSolar.solarFraction_pct).toBe(45);
    expect(cuSolar.Q_solar_kWh).toBeGreaterThan(0);
    // Reducere Q_final direct proporțională cu f_sol
    expect(cuSolar.Q_final_kWh).toBeLessThan(baseline.Q_final_kWh * 0.6);
  });

  it("Solar 85% (plafon) cu cazan gaz → Q_final 15% din brut / η_gen", () => {
    const r = calcACMen15316(baseACMParams({ solarFraction: 0.85 }));
    const brut = r.Q_nd_annual_kWh + r.Q_dist_kWh + r.Q_storage_kWh + (r.Q_legionella_kWh || 0);
    const expectedFinal = (brut * 0.15) / 0.87;
    expect(Math.abs(r.Q_final_kWh - expectedFinal)).toBeLessThan(10);
    expect(r.solarFraction_pct).toBe(85);
  });

  it("Solar 0% vs. 50% — economie concretă >30% Q_final", () => {
    const fara = calcACMen15316(baseACMParams({ solarFraction: 0 }));
    const cu50 = calcACMen15316(baseACMParams({ solarFraction: 0.5 }));
    const economie = (fara.Q_final_kWh - cu50.Q_final_kWh) / fara.Q_final_kWh;
    expect(economie).toBeGreaterThan(0.45);  // ≥45% economie
    expect(economie).toBeLessThan(0.55);      // ≤55% economie (liniar cu f_sol)
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. REGRESIE — Legionella persistent (Sprint 3 păstrat)
// ═══════════════════════════════════════════════════════════════
describe("Sprint 4b — regresie Sprint 3 Legionella + cuplaj combinat", () => {

  it("Hotel + Legionella + solar 40% — toate componentele nenule", () => {
    const r = calcACMen15316(baseACMParams({
      category: "HC", nPersons: 50,
      storageVolume_L: 1000, insulationClass: "A",
      hasCirculation: true, circPumpType: "variabila", circHours_per_day: 16,
      hasLegionella: true, legionellaFreq: "weekly", legionellaT: 70,
      solarFraction: 0.40,
    }));
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(0);
    expect(r.Q_dist_kWh).toBeGreaterThan(0);
    expect(r.Q_storage_kWh).toBeGreaterThan(0);
    expect(r.Q_legionella_kWh).toBeGreaterThan(0);
    expect(r.W_circ_pump_kWh).toBeGreaterThan(0);
    expect(r.solarFraction_pct).toBe(40);
    expect(r.Q_solar_kWh).toBeGreaterThan(0);
    expect(r.legionella.risk).toBe("high");
  });

  it("Cazan gaz instant (storageVolume=0) + solar 50% — fără pierderi stocare, solar aplicat", () => {
    const r = calcACMen15316(baseACMParams({
      storageVolume_L: 0,   // instant
      solarFraction: 0.50,
    }));
    expect(r.Q_storage_kWh).toBe(0);
    expect(r.vol_L).toBe(0);
    expect(r.solarFraction_pct).toBe(50);
    expect(r.Q_solar_kWh).toBeGreaterThan(0);
  });

  it("PC ACM dedicată (acmSource=pc, COP 3.0) + solar 30% — Q_final = Q_needed / COP", () => {
    const r = calcACMen15316(baseACMParams({
      acmSource: "pc", copACM: 3.0, solarFraction: 0.30,
    }));
    const brut = r.Q_nd_annual_kWh + r.Q_dist_kWh + r.Q_storage_kWh + (r.Q_legionella_kWh || 0);
    const expectedFinal = (brut * 0.70) / 3.0;
    expect(Math.abs(r.Q_final_kWh - expectedFinal)).toBeLessThan(10);
    expect(r.eta_gen).toBe(3);
  });
});
