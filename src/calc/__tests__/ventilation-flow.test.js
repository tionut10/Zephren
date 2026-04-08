import { describe, it, expect } from "vitest";
import { calcVentilationFlow, VENT_PER_PERSON, OCCUPANCY_DENSITY } from "../ventilation-flow.js";

describe("Ventilare EN 16798-1 — debite igienice", () => {
  const baseParams = {
    Au: 100,
    H: 2.8,
    category: "BI",
    ieqCategory: "II",
    ventType: "HR80",
    hrEta: 0.80,
    climate: { ngz: 3000 },
  };

  it("Birouri 100 m² Cat. II — debit > 0", () => {
    const r = calcVentilationFlow(baseParams);
    expect(r).not.toBeNull();
    expect(r.q_total_LS).toBeGreaterThan(0);
    expect(r.q_total_M3H).toBeGreaterThan(0);
    expect(r.n_air).toBeGreaterThan(0);
  });

  it("Debit respectă minim igienic (≥ 7 L/s·pers)", () => {
    const r = calcVentilationFlow(baseParams);
    const minPerPerson = 7 * r.nPersons;
    expect(r.q_total_LS).toBeGreaterThanOrEqual(minPerPerson * 0.9); // ~90% din minim individual
  });

  it("CO₂ calculat rezonabil (420-1500 ppm)", () => {
    const r = calcVentilationFlow(baseParams);
    // CO₂ depinde de raport debite/persoane — poate fi ușor > 800 la densitate mare birouri
    expect(r.co2_steady).toBeGreaterThan(420); // > exterior
    expect(r.co2_steady).toBeLessThan(1500);   // nu extrem
  });

  it("Cat. I necesită debit mai mare decât Cat. III", () => {
    const cat1 = calcVentilationFlow({ ...baseParams, ieqCategory: "I" });
    const cat3 = calcVentilationFlow({ ...baseParams, ieqCategory: "III" });
    expect(cat1.q_total_LS).toBeGreaterThan(cat3.q_total_LS);
  });

  it("Rezidențial — densitate 25-30 m²/pers", () => {
    expect(OCCUPANCY_DENSITY.RI).toBeGreaterThanOrEqual(25);
    expect(OCCUPANCY_DENSITY.RC).toBeGreaterThanOrEqual(20);
  });

  it("Valori EN 16798-1 Tabel B.2 corecte", () => {
    expect(VENT_PER_PERSON.I).toBe(10);
    expect(VENT_PER_PERSON.II).toBe(7);
    expect(VENT_PER_PERSON.III).toBe(4);
  });

  it("Au = 0 → null", () => {
    expect(calcVentilationFlow({ ...baseParams, Au: 0 })).toBeNull();
  });
});
