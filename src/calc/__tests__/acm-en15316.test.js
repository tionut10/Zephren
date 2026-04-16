import { describe, it, expect } from "vitest";
import { calcACMen15316, ACM_CONSUMPTION_SPECIFIC, T_COLD_BY_ZONE } from "../acm-en15316.js";

describe("ACM EN 15316-3/5 — Calcul apă caldă menajeră", () => {
  const baseParams = {
    category: "RI",
    nPersons: 4,
    consumptionLevel: "med",
    tSupply: 55,
    climateZone: "III",
    climate: { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1] },
    hasPipeInsulation: true,
    hasCirculation: false,
    insulationClass: "B",
    storageVolume_L: 200,
    acmSource: "ct_gaz",
    etaGenerator: 0.92,
    solarFraction: 0,
  };

  it("Casă 4 persoane — necesar anual rezonabil (1000-6000 kWh)", () => {
    const r = calcACMen15316(baseParams);
    expect(r).not.toBeNull();
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(1000);
    expect(r.Q_nd_annual_kWh).toBeLessThan(6000);
  });

  it("Pierderi distribuție > 0 cu conducte izolate", () => {
    const r = calcACMen15316(baseParams);
    expect(r.Q_dist_kWh).toBeGreaterThan(0);
    expect(r.f_dist_pct).toBeLessThan(30); // izolat = pierderi moderate
  });

  it("Pierderi stocare > 0", () => {
    const r = calcACMen15316(baseParams);
    expect(r.Q_storage_kWh).toBeGreaterThan(0);
    expect(r.q_standby_kWh_day).toBeGreaterThan(0);
  });

  it("Solar fraction 50% reduce necesarul generator", () => {
    const withSolar = calcACMen15316({ ...baseParams, solarFraction: 0.50 });
    const without = calcACMen15316(baseParams);
    expect(withSolar.Q_gen_needed_kWh).toBeLessThan(without.Q_gen_needed_kWh * 0.65);
    expect(withSolar.Q_solar_kWh).toBeGreaterThan(0);
  });

  it("Pompă de căldură ACM (COP 2.5) reduce energia finală", () => {
    const hp = calcACMen15316({ ...baseParams, acmSource: "pc", copACM: 2.5 });
    const gaz = calcACMen15316(baseParams);
    expect(hp.Q_final_kWh).toBeLessThan(gaz.Q_final_kWh);
  });

  it("0 persoane → null", () => {
    expect(calcACMen15316({ ...baseParams, nPersons: 0 })).toBeNull();
  });

  it("12 rezultate lunare", () => {
    const r = calcACMen15316(baseParams);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[0].month).toBe("Ian");
  });
});

describe("Date de referință ACM", () => {
  it("Consum specific rezidențial mediu = 55-60 L/zi/pers", () => {
    expect(ACM_CONSUMPTION_SPECIFIC.RC.med).toBeGreaterThanOrEqual(50);
    expect(ACM_CONSUMPTION_SPECIFIC.RC.med).toBeLessThanOrEqual(60);
  });

  it("Temperatura apă rece zona III = 10°C", () => {
    expect(T_COLD_BY_ZONE.III).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// Sprint 1 — scenarii din AUDIT_08 § 7 (verificare numerică)
// ═══════════════════════════════════════════════════════════════

describe("Sprint 1 — Scenarii normative din AUDIT_08", () => {
  const climate_zoneII = { temp_month: [-5, -3, 3, 10, 16, 20, 22, 22, 17, 10, 3, -3] };

  it("Test 1: Apartament 65 m², 3 pers, combi gaz condensare — EP_ACM ≈ 60-75 kWh/m²·an", () => {
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
      storageVolume_L: 0, // explicit fără stocare externă (combi instant schimbător placi)
      acmSource: "ct_gaz",
      etaGenerator: 0.95, // combi condensare vară (η redus față de nominal 1.05)
    });
    expect(r).not.toBeNull();
    // Calcul manual: 3 × 55 × 1.163 × (55-11) × 365 / 1000 = 3.081 kWh/an
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(2800);
    expect(r.Q_nd_annual_kWh).toBeLessThan(3400);
    // Pierderi distribuție rezonabile (izolat fără recirc): 8-12%
    expect(r.f_dist_pct).toBeGreaterThanOrEqual(8);
    expect(r.f_dist_pct).toBeLessThanOrEqual(18);
    // EP_ACM specific: 3081 × 1.17 / 0.95 / 65 m² ≈ 60 kWh/m²·an (fără aux)
    const EP_ACM_m2 = r.Q_final_kWh * 1.17 / 65;
    expect(EP_ACM_m2).toBeGreaterThan(55);
    expect(EP_ACM_m2).toBeLessThan(85);
  });

  it("Test 2: Bloc 20 apt × 3 pers, CT comun + circulație, boiler 2×500L clasa B", () => {
    const r = calcACMen15316({
      category: "RC",
      nPersons: 60,
      consumptionLevel: "med",
      tSupply: 60, // Legionella boiler >400L
      climateZone: "II",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: true,
      insulationClass: "B",
      pipeLength_m: 80,
      pipeDiameter_mm: 32,
      storageVolume_L: 1000,
      acmSource: "ct_gaz",
      etaGenerator: 0.82, // CT comun vechi
      solarFraction: 0,
    });
    expect(r).not.toBeNull();
    // Cerere: 60 × 55 × 1.163 × 49 × 365 / 1000 ≈ 68.600 kWh/an
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(55000);
    expect(r.Q_nd_annual_kWh).toBeLessThan(80000);
    // Pierderi distribuție cu recirculare: 15-22%
    expect(r.f_dist_pct).toBeGreaterThanOrEqual(12);
    expect(r.f_dist_pct).toBeLessThanOrEqual(25);
    // Pierderi stocare semnificative la 1000L
    expect(r.Q_storage_kWh).toBeGreaterThan(1500);
    expect(r.recommendations.length).toBeGreaterThan(0); // ar trebui să recomande optimizări
  });

  it("Test 3: Casă 150m², 4 pers, PC ACM dedicată COP 2.5, boiler 200L clasa A", () => {
    const r = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "II",
      climate: climate_zoneII,
      hasPipeInsulation: true,
      hasCirculation: false,
      insulationClass: "A", // boiler premium −55% pierderi
      pipeLength_m: 8,
      pipeDiameter_mm: 22,
      storageVolume_L: 200,
      acmSource: "pc",
      copACM: 2.5,
    });
    expect(r).not.toBeNull();
    // Cerere brută: 4 × 60 × 1.163 × 49 × 365 / 1000 ≈ 4.995 kWh/an
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(4200);
    expect(r.Q_nd_annual_kWh).toBeLessThan(5500);
    // PC reduce energia finală: Q_final ≈ Q_gen / COP = ~5.400 / 2.5 ≈ 2.100 kWh electric
    expect(r.Q_final_kWh).toBeGreaterThan(1800);
    expect(r.Q_final_kWh).toBeLessThan(2700);
    // Eficiență sistem (Q_nd / Q_final) > 1.8 pentru PC cu COP 2.5
    expect(r.eta_system).toBeGreaterThan(1.7);
  });

  it("Override dailyLiters respectă valoarea user peste tabelul ACM_CONSUMPTION_SPECIFIC", () => {
    const defaultR = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1] },
      acmSource: "ct_gaz",
      etaGenerator: 0.9,
    });
    const overrideR = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med",
      climateZone: "III",
      climate: { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1] },
      acmSource: "ct_gaz",
      etaGenerator: 0.9,
      dailyLitersOverride: 90, // consum ridicat utilizator custom
    });
    expect(overrideR.q_specific_L).toBe(90);
    expect(overrideR.Q_nd_annual_kWh).toBeGreaterThan(defaultR.Q_nd_annual_kWh * 1.3);
  });

  it("Clasa boiler A vs C — diferență pierderi stocare ~55%", () => {
    const params = {
      category: "RI", nPersons: 4, consumptionLevel: "med", climateZone: "III",
      climate: { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1] },
      storageVolume_L: 200, acmSource: "ct_gaz", etaGenerator: 0.9,
      hasPipeInsulation: true, hasCirculation: false,
    };
    const classA = calcACMen15316({ ...params, insulationClass: "A" });
    const classC = calcACMen15316({ ...params, insulationClass: "C" });
    // Clasa A are insulFactor 0.45, clasa C are 1.00 → A ≈ 45% din C
    expect(classA.Q_storage_kWh).toBeLessThan(classC.Q_storage_kWh * 0.55);
  });
});
