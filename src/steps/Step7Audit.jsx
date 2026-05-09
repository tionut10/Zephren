import React, { useState, useMemo } from "react";
import { canAccess } from "../lib/planGating.js";
import { canEmitForBuilding } from "../lib/canEmitForBuilding.js";
import PlanGate from "../components/PlanGate.jsx";
import PasaportBasic from "../components/PasaportBasic.jsx";
// Sprint P0-A (6 mai 2026) — refactor Card „Pașaport de Renovare" cu plan etapizat REAL.
import { calcPhasedRehabPlan } from "../calc/phased-rehab.js";
import { buildCanonicalMeasures } from "../calc/unified-rehab-costs.js";
import { getMepsThresholdsFor } from "../components/MEPSCheck.jsx";
import { buildRenovationPassport } from "../calc/renovation-passport.js";
import { getEurRonSync, REHAB_PRICES } from "../data/rehab-prices.js";
// Sprint P1 (6 mai 2026) cleanup — sursă canonică prețuri energie ANRE 2025.
import { getEnergyPriceFromPreset, DEFAULT_ENERGY_PRICES } from "../data/energy-prices.js";
// Sprint P2 (6 mai 2026) — preț electricitate LIVE Eurostat (cu fallback ANRE static).
import {
  getEnergyPriceLiveOrFallback,
  refreshEurostatCache,
  getUserElectricityPriceOverride,
  setUserElectricityPriceOverride,
} from "../data/energy-prices-live.js";
// Sprint P1 P1-06 — preț energie EUR/kWh per combustibil real (nu 0.15 hardcoded global).
import { getEnergyPriceEUR } from "../calc/smart-rehab.js";
// Sprint 8 mai 2026 — Componenta RaportConformareNZEB a fost eliminată; cardul
// de referință de mai jos păstrează doar redirect către Pas 6 (PDF oficial).
import { sanitizeSvg } from "../lib/sanitize-html.js";
import BuildingPhotos from "../components/BuildingPhotos.jsx";
import LCCAnalysis from "../components/LCCAnalysis.jsx";
import CostOptimalCurve from "../components/CostOptimalCurve.jsx";
import MEPSCheck, { getMepsStatus } from "../components/MEPSCheck.jsx";
import OfertaReabilitare from "../components/OfertaReabilitare.jsx";
import RenovationPassport from "../components/RenovationPassport.jsx";
import ConsumReconciliere from "../components/ConsumReconciliere.jsx";
// Sprint v6.2 (27 apr 2026): AnexaMDLPAFields mutat în Step 6 pentru self-sufficiency CPE + Anexa 1+2.
// Conform Ord. MDLPA 348/2026 (MO 292/14.IV.2026), AE Ic și AE IIc completează aceeași anexă.
import { calcMaintenanceFund, BUILDING_COMPONENTS } from "../calc/maintenance-fund.js";
import { calcPNRRFunding, FUNDING_PROGRAMS } from "../calc/pnrr-funding.js";
import { generateThermalMapSVG } from "../calc/thermal-map.js";
import { checkAcousticConformity } from "../calc/acoustic.js";
import { cn, Select, Input, Badge, Card, ResultRow, fmtRON, fmtEUR } from "../components/ui.jsx";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { getNzebEpMax, getURefAdaptive, getURefGlazingAdaptive } from "../calc/smart-rehab.js";
// Sprint 8 mai 2026 — helper centralizat obligativitate juridică raport nZEB
import { requiresNZEBReport } from "../calc/nzeb-required.js";
import { calcOpaqueR } from "../calc/opaque.js";
import { calcSRI, SRI_DOMAINS, CHP_TYPES, IEQ_CATEGORIES, RENOVATION_STAGES, MCCL_CATALOG } from "../calc/epbd.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB, NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { ZEB_THRESHOLDS, ZEB_FACTOR, U_REF_GLAZING, getURefNZEB } from "../data/u-reference.js";
import { CATEGORY_BASE_MAP, BUILDING_CATEGORIES, ELEMENT_TYPES } from "../data/building-catalog.js";
import { FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL } from "../data/constants.js";
import { REHAB_COSTS } from "../data/rehab-costs.js";
import { T } from "../data/translations.js";
import { generateRehabEstimatePDF } from "../lib/report-generators.js";

/**
 * Step7Audit — Extracted from energy-calc.jsx lines 12320-13537
 * Diagnostic summary, rehabilitation recommendations, smart suggestions,
 * multi-scenario comparison, financial analysis, priority chart
 */
export default function Step7Audit(props) {
  const {
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
    exportXML, exportFullReport, exportExcelFull,
    setThermalBridges,
    setBuilding,  // Sprint 17: pentru a stoca passportUUID pe building
    userPlan,     // Sprint Pricing v6.0 — gating Step 7 + Pașaport basic
  } = props;
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

  // Sprint Pricing v6.0 — Step 7 audit energetic e blocat pentru Free + Audit (199).
  // Acces: Pro 499 (Step 1-7 complet), Expert, Birou, Enterprise, Edu.
  if (!canAccess(userPlan, "step7Audit")) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-bold mb-2">{lang === "EN" ? "Step 7 — Audit & Rehabilitation" : "Pas 7 — Audit & Reabilitare"}</h2>
        <p className="text-sm text-slate-400 mb-4">
          {lang === "EN"
            ? "Complete energy audit (Mc 001-2022) with financial analysis NPV/IRR/LCC, prioritized renovation recommendations, multi-year phased planning, PNRR funding eligibility, basic Renovation Passport (mandatory EPBD from May 29, 2026)."
            : "Audit energetic complet (Mc 001-2022) cu analiză financiară NPV/IRR/LCC, recomandări reabilitare prioritizate, planificare faze multi-an, eligibilitate PNRR, Pașaport Renovare basic (obligatoriu EPBD de la 29 mai 2026)."}
        </p>
        <PlanGate
          feature="step7Audit"
          plan={userPlan}
          requiredPlan="pro"
          mode="upgrade"
        >
          <div />
        </PlanGate>
        <div className="flex justify-start mt-4">
          <button onClick={() => setStep(6)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
            ← Pas 6: Certificat
          </button>
        </div>
      </div>
    );
  }

  // Sprint v6.3 — Verificare HARD pe gradul REAL al auditorului (Ord. 348/2026 Art. 6.1.b).
  // Edge case: utilizator pe plan AE Ici/Expert/Birou/Enterprise dar atestat real AE IIci.
  // Auditul energetic e rezervat exclusiv AE Ici per Art. 6 alin. (1) lit. b).
  const auditLegalCheck = canEmitForBuilding({
    plan: userPlan,
    auditorGrad: building?.auditorGrad || null,
    building,
    operation: "audit",
  });
  if (!auditLegalCheck.ok) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🚫</span>
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold text-red-200">
                {lang === "EN" ? "Audit blocked — MDLPA grade restriction" : "Audit blocat — restricție grad MDLPA"}
              </h2>
              <p className="text-sm text-red-200/90">{auditLegalCheck.reason}</p>
              <p className="text-xs text-red-300/70">
                {lang === "EN" ? "Legal reference:" : "Referință legală:"} {auditLegalCheck.legalRef}
              </p>
              {auditLegalCheck.upgradePath && (
                <p className="text-xs text-amber-300/90 mt-3">
                  {lang === "EN"
                    ? `Required attestation: ${auditLegalCheck.upgradePath} (5+ years professional experience).`
                    : `Atestat necesar: ${auditLegalCheck.upgradePath} (vechime profesională ≥ 5 ani).`}
                </p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setStep(6)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
          ← Pas 6: Certificat
        </button>
      </div>
    );
  }

            const Au = parseFloat(building.areaUseful) || 0;
            const V = parseFloat(building.volume) || 0;
            const baseCatResolved = (CATEGORY_BASE_MAP?.[building.category]) || building.category;
            const catKey = baseCatResolved + (["RI","RC","RA"].includes(baseCatResolved) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, baseCatResolved);
            const rer = renewSummary?.rer || 0;
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const nzebThresh = NZEB_THRESHOLDS[baseCatResolved] || NZEB_THRESHOLDS.AL;
            const isNZEB = rer >= nzebThresh.rer_min && epFinal < getNzebEpMax(baseCatResolved, selectedClimate?.zone);

            // ── Analiza pierderilor prin anvelopa ──
            const envelopeAnalysis = (() => {
              if (!envelopeSummary) return [];
              const items = [];
              const volume = envelopeSummary.volume || 0;

              opaqueElements.forEach(el => {
                const area = parseFloat(el.area) || 0;
                const { u } = calcOpaqueR(el.layers, el.type);
                const elType = ELEMENT_TYPES.find(t => t.id === el.type);
                const tau = elType ? elType.tau : 1;
                const loss = tau * area * u;
                // Sprint P0-B (6 mai 2026) P0-04 — U_REF adaptiv per categorie + scop renovare.
                // Surse: Mc 001-2022 Tab 2.4 (nZEB rez), 2.7 (nZEB nrez), 2.10a (renov rez), 2.10b (renov nrez).
                // Înlocuiește valorile hardcoded incorecte (PE=0.56, PSol=0.40, PlanInt=0.50, etc.)
                // cu motorul `getURefAdaptive` care alege tabelul corect din u-reference.js.
                const uRef = getURefAdaptive(baseCatResolved, el.type, building) ?? 0.35;
                items.push({
                  name: el.name || elType?.label || el.type,
                  type: "opac",
                  area,
                  u: u,
                  uRef,
                  loss,
                  needsUpgrade: u > uRef * 1.2,
                  potential: u > uRef ? ((u - uRef) * area * tau) : 0,
                  recommendation: u > uRef * 1.5 ? "Termoizolare urgentă" : u > uRef ? "Termoizolare recomandată" : "Conform",
                  priority: u > uRef * 1.5 ? 1 : u > uRef ? 2 : 3,
                });
              });

              glazingElements.forEach(el => {
                const area = parseFloat(el.area) || 0;
                const u = parseFloat(el.u) || 0;
                // Sprint P0-B P0-04 — U_REF ferestre adaptiv (Mc 001-2022 Tab 2.5 + U_REF_GLAZING).
                // Reprezintă: nZEB rez 0.90 / nZEB nrez 1.30 / renovare 1.30 (configurat în u-reference.js).
                const uRef = getURefGlazingAdaptive(baseCatResolved, building) ?? 1.30;
                const loss = area * u;
                items.push({
                  name: el.name || "Tamplarie",
                  type: "vitrat",
                  area,
                  u,
                  uRef,
                  loss,
                  needsUpgrade: u > uRef * 1.1,
                  potential: u > uRef ? ((u - uRef) * area) : 0,
                  recommendation: u > 2.5 ? "Înlocuire tamplarie (tripan)" : u > uRef ? "Înlocuire tamplarie (dublu low-e)" : "Conform",
                  priority: u > 2.5 ? 1 : u > uRef ? 2 : 3,
                });
              });

              if (thermalBridges.length > 0) {
                const bridgeLoss = thermalBridges.reduce((s, b) => s + (parseFloat(b.psi)||0) * (parseFloat(b.length)||0), 0);
                if (bridgeLoss > envelopeSummary.totalHeatLoss * 0.15) {
                  items.push({
                    name: "Punti termice",
                    type: "punte",
                    area: 0,
                    u: 0,
                    uRef: 0,
                    loss: bridgeLoss,
                    needsUpgrade: true,
                    potential: bridgeLoss * 0.5,
                    recommendation: "Tratarea puntilor termice (izolare perimetrala continua)",
                    priority: 2,
                  });
                }
              }

              return items.sort((a, b) => a.priority - b.priority || b.potential - a.potential);
            })();

            // ── Analiza instalatii ──
            const installAnalysis = (() => {
              if (!instSummary) return [];
              const items = [];

              // Incalzire
              const etaH = instSummary.eta_total_h;
              if (instSummary.isCOP) {
                const cop = parseFloat(heating.eta_gen) || 3.5;
                if (cop < 4.0) items.push({ system:"Incalzire (pompa caldura)", issue:`COP=${cop.toFixed(1)} sub optim`, recommendation:"Modernizare pompa de caldura (COP > 4.5)", saving: instSummary.qf_h * (1 - cop/4.5), priority:2 });
              } else {
                if (etaH < 0.80) items.push({ system:"Încălzire", issue:`Randament total ${(etaH*100).toFixed(0)}% — suboptim`, recommendation:"Înlocuire cazan cu condensare (η>96%) sau pompa de caldura", saving: instSummary.qf_h * (1 - etaH/0.96), priority:1 });
                else if (etaH < 0.88) items.push({ system:"Încălzire", issue:`Randament total ${(etaH*100).toFixed(0)}% — mediu`, recommendation:"Optimizare sistem distributie si reglaj, sau cazan cu condensare", saving: instSummary.qf_h * (1 - etaH/0.93), priority:2 });
              }

              // Ventilare
              const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
              if (ventType && !ventType.hasHR && instSummary.qf_v > 0) {
                items.push({ system:"Ventilare", issue:"Fara recuperare caldura", recommendation:"Instalare sistem ventilare mecanica cu recuperare caldura (η>75%)", saving: instSummary.qH_nd * 0.20, priority:2 });
              }

              // Iluminat
              const pDens = parseFloat(lighting.pDensity) || 4.5;
              if (pDens > 8) items.push({ system:"Iluminat", issue:`Densitate putere ${pDens} W/m² — ridicata`, recommendation:"Înlocuire cu LED (< 4 W/m²) si senzori prezenta", saving: instSummary.qf_l * (1 - 4/pDens), priority:2 });
              else if (pDens > 5) items.push({ system:"Iluminat", issue:`Densitate putere ${pDens} W/m²`, recommendation:"Optimizare iluminat — LED si automatizare (senzori, timer)", saving: instSummary.qf_l * 0.20, priority:3 });

              // ACM
              const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
              if (acmSrc && !acmSrc.solarFraction && !solarThermal.enabled) {
                items.push({ system:"ACM", issue:"Fara sursa regenerabila pentru ACM", recommendation:"Adaugare panouri solare termice (2-4 m² per consumator)", saving: instSummary.qf_w * 0.40, priority:2 });
              }

              // Racire
              if (instSummary.hasCool) {
                const eer = parseFloat(cooling.eer) || 3.5;
                if (eer < 4.0) items.push({ system:"Răcire", issue:`EER=${eer.toFixed(1)} — sub optim`, recommendation:"Înlocuire cu sistem inverter performant (EER > 5.0)", saving: instSummary.qf_c * (1 - eer/5.0), priority:3 });
              }

              return items.sort((a, b) => a.priority - b.priority);
            })();

            // ── Recomandari regenerabile ──
            const renewRecommendations = (() => {
              const items = [];
              if (!photovoltaic.enabled && Au > 50) {
                items.push({ system:"Fotovoltaic", recommendation:`Instalare panouri PV (~${Math.min(Math.round(Au*0.3), 50)} m², ~${Math.min(Math.round(Au*0.3*0.20), 10)} kWp)`, impact:"Reducere ep 15-40%, crestere RER semnificativa", priority:1 });
              }
              if (!solarThermal.enabled && !acm.source?.includes("SOLAR")) {
                items.push({ system:"Solar termic", recommendation:`Colectoare solare pentru ACM (~${Math.max(2, Math.round((parseFloat(acm.consumers)||2)*1.5))} m²)`, impact:"Acoperire 40-60% din necesar ACM", priority:2 });
              }
              if (!heatPump.enabled && !instSummary?.isCOP) {
                items.push({ system:"Pompa de caldura", recommendation:"Pompa de caldura aer-apa (COP>4.0) pentru incalzire + ACM", impact:"Reducere consum final 50-70%, crestere RER", priority:1 });
              }
              if (!biomass.enabled && building.category?.startsWith("R")) {
                items.push({ system:"Biomasa", recommendation:"Cazan pe peleti ca sursa alternativa/backup", impact:"Sursa regenerabila locala, fP_ren=0.80", priority:3 });
              }
              if (rer < 30) {
                items.push({ system:"Obiectiv nZEB", recommendation:`RER actual=${rer.toFixed(1)}% — necesar ≥30% pentru conformitate nZEB`, impact:"Combinatie PV + pompa caldura pentru atingere prag", priority:1 });
              }
              return items.sort((a, b) => a.priority - b.priority);
            })();

            // ── Calcul scenariu reabilitat ──
            const rehabScenario = (() => {
              if (!rehabComparison || !instSummary) return null;
              const ri = rehabScenarioInputs;
              const fuel = instSummary.fuel;

              // Cost estimation based on active scenario inputs
              let costEnvelope = 0;
              if (ri.addInsulWall) {
                const wallArea = opaqueElements.filter(el => el.type === "PE").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += wallArea * (REHAB_COSTS.insulWall[parseInt(ri.insulWallThickness)] || 40);
              }
              if (ri.addInsulRoof) {
                const roofArea = opaqueElements.filter(el => el.type === "PP" || el.type === "PT").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += roofArea * (REHAB_COSTS.insulRoof[parseInt(ri.insulRoofThickness)] || 30);
              }
              if (ri.addInsulBasement) {
                const baseArea = opaqueElements.filter(el => el.type === "PB" || el.type === "PL").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += baseArea * (REHAB_COSTS.insulBasement[parseInt(ri.insulBasementThickness)] || 40);
              }
              if (ri.replaceWindows) {
                const winArea = glazingElements.reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += winArea * (REHAB_COSTS.windows[parseFloat(ri.newWindowU)] || 200);
              }

              let costInstall = 0;
              if (ri.addHR) costInstall += REHAB_COSTS["hr" + (parseInt(ri.hrEfficiency) >= 90 ? "90" : parseInt(ri.hrEfficiency) >= 80 ? "80" : "70")] || 5000;
              if (ri.addHP) costInstall += (parseFloat(heating.power) || 10) * REHAB_COSTS.hpPerKw;

              let costRenew = 0;
              if (ri.addPV) costRenew += (parseFloat(ri.pvArea) || 0) * REHAB_COSTS.pvPerM2;
              if (ri.addSolarTh) costRenew += (parseFloat(ri.solarThArea) || 0) * REHAB_COSTS.solarThPerM2;

              const totalCost = costEnvelope + costInstall + costRenew;
              const qfSaved = rehabComparison.savings.qfSaved || 0;
              // Sprint P1 (6 mai 2026) P1-06: înlocuit 0.15 EUR/kWh hardcoded global
              // (un singur factor pentru toate combustibilii) cu apel real per-combustibil
              // getEnergyPriceEUR(instSummary, building) din smart-rehab.js — folosește
              // FUEL_PRICES_EUR derivate din DEFAULT_ENERGY_PRICES (RON) prin getEurRonSync.
              const energyPriceEUR = getEnergyPriceEUR(instSummary, building) || 0.15;
              const annualCostSaving = qfSaved * energyPriceEUR;
              const payback = annualCostSaving > 0 ? totalCost / annualCostSaving : 0;

              return {
                epCurrent: rehabComparison.original.ep,
                epRehab: rehabComparison.rehab.ep,
                classCurrent: rehabComparison.original.cls,
                classRehab: rehabComparison.rehab.cls,
                co2Reduction: rehabComparison.original.co2 - rehabComparison.rehab.co2,
                qfRehab: rehabComparison.rehab.qfTotal,
                costEnvelope, costInstall, costRenew, totalCost,
                costTotal: totalCost,
                payback: Math.min(payback, 30),
              };
            })();

            const priorityColor = p => p === 1 ? "text-red-400" : p === 2 ? "text-amber-400" : "text-green-400";
            const priorityLabel = p => p === 1 ? "URGENT" : p === 2 ? "RECOMANDAT" : "OPTIONAL";
            const priorityBg = p => p === 1 ? "bg-red-500/10 border-red-500/20" : p === 2 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20";

            // ── Download All as ZIP ──────────────────────────────────────────
            const downloadAllAsZip = async () => {
              const { default: JSZip } = await import("jszip");
              const zip = new JSZip();
              const errors = [];
              let count = 0;
              const today = new Date().toISOString().slice(0, 10);
              // m-6 (7 mai 2026) — slice 30→60 pentru includerea ap./bl./sc. complet.
              const buildingSlug = (building?.address || "cladire")
                .replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);
              const cpeCode = building?.cpeCode || building?.cpeNumber
                || `CE-${new Date().getFullYear()}-${(auditor?.atestat || "00000").replace(/[^0-9]/g, "").slice(0, 5)}`;
              const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;

              showToast("⏳ Se generează pachetul complet... (poate dura 15-30 sec)", "info", 35000);

              // Sprint 8 mai 2026 — Manifest A4 SHA-256 are nevoie de blob-urile
               // REALE ale fișierelor pentru calcul hash valid (nu placeholder
              // strings). Stocăm fiecare blob într-un Map indexat după nume,
              // ca să-l putem pasa ulterior la generateManifestSHA256.
              const generatedBlobs = new Map();
              const addToZip = async (name, fn) => {
                try {
                  const result = await fn();
                  if (!result) return;
                  const blob = result instanceof Blob ? result : result.blob;
                  if (!blob) return;
                  zip.file(name, await blob.arrayBuffer());
                  generatedBlobs.set(name, blob);
                  count++;
                } catch (e) {
                  console.warn(`[ZIP] eroare la ${name}:`, e);
                  errors.push(`${name}: ${e.message}`);
                }
              };

              const slugify = (s, i) => {
                const ascii = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
                  .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
                return `m_${i}_${ascii || "masura"}`;
              };

              const buildPassportForZip = (changeReason) => {
                const measures = (smartSuggestions || []).map((s, i) => {
                  const costEur = parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0;
                  const epSav = parseFloat(s.epSaving_m2) || 0;
                  return {
                    id: slugify(s.measure, i),
                    name: s.measure || `Măsură ${i + 1}`,
                    category: s.system || "Nespecificat",
                    system: s.system || "Nespecificat",
                    cost_RON: Math.round(costEur * eurRon),
                    ep_reduction_kWh_m2: epSav,
                    co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
                    lifespan_years: s.system === "Anvelopă" ? 30 : (s.system === "Regenerabile" ? 25 : 20),
                    priority: s.priority || 3,
                  };
                });
                const phasedPlan = measures.length > 0
                  ? calcPhasedRehabPlan(measures, 50000, "balanced", epFinal || 200,
                      building?.category || "AL", parseFloat(building?.areaUseful) || 100, 0.45)
                  : null;
                const mepsTh = getMepsThresholdsFor(building?.category);
                const phasedCost = phasedPlan?.totalCost_RON || 0;
                const lcc = financialAnalysis ? Math.abs((financialAnalysis.globalCost || 0) * eurRon) : 0;
                const finSum = (phasedCost > 0 || financialAnalysis) ? {
                  totalInvest_RON: phasedCost > 0 ? phasedCost : lcc,
                  npv: financialAnalysis?.npv || phasedPlan?.summary?.npv_30y || 0,
                  irr: financialAnalysis?.irr || phasedPlan?.summary?.irr_pct || 0,
                  paybackSimple: financialAnalysis?.paybackSimple || phasedPlan?.summary?.paybackSimple_y || 0,
                  paybackDiscounted: financialAnalysis?.paybackDiscounted || phasedPlan?.summary?.paybackDiscounted_y || 0,
                  perspective: "financial",
                } : null;
                return buildRenovationPassport({
                  cpeCode: building?.cpeCode || building?.cpeNumber || null,
                  building: building || {}, instSummary: instSummary || {},
                  renewSummary: renewSummary || {}, climate: selectedClimate || {},
                  auditor: auditor || {},
                  phasedPlan: phasedPlan ? {
                    strategy: "balanced", totalYears: phasedPlan.totalYears,
                    annualBudget: 50000, energyPrice: 0.45, discountRate: 0.04,
                    phases: phasedPlan.phases, epTrajectory: phasedPlan.epTrajectory,
                    classTrajectory: phasedPlan.classTrajectory, summary: phasedPlan.summary,
                  } : null,
                  mepsStatus: { thresholds: mepsTh },
                  financialSummary: finSum,
                  changeReason,
                });
              };

              // A1 — Raport Audit Energetic (DOCX) — Mc 001-2022 §11 + Ord. 2237/2010 anexa 1
              await addToZip(`A1_raport_audit_energetic_${today}.docx`, async () => {
                const payload = {
                  building, instSummary, renewSummary, auditor,
                  opaqueElements, glazingElements, thermalBridges,
                  energyClass: enClass || { cls: "—", color: "#888" },
                  measuredConsumption: (() => { try { return JSON.parse(localStorage.getItem("zephren_measured_consumption") || "{}"); } catch { return {}; } })(),
                  systems: { heating, cooling, ventilation, lighting, acm },
                  // Sprint 8 mai 2026 — pasăm climate (lipsea → API NameError 500
                  // pe Capitolul 0 ipoteze care referă climate.get('zone')).
                  climate: selectedClimate || {},
                };
                const res = await fetch("/api/generate-document?type=audit", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("API error " + res.status);
                const { docx } = await res.json();
                const bytes = Uint8Array.from(atob(docx), c => c.charCodeAt(0));
                return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
              });

              // A2 — CPE Estimat Post-Reabilitare (PDF) — only if rehabComparison exists
              if (rehabComparison) {
                await addToZip(`A2_CPE_estimat_post_reabilitare_${today}.pdf`, async () => {
                  const { exportCpePostRehabPDF } = await import("../lib/cpe-post-rehab-pdf.js");
                  return exportCpePostRehabPDF({
                    building, auditor, rehabComparison, rehabScenarioInputs,
                    opaqueElements, glazingElements, REHAB_COSTS, instSummary,
                    cpeCodeBase: building?.cpeNumber || null, download: false,
                  });
                });
              }

              // Sprint 08may2026 — A3 Scrisoare însoțire ELIMINAT din ZIP
              // (nu este obligatoriu legal — codul CPE este pe certificat;
              //  user feedback 8 mai 2026: nu folosit în practică).

              // A4 → renumerotat A3 — FIC (PDF) — Mc 001-2022 Anexa G
              await addToZip(`A3_FIC_Mc001_2022_${today}.pdf`, async () => {
                const { generateFICPdf } = await import("../lib/dossier-extras.js");
                return generateFICPdf({
                  building, auditor, climate: selectedClimate, instSummary, opaqueElements, glazingElements,
                  energyClass: enClass?.cls,
                  owner: { name: building?.owner, type: building?.ownerType, cui: building?.ownerCUI, address: building?.address },
                  download: false,
                });
              });

              // Sprint 08may2026 — A5 Declarație conformitate ELIMINATĂ din ZIP
              // (nu există în Mc 001-2022 sau ordine MDLPA ca document obligatoriu;
              //  induce confuzie cu HG 622/2004; user feedback 8 mai 2026: nu folosită în practică).

              // Sprint 8 mai 2026 — Manifest A4 mutat la SFÂRȘITUL ZIP-ului
              // pentru a hash-ui TOATE fișierele anterioare (A1-C1). Vezi finalul
              // funcției pentru generare manifest.

              // A7 → renumerotat A5 — Plan M&V IPMVP (PDF)
              // Sprint 8 mai 2026 — UNIFIED scenario sursă: A5 folosește acum
              // `unified-rehab-costs.js` (la fel ca A2 CPE post-reab + B1 deviz)
              // în loc de smartSuggestions (heuristic). Bug-fix audit 8 mai 2026:
              // A5 raporta 8 măsuri/79.597 RON/24.903 RON/an în timp ce A2/B1
              // raportau 6 măsuri/78.381 RON/17.922 RON/an pentru același scenariu.
              await addToZip(`A5_plan_MV_IPMVP_${today}.pdf`, async () => {
                const { generateMonitoringPlanPdf } = await import("../lib/dossier-extras.js");

                let canonicalMeasures = [];
                let totalCost = 0;
                let expectedSavings = 0;

                if (rehabScenarioInputs) {
                  // Sursă canonică (același ca A2 + B1)
                  const { buildCanonicalMeasures, buildFinancialSummary } =
                    await import("../calc/unified-rehab-costs.js");
                  const cm = buildCanonicalMeasures(
                    rehabScenarioInputs, opaqueElements, glazingElements
                  );
                  canonicalMeasures = cm.map(m => ({
                    name: m.label,
                    cost_RON: m.costRON,
                  }));
                  totalCost = canonicalMeasures.reduce((s, m) => s + (m.cost_RON || 0), 0);
                  // Economie anuală via buildFinancialSummary (signature:
                  // (measures, options) - measures pozițional, opțiuni cu
                  // qfSavedKwh + energyPrice).
                  try {
                    const qfSavedKwh = rehabComparison?.savings?.qfSaved || 0;
                    const fuel = instSummary?.fuel?.id || "gaz";
                    // Preț EUR/kWh aprox (gaz 0.09, electric 0.28, termoficare 0.07)
                    const priceEUR = fuel === "electricitate" ? 0.28 :
                                     fuel === "termoficare" ? 0.07 : 0.09;
                    const fin = buildFinancialSummary(cm, {
                      eurRon,
                      qfSavedKwh,
                      energyPriceEURperKwh: priceEUR,
                    });
                    expectedSavings = fin?.annualSavingRON || 0;
                  } catch (e) {
                    console.warn("[A5] buildFinancialSummary fail:", e.message);
                    // Fallback simplu
                    if (rehabComparison?.savings?.qfSaved) {
                      const fuel = instSummary?.fuel?.id || "gaz";
                      // Sprint Audit Prețuri P2.3 — fallback canonic ANRE casnic_2025
                      // anterior hardcoded electricitate=1.40, gaz=0.45, default=0.35
                      const priceRON = getEnergyPriceFromPreset(fuel, "casnic_2025");
                      expectedSavings = (rehabComparison.savings.qfSaved || 0) * priceRON;
                    }
                  }
                } else {
                  // Fallback istoric — DOAR dacă nu există rehabScenarioInputs
                  // (ex: user a sărit Cardul Scenariu reabilitare). Marker:
                  // measures.length === 0 alertează utilizatorul în PDF.
                  console.warn("[A5] Lipsește rehabScenarioInputs — folosim smartSuggestions heuristic");
                  canonicalMeasures = (smartSuggestions || []).map(s => ({
                    name: s.measure,
                    cost_RON: Math.round((parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0) * eurRon),
                  }));
                  totalCost = canonicalMeasures.reduce((s, m) => s + (m.cost_RON || 0), 0);
                  expectedSavings = (smartSuggestions || []).reduce((s, x) => s + (parseFloat(x.epSaving_m2) || 0), 0)
                    * (parseFloat(building?.areaUseful) || 100) * 0.45;
                }

                return generateMonitoringPlanPdf({
                  building, auditor, instSummary,
                  energyClass: enClass?.cls,
                  scenario: {
                    measures: canonicalMeasures,
                    totalCost_RON: totalCost,
                    expectedSavings_RON_y: expectedSavings,
                  },
                  download: false,
                });
              });

              // B1 — Deviz estimativ (PDF) — only if rehabComparison exists
              if (rehabComparison) {
                await addToZip(`B1_deviz_estimativ_reabilitare_${today}.pdf`, async () => {
                  return generateRehabEstimatePDF({
                    building, auditor, rehabScenarioInputs, opaqueElements, glazingElements, rehabComparison, download: false,
                  });
                });
              }

              // Sprint 08may2026 — B2 Pașaport Renovare ELIMINAT din ZIP
              // (EPBD 2024/1275 NU este transpus în RO la 8.V.2026 — watermark spunea
              //  „PREVIEW fără valoare juridică". Helperele lib păstrate pentru reactivare.)
              // REACTIVARE LA TRANSPUNERE EPBD RO: decomentați blocul + buildPassportForZip.

              // Sprint 08may2026 — C1 XML MDLPA (CPE) ELIMINAT din ZIP
              // (Format intern Zephren fără destinatar real — Ord. 16/2023 NU cere XML.
              //  Va fi înlocuit complet de XML portal din Anexa MDLPA când 8.VII.2026
              //  Ord. 348/2026 Art. 4.6 devine operațional.)

              // Sprint 08may2026 — C2 XML Pașaport (EPBD) ELIMINAT din ZIP
              // (Schema oficială RO inexistentă până la transpunere act național EPBD.)

              // C3 → renumerotat C1 — Anexe DOCX
              const hasElements = (opaqueElements?.length || 0) + (glazingElements?.length || 0) + (thermalBridges?.length || 0) > 0;
              if (hasElements) {
                await addToZip(`C1_anexe_complete_${buildingSlug}_${today}.docx`, async () => {
                  const { exportFullAnnexesDOCX } = await import("../lib/element-annex-docx.js");
                  return exportFullAnnexesDOCX(
                    {
                      opaque: opaqueElements,
                      glazing: glazingElements,
                      bridges: thermalBridges,
                      systems: { heating, cooling, ventilation, lighting, acm },
                      // Sprint 8 mai 2026 — C1 versiune detaliată: pasăm date din pașii 4+5
                      // pentru bilanț energetic anual, RER, confort vară, verificare conformitate.
                      renewables: { solarThermal, photovoltaic, heatPump, biomass, otherRenew },
                      instSummary,
                      monthlyISO: instSummary?.monthlyISO || null,
                      renewSummary,
                      climate: selectedClimate || {},
                    },
                    { building, auditor, download: false }
                  );
                });
              }

              // A4 — Manifest SHA-256 (TXT) — GENERAT ULTIMUL ca să cuprindă
              // hash-uri pentru TOATE fișierele anterior generate (A1-A3, A5,
              // B1, C1). Sprint 8 mai 2026 fix audit: anterior trimitea blob-uri
              // placeholder ("cpeCode + '_audit'"), făcând manifestul invalid
              // pentru deduplicare MDLPA Art. 11 Ord. 348/2026.
              await addToZip(`A4_manifest_SHA256_${today}.txt`, async () => {
                const { generateManifestSHA256 } = await import("../lib/dossier-extras.js");
                const manifestFiles = [];
                for (const [fname, fblob] of generatedBlobs.entries()) {
                  // Excludem manifestul însuși (chicken-and-egg: nu existăm
                  // încă în Map dar suntem defensivi)
                  if (fname.startsWith("A4_manifest")) continue;
                  manifestFiles.push({ name: fname, blob: fblob });
                }
                if (manifestFiles.length === 0) {
                  console.warn("[ZIP] Manifest A4: niciun fișier anterior pentru hash");
                  return null;
                }
                const r = await generateManifestSHA256({
                  files: manifestFiles,
                  auditor, building, cpeCode, download: false,
                });
                return r?.blob;
              });

              if (count === 0) {
                showToast("Nu s-a putut genera niciun document. Verificați datele introduse.", "error", 6000);
                return;
              }

              try {
                const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(zipBlob);
                a.download = `Zephren_audit_${buildingSlug}_${today}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
                if (errors.length > 0) {
                  showToast(`✓ ZIP descărcat (${count} doc.). Atenție: ${errors.length} doc. au eșuat — ${errors.join("; ")}`, "warning", 10000);
                } else {
                  showToast(`✓ Pachet complet descărcat — ${count} documente în arhiva ZIP`, "success", 5000);
                }
              } catch (e) {
                showToast("Eroare generare ZIP: " + e.message, "error", 6000);
              }
            };

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(6)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 6</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Energy Audit — Rehabilitation Recommendations":"Audit Energetic — Recomandări de Reabilitare"}</h2>
                </div>
                <p className="text-xs opacity-40">Analiză automată și recomandări conform Mc 001-2022 pentru îmbunătățirea performanței energetice</p>
              </div>

              {(!instSummary || !Au) ? (
                <Card title={t("Date insuficiente",lang)}>
                  <div className="text-center py-8 opacity-40">
                    <div className="text-3xl mb-3">⚠️</div>
                    <div className="text-sm">Completează pașii 1–6 pentru a genera recomandări de reabilitare</div>
                    <div className="text-xs mt-2">Sunt necesare: suprafața utilă, anvelopa, instalații și calcul energetic</div>
                  </div>
                </Card>
              ) : (
              <div className="space-y-5">


                {/* ── Sumar situatie actuala ── */}
                <Card title={t("Situatia actuala — Sumar diagnostic",lang)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-black mb-1" style={{color: enClass.color}}>{enClass.cls}</div>
                      <div className="text-xs opacity-50">Clasa energetica</div>
                      <div className="text-sm font-bold mt-1">{epFinal.toFixed(1)} kWh/m²·an</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-black mb-1" style={{color: co2Class.color}}>{co2Class.cls}</div>
                      <div className="text-xs opacity-50">Clasa CO₂</div>
                      <div className="text-sm font-bold mt-1">{co2Final.toFixed(1)} kg/(m²·an)</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className={`text-2xl font-black mb-1 ${rer >= 30 ? "text-green-400" : "text-red-400"}`}>{rer.toFixed(1)}%</div>
                      <div className="text-xs opacity-50">RER (regenerabile)</div>
                      <div className="text-sm font-bold mt-1">{rer >= 30 ? "≥ 30% ✓" : "< 30% ✗"}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className={`text-2xl font-black mb-1 ${isNZEB ? "text-green-400" : "text-red-400"}`}>{isNZEB ? "DA" : "NU"}</div>
                      <div className="text-xs opacity-50">Statut nZEB</div>
                      <div className="text-sm font-bold mt-1">{isNZEB ? "Conform" : "Neconform"}</div>
                    </div>
                  </div>
                </Card>

                {/* ── Radar performanță ── */}
                {instSummary && envelopeSummary && (
                <Card title={t("Radar performanță energetică",lang)}>
                  <svg viewBox="0 0 240 220" width="240" height="200" className="mx-auto block">
                    {(() => {
                      var cx=120,cy=105,mR=80;
                      var axes=[{l:"Anvelopă",v:Math.min(100,Math.max(0,100*(1-envelopeSummary.G/2.0)))},{l:"Încălzire",v:Math.min(100,(instSummary.eta_total_h||0)*100)},{l:"ACM",v:Math.min(100,(instSummary.acmDetailed?.eta_system||0)*100)},{l:"Ventilare",v:Math.min(100,instSummary.hrEta>0?instSummary.hrEta*100:20)},{l:"Regenerabile",v:Math.min(100,(renewSummary?renewSummary.rer:0)*1.5)}];
                      var nn=axes.length, els=[];
                      [0.25,0.5,0.75,1].forEach(function(f){var pts=[];for(var i=0;i<nn;i++){var a=(i*360/nn-90)*Math.PI/180;pts.push((cx+mR*f*Math.cos(a))+","+(cy+mR*f*Math.sin(a)));}els.push(<polygon key={"g"+f} points={pts.join(" ")} fill="none" stroke="#333" strokeWidth="0.5"/>);});
                      axes.forEach(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;els.push(<line key={"a"+i} x1={cx} y1={cy} x2={cx+mR*Math.cos(a)} y2={cy+mR*Math.sin(a)} stroke="#444" strokeWidth="0.5"/>);els.push(<text key={"al"+i} x={cx+(mR+15)*Math.cos(a)} y={cy+(mR+15)*Math.sin(a)+3} textAnchor="middle" fontSize="7" fill="#888">{ax.l}</text>);});
                      var dPts=axes.map(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;var r=mR*(ax.v/100);return (cx+r*Math.cos(a))+","+(cy+r*Math.sin(a));}).join(" ");
                      els.push(<polygon key="dp" points={dPts} fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="2"/>);
                      axes.forEach(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;var r=mR*(ax.v/100);els.push(<circle key={"dc"+i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r="3" fill="#f59e0b"/>);});
                      return els;
                    })()}
                  </svg>
                </Card>
                )}

                {/* ── Recomandari Anvelopa ── */}
                {envelopeAnalysis.length > 0 && (
                <Card title={t("R1 — Recomandari Anvelopa Termica",lang)}>
                  <div className="space-y-3">
                    {envelopeAnalysis.map((el, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(el.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(el.priority)}`}>
                                {priorityLabel(el.priority)}
                              </span>
                              <span className="text-sm font-medium">{el.name}</span>
                              {el.type !== "punte" && <span className="text-xs opacity-40">({el.area.toFixed(1)} m²)</span>}
                            </div>
                            <div className="text-xs opacity-60 mb-1">{el.recommendation}</div>
                            {el.type !== "punte" && (
                              <div className="flex gap-4 text-[10px] opacity-40">
                                <span>U actual: <strong className={el.u > el.uRef ? "text-red-400" : "text-green-400"}>{el.u.toFixed(3)}</strong> W/(m²K)</span>
                                <span>U referinta: {el.uRef.toFixed(2)} W/(m²K)</span>
                                <span>Pierdere: {el.loss.toFixed(1)} W/K</span>
                              </div>
                            )}
                          </div>
                          {el.potential > 0 && (
                            <div className="text-right shrink-0">
                              <div className="text-xs opacity-40">Potential economie</div>
                              <div className="text-sm font-bold text-amber-400">{el.potential.toFixed(1)} W/K</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {envelopeAnalysis.every(e => !e.needsUpgrade) && (
                      <div className="text-center text-sm text-green-400 py-3">✓ Anvelopa termica conforma — nu sunt necesare interventii</div>
                    )}
                  </div>
                </Card>
                )}

                {/* ── Recomandari Instalatii ── */}
                <Card title={t("R2 — Recomandari Instalatii",lang)}>
                  <div className="space-y-3">
                    {installAnalysis.length > 0 ? installAnalysis.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(item.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(item.priority)}`}>
                                {priorityLabel(item.priority)}
                              </span>
                              <span className="text-sm font-medium">{item.system}</span>
                            </div>
                            <div className="text-xs opacity-60 mb-1">{item.issue}</div>
                            <div className="text-xs text-amber-400/80">→ {item.recommendation}</div>
                          </div>
                          {item.saving > 0 && (
                            <div className="text-right shrink-0">
                              <div className="text-xs opacity-40">Economie estimata</div>
                              <div className="text-sm font-bold text-green-400">{item.saving.toFixed(0)} kWh/an</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-green-400 py-3">✓ Instalațiile sunt în parametri normali</div>
                    )}
                  </div>
                </Card>

                {/* ── Recomandari Regenerabile ── */}
                {renewRecommendations.length > 0 && (
                <Card title={t("R3 — Surse Regenerabile Recomandate",lang)}>
                  <div className="space-y-3">
                    {renewRecommendations.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(item.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(item.priority)}`}>
                                {priorityLabel(item.priority)}
                              </span>
                              <span className="text-sm font-medium">{item.system}</span>
                            </div>
                            <div className="text-xs text-amber-400/80">{item.recommendation}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs opacity-40">Impact</div>
                            <div className="text-xs opacity-70">{item.impact}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                )}


                {/* ═══ NEW: SUGESTII SMART REABILITARE (E5) ═══ */}
                {smartSuggestions && smartSuggestions.length > 0 && (
                  <Card title={t("Sugestii inteligente reabilitare",lang)} badge={<Badge color="amber">{smartSuggestions.length} măsuri</Badge>}>
                    <div className="space-y-2">
                      {smartSuggestions.map((s, i) => (
                        <div key={i} className="p-3 rounded-lg border" style={{
                          background: s.priority===1 ? "rgba(239,68,68,0.03)" : s.priority===2 ? "rgba(234,179,8,0.03)" : "rgba(34,197,94,0.03)",
                          borderColor: s.priority===1 ? "rgba(239,68,68,0.15)" : s.priority===2 ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)"
                        }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold" style={{color: s.priority===1?"#ef4444":s.priority===2?"#eab308":"#22c55e"}}>
                              {s.priority===1?"🔴 URGENT":s.priority===2?"🟡 RECOMANDAT":"🟢 OPȚIONAL"}
                            </span>
                            <span className="text-xs font-medium flex-1">{s.measure}</span>
                            <Badge color={s.priority===1?"red":s.priority===2?"amber":"green"}>{s.system}</Badge>
                          </div>
                          <div className="text-[10px] opacity-50 mb-1">{s.detail}</div>
                          <div className="flex flex-wrap gap-3 text-[10px]">
                            <span className="opacity-40">Impact: <b className="text-white/70">{s.impact}</b></span>
                            <span className="opacity-40">Cost: <b className="text-white/70">{s.costEstimate}</b></span>
                            <span className="opacity-40">Recuperare: <b className="text-white/70">{s.payback}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── Prioritizare masuri ── */}
                <Card title={t("Prioritizare Masuri de Interventie",lang)}>
                  <div className="space-y-4">
                    {[1,2,3].map(prio => {
                      const allItems = [
                        ...envelopeAnalysis.filter(e => e.needsUpgrade && e.priority === prio).map(e => ({...e, cat:"Anvelopa"})),
                        ...installAnalysis.filter(e => e.priority === prio).map(e => ({...e, cat:"Instalatii", name: e.system})),
                        ...renewRecommendations.filter(e => e.priority === prio).map(e => ({...e, cat:"Regenerabile", name: e.system})),
                      ];
                      if (allItems.length === 0) return null;
                      return (
                        <div key={prio}>
                          <div className={`text-xs font-bold uppercase mb-2 ${priorityColor(prio)}`}>
                            {prio === 1 ? "🔴 Prioritate 1 — Urgente" : prio === 2 ? "🟡 Prioritate 2 — Recomandate" : "🟢 Prioritate 3 — Optionale"}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {allItems.map((item, j) => (
                              <div key={j} className="flex items-center gap-2 p-2 rounded bg-white/[0.03] text-xs">
                                <span className="opacity-40">[{item.cat}]</span>
                                <span className="font-medium">{item.name}</span>
                                <span className="opacity-30 flex-1 text-right truncate">{item.recommendation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* ── Scenariu Reabilitat — Comparatie ── */}
                {rehabScenario && (
                <Card title={t("Scenariu Reabilitare — Proiectie",lang)} className="border-amber-500/20">

                  <div className="flex gap-2 mb-4">
                    {SCENARIO_PRESETS.map(function(sp) { return (
                      <button key={sp.id} onClick={function(){ loadScenarioPreset(sp.id); }}
                        className={cn("flex-1 py-2 rounded-lg text-xs font-medium transition-all border",
                          activeScenario===sp.id ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "border-white/10 hover:bg-white/5")}>
                        {sp.label}
                      </button>
                    ); })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Comparatie clase */}
                    <div>
                      <div className="text-xs font-medium opacity-50 mb-3">Comparatie Clasa Energetica</div>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <div className="text-[10px] opacity-40 mb-1">ACTUAL</div>
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-black"
                            style={{backgroundColor: rehabScenario.classCurrent.color + "30", color: rehabScenario.classCurrent.color, border:`2px solid ${rehabScenario.classCurrent.color}`}}>
                            {rehabScenario.classCurrent.cls}
                          </div>
                          <div className="text-sm font-bold mt-1">{rehabScenario.epCurrent.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">kWh/(m²·an)</div>
                        </div>
                        <div className="text-2xl opacity-20">→</div>
                        <div className="text-center">
                          <div className="text-[10px] text-amber-400 mb-1">REABILITAT</div>
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-black"
                            style={{backgroundColor: rehabScenario.classRehab.color + "30", color: rehabScenario.classRehab.color, border:`2px solid ${rehabScenario.classRehab.color}`}}>
                            {rehabScenario.classRehab.cls}
                          </div>
                          <div className="text-sm font-bold mt-1">{rehabScenario.epRehab.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">kWh/(m²·an)</div>
                        </div>
                      </div>
                      <div className="text-center mt-3">
                        <span className="text-sm font-bold text-green-400">
                          -{((1 - rehabScenario.epRehab / Math.max(1, rehabScenario.epCurrent)) * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs opacity-40 ml-2">reducere consum energie primara</span>
                      </div>
                      <div className="text-center mt-1">
                        <span className="text-sm font-bold text-green-400">-{rehabScenario.co2Reduction.toFixed(1)} kg/(m²·an)</span>
                        <span className="text-xs opacity-40 ml-2">reducere emisii CO₂</span>
                      </div>

                      {/* Grafic comparativ */}
                      <svg viewBox="0 0 280 80" width="100%" height="70" className="mt-3">
                        {(() => {
                          var epO = rehabScenario.epCurrent, epN = rehabScenario.epRehab, mx = Math.max(epO, epN, 1);
                          return (<g>
                            <text x="0" y="15" fontSize="7" fill="#888">Actual</text>
                            <rect x="50" y="6" width={Math.max(2,epO/mx*200)} height="16" fill={rehabScenario.classCurrent.color} rx="2" opacity="0.8"/>
                            <text x={53+epO/mx*200} y="18" fontSize="7" fill="#ccc">{epO.toFixed(0)}</text>
                            <text x="0" y="42" fontSize="7" fill="#f59e0b">Reabilitat</text>
                            <rect x="50" y="33" width={Math.max(2,epN/mx*200)} height="16" fill={rehabScenario.classRehab.color} rx="2" opacity="0.8"/>
                            <text x={53+epN/mx*200} y="45" fontSize="7" fill="#ccc">{epN.toFixed(0)}</text>
                            <rect x={50+epN/mx*200} y="33" width={Math.max(0,(epO-epN)/mx*200)} height="16" fill="#22c55e" rx="2" opacity="0.12"/>
                            <text x="140" y="68" textAnchor="middle" fontSize="7" fill="#22c55e">Economie: {Math.max(0,epO-epN).toFixed(0)} kWh/(m2a)</text>
                          </g>);
                        })()}
                      </svg>

                    </div>

                    {/* Estimare costuri */}
                    <div>
                      <div className="text-xs font-medium opacity-50 mb-3">Estimare Costuri Orientative</div>
                      <div className="space-y-2">
                        {rehabScenario.costEnvelope > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">🏗️ Anvelopa (termoizolare + tamplarie)</span>
                            <span className="text-sm font-bold">{(rehabScenario.costEnvelope).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        {rehabScenario.costInstall > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">⚙️ Instalatii (modernizare)</span>
                            <span className="text-sm font-bold">{(rehabScenario.costInstall).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        {rehabScenario.costRenew > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">☀️ Surse regenerabile</span>
                            <span className="text-sm font-bold">{(rehabScenario.costRenew).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-sm font-medium">TOTAL ESTIMAT</span>
                          <span className="text-lg font-black text-amber-400">{(rehabScenario.totalCost).toLocaleString("ro-RO")} €</span>
                        </div>
                        {rehabScenario.payback > 0 && rehabScenario.payback < 30 && (
                          <div className="text-center text-xs opacity-40 mt-1">
                            Durata estimata recuperare investitie: ~{rehabScenario.payback.toFixed(0)} ani
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-2 rounded bg-white/[0.02] text-[10px] opacity-30">
                        * Costurile sunt estimative orientative si pot varia semnificativ in functie de piata locala, specificul cladirii si solutiile tehnice alese. Se recomanda obtinerea de oferte de pret de la furnizori.
                      </div>
                    </div>
                  </div>
                </Card>
                )}

                {/* ═══ COMPARAȚIE MULTI-SCENARIU — Sprint P0-C P0-05 marker explicit ═══
                    Tabelul afișează măsurile per scenariu DIN preset-uri canonice
                    (data/rehab-scenarios.js — 5/10/15cm pereți). Pentru EP recalculat
                    rigoros per scenariu, auditorul trebuie să încarce preset-ul în
                    Pas 5 (loadScenarioPreset) și să recalculeze prin motorul de
                    instalații. Acest tabel e DOAR comparativ măsuri, nu rezultate. */}
                <Card title={t("Comparație scenarii reabilitare",lang)} badge={<Badge color="purple">{multiScenarios.length} scenarii</Badge>}>
                  <div className="mb-2 px-2 py-1.5 rounded-md bg-amber-500/10 border-l-2 border-amber-500/40 text-[10px] text-amber-300/80">
                    ⚠️ Comparație măsuri (preset). Pentru EP recalculat rigoros per scenariu,
                    încarcă preset-ul în Pas 5 și recalculează bilanțul energetic.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-1 opacity-40">Măsură</th>
                          {multiScenarios.map(s => <th key={s.id} className="text-center py-2 px-2 font-bold">{s.name}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label:"Izolație pereți", key:"addInsulWall", detail:s=>s.insulWallThickness+"cm" },
                          { label:"Izolație acoperiș", key:"addInsulRoof", detail:s=>s.insulRoofThickness+"cm" },
                          { label:"Înlocuire ferestre", key:"replaceWindows", detail:s=>"U="+s.newWindowU },
                          { label:"Panouri PV", key:"addPV", detail:s=>s.pvArea+" m²" },
                          { label:"Pompă căldură", key:"addHP", detail:s=>"COP "+s.hpCOP },
                          { label:"Ventilare HR", key:"addHR", detail:s=>"η="+s.hrEfficiency+"%" },
                        ].map(row => (
                          <tr key={row.key} className="border-b border-white/5">
                            <td className="py-1.5 px-1 opacity-50">{row.label}</td>
                            {multiScenarios.map(s => (
                              <td key={s.id} className="text-center py-1.5 px-2">
                                {s[row.key] ? <span className="text-emerald-400">✓ {row.detail(s)}</span> : <span className="opacity-20">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] opacity-20 mt-2 text-center">Scenariile sunt orientative. Consultați un auditor atestat pentru analiza detaliată.</div>
                </Card>

                {/* ── Analiză cost-optimă rapidă ──
                    Mutat din Pas 6 → Pas 7 (1 mai 2026): costul anual €/an + recomandările
                    de remediere (PV m², termoizolare anvelopă) sunt parte din auditul energetic,
                    nu din emiterea CPE. Cuplată cu CostOptimalCurve detaliată mai jos.
                    Sprint P2 (6 mai 2026) — toggle „🌐 Spot live (Eurostat)" pentru preț
                    electricitate actualizat semestrial (fallback ANRE casnic 2025 static). */}
                {instSummary && renewSummary && (() => {
                  const [useLivePrices, setUseLivePrices] = React.useState(false);
                  const [liveStatus, setLiveStatus] = React.useState({ source: "ANRE casnic 2025 (preset static)", isLive: false });
                  const [refreshingLive, setRefreshingLive] = React.useState(false);
                  const [userOverride, setUserOverrideState] = React.useState(getUserElectricityPriceOverride());

                  React.useEffect(() => {
                    if (!useLivePrices) return;
                    setRefreshingLive(true);
                    refreshEurostatCache().then(r => {
                      const fuelId = instSummary.fuel?.id || "electricitate";
                      const result = getEnergyPriceLiveOrFallback(fuelId);
                      setLiveStatus(result);
                      setRefreshingLive(false);
                    }).catch(() => setRefreshingLive(false));
                  }, [useLivePrices, instSummary.fuel?.id]);

                  return (
                  <Card title={t("Analiză cost-optimă rapidă",lang)} className="border-blue-500/20">
                    {/* Sprint P2 — Toggle preț spot live + override manual */}
                    <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useLivePrices}
                            onChange={(e) => setUseLivePrices(e.target.checked)}
                            className="w-4 h-4 rounded border-blue-500/40 bg-blue-500/10"
                          />
                          <span>🌐 Folosește preț electricitate live (Eurostat semestrial)</span>
                        </label>
                        {refreshingLive && <span className="text-[10px] opacity-60">Se actualizează…</span>}
                      </div>
                      {useLivePrices && (
                        <div className="text-[10px] opacity-70 pl-6">
                          {liveStatus.isLive
                            ? <>✅ Sursă: <strong>{liveStatus.source}</strong> · Preț: <strong>{liveStatus.priceRON} RON/kWh</strong></>
                            : <>⚠️ Spot indisponibil — fallback la <strong>{liveStatus.source}</strong></>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pl-6 text-[10px]">
                        <span className="opacity-60">Override manual:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.05"
                          max="5"
                          placeholder="ex. 1.30"
                          defaultValue={userOverride || ""}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (v > 0) {
                              setUserElectricityPriceOverride(v);
                              setUserOverrideState(v);
                            }
                          }}
                          className="w-20 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs"
                        />
                        <span className="opacity-60">RON/kWh (sesiune curentă)</span>
                      </div>
                      <div className="text-[10px] text-amber-400/80 pl-6 italic">
                        ⚠️ Preț live DOAR pentru analiză orientativă. CPE oficial folosește preț ANRE Q4 reglementat.
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        // Sprint P1 P1-01 + P1-08 + Sprint P2: cost canonic ANRE +
                        // override Eurostat live (electricitate doar) + override user.
                        const fuelId = instSummary.fuel?.id || "default";
                        let costKwhRON;
                        let priceSource = "ANRE casnic 2025 static";
                        if (userOverride && fuelId === "electricitate") {
                          costKwhRON = userOverride;
                          priceSource = `Override manual user (${userOverride} RON/kWh)`;
                        } else if (useLivePrices && fuelId === "electricitate" && liveStatus.isLive) {
                          costKwhRON = liveStatus.priceRON;
                          priceSource = liveStatus.source;
                        } else {
                          costKwhRON = getEnergyPriceFromPreset(fuelId, "casnic_2025");
                        }
                        const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                        const totalKwh = instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l;
                        const annCost = (totalKwh * costKwhRON) / eurRon;
                        const epF = renewSummary.ep_adjusted_m2;
                        const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                        const gap = Math.max(0, epF - getNzebEpMax(building.category, selectedClimate?.zone));
                        const rerGap = Math.max(0, nzeb.rer_min - renewSummary.rer);
                        return (<>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded bg-white/[0.03]">
                              <div className="text-lg font-bold">{annCost.toFixed(0)} €</div>
                              <div className="text-[10px] opacity-40">Cost energie/an</div>
                            </div>
                            <div className="p-2 rounded bg-white/[0.03]">
                              <div className="text-lg font-bold">{epF.toFixed(0)}</div>
                              <div className="text-[10px] opacity-40">Ep [kWh/m²a]</div>
                            </div>
                            <div className="p-2 rounded bg-white/[0.03]">
                              <div className="text-lg font-bold">{renewSummary.co2_adjusted_m2.toFixed(1)}</div>
                              <div className="text-[10px] opacity-40">CO₂ [kg/m²a]</div>
                            </div>
                          </div>
                          {gap > 0 && (
                            <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                              ⚠ Depășire prag nZEB cu <strong>{gap.toFixed(0)} kWh/m²a</strong>.
                              Prioritate: termoizolarea anvelopei + pompa de căldură.
                            </div>
                          )}
                          {rerGap > 0 && (
                            <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                              ⚠ RER insuficient: mai sunt necesare <strong>{rerGap.toFixed(0)}%</strong> surse regenerabile.
                              Soluție: PV {(rerGap*Au*epF/100/350).toFixed(0)} m² panouri.
                            </div>
                          )}
                          {gap <= 0 && rerGap <= 0 && (
                            <div className="text-[10px] text-emerald-400/80 bg-emerald-500/5 rounded p-2">
                              ✓ Clădirea îndeplinește pragurile nZEB. Economie față de clasă G: ~{Math.round(annCost * 0.6)} €/an.
                            </div>
                          )}
                          <div className="text-[9px] opacity-30 pt-1 italic">
                            Preț folosit: {priceSource} · Curs EUR/RON: {eurRon.toFixed(4)} (BNR live)
                          </div>
                        </>);
                      })()}
                    </div>
                  </Card>
                  );
                })()}

                {/* ── Analiză amortizare investiție 20 ani ──
                    Sprint Pas 7 docs follow-up (6 mai 2026) — refactor major:
                    grafic mărit (viewBox 800×420), Y-axis cu 5 etichete EUR,
                    gridlines orizontale, 2 linii (cash flow verde + NPV albastru),
                    linie verticală payback distinctă, etichete cantitative
                    pe fiecare punct cheie, legendă mare cu IRR + ROI 20 ani. */}
                {rehabScenario && instSummary && (() => {
                  const costTotal = rehabScenario.costTotal || 30000;
                  const annualSaving = Math.max(100,
                    (instSummary.qf_total - (rehabScenario.qfRehab || instSummary.qf_total * 0.6)) * 0.15
                  );
                  const discountRate = 0.04; // Reg. UE 2025/2273 financial private
                  const energyInflation = 0.03; // Aliniat cu Sprint 26 P1.6
                  const years = 20;

                  const data = [];
                  let cumCash = -costTotal;
                  let cumNPV = -costTotal;
                  let paybackYear = null;
                  let paybackYearNPV = null;
                  for (let y = 0; y <= years; y++) {
                    const saving = y === 0 ? 0 : annualSaving * Math.pow(1 + energyInflation, y - 1);
                    cumCash += saving;
                    cumNPV += y === 0 ? 0 : saving / Math.pow(1 + discountRate, y);
                    data.push({ y, cumCash, cumNPV, annualSaving: saving });
                    if (paybackYear === null && y > 0 && cumCash >= 0) paybackYear = y;
                    if (paybackYearNPV === null && y > 0 && cumNPV >= 0) paybackYearNPV = y;
                  }
                  // Interpolare lineară mai precisă pentru payback
                  if (paybackYear !== null && paybackYear > 0) {
                    const prev = data[paybackYear - 1];
                    const curr = data[paybackYear];
                    if (prev.cumCash < 0) {
                      const frac = -prev.cumCash / (curr.cumCash - prev.cumCash);
                      paybackYear = paybackYear - 1 + frac;
                    }
                  }

                  const totalReturn = data[years].cumCash;
                  const npv20 = data[years].cumNPV;
                  const roiPct = costTotal > 0 ? (totalReturn / costTotal) * 100 : 0;
                  // IRR aproximare prin scanare
                  let irr = 0;
                  for (let r = 0.01; r <= 0.50; r += 0.005) {
                    let npv = -costTotal;
                    for (let y = 1; y <= years; y++) {
                      npv += (annualSaving * Math.pow(1 + energyInflation, y - 1)) / Math.pow(1 + r, y);
                    }
                    if (npv >= 0) { irr = r; break; }
                  }

                  // Plot dimensiuni: viewBox 800×420 (mărit ~3× față de 400×160)
                  const W = 800, H = 420;
                  const padL = 70, padR = 30, padT = 60, padB = 50;
                  const cW = W - padL - padR;
                  const cH = H - padT - padB;

                  const minV = Math.min(...data.map(d => Math.min(d.cumCash, d.cumNPV)));
                  const maxV = Math.max(...data.map(d => Math.max(d.cumCash, d.cumNPV)));
                  const range = Math.max(maxV - minV, 1);

                  const xAt = (y) => padL + (y / years) * cW;
                  const yAt = (v) => padT + cH - ((v - minV) / range) * cH;
                  const zeroY = yAt(0);

                  // Y-axis ticks (5 valori)
                  const yTicks = [];
                  for (let i = 0; i <= 4; i++) {
                    const v = minV + (range * i / 4);
                    yTicks.push(v);
                  }

                  return (
                  <Card title={lang === "EN" ? "20-Year Investment Amortization" : "Amortizare investiție 20 ani"}
                        className="border-emerald-500/30">
                    {/* Sumar metrici (deasupra graficului) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-[10px] opacity-50 mb-1">INVESTIȚIE</div>
                        <div className="text-lg font-bold text-amber-400">{costTotal.toLocaleString("ro-RO")} €</div>
                        <div className="text-[10px] opacity-40">cost lucrări (fără TVA)</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-[10px] opacity-50 mb-1">ECONOMIE/AN</div>
                        <div className="text-lg font-bold text-emerald-400">{annualSaving.toFixed(0)} €/an</div>
                        <div className="text-[10px] opacity-40">la prețuri 2025 (+3%/an)</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-[10px] opacity-50 mb-1">PAYBACK SIMPLU</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {paybackYear !== null ? `${paybackYear.toFixed(1)} ani` : "> 20 ani"}
                        </div>
                        <div className="text-[10px] opacity-40">
                          {paybackYear !== null && paybackYear < 5 ? "⚠ Verifică costul" : "fără actualizare"}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                        <div className="text-[10px] opacity-50 mb-1">IRR (rata internă)</div>
                        <div className="text-lg font-bold text-blue-400">{(irr * 100).toFixed(1)}%</div>
                        <div className="text-[10px] opacity-40">ROI 20 ani: {roiPct.toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* Graficul mare */}
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minHeight: 320 }}>
                      {/* Background gradient */}
                      <defs>
                        <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Title in chart */}
                      <text x={W / 2} y={20} textAnchor="middle" fontSize="14" fill="#e5e7eb" fontWeight="bold">
                        Flux numerar cumulat — investiție vs. economii
                      </text>
                      <text x={W / 2} y={40} textAnchor="middle" fontSize="11" fill="#94a3b8">
                        Ipoteze: inflație energie {(energyInflation * 100).toFixed(0)}%/an · rată actualizare NPV {(discountRate * 100).toFixed(0)}%/an
                      </text>

                      {/* Y-axis gridlines + labels */}
                      {yTicks.map((v, i) => (
                        <g key={`y${i}`}>
                          <line x1={padL} y1={yAt(v)} x2={padL + cW} y2={yAt(v)}
                                stroke="#374151" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                          <text x={padL - 8} y={yAt(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                            {(v / 1000).toFixed(1)}k €
                          </text>
                        </g>
                      ))}

                      {/* X-axis gridlines (la fiecare 5 ani) */}
                      {[0, 5, 10, 15, 20].map(yr => (
                        <g key={`x${yr}`}>
                          <line x1={xAt(yr)} y1={padT} x2={xAt(yr)} y2={padT + cH}
                                stroke="#374151" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
                          <text x={xAt(yr)} y={padT + cH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">
                            An {yr}
                          </text>
                        </g>
                      ))}

                      {/* Zero line — prag de amortizare */}
                      <line x1={padL} y1={zeroY} x2={padL + cW} y2={zeroY}
                            stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" />
                      <text x={padL + cW - 4} y={zeroY - 5} textAnchor="end" fontSize="10" fill="#f97316" fontWeight="bold">
                        Prag amortizare 0 €
                      </text>

                      {/* Area sub curba cash flow (verde) */}
                      {(() => {
                        const pts = data.map(d => `${xAt(d.y)},${yAt(d.cumCash)}`).join(" ");
                        return (
                          <polygon
                            points={`${padL},${zeroY} ${pts} ${padL + cW},${zeroY}`}
                            fill="url(#cashGrad)"
                          />
                        );
                      })()}

                      {/* Linie cash flow (verde, groasă) */}
                      <polyline
                        points={data.map(d => `${xAt(d.y)},${yAt(d.cumCash)}`).join(" ")}
                        fill="none" stroke="#22c55e" strokeWidth="3"
                      />

                      {/* Linie NPV (albastră, întreruptă) */}
                      <polyline
                        points={data.map(d => `${xAt(d.y)},${yAt(d.cumNPV)}`).join(" ")}
                        fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 4"
                      />

                      {/* Puncte la fiecare 5 ani pe linia verde */}
                      {[0, 5, 10, 15, 20].map(yr => (
                        <g key={`pt${yr}`}>
                          <circle cx={xAt(yr)} cy={yAt(data[yr].cumCash)} r="4" fill="#22c55e" stroke="#0a0a0a" strokeWidth="1.5" />
                          <text x={xAt(yr)} y={yAt(data[yr].cumCash) - 10} textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="bold">
                            {Math.round(data[yr].cumCash / 1000)}k
                          </text>
                        </g>
                      ))}

                      {/* Payback marker — linie verticală + cerc + text */}
                      {paybackYear !== null && paybackYear <= years && (
                        <g>
                          <line x1={xAt(paybackYear)} y1={padT} x2={xAt(paybackYear)} y2={padT + cH}
                                stroke="#fbbf24" strokeWidth="2" />
                          <circle cx={xAt(paybackYear)} cy={zeroY} r="6" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="2" />
                          <rect x={xAt(paybackYear) - 38} y={padT + 4} width="76" height="22" rx="4"
                                fill="#fbbf24" />
                          <text x={xAt(paybackYear)} y={padT + 18} textAnchor="middle" fontSize="11" fill="#000" fontWeight="bold">
                            PAYBACK
                          </text>
                          <text x={xAt(paybackYear)} y={padT + 32} textAnchor="middle" fontSize="11" fill="#fbbf24" fontWeight="bold">
                            An {paybackYear.toFixed(1)}
                          </text>
                        </g>
                      )}

                      {/* Legendă jos */}
                      <g transform={`translate(${padL}, ${H - 20})`}>
                        <rect x="0" y="-4" width="20" height="3" fill="#22c55e" />
                        <text x="26" y="0" fontSize="11" fill="#22c55e" fontWeight="bold">Flux numerar cumulat (nominal)</text>
                        <line x1="240" y1="-2" x2="260" y2="-2" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 4" />
                        <text x="266" y="0" fontSize="11" fill="#3b82f6" fontWeight="bold">Flux actualizat (NPV @ {(discountRate * 100).toFixed(0)}%)</text>
                        <line x1="500" y1="-2" x2="520" y2="-2" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" />
                        <text x="526" y="0" fontSize="11" fill="#f97316" fontWeight="bold">Prag amortizare 0 €</text>
                      </g>
                    </svg>

                    {/* Detalii payback + total return jos */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                        <div className="text-emerald-300 font-bold mb-1">📈 Total câștig 20 ani</div>
                        <div className="text-base font-bold text-emerald-400">
                          {totalReturn > 0 ? "+" : ""}{Math.round(totalReturn).toLocaleString("ro-RO")} €
                        </div>
                        <div className="text-[10px] opacity-50 mt-1">
                          ROI total: {roiPct.toFixed(0)}% peste investiția inițială
                        </div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="text-blue-300 font-bold mb-1">💰 NPV 20 ani (actualizat)</div>
                        <div className="text-base font-bold text-blue-400">
                          {npv20 > 0 ? "+" : ""}{Math.round(npv20).toLocaleString("ro-RO")} €
                        </div>
                        <div className="text-[10px] opacity-50 mt-1">
                          Payback NPV: {paybackYearNPV !== null ? `${paybackYearNPV} ani` : "> 20 ani"}
                        </div>
                      </div>
                      <div className={`${paybackYear !== null && paybackYear < 5 ? "bg-amber-500/15 border-amber-500/40" : "bg-white/5 border-white/10"} border rounded-lg p-3`}>
                        <div className={`${paybackYear !== null && paybackYear < 5 ? "text-amber-300" : "text-slate-300"} font-bold mb-1`}>
                          {paybackYear !== null && paybackYear < 5 ? "⚠ Atenție validare" : "ℹ️ Validare cost"}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {paybackYear !== null && paybackYear < 5
                            ? "Payback < 5 ani e neobișnuit. Verifică costurile reale în Devizul detaliat."
                            : "Costul afișat e estimat. Devizul detaliat (PDF) folosește aceleași REHAB_COSTS."}
                        </div>
                      </div>
                    </div>
                  </Card>
                  );
                })()}

                {/* ── ANALIZĂ FINANCIARĂ EN 15459-1 ── */}
                {financialAnalysis && (
                  <Card title="Analiză financiară reabilitare (EN 15459-1)" className="border-emerald-500/20">
                    {/* KPI boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono" style={{ color: financialAnalysis.npv >= 0 ? "#22c55e" : "#ef4444" }}>
                          {financialAnalysis.npv.toLocaleString("ro-RO")}
                        </div>
                        <div className="text-[10px] opacity-40">VAN [EUR]</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono" style={{ color: "#22c55e" }}>
                          {financialAnalysis.investCost > 0 ? (financialAnalysis.annualSaving / financialAnalysis.investCost * 100).toFixed(1) + "%" : "—"}
                        </div>
                        <div className="text-[10px] opacity-40">ROI [%/an]</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono">
                          {financialAnalysis.paybackSimple !== null ? financialAnalysis.paybackSimple.toFixed(1) : "—"}
                        </div>
                        <div className="text-[10px] opacity-40">Perioadă recuperare [ani]</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono">
                          {financialAnalysis.irr !== null ? financialAnalysis.irr.toFixed(1) + "%" : "N/A"}
                        </div>
                        <div className="text-[10px] opacity-40">RIR (IRR)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono">
                          {financialAnalysis.paybackDiscounted !== null ? Number(financialAnalysis.paybackDiscounted).toFixed(1) : "—"}
                        </div>
                        <div className="text-[10px] opacity-40">Recuperare actualizată [ani]</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-lg font-bold font-mono">{financialAnalysis.bcRatio.toFixed(2)}</div>
                        <div className="text-[10px] opacity-40">Raport B/C</div>
                      </div>
                    </div>
                    {/* Summary row */}
                    <div className="flex flex-wrap gap-4 text-xs mb-4">
                      <div className="flex items-center gap-2">
                        <span className="opacity-40">Investiție:</span>
                        <span className="font-mono font-semibold">{financialAnalysis.investCost.toLocaleString("ro-RO")} EUR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="opacity-40">Economie anuală:</span>
                        <span className="font-mono font-semibold text-emerald-400">{financialAnalysis.annualSaving.toLocaleString("ro-RO")} EUR/an</span>
                      </div>
                    </div>
                    {/* Cashflow chart */}
                    {financialAnalysis.cumulativeCF && (
                      <div className="mb-4">
                        <div className="text-[10px] opacity-30 mb-2">Cashflow cumulat actualizat (perioada {finAnalysisInputs.period || 30} ani)</div>
                        <div className="flex items-end gap-px h-28 bg-white/[0.02] rounded-lg p-2">
                          {financialAnalysis.cumulativeCF.map((v, i) => {
                            const maxAbs = Math.max(...financialAnalysis.cumulativeCF.map(Math.abs), 1);
                            const pct = Math.abs(v) / maxAbs * 100;
                            const isPos = v >= 0;
                            return (
                              <div key={i} className="flex-1 flex flex-col justify-end h-full relative" title={`An ${i}: ${v.toLocaleString("ro-RO")} EUR`}>
                                {isPos ? (
                                  <div className="w-full rounded-t" style={{ height: `${pct * 0.45}%`, backgroundColor: "#22c55e", minHeight: pct > 0 ? "1px" : "0" }} />
                                ) : (
                                  <div className="w-full rounded-b mt-auto" style={{ height: `${pct * 0.45}%`, backgroundColor: "#ef4444", minHeight: pct > 0 ? "1px" : "0" }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] opacity-25 mt-1 px-1">
                          <span>An 0</span>
                          <span>An {financialAnalysis.cumulativeCF.length - 1}</span>
                        </div>
                      </div>
                    )}
                    {/* Verdict */}
                    <div className="flex items-center justify-between">
                      <Badge color={financialAnalysis.verdict === "PROFITABIL" ? "green" : "red"}>
                        {financialAnalysis.verdict}
                      </Badge>
                      <span className="text-[10px] opacity-30">Cost global EN 15459: {financialAnalysis.globalCost.toLocaleString("ro-RO")} EUR</span>
                    </div>
                    {/* Financial inputs */}
                    <details className="mt-4">
                      <summary className="text-[10px] opacity-30 cursor-pointer hover:opacity-50">Parametri analiză financiară</summary>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <Input label="Rată actualizare (%)" type="number" value={finAnalysisInputs.discountRate} onChange={v => setFinAnalysisInputs(p => ({...p, discountRate: v}))} />
                        <Input label="Escaladare (%/an)" type="number" value={finAnalysisInputs.escalation} onChange={v => setFinAnalysisInputs(p => ({...p, escalation: v}))} />
                        <Input label="Perioadă (ani)" type="number" value={finAnalysisInputs.period} onChange={v => setFinAnalysisInputs(p => ({...p, period: v}))} />
                        <Input label="Mentenanță (EUR/an)" type="number" value={finAnalysisInputs.annualMaint} onChange={v => setFinAnalysisInputs(p => ({...p, annualMaint: v}))} />
                      </div>
                    </details>
                  </Card>
                )}

                {/* ── Nota finala ── */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-xs font-medium opacity-50 mb-2">Nota privind auditul energetic</div>
                  <div className="text-[10px] opacity-35 space-y-1.5">
                    <div>Acest raport de audit este generat automat pe baza datelor introduse si serveste ca instrument orientativ de predimensionare. Nu inlocuieste auditul energetic detaliat realizat de un auditor energetic atestat MDLPA conform Legii 372/2005 modificata prin Legea 238/2024. Factori de conversie conform Mc 001-2022 (Ordinul MDLPA 16/2023) — document normativ obligatoriu: fP electricitate=2.62, fCO2 electricitate=0.107, fP energie ambientală (aerotermală/geotermală/hidrotermală)=1.00 (Tabelul 5.17). Adresa MDLPA nr. 50843/09.03.2026 confirmă că valoarea 0.00 din Anexa Națională SR EN ISO 52000-1:2017/NA:2023 este eronată și urmează a fi corectată.</div>
                    <div>Recomandari bazate pe: Mc 001-2022 (Ordinul MDLPA 16/2023), C107/2005, SR EN ISO 13790, SR EN ISO 52016-1:2017/NA:2023, SR EN 12831-1:2017/NA:2022 (+C91:2024), SR EN 16798-1:2019/NA:2019, Directiva UE 2024/1275 (EPBD IV), Legea 238/2024, si valorile de referinta din normativele romanesti.</div>
                    <div>Costurile orientative sunt estimate la nivelul anului 2025 si nu includ TVA, proiectare, avize sau alte costuri conexe.</div>
                    <div>Directiva UE 2024/1275 (EPBD IV, termen transpunere mai 2026) va introduce: clădiri cu emisii zero (ZEB) obligatoriu din 2028/2030, scală armonizată A-G (fără A+), pașaport renovare, jurnal digital al clădirii, și standarde minime de performanță energetică (MEPS).</div>
                  </div>
                </div>
              </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  CARD CENTRAL — GENERARE DOCUMENTE PAS 7 (6 mai 2026)
                  Toate butoanele de export într-un singur loc, grupate logic:
                    A. Documente OFICIALE pentru client (Raport Audit Energetic + CPE estimat)
                    B. Documente CLIENT orientative (Deviz + Pașaport renovare)
                    C. Date tehnice export (XML MDLPA + Excel + PDF tehnic + anexe)
                  Pașaportul de Renovare e mutat aici din locul vechi (era jos, izolat).
              ═══════════════════════════════════════════════════════════════ */}
              {/* ── IEQ — Calitate aer interior ── */}
              <Card title="IEQ — Calitate aer interior (EN 16798-1/NA:2019)" className="mb-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {IEQ_CATEGORIES.map(cat => (
                    <div key={cat.id} className={`rounded-lg p-2 border ${cat.id === "II" ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                      <div className="text-sm font-bold">{cat.id}</div>
                      <div className="text-[10px] opacity-40">{cat.tempRange}</div>
                      <div className="text-[10px] opacity-40">CO₂ ≤{cat.co2Max} ppm</div>
                      <div className="text-[10px] opacity-40">{cat.lux} lux</div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] opacity-30 mt-2">Categoria II (normală) este cerința minimă conform SR EN 16798-1:2019/NA:2019</div>
              </Card>

              {/* ── CHP — Cogenerare ── */}
              <Card title="Cogenerare (CHP) — producție combinată căldură + electricitate" className="mb-4">
                <div className="space-y-1.5">
                  {CHP_TYPES.map(chp => (
                    <div key={chp.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                      <span>{chp.label}</span>
                      <span className="font-mono opacity-60">η_el={chp.eta_el} η_th={chp.eta_th}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] opacity-30 mt-2">Disponibil pentru clădiri cu consum termic {">"} 100 MWh/an</div>
              </Card>

              {/* ── MCCL — Catalog ponți termice extins ── */}
              <Card title={`MCCL — Catalog ponți termice (${MCCL_CATALOG.length} tipuri)`} className="mb-4">
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {[...new Set(MCCL_CATALOG.map(m => m.cat))].map(cat => (
                    <div key={cat}>
                      <div className="text-[10px] font-bold opacity-40 mt-2 mb-1">{cat}</div>
                      {MCCL_CATALOG.filter(m => m.cat === cat).map(m => (
                        <div key={m.id} className="flex items-center justify-between text-[10px] py-0.5 px-2 rounded hover:bg-white/5 cursor-pointer" onClick={() => {
                          setThermalBridges(prev => [...prev, { name: m.desc, psi: String(m.psi), length: "1" }]);
                          showToast("Adăugat: " + m.desc, "success");
                        }}>
                          <span className="opacity-60">{m.desc}</span>
                          <span className="font-mono">Ψ={m.psi} / {m.psi_izolat}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] opacity-30 mt-2">Click pe un tip pentru a-l adăuga la lista de punți termice</div>
              </Card>

              {/* ── Fotografii clădire + adnotări ── */}
              <Card title="📷 Fotografii clădire — documentare și adnotări" className="mb-4">
                <BuildingPhotos
                  buildingPhotos={buildingPhotos}
                  setBuildingPhotos={setBuildingPhotos}
                  showToast={showToast}
                  cn={cn}
                />
              </Card>

              {/* ── Pașaport de Renovare — Foaie de parcurs etapizată (EPBD Art. 12 + Anexa VIII) ──
                  Sprint 08may2026 (followup 3) — DEZACTIVAT prin `false && ...`
                  Motiv consistență: card-ul afișa banner „PREVIEW EPBD 2024 — fără valoare
                  juridică în RO până la actul național de transpunere" (termen 29.05.2026).
                  Aceeași logică ca butoanele Pașaport eliminate anterior (commit-uri db089d2 + b367618):
                  tot ce nu e impus de norma în vigoare la 8.V.2026 → eliminat, reactivare la transpunere.
                  Conține: banner ținte 2030/2035, Card cu Faze/Durată/Investiție/Clasă finală,
                  buton „Export DOCX Foaie de Parcurs" — toate dependente de Pașaport EPBD.
                  REACTIVARE LA TRANSPUNERE EPBD RO: schimbă `false &&` în nimic.
                  Helper-ul calcPhasedRehabPlan rămâne în repo. */}
              {false && instSummary && (() => {
                // Sprint 06may2026 audit P1 (B4) — UNIFICARE 3 SURSE COST.
                // Prioritate: rehabScenarioInputs (Pas 5 user) > smartSuggestions (Pas 7 auto).
                // Aliniere cu Deviz + CPE post-rehab care folosesc rehabScenarioInputs.
                const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                const slugifyCard = (s, i) => {
                  const ascii = String(s || "")
                    .normalize("NFD").replace(/[̀-ͯ]/g, "")
                    .replace(/[^a-zA-Z0-9]+/g, "_")
                    .replace(/^_+|_+$/g, "")
                    .toLowerCase();
                  return `m_${i}_${ascii || "masura"}`;
                };
                const ri = rehabScenarioInputs || {};
                const hasRehabInputs = ri.addInsulWall || ri.addInsulRoof ||
                  ri.replaceWindows || ri.replaceHeating || ri.addPV ||
                  ri.addSolarThermal || ri.addHRV || ri.addLED;
                let measures = [];
                if (hasRehabInputs) {
                  const wallA = (opaqueElements || []).filter(e => e.type === "PE")
                    .reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
                  const roofA = (opaqueElements || []).filter(e => e.type === "PP" || e.type === "PT")
                    .reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
                  const glazA = (glazingElements || [])
                    .reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
                  const Au = parseFloat(building?.areaUseful) || 100;
                  const epBase = parseFloat(epFinal) || 200;
                  let id = 0;
                  const push = (name, cat, costEur, epSav, life, prio) => measures.push({
                    id: slugifyCard(name, id++),
                    name, category: cat, system: cat,
                    cost_RON: Math.round(costEur * eurRon),
                    ep_reduction_kWh_m2: epSav,
                    co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
                    lifespan_years: life, priority: prio,
                  });
                  if (ri.addInsulWall && wallA > 0) {
                    const t = parseInt(ri.insulWallThickness) || 10;
                    push(`Termoizolație pereți ETICS (${t} cm)`, "Anvelopă", wallA * 42, Math.min(epBase * 0.30, 80), 30, 1);
                  }
                  if (ri.addInsulRoof && roofA > 0) {
                    const t = parseInt(ri.insulRoofThickness) || 15;
                    push(`Termoizolație acoperiș/planșeu superior (${t} cm)`, "Anvelopă", roofA * 42, Math.min(epBase * 0.15, 50), 30, 1);
                  }
                  if (ri.replaceWindows && glazA > 0) {
                    push("Înlocuire tâmplărie exterioară (Low-E)", "Anvelopă", glazA * 200, Math.min(epBase * 0.20, 60), 30, 2);
                  }
                  if (ri.replaceHeating) {
                    push("Pompă de căldură aer-apă", "Instalații", 9000, Math.min(epBase * 0.25, 100), 20, 2);
                  }
                  if (ri.addHRV) {
                    push("Ventilare mecanică cu recuperare căldură (η ≥ 80%)", "Instalații", Au * 32, Math.min(epBase * 0.18, 70), 20, 3);
                  }
                  if (ri.addPV) {
                    push("Instalare panouri fotovoltaice", "Regenerabile", 5 * 1100, 40, 25, 1);
                  }
                  if (ri.addSolarThermal) {
                    push("Panouri solar-termice pentru ACM", "Regenerabile", 6 * 380, Math.min(epBase * 0.08, 30), 25, 2);
                  }
                  if (ri.addLED) {
                    push("Înlocuire iluminat cu LED + senzori prezență", "Instalații", Au * 8, Math.min(epBase * 0.06, 20), 20, 3);
                  }
                }
                if (measures.length === 0) {
                  measures = (smartSuggestions || []).map((s, i) => {
                    const costEur = parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0;
                    const epSav = parseFloat(s.epSaving_m2) || 0;
                    return {
                      id: slugifyCard(s.measure, i),
                      name: s.measure || `Măsură ${i + 1}`,
                      category: s.system || "Nespecificat",
                      system: s.system || "Nespecificat",
                      cost_RON: Math.round(costEur * eurRon),
                      ep_reduction_kWh_m2: epSav,
                      co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
                      lifespan_years: s.system === "Anvelopă" ? 30 : (s.system === "Regenerabile" ? 25 : 20),
                      priority: s.priority || 3,
                    };
                  });
                }

                const energyPriceRON = 0.45;
                const phasedPlan = measures.length > 0
                  ? calcPhasedRehabPlan(
                      measures,
                      50000,
                      "balanced",
                      epFinal,
                      building?.category || "AL",
                      Au,
                      energyPriceRON,
                    )
                  : null;

                const mepsTh = getMepsThresholdsFor(building?.category);
                const milestone1 = 2030;
                const milestone2 = mepsTh.milestone2;

                const exportRoadmapDOCX = async () => {
                  try {
                    // Sprint 06may2026 audit P0 (B1) — populate financialSummary.
                    // Prioritate: phasedPlan.totalCost_RON (cost real măsuri agregate) >
                    // financialAnalysis.globalCost (LCC poate fi NEGATIV când VAN beneficii>cost).
                    // Fix bug 06.05.2026 12:02 raport: „Investiție totală: -142.882 RON".
                    const eurRonRate = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                    const phasedCost = phasedPlan?.totalCost_RON || 0;
                    const lccCost = financialAnalysis
                      ? Math.abs((financialAnalysis.globalCost || 0) * eurRonRate)
                      : 0;
                    const financialSum = (phasedCost > 0 || financialAnalysis) ? {
                      totalInvest_RON: phasedCost > 0 ? phasedCost : lccCost,
                      npv: financialAnalysis?.npv || phasedPlan?.summary?.npv_30y || 0,
                      irr: financialAnalysis?.irr || phasedPlan?.summary?.irr_pct || 0,
                      paybackSimple: financialAnalysis?.paybackSimple || phasedPlan?.summary?.paybackSimple_y || 0,
                      paybackDiscounted: financialAnalysis?.paybackDiscounted || phasedPlan?.summary?.paybackDiscounted_y || 0,
                      perspective: "financial",
                    } : null;
                    // m-10 (7 mai 2026) — granturi în Foaie de parcurs DOCX pentru consistență.
                    const fundingEligibleRoadmap = (() => {
                      if (!instSummary) return null;
                      try {
                        const r = calcPNRRFunding({
                          category: building?.category,
                          Au: parseFloat(building?.areaUseful) || 0,
                          epBefore: instSummary.ep_total_m2,
                          epAfter: (instSummary.ep_total_m2 || 0) * 0.55,
                          yearBuilt: parseInt(building?.yearBuilt) || 1980,
                        });
                        return r ? { maxGrantCombined: r.total_grant_RON || 0, programs: r.eligible || [] } : null;
                      } catch { return null; }
                    })();
                    const passport = buildRenovationPassport({
                      cpeCode: building?.cpeCode || building?.cpeNumber || null,
                      building,
                      instSummary,
                      renewSummary,
                      climate: selectedClimate,
                      auditor,
                      phasedPlan: phasedPlan ? {
                        strategy: "balanced",
                        totalYears: phasedPlan.totalYears,
                        annualBudget: 50000,
                        energyPrice: energyPriceRON,
                        discountRate: 0.04,
                        phases: phasedPlan.phases,
                        epTrajectory: phasedPlan.epTrajectory,
                        classTrajectory: phasedPlan.classTrajectory,
                        summary: phasedPlan.summary,
                      } : null,
                      mepsStatus: { thresholds: mepsTh },
                      financialSummary: financialSum,
                      fundingEligible: fundingEligibleRoadmap,
                      changeReason: "Export Foaie de parcurs (Pas 7 Card pașaport)",
                      changedBy: auditor?.name || "Auditor",
                    });
                    const docxLib = await import("../lib/passport-docx.js");
                    await docxLib.exportPassportDOCX(passport);
                    showToast("Foaia de parcurs DOCX descărcată", "success");
                  } catch (err) {
                    console.error("[Step7 Pașaport] export DOCX error:", err);
                    showToast("Eroare la generarea DOCX: " + err.message, "error");
                  }
                };

                return (
                  <Card title="Pașaport de Renovare — Foaie de parcurs etapizată" className="mb-4">
                    {/* Banner watermark juridic */}
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border-l-4 border-amber-600 text-[11px] text-amber-300">
                      ⚠️ <strong>PREVIEW EPBD 2024</strong> — fără valoare juridică în RO până la actul național
                      de transpunere (termen 29.05.2026). Document intern Zephren.
                    </div>

                    {/* Țintă MEPS dinamică EPBD Art. 9 */}
                    <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 text-[11px] space-y-1">
                      <div>
                        🎯 <strong>Țintă {milestone1}:</strong> clasă {mepsTh.class2030} · EP ≤ {mepsTh.ep2030} kWh/(m²·an)
                      </div>
                      <div>
                        🎯 <strong>Țintă {milestone2}:</strong> clasă {mepsTh.class2nd} · EP ≤ {mepsTh.ep2nd} kWh/(m²·an)
                        {" "}({["RI", "RC", "RA"].includes(building?.category) ? "rezidențial Art. 9.1.a" : "nerezidențial Art. 9.1.b"})
                      </div>
                    </div>

                    {!phasedPlan || phasedPlan.phases.length === 0 ? (
                      <div className="text-[11px] opacity-50 italic">
                        Nu există măsuri suficiente în „Sugestii inteligente reabilitare" pentru a construi un plan etapizat.
                      </div>
                    ) : (
                      <>
                        {/* Sumar plan */}
                        <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-white/[0.04] rounded-lg p-2">
                            <div className="opacity-50">Faze</div>
                            <div className="font-bold text-base">{phasedPlan.phases.length}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-2">
                            <div className="opacity-50">Durată</div>
                            <div className="font-bold text-base">{phasedPlan.totalYears} ani</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-2">
                            <div className="opacity-50">Investiție totală</div>
                            <div className="font-bold text-sm">{phasedPlan.totalCost_RON.toLocaleString("ro-RO")} RON</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-2">
                            <div className="opacity-50">Clasă finală</div>
                            <div className="font-bold text-base">{phasedPlan.summary?.class_final || "—"}</div>
                          </div>
                        </div>

                        {/* Vizualizare faze cu măsuri reale */}
                        <div className="space-y-3">
                          {phasedPlan.phases.map((ph, idx) => {
                            const cls = getEnergyClass(ph.ep_after, catKey);
                            return (
                              <div key={idx} className="flex gap-3 items-start">
                                <div className="flex flex-col items-center">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{ background: cls.color + "30", color: cls.color }}
                                  >
                                    {idx + 1}
                                  </div>
                                  {idx < phasedPlan.phases.length - 1 && <div className="w-0.5 h-8 bg-white/10" />}
                                </div>
                                <div className="flex-1 bg-white/[0.03] rounded-lg p-3 border border-white/5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold">
                                      Faza {idx + 1} — Anul {ph.year}
                                    </span>
                                    <span className="text-[10px] font-mono" style={{ color: cls.color }}>
                                      → {cls.cls} ({ph.ep_after.toFixed(0)} kWh/m²)
                                    </span>
                                  </div>
                                  <div className="text-[10px] opacity-50 mb-1">
                                    Cost fază: <strong>{ph.phaseCost_RON.toLocaleString("ro-RO")} RON</strong>
                                    {" · "}Economie anuală: <strong>{ph.annualSaving_RON.toLocaleString("ro-RO")} RON/an</strong>
                                    {" · "}{ph.measures.length} măsuri
                                  </div>
                                  <div className="text-[10px] opacity-40">
                                    {ph.measures.map(m => m.name).join(" • ") || "—"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Măsuri ne-alocate */}
                        {phasedPlan.unscheduledMeasures && phasedPlan.unscheduledMeasures.length > 0 && (
                          <div className="mt-3 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-[10px] text-red-300/80">
                            ⚠️ {phasedPlan.unscheduledMeasures.length} măsuri nealocate (buget insuficient pe 20 ani):
                            {" "}{phasedPlan.unscheduledMeasures.map(m => m.name).join(", ")}
                          </div>
                        )}

                        {/* Buton export DOCX foaie de parcurs */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={exportRoadmapDOCX}
                            className="px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30 text-amber-300 text-xs font-medium transition-all"
                          >
                            📄 Export DOCX Foaie de Parcurs (A4)
                          </button>
                        </div>
                      </>
                    )}

                    <div className="mt-3 text-[10px] opacity-30">
                      Conform EPBD 2024/1275 Art. 12 + Anexa VIII — Building Renovation Passport.
                      Plan generat din {(smartSuggestions || []).length} măsuri (sugestii inteligente),
                      strategie „balanced", buget anual 50.000 RON, preț energie 0,45 RON/kWh.
                    </div>
                  </Card>
                );
              })()}

              {/* ── MEPI — Sprint P1 (6 mai 2026) P0-06: înlocuit Card mock UI cu trimitere la
                  modulul real ConsumReconciliere (Step 8 tab `consum`). Card-ul vechi avea
                  inputs fără value/onChange/setState — date introduse se pierdeau imediat.
                  Modul corect: Step 8 ConsumReconciliere cu salvare în localStorage
                  zephren_measured_consumption + integrare în AuditReport.jsx + DOCX. */}
              <Card title="MEPI — Consum calculat vs. facturi reale" className="mb-4">
                <div className="space-y-3">
                  <div className="text-xs opacity-50">
                    Calculat curent (kWh/an):
                    <span className="ml-2 font-mono opacity-80">
                      Electricitate ≈ {instSummary ? Math.round(instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) : 0} ·
                      Gaz/termic ≈ {instSummary ? Math.round(instSummary.qf_h + instSummary.qf_w) : 0}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 text-xs">
                    <strong>📊 Reconciliere consum real (MEPI complet)</strong> este disponibil în
                    Pas 8 → tab „Consum reconciliere" — permite import facturi/OCR, comparație
                    lunară calculat vs. real, calibrare automată model energetic și salvare
                    persistentă în Dosarul Audit.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(8)}
                      disabled={!canAccess(userPlan, "consumReconciliere")}
                      className="px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-600/40 hover:bg-blue-600/30 text-blue-300 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      → Pas 8: Reconciliere consum (MEPI complet)
                    </button>
                    {!canAccess(userPlan, "consumReconciliere") && (
                      <span className="text-[10px] opacity-50 self-center">
                        (Necesar plan Expert+ pentru ConsumReconciliere)
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* ── Sprint P1 (6 mai 2026) — referință raport conformare nZEB.
                  Modulul complet rămâne în Pas 6 (Card auditor + ștampilă + Anexa MDLPA).
                  Sprint 8 mai 2026 — gating prin requiresNZEBReport() (clădiri noi +
                  renovare majoră + recepție; NU se afișează pentru CPE vânzare/închiriere
                  sau clădiri exceptate Art. 4 L.372/2005). */}
              {canAccess(userPlan, "nzebReport") && (() => {
                const nzebReq = requiresNZEBReport(building);
                if (!nzebReq.required) return null;
                return (
                  <Card title="Raport conformare nZEB — referință" className="mb-4 border-violet-500/20">
                    <div className="px-3 py-2 rounded-lg bg-violet-500/10 border-l-4 border-violet-500 text-xs space-y-2">
                      <div>
                        📄 <strong>Raportul de conformare nZEB este obligatoriu</strong> pentru această clădire.
                        {" "}{nzebReq.reason}
                      </div>
                      <div className="text-[11px] opacity-70">
                        Modulul complet de generare se află în Pas 6 (Certificat) — secțiunea
                        „Auditor + Anexa MDLPA". Conform Ord. MDLPA 348/2026 Art. 6 alin. (1) lit. c,
                        doar AE Ici (atestat grad I civile) poate emite acest raport.
                      </div>
                      <button
                        onClick={() => setStep(6)}
                        className="px-3 py-1.5 rounded-md bg-violet-600/20 border border-violet-600/40 hover:bg-violet-600/30 text-violet-300 text-xs font-medium transition-all"
                      >
                        → Pas 6: Raport conformare nZEB
                      </button>
                    </div>
                  </Card>
                );
              })()}

              <Card title="📑 Generare documente — pachet client reabilitare" className="mt-6 border-2 border-amber-500/30 bg-amber-500/[0.03]">
                {/* ── Buton descărcare totală ZIP ── */}
                <button
                  onClick={downloadAllAsZip}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-5 rounded-xl border-2 border-emerald-400/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/80 transition-all font-bold text-sm shadow-lg shadow-emerald-900/20">
                  <span className="text-lg">📦</span>
                  <span>Descarcă toate documentele (ZIP)</span>
                  <span className="text-[10px] font-normal opacity-60 ml-1">A1–A5 + B1 + C1</span>
                </button>
                {/* ── Secțiunea A: DOCUMENTE OFICIALE (auditor → client) ── */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-violet-500/30" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">A · Documente oficiale</div>
                    <div className="h-px flex-1 bg-violet-500/30" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        try {
                          showToast("Generare Raport Audit Energetic în curs…", "info", 4000);
                          const payload = {
                            building, instSummary, renewSummary, auditor,
                            opaqueElements, glazingElements, thermalBridges,
                            energyClass: enClass || { cls: "—", color: "#888" },
                            measuredConsumption: (() => {
                              try { return JSON.parse(localStorage.getItem("zephren_measured_consumption") || "{}"); }
                              catch { return {}; }
                            })(),
                            systems: { heating, cooling, ventilation, lighting, acm },
                          };
                          const res = await fetch("/api/generate-document?type=audit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (!res.ok) throw new Error("API error " + res.status);
                          const { docx, filename } = await res.json();
                          const bytes = Uint8Array.from(atob(docx), c => c.charCodeAt(0));
                          const blob = new Blob([bytes], {
                            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                          });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = filename || `raport_audit_energetic_${new Date().toISOString().slice(0, 10)}.docx`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                          showToast("✓ Raport Audit Energetic DOCX descărcat", "success", 4000);
                        } catch (e) {
                          console.error("[Step7] export Raport Audit:", e);
                          showToast("Eroare generare Raport Audit: " + e.message, "error", 6000);
                        }
                      }}
                      title="🟢 OBLIGATORIU LEGAL pentru auditul energetic — Mc 001-2022 §11 + Ord. 2237/2010 anexa 1 (conținut minim raport audit). Include bilanț energetic + recomandări cuantificate cu costuri + reconciliere consum."
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-bold sm:col-span-2">
                      <span>🟢</span><span>📋</span> Raport Audit Energetic (DOCX A4) — Cap. 1-8 · OBLIGATORIU LEGAL
                    </button>
                    <button
                      onClick={async () => {
                        if (!rehabComparison) {
                          showToast("Configurați scenariul de reabilitare în Pasul 5 înainte de generare.", "warning", 5000);
                          return;
                        }
                        try {
                          showToast("Se generează CPE estimat post-reabilitare...", "info", 3000);
                          const { exportCpePostRehabPDF } = await import("../lib/cpe-post-rehab-pdf.js");
                          await exportCpePostRehabPDF({
                            building, auditor,
                            rehabComparison, rehabScenarioInputs,
                            opaqueElements, glazingElements, REHAB_COSTS,
                            instSummary,
                            cpeCodeBase: building?.cpeNumber || null,
                          });
                          showToast("✓ CPE estimat post-reabilitare PDF descărcat", "success", 4000);
                        } catch (e) {
                          console.error("[Step7] export CPE post-rehab:", e);
                          showToast("Eroare generare CPE estimat: " + e.message, "error", 6000);
                        }
                      }}
                      title="🟡 OPȚIONAL — proiecție clasă energetică după lucrări. Util pentru beneficiar / bancă / finanțator (PNRR, AFM Casa Verde) ca evidență a îmbunătățirii așteptate. NU este un CPE oficial — CPE-ul oficial se emite doar pe stare reală post-execuție. Necesită scenariu reabilitare configurat la Pas 5."
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all text-sm font-bold sm:col-span-2">
                      <span>🟡</span><span>🏠</span> CPE Estimat Post-Reabilitare (PDF) — clasă proiectată după lucrări
                    </button>
                    {/* Sprint 08may2026 — eliminat butonul „Scrisoare însoțire MDLPA" (cover letter)
                        Motiv: nu este obligatoriu legal (codul CPE este oricum imprimat pe certificat),
                        nu este folosit în practică (PFA cabinet user feedback 8 mai 2026),
                        nu apare în Mc 001-2022 / Ord. 2237/2010 / Ord. 348/2026 ca document obligatoriu.
                        Helper-ul cover-letter-pdf.js rămâne în repo pentru testele existente.
                        Vezi audit documente generate · folder „documente generate/" · 7 mai 2026. */}
                  </div>

                  {/* Sprint 08may2026 — Sub-meniul „Extrageri individuale audit" ELIMINAT
                      (FIC + Manifest SHA-256 + Plan M&V).
                      Motiv: user feedback 8 mai 2026 — nu cere niciodată extrageri individuale;
                      toate 3 documente sunt INCLUSE deja în Raportul Audit Energetic complet
                      (FIC = Anexa G; Manifest = Anexa 11; M&V = sec. monitorizare).
                      Helperele lib/dossier-extras.js (generateFICPdf, generateManifestSHA256,
                      generateMonitoringPlanPdf) rămân în repo pentru reactivare instant. */}
                  {/* ELIMINAT_EXTRAGERI_START
                  <details className="mt-3 group">
                    <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-violet-400/70 hover:text-violet-300 transition-colors px-2 py-1.5 rounded-lg bg-violet-500/[0.04] border border-violet-500/20">
                      <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                      <span>⚪ Extrageri individuale din audit (opționale)</span>
                      <span className="ml-auto text-[9px] opacity-60 normal-case">FIC · Manifest · Plan M&V</span>
                    </summary>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      <button
                        onClick={async () => {
                          try {
                            showToast("Se generează FIC...", "info", 2000);
                            const { generateFICPdf } = await import("../lib/dossier-extras.js");
                            await generateFICPdf({
                              building, auditor, climate: selectedClimate,
                              instSummary, opaqueElements, glazingElements,
                              energyClass: enClass?.cls,
                              owner: {
                                name: building?.owner, type: building?.ownerType,
                                cui: building?.ownerCUI, address: building?.address,
                              },
                            });
                            showToast("✓ Fișa Identitate Clădire (FIC) descărcată", "success", 4000);
                          } catch (e) {
                            console.error("[Step7] FIC:", e);
                            showToast("Eroare generare FIC: " + e.message, "error", 6000);
                          }
                        }}
                        title="⚪ OPȚIONAL — Fișa Identitate Clădire (Anexa G Mc 001-2022). Inclusă deja în Dosarul Audit AAECR. Folosește acest export individual când beneficiarul/banca cere DOAR FIC fără raportul complet."
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-300 hover:bg-violet-500/10 transition-all text-xs font-semibold">
                        <span>📑</span> FIC (PDF) — Mc 001-2022 Anexa G
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            showToast("Se generează Manifest SHA-256...", "info", 2000);
                            const { generateManifestSHA256 } = await import("../lib/dossier-extras.js");
                            const cpeCode = building?.cpeCode || building?.cpeNumber || "CE-LOCAL";
                            const placeholderFiles = [
                              { name: "raport_audit.docx", blob: new Blob([cpeCode + "_audit"], { type: "text/plain" }) },
                              { name: "anexe_complete.docx", blob: new Blob([cpeCode + "_anexe"], { type: "text/plain" }) },
                              { name: "pasaport_renovare.xml", blob: new Blob([cpeCode + "_pasaport"], { type: "text/plain" }) },
                              { name: "CPE_XML.xml", blob: new Blob([cpeCode + "_cpe"], { type: "text/plain" }) },
                            ];
                            const r = await generateManifestSHA256({
                              files: placeholderFiles, auditor, building, cpeCode,
                            });
                            showToast(`✓ Manifest SHA-256 descărcat (${r.fileCount} fișiere)`, "success", 4000);
                          } catch (e) {
                            console.error("[Step7] manifest:", e);
                            showToast("Eroare generare Manifest: " + e.message, "error", 6000);
                          }
                        }}
                        title="⚪ OPȚIONAL — Manifest SHA-256 pentru integritate fișiere (bună practică ISO 14641). NU este obligatoriu legal. Util când beneficiarul/instituția cere garanția că fișierele predate nu au fost alterate."
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-300 hover:bg-violet-500/10 transition-all text-xs font-semibold">
                        <span>🔐</span> Manifest SHA-256 (TXT) — integritate
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            showToast("Se generează Plan M&V...", "info", 2000);
                            const { generateMonitoringPlanPdf } = await import("../lib/dossier-extras.js");
                            const eurRonRate = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                            const measuresFromSugg = (smartSuggestions || []).map((s) => ({
                              name: s.measure,
                              cost_RON: Math.round((parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0) * eurRonRate),
                            }));
                            const totalCost = measuresFromSugg.reduce((s, m) => s + (m.cost_RON || 0), 0);
                            const expectedSavings = (smartSuggestions || []).reduce(
                              (s, x) => s + (parseFloat(x.epSaving_m2) || 0), 0
                            ) * (parseFloat(building?.areaUseful) || 100) * 0.45;
                            await generateMonitoringPlanPdf({
                              building, auditor, instSummary,
                              energyClass: enClass?.cls,
                              scenario: {
                                measures: measuresFromSugg,
                                totalCost_RON: totalCost,
                                expectedSavings_RON_y: expectedSavings,
                              },
                            });
                            showToast("✓ Plan M&V descărcat", "success", 4000);
                          } catch (e) {
                            console.error("[Step7] M&V:", e);
                            showToast("Eroare generare Plan M&V: " + e.message, "error", 6000);
                          }
                        }}
                        title="⚪ OPȚIONAL — Plan Măsurare & Verificare IPMVP Opțiunea C. Cerut de bănci internaționale (EBRD, IFC) și unele finanțări UE/PNRR. NU există obligație legală în RO la 8.V.2026."
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-300 hover:bg-violet-500/10 transition-all text-xs font-semibold">
                        <span>📊</span> Plan M&V post-renovare (PDF) — IPMVP
                      </button>
                    </div>
                  </details>
                  ELIMINAT_EXTRAGERI_END */}
                </div>

                {/* ── Secțiunea B: DOCUMENTE CLIENT ORIENTATIVE ── */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-amber-500/30" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">B · Documente client orientative</div>
                    <div className="h-px flex-1 bg-amber-500/30" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={async () => {
                      if (!rehabComparison) { showToast("Configurați scenariul de reabilitare în Pasul 5", "error"); return; }
                      try {
                        showToast("Se generează devizul PDF...", "info", 2000);
                        // Sprint Pas 7 docs follow-up — pasăm opaqueElements
                        // pentru ca Devizul să folosească arii REALE din Step 2
                        // (nu estimări heuristice Au × 3.5) prin buildCanonicalMeasures.
                        await generateRehabEstimatePDF({
                          building, auditor,
                          rehabScenarioInputs,
                          opaqueElements, glazingElements,
                          rehabComparison,
                          download: true,
                        });
                        showToast("✓ Deviz estimativ PDF descărcat", "success", 3000);
                      } catch (e) {
                        showToast("Eroare generare deviz: " + e.message, "error", 5000);
                      }
                    }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/80 hover:bg-amber-500/10 transition-all text-xs">
                      <span>📋</span> Deviz estimativ reabilitare (PDF)
                    </button>
                    {/* Sprint 08may2026 — Buton „Pașaport Renovare EPBD (PDF A4)" ELIMINAT
                        Motiv: EPBD 2024/1275 NU este transpus în drept intern RO la 8.V.2026
                        (termen UE 29.V.2026 — nu există încă act normativ național RO).
                        Watermark juridic spunea „PREVIEW EPBD fără valoare juridică în RO".
                        REACTIVARE LA TRANSPUNERE EPBD RO: scoate markerele ELIMINAT din comentarii + decomentează blocul.
                        Helperele lib/passport-export.js + passport-docx.js + renovation-passport-schema
                        rămân în repo pentru reactivare instant. */}
                    {/* ELIMINAT_PASAPORT_PDF_START
                    <button
                      onClick={async () => {
                        try {
                          showToast("Se generează Pașaport Renovare PDF…", "info", 3000);
                          const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                          // Sprint 06may2026 audit P0 (B9) — slug complet
                          const slugifyPDF = (s, i) => {
                            const ascii = String(s || "")
                              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-zA-Z0-9]+/g, "_")
                              .replace(/^_+|_+$/g, "")
                              .toLowerCase();
                            return `m_${i}_${ascii || "masura"}`;
                          };
                          const measures = (smartSuggestions || []).map((s, i) => {
                            const costEur = parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0;
                            const epSav = parseFloat(s.epSaving_m2) || 0;
                            return {
                              id: slugifyPDF(s.measure, i),
                              name: s.measure || `Măsură ${i + 1}`,
                              category: s.system || "Nespecificat",
                              system: s.system || "Nespecificat",
                              cost_RON: Math.round(costEur * eurRon),
                              ep_reduction_kWh_m2: epSav,
                              co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
                              lifespan_years: s.system === "Anvelopă" ? 30 : (s.system === "Regenerabile" ? 25 : 20),
                              priority: s.priority || 3,
                            };
                          });
                          const phasedPlan = measures.length > 0
                            ? calcPhasedRehabPlan(measures, 50000, "balanced", epFinal || 200,
                                building?.category || "AL", parseFloat(building?.areaUseful) || 100, 0.45)
                            : null;
                          const mepsThresholds = getMepsThresholdsFor(building?.category);
                          // m-10 (7 mai 2026) — calculează granturi PNRR/AFM pentru a popula
                          // câmpul „Grant maxim eligibil" din PDF Pașaport pag. 3 (era „—" gol).
                          const fundingEligiblePassport = (() => {
                            if (!instSummary) return null;
                            try {
                              const r = calcPNRRFunding({
                                category: building?.category,
                                Au: parseFloat(building?.areaUseful) || 0,
                                epBefore: instSummary.ep_total_m2,
                                epAfter: (instSummary.ep_total_m2 || 0) * 0.55,
                                yearBuilt: parseInt(building?.yearBuilt) || 1980,
                              });
                              return r ? { maxGrantCombined: r.total_grant_RON || 0, programs: r.eligible || [] } : null;
                            } catch { return null; }
                          })();
                          const passport = buildRenovationPassport({
                            cpeCode: building?.cpeCode || building?.cpeNumber || null,
                            building: building || {},
                            instSummary: instSummary || { ep_total_m2: epFinal, energyClass: enClass?.cls },
                            renewSummary: renewSummary || {},
                            climate: selectedClimate || {},
                            auditor: auditor || {},
                            phasedPlan: phasedPlan ? {
                              strategy: "balanced", totalYears: phasedPlan.totalYears,
                              annualBudget: 50000, energyPrice: 0.45, discountRate: 0.04,
                              phases: phasedPlan.phases, epTrajectory: phasedPlan.epTrajectory,
                              classTrajectory: phasedPlan.classTrajectory, summary: phasedPlan.summary,
                            } : null,
                            mepsStatus: { thresholds: mepsThresholds, level: "noncompliant" },
                            fundingEligible: fundingEligiblePassport,
                            // Sprint 06may2026 audit P0 (B1) — Math.abs() pe globalCost
                            // (LCC poate fi negativ; folosesc phasedPlan.totalCost_RON ca primă sursă)
                            financialSummary: (() => {
                              const phasedCostPDF = phasedPlan?.totalCost_RON || 0;
                              const lccPDF = financialAnalysis
                                ? Math.abs((financialAnalysis.globalCost || 0) * eurRon)
                                : 0;
                              if (phasedCostPDF === 0 && !financialAnalysis) return null;
                              return {
                                totalInvest_RON: phasedCostPDF > 0 ? phasedCostPDF : lccPDF,
                                npv: financialAnalysis?.npv || phasedPlan?.summary?.npv_30y || 0,
                                irr: financialAnalysis?.irr || phasedPlan?.summary?.irr_pct || 0,
                                paybackSimple: financialAnalysis?.paybackSimple || phasedPlan?.summary?.paybackSimple_y || 0,
                                paybackDiscounted: financialAnalysis?.paybackDiscounted || phasedPlan?.summary?.paybackDiscounted_y || 0,
                                perspective: "financial",
                              };
                            })(),
                            changeReason: "Generare pașaport renovare (Pas 7 card central)",
                            changedBy: auditor?.name || "Auditor",
                          });
                          const lib = await import("../lib/passport-export.js");
                          await lib.exportPassportPDF(passport, {
                            building, auditor, energyClass: enClass?.cls, epPrimary: epFinal,
                          });
                          showToast("✓ Pașaport Renovare PDF descărcat", "success", 4000);
                        } catch (e) {
                          console.error("[Step7] export Pașaport PDF:", e);
                          showToast("Eroare generare Pașaport PDF: " + e.message, "error", 6000);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-semibold">
                      <span>📘</span> Pașaport Renovare EPBD (PDF A4)
                    </button>
                    ELIMINAT_PASAPORT_PDF_END */}
                  </div>
                  {/* Sprint 08may2026 — componenta `<PasaportBasic>` preview UI ELIMINATĂ
                      (același motiv: EPBD netranspus RO 8.V.2026). Decomentează blocul de mai jos
                      la transpunere act normativ național. */}
                  {/* ELIMINAT_PASAPORT_PREVIEW_START
                  <div className="mt-3">
                    <PasaportBasic
                      building={building}
                      energyClass={enClass?.cls || "—"}
                      epFinal={epFinal}
                      auditor={auditor}
                      userPlan={userPlan}
                      cpeCode={building?.cpeCode || building?.cpeNumber || null}
                      instSummary={instSummary}
                      renewSummary={renewSummary}
                      climate={selectedClimate}
                      smartSuggestions={smartSuggestions}
                      financialSummary={financialAnalysis ? {
                        totalInvest_RON: financialAnalysis.globalCost ? financialAnalysis.globalCost * 5.05 : 0,
                        npv: financialAnalysis.npv || 0,
                        irr: financialAnalysis.irr || 0,
                        paybackSimple: financialAnalysis.paybackSimple || 0,
                        paybackDiscounted: financialAnalysis.paybackDiscounted || 0,
                        perspective: "financial",
                      } : null}
                      noButtons={true}
                    />
                  </div>
                  ELIMINAT_PASAPORT_PREVIEW_END */}
                </div>

                {/* ── Secțiunea C: DATE TEHNICE EXPORT ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-emerald-500/30" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">C · Date tehnice (export)</div>
                    <div className="h-px flex-1 bg-emerald-500/30" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Sprint 08may2026 — buton „📄 XML MDLPA (CPE)" ELIMINAT
                        (DUPLICAT EXACT cu butonul „Export XML MDLPA" Pas 6 — apelează
                        aceeași funcție exportXML din handlers/exportHandlers.js). */}
                    {/* Sprint 08may2026 — buton „📄 XML Pașaport (EPBD)" ELIMINAT
                        (EPBD netranspus RO 8.V.2026 — schemă oficială inexistentă;
                        helper exportPassportXML rămâne pentru reactivare).
                        REACTIVARE LA TRANSPUNERE EPBD RO: scoate markerele ELIMINAT din comentarii + decomentează blocul. */}
                    {/* ELIMINAT_XML_PASAPORT_START
                    <button
                      onClick={async () => {
                        try {
                          showToast("Se generează Pașaport XML…", "info", 2000);
                          const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                          // Sprint 06may2026 audit P0 (B9) — slug complet diacritics-stripped
                          // în loc de slice(0,8) care cauzează ID-uri grotești (m_3_Instalar)
                          const slugify = (s, i) => {
                            const ascii = String(s || "")
                              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-zA-Z0-9]+/g, "_")
                              .replace(/^_+|_+$/g, "")
                              .toLowerCase();
                            return `m_${i}_${ascii || "masura"}`;
                          };
                          const measures = (smartSuggestions || []).map((s, i) => {
                            const costEur = parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0;
                            const epSav = parseFloat(s.epSaving_m2) || 0;
                            return {
                              id: slugify(s.measure, i),
                              name: s.measure || `Măsură ${i + 1}`,
                              category: s.system || "Nespecificat",
                              cost_RON: Math.round(costEur * eurRon),
                              ep_reduction_kWh_m2: epSav,
                              co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
                              lifespan_years: 20, priority: s.priority || 3,
                            };
                          });
                          const phasedPlan = measures.length > 0
                            ? calcPhasedRehabPlan(measures, 50000, "balanced", epFinal || 200,
                                building?.category || "AL", parseFloat(building?.areaUseful) || 100, 0.45)
                            : null;
                          // Sprint 06may2026 audit P0 (B10) — pass mepsStatus pentru
                          // calcul corect baseline.meps2030_compliant (era default 999 → true greșit)
                          const mepsThXml = getMepsThresholdsFor(building?.category);
                          // Sprint 06may2026 audit P0 (B1 extended) — financial XML
                          // (anterior <totalInvestment_RON>0</totalInvestment_RON>)
                          const phasedCostXml = phasedPlan?.totalCost_RON || 0;
                          const lccCostXml = financialAnalysis
                            ? Math.abs((financialAnalysis.globalCost || 0) * eurRon)
                            : 0;
                          const finSumXml = (phasedCostXml > 0 || financialAnalysis) ? {
                            totalInvest_RON: phasedCostXml > 0 ? phasedCostXml : lccCostXml,
                            npv: financialAnalysis?.npv || phasedPlan?.summary?.npv_30y || 0,
                            irr: financialAnalysis?.irr || phasedPlan?.summary?.irr_pct || 0,
                            paybackSimple: financialAnalysis?.paybackSimple || phasedPlan?.summary?.paybackSimple_y || 0,
                            paybackDiscounted: financialAnalysis?.paybackDiscounted || phasedPlan?.summary?.paybackDiscounted_y || 0,
                            perspective: "financial",
                          } : null;
                          // m-10 (7 mai 2026) — granturi în XML Pașaport pentru consistență cu PDF.
                          const fundingEligibleXml = (() => {
                            if (!instSummary) return null;
                            try {
                              const r = calcPNRRFunding({
                                category: building?.category,
                                Au: parseFloat(building?.areaUseful) || 0,
                                epBefore: instSummary.ep_total_m2,
                                epAfter: (instSummary.ep_total_m2 || 0) * 0.55,
                                yearBuilt: parseInt(building?.yearBuilt) || 1980,
                              });
                              return r ? { maxGrantCombined: r.total_grant_RON || 0, programs: r.eligible || [] } : null;
                            } catch { return null; }
                          })();
                          const passport = buildRenovationPassport({
                            cpeCode: building?.cpeCode || building?.cpeNumber || null,
                            building: building || {}, instSummary: instSummary || {},
                            renewSummary: renewSummary || {}, climate: selectedClimate || {},
                            auditor: auditor || {},
                            phasedPlan: phasedPlan ? {
                              strategy: "balanced", totalYears: phasedPlan.totalYears,
                              annualBudget: 50000, energyPrice: 0.45, discountRate: 0.04,
                              phases: phasedPlan.phases, epTrajectory: phasedPlan.epTrajectory,
                              classTrajectory: phasedPlan.classTrajectory, summary: phasedPlan.summary,
                            } : null,
                            mepsStatus: { thresholds: mepsThXml },
                            financialSummary: finSumXml,
                            fundingEligible: fundingEligibleXml,
                            changeReason: "Export XML Pașaport (Pas 7)",
                          });
                          const lib = await import("../lib/passport-export.js");
                          lib.exportPassportXML(passport);
                          showToast("✓ Pașaport XML descărcat", "success", 3000);
                        } catch (e) {
                          console.error("[Step7] export Pașaport XML:", e);
                          showToast("Eroare generare Pașaport XML: " + e.message, "error", 6000);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400/80 hover:bg-blue-500/10 transition-all text-xs">
                      <span>📄</span> XML Pașaport (EPBD)
                    </button>
                    ELIMINAT_XML_PASAPORT_END */}
                    <button
                      onClick={async () => {
                        const hasAny = (opaqueElements?.length || 0) +
                          (glazingElements?.length || 0) + (thermalBridges?.length || 0) > 0;
                        if (!hasAny) {
                          showToast("Nu există elemente — adaugă cel puțin unul în Pasul 2/3.", "warning", 5000);
                          return;
                        }
                        try {
                          const { exportFullAnnexesDOCX } = await import("../lib/element-annex-docx.js");
                          const buildingName = (building?.name || building?.address || "cladire")
                            .replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 40);
                          const r = await exportFullAnnexesDOCX(
                            { opaque: opaqueElements, glazing: glazingElements, bridges: thermalBridges,
                              systems: { heating, cooling, ventilation, lighting, acm } },
                            {
                              filename: `anexe_complete_${buildingName}_${new Date().toISOString().slice(0, 10)}.docx`,
                              building,
                            }
                          );
                          showToast(`Anexe DOCX complete exportate (${r.sectionsCount} secțiuni).`, "success", 4000);
                        } catch (e) {
                          console.error("Eroare export anexe:", e);
                          showToast(`Eroare la export anexe: ${e.message}`, "error", 6000);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/80 hover:bg-amber-500/10 transition-all text-xs">
                      <span>📘</span> Anexe (DOCX) — opace+vitraj+punți+sisteme
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] opacity-40 italic">
                    Notă: Raport tehnic complet PDF + Excel portofoliu sunt disponibile în Pasul 8 (Avansat).
                  </div>
                </div>
              </Card>

              {/* Sprint 08may2026 — Card „Simulare what-if interactivă" ELIMINAT
                  (3 sliders: izolație/ferestre/PV — pedagogic, nu produce document.
                   Auditor experimentat știe deja ordinul de mărime al impactului). */}

              {/* Sprint 08may2026 — Card „Smart Readiness Indicator (SRI)" ELIMINAT din Pas 7
                  (DUPLICAT — apare deja în Step 5 SRIScoreAuto + Step 8 tab SRI Indicator).
                   Locul canonic = Step 8 tab SRI. */}

              {/* ── Sprint v6.2 (27 apr 2026) — AnexaMDLPAFields mutat în Step 6 ──
                  Conform Ord. MDLPA 348/2026, Anexa 1+2 se completează la momentul
                  emiterii CPE (Step 6), nu în cadrul auditului energetic detaliat (Step 7).
                  Auditorii AE Ic și AE IIc văd aceleași 35 câmpuri în Step 6. */}

              {/* ── Marketplace auditori ── */}
              <Card title="Marketplace auditori — Găsește un auditor atestat" className="mb-4">
                <div className="text-xs opacity-50 mb-2">Conectează-te cu auditori energetici atestați din zona ta</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a href="https://www.mdlpa.ro/pages/registruauditorienergforabuildings" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/5 transition-all text-xs">
                    <span className="text-lg">🏛️</span>
                    <div>
                      <div className="font-medium">Registrul MDLPA</div>
                      <div className="opacity-40">Lista oficială auditori atestați</div>
                    </div>
                  </a>
                  <a href={"https://www.google.com/search?q=auditor+energetic+atestat+" + encodeURIComponent(building.city || building.county || "Romania")} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/5 transition-all text-xs">
                    <span className="text-lg">🔍</span>
                    <div>
                      <div className="font-medium">Caută auditori</div>
                      <div className="opacity-40">În {building.city || building.county || "România"}</div>
                    </div>
                  </a>
                </div>
              </Card>

              {/* ── Notificări push expirare CPE ── */}
              <Card title="Notificări — Expirare CPE" className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <div className="opacity-50">Primește notificări când CPE-ul se apropie de expirare</div>
                    {auditor.date && (
                      <div className="mt-1 opacity-70">
                        CPE expiră la: <strong>{(() => { const d = new Date(auditor.date); d.setFullYear(d.getFullYear()+10); return d.toLocaleDateString("ro-RO"); })()}</strong>
                      </div>
                    )}
                  </div>
                  <button onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then(p => {
                        if (p === "granted") {
                          showToast("Notificări activate! Vei fi alertat cu 90 zile înainte de expirare.", "success");
                          // Schedule check
                          if (auditor.date) {
                            const exp = new Date(auditor.date);
                            exp.setFullYear(exp.getFullYear() + 10);
                            const daysLeft = Math.floor((exp - new Date()) / 86400000);
                            if (daysLeft <= 90 && daysLeft > 0) {
                              new Notification("Zephren — CPE expiră în " + daysLeft + " zile", {
                                body: building.address || "Verifică certificatul energetic",
                                icon: "/favicon.svg"
                              });
                            }
                          }
                        } else {
                          showToast("Notificările sunt blocate de browser", "error");
                        }
                      });
                    } else {
                      showToast("Browserul nu suportă notificări", "error");
                    }
                  }}
                    className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-all">
                    🔔 Activează notificări
                  </button>
                </div>
              </Card>

              {/* ── Digital Building Logbook ── DEZACTIVAT: EPBD 2024/1275 netranspus în RO la 8.V.2026.
                  Termen transpunere națională: 29.05.2026. Reactivare după adoptarea actului național. */}
              {false && <Card title="Digital Building Logbook — Dosar digital al clădirii" className="mb-4">
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2.5">
                      <div className="font-bold text-amber-400 mb-1">Identificare</div>
                      <div className="opacity-50">{building.address || "—"}, {building.city || ""}</div>
                      <div className="opacity-50">An: {building.yearBuilt || "—"} · {building.floors || "—"}</div>
                      <div className="opacity-50">Au: {building.areaUseful || "—"} m² · V: {building.volume || "—"} m³</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5">
                      <div className="font-bold text-emerald-400 mb-1">Performanță actuală</div>
                      <div className="opacity-50">EP: {epFinal.toFixed(1)} kWh/(m²·an) — Clasa {enClass.cls}</div>
                      <div className="opacity-50">CO₂: {co2Final.toFixed(1)} kgCO₂/(m²·an)</div>
                      <div className="opacity-50">RER: {rer.toFixed(0)}% · nZEB: {isNZEB ? "DA" : "NU"}</div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <div className="font-bold text-blue-400 mb-1">Sisteme instalate</div>
                    <div className="opacity-50">Încălzire: {HEAT_SOURCES.find(h=>h.id===heating.source)?.label || "—"}</div>
                    <div className="opacity-50">ACM: {ACM_SOURCES.find(a=>a.id===acm.source)?.label || "—"}</div>
                    <div className="opacity-50">Ventilare: {VENTILATION_TYPES.find(v=>v.id===ventilation.type)?.label || "—"}</div>
                  </div>
                  <div className="text-[10px] opacity-30">Conform EPBD 2024/1275 — Digital Building Logbook framework</div>
                </div>
              </Card>}

              {/* ── Pipeline gestionare proiecte ── */}
              <Card title="Pipeline proiecte — Status tracking" className="mb-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {["Lead","Inspecție","Calcul","CPE emis","Facturat"].map((stage, si) => {
                    const currentStage = instSummary ? (auditor.name ? (auditor.atestat ? 3 : 2) : 1) : 0;
                    const isActive = si <= currentStage;
                    return (
                      <React.Fragment key={stage}>
                        <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium ${isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 opacity-30 border border-white/10"}`}>{stage}</div>
                        {si < 4 && <div className={`w-4 h-0.5 flex-shrink-0 ${isActive ? "bg-emerald-500/40" : "bg-white/10"}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </Card>


              {/* ═══ INSTRUMENTE SUPLIMENTARE (pct. 9-17) — Sprint 08may2026 (followup 6) ═══
                   DEZACTIVATE prin `false && ...` (toate 8 instrumente sunt DUPLICATE cu tab-uri
                   Step 8 deja existente). User feedback 8 mai 2026: „toate" → eliminate.

                   Mapping duplicate eliminate:
                   - 📊 Analiză LCC → Step 8 tab „💹 LCC per măsură" (categoria Reabilitare)
                   - 🎯 Curbă Cost-Optimal → Step 8 tab „📊 Curba cost-optim" (Sprint followup 4)
                   - ⚠️ MEPS Check → Step 8 tab „🏛️ MEPS EPBD 2024" (categoria Conformitate)
                   - 📄 Ofertă Reabilitare → eliminat anterior din Step 8 Cabinet (user nu folosește)
                   - 📈 Consum Real → Step 8 tab „📊 Reconciliere consum" + buton dedicat în Pas 7
                   - 🏗️ Fond Reparații → Step 8 tab „🔧 Fond reparații" (categoria Reabilitare)
                   - 💶 Finanțări PNRR → Step 8 tab „💶 Finanțare PNRR/AFM" (Reabilitare)
                   - 🌡️ Hartă Termică → Step 8 tab „🌡️ Hartă termică" (categoria Diagnostic)

                   Logică unificată: locul canonic = Step 8.
                   Helperele calcMaintenanceFund + calcPNRRFunding + generateThermalMapSVG +
                   checkAcousticConformity rămân în repo (apelate de Step 8 + alte locuri).

                   REACTIVARE (dacă userul vrea shortcut-uri inline): schimbă `false &&` în nimic.
              */}
              {false && (() => {
                const [activeTool, setActiveTool] = React.useState(null);
                const tools = [
                  { id:"lcc",       icon:"📊", label:"Analiză LCC" },
                  { id:"costOptimal", icon:"🎯", label:"Curbă Cost-Optimal" },
                  { id:"meps",      icon:"⚠️",  label:"MEPS Check" },
                  { id:"oferta",    icon:"📄", label:"Ofertă Reabilitare" },
                  { id:"consum",    icon:"📈", label:"Consum Real" },
                  { id:"fond",      icon:"🏗️", label:"Fond Reparații" },
                  { id:"pnrr",      icon:"💶", label:"Finanțări PNRR" },
                  { id:"thermal",   icon:"🌡️", label:"Hartă Termică" },
                ];
                const Au = parseFloat(building?.areaUseful) || 0;

                // Calcule rapide pentru instrumentele inline
                const maintenanceResult = useMemo(() => {
                  if (!building) return null;
                  try { return calcMaintenanceFund({ category: building.category, yearBuilt: parseInt(building.yearBuilt)||1980, Au, quality: "medium" }); } catch { return null; }
                }, [building, Au]);

                const pnrrResult = useMemo(() => {
                  if (!instSummary) return null;
                  try { return calcPNRRFunding({ category: building.category, Au, epBefore: instSummary.ep_total_m2, epAfter: (instSummary.ep_total_m2 || 0) * 0.55, yearBuilt: parseInt(building.yearBuilt)||1980 }); } catch { return null; }
                }, [building, instSummary, Au]);

                const thermalSVG = useMemo(() => {
                  if (!opaqueElements?.length) return null;
                  try { return generateThermalMapSVG({ opaqueElements, glazingElements, thermalBridges }); } catch { return null; }
                }, [opaqueElements, glazingElements, thermalBridges]);

                const acousticResult = useMemo(() => {
                  if (!opaqueElements?.length) return null;
                  try { return checkAcousticConformity({ opaqueElements, glazingElements, category: building.category, calcOpaqueR }); } catch { return null; }
                }, [opaqueElements, glazingElements, building, calcOpaqueR]);

                const enClassStr = instSummary ? (getEnergyClass(renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2, building.category + (["RI","RC","RA"].includes(building.category) ? (cooling?.hasCooling ? "_cool" : "_nocool") : ""))?.cls || "") : "";

                // Context MEPS pentru pașaport + PhasedRehab
                const mepsContext = instSummary
                  ? getMepsStatus(enClassStr, instSummary.ep_total_m2, building?.category || "default")
                  : null;
                const financialSummary = pnrrResult
                  ? {
                      totalInvest_RON: pnrrResult.total_invest_RON || 0,
                      npv: pnrrResult.npv_30y || 0,
                      irr: pnrrResult.irr_pct || 0,
                      paybackSimple: pnrrResult.payback_years || 0,
                      paybackDiscounted: pnrrResult.payback_actualized_years || 0,
                      perspective: "financial",
                    }
                  : null;
                const fundingEligible = pnrrResult
                  ? {
                      maxGrantCombined: pnrrResult.total_grant_RON || 0,
                      programs: pnrrResult.eligible || [],
                    }
                  : null;

                return (
                  <div className="mt-6">
                    <div className="text-xs font-semibold uppercase tracking-wider opacity-40 mb-3">Instrumente suplimentare</div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tools.map(tool => (
                        <button key={tool.id} onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            activeTool === tool.id
                              ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/60 hover:text-white/80"
                          }`}>
                          {tool.icon} {tool.label}
                        </button>
                      ))}
                    </div>

                    {activeTool === "lcc" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <LCCAnalysis building={building} instSummary={instSummary} opaqueElements={opaqueElements} />
                      </div>
                    )}
                    {activeTool === "costOptimal" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <CostOptimalCurve
                          building={building}
                          instSummary={instSummary}
                          auditor={auditor}
                          onClose={() => setActiveTool(null)}
                        />
                      </div>
                    )}
                    {activeTool === "meps" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <MEPSCheck instSummary={instSummary} building={building} energyClass={enClassStr} />
                      </div>
                    )}
                    {activeTool === "oferta" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        {/* Sprint 06may2026 audit P0 (B3) — pasăm passport ca să
                            prepopulăm scenariu cu denumire + investiție reale */}
                        <OfertaReabilitare
                          building={building}
                          instSummary={instSummary}
                          auditor={auditor}
                          passport={(() => {
                            try {
                              const eurRonRate = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                              const slug = (s, i) => {
                                const a = String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                  .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
                                return `m_${i}_${a || "masura"}`;
                              };
                              const ms = (smartSuggestions || []).map((s, i) => ({
                                id: slug(s.measure, i),
                                name: s.measure || `Măsură ${i+1}`,
                                category: s.system || "Nespecificat",
                                cost_RON: Math.round((parseFloat(String(s.costEstimate||"0").replace(/[^0-9.]/g,""))||0) * eurRonRate),
                                ep_reduction_kWh_m2: parseFloat(s.epSaving_m2) || 0,
                                co2_reduction: Math.round((parseFloat(s.epSaving_m2)||0) * 0.230 * 100)/100,
                                lifespan_years: 20, priority: s.priority || 3,
                              }));
                              const pp = ms.length > 0
                                ? calcPhasedRehabPlan(ms, 50000, "balanced", epFinal||200,
                                    building?.category||"AL", parseFloat(building?.areaUseful)||100, 0.45)
                                : null;
                              if (!pp) return null;
                              return buildRenovationPassport({
                                cpeCode: building?.cpeCode || building?.cpeNumber || null,
                                building: building||{}, instSummary: instSummary||{},
                                renewSummary: renewSummary||{}, climate: selectedClimate||{},
                                auditor: auditor||{},
                                phasedPlan: { strategy: "balanced", totalYears: pp.totalYears,
                                  phases: pp.phases, epTrajectory: pp.epTrajectory,
                                  classTrajectory: pp.classTrajectory, summary: pp.summary },
                                mepsStatus: { thresholds: getMepsThresholdsFor(building?.category) },
                                changeReason: "Inline pre-fill OfertaReabilitare (Pas 7)",
                              });
                            } catch (e) { console.warn("[Pas 7 oferta] passport prefill:", e); return null; }
                          })()}
                          onClose={() => setActiveTool(null)} />
                      </div>
                    )}
                    {/* Pașaport Renovare EPBD — DEZACTIVAT până la 29 mai 2026
                    {activeTool === "passport" && (
                      <RenovationPassport ... />
                    )} */}
                    {activeTool === "consum" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <ConsumReconciliere instSummary={instSummary} building={building} />
                      </div>
                    )}
                    {activeTool === "fond" && maintenanceResult && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                        <div className="text-sm font-semibold mb-3">🏗️ Fond Reparații & Întreținere (EN 15459-1)</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-[10px] opacity-40">Fond anual recomandat</div>
                            <div className="text-sm font-bold text-amber-400">{maintenanceResult.annual_fund_RON?.toLocaleString("ro-RO")} RON/an</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-[10px] opacity-40">Fond acumulat 10 ani</div>
                            <div className="text-sm font-bold text-emerald-400">{maintenanceResult.fund_10y_RON?.toLocaleString("ro-RO")} RON</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3">
                            <div className="text-[10px] opacity-40">Cost per m²/an</div>
                            <div className="text-sm font-bold">{maintenanceResult.cost_per_m2_year?.toFixed(1)} RON/m²</div>
                          </div>
                        </div>
                        {maintenanceResult.components?.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {maintenanceResult.components.slice(0,5).map((c,i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                                <span className="opacity-60">{c.name}</span>
                                <span className="font-mono">{c.annual_RON?.toLocaleString("ro-RO")} RON/an</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {activeTool === "pnrr" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                        <div className="text-sm font-semibold mb-2">💶 Finanțări disponibile PNRR / Fond de Mediu</div>
                        {FUNDING_PROGRAMS.slice(0,5).map((prog, i) => {
                          const eligible = pnrrResult?.eligible?.includes(prog.id);
                          return (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${eligible ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/[0.02]"}`}>
                              <div>
                                <div className="text-xs font-semibold">{prog.name}</div>
                                <div className="text-[10px] opacity-40">{prog.description || ""} · Max: {prog.maxGrant?.toLocaleString("ro-RO")} RON</div>
                              </div>
                              <span className={`text-[10px] px-2 py-1 rounded font-bold ${eligible ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                                {eligible ? "ELIGIBIL" : "verificați"}
                              </span>
                            </div>
                          );
                        })}
                        {pnrrResult?.total_grant_RON > 0 && (
                          <div className="text-sm font-bold text-emerald-400 mt-2">Grant total estimat: {pnrrResult.total_grant_RON?.toLocaleString("ro-RO")} RON</div>
                        )}
                      </div>
                    )}
                    {activeTool === "thermal" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="text-sm font-semibold mb-3">🌡️ Hartă Termică Anvelopă</div>
                        {thermalSVG ? (
                          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: sanitizeSvg(thermalSVG) }} />
                        ) : (
                          <div className="text-center py-8 opacity-30 text-sm">Adăugați elemente de anvelopă pentru a genera harta termică.</div>
                        )}
                      </div>
                    )}
                    {/* Sprint 08may2026 — Card „Conformitate Acustică C125" ELIMINAT din Pas 7
                        (DUPLICAT cu Step 8 tab Acustic — locul canonic). */}
                  </div>
                );
              })()}

              {/* Sprint 08may2026 (followup 4) — componenta `<PasaportBasic>` plin (Pașaport Renovare
                  EPBD 2024 — Anexa VIII cu banner PREVIEW + butoane XML/PDF) ELIMINATĂ.
                  Motiv: EPBD 2024/1275 NU este transpus în drept intern RO la 8.V.2026.
                  Banner explicit „PREVIEW EPBD 2024 — fără valoare juridică în RO până la actul
                  național de transpunere. Termen transpunere națională: 29.05.2026".
                  REACTIVARE LA TRANSPUNERE EPBD RO: decomentează blocul de mai jos.
                  Helperele lib/passport-export.js + components/PasaportBasic.jsx rămân în repo. */}
              {/* ELIMINAT_PASAPORT_FULL_START
              <div className="mt-6">
                <PasaportBasic ... />
              </div>
              ELIMINAT_PASAPORT_FULL_END */}

              {/* Sprint 08may2026 (followup 4) — Card „🌱 Conformitate avansată (Sprint P0+P1)" REORGANIZAT:
                  - Step7FundingBundles → MUTAT în Pas 8 categoria 🏗️ Reabilitare (tab „Bundle finanțare 2026")
                  - Step7CostOptimalExports → MUTAT în Pas 8 categoria 🏗️ Reabilitare (tab „Curba cost-optim")
                  - Step7ManifestSigned → ELIMINAT (mock signer fără valoare juridică conform eIDAS 2;
                    utilizator PFA fără cont certSIGN B2B activ; același principiu ca PDF/A-3 + PAdES BETA
                    eliminat în commit-ul db089d2). Helper lib/dossier-extras.js păstrat pentru reactivare. */}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
                <button onClick={() => setStep(6)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 6: Certificat
                </button>
                <button onClick={() => setStep(8)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all text-sm text-amber-400">
                  Pas 8: Analiză avansată →
                </button>
              </div>
            </div>
            );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente Sprint Conformitate P1+P0 integrare (7 mai 2026)
// Sprint 08may2026 (followup 4) — exportate pentru utilizare în Step8Advanced
// (mutate din Pas 7 → Pas 8 categoria Reabilitare).
// Step7ManifestSigned rămâne ne-exportat — eliminat ca mock fără valoare juridică.
// ─────────────────────────────────────────────────────────────────────────────

export function Step7FundingBundles({ building, auditor, cpeCode, showToast }) {
  const [program, setProgram] = useState("afm-casa-eficienta");
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="text-[12px] font-semibold opacity-90">🎯 Bundle finanțare 2026</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          disabled={busy}
          className="md:col-span-2 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-[12px]">
          <option value="afm-casa-eficienta">AFM Casa Eficientă</option>
          <option value="afm-casa-verde-pv">AFM Casa Verde Fotovoltaice</option>
          <option value="por-fedr-2027">POR/FEDR 2021-2027</option>
          <option value="ftj-tranzitie-justa">FTJ Tranziție Justă (deadline 26.VIII.2026!)</option>
          <option value="modernization-fund">Modernization Fund</option>
          <option value="uat-cofinantare-bloc">UAT cofinanțare blocuri</option>
        </select>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const { generateFundingBundle } = await import("../lib/funding-bundles.js");
              await generateFundingBundle({
                programType: program,
                documents: [
                  // Bundle minim cu metadata; user adaugă manual CPE/RAE/foto via download separat
                  { folder: "00_Metadata", filename: "Zephren_metadata.json", blob: new Blob([JSON.stringify({ cpeCode, building, auditor }, null, 2)], { type: "application/json" }) },
                ],
                metadata: {
                  cpeCode,
                  building,
                  auditor,
                  applicantName: building?.owner,
                },
                download: true,
              });
              showToast?.("Bundle finanțare descărcat", "success", 3000);
            } catch (e) {
              showToast?.("Eroare bundle: " + (e?.message || ""), "error", 5000);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[12px] font-medium">
          {busy ? "⏳" : "📦 Generează"}
        </button>
      </div>
      <div className="text-[10px] opacity-60">Notă: bundle minim cu metadata. Adăugați CPE.docx, RAE, foto manual în ZIP-ul descărcat.</div>
    </div>
  );
}

export function Step7CostOptimalExports({
  building,
  cpeCode,
  showToast,
  opaqueElements = [],
  glazingElements = [],
  rehabScenarioInputs = null,
  rehabComparison = null,
  instSummary = null,
}) {
  const [busy, setBusy] = useState(false);

  // CR-5 (7 mai 2026) — pachete REALE calculate din buildCanonicalMeasures
  // pe 3 scenarii (Minim 5cm / Mediu 10cm / Maxim 15cm + HP + PV) folosind
  // ariile reale ale clădirii (opaqueElements + glazingElements). Anterior
  // erau placeholder hardcoded (35k/65k/120k RON) inconsistente cu A2/B1/B2.
  const samplePackages = useMemo(() => {
    const packages = [];
    const Au = parseFloat(building?.areaUseful) || 0;
    const epBaseline = parseFloat(instSummary?.ep_total_m2) || 0;

    // Helper: construiește un pachet din rehabScenarioInputs ad-hoc
    const buildPackage = (label, scenarioInputs, expectedReductionPct) => {
      try {
        const measures = buildCanonicalMeasures(scenarioInputs, opaqueElements, glazingElements);
        const totalCost = measures.reduce((s, m) => s + (m.costRON || 0), 0);
        if (totalCost <= 0) return null;
        // EP reduction estimat: pct × baseline (sau fallback 200 dacă lipsește)
        const epRedKwh = expectedReductionPct * (epBaseline || 200) / 100;
        // Economii anuale @ preț mediu 0.45 RON/kWh × Au
        const annualSavingsRON = epRedKwh * Au * 0.45;
        // Payback simplu (TVA 21% inclus în cost)
        const totalCostTva = totalCost * 1.21;
        const payback = annualSavingsRON > 0 ? totalCostTva / annualSavingsRON : null;
        // NPV simplificat: economii cumulate 25 ani la rata 4%
        const pvFactor = (1 - Math.pow(1.04, -25)) / 0.04; // ~15.62
        const npv = annualSavingsRON * pvFactor - totalCostTva;
        return {
          label,
          totalCost: Math.round(totalCost),
          npv: Math.round(npv),
          paybackYears: payback ? Math.round(payback * 10) / 10 : null,
          epReduction: expectedReductionPct,
        };
      } catch { return null; }
    };

    // Scenariu MINIM — izolație pereți 5cm
    const minPkg = buildPackage("Minim — izolație 5cm",
      { addInsulWall: true, insulWallThickness: 5 }, 20);
    if (minPkg) packages.push(minPkg);

    // Scenariu MEDIU — izolație 10cm + ferestre Low-E
    const medPkg = buildPackage("Mediu — izolație 10cm + ferestre",
      { addInsulWall: true, insulWallThickness: 10,
        replaceWindows: true, newWindowU: 1.10 }, 40);
    if (medPkg) packages.push(medPkg);

    // Scenariu MAXIM — izolație 15cm + HP + PV
    const maxPkg = buildPackage("Maxim — izolație 15cm + HP + PV",
      { addInsulWall: true, insulWallThickness: 15,
        replaceWindows: true, newWindowU: 0.90,
        addInsulRoof: true, insulRoofThickness: 20,
        addHP: true, hpCOP: 4.5, hpPower: 6,
        addPV: true, pvArea: 20 }, 65);
    if (maxPkg) packages.push(maxPkg);

    // Fallback la placeholder DOAR dacă niciun scenariu nu produce date reale
    // (ex: building gol / opaqueElements lipsă în Step 2).
    if (packages.length === 0) {
      return [
        { label: "Minim — izolație 5cm", totalCost: 35000, npv: 12000, paybackYears: 8.5, epReduction: 25 },
        { label: "Mediu — izolație 10cm + ferestre", totalCost: 65000, npv: 28000, paybackYears: 6.2, epReduction: 45 },
        { label: "Maxim — izolație 15cm + HP + PV", totalCost: 120000, npv: 45000, paybackYears: 9.8, epReduction: 70 },
      ];
    }
    return packages;
  }, [building, opaqueElements, glazingElements, instSummary]);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="text-[12px] font-semibold opacity-90">📈 Curba cost-optim (Reg. UE 244/2012)</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const { exportCostOptimalPdf } = await import("../lib/cost-optimal-export.js");
              await exportCostOptimalPdf({ packages: samplePackages, building, cpeCode });
              showToast?.("PDF cost-optim descărcat", "success", 3000);
            } catch (e) {
              showToast?.("Eroare: " + (e?.message || ""), "error", 4000);
            } finally { setBusy(false); }
          }}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-[12px] font-medium">
          📄 PDF
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const { exportCostOptimalXlsx } = await import("../lib/cost-optimal-export.js");
              await exportCostOptimalXlsx({ packages: samplePackages, building, cpeCode });
              showToast?.("XLSX cost-optim descărcat", "success", 3000);
            } catch (e) {
              showToast?.("Eroare: " + (e?.message || ""), "error", 4000);
            } finally { setBusy(false); }
          }}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-200 text-[12px] font-medium">
          📊 XLSX (3 sheets)
        </button>
      </div>
    </div>
  );
}

function Step7ManifestSigned({ building, auditor, cpeCode, showToast }) {
  const [provider, setProvider] = useState("mock");
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="text-[12px] font-semibold opacity-90">🔐 Manifest semnat CAdES B-T (alternativ la TXT)</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={busy}
          className="md:col-span-2 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-[12px]">
          <option value="mock">Mock (testing pilot)</option>
          <option value="certsign">certSIGN PARAPHE (necesită env)</option>
        </select>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const { generateManifestSHA256Signed } = await import("../lib/dossier-extras.js");
              await generateManifestSHA256Signed({
                files: [
                  // Files placeholder — user adaugă DOCX-urile reale din butoanele anterioare
                  { name: "dosar.placeholder", blob: new Blob([JSON.stringify({ cpeCode, generatedAt: new Date().toISOString() })], { type: "application/json" }) },
                ],
                auditor,
                building,
                cpeCode,
                signerConfig: { provider },
                download: true,
              });
              showToast?.("Manifest semnat (.txt + .p7s) descărcat ZIP", "success", 3500);
            } catch (e) {
              showToast?.("Eroare: " + (e?.message || ""), "error", 5000);
            } finally { setBusy(false); }
          }}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 text-[12px] font-medium">
          {busy ? "⏳" : "🔐 Semnează"}
        </button>
      </div>
      <div className="text-[10px] opacity-60">Output ZIP cu manifest.txt + manifest.txt.p7s + README. Art. 11 Ord. 348/2026.</div>
    </div>
  );
}
