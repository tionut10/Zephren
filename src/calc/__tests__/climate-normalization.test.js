// ===============================================================
// TESTE SPRINT 8 — Consum real, GZE normalizare, factor c, defalcare
// ===============================================================
// Normativ: SR 4839:2014 + Mc 001-2022 Cap. 9.2 + 9.3 + ET pct. 6.3
// ===============================================================

import { describe, it, expect } from "vitest";
import {
  calcGzeDaily,
  calcGzeMonthly,
  climaticCorrectionFactor,
  normalizeConsumption,
  calibrationFactor,
} from "../climate-normalization.js";
import {
  CLIMATE_DATA_NA_2023,
  GZE_CONVENTIONAL,
  lookupClimate,
  getGzeConventional,
  getLocalityCount,
  getReferenceStations,
  gzeFromMonthlyMeans,
} from "../../data/climate-data-na-2023.js";
import {
  kwhFromMc,
  defalcareGazSezonier,
  defalcareElectricitate,
} from "../../components/ConsumoTracker.jsx";

describe("Sprint 8 — Date climatice NA:2023", () => {
  it("Test 1: baza de date conține ≥ 41 localități (ținta NA:2023 atinsă)", () => {
    const count = getLocalityCount();
    expect(count).toBeGreaterThanOrEqual(41);
  });

  it("Test 2: include cele 9 stații de referință oficiale NA:2023", () => {
    const refs = getReferenceStations();
    // 9 stații meteo NA:2023: București, Brașov, Cluj-Napoca, Constanța,
    // Craiova, Deva, Galați, Iași, Timișoara
    expect(refs.length).toBe(9);
    expect(refs).toContain("București");
    expect(refs).toContain("Brașov");
    expect(refs).toContain("Cluj-Napoca");
    expect(refs).toContain("Constanța");
    expect(refs).toContain("Craiova");
    expect(refs).toContain("Deva");
    expect(refs).toContain("Galați");
    expect(refs).toContain("Iași");
    expect(refs).toContain("Timișoara");
  });

  it("Test 3: lookup flexibil — acceptă diacritice, spații, majuscule", () => {
    const ref = lookupClimate("București");
    expect(ref).not.toBeNull();
    expect(ref.nume).toBe("București");
    expect(ref.zona).toBe("II");
    expect(ref.isReferenceStation).toBe(true);

    // Fără diacritice
    const flat = lookupClimate("bucuresti");
    expect(flat).not.toBeNull();
    expect(flat.nume).toBe("București");

    // Cu cratimă
    const cluj = lookupClimate("Cluj-Napoca");
    expect(cluj).not.toBeNull();
    expect(cluj.zona).toBe("III");
    expect(cluj.isReferenceStation).toBe(true);
  });

  it("Test 4: GZE convențional disponibil pentru toate localitățile", () => {
    for (const [slug, data] of Object.entries(CLIMATE_DATA_NA_2023)) {
      expect(data.gzeConv).toBeGreaterThan(2000);
      expect(data.gzeConv).toBeLessThan(6000);
      expect(GZE_CONVENTIONAL[slug]).toBe(data.gzeConv);
    }
  });

  it("Test 5: getGzeConventional returnează valoare sau fallback", () => {
    expect(getGzeConventional("București")).toBeGreaterThan(2500);
    expect(getGzeConventional("LocalitateInexistentă", 3170)).toBe(3170);
  });
});

describe("Sprint 8 — Calcul GZE (Fix #1)", () => {
  it("Test 6: calcGzeDaily sumează deltele față de baza 12°C", () => {
    const days = [-5, 0, 5, 10, 12, 15, 20, 8, -2];
    // Doar zilele cu T < 12: -5, 0, 5, 10, 8, -2 → (12-(-5))+(12-0)+(12-5)+(12-10)+(12-8)+(12-(-2))
    // = 17 + 12 + 7 + 2 + 4 + 14 = 56
    expect(calcGzeDaily(days, 12)).toBe(56);
  });

  it("Test 7: calcGzeDaily ignoră valori invalide și arrays vide", () => {
    expect(calcGzeDaily([], 12)).toBe(0);
    expect(calcGzeDaily([NaN, undefined, 5], 12)).toBe(7);
    expect(calcGzeDaily(null, 12)).toBe(0);
  });

  it("Test 8: calcGzeMonthly aproximativ = 12 × medie(20-t) × zile/lună pentru București", () => {
    // București temp_month din climate.json
    const bucMonths = [-1.5, 0.5, 5.5, 11.5, 17, 20.5, 22.5, 22, 17, 11, 5, 0.5];
    const gze20 = calcGzeMonthly(bucMonths, 20);
    // Așteptat: ~3400 K·zi/an (base 20°C full year)
    expect(gze20).toBeGreaterThan(3000);
    expect(gze20).toBeLessThan(4000);
  });
});

describe("Sprint 8 — Factor corecție climatică k_clim (Fix #1)", () => {
  it("Test 9: k_clim = 1.0 când GZE_real = GZE_conv", () => {
    expect(climaticCorrectionFactor(3000, 3000)).toBe(1);
  });

  it("Test 10: k_clim > 1 când iarnă blândă (GZE_real < GZE_conv)", () => {
    // Iarnă blândă 2023-24 în București: GZE_real ≈ 2700 vs GZE_conv 3170
    const k = climaticCorrectionFactor(3170, 2700);
    expect(k).toBeCloseTo(1.174, 2);
  });

  it("Test 11: k_clim < 1 când iarnă geroasă (GZE_real > GZE_conv)", () => {
    const k = climaticCorrectionFactor(3000, 3600);
    expect(k).toBeCloseTo(0.833, 2);
  });

  it("Test 12: k_clim clamped la [0.5, 2.0] pentru robustețe", () => {
    expect(climaticCorrectionFactor(3000, 100)).toBe(2.0);   // upper clamp
    expect(climaticCorrectionFactor(1000, 5000)).toBe(0.5);  // lower clamp
    expect(climaticCorrectionFactor(3000, 0)).toBe(1);        // div-by-zero fallback
    expect(climaticCorrectionFactor(null, 3000)).toBe(1);     // missing conv
  });
});

describe("Sprint 8 — Normalizare consum (Fix #1)", () => {
  it("Test 13: consumul se normalizează cu k_clim aplicat corect", () => {
    const res = normalizeConsumption({
      consumKWh: 10000,
      gzeConventional: 3170,
      gzeReal: 2700,
    });
    expect(res.kClim).toBeCloseTo(1.174, 2);
    expect(res.consumNormalizat).toBeCloseTo(11740, -1);
    expect(res.aplicat).toBe(true);
  });

  it("Test 14: lookup automat după localitate funcționează", () => {
    const res = normalizeConsumption({
      consumKWh: 9000,
      localitate: "București",
      gzeReal: 3170, // same as conv → k=1
    });
    expect(res.gzeConventional).toBeGreaterThan(0);
    expect(res.kClim).toBeCloseTo(1.0, 2);
  });
});

describe("Sprint 8 — Factor de calibrare c (Fix #2 — Mc 001 Cap. 9.3)", () => {
  it("Test 15: c ∈ [0.8, 1.2] → status 'ok' (model calibrat)", () => {
    const res = calibrationFactor(105, 100);
    expect(res.c).toBeCloseTo(1.05, 2);
    expect(res.status).toBe("ok");
    expect(res.recomandari.length).toBe(0);
    expect(res.interpretare).toContain("calibrat");
  });

  it("Test 16: c < 0.8 → status 'supraestimare' + 4 recomandări", () => {
    const res = calibrationFactor(70, 100);
    expect(res.c).toBe(0.7);
    expect(res.status).toBe("supraestimare");
    expect(res.recomandari.length).toBeGreaterThanOrEqual(3);
    expect(res.interpretare).toContain("supraestimează");
  });

  it("Test 17: c > 1.2 → status 'subestimare' + recomandări specifice", () => {
    const res = calibrationFactor(150, 100);
    expect(res.c).toBe(1.5);
    expect(res.status).toBe("subestimare");
    expect(res.recomandari.length).toBeGreaterThanOrEqual(3);
    expect(res.interpretare).toContain("subestimează");
  });

  it("Test 18: c null / date invalide → status 'unknown'", () => {
    const r1 = calibrationFactor(100, 0);
    expect(r1.c).toBeNull();
    expect(r1.status).toBe("unknown");

    const r2 = calibrationFactor(null, 100);
    expect(r2.c).toBeNull();
  });
});

describe("Sprint 8 — Conversie lemn (Fix #4 — Mc 001 Anexa)", () => {
  it("Test 19: 1 mc lemn uscat 20% umiditate = 2880 kWh (720 kg/m³ × 4.0 kWh/kg)", () => {
    expect(kwhFromMc(1)).toBe(2880);
    expect(kwhFromMc(2.5)).toBe(7200);
    expect(kwhFromMc(0)).toBe(0);
  });

  it("Test 20: conversie respinge input invalid fără crash", () => {
    expect(kwhFromMc("abc")).toBe(0);
    expect(kwhFromMc(null)).toBe(0);
    expect(kwhFromMc(undefined)).toBe(0);
  });
});

describe("Sprint 8 — Defalcare consum (Fix #3 — Mc 001 Cap. 9.2)", () => {
  it("Test 21: metoda sezonieră Q_ACM = medie(Jul+Aug) × 12", () => {
    // Simulează 4 pers. apartament București:
    // Gaz iarna (Ian-Apr, Oct-Dec) ≈ 1200 kWh/lună
    // Gaz vara (Mai-Sep) ≈ 300 kWh/lună (doar ACM + gătit)
    // Iul, Aug: 280, 290 kWh (medie 285 kWh)
    const gazMonthly = [1200, 1100, 900, 600, 350, 300, 280, 290, 320, 500, 900, 1150];
    const res = defalcareGazSezonier(gazMonthly);

    expect(res.metoda_aplicabila).toBe(true);
    expect(res.q_acm_lunar_mediu).toBeCloseTo(285, 0);
    expect(res.q_acm_anual).toBeCloseTo(3420, 0);

    const total = gazMonthly.reduce((s, v) => s + v, 0);
    expect(res.q_heating_anual).toBeCloseTo(total - 3420, 0);
  });

  it("Test 22: fără date de vară → fallback safe, nu crack", () => {
    const gazGol = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const res = defalcareGazSezonier(gazGol);
    expect(res.metoda_aplicabila).toBe(false);
    expect(res.q_acm_anual).toBe(0);
  });

  it("Test 23: defalcare electricitate produce 3 componente însumate la total", () => {
    const elMonthly = [200, 180, 170, 160, 170, 250, 280, 270, 180, 170, 190, 210];
    // Q_lighting dat din motor Zephren = 600 kWh/an
    const res = defalcareElectricitate(elMonthly, 600);
    const total = elMonthly.reduce((s, v) => s + v, 0);

    expect(res.total).toBe(total);
    expect(res.q_iluminat).toBe(600);
    expect(res.q_racire).toBeGreaterThan(0); // vară e > iarnă → Δ pozitiv
    expect(res.q_iluminat + res.q_racire + res.q_electrocasnice).toBeCloseTo(total, 0);
  });
});

describe("Sprint 8 — Scenariu integrat (apartament București 65 m²)", () => {
  it("Test 24: clădire bine modelată → factor c ~ 1.0 ± 0.05 după normalizare", () => {
    // Scenariu AUDIT_14 §8: apartament București 65 m², bloc 1980
    // Consum real: 920 m³ gaz (PCI=9.97) + 3100 kWh elec = 9172 + 3100 = 12272 kWh
    // Iarnă blândă: GZE_real ≈ 2700, GZE_conv = 3170 → k_clim ≈ 1.174
    // Consum normalizat ≈ 14407 kWh / 65 m² ≈ 221.6 kWh/m²an
    // EP calculat Zephren ≈ 200 kWh/m²an pentru aceeași clădire
    // c = 221.6 / 200 = 1.108 → status OK

    const consumRealAnual = 920 * 9.97 + 3100; // PCI corect = 9172 + 3100 = 12272
    const norm = normalizeConsumption({
      consumKWh: consumRealAnual,
      gzeConventional: 3170,
      gzeReal: 2700,
    });
    const Au = 65;
    const EP_real_norm = norm.consumNormalizat / Au;
    const EP_calc = 200;
    const calib = calibrationFactor(EP_real_norm, EP_calc);

    expect(calib.c).toBeGreaterThan(0.8);
    expect(calib.c).toBeLessThan(1.2);
    expect(calib.status).toBe("ok");
  });
});

describe("Sprint 8 — GZE lunar helper (climate-data-na-2023)", () => {
  it("Test 25: gzeFromMonthlyMeans calculează corect suma ponderată pe zile/lună", () => {
    // 12 luni constante la 10°C, bază 12°C → delta = 2°C × 365 zile = 730 K·zi
    const constTemp = Array(12).fill(10);
    const gze = gzeFromMonthlyMeans(constTemp, 12);
    expect(gze).toBe(730);
  });

  it("Test 26: gzeFromMonthlyMeans returnează 0 dacă toate lunile > baza", () => {
    const hotTemp = Array(12).fill(25);
    expect(gzeFromMonthlyMeans(hotTemp, 12)).toBe(0);
  });

  it("Test 27: gzeFromMonthlyMeans validează input invalid", () => {
    expect(gzeFromMonthlyMeans([], 12)).toBeNull();
    expect(gzeFromMonthlyMeans([1, 2, 3], 12)).toBeNull(); // length != 12
  });
});
