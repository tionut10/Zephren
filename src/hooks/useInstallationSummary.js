import { useMemo } from "react";
import {
  HEAT_SOURCES, FUELS, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL,
} from "../data/constants.js";
import { WATER_TEMP_MONTH } from "../data/energy-classes.js";
import { FP_ELEC } from "../data/u-reference.js";
import { calcACMen15316 } from "../calc/acm-en15316.js";

// Mapare acm.source (ACM_SOURCES) → acmSource enum din calcACMen15316
// Acoperă toate cele 18 surse din constants.js
const ACM_SOURCE_TO_ENGINE = {
  CAZAN_H: "ct_gaz",
  BOILER_G: "ct_gaz", BOILER_G_COND: "ct_gaz", BOILER_GPL: "ct_gaz",
  INSTANT_G: "ct_gaz", COGEN_ACM: "ct_gaz", CENTRALIZAT_BLOC: "ct_gaz",
  BOILER_BIOMASA: "ct_gaz", SOLAR_GAZ: "ct_gaz",
  BOILER_E: "boiler_electric", BOILER_E_NOAPTE: "boiler_electric",
  INSTANT_E: "boiler_electric", SOLAR_AUX: "boiler_electric",
  PC_ACM: "pc", PC_ACM_ERV: "pc", DESUPERHEATER: "pc", SOLAR_PC: "pc",
  TERMO_ACM: "termoficare",
};

/**
 * useInstallationSummary — calcul energie finală și primară per instalație
 * Extras din energy-calc.jsx Sprint 4 refactoring.
 * Conform Mc 001-2022, EN 15316, EN 15193-1, EN 15241.
 *
 * @param {object} params
 * @param {object} params.envelopeSummary  — rezultat din useEnvelopeSummary
 * @param {Array}  params.monthlyISO       — rezultat lunar din ISO 13790
 * @param {object} params.building         — date clădire
 * @param {object} params.heating          — parametri sistem încălzire
 * @param {object} params.acm              — parametri ACM
 * @param {object} params.cooling          — parametri răcire
 * @param {object} params.ventilation      — parametri ventilare
 * @param {object} params.lighting         — parametri iluminat
 * @param {object} params.selectedClimate  — date climatice
 * @param {boolean} params.useNA2023       — factor energie ambientală (NA:2023 vs Mc001 vechi)
 *
 * @returns {object|null} instSummary
 */
export function useInstallationSummary({
  envelopeSummary,
  monthlyISO,
  building,
  heating,
  acm,
  cooling,
  ventilation,
  lighting,
  selectedClimate,
  useNA2023,
}) {
  return useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !envelopeSummary) return null;

    // ── HEATING ──
    const src = HEAT_SOURCES.find(s => s.id === heating.source);
    const fuel = FUELS.find(f => f.id === (src?.fuel || "gaz"));
    const eta_gen = parseFloat(heating.eta_gen) || 0.85;
    const eta_em = parseFloat(heating.eta_em) || 0.93;
    const eta_dist = parseFloat(heating.eta_dist) || 0.95;
    const eta_ctrl = parseFloat(heating.eta_ctrl) || 0.93;
    const isCOP = src?.isCOP || false;
    const eta_total_h = isCOP
      ? eta_em * eta_dist * eta_ctrl
      : eta_gen * eta_em * eta_dist * eta_ctrl;

    const ngz = selectedClimate?.ngz || 3170;
    let qH_nd, qC_nd_calc;
    if (monthlyISO) {
      qH_nd = monthlyISO.reduce((s, m) => s + m.qH_nd, 0);
      qC_nd_calc = monthlyISO.reduce((s, m) => s + m.qC_nd, 0);
    } else {
      const gm = { RI: 7, RC: 7, RA: 7, BI: 15, ED: 12, SA: 10, HC: 8, CO: 15, SP: 10, AL: 10 };
      qH_nd = Math.max(0,
        (24 * envelopeSummary.G * V * 0.9 * ngz / 1000) - (gm[building.category] || 7) * Au
      );
      qC_nd_calc = 0;
    }
    const qH_nd_m2 = Au > 0 ? qH_nd / Au : 0;

    // Energie finală încălzire
    let qf_h;
    if (isCOP) {
      qf_h = qH_nd / (eta_em * eta_dist * eta_ctrl * eta_gen);
    } else {
      qf_h = eta_total_h > 0 ? qH_nd / eta_total_h : 0;
    }

    // ── ACM — delegare completă către calcACMen15316 (EN 15316-3/5/4-3) ──
    const nConsumers = parseFloat(acm.consumers) || (Au > 0 ? Math.max(1, Math.round(Au / 30)) : 2);
    const dailyL = parseFloat(acm.dailyLiters) || 0; // 0 → folosește tabelul ACM_CONSUMPTION_SPECIFIC
    const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
    const isCOPacm = acmSrc?.isCOP || false;
    const isCazanH = acm.source === "CAZAN_H";
    // eta/COP: pentru CAZAN_H → eta încălzire; altfel valoarea din ACM_SOURCES
    const eta_acm = isCazanH ? eta_gen : (acmSrc?.eta || eta_gen);
    const acmEngineKey = ACM_SOURCE_TO_ENGINE[acm.source] || "ct_gaz";
    const solarFr = acmSrc?.solarFraction || 0;
    const pipeThickness = acm.pipeInsulationThickness || (acm.pipeInsulated === false ? "fara" : "20mm");
    const hasPipeInsulation = pipeThickness !== "fara";

    // Parsare storageVolume: 0 explicit (fără stocare) vs. gol (folosește default)
    const storageRaw = acm.storageVolume;
    const storageVolume_L = storageRaw === "0" || storageRaw === 0
      ? 0
      : (parseFloat(storageRaw) || null);

    const acmDetailed = calcACMen15316({
      category: building.category,
      nPersons: nConsumers,
      consumptionLevel: acm.consumptionLevel || "med",
      tSupply: parseFloat(acm.tSupply) || 55,
      climateZone: selectedClimate?.zone || "III",
      climate: selectedClimate,
      hasPipeInsulation,
      hasCirculation: !!acm.circRecirculation,
      insulationClass: acm.insulationClass || "B",
      pipeLength_m: parseFloat(acm.pipeLength) || null,
      pipeDiameter_mm: parseFloat(acm.pipeDiameter) || 22,
      storageVolume_L,
      acmSource: acmEngineKey,
      etaGenerator: isCOPacm ? null : eta_acm,
      copACM: isCOPacm ? eta_acm : null,
      solarFraction: solarFr,
      dailyLitersOverride: dailyL > 0 ? dailyL : null,
      // Sprint 3 — pompă circulație + Legionella
      circPumpType: acm.circPumpType || "standard",
      circHours_per_day: parseFloat(acm.circHours) || null,
      hasLegionella: !!acm.hasLegionella,
      legionellaFreq: acm.legionellaFreq || (acm.hasLegionella ? "weekly" : "none"),
      legionellaT: parseFloat(acm.legionellaT) || 70,
    });

    const qACM_nd = acmDetailed?.Q_nd_annual_kWh || 0;
    const qf_w = acmDetailed?.Q_final_kWh || 0;
    const acmFuel = isCazanH
      ? fuel
      : FUELS.find(f => f.id === (acmSrc?.fuel || "electricitate"));

    // ── COOLING ──
    const hasCool = cooling.hasCooling && cooling.system !== "NONE";
    const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
    const coolArea = parseFloat(cooling.cooledArea) || Au;
    const qC_nd = hasCool
      ? (qC_nd_calc > 0 ? qC_nd_calc * (coolArea / Au) : coolArea * 25)
      : 0;
    const eer = parseFloat(cooling.eer) || coolSys?.eer || 3.5;
    const qf_c = hasCool && eer > 0 ? qC_nd / eer : 0;
    const coolFuel = coolSys ? FUELS.find(f => f.id === coolSys.fuel) : null;

    // ── VENTILARE — EN 16798-3 / Mc 001-2022 Partea III ──
    // SFP în VENTILATION_TYPES e în kW/(m³/s): P_fan [W] = sfp × (m³/s) × 1000
    // Fix Sprint 1 (17 apr 2026): elimin `/1000` eronat care subestima qf_v cu factor 1000×
    const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const airflowRaw = parseFloat(ventilation.airflow);
    // Clamp airflow: respinge negative/NaN; aplică fallback igienic 0.5 h⁻¹ × V (Mc 001 min locuințe)
    const airflow = (isFinite(airflowRaw) && airflowRaw > 0) ? airflowRaw : (V * 0.5); // m³/h
    const sfp = ventType?.sfp || 0;   // kW/(m³/s)
    // Default ventHours: 8760 h/an pentru sisteme mecanice (funcționare continuă);
    // doar ventilația naturală depinde de sezonul de încălzire
    const isNat = ventilation.type === "NAT" || sfp === 0;
    const ventHoursRaw = parseFloat(ventilation.operatingHours);
    const ventHours = (isFinite(ventHoursRaw) && ventHoursRaw >= 0 && ventHoursRaw <= 8760)
      ? ventHoursRaw
      : (isNat ? 0 : 8760);
    // Sursa de adevăr pentru P_fan: fanPower (W) din UI dacă e valid, altfel derivat din SFP × debit
    const fanPowerRaw = parseFloat(ventilation.fanPower);
    const P_fan_W = (isFinite(fanPowerRaw) && fanPowerRaw > 0)
      ? fanPowerRaw
      : sfp * (airflow / 3600) * 1000; // kW/(m³/s) × m³/s × 1000 = W
    const qf_v = P_fan_W * ventHours / 1000; // W × h / 1000 = kWh/an
    // η_rec clamped la [0, 0.95] — recuperator real nu depășește 95% (EN 308 / Passivhaus)
    const hrRaw = ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : null;
    const hrClamped = (hrRaw !== null && isFinite(hrRaw)) ? Math.max(0, Math.min(0.95, hrRaw)) : null;
    const hrEta = ventType?.hasHR
      ? (hrClamped !== null ? hrClamped : ventType.hrEta || 0)
      : 0;

    // ── ILUMINAT (LENI) — EN 15193-1 ──
    const pDens = parseFloat(lighting.pDensity) || 4.5;
    const fCtrl = parseFloat(lighting.fCtrl) || 1.0;
    const lightHours = parseFloat(lighting.operatingHours) || 1800;
    const natRatio = (parseFloat(lighting.naturalLightRatio) || 30) / 100;
    const foMap = { RI: 0.90, RC: 0.90, RA: 0.90, BI: 0.80, ED: 0.75, SA: 1.00, HC: 0.95, CO: 0.85, SP: 0.70, AL: 0.85 };
    const fo = foMap[building.category] || 0.85;
    const nightFracMap = { RI: 0.30, RC: 0.30, RA: 0.30, BI: 0.10, ED: 0.05, SA: 0.45, HC: 0.40, CO: 0.20, SP: 0.15, AL: 0.25 };
    const nightFrac = nightFracMap[building.category] || 0.25;
    const tD = lightHours * (1 - nightFrac);
    const tN = lightHours * nightFrac;
    const fD = Math.max(0, 1 - natRatio * 0.65);
    const leni = pDens * fCtrl * (tD * fo * fD + tN * fo) / 1000;
    const qf_l = leni * Au;

    // ── Auxiliar electric pompă circulație ACM (Sprint 3) ──
    const W_aux_acm_kWh = acmDetailed?.W_circ_pump_kWh || 0;

    // ── TOTAL ENERGIE FINALĂ ──
    const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l + W_aux_acm_kWh;
    const qf_total_m2 = Au > 0 ? qf_total / Au : 0;

    // ── ENERGIE PRIMARĂ — descompunere fP_nren / fP_ren conform ISO 52000-1/NA:2023 ──
    // Pompe de căldură: energia ambientală (qH_nd - qf_h) cu fP_ambient
    let ep_h, ep_nren_h, ep_ren_h;
    if (isCOP) {
      const fP_elec = fuel?.fP_tot || FP_ELEC;
      const fP_nren_elec = fuel?.fP_nren ?? 2.62;
      const fP_ren_elec = fuel?.fP_ren ?? 0.0;
      const qAmbient_h = Math.max(0, qH_nd - qf_h);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_h = qf_h * fP_elec + qAmbient_h * fP_ambient;
      ep_nren_h = qf_h * fP_nren_elec;
      ep_ren_h = qf_h * fP_ren_elec + qAmbient_h * (useNA2023 ? 1.0 : 0);
    } else {
      ep_h = qf_h * (fuel?.fP_tot || 1.17);
      ep_nren_h = qf_h * (fuel?.fP_nren ?? 1.10);
      ep_ren_h = qf_h * (fuel?.fP_ren ?? 0.07);
    }
    let ep_w, ep_nren_w, ep_ren_w;
    if (isCOPacm) {
      const fP_elec = acmFuel?.fP_tot || FP_ELEC;
      const fP_nren_elec = acmFuel?.fP_nren ?? 2.62;
      const fP_ren_elec = acmFuel?.fP_ren ?? 0.0;
      const qAmbient_w = Math.max(0, qACM_nd - qf_w);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_w = qf_w * fP_elec + qAmbient_w * fP_ambient;
      ep_nren_w = qf_w * fP_nren_elec;
      ep_ren_w = qf_w * fP_ren_elec + qAmbient_w * (useNA2023 ? 1.0 : 0);
    } else {
      ep_w = qf_w * (acmFuel?.fP_tot || fuel?.fP_tot || 1.17);
      ep_nren_w = qf_w * (acmFuel?.fP_nren ?? fuel?.fP_nren ?? 1.10);
      ep_ren_w = qf_w * (acmFuel?.fP_ren ?? fuel?.fP_ren ?? 0.07);
    }
    const ep_c = qf_c * (coolFuel?.fP_tot || FP_ELEC);
    const ep_nren_c = qf_c * (coolFuel?.fP_nren ?? 2.62);
    const ep_ren_c = qf_c * (coolFuel?.fP_ren ?? 0.0);
    const ep_v = qf_v * FP_ELEC;
    const ep_nren_v = qf_v * 2.62;
    const ep_ren_v = qf_v * 0.0;
    const ep_l = qf_l * FP_ELEC;
    const ep_nren_l = qf_l * 2.62;
    const ep_ren_l = qf_l * 0.0;

    // Auxiliar pompă ACM — întotdeauna electric (indiferent de combustibil ACM)
    const ep_aux_acm = W_aux_acm_kWh * FP_ELEC;
    const ep_nren_aux_acm = W_aux_acm_kWh * 2.62;
    const ep_ren_aux_acm = 0;

    const ep_total = ep_h + ep_w + ep_c + ep_v + ep_l + ep_aux_acm;
    const ep_total_m2 = Au > 0 ? ep_total / Au : 0;
    const ep_nren_total = ep_nren_h + ep_nren_w + ep_nren_c + ep_nren_v + ep_nren_l + ep_nren_aux_acm;
    const ep_ren_total = ep_ren_h + ep_ren_w + ep_ren_c + ep_ren_v + ep_ren_l + ep_ren_aux_acm;
    const ep_nren_m2 = Au > 0 ? ep_nren_total / Au : 0;
    const ep_ren_m2 = Au > 0 ? ep_ren_total / Au : 0;

    // ── CO2 ──
    const co2_h = qf_h * (fuel?.fCO2 || 0.20);
    const co2_w = qf_w * (acmFuel?.fCO2 || fuel?.fCO2 || 0.20);
    const co2_c = qf_c * (coolFuel?.fCO2 || 0.107);
    const co2_v = qf_v * 0.107;
    const co2_l = qf_l * 0.107;
    const co2_aux_acm = W_aux_acm_kWh * 0.107;
    const co2_total = co2_h + co2_w + co2_c + co2_v + co2_l + co2_aux_acm;
    const co2_total_m2 = Au > 0 ? co2_total / Au : 0;

    return {
      qH_nd, qH_nd_m2, eta_total_h, qf_h,
      qACM_nd, qf_w, nConsumers,
      qC_nd, qf_c, hasCool,
      qf_v, hrEta,
      leni, qf_l,
      qf_total, qf_total_m2,
      ep_h, ep_w, ep_c, ep_v, ep_l, ep_total, ep_total_m2,
      ep_nren_h, ep_nren_w, ep_nren_c, ep_nren_v, ep_nren_l, ep_nren_total, ep_nren_m2,
      ep_ren_h, ep_ren_w, ep_ren_c, ep_ren_v, ep_ren_l, ep_ren_total, ep_ren_m2,
      co2_h, co2_w, co2_c, co2_v, co2_l, co2_total, co2_total_m2,
      fuel, isCOP,
      // ACM detaliat EN 15316 — sursă unică de adevăr pentru Step 3, 5, 6, 8, CPE
      acmDetailed, isCOPacm, acmFuel,
      // Sprint 3 — auxiliar pompă circulație ACM (electric)
      W_aux_acm_kWh, ep_aux_acm, co2_aux_acm,
    };
  }, [
    building.areaUseful, building.volume, building.category,
    envelopeSummary, selectedClimate,
    heating, acm, cooling, ventilation, lighting, monthlyISO, useNA2023,
  ]);
}
