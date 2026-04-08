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
