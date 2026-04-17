// ═══════════════════════════════════════════════════════════════
// TESTE Sprint 9b — RĂCIRE PARTEA 2 (17 apr 2026)
// Verifică:
//   - INTERNAL_GAINS_PROFILES (6 categorii × weekday/weekend × 24h)
//   - Integrare profil extins în calcCoolingHourly (meta.gainsProfileExtended)
//   - Modulul nou src/calc/free-cooling.js (API EN 16798-9)
//   - FREE_COOLING_DEFAULTS_BY_CATEGORY (birouri/școli ON, rezidențial OFF)
//   - Cap 40% EN 16798-9 pe reducere Q_NC
// Branch: sprint-09b-racire-fix
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  INTERNAL_GAINS_PROFILES,
  COOLING_TYPE_TO_GAINS_PROFILE,
} from "../../data/constants.js";
import { calcCoolingHourly } from "../cooling-hourly.js";
import {
  calcFreeCoolingBenefit,
  quickFreeCoolingEstimate,
  getFreeCoolingDefault,
  FREE_COOLING_DEFAULTS_BY_CATEGORY,
} from "../free-cooling.js";

// ─────────────────────────────────────────────────────────────────
// BUG #7 — INTERNAL_GAINS_PROFILES (6 categorii weekday/weekend)
// ─────────────────────────────────────────────────────────────────

describe("Sprint 9b Bug #7 — INTERNAL_GAINS_PROFILES (ISO 52016-1 Anexa A.30)", () => {
  it("Test 1 — conține exact 6 categorii clădire cu weekday + weekend 24h", () => {
    const expected = ["rezidential", "birouri", "scoli", "comercial", "hotel", "spitale"];
    for (const cat of expected) {
      expect(INTERNAL_GAINS_PROFILES[cat]).toBeDefined();
      expect(INTERNAL_GAINS_PROFILES[cat].weekday).toHaveLength(24);
      expect(INTERNAL_GAINS_PROFILES[cat].weekend).toHaveLength(24);
      // Toate valorile ∈ [0, 1]
      INTERNAL_GAINS_PROFILES[cat].weekday.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.0);
      });
    }
  });

  it("Test 2 — Birouri weekday peak la 14:00 (maxim în timpul programului)", () => {
    const p = INTERNAL_GAINS_PROFILES.birouri.weekday;
    const peakHour = p.indexOf(Math.max(...p));
    expect([9, 10, 11, 13, 14, 15]).toContain(peakHour); // în fereastra de muncă
    expect(p[14]).toBe(1.0);  // ora 14 maxim
    expect(p[3]).toBeLessThanOrEqual(0.1);   // noapte minim
    // Weekend vs. weekday diferă substanțial (birouri goale)
    const weekendAvg = INTERNAL_GAINS_PROFILES.birouri.weekend.reduce((a,b)=>a+b,0)/24;
    const weekdayAvg = p.reduce((a,b)=>a+b,0)/24;
    expect(weekendAvg).toBeLessThan(weekdayAvg * 0.5); // weekend < 50% weekday
  });

  it("Test 3 — Spitale 24/24: toate valorile ≥ 0.7", () => {
    const wd = INTERNAL_GAINS_PROFILES.spitale.weekday;
    const we = INTERNAL_GAINS_PROFILES.spitale.weekend;
    wd.forEach(v => expect(v).toBeGreaterThanOrEqual(0.7));
    we.forEach(v => expect(v).toBeGreaterThanOrEqual(0.7));
  });

  it("Test 4 — Rezidențial: peak seara (18-20), nu dimineața", () => {
    const p = INTERNAL_GAINS_PROFILES.rezidential.weekday;
    const maxVal = Math.max(...p);
    const peakHour = p.indexOf(maxVal);
    expect([17, 18, 19, 20]).toContain(peakHour); // seara
    expect(p[18]).toBe(1.0);
    // Prânz mai puțin ocupat decât seara
    expect(p[12]).toBeLessThan(p[18]);
  });

  it("Test 5 — COOLING_TYPE_TO_GAINS_PROFILE mapează corect engleza → română", () => {
    expect(COOLING_TYPE_TO_GAINS_PROFILE.office).toBe("birouri");
    expect(COOLING_TYPE_TO_GAINS_PROFILE.school).toBe("scoli");
    expect(COOLING_TYPE_TO_GAINS_PROFILE.residential).toBe("rezidential");
    expect(COOLING_TYPE_TO_GAINS_PROFILE.retail).toBe("comercial");
    expect(COOLING_TYPE_TO_GAINS_PROFILE.hospital).toBe("spitale");
  });

  it("Test 6 — calcCoolingHourly raportează meta.gainsProfileExtended=true pentru office", () => {
    const r = calcCoolingHourly({
      Au: 200, V: 600,
      glazingElements: [{ area: 8, orientation: "S", g: 0.6, u: 1.8 }],
      opaqueElements:  [{ area: 20, type: "PE", u: 0.8 }],
      climate: { temp_month: [-3,-1,5,12,18,22,24,24,19,12,5,-1] },
      internalGainsType: "office",
    });
    expect(r.meta.gainsProfileExtended).toBe(true);
    expect(r.meta.gainsProfileKey).toBe("birouri");
    expect(r.Q_annual_kWh).toBeGreaterThan(0);
    expect(r.peak_kW).toBeGreaterThan(0);
  });

  it("Test 7 — peak birouri în jurul orei 14 (ora de calcul design)", () => {
    const r = calcCoolingHourly({
      Au: 200, V: 600,
      glazingElements: [{ area: 12, orientation: "S", g: 0.6, u: 1.8 }],
      opaqueElements:  [{ area: 30, type: "PE", u: 0.8 }],
      climate: { temp_month: [-3,-1,5,12,18,22,24,24,19,12,5,-1] },
      internalGainsType: "office",
    });
    // Peak tipic birouri: ora 12-15 (soare înalt + ocupare maximă + aer cald)
    expect(r.peak_hour).toBeGreaterThanOrEqual(9);
    expect(r.peak_hour).toBeLessThanOrEqual(16);
  });
});

// ─────────────────────────────────────────────────────────────────
// BUG #5 — free-cooling.js modul nou (EN 16798-9)
// ─────────────────────────────────────────────────────────────────

describe("Sprint 9b Bug #5 — modul free-cooling.js (EN 16798-9)", () => {
  it("Test 8 — calcFreeCoolingBenefit fezabil (București vară → reducere >0)", () => {
    const r = calcFreeCoolingBenefit({
      Q_NC_raw: 5000,
      Au: 500, V: 1500,
      n_night: 2.0,
      theta_int_day: 26,
      theta_ext_night_avg: 20,    // (24+24)/2 - 4 = 20 → ΔT = 6K fezabil
      HDD_cool: 150,
      days_cooling_season: 120,
      comfortCategory: "II",
      thermalMass: 165,
    });
    expect(r.feasible).toBe(true);
    expect(r.Q_avoided).toBeGreaterThan(0);
    expect(r.reduction_pct).toBeGreaterThan(0);
    expect(r.details.Q_NC_before).toBe(5000);
    expect(r.details.Q_NC_after).toBeLessThan(r.details.Q_NC_before);
    expect(r.reference).toContain("16798-9");
  });

  it("Test 9 — cap 40% aplicat când Q_free raw depășește 40% Q_NC", () => {
    // Scenariu: hală mare cu potențial night-vent foarte mare
    const r = calcFreeCoolingBenefit({
      Q_NC_raw: 2000,           // relativ mic
      Au: 1000, V: 6000,        // volum mare → debit nocturn mare
      n_night: 5.0,             // rată foarte mare
      theta_int_day: 26,
      theta_ext_night_avg: 15,  // noapte rece
      HDD_cool: 150,
      days_cooling_season: 120,
      comfortCategory: "IV",
      thermalMass: 260,         // masă termică mare (zidărie portantă)
      cap: 0.40,
    });
    expect(r.feasible).toBe(true);
    // Q_avoided NU poate depăși 40% × 2000 = 800 kWh
    expect(r.Q_avoided).toBeLessThanOrEqual(800);
    expect(r.details.cap_applied).toBe(true);
  });

  it("Test 10 — Q_NC_raw=0 → Q_avoided=0 (sanity)", () => {
    const r = calcFreeCoolingBenefit({
      Q_NC_raw: 0,
      Au: 100, V: 250,
      n_night: 2.0,
      theta_int_day: 26,
      theta_ext_night_avg: 18,
    });
    expect(r.Q_avoided).toBe(0);
    expect(r.reduction_pct).toBe(0);
  });

  it("Test 11 — quickFreeCoolingEstimate returnează același Q_avoided ca API extins", () => {
    const params = {
      Q_NC_raw: 3000,
      Au: 300, V: 900,
      n_night: 2.0,
      theta_ext_night_avg: 20,
      comfortCategory: "II",
      thermalMass: 165,
    };
    const full = calcFreeCoolingBenefit(params);
    const quick = quickFreeCoolingEstimate(params);
    expect(quick).toBe(full.Q_avoided);
  });
});

// ─────────────────────────────────────────────────────────────────
// Defaults categorie clădire
// ─────────────────────────────────────────────────────────────────

describe("Sprint 9b — FREE_COOLING_DEFAULTS_BY_CATEGORY", () => {
  it("Test 12 — Birouri/școli ON default, rezidențial/spitale OFF default", () => {
    // Clădiri diurne (ocupare 8-18) → ON
    expect(getFreeCoolingDefault("BI").enabled).toBe(true);
    expect(getFreeCoolingDefault("SC").enabled).toBe(true);
    expect(getFreeCoolingDefault("ED").enabled).toBe(true);
    expect(getFreeCoolingDefault("AD").enabled).toBe(true);
    expect(getFreeCoolingDefault("CO").enabled).toBe(true);

    // Clădiri nocturne (ocupare 24/24 sau seara) → OFF
    expect(getFreeCoolingDefault("RI").enabled).toBe(false);
    expect(getFreeCoolingDefault("RC").enabled).toBe(false);
    expect(getFreeCoolingDefault("SA").enabled).toBe(false);
    expect(getFreeCoolingDefault("HC").enabled).toBe(false);
    expect(getFreeCoolingDefault("SP").enabled).toBe(false);
    expect(getFreeCoolingDefault("AL").enabled).toBe(false);
  });

  it("Test 13 — Categorie necunoscută → enabled=true (fallback safe)", () => {
    const r = getFreeCoolingDefault("ZZZ_INEXISTENT");
    expect(r.enabled).toBe(true);
    expect(r.reason).toBeTruthy();
  });

  it("Test 14 — FREE_COOLING_DEFAULTS_BY_CATEGORY acoperă toate categoriile CPE principale", () => {
    const required = ["RI", "RC", "RA", "BI", "AD", "SC", "ED", "CO", "SA", "HC", "SP", "AL"];
    required.forEach(cat => {
      expect(FREE_COOLING_DEFAULTS_BY_CATEGORY[cat]).toBeDefined();
      expect(typeof FREE_COOLING_DEFAULTS_BY_CATEGORY[cat].enabled).toBe("boolean");
      expect(FREE_COOLING_DEFAULTS_BY_CATEGORY[cat].reason).toBeTruthy();
    });
  });
});
