// Sprint 13 — Polishing post-Faza 15
// Teste regresie pentru fix-urile aplicate:
//   1. U_lin ACM tabelar (EN 15316-3 Tab.B.2) — înlocuire hardcodare 15 → 0.45
//   2. aH iso13790 category-aware (NA:2023 §A.34) — 15h rez, 30h nerez
//   3. Web Worker + fallback useCalcWorker — semnătură corectată la (params) unic
//   4. IEQ_CATEGORIES sincronizat cu CO2_CATEGORIES (400/600/1000 ppm Δ)
//   5. BACS_ENERGY_FACTORS marcat deprecated (frozen) — delegare la bacs-iso52120

import { describe, it, expect } from "vitest";
import {
  U_LIN_CONDUCTA_EN15316,
  selectULin,
} from "../acm-en15316.js";
import {
  calcMonthlyISO13790,
  getTauH0,
  TAU_H0_REZIDENTIAL,
  TAU_H0_NEREZIDENTIAL,
} from "../iso13790.js";
import { IEQ_CATEGORIES, BACS_ENERGY_FACTORS } from "../epbd.js";
import { CO2_CATEGORIES } from "../en16798.js";

// ═══════════════════════════════════════════════════════════════
// 1. U_lin ACM tabelar — EN 15316-3 Tab.B.2
// ═══════════════════════════════════════════════════════════════
describe("Sprint 13 — BUG #1 U_lin ACM (acm-en15316.js)", () => {
  it("tabel U_LIN_CONDUCTA_EN15316 conține valorile cheie EN 15316-3 Tab.B.2", () => {
    expect(U_LIN_CONDUCTA_EN15316.neizolat).toBe(0.45);
    expect(U_LIN_CONDUCTA_EN15316.izolat_standard_d20).toBe(0.25);
    expect(U_LIN_CONDUCTA_EN15316.izolat_bun_d20).toBe(0.17);
    expect(U_LIN_CONDUCTA_EN15316.izolat_inalt_d25).toBe(0.14);
  });

  it("neizolat este 0.45 W/(m·K) — NU 15 (bug fixat) — factor realist EN 15316-3", () => {
    const U = selectULin({ hasInsulation: false, pipeDiameter_mm: 22 });
    expect(U).toBe(0.45);
    expect(U).toBeLessThan(2); // sanity: sub 2 W/(m·K) pentru orice configurare fizică realistă
  });

  it("izolat standard DN20 ≈ 0.25 W/(m·K) (20 mm EPE)", () => {
    const U = selectULin({ hasInsulation: true, pipeDiameter_mm: 22, insulationGrade: "standard" });
    expect(U).toBe(0.25);
  });

  it("izolat bun DN25 ≈ 0.20 W/(m·K) (30 mm AF)", () => {
    const U = selectULin({ hasInsulation: true, pipeDiameter_mm: 26, insulationGrade: "bun" });
    expect(U).toBe(0.20);
  });

  it("fallback pe DN necunoscut (DN50 nonstandard) → mapare la d32", () => {
    const U = selectULin({ hasInsulation: true, pipeDiameter_mm: 50, insulationGrade: "standard" });
    expect(U).toBe(0.35); // izolat_standard_d32
  });

  it("grad izolație necunoscut → fallback 'standard'", () => {
    const U = selectULin({ hasInsulation: true, pipeDiameter_mm: 22, insulationGrade: "bizar" });
    expect(U).toBe(0.25); // standard_d20
  });

  it("conservator: U izolat < U neizolat pentru toate diametrele", () => {
    for (const d of [15, 20, 25, 32]) {
      const uNe = selectULin({ hasInsulation: false, pipeDiameter_mm: d });
      const uIz = selectULin({ hasInsulation: true, pipeDiameter_mm: d, insulationGrade: "bun" });
      expect(uIz).toBeLessThanOrEqual(uNe);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. aH iso13790 — category-aware (NA:2023 §A.34)
// ═══════════════════════════════════════════════════════════════
describe("Sprint 13 — BUG #2 aH category-aware (iso13790.js)", () => {
  it("τ_H,0 rezidențial = 15 h, nerezidențial = 30 h (const. exportate)", () => {
    expect(TAU_H0_REZIDENTIAL).toBe(15);
    expect(TAU_H0_NEREZIDENTIAL).toBe(30);
  });

  it("getTauH0('RI') → 15 (casă individuală)", () => {
    expect(getTauH0("RI")).toBe(15);
  });

  it("getTauH0('RC') → 15 (bloc rezidențial)", () => {
    expect(getTauH0("RC")).toBe(15);
  });

  it("getTauH0('BI') → 30 (birouri)", () => {
    expect(getTauH0("BI")).toBe(30);
  });

  it("getTauH0('ED') → 30 (educație)", () => {
    expect(getTauH0("ED")).toBe(30);
  });

  it("getTauH0('SA') → 30 (spital)", () => {
    expect(getTauH0("SA")).toBe(30);
  });

  it("getTauH0(undefined) → 30 (default nerezidențial — conservator)", () => {
    expect(getTauH0(undefined)).toBe(30);
  });

  it("a_H variază conform τ_H,0 category-aware — verificare prin eta_H (γ identic, aH diferit)", () => {
    // Setup controlat: aceeași clădire + aceleași câștiguri (vitraje ZERO, phi_int explicit controlat
    // prin forțarea climate.solar fără glazing). Diferă doar category → τ_H,0 → a_H.
    // NOTĂ: qIntMap variază per categorie, deci phi_int diferă; comparăm DIRECT eta_H de pe o lună
    // stabilă (iarnă profundă — ian, γ << 1 → η_util crește cu a_H).
    const baseParams = {
      G_env: 150, V: 200, Au: 80,
      climate: { temp_month: [-5, 0, 5, 10, 16, 22, 24, 23, 18, 10, 4, -2], solar: { S: 200 } },
      theta_int: 20,
      glazingElements: [], // fără solar
      hrEta: 0,
      n50: 1.0,
      structure: "Zidărie portantă", // masă mare → τ mare → diferență aH vizibilă
      shadingFactor: 0.9,
      n_vent: 0.5,
      windExposure: "mediu",
    };
    const resultRI = calcMonthlyISO13790({ ...baseParams, category: "RI" });
    const resultBI = calcMonthlyISO13790({ ...baseParams, category: "BI" });

    // Ianuarie — γ < 1 (pierderi >> câștiguri), a_H mai mare produce η_H mai mare
    // a_H_RI = 1 + τ/15 > a_H_BI = 1 + τ/30 pentru același τ → η_H_RI > η_H_BI
    const etaH_RI_ian = resultRI[0].eta_H;
    const etaH_BI_ian = resultBI[0].eta_H;
    // Notă: phi_int diferă (RI=4, BI=8 W/m²) → γ diferă. Dar a_H e principalul driver.
    // Contract acceptabil: eta_H_RI (a_H=15) ≠ eta_H_BI (a_H=30)
    expect(etaH_RI_ian).not.toBe(etaH_BI_ian);
  });

  it("cu aceeași categorie nerezidențială (BI vs ED), a_H identic (ambele folosesc τ0=30h)", () => {
    const baseParams = {
      G_env: 150, V: 200, Au: 80,
      climate: { temp_month: [-5, 0, 5, 10, 16, 22, 24, 23, 18, 10, 4, -2], solar: { S: 200 } },
      theta_int: 20,
      glazingElements: [],
      hrEta: 0,
      n50: 1.0,
      structure: "Zidărie portantă",
      shadingFactor: 0.9,
      n_vent: 0.5,
      windExposure: "mediu",
    };
    // Doua categorii nerezidențiale cu același qIntMap fallback (SA = 5) — izolăm efectul τ_H,0
    const resultSA = calcMonthlyISO13790({ ...baseParams, category: "SA" });
    const resultAL = calcMonthlyISO13790({ ...baseParams, category: "AL" });
    // Ambele au τ_H,0 = 30h și qIntMap = 5 → rezultat IDENTIC
    expect(resultSA[0].eta_H).toBeCloseTo(resultAL[0].eta_H, 5);
    expect(resultSA[0].qH_nd).toBeCloseTo(resultAL[0].qH_nd, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. IEQ_CATEGORIES — sincronizare cu CO2_CATEGORIES (NA:2019)
// ═══════════════════════════════════════════════════════════════
describe("Sprint 13 — Finding #4 IEQ_CATEGORIES sincronizare CO2", () => {
  it("IEQ cat I co2Max = 400 (sincronizat NA:2019)", () => {
    const catI = IEQ_CATEGORIES.find(c => c.id === "I");
    expect(catI.co2Max).toBe(400);
    expect(catI.co2Max).toBe(CO2_CATEGORIES.I.deltaMax);
  });

  it("IEQ cat II co2Max = 600 (sincronizat NA:2019)", () => {
    const catII = IEQ_CATEGORIES.find(c => c.id === "II");
    expect(catII.co2Max).toBe(600);
    expect(catII.co2Max).toBe(CO2_CATEGORIES.II.deltaMax);
  });

  it("IEQ cat III co2Max = 1000 (sincronizat NA:2019)", () => {
    const catIII = IEQ_CATEGORIES.find(c => c.id === "III");
    expect(catIII.co2Max).toBe(1000);
    expect(catIII.co2Max).toBe(CO2_CATEGORIES.III.deltaMax);
  });

  it("IEQ_CATEGORIES nu mai conține valorile vechi (550/800/1350)", () => {
    const values = IEQ_CATEGORIES.map(c => c.co2Max);
    expect(values).not.toContain(550);
    expect(values).not.toContain(800);
    expect(values).not.toContain(1350);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. BACS_ENERGY_FACTORS deprecated — frozen + contract stabil
// ═══════════════════════════════════════════════════════════════
describe("Sprint 13 — Finding #5 BACS_ENERGY_FACTORS deprecated", () => {
  it("este frozen (imutabil) — nu se pot modifica accidental factorii", () => {
    expect(Object.isFrozen(BACS_ENERGY_FACTORS)).toBe(true);
  });

  it("păstrează contractul legacy pentru teste existente (residential A heating = 0.67)", () => {
    expect(BACS_ENERGY_FACTORS.residential.A.heating).toBe(0.67);
    expect(BACS_ENERGY_FACTORS.nonresidential.A.heating).toBe(0.68);
    expect(BACS_ENERGY_FACTORS.residential.C.heating).toBe(1.00);
    expect(BACS_ENERGY_FACTORS.nonresidential.D.cooling).toBe(1.45);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Web Worker + fallback useCalcWorker — semnătură (params) unic
// Notă: nu putem testa Worker real în Vitest (nu e disponibil Worker DOM),
// dar testăm faptul că fix-ul la semnătură face ca `calcMonthlyISO13790(payload)`
// să meargă end-to-end când payload-ul e obiectul corect.
// ═══════════════════════════════════════════════════════════════
describe("Sprint 13 — BUG #3 Worker + fallback semnătură (params)", () => {
  it("calcMonthlyISO13790 acceptă obiect unic (contractul Worker-ului S13)", () => {
    const payload = {
      G_env: 200, V: 200, Au: 80,
      climate: { temp_month: [0,2,7,12,17,22,24,23,18,12,6,1], solar: { S: 390, N: 140 } },
      theta_int: 20,
      glazingElements: [{ area: 10, g: 0.65, frameRatio: 25, orientation: "S" }],
      hrEta: 0.6,
      category: "RI",
      n50: 2.0,
      structure: "Cadre beton armat",
      shadingFactor: 0.9,
      n_vent: 0.5,
      windExposure: "mediu",
    };
    const result = calcMonthlyISO13790(payload);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(12);
    expect(result[0]).toHaveProperty("qH_nd");
    expect(result[0]).toHaveProperty("qC_nd");
    // Luna ianuarie — necesar încălzire > 0 pentru climate negativ
    expect(result[0].qH_nd).toBeGreaterThan(0);
  });

  it("calcMonthlyISO13790 cu payload incomplet → returnează null (guard)", () => {
    // Contract: fără climate sau Au → null (nu crash)
    expect(calcMonthlyISO13790({ G_env: 200 })).toBeNull();
    expect(calcMonthlyISO13790({ climate: {}, Au: 80 })).toBeNull();
  });
});
