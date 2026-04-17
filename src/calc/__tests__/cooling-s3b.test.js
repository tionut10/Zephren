// ═══════════════════════════════════════════════════════════════
// TESTE INTEGRARE Sprint 3b — RĂCIRE PARTEA 2 (17 apr 2026)
// Fix-uri verificate:
//   #4 W_aux (pompe + ventilatoare) EN 15316-4-2 — consum auxiliar separat
//   #5 Free cooling nocturn EN 16798-9 — reducere Q_NC (20-40%)
//   #6 Integrare calcNightVentilation cu Q_NC (cuplaj night-vent)
//   #7 Override tipologie aporturi interne (CIBSE Tab. 6.3)
// Branch: sprint-03b-racire-fix
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcCoolingHourly } from "../cooling-hourly.js";
import { calcNightVentilation } from "../night-ventilation.js";
import {
  COOLING_SYSTEMS,
  COOLING_HOURS_BY_ZONE,
  COOLING_HOURS_DEFAULT,
} from "../../data/constants.js";

// Helper: reproduce logica COMPLETĂ din useInstallationSummary.js secțiunea COOLING
// inclusiv fix-urile S3a + S3b (W_aux + night vent + override aporturi)
function calcCoolingS3b(cooling, envelope, climate, building) {
  const Au = parseFloat(building.areaUseful) || 0;
  const V = parseFloat(building.volume) || 0;
  const hasCool = cooling.hasCooling && cooling.system !== "NONE";
  const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
  const coolArea = parseFloat(cooling.cooledArea) || Au;

  // #7 — Override tipologie aporturi
  const mapCategoryToGains = (cat) => {
    const MAP = {
      RI: "residential", RC: "residential", RA: "residential",
      BI: "office", AD: "office", SC: "school", ED: "school",
      SA: "hospital", CO: "retail",
    };
    return MAP[cat] || "office";
  };
  const gainsOverride = cooling.internalGainsOverride;
  const internalGainsType = (gainsOverride && gainsOverride !== "")
    ? gainsOverride
    : mapCategoryToGains(building.category);

  // #1 Q_NC raw din cooling-hourly sau lunar
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
      internalGainsType,
      shadingExternal: parseFloat(cooling.shadingExternal) || 0.7,
    });
    qC_nd_hourly = (r && r.Q_annual_kWh > 0) ? r.Q_annual_kWh : null;
  }
  const qC_nd_calc = envelope?.qC_nd_lunar || 0;
  const qC_nd_raw = hasCool
    ? (qC_nd_hourly != null
      ? qC_nd_hourly
      : (qC_nd_calc > 0 ? qC_nd_calc * (coolArea / Au) : coolArea * 25))
    : 0;

  // #5+#6 Free cooling nocturn
  let nightVentResult = null;
  let Q_night_vent_reduction = 0;
  if (hasCool && cooling.hasNightVent && qC_nd_raw > 0) {
    const structureMass_J = {
      "Structură metalică": 80000, "Structură lemn": 80000,
      "Panouri prefabricate mari": 165000, "Cadre beton armat": 165000,
      "Zidărie portantă": 260000, "Pereți cortină + beton": 165000,
      "BCA + cadre beton": 165000, "Structură mixtă": 165000,
    }[building.structure || "Structură mixtă"] || 165000;
    const thermalMass_kJ = structureMass_J / 1000;
    const zoneKey = climate?.zone || "III";
    const seasonDaysMap = { I: 100, II: 110, III: 120, IV: 130, V: 140 };
    const days_cooling_season = seasonDaysMap[zoneKey] || 120;
    const tempMonth = climate?.temp_month;
    const tJul = (Array.isArray(tempMonth) && tempMonth.length === 12) ? tempMonth[6] : 23;
    const tAug = (Array.isArray(tempMonth) && tempMonth.length === 12) ? tempMonth[7] : 23;
    const theta_ext_night_avg = Math.max(10, (tJul + tAug) / 2 - 4);
    const HDD_cool = Array.isArray(tempMonth) && tempMonth.length === 12
      ? [5, 6, 7].reduce((s, m) => s + Math.max(0, (tempMonth[m] - 18) * 30), 0)
      : 150;
    nightVentResult = calcNightVentilation({
      Au: coolArea,
      V,
      n_night: parseFloat(cooling.n_night) || 2.0,
      theta_int_day: parseFloat(cooling.setpoint) || 26,
      theta_ext_night_avg,
      HDD_cool,
      days_cooling_season,
      comfortCategory: cooling.comfortCategory || "II",
      thermalMass: thermalMass_kJ,
    });
    const max_reduction = qC_nd_raw * 0.40;
    Q_night_vent_reduction = nightVentResult.feasible
      ? Math.min(max_reduction, nightVentResult.Q_free_cooling_kWh)
      : 0;
  }
  const qC_nd = Math.max(0, qC_nd_raw - Q_night_vent_reduction);

  // #2 SEER
  const eerRaw = parseFloat(cooling.eer);
  const seerRaw = parseFloat(cooling.seer);
  const eer = (isFinite(eerRaw) && eerRaw > 0) ? eerRaw : (coolSys?.eer || 3.5);
  const seer = (isFinite(seerRaw) && seerRaw > 0)
    ? seerRaw
    : ((coolSys && coolSys.seer > 0) ? coolSys.seer : eer * 1.8);

  // #3 η separate
  const eta_em_c = parseFloat(cooling.eta_em) || 0.97;
  const eta_dist_c = parseFloat(cooling.eta_dist) || 0.95;
  const eta_ctrl_c = parseFloat(cooling.eta_ctrl) || 0.96;
  const eta_total_c = eta_em_c * eta_dist_c * eta_ctrl_c;

  const qf_c_compressor = hasCool && seer > 0 && eta_total_c > 0
    ? qC_nd / (seer * eta_total_c)
    : 0;

  // #4 W_aux (pompe + ventilatoare)
  const P_aux_pumps_kW = Math.max(0, parseFloat(cooling.P_aux_pumps) || 0);
  const P_aux_fans_kW = Math.max(0, parseFloat(cooling.P_aux_fans) || 0);
  const t_cool_override = parseFloat(cooling.t_cooling_hours);
  const zoneK = climate?.zone || "III";
  const t_cooling_hours = (isFinite(t_cool_override) && t_cool_override > 0 && t_cool_override <= 8760)
    ? t_cool_override
    : ((COOLING_HOURS_BY_ZONE[building.category] && COOLING_HOURS_BY_ZONE[building.category][zoneK])
      || COOLING_HOURS_DEFAULT);
  const qf_c_aux_pumps = hasCool ? P_aux_pumps_kW * t_cooling_hours : 0;
  const qf_c_aux_fans = hasCool ? P_aux_fans_kW * t_cooling_hours : 0;
  const qf_c_aux_total = qf_c_aux_pumps + qf_c_aux_fans;

  const qf_c = qf_c_compressor + qf_c_aux_total;

  return {
    qC_nd_raw, qC_nd, qf_c, qf_c_compressor,
    qf_c_aux_pumps, qf_c_aux_fans, qf_c_aux_total,
    t_cooling_hours,
    Q_night_vent_reduction, nightVentResult,
    internalGainsType,
    seer, eta_total_c,
  };
}

// ──────────── Date test comune ────────────
const climateBucuresti = {
  temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1],
  zone: "III",
};

const climateDobrogea = {
  temp_month: [-1, 1, 6, 13, 19, 24, 27, 27, 21, 13, 6, 1],
  zone: "V",
};

const envelopeStandard = {
  glazingElements: [
    { area: 8, orientation: "S", g: 0.6, u: 1.8 },
    { area: 4, orientation: "V", g: 0.6, u: 1.8 },
  ],
  opaqueElements: [
    { area: 15, type: "PE", u: 0.8 },
  ],
  qC_nd_lunar: 800,
};

// ═══════════════════════════════════════════════════════════════
// BUG #4 — W_aux (pompe + ventilatoare)
// ═══════════════════════════════════════════════════════════════

describe("Sprint 3b Bug #4 — W_aux (EN 15316-4-2)", () => {
  it("Test 1 — E_aux = (P_pompe + P_ventilatoare) × t_operare", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "CHILLER_W_CTR", eer: "6.0",
        P_aux_pumps: "2.5",      // 2.5 kW pompe
        P_aux_fans: "1.5",       // 1.5 kW ventilatoare
        t_cooling_hours: "1500", // 1500 h/an explicit
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "BI" }
    );
    expect(result.qf_c_aux_pumps).toBe(2.5 * 1500);   // 3750 kWh/an
    expect(result.qf_c_aux_fans).toBe(1.5 * 1500);    // 2250 kWh/an
    expect(result.qf_c_aux_total).toBe(6000);
    expect(result.t_cooling_hours).toBe(1500);
  });

  it("Test 2 — Default ore din COOLING_HOURS_BY_ZONE[categ][zona] când override absent", () => {
    // Birou (BI) zona III → 1200 h/an din tabel
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "CHILLER_W", eer: "5.0",
        P_aux_pumps: "1.0",
        P_aux_fans: "0.5",
        // t_cooling_hours absent → default
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti, // zona III
      { areaUseful: "500", volume: "1500", category: "BI" }
    );
    expect(result.t_cooling_hours).toBe(1200); // BI × zona III
    expect(result.qf_c_aux_total).toBe(1.5 * 1200); // 1800 kWh/an
  });

  it("Test 3 — Zona V (extrem, Dobrogea) → ore mai mari pentru aceeași categorie", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "CHILLER_W",
        P_aux_pumps: "1.0", P_aux_fans: "0.5",
        useHourly: false,
      },
      envelopeStandard,
      climateDobrogea, // zona V
      { areaUseful: "500", volume: "1500", category: "BI" }
    );
    // BI × V = 1800 h > BI × III = 1200 h (50% mai multe ore)
    expect(result.t_cooling_hours).toBe(1800);
    expect(result.qf_c_aux_total).toBe(2700);
  });

  it("Test 4 — qf_c = qf_c_compressor + qf_c_aux_total (aditiv)", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0", seer: "6.0",
        P_aux_pumps: "0.5", P_aux_fans: "0.3",
        t_cooling_hours: "1000",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178", category: "RI" }
    );
    // qf_c trebuie să fie exact suma celor două componente
    expect(result.qf_c).toBeCloseTo(result.qf_c_compressor + result.qf_c_aux_total, 4);
    expect(result.qf_c_aux_total).toBe(800); // (0.5 + 0.3) × 1000
  });

  it("Test 5 — P_aux = 0 → E_aux = 0 (backward compat fără câmp nou)", () => {
    // Cazul unui proiect vechi fără câmpurile S3b completate
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        useHourly: false,
        // P_aux_pumps/P_aux_fans absent → 0
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178", category: "RI" }
    );
    expect(result.qf_c_aux_pumps).toBe(0);
    expect(result.qf_c_aux_fans).toBe(0);
    expect(result.qf_c).toBeCloseTo(result.qf_c_compressor, 4);
  });
});

// ═══════════════════════════════════════════════════════════════
// BUG #5+#6 — Free cooling nocturn + night-ventilation cuplat
// ═══════════════════════════════════════════════════════════════

describe("Sprint 3b Bug #5+#6 — Free cooling nocturn (EN 16798-9)", () => {
  it("Test 6 — Fezabilitate DA (București ΔT ~4K) → reducere aplicată", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0", seer: "6.0",
        hasNightVent: true,
        n_night: "2.0", comfortCategory: "II",
        setpoint: "26",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti, // (24+24)/2 - 4 = 20 → ΔT = 26-20 = 6K fezabil
      { areaUseful: "500", volume: "1500", category: "BI", structure: "Cadre beton armat" }
    );
    expect(result.nightVentResult).not.toBeNull();
    expect(result.nightVentResult.feasible).toBe(true);
    expect(result.Q_night_vent_reduction).toBeGreaterThan(0);
    expect(result.qC_nd).toBeLessThan(result.qC_nd_raw);
  });

  it("Test 7 — Fezabilitate NU (ΔT insuficient) → zero reducere", () => {
    // Climat cu temp nocturnă apropiată de setpoint → ΔT sub 3K
    const climateCald = {
      temp_month: [5, 7, 12, 18, 24, 28, 30, 30, 25, 18, 12, 7],
      zone: "III",
    };
    // theta_ext_night = (30+30)/2 - 4 = 26 = setpoint → ΔT = 0
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        hasNightVent: true,
        n_night: "2.0", comfortCategory: "I", // cat. I cere ΔT ≥ 3K
        setpoint: "26",
        useHourly: false,
      },
      envelopeStandard,
      climateCald,
      { areaUseful: "500", volume: "1500", category: "BI", structure: "Cadre beton armat" }
    );
    expect(result.nightVentResult.feasible).toBe(false);
    expect(result.Q_night_vent_reduction).toBe(0);
    expect(result.qC_nd).toBe(result.qC_nd_raw); // neafectat
  });

  it("Test 8 — Reducere capped la 40% din Q_NC (EN 16798-9 realistic)", () => {
    // Scenariu cu potențial foarte mare night-vent (hală mare cu masă termică)
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "CHILLER_W_CTR", seer: "7.5",
        hasNightVent: true,
        n_night: "5.0", // rată foarte mare
        comfortCategory: "IV",
        setpoint: "26",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "BI", structure: "Zidărie portantă" }
    );
    // Reducerea NU poate depăși 40% din qC_nd_raw
    const max_allowed = result.qC_nd_raw * 0.40;
    expect(result.Q_night_vent_reduction).toBeLessThanOrEqual(max_allowed + 0.01);
    // qC_nd rămâne ≥ 60% din qC_nd_raw
    expect(result.qC_nd).toBeGreaterThanOrEqual(result.qC_nd_raw * 0.60 - 0.01);
  });

  it("Test 9 — Night vent dezactivat (default) → zero impact", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        // hasNightVent: false implicit
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "BI" }
    );
    expect(result.nightVentResult).toBeNull();
    expect(result.Q_night_vent_reduction).toBe(0);
    expect(result.qC_nd).toBe(result.qC_nd_raw);
  });
});

// ═══════════════════════════════════════════════════════════════
// BUG #7 — Override tipologie aporturi interne
// ═══════════════════════════════════════════════════════════════

describe("Sprint 3b Bug #7 — Override tipologie aporturi interne", () => {
  it("Test 10 — Auto: categoria BI → office (implicit)", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        // internalGainsOverride absent → auto
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "BI" }
    );
    expect(result.internalGainsType).toBe("office");
  });

  it("Test 11 — Override manual: 'hospital' chiar dacă categoria e RI", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        internalGainsOverride: "hospital",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "RI" } // rezidențial
    );
    expect(result.internalGainsType).toBe("hospital"); // override aplicat
  });

  it("Test 12 — Override '' (empty string) → fallback la auto", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", seer: "6.0",
        internalGainsOverride: "", // explicit empty
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "500", volume: "1500", category: "SC" } // școală
    );
    expect(result.internalGainsType).toBe("school"); // auto-map din SC
  });
});

// ═══════════════════════════════════════════════════════════════
// Regresie AUDIT_09 — S3b nu strică fix-urile S3a
// ═══════════════════════════════════════════════════════════════

describe("Sprint 3b — Regresie (nu strică fix-urile S3a)", () => {
  it("Test 13 — Fără P_aux + fără night-vent → qf_c identic cu formula S3a", () => {
    const result = calcCoolingS3b(
      {
        hasCooling: true, system: "SPLIT_INV", eer: "4.0", seer: "6.10",
        eta_em: "0.97", eta_dist: "0.95", eta_ctrl: "0.96",
        useHourly: false,
      },
      envelopeStandard,
      climateBucuresti,
      { areaUseful: "65", volume: "178", category: "RI" }
    );
    // qC_nd_lunar = 800, coolArea/Au = 1, deci qC_nd_raw = 800
    // qf_c_compressor = 800 / (6.10 × 0.97 × 0.95 × 0.96) = 800 / 5.40 ≈ 148.2
    expect(result.qC_nd).toBe(800);
    expect(result.qf_c_aux_total).toBe(0);
    expect(result.qf_c).toBeCloseTo(800 / (6.10 * 0.97 * 0.95 * 0.96), 1);
  });

  it("Test 14 — COOLING_HOURS_BY_ZONE acoperă toate categoriile principale", () => {
    const requiredCats = ["RI", "RC", "RA", "BI", "AD", "CO", "SC", "ED", "SA", "HC", "SP", "AL"];
    requiredCats.forEach(cat => {
      expect(COOLING_HOURS_BY_ZONE[cat]).toBeDefined();
      // Fiecare categorie are toate 5 zone climatice
      expect(COOLING_HOURS_BY_ZONE[cat].I).toBeGreaterThan(0);
      expect(COOLING_HOURS_BY_ZONE[cat].V).toBeGreaterThan(COOLING_HOURS_BY_ZONE[cat].I);
    });
  });
});
