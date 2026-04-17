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
//
// Extins Sprint 10b (17 apr 2026) — S10b a fost respins similar ca
// false-positive (cele 4 „bug-uri" din prompt erau deja fixate prin
// Sprint 1+3 commit d239d11, Sprint 4b commit 1f3a563, Sprint 11
// commit cde1163). Sentinelul acoperă acum și cele 4 contracte S10b:
//   • BUG #4 Legionella (calcLegionellaOverhead apelat din motor)
//   • BUG #5 Solar termic ACM (calcSolarACMDetailed + aplicare f_sol)
//   • BUG #6 PC ACM dedicată (acmSource === "pc" + copACM)
//   • BUG #7 Validări complete (validateACMInputs + SEVERITY)
// Vezi SPRINT_10b_acm_discovery_false_positive.md pentru istoric.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import * as heating from "../en15316-heating.js";
import {
  calcACMen15316,
  ACM_CONSUMPTION_SPECIFIC,
  T_COLD_BY_ZONE,
  DISTRIBUTION_LOSS_FACTORS,
  ACM_PUMP_W_SPECIFIC,
} from "../acm-en15316.js";
import {
  calcLegionellaOverhead,
  HIGH_RISK_CATEGORIES,
  LEGIONELLA_THRESHOLDS,
} from "../acm-legionella.js";
import { calcSolarACMDetailed } from "../solar-acm-detailed.js";
import { validateACMInputs, SEVERITY } from "../acm-validation.js";

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

// ─────────────────────────────────────────────────────────────────
// Sprint 10b — BUG #4 Legionella (HG 1425/2006 + VDI 6023)
// Protecție: dacă un sprint viitor șterge tratamentul termic din
// motor, testele cad imediat cu referință la discovery S10b.
// ─────────────────────────────────────────────────────────────────
describe("Sentinel S10b BUG #4 — Legionella apelat din motor ACM", () => {
  it("calcLegionellaOverhead exportat + constante normative", () => {
    expect(typeof calcLegionellaOverhead).toBe("function");
    expect(HIGH_RISK_CATEGORIES instanceof Set).toBe(true);
    expect(HIGH_RISK_CATEGORIES.has("SA")).toBe(true);   // spital
    expect(HIGH_RISK_CATEGORIES.has("HC")).toBe(true);   // hotel 3*
    expect(HIGH_RISK_CATEGORIES.has("GR")).toBe(true);   // grădiniță
    expect(LEGIONELLA_THRESHOLDS.storage_safe).toBe(60);
    expect(LEGIONELLA_THRESHOLDS.treatment_shock).toBe(70);
  });

  it("motor ACM raportează Q_legionella_kWh > 0 când hasLegionella=true", () => {
    const r = calcACMen15316({
      category: "HC", nPersons: 20, consumptionLevel: "med",
      tSupply: 60, climateZone: "III", acmSource: "ct_gaz",
      etaGenerator: 1.0, storageVolume_L: 500, insulationClass: "B",
      hasPipeInsulation: true, hasCirculation: true,
      hasLegionella: true, legionellaFreq: "weekly", legionellaT: 70,
    });
    expect(r.Q_legionella_kWh).toBeGreaterThan(0);
    expect(r.legionella).toBeDefined();
    expect(r.legionella.overhead_treatment_kWh).toBeGreaterThan(0);
  });

  it("motor ACM NU adaugă Q_legionella când hasLegionella=false (combi instant)", () => {
    const r = calcACMen15316({
      category: "RI", nPersons: 3, consumptionLevel: "med",
      tSupply: 55, climateZone: "III", acmSource: "ct_gaz",
      etaGenerator: 0.88, storageVolume_L: 0,   // combi instant
      hasPipeInsulation: true, hasCirculation: false,
      hasLegionella: false,
    });
    expect(r.Q_legionella_kWh).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// Sprint 10b — BUG #5 Solar termic cuplaj ACM (EN 15316-4-3)
// Protecție: dacă un sprint viitor desprinde Step 8 Regenerabile de
// motorul ACM, testul cade. Cuplajul real se face prin
// calcSolarACMDetailed → solarFraction → calcACMen15316.
// ─────────────────────────────────────────────────────────────────
describe("Sentinel S10b BUG #5 — Solar termic cuplat în motor ACM", () => {
  it("calcSolarACMDetailed exportat", () => {
    expect(typeof calcSolarACMDetailed).toBe("function");
  });

  it("solarFraction=0.50 reduce Q_gen_needed cu ~50% din Q_gen_brut", () => {
    const base = {
      category: "RI", nPersons: 4, consumptionLevel: "med",
      tSupply: 55, climateZone: "III", acmSource: "ct_gaz",
      etaGenerator: 1.0, storageVolume_L: 200, insulationClass: "B",
      hasPipeInsulation: true, hasCirculation: false,
    };
    const without = calcACMen15316({ ...base, solarFraction: 0 });
    const with50 = calcACMen15316({ ...base, solarFraction: 0.5 });
    // Q_gen_needed trebuie să scadă ~50% (toleranță rezonabilă)
    expect(with50.Q_gen_needed_kWh).toBeLessThan(without.Q_gen_needed_kWh * 0.55);
    expect(with50.Q_gen_needed_kWh).toBeGreaterThan(without.Q_gen_needed_kWh * 0.45);
    expect(with50.Q_solar_kWh).toBeGreaterThan(0);
    expect(with50.solarFraction_pct).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────
// Sprint 10b — BUG #6 PC ACM dedicată (acmSource="pc" + copACM)
// Protecție: catalogul ACM_SOURCES + branch-ul motorului pentru PC ACM.
// (Aplicarea fP_ambient Tab A.16 se face în useInstallationSummary.js
//  lines 497-504 — Sprint 11 commit cde1163.)
// ─────────────────────────────────────────────────────────────────
describe("Sentinel S10b BUG #6 — PC ACM dedicată (acmSource=pc)", () => {
  it("acmSource=pc cu COP=3.0 → Q_final ≈ Q_gen_needed / 3.0", () => {
    const r = calcACMen15316({
      category: "RI", nPersons: 4, consumptionLevel: "med",
      tSupply: 55, climateZone: "III", acmSource: "pc",
      copACM: 3.0, storageVolume_L: 200, insulationClass: "B",
      hasPipeInsulation: true, hasCirculation: false,
    });
    expect(r.eta_gen).toBeCloseTo(3.0, 1);
    expect(r.Q_final_kWh).toBeCloseTo(r.Q_gen_needed_kWh / 3.0, 0);
  });

  it("PC ACM COP 3.0 produce Q_final ~3x mai mic decât cazan gaz η=1.0", () => {
    const base = {
      category: "RI", nPersons: 4, consumptionLevel: "med",
      tSupply: 55, climateZone: "III", storageVolume_L: 200,
      insulationClass: "B", hasPipeInsulation: true, hasCirculation: false,
    };
    const gaz = calcACMen15316({ ...base, acmSource: "ct_gaz", etaGenerator: 1.0 });
    const pc  = calcACMen15316({ ...base, acmSource: "pc", copACM: 3.0 });
    expect(pc.Q_final_kWh).toBeLessThan(gaz.Q_final_kWh * 0.4);
    expect(pc.Q_final_kWh).toBeGreaterThan(gaz.Q_final_kWh * 0.3);
  });
});

// ─────────────────────────────────────────────────────────────────
// Sprint 10b — BUG #7 Validări input ACM (acm-validation.js)
// Protecție: dacă un sprint viitor șterge validări, testele cad.
// ─────────────────────────────────────────────────────────────────
describe("Sentinel S10b BUG #7 — validateACMInputs complet", () => {
  it("validateACMInputs + SEVERITY exportate", () => {
    expect(typeof validateACMInputs).toBe("function");
    expect(SEVERITY.ERROR).toBe("error");
    expect(SEVERITY.WARNING).toBe("warning");
    expect(SEVERITY.INFO).toBe("info");
  });

  it("consumers negativ → blocant (error)", () => {
    const r = validateACMInputs({ consumers: -1 }, { category: "RI" });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some(e => e.field === "consumers")).toBe(true);
  });

  it("storageVolume 15000 L → blocant (unități)", () => {
    const r = validateACMInputs({ storageVolume: 15000 }, { category: "RI" });
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("tSupply 50°C pentru spital (HIGH_RISK) → avertizare Ord. MS 1002/2015", () => {
    const r = validateACMInputs({ tSupply: 50 }, { category: "SA" });
    const hasLegionellaWarning = r.warnings.some(w =>
      /Legionella|MS 1002|EN 806/i.test(w.message) ||
      /Legionella|MS 1002|EN 806/i.test(w.reference || "")
    );
    expect(hasLegionellaWarning).toBe(true);
  });

  it("Config valid rezidențial → 0 erori (nu blochează submit)", () => {
    const r = validateACMInputs({
      consumers: 4, dailyLiters: 60, tSupply: 55,
      storageVolume: 200, insulationClass: "B",
      pipeLength: 20, pipeDiameter: 22,
    }, { category: "RI", areaUseful: 100 });
    expect(r.errors.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// Sprint 10b — regresie integrare: toate 4 bug-uri combinate
// ─────────────────────────────────────────────────────────────────
describe("Sentinel S10b — integrare Legionella + Solar + PC ACM", () => {
  it("PC ACM + solar 30% + Legionella activ → toate componentele reflectate în breakdown", () => {
    const r = calcACMen15316({
      category: "HC", nPersons: 20, consumptionLevel: "med",
      tSupply: 60, climateZone: "III",
      acmSource: "pc", copACM: 3.0,
      solarFraction: 0.30,
      storageVolume_L: 800, insulationClass: "B",
      hasPipeInsulation: true, hasCirculation: true, circHours_per_day: 16,
      circPumpType: "variabila",
      hasLegionella: true, legionellaFreq: "weekly", legionellaT: 70,
    });
    expect(r.Q_legionella_kWh).toBeGreaterThan(0);   // BUG #4
    expect(r.solarFraction_pct).toBe(30);            // BUG #5
    expect(r.eta_gen).toBeCloseTo(3.0, 1);           // BUG #6 (COP ACM)
    expect(r.Q_final_kWh).toBeGreaterThan(0);
    expect(r.W_circ_pump_kWh).toBeGreaterThan(0);    // aux pompă S3
  });
});
