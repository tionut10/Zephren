// ═══════════════════════════════════════════════════════════════
// Sprint 11 (17 apr 2026) — Migrare globală Tab A.16 NA:2023 electricitate
// Teste helpers getFPElec*() + paritate cu valorile hardcodate legacy
// ═══════════════════════════════════════════════════════════════
// Referință: SR EN ISO 52000-1:2017/NA:2023 Tab A.16 (Licență ASRO TUNARU IONUȚ)
//   electricitate: fP_nren=2.00, fP_ren=0.50, fP_tot=2.50
// Legacy Mc 001-2022 Tab 5.17:
//   electricitate: fP_nren=2.62, fP_ren=0.00, fP_tot=2.62
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";
import {
  FP_ELEC,
  FP_ELEC_NA2023_NREN,
  FP_ELEC_NA2023_REN,
  FP_ELEC_NA2023_TOT,
  CO2_ELEC,
  getFPElecNren,
  getFPElecRen,
  getFPElecTot,
} from "../u-reference.js";

describe("Sprint 11 — Factori electricitate Tab A.16 (NA:2023)", () => {
  describe("Test 1: Constante legacy păstrate (paritate retroactivă)", () => {
    it("FP_ELEC = 2.62 (Tab 5.17 Mc 001-2022) — nu se modifică", () => {
      expect(FP_ELEC).toBe(2.62);
    });

    it("CO2_ELEC = 0.107 kg/kWh (invariant Tab 5.17 + Tab A.16)", () => {
      expect(CO2_ELEC).toBe(0.107);
    });
  });

  describe("Test 2: Constante NA:2023 Tab A.16 corecte", () => {
    it("FP_ELEC_NA2023_NREN = 2.00 — valoare ASRO autoritară", () => {
      expect(FP_ELEC_NA2023_NREN).toBe(2.00);
    });

    it("FP_ELEC_NA2023_REN = 0.50 — contribuția RES din mix SEN", () => {
      expect(FP_ELEC_NA2023_REN).toBe(0.50);
    });

    it("FP_ELEC_NA2023_TOT = 2.50 = NREN + REN (consistență)", () => {
      expect(FP_ELEC_NA2023_TOT).toBe(2.50);
      expect(FP_ELEC_NA2023_TOT).toBe(FP_ELEC_NA2023_NREN + FP_ELEC_NA2023_REN);
    });

    it("Tab A.16 (2.50) < Tab 5.17 (2.62) — mix RES real recunoscut", () => {
      expect(FP_ELEC_NA2023_TOT).toBeLessThan(FP_ELEC);
    });
  });

  describe("Test 3: getFPElecNren() gated pe useNA2023", () => {
    it("useNA2023=true → 2.00 (Tab A.16)", () => {
      expect(getFPElecNren(true)).toBe(2.00);
    });

    it("useNA2023=false → 2.62 (Tab 5.17 legacy)", () => {
      expect(getFPElecNren(false)).toBe(2.62);
    });
  });

  describe("Test 4: getFPElecRen() gated pe useNA2023", () => {
    it("useNA2023=true → 0.50 (recunoaștere RES mix SEN)", () => {
      expect(getFPElecRen(true)).toBe(0.50);
    });

    it("useNA2023=false → 0 (Tab 5.17 nu decomponea RES)", () => {
      expect(getFPElecRen(false)).toBe(0.00);
    });
  });

  describe("Test 5: getFPElecTot() gated pe useNA2023", () => {
    it("useNA2023=true → 2.50 (Tab A.16)", () => {
      expect(getFPElecTot(true)).toBe(2.50);
    });

    it("useNA2023=false → 2.62 (Tab 5.17 legacy)", () => {
      expect(getFPElecTot(false)).toBe(2.62);
    });

    it("Total = NREN + REN pentru fiecare mod", () => {
      expect(getFPElecTot(true)).toBe(getFPElecNren(true) + getFPElecRen(true));
      expect(getFPElecTot(false)).toBe(getFPElecNren(false) + getFPElecRen(false));
    });
  });

  describe("Test 6: Impact practic — raport CPE iluminat 200 m² clădire birouri", () => {
    it("qf_l = 2600 kWh/an (13 kWh/m²·an × 200 m²) → EP diferă cu ~24%", () => {
      const qf_l = 2600; // kWh/an iluminat birou 200 m²
      // Mod legacy (Tab 5.17)
      const ep_l_legacy = qf_l * getFPElecTot(false);      // 2600 × 2.62 = 6812
      const ep_nren_l_legacy = qf_l * getFPElecNren(false); // 2600 × 2.62 = 6812
      // Mod NA:2023 (Tab A.16)
      const ep_l_na2023 = qf_l * getFPElecTot(true);        // 2600 × 2.50 = 6500
      const ep_nren_l_na2023 = qf_l * getFPElecNren(true);  // 2600 × 2.00 = 5200

      expect(ep_l_legacy).toBeCloseTo(6812, 0);
      expect(ep_l_na2023).toBeCloseTo(6500, 0);
      expect(ep_nren_l_legacy).toBeCloseTo(6812, 0);
      expect(ep_nren_l_na2023).toBeCloseTo(5200, 0);

      // Reducere EP nerecuperabil: (6812 - 5200) / 6812 ≈ 23.7%
      const reducerePct = (ep_nren_l_legacy - ep_nren_l_na2023) / ep_nren_l_legacy;
      expect(reducerePct).toBeGreaterThan(0.22);
      expect(reducerePct).toBeLessThan(0.25);
    });
  });

  describe("Test 7: Suma fP_nren + fP_ren consistentă cu fP_tot (invariant)", () => {
    it("Pentru orice valoare useNA2023 — getFPElecTot = getFPElecNren + getFPElecRen", () => {
      for (const mode of [true, false]) {
        const sum = getFPElecNren(mode) + getFPElecRen(mode);
        expect(sum).toBeCloseTo(getFPElecTot(mode), 6);
      }
    });

    it("Paritate CO2 — identic legacy și NA:2023 (0.107)", () => {
      // Migrarea nu afectează factorul CO2
      expect(CO2_ELEC).toBe(0.107);
    });
  });
});
