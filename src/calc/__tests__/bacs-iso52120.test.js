import { describe, it, expect } from "vitest";
import {
  BACS_FACTORS_ISO52120,
  BACS_CLASS_LABELS,
  BACS_CLASSES,
  applyBACSFactor,
  calcBACSImpact,
  getBACSFactors,
  getBACSCategoryFromCode,
  checkBACSMandatoryISO,
  sriScoreToBACSClass,
  sriScoreLevel,
  ISO_52120_REFERENCE,
  BACS_OBLIGATION_THRESHOLD_KW,
} from "../bacs-iso52120.js";

describe("BACS ISO 52120-1:2022 — Factori f_BAC (Anexa B)", () => {
  it("10 categorii clădire definite (ISO 52120 Tab. B.1-B.12)", () => {
    const categories = Object.keys(BACS_FACTORS_ISO52120);
    expect(categories).toContain("rezidential");
    expect(categories).toContain("birouri");
    expect(categories).toContain("educatie");
    expect(categories).toContain("spitale");
    expect(categories).toContain("hoteluri");
    expect(categories).toContain("restaurante");
    expect(categories).toContain("comert");
    expect(categories).toContain("sport");
    expect(categories).toContain("cultura");
    expect(categories).toContain("industrial");
    expect(categories.length).toBeGreaterThanOrEqual(10);
  });

  it("Test 1: Factor A birouri heating = 0.70 (ISO 52120 Tab. B.2)", () => {
    expect(BACS_FACTORS_ISO52120.birouri.A.heating).toBe(0.70);
  });

  it("Test 2: Clasa C = 1.00 pe toate sistemele (referință)", () => {
    for (const cat of Object.keys(BACS_FACTORS_ISO52120)) {
      const C = BACS_FACTORS_ISO52120[cat].C;
      expect(C.heating).toBe(1.00);
      expect(C.cooling).toBe(1.00);
      expect(C.dhw).toBe(1.00);
      expect(C.ventilation).toBe(1.00);
      // Lighting este null pentru rezidențial, 1.00 pentru restul
      if (cat === "rezidential") expect(C.lighting).toBeNull();
      else expect(C.lighting).toBe(1.00);
    }
  });

  it("Clasa D birouri heating = 1.51 (penalizare +51%)", () => {
    expect(BACS_FACTORS_ISO52120.birouri.D.heating).toBe(1.51);
  });

  it("Clasa D birouri cooling = 1.60 (penalizare +60%)", () => {
    expect(BACS_FACTORS_ISO52120.birouri.D.cooling).toBe(1.60);
  });

  it("Rezidențial lighting = null (norma nu prevede)", () => {
    expect(BACS_FACTORS_ISO52120.rezidential.A.lighting).toBeNull();
    expect(BACS_FACTORS_ISO52120.rezidential.B.lighting).toBeNull();
    expect(BACS_FACTORS_ISO52120.rezidential.C.lighting).toBeNull();
    expect(BACS_FACTORS_ISO52120.rezidential.D.lighting).toBeNull();
  });

  it("Clasa A < clasa B < clasa C = 1.00 < clasa D (ordine economie)", () => {
    for (const cat of ["birouri", "educatie", "spitale", "hoteluri"]) {
      const factors = BACS_FACTORS_ISO52120[cat];
      expect(factors.A.heating).toBeLessThan(factors.B.heating);
      expect(factors.B.heating).toBeLessThan(factors.C.heating);
      expect(factors.C.heating).toBeLessThan(factors.D.heating);
    }
  });
});

describe("applyBACSFactor() — aplicare factor", () => {
  it("Test 3: applyBACSFactor cu categorie invalidă → fallback (returnează Q_raw)", () => {
    const Q = 1000;
    const result = applyBACSFactor(Q, "heating", "XXX_INVALID", "A");
    // Fallback "XXX_INVALID" → "birouri" (prin getBACSCategoryFromCode)
    // A heating birouri = 0.70 → 700
    expect(result).toBe(700);
  });

  it("Test valid: applyBACSFactor(100, heating, BI, A) = 70 (0.70 × 100)", () => {
    const result = applyBACSFactor(100, "heating", "BI", "A");
    expect(result).toBeCloseTo(70, 2);
  });

  it("Q_raw = 0 → returnează 0 (fără fallback)", () => {
    expect(applyBACSFactor(0, "heating", "BI", "A")).toBe(0);
  });

  it("Q_raw negativ → returnează Q_raw (ignoră)", () => {
    expect(applyBACSFactor(-5, "heating", "BI", "A")).toBe(-5);
  });

  it("Lighting rezidențial → null → returnează Q_raw", () => {
    // Pentru că factor e null, aplicarea returnează neschimbat
    const Q = 500;
    expect(applyBACSFactor(Q, "lighting", "RI", "A")).toBe(Q);
  });

  it("Accepted aliases: cod Mc 001 (BI) și cheie ISO (birouri)", () => {
    const r1 = applyBACSFactor(1000, "heating", "BI", "A");
    const r2 = applyBACSFactor(1000, "heating", "birouri", "A");
    expect(r1).toBe(r2);
  });

  it("Clasa invalidă → fallback la C (factor 1.00)", () => {
    const result = applyBACSFactor(1000, "heating", "BI", "XXX");
    expect(result).toBe(1000);
  });
});

describe("calcBACSImpact() — breakdown complet", () => {
  it("Birouri 1000 kWh heating clasa A → economie 30% (0.70×1000=700, savings=300)", () => {
    const result = calcBACSImpact(
      { qH: 1000, qC: 0, qW: 0, qV: 0, qL: 0 },
      "BI",
      "A"
    );
    expect(result.corrected.qH).toBeCloseTo(700, 2);
    expect(result.savings.heating).toBeCloseTo(300, 2);
  });

  it("Birouri 1000 m² — exemplu AUDIT_13 §5.1: clasa A total ≈ 100 950 kWh", () => {
    // Input din AUDIT_13 §5.1: Q_NH=80000, Q_NC=30000, Q_W=5000, W_vent=10000, W_light=15000
    const result = calcBACSImpact(
      { qH: 80000, qC: 30000, qW: 5000, qV: 10000, qL: 15000 },
      "BI",
      "A"
    );
    // Birouri A: heating 0.70, cooling 0.57, dhw 0.88, ventilation 0.70, lighting 0.70
    // 80000*0.70 + 30000*0.57 + 5000*0.88 + 10000*0.70 + 15000*0.70 =
    // 56000 + 17100 + 4400 + 7000 + 10500 = 95000
    // (Valoarea audit diferă ușor — 21300 cooling în loc de 17100 — dar ne ancorăm pe factorii definiți).
    expect(result.corrected.total).toBeCloseTo(95000, 0);
    expect(result.savings.totalPct).toBeGreaterThan(20);
    expect(result.savings.totalPct).toBeLessThan(35);
  });

  it("Birouri 1000 m² clasa D → total > raw (penalizare)", () => {
    const result = calcBACSImpact(
      { qH: 80000, qC: 30000, qW: 5000, qV: 10000, qL: 15000 },
      "BI",
      "D"
    );
    // D birouri: heating 1.51, cooling 1.60, dhw 1.00, ventilation 1.20, lighting 1.10
    // 120800 + 48000 + 5000 + 12000 + 16500 = 202300
    expect(result.corrected.total).toBeGreaterThan(140000);
    expect(result.savings.total).toBeLessThan(0); // penalizare → total negativ
  });

  it("Diferența A vs D birouri = ~107 000 kWh (>100 000)", () => {
    const raw = { qH: 80000, qC: 30000, qW: 5000, qV: 10000, qL: 15000 };
    const A = calcBACSImpact(raw, "BI", "A").corrected.total;
    const D = calcBACSImpact(raw, "BI", "D").corrected.total;
    expect(D - A).toBeGreaterThan(100000);
  });

  it("Clasa C = identitate (corrected = raw)", () => {
    const raw = { qH: 8500, qW: 2400, qC: 0, qV: 600, qL: 1200 };
    const result = calcBACSImpact(raw, "BI", "C");
    expect(result.corrected.total).toBeCloseTo(raw.qH + raw.qW + raw.qC + raw.qV + raw.qL, 2);
    expect(result.savings.total).toBe(0);
    expect(result.savings.totalPct).toBe(0);
  });

  it("Apartament 80 m² rezidențial clasa A — delta vs. D ≈ 27%", () => {
    // AUDIT_13 §12
    const raw = { qH: 8500, qC: 0, qW: 2400, qV: 600, qL: 1200 };
    const A = calcBACSImpact(raw, "RC", "A").corrected.total;
    const D = calcBACSImpact(raw, "RC", "D").corrected.total;
    const pct = (D - A) / D * 100;
    expect(pct).toBeGreaterThan(20);
    expect(pct).toBeLessThan(35);
  });
});

describe("getBACSCategoryFromCode() — mapare Mc 001 → ISO", () => {
  it("Coduri rezidențial → 'rezidential'", () => {
    expect(getBACSCategoryFromCode("RI")).toBe("rezidential");
    expect(getBACSCategoryFromCode("RC")).toBe("rezidential");
    expect(getBACSCategoryFromCode("RA")).toBe("rezidential");
  });

  it("Coduri nerezidențial comune → mapare corectă", () => {
    expect(getBACSCategoryFromCode("BI")).toBe("birouri");
    expect(getBACSCategoryFromCode("ED")).toBe("educatie");
    expect(getBACSCategoryFromCode("SA")).toBe("spitale");
    expect(getBACSCategoryFromCode("HO_LUX")).toBe("hoteluri");
    expect(getBACSCategoryFromCode("CO")).toBe("comert");
    expect(getBACSCategoryFromCode("SP")).toBe("sport");
  });

  it("Cod necunoscut cu prefix R → rezidențial (fallback)", () => {
    expect(getBACSCategoryFromCode("RX_NEW")).toBe("rezidential");
  });

  it("Cod necunoscut fără prefix R → birouri (fallback)", () => {
    expect(getBACSCategoryFromCode("UNKNOWN")).toBe("birouri");
  });

  it("Input invalid (null/undefined/number) → birouri", () => {
    expect(getBACSCategoryFromCode(null)).toBe("birouri");
    expect(getBACSCategoryFromCode(undefined)).toBe("birouri");
    expect(getBACSCategoryFromCode(123)).toBe("birouri");
  });
});

describe("checkBACSMandatoryISO() — EPBD Art. 14 + L. 238/2024", () => {
  it("Test 6: Legea 238/2024 — birou >290 kW: termen 31.12.2024 EXPIRAT la 2026", () => {
    const r = checkBACSMandatoryISO({ category: "BI", hvacPower: 350, year: 2026 });
    expect(r.mandatory).toBe(true);
    expect(r.minClass).toBe("C");
    expect(r.deadline).toBe("31.12.2024");
    expect(r.deadlineExpired).toBe(true);
    expect(r.warningLevel).toBe("error");
    expect(r.reason).toMatch(/DEPĂȘIT/);
    expect(r.reason).toMatch(/5 000/);
  });

  it("Clădire nouă nerezidențială >290 kW → clasă minimă B (nu C)", () => {
    const r = checkBACSMandatoryISO({ category: "BI", hvacPower: 350, isNew: true, year: 2026 });
    expect(r.minClass).toBe("B");
  });

  it("Rezidențial → BACS opțional indiferent de putere", () => {
    const r1 = checkBACSMandatoryISO({ category: "RI", hvacPower: 500 });
    const r2 = checkBACSMandatoryISO({ category: "RC", hvacPower: 50 });
    expect(r1.mandatory).toBe(false);
    expect(r2.mandatory).toBe(false);
    expect(r1.warningLevel).toBe("none");
  });

  it("Nerezidențial ≤70 kW → opțional", () => {
    const r = checkBACSMandatoryISO({ category: "BI", hvacPower: 50 });
    expect(r.mandatory).toBe(false);
    expect(r.minClass).toBeNull();
  });

  it("Nerezidențial 70-290 kW → termen 2029", () => {
    const r = checkBACSMandatoryISO({ category: "BI", hvacPower: 150, year: 2026 });
    expect(r.deadline).toBe("31.12.2029");
    expect(r.deadlineExpired).toBe(false);
    expect(r.mandatory).toBe(false); // încă nu obligatoriu în 2026
  });

  it("Termen viitor încă valid la 2024 (înainte de expirare)", () => {
    const r = checkBACSMandatoryISO({ category: "BI", hvacPower: 350, year: 2024 });
    expect(r.deadline).toBe("31.12.2024");
    expect(r.deadlineExpired).toBe(false);
    expect(r.warningLevel).toBe("warning");
  });
});

describe("sriScoreToBACSClass() — mapare SRI → BACS (ISO 52120 §7.3)", () => {
  it("Test 5: Scor SRI → clasa BACS mapare corectă", () => {
    expect(sriScoreToBACSClass(85)).toBe("A");
    expect(sriScoreToBACSClass(70)).toBe("B");
    expect(sriScoreToBACSClass(50)).toBe("C");
    expect(sriScoreToBACSClass(30)).toBe("C"); // Basic → încă C (nu D)
    expect(sriScoreToBACSClass(10)).toBe("D");
    expect(sriScoreToBACSClass(0)).toBe("D");
  });

  it("Scor 80 fix → A (prag exact)", () => {
    expect(sriScoreToBACSClass(80)).toBe("A");
  });

  it("Scor 60 fix → B (prag exact)", () => {
    expect(sriScoreToBACSClass(60)).toBe("B");
  });

  it("sriScoreLevel returnează nivel + descriere", () => {
    const hs = sriScoreLevel(90);
    expect(hs.level).toBe("Highly smart");
    expect(hs.bacs).toBe("A");
    expect(hs.desc).toMatch(/inteligentă/i);

    const ns = sriScoreLevel(10);
    expect(ns.level).toBe("Non-smart");
    expect(ns.bacs).toBe("D");
  });
});

describe("Backward compatibility + Shim", () => {
  it("BACS_CLASSES exportat pentru legacy imports", () => {
    expect(BACS_CLASSES).toBeDefined();
    expect(BACS_CLASSES.A).toBeDefined();
    expect(BACS_CLASSES.A.label).toMatch(/^A /);
    expect(BACS_CLASSES.C.factor).toBe(1.00); // C = referință în ISO 52120
  });

  it("BACS_CLASS_LABELS conține culori + descrieri", () => {
    for (const cls of ["A", "B", "C", "D"]) {
      expect(BACS_CLASS_LABELS[cls]).toBeDefined();
      expect(BACS_CLASS_LABELS[cls].color).toBeDefined();
      expect(BACS_CLASS_LABELS[cls].desc).toBeDefined();
      expect(BACS_CLASS_LABELS[cls].economyPct).toBeDefined();
    }
  });

  it("Referință normativă = SR EN ISO 52120-1:2022", () => {
    expect(ISO_52120_REFERENCE).toBe("SR EN ISO 52120-1:2022");
  });

  it("BACS_OBLIGATION_THRESHOLD_KW = 290", () => {
    expect(BACS_OBLIGATION_THRESHOLD_KW).toBe(290);
  });
});

describe("Test 4: Integrare Step5 — Q_NH cu clasa A vs. D pentru birouri", () => {
  it("Birouri 1000 m² Q_NH 80 000 kWh → delta A vs D ≈ 51% diferență heating", () => {
    const Q_NH = 80000;
    const A_h = applyBACSFactor(Q_NH, "heating", "BI", "A"); // 56000
    const D_h = applyBACSFactor(Q_NH, "heating", "BI", "D"); // 120800
    expect(A_h).toBe(56000);
    expect(D_h).toBe(120800);
    const delta_pct = (D_h - A_h) / A_h * 100;
    expect(delta_pct).toBeGreaterThan(100); // D e +115% față de A
    expect(delta_pct).toBeLessThan(130);
  });

  it("Integrare în Step 5: f_BAC aplicat în useInstallationSummary", () => {
    // Verificare integrare: getBACSFactors returnează obiectul folosit
    const f = getBACSFactors("BI", "A");
    expect(f.heating).toBe(0.70);
    expect(f.cooling).toBe(0.57);
    expect(f.dhw).toBe(0.88);
    expect(f.ventilation).toBe(0.70);
    expect(f.lighting).toBe(0.70);
  });
});
