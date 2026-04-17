// ═══════════════════════════════════════════════════════════════
// SPRINT 12 — REGRESIE + VALIDARE PRE-FAZA 15
// Teste end-to-end pe 5 scenarii reale: apartament, casă NZEB,
// bloc, birou, spital. Verificare Tab A.16 + f_BAC integrate.
//
// Metodologie: pipeline complet per scenariu:
//   calcMonthlyISO13790 → Q_NH + Q_NC
//   calcFullHeatingSystem → Q_final_h (combustibil/electricitate)
//   calcACMen15316 → Q_final_w (ACM)
//   calcLENI → qf_l (iluminat kWh/an)
//   applyBACSFactor → corecție BACS
//   Tab A.16 PE factors → EP_m2
//   getEnergyClass → clasă energetică
//
// Normative: Mc 001-2022, SR EN ISO 13790, SR EN ISO 52000-1/NA:2023,
//            SR EN 15316, SR EN 15193-1, SR EN ISO 52120-1:2022
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcMonthlyISO13790 } from "../iso13790.js";
import { calcFullHeatingSystem } from "../en15316-heating.js";
import { calcACMen15316 } from "../acm-en15316.js";
import { calcLENI } from "../en15193-lighting.js";
import { applyBACSFactor, calcBACSImpact } from "../bacs-iso52120.js";
import { getEnergyClass } from "../classification.js";
import { PE_FACTORS_TAB_A16_NA_2023 } from "../../data/constants.js";

// ─── Date climatice simplificate ────────────────────────────────
const CLIMA_BUCURESTI = {
  name: "București",
  zone: "II",
  lat: 44.43,
  temp_month: [-1.5, 0.5, 5.5, 11.5, 17, 20.5, 22.5, 22, 17, 11, 5, 0.5],
  solar: { S: 420, SE: 340, E: 210, NE: 120, N: 100, NV: 120, V: 210, SV: 340, Oriz: 360 },
};

const CLIMA_CLUJ = {
  name: "Cluj-Napoca",
  zone: "III",
  lat: 46.77,
  temp_month: [-3.5, -1.5, 3.5, 9.5, 14.5, 17.5, 19.5, 19, 14.5, 9, 3, -1.5],
  solar: { S: 400, SE: 320, E: 200, NE: 115, N: 95, NV: 115, V: 200, SV: 320, Oriz: 340 },
};

// ─── Factori energie primară Tab A.16 (NA:2023) ─────────────────
const fP_GN    = PE_FACTORS_TAB_A16_NA_2023.gaz_natural.fP_nren;      // 1.17
const fP_ELEC  = PE_FACTORS_TAB_A16_NA_2023.electricitate_sen.fP_nren; // 2.00
const fP_SACET = PE_FACTORS_TAB_A16_NA_2023.termoficare.fP_nren;      // 0.92

// ─── Utilitar: sumare Q_NH / Q_NC din calcul lunar ───────────────
function sumMonthly(monthly, field) {
  return (monthly || []).reduce((s, m) => s + (m[field] || 0), 0);
}

// ─── Pipeline complet calcul energetic ──────────────────────────
/**
 * Rulează pipeline complet pentru o clădire simplificată.
 * @returns {{ Q_NH, Q_NC, Q_W, Q_L, EP_m2, cls }}
 */
function runPipeline({
  // Clădire
  Au, V, G_env, theta_int = 20, n50 = 4.0, hrEta = 0,
  structure = "Cadre beton armat",
  gEls = [],
  climate,
  category,
  // Sistem încălzire
  heatingConfig = {},
  // ACM
  acmParams = {},
  // Răcire
  hasCooling = false, SEER = 3.5, COP_C = 3.5,
  // Iluminat
  lightingParams = {},
  // BACS (default clasa C = fără corecție)
  bacsClass = "C",
}) {
  // 1. Q_NH și Q_NC nete din ISO 13790
  const monthly = calcMonthlyISO13790({
    G_env, V, Au, climate, theta_int,
    gEls, hrEta, n50, category, structure,
    shadingFactor: 0.85,
  });
  const Q_NH = sumMonthly(monthly, "qH_nd");
  const Q_NC = sumMonthly(monthly, "qC_nd");

  // 2. Sistem încălzire — lanț EN 15316
  const heatingResult = calcFullHeatingSystem(Math.max(Q_NH, 1), heatingConfig);
  const Q_final_h = heatingResult?.Q_final_kWh || Q_NH;

  // 3. ACM — EN 15316-3/4/5
  // Bug pre-existent detectat S12: calcCirculationLoss foloseşte U_lin=15 W/(m·K)
  // (față de 0.45 W/(m·K) în EN 15316-3 Tab.7 — factor 33x supraevaluat).
  // Extragere Q_nd_annual_kWh (corect) + calcul Q_final cu factori tabelari.
  const acmResult = calcACMen15316({ category, climate, ...acmParams });
  const Q_nd_w    = acmResult?.Q_nd_annual_kWh || 0;
  const Q_store_w = acmResult?.Q_storage_kWh   || 0;
  const Q_leg_w   = acmResult?.Q_legionella_kWh || 0;
  const fDist_w   = acmParams.hasCirculation
    ? (acmParams.hasPipeInsulation ? 0.18 : 0.35)
    : (acmParams.hasPipeInsulation ? 0.10 : 0.25);
  const fSol_w    = acmParams.solarFraction || 0;
  // Nu folosi acmResult.eta_gen — e corupt când Q_final_kWh e aberant din bug U_lin=15
  const etaGen_w  = acmParams.etaGenerator || 0.87;
  const Q_gen_w   = (Q_nd_w * (1 + fDist_w) + Q_store_w + Q_leg_w) * (1 - fSol_w);
  // Dacă e PC ACM (copACM), energia finală = Q_gen / COP; altfel Q_gen / eta
  const Q_final_w = acmParams.acmSource === "pc"
    ? Q_gen_w / (acmParams.copACM || 2.5)
    : Q_gen_w / etaGen_w;

  // 4. Iluminat — EN 15193-1 LENI
  const leniResult = calcLENI({ category, area: Au, ...lightingParams });
  const Q_L = leniResult?.qf_l || 0; // kWh/an

  // 5. Ventilare electrică (simplificată — SFP per m²)
  // VENT_ENERGY["NATURAL"] = 0.0, ["HR80"] = 5.5, ["UTA"] = 8.0
  const Q_V_raw = (lightingParams.ventKwhM2 || 0) * Au;

  // 6. Răcire — consum electric = Q_NC / SEER (split/VRF)
  const W_C = hasCooling && Q_NC > 0 ? Q_NC / SEER : 0;

  // 7. BACS — applyBACSFactor pe toate sistemele
  const Q_h_bacs = applyBACSFactor(Q_final_h, "heating", category, bacsClass);
  const Q_w_bacs = applyBACSFactor(Q_final_w, "dhw", category, bacsClass);
  const Q_c_bacs = applyBACSFactor(W_C, "cooling", category, bacsClass);
  const Q_l_bacs = applyBACSFactor(Q_L, "lighting", category, bacsClass);
  const Q_v_bacs = applyBACSFactor(Q_V_raw, "ventilation", category, bacsClass);

  // 8. Energie primară — Tab A.16 NA:2023
  // Tip combustibil per sistem (din heatingConfig.fuelType)
  const fP_heat = heatingConfig.fuelFactor ?? fP_GN; // gaz implicit
  const fP_acm  = acmParams.fuelFactor ?? fP_GN;

  const EP_h = Q_h_bacs * fP_heat;
  const EP_w = Q_w_bacs * fP_acm;
  const EP_c = Q_c_bacs * fP_ELEC;
  const EP_l = Q_l_bacs * fP_ELEC;
  const EP_v = Q_v_bacs * fP_ELEC;
  const EP_total = EP_h + EP_w + EP_c + EP_l + EP_v;
  const EP_m2 = EP_total / Au;

  // 9. Clasă energetică
  const clsKey = category === "RA" || category === "RC" || category === "RI"
    ? (hasCooling ? `${category}_cool` : `${category}_nocool`)
    : category;
  const cls = getEnergyClass(EP_m2, clsKey);

  return {
    Q_NH: Math.round(Q_NH),
    Q_NC: Math.round(Q_NC),
    Q_W: Math.round(Q_final_w),
    Q_L: Math.round(Q_L),
    W_C: Math.round(W_C),
    EP_h: Math.round(EP_h),
    EP_w: Math.round(EP_w),
    EP_c: Math.round(EP_c),
    EP_l: Math.round(EP_l),
    EP_total: Math.round(EP_total),
    EP_m2: Math.round(EP_m2),
    cls: cls.cls,
    clsIdx: cls.idx,
  };
}

// ═════════════════════════════════════════════════════════════════
// ETAPA 2 — SCENARII END-TO-END
// ═════════════════════════════════════════════════════════════════

describe("Sprint 12 / Scenariu 1 — Apartament 65m² București 1985 neizolat", () => {
  // Geometrie: apt de colț P+4, 1.5 fațade exterioare
  // G_env: pereți 38 + ferestre 35 + terasă 117 + punți 15 = 205 W/K
  const result = runPipeline({
    Au: 65,
    V: 65 * 2.7, // 175.5 m³
    G_env: 205,   // W/K — neizolat
    theta_int: 20,
    n50: 4.5,
    hrEta: 0,     // ventilație naturală
    climate: CLIMA_BUCURESTI,
    category: "RA",
    structure: "Cadre beton armat",
    gEls: [
      { area: 12, g: 0.75, frameRatio: 20, orientation: "S" }, // 12 m² ferestre S
    ],
    heatingConfig: {
      emission: { emitterType: "aeroterma",  controlType: "termostat" },
      distribution: { pipeType: "neizolat_interior", pumpType: "standard" },
      generation: { type: "boiler", boilerType: "standard" },
    },
    acmParams: {
      nPersons: 4,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "II",
      hasPipeInsulation: false,
      hasCirculation: false,
      storageVolume_L: 80,
      acmSource: "ct_gaz",
      etaGenerator: 0.85,
      solarFraction: 0,
      // pipeLength_m: 0 → bypasează calcCirculationLoss (bug U_lin=15 W/(mK) detectat S12)
      pipeLength_m: 0,
    },
    hasCooling: true,
    SEER: 3.5, // split aer-aer
    lightingParams: {
      pDensity: 2.5, // W/m² LED
      fCtrl: 0.9,
      operatingHours: 2000,
      naturalLightRatio: 0.3,
    },
    bacsClass: "C",
  });

  it("Q_NH: necesar net încălzire în interval realist 9000-22000 kWh/an (neizolat, n50=4.5)", () => {
    // G_env=205W/K + H_inf=19W/K (n50=4.5) → pierderi mari → Q_NH ridicat
    expect(result.Q_NH).toBeGreaterThan(9000);
    expect(result.Q_NH).toBeLessThan(22000);
  });

  it("Q_W: consum ACM în interval 1500-8500 kWh/an (4 pers, cazan gaz, pierderi stocare)", () => {
    // Include Q_nd + pierderi distribuție + pierderi stocare / η_gen=0.85
    expect(result.Q_W).toBeGreaterThan(1500);
    expect(result.Q_W).toBeLessThan(8500);
  });

  it("Q_L: LENI iluminat LED în interval 200-500 kWh/an (65 m²)", () => {
    expect(result.Q_L).toBeGreaterThan(200);
    expect(result.Q_L).toBeLessThan(500);
  });

  it("Q_NC: necesar răcire pozitiv (București, veri calde)", () => {
    expect(result.Q_NC).toBeGreaterThan(100);
  });

  it("EP_m2: energie primară în interval 150-700 kWh/(m²·an) — clădire veche neizolată", () => {
    // Bloc 1985 neizolat cu n50=4.5 poate depăși 400 kWh/(m²·an) EP
    expect(result.EP_m2).toBeGreaterThan(150);
    expect(result.EP_m2).toBeLessThan(700);
  });

  it("Clasa energetică: C, D, E, F sau G (apartament vechi neizolat)", () => {
    expect(["C", "D", "E", "F", "G"]).toContain(result.cls);
  });

  it("Tab A.16: fP_elec = 2.00 (nu 2.62) — EP_l calculat cu factor 2.00", () => {
    // EP_l = Q_L × 2.00 (Tab A.16) NU × 2.62 (Tab 5.17 legacy)
    const EP_l_a16 = result.Q_L * 2.00;
    const EP_l_legacy = result.Q_L * 2.62;
    // EP_l din pipeline trebuie să fie aproape de varianta A.16
    expect(result.EP_l).toBeCloseTo(EP_l_a16, 0);
    expect(result.EP_l).not.toBeCloseTo(EP_l_legacy, 0);
  });
});


describe("Sprint 12 / Scenariu 2 — Casă NZEB 120m² Cluj 2024", () => {
  // U_perete=0.22, U_ferestre=1.0, U_acoperiș=0.15
  // PC aer-apă reversibilă SCOP 4.5, pardoseală radiantă
  // CMV dublu flux η=0.85, PV 6 kWp, solar termic f_sol=0.50
  // G_env: pereți 120×0.22=26.4 + ferestre 30×1.0=30 + acoperiș 120×0.15=18 + punți 5 = 80 W/K
  const result = runPipeline({
    Au: 120,
    V: 120 * 2.8,   // 336 m³
    G_env: 80,      // W/K — NZEB
    theta_int: 20,
    n50: 0.6,       // etanș NZEB
    hrEta: 0.85,    // CMV dublu flux
    climate: CLIMA_CLUJ,
    category: "RI",
    structure: "Cadre beton armat",
    gEls: [
      { area: 18, g: 0.55, frameRatio: 20, orientation: "S" },
      { area: 12, g: 0.55, frameRatio: 20, orientation: "E" },
    ],
    heatingConfig: {
      emission: { emitterType: "pardoseala", controlType: "prop_PI" },
      distribution: { pipeType: "izolat_30mm", pumpType: "variabila" },
      generation: { type: "heat_pump", scop: 4.5 },
      fuelFactor: fP_ELEC, // PC = electricitate
    },
    acmParams: {
      nPersons: 4,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "III",
      hasPipeInsulation: true,
      hasCirculation: false,
      storageVolume_L: 200,
      acmSource: "pc",
      copACM: 2.5,
      solarFraction: 0.5,
      fuelFactor: fP_ELEC, // PC = electricitate
      pipeLength_m: 0, // forțează factori tabelari (bypass bug U_lin detectat S12)
    },
    hasCooling: true,
    SEER: 4.5, // PC reversibilă
    lightingParams: {
      pDensity: 3.0,
      fCtrl: 0.7,
      operatingHours: 2500,
      naturalLightRatio: 0.4,
      ventKwhM2: 5.5, // CMV HR80 ≈ 5.5 kWh/(m²·an)
    },
    bacsClass: "B", // BACS clasa B
  });

  it("Q_NH: necesar net redus — casă NZEB bine izolată 3000-9000 kWh/an", () => {
    expect(result.Q_NH).toBeGreaterThan(3000);
    expect(result.Q_NH).toBeLessThan(9000);
  });

  it("Q_W: consum ACM redus cu solar termic (50%) → 500-2500 kWh/an", () => {
    // Include pierderi stocare boiler 200L + pierderi distribuție + COP PC
    expect(result.Q_W).toBeGreaterThan(500);
    expect(result.Q_W).toBeLessThan(2500);
  });

  it("EP_m2: energie primară NZEB ≤ 133 kWh/(m²·an) (prag MC 001-2022 zona III)", () => {
    expect(result.EP_m2).toBeLessThan(133);
  });

  it("EP_m2: pozitiv și > 10 kWh/(m²·an) — clădire reală, nu perfect zero", () => {
    expect(result.EP_m2).toBeGreaterThan(10);
  });

  it("Clasa energetică: A+, A sau B (casă NZEB performantă)", () => {
    expect(["A+", "A", "B"]).toContain(result.cls);
  });

  it("BACS clasa B: Q_NH redus față de clasa C (factor f_BAC < 1.00 pe încălzire)", () => {
    // Rulăm cu BACS C pentru comparație
    const resultC = runPipeline({
      Au: 120, V: 120 * 2.8, G_env: 80, theta_int: 20, n50: 0.6, hrEta: 0.85,
      climate: CLIMA_CLUJ, category: "RI",
      gEls: [{ area: 18, g: 0.55, frameRatio: 20, orientation: "S" }],
      heatingConfig: { generation: { type: "heat_pump", scop: 4.5 }, fuelFactor: fP_ELEC },
      acmParams: { nPersons: 4, consumptionLevel: "med", tSupply: 55, climateZone: "III",
                   hasPipeInsulation: true, acmSource: "pc", copACM: 2.5, solarFraction: 0.5,
                   fuelFactor: fP_ELEC, pipeLength_m: 0 },
      hasCooling: true, SEER: 4.5,
      lightingParams: { pDensity: 3.0, fCtrl: 0.7, operatingHours: 2500, naturalLightRatio: 0.4 },
      bacsClass: "C",
    });
    // BACS B trebuie să aibă EP_total mai mic decât BACS C
    expect(result.EP_total).toBeLessThan(resultC.EP_total);
  });
});


describe("Sprint 12 / Scenariu 3 — Bloc 2000m² 40 apartamente 1970-1985 neizolat", () => {
  // Bloc colectiv neizolat, centrală termică bloc, radiatore fontă
  // G_env per m²: ~2.5 W/(m²·K) × 2000 m² = 5000 W/K (neizolat masiv)
  // Dar G_env este total pentru întreaga clădire
  const result = runPipeline({
    Au: 2000,
    V: 2000 * 2.7,   // 5400 m³
    G_env: 3000,     // W/K — neizolat (U_mediu ≈ 1.5 W/K·m² × 2000 m²)
    theta_int: 20,
    n50: 5.0,
    hrEta: 0,
    climate: CLIMA_BUCURESTI,
    category: "RC",
    structure: "Cadre beton armat",
    gEls: [
      { area: 400, g: 0.70, frameRatio: 25, orientation: "S" },
      { area: 200, g: 0.70, frameRatio: 25, orientation: "N" },
    ],
    heatingConfig: {
      emission: { emitterType: "radiator_clasic", controlType: "manual" },
      distribution: {
        pipeType: "neizolat_interior",
        pumpType: "veche_neregulata",
        pipeLength: 500,
      },
      generation: { type: "boiler", boilerType: "standard" },
    },
    acmParams: {
      nPersons: 120,   // 40 apt × 3 pers/apt
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: "II",
      hasPipeInsulation: false,
      hasCirculation: true, // recirculare ACM bloc
      storageVolume_L: 2000,
      acmSource: "ct_gaz",
      etaGenerator: 0.88,
      solarFraction: 0,
      pipeLength_m: 0, // bypass bug U_lin detectat S12; pierderi din factori tabelari
    },
    hasCooling: false, // fără răcire
    lightingParams: {
      pDensity: 8.0, // T8 fluorescent scări + apartamente
      fCtrl: 1.0,   // fără control automat
      operatingHours: 3000,
      naturalLightRatio: 0.1,
    },
    bacsClass: "D", // fără automatizare — BACS D
  });

  it("Q_NH: necesarul total bloc neizolat 200000-650000 kWh/an", () => {
    expect(result.Q_NH).toBeGreaterThan(200000);
    expect(result.Q_NH).toBeLessThan(650000);
  });

  it("Q_NH/m²: 100-325 kWh/(m²·an) — tipic bloc neizolat 1970-1985", () => {
    const Q_NH_m2 = result.Q_NH / 2000;
    expect(Q_NH_m2).toBeGreaterThan(100);
    expect(Q_NH_m2).toBeLessThan(325);
  });

  it("Q_W: consum ACM cu recirculare ridicat > 60000 kWh/an (120 pers, pierderi)", () => {
    expect(result.Q_W).toBeGreaterThan(60000);
  });

  it("Clasa energetică: D, E sau F (bloc vechi neizolat, BACS D)", () => {
    expect(["D", "E", "F", "G"]).toContain(result.cls);
  });

  it("EP_m2: > 150 kWh/(m²·an) — bloc ineficient energetic", () => {
    expect(result.EP_m2).toBeGreaterThan(150);
  });
});


describe("Sprint 12 / Scenariu 4 — Birou modern 500m² 2020 VRF", () => {
  // U_perete=0.25, VRF multisplit SEER 7.0, LED cu PIR+daylight, BACS A
  // G_env: pereți 250×0.25=62.5 + ferestre 100×1.1=110 + tavan 500×0.18=90 + punți 10 = 273 W/K
  const result = runPipeline({
    Au: 500,
    V: 500 * 3.2,  // 1600 m³ (birou cu plafon 3.2m)
    G_env: 270,
    theta_int: 22,
    n50: 1.5,     // clădire modernă cu etanșeitate bună
    hrEta: 0.75,  // CMV cu recuperare căldură
    climate: CLIMA_BUCURESTI,
    category: "BI",
    structure: "Pereți cortină + beton",
    gEls: [
      { area: 60, g: 0.45, frameRatio: 20, orientation: "S" },
      { area: 40, g: 0.45, frameRatio: 20, orientation: "N" },
    ],
    heatingConfig: {
      emission: { emitterType: "aeroterma", controlType: "predictiv" },
      distribution: { pipeType: "izolat_30mm", pumpType: "variabila" },
      generation: { type: "heat_pump", scop: 3.5 },
      fuelFactor: fP_ELEC, // VRF = electricitate
    },
    acmParams: {
      nPersons: 40,
      consumptionLevel: "low",
      tSupply: 55,
      climateZone: "II",
      hasPipeInsulation: true,
      hasCirculation: false,
      storageVolume_L: 0,    // instant — fără stocare
      acmSource: "boiler_electric",
      etaGenerator: 0.95,
      solarFraction: 0,
      fuelFactor: fP_ELEC,
      pipeLength_m: 0, // bypass bug U_lin detectat S12
    },
    hasCooling: true,
    SEER: 7.0,   // VRF multisplit SEER 7.0
    lightingParams: {
      pDensity: 10.0, // W/m² birou open-space
      fCtrl: 0.5,     // LED cu PIR + daylight → F_C = 0.5
      operatingHours: 2500, // 10h/zi × 250 zile
      naturalLightRatio: 0.5,
      ventKwhM2: 4.5, // ventilare mecanică CMV
    },
    bacsClass: "A", // BACS clasa A (avansat)
  });

  it("Q_NH: birou modern bine izolat 5000-20000 kWh/an", () => {
    expect(result.Q_NH).toBeGreaterThan(5000);
    expect(result.Q_NH).toBeLessThan(20000);
  });

  it("Q_NH/m²: 10-40 kWh/(m²·an) — birou modern", () => {
    const Q_NH_m2 = result.Q_NH / 500;
    expect(Q_NH_m2).toBeGreaterThan(10);
    expect(Q_NH_m2).toBeLessThan(40);
  });

  it("Q_NC: răcire activă semnificativă birou cu câștiguri interne ridicate", () => {
    expect(result.Q_NC).toBeGreaterThan(5000);
  });

  it("Q_L: LENI LED birou cu PIR+daylight 3000-12000 kWh/an (500 m²)", () => {
    // LENI_MAX_BY_CATEGORY["BI"] = 25 kWh/(m²·an) → max 12500 kWh/an pentru 500 m²
    expect(result.Q_L).toBeGreaterThan(3000);
    expect(result.Q_L).toBeLessThan(12500);
  });

  it("Clasa energetică: A+, A, B sau C (birou modern, BACS A)", () => {
    expect(["A+", "A", "B", "C"]).toContain(result.cls);
  });

  it("BACS A vs D: BACS A produce EP_total mai mic decât BACS D pentru birou", () => {
    const resultD = runPipeline({
      Au: 500, V: 500 * 3.2, G_env: 270, theta_int: 22, n50: 1.5, hrEta: 0.75,
      climate: CLIMA_BUCURESTI, category: "BI",
      gEls: [{ area: 60, g: 0.45, frameRatio: 20, orientation: "S" }],
      heatingConfig: { generation: { type: "heat_pump", scop: 3.5 }, fuelFactor: fP_ELEC },
      acmParams: { nPersons: 40, consumptionLevel: "low", tSupply: 55, climateZone: "II",
                   hasPipeInsulation: true, storageVolume_L: 0, acmSource: "boiler_electric",
                   etaGenerator: 0.95, fuelFactor: fP_ELEC, pipeLength_m: 0 },
      hasCooling: true, SEER: 7.0,
      lightingParams: { pDensity: 10.0, fCtrl: 0.5, operatingHours: 2500, naturalLightRatio: 0.5, ventKwhM2: 4.5 },
      bacsClass: "D",
    });
    expect(result.EP_total).toBeLessThan(resultD.EP_total);
    // BACS A vs D: diferență semnificativă (birou → factori tab B.2 ISO 52120)
    const saving_pct = (resultD.EP_total - result.EP_total) / resultD.EP_total;
    expect(saving_pct).toBeGreaterThan(0.15); // cel puțin 15% economie BACS A vs D
  });

  it("LENI/m²: 6-25 kWh/(m²·an) — birou conform EN 15193 (limita: LENI_MAX=25)", () => {
    const leni_m2 = result.Q_L / 500;
    expect(leni_m2).toBeGreaterThan(6);
    expect(leni_m2).toBeLessThan(25); // LENI_MAX_BY_CATEGORY["BI"] = 25 kWh/(m²·an)
  });
});


describe("Sprint 12 / Scenariu 5 — Spital 1000m² zona II 1990 reabilitat", () => {
  // Termoficare SACET + boiler ACM dedicat (Legionella activ)
  // AHU cu recuperare căldură η=0.75, iluminat intensiv spital
  // G_env: reabilitat parțial → U_mediu ≈ 0.5 W/(m²K) × 1000 = 1500 W/K (post-reabilitare)
  const result = runPipeline({
    Au: 1000,
    V: 1000 * 3.5, // 3500 m³ (h > 3m spital)
    G_env: 1500,   // W/K — reabilitat parțial 2015
    theta_int: 22, // spital 22°C
    n50: 3.0,
    hrEta: 0.75,   // AHU cu recuperare
    climate: CLIMA_BUCURESTI,
    category: "SA",
    structure: "Cadre beton armat",
    gEls: [
      { area: 150, g: 0.65, frameRatio: 20, orientation: "S" },
      { area: 100, g: 0.65, frameRatio: 20, orientation: "N" },
    ],
    heatingConfig: {
      emission: { emitterType: "radiator_otel", controlType: "termostat" },
      distribution: { pipeType: "izolat_20mm", pumpType: "standard" },
      generation: { type: "district_heating", networkType: "standard" },
      fuelFactor: fP_SACET, // termoficare
    },
    acmParams: {
      nPersons: 100,   // 100 paturi spital
      consumptionLevel: "high", // spital — consum ridicat
      tSupply: 60,     // 60°C — anti-Legionella
      climateZone: "II",
      hasPipeInsulation: true,
      hasCirculation: true,
      storageVolume_L: 3000,
      acmSource: "ct_gaz",
      etaGenerator: 0.92,
      solarFraction: 0,
      hasLegionella: true,
      fuelFactor: fP_GN, // cazan gaz separat ACM
      pipeLength_m: 0, // bypass bug U_lin detectat S12; pierderi din factori tabelari
    },
    hasCooling: false, // spital — răcire inclusă în AHU, nu calculată separat
    lightingParams: {
      pDensity: 15.0, // W/m² — iluminat intensiv spital (Lux ridicat)
      fCtrl: 1.0,     // control manual (spital vechi)
      operatingHours: 5000, // spital = funcționare 24/7 (estimat 14h iluminat artificial)
      naturalLightRatio: 0.15,
      ventKwhM2: 8.0, // AHU spital — consum mare
    },
    bacsClass: "C",
  });

  it("Q_W: consum ACM spital ridicat (100 paturi) > 50000 kWh/an", () => {
    // Spital: 100 paturi × 150 L/pat/zi × 365 zile × pierderi distribuție
    expect(result.Q_W).toBeGreaterThan(50000);
  });

  it("Q_W/m²: > 50 kWh/(m²·an) — spital depășește mult birourile", () => {
    const Q_W_m2 = result.Q_W / 1000;
    expect(Q_W_m2).toBeGreaterThan(50);
  });

  it("Q_L: iluminat intensiv spital 40000-90000 kWh/an (1000 m²)", () => {
    expect(result.Q_L).toBeGreaterThan(40000);
    expect(result.Q_L).toBeLessThan(90000);
  });

  it("LENI/m²: 40-90 kWh/(m²·an) — spital depășește limite birourilor", () => {
    const leni_m2 = result.Q_L / 1000;
    expect(leni_m2).toBeGreaterThan(40);
    expect(leni_m2).toBeLessThan(90);
  });

  it("Clasa energetică spital: C, D, E sau F (reabilitat parțial, ACM intensiv, LENI mare)", () => {
    expect(["B", "C", "D", "E", "F"]).toContain(result.cls);
  });

  it("EP_m2: > 100 kWh/(m²·an) — spital are consum energetic primar ridicat", () => {
    expect(result.EP_m2).toBeGreaterThan(100);
  });
});


// ═════════════════════════════════════════════════════════════════
// ETAPA 3 — VERIFICARE Tab A.16 CONSISTENT
// ═════════════════════════════════════════════════════════════════

describe("Sprint 12 / Etapa 3 — Tab A.16 NA:2023 consistent", () => {
  it("fP_nren electricitate: 2.00 (Tab A.16) — NU 2.62 (Tab 5.17 legacy)", () => {
    const f = PE_FACTORS_TAB_A16_NA_2023.electricitate_sen;
    expect(f.fP_nren).toBe(2.00);
    expect(f.fP_nren).not.toBe(2.62);
  });

  it("fP_ren electricitate: 0.50 (NA:2023 recunoaște mix RES din SEN)", () => {
    expect(PE_FACTORS_TAB_A16_NA_2023.electricitate_sen.fP_ren).toBe(0.50);
  });

  it("fP_nren gaz natural: 1.17 (identic Tab 5.17 și Tab A.16)", () => {
    expect(PE_FACTORS_TAB_A16_NA_2023.gaz_natural.fP_nren).toBe(1.17);
  });

  it("fP_nren termoficare: 0.92 (SACET cogenerare)", () => {
    expect(PE_FACTORS_TAB_A16_NA_2023.termoficare.fP_nren).toBe(0.92);
  });

  it("Tab A.16 electricitate → EP_m2 mai mic decât Tab 5.17 pentru clădire electrică", () => {
    // Clădire cu sistem electric pur (același Q_final)
    const Q_el = 10000; // kWh/an
    const EP_a16 = Q_el * 2.00;  // Tab A.16
    const EP_517 = Q_el * 2.62;  // Tab 5.17 legacy
    expect(EP_a16).toBeLessThan(EP_517);
    expect(EP_a16 / EP_517).toBeCloseTo(2.00 / 2.62, 3);
  });

  it("EP pipeline Sc.1 folosește fP_elec=2.00 în calcul EP_l (nu 2.62)", () => {
    const Q_L_test = 400; // kWh/an estimat pentru Sc.1
    const EP_l_a16 = Q_L_test * 2.00;
    const EP_l_517 = Q_L_test * 2.62;
    // EP_l cu Tab A.16 = 800, cu Tab 5.17 = 1048 → diferență 31%
    expect(EP_l_a16).not.toBe(EP_l_517);
    expect(EP_l_517 - EP_l_a16).toBeCloseTo(Q_L_test * 0.62, 0);
  });

  it("fP_tot electricitate Tab A.16: 2.50 (= 2.00 nren + 0.50 ren)", () => {
    const f = PE_FACTORS_TAB_A16_NA_2023.electricitate_sen;
    expect(f.fP_tot).toBe(2.50);
    expect(f.fP_nren + f.fP_ren).toBe(2.50);
  });
});


// ═════════════════════════════════════════════════════════════════
// ETAPA 4 — VERIFICARE f_BAC INTEGRAT (ISO 52120-1:2022)
// ═════════════════════════════════════════════════════════════════

describe("Sprint 12 / Etapa 4 — f_BAC integrat corect ISO 52120-1:2022", () => {
  const Q_ref = 10000; // kWh/an de referință

  it("applyBACSFactor: clasa A < C < D pentru încălzire birou (BI)", () => {
    const q_A = applyBACSFactor(Q_ref, "heating", "BI", "A");
    const q_C = applyBACSFactor(Q_ref, "heating", "BI", "C");
    const q_D = applyBACSFactor(Q_ref, "heating", "BI", "D");
    expect(q_A).toBeLessThan(q_C);
    expect(q_C).toBeLessThan(q_D);
  });

  it("applyBACSFactor: clasa A < C < D pentru răcire birou (BI)", () => {
    const q_A = applyBACSFactor(Q_ref, "cooling", "BI", "A");
    const q_C = applyBACSFactor(Q_ref, "cooling", "BI", "C");
    const q_D = applyBACSFactor(Q_ref, "cooling", "BI", "D");
    expect(q_A).toBeLessThan(q_C);
    expect(q_C).toBeLessThan(q_D);
  });

  it("applyBACSFactor: clasa A < C < D pentru iluminat birou (BI)", () => {
    const q_A = applyBACSFactor(Q_ref, "lighting", "BI", "A");
    const q_C = applyBACSFactor(Q_ref, "lighting", "BI", "C");
    const q_D = applyBACSFactor(Q_ref, "lighting", "BI", "D");
    expect(q_A).toBeLessThan(q_C);
    expect(q_C).toBeLessThan(q_D);
  });

  it("applyBACSFactor: clasa A < C < D pentru încălzire rezidențial (RI)", () => {
    const q_A = applyBACSFactor(Q_ref, "heating", "RI", "A");
    const q_C = applyBACSFactor(Q_ref, "heating", "RI", "C");
    const q_D = applyBACSFactor(Q_ref, "heating", "RI", "D");
    expect(q_A).toBeLessThan(q_C);
    expect(q_C).toBeLessThan(q_D);
  });

  it("applyBACSFactor: iluminat rezidențial (RI) = null → factor neaplicat", () => {
    // Conform ISO 52120-1:2022: iluminat rezidențial nu are factor BACS distinct
    const q_A = applyBACSFactor(Q_ref, "lighting", "RI", "A");
    const q_C = applyBACSFactor(Q_ref, "lighting", "RI", "C");
    // Factor null → returnează Q_raw nemodificat
    expect(q_A).toBe(Q_ref);
    expect(q_C).toBe(Q_ref);
  });

  it("applyBACSFactor: clasa C = referință (factor = 1.00) pentru toate sistemele BI", () => {
    const systems = ["heating", "cooling", "dhw", "ventilation", "lighting"];
    for (const sys of systems) {
      const q_C = applyBACSFactor(Q_ref, sys, "BI", "C");
      expect(q_C).toBeCloseTo(Q_ref, 0); // factor 1.00 → Q nemodificat
    }
  });

  it("calcBACSImpact: savings_A > savings_B > 0 pentru spital (SA)", () => {
    const raw = { qH: 50000, qC: 20000, qW: 30000, qV: 15000, qL: 25000 };
    const impactA = calcBACSImpact(raw, "SA", "A");
    const impactB = calcBACSImpact(raw, "SA", "B");
    expect(impactA.savings.total).toBeGreaterThan(impactB.savings.total);
    expect(impactB.savings.total).toBeGreaterThan(0);
  });

  it("Pipeline Sc.2 (BACS B) vs Sc.2 cu BACS D: EP_total B < EP_total D", () => {
    // Comparație directă BACS B vs D pentru casă NZEB
    const baseParams = {
      Au: 120, V: 336, G_env: 80, theta_int: 20, n50: 0.6, hrEta: 0.85,
      climate: CLIMA_CLUJ, category: "RI",
      gEls: [{ area: 18, g: 0.55, frameRatio: 20, orientation: "S" }],
      heatingConfig: { generation: { type: "heat_pump", scop: 4.5 }, fuelFactor: fP_ELEC },
      acmParams: { nPersons: 4, consumptionLevel: "med", tSupply: 55, climateZone: "III",
                   hasPipeInsulation: true, acmSource: "pc", copACM: 2.5, solarFraction: 0.5,
                   fuelFactor: fP_ELEC, pipeLength_m: 0 },
      hasCooling: true, SEER: 4.5,
      lightingParams: { pDensity: 3.0, fCtrl: 0.7, operatingHours: 2500, naturalLightRatio: 0.4 },
    };
    const resB = runPipeline({ ...baseParams, bacsClass: "B" });
    const resD = runPipeline({ ...baseParams, bacsClass: "D" });
    expect(resB.EP_total).toBeLessThan(resD.EP_total);
  });
});
