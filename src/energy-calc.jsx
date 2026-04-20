import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { renderAsync } from "docx-preview";
import ChatImport from "./components/ChatImport.jsx"; // static — floating button render at mount
// ── Import/share modals — lazy loaded (S6.3) ──
const ImportModal = lazy(() => import("./import/ImportModal.jsx"));
const ShareModal = lazy(() => import("./components/ShareModal.jsx"));
const QuickFillWizard = lazy(() => import("./components/QuickFillWizard.jsx"));
// decodeShareableData rămâne dynamic-imported în useEffect (S6.3)

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
import { calcRehabCost, EUR_RON } from "./calc/rehab-cost.js";
import { calcSummerComfort } from "./calc/summer-comfort.js";
import { calcGWPDetailed } from "./calc/gwp.js";
import { calcSmartRehab, getNzebEpMax } from "./calc/smart-rehab.js";
import { calcSRI, SRI_DOMAINS, CHP_TYPES, IEQ_CATEGORIES, RENOVATION_STAGES, MCCL_CATALOG, EV_CHARGER_RULES, calcEVChargers, checkSolarReady } from "./calc/epbd.js";
import { calcAirInfiltration, calcNaturalLighting } from "./calc/infiltration.js";
import { calcGroundHeatTransfer } from "./calc/ground.js";
import { checkC107Conformity } from "./calc/c107.js";

// ── Extracted data modules (Sprint 3 → Faza 4 finalizare) ──
import { CONSTRUCTION_SOLUTIONS, GLAZING_DB, FRAME_DB, ORIENTATIONS, BUILDING_CATEGORIES, CPE_TEMPLATES, STRUCTURE_TYPES, ELEMENT_TYPES, CATEGORY_BASE_MAP, buildCatKey } from "./data/building-catalog.js";
import { U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_RENOV_RES, U_REF_RENOV_NRES, U_REF_GLAZING, U_REF_NZEB, U_REF_RENOV, getURefNZEB, ZEB_THRESHOLDS, ZEB_FACTOR, FP_ELEC, getFPElecTot, CO2_ELEC, BACS_CLASSES, BACS_OBLIGATION_THRESHOLD_KW } from "./data/u-reference.js";
import { checkBACSMandatoryISO, BACS_CLASS_LABELS, getBACSCategoryFromCode, getBACSFactors } from "./calc/bacs-iso52120.js";
import { REHAB_COSTS, ZONE_COLORS, REHAB_COSTS_2025 } from "./data/rehab-costs.js";
import { TIERS } from "./data/tiers.js";
import { BENCHMARKS } from "./data/benchmarks.js";
import { INITIAL_BUILDING, INITIAL_HEATING, INITIAL_ACM, INITIAL_COOLING, INITIAL_VENTILATION, INITIAL_LIGHTING, INITIAL_SOLAR_TH, INITIAL_PV, INITIAL_HP, INITIAL_BIO, INITIAL_OTHER, INITIAL_BATTERY, INITIAL_AUDITOR } from "./data/initial-state.js";
import { DEMO_PROJECTS, buildMdlpaDefaults } from "./data/demoProjects.js";
import { normalizeGlazingList } from "./components/SmartEnvelopeHub/utils/normalizeGlazing.js";
import { ENVELOPE_TEMPLATES, extractEnvelopeFromTemplate } from "./components/SmartEnvelopeHub/utils/envelopeTemplates.js";
import { applyStandardBridgesPack as buildStandardBridgesPack } from "./components/SmartEnvelopeHub/utils/applyStandardBridgesPack.js";
import { generateElementsFromGeometry, canGenerateFromGeometry } from "./components/SmartEnvelopeHub/utils/geometryToAreas.js";
import { isFeatureEnabled, FLAGS } from "./config/featureFlags.js";

// ── Hooks (Sprint 4 refactoring) ──
import { useEnvelopeSummary } from "./hooks/useEnvelopeSummary.js";
import { useInstallationSummary } from "./hooks/useInstallationSummary.js";
import { useRenewableSummary } from "./hooks/useRenewableSummary.js";
import { useAutoSync } from "./hooks/useAutoSync.js";
import { useOfflineMode } from "./hooks/useOfflineMode.js";
import { useProjectHistory } from "./hooks/useProjectHistory.js";

// ── Component imports ──
import { cn, Select, Input, Badge, Card, ResultRow } from "./components/ui.jsx";
// ── Envelope modals — lazy loaded (S6.2) ──
const ThermalBridgeCatalog = lazy(() => import("./components/ThermalBridgeCatalog.jsx"));
const OpaqueModal = lazy(() => import("./components/OpaqueModal.jsx"));
const GlazingModal = lazy(() => import("./components/GlazingModal.jsx"));

// ── Step imports (all lazy-loaded for bundle splitting) ──
const Step1Identification = lazy(() => import("./steps/Step1Identification.jsx"));
const Step2Envelope = lazy(() => import("./steps/Step2Envelope.jsx"));
const Step3Systems = lazy(() => import("./steps/Step3Systems.jsx"));
const Step4Renewables = lazy(() => import("./steps/Step4Renewables.jsx"));
const Step5Calculation = lazy(() => import("./steps/Step5Calculation.jsx"));
const Step6Certificate = lazy(() => import("./steps/Step6Certificate.jsx"));
const Step7Audit = lazy(() => import("./steps/Step7Audit.jsx"));
const Step8Advanced = lazy(() => import("./steps/Step8Advanced.jsx"));
const BridgeModal = lazy(() => import("./components/BridgeModal.jsx"));
const TutorialWizard = lazy(() => import("./components/TutorialWizard.jsx"));
// ── Secondary components — lazy loaded (S6.1) ──
const ClientInputForm = lazy(() => import("./components/ClientInputForm.jsx"));
const AuditClientDataForm = lazy(() => import("./components/AuditClientDataForm.jsx"));
const ProjectTimeline = lazy(() => import("./components/ProjectTimeline.jsx"));
const ProjectComparison = lazy(() => import("./components/ProjectComparison.jsx"));
const ROICalculator = lazy(() => import("./components/ROICalculator.jsx"));
const CPETracker = lazy(() => import("./components/CPETracker.jsx"));
const AuditInvoice = lazy(() => import("./components/AuditInvoice.jsx"));
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

  // Sprint 18 UX — închide sidebar la tasta Escape (mobile/tablet)
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

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

  // P1-1 (18 apr 2026) — Deschide sesiune Stripe Billing Portal (gestionare abonament).
  const openBillingPortal = async () => {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "portal",
          returnUrl: window.location.origin + "/#app?billing=portal_return",
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Billing Portal indisponibil în acest moment.", "error");
      }
    } catch (e) {
      showToast("Eroare la conectarea cu Stripe. Verificați rețeaua.", "error");
    }
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
  const [showChat, setShowChat] = useState(false);
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
  // UNDO/REDO + VERSIONING → extras în useProjectHistory hook (S5.4)
  // ═══════════════════════════════════════════════════════════
  const getFullSnapshot = useCallback(() => ({
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, battery,
    auditor, useNA2023, finAnalysisInputs,
  }), [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, battery, auditor, useNA2023, finAnalysisInputs]);

  const applyFullSnapshot = useCallback((d) => {
    if (d.building) setBuilding(p => ({ ...INITIAL_BUILDING, ...d.building }));
    if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
    if (d.glazingElements) setGlazingElements(d.glazingElements);
    if (d.thermalBridges) setThermalBridges(d.thermalBridges);
    if (d.heating) setHeating(p => ({ ...INITIAL_HEATING, ...d.heating }));
    if (d.acm) setAcm(p => ({ ...INITIAL_ACM, ...d.acm }));
    if (d.cooling) setCooling(p => ({ ...INITIAL_COOLING, ...d.cooling }));
    if (d.ventilation) setVentilation(p => ({ ...INITIAL_VENTILATION, ...d.ventilation }));
    if (d.lighting) setLighting(p => ({ ...INITIAL_LIGHTING, ...d.lighting }));
    if (d.solarThermal) setSolarThermal(p => ({ ...INITIAL_SOLAR_TH, ...d.solarThermal }));
    if (d.photovoltaic) setPhotovoltaic(p => ({ ...INITIAL_PV, ...d.photovoltaic }));
    if (d.heatPump) setHeatPump(p => ({ ...INITIAL_HP, ...d.heatPump }));
    if (d.biomass) setBiomass(p => ({ ...INITIAL_BIO, ...d.biomass }));
    if (d.otherRenew) setOtherRenew(p => ({ ...INITIAL_OTHER, ...d.otherRenew }));
    if (d.battery) setBattery(p => ({ ...INITIAL_BATTERY, ...d.battery }));
    if (d.auditor) setAuditor(p => ({ ...INITIAL_AUDITOR, ...d.auditor }));
  }, []);

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

  // ── Undo/Redo + Versioning → useProjectHistory hook (S5.4) ──
  const {
    undoStack, redoStack,
    pushUndo, undo, redo,
    saveVersion, listVersions, restoreProjectVersion,
  } = useProjectHistory({
    getFullSnapshot, applyFullSnapshot,
    getProjectData, loadProjectData,
    showToast, setExpandedVersionProjectId,
  });

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
    const m = await import("./handlers/cloudHandlers.js");
    return m.saveToCloud({ cloud, getProjectData, buildingAddress: building.address, showToast });
  }, [cloud, getProjectData, building.address, showToast]);

  const loadFromCloud = useCallback(async (projectId) => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.loadFromCloud({ cloud, projectId, loadProjectData, showToast });
  }, [cloud, loadProjectData, showToast]);

  const loadTeamData = useCallback(async () => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.loadTeamData({ cloud, setTeamLoading, setTeamData });
  }, [cloud]);

  const createTeam = useCallback(async (teamName) => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.createTeam({ cloud, teamName, reloadTeamData: loadTeamData, showToast });
  }, [cloud, loadTeamData, showToast]);

  const inviteTeamMember = useCallback(async (email, role) => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.inviteTeamMember({ cloud, teamData, email, role, reloadTeamData: loadTeamData, showToast });
  }, [cloud, teamData, loadTeamData, showToast]);

  const removeTeamMember = useCallback(async (userId) => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.removeTeamMember({ cloud, teamData, userId, reloadTeamData: loadTeamData, showToast });
  }, [cloud, teamData, loadTeamData, showToast]);

  const loadCloudProjects = useCallback(async () => {
    const m = await import("./handlers/cloudHandlers.js");
    return m.loadCloudProjects({ cloud, setCloudProjects });
  }, [cloud]);

  // Load project list on mount
  useEffect(() => { refreshProjectList(); }, []);

  useEffect(function() { loadFromStorage(); }, []);

  // Auto-import din URL ?import=<base64> (ShareModal). decodeShareableData e
  // lazy (partea S6.3): doar când e nevoie de decodare, se face dynamic import.
  useEffect(function() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("import");
    if (!encoded) return;
    (async () => {
    try {
      const { decodeShareableData } = await import("./components/ShareModal.jsx");
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
    })();
  }, []); // eslint-disable-line

  // Auto-generate PDF preview when entering Step 6
  const autoPreviewTriggered = useRef(false);
  useEffect(() => {
    let timerId;
    if (step === 6 && !autoPreviewTriggered.current && !pdfPreviewUrl) {
      autoPreviewTriggered.current = true;
      timerId = setTimeout(() => {
        const btn = document.querySelector('[data-auto-preview]');
        if (btn) btn.click();
      }, 500);
    }
    if (step !== 6) autoPreviewTriggered.current = false;
    return () => { if (timerId) clearTimeout(timerId); };
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
  const resetProject = useCallback(async () => {
    const m = await import("./handlers/importHandlers.js");
    return m.resetProject({
      setStep, setBuilding, setOpaqueElements, setGlazingElements, setThermalBridges,
      setEditingOpaque, setShowOpaqueModal, setEditingGlazing, setShowGlazingModal,
      setEditingBridge, setShowBridgeModal, setShowBridgeCatalog,
      setInstSubTab, setHeating, setAcm, setCooling, setVentilation, setLighting,
      setRenewSubTab, setSolarThermal, setPhotovoltaic, setHeatPump, setBiomass, setOtherRenew,
      setAuditor, setShowResetConfirm,
    });
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
      storageVolume: "", pipeLength: "", pipeInsulated: isNew || isRenov,
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
  // GENERIC DEMO LOADER — 20 exemple complete din demoProjects.js
  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // SmartEnvelopeHub — feature flag check (S3 test harness, S4 GA)
  // ═══════════════════════════════════════════════════════════
  const envelopeHubEnabled = useMemo(() => isFeatureEnabled(FLAGS.SMART_ENVELOPE_HUB), []);

  const loadDemoByIndex = useCallback((idx) => {
    const d = DEMO_PROJECTS[idx];
    if (!d) return;
    pushUndo();
    // Merge defaults MDLPA Anexa 1+2 contextuale (adaptate la demo: sobe, bloc,
    // nerezidențial, termoficare, heat pump, wind) cu d.building explicit.
    // Proprietățile din d.building override-uiesc defaults, păstrând flexibilitate.
    setBuilding({ ...buildMdlpaDefaults(d), ...d.building });
    setOpaqueElements(d.opaqueElements);
    // Fix D2 (envelope_hub_design.md, 14.04.2026): normalizăm câmpul vitrajelor
    // la load — demo-urile folosesc `type`, GlazingModal folosește `glazingType`.
    // Copiem `type → glazingType` dacă lipsește, păstrând compatibilitatea sursă.
    setGlazingElements(normalizeGlazingList(d.glazingElements));
    setThermalBridges(d.thermalBridges);
    setHeating(d.heating);
    setAcm(d.acm);
    setCooling(d.cooling);
    setVentilation(d.ventilation);
    setLighting(d.lighting);
    setSolarThermal({ ...INITIAL_SOLAR_TH, ...d.solarThermal });
    setPhotovoltaic({ ...INITIAL_PV, ...d.photovoltaic });
    setHeatPump({ ...INITIAL_HP, ...d.heatPump });
    setBiomass({ ...INITIAL_BIO, ...d.biomass });
    setOtherRenew({ ...INITIAL_OTHER, ...d.otherRenew });
    setAuditor(prev => ({
      ...prev,
      ...d.auditor,
      date: new Date().toISOString().slice(0, 10),
    }));
    setStep(1);
    showToast(`Demo ${idx + 1} încărcat — ${d.shortDesc}`, "success", 5000);
  }, [pushUndo, showToast]);


  // ═══════════════════════════════════════════════════════════
  // SmartEnvelopeHub — handler-uri pentru RampInstant (S3)
  // Aplicare NON-destructivă: doar anvelopa se schimbă, restul proiectului intact.
  // ═══════════════════════════════════════════════════════════

  /**
   * Aplică un șablon de anvelopă (8 tipologii derivate din demo-urile 1-20).
   * Copiază doar { opaque, glazing, bridges } din demo-ul referit, păstrând
   * intacte building, instalații, regenerabile, auditor.
   */
  const applyEnvelopeTemplate = useCallback((templateId) => {
    const tpl = ENVELOPE_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) { showToast("Șablon anvelopă necunoscut: " + templateId, "error"); return; }
    const env = extractEnvelopeFromTemplate(tpl, DEMO_PROJECTS);
    if (!env) { showToast("Nu am putut extrage anvelopa din șablon", "error"); return; }
    pushUndo();
    setOpaqueElements(env.opaqueElements);
    setGlazingElements(normalizeGlazingList(env.glazingElements));
    setThermalBridges(env.thermalBridges);
    showToast(`Șablon aplicat: ${tpl.title} — ${env.opaqueElements.length} pereți, ${env.glazingElements.length} vitraje, ${env.thermalBridges.length} punți`, "success", 5000);
  }, [pushUndo, showToast]);

  /**
   * Aplică anvelopa (doar {opaque, glazing, bridges}) dintr-un demo ales
   * dintre cele 20, păstrând building + instalații curente. (decizia D6)
   */
  const applyDemoEnvelopeOnly = useCallback((demoIdx) => {
    const d = DEMO_PROJECTS[demoIdx];
    if (!d) { showToast("Demo inexistent: " + demoIdx, "error"); return; }
    pushUndo();
    const opaque  = (d.opaqueElements  || []).map(el => ({ ...el, layers: (el.layers || []).map(l => ({ ...l })) }));
    const glazing = normalizeGlazingList((d.glazingElements || []).map(el => ({ ...el })));
    const bridges = (d.thermalBridges  || []).map(b => ({ ...b }));
    setOpaqueElements(opaque);
    setGlazingElements(glazing);
    setThermalBridges(bridges);
    showToast(`Anvelopă din Demo ${demoIdx + 1} aplicată — ${opaque.length} pereți, ${glazing.length} vitraje, ${bridges.length} punți`, "success", 5000);
  }, [pushUndo, showToast]);

  /**
   * Generează 5 punți standard din geometrie (decizia D1) — cu warning.
   * User-ul are deja confirmarea din UI (RampInstant cere confirmation).
   */
  const applyStandardBridgesPackHandler = useCallback(() => {
    pushUndo();
    const pack = buildStandardBridgesPack(building, glazingElements);
    setThermalBridges(prev => {
      // Evită duplicate: filtrează pack-ul cu tipuri care nu există deja.
      const existingTypes = new Set((prev || []).map(b => b.type));
      const newOnes = pack.filter(b => !existingTypes.has(b.type));
      return [...(prev || []), ...newOnes];
    });
    showToast(`${pack.length} punți standard adăugate (estimare orientativă)`, "success", 6000);
  }, [building, glazingElements, pushUndo, showToast]);

  /**
   * Generează 4 pereți N/S/E/V + acoperiș + planșeu pe sol din geometria Step 1.
   */
  const apply4WallsFromGeom = useCallback(() => {
    const check = canGenerateFromGeometry(building);
    if (!check.ok) { showToast(check.reason, "error"); return; }
    const elements = generateElementsFromGeometry(building);
    if (!elements || elements.length === 0) {
      showToast("Nu s-au putut genera elementele (geometrie invalidă)", "error");
      return;
    }
    pushUndo();
    setOpaqueElements(prev => {
      // Nu înlocui ce există — append la sfârșit.
      const newNames = new Set((prev || []).map(el => el.name));
      const toAdd = elements.filter(el => !newNames.has(el.name));
      return [...(prev || []), ...toAdd];
    });
    showToast(`${elements.length} elemente opace generate din geometria Step 1 (completează straturile)`, "success", 6000);
  }, [building, pushUndo, showToast]);


  // ═══════════════════════════════════════════════════════════
  // FEATURE: EXPORT / IMPORT PROIECT (JSON) — v3.5
  // ═══════════════════════════════════════════════════════════
  const exportProject = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportProject({
      building, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor,
      useNA2023, finAnalysisInputs,
    });
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, useNA2023, finAnalysisInputs]);

  const exportCSV = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportCSV({
      opaqueElements, glazingElements, thermalBridges,
      building, heating, acm, cooling, ventilation, lighting,
      selectedClimate, instSummary, renewSummary, envelopeSummary,
      showToast, lang,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, showToast]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT EXCEL (.xlsx) — Structured workbook with multiple sheets
  // ═══════════════════════════════════════════════════════════
  const exportExcel = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportExcel({
      building, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      solarThermal, photovoltaic, heatPump, biomass, auditor,
      selectedClimate, instSummary, renewSummary, envelopeSummary, monthlyISO,
      showToast, setExporting, lang,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, opaqueElements, glazingElements, thermalBridges, showToast]);

  // (exportExcelFull declared below, after selectedClimate)

  // ═══════════════════════════════════════════════════════════
  // IMPORT XML ENERGETIC — Parse format XML energetic (DOSET/gbXML/generic)
  // ═══════════════════════════════════════════════════════════
  const importENERGPlus = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importENERGPlus({ file, setBuilding, setOpaqueElements, showToast });
  }, [showToast]);

  const importOCR = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importOCR({ file, setBuilding, setAuditor, showToast });
  }, [showToast]);

  const importDOSET = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importDOSET({ file, setBuilding, showToast });
  }, [showToast]);

  const importGbXML = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importGbXML({ file, setBuilding, setOpaqueElements, showToast });
  }, [showToast]);

  const importProject = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importProject({
      file, lang, showToast, setStep,
      setBuilding, setOpaqueElements, setGlazingElements, setThermalBridges,
      setHeating, setAcm, setCooling, setVentilation, setLighting,
      setSolarThermal, setPhotovoltaic, setHeatPump, setBiomass, setOtherRenew, setAuditor,
      setUseNA2023, setFinAnalysisInputs,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, showToast]);

  const importFileRef = useRef(null);


  // ─── CSV Import for envelope elements ───
  const csvImportRef = useRef(null);
  const importCSV = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importCSV({ file, setOpaqueElements, setGlazingElements, showToast });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // S7.5 — importIFC definit AICI (înainte de handleDrop) pentru a evita TDZ
  const importIFC = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importIFC({ file, setBuilding, setOpaqueElements, setGlazingElements, showToast });
  }, [showToast]);

  // S7.6 — importInvoiceOCR: nu e folosit în handleDrop, dar îl țin grupat cu restul importurilor
  const importInvoiceOCR = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importInvoiceOCR({
      file, setEnergyPrices, setBuilding, showToast,
      onInvoiceData: (data) => { console.info("[OCR Invoice]", data); },
    });
  }, [showToast]);

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
  const cpeNotifiedRef = useRef(false);
  useEffect(() => {
    if (!auditor.date || cpeNotifiedRef.current) return;
    const cpeDate = new Date(auditor.date);
    const validityYears = parseInt(auditor.validityYears) || 10;
    const expirationDate = new Date(cpeDate.getTime() + validityYears * 365.25 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expirationDate - new Date()) / (24 * 60 * 60 * 1000));
    if (daysLeft > 0 && daysLeft <= 365) {
      // Notify if CPE expires within 1 year
      if ("Notification" in window && Notification.permission === "granted") {
        cpeNotifiedRef.current = true;
        const timerId = setTimeout(() => {
          showToast(`CPE expiră în ${daysLeft} zile (${expirationDate.toLocaleDateString("ro-RO")})`, daysLeft <= 90 ? "error" : "info", 8000);
        }, 3000);
        return () => clearTimeout(timerId);
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
    } else if (file.name.endsWith(".ifc")) {
      importIFC(file);
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
  }, [importProject, importCSV, importDOSET, importGbXML, importENERGPlus, importOCR, importIFC]);

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
    envelopeSummary, monthlyISO, building, heating, acm, cooling, ventilation, lighting, selectedClimate, solarThermal, useNA2023,
    bacsClass, // Sprint 5 — aplicare f_BAC conform SR EN ISO 52120-1:2022
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

  // ─── ACM EN 15316 detaliat — passthrough din instSummary (sursă unică) ──────
  // Elimină recalculul duplicat cu logica circulară solarFr (pre-Sprint 1 ACM).
  // Hook-ul useInstallationSummary apelează deja calcACMen15316 cu toți parametrii
  // UI — aici doar expunem rezultatul pentru consumatorii downstream (Step8, raport).
  const acmDetailed = instSummary?.acmDetailed || null;

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
  // Sprint 18 UX — fiecare pas are acum checks granulare, nu mai e fix
  const stepCompleteness = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const Vol = parseFloat(building.volume) || 0;
    const yr = parseInt(building.yearBuilt) || 0;

    // Step 1 — 6 checks (localitate, Au, V, categorie, an, regim)
    const c1 = [
      !!building.locality || !!building.city,
      Au > 0,
      Vol > 0,
      !!building.category,
      yr >= 1800 && yr <= 2030,
      !!building.floors && String(building.floors).trim().length > 0,
    ];
    const s1 = c1.filter(Boolean).length / c1.length;

    // Step 2 — 3 checks (opace, vitrate, sumar G)
    const c2 = [
      opaqueElements.length > 0,
      glazingElements.length > 0,
      !!(envelopeSummary && envelopeSummary.G > 0),
    ];
    const s2 = c2.filter(Boolean).length / c2.length;

    // Step 3 — 3 checks (sursă încălzire, ACM, ventilație)
    const c3 = [
      !!heating.source,
      !!acm.source,
      !!ventilation.type,
    ];
    const s3 = c3.filter(Boolean).length / c3.length;

    // Step 4 — opțional, 1 dacă măcar o sursă activă; altfel 0.5 (parțial) — vizual neutru
    const hasRenew = !!(photovoltaic?.enabled || solarThermal?.enabled || heatPump?.enabled || biomass?.enabled);
    const s4 = hasRenew ? 1 : 0.5;

    // Step 5 — calcul finalizat (instSummary + renewSummary)
    const c5 = [!!instSummary, !!(instSummary && instSummary.ep_total_m2 > 0)];
    const s5 = c5.filter(Boolean).length / c5.length;

    // Step 6 — auditor + cod unic opțional
    const c6 = [
      !!auditor.name,
      !!(auditor.certNumber || auditor.cert_no || auditor.attestationNo),
      !!instSummary,
    ];
    const s6 = c6.filter(Boolean).length / c6.length;

    // Step 7 — audit: consum real introdus sau auditor finalizat
    const c7 = [
      !!auditor.name,
      !!(auditor.auditDate || auditor.dataAudit),
    ];
    const s7 = c7.filter(Boolean).length / c7.length;

    // Step 8 — mereu 100% (instrumente opționale)
    const s8 = 1;

    return [s1, s2, s3, s4, s5, s6, s7, s8];
  }, [building, opaqueElements, glazingElements, heating, acm, ventilation, photovoltaic, solarThermal, heatPump, biomass, instSummary, envelopeSummary, auditor]);

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
    // Sprint 11 — factor electricitate NA:2023 gated pe toggle
    const fP_elec_m = getFPElecTot(useNA2023);
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
      const ep = qf_h * fP + qf_w * fP_acm + qf_c * fP_elec_m + qf_v * fP_elec_m + qf_l * fP_elec_m;
      return { name, tExt, deltaT, qf_h, qf_w, qf_c, qf_v, qf_l, qf_total, ep, daysInMonth: daysInMonth[i] };
    });
  }, [instSummary, selectedClimate, envelopeSummary, building.areaUseful, building.volume, building.category, heating.theta_int, monthlyISO, cooling.eer, acm.source, heating.source, useNA2023]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: COMPARAȚIE SCENARII (actual vs reabilitat)
  // ═══════════════════════════════════════════════════════════
  const [showScenarioCompare, setShowScenarioCompare] = useState(false);
  // #10 Comparare proiecte — import referință pentru comparație
  const [compareRef, setCompareRef] = useState(null);
  const importCompareRef = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importCompareRef({ file, setCompareRef, showToast });
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
    // Sprint 11 — factor electricitate gated pe useNA2023 (Tab A.16 2.50 / Tab 5.17 2.62)
    const fP_elec_scenario = getFPElecTot(useNA2023);
    let newQfH, newFuelFpH, newFuelCO2H;
    if (ri.addHP) {
      const cop = parseFloat(ri.hpCOP) || 4.0;
      newQfH = newQH / cop; newFuelFpH = fP_elec_scenario; newFuelCO2H = CO2_ELEC;
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
    const acmFp = ri.addHP ? fP_elec_scenario : (instSummary.fuel?.fP_tot || 1.17);
    const newEp = newQfH * newFuelFpH + newQfW * acmFp + newQfC * fP_elec_scenario + newQfV * fP_elec_scenario + newQfL * fP_elec_scenario;
    let renewEp = 0;
    if (ri.addPV) { renewEp += (parseFloat(ri.pvArea)||0) * 0.21 * 0.97 * (selectedClimate?.solar?.Oriz||330) * 0.80 * fP_elec_scenario; }
    if (ri.addSolarTh) { renewEp += (parseFloat(ri.solarThArea)||0) * 0.75 * (selectedClimate?.solar?.S||390) * 0.85; }
    const newEpM2 = Au > 0 ? Math.max(0, newEp - renewEp) / Au : 0;
    const newClass = getEnergyClass(newEpM2, catKey);
    const newCO2M2 = Au > 0 ? (newQfH * newFuelCO2H + newQfW * (ri.addHP?CO2_ELEC:(instSummary.fuel?.fCO2||0.20)) + (newQfC+newQfV+newQfL)*CO2_ELEC) / Au : 0;
    const epOrig = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
    const co2Orig = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
    return {
      original: { ep: epOrig, co2: co2Orig, cls: getEnergyClass(epOrig, catKey), qfTotal: instSummary.qf_total },
      rehab: { ep: newEpM2, co2: newCO2M2, cls: newClass, qfTotal: newQfTotal },
      savings: { epPct: epOrig>0?((epOrig-newEpM2)/epOrig*100):0, co2Pct: co2Orig>0?((co2Orig-newCO2M2)/co2Orig*100):0, qfSaved: instSummary.qf_total - newQfTotal },
    };
  }, [instSummary, envelopeSummary, building, cooling, selectedClimate, rehabScenarioInputs, opaqueElements, glazingElements, renewSummary, calcOpaqueR, ventilation.type, useNA2023]);

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
  // COST ESTIMATIV REABILITARE — calcRehabCost (deviz orientativ RON)
  // ═══════════════════════════════════════════════════════════════
  const rehabCostEstimate = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au || !opaqueElements.length) return null;
    const ri = rehabScenarioInputs;
    const wallArea = opaqueElements.filter(e => e.type === "PE").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
    const roofArea = opaqueElements.filter(e => ["PP","PT"].includes(e.type)).reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
    const floorArea = opaqueElements.filter(e => ["PB","PL"].includes(e.type)).reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
    const windowArea = glazingElements.reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
    if (!wallArea && !roofArea && !windowArea) return null;
    return calcRehabCost({
      wallArea,
      roofArea,
      floorArea,
      windowArea,
      wallInsulType: "eps",
      wallInsulThick: parseInt(ri.insulWallThickness) || 12,
      roofInsulType: "eps",
      roofInsulThick: parseInt(ri.insulRoofThickness) || 15,
      replaceWindows: ri.replaceWindows,
      windowType: "2g",
      addHP: ri.addHP,
      hpType: "aw",
      hpPower: 10,
      addVMC: ri.addHR,
      Au,
      addSolar: ri.addSolarTh,
      solarArea: parseFloat(ri.solarThArea) || 0,
      addPV: ri.addPV,
      pvKwp: parseFloat(ri.pvArea) ? parseFloat(ri.pvArea) * 0.20 : 0,
      contingency: 0.15,
    });
  }, [building.areaUseful, opaqueElements, glazingElements, rehabScenarioInputs]);

  // ═══════════════════════════════════════════════════════════════
  // NEW: BACS verification (A5) — Sprint 5 (17 apr 2026) upgrade ISO 52120
  // ═══════════════════════════════════════════════════════════════
  const bacsCheck = useMemo(() => {
    const power = parseFloat(heating.power) || 0;
    // Apelăm checker-ul EPBD Art. 14 + L. 238/2024 cu detectare termen expirat
    const mandatoryInfo = checkBACSMandatoryISO({
      category: building.category,
      hvacPower: power,
      isNew: building.isNew === true || building.constructionPeriod === "new",
    });
    // Afișăm cardul BACS pentru ORICE clădire (nu doar >290 kW) — Sprint 5 P7
    const isRequired = mandatoryInfo.mandatory;
    const isApplicable = true;
    const cls = BACS_CLASSES[bacsClass];
    const isoLabels = BACS_CLASS_LABELS[bacsClass] || BACS_CLASS_LABELS.C;
    const bacsCat = getBACSCategoryFromCode(building.category);
    const factors = getBACSFactors(bacsCat, bacsClass);
    // Non-compliance: obligatoriu + clasă sub prag minim
    const minClassOrder = { A: 4, B: 3, C: 2, D: 1 };
    const currentRank = minClassOrder[bacsClass] || 0;
    const minRank = mandatoryInfo.minClass ? minClassOrder[mandatoryInfo.minClass] : 0;
    const isNonCompliant = isRequired && currentRank < minRank;
    return {
      isRequired,
      isApplicable,
      bacsClass,
      factor: cls?.factor || 1,
      label: cls?.label || "—",
      desc: cls?.desc || "",
      isoLabels,
      factors,                   // Factori per sistem (heating/cooling/dhw/vent/lighting)
      category: bacsCat,         // categorie ISO 52120 mapată
      mandatory: isRequired,
      minClass: mandatoryInfo.minClass,
      deadline: mandatoryInfo.deadline,
      deadlineExpired: mandatoryInfo.deadlineExpired,
      warningLevel: mandatoryInfo.warningLevel, // "none"|"info"|"warning"|"error"
      epbdRef: mandatoryInfo.epbdRef,
      reason: mandatoryInfo.reason,
      isNonCompliant,
      recommendation: isNonCompliant
        ? `Obligatoriu upgrade la clasa ${mandatoryInfo.minClass} sau mai bun (${mandatoryInfo.epbdRef})`
        : null,
    };
  }, [heating.power, building.category, building.isNew, building.constructionPeriod, bacsClass]);

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
  const exportXML = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportXML({
      building, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      solarThermal, photovoltaic, heatPump, biomass, auditor,
      instSummary, renewSummary, envelopeSummary, selectedClimate,
      showToast,
    });
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, auditor, instSummary, renewSummary, envelopeSummary, selectedClimate, showToast]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT EXCEL COMPLET (.xlsx) — 7 foi structurate (extras în handlers/exportHandlers.js)
  // ═══════════════════════════════════════════════════════════
  const exportExcelFull = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportExcelFull({
      building, selectedClimate, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      photovoltaic, solarThermal, heatPump, biomass,
      instSummary, renewSummary, envelopeSummary, monthlyISO, auditor,
      showToast, setExporting,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, selectedClimate, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      photovoltaic, solarThermal, heatPump, biomass,
      instSummary, renewSummary, envelopeSummary, monthlyISO, auditor, showToast]);
  const exportPDFNative = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportPDFNative({
      building, auditor, instSummary, renewSummary, annualEnergyCost,
      selectedClimate, cooling,
      showToast, setExporting, lang,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate, cooling.hasCooling, showToast]);

  const exportPDFArchival = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportPDFNative({
      building, auditor, instSummary, renewSummary, annualEnergyCost,
      selectedClimate, cooling,
      showToast, setExporting, lang,
      archival: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate, cooling.hasCooling, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B4b: FIȘĂ SINTETICĂ 1 PAGINĂ PDF (client-friendly)
  // ═══════════════════════════════════════════════════════════
  const exportQuickSheet = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportQuickSheet({
      building, auditor, instSummary, renewSummary, annualEnergyCost,
      rehabComparison, selectedClimate, cooling,
      showToast, setExporting,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, rehabComparison, selectedClimate, cooling.hasCooling, showToast]);

  // ═══════════════════════════════════════════════════════════
  // B4: EXPORT RAPORT TEHNIC COMPLET PDF
  // ═══════════════════════════════════════════════════════════
  const exportFullReport = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportFullReport({
      building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate,
      opaqueElements, glazingElements, thermalBridges, envelopeSummary,
      heating, cooling, ventilation, solarThermal, photovoltaic, heatPump, biomass,
      monthlyISO, rehabComparison, financialAnalysis, buildingPhotos,
      showToast, setExporting, calcOpaqueR,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate,
      opaqueElements, glazingElements, thermalBridges, envelopeSummary,
      heating, cooling, ventilation, solarThermal, photovoltaic, heatPump, biomass,
      monthlyISO, rehabComparison, financialAnalysis, buildingPhotos,
      cooling.hasCooling, showToast, calcOpaqueR, getNzebEpMax]);

  // ═══════════════════════════════════════════════════════════
  // B6: BULK IMPORT/EXPORT — Multiple proiecte
  // ═══════════════════════════════════════════════════════════
  const exportBulkProjects = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportBulkProjects({ projectList, showToast });
  }, [projectList, showToast]);

  const importBulkProjects = useCallback(async (file) => {
    const m = await import("./handlers/importHandlers.js");
    return m.importBulkProjects({ file, lang, showToast });
  }, [lang, showToast]);

  // (importIFC + importInvoiceOCR mutate mai sus înainte de handleDrop — evită TDZ)

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
  const generateAuditReport = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.generateAuditReport({
      building, auditor, instSummary, renewSummary, annualEnergyCost,
      envelopeSummary, airInfiltrationCalc, naturalLightingCalc, gwpDetailed,
      smartSuggestions, selectedClimate, cooling,
      showToast,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, auditor, instSummary, renewSummary, annualEnergyCost, envelopeSummary, airInfiltrationCalc, naturalLightingCalc, gwpDetailed, smartSuggestions, selectedClimate, cooling.hasCooling, showToast]);

  // ═══════════════════════════════════════════════════════════════
  // RAPORT CONFORMITATE MULTI-NORMATIV PDF
  // Mc 001-2022 · C107 · BACS EN 15232-1 · EPBD 2024/1275 · nZEB
  // ═══════════════════════════════════════════════════════════════
  const exportComplianceReport = useCallback(async () => {
    const m = await import("./handlers/exportHandlers.js");
    return m.exportComplianceReport({
      instSummary, renewSummary, building, selectedClimate, cooling,
      envelopeSummary, opaqueElements, glazingElements, bacsClass, auditor,
      showToast, setExporting, calcOpaqueR, useNA2023,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instSummary, renewSummary, building, selectedClimate, cooling.hasCooling,
      envelopeSummary, opaqueElements, glazingElements, bacsClass, auditor,
      getEnergyClass, getNzebEpMax, calcOpaqueR, showToast, useNA2023]);


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

            {/* P1-1 (18 apr 2026) — Buton Gestionează abonament (Stripe Billing Portal)
                Vizibil doar pentru utilizatorii cu plan plătit activ. */}
            {userTier && userTier !== "free" && (
              <button
                type="button"
                onClick={openBillingPortal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] hover:border-white/20 text-xs font-medium text-white/80 hover:text-white transition-all"
              >
                <span aria-hidden="true">⚙️</span>
                {lang==="EN" ? "Manage subscription" : "Gestionează abonament"}
              </button>
            )}
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

      {/* Sprint 18 UX — Skip links pentru navigare a11y keyboard */}
      <a href="#main-content"
         className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg">
        {lang==="EN" ? "Skip to main content" : "Sari la conținut principal"}
      </a>
      <a href="#sidebar-nav"
         className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-56 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg">
        {lang==="EN" ? "Skip to step navigation" : "Sari la navigare pași"}
      </a>

      {/* HEADER */}
      <header className="border-b border-white/[0.06] px-3 sm:px-6 py-2 sm:py-3 no-print">
        <div className="max-w-7xl mx-auto flex items-center gap-2">

          {/* ── ZONA 1: IDENTITATE (logo · plan · cloud · echipă) ── */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setSidebarOpen(o=>!o)}
              aria-label={sidebarOpen ? "Închide navigare pași" : "Deschide navigare pași"}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar-nav"
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
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

            {storageStatus && <span role="status" aria-live="polite" aria-atomic="true" className="text-[10px] opacity-40 hidden lg:inline shrink-0">{storageStatus}</span>}

            <div className="hidden lg:flex items-center gap-0.5 shrink-0">
              <button onClick={undo} disabled={undoStack.length===0} title="Undo (Ctrl+Z)" aria-label="Anulează ultima acțiune (Ctrl+Z)"
                className={cn("text-xs px-1.5 py-1 rounded-l-lg border border-white/10 transition-colors", undoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}><span aria-hidden="true">↶</span></button>
              <button onClick={redo} disabled={redoStack.length===0} title="Redo (Ctrl+Y)" aria-label="Reface acțiunea (Ctrl+Y)"
                className={cn("text-xs px-1.5 py-1 rounded-r-lg border border-l-0 border-white/10 transition-colors", redoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}><span aria-hidden="true">↷</span></button>
            </div>

            <button onClick={() => setShowTutorial(true)} title="Tutorial interactiv"
              aria-label="Deschide tutorialul interactiv"
              aria-haspopup="dialog"
              className="text-[10px] sm:text-xs px-2 py-1 rounded-lg border border-purple-500/25 bg-purple-500/8 text-purple-300/70 hover:bg-purple-500/20 hover:text-purple-300 transition-all shrink-0">
              <span aria-hidden="true">🎓</span><span className="hidden lg:inline ml-1">Tutorial</span>
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
                        { icon: "⚡", label: "Quick Fill clădire", action: () => setShowQuickFill(true), color: "text-amber-300" },
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
            <button onClick={toggleThemeManual} aria-label={theme==="dark"?"Comută la mod luminos":"Comută la mod întunecat"} className="text-[10px] px-1.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"><span aria-hidden="true">{theme==="dark"?"☀":"🌙"}</span></button>
            <button onClick={() => setLang(l => l==="RO"?"EN":"RO")}
              aria-label={lang==="RO"?"Switch to English":"Comută la limba română"}
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
        {sidebarOpen && <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <nav id="sidebar-nav" aria-label="Navigare pași" className={cn("fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-56 max-w-[min(280px,70vw)] lg:max-w-none shrink-0 border-r border-white/[0.06] py-6 px-3 transform transition-transform duration-200 lg:transform-none overflow-y-auto no-print", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{background:theme==="dark"?"#0a0a1a":"#ffffff"}}>
          <button onClick={() => setSidebarOpen(false)} aria-label="Închide meniul lateral" className="lg:hidden sticky top-0 float-right w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white bg-[#0a0a1a] z-10 mb-2"><span aria-hidden="true">✕</span></button>
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
            aria-label={lang==="EN"?"Open client data form":"Deschide formular date client"}
            className="w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left">
            <span className="text-lg" aria-hidden="true">👤</span>
            <div>
              <div className="text-xs font-semibold text-amber-300">{lang==="EN"?"Client form":"Formular Client"}</div>
              <div className="text-[10px] opacity-50">{lang==="EN"?"Audit data":"Date pentru audit"}</div>
            </div>
          </button>

          <div className="mt-4 p-2 bg-white/[0.02] rounded-lg">
            <div className="text-[8px] opacity-25 space-y-0.5">
              <div>{lang==="EN"?"Ctrl+S — Export project":"Ctrl+S — Export proiect"}</div>
              <div>{lang==="EN"?"Alt+← → — Navigate steps":"Alt+← → — Navigare pași"}</div>
              <div>{lang==="EN"?"Drag & drop — Import file":"Drag & drop — Import fișier"}</div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 pb-16 lg:pb-6 overflow-y-auto min-w-0">

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
              <Suspense fallback={<div className="py-20 text-center opacity-40 text-sm">Se încarcă formularul...</div>}>
                <ClientInputForm />
              </Suspense>
            </div>
          )}

          <div key={step} style={{animation:"fadeSlideIn 0.3s ease-out"}} className={showClientForm ? "hidden" : ""}>
          <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {/* ═══ STEP 1: IDENTIFICARE ═══ */}
          {step === 1 && <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-40 text-sm">Se încarcă...</div>}><Step1Identification
            building={building} updateBuilding={updateBuilding} lang={lang} selectedClimate={selectedClimate}
            BUILDING_CATEGORIES={BUILDING_CATEGORIES} STRUCTURE_TYPES={STRUCTURE_TYPES}
            autoDetectLocality={autoDetectLocality} estimateGeometry={estimateGeometry} avRatio={avRatio}
            loadDemoByIndex={loadDemoByIndex}
            loadTypicalBuilding={loadTypicalBuilding} showToast={showToast}
            goToStep={goToStep}
            onOpenTutorial={() => setShowTutorial(true)}
            onOpenQuickFill={() => setShowQuickFill(true)}
            onOpenChat={() => setShowChat(true)}
            onOpenJSONImport={importProject}
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
            // SmartEnvelopeHub (S3 — feature flag controled)
            envelopeHubEnabled={envelopeHubEnabled}
            applyEnvelopeTemplate={applyEnvelopeTemplate}
            applyDemoEnvelopeOnly={applyDemoEnvelopeOnly}
            applyStandardBridgesPackHandler={applyStandardBridgesPackHandler}
            apply4WallsFromGeom={apply4WallsFromGeom}
            onOpenJSONImport={importProject}
            onOpenIFC={() => setShowImportWizard(true)}
            onLoadDemoTutorial={() => loadDemoByIndex(1)}
            showToast={showToast}
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
            financialAnalysis, rehabCostEstimate,
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
            exportPDFNative, exportPDFArchival, exportQuickSheet, fetchTemplate,
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
            setBuilding,
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
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* MODALS */}
      {showOpaqueModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {showGlazingModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {showBridgeModal && (
        <Suspense fallback={null}>
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
        </Suspense>
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
                <div className="text-amber-400 mb-1">POST /api/generate-document?type=cpe|anexa|audit</div>
                <div className="opacity-50">Endpoint unic DOCX: certificat, anexă extinsă sau raport audit. A4 portret forțat.</div>
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
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {showBridgeCatalog && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* ═══ QuickFill Wizard ═══ */}
      {showQuickFill && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* ═══ ChatImport — buton flotant + chat panel ═══ */}
      <ChatImport
        isOpen={showChat}
        onOpenChange={setShowChat}
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
          <Suspense fallback={null}>
            <ShareModal
              projectState={{ building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, instSummary, renewSummary, energyClass: ec, co2Class: cc }}
              onClose={() => setShowShareModal(false)}
              showToast={showToast}
            />
          </Suspense>
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
          <Suspense fallback={null}>
            <ProjectTimeline
              state={{ building, selectedClimate, opaqueElements, heating, instSummary, auditor, renewSummary }}
              currentStep={step}
              onGoToStep={(s) => { setStep(s); setShowTimeline(false); }}
            />
          </Suspense>
        </div>
      )}

      {/* ═══ PROJECT COMPARISON (pct. 38) ═══ */}
      {showComparison && (
        <Suspense fallback={null}>
          <ProjectComparison
            currentState={{ building, selectedClimate, opaqueElements, instSummary, renewSummary, annualEnergyCost }}
            projectList={projectList}
            onClose={() => setShowComparison(false)}
          />
        </Suspense>
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
              <Suspense fallback={<div className="py-20 text-center opacity-40 text-sm">Se încarcă formularul audit...</div>}>
              <AuditClientDataForm
                onDataChange={(data) => {
                  // Sprint 15 — FIX integrare AuditClientDataForm → Step7Audit.
                  // formData este FLAT ({ [fieldId]: value }), nu nested pe secțiuni.
                  // Înainte de Sprint 15, handler-ul folosea data.documentation.X (nested) →
                  // totul era undefined și nimic nu se propaga. Acum citim flat.
                  if (!data || typeof data !== "object") return;

                  // ── Auto-populate câmpuri clădire ──
                  const bUpdates = {};
                  // Identificare
                  if (data.buildingAddress && !building.address) bUpdates.address = data.buildingAddress;
                  if (data.constructionYear && !building.yearBuilt) bUpdates.yearBuilt = String(data.constructionYear);
                  if (data.latitude) bUpdates.latitude = String(data.latitude);
                  if (data.longitude) bUpdates.longitude = String(data.longitude);
                  if (data.ownerName && !building.owner) bUpdates.owner = data.ownerName;
                  // Sprint 15 — identificare juridică
                  if (data.cadastralNumber && !building.cadastralNumber) bUpdates.cadastralNumber = data.cadastralNumber;
                  if (data.landBook && !building.landBook) bUpdates.landBook = data.landBook;
                  if (data.areaBuilt && !building.areaBuilt) bUpdates.areaBuilt = String(data.areaBuilt);
                  if (data.nApartments && (!building.nApartments || building.nApartments === "1")) bUpdates.nApartments = String(data.nApartments);
                  // Anvelopă
                  if (data.totalBuildingArea && !building.areaUseful) bUpdates.areaUseful = String(data.totalBuildingArea);
                  if (data.usefulArea && !building.areaUseful) bUpdates.areaUseful = String(data.usefulArea);
                  if (data.buildingVolume && !building.volume) bUpdates.volume = String(data.buildingVolume);
                  // Administrativ
                  if (data.occupantsNumber && !building.occupants) bUpdates.occupants = String(data.occupantsNumber);
                  if (Object.keys(bUpdates).length) setBuilding(b => ({ ...b, ...bUpdates }));

                  // ── Auto-populate auditor (Sprint 15) ──
                  const aUpdates = {};
                  if (data.auditorName && !auditor.name) aUpdates.name = data.auditorName;
                  if (data.auditorRegistry && !auditor.atestat) aUpdates.atestat = data.auditorRegistry;
                  if (data.auditorCompany && !auditor.company) aUpdates.company = data.auditorCompany;
                  if (data.signatureDataURL) aUpdates.signatureDataURL = data.signatureDataURL;
                  if (data.stampDataURL) aUpdates.stampDataURL = data.stampDataURL;
                  if (Object.keys(aUpdates).length && typeof setAuditor === "function") {
                    setAuditor(a => ({ ...a, ...aUpdates }));
                  }

                  // ── Auto-populate sistem încălzire ──
                  const heatingMap = {
                    "Cazan gaz": "GAZ_COND", "Cazan petrol": "MOTORINA",
                    "Pompă de căldură": "HP_AA", "Încălzire electrică": "ELECTRICA",
                    "Lemn/biomasa": "BIOMASA", "Centralizată": "DISTRICT",
                  };
                  if (data.heatingSystem && heatingMap[data.heatingSystem]) {
                    setHeating(h => ({ ...h, source: heatingMap[data.heatingSystem] }));
                  }
                  if (data.boilerPower && !heating.power)
                    setHeating(h => ({ ...h, power: String(data.boilerPower) }));
                  if (data.boilerEfficiency && !heating.eta_gen)
                    setHeating(h => ({ ...h, eta_gen: String(data.boilerEfficiency / 100) }));

                  // ── Auto-populate ventilație ──
                  const ventMap = { "Naturală": "NAT", "Mecanică cu recuperare": "VMCR", "Mecanică fără recuperare": "VMC" };
                  if (data.ventilationType && ventMap[data.ventilationType])
                    setVentilation(v => ({ ...v, type: ventMap[data.ventilationType] }));

                  // ── Auto-populate iluminat ──
                  const lightMap = { "LED": "LED", "Fluoreșcente": "FL", "Incandescență": "INC", "Halogeni": "INC", "Mixă": "MIX" };
                  if (data.lightingType && lightMap[data.lightingType])
                    setLighting(l => ({ ...l, type: lightMap[data.lightingType] }));

                  // ── Auto-populate fotovoltaic ──
                  if (data.hasPV === "Da") {
                    const pvUpdates = { enabled: true };
                    if (data.pvInstalledPower) pvUpdates.peakPower = String(data.pvInstalledPower);
                    setPhotovoltaic(p => ({ ...p, ...pvUpdates }));
                  }
                  // ── Auto-populate solar termic ──
                  if (data.hasSolarThermal === "Da") {
                    const stUpdates = { enabled: true };
                    if (data.solarThermalArea) stUpdates.area = String(data.solarThermalArea);
                    setSolarThermal(s => ({ ...s, ...stUpdates }));
                  }

                  // ── Răcire ──
                  if (data.hasCooling && data.hasCooling !== "Nu")
                    setCooling(c => ({ ...c, hasCooling: true }));
                }}
              />
              </Suspense>
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
              <Suspense fallback={<div className="py-20 text-center opacity-40 text-sm">Se încarcă calculator ROI...</div>}>
                <ROICalculator
                  building={building}
                  instSummary={instSummary}
                  annualEnergyCost={annualEnergyCost}
                  rehabComparison={rehabComparison}
                />
              </Suspense>
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
              <Suspense fallback={<div className="py-20 text-center opacity-40 text-sm">Se încarcă registru CPE...</div>}>
                <CPETracker />
              </Suspense>
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
              <Suspense fallback={<div className="py-20 text-center opacity-40 text-sm">Se încarcă factura...</div>}>
                <AuditInvoice building={building} auditor={auditor} onClose={() => setShowAuditInvoice(false)} />
              </Suspense>
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

