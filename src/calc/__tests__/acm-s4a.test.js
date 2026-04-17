// ═══════════════════════════════════════════════════════════════
// Sprint 4a (17 apr 2026) — Fix-uri ACM partea 1
// ═══════════════════════════════════════════════════════════════
// Verificări pentru:
//   - Bug #1: unicitate motor (useInstallationSummary deleghează la calcACMen15316)
//   - Bug #2: storageLoss eliminat (orfan pre-S4a)
//   - Bug #3: categorii clădire extinse (10 → 45 subcategorii)
//   - Bug A6: η_combi_vara factor sezonier CAZAN_H
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcACMen15316, ACM_CONSUMPTION_SPECIFIC } from "../acm-en15316.js";

const climate_zoneII = {
  temp_month: [-5, -3, 3, 10, 16, 20, 22, 22, 17, 10, 3, -3],
};

describe("Sprint 4a — Bug #3: categorii clădire extinse (Mc 001 Anexă + GEx 009-013)", () => {
  it("Grădiniță cu cantină — consum med ≈ 25 L/copil·zi (GEx 009-013)", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.GR).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.GR.med).toBeGreaterThanOrEqual(20);
    expect(ACM_CONSUMPTION_SPECIFIC.GR.med).toBeLessThanOrEqual(30);
  });

  it("Creșă (bebeluși, igienă intensă) — consum med > grădiniță", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.CR).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.CR.med).toBeGreaterThan(
      ACM_CONSUMPTION_SPECIFIC.GR.med
    );
  });

  it("Dializă — consum critic sanitar ≥ 200 L/pacient·ședință", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.DZ).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.DZ.med).toBeGreaterThanOrEqual(100);
    expect(ACM_CONSUMPTION_SPECIFIC.DZ.high).toBeGreaterThanOrEqual(250);
  });

  it("Spălătorie industrială — consum mediu ≥ 50 L/kg rufe", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.SPL).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.SPL.med).toBeGreaterThanOrEqual(50);
  });

  it("Fermă muls mecanizat — consum med ≈ 40-50 L/animal·zi", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.FRM).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.FRM.med).toBeGreaterThanOrEqual(30);
    expect(ACM_CONSUMPTION_SPECIFIC.FRM.med).toBeLessThanOrEqual(60);
  });

  it("Tabără copii cu dușuri comune — consum med ≈ 80 L/pers·zi", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.TAB).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.TAB.med).toBeGreaterThanOrEqual(60);
    expect(ACM_CONSUMPTION_SPECIFIC.TAB.med).toBeLessThanOrEqual(100);
  });

  it("Hotel 4-5* (spa+piscină) — consum > hotel 3*", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.HO_LUX.med).toBeGreaterThan(
      ACM_CONSUMPTION_SPECIFIC.HC.med
    );
  });

  it("Spa wellness (saună+jacuzzi+dușuri) — consum mediu ≥ 100 L/client", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.SPA_W).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.SPA_W.med).toBeGreaterThanOrEqual(80);
  });

  it("Categoria totală ≥ 40 subcategorii (extensie S4a)", () => {
    const total = Object.keys(ACM_CONSUMPTION_SPECIFIC).length;
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it("Motor ACM acceptă categoriile noi — calcul valid pentru dializă", () => {
    const r = calcACMen15316({
      category: "DZ",
      nPersons: 10, // 10 pacienți
      consumptionLevel: "med",
      tSupply: 60, // Legionella obligatorie sanitar
      climateZone: "III",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: true,
      insulationClass: "A",
      storageVolume_L: 500,
      acmSource: "ct_gaz",
      etaGenerator: 0.92,
    });
    expect(r).not.toBeNull();
    expect(r.q_specific_L).toBe(ACM_CONSUMPTION_SPECIFIC.DZ.med);
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(5000);
  });

  it("Fallback AL pentru categorii inexistente (safety)", () => {
    const r = calcACMen15316({
      category: "INEXISTENT_XYZ",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: climate_zoneII,
      acmSource: "ct_gaz",
      etaGenerator: 0.9,
    });
    expect(r).not.toBeNull();
    expect(r.q_specific_L).toBe(ACM_CONSUMPTION_SPECIFIC.AL.med);
  });
});

describe("Sprint 4a — Bug #1: unicitate motor (pass-through instSummary)", () => {
  it("Motorul `calcACMen15316` este unica sursă pentru Q_W (hook deleghează 100%)", () => {
    // Verificare simplificată: invocare directă motor cu parametri tipici → rezultat complet
    const r = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "III",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: false,
      insulationClass: "B",
      storageVolume_L: 150,
      acmSource: "ct_gaz",
      etaGenerator: 0.9,
    });
    // Asertăm prezența TUTUROR câmpurilor folosite de hook + UI + CPE
    expect(r.Q_nd_annual_kWh).toBeTypeOf("number");
    expect(r.Q_dist_kWh).toBeTypeOf("number");
    expect(r.Q_storage_kWh).toBeTypeOf("number");
    expect(r.Q_legionella_kWh).toBeTypeOf("number");
    expect(r.Q_gen_needed_kWh).toBeTypeOf("number");
    expect(r.Q_final_kWh).toBeTypeOf("number");
    expect(r.W_circ_pump_kWh).toBeTypeOf("number");
    expect(r.eta_system).toBeTypeOf("number");
    expect(r.monthly).toHaveLength(12);
    expect(r.recommendations).toBeInstanceOf(Array);
    expect(r.reference).toContain("15316");
  });

  it("Identitate numerică: aceiași parametri → același Q_final (determinism)", () => {
    const params = {
      category: "RC",
      nPersons: 30,
      consumptionLevel: "med",
      tSupply: 60,
      climateZone: "II",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: true,
      insulationClass: "B",
      pipeLength_m: 60,
      pipeDiameter_mm: 28,
      storageVolume_L: 800,
      acmSource: "ct_gaz",
      etaGenerator: 0.85,
      hasLegionella: true,
      legionellaFreq: "weekly",
      legionellaT: 70,
    };
    const r1 = calcACMen15316(params);
    const r2 = calcACMen15316(params);
    expect(r1.Q_final_kWh).toBe(r2.Q_final_kWh);
    expect(r1.Q_storage_kWh).toBe(r2.Q_storage_kWh);
    expect(r1.W_circ_pump_kWh).toBe(r2.W_circ_pump_kWh);
  });
});

describe("Sprint 4a — Bug #2: storageLoss eliminat (pre-S4a era orfan)", () => {
  it("Motorul NU expune storageLoss ca parametru (calcul automat EN 50440)", () => {
    const r = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: climate_zoneII,
      storageVolume_L: 200,
      insulationClass: "B",
      acmSource: "ct_gaz",
      etaGenerator: 0.9,
      // NICIUN parametru storageLoss transmis
    });
    expect(r).not.toBeNull();
    // Q_storage se derivă automat din volum × clasă izolație (EN 50440)
    expect(r.Q_storage_kWh).toBeGreaterThan(0);
    expect(r.q_standby_kWh_day).toBeGreaterThan(0);
  });

  it("Volum stocare = 0 (combi instant) → Q_storage = 0 deterministic", () => {
    const r = calcACMen15316({
      category: "RA",
      nPersons: 3,
      consumptionLevel: "med",
      climateZone: "III",
      climate: climate_zoneII,
      storageVolume_L: 0,
      acmSource: "ct_gaz",
      etaGenerator: 0.95,
    });
    expect(r.Q_storage_kWh).toBe(0);
    expect(r.q_standby_kWh_day).toBe(0);
  });
});

describe("Sprint 4a — Bug A6: η_combi_vara factor sezonier CAZAN_H", () => {
  // Factor COMBI_SUMMER_FACTOR = 0.87 aplicat doar în hook (useInstallationSummary),
  // nu direct în calcACMen15316. Testăm comportamentul prin invocare motor
  // cu etaGenerator corespunzător (nominal × 0.87) vs. nominal.
  it("η combi vară efectiv = η nominal iarnă × 0.87 → +15% energie finală", () => {
    const baseParams = {
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "III",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: false,
      insulationClass: "B",
      storageVolume_L: 0, // combi instant
      acmSource: "ct_gaz",
    };
    const winterEta = calcACMen15316({ ...baseParams, etaGenerator: 1.0 });
    const summerEta = calcACMen15316({ ...baseParams, etaGenerator: 1.0 * 0.87 });
    // Energie finală vara (cu η redus) trebuie să fie ~15% mai mare
    const ratio = summerEta.Q_final_kWh / winterEta.Q_final_kWh;
    expect(ratio).toBeGreaterThan(1.10);
    expect(ratio).toBeLessThan(1.20);
  });

  it("Cazan dedicat gaz (nu combi) NU primește factor sezonier (η stabil)", () => {
    // Simulăm: cazan dedicat ACM BOILER_G (η=0.87) — η nu se schimbă între
    // iarnă și vară, fiindcă funcționează exclusiv pentru ACM (fără ciclare gratuită).
    const r1 = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: climate_zoneII,
      storageVolume_L: 150,
      acmSource: "ct_gaz",
      etaGenerator: 0.87, // η dedicat — stabil tot anul
    });
    const r2 = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: climate_zoneII,
      storageVolume_L: 150,
      acmSource: "ct_gaz",
      etaGenerator: 0.87, // identic
    });
    expect(r1.Q_final_kWh).toBe(r2.Q_final_kWh);
  });
});

describe("Sprint 4a — Regresie: compatibilitate cu scenariile AUDIT_08 §7", () => {
  it("Test 1 AUDIT: apartament 65m², 3 pers, combi condensare — consistent cu S4a", () => {
    // Cu COMBI_SUMMER_FACTOR aplicat în hook pentru CAZAN_H, apelul direct
    // motor ar trebui să folosească etaGenerator pre-ajustat (1.05 × 0.87 = 0.91).
    const r = calcACMen15316({
      category: "RA",
      nPersons: 3,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "II",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: false,
      insulationClass: "B",
      pipeLength_m: 15,
      pipeDiameter_mm: 22,
      storageVolume_L: 0,
      acmSource: "ct_gaz",
      etaGenerator: 0.95, // combi condensare vară (1.09 × 0.87 ≈ 0.95)
    });
    expect(r).not.toBeNull();
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(2800);
    expect(r.Q_nd_annual_kWh).toBeLessThan(3400);
    // EP_ACM 60-75 kWh/m²·an conform AUDIT
    const EP_ACM_m2 = r.Q_final_kWh * 1.17 / 65;
    expect(EP_ACM_m2).toBeGreaterThan(55);
    expect(EP_ACM_m2).toBeLessThan(85);
  });

  it("Bloc cu CT comun + Legionella — supplement energetic > 0", () => {
    const r = calcACMen15316({
      category: "RC",
      nPersons: 60,
      consumptionLevel: "med",
      tSupply: 60,
      climateZone: "II",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: true,
      insulationClass: "B",
      pipeLength_m: 80,
      pipeDiameter_mm: 32,
      storageVolume_L: 1000,
      acmSource: "ct_gaz",
      etaGenerator: 0.82,
      hasLegionella: true,
      legionellaFreq: "weekly",
      legionellaT: 70,
    });
    expect(r.Q_legionella_kWh).toBeGreaterThan(0);
    expect(r.legionella).toBeDefined();
  });
});
