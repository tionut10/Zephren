import { useMemo } from "react";
import {
  HEAT_SOURCES, FUELS, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL, LIGHTING_HOURS,
  COOLING_HOURS_BY_ZONE, COOLING_HOURS_DEFAULT,
} from "../data/constants.js";
import { WATER_TEMP_MONTH } from "../data/energy-classes.js";
import { getFPElecNren, getFPElecRen, getFPElecTot, CO2_ELEC } from "../data/u-reference.js";
import { calcACMen15316 } from "../calc/acm-en15316.js";
import { calcSolarACMDetailed } from "../calc/solar-acm-detailed.js";
import { calcLENI } from "../calc/en15193-lighting.js";
import { calcCoolingHourly } from "../calc/cooling-hourly.js";
import { calcNightVentilation } from "../calc/night-ventilation.js";
// Sprint 5 (17 apr 2026) — migrare EN 15232 → SR EN ISO 52120-1:2022
// Aplicare f_BAC pe qf_X raw înainte de totalizare (AUDIT_13 P4 — Q_final)
import { applyBACSFactor, getBACSFactors, getBACSCategoryFromCode } from "../calc/bacs-iso52120.js";

// Mapare categorie clădire → tip câștiguri interne CIBSE (cooling-hourly.js)
// Sprint 3a (17 apr 2026) — pentru integrarea motorului orar
function mapCategoryToGains(category) {
  const MAP = {
    RI:"residential", RC:"residential", RA:"residential",
    BI:"office", AD:"office", HO_LUX:"office",
    CO:"retail", MAG:"retail", MALL:"retail", SUPER:"retail",
    SC:"school", ED:"school",
    SA:"hospital", HC:"hospital", SPA_H:"hospital",
    SP:"office", AL:"office", AER:"office",
  };
  return MAP[category] || "office";
}

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

// Sprint 4a (17 apr 2026) — Bug A6 AUDIT_08 §1.2.1:
// Cazan combi (CAZAN_H) în regim ACM vară ciclează 15-25 min ON / 2-3h OFF,
// randamentul efectiv scade 10-15% față de nominal încălzire iarnă:
//   - Pierderi standby crescute (cazan cald, nu produce)
//   - Pierderi ciclare (fiecare pornire: 2-3% preîncălzire schimbător)
//   - Flacără la stins (gaz rezidual)
// Sursă: EN 15316-4-1 Tab.5 + ErP Reg. 811/2013 (etichetare combi) + experiență RO.
const COMBI_SUMMER_FACTOR = 0.87;  // η efectivă vară = η nominal iarnă × 0.87

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
 * @param {object} params.solarThermal     — parametri solar termic (Step 4 Renewables) — Sprint 4b (17 apr 2026): cuplaj real ACM
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
  solarThermal,
  useNA2023,
  // Sprint 5 (17 apr 2026) — Clasa BACS conform ISO 52120-1:2022.
  // Default "C" = referință (factor 1.00 pe toate sistemele, impact zero).
  // Valori valide: "A" | "B" | "C" | "D". Alte valori → fallback C.
  bacsClass = "C",
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
    // eta/COP: pentru CAZAN_H → eta încălzire × COMBI_SUMMER_FACTOR (ciclare vară);
    //          altfel valoarea din ACM_SOURCES.
    // Sprint 4a — Bug A6 AUDIT_08: combi vara are η efectivă -13% față de iarnă.
    const eta_acm = isCazanH
      ? eta_gen * COMBI_SUMMER_FACTOR
      : (acmSrc?.eta || eta_gen);
    const acmEngineKey = ACM_SOURCE_TO_ENGINE[acm.source] || "ct_gaz";

    // ── Sprint 4b (17 apr 2026) — CUPLAJ REAL SOLAR STEP 8 → ACM (EN 15316-4-3) ──
    // AUDIT_08 §2.5 + SPRINT_04a §„Rămas pentru Sprint 4b": `acmSrc.solarFraction` era
    // CONSTANT (0.50 / 0.55 hardcoded din ACM_SOURCES). Step 8 Renewables calculează
    // acoperirea reală prin `calcSolarACMDetailed()` pe baza:
    //   • area colector, orientare, înclinare
    //   • tip colector (eta0, a1, a2 din COLLECTOR_TYPES)
    //   • climă (iradianță lunară + T_ambient)
    //   • volum stocare + nPersons + T_livrare
    // Dacă Step 8 are panouri active pe ACM, folosim f_sol CALCULAT. Altfel fallback
    // la constanta ACM_SOURCES (sau 0 dacă sursa nu are solar).
    let solarFr = 0;              // fracție solară finală [0-1]
    let solarSource = "none";     // "step8_calc" | "acm_source_const" | "none"
    let solarDetail = null;       // obiect returnat de calcSolarACMDetailed (pentru UI)
    const stEnabled = !!solarThermal?.enabled;
    const stArea = parseFloat(solarThermal?.area) || 0;
    const stUsage = solarThermal?.usage || "acm";
    const stAppliesToACM = stEnabled && stArea > 0 && (stUsage === "acm" || stUsage === "acm+heating" || stUsage === "mixt");

    if (stAppliesToACM && selectedClimate) {
      // Map tip "PLAN" (state legacy) → "PLAN_SEL" (cheie reală COLLECTOR_TYPES)
      const typeMap = { PLAN: "PLAN_SEL", PLAN_BASIC: "PLAN_BASIC", PLAN_SEL: "PLAN_SEL",
                        TUBURI: "TUBURI_HEAT_PIPE", TUBURI_HEAT_PIPE: "TUBURI_HEAT_PIPE",
                        TUBURI_U_PIPE: "TUBURI_U_PIPE", flat: "PLAN_SEL" };
      const collectorType = typeMap[solarThermal?.type] || "PLAN_SEL";
      try {
        solarDetail = calcSolarACMDetailed({
          collectorType,
          collectorArea: stArea,
          orientation: solarThermal?.orientation || "S",
          tiltDeg: parseFloat(solarThermal?.tilt) || 35,
          climate: selectedClimate,
          nPersons: parseFloat(acm.consumers) || (Au > 0 ? Math.max(1, Math.round(Au / 30)) : 2),
          acmDemandPerPerson: parseFloat(acm.dailyLiters) || 60,
          storageVolume: parseFloat(solarThermal?.storageVolume) || (stArea * 60),
          tSupplyACM: parseFloat(acm.tSupply) || 55,
          tCold: null, // motorul folosește default pe zonă
        });
        if (solarDetail && typeof solarDetail.fSolarAnnual === "number") {
          // fSolarAnnual vine 0-100 → convertește la 0-1 + cap la 0.85 (limită fizică anuală)
          solarFr = Math.min(0.85, Math.max(0, solarDetail.fSolarAnnual / 100));
          solarSource = "step8_calc";
        }
      } catch (_e) {
        solarFr = 0;
        solarDetail = null;
      }
    }

    // Fallback: constanta din ACM_SOURCES (SOLAR_AUX/SOLAR_GAZ/SOLAR_PC)
    if (solarSource === "none" && acmSrc?.solarFraction) {
      solarFr = acmSrc.solarFraction;
      solarSource = "acm_source_const";
    }

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
    // Sprint 5: `let` pentru a permite reatribuire după aplicarea f_BAC (ISO 52120)
    let qf_w = acmDetailed?.Q_final_kWh || 0;
    const acmFuel = isCazanH
      ? fuel
      : FUELS.find(f => f.id === (acmSrc?.fuel || "electricitate"));

    // ── COOLING — Sprint 3a (17 apr 2026) + Sprint 3b (17 apr 2026) ──
    // S3a: #1 cooling-hourly integrat + #2 SEER ≠ EER (EN 14825) + #3 η_em/η_dist/η_ctrl separate (EN 15316-2)
    // S3b: #4 W_aux (pompe + ventilatoare EN 15316-4-2) + #5/#6 free cooling nocturn (EN 16798-9) +
    //      #7 override tipologie aporturi interne (CIBSE + Mc 001 Tab. 9.2)
    const hasCool = cooling.hasCooling && cooling.system !== "NONE";
    const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
    const coolArea = parseFloat(cooling.cooledArea) || Au;

    // #7 — Override tipologie aporturi (prioritate UI > auto din category)
    // Dacă override e numeric (ex: "22") → W/m² direct; altfel e tip string ("office", "residential")
    const gainsOverride = cooling.internalGainsOverride;
    const gainsNumeric = gainsOverride && gainsOverride !== "" ? parseFloat(gainsOverride) : NaN;
    const gainsW_m2Override = isFinite(gainsNumeric) && gainsNumeric > 0 ? gainsNumeric : null;
    const internalGainsType = (!gainsW_m2Override && gainsOverride && gainsOverride !== "")
      ? gainsOverride
      : mapCategoryToGains(building.category);

    // #1 — Sursă primară Q_NC: cooling-hourly.js (dacă flag activ + envelope complet)
    //      Fallback 1: monthlyISO lunar (iso13790.js)
    //      Fallback 2: coolArea × 25 kWh/m²·an (ultim safety, avertizat)
    let qC_nd_hourly = null;
    let coolingHourlyResult = null;
    const useHourlyCool = hasCool && cooling.useHourly !== false
      && Array.isArray(envelopeSummary?.glazingElements)
      && Array.isArray(envelopeSummary?.opaqueElements);
    if (useHourlyCool) {
      try {
        coolingHourlyResult = calcCoolingHourly({
          Au: coolArea, V,
          glazingElements: envelopeSummary.glazingElements,
          opaqueElements: envelopeSummary.opaqueElements,
          climate: selectedClimate || {},
          theta_int_cool: parseFloat(cooling.setpoint) || 26,
          internalGainsType,
          shadingExternal: parseFloat(cooling.shadingExternal) || 0.7,
          gainsW_m2Override,
        });
        qC_nd_hourly = (coolingHourlyResult && coolingHourlyResult.Q_annual_kWh > 0)
          ? coolingHourlyResult.Q_annual_kWh
          : null;
      } catch (_e) {
        qC_nd_hourly = null;
      }
    }
    const qC_nd_raw = hasCool
      ? (qC_nd_hourly != null
        ? qC_nd_hourly
        : (qC_nd_calc > 0 ? qC_nd_calc * (coolArea / Au) : coolArea * 25))
      : 0;

    // #5+#6 — Free cooling nocturn (reducere Q_NC conform EN 16798-9 + EN ISO 13790 §12.2)
    //         Integrează calcNightVentilation (167 LOC) cu factor masă termică + fezabilitate ΔT
    //         Cap reducere la 40% din qC_nd (limită fizică realistă EN 16798-9)
    let nightVentResult = null;
    let Q_night_vent_reduction = 0;
    if (hasCool && cooling.hasNightVent && qC_nd_raw > 0) {
      // Derivare masă termică din structură clădire (Mc 001 Tab. 2.20)
      // THERMAL_MASS_CLASS dă J/(m²·K) — night-ventilation.js așteaptă kJ/(m²·K)
      const structureMass_J = {
        "Structură metalică": 80000, "Structură lemn": 80000,
        "Panouri prefabricate mari": 165000, "Cadre beton armat": 165000,
        "Zidărie portantă": 260000, "Pereți cortină + beton": 165000,
        "BCA + cadre beton": 165000, "Structură mixtă": 165000,
      }[building.structure || "Structură mixtă"] || 165000;
      const thermalMass_kJ = structureMass_J / 1000;
      // Zile sezon răcire per zonă climatică Mc 001
      const zoneKey = selectedClimate?.zone || "III";
      const seasonDaysMap = { I:100, II:110, III:120, IV:130, V:140 };
      const days_cooling_season = seasonDaysMap[zoneKey] || 120;
      // Temperatură nocturnă medie: media lunilor iulie-august minus 4K (răcirea nopții)
      const tempMonth = selectedClimate?.temp_month;
      const tJul = (Array.isArray(tempMonth) && tempMonth.length === 12) ? tempMonth[6] : 23;
      const tAug = (Array.isArray(tempMonth) && tempMonth.length === 12) ? tempMonth[7] : 23;
      const theta_ext_night_avg = Math.max(10, (tJul + tAug) / 2 - 4);
      // HDD răcire (Cooling Degree Days bază 18°C) — sumă lunară pentru sezon iunie-august
      const HDD_cool = Array.isArray(tempMonth) && tempMonth.length === 12
        ? [5, 6, 7].reduce((s, m) => s + Math.max(0, (tempMonth[m] - 18) * 30), 0)
        : 150;
      try {
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
        // Cap reducere la 40% din qC_nd (EN 16798-9: economie realistă 20-40%)
        const max_reduction = qC_nd_raw * 0.40;
        Q_night_vent_reduction = nightVentResult.feasible
          ? Math.min(max_reduction, nightVentResult.Q_free_cooling_kWh)
          : 0;
      } catch (_e) {
        nightVentResult = null;
        Q_night_vent_reduction = 0;
      }
    }
    const qC_nd = Math.max(0, qC_nd_raw - Q_night_vent_reduction);

    // #2 — SEER (EN 14825) prioritate UI > catalog > fallback EER × 1.8
    const eerRaw = parseFloat(cooling.eer);
    const seerRaw = parseFloat(cooling.seer);
    const eer = (isFinite(eerRaw) && eerRaw > 0) ? eerRaw : (coolSys?.eer || 3.5);
    const seer = (isFinite(seerRaw) && seerRaw > 0)
      ? seerRaw
      : ((coolSys && coolSys.seer > 0) ? coolSys.seer : eer * 1.8);

    // #3 — Randamente separate răcire (EN 15316-2) — paritate cu încălzire
    const eta_em_c = parseFloat(cooling.eta_em) || 0.97;    // default fan coil
    const eta_dist_c = parseFloat(cooling.eta_dist) || 0.95; // default apă rece izolat interior
    const eta_ctrl_c = parseFloat(cooling.eta_ctrl) || 0.96; // default termostat proporțional
    const eta_total_c = eta_em_c * eta_dist_c * eta_ctrl_c;

    // Consum COMPRESOR (chiller/PC) — formula S3a: qf_c_comp = Q_NC / (SEER × η_em × η_dist × η_ctrl)
    const qf_c_compressor = hasCool && seer > 0 && eta_total_c > 0
      ? qC_nd / (seer * eta_total_c)
      : 0;

    // #4 — Consum AUXILIAR electric răcire (EN 15316-4-2)
    //      Pompe circuit apă rece (chiller apă / PC hidronică) + ventilatoare fan-coil / condensator
    //      E_aux_i = P_aux_i × t_operare (kW × h = kWh/an)
    //      t_operare default: COOLING_HOURS_BY_ZONE[categorie][zona] (Mc 001 + practică RO)
    const P_aux_pumps_kW = Math.max(0, parseFloat(cooling.P_aux_pumps) || 0);
    const P_aux_fans_kW = Math.max(0, parseFloat(cooling.P_aux_fans) || 0);
    const t_cool_override = parseFloat(cooling.t_cooling_hours);
    const zoneK = selectedClimate?.zone || "III";
    const t_cooling_hours = (isFinite(t_cool_override) && t_cool_override > 0 && t_cool_override <= 8760)
      ? t_cool_override
      : ((COOLING_HOURS_BY_ZONE[building.category] && COOLING_HOURS_BY_ZONE[building.category][zoneK])
        || COOLING_HOURS_DEFAULT);
    const qf_c_aux_pumps = hasCool ? P_aux_pumps_kW * t_cooling_hours : 0;
    const qf_c_aux_fans = hasCool ? P_aux_fans_kW * t_cooling_hours : 0;
    const qf_c_aux_total = qf_c_aux_pumps + qf_c_aux_fans;

    // Total energie finală răcire = compresor + auxiliare
    // Sprint 5: `let` pentru a permite reatribuire după f_BAC (ISO 52120)
    let qf_c = qf_c_compressor + qf_c_aux_total;
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
    // Sprint 5: `let` pentru a permite reatribuire după f_BAC (ISO 52120)
    let qf_v = P_fan_W * ventHours / 1000; // W × h / 1000 = kWh/an
    // η_rec clamped la [0, 0.95] — recuperator real nu depășește 95% (EN 308 / Passivhaus)
    const hrRaw = ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : null;
    const hrClamped = (hrRaw !== null && isFinite(hrRaw)) ? Math.max(0, Math.min(0.95, hrRaw)) : null;
    const hrEta = ventType?.hasHR
      ? (hrClamped !== null ? hrClamped : ventType.hrEta || 0)
      : 0;

    // ── ILUMINAT (LENI) — EN 15193-1 + Mc 001-2022 Partea IV ──
    // Delegare completă la calcLENI() (src/calc/en15193-lighting.js) — sursă unică de adevăr.
    // Fix Sprint 2 (17 apr 2026):
    //   #1 W_P inclus (W_em iluminat urgență 8760h + W_standby drivere)
    //   #2 Default `operatingHours` din LIGHTING_HOURS per categorie
    //   #3 F_d și F_c DOAR pe termenul diurn (nu există daylight noaptea)
    const lightHoursRaw = parseFloat(lighting.operatingHours);
    const lightHours = (isFinite(lightHoursRaw) && lightHoursRaw > 0 && lightHoursRaw <= 8760)
      ? lightHoursRaw
      : (LIGHTING_HOURS[building.category] || 1800);
    const pEmRaw = parseFloat(lighting.pEmergency);
    const pStbRaw = parseFloat(lighting.pStandby);
    const leniResult = calcLENI({
      category: building.category,
      area: Au,
      pDensity: parseFloat(lighting.pDensity) || 4.5,
      fCtrl: parseFloat(lighting.fCtrl) || 1.0,
      operatingHours: lightHours,
      naturalLightRatio: (parseFloat(lighting.naturalLightRatio) || 30) / 100,
      pEmergency: (isFinite(pEmRaw) && pEmRaw >= 0 && pEmRaw <= 5) ? pEmRaw : undefined,
      pStandby: (isFinite(pStbRaw) && pStbRaw >= 0 && pStbRaw <= 2) ? pStbRaw : undefined,
    });
    const leni = leniResult.LENI;
    // Sprint 5: `let` pentru a permite reatribuire după f_BAC (ISO 52120)
    let qf_l = leniResult.qf_l;
    const leniMax = leniResult.LENI_max;
    const leniStatus = leniResult.status;
    const W_L = leniResult.W_L;
    const W_P = leniResult.W_P;
    const W_em = leniResult.W_em;
    const W_standby = leniResult.W_standby;

    // ── Auxiliar electric pompă circulație ACM (Sprint 3) ──
    const W_aux_acm_kWh = acmDetailed?.W_circ_pump_kWh || 0;

    // ── Sprint 5 (17 apr 2026) — APLICARE f_BAC conform SR EN ISO 52120-1:2022 ──
    // AUDIT_13 §4.3 P4 CRITIC: până acum clasa BACS A/B/C/D producea IDENTIC
    // același EP în motorul principal. Aplicăm acum factorii f_BAC pe qf_X raw
    // înainte de totalizare și calcul energie primară.
    //
    // Formula ISO 52120-1:2022 §5.2:
    //   Q_corr = Q_raw × f_BAC(categorie, clasă, utilizare)
    // unde utilizare ∈ {heating, cooling, dhw, ventilation, lighting}.
    //
    // Ordinea aplicării: după randamente (qf_h = Q_need/η_total) — echivalent
    // matematic cu aplicarea pe Q_need (scalar × scalar).
    const bacsCat = getBACSCategoryFromCode(building.category);
    const bacsFactors = getBACSFactors(bacsCat, bacsClass);

    // Salvăm valorile raw pentru breakdown UI + rapoarte
    const qf_h_raw = qf_h;
    const qf_w_raw = qf_w;
    const qf_c_raw = qf_c;
    const qf_v_raw = qf_v;
    const qf_l_raw = qf_l;

    // Reatribuim la valorile BACS-corectate
    qf_h = applyBACSFactor(qf_h_raw, "heating", bacsCat, bacsClass);
    qf_w = applyBACSFactor(qf_w_raw, "dhw", bacsCat, bacsClass);
    qf_c = applyBACSFactor(qf_c_raw, "cooling", bacsCat, bacsClass);
    qf_v = applyBACSFactor(qf_v_raw, "ventilation", bacsCat, bacsClass);
    qf_l = applyBACSFactor(qf_l_raw, "lighting", bacsCat, bacsClass);

    const qf_bacs_savings_total = (qf_h_raw + qf_w_raw + qf_c_raw + qf_v_raw + qf_l_raw)
      - (qf_h + qf_w + qf_c + qf_v + qf_l);

    // ── TOTAL ENERGIE FINALĂ (cu f_BAC aplicat) ──
    const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l + W_aux_acm_kWh;
    const qf_total_m2 = Au > 0 ? qf_total / Au : 0;

    // ── ENERGIE PRIMARĂ — descompunere fP_nren / fP_ren conform ISO 52000-1/NA:2023 ──
    // Sprint 11 (17 apr 2026) — Tab A.16 NA:2023 gated pe useNA2023:
    //   true  → fP_nren=2.00, fP_ren=0.50, fP_tot=2.50  (autoritar ASRO)
    //   false → fP_nren=2.62, fP_ren=0.00, fP_tot=2.62  (Tab 5.17 Mc001 legacy)
    // Pompe de căldură: energia ambientală (qH_nd - qf_h) cu fP_ambient (NA:2023 corecție MDLPA)
    const fP_elec_nren = getFPElecNren(useNA2023);
    const fP_elec_ren = getFPElecRen(useNA2023);
    const fP_elec_tot = getFPElecTot(useNA2023);
    let ep_h, ep_nren_h, ep_ren_h;
    if (isCOP) {
      const qAmbient_h = Math.max(0, qH_nd - qf_h);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_h = qf_h * fP_elec_tot + qAmbient_h * fP_ambient;
      ep_nren_h = qf_h * fP_elec_nren;
      ep_ren_h = qf_h * fP_elec_ren + qAmbient_h * (useNA2023 ? 1.0 : 0);
    } else {
      ep_h = qf_h * (fuel?.fP_tot || 1.17);
      ep_nren_h = qf_h * (fuel?.fP_nren ?? 1.10);
      ep_ren_h = qf_h * (fuel?.fP_ren ?? 0.07);
    }
    let ep_w, ep_nren_w, ep_ren_w;
    if (isCOPacm) {
      const qAmbient_w = Math.max(0, qACM_nd - qf_w);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_w = qf_w * fP_elec_tot + qAmbient_w * fP_ambient;
      ep_nren_w = qf_w * fP_elec_nren;
      ep_ren_w = qf_w * fP_elec_ren + qAmbient_w * (useNA2023 ? 1.0 : 0);
    } else {
      // ACM electric (boiler electric, instant electric) → factor NA:2023 gated, nu din FUELS legacy
      const acmFuelIsElec = !isCazanH && (acmSrc?.fuel === "electricitate");
      ep_w = acmFuelIsElec ? qf_w * fP_elec_tot : qf_w * (acmFuel?.fP_tot || fuel?.fP_tot || 1.17);
      ep_nren_w = acmFuelIsElec ? qf_w * fP_elec_nren : qf_w * (acmFuel?.fP_nren ?? fuel?.fP_nren ?? 1.10);
      ep_ren_w = acmFuelIsElec ? qf_w * fP_elec_ren : qf_w * (acmFuel?.fP_ren ?? fuel?.fP_ren ?? 0.07);
    }
    // Răcire — mereu electric (chiller/PC). coolFuel păstrat pentru non-electrice (rarisim).
    const coolIsElec = !coolFuel || coolFuel.id === "electricitate";
    const ep_c = coolIsElec ? qf_c * fP_elec_tot : qf_c * (coolFuel?.fP_tot || fP_elec_tot);
    const ep_nren_c = coolIsElec ? qf_c * fP_elec_nren : qf_c * (coolFuel?.fP_nren ?? fP_elec_nren);
    const ep_ren_c = coolIsElec ? qf_c * fP_elec_ren : qf_c * (coolFuel?.fP_ren ?? fP_elec_ren);
    // Ventilație, iluminat, aux ACM — întotdeauna electric SEN
    const ep_v = qf_v * fP_elec_tot;
    const ep_nren_v = qf_v * fP_elec_nren;
    const ep_ren_v = qf_v * fP_elec_ren;
    const ep_l = qf_l * fP_elec_tot;
    const ep_nren_l = qf_l * fP_elec_nren;
    const ep_ren_l = qf_l * fP_elec_ren;

    // Auxiliar pompă ACM — întotdeauna electric (indiferent de combustibil ACM)
    const ep_aux_acm = W_aux_acm_kWh * fP_elec_tot;
    const ep_nren_aux_acm = W_aux_acm_kWh * fP_elec_nren;
    const ep_ren_aux_acm = W_aux_acm_kWh * fP_elec_ren;

    const ep_total = ep_h + ep_w + ep_c + ep_v + ep_l + ep_aux_acm;
    const ep_total_m2 = Au > 0 ? ep_total / Au : 0;
    const ep_nren_total = ep_nren_h + ep_nren_w + ep_nren_c + ep_nren_v + ep_nren_l + ep_nren_aux_acm;
    const ep_ren_total = ep_ren_h + ep_ren_w + ep_ren_c + ep_ren_v + ep_ren_l + ep_ren_aux_acm;
    const ep_nren_m2 = Au > 0 ? ep_nren_total / Au : 0;
    const ep_ren_m2 = Au > 0 ? ep_ren_total / Au : 0;

    // Sprint 8 mai 2026 — Fix raport nZEB: defalcare EP per m² pe destinații
    // (consumat de report-generators.js / generateNZEBConformanceReport tabel III).
    // Cheile *_m2 lipseau complet — raportul citea undefined și afișa 0.0 pe toate
    // rândurile, deși totalul (ep_total_m2) era corect. Auxiliarul ACM se cumulează
    // în ep_w_m2 (apă caldă), aliniat cu Mc 001-2022 §3.2.3.
    const ep_h_m2 = Au > 0 ? ep_h / Au : 0;
    const ep_w_m2 = Au > 0 ? (ep_w + ep_aux_acm) / Au : 0;
    const ep_c_m2 = Au > 0 ? ep_c / Au : 0;
    const ep_v_m2 = Au > 0 ? ep_v / Au : 0;
    const ep_l_m2 = Au > 0 ? ep_l / Au : 0;

    // Defalcare EP pe purtători de energie [kWh/(m²·an)] — pentru tabel
    // „EP pe purtători" (gaz natural, electricitate, biomasă etc.) în raport.
    // Util pentru aplicarea factorilor de conversie f_P (Mc 001-2022 Anexa C).
    const isElec = (f) => !f || f.id === "electricitate" || f.fP_tot === fP_elec_tot;
    const heatingFuelLabel = fuel?.name || fuel?.label || (isElec(fuel) ? "Electricitate" : "Gaz natural");
    const acmFuelLabel = acmFuel?.name || acmFuel?.label || heatingFuelLabel;
    const ep_by_carrier_m2 = (() => {
      if (Au <= 0) return [];
      const map = new Map();
      const add = (label, f, ep) => {
        if (!ep) return;
        const key = label || "—";
        const prev = map.get(key) || { label: key, fP_tot: f?.fP_tot ?? null, ep: 0 };
        prev.ep += ep / Au;
        map.set(key, prev);
      };
      add(heatingFuelLabel, fuel, ep_h);
      add(acmFuelLabel, acmFuel || fuel, ep_w);
      add("Electricitate (răcire)", null, coolIsElec ? ep_c : 0);
      if (!coolIsElec) add(coolFuel?.name || "Combustibil răcire", coolFuel, ep_c);
      add("Electricitate (ventilare)", null, ep_v);
      add("Electricitate (iluminat)", null, ep_l);
      add("Electricitate (auxiliar ACM)", null, ep_aux_acm);
      return [...map.values()].sort((a, b) => b.ep - a.ep);
    })();

    // ── CO2 ──
    // Factor CO2 electricitate SEN = 0.107 kg/kWh (identic Tab 5.17 și Tab A.16)
    const co2_h = qf_h * (fuel?.fCO2 || 0.20);
    const co2_w = qf_w * (acmFuel?.fCO2 || fuel?.fCO2 || 0.20);
    const co2_c = qf_c * (coolFuel?.fCO2 || CO2_ELEC);
    const co2_v = qf_v * CO2_ELEC;
    const co2_l = qf_l * CO2_ELEC;
    const co2_aux_acm = W_aux_acm_kWh * CO2_ELEC;
    const co2_total = co2_h + co2_w + co2_c + co2_v + co2_l + co2_aux_acm;
    const co2_total_m2 = Au > 0 ? co2_total / Au : 0;

    return {
      qH_nd, qH_nd_m2, eta_total_h, qf_h,
      qACM_nd, qf_w, nConsumers,
      qC_nd, qf_c, hasCool,
      // Sprint 3b — breakdown compresor vs. auxiliare (UI afișează defalcare)
      qC_nd_raw,                    // Q_NC înainte de free cooling
      Q_night_vent_reduction,       // reducere aplicată din night vent (kWh/an)
      qf_c_compressor,              // consum compresor chiller/PC
      qf_c_aux_pumps,               // pompe circuit apă rece
      qf_c_aux_fans,                // ventilatoare fan-coil / condensator
      qf_c_aux_total,               // total auxiliare
      t_cooling_hours,              // ore operare răcire (efective sau default zonă × categorie)
      nightVentResult,              // rezultat complet calcNightVentilation (null dacă dezactivat)
      internalGainsType,            // tipologie aplicată (auto sau override)
      qf_v, hrEta,
      leni, qf_l, leniMax, leniStatus, W_L, W_P, W_em, W_standby,
      qf_total, qf_total_m2,
      ep_h, ep_w, ep_c, ep_v, ep_l, ep_total, ep_total_m2,
      // Sprint 8 mai 2026 — defalcare EP per m² pe destinații (era lipsă).
      ep_h_m2, ep_w_m2, ep_c_m2, ep_v_m2, ep_l_m2,
      ep_by_carrier_m2,
      ep_nren_h, ep_nren_w, ep_nren_c, ep_nren_v, ep_nren_l, ep_nren_total, ep_nren_m2,
      ep_ren_h, ep_ren_w, ep_ren_c, ep_ren_v, ep_ren_l, ep_ren_total, ep_ren_m2,
      co2_h, co2_w, co2_c, co2_v, co2_l, co2_total, co2_total_m2,
      fuel, isCOP,
      // ACM detaliat EN 15316 — sursă unică de adevăr pentru Step 3, 5, 6, 8, CPE
      acmDetailed, isCOPacm, acmFuel,
      // Sprint 3 — auxiliar pompă circulație ACM (electric)
      W_aux_acm_kWh, ep_aux_acm, co2_aux_acm,
      // Sprint 4b — cuplaj solar real Step 8 → ACM (EN 15316-4-3)
      acmSolar: {
        fraction: solarFr,                // 0-1 — fracție aplicată în motor
        fraction_pct: Math.round(solarFr * 100),
        source: solarSource,              // "step8_calc" | "acm_source_const" | "none"
        detail: solarDetail,              // rezultat calcSolarACMDetailed (null dacă fallback)
        appliesToACM: stAppliesToACM,
      },
      // Sprint 5 — breakdown BACS (SR EN ISO 52120-1:2022)
      bacs: {
        class: bacsClass,
        category: bacsCat,
        factors: bacsFactors,
        raw: {
          qf_h: qf_h_raw,
          qf_w: qf_w_raw,
          qf_c: qf_c_raw,
          qf_v: qf_v_raw,
          qf_l: qf_l_raw,
          total: qf_h_raw + qf_w_raw + qf_c_raw + qf_v_raw + qf_l_raw,
        },
        corrected: {
          qf_h, qf_w, qf_c, qf_v, qf_l,
          total: qf_h + qf_w + qf_c + qf_v + qf_l,
        },
        savings: {
          heating: qf_h_raw - qf_h,
          dhw: qf_w_raw - qf_w,
          cooling: qf_c_raw - qf_c,
          ventilation: qf_v_raw - qf_v,
          lighting: qf_l_raw - qf_l,
          total: qf_bacs_savings_total,
          totalPct: (qf_h_raw + qf_w_raw + qf_c_raw + qf_v_raw + qf_l_raw) > 0
            ? Math.round(qf_bacs_savings_total / (qf_h_raw + qf_w_raw + qf_c_raw + qf_v_raw + qf_l_raw) * 1000) / 10
            : 0,
        },
        reference: "SR EN ISO 52120-1:2022 §5.2 + Anexa B",
      },
    };
  }, [
    building.areaUseful, building.volume, building.category,
    envelopeSummary, selectedClimate,
    heating, acm, cooling, ventilation, lighting, monthlyISO, useNA2023,
    solarThermal, bacsClass,
  ]);
}
