import React, { useState, useMemo } from "react";
import BuildingPhotos from "../components/BuildingPhotos.jsx";
import LCCAnalysis from "../components/LCCAnalysis.jsx";
import MEPSCheck from "../components/MEPSCheck.jsx";
import OfertaReabilitare from "../components/OfertaReabilitare.jsx";
import ConsumReconciliere from "../components/ConsumReconciliere.jsx";
import { calcMaintenanceFund, BUILDING_COMPONENTS } from "../calc/maintenance-fund.js";
import { calcPNRRFunding, FUNDING_PROGRAMS } from "../calc/pnrr-funding.js";
import { generateThermalMapSVG } from "../calc/thermal-map.js";
import { checkAcousticConformity } from "../calc/acoustic.js";
import { cn, Select, Input, Badge, Card, ResultRow } from "../components/ui.jsx";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { getNzebEpMax } from "../calc/smart-rehab.js";
import { calcOpaqueR } from "../calc/opaque.js";
import { calcSRI, SRI_DOMAINS, CHP_TYPES, IEQ_CATEGORIES, RENOVATION_STAGES, MCCL_CATALOG } from "../calc/epbd.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB, NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { ZEB_THRESHOLDS, ZEB_FACTOR, U_REF_GLAZING, getURefNZEB } from "../data/u-reference.js";
import { CATEGORY_BASE_MAP, BUILDING_CATEGORIES, ELEMENT_TYPES } from "../data/building-catalog.js";
import { FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL } from "../data/constants.js";
import { REHAB_COSTS } from "../data/rehab-costs.js";
import { T } from "../data/translations.js";

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
    generateAuditReport, exportXML, exportPDFNative, exportFullReport, exportBulkProjects, exportExcelFull,
    setThermalBridges,
  } = props;
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

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
                const uRef = el.type === "PE" ? 0.56 : el.type === "PSol" ? 0.40 : el.type === "PlanInt" ? 0.50 : el.type === "PlanExt" ? 0.20 : el.type === "Acoperiș" ? 0.20 : 0.35;
                items.push({
                  name: el.name || elType?.label || el.type,
                  type: "opac",
                  area,
                  u: u,
                  uRef,
                  loss,
                  needsUpgrade: u > uRef * 1.2,
                  potential: u > uRef ? ((u - uRef) * area * tau) : 0,
                  recommendation: u > uRef * 1.5 ? "Termoizolare urgenta" : u > uRef ? "Termoizolare recomandata" : "Conform",
                  priority: u > uRef * 1.5 ? 1 : u > uRef ? 2 : 3,
                });
              });

              glazingElements.forEach(el => {
                const area = parseFloat(el.area) || 0;
                const u = parseFloat(el.u) || 0;
                const uRef = 1.30; // Mc 001 ref pt tamplarie
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
              const annualCostSaving = qfSaved * 0.15; // ~0.15 EUR/kWh average
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
                    <div className="text-sm">Completeaza pasii 1–6 pentru a genera recomandari de reabilitare</div>
                    <div className="text-xs mt-2">Sunt necesare: suprafata utila, anvelopa, instalatii si calcul energetic</div>
                  </div>
                </Card>
              ) : (
              <div className="space-y-5">


                {/* ── Radar performanță ── */}
                {instSummary && envelopeSummary && (
                <Card title={t("Radar performanță energetică",lang)}>
                  <svg viewBox="0 0 240 220" width="240" height="200" className="mx-auto block">
                    {(() => {
                      var cx=120,cy=105,mR=80;
                      var axes=[{l:"Anvelopa",v:Math.min(100,Math.max(0,100-envelopeSummary.G*120))},{l:"Încălzire",v:Math.min(100,(instSummary.eta_total_h||0)*100)},{l:"ACM",v:Math.min(100,(instSummary.eta_acm||0.85)*100)},{l:"Ventilare",v:Math.min(100,instSummary.hrEta>0?instSummary.hrEta*110:30)},{l:"Regenerabile",v:Math.min(100,(renewSummary?renewSummary.rer:0)*1.5)}];
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


                {/* ── Analiză amortizare investiție 20 ani ── */}
                {rehabScenario && instSummary && (
                <Card title={lang==="EN"?"20-Year Investment Amortization":"Amortizare investiție 20 ani"}>
                  <svg viewBox="0 0 400 160" width="100%" height="140">
                    {(() => {
                      var costTotal = rehabScenario.costTotal || 30000;
                      var annualSaving = Math.max(100, (instSummary.qf_total - (rehabScenario.qfRehab||instSummary.qf_total*0.6)) * 0.15);
                      var discountRate = 0.03;
                      var energyInflation = 0.05;
                      var years = 20, data = [], cumCash = -costTotal, cumNPV = -costTotal;
                      for (var y = 0; y <= years; y++) {
                        var saving = y === 0 ? 0 : annualSaving * Math.pow(1 + energyInflation, y - 1);
                        cumCash += saving;
                        cumNPV += y === 0 ? 0 : saving / Math.pow(1 + discountRate, y);
                        data.push({y:y, cumCash:cumCash, cumNPV:cumNPV - costTotal + costTotal});
                      }
                      var minV = Math.min.apply(null, data.map(function(d){return Math.min(d.cumCash,d.cumNPV)}));
                      var maxV = Math.max.apply(null, data.map(function(d){return Math.max(d.cumCash,d.cumNPV)}));
                      var range = Math.max(maxV - minV, 1);
                      var oX = 40, cW = 340, cH = 110, bY = 140;
                      var els = [];
                      // Zero line
                      var zeroY = bY - ((0 - minV) / range) * cH;
                      els.push(<line key="z" x1={oX} y1={zeroY} x2={oX+cW} y2={zeroY} stroke="#666" strokeWidth="0.5" strokeDasharray="3 2"/>);
                      els.push(<text key="zt" x={oX-4} y={zeroY+3} textAnchor="end" fontSize="6" fill="#888">0</text>);
                      // Cash flow line
                      var cashPts = data.map(function(d,i){return (oX+i*cW/years)+","+(bY-((d.cumCash-minV)/range)*cH)}).join(" ");
                      els.push(<polyline key="cf" points={cashPts} fill="none" stroke="#22c55e" strokeWidth="2"/>);
                      // Payback marker
                      for (var pi = 1; pi < data.length; pi++) {
                        if (data[pi-1].cumCash < 0 && data[pi].cumCash >= 0) {
                          var px = oX + pi * cW / years;
                          els.push(<circle key="pb" cx={px} cy={zeroY} r="4" fill="#22c55e"/>);
                          els.push(<text key="pbt" x={px} y={zeroY-8} textAnchor="middle" fontSize="7" fill="#22c55e" fontWeight="bold">An {pi}</text>);
                          break;
                        }
                      }
                      // Labels
                      els.push(<text key="y0" x={oX} y={bY+10} fontSize="6" fill="#888">0</text>);
                      els.push(<text key="y20" x={oX+cW} y={bY+10} textAnchor="end" fontSize="6" fill="#888">20 ani</text>);
                      els.push(<text key="ti" x={200} y={12} textAnchor="middle" fontSize="7" fill="#22c55e">Flux cumulat (verde) | Economie: {annualSaving.toFixed(0)} EUR/an | Cost: {costTotal.toFixed(0)} EUR</text>);
                      return els;
                    })()}
                  </svg>
                </Card>
                )}

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
                          {financialAnalysis.paybackDiscounted !== null ? financialAnalysis.paybackDiscounted : "—"}
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

                {/* ═══ NEW: COMPARAȚIE MULTI-SCENARIU (C4) ═══ */}
                <Card title={t("Comparație scenarii reabilitare",lang)} badge={<Badge color="purple">{multiScenarios.length} scenarii</Badge>}>
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

              {/* #13 Deviz estimativ reabilitare */}
              <button onClick={() => {
                if (!rehabComparison) { showToast("Configurați scenariul de reabilitare în Pasul 5", "error"); return; }
                const ri = rehabScenarioInputs;
                const lines = [];
                lines.push("DEVIZ ESTIMATIV REABILITARE ENERGETICĂ");
                lines.push("Clădire: " + (building.address || "—") + ", " + (building.city || "—"));
                lines.push("Data: " + new Date().toLocaleDateString("ro-RO"));
                lines.push("Auditor: " + (auditor.name || "—") + " / " + (auditor.atestat || "—"));
                lines.push("─".repeat(60));
                lines.push("Nr. | Măsură | Cantitate | Preț unitar | Total estimat");
                lines.push("─".repeat(60));
                let nr = 1, totalInv = 0;
                const Au = parseFloat(building.areaUseful) || 0;
                if (ri.addInsulWall) { const c = Au * 3.5 * 45; totalInv += c; lines.push(nr++ + " | Termoizolație pereți ETICS " + ri.insulWallThickness + "cm | " + (Au*3.5).toFixed(0) + " m² | 45 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addInsulRoof) { const c = Au * 1.1 * 35; totalInv += c; lines.push(nr++ + " | Termoizolație acoperiș " + ri.insulRoofThickness + "cm | " + (Au*1.1).toFixed(0) + " m² | 35 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addInsulBasement) { const c = Au * 25; totalInv += c; lines.push(nr++ + " | Izolație planșeu subsol " + ri.insulBasementThickness + "cm | " + Au.toFixed(0) + " m² | 25 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.replaceWindows) { const wArea = glazingElements.reduce((s,e) => s + (parseFloat(e.area)||0), 0); const c = wArea * 280; totalInv += c; lines.push(nr++ + " | Înlocuire tâmplărie (U=" + ri.newWindowU + ") | " + wArea.toFixed(1) + " m² | 280 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addHR) { const c = Au * 12; totalInv += c; lines.push(nr++ + " | Ventilare mecanică cu HR " + ri.hrEfficiency + "% | 1 buc | " + (Au*12).toFixed(0) + " € | " + c.toFixed(0) + " €"); }
                if (ri.addPV) { const c = parseFloat(ri.pvArea||0) * 350; totalInv += c; lines.push(nr++ + " | Panouri PV " + ri.pvArea + " m² | " + ri.pvArea + " m² | 350 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addHP) { const c = Au * 55; totalInv += c; lines.push(nr++ + " | Pompă de căldură COP=" + ri.hpCOP + " | 1 buc | " + (Au*55).toFixed(0) + " € | " + c.toFixed(0) + " €"); }
                if (ri.addSolarTh) { const c = parseFloat(ri.solarThArea||0) * 500; totalInv += c; lines.push(nr++ + " | Solar termic " + ri.solarThArea + " m² | " + ri.solarThArea + " m² | 500 €/m² | " + c.toFixed(0) + " €"); }
                lines.push("─".repeat(60));
                lines.push("TOTAL INVESTIȚIE ESTIMATĂ: " + totalInv.toFixed(0) + " € (fără TVA)");
                lines.push("TVA 19%: " + (totalInv * 0.19).toFixed(0) + " €");
                lines.push("TOTAL CU TVA: " + (totalInv * 1.19).toFixed(0) + " €");
                lines.push("");
                lines.push("Economie anuală estimată: " + (rehabComparison.savings.qfSaved * 0.12).toFixed(0) + " €/an");
                lines.push("Termen recuperare simplu: " + (totalInv / Math.max(1, rehabComparison.savings.qfSaved * 0.12)).toFixed(1) + " ani");
                lines.push("");
                lines.push("Notă: Prețurile sunt estimative (2025-2026, fără TVA) și pot varia ±30% în funcție de zonă, furnizor și complexitatea lucrărilor.");
                const blob = new Blob([lines.join("\n")], {type:"text/plain;charset=utf-8"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "Deviz_estimativ_" + (building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25) + ".txt";
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                showToast("Deviz estimativ descărcat", "success");
              }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/80 hover:bg-amber-500/10 transition-all text-sm mt-4">
                <span>📋</span> Generează deviz estimativ reabilitare (.txt)
              </button>

              {/* ═══ NEW EXPORT BUTTONS ═══ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
                <button onClick={generateAuditReport}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-xs">
                  <span>📝</span> Raport audit (.txt)
                </button>
                <button onClick={exportXML}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 hover:bg-emerald-500/10 transition-all text-xs">
                  <span>📄</span> Export XML MDLPA
                </button>
                <button onClick={() => {
                  showToast("Înregistrare MDLPA: API-ul registrului electronic nu este încă disponibil public. XML-ul a fost exportat local — îl puteți încărca manual pe platforma MDLPA când devine activă.", "info", 8000);
                  if (typeof exportXML === "function") exportXML();
                }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-violet-400/80 hover:bg-violet-500/10 transition-all text-xs">
                  <span>🏛️</span> Upload MDLPA
                </button>
                <button onClick={exportPDFNative}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-400/80 hover:bg-sky-500/10 transition-all text-xs">
                  <span>📑</span> Export PDF certificat
                </button>
                <button onClick={exportExcelFull}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-green-500/20 bg-green-500/5 text-green-400/80 hover:bg-green-500/10 transition-all text-xs">
                  <span>📊</span> Export Excel complet
                </button>
                <button onClick={exportFullReport}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 hover:bg-emerald-500/10 transition-all text-xs">
                  <span>📊</span> Raport tehnic complet PDF
                </button>
                <button onClick={exportBulkProjects}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-violet-400/80 hover:bg-violet-500/10 transition-all text-xs">
                  <span>📦</span> Export bulk proiecte
                </button>
              </div>

              {/* Simulare what-if interactivă */}
              {instSummary && (() => {
                const [simInsul, setSimInsul] = React.useState(10);
                const [simWindow, setSimWindow] = React.useState(1.0);
                const [simPV, setSimPV] = React.useState(0);
                const baseEp = epFinal;
                // Estimare simplificată impact
                const insulImpact = (simInsul - 5) * 1.5; // fiecare cm peste 5cm reduce ~1.5 kWh/m²
                const windowImpact = (1.4 - simWindow) * 15; // fiecare 0.1 U reducere ~1.5 kWh/m²
                const pvImpact = simPV * 1.1; // fiecare m² PV produce ~1.1 kWh/m²·an specific
                const simEp = Math.max(10, baseEp - insulImpact - windowImpact - pvImpact);
                const simClass = getEnergyClass(simEp, catKey);
                const savings = baseEp - simEp;
                const savingsEur = savings * Au * 0.12 / 4.97; // ~0.12 EUR/kWh
                return (
                  <Card title="Simulare what-if — impact reabilitare" className="mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] opacity-50 block mb-1">Grosime izolație pereți [cm]</label>
                        <input type="range" min="0" max="25" value={simInsul} onChange={e => setSimInsul(+e.target.value)} className="w-full" />
                        <div className="text-xs font-mono text-center">{simInsul} cm</div>
                      </div>
                      <div>
                        <label className="text-[10px] opacity-50 block mb-1">U ferestre [W/(m²·K)]</label>
                        <input type="range" min="0.6" max="2.5" step="0.1" value={simWindow} onChange={e => setSimWindow(+e.target.value)} className="w-full" />
                        <div className="text-xs font-mono text-center">{simWindow.toFixed(1)}</div>
                      </div>
                      <div>
                        <label className="text-[10px] opacity-50 block mb-1">Suprafață PV [m²]</label>
                        <input type="range" min="0" max="100" value={simPV} onChange={e => setSimPV(+e.target.value)} className="w-full" />
                        <div className="text-xs font-mono text-center">{simPV} m²</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold" style={{color:simClass.color}}>{simClass.cls}</div>
                        <div className="text-[10px] opacity-40">Clasă simulată</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-emerald-400">{simEp.toFixed(0)}</div>
                        <div className="text-[10px] opacity-40">EP simulat</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-amber-400">-{savings.toFixed(0)}</div>
                        <div className="text-[10px] opacity-40">kWh/(m²·an)</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-emerald-400">~{savingsEur.toFixed(0)}</div>
                        <div className="text-[10px] opacity-40">EUR/an economii</div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* ── SRI — Smart Readiness Indicator ── */}
              {instSummary && (() => {
                const sri = calcSRI(heating, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, heating.bacsClass || "D");
                const gradeColors = {A:"#22c55e",B:"#84cc16",C:"#eab308",D:"#ef4444"};
                return (
                  <Card title="Smart Readiness Indicator (SRI) — EPBD 2024/1275" className="mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black" style={{background:gradeColors[sri.grade]+"20",color:gradeColors[sri.grade],border:"2px solid "+gradeColors[sri.grade]}}>{sri.grade}</div>
                      <div>
                        <div className="text-xl font-bold">{sri.total}%</div>
                        <div className="text-[10px] opacity-40">Scor total Smart Readiness</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {SRI_DOMAINS.map(d => (
                        <div key={d.id}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="opacity-60">{d.label} ({Math.round(d.weight*100)}%)</span>
                            <span className="font-mono">{sri.scores[d.id]}%</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{width:sri.scores[d.id]+"%"}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}

              {/* ── Pașaport de Renovare (EPBD Art.12) ── */}
              {instSummary && (
                <Card title="Pașaport de Renovare — Foaie de parcurs etapizată" className="mb-4">
                  <div className="space-y-3">
                    {RENOVATION_STAGES.map((stage, si) => {
                      const epReductions = [0, 20, 40, 60]; // % reducere EP estimat per etapă
                      const targetEp = Math.max(10, epFinal * (1 - epReductions[si] / 100));
                      const targetClass = getEnergyClass(targetEp, catKey);
                      return (
                        <div key={stage.id} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{background:targetClass.color+"30",color:targetClass.color}}>{si+1}</div>
                            {si < 3 && <div className="w-0.5 h-8 bg-white/10" />}
                          </div>
                          <div className="flex-1 bg-white/[0.03] rounded-lg p-3 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold">{stage.label}</span>
                              <span className="text-[10px] font-mono" style={{color:targetClass.color}}>→ {targetClass.cls} ({targetEp.toFixed(0)} kWh/m²)</span>
                            </div>
                            <div className="text-[10px] opacity-40">{stage.measures.join(" • ")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-[10px] opacity-30">Conform EPBD 2024/1275 Art.12, Anexa VIII — Building Renovation Passport</div>
                </Card>
              )}

              {/* ── MEPI — Consum calculat vs real ── */}
              <Card title="MEPI — Consum calculat vs. facturi reale" className="mb-4">
                <div className="space-y-2">
                  <div className="text-xs opacity-50 mb-2">Introduceți consumul real din facturi pentru validarea modelului energetic</div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="font-bold opacity-40">Utilitate</div>
                    <div className="font-bold opacity-40">Calculat [kWh/an]</div>
                    <div className="font-bold opacity-40">Real [kWh/an]</div>
                    {[{label:"Electricitate",calc:instSummary?(instSummary.qf_c+instSummary.qf_v+instSummary.qf_l):0},
                      {label:"Gaz/termic",calc:instSummary?(instSummary.qf_h+instSummary.qf_w):0}
                    ].map(u => (
                      <React.Fragment key={u.label}>
                        <div className="opacity-60">{u.label}</div>
                        <div className="font-mono">{u.calc.toFixed(0)}</div>
                        <input type="number" placeholder="din facturi" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-amber-500/50" />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </Card>

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
              <Card title="MCCL — Catalog ponți termice ({MCCL_CATALOG.length} tipuri)" className="mb-4">
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

              {/* ── Vizualizare 3D detaliată (SVG isometric) ── */}
              {building.areaUseful && building.floors && (
                <Card title="VIZUALIZARE 3D CLĂDIRE" className="mb-4">
                  {(() => {
                    const au = parseFloat(building.areaUseful) || 100;
                    const perim = parseFloat(building.perimeter) || 0;
                    const fStr = building.floors || "P";

                    // Parse floor string (e.g., "2S+P+4E+M")
                    const nSubs = (() => { const m = fStr.match(/(\d+)S/); return m ? parseInt(m[1]) : (fStr.includes("S") ? 1 : 0); })();
                    const nAbove = (() => { const m = fStr.match(/\+(\d+)E/); return m ? parseInt(m[1]) : 0; })();
                    const hasMans = fStr.includes("M");
                    const nFloors = 1 + nAbove;
                    const hasPitch = building.category === "RI" || (hasMans && !["RC","BI","ED","SA","HC","CO"].includes(building.category));
                    const isApartBlock = ["RC","RA"].includes(building.category);

                    // Building footprint from perimeter + area
                    const footprint = au / Math.max(1, nFloors + (hasMans ? 1 : 0));
                    let WW, DD;
                    if (perim > 4) {
                      const half = perim / 2;
                      const disc = half * half / 4 - footprint;
                      if (disc >= 0 && Math.sqrt(Math.max(0,disc)) < half / 2) {
                        WW = half / 2 + Math.sqrt(Math.max(0, disc));
                        DD = half / 2 - Math.sqrt(Math.max(0, disc));
                      } else {
                        WW = Math.sqrt(footprint) * 1.6;
                        DD = Math.sqrt(footprint) * 0.62;
                      }
                    } else {
                      WW = Math.sqrt(footprint) * 1.6;
                      DD = Math.sqrt(footprint) * 0.62;
                    }
                    if (WW / DD > 5) WW = DD * 5;
                    if (DD / WW > 3) DD = WW * 3;

                    const flH = 3.0;
                    const bH = nFloors * flH;
                    const sH = nSubs * flH;
                    const mansH = hasMans ? flH * 0.75 : 0;
                    const totalH = bH + mansH;

                    // Adaptive scale to fit SVG
                    const SVG_W = 560, SVG_H = 370;
                    const maxHoriz = WW + DD;
                    const maxVert = totalH + sH + 3;
                    const sc = Math.min(11, 280 / maxHoriz, 230 / maxVert);
                    const cx = SVG_W * 0.40, cy = SVG_H * 0.60;

                    // Isometric projection (30° angle)
                    const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
                    const px = (x, y) => cx + (x - y) * C30 * sc;
                    const py = (x, y, z) => cy - (x + y) * S30 * sc - z * sc;
                    const P = (x, y, z) => `${px(x,y)},${py(x,y,z)}`;

                    const ec = enClass.color;
                    const isDark = theme === "dark";

                    // Glazing ratio → window size
                    const totalGlaz = glazingElements?.reduce((s, e) => s + (parseFloat(e.area) || 0), 0) || 0;
                    const wallArea = 2 * (WW + DD) * flH * nFloors;
                    const glazR = Math.min(0.48, Math.max(0.06, totalGlaz / Math.max(1, wallArea)));
                    const winH = flH * Math.min(0.58, glazR * 1.8 + 0.12);

                    const nWF = Math.max(1, Math.min(9, Math.round(WW / 3.2)));
                    const nWS = Math.max(1, Math.min(7, Math.round(DD / 3.2)));
                    const stepF = WW / (nWF + 1);
                    const stepS = DD / (nWS + 1);

                    const parts = [];

                    // Ground shadow
                    parts.push(<ellipse key="shadow"
                      cx={px(WW/2, DD/2)} cy={py(WW/2, DD/2, -sH > 0 ? -sH : 0) + sc * 0.3}
                      rx={(WW + DD) * sc * 0.52 * C30} ry={(WW + DD) * sc * 0.18}
                      fill="rgba(0,0,0,0.32)" />);

                    // Basement levels
                    for (let s = nSubs; s > 0; s--) {
                      const z0 = -(nSubs - s + 1) * flH, z1 = z0 + flH;
                      parts.push(
                        <polygon key={`bf${s}`}
                          points={`${P(0,0,z0)} ${P(WW,0,z0)} ${P(WW,0,z1)} ${P(0,0,z1)}`}
                          fill={isDark ? "rgba(40,45,62,0.88)" : "rgba(175,175,195,0.75)"}
                          stroke="rgba(100,110,140,0.5)" strokeWidth="0.8" />,
                        <polygon key={`bs${s}`}
                          points={`${P(WW,0,z0)} ${P(WW,DD,z0)} ${P(WW,DD,z1)} ${P(WW,0,z1)}`}
                          fill={isDark ? "rgba(30,34,50,0.88)" : "rgba(155,155,175,0.75)"}
                          stroke="rgba(90,100,130,0.4)" strokeWidth="0.5" />
                      );
                      // Small basement windows
                      for (let w = 0; w < nWF; w++) {
                        const xl = stepF*(w+0.3), xr = stepF*(w+0.7);
                        const zw0 = z0+flH*0.3, zw1 = z0+flH*0.65;
                        parts.push(<polygon key={`bw${s}${w}`}
                          points={`${P(xl,0,zw0)} ${P(xr,0,zw0)} ${P(xr,0,zw1)} ${P(xl,0,zw1)}`}
                          fill="rgba(140,180,210,0.22)" stroke="rgba(150,200,230,0.38)" strokeWidth="0.5"/>);
                      }
                    }

                    // Main walls — front (Y=0) and side (X=WW)
                    parts.push(
                      <polygon key="wf"
                        points={`${P(0,0,0)} ${P(WW,0,0)} ${P(WW,0,bH)} ${P(0,0,bH)}`}
                        fill={ec+"36"} stroke={ec} strokeWidth="1.6" />,
                      <polygon key="ws"
                        points={`${P(WW,0,0)} ${P(WW,DD,0)} ${P(WW,DD,bH)} ${P(WW,0,bH)}`}
                        fill={ec+"1E"} stroke={ec} strokeWidth="1.0" strokeOpacity="0.7" />
                    );

                    // Floor lines
                    for (let f = 1; f < nFloors; f++) {
                      const z = f * flH;
                      parts.push(
                        <line key={`lf${f}`} x1={px(0,0)} y1={py(0,0,z)} x2={px(WW,0)} y2={py(WW,0,z)}
                          stroke={ec} strokeWidth="0.8" strokeOpacity="0.45"/>,
                        <line key={`ls${f}`} x1={px(WW,0)} y1={py(WW,0,z)} x2={px(WW,DD)} y2={py(WW,DD,z)}
                          stroke={ec} strokeWidth="0.5" strokeOpacity="0.28"/>
                      );
                    }

                    // Vertical corner lines (structural columns suggestion)
                    const colStep = WW / Math.max(1, nWF);
                    for (let c = 1; c < nWF; c++) {
                      const xc = colStep * c;
                      parts.push(<line key={`col${c}`}
                        x1={px(xc,0)} y1={py(xc,0,0)} x2={px(xc,0)} y2={py(xc,0,bH)}
                        stroke={ec} strokeWidth="0.35" strokeOpacity="0.2"/>);
                    }

                    // Windows — front face (skip ground floor position 0 = door)
                    for (let f = 0; f < nFloors; f++) {
                      const zb = f*flH + flH*0.18, zt = zb + winH;
                      for (let w = 0; w < nWF; w++) {
                        if (f === 0 && w === 0) continue; // door slot
                        const xl = stepF*(w+0.22), xr = stepF*(w+0.78);
                        parts.push(
                          <polygon key={`wf${f}${w}`}
                            points={`${P(xl,0,zb)} ${P(xr,0,zb)} ${P(xr,0,zt)} ${P(xl,0,zt)}`}
                            fill="rgba(130,205,255,0.38)" stroke="rgba(160,225,255,0.65)" strokeWidth="0.75"/>,
                          <line key={`wfm${f}${w}`}
                            x1={px((xl+xr)/2,0)} y1={py((xl+xr)/2,0,zb)}
                            x2={px((xl+xr)/2,0)} y2={py((xl+xr)/2,0,zt)}
                            stroke="rgba(160,225,255,0.3)" strokeWidth="0.4"/>
                        );
                      }
                    }

                    // Windows — side face
                    for (let f = 0; f < nFloors; f++) {
                      const zb = f*flH + flH*0.18, zt = zb + winH;
                      for (let w = 0; w < nWS; w++) {
                        const yl = stepS*(w+0.22), yr = stepS*(w+0.78);
                        parts.push(<polygon key={`ws${f}${w}`}
                          points={`${P(WW,yl,zb)} ${P(WW,yr,zb)} ${P(WW,yr,zt)} ${P(WW,yl,zt)}`}
                          fill="rgba(100,170,220,0.2)" stroke="rgba(130,195,235,0.4)" strokeWidth="0.5"/>);
                      }
                    }

                    // Door — ground floor, front face
                    const dX0 = stepF * 0.18, dX1 = stepF * 0.82, dH = flH * 0.72;
                    parts.push(
                      <polygon key="door"
                        points={`${P(dX0,0,0)} ${P(dX1,0,0)} ${P(dX1,0,dH)} ${P(dX0,0,dH)}`}
                        fill={isDark ? "rgba(55,42,28,0.9)" : "rgba(110,80,50,0.85)"}
                        stroke="rgba(155,115,75,0.75)" strokeWidth="1.0"/>,
                      <line key="door-v"
                        x1={px((dX0+dX1)/2,0)} y1={py((dX0+dX1)/2,0,0)}
                        x2={px((dX0+dX1)/2,0)} y2={py((dX0+dX1)/2,0,dH)}
                        stroke="rgba(155,115,75,0.4)" strokeWidth="0.5"/>,
                      <polygon key="door-step"
                        points={`${P(dX0-0.25,0,0)} ${P(dX1+0.25,0,0)} ${P(dX1+0.25,-0.55,0)} ${P(dX0-0.25,-0.55,0)}`}
                        fill={isDark ? "rgba(70,60,50,0.65)" : "rgba(140,120,100,0.65)"}
                        stroke="rgba(140,110,85,0.4)" strokeWidth="0.5"/>
                    );

                    // Balconies for apartment blocks
                    if (isApartBlock && nFloors >= 3) {
                      const bW = WW * 0.30, bX = WW * 0.18, bD2 = 1.35;
                      for (let f = 1; f < nFloors; f++) {
                        const z = f * flH;
                        parts.push(
                          <polygon key={`balt${f}`}
                            points={`${P(bX,-bD2,z)} ${P(bX+bW,-bD2,z)} ${P(bX+bW,0,z)} ${P(bX,0,z)}`}
                            fill={ec+"22"} stroke={ec} strokeWidth="0.7" strokeOpacity="0.5"/>,
                          <polygon key={`balf${f}`}
                            points={`${P(bX,-bD2,z-0.05)} ${P(bX+bW,-bD2,z-0.05)} ${P(bX+bW,-bD2,z+0.85)} ${P(bX,-bD2,z+0.85)}`}
                            fill={ec+"12"} stroke={ec} strokeWidth="0.6" strokeOpacity="0.38"/>
                        );
                      }
                    }

                    // Mansardă level
                    if (hasMans) {
                      const ins = Math.min(WW*0.12, 2.0), insD = Math.min(DD*0.10, 1.5);
                      parts.push(
                        <polygon key="mf"
                          points={`${P(ins,0,bH)} ${P(WW-ins,0,bH)} ${P(WW-ins,0,bH+mansH)} ${P(ins,0,bH+mansH)}`}
                          fill={ec+"2A"} stroke={ec} strokeWidth="1.0" strokeOpacity="0.75"/>,
                        <polygon key="ms"
                          points={`${P(WW-ins,0,bH)} ${P(WW-ins,DD-insD,bH)} ${P(WW-ins,DD-insD,bH+mansH)} ${P(WW-ins,0,bH+mansH)}`}
                          fill={ec+"18"} stroke={ec} strokeWidth="0.7" strokeOpacity="0.5"/>,
                        <polygon key="mt"
                          points={`${P(ins,0,bH+mansH)} ${P(WW-ins,0,bH+mansH)} ${P(WW-ins,DD-insD,bH+mansH)} ${P(ins,DD-insD,bH+mansH)}`}
                          fill={ec+"20"} stroke={ec} strokeWidth="0.8" strokeOpacity="0.55"/>
                      );
                      // Dormer window
                      const mwX = WW/2 - WW*0.09, mwX2 = WW/2 + WW*0.09;
                      parts.push(<polygon key="mwin"
                        points={`${P(mwX,0,bH+mansH*0.1)} ${P(mwX2,0,bH+mansH*0.1)} ${P(mwX2,0,bH+mansH*0.8)} ${P(mwX,0,bH+mansH*0.8)}`}
                        fill="rgba(130,205,255,0.28)" stroke="rgba(160,220,255,0.5)" strokeWidth="0.6"/>);
                    }

                    // Roof
                    if (hasPitch) {
                      const rX = WW/2, rH = totalH + Math.min(WW,DD) * 0.40;
                      parts.push(
                        <polygon key="rf-back"
                          points={`${P(0,0,totalH)} ${P(0,DD,totalH)} ${P(rX,DD,rH)} ${P(rX,0,rH)}`}
                          fill={ec+"12"} stroke={ec} strokeWidth="0.6" strokeOpacity="0.4"/>,
                        <polygon key="rf-side"
                          points={`${P(WW,0,totalH)} ${P(WW,DD,totalH)} ${P(rX,DD,rH)} ${P(rX,0,rH)}`}
                          fill={ec+"26"} stroke={ec} strokeWidth="1.0" strokeOpacity="0.65"/>,
                        <polygon key="rf-gable"
                          points={`${P(0,0,totalH)} ${P(WW,0,totalH)} ${P(rX,0,rH)}`}
                          fill={ec+"38"} stroke={ec} strokeWidth="1.4"/>,
                        <line key="rf-ridge"
                          x1={px(rX,0)} y1={py(rX,0,rH)} x2={px(rX,DD)} y2={py(rX,DD,rH)}
                          stroke={ec} strokeWidth="1.8"/>
                      );
                    } else {
                      // Flat roof + parapet
                      const pH = 0.52;
                      parts.push(
                        <polygon key="rf-top"
                          points={`${P(0,0,totalH)} ${P(WW,0,totalH)} ${P(WW,DD,totalH)} ${P(0,DD,totalH)}`}
                          fill={ec+"20"} stroke={ec} strokeWidth="1.1"/>,
                        <polygon key="rf-par-f"
                          points={`${P(0,0,totalH)} ${P(WW,0,totalH)} ${P(WW,0,totalH+pH)} ${P(0,0,totalH+pH)}`}
                          fill={ec+"44"} stroke={ec} strokeWidth="1.1"/>,
                        <polygon key="rf-par-s"
                          points={`${P(WW,0,totalH)} ${P(WW,DD,totalH)} ${P(WW,DD,totalH+pH)} ${P(WW,0,totalH+pH)}`}
                          fill={ec+"2C"} stroke={ec} strokeWidth="0.8" strokeOpacity="0.7"/>
                      );
                    }

                    // Floor level labels
                    const lblX = px(-1.5, 0) - 4;
                    const flLbls = [];
                    for (let f = 0; f < nFloors; f++) {
                      flLbls.push(<text key={`fl${f}`}
                        x={lblX} y={py(-1.5,0, f*flH + flH*0.5) + 3}
                        textAnchor="end" fontSize="8" fontFamily="Arial,sans-serif"
                        fill={isDark?"rgba(255,255,255,0.42)":"rgba(0,0,0,0.42)"}>
                        {f===0?"P":`E${f}`}
                      </text>);
                    }
                    if (hasMans) flLbls.push(<text key="flM"
                      x={lblX} y={py(-1.5,0,bH+mansH*0.45)+3}
                      textAnchor="end" fontSize="8" fontFamily="Arial,sans-serif"
                      fill={isDark?"rgba(255,255,255,0.42)":"rgba(0,0,0,0.42)"}>M</text>);
                    for (let s = 1; s <= nSubs; s++) {
                      flLbls.push(<text key={`fs${s}`}
                        x={lblX} y={py(-1.5,0,-s*flH+flH*0.5)+3}
                        textAnchor="end" fontSize="8" fontFamily="Arial,sans-serif"
                        fill={isDark?"rgba(255,255,255,0.28)":"rgba(0,0,0,0.28)"}>
                        {nSubs>1?`${nSubs-s+1}S`:"S"}
                      </text>);
                    }

                    // Energy class badge position (above building)
                    const topZ = hasPitch ? totalH + Math.min(WW,DD)*0.40*0.55 : totalH + 1.0;
                    const bdgX = px(WW*0.5, 0), bdgY = py(WW*0.5, 0, topZ) - 20;

                    return (
                      <div className="relative">
                        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="320"
                          style={{overflow:"visible"}}>

                          {parts}
                          {flLbls}

                          {/* Energy class badge */}
                          <rect x={bdgX-24} y={bdgY-15} width="48" height="28" rx="6"
                            fill={ec} fillOpacity="0.92"/>
                          <text x={bdgX} y={bdgY+6} textAnchor="middle"
                            fontSize="17" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">
                            {enClass.cls}
                          </text>

                          {/* EP value below badge */}
                          <text x={bdgX} y={bdgY+22} textAnchor="middle"
                            fontSize="8" fontFamily="Arial,sans-serif" fill={ec} fillOpacity="0.75">
                            {epFinal.toFixed(0)} kWh/m²
                          </text>

                          {/* Info label */}
                          <text x={SVG_W/2} y={SVG_H-8} textAnchor="middle" fontSize="10"
                            fontFamily="Arial,sans-serif"
                            fill={isDark?"rgba(255,255,255,0.42)":"rgba(0,0,0,0.42)"}>
                            {building.floors} · Au {au.toFixed(0)} m² · EP {epFinal.toFixed(0)} kWh/(m²·an) · Clasa {enClass.cls}
                          </text>

                          {/* Compass rose */}
                          <g transform="translate(518,46)">
                            <circle r="19" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
                            <text x="0" y="-7" textAnchor="middle" fontSize="7.5" fontFamily="Arial,sans-serif" fill="rgba(255,255,255,0.62)">N</text>
                            <text x="0" y="14" textAnchor="middle" fontSize="7.5" fontFamily="Arial,sans-serif" fill="rgba(255,255,255,0.38)">S</text>
                            <text x="-11" y="4" textAnchor="middle" fontSize="7.5" fontFamily="Arial,sans-serif" fill="rgba(255,255,255,0.38)">V</text>
                            <text x="11" y="4" textAnchor="middle" fontSize="7.5" fontFamily="Arial,sans-serif" fill="rgba(255,255,255,0.38)">E</text>
                            <polygon points="0,-14 2.8,-4 0,-7 -2.8,-4" fill="rgba(239,68,68,0.92)"/>
                            <polygon points="0,14 2.8,4 0,7 -2.8,4" fill="rgba(255,255,255,0.32)"/>
                          </g>

                          {/* Scale bar */}
                          <g transform={`translate(22,${SVG_H-28})`}>
                            <line x1="0" y1="0" x2={sc*5} y2="0" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5"/>
                            <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(255,255,255,0.32)" strokeWidth="1"/>
                            <line x1={sc*5} y1="-4" x2={sc*5} y2="4" stroke="rgba(255,255,255,0.32)" strokeWidth="1"/>
                            <text x={sc*2.5} y="-7" textAnchor="middle" fontSize="8"
                              fontFamily="Arial,sans-serif" fill="rgba(255,255,255,0.38)">5 m</text>
                          </g>

                        </svg>
                      </div>
                    );
                  })()}
                </Card>
              )}

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

              {/* ── Digital Building Logbook ── */}
              <Card title="Digital Building Logbook — Dosar digital al clădirii" className="mb-4">
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
              </Card>

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

              {/* Export raport audit + deviz */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button onClick={() => {
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Raport Audit Energetic — ${building.address || "Proiect"}</title>
                  <style>body{font-family:Arial,sans-serif;max-width:900px;margin:20px auto;padding:20px;color:#1a1a2e}
                  h1{color:#b45309;border-bottom:2px solid #b45309;padding-bottom:8px}h2{color:#1e40af;margin-top:24px}
                  table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:13px}
                  th{background:#f0f0f0;font-weight:bold}.ok{color:#16a34a}.warn{color:#d97706}.fail{color:#dc2626}
                  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold}
                  .badge-ok{background:#dcfce7;color:#166534}.badge-fail{background:#fef2f2;color:#991b1b}
                  @media print{body{margin:0}}</style></head><body>
                  <h1>RAPORT DE AUDIT ENERGETIC</h1>
                  <p><strong>Clădire:</strong> ${building.address || "—"}, ${building.city || ""}<br>
                  <strong>Categorie:</strong> ${BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || ""}<br>
                  <strong>Auditor:</strong> ${auditor.name || "—"} · ${auditor.atestat || ""}<br>
                  <strong>Data:</strong> ${auditor.date || new Date().toISOString().slice(0,10)}</p>
                  <h2>1. Performanță energetică</h2>
                  <table><tr><th>Indicator</th><th>Valoare</th><th>Referință nZEB</th><th>Status</th></tr>
                  <tr><td>EP specific</td><td>${epFinal.toFixed(1)} kWh/(m²·an)</td><td>${getNzebEpMax(baseCatResolved, selectedClimate?.zone)?.toFixed(1) || "—"}</td><td class="${epFinal <= (getNzebEpMax(baseCatResolved,selectedClimate?.zone)||999) ? "ok" : "fail"}">${epFinal <= (getNzebEpMax(baseCatResolved,selectedClimate?.zone)||999) ? "✓ Conform" : "✗ Depășit"}</td></tr>
                  <tr><td>CO₂</td><td>${co2Final.toFixed(1)} kgCO₂/(m²·an)</td><td>—</td><td>Clasa ${co2Class.cls}</td></tr>
                  <tr><td>RER</td><td>${rer.toFixed(1)}%</td><td>≥ 30%</td><td class="${rer >= 30 ? "ok" : "fail"}">${rer >= 30 ? "✓" : "✗"}</td></tr>
                  <tr><td>Clasă energetică</td><td><strong>${enClass.cls}</strong></td><td>—</td><td>—</td></tr>
                  <tr><td>nZEB</td><td colspan="2">${isNZEB ? "DA" : "NU"}</td><td class="${isNZEB ? "ok" : "fail"}">${isNZEB ? "✓ Conform" : "✗ Neconform"}</td></tr></table>
                  <h2>2. Recomandări</h2><ul>
                  ${(smartSuggestions||[]).map(s => "<li><strong>" + s.measure + "</strong> (" + s.system + ") — " + s.impact + "</li>").join("")}
                  </ul>
                  <h2>3. Anvelopă</h2>
                  <table><tr><th>Element</th><th>Suprafață</th><th>U calculat</th><th>U ref</th></tr>
                  ${(envelopeAnalysis||[]).map(e => "<tr><td>" + e.name + "</td><td>" + (e.area||0).toFixed(1) + " m²</td><td>" + (e.u||0).toFixed(3) + "</td><td>" + (e.uRef||"—") + "</td></tr>").join("")}
                  </table>
                  <p style="margin-top:40px;font-size:11px;color:#888">Generat cu Zephren v2.0 · ${new Date().toLocaleDateString("ro-RO")}</p>
                  </body></html>`;
                  const w = window.open("", "_blank");
                  w.document.write(html); w.document.close();
                  showToast("Raport audit generat — Print → Save as PDF", "success");
                }} disabled={!instSummary}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm transition-all">
                  📊 Export Raport Audit (HTML/PDF)
                </button>
                <button onClick={() => {
                  if (!rehabComparison) { showToast("Completați scenariul de reabilitare", "error"); return; }
                  const rc = rehabComparison;
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Deviz Estimativ Reabilitare</title>
                  <style>body{font-family:Arial;max-width:800px;margin:20px auto;padding:20px}h1{color:#b45309}
                  table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ddd;padding:8px;text-align:left}
                  th{background:#f0f0f0}.total{font-weight:bold;background:#fef3c7}
                  @media print{body{margin:0}}</style></head><body>
                  <h1>DEVIZ ESTIMATIV REABILITARE ENERGETICĂ</h1>
                  <p><strong>Clădire:</strong> ${building.address || ""}, ${building.city || ""}<br>
                  <strong>Categorie:</strong> ${BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || ""}<br>
                  <strong>Data:</strong> ${new Date().toLocaleDateString("ro-RO")}</p>
                  <table><tr><th>Nr.</th><th>Lucrare</th><th>Cantitate</th><th>Preț unitar (EUR)</th><th>Total (EUR)</th></tr>
                  ${rc.measures ? rc.measures.map((m,i) => "<tr><td>"+(i+1)+"</td><td>"+m.label+"</td><td>"+(m.qty||"-")+"</td><td>"+(m.unitCost||"-")+"</td><td><strong>"+(m.cost||0).toLocaleString("ro-RO")+"</strong></td></tr>").join("") :
                  "<tr><td>1</td><td>Termoizolarea pereților exteriori</td><td>"+(opaqueElements.filter(e=>e.type==="PE").reduce((s,e)=>s+(parseFloat(e.area)||0),0).toFixed(0))+" m²</td><td>42</td><td>"+(opaqueElements.filter(e=>e.type==="PE").reduce((s,e)=>s+(parseFloat(e.area)||0),0)*42).toFixed(0)+"</td></tr>"}
                  <tr class="total"><td colspan="4">TOTAL ESTIMAT (fără TVA)</td><td>${(rc.totalInvest || rc.original?.qfTotal || 0).toLocaleString("ro-RO")} EUR</td></tr>
                  </table>
                  <p><em>Prețuri orientative 2026. Devizul final se stabilește pe baza ofertelor de la furnizori.</em></p>
                  </body></html>`;
                  const w = window.open("", "_blank");
                  w.document.write(html); w.document.close();
                  showToast("Deviz estimativ generat", "success");
                }} disabled={!instSummary}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm transition-all">
                  💰 Export Deviz Estimativ
                </button>
              </div>

              {/* ═══ INSTRUMENTE SUPLIMENTARE (pct. 9-17) ═══ */}
              {(() => {
                const [activeTool, setActiveTool] = React.useState(null);
                const tools = [
                  { id:"lcc",     icon:"📊", label:"Analiză LCC" },
                  { id:"meps",    icon:"⚠️",  label:"MEPS Check" },
                  { id:"oferta",  icon:"📄", label:"Ofertă Reabilitare" },
                  { id:"consum",  icon:"📈", label:"Consum Real" },
                  { id:"fond",    icon:"🏗️", label:"Fond Reparații" },
                  { id:"pnrr",    icon:"💶", label:"Finanțări PNRR" },
                  { id:"thermal", icon:"🌡️", label:"Hartă Termică" },
                  { id:"acoustic",icon:"🔊", label:"Acustic" },
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

                const enClassStr = instSummary ? getEnergyClass(renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2, building.category + (["RI","RC","RA"].includes(building.category) ? (cooling?.hasCooling ? "_cool" : "_nocool") : "")) : "";

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
                    {activeTool === "meps" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <MEPSCheck instSummary={instSummary} building={building} energyClass={enClassStr} />
                      </div>
                    )}
                    {activeTool === "oferta" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <OfertaReabilitare building={building} instSummary={instSummary} auditor={auditor} onClose={() => setActiveTool(null)} />
                      </div>
                    )}
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
                          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: thermalSVG }} />
                        ) : (
                          <div className="text-center py-8 opacity-30 text-sm">Adăugați elemente de anvelopă pentru a genera harta termică.</div>
                        )}
                      </div>
                    )}
                    {activeTool === "acoustic" && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                        <div className="text-sm font-semibold mb-3">🔊 Conformitate Acustică — C125 / SR EN ISO 717</div>
                        {acousticResult ? (
                          <>
                            <div className={`flex items-center gap-2 text-sm font-bold ${acousticResult.allConform ? "text-emerald-400" : "text-amber-400"}`}>
                              {acousticResult.allConform ? "✓ Toate elementele conforme acustic" : `⚠ ${acousticResult.nonConformCount} element(e) neconforme`}
                            </div>
                            <div className="space-y-1 mt-2">
                              {acousticResult.checks?.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                                  <span className="opacity-60">{c.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono">Rw = {c.rw?.toFixed(0)} dB</span>
                                    <span className={`font-bold ${c.ok ? "text-emerald-400" : "text-red-400"}`}>{c.ok ? "✓" : "✗"} {c.requirement} dB min</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 opacity-30 text-sm">Adăugați elemente de anvelopă cu straturi pentru calcul acustic.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
