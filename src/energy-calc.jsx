import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { renderAsync } from "docx-preview";
import ImportModal from "./import/ImportModal.jsx";
import ChatImport from "./components/ChatImport.jsx";
import ShareModal, { decodeShareableData } from "./components/ShareModal.jsx";
import QuickFillWizard from "./components/QuickFillWizard.jsx";

// ── Data imports ──
import CLIMATE_DB from "./data/climate.json";
import MATERIALS_DB from "./data/materials.json";
import THERMAL_BRIDGES_DB from "./data/thermal-bridges.json";
import { HEAT_SOURCES, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY, CONTROL_TYPES, FUELS, AMBIENT_ENERGY_FACTOR, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL, ACM_CONSUMPTION, LIGHTING_HOURS, SOLAR_THERMAL_TYPES, PV_TYPES, PV_INVERTER_ETA, TILT_FACTORS, ORIENT_FACTORS, BIOMASS_TYPES, BATTERY_STORAGE_TYPES } from "./data/constants.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, NZEB_THRESHOLDS, CO2_CLASSES_DB, WATER_TEMP_MONTH } from "./data/energy-classes.js";
import { APP_VERSION } from "./data/landingData.js";
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
import { calcGWPDetailed } from "./calc/gwp.js";
import { calcSmartRehab, getNzebEpMax } from "./calc/smart-rehab.js";
import { calcSRI, SRI_DOMAINS, CHP_TYPES, IEQ_CATEGORIES, RENOVATION_STAGES, MCCL_CATALOG, EV_CHARGER_RULES, calcEVChargers, checkSolarReady } from "./calc/epbd.js";
import { calcAirInfiltration, calcNaturalLighting } from "./calc/infiltration.js";
import { calcGroundHeatTransfer } from "./calc/ground.js";
import { calcACMen15316 } from "./calc/acm-en15316.js";
import { checkC107Conformity } from "./calc/c107.js";

// ── Extracted data modules (Sprint 3 → Faza 4 finalizare) ──
import { CONSTRUCTION_SOLUTIONS, GLAZING_DB, FRAME_DB, ORIENTATIONS, BUILDING_CATEGORIES, CPE_TEMPLATES, STRUCTURE_TYPES, ELEMENT_TYPES, CATEGORY_BASE_MAP, buildCatKey } from "./data/building-catalog.js";
import { U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_RENOV_RES, U_REF_RENOV_NRES, U_REF_GLAZING, U_REF_NZEB, U_REF_RENOV, getURefNZEB, ZEB_THRESHOLDS, ZEB_FACTOR, FP_ELEC, BACS_CLASSES, BACS_OBLIGATION_THRESHOLD_KW } from "./data/u-reference.js";
import { REHAB_COSTS, ZONE_COLORS, REHAB_COSTS_2025 } from "./data/rehab-costs.js";
import { TIERS } from "./data/tiers.js";
import { BENCHMARKS } from "./data/benchmarks.js";
import { INITIAL_BUILDING, INITIAL_HEATING, INITIAL_ACM, INITIAL_COOLING, INITIAL_VENTILATION, INITIAL_LIGHTING, INITIAL_SOLAR_TH, INITIAL_PV, INITIAL_HP, INITIAL_BIO, INITIAL_OTHER, INITIAL_BATTERY, INITIAL_AUDITOR } from "./data/initial-state.js";

// ── Hooks (Sprint 4 refactoring) ──
import { useEnvelopeSummary } from "./hooks/useEnvelopeSummary.js";
import { useInstallationSummary } from "./hooks/useInstallationSummary.js";
import { useRenewableSummary } from "./hooks/useRenewableSummary.js";
import { useAutoSync } from "./hooks/useAutoSync.js";
import { useOfflineMode } from "./hooks/useOfflineMode.js";

// ── Component imports ──
import { cn, Select, Input, Badge, Card, ResultRow } from "./components/ui.jsx";
import ThermalBridgeCatalog from "./components/ThermalBridgeCatalog.jsx";
import OpaqueModal from "./components/OpaqueModal.jsx";
import GlazingModal from "./components/GlazingModal.jsx";

// ── Step imports (all lazy-loaded for bundle splitting) ──
const Step1Identification = lazy(() => import("./steps/Step1Identification.jsx"));
const Step2Envelope = lazy(() => import("./steps/Step2Envelope.jsx"));
const Step3Systems = lazy(() => import("./steps/Step3Systems.jsx"));
const Step4Renewables = lazy(() => import("./steps/Step4Renewables.jsx"));
const Step5Calculation = lazy(() => import("./steps/Step5Calculation.jsx"));
const Step6Certificate = lazy(() => import("./steps/Step6Certificate.jsx"));
const Step7Audit = lazy(() => import("./steps/Step7Audit.jsx"));
const Step8Advanced = lazy(() => import("./steps/Step8Advanced.jsx"));
import BridgeModal from "./components/BridgeModal.jsx";
import TutorialWizard from "./components/TutorialWizard.jsx";
import ClientInputForm from "./components/ClientInputForm.jsx";
import AuditClientDataForm from "./components/AuditClientDataForm.jsx";
import ProjectTimeline from "./components/ProjectTimeline.jsx";
import ProjectComparison from "./components/ProjectComparison.jsx";
import ROICalculator from "./components/ROICalculator.jsx";
import CPETracker from "./components/CPETracker.jsx";
import AuditInvoice from "./components/AuditInvoice.jsx";
import { useKeyboardShortcuts, SHORTCUTS_LIST } from "./hooks/useKeyboardShortcuts.js";

function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }

// ── Constante inline eliminate → importate din data/ (Faza 4) ──
// CONSTRUCTION_SOLUTIONS, GLAZING_DB, FRAME_DB, ORIENTATIONS → building-catalog.js
// REHAB_COSTS, ZONE_COLORS, REHAB_COSTS_2025 → rehab-costs.js
// U_REF_*, ZEB_*, BACS_*, FP_ELEC → u-reference.js
// BUILDING_CATEGORIES, CPE_TEMPLATES, STRUCTURE_TYPES, ELEMENT_TYPES → building-catalog.js
// CATEGORY_BASE_MAP, buildCatKey → building-catalog.js
// TIERS → tiers.js
// INITIAL_* → initial-state.js





















async function fetchTemplate(filename) {
  const resp = await fetch("/templates/" + filename);
  if (!resp.ok) throw new Error("Template negăsit: " + filename);
  return await resp.arrayBuffer();
}










// ═══════════════════════════════════════════════════════════════
// ZEB (Zero Emission Building) — EPBD 2024/1275 Art.11
// Praguri estimate bazate pe transpunere (valorile vor fi actualizate)
// ═══════════════════════════════════════════════════════════════



// generateTMY și calcHourlyISO52016 → dezactivate (hourlyISO=null în useEnvelopeSummary)
// Reactivează în calc/weather.js + calc/hourly.js dacă se adaugă grafic orar în Step5



// ═══════════════════════════════════════════════════════════════
// BACS — Building Automation & Control (EPBD Art.14)
// Obligatoriu pt clădiri nerezidențiale >290kW utilă
// ═══════════════════════════════════════════════════════════════


// ── Map helpers (kept here because JSX uses geoToSvg directly) ──
function geoToSvg(lat, lon) {
  return { x: 10 + (lon - 20.2) * (480 / 9.6), y: 370 - (lat - 43.5) * (360 / 5.0) };
}
const ROMANIA_MAP_POINTS = buildRomaniaMapPoints(CLIMATE_DB, geoToSvg);

export default function EnergyCalcApp({ cloud }) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("RO");
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [showTutorial, setShowTutorial] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // TIER SYSTEM — Free / Pro / Business
  // ═══════════════════════════════════════════════════════════════
  // Prețuri RON; sursa: SCENARII_MONETIZARE_ZEPHREN v1.0, apr. 2026


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

  
  const [heating, setHeating] = useState({...INITIAL_HEATING});

  
  const [acm, setAcm] = useState({...INITIAL_ACM});

  
  const [cooling, setCooling] = useState({...INITIAL_COOLING});

  
  const [ventilation, setVentilation] = useState({...INITIAL_VENTILATION});

  
  const [lighting, setLighting] = useState({...INITIAL_LIGHTING});

  // ─── STEP 4 STATE ───
  const [renewSubTab, setRenewSubTab] = useState("solar_th");

  
  const [solarThermal, setSolarThermal] = useState({...INITIAL_SOLAR_TH});

  
  const [photovoltaic, setPhotovoltaic] = useState({...INITIAL_PV});

  
  const [heatPump, setHeatPump] = useState({...INITIAL_HP});

  
  const [biomass, setBiomass] = useState({...INITIAL_BIO});

  
  const [otherRenew, setOtherRenew] = useState({...INITIAL_OTHER});

  
  const [battery, setBattery] = useState({...INITIAL_BATTERY});

  // ─── STEP 6 STATE ───
  
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
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showROICalculator, setShowROICalculator] = useState(false);
  const [showCPETracker, setShowCPETracker] = useState(false);
  const [showAuditInvoice, setShowAuditInvoice] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hoveredClimate, setHoveredClimate] = useState(null);
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
  const [showClientForm, setShowClientForm] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAPIDoc, setShowAPIDoc] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("default");
  const [projectVersions, setProjectVersions] = useState([]); // versiuni pt proiectul selectat în manager
  const [expandedVersionProjectId, setExpandedVersionProjectId] = useState(null);

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
    const snapshot = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor,useNA2023,finAnalysisInputs});
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      return next.length > maxUndoLevels ? next.slice(-maxUndoLevels) : next;
    });
    setRedoStack([]);
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor,useNA2023,finAnalysisInputs]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor});
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
    if (prev.battery) setBattery(p => ({...INITIAL_BATTERY, ...prev.battery}));
    if (prev.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...prev.auditor}));
    showToast("Undo aplicat", "info", 1500);
  }, [undoStack, building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, showToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor});
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
    if (next.battery) setBattery(p => ({...INITIAL_BATTERY, ...next.battery}));
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
      var data = JSON.stringify({building:building,opaqueElements:opaqueElements,glazingElements:glazingElements,thermalBridges:thermalBridges,heating:heating,acm:acm,cooling:cooling,ventilation:ventilation,lighting:lighting,solarThermal:solarThermal,photovoltaic:photovoltaic,heatPump:heatPump,biomass:biomass,otherRenew:otherRenew,battery:battery,auditor:auditor,step:step});
      await window.storage.set("energopro-project", data);
      // Istoric versiuni — păstrăm ultimele 10
      try {
        var histRaw = await window.storage.get("energopro-history");
        var hist = histRaw && histRaw.value ? JSON.parse(histRaw.value) : [];
        hist.unshift({ ts: new Date().toISOString(), data: data });
        if (hist.length > 10) hist = hist.slice(0, 10);
        await window.storage.set("energopro-history", JSON.stringify(hist));
      } catch(eh) { /* history save failed */ }
      setStorageStatus((lang==="EN"?"Saved":"Salvat") + " " + new Date().toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"}));
    } catch(e) { /* storage unavailable */ }
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor,step]);

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
        if (d.battery) setBattery(function(p) { return Object.assign({}, INITIAL_BATTERY, p, d.battery); });
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
  }), [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor,step]);

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

  // ── Versioning ──────────────────────────────────────────────────────────────
  const saveVersion = useCallback(async (projectId, label) => {
    if (typeof window === "undefined" || !window.storage) return;
    const data = getProjectData();
    const ts = Date.now();
    const key = "ep-ver:" + projectId + ":" + ts;
    const payload = { ...data, meta: { label: label || "Versiune " + new Date(ts).toLocaleString("ro-RO"), ts, projectId } };
    try {
      await window.storage.set(key, JSON.stringify(payload));
      const res = await window.storage.list("ep-ver:" + projectId + ":");
      if (res && res.keys && res.keys.length > 10) {
        const sorted = [...res.keys].sort();
        for (const old of sorted.slice(0, sorted.length - 10)) { await window.storage.delete(old); }
      }
    } catch(e) {}
  }, [getProjectData]);

  const listVersions = useCallback(async (projectId) => {
    if (typeof window === "undefined" || !window.storage) return [];
    try {
      const res = await window.storage.list("ep-ver:" + projectId + ":");
      if (!res || !res.keys) return [];
      const versions = [];
      for (const key of res.keys) {
        try {
          const r = await window.storage.get(key);
          if (r && r.value) {
            const d = JSON.parse(r.value);
            versions.push({ key, ts: d.meta?.ts || 0, label: d.meta?.label || "—", data: d });
          }
        } catch(e) {}
      }
      return versions.sort((a, b) => b.ts - a.ts);
    } catch(e) { return []; }
  }, []);

  const restoreProjectVersion = useCallback(async (versionData) => {
    loadProjectData(versionData);
    showToast("Versiune restaurată: " + (versionData.meta?.label || "—"), "success");
    setExpandedVersionProjectId(null);
  }, [loadProjectData, showToast]);

  const saveProjectAs = useCallback(async (name) => {
    if (typeof window === "undefined" || !window.storage) return;
    const id = "p" + Date.now().toString(36);
    const data = getProjectData();
    const payload = { ...data, meta: { name: name || building.address || "Proiect", date: new Date().toISOString().slice(0,10), id } };
    try {
      await window.storage.set("ep-proj:" + id, JSON.stringify(payload));
      setActiveProjectId(id);
      await refreshProjectList();
      // Creăm prima versiune automată
      await saveVersion(id, "Versiune inițială");
      showToast("Proiect salvat: " + (name || building.address), "success");
    } catch(e) { showToast("Eroare salvare: " + e.message, "error"); }
  }, [getProjectData, building.address, refreshProjectList, saveVersion, showToast]);

  const saveCurrentProject = useCallback(async (createVersion = false) => {
    if (typeof window === "undefined" || !window.storage) return;
    const data = getProjectData();
    const payload = { ...data, meta: { name: building.address || "Proiect", date: new Date().toISOString().slice(0,10), id: activeProjectId } };
    try {
      await window.storage.set("ep-proj:" + activeProjectId, JSON.stringify(payload));
      if (createVersion) { await saveVersion(activeProjectId); }
      showToast(createVersion ? "Versiune salvată." : "Salvat.", "success", 1500);
    } catch(e) {}
  }, [getProjectData, building.address, activeProjectId, saveVersion, showToast]);

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
      // Ștergem și versiunile
      try {
        const vRes = await window.storage.list("ep-ver:" + id + ":");
        if (vRes && vRes.keys) { for (const k of vRes.keys) { await window.storage.delete(k); } }
      } catch(e) {}
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

  // Auto-import din URL ?import=<base64> (ShareModal)
  useEffect(function() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("import");
    if (!encoded) return;
    try {
      const compressed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      const data = decodeShareableData(compressed);
      if (!data) return;
      pushUndo();
      if (data.building && Object.keys(data.building).length) setBuilding(p => ({...INITIAL_BUILDING, ...p, ...data.building}));
      if (data.opaqueElements?.length) setOpaqueElements(data.opaqueElements);
      if (data.glazingElements?.length) setGlazingElements(data.glazingElements);
      if (data.thermalBridges?.length) setThermalBridges(data.thermalBridges);
      if (data.heating && Object.keys(data.heating).length) setHeating(p => ({...INITIAL_HEATING, ...p, ...data.heating}));
      if (data.acm && Object.keys(data.acm).length) setAcm(p => ({...INITIAL_ACM, ...p, ...data.acm}));
      if (data.cooling && Object.keys(data.cooling).length) setCooling(p => ({...INITIAL_COOLING, ...p, ...data.cooling}));
      if (data.ventilation && Object.keys(data.ventilation).length) setVentilation(p => ({...INITIAL_VENTILATION, ...p, ...data.ventilation}));
      if (data.lighting && Object.keys(data.lighting).length) setLighting(p => ({...INITIAL_LIGHTING, ...p, ...data.lighting}));
      if (data.solarThermal?.enabled !== undefined) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...p, ...data.solarThermal}));
      if (data.photovoltaic?.enabled !== undefined) setPhotovoltaic(p => ({...INITIAL_PV, ...p, ...data.photovoltaic}));
      if (data.heatPump?.enabled !== undefined) setHeatPump(p => ({...INITIAL_HP, ...p, ...data.heatPump}));
      if (data.biomass?.enabled !== undefined) setBiomass(p => ({...INITIAL_BIO, ...p, ...data.biomass}));
      // Curăță URL-ul
      window.history.replaceState({}, "", window.location.pathname);
      showToast("Proiect încărcat din link de partajare", "success");
    } catch (e) {
      console.warn("URL import failed:", e);
    }
  }, []); // eslint-disable-line

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
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,battery,auditor]);

  // ─── RESET ALL (Proiect Nou) ───
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [energyPrices, setEnergyPrices] = useState({gaz:0.31, electricitate:1.29, gpl:1.58, motorina:1.22, carbune:0.24, biomasa:0.21, lemn_foc:0.17, termoficare:0.44});
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
      address: "Bd. Unirii nr. 48, Bl. C12, Sc. 1, Et. 4, Ap. 18",
      city: "București", county: "București", postalCode: "030826",
      category: "RA", structure: "Panouri mari prefabricate PAFP (3 straturi BA + PS + BA, blocuri comuniste 1965–1989)",
      yearBuilt: "1978", yearRenov: "",
      floors: "P+8", basement: true, attic: false,
      units: "3", stairs: "1",
      areaUseful: "65", volume: "176", areaEnvelope: "115",
      heightBuilding: "25.2", heightFloor: "2.70",
      locality: "București",
      perimeter: "36.0", n50: "3.8", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "vanzare", parkingSpaces: "0",
    });
    setOpaqueElements([
      { name: "Perete ext. S — panel PAFP 3 straturi 30cm (neizolat)", type: "PE", orientation: "S", area: "22", layers: [
        { matName: "Strat BA ext. 6cm", material: "Beton armat", thickness: "60", lambda: 1.74, rho: 2400 },
        { matName: "Polistiren expandat 14cm", material: "Polistiren expandat EPS 100", thickness: "140", lambda: 0.040, rho: 25 },
        { matName: "Strat BA int. 8cm", material: "Beton armat", thickness: "80", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Perete ext. V — panel PAFP (colț neizolat)", type: "PE", orientation: "V", area: "18", layers: [
        { matName: "Strat BA ext. 6cm", material: "Beton armat", thickness: "60", lambda: 1.74, rho: 2400 },
        { matName: "Polistiren expandat 14cm", material: "Polistiren expandat EPS 100", thickness: "140", lambda: 0.040, rho: 25 },
        { matName: "Strat BA int. 8cm", material: "Beton armat", thickness: "80", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială int.", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu intermediar BA (ap. etaj 4, curent)", type: "PI", orientation: "Orizontal", area: "65", layers: [
        { matName: "Parchet laminat 1cm", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment 4cm", material: "Șapă ciment", thickness: "40", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu vitraj (înlocuite de proprietar 2018)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.40", g: "0.60", area: "10.2", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC dublu vitraj — Vest", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "1.40", g: "0.60", area: "4.5", orientation: "V", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Consolă balcon BA nearmat termic", type: "Joncțiuni pereți", psi: "0.70", length: "3.6" },
      { name: "Rosturi panel PAFP — orizontale (8 niveluri)", type: "Joncțiuni pereți", psi: "0.18", length: "72" },
      { name: "Rosturi panel PAFP — verticale", type: "Joncțiuni pereți", psi: "0.12", length: "27" },
      { name: "Glaf ferestre PVC dublu", type: "Ferestre", psi: "0.06", length: "24" },
      { name: "Prag ușă balcon", type: "Ferestre", psi: "0.12", length: "1.8" },
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
      pipeLength: "5", pipeInsulated: false,
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
      name: "ing. Ionescu Mihai-Dan",
      atestat: "CT-01124",
      grade: "II",
      company: "CertEnergo Consulting SRL",
      phone: "0721 456 789",
      email: "ionescu@certenergo.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Apartament 3 camere, et. 4, bloc P+8 din 1978, structură panouri mari prefabricate PAFP (3 straturi BA+PS+BA), sector 3 București. Pereți exteriori panel prefabricat fără termoizolație suplimentară — blocul nu a beneficiat de programul de reabilitare. Rosturi panel semnificative (punți termice majore). Proprietarul a înlocuit tâmplăria cu PVC dublu vitraj în 2018. Centrală murală gaz cu condensare 24kW (2022), preparare instantanee ACM, radiatoare oțel panou cu robineți termostatici. Ventilare naturală prin fante tâmplărie. TEMPLATE CPE: 4-CPE-apartament-bloc. Clasa energetică estimată C-D.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 1 încărcat — CPE 4 · Apartament bloc PAFP P+8 '78 București · cazan gaz 24kW · fără izolație · Clasă C-D.", "success", 5000);
  }, [pushUndo, showToast]);


  // ═══════════════════════════════════════════════════════════
  // DEMO 2 — Casă individuală P+1 nZEB 2023 Timișoara — RECEPȚIE
  // Template CPE 5: clădire de locuit individuală (RI)
  // BCA confinată 30cm + EPS 15cm, PC aer-apă 10kW, PV 8kWp, HR 85%. Clasă A.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo2 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Constructorilor nr. 22",
      city: "Timișoara", county: "Timiș", postalCode: "300722",
      category: "RI", structure: "Zidărie portantă — BCA cu stâlpișori și centuri BA (zidărie confinată, CR6:2013)",
      yearBuilt: "2023", yearRenov: "",
      floors: "P+1", basement: false, attic: false,
      units: "1", stairs: "1",
      areaUseful: "148", volume: "414", areaEnvelope: "395",
      heightBuilding: "6.80", heightFloor: "2.80",
      locality: "Timișoara",
      perimeter: "42.0", n50: "0.6", shadingFactor: "0.92",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "receptie", parkingSpaces: "2",
    });
    setOpaqueElements([
      { name: "Pereți ext. BCA confinat 30cm + EPS grafitat 15cm ETICS (S+E+V)", type: "PE", orientation: "S", area: "82", layers: [
        { matName: "Tencuială decorativă silicatică 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS grafitat 15cm λ=0,032", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.032, rho: 25 },
        { matName: "BCA confinat 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.18, rho: 500 },
        { matName: "Tencuială interior 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Perete ext. N — BCA 30cm + EPS grafitat 15cm", type: "PE", orientation: "N", area: "38", layers: [
        { matName: "Tencuială decorativă silicatică 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS grafitat 15cm λ=0,032", material: "Polistiren expandat EPS 100", thickness: "150", lambda: 0.032, rho: 25 },
        { matName: "BCA confinat 30cm", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.18, rho: 500 },
        { matName: "Tencuială interior 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă plată inversă — XPS 18cm + membrană", type: "PT", orientation: "Orizontal", area: "74", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "XPS 18cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "180", lambda: 0.034, rho: 35 },
        { matName: "Membrană hidroizolație bitum", material: "Bitum (membrană)", thickness: "8", lambda: 0.17, rho: 1050 },
        { matName: "Beton armat 18cm", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Placă pe sol — XPS 10cm + șapă radiantă", type: "PL", orientation: "Orizontal", area: "74", layers: [
        { matName: "Gresie ceramică 1cm", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă armată 6cm cu țeavă radiantă", material: "Șapă ciment", thickness: "60", lambda: 1.40, rho: 2000 },
        { matName: "XPS 10cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "100", lambda: 0.034, rho: 35 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
        { matName: "Strat nisip compactat 10cm", material: "Pietriș sau balast", thickness: "100", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre triplu vitraj Low-E argon — Sud + Est + Vest", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6 camere)", u: "0.80", g: "0.50", area: "24.5", orientation: "S", frameRatio: "20" },
      { name: "Ferestre triplu vitraj Low-E — Nord", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6 camere)", u: "0.80", g: "0.50", area: "8.0", orientation: "N", frameRatio: "20" },
    ]);
    setThermalBridges([
      { name: "Stâlpișori BA confinați perimetrali (16 buc.)", type: "Joncțiuni pereți", psi: "0.15", length: "44" },
      { name: "Centuri BA perimetrale (P+1 = 2 niveluri)", type: "Joncțiuni pereți", psi: "0.10", length: "84" },
      { name: "Soclu izolat XPS 10cm perimetral", type: "Joncțiuni pereți", psi: "0.10", length: "42" },
      { name: "Glafuri ferestre triplu vitraj PVC", type: "Ferestre", psi: "0.02", length: "58" },
    ]);
    setHeating({
      source: "PC_AA", power: "10", eta_gen: "4.20",
      nominalPower: "10",
      emission: "PARD", eta_em: "0.97",
      distribution: "BINE_INT", eta_dist: "0.97",
      control: "INTELIG", eta_ctrl: "0.97",
      regime: "intermitent", theta_int: "20", nightReduction: "2",
      tStaircase: "", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "PC_ACM", consumers: "4", dailyLiters: "50",
      storageVolume: "200", storageLoss: "0.8",
      pipeLength: "12", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "PC_RACIRE", power: "8", eer: "4.50", cooledArea: "148", distribution: "BINE_INT", hasCooling: true });
    setVentilation({ type: "MEC_HR85", airflow: "220", fanPower: "60", operatingHours: "8760", hrEfficiency: "85" });
    setLighting({
      type: "LED", pDensity: "4.0", controlType: "SENZ",
      fCtrl: "0.85", operatingHours: "2000", naturalLightRatio: "35",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "40", orientation: "S", tilt: "30",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "8", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "4.20",
      scopHeating: "3.80", covers: "heating_acm",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Popa Cristina-Daniela",
      atestat: "CT-02450",
      grade: "I",
      company: "nZEB Certificare Energetică SRL",
      phone: "0756 123 456",
      email: "popa@nzeb-cert.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Casă unifamilială P+1 nouă, 2023, Timișoara. Structură zidărie BCA confinată (stâlpișori + centuri BA) conform CR6:2013. ETICS EPS grafitat 15cm, terasă inversă XPS 18cm, placă sol XPS 10cm + pardoseală radiantă. Tâmplărie PVC 6 camere triplu vitraj Low-E (U=0,80 W/m²K, g=0,50). Pompă de căldură aer-apă Daikin Altherma 10kW (COP=4,20) pentru încălzire + ACM, cu boiler 200L. Ventilație mecanică controlată cu recuperare căldură 85% (MVHR Zehnder ComfoAir Q350). PV 8kWp monocristalin. Pardoseală radiantă. n50=0,6 h⁻¹ (blower door test). TEMPLATE CPE: 5-CPE-cladire-locuit-individuala. Clasă energetică A — cerințe nZEB îndeplinite.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 2 încărcat — CPE 5 · Casă RI BCA P+1 nZEB 2023 Timișoara · PC aer-apă + PV 8kWp + HR 85% · Clasă A.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 3 — Bloc de locuințe P+7 din 1975, reabilitat termic 2018, Iași — LOCUIT
  // Template CPE 6: clădire de locuit colectivă (RC)
  // Diafragme BA monolit, termoficare, ETICS EPS 8cm, PV 15kWp. Clasă C.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo3 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Sărăriei nr. 110, Bl. B22",
      city: "Iași", county: "Iași", postalCode: "700284",
      category: "RC", structure: "Diafragme (pereți structurali) din beton armat monolit (blocuri turn, 1965–1990)",
      yearBuilt: "1975", yearRenov: "2018",
      floors: "P+7", basement: true, attic: false,
      units: "32", stairs: "2",
      areaUseful: "2048", volume: "5734", areaEnvelope: "2200",
      heightBuilding: "23.2", heightFloor: "2.70",
      locality: "Iași",
      perimeter: "68.0", n50: "2.8", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "24",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+V — diafragme BA 18cm + EPS 8cm ETICS (reab. 2018)", type: "PE", orientation: "S", area: "580", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 8cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "80", lambda: 0.036, rho: 25 },
        { matName: "Diafragmă BA 18cm", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială var-ciment interior", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+E — diafragme BA 18cm + EPS 8cm", type: "PE", orientation: "N", area: "420", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 8cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "80", lambda: 0.036, rho: 25 },
        { matName: "Diafragmă BA 18cm", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială var-ciment interior", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă plată BA 16cm + EPS 12cm (reab. 2018)", type: "PT", orientation: "Orizontal", area: "256", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Membrană bitum 2 straturi", material: "Bitum (membrană)", thickness: "8", lambda: 0.17, rho: 1050 },
        { matName: "EPS 12cm (adăugat la reab.)", material: "Polistiren expandat EPS 100", thickness: "120", lambda: 0.036, rho: 25 },
        { matName: "Beton armat 16cm", material: "Beton armat", thickness: "160", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială interior", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol subsol tehnic — BA 10cm", type: "PB", orientation: "Orizontal", area: "256", layers: [
        { matName: "Gresie ceramică 1cm", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 10cm", material: "Beton armat", thickness: "100", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Tâmplărie PVC dublu Low-E (înlocuită la reabilitare 2018)", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.20", g: "0.55", area: "340", orientation: "Mixt", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Diafragme BA — planșee intermediare (7 niveluri)", type: "Joncțiuni pereți", psi: "0.12", length: "952" },
      { name: "Terasă — atic reabilitat", type: "Acoperiș", psi: "0.10", length: "68" },
      { name: "Soclu — izolat XPS 8cm la reabilitare", type: "Joncțiuni pereți", psi: "0.12", length: "68" },
      { name: "Glafuri tâmplărie PVC", type: "Ferestre", psi: "0.04", length: "540" },
    ]);
    setHeating({
      source: "TERMO", power: "350", eta_gen: "0.88",
      nominalPower: "350",
      emission: "RAD_OT", eta_em: "0.90",
      distribution: "SLAB_INT", eta_dist: "0.85",
      control: "REPARTIT", eta_ctrl: "0.88",
      regime: "continuu", theta_int: "20", nightReduction: "0",
      tStaircase: "14", tBasement: "8", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "128", dailyLiters: "50",
      storageVolume: "2000", storageLoss: "2.5",
      pipeLength: "45", pipeInsulated: true,
      circRecirculation: true, circHours: "16",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "LED", pDensity: "4.5", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "1600", naturalLightRatio: "25",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "75", orientation: "S", tilt: "10",
      inverterType: "STD", inverterEta: "0.95",
      peakPower: "15", usage: "autoconsum",
    });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Dănilă Florin-Andrei",
      atestat: "CT-01887",
      grade: "II",
      company: "Audit Termo Moldova SRL",
      phone: "0740 234 567",
      email: "danila@auditmoldova.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Bloc de locuințe P+7, 32 apartamente, 2 scări, Au=2048 m², Iași, construit 1975. Structură diafragme BA monolit (pereți structurali turnați). Reabilitare termică 2018: ETICS EPS 8cm pe fațade, EPS 12cm pe terasă, înlocuire tâmplărie PVC dublu Low-E, reabilitare subsol tehnic. Termoficare urbană SACET Iași cu repartitoare costuri pe radiatoare. PV 15kWp pe terasă (autoproducție). TEMPLATE CPE: 6-CPE-cladire-locuit-colectiva. Clasă energetică C.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 3 încărcat — CPE 6 · Bloc RC diafragme BA P+7 reab. 2018 Iași · termoficare + PV 15kWp · Clasă C.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 4 — Clădire birouri P+4 2022 Brașov — ÎNCHIRIERE
  // Template CPE 7: clădire de birouri (BI)
  // Structură metalică cadre oțel + fațadă cortină, VRF, PV 50kWp, HR 80%. Clasă A.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo4 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Lung nr. 15, Business Park Brașov",
      city: "Brașov", county: "Brașov", postalCode: "500091",
      category: "BI", structure: "Structură metalică — cadre oțel cu pereți cortină / panouri sandwich (post-1990)",
      yearBuilt: "2022", yearRenov: "",
      floors: "P+4", basement: true, attic: false,
      units: "1", stairs: "2",
      areaUseful: "5400", volume: "19440", areaEnvelope: "6000",
      heightBuilding: "16.50", heightFloor: "3.20",
      locality: "Brașov",
      perimeter: "140", n50: "1.0", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "inchiriere", parkingSpaces: "80",
    });
    setOpaqueElements([
      { name: "Fațadă cortină — panou opac (spandrel) vată bazaltică 18cm", type: "PE", orientation: "S", area: "900", layers: [
        { matName: "Panou aluminiu compozit 4mm", material: "Aluminiu", thickness: "4", lambda: 160.0, rho: 2700 },
        { matName: "Vată minerală bazaltică 18cm λ=0,035", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.035, rho: 100 },
        { matName: "Gips-carton 12mm interior", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
      ]},
      { name: "Pereți ext. opaci N+E+V — vată bazaltică 18cm", type: "PE", orientation: "N", area: "680", layers: [
        { matName: "Panou aluminiu compozit 4mm", material: "Aluminiu", thickness: "4", lambda: 160.0, rho: 2700 },
        { matName: "Vată minerală bazaltică 18cm λ=0,035", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.035, rho: 100 },
        { matName: "Gips-carton 12mm interior", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
      ]},
      { name: "Terasă verde extensivă — XPS 20cm + membrană", type: "PT", orientation: "Orizontal", area: "1080", layers: [
        { matName: "Substrat vegetal 10cm", material: "Pământ uscat", thickness: "100", lambda: 0.40, rho: 1500 },
        { matName: "Strat drenaj pietriș", material: "Pietriș sau balast", thickness: "40", lambda: 0.70, rho: 1800 },
        { matName: "Membrană antiradiculară bitum", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "XPS 20cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "200", lambda: 0.034, rho: 35 },
        { matName: "Beton armat 25cm", material: "Beton armat", thickness: "250", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Placă pe sol — BA 20cm + XPS 12cm", type: "PL", orientation: "Orizontal", area: "1080", layers: [
        { matName: "Gresie porțelanată 1cm", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă armată cu fibre 8cm", material: "Șapă ciment", thickness: "80", lambda: 1.40, rho: 2000 },
        { matName: "XPS 12cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "120", lambda: 0.034, rho: 35 },
        { matName: "Radier beton armat 20cm", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Fațadă cortină triplu vitraj Low-E argon — Sud (50% din suprafață)", glazingType: "Triplu vitraj Low-E", frameType: "Aluminiu cu RPT", u: "0.90", g: "0.30", area: "850", orientation: "S", frameRatio: "15" },
      { name: "Fațadă cortină triplu vitraj Low-E — N+E+V", glazingType: "Triplu vitraj Low-E", frameType: "Aluminiu cu RPT", u: "0.90", g: "0.30", area: "680", orientation: "N", frameRatio: "15" },
    ]);
    setThermalBridges([
      { name: "Ancoraje fațadă cortină oțel inox (punct termic)", type: "Joncțiuni pereți", psi: "0.04", length: "900" },
      { name: "Planșee intermediare BA — 4 niveluri", type: "Joncțiuni pereți", psi: "0.06", length: "560" },
      { name: "Terasă — glaf exterior perimetral izolat", type: "Acoperiș", psi: "0.07", length: "140" },
      { name: "Soclu — izolat perimetral XPS 12cm", type: "Joncțiuni pereți", psi: "0.08", length: "140" },
    ]);
    setHeating({
      source: "PC_AA", power: "200", eta_gen: "3.80",
      nominalPower: "200",
      emission: "VENT_CONV", eta_em: "0.93",
      distribution: "BINE_INT", eta_dist: "0.95",
      control: "INTELIG", eta_ctrl: "0.97",
      regime: "intermitent", theta_int: "21", nightReduction: "5",
      tStaircase: "", tBasement: "12", tAttic: "",
    });
    setAcm({
      source: "BOILER_E", consumers: "120", dailyLiters: "10",
      storageVolume: "1000", storageLoss: "2.0",
      pipeLength: "60", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "VRF", power: "250", eer: "4.20",
      cooledArea: "5400", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR80", airflow: "9000", fanPower: "3200",
      operatingHours: "2800", hrEfficiency: "80",
    });
    setLighting({
      type: "LED_PRO", pDensity: "3.0", controlType: "BMS",
      fCtrl: "0.50", operatingHours: "2500", naturalLightRatio: "45",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "250", orientation: "S", tilt: "10",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "50", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "3.80",
      scopHeating: "3.50", covers: "heating",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Rusu Mădălin-Ionuț",
      atestat: "CT-02601",
      grade: "I",
      company: "Green Buildings Consulting SRL",
      phone: "0768 345 678",
      email: "rusu@greenbuild.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Clădire birouri Class A P+4 cu subsol tehnic, Brașov, 2022. Structură cadre oțel + fațadă cortină aluminiu cu RPT (triplu vitraj Low-E argon, U=0,90 W/m²K, g=0,30). Sistem VRF Mitsubishi 250kW (EER=4,20). UTA cu recuperare căldură η=80%, debit 9000 m³/h. PV 50kWp pe terasă verde extensivă. Iluminat LED profesional BMS Siemens DESIGO, senzori prezență și daylight harvesting. Subsol tehnic cu PL XPS 12cm. n50=1,0 h⁻¹. Scop CPE: închiriere. TEMPLATE CPE: 7-CPE-cladire-birouri. Clasă energetică A.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 4 încărcat — CPE 7 · Birouri BI cadre oțel P+4 2022 Brașov · VRF + PV 50kWp + HR 80% · Clasă A.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 5 — Școală generală P+1+M reabilitată 2021 Cluj-Napoca — EDUCAȚIE
  // Template CPE 8: clădire de învățământ (SC — școală primară/gimnaziu)
  // Cadre+fâșii prefabricate, GVP 38cm + EPS 10cm, gaz condensare, HR 60%. Clasă B.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo5 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Avram Iancu nr. 84",
      city: "Cluj-Napoca", county: "Cluj", postalCode: "400083",
      category: "SC", structure: "Structură prefabricată — cadre + fâșii prefabricate (școli, spitale tip)",
      yearBuilt: "1972", yearRenov: "2021",
      floors: "P+1+M", basement: false, attic: true,
      units: "1", stairs: "2",
      areaUseful: "1850", volume: "7400", areaEnvelope: "2800",
      heightBuilding: "11.20", heightFloor: "3.30",
      locality: "Cluj-Napoca",
      perimeter: "110", n50: "2.0", shadingFactor: "0.80",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "15",
    });
    setOpaqueElements([
      { name: "Pereți ext. cărămidă GVP 38cm + EPS 10cm ETICS (reab. 2021) — S+V", type: "PE", orientation: "S", area: "460", layers: [
        { matName: "Tencuială decorativă 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "Cărămidă cu goluri GVP 38cm", material: "Cărămidă cu goluri (GVP)", thickness: "380", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială var-ciment int. 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+E — GVP 38cm + EPS 10cm", type: "PE", orientation: "N", area: "380", layers: [
        { matName: "Tencuială decorativă 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "Cărămidă cu goluri GVP 38cm", material: "Cărămidă cu goluri (GVP)", thickness: "380", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială var-ciment int. 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pod mansardă — vată minerală 25cm (izolat la planșeu)", type: "PP", orientation: "Orizontal", area: "550", layers: [
        { matName: "Tavan gips-carton 12mm", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
        { matName: "Vată minerală 25cm λ=0,035", material: "Vată minerală de sticlă", thickness: "250", lambda: 0.035, rho: 15 },
        { matName: "Beton armat planșeu 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Placă pe sol parter — BA 10cm fără izolație (reabilitare parțială)", type: "PL", orientation: "Orizontal", area: "550", layers: [
        { matName: "Parchet lemn 2cm", material: "Parchet lemn", thickness: "20", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 10cm", material: "Beton armat", thickness: "100", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 15cm", material: "Pietriș sau balast", thickness: "150", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu Low-E (înlocuite la reabilitare 2021) — S+V", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.20", g: "0.55", area: "185", orientation: "S", frameRatio: "20" },
      { name: "Ferestre PVC dublu Low-E — N+E", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.20", g: "0.55", area: "145", orientation: "N", frameRatio: "20" },
    ]);
    setThermalBridges([
      { name: "Stâlpi prefabricați BA (punte termică reziduală post-ETICS)", type: "Joncțiuni pereți", psi: "0.20", length: "220" },
      { name: "Grinzi prefabricate + planșeu nivel 1", type: "Joncțiuni pereți", psi: "0.15", length: "110" },
      { name: "Soclu — XPS 8cm izolat la reabilitare", type: "Joncțiuni pereți", psi: "0.12", length: "110" },
      { name: "Glafuri ferestre PVC (săli de clasă)", type: "Ferestre", psi: "0.04", length: "440" },
    ]);
    setHeating({
      source: "GAZ_COND", power: "200", eta_gen: "0.97",
      nominalPower: "200",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.90",
      control: "TERMO_AMB", eta_ctrl: "0.95",
      regime: "intermitent", theta_int: "20", nightReduction: "5",
      tStaircase: "15", tBasement: "", tAttic: "8",
    });
    setAcm({
      source: "CAZAN_H", consumers: "50", dailyLiters: "10",
      storageVolume: "300", storageLoss: "1.5",
      pipeLength: "40", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({
      type: "MEC_HR60", airflow: "3200", fanPower: "1100",
      operatingHours: "1800", hrEfficiency: "60",
    });
    setLighting({
      type: "LED", pDensity: "6.0", controlType: "SENZ",
      fCtrl: "0.90", operatingHours: "1800", naturalLightRatio: "40",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Mureșan Ovidiu-Călin",
      atestat: "CT-01342",
      grade: "II",
      company: "Audit Energetic Transilvania SRL",
      phone: "0744 890 123",
      email: "muresan@audit-transil.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Școală generală P+1+M, 1972, Cluj-Napoca. Structură prefabricată cadre+fâșii BA (tip uzual școli comuniste). Reabilitare energetică 2021 prin PNRR: ETICS EPS 10cm fațade, vată minerală 25cm pod mansardă, înlocuire tâmplărie PVC dublu Low-E, centrală gaz condensare 200kW, ventilație mecanică cu recuperare căldură 60% pentru 18 săli de clasă. Iluminat LED cu senzori prezență. Fără răcire mecanică. TEMPLATE CPE: 8-CPE-cladire-invatamant. Clasă energetică B.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 5 încărcat — CPE 8 · Școală SC cadre prefabricate P+1+M reab. 2021 Cluj · gaz 200kW + HR 60% · Clasă B.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 6 — Policlinică P+2 din 1968 Galați — SANITAR
  // Template CPE 9: clădire sanitară (SA — clinică ambulatorie)
  // Cadre BA monolit, cărămidă 35cm neizolat, termoficare, fără HR. Clasă D.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo6 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Brăilei nr. 177",
      city: "Galați", county: "Galați", postalCode: "800578",
      category: "SA", structure: "Cadre din beton armat monolit (stâlpi + grinzi + planșee, 1960–prezent)",
      yearBuilt: "1968", yearRenov: "",
      floors: "P+2", basement: true, attic: false,
      units: "1", stairs: "2",
      areaUseful: "2100", volume: "6510", areaEnvelope: "2600",
      heightBuilding: "10.50", heightFloor: "3.20",
      locality: "Galați",
      perimeter: "88", n50: "5.5", shadingFactor: "0.75",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "20",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+V — cărămidă plină 35cm (neizolat)", type: "PE", orientation: "S", area: "640", layers: [
        { matName: "Tencuială ext. var-ciment 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 35cm", material: "Cărămidă plină arsă (290/240 mm)", thickness: "350", lambda: 0.77, rho: 1800 },
        { matName: "Tencuială int. var-ciment 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+E — cărămidă plină 35cm (neizolat)", type: "PE", orientation: "N", area: "520", layers: [
        { matName: "Tencuială ext. var-ciment 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 35cm", material: "Cărămidă plină arsă (290/240 mm)", thickness: "350", lambda: 0.77, rho: 1800 },
        { matName: "Tencuială int. var-ciment 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă plată BA + bitum fără izolație termică (1968)", type: "PT", orientation: "Orizontal", area: "700", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Membrană bitum 2 straturi", material: "Bitum (membrană)", thickness: "8", lambda: 0.17, rho: 1050 },
        { matName: "Beton armat planșeu 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială interior tavan", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Placă pe sol / subsol tehnic — BA 12cm fără izolație", type: "PB", orientation: "Orizontal", area: "700", layers: [
        { matName: "Linoleum medical 3mm", material: "Parchet lemn", thickness: "3", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment nivelată 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 12cm", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Tâmplărie aluminiu fără RPT dublu (înlocuire parțială 2005) — S+V", glazingType: "Dublu vitraj", frameType: "Aluminiu fără RPT", u: "2.80", g: "0.65", area: "210", orientation: "S", frameRatio: "30" },
      { name: "Ferestre lemn simplu vitraj originale (neînlocuite) — N+E", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.50", g: "0.85", area: "180", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Stâlpi BA cadre exteriori (125 buc.)", type: "Joncțiuni pereți", psi: "0.45", length: "1250" },
      { name: "Grinzi BA planșee intermediare (2 niveluri)", type: "Joncțiuni pereți", psi: "0.20", length: "176" },
      { name: "Terasă — atic beton fără izolație", type: "Acoperiș", psi: "0.35", length: "88" },
      { name: "Glafuri aluminiu fără RPT", type: "Ferestre", psi: "0.08", length: "300" },
    ]);
    setHeating({
      source: "TERMO", power: "280", eta_gen: "0.82",
      nominalPower: "280",
      emission: "RAD_OT", eta_em: "0.88",
      distribution: "SLAB_INT", eta_dist: "0.82",
      control: "FARA", eta_ctrl: "0.82",
      regime: "continuu", theta_int: "22", nightReduction: "0",
      tStaircase: "18", tBasement: "12", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "80", dailyLiters: "20",
      storageVolume: "800", storageLoss: "3.0",
      pipeLength: "55", pipeInsulated: false,
      circRecirculation: true, circHours: "18",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({
      type: "MEC_FARA", airflow: "2500", fanPower: "900",
      operatingHours: "3000", hrEfficiency: "0",
    });
    setLighting({
      type: "FLUOR", pDensity: "9.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "3000", naturalLightRatio: "20",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Gherasim Sorin-Valentin",
      atestat: "CT-00987",
      grade: "II",
      company: "Expertize Energetice SRL",
      phone: "0736 789 012",
      email: "gherasim@expertize-en.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Policlinică P+2 cu subsol tehnic, Galați, 1968. Structură cadre BA monolit (stâlpi+grinzi+planșee), pereți completare cărămidă plină 35cm neizolați. Tâmplărie parțial înlocuită cu aluminiu fără RPT (2005), restul ferestre lemn simplu vitraj. Terasă plată bitum fără izolație termică. Termoficare urbană GECOTIP Galați. Ventilație mecanică simplă fără recuperare (sisteme vechi). Iluminat fluorescent. Potențial major de reabilitare energetică. TEMPLATE CPE: 9-CPE-cladire-sanitar. Clasă energetică D.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 6 încărcat — CPE 9 · Policlinică SA cadre BA P+2 1968 Galați · termoficare · fără izolație · Clasă D.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 7 — Supermarket P 2012 Ploiești — COMERȚ
  // Template CPE 10: clădire de comerț (SUPER — supermarket)
  // Construcție modulară prefabricată metalică sandwich PIR, VRF, LED BMS, PV 90kWp. Clasă B.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo7 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Bd. Republicii nr. 280",
      city: "Ploiești", county: "Prahova", postalCode: "100235",
      category: "SUPER", structure: "Construcție modulară prefabricată modernă (sandwich metalic/beton, post-2000)",
      yearBuilt: "2012", yearRenov: "",
      floors: "P", basement: false, attic: false,
      units: "1", stairs: "1",
      areaUseful: "1800", volume: "10800", areaEnvelope: "2800",
      heightBuilding: "6.00", heightFloor: "6.00",
      locality: "Ploiești",
      perimeter: "180", n50: "1.8", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "inchiriere", parkingSpaces: "80",
    });
    setOpaqueElements([
      { name: "Pereți ext. S — panou sandwich metalic PIR 10cm", type: "PE", orientation: "S", area: "460", layers: [
        { matName: "Tablă oțel zincat ext. 0.5mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
        { matName: "Spumă poliuretanică PIR 10cm λ=0,022", material: "Poliuretan (PUR/PIR) rigid", thickness: "100", lambda: 0.022, rho: 40 },
        { matName: "Tablă oțel zincat int. 0.5mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
      ]},
      { name: "Pereți ext. N+E+V — sandwich metalic PIR 10cm", type: "PE", orientation: "N", area: "400", layers: [
        { matName: "Tablă oțel zincat ext. 0.5mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
        { matName: "Spumă poliuretanică PIR 10cm λ=0,022", material: "Poliuretan (PUR/PIR) rigid", thickness: "100", lambda: 0.022, rho: 40 },
        { matName: "Tablă oțel zincat int. 0.5mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
      ]},
      { name: "Acoperiș — panou sandwich PIR 15cm (terasă rece)", type: "PT", orientation: "Orizontal", area: "1800", layers: [
        { matName: "Tablă cutată oțel ext. 0.7mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
        { matName: "Spumă PIR 15cm λ=0,022", material: "Poliuretan (PUR/PIR) rigid", thickness: "150", lambda: 0.022, rho: 40 },
        { matName: "Tablă oțel int. 0.5mm", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
      ]},
      { name: "Placă pe sol — BA 15cm + XPS 8cm", type: "PL", orientation: "Orizontal", area: "1800", layers: [
        { matName: "Gresie antiderapantă 1cm", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă armată 10cm", material: "Șapă ciment", thickness: "100", lambda: 1.40, rho: 2000 },
        { matName: "XPS 8cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "80", lambda: 0.034, rho: 35 },
        { matName: "Beton armat fundație 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 20cm", material: "Pietriș sau balast", thickness: "200", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Vitrine intrări + fațadă S — aluminiu RPT dublu Low-E", glazingType: "Dublu vitraj Low-E", frameType: "Aluminiu cu RPT", u: "1.80", g: "0.45", area: "280", orientation: "S", frameRatio: "15" },
      { name: "Luminatoare zenitale (10% din acoperiș)", glazingType: "Dublu vitraj", frameType: "PVC (5 camere)", u: "2.50", g: "0.70", area: "180", orientation: "Orizontal", frameRatio: "20" },
    ]);
    setThermalBridges([
      { name: "Montanți cadre metalice (punte termică joncțiuni panou)", type: "Joncțiuni pereți", psi: "0.15", length: "360" },
      { name: "Soclu — beton armat perimetral", type: "Joncțiuni pereți", psi: "0.25", length: "180" },
      { name: "Glafuri uși/vitrine aluminiu RPT", type: "Ferestre", psi: "0.05", length: "320" },
    ]);
    setHeating({
      source: "PC_AA", power: "120", eta_gen: "3.50",
      nominalPower: "120",
      emission: "VENT_CONV", eta_em: "0.91",
      distribution: "BINE_INT", eta_dist: "0.93",
      control: "INTELIG", eta_ctrl: "0.95",
      regime: "continuu", theta_int: "18", nightReduction: "3",
      tStaircase: "", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "BOILER_E", consumers: "10", dailyLiters: "5",
      storageVolume: "100", storageLoss: "1.0",
      pipeLength: "20", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "VRF", power: "150", eer: "3.80",
      cooledArea: "1800", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR70", airflow: "18000", fanPower: "5400",
      operatingHours: "4000", hrEfficiency: "70",
    });
    setLighting({
      type: "LED_PRO", pDensity: "8.0", controlType: "BMS",
      fCtrl: "0.65", operatingHours: "4200", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "450", orientation: "S", tilt: "10",
      inverterType: "STD", inverterEta: "0.96",
      peakPower: "90", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "3.50",
      scopHeating: "3.20", covers: "heating",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Florescu Andrei-Bogdan",
      atestat: "CT-01765",
      grade: "I",
      company: "Retail Energy Consulting SRL",
      phone: "0745 678 901",
      email: "florescu@retail-energy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Supermarket P, 2012, Ploiești. Structură modulară prefabricată metalică (cadre oțel + panouri sandwich PIR 10cm pereți, PIR 15cm acoperiș). PC aer-apă centrală 120kW + VRF Daikin 150kW răcire. UTA centralizată cu HR 70%, debit 18000 m³/h. PV 90kWp pe acoperiș (autoproducție). Iluminat LED profesional cu BMS (reducere 35% față de fluorescent). Vitrine și luminatoare zenitale (aport solar important). TEMPLATE CPE: 10-CPE-cladire-comert. Clasă energetică B.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 7 încărcat — CPE 10 · Supermarket SUPER sandwich PIR P 2012 Ploiești · VRF + PV 90kWp + HR 70% · Clasă B.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 8 — Pensiune turistică P+1+M Sinaia 2001, reabilitare 2022 — TURISM
  // Template CPE 11: clădire turism (HC — hotel/motel/pensiune)
  // Zidărie GVP 25cm + EPS 10cm, cazan peleți 40kW, solar termic 6m². Clasă C.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo8 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Republicii nr. 28",
      city: "Sinaia", county: "Prahova", postalCode: "106100",
      category: "HC", structure: "Zidărie portantă — cărămidă cu goluri GVP/GVF (1960–2000)",
      yearBuilt: "2001", yearRenov: "2022",
      floors: "P+1+M", basement: true, attic: true,
      units: "10", stairs: "1",
      areaUseful: "380", volume: "1140", areaEnvelope: "820",
      heightBuilding: "9.50", heightFloor: "2.80",
      locality: "Sinaia",
      perimeter: "62.0", n50: "1.8", shadingFactor: "0.90",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "turism", parkingSpaces: "12",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+E — GVP 25cm + EPS 10cm ETICS (reab. 2022)", type: "PE", orientation: "S", area: "140", layers: [
        { matName: "Tencuială decorativă silicatică 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "Cărămidă cu goluri GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială var-ciment int. 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+V — GVP 25cm + EPS 10cm ETICS", type: "PE", orientation: "N", area: "120", layers: [
        { matName: "Tencuială decorativă silicatică 5mm", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "EPS 10cm λ=0,036", material: "Polistiren expandat EPS 100", thickness: "100", lambda: 0.036, rho: 25 },
        { matName: "Cărămidă cu goluri GVP 25cm", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială var-ciment int. 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu pod mansardă — vată minerală 20cm", type: "PP", orientation: "Orizontal", area: "95", layers: [
        { matName: "Tavan gips-carton 12mm", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
        { matName: "Vată minerală bazaltică 20cm λ=0,035", material: "Vată minerală bazaltică", thickness: "200", lambda: 0.035, rho: 100 },
        { matName: "Beton armat planșeu 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Planșeu peste subsol — BA 14cm (nearmat termic)", type: "PB", orientation: "Orizontal", area: "95", layers: [
        { matName: "Parchet laminat 1cm", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC dublu Low-E (înlocuite la reabilitare 2022) — S+E", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.20", g: "0.55", area: "55", orientation: "S", frameRatio: "25" },
      { name: "Ferestre PVC dublu Low-E — N+V", glazingType: "Dublu vitraj Low-E", frameType: "PVC (5 camere)", u: "1.20", g: "0.55", area: "28", orientation: "N", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Stâlpișori BA perimetrali (GVP confinată)", type: "Joncțiuni pereți", psi: "0.18", length: "62" },
      { name: "Centuri BA (P+1+M = 3 niveluri)", type: "Joncțiuni pereți", psi: "0.12", length: "186" },
      { name: "Glaf ferestre PVC dublu Low-E", type: "Ferestre", psi: "0.04", length: "130" },
      { name: "Soclu — izolat XPS 8cm perimetral", type: "Joncțiuni pereți", psi: "0.10", length: "62" },
    ]);
    setHeating({
      source: "BIO_CAZ", power: "40", eta_gen: "0.88",
      nominalPower: "40",
      emission: "RAD_OT", eta_em: "0.93",
      distribution: "MED_INT", eta_dist: "0.90",
      control: "TERMO_AMB", eta_ctrl: "0.93",
      regime: "continuu", theta_int: "20", nightReduction: "2",
      tStaircase: "15", tBasement: "10", tAttic: "8",
    });
    setAcm({
      source: "SOLAR_ACM", consumers: "30", dailyLiters: "60",
      storageVolume: "600", storageLoss: "1.5",
      pipeLength: "25", pipeInsulated: true,
      circRecirculation: true, circHours: "14",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "LED", pDensity: "5.5", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "3200", naturalLightRatio: "25",
    });
    setSolarThermal({
      ...INITIAL_SOLAR_TH, enabled: true,
      type: "PLAN", area: "6", orientation: "S", tilt: "45",
      usage: "acm", storageVolume: "300", eta0: "0.78", a1: "3.5",
    });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({
      ...INITIAL_BIO, enabled: true,
      type: "PELETI", boilerEta: "0.88", power: "40",
      covers: "heating", annualConsumption: "18",
    });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Constantin Andreea-Mihaela",
      atestat: "CT-01556",
      grade: "II",
      company: "Montania Audit Energetic SRL",
      phone: "0732 456 789",
      email: "constantin@montania-audit.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Pensiune turistică P+1+M cu subsol, 10 camere, Sinaia, 2001. Structură zidărie portantă GVP 25cm cu stâlpișori și centuri BA. Reabilitare termică 2022: ETICS EPS 10cm fațade, vată minerală 20cm pod mansardă, înlocuire tâmplărie PVC dublu Low-E, înlocuire cazan cu cazan peleți Vigas 40kW, panouri solare termice 6m² pentru preparare ACM + boiler solar 600L. Radiatoare fontă cu robineți termostatici. Ventilare naturală (altitudine ~800m). Fără răcire mecanică. Funcționare continuă sezon turistic (iarnă + vară). TEMPLATE CPE: 11-CPE-cladire-turism. Clasă energetică C.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 8 încărcat — CPE 11 · Pensiune HC GVP P+1+M reab. 2022 Sinaia · peleți 40kW + solar termic 6m² · Clasă C.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 9 — Sală fitness P+1 2019 Constanța — SPORT
  // Template CPE 12: clădire sport (FIT — sală fitness/club sportiv)
  // Structură mixtă oțel+BA, tablă+vată bazaltică 15cm, VRF, HR 75%, PV 30kWp. Clasă B.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo9 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Bd. Tomis nr. 325",
      city: "Constanța", county: "Constanța", postalCode: "900664",
      category: "FIT", structure: "Structură mixtă oțel + beton armat compozită (clădiri birouri înalte)",
      yearBuilt: "2019", yearRenov: "",
      floors: "P+1", basement: false, attic: false,
      units: "1", stairs: "1",
      areaUseful: "680", volume: "3060", areaEnvelope: "1100",
      heightBuilding: "9.00", heightFloor: "4.50",
      locality: "Constanța",
      perimeter: "92", n50: "1.4", shadingFactor: "0.85",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "locuit", parkingSpaces: "30",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+E+V — vată bazaltică 15cm + tablă cutată", type: "PE", orientation: "S", area: "280", layers: [
        { matName: "Tablă cutată oțel zincat ext.", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
        { matName: "Vată minerală bazaltică 15cm λ=0,035", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.035, rho: 100 },
        { matName: "Barieră vapori + OSB 15mm", material: "Lemn moale (brad/molid)", thickness: "15", lambda: 0.14, rho: 500 },
        { matName: "Gips-carton 12mm interior", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
      ]},
      { name: "Pereți ext. N — vată bazaltică 15cm + tablă cutată", type: "PE", orientation: "N", area: "140", layers: [
        { matName: "Tablă cutată oțel zincat ext.", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
        { matName: "Vată minerală bazaltică 15cm λ=0,035", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.035, rho: 100 },
        { matName: "OSB 15mm + barieră vapori", material: "Lemn moale (brad/molid)", thickness: "15", lambda: 0.14, rho: 500 },
        { matName: "Gips-carton 12mm interior", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
      ]},
      { name: "Acoperiș — sandwich PIR 15cm + membrană TPO", type: "PT", orientation: "Orizontal", area: "340", layers: [
        { matName: "Membrană TPO hidroizolație", material: "Bitum (membrană)", thickness: "5", lambda: 0.17, rho: 1050 },
        { matName: "PIR 15cm λ=0,022", material: "Poliuretan (PUR/PIR) rigid", thickness: "150", lambda: 0.022, rho: 40 },
        { matName: "Tablă cutată portantă oțel", material: "Oțel carbon / zincat", thickness: "1", lambda: 50.0, rho: 7800 },
      ]},
      { name: "Placă pe sol sală antrenament — BA 15cm + XPS 10cm", type: "PL", orientation: "Orizontal", area: "340", layers: [
        { matName: "Covor sportiv cauciuc 1cm", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 600 },
        { matName: "Șapă nivelată armată 8cm", material: "Șapă ciment", thickness: "80", lambda: 1.40, rho: 2000 },
        { matName: "XPS 10cm λ=0,034", material: "Polistiren extrudat XPS", thickness: "100", lambda: 0.034, rho: 35 },
        { matName: "Beton armat fundație 15cm", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
        { matName: "Pietriș compactat 20cm", material: "Pietriș sau balast", thickness: "200", lambda: 0.70, rho: 1800 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre PVC triplu vitraj + fațadă vitrată intrare — S", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6 camere)", u: "0.90", g: "0.45", area: "120", orientation: "S", frameRatio: "15" },
      { name: "Ferestre PVC triplu vitraj — N+E+V (ventilare + iluminat natural)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6 camere)", u: "0.90", g: "0.45", area: "65", orientation: "N", frameRatio: "20" },
    ]);
    setThermalBridges([
      { name: "Stâlpi oțel (punte metalică trecere tablă ext.→int.)", type: "Joncțiuni pereți", psi: "0.25", length: "92" },
      { name: "Fundație beton — soclu nearmat termic", type: "Joncțiuni pereți", psi: "0.20", length: "92" },
      { name: "Planșeu intermediar (zona vestiare P+1)", type: "Joncțiuni pereți", psi: "0.08", length: "80" },
      { name: "Glafuri ferestre PVC triplu vitraj", type: "Ferestre", psi: "0.02", length: "185" },
    ]);
    setHeating({
      source: "PC_AA", power: "60", eta_gen: "3.80",
      nominalPower: "60",
      emission: "VENT_CONV", eta_em: "0.93",
      distribution: "BINE_INT", eta_dist: "0.95",
      control: "INTELIG", eta_ctrl: "0.95",
      regime: "intermitent", theta_int: "18", nightReduction: "6",
      tStaircase: "", tBasement: "", tAttic: "",
    });
    setAcm({
      source: "BOILER_E", consumers: "80", dailyLiters: "30",
      storageVolume: "400", storageLoss: "1.2",
      pipeLength: "30", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });
    setCooling({
      system: "VRF", power: "80", eer: "4.00",
      cooledArea: "680", distribution: "BINE_INT",
      hasCooling: true,
    });
    setVentilation({
      type: "MEC_HR75", airflow: "5000", fanPower: "1500",
      operatingHours: "3600", hrEfficiency: "75",
    });
    setLighting({
      type: "LED_PRO", pDensity: "7.0", controlType: "SENZ",
      fCtrl: "0.80", operatingHours: "3600", naturalLightRatio: "20",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "150", orientation: "S", tilt: "10",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "30", usage: "autoconsum",
    });
    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "PC_AA", cop: "3.80",
      scopHeating: "3.50", covers: "heating_acm",
    });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Lazăr Sorina-Valentina",
      atestat: "CT-02234",
      grade: "I",
      company: "Sport & Energy Audit SRL",
      phone: "0758 901 234",
      email: "lazar@sportenergy.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Sală fitness P+1, 2019, Constanța. Structură mixtă oțel+BA compozită: cadre oțel portante, planșee BA, pereți completare vată bazaltică 15cm + tablă cutată. Acoperiș sandwich PIR 15cm + membrană TPO. PC aer-apă Mitsubishi Zubadan 60kW (COP=3,80) + VRF Daikin 80kW răcire (EER=4,00). VMC cu recuperare căldură 75%, debit 5000 m³/h (cerință sporită igienă sală sport). PV 30kWp pe acoperiș. ACM boiler electric 400L. Triplu vitraj PVC pe toate suprafețele vitrate. TEMPLATE CPE: 12-CPE-cladire-sport. Clasă energetică B.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 9 încărcat — CPE 12 · Fitness FIT oțel+BA P+1 2019 Constanța · PC + VRF + PV 30kWp + HR 75% · Clasă B.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // DEMO 10 — Cămin studențesc 2S+P+5E din 1962 Oradea — CPE FORMĂ GENERALĂ
  // Template CPE General: 3-CPE-forma-generala-cladire (CP — cămin studențesc/internat)
  // Zidărie cărămidă plină ante 1980, termoficare, simplu vitraj, fără izolație. Clasă D-E.
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo10 = useCallback(() => {
    pushUndo();
    setBuilding({
      address: "Str. Universității nr. 5, Cămin C5",
      city: "Oradea", county: "Bihor", postalCode: "410087",
      category: "CP", structure: "Zidărie portantă — cărămidă plină (240 / 290 mm, ante 1980)",
      yearBuilt: "1962", yearRenov: "",
      floors: "2S+P+5E", basement: true, attic: false,
      units: "200", stairs: "2",
      areaUseful: "4200", volume: "11760", areaEnvelope: "3800",
      heightBuilding: "21.60", heightFloor: "2.80",
      locality: "Oradea",
      perimeter: "96.0", n50: "6.0", shadingFactor: "0.80",
      gwpLifecycle: "", solarReady: false,
      scopCpe: "locuit", parkingSpaces: "10",
    });
    setOpaqueElements([
      { name: "Pereți ext. S+V — cărămidă plină 38cm (neizolat, 1962)", type: "PE", orientation: "S", area: "900", layers: [
        { matName: "Tencuială ext. var-ciment 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină arsă (290/240 mm)", thickness: "380", lambda: 0.77, rho: 1800 },
        { matName: "Tencuială int. var-ciment 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. N+E — cărămidă plină 38cm (neizolat)", type: "PE", orientation: "N", area: "740", layers: [
        { matName: "Tencuială ext. var-ciment 20mm", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă plină 38cm", material: "Cărămidă plină arsă (290/240 mm)", thickness: "380", lambda: 0.77, rho: 1800 },
        { matName: "Tencuială int. var-ciment 15mm", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Terasă plată BA 14cm + bitum (fără izolație termică)", type: "PT", orientation: "Orizontal", area: "700", layers: [
        { matName: "Pietriș protecție 5cm", material: "Pietriș sau balast", thickness: "50", lambda: 0.70, rho: 1800 },
        { matName: "Membrană bitum veche 2 straturi", material: "Bitum (membrană)", thickness: "8", lambda: 0.17, rho: 1050 },
        { matName: "Beton armat 14cm", material: "Beton armat", thickness: "140", lambda: 1.74, rho: 2400 },
        { matName: "Tencuială interior tavan", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Planșeu peste subsol tehnic — BA 10cm neizolat", type: "PB", orientation: "Orizontal", area: "700", layers: [
        { matName: "Șapă ciment 5cm", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat 10cm", material: "Beton armat", thickness: "100", lambda: 1.74, rho: 2400 },
      ]},
    ]);
    setGlazingElements([
      { name: "Ferestre lemn simplu vitraj originale (1962) — Sud", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "220", orientation: "S", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — Nord", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "180", orientation: "N", frameRatio: "25" },
      { name: "Ferestre lemn simplu vitraj — E+V (case scări)", glazingType: "Simplu vitraj", frameType: "Lemn stratificat", u: "5.80", g: "0.85", area: "60", orientation: "Mixt", frameRatio: "25" },
    ]);
    setThermalBridges([
      { name: "Planșee intermediare BA — 5 niveluri ×2 scări", type: "Joncțiuni pereți", psi: "0.35", length: "960" },
      { name: "Colțuri exterioare ×4 (7 niveluri)", type: "Joncțiuni pereți", psi: "0.10", length: "196" },
      { name: "Terasă — atic beton fără izolație", type: "Acoperiș", psi: "0.40", length: "96" },
      { name: "Soclu fundație — perimetral fără izolație", type: "Joncțiuni pereți", psi: "0.35", length: "96" },
      { name: "Glafuri ferestre lemn simplu vitraj", type: "Ferestre", psi: "0.06", length: "520" },
    ]);
    setHeating({
      source: "TERMO", power: "600", eta_gen: "0.82",
      nominalPower: "600",
      emission: "RAD_OT", eta_em: "0.88",
      distribution: "SLAB_INT", eta_dist: "0.82",
      control: "FARA", eta_ctrl: "0.80",
      regime: "continuu", theta_int: "20", nightReduction: "0",
      tStaircase: "14", tBasement: "10", tAttic: "",
    });
    setAcm({
      source: "TERMO_ACM", consumers: "400", dailyLiters: "50",
      storageVolume: "3000", storageLoss: "3.0",
      pipeLength: "80", pipeInsulated: false,
      circRecirculation: true, circHours: "18",
    });
    setCooling({ system: "NONE", power: "", eer: "", cooledArea: "", distribution: "", hasCooling: false });
    setVentilation({ type: "NAT", airflow: "", fanPower: "", operatingHours: "", hrEfficiency: "" });
    setLighting({
      type: "FLUOR", pDensity: "8.0", controlType: "MAN",
      fCtrl: "1.00", operatingHours: "2000", naturalLightRatio: "15",
    });
    setSolarThermal({ ...INITIAL_SOLAR_TH, enabled: false });
    setPhotovoltaic({ ...INITIAL_PV, enabled: false });
    setHeatPump({ ...INITIAL_HP, enabled: false });
    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });
    setAuditor({
      name: "ing. Bogdan Mihai-Vlad",
      atestat: "CT-00756",
      grade: "II",
      company: "Univers Energetic SRL",
      phone: "0723 456 789",
      email: "bogdan@univers-energetic.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Cămin studențesc 2S+P+5E, 200 locuri cazare, 2 scări, Oradea, 1962. Structură zidărie portantă cărămidă plină 38cm. Pereți exteriori neizolați, ferestre lemn simplu vitraj originale, terasă plată fără izolație termică. Termoficare urbană Oradea. Fără control individual pe radiatoare. Punți termice majore la planșee, atic, soclu. Potențial major de reabilitare: izolare EPS 14cm, terasă PIR 16cm, tâmplărie triplu vitraj, VMC cu HR. TEMPLATE CPE: 3-CPE-forma-generala-cladire (categorie CP — cămin). Clasă energetică D-E.",
      photo: "",
    });
    setStep(1);
    showToast("Demo 10 încărcat — CPE General · Cămin CP cărămidă plină 2S+P+5E 1962 Oradea · termoficare · fără izolație · Clasă D-E.", "success", 5000);
  }, [pushUndo, showToast]);


  // ═══════════════════════════════════════════════════════════
  // FEATURE: EXPORT / IMPORT PROIECT (JSON) — v3.5
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
      rows.push("Clasa energetica," + (getEnergyClass(epF, buildCatKey(building.category, cooling.hasCooling))?.cls||""));
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
    showToast(lang==="EN"?"CSV exported successfully.":"CSV exportat cu succes.", "success");
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
          ["Clasă energetică", getEnergyClass(epF, buildCatKey(building.category, cooling.hasCooling))?.cls||"", ""],
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
      showToast(lang==="EN"?"Excel exported successfully.":"Excel exportat cu succes.", "success");
    } catch(e) {
      showToast("Eroare export Excel: " + e.message, "error");
    } finally { setExporting(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, opaqueElements, glazingElements, thermalBridges, showToast]);

  // (exportExcelFull declared below, after selectedClimate)

  // ═══════════════════════════════════════════════════════════
  // IMPORT XML ENERGETIC — Parse format XML energetic (DOSET/gbXML/generic)
  // ═══════════════════════════════════════════════════════════
  const importENERGPlus = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, "text/xml");
        const getText = (tag) => doc.querySelector(tag)?.textContent?.trim() || "";
        const getNum = (tag) => parseFloat(getText(tag)) || 0;

        // Try to extract building info from common XML energetic structures
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
            importedOpaque.push({ name, area: area.toString(), type, orientation: "N", layers: [{ matName: "Import XML", lambda: 0.5, thickness: (uVal > 0 ? Math.round(1000*0.5/((1/uVal)-0.17)) : 200).toString() }] });
          }
        });

        if (Object.keys(updates).length > 0) {
          setBuilding(p => ({ ...p, ...updates }));
        }
        if (importedOpaque.length > 0) {
          setOpaqueElements(prev => [...prev, ...importedOpaque]);
        }

        showToast(`Import XML: ${Object.keys(updates).length} câmpuri + ${importedOpaque.length} elemente`, "success");
      } catch(e) {
        showToast("Eroare parsare XML: " + e.message, "error");
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
          showToast(lang==="EN"?"Invalid format: file does not contain a valid project object.":"Format invalid: fișierul nu conține un obiect proiect valid.", "error"); return;
        }
        const knownKeys = ["building","opaqueElements","glazingElements","thermalBridges","heating","acm","cooling","ventilation","lighting","solarThermal","photovoltaic","heatPump","biomass","otherRenew","auditor"];
        const hasAnyKnown = knownKeys.some(k => data[k] !== undefined);
        if (!hasAnyKnown) {
          showToast(lang==="EN"?"Invalid format: no recognized project data found.":"Format invalid: nu conține date de proiect recunoscute.", "error"); return;
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
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "8") { e.preventDefault(); setStep(parseInt(e.key)); }
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
      // Detect format: DOSET, gbXML, or format XML energetic generic
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
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".pdf") || file.name.endsWith(".docx")) {
      setShowImportWizard(true);
    } else if (file.type && file.type.startsWith("image/")) {
      importOCR(file);
    } else {
      showToast("Format nesuportat. Acceptă: .json, .csv, .xml, .xlsx, .pdf, .docx, imagini", "error");
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

  // ─── Hooks: anvelopă, instalații, regenerabile, auto-sync ───
  const { envelopeSummary, monthlyISO, hourlyISO } = useEnvelopeSummary({
    opaqueElements, glazingElements, thermalBridges, building, heating, ventilation, selectedClimate,
  });

  const instSummary = useInstallationSummary({
    envelopeSummary, monthlyISO, building, heating, acm, cooling, ventilation, lighting, selectedClimate, useNA2023,
  });

  const renewSummary = useRenewableSummary({
    instSummary, building, solarThermal, photovoltaic, heatPump, biomass, otherRenew,
    selectedClimate, useNA2023, acm, heating, battery,
  });

  useAutoSync({
    heating, setHeating,
    lighting, setLighting,
    building, setAcm,
    solarThermal, setSolarThermal,
    photovoltaic, setPhotovoltaic,
  });

  const { isOnline } = useOfflineMode();
  const userPlan = cloud?.user?.plan || "free";

  // ── Keyboard shortcuts (pct. 41) ──
  useKeyboardShortcuts({
    setStep,
    undo, redo,
    exportProject,
    exportCSV,
    showToast,
  });

  // ─── Opaque element calculations (kept for local use by other parts of component) ───
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

  // [Moved to useEnvelopeSummary hook — Sprint 4 refactoring]

  // ─── ACM EN 15316 detaliat ───────────────────────────────────────────────────
  const acmDetailed = useMemo(() => {
    if (!instSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au) return null;
    const nConsumers = instSummary.nConsumers || Math.max(1, Math.round(Au / 30));
    const zone = selectedClimate?.zone || "III";
    const acmSourceMap = {
      CAZAN_H: "ct_gaz", CAZAN_GPL: "ct_gaz", CAZAN_LEMNE: "ct_gaz",
      BOILER_ELECTRIC: "boiler_electric", TERMOFICARE: "termoficare",
      POMPA_CALDURA_ACM: "pc",
    };
    const acmSrc = acmSourceMap[acm.source] || "ct_gaz";
    const etaGen = parseFloat(acm.etaAcm) || (acm.source === "CAZAN_H" ? parseFloat(heating.eta_gen) : null) || 0.87;
    const solarFr = instSummary.qf_w > 0 && instSummary.qACM_nd > 0
      ? Math.max(0, 1 - (instSummary.qf_w * etaGen) / instSummary.qACM_nd)
      : 0;
    return calcACMen15316({
      category: building.category,
      nPersons: nConsumers,
      consumptionLevel: "med",
      tSupply: 55,
      climateZone: zone,
      climate: selectedClimate,
      hasPipeInsulation: acm.pipeInsulated !== false,
      hasCirculation: !!acm.circRecirculation,
      insulationClass: "B",
      storageVolume_L: parseFloat(acm.storageVolume) || null,
      acmSource: acmSrc,
      etaGenerator: etaGen,
      solarFraction: solarFr,
    });
  }, [instSummary, building.areaUseful, building.category, acm, heating.eta_gen, selectedClimate]);

  // BENCHMARKS → importat din data/benchmarks.js

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

  // ─── Completare per pas (0–1) pentru indicatori vizuali ───
  const stepCompleteness = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const Vol = parseFloat(building.volume) || 0;
    const s1 = [building.locality, Au > 0, Vol > 0, building.category].filter(Boolean).length / 4;
    const s2 = Math.min(1, (opaqueElements.length > 0 ? 0.5 : 0) + (glazingElements.length > 0 ? 0.5 : 0));
    const s3 = heating.source ? 1 : 0;
    const s4 = 1; // optional
    const s5 = instSummary ? 1 : 0;
    const s6 = auditor.name ? 1 : 0;
    const s7 = 1;
    const s8 = 1;
    return [s1, s2, s3, s4, s5, s6, s7, s8];
  }, [building, opaqueElements, glazingElements, heating, instSummary, auditor]);

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
    const catKey = buildCatKey(building.category, cooling.hasCooling);
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
    const newClass = getEnergyClass(newEpM2, catKey);
    const newCO2M2 = Au > 0 ? (newQfH * newFuelCO2H + newQfW * (ri.addHP?0.107:(instSummary.fuel?.fCO2||0.20)) + (newQfC+newQfV+newQfL)*0.107) / Au : 0;
    const epOrig = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
    const co2Orig = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
    return {
      original: { ep: epOrig, co2: co2Orig, cls: getEnergyClass(epOrig, catKey), qfTotal: instSummary.qf_total },
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
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const cls = getEnergyClass(epF, catKey);
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

  // ═══════════════════════════════════════════════════════════
  // EXPORT EXCEL COMPLET (.xlsx) — 7 foi structurate conform cerintei
  // ═══════════════════════════════════════════════════════════
  const exportExcelFull = useCallback(async () => {
    try {
      setExporting("excelFull");
      const XLSX = (await import("xlsx")).default || await import("xlsx");
      const wb = XLSX.utils.book_new();
      const Au = parseFloat(building.areaUseful) || 1;
      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
      const catKey = buildCatKey(building.category, cooling?.hasCooling);

      // Foaie 1: Rezumat
      const rezumatData = [
        ["REZUMAT"],
        [],
        ["DATE CLADIRE", ""],
        ["Adresa", building.address || ""],
        ["Localitate", building.locality || ""],
        ["Judet", building.county || ""],
        ["Categorie functionala", building.category || ""],
        ["An constructie", building.yearBuilt || ""],
        ["Regim inaltime", building.floors || ""],
        ["Suprafata utila (m2)", building.areaUseful || ""],
        ["Volum incalzit (m3)", building.volume || ""],
        ["Suprafata anvelopa (m2)", building.areaEnvelope || ""],
        ["Structura", building.structure || ""],
        [],
        ["DATE CLIMATICE", ""],
        ["Localitate referinta", selectedClimate?.name || ""],
        ["Zona climatica", selectedClimate?.zone || ""],
        ["Temperatura ext. calcul (C)", selectedClimate?.theta_e || ""],
        ["Temperatura medie anuala (C)", selectedClimate?.theta_a || ""],
        ["GZile (C*zile)", selectedClimate?.gzile || ""],
        [],
        ["KPI ENERGETICI", "", ""],
        ["Indicator", "Valoare", "Unitate"],
        ["Energie primara totala EP", epF?.toFixed(1)||"", "kWh/(m2*an)"],
        ["Energie finala totala EF", instSummary?.qf_total_m2?.toFixed(1)||"", "kWh/(m2*an)"],
        ["Emisii CO2", co2F?.toFixed(1)||"", "kgCO2/(m2*an)"],
        ["Clasa energetica EP", getEnergyClass(epF, catKey)?.cls||"", ""],
        ["RER total (%)", (renewSummary?.rer||0).toFixed(1), "%"],
        ["RER on-site (%)", (renewSummary?.rerOnSite||0).toFixed(1), "%"],
        ["Coef. global pierderi G", envelopeSummary?.G?.toFixed(4)||"", "W/(m3*K)"],
        ["Conform nZEB", (renewSummary?.rer||0) >= 30 && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
        ["EP maxim nZEB", getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0)||"", "kWh/(m2*an)"],
        ["LENI iluminat", instSummary?.leni?.toFixed(1)||"", "kWh/(m2*an)"],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rezumatData), "Rezumat");

      // Foaie 2: Anvelopa
      const anvData = [
        ["ANVELOPA"],
        [],
        ["ELEMENTE OPACE"],
        ["Denumire", "Tip", "Suprafata (m2)", "Orientare", "U calculat (W/m2K)", "U ref nZEB (W/m2K)", "Straturi"],
      ];
      opaqueElements.forEach(el => {
        const rL = (el.layers||[]).reduce((s,l) => { const d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0); }, 0);
        const uCalc = rL > 0 ? (1/(0.13+rL+0.04)) : 0;
        const uRef = el.type==="PE"?0.56:el.type==="PSol"?0.40:el.type==="PlanInt"?0.50:el.type==="PlanExt"?0.20:el.type==="Acoperis"?0.20:0.35;
        anvData.push([
          el.name||"", el.type||"", el.area||"", el.orientation||"",
          uCalc.toFixed(3), uRef.toFixed(2),
          (el.layers||[]).map(l=>`${l.matName||"?"} (${l.thickness||0}mm, lambda=${l.lambda||0})`).join(" | "),
        ]);
      });
      anvData.push([]);
      anvData.push(["ELEMENTE VITRATE"]);
      anvData.push(["Denumire", "Tip vitraj", "Suprafata (m2)", "Orientare", "U (W/m2K)", "g (-)", "Tip rama"]);
      glazingElements.forEach(el => anvData.push([
        el.name||"", el.glazingType||"", el.area||"", el.orientation||"",
        el.u||"", el.g||"", el.frameType||"",
      ]));
      anvData.push([]);
      anvData.push(["PUNTI TERMICE"]);
      anvData.push(["Denumire", "Tip", "Psi (W/mK)", "Lungime (m)", "Pierdere liniara (W/K)"]);
      thermalBridges.forEach(b => anvData.push([
        b.name||"", b.type||"", b.psi||"", b.length||"",
        ((parseFloat(b.psi)||0)*(parseFloat(b.length)||0)).toFixed(3),
      ]));
      if (envelopeSummary) {
        const totalBridgeLoss = thermalBridges.reduce((s,b)=>s+(parseFloat(b.psi)||0)*(parseFloat(b.length)||0),0);
        anvData.push(["TOTAL punti termice", "", "", "", totalBridgeLoss.toFixed(3)]);
        anvData.push([]);
        anvData.push(["REZUMAT ANVELOPA", "Valoare", "Unitate"]);
        anvData.push(["Coef. global G", envelopeSummary.G?.toFixed(4)||"", "W/(m3*K)"]);
        anvData.push(["H_T total", envelopeSummary.H_T?.toFixed(2)||"", "W/K"]);
        anvData.push(["H_V total", envelopeSummary.H_V?.toFixed(2)||"", "W/K"]);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(anvData), "Anvelopa");

      // Foaie 3: Calcul termic ISO 13790
      if (monthlyISO && monthlyISO.length === 12) {
        const thermalData = [
          ["CALCUL TERMIC LUNAR ISO 13790"],
          [],
          ["Luna", "T ext (C)", "Q pierderi (kWh)", "Q sol (kWh)", "Q interne (kWh)",
           "Q aporturi total (kWh)", "Factor utilizare eta_H", "Raport gamma_H",
           "Q incalzire (kWh)", "Q racire (kWh)"],
        ];
        monthlyISO.forEach(m => thermalData.push([
          m.name, m.tExt?.toFixed(1)||"", m.Q_loss?.toFixed(0)||"",
          m.Q_sol?.toFixed(0)||"", m.Q_int?.toFixed(0)||"",
          m.Q_gain?.toFixed(0)||"",
          m.eta_H?.toFixed(3)||"", m.gamma_H?.toFixed(3)||"",
          m.qH_nd?.toFixed(0)||"", m.qC_nd?.toFixed(0)||"",
        ]));
        thermalData.push([
          "TOTAL", "",
          monthlyISO.reduce((s,m)=>s+(m.Q_loss||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.Q_sol||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.Q_int||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.Q_gain||0),0).toFixed(0),
          "", "",
          monthlyISO.reduce((s,m)=>s+(m.qH_nd||0),0).toFixed(0),
          monthlyISO.reduce((s,m)=>s+(m.qC_nd||0),0).toFixed(0),
        ]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(thermalData), "Calcul termic");
      }

      // Foaie 4: Instalatii
      const instData = [
        ["INSTALATII — CONSUMURI PER UTILITATE"],
        [],
        ["CONSUMURI FINALE SI PRIMARE", "", "", "", ""],
        ["Utilitate", "Energie finala (kWh/an)", "EF (kWh/m2*an)", "Energie primara (kWh/an)", "EP (kWh/m2*an)",
         "Factor primar fp", "CO2 (kgCO2/an)"],
      ];
      if (instSummary) {
        const hFuel = HEAT_SOURCES.find(s=>s.id===heating.source);
        const fpH = hFuel?.fp || heating.fp || 1.1;
        const rows_inst = [
          ["Incalzire", instSummary.qf_h, instSummary.ep_h, fpH, instSummary.co2_h],
          ["Apa calda (ACM)", instSummary.qf_w, instSummary.ep_w, fpH, instSummary.co2_w],
          ["Racire", instSummary.qf_c, instSummary.ep_c, 2.5, instSummary.co2_c],
          ["Ventilare", instSummary.qf_v, instSummary.ep_v, 2.5, instSummary.co2_v],
          ["Iluminat", instSummary.qf_l, instSummary.ep_l, 2.5, instSummary.co2_l],
        ];
        rows_inst.forEach(([label, qf, ep, fp, co2]) => instData.push([
          label,
          (qf||0).toFixed(0), ((qf||0)/Au).toFixed(1),
          (ep||0).toFixed(0), ((ep||0)/Au).toFixed(1),
          fp,
          (co2||0).toFixed(0),
        ]));
        instData.push([
          "TOTAL",
          instSummary.qf_total?.toFixed(0)||"", instSummary.qf_total_m2?.toFixed(1)||"",
          instSummary.ep_total?.toFixed(0)||"", instSummary.ep_total_m2?.toFixed(1)||"",
          "", instSummary.co2_total?.toFixed(0)||"",
        ]);
        instData.push([]);
        instData.push(["PARAMETRI SISTEME", "", ""]);
        instData.push(["Sistem", "Parametru", "Valoare"]);
        instData.push(["Incalzire", "Sursa", HEAT_SOURCES.find(s=>s.id===heating.source)?.label||heating.source]);
        instData.push(["", "Putere nominala (kW)", heating.power||""]);
        instData.push(["", "Randament generare (eta_gen)", heating.etaGen||heating.eta_gen||""]);
        instData.push(["", "Randament distributie (eta_distr)", heating.etaDistr||heating.eta_distr||""]);
        instData.push(["", "Randament emisie (eta_emit)", heating.etaEmit||heating.eta_emit||""]);
        instData.push(["", "Factor primar fp", heating.fp||fpH||""]);
        instData.push(["ACM", "Sursa", ACM_SOURCES.find(s=>s.id===acm.source)?.label||acm.source]);
        instData.push(["", "Consumatori", acm.consumers||""]);
        instData.push(["", "Litri/zi/persoana", acm.dailyLiters||""]);
        instData.push(["Racire", "Sistem", COOLING_SYSTEMS.find(s=>s.id===cooling.system)?.label||cooling.system]);
        instData.push(["", "EER nominal", cooling.eer||""]);
        instData.push(["Ventilare", "Tip", VENTILATION_TYPES.find(s=>s.id===ventilation.type)?.label||ventilation.type]);
        instData.push(["", "Debit (m3/h)", ventilation.airflow||""]);
        instData.push(["", "Eficienta recuperare (%)", ventilation.hrEfficiency||""]);
        instData.push(["Iluminat", "Tip", LIGHTING_TYPES.find(s=>s.id===lighting.type)?.label||lighting.type]);
        instData.push(["", "Densitate putere (W/m2)", lighting.pDensity||""]);
        instData.push(["", "LENI (kWh/m2*an)", instSummary?.leni?.toFixed(1)||""]);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instData), "Instalatii");

      // Foaie 5: Regenerabile
      const renData = [
        ["SURSE REGENERABILE"],
        [],
        ["Sursa", "Parametru", "Valoare", "Unitate"],
        ["Fotovoltaic (PV)", "Activ", photovoltaic.enabled ? "DA" : "NU", ""],
        ["", "Putere de varf (kWp)", photovoltaic.peakPower||photovoltaic.power||"", "kWp"],
        ["", "Suprafata panouri (m2)", photovoltaic.area||"", "m2"],
        ["", "Tip panouri", photovoltaic.type||"", ""],
        ["", "Productie anuala estimata", renewSummary?.qPV_kWh?.toFixed(0)||"", "kWh/an"],
        [],
        ["Solar termic", "Activ", solarThermal.enabled ? "DA" : "NU", ""],
        ["", "Suprafata colectori (m2)", solarThermal.area||"", "m2"],
        ["", "Tip colectori", solarThermal.type||"", ""],
        ["", "Productie anuala estimata", renewSummary?.qSolarTh?.toFixed(0)||"", "kWh/an"],
        [],
        ["Pompa de caldura", "Activ", heatPump.enabled ? "DA" : "NU", ""],
        ["", "Tip", heatPump.type||"", ""],
        ["", "COP nominal", heatPump.cop||"", ""],
        ["", "Energie ambiental extrasa", renewSummary?.qHP_ren?.toFixed(0)||"", "kWh/an"],
        [],
        ["Biomasa", "Activ", biomass.enabled ? "DA" : "NU", ""],
        ["", "Tip combustibil", biomass.type||"", ""],
        ["", "Putere nominala (kW)", biomass.power||"", "kW"],
        [],
        ["TOTAL REGENERABILE", "", "", ""],
        ["RER total (%)", (renewSummary?.rer||0).toFixed(1), "", "%"],
        ["RER on-site (%)", (renewSummary?.rerOnSite||0).toFixed(1), "", "%"],
        ["Energie regenerabila totala (kWh/an)", renewSummary?.qRen_total?.toFixed(0)||"", "", "kWh/an"],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renData), "Regenerabile");

      // Foaie 6: Clasificare
      const clasifData = [
        ["CLASIFICARE ENERGETICA"],
        [],
        ["INDICATORI FINALI", "", ""],
        ["Indicator", "Valoare", "Unitate"],
        ["EP total (dupa regenerabile)", epF?.toFixed(1)||"", "kWh/(m2*an)"],
        ["EP total fara regenerabile", instSummary?.ep_total_m2?.toFixed(1)||"", "kWh/(m2*an)"],
        ["CO2 total (dupa regenerabile)", co2F?.toFixed(1)||"", "kgCO2/(m2*an)"],
        [],
        ["CLASIFICARE", "", ""],
        ["Clasa energetica EP", getEnergyClass(epF, catKey)?.cls||"", ""],
        ["Clasa CO2", getCO2Class(co2F, building.category)?.cls||"", ""],
        [],
        ["nZEB", "", ""],
        ["EP maxim nZEB (zona " + (selectedClimate?.zone||"III") + ")", getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0)||"", "kWh/(m2*an)"],
        ["RER minim nZEB (%)", (NZEB_THRESHOLDS[building.category]?.rer_min || 30) + "", "%"],
        ["RER realizat (%)", (renewSummary?.rer||0).toFixed(1), "%"],
        ["Conformitate nZEB", (renewSummary?.rer||0) >= (NZEB_THRESHOLDS[building.category]?.rer_min||30) && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clasifData), "Clasificare");

      // Foaie 7: Auditor
      const audData = [
        ["DATE AUDITOR SI CPE"],
        [],
        ["Camp", "Valoare"],
        ["Nume auditor energetic", auditor.name||""],
        ["Nr. atestat", auditor.atestat||""],
        ["Grad atestat", auditor.grade||""],
        ["Firma / Birou", auditor.company||""],
        ["Telefon", auditor.phone||""],
        ["Email", auditor.email||""],
        ["Data emitere CPE", auditor.date||""],
        ["Valabilitate CPE (ani)", auditor.validity||10],
        ["Nr. inregistrare CPE", auditor.cpeNumber||""],
        ["Scopul auditului", auditor.purpose||""],
        [],
        ["OBSERVATII"],
        [auditor.observations||""],
        [],
        ["Data generare fisier", new Date().toLocaleDateString("ro-RO")],
        ["Versiune calculator", "Zephren Energy Calculator v3.2"],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(audData), "Auditor");

      const filename = `Zephren_COMPLET_${(building.address||"proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,20)}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast("Export Excel complet realizat cu succes — 7 foi de calcul.", "success");
    } catch(e) {
      showToast("Eroare export Excel complet: " + e.message, "error");
    } finally { setExporting(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, selectedClimate, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      photovoltaic, solarThermal, heatPump, biomass,
      instSummary, renewSummary, envelopeSummary, monthlyISO, auditor, showToast]);
  const exportPDFNative = useCallback(async () => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
    try {
      setExporting("pdf");
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const catKey = buildCatKey(building.category, cooling.hasCooling);
      const cls = getEnergyClass(epF, catKey);
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

      // QR Code în colțul din dreapta sus
      try {
        const QRCode = await import("qrcode");
        const qrContent = `https://zephren.ro/cpe?adr=${encodeURIComponent(building.address||'')}&cls=${cls.cls}&ep=${epF.toFixed(0)}&an=${new Date().getFullYear()}`;
        const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1 });
        doc.addImage(qrDataUrl, "PNG", w - 40, 10, 25, 25);
        doc.setFontSize(6); doc.setFont(undefined, "normal"); doc.setTextColor(120);
        doc.text("Scanează pentru verificare CPE", w - 27.5, 37, { align: "center" });
      } catch(qrErr) {
        console.warn("QR code generation failed:", qrErr);
      }

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
      showToast((lang==="EN"?"PDF generated: ":"PDF generat: ") + filename, "success");
    } catch(e) {
      showToast("Eroare generare PDF: " + e.message, "error");
      console.error("PDF export error:", e);
    } finally { setExporting(null); }
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate, cooling.hasCooling, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B4b: FIȘĂ SINTETICĂ 1 PAGINĂ PDF (client-friendly)
  // ═══════════════════════════════════════════════════════════
  const exportQuickSheet = useCallback(async () => {
    if (!instSummary) { showToast("Completați calculul (Pasul 5)", "error"); return; }
    try {
      setExporting("pdf_quick");
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const catKey = buildCatKey(building.category, cooling.hasCooling);
      const cls = getEnergyClass(epF, catKey);
      const co2Cls = getCO2Class(co2F, building.category);
      const rer = renewSummary?.rer || 0;
      const Au = parseFloat(building.areaUseful) || 1;
      const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
      const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
      const hexToRgb = (h2) => { const r=parseInt(h2.slice(1,3),16), g=parseInt(h2.slice(3,5),16), b=parseInt(h2.slice(5,7),16); return [r,g,b]; };

      let y = 0;

      // ── HEADER colorat ────────────────────────────────────────
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, w, 22, "F");
      doc.setFontSize(18); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text("ZEPHREN", 15, 13);
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      doc.text("Fișă energetică rezumativă", 15, 19);
      doc.setFontSize(8); doc.setTextColor(180, 210, 255);
      doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, w - 15, 19, { align: "right" });
      y = 28;

      // ── Adresă + auditor ─────────────────────────────────────
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text(`${building.address || "—"}, ${building.city || "—"}, jud. ${building.county || "—"}`, 15, y); y += 5;
      doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(80);
      const auditorName = auditor?.name || auditor?.firstName ? `${auditor.firstName || ""} ${auditor.lastName || ""}`.trim() : "";
      if (auditorName) { doc.text(`Auditor energetic: ${auditorName}`, 15, y); y += 5; }
      y += 2;

      // ── Clasă energetică mare + CO₂ ──────────────────────────
      const clsRgb = hexToRgb(cls.color || "#666666");
      doc.setFillColor(...clsRgb);
      doc.roundedRect(15, y, 38, 38, 5, 5, "F");
      doc.setFontSize(32); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text(cls.cls, 34, y + 24, { align: "center" });
      doc.setFontSize(8); doc.setFont(undefined, "normal");
      doc.text("Clasă EP", 34, y + 34, { align: "center" });

      const co2Rgb = hexToRgb(co2Cls.color || "#666666");
      doc.setFillColor(...co2Rgb);
      doc.roundedRect(58, y, 32, 32, 5, 5, "F");
      doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text(co2Cls.cls, 74, y + 18, { align: "center" });
      doc.setFontSize(7); doc.setFont(undefined, "normal");
      doc.text("Clasă CO₂", 74, y + 27, { align: "center" });

      // nZEB badge
      const nzebColor = isNZEB ? [21, 128, 61] : [185, 28, 28];
      doc.setFillColor(...nzebColor);
      doc.roundedRect(95, y, 50, 18, 3, 3, "F");
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text(isNZEB ? "✓ nZEB CONFORM" : "✗ nZEB NECONFORM", 120, y + 11, { align: "center" });
      y += 44;

      // ── 4 indicatori cheie în grid 2×2 ───────────────────────
      doc.setFillColor(240, 244, 248);
      doc.rect(15, y, w - 30, 36, "F");
      const costAnual = annualEnergyCost?.total || 0;
      const kpis = [
        { label: "EP [kWh/(m²·an)]", value: epF.toFixed(1) },
        { label: "CO₂ [kg/(m²·an)]", value: co2F.toFixed(1) },
        { label: "Cost anual [lei]", value: costAnual > 0 ? costAnual.toLocaleString("ro-RO") : "—" },
        { label: "RER [%]", value: rer.toFixed(1) + "%" },
      ];
      const colW = (w - 30) / 2;
      kpis.forEach((kpi, i) => {
        const kx = 15 + (i % 2) * colW + colW / 2;
        const ky = y + 10 + Math.floor(i / 2) * 18;
        doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
        doc.text(kpi.value, kx, ky, { align: "center" });
        doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(100);
        doc.text(kpi.label, kx, ky + 5, { align: "center" });
      });
      y += 42;

      // ── Mini bar chart distribuție consum ────────────────────
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("Distribuție consum pe utilități", 15, y); y += 5;
      const utilColors = {
        incalzire: [239, 68, 68], acm: [249, 115, 22],
        racire: [59, 130, 246], ventilare: [34, 197, 94], iluminat: [234, 179, 8],
      };
      const utilLabels = {
        incalzire: "Încălzire", acm: "ACM",
        racire: "Răcire", ventilare: "Ventilare", iluminat: "Iluminat",
      };
      const utilVals = {
        incalzire: instSummary.q_heating_m2 || 0,
        acm: instSummary.q_acm_m2 || 0,
        racire: instSummary.q_cooling_m2 || 0,
        ventilare: instSummary.q_vent_m2 || 0,
        iluminat: instSummary.q_light_m2 || 0,
      };
      const totalUtil = Object.values(utilVals).reduce((s, v) => s + v, 0) || 1;
      const barMaxW = w - 70;
      Object.entries(utilVals).forEach(([key, val]) => {
        if (val <= 0) return;
        const barW = (val / totalUtil) * barMaxW;
        doc.setFillColor(...(utilColors[key] || [100, 100, 100]));
        doc.rect(35, y, barW, 5, "F");
        doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(60);
        doc.text(utilLabels[key], 15, y + 4);
        doc.text(`${val.toFixed(1)} kWh/m²`, 35 + barW + 2, y + 4);
        y += 8;
      });
      y += 4;

      // ── Top 3 recomandări ─────────────────────────────────────
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text("Top recomandări de îmbunătățire", 15, y); y += 5;
      doc.setFillColor(240, 244, 248);
      doc.rect(15, y, w - 30, 28, "F");
      const recList = rehabComparison?.measures?.slice(0, 3) || [];
      if (recList.length > 0) {
        recList.forEach((rec, i) => {
          doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
          doc.text(`${i + 1}.`, 18, y + 6 + i * 9);
          doc.setFont(undefined, "normal"); doc.setTextColor(40);
          const recText = rec.name || rec.label || rec.desc || "Măsură de reabilitare";
          doc.text(recText.slice(0, 70), 24, y + 6 + i * 9);
        });
      } else {
        doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(80);
        doc.text("1. Îmbunătățire izolație termică anvelopă (pereți, acoperiș, planșeu)", 18, y + 6);
        doc.text("2. Înlocuire tâmplărie exterioară cu profile triple Low-E", 18, y + 15);
        doc.text("3. Instalare sistem HVAC eficient + recuperare căldură ventilare", 18, y + 22);
      }
      y += 34;

      // ── Footer ───────────────────────────────────────────────
      doc.setFillColor(0, 51, 102);
      doc.rect(0, h - 10, w, 10, "F");
      doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(180, 210, 255);
      doc.text(`Zephren v3.2 | Generat la ${new Date().toLocaleDateString("ro-RO")} | Date cu caracter informativ`, w / 2, h - 4, { align: "center" });

      const filename = `Fisa_Sintetica_${(building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      showToast("Fișă sintetică generată: " + filename, "success");
    } catch(e) {
      showToast("Eroare generare fișă: " + e.message, "error");
      console.error("QuickSheet export error:", e);
    } finally { setExporting(null); }
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, rehabComparison, selectedClimate, cooling.hasCooling, getEnergyClass, getCO2Class, getNzebEpMax, NZEB_THRESHOLDS, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B4: EXPORT RAPORT TEHNIC COMPLET PDF
  // ═══════════════════════════════════════════════════════════
  const exportFullReport = useCallback(async () => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
    try {
      setExporting("pdf_full");
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      let y = 0;
      const BLUE = [0, 51, 102];
      const GRAY = [100, 100, 100];
      const LGRAY = [240, 244, 248];
      const Au = parseFloat(building.areaUseful) || 1;
      const V = parseFloat(building.volume) || 1;
      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const catKey = buildCatKey(building.category, cooling.hasCooling);
      const cls = getEnergyClass(epF, catKey);
      const co2Cls = getCO2Class(co2F, building.category);
      const rer = renewSummary?.rer || 0;
      const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
      const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
      const hexToRgb = (hex) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return [r,g,b]; };

      const addPageHeader = (pageNum, title) => {
        doc.setFillColor(...BLUE);
        doc.rect(0, 0, w, 10, "F");
        doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(255,255,255);
        doc.text("ZEPHREN — Raport Tehnic de Performanță Energetică", 8, 6.5);
        doc.text(`Pag. ${pageNum}`, w - 8, 6.5, { align: "right" });
        doc.setTextColor(0); doc.setFont(undefined, "normal");
        y = 16;
        if (title) {
          doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
          doc.text(title, 15, y); y += 2;
          doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(15, y, w-15, y); y += 6;
          doc.setFont(undefined, "normal"); doc.setTextColor(0);
        }
      };

      const addPageFooter = () => {
        doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(`Zephren v3.2 | Mc 001-2022, ISO 52000-1/NA:2023, EPBD 2024/1275 | ${new Date().toLocaleDateString("ro-RO")}`, w/2, h-5, { align: "center" });
      };

      // ── PAGINA 1: COPERTĂ ──────────────────────────────────────────
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, w, 60, "F");
      doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(180,200,220);
      doc.text("RAPORT TEHNIC DE PERFORMANȚĂ ENERGETICĂ", w/2, 20, { align: "center" });
      doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.setTextColor(255,255,255);
      doc.text("Zephren Energy Report", w/2, 33, { align: "center" });
      doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(180,200,220);
      doc.text("conform Mc 001-2022 | ISO 52000-1/NA:2023 | EPBD 2024/1275", w/2, 42, { align: "center" });

      // Clasă energetică pe copertă
      const clsRgb = hexToRgb(cls.color || "#666666");
      doc.setFillColor(...clsRgb);
      doc.roundedRect(w/2 - 16, 50, 32, 20, 4, 4, "F");
      doc.setFontSize(18); doc.setFont(undefined, "bold"); doc.setTextColor(255,255,255);
      doc.text("Clasa " + cls.cls, w/2, 64, { align: "center" });

      y = 80;
      doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("Clădire:", 15, y); y += 6;
      doc.setFont(undefined, "normal"); doc.setFontSize(9); doc.setTextColor(0);
      const bldgLines = [
        building.address ? `Adresă: ${building.address}, ${building.city || ""}, jud. ${building.county || ""}` : "Adresă: —",
        `Categorie: ${BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || building.category}`,
        `An construcție: ${building.yearBuilt || "—"} | Renovare: ${building.yearRenov || "—"}`,
        `Suprafață utilă: ${Au} m²  |  Volum: ${V} m³`,
        `Zonă climatică: ${selectedClimate?.name || "—"} — Zona ${selectedClimate?.zone || "—"} (θe = ${selectedClimate?.theta_e || "—"}°C)`,
      ];
      bldgLines.forEach(l => { doc.text(l, 20, y); y += 5; });

      y += 4;
      doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("Auditor energetic:", 15, y); y += 6;
      doc.setFont(undefined, "normal"); doc.setFontSize(9); doc.setTextColor(0);
      const audLines = [
        `Nume: ${auditor.name || "—"}  |  Atestat: ${auditor.atestat || "—"} / Grad ${auditor.grade || "—"}`,
        `Firmă: ${auditor.company || "—"}`,
        `Data elaborării: ${auditor.date || new Date().toLocaleDateString("ro-RO")}  |  Valabilitate: ${auditor.validityYears || 10} ani`,
      ];
      audLines.forEach(l => { doc.text(l, 20, y); y += 5; });

      // Sumar KPI pe copertă
      y += 8;
      doc.setFillColor(...LGRAY); doc.rect(15, y, w-30, 28, "F");
      doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("INDICATORI CHEIE", w/2, y+6, { align: "center" }); y += 10;
      const kpis = [
        [`EP: ${epF.toFixed(1)} kWh/(m²·an)`, "Energie primară"],
        [`CO₂: ${co2F.toFixed(1)} kg/(m²·an)`, "Emisii CO₂"],
        [`RER: ${rer.toFixed(0)}%`, "Surse regenerabile"],
        [`Ef: ${instSummary.qf_total_m2?.toFixed(1)} kWh/(m²·an)`, "Energie finală"],
        [`G: ${envelopeSummary?.G?.toFixed(3)} W/(m³·K)`, "Coef. global pierderi"],
        [isNZEB ? "✓ nZEB" : "✗ non-nZEB", "Cerință EPBD"],
      ];
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const xk = 22 + col * 58;
        const yk = y + row * 10;
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(0);
        doc.text(kpi[0], xk, yk);
        doc.setFont(undefined, "normal"); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(kpi[1], xk, yk + 3.5);
      });
      addPageFooter();

      // ── PAGINA 2: ANVELOPĂ ────────────────────────────────────────
      doc.addPage();
      addPageHeader(2, "1. Anvelopă clădire — elemente opace și vitrate");

      if (opaqueElements.length > 0) {
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("1.1 Elemente opace", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Element", "Tip", "Suprafață [m²]", "U [W/(m²·K)]", "Pierderi [W/K]"]],
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          body: opaqueElements.map(el => {
            const { u } = calcOpaqueR(el.layers, el.type);
            const area = parseFloat(el.area) || 0;
            return [el.name || el.type, el.type, area.toFixed(1), u.toFixed(3), (area * u).toFixed(1)];
          }),
          foot: [["TOTAL", "", opaqueElements.reduce((s,e)=>s+(parseFloat(e.area)||0),0).toFixed(1), "—",
            opaqueElements.reduce((s,e)=>{ const {u}=calcOpaqueR(e.layers,e.type); return s+(parseFloat(e.area)||0)*u; },0).toFixed(1)]],
          footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (glazingElements.length > 0) {
        if (y > h - 60) { doc.addPage(); addPageHeader(2, ""); }
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("1.2 Elemente vitrate", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Element", "Orientare", "Suprafață [m²]", "Uw [W/(m²·K)]", "g [-]", "Pierderi [W/K]"]],
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          body: glazingElements.map(el => [
            el.name || "Geam", el.orientation || "S",
            (parseFloat(el.area)||0).toFixed(1),
            (parseFloat(el.u)||0).toFixed(2),
            (parseFloat(el.g)||0).toFixed(2),
            ((parseFloat(el.area)||0)*(parseFloat(el.u)||0)).toFixed(1),
          ]),
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (thermalBridges.length > 0) {
        if (y > h - 50) { doc.addPage(); addPageHeader(2, ""); }
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("1.3 Punți termice liniare", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Descriere", "Tip", "Lungime [m]", "ψ [W/(m·K)]", "L·ψ [W/K]"]],
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          body: thermalBridges.map(tb => [
            tb.desc || tb.cat || "PT",
            tb.cat || "—",
            (parseFloat(tb.length)||0).toFixed(1),
            (parseFloat(tb.psi)||0).toFixed(3),
            ((parseFloat(tb.length)||0)*(parseFloat(tb.psi)||0)).toFixed(2),
          ]),
          foot: [["TOTAL", "", thermalBridges.reduce((s,t)=>s+(parseFloat(t.length)||0),0).toFixed(1), "—",
            thermalBridges.reduce((s,t)=>s+(parseFloat(t.length)||0)*(parseFloat(t.psi)||0),0).toFixed(2)]],
          footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (envelopeSummary) {
        if (y > h - 30) { doc.addPage(); addPageHeader(2, ""); }
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("1.4 Sumar anvelopă", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
          body: [
            ["Suprafață totală anvelopă", `${envelopeSummary.totalArea?.toFixed(1) || "—"} m²`],
            ["Pierderi transmisie (H_tr)", `${envelopeSummary.totalHeatLoss?.toFixed(2) || "—"} W/K`],
            ["Coeficient global pierderi G", `${envelopeSummary.G?.toFixed(4) || "—"} W/(m³·K)`],
            ["Raport A/V", `${envelopeSummary.AV?.toFixed(3) || (envelopeSummary.totalArea/V).toFixed(3)} m⁻¹`],
          ],
        });
        y = doc.lastAutoTable.finalY;
      }
      addPageFooter();

      // ── PAGINA 3: CALCUL TERMIC ───────────────────────────────────
      doc.addPage();
      addPageHeader(3, "2. Calcul termic — pierderi, câștiguri, bilanț energetic");

      if (monthlyISO && monthlyISO.length === 12) {
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("2.1 Bilanț termic lunar (ISO 13790)", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Lună", "T ext [°C]", "Q pierderi [kWh]", "Q aporturi [kWh]", "Q încălzire [kWh]", "Q răcire [kWh]", "η_H"]],
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          body: monthlyISO.map(m => [
            m.name || "—",
            m.tExt?.toFixed(1) ?? "—",
            m.Q_loss?.toFixed(0) ?? "—",
            m.Q_gain?.toFixed(0) ?? "—",
            m.qH_nd?.toFixed(0) ?? "—",
            m.qC_nd?.toFixed(0) ?? "—",
            m.eta_H?.toFixed(3) ?? "—",
          ]),
          foot: [["ANUAL", "—",
            monthlyISO.reduce((s,m)=>s+(m.Q_loss||0),0).toFixed(0),
            monthlyISO.reduce((s,m)=>s+(m.Q_gain||0),0).toFixed(0),
            monthlyISO.reduce((s,m)=>s+(m.qH_nd||0),0).toFixed(0),
            monthlyISO.reduce((s,m)=>s+(m.qC_nd||0),0).toFixed(0),
            "—",
          ]],
          footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7 },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (y > h - 55) { doc.addPage(); addPageHeader(3, ""); }
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("2.2 Parametri clădire și climă", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Temperatură interioară de calcul θint", `${heating.theta_int || 20} °C`],
          ["Temperatură exterioară de proiectare θe", `${selectedClimate?.theta_e ?? "—"} °C`],
          ["Rata ventilare n50 (test Blower Door)", `${building.n50 || "—"} h⁻¹`],
          ["Rata schimb aer (ventilare mecanică)", `${ventilation?.ach || "—"} h⁻¹`],
          ["Temperatură medie anuală", `${selectedClimate?.theta_a ?? "—"} °C`],
          ["Grad-zile încălzire (HDD)", `${selectedClimate?.HDD ?? "—"} °C·zile`],
          ["Iradianță orizontală anuală", `${selectedClimate?.Gh ?? "—"} kWh/m²/an`],
        ],
      });
      y = doc.lastAutoTable.finalY;
      addPageFooter();

      // ── PAGINA 4: INSTALAȚII ──────────────────────────────────────
      doc.addPage();
      addPageHeader(4, "3. Instalații energetice — consumuri per utilitate");

      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Utilitate", "Energie finală [kWh/an]", "kWh/(m²·an)", "Energie primară [kWh/an]", "kWh/(m²·an)", "CO₂ [kgCO₂/an]"]],
        headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        body: [
          ["Încălzire",   instSummary.qf_h?.toFixed(0)||"0",  (instSummary.qf_h/Au)?.toFixed(1)||"0",  instSummary.ep_h?.toFixed(0)||"0",  (instSummary.ep_h/Au)?.toFixed(1)||"0",  instSummary.co2_h?.toFixed(0)||"0"],
          ["Apă caldă",   instSummary.qf_w?.toFixed(0)||"0",  (instSummary.qf_w/Au)?.toFixed(1)||"0",  instSummary.ep_w?.toFixed(0)||"0",  (instSummary.ep_w/Au)?.toFixed(1)||"0",  instSummary.co2_w?.toFixed(0)||"0"],
          ["Climatizare", instSummary.qf_c?.toFixed(0)||"0",  (instSummary.qf_c/Au)?.toFixed(1)||"0",  instSummary.ep_c?.toFixed(0)||"0",  (instSummary.ep_c/Au)?.toFixed(1)||"0",  instSummary.co2_c?.toFixed(0)||"0"],
          ["Ventilare",   instSummary.qf_v?.toFixed(0)||"0",  (instSummary.qf_v/Au)?.toFixed(1)||"0",  instSummary.ep_v?.toFixed(0)||"0",  (instSummary.ep_v/Au)?.toFixed(1)||"0",  instSummary.co2_v?.toFixed(0)||"0"],
          ["Iluminat",    instSummary.qf_l?.toFixed(0)||"0",  (instSummary.qf_l/Au)?.toFixed(1)||"0",  instSummary.ep_l?.toFixed(0)||"0",  (instSummary.ep_l/Au)?.toFixed(1)||"0",  instSummary.co2_l?.toFixed(0)||"0"],
        ],
        foot: [["TOTAL",
          instSummary.qf_total?.toFixed(0)||"0", (instSummary.qf_total_m2)?.toFixed(1)||"0",
          (renewSummary?.ep_adjusted||instSummary.ep_total||0).toFixed(0),
          epF.toFixed(1),
          (renewSummary?.co2_adjusted||instSummary.co2_total||0).toFixed(0),
        ]],
        footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
      });
      y = doc.lastAutoTable.finalY + 5;

      // Parametri instalații
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("3.1 Parametri sistem încălzire", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Tip sistem încălzire", heating.type || "—"],
          ["Eficiență generare ηgen", heating.etaGen ? (heating.etaGen * 100).toFixed(0) + " %" : "—"],
          ["Eficiență distribuție ηdist", heating.etaDist ? (heating.etaDist * 100).toFixed(0) + " %" : "—"],
          ["Eficiență emisie ηemit", heating.etaEmit ? (heating.etaEmit * 100).toFixed(0) + " %" : "—"],
          ["Factor primar fp", heating.fp || "—"],
          ["Factor emisie CO₂", heating.fCO2 || "—"],
        ].filter(r => r[1] !== "—"),
      });
      y = doc.lastAutoTable.finalY + 3;

      if (annualEnergyCost) {
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("3.2 Costuri energetice anuale estimate", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
          body: [
            ["Cost total anual", `${annualEnergyCost.total?.toLocaleString("ro-RO") || "—"} lei/an`],
            ["Echivalent EUR", `~${annualEnergyCost.totalEur?.toLocaleString("ro-RO") || "—"} EUR/an`],
            ["Cost pe m² util", `${annualEnergyCost.perM2 ? (annualEnergyCost.perM2).toFixed(1) : "—"} lei/(m²·an)`],
          ],
        });
        y = doc.lastAutoTable.finalY;
      }
      addPageFooter();

      // ── PAGINA 5: SURSE REGENERABILE ─────────────────────────────
      doc.addPage();
      addPageHeader(5, "4. Surse regenerabile de energie");

      const hasPV = parseFloat(photovoltaic?.power) > 0;
      const hasSolarT = parseFloat(solarThermal?.area) > 0;
      const hasHP = heatPump?.enabled;
      const hasBiomass = biomass?.enabled;

      if (renewSummary) {
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Sursă", "Producție [kWh/an]", "kWh/(m²·an)", "Contribuție RER [%]"]],
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          body: [
            hasPV && ["Fotovoltaic (PV)", renewSummary.e_pv?.toFixed(0)||"0", ((renewSummary.e_pv||0)/Au).toFixed(1), "—"],
            hasSolarT && ["Solar termic ACM", renewSummary.e_solar_acm?.toFixed(0)||"0", ((renewSummary.e_solar_acm||0)/Au).toFixed(1), "—"],
            hasHP && ["Pompă de căldură", renewSummary.e_hp?.toFixed(0)||"0", ((renewSummary.e_hp||0)/Au).toFixed(1), "—"],
            hasBiomass && ["Biomasă", renewSummary.e_biomass?.toFixed(0)||"0", ((renewSummary.e_biomass||0)/Au).toFixed(1), "—"],
          ].filter(Boolean),
          foot: [["TOTAL RER", renewSummary.totalRenew?.toFixed(0)||"0", ((renewSummary.totalRenew||0)/Au).toFixed(1), rer.toFixed(1)+"%"]],
          footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (hasPV) {
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("4.1 Sistem fotovoltaic (GP 123/2004)", 15, y); y += 4;
        const pvProd = renewSummary?.pv_production;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
          body: [
            ["Putere instalată Ppv", `${photovoltaic.power} kWp`],
            ["Suprafață panouri", `${photovoltaic.area || (parseFloat(photovoltaic.power)/0.20).toFixed(1)} m²`],
            ["Orientare", photovoltaic.orientation || "S"],
            ["Eficiență modul", `${((parseFloat(photovoltaic.eta)||0.20)*100).toFixed(0)} %`],
            ["Putere invertor", `${photovoltaic.invPower || (parseFloat(photovoltaic.power)*0.95).toFixed(1)} kW`],
            pvProd && ["Producție anuală estimată", `${pvProd.E_annual?.toLocaleString()} kWh/an`],
            pvProd && ["Producție specifică", `${pvProd.specific_yield} kWh/kWp·an`],
          ].filter(Boolean),
        });
        y = doc.lastAutoTable.finalY + 3;
      }

      if (hasSolarT) {
        if (y > h - 40) { doc.addPage(); addPageHeader(5, ""); }
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("4.2 Solar termic ACM", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
          body: [
            ["Suprafață colectori", `${solarThermal.area} m²`],
            ["Tip colector", solarThermal.type || "—"],
            ["Fracție solară anuală", renewSummary?.fSolar ? `${(renewSummary.fSolar*100).toFixed(0)} %` : "—"],
          ],
        });
        y = doc.lastAutoTable.finalY;
      }
      addPageFooter();

      // ── PAGINA 6: CLASIFICARE ENERGETICĂ ─────────────────────────
      doc.addPage();
      addPageHeader(6, "5. Clasificare energetică — Mc 001-2022");

      doc.setFontSize(9); doc.setTextColor(0); doc.setFont(undefined, "normal");
      doc.text("Clasare conform metodologiei Mc 001-2022 (Ordinul MDLPA nr. 16/2023) și ISO 52000-1/NA:2023", 15, y); y += 8;

      // Clasă mare centru
      const clsRgb2 = hexToRgb(cls.color || "#666666");
      doc.setFillColor(...clsRgb2); doc.roundedRect(w/2 - 35, y, 30, 28, 4, 4, "F");
      doc.setFontSize(22); doc.setFont(undefined, "bold"); doc.setTextColor(255,255,255);
      doc.text(cls.cls, w/2 - 20, y + 18, { align: "center" });
      doc.setFontSize(8); doc.text("EP", w/2 - 20, y + 25, { align: "center" });

      const co2Rgb2 = hexToRgb(co2Cls.color || "#666666");
      doc.setFillColor(...co2Rgb2); doc.roundedRect(w/2 + 5, y, 30, 28, 4, 4, "F");
      doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(255,255,255);
      doc.text(co2Cls.cls, w/2 + 20, y + 15, { align: "center" });
      doc.setFontSize(8); doc.text("CO₂", w/2 + 20, y + 24, { align: "center" });
      y += 34;

      doc.setFontSize(9); doc.setFont(undefined, "bold");
      doc.setTextColor(isNZEB ? 21 : 114, isNZEB ? 87 : 28, isNZEB ? 36 : 36);
      doc.text(isNZEB ? "✓ CONFORM nZEB" : "✗ NECONFORM nZEB", w/2, y, { align: "center" }); y += 8;

      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Energie primară EP [kWh/(m²·an)]", `${epF.toFixed(1)} — Clasă ${cls.cls}`],
          ["CO₂ specific [kgCO₂/(m²·an)]", `${co2F.toFixed(1)} — Clasă CO₂: ${co2Cls.cls}`],
          ["Energie finală Ef [kWh/(m²·an)]", `${instSummary.qf_total_m2?.toFixed(1)}`],
          ["Cotă surse regenerabile RER", `${rer.toFixed(1)} % (minim nZEB: ${nzeb.rer_min} %)`],
          ["Prag nZEB-EP pentru zonă/categorie", `${getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0) || "—"} kWh/(m²·an)`],
          ["Scor energetic", `${cls.score || "—"} / 100`],
          ["Eticheta energetică", cls.cls + (isNZEB ? " (nZEB)" : "")],
        ],
      });
      y = doc.lastAutoTable.finalY;
      addPageFooter();

      // ── PAGINA 7: RECOMANDĂRI ─────────────────────────────────────
      if (rehabComparison || (financialAnalysis)) {
        doc.addPage();
        addPageHeader(7, "6. Scenariu de reabilitare și analiză financiară");

        if (rehabComparison) {
          doc.autoTable({
            startY: y, margin: { left: 15, right: 15 }, theme: "grid",
            head: [["Indicator", "Stare actuală", "Stare reabilitată", "Economie"]],
            headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 },
            body: [
              ["EP [kWh/(m²·an)]",
                rehabComparison.before?.ep?.toFixed(1)||"—",
                rehabComparison.after?.ep?.toFixed(1)||"—",
                rehabComparison.delta?.ep ? rehabComparison.delta.ep.toFixed(1) + " kWh/(m²·an)" : "—"
              ],
              ["Clasă energetică",
                rehabComparison.before?.cls||"—",
                rehabComparison.after?.cls||"—",
                rehabComparison.before?.cls !== rehabComparison.after?.cls ? `${rehabComparison.before?.cls} → ${rehabComparison.after?.cls}` : "Idem"
              ],
              ["Cost anual energie [lei/an]",
                rehabComparison.before?.cost?.toLocaleString("ro-RO")||"—",
                rehabComparison.after?.cost?.toLocaleString("ro-RO")||"—",
                rehabComparison.delta?.cost ? rehabComparison.delta.cost.toLocaleString("ro-RO") + " lei/an" : "—"
              ],
            ],
          });
          y = doc.lastAutoTable.finalY + 5;
        }

        if (financialAnalysis) {
          doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
          doc.text("6.1 Analiză financiară reabilitare", 15, y); y += 4;
          doc.autoTable({
            startY: y, margin: { left: 15, right: 15 }, theme: "grid",
            headStyles: { fillColor: LGRAY, textColor: [26,26,46], fontStyle: "bold", fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
            body: [
              ["Investiție totală estimată", `${financialAnalysis.investitie?.toLocaleString("ro-RO") || "—"} lei`],
              ["Economie anuală energie", `${financialAnalysis.economieAnuala?.toLocaleString("ro-RO") || "—"} lei/an`],
              ["Perioadă simplă de recuperare (PBP)", `${financialAnalysis.pbp?.toFixed(1) || "—"} ani`],
              ["VAN (25 ani, rata 5%)", `${financialAnalysis.npv?.toLocaleString("ro-RO") || "—"} lei`],
              ["Rată internă de rentabilitate IRR", `${financialAnalysis.irr ? (financialAnalysis.irr*100).toFixed(1) + " %" : "—"}`],
              ["Eligibil PNRR/Casa Verde", financialAnalysis.eligibil ? "Da" : "Nu"],
            ].filter(r => r[1] !== "—"),
          });
          y = doc.lastAutoTable.finalY;
        }
        addPageFooter();
      }

      // ── PAGINA FOTOGRAFII (opțional) ─────────────────────────────
      if (buildingPhotos && buildingPhotos.length > 0) {
        doc.addPage();
        const pageNum = doc.getNumberOfPages();
        addPageHeader(pageNum, "7. Documentare fotografică");
        const catLabels = { exterior: "Exterior", interior: "Interior", ir: "Termoviziune IR", instalatii: "Instalații", defecte: "Defecte", altele: "Altele" };
        // Group by category
        const grouped = {};
        buildingPhotos.forEach(p => {
          const cat = p.zone || "altele";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p);
        });
        for (const [cat, photos] of Object.entries(grouped)) {
          if (y > h - 50) { doc.addPage(); addPageHeader(doc.getNumberOfPages(), ""); }
          doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
          doc.text((catLabels[cat] || cat) + ` (${photos.length})`, 15, y); y += 4;
          const imgW = 55; const imgH = 38; const cols = 3; const gap = 5;
          photos.forEach((ph, i) => {
            if (y + imgH + 10 > h - 12) { doc.addPage(); addPageHeader(doc.getNumberOfPages(), ""); }
            const col = i % cols;
            const xImg = 15 + col * (imgW + gap);
            if (col === 0 && i > 0) y += imgH + 8;
            try {
              doc.addImage(ph.url, "JPEG", xImg, y, imgW, imgH, undefined, "MEDIUM");
            } catch(e) { /* skip unreadable image */ }
            if (ph.label) {
              doc.setFontSize(6); doc.setFont(undefined, "normal"); doc.setTextColor(...GRAY);
              doc.text(ph.label.slice(0,30), xImg + imgW/2, y + imgH + 2, { align: "center" });
            }
            if (col === cols - 1 || i === photos.length - 1) { y += imgH + 8; }
          });
          y += 4;
          addPageFooter();
        }
      }

      // Semnătură finală pe ultima pagină
      const finalPage = doc.getNumberOfPages();
      doc.setPage(finalPage);
      const ySign = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 230;
      doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
      doc.line(15, ySign, 85, ySign);
      doc.line(w - 85, ySign, w - 15, ySign);
      doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text("Semnătură auditor", 50, ySign + 4, { align: "center" });
      doc.text("Ștampilă / Dată", w - 50, ySign + 4, { align: "center" });

      const filename = `Zephren_Raport_Tehnic_${(building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25)}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      showToast(`Raport tehnic complet generat (${doc.getNumberOfPages()} pagini)`, "success");
    } catch (e) {
      showToast("Eroare generare raport: " + e.message, "error");
      console.error("Full report export error:", e);
    } finally { setExporting(null); }
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate,
      opaqueElements, glazingElements, thermalBridges, envelopeSummary,
      heating, cooling, ventilation, solarThermal, photovoltaic, heatPump, biomass,
      monthlyISO, rehabComparison, financialAnalysis, buildingPhotos,
      cooling.hasCooling, showToast, calcOpaqueR, getNzebEpMax]);

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
          showToast(lang==="EN"?"Invalid format — not a Zephren bulk export.":"Format invalid — nu este un export bulk Zephren.", "error"); return;
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
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const cls = getEnergyClass(epF, catKey);
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
  // RAPORT CONFORMITATE MULTI-NORMATIV PDF
  // Mc 001-2022 · C107 · BACS EN 15232-1 · EPBD 2024/1275 · nZEB
  // ═══════════════════════════════════════════════════════════════
  const exportComplianceReport = useCallback(async () => {
    if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 14;
      const colW = pageW - margin * 2;

      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const rer = renewSummary?.rer || 0;
      const catKey = buildCatKey(building.category, cooling.hasCooling);
      const enClass = getEnergyClass(epF, catKey);
      const Au = parseFloat(building.areaUseful) || 0;
      const nzebEpMax = getNzebEpMax(building.category, selectedClimate?.zone);
      const nzebThresh = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
      const isNZEB = epF <= nzebEpMax && rer >= nzebThresh.rer_min;
      const zebThresh = ZEB_THRESHOLDS[building.category] || ZEB_THRESHOLDS.RI;
      const isZEB = epF <= zebThresh.ep_max && rer >= zebThresh.rer_min;
      const bacsOk = ["A","B","C"].includes(bacsClass);
      const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || building.category;

      // C107 conformitate
      const c107Result = checkC107Conformity(opaqueElements, glazingElements, building.category, calcOpaqueR);
      const c107Ok = c107Result?.checks?.every(c => c.ok) ?? false;
      const c107Pct = c107Result?.checks?.length
        ? Math.round(c107Result.checks.filter(c => c.ok).length / c107Result.checks.length * 100) : 0;

      // ── Header pagina 1 ────────────────────────────────────────────
      doc.setFillColor(13, 15, 26);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RAPORT DE CONFORMITATE ENERGETICĂ", margin, 12);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 200);
      doc.text("Multi-normativ: Mc 001-2022 · C107 · BACS EN 15232-1 · EPBD 2024/1275 · nZEB/ZEB", margin, 19);
      doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")} | Auditor: ${auditor?.name || "—"} | Atestat: ${auditor?.atestat || "—"}`, margin, 25);

      // ── Date clădire ───────────────────────────────────────────────
      doc.setTextColor(40, 40, 60);
      doc.setFillColor(245, 246, 250);
      doc.rect(margin, 33, colW, 18, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 100);
      doc.text("CLĂDIRE IDENTIFICATĂ", margin + 3, 39);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 60);
      doc.text(`Adresă: ${[building.address, building.city, building.county].filter(Boolean).join(", ") || "—"}`, margin + 3, 44);
      doc.text(`Categorie: ${catLabel} · Suprafață utilă: ${Au.toFixed(0)} m² · An construcție: ${building.yearBuilt || "—"} · Zonă climatică: ${selectedClimate?.zone || "—"}`, margin + 3, 49);

      // ── Tabel verificări ──────────────────────────────────────────
      const checks = [
        {
          normativ: "Mc 001-2022",
          cerinta: "Clasă energetică A+…G",
          valoare: `EP = ${epF.toFixed(1)} kWh/(m²·an) → Clasa ${enClass}`,
          status: ["A+","A","B"].includes(enClass) ? "EXCELENT" : ["C","D"].includes(enClass) ? "SATISFĂCĂTOR" : "NECESITĂ INTERVENȚIE",
          ok: ["A+","A","B","C"].includes(enClass),
        },
        {
          normativ: "Mc 001-2022",
          cerinta: "nZEB (Legea 238/2024)",
          valoare: `EP ≤ ${nzebEpMax} kWh/(m²·an) · RER ≥ ${nzebThresh.rer_min}% | EP=${epF.toFixed(1)}, RER=${rer.toFixed(0)}%`,
          status: isNZEB ? "CONFORM" : "NECONFORM",
          ok: isNZEB,
        },
        {
          normativ: "EPBD 2024/1275 Art.11",
          cerinta: "ZEB (Zero Emission Building)",
          valoare: `EP ≤ ${zebThresh.ep_max} kWh/(m²·an) · RER ≥ ${zebThresh.rer_min}% | EP=${epF.toFixed(1)}, RER=${rer.toFixed(0)}%`,
          status: isZEB ? "CONFORM" : "NECONFORM (termen: mai 2026)",
          ok: isZEB,
        },
        {
          normativ: "C107/2-2005",
          cerinta: "Rezistențe termice minime anvelopă",
          valoare: `${c107Result?.checks?.length || 0} elemente verificate · ${c107Pct}% conforme`,
          status: c107Ok ? "CONFORM" : `NECONFORM (${100 - c107Pct}% elemente sub limită)`,
          ok: c107Ok,
        },
        {
          normativ: "BACS EN 15232-1",
          cerinta: "Clasa automatizare ≥ C (EPBD Art.14)",
          valoare: `Clasa BACS detectată: ${bacsClass}`,
          status: bacsOk ? "CONFORM" : "NECONFORM — necesită upgrade BACS",
          ok: bacsOk,
        },
        {
          normativ: "SR EN ISO 52000-1:2017",
          cerinta: "Factor energie primară electricitate",
          valoare: `fP(electricitate) = ${FP_ELEC} (SEN România)`,
          status: "APLICAT",
          ok: true,
        },
        {
          normativ: "Mc 001-2022 Cap.3",
          cerinta: "Emisii CO₂ echivalent",
          valoare: `CO₂ = ${co2F.toFixed(2)} kg/(m²·an)`,
          status: co2F < 20 ? "PERFORMANT" : co2F < 50 ? "MEDIU" : "RIDICAT",
          ok: co2F < 50,
        },
        ...(envelopeSummary?.avRatio != null ? [{
          normativ: "Mc 001-2022 Art.4.2",
          cerinta: "Compact clădire (Av/V ≤ 1.0 rezidențial)",
          valoare: `Av/V = ${envelopeSummary.avRatio?.toFixed(3) || "—"}`,
          status: (envelopeSummary.avRatio || 0) <= 1.2 ? "SATISFĂCĂTOR" : "COMPACT REDUS",
          ok: (envelopeSummary.avRatio || 0) <= 1.2,
        }] : []),
      ];

      doc.autoTable({
        startY: 54,
        head: [["Normativ", "Cerință", "Valoare calculată", "Status"]],
        body: checks.map(c => [c.normativ, c.cerinta, c.valoare, c.status]),
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 230], lineWidth: 0.3 },
        headStyles: { fillColor: [13, 15, 26], textColor: [245, 158, 11], fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: "bold" },
          1: { cellWidth: 50 },
          2: { cellWidth: 72 },
          3: { cellWidth: 28, fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.section === "body") {
            const ok = checks[data.row.index]?.ok;
            data.cell.styles.textColor = ok ? [22, 163, 74] : [220, 38, 38];
          }
        },
        margin: { left: margin, right: margin },
      });

      // ── Detalii C107 per element ──────────────────────────────────
      if (c107Result?.checks?.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 60);
        doc.text("Detaliu conformitate C107/2-2005 — elemente anvelopă", margin, finalY);
        doc.autoTable({
          startY: finalY + 3,
          head: [["Element", "Tip", "U calc. [W/(m²·K)]", "U ref. [W/(m²·K)]", "Status"]],
          body: c107Result.checks.map(c => [
            c.name || "—",
            c.type || "—",
            c.uCalc != null ? c.uCalc.toFixed(3) : "—",
            c.uRef != null ? c.uRef.toFixed(3) : "—",
            c.ok ? "✓ CONFORM" : "✗ NECONFORM",
          ]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5 },
          columnStyles: { 4: { fontStyle: "bold" } },
          didParseCell: (data) => {
            if (data.column.index === 4 && data.section === "body") {
              data.cell.styles.textColor = c107Result.checks[data.row.index]?.ok ? [22, 163, 74] : [220, 38, 38];
            }
          },
          margin: { left: margin, right: margin },
        });
      }

      // ── Concluzie & semnătură ─────────────────────────────────────
      const endY = doc.lastAutoTable.finalY + 8;
      const conformCount = checks.filter(c => c.ok).length;
      const conformPct = Math.round(conformCount / checks.length * 100);
      doc.setFillColor(conformPct >= 80 ? 240 : 254, conformPct >= 80 ? 253 : 242, conformPct >= 80 ? 244 : 232);
      doc.rect(margin, endY, colW, 18, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(conformPct >= 80 ? 22 : 180, conformPct >= 80 ? 163 : 80, conformPct >= 80 ? 74 : 0);
      doc.text(`CONFORMITATE GLOBALĂ: ${conformCount}/${checks.length} cerințe îndeplinite (${conformPct}%)`, margin + 3, endY + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 120);
      doc.text("Valorile sunt calculate conform metodologiei Mc 001-2022 și normativelor europene în vigoare la data generării.", margin + 3, endY + 12);
      doc.text(`Auditor: ${auditor?.name || "—"} · Atestat: ${auditor?.atestat || "—"} · Data: ${new Date().toLocaleDateString("ro-RO")}`, margin + 3, endY + 16);

      // ── Footer ────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(160, 160, 180);
        doc.text(`Zephren v3.8 | Raport conformitate multi-normativ | Pag. ${i}/${pageCount}`, pageW / 2, 292, { align: "center" });
      }

      const addr = (building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
      doc.save(`Conformitate_${addr}_${new Date().toISOString().slice(0,10)}.pdf`);
      showToast("Raport conformitate generat!", "success");
    } catch (e) {
      console.error("Compliance PDF error:", e);
      showToast("Eroare generare raport conformitate", "error");
    } finally {
      setExporting(null);
    }
  }, [instSummary, renewSummary, building, selectedClimate, cooling.hasCooling,
      envelopeSummary, opaqueElements, glazingElements, bacsClass, auditor,
      getEnergyClass, getNzebEpMax, calcOpaqueR, showToast]);


  // BridgeModal → extras în components/BridgeModal.jsx

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
        headline: lang==="EN"?"Get started":"Fără obligații",
        features: lang==="EN"
          ? ["3 CPE/month","Full calculator","Climate database","Thermal bridges","DOCX with watermark"]
          : ["3 CPE/lună","Calculator complet","Bază de date climatică","Punți termice","DOCX cu watermark"],
        missing: lang==="EN"
          ? ["Clean PDF/DOCX","nZEB report","MDLPA templates","Multi-user"]
          : ["PDF/DOCX curat","Raport nZEB","Template-uri MDLPA","Multi-user"] },
      { ...TIERS.standard, icon:"📋", color:"sky", border:"border-sky-500/30",
        headline: lang==="EN"?"For individual auditors":"Pentru auditori individuali",
        priceLabel: "149 RON/lună", priceAnLabel: "1.499 RON/an",
        features: lang==="EN"
          ? ["Unlimited CPE","Clean PDF export","MDLPA templates","nZEB report","Monthly webinars","1 user"]
          : ["CPE nelimitat","Export PDF fără watermark","Template-uri MDLPA","Raport nZEB","Webinare lunare","1 utilizator"],
        missing: lang==="EN"
          ? ["XML MDLPA export","API access","Multi-user"]
          : ["Export XML MDLPA","API REST","Multi-user"] },
      { ...TIERS.pro, icon:"⚡", color:"amber", border:"border-amber-500/50 ring-2 ring-amber-500/20", recommended:true,
        headline: lang==="EN"?"Most popular":"Cel mai popular",
        priceLabel: "299 RON/lună", priceAnLabel: "2.999 RON/an",
        features: lang==="EN"
          ? ["All Standard features","XML MDLPA export","API REST access","Up to 5 users","24h priority support","ISO 52016-1 hourly calc","EN 12831 · PNRR · Passivhaus"]
          : ["Tot din Standard +","Export XML MDLPA","API REST acces","Până la 5 utilizatori","Suport prioritar 24h","Calcul orar ISO 52016-1","EN 12831 · PNRR · Pasivhaus"],
        missing: lang==="EN"
          ? ["Custom CPE branding","AI Assistant"]
          : ["Branding personalizat CPE","AI Assistant"] },
      { ...TIERS.asociatie, icon:"🏢", color:"emerald", border:"border-emerald-500/30",
        headline: lang==="EN"?"For associations & firms":"Asociații & birouri",
        priceLabel: lang==="EN"?"Negotiated":"Negociat", priceAnLabel: null,
        features: lang==="EN"
          ? ["Institutional license","Up to 20 users","Custom CPE branding","AI Assistant","Client portfolio","CPE expiry alerts","Dedicated support"]
          : ["Licență instituțională","Până la 20 utilizatori","Branding personalizat CPE","AI Assistant","Portofoliu clienți","Notificări expirare CPE","Suport dedicat"],
        missing:[] },
    ];
    return (
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto" style={{zIndex:99999,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)"}} onClick={() => setShowPricingPage(false)}>
        <div className="relative bg-[#0d0d20] border border-white/15 rounded-2xl p-4 sm:p-8 max-w-3xl w-full shadow-2xl my-4 sm:my-8 mx-3 sm:mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowPricingPage(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm z-10">&times;</button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
              <img src="/logo.svg" alt="Zephren" style={{height:"22px",width:"auto"}} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{lang==="EN"?"Choose your plan":"Alege planul potrivit"}</h2>
            <p className="text-xs sm:text-sm opacity-40 mt-1">{lang==="EN"?"Switch anytime · Cancel anytime":"Poți schimba oricând · Fără obligații"}</p>
          </div>

          {/* Quick tier switcher — pill buttons */}
          <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 max-w-sm mx-auto">
            {["free","standard","pro","asociatie"].map(tid => (
              <button key={tid} onClick={() => { activateTier(tid); }}
                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  userTier === tid || (userTier === "business" && tid === "asociatie")
                    ? tid === "free" ? "bg-white/15 text-white shadow-lg"
                    : tid === "standard" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                    : tid === "pro" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                    : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}>
                {TIERS[tid]?.label || tid}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {plans.map(p => {
              const isCurrent = p.id === userTier || (userTier === "business" && p.id === "asociatie");
              const colorMap = {
                amber:   { bg:"bg-amber-500/5",   ring:"ring-amber-500/30",   btn:"bg-amber-500 hover:bg-amber-400 text-black",   badge:"bg-amber-500 text-black",   check:"text-amber-400" },
                emerald: { bg:"bg-emerald-500/5",  ring:"ring-emerald-500/30", btn:"bg-emerald-500 hover:bg-emerald-400 text-black", badge:"bg-emerald-500 text-black", check:"text-emerald-400" },
                sky:     { bg:"bg-sky-500/5",      ring:"ring-sky-500/30",     btn:"bg-sky-500 hover:bg-sky-400 text-white",         badge:"bg-sky-500 text-white",     check:"text-sky-400" },
                white:   { bg:"bg-white/[0.02]",   ring:"ring-white/10",       btn:"bg-white/10 hover:bg-white/15 text-white",       badge:"bg-white/20 text-white",    check:"text-white/60" },
              };
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
                      {p.price === 0 && p.id === "free" ? (
                        <span className="text-2xl font-black opacity-50">{lang==="EN"?"Free":"Gratuit"}</span>
                      ) : p.id === "asociatie" ? (
                        <span className="text-sm font-bold opacity-60">{lang==="EN"?"Negotiated":"Negociat"}</span>
                      ) : (
                        <div>
                          <span className="text-2xl font-black">{p.price}</span>
                          <span className="text-xs opacity-50 ml-1">RON/lună</span>
                          {p.priceAn && <div className="text-[10px] opacity-40 mt-0.5">{p.priceAn} RON/an <span className="text-green-400">(-16%)</span></div>}
                        </div>
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
                  ) : p.id === "asociatie" ? (
                    <a href="mailto:contact@zephren.ro" className={`block w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${cm.btn}`}>
                      {lang==="EN"?"Contact us":"Contactează-ne"}
                    </a>
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
      <div className="w-full px-2 sm:px-6 py-1.5 no-print" style={{background:theme==="dark"?"rgba(26,29,46,0.5)":"rgba(0,0,0,0.02)"}}>
        <div className="max-w-7xl mx-auto flex items-center gap-0.5 sm:gap-1" role="tablist" aria-label="Pași calcul energetic">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)} className="flex-1 group relative pt-1 pb-0.5" title={`${s.id}. ${s.label}`}
              role="tab" aria-selected={s.id === step} aria-label={`Pas ${s.id}: ${lang==="EN" ? s.labelEN : s.label}`}>
              <div className="h-2 rounded-full transition-all duration-500" style={{
                background: s.id < step ? "linear-gradient(90deg,#22c55e,#4ade80)" :
                  s.id === step ? "linear-gradient(90deg,#f59e0b,#fbbf24)" :
                  theme==="dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
              }} />
              <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 hidden min-[400px]:flex items-center justify-center text-[8px] sm:text-[9px] font-bold transition-all shadow-sm",
                s.id < step ? "bg-emerald-500 border-emerald-400 text-white scale-90" :
                s.id === step ? "bg-amber-500 border-amber-400 text-black scale-110" :
                "bg-white/10 border-white/20 text-white/40 scale-75"
              )}>
                {s.id < step ? "✓" : s.id}
              </div>
            </button>
          ))}
        </div>
        <div className="text-center mt-1">
          <span className="text-xs opacity-50">{step}/{STEPS.length} — <span className="font-medium opacity-70">{STEPS.find(s=>s.id===step)?.label}</span> | {dataProgress}% complet</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="border-b border-white/[0.06] px-3 sm:px-6 py-2 sm:py-3 no-print">
        <div className="max-w-7xl mx-auto flex items-center gap-2">

          {/* ── ZONA 1: IDENTITATE (logo · plan · cloud · echipă) ── */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setSidebarOpen(o=>!o)} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/5 shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>
            <img src="/logo.svg" alt="Zephren" className="shrink-0" style={{height:"36px", width:"auto"}} />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">v{APP_VERSION}</span>
            <h1 className="sr-only">Zephren — Calculator Performanță Energetică</h1>

            {/* Plan badges */}
            <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
              {["free","starter","standard","pro","business","enterprise"].map(tid => {
                const isActive = userTier === tid || (userTier === "asociatie" && tid === "business");
                const BADGE = {
                  free:       { label: "FREE", cls: "bg-white/15 text-white" },
                  starter:    { label: "STA",  cls: "bg-sky-400 text-white shadow-sm" },
                  standard:   { label: "STD",  cls: "bg-sky-500 text-white shadow-sm" },
                  pro:        { label: "⚡PRO", cls: "bg-amber-500 text-black shadow-sm" },
                  business:   { label: "BUS",  cls: "bg-violet-500 text-white shadow-sm" },
                  enterprise: { label: "ENT",  cls: "bg-emerald-500 text-white shadow-sm" },
                };
                return (
                  <button key={tid} onClick={(e) => { e.stopPropagation(); activateTier(tid); showToast(`Plan ${TIERS[tid]?.label || tid} activat`, "success"); }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${isActive ? "" : "hidden sm:block"} ${
                      isActive ? BADGE[tid].cls : "text-white/30 hover:text-white/60"
                    }`}>
                    {BADGE[tid].label}
                  </button>
                );
              })}
            </div>

            {/* Cloud + Echipă — zona identitate */}
            <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-white/[0.08]">
              <button
                onClick={saveToCloud}
                title={cloud?.isLoggedIn ? "Salvează în cloud" : "Autentifică-te pentru cloud"}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-colors ${
                  cloud?.isLoggedIn
                    ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400"
                    : "border-white/10 hover:bg-white/5 text-white/30"
                }`}>
                ☁️
                {cloud?.isLoggedIn && (
                  <span className="text-[10px] font-medium">
                    {cloud.user?.name?.split(" ")[0] || cloud.user?.email?.split("@")[0]}
                  </span>
                )}
              </button>
              <button
                onClick={() => { loadTeamData(); loadCloudProjects(); setShowTeamManager(true); }}
                title="Echipă & Cloud"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors">
                👥 <span className="text-[10px]">Echipă</span>
              </button>
            </div>
          </div>

          {/* Separator 1 */}
          <div className="hidden lg:block w-px h-5 bg-white/[0.08] shrink-0" />

          {/* ── ZONA 2: NAVIGARE (proiecte · nou) ── */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <button onClick={() => { refreshProjectList(); setShowProjectManager(true); }}
              className="text-xs px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 transition-all">
              📁 Proiecte
            </button>
            <button onClick={() => setShowResetConfirm(true)}
              className="text-xs px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all">
              {lang==="EN" ? "New" : "Nou"}
            </button>
          </div>

          {/* Separator 2 */}
          <div className="hidden lg:block w-px h-5 bg-white/[0.08] shrink-0" />

          {/* Spacer + breadcrumb desktop */}
          <div className="flex-1 hidden lg:flex items-center justify-center">
            <div className="flex items-center gap-1.5 text-xs opacity-40">
              {STEPS.map((s, i) => (
                <span key={s.id} className="flex items-center gap-1">
                  {i > 0 && <span className="opacity-30">›</span>}
                  <span className={cn("transition-all", step === s.id && "opacity-100 text-amber-400 font-semibold")}>
                    {s.id === step ? s.label : s.id}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ── ZONA 3: ACȚIUNI (undo · salvat · quickfill · tutorial · ⋯) ── */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Mobile: Proiecte + Nou */}
            <button onClick={() => { refreshProjectList(); setShowProjectManager(true); }}
              className="lg:hidden text-[10px] px-2 py-1 rounded-lg border border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10 transition-all shrink-0">
              📁
            </button>
            <button onClick={() => setShowResetConfirm(true)}
              className="lg:hidden text-[10px] px-2 py-1 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 transition-all shrink-0">
              {lang==="EN" ? "New" : "Nou"}
            </button>

            {storageStatus && <span className="text-[10px] opacity-40 hidden lg:inline shrink-0">{storageStatus}</span>}

            <div className="hidden lg:flex items-center gap-0.5 shrink-0">
              <button onClick={undo} disabled={undoStack.length===0} title="Undo (Ctrl+Z)"
                className={cn("text-xs px-1.5 py-1 rounded-l-lg border border-white/10 transition-colors", undoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↶</button>
              <button onClick={redo} disabled={redoStack.length===0} title="Redo (Ctrl+Y)"
                className={cn("text-xs px-1.5 py-1 rounded-r-lg border border-l-0 border-white/10 transition-colors", redoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↷</button>
            </div>

            <button onClick={() => setShowQuickFill(true)}
              className="text-xs px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold transition-colors hidden sm:flex shrink-0"
              title="Completare rapidă date clădire">
              ⚡<span className="hidden lg:inline"> Quick Fill</span>
            </button>

            <button onClick={() => setShowTutorial(true)} title="Tutorial interactiv"
              className="text-[10px] sm:text-xs px-2 py-1 rounded-lg border border-purple-500/25 bg-purple-500/8 text-purple-300/70 hover:bg-purple-500/20 hover:text-purple-300 transition-all shrink-0">
              🎓<span className="hidden lg:inline ml-1">Tutorial</span>
            </button>

            <input ref={importFileRef} type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files[0]) { importProject(e.target.files[0]); e.target.value=""; } }} />
          </div>
          {/* Butoane fixe (nu se scrollează) — dropdown-ul nu e clipat de overflow */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Dropdown "Mai mult" — instrumente secundare, vizibil pe toate dimensiunile */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(o => !o)}
                className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                title="Instrumente suplimentare"
                aria-label="Instrumente suplimentare">
                ⋯
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-[9989]" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-[9990] bg-[#0d0f1a] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[210px] max-h-[80vh] overflow-y-auto">

                    {/* Acțiuni principale — afișate doar pe mobile (ascunse în header la lg+) */}
                    <div className="lg:hidden mb-1 pb-1 border-b border-white/[0.06]">
                      <div className="text-[9px] uppercase tracking-wider opacity-30 px-3 py-1">Acțiuni rapide</div>
                      {[
                        { icon: "💾", label: "Export JSON", action: exportProject },
                        { icon: "📂", label: "Import JSON", action: () => importFileRef.current?.click() },
                        { icon: "⚡", label: "Quick Fill", action: () => setShowQuickFill(true), color: "text-amber-300" },
                        { icon: "📋", label: "Formular Audit", action: () => setShowAuditForm(true), color: "text-sky-300" },
                        { icon: "🖨️", label: "Printează", action: () => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 500); } },
                        { icon: "↶", label: `Undo${undoStack.length > 0 ? ` (${undoStack.length})` : ""}`, action: undo, color: undoStack.length > 0 ? "" : "opacity-30 cursor-not-allowed" },
                        { icon: "↷", label: `Redo${redoStack.length > 0 ? ` (${redoStack.length})` : ""}`, action: redo, color: redoStack.length > 0 ? "" : "opacity-30 cursor-not-allowed" },
                      ].map((item, i) => (
                        <button key={i}
                          onClick={() => { item.action(); setShowMoreMenu(false); }}
                          className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-left text-xs transition-colors", item.color || "text-white/70")}>
                          <span className="text-sm w-5 text-center">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Instrumente avansate — mereu vizibile */}
                    <div className="lg:hidden mb-1">
                      <div className="text-[9px] uppercase tracking-wider opacity-30 px-3 py-1">Export date</div>
                      {[
                        { icon: "📊", label: "Export CSV", action: exportCSV },
                        { icon: "📗", label: "Export XLSX", action: exportExcel, color: "text-green-400" },
                        { icon: "☁️", label: "Salvează cloud", action: saveToCloud, color: cloud?.isLoggedIn ? "text-green-400" : "opacity-40" },
                      ].map((item, i) => (
                        <button key={i}
                          onClick={() => { item.action(); setShowMoreMenu(false); }}
                          className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-left text-xs transition-colors", item.color || "text-white/70")}>
                          <span className="text-sm w-5 text-center">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Separator vizibil doar dacă secțiunile mobile sunt prezente */}
                    <div className="lg:hidden border-t border-white/[0.06] mb-1 pt-1">
                      <div className="text-[9px] uppercase tracking-wider opacity-30 px-3 py-1">Instrumente</div>
                    </div>

                    {/* Export / Import — mereu vizibile (mutate din header) */}
                    <div className="mb-1 pb-1 border-b border-white/[0.06]">
                      <div className="text-[9px] uppercase tracking-wider opacity-30 px-3 py-1">Export / Import</div>
                      {[
                        { icon: "💾", label: "Export JSON", action: exportProject },
                        { icon: "📊", label: "Export CSV", action: exportCSV },
                        { icon: "📗", label: "Export XLSX", action: exportExcel, color: "text-green-400" },
                        { icon: "📂", label: "Import JSON", action: () => importFileRef.current?.click() },
                        { icon: "📋", label: "Formular Audit", action: () => setShowAuditForm(true), color: "text-sky-300" },
                      ].map((item, i) => (
                        <button key={i}
                          onClick={() => { item.action(); setShowMoreMenu(false); }}
                          className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-left text-xs transition-colors", item.color || "text-white/70")}>
                          <span className="text-sm w-5 text-center">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Instrumente avansate — mereu vizibile (la toate dimensiunile) */}
                    {[
                      { icon: "📋", label: "Conformitate PDF", action: exportComplianceReport, color: "text-violet-400" },
                      { icon: "🔗", label: "Partajare + QR", action: () => setShowShareModal(true), color: "text-indigo-400" },
                      { icon: "📥", label: "Import din alt soft", action: () => setShowImportWizard(true) },
                      { icon: "👥", label: "Echipă & Cloud", action: () => { loadTeamData(); loadCloudProjects(); setShowTeamManager(true); }, color: cloud?.isLoggedIn ? "text-emerald-400" : "opacity-40" },
                      { icon: "🗺️", label: t("Hartă climatică"), action: () => setShowClimateMap(true) },
                      { icon: "📷", label: "Galerie foto", action: () => setShowPhotoGallery(true) },
                      { icon: "🏭", label: t("Catalog produse"), action: () => setShowProductCatalog(true) },
                      { icon: "💰", label: "Calculator ROI", action: () => setShowROICalculator(true), color: "text-green-400" },
                      { icon: "🗂️", label: "Gestiune CPE", action: () => setShowCPETracker(true), color: "text-sky-400" },
                      { icon: "🧾", label: "Factură audit", action: () => setShowAuditInvoice(true), color: "text-amber-400" },
                      { icon: "🤖", label: "AI Assistant", action: () => setShowAIAssistant(o => !o), color: "text-amber-400" },
                      { icon: "📋", label: "Timeline progres", action: () => setShowTimeline(o => !o) },
                      { icon: "⚖️", label: "Comparare proiecte", action: () => setShowComparison(true) },
                      { icon: "⌨️", label: "Scurtături tastatură", action: () => setShowShortcutsHelp(true) },
                      { icon: "?", label: t("Ghid utilizare"), action: () => setShowTour(true) },
                    ].map((item, i) => (
                      <button key={i}
                        onClick={() => { item.action(); setShowMoreMenu(false); }}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-left text-xs transition-colors", item.color || "text-white/70")}>
                        <span className="text-sm w-5 text-center">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={toggleThemeManual} className="text-[10px] px-1.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">{theme==="dark"?"☀":"🌙"}</button>
            <button onClick={() => setLang(l => l==="RO"?"EN":"RO")}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium">
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
          {STEPS.map((s, i) => {
            const pct = stepCompleteness[i] ?? 0;
            const dotColor = pct >= 1 ? "#22c55e" : pct > 0 ? "#f59e0b" : "rgba(255,255,255,0.15)";
            return (
            <button key={s.id} onClick={() => { if(!s.locked){setStep(s.id);setSidebarOpen(false);} }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-all",
                step === s.id ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/[0.03] border border-transparent",
                s.locked && "opacity-25 cursor-not-allowed"
              )}>
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{s.id}. {lang==="EN" && s.labelEN ? s.labelEN : s.label}</div>
                <div className="text-[10px] opacity-40">{lang==="EN" && s.descEN ? s.descEN : s.desc}</div>
              </div>
              <div className="ml-auto flex flex-col items-center gap-1 shrink-0">
                {step === s.id
                  ? <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  : <div className="w-1.5 h-1.5 rounded-full" style={{background: dotColor}} />
                }
              </div>
            </button>
            );
          })}

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
          {/* Formular Date Client */}
          <button onClick={() => { setShowClientForm(true); setSidebarOpen(false); }}
            className="w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left">
            <span className="text-lg">👤</span>
            <div>
              <div className="text-xs font-semibold text-amber-300">Formular Client</div>
              <div className="text-[10px] opacity-50">Date pentru audit</div>
            </div>
          </button>

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

          {/* ═══ BANNER OFFLINE ═══ */}
          {!isOnline && (
            <div className="mb-4 flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-4 py-2.5 text-yellow-300 text-xs">
              <span className="text-base">📡</span>
              <span>Mod offline — modificările sunt salvate local și se vor sincroniza la reconectare</span>
            </div>
          )}

          {/* ═══ FORMULAR DATE CLIENT (overlay) ═══ */}
          {showClientForm && (
            <div style={{animation:"fadeSlideIn 0.3s ease-out"}}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Formular Date Client</h2>
                  <p className="text-xs text-white/40 mt-0.5">Completați împreună cu clientul sau trimiteți-i formularul pentru a-l completa</p>
                </div>
                <button onClick={() => setShowClientForm(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white rounded-xl text-sm transition-all">
                  ✕ Închide
                </button>
              </div>
              <ClientInputForm />
            </div>
          )}

          <div key={step} style={{animation:"fadeSlideIn 0.3s ease-out"}} className={showClientForm ? "hidden" : ""}>
          <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {/* ═══ STEP 1: IDENTIFICARE ═══ */}
          {step === 1 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă...</div>}><Step1Identification
            building={building} updateBuilding={updateBuilding} lang={lang} selectedClimate={selectedClimate}
            BUILDING_CATEGORIES={BUILDING_CATEGORIES} STRUCTURE_TYPES={STRUCTURE_TYPES}
            autoDetectLocality={autoDetectLocality} estimateGeometry={estimateGeometry} avRatio={avRatio}
            loadFullDemo={loadFullDemo} loadFullDemo2={loadFullDemo2} loadFullDemo3={loadFullDemo3}
            loadFullDemo4={loadFullDemo4} loadFullDemo5={loadFullDemo5} loadFullDemo6={loadFullDemo6}
            loadFullDemo7={loadFullDemo7} loadFullDemo8={loadFullDemo8}
            loadFullDemo9={loadFullDemo9} loadFullDemo10={loadFullDemo10}
            loadTypicalBuilding={loadTypicalBuilding} showToast={showToast}
            goToStep={goToStep}
            onOpenTutorial={() => setShowTutorial(true)}
            buildingPhotos={buildingPhotos} setBuildingPhotos={setBuildingPhotos}
            userPlan={userPlan}
          /></Suspense>}


          {/* ═══ STEP 2: ANVELOPĂ ═══ */}
          {step === 2 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă anvelopa...</div>}><Step2Envelope
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
            avValidation={avValidation}
            U_REF_NZEB_RES={U_REF_NZEB_RES} U_REF_NZEB_NRES={U_REF_NZEB_NRES}
            U_REF_RENOV_RES={U_REF_RENOV_RES} U_REF_RENOV_NRES={U_REF_RENOV_NRES}
            U_REF_GLAZING={U_REF_GLAZING}
            glaserElementIdx={glaserElementIdx} setGlaserElementIdx={setGlaserElementIdx} glaserResult={glaserResult}
            summerComfortResults={summerComfortResults}
            airInfiltrationCalc={airInfiltrationCalc} naturalLightingCalc={naturalLightingCalc}
            csvImportRef={csvImportRef} importCSV={importCSV}
            setStep={setStep} goToStep={goToStep}
          /></Suspense>}


          {/* ═══ STEP 3: INSTALAȚII ═══ */}
          {step === 3 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă instalațiile...</div>}><Step3Systems
            building={building} lang={lang} selectedClimate={selectedClimate}
            heating={heating} setHeating={setHeating}
            acm={acm} setAcm={setAcm}
            cooling={cooling} setCooling={setCooling}
            ventilation={ventilation} setVentilation={setVentilation}
            lighting={lighting} setLighting={setLighting}
            instSubTab={instSubTab} setInstSubTab={setInstSubTab}
            instSummary={instSummary}
            setStep={setStep} goToStep={goToStep}
            showToast={showToast}
          /></Suspense>}


          {/* ═══ STEP 4: REGENERABILE ═══ */}
          {step === 4 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă regenerabilele...</div>}><Step4Renewables
            building={building} lang={lang} selectedClimate={selectedClimate}
            solarThermal={solarThermal} setSolarThermal={setSolarThermal}
            photovoltaic={photovoltaic} setPhotovoltaic={setPhotovoltaic}
            heatPump={heatPump} setHeatPump={setHeatPump}
            biomass={biomass} setBiomass={setBiomass}
            otherRenew={otherRenew} setOtherRenew={setOtherRenew}
            battery={battery} setBattery={setBattery}
            renewSubTab={renewSubTab} setRenewSubTab={setRenewSubTab}
            renewSummary={renewSummary} instSummary={instSummary}
            ORIENTATIONS={ORIENTATIONS} getNzebEpMax={getNzebEpMax}
            setStep={setStep} goToStep={goToStep}
          /></Suspense>}


          {/* ═══ STEP 5: CALCUL ENERGETIC & CLASARE ═══ */}
          {step === 5 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă calculul energetic...</div>}><Step5Calculation {...{
            monthlyISO, hourlyISO, instSummary, renewSummary, envelopeSummary,
            glaserResult, zebVerification, annualEnergyCost, monthlyBreakdown,
            summerComfortResults, sankeyData, building, selectedClimate, lang, theme,
            heating, cooling, ventilation, lighting, acm,
            solarThermal, photovoltaic, heatPump, biomass, otherRenew,
            gwpDetailed, bacsCheck, bacsClass, setBacsClass, avValidation,
            evChargerCalc, solarReadyCheck, acmDetailed,
            opaqueElements, glazingElements, calcOpaqueR,
            U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_RENOV_RES, U_REF_RENOV_NRES, U_REF_GLAZING, ELEMENT_TYPES,
            energyPrices, setEnergyPrices, useNA2023, setUseNA2023,
            compareRef, setCompareRef, importCompareRef,
            showScenarioCompare, setShowScenarioCompare,
            rehabScenarioInputs, setRehabScenarioInputs, rehabComparison,
            setStep, goToStep, step,
            financialAnalysis,
          }} /></Suspense>}

          {/* ═══ STEP 6: CERTIFICAT ENERGETIC ═══ */}
          {step === 6 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă certificatul...</div>}><Step6Certificate {...{
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
            exportPDFNative, exportQuickSheet, fetchTemplate,
            bacsClass,
            buildingPhotos,
          }} /></Suspense>}

          {/* ═══ STEP 7: AUDIT — RECOMANDĂRI DE REABILITARE ═══ */}
          {step === 7 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">{lang==="EN"?"Loading audit module...":"Se încarcă modulul audit..."}</div>}><Step7Audit {...{
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
            generateAuditReport, exportXML, exportPDFNative, exportFullReport, exportBulkProjects, exportExcelFull,
            setThermalBridges,
          }} /></Suspense>}

          {/* ═══ STEP 8: ANALIZĂ AVANSATĂ ═══ */}
          {step === 8 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">{lang==="EN"?"Loading advanced module...":"Se încarcă modulul avansat..."}</div>}><Step8Advanced {...{
            building, climate: selectedClimate,
            opaqueElements, glazingElements, thermalBridges,
            instSummary, renewSummary,
            lang,
            userPlan,
            bacsClass, setBacsClass,
            systems: { hrEta: parseFloat(ventilation?.hrEfficiency)||0, ventType: ventilation?.type, emissionSystem: heating?.emission,
              ventilation: { ...ventilation, hrEfficiency: parseFloat(ventilation?.hrEfficiency)||0 },
              heating: { etaGen: parseFloat(heating?.eta_gen)||0.85, fp: parseFloat(heating?.fp)||1.1 },
            },
            onOpenTutorial: () => setShowTutorial(true),
          }} /></Suspense>}
          </div>
        </main>
      </div>

      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <TutorialWizard
          onClose={() => setShowTutorial(false)}
          onApplyExample={(data) => {
              pushUndo();
              if (data?.building && Object.keys(data.building).length) setBuilding(p => ({...INITIAL_BUILDING, ...p, ...data.building}));
              if (data?.opaqueElements?.length) setOpaqueElements(data.opaqueElements);
              if (data?.glazingElements?.length) setGlazingElements(data.glazingElements);
              if (data?.thermalBridges?.length) setThermalBridges(data.thermalBridges);
              if (data?.heating && Object.keys(data.heating).length) setHeating(p => ({...INITIAL_HEATING, ...p, ...data.heating}));
              if (data?.acm && Object.keys(data.acm).length) setAcm(p => ({...INITIAL_ACM, ...p, ...data.acm}));
              if (data?.ventilation && Object.keys(data.ventilation).length) setVentilation(p => ({...INITIAL_VENTILATION, ...p, ...data.ventilation}));
              if (data?.lighting && Object.keys(data.lighting).length) setLighting(p => ({...INITIAL_LIGHTING, ...p, ...data.lighting}));
              setShowTutorial(false);
              setStep(1);
              showToast("Exemplu demo aplicat — casă 1985, Cluj-Napoca ✓");
            }}
        />
      )}

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
          lang={lang}
          buildingCategory={building.category}
          heating={heating}
          selectedClimate={selectedClimate}
          calcOpaqueR={calcOpaqueR}
          constructionSolutions={CONSTRUCTION_SOLUTIONS}
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
          lang={lang}
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
        const catKey = buildCatKey(building.category, cooling.hasCooling);
        const cls = getEnergyClass(epF, catKey);
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
            const ctx = { building, energyClass: envelopeSummary?.ep ? getEnergyClass(envelopeSummary.ep, buildCatKey(building.category, cooling.hasCooling)) : null, ep: envelopeSummary?.ep, rer: renewSummary?.rer, category: building.category };
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
              {cloud?.isLoggedIn && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{cloud.cloudStatus}</span>}
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
            <div className="text-[10px] opacity-20 mt-1 text-center">Powered by Claude AI · {cloud?.canUseAI ? "Business" : "Plan Business necesar"}</div>
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
        <ImportModal
          onClose={() => setShowImportWizard(false)}
          onApply={(data) => {
            pushUndo();
            if (data.building && Object.keys(data.building).length) setBuilding(p => ({...INITIAL_BUILDING, ...p, ...data.building}));
            if (data.opaqueElements?.length) setOpaqueElements(prev => [...prev, ...data.opaqueElements]);
            if (data.glazingElements?.length) setGlazingElements(prev => [...prev, ...data.glazingElements]);
            if (data.thermalBridges?.length) setThermalBridges(prev => [...prev, ...data.thermalBridges]);
            if (data.heating && Object.keys(data.heating).length) setHeating(p => ({...INITIAL_HEATING, ...p, ...data.heating}));
            if (data.acm && Object.keys(data.acm).length) setAcm(p => ({...INITIAL_ACM, ...p, ...data.acm}));
            if (data.cooling && Object.keys(data.cooling).length) setCooling(p => ({...INITIAL_COOLING, ...p, ...data.cooling}));
            if (data.ventilation && Object.keys(data.ventilation).length) setVentilation(p => ({...INITIAL_VENTILATION, ...p, ...data.ventilation}));
            if (data.lighting && Object.keys(data.lighting).length) setLighting(p => ({...INITIAL_LIGHTING, ...p, ...data.lighting}));
            if (data.solarThermal?.enabled !== undefined) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...p, ...data.solarThermal}));
            if (data.photovoltaic?.enabled !== undefined) setPhotovoltaic(p => ({...INITIAL_PV, ...p, ...data.photovoltaic}));
            if (data.heatPump?.enabled !== undefined) setHeatPump(p => ({...INITIAL_HP, ...p, ...data.heatPump}));
            if (data.biomass?.enabled !== undefined) setBiomass(p => ({...INITIAL_BIO, ...p, ...data.biomass}));
            if (data.battery?.enabled !== undefined) setBattery(p => ({...INITIAL_BATTERY, ...p, ...data.battery}));
            if (data.otherRenew && Object.keys(data.otherRenew).length) setOtherRenew(p => ({...INITIAL_OTHER, ...p, ...data.otherRenew}));
            showToast("Date importate cu succes în pașii 1–4", "success");
          }}
          importProject={importProject}
          importCSV={importCSV}
          importENERGPlus={importENERGPlus}
          importDOSET={importDOSET}
          importGbXML={importGbXML}
          importOCR={importOCR}
          showToast={showToast}
        />
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

      {/* ═══ QuickFill Wizard ═══ */}
      {showQuickFill && (
        <QuickFillWizard
          onClose={() => setShowQuickFill(false)}
          onApply={(data) => {
            pushUndo();
            if (data.building && Object.keys(data.building).length) setBuilding(p => ({...INITIAL_BUILDING, ...p, ...data.building}));
            if (data.opaqueElements?.length) setOpaqueElements(data.opaqueElements);
            if (data.glazingElements?.length) setGlazingElements(data.glazingElements);
            if (data.thermalBridges?.length) setThermalBridges(data.thermalBridges);
            if (data.heating && Object.keys(data.heating).length) setHeating(p => ({...INITIAL_HEATING, ...p, ...data.heating}));
            if (data.acm && Object.keys(data.acm).length) setAcm(p => ({...INITIAL_ACM, ...p, ...data.acm}));
            if (data.ventilation && Object.keys(data.ventilation).length) setVentilation(p => ({...INITIAL_VENTILATION, ...p, ...data.ventilation}));
            if (data.lighting && Object.keys(data.lighting).length) setLighting(p => ({...INITIAL_LIGHTING, ...p, ...data.lighting}));
          }}
          showToast={showToast}
        />
      )}

      {/* ═══ ChatImport — buton flotant + chat panel ═══ */}
      <ChatImport
        onApply={(data) => {
          pushUndo();
          if (data.building && Object.keys(data.building).length) setBuilding(p => ({...INITIAL_BUILDING, ...p, ...data.building}));
          if (data.opaqueElements?.length) setOpaqueElements(prev => [...prev, ...data.opaqueElements]);
          if (data.glazingElements?.length) setGlazingElements(prev => [...prev, ...data.glazingElements]);
          if (data.thermalBridges?.length) setThermalBridges(prev => [...prev, ...data.thermalBridges]);
          if (data.heating && Object.keys(data.heating).length) setHeating(p => ({...INITIAL_HEATING, ...p, ...data.heating}));
          if (data.acm && Object.keys(data.acm).length) setAcm(p => ({...INITIAL_ACM, ...p, ...data.acm}));
          if (data.cooling && Object.keys(data.cooling).length) setCooling(p => ({...INITIAL_COOLING, ...p, ...data.cooling}));
          if (data.ventilation && Object.keys(data.ventilation).length) setVentilation(p => ({...INITIAL_VENTILATION, ...p, ...data.ventilation}));
          if (data.lighting && Object.keys(data.lighting).length) setLighting(p => ({...INITIAL_LIGHTING, ...p, ...data.lighting}));
          if (data.solarThermal?.enabled !== undefined) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...p, ...data.solarThermal}));
          if (data.photovoltaic?.enabled !== undefined) setPhotovoltaic(p => ({...INITIAL_PV, ...p, ...data.photovoltaic}));
          if (data.heatPump?.enabled !== undefined) setHeatPump(p => ({...INITIAL_HP, ...p, ...data.heatPump}));
          if (data.biomass?.enabled !== undefined) setBiomass(p => ({...INITIAL_BIO, ...p, ...data.biomass}));
        }}
        showToast={showToast}
      />

      {/* ═══ ShareModal — link + QR ═══ */}
      {showShareModal && (() => {
        const catKey = buildCatKey(building.category, cooling.hasCooling);
        const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
        const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
        const ec = getEnergyClass(epFinal, catKey)?.cls || null;
        const cc = getCO2Class(co2Final, building.category)?.cls || null;
        return (
          <ShareModal
            projectState={{ building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, instSummary, renewSummary, energyClass: ec, co2Class: cc }}
            onClose={() => setShowShareModal(false)}
            showToast={showToast}
          />
        );
      })()}

      {/* Reset confirmation modal */}

      {/* ═══ NEW: CLIMATE MAP MODAL (C9) ═══ */}
      {showClimateMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.75)"}} onClick={() => setShowClimateMap(false)}>
          <div className="bg-[#0e1018] border border-white/10 rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">🗺️ Harta climatică România</h3>
              <button onClick={() => setShowClimateMap(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <svg viewBox="0 0 500 385" className="w-full" style={{minHeight:"360px"}}>
              {/* Marea Neagră — fill subtil */}
              <path d="M489,230 L500,225 L500,385 L418,385 L429,351 Z"
                fill="rgba(30,64,175,0.09)" stroke="none" />
              <text fill="rgba(96,165,250,0.28)" fontSize="7.5" fontStyle="italic"
                transform="rotate(-78,476,305)" x="476" y="305" textAnchor="middle">Marea Neagră</text>
              {/* Frontiera României — coordonate geografice reale, ~64 puncte */}
              <path d={ROMANIA_BORDER_PATH}
                fill="rgba(100,160,220,0.06)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Arcul Carpatic (potcoavă: Maramureș → Vrancea → Retezat → Apuseni) */}
              <path d={"M" + [
                [24.2,47.3],[25.0,47.0],[25.8,46.5],[26.5,46.0],[26.7,45.5],[26.5,45.4],
                [25.5,45.4],[25.0,45.3],[24.0,45.4],[23.0,45.4],[22.5,45.5],[22.3,46.0],[22.6,46.7],[23.2,47.2]
              ].map(function(c){return geoToSvg(c[1],c[0])}).map(function(p,i){return (i?'L':'')+ p.x.toFixed(0)+','+p.y.toFixed(0)}).join(' ')}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" strokeLinecap="round" />
              {/* Dunărea (frontiera sudică + Clisura) */}
              <path d={"M" + [
                [22.66,44.63],[22.94,43.98],[23.95,43.80],[24.50,43.78],
                [24.87,43.75],[25.36,43.65],[25.97,43.90],[26.64,44.08],
                [27.27,44.10],[27.55,43.85],[28.04,45.46]
              ].map(function(c){return geoToSvg(c[1],c[0])}).map(function(p,i){return (i?'L':'')+ p.x.toFixed(0)+','+p.y.toFixed(0)}).join(' ')}
                fill="none" stroke="rgba(59,130,246,0.18)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Puncte orașe */}
              {CLIMATE_DB.map(loc => {
                const pt = ROMANIA_MAP_POINTS[loc.name];
                if (!pt) return null;
                const isSelected = building.locality === loc.name;
                const isHovered = hoveredClimate === loc.name;
                return (
                  <g key={loc.name}
                    onClick={(e) => { e.stopPropagation(); setBuilding(prev => ({...prev, locality: loc.name})); }}
                    onMouseEnter={() => setHoveredClimate(loc.name)}
                    onMouseLeave={() => setHoveredClimate(null)}
                    className="cursor-pointer">
                    {(isSelected || isHovered) && <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke={ZONE_COLORS[loc.zone]||"#888"} strokeWidth="1.5" opacity={isSelected ? 0.5 : 0.35} />}
                    <circle cx={pt.x} cy={pt.y} r={isSelected ? 6 : isHovered ? 5.5 : 3.5}
                      fill={ZONE_COLORS[loc.zone] || "#888"} opacity={isSelected || isHovered ? 1 : 0.75}
                      stroke={isSelected ? "#fff" : isHovered ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.35)"}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5} />
                    <text x={pt.x} y={pt.y - (isSelected ? 14 : isHovered ? 13 : 6)} textAnchor="middle"
                      fill={isSelected ? "#fff" : isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.50)"}
                      fontSize={isSelected || isHovered ? "8.5" : "6"} fontWeight={isSelected || isHovered ? "bold" : "normal"}
                      style={{textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>
                      {loc.name}
                    </text>
                  </g>
                );
              })}
              {/* Tooltip hover */}
              {hoveredClimate && (() => {
                const loc = CLIMATE_DB.find(l => l.name === hoveredClimate);
                const pt = ROMANIA_MAP_POINTS[hoveredClimate];
                if (!loc || !pt) return null;
                const tw = 112, th = 50;
                const tx = Math.min(Math.max(pt.x - 56, 2), 500 - tw - 2);
                const ty = pt.y > 210 ? pt.y - th - 14 : pt.y + 14;
                return (
                  <g style={{pointerEvents:"none"}}>
                    <rect x={tx} y={ty} width={tw} height={th} rx="4"
                      fill="rgba(6,8,18,0.94)" stroke={ZONE_COLORS[loc.zone]||"#888"} strokeWidth="0.9" />
                    <text x={tx+6} y={ty+13} fill="#fff" fontSize="8.5" fontWeight="bold">{loc.name}</text>
                    <text x={tx+6} y={ty+24} fill={ZONE_COLORS[loc.zone]} fontSize="7.5">Zona {loc.zone} · θe = {loc.theta_e}°C</text>
                    <text x={tx+6} y={ty+35} fill="rgba(255,255,255,0.50)" fontSize="7">NGZ {loc.ngz} · Alt. {loc.alt} m</text>
                    <text x={tx+6} y={ty+46} fill="rgba(255,255,255,0.38)" fontSize="7">Sezon {loc.season} zile · θa = {loc.theta_a}°C</text>
                  </g>
                );
              })()}
              {/* Legendă zone climatice */}
              {Object.entries(ZONE_COLORS).map(([zone, color], i) => (
                <g key={zone}>
                  <circle cx={15} cy={300 + i*15} r="4.5" fill={color} />
                  <text x={25} y={304 + i*15} fill="rgba(255,255,255,0.50)" fontSize="7.5">
                    {`Zona ${zone} · θe = ${zone==="I"?"−12":zone==="II"?"−15":zone==="III"?"−18":zone==="IV"?"−21":"−25"}°C`}
                  </text>
                </g>
              ))}
            </svg>
            <div className="text-[10px] opacity-25 text-center mt-2">Click pe o localitate pentru a o selecta · Hover pentru detalii · Zona I (cea mai caldă) → Zona V (cea mai rece)</div>
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
                    <div className="text-[10px] opacity-30">{productCatalogTab==="windows"?"/m²":productCatalogTab==="pvPanels"?"/buc":"/buc"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] opacity-20 mt-3 text-center">Prețuri orientative 2025-2026, fără TVA și montaj. Verificați la furnizor.</div>
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
          {STEPS.map((s, i) => {
            const pct = stepCompleteness[i] ?? 0;
            const isActive = step === s.id;
            return (
            <button key={s.id} onClick={() => { setStep(s.id); setSidebarOpen(false); }}
              className="flex flex-col items-center justify-center flex-shrink-0 py-2 transition-all relative"
              style={{width: (100/STEPS.length)+"%", minWidth: "52px", opacity: isActive ? 1 : 0.5}}>
              {/* dot completare */}
              {pct >= 1 && !isActive && (
                <div className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              <span className="text-base leading-none">{s.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium leading-tight truncate w-full text-center px-0.5"
                style={{color: isActive ? "#f59e0b" : "inherit"}}>
                {lang==="EN" ? (s.labelEN||s.label) : s.label}
              </span>
              {isActive && <div className="w-4 h-0.5 rounded-full bg-amber-500 mt-0.5" />}
            </button>
            );
          })}
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
                        <span className={`text-[10px] px-2 py-0.5 rounded ${m.role === "owner" ? "bg-amber-500/20 text-amber-400" : m.role === "admin" ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/50"}`}>
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
                          <span className="text-[10px] opacity-30">{p.updated_at?.slice(0, 10)}</span>
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
                <div key={p.id} className={cn("rounded-xl border transition-all",
                  p.id === activeProjectId ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"
                )}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => loadProject(p.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[10px] opacity-40 flex gap-2">
                        <span>{p.date}</span>
                        {p.category && <span>• {BUILDING_CATEGORIES.find(c=>c.id===p.category)?.label?.slice(0,30) || p.category}</span>}
                      </div>
                    </div>
                    {p.id === activeProjectId && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">activ</span>}
                    {/* Buton versiuni */}
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (expandedVersionProjectId === p.id) { setExpandedVersionProjectId(null); setProjectVersions([]); return; }
                      setExpandedVersionProjectId(p.id);
                      const vers = await listVersions(p.id);
                      setProjectVersions(vers);
                    }} className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 hover:bg-white/10 opacity-50 hover:opacity-100 transition-all shrink-0">
                      🕐
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (p.id !== activeProjectId) deleteProject(p.id); else showToast("Nu poți șterge proiectul activ.", "error"); }}
                      className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400/50 hover:text-red-400 text-xs transition-all shrink-0">🗑</button>
                  </div>
                  {/* Versiuni expandate */}
                  {expandedVersionProjectId === p.id && (
                    <div className="border-t border-white/5 px-3 pb-2 pt-1 space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider opacity-40">Versiuni salvate</span>
                        {p.id === activeProjectId && (
                          <button onClick={async (e) => { e.stopPropagation(); await saveCurrentProject(true); const vers = await listVersions(p.id); setProjectVersions(vers); }}
                            className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                            + Salvează versiune acum
                          </button>
                        )}
                      </div>
                      {projectVersions.length === 0 && <div className="text-[10px] opacity-30 py-1">Nicio versiune salvată.</div>}
                      {projectVersions.map(v => (
                        <div key={v.key} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
                          <span className="text-[10px] opacity-50 flex-1 truncate">{v.label}</span>
                          <span className="text-[8px] opacity-30 shrink-0">{new Date(v.ts).toLocaleDateString("ro-RO")}</span>
                          <button onClick={(e) => { e.stopPropagation(); restoreProjectVersion(v.data); setShowProjectManager(false); }}
                            className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all shrink-0">
                            Restaurează
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] opacity-30 text-center pt-1 border-t border-white/5">
              Proiectele se salvează local în browser. Max ~20 proiecte.
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROJECT TIMELINE (pct. 40) ═══ */}
      {showTimeline && (
        <div className="fixed top-16 right-4 z-[9980] w-80 shadow-2xl">
          <ProjectTimeline
            state={{ building, selectedClimate, opaqueElements, heating, instSummary, auditor, renewSummary }}
            currentStep={step}
            onGoToStep={(s) => { setStep(s); setShowTimeline(false); }}
          />
        </div>
      )}

      {/* ═══ PROJECT COMPARISON (pct. 38) ═══ */}
      {showComparison && (
        <ProjectComparison
          currentState={{ building, selectedClimate, opaqueElements, instSummary, renewSummary, annualEnergyCost }}
          projectList={projectList}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* ═══ KEYBOARD SHORTCUTS HELP (pct. 41) ═══ */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-[9992] flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">⌨️ Scurtături tastatură</h3>
              <button onClick={() => setShowShortcutsHelp(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm">&times;</button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS_LIST.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                  <span className="opacity-60">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <kbd key={j} className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 font-mono text-[10px]">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUDIT CLIENT DATA FORM MODAL ═══ */}
      {showAuditForm && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4" style={{background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)"}} onClick={() => setShowAuditForm(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a] z-10">
              <div>
                <h3 className="text-base font-bold">📋 Date Client — Audit Energetic</h3>
                <p className="text-[10px] opacity-40 mt-0.5">Colectare sistematică date necesare auditului și emiterii CPE</p>
              </div>
              <button onClick={() => setShowAuditForm(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg">&times;</button>
            </div>
            <div className="p-4">
              <AuditClientDataForm
                onDataChange={(data) => {
                  // ── Auto-populate câmpuri clădire ──
                  const bUpdates = {};
                  if (data.documentation?.buildingAddress && !building.address)
                    bUpdates.address = data.documentation.buildingAddress;
                  if (data.documentation?.constructionYear && !building.yearBuilt)
                    bUpdates.yearBuilt = String(data.documentation.constructionYear);
                  if (data.envelope?.totalBuildingArea && !building.areaUseful)
                    bUpdates.areaUseful = String(data.envelope.totalBuildingArea);
                  if (data.envelope?.buildingVolume && !building.volume)
                    bUpdates.volume = String(data.envelope.buildingVolume);
                  if (data.admin?.occupantsNumber && !building.occupants)
                    bUpdates.occupants = String(data.admin.occupantsNumber);
                  if (Object.keys(bUpdates).length) setBuilding(b => ({ ...b, ...bUpdates }));

                  // ── Auto-populate sistem încălzire ──
                  const heatingMap = {
                    "Cazan gaz": "GAZ_COND", "Cazan petrol": "MOTORINA",
                    "Pompă de căldură": "HP_AA", "Încălzire electrică": "ELECTRICA",
                    "Lemn/biomasa": "BIOMASA", "Centralizată": "DISTRICT",
                  };
                  if (data.thermal?.heatingSystem && heatingMap[data.thermal.heatingSystem]) {
                    setHeating(h => ({ ...h, source: heatingMap[data.thermal.heatingSystem] }));
                  }
                  if (data.thermal?.boilerPower && !heating.power)
                    setHeating(h => ({ ...h, power: String(data.thermal.boilerPower) }));
                  if (data.thermal?.boilerEfficiency && !heating.eta)
                    setHeating(h => ({ ...h, eta: String(data.thermal.boilerEfficiency / 100) }));

                  // ── Auto-populate ventilație ──
                  const ventMap = { "Naturală": "NAT", "Mecanică cu recuperare": "VMCR", "Mecanică fără recuperare": "VMC" };
                  if (data.thermal?.ventilationType && ventMap[data.thermal.ventilationType])
                    setVentilation(v => ({ ...v, type: ventMap[data.thermal.ventilationType] }));

                  // ── Auto-populate iluminat ──
                  const lightMap = { "LED": "LED", "Fluoreșcente": "FL", "Incandescență": "INC", "Halogeni": "INC", "Mixă": "MIX" };
                  if (data.electrical?.lightingType && lightMap[data.electrical.lightingType])
                    setLighting(l => ({ ...l, type: lightMap[data.electrical.lightingType] }));

                  // ── Auto-populate fotovoltaic ──
                  if (data.electrical?.hasPV === "Da") {
                    const pvUpdates = { enabled: true };
                    if (data.electrical.pvInstalledPower) pvUpdates.power = String(data.electrical.pvInstalledPower);
                    setPhotovoltaic(p => ({ ...p, ...pvUpdates }));
                  }
                  // ── Auto-populate solar termic ──
                  if (data.electrical?.hasSolarThermal === "Da") {
                    const stUpdates = { enabled: true };
                    if (data.electrical.solarThermalArea) stUpdates.area = String(data.electrical.solarThermalArea);
                    setSolarThermal(s => ({ ...s, ...stUpdates }));
                  }

                  // ── Răcire ──
                  if (data.thermal?.hasCooling && data.thermal.hasCooling !== "Nu")
                    setCooling(c => ({ ...c, hasCooling: true }));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROI CALCULATOR MODAL ═══ */}
      {showROICalculator && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4" style={{background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)"}} onClick={() => setShowROICalculator(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a] z-10">
              <div>
                <h3 className="text-base font-bold">💰 Calculator ROI — Reabilitare energetică</h3>
                <p className="text-[10px] opacity-40 mt-0.5">Perioadă recuperare investiție, NPV, VAN</p>
              </div>
              <button onClick={() => setShowROICalculator(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg">&times;</button>
            </div>
            <div className="p-4">
              <ROICalculator
                building={building}
                instSummary={instSummary}
                annualEnergyCost={annualEnergyCost}
                rehabComparison={rehabComparison}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ CPE TRACKER MODAL ═══ */}
      {showCPETracker && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4" style={{background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)"}} onClick={() => setShowCPETracker(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a] z-10">
              <div>
                <h3 className="text-base font-bold">🗂️ Gestiune CPE — Registru certificate</h3>
                <p className="text-[10px] opacity-40 mt-0.5">Urmărire expirare, notificări, registru personal auditor</p>
              </div>
              <button onClick={() => setShowCPETracker(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg">&times;</button>
            </div>
            <div className="p-4">
              <CPETracker />
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUDIT INVOICE MODAL ═══ */}
      {showAuditInvoice && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4" style={{background:"rgba(0,0,0,0.85)",backdropFilter:"blur(4px)"}} onClick={() => setShowAuditInvoice(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a] z-10">
              <div>
                <h3 className="text-base font-bold">🧾 Factură audit energetic</h3>
                <p className="text-[10px] opacity-40 mt-0.5">Generare factură/proformă pentru serviciul de audit și CPE</p>
              </div>
              <button onClick={() => setShowAuditInvoice(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg">&times;</button>
            </div>
            <div className="p-4">
              <AuditInvoice building={building} auditor={auditor} onClose={() => setShowAuditInvoice(false)} />
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

