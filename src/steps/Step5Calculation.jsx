import React, { useMemo } from "react";
import { ENERGY_PRICE_PRESETS, PRICE_LABELS, PRICE_ICONS } from "../data/energy-prices.js";
// Sprint Audit Prețuri (9 mai 2026) Task A — NPV chart 3 scenarii bandă low/mid/high
// Sursa canonică: src/data/rehab-prices.js (Q1 2026 + HG 907/2016 + MDLPA + oferte contractori)
import { REHAB_PRICES, getEurRonSync } from "../data/rehab-prices.js";
import UComplianceTable from "../components/UComplianceTable.jsx";
import BenchmarkNational from "../components/BenchmarkNational.jsx";
// Sprint Reorganizare Pas 5/6 (1 mai 2026) — BACS+SRI+MEPS mutate din Pas 6 (vezi sprint_reorg_pas5_pas6_01may2026.md).
// Justificare: f_BAC ajustează EP final → aparține bilanțului energetic (Pas 5), nu emiterii CPE.
import BACSSelectorSimple from "../components/BACSSelectorSimple.jsx";
import SRIScoreAuto from "../components/SRIScoreAuto.jsx";
import MEPSCheckBinar from "../components/MEPSCheckBinar.jsx";
import { countyNameToCode, categoryToBenchmarkType } from "../data/benchmark-national.js";
import { cn, Select, Input, Badge, Card, ResultRow, fmtRON, fmtEUR, fmtNum } from "../components/ui.jsx";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { getNzebEpMax } from "../calc/smart-rehab.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB, NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { ZEB_THRESHOLDS, ZEB_FACTOR, BACS_CLASSES, BACS_OBLIGATION_THRESHOLD_KW } from "../data/u-reference.js";
// Sprint 5 (17 apr 2026) — SR EN ISO 52120-1:2022
import { BACS_CLASS_LABELS } from "../calc/bacs-iso52120.js";
import { CATEGORY_BASE_MAP } from "../data/building-catalog.js";
import { FUELS } from "../data/constants.js";
import { T } from "../data/translations.js";
// Sprint Refactor Pas 5 Faza 0 (1 mai 2026) — gating dual grad MDLPA + plan
import GradeGate, { useGradeGate } from "../components/GradeGate.jsx";

/**
 * Step5Calculation — Extracted from energy-calc.jsx lines 8900-10208
 * Energy balance results, hourly simulation, energy class, cost breakdown,
 * nZEB verification, Sankey diagram, monthly charts
 */
export default function Step5Calculation(props) {
  const {
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
    // Faza A — gating dual (Sprint v6.3 + Ord. MDLPA 348/2026 Art. 6)
    userPlan, auditor,
  } = props;
  const auditorGrad = auditor?.grade || null;
  // Faza C — verdict-uri inline pentru badge-uri din Dashboard sumar (fragment)
  const gwpGate = useGradeGate("gwpSimple", userPlan, auditorGrad);
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

            const Au = parseFloat(building.areaUseful) || 0;
            const baseCatResolved = (CATEGORY_BASE_MAP?.[building.category]) || building.category;
            const catKey = baseCatResolved + (["RI","RC","RA"].includes(baseCatResolved) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            // Sprint 19 Performanță — memoizare calcule derivate (altfel rulează la fiecare re-render parent)
            const enClass = useMemo(() => getEnergyClass(epFinal, catKey), [epFinal, catKey]);
            const co2Class = useMemo(() => getCO2Class(co2Final, baseCatResolved), [co2Final, baseCatResolved]);
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[baseCatResolved];
            const rer = renewSummary?.rer || 0;

            // Sprint 18 UX — verificare date minime pentru Step 5
            const _missingCritical = [];
            if (!Au || Au <= 0) _missingCritical.push(lang==="EN"?"usable area (Step 1)":"suprafață utilă (Pasul 1)");
            if (!building.category) _missingCritical.push(lang==="EN"?"building category (Step 1)":"categorie clădire (Pasul 1)");
            if (!(opaqueElements?.length > 0) && !(glazingElements?.length > 0) && !envelopeSummary?.G)
              _missingCritical.push(lang==="EN"?"thermal envelope (Step 2)":"anvelopă termică (Pasul 2)");
            const _hasMissingCritical = _missingCritical.length > 0;

            return (
            <div>
              {/* Sprint 18 UX — banner date lipsă */}
              {_hasMissingCritical && (
                <div role="alert" className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
                  <div className="font-semibold mb-1"><span aria-hidden="true">⚠ </span>
                    {lang==="EN"
                      ? "Incomplete input data — displayed results are NOT valid for an Energy Performance Certificate."
                      : "Date de intrare incomplete — rezultatele afișate NU sunt valide pentru un Certificat de Performanță Energetică."}
                  </div>
                  <div className="opacity-80">
                    {lang==="EN" ? "Missing: " : "Lipsește: "}{_missingCritical.join(", ")}.{" "}
                    <button onClick={() => setStep?.(1)} className="text-red-200 underline hover:text-white">
                      {lang==="EN" ? "Complete Step 1 →" : "Completați Pasul 1 →"}
                    </button>
                  </div>
                </div>
              )}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(4)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 4</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Global energy calculation & Classification":"Calcul energetic global & Clasare"}</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 5 Mc 001-2022 — Bilanț energetic, conversie energie primară, clasare A+ — G</p>
              </div>


              {/* ═════ A. BILANȚ ENERGETIC (Mc 001-2022 §5.2-5.8) ═════ */}

              {monthlyISO && (
                <Card title={t("Bilanț termic lunar ISO 13790",lang)} className="mb-6">
                  <div className="text-[10px] text-amber-500/60 mb-1 sm:hidden text-center">↔ Glisează orizontal pentru tabelul complet</div>
                  <div className="relative">
                    <div className="overflow-x-auto rounded-lg" style={{WebkitOverflowScrolling:"touch",scrollbarWidth:"thin"}}>
                    <table className="w-full text-xs" style={{minWidth:"640px"}}><thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa",minWidth:"36px"}}>Luna</th><th className="text-right px-1">θ ext</th><th className="text-right px-1">Q_tr</th><th className="text-right px-1">Q_ve</th><th className="text-right px-1">Q_int</th><th className="text-right px-1">Q_sol</th><th className="text-right px-1">γ_H</th><th className="text-right px-1">η_H</th><th className="text-right px-1 font-bold">Q_H,nd</th><th className="text-right px-1">Q_C,nd</th>
                    </tr></thead><tbody>
                      {monthlyISO.map((m, i) => (<tr key={i} className="border-b border-white/5"><td className="py-1 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa"}}>{m.name}</td><td className="text-right px-1 opacity-50">{m.tExt.toFixed(1)}</td><td className="text-right px-1">{m.Q_tr.toFixed(0)}</td><td className="text-right px-1">{m.Q_ve.toFixed(0)}</td><td className="text-right px-1 text-green-400/70">{m.Q_int.toFixed(0)}</td><td className="text-right px-1 text-amber-400/70">{m.Q_sol.toFixed(0)}</td><td className="text-right px-1 opacity-40">{m.gamma_H.toFixed(2)}</td><td className="text-right px-1 opacity-40">{m.eta_H.toFixed(2)}</td><td className="text-right px-1 font-bold text-red-400">{m.qH_nd.toFixed(0)}</td><td className="text-right px-1 text-blue-400">{m.qC_nd.toFixed(0)}</td></tr>))}
                      <tr className="border-t border-white/20 font-bold"><td className="py-2 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa"}}>TOTAL</td><td></td><td className="text-right px-1">{monthlyISO.reduce((s,m)=>s+m.Q_tr,0).toFixed(0)}</td><td className="text-right px-1">{monthlyISO.reduce((s,m)=>s+m.Q_ve,0).toFixed(0)}</td><td className="text-right px-1 text-green-400">{monthlyISO.reduce((s,m)=>s+m.Q_int,0).toFixed(0)}</td><td className="text-right px-1 text-amber-400">{monthlyISO.reduce((s,m)=>s+m.Q_sol,0).toFixed(0)}</td><td></td><td></td><td className="text-right px-1 text-red-400">{monthlyISO.reduce((s,m)=>s+m.qH_nd,0).toFixed(0)}</td><td className="text-right px-1 text-blue-400">{monthlyISO.reduce((s,m)=>s+m.qC_nd,0).toFixed(0)}</td></tr>
                    </tbody></table>
                    </div>
                  </div>
                  <div className="text-[10px] opacity-30 mt-2">Valori kWh — metoda lunară SR EN ISO 13790 | Factori NA:2023</div>
                </Card>
              )}
              {/* ── GRAFIC LUNAR CONSUM ── */}
              {monthlyBreakdown && (
                <Card title={t("Profil lunar consum energie",lang)} className="mb-6">
                  <svg viewBox="0 0 700 210" width="100%" height="200" className="overflow-visible">
                    {(() => {
                      var data = monthlyBreakdown, maxQ = Math.max.apply(null, data.map(function(m){return m.qf_total}))||1;
                      var bW=40, gap=14, cH=140, bY=178, oX=44, els=[];
                      var gridCol="rgba(255,255,255,0.10)", textCol="#9ca3af", textBright="#e2e8f0";
                      for(var ti=0;ti<=4;ti++){var yg=bY-(ti/4)*cH; els.push(<line key={"yg"+ti} x1={oX} y1={yg} x2={oX+12*(bW+gap)} y2={yg} stroke={gridCol} strokeWidth="0.8"/>); els.push(<text key={"yl"+ti} x={oX-6} y={yg+4} textAnchor="end" fontSize="9" fill={textCol}>{Math.round(maxQ*ti/4)}</text>);}
                      data.forEach(function(m,i){
                        var x=oX+2+i*(bW+gap), cumH=0;
                        [{v:m.qf_h,c:"#ef4444"},{v:m.qf_w,c:"#f97316"},{v:m.qf_c,c:"#3b82f6"},{v:m.qf_v+m.qf_l,c:"#8b5cf6"}].forEach(function(u,ui){ var h=maxQ>0?(u.v/maxQ)*cH:0; if(h>0.5) els.push(<rect key={"b"+i+"-"+ui} x={x} y={bY-cumH-h} width={bW} height={h} fill={u.c} opacity="0.88" rx="1.5"/>); cumH+=h; });
                        els.push(<text key={"ml"+i} x={x+bW/2} y={bY+15} textAnchor="middle" fontSize="10" fill={textBright} fontWeight="500">{m.name}</text>);
                      });
                      var tMin=Math.min.apply(null,data.map(function(m){return m.tExt})), tMax=Math.max.apply(null,data.map(function(m){return m.tExt})), tR=Math.max(tMax-tMin,1);
                      var pts=data.map(function(m,i){ return (oX+2+i*(bW+gap)+bW/2)+","+(bY-((m.tExt-tMin)/tR)*cH*0.78-cH*0.1); }).join(" ");
                      els.push(<polyline key="tl" points={pts} fill="none" stroke="#fbbf24" strokeWidth="2.5" opacity="0.95"/>);
                      data.forEach(function(m,i){ var tx=oX+2+i*(bW+gap)+bW/2, ty=bY-((m.tExt-tMin)/tR)*cH*0.78-cH*0.1; els.push(<circle key={"td"+i} cx={tx} cy={ty} r="3.5" fill="#fbbf24"/>); els.push(<text key={"tt"+i} x={tx} y={ty-8} textAnchor="middle" fontSize="8.5" fill="#fde68a" fontWeight="600">{m.tExt.toFixed(0)}</text>); });
                      [{l:"Încălzire",c:"#ef4444"},{l:"ACM",c:"#f97316"},{l:"Răcire",c:"#3b82f6"},{l:"Vent",c:"#8b5cf6"},{l:"Temp",c:"#fbbf24"}].forEach(function(it,i){ var lx=oX+i*118; els.push(<rect key={"lg"+i} x={lx} y={4} width={11} height={11} fill={it.c} rx="2"/>); els.push(<text key={"lt"+i} x={lx+15} y={14} fontSize="10.5" fill={textBright} fontWeight="500">{it.l}</text>); });
                      return els;
                    })()}
                  </svg>
                </Card>
              )}
              {/* ── DEFALCARE CONSUM PE LUNI ── */}
              {monthlyBreakdown && (
                <Card title={t("Defalcare consum pe luni",lang)} badge={<span className="text-[10px] opacity-30">profil climatic lunar</span>}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse" style={{minWidth:"700px"}}>
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-2 opacity-50">Luna</th>
                          <th className="text-center py-2 px-1 opacity-50">T ext °C</th>
                          <th className="text-center py-2 px-1 opacity-50">ΔT</th>
                          <th className="text-right py-2 px-1 opacity-50">Încălz.</th>
                          <th className="text-right py-2 px-1 opacity-50">ACM</th>
                          <th className="text-right py-2 px-1 opacity-50">Răcire</th>
                          <th className="text-right py-2 px-1 opacity-50">Ventil.</th>
                          <th className="text-right py-2 px-1 opacity-50">Ilum.</th>
                          <th className="text-right py-2 px-1 font-medium">TOTAL</th>
                          <th className="text-right py-2 px-1 opacity-50">Ep</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyBreakdown.map((m, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-1.5 px-2 font-medium">{m.name}</td>
                            <td className="text-center px-1" style={{color: m.tExt < 0 ? "#60a5fa" : m.tExt > 25 ? "#f87171" : "inherit"}}>{m.tExt.toFixed(1)}</td>
                            <td className="text-center px-1 opacity-40">{m.deltaT.toFixed(0)}</td>
                            <td className="text-right px-1">{m.qf_h > 0 ? m.qf_h.toFixed(0) : "—"}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_w.toFixed(0)}</td>
                            <td className="text-right px-1" style={{color: m.qf_c > 0 ? "#f87171" : "inherit"}}>{m.qf_c > 0 ? m.qf_c.toFixed(0) : "—"}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_v.toFixed(0)}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_l.toFixed(0)}</td>
                            <td className="text-right px-1 font-bold">{m.qf_total.toFixed(0)}</td>
                            <td className="text-right px-1 opacity-40">{m.ep.toFixed(0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10 font-bold">
                          <td className="py-2 px-2">TOTAL AN</td>
                          <td colSpan={2}></td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_h, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_w, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_c, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_v, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_l, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_total, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.ep, 0).toFixed(0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Mini bar chart */}
                  <div className="mt-4 flex items-end gap-1 h-24">
                    {monthlyBreakdown.map((m, i) => {
                      const maxQ = Math.max(...monthlyBreakdown.map(x => x.qf_total));
                      const hPct = maxQ > 0 ? (m.qf_total / maxQ) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{height:`${hPct}%`, minHeight: m.qf_total > 0 ? "2px" : 0,
                            background: m.qf_h > m.qf_c ? "linear-gradient(180deg, #f59e0b44, #f59e0b)" : "linear-gradient(180deg, #3b82f644, #3b82f6)"}} />
                          <div className="text-[8px] opacity-30">{m.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
              {/* ── A/V FACTOR VALIDATION ── */}
              {avValidation && avValidation.msg && (
                <div className={cn("mb-4 p-3 rounded-xl border text-xs flex items-center gap-2",
                  avValidation.status === "high" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                )}>
                  <span>⚠</span> {avValidation.msg}
                </div>
              )}

              {/* ═════ B. CONVERSIE ENERGIE PRIMARĂ (Mc 001-2022 §5.9 Tabelul 5.17) ═════ */}

              {/* ── TOGGLE NA:2023 (Sprint 11 — extins la factor electricitate global) ── */}
              <div className="flex items-center gap-3 mb-3 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useNA2023} onChange={e => setUseNA2023(e.target.checked)} className="accent-amber-500" />
                  <span className="text-xs font-medium">Factori NA:2023 (Tab A.16) — electricitate + energie ambientală</span>
                </label>
                <div className="text-[10px] opacity-40 flex-1">
                  {useNA2023
                    ? "ON (recomandat): electricitate fP_nren=2.00 + fP_ren=0.50 (Tab A.16, valoare ASRO autoritară) • energie ambientală PC = 1.00 (corecție confirmată MDLPA nr. 50843/09.03.2026)."
                    : "OFF (legacy Mc001-2022 Tab 5.17): electricitate fP_nren=2.62 (fP_ren=0) • energie ambientală PC = 0. Păstrat pentru paritate cu CPE-uri emise înainte de Sprint 11."}
                </div>
              </div>
              {/* ── FACTORI DE CONVERSIE APLICAȚI ── */}
              <Card title={t("Factori de conversie energie primară aplicați (Tabelul 5.17)",lang)} className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  {FUELS.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-xs opacity-60">{f.label}</span>
                      <div className="flex gap-3">
                        <span className="text-[10px] font-mono">fP={f.fP_tot}</span>
                        <span className="text-[10px] font-mono opacity-40">fCO2={f.fCO2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              {/* ── DEFALCARE ENERGIE FINALĂ & PRIMARĂ ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <Card title={t("Energie finală per utilitate",lang)}>
                  {instSummary && (
                    <div className="space-y-3">
                      {[
                        {label:"Încălzire", qf:instSummary.qf_h, ep:instSummary.ep_h, co2:instSummary.co2_h, color:"#ef4444"},
                        {label:"ACM", qf:instSummary.qf_w, ep:instSummary.ep_w, co2:instSummary.co2_w, color:"#f97316"},
                        {label:"Răcire", qf:instSummary.qf_c, ep:instSummary.ep_c, co2:instSummary.co2_c, color:"#3b82f6"},
                        {label:"Ventilare", qf:instSummary.qf_v, ep:instSummary.ep_v, co2:instSummary.co2_v, color:"#8b5cf6"},
                        {label:"Iluminat", qf:instSummary.qf_l, ep:instSummary.ep_l, co2:instSummary.co2_l, color:"#eab308"},
                      ].map(u => (
                        <div key={u.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:u.color}} />
                              <span className="text-xs font-medium">{u.label}</span>
                            </div>
                            <span className="text-xs font-mono">{u.qf.toFixed(0)} kWh/an</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width:`${instSummary.qf_total > 0 ? (u.qf/instSummary.qf_total*100) : 0}%`,
                              backgroundColor:u.color
                            }} />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[10px] opacity-30">{Au > 0 ? (u.qf/Au).toFixed(1) : "—"} kWh/(m²·an)</span>
                            <span className="text-[10px] opacity-30">{instSummary.qf_total > 0 ? (u.qf/instSummary.qf_total*100).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-white/10">
                        <ResultRow label="TOTAL energie finală" value={instSummary.qf_total.toFixed(0)} unit="kWh/an" />
                        <ResultRow label="Specific" value={instSummary.qf_total_m2.toFixed(1)} unit="kWh/(m²·an)" />
                      </div>
                    </div>
                  )}
                </Card>

                <Card title={t("Energie primară per utilitate",lang)}>
                  {instSummary && (
                    <div className="space-y-3">
                      {[
                        {label:"Încălzire", ep:instSummary.ep_h, color:"#ef4444"},
                        {label:"ACM", ep:instSummary.ep_w, color:"#f97316"},
                        {label:"Răcire", ep:instSummary.ep_c, color:"#3b82f6"},
                        {label:"Ventilare", ep:instSummary.ep_v, color:"#8b5cf6"},
                        {label:"Iluminat", ep:instSummary.ep_l, color:"#eab308"},
                      ].map(u => (
                        <div key={u.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:u.color}} />
                              <span className="text-xs font-medium">{u.label}</span>
                            </div>
                            <span className="text-xs font-mono">{u.ep.toFixed(0)} kWh/an</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width:`${instSummary.ep_total > 0 ? (u.ep/instSummary.ep_total*100) : 0}%`,
                              backgroundColor:u.color
                            }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-white/10">
                        <ResultRow label="Total EP (fără regenerabile)" value={instSummary.ep_total.toFixed(0)} unit="kWh/an" />
                        <ResultRow label="Reducere regenerabile" value={renewSummary ? `-${renewSummary.ep_reduction.toFixed(0)}` : "0"} unit="kWh/an" status="ok" />
                        <ResultRow label="EP FINAL ajustat" value={(renewSummary?.ep_adjusted || instSummary.ep_total).toFixed(0)} unit="kWh/an" />
                        <ResultRow label="EP specific FINAL" value={epFinal.toFixed(1)} unit="kWh/(m²·an)"
                          status={enClass.idx <= 1 ? "ok" : enClass.idx <= 3 ? "warn" : "fail"} />
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* ═════ C. CLASARE ENERGETICĂ & CO₂ (Mc 001-2022 §5.10-5.11) ═════ */}

              {/* ── CLASARE ENERGETICĂ — HERO ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Clasa energetică */}
                <Card className="text-center py-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">{lang==="EN"?"Energy class":"Clasa energetică"}</div>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-4xl font-black mb-3"
                    style={{backgroundColor: enClass.color + "25", color: enClass.color, border:`2px solid ${enClass.color}50`}}>
                    {enClass.cls}
                  </div>
                  <div className="text-2xl font-bold font-mono" style={{color:enClass.color}}>{epFinal.toFixed(1)}</div>
                  <div className="text-xs opacity-40">kWh/(m2·an) energie primară</div>
                  <div className="text-xs opacity-30 mt-1">Nota energetică: {enClass.score}/100</div>

                  {/* Scală oficială clasare */}
                  <div className="mt-4">
                    <svg viewBox="0 0 280 120" width="100%" height="115">
                      {CLASS_LABELS.map(function(cls, i) {
                        var barW = 55 + i * 20;
                        var y = i * 14 + 2;
                        var isA = i === enClass.idx;
                        return (
                          <g key={cls}>
                            <rect x="5" y={y} width={barW} height="12" fill={CLASS_COLORS[i]} rx="1" opacity={isA ? 1 : 0.35}/>
                            <text x="10" y={y+9} fontSize="7" fill="white" fontWeight="bold">{cls}</text>
                            {isA && (<g><polygon points={(barW+8)+","+(y+1)+" "+(barW+20)+","+(y+6)+" "+(barW+8)+","+(y+11)} fill={CLASS_COLORS[i]}/><rect x={barW+20} y={y-1} width="55" height="14" fill={CLASS_COLORS[i]} rx="2"/><text x={barW+47} y={y+9} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{epFinal.toFixed(1)}</text></g>)}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Scala claselor */}
                  <div className="mt-5 px-4">
                    {grid && CLASS_LABELS.map((cls, i) => {
                      const isActive = i === enClass.idx;
                      const low = i === 0 ? 0 : grid.thresholds[i-1];
                      const high = i < grid.thresholds.length ? grid.thresholds[i] : "∞";
                      return (
                        <div key={cls} className={cn("flex items-center gap-2 py-1 px-2 rounded transition-all text-xs",
                          isActive ? "bg-white/10 scale-105" : "opacity-50")}>
                          <div className="w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                            style={{backgroundColor:CLASS_COLORS[i]}}>{cls}</div>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            {isActive && <div className="h-full rounded-full" style={{backgroundColor:CLASS_COLORS[i], width:"100%"}} />}
                          </div>
                          <span className="font-mono text-[10px] w-20 text-right opacity-60">{low} — {high}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Clasa de mediu (CO2) */}
                <Card className="text-center py-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">{lang==="EN"?"Environmental class (CO2)":"Clasa de mediu (CO2)"}</div>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-4xl font-black mb-3"
                    style={{backgroundColor: co2Class.color + "25", color: co2Class.color, border:`2px solid ${co2Class.color}50`}}>
                    {co2Class.cls}
                  </div>
                  <div className="text-2xl font-bold font-mono" style={{color:co2Class.color}}>{co2Final.toFixed(1)}</div>
                  <div className="text-xs opacity-40">kg CO2/(m2·an)</div>
                  <div className="text-xs opacity-30 mt-1">Nota de mediu: {co2Class.score}/100</div>

                  {/* Scală vizuală CO2 — bare SVG */}
                  <div className="mt-4">
                    <svg viewBox="0 0 280 120" width="100%" height="115">
                      {CLASS_LABELS.map(function(cls, i) {
                        var barW = 55 + i * 20;
                        var y = i * 14 + 2;
                        var isA = i === co2Class.idx;
                        return (
                          <g key={cls}>
                            <rect x="5" y={y} width={barW} height="12" fill={CLASS_COLORS[i]} rx="1" opacity={isA ? 1 : 0.35}/>
                            <text x="10" y={y+9} fontSize="7" fill="white" fontWeight="bold">{cls}</text>
                            {isA && (<g><polygon points={(barW+8)+","+(y+1)+" "+(barW+20)+","+(y+6)+" "+(barW+8)+","+(y+11)} fill={CLASS_COLORS[i]}/><rect x={barW+20} y={y-1} width="55" height="14" fill={CLASS_COLORS[i]} rx="2"/><text x={barW+47} y={y+9} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{co2Final.toFixed(1)}</text></g>)}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Scala claselor CO2 */}
                  {(() => {
                    const co2Grid = CO2_CLASSES_DB[baseCatResolved] || CO2_CLASSES_DB.AL;
                    return (
                      <div className="mt-5 px-4">
                        {CLASS_LABELS.map((cls, i) => {
                          const isActive = i === co2Class.idx;
                          const low = i === 0 ? 0 : co2Grid.thresholds[i-1];
                          const high = i < co2Grid.thresholds.length ? co2Grid.thresholds[i] : "∞";
                          return (
                            <div key={cls} className={cn("flex items-center gap-2 py-1 px-2 rounded transition-all text-xs",
                              isActive ? "bg-white/10 scale-105" : "opacity-50")}>
                              <div className="w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                                style={{backgroundColor:CLASS_COLORS[i]}}>{cls}</div>
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                {isActive && <div className="h-full rounded-full" style={{backgroundColor:CLASS_COLORS[i], width:"100%"}} />}
                              </div>
                              <span className="font-mono text-[10px] w-20 text-right opacity-60">{low} — {high}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* nZEB & RER status */}
                  <div className="mt-5 px-4 space-y-2">
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">RER (regenerabile)</span>
                      <Badge color={rer >= 30 ? "green" : "red"}>{rer.toFixed(1)}%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Statut nZEB</span>
                      {(() => { const nz = NZEB_THRESHOLDS[baseCatResolved] || NZEB_THRESHOLDS.AL; const ok = rer >= nz.rer_min && epFinal < getNzebEpMax(baseCatResolved, selectedClimate?.zone); return (
                      <Badge color={ok ? "green" : "red"}>
                        {ok ? "CONFORM" : "NECONFORM"}
                      </Badge>
                      ); })()}
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">ZEB (EPBD 2024/1275)</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${rer >= 30 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/40 border-white/10"}`}>
                        ZEB: {rer >= 30 ? "DA" : "NU"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Grilă aplicată</span>
                      <span className="text-xs font-medium">{grid?.label || catKey}</span>
                    </div>
                  </div>
                </Card>
              </div>
              {/* #19 Grafic radar performanță pe utilități */}
              {instSummary && (
                <Card title="Profil performanță energetică" className="mb-4">
                  {(() => {
                    const cx = 250, cy = 198, maxR = 112, maxMul = 2.0;
                    const nzebThresh = [49, 18, 13, 5, 6]; // Mc 001-2022 A+ kWh/m²·an
                    const labels  = ["Încălzire","ACM","Răcire","Ventilare","Iluminat"];
                    const icons   = ["🔥","💧","❄️","💨","💡"];
                    const keys    = ["qf_h","qf_w","qf_c","qf_v","qf_l"];
                    const rehabKeys = ["qfH","qfW","qfC","qfV","qfL"];
                    const n = 5;
                    const vals   = keys.map(k => Au > 0 ? (instSummary[k] || 0) / Au : 0);
                    const ratios = vals.map((v, i) => nzebThresh[i] > 0 ? v / nzebThresh[i] : 0);
                    const colOf  = r => r === 0 ? "#52525b" : r <= 1.0 ? "#22c55e" : r <= 1.8 ? "#f59e0b" : "#ef4444";
                    const ang = i => (2 * Math.PI * i) / n;
                    const xy  = (i, r) => [cx + r * Math.sin(ang(i)), cy - r * Math.cos(ang(i))];
                    const dpts = ratios.map((r, i) => xy(i, maxR * Math.min(r, maxMul) / maxMul));
                    const labelDist = maxR + 40;
                    const labelAngle = Math.PI / n;

                    // Feature 1 — Scenariu reabilitare (after-polygon)
                    const hasRehab = !!rehabComparison?.rehab?.qfH !== undefined && rehabComparison;
                    const valsAfter   = hasRehab ? rehabKeys.map(k => Au > 0 ? (rehabComparison.rehab[k] || 0) / Au : 0) : null;
                    const ratiosAfter = valsAfter ? valsAfter.map((v, i) => nzebThresh[i] > 0 ? v / nzebThresh[i] : 0) : null;
                    const dptsAfter   = ratiosAfter ? ratiosAfter.map((r, i) => xy(i, maxR * Math.min(r, maxMul) / maxMul)) : null;

                    const legendY = cy + maxR + 58;
                    const svgH = legendY + (hasRehab ? 44 : 26);

                    return (
                      <div>
                        <svg viewBox={`0 0 500 ${svgH}`} width="100%" style={{maxWidth:"520px",display:"block",margin:"0 auto"}}>
                          {/* Inele de referință */}
                          {[0.5, 1.0, 1.5, 2.0].map(f => {
                            const isNzeb = f === 1.0, isWarn = f === 1.5, isCrit = f === 2.0;
                            const r = maxR * f / maxMul;
                            const pts = Array.from({length: n}, (_, i) => xy(i, r).join(",")).join(" ");
                            const rlx = cx + (r + 5) * Math.sin(labelAngle);
                            const rly = cy - (r + 5) * Math.cos(labelAngle);
                            return (
                              <g key={f}>
                                <polygon points={pts}
                                  fill={isNzeb ? "rgba(34,197,94,0.07)" : "none"}
                                  stroke={isNzeb ? "#22c55e" : isCrit ? "rgba(239,68,68,0.28)" : isWarn ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.09)"}
                                  strokeWidth={isNzeb ? 1.5 : 0.6}
                                  strokeDasharray={f > 0.25 ? "4 3" : undefined} />
                                <text x={rlx} y={rly} fontSize="7.5" textAnchor="start"
                                  fill={isNzeb ? "rgba(74,222,128,0.75)" : isCrit ? "rgba(239,68,68,0.45)" : isWarn ? "rgba(245,158,11,0.40)" : "rgba(255,255,255,0.20)"}
                                  fontWeight={isNzeb ? "600" : "400"}>
                                  {isNzeb ? "nZEB A+" : `×${f}`}
                                </text>
                              </g>
                            );
                          })}

                          {/* Linii axe */}
                          {labels.map((_, i) => {
                            const r = ratios[i];
                            const [ex, ey] = xy(i, maxR);
                            return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey}
                              stroke={r > 0 ? `${colOf(r)}50` : "rgba(255,255,255,0.11)"} strokeWidth="1" />;
                          })}

                          {/* Feature 1 — Poligon „după reabilitare" (dashed cyan, în spate) */}
                          {dptsAfter && (
                            <g opacity="0.85">
                              {Array.from({length: n}, (_, i) => {
                                const j = (i + 1) % n;
                                const [x0,y0]=dptsAfter[i],[x1,y1]=dptsAfter[j];
                                return <polygon key={i}
                                  points={`${cx},${cy} ${x0},${y0} ${x1},${y1}`}
                                  fill="rgba(6,182,212,0.13)" stroke="none" />;
                              })}
                              {Array.from({length: n}, (_, i) => {
                                const j = (i + 1) % n;
                                const [x0,y0]=dptsAfter[i],[x1,y1]=dptsAfter[j];
                                return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
                                  stroke="#06b6d4" strokeWidth="1.8" strokeDasharray="5 3" strokeLinecap="round" />;
                              })}
                            </g>
                          )}

                          {/* Fill segmentat per-utilitate (situație curentă) */}
                          {Array.from({length: n}, (_, i) => {
                            const j = (i + 1) % n;
                            const wR = Math.max(ratios[i], ratios[j]);
                            const col = colOf(wR);
                            const [x0, y0] = dpts[i], [x1, y1] = dpts[j];
                            return <polygon key={i}
                              points={`${cx},${cy} ${x0},${y0} ${x1},${y1}`}
                              fill={`${col}28`} stroke="none" />;
                          })}

                          {/* Contur per-segment colorat */}
                          {Array.from({length: n}, (_, i) => {
                            const j = (i + 1) % n;
                            const wR = Math.max(ratios[i], ratios[j]);
                            const col = colOf(wR);
                            const [x0, y0] = dpts[i], [x1, y1] = dpts[j];
                            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
                              stroke={col} strokeWidth="2.2" strokeLinecap="round" />;
                          })}

                          {/* Puncte vertex colorate */}
                          {ratios.map((r, i) => {
                            if (r === 0) return null;
                            const col = colOf(r);
                            const [x, y] = dpts[i];
                            return <g key={i}>
                              <circle cx={x} cy={y} r="6" fill={`${col}28`} />
                              <circle cx={x} cy={y} r="3.5" fill={col} />
                            </g>;
                          })}

                          {/* Feature 2 — Săgeți overflow pentru axe capate (ratio > maxMul) */}
                          {ratios.map((r, i) => {
                            if (r <= maxMul) return null;
                            const col = colOf(r);
                            const s = Math.sin(ang(i)), c = Math.cos(ang(i));
                            const tip  = [cx + (maxR + 11) * s, cy - (maxR + 11) * c];
                            const bl   = [cx + (maxR - 2) * s + 5 * c, cy - (maxR - 2) * c + 5 * s];
                            const br   = [cx + (maxR - 2) * s - 5 * c, cy - (maxR - 2) * c - 5 * s];
                            return (
                              <g key={i}>
                                <polygon points={`${tip[0]},${tip[1]} ${bl[0]},${bl[1]} ${br[0]},${br[1]}`}
                                  fill={col} opacity="0.90" />
                                <polygon points={`${tip[0]},${tip[1]} ${bl[0]},${bl[1]} ${br[0]},${br[1]}`}
                                  fill="none" stroke={col} strokeWidth="0.5" opacity="0.60" />
                              </g>
                            );
                          })}

                          {/* Feature 3 — Clasă energetică în centru */}
                          {enClass && (
                            <g>
                              <circle cx={cx} cy={cy} r="26" fill="rgba(0,0,0,0.72)" stroke={enClass.color || "#6b7280"} strokeWidth="1.5" />
                              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="17" fill={enClass.color || "#fff"} fontWeight="800" fontFamily="monospace">
                                {enClass.cls || "?"}
                              </text>
                              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.45)">
                                {epFinal.toFixed(0)} kWh/m²
                              </text>
                            </g>
                          )}

                          {/* Etichete axe cu valori */}
                          {labels.map((label, i) => {
                            const r = ratios[i];
                            const col = colOf(r);
                            const [lx, ly] = xy(i, labelDist);
                            const ta = lx - cx > 12 ? "start" : lx - cx < -12 ? "end" : "middle";
                            const capped = r > maxMul;
                            const rAfter = ratiosAfter ? ratiosAfter[i] : null;
                            return (
                              <g key={i}>
                                <text x={lx} y={ly - 2} textAnchor={ta} fontSize="10.5"
                                  fill="rgba(255,255,255,0.88)" fontWeight="500">
                                  {icons[i]} {label}
                                </text>
                                {vals[i] > 0 ? (
                                  <>
                                    <text x={lx} y={ly + 12} textAnchor={ta} fontSize="9.5" fill={col} fontWeight="700">
                                      {vals[i].toFixed(1)} kWh/m²
                                    </text>
                                    <text x={lx} y={ly + 24} textAnchor={ta} fontSize="8" fill={col} opacity="0.72">
                                      ×{r.toFixed(1)}{capped ? "⁺" : ""} (prag {nzebThresh[i]})
                                    </text>
                                    {rAfter !== null && rAfter < r && (
                                      <text x={lx} y={ly + 35} textAnchor={ta} fontSize="7.5" fill="#06b6d4" opacity="0.85">
                                        ↓ ×{rAfter.toFixed(1)} după rehab
                                      </text>
                                    )}
                                  </>
                                ) : (
                                  <text x={lx} y={ly + 12} textAnchor={ta} fontSize="8.5" fill="#52525b">
                                    neinstalat
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Legendă */}
                          <g transform={`translate(${cx - 128}, ${legendY})`}>
                            <circle cx={4} cy={-3} r={4} fill="#22c55e" />
                            <text x={13} y={0} fontSize="7.5" fill="rgba(255,255,255,0.44)">≤1× conform nZEB A+</text>
                            <circle cx={128} cy={-3} r={4} fill="#f59e0b" />
                            <text x={137} y={0} fontSize="7.5" fill="rgba(255,255,255,0.44)">1–1.8× depășit</text>
                            <circle cx={220} cy={-3} r={4} fill="#ef4444" />
                            <text x={229} y={0} fontSize="7.5" fill="rgba(255,255,255,0.44)">&gt;1.8× critic</text>
                          </g>
                          {hasRehab && (
                            <g transform={`translate(${cx - 80}, ${legendY + 16})`}>
                              <line x1={0} y1={-3} x2={18} y2={-3} stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" />
                              <text x={24} y={0} fontSize="7.5" fill="rgba(255,255,255,0.44)">Scenariu reabilitare activ</text>
                            </g>
                          )}
                        </svg>

                        {/* Mini-carduri sumar per utilitate */}
                        <div className="grid grid-cols-5 gap-1.5 px-2 pb-3 mt-1">
                          {labels.map((label, i) => {
                            const r = ratios[i];
                            const rA = ratiosAfter ? ratiosAfter[i] : null;
                            const textCl = r === 0 ? "text-zinc-600" : r <= 1.0 ? "text-green-400" : r <= 1.8 ? "text-amber-400" : "text-red-400";
                            const bgCl   = r === 0 ? "bg-white/[0.03]" : r <= 1.0 ? "bg-green-500/10" : r <= 1.8 ? "bg-amber-500/10" : "bg-red-500/10";
                            return (
                              <div key={i} className={`${bgCl} rounded-lg p-2 text-center`}>
                                <div className="text-sm leading-tight">{icons[i]}</div>
                                <div className="text-[9px] text-white/40 mt-0.5 leading-none truncate">{label}</div>
                                <div className={`text-xs font-bold font-mono mt-1 ${textCl}`}>
                                  {vals[i] > 0 ? vals[i].toFixed(0) : "—"}
                                </div>
                                <div className="text-[8px] text-white/25 leading-none">/{nzebThresh[i]}</div>
                                {r > 0 && (
                                  <div className={`text-[9px] font-mono font-semibold mt-0.5 ${textCl}`}>×{r.toFixed(1)}</div>
                                )}
                                {rA !== null && rA < r && (
                                  <div className="text-[8px] font-mono text-cyan-400 mt-0.5">↓×{rA.toFixed(1)}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              )}
              {/* ── SUMAR FINAL ── */}
              {/* #10 Comparare proiecte */}
              <Card title="Comparare cu proiect referință" className="mb-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer text-xs">
                    <span>📂</span> Import JSON referință
                    <input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) importCompareRef(e.target.files[0]); e.target.value=""; }} />
                  </label>
                  {compareRef && (
                    <button onClick={() => setCompareRef(null)} className="text-[10px] text-red-400 hover:text-red-300">Șterge referință</button>
                  )}
                </div>
                {compareRef && instSummary && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="border-b border-white/10">
                        <th className="text-left py-1 px-2 opacity-50">Indicator</th>
                        <th className="text-center py-1 px-2 opacity-50">Proiect curent</th>
                        <th className="text-center py-1 px-2 opacity-50">{compareRef.name}</th>
                        <th className="text-center py-1 px-2 opacity-50">Diferență</th>
                      </tr></thead>
                      <tbody>
                        {[
                          {label:"Ep [kWh/m²·an]", cur: epFinal, ref: compareRef.ep},
                          {label:"CO₂ [kg/m²·an]", cur: co2Final, ref: compareRef.co2},
                          {label:"RER [%]", cur: rer, ref: compareRef.rer},
                          {label:"G [W/m³K]", cur: envelopeSummary?.G||0, ref: compareRef.G},
                        ].map((r,i) => {
                          const diff = r.cur - r.ref;
                          const better = r.label.includes("RER") ? diff > 0 : diff < 0;
                          return (<tr key={i} className="border-b border-white/5">
                            <td className="py-1.5 px-2 opacity-70">{r.label}</td>
                            <td className="text-center font-mono">{r.cur.toFixed(1)}</td>
                            <td className="text-center font-mono opacity-60">{r.ref.toFixed(1)}</td>
                            <td className={`text-center font-mono font-bold ${better ? "text-emerald-400" : "text-red-400"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}</td>
                          </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* ═════ D. VIZUALIZARE FLUX ENERGIE ═════ */}

              {/* ═══ NEW: GRAFIC SANKEY (C2) — Flux energie ═══ */}
              {sankeyData && (
                <Card title={t("Flux energie — intrări vs. pierderi",lang)} className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Intrări energie [kWh/(m²·an)]</div>
                      {sankeyData.inputs.map((item, i) => {
                        const maxVal = Math.max(...sankeyData.inputs.map(x=>x.value), 1);
                        return (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] opacity-50 w-24 text-right truncate">{item.label}</span>
                            <div className="flex-1 bg-white/[0.03] rounded h-4 overflow-hidden">
                              <div className="h-full rounded" style={{width: (item.value/maxVal*100)+"%", backgroundColor: item.color, minWidth: "2px"}} />
                            </div>
                            <span className="text-[10px] font-mono w-12 text-right">{item.value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Pierderi [W/K relativ]</div>
                      {sankeyData.losses.map((item, i) => {
                        const maxVal = Math.max(...sankeyData.losses.map(x=>x.value), 1);
                        return (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] opacity-50 w-24 text-right truncate">{item.label}</span>
                            <div className="flex-1 bg-white/[0.03] rounded h-4 overflow-hidden">
                              <div className="h-full rounded" style={{width: (item.value/maxVal*100)+"%", backgroundColor: item.color, minWidth: "2px"}} />
                            </div>
                            <span className="text-[10px] font-mono w-12 text-right">{item.value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}
              {/* ═══ NEW: GWP LIFECYCLE (A4) ═══ (Faza C — EN 15978 carbon înglobat: ascuns la IIci, EPBD Art. 7) */}
              {gwpDetailed && (
              <GradeGate feature="gwpSimple" plan={userPlan} auditorGrad={auditorGrad}>
                <Card title={t("GWP — Amprenta de carbon a clădirii",lang)} className="mb-6" badge={<Badge color={gwpDetailed.gwpPerM2Year <= 15 ? "green" : "amber"}>{gwpDetailed.classification}</Badge>}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono" style={{color: gwpDetailed.color}}>{gwpDetailed.gwpPerM2Year}</div>
                      <div className="text-[10px] opacity-40">kgCO₂eq/(m²·an)</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{gwpDetailed.gwpPerM2}</div>
                      <div className="text-[10px] opacity-40">kgCO₂eq/m² total</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{(gwpDetailed.totalGWP/1000).toFixed(1)}</div>
                      <div className="text-[10px] opacity-40">tCO₂eq total</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{gwpDetailed.lifetime}</div>
                      <div className="text-[10px] opacity-40">ani viață</div>
                    </div>
                  </div>
                  {/* Phase breakdown */}
                  <div className="flex items-center gap-1 h-6 rounded overflow-hidden mb-2">
                    {[
                      { label:"A1-A3", val: gwpDetailed.gwp_A, color:"#ef4444" },
                      { label:"B4", val: gwpDetailed.gwp_B, color:"#f97316" },
                      { label:"C3-C4", val: gwpDetailed.gwp_C, color:"#eab308" },
                    ].map((ph, i) => {
                      const total = gwpDetailed.gwp_A + gwpDetailed.gwp_B + gwpDetailed.gwp_C;
                      const pct = total > 0 ? ph.val / total * 100 : 0;
                      return pct > 0 ? <div key={i} className="h-full flex items-center justify-center text-[8px] font-bold" style={{width:pct+"%",backgroundColor:ph.color,minWidth:"20px"}} title={ph.label+": "+ph.val+" kgCO₂eq"}>{ph.label}</div> : null;
                    })}
                  </div>
                  {/* Top materials by GWP */}
                  {gwpDetailed.details.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] opacity-30 cursor-pointer hover:opacity-50">Top materiale după impact GWP</summary>
                      <div className="space-y-1 mt-2">
                        {gwpDetailed.details.slice(0,6).map((d,i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="opacity-50 truncate flex-1">{d.material}</span>
                            <span className="font-mono ml-2" style={{color: d.gwp_a > 0 ? "#ef4444" : "#22c55e"}}>{d.gwp_a > 0 ? "+" : ""}{d.gwp_a} kgCO₂eq</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="text-[10px] opacity-20 mt-2">Conform EN 15978. Ref. nZEB: ≤{gwpDetailed.benchmarkNZEB} kgCO₂eq/(m²·an). Faza D (credit reciclare): {gwpDetailed.gwp_D > 0 ? "-"+gwpDetailed.gwp_D+" kgCO₂eq" : "N/A"}.</div>
                </Card>
              </GradeGate>
              )}

              {/* ═════ E. CONFORMITATE EPBD 2024/1275 + Mc 001-2022 §5.12-5.17 ═════ */}

              {/* ── VERIFICARE nZEB / ZEB ── */}
              {zebVerification && (
                <Card title={t("Verificare nZEB / ZEB (EPBD 2024/1275)",lang)} className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* nZEB */}
                    <div className="rounded-xl p-4" style={{ background: zebVerification.nzeb.compliant ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${zebVerification.nzeb.compliant ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold">nZEB</span>
                        <Badge color={zebVerification.nzeb.compliant ? "green" : "red"}>
                          {zebVerification.nzeb.compliant ? "CONFORM" : "NECONFORM"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="opacity-50">EP ≤ {zebVerification.nzeb.ep_max}</span>
                          <span style={{ color: zebVerification.nzeb.epOk ? "#22c55e" : "#ef4444" }}>{zebVerification.epActual} kWh/(m²·an) {zebVerification.nzeb.epOk ? "✓" : "✗"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="opacity-50">RER ≥ {NZEB_THRESHOLDS[baseCatResolved]?.rer_min || 30}%</span>
                          <span style={{ color: zebVerification.nzeb.rerOk ? "#22c55e" : "#ef4444" }}>{zebVerification.rerActual}% {zebVerification.nzeb.rerOk ? "✓" : "✗"}</span>
                        </div>
                      </div>
                    </div>
                    {/* ZEB */}
                    <div className="rounded-xl p-4" style={{ background: zebVerification.zeb.compliant ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${zebVerification.zeb.compliant ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold">ZEB</span>
                        <Badge color={zebVerification.zeb.compliant ? "green" : "red"}>
                          {zebVerification.zeb.compliant ? "CONFORM" : "NECONFORM"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="opacity-50">EP ≤ {zebVerification.zeb.ep_max}</span>
                          <span style={{ color: zebVerification.zeb.epOk ? "#22c55e" : "#ef4444" }}>{zebVerification.epActual} kWh/(m²·an) {zebVerification.zeb.epOk ? "✓" : "✗"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="opacity-50">RER ≥ {ZEB_THRESHOLDS[baseCatResolved]?.rer_min || 50}%</span>
                          <span style={{ color: zebVerification.zeb.rerOk ? "#22c55e" : "#ef4444" }}>{zebVerification.rerActual}% {zebVerification.zeb.rerOk ? "✓" : "✗"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="opacity-50">Fără combustibil fosil</span>
                          <span style={{ color: zebVerification.zeb.noFossil ? "#22c55e" : "#ef4444" }}>{zebVerification.zeb.noFossil ? "Da ✓" : "Nu ✗"}</span>
                        </div>
                        <div className="text-[10px] opacity-30 mt-2">Termen: {zebVerification.zeb.deadline}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              {/* ── CONFORMITATE U ── */}
              {U_REF_NZEB_RES && (opaqueElements?.length > 0 || glazingElements?.length > 0) && (
                <Card title={t("Conformitate U față de referințe nZEB / renovare", lang)} className="mb-6">
                  <UComplianceTable
                    opaqueElements={opaqueElements}
                    glazingElements={glazingElements}
                    building={building}
                    calcOpaqueR={calcOpaqueR}
                    U_REF_NZEB_RES={U_REF_NZEB_RES}
                    U_REF_NZEB_NRES={U_REF_NZEB_NRES}
                    U_REF_RENOV_RES={U_REF_RENOV_RES}
                    U_REF_RENOV_NRES={U_REF_RENOV_NRES}
                    U_REF_GLAZING={U_REF_GLAZING}
                    ELEMENT_TYPES={ELEMENT_TYPES}
                    lang={lang}
                  />
                </Card>
              )}
              {/* ═══ BACS — SR EN ISO 52120-1:2022 (A5) — Sprint 5 ═══ */}
              {bacsCheck && bacsCheck.isApplicable && (
                <Card
                  title="BACS — Automatizare clădire (SR EN ISO 52120-1:2022)"
                  className="mb-6"
                  badge={
                    <Badge color={
                      bacsCheck.warningLevel === "error" ? "red" :
                      bacsCheck.warningLevel === "warning" ? "amber" :
                      bacsClass === "D" ? "red" :
                      bacsClass === "C" ? "amber" : "green"
                    }>{bacsCheck.isoLabels?.shortLabel || bacsClass}</Badge>
                  }
                >
                  <div className="space-y-3">
                    {/* Banner TERMEN EXPIRAT — roșu (Sprint 5 P8) */}
                    {bacsCheck.deadlineExpired && (
                      <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs space-y-1">
                        <div className="font-bold uppercase tracking-wide">🛑 Termen legal DEPĂȘIT</div>
                        <div>{bacsCheck.reason}</div>
                        <div className="text-red-300/80">{bacsCheck.epbdRef}</div>
                      </div>
                    )}
                    {/* Banner termen viitor (warning) */}
                    {!bacsCheck.deadlineExpired && bacsCheck.mandatory && bacsCheck.deadline && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                        <div className="font-semibold">⚠️ BACS obligatoriu</div>
                        <div>{bacsCheck.reason}</div>
                        <div className="text-amber-300/80">Termen: {bacsCheck.deadline} · {bacsCheck.epbdRef}</div>
                      </div>
                    )}

                    {/* Date clădire pentru verificare prag */}
                    <div className="text-xs opacity-60">
                      Putere HVAC instalată: <strong className="text-white/80">{heating.power || "—"} kW</strong>
                      {" · "}Categorie: <strong className="text-white/80">{building.category}</strong>
                      {" · "}Tipologie ISO 52120: <strong className="text-white/80">{bacsCheck.category}</strong>
                    </div>

                    {/* Selector clasă BACS (4 butoane) */}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Clasa BACS</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["A","B","C","D"].map(k => {
                          const info = BACS_CLASS_LABELS[k];
                          const isSel = bacsClass === k;
                          const isBelowMin = bacsCheck.minClass &&
                            ({A:4,B:3,C:2,D:1}[k] < {A:4,B:3,C:2,D:1}[bacsCheck.minClass]);
                          return (
                            <button key={k} type="button" onClick={() => setBacsClass(k)}
                              className={cn(
                                "p-2 rounded-lg border text-left transition-all",
                                isSel
                                  ? "bg-amber-500/15 border-amber-500/40 ring-2 ring-amber-500/30"
                                  : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                              )}>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-black" style={{color: info?.color}}>{info?.shortLabel}</span>
                                {isBelowMin && <span className="text-[9px] text-red-400">sub prag</span>}
                              </div>
                              <div className="text-[10px] font-semibold" style={{color: info?.color}}>{info?.economyPct}</div>
                              <div className="text-[10px] text-white/40 mt-1 leading-tight">{info?.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown factori per sistem — ISO 52120 Anexa B */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-white/50 hover:text-white/70">
                        Factori f_BAC per sistem (ISO 52120 Anexa B, categoria {bacsCheck.category})
                      </summary>
                      <div className="mt-2 grid grid-cols-5 gap-2 text-center">
                        {["heating","cooling","dhw","ventilation","lighting"].map(u => {
                          const f = bacsCheck.factors?.[u];
                          const label = {heating:"Încălzire", cooling:"Răcire", dhw:"ACM", ventilation:"Vent.", lighting:"Iluminat"}[u];
                          return (
                            <div key={u} className="p-2 rounded bg-white/[0.02] border border-white/5">
                              <div className="text-[10px] text-white/40">{label}</div>
                              <div className={cn("text-sm font-mono font-bold",
                                f == null ? "text-white/30" :
                                f < 1 ? "text-emerald-400" :
                                f > 1 ? "text-red-400" : "text-white/60")}>
                                {f == null ? "—" : f.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-white/30">
                                {f == null ? "N/A" : (Math.abs((1 - f) * 100)).toFixed(0) + "%"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    {/* Breakdown impact BACS pe qf raw vs. corectat */}
                    {instSummary?.bacs && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-white/50 hover:text-white/70">
                          Impact BACS pe energie finală (kWh/an)
                        </summary>
                        <div className="mt-2 space-y-1">
                          {["heating","dhw","cooling","ventilation","lighting"].map(key => {
                            const mapKey = { heating:"qf_h", dhw:"qf_w", cooling:"qf_c", ventilation:"qf_v", lighting:"qf_l" }[key];
                            const label = { heating:"Încălzire", dhw:"ACM", cooling:"Răcire", ventilation:"Ventilare", lighting:"Iluminat" }[key];
                            const rawVal = instSummary.bacs.raw?.[mapKey] || 0;
                            const corrVal = instSummary.bacs.corrected?.[mapKey] || 0;
                            const delta = rawVal - corrVal;
                            const pct = rawVal > 0 ? (delta/rawVal*100).toFixed(1) : "0.0";
                            return (
                              <div key={key} className="grid grid-cols-4 gap-2 py-1 border-b border-white/5">
                                <span className="text-white/50">{label}</span>
                                <span className="text-right font-mono text-white/40">{rawVal.toFixed(0)}</span>
                                <span className="text-right font-mono text-white/70">{corrVal.toFixed(0)}</span>
                                <span className={cn("text-right font-mono",
                                  delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-white/30")}>
                                  {delta > 0 ? "−" : delta < 0 ? "+" : ""}{Math.abs(delta).toFixed(0)} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                          <div className="grid grid-cols-4 gap-2 pt-2 font-semibold">
                            <span className="text-white/60">TOTAL economie</span>
                            <span className="text-right text-white/40">—</span>
                            <span className="text-right text-white/40">—</span>
                            <span className={cn("text-right font-mono",
                              instSummary.bacs.savings.total > 0 ? "text-emerald-400" :
                              instSummary.bacs.savings.total < 0 ? "text-red-400" : "text-white/30")}>
                              {instSummary.bacs.savings.total > 0 ? "−" : instSummary.bacs.savings.total < 0 ? "+" : ""}
                              {Math.abs(instSummary.bacs.savings.total).toFixed(0)} kWh ({instSummary.bacs.savings.totalPct}%)
                            </span>
                          </div>
                          <div className="text-[10px] text-white/30 pt-2">
                            Coloanele: Raw (fără BACS) · Corectat (cu f_BAC) · Economie · Procent
                          </div>
                        </div>
                      </details>
                    )}

                    {bacsCheck.recommendation && (
                      <div className="text-xs text-red-400/90 p-2 rounded bg-red-500/5 border border-red-500/20">
                        🔴 {bacsCheck.recommendation}
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {/* ═══ CONFORMITATE EPBD 2024 OBLIGATORIE (BACS + SRI + MEPS Simple) ═══
                  Mutat din Pas 6 → Pas 5 (1 mai 2026): f_BAC ajustează EP final, deci aparține
                  bilanțului energetic. SRI auto + MEPS binar decurg din bilanț.
                  Versiune detaliată (200 factori BACS, 42 servicii SRI, optimizator MEPS) → Pas 8 Expert. */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span>📋</span>
                  <span>{lang === "EN" ? "EPBD 2024 mandatory compliance" : "Conformitate EPBD 2024 obligatorie"}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <BACSSelectorSimple
                    value={bacsClass}
                    onChange={setBacsClass}
                    epBase={instSummary?.ep_total_m2 || renewSummary?.ep_adjusted_m2 || 0}
                    lang={lang}
                  />
                  <SRIScoreAuto
                    building={building}
                    heating={heating}
                    cooling={cooling}
                    ventilation={ventilation}
                    lighting={lighting}
                    acm={acm}
                    photovoltaic={photovoltaic}
                  />
                  <MEPSCheckBinar
                    energyClass={enClass?.cls}
                    buildingCategory={baseCatResolved}
                  />
                </div>
              </div>
              {/* ═══ NEW: EV CHARGER (A6) ═══ (Faza B — recomandare proiectare, EPBD Art. 12: ascuns la IIci) */}
              {evChargerCalc && evChargerCalc.required && (
              <GradeGate feature="evCharger" plan={userPlan} auditorGrad={auditorGrad}>
                <Card title="Puncte încărcare EV (EPBD Art.12)" className="mb-6" badge={<Badge color="blue">obligatoriu</Badge>}>
                  <div className="space-y-2">
                    <div className="text-xs opacity-60">{evChargerCalc.desc}</div>
                    <ResultRow label="Locuri parcare" value={building.parkingSpaces} />
                    <ResultRow label="Puncte încărcare necesare" value={evChargerCalc.chargers} unit="buc" />
                    <ResultRow label="Pre-cabling necesar" value={evChargerCalc.cablingSpots} unit="locuri" />
                    <ResultRow label="Putere minimă/punct" value={evChargerCalc.minPower} unit="kW" />
                    <ResultRow label="Putere totală" value={evChargerCalc.totalPowerKW.toFixed(1)} unit="kW" />
                    <ResultRow label="Cost estimat" value={evChargerCalc.costEstimate.toLocaleString("ro-RO")} unit="EUR" />
                  </div>
                </Card>
              </GradeGate>
              )}
              {/* ═══ NEW: SOLAR-READY CHECK (A7) ═══ */}
              {solarReadyCheck && (
                <Card title="Solar-Ready (EPBD Art.11)" className="mb-6" badge={<Badge color={solarReadyCheck.compliant ? "green" : "amber"}>{solarReadyCheck.verdict}</Badge>}>
                  <div className="space-y-1.5">
                    {solarReadyCheck.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span style={{color: c.ok ? "#22c55e" : "#ef4444"}}>{c.ok ? "✓" : "✗"}</span>
                        <span className="opacity-60">{c.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-white/[0.03] rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{width: solarReadyCheck.pct+"%", backgroundColor: solarReadyCheck.color}} />
                      </div>
                      <span className="text-xs font-mono" style={{color: solarReadyCheck.color}}>{solarReadyCheck.pct}%</span>
                    </div>
                  </div>
                </Card>
              )}
              {/* ── CONFORMITATE nZEB / ZEB / L.238/2024 ── */}
              {instSummary && renewSummary && (
                <Card title={lang==="EN"?"Regulatory compliance":"Conformitate normativă"} className="mb-6 border-amber-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* nZEB */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[baseCatResolved] || NZEB_THRESHOLDS.AL;
                      var epF = renewSummary.ep_adjusted_m2;
                      var isN = epF <= getNzebEpMax(baseCatResolved, selectedClimate?.zone) && renewSummary.rer >= nzeb.rer_min;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isN ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                          <div className="text-2xl font-black mb-1" style={{color:isN?"#22c55e":"#ef4444"}}>{isN?"✓":"✗"}</div>
                          <div className="text-xs font-bold">nZEB</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{getNzebEpMax(baseCatResolved, selectedClimate?.zone)} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">RER: {renewSummary.rer.toFixed(0)}/{nzeb.rer_min}%</div>
                        </div>
                      );
                    })()}
                    
                    {/* ZEB readiness */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[baseCatResolved] || NZEB_THRESHOLDS.AL;
                      var zebMax = getNzebEpMax(baseCatResolved, selectedClimate?.zone) * ZEB_FACTOR;
                      var epF = renewSummary.ep_adjusted_m2;
                      var hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                      var isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isZEB ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]")}>
                          <div className="text-2xl font-black mb-1" style={{color:isZEB?"#22c55e":"#888"}}>{isZEB?"✓":"—"}</div>
                          <div className="text-xs font-bold">{lang==="EN"?"ZEB Ready":"ZEB Ready"}</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{zebMax.toFixed(0)} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">{hasFossil ? (lang==="EN"?"Fossil fuel on-site":"Combustibil fosil on-site") : (lang==="EN"?"No fossil":"Fără fosil")}</div>
                          <div className="text-[10px] opacity-30 mt-1">EPBD IV Art.11 — 2028/2030</div>
                        </div>
                      );
                    })()}
                    
                    {/* RER decomposition L.238/2024 */}
                    <div className={cn("p-4 rounded-xl border text-center", renewSummary.rerOnSiteOk && renewSummary.rerTotalOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                      <div className="text-2xl font-black mb-1" style={{color:renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"#22c55e":"#eab308"}}>{renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"✓":"⚠"}</div>
                      <div className="text-xs font-bold">RER L.238/2024</div>
                      <div className="text-[10px] opacity-50 mt-1">On-site: {renewSummary.rerOnSite.toFixed(1)}% / min 10%</div>
                      <div className="text-[10px] opacity-50">Total: {renewSummary.rer.toFixed(1)}% / min 30%</div>
                      <div className="text-[10px] opacity-30 mt-1">Art.17 L.372/2005 mod. L.238/2024</div>
                    </div>
                  </div>
                  
                  {/* Solar obligation indicator */}
                  {["BI","ED","SA","HC","CO","SP"].includes(building.category) && parseFloat(building.areaUseful) > 250 && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
                      <span className="text-xl">☀️</span>
                      <div>
                        <div className="text-xs font-bold text-amber-400">{lang==="EN"?"Solar installation obligation":"Obligație instalație solară"}</div>
                        <div className="text-[10px] opacity-50">{lang==="EN"?"EPBD IV Art.10: mandatory for non-residential >250m² by end 2026":"EPBD IV Art.10: obligatoriu pt. non-rezidențial >250m² de la sfârșitul 2026"}</div>
                        <div className="text-[10px] opacity-50">{photovoltaic.enabled || solarThermal.enabled ? "✓ Instalație solară configurată" : "⚠ Nicio instalație solară configurată"}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* GWP lifecycle — calcul simplificat */}
                  {(() => {
                    const gwpManual = parseFloat(building.gwpLifecycle) || 0;
                    const co2Op = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
                    // Embodied carbon estimate: ~8-12 kgCO2eq/m²/an for 50yr lifecycle (EN 15978)
                    // Simplified: residential ~10, non-residential ~12, renovation ~5
                    const yearBuilt = parseInt(building.yearBuilt) || 2000;
                    const isNew = yearBuilt >= 2020;
                    const embodiedEst = isNew ? (["RI","RC","RA"].includes(building.category) ? 10 : 12) : 5;
                    const gwpCalc = gwpManual > 0 ? gwpManual : (co2Op + embodiedEst);
                    const gwpLimit = 50; // EPBD IV indicative threshold
                    const obligatory = Au > 1000 || (["BI","ED","SA","HC","CO","SP"].includes(building.category) && Au > 250);
                    return (
                    <div className={cn("mt-3 p-3 rounded-lg border flex items-center gap-3", 
                      obligatory ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/[0.02]")}>
                      <span className="text-xl">{obligatory ? "🌍" : <span className="opacity-30">🌍</span>}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium opacity-60">GWP Lifecycle (kg CO₂eq/m²/an)</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-lg font-bold" style={{color: gwpCalc < 30 ? "#22c55e" : gwpCalc < gwpLimit ? "#eab308" : "#ef4444"}}>{gwpCalc.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">
                            = CO₂ operațional ({co2Op.toFixed(1)}) + carbon înglobat ({gwpManual > 0 ? "manual" : "~" + embodiedEst + " est."})
                          </div>
                        </div>
                        <div className="text-[10px] opacity-30 mt-1">
                          EPBD IV Art.7 {obligatory ? "— OBLIGATORIU pt. această clădire" : "— opțional (obligatoriu >1000m² din 2028)"} | Estimare conform EN 15978
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </Card>
              )}

              {/* ═════ F. ANALIZĂ DETALIATĂ COMPONENTE ═════ */}

              {/* ── ACM EN 15316 DETALIAT ── */}
              {acmDetailed && (
                <Card title="Sistem ACM — Analiză detaliată EN 15316-3/5" className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                      <div className="text-[10px] opacity-40 mb-1">Necesar termic brut</div>
                      <div className="text-xl font-mono font-bold text-orange-400">{acmDetailed.Q_nd_annual_kWh.toFixed(0)}</div>
                      <div className="text-[10px] opacity-30">kWh/an</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                      <div className="text-[10px] opacity-40 mb-1">Eficiență sistem</div>
                      <div className="text-xl font-mono font-bold" style={{color: acmDetailed.color}}>
                        {(acmDetailed.eta_system * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] opacity-30">{acmDetailed.verdict}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                      <div className="text-[10px] opacity-40 mb-1">Energie finală sursă</div>
                      <div className="text-xl font-mono font-bold text-white/70">{acmDetailed.Q_final_kWh.toFixed(0)}</div>
                      <div className="text-[10px] opacity-30">kWh/an (η_gen={acmDetailed.eta_gen})</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="space-y-1">
                      <ResultRow label="Pierderi distribuție" value={acmDetailed.Q_dist_kWh.toFixed(0)} unit={`kWh/an (${acmDetailed.f_dist_pct}%)`}
                        status={acmDetailed.f_dist_pct > 20 ? "fail" : acmDetailed.f_dist_pct > 12 ? "warn" : "ok"} />
                      <ResultRow label="Pierderi stocare" value={acmDetailed.Q_storage_kWh.toFixed(0)} unit={`kWh/an (${acmDetailed.f_storage_pct}%)`}
                        status={acmDetailed.f_storage_pct > 15 ? "fail" : acmDetailed.f_storage_pct > 8 ? "warn" : "ok"} />
                      <ResultRow label="Pierderi standby boiler" value={acmDetailed.q_standby_kWh_day.toFixed(1)} unit="kWh/zi" />
                      {acmDetailed.Q_legionella_kWh > 0 && (
                        <ResultRow label="Supliment Legionella (tratament)" value={acmDetailed.Q_legionella_kWh.toFixed(0)} unit={`kWh/an (${acmDetailed.f_legionella_pct}%)`}
                          status={acmDetailed.f_legionella_pct > 10 ? "warn" : "ok"} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <ResultRow label="Volum boiler estimat" value={acmDetailed.vol_L} unit="L" />
                      {acmDetailed.solarFraction_pct > 0 && (
                        <ResultRow label="Contribuție solară" value={`${acmDetailed.solarFraction_pct}%`} unit={`(${acmDetailed.Q_solar_kWh.toFixed(0)} kWh/an)`} status="ok" />
                      )}
                      <ResultRow label="Temp. apă caldă / rece" value={`${acmDetailed.tSupply}°C / ${acmDetailed.tCold}°C`} unit="" />
                    </div>
                  </div>

                  {/* Sprint 4b — Breakdown energetic ACM (brut → economie solar → net → final) */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 mb-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2">Breakdown energetic ACM (EN 15316)</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between opacity-70">
                        <span>Q_nd necesar termic util</span>
                        <span>{acmDetailed.Q_nd_annual_kWh} kWh/an</span>
                      </div>
                      <div className="flex justify-between opacity-60 pl-3">
                        <span>+ pierderi distribuție</span>
                        <span>+ {acmDetailed.Q_dist_kWh}</span>
                      </div>
                      <div className="flex justify-between opacity-60 pl-3">
                        <span>+ pierderi stocare</span>
                        <span>+ {acmDetailed.Q_storage_kWh}</span>
                      </div>
                      {acmDetailed.Q_legionella_kWh > 0 && (
                        <div className="flex justify-between opacity-60 pl-3">
                          <span>+ supliment Legionella</span>
                          <span>+ {acmDetailed.Q_legionella_kWh}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-white/[0.08] pt-1 mt-1">
                        <span>= Q_gen_brut (fără solar)</span>
                        <span>{(acmDetailed.Q_nd_annual_kWh + acmDetailed.Q_dist_kWh + acmDetailed.Q_storage_kWh + acmDetailed.Q_legionella_kWh).toFixed(0)} kWh/an</span>
                      </div>
                      {acmDetailed.Q_solar_kWh > 0 && (
                        <>
                          <div className="flex justify-between text-emerald-400 pl-3">
                            <span>− economie solar termic ({acmDetailed.solarFraction_pct}%)</span>
                            <span>− {acmDetailed.Q_solar_kWh}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/[0.08] pt-1 mt-1">
                            <span>= Q_gen_net (dup\u0103 solar)</span>
                            <span>{acmDetailed.Q_gen_needed_kWh} kWh/an</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between opacity-60 pl-3">
                        <span>÷ η_gen = {acmDetailed.eta_gen}</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between font-semibold text-white/90 border-t border-white/[0.12] pt-1 mt-1">
                        <span>= Q_final energie furnizată</span>
                        <span>{acmDetailed.Q_final_kWh} kWh/an</span>
                      </div>
                    </div>
                    {instSummary?.acmSolar?.source && instSummary.acmSolar.source !== "none" && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] text-[10px] opacity-60 flex items-center gap-2">
                        <span>Sursă f_sol:</span>
                        <span className={instSummary.acmSolar.source === "step8_calc" ? "text-emerald-300 font-mono" : "text-amber-300 font-mono"}>
                          {instSummary.acmSolar.source === "step8_calc"
                            ? "✓ calculată EN 15316-4-3 (Step 4 Regenerabile)"
                            : "⚠ implicită (constantă ACM_SOURCES — activați Step 4 pentru calcul real)"}
                        </span>
                      </div>
                    )}
                  </div>
                  {acmDetailed.recommendations.length > 0 && (
                    <div className="space-y-1">
                      {acmDetailed.recommendations.map((r, i) => (
                        <div key={i} className="text-[10px] text-yellow-400/70 flex gap-2">
                          <span>💡</span><span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* ═════ G. ANALIZĂ COST (orientativă, post-clasare) ═════ */}

              {/* ── COST ANUAL ENERGIE ── */}
              {annualEnergyCost && (
                <Card title={t("Cost anual energie estimat (prețuri 2025)",lang)} className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Total */}
                    <div className="text-center sm:text-left">
                      <div className="text-3xl font-black font-mono text-amber-400">{annualEnergyCost.total.toLocaleString("ro-RO")} <span className="text-lg opacity-60">lei/an</span></div>
                      <div className="text-sm opacity-40 mt-1">≈ {annualEnergyCost.totalEur.toLocaleString("ro-RO")} EUR/an</div>
                      <div className="text-[10px] opacity-25 mt-2">{annualEnergyCost.note}</div>
                    </div>
                    {/* Breakdown bars */}
                    <div className="space-y-2">
                      {[
                        { label: "Încălzire", val: annualEnergyCost.costH, color: "#ef4444" },
                        { label: "Apă caldă", val: annualEnergyCost.costW, color: "#f97316" },
                        { label: "Răcire", val: annualEnergyCost.costC, color: "#3b82f6" },
                        { label: "Ventilare", val: annualEnergyCost.costV, color: "#8b5cf6" },
                        { label: "Iluminat", val: annualEnergyCost.costL, color: "#eab308" },
                      ].map(item => {
                        const pct = annualEnergyCost.total > 0 ? (item.val / annualEnergyCost.total * 100) : 0;
                        return (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-[10px] opacity-50 w-16 text-right shrink-0">{item.label}</span>
                            <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color, minWidth: pct > 0 ? "4px" : "0" }} />
                            </div>
                            <span className="text-[10px] font-mono opacity-60 w-16 shrink-0">{item.val.toLocaleString("ro-RO")} lei</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}
              {/* ── ESTIMARE COST ENERGIE ANUAL ── (Faza A — Preseturi ANRE + tarife custom: ascuns la IIci) */}
              {instSummary && (
              <GradeGate feature="costAnnualDetail" plan={userPlan} auditorGrad={auditorGrad}>
                <Card title={t("Estimare cost energie anual",lang)} className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const prices = energyPrices;
                      const fuelId = instSummary.fuel?.id || "gaz";
                      const priceFuel = prices[fuelId] || 0.32;
                      const priceElec = prices.electricitate;
                      const costHeat = instSummary.qf_h * priceFuel;
                      const costACM = instSummary.qf_w * (fuelId === "electricitate" ? priceElec : priceFuel);
                      const costCool = instSummary.qf_c * priceElec;
                      const costVentLight = (instSummary.qf_v + instSummary.qf_l) * priceElec;
                      const costTotal = costHeat + costACM + costCool + costVentLight;
                      const costPerM2 = Au > 0 ? costTotal / Au : 0;
                      return (
                        <>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-amber-400">{fmtRON(costTotal)}</div>
                            <div className="text-[10px] opacity-40">RON/an total</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-white">{fmtRON(costPerM2, 1)}</div>
                            <div className="text-[10px] opacity-40">RON/(m² an)</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-red-400">{fmtRON(costHeat)}</div>
                            <div className="text-[10px] opacity-40">RON încălzire</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-blue-400">{fmtRON(costCool + costVentLight)}</div>
                            <div className="text-[10px] opacity-40">RON răcire+vent+il</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* ── Preseturi ANRE ── */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Preseturi ANRE 2025</div>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {ENERGY_PRICE_PRESETS.map(preset => (
                        <button key={preset.id} onClick={() => setEnergyPrices(p => ({ ...p, ...preset.prices }))}
                          className="flex items-start gap-2 p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-all text-left">
                          <span className="text-sm mt-0.5">{preset.icon}</span>
                          <div>
                            <div className="text-[10px] font-semibold leading-tight">{preset.label}</div>
                            <div className="text-[10px] opacity-40 leading-tight">{preset.sublabel}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Tarife personalizate (RON/kWh)</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {Object.entries(energyPrices).map(function(entry) { return (
                        <div key={entry[0]} className="flex items-center gap-1.5">
                          <span className="text-xs">{PRICE_ICONS[entry[0]] || "⚙️"}</span>
                          <span className="text-[10px] opacity-50 flex-1 truncate">{PRICE_LABELS[entry[0]] || entry[0]}</span>
                          <input type="number" value={entry[1]} step="0.01" min="0"
                            onChange={function(e){setEnergyPrices(function(p){var n=Object.assign({},p);n[entry[0]]=parseFloat(e.target.value)||0;return n;});}}
                            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-right"/>
                        </div>
                      ); })}
                    </div>
                  </div>
                </Card>
              </GradeGate>
              )}
              {/* ── COST ESTIMATIV REABILITARE ── (Faza A — ascuns la IIci, Art. 6 alin. 2) */}
              {rehabCostEstimate && (
              <GradeGate feature="rehabCostEstimate" plan={userPlan} auditorGrad={auditorGrad}>
                <Card title="Cost estimativ reabilitare termică" className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-center">
                      <div className="text-2xl font-black font-mono text-amber-400">{rehabCostEstimate.total_lei.toLocaleString("ro-RO")}</div>
                      <div className="text-[10px] opacity-40 mt-1">lei (total cu neprevăzut {(rehabCostEstimate.contingency_pct*100).toFixed(0)}%)</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                      <div className="text-xl font-bold font-mono opacity-70">{rehabCostEstimate.total_eur.toLocaleString("ro-RO")}</div>
                      <div className="text-[10px] opacity-40 mt-1">EUR (fără TVA)</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                      <div className="text-xl font-bold font-mono opacity-70">{rehabCostEstimate.total_per_m2.toLocaleString("ro-RO")}</div>
                      <div className="text-[10px] opacity-40 mt-1">EUR/m² util</div>
                    </div>
                  </div>
                  {/* Detaliu pe categorii */}
                  {rehabCostEstimate.items.length > 0 && (
                    <div className="space-y-1.5">
                      {rehabCostEstimate.items.map((item, i) => {
                        const pct = rehabCostEstimate.subtotal_eur > 0 ? (item.total_eur / rehabCostEstimate.subtotal_eur * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="opacity-50 truncate w-52 shrink-0">{item.label}</span>
                            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#f59e0b", minWidth: pct > 0 ? "2px" : "0" }} />
                            </div>
                            <span className="font-mono opacity-60 w-20 text-right shrink-0">{item.total_eur.toLocaleString("ro-RO")} €</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                        <span className="opacity-40">Neprevăzut ({(rehabCostEstimate.contingency_pct*100).toFixed(0)}%)</span>
                        <span className="font-mono opacity-50">{rehabCostEstimate.contingency_eur.toLocaleString("ro-RO")} €</span>
                      </div>
                    </div>
                  )}
                  {/* Finanțare eligibilă */}
                  {(rehabCostEstimate.fundingEligible.pnrr_max > 0 || rehabCostEstimate.fundingEligible.casa_verde_max > 0 || rehabCostEstimate.fundingEligible.afm_max > 0) && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Finanțare eligibilă orientativă</div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {rehabCostEstimate.fundingEligible.pnrr_max > 0 && (
                          <span className="text-emerald-400">PNRR: max {rehabCostEstimate.fundingEligible.pnrr_max.toLocaleString("ro-RO")} €</span>
                        )}
                        {rehabCostEstimate.fundingEligible.casa_verde_max > 0 && (
                          <span className="text-emerald-400">Casa Verde: max {rehabCostEstimate.fundingEligible.casa_verde_max.toLocaleString("ro-RO")} €</span>
                        )}
                        {rehabCostEstimate.fundingEligible.afm_max > 0 && (
                          <span className="text-emerald-400">AFM: max {rehabCostEstimate.fundingEligible.afm_max.toLocaleString("ro-RO")} €</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 text-[10px] opacity-25">{rehabCostEstimate.meta.note}</div>
                </Card>
              </GradeGate>
              )}
              {/* ── GRAFIC AMORTIZARE INVESTIȚIE (NPV 20 ani) ── (Faza A — ascuns la IIci, Mc 001-2022 §8.5) */}
              {instSummary && renewSummary && envelopeSummary && (
              <GradeGate feature="npvCurve" plan={userPlan} auditorGrad={auditorGrad}>
              {(() => {
                const Au = parseFloat(building.areaUseful) || 1;
                const fuelId = instSummary.fuel?.id || "gaz";
                const priceFuel = energyPrices?.[fuelId] || (fuelId === "gaz" ? 0.31 : fuelId === "electricitate" ? 1.10 : 0.30);
                const priceElec = energyPrices?.electricitate || 1.10;
                const annualCost = instSummary.qf_h * priceFuel
                  + instSummary.qf_w * priceFuel
                  + instSummary.qf_c * priceElec
                  + instSummary.qf_v * priceElec
                  + instSummary.qf_l * priceElec;
                // Sprint Audit Prețuri (9 mai 2026) Task A — costFn returnează {low, mid, high} în RON
                // Sursa canonică: REHAB_PRICES (rehab-prices.js) × curs EUR/RON live BNR.
                const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
                const MEASURE_DEFS = [
                  { name: "Termoizolație pereți", short: "Pereți", color: "#3b82f6", savePct: 0.18,
                    costFn: (au, eur) => ({
                      low:  REHAB_PRICES.envelope.wall_eps_10cm.low  * au * 2.5 * eur,
                      mid:  REHAB_PRICES.envelope.wall_eps_10cm.mid  * au * 2.5 * eur,
                      high: REHAB_PRICES.envelope.wall_eps_10cm.high * au * 2.5 * eur,
                    }) },
                  { name: "Ferestre triple", short: "Ferestre", color: "#a855f7", savePct: 0.12,
                    costFn: (au, eur) => ({
                      low:  REHAB_PRICES.envelope.windows_u110.low  * au * 0.15 * eur,
                      mid:  REHAB_PRICES.envelope.windows_u110.mid  * au * 0.15 * eur,
                      high: REHAB_PRICES.envelope.windows_u110.high * au * 0.15 * eur,
                    }) },
                  { name: "Termoizolație acoperiș", short: "Acoperiș", color: "#f97316", savePct: 0.10,
                    costFn: (au, eur) => ({
                      low:  REHAB_PRICES.envelope.roof_eps_15cm.low  * au * eur,
                      mid:  REHAB_PRICES.envelope.roof_eps_15cm.mid  * au * eur,
                      high: REHAB_PRICES.envelope.roof_eps_15cm.high * au * eur,
                    }) },
                  { name: "Pompă de căldură", short: "Pompă", color: "#22c55e", savePct: 0.30,
                    costFn: (_au, eur) => ({
                      low:  REHAB_PRICES.heating.hp_aw_12kw.low  * eur,
                      mid:  REHAB_PRICES.heating.hp_aw_12kw.mid  * eur,
                      high: REHAB_PRICES.heating.hp_aw_12kw.high * eur,
                    }) },
                  { name: "PV 5kWp", short: "PV 5kWp", color: "#facc15", savePct: 0.15,
                    costFn: (_au, eur) => ({
                      low:  REHAB_PRICES.renewables.pv_kwp.low  * 5 * eur,
                      mid:  REHAB_PRICES.renewables.pv_kwp.mid  * 5 * eur,
                      high: REHAB_PRICES.renewables.pv_kwp.high * 5 * eur,
                    }) },
                ];
                const measures = MEASURE_DEFS.map(d => {
                  const c = d.costFn(Au, eurRon);
                  return {
                    name: d.name, short: d.short, color: d.color, savePct: d.savePct,
                    costLow:  Math.round(c.low),
                    cost:     Math.round(c.mid),   // backward-compat: cost == mid pentru tabel
                    costHigh: Math.round(c.high),
                  };
                });
                const discount = 0.05;
                const years = 20;

                // Calculează 3 trasee NPV per măsură (low/mid/high) — economia anuală e identică,
                // diferă doar investiția inițială. Bandă low–high arată sensibilitatea preț.
                const curves = measures.map(m => {
                  const annSave = annualCost * m.savePct;
                  const buildPts = (cost) => {
                    const pts = [{ yr: 0, npv: -cost }];
                    let cumNPV = -cost;
                    for (let yr = 1; yr <= years; yr++) {
                      if (annSave > 0) cumNPV += annSave / Math.pow(1 + discount, yr);
                      pts.push({ yr, npv: cumNPV });
                    }
                    return pts;
                  };
                  const ptsLow  = buildPts(m.costLow);
                  const ptsMid  = buildPts(m.cost);
                  const ptsHigh = buildPts(m.costHigh);
                  // Break-even calculat pe scenariul MID (consistent cu badge break-even)
                  const paybackYr = annSave > 0 ? ptsMid.findIndex(p => p.npv >= 0) : -1;
                  return { ...m, pts: ptsMid, ptsLow, ptsHigh, paybackYr, annSave };
                });

                // Y-domain include toate cele 3 trasee (low cel mai negativ start, high cel mai puțin profit final)
                const allNPV = curves.flatMap(c => [...c.ptsLow, ...c.pts, ...c.ptsHigh].map(p => p.npv));
                const rawMin = Math.min(...allNPV), rawMax = Math.max(...allNPV);
                const pad = (rawMax - rawMin) * 0.10;
                const yMin = rawMin - pad, yMax = rawMax + pad;
                const rawStep = (yMax - yMin) / 5;
                const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
                const niceStep = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= rawStep) || rawStep;
                const niceMin = Math.floor(yMin / niceStep) * niceStep;
                const yTicks = [];
                for (let v = niceMin; v <= yMax + niceStep * 0.01; v += niceStep) yTicks.push(Math.round(v));

                const W = 800, H = 400;
                const pL = 72, pR = 92, pT = 32, pB = 48;
                const cW = W - pL - pR, cH = H - pT - pB;
                const toX = yr => pL + (yr / years) * cW;
                const toY = v => pT + cH - ((v - yMin) / (yMax - yMin)) * cH;
                const fmtChart = v => { const a = Math.abs(v); return `${v < 0 ? "-" : ""}${a >= 1000 ? (a / 1000).toFixed(0) + "k" : Math.round(a)}`; };
                const breakY = toY(0);

                // Poziții etichete end-of-line fără suprapunere (sort desc NPV, offset minim 13px)
                const sortedByNpv = [...curves].sort((a, b) => b.pts[years].npv - a.pts[years].npv);
                const labelYMap = {};
                let prevLabelY = -Infinity;
                sortedByNpv.forEach(c => {
                  const raw = toY(c.pts[years].npv);
                  const ly = Math.max(raw, prevLabelY + 13);
                  labelYMap[c.name] = ly;
                  prevLabelY = ly;
                });

                return (
                <Card title={lang==="EN"?"Investment payback (NPV 20 years)":"Amortizare investiție (NPV 20 ani)"} className="mb-6 border-amber-500/20">
                  <div className="w-full">
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', aspectRatio: `${W}/${H}` }} className="overflow-visible">
                    {/* Zone colorate: verde deasupra break-even, roșu dedesubt */}
                    {breakY > pT && breakY < pT + cH && (
                      <>
                        <rect x={pL} y={pT} width={cW} height={Math.max(0, breakY - pT)} fill="rgba(34,197,94,0.06)" />
                        <rect x={pL} y={breakY} width={cW} height={Math.max(0, pT + cH - breakY)} fill="rgba(239,68,68,0.07)" />
                      </>
                    )}
                    {/* Y grid + etichete RON */}
                    {yTicks.map((v, i) => {
                      const y = toY(v);
                      if (y < pT - 2 || y > pT + cH + 2) return null;
                      const isZero = v === 0;
                      return (
                        <g key={"yt"+i}>
                          <line x1={pL} y1={y} x2={pL+cW} y2={y}
                            stroke={isZero ? "#f59e0b" : theme==="dark" ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.10)"}
                            strokeWidth={isZero ? 1.5 : 0.6}
                            strokeDasharray={isZero ? "5 3" : undefined} />
                          <text x={pL-6} y={y+4} textAnchor="end" fontSize="10" fill={isZero ? "#fbbf24" : "#b0b8c8"}>{fmtChart(v)}</text>
                        </g>
                      );
                    })}
                    {/* X grid + etichete ani */}
                    {[0,5,10,15,20].map(yr => {
                      const x = toX(yr);
                      return (
                        <g key={"xt"+yr}>
                          <line x1={x} y1={pT} x2={x} y2={pT+cH} stroke={theme==="dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"} strokeWidth="0.6" />
                          <text x={x} y={pT+cH+18} textAnchor="middle" fontSize="10" fill="#b0b8c8">{yr}</text>
                        </g>
                      );
                    })}
                    {/* Axe */}
                    <line x1={pL} y1={pT} x2={pL} y2={pT+cH} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                    <line x1={pL} y1={pT+cH} x2={pL+cW} y2={pT+cH} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                    <text x={pL+cW/2} y={H-4} textAnchor="middle" fontSize="11" fill="#c8cfd8">Ani</text>
                    <text x={pL-6} y={pT-8} textAnchor="end" fontSize="10" fill="#a8b0c0">RON</text>
                    {/* Etichete zone */}
                    {breakY > pT + 18 && (
                      <text x={pL+6} y={pT+14} fontSize="9" fill="rgba(34,197,94,0.55)" fontStyle="italic">Profit net</text>
                    )}
                    {breakY < pT + cH - 12 && (
                      <text x={pL+6} y={pT+cH-6} fontSize="9" fill="rgba(239,68,68,0.50)" fontStyle="italic">Investiție nerecuperată</text>
                    )}
                    {/* Curbe + marcatori — Sprint Audit Prețuri Task A: 3 scenarii bandă low/mid/high */}
                    {curves.map((c, ci) => {
                      const ptStrLow  = c.ptsLow.map(p => `${toX(p.yr)},${toY(p.npv)}`).join(" ");
                      const ptStrMid  = c.pts.map(p => `${toX(p.yr)},${toY(p.npv)}`).join(" ");
                      const ptStrHigh = c.ptsHigh.map(p => `${toX(p.yr)},${toY(p.npv)}`).join(" ");
                      // Polygon bandă: low (sus) → high (jos, traseat invers) închis
                      const bandPoints = [
                        ...c.ptsLow.map(p => `${toX(p.yr)},${toY(p.npv)}`),
                        ...c.ptsHigh.slice().reverse().map(p => `${toX(p.yr)},${toY(p.npv)}`),
                      ].join(" ");
                      const pbX = c.paybackYr > 0 ? toX(c.paybackYr) : null;
                      const npv20Mid  = c.pts[years].npv;
                      const npv20Low  = c.ptsLow[years].npv;
                      const npv20High = c.ptsHigh[years].npv;
                      const endX = toX(years);
                      const endY = toY(npv20Mid);
                      const lY = labelYMap[c.name] ?? endY;
                      const tipText = `${c.name}\nEconomie: ${fmtChart(c.annSave)} RON/an (${(c.annSave/Au).toFixed(0)} RON/m²·an)\nInvestiție bandă: ${fmtChart(c.costLow)}–${fmtChart(c.costHigh)} RON (mid: ${fmtChart(c.cost)})\nNPV 20 ani bandă: ${fmtChart(npv20High)}–${fmtChart(npv20Low)} RON (mid: ${fmtChart(npv20Mid)})\nRecuperare (mid): ${c.paybackYr > 0 ? c.paybackYr+" ani" : ">20 ani"}`;
                      return (
                        <g key={"c"+ci}>
                          <title>{tipText}</title>
                          {/* Polyline MID solidă (scenariu realist) */}
                          <polyline points={ptStrMid} fill="none" stroke={c.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                          {/* hitbox larg pentru tooltip */}
                          <polyline points={ptStrMid} fill="none" stroke="transparent" strokeWidth="16" />
                          {/* 4. Dot break-even pe MID */}
                          {pbX && (
                            <circle cx={pbX} cy={breakY} r="5" fill={c.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
                          )}
                          {/* Dot start pe MID */}
                          <circle cx={toX(0)} cy={toY(-c.cost)} r="3.5" fill={c.color} opacity="0.85" />
                          {/* 5. End-of-line label la MID cu linie de legătură dacă e offset */}
                          {Math.abs(lY - endY) > 3 && (
                            <line x1={endX} y1={endY} x2={endX+7} y2={lY} stroke={c.color} strokeWidth="0.8" opacity="0.45" />
                          )}
                          <text x={endX+10} y={lY+4} fontSize="10" fill={c.color} fontWeight="500">{c.short}</text>
                        </g>
                      );
                    })}
                    {/* Badge break-even */}
                    {breakY > pT && breakY < pT+cH && (
                      <>
                        <rect x={pL+cW-62} y={breakY-17} width={58} height={13} rx="3" fill="rgba(245,158,11,0.14)" />
                        <text x={pL+cW-33} y={breakY-7} textAnchor="middle" fontSize="9.5" fill="#fbbf24" fontWeight="600">break-even</text>
                      </>
                    )}
                  </svg>
                  </div>
                  {/* Legendă tabel */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px]">
                          <th className="text-left py-1 pr-3 font-normal opacity-50">Măsură</th>
                          <th className="text-right py-1 px-2 font-normal opacity-50">Cost est.</th>
                          <th className="text-right py-1 px-2 font-normal opacity-50">Economie/an</th>
                          <th className="text-right py-1 px-2 font-normal opacity-50">Recuperare</th>
                          <th className="text-right py-1 pl-2 font-normal opacity-50">NPV 20 ani</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curves.map((m, i) => {
                          const payback = m.annSave > 0 ? (m.paybackYr > 0 ? `${m.paybackYr} ani` : ">20 ani") : "—";
                          const npv20Mid  = m.pts[years].npv;
                          const npv20Low  = m.ptsLow[years].npv;
                          const npv20High = m.ptsHigh[years].npv;
                          return (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1.5 pr-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-[3px] rounded flex-shrink-0" style={{background: m.color}} />
                                  <span className="opacity-85">{m.name}</span>
                                </div>
                              </td>
                              <td className="text-right py-1.5 px-2 opacity-65 tabular-nums">
                                <div>{fmtChart(m.cost)} RON</div>
                                <div className="text-[10px] opacity-50">{fmtChart(m.costLow)}–{fmtChart(m.costHigh)}</div>
                              </td>
                              <td className="text-right py-1.5 px-2 opacity-65 tabular-nums">{fmtChart(m.annSave)} RON</td>
                              <td className="text-right py-1.5 px-2 font-bold tabular-nums" style={{color: m.color}}>{payback}</td>
                              <td className="text-right py-1.5 pl-2 opacity-80 tabular-nums">
                                <div>{fmtChart(npv20Mid)} RON</div>
                                <div className="text-[10px] opacity-50">{fmtChart(npv20High)}–{fmtChart(npv20Low)}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs opacity-50 mt-2">NPV cu rată discount 5%/an · prețuri constante {priceFuel.toFixed(2)} RON/kWh ({fuelId}) · elec. {priceElec.toFixed(2)} RON/kWh · Bandă = scenariile <span className="opacity-80">low</span> – <span className="opacity-80">mid</span> – <span className="opacity-80">high</span> (sensibilitate preț) · Punct colorat = recuperare investiție (mid)</div>
                  <div className="text-[10px] opacity-45 mt-1">Prețuri {new Date().getFullYear()} · sursa: <span className="font-mono">rehab-prices.js</span> ({REHAB_PRICES.last_updated}) · curs {eurRon.toFixed(2)} RON/EUR</div>
                </Card>
                );
              })()}
              </GradeGate>
              )}

              {/* ═════ H. BENCHMARKING & SCENARII REABILITARE ═════ */}


              {/* ── Benchmarking — comparație cu referințe ── (Faza B — context audit, ascuns la IIci) */}
              {instSummary && (
              <GradeGate feature="benchmarkPeer" plan={userPlan} auditorGrad={auditorGrad}>
                <Card title={lang==="EN"?"Benchmarking vs. reference buildings":"Benchmarking — comparație referințe"} className="mb-6">
                  <div className="space-y-2">
                    {(function() {
                      const cat = building.category || "RI";
                      const isRes = ["RI","RC","RA"].includes(cat);
                      const nzebEp = getNzebEpMax(cat, selectedClimate?.zone);
                      return isRes ? [
                        {label:"Clădire veche neizolată (pre-1990)",ep:350,co2:45},
                        {label:"Clădire izolată parțial (1990-2010)",ep:180,co2:25},
                        {label:"Clădire conformă 2010-2020",ep:120,co2:15},
                        {label:"Standard nZEB (2021+)",ep:nzebEp,co2:8},
                        {label:"Pasivhaus",ep:40,co2:4},
                      ] : [
                        {label:"Clădire veche neizolată (pre-1990)",ep:450,co2:55},
                        {label:"Clădire izolată parțial (1990-2010)",ep:250,co2:30},
                        {label:"Clădire conformă 2010-2020",ep:160,co2:18},
                        {label:"Standard nZEB (2021+)",ep:nzebEp,co2:10},
                        {label:"Best practice",ep:60,co2:5},
                      ];
                    })().map(function(ref,i) {
                      var myEp = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
                      var maxEp = 400;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] opacity-50 w-40 shrink-0 truncate">{ref.label}</span>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="h-full rounded-full opacity-40" style={{width:Math.min(100,ref.ep/maxEp*100)+"%",backgroundColor:"#666"}}/>
                            <div className="absolute top-0 left-0 h-full w-0.5 bg-amber-500" style={{left:Math.min(100,myEp/maxEp*100)+"%"}}/>
                          </div>
                          <span className="text-[10px] font-mono opacity-40 w-10 text-right">{ref.ep}</span>
                        </div>
                      );
                    })}
                    <div className="text-[10px] opacity-30 mt-1">Linia amber = clădirea dvs. ({(renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2).toFixed(0)} kWh/m2a) | Bare gri = referințe tipice</div>
                  </div>
                </Card>
              </GradeGate>
              )}
              {/* ═══ BENCHMARK NAȚIONAL ═══ */}
              {epFinal > 0 && (
                <Card className="p-4">
                  <BenchmarkNational
                    epValue={epFinal}
                    buildingType={categoryToBenchmarkType(building.category)}
                    countyCode={countyNameToCode(building.county) || "B"}
                  />
                </Card>
              )}
              {/* ── COMPARAȚIE SCENARII ── (Faza A — ascuns la IIci, Mc 001-2022 Cap. 8 audit) */}
              <GradeGate feature="rehabScenarios" plan={userPlan} auditorGrad={auditorGrad}>
              <Card title={t("Comparație scenarii",lang)} badge={
                <button onClick={() => setShowScenarioCompare(!showScenarioCompare)}
                  className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">
                  {showScenarioCompare ? "Ascunde" : "Configurează reabilitare"}
                </button>}>

                {showScenarioCompare && (
                  <div className="space-y-3 mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-xs font-medium opacity-50 mb-2">Măsuri de reabilitare propuse:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key:"addInsulWall", label:"Suplimentare izolație pereți", unitKey:"insulWallThickness", unit:"cm EPS" },
                        { key:"addInsulRoof", label:"Suplimentare izolație acoperiș", unitKey:"insulRoofThickness", unit:"cm vată" },
                        { key:"addInsulBasement", label:"Izolație subsol/sol", unitKey:"insulBasementThickness", unit:"cm XPS" },
                        { key:"replaceWindows", label:"Înlocuire tâmplărie", unitKey:"newWindowU", unit:"W/m²K" },
                        { key:"addHR", label:"Ventilare cu recuperare", unitKey:"hrEfficiency", unit:"% HR" },
                        { key:"addPV", label:"Panouri fotovoltaice", unitKey:"pvArea", unit:"m²" },
                        { key:"addHP", label:"Pompă de căldură", unitKey:"hpCOP", unit:"COP" },
                        { key:"addSolarTh", label:"Solar termic", unitKey:"solarThArea", unit:"m²" },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2">
                          <input type="checkbox" checked={rehabScenarioInputs[item.key]}
                            onChange={e => setRehabScenarioInputs(p => ({...p, [item.key]: e.target.checked}))}
                            className="accent-amber-500" />
                          <span className="text-xs flex-1">{item.label}</span>
                          {rehabScenarioInputs[item.key] && (
                            <input type="number" value={rehabScenarioInputs[item.unitKey]}
                              onChange={e => setRehabScenarioInputs(p => ({...p, [item.unitKey]: e.target.value}))}
                              className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-center" />
                          )}
                          {rehabScenarioInputs[item.key] && <span className="text-[10px] opacity-30">{item.unit}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rehabComparison && (
                  <div className="space-y-4">
                    {/* Visual comparison */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[10px] opacity-40 mb-1">ACTUAL</div>
                        <div className="text-xl font-black" style={{color: rehabComparison.original.cls.color}}>{rehabComparison.original.cls.cls}</div>
                        <div className="text-sm font-bold mt-1">{rehabComparison.original.ep.toFixed(1)}</div>
                        <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
                      </div>
                      <div className="p-3 flex flex-col items-center justify-center">
                        <div className="text-2xl opacity-20">→</div>
                        <div className={`text-sm font-bold ${rehabComparison.savings.epPct >= 0 ? "text-green-400" : "text-red-400"}`}>{rehabComparison.savings.epPct >= 0 ? "-" : "+"}{Math.abs(rehabComparison.savings.epPct).toFixed(0)}%</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="text-[10px] text-amber-400 mb-1">REABILITAT</div>
                        <div className="text-xl font-black" style={{color: rehabComparison.rehab.cls.color}}>{rehabComparison.rehab.cls.cls}</div>
                        <div className="text-sm font-bold mt-1">{rehabComparison.rehab.ep.toFixed(1)}</div>
                        <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between p-2 rounded bg-white/[0.03]">
                        <span className="opacity-50">CO₂ actual / reabilitat</span>
                        <span className="font-medium">{rehabComparison.original.co2.toFixed(1)} → {rehabComparison.rehab.co2.toFixed(1)} <span className={rehabComparison.savings.co2Pct >= 0 ? "text-green-400" : "text-red-400"}>({rehabComparison.savings.co2Pct >= 0 ? "-" : "+"}{Math.abs(rehabComparison.savings.co2Pct).toFixed(0)}%)</span></span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-white/[0.03]">
                        <span className="opacity-50">Economie Ef anuală</span>
                        <span className="font-medium text-green-400">{rehabComparison.savings.qfSaved.toFixed(0)} kWh/an</span>
                      </div>
                    </div>
                  </div>
                )}

                {!instSummary && (
                  <div className="text-center py-6 opacity-30 text-xs">Completează pașii 1-4 pentru comparație scenarii</div>
                )}
              </Card>
              </GradeGate>

              {/* ═════ I. SUMAR FINAL → tranziție Pasul 6 (CPE) ═════ */}

              {/* ═══ NEW: DASHBOARD SUMAR (C3) ═══ */}
              {instSummary && (
                <Card title={t("Dashboard sumar",lang)} className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:"Energie primară", value: (renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 0).toFixed(1), unit:"kWh/(m²·an)", color: (renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 999) <= (getNzebEpMax(baseCatResolved, selectedClimate?.zone) || 999) ? "#22c55e" : "#ef4444" },
                      { label:t("Emisii CO₂", lang), value: (renewSummary?.co2_adjusted_m2 || instSummary.co2_total_m2 || 0).toFixed(1), unit:"kgCO₂/(m²·an)", color: "#8b5cf6" },
                      { label:"Energie finală", value: (instSummary.qf_total_m2 || 0).toFixed(1), unit:"kWh/(m²·an)", color: "#3b82f6" },
                      { label:"RER", value: (renewSummary?.rer || 0).toFixed(0)+"%", unit:"min 30% nZEB", color: (renewSummary?.rer || 0) >= 30 ? "#22c55e" : "#ef4444" },
                    ].map((kpi, i) => (
                      <div key={i} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1">{kpi.label}</div>
                        <div className="text-2xl font-black font-mono" style={{color: kpi.color}}>{kpi.value}</div>
                        <div className="text-[10px] opacity-25 mt-0.5">{kpi.unit}</div>
                      </div>
                    ))}
                  </div>
                  {/* Quick status badges */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-center">
                    {(() => {
                      const ep = renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 999;
                      const nzeb = NZEB_THRESHOLDS[baseCatResolved] || NZEB_THRESHOLDS.AL;
                      const rer = renewSummary?.rer || 0;
                      const isNZEB = ep <= getNzebEpMax(baseCatResolved, selectedClimate?.zone) && rer >= nzeb.rer_min;
                      const zeb = ZEB_THRESHOLDS[baseCatResolved];
                      const isZEB = zeb && ep <= zeb.ep_max * ZEB_FACTOR && rer >= zeb.rer_min;
                      return <>
                        <Badge color={isNZEB ? "green" : "red"}>{isNZEB ? "✓" : "✗"} nZEB</Badge>
                        <Badge color={isZEB ? "green" : "red"}>{isZEB ? "✓" : "✗"} ZEB</Badge>
                        {annualEnergyCost && <Badge color="amber">Cost: {annualEnergyCost.total.toLocaleString("ro-RO")} lei/an</Badge>}
                        {gwpDetailed && gwpGate.allowed && <Badge color={gwpDetailed.gwpPerM2Year <= 15 ? "green" : "amber"}>GWP: {gwpDetailed.gwpPerM2Year} kgCO₂eq/(m²·an)</Badge>}
                      </>;
                    })()}
                  </div>
                </Card>
              )}
              <Card title={t("Sumar final — Date pentru Certificatul de Performanță Energetică",lang)} className="border-amber-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Clasa energetică</div>
                    <div className="text-3xl font-black" style={{color:enClass.color}}>{enClass.cls}</div>
                    <div className="text-xs font-mono opacity-60 mt-1">{epFinal.toFixed(1)} kWh/(m²·an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Clasa de mediu</div>
                    <div className="text-3xl font-black" style={{color:co2Class.color}}>{co2Class.cls}</div>
                    <div className="text-xs font-mono opacity-60 mt-1">{co2Final.toFixed(1)} kg CO2/(m2an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Energie finală</div>
                    <div className="text-2xl font-bold font-mono">{instSummary?.qf_total_m2.toFixed(1) || "—"}</div>
                    <div className="text-xs opacity-40 mt-1">kWh/(m²·an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">RER</div>
                    <div className={cn("text-2xl font-bold font-mono", rer >= 30 ? "text-emerald-400" : "text-red-400")}>{rer.toFixed(1)}%</div>
                    <div className="text-xs opacity-40 mt-1">{rer >= 30 ? "nZEB OK" : "< 30% nZEB"}</div>
                  </div>
                </div>
              </Card>

              {/* Faza E.1 — Banner contextual AE IIci (Ord. MDLPA 348/2026 Art. 6 alin. 2)
                  Vizibil DOAR pentru auditorii AE IIci pe plan audit. Explică limitarea
                  legală + opțiunea de upgrade la AE Ici pentru audit + nZEB + LCC. */}
              {auditorGrad === "IIci" && (
                <div className="mt-6 mb-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4 text-xs">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-base shrink-0 mt-0.5">ℹ️</span>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-200/90 mb-1">
                        {lang === "EN"
                          ? "You are an AE IIci auditor (residential CPE only)"
                          : "Ești auditor AE IIci (CPE locuințe)"}
                      </div>
                      <div className="opacity-70 leading-relaxed">
                        {lang === "EN" ? (
                          <>Per Order MDLPA 348/2026 Art. 6 para. 2, you may issue CPE for
                          residential buildings (single-family / blocks / apartments) at
                          construction, sale or lease only. Energy audit (Mc 001 §8), nZEB
                          conformance report (Art. 6 lit. c) and LCC analyses are reserved
                          for AE Ici auditors.</>
                        ) : (
                          <>Conform Ord. MDLPA 348/2026 Art. 6 alin. (2), poți emite CPE
                          pentru locuințe (case unifamiliale / blocuri / apartamente) la
                          construire, vânzare sau închiriere. Auditul energetic (Mc 001
                          §8), raportul de conformare nZEB (Art. 6 lit. c) și analizele
                          LCC sunt rezervate auditorilor AE Ici.</>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <a
                          href="/#pricing"
                          className="text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
                        >
                          {lang === "EN"
                            ? "Promote to AE Ici (1.299 RON/month) →"
                            : "Promovează la AE Ici (1.299 RON/lună) →"}
                        </a>
                        <span className="text-[10px] opacity-40">
                          {lang === "EN"
                            ? "Step 7 audit + nZEB report + LCC included"
                            : "Audit Pas 7 + raport nZEB + LCC incluse"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 4: Regenerabile
                </button>
                <button onClick={() => goToStep(6, 5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 6: Certificat CPE →
                </button>
              </div>
            </div>
            );
}