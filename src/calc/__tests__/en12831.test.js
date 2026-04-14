import { describe, it, expect } from "vitest";
import {
  calcPeakThermalLoad,
  calcPeakCoolingLoad,
  THETA_INT_DESIGN,
  SAFETY_FACTOR,
} from "../en12831.js";

// ═══════════════════════════════════════════════════════════════
// Teste unitare — Sarcină termică de vârf SR EN 12831-1:2017
// ═══════════════════════════════════════════════════════════════

const climaBuc = {
  theta_e: -15,
  alt: 80,
  temp_month: [-3, -1, 4, 10, 15, 19, 22, 21, 17, 11, 5, -1],
  solar: { S: 400 },
};

const peretiBuc = [
  { name: "Perete exterior", area: 80, U: 0.5, tau: 1.0, type: "PE" },
  { name: "Acoperiș", area: 60, U: 0.25, tau: 1.0, type: "PT" },
];

const ferestre = [
  { area: 10, u: 1.1, orientation: "S" },
  { area: 5, u: 1.1, orientation: "N" },
];

const paramsBase = {
  opaqueElements: peretiBuc,
  glazingElements: ferestre,
  thermalBridges: [{ length: 40, psi: 0.1 }],
  V: 300,
  Au: 100,
  n50: 3.0,
  hrEta: 0,
  climate: climaBuc,
  category: "RI",
  windExposure: "moderat",
};

describe("THETA_INT_DESIGN — date din JSON", () => {
  it("rezidențial: 20°C", () => {
    expect(THETA_INT_DESIGN.RI).toBe(20);
    expect(THETA_INT_DESIGN.RC).toBe(20);
    expect(THETA_INT_DESIGN.RA).toBe(20);
  });

  it("sănătate (SA): 22°C — mai cald", () => {
    expect(THETA_INT_DESIGN.SA).toBe(22);
  });

  it("sport (SP): 17°C — mai rece", () => {
    expect(THETA_INT_DESIGN.SP).toBe(17);
  });

  it("conține toate categoriile funcționale", () => {
    ["RI", "RC", "RA", "BI", "ED", "SA", "HC", "CO", "SP", "AL"].forEach(cat => {
      expect(THETA_INT_DESIGN[cat], cat).toBeDefined();
    });
  });
});

describe("SAFETY_FACTOR — date din JSON", () => {
  it("rezidențial: 1.10 (+10%)", () => {
    expect(SAFETY_FACTOR.rezidential).toBe(1.10);
  });

  it("nerezidențial: 1.05 (+5%)", () => {
    expect(SAFETY_FACTOR.nerezidential).toBe(1.05);
  });
});

describe("calcPeakThermalLoad — validare intrări", () => {
  it("returnează null fără parametri", () => {
    expect(calcPeakThermalLoad({})).toBeNull();
  });

  it("returnează null fără climat", () => {
    expect(calcPeakThermalLoad({ Au: 100, V: 300 })).toBeNull();
  });

  it("returnează null fără Au", () => {
    expect(calcPeakThermalLoad({ climate: climaBuc, V: 300 })).toBeNull();
  });
});

describe("calcPeakThermalLoad — calcul de bază", () => {
  const res = calcPeakThermalLoad(paramsBase);

  it("returnează obiect valid", () => {
    expect(res).not.toBeNull();
    expect(typeof res).toBe("object");
  });

  it("tExt = theta_e din climat (-15°C pentru București)", () => {
    expect(res.tExt).toBe(-15);
  });

  it("tInt = THETA_INT_DESIGN pentru RI (20°C)", () => {
    expect(res.tInt).toBe(20);
  });

  it("deltaT = tInt - tExt = 35°C", () => {
    expect(res.deltaT).toBe(35);
  });

  it("H_T > 0 (pierderi prin transmisie)", () => {
    expect(res.H_T).toBeGreaterThan(0);
  });

  it("H_V > 0 (pierderi prin ventilare)", () => {
    expect(res.H_V).toBeGreaterThan(0);
  });

  it("phi_H_total > phi_H_design (include factor de siguranță)", () => {
    expect(res.phi_H_total).toBeGreaterThanOrEqual(res.phi_H_design);
  });

  it("safetyFactor = 1.10 pentru rezidențial", () => {
    expect(res.safetyFactor).toBe(1.10);
  });

  it("phi_specific > 0 (W/m²)", () => {
    expect(res.phi_specific).toBeGreaterThan(0);
  });

  it("phi_specific = phi_H_total / Au", () => {
    expect(res.phi_specific).toBeCloseTo(res.phi_H_total / 100, 0);
  });

  it("systemRecommendation este non-gol", () => {
    expect(res.systemRecommendation).toBeTruthy();
    expect(typeof res.systemRecommendation).toBe("string");
  });

  it("elementLoads conține elemente", () => {
    expect(res.elementLoads.length).toBeGreaterThan(0);
  });

  it("H_TB inclus în H_T (punți termice)", () => {
    expect(res.H_TB).toBeGreaterThan(0);
  });
});

describe("calcPeakThermalLoad — recuperare căldură reduce H_V", () => {
  it("H_V cu HR 80% < H_V fără HR", () => {
    const fara = calcPeakThermalLoad({ ...paramsBase, hrEta: 0 });
    const cu = calcPeakThermalLoad({ ...paramsBase, hrEta: 0.8 });
    expect(cu.H_V).toBeLessThan(fara.H_V);
  });
});

describe("calcPeakThermalLoad — expunere vânt", () => {
  it("expus > moderat > protejat (infiltrații mai mari la expus)", () => {
    const expus = calcPeakThermalLoad({ ...paramsBase, windExposure: "expus" });
    const mod = calcPeakThermalLoad({ ...paramsBase, windExposure: "moderat" });
    const prot = calcPeakThermalLoad({ ...paramsBase, windExposure: "protejat" });
    // H_V expus ≥ moderat ≥ protejat
    expect(expus.H_V).toBeGreaterThanOrEqual(mod.H_V);
    expect(mod.H_V).toBeGreaterThanOrEqual(prot.H_V);
  });
});

describe("calcPeakThermalLoad — reîncălzire", () => {
  it("phi_H_total mai mare cu reîncălzire (20 W/m²)", () => {
    const fara = calcPeakThermalLoad({ ...paramsBase, reheatingPower: 0 });
    const cu = calcPeakThermalLoad({ ...paramsBase, reheatingPower: 20 });
    expect(cu.phi_H_total).toBeGreaterThan(fara.phi_H_total);
    expect(cu.phi_reheat).toBe(20 * 100); // 20 W/m² × 100 m²
  });
});

describe("calcPeakThermalLoad — categorie nerezidențială", () => {
  it("safetyFactor = 1.05 pentru birouri (BI)", () => {
    const res = calcPeakThermalLoad({ ...paramsBase, category: "BI" });
    expect(res.safetyFactor).toBe(1.05);
  });
});

describe("calcPeakCoolingLoad", () => {
  const paramsRacire = {
    Au: 100,
    glazingElements: ferestre,
    climate: climaBuc,
    internalGains: 6,
    ventFlow: 100,
  };

  it("returnează null fără Au", () => {
    expect(calcPeakCoolingLoad({ climate: climaBuc })).toBeNull();
  });

  it("returnează null fără climat", () => {
    expect(calcPeakCoolingLoad({ Au: 100 })).toBeNull();
  });

  it("returnează obiect valid cu parametri corecți", () => {
    const res = calcPeakCoolingLoad(paramsRacire);
    expect(res).not.toBeNull();
  });

  it("phi_C_m2 = phi_C_total / Au (cu toleranță)", () => {
    const res = calcPeakCoolingLoad(paramsRacire);
    expect(res.phi_C_m2).toBeCloseTo(res.phi_C_design / 100, 0);
  });

  it("tIntCool = 26°C (setpoint standard răcire)", () => {
    const res = calcPeakCoolingLoad(paramsRacire);
    expect(res.tIntCool).toBe(26);
  });

  it("coolingSysRec este non-gol", () => {
    const res = calcPeakCoolingLoad(paramsRacire);
    expect(res.coolingSysRec).toBeTruthy();
  });
});
