import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { fetchPVGISClimate } from "../calc/pvgis.js";
import { MATERIAL_PRICES_2025, PRICES_UPDATED, PRICES_SOURCE, EUR_TO_RON, getMaterialsByCategory } from "../data/material-prices.js";
import {
  parseClimateCSV,
  parseEPW,
  fetchOpenMeteo,
  openMeteoToClimateData,
  validateClimateData,
} from "../calc/climate-import.js";
import { cn, Card, Badge, ResultRow } from "../components/ui.jsx";
import { calcPeakThermalLoad, calcPeakCoolingLoad } from "../calc/en12831.js";
import { calcVentilationFlow, VENT_PER_PERSON } from "../calc/ventilation-flow.js";
import { generateEPBDXML, downloadXML } from "../calc/epbd-xml-export.js";
import { calcRehabPackages } from "../calc/rehab-comparator.js";
import { calcHeatPumpSizing, HP_TYPES } from "../calc/heat-pump-sizing.js";
import { calcMaintenanceFund, BUILDING_COMPONENTS } from "../calc/maintenance-fund.js";
import { calcPNRRFunding } from "../calc/pnrr-funding.js";
import { generateThermalMapSVG, generateThermalBridgeHeatmap } from "../calc/thermal-map.js";
import { calcSolarACMDetailed, COLLECTOR_TYPES } from "../calc/solar-acm-detailed.js";
import { checkPasivhaus } from "../calc/pasivhaus.js";
import { checkAcousticConformity } from "../calc/acoustic.js";
import { calcBenchmark } from "../calc/benchmark.js";
import { checkMajorRenovConformity } from "../calc/epbd.js";
import { calcFinancialScenarios } from "../calc/financial.js";
import { checkGP123, SOLAR_PEAK_HOURS } from "../calc/gp123.js";
import { calcVMCHR, recommendVMCType } from "../calc/vmc-hr.js";
import { calcDynamicBridges, summarizeDynamicBridges, detectJunctions } from "../calc/thermal-bridges-dynamic.js";
import { calcPMV, PMV_ACTIVITY, PMV_CLOTHING } from "../calc/pmv-ppd.js";
import { checkC107Conformity, getC107UMax, getRenovUMax } from "../calc/c107.js";
import { calcAirInfiltration, calcNaturalLighting } from "../calc/infiltration.js";
import { glaserCheck, calcGlaserMonthly } from "../calc/glaser.js";
import { calcRehabCost, REHAB_PRICE_DB } from "../calc/rehab-cost.js";
import { calcCoolingHourly } from "../calc/cooling-hourly.js";

const TAB_SECTIONS = [
  { id:"benchmark",   icon:"📊", label:"Benchmark" },
  { id:"en12831",     icon:"🔥", label:"Sarcină vârf" },
  { id:"ventilare",   icon:"💨", label:"Ventilare" },
  { id:"vmc_hr",      icon:"🔄", label:"VMC-HR" },
  { id:"infiltratii", icon:"💨", label:"Infiltrații n50" },
  { id:"iluminat_nat",icon:"☀️", label:"Iluminat natural" },
  { id:"confort_pmv", icon:"🌡️", label:"Confort PMV" },
  { id:"c107",        icon:"📐", label:"C107 Conformitate" },
  { id:"tb_dinamic",  icon:"🔗", label:"Punți termice" },
  { id:"pompa",       icon:"♨️", label:"Pompă căldură" },
  { id:"rehab",       icon:"🏗️", label:"Pachete reabilitare" },
  { id:"pnrr",        icon:"💶", label:"Finanțare" },
  { id:"fond_rep",    icon:"🔧", label:"Fond reparații" },
  { id:"solar_acm",   icon:"☀️", label:"Solar termic" },
  { id:"gp123",       icon:"⚡", label:"GP 123 Fotovoltaic" },
  { id:"glaser",        icon:"💧", label:"Condens Glaser" },
  { id:"rehab_compare", icon:"📊", label:"Comparativ rehab" },
  { id:"thermal_map", icon:"🌡️", label:"Hartă termică" },
  { id:"deviz",         icon:"💰", label:"Deviz reabilitare" },
  { id:"racire_orara",  icon:"❄️", label:"Răcire orară" },
  { id:"pasivhaus",   icon:"🏠", label:"Pasivhaus" },
  { id:"acustic",     icon:"🔊", label:"Acustic" },
  { id:"conformitate",icon:"✅", label:"Conformitate U" },
  { id:"xml_export",  icon:"📥", label:"Export XML" },
  { id:"climate_import", icon:"📡", label:"Import climă" },
  { id:"preturi",     icon:"🏷️", label:"Prețuri materiale" },
  { id:"multi_building", icon:"🏘️", label:"Multi-clădire" },
  { id:"mdlpa",       icon:"🏛️", label:"MDLPA Registru" },
];

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">{icon} {title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ConformBadge({ ok, label }) {
  if (ok === null || ok === undefined) return <Badge className="bg-slate-700 text-slate-300">N/A</Badge>;
  return <Badge className={ok ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}>{ok ? "✓ " : "✗ "}{label}</Badge>;
}

function ColorBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, value / max * 100) : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: pct + "%", backgroundColor: color || "#6366f1" }} />
    </div>
  );
}

export default function Step8Advanced({ building, climate, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, systems }) {
  const [activeTab, setActiveTab] = useState("benchmark");
  const [hpTypeId, setHpTypeId] = useState("AA_STD");
  const [collectorType, setCollectorType] = useState("PLAN_SEL");
  const [nPersons, setNPersons] = useState("");
  const [maintComponents, setMaintComponents] = useState([]);
  const [externalNoise, setExternalNoise] = useState(55);
  const [ownerType, setOwnerType] = useState("fizica");
  const [xmlGenerated, setXmlGenerated] = useState(false);

  // ── Multi-clădire state ──
  const [savedProjects, setSavedProjects] = useState([]);
  useEffect(() => {
    const projects = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('zephren_project_') || key.startsWith('project_'))) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data?.building) {
            const epF = data.instSummary?.ep_total_m2 || 0;
            projects.push({
              id: key, name: data.name || data.building?.address || key,
              category: data.building?.category || "—",
              au: parseFloat(data.building?.areaUseful) || 0,
              ep: epF, cls: epF > 0 ? "calc" : "—",
              co2: data.instSummary?.co2_total_m2 || 0,
              rer: data.renewSummary?.rer || 0,
              auditor: data.auditor?.name || "—",
            });
          }
        } catch(e) { /* skip */ }
      }
    }
    setSavedProjects(projects);
  }, []);

  // ── MDLPA validare XML state ──
  const [xmlValidation, setXmlValidation] = useState(null);
  const [xmlValidating, setXmlValidating] = useState(false);

  // ── PVGIS API state ──
  const [pvgisData, setPvgisData] = useState(null);
  const [pvgisLoading, setPvgisLoading] = useState(false);
  const [pvgisError, setPvgisError] = useState(null);

  // ── Prețuri materiale state ──
  const [pretCategory, setPretCategory] = useState("all");

  // ── Climate import state ──
  const [climImportStatus, setClimImportStatus]   = useState(null); // null | "loading" | "ok" | "error"
  const [climImportMsg, setClimImportMsg]         = useState("");
  const [climImportedData, setClimImportedData]   = useState(null);
  const climCSVRef = useRef(null);
  const climEPWRef = useRef(null);

  const importPVGIS = useCallback(async () => {
    const lat = climate?.lat;
    const lon = climate?.lon;
    if (!lat || !lon) {
      setPvgisError("Coordonatele geografice (lat/lon) nu sunt disponibile pentru această localitate.");
      return;
    }
    setPvgisLoading(true);
    setPvgisError(null);
    setPvgisData(null);
    try {
      const result = await fetchPVGISClimate(lat, lon);
      setPvgisData(result);
    } catch (err) {
      setPvgisError("Eroare la accesarea PVGIS: " + err.message);
    } finally {
      setPvgisLoading(false);
    }
  }, [climate]);

  // ── Climate import handlers ─────────────────────────────────────────────────
  const applyClimImport = useCallback((data, sourceName) => {
    const validation = validateClimateData(data);
    if (!validation.valid) {
      setClimImportStatus("error");
      setClimImportMsg("Erori validare: " + validation.errors.join("; "));
      return;
    }
    setClimImportedData({ ...data, _source: sourceName });
    setClimImportStatus("ok");
    setClimImportMsg(`Date importate: ${sourceName}`);
  }, []);

  const handleClimOpenMeteo = useCallback(async () => {
    const lat = climate?.lat;
    const lon = climate?.lon;
    if (!lat || !lon) {
      setClimImportStatus("error");
      setClimImportMsg("Coordonatele geografice nu sunt disponibile pentru această localitate.");
      return;
    }
    setClimImportStatus("loading");
    setClimImportMsg("Se descarcă date ERA5 de la Open-Meteo...");
    try {
      const raw = await fetchOpenMeteo(lat, lon, 2023);
      const data = openMeteoToClimateData(raw);
      applyClimImport(data, `Open-Meteo ERA5 2023 (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    } catch (err) {
      setClimImportStatus("error");
      setClimImportMsg("Eroare: " + err.message);
    }
  }, [climate, applyClimImport]);

  const handleClimCSV = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = parseClimateCSV(ev.target.result);
      applyClimImport(data, `CSV: ${file.name}`);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [applyClimImport]);

  const handleClimEPW = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = parseEPW(ev.target.result);
      applyClimImport(data, `EPW: ${file.name}${data.city && data.city !== "Necunoscut" ? " (" + data.city + ")" : ""}`);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [applyClimImport]);

  const Au = parseFloat(building?.areaUseful) || 100;
  const V = parseFloat(building?.volume) || Au * 2.8;
  const cat = building?.category || "RI";
  const zone = climate?.zone || "III";
  const epActual = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 150;

  // ── Benchmark ──
  const benchmark = useMemo(() => calcBenchmark({
    category: cat, zone, epActual,
    yearBuilt: building?.yearBuilt, Au,
    epAfterRehab: renewSummary?.ep_adjusted_m2 !== epActual ? renewSummary?.ep_adjusted_m2 : null,
  }), [cat, zone, epActual, building?.yearBuilt, Au]);

  // ── EN 12831 ──
  const peakLoad = useMemo(() => calcPeakThermalLoad({
    opaqueElements, glazingElements, thermalBridges,
    V, Au, n50: parseFloat(building?.n50) || 4.0, hrEta: systems?.hrEta || 0,
    climate, category: cat,
    structure: building?.structure, windExposure: building?.windExposure,
  }), [opaqueElements, glazingElements, thermalBridges, V, Au, building, systems, climate, cat]);

  const peakCooling = useMemo(() => calcPeakCoolingLoad({
    Au, glazingElements, climate,
    internalGains: 6,
  }), [Au, glazingElements, climate]);

  // ── Ventilare ──
  const ventFlow = useMemo(() => calcVentilationFlow({
    Au, H: V/Au, category: cat, ieqCategory: "II",
    ventType: systems?.ventType || "NATURAL",
    occupancy: nPersons ? parseInt(nPersons) : null,
    hrEta: systems?.hrEta || 0,
    climate,
  }), [Au, V, cat, systems, nPersons, climate]);

  // ── Pompă de căldură ──
  const hpSizing = useMemo(() => peakLoad ? calcHeatPumpSizing({
    phi_H_design: peakLoad.phi_H_total,
    phi_H_annual: instSummary?.qH_nd_total || peakLoad.phi_H_total * 2,
    hpTypeId, climate, Au,
    emissionSystem: systems?.emissionSystem,
  }) : null, [peakLoad, hpTypeId, climate, Au, instSummary, systems]);

  // ── Comparator pachete reabilitare ──
  const rehabPackages = useMemo(() => calcRehabPackages({
    building, climate, epActual,
    wallArea: opaqueElements?.filter(e=>e.type==="PE").reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.7,
    roofArea: opaqueElements?.filter(e=>["PT","PP"].includes(e.type)).reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.9,
    windowArea: glazingElements?.reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.15,
    energyPriceEUR: 0.08, discountRate: 5, escalation: 3, period: 30,
  }), [building, climate, epActual, opaqueElements, glazingElements, Au]);

  // ── PNRR ──
  const pnrrResult = useMemo(() => calcPNRRFunding({
    building, epActual, epAfterRehab: rehabPackages?.packages?.[2]?.epNew,
    investTotal: rehabPackages?.packages?.[2]?.invest || 0,
    measures: ["Pompă de căldură","PV","Termoizolare"],
    ownerType,
  }), [building, epActual, rehabPackages, ownerType]);

  // ── Hartă termică ──
  const thermalMap = useMemo(() => generateThermalMapSVG({
    opaqueElements, glazingElements, thermalBridges,
    tInt: building?.theta_int || 20,
    tExt: climate?.theta_e || -15,
    width: 560, height: 280,
  }), [opaqueElements, glazingElements, thermalBridges, building, climate]);

  const tbHeatmap = useMemo(() => generateThermalBridgeHeatmap(thermalBridges), [thermalBridges]);

  // ── Solar ACM ──
  const solarACM = useMemo(() => calcSolarACMDetailed({
    collectorType, collectorArea: Math.max(2, Au * 0.03),
    orientation: "S", tiltDeg: 45, climate,
    nPersons: nPersons ? parseInt(nPersons) : Math.ceil(Au/25),
    storageVolume: Math.round(Math.max(2, Au*0.03) * 60),
    antifreeze: climate?.zone >= "IV" ? "PG50" : "PG40",
  }), [collectorType, Au, climate, nPersons]);

  // ── Pasivhaus ──
  const pasivhausCheck = useMemo(() => checkPasivhaus({
    opaqueElements, glazingElements, thermalBridges,
    n50: parseFloat(building?.n50) || 4.0,
    hrEta: systems?.hrEta || 0,
    qH_nd_m2: instSummary?.qH_nd_m2,
    qC_nd_m2: instSummary?.qC_nd_m2,
    peakHeating_Wm2: peakLoad ? peakLoad.phi_specific : null,
    ep_primary_m2: epActual, Au, V,
    category: cat,
  }), [opaqueElements, glazingElements, thermalBridges, building, systems, instSummary, peakLoad, epActual, Au, V, cat]);

  // ── Acustic ──
  const acousticCheck = useMemo(() => checkAcousticConformity({
    opaqueElements, glazingElements, category: cat, externalNoise,
  }), [opaqueElements, glazingElements, cat, externalNoise]);

  // ── Conformitate U reabilitare majoră ──
  const uConformity = useMemo(() => checkMajorRenovConformity(opaqueElements, glazingElements, cat), [opaqueElements, glazingElements, cat]);

  // ── GP 123 — Verificare sistem fotovoltaic ──
  const [gp123Tilt, setGp123Tilt] = useState(35);
  const [gp123AzimuthDev, setGp123AzimuthDev] = useState(0);
  const [gp123Shading, setGp123Shading] = useState(5);
  const [gp123Prosumator, setGp123Prosumator] = useState(true);
  const pv = systems?.photovoltaic;
  const gp123Result = useMemo(() => {
    const ppv = parseFloat(pv?.power) || 0;
    if (ppv <= 0) return null;
    return checkGP123({
      ppv_kwp: ppv,
      ppv_area_m2: parseFloat(pv?.area) || ppv / 0.20,
      tiltDeg: gp123Tilt,
      azimuthLabel: pv?.orientation || "S",
      azimuthDev: gp123AzimuthDev,
      pinv_kw: parseFloat(pv?.invPower) || ppv * 0.95,
      etaPanel: parseFloat(pv?.eta) || 0.20,
      zone,
      au_m2: Au,
      qConsum_kwh: instSummary ? (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) : 0,
      cableLossDC: 0.02,
      shadingFactor: gp123Shading / 100,
      tempAvgC: climate?.theta_a || 10,
      isProsumatora: gp123Prosumator,
      hasSolarReady: !!building?.solarReady,
    });
  }, [pv, gp123Tilt, gp123AzimuthDev, gp123Shading, gp123Prosumator, zone, Au, instSummary, climate, building]);

  // ── VMC cu Recuperare de Căldură ──
  const ventData = systems?.ventilation;
  const ventTypeObj = useMemo(() => {
    const VENT_TYPES_LOCAL = [
      { id:"NAT", hasHR:false, hrEta:0, sfp:0.00 },
      { id:"NAT_HIBRIDA", hasHR:false, hrEta:0, sfp:0.20 },
      { id:"MEC_EXT", hasHR:false, hrEta:0, sfp:0.45 },
      { id:"MEC_EXT_AUTO", hasHR:false, hrEta:0, sfp:0.55 },
      { id:"MEC_INT", hasHR:false, hrEta:0, sfp:0.45 },
      { id:"MEC_DUB", hasHR:false, hrEta:0, sfp:1.00 },
      { id:"MEC_HR60", hasHR:true, hrEta:0.60, sfp:1.00 },
      { id:"MEC_HR70", hasHR:true, hrEta:0.70, sfp:1.20 },
      { id:"MEC_HR75", hasHR:true, hrEta:0.75, sfp:1.30 },
      { id:"MEC_HR80", hasHR:true, hrEta:0.80, sfp:1.40 },
      { id:"MEC_HR85", hasHR:true, hrEta:0.85, sfp:1.55 },
      { id:"MEC_HR90", hasHR:true, hrEta:0.90, sfp:1.60 },
      { id:"MEC_HR95", hasHR:true, hrEta:0.95, sfp:1.80 },
      { id:"MEC_ERV",  hasHR:true, hrEta:0.75, sfp:1.40, hasEnthalpy:true },
    ];
    return VENT_TYPES_LOCAL.find(t => t.id === (ventData?.type || systems?.ventType)) || VENT_TYPES_LOCAL[0];
  }, [ventData, systems?.ventType]);

  const vmcHRResult = useMemo(() => {
    const eta_hr = ventData?.hrEfficiency > 0 ? ventData.hrEfficiency / 100
      : ventTypeObj?.hrEta || 0;
    const n_vent = parseFloat(ventData?.airflow) > 0
      ? parseFloat(ventData.airflow) / Math.max(1, V)
      : 0.5;
    return calcVMCHR({
      Au, V,
      n_vent,
      eta_hr,
      sfp: ventTypeObj?.sfp || 1.0,
      theta_int: parseFloat(building?.theta_int) || 20,
      theta_e_mean: climate?.theta_a || 10,
      HDD: climate?.HDD || 2800,
      eta_gen: systems?.heating?.etaGen || 0.85,
      fp_heating: systems?.heating?.fp || 1.1,
      t_op_h: parseFloat(ventData?.operatingHours) || 8760,
      hasEnthalpy: ventTypeObj?.hasEnthalpy || false,
    });
  }, [Au, V, ventData, ventTypeObj, building, climate, systems]);

  const vmcRecommendations = useMemo(() => recommendVMCType(cat, zone, building?.isNew), [cat, zone, building?.isNew]);

  // ── Punți termice dinamice ──
  const dynamicBridges = useMemo(() => calcDynamicBridges(thermalBridges, opaqueElements),
    [thermalBridges, opaqueElements]);
  const dynamicSummary = useMemo(() => summarizeDynamicBridges(dynamicBridges),
    [dynamicBridges]);
  const junctionSuggestions = useMemo(() => detectJunctions(opaqueElements, glazingElements),
    [opaqueElements, glazingElements]);

  // ── Infiltrații n50→ACH ──
  const infiltrationResult = useMemo(() => calcAirInfiltration(
    parseFloat(building?.n50) || 0,
    V,
    opaqueElements.reduce((s,e)=>s+(parseFloat(e.area)||0),0) + glazingElements.reduce((s,e)=>s+(parseFloat(e.area)||0),0)
  ), [building?.n50, V, opaqueElements, glazingElements]);

  // ── Iluminat natural FLZ ──
  const naturalLightResult = useMemo(() => calcNaturalLighting(glazingElements, Au),
    [glazingElements, Au]);

  // ── PMV/PPD confort termic ──
  const [pmvClo, setPmvClo] = useState(1.0);
  const [pmvMet, setPmvMet] = useState(1.2);
  const [pmvVa, setPmvVa] = useState(0.1);
  const pmvResult = useMemo(() => calcPMV({
    ta: parseFloat(building?.theta_int) || 20,
    tr: null,
    va: pmvVa,
    rh: 50,
    met: pmvMet,
    clo: pmvClo,
  }), [building?.theta_int, pmvVa, pmvMet, pmvClo]);

  // ── C107 Conformitate ──
  const c107Result = useMemo(() => {
    if (!opaqueElements.length && !glazingElements.length) return null;
    return checkC107Conformity(opaqueElements, glazingElements, cat, (layers, type) => {
      // calcOpaqueR nu e disponibil direct, calculăm U simplu
      if (!layers?.length) return { u: 1.0 };
      const rsi = 0.13, rse = 0.04;
      const R = rsi + layers.reduce((s,l) => {
        const d = (parseFloat(l.thickness)||0)/1000;
        const lam = parseFloat(l.lambda)||0.5;
        return s + (d > 0 && lam > 0 ? d/lam : 0);
      }, 0) + rse;
      return { u: R > 0 ? 1/R : 1.0 };
    });
  }, [opaqueElements, glazingElements, cat]);

  // ── Glaser condens interstițial ──
  const [glaserElementIdx, setGlaserElementIdx] = useState(0);
  const glaserResult = useMemo(() => {
    const el = opaqueElements[glaserElementIdx];
    if (!el?.layers?.length || !climate) return null;
    return calcGlaserMonthly(el.layers, climate, parseFloat(building?.theta_int) || 20, 50);
  }, [opaqueElements, glaserElementIdx, climate, building?.theta_int]);

  // ── Deviz reabilitare ──
  const [devizWallThick, setDevizWallThick] = useState(10);
  const [devizWallType, setDevizWallType] = useState("eps");
  const [devizRoofThick, setDevizRoofThick] = useState(15);
  const [devizWindows, setDevizWindows] = useState(false);
  const [devizHP, setDevizHP] = useState(false);
  const [devizVMC, setDevizVMC] = useState(false);
  const [devizPV, setDevizPV] = useState(0);

  const devizResult = useMemo(() => calcRehabCost({
    wallArea: opaqueElements.filter(e=>e.type==="PE").reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.7,
    roofArea: opaqueElements.filter(e=>["PT","PP"].includes(e.type)).reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.5,
    floorArea: Au,
    windowArea: glazingElements.reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.15,
    wallInsulType: devizWallType,
    wallInsulThick: devizWallThick,
    roofInsulType: "eps",
    roofInsulThick: devizRoofThick,
    replaceWindows: devizWindows,
    windowType: "3g",
    addHP: devizHP,
    hpType: "aw",
    hpPower: peakLoad?.phi_H_total || 10,
    addVMC: devizVMC,
    Au,
    addSolar: false,
    solarArea: 0,
    addPV: devizPV > 0,
    pvKwp: devizPV,
    contingency: 0.15,
  }), [opaqueElements, glazingElements, Au, devizWallType, devizWallThick, devizRoofThick, devizWindows, devizHP, devizVMC, devizPV, peakLoad]);

  // ── Sarcină frigorifică orară ──
  const coolingHourly = useMemo(() => {
    if (!climate) return null;
    return calcCoolingHourly({
      Au, V,
      glazingElements,
      opaqueElements,
      climate,
      theta_int_cool: 26,
      internalGainsType: ["BI","SA","CO"].includes(cat) ? "office" : "residential",
    });
  }, [Au, V, glazingElements, opaqueElements, climate, cat]);

  // ── Comparativ reabilitare (se folosesc rehabPackages deja calculat) ──
  // rehabPackages e deja disponibil în componenta curentă

  // ── Export XML ──
  function handleXMLExport() {
    const xml = generateEPBDXML({
      building, climate, instSummary, renewSummary,
      opaqueElements, glazingElements,
      energyClass: renewSummary?.energyClass || instSummary?.energyClass,
      certDate: new Date().toISOString().split('T')[0],
      auditorName: building?.auditorName || "Auditor energetic",
      auditorCode: building?.auditorCode || "AE-XXXX",
    });
    downloadXML(xml, `CPE-${(building?.address || "cladire").replace(/[^a-z0-9]/gi,'_')}.xml`);
    setXmlGenerated(true);
  }

  // ── MDLPA — Validare XML ──
  function handleXMLValidate() {
    setXmlValidating(true);
    setXmlValidation(null);
    try {
      const xml = generateEPBDXML({
        building, climate, instSummary, renewSummary,
        opaqueElements, glazingElements,
        energyClass: renewSummary?.energyClass || instSummary?.energyClass,
        certDate: new Date().toISOString().split('T')[0],
        auditorName: building?.auditorName || "Auditor energetic",
        auditorCode: building?.auditorCode || "AE-XXXX",
      });
      const checks = [
        { field: "Adresă clădire", ok: !!(building?.address && building.address.trim().length > 2) },
        { field: "Auditor (nume)", ok: !!(building?.auditorName && building.auditorName.trim().length > 2) },
        { field: "Număr atestat auditor", ok: !!(building?.auditorCode && building.auditorCode !== "AE-XXXX" && building.auditorCode.trim().length > 3) },
        { field: "EP total [kWh/(m²·an)]", ok: (instSummary?.ep_total_m2 || renewSummary?.ep_adjusted_m2 || 0) > 0 },
        { field: "Clasă energetică", ok: !!(renewSummary?.energyClass?.class || instSummary?.energyClass?.class) },
        { field: "Suprafață utilă Au [m²]", ok: (parseFloat(building?.areaUseful) || 0) > 0 },
        { field: "Format XML generat (tag CPE)", ok: xml.includes("<EnergyPerformanceCertificate") },
        { field: "Dată certificat (format ISO)", ok: /\d{4}-\d{2}-\d{2}/.test(new Date().toISOString().split('T')[0]) },
      ];
      setXmlValidation({ checks, xml });
    } catch(e) {
      setXmlValidation({ error: e.message });
    } finally {
      setXmlValidating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TAB_SECTIONS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === t.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ BENCHMARK ═══ */}
      {activeTab === "benchmark" && (
        <Card className="p-4">
          <SectionHeader icon="📊" title="Benchmark performanță energetică"
            subtitle="Comparare cu stocul de clădiri similar din aceeași zonă climatică (date agregate MDLPA 2022-2024)" />
          {benchmark ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Clădirea dvs.</div>
                  <div className="text-2xl font-bold text-white">{epActual} <span className="text-sm text-slate-400">kWh/(m²·an)</span></div>
                  <Badge className="mt-1" style={{ backgroundColor: benchmark.percentileActual?.color + "33", color: benchmark.percentileActual?.color }}>
                    {benchmark.percentileActual?.label}
                  </Badge>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Median similar (zona {zone})</div>
                  <div className="text-2xl font-bold text-slate-300">{benchmark.benchmark.p50} <span className="text-sm text-slate-400">kWh/(m²·an)</span></div>
                  <div className="text-xs text-slate-500 mt-1">Perioada: {benchmark.eraLabel}</div>
                </div>
              </div>
              {/* Bar chart */}
              <div className="space-y-2">
                {benchmark.chart.bars.map(bar => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cn("text-slate-300", bar.highlight && "font-bold text-white")}>{bar.label}</span>
                      <span className="text-slate-400">{bar.value} kWh/m²</span>
                    </div>
                    <ColorBar value={bar.value} max={benchmark.benchmark.p90 * 1.1} color={bar.color} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3">
                {benchmark.verdict}<br/>
                <span className="text-indigo-300">{benchmark.recommendation}</span>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Date insuficiente pentru benchmark.</p>}
        </Card>
      )}

      {/* ═══ EN 12831 ═══ */}
      {activeTab === "en12831" && (
        <Card className="p-4">
          <SectionHeader icon="🔥" title="Sarcină termică de vârf — SR EN 12831-1:2017"
            subtitle="Calcul putere necesară pentru dimensionarea instalației de încălzire și răcire" />
          {peakLoad ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-red-300 mb-1">Sarcină vârf încălzire</div>
                  <div className="text-2xl font-bold text-white">{(peakLoad.phi_H_total/1000).toFixed(1)}</div>
                  <div className="text-xs text-slate-400">kW</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-300 mb-1">Sarcină specifică</div>
                  <div className="text-2xl font-bold text-white">{peakLoad.phi_specific}</div>
                  <div className="text-xs text-slate-400">W/m²</div>
                </div>
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-300 mb-1">ΔT calcul</div>
                  <div className="text-2xl font-bold text-white">{peakLoad.deltaT}°C</div>
                  <div className="text-xs text-slate-400">{peakLoad.tInt}°C interior / {peakLoad.tExt}°C exterior</div>
                </div>
              </div>
              <ResultRow label="H_T — transmisie" value={peakLoad.H_T + " W/K"} />
              <ResultRow label="H_V — ventilare" value={peakLoad.H_V + " W/K"} />
              <ResultRow label="H_TB — punți termice" value={peakLoad.H_TB + " W/K"} />
              <ResultRow label="H_total" value={peakLoad.H_total + " W/K"} />
              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-sm text-indigo-200">
                <strong>Sistem recomandat:</strong> {peakLoad.systemRecommendation}
              </div>
              {peakCooling && (
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="text-sm font-medium text-slate-300 mb-2">Sarcină de răcire (estimare EN 15243)</div>
                  <ResultRow label="Sarcină vârf răcire" value={(peakCooling.phi_C_total/1000).toFixed(1) + " kW"} />
                  <ResultRow label="Specific" value={peakCooling.phi_C_m2 + " W/m²"} />
                  <div className="text-xs text-slate-400 mt-2">{peakCooling.coolingSysRec}</div>
                </div>
              )}
              {/* Tabel elemente */}
              {peakLoad.elementLoads?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Detaliu pierderi pe elemente</div>
                  <div className="overflow-auto max-h-40">
                    <table className="w-full text-xs text-slate-300">
                      <thead><tr className="text-slate-500 border-b border-slate-700">
                        <th className="text-left pb-1">Element</th>
                        <th className="text-right pb-1">Arie m²</th>
                        <th className="text-right pb-1">U W/(m²·K)</th>
                        <th className="text-right pb-1">H W/K</th>
                      </tr></thead>
                      <tbody>{peakLoad.elementLoads.map((el,i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="py-1">{el.name}</td>
                          <td className="text-right">{el.area}</td>
                          <td className="text-right">{el.U}</td>
                          <td className="text-right">{el.load_WK}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți date anvelopă (Pasul 2) pentru calcul sarcină termică.</p>}
        </Card>
      )}

      {/* ═══ VENTILARE ═══ */}
      {activeTab === "ventilare" && (
        <Card className="p-4">
          <SectionHeader icon="💨" title="Debit ventilare igienic — SR EN 16798-1:2019"
            subtitle="Verificare calitate aer interior, calcul CO₂ estimat și conformitate debit" />
          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Număr persoane (opțional)</label>
              <input type="number" value={nPersons} onChange={e=>setNPersons(e.target.value)} min="1" placeholder="auto"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            </div>
          </div>
          {ventFlow ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Debit necesar</div>
                  <div className="text-xl font-bold text-white">{ventFlow.q_total_M3H}</div>
                  <div className="text-xs text-slate-400">m³/h</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">CO₂ estimat</div>
                  <div className={cn("text-xl font-bold", ventFlow.co2Conform ? "text-green-400" : "text-red-400")}>{ventFlow.co2_steady}</div>
                  <div className="text-xs text-slate-400">ppm (limită: {ventFlow.co2Limit})</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Schimburi aer</div>
                  <div className="text-xl font-bold text-white">{ventFlow.n_air}</div>
                  <div className="text-xs text-slate-400">ach</div>
                </div>
              </div>
              <ResultRow label="Persoane estimate" value={ventFlow.nPersons + " pers."} />
              <ResultRow label="Debit specific per persoană" value={VENT_PER_PERSON["II"] + " L/s·pers (Cat. II)"} />
              <ResultRow label="Debit minim igienic" value={ventFlow.q_min_LS + " L/s"} />
              <ResultRow label="Energie ventilare estimată" value={ventFlow.ventEnergyKwh + " kWh/an"} />
              <div className="flex gap-2">
                <ConformBadge ok={ventFlow.qConform} label="Debit conform" />
                <ConformBadge ok={ventFlow.co2Conform} label={"CO₂ ≤ " + ventFlow.co2Limit + " ppm"} />
              </div>
              <div className="text-xs rounded-lg p-3" style={{ backgroundColor: ventFlow.color + "22", color: ventFlow.color }}>
                {ventFlow.verdict}
              </div>
              {ventFlow.recommendation && (
                <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">{ventFlow.recommendation}</div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți aria utilă pentru calcul ventilare.</p>}
        </Card>
      )}

      {/* ═══ VMC CU RECUPERARE DE CĂLDURĂ ═══ */}
      {activeTab === "vmc_hr" && (
        <Card className="p-4">
          <SectionHeader icon="🔄" title="VMC cu recuperare de căldură — calcul performanță"
            subtitle="SR EN 16798-3:2017 · I5-2022 · EN 308 — eficiență HR, SFP, economie energie, confort" />

          {/* Info tip ventilare curent */}
          <div className="mb-4 rounded-lg bg-slate-800/60 px-3 py-2 flex items-center gap-3">
            <span className="text-lg">💨</span>
            <div>
              <div className="text-xs font-medium text-slate-200">
                Tip ventilare activ: <span className="text-amber-300">{ventData?.type || systems?.ventType || "NAT"}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {ventTypeObj?.hasHR
                  ? `Recuperare căldură η = ${(ventTypeObj.hrEta * 100).toFixed(0)}%${ventTypeObj.hasEnthalpy ? " (entalpic)" : " (sensibil)"}`
                  : "Fără recuperare de căldură — setați un tip VMC-HR în Pasul 3"}
              </div>
            </div>
          </div>

          {vmcHRResult ? (
            <div className="space-y-4">
              {/* KPI badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className={cn("rounded-lg p-3 text-center border",
                  vmcHRResult.E_saved_thermal_kWh > 0
                    ? "bg-green-900/20 border-green-800/40"
                    : "bg-slate-800 border-slate-700")}>
                  <div className="text-xs text-green-300 mb-1">Energie recuperată</div>
                  <div className="text-2xl font-bold text-white">{vmcHRResult.Q_recovered_kWh.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">kWh/an</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Economie termică</div>
                  <div className="text-xl font-bold text-white">{vmcHRResult.E_saved_per_m2}</div>
                  <div className="text-[10px] text-slate-400">kWh/(m²·an)</div>
                </div>
                <div className={cn("rounded-lg p-3 text-center",
                  vmcHRResult.sfpClass === "SFP1" || vmcHRResult.sfpClass === "SFP2"
                    ? "bg-green-900/20 border border-green-800/30"
                    : "bg-amber-900/20 border border-amber-800/30")}>
                  <div className="text-xs text-slate-400 mb-1">Clasă SFP</div>
                  <div className="text-xl font-bold text-white">{vmcHRResult.sfpClass}</div>
                  <div className="text-[10px] text-slate-400">{vmcHRResult.sfp_W_m3s} W/(m³/s)</div>
                </div>
              </div>

              {/* Bilanț energie */}
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Bilanț energetic anual</div>
                <div className="space-y-1.5">
                  {[
                    ["Energie ventilare fără recuperare (ref.)", vmcHRResult.Q_vent_ref_kWh.toLocaleString() + " kWh", "slate"],
                    ["Energie recuperată de schimbător HR", "+ " + vmcHRResult.Q_recovered_kWh.toLocaleString() + " kWh", "green"],
                    vmcHRResult.Q_enthalpy_extra > 0 && ["Recuperare entalpică suplimentară", "+ " + vmcHRResult.Q_enthalpy_extra.toLocaleString() + " kWh", "cyan"],
                    ["Energie electrică ventilator (VMC-HR)", "- " + vmcHRResult.E_fan_kWh.toLocaleString() + " kWh", "amber"],
                    ["Energie extra față de ventilare simplă", "- " + vmcHRResult.E_fan_extra_kWh.toLocaleString() + " kWh", "amber"],
                    ["Economie netă energie primară", vmcHRResult.E_net_primary_kWh.toLocaleString() + " kWh/EP", vmcHRResult.E_net_primary_kWh > 0 ? "green" : "red"],
                  ].filter(Boolean).map(([lbl, val, color]) => (
                    <div key={lbl} className="flex justify-between items-center bg-slate-800/50 rounded px-3 py-1.5 text-xs">
                      <span className="text-slate-400">{lbl}</span>
                      <span className={cn("font-mono font-medium",
                        color === "green" ? "text-green-400" :
                        color === "amber" ? "text-amber-400" :
                        color === "red" ? "text-red-400" :
                        color === "cyan" ? "text-cyan-400" :
                        "text-slate-300")}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parametri sistem */}
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Parametri sistem ventilare</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ["Debit volumetric", vmcHRResult.q_vent_m3h + " m³/h"],
                    ["Putere ventilator", vmcHRResult.P_fan_W + " W"],
                    ["Temperatură aer insuflat", vmcHRResult.theta_supply + " °C"],
                    ["CO₂ economisit", vmcHRResult.co2_saved_kg.toLocaleString() + " kg/an"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between bg-slate-800/50 rounded px-2.5 py-1.5 text-xs">
                      <span className="text-slate-400">{l}</span>
                      <span className="font-mono text-slate-200">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerte */}
              {vmcHRResult.frostRisk && (
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-300">
                  ❄️ <strong>Risc îngheț schimbător:</strong> La temperaturi sub {vmcHRResult.t_frost}°C poate apărea îngheț în recuperator.
                  Prevăzut bypass de vară sau preîncălzire electrică.
                </div>
              )}
              {vmcHRResult.draftRisk && (
                <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300">
                  💨 <strong>Curent rece:</strong> Aer insuflat la ~{vmcHRResult.theta_supply}°C poate cauza disconfort.
                  Recomandare: grile difuzie tip plafon sau insuflare laterală înaltă.
                </div>
              )}

              {/* Estimare economică */}
              {vmcHRResult.net_saving_eur > 0 && (
                <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-3 text-xs">
                  <div className="text-emerald-300 font-medium mb-1.5">Estimare economică</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-slate-400">Cost instalare est.</div><div className="text-white font-bold">{vmcHRResult.cost_hr_eur.toLocaleString()} EUR</div></div>
                    <div><div className="text-slate-400">Economie netă/an</div><div className="text-emerald-400 font-bold">{vmcHRResult.net_saving_eur.toLocaleString()} EUR</div></div>
                    <div><div className="text-slate-400">Recuperare investiție</div><div className="text-white font-bold">{vmcHRResult.payback_years || "—"} ani</div></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Introduceți datele clădirii pentru calcul VMC.</p>
          )}

          {/* Recomandări */}
          {vmcRecommendations.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-xs font-medium text-slate-400 uppercase">Recomandări proiectare VMC</div>
              {vmcRecommendations.map((r, i) => (
                <div key={i} className={cn("text-xs rounded p-2",
                  r.priority === "high"   ? "bg-amber-900/20 text-amber-300" :
                  r.priority === "medium" ? "bg-slate-800/60 text-slate-300" :
                                            "bg-blue-900/20 text-blue-300")}>
                  {r.priority === "high" ? "⚠ " : r.priority === "info" ? "ℹ " : "• "}{r.text}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ═══ PUNȚI TERMICE DINAMICE ═══ */}
      {activeTab === "tb_dinamic" && (
        <Card className="p-4">
          <SectionHeader icon="🔗" title="Punți termice liniare — calcul ψ dinamic"
            subtitle="SR EN ISO 14683:2017 · C107/3-2005 — ψ actualizat automat din stratificația reală a elementelor" />

          {thermalBridges.length > 0 ? (
            <div className="space-y-4">
              {/* Sumar total */}
              {dynamicSummary && (
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">ΣψL original</div>
                    <div className="text-xl font-bold text-white">{dynamicSummary.total_psiL_orig}</div>
                    <div className="text-[10px] text-slate-400">W/K</div>
                  </div>
                  <div className={cn("rounded-lg p-3 text-center border",
                    dynamicSummary.improved ? "bg-green-900/20 border-green-800/40" : "bg-slate-800 border-slate-700")}>
                    <div className="text-xs text-slate-400 mb-1">ΣψL dinamic</div>
                    <div className={cn("text-xl font-bold", dynamicSummary.improved ? "text-green-400" : "text-white")}>
                      {dynamicSummary.total_psiL_dyn}
                    </div>
                    <div className="text-[10px] text-slate-400">W/K</div>
                  </div>
                  <div className={cn("rounded-lg p-3 text-center",
                    dynamicSummary.delta < 0 ? "bg-green-900/20" : dynamicSummary.delta > 0.1 ? "bg-red-900/20" : "bg-slate-800")}>
                    <div className="text-xs text-slate-400 mb-1">Variație</div>
                    <div className={cn("text-xl font-bold",
                      dynamicSummary.delta < 0 ? "text-green-400" : dynamicSummary.delta > 0.1 ? "text-red-400" : "text-slate-300")}>
                      {dynamicSummary.delta > 0 ? "+" : ""}{dynamicSummary.delta}
                    </div>
                    <div className="text-[10px] text-slate-400">W/K</div>
                  </div>
                </div>
              )}

              {/* Lista punți termice cu ψ dinamic */}
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Punți termice — ψ dinamic vs catalog</div>
                <div className="space-y-1.5">
                  {dynamicBridges.map((tb, i) => (
                    <div key={i} className={cn("rounded-lg p-3 text-xs border",
                      tb.isDynamic && tb.delta_psi < -0.01 ? "border-green-800/30 bg-green-900/10" :
                      tb.isDynamic && tb.delta_psi > 0.01  ? "border-amber-800/30 bg-amber-900/10" :
                      "border-slate-700/50 bg-slate-800/40")}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-slate-200 truncate flex-1">{tb.desc || tb.cat || "Punte termică"}</span>
                        <span className="text-slate-500 text-[10px] ml-2">{(parseFloat(tb.length)||0).toFixed(1)} m</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-[9px] text-slate-500">ψ introdus</div>
                          <div className="font-mono text-slate-300">{parseFloat(tb.psi)?.toFixed(3) || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500">ψ catalog</div>
                          <div className="font-mono text-slate-400">{tb.psi_catalog?.toFixed(3) || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500">ψ dinamic</div>
                          <div className={cn("font-mono font-medium",
                            tb.isDynamic && tb.delta_psi < -0.01 ? "text-green-400" :
                            tb.isDynamic && tb.delta_psi > 0.01  ? "text-amber-400" :
                            "text-slate-200")}>{tb.psi_dyn?.toFixed(3) || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500">ψL dinamic</div>
                          <div className="font-mono text-slate-200">{tb.psiL_dyn?.toFixed(2) || "—"} W/K</div>
                        </div>
                      </div>
                      {tb.isDynamic && tb.R_ins_used > 0 && (
                        <div className="text-[9px] text-slate-500 mt-1">
                          R_izolație detectat: {tb.R_ins_used} m²·K/W
                          {tb.delta_psi < -0.01 && <span className="text-green-400 ml-1">↓ Izolația reduce ψ</span>}
                          {tb.delta_psi > 0.01  && <span className="text-amber-400 ml-1">↑ Valoare ajustată față de catalog</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notă metodologie */}
              <div className="text-[10px] text-slate-500 bg-slate-800/30 rounded p-2">
                ℹ ψ dinamic interpolat liniar între ψ_neizolat (catalog) și ψ_izolat (catalog) funcție de R_izolație element adiacent.
                Metodă: ISO 14683:2017 + Mc 001-2022 Anexa B. R_ref = 3.5 m²·K/W.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-500 text-sm">Nicio punte termică introdusă în Pasul 2.</p>
              {junctionSuggestions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2">Joncțiuni probabile detectate din elementele introduse:</div>
                  <div className="space-y-1.5">
                    {junctionSuggestions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded px-3 py-2 text-xs">
                        <span className="text-amber-400">⚠</span>
                        <div>
                          <div className="text-slate-200">{s.name}</div>
                          <div className="text-[9px] text-slate-500">{s.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    Adăugați aceste punți termice în Pasul 2 → Punți termice pentru calcul automat ψ dinamic.
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ═══ INFILTRAȚII N50 ═══ */}
      {activeTab === "infiltratii" && (
        <Card className="p-4">
          <SectionHeader icon="💨" title="Infiltrații aer — n50 → ACH natural (Sherman-Grimsrud)"
            subtitle="EN 13829:2001 + Mc 001-2022 — conversie test Blower Door la ventilare infiltrații reale" />
          {infiltrationResult ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                n50 curent: <span className="font-mono text-white">{parseFloat(building?.n50) || "—"} h⁻¹</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">n50</div>
                  <div className="text-2xl font-bold text-white">{infiltrationResult.n50}</div>
                  <div className="text-[10px] text-slate-400">h⁻¹</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">ACH natural estimat</div>
                  <div className="text-2xl font-bold text-white">{infiltrationResult.ach_natural}</div>
                  <div className="text-[10px] text-slate-400">h⁻¹</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Pierderi la ΔT=30K</div>
                  <div className="text-2xl font-bold text-white">{infiltrationResult.heat_loss_kW}</div>
                  <div className="text-[10px] text-slate-400">kW</div>
                </div>
              </div>
              {infiltrationResult.classification && (
                <Badge className={cn("text-xs",
                  infiltrationResult.classification === "Pasivhaus" ? "bg-green-900/50 text-green-300" :
                  infiltrationResult.classification === "Etanș"     ? "bg-blue-900/50 text-blue-300" :
                  infiltrationResult.classification === "Mediu"     ? "bg-amber-900/50 text-amber-300" :
                  "bg-red-900/50 text-red-300")}>
                  {infiltrationResult.classification}
                </Badge>
              )}
              <ResultRow label="q50 [m³/h]" value={infiltrationResult.q50 + " m³/h"} />
              <ResultRow label="qenv [m³/(h·m²)]" value={infiltrationResult.q50_env + " m³/(h·m²)"} />
              {infiltrationResult.recommendation && (
                <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">
                  ⚠ {infiltrationResult.recommendation}
                </div>
              )}
              <div className="text-[10px] text-slate-500 bg-slate-800/30 rounded p-2">
                ℹ Factor corecție n50/20 — valabil pentru clădiri în teren protejat (n50/20 … n50/30 pentru zone expuse)
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Introduceți n50 în Pasul 1 → Date clădire</p>
          )}
        </Card>
      )}

      {/* ═══ ILUMINAT NATURAL ═══ */}
      {activeTab === "iluminat_nat" && (
        <Card className="p-4">
          <SectionHeader icon="☀️" title="Iluminat natural — Factor lumină zi FLZ (EN 15193-1)"
            subtitle="NP 061-02 — cerința min FLZ=2% pentru spații de locuit; reducere LENI prin iluminat natural" />
          {naturalLightResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className={cn("rounded-lg p-3 text-center border",
                  naturalLightResult.flz >= 5  ? "bg-green-900/20 border-green-800/40" :
                  naturalLightResult.flz >= 2  ? "bg-blue-900/20 border-blue-800/40" :
                  "bg-red-900/20 border-red-800/40")}>
                  <div className="text-xs text-slate-400 mb-1">FLZ</div>
                  <div className={cn("text-2xl font-bold",
                    naturalLightResult.flz >= 5 ? "text-green-400" :
                    naturalLightResult.flz >= 2 ? "text-blue-300" : "text-red-400")}>
                    {naturalLightResult.flz}
                  </div>
                  <div className="text-[10px] text-slate-400">%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Raport vitrare</div>
                  <div className="text-2xl font-bold text-white">{naturalLightResult.wwr}</div>
                  <div className="text-[10px] text-slate-400">%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Reducere LENI</div>
                  <div className="text-2xl font-bold text-white">{naturalLightResult.leni_reduction}</div>
                  <div className="text-[10px] text-slate-400">%</div>
                </div>
              </div>

              {naturalLightResult.classification && (
                <Badge className={cn("text-xs",
                  naturalLightResult.flz >= 5 ? "bg-green-900/50 text-green-300" :
                  naturalLightResult.flz >= 2 ? "bg-blue-900/50 text-blue-300" :
                  "bg-red-900/50 text-red-300")}>
                  {naturalLightResult.classification}
                </Badge>
              )}

              {naturalLightResult.flz < 2 && (
                <div className="text-xs text-red-300 bg-red-900/20 rounded p-2">
                  ✗ FLZ sub limita minimă de 2% (NP 061-02). Creșteți suprafața vitratelor sau îmbunătățiți factorul de transmisie lumină.
                </div>
              )}
              {naturalLightResult.flz >= 5 && (
                <Badge className="bg-green-900/50 text-green-300 text-xs">✓ Excelent iluminat natural</Badge>
              )}

              {naturalLightResult.glazingContributions?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase mb-2">Contribuție geamuri la FLZ</div>
                  <div className="overflow-auto max-h-48">
                    <table className="w-full text-xs text-slate-300">
                      <thead><tr className="text-slate-500 border-b border-slate-700">
                        <th className="text-left pb-1">Orientare</th>
                        <th className="text-right pb-1">Suprafață m²</th>
                        <th className="text-right pb-1">g factor</th>
                        <th className="text-right pb-1">Contrib. FLZ %</th>
                      </tr></thead>
                      <tbody>
                        {naturalLightResult.glazingContributions.map((g, i) => (
                          <tr key={i} className="border-b border-slate-800">
                            <td className="py-1">{g.orientation || "—"}</td>
                            <td className="text-right">{g.area}</td>
                            <td className="text-right">{g.g}</td>
                            <td className="text-right">{g.flz_contrib}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Adăugați elemente vitrate (Pasul 2) pentru calcul FLZ</p>
          )}
        </Card>
      )}

      {/* ═══ CONFORT PMV ═══ */}
      {activeTab === "confort_pmv" && (
        <Card className="p-4">
          <SectionHeader icon="🌡️" title="Confort termic — PMV/PPD (ISO 7730:2005)"
            subtitle="ASHRAE 55:2020 + SR EN 16798-1:2019 — Predicted Mean Vote / Predicted Percentage of Dissatisfied" />
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Clo */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Îmbrăcăminte — Clo: <span className="font-mono text-white">{pmvClo.toFixed(1)}</span>
                {PMV_CLOTHING && PMV_CLOTHING.find(c => Math.abs(c.value - pmvClo) < 0.05) && (
                  <span className="text-slate-500 ml-2">({PMV_CLOTHING.find(c => Math.abs(c.value - pmvClo) < 0.05)?.label})</span>
                )}
              </label>
              <input type="range" min="0.0" max="2.0" step="0.1" value={pmvClo}
                onChange={e => setPmvClo(parseFloat(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.0 (Dezbrăcat)</span><span>1.0 (Casual)</span><span>2.0 (Iarnă)</span>
              </div>
            </div>
            {/* Met */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Activitate metabolică — Met: <span className="font-mono text-white">{pmvMet.toFixed(1)}</span>
                {PMV_ACTIVITY && PMV_ACTIVITY.find(a => Math.abs(a.value - pmvMet) < 0.05) && (
                  <span className="text-slate-500 ml-2">({PMV_ACTIVITY.find(a => Math.abs(a.value - pmvMet) < 0.05)?.label})</span>
                )}
              </label>
              <input type="range" min="0.8" max="3.0" step="0.1" value={pmvMet}
                onChange={e => setPmvMet(parseFloat(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.8 (Somn)</span><span>1.2 (Șezând)</span><span>3.0 (Activitate intensă)</span>
              </div>
            </div>
            {/* Va */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Viteză aer interior — va: <span className="font-mono text-white">{pmvVa.toFixed(2)} m/s</span>
              </label>
              <input type="range" min="0.05" max="0.5" step="0.05" value={pmvVa}
                onChange={e => setPmvVa(parseFloat(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.05 (Calm)</span><span>0.2 (Normal)</span><span>0.5 (Curent)</span>
              </div>
            </div>
          </div>
          {pmvResult ? (
            <div className="space-y-4">
              {/* PMV mare în centru */}
              <div className="text-center py-4">
                <div className="text-xs text-slate-400 mb-1">PMV (Predicted Mean Vote)</div>
                <div className={cn("text-5xl font-bold",
                  Math.abs(pmvResult.pmv) <= 0.5 ? "text-green-400" :
                  Math.abs(pmvResult.pmv) <= 1.0 ? "text-amber-400" :
                  "text-red-400")}>
                  {pmvResult.pmv > 0 ? "+" : ""}{pmvResult.pmv?.toFixed(2)}
                </div>
                <div className="text-lg text-slate-300 mt-1">{pmvResult.sensation}</div>
                <div className="text-xs text-slate-500 mt-1">-3 (Foarte rece) … 0 (Neutru) … +3 (Foarte cald)</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={cn("rounded-lg p-3 text-center border",
                  pmvResult.ppd <= 10 ? "bg-green-900/20 border-green-800/40" :
                  pmvResult.ppd <= 20 ? "bg-amber-900/20 border-amber-800/40" :
                  "bg-red-900/20 border-red-800/40")}>
                  <div className="text-xs text-slate-400 mb-1">PPD</div>
                  <div className={cn("text-2xl font-bold",
                    pmvResult.ppd <= 10 ? "text-green-400" :
                    pmvResult.ppd <= 20 ? "text-amber-400" : "text-red-400")}>
                    {pmvResult.ppd?.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {pmvResult.ppd <= 10 ? "✓ OK — ISO 7730 (<10%)" : "✗ Peste limita ISO 7730"}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Temperatură operativă</div>
                  <div className="text-2xl font-bold text-white">{pmvResult.operative_temp?.toFixed(1)}°C</div>
                  <div className="text-[10px] text-slate-400">to = (ta + tr) / 2</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {pmvResult.iso7730_category && (
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Categorie ISO 7730</div>
                    <div className={cn("text-xl font-bold",
                      pmvResult.iso7730_category === "A" ? "text-green-400" :
                      pmvResult.iso7730_category === "B" ? "text-amber-400" : "text-orange-400")}>
                      {pmvResult.iso7730_category}
                    </div>
                  </div>
                )}
                {pmvResult.ieq_class && (
                  <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Clasă IEQ</div>
                    <div className={cn("text-xl font-bold",
                      pmvResult.ieq_class === "I"  ? "text-green-400" :
                      pmvResult.ieq_class === "II" ? "text-blue-300" :
                      pmvResult.ieq_class === "III"? "text-amber-400" : "text-red-400")}>
                      {pmvResult.ieq_class}
                    </div>
                  </div>
                )}
              </div>

              {pmvResult.recommendations?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-400 uppercase">Recomandări</div>
                  {pmvResult.recommendations.map((r, i) => (
                    <div key={i} className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">⚠ {r}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Introduceți temperatura interioară în Pasul 1 pentru calcul PMV.</p>
          )}
        </Card>
      )}

      {/* ═══ C107 CONFORMITATE ═══ */}
      {activeTab === "c107" && (
        <Card className="p-4">
          <SectionHeader icon="📐" title="Conformitate C107/2-2005 + Mc 001-2022"
            subtitle="Verificare rezistențe termice minime per element față de cerințele normative" />
          {c107Result ? (
            <div className="space-y-4">
              {/* Badge sumar */}
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-900/50 text-green-300 text-xs">
                  ✓ {c107Result.checks?.filter(c => c.conform).length || 0} conforme
                </Badge>
                <Badge className="bg-red-900/50 text-red-300 text-xs">
                  ✗ {c107Result.checks?.filter(c => !c.conform).length || 0} neconforme
                </Badge>
              </div>

              {/* Lista checks */}
              {c107Result.checks?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400 uppercase mb-1">Verificare elemente</div>
                  {c107Result.checks.map((check, i) => {
                    const margin = check.u_max > 0
                      ? ((check.u_max - check.u_actual) / check.u_max * 100)
                      : 0;
                    const isWarning = check.conform && margin < 10;
                    return (
                      <div key={i} className={cn("rounded-lg p-3 text-xs border",
                        !check.conform   ? "border-red-800/40 bg-red-900/10" :
                        isWarning        ? "border-amber-800/40 bg-amber-900/10" :
                        "border-green-800/30 bg-green-900/10")}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-slate-200 truncate flex-1">
                            {check.name || check.element}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">{check.type}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-[9px] text-slate-500">U actual</div>
                            <div className={cn("font-mono font-medium",
                              !check.conform ? "text-red-400" : "text-green-400")}>
                              {check.u_actual?.toFixed(3)} W/(m²·K)
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500">U max C107</div>
                            <div className="font-mono text-slate-300">{check.u_max?.toFixed(3)} W/(m²·K)</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500">Marjă</div>
                            <div className={cn("font-mono font-medium",
                              !check.conform   ? "text-red-400" :
                              isWarning        ? "text-amber-400" :
                              "text-green-400")}>
                              {check.conform ? "+" : ""}{margin.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Verdict */}
              {c107Result.summary && (
                <div className={cn("text-xs rounded-lg p-3",
                  c107Result.checks?.every(c => c.conform)
                    ? "bg-green-900/20 text-green-300"
                    : "bg-red-900/20 text-red-300")}>
                  {c107Result.summary}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă (Pasul 2)</p>
          )}
        </Card>
      )}

      {/* ═══ POMPĂ CĂLDURĂ ═══ */}
      {activeTab === "pompa" && (
        <Card className="p-4">
          <SectionHeader icon="♨️" title="Dimensionare pompă de căldură + SCOP sezonier"
            subtitle="SR EN 14825:2022 — putere nominală, SCOP real pe date climatice" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Tip pompă de căldură</label>
            <select value={hpTypeId} onChange={e=>setHpTypeId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
              {HP_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
          </div>
          {hpSizing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-300">Putere recomandată</div>
                  <div className="text-2xl font-bold text-white">{hpSizing.phi_nom_kW} kW</div>
                </div>
                <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-300">SCOP sezonier</div>
                  <div className="text-2xl font-bold text-white">{hpSizing.scop?.scop || "—"}</div>
                  <div className="text-xs text-slate-400">{hpSizing.scop?.classification}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Cost estimat</div>
                  <div className="text-lg font-bold text-white">{hpSizing.costEstimate?.toLocaleString()} EUR</div>
                </div>
              </div>
              <ResultRow label="Temperatură agent termic" value={hpSizing.agentTemp + "°C — " + hpSizing.agentTempLabel.split("—")[0]} />
              <ResultRow label="Vas tampon recomandat" value={hpSizing.vasBuffer_L + " L"} />
              <ResultRow label="Boiler ACM recomandat" value={hpSizing.boilerACM_L + " L"} />
              <ConformBadge ok={hpSizing.compatible_floor_heating} label="Compatibil pardoseală" />
              {hpSizing.recommendation?.map((r,i) => (
                <div key={i} className="text-xs text-indigo-200 bg-indigo-900/20 rounded p-2">{r}</div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">Calculați mai întâi sarcina termică (tab Sarcină vârf).</p>}
        </Card>
      )}

      {/* ═══ COMPARATOR PACHETE REABILITARE ═══ */}
      {activeTab === "rehab" && (
        <Card className="p-4">
          <SectionHeader icon="🏗️" title="Comparator pachete de reabilitare"
            subtitle="Analiză paralelă 3 scenarii: Minimal, Mediu, nZEB Integral — NPV + termen recuperare" />
          {rehabPackages ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-3">
                EP actual: <strong className="text-white">{epActual}</strong> kWh/(m²·an) |
                Țintă nZEB: <strong className="text-green-400">{rehabPackages.nzebEpMax}</strong> kWh/(m²·an) |
                Gap: <strong className="text-orange-400">{rehabPackages.epGap}</strong> kWh/(m²·an)
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {rehabPackages.packages.map((pkg, i) => (
                  <div key={i} className={cn("rounded-xl p-4 border",
                    pkg.isBest ? "border-green-600 bg-green-900/10" : "border-slate-700 bg-slate-800/50")}>
                    {pkg.isBest && <Badge className="bg-green-600 text-white text-xs mb-2">⭐ Optim NPV</Badge>}
                    <div className="font-bold text-white mb-1">{pkg.label}</div>
                    <div className="text-2xl font-bold" style={{color: pkg.nzebConform ? "#22c55e" : "#f97316"}}>
                      {pkg.epNew} <span className="text-sm text-slate-400">kWh/(m²·an)</span>
                    </div>
                    <div className="text-xs text-slate-400">Reducere: -{pkg.epReductionPct}%</div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Investiție</span><span className="text-white font-medium">{pkg.invest?.toLocaleString()} EUR</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Economie anuală</span><span className="text-green-400">{pkg.annualSaving?.toLocaleString()} EUR/an</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">NPV 30 ani</span>
                        <span className={pkg.fin?.npv >= 0 ? "text-green-400" : "text-red-400"}>{pkg.fin?.npv?.toLocaleString()} EUR</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Recuperare</span><span className="text-white">{pkg.fin?.paybackSimple} ani</span></div>
                      {pkg.fin?.irr && <div className="flex justify-between"><span className="text-slate-400">IRR</span><span className="text-white">{pkg.fin.irr}%</span></div>}
                    </div>
                    <ConformBadge ok={pkg.nzebConform} label={pkg.nzebConform ? "Conform nZEB" : "Sub nZEB"} />
                    <div className="mt-2 text-xs text-slate-500">
                      {pkg.measures?.map((m,j) => <div key={j}>• {m}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Date insuficiente pentru compararea pachetelor.</p>}
        </Card>
      )}

      {/* ═══ PNRR / FINANȚARE ═══ */}
      {activeTab === "pnrr" && (
        <Card className="p-4">
          <SectionHeader icon="💶" title="Calculator finanțare — Casa Verde Plus, PNRR, AFM"
            subtitle="Eligibilitate și grant estimat pentru programele active 2024-2026 în România" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Tip proprietar</label>
            <select value={ownerType} onChange={e=>setOwnerType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
              <option value="fizica">Persoană fizică</option>
              <option value="juridica">Persoană juridică / Firmă</option>
              <option value="uat">Autoritate publică (UAT)</option>
            </select>
          </div>
          {pnrrResult ? (
            <div className="space-y-3">
              {pnrrResult.bestProgram && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
                  <div className="text-xs text-green-400 font-medium mb-1">CEL MAI BUN PROGRAM ELIGIBIL</div>
                  <div className="font-bold text-white">{pnrrResult.bestProgram.programName}</div>
                  <div className="text-2xl font-bold text-green-400 mt-1">{pnrrResult.bestProgram.grantAmount?.toLocaleString()} EUR <span className="text-sm text-slate-400">grant</span></div>
                  <div className="text-xs text-slate-400">Cofinanțare proprie: {pnrrResult.selfFinancing?.toLocaleString()} EUR ({pnrrResult.bestProgram.grantPct}% grant)</div>
                  <div className="text-xs text-slate-500 mt-2">{pnrrResult.bestProgram.note}</div>
                </div>
              )}
              {pnrrResult.results.map(r => (
                <div key={r.programId} className={cn("rounded-lg p-3 border",
                  r.isEligible ? "border-green-800/40 bg-green-900/10" : "border-slate-700 bg-slate-800/40 opacity-60")}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-sm text-white">{r.programName}</div>
                    <ConformBadge ok={r.isEligible} label={r.isEligible ? "Eligibil" : "Neeligibil"} />
                  </div>
                  <div className="text-xs text-slate-400">{r.authority} | {r.legal}</div>
                  {r.isEligible && <div className="text-sm text-green-300 mt-1">Grant estimat: {r.grantAmount?.toLocaleString()} EUR ({r.grantPct}%)</div>}
                  {r.ineligible.map((msg,i) => <div key={i} className="text-xs text-red-400 mt-1">✗ {msg}</div>)}
                </div>
              ))}
              {pnrrResult.note && <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">{pnrrResult.note}</div>}
            </div>
          ) : null}
        </Card>
      )}

      {/* ═══ FOND REPARAȚII ═══ */}
      {activeTab === "fond_rep" && (
        <Card className="p-4">
          <SectionHeader icon="🔧" title="Fond de reparații — simulare 30 ani"
            subtitle="Planificare costuri mentenanță și înlocuire componente. Selectați componentele existente." />
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-2">Selectați componentele clădirii:</div>
            <div className="grid grid-cols-2 gap-1">
              {BUILDING_COMPONENTS.filter(c => ["cazan","pompa_caldura","ventilare_hr","pv_sistem","tamp_ferestre","invelitoare","terasa_hidroiz","boiler_acm","solar_termic","led"].includes(c.id)).map(comp => {
                const selected = maintComponents.find(m=>m.id===comp.id);
                return (
                  <label key={comp.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={!!selected}
                      onChange={e => {
                        if (e.target.checked) setMaintComponents(p => [...p, {id:comp.id, units:1}]);
                        else setMaintComponents(p => p.filter(m=>m.id!==comp.id));
                      }} className="rounded" />
                    {comp.label} ({comp.cat})
                  </label>
                );
              })}
            </div>
          </div>
          {maintComponents.length > 0 && (() => {
            const fund = calcMaintenanceFund({ components: maintComponents, years: 30, inflationRate: 4, discountRate: 5 });
            if (!fund) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">Total VAN 30 ani</div>
                    <div className="text-lg font-bold text-white">{fund.totalPVCost?.toLocaleString()} EUR</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">Medie anuală</div>
                    <div className="text-lg font-bold text-white">{fund.avgAnnualCost?.toLocaleString()} EUR/an</div>
                  </div>
                  <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-indigo-300">Contribuție lunară</div>
                    <div className="text-lg font-bold text-white">{fund.monthlyContribution?.toLocaleString()} EUR/lună</div>
                  </div>
                </div>
                {fund.criticalYears?.length > 0 && (
                  <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">
                    <strong>Ani critici (cheltuieli mari):</strong> {fund.criticalYears.map(y=>y.year).join(", ")}
                  </div>
                )}
                <div className="space-y-1">
                  {fund.componentDetails.map(c => (
                    <div key={c.id} className="flex justify-between text-xs text-slate-300 bg-slate-800 rounded px-3 py-2">
                      <span>{c.label}</span>
                      <span className="text-slate-400">{c.pvCost?.toLocaleString()} EUR VAN</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {maintComponents.length === 0 && <p className="text-slate-500 text-sm">Selectați componentele pentru simulare.</p>}
        </Card>
      )}

      {/* ═══ SOLAR ACM ═══ */}
      {activeTab === "solar_acm" && (
        <Card className="p-4">
          <SectionHeader icon="☀️" title="ACM solar detaliat — SR EN ISO 9806:2017"
            subtitle="Calcul producție, fracție solară lunară, risc stagnare, curbe colector" />
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tip colector</label>
              <select value={collectorType} onChange={e=>setCollectorType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
                {COLLECTOR_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Număr persoane</label>
              <input type="number" value={nPersons} onChange={e=>setNPersons(e.target.value)} min="1" placeholder="auto"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            </div>
          </div>
          {solarACM ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-yellow-300">Fracție solară anuală</div>
                  <div className="text-2xl font-bold text-white">{solarACM.fSolarAnnual}%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Producție anuală</div>
                  <div className="text-xl font-bold text-white">{solarACM.totalSolarYield_kwh} kWh</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Suprafață colectori</div>
                  <div className="text-xl font-bold text-white">{solarACM.collectorArea?.toFixed(1)} m²</div>
                </div>
              </div>
              <ResultRow label="Vas acumulare recomandat" value={solarACM.storageRec + " L"} />
              <ResultRow label="Fluid anti-îngheț" value={solarACM.antifreeze?.name + " (protecție " + solarACM.antifreeze?.protection_t + "°C)"} />
              <ResultRow label="Cost total estimat" value={solarACM.costTotal?.toLocaleString() + " EUR"} />
              {solarACM.warnings?.map((w,i) => <div key={i} className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">⚠️ {w}</div>)}
              {/* Tabel lunar */}
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs text-slate-300">
                  <thead><tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left pb-1">Lună</th>
                    <th className="text-right">Tamb °C</th>
                    <th className="text-right">G kWh/m²</th>
                    <th className="text-right">η %</th>
                    <th className="text-right">Producție kWh</th>
                    <th className="text-right">Fracție %</th>
                  </tr></thead>
                  <tbody>{solarACM.monthly?.map((m,i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-1">{m.month}</td>
                      <td className="text-right">{m.Tamb}</td>
                      <td className="text-right">{m.G_month}</td>
                      <td className="text-right">{m.eta}</td>
                      <td className="text-right">{m.Q_sol_useful}</td>
                      <td className="text-right" style={{color: m.fSolar>=60?"#22c55e":m.fSolar>=40?"#84cc16":m.fSolar>=25?"#eab308":"#ef4444"}}>{m.fSolar}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți date climatice pentru calcul solar.</p>}
        </Card>
      )}

      {/* ═══ GP 123 FOTOVOLTAIC ═══ */}
      {activeTab === "gp123" && (
        <Card className="p-4">
          <SectionHeader icon="⚡" title="Verificare GP 123/2004 — Sisteme fotovoltaice"
            subtitle="Conformitate proiectare PV conform GP 123, ANRE Ord. 11/2023, SR EN IEC 62548, EPBD Art.14" />

          {/* ── Import date PVGIS ── */}
          <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-medium text-amber-300 mb-0.5">Date iradianță PVGIS 5.2</div>
                <div className="text-[11px] text-slate-400">
                  {climate?.lat && climate?.lon
                    ? `Locație: ${climate.lat?.toFixed(4)}°N, ${climate.lon?.toFixed(4)}°E`
                    : "Coordonate geografice indisponibile pentru această localitate"}
                </div>
              </div>
              <button
                onClick={importPVGIS}
                disabled={pvgisLoading || !climate?.lat || !climate?.lon}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  pvgisLoading
                    ? "bg-slate-700 text-slate-400 cursor-wait"
                    : !climate?.lat || !climate?.lon
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                )}>
                {pvgisLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Se încarcă...
                  </>
                ) : (
                  <><span>🛰️</span> Import PVGIS</>
                )}
              </button>
            </div>
            {pvgisError && (
              <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded px-2.5 py-1.5">
                ✗ {pvgisError}
              </div>
            )}
            {pvgisData && (
              <div className="mt-2 space-y-1.5">
                <div className="text-xs text-green-400">
                  ✓ Date importate din {pvgisData.source}
                </div>
                {pvgisData.annual_Gh != null && (
                  <div className="flex items-center justify-between bg-slate-800/60 rounded px-2.5 py-1.5 text-xs">
                    <span className="text-slate-400">Iradianță anuală PVGIS</span>
                    <span className="font-mono font-bold text-amber-300">
                      {pvgisData.annual_Gh.toFixed(0)} kWh/(m²·an)
                    </span>
                  </div>
                )}
                {pvgisData.monthly?.length > 0 && (
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {pvgisData.monthly.map(m => (
                      <div key={m.month} className="text-center bg-slate-800/40 rounded p-1">
                        <div className="text-[9px] text-slate-500">L{m.month}</div>
                        <div className="text-[10px] font-mono text-amber-200/80">{m.Gh?.toFixed(0)||"—"}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-slate-500">kWh/m² · lună (iradianță globală orizontală)</div>
              </div>
            )}
          </div>

          {/* Parametri intrare */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Unghi inclinare panouri [°]</label>
              <input type="number" value={gp123Tilt} onChange={e => setGp123Tilt(Number(e.target.value))}
                min="0" max="90" step="5"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
              <span className="text-[10px] text-slate-500">Optim: 25–45° | Acceptabil: 10–60°</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Deviere față de Sud [°]</label>
              <input type="number" value={gp123AzimuthDev} onChange={e => setGp123AzimuthDev(Number(e.target.value))}
                min="0" max="180" step="5"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
              <span className="text-[10px] text-slate-500">S=0° | SE/SV=45° | E/V=90° | N=180°</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Factor umbrire [%]</label>
              <input type="number" value={gp123Shading} onChange={e => setGp123Shading(Number(e.target.value))}
                min="0" max="100" step="1"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
              <span className="text-[10px] text-slate-500">Max recomandat: 10%</span>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <button onClick={() => setGp123Prosumator(v => !v)}
                className={cn("relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
                  gp123Prosumator ? "bg-amber-500" : "bg-slate-600")}>
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  gp123Prosumator ? "translate-x-5" : "translate-x-0.5")} />
              </button>
              <div>
                <div className="text-xs text-slate-300">Înregistrare prosumator ANRE</div>
                <div className="text-[10px] text-slate-500">Ord. ANRE 11/2023 — obligatoriu &gt;1 kWp</div>
              </div>
            </div>
          </div>

          {gp123Result ? (
            <div className="space-y-4">
              {/* Badges sumar */}
              <div className="grid grid-cols-3 gap-3">
                <div className={cn("rounded-lg p-3 text-center border",
                  gp123Result.conformant
                    ? "bg-green-900/20 border-green-800/40"
                    : "bg-red-900/20 border-red-800/40")}>
                  <div className={cn("text-xs mb-1", gp123Result.conformant ? "text-green-300" : "text-red-300")}>
                    Conformitate GP 123
                  </div>
                  <div className="text-lg font-bold text-white">
                    {gp123Result.conformant ? "✓ Conformă" : `✗ ${gp123Result.nrErrors} erori`}
                  </div>
                  {gp123Result.nrWarnings > 0 && (
                    <div className="text-[10px] text-amber-400 mt-0.5">{gp123Result.nrWarnings} avertizări</div>
                  )}
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Producție anuală estimată</div>
                  <div className="text-xl font-bold text-white">
                    {gp123Result.production?.E_annual?.toLocaleString() ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-500">kWh/an</div>
                </div>
                <div className={cn("rounded-lg p-3 text-center bg-slate-800",
                  gp123Result.gda !== null && gp123Result.gda >= 0.20 ? "border border-green-800/30" : "")}>
                  <div className="text-xs text-slate-400 mb-1">Grad acoperire consum</div>
                  <div className="text-xl font-bold text-white">
                    {gp123Result.gda !== null ? (gp123Result.gda * 100).toFixed(1) + "%" : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500">recomandat ≥20%</div>
                </div>
              </div>

              {/* Lista verificări */}
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Verificări GP 123 / ANRE / EPBD</div>
                <div className="space-y-1">
                  {gp123Result.checks.map(c => (
                    <div key={c.id} className={cn(
                      "flex items-start justify-between px-3 py-2 rounded text-xs gap-2",
                      c.severity === "ok"    ? "bg-green-900/20 text-green-300" :
                      c.severity === "error" ? "bg-red-900/20 text-red-300" :
                      c.severity === "warn"  ? "bg-amber-900/20 text-amber-300" :
                                               "bg-slate-800/60 text-slate-400"
                    )}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0">
                          {c.severity === "ok" ? "✓" : c.severity === "error" ? "✗" : c.severity === "warn" ? "⚠" : "ℹ"}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.label}</div>
                          <div className="text-[10px] opacity-60 truncate">{c.norm}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono">{c.value}</div>
                        <div className="text-[10px] opacity-60">{c.limit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pierderi sistem */}
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Pierderi sistem estimate</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ["Cablu DC", (gp123Result.losses.cableLossDC * 100).toFixed(1) + "%"],
                    ["Cablu AC", (gp123Result.losses.cableLossAC * 100).toFixed(1) + "%"],
                    ["Murdărire / praf", (gp123Result.losses.soilingFactor * 100).toFixed(1) + "%"],
                    ["Mismatch module", (gp123Result.losses.mismatchLoss * 100).toFixed(1) + "%"],
                    ["Temperatură", (gp123Result.losses.tempLoss * 100).toFixed(1) + "%"],
                    ["Umbrire", (gp123Result.losses.shadingFactor * 100).toFixed(1) + "%"],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="flex justify-between bg-slate-800/50 rounded px-2.5 py-1.5 text-xs">
                      <span className="text-slate-400">{lbl}</span>
                      <span className="font-mono text-slate-300">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between bg-slate-700/50 rounded px-2.5 py-2 text-xs mt-1 font-medium">
                  <span className="text-slate-300">Pierderi totale</span>
                  <span className="font-mono text-white">{(gp123Result.losses.totalLoss * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between bg-amber-900/20 border border-amber-800/30 rounded px-2.5 py-2 text-xs mt-1 font-medium">
                  <span className="text-amber-300">Eficiență sistem</span>
                  <span className="font-mono text-white">{(gp123Result.losses.systemEfficiency * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Producție specifică */}
              <div className="bg-slate-800/40 rounded-lg p-3 text-xs">
                <div className="text-slate-400 font-medium mb-2">Indicatori producție</div>
                <div className="grid grid-cols-2 gap-y-1.5">
                  <span className="text-slate-500">Ore de vârf anuale (zonă {zone || "III"})</span>
                  <span className="font-mono text-slate-300 text-right">{gp123Result.production?.h_year} h/an</span>
                  <span className="text-slate-500">Factor corecție inclinare</span>
                  <span className="font-mono text-slate-300 text-right">×{gp123Result.production?.fc_tilt?.toFixed(2)}</span>
                  <span className="text-slate-500">Factor corecție azimut</span>
                  <span className="font-mono text-slate-300 text-right">×{gp123Result.production?.fc_azimuth?.toFixed(2)}</span>
                  <span className="text-slate-500">Producție specifică</span>
                  <span className="font-mono text-amber-300 text-right">{gp123Result.production?.specific_yield} kWh/kWp·an</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Introduceți date fotovoltaice (Pasul 3 → Instalații → FV) pentru verificare GP 123.</p>
          )}
        </Card>
      )}

      {/* ═══ GLASER CONDENS INTERSTIȚIAL ═══ */}
      {activeTab === "glaser" && (
        <Card className="p-4">
          <SectionHeader icon="💧" title="Condens interstițial — Metoda Glaser (SR EN ISO 13788:2012)"
            subtitle="Verificare condens în alcătuirea elementelor de anvelopă, evaluare NP 057-02" />
          {opaqueElements.length > 0 ? (
            <div className="space-y-4">
              {/* Selector element */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Element de anvelopă analizat</label>
                <select
                  value={glaserElementIdx}
                  onChange={e => setGlaserElementIdx(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {opaqueElements.map((el, i) => (
                    <option key={i} value={i}>{el.name || el.type} — {el.type}</option>
                  ))}
                </select>
              </div>

              {glaserResult ? (
                <div className="space-y-4">
                  {/* KPI-uri */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn("rounded-lg p-3 text-center", glaserResult.conformant ? "bg-green-900/30" : "bg-red-900/30")}>
                      <div className="text-xs text-slate-400 mb-1">Status</div>
                      <div className={cn("text-sm font-bold", glaserResult.conformant ? "text-green-300" : "text-red-300")}>
                        {glaserResult.conformant ? "✓ OK" : "✗ NECONFORM"}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">Condensare max.</div>
                      <div className="text-sm font-bold font-mono text-amber-300">
                        {Math.max(0, ...(glaserResult.months?.map(m => m.cumulative) || [0])).toFixed(1)} g/m²
                      </div>
                    </div>
                  </div>

                  {/* Badge verdict */}
                  <div>
                    {glaserResult.maxCumulative <= 0 ? (
                      <Badge className="bg-green-900/50 text-green-300">✓ Fără condens rezidual</Badge>
                    ) : (
                      <Badge className="bg-red-900/50 text-red-300">✗ Acumulare reziduală {glaserResult.maxCumulative?.toFixed(1)} g/m²</Badge>
                    )}
                  </div>

                  {/* Tabel lunar */}
                  {glaserResult.months?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 text-slate-400 font-medium">Lună</th>
                            <th className="text-right py-2 text-slate-400 font-medium">T ext [°C]</th>
                            <th className="text-right py-2 text-slate-400 font-medium">Condensare [g/m²]</th>
                            <th className="text-right py-2 text-slate-400 font-medium">Evaporare [g/m²]</th>
                            <th className="text-right py-2 text-slate-400 font-medium">Cumulat [g/m²]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {glaserResult.months.map((m, i) => (
                            <tr key={i}
                              className={cn("border-b border-white/5",
                                (m.condensation || 0) > 0 ? "bg-red-900/20" : "")}>
                              <td className="py-1.5 text-slate-300">{m.name || `Luna ${i + 1}`}</td>
                              <td className="py-1.5 text-right font-mono text-slate-300">{(m.theta_e ?? "—")}</td>
                              <td className="py-1.5 text-right font-mono text-red-300">{(m.condensation || 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-mono text-green-300">{(m.evaporation || 0).toFixed(2)}</td>
                              <td className={cn("py-1.5 text-right font-mono",
                                (m.cumulative || 0) > 0 ? "text-amber-300" : "text-slate-300")}>
                                {(m.cumulative || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sumar anual */}
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-xs">
                    <div className="text-slate-400 font-medium uppercase mb-2">Bilanț anual</div>
                    <ResultRow label="Acumulare iarnă (total condens)" value={`${(glaserResult.winterAccum ?? 0).toFixed(2)} g/m²`} />
                    <ResultRow label="Evaporare vară (total evaporare)" value={`${(glaserResult.summerEvap ?? 0).toFixed(2)} g/m²`} />
                    <div className={cn("rounded p-2 text-center font-medium mt-2",
                      glaserResult.conformant ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300")}>
                      {glaserResult.conformant
                        ? "✓ Condensul de iarnă se evaporă complet în sezonul cald"
                        : "✗ Condens rezidual acumulat — risc degradare element"}
                    </div>
                  </div>

                  {/* Notă normativă */}
                  <p className="text-xs text-slate-500 italic">
                    Conform NP 057-02: condensul de iarnă se poate accepta dacă se evaporă complet în sezonul cald.
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Elementul selectat nu are stratigrafie definită. Adăugați straturi în editorul de element.</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Adăugați elemente opace cu stratigrafie completă pentru verificarea condensului Glaser.</p>
          )}
        </Card>
      )}

      {/* ═══ COMPARATIV REABILITARE ═══ */}
      {activeTab === "rehab_compare" && (
        <Card className="p-4">
          <SectionHeader icon="📊" title="Comparativ energetic — înainte și după reabilitare"
            subtitle="Pachete de reabilitare Minimal / Mediu / nZEB Integral — reducere EP, CO₂, costuri" />
          {rehabPackages ? (
            <div className="space-y-4">
              {/* Tabel comparativ */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-slate-400 font-medium">Indicator</th>
                      <th className="text-right py-2 px-2 text-orange-300 font-medium">Stare actuală</th>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <th key={i} className="text-right py-2 px-2 font-medium"
                          style={{ color: `hsl(${120 + i * 30}, 60%, 65%)` }}>
                          {pkg.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* EP */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">EP [kWh/(m²·an)]</td>
                      <td className="py-1.5 text-right font-mono text-orange-300 px-2">{(rehabPackages.epActual ?? epActual ?? "—")}</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-green-300">{pkg.epNew ?? "—"}</td>
                      ))}
                    </tr>
                    {/* Clasă */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">Clasă energetică</td>
                      <td className="py-1.5 text-right px-2">
                        <Badge className="bg-orange-900/50 text-orange-300">{rehabPackages.classActual ?? "—"}</Badge>
                      </td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right px-2">
                          <Badge className={cn(
                            pkg.classNew === "A+" || pkg.classNew === "A" ? "bg-green-900/50 text-green-300" :
                            pkg.classNew === "B" ? "bg-teal-900/50 text-teal-300" :
                            pkg.classNew === "C" ? "bg-blue-900/50 text-blue-300" :
                            "bg-slate-700 text-slate-300"
                          )}>{pkg.classNew ?? "—"}</Badge>
                        </td>
                      ))}
                    </tr>
                    {/* CO₂ */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">CO₂ estimat [kg/an]</td>
                      <td className="py-1.5 text-right font-mono text-orange-300 px-2">{rehabPackages.co2Actual ?? "—"}</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-green-300">{pkg.co2New ?? "—"}</td>
                      ))}
                    </tr>
                    {/* Cost anual energie */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">Cost anual energie [RON]</td>
                      <td className="py-1.5 text-right font-mono text-orange-300 px-2">{rehabPackages.costActual ?? "—"}</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-green-300">{pkg.costNew ?? "—"}</td>
                      ))}
                    </tr>
                    {/* Reducere EP% */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">Reducere EP [%]</td>
                      <td className="py-1.5 text-right font-mono text-slate-500 px-2">—</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-emerald-300">
                          {pkg.epReduction != null ? `${pkg.epReduction.toFixed(1)}%` : "—"}
                        </td>
                      ))}
                    </tr>
                    {/* Investiție */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">Investiție [EUR]</td>
                      <td className="py-1.5 text-right font-mono text-slate-500 px-2">—</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-amber-300">{pkg.invest ?? "—"}</td>
                      ))}
                    </tr>
                    {/* NPV 30 ani */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">NPV 30 ani [EUR]</td>
                      <td className="py-1.5 text-right font-mono text-slate-500 px-2">—</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className={cn("py-1.5 text-right font-mono px-2",
                          (pkg.npv30 ?? 0) >= 0 ? "text-green-300" : "text-red-300")}>
                          {pkg.npv30 ?? "—"}
                        </td>
                      ))}
                    </tr>
                    {/* Recuperare ani */}
                    <tr className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">Recuperare [ani]</td>
                      <td className="py-1.5 text-right font-mono text-slate-500 px-2">—</td>
                      {rehabPackages.packages?.map((pkg, i) => (
                        <td key={i} className="py-1.5 text-right font-mono px-2 text-sky-300">{pkg.payback ?? "—"}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note prag nZEB */}
              <div className="bg-slate-800/50 rounded-lg p-3 text-xs space-y-1">
                <div className="text-slate-400 font-medium">Prag nZEB pentru categoria / zona curentă</div>
                <div className="text-slate-300">
                  nZEB maxim: <span className="font-mono text-green-300">{rehabPackages.nzebEpMax} kWh/(m²·an)</span>
                  {rehabPackages.epGap != null && (
                    <span className="ml-3 text-slate-400">Gap față de actual: <span className="font-mono text-orange-300">{rehabPackages.epGap} kWh/(m²·an)</span></span>
                  )}
                </div>
              </div>

              {/* Avertizare dacă niciun pachet nu atinge nZEB */}
              {rehabPackages.packages?.every(pkg => (pkg.epNew ?? Infinity) > (rehabPackages.nzebEpMax ?? 0)) && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-xs text-amber-300">
                  ⚠ Niciun pachet de reabilitare propus nu atinge pragul nZEB pentru această clădire. Considerați măsuri suplimentare (OZR+, sisteme regenerabile integrate).
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Completați datele anvelopei și instalațiilor pentru simulare pachete reabilitare.</p>
          )}
        </Card>
      )}

      {/* ═══ HARTĂ TERMICĂ ═══ */}
      {activeTab === "thermal_map" && (
        <Card className="p-4">
          <SectionHeader icon="🌡️" title="Hartă termică anvelopă"
            subtitle="Vizualizare flux termic per element — albastru (pierderi mici) → roșu (pierderi mari)" />
          {thermalMap?.svg ? (
            <div className="space-y-4">
              <div dangerouslySetInnerHTML={{ __html: thermalMap.svg }} className="rounded-lg overflow-hidden" />
              <div className="text-xs text-slate-400">Flux maxim: {thermalMap.maxFlux} W/m² la ΔT = {Math.abs((building?.theta_int||20)-(climate?.theta_e||-15))}°C</div>
              {tbHeatmap?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Punți termice — clasificate după pierderi</div>
                  <div className="space-y-1">
                    {tbHeatmap.map((tb,i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded" style={{backgroundColor: tb.color}} />
                        <span className="text-slate-300 flex-1">{tb.desc || tb.cat}</span>
                        <span className="text-slate-400">ψ={tb.psi} W/(m·K) × {tb.length}m = <strong className="text-white">{tb.psiL} W/K</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă (Pasul 2) pentru a genera harta termică.</p>}
        </Card>
      )}

      {/* ═══ DEVIZ REABILITARE ═══ */}
      {activeTab === "deviz" && (
        <Card className="p-4">
          <SectionHeader icon="💰" title="Deviz estimativ reabilitare termică"
            subtitle="Prețuri orientative 2024-2025 (manoperă + materiale, fără TVA) — actualizați pentru oferte reale" />
          <div className="grid grid-cols-2 gap-4">
            {/* Coloana stânga — Configurare lucrări */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-400 uppercase mb-2">Configurare lucrări</div>

              {/* Grosime izolație pereți */}
              <div>
                <label className="text-xs text-slate-400">Grosime izolație pereți: <span className="text-white font-mono">{devizWallThick} cm</span></label>
                <input type="range" min={5} max={25} step={5}
                  value={devizWallThick} onChange={e => setDevizWallThick(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-500" />
              </div>

              {/* Tip izolație pereți */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tip izolație pereți</label>
                <select value={devizWallType} onChange={e => setDevizWallType(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-white/10">
                  <option value="eps">EPS</option>
                  <option value="vata">Vată minerală</option>
                  <option value="pur">PUR</option>
                </select>
              </div>

              {/* Grosime izolație acoperiș */}
              <div>
                <label className="text-xs text-slate-400">Grosime izolație acoperiș: <span className="text-white font-mono">{devizRoofThick} cm</span></label>
                <input type="range" min={5} max={30} step={5}
                  value={devizRoofThick} onChange={e => setDevizRoofThick(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-500" />
              </div>

              {/* Toggle înlocuire tâmplărie */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={devizWindows} onChange={e => setDevizWindows(e.target.checked)}
                  className="accent-indigo-500" />
                <span className="text-xs text-slate-300">Înlocuire tâmplărie</span>
              </label>

              {/* Toggle pompă căldură */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={devizHP} onChange={e => setDevizHP(e.target.checked)}
                  className="accent-indigo-500" />
                <span className="text-xs text-slate-300">Adăugare pompă de căldură</span>
              </label>

              {/* Toggle VMC-HR */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={devizVMC} onChange={e => setDevizVMC(e.target.checked)}
                  className="accent-indigo-500" />
                <span className="text-xs text-slate-300">Adăugare VMC-HR</span>
              </label>

              {/* kWp PV */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Capacitate PV [kWp] (0 = fără PV)</label>
                <input type="number" min={0} step={0.5}
                  value={devizPV} onChange={e => setDevizPV(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-white/10" />
              </div>
            </div>

            {/* Coloana dreapta — Rezultate deviz */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-400 uppercase mb-2">Rezultate deviz</div>
              {devizResult ? (
                <div className="space-y-3">
                  {/* Total */}
                  <div className="bg-indigo-900/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {devizResult.totalEUR?.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} EUR
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      ≈ {devizResult.totalRON?.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} LEI
                    </div>
                    <div className="text-xs text-indigo-300 mt-1">
                      {devizResult.costPerM2?.toFixed(0)} EUR/m² util
                    </div>
                  </div>

                  {/* Tabel items */}
                  {devizResult.items?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-1.5 text-slate-400 font-medium">Lucrare</th>
                            <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Cantitate</th>
                            <th className="text-right py-1.5 px-2 text-slate-400 font-medium">P.U. EUR</th>
                            <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Total EUR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devizResult.items.map((item, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1.5 text-slate-300">{item.label}</td>
                              <td className="py-1.5 text-right font-mono text-slate-300 px-2">{item.qty} {item.unit}</td>
                              <td className="py-1.5 text-right font-mono text-slate-400 px-2">{item.priceUnit?.toFixed(0)}</td>
                              <td className="py-1.5 text-right font-mono text-white px-2">{item.totalEUR?.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Finanțare eligibilă */}
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-400 mb-2">Finanțare eligibilă</div>
                    <div className="flex flex-wrap gap-1.5">
                      {devizResult.funding?.pnrr && <Badge className="bg-blue-900/50 text-blue-300">💶 PNRR</Badge>}
                      {devizResult.funding?.casaVerde && <Badge className="bg-green-900/50 text-green-300">🌿 Casa Verde</Badge>}
                      {devizResult.funding?.afm && <Badge className="bg-teal-900/50 text-teal-300">♻️ AFM</Badge>}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    Prețuri orientative. Solicitați oferte de la antreprenori autorizați.
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Configurați lucrările din coloana stângă pentru a genera devizul.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ═══ RĂCIRE ORARĂ ═══ */}
      {activeTab === "racire_orara" && (
        <Card className="p-4">
          <SectionHeader icon="❄️" title="Sarcină frigorifică detaliată — ISO 52016-1"
            subtitle="Distribuție orară și per orientare a câștigurilor solare + interne + transmisie" />
          {coolingHourly ? (
            <div className="space-y-4">
              {/* KPI-uri */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Sarcină de vârf</div>
                  <div className="text-xl font-bold text-cyan-300">{coolingHourly.peakKW?.toFixed(1)} kW</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Peak [W/m²]</div>
                  <div className="text-xl font-bold text-cyan-300">{coolingHourly.peakWm2?.toFixed(0)} W/m²</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Q anual</div>
                  <div className="text-xl font-bold text-cyan-300">{coolingHourly.annualKWh?.toFixed(0)} kWh</div>
                </div>
              </div>

              {/* Peak month și peak hour */}
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Luna de vârf: <span className="text-white font-medium">{coolingHourly.peakMonth}</span></span>
                <span>Ora de vârf: <span className="text-white font-medium">{coolingHourly.peakHour}:00</span></span>
              </div>

              {/* Structura sarcinii — bar chart orizontal */}
              {coolingHourly.breakdown && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-400 mb-3 uppercase">Structura sarcinii</div>
                  <div className="space-y-2">
                    {[
                      { label: "Solar", pct: coolingHourly.breakdown.solarPct, color: "#f59e0b" },
                      { label: "Intern", pct: coolingHourly.breakdown.internalPct, color: "#6366f1" },
                      { label: "Transmisie", pct: coolingHourly.breakdown.transmPct, color: "#ef4444" },
                      { label: "Ventilare", pct: coolingHourly.breakdown.ventPct, color: "#22d3ee" },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-slate-400 shrink-0">{label}</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, pct || 0)}%`, backgroundColor: color }} />
                        </div>
                        <span className="w-10 text-right font-mono text-slate-300">{(pct || 0).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabel lunar */}
              {coolingHourly.monthly?.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Distribuție lunară</div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1.5 text-slate-400 font-medium">Lună</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Q solar [kWh]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Q intern [kWh]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Q transmisie [kWh]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Q total [kWh]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">CDD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coolingHourly.monthly.map((m, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-1.5 text-slate-300">{m.month}</td>
                          <td className="py-1.5 text-right font-mono text-amber-300 px-2">{m.qSolar?.toFixed(0)}</td>
                          <td className="py-1.5 text-right font-mono text-indigo-300 px-2">{m.qInternal?.toFixed(0)}</td>
                          <td className="py-1.5 text-right font-mono text-red-300 px-2">{m.qTransm?.toFixed(0)}</td>
                          <td className="py-1.5 text-right font-mono text-cyan-300 px-2 font-bold">{m.qTotal?.toFixed(0)}</td>
                          <td className="py-1.5 text-right font-mono text-slate-400 px-2">{m.cdd?.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabel per orientare */}
              {coolingHourly.byOrientation?.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Contribuție per orientare</div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1.5 text-slate-400 font-medium">Orientare</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Suprafață [m²]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Contribuție [%]</th>
                        <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Peak [W]</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coolingHourly.byOrientation.map((o, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-1.5 text-slate-300">{o.orientation}</td>
                          <td className="py-1.5 text-right font-mono text-slate-300 px-2">{o.area?.toFixed(1)}</td>
                          <td className="py-1.5 text-right font-mono text-amber-300 px-2">{o.pct?.toFixed(1)}</td>
                          <td className="py-1.5 text-right font-mono text-cyan-300 px-2">{o.peakW?.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recomandări */}
              {coolingHourly.recommendations?.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Recomandări de reducere</div>
                  <div className="space-y-1">
                    {coolingHourly.recommendations.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300">• {r}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Introduceți date geam + climă pentru calcul.</p>
          )}
        </Card>
      )}

      {/* ═══ PASIVHAUS ═══ */}
      {activeTab === "pasivhaus" && (
        <Card className="p-4">
          <SectionHeader icon="🏠" title="Verificare standard Pasivhaus — PHI Darmstadt"
            subtitle="Criterii PHPP 10 pentru certificare Pasivhaus Classic / Plus / Premium" />
          {pasivhausCheck ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 text-center" style={{backgroundColor: pasivhausCheck.color + "22", border: "1px solid " + pasivhausCheck.color + "55"}}>
                  <div className="text-xs mb-1" style={{color: pasivhausCheck.color}}>Scor conformitate</div>
                  <div className="text-3xl font-bold text-white">{pasivhausCheck.score}%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Certificare posibilă</div>
                  <div className="text-lg font-bold text-white">{pasivhausCheck.achievable || "Nu este posibilă"}</div>
                </div>
              </div>
              <div className="space-y-1">
                {pasivhausCheck.checks.map(c => (
                  <div key={c.id} className={cn("flex items-center justify-between px-3 py-2 rounded text-xs",
                    c.pass === true ? "bg-green-900/20 text-green-300" :
                    c.pass === false ? (c.critical ? "bg-red-900/20 text-red-300" : "bg-amber-900/20 text-amber-300") :
                    "bg-slate-800 text-slate-400")}>
                    <span>{c.pass===true?"✓":c.pass===false?"✗":"?"} {c.label}</span>
                    <span className="font-mono">{c.value_str} {c.unit} / necesar {c.target}</span>
                  </div>
                ))}
              </div>
              {pasivhausCheck.gaps?.length > 0 && (
                <div className="bg-red-900/20 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-300 mb-2">CRITERII CRITICE NEÎNDEPLINITE:</div>
                  {pasivhausCheck.gaps.map((g,i) => <div key={i} className="text-xs text-red-400">• {g}</div>)}
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți toate datele anvelopei pentru verificare Pasivhaus.</p>}
        </Card>
      )}

      {/* ═══ ACUSTIC ═══ */}
      {activeTab === "acustic" && (
        <Card className="p-4">
          <SectionHeader icon="🔊" title="Verificare acustică simplificată — SR EN ISO 717-1:2013"
            subtitle="Indice izolare acustică Rw [dB] calculat din masa și structura elementelor" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Nivel zgomot exterior [dB(A)]</label>
            <input type="number" value={externalNoise} onChange={e=>setExternalNoise(parseInt(e.target.value)||55)} min="30" max="90"
              className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            <span className="text-xs text-slate-500 ml-2">55 dB = stradă normală | 70+ dB = artere aglomerate</span>
          </div>
          {acousticCheck ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <ConformBadge ok={acousticCheck.allConform} label={acousticCheck.allConform ? "Conform NP 008-97" : acousticCheck.verdict} />
                {acousticCheck.avgRw && <Badge className="bg-slate-700 text-slate-300">Rw mediu: {acousticCheck.avgRw} dB</Badge>}
              </div>
              <div className="space-y-1">
                {acousticCheck.results.map((r,i) => (
                  <div key={i} className={cn("flex justify-between px-3 py-2 rounded text-xs",
                    r.conform ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300")}>
                    <span>{r.conform?"✓":"✗"} {r.name} ({r.type})</span>
                    <span>Rw={r.Rw} dB / necesar ≥{r.Rw_req} dB{!r.conform ? " (deficit "+r.deficit+" dB)" : ""}</span>
                  </div>
                ))}
              </div>
              {acousticCheck.recommendations?.length > 0 && (
                <div className="bg-amber-900/20 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-300 mb-1">RECOMANDĂRI:</div>
                  {acousticCheck.recommendations.map((r,i) => <div key={i} className="text-xs text-amber-400">• {r}</div>)}
                </div>
              )}
              <div className="text-xs text-slate-500">{acousticCheck.method}</div>
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă pentru verificare acustică.</p>}
        </Card>
      )}

      {/* ═══ CONFORMITATE U RENOVARE ═══ */}
      {activeTab === "conformitate" && (
        <Card className="p-4">
          <SectionHeader icon="✅" title="Conformitate U la renovare majoră"
            subtitle="Verificare automată față de U maxim admis Mc 001-2022 Tabel 2.5 (renovare >25% anvelopă)" />
          {uConformity ? (
            <div className="space-y-3">
              <ConformBadge ok={uConformity.allConform} label={uConformity.verdict} />
              <div className="space-y-1">
                {uConformity.results.map((r,i) => (
                  <div key={i} className={cn("flex justify-between px-3 py-2 rounded text-xs",
                    r.conform ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300")}>
                    <span>{r.conform?"✓":"✗"} {r.name}</span>
                    <span>U={r.U} / U_max={r.Umax} W/(m²·K){!r.conform?" (depășit cu "+r.deficit+")":" "}</span>
                  </div>
                ))}
              </div>
              {!uConformity.allConform && (
                <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">
                  Elementele marcate cu ✗ necesită îmbunătățire termică înainte de obținerea avizului de renovare majoră.
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă pentru verificare conformitate.</p>}
        </Card>
      )}

      {/* ═══ EXPORT XML ═══ */}
      {activeTab === "xml_export" && (
        <Card className="p-4">
          <SectionHeader icon="📥" title="Export date CPE — format XML EPBDcheck"
            subtitle="Format compatibil Directiva 2024/1275/UE — SR EN ISO 52000-1:2017" />
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 space-y-2">
              <p>Generează fișier XML cu toate datele calculului curent:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                <li>Date identificare clădire și date climatice</li>
                <li>Anvelopă detaliată (straturi, U-value, punți termice)</li>
                <li>Sisteme instalații și regenerabile</li>
                <li>Performanță energetică: EP, RER, CO₂, clasă energetică</li>
                <li>Date auditor și dată certificat</li>
              </ul>
            </div>
            <button
              onClick={handleXMLExport}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              📥 Descarcă CPE.xml
            </button>
            {xmlGenerated && (
              <div className="text-xs text-green-400 text-center">✓ Fișier generat și descărcat cu succes!</div>
            )}
            <div className="text-xs text-slate-500 text-center">
              Fișierul XML poate fi importat în sisteme naționale EPBDcheck sau arhivat cu dosarul tehnic al clădirii.
            </div>
          </div>
        </Card>
      )}

      {/* ═══ IMPORT CLIMĂ ERA5/TMY ═══ */}
      {activeTab === "climate_import" && (
        <Card className="p-4">
          <SectionHeader icon="📡" title="Import date climatice ERA5 / TMY"
            subtitle="Actualizare date climatice din surse externe: Open-Meteo ERA5, EnergyPlus EPW, CSV manual" />
          <div className="space-y-4">

            {/* Opțiunea 1: Open-Meteo ERA5 */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-white">1. Open-Meteo ERA5 (descărcare automată)</div>
              <div className="text-xs text-slate-400">
                Descarcă medii lunare ERA5 pentru anul 2023 folosind coordonatele localității selectate.
                API gratuit, fără cheie de autentificare.
              </div>
              <div className="text-xs text-slate-500">
                Coordonate: {climate?.lat != null ? `lat ${climate.lat.toFixed(3)}, lon ${climate.lon?.toFixed(3)}` : "— selectați o localitate"}
              </div>
              <button
                onClick={handleClimOpenMeteo}
                disabled={climImportStatus === "loading" || !climate?.lat}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-all"
              >
                {climImportStatus === "loading"
                  ? <><span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> Se descarcă date ERA5...</>
                  : <><span>🌍</span> Descarcă date ERA5 Open-Meteo</>}
              </button>
              {!climate?.lat && (
                <div className="text-[10px] text-amber-400">Selectați o localitate în Pasul 1 pentru a activa descărcarea.</div>
              )}
            </div>

            {/* Opțiunea 2: CSV */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-white">2. Import CSV</div>
              <div className="text-xs text-slate-400">
                Format așteptat: 12 rânduri, coloane: <code className="bg-slate-700 px-1 rounded">Lună, T_medie, T_min, T_max, GHI (kWh/m²/lună), RH (%), Vânt (m/s)</code>.
                Headerul este opțional. Separator: virgulă, punct și virgulă sau tab.
              </div>
              <input ref={climCSVRef} type="file" accept=".csv,.txt" onChange={handleClimCSV} className="hidden" />
              <button
                onClick={() => climCSVRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
              >
                <span>📂</span> Alege fișier CSV
              </button>
            </div>

            {/* Opțiunea 3: EPW */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-white">3. Import EPW (EnergyPlus Weather)</div>
              <div className="text-xs text-slate-400">
                Fișier .epw standard — format EnergyPlus. Parser minimal: extrage medii lunare T, GHI, RH, vânt din date orare.
                Surse: EnergyPlus.net, Climate.OneBuilding.org, PVGIS.
              </div>
              <input ref={climEPWRef} type="file" accept=".epw" onChange={handleClimEPW} className="hidden" />
              <button
                onClick={() => climEPWRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
              >
                <span>📂</span> Alege fișier EPW
              </button>
            </div>

            {/* Status */}
            {climImportStatus === "ok" && climImportedData && (
              <div className="rounded-xl border border-green-700/30 bg-green-900/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-300 text-sm font-semibold">
                  <span>✓</span> {climImportMsg}
                </div>
                <div className="text-xs text-green-400">
                  Temperaturi lunare (°C): {climImportedData.temp_month?.map(v => v?.toFixed(1)).join(" / ")}
                </div>
                {climImportedData.GHI_month?.length === 12 && (
                  <div className="text-xs text-green-400">
                    GHI lunar (kWh/m²): {climImportedData.GHI_month.map(v => v?.toFixed(0)).join(" / ")}
                  </div>
                )}
                {climImportedData.RH_month?.length === 12 && (
                  <div className="text-xs text-green-400">
                    Umiditate relativă (%): {climImportedData.RH_month.map(v => v?.toFixed(0)).join(" / ")}
                  </div>
                )}
                {climImportedData.wind_month?.length === 12 && (
                  <div className="text-xs text-green-400">
                    Vânt mediu (m/s): {climImportedData.wind_month.map(v => v?.toFixed(1)).join(" / ")}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-green-900/40">
                  Datele importate sunt afișate informativ. Calculele Zephren folosesc datele Mc 001-2022 din baza de date internă.
                  Comparați datele importate cu profilul localității selectate pentru validare.
                </div>
              </div>
            )}
            {climImportStatus === "error" && (
              <div className="rounded-xl border border-red-700/30 bg-red-900/20 p-3 flex items-start gap-2 text-xs text-red-300">
                <span className="mt-0.5">✗</span>
                <div>{climImportMsg}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ═══ PREȚURI MATERIALE ═══ */}
      {activeTab === "preturi" && (() => {
        const CATEGORIES = [
          { id: "all",       label: "Toate" },
          { id: "izolatie",  label: "Izolație" },
          { id: "tamplarie", label: "Tâmplărie" },
          { id: "hvac",      label: "HVAC" },
          { id: "pv",        label: "Fotovoltaic" },
        ];

        const materials = Object.entries(MATERIAL_PRICES_2025)
          .filter(([, m]) => pretCategory === "all" || m.category === pretCategory)
          .map(([id, m]) => ({ id, ...m }));

        return (
          <Card className="p-4">
            <SectionHeader icon="🏷️" title="Prețuri materiale — piața România 2025"
              subtitle="Prețuri orientative pentru deviz estimativ. Actualizați cu oferte de la furnizori." />
            <div className="space-y-4">

              {/* Filtre categorii */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setPretCategory(c.id)}
                    className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                      pretCategory === c.id
                        ? "bg-amber-500 text-black"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Tabel materiale */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left py-2 pr-3">Material</th>
                      <th className="text-right py-2 px-2">Preț RON/{materials[0]?.unit || "m²"}</th>
                      <th className="text-right py-2 px-2">Preț EUR/{materials[0]?.unit || "m²"}</th>
                      <th className="text-left py-2 px-2">Unitate</th>
                      <th className="text-left py-2 px-2">Sursă</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(m => {
                      const priceRON = m.price_m2 != null
                        ? m.price_m2
                        : m.price_eur != null ? +(m.price_eur * EUR_TO_RON).toFixed(0) : null;
                      const priceEUR = m.price_eur != null
                        ? m.price_eur
                        : m.price_m2 != null ? +(m.price_m2 / EUR_TO_RON).toFixed(1) : null;
                      return (
                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-3 text-white font-medium">{m.label}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-300">
                            {priceRON != null ? priceRON + " RON" : "—"}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-300">
                            {priceEUR != null ? priceEUR + " EUR" : "—"}
                          </td>
                          <td className="py-2 px-2 text-slate-400">{m.unit}</td>
                          <td className="py-2 px-2 text-slate-500">{m.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notă + data */}
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-xs text-amber-300 space-y-1">
                <div className="font-semibold">Notă importantă:</div>
                <div>Prețurile sunt orientative și includ materialul. Adăugați 30–50% pentru manoperă și punere în operă.</div>
                <div>Prețurile pentru sisteme HVAC/PV nu includ instalarea (adăugați 15–25% din valoarea echipamentului).</div>
              </div>
              <div className="text-[10px] text-slate-500">
                Surse: {PRICES_SOURCE}
              </div>
              <div className="text-[10px] text-slate-500">
                Data ultimei actualizări: <span className="text-slate-400">{PRICES_UPDATED}</span>
                {" · "}Curs EUR/RON utilizat: <span className="text-slate-400">1 EUR = {EUR_TO_RON} RON</span> (orientativ)
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ═══ MULTI-CLĂDIRE ═══ */}
      {activeTab === "multi_building" && (() => {
        const currentKey = building?.address
          ? `zephren_project_${(building.address || "").replace(/\s+/g, "_").toLowerCase()}`
          : null;

        // Statistici sumar
        const totalAu = savedProjects.reduce((s, p) => s + p.au, 0);
        const epMediu = savedProjects.length > 0
          ? (savedProjects.reduce((s, p) => s + p.ep, 0) / savedProjects.length).toFixed(1)
          : "—";

        const classDist = savedProjects.reduce((acc, p) => {
          const cls = p.cls === "calc" ? (p.ep <= 50 ? "A+" : p.ep <= 90 ? "A" : p.ep <= 130 ? "B" : p.ep <= 180 ? "C" : p.ep <= 240 ? "D" : "E+") : "—";
          acc[cls] = (acc[cls] || 0) + 1;
          return acc;
        }, {});

        return (
          <Card className="p-4">
            <SectionHeader icon="🏘️" title="Comparator proiecte — Multi-clădire"
              subtitle="Toate proiectele salvate în sesiunea curentă (localStorage)" />

            {savedProjects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm space-y-2">
                <div className="text-3xl">🏘️</div>
                <p>Nu există proiecte salvate în localStorage.</p>
                <p className="text-xs text-slate-600">Salvați proiecte din bara superioară pentru a le compara aici.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabel comparativ */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="text-left py-2 pr-3">Proiect</th>
                        <th className="text-center py-2 px-2">Categorie</th>
                        <th className="text-right py-2 px-2">Au [m²]</th>
                        <th className="text-right py-2 px-2">EP [kWh/(m²·an)]</th>
                        <th className="text-center py-2 px-2">Clasă</th>
                        <th className="text-right py-2 px-2">CO₂</th>
                        <th className="text-right py-2 px-2">RER%</th>
                        <th className="text-left py-2 px-2">Auditor</th>
                        <th className="py-2 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedProjects.map(p => {
                        const isActive = p.id === currentKey || p.name === (building?.address || "");
                        const epCls = p.ep <= 50 ? "A+" : p.ep <= 90 ? "A" : p.ep <= 130 ? "B"
                          : p.ep <= 180 ? "C" : p.ep <= 240 ? "D" : p.ep > 0 ? "E+" : "—";
                        const clsColor = epCls === "A+" || epCls === "A" ? "#22c55e"
                          : epCls === "B" ? "#84cc16" : epCls === "C" ? "#eab308"
                          : epCls === "D" ? "#f97316" : epCls !== "—" ? "#ef4444" : "#6b7280";
                        return (
                          <tr key={p.id}
                            className={`border-b transition-colors ${isActive
                              ? "border-amber-500/50 bg-amber-900/20"
                              : "border-white/5 hover:bg-white/5"}`}
                            style={isActive ? { outline: "1px solid rgba(245,158,11,0.4)", outlineOffset: "-1px" } : {}}>
                            <td className="py-2 pr-3">
                              <div className={`font-medium ${isActive ? "text-amber-300" : "text-slate-200"}`}>
                                {isActive && <span className="mr-1 text-amber-400">★</span>}
                                {p.name.length > 28 ? p.name.slice(0, 25) + "..." : p.name}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center text-slate-300">{p.category}</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-300">{p.au > 0 ? p.au : "—"}</td>
                            <td className="py-2 px-2 text-right font-mono text-white">{p.ep > 0 ? p.ep.toFixed(1) : "—"}</td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: clsColor + "33", color: clsColor }}>
                                {epCls}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-300">{p.co2 > 0 ? p.co2.toFixed(1) : "—"}</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-300">{p.rer > 0 ? p.rer.toFixed(0) + "%" : "—"}</td>
                            <td className="py-2 px-2 text-slate-400">{p.auditor}</td>
                            <td className="py-2 px-2">
                              <button
                                disabled
                                title="Deschide proiect — funcționalitate viitoare"
                                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                              >
                                Deschide
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sumar statistici */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">EP mediu</div>
                    <div className="text-xl font-bold text-white">{epMediu}</div>
                    <div className="text-xs text-slate-500">kWh/(m²·an)</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Total Au</div>
                    <div className="text-xl font-bold text-white">{totalAu.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-slate-500">m²</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Proiecte salvate</div>
                    <div className="text-xl font-bold text-white">{savedProjects.length}</div>
                    <div className="text-xs text-slate-500">total</div>
                  </div>
                </div>

                {/* Distribuție clase */}
                {Object.keys(classDist).length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Distribuție clase energetice</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(classDist).map(([cls, count]) => {
                        const color = cls === "A+" || cls === "A" ? "#22c55e"
                          : cls === "B" ? "#84cc16" : cls === "C" ? "#eab308"
                          : cls === "D" ? "#f97316" : cls !== "—" ? "#ef4444" : "#6b7280";
                        return (
                          <div key={cls} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: color + "22", border: `1px solid ${color}55` }}>
                            <span className="font-bold text-sm" style={{ color }}>{cls}</span>
                            <span className="text-xs text-slate-300">× {count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-600 text-center">
                  ★ = proiectul activ curent · Butonul "Deschide" va fi disponibil într-o versiune viitoare
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* ═══ MDLPA REGISTRU ═══ */}
      {activeTab === "mdlpa" && (
        <Card className="p-4">
          <SectionHeader icon="🏛️" title="MDLPA Registru național CPE"
            subtitle="Status conectare, validare XML și checklist pregătire depunere" />
          <div className="space-y-4">

            {/* Card 1 — Status registru */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-semibold text-white">Status registru electronic MDLPA</div>
                <Badge className="bg-amber-900/50 text-amber-300 border border-amber-700/40">API indisponibil public</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Registrul electronic MDLPA este în curs de implementare. Trimiterea directă a CPE va fi disponibilă
                când API-ul devine public (estimat 2025–2026).
              </p>
              <div className="text-xs text-slate-500">
                Până la disponibilizarea API-ului, depunerea CPE se face prin procedura actuală la inspectoratele teritoriale MDLPA.
              </div>
            </div>

            {/* Card 2 — Validare XML */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Validare XML generat</div>
              <p className="text-xs text-slate-400">
                Verifică structura și câmpurile obligatorii din fișierul XML CPE generat de Zephren.
              </p>
              <button
                onClick={handleXMLValidate}
                disabled={xmlValidating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-all"
              >
                {xmlValidating
                  ? <><span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> Se validează...</>
                  : <><span>🔍</span> Validează XML CPE</>}
              </button>
              {xmlValidation && !xmlValidation.error && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-medium text-slate-400 uppercase mb-1">Rezultat validare</div>
                  {xmlValidation.checks.map((c, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${c.ok ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"}`}>
                      <span className="font-bold">{c.ok ? "✓" : "✗"}</span>
                      <span>{c.field}</span>
                    </div>
                  ))}
                  <div className={`text-xs mt-2 pt-2 border-t border-white/10 ${xmlValidation.checks.every(c => c.ok) ? "text-green-400" : "text-amber-400"}`}>
                    {xmlValidation.checks.every(c => c.ok)
                      ? "✓ XML valid — toate câmpurile obligatorii sunt completate."
                      : `⚠ ${xmlValidation.checks.filter(c => !c.ok).length} câmp(uri) lipsă sau incomplete — completați înainte de depunere.`}
                  </div>
                </div>
              )}
              {xmlValidation?.error && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">✗ Eroare generare XML: {xmlValidation.error}</div>
              )}
            </div>

            {/* Card 3 — Checklist depunere */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Checklist pregătire depunere CPE</div>
              <div className="space-y-2">
                {[
                  "CPE semnat digital de auditor atestat",
                  "Număr atestat OAER valid",
                  "Adresa corespunde cu CF/Act proprietate",
                  "Data elaborării completată",
                  "XML exportat și arhivat local",
                  "Copie CPE predată beneficiarului",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="text-green-400 font-bold flex-shrink-0">☑</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4 — Link util + Descărcare XML */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Resurse utile</div>
              <div className="text-xs text-slate-400">
                Registrul național CPE:{" "}
                <span className="text-indigo-300 font-mono">mdlpa.gov.ro/cpecladiri</span>{" "}
                <span className="text-slate-600">(link informativ)</span>
              </div>
              <button
                onClick={handleXMLExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
              >
                <span>📥</span> Descarcă XML CPE
              </button>
              {xmlGenerated && (
                <div className="text-xs text-green-400">✓ Fișier XML generat și descărcat cu succes!</div>
              )}
            </div>

          </div>
        </Card>
      )}

    </div>
  );
}
