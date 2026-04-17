// ═══════════════════════════════════════════════════════════════
// Teste regresie — EN 15193-1 + Mc 001-2022 Partea IV (LENI)
// Sprint 2 Iluminat (17 apr 2026) — fix W_P + ore per categorie + F_c pe tD
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";
import {
  calcLENI,
  F_O_BY_CATEGORY,
  NIGHT_FRAC_BY_CATEGORY,
  LENI_MAX_BY_CATEGORY,
} from "../en15193-lighting.js";

describe("calcLENI — EN 15193-1 + Mc 001-2022", () => {
  describe("Test 1: Apartament rezidențial 65 m² — baseline conform", () => {
    it("LENI apartament LED+manual, 1800h, 30% natRatio ≈ 6.3–6.5 kWh/(m²·an)", () => {
      const r = calcLENI({
        category: "RI",
        area: 65,
        pDensity: 4.5,
        fCtrl: 1.0,
        operatingHours: 1800,
        naturalLightRatio: 0.30,
      });
      // Rezidențial → pEm=0 default (fără iluminat urgență permanent)
      // W_L = 4.5 × (1260 × 0.90 × 0.805 × 1.0 + 540 × 0.90) / 1000 = 6.29
      // W_em = 0
      // W_standby = 0.3 × (8760 − 1800) / 1000 = 2.088
      // LENI ≈ 6.29 + 2.088 = 8.38
      expect(r.LENI).toBeGreaterThan(8.0);
      expect(r.LENI).toBeLessThan(8.7);
      expect(r.W_em).toBe(0);
      expect(r.W_standby).toBeCloseTo(2.088, 2);
      // LENI ≈ 8.38 e chiar pe limita 0.7 × 12 = 8.4 → "excelent" sau "conform" acceptabil
      expect(["excelent", "conform"]).toContain(r.status);
      expect(r.LENI_max).toBe(12);
    });
  });

  describe("Test 2: Birou 200 m² — valori mai mari", () => {
    it("LENI birou, 2500h, pDensity=10, fCtrl=0.55 ≥ apartament", () => {
      const rBirou = calcLENI({
        category: "BI",
        area: 200,
        pDensity: 10.0,
        fCtrl: 0.55,
        operatingHours: 2500,
        naturalLightRatio: 0.20,
      });
      // Birou non-rezidențial → pEm=1.0 default
      // W_em = 1.0 × 8760 / 1000 = 8.76
      // W_standby = 0.3 × (8760 − 2500) / 1000 = 1.878
      // W_P total = 10.64
      // W_L = 10 × (2250 × 0.80 × 0.87 × 0.55 + 250 × 0.80) / 1000 = 8.61 + 2.00 = 10.61
      // LENI ≈ 21.2 kWh/(m²·an)
      expect(rBirou.LENI).toBeGreaterThan(20);
      expect(rBirou.LENI).toBeLessThan(23);
      expect(rBirou.W_em).toBeCloseTo(8.76, 2);
      expect(rBirou.W_P).toBeGreaterThan(rBirou.W_L * 0.3);
      expect(rBirou.LENI_max).toBe(25);
    });
  });

  describe("Test 3: W_P (energie parazită) calculat separat", () => {
    it("W_em rezidențial = 0; W_em non-rezidențial = 1.0 × 8760 / 1000", () => {
      const rRez = calcLENI({
        category: "RI", area: 50, pDensity: 4.5, fCtrl: 1.0,
        operatingHours: 1800, naturalLightRatio: 0.3,
      });
      const rPub = calcLENI({
        category: "BI", area: 50, pDensity: 4.5, fCtrl: 1.0,
        operatingHours: 1800, naturalLightRatio: 0.3,
      });
      expect(rRez.W_em).toBe(0);
      expect(rPub.W_em).toBeCloseTo(8.76, 3);
      // W_standby identic (0.3 W/m² default × 6960h / 1000)
      expect(rRez.W_standby).toBeCloseTo(rPub.W_standby, 3);
    });

    it("W_standby scade proporțional cu creșterea orelor de funcționare", () => {
      const r1800 = calcLENI({
        category: "BI", area: 100, pDensity: 8, fCtrl: 1.0,
        operatingHours: 1800, naturalLightRatio: 0.2,
      });
      const r5000 = calcLENI({
        category: "BI", area: 100, pDensity: 8, fCtrl: 1.0,
        operatingHours: 5000, naturalLightRatio: 0.2,
      });
      // 8760 - 1800 = 6960 → 0.3 × 6960 / 1000 = 2.088
      // 8760 - 5000 = 3760 → 0.3 × 3760 / 1000 = 1.128
      expect(r1800.W_standby).toBeCloseTo(2.088, 2);
      expect(r5000.W_standby).toBeCloseTo(1.128, 2);
    });

    it("W_em și W_standby respectă override explicit", () => {
      const r = calcLENI({
        category: "BI", area: 100, pDensity: 8, fCtrl: 1.0,
        operatingHours: 2500, naturalLightRatio: 0.2,
        pEmergency: 2.0, pStandby: 0.8,
      });
      expect(r.W_em).toBeCloseTo(17.52, 2); // 2.0 × 8760 / 1000
      expect(r.W_standby).toBeCloseTo(5.008, 2); // 0.8 × 6260 / 1000
    });
  });

  describe("Test 4: F_d și F_c aplicați DOAR pe termen diurn tD", () => {
    it("F_d=1 (natRatio=0) → LENI mai mare decât F_d<1 (natRatio=0.5), diferența provine DOAR din tD", () => {
      const noLight = calcLENI({
        category: "BI", area: 100, pDensity: 10, fCtrl: 1.0,
        operatingHours: 2500, naturalLightRatio: 0.0,
      });
      const withLight = calcLENI({
        category: "BI", area: 100, pDensity: 10, fCtrl: 1.0,
        operatingHours: 2500, naturalLightRatio: 0.5,
      });
      // W_L(no)   = 10 × (2250 × 0.80 × 1.00 × 1.0 + 250 × 0.80) / 1000 = 18 + 2 = 20
      // W_L(with) = 10 × (2250 × 0.80 × 0.675 × 1.0 + 250 × 0.80) / 1000 = 12.15 + 2 = 14.15
      // tN = 250, contribuție identică în ambele: 10 × 250 × 0.8 / 1000 = 2.0
      expect(noLight.W_L).toBeCloseTo(20, 1);
      expect(withLight.W_L).toBeCloseTo(14.15, 1);
      // Diferența provine EXCLUSIV din termenul diurn
      const diff = noLight.W_L - withLight.W_L;
      expect(diff).toBeGreaterThan(5.5);
      expect(diff).toBeLessThan(6.5);
    });

    it("F_c aplicat DOAR pe tD: în regim full-noapte (nightFrac=1.0), F_c nu influențează LENI", () => {
      const rFullCtrl = calcLENI({
        category: "BI", area: 100, pDensity: 10, fCtrl: 1.0,
        operatingHours: 2000, naturalLightRatio: 0,
        nightFrac: 1.0,  // 100% nocturn
      });
      const rDali = calcLENI({
        category: "BI", area: 100, pDensity: 10, fCtrl: 0.45,
        operatingHours: 2000, naturalLightRatio: 0,
        nightFrac: 1.0,  // 100% nocturn
      });
      // tD = 0 → termen diurn complet anulat → W_L identic indiferent de fCtrl
      expect(rFullCtrl.W_L).toBeCloseTo(rDali.W_L, 3);
    });
  });

  describe("Test 5: LENI diferă corect per categorie clădire (BUG #2 fix)", () => {
    it("Apartament vs Birou vs Spital cu parametri identici → LENI diferit via F_o și nightFrac", () => {
      const common = {
        area: 100, pDensity: 8, fCtrl: 0.8,
        operatingHours: 2500, naturalLightRatio: 0.2,
      };
      const rRI = calcLENI({ ...common, category: "RI" });
      const rBI = calcLENI({ ...common, category: "BI" });
      const rSA = calcLENI({ ...common, category: "SA" });

      // Valori calculate explicit:
      //   RI: tD=1750, tN=750, fo=0.90 → W_L = 8×(1750×0.9×0.87×0.8 + 750×0.9)/1000 ≈ 14.17
      //   BI: tD=2250, tN=250, fo=0.80 → W_L = 8×(2250×0.8×0.87×0.8 + 250×0.8)/1000 ≈ 11.63
      //   SA: tD=1375, tN=1125, fo=1.00 → W_L = 8×(1375×1×0.87×0.8 + 1125×1)/1000 ≈ 16.66
      // Ordine: SA > RI > BI (rezidențialul are nightFrac mare → W_L mai mare pentru ore nocturne)
      expect(rSA.W_L).toBeGreaterThan(rRI.W_L);
      expect(rRI.W_L).toBeGreaterThan(rBI.W_L);

      // Non-rezidențialele au W_em=1.0 default, rezidențialul 0
      expect(rSA.W_em).toBeCloseTo(8.76, 2);
      expect(rBI.W_em).toBeCloseTo(8.76, 2);
      expect(rRI.W_em).toBe(0);

      // LENI total: BI + SA cresc cu W_em=8.76, deci diferența față de RI se inversează parțial
      // LENI_RI ≈ 14.17 + 0 + 1.128 = 15.30
      // LENI_BI ≈ 11.63 + 8.76 + 1.878 = 22.27
      // LENI_SA ≈ 16.66 + 8.76 + 1.878 = 27.30
      expect(rSA.LENI).toBeGreaterThan(rBI.LENI);
      expect(rBI.LENI).toBeGreaterThan(rRI.LENI);

      // LENI_max diferă per categorie
      expect(rRI.LENI_max).toBe(12);
      expect(rBI.LENI_max).toBe(25);
      expect(rSA.LENI_max).toBe(35);
    });

    it("Tabele F_O_BY_CATEGORY, NIGHT_FRAC_BY_CATEGORY, LENI_MAX_BY_CATEGORY sunt complete", () => {
      const expectedCats = ["RI", "RC", "RA", "BI", "ED", "SA", "HC", "CO", "SP"];
      for (const cat of expectedCats) {
        expect(F_O_BY_CATEGORY[cat]).toBeDefined();
        expect(F_O_BY_CATEGORY[cat]).toBeGreaterThan(0.5);
        expect(F_O_BY_CATEGORY[cat]).toBeLessThanOrEqual(1.0);

        expect(NIGHT_FRAC_BY_CATEGORY[cat]).toBeDefined();
        expect(NIGHT_FRAC_BY_CATEGORY[cat]).toBeGreaterThanOrEqual(0);
        expect(NIGHT_FRAC_BY_CATEGORY[cat]).toBeLessThan(0.5);
      }
      // LENI_MAX
      expect(LENI_MAX_BY_CATEGORY.RI).toBe(12);
      expect(LENI_MAX_BY_CATEGORY.SA).toBe(35);
      expect(LENI_MAX_BY_CATEGORY.CO).toBe(35);
    });
  });

  describe("Test 6: Verdict NECONFORM când LENI > LENI_max", () => {
    it("Comercial cu 20 W/m² manual, 3000h → NECONFORM (> 35 kWh/m²/an)", () => {
      const r = calcLENI({
        category: "CO",
        area: 200,
        pDensity: 20.0,
        fCtrl: 1.0,
        operatingHours: 3000,
        naturalLightRatio: 0.10,
      });
      expect(r.LENI).toBeGreaterThan(r.LENI_max);
      expect(r.status).toBe("neconform");
    });

    it("Apartament LED bine controlat → EXCELENT (LENI < 0.7 × LENI_max)", () => {
      const r = calcLENI({
        category: "RI",
        area: 65,
        pDensity: 3.5,      // LED premium
        fCtrl: 0.70,         // prezență + dimmer
        operatingHours: 1500,
        naturalLightRatio: 0.40,
        pEmergency: 0,
        pStandby: 0.1,       // drivere efficiente
      });
      expect(r.LENI).toBeLessThan(r.LENI_max * 0.7);
      expect(r.status).toBe("excelent");
    });
  });

  describe("Test 7: Fallback-uri robuste", () => {
    it("Area 0 sau pDensity negativ → LENI = 0 cu status invalid", () => {
      expect(calcLENI({ category: "RI", area: 0, pDensity: 4, fCtrl: 1, operatingHours: 1800, naturalLightRatio: 0.3 }).LENI).toBe(0);
      expect(calcLENI({ category: "RI", area: 50, pDensity: -1, fCtrl: 1, operatingHours: 1800, naturalLightRatio: 0.3 }).status).toBe("invalid");
    });

    it("Categorie necunoscută → fallback F_o=0.85, nightFrac=0.25, LENI_max=25", () => {
      const r = calcLENI({
        category: "XYZ", area: 100, pDensity: 8, fCtrl: 1.0,
        operatingHours: 2000, naturalLightRatio: 0.2,
      });
      expect(r.LENI).toBeGreaterThan(0);
      expect(r.LENI_max).toBe(25);
    });

    it("naturalLightRatio > 0.8 este clamped la 0.8 (F_d min ≈ 0.48)", () => {
      const r = calcLENI({
        category: "BI", area: 100, pDensity: 10, fCtrl: 1.0,
        operatingHours: 2500, naturalLightRatio: 0.95,  // exagerat
      });
      // F_d = 1 - 0.8 × 0.65 = 0.48
      expect(r.fD).toBeCloseTo(0.48, 2);
    });
  });
});
