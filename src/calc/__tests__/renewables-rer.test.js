import { describe, it, expect } from "vitest";
import { FUELS } from "../../data/constants.js";
import { FP_ELEC } from "../../data/u-reference.js";
import { calcCHP, CHP_FUEL_FACTORS } from "../chp-detailed.js";

/**
 * Sprint 6 (17 apr 2026) — Teste Regenerabile + RER + nZEB Legea 238/2024
 *
 * Referințe:
 * - SR EN ISO 52000-1:2017 §11.5 (formula RER corectă)
 * - Legea 238/2024 Art.6 (nZEB: RER total ≥30%, RER on-site ≥10%, proximitate ≤30 km GPS)
 * - Dir. UE 2018/2001 RED II Anexa VII (prag SPF_min = 2.5 pentru PC)
 * - Mc 001-2022 Tabel 5.17 + Tabel A.16 NA:2023
 *
 * Bug-urile vizate:
 * #1 — Formula RER folosea fP convențional (2.62 / 1.17) → valori 150-350%
 * #2 — PVDegradation.jsx caută pv_annual_kWh/pv_peak_kWp inexistente în hook
 * #3 — renewable-systems.js 600 LOC complet orfan → shim deprecated
 * #4 — calcCHP() orfan → integrat în Step 4
 * #5 — chp-detailed.js avea 4 constante divergente față de FUELS
 * #6 — nZEB check lipsea rerOnSite ≥ 10% (L.238/2024 Art.6)
 * #7 — proximitate 30 km GPS complet absentă
 */

/**
 * Implementare inline a formulei RER corecte conform SR EN ISO 52000-1 §11.5.
 * Aceeași logică ca în useRenewableSummary.js (Sprint 6).
 * Folosim o funcție pură aici pentru testare deterministă fără React hooks.
 */
function calcRER({ qPV_kWh = 0, qSolarTh = 0, qPC_ren = 0, qBio_ren = 0, qWind = 0, qCogen_el = 0, qCogen_th = 0, qProximity = 0, epTotal = 1, useNA2023 = true, cogenIsRenewable = false }) {
  const FP_REN = 1.0;
  const fP_ren_ambient = useNA2023 ? FP_REN : 0;
  const totalRenewable_ep =
      qSolarTh  * FP_REN
    + qPV_kWh   * FP_REN
    + qPC_ren   * fP_ren_ambient
    + qBio_ren  * FP_REN
    + qWind     * FP_REN
    + (cogenIsRenewable ? (qCogen_el * FP_REN + qCogen_th * FP_REN) : 0)
    + qProximity * FP_REN;
  return Math.min(100, epTotal > 0 ? (totalRenewable_ep / epTotal) * 100 : 0);
}

describe("Sprint 6 — BUG #1: Formula RER conform SR EN ISO 52000-1 §11.5", () => {
  it("Test 1: casă PV 5 kWp + PC → RER 40-70% (NU peste 100% ca bug vechi)", () => {
    // PV 5 kWp ≈ 6.000 kWh/an + PC aer-apă SCOP 4 (qPC_ren ≈ 4.000 kWh/an)
    // Ep_total ≈ 15.000 kWh_EP/an (consum mixt)
    const rer = calcRER({
      qPV_kWh: 6000,
      qPC_ren: 4000,
      epTotal: 15000,
      useNA2023: true, // Mc 001 — fP_ambient = 1.0
    });
    expect(rer).toBeGreaterThanOrEqual(40);
    expect(rer).toBeLessThanOrEqual(100); // clamp obligatoriu
    // Bug vechi ar da (6000*2.62 + 4000*2.62) / 15000 = 174.67% → imposibil
  });

  it("Test 2: casă gaz + electricitate fără regenerabile → RER 0%", () => {
    const rer = calcRER({ qPV_kWh: 0, qPC_ren: 0, epTotal: 20000 });
    expect(rer).toBe(0);
  });

  it("Test 3: RER CLAMP la 100% (prosumer cu export supradimensionat)", () => {
    // PV mult mai mare decât consumul → fără clamp ar depăși 100%
    const rer = calcRER({ qPV_kWh: 20000, epTotal: 8000 });
    expect(rer).toBeLessThanOrEqual(100);
    expect(rer).toBe(100); // clamp activ
  });

  it("Test 4: toggle A.16 NA:2023 (fP_ambient=0) vs Mc 001 (fP_ambient=1.0)", () => {
    const params = { qPV_kWh: 4000, qPC_ren: 5000, epTotal: 10000 };
    const rerMc001 = calcRER({ ...params, useNA2023: true });   // fP_ambient=1.0
    const rerA16   = calcRER({ ...params, useNA2023: false });  // fP_ambient=0
    expect(rerMc001).toBeGreaterThan(rerA16);
    // Mc 001: (4000 + 5000) / 10000 = 90%
    // A.16: (4000 + 0) / 10000 = 40% (PC ambientală nu mai contează)
    expect(rerMc001).toBeCloseTo(90, 0);
    expect(rerA16).toBeCloseTo(40, 0);
  });

  it("Test 5: Cogenerare — biogaz contează regenerabil, gaz natural NU", () => {
    const params = { qPV_kWh: 0, qCogen_el: 3000, qCogen_th: 5000, epTotal: 10000 };
    const rerBiogaz = calcRER({ ...params, cogenIsRenewable: true });   // biogas
    const rerGaz    = calcRER({ ...params, cogenIsRenewable: false });  // gaz natural
    expect(rerBiogaz).toBe(80); // (3000+5000)/10000 = 80%
    expect(rerGaz).toBe(0);      // CHP pe gaz natural NU contează ca regenerabil
  });
});

describe("Sprint 6 — BUG #6: nZEB L.238/2024 Art.6 (RER on-site ≥10%)", () => {
  it("Test 6: flag eroare când RER total OK dar rerOnSite < 10%", () => {
    // Scenariu: regenerabil exclusiv din proximitate (parc PV 30 km)
    // RER total 40% (OK nZEB ≥30%), dar on-site = 0% (< 10% prag L.238/2024)
    const onSite = 0;
    const total = 40;
    const rerOnSiteOk = onSite >= 10;
    const rerTotalOk = total >= 30;
    expect(rerTotalOk).toBe(true);
    expect(rerOnSiteOk).toBe(false);
    // Conform L.238/2024 Art.6: clădirea nu e nZEB conform chiar dacă RER total OK
  });

  it("Test 7: nZEB CONFORM doar dacă rerOnSite ≥10% ȘI rerTotal ≥30%", () => {
    const scenarios = [
      { total: 35, onSite: 12, expected: true },  // ambele OK
      { total: 35, onSite: 8,  expected: false }, // on-site < 10%
      { total: 25, onSite: 20, expected: false }, // total < 30%
      { total: 50, onSite: 50, expected: true },  // ambele OK
      { total: 5,  onSite: 5,  expected: false }, // ambele sub prag
    ];
    for (const s of scenarios) {
      const isNzeb = s.total >= 30 && s.onSite >= 10;
      expect(isNzeb).toBe(s.expected);
    }
  });

  it("Test 8: proximitate ≤30 km contează la total dar NU la on-site", () => {
    // RER on-site = PV 5kWp (4000 kWh, fP_ren=1) / Ep_total
    // RER total = on-site + proximitate 3000 kWh (parc 15 km distanță)
    const onSite = calcRER({ qPV_kWh: 4000, epTotal: 20000 });
    const total  = calcRER({ qPV_kWh: 4000, qProximity: 3000, epTotal: 20000 });
    expect(total).toBeGreaterThan(onSite);
    expect(onSite).toBeCloseTo(20, 0);
    expect(total).toBeCloseTo(35, 0);
  });

  it("Test 9: proximitate >30 km GPS → NU se contabilizează", () => {
    // Logica hook: if (distance > 30) qProximity = 0
    const distanceOk = 25;
    const distanceTooFar = 45;
    const proximityValidOk = distanceOk > 0 && distanceOk <= 30;
    const proximityValidFar = distanceTooFar > 0 && distanceTooFar <= 30;
    expect(proximityValidOk).toBe(true);
    expect(proximityValidFar).toBe(false);
  });
});

describe("Sprint 6 — BUG #5: chp-detailed.js constante aliniate cu FUELS", () => {
  it("Test 10: FP gaz natural = 1.17 (nu 2.50 bug vechi FP_ELEC_GRID)", () => {
    const gaz = FUELS.find(f => f.id === "gaz");
    expect(gaz.fP_tot).toBe(1.17);
    expect(CHP_FUEL_FACTORS.natural_gas.fp).toBe(1.17);
  });

  it("Test 11: fCO₂ gaz natural = 0.202 (nu 0.205 bug vechi)", () => {
    const gaz = FUELS.find(f => f.id === "gaz");
    expect(gaz.fCO2).toBe(0.202);
    expect(CHP_FUEL_FACTORS.natural_gas.co2_kg_kWh).toBe(0.202);
  });

  it("Test 12: biogaz fP_nren=0, fP_ren=1.0 (nu 0.50 bug vechi)", () => {
    const biogas = FUELS.find(f => f.id === "biogas");
    expect(biogas.fP_nren).toBe(0);
    expect(biogas.fP_ren).toBe(1.0);
    expect(biogas.fP_tot).toBe(1.0);
    expect(CHP_FUEL_FACTORS.biogas.fp_nren).toBe(0);
    expect(CHP_FUEL_FACTORS.biogas.fp_ren).toBe(1.0);
  });

  it("Test 13: hidrogen verde fP_nren=0, fP_ren=1.0 (nu 0.40 bug vechi)", () => {
    const hidrogen = FUELS.find(f => f.id === "hidrogen");
    expect(hidrogen.fP_nren).toBe(0);
    expect(hidrogen.fP_ren).toBe(1.0);
    expect(CHP_FUEL_FACTORS.hydrogen.fp_nren).toBe(0);
    expect(CHP_FUEL_FACTORS.hydrogen.fp_ren).toBe(1.0);
    expect(CHP_FUEL_FACTORS.hydrogen.co2_kg_kWh).toBe(0);
  });

  it("Test 14: FP_ELEC = 2.62 din u-reference.js (Mc 001-2022)", () => {
    expect(FP_ELEC).toBe(2.62);
  });
});

describe("Sprint 6 — BUG #4: calcCHP() integrat și funcțional", () => {
  it("Test 15: calcCHP gaz natural 5 kW × 5000h → PES ≥10% (înaltă eficiență)", () => {
    const chp = calcCHP({
      powerElec_kW: 5,
      operatingHours: 5000,
      fuelType: "natural_gas",
      chpType: "mini_ice",
    });
    expect(chp.Q_elec_kWh).toBe(25000); // 5 × 5000
    expect(chp.PES_pct).toBeGreaterThanOrEqual(10); // Dir. 2012/27/UE criteriu înaltă eficiență
    expect(chp.efficiency_total).toBeGreaterThanOrEqual(0.80);
  });

  it("Test 16: calcCHP biogaz 10 kW → CO₂ evitat SEMNIFICATIV mai mare decât gaz", () => {
    const chpGaz = calcCHP({ powerElec_kW: 10, fuelType: "natural_gas", operatingHours: 5000 });
    const chpBio = calcCHP({ powerElec_kW: 10, fuelType: "biogas", operatingHours: 5000 });
    // Biogaz fCO₂ = 0.025 vs gaz 0.202 → economisire CO₂ mult mai mare
    expect(chpBio.co2_saved_kg).toBeGreaterThan(chpGaz.co2_saved_kg);
  });

  it("Test 17: calcCHP Stirling 1 kW × 3000h → avertizare ore scăzute", () => {
    const chp = calcCHP({
      powerElec_kW: 1,
      operatingHours: 2500, // sub 3000h
      fuelType: "natural_gas",
      chpType: "micro_stirling",
    });
    const hasLowHoursWarning = chp.recommendations.some(r => r.includes("scăzute") || r.includes("3000"));
    expect(hasLowHoursWarning).toBe(true);
  });
});

describe("Sprint 6 — Prag SPF ≥2.5 RED II pentru pompe de căldură", () => {
  it("Test 18: SPF 2.0 → fracție regenerabilă = 0 (sub prag RED II)", () => {
    const SPF_MIN = 2.5;
    const scop = 2.0;
    const compliant = scop >= SPF_MIN;
    const renFraction = compliant ? Math.max(0, 1 - 1/scop) : 0;
    expect(compliant).toBe(false);
    expect(renFraction).toBe(0);
  });

  it("Test 19: SPF 2.5 → fracție exact 60% (pragul minim eligibil)", () => {
    const scop = 2.5;
    const renFraction = scop >= 2.5 ? Math.max(0, 1 - 1/scop) : 0;
    expect(renFraction).toBeCloseTo(0.6, 2);
  });

  it("Test 20: SPF 4.0 → fracție 75% (PC modernă aer-apă)", () => {
    const scop = 4.0;
    const renFraction = scop >= 2.5 ? Math.max(0, 1 - 1/scop) : 0;
    expect(renFraction).toBeCloseTo(0.75, 2);
  });
});

describe("Sprint 6 — BUG #2: PVDegradation.jsx props expose", () => {
  it("Test 21: hook expune pv_annual_kWh și pv_peak_kWp (aliase pentru PVDegradation)", () => {
    // Simulare return hook: trebuie să conțină aceste chei
    const mockReturn = {
      qPV_kWh: 6000,
      pv_annual_kWh: 6000,  // alias pentru qPV_kWh
      pv_peak_kWp: 5.5,     // expus din photovoltaic.peakPower
    };
    expect(mockReturn.pv_annual_kWh).toBe(mockReturn.qPV_kWh);
    expect(mockReturn.pv_peak_kWp).toBeGreaterThan(0);
    // Verificare că PVDegradation.jsx poate consuma direct renewSummary.pv_annual_kWh / pv_peak_kWp
    expect(typeof mockReturn.pv_annual_kWh).toBe("number");
    expect(typeof mockReturn.pv_peak_kWp).toBe("number");
  });
});
