// ═══════════════════════════════════════════════════════════════
// REGRESSION SENTINEL — barieră permanentă contra modificărilor
// accidentale pe motoare core (încălzire + ACM).
//
// Scopul: dacă un Sprint viitor „unifică motoare" sau „șterge
// duplicate" și atinge fișiere care NU au legătură cu scopul
// declarat, acest test cade imediat cu un mesaj clar.
//
// Adăugat în locul Sprint 10a (17 apr 2026) — S10a a fost respins
// după discovery ca false-positive (motorul ACM era deja unificat
// în Sprint 1 commit d239d11). Vezi SPRINT_10a_discovery_acm_engines.md
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import * as heating from "../en15316-heating.js";
import {
  calcACMen15316,
  ACM_CONSUMPTION_SPECIFIC,
  T_COLD_BY_ZONE,
  DISTRIBUTION_LOSS_FACTORS,
} from "../acm-en15316.js";

describe("Sentinel en15316-heating.js — API stabil ÎNCĂLZIRE", () => {
  it("exportă toate cele 9 funcții publice de încălzire", () => {
    expect(typeof heating.calcEmissionLoss).toBe("function");
    expect(typeof heating.calcDistributionLoss).toBe("function");
    expect(typeof heating.calcBoilerGeneration).toBe("function");
    expect(typeof heating.calcHeatPumpGeneration).toBe("function");
    expect(typeof heating.calcCHPGeneration).toBe("function");
    expect(typeof heating.calcDistrictHeating).toBe("function");
    expect(typeof heating.calcElectricHeating).toBe("function");
    expect(typeof heating.calcThermalStorage).toBe("function");
    expect(typeof heating.calcFullHeatingSystem).toBe("function");
  });

  it("exportă catalogurile normative cheie (constante EN 15316)", () => {
    expect(heating.BOILER_EFFICIENCY?.condensare?.eta_nom).toBeCloseTo(0.97, 2);
    expect(heating.HEAT_PUMP_PERFORMANCE?.aer_apa?.scop).toBeCloseTo(3.2, 1);
    expect(heating.CHP_PERFORMANCE?.micro_gaz?.eta_el).toBeCloseTo(0.30, 2);
    expect(heating.DH_NETWORK_LOSSES?.standard?.f_loss).toBeCloseTo(0.15, 2);
    expect(heating.ELECTRIC_HEATING?.convector_electric?.eta).toBeCloseTo(1.00, 2);
    expect(heating.EMISSION_EFFICIENCY?.pardoseala?.eta).toBeCloseTo(0.96, 2);
  });

  it("calcBoilerGeneration: cazan condensare produce Q_fuel ≈ Q_dist/η + standby", () => {
    const r = heating.calcBoilerGeneration(10000, { boilerType: "condensare" });
    expect(r).not.toBeNull();
    expect(r.Q_fuel_kWh).toBeGreaterThan(10000);
    expect(r.Q_fuel_kWh).toBeLessThan(11500);
    expect(r.eta_average).toBeGreaterThan(0.95);
  });

  it("calcElectricHeating: convector electric η=1.00 → W = Q_dist", () => {
    const r = heating.calcElectricHeating(5000, "convector_electric");
    expect(r.W_electric_kWh).toBe(5000);
    expect(r.eta).toBe(1.00);
  });

  it("calcDistrictHeating: rețea standard are pierderi ≈ 15%", () => {
    const r = heating.calcDistrictHeating(10000);
    expect(r.network_loss_pct).toBe(15);
    expect(r.Q_delivered_kWh).toBeGreaterThan(11000);
  });

  it("calcFullHeatingSystem: integrator ÎNCĂLZIRE returnează subsisteme + eta_global", () => {
    const r = heating.calcFullHeatingSystem(8000, {});
    expect(r).not.toBeNull();
    expect(r.emission).toBeDefined();
    expect(r.distribution).toBeDefined();
    expect(r.generation).toBeDefined();
    expect(r.eta_global).toBeGreaterThan(0);
    expect(r.eta_global).toBeLessThanOrEqual(1.0);
  });
});

describe("Sentinel acm-en15316.js — motor ACM canonical intact", () => {
  it("exportă motorul unic + cataloagele", () => {
    expect(typeof calcACMen15316).toBe("function");
    expect(typeof ACM_CONSUMPTION_SPECIFIC).toBe("object");
    expect(typeof T_COLD_BY_ZONE).toBe("object");
    expect(typeof DISTRIBUTION_LOSS_FACTORS).toBe("object");
  });

  it("ACM_CONSUMPTION_SPECIFIC are ≥ 45 categorii (Sprint 4a)", () => {
    const n = Object.keys(ACM_CONSUMPTION_SPECIFIC).length;
    expect(n).toBeGreaterThanOrEqual(45);
    // Categorii esențiale care nu trebuie șterse
    expect(ACM_CONSUMPTION_SPECIFIC.RI).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.SA).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.HC).toBeDefined();
    expect(ACM_CONSUMPTION_SPECIFIC.DZ).toBeDefined(); // dializă — adăugat S4a
    expect(ACM_CONSUMPTION_SPECIFIC.GR).toBeDefined(); // grădiniță — adăugat S4a
  });

  it("formula canonical Q_nd: 4 pers × 60 L × 1.163 × 45K × 365 ≈ 4.590 kWh/an", () => {
    const r = calcACMen15316({
      category: "RI",
      nPersons: 4,
      consumptionLevel: "med", // 60 L
      tSupply: 55,
      climateZone: "III",      // tCold = 10°C
      acmSource: "ct_gaz",
      etaGenerator: 1.0,       // izolez de randament pentru verificare formulă
      storageVolume_L: 0,      // fără stocare
      hasPipeInsulation: true,
      hasCirculation: false,
    });
    expect(r).not.toBeNull();
    expect(r.Q_nd_annual_kWh).toBeGreaterThan(4400);
    expect(r.Q_nd_annual_kWh).toBeLessThan(4800);
  });
});
