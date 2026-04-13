import { useMemo } from "react";
import { FUELS, ACM_SOURCES, HEAT_SOURCES, SOLAR_THERMAL_TYPES, PV_TYPES, BIOMASS_TYPES, ORIENT_FACTORS, TILT_FACTORS } from "../data/constants.js";
import { FP_ELEC } from "../data/u-reference.js";

/**
 * useRenewableSummary — calcul fracție regenerabilă și RER
 * Extras din energy-calc.jsx Sprint 4 refactoring.
 * Conform L. 372/2005 (rev. 2024), EN 15316-4-3, EN ISO 9806, Directiva RED III.
 *
 * @param {object} params
 * @param {object} params.instSummary     — rezultat din useInstallationSummary
 * @param {object} params.building        — date clădire
 * @param {object} params.solarThermal    — parametri solar termic
 * @param {object} params.photovoltaic    — parametri fotovoltaic
 * @param {object} params.heatPump        — parametri pompă de căldură regenerabilă
 * @param {object} params.biomass         — parametri biomasă
 * @param {object} params.otherRenew      — eolian + cogenerare
 * @param {object} params.selectedClimate — date climatice
 * @param {boolean} params.useNA2023      — factor energie ambientală
 * @param {object} params.acm             — parametri ACM (pentru identificare combustibil)
 * @param {object} params.heating         — parametri încălzire (pentru identificare combustibil ACM)
 *
 * @returns {object|null} renewSummary
 */
export function useRenewableSummary({
  instSummary,
  building,
  solarThermal,
  photovoltaic,
  heatPump,
  biomass,
  otherRenew,
  selectedClimate,
  useNA2023,
  acm,
  heating,
  battery,
}) {
  return useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au || !selectedClimate || !instSummary) return null;

    // ── SOLAR TERMIC ──
    let qSolarTh = 0;
    if (solarThermal.enabled) {
      const area = parseFloat(solarThermal.area) || 0;
      const eta0 = parseFloat(solarThermal.eta0) || 0.75;
      const oriF = ORIENT_FACTORS[solarThermal.orientation] || 1;
      const tiltF = TILT_FACTORS[solarThermal.tilt] || 1;
      const solarIrrad = selectedClimate.solar[solarThermal.orientation] || selectedClimate.solar.S;
      const a1 = parseFloat(solarThermal.a1) || 3.5;
      const deltaT = 40; // K — diferență medie fluid față de exterior (EN 12975 §B.1)
      const peakSunHours = 1400; // ore/an pentru România
      const gRef = solarIrrad > 0 ? (solarIrrad / peakSunHours) * 1000 : 300; // W/m²
      const etaSeasonal = Math.max(0.15, eta0 - a1 * deltaT / Math.max(gRef, 100));
      qSolarTh = area * etaSeasonal * solarIrrad * oriF * tiltF * 0.85;
    }

    // ── FOTOVOLTAIC ──
    let qPV = 0;
    let qPV_kWh = 0;
    if (photovoltaic.enabled) {
      const area = parseFloat(photovoltaic.area) || 0;
      const pvType = PV_TYPES.find(t => t.id === photovoltaic.type);
      const etaPV = pvType?.eta || 0.20;
      const etaInv = parseFloat(photovoltaic.inverterEta) || 0.95;
      const oriF = ORIENT_FACTORS[photovoltaic.orientation] || 1;
      const tiltF = TILT_FACTORS[photovoltaic.tilt] || 1;
      const solarH = selectedClimate.solar.Oriz || 360;
      qPV_kWh = area * etaPV * etaInv * solarH * oriF * tiltF * 0.80;
      qPV = qPV_kWh * FP_ELEC;
    }

    // ── POMPĂ DE CĂLDURĂ (fracțiunea regenerabilă = 1 - 1/SCOP) ──
    let qPC_ren = 0;
    if (heatPump.enabled) {
      const cop = parseFloat(heatPump.cop) || 3.5;
      const scop = parseFloat(heatPump.scopHeating) || cop * 0.85;
      const renFraction = Math.max(0, 1 - 1 / scop);
      let qCovered = 0;
      if (heatPump.covers === "heating") qCovered = instSummary.qH_nd;
      else if (heatPump.covers === "acm") qCovered = instSummary.qACM_nd;
      else if (heatPump.covers === "heating_acm") qCovered = instSummary.qH_nd + instSummary.qACM_nd;
      qPC_ren = qCovered * renFraction;
    }

    // ── BIOMASĂ (fP_ren=0.80 per NA:2023) ──
    let qBio_ren = 0;
    let qBio_total = 0;
    if (biomass.enabled) {
      const bioType = BIOMASS_TYPES.find(t => t.id === biomass.type);
      const eta = parseFloat(biomass.boilerEta) || 0.85;
      if (biomass.annualConsumption) {
        qBio_total = (parseFloat(biomass.annualConsumption) || 0) * (bioType?.pci || 17.5) * eta / 3.6;
      } else {
        qBio_total = biomass.covers === "heating" ? instSummary.qH_nd
          : biomass.covers === "acm" ? instSummary.qACM_nd
          : instSummary.qH_nd + instSummary.qACM_nd;
      }
      qBio_ren = qBio_total * (bioType?.fP_ren || 0.80);
    }

    // ── EOLIAN ──
    let qWind = 0;
    if (otherRenew.windEnabled) {
      qWind = parseFloat(otherRenew.windProduction) || 0;
    }

    // ── COGENERARE ──
    let qCogen_el = 0;
    let qCogen_th = 0;
    let qCogen_ep_reduction = 0;
    let qCogen_co2_reduction = 0;
    if (otherRenew.cogenEnabled) {
      qCogen_el = parseFloat(otherRenew.cogenElectric) || 0;
      qCogen_th = parseFloat(otherRenew.cogenThermal) || 0;
      const cogenFuelData = FUELS.find(f => f.id === (otherRenew.cogenFuel || "gaz"));
      qCogen_ep_reduction = qCogen_el * FP_ELEC + qCogen_th * (cogenFuelData?.fP_tot || 1.17);
      qCogen_co2_reduction = qCogen_el * 0.107 + qCogen_th * (cogenFuelData?.fCO2 || 0.205);
    }

    const totalRenewable = qSolarTh + qPV_kWh + qPC_ren + qBio_ren + qWind + qCogen_el + qCogen_th;
    const totalRenewable_m2 = Au > 0 ? totalRenewable / Au : 0;

    // RER — Renewable Energy Ratio (energie primară)
    const fP_therm = 1.17;
    const totalRenewable_ep = qSolarTh * fP_therm + qPV_kWh * FP_ELEC + qPC_ren * FP_ELEC + qBio_ren * 1.08 + qWind * FP_ELEC + qCogen_el * FP_ELEC + qCogen_th * fP_therm;
    const epTotal = instSummary.ep_total || 1;
    const rer = epTotal > 0 ? (totalRenewable_ep / epTotal) * 100 : 0;
    // L.238/2024: RER decomposition
    const totalOnSite_ep = qSolarTh * fP_therm + qPV_kWh * FP_ELEC + qPC_ren * FP_ELEC + qBio_ren * 1.08 + qWind * FP_ELEC;
    const rerOnSite = epTotal > 0 ? (totalOnSite_ep / epTotal) * 100 : 0;
    const rerOnSiteOk = rerOnSite >= 10;
    const rerTotalOk = rer >= 30;

    // Energie primară ajustată
    // ambientFP urmează aceeași logică ca în useInstallationSummary:
    // NA:2023 ON → energia ambientală e inclusă în ep_total → trebuie scăzută și din ep_reduction
    const ambientFP = useNA2023 ? 1.0 : 0;
    const ep_reduction = qSolarTh * 1.0 + qPV_kWh * FP_ELEC + qPC_ren * ambientFP + qBio_ren * 1.0 + qWind * FP_ELEC + qCogen_ep_reduction;
    const ep_adjusted = Math.max(0, instSummary.ep_total - ep_reduction);
    const ep_adjusted_m2 = Au > 0 ? ep_adjusted / Au : 0;

    // CO2 redus
    const acmFuelId = acm.source === "CAZAN_H"
      ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz")
      : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
    const solarThCO2Factor = (FUELS.find(f => f.id === acmFuelId) || FUELS[0]).fCO2;
    const co2_reduction = qSolarTh * solarThCO2Factor + qPV_kWh * 0.107 + qPC_ren * 0 + qWind * 0.107 + qCogen_co2_reduction;
    const co2_adjusted = Math.max(0, instSummary.co2_total - co2_reduction);
    const co2_adjusted_m2 = Au > 0 ? co2_adjusted / Au : 0;

    // ── BATERIE (auto-consum PV) ──
    // Sub Mc 001-2022 / ISO 52000-1 toată producția PV e creditată la valoare completă (net-metering),
    // deci bateria nu modifică ep_adjusted. Calculăm metricile economice / autonomie.
    let qBattery_annual = 0;
    let battSelfConsumptionPct = 35; // % auto-consum fără baterie (tipic România)
    if (battery?.enabled && photovoltaic.enabled) {
      const cap = parseFloat(battery.capacity) || 0;
      const dod = parseFloat(battery.dod) || 0.90;
      const chargeDays = 250; // zile cu producție semnificativă/an (România)
      qBattery_annual = Math.min(cap * dod * chargeDays, qPV_kWh * 0.50);
      battSelfConsumptionPct = parseFloat(battery.selfConsumptionPct) || 80;
    }

    return {
      qSolarTh, qPV_kWh, qPC_ren, qBio_ren, qBio_total, qWind, qCogen_el, qCogen_th,
      totalRenewable, totalRenewable_m2, rer, rerOnSite, rerOnSiteOk, rerTotalOk,
      ep_reduction, ep_adjusted, ep_adjusted_m2,
      co2_reduction, co2_adjusted, co2_adjusted_m2,
      qBattery_annual, battSelfConsumptionPct,
    };
  }, [
    building.areaUseful, selectedClimate, instSummary,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, useNA2023,
    acm, heating, battery,
  ]);
}
