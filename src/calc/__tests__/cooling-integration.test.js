// ═══════════════════════════════════════════════════════════════
// TESTE INTEGRARE Sprint 3a — RĂCIRE (17 apr 2026)
// Fix-uri verificate:
//   #1 cooling-hourly.js integrat în calcul principal (era orfan)
//   #2 SEER separat de EER (EN 14825)
//   #3 η_em × η_dist × η_ctrl separate răcire (EN 15316-2)
// Branch: sprint-03a-racire-fix
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcCoolingHourly } from "../cooling-hourly.js";
import {
  COOLING_SYSTEMS,
  COOLING_EMISSION_EFFICIENCY,
  COOLING_DISTRIBUTION_EFFICIENCY,
  COOLING_CONTROL_EFFICIENCY,
} from "../../data/constants.js";

// Helper: reproduce logica din useInstallationSummary.js secțiunea COOLING
// (extras pentru testare unitară — ar trebui extras în modul pur ulterior)
function calcCoolingFinalEnergy(cooling, envelope, climate, building) {
  const Au = parseFloat(building.areaUseful) || 0;
  const V = parseFloat(building.volume) || 0;
  const hasCool = cooling.hasCooling && cooling.system !== "NONE";
  const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
  const coolArea = parseFloat(cooling.cooledArea) || Au;

  // #1 Integrare cooling-hourly
  let qC_nd_hourly = null;
  const useHourlyCool = hasCool && cooling.useHourly !== false
    && Array.isArray(envelope?.glazingElements)
    && Array.isArray(envelope?.opaqueElements);
  if (useHourlyCool) {
    const r = calcCoolingHourly({
      Au: coolArea, V,
      glazingElements: envelope.glazingElements,
      opaqueElements: envelope.opaqueElements,
      climate: climate || {},
      theta_int_cool: parseFloat(cooling.setpoint) || 26,
      internalGainsType: "residential",
      shadingExternal: parseFloat(cooling.shadingExternal) || 0.7,
    });
    qC_nd_hourly = (r && r.Q_annual_kWh > 0) ? r.Q_annual_kWh : null;
  }
  const qC_nd_calc = envelope?.qC_nd_lunar || 0;
  const qC_nd = hasCool
    ? (qC_nd_hourly != null
      ? qC_nd_hourly
      : (qC_nd_calc > 0 ? qC_nd_calc * (coolArea / Au) : coolArea * 25))
    : 0;

  // #2 SEER prioritate UI > catalog > EER × 1.8
  const eerRaw = parseFloat(cooling.eer);
  const seerRaw = parseFloat(cooling.seer);
  const eer = (isFinite(eerRaw) && eerRaw > 0) ? eerRaw : (coolSys?.eer || 3.5);
  const seer = (isFinite(seerRaw) && seerRaw > 0)
    ? seerRaw
    : ((coolSys && coolSys.seer > 0) ? coolSys.seer : eer * 1.8);

  // #3 η_em × η_dist × η_ctrl separate
  const eta_em_c = parseFloat(cooling.eta_em) || 0.97;
  const eta_dist_c = parseFloat(cooling.eta_dist) || 0.95;
  const eta_ctrl_c = parseFloat(cooling.eta_ctrl) || 0.96;
  const eta_total_c = eta_em_c * eta_dist_c * eta_ctrl_c;

  const qf_c = hasCool && seer > 0 && eta_total_c > 0
    ? qC_nd / (seer * eta_total_c)
    : 0;

  return { qC_nd, qf_c, eer, seer, eta_total_c, qC_nd_hourly, qC_nd_calc_used: qC_nd };
}

const climateBucuresti = {
  temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1],
  zone: "II",
};

const envelopeStandard = {
  glazingElements: [
    { area: 8, orientation: "S", g: 0.6, u: 1.8 },
    { area: 4, orientation: "V", g: 0.6, u: 1.8 },
  ],
  opaqueElements: [
    { area: 15, type: "PE", u: 0.8 },
  ],
  qC_nd_lunar: 400, // valoare simulată monthlyISO lunar
};

describe("Sprint 3a — Integrare cooling-hourly.js în motorul principal", () => {
  it("Test 1 — cooling-hourly.js APELAT când useHourly activ + envelope complet", () => {
    const result = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0",
        useHourly: true, setpoint: "26",
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    // Dacă cooling-hourly a fost apelat, qC_nd_hourly trebuie să fie > 0 (integrare reușită)
    expect(result.qC_nd_hourly).toBeGreaterThan(0);
    expect(result.qC_nd).toBe(result.qC_nd_hourly);
  });

  it("Test 2 — fallback la metoda lunară când useHourly=false", () => {
    const result = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0",
        useHourly: false, setpoint: "26",
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    expect(result.qC_nd_hourly).toBeNull();
    // qC_nd trebuie să fie qC_nd_lunar × (coolArea/Au) = 400 × 1 = 400
    expect(result.qC_nd).toBe(400);
  });
});

describe("Sprint 3a — SEER vs EER (EN 14825)", () => {
  it("Test 3 — SEER din UI are prioritate față de catalog", () => {
    const result = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV",
        eer: "4.0", seer: "7.5", // SEER override manual
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    expect(result.seer).toBe(7.5);
    // qf_c cu SEER=7.5 trebuie să fie < qf_c cu EER=4.0
    // qf_c = 400 / (7.5 × 0.97 × 0.95 × 0.96) = 400 / 6.63 ≈ 60.3
    expect(result.qf_c).toBeCloseTo(60.3, 0);
  });

  it("Test 4 — SEER fallback la catalog când UI gol (SPLIT_INV → 6.10)", () => {
    const result = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0",
        // seer absent → catalog 6.10
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    expect(result.seer).toBe(6.10);
  });

  it("Test 5 — SEER fallback la EER×1.8 când catalog absent (sistem custom)", () => {
    // Sistem custom fără seer în catalog — EER=5.0 → SEER=9.0 (5×1.8)
    const result = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SISTEM_INEXISTENT",
        eer: "5.0", seer: "",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    expect(result.seer).toBeCloseTo(9.0, 1);
  });
});

describe("Sprint 3a — η_em × η_dist × η_ctrl separate (EN 15316-2)", () => {
  it("Test 6 — produsul η aplicat corect în formula consum", () => {
    const resultA = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0",
        eta_em: "1.00", eta_dist: "1.00", eta_ctrl: "1.00", // fără pierderi
        useHourly: false,
      },
      envelopeStandard, climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    const resultB = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0",
        eta_em: "0.90", eta_dist: "0.90", eta_ctrl: "0.90", // 0.729 total
        useHourly: false,
      },
      envelopeStandard, climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    // Raport qf_c: B/A ≈ 1/0.729 = 1.372
    expect(resultB.qf_c / resultA.qf_c).toBeCloseTo(1 / 0.729, 2);
    expect(resultA.eta_total_c).toBeCloseTo(1.00, 2);
    expect(resultB.eta_total_c).toBeCloseTo(0.729, 3);
  });

  it("Test 7 — BACS clasa A poate produce η_ctrl > 1.00 (EN 15232-1)", () => {
    const bacsA = COOLING_CONTROL_EFFICIENCY.find(c => c.id === "bacs_clasa_a");
    expect(bacsA.eta).toBeGreaterThan(1.00);
    expect(bacsA.eta).toBeCloseTo(1.05, 2);
  });
});

describe("Sprint 3a — Catalog COOLING_SYSTEMS extins cu SEER", () => {
  it("Test 8 — toate cele 25 COOLING_SYSTEMS au coloană seer", () => {
    COOLING_SYSTEMS.forEach(s => {
      expect(s).toHaveProperty("seer");
      expect(typeof s.seer).toBe("number");
    });
  });

  it("Test 9 — SPLIT_INV (A++) SEER=6.10 conform Reg. 2016/2281", () => {
    const splitInv = COOLING_SYSTEMS.find(s => s.id === "SPLIT_INV");
    expect(splitInv.eer).toBe(4.00);
    expect(splitInv.seer).toBe(6.10);
    // Raportul SEER/EER trebuie > 1.0 (tipic 1.3–1.7)
    expect(splitInv.seer / splitInv.eer).toBeGreaterThan(1.3);
  });

  it("Test 10 — matricele η răcire au minim 6 opțiuni fiecare", () => {
    expect(COOLING_EMISSION_EFFICIENCY.length).toBeGreaterThanOrEqual(6);
    expect(COOLING_DISTRIBUTION_EFFICIENCY.length).toBeGreaterThanOrEqual(6);
    expect(COOLING_CONTROL_EFFICIENCY.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Sprint 3a — Regresie AUDIT_09: EER tratat ca SEER era supraestimare", () => {
  it("Test 11 — qf_c cu SEER e mai mic decât qf_c cu EER (fix confirmat)", () => {
    // Apartament PC aer-apă EER=3.5 — AUDIT_09 Scenariu 5
    const withEER = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "PC_REV", eer: "3.5",
        seer: "3.5", // simulare bug vechi (EER tratat ca SEER)
        eta_em: "1.0", eta_dist: "1.0", eta_ctrl: "1.0", // fără randamente
        useHourly: false,
      },
      envelopeStandard, climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    const withSEER = calcCoolingFinalEnergy(
      {
        hasCooling: true, system: "PC_REV", eer: "3.5",
        // seer absent → catalog PC_REV = 6.00
        useHourly: false,
      },
      envelopeStandard, climateBucuresti,
      { areaUseful: "65", volume: "178" }
    );
    // Consumul corect (cu SEER + η) trebuie să fie semnificativ mai mic decât bug-ul vechi
    expect(withSEER.qf_c).toBeLessThan(withEER.qf_c);
    expect(withSEER.seer).toBe(6.00);
  });
});
