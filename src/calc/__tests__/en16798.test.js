import { describe, it, expect } from "vitest";
import {
  calcIAQCategory,
  calcRequiredAirflowEN16798,
  calcThermalComfortCategory,
  calcHumidityComfort,
  calcOverallIEQCategory,
  CO2_CATEGORIES,
  AIR_RATES_NONRES,
  AIR_RATES_RES,
  OPERATIVE_TEMP,
  HUMIDITY_RANGE,
  PMV_PPD_LIMITS,
} from "../en16798.js";

// ═══════════════════════════════════════════════════════════════════════════
// calcIAQCategory — Table B.1 (CO₂ delta thresholds)
// ═══════════════════════════════════════════════════════════════════════════
describe("calcIAQCategory — CO₂ category thresholds (EN 16798-1 Table B.1)", () => {
  it("CO₂ = 850 ppm (ext 420) → delta 430 → categoria I (≤550)", () => {
    const r = calcIAQCategory(850, 420);
    expect(r.category).toBe("I");
    expect(r.delta).toBe(430);
  });

  it("CO₂ = 1100 ppm (ext 420) → delta 680 → categoria II (≤800)", () => {
    expect(calcIAQCategory(1100, 420).category).toBe("II");
  });

  it("CO₂ = 1600 ppm (ext 420) → delta 1180 → categoria III (≤1350)", () => {
    expect(calcIAQCategory(1600, 420).category).toBe("III");
  });

  it("CO₂ = 2500 ppm (ext 420) → delta 2080 → categoria IV (>1350)", () => {
    expect(calcIAQCategory(2500, 420).category).toBe("IV");
  });

  it("Pentru CO₂ invalid (0 sau negativ) → cat IV cu mesaj eroare", () => {
    const r = calcIAQCategory(0);
    expect(r.category).toBe("IV");
    expect(r.description).toContain("invalid");
  });

  it("Default CO₂ exterior = 420 ppm", () => {
    const r1 = calcIAQCategory(800);
    const r2 = calcIAQCategory(800, 420);
    expect(r1.delta).toBe(r2.delta);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcRequiredAirflowEN16798 — Table B.2 (non-res) + B.3 (res)
// ═══════════════════════════════════════════════════════════════════════════
describe("calcRequiredAirflowEN16798 — debit ventilare (Tables B.2/B.3)", () => {
  it("Rezidențial categoria II, 100m² + 4 pers → debit compozit", () => {
    const r = calcRequiredAirflowEN16798({
      category: "II", buildingType: "residential",
      areaUseful_m2: 100, nOccupants: 4,
    });
    // 5 L/s × 4 + 0.42 L/s/m² × 100 = 20 + 42 = 62 L/s
    expect(r.byPerson).toBe(20);
    expect(r.byArea).toBe(42);
    expect(r.airflow_L_s).toBeCloseTo(62, 1);
    expect(r.airflow_m3_h).toBeCloseTo(62 * 3.6, 1);
  });

  it("Rezidențial cat. II cu 0 ocupanți → doar per-area + minim", () => {
    const r = calcRequiredAirflowEN16798({
      category: "II", buildingType: "residential",
      areaUseful_m2: 50, nOccupants: 0,
    });
    // max(0 + 0.42*50, 0.42*50) = 21 L/s
    expect(r.airflow_L_s).toBeGreaterThanOrEqual(21);
  });

  it("Non-rezidențial birouri cat. II, 200m² + 20 pers, low-polluting", () => {
    const r = calcRequiredAirflowEN16798({
      category: "II", buildingType: "nonresidential",
      areaUseful_m2: 200, nOccupants: 20, lowPolluting: true,
    });
    // 7 L/s × 20 + 0.7 L/s/m² × 200 = 140 + 140 = 280 L/s (factor 1.0)
    expect(r.byPerson).toBe(140);
    expect(r.byArea).toBe(140);
    expect(r.airflow_L_s).toBeCloseTo(280, 1);
  });

  it("Non-rezidențial HIGH-polluting → multiplicare ×1.5", () => {
    const low = calcRequiredAirflowEN16798({
      category: "II", buildingType: "nonresidential",
      areaUseful_m2: 200, nOccupants: 20, lowPolluting: true,
    });
    const high = calcRequiredAirflowEN16798({
      category: "II", buildingType: "nonresidential",
      areaUseful_m2: 200, nOccupants: 20, lowPolluting: false,
    });
    expect(high.airflow_L_s).toBeCloseTo(low.airflow_L_s * 1.5, 1);
  });

  it("Categoria I (excelent) > Categoria III (acceptabil) — debit mai mare", () => {
    const catI = calcRequiredAirflowEN16798({
      category: "I", buildingType: "residential",
      areaUseful_m2: 100, nOccupants: 4,
    });
    const catIII = calcRequiredAirflowEN16798({
      category: "III", buildingType: "residential",
      areaUseful_m2: 100, nOccupants: 4,
    });
    expect(catI.airflow_L_s).toBeGreaterThan(catIII.airflow_L_s);
  });

  it("ACH calculat corect pentru volum 100×2.7 = 270 m³", () => {
    const r = calcRequiredAirflowEN16798({
      category: "II", buildingType: "residential",
      areaUseful_m2: 100, nOccupants: 4,
    });
    // 62 L/s × 3.6 = 223.2 m³/h / 270 m³ ≈ 0.83 /h
    expect(r.ach).toBeCloseTo(0.83, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcThermalComfortCategory — Table B.6 (PMV/PPD)
// ═══════════════════════════════════════════════════════════════════════════
describe("calcThermalComfortCategory — PMV/PPD (Table B.6)", () => {
  it("PMV 0, PPD 5% → categoria I", () => {
    const r = calcThermalComfortCategory(0, 5);
    expect(r.category).toBe("I");
    expect(r.pmvOk).toBe(true);
    expect(r.ppdOk).toBe(true);
  });

  it("PMV -0.4, PPD 9% → categoria II", () => {
    expect(calcThermalComfortCategory(-0.4, 9).category).toBe("II");
  });

  it("PMV 0.6, PPD 13% → categoria III", () => {
    expect(calcThermalComfortCategory(0.6, 13).category).toBe("III");
  });

  it("PMV 1.2, PPD 30% → categoria IV (sub standard)", () => {
    const r = calcThermalComfortCategory(1.2, 30);
    expect(r.category).toBe("IV");
    expect(r.pmvOk).toBe(false);
  });

  it("Date invalide → cat IV cu mesaj", () => {
    expect(calcThermalComfortCategory(NaN, 10).category).toBe("IV");
    expect(calcThermalComfortCategory(0, undefined).category).toBe("IV");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcHumidityComfort — Table B.5
// ═══════════════════════════════════════════════════════════════════════════
describe("calcHumidityComfort — range umiditate (Table B.5)", () => {
  it("RH 40%, cat II → OK (range 25-60%)", () => {
    const r = calcHumidityComfort(40, "II");
    expect(r.ok).toBe(true);
  });

  it("RH 15%, cat I → fail (prea uscat)", () => {
    const r = calcHumidityComfort(15, "I");
    expect(r.ok).toBe(false);
    expect(r.recommendation).toContain("uscat");
  });

  it("RH 80%, cat II → fail (prea umed)", () => {
    const r = calcHumidityComfort(80, "II");
    expect(r.ok).toBe(false);
    expect(r.recommendation).toContain("umed");
  });

  it("Cat I are range mai strâns (30-50%) decât cat III (20-70%)", () => {
    const r1 = calcHumidityComfort(25, "I"); // sub 30
    const r3 = calcHumidityComfort(25, "III"); // în 20-70
    expect(r1.ok).toBe(false);
    expect(r3.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcOverallIEQCategory — principle worst-of
// ═══════════════════════════════════════════════════════════════════════════
describe("calcOverallIEQCategory — IEQ global = min(subsystems)", () => {
  it("IAQ=I, thermal=I, humidity OK cat I → overall I", () => {
    const r = calcOverallIEQCategory({
      iaqCategory: "I", thermalCategory: "I",
      humidityOk: true, humidityCategory: "I",
    });
    expect(r.category).toBe("I");
    expect(r.overallScore).toBe(100);
  });

  it("IAQ=I, thermal=III → overall III", () => {
    const r = calcOverallIEQCategory({
      iaqCategory: "I", thermalCategory: "III", humidityOk: true, humidityCategory: "I",
    });
    expect(r.category).toBe("III");
  });

  it("Humidity fail → overall IV indiferent de restul", () => {
    const r = calcOverallIEQCategory({
      iaqCategory: "I", thermalCategory: "I",
      humidityOk: false, humidityCategory: "I",
    });
    expect(r.category).toBe("IV");
    expect(r.breakdown.humidity).toBe("fail");
  });

  it("overallScore: cat I=100, cat II=67, cat III=33, cat IV=0", () => {
    const s1 = calcOverallIEQCategory({ iaqCategory: "I", thermalCategory: "I", humidityOk: true, humidityCategory: "I" }).overallScore;
    const s2 = calcOverallIEQCategory({ iaqCategory: "II", thermalCategory: "II", humidityOk: true, humidityCategory: "II" }).overallScore;
    const s3 = calcOverallIEQCategory({ iaqCategory: "III", thermalCategory: "III", humidityOk: true, humidityCategory: "III" }).overallScore;
    const s4 = calcOverallIEQCategory({ iaqCategory: "IV", thermalCategory: "IV", humidityOk: true, humidityCategory: "IV" }).overallScore;
    expect(s1).toBe(100);
    expect(s2).toBe(67);
    expect(s3).toBe(33);
    expect(s4).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tabele exportate — verificare completeness
// ═══════════════════════════════════════════════════════════════════════════
describe("EN 16798 tables — structură completă 4 categorii", () => {
  it("CO2_CATEGORIES conține I, II, III, IV cu deltaMax monoton", () => {
    expect(CO2_CATEGORIES.I.deltaMax).toBeLessThan(CO2_CATEGORIES.II.deltaMax);
    expect(CO2_CATEGORIES.II.deltaMax).toBeLessThan(CO2_CATEGORIES.III.deltaMax);
    expect(CO2_CATEGORIES.III.deltaMax).toBeLessThan(CO2_CATEGORIES.IV.deltaMax);
  });

  it("AIR_RATES cu rate descrescător I → IV", () => {
    expect(AIR_RATES_NONRES.I.perPerson).toBeGreaterThan(AIR_RATES_NONRES.II.perPerson);
    expect(AIR_RATES_NONRES.II.perPerson).toBeGreaterThan(AIR_RATES_NONRES.III.perPerson);
    expect(AIR_RATES_RES.I.perPerson_L_s).toBeGreaterThan(AIR_RATES_RES.III.perPerson_L_s);
  });

  it("PMV_PPD_LIMITS are range simetric pentru pmv", () => {
    for (const cat of ["I", "II", "III", "IV"]) {
      const lim = PMV_PPD_LIMITS[cat];
      expect(Math.abs(lim.pmvMin)).toBeCloseTo(lim.pmvMax);
    }
  });

  it("HUMIDITY_RANGE este coerent (min < max)", () => {
    for (const cat of ["I", "II", "III", "IV"]) {
      expect(HUMIDITY_RANGE[cat].rhMin).toBeLessThan(HUMIDITY_RANGE[cat].rhMax);
    }
  });
});
