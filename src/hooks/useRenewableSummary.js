import { useMemo } from "react";
import { FUELS, ACM_SOURCES, HEAT_SOURCES, SOLAR_THERMAL_TYPES, PV_TYPES, BIOMASS_TYPES, ORIENT_FACTORS, TILT_FACTORS } from "../data/constants.js";
import { getFPElecTot, CO2_ELEC } from "../data/u-reference.js";

/**
 * useRenewableSummary — calcul fracție regenerabilă și RER
 * Extras din energy-calc.jsx Sprint 4 refactoring.
 * Sprint 6 (17 apr 2026): fix formula RER conform SR EN ISO 52000-1 §11.5 — folosește fP_ren (1.0)
 * în loc de fP convențional (2.62 / 1.17), clamp 100%, prag SPF≥2.5 RED II, proximitate 30 km L.238/2024.
 * Conform L. 372/2005 (rev. 2024), L. 238/2024, EN 15316-4-3, EN ISO 9806, SR EN ISO 52000-1:2017.
 *
 * @param {object} params
 * @param {object} params.instSummary     — rezultat din useInstallationSummary
 * @param {object} params.building        — date clădire
 * @param {object} params.solarThermal    — parametri solar termic
 * @param {object} params.photovoltaic    — parametri fotovoltaic
 * @param {object} params.heatPump        — parametri pompă de căldură regenerabilă
 * @param {object} params.biomass         — parametri biomasă
 * @param {object} params.otherRenew      — eolian + cogenerare + proximitate 30 km
 * @param {object} params.selectedClimate — date climatice
 * @param {boolean} params.useNA2023      — factor energie ambientală
 * @param {object} params.acm             — parametri ACM (pentru identificare combustibil)
 * @param {object} params.heating         — parametri încălzire (pentru identificare combustibil ACM)
 *
 * @returns {object|null} renewSummary
 */

// ── Constante normative ────────────────────────────────────────────
// Factor energie primară pentru surse regenerabile (Tabel 5.17 Mc 001-2022 / Tabel A.16 NA:2023)
// Pentru TOATE sursele regenerabile locale (solar, PV, biomasă, eolian) fP_ren = 1.0
const FP_REN = 1.0;

// Prag SPF minim RED II (Dir. UE 2018/2001 Anexa VII + Decizia UE 2013/114/UE)
// Pompele de căldură cu SPF < 2.5 NU se contabilizează ca sursă regenerabilă
const SPF_MIN_RED_II = 2.5;

// Distanța maximă GPS pentru regenerabile în proximitate (L.238/2024 Art.6)
const PROXIMITY_MAX_KM = 30;

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

    // Sprint 11 — factor electricitate gated pe useNA2023 (Tab A.16 2.50 / Tab 5.17 2.62)
    const fP_elec = getFPElecTot(useNA2023);

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
      qPV = qPV_kWh * fP_elec;
    }
    const pv_peak_kWp = parseFloat(photovoltaic.peakPower) || 0;

    // ── POMPĂ DE CĂLDURĂ (fracțiunea regenerabilă = 1 - 1/SCOP, dacă SCOP ≥ 2.5 RED II) ──
    let qPC_ren = 0;
    let pc_spf_compliant = true;
    if (heatPump.enabled) {
      const cop = parseFloat(heatPump.cop) || 3.5;
      const scop = parseFloat(heatPump.scopHeating) || cop * 0.85;
      // Prag RED II: sub SPF 2.5 fracția regenerabilă = 0 (Dir. UE 2018/2001 Anexa VII)
      pc_spf_compliant = scop >= SPF_MIN_RED_II;
      const renFraction = pc_spf_compliant ? Math.max(0, 1 - 1 / scop) : 0;
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
    const cogenFuelData = FUELS.find(f => f.id === (otherRenew.cogenFuel || "gaz"));
    // Cogenerare e regenerabilă doar dacă combustibilul e regenerabil (biogaz/hidrogen verde/biomasă)
    const cogenIsRenewable = cogenFuelData && (cogenFuelData.fP_ren >= 0.9);
    if (otherRenew.cogenEnabled) {
      qCogen_el = parseFloat(otherRenew.cogenElectric) || 0;
      qCogen_th = parseFloat(otherRenew.cogenThermal) || 0;
      qCogen_ep_reduction = qCogen_el * fP_elec + qCogen_th * (cogenFuelData?.fP_tot || 1.17);
      qCogen_co2_reduction = qCogen_el * CO2_ELEC + qCogen_th * (cogenFuelData?.fCO2 || 0.202);
    }

    // ── PROXIMITATE 30 km GPS (L.238/2024 Art.6) ──
    // Regenerabile produse în rază ≤30 km GPS contează la RER total, dar NU la RER on-site
    const proximityEnabled = !!otherRenew.proximityEnabled;
    const proximityDistanceKm = parseFloat(otherRenew.proximityDistanceKm) || 0;
    const proximityValid = proximityEnabled && proximityDistanceKm > 0 && proximityDistanceKm <= PROXIMITY_MAX_KM;
    const qProximity = proximityValid ? (parseFloat(otherRenew.proximityProduction) || 0) : 0;

    const totalRenewable = qSolarTh + qPV_kWh + qPC_ren + qBio_ren + qWind
      + (cogenIsRenewable ? (qCogen_el + qCogen_th) : 0)
      + qProximity;
    const totalRenewable_m2 = Au > 0 ? totalRenewable / Au : 0;

    // ── RER — Renewable Energy Ratio (SR EN ISO 52000-1 §11.5) ──
    // Formula corectă: folosește fP_ren (= 1.0 pentru surse regenerabile), NU fP convențional
    // Sprint 6 fix: înainte se folosea FP_ELEC (2.62) și 1.17 → valori RER 150–350% eronate
    // NA:2023 (fP_ambient=0) vs Mc 001 (fP_ambient=1.0): default Mc 001 original per MDLPA 50843/09.03.2026
    const fP_ren_ambient = useNA2023 ? FP_REN : 0;  // useNA2023=true → Mc 001 (=1.0), false → A.16 (=0)
    const totalRenewable_ep =
        qSolarTh   * FP_REN
      + qPV_kWh    * FP_REN
      + qPC_ren    * fP_ren_ambient
      + qBio_ren   * FP_REN
      + qWind      * FP_REN
      + (cogenIsRenewable ? (qCogen_el * FP_REN + qCogen_th * FP_REN) : 0)
      + qProximity * FP_REN;

    const epTotal = instSummary.ep_total || 1;
    // Clamp RER la 100% (ISO 52000-1 §11.5 — raport fizic)
    const rer = Math.min(100, epTotal > 0 ? (totalRenewable_ep / epTotal) * 100 : 0);

    // ── L.238/2024 Art.6 — decompoziție RER on-site vs total ──
    // On-site = strict pe clădire (solar, PV, PC, biomasă, eolian) — EXCLUDE proximitate 30 km și cogen extern
    const totalOnSite_ep =
        qSolarTh   * FP_REN
      + qPV_kWh    * FP_REN
      + qPC_ren    * fP_ren_ambient
      + qBio_ren   * FP_REN
      + qWind      * FP_REN
      + (cogenIsRenewable ? (qCogen_el * FP_REN + qCogen_th * FP_REN) : 0);
    const rerOnSite = Math.min(100, epTotal > 0 ? (totalOnSite_ep / epTotal) * 100 : 0);
    const rerOnSiteOk = rerOnSite >= 10;
    const rerTotalOk = rer >= 30;

    // ── Energie primară ajustată ──
    // ambientFP urmează aceeași logică ca în useInstallationSummary:
    // NA:2023 ON → energia ambientală e inclusă în ep_total → trebuie scăzută și din ep_reduction
    const ambientFP = useNA2023 ? 1.0 : 0;
    const ep_reduction = qSolarTh * 1.0 + qPV_kWh * fP_elec + qPC_ren * ambientFP + qBio_ren * 1.0 + qWind * fP_elec + qCogen_ep_reduction + qProximity * FP_REN;
    const ep_adjusted = Math.max(0, instSummary.ep_total - ep_reduction);
    const ep_adjusted_m2 = Au > 0 ? ep_adjusted / Au : 0;

    // ── CO2 redus ──
    const acmFuelId = acm.source === "CAZAN_H"
      ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz")
      : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
    const solarThCO2Factor = (FUELS.find(f => f.id === acmFuelId) || FUELS[0]).fCO2;
    const co2_reduction = qSolarTh * solarThCO2Factor + qPV_kWh * CO2_ELEC + qPC_ren * 0 + qWind * CO2_ELEC + qCogen_co2_reduction;
    const co2_adjusted = Math.max(0, instSummary.co2_total - co2_reduction);
    const co2_adjusted_m2 = Au > 0 ? co2_adjusted / Au : 0;

    // ── CREDIT EXPORT — ISO 52000-1/NA:2023 §11.7 ──
    // Energia exportată în rețea se creditează cu un factor kexp (0 ≤ kexp ≤ 1)
    // România: net-metering → kexp = 1.0 (prosumatori Legea 238/2024)
    const kexp = 1.0;
    const selfConsumptionBase = 0.35; // 35% auto-consum fără baterie (tipic România)
    const qPV_selfConsumed = qPV_kWh * selfConsumptionBase;
    const qPV_exported = qPV_kWh * (1 - selfConsumptionBase);
    const qPV_credit = qPV_selfConsumed + qPV_exported * kexp;

    // ── BATERIE (auto-consum PV) ──
    let qBattery_annual = 0;
    let battSelfConsumptionPct = Math.round(selfConsumptionBase * 100);
    if (battery?.enabled && photovoltaic.enabled) {
      const cap = parseFloat(battery.capacity) || 0;
      const dod = parseFloat(battery.dod) || 0.90;
      const chargeDays = 250; // zile cu producție semnificativă/an (România)
      qBattery_annual = Math.min(cap * dod * chargeDays, qPV_kWh * 0.50);
      battSelfConsumptionPct = parseFloat(battery.selfConsumptionPct) || 80;
    }

    return {
      qSolarTh, qPV_kWh, qPV_credit, qPV_selfConsumed, qPV_exported, kexp,
      qPC_ren, qBio_ren, qBio_total, qWind, qCogen_el, qCogen_th,
      cogenIsRenewable,
      // L.238/2024 Art.6 — proximitate 30 km
      qProximity, proximityValid, proximityDistanceKm,
      // Sprint 6 — expose PV params pentru PVDegradation.jsx
      pv_annual_kWh: qPV_kWh,
      pv_peak_kWp,
      // RED II — prag SPF
      pc_spf_compliant,
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
