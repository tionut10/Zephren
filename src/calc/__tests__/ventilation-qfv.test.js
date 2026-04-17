import { describe, it, expect } from "vitest";
import { VENTILATION_TYPES } from "../../data/constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 1 (17 apr 2026) — Regresie pentru bug-ul dimensional qf_v
// Referință: AUDIT_10 §2.2 — SFP stocat în kW/(m³/s), nu W/(m³/s)
//
// Aceste teste documentează formula corectă pentru consumul electric al
// ventilatoarelor, replicând logica din useInstallationSummary.js.
//
// Formula canonică:
//   P_fan [W] = SFP [kW/(m³/s)] × q [m³/s] × 1000
//   qf_v [kWh/an] = P_fan × t_op [h] / 1000
//
// Cu prioritate la `fanPower` (W) dacă e completat de auditor.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Replică exactă a formulei din useInstallationSummary.js:155-180
 * pentru testare izolată.
 */
function calcVentEnergy({ ventType, airflow_m3h, fanPower_W, ventHours }) {
  const V_default = 178.75; // apartament 65 m² × H=2.75 m
  const airflowRaw = parseFloat(airflow_m3h);
  const airflow = (isFinite(airflowRaw) && airflowRaw > 0) ? airflowRaw : (V_default * 0.5);
  const sfp = ventType?.sfp || 0; // kW/(m³/s)
  const isNat = sfp === 0;
  const hoursRaw = parseFloat(ventHours);
  const hours = (isFinite(hoursRaw) && hoursRaw >= 0 && hoursRaw <= 8760)
    ? hoursRaw : (isNat ? 0 : 8760);
  const fanRaw = parseFloat(fanPower_W);
  const P_fan_W = (isFinite(fanRaw) && fanRaw > 0)
    ? fanRaw
    : sfp * (airflow / 3600) * 1000;
  return P_fan_W * hours / 1000;
}

describe("Sprint 1 — qf_v ventilație (fix dimensional SFP)", () => {
  it("CMV HR80: 200 m³/h × 8760 h × SFP 1.40 kW/(m³/s) → ~680 kWh/an (nu 0.68)", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    expect(hr80).toBeDefined();
    expect(hr80.sfp).toBe(1.40);
    const qf_v = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, ventHours: 8760 });
    // P_fan = 1.40 × (200/3600) × 1000 = 77.78 W
    // qf_v = 77.78 × 8760 / 1000 = 681.3 kWh/an
    expect(qf_v).toBeGreaterThan(650);
    expect(qf_v).toBeLessThan(710);
  });

  it("UTA: 150 m³/h × 8760 h × SFP 2.00 → ~730 kWh/an (subestimare anterioară 730×)", () => {
    const uta = VENTILATION_TYPES.find(t => t.id === "UTA");
    expect(uta).toBeDefined();
    expect(uta.sfp).toBe(2.00);
    const qf_v = calcVentEnergy({ ventType: uta, airflow_m3h: 150, ventHours: 8760 });
    // P_fan = 2.00 × (150/3600) × 1000 = 83.33 W
    // qf_v = 83.33 × 8760 / 1000 = 730.0 kWh/an
    expect(qf_v).toBeGreaterThan(700);
    expect(qf_v).toBeLessThan(760);
  });

  it("Ventilare naturală (NAT): qf_v = 0 kWh/an indiferent de debit", () => {
    const nat = VENTILATION_TYPES.find(t => t.id === "NAT");
    expect(nat.sfp).toBe(0);
    const qf_v = calcVentEnergy({ ventType: nat, airflow_m3h: 100, ventHours: 8760 });
    expect(qf_v).toBe(0);
  });

  it("Debit 0 m³/h → fallback igienic V×0.5; qf_v > 0 pentru sistem mecanic", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    const qf_v = calcVentEnergy({ ventType: hr80, airflow_m3h: 0, ventHours: 8760 });
    // Fallback: 178.75 × 0.5 = 89.4 m³/h → P_fan = 1.40 × 89.4/3600 × 1000 = 34.7 W
    // qf_v = 34.7 × 8760 / 1000 = 304 kWh/an
    expect(qf_v).toBeGreaterThan(250);
    expect(qf_v).toBeLessThan(360);
  });

  it("Debit negativ (−100) respins → fallback igienic aplicat (nu produce valoare negativă)", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    const qf_v = calcVentEnergy({ ventType: hr80, airflow_m3h: -100, ventHours: 8760 });
    expect(qf_v).toBeGreaterThan(0); // fallback activ
  });

  it("fanPower explicit 180 W × 8760 h → 1577 kWh/an (prioritate față de SFP)", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    const qf_v = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, fanPower_W: 180, ventHours: 8760 });
    // 180 × 8760 / 1000 = 1576.8 kWh/an
    expect(qf_v).toBeCloseTo(1576.8, 1);
  });

  it("fanPower NaN/gol → cad pe calcul SFP (backward compat)", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    const qf_vNaN = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, fanPower_W: "NaN", ventHours: 8760 });
    const qf_vEmpty = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, fanPower_W: "", ventHours: 8760 });
    expect(qf_vNaN).toBeGreaterThan(650);
    expect(qf_vEmpty).toBeGreaterThan(650);
  });

  it("Ore > 8760 (ex. 9000) respinse → default 8760 pentru sistem mecanic", () => {
    const hr80 = VENTILATION_TYPES.find(t => t.id === "MEC_HR80");
    const qf_v9000 = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, ventHours: 9000 });
    const qf_v8760 = calcVentEnergy({ ventType: hr80, airflow_m3h: 200, ventHours: 8760 });
    expect(qf_v9000).toBeCloseTo(qf_v8760, 1);
  });

  it("Gama completă VENTILATION_TYPES: SFP în interval rezonabil 0-2.5 kW/(m³/s)", () => {
    for (const vt of VENTILATION_TYPES) {
      expect(vt.sfp).toBeGreaterThanOrEqual(0);
      expect(vt.sfp).toBeLessThanOrEqual(2.5);
    }
  });

  it("HR95 (Passivhaus): SFP 1.80 × 200 m³/h × 8760 h → ~876 kWh/an", () => {
    const hr95 = VENTILATION_TYPES.find(t => t.id === "MEC_HR95");
    expect(hr95.sfp).toBe(1.80);
    const qf_v = calcVentEnergy({ ventType: hr95, airflow_m3h: 200, ventHours: 8760 });
    // P_fan = 1.80 × (200/3600) × 1000 = 100 W → 876 kWh/an
    expect(qf_v).toBeGreaterThan(840);
    expect(qf_v).toBeLessThan(910);
  });

  it("Regresie AUDIT_10 Test 3: UTA cu SFP=2.00 dă 730 kWh/an (nu 1 kWh/an)", () => {
    const uta = VENTILATION_TYPES.find(t => t.id === "UTA");
    const qf_v = calcVentEnergy({ ventType: uta, airflow_m3h: 150, ventHours: 8760 });
    // Bug anterior: qf_v ≈ 1 kWh/an (subestimare 730×)
    expect(qf_v).toBeGreaterThan(100); // regresie clară vs. bug
    expect(qf_v).toBeCloseTo(730, -1); // ±10 toleranță
  });
});
