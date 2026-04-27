/**
 * Sprint S30B — Teste de bază pentru cele 5 module nou create.
 * Modulele B5 (ZEB), B6 (profile ocupare), B7 (SR 4839 referință) sunt
 * extensii ale modulelor existente cu teste deja acoperite.
 */
import { describe, it, expect } from "vitest";
import { calcGlaserCondens } from "../glaser-condens.js";
import { checkEPBDArt13Solar, getEPBDArt13Verdict } from "../epbd-art13-solar.js";
import { checkEPBDArt17Fossil, getEPBDArt17Verdict } from "../epbd-art17-fossil.js";
import { calcGWPLifecycle } from "../gwp-lifecycle-en15978.js";
import { checkVentilationI52022 } from "../ventilation-i5-2022.js";

describe("S30B·B1 — calcGlaserCondens (wrapper SR EN ISO 13788)", () => {
  const mockClimate = {
    tExtMonth: [-2, 0, 5, 10, 16, 20, 22, 22, 17, 11, 5, 0],
    rhExtMonth: [0.85, 0.82, 0.75, 0.70, 0.68, 0.65, 0.63, 0.63, 0.70, 0.78, 0.83, 0.86],
    zone: "II",
  };

  it("returnează null pentru element fără layers", () => {
    expect(calcGlaserCondens({ layers: [] }, mockClimate)).toBe(null);
    expect(calcGlaserCondens(null, mockClimate)).toBe(null);
  });

  it("calculează balance cu structuri valide", () => {
    const element = {
      layers: [
        { thickness: 200, lambda: 0.7, mu: 10 },   // perete cărămidă
        { thickness: 100, lambda: 0.04, mu: 50 },  // EPS
      ],
    };
    const r = calcGlaserCondens(element, mockClimate);
    expect(r).not.toBe(null);
    expect(r).toHaveProperty("hasCondens");
    expect(r).toHaveProperty("totalCondensYear_kg_m2");
    expect(r).toHaveProperty("balancePerYear_kg_m2");
    expect(r).toHaveProperty("monthlyDetail");
    expect(r.sources.length).toBeGreaterThan(0);
  });
});

describe("S30B·B2 — EPBD Art.13 (Solar)", () => {
  it("clădire rezidențială nouă → deadline 2029", () => {
    const r = checkEPBDArt13Solar({ category: "RI", areaUseful: 150, isNew: true });
    expect(r.required).toBe(true);
    expect(r.deadline).toBe("2029-12-31");
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it("clădire publică nouă > 250 m² → deadline 2026", () => {
    const r = checkEPBDArt13Solar({ category: "BI", areaUseful: 500, isNew: true, isPublic: true });
    expect(r.required).toBe(true);
    expect(r.deadline).toBe("2026-12-31");
  });

  it("clădire istorică → derogare", () => {
    const r = checkEPBDArt13Solar({ category: "RI", isNew: true, isHistoric: true });
    expect(r.required).toBe(false);
    expect(r.exceptions).toContain("historic_building");
  });

  it("verdict success când PV instalat și obligație acoperită", () => {
    const v = getEPBDArt13Verdict({ category: "BI", areaUseful: 500, isNew: true, isPublic: true }, true);
    expect(v.level).toBe("success");
  });
});

describe("S30B·B3 — EPBD Art.17 (Cazane fosile)", () => {
  it("cazan gaz natural stand-alone → subvenții interzise + deadline 2040", () => {
    const r = checkEPBDArt17Fossil({ source: "CAZAN", fuel: "gaz_natural" });
    expect(r.isFossil).toBe(true);
    expect(r.subsidyBanned).toBe(true);
    expect(r.mustReplaceBy).toBe("2040-01-01");
    expect(r.alternatives.length).toBeGreaterThan(0);
  });

  it("sistem hibrid cu PC → exceptat de la eliminare", () => {
    const r = checkEPBDArt17Fossil({ source: "CAZAN", fuel: "gaz", hybridWithHP: true });
    expect(r.isFossil).toBe(true);
    expect(r.subsidyBanned).toBe(false);
    expect(r.mustReplaceBy).toBe(null);
  });

  it("PC neutră → nu intră sub Art.17", () => {
    const r = checkEPBDArt17Fossil({ source: "POMPA_CALDURA", fuel: "electric" });
    expect(r.isFossil).toBe(false);
  });
});

describe("S30B·B4 — GWP Lifecycle EN 15978", () => {
  it("calculează GWP total pentru materiale și operational", () => {
    const r = calcGWPLifecycle({
      areaUseful: 100,
      materialsList: [
        { id: "beton_C20", mass_kg: 20000 },
        { id: "EPS",       mass_kg: 500 },
        { id: "vata_minerala", mass_kg: 1500 },
      ],
      epOperational: 80,
      fuelMix: { electric: 30, gaz: 70 },
      lifespan: 50,
    });
    expect(r).not.toBe(null);
    expect(r.a13_kgCO2e_m2).toBeGreaterThan(0);
    expect(r.b16_kgCO2e_m2).toBeGreaterThan(0);
    expect(r.total_per_year_kgCO2e_m2).toBeGreaterThan(0);
    expect(r.verdict).toBeTruthy();
  });

  it("returnează null pentru Au invalid", () => {
    expect(calcGWPLifecycle({ areaUseful: 0, materialsList: [] })).toBe(null);
  });
});

describe("S30B·B8 — Ventilation I 5-2022", () => {
  it("ventilare absentă → neconform", () => {
    const r = checkVentilationI52022(null, { category: "RI" });
    expect(r.conform).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("birouri fără HRV → neconform (η ≥ 75% obligatoriu)", () => {
    const r = checkVentilationI52022(
      { type: "VMC_simplu", flowPerPersonLs: 8, hrEfficiency: 0 },
      { category: "BI", areaUseful: 200 },
    );
    expect(r.conform).toBe(false);
    expect(r.issues.some(i => i.includes("Recuperator"))).toBe(true);
  });

  it("birouri cu VMC dublu flux + η 75% + filtru F7 → conform", () => {
    const r = checkVentilationI52022(
      { type: "VMC_HR", flowPerPersonLs: 8, hrEfficiency: 75, filterClass: "F7" },
      { category: "BI", areaUseful: 200, volume: 540 },
      "II",
    );
    expect(r.conform).toBe(true);
  });

  it("debit < cerinta cat II → issue raportat", () => {
    const r = checkVentilationI52022(
      { type: "VMC_HR", flowPerPersonLs: 5, hrEfficiency: 80, filterClass: "F7" },
      { category: "BI", areaUseful: 200 },
      "II",
    );
    expect(r.issues.some(i => i.includes("Debit"))).toBe(true);
  });
});
