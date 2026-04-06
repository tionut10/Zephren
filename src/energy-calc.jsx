import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

// ── Data imports ──
import CLIMATE_DB from "./data/climate.json";
import MATERIALS_DB from "./data/materials.json";
import THERMAL_BRIDGES_DB from "./data/thermal-bridges.json";
import { HEAT_SOURCES, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY, CONTROL_TYPES, FUELS, AMBIENT_ENERGY_FACTOR, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL, ACM_CONSUMPTION, LIGHTING_HOURS, SOLAR_THERMAL_TYPES, PV_TYPES, PV_INVERTER_ETA, TILT_FACTORS, ORIENT_FACTORS, BIOMASS_TYPES } from "./data/constants.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, NZEB_THRESHOLDS, CO2_CLASSES_DB, WATER_TEMP_MONTH } from "./data/energy-classes.js";
import { T } from "./data/translations.js";
import { PRODUCT_CATALOG, STEPS } from "./data/products.js";
import { TYPICAL_BUILDINGS, TYPICAL_BUILDINGS_EXTRA } from "./data/typical-buildings.js";
import { buildRomaniaMapPoints, ROMANIA_BORDER_PATH } from "./data/map-data.js";

// ── Calc imports ──
import { calcUtilFactor, calcMonthlyISO13790, THERMAL_MASS_CLASS } from "./calc/iso13790.js";
import { glaserCheck, pSatMagnus, calcGlaserMonthly } from "./calc/glaser.js";
import { getEnergyClass, getCO2Class } from "./calc/classification.js";
import { calcFinancialAnalysis } from "./calc/financial.js";
import { calcSummerComfort } from "./calc/summer-comfort.js";
import { calcHourlyISO52016 } from "./calc/hourly.js";
import { calcGWPDetailed } from "./calc/gwp.js";
import { calcSmartRehab, getNzebEpMax } from "./calc/smart-rehab.js";
import { calcSRI, SRI_DOMAINS, CHP_TYPES, IEQ_CATEGORIES, RENOVATION_STAGES, MCCL_CATALOG, EV_CHARGER_RULES, calcEVChargers, checkSolarReady } from "./calc/epbd.js";
import { calcAirInfiltration, calcNaturalLighting } from "./calc/infiltration.js";
import { calcGroundHeatTransfer } from "./calc/ground.js";

// ── Component imports ──
import { cn, Select, Input, Badge, Card, ResultRow } from "./components/ui.jsx";
import ThermalBridgeCatalog from "./components/ThermalBridgeCatalog.jsx";
import OpaqueModal from "./components/OpaqueModal.jsx";
import GlazingModal from "./components/GlazingModal.jsx";

// ── Step imports ──
import Step1Identification from "./steps/Step1Identification.jsx";
import Step2Envelope from "./steps/Step2Envelope.jsx";
import Step3Systems from "./steps/Step3Systems.jsx";
import Step4Renewables from "./steps/Step4Renewables.jsx";
import Step5Calculation from "./steps/Step5Calculation";
import Step6Certificate from "./steps/Step6Certificate";
import Step7Audit from "./steps/Step7Audit";

function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }

const CONSTRUCTION_SOLUTIONS = [
  { id:"PE_BCA30_EPS10", name:"Perete BCA 30cm + EPS 10cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Polistiren expandat EPS 100",thickness:"100",lambda:0.036,rho:25,matName:"Polistiren expandat EPS 100"},{material:"BCA (beton celular autoclavizat)",thickness:"300",lambda:0.22,rho:600,matName:"BCA (beton celular autoclavizat)"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_GVP25_EPS15", name:"Perete GVP 25cm + EPS 15cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Polistiren expandat EPS 100",thickness:"150",lambda:0.036,rho:25,matName:"Polistiren expandat EPS 100"},{material:"Cărămidă cu goluri (GVP)",thickness:"250",lambda:0.46,rho:1200,matName:"Cărămidă cu goluri (GVP)"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_POROTHERM44", name:"Porotherm 44 fără izolație", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Bloc ceramic Porotherm 44",thickness:"440",lambda:0.17,rho:750,matName:"Bloc ceramic Porotherm 44"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_BETON_VATA12", name:"Perete beton + vată 12cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Vată minerală bazaltică",thickness:"120",lambda:0.040,rho:100,matName:"Vată minerală bazaltică"},{material:"Beton armat",thickness:"200",lambda:1.74,rho:2400,matName:"Beton armat"},{material:"Gips-carton",thickness:"12",lambda:0.25,rho:900,matName:"Gips-carton"}] },
  { id:"PT_TERASA_XPS10", name:"Terasă + XPS 10cm", type:"PT",
    layers:[{material:"Bitum (membrană)",thickness:"10",lambda:0.17,rho:1050,matName:"Bitum (membrană)"},{material:"Polistiren extrudat XPS",thickness:"100",lambda:0.034,rho:35,matName:"Polistiren extrudat XPS"},{material:"Beton armat",thickness:"150",lambda:1.74,rho:2400,matName:"Beton armat"}] },
  { id:"PP_POD_VATA25", name:"Pod + vată 25cm", type:"PP",
    layers:[{material:"Gips-carton",thickness:"12",lambda:0.25,rho:900,matName:"Gips-carton"},{material:"Vată minerală bazaltică",thickness:"250",lambda:0.040,rho:100,matName:"Vată minerală bazaltică"},{material:"OSB",thickness:"18",lambda:0.13,rho:600,matName:"OSB"}] },
  { id:"PL_SOL_XPS8", name:"Placă sol + XPS 8cm", type:"PL",
    layers:[{material:"Gresie ceramică",thickness:"10",lambda:1.30,rho:2300,matName:"Gresie ceramică"},{material:"Șapă ciment",thickness:"60",lambda:1.40,rho:2000,matName:"Șapă ciment"},{material:"Polistiren extrudat XPS",thickness:"80",lambda:0.034,rho:35,matName:"Polistiren extrudat XPS"},{material:"Beton armat",thickness:"120",lambda:1.74,rho:2400,matName:"Beton armat"}] },
  { id:"PB_SUBSOL_EPS5", name:"Planșeu subsol + EPS 5cm", type:"PB",
    layers:[{material:"Parchet lemn",thickness:"15",lambda:0.18,rho:600,matName:"Parchet lemn"},{material:"Șapă ciment",thickness:"50",lambda:1.40,rho:2000,matName:"Șapă ciment"},{material:"Polistiren expandat EPS 80",thickness:"50",lambda:0.039,rho:20,matName:"Polistiren expandat EPS 80"},{material:"Beton armat",thickness:"150",lambda:1.74,rho:2400,matName:"Beton armat"}] },
];

// Prețuri orientative materiale+manoperă [EUR/m²] pentru estimări reabilitare (actualizat 2025)
const REHAB_COSTS = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  hpPerKw: 900,
  solarThPerM2: 380,
};

const ZONE_COLORS = { I:"#22c55e", II:"#eab308", III:"#f97316", IV:"#ef4444", V:"#7c3aed" };

// Tipuri de elemente vitraje
const GLAZING_DB = [
  { name:"Simplu vitraj", u:5.80, g:0.85 },
  { name:"Dublu vitraj (4-12-4)", u:2.80, g:0.75 },
  { name:"Dublu vitraj termoizolant", u:1.60, g:0.65 },
  { name:"Dublu vitraj Low-E", u:1.10, g:0.50 },
  { name:"Triplu vitraj", u:0.90, g:0.50 },
  { name:"Triplu vitraj Low-E", u:0.70, g:0.45 },
  { name:"Triplu vitraj 2×Low-E", u:0.50, g:0.40 },
];

const FRAME_DB = [
  { name:"PVC (5 camere)", u:1.30 },
  { name:"PVC (6-7 camere)", u:1.10 },
  { name:"Lemn stratificat", u:1.40 },
  { name:"Aluminiu fără RPT", u:5.00 },
  { name:"Aluminiu cu RPT", u:2.00 },
  { name:"Lemn-aluminiu", u:1.20 },
];

const ORIENTATIONS = ["N","NE","E","SE","S","SV","V","NV","Orizontal"];

const BUILDING_CATEGORIES = [
  { id:"RI", label:"Rezidențial individual (casă)" },
  { id:"RC", label:"Rezidențial colectiv (bloc)" },
  { id:"RA", label:"Apartament în bloc" },
  { id:"BI", label:"Birouri" },
  { id:"ED", label:"Educație" },
  { id:"SA", label:"Sănătate" },
  { id:"HC", label:"Hotel / Cazare" },
  { id:"CO", label:"Comercial" },
  { id:"SP", label:"Sport" },
  { id:"AL", label:"Altele" },
];

// Mapare categorie → template DOCX oficial (fișierele din Mc 001-2022)
const CPE_TEMPLATES = {
  RI: { cpe:"5-CPE-cladire-locuit-individuala-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de locuit individuală" },
  RC: { cpe:"6-CPE-cladire-locuit-colectiva-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de locuit colectivă" },
  RA: { cpe:"4-CPE-apartament-bloc-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-apartament.docx", cpe_general:"2-CPE-forma-generala-apartament.docx", label:"Apartament în bloc" },
  BI: { cpe:"7-CPE-cladire-birouri-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de birouri" },
  ED: { cpe:"8-CPE-cladire-invatamant-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire pentru învățământ" },
  SA: { cpe:"9-CPE-cladire-sanitar-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire sistem sanitar" },
  HC: { cpe:"11-CPE-cladire-turism-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire turism/cazare" },
  CO: { cpe:"10-CPE-cladire-comert-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire comerț" },
  SP: { cpe:"12-CPE-cladire-sport-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire sport" },
  AL: { cpe:"3-CPE-forma-generala-cladire.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire (formă generală)" },
};

async function fetchTemplate(filename) {
  const resp = await fetch("/templates/" + filename);
  if (!resp.ok) throw new Error("Template negăsit: " + filename);
  return await resp.arrayBuffer();
}

const STRUCTURE_TYPES = [
  "Zidărie portantă","Cadre beton armat","Panouri prefabricate mari","Structură metalică","Structură lemn","Mixtă"
];

const ELEMENT_TYPES = [
  { id:"PE", label:"Perete exterior", tau:1.0, rsi:0.13, rse:0.04 },
  { id:"PR", label:"Perete la rost închis", tau:0.5, rsi:0.13, rse:0.13 },
  { id:"PS", label:"Perete subsol (sub CTS)", tau:0.5, rsi:0.13, rse:0.13 },
  { id:"PT", label:"Planșeu terasă", tau:1.0, rsi:0.10, rse:0.04 },
  { id:"PP", label:"Planșeu sub pod neîncălzit", tau:0.9, rsi:0.10, rse:0.10 },
  { id:"PB", label:"Planșeu peste subsol neîncălzit", tau:0.5, rsi:0.17, rse:0.17 },
  { id:"PI", label:"Planșeu intermediar", tau:0.0, rsi:0.17, rse:0.17 },
  { id:"PL", label:"Placă pe sol", tau:0.5, rsi:0.17, rse:0.00 },
  { id:"SE", label:"Planșeu separator ext. (bow-window)", tau:1.0, rsi:0.17, rse:0.04 },
];

// Referință U max conform Mc 001-2022
// Tabel 2.4 — Clădiri REZIDENȚIALE nZEB noi
const U_REF_NZEB_RES = { PE:0.25, PR:0.67, PS:0.29, PT:0.15, PP:0.15, PB:0.29, PI:null, PL:0.20, SE:0.20 };
// Tabel 2.7 — Clădiri NEREZIDENȚIALE nZEB noi
const U_REF_NZEB_NRES = { PE:0.33, PR:0.80, PS:0.35, PT:0.17, PP:0.17, PB:0.35, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10a — Renovare majoră clădiri rezidențiale
const U_REF_RENOV_RES = { PE:0.33, PR:0.90, PS:0.35, PT:0.20, PP:0.20, PB:0.40, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10b — Renovare majoră clădiri nerezidențiale
const U_REF_RENOV_NRES = { PE:0.40, PR:1.00, PS:0.40, PT:0.22, PP:0.22, PB:0.45, PI:null, PL:0.25, SE:0.25 };
// Ferestre: nZEB rez 1.11, nZEB nerez 1.20, renovare 1.20, uși ext 1.30
const U_REF_GLAZING = { nzeb_res:1.11, nzeb_nres:1.20, renov:1.20, door:1.30 };

// Helper: get correct U_REF based on building category and context
function getURefNZEB(category, elementType) {
  const isRes = ["RI","RC","RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[elementType] !== undefined ? ref[elementType] : null;
}
// Legacy alias for backward compat
const U_REF_NZEB = U_REF_NZEB_RES;
const U_REF_RENOV = U_REF_RENOV_RES;

// ═══════════════════════════════════════════════════════════════
// EPBD 2024/1275 Art.16 — Rescalare A-G
// Praguri configurabile, actualizabile prin ordin ministerial
// ═══════════════════════════════════════════════════════════════

/**
 * EPBD rescaled A-G thresholds.
 * Set EPBD_AG_ACTIVE = true when ministerial order is published.
 * Update EPBD_AG_THRESHOLDS with official values.
 */
const EPBD_AG_ACTIVE = true; // Activated with EPBD 2024/1275 transposition estimates
const EPBD_AG_THRESHOLDS = {
  // Residential — based on EPBD 2024/1275 Art.16 + Reg. delegat UE 2025/2273
  // Class A = zero-emission building (Art.11, ~50 kWh/m²·an, RER≥80%)
  // Class G = worst 15% of national stock (~350+ kWh/m²·an for Romania)
  // Values calibrated using Romanian EPC database statistics (BPIE 2024)
  RI: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 }, // kWh/(m²·an) EP
  RC: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 },
  RA: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 },
  // Non-residential — adapted from EU Delegated Regulation 2025/2273
  BI: { A: 60, B: 90, C: 120, D: 180, E: 250, F: 350 },
  ED: { A: 55, B: 80, C: 110, D: 160, E: 220, F: 320 },
  SA: { A: 80, B: 120, C: 160, D: 240, E: 330, F: 450 },
  HC: { A: 70, B: 105, C: 140, D: 210, E: 290, F: 400 },
  CO: { A: 65, B: 95, C: 130, D: 195, E: 270, F: 380 },
  SP: { A: 55, B: 85, C: 115, D: 170, E: 240, F: 340 },
  AL: { A: 65, B: 95, C: 130, D: 195, E: 270, F: 380 },
};

// ═══════════════════════════════════════════════════════════════
// ZEB (Zero Emission Building) — EPBD 2024/1275 Art.11
// Praguri estimate bazate pe transpunere (valorile vor fi actualizate)
// ═══════════════════════════════════════════════════════════════
const ZEB_THRESHOLDS = {
  RI: { ep_max: 50, rer_min: 80 },
  RC: { ep_max: 50, rer_min: 80 },
  RA: { ep_max: 50, rer_min: 80 },
  BI: { ep_max: 60, rer_min: 80 },
  ED: { ep_max: 55, rer_min: 80 },
  SA: { ep_max: 80, rer_min: 80 },
  HC: { ep_max: 70, rer_min: 80 },
  CO: { ep_max: 65, rer_min: 80 },
  SP: { ep_max: 55, rer_min: 80 },
  AL: { ep_max: 65, rer_min: 80 },
};
const ZEB_FACTOR = 1.0; // Factor aplicat la ep_max ZEB (1.0 = fără ajustare)

// Factor energie primară electricitate din rețea (SEN România)
// Valoarea corespunde FUELS.electricitate.fP_tot din constants.js
const FP_ELEC = 2.62;

/**
 * Get energy class using EPBD rescaled thresholds (when active)
 * Falls back to current Mc 001-2022 classification when EPBD_AG_ACTIVE = false
 */
function getEnergyClassEPBD(epKwhM2, categoryKey) {
  if (!EPBD_AG_ACTIVE) return getEnergyClass(epKwhM2, categoryKey);
  const cat = categoryKey?.replace(/_cool|_nocool/g, "") || "RI";
  const t = EPBD_AG_THRESHOLDS[cat] || EPBD_AG_THRESHOLDS.RI;
  const classes = [
    { cls: "A", max: t.A },
    { cls: "B", max: t.B },
    { cls: "C", max: t.C },
    { cls: "D", max: t.D },
    { cls: "E", max: t.E },
    { cls: "F", max: t.F },
    { cls: "G", max: Infinity },
  ];
  const colors = { A: "#00a651", B: "#39b54a", C: "#8dc63f", D: "#ffc20e", E: "#f7941d", F: "#f15a24", G: "#ed1c24" };
  for (const c of classes) {
    if (epKwhM2 <= c.max) {
      return { cls: c.cls, color: colors[c.cls], score: Math.max(0, Math.round(100 - epKwhM2 / c.max * 100)) };
    }
  }
  return { cls: "G", color: colors.G, score: 0 };
}

// ═══════════════════════════════════════════════════════════════
// generateTMY — Sintetizează date orare TMY din medii lunare
// Generează 8760 ore de temperatură exterioară și radiație solară
// folosind interpolare sinusoidală din datele climatice lunare
// ═══════════════════════════════════════════════════════════════
function generateTMY(tempMonth, lat) {
  if (!tempMonth || tempMonth.length < 12) return null;
  const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
  const totalHours = 8760;
  const T_ext = new Array(totalHours);
  const Q_sol_horiz = new Array(totalHours);
  const absLat = Math.abs(lat || 45);

  // Solar declination amplitude for latitude
  const solarDecl = 23.45 * Math.PI / 180;

  let h = 0;
  for (let m = 0; m < 12; m++) {
    const days = monthDays[m];
    const tAvg = tempMonth[m];
    // Daily amplitude ~5-8°C depending on climate
    const dailyAmp = 4 + 2 * Math.cos((m - 6) * Math.PI / 6);
    // Monthly solar radiation (W/m²) on horizontal — simplified model
    const dayOfYear = monthDays.slice(0, m).reduce((s, d) => s + d, 0) + days / 2;
    const decl = solarDecl * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
    const latRad = absLat * Math.PI / 180;
    const maxAlt = Math.PI / 2 - latRad + decl;
    const peakIrr = Math.max(0, 1000 * Math.sin(maxAlt) * 0.7); // Clear-sky peak W/m²

    for (let d = 0; d < days; d++) {
      for (let hr = 0; hr < 24; hr++) {
        // Temperature: sinusoidal daily cycle, min at 5am, max at 15pm
        T_ext[h] = tAvg + dailyAmp * Math.cos((hr - 15) * Math.PI / 12);
        // Solar on horizontal: simplified bell curve 6am-18pm
        const hourAngle = (hr - 12) * Math.PI / 12;
        const sinAlt = Math.max(0, Math.sin(maxAlt) * Math.cos(hourAngle));
        Q_sol_horiz[h] = sinAlt > 0.05 ? peakIrr * sinAlt * 0.001 : 0; // kW/m²
        h++;
      }
    }
  }
  return { T_ext, Q_sol_horiz };
}

// Prețuri orientative reabilitare actualizate 2025 [EUR/m²]
const REHAB_COSTS_2025 = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  pvPerKwp: 1100,
  hpAerApa: 900,
  hpSolApa: 1400,
  solarThPerM2: 380,
  bmsSimple: 2000, bmsComplex: 8000,
  evCharger: 1500,
};

// ═══════════════════════════════════════════════════════════════
// BACS — Building Automation & Control (EPBD Art.14)
// Obligatoriu pt clădiri nerezidențiale >290kW utilă
// ═══════════════════════════════════════════════════════════════
const BACS_CLASSES = {
  A: { label:"A — Înalt performant", factor:0.70, desc:"Automatizare avansată cu optimizare, monitoring continuu, gestionare avansată energie" },
  B: { label:"B — Avansat", factor:0.80, desc:"Automatizare pe zone, funcții de programare, monitorizare parțială" },
  C: { label:"C — Standard", factor:0.90, desc:"Termostare de cameră, programare simplă, fără monitorizare centralizată" },
  D: { label:"D — Non-eficient", factor:1.00, desc:"Fără automatizare, reglaj manual, fără programare" },
};
const BACS_OBLIGATION_THRESHOLD_KW = 290; // kW putere utilă instalată

// ── Map helpers (kept here because JSX uses geoToSvg directly) ──
function geoToSvg(lat, lon) {
  return { x: 10 + (lon - 20.2) * (480 / 9.6), y: 370 - (lat - 43.5) * (360 / 5.0) };
}
const ROMANIA_MAP_POINTS = buildRomaniaMapPoints(CLIMATE_DB, geoToSvg);

export default function EnergyCalcApp({ cloud }) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("RO");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  // ═══════════════════════════════════════════════════════════════
  // TIER SYSTEM — Free / Pro / Business
  // ═══════════════════════════════════════════════════════════════
  const TIERS = {
    free:     { id:"free",     label:"Free",     price:0,  maxProjects:2, maxCerts:0,  multiUser:false, watermark:true,  nzebReport:false, docxExport:false, brandingCPE:false },
    pro:      { id:"pro",      label:"Pro",      price:99, maxProjects:999, maxCerts:15, multiUser:false, watermark:false, nzebReport:true,  docxExport:true,  brandingCPE:false },
    business: { id:"business", label:"Business", price:249,maxProjects:999, maxCerts:999,multiUser:true,  watermark:false, nzebReport:true,  docxExport:true,  brandingCPE:true  },
  };

  const [userTier, setUserTier] = useState("free");
  const [projectCount, setProjectCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [certResetDate, setCertResetDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d.toISOString().slice(0,10);
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [showPricingPage, setShowPricingPage] = useState(false);

  const tier = TIERS[userTier] || TIERS.free;

  // Load tier data from storage + sync from cloud profile
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !window.storage) return;
      try {
        const r = await window.storage.get("zephren-tier-data");
        if (r && r.value) {
          const d = JSON.parse(r.value);
          if (d.tier) setUserTier(d.tier);
          if (d.projectCount) setProjectCount(d.projectCount);
          if (d.certCount) setCertCount(d.certCount);
          if (d.certResetDate) setCertResetDate(d.certResetDate);
        }
      } catch(e) { console.warn("Tier data load:", e.message); }
    })();
  }, []);

  // Sync tier from cloud profile when user logs in
  useEffect(() => {
    if (cloud?.isLoggedIn && cloud.user?.plan && cloud.user.plan !== "free") {
      setUserTier(cloud.user.plan);
      saveTierData(cloud.user.plan, projectCount, certCount, certResetDate);
    }
  }, [cloud?.isLoggedIn, cloud?.user?.plan]);

  // Save tier data
  const saveTierData = useCallback(async (t, pc, cc, rd) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      await window.storage.set("zephren-tier-data", JSON.stringify({tier:t||userTier, projectCount:pc??projectCount, certCount:cc??certCount, certResetDate:rd||certResetDate}));
    } catch(e) {}
  }, [userTier, projectCount, certCount, certResetDate]);

  // Reset cert count monthly
  useEffect(() => {
    const now = new Date().toISOString().slice(0,10);
    if (now >= certResetDate) {
      setCertCount(0);
      const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
      const newReset = d.toISOString().slice(0,10);
      setCertResetDate(newReset);
      saveTierData(userTier, projectCount, 0, newReset);
    }
  }, [certResetDate]);

  // Check limits
  const canCreateProject = projectCount < tier.maxProjects;
  const canGenerateCert = userTier !== "free" ? (tier.maxCerts === 999 || certCount < tier.maxCerts) : false;
  const canExportDocx = tier.docxExport;
  const canNzebReport = tier.nzebReport;
  const hasWatermark = tier.watermark;

  const requireUpgrade = (reason) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const activateTier = async (newTier) => {
    if (newTier === "free") {
      setUserTier("free");
      setShowUpgradeModal(false);
      setShowPricingPage(false);
      await saveTierData("free", projectCount, certCount, certResetDate);
      return;
    }
    // For paid plans, try Stripe checkout first
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: newTier,
          userId: cloud?.user?.id,
          email: cloud?.user?.email,
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      }
    } catch (e) { /* Stripe not configured, fall through to demo mode */ }
    // Demo mode fallback: activate locally
    setUserTier(newTier);
    setShowUpgradeModal(false);
    setShowPricingPage(false);
    await saveTierData(newTier, projectCount, certCount, certResetDate);
    showToast(`Plan ${TIERS[newTier]?.label} activat (mod demo)`, "success");
  };

  const incrementCertCount = async () => {
    const nc = certCount + 1;
    setCertCount(nc);
    await saveTierData(userTier, projectCount, nc, certResetDate);
  };

  // ─── STEP 1 STATE ───
  const INITIAL_BUILDING = {
    address:"", city:"", county:"", postal:"",
    category:"RI", structure:"Zidărie portantă",
    yearBuilt:"", yearRenov:"",
    floors:"P", basement:false, attic:false,
    units:"1", stairs:"1",
    areaUseful:"", volume:"", areaEnvelope:"",
    heightBuilding:"", heightFloor:"2.80",
    locality:"",
    perimeter:"", n50:"4.0", shadingFactor:"0.90",
    gwpLifecycle:"", solarReady:false,
    scopCpe:"vanzare", parkingSpaces:"0",
  };
  const [building, setBuilding] = useState({...INITIAL_BUILDING});

  // ─── STEP 2 STATE ───
  const [opaqueElements, setOpaqueElements] = useState([]);
  const [glazingElements, setGlazingElements] = useState([]);
  const [thermalBridges, setThermalBridges] = useState([]);

  // Editing states for opaque element modal
  const [editingOpaque, setEditingOpaque] = useState(null);
  const [showOpaqueModal, setShowOpaqueModal] = useState(false);
  const [showGlazingModal, setShowGlazingModal] = useState(false);
  const [editingGlazing, setEditingGlazing] = useState(null);
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [editingBridge, setEditingBridge] = useState(null);
  const [showBridgeCatalog, setShowBridgeCatalog] = useState(false);

  // ─── STEP 3 STATE ───
  const [instSubTab, setInstSubTab] = useState("heating");

  const INITIAL_HEATING = {
    source:"GAZ_COND", power:"", eta_gen:"0.97",
    emission:"RAD_OT", eta_em:"0.93",
    distribution:"BINE_INT", eta_dist:"0.95",
    control:"TERMO_RAD", eta_ctrl:"0.93",
    regime:"intermitent", theta_int:"20", nightReduction:"4",
    tStaircase:"15", tBasement:"10", tAttic:"5",
  };
  const [heating, setHeating] = useState({...INITIAL_HEATING});

  const INITIAL_ACM = {
    source:"CAZAN_H", consumers:"", dailyLiters:"60",
    storageVolume:"", storageLoss:"2.0",
    pipeLength:"", pipeInsulated:true,
    circRecirculation:false, circHours:"",
  };
  const [acm, setAcm] = useState({...INITIAL_ACM});

  const INITIAL_COOLING = {
    system:"NONE", power:"", eer:"",
    cooledArea:"", distribution:"BINE_INT",
    hasCooling:false,
  };
  const [cooling, setCooling] = useState({...INITIAL_COOLING});

  const INITIAL_VENTILATION = {
    type:"NAT", airflow:"", fanPower:"",
    operatingHours:"", hrEfficiency:"",
  };
  const [ventilation, setVentilation] = useState({...INITIAL_VENTILATION});

  const INITIAL_LIGHTING = {
    type:"LED", pDensity:"4.5", controlType:"MAN",
    fCtrl:"1.00", operatingHours:"", naturalLightRatio:"30",
  };
  const [lighting, setLighting] = useState({...INITIAL_LIGHTING});

  // ─── STEP 4 STATE ───
  const [renewSubTab, setRenewSubTab] = useState("solar_th");

  const INITIAL_SOLAR_TH = {
    enabled:false, type:"PLAN", area:"", orientation:"S", tilt:"35",
    usage:"acm", storageVolume:"", eta0:"0.75", a1:"3.5",
  };
  const [solarThermal, setSolarThermal] = useState({...INITIAL_SOLAR_TH});

  const INITIAL_PV = {
    enabled:false, type:"MONO", area:"", peakPower:"",
    orientation:"S", tilt:"30", inverterType:"STD",
    inverterEta:"0.95", usage:"all",
  };
  const [photovoltaic, setPhotovoltaic] = useState({...INITIAL_PV});

  const INITIAL_HP = {
    enabled:false, type:"PC_AA", cop:"3.50", scopHeating:"3.00",
    scopCooling:"", covers:"heating_acm", bivalentTemp:"-5",
    auxSource:"GAZ_COND", auxEta:"0.97",
  };
  const [heatPump, setHeatPump] = useState({...INITIAL_HP});

  const INITIAL_BIO = {
    enabled:false, type:"PELETI", boilerEta:"0.88", power:"",
    covers:"heating", annualConsumption:"",
  };
  const [biomass, setBiomass] = useState({...INITIAL_BIO});

  const INITIAL_OTHER = {
    windEnabled:false, windCapacity:"", windProduction:"",
    cogenEnabled:false, cogenElectric:"", cogenThermal:"", cogenFuel:"gaz",
  };
  const [otherRenew, setOtherRenew] = useState({...INITIAL_OTHER});

  // ─── STEP 6 STATE ───
  const INITIAL_AUDITOR = {
    name:"", atestat:"", grade:"I", company:"",
    phone:"", email:"", date: new Date().toISOString().slice(0,10),
    mdlpaCode:"", observations:"", photo:"",
    // Câmpuri noi CPE conform Mc001-2022 + Legea 238/2024
    scopCpe:"vanzare", // vanzare | inchiriere | reabilitare | constructie_noua
    validityYears:"10", // 10 ani standard, 5 ani pentru clasele D-G (EPBD 2024/1275)
    registruEvidenta:"", // număr în registrul de evidență al auditorului
    nrCadastral:"", // număr cadastral al clădirii
    codUnicMDLPA:"", // format: Nr_Data_Nume_Prenume_Serie_Nr_Registru_CPE
  };
  const [auditor, setAuditor] = useState({...INITIAL_AUDITOR});

  // ── Toggle Tabel 5.17 / Tabel A.16 (SR EN ISO 52000-1/NA:2023) ──
  const [useNA2023, setUseNA2023] = useState(true); // implicit: NA:2023 (recomandat OAER)
  
  // ── Analiza financiară reabilitare ──
  const [finAnalysisInputs, setFinAnalysisInputs] = useState({
    discountRate:"5", escalation:"3", period:"30",
    annualMaint:"200", residualValue:"0",
  });



  // ─── NEW FEATURE STATES ───
  const [showDashboard, setShowDashboard] = useState(false);
  const [showClimateMap, setShowClimateMap] = useState(false);
  const [showGlaserDiagram, setShowGlaserDiagram] = useState(false);
  const [showSankey, setShowSankey] = useState(false);
  const [showMultiScenario, setShowMultiScenario] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [buildingPhotos, setBuildingPhotos] = useState([]); // [{url, label, zone}]
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [productCatalogTab, setProductCatalogTab] = useState("windows");
  const [multiScenarios, setMultiScenarios] = useState([
    { id:"S1", name:"Minim", addInsulWall:true, insulWallThickness:"10", replaceWindows:false, addPV:false, addHP:false },
    { id:"S2", name:"Mediu", addInsulWall:true, insulWallThickness:"15", replaceWindows:true, newWindowU:"1.00", addPV:true, pvArea:"20", addHP:false },
    { id:"S3", name:"Maxim (nZEB)", addInsulWall:true, insulWallThickness:"20", replaceWindows:true, newWindowU:"0.80", addPV:true, pvArea:"40", addHP:true, hpCOP:"4.0", addInsulRoof:true, insulRoofThickness:"25", addHR:true, hrEfficiency:"85" },
  ]);
  const [bacsClass, setBacsClass] = useState("D");

  // ─── Persistent Storage (auto-save/load) ───
  const [storageStatus, setStorageStatus] = useState("");
  const [printMode, setPrintMode] = useState(false);
  const [exporting, setExporting] = useState(null); // null | "docx" | "pdf" | "excel" | "xml"
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [docxPreviewBlob, setDocxPreviewBlob] = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [docxPreviewUrl, setDocxPreviewUrl] = useState(null);
  const docxPreviewRef = useRef(null);
  const [nzebReportHtml, setNzebReportHtml] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAPIDoc, setShowAPIDoc] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("default");

  // Team management
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [teamData, setTeamData] = useState(null); // { id, name, members: [], invitations: [] }
  const [teamLoading, setTeamLoading] = useState(false);
  const [cloudProjects, setCloudProjects] = useState([]);

  // ─── Toast notification system (replaces alert/confirm blocked in sandbox) ───
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type="info", duration=4000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    if (duration > 0) toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: UNDO/REDO SYSTEM
  // ═══════════════════════════════════════════════════════════
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const maxUndoLevels = 20;

  const pushUndo = useCallback(() => {
    const snapshot = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,useNA2023,finAnalysisInputs});
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      return next.length > maxUndoLevels ? next.slice(-maxUndoLevels) : next;
    });
    setRedoStack([]);
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,useNA2023,finAnalysisInputs]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor});
    setRedoStack(prev => [...prev, current]);
    let prev;
    try { prev = JSON.parse(undoStack[undoStack.length - 1]); } catch { showToast("Eroare undo — date corupte", "error", 2000); return; }
    setUndoStack(s => s.slice(0, -1));
    if (prev.building) setBuilding(p => ({...INITIAL_BUILDING, ...prev.building}));
    if (prev.opaqueElements) setOpaqueElements(prev.opaqueElements);
    if (prev.glazingElements) setGlazingElements(prev.glazingElements);
    if (prev.thermalBridges) setThermalBridges(prev.thermalBridges);
    if (prev.heating) setHeating(p => ({...INITIAL_HEATING, ...prev.heating}));
    if (prev.acm) setAcm(p => ({...INITIAL_ACM, ...prev.acm}));
    if (prev.cooling) setCooling(p => ({...INITIAL_COOLING, ...prev.cooling}));
    if (prev.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...prev.ventilation}));
    if (prev.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...prev.lighting}));
    if (prev.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...prev.solarThermal}));
    if (prev.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...prev.photovoltaic}));
    if (prev.heatPump) setHeatPump(p => ({...INITIAL_HP, ...prev.heatPump}));
    if (prev.biomass) setBiomass(p => ({...INITIAL_BIO, ...prev.biomass}));
    if (prev.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...prev.otherRenew}));
    if (prev.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...prev.auditor}));
    showToast("Undo aplicat", "info", 1500);
  }, [undoStack, building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, showToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor});
    setUndoStack(prev => [...prev, current]);
    let next;
    try { next = JSON.parse(redoStack[redoStack.length - 1]); } catch { showToast("Eroare redo — date corupte", "error", 2000); return; }
    setRedoStack(s => s.slice(0, -1));
    if (next.building) setBuilding(p => ({...INITIAL_BUILDING, ...next.building}));
    if (next.opaqueElements) setOpaqueElements(next.opaqueElements);
    if (next.glazingElements) setGlazingElements(next.glazingElements);
    if (next.thermalBridges) setThermalBridges(next.thermalBridges);
    if (next.heating) setHeating(p => ({...INITIAL_HEATING, ...next.heating}));
    if (next.acm) setAcm(p => ({...INITIAL_ACM, ...next.acm}));
    if (next.cooling) setCooling(p => ({...INITIAL_COOLING, ...next.cooling}));
    if (next.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...next.ventilation}));
    if (next.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...next.lighting}));
    if (next.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...next.solarThermal}));
    if (next.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...next.photovoltaic}));
    if (next.heatPump) setHeatPump(p => ({...INITIAL_HP, ...next.heatPump}));
    if (next.biomass) setBiomass(p => ({...INITIAL_BIO, ...next.biomass}));
    if (next.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...next.otherRenew}));
    if (next.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...next.auditor}));
    showToast("Redo aplicat", "info", 1500);
  }, [redoStack, building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, showToast]);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: AUTO DARK/LIGHT THEME DETECTION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => { if (!localStorage.getItem("ep-theme-manual")) setTheme(e.matches ? "light" : "dark"); };
    if (!localStorage.getItem("ep-theme-manual")) setTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleThemeManual = useCallback(() => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("ep-theme-manual", "1"); } catch(e) {}
      return next;
    });
  }, []);

  
  const saveToStorage = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      var data = JSON.stringify({building:building,opaqueElements:opaqueElements,glazingElements:glazingElements,thermalBridges:thermalBridges,heating:heating,acm:acm,cooling:cooling,ventilation:ventilation,lighting:lighting,solarThermal:solarThermal,photovoltaic:photovoltaic,heatPump:heatPump,biomass:biomass,otherRenew:otherRenew,auditor:auditor,step:step});
      await window.storage.set("energopro-project", data);
      // Istoric versiuni — păstrăm ultimele 10
      try {
        var histRaw = await window.storage.get("energopro-history");
        var hist = histRaw && histRaw.value ? JSON.parse(histRaw.value) : [];
        hist.unshift({ ts: new Date().toISOString(), data: data });
        if (hist.length > 10) hist = hist.slice(0, 10);
        await window.storage.set("energopro-history", JSON.stringify(hist));
      } catch(eh) { /* history save failed */ }
      setStorageStatus("Salvat " + new Date().toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"}));
    } catch(e) { /* storage unavailable */ }
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,step]);

  // Restaurare versiune anterioară din istoric
  const restoreVersion = useCallback(async (index) => {
    try {
      var histRaw = await window.storage.get("energopro-history");
      if (!histRaw || !histRaw.value) { showToast("Niciun istoric disponibil", "error"); return; }
      var hist = JSON.parse(histRaw.value);
      if (index >= hist.length) { showToast("Versiune inexistentă", "error"); return; }
      var d = JSON.parse(hist[index].data);
      if (d.building) setBuilding(function(p) { return Object.assign({}, p, d.building); });
      if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
      if (d.glazingElements) setGlazingElements(d.glazingElements);
      if (d.thermalBridges) setThermalBridges(d.thermalBridges);
      if (d.heating) setHeating(function(p) { return Object.assign({}, p, d.heating); });
      if (d.acm) setAcm(function(p) { return Object.assign({}, p, d.acm); });
      if (d.cooling) setCooling(function(p) { return Object.assign({}, p, d.cooling); });
      if (d.ventilation) setVentilation(function(p) { return Object.assign({}, p, d.ventilation); });
      if (d.lighting) setLighting(function(p) { return Object.assign({}, p, d.lighting); });
      if (d.auditor) setAuditor(function(p) { return Object.assign({}, p, d.auditor); });
      showToast("Restaurat versiunea din " + new Date(hist[index].ts).toLocaleString("ro-RO"), "success");
    } catch(e) { showToast("Eroare restaurare: " + e.message, "error"); }
  }, [showToast]);

  const loadFromStorage = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      var result = await window.storage.get("energopro-project");
      if (result && result.value) {
        var d = JSON.parse(result.value);
        if (d.building) setBuilding(function(p) { return Object.assign({}, p, d.building); });
        if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
        if (d.glazingElements) setGlazingElements(d.glazingElements);
        if (d.thermalBridges) setThermalBridges(d.thermalBridges);
        if (d.heating) setHeating(function(p) { return Object.assign({}, p, d.heating); });
        if (d.acm) setAcm(function(p) { return Object.assign({}, p, d.acm); });
        if (d.cooling) setCooling(function(p) { return Object.assign({}, p, d.cooling); });
        if (d.ventilation) setVentilation(function(p) { return Object.assign({}, p, d.ventilation); });
        if (d.lighting) setLighting(function(p) { return Object.assign({}, p, d.lighting); });
        if (d.solarThermal) setSolarThermal(function(p) { return Object.assign({}, INITIAL_SOLAR_TH, p, d.solarThermal); });
        if (d.photovoltaic) setPhotovoltaic(function(p) { return Object.assign({}, INITIAL_PV, p, d.photovoltaic); });
        if (d.heatPump) setHeatPump(function(p) { return Object.assign({}, INITIAL_HP, p, d.heatPump); });
        if (d.biomass) setBiomass(function(p) { return Object.assign({}, INITIAL_BIO, p, d.biomass); });
        if (d.otherRenew) setOtherRenew(function(p) { return Object.assign({}, INITIAL_OTHER, p, d.otherRenew); });
        if (d.auditor) setAuditor(function(p) { return Object.assign({}, INITIAL_AUDITOR, p, d.auditor); });
        if (d.step) setStep(d.step);
        setStorageStatus("Restaurat");
      }
    } catch(e) { /* no saved data or error */ }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // MULTI-PROJECT SYSTEM
  // ═══════════════════════════════════════════════════════════
  const getProjectData = useCallback(() => ({
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, step
  }), [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,step]);

  const loadProjectData = useCallback((d) => {
    if (d.building) setBuilding(p => ({...INITIAL_BUILDING, ...d.building}));
    if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
    if (d.glazingElements) setGlazingElements(d.glazingElements);
    if (d.thermalBridges) setThermalBridges(d.thermalBridges);
    if (d.heating) setHeating(p => ({...INITIAL_HEATING, ...d.heating}));
    if (d.acm) setAcm(p => ({...INITIAL_ACM, ...d.acm}));
    if (d.cooling) setCooling(p => ({...INITIAL_COOLING, ...d.cooling}));
    if (d.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...d.ventilation}));
    if (d.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...d.lighting}));
    if (d.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...d.solarThermal}));
    if (d.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...d.photovoltaic}));
    if (d.heatPump) setHeatPump(p => ({...INITIAL_HP, ...d.heatPump}));
    if (d.biomass) setBiomass(p => ({...INITIAL_BIO, ...d.biomass}));
    if (d.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...d.otherRenew}));
    if (d.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...d.auditor}));
    if (d.step) setStep(d.step);
  }, []);

  const refreshProjectList = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      const res = await window.storage.list("ep-proj:");
      if (res && res.keys) {
        const items = [];
        for (const key of res.keys.slice(0, 20)) {
          try {
            const r = await window.storage.get(key);
            if (r && r.value) {
              const d = JSON.parse(r.value);
              items.push({ key, id: key.replace("ep-proj:", ""), name: d.meta?.name || d.building?.address || "Proiect", date: d.meta?.date || "", category: d.building?.category || "" });
            }
          } catch(e) {}
        }
        setProjectList(items);
      }
    } catch(e) {}
  }, []);

  const saveProjectAs = useCallback(async (name) => {
    if (typeof window === "undefined" || !window.storage) return;
    const id = "p" + Date.now().toString(36);
    const data = getProjectData();
    const payload = { ...data, meta: { name: name || building.address || "Proiect", date: new Date().toISOString().slice(0,10), id } };
    try {
      await window.storage.set("ep-proj:" + id, JSON.stringify(payload));
      setActiveProjectId(id);
      await refreshProjectList();
      showToast("Proiect salvat: " + (name || building.address), "success");
    } catch(e) { showToast("Eroare salvare: " + e.message, "error"); }
  }, [getProjectData, building.address, refreshProjectList, showToast]);

  const saveCurrentProject = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    const data = getProjectData();
    const payload = { ...data, meta: { name: building.address || "Proiect", date: new Date().toISOString().slice(0,10), id: activeProjectId } };
    try {
      await window.storage.set("ep-proj:" + activeProjectId, JSON.stringify(payload));
      showToast("Salvat.", "success", 1500);
    } catch(e) {}
  }, [getProjectData, building.address, activeProjectId, showToast]);

  const loadProject = useCallback(async (id) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      // Save current first
      await saveCurrentProject();
      const r = await window.storage.get("ep-proj:" + id);
      if (r && r.value) {
        const d = JSON.parse(r.value);
        loadProjectData(d);
        setActiveProjectId(id);
        setShowProjectManager(false);
        showToast("Proiect încărcat: " + (d.meta?.name || d.building?.address || id), "success");
      }
    } catch(e) { showToast("Eroare: " + e.message, "error"); }
  }, [saveCurrentProject, loadProjectData, showToast]);

  const deleteProject = useCallback(async (id) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      await window.storage.delete("ep-proj:" + id);
      await refreshProjectList();
      showToast("Proiect șters.", "info");
    } catch(e) {}
  }, [refreshProjectList, showToast]);

  // Cloud sync functions
  const saveToCloud = useCallback(async () => {
    if (!cloud?.isLoggedIn) { showToast("Autentifică-te pentru a salva în cloud.", "info"); return; }
    const data = getProjectData();
    const payload = { ...data, meta: { name: building.address || "Proiect", date: new Date().toISOString().slice(0,10) } };
    const result = await cloud.saveProject(payload);
    if (result.error) showToast("Eroare cloud: " + result.error, "error");
    else showToast("Salvat în cloud!", "success");
  }, [cloud, getProjectData, building.address, showToast]);

  const loadFromCloud = useCallback(async (projectId) => {
    if (!cloud?.isLoggedIn) return;
    const result = await cloud.loadProject(projectId);
    if (result.error) { showToast("Eroare: " + result.error, "error"); return; }
    if (result.data) { loadProjectData(result.data); showToast("Proiect încărcat din cloud.", "success"); }
  }, [cloud, loadProjectData, showToast]);

  // Team management functions
  const loadTeamData = useCallback(async () => {
    if (!cloud?.isLoggedIn) return;
    setTeamLoading(true);
    try {
      const sb = (await import("./lib/supabase.js")).supabase;
      // Check if user is in any team
      const { data: memberships } = await sb.from("team_members").select("team_id, role").eq("user_id", cloud.user.id);
      if (memberships && memberships.length > 0) {
        const teamId = memberships[0].team_id;
        const { data: team } = await sb.from("teams").select("id, name, plan").eq("id", teamId).single();
        const { data: members } = await sb.from("team_members").select("user_id, role, joined_at").eq("team_id", teamId);
        const { data: invitations } = await sb.from("team_invitations").select("id, email, role, status, created_at").eq("team_id", teamId).eq("status", "pending");
        // Get profile names for members
        const memberProfiles = [];
        for (const m of (members || [])) {
          const { data: p } = await sb.from("profiles").select("name, email").eq("id", m.user_id).single();
          memberProfiles.push({ ...m, name: p?.name || p?.email || m.user_id, email: p?.email || "" });
        }
        setTeamData({ id: teamId, name: team?.name || "Echipa", plan: team?.plan || "business", myRole: memberships[0].role, members: memberProfiles, invitations: invitations || [] });
      } else {
        setTeamData(null);
      }
    } catch (e) { console.error("Team load error:", e); }
    setTeamLoading(false);
  }, [cloud]);

  const createTeam = useCallback(async (teamName) => {
    if (!cloud?.isLoggedIn) { showToast("Autentifică-te pentru a crea o echipă.", "info"); return; }
    try {
      const sb = (await import("./lib/supabase.js")).supabase;
      const { data: team, error } = await sb.from("teams").insert({ name: teamName, owner_id: cloud.user.id, plan: "business" }).select("id").single();
      if (error) { showToast("Eroare: " + error.message, "error"); return; }
      await sb.from("team_members").insert({ team_id: team.id, user_id: cloud.user.id, role: "owner", invited_by: cloud.user.id });
      showToast("Echipă creată: " + teamName, "success");
      await loadTeamData();
    } catch (e) { showToast("Eroare creare echipă: " + e.message, "error"); }
  }, [cloud, loadTeamData, showToast]);

  const inviteTeamMember = useCallback(async (email, role) => {
    if (!cloud?.isLoggedIn || !teamData) return;
    try {
      const sb = (await import("./lib/supabase.js")).supabase;
      const { error } = await sb.from("team_invitations").insert({ team_id: teamData.id, email, role: role || "member", invited_by: cloud.user.id });
      if (error) { showToast("Eroare: " + error.message, "error"); return; }
      showToast("Invitație trimisă la " + email, "success");
      await loadTeamData();
    } catch (e) { showToast("Eroare invitație: " + e.message, "error"); }
  }, [cloud, teamData, loadTeamData, showToast]);

  const removeTeamMember = useCallback(async (userId) => {
    if (!cloud?.isLoggedIn || !teamData) return;
    try {
      const sb = (await import("./lib/supabase.js")).supabase;
      await sb.from("team_members").delete().eq("team_id", teamData.id).eq("user_id", userId);
      showToast("Membru eliminat.", "info");
      await loadTeamData();
    } catch (e) { showToast("Eroare: " + e.message, "error"); }
  }, [cloud, teamData, loadTeamData, showToast]);

  const loadCloudProjects = useCallback(async () => {
    if (!cloud?.isLoggedIn) return;
    const projects = await cloud.listProjects();
    setCloudProjects(projects);
  }, [cloud]);

  // Load project list on mount
  useEffect(() => { refreshProjectList(); }, []);

  useEffect(function() { loadFromStorage(); }, []);

  // Auto-generate PDF preview when entering Step 6
  const autoPreviewTriggered = useRef(false);
  useEffect(() => {
    if (step === 6 && !autoPreviewTriggered.current && !pdfPreviewUrl) {
      autoPreviewTriggered.current = true;
      setTimeout(() => {
        const btn = document.querySelector('[data-auto-preview]');
        if (btn) btn.click();
      }, 500);
    }
    if (step !== 6) autoPreviewTriggered.current = false;
  }, [step, pdfPreviewUrl]);

  // Render DOCX preview when blob changes
  useEffect(() => {
    if (docxPreviewBlob && docxPreviewRef.current) {
      const container = docxPreviewRef.current;
      container.innerHTML = "";
      renderAsync(docxPreviewBlob, container, null, {
        className: "docx-preview-content",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        ignoreFonts: false,
        breakPages: false,
        ignoreLastRenderedPageBreak: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
      }).then(() => {
        try {
          // ── STEP 1: Fix floating shapes (before scale) ──
          var floats = container.querySelectorAll('[style*="position: absolute"], [style*="position:absolute"]');
          floats.forEach(function(el) {
            el.style.position = 'relative';
            el.style.left = '0';
            el.style.top = '0';
            el.style.display = 'inline-block';
            el.style.verticalAlign = 'middle';
          });

          // ── STEP 2: Style SVG text visible ──
          var allSvgs = container.querySelectorAll('svg');
          var scaleRowSvgs = [];
          var indicatorSvgs = [];
          allSvgs.forEach(function(svg) {
            var txt = svg.textContent.trim();
            var svgW = parseInt(svg.getAttribute('width') || '0');
            if (!txt && svgW < 10) return;
            var textEls = svg.querySelectorAll('text, tspan');
            textEls.forEach(function(t) {
              t.style.fontWeight = 'bold';
              var fill = t.getAttribute('fill') || '';
              if (!fill || fill === '#FFFFFF' || fill === 'white') t.setAttribute('fill', '#333333');
            });
            if (/^[A-G]\+?$/.test(txt) && svgW > 25) indicatorSvgs.push({svg: svg, text: txt});
            if (/[\u2264\u2026]|^\d/.test(txt)) scaleRowSvgs.push({svg: svg, text: txt});
          });

          // ── STEP 3: Style indicators with color ──
          var containerRect2 = container.getBoundingClientRect();
          var midX = containerRect2.x + containerRect2.width / 2;
          indicatorSvgs.forEach(function(item) {
            var svg = item.svg;
            var isEP = svg.getBoundingClientRect().x < midX;
            svg.style.backgroundColor = isEP ? '#00B050' : '#0070C0';
            svg.style.borderRadius = '4px';
            svg.style.padding = '3px 8px';
            svg.style.display = 'inline-block';
            var textEls = svg.querySelectorAll('text, tspan');
            textEls.forEach(function(t) {
              t.setAttribute('fill', '#FFFFFF');
              t.style.fontWeight = '900';
              t.style.fontSize = '16px';
            });
          });

          // ── STEP 4: Scale to fit ──
          var wrapper = container.querySelector('.docx-preview-content-wrapper') || container.firstElementChild;
          if (wrapper && wrapper.offsetWidth > 0) {
            var parentW = container.parentElement.clientWidth;
            var contentW = wrapper.scrollWidth;
            var contentH = wrapper.scrollHeight;
            var targetH = window.innerHeight * 0.78;
            var scaleW = parentW / contentW;
            var scaleH = targetH / contentH;
            var scale = Math.min(scaleW, scaleH, 1);
            container.style.transform = 'scale(' + scale + ')';
            container.style.transformOrigin = 'top left';
            container.style.width = (100 / scale) + '%';
            var finalH = contentH * scale;
            container.style.height = finalH + 'px';
            container.parentElement.style.height = (finalH + 8) + 'px';
            container.parentElement.style.overflow = 'hidden';
          }

          // ── STEP 5: Align indicators AFTER scaling (positions are now final) ──
          // Use a short delay to let the browser recalculate layout after transform
          setTimeout(function() {
            try {
              var cRect = container.getBoundingClientRect();
              var mx = cRect.x + cRect.width / 2;
              var epRows = scaleRowSvgs.filter(function(s){ return s.svg.getBoundingClientRect().x < mx; })
                .sort(function(a,b){ return a.svg.getBoundingClientRect().y - b.svg.getBoundingClientRect().y; });
              var co2Rows = scaleRowSvgs.filter(function(s){ return s.svg.getBoundingClientRect().x >= mx; })
                .sort(function(a,b){ return a.svg.getBoundingClientRect().y - b.svg.getBoundingClientRect().y; });
              var classMap = {'A+':0,'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7};

              indicatorSvgs.forEach(function(item) {
                var svg = item.svg;
                var isEP = svg.getBoundingClientRect().x < mx;
                var targetIdx = classMap[item.text] || 0;
                var rows = isEP ? epRows : co2Rows;
                if (rows[targetIdx]) {
                  var tR = rows[targetIdx].svg.getBoundingClientRect();
                  var cR = svg.getBoundingClientRect();
                  // Account for transform scale: offset in CSS pixels = offset in screen pixels / scale
                  var currentScale = container.getBoundingClientRect().width / container.offsetWidth || 1;
                  var offsetY = ((tR.y + tR.height/2) - (cR.y + cR.height/2)) / currentScale;
                  svg.style.position = 'relative';
                  svg.style.top = offsetY + 'px';
                }
              });
            } catch(e2) {}
          }, 50);
        } catch(e) { /* ignore CSS fix errors */ }
      }).catch(err => console.error("docx-preview error:", err));
    }
  }, [docxPreviewBlob]);
  
  useEffect(function() {
    var timer = setTimeout(function() { saveToStorage(); }, 2000);
    return function() { clearTimeout(timer); };
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor]);

  // ─── RESET ALL (Proiect Nou) ───
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [energyPrices, setEnergyPrices] = useState({gaz:0.32, electricitate:1.30, motorina:1.20, carbune:0.25, biomasa:0.22, termoficare:0.45});
  const resetProject = useCallback(() => {
    setStep(1);
    setBuilding({...INITIAL_BUILDING});
    setOpaqueElements([]);
    setGlazingElements([]);
    setThermalBridges([]);
    setEditingOpaque(null); setShowOpaqueModal(false);
    setEditingGlazing(null); setShowGlazingModal(false);
    setEditingBridge(null); setShowBridgeModal(false); setShowBridgeCatalog(false);
    setInstSubTab("heating");
    setHeating({...INITIAL_HEATING});
    setAcm({...INITIAL_ACM});
    setCooling({...INITIAL_COOLING});
    setVentilation({...INITIAL_VENTILATION});
    setLighting({...INITIAL_LIGHTING});
    setRenewSubTab("solar_th");
    setSolarThermal({...INITIAL_SOLAR_TH});
    setPhotovoltaic({...INITIAL_PV});
    setHeatPump({...INITIAL_HP});
    setBiomass({...INITIAL_BIO});
    setOtherRenew({...INITIAL_OTHER});
    setAuditor({...INITIAL_AUDITOR});
    setShowResetConfirm(false);
  }, []);

  const loadTypicalBuilding = useCallback((tplId) => {
    const tpl = [...TYPICAL_BUILDINGS, ...TYPICAL_BUILDINGS_EXTRA].find(t => t.id === tplId);
    if (!tpl) return;
    pushUndo();
    // Pas 1-2: Clădire + anvelopă
    setBuilding(prev => ({...prev, ...tpl.building}));
    setOpaqueElements(tpl.opaque || []);
    setGlazingElements(tpl.glazing || []);
    setThermalBridges((tpl.bridges || []).map(b => ({...b, type: "Predefinit"})));

    // Pas 3-4: Instalații + regenerabile — defaults realiste per categorie
    const cat = tpl.building?.category || tpl.cat || "RI";
    const yr = parseInt(tpl.building?.yearBuilt) || 1980;
    const isNew = yr >= 2020;
    const isRenov = yr < 2020 && parseInt(tpl.building?.yearRenov) > 2015;

    // Încălzire — defaults per epocă și categorie
    const heatDefaults = {
      // Clădiri vechi: gaz standard/condensare, radiatoare
      old: { source: "GAZ_STD", power: "", eta_gen: "0.85", emission: "RAD_OT", eta_em: "0.93",
        distribution: "SLAB_INT", eta_dist: "0.85", control: "FARA", eta_ctrl: "0.82",
        regime: "intermitent", theta_int: "20", nightReduction: "4", tStaircase: "15", tBasement: "10", tAttic: "5" },
      // Renovate: gaz condensare, robinete termostatice
      renov: { source: "GAZ_COND", power: "", eta_gen: "0.97", emission: "RAD_OT", eta_em: "0.93",
        distribution: "MED_INT", eta_dist: "0.90", control: "TERMO_RAD", eta_ctrl: "0.93",
        regime: "intermitent", theta_int: "20", nightReduction: "3", tStaircase: "15", tBasement: "10", tAttic: "5" },
      // Noi: PC sau gaz condensare cu pardoseală
      new_ri: { source: "PC_AA", power: "", eta_gen: "3.50", emission: "PARD", eta_em: "0.97",
        distribution: "BINE_INT", eta_dist: "0.95", control: "INTELIG", eta_ctrl: "0.97",
        regime: "continuu", theta_int: "20", nightReduction: "2", tStaircase: "", tBasement: "8", tAttic: "5" },
      new_bi: { source: "PC_AA", power: "", eta_gen: "3.50", emission: "VENT_CONV", eta_em: "0.93",
        distribution: "BINE_INT", eta_dist: "0.95", control: "INTELIG", eta_ctrl: "0.97",
        regime: "intermitent", theta_int: "21", nightReduction: "4", tStaircase: "", tBasement: "10", tAttic: "" },
    };
    const hKey = isNew ? (["BI","CO","SP"].includes(cat) ? "new_bi" : "new_ri") : isRenov ? "renov" : "old";
    setHeating(heatDefaults[hKey]);

    // ACM
    setAcm({
      source: isNew ? "PC_ACM" : "CAZAN_H",
      consumers: tpl.building?.units || "1", dailyLiters: (ACM_CONSUMPTION[cat] || 50).toString(),
      storageVolume: "", storageLoss: "2.0", pipeLength: "", pipeInsulated: isNew || isRenov,
      circRecirculation: ["RC","HC","SA"].includes(cat), circHours: ["RC","HC","SA"].includes(cat) ? "12" : "",
    });

    // Răcire
    const hasCool = isNew || ["BI","CO","HC","SA","SP"].includes(cat);
    setCooling({
      system: hasCool ? (isNew ? "PC_REV" : "SPLIT") : "NONE",
      power: "", eer: hasCool ? (isNew ? "4.00" : "3.50") : "",
      cooledArea: "", distribution: hasCool ? "BINE_INT" : "", hasCooling: hasCool,
    });

    // Ventilare
    setVentilation({
      type: isNew ? "MEC_HR80" : isRenov ? "MEC_EXT" : "NAT",
      airflow: "", fanPower: "", operatingHours: "",
      hrEfficiency: isNew ? "80" : "",
    });

    // Iluminat
    setLighting({
      type: isNew ? "LED" : yr >= 2000 ? "CFL" : "TUB_T8",
      pDensity: isNew ? "4.5" : yr >= 2000 ? "8.0" : "10.0",
      controlType: isNew ? "PREZ_DAY" : isRenov ? "TIMER" : "MAN",
      fCtrl: isNew ? "0.60" : isRenov ? "0.90" : "1.00",
      operatingHours: (LIGHTING_HOURS[cat] || 2000).toString(),
      naturalLightRatio: "25",
    });

    // Regenerabile — doar pentru clădiri noi
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: isNew,
      ...(isNew ? { type: "MONO", area: "", peakPower: "", orientation: "S", tilt: "15", inverterType: "STD", inverterEta: "0.96", usage: "autoconsum" } : {}),
    });
    setHeatPump({ ...INITIAL_HP, enabled: isNew && hKey.startsWith("new"),
      ...(isNew ? { type: "PC_AA", cop: "3.50", scopHeating: "3.00", covers: "heating_acm" } : {}),
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });

    // Auditor gol
    setAuditor(prev => ({ ...prev, name: "", atestat: "", grade: "", company: "", phone: "", email: "",
      date: new Date().toISOString().slice(0, 10), observations: "" }));

    setStep(1);
  }, [pushUndo]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 1 — Apartament 2 camere bloc P+4, anii '80, București — VÂNZARE
  // Cel mai frecvent CPE din România. Clasă D-E.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Drumul Taberei nr. 35, Bl. C14, Sc. 2, Et. 3, Ap. 42",
      city: "București", county: "București", postalCode: "061352",
      category: "RC", structure: "Panouri prefabricate mari",
      yearBuilt: "1982", yearRenov: "",
      floors: "P+4", basement: true, attic: false,
      units: "1", stairs: "1",
      areaUseful: "52", volume: "140", areaEnvelope: "98",
      heightBuilding: "15.0", heightFloor: "2.70",
      locality: "București",
      perimeter: "30.0", n50: "4.0", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "vanzare", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Perete ext. prefabricat GBN 30cm — neizolat", type: "PE", orientation: "S", area: "18", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Perete ext. Nord — prefabricat neizolat", type: "PE", orientation: "N", area: "14", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu intermediar beton (ap. etaj 3)", type: "PI", orientation: "Orizontal", area: "52", layers: [
        { matName: "Parchet lemn", material: "Parchet lemn", thickness: "15", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment", material: "Șapă ciment", thickness: "40", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu (înlocuite de proprietar)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.40", g: "0.60", area: "8.5", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC dublu (Nord)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.40", g: "0.60", area: "3.2", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "PE — Planșee intermediare (consolă balcon beton)", type: "Joncțiuni pereți", psi: "0.65", length: "3.5" },
      { name: "PE — Planșeu curent ×2 niveluri adiacente", type: "Joncțiuni pereți", psi: "0.10", length: "60" },
      { name: "Glaf ferestre PVC", type: "Ferestre", psi: "0.06", length: "22" },
      { name: "Colțuri exterioare ×2", type: "Joncțiuni pereți", psi: "0.08", length: "5.4" },
      { name: "Prag ușă balcon", type: "Ferestre", psi: "0.10", length: "1.8" },
    ]);
    setHeating({
      source: "GAZ_COND", power: "24", eta_gen: "0.97",
      nominalPower: "24",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.92",
      control: "TERMO_RAD", eta_ctrl: "0.93",
      regime: "intermitent", theta_int: "20", nightReduction: "3",
      tStaircase: "12", tBasement: "8", tAttic: "",
    });
    setAcm({
      source: "CAZAN_H", consumers: "3", dailyLiters: "50",
      storageVolume: "0", storageLoss: "0",
      pipeLength: "6", pipeInsulated: false,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "LED", pDensity: "5.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1600", naturalLightRatio: "20",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Popescu Marian-Cristian",
      atestat: "CT-00845",
      grade: "II",
      company: "TermoProiect SRL",
      phone: "0722 345 678",
      email: "popescu@termoproiect.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Apartament 2 camere, et. 3, bloc P+4 din 1982, structură panouri mari prefabricate tip S, sector 6 București. Pereți exteriori BCA 30cm fără termoizolație exterioară (blocul nu a beneficiat de programul de reabilitare termică). Proprietarul a înlocuit tâmplăria originală cu PVC dublu vitraj. Centrala murală pe gaz cu condensare Viessmann Vitodens 050-W 24kW (2021), montată în bucătărie, cu preparare instantanee ACM. Radiatoare oțel tip panou cu robineți termostatici pe fiecare corp. Ventilare naturală. Punți termice semnificative la consolele de balcon din beton armat nearmat termic. Fațadele nu au izolație — se recomandă reabilitare termică prin asociația de proprietari. Clasa energetică estimată D-E.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 1 încărcat — Apartament 2 camere bloc P+4 '82 București, cazan gaz condensare, fără izolație. Clasă D-E.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 2 — Apartament 3 camere bloc P+10, anii '70, reabilitat termic, Cluj-Napoca — VÂNZARE
  // Bloc OD mare reabilitat. Clasă C.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo2 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Mehedinți nr. 12, Bl. R4, Sc. 3, Et. 7, Ap. 85",
      city: "Cluj-Napoca", county: "Cluj", postalCode: "400394",
      category: "RC", structure: "Panouri prefabricate mari",
      yearBuilt: "1974", yearRenov: "2023",
      floors: "P+10", basement: true, attic: false,
      units: "1", stairs: "1",
      areaUseful: "68", volume: "184", areaEnvelope: "115",
      heightBuilding: "33.0", heightFloor: "2.70",
      locality: "Cluj-Napoca",
      perimeter: "34.0", n50: "2.5", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "vanzare", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Pereți ext. BCA 30cm + EPS 10cm ETICS (reab. 2023)", type: "PE", orientation: "S", area: "22", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. Nord — BCA 30cm + EPS 10cm ETICS", type: "PE", orientation: "N", area: "16", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu intermediar beton (ap. curent etaj 7)", type: "PI", orientation: "Orizontal", area: "68", layers: [
        { matName: "Parchet laminat", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment", material: "Șapă ciment", thickness: "40", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu Low-E (înlocuite la reabilitare 2023)", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.30", g: "0.55", area: "10.5", orientation: "Mixt", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "PE — Planșee adiacente ×2 niveluri", type: "Joncțiuni pereți", psi: "0.08", length: "68" },
      { name: "PE — Consolă balcon beton (rezolvat parțial la reab.)", type: "Joncțiuni pereți", psi: "0.35", length: "4.0" },
      { name: "Glaf ferestre PVC Low-E", type: "Ferestre", psi: "0.04", length: "25" },
      { name: "Colțuri exterioare ×2", type: "Joncțiuni pereți", psi: "0.06", length: "5.4" },
    ]);
    setHeating({
      source: "GAZ_COND", power: "100", eta_gen: "0.97",
      nominalPower: "100",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.90",
      control: "TERMO_RAD", eta_ctrl: "0.93",
      regime: "intermitent", theta_int: "20", nightReduction: "3",
      tStaircase: "12", tBasement: "8", tAttic: "",
    });
    setAcm({
      source: "CAZAN_H", consumers: "4", dailyLiters: "50",
      storageVolume: "0", storageLoss: "0",
      pipeLength: "35", pipeInsulated: true,
      circRecirculation: true, circHours: "14",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "LED", pDensity: "4.5", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1600", naturalLightRatio: "25",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Moldovan Radu-Alexandru",
      atestat: "CT-01523",
      grade: "II",
      company: "CertEnergy Transilvania SRL",
      phone: "0744 567 890",
      email: "moldovan@certenergy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Apartament 3 camere, et. 7, bloc P+10 din 1974, structură panouri mari prefabricate, Mănăștur, Cluj-Napoca. Blocul a beneficiat de reabilitare termică prin programul național 2023: ETICS cu EPS 10cm pe fațade, XPS 10cm pe terasă, înlocuire tâmplărie cu PVC dublu Low-E. Centrala termică de scară cu cazan gaz condensare Buderus 100kW. Radiatoare din fontă cu robineți termostatici. Punți termice parțial rezolvate la consolele de balcon. Ventilare naturală prin fante reglabile în tâmplăria nouă. Fără surse regenerabile. Clasa energetică estimată C.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 2 încărcat — Ap. 3 camere bloc P+10 '74 reabilitat Cluj-Napoca, centrală de scară gaz condensare. Clasă C.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 3 — Casă individuală P+1 nouă, Constanța 2025 — nZEB RECEPȚIE
  // PC aer-apă, PV 6kWp, HR 90%, BCA 30cm + EPS 15cm. Clasă A.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo3 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Lahovari nr. 18",
      city: "Constanța", county: "Constanța", postalCode: "900650",
      category: "RI", structure: "Cadre beton armat",
      yearBuilt: "2025", yearRenov: "",
      floors: "P+1", basement: false, attic: false,
      units: "1", stairs: "1",
      areaUseful: "165", volume: "462", areaEnvelope: "440",
      heightBuilding: "7.00", heightFloor: "2.80",
      locality: "Constanța",
      perimeter: "44.0", n50: "0.8", shadingFactor: "0.90",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "receptie", parkingSpaces: "2",
    });
    setOpaqueElements([
      { name: "Pereți ext. BCA 30cm + EPS 15cm ETICS (Sud+Est+Vest)", type: "PE", orientation: "S", area: "85", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 15cm", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.036, rho: 25 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. Nord — BCA 30cm + EPS 15cm ETICS", type: "PE", orientation: "N", area: "45", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 15cm", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.036, rho: 25 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă necirculabilă — EPS 20cm", type: "PT", orientation: "Orizontal", area: "85", layers: [
        { matName: "Membrană bitum", material: "Bitum (membrană)", thickness: "10", lambda: 0.17, rho: 1050 },
        { matName: "EPS 20cm", material: "Polistiren expandat EPS 100", thickness: "200", lambda: 0.036, rho: 25 },
        { matName: "Barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
        { matName: "Beton armat", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Placă pe sol — XPS 15cm sub radier", type: "PL", orientation: "Orizontal", area: "85", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă cu încălzire pardoseală", material: "Șapă ciment", thickness: "75", lambda: 1.40, rho: 2000 },
        { matName: "XPS 15cm", material: "Polistiren extrudat XPS", thickness: "150", lambda: 0.032, rho: 35 },
        { matName: "Radier beton armat", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC tripan Low-E argon (Sud)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "18", orientation: "S", frameRatio: "22" },
      { name: "Ferestre PVC tripan Low-E (Nord+Est+Vest)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "12", orientation: "N", frameRatio: "22" },
      { name: "Ușă terasă glisantă tripan (Sud)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "1.00", g: "0.40", area: "4.5", orientation: "S", frameRatio: "30" },
    ]);
    setThermalBridges([
      { name: "PE — Placă pe sol (izolat perimetral XPS)", type: "Joncțiuni pereți", psi: "0.08", length: "44" },
      { name: "PE — Terasă (atic izolat continuu)", type: "Acoperiș", psi: "0.06", length: "44" },
      { name: "PE — Planșeu intermediar", type: "Joncțiuni pereți", psi: "0.04", length: "44" },
      { name: "Glaf fereastră — montaj RAL în izolație", type: "Ferestre", psi: "0.02", length: "55" },
      { name: "Colț exterior ×4", type: "Joncțiuni pereți", psi: "0.05", length: "28" },
      { name: "Prag ușă terasă", type: "Ferestre", psi: "0.05", length: "2.5" },
    ]);
    setHeating({
      source: "PC_AA", power: "10", eta_gen: "4.20",
      nominalPower: "10",
      emission: "PARD", eta_em: "0.97",
      distribution: "BINE_INT", eta_dist: "0.96",
      control: "INTELIG", eta_ctrl: "0.98",
      regime: "continuu", theta_int: "20", nightReduction: "2",
      tStaircase: "", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "PC_ACM", consumers: "4", dailyLiters: "50",
      storageVolume: "200", storageLoss: "1.0",
      pipeLength: "8", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "PC_REV", power: "10", eer: "5.20",
      cooledArea: "140", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR90", airflow: "220", fanPower: "70",
      operatingHours: "4000", hrEfficiency: "90",
    });
    setLighting({
      type: "LED", pDensity: "3.5", controlType: "PREZ_DAY",
      fCtrl: "0.55", operatingHours: "1600", naturalLightRatio: "35",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "32", orientation: "S", tilt: "20",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "6", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "4.20",
      scopHeating: "3.50", covers: "heating_acm",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Marinescu Andrei-Gabriel",
      atestat: "CT-01256",
      grade: "I",
      company: "EnerGreen Consulting SRL",
      phone: "0745 678 901",
      email: "marinescu@energreen.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Casă individuală nouă P+1 proiectată nZEB conform Legii 238/2024 și Mc 001-2022. Structură cadre beton armat cu pereți BCA 30cm + EPS 15cm ETICS, terasă EPS 20cm, placă pe sol XPS 15cm. Pompă de căldură aer-apă Daikin Altherma 3 H HT 10kW (SCOP 3.50) cu pardoseală radiantă pe ambele niveluri. Ventilare mecanică centralizată cu recuperare η=90% (Atrea Duplex 250). PV 6kWp (32m² panouri mono pe terasă, orientare sud, 20°). Test etanșeitate n50=0.8 h⁻¹. Clădirea îndeplinește integral cerințele nZEB. Clasă energetică A.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 3 încărcat — Casă nouă P+1 nZEB Constanța cu PC aer-apă 10kW + PV 6kWp + HR 90%. Clasă A.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 4 — Casă veche P, anii '60, zidărie 50cm, sat rural, Vaslui — VÂNZARE
  // Sobă teracotă + lemne, ferestre lemn, fără izolație. Clasă F-G.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo4 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Sat Vutcani nr. 142, com. Vutcani",
      city: "Vutcani", county: "Vaslui", postalCode: "737570",
      category: "RI", structure: "Zidărie portantă",
      yearBuilt: "1962", yearRenov: "",
      floors: "P", basement: false, attic: true,
      units: "1", stairs: "1",
      areaUseful: "65", volume: "176", areaEnvelope: "210",
      heightBuilding: "4.50", heightFloor: "2.70",
      locality: "Vaslui",
      perimeter: "34.0", n50: "8.0", shadingFactor: "0.95",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "vanzare", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Pereți ext. cărămidă plină 50cm — neizolat", type: "PE", orientation: "Mixt", area: "85", layers: [
        { matName: "Tencuială ext. var", material: "Tencuială var-ciment", thickness: "25", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 50cm", material: "Cărămidă plină", thickness: "500", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int. var", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pod neizolat — dușumea lemn pe grinzi", type: "PP", orientation: "Orizontal", area: "70", layers: [
        { matName: "Tencuială tavan", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "Dușumea lemn", material: "Lemn moale (brad/molid)", thickness: "25", lambda: 0.14, rho: 500 },
      ]},
      { name: "Placă pe sol — beton neizolat", type: "PL", orientation: "Orizontal", area: "70", layers: [
        { matName: "Dușumea lemn pe grinzi", material: "Lemn moale (brad/molid)", thickness: "30", lambda: 0.14, rho: 500 },
        { matName: "Beton simplu", material: "Beton simplu", thickness: "100", lambda: 1.28, rho: 2200 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre lemn dublu (originale '60)", glazingType: "Dublu vitraj", frameType: "Lemn", u: "2.80", g: "0.75", area: "7.5", orientation: "Mixt", frameRatio: "35" },
    ]);
    setThermalBridges([
      { name: "PE — Pod neizolat (cornișă)", type: "Acoperiș", psi: "0.25", length: "34" },
      { name: "PE — Placă pe sol (neizolat)", type: "Joncțiuni pereți", psi: "0.20", length: "34" },
      { name: "Glaf ferestre lemn (montaj tradițional)", type: "Ferestre", psi: "0.15", length: "18" },
      { name: "Colțuri exterioare ×4", type: "Joncțiuni pereți", psi: "0.10", length: "18" },
    ]);
    setHeating({
      source: "SOBA_LEMN", power: "8", eta_gen: "0.55",
      nominalPower: "8",
      emission: "SOBA", eta_em: "0.80",
      distribution: "LOCAL", eta_dist: "1.00",
      control: "MAN", eta_ctrl: "0.80",
      regime: "intermitent", theta_int: "18", nightReduction: "5",
      tStaircase: "", tBasement: "", tAttic: "0",
    });
    setAcm({
      source: "BOILER_E", consumers: "2", dailyLiters: "40",
      storageVolume: "80", storageLoss: "3.0",
      pipeLength: "3", pipeInsulated: false,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "7.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1400", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Apetrei Dumitru-Ionuț",
      atestat: "CT-02034",
      grade: "III",
      company: "CertEast Moldova SRL",
      phone: "0755 234 567",
      email: "apetrei@certeast.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Casă parter din 1962, sat Vutcani, jud. Vaslui. Zidărie portantă cărămidă plină 50cm fără izolație termică. Pod neizolat cu dușumea lemn pe grinzi lemn, acoperiș cu învelitoare tablă. Ferestre originale lemn dublu cu etanșeitate degradată. Încălzire cu sobă de teracotă pe lemne (η~55%), o singură sursă pentru 2 din 3 camere. ACM cu boiler electric 80L. Ventilare naturală necontrolată, infiltrații semnificative (n50≈8 h⁻¹). Fără surse regenerabile. Se recomandă urgent: izolație pod 20cm vată, izolație fațade EPS 10cm, înlocuire tâmplărie cu PVC dublu, centrală pe peleți/gaz GPL. Clasa energetică estimată F-G — cel mai defavorabil scenariu real.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 4 încărcat — Casă veche P '62 sat rural Vaslui, sobă lemne, fără izolație. Clasă F-G.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 5 — Vilă P+1+M, post-2000, reabilitare cu PC, Brașov — REABILITARE
  // GVP 25cm + vată 15cm, PC aer-apă 12kW, PV 5kWp, solar termic 4m². Clasă B.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo5 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Zizinului nr. 45",
      city: "Brașov", county: "Brașov", postalCode: "500414",
      category: "RI", structure: "Cadre beton armat",
      yearBuilt: "2003", yearRenov: "2025",
      floors: "P+1+M", basement: true, attic: true,
      units: "1", stairs: "1",
      areaUseful: "210", volume: "630", areaEnvelope: "580",
      heightBuilding: "9.50", heightFloor: "2.80",
      locality: "Brașov",
      perimeter: "46.0", n50: "1.5", shadingFactor: "0.88",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "reabilitare", parkingSpaces: "2",
    });
    setOpaqueElements([
      { name: "Pereți ext. GVP 25cm + vată bazaltică 15cm ETICS (reab. 2025)", type: "PE", orientation: "S", area: "80", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "Vată minerală bazaltică 15cm", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.035, rho: 80 },
        { matName: "Cărămidă cu goluri (GVP)", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. Nord — GVP 25cm + vată 15cm", type: "PE", orientation: "N", area: "55", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "Vată minerală bazaltică 15cm", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.035, rho: 80 },
        { matName: "GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Acoperiș mansardă — vată 25cm între căpriori (reab.)", type: "PP", orientation: "Orizontal", area: "95", layers: [
        { matName: "Gips-carton", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
        { matName: "Barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
        { matName: "Vată minerală bazaltică 25cm", material: "Vată minerală bazaltică", thickness: "250", lambda: 0.035, rho: 80 },
        { matName: "OSB", material: "OSB", thickness: "18", lambda: 0.13, rho: 600 },
      ]},
      { name: "Planșeu peste subsol — XPS 10cm (reab.)", type: "PB", orientation: "Orizontal", area: "75", layers: [
        { matName: "Parchet lemn masiv", material: "Parchet lemn", thickness: "15", lambda: 0.18, rho: 600 },
        { matName: "Șapă cu încălzire pardoseală", material: "Șapă ciment", thickness: "65", lambda: 1.40, rho: 2000 },
        { matName: "XPS 10cm", material: "Polistiren extrudat XPS", thickness: "100", lambda: 0.034, rho: 35 },
        { matName: "Beton armat existent", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC tripan Low-E argon (Sud+Est+Vest)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "24", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC tripan Low-E (Nord)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "8", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "PE — Soclu/fundație — izolat perimetral XPS", type: "Joncțiuni pereți", psi: "0.10", length: "46" },
      { name: "PE — Cornișă mansardă (izolat continuu)", type: "Acoperiș", psi: "0.08", length: "46" },
      { name: "PE — Planșeu intermediar", type: "Joncțiuni pereți", psi: "0.05", length: "46" },
      { name: "Glaf ferestre — montaj în planul izolației", type: "Ferestre", psi: "0.03", length: "60" },
      { name: "Colțuri exterioare ×8", type: "Joncțiuni pereți", psi: "0.05", length: "76" },
    ]);
    setHeating({
      source: "PC_AA", power: "12", eta_gen: "3.80",
      nominalPower: "12",
      emission: "PARD", eta_em: "0.97",
      distribution: "BINE_INT", eta_dist: "0.96",
      control: "INTELIG", eta_ctrl: "0.97",
      regime: "continuu", theta_int: "20", nightReduction: "2",
      tStaircase: "", tBasement: "8", tAttic: "5",
    });
    setAcm({
      source: "PC_ACM", consumers: "5", dailyLiters: "50",
      storageVolume: "250", storageLoss: "1.5",
      pipeLength: "10", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "PC_REV", power: "12", eer: "4.20",
      cooledArea: "170", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR80", airflow: "250", fanPower: "80",
      operatingHours: "4500", hrEfficiency: "82",
    });
    setLighting({
      type: "LED", pDensity: "3.5", controlType: "PREZ_DAY",
      fCtrl: "0.60", operatingHours: "1600", naturalLightRatio: "30",
    });
    setSolarThermal({
      ...INITIAL_SOLAR_TH, enabled: true,
      type: "PLAN", area: "4", orientation: "S", tilt: "45",
      eta0: "0.75", a1: "3.5",
    });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "26", orientation: "S", tilt: "35",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "5", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "3.80",
      scopHeating: "3.20", covers: "heating_acm",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Bîrsan Cristina-Maria",
      atestat: "CT-01567",
      grade: "I",
      company: "PatrimoniumEnergy SRL",
      phone: "0768 567 890",
      email: "birsan@patrimoniu-energy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Vilă P+1+M din 2003, reabilitare profundă 2025. Structură cadre beton armat cu pereți GVP 25cm, termoizolație ETICS vată bazaltică 15cm pe fațade, vată 25cm în mansardă, XPS 10cm sub planșeu subsol. Tâmplărie nouă PVC tripan Low-E argon. Pompă de căldură aer-apă Daikin Altherma 3 12kW (SCOP 3.20) cu pardoseală radiantă P+1, convectoare în mansardă. Solar termic 4m² panouri plane pentru ACM + PV 5kWp monocristalin pe versant sud. Ventilare mecanică cu HR η=82%. n50=1.5 h⁻¹. Clasă energetică estimată B.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 5 încărcat — Vilă P+1+M reabilitată Brașov cu PC aer-apă 12kW + PV 5kWp + solar termic 4m². Clasă B.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 6 — Bloc de locuințe nou P+6, Iași 2025 — nZEB RECEPȚIE
  // Centrală de scară gaz condensare 200kW, EPS grafitat 15cm, PV 20kWp. Clasă B.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo6 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Bd. Chimiei nr. 28, Bloc Rezidențial Copou Gardens",
      city: "Iași", county: "Iași", postalCode: "700359",
      category: "RC", structure: "Cadre beton armat",
      yearBuilt: "2025", yearRenov: "",
      floors: "P+6", basement: true, attic: false,
      units: "42", stairs: "2",
      areaUseful: "2800", volume: "7840", areaEnvelope: "3400",
      heightBuilding: "21.0", heightFloor: "2.80",
      locality: "Iași",
      perimeter: "110", n50: "1.5", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "receptie", parkingSpaces: "48",
    });
    setOpaqueElements([
      { name: "Pereți ext. BCA 30cm + EPS grafitat 15cm ETICS", type: "PE", orientation: "Mixt", area: "1500", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS grafitat 15cm", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.031, rho: 20 },
        { matName: "BCA 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă necirculabilă — XPS 15cm", type: "PT", orientation: "Orizontal", area: "400", layers: [
        { matName: "Membrană bitum", material: "Bitum (membrană)", thickness: "10", lambda: 0.17, rho: 1050 },
        { matName: "XPS 15cm", material: "Polistiren extrudat XPS", thickness: "150", lambda: 0.034, rho: 35 },
        { matName: "Barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
        { matName: "Beton armat", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Planșeu peste subsol — EPS 10cm", type: "PB", orientation: "Orizontal", area: "400", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă ciment", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "Beton armat", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC tripan Low-E argon (toate orientările)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "420", orientation: "Mixt", frameRatio: "22" },
      { name: "Uși acces scări tripan PVC", glazingType: "Triplu vitraj", frameType: "PVC (5 camere)", u: "1.20", g: "0.40", area: "12", orientation: "N", frameRatio: "35" },
    ]);
    setThermalBridges([
      { name: "PE — Planșee intermediare ×7 niveluri", type: "Joncțiuni pereți", psi: "0.06", length: "770" },
      { name: "PE — Terasă", type: "Acoperiș", psi: "0.08", length: "110" },
      { name: "PE — Subsol/fundație (izolat perimetral)", type: "Joncțiuni pereți", psi: "0.08", length: "110" },
      { name: "Glaf ferestre PVC tripan", type: "Ferestre", psi: "0.03", length: "560" },
      { name: "Consolă balcon — ruptoare termice Schöck", type: "Joncțiuni pereți", psi: "0.08", length: "240" },
      { name: "Colțuri exterioare ×4", type: "Joncțiuni pereți", psi: "0.04", length: "84" },
    ]);
    setHeating({
      source: "GAZ_COND", power: "200", eta_gen: "0.98",
      nominalPower: "200",
      emission: "RAD_OT", eta_em: "0.95",
      distribution: "BINE_INT", eta_dist: "0.93",
      control: "TERMO_RAD", eta_ctrl: "0.95",
      regime: "continuu", theta_int: "20", nightReduction: "2",
      tStaircase: "15", tBasement: "10", tAttic: "",
    });
    setAcm({
      source: "CAZAN_H", consumers: "100", dailyLiters: "50",
      storageVolume: "2000", storageLoss: "2.5",
      pipeLength: "120", pipeInsulated: true,
      circRecirculation: true, circHours: "16",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({
      type: "MEC_HR70", airflow: "4200", fanPower: "1200",
      operatingHours: "3500", hrEfficiency: "70",
    });
    setLighting({
      type: "LED", pDensity: "4.0", controlType: "PREZ_DAY",
      fCtrl: "0.65", operatingHours: "1800", naturalLightRatio: "25",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "110", orientation: "S", tilt: "10",
      inverterType: "STD", inverterEta: "0.96",
      peakPower: "20", usage: "autoconsum",
    });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Ursache Dragoș-Mihai",
      atestat: "CT-01890",
      grade: "I",
      company: "EcoEnergy Moldova SRL",
      phone: "0733 456 789",
      email: "ursache@ecoenergy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Bloc de locuințe nou P+6 cu subsol, proiectat nZEB conform Legii 238/2024 și Mc 001-2022. Structură cadre beton armat cu pereți BCA 30cm + EPS grafitat 15cm ETICS (λ=0.031). Terasă necirculabilă XPS 15cm, planșeu peste subsol EPS 10cm. Tâmplărie PVC tripan Low-E argon (U=0.80). Ruptoare termice Schöck la toate consolele de balcon. Centrală termică de scară cu cazan gaz condensare Viessmann Vitodens 200-W 200kW. Radiatoare oțel cu robineți termostatici. Ventilare mecanică pe fiecare apartament cu recuperare η=70%. PV 20kWp pe terasă (110m²). n50=1.5 h⁻¹. Clasă energetică estimată B, nZEB.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 6 încărcat — Bloc nou P+6 nZEB Iași cu gaz condensare 200kW + PV 20kWp + HR 70%. Clasă B.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 7 — Clădire birouri P+3, Cluj-Napoca 2024 — ÎNCHIRIERE
  // VRF Daikin, fațadă cortină tripan Low-E, PV 30kWp, LED BMS. Clasă A.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo7 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Fabricii nr. 5, Clădirea Innovation Hub",
      city: "Cluj-Napoca", county: "Cluj", postalCode: "400500",
      category: "BI", structure: "Cadre beton armat",
      yearBuilt: "2024", yearRenov: "",
      floors: "P+3", basement: true, attic: false,
      units: "1", stairs: "2",
      areaUseful: "3200", volume: "11200", areaEnvelope: "3600",
      heightBuilding: "14.0", heightFloor: "3.20",
      locality: "Cluj-Napoca",
      perimeter: "120", n50: "1.2", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "inchiriere", parkingSpaces: "60",
    });
    setOpaqueElements([
      { name: "Pereți cortină — vată bazaltică 15cm + beton armat", type: "PE", orientation: "Mixt", area: "1400", layers: [
        { matName: "Placaj compozit aluminiu", material: "Aluminiu", thickness: "4", lambda: 160.0, rho: 2700 },
        { matName: "Vată bazaltică 15cm", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.035, rho: 80 },
        { matName: "Beton armat", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
        { matName: "Gips-carton", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
      ]},
      { name: "Terasă verde extensivă — XPS 15cm", type: "PT", orientation: "Orizontal", area: "800", layers: [
        { matName: "Substrat vegetal", material: "Pământ uscat", thickness: "80", lambda: 0.40, rho: 1500 },
        { matName: "Membrană hidroizolație", material: "Bitum (membrană)", thickness: "10", lambda: 0.17, rho: 1050 },
        { matName: "XPS 15cm", material: "Polistiren extrudat XPS", thickness: "150", lambda: 0.034, rho: 35 },
        { matName: "Beton armat", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Placă pe sol — XPS 10cm", type: "PL", orientation: "Orizontal", area: "800", layers: [
        { matName: "Gresie porțelanată", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă armată", material: "Șapă ciment", thickness: "80", lambda: 1.40, rho: 2000 },
        { matName: "XPS 10cm", material: "Polistiren extrudat XPS", thickness: "100", lambda: 0.034, rho: 35 },
        { matName: "Radier beton", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Fațadă cortină tripan Low-E argon (S+E+V)", glazingType: "Triplu vitraj Low-E", frameType: "Aluminiu cu RPT", u: "1.00", g: "0.35", area: "850", orientation: "S", frameRatio: "15" },
      { name: "Ferestre tripan Low-E (Nord)", glazingType: "Triplu vitraj Low-E", frameType: "Aluminiu cu RPT", u: "1.00", g: "0.35", area: "250", orientation: "N", frameRatio: "15" },
    ]);
    setThermalBridges([
      { name: "PE — Planșee intermediare ×4", type: "Joncțiuni pereți", psi: "0.06", length: "480" },
      { name: "PE — Terasă", type: "Acoperiș", psi: "0.08", length: "120" },
      { name: "Glafuri fațadă cortină — profil RPT", type: "Ferestre", psi: "0.03", length: "600" },
      { name: "Soclu/fundație — izolat perimetral", type: "Joncțiuni pereți", psi: "0.10", length: "120" },
      { name: "Atașament ancorare fațadă cortină", type: "Joncțiuni pereți", psi: "0.02", length: "480" },
    ]);
    setHeating({
      source: "PC_AA", power: "120", eta_gen: "3.50",
      nominalPower: "120",
      emission: "VENT_CONV", eta_em: "0.93",
      distribution: "BINE_INT", eta_dist: "0.95",
      control: "INTELIG", eta_ctrl: "0.97",
      regime: "intermitent", theta_int: "21", nightReduction: "4",
      tStaircase: "", tBasement: "10", tAttic: "",
    });
    setAcm({
      source: "BOILER_E", consumers: "80", dailyLiters: "10",
      storageVolume: "500", storageLoss: "2.0",
      pipeLength: "40", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "VRF", power: "150", eer: "4.50",
      cooledArea: "3200", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR80", airflow: "5600", fanPower: "2000",
      operatingHours: "3000", hrEfficiency: "80",
    });
    setLighting({
      type: "LED_PRO", pDensity: "3.5", controlType: "BMS",
      fCtrl: "0.55", operatingHours: "2500", naturalLightRatio: "40",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "160", orientation: "S", tilt: "10",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "30", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "3.50",
      scopHeating: "3.20", covers: "heating",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Moldovan Alexandra-Elena",
      atestat: "CT-02180",
      grade: "I",
      company: "Green Building Advisors SRL",
      phone: "0756 234 567",
      email: "moldovan@gba-audit.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Clădire birouri Class A P+3 cu subsol tehnic, Cluj-Napoca, 2024. Fațadă cortină aluminiu cu RPT și triplu vitraj Low-E argon (U=1.0, g=0.35). Sistem VRF Daikin RXYSA (COP 3.50, EER 4.50) cu ventiloconvectoare pe 4 țevi. UTA centralizată cu recuperare căldură η=80%, debit 5600 m³/h. PV 30kWp monocristalin pe terasă verde extensivă. Iluminat LED profesional cu management BMS integrat, senzori prezență și lumină naturală pe fiecare zonă. n50=1.2 h⁻¹. Scopul certificatului: închiriere. Clasa energetică A.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 7 încărcat — Birouri Class A Cluj-Napoca cu VRF + PV 30kWp + LED BMS + HR 80%. Clasă A.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 8 — Pensiune P+1, Sibiu, reabilitare 2024 — TURISM
  // Cazan peleți 60kW, solar termic 8m² ACM, PV 8kWp, EPS 12cm. Clasă C.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo8 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Turnului nr. 15",
      city: "Sibiu", county: "Sibiu", postalCode: "550160",
      category: "HO", structure: "Zidărie portantă",
      yearBuilt: "1995", yearRenov: "2024",
      floors: "P+1", basement: true, attic: false,
      units: "12", stairs: "1",
      areaUseful: "420", volume: "1260", areaEnvelope: "850",
      heightBuilding: "7.50", heightFloor: "2.80",
      locality: "Sibiu",
      perimeter: "68.0", n50: "2.0", shadingFactor: "0.90",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "turism", parkingSpaces: "10",
    });
    setOpaqueElements([
      { name: "Pereți ext. GVP 25cm + EPS 12cm ETICS (reab. 2024)", type: "PE", orientation: "S", area: "130", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 12cm", material: "Polistiren expandat EPS 100", thickness: "120", lambda: 0.036, rho: 25 },
        { matName: "Cărămidă cu goluri (GVP)", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. Nord — GVP 25cm + EPS 12cm ETICS", type: "PE", orientation: "N", area: "90", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 12cm", material: "Polistiren expandat EPS 100", thickness: "120", lambda: 0.036, rho: 25 },
        { matName: "GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă necirculabilă — EPS 15cm (reab.)", type: "PT", orientation: "Orizontal", area: "220", layers: [
        { matName: "Membrană bitum", material: "Bitum (membrană)", thickness: "10", lambda: 0.17, rho: 1050 },
        { matName: "EPS 15cm", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.036, rho: 25 },
        { matName: "Barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
        { matName: "Beton armat", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Planșeu peste subsol — XPS 8cm (reab.)", type: "PB", orientation: "Orizontal", area: "220", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă ciment", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "XPS 8cm", material: "Polistiren extrudat XPS", thickness: "80", lambda: 0.034, rho: 35 },
        { matName: "Beton armat", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu Low-E (înlocuite 2024)", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.30", g: "0.55", area: "55", orientation: "Mixt", frameRatio: "25" },
      { name: "Uși acces + restaurant dublu Low-E", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.50", g: "0.50", area: "8", orientation: "S", frameRatio: "30" },
    ]);
    setThermalBridges([
      { name: "PE — Planșeu intermediar", type: "Joncțiuni pereți", psi: "0.08", length: "68" },
      { name: "PE — Terasă", type: "Acoperiș", psi: "0.10", length: "68" },
      { name: "PE — Subsol/fundație", type: "Joncțiuni pereți", psi: "0.12", length: "68" },
      { name: "Glaf ferestre PVC", type: "Ferestre", psi: "0.05", length: "90" },
      { name: "Colțuri exterioare ×4", type: "Joncțiuni pereți", psi: "0.06", length: "30" },
      { name: "Prag uși acces", type: "Ferestre", psi: "0.10", length: "5" },
    ]);
    setHeating({
      source: "BIO_AUT", power: "60", eta_gen: "0.90",
      nominalPower: "60",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.92",
      control: "ZONAL", eta_ctrl: "0.95",
      regime: "continuu", theta_int: "21", nightReduction: "2",
      tStaircase: "15", tBasement: "10", tAttic: "",
    });
    setAcm({
      source: "SOLAR_AUX", consumers: "30", dailyLiters: "60",
      storageVolume: "500", storageLoss: "2.0",
      pipeLength: "25", pipeInsulated: true,
      circRecirculation: true, circHours: "14",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "LED", pDensity: "4.5", controlType: "PREZ_DAY",
      fCtrl: "0.65", operatingHours: "2200", naturalLightRatio: "25",
    });
    setSolarThermal({
      ...INITIAL_SOLAR_TH, enabled: true,
      type: "PLAN", area: "8", orientation: "S", tilt: "40",
      eta0: "0.75", a1: "3.5",
    });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "44", orientation: "S", tilt: "15",
      inverterType: "STD", inverterEta: "0.96",
      peakPower: "8", usage: "autoconsum",
    });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({
      ...INITIAL_BIO, enabled: true,
      type: "PELETI", boilerEta: "0.90", power: "60",
      covers: "heating", annualConsumption: "14",
    });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Dăscălescu Ana-Maria",
      atestat: "CT-01745",
      grade: "I",
      company: "TransilvaniaEnergy Audit SRL",
      phone: "0769 345 678",
      email: "dascalescu@transenergy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Pensiune turistică P+1 cu 12 camere, Sibiu, construită 1995, reabilitată 2024. Structură zidărie portantă GVP 25cm, termoizolație ETICS cu EPS 12cm pe fațade, EPS 15cm pe terasă, XPS 8cm sub planșeu subsol. Tâmplărie PVC dublu Low-E. Cazan automat pe peleți Viessmann Vitoligno 300-C 60kW cu siloz 4t și alimentare automată. Solar termic 8m² panouri plane pentru preparare ACM turism (consum ridicat). PV 8kWp monocristalin pe terasă. Ventilare naturală. Iluminat LED cu senzori prezență pe holuri și spații comune. Scopul certificatului: turism/clasificare. Clasă energetică estimată C.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 8 încărcat — Pensiune turistică Sibiu cu cazan peleți 60kW + solar termic 8m² + PV 8kWp. Clasă C.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 9 — Casă P+M Brașov 2009 — VALIDARE lucrare master
  // Sursa: Lucrare master Mizgan Alexandru, UTB Brașov 2017-2018
  // Referință: q_tot=174,90 kWh/m²an → Clasa B (MC 001-2006)
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo9 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Exemplu nr. 12",
      city: "Brașov", county: "Brașov", postalCode: "500001",
      category: "RI", structure: "BCA + cadre beton",
      yearBuilt: "2009", yearRenov: "",
      floors: "P+M", basement: false, attic: true,
      units: "1", stairs: "1",
      areaUseful: "149.61", volume: "433.54", areaEnvelope: "383.60",
      heightBuilding: "7.00", heightFloor: "2.80",
      locality: "Brașov",
      perimeter: "38.0", n50: "3.0", shadingFactor: "0.90",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "1",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+V — GVP 25cm + EPS 10cm ETICS", type: "PE", orientation: "S", area: "57", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.038, rho: 25 },
        { matName: "GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+E — GVP 25cm + EPS 10cm ETICS", type: "PE", orientation: "N", area: "57", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.038, rho: 25 },
        { matName: "GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. E+V (laterali) — GVP 25cm + EPS 10cm", type: "PE", orientation: "E", area: "79.70", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.038, rho: 25 },
        { matName: "GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu pod/mansardă — vată minerală 20cm (pod neîncălzit)", type: "PP", orientation: "Orizontal", area: "81.80", layers: [
        { matName: "Gips-carton 12.5mm", material: "Gips-carton", thickness: "13", lambda: 0.41, rho: 900 },
        { matName: "Vată minerală 20cm", material: "Vată minerală (vrac/saltea)", thickness: "200", lambda: 0.042, rho: 30 },
        { matName: "Gips-carton 12.5mm", material: "Gips-carton", thickness: "13", lambda: 0.41, rho: 900 },
      ]},
      { name: "Placă pe sol — XPS 8cm + BA + șapă", type: "PL", orientation: "Orizontal", area: "81.80", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "XPS 8cm", material: "Polistiren extrudat XPS", thickness: "80", lambda: 0.034, rho: 35 },
        { matName: "Beton armat 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat", material: "Pietriș sau balast", thickness: "100", lambda: 0.70, rho: 1800 },
      ]},
      { name: "Ușă de intrare — lemn masiv opacă", type: "PE", orientation: "N", area: "1.89", layers: [
        { matName: "Lemn masiv 6cm", material: "Lemn moale (brad/molid)", thickness: "60", lambda: 0.14, rho: 500 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC termopan dublu — Sud", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.80", g: "0.75", area: "5.73", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC termopan dublu — Vest", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.80", g: "0.75", area: "9.87", orientation: "V", frameRatio: "25" },
      { name: "Ferestre PVC termopan dublu — Est", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.80", g: "0.75", area: "7.08", orientation: "E", frameRatio: "25" },
      { name: "Ferestre PVC termopan dublu — Nord", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.80", g: "0.75", area: "1.74", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "PE — Planșeu/centură GVP-beton (perimetru fiecare nivel)", type: "Joncțiuni pereți", psi: "0.20", length: "38" },
      { name: "PE — Colțuri exterioare ×4 (P+M = 8 colțuri)", type: "Joncțiuni pereți", psi: "0.10", length: "14" },
      { name: "PE — Soclu/fundație (perimetru)", type: "Joncțiuni pereți", psi: "0.25", length: "38" },
      { name: "PE — Cornișă acoperiș mansardă", type: "Acoperiș", psi: "0.10", length: "38" },
      { name: "Glaf ferestre PVC", type: "Ferestre", psi: "0.06", length: "49" },
    ]);
    setHeating({
      source: "GAZ_COND", power: "24", eta_gen: "0.97",
      nominalPower: "24",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.92",
      control: "TERMO_RAD", eta_ctrl: "0.93",
      regime: "intermitent", theta_int: "20", nightReduction: "3",
      tStaircase: "", tBasement: "", tAttic: "5",
    });
    setAcm({
      source: "CAZAN_H", consumers: "4", dailyLiters: "50",
      storageVolume: "0", storageLoss: "0",
      pipeLength: "8", pipeInsulated: false,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "MIXED", pDensity: "8.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1400", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Mizgan Alexandru",
      atestat: "CT-02134",
      grade: "II",
      company: "UTB Brașov — Lucrare master",
      phone: "",
      email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLADIRE REALA — sursa: Lucrare de masterat Mizgan Alexandru, UTB Brașov, 2017-2018 (Traseu IV). Casă unifamilială P+M, construcție 2009, Brașov (Zona IV climatică, Te=-21°C). Structură zidărie GVP 25cm cu termoizolație ETICS EPS 10cm. Planșeu mansardă cu vată minerală 20cm (pod neîncălzit, τ≈0,9). Placă pe sol cu XPS. Tâmplărie PVC termopan dublu, g=0,75. Cazan gaz condensare 24kW. Referință MC 001-2006: H_T=158,22 W/K; H_v=87,14 W/K (n=0,6 h⁻¹); q_inc=121,0 kWh/m²an → Clasa C; q_tot=174,90 kWh/m²an → Clasa B. Metodologie Mc 001-2022 (ISO 13790 lunar) produce valori diferite față de MC 001-2006 (grade-zile SR 4839) datorită tratamentului distinct al solului (ISO 13370) și separării H_ve/H_inf.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 9 încărcat — Casă P+M Brașov 2009 (lucrare master Mizgan). Referință MC 001-2006: q_tot=174,9 kWh/m²an, Clasa B.", "success", 6000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 10 — Cămin studențesc 2S+P+4E Brașov 1997 — VALIDARE disertație
  // Sursa: Disertație Ionuț Tunaru, UTB Brașov 2019
  // Referință: q_tot=240,74 kWh/m²an → Clasa C (MC 001-2006)
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo10 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Universității nr. 1",
      city: "Brașov", county: "Brașov", postalCode: "500068",
      category: "HC", structure: "Cadre beton armat",
      yearBuilt: "1997", yearRenov: "",
      floors: "2S+P+4E", basement: true, attic: false,
      units: "85", stairs: "2",
      areaUseful: "2950", volume: "12667", areaEnvelope: "3726.77",
      heightBuilding: "19.60", heightFloor: "2.80",
      locality: "Brașov",
      perimeter: "140.0", n50: "4.0", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Pereți ext. BA 30cm + EPS 10cm — zone S+V (fațade principale)", type: "PE", orientation: "S", area: "668", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.040, rho: 25 },
        { matName: "Beton armat 30cm", material: "Beton armat", thickness: "300", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. BA 30cm + EPS 10cm — zone N+E (fațade secundare)", type: "PE", orientation: "N", area: "668", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.040, rho: 25 },
        { matName: "Beton armat 30cm", material: "Beton armat", thickness: "300", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. BA 30cm + EPS 10cm — zona E", type: "PE", orientation: "E", area: "285", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.040, rho: 25 },
        { matName: "Beton armat 30cm", material: "Beton armat", thickness: "300", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. BA 30cm — zona V", type: "PE", orientation: "V", area: "285.94", layers: [
        { matName: "Tencuială ext.", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "EPS 10cm", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.040, rho: 25 },
        { matName: "Beton armat 30cm", material: "Beton armat", thickness: "300", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți subsol în contact cu terenul — BA 30cm neizolat", type: "PB", orientation: "Orizontal", area: "128.80", layers: [
        { matName: "Beton armat 30cm", material: "Beton armat", thickness: "300", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu terasă necirculabilă — BCA-zgură 20cm (neizolat)", type: "PT", orientation: "Orizontal", area: "754", layers: [
        { matName: "Nisip 1cm", material: "Nisip sau mortar de pozare", thickness: "10", lambda: 0.70, rho: 1600 },
        { matName: "Hidroizolație bitum", material: "Bitum (membrană)", thickness: "4", lambda: 0.17, rho: 1050 },
        { matName: "Șapă suport 3.5cm", material: "Șapă ciment", thickness: "35", lambda: 0.93, rho: 2000 },
        { matName: "Beton de pantă 7cm", material: "Beton simplu", thickness: "70", lambda: 0.93, rho: 2200 },
        { matName: "Beton armat 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Plăci BCA-zgură 20cm", material: "BCA (beton celular autoclavizat)", thickness: "200", lambda: 0.36, rho: 800 },
        { matName: "Tencuială interioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol 2S — BA 15cm + șapă + pietriș (fără izolație termică)", type: "PL", orientation: "Orizontal", area: "754", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "20", lambda: 2.03, rho: 2300 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 0.93, rho: 2000 },
        { matName: "Beton armat 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș 25cm", material: "Pietriș sau balast", thickness: "250", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC termopan — Est (fațadă principală cu camere)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.67", g: "0.75", area: "139.93", orientation: "E", frameRatio: "25" },
      { name: "Ferestre PVC termopan — Vest", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.67", g: "0.75", area: "27.83", orientation: "V", frameRatio: "25" },
      { name: "Ferestre PVC termopan — Sud", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.67", g: "0.75", area: "8.97", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC termopan — Nord (casa scării)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.67", g: "0.75", area: "6.30", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "PE — Planșee intermediare BA (5 nivele × perimetru)", type: "Joncțiuni pereți", psi: "0.40", length: "700" },
      { name: "PE — Terasă/atic", type: "Acoperiș", psi: "0.15", length: "140" },
      { name: "PE — Soclu/fundație", type: "Joncțiuni pereți", psi: "0.30", length: "140" },
      { name: "Glaf ferestre PVC", type: "Ferestre", psi: "0.06", length: "370" },
      { name: "Colțuri exterioare ×4", type: "Joncțiuni pereți", psi: "0.10", length: "20" },
    ]);
    setHeating({
      source: "GAZ_STD", power: "350", eta_gen: "0.85",
      nominalPower: "350",
      emission: "RAD_OT", eta_em: "0.90",
      distribution: "SLAB_INT", eta_dist: "0.85",
      control: "FARA", eta_ctrl: "0.82",
      regime: "intermitent", theta_int: "20", nightReduction: "4",
      tStaircase: "10", tBasement: "5", tAttic: "",
    });
    setAcm({
      source: "CAZAN_H", consumers: "332", dailyLiters: "50",
      storageVolume: "1000", storageLoss: "3.0",
      pipeLength: "80", pipeInsulated: false,
      circRecirculation: true, circHours: "16",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "10.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "2000", naturalLightRatio: "10",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Tunaru Ionuț",
      atestat: "CT-03187",
      grade: "II",
      company: "UTB Brașov — Disertație",
      phone: "",
      email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLADIRE REALA — sursa: Disertație Ionuț Tunaru, UTB Brașov 2019. Cămin studențesc 2S+P+4E, Str. Universității nr. 1, Brașov (Zona IV climatică, Te=-21°C), construit 1997. Structură cadre BA, pereți ext. BA 30cm + EPS 10cm. Terasă neizolată termic (BCA-zgură 20cm, R=0,976 m²K/W). Placă pe sol fără termoizolație. Tâmplărie PVC dublu vitraj (g=0,75). Centrală termică proprie gaz natural 350kW. 85 garsoniere × 332 persoane. Referință MC 001-2006: H_T=2214,87 W/K; H_v=2584,10 W/K (n=0,6 h⁻¹); q_inc=113,6 kWh/m²an → Clasa B; q_acm=117,3 kWh/m²an → Clasa E; q_tot=240,74 kWh/m²an → Clasa C. Notă: metodologia Mc 001-2022 (ISO 13790 lunar, ISO 13370 sol) produce EP mai mare față de MC 001-2006 din cauza tratamentului diferit al solului și al separării H_ve/H_inf. Terasa cu R=0,976 m²K/W (U=1,03 W/m²K) este elementul cel mai deficitar al anvelopei — prioritate maximă de reabilitare.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 10 încărcat — Cămin studențesc 2S+P+4E Brașov 1997 (disertație Tunaru). Referință MC 001-2006: q_tot=240,7 kWh/m²an, Clasa C.", "success", 6000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 11 — Spital Petroșani C8 (P+4E, 1965) — VALIDARE Mc 001-2022
  // Sursa: Audit energetic real, Mc 001-2022
  // Referință: EP=246 kWh/m²an → Clasa C | Soft: 242 kWh/m²an (−1,7 %)
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo11 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Libertății nr. 8",
      city: "Petroșani", county: "Hunedoara", postalCode: "332088",
      category: "SA", structure: "Zidărie portantă",
      yearBuilt: "1965", yearRenov: "",
      floors: "P+4E", basement: false, attic: false,
      units: "1", stairs: "2",
      areaUseful: "700.38", volume: "2346.27", areaEnvelope: "987",
      heightBuilding: "17.50", heightFloor: "3.50",
      locality: "Petroșani",
      perimeter: "48.0", n50: "5.0", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "servicii", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Pereți ext. S — cărămidă plină 38cm (neizolat, 1965)", type: "PE", orientation: "S", area: "130", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N — cărămidă plină 38cm (neizolat, 1965)", type: "PE", orientation: "N", area: "150", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. E — cărămidă plină 38cm (neizolat, 1965)", type: "PE", orientation: "E", area: "195", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. V — cărămidă plină 38cm (neizolat, 1965)", type: "PE", orientation: "V", area: "195", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu terasă — BA 15cm + zgură 12cm + bitum (1965)", type: "PT", orientation: "Orizontal", area: "140.08", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Bitum hidroizolație", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "Șapă suport 3cm", material: "Șapă ciment", thickness: "30", lambda: 0.93, rho: 2000 },
        { matName: "Zgură granuloasă 12cm", material: "BCA (beton celular autoclavizat)", thickness: "120", lambda: 0.22, rho: 600 },
        { matName: "Beton armat 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol — BA 12cm + șapă (fără izolație termică)", type: "PL", orientation: "Orizontal", area: "140.08", layers: [
        { matName: "Pardoseală mozaic 2cm", material: "Beton simplu", thickness: "20", lambda: 0.93, rho: 2200 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 0.93, rho: 2000 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 20cm", material: "Pietriș sau balast", thickness: "200", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre simplu vitraj, ramă aluminiu — Sud (săli tratament)", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "55", orientation: "S", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Nord (coridoare)", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "35", orientation: "N", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Est", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "45", orientation: "E", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Vest", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "45", orientation: "V", frameRatio: "30" },
    ]);
    setThermalBridges([
      { name: "Centură BA planșee intermediare (48m × 4 nivele)", type: "Joncțiuni pereți", psi: "0.30", length: "192" },
      { name: "Soclu/fundație (perimetru)", type: "Joncțiuni pereți", psi: "0.25", length: "48" },
      { name: "Glafuri ferestre (aluminiu fără RPT)", type: "Ferestre", psi: "0.06", length: "80" },
      { name: "Colțuri exterioare ×4 (pe 5 nivele)", type: "Joncțiuni pereți", psi: "0.15", length: "70" },
    ]);
    setHeating({
      source: "TERMO", power: "120", eta_gen: "0.80",
      nominalPower: "120",
      emission: "RAD_OT", eta_em: "0.88",
      distribution: "SLAB_INT", eta_dist: "0.82",
      control: "FARA", eta_ctrl: "0.82",
      regime: "continuu", theta_int: "22", nightReduction: "0",
      tStaircase: "15", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "50", dailyLiters: "50",
      storageVolume: "500", storageLoss: "2.5",
      pipeLength: "40", pipeInsulated: false,
      circRecirculation: true, circHours: "12",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "12.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "2500", naturalLightRatio: "12",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Auditor Energetic",
      atestat: "SA-00011",
      grade: "I",
      company: "Audit Energetic Hunedoara SRL",
      phone: "", email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLĂDIRE REALĂ — Spital Petroșani, Corp C8 (funcțiuni mixte P+4E). Construit 1965. Au=700,38 m², V=2346,27 m³. Structură zidărie portantă cărămidă plină 38cm, neizolat. Ferestre simplu vitraj cu ramă aluminiu (U≈5,8 W/m²K). Planșeu terasă cu zgură granuloasă 12cm. Termoficare urbană. Referință Mc 001-2022 (audit energetic real): H_tr=2274,3 W/K; EP_ref=246 kWh/m²an → Clasa C. Soft Zephren: EP=242 kWh/m²an → Clasa C. Deviație: −1,7 % (VALID). Sursă: audit energetic complet conform Mc 001-2022 (46 pag.). Priorități reabilitare: 1) înlocuire tâmplărie (U=5,8→1,1 W/m²K) — impact maxim; 2) termoizolație pereți ETICS 12cm EPS; 3) termoizolație terasă 10cm EPS.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 11 încărcat — Spital Petroșani C8, P+4E, 1965. Ref. Mc 001-2022: EP=246 kWh/m²an Cl.C → Soft: 242 kWh/m²an (−1,7 % VALID).", "success", 6000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 12 — Liceu Târgoviște C6 (P+2E, 1975) — ATENȚIE sol dublu-contabilizat
  // Sursa: Referințe Mc 001-2022, Anexă clădiri tipice
  // Notă: deviatıe +120 % datorită dublei contabilizări a solului
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo12 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Calea Câmpulung nr. 6",
      city: "Târgoviște", county: "Dâmbovița", postalCode: "130011",
      category: "ED", structure: "Cadre beton armat",
      yearBuilt: "1975", yearRenov: "",
      floors: "P+2E", basement: false, attic: false,
      units: "1", stairs: "3",
      areaUseful: "3922.69", volume: "14900", areaEnvelope: "4300",
      heightBuilding: "12.00", heightFloor: "4.00",
      locality: "Târgoviște",
      perimeter: "144.0", n50: "4.5", shadingFactor: "0.80",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "servicii", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Pereți ext. S — cărămidă plină 38cm + tencuieli (1975, neizolat)", type: "PE", orientation: "S", area: "302", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N — cărămidă plină 38cm + tencuieli (1975, neizolat)", type: "PE", orientation: "N", area: "337", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. E — cărămidă plină 38cm + tencuieli (1975, neizolat)", type: "PE", orientation: "E", area: "317", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. V — cărămidă plină 38cm + tencuieli (1975, neizolat)", type: "PE", orientation: "V", area: "322", layers: [
        { matName: "Tencuială ext 2cm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu terasă plată — BA 15cm + bitum (fără termoizolație, 1975)", type: "PT", orientation: "Orizontal", area: "1307.56", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Bitum hidroizolație", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "Beton de pantă 7cm", material: "Beton simplu", thickness: "70", lambda: 0.93, rho: 2200 },
        { matName: "Beton armat 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol — BA 12cm + șapă (fără izolație, R'=0,313 m²K/W doc)", type: "PL", orientation: "Orizontal", area: "1307.56", layers: [
        { matName: "Pardoseală gresie 1cm", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 0.93, rho: 2000 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 20cm", material: "Pietriș sau balast", thickness: "200", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre simplu vitraj, ramă aluminiu — Sud (clase mari)", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "130", orientation: "S", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Nord (coridoare)", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "95", orientation: "N", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Est", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "115", orientation: "E", frameRatio: "30" },
      { name: "Ferestre simplu vitraj, ramă aluminiu — Vest", glazingType: "Simplu vitraj", frameType: "Aluminiu fără RPT", u: "5.80", g: "0.87", area: "110", orientation: "V", frameRatio: "30" },
    ]);
    setThermalBridges([
      { name: "Centură BA planșee (144m × 2 nivele)", type: "Joncțiuni pereți", psi: "0.35", length: "288" },
      { name: "Soclu/fundație (perimetru)", type: "Joncțiuni pereți", psi: "0.30", length: "144" },
      { name: "Glafuri ferestre (aluminiu fără RPT)", type: "Ferestre", psi: "0.08", length: "200" },
      { name: "Colțuri exterioare ×4 (3 nivele)", type: "Joncțiuni pereți", psi: "0.15", length: "48" },
    ]);
    setHeating({
      source: "GAZ_STD", power: "500", eta_gen: "0.82",
      nominalPower: "500",
      emission: "RAD_OT", eta_em: "0.88",
      distribution: "SLAB_INT", eta_dist: "0.82",
      control: "FARA", eta_ctrl: "0.82",
      regime: "intermitent", theta_int: "20", nightReduction: "5",
      tStaircase: "12", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "CAZAN_H", consumers: "200", dailyLiters: "15",
      storageVolume: "300", storageLoss: "2.0",
      pipeLength: "60", pipeInsulated: false,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "10.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "2200", naturalLightRatio: "20",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Auditor Energetic",
      atestat: "ED-00012",
      grade: "I",
      company: "Audit Energetic Dâmbovița SRL",
      phone: "", email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLĂDIRE REALĂ — Liceu Târgoviște, Corp C6 (clădire școlară P+2E). Construit 1975. Au=3922,69 m². Structură cadre beton armat, pereți cărămidă plină 38cm neizolat. Ferestre simplu vitraj cu ramă aluminiu (U≈5,8 W/m²K). Terasă plată fără termoizolație. Placă pe sol BA fără izolație termică. Referință document Mc 001-2022: H_tr=9936,0 W/K (include H_sol calculat ca U'×A cu R'=0,313 m²K/W pentru sol+placa — echivalent U'=3,19 W/m²K). ATENȚIE: Dacă se introduc straturile plăcii pe sol în software și acesta aplică ISO 13370, se produce o supraestimare de +120 % față de referință (dublu-contabilizare sol). Motivul: R'=0,313 include DEJA rezistența solului, dar ISO 13370 aplică SUPLIMENTAR transferul prin sol. Clasa energetică referință: D. Prioritate reabilitare: înlocuire geamuri simplu→dublu Low-E, termoizolație terasă, izolație perimetral placă sol.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 12 încărcat — Liceu Târgoviște C6, P+2E, 1975. ATENȚIE: deviatıe +120 % datorită dublei contabilizări a solului (R'=0,313 m²K/W).", "warning", 7000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 13 — Bloc T770 Timișoara (P+9E, 1985) — U TEORETIC catalog
  // Sursa: Date normative Mc 001-2022, bloc tip T770
  // Referință: H_tr=2334 W/K (U_perete=1,862 W/m²K catalog) | deviatıe +8 %
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo13 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Independenței nr. 77",
      city: "Timișoara", county: "Timiș", postalCode: "300011",
      category: "RC", structure: "Cadre beton armat",
      yearBuilt: "1985", yearRenov: "",
      floors: "P+9E", basement: false, attic: false,
      units: "40", stairs: "2",
      areaUseful: "1529.28", volume: "3746.75", areaEnvelope: "1300",
      heightBuilding: "28.00", heightFloor: "2.80",
      locality: "Timișoara",
      perimeter: "50.0", n50: "4.5", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "20",
    });
    setOpaqueElements([
      { name: "Pereți ext. S — panel vibropor 17cm (U teoretic catalog 1,86 W/m²K)", type: "PE", orientation: "S", area: "240", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "Beton ușor (ponce) 17cm", material: "Beton ușor (ponce)", thickness: "170", lambda: 0.52, rho: 1200 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N — panel vibropor 17cm (U teoretic catalog)", type: "PE", orientation: "N", area: "240", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "Beton ușor (ponce) 17cm", material: "Beton ușor (ponce)", thickness: "170", lambda: 0.52, rho: 1200 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. E — panel vibropor 17cm (U teoretic catalog)", type: "PE", orientation: "E", area: "235", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "Beton ușor (ponce) 17cm", material: "Beton ușor (ponce)", thickness: "170", lambda: 0.52, rho: 1200 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. V — panel vibropor 17cm (U teoretic catalog)", type: "PE", orientation: "V", area: "235", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "Beton ușor (ponce) 17cm", material: "Beton ușor (ponce)", thickness: "170", lambda: 0.52, rho: 1200 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu terasă plată — BA 12cm + bitum (neizolat, 1985)", type: "PT", orientation: "Orizontal", area: "152.93", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Bitum hidroizolație", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "Șapă beton 4cm", material: "Beton simplu", thickness: "40", lambda: 0.93, rho: 2200 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol — BA 10cm + șapă (fără izolație, parter bloc)", type: "PL", orientation: "Orizontal", area: "152.93", layers: [
        { matName: "Parchet laminat 1cm", material: "Lemn moale (brad/molid)", thickness: "10", lambda: 0.14, rho: 500 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 0.93, rho: 2000 },
        { matName: "Beton armat 10cm", material: "Beton armat", thickness: "100", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 15cm", material: "Pietriș sau balast", thickness: "150", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre lemn simplu vitraj — Sud (apartamente 1985)", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "45", orientation: "S", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Nord (casa scării)", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "45", orientation: "N", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Est", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "45", orientation: "E", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Vest", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "45", orientation: "V", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Planșee intermediare BA (50m × 9 nivele)", type: "Joncțiuni pereți", psi: "0.40", length: "450" },
      { name: "Terasă/atic bloc", type: "Acoperiș", psi: "0.20", length: "50" },
      { name: "Soclu/fundație (perimetru)", type: "Joncțiuni pereți", psi: "0.25", length: "50" },
      { name: "Glafuri ferestre (lemn)", type: "Ferestre", psi: "0.04", length: "72" },
    ]);
    setHeating({
      source: "TERMO", power: "200", eta_gen: "0.88",
      nominalPower: "200",
      emission: "RAD_OT", eta_em: "0.90",
      distribution: "SLAB_INT", eta_dist: "0.85",
      control: "FARA", eta_ctrl: "0.82",
      regime: "continuu", theta_int: "20", nightReduction: "0",
      tStaircase: "10", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "100", dailyLiters: "50",
      storageVolume: "500", storageLoss: "2.0",
      pipeLength: "50", pipeInsulated: false,
      circRecirculation: true, circHours: "16",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "8.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1600", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Auditor Energetic",
      atestat: "RC-00013",
      grade: "I",
      company: "Audit Energetic Timiș SRL",
      phone: "", email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLĂDIRE REALĂ — Bloc tip T770 Timișoara, P+9E, construit 1985. Au=1529,28 m², V=3746,75 m³. Structură cadre beton armat, paneluri prefabricate vibropor 17cm (U_teoretic=1,862 W/m²K din catalog normativ). Ferestre simplu vitraj cu ramă lemn (U≈5,8 W/m²K). Terasă plată fără termoizolație. Termoficare urbană Colterm Timișoara. DATE TEORETICE (U din catalog Mc 001-2022 pentru panouri T770). Referință Mc 001-2022: H_tr=2334 W/K → deviatıe față de soft: +8,0 % (VALID). Clasa D. Comparați cu Demo 14 (U măsurat) unde panelurile au U_real=1,316 W/m²K → H_tr=1966 W/K (deviatıe +2,7 %). Prioritate reabilitare: 1) izolație ETICS pe paneluri exterioare; 2) înlocuire ferestre; 3) izolație terasă.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 13 încărcat — Bloc T770 Timișoara, P+9E, 1985 (U teoretic catalog). H_tr=2334 W/K, deviatıe +8,0 % față de referință (VALID).", "success", 6000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 14 — Bloc T770 Timișoara (P+9E, 1985) — U MĂSURAT in-situ
  // Sursa: Măsurători reale pe bloc (campanie termografie)
  // Referință: H_tr=1966 W/K (U_perete=1,316 W/m²K măsurat) | deviatıe +2,7 %
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo14 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Independenței nr. 77B",
      city: "Timișoara", county: "Timiș", postalCode: "300011",
      category: "RC", structure: "Cadre beton armat",
      yearBuilt: "1985", yearRenov: "",
      floors: "P+9E", basement: false, attic: false,
      units: "40", stairs: "2",
      areaUseful: "1529.28", volume: "3746.75", areaEnvelope: "1300",
      heightBuilding: "28.00", heightFloor: "2.80",
      locality: "Timișoara",
      perimeter: "50.0", n50: "4.5", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "20",
    });
    setOpaqueElements([
      { name: "Pereți ext. S — panel T770 (U MĂSURAT in-situ 1,316 W/m²K)", type: "PE", orientation: "S", area: "190", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "BCA 13cm (echivalent panel măsurat)", material: "BCA (beton celular autoclavizat)", thickness: "130", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N — panel T770 (U MĂSURAT in-situ 1,316 W/m²K)", type: "PE", orientation: "N", area: "190", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "BCA 13cm (echivalent panel măsurat)", material: "BCA (beton celular autoclavizat)", thickness: "130", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. E — panel T770 (U MĂSURAT in-situ)", type: "PE", orientation: "E", area: "285", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "BCA 13cm (echivalent panel măsurat)", material: "BCA (beton celular autoclavizat)", thickness: "130", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. V — panel T770 (U MĂSURAT in-situ)", type: "PE", orientation: "V", area: "285", layers: [
        { matName: "Tencuială ext 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        { matName: "BCA 13cm (echivalent panel măsurat)", material: "BCA (beton celular autoclavizat)", thickness: "130", lambda: 0.22, rho: 600 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu terasă plată — BA 12cm + bitum (neizolat, 1985)", type: "PT", orientation: "Orizontal", area: "152.93", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Bitum hidroizolație", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "Șapă beton 4cm", material: "Beton simplu", thickness: "40", lambda: 0.93, rho: 2200 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int 1.5cm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol — BA 10cm + șapă (fără izolație, parter bloc)", type: "PL", orientation: "Orizontal", area: "152.93", layers: [
        { matName: "Parchet laminat 1cm", material: "Lemn moale (brad/molid)", thickness: "10", lambda: 0.14, rho: 500 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 0.93, rho: 2000 },
        { matName: "Beton armat 10cm", material: "Beton armat", thickness: "100", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 15cm", material: "Pietriș sau balast", thickness: "150", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre lemn simplu vitraj — Sud (apartamente 1985)", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "62", orientation: "S", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Nord (casa scării)", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "62", orientation: "N", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Est", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "63", orientation: "E", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Vest", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "63", orientation: "V", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Planșee intermediare BA (50m × 9 nivele)", type: "Joncțiuni pereți", psi: "0.40", length: "450" },
      { name: "Terasă/atic bloc", type: "Acoperiș", psi: "0.20", length: "50" },
      { name: "Soclu/fundație (perimetru)", type: "Joncțiuni pereți", psi: "0.25", length: "50" },
      { name: "Glafuri ferestre (lemn)", type: "Ferestre", psi: "0.04", length: "80" },
    ]);
    setHeating({
      source: "TERMO", power: "200", eta_gen: "0.88",
      nominalPower: "200",
      emission: "RAD_OT", eta_em: "0.90",
      distribution: "SLAB_INT", eta_dist: "0.85",
      control: "FARA", eta_ctrl: "0.82",
      regime: "continuu", theta_int: "20", nightReduction: "0",
      tStaircase: "10", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "100", dailyLiters: "50",
      storageVolume: "500", storageLoss: "2.0",
      pipeLength: "50", pipeInsulated: false,
      circRecirculation: true, circHours: "16",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "8.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1600", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Auditor Energetic",
      atestat: "RC-00014",
      grade: "I",
      company: "Audit Energetic Timiș SRL",
      phone: "", email: "",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "CLĂDIRE REALĂ — Bloc tip T770 Timișoara, P+9E, construit 1985. Au=1529,28 m², V=3746,75 m³. DATE MĂSURATE IN-SITU (campanie termografie + flux-metru). U_perete_masurat=1,316 W/m²K (vs. U_teoretic=1,862 W/m²K catalog) — diferența explică îmbunătățirea față de datele de catalog. Stratificația în soft utilizează BCA 13cm (λ=0,22) ca echivalent al panelului cu U_masurat≈1,31 W/m²K. Ferestre simplu vitraj lemn (U≈5,8 W/m²K). Termoficare urbană Colterm Timișoara. Referință Mc 001-2022 (cu U_masurat): H_tr=1966 W/K → deviatıe față de soft: +2,7 % (VALID, EXCELENT). Clasa D. Comparați cu Demo 13 (U teoretic) unde H_tr=2334 W/K și deviatıe +8,0 %. Concluzie: U valorile reale din termografie sunt mai precise și reduc cu 16 % H_tr față de catalog.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 14 încărcat — Bloc T770 Timișoara, P+9E, 1985 (U MĂSURAT in-situ). H_tr=1966 W/K, deviatıe +2,7 % (EXCELENT).", "success", 6000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: EXPORT / IMPORT PROIECT (JSON)
  // ═══════════════════════════════════════════════════════════
  const exportProject = useCallback(() => {
    const data = {
      version: "2.0", exportDate: new Date().toISOString(),
      normativeRef: "Mc 001-2022 + SR EN ISO 52000-1/NA:2023",
      building, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor,
      useNA2023, finAnalysisInputs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Zephren_${building.address || "proiect"}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, useNA2023, finAnalysisInputs]);

  const exportCSV = useCallback(() => {
    const rows = [];
    // Header
    rows.push("Tip,Denumire,Tip element,Orientare,Suprafata m2,U W/m2K,g factor,Lambda W/mK,Grosime mm,Psi W/mK,Lungime m");
    // Opaque elements
    opaqueElements.forEach(function(el) {
      const uCalc = el.layers && el.layers.length > 0 ? (function() {
        const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
        const rsi = elType ? elType.rsi : 0.13;
        const rse = elType ? elType.rse : 0.04;
        const rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
        return 1/(rsi+rL+rse);
      })() : 0;
      rows.push(["Opac", el.name||"", el.type||"", el.orientation||"", el.area||"", uCalc.toFixed(3), "", "", "", "", ""].join(","));
      if (el.layers) {
        el.layers.forEach(function(l) {
          rows.push(["  Strat", l.matName||"", "", "", "", "", "", l.lambda||"", l.thickness||"", "", ""].join(","));
        });
      }
    });
    // Glazing elements
    glazingElements.forEach(function(el) {
      rows.push(["Vitraj", el.name||"", el.glazingType||"", el.orientation||"", el.area||"", el.u||"", el.g||"", "", "", "", ""].join(","));
    });
    // Thermal bridges
    thermalBridges.forEach(function(b) {
      rows.push(["Punte", b.name||"", b.type||"", "", "", "", "", "", "", b.psi||"", b.length||""].join(","));
    });
    // Summary
    rows.push("");
    rows.push("=== DATE GENERALE ===");
    rows.push("Parametru,Valoare");
    rows.push("Categorie," + (building.category||""));
    rows.push("Localitate," + (building.locality||""));
    rows.push("Au m2," + (building.areaUseful||""));
    rows.push("Volum m3," + (building.volume||""));
    rows.push("An constructie," + (building.yearBuilt||""));
    rows.push("Zona climatica," + (selectedClimate?.zone||""));
    // Systems
    rows.push("");
    rows.push("=== INSTALATII ===");
    rows.push("Sursa incalzire," + (HEAT_SOURCES.find(function(s){return s.id===heating.source;})?.label||heating.source));
    rows.push("Randament generare," + (heating.eta_gen||""));
    rows.push("Sursa ACM," + (ACM_SOURCES.find(function(s){return s.id===acm.source;})?.label||acm.source));
    rows.push("Sistem racire," + (COOLING_SYSTEMS.find(function(s){return s.id===cooling.system;})?.label||cooling.system));
    rows.push("Tip ventilare," + (VENTILATION_TYPES.find(function(s){return s.id===ventilation.type;})?.label||ventilation.type));
    rows.push("Tip iluminat," + (LIGHTING_TYPES.find(function(s){return s.id===lighting.type;})?.label||lighting.type));
    // Results
    if (instSummary) {
      var epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      var co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      rows.push("");
      rows.push("=== REZULTATE ===");
      rows.push("Energie primara kWh/(m2·an)," + (epF?.toFixed(1)||""));
      rows.push("Emisii CO2 kgCO2/(m2·an)," + (co2F?.toFixed(1)||""));
      rows.push("Clasa energetica," + (getEnergyClassEPBD(epF, building.category)?.cls||""));
      rows.push("RER %," + ((renewSummary?.rer||0).toFixed(1)));
      rows.push("Coef global G W/(m3·K)," + (envelopeSummary?.G?.toFixed(4)||""));
      rows.push("Energie finala kWh/(m2·an)," + (instSummary.qf_total_m2?.toFixed(1)||""));
    }

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Zephren_" + (building.address||"proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + "_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportat cu succes.", "success");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, showToast]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT EXCEL (.xlsx) — Structured workbook with multiple sheets
  // ═══════════════════════════════════════════════════════════
  const exportExcel = useCallback(async () => {
    try {
      setExporting("excel");
      const XLSX = (await import("xlsx")).default || await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Building info
      const infoData = [
        ["Parametru", "Valoare"],
        ["Adresa", building.address || ""], ["Localitate", building.locality || ""],
        ["Județ", building.county || ""], ["Categorie", building.category || ""],
        ["An construcție", building.yearBuilt || ""], ["Suprafață utilă (m²)", building.areaUseful || ""],
        ["Volum (m³)", building.volume || ""], ["Suprafață anvelopă (m²)", building.areaEnvelope || ""],
        ["Zonă climatică", selectedClimate?.zone || ""], ["Temp ext calcul (°C)", selectedClimate?.theta_e || ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), "Clădire");

      // Sheet 2: Opaque elements
      const opaqueData = [["Denumire", "Tip", "Suprafață (m²)", "Orientare", "U (W/m²K)", "Straturi"]];
      opaqueElements.forEach(el => {
        const rL = (el.layers||[]).reduce((s,l) => { const d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0); }, 0);
        const u = rL > 0 ? (1/(0.13+rL+0.04)).toFixed(3) : "0";
        opaqueData.push([el.name||"", el.type||"", el.area||"", el.orientation||"", u, (el.layers||[]).map(l=>l.matName||"?").join(" + ")]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opaqueData), "Elemente opace");

      // Sheet 3: Glazing
      const glazData = [["Denumire", "Tip vitraj", "Suprafață (m²)", "Orientare", "U (W/m²K)", "g"]];
      glazingElements.forEach(el => glazData.push([el.name||"", el.glazingType||"", el.area||"", el.orientation||"", el.u||"", el.g||""]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(glazData), "Vitraje");

      // Sheet 4: Thermal bridges
      const bridgeData = [["Denumire", "Tip", "Ψ (W/mK)", "Lungime (m)", "Pierdere (W/K)"]];
      thermalBridges.forEach(b => bridgeData.push([b.name||"", b.type||"", b.psi||"", b.length||"", ((parseFloat(b.psi)||0)*(parseFloat(b.length)||0)).toFixed(2)]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bridgeData), "Punți termice");

      // Sheet 5: Results (if available)
      if (instSummary) {
        const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
        const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
        const Au = parseFloat(building.areaUseful) || 1;
        const resultsData = [
          ["Indicator", "Valoare", "Unitate"],
          ["Energie primară totală", epF?.toFixed(1)||"", "kWh/(m²·an)"],
          ["Emisii CO₂", co2F?.toFixed(1)||"", "kgCO₂/(m²·an)"],
          ["Clasă energetică", getEnergyClassEPBD(epF, building.category)?.cls||"", ""],
          ["RER", (renewSummary?.rer||0).toFixed(1), "%"],
          ["Conform nZEB", (renewSummary?.rer||0) >= 30 && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
          ["Coef. global G", envelopeSummary?.G?.toFixed(4)||"", "W/(m³·K)"],
          ["", "", ""],
          ["Energie finală per utilitate", "kWh/an", "kWh/(m²·an)"],
          ["Încălzire", instSummary.qf_h?.toFixed(0)||"", (instSummary.qf_h/Au)?.toFixed(1)||""],
          ["Apă caldă (ACM)", instSummary.qf_w?.toFixed(0)||"", (instSummary.qf_w/Au)?.toFixed(1)||""],
          ["Răcire", instSummary.qf_c?.toFixed(0)||"", (instSummary.qf_c/Au)?.toFixed(1)||""],
          ["Ventilare", instSummary.qf_v?.toFixed(0)||"", (instSummary.qf_v/Au)?.toFixed(1)||""],
          ["Iluminat", instSummary.qf_l?.toFixed(0)||"", (instSummary.qf_l/Au)?.toFixed(1)||""],
          ["TOTAL finală", instSummary.qf_total?.toFixed(0)||"", instSummary.qf_total_m2?.toFixed(1)||""],
          ["", "", ""],
          ["Energie primară per utilitate", "kWh/an", "kWh/(m²·an)"],
          ["Încălzire", instSummary.ep_h?.toFixed(0)||"", (instSummary.ep_h/Au)?.toFixed(1)||""],
          ["Apă caldă (ACM)", instSummary.ep_w?.toFixed(0)||"", (instSummary.ep_w/Au)?.toFixed(1)||""],
          ["Răcire", instSummary.ep_c?.toFixed(0)||"", (instSummary.ep_c/Au)?.toFixed(1)||""],
          ["Ventilare", instSummary.ep_v?.toFixed(0)||"", (instSummary.ep_v/Au)?.toFixed(1)||""],
          ["Iluminat", instSummary.ep_l?.toFixed(0)||"", (instSummary.ep_l/Au)?.toFixed(1)||""],
          ["TOTAL primară", instSummary.ep_total?.toFixed(0)||"", instSummary.ep_total_m2?.toFixed(1)||""],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsData), "Rezultate");
      }

      // Sheet 6: Monthly balance (if available)
      if (monthlyISO && monthlyISO.length === 12) {
        const monthData = [["Lună", "T ext (°C)", "Q pierderi (kWh)", "Q aporturi (kWh)", "Q încălzire (kWh)", "Q răcire (kWh)", "η_H", "γ_H"]];
        monthlyISO.forEach(m => monthData.push([
          m.name, m.tExt?.toFixed(1)||"", m.Q_loss?.toFixed(0)||"", m.Q_gain?.toFixed(0)||"",
          m.qH_nd?.toFixed(0)||"", m.qC_nd?.toFixed(0)||"", m.eta_H?.toFixed(3)||"", m.gamma_H?.toFixed(3)||""
        ]));
        monthData.push(["TOTAL", "", monthlyISO.reduce((s,m)=>s+(m.Q_loss||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.Q_gain||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.qH_nd||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.qC_nd||0),0).toFixed(0), "", ""]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthData), "Bilanț lunar");
      }

      // Sheet 7: Systems
      const sysData = [
        ["Sistem", "Parametru", "Valoare"],
        ["Încălzire", "Sursă", HEAT_SOURCES.find(s=>s.id===heating.source)?.label||heating.source],
        ["", "Putere nominală (kW)", heating.power||""],
        ["", "Randament generare", heating.eta_gen||""],
        ["", "Sistem emisie", EMISSION_SYSTEMS.find(s=>s.id===heating.emission)?.label||""],
        ["", "Calitate distribuție", DISTRIBUTION_QUALITY.find(s=>s.id===heating.distribution)?.label||""],
        ["", "Tip reglaj", CONTROL_TYPES.find(s=>s.id===heating.control)?.label||""],
        ["ACM", "Sursă", ACM_SOURCES.find(s=>s.id===acm.source)?.label||acm.source],
        ["", "Consumatori", acm.consumers||""],
        ["", "Litri/zi/pers", acm.dailyLiters||""],
        ["Răcire", "Sistem", COOLING_SYSTEMS.find(s=>s.id===cooling.system)?.label||cooling.system],
        ["", "EER", cooling.eer||""],
        ["Ventilare", "Tip", VENTILATION_TYPES.find(s=>s.id===ventilation.type)?.label||ventilation.type],
        ["", "Debit (m³/h)", ventilation.airflow||""],
        ["", "Recuperare (%)", ventilation.hrEfficiency||""],
        ["Iluminat", "Tip", LIGHTING_TYPES.find(s=>s.id===lighting.type)?.label||lighting.type],
        ["", "Densitate (W/m²)", lighting.pDensity||""],
        ["", "LENI (kWh/m²·an)", instSummary?.leni?.toFixed(1)||""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sysData), "Instalații");

      // Sheet 8: Renewables
      const renData = [
        ["Sursă regenerabilă", "Parametru", "Valoare"],
        ["PV", "Activ", photovoltaic.enabled ? "DA" : "NU"],
        ["", "Putere (kWp)", photovoltaic.peakPower||""],
        ["", "Suprafață (m²)", photovoltaic.area||""],
        ["", "Producție (kWh/an)", renewSummary?.qPV_kWh?.toFixed(0)||""],
        ["Solar termic", "Activ", solarThermal.enabled ? "DA" : "NU"],
        ["", "Suprafață (m²)", solarThermal.area||""],
        ["", "Producție (kWh/an)", renewSummary?.qSolarTh?.toFixed(0)||""],
        ["Pompă căldură", "Activ", heatPump.enabled ? "DA" : "NU"],
        ["", "Tip", heatPump.type||""],
        ["", "COP nominal", heatPump.cop||""],
        ["Biomasă", "Activ", biomass.enabled ? "DA" : "NU"],
        ["", "Tip", biomass.type||""],
        ["", "", ""],
        ["TOTAL", "RER (%)", (renewSummary?.rer||0).toFixed(1)],
        ["", "RER on-site (%)", (renewSummary?.rerOnSite||0).toFixed(1)],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renData), "Regenerabile");

      // Sheet 9: Auditor
      if (auditor.name) {
        const audData = [
          ["Câmp", "Valoare"],
          ["Nume auditor", auditor.name||""],
          ["Nr. atestat", auditor.atestat||""],
          ["Grad", auditor.grade||""],
          ["Firmă", auditor.company||""],
          ["Telefon", auditor.phone||""],
          ["Email", auditor.email||""],
          ["Data CPE", auditor.date||""],
          ["Observații", auditor.observations||""],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(audData), "Auditor");
      }

      const filename = `Zephren_${(building.address||"proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast("Excel exportat cu succes.", "success");
    } catch(e) {
      showToast("Eroare export Excel: " + e.message, "error");
    } finally { setExporting(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, opaqueElements, glazingElements, thermalBridges, showToast]);

  // ═══════════════════════════════════════════════════════════
  // IMPORT ENERG+ XML — Parse ENERG+ format files
  // ═══════════════════════════════════════════════════════════
  const importENERGPlus = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, "text/xml");
        const getText = (tag) => doc.querySelector(tag)?.textContent?.trim() || "";
        const getNum = (tag) => parseFloat(getText(tag)) || 0;

        // Try to extract building info from common ENERG+ XML structures
        const updates = {};
        const addr = getText("Adresa") || getText("adresa") || getText("Address");
        const locality = getText("Localitate") || getText("localitate") || getText("Oras");
        const county = getText("Judet") || getText("judet");
        const au = getNum("SuprafataUtila") || getNum("Au") || getNum("suprafata_utila");
        const vol = getNum("Volum") || getNum("volum") || getNum("VolumIncalzit");
        const year = getText("AnConstructie") || getText("an_constructie");
        const cat = getText("Categorie") || getText("categorie") || getText("CategorieClase");

        if (addr) updates.address = addr;
        if (locality) updates.city = locality;
        if (county) updates.county = county;
        if (au) updates.areaUseful = au.toString();
        if (vol) updates.volume = vol.toString();
        if (year) updates.yearBuilt = year;
        if (cat) {
          const catMap = {"rezidential":"RI","birouri":"BI","invatamant":"ED","sanatate":"SA","hotel":"HC","comercial":"CO","sport":"SP","altar":"AL"};
          updates.category = catMap[cat.toLowerCase()] || cat;
        }

        // Try to extract envelope elements
        const importedOpaque = [];
        const wallNodes = doc.querySelectorAll("Element, element, Perete, perete, ElementOpac");
        wallNodes.forEach(node => {
          const name = node.getAttribute("denumire") || node.getAttribute("name") || node.querySelector("Denumire")?.textContent || "Import";
          const area = parseFloat(node.getAttribute("suprafata") || node.getAttribute("area") || node.querySelector("Suprafata")?.textContent) || 0;
          const uVal = parseFloat(node.getAttribute("U") || node.getAttribute("u") || node.querySelector("U")?.textContent) || 0;
          const type = node.getAttribute("tip") || node.getAttribute("type") || "wall_ext";
          if (area > 0) {
            importedOpaque.push({ name, area: area.toString(), type, orientation: "N", layers: [{ matName: "Import ENERG+", lambda: 0.5, thickness: (uVal > 0 ? Math.round(1000*0.5/((1/uVal)-0.17)) : 200).toString() }] });
          }
        });

        if (Object.keys(updates).length > 0) {
          setBuilding(p => ({ ...p, ...updates }));
        }
        if (importedOpaque.length > 0) {
          setOpaqueElements(prev => [...prev, ...importedOpaque]);
        }

        showToast(`Import ENERG+: ${Object.keys(updates).length} câmpuri + ${importedOpaque.length} elemente`, "success");
      } catch(e) {
        showToast("Eroare parsare ENERG+ XML: " + e.message, "error");
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  // Import OCR — scanare certificat existent cu Claude Vision
  const importOCR = useCallback(async (file) => {
    try {
      showToast("Se analizează imaginea cu AI...", "info", 5000);
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const resp = await fetch("/api/ocr-cpe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      if (!resp.ok) throw new Error("OCR API error: " + resp.status);
      const result = await resp.json();
      if (result.data) {
        const d = result.data;
        const updates = {};
        if (d.address) updates.address = d.address;
        if (d.city) updates.city = d.city;
        if (d.county) updates.county = d.county;
        if (d.yearBuilt) updates.yearBuilt = String(d.yearBuilt);
        if (d.category) updates.category = d.category;
        if (d.areaUseful) updates.areaUseful = String(d.areaUseful);
        if (d.volume) updates.volume = String(d.volume);
        if (d.floors) updates.floors = d.floors;
        if (d.scope) updates.scopCpe = d.scope;
        setBuilding(function(p) { return Object.assign({}, p, updates); });
        if (d.auditorName) setAuditor(function(p) { return Object.assign({}, p, { name: d.auditorName, atestat: d.auditorAtestat || p.atestat }); });
        showToast("OCR import: " + Object.keys(updates).length + " câmpuri extrase din imagine", "success");
      } else {
        showToast("Nu s-au putut extrage date din imagine", "error");
      }
    } catch(e) { showToast("Eroare OCR: " + e.message, "error"); }
  }, [showToast]);

  // Import DOSET XML (program MDLPA)
  const importDOSET = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, "text/xml");
        const getText = (tag) => { const el = doc.querySelector(tag); return el ? el.textContent.trim() : ""; };
        const getNum = (tag) => parseFloat(getText(tag)) || 0;
        const updates = {};
        // DOSET XML structure
        const addr = getText("adresa_cladire") || getText("AdresaCladire") || getText("adresa");
        if (addr) updates.address = addr;
        const au = getNum("aria_utila") || getNum("AriaUtila") || getNum("au");
        if (au) updates.areaUseful = String(au);
        const vol = getNum("volum_incalzit") || getNum("VolumIncalzit") || getNum("volum");
        if (vol) updates.volume = String(vol);
        const year = getText("an_constructie") || getText("AnConstructie");
        if (year) updates.yearBuilt = year;
        const cat = getText("categorie_functionala") || getText("CategorieFunctionala");
        if (cat) { const m = {"1":"RI","2":"RC","3":"RA","4":"BI","5":"ED","6":"SA","7":"HC","8":"CO","9":"SP"}; updates.category = m[cat] || cat; }
        const locality = getText("localitate") || getText("Localitate");
        if (locality) updates.city = locality;
        const county = getText("judet") || getText("Judet");
        if (county) updates.county = county;
        if (Object.keys(updates).length > 0) setBuilding(function(p) { return Object.assign({}, p, updates); });
        showToast("Import DOSET: " + Object.keys(updates).length + " câmpuri importate", "success");
      } catch(e) { showToast("Eroare parsare DOSET: " + e.message, "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  // Import gbXML / IFC (format internațional BIM)
  const importGbXML = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, "text/xml");
        const ns = doc.documentElement.namespaceURI || "";
        const qry = (tag) => doc.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() || doc.querySelector(tag)?.textContent?.trim() || "";
        const qryNum = (tag) => parseFloat(qry(tag)) || 0;
        const updates = {};
        // gbXML Campus > Building
        const bldg = doc.getElementsByTagNameNS(ns, "Building")[0] || doc.querySelector("Building");
        if (bldg) {
          const area = parseFloat(bldg.querySelector("Area")?.textContent) || qryNum("FloorArea") || qryNum("Area");
          if (area > 0) updates.areaUseful = String(area);
          const name = bldg.getAttribute("buildingType") || "";
          if (name) { const m = {"Office":"BI","School":"ED","Hospital":"SA","Hotel":"HC","Retail":"CO"}; updates.category = m[name] || "AL"; }
        }
        // Surfaces → opaque elements
        const importedOpaque = [];
        const surfaces = doc.getElementsByTagNameNS(ns, "Surface");
        for (var si = 0; si < Math.min(surfaces.length, 20); si++) {
          var surf = surfaces[si];
          var sType = surf.getAttribute("surfaceType") || "";
          if (sType.includes("Wall") || sType.includes("Roof") || sType.includes("Floor")) {
            var sName = surf.getAttribute("id") || "gbXML Surface " + (si+1);
            var areaEl = surf.getElementsByTagNameNS(ns, "Area")[0] || surf.querySelector("Area");
            var sArea = areaEl ? parseFloat(areaEl.textContent) : 0;
            var typeMap = {"ExteriorWall":"PE","Roof":"PT","InteriorFloor":"PI","SlabOnGrade":"PL","Underground":"PB"};
            var elType = "PE";
            for (var k in typeMap) { if (sType.includes(k)) { elType = typeMap[k]; break; } }
            if (sArea > 0) importedOpaque.push({ name: sName, area: String(sArea), type: elType, orientation: "N", layers: [] });
          }
        }
        if (Object.keys(updates).length > 0) setBuilding(function(p) { return Object.assign({}, p, updates); });
        if (importedOpaque.length > 0) setOpaqueElements(function(prev) { return prev.concat(importedOpaque); });
        showToast("Import gbXML: " + Object.keys(updates).length + " câmpuri + " + importedOpaque.length + " suprafețe", "success");
      } catch(e) { showToast("Eroare parsare gbXML/IFC: " + e.message, "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  const importProject = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Schema validation: must be an object with at least one known key
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          showToast("Format invalid: fișierul nu conține un obiect proiect valid.", "error"); return;
        }
        const knownKeys = ["building","opaqueElements","glazingElements","thermalBridges","heating","acm","cooling","ventilation","lighting","solarThermal","photovoltaic","heatPump","biomass","otherRenew","auditor"];
        const hasAnyKnown = knownKeys.some(k => data[k] !== undefined);
        if (!hasAnyKnown) {
          showToast("Format invalid: nu conține date de proiect recunoscute.", "error"); return;
        }
        // Validate arrays are actually arrays
        if (data.opaqueElements && !Array.isArray(data.opaqueElements)) { showToast("Eroare: opaqueElements nu este un array valid.", "error"); return; }
        if (data.glazingElements && !Array.isArray(data.glazingElements)) { showToast("Eroare: glazingElements nu este un array valid.", "error"); return; }
        if (data.thermalBridges && !Array.isArray(data.thermalBridges)) { showToast("Eroare: thermalBridges nu este un array valid.", "error"); return; }
        // Validate building is object
        if (data.building && (typeof data.building !== "object" || Array.isArray(data.building))) { showToast("Eroare: building nu este un obiect valid.", "error"); return; }
        // All checks pass — apply data
        if (data.building) setBuilding(prev => ({...INITIAL_BUILDING, ...data.building}));
        if (data.opaqueElements) setOpaqueElements(data.opaqueElements);
        if (data.glazingElements) setGlazingElements(data.glazingElements);
        if (data.thermalBridges) setThermalBridges(data.thermalBridges);
        if (data.heating) setHeating(prev => ({...INITIAL_HEATING, ...data.heating}));
        if (data.acm) setAcm(prev => ({...INITIAL_ACM, ...data.acm}));
        if (data.cooling) setCooling(prev => ({...INITIAL_COOLING, ...data.cooling}));
        if (data.ventilation) setVentilation(prev => ({...INITIAL_VENTILATION, ...data.ventilation}));
        if (data.lighting) setLighting(prev => ({...INITIAL_LIGHTING, ...data.lighting}));
        if (data.solarThermal) setSolarThermal(prev => ({...INITIAL_SOLAR_TH, ...data.solarThermal}));
        if (data.photovoltaic) setPhotovoltaic(prev => ({...INITIAL_PV, ...data.photovoltaic}));
        if (data.heatPump) setHeatPump(prev => ({...INITIAL_HP, ...data.heatPump}));
        if (data.biomass) setBiomass(prev => ({...INITIAL_BIO, ...data.biomass}));
        if (data.otherRenew) setOtherRenew(prev => ({...INITIAL_OTHER, ...data.otherRenew}));
        if (data.auditor) setAuditor(prev => ({...INITIAL_AUDITOR, ...data.auditor}));
        if (data.useNA2023 !== undefined) setUseNA2023(data.useNA2023);
        if (data.finAnalysisInputs) setFinAnalysisInputs(prev => ({...prev, ...data.finAnalysisInputs}));
        setStep(1);
        showToast("Proiect importat cu succes.", "success");
      } catch (err) {
        showToast("Eroare la import: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }, []);

  const importFileRef = useRef(null);


  // ─── CSV Import for envelope elements ───
  const csvImportRef = useRef(null);
  const importCSV = useCallback((file) => {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var lines = e.target.result.split("\n").filter(function(l){return l.trim();});
        if (lines.length < 2) { showToast("CSV invalid — lipsesc date", "error"); return; }
        var headers = lines[0].split(",").map(function(h){return h.trim().toLowerCase();});
        var nameIdx = headers.indexOf("denumire") >= 0 ? headers.indexOf("denumire") : headers.indexOf("name") >= 0 ? headers.indexOf("name") : 0;
        var typeIdx = headers.indexOf("tip") >= 0 ? headers.indexOf("tip") : headers.indexOf("type") >= 0 ? headers.indexOf("type") : 1;
        var areaIdx = headers.indexOf("suprafata") >= 0 ? headers.indexOf("suprafata") : headers.indexOf("area") >= 0 ? headers.indexOf("area") : 2;
        var uIdx = headers.indexOf("u") >= 0 ? headers.indexOf("u") : 3;
        var gIdx = headers.indexOf("g") >= 0 ? headers.indexOf("g") : -1;
        var orientIdx = headers.indexOf("orientare") >= 0 ? headers.indexOf("orientare") : headers.indexOf("orientation") >= 0 ? headers.indexOf("orientation") : -1;
        var catIdx = headers.indexOf("categorie") >= 0 ? headers.indexOf("categorie") : headers.indexOf("category") >= 0 ? headers.indexOf("category") : -1;
        var imported = [];
        for (var i = 1; i < lines.length; i++) {
          var cols = lines[i].split(",").map(function(c){return c.trim();});
          if (cols.length < 3) continue;
          var typeVal = cols[typeIdx] || "";
          var catVal = catIdx >= 0 ? (cols[catIdx]||"").toLowerCase() : "";
          var uVal = parseFloat(cols[uIdx]) || 0;
          var gVal = gIdx >= 0 ? parseFloat(cols[gIdx]) : -1;
          // Explicit type detection: check category column, type column, or g-value presence
          var isGlazing = catVal === "vitraj" || catVal === "glazing" || catVal === "fereastra" || catVal === "window"
            || typeVal.toLowerCase() === "vitraj" || typeVal.toLowerCase() === "glazing"
            || gVal >= 0
            || (uVal > 0 && uVal < 6 && !ELEMENT_TYPES.find(function(et){return et.id === typeVal.toUpperCase();}));
          if (isGlazing) {
            // Looks like a glazing element
            imported.push({type:"glazing", name:cols[nameIdx]||"Import CSV", area:cols[areaIdx]||"0", u:uVal.toFixed(2), g:"0.50", orientation:cols[orientIdx]||"S", frameRatio:"25"});
          } else {
            // Opaque element
            imported.push({type:"opaque", name:cols[nameIdx]||"Import CSV", elType:cols[typeIdx]||"PE", area:cols[areaIdx]||"0", orientation:cols[orientIdx]||"S",
              layers:[{material:"Import CSV",thickness:"300",lambda:0.50,rho:1500,matName:"Material importat"}]});
          }
        }
        var opaqueImports = imported.filter(function(el){return el.type==="opaque";}).map(function(el){return {name:el.name,type:el.elType,area:el.area,orientation:el.orientation,layers:el.layers};});
        var glazingImports = imported.filter(function(el){return el.type==="glazing";}).map(function(el){return {name:el.name,area:el.area,u:el.u,g:el.g,orientation:el.orientation,frameRatio:el.frameRatio};});
        if (opaqueImports.length) setOpaqueElements(function(prev){return prev.concat(opaqueImports);});
        if (glazingImports.length) setGlazingElements(function(prev){return prev.concat(glazingImports);});
        showToast("Importat " + opaqueImports.length + " elemente opace, " + glazingImports.length + " vitraje", "success");
      } catch(err) { showToast("Eroare CSV: " + err.message, "error"); }
    };
    reader.readAsText(file);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS (placed after exportProject/undo/redo declarations)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); exportProject(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "7") { e.preventDefault(); setStep(parseInt(e.key)); }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); setStep(s => Math.max(1, s - 1)); }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); setStep(s => Math.min(7, s + 1)); }
      if (e.key === "Escape") { setPdfPreviewHtml(null); setNzebReportHtml(null); setShowProjectManager(false); setShowClimateMap(false); setShowPhotoGallery(false); setShowProductCatalog(false); }
      // New shortcuts (C7)
      if ((e.ctrlKey || e.metaKey) && e.key === "m") { e.preventDefault(); setShowClimateMap(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p" && e.shiftKey) { e.preventDefault(); setPresentationMode(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); setShowDashboard(d => !d); }
      if (e.key === "F1") { e.preventDefault(); setShowTour(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, exportProject]);

  // ═══════════════════════════════════════════════════════════
  // CPE EXPIRATION NOTIFICATION (C6)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!auditor.date) return;
    const cpeDate = new Date(auditor.date);
    const validityYears = parseInt(auditor.validityYears) || 10;
    const expirationDate = new Date(cpeDate.getTime() + validityYears * 365.25 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expirationDate - new Date()) / (24 * 60 * 60 * 1000));
    if (daysLeft > 0 && daysLeft <= 365) {
      // Notify if CPE expires within 1 year
      if ("Notification" in window && Notification.permission === "granted") {
        // Only show once per session
        if (!window._cpeNotified) {
          window._cpeNotified = true;
          setTimeout(() => {
            showToast(`CPE expiră în ${daysLeft} zile (${expirationDate.toLocaleDateString("ro-RO")})`, daysLeft <= 90 ? "error" : "info", 8000);
          }, 3000);
        }
      }
    }
  }, [auditor.date, auditor.validityYears, showToast]);


  // ─── Drag-and-drop file import ───
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = useCallback(function(e) {
    e.preventDefault();
    setDragOver(false);
    var files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    var file = files[0];
    if (file.name.endsWith(".json")) {
      importProject(file);
    } else if (file.name.endsWith(".csv")) {
      importCSV(file);
    } else if (file.name.endsWith(".xml") || file.name.endsWith(".gbxml")) {
      // Detect format: DOSET, ENERG+, or gbXML
      var reader = new FileReader();
      reader.onload = function(ev) {
        var content = ev.target.result;
        if (content.includes("gbXML") || content.includes("Campus") || content.includes("Surface")) {
          importGbXML(file);
        } else if (content.includes("DOSET") || content.includes("doset") || content.includes("aria_utila")) {
          importDOSET(file);
        } else {
          importENERGPlus(file);
        }
      };
      reader.readAsText(file.slice(0, 5000)); // Read first 5KB for detection
    } else if (file.type && file.type.startsWith("image/")) {
      importOCR(file);
    } else {
      showToast("Format nesuportat. Acceptă: .json, .csv, .xml, .gbxml, imagini", "error");
    }
  }, [importProject, importCSV, importDOSET, importGbXML, importENERGPlus, importOCR]);

  // ─── Climate auto-selection ───
  const selectedClimate = useMemo(() =>
    CLIMATE_DB.find(c => c.name === building.locality) || null
  , [building.locality]);

  const updateBuilding = useCallback((key, val) => {
    setBuilding(prev => ({...prev, [key]: val}));
  }, []);


  // ─── Auto-estimate geometry from Au + floors + height ───
  const estimateGeometry = useCallback(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const hFloor = parseFloat(building.heightFloor) || 2.80;
    const floorsStr = String(building.floors).replace(/[^0-9]/g, "");
    const nFloors = Math.max(1, parseInt(floorsStr) || 1);
    if (Au <= 0) return;
    const areaPerFloor = Au / nFloors;
    const ratio = 1.4;
    const w = Math.sqrt(areaPerFloor / ratio);
    const l = areaPerFloor / w;
    const perim = 2 * (w + l);
    const vol = Au * hFloor;
    const hBldg = nFloors * hFloor;
    const wallArea = perim * hBldg;
    const aEnv = wallArea + 2 * areaPerFloor;
    // Always overwrite — this is explicitly user-triggered auto-estimation
    updateBuilding("volume", vol.toFixed(1));
    updateBuilding("areaEnvelope", aEnv.toFixed(1));
    updateBuilding("perimeter", perim.toFixed(1));
    updateBuilding("heightBuilding", hBldg.toFixed(1));
  }, [building.areaUseful, building.floors, building.heightFloor, updateBuilding]);

  // ─── Computed: A/V ratio ───
  const avRatio = useMemo(() => {
    const a = parseFloat(building.areaEnvelope);
    const v = parseFloat(building.volume);
    if (a > 0 && v > 0) return (a / v).toFixed(3);
    return "—";
  }, [building.areaEnvelope, building.volume]);

  // ─── Opaque element calculations ───
  const calcOpaqueR = useCallback((layers, elementType) => {
    const elType = ELEMENT_TYPES.find(t => t.id === elementType);
    if (!elType || !layers.length) return { r_layers:0, r_total:0, u:0 };
    const r_layers = layers.reduce((sum, l) => {
      const d = parseFloat(l.thickness) / 1000; // mm to m
      return sum + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
    }, 0);
    const r_total = elType.rsi + r_layers + elType.rse;
    const u_base = r_total > 0 ? 1 / r_total : 0;
    // #3 ΔU'' correction per ISO 6946 §6.9.2 — fasteners, air gaps
    // Simplified: ETICS anchors ~0.04, sandwich connectors ~0.08, other ~0.02
    const hasInsulation = layers.some(l => l.lambda > 0 && l.lambda <= 0.06);
    const deltaU = hasInsulation ? 0.04 : 0.02;
    const u = u_base + deltaU;
    return { r_layers, r_total, u, u_base, deltaU };
  }, []);

  // ─── Total envelope summary ───
  const envelopeSummary = useMemo(() => {
    const volume = parseFloat(building.volume) || 0;
    if (!volume) return null;
    let totalHeatLoss = 0;
    let totalArea = 0;

    opaqueElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const { u } = calcOpaqueR(el.layers, el.type);
      const elType = ELEMENT_TYPES.find(t => t.id === el.type);
      // #7 Multi-zonă: τ dinamic pe baza temperaturilor zonelor adiacente
      const tIntEnv = parseFloat(heating.theta_int) || 20;
      const tExtEnv = selectedClimate?.theta_e ?? -15;
      let tau = elType ? elType.tau : 1;
      if (tIntEnv !== tExtEnv) {
        if (el.type === "PB" || el.type === "PS") { tau = (tIntEnv - (parseFloat(heating.tBasement)||10)) / (tIntEnv - tExtEnv); }
        else if (el.type === "PP") { tau = (tIntEnv - (parseFloat(heating.tAttic)||5)) / (tIntEnv - tExtEnv); }
        else if (el.type === "PR") { tau = (tIntEnv - (parseFloat(heating.tStaircase)||15)) / (tIntEnv - tExtEnv); }
      }
      tau = Math.max(0, Math.min(1, tau));
      var uEff = u;
      // #4 ISO 13370 — ground floor types
      if (el.type === "PL") {
        // Slab-on-ground: U_bf = 2λ/(π·B'+d_t) · ln(π·B'/d_t + 1)
        var perim = parseFloat(building.perimeter)||0;
        var lambda_g = 1.5; // ground thermal conductivity W/(m·K)
        var d_t = 0.5 + parseFloat(el.layers?.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0) || 0); // d_t = w + Σ(d_i/λ_i)·λ_ground
        if (perim > 0 && area > 0) {
          var Bp = area/(0.5*perim);
          if (Bp < d_t) { uEff = lambda_g / (0.457*Bp + d_t); }
          else { uEff = 2*lambda_g/(Math.PI*Bp + d_t) * Math.log(Math.PI*Bp/d_t + 1); }
        }
      } else if (el.type === "PB") {
        // Floor over unheated basement — ISO 13370 §9.4
        // U_bf = 1/(1/U_floor + 1/U_basement_walls × h_basement/perimeter_basement)
        var Uf = u; // floor U-value
        var Ubw = 1.5; // basement wall U estimate
        var hBasement = 2.5; // basement height estimate
        uEff = Uf * 0.7; // simplified: ~30% reduction from unheated buffer
      }
      totalHeatLoss += tau * area * uEff;
      totalArea += area;
    });

    glazingElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const u = parseFloat(el.u) || 0;
      totalHeatLoss += 1.0 * area * u; // tau=1 for windows
      totalArea += area;
    });

    // Punți termice
    let bridgeLoss = 0;
    thermalBridges.forEach(b => {
      bridgeLoss += (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0);
    });
    totalHeatLoss += bridgeLoss;

    // #6 Ventilare — folosim n50 dacă e disponibil, altfel n=0.5 h-1
    const n50 = parseFloat(building.n50) || 4.0;
    const e_shield = 0.07; // factor protecție la vânt (clădire semiprotejată)
    const n_inf = n50 * e_shield; // rata infiltrare din n50
    const n = Math.max(0.5, n_inf); // minim 0.5 h-1 (ventilare igienică)
    const ventType = VENTILATION_TYPES.find(v => v.id === ventilation.type);
    const hrEta = ventType?.hasHR ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : ventType.hrEta || 0) : 0;
    const ventLoss = 0.34 * n * volume * (1 - hrEta);
    const totalLossWithVent = totalHeatLoss + ventLoss;

    const G = volume > 0 ? totalLossWithVent / volume : 0;

    return { totalHeatLoss, totalArea, bridgeLoss, ventLoss, G, volume, hrEta };
  }, [opaqueElements, glazingElements, thermalBridges, building.volume, building.perimeter, building.n50, calcOpaqueR, ventilation.type, ventilation.hrEfficiency, heating.theta_int, heating.tBasement, heating.tAttic, heating.tStaircase, selectedClimate]);

  // ─── Auto-update heating efficiencies when source/emission/distribution/control changes ───
  useEffect(() => {
    setHeating(p => {
      const updates = {};
      const src = HEAT_SOURCES.find(s => s.id === p.source);
      if (src) updates.eta_gen = src.eta_gen.toString();
      const em = EMISSION_SYSTEMS.find(s => s.id === p.emission);
      if (em) updates.eta_em = em.eta_em.toString();
      const d = DISTRIBUTION_QUALITY.find(s => s.id === p.distribution);
      if (d) updates.eta_dist = d.eta_dist.toString();
      const c = CONTROL_TYPES.find(s => s.id === p.control);
      if (c) updates.eta_ctrl = c.eta_ctrl.toString();
      return Object.keys(updates).length > 0 ? {...p, ...updates} : p;
    });
  }, [heating.source, heating.emission, heating.distribution, heating.control]);

  // ─── Auto-update lighting ───
  useEffect(() => {
    setLighting(p => {
      const updates = {};
      const lt = LIGHTING_TYPES.find(t => t.id === p.type);
      if (lt) updates.pDensity = lt.pDensity.toString();
      const lc = LIGHTING_CONTROL.find(c => c.id === p.controlType);
      if (lc) updates.fCtrl = lc.fCtrl.toString();
      return Object.keys(updates).length > 0 ? {...p, ...updates} : p;
    });
  }, [lighting.type, lighting.controlType]);

  // ─── Auto-set default ACM liters and lighting hours by building category ───
  useEffect(() => {
    setAcm(p => ({...p, dailyLiters: (ACM_CONSUMPTION[building.category] || 60).toString()}));
    setLighting(p => ({...p, operatingHours: (LIGHTING_HOURS[building.category] || 2000).toString()}));
  }, [building.category]);


  const monthlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const vt = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const hr = vt && vt.hasHR ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : vt.hrEta || 0) : 0;
    return calcMonthlyISO13790({G_env:envelopeSummary.totalHeatLoss, V:V, Au:Au, climate:selectedClimate,
      theta_int:parseFloat(heating.theta_int)||20, glazingElements:glazingElements, shadingFactor:building.shadingFactor,
      hrEta:hr, category:building.category, n50:building.n50, structure:building.structure});
  }, [envelopeSummary, selectedClimate, building, heating.theta_int, glazingElements, ventilation]);

  // ─── ISO 52016-1 Hourly calculation (using generated TMY) ───
  const hourlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate?.temp_month || !selectedClimate?.lat) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au) return null;
    const tmy = generateTMY(selectedClimate.temp_month, selectedClimate.lat);
    if (!tmy) return null;
    const V = parseFloat(building.volume) || 0;
    const H_tr = envelopeSummary.totalHeatLoss || (envelopeSummary.G * V);
    const n_ach = parseFloat(building.n50) > 0 ? parseFloat(building.n50) / 20 : 0.5;
    const H_ve = 0.34 * n_ach * V;
    const C_m = Au * 165000; // medium-heavy construction ~165 kJ/(m²·K) → J/(m²·K)
    const Q_sol_on_building = tmy.Q_sol_horiz.map(g => g * Au * 0.03); // ~3% of horizontal on useful area
    return calcHourlyISO52016({
      T_ext: tmy.T_ext, Au, H_tr, H_ve, C_m,
      theta_int_set_h: parseFloat(heating.theta_int) || 20,
      theta_int_set_c: 26,
      Q_int: null, // uses default 5 W/m²
      Q_sol: Q_sol_on_building,
    });
  }, [envelopeSummary, selectedClimate, building.areaUseful, building.volume, building.n50, heating.theta_int]);

  // ─── Installation summary calculations ───
  const instSummary = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !envelopeSummary) return null;

    // HEATING
    const src = HEAT_SOURCES.find(s => s.id === heating.source);
    const fuel = FUELS.find(f => f.id === (src?.fuel || "gaz"));
    const eta_gen = parseFloat(heating.eta_gen) || 0.85;
    const eta_em = parseFloat(heating.eta_em) || 0.93;
    const eta_dist = parseFloat(heating.eta_dist) || 0.95;
    const eta_ctrl = parseFloat(heating.eta_ctrl) || 0.93;
    const isCOP = src?.isCOP || false;
    const eta_total_h = isCOP ? eta_em * eta_dist * eta_ctrl : eta_gen * eta_em * eta_dist * eta_ctrl;

    const ngz = selectedClimate?.ngz || 3170;
    let qH_nd, qC_nd_calc;
    if (monthlyISO) { qH_nd = monthlyISO.reduce((s,m) => s+m.qH_nd,0); qC_nd_calc = monthlyISO.reduce((s,m) => s+m.qC_nd,0); }
    else { const gm = {RI:7,RC:7,RA:7,BI:15,ED:12,SA:10,HC:8,CO:15,SP:10,AL:10}; qH_nd = Math.max(0,(24*envelopeSummary.G*V*0.9*ngz/1000)-(gm[building.category]||7)*Au); qC_nd_calc = 0; }
    const qH_nd_m2 = Au > 0 ? qH_nd / Au : 0;

    // Energie finală încălzire
    let qf_h;
    if (isCOP) {
      qf_h = qH_nd / (eta_em * eta_dist * eta_ctrl * eta_gen); // COP in loc de eta_gen
    } else {
      qf_h = eta_total_h > 0 ? qH_nd / eta_total_h : 0;
    }

    // ACM
    const nConsumers = parseFloat(acm.consumers) || (Au > 0 ? Math.max(1, Math.round(Au / 30)) : 2);
    const dailyL = parseFloat(acm.dailyLiters) || 60;
    const qACM_nd = nConsumers * dailyL * WATER_TEMP_MONTH.reduce((s,tw,i) => s+[31,28,31,30,31,30,31,31,30,31,30,31][i]*4.186*(55-tw)/3600, 0);
    const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
    let eta_acm = acmSrc?.eta || eta_gen;
    if (acm.source === "CAZAN_H") eta_acm = eta_gen;
    const solarFr = acmSrc?.solarFraction || 0;
    const storageLoss = Math.min(10, Math.max(0, parseFloat(acm.storageLoss) || 2)) / 100; // V3: clamp 0-10%
    // qf_w = energie finală ACM: necesar net × (1-fracție_solară) × (1+pierderi_boiler) / eficiență
    // La PC pentru ACM (isCOP=true): eta_acm=COP, se împarte direct (fără storageLoss separat că COP include distribuția)
    const qf_w = eta_acm > 0
      ? (acmSrc?.isCOP
          ? qACM_nd * (1 - solarFr) / eta_acm               // pompă căldură ACM: Q_final = Q_nd / COP
          : qACM_nd * (1 - solarFr) * (1 + storageLoss) / eta_acm) // cazan/boiler: includ pierderi boiler
      : 0;
    const acmFuel = acm.source === "CAZAN_H" ? fuel : FUELS.find(f => f.id === (acmSrc?.fuel || "electricitate"));

    // COOLING
    const hasCool = cooling.hasCooling && cooling.system !== "NONE";
    const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
    const coolArea = parseFloat(cooling.cooledArea) || Au;
    const qC_nd = hasCool ? (qC_nd_calc > 0 ? qC_nd_calc*(coolArea/Au) : coolArea*25) : 0;
    const eer = parseFloat(cooling.eer) || coolSys?.eer || 3.5;
    const qf_c = hasCool && eer > 0 ? qC_nd / eer : 0;
    const coolFuel = coolSys ? FUELS.find(f => f.id === coolSys.fuel) : null;

    // VENTILATION
    const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const airflow = parseFloat(ventilation.airflow) || (V * 0.5);
    const sfp = ventType?.sfp || 0;
    const ventHours = parseFloat(ventilation.operatingHours) || (selectedClimate?.season || 190) * 16;
    const qf_v = (sfp * (airflow / 3600) * ventHours) / 1000; // kWh/an — airflow m³/h → m³/s for SFP [W/(m³/s)]
    const hrEta = ventType?.hasHR ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : ventType.hrEta || 0) : 0;

    // LIGHTING (LENI) — improved per EN 15193-1
    const pDens = parseFloat(lighting.pDensity) || 4.5;
    const fCtrl = parseFloat(lighting.fCtrl) || 1.0;
    const lightHours = parseFloat(lighting.operatingHours) || 1800;
    const natRatio = (parseFloat(lighting.naturalLightRatio) || 30) / 100;
    // EN 15193-1: LENI = W/1000 * {tD*FO*FD + tN*FO}
    // FO = occupancy factor (~0.8 for offices, ~0.9 for residential, ~1.0 for hospitals)
    const foMap = {RI:0.90, RC:0.90, RA:0.90, BI:0.80, ED:0.75, SA:1.00, HC:0.95, CO:0.85, SP:0.70, AL:0.85};
    const fo = foMap[building.category] || 0.85;
    // Split hours: daytime ~65%, nighttime ~35% (varies by category)
    const nightFracMap = {RI:0.30, RC:0.30, RA:0.30, BI:0.10, ED:0.05, SA:0.45, HC:0.40, CO:0.20, SP:0.15, AL:0.25};
    const nightFrac = nightFracMap[building.category] || 0.25;
    const tD = lightHours * (1 - nightFrac); // daytime hours
    const tN = lightHours * nightFrac; // nighttime hours
    const fD = Math.max(0, 1 - natRatio * 0.65); // daylight dependency factor (natural light reduces daytime need)
    const leni = pDens * fCtrl * (tD * fo * fD + tN * fo) / 1000; // kWh/(m2·an)
    const qf_l = leni * Au;

    // TOTAL ENERGIE FINALĂ
    const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l;
    const qf_total_m2 = Au > 0 ? qf_total / Au : 0;

    // ENERGIE PRIMARĂ
    // B1 FIX: la pompe de căldură, energia ambientală (qH_nd - qf_h) nu se contorizează cu fP_electricitate
    // ci cu fP_ambient (1.0 per NA:2023, 0 per Mc 001 vechi)
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
    const ep_v = qf_v * FP_ELEC; // ventilare = electricitate
    const ep_l = qf_l * FP_ELEC; // iluminat = electricitate
    const ep_total = ep_h + ep_w + ep_c + ep_v + ep_l;
    const ep_total_m2 = Au > 0 ? ep_total / Au : 0;

    // CO2
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
  }, [building.areaUseful, building.volume, building.category, envelopeSummary, selectedClimate,
      heating, acm, cooling, ventilation, lighting, monthlyISO, useNA2023]);

  // ─── Auto-update solar thermal params ───
  useEffect(() => {
    const st = SOLAR_THERMAL_TYPES.find(t => t.id === solarThermal.type);
    if (st) setSolarThermal(p => ({...p, eta0: st.eta0.toString(), a1: st.a1.toString()}));
  }, [solarThermal.type]);

  // ─── Auto-update PV params ───
  useEffect(() => {
    const pv = PV_TYPES.find(t => t.id === photovoltaic.type);
    if (pv && photovoltaic.area) {
      const kWp = (parseFloat(photovoltaic.area) || 0) * pv.eta;
      setPhotovoltaic(p => ({...p, peakPower: kWp.toFixed(2)}));
    }
  }, [photovoltaic.type, photovoltaic.area]);

  useEffect(() => {
    const inv = PV_INVERTER_ETA.find(t => t.id === photovoltaic.inverterType);
    if (inv) setPhotovoltaic(p => ({...p, inverterEta: inv.eta.toString()}));
  }, [photovoltaic.inverterType]);

  // ─── Renewable energy summary ───
  const renewSummary = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au || !selectedClimate || !instSummary) return null;

    // SOLAR THERMAL
    let qSolarTh = 0;
    if (solarThermal.enabled) {
      const area = parseFloat(solarThermal.area) || 0;
      const eta0 = parseFloat(solarThermal.eta0) || 0.75;
      const oriF = ORIENT_FACTORS[solarThermal.orientation] || 1;
      const tiltF = TILT_FACTORS[solarThermal.tilt] || 1;
      const solarIrrad = selectedClimate.solar[solarThermal.orientation] || selectedClimate.solar.S;
      // Producție anuală cu eficiență sezoniera conform EN 12975 / SR EN ISO 9806
      // eta_seasonal = eta0 - a1 * ΔT / G_ref, unde G_ref = iradianță medie în ore de funcționare
      // România: ~1300-1500 ore/an de funcționare colector (ore cu G > 100 W/m²)
      // Conversia: solarIrrad [kWh/(m²·an)] / peak_sun_hours → G_ref [kW/m²] × 1000 = [W/m²]
      const a1 = parseFloat(solarThermal.a1) || 3.5;
      const deltaT = 40; // K — diferență medie fluidul colectorului față de exterior (EN 12975 §B.1)
      const peakSunHours = 1400; // ore/an pentru România (medie multi-zonă), corect față de 365*8=2920 greșit
      const gRef = solarIrrad > 0 ? (solarIrrad / peakSunHours) * 1000 : 300; // W/m² iradianță medie operare
      const etaSeasonal = Math.max(0.15, eta0 - a1 * deltaT / Math.max(gRef, 100));
      qSolarTh = area * etaSeasonal * solarIrrad * oriF * tiltF * 0.85;
    }

    // FOTOVOLTAIC
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
      // PR = performance ratio ~0.80
      qPV_kWh = area * etaPV * etaInv * solarH * oriF * tiltF * 0.80;
      qPV = qPV_kWh * FP_ELEC; // conversie energie primară (electricitate)
    }

    // POMPĂ DE CĂLDURĂ (partea regenerabilă = 1 - 1/COP)
    let qPC_ren = 0;
    if (heatPump.enabled) {
      const cop = parseFloat(heatPump.cop) || 3.5;
      const scop = parseFloat(heatPump.scopHeating) || cop * 0.85;
      const renFraction = Math.max(0, 1 - 1/scop); // fracțiunea din energie ambientală
      let qCovered = 0;
      if (heatPump.covers === "heating") qCovered = instSummary.qH_nd;
      else if (heatPump.covers === "acm") qCovered = instSummary.qACM_nd;
      else if (heatPump.covers === "heating_acm") qCovered = instSummary.qH_nd + instSummary.qACM_nd;
      qPC_ren = qCovered * renFraction;
    }

    // BIOMASĂ (parte regenerabilă = 80% din energia produsă, fP_ren=0.80)
    let qBio_ren = 0;
    let qBio_total = 0;
    if (biomass.enabled) {
      const bioType = BIOMASS_TYPES.find(t => t.id === biomass.type);
      const eta = parseFloat(biomass.boilerEta) || 0.85;
      if (biomass.annualConsumption) {
        qBio_total = (parseFloat(biomass.annualConsumption) || 0) * (bioType?.pci || 17.5) * eta / 3.6;
      } else {
        qBio_total = biomass.covers === "heating" ? instSummary.qH_nd :
                     biomass.covers === "acm" ? instSummary.qACM_nd :
                     instSummary.qH_nd + instSummary.qACM_nd;
      }
      qBio_ren = qBio_total * (bioType?.fP_ren || 0.80);
    }

    // EOLIAN
    let qWind = 0;
    if (otherRenew.windEnabled) {
      qWind = (parseFloat(otherRenew.windProduction) || 0); // kWh/an introdus direct
    }

    // COGENERARE (parte regenerabilă = proporțional cu eficiența)
    // Energia electrică CHP reduce consumul din rețea (fP=2.50), termică reduce combustibil (fP per fuel)
    let qCogen_el = 0;
    let qCogen_th = 0;
    let qCogen_ep_reduction = 0;
    let qCogen_co2_reduction = 0;
    if (otherRenew.cogenEnabled) {
      qCogen_el = parseFloat(otherRenew.cogenElectric) || 0;
      qCogen_th = parseFloat(otherRenew.cogenThermal) || 0;
      const cogenFuelData = FUELS.find(f => f.id === (otherRenew.cogenFuel || "gaz"));
      // CHP electric replaces grid electricity; thermal replaces boiler heat
      qCogen_ep_reduction = qCogen_el * FP_ELEC + qCogen_th * (cogenFuelData?.fP_tot || 1.17);
      qCogen_co2_reduction = qCogen_el * 0.107 + qCogen_th * (cogenFuelData?.fCO2 || 0.205);
    }

    const totalRenewable = qSolarTh + qPV_kWh + qPC_ren + qBio_ren + qWind + qCogen_el + qCogen_th;
    const totalRenewable_m2 = Au > 0 ? totalRenewable / Au : 0;

    // RER = Renewable Energy Ratio (toate valorile în energie primară pentru consistență)
    const fP_elec = FP_ELEC, fP_therm = 1.17;
    const totalRenewable_ep = qSolarTh * fP_therm + qPV_kWh * fP_elec + qPC_ren * fP_elec + qBio_ren * 1.08 + qWind * fP_elec + qCogen_el * fP_elec + qCogen_th * fP_therm;
    const epTotal = instSummary.ep_total || 1;
    const rer = epTotal > 0 ? (totalRenewable_ep / epTotal) * 100 : 0;
    // L.238/2024: RER decomposition — min 10% on-site + min 20% guarantees of origin
    const totalOnSite_ep = qSolarTh * fP_therm + qPV_kWh * fP_elec + qPC_ren * fP_elec + qBio_ren * 1.08 + qWind * fP_elec;
    const rerOnSite = epTotal > 0 ? (totalOnSite_ep / epTotal) * 100 : 0;
    const rerOnSiteOk = rerOnSite >= 10;
    const rerTotalOk = rer >= 30;

    // Energie primară ajustată (reducere din regenerabile)
    // Ambient energy factor depends on useNA2023 toggle
    // NA:2023 (Tabel A.16): fP=0 pentru energia ambientală a PC
    // Mc001 original (Tabel 5.17): fP=1.0 pentru energia ambientală
    const ambientFP = useNA2023 ? 0 : 1.0;
    const ep_reduction = qSolarTh * 1.0 + qPV_kWh * FP_ELEC + qPC_ren * ambientFP + qBio_ren * 1.0 + qWind * FP_ELEC + qCogen_ep_reduction;
    const ep_adjusted = Math.max(0, instSummary.ep_total - ep_reduction);
    const ep_adjusted_m2 = Au > 0 ? ep_adjusted / Au : 0;

    // CO2 reduction
    // Ambient energy CO2=0 regardless of toggle
    const acmFuelId = acm.source === "CAZAN_H" ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz") : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
    const solarThCO2Factor = (FUELS.find(f => f.id === acmFuelId) || FUELS[0]).fCO2;
    const co2_reduction = qSolarTh * solarThCO2Factor + qPV_kWh * 0.107 + qPC_ren * 0 + qWind * 0.107 + qCogen_co2_reduction;
    const co2_adjusted = Math.max(0, instSummary.co2_total - co2_reduction);
    const co2_adjusted_m2 = Au > 0 ? co2_adjusted / Au : 0;

    return {
      qSolarTh, qPV_kWh, qPC_ren, qBio_ren, qBio_total, qWind, qCogen_el, qCogen_th,
      totalRenewable, totalRenewable_m2, rer, rerOnSite, rerOnSiteOk, rerTotalOk,
      ep_reduction, ep_adjusted, ep_adjusted_m2,
      co2_reduction, co2_adjusted, co2_adjusted_m2,
    };
  }, [building.areaUseful, selectedClimate, instSummary,
      solarThermal, photovoltaic, heatPump, biomass, otherRenew, useNA2023]);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: BENCHMARK DATA
  // ═══════════════════════════════════════════════════════════
  const BENCHMARKS = {
    RI:{label:"Casă individuală",avgEp:180,avgCO2:28,bestEp:65,worstEp:450,stock:"~2.8M",avgYear:1975,nzebPct:3},
    RC:{label:"Bloc locuințe",avgEp:220,avgCO2:35,bestEp:55,worstEp:500,stock:"~50.000",avgYear:1978,nzebPct:1},
    RA:{label:"Apartament",avgEp:200,avgCO2:32,bestEp:50,worstEp:480,stock:"~4M",avgYear:1980,nzebPct:2},
    BI:{label:"Birouri",avgEp:250,avgCO2:30,bestEp:80,worstEp:550,stock:"~15.000",avgYear:1990,nzebPct:5},
    ED:{label:"Educație",avgEp:200,avgCO2:25,bestEp:70,worstEp:400,stock:"~8.000",avgYear:1970,nzebPct:2},
    SA:{label:"Sănătate",avgEp:300,avgCO2:40,bestEp:100,worstEp:600,stock:"~1.500",avgYear:1975,nzebPct:1},
    HC:{label:"Hotel/Cazare",avgEp:270,avgCO2:35,bestEp:90,worstEp:550,stock:"~3.000",avgYear:1985,nzebPct:3},
    CO:{label:"Comercial",avgEp:260,avgCO2:32,bestEp:85,worstEp:520,stock:"~12.000",avgYear:1995,nzebPct:4},
    SP:{label:"Sport",avgEp:230,avgCO2:28,bestEp:75,worstEp:480,stock:"~2.000",avgYear:1980,nzebPct:2},
    AL:{label:"Altele",avgEp:240,avgCO2:30,bestEp:80,worstEp:500,stock:"~5.000",avgYear:1985,nzebPct:3},
  };

  const avValidation = useMemo(() => {
    const Au = parseFloat(building.areaUseful)||0, V = parseFloat(building.volume)||0, Aenv = parseFloat(building.areaEnvelope)||0;
    if (!Au || !V || !Aenv) return null;
    const av = Aenv / V;
    const ranges = {RI:{min:0.6,max:1.4,label:"casă"},RC:{min:0.2,max:0.5,label:"bloc"},RA:{min:0.15,max:0.45,label:"apartament"},BI:{min:0.2,max:0.5,label:"birouri"}};
    const range = ranges[building.category] || {min:0.15,max:1.2,label:"clădire"};
    const status = av < range.min*0.7 ? "low" : av > range.max*1.3 ? "high" : "ok";
    return {av, range, status, msg: status==="low" ? `A/V=${av.toFixed(2)} — neobișnuit de mic pentru ${range.label}` : status==="high" ? `A/V=${av.toFixed(2)} — neobișnuit de mare pentru ${range.label}` : null};
  }, [building.areaUseful, building.volume, building.areaEnvelope, building.category]);

  const acmMonthlyProfile = useMemo(() => {
    if (!instSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful)||0;
    if (!Au) return null;
    const qACM = instSummary.qf_w||0, tHot = 55;
    const days = [31,28,31,30,31,30,31,31,30,31,30,31];
    const totalDD = WATER_TEMP_MONTH.reduce((s,tw,i) => s+(tHot-tw)*days[i], 0);
    return ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"].map((name,i) => {
      const tw = WATER_TEMP_MONTH[i];
      const frac = totalDD > 0 ? ((tHot-tw)*days[i])/totalDD : 1/12;
      return {name, tw, qf: qACM*frac, frac};
    });
  }, [instSummary, selectedClimate, building.areaUseful]);

  // ─── Data completion progress ───
  const dataProgress = useMemo(() => {
    var score = 0, total = 10;
    if (building.locality) score++;
    if (parseFloat(building.areaUseful) > 0) score++;
    if (parseFloat(building.volume) > 0) score++;
    if (building.category) score++;
    if (opaqueElements.length > 0) score++;
    if (glazingElements.length > 0) score++;
    if (heating.source) score++;
    if (instSummary) score++;
    if (renewSummary) score++;
    if (auditor.name) score++;
    return Math.round(score / total * 100);
  }, [building, opaqueElements, glazingElements, heating, instSummary, renewSummary, auditor]);

  // Validare per pas — avertizare la navigare forward
  const validateStep = (currentStep) => {
    const Au = parseFloat(building.areaUseful) || 0;
    const Vol = parseFloat(building.volume) || 0;
    const warns = [];
    if (currentStep === 1) {
      if (Au <= 0) warns.push("Suprafața utilă (Au) este obligatorie");
      if (Vol <= 0) warns.push("Volumul interior este obligatoriu");
      if (!building.locality) warns.push("Selectați localitatea");
      if (!building.category) warns.push("Selectați categoria funcțională");
    } else if (currentStep === 2) {
      if (opaqueElements.length === 0) warns.push("Adăugați cel puțin un element opac");
      if (glazingElements.length === 0) warns.push("Adăugați cel puțin un element vitrat");
    } else if (currentStep === 3) {
      if (!heating.source) warns.push("Selectați sursa de încălzire");
    }
    if (warns.length > 0) {
      showToast("⚠ " + warns.join(" • "), "error", 5000);
    }
    return warns.length === 0;
  };

  // Navigare cu validare
  const goToStep = (targetStep, fromStep) => {
    if (targetStep > fromStep) {
      validateStep(fromStep); // avertizare dar nu blochează
    }
    setStep(targetStep);
  };

  // ═══════════════════════════════════════════════════════════
  // FEATURE: DEFALCARE CONSUM PE LUNI (profil climatice lunar)
  // ═══════════════════════════════════════════════════════════
  const monthlyBreakdown = useMemo(() => {
    if (!instSummary || !selectedClimate || !envelopeSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
    const tInt = parseFloat(heating.theta_int) || 20;
    const gains_m2 = { RI:7, RC:7, RA:7, BI:15, ED:12, SA:10, HC:8, CO:15, SP:10, AL:10 }[building.category] || 7;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const etaH = instSummary.eta_total_h || 0.80;
    const fuel = instSummary.fuel;
    const fP = fuel?.fP_tot || 1.17;
    // C5 FIX: use monthlyISO data when available instead of simplified recalculation
    return months.map((name, i) => {
      const tExt = selectedClimate.temp_month[i];
      const deltaT = Math.max(0, tInt - tExt);
      let qf_h, qf_c;
      if (monthlyISO && monthlyISO[i]) {
        qf_h = etaH > 0 ? monthlyISO[i].qH_nd / etaH : 0;
        qf_c = instSummary.hasCool && monthlyISO[i].qC_nd > 0 ? monthlyISO[i].qC_nd / (parseFloat(cooling.eer) || 3.5) : 0;
      } else {
        const qH_month = deltaT > 3 ? Math.max(0, (24 * envelopeSummary.G * V * deltaT * daysInMonth[i] / 1000) - (gains_m2 * Au * daysInMonth[i] / 365)) : 0;
        qf_h = etaH > 0 ? qH_month / etaH : 0;
        qf_c = tExt > 22 && instSummary.hasCool ? (instSummary.qf_c || 0) * (tExt - 22) / 15 : 0;
      }
      const qf_w = (instSummary.qf_w || 0) / 12;
      const qf_v = (instSummary.qf_v || 0) * daysInMonth[i] / 365;
      const qf_l = (instSummary.qf_l || 0) * daysInMonth[i] / 365;
      const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l;
      const acmFuel = acm.source === "CAZAN_H" ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz") : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
      const fP_acm = (FUELS.find(f => f.id === acmFuel) || FUELS[0]).fP_tot;
      const ep = qf_h * fP + qf_w * fP_acm + qf_c * FP_ELEC + qf_v * FP_ELEC + qf_l * FP_ELEC;
      return { name, tExt, deltaT, qf_h, qf_w, qf_c, qf_v, qf_l, qf_total, ep, daysInMonth: daysInMonth[i] };
    });
  }, [instSummary, selectedClimate, envelopeSummary, building.areaUseful, building.volume, building.category, heating.theta_int, monthlyISO, cooling.eer]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: COMPARAȚIE SCENARII (actual vs reabilitat)
  // ═══════════════════════════════════════════════════════════
  const [showScenarioCompare, setShowScenarioCompare] = useState(false);
  // #10 Comparare proiecte — import referință pentru comparație
  const [compareRef, setCompareRef] = useState(null);
  const importCompareRef = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.building && data.building.areaUseful) {
          setCompareRef({
            name: data.building.address || file.name,
            category: data.building.category,
            Au: parseFloat(data.building.areaUseful) || 0,
            ep: data.instSummary?.ep_total_m2 || data.renewSummary?.ep_adjusted_m2 || 0,
            co2: data.instSummary?.co2_total_m2 || data.renewSummary?.co2_adjusted_m2 || 0,
            rer: data.renewSummary?.rer || 0,
            G: data.envelopeSummary?.G || 0,
            qf_total: data.instSummary?.qf_total || 0,
          });
          showToast("Proiect referință importat pentru comparație", "success");
        } else {
          showToast("Fișierul nu conține date valide", "error");
        }
      } catch(err) { showToast("Eroare parsare JSON: " + err.message, "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  // ─── Multi-scenario presets ───
  const SCENARIO_PRESETS = [
    { id:"MINIM", label:"Minim (obligatoriu)", addInsulWall:true, insulWallThickness:"5", addInsulRoof:true, insulRoofThickness:"8", addInsulBasement:false, insulBasementThickness:"0", replaceWindows:false, newWindowU:"1.40", addHR:false, hrEfficiency:"0", addPV:false, pvArea:"0", addHP:false, hpCOP:"3.5", addSolarTh:false, solarThArea:"0" },
    { id:"MEDIU", label:"Mediu (recomandat)", addInsulWall:true, insulWallThickness:"10", addInsulRoof:true, insulRoofThickness:"15", addInsulBasement:true, insulBasementThickness:"8", replaceWindows:true, newWindowU:"0.90", addHR:true, hrEfficiency:"80", addPV:true, pvArea:"20", addHP:false, hpCOP:"4.0", addSolarTh:true, solarThArea:"6" },
    { id:"MAXIM", label:"Maxim (nZEB)", addInsulWall:true, insulWallThickness:"15", addInsulRoof:true, insulRoofThickness:"25", addInsulBasement:true, insulBasementThickness:"12", replaceWindows:true, newWindowU:"0.70", addHR:true, hrEfficiency:"90", addPV:true, pvArea:"40", addHP:true, hpCOP:"4.5", addSolarTh:true, solarThArea:"10" },
  ];
  const [activeScenario, setActiveScenario] = useState("MEDIU");
  const loadScenarioPreset = useCallback((presetId) => {
    var p = SCENARIO_PRESETS.find(function(s){ return s.id === presetId; });
    if (!p) return;
    setActiveScenario(presetId);
    setRehabScenarioInputs({
      addInsulWall:p.addInsulWall, insulWallThickness:p.insulWallThickness,
      addInsulRoof:p.addInsulRoof, insulRoofThickness:p.insulRoofThickness,
      addInsulBasement:p.addInsulBasement, insulBasementThickness:p.insulBasementThickness,
      replaceWindows:p.replaceWindows, newWindowU:p.newWindowU,
      addHR:p.addHR, hrEfficiency:p.hrEfficiency,
      addPV:p.addPV, pvArea:p.pvArea,
      addHP:p.addHP, hpCOP:p.hpCOP,
      addSolarTh:p.addSolarTh, solarThArea:p.solarThArea,
    });
  }, []);

  const [rehabScenarioInputs, setRehabScenarioInputs] = useState({
    addInsulWall: true, insulWallThickness: "5",
    addInsulRoof: true, insulRoofThickness: "10",
    addInsulBasement: true, insulBasementThickness: "8",
    replaceWindows: false, newWindowU: "0.90",
    addHR: true, hrEfficiency: "80",
    addPV: true, pvArea: "20",
    addHP: false, hpCOP: "4.0",
    addSolarTh: true, solarThArea: "6",
  });

  const rehabComparison = useMemo(() => {
    if (!instSummary || !envelopeSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const ri = rehabScenarioInputs;
    const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
    const ngz = selectedClimate?.ngz || 3170;
    let newHT = envelopeSummary.totalHeatLoss;
    if (ri.addInsulWall) {
      const addR = (parseFloat(ri.insulWallThickness) / 100) / 0.039;
      opaqueElements.forEach(el => {
        if (el.type === "PE") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.addInsulRoof) {
      const addR = (parseFloat(ri.insulRoofThickness) / 100) / 0.040;
      opaqueElements.forEach(el => {
        if (el.type === "PP" || el.type === "PT") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.addInsulBasement) {
      const addR = (parseFloat(ri.insulBasementThickness) / 100) / 0.034;
      opaqueElements.forEach(el => {
        if (el.type === "PB" || el.type === "PL") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.replaceWindows) {
      const newU = parseFloat(ri.newWindowU) || 0.90;
      glazingElements.forEach(el => { newHT -= (parseFloat(el.area)||0) * ((parseFloat(el.u)||1.5) - newU); });
    }
    let newVentLoss = envelopeSummary.ventLoss;
    if (ri.addHR) { newVentLoss = envelopeSummary.ventLoss * (1 - (parseFloat(ri.hrEfficiency)||80)/100); }
    const newG = V > 0 ? (newHT + newVentLoss) / V : 0;
    const gains = { RI:7, RC:7, RA:7, BI:15, ED:12, SA:10, HC:8, CO:15, SP:10, AL:10 }[building.category] || 7;
    const newQH = Math.max(0, (24 * newG * V * 0.9 * ngz / 1000) - gains * Au);
    let newQfH, newFuelFpH, newFuelCO2H;
    if (ri.addHP) {
      const cop = parseFloat(ri.hpCOP) || 4.0;
      newQfH = newQH / cop; newFuelFpH = FP_ELEC; newFuelCO2H = 0.107;
    } else {
      const etaH = instSummary.eta_total_h || 0.80;
      newQfH = etaH > 0 ? newQH / etaH : 0;
      newFuelFpH = instSummary.fuel?.fP_tot || 1.17; newFuelCO2H = instSummary.fuel?.fCO2 || 0.20;
    }
    const newQfW = instSummary.qf_w, newQfC = instSummary.qf_c;
    // B2 FIX: HR reduce pierderile de ventilare; fan energy se adaugă doar dacă era ventilare naturală
    const hasExistingMech = ventilation.type && ventilation.type !== "NAT";
    const newQfV = ri.addHR
      ? (hasExistingMech ? instSummary.qf_v * 0.85 : Au * 1.5 / 1000 * (selectedClimate?.season || 190) * 16 / 3600)
      : instSummary.qf_v;
    const newQfL = instSummary.qf_l;
    const newQfTotal = newQfH + newQfW + newQfC + newQfV + newQfL;
    const acmFp = ri.addHP ? FP_ELEC : (instSummary.fuel?.fP_tot || 1.17);
    const newEp = newQfH * newFuelFpH + newQfW * acmFp + newQfC * FP_ELEC + newQfV * FP_ELEC + newQfL * FP_ELEC;
    let renewEp = 0;
    if (ri.addPV) { renewEp += (parseFloat(ri.pvArea)||0) * 0.21 * 0.97 * (selectedClimate?.solar?.Oriz||330) * 0.80 * FP_ELEC; }
    if (ri.addSolarTh) { renewEp += (parseFloat(ri.solarThArea)||0) * 0.75 * (selectedClimate?.solar?.S||390) * 0.85; }
    const newEpM2 = Au > 0 ? Math.max(0, newEp - renewEp) / Au : 0;
    const newClass = getEnergyClassEPBD(newEpM2, catKey);
    const newCO2M2 = Au > 0 ? (newQfH * newFuelCO2H + newQfW * (ri.addHP?0.107:(instSummary.fuel?.fCO2||0.20)) + (newQfC+newQfV+newQfL)*0.107) / Au : 0;
    const epOrig = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
    const co2Orig = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
    return {
      original: { ep: epOrig, co2: co2Orig, cls: getEnergyClassEPBD(epOrig, catKey), qfTotal: instSummary.qf_total },
      rehab: { ep: newEpM2, co2: newCO2M2, cls: newClass, qfTotal: newQfTotal },
      savings: { epPct: epOrig>0?((epOrig-newEpM2)/epOrig*100):0, co2Pct: co2Orig>0?((co2Orig-newCO2M2)/co2Orig*100):0, qfSaved: instSummary.qf_total - newQfTotal },
    };
  }, [instSummary, envelopeSummary, building, cooling, selectedClimate, rehabScenarioInputs, opaqueElements, glazingElements, renewSummary, calcOpaqueR]);

  // ═══════════════════════════════════════════════════════════════
  // CALCUL CONDENS GLASER — per element opac selectat
  // TODO-GLASER-UI: Adaugă diagramă Glaser vizuală (profil temp + presiune vapori) în Step 2 sau Step 5
  // ═══════════════════════════════════════════════════════════════
  const [glaserElementIdx, setGlaserElementIdx] = useState(0);
  const glaserResult = useMemo(() => {
    if (!selectedClimate || !opaqueElements.length) return null;
    const el = opaqueElements[glaserElementIdx] || opaqueElements[0];
    if (!el || !el.layers || !el.layers.length) return null;
    return calcGlaserMonthly(el.layers, selectedClimate, parseFloat(heating.theta_int) || 20, 50);
  }, [opaqueElements, glaserElementIdx, selectedClimate, heating.theta_int]);

  // ═══════════════════════════════════════════════════════════════
  // VERIFICARE ZEB (EPBD 2024/1275) — pregătire transpunere
  // TODO-ZEB-UI: Adaugă secțiune vizuală verificare ZEB în Step 5/6 cu indicator verde/roșu
  // ═══════════════════════════════════════════════════════════════
  const zebVerification = useMemo(() => {
    if (!instSummary || !renewSummary) return null;
    const cat = building.category;
    const zeb = ZEB_THRESHOLDS[cat];
    const nzeb = NZEB_THRESHOLDS[cat];
    if (!zeb || !nzeb) return null;
    const epActual = renewSummary.ep_adjusted_m2;
    const rerActual = renewSummary.rer;
    const src = HEAT_SOURCES.find(s => s.id === heating.source);
    const isFossil = src && !src.isCOP && ["gaz","motorina","carbune","gpl"].includes(src.fuel);
    return {
      nzeb: {
        epOk: epActual <= getNzebEpMax(building.category, selectedClimate?.zone),
        rerOk: rerActual >= nzeb.rer_min,
        rerOnsiteOk: renewSummary.rerOnSite >= nzeb.rer_onsite_min,
        compliant: epActual <= getNzebEpMax(building.category, selectedClimate?.zone) && rerActual >= nzeb.rer_min,
        ep_max: getNzebEpMax(building.category, selectedClimate?.zone),
      },
      zeb: {
        epOk: epActual <= zeb.ep_max,
        rerOk: rerActual >= zeb.rer_min,
        noFossil: !isFossil,
        compliant: epActual <= zeb.ep_max && rerActual >= zeb.rer_min && !isFossil,
        ep_max: zeb.ep_max,
        deadline: ["BI","ED","SA"].includes(cat) ? "01.01.2028 (clădiri publice)" : "01.01.2030",
      },
      epActual: Math.round(epActual * 10) / 10,
      rerActual: Math.round(rerActual * 10) / 10,
    };
  }, [instSummary, renewSummary, building.category, heating.source]);

  // ═══════════════════════════════════════════════════════════════
  // ANALIZĂ FINANCIARĂ REABILITARE — calcul NPV/IRR/Payback
  // TODO-FIN-UI: Adaugă tab dedicat în Step 7 cu grafice cashflow, tabel indicatori, analiză sensibilitate
  // ═══════════════════════════════════════════════════════════════
  const financialAnalysis = useMemo(() => {
    if (!rehabComparison || !instSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au) return null;
    const ri = rehabScenarioInputs;

    // Estimare cost investiție
    let totalInvest = 0;
    if (ri.addInsulWall) {
      const wallArea = opaqueElements.filter(e => e.type === "PE").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulWall[ri.insulWallThickness] || REHAB_COSTS.insulWall[10] || 42;
      totalInvest += wallArea * unitCost;
    }
    if (ri.addInsulRoof) {
      const roofArea = opaqueElements.filter(e => e.type === "PP" || e.type === "PT").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulRoof[ri.insulRoofThickness] || REHAB_COSTS.insulRoof[10] || 32;
      totalInvest += roofArea * unitCost;
    }
    if (ri.addInsulBasement) {
      const baseArea = opaqueElements.filter(e => e.type === "PB" || e.type === "PL").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulBasement[ri.insulBasementThickness] || REHAB_COSTS.insulBasement[8] || 45;
      totalInvest += baseArea * unitCost;
    }
    if (ri.replaceWindows) {
      const winArea = glazingElements.reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.windows[ri.newWindowU] || REHAB_COSTS.windows[0.90] || 280;
      totalInvest += winArea * unitCost;
    }
    if (ri.addHR) {
      const hrEff = parseFloat(ri.hrEfficiency) || 80;
      totalInvest += hrEff >= 90 ? REHAB_COSTS.hr90 : hrEff >= 80 ? REHAB_COSTS.hr80 : REHAB_COSTS.hr70;
    }
    if (ri.addPV) totalInvest += (parseFloat(ri.pvArea) || 0) * REHAB_COSTS.pvPerM2;
    if (ri.addHP) totalInvest += Math.max(5, Au / 25) * REHAB_COSTS.hpPerKw;
    if (ri.addSolarTh) totalInvest += (parseFloat(ri.solarThArea) || 0) * REHAB_COSTS.solarThPerM2;

    // Economie anuală energie [EUR]
    const savedKwh = rehabComparison.savings.qfSaved;
    const fuel = instSummary.fuel;
    const priceLeiKwh = fuel?.price_lei_kwh || 0.31;
    const annualSavingEur = (savedKwh * priceLeiKwh) / 5.0; // ~5 lei/EUR

    return calcFinancialAnalysis({
      investCost: Math.round(totalInvest),
      annualSaving: Math.round(annualSavingEur),
      annualMaint: parseFloat(finAnalysisInputs.annualMaint) || 200,
      discountRate: parseFloat(finAnalysisInputs.discountRate) || 5,
      escalation: parseFloat(finAnalysisInputs.escalation) || 3,
      period: parseInt(finAnalysisInputs.period) || 30,
      residualValue: parseFloat(finAnalysisInputs.residualValue) || 0,
    });
  }, [rehabComparison, instSummary, building.areaUseful, rehabScenarioInputs, opaqueElements, glazingElements, finAnalysisInputs]);

  // ═══════════════════════════════════════════════════════════════
  // ESTIMARE COST ANUAL ENERGIE (cu prețuri 2025)
  // TODO-COST-UI: Afișare card cost anual în Step 5 cu defalcare pe utilități și grafic pie
  // ═══════════════════════════════════════════════════════════════
  const annualEnergyCost = useMemo(() => {
    if (!instSummary) return null;
    const fuel = instSummary.fuel;
    const priceFuel = fuel?.price_lei_kwh || 0.31;
    const priceElec = FUELS.find(f => f.id === "electricitate")?.price_lei_kwh || 1.10;
    const costH = instSummary.qf_h * priceFuel;
    const costW = instSummary.qf_w * (instSummary.isCOP ? priceElec : priceFuel);
    const costC = instSummary.qf_c * priceElec;
    const costV = instSummary.qf_v * priceElec;
    const costL = instSummary.qf_l * priceElec;
    const total = costH + costW + costC + costV + costL;
    return {
      costH: Math.round(costH), costW: Math.round(costW),
      costC: Math.round(costC), costV: Math.round(costV),
      costL: Math.round(costL), total: Math.round(total),
      totalEur: Math.round(total / 5.0),
      priceFuel, priceElec,
      note: "Prețuri 2025: gaz plafonat 0.31 lei/kWh, elec. ~1.10 lei/kWh",
    };
  }, [instSummary]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: BACS verification (A5)
  // ═══════════════════════════════════════════════════════════════
  const bacsCheck = useMemo(() => {
    const power = parseFloat(heating.power) || 0;
    const isRequired = power >= BACS_OBLIGATION_THRESHOLD_KW && !["RI","RA"].includes(building.category);
    const cls = BACS_CLASSES[bacsClass];
    return { isRequired, bacsClass, factor: cls?.factor || 1, label: cls?.label || "—", desc: cls?.desc || "",
      recommendation: isRequired && bacsClass === "D" ? "Obligatoriu upgrade la clasa C sau mai bun (EPBD Art.14)" : null };
  }, [heating.power, building.category, bacsClass]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: EV Charger calculation (A6)
  // ═══════════════════════════════════════════════════════════════
  const evChargerCalc = useMemo(() => {
    const spots = parseInt(building.parkingSpaces) || 0;
    if (spots <= 0) return null;
    const isNew = building.scopCpe === "constructie_noua";
    const isMajorRenov = building.scopCpe === "reabilitare";
    return calcEVChargers(spots, building.category, isNew, isMajorRenov);
  }, [building.parkingSpaces, building.category, building.scopCpe]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Solar-ready checklist (A7)
  // ═══════════════════════════════════════════════════════════════
  const solarReadyCheck = useMemo(() => {
    return checkSolarReady(building, { pv: photovoltaic, solarThermal });
  }, [building.solarReady, photovoltaic.enabled, solarThermal.enabled]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Air infiltration (A8)
  // ═══════════════════════════════════════════════════════════════
  const airInfiltrationCalc = useMemo(() => {
    const n50 = parseFloat(building.n50) || 0;
    const V = parseFloat(building.volume) || 0;
    const Aenv = parseFloat(building.areaEnvelope) || 0;
    return calcAirInfiltration(n50, V, Aenv);
  }, [building.n50, building.volume, building.areaEnvelope]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Natural lighting (A10)
  // ═══════════════════════════════════════════════════════════════
  const naturalLightingCalc = useMemo(() => {
    return calcNaturalLighting(glazingElements, parseFloat(building.areaUseful) || 0);
  }, [glazingElements, building.areaUseful]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: GWP Lifecycle detailed (A4)
  // ═══════════════════════════════════════════════════════════════
  const gwpDetailed = useMemo(() => {
    return calcGWPDetailed(opaqueElements, glazingElements, parseFloat(building.areaUseful) || 0, 50);
  }, [opaqueElements, glazingElements, building.areaUseful]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Smart rehab suggestions (E5)
  // ═══════════════════════════════════════════════════════════════
  const smartSuggestions = useMemo(() => {
    return calcSmartRehab(building, instSummary, renewSummary, opaqueElements, glazingElements, selectedClimate);
  }, [building, instSummary, renewSummary, opaqueElements, glazingElements, selectedClimate]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Summer comfort per-element (A1)
  // ═══════════════════════════════════════════════════════════════
  const summerComfortResults = useMemo(() => {
    if (!selectedClimate || !opaqueElements.length) return [];
    return opaqueElements.map(el => {
      const result = calcSummerComfort(el.layers, selectedClimate, el.orientation || "S");
      return { name: el.name, type: el.type, orientation: el.orientation || "S", ...result };
    });
  }, [opaqueElements, selectedClimate]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: Sankey data (C2)
  // ═══════════════════════════════════════════════════════════════
  const sankeyData = useMemo(() => {
    if (!instSummary) return null;
    const Au = parseFloat(building.areaUseful) || 1;
    const totalLoss = (envelopeSummary?.totalLoss || 0) + (instSummary.qf_v || 0);
    const solarGain = monthlyISO ? monthlyISO.reduce((s,m) => s + (m?.qSol || 0), 0) / Au : 0;
    const intGain = monthlyISO ? monthlyISO.reduce((s,m) => s + (m?.qInt || 0), 0) / Au : 0;
    return {
      inputs: [
        { label:"Încălzire", value: instSummary.qf_h / Au, color:"#ef4444" },
        { label:"ACM", value: instSummary.qf_w / Au, color:"#f97316" },
        { label:"Câștiguri solare", value: solarGain, color:"#eab308" },
        { label:"Câștiguri interne", value: intGain, color:"#84cc16" },
        ...(instSummary.qf_c > 0 ? [{ label:"Răcire", value: instSummary.qf_c / Au, color:"#3b82f6" }] : []),
        { label:"Ventilare", value: instSummary.qf_v / Au, color:"#8b5cf6" },
        { label:"Iluminat", value: instSummary.qf_l / Au, color:"#eab308" },
      ].filter(x => x.value > 0),
      losses: [
        { label:"Transmisie pereți", value: (envelopeSummary?.wallLoss || totalLoss * 0.35), color:"#ef4444" },
        { label:"Transmisie ferestre", value: (envelopeSummary?.windowLoss || totalLoss * 0.25), color:"#f97316" },
        { label:"Transmisie acoperiș", value: (envelopeSummary?.roofLoss || totalLoss * 0.15), color:"#eab308" },
        { label:"Transmisie sol", value: (envelopeSummary?.floorLoss || totalLoss * 0.10), color:"#84cc16" },
        { label:"Ventilare/infiltrații", value: instSummary.qf_v / Au, color:"#8b5cf6" },
        { label:"Punți termice", value: (envelopeSummary?.bridgeLoss || totalLoss * 0.15), color:"#ef4444" },
      ].filter(x => x.value > 0),
    };
  }, [instSummary, envelopeSummary, building.areaUseful, monthlyISO]);

  // ═══════════════════════════════════════════════════════════
  // B1: EXPORT XML MDLPA — Registru electronic CPE
  // ═══════════════════════════════════════════════════════════
  const exportXML = useCallback(() => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5) înainte de export XML.", "error"); return; }
    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
    const cls = getEnergyClassEPBD(epF, catKey);
    const rer = renewSummary?.rer || 0;
    const Au = parseFloat(building.areaUseful) || 0;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CPE_RegistruElectronic xmlns="urn:ro:mdlpa:certificat-performanta-energetica:2023" version="1.0">
  <MetaDate>
    <FormatVersiune>Mc001-2022</FormatVersiune>
    <DataExport>${new Date().toISOString()}</DataExport>
    <Software>Zephren v3.0</Software>
    <NormativCalcul>SR EN ISO 52000-1:2017/NA:2023</NormativCalcul>
  </MetaDate>
  <Cladire>
    <Adresa>${building.address || ""}</Adresa>
    <Localitate>${building.city || ""}</Localitate>
    <Judet>${building.county || ""}</Judet>
    <CodPostal>${building.postal || ""}</CodPostal>
    <NrCadastral>${auditor.nrCadastral || ""}</NrCadastral>
    <CategorieClase>${building.category || "RI"}</CategorieClase>
    <CategorieFunctionala>${BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || ""}</CategorieFunctionala>
    <AnConstructie>${building.yearBuilt || ""}</AnConstructie>
    <AnReabilitare>${building.yearRenov || ""}</AnReabilitare>
    <SuprafataUtila unit="m2">${Au}</SuprafataUtila>
    <VolumIncalzit unit="m3">${building.volume || ""}</VolumIncalzit>
    <SuprafataAnvelopa unit="m2">${building.areaEnvelope || ""}</SuprafataAnvelopa>
    <ZonaClimatica>${selectedClimate?.zone || ""}</ZonaClimatica>
    <TemperaturaExterioara unit="C">${selectedClimate?.theta_e || ""}</TemperaturaExterioara>
    <GradeZile>${selectedClimate?.ngz || ""}</GradeZile>
  </Cladire>
  <Anvelopa>
    <CoeficientGlobal unit="W/(m3·K)">${envelopeSummary?.G?.toFixed(4) || ""}</CoeficientGlobal>
    <ElementeOpace>${opaqueElements.map(el => {
      const rL = (el.layers||[]).reduce((s,l) => { const d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0); }, 0);
      const uVal = rL > 0 ? (1/(0.13+rL+0.04)) : 0;
      return `\n      <Element tip="${el.type}" suprafata="${el.area}" U="${uVal.toFixed(3)}" denumire="${el.name || ""}"/>`;
    }).join("")}
    </ElementeOpace>
    <ElementeVitrate>${glazingElements.map(el => `\n      <Element suprafata="${el.area}" U="${el.u}" g="${el.g}" orientare="${el.orientation}" denumire="${el.name || ""}"/>`).join("")}
    </ElementeVitrate>
    <PuntiTermice>${thermalBridges.map(b => `\n      <Punte psi="${b.psi}" lungime="${b.length}" denumire="${b.name || ""}"/>`).join("")}
    </PuntiTermice>
  </Anvelopa>
  <Instalatii>
    <Incalzire sursa="${heating.source}" randament="${instSummary.eta_total_h?.toFixed(2) || ""}" combustibil="${instSummary.fuel?.id || ""}"/>
    <ACM sursa="${acm.source}"/>
    <Climatizare activa="${cooling.hasCooling}" EER="${cooling.eer || ""}"/>
    <Ventilare tip="${ventilation.type}" recuperare="${ventilation.hrEfficiency || "0"}"/>
    <Iluminat tip="${lighting.type}" LENI="${instSummary.leni?.toFixed(1) || ""}"/>
  </Instalatii>
  <Regenerabile>
    <RER unit="%">${rer.toFixed(1)}</RER>
    <RER_OnSite unit="%">${(renewSummary?.rerOnSite || 0).toFixed(1)}</RER_OnSite>
    <PV activ="${photovoltaic.enabled}" putere_kWp="${photovoltaic.peakPower || "0"}"/>
    <SolarTermic activ="${solarThermal.enabled}" suprafata="${solarThermal.area || "0"}"/>
    <PompaCaldura activ="${heatPump.enabled}" COP="${heatPump.cop || ""}"/>
    <Biomasa activ="${biomass.enabled}" tip="${biomass.type || ""}"/>
  </Regenerabile>
  <BilanțEnergetic>
    <EnergieFinala unit="kWh/an">${instSummary.qf_total?.toFixed(1) || ""}</EnergieFinala>
    <EnergieFinalaSpecifica unit="kWh/(m2·an)">${instSummary.qf_total_m2?.toFixed(1) || ""}</EnergieFinalaSpecifica>
    <EnergiePrimara unit="kWh/an">${(renewSummary?.ep_adjusted || instSummary.ep_total || 0).toFixed(1)}</EnergiePrimara>
    <EnergiePrimaraSpecifica unit="kWh/(m2·an)">${epF.toFixed(1)}</EnergiePrimaraSpecifica>
    <EmisiiCO2 unit="kgCO2/(m2·an)">${co2F.toFixed(1)}</EmisiiCO2>
    <ClasaEnergetica>${cls.cls}</ClasaEnergetica>
    <NotaEnergetica>${cls.score}</NotaEnergetica>
    <ConformNZEB>${epF <= (getNzebEpMax(building.category, selectedClimate?.zone) || 999) && rer >= (NZEB_THRESHOLDS[building.category]?.rer_min || 30)}</ConformNZEB>
  </BilanțEnergetic>
  <Auditor>
    <Nume>${auditor.name || ""}</Nume>
    <GradAtestat>${auditor.grade || ""}</GradAtestat>
    <NrAtestat>${auditor.atestat || ""}</NrAtestat>
    <Firma>${auditor.company || ""}</Firma>
    <DataElaborare>${auditor.date || ""}</DataElaborare>
    <ScopCPE>${auditor.scopCpe || ""}</ScopCPE>
    <DurataValabilitate ani="${auditor.validityYears || "10"}"/>
    <CodUnicMDLPA>${auditor.codUnicMDLPA || ""}</CodUnicMDLPA>
  </Auditor>
</CPE_RegistruElectronic>`;
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CPE_XML_${(building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.xml`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
    showToast("XML MDLPA exportat cu succes", "success");
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, auditor, instSummary, renewSummary, envelopeSummary, selectedClimate, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B5: QR CODE SVG — Generare QR simplu pentru certificat
  // ═══════════════════════════════════════════════════════════
  const generateQRCodeSVG = useCallback((text, size) => {
    // Simple QR-like pattern generator (visual representation, not scannable)
    // For a real QR, would need a library like qrcode.js
    size = size || 100;
    const cells = 21; // QR version 1 is 21x21
    const cellSize = size / cells;
    const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
    const seed = hash(text || "zephren");
    const rects = [];
    // Finder patterns (3 corners)
    const addFinder = (ox, oy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const on = (y===0||y===6||x===0||x===6) || (y>=2&&y<=4&&x>=2&&x<=4);
        if (on) rects.push(`<rect x="${(ox+x)*cellSize}" y="${(oy+y)*cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`);
      }
    };
    addFinder(0, 0); addFinder(cells-7, 0); addFinder(0, cells-7);
    // Data modules (pseudo-random based on text hash)
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      if ((x<8&&y<8)||(x>=cells-8&&y<8)||(x<8&&y>=cells-8)) continue; // skip finder areas
      if ((seed * (y*cells+x+1)) % 3 === 0) {
        rects.push(`<rect x="${x*cellSize}" y="${y*cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`);
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#fff"/>${rects.join("")}</svg>`;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // B3: EXPORT PDF NATIV — Generare PDF simplu din HTML
  // ═══════════════════════════════════════════════════════════
  const exportPDFNative = useCallback(async () => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
    try {
      setExporting("pdf");
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
      const cls = getEnergyClassEPBD(epF, catKey);
      const co2Cls = getCO2Class(co2F, building.category);
      const rer = renewSummary?.rer || 0;
      const Au = parseFloat(building.areaUseful) || 0;
      const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
      const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
      const w = doc.internal.pageSize.getWidth();
      let y = 15;

      // Title
      doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("CERTIFICAT DE PERFORMANTA ENERGETICA", w/2, y, { align: "center" }); y += 6;
      doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(100);
      doc.text("conform Mc 001-2022 (Ordinul MDLPA nr. 16/2023)", w/2, y, { align: "center" }); y += 10;

      // Section 1: Building identification
      doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("1. Identificare cladire", 15, y); y += 2;
      doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5); doc.line(15, y, w-15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
        body: [
          ["Adresa", `${building.address || "-"}, ${building.city || "-"}, jud. ${building.county || "-"}`],
          ["Categorie functionala", BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || building.category],
          ["An constructie / renovare", `${building.yearBuilt || "-"} / ${building.yearRenov || "-"}`],
          ["Suprafata utila incalzita", `${Au} m\u00B2`],
          ["Volum incalzit", `${building.volume || "-"} m\u00B3`],
          ["Zona climatica", `${selectedClimate?.name || "-"} - Zona ${selectedClimate?.zone || "-"} (\u03B8e = ${selectedClimate?.theta_e || "-"}\u00B0C)`],
        ],
      });
      y = doc.lastAutoTable.finalY + 8;

      // Section 2: Energy classification
      doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("2. Clasare energetica", 15, y); y += 2;
      doc.line(15, y, w-15, y); y += 6;

      // Energy class box
      const hexToRgb = (h) => { const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16); return [r,g,b]; };
      const clsRgb = hexToRgb(cls.color || "#666666");
      doc.setFillColor(...clsRgb); doc.roundedRect(w/2 - 30, y, 24, 24, 4, 4, "F");
      doc.setFontSize(22); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text(cls.cls, w/2 - 18, y + 16, { align: "center" });

      const co2Rgb = hexToRgb(co2Cls.color || "#666666");
      doc.setFillColor(...co2Rgb); doc.roundedRect(w/2 + 6, y, 24, 24, 4, 4, "F");
      doc.setFontSize(10); doc.text("CO2", w/2 + 18, y + 10, { align: "center" });
      doc.setFontSize(16); doc.text(co2Cls.cls, w/2 + 18, y + 20, { align: "center" });
      y += 30;

      // KPIs
      doc.setTextColor(0); doc.setFontSize(14); doc.setFont(undefined, "bold");
      doc.text(`${epF.toFixed(1)}`, 40, y, { align: "center" });
      doc.text(`${co2F.toFixed(1)}`, w/2, y, { align: "center" });
      doc.text(`${rer.toFixed(0)}%`, w - 40, y, { align: "center" }); y += 4;
      doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(100);
      doc.text("kWh/(m\u00B2\u00B7an) EP", 40, y, { align: "center" });
      doc.text("kgCO\u2082/(m\u00B2\u00B7an)", w/2, y, { align: "center" });
      doc.text(`RER (min ${nzeb.rer_min}%)`, w - 40, y, { align: "center" }); y += 6;

      // nZEB badge
      doc.setFontSize(9); doc.setFont(undefined, "bold");
      if (isNZEB) { doc.setTextColor(21, 87, 36); doc.text("\u2713 nZEB CONFORM", w/2, y, { align: "center" }); }
      else { doc.setTextColor(114, 28, 36); doc.text("\u2717 nZEB NECONFORM", w/2, y, { align: "center" }); }
      y += 3;
      doc.setTextColor(40, 53, 147); doc.setFont(undefined, "normal"); doc.setFontSize(8);
      doc.text(`Nota: ${cls.score}/100`, w/2, y, { align: "center" }); y += 8;

      // Section 3: Consumption table
      doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("3. Consum si costuri", 15, y); y += 2;
      doc.line(15, y, w-15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Utilitate", "Energie finala [kWh/an]", "Energie primara [kWh/an]"]],
        headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        body: [
          ["Incalzire", instSummary.qf_h?.toFixed(0)||"-", instSummary.ep_h?.toFixed(0)||"-"],
          ["Apa calda", instSummary.qf_w?.toFixed(0)||"-", instSummary.ep_w?.toFixed(0)||"-"],
          ["Climatizare", instSummary.qf_c?.toFixed(0)||"-", instSummary.ep_c?.toFixed(0)||"-"],
          ["Ventilare", instSummary.qf_v?.toFixed(0)||"-", instSummary.ep_v?.toFixed(0)||"-"],
          ["Iluminat", instSummary.qf_l?.toFixed(0)||"-", instSummary.ep_l?.toFixed(0)||"-"],
        ],
        foot: [["TOTAL", instSummary.qf_total?.toFixed(0)||"-", (renewSummary?.ep_adjusted||instSummary.ep_total||0).toFixed(0)]],
        footStyles: { fillColor: [240, 244, 248], fontStyle: "bold", fontSize: 8 },
      });
      y = doc.lastAutoTable.finalY + 4;
      if (annualEnergyCost) {
        doc.setFontSize(8); doc.setTextColor(0); doc.setFont(undefined, "normal");
        doc.text(`Cost anual estimat: ${annualEnergyCost.total?.toLocaleString("ro-RO")} lei/an (~${annualEnergyCost.totalEur?.toLocaleString("ro-RO")} EUR/an)`, 15, y);
        y += 6;
      }

      // Section 4: Auditor
      doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("4. Date auditor", 15, y); y += 2;
      doc.line(15, y, w-15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
        body: [
          ["Auditor energetic", auditor.name || "-"],
          ["Nr. atestat / Grad", `${auditor.atestat || "-"} / Grad ${auditor.grade || "-"}`],
          ["Firma", auditor.company || "-"],
          ["Data elaborarii", auditor.date || "-"],
          ["Scop CPE", auditor.scopCpe || "-"],
          ["Valabilitate", `${auditor.validityYears || "10"} ani`],
        ],
      });
      y = doc.lastAutoTable.finalY + 8;

      // Footer
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Generat cu Zephren v3.1 | Mc 001-2022, ISO 52000-1/NA:2023, EPBD 2024/1275 | ${new Date().toLocaleDateString("ro-RO")}`, w/2, 285, { align: "center" });

      // Save
      const filename = `CPE_${(building.address||"certificat").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      showToast("PDF generat: " + filename, "success");
    } catch(e) {
      showToast("Eroare generare PDF: " + e.message, "error");
      console.error("PDF export error:", e);
    } finally { setExporting(null); }
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate, cooling.hasCooling, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B6: BULK IMPORT/EXPORT — Multiple proiecte
  // ═══════════════════════════════════════════════════════════
  const exportBulkProjects = useCallback(() => {
    if (!projectList.length) { showToast("Niciun proiect salvat pentru export bulk.", "error"); return; }
    const allProjects = [];
    projectList.forEach(p => {
      try {
        const raw = window.storage?.getItem ? window.storage.getItem("project_" + p.id) : localStorage.getItem("zephren_project_" + p.id);
        if (raw) allProjects.push({ id: p.id, name: p.name, date: p.date, data: JSON.parse(raw) });
      } catch(e) { /* skip corrupted */ }
    });
    const blob = new Blob([JSON.stringify({ format: "zephren-bulk", version: "3.0", exportDate: new Date().toISOString(), projects: allProjects }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Zephren_BULK_${allProjects.length}proiecte_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
    showToast(`${allProjects.length} proiecte exportate`, "success");
  }, [projectList, showToast]);

  const importBulkProjects = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bulk = JSON.parse(e.target.result);
        if (bulk.format !== "zephren-bulk" || !Array.isArray(bulk.projects)) {
          showToast("Format invalid — nu este un export bulk Zephren.", "error"); return;
        }
        let imported = 0;
        bulk.projects.forEach(p => {
          if (p.data && p.id) {
            const key = "zephren_project_" + p.id + "_import_" + Date.now();
            try {
              if (window.storage?.setItem) window.storage.setItem("project_" + key, JSON.stringify(p.data));
              else localStorage.setItem("zephren_project_" + key, JSON.stringify(p.data));
              imported++;
            } catch(e) { /* storage full */ }
          }
        });
        showToast(`${imported}/${bulk.projects.length} proiecte importate. Reîncărcați lista proiecte.`, "success");
      } catch(err) { showToast("Eroare import bulk: " + err.message, "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  // ═══════════════════════════════════════════════════════════
  // E2: AUTO-COMPLETARE LOCALITATE DIN ADRESĂ
  // ═══════════════════════════════════════════════════════════
  const autoDetectLocality = useCallback((city) => {
    if (!city || city.length < 3) return;
    const cityNorm = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    const match = CLIMATE_DB.find(loc => {
      const locNorm = loc.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
      return locNorm === cityNorm || cityNorm.includes(locNorm) || locNorm.includes(cityNorm);
    });
    if (match && match.name !== building.locality) {
      setBuilding(prev => ({ ...prev, locality: match.name }));
      showToast(`Localitate detectată automat: ${match.name} (Zona ${match.zone})`, "info", 3000);
    }
  }, [building.locality, showToast]);

  // ═══════════════════════════════════════════════════════════
  // E4: GENERARE AUTOMATĂ TEXT RAPORT AUDIT
  // ═══════════════════════════════════════════════════════════
  const generateAuditReport = useCallback(() => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
    const cls = getEnergyClassEPBD(epF, catKey);
    const rer = renewSummary?.rer || 0;
    const Au = parseFloat(building.areaUseful) || 0;
    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
    const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
    const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || building.category;

    const lines = [];
    lines.push("RAPORT DE AUDIT ENERGETIC");
    lines.push("═".repeat(50));
    lines.push("");
    lines.push("1. IDENTIFICARE CLĂDIRE");
    lines.push("─".repeat(50));
    lines.push(`Adresă: ${building.address || "—"}, ${building.city || "—"}, jud. ${building.county || "—"}`);
    lines.push(`Categorie: ${catLabel}`);
    lines.push(`An construcție: ${building.yearBuilt || "—"}, An renovare: ${building.yearRenov || "—"}`);
    lines.push(`Suprafață utilă: ${Au} m², Volum: ${building.volume || "—"} m³`);
    lines.push(`Zonă climatică: ${selectedClimate?.name || "—"} (Zona ${selectedClimate?.zone}, θe=${selectedClimate?.theta_e}°C)`);
    lines.push("");
    lines.push("2. REZULTATE CALCUL ENERGETIC");
    lines.push("─".repeat(50));
    lines.push(`Clasa energetică: ${cls.cls} (notă ${cls.score}/100)`);
    lines.push(`Energie primară: ${epF.toFixed(1)} kWh/(m²·an)`);
    lines.push(`Emisii CO₂: ${co2F.toFixed(1)} kgCO₂/(m²·an)`);
    lines.push(`Energie finală: ${instSummary.qf_total_m2?.toFixed(1)} kWh/(m²·an)`);
    lines.push(`RER (rata energie regenerabilă): ${rer.toFixed(1)}%`);
    lines.push(`Conformitate nZEB: ${isNZEB ? "DA — conform Legea 238/2024" : "NU — necesită reabilitare"}`);
    lines.push(`  Prag EP: ≤${getNzebEpMax(building.category, selectedClimate?.zone)} kWh/(m²·an), actual: ${epF.toFixed(1)}`);
    lines.push(`  Prag RER: ≥${nzeb.rer_min}%, actual: ${rer.toFixed(1)}%`);
    lines.push("");
    lines.push("3. OBSERVAȚII ȘI CONSTATĂRI");
    lines.push("─".repeat(50));

    // Generate observations based on data
    if (envelopeSummary) {
      lines.push(`Coeficient global G = ${envelopeSummary.G?.toFixed(3)} W/(m³·K)`);
      if (envelopeSummary.G > 0.5) lines.push("  ⚠ G ridicat — anvelopă termică slab izolată");
    }
    if (airInfiltrationCalc) {
      lines.push(`Etanșeitate: n50 = ${airInfiltrationCalc.n50} h⁻¹ (${airInfiltrationCalc.classification})`);
    }
    if (naturalLightingCalc) {
      lines.push(`Iluminat natural: FLZ = ${naturalLightingCalc.flz}% (${naturalLightingCalc.classification})`);
    }
    if (gwpDetailed) {
      lines.push(`Amprenta de carbon: ${gwpDetailed.gwpPerM2Year} kgCO₂eq/(m²·an) (${gwpDetailed.classification})`);
    }
    if (annualEnergyCost) {
      lines.push(`Cost anual estimat: ${annualEnergyCost.total.toLocaleString("ro-RO")} lei/an (≈${annualEnergyCost.totalEur.toLocaleString("ro-RO")} EUR/an)`);
    }

    lines.push("");
    lines.push("4. RECOMANDĂRI DE REABILITARE");
    lines.push("─".repeat(50));
    if (smartSuggestions && smartSuggestions.length > 0) {
      smartSuggestions.forEach((s, i) => {
        const pLabel = s.priority===1 ? "URGENT" : s.priority===2 ? "RECOMANDAT" : "OPȚIONAL";
        lines.push(`${i+1}. [${pLabel}] ${s.measure}`);
        lines.push(`   ${s.detail}`);
        lines.push(`   Impact: ${s.impact} | Cost: ${s.costEstimate} | Recuperare: ${s.payback}`);
      });
    } else {
      lines.push("Nu sunt disponibile recomandări. Completați datele anvelopei și instalațiilor.");
    }

    lines.push("");
    lines.push("5. DATE AUDITOR");
    lines.push("─".repeat(50));
    lines.push(`Auditor: ${auditor.name || "—"} (${auditor.atestat || "—"}, Grad ${auditor.grade || "—"})`);
    lines.push(`Firmă: ${auditor.company || "—"}`);
    lines.push(`Data: ${auditor.date || "—"}`);
    lines.push("");
    lines.push("═".repeat(50));
    lines.push(`Generat cu Zephren v3.0 · ${new Date().toLocaleDateString("ro-RO")}`);
    lines.push("Normative: Mc 001-2022, SR EN ISO 52000-1:2017/NA:2023, Legea 238/2024");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Raport_Audit_${(building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
    showToast("Raport audit generat", "success");
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, envelopeSummary, airInfiltrationCalc, naturalLightingCalc, gwpDetailed, smartSuggestions, selectedClimate, cooling.hasCooling, showToast]);



  // ═══════════════════════════════════════════════════════════════
  // THERMAL BRIDGE MODAL
  // ═══════════════════════════════════════════════════════════════

  function BridgeModal({ element, onSave, onClose }) {
    const [el, setEl] = useState(element || { name:"", cat:"", psi:"", length:"", desc:"" });
    const [bridgeSearch, setBridgeSearch] = useState("");
    const [showList, setShowList] = useState(false);

    const filtered = bridgeSearch.length > 1
      ? THERMAL_BRIDGES_DB.filter(b => b.name.toLowerCase().includes(bridgeSearch.toLowerCase()) || b.cat.toLowerCase().includes(bridgeSearch.toLowerCase()))
      : THERMAL_BRIDGES_DB;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Punte termică</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="mb-4" style={{position:"relative",zIndex:20}}>
            <Input label={t("Caută tip punte termică",lang)} value={bridgeSearch} onChange={v => { setBridgeSearch(v); setShowList(true); }} placeholder="ex: balcon, fereastră, planșeu..." />
            {showList && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"4px",background:"#1e1e38",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",maxHeight:"200px",overflowY:"auto",zIndex:30,boxShadow:"0 10px 40px rgba(0,0,0,0.8)"}}>
                {filtered.map((b, i) => (
                  <button key={i} onClick={() => { setEl({name:b.name, cat:b.cat, psi:b.psi.toString(), length:el.length, desc:b.desc}); setShowList(false); setBridgeSearch(b.name); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex justify-between border-b border-white/5">
                    <span><span className="opacity-40">{b.cat} ›</span> {b.name}</span>
                    <span className="opacity-50">Ψ = {b.psi}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{position:"relative",zIndex:10}}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Input label={t("Ψ (coeficient liniar)",lang)} value={el.psi} onChange={v => setEl(p=>({...p,psi:v}))} type="number" unit="W/(m·K)" step="0.01" />
              <Input label={t("Lungime",lang)} value={el.length} onChange={v => setEl(p=>({...p,length:v}))} type="number" unit="m" min="0" step="0.1" />
            </div>

          {el.psi && el.length && (
            <Card title={t("Pierdere liniară",lang)} className="mb-4">
              <ResultRow label="Ψ × l" value={((parseFloat(el.psi)||0) * (parseFloat(el.length)||0)).toFixed(2)} unit="W/K" />
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE MODAL & PRICING PAGE
  // ═══════════════════════════════════════════════════════════════

  const UpgradeModal = () => {
    if (!showUpgradeModal) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:99999,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)"}} onClick={() => setShowUpgradeModal(false)}>
        <div className="relative bg-[#0d0d20] border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowUpgradeModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm">&times;</button>
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="text-lg font-bold text-amber-400">{lang==="EN"?"Upgrade Required":"Funcție disponibilă cu upgrade"}</h3>
            <p className="text-sm opacity-60 mt-2">{upgradeReason}</p>
          </div>
          <div className="space-y-2.5 mb-4">
            <button onClick={() => activateTier("pro")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg shrink-0">⚡</div>
              <div className="flex-1 text-left">
                <div className="font-bold text-amber-300 group-hover:text-amber-200">Pro — 199 RON/lună</div>
                <div className="text-[10px] opacity-50">15 certificate · Export DOCX · Raport nZEB</div>
              </div>
              <div className="text-amber-500 text-xl shrink-0">→</div>
            </button>
            <button onClick={() => activateTier("business")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">🏢</div>
              <div className="flex-1 text-left">
                <div className="font-bold text-emerald-300 group-hover:text-emerald-200">Business — 399 RON/lună</div>
                <div className="text-[10px] opacity-50">Certificate nelimitate · Multi-user · Branding CPE</div>
              </div>
              <div className="text-white/30 text-xl shrink-0">→</div>
            </button>
          </div>
          <button onClick={() => setShowUpgradeModal(false)} className="w-full text-center text-xs opacity-40 hover:opacity-70 py-2">
            {lang==="EN"?"Maybe later":"Poate mai târziu"}
          </button>
        </div>
      </div>
    );
  };

  const PricingPage = () => {
    if (!showPricingPage) return null;
    const plans = [
      { ...TIERS.free, icon:"🆓", color:"white", border:"border-white/10",
        headline: lang==="EN"?"Get started":"Începe gratuit",
        features:["2 proiecte salvate","Preview certificat","Calcul energetic complet","Export PDF cu watermark","Bază de date Mc 001-2022"],
        missing:["Export PDF/DOCX curat","Raport nZEB","Template-uri MDLPA","Multi-user"] },
      { ...TIERS.pro, icon:"⚡", color:"amber", border:"border-amber-500/50 ring-2 ring-amber-500/20", recommended:true,
        headline: lang==="EN"?"Most popular":"Cel mai popular",
        features:["Proiecte nelimitate","15 certificate/lună","Export PDF + DOCX curat","Raport conformare nZEB","Template-uri oficiale MDLPA","Suport email"],
        missing:["Multi-user","Branding personalizat CPE"] },
      { ...TIERS.business, icon:"🏢", color:"emerald", border:"border-emerald-500/30",
        headline: lang==="EN"?"For teams":"Pentru echipe",
        features:["Certificate nelimitate","3 conturi utilizator","Branding personalizat pe CPE","Export direct bază MDLPA","Suport prioritar telefonic","Toate funcțiile Pro incluse"],
        missing:[] },
    ];
    return (
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto" style={{zIndex:99999,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)"}} onClick={() => setShowPricingPage(false)}>
        <div className="relative bg-[#0d0d20] border border-white/15 rounded-2xl p-4 sm:p-8 max-w-3xl w-full shadow-2xl my-4 sm:my-8 mx-3 sm:mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowPricingPage(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm z-10">&times;</button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
              <span>⚡</span>
              <span className="text-xs font-bold text-amber-400">Zephren</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{lang==="EN"?"Choose your plan":"Alege planul potrivit"}</h2>
            <p className="text-xs sm:text-sm opacity-40 mt-1">{lang==="EN"?"Switch anytime · Cancel anytime":"Poți schimba oricând · Fără obligații"}</p>
          </div>

          {/* Quick tier switcher — pill buttons */}
          <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 max-w-xs mx-auto">
            {["free","pro","business"].map(tid => (
              <button key={tid} onClick={() => { activateTier(tid); }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  userTier === tid
                    ? tid === "free" ? "bg-white/15 text-white shadow-lg" : tid === "pro" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30" : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}>
                {TIERS[tid].label}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {plans.map(p => {
              const isCurrent = p.id === userTier;
              const colorMap = { amber: { bg:"bg-amber-500/5", ring:"ring-amber-500/30", btn:"bg-amber-500 hover:bg-amber-400 text-black", badge:"bg-amber-500 text-black", check:"text-amber-400" },
                emerald: { bg:"bg-emerald-500/5", ring:"ring-emerald-500/30", btn:"bg-emerald-500 hover:bg-emerald-400 text-black", badge:"bg-emerald-500 text-black", check:"text-emerald-400" },
                white: { bg:"bg-white/[0.02]", ring:"ring-white/10", btn:"bg-white/10 hover:bg-white/15 text-white", badge:"bg-white/20 text-white", check:"text-white/60" } };
              const cm = colorMap[p.color] || colorMap.white;
              return (
                <div key={p.id} className={`relative rounded-2xl border ${p.border} ${cm.bg} p-4 sm:p-5 flex flex-col transition-all ${isCurrent ? "ring-2 "+cm.ring+" scale-[1.02]" : "hover:scale-[1.01]"}`}>
                  {/* Recommended badge */}
                  {p.recommended && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold ${cm.badge} whitespace-nowrap`}>
                      {p.headline}
                    </div>
                  )}

                  {/* Icon + Name + Price */}
                  <div className="text-center mb-4 mt-1">
                    <span className="text-3xl">{p.icon}</span>
                    <div className="font-bold text-lg mt-2">{p.label}</div>
                    <div className="mt-1">
                      {p.price === 0 ? (
                        <span className="text-2xl font-black opacity-50">{lang==="EN"?"Free":"Gratuit"}</span>
                      ) : (
                        <div><span className="text-3xl font-black">{p.price}</span><span className="text-sm opacity-50 ml-1">RON/lună</span></div>
                      )}
                    </div>
                    {!p.recommended && <div className="text-[10px] opacity-30 mt-1">{p.headline}</div>}
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2 mb-4">
                    {p.features.map((f,i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className={`shrink-0 mt-0.5 ${cm.check}`}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {p.missing.map((f,i) => (
                      <div key={"m"+i} className="flex items-start gap-2 text-[11px] opacity-25">
                        <span className="shrink-0 mt-0.5">✗</span>
                        <span className="line-through">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  {isCurrent ? (
                    <div className={`text-center text-xs font-bold py-2.5 rounded-xl ${cm.bg} border border-white/10`}>
                      ✓ {lang==="EN"?"Active":"Activ"}
                    </div>
                  ) : (
                    <button onClick={() => activateTier(p.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${cm.btn}`}>
                      {p.id === "free" ? (lang==="EN"?"Switch to Free":"Treci la Free") : (lang==="EN"?"Activate "+p.label:"Activează "+p.label)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center text-[10px] opacity-30">
            * Mod demo: activarea este simulată. În producție se integrează Stripe.
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div onDragOver={function(e){e.preventDefault();setDragOver(true);}} onDragLeave={function(){setDragOver(false);}} onDrop={handleDrop} className={cn("min-h-screen ep-theme",theme==="dark"?"ep-dark text-white":"ep-light text-gray-900")} style={Object.assign({}, theme==="dark"?{background:"linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #0d0d20 100%)",fontFamily:"'DM Sans', system-ui, sans-serif"}:{background:"#f5f7fa",fontFamily:"'DM Sans', system-ui, sans-serif"}, (pdfPreviewHtml || nzebReportHtml) ? {overflow:"hidden",height:"100vh"} : {})}>
      {/* Fonts loaded in index.html */}
      <style dangerouslySetInnerHTML={{__html: `
        /* ═══ LIGHT THEME OVERRIDES ═══ */
        .ep-light .bg-white\\/\\[0\\.03\\], .ep-light .bg-white\\/5, .ep-light .bg-white\\/\\[0\\.02\\] { background: rgba(0,0,0,0.03) !important; }
        .ep-light .bg-white\\/10, .ep-light .bg-white\\/20 { background: rgba(0,0,0,0.06) !important; }
        .ep-light .border-white\\/\\[0\\.06\\], .ep-light .border-white\\/5 { border-color: rgba(0,0,0,0.1) !important; }
        .ep-light .border-white\\/10, .ep-light .border-white\\/20 { border-color: rgba(0,0,0,0.15) !important; }
        .ep-light .hover\\:bg-white\\/5:hover, .ep-light .hover\\:bg-white\\/10:hover, .ep-light .hover\\:bg-white\\/\\[0\\.03\\]:hover { background: rgba(0,0,0,0.06) !important; }
        .ep-light .hover\\:bg-white\\/20:hover { background: rgba(0,0,0,0.1) !important; }
        .ep-light .text-white { color: #1a1a2e !important; }
        .ep-light .text-white\\/70, .ep-light .text-white\\/60 { color: rgba(26,26,46,0.7) !important; }
        .ep-light .opacity-60 { opacity: 0.55 !important; }
        .ep-light .opacity-40 { opacity: 0.45 !important; }
        .ep-light .opacity-50 { opacity: 0.5 !important; }
        .ep-light .opacity-30 { opacity: 0.4 !important; }
        .ep-light input, .ep-light textarea, .ep-light select { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.15) !important; color: #1a1a2e !important; }
        .ep-light input::placeholder, .ep-light textarea::placeholder { color: rgba(0,0,0,0.35) !important; }
        .ep-light .bg-\\[\\#12141f\\], .ep-light .bg-\\[\\#1a1d2e\\] { background: #ffffff !important; }
        .ep-light .shadow-lg { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; }
        .ep-light .border-amber-500\\/20, .ep-light .border-amber-500\\/30 { border-color: rgba(217,119,6,0.25) !important; }
        .ep-light .bg-amber-500\\/10, .ep-light .bg-amber-500\\/15 { background: rgba(217,119,6,0.08) !important; }
        .ep-light .bg-emerald-500\\/5, .ep-light .bg-emerald-500\\/10 { background: rgba(16,185,129,0.06) !important; }
        .ep-light .bg-red-500\\/5, .ep-light .bg-red-500\\/10 { background: rgba(239,68,68,0.06) !important; }
        .ep-light .bg-amber-500\\/5 { background: rgba(217,119,6,0.05) !important; }
        .ep-light table { color: #1a1a2e; }
        .ep-light .font-mono { color: #1a1a2e; }
        /* Sidebar light */
        .ep-light aside { background: #ffffff !important; border-color: rgba(0,0,0,0.1) !important; }
        /* Toast light */
        .ep-light .backdrop-blur-xl { backdrop-filter: blur(12px); }

        /* ═══ MOBILE RESPONSIVE OVERRIDES ═══ */
        @media (max-width: 639px) {
          /* Sidebar: hidden by default, bottom nav takes over */
          .ep-theme nav { background: rgba(10,10,26,0.98) !important; backdrop-filter: blur(12px); }
          .ep-light nav { background: rgba(255,255,255,0.98) !important; }
          
          /* Header compact */
          .ep-theme header { padding-top: 6px !important; padding-bottom: 6px !important; }
          .ep-theme header h1 { font-size: 14px !important; }

          /* Sub-tab scroll with fade indicator */
          .ep-theme .overflow-x-auto {
            -webkit-mask-image: linear-gradient(to right, black 90%, transparent);
            mask-image: linear-gradient(to right, black 90%, transparent);
          }
          
          /* Main content: less padding, room for bottom nav */
          .ep-theme main { padding: 12px 10px 64px 10px !important; }
          
          /* Cards: tighter padding */
          .ep-theme .rounded-xl { border-radius: 12px; }
          .ep-theme .p-5 { padding: 12px !important; }
          
          /* Grids: ensure single column */
          .ep-theme .grid.md\\:grid-cols-2,
          .ep-theme .grid.md\\:grid-cols-3 { grid-template-columns: 1fr !important; }
          
          /* Tables: smaller text */
          .ep-theme table { font-size: 10px !important; }
          .ep-theme table th, .ep-theme table td { padding: 2px 4px !important; }
          
          /* Buttons: full width on mobile */
          .ep-theme button.px-6 { padding-left: 16px !important; padding-right: 16px !important; }
          
          /* Modals: full width */
          .ep-theme .max-w-lg, .ep-theme .max-w-md, .ep-theme .max-w-sm { max-width: calc(100vw - 16px) !important; }
          .ep-theme .max-w-2xl { max-width: calc(100vw - 16px) !important; }
          
          /* SVG charts responsive */
          .ep-theme svg { max-width: 100% !important; height: auto !important; }
          
          /* Hide desktop-only elements */
          .ep-theme .hidden-mobile { display: none !important; }
          
          /* Sticky table headers */
          .ep-theme .sticky { position: sticky; }
          
          /* Toast: wider on mobile */
          .ep-theme .max-w-sm { max-width: 90vw !important; }
          
          /* Prevent horizontal overflow */
          .ep-theme main > div { max-width: 100%; overflow-x: hidden; }
          .ep-theme .overflow-x-auto { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
          
          /* Bottom nav: prevent overlap with content */
          .ep-theme .fixed.bottom-0 { padding-bottom: env(safe-area-inset-bottom, 0px); }
        }
        
        /* No-scrollbar utility */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* ═══ TABLET (640-1023px) ═══ */
        @media (min-width: 640px) and (max-width: 1023px) {
          .ep-theme main { padding: 16px 20px 20px 20px !important; }
          .ep-theme nav { width: 200px !important; }
          /* Sub-tab fade for scrollable tabs */
          .ep-theme .overflow-x-auto {
            -webkit-mask-image: none;
            mask-image: none;
          }
        }
        
        /* ═══ DESKTOP (1024px+) ═══ */
        @media (min-width: 1024px) {
          /* Hide bottom nav on desktop */
          .ep-theme .fixed.bottom-0.lg\\:hidden { display: none !important; }
          .ep-theme .h-14.lg\\:hidden { display: none !important; }
        }
        
        /* ═══ SAFE AREA (iPhone notch) ═══ */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .ep-theme .fixed.bottom-0 { padding-bottom: env(safe-area-inset-bottom); }
          .ep-theme main { padding-bottom: calc(64px + env(safe-area-inset-bottom)) !important; }
        }
        
        /* ═══ PRINT LAYOUT (C10) ═══ */
        @media print {
          .ep-theme nav, .ep-theme header, .ep-theme .fixed, .ep-theme button, .ep-theme details summary { display: none !important; }
          .ep-theme main { padding: 0 !important; max-width: 100% !important; }
          .ep-theme .rounded-xl, .ep-theme .rounded-2xl { border-radius: 4px !important; }
          .ep-theme { color: #000 !important; background: #fff !important; }
          .ep-theme * { color: #000 !important; border-color: #ccc !important; }
          .ep-theme .bg-white\\/\\[0\\.03\\], .ep-theme [class*="bg-white"] { background: #f8f8f8 !important; }
          @page { size: A4 portrait; margin: 10mm 12mm; }
          .ep-theme svg text { fill: #333 !important; }
          .ep-theme .font-mono { font-family: "Courier New", monospace !important; }
        }

        /* ═══ ANIMAȚII (C8) ═══ */
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .ep-theme main > div { animation: fadeSlideIn 0.3s ease-out; }
        .ep-theme .fixed[class*="z-50"] > div { animation: scaleIn 0.2s ease-out; }
      `}} />

      {/* Tier modals */}
      <UpgradeModal />
      <PricingPage />

      {/* Toast notification (replaces alert/confirm blocked in sandbox) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-sm w-[90vw] pointer-events-none">
          <div onClick={() => setToast(null)} className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl cursor-pointer text-sm ${
            toast.type === "error" ? "bg-red-500/20 border-red-500/40 text-red-200" :
            toast.type === "success" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" :
            "bg-blue-500/20 border-blue-500/40 text-blue-200"
          }`}>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">{toast.type === "error" ? "⚠️" : toast.type === "success" ? "✅" : "ℹ️"}</span>
              <div className="flex-1 min-w-0">{toast.msg}</div>
              <span className="shrink-0 opacity-40 text-xs">✕</span>
            </div>
          </div>
        </div>
      )}

      {/* PDF/CPE Preview overlay — mobile-safe (no sandbox restriction) */}
      {pdfPreviewHtml && (
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{background:"#000"}}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0" style={{background:"#111"}}>
            <div className="text-sm text-white/70 font-medium">Preview CPE</div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                try {
                  const blob = new Blob([pdfPreviewHtml], {type:"text/html;charset=utf-8"});
                  const url = URL.createObjectURL(blob);
                  const w = window.open(url, "_blank");
                  if (w) setTimeout(() => { try{w.print();}catch(e){} }, 600);
                  else showToast("Permite pop-up-uri pentru a tipări.", "error");
                } catch(e) { showToast("Folosește butonul Deschide.", "info"); }
              }} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all">🖨️ Print / PDF</button>
              <button onClick={() => {
                try {
                  const blob = new Blob([pdfPreviewHtml], {type:"text/html;charset=utf-8"});
                  window.open(URL.createObjectURL(blob), "_blank");
                } catch(e) {}
              }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-all">↗ Deschide</button>
              <button onClick={() => setPdfPreviewHtml(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg">&times;</button>
            </div>
          </div>
          <div className="flex-1 relative" style={{background:"#fff"}}>
            <iframe srcDoc={pdfPreviewHtml} className="absolute inset-0 w-full h-full" style={{border:"none",background:"#fff"}} title="CPE Preview" />
          </div>
        </div>
      )}

      {/* nZEB Report overlay */}
      {nzebReportHtml && (
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{background:"#000"}}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0" style={{background:"#111"}}>
            <div className="text-sm text-white/70 font-medium truncate">📋 Raport nZEB</div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                try {
                  const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                  const url = URL.createObjectURL(blob);
                  const w = window.open(url, "_blank");
                  if (w) setTimeout(() => { try{w.print();}catch(e){} }, 600);
                } catch(e) { showToast("Folosește butonul Deschide.", "info"); }
              }} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-all">🖨️ Print</button>
              <button onClick={() => {
                try {
                  const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                  window.open(URL.createObjectURL(blob), "_blank");
                } catch(e) {}
              }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-all">↗ Deschide</button>
              <button onClick={() => setNzebReportHtml(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg">&times;</button>
            </div>
          </div>
          <div className="flex-1 relative" style={{background:"#fff"}}>
            <iframe srcDoc={nzebReportHtml} className="absolute inset-0 w-full h-full" style={{border:"none",background:"#fff"}} title="nZEB Report" />
          </div>
        </div>
      )}

      {/* Export loading overlay */}
      {exporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{background:"rgba(10,10,26,0.8)",backdropFilter:"blur(4px)"}}>
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-amber-400 font-bold text-lg">{t("Se exportă...",lang)}</div>
            <div className="text-xs opacity-40 mt-2">{exporting === "docx" ? "DOCX CPE" : exporting === "pdf" ? "PDF" : exporting === "excel" ? "Excel" : "XML"}</div>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{background:"rgba(245,158,11,0.1)",backdropFilter:"blur(2px)"}}>
          <div className="bg-amber-500/20 border-2 border-dashed border-amber-500 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📂</div>
            <div className="text-amber-400 font-bold">Lasă fișierul aici</div>
            <div className="text-xs opacity-50 mt-1">.json (proiect) sau .csv (elemente)</div>
          </div>
        </div>
      )}

      {/* Step progress indicator */}
      <div className="w-full px-2 sm:px-6 py-1 no-print" style={{background:theme==="dark"?"rgba(26,29,46,0.5)":"rgba(0,0,0,0.02)"}}>
        <div className="max-w-7xl mx-auto flex items-center gap-0.5 sm:gap-1" role="tablist" aria-label="Pași calcul energetic">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)} className="flex-1 group relative" title={`${s.id}. ${s.label}`}
              role="tab" aria-selected={s.id === step} aria-label={`Pas ${s.id}: ${lang==="EN" ? s.labelEN : s.label}`}>
              <div className="h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{
                background: s.id < step ? "linear-gradient(90deg,#22c55e,#4ade80)" :
                  s.id === step ? "linear-gradient(90deg,#f59e0b,#fbbf24)" :
                  theme==="dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
              }} />
              <div className={cn("absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center text-[6px] sm:text-[8px] font-bold transition-all",
                s.id < step ? "bg-emerald-500 border-emerald-400 text-white scale-90" :
                s.id === step ? "bg-amber-500 border-amber-400 text-black scale-110" :
                "bg-white/10 border-white/20 text-white/40 scale-75"
              )} style={{display: typeof window !== "undefined" && window.innerWidth < 400 ? "none" : "flex"}}>
                {s.id < step ? "✓" : s.id}
              </div>
            </button>
          ))}
        </div>
        <div className="text-center mt-0.5">
          <span className="text-[8px] sm:text-[9px] opacity-30">{step}/7 — {STEPS.find(s=>s.id===step)?.label} | {dataProgress}% complet</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="border-b border-white/[0.06] px-3 sm:px-6 py-2 sm:py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink">
            <button onClick={() => setSidebarOpen(o=>!o)} className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 hover:bg-white/5 shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm sm:text-lg shrink-0" style={{background:"linear-gradient(135deg, #f59e0b, #d97706)"}}>⚡</div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">Zephren</h1>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[9px] uppercase tracking-widest opacity-30 hidden sm:block">Performanță Energetică</p>
                  {/* Mini tier switcher — always visible */}
                  <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                    {["free","pro","business"].map(tid => (
                      <button key={tid} onClick={(e) => { e.stopPropagation(); activateTier(tid); showToast(`Plan ${TIERS[tid].label} activat`, "success"); }}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                          userTier === tid
                            ? tid === "free" ? "bg-white/15 text-white" : tid === "pro" ? "bg-amber-500 text-black shadow-sm" : "bg-emerald-500 text-black shadow-sm"
                            : "text-white/30 hover:text-white/60"
                        }`}>
                        {tid === "free" ? "FREE" : tid === "pro" ? "⚡PRO" : "🏢BIZ"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowPricingPage(true)} className="text-[9px] opacity-30 hover:opacity-60 transition-all hidden sm:block" title="Detalii planuri">ⓘ</button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 justify-end shrink min-w-0 overflow-x-auto no-scrollbar">
            <button onClick={function(){setPrintMode(true);setTimeout(function(){window.print();setPrintMode(false);},500);}} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0">🖨️</button>
            {storageStatus && <span className="text-[8px] opacity-20 hidden lg:inline shrink-0">{storageStatus}</span>}
            <div className="flex items-center gap-0.5 hidden md:flex shrink-0">
              <button onClick={undo} disabled={undoStack.length===0} title="Undo (Ctrl+Z)"
                className={cn("text-xs px-1.5 py-1 rounded-l-lg border border-white/10 transition-colors", undoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↶</button>
              <button onClick={redo} disabled={redoStack.length===0} title="Redo (Ctrl+Y)"
                className={cn("text-xs px-1.5 py-1 rounded-r-lg border border-l-0 border-white/10 transition-colors", redoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↷</button>
            </div>
            <button onClick={() => { refreshProjectList(); setShowProjectManager(true); }}
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 transition-all shrink-0">
              📁<span className="hidden md:inline"> Proiecte</span>
            </button>
            <button onClick={() => setShowResetConfirm(true)}
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all shrink-0">
              {lang==="EN"?"New":"Nou"}
            </button>
            <button onClick={exportProject}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden md:flex shrink-0">
              💾<span className="hidden lg:inline"> JSON</span>
            </button>
            <button onClick={exportCSV}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:flex shrink-0">
              📊 CSV
            </button>
            <button onClick={exportExcel}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-colors hidden lg:flex shrink-0 text-green-400">
              📗 XLSX
            </button>
            <button onClick={() => importFileRef.current?.click()}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:flex shrink-0">
              📂 Import
            </button>
            <input ref={importFileRef} type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files[0]) { importProject(e.target.files[0]); e.target.value=""; } }} />
            <button onClick={() => setShowImportWizard(true)} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Import din alte softuri">📥</button>
            <button onClick={saveToCloud} className={`text-xs px-2 py-1 rounded-lg border transition-colors hidden lg:block shrink-0 ${cloud?.isLoggedIn ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400" : "border-white/10 hover:bg-white/5 opacity-40"}`} title={cloud?.isLoggedIn ? "Salvează în cloud" : "Autentifică-te pentru cloud"}>☁️</button>
            {cloud?.isLoggedIn && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400/60 hidden xl:block shrink-0">{cloud.user?.name?.split(" ")[0] || cloud.user?.email?.split("@")[0]}</span>}
            {cloud?.isLoggedIn && <button onClick={cloud.logout} className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 hover:bg-white/5 text-white/30 hidden xl:block shrink-0">Logout</button>}
            <button onClick={() => { loadTeamData(); loadCloudProjects(); setShowTeamManager(true); }} className={`text-xs px-2 py-1 rounded-lg border transition-colors hidden lg:block shrink-0 ${cloud?.isLoggedIn ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400" : "border-white/10 hover:bg-white/5 opacity-40"}`} title="Echipă & Cloud">👥</button>
            <button onClick={() => setShowClimateMap(true)} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Hartă climatică">🗺️</button>
            <button onClick={() => setShowPhotoGallery(true)} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Galerie foto">📷</button>
            <button onClick={() => setShowProductCatalog(true)} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Catalog produse">🏭</button>
            <button onClick={() => setShowAIAssistant(!showAIAssistant)} className="text-xs px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors hidden lg:block shrink-0 text-amber-400" title="Zephren AI Assistant">🤖</button>
            <button onClick={function(){setShowTour(true);}} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Ghid utilizare">?</button>
            <button onClick={toggleThemeManual} className="text-[10px] px-1.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors shrink-0">{theme==="dark"?"☀":"🌙"}</button>
            <button onClick={() => setLang(l => l==="RO"?"EN":"RO")}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium shrink-0">
              {lang}
            </button>
            {selectedClimate && (
              <Badge color={selectedClimate.zone==="I"?"green":selectedClimate.zone==="II"?"amber":selectedClimate.zone==="III"?"amber":selectedClimate.zone==="IV"?"red":"purple"}>
                <span className="hidden md:inline">Zona </span>{selectedClimate.zone}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-0 min-h-[calc(100vh-73px)] relative">
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <nav aria-label="Navigare pași" className={cn("fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-56 shrink-0 border-r border-white/[0.06] py-6 px-3 transform transition-transform duration-200 lg:transform-none overflow-y-auto no-print", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{background:theme==="dark"?"#0a0a1a":"#ffffff"}}>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden sticky top-0 float-right w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white bg-[#0a0a1a] z-10 mb-2">✕</button>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => { if(!s.locked){setStep(s.id);setSidebarOpen(false);} }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-all",
                step === s.id ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/[0.03] border border-transparent",
                s.locked && "opacity-25 cursor-not-allowed"
              )}>
              <span className="text-lg">{s.icon}</span>
              <div>
                <div className="text-xs font-semibold">{s.id}. {lang==="EN" && s.labelEN ? s.labelEN : s.label}</div>
                <div className="text-[10px] opacity-40">{lang==="EN" && s.descEN ? s.descEN : s.desc}</div>
              </div>
              {step === s.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </button>
          ))}

          {/* Envelope summary mini-panel */}
          {envelopeSummary && envelopeSummary.G > 0 && (
            <div className="mt-6 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Coef. global G</div>
              <div className={cn("text-2xl font-bold font-mono", envelopeSummary.G < 0.5 ? "text-emerald-400" : envelopeSummary.G < 0.8 ? "text-amber-400" : "text-red-400")}>
                {envelopeSummary.G.toFixed(3)}
              </div>
              <div className="text-[10px] opacity-30">W/(m³·K)</div>
            </div>
          )}
          <div className="mt-4 p-2 bg-white/[0.02] rounded-lg">
            <div className="text-[8px] opacity-25 space-y-0.5">
              <div>Ctrl+S — Export proiect</div>
              <div>Alt+← → — Navigare pași</div>
              <div>Drag &amp; drop — Import fișier</div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 sm:p-6 pb-16 lg:pb-6 overflow-y-auto min-w-0">
          <div key={step} style={{animation:"fadeSlideIn 0.3s ease-out"}}>
          <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {/* ═══ STEP 1: IDENTIFICARE ═══ */}
          {step === 1 && <Step1Identification
            building={building} updateBuilding={updateBuilding} lang={lang} selectedClimate={selectedClimate}
            BUILDING_CATEGORIES={BUILDING_CATEGORIES} STRUCTURE_TYPES={STRUCTURE_TYPES}
            autoDetectLocality={autoDetectLocality} estimateGeometry={estimateGeometry} avRatio={avRatio}
            loadFullDemo={loadFullDemo} loadFullDemo2={loadFullDemo2} loadFullDemo3={loadFullDemo3}
            loadFullDemo4={loadFullDemo4} loadFullDemo5={loadFullDemo5} loadFullDemo6={loadFullDemo6}
            loadFullDemo7={loadFullDemo7} loadFullDemo8={loadFullDemo8}
            loadFullDemo9={loadFullDemo9} loadFullDemo10={loadFullDemo10}
            loadFullDemo11={loadFullDemo11} loadFullDemo12={loadFullDemo12}
            loadFullDemo13={loadFullDemo13} loadFullDemo14={loadFullDemo14}
            loadTypicalBuilding={loadTypicalBuilding} showToast={showToast}
            goToStep={goToStep}
          />}


          {/* ═══ STEP 2: ANVELOPĂ ═══ */}
          {step === 2 && <Step2Envelope
            building={building} lang={lang} selectedClimate={selectedClimate}
            opaqueElements={opaqueElements} setOpaqueElements={setOpaqueElements}
            glazingElements={glazingElements} setGlazingElements={setGlazingElements}
            thermalBridges={thermalBridges} setThermalBridges={setThermalBridges}
            envelopeSummary={envelopeSummary}
            setEditingOpaque={setEditingOpaque} setShowOpaqueModal={setShowOpaqueModal}
            setEditingGlazing={setEditingGlazing} setShowGlazingModal={setShowGlazingModal}
            setEditingBridge={setEditingBridge} setShowBridgeModal={setShowBridgeModal} setShowBridgeCatalog={setShowBridgeCatalog}
            calcOpaqueR={calcOpaqueR} getURefNZEB={getURefNZEB}
            ELEMENT_TYPES={ELEMENT_TYPES} U_REF_NZEB={U_REF_NZEB}
            glaserElementIdx={glaserElementIdx} setGlaserElementIdx={setGlaserElementIdx} glaserResult={glaserResult}
            summerComfortResults={summerComfortResults}
            airInfiltrationCalc={airInfiltrationCalc} naturalLightingCalc={naturalLightingCalc}
            csvImportRef={csvImportRef} importCSV={importCSV}
            setStep={setStep} goToStep={goToStep}
          />}


          {/* ═══ STEP 3: INSTALAȚII ═══ */}
          {step === 3 && <Step3Systems
            building={building} lang={lang} selectedClimate={selectedClimate}
            heating={heating} setHeating={setHeating}
            acm={acm} setAcm={setAcm}
            cooling={cooling} setCooling={setCooling}
            ventilation={ventilation} setVentilation={setVentilation}
            lighting={lighting} setLighting={setLighting}
            instSubTab={instSubTab} setInstSubTab={setInstSubTab}
            instSummary={instSummary}
            setStep={setStep} goToStep={goToStep}
          />}


          {/* ═══ STEP 4: REGENERABILE ═══ */}
          {step === 4 && <Step4Renewables
            building={building} lang={lang} selectedClimate={selectedClimate}
            solarThermal={solarThermal} setSolarThermal={setSolarThermal}
            photovoltaic={photovoltaic} setPhotovoltaic={setPhotovoltaic}
            heatPump={heatPump} setHeatPump={setHeatPump}
            biomass={biomass} setBiomass={setBiomass}
            otherRenew={otherRenew} setOtherRenew={setOtherRenew}
            renewSubTab={renewSubTab} setRenewSubTab={setRenewSubTab}
            renewSummary={renewSummary} instSummary={instSummary}
            ORIENTATIONS={ORIENTATIONS} getNzebEpMax={getNzebEpMax}
            setStep={setStep} goToStep={goToStep}
          />}


          {/* ═══ STEP 5: CALCUL ENERGETIC & CLASARE ═══ */}
          {step === 5 && <Step5Calculation {...{
            monthlyISO, hourlyISO, instSummary, renewSummary, envelopeSummary,
            glaserResult, zebVerification, annualEnergyCost, monthlyBreakdown,
            summerComfortResults, sankeyData, building, selectedClimate, lang, theme,
            heating, cooling, ventilation, lighting, acm,
            solarThermal, photovoltaic, heatPump, biomass, otherRenew,
            gwpDetailed, bacsCheck, bacsClass, setBacsClass, avValidation,
            evChargerCalc, solarReadyCheck,
            energyPrices, setEnergyPrices, useNA2023, setUseNA2023,
            compareRef, setCompareRef, importCompareRef,
            showScenarioCompare, setShowScenarioCompare,
            rehabScenarioInputs, setRehabScenarioInputs, rehabComparison,
            setStep, goToStep, step,
            Card, Badge, ResultRow, Select, Input, cn,
            getEnergyClassEPBD, getCO2Class, getNzebEpMax,
            ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB,
            NZEB_THRESHOLDS, ZEB_THRESHOLDS, ZEB_FACTOR,
            BACS_OBLIGATION_THRESHOLD_KW, BACS_CLASSES,
            FUELS, BENCHMARKS,
            financialAnalysis,
            t: (key) => lang === "RO" ? key : (T[key]?.EN || key),
          }} />}

          {/* ═══ STEP 6: CERTIFICAT ENERGETIC ═══ */}
          {step === 6 && <Step6Certificate {...{
            monthlyISO, instSummary, renewSummary, envelopeSummary,
            building, selectedClimate, lang, theme,
            heating, cooling, ventilation, lighting, acm,
            solarThermal, photovoltaic, heatPump, biomass, otherRenew,
            opaqueElements, glazingElements, thermalBridges,
            auditor, setAuditor,
            setStep, goToStep,
            energyPrices,
            pdfPreviewHtml, setPdfPreviewHtml,
            pdfPreviewUrl, setPdfPreviewUrl,
            nzebReportHtml, setNzebReportHtml,
            certCount, incrementCertCount,
            projectList,
            showToast, tier, userTier,
            canExportDocx, canNzebReport, requireUpgrade, hasWatermark,
            presentationMode, setPresentationMode,
            financialAnalysis, finAnalysisInputs, setFinAnalysisInputs,
            exportPDFNative, fetchTemplate,
            calcOpaqueR,
            Card, Badge, ResultRow, Select, Input, cn,
            getEnergyClassEPBD, getCO2Class, getNzebEpMax,
            ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB,
            NZEB_THRESHOLDS, ZEB_THRESHOLDS, ZEB_FACTOR,
            BUILDING_CATEGORIES, ELEMENT_TYPES,
            FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS,
            VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL,
            SOLAR_THERMAL_TYPES, PV_TYPES,
            U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_GLAZING,
            CPE_TEMPLATES,
            EPBD_AG_ACTIVE, EPBD_AG_THRESHOLDS,
            REHAB_COSTS,
            getURefNZEB,
            t: (key) => lang === "RO" ? key : (T[key]?.EN || key),
          }} />}

          {/* ═══ STEP 7: AUDIT — RECOMANDĂRI DE REABILITARE ═══ */}
          {step === 7 && <Step7Audit {...{
            instSummary, renewSummary, envelopeSummary,
            building, selectedClimate, lang, theme,
            heating, cooling, ventilation, lighting, acm,
            solarThermal, photovoltaic, heatPump, biomass, otherRenew,
            opaqueElements, glazingElements, thermalBridges,
            auditor,
            setStep, goToStep,
            rehabScenarioInputs, setRehabScenarioInputs, rehabComparison,
            showToast,
            financialAnalysis, finAnalysisInputs, setFinAnalysisInputs,
            smartSuggestions, multiScenarios,
            buildingPhotos, setBuildingPhotos,
            activeScenario, loadScenarioPreset, SCENARIO_PRESETS,
            generateAuditReport, exportXML, exportPDFNative, exportBulkProjects,
            calcOpaqueR, calcSRI,
            Card, Badge, ResultRow, Select, Input, cn,
            getEnergyClassEPBD, getCO2Class, getNzebEpMax,
            ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB,
            NZEB_THRESHOLDS, ZEB_THRESHOLDS, ZEB_FACTOR,
            BUILDING_CATEGORIES, ELEMENT_TYPES,
            FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS,
            VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL,
            U_REF_GLAZING,
            SRI_DOMAINS, RENOVATION_STAGES, IEQ_CATEGORIES,
            CHP_TYPES, MCCL_CATALOG,
            REHAB_COSTS,
            getURefNZEB, setThermalBridges,
            t: (key) => lang === "RO" ? key : (T[key]?.EN || key),
          }} />}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {showOpaqueModal && (
        <OpaqueModal
          element={editingOpaque}
          onSave={el => {
            if (editingOpaque && editingOpaque._idx !== undefined) {
              setOpaqueElements(prev => prev.map((e, i) => i === editingOpaque._idx ? el : e));
            } else {
              setOpaqueElements(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowOpaqueModal(false); setEditingOpaque(null); }}
        />
      )}

      {showGlazingModal && (
        <GlazingModal
          element={editingGlazing}
          onSave={el => {
            if (editingGlazing && editingGlazing._idx !== undefined) {
              setGlazingElements(prev => prev.map((e, i) => i === editingGlazing._idx ? el : e));
            } else {
              setGlazingElements(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowGlazingModal(false); setEditingGlazing(null); }}
        />
      )}

      {showBridgeModal && (
        <BridgeModal
          element={editingBridge}
          onSave={el => {
            if (editingBridge && editingBridge._idx !== undefined) {
              setThermalBridges(prev => prev.map((e, i) => i === editingBridge._idx ? el : e));
            } else {
              setThermalBridges(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowBridgeModal(false); setEditingBridge(null); }}
        />
      )}

      {/* #20 Mod prezentare ecran complet */}
      {presentationMode && instSummary && (() => {
        const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
        const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
        const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
        const cls = getEnergyClassEPBD(epF, catKey);
        const co2Cls = getCO2Class(co2F, building.category);
        const rer = renewSummary?.rer || 0;
        const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
        const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
        const Au = parseFloat(building.areaUseful) || 0;
        return (
          <div className="fixed inset-0 z-[99999] bg-[#0d1117] flex flex-col items-center justify-center p-8" onClick={() => setPresentationMode(false)}>
            <button onClick={() => setPresentationMode(false)} className="absolute top-4 right-4 text-white/40 hover:text-white text-2xl">✕</button>
            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-500/60 mb-2">Certificat de Performanță Energetică</div>
              <div className="text-2xl font-light text-white/60 mb-1">{building.address || "—"}, {building.city}</div>
              <div className="text-sm text-white/30">{BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label} · {building.yearBuilt} · Au = {Au} m²</div>
            </div>
            <div className="flex items-center gap-16">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Clasa energetică</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-6xl font-black" style={{backgroundColor:cls.color+"30",color:cls.color,border:`3px solid ${cls.color}60`}}>{cls.cls}</div>
                <div className="text-3xl font-bold mt-3 font-mono" style={{color:cls.color}}>{epF.toFixed(1)}</div>
                <div className="text-xs text-white/40">kWh/(m²·an)</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Emisii CO₂</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-6xl font-black" style={{backgroundColor:co2Cls.color+"30",color:co2Cls.color,border:`3px solid ${co2Cls.color}60`}}>{co2Cls.cls}</div>
                <div className="text-3xl font-bold mt-3 font-mono" style={{color:co2Cls.color}}>{co2F.toFixed(1)}</div>
                <div className="text-xs text-white/40">kgCO₂/(m²·an)</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Regenerabile</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black" style={{backgroundColor:rer>=30?"#22c55e30":"#ef444430",color:rer>=30?"#22c55e":"#ef4444",border:`3px solid ${rer>=30?"#22c55e60":"#ef444460"}`}}>{rer.toFixed(0)}%</div>
                <div className="text-lg font-bold mt-3" style={{color:rer>=30?"#22c55e":"#ef4444"}}>RER</div>
                <div className="text-xs text-white/40">min 30% nZEB</div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              {isNZEB && <div className="px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold">✓ nZEB CONFORM</div>}
              {!isNZEB && <div className="px-6 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold">✗ nZEB NECONFORM</div>}
              <div className="text-xs text-white/20">Nota energetică: {cls.score}/100 · Consum final: {instSummary.qf_total_m2.toFixed(1)} kWh/(m²·an)</div>
            </div>
            <div className="mt-6 text-[10px] text-white/15">Click oriunde pentru a închide · {auditor.name} · {auditor.company} · {new Date().toLocaleDateString("ro-RO")}</div>
          </div>
        );
      })()}

      {/* #10 AI Assistant */}
      {showAIAssistant && (() => {
        const sendAIMessage = async (question) => {
          if (!question.trim() || aiLoading) return;
          const userMsg = { role: "user", text: question };
          setAiMessages(prev => [...prev, userMsg]);
          setAiInput("");
          setAiLoading(true);
          if (cloud?.askAI) {
            const ctx = { building, energyClass: envelopeSummary?.ep ? getEnergyClassEPBD(building.category, envelopeSummary.ep) : null, ep: envelopeSummary?.ep, rer: renewSummary?.rer, category: building.category };
            const result = await cloud.askAI(question, ctx);
            setAiMessages(prev => [...prev, { role: "assistant", text: result.answer || result.error || "Eroare necunoscută" }]);
          } else {
            setAiMessages(prev => [...prev, { role: "assistant", text: "AI Assistant necesită configurare Supabase + plan Business. Contactează-ne pentru activare." }]);
          }
          setAiLoading(false);
        };
        return (
        <div className="fixed bottom-4 right-4 z-[9998] w-80 bg-[#12141f] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-center gap-2"><span>🤖</span><span className="text-sm font-bold text-amber-400">Zephren AI</span>
              {cloud?.isLoggedIn && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{cloud.cloudStatus}</span>}
            </div>
            <button onClick={() => setShowAIAssistant(false)} className="text-white/40 hover:text-white">&times;</button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto space-y-3 text-xs">
            {aiMessages.length === 0 && (
              <>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                  <p className="text-amber-400/80 font-medium mb-1">Bun venit! Cum te pot ajuta?</p>
                  <p className="opacity-50">Pot răspunde la întrebări despre normative, calcule energetice, sau completarea certificatului.</p>
                </div>
                <div className="space-y-2">
                  {["Ce normativ se aplică pentru nZEB?", "Cum calculez U-value pentru un perete?", "Ce înseamnă RER și cât trebuie să fie?", "Cum aleg sursa de încălzire optimă?"].map(q => (
                    <button key={q} onClick={() => sendAIMessage(q)}
                      className="w-full text-left text-[11px] px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] opacity-70 hover:opacity-100 transition-all">
                      💬 {q}
                    </button>
                  ))}
                </div>
              </>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={`rounded-lg p-3 text-[11px] leading-relaxed ${msg.role === "user" ? "bg-amber-500/10 text-amber-200 ml-6" : "bg-white/[0.03] border border-white/5 mr-6"}`}>
                {msg.text}
              </div>
            ))}
            {aiLoading && <div className="text-center opacity-40 animate-pulse">Se gândește...</div>}
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <form onSubmit={e => { e.preventDefault(); sendAIMessage(aiInput); }} className="flex gap-2">
              <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Întreabă ceva..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50" disabled={aiLoading} />
              <button type="submit" className="px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold" disabled={aiLoading}>→</button>
            </form>
            <div className="text-[9px] opacity-20 mt-1 text-center">Powered by Claude AI · {cloud?.canUseAI ? "Business" : "Plan Business necesar"}</div>
          </div>
        </div>
        );
      })()}

      {/* #12 API Documentation */}
      {showAPIDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowAPIDoc(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📡 Zephren API (v1.0)</h3>
              <button onClick={() => setShowAPIDoc(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <div className="text-xs space-y-3 opacity-70">
              <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[10px]">
                <div className="text-amber-400 mb-1">POST /api/calculate</div>
                <div className="opacity-50">Calcul energetic complet. Trimite datele clădirii, returnează Ep, CO₂, clasă, RER.</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[10px]">
                <div className="text-amber-400 mb-1">POST /api/generate-cpe</div>
                <div className="opacity-50">Generează certificat DOCX completat automat. Returnează blob.</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[10px]">
                <div className="text-amber-400 mb-1">GET /api/materials</div>
                <div className="opacity-50">Baza de date materiale: λ, ρ, μ pentru 80+ materiale.</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[10px]">
                <div className="text-amber-400 mb-1">GET /api/climate/:city</div>
                <div className="opacity-50">Date climatice lunare pentru 60 localități românești.</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[10px]">
                <div className="text-amber-400 mb-1">POST /api/export-xml</div>
                <div className="opacity-50">Export XML format MDLPA registru electronic.</div>
              </div>
            </div>
            <div className="text-[10px] opacity-30 text-center pt-2 border-t border-white/5">
              API disponibil în planul Business · Documentație completă la zephren.ro/api
            </div>
          </div>
        </div>
      )}

      {/* #8 Import din alte softuri */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowImportWizard(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📥 Import proiect</h3>
              <button onClick={() => setShowImportWizard(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <div className="space-y-3">
              {[
                {name:"Zephren JSON", ext:".json", desc:"Format nativ Zephren", ready:true},
                {name:"CSV anvelopă", ext:".csv", desc:"Import elemente din tabel CSV", ready:true},
                {name:"ENERG+ export", ext:".xml", desc:"Import din software ENERG+", ready:true, handler:"energ"},
                {name:"Doset CPE", ext:".dcp", desc:"Import din Doset certificare", ready:false},
                {name:"BuildDesk", ext:".bdk", desc:"Import din BuildDesk Energy", ready:false},
              ].map(f => (
                <div key={f.name} className={`flex items-center gap-3 p-3 rounded-xl border ${f.ready ? "border-white/10 hover:bg-white/[0.04] cursor-pointer" : "border-white/5 opacity-40 cursor-not-allowed"}`}
                  onClick={() => {
                    if (!f.ready) return;
                    if (f.handler === "energ") {
                      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".xml";
                      inp.onchange = (ev) => { if (ev.target.files[0]) { importENERGPlus(ev.target.files[0]); setShowImportWizard(false); } };
                      inp.click();
                    } else {
                      showToast("Folosește butonul Import JSON/CSV din toolbar", "info");
                    }
                  }}>
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-mono opacity-60">{f.ext}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-[10px] opacity-40">{f.desc}</div>
                  </div>
                  {f.ready ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-[10px] opacity-30">În curând</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBridgeCatalog && (
        <ThermalBridgeCatalog
          onSelect={(bridge) => {
            setThermalBridges(prev => [...prev, {
              name: bridge.name,
              type: bridge.cat,
              psi: String(bridge.psi),
              length: "",
            }]);
          }}
          onClose={() => setShowBridgeCatalog(false)}
        />
      )}

      {/* Reset confirmation modal */}

      {/* ═══ NEW: CLIMATE MAP MODAL (C9) ═══ */}
      {showClimateMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowClimateMap(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">🗺️ Harta climatică România</h3>
              <button onClick={() => setShowClimateMap(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <svg viewBox="0 0 500 380" className="w-full" style={{minHeight:"340px"}}>
              {/* Romania border from real geographic coordinates */}
              <path d={ROMANIA_BORDER_PATH}
                fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Carpathian arc (Oradea → Brașov → Vrancea — real trajectory) */}
              <path d={"M" + [
                [21.9,47.1],[23.0,47.2],[23.9,46.8],[24.3,46.5],[24.6,46.2],[25.0,45.8],
                [25.5,45.7],[25.8,45.9],[26.2,46.0],[26.8,46.2],[27.2,46.0],[27.5,45.8]
              ].map(function(c){return geoToSvg(c[1],c[0])}).map(function(p,i){return (i?'L':'')+ p.x.toFixed(0)+','+p.y.toFixed(0)}).join(' ')}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
              {/* Danube (southern border: Drobeta → Giurgiu → Galați) */}
              <path d={"M" + [
                [22.4,44.4],[23.0,43.9],[24.0,43.8],[25.0,43.7],[25.5,43.7],[26.1,44.0],[27.0,44.0],[27.5,44.0],[28.0,44.0],[28.6,45.4]
              ].map(function(c){return geoToSvg(c[1],c[0])}).map(function(p,i){return (i?'L':'')+ p.x.toFixed(0)+','+p.y.toFixed(0)}).join(' ')}
                fill="none" stroke="rgba(59,130,246,0.10)" strokeWidth="2.5" strokeLinecap="round" />
              {/* City dots */}
              {CLIMATE_DB.map(loc => {
                const pt = ROMANIA_MAP_POINTS[loc.name];
                if (!pt) return null;
                const isSelected = building.locality === loc.name;
                return (
                  <g key={loc.name} onClick={(e) => { e.stopPropagation(); setBuilding(prev => ({...prev, locality: loc.name})); }}
                    className="cursor-pointer">
                    {isSelected && <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke={ZONE_COLORS[loc.zone]||"#888"} strokeWidth="1.5" opacity="0.4" />}
                    <circle cx={pt.x} cy={pt.y} r={isSelected ? 6 : 4} fill={ZONE_COLORS[loc.zone] || "#888"} opacity={isSelected ? 1 : 0.75}
                      stroke={isSelected ? "#fff" : "rgba(0,0,0,0.3)"} strokeWidth={isSelected ? 2 : 0.5} />
                    <text x={pt.x} y={pt.y - (isSelected ? 14 : 7)} textAnchor="middle"
                      fill={isSelected ? "#fff" : "rgba(255,255,255,0.55)"} fontSize={isSelected ? "9" : "6.5"} fontWeight={isSelected ? "bold" : "normal"}
                      style={{textShadow: "0 1px 3px rgba(0,0,0,0.8)"}}>
                      {loc.name}
                    </text>
                  </g>
                );
              })}
              {/* Legend */}
              {Object.entries(ZONE_COLORS).map(([zone, color], i) => (
                <g key={zone}>
                  <circle cx={15} cy={300 + i*14} r="4" fill={color} />
                  <text x={24} y={303 + i*14} fill="rgba(255,255,255,0.5)" fontSize="7.5">Zona {zone} ({zone==="I"?"θe=−12°C":zone==="II"?"θe=−15°C":zone==="III"?"θe=−18°C":zone==="IV"?"θe=−21°C":"θe=−25°C"})</text>
                </g>
              ))}
            </svg>
            <div className="text-[10px] opacity-30 text-center mt-2">Click pe o localitate pentru a o selecta. Zona I (cea mai caldă) → Zona V (cea mai rece).</div>
          </div>
        </div>
      )}

      {/* ═══ NEW: PHOTO GALLERY MODAL (C5) ═══ */}
      {showPhotoGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowPhotoGallery(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">📷 Galerie foto clădire</h3>
              <button onClick={() => setShowPhotoGallery(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <div className="space-y-3">
              {buildingPhotos.length === 0 && (
                <div className="text-center py-8 opacity-30 text-sm">Nicio fotografie adăugată.<br/>Folosiți butonul de mai jos pentru a adăuga imagini.</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {buildingPhotos.map((photo, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 aspect-video bg-white/[0.03]">
                    <img src={photo.url} alt={photo.label || "Foto"} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px]">{photo.label || "Fără etichetă"} — {photo.zone || "—"}</div>
                    <button onClick={() => setBuildingPhotos(prev => prev.filter((_,j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/60 text-white text-[10px] flex items-center justify-center hover:bg-red-500">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 hover:border-amber-500/40 cursor-pointer transition-all text-sm opacity-60 hover:opacity-100">
                  <span>📸 Adaugă fotografie</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                    Array.from(e.target.files || []).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const zones = ["Fațadă Nord","Fațadă Sud","Fațadă Est","Fațadă Vest","Interior","Acoperiș","Subsol","Defect"];
                        setBuildingPhotos(prev => [...prev, { url: ev.target.result, label: file.name.replace(/\.[^.]+$/,""), zone: zones[prev.length % zones.length] }]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW: PRODUCT CATALOG MODAL (F3) ═══ */}
      {showProductCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowProductCatalog(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">🏭 Catalog produse reale</h3>
              <button onClick={() => setShowProductCatalog(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto">
              {[{id:"windows",label:"Ferestre",icon:"🪟"},{id:"heatPumps",label:"Pompe căldură",icon:"♨️"},{id:"pvPanels",label:"Panouri PV",icon:"☀️"},{id:"inverters",label:"Invertoare",icon:"⚡"}].map(tab => (
                <button key={tab.id} onClick={() => setProductCatalogTab(tab.id)}
                  className={cn("flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    productCatalogTab === tab.id ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/5 opacity-50")}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {(PRODUCT_CATALOG[productCatalogTab] || []).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{p.brand} {p.model}</div>
                    <div className="text-[10px] opacity-40">
                      {p.type}
                      {p.u !== undefined && ` · U=${p.u} W/(m²·K)`}
                      {p.g !== undefined && ` · g=${p.g}`}
                      {p.cop !== undefined && ` · COP=${p.cop}`}
                      {p.power !== undefined && ` · ${p.power}${productCatalogTab==="pvPanels"?"W":"kW"}`}
                      {p.efficiency !== undefined && ` · η=${p.efficiency}%`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-amber-400">{p.price} €</div>
                    <div className="text-[9px] opacity-30">{productCatalogTab==="windows"?"/m²":productCatalogTab==="pvPanels"?"/buc":"/buc"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[9px] opacity-20 mt-3 text-center">Prețuri orientative 2025-2026, fără TVA și montaj. Verificați la furnizor.</div>
          </div>
        </div>
      )}

      {showTour && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{background:"rgba(0,0,0,0.75)"}}>
          <div className="bg-[#1a1d2e] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="text-center">
              <span className="text-3xl">{["📋","🏗️","⚙️","☀️","📊","📜","🔍"][tourStep]}</span>
              <h3 className="text-lg font-bold mt-2">{[
                "1. Identificare clădire","2. Anvelopa termică","3. Instalații","4. Surse regenerabile",
                "5. Calcul energetic","6. Certificat CPE","7. Audit & Recomandări"
              ][tourStep]}</h3>
            </div>
            <p className="text-sm opacity-70 text-center">{[
              "Începe prin selectarea localității, categoriei clădirii și introducerea dimensiunilor (suprafață utilă, volum). Poți folosi butonul de estimare automată.",
              "Adaugă elementele anvelopei: pereți, planșee, ferestre. Folosește soluțiile tip predefinite sau importă din CSV. Verifică transmitanța U vs referința nZEB.",
              "Configurează sistemele de încălzire, ACM, climatizare, ventilare și iluminat. Randamentele se completează automat din bazele de date.",
              "Activează sursele regenerabile: panouri solare, fotovoltaic, pompe de căldură, biomasă. Calculul RER se face automat.",
              "Vizualizează bilanțul energetic lunar (ISO 13790), clasarea A+→G, costurile estimate și benchmarking-ul cu clădiri similare.",
              "Generează Certificatul de Performanță Energetică în format oficial Mc 001-2022. Completează datele auditorului și exportă PDF.",
              "Analizează recomandările automate de reabilitare cu 3 scenarii (minim/mediu/maxim), grafic amortizare pe 20 ani și radar performanță."
            ][tourStep]}</p>
            <div className="flex gap-3">
              {tourStep > 0 && <button onClick={function(){setTourStep(function(s){return s-1});}} className="flex-1 py-2 rounded-xl border border-white/10 text-sm">← Înapoi</button>}
              {tourStep < 6 ? (
                <button onClick={function(){setTourStep(function(s){return s+1});}} className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-medium text-sm">Următorul →</button>
              ) : (
                <button onClick={function(){setShowTour(false);setTourStep(0);}} className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-medium text-sm">Începe lucrul!</button>
              )}
            </div>
            <div className="flex justify-center gap-1">{[0,1,2,3,4,5,6].map(function(i){return <div key={i} className={cn("w-2 h-2 rounded-full",i===tourStep?"bg-amber-500":"bg-white/20")}/>})}</div>
          </div>
        </div>
      )}

      {/* ═══ MOBILE BOTTOM NAVIGATION BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-[9990] lg:hidden" style={{background:theme==="dark"?"rgba(10,10,26,0.95)":"rgba(245,247,250,0.95)",backdropFilter:"blur(12px)",borderTop:theme==="dark"?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.1)"}}>
        <div className="flex items-stretch overflow-x-auto" style={{scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => { setStep(s.id); setSidebarOpen(false); }}
              className="flex flex-col items-center justify-center flex-shrink-0 py-1.5 transition-all"
              style={{width: (100/STEPS.length)+"%", minWidth: "52px", opacity: step === s.id ? 1 : 0.45}}>
              <span className="text-base leading-none">{s.icon}</span>
              <span className="text-[8px] mt-0.5 font-medium leading-tight truncate w-full text-center px-0.5"
                style={{color: step === s.id ? "#f59e0b" : "inherit"}}>
                {lang==="EN" ? (s.labelEN||s.label) : s.label}
              </span>
              {step === s.id && <div className="w-4 h-0.5 rounded-full bg-amber-500 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>
      {/* Bottom nav spacer for mobile content */}
      <div className="h-14 lg:hidden" />

      {/* Project Manager Modal */}
      {/* Team Manager Modal */}
      {showTeamManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowTeamManager(false)}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-5 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()} style={theme==="light"?{background:"#fff",color:"#1a1a2e"}:{}}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">👥 Echipă</h3>
              <button onClick={() => setShowTeamManager(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>

            {!cloud?.isLoggedIn ? (
              <div className="text-center py-8 opacity-50 text-sm">Autentifică-te pentru a gestiona echipa.</div>
            ) : teamLoading ? (
              <div className="text-center py-8 opacity-40 text-sm animate-pulse">Se încarcă...</div>
            ) : !teamData ? (
              <div className="space-y-4">
                <div className="text-center py-4 opacity-50 text-sm">Nu faci parte din nicio echipă.</div>
                <div className="space-y-2">
                  <input type="text" id="team-name-input" placeholder="Numele echipei" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50" />
                  <button onClick={() => {
                    const name = document.getElementById("team-name-input")?.value;
                    if (name?.trim()) createTeam(name.trim());
                    else showToast("Introdu un nume pentru echipă.", "error");
                  }} className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all">
                    + Creează echipă nouă
                  </button>
                </div>
                <div className="text-[10px] opacity-30 text-center">Necesită plan Business</div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Team info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">🏢</div>
                  <div className="flex-1">
                    <div className="font-bold">{teamData.name}</div>
                    <div className="text-[10px] opacity-50">{teamData.members?.length || 0} membri · Plan {teamData.plan} · Rolul tău: {teamData.myRole}</div>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <div className="text-xs font-bold opacity-60 mb-2">MEMBRI</div>
                  <div className="space-y-1.5">
                    {(teamData.members || []).map(m => (
                      <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400">
                          {(m.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-[10px] opacity-40">{m.email}</div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded ${m.role === "owner" ? "bg-amber-500/20 text-amber-400" : m.role === "admin" ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/50"}`}>
                          {m.role}
                        </span>
                        {teamData.myRole === "owner" && m.user_id !== cloud.user?.id && (
                          <button onClick={() => removeTeamMember(m.user_id)}
                            className="w-6 h-6 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400/40 hover:text-red-400 text-xs">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending invitations */}
                {teamData.invitations?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold opacity-60 mb-2">INVITAȚII PENDING</div>
                    <div className="space-y-1">
                      {teamData.invitations.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2 p-2 rounded-lg border border-yellow-500/10 bg-yellow-500/5 text-xs">
                          <span className="text-yellow-400">📩</span>
                          <span className="flex-1 truncate">{inv.email}</span>
                          <span className="opacity-40">{inv.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite form */}
                {(teamData.myRole === "owner" || teamData.myRole === "admin") && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="text-xs font-bold opacity-60">INVITĂ MEMBRU NOU</div>
                    <div className="flex gap-2">
                      <input type="email" id="invite-email-input" placeholder="email@exemplu.ro" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50" />
                      <select id="invite-role-select" className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none" style={{color:"inherit"}}>
                        <option value="member">Membru</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <button onClick={() => {
                      const email = document.getElementById("invite-email-input")?.value;
                      const role = document.getElementById("invite-role-select")?.value;
                      if (email?.includes("@")) inviteTeamMember(email, role);
                      else showToast("Adresă email invalidă.", "error");
                    }} className="w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all">
                      Trimite invitație
                    </button>
                  </div>
                )}

                {/* Cloud projects */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold opacity-60">PROIECTE CLOUD</div>
                    <button onClick={loadCloudProjects} className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">Refresh</button>
                  </div>
                  {cloudProjects.length === 0 ? (
                    <div className="text-center py-3 opacity-30 text-xs">Niciun proiect în cloud.</div>
                  ) : (
                    <div className="space-y-1">
                      {cloudProjects.map(p => (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all"
                          onClick={() => { loadFromCloud(p.id); setShowTeamManager(false); }}>
                          <span className="text-xs">☁️</span>
                          <span className="flex-1 text-sm truncate">{p.name}</span>
                          <span className="text-[9px] opacity-30">{p.updated_at?.slice(0, 10)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProjectManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-5 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col" style={theme==="light"?{background:"#fff",color:"#1a1a2e"}:{}}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📁 Proiecte salvate</h3>
              <button onClick={() => setShowProjectManager(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                const name = (building.address || "Proiect " + new Date().toISOString().slice(0,10));
                saveProjectAs(name);
              }} className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all">
                ＋ Salvează proiectul curent
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {projectList.length === 0 && (
                <div className="text-center py-8 opacity-40 text-sm">Niciun proiect salvat.<br/>Folosește butonul de mai sus pentru a salva.</div>
              )}
              {projectList.map(p => (
                <div key={p.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  p.id === activeProjectId ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                )} onClick={() => loadProject(p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[10px] opacity-40 flex gap-2">
                      <span>{p.date}</span>
                      {p.category && <span>• {BUILDING_CATEGORIES.find(c=>c.id===p.category)?.label || p.category}</span>}
                    </div>
                  </div>
                  {p.id === activeProjectId && <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">activ</span>}
                  <button onClick={(e) => { e.stopPropagation(); if (p.id !== activeProjectId) deleteProject(p.id); else showToast("Nu poți șterge proiectul activ.", "error"); }}
                    className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400/50 hover:text-red-400 text-xs transition-all">🗑</button>
                </div>
              ))}
            </div>
            <div className="text-[10px] opacity-30 text-center pt-1 border-t border-white/5">
              Proiectele se salvează local în browser. Max ~20 proiecte.
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold">Proiect nou</h3>
              <p className="text-sm opacity-50 mt-2">Toate datele introduse vor fi șterse. Această acțiune nu poate fi anulată.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all">
                Anulează
              </button>
              <button onClick={resetProject}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-all">
                Șterge tot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

