import { useMemo } from "react";
import {
  HEAT_SOURCES, FUELS, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL,
} from "../data/constants.js";
import { WATER_TEMP_MONTH } from "../data/energy-classes.js";
import { FP_ELEC } from "../data/u-reference.js";

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

    // ── ACM ──
    const nConsumers = parseFloat(acm.consumers) || (Au > 0 ? Math.max(1, Math.round(Au / 30)) : 2);
    const dailyL = parseFloat(acm.dailyLiters) || 60;
    const qACM_nd = nConsumers * dailyL * WATER_TEMP_MONTH.reduce((s, tw, i) =>
      s + [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i] * 4.186 * (55 - tw) / 3600, 0
    );
    const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
    let eta_acm = acmSrc?.eta || eta_gen;
    if (acm.source === "CAZAN_H") eta_acm = eta_gen;
    const solarFr = acmSrc?.solarFraction || 0;
    const storageLoss = Math.min(10, Math.max(0, parseFloat(acm.storageLoss) || 2)) / 100;
    const qf_w = eta_acm > 0
      ? (acmSrc?.isCOP
          ? qACM_nd * (1 - solarFr) / eta_acm
          : qACM_nd * (1 - solarFr) * (1 + storageLoss) / eta_acm)
      : 0;
    const acmFuel = acm.source === "CAZAN_H"
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

    // ── VENTILARE ──
    const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const airflow = parseFloat(ventilation.airflow) || (V * 0.5);
    const sfp = ventType?.sfp || 0;
    const ventHours = parseFloat(ventilation.operatingHours) || (selectedClimate?.season || 190) * 16;
    const qf_v = (sfp * (airflow / 3600) * ventHours) / 1000;
    const hrEta = ventType?.hasHR
      ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : ventType.hrEta || 0)
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

    // ── TOTAL ENERGIE FINALĂ ──
    const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l;
    const qf_total_m2 = Au > 0 ? qf_total / Au : 0;

    // ── ENERGIE PRIMARĂ ──
    // Pompe de căldură: energia ambientală (qH_nd - qf_h) cu fP_ambient
    let ep_h;
    if (isCOP) {
      const fP_elec = fuel?.fP_tot || FP_ELEC;
      const qAmbient_h = Math.max(0, qH_nd - qf_h);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_h = qf_h * fP_elec + qAmbient_h * fP_ambient;
    } else {
      ep_h = qf_h * (fuel?.fP_tot || 1.17);
    }
    const acmIsCOP = ACM_SOURCES.find(a => a.id === acm.source)?.isCOP || false;
    let ep_w;
    if (acmIsCOP) {
      const fP_elec = acmFuel?.fP_tot || FP_ELEC;
      const qAmbient_w = Math.max(0, qACM_nd - qf_w);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_w = qf_w * fP_elec + qAmbient_w * fP_ambient;
    } else {
      ep_w = qf_w * (acmFuel?.fP_tot || fuel?.fP_tot || 1.17);
    }
    const ep_c = qf_c * (coolFuel?.fP_tot || FP_ELEC);
    const ep_v = qf_v * FP_ELEC;
    const ep_l = qf_l * FP_ELEC;
    const ep_total = ep_h + ep_w + ep_c + ep_v + ep_l;
    const ep_total_m2 = Au > 0 ? ep_total / Au : 0;

    // ── CO2 ──
    const co2_h = qf_h * (fuel?.fCO2 || 0.20);
    const co2_w = qf_w * (acmFuel?.fCO2 || fuel?.fCO2 || 0.20);
    const co2_c = qf_c * (coolFuel?.fCO2 || 0.107);
    const co2_v = qf_v * 0.107;
    const co2_l = qf_l * 0.107;
    const co2_total = co2_h + co2_w + co2_c + co2_v + co2_l;
    const co2_total_m2 = Au > 0 ? co2_total / Au : 0;

    return {
      qH_nd, qH_nd_m2, eta_total_h, qf_h,
      qACM_nd, qf_w, nConsumers,
      qC_nd, qf_c, hasCool,
      qf_v, hrEta,
      leni, qf_l,
      qf_total, qf_total_m2,
      ep_h, ep_w, ep_c, ep_v, ep_l, ep_total, ep_total_m2,
      co2_h, co2_w, co2_c, co2_v, co2_l, co2_total, co2_total_m2,
      fuel, isCOP,
    };
  }, [
    building.areaUseful, building.volume, building.category,
    envelopeSummary, selectedClimate,
    heating, acm, cooling, ventilation, lighting, monthlyISO, useNA2023,
  ]);
}
