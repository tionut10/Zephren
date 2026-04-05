import React from "react";

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
    evChargerCalc, solarReadyCheck,
    energyPrices, setEnergyPrices, useNA2023, setUseNA2023,
    compareRef, setCompareRef, importCompareRef,
    showScenarioCompare, setShowScenarioCompare,
    rehabScenarioInputs, setRehabScenarioInputs, rehabComparison,
    setStep, goToStep, step,
    // Constants passed as props
    Card, Badge, ResultRow, Select, Input, cn,
    getEnergyClassEPBD, getCO2Class, getNzebEpMax,
    ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB,
    NZEB_THRESHOLDS, ZEB_THRESHOLDS, ZEB_FACTOR,
    BACS_OBLIGATION_THRESHOLD_KW, BACS_CLASSES,
    FUELS, BENCHMARKS,
    financialAnalysis,
    t,
  } = props;

            const Au = parseFloat(building.areaUseful) || 0;
            const catKey = building.category + (
              ["RI","RC","RA"].includes(building.category)
                ? (cooling.hasCooling ? "_cool" : "_nocool")
                : ""
            );
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClassEPBD(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, building.category);
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const rer = renewSummary?.rer || 0;

            // C5 FIX: Bilanț lunar — use monthlyISO when available
            const months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
            const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
            const tInt = parseFloat(heating.theta_int) || 20;
            const monthlyData = months.map((m,i) => {
              const tExt = selectedClimate?.temp_month?.[i] ?? 5;
              const deltaT = Math.max(0, tInt - tExt);
              if (monthlyISO && monthlyISO[i]) {
                return { month:m, tExt, deltaT, qLoss: monthlyISO[i].qLoss || 0, solarGain: monthlyISO[i].solarGain || 0, intGain: monthlyISO[i].intGain || 0, qHeat: monthlyISO[i].qH_nd, qCool: monthlyISO[i].qC_nd };
              }
              const G = envelopeSummary?.G || 0.5;
              const V = parseFloat(building.volume) || 100;
              const qLoss = G * V * deltaT * monthDays[i] * 24 / 1000;
              const solarGain = (selectedClimate?.solar?.S || 400) / 12 * 0.15 * Au * (deltaT > 0 ? 0.8 : 0.3);
              const intGain = Au * 5 * monthDays[i] * 12 / 1000;
              const gamma = qLoss > 0 ? (solarGain + intGain) / qLoss : 0;
              const tau_h = envelopeSummary?.G ? (Au * 80000) / ((envelopeSummary.G * V + 0.34 * 0.5 * V) * 3600) : 15;
              const a = 1 + tau_h / 15;
              const etaH = gamma !== 1 ? (1 - Math.pow(gamma, a)) / (1 - Math.pow(gamma, a+1)) : a/(a+1);
              const qHeat = Math.max(0, qLoss - etaH * (solarGain + intGain));
              const qCool = deltaT <= 0 ? Math.max(0, (solarGain + intGain) * 0.3) : 0;
              return { month:m, tExt, deltaT, qLoss, solarGain, intGain, qHeat, qCool };
            });
            const annualHeat = monthlyData.reduce((s,d) => s + d.qHeat, 0);
            const annualCool = monthlyData.reduce((s,d) => s + d.qCool, 0);
            const maxQ = Math.max(...monthlyData.map(d => Math.max(d.qLoss, d.qHeat)));

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(4)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 4</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Global energy calculation & Classification":"Calcul energetic global & Clasare"}</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 5 Mc 001-2022 — Bilanț energetic, conversie energie primară, clasare A+ — G</p>
              </div>

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
                        var barW = 55 + (7-i) * 20;
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

                  {/* nZEB & RER status */}
                  <div className="mt-5 px-4 space-y-2">
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">RER (regenerabile)</span>
                      <Badge color={rer >= 30 ? "green" : "red"}>{rer.toFixed(1)}%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Statut nZEB</span>
                      {(() => { const nz = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL; const ok = rer >= nz.rer_min && epFinal < getNzebEpMax(building.category, selectedClimate?.zone); return (
                      <Badge color={ok ? "green" : "red"}>
                        {ok ? "CONFORM" : "NECONFORM"}
                      </Badge>
                      ); })()}
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Grilă aplicată</span>
                      <span className="text-xs font-medium">{grid?.label || catKey}</span>
                    </div>
                  </div>
                </Card>
              </div>

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
                          <span className="opacity-50">RER ≥ {NZEB_THRESHOLDS[building.category]?.rer_min || 30}%</span>
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
                          <span className="opacity-50">RER ≥ {ZEB_THRESHOLDS[building.category]?.rer_min || 50}%</span>
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

              {/* ═══ NEW: DASHBOARD SUMAR (C3) ═══ */}
              {instSummary && (
                <Card title={t("Dashboard sumar",lang)} className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:"Energie primară", value: (renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 0).toFixed(1), unit:"kWh/(m²·an)", color: (renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 999) <= (getNzebEpMax(building.category, selectedClimate?.zone) || 999) ? "#22c55e" : "#ef4444" },
                      { label:"Emisii CO₂", value: (renewSummary?.co2_adjusted_m2 || instSummary.co2_total_m2 || 0).toFixed(1), unit:"kgCO₂/(m²·an)", color: "#8b5cf6" },
                      { label:"Energie finală", value: (instSummary.qf_total_m2 || 0).toFixed(1), unit:"kWh/(m²·an)", color: "#3b82f6" },
                      { label:"RER", value: (renewSummary?.rer || 0).toFixed(0)+"%", unit:"min 30% nZEB", color: (renewSummary?.rer || 0) >= 30 ? "#22c55e" : "#ef4444" },
                    ].map((kpi, i) => (
                      <div key={i} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1">{kpi.label}</div>
                        <div className="text-2xl font-black font-mono" style={{color: kpi.color}}>{kpi.value}</div>
                        <div className="text-[9px] opacity-25 mt-0.5">{kpi.unit}</div>
                      </div>
                    ))}
                  </div>
                  {/* Quick status badges */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-center">
                    {(() => {
                      const ep = renewSummary?.ep_adjusted_m2 || instSummary.ep_total_m2 || 999;
                      const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                      const rer = renewSummary?.rer || 0;
                      const isNZEB = ep <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
                      const zeb = ZEB_THRESHOLDS[building.category];
                      const isZEB = zeb && ep <= zeb.ep_max * ZEB_FACTOR && rer >= zeb.rer_min;
                      return <>
                        <Badge color={isNZEB ? "green" : "red"}>{isNZEB ? "✓" : "✗"} nZEB</Badge>
                        <Badge color={isZEB ? "green" : "red"}>{isZEB ? "✓" : "✗"} ZEB</Badge>
                        {annualEnergyCost && <Badge color="amber">Cost: {annualEnergyCost.total.toLocaleString("ro-RO")} lei/an</Badge>}
                        {gwpDetailed && <Badge color={gwpDetailed.gwpPerM2Year <= 15 ? "green" : "amber"}>GWP: {gwpDetailed.gwpPerM2Year} kgCO₂eq/(m²·an)</Badge>}
                      </>;
                    })()}
                  </div>
                </Card>
              )}

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

              {/* ═══ NEW: GWP LIFECYCLE (A4) ═══ */}
              {gwpDetailed && (
                <Card title={t("GWP — Amprenta de carbon a clădirii",lang)} className="mb-6" badge={<Badge color={gwpDetailed.gwpPerM2Year <= 15 ? "green" : "amber"}>{gwpDetailed.classification}</Badge>}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono" style={{color: gwpDetailed.color}}>{gwpDetailed.gwpPerM2Year}</div>
                      <div className="text-[9px] opacity-40">kgCO₂eq/(m²·an)</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{gwpDetailed.gwpPerM2}</div>
                      <div className="text-[9px] opacity-40">kgCO₂eq/m² total</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{(gwpDetailed.totalGWP/1000).toFixed(1)}</div>
                      <div className="text-[9px] opacity-40">tCO₂eq total</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/[0.03]">
                      <div className="text-lg font-bold font-mono">{gwpDetailed.lifetime}</div>
                      <div className="text-[9px] opacity-40">ani viață</div>
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
                  <div className="text-[9px] opacity-20 mt-2">Conform EN 15978. Ref. nZEB: ≤{gwpDetailed.benchmarkNZEB} kgCO₂eq/(m²·an). Faza D (credit reciclare): {gwpDetailed.gwp_D > 0 ? "-"+gwpDetailed.gwp_D+" kgCO₂eq" : "N/A"}.</div>
                </Card>
              )}

              {/* ═══ NEW: BACS CHECK (A5) ═══ */}
              {bacsCheck && bacsCheck.isRequired && (
                <Card title="BACS — Automatizare clădire (EPBD Art.14)" className="mb-6" badge={<Badge color={bacsClass !== "D" ? "green" : "red"}>{bacsCheck.label}</Badge>}>
                  <div className="space-y-2">
                    <div className="text-xs opacity-60">Putere instalată: {heating.power || "—"} kW (prag obligatoriu: {BACS_OBLIGATION_THRESHOLD_KW} kW)</div>
                    <Select label="Clasa BACS" value={bacsClass} onChange={setBacsClass}
                      options={Object.entries(BACS_CLASSES).map(([k,v]) => ({value:k, label:v.label}))} />
                    <div className="text-[10px] opacity-40">{bacsCheck.desc}</div>
                    <ResultRow label="Factor corecție BACS" value={bacsCheck.factor} />
                    {bacsCheck.recommendation && <div className="text-[10px] text-red-400/70 p-2 rounded bg-red-500/5 border border-red-500/10">{bacsCheck.recommendation}</div>}
                  </div>
                </Card>
              )}

              {/* ═══ NEW: EV CHARGER (A6) ═══ */}
              {evChargerCalc && evChargerCalc.required && (
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

              {/* ── BILANȚ LUNAR ── */}
              <Card title={t("Bilanț energetic lunar (metoda quasi-staționară)",lang)} className="mb-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Bar chart */}
                    <div className="flex items-end gap-1 h-48 mb-2 px-2">
                      {monthlyData.map((d,i) => {
                        const heatPct = maxQ > 0 ? (d.qHeat / maxQ * 100) : 0;
                        const lossPct = maxQ > 0 ? (d.qLoss / maxQ * 100) : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.month}: Pierderi=${d.qLoss.toFixed(0)}, Necesar=${d.qHeat.toFixed(0)} kWh`}>
                            <div className="w-full flex flex-col items-center justify-end" style={{height:"192px"}}>
                              <div className="w-full rounded-t" style={{height:`${lossPct}%`, backgroundColor:"rgba(239,68,68,0.15)", minHeight: lossPct > 0 ? "2px" : "0"}} />
                              <div className="w-full rounded-t -mt-px" style={{height:`${heatPct}%`, backgroundColor:"#ef4444", minHeight: heatPct > 0 ? "2px" : "0"}} />
                            </div>
                            <span className="text-[9px] opacity-40 mt-1">{d.month}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] opacity-40 px-2">
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500 inline-block" /> Necesar incalzire</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500/20 inline-block" /> Pierderi totale</span>
                    </div>

                    {/* Tabel lunar */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-1.5 px-1 opacity-40 font-medium">Luna</th>
                            {months.map(m => <th key={m} className="text-center py-1.5 px-1 opacity-40 font-medium">{m}</th>)}
                            <th className="text-center py-1.5 px-1 opacity-60 font-semibold">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">T ext [°C]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1">{d.tExt.toFixed(1)}</td>)}
                            <td className="text-center py-1 px-1 font-medium">{selectedClimate?.theta_a || "—"}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q pierderi [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1">{d.qLoss.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium">{monthlyData.reduce((s,d)=>s+d.qLoss,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q solar [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1 text-amber-400/70">{d.solarGain.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium text-amber-400/70">{monthlyData.reduce((s,d)=>s+d.solarGain,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q intern [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1 text-purple-400/70">{d.intGain.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium text-purple-400/70">{monthlyData.reduce((s,d)=>s+d.intGain,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/10 bg-red-500/5">
                            <td className="py-1.5 px-1 font-semibold text-red-400">Q incalzire [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1.5 px-1 text-red-400 font-medium">{d.qHeat.toFixed(0)}</td>)}
                            <td className="text-center py-1.5 px-1 font-bold text-red-400">{annualHeat.toFixed(0)}</td>
                          </tr>
                          <tr className="bg-blue-500/5">
                            <td className="py-1.5 px-1 font-semibold text-blue-400">Q racire [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1.5 px-1 text-blue-400 font-medium">{d.qCool.toFixed(0)}</td>)}
                            <td className="text-center py-1.5 px-1 font-bold text-blue-400">{annualCool.toFixed(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>


              {/* ── Benchmarking — comparație cu referințe ── */}
              {instSummary && (
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
              )}


              {/* ── BENCHMARK COMPARATIV — medie națională ── */}
              {instSummary && renewSummary && (() => {
                const bm = BENCHMARKS[building.category] || BENCHMARKS.AL;
                const epF = renewSummary.ep_adjusted_m2;
                const co2F = renewSummary.co2_adjusted_m2;
                const pctVsAvg = bm.avgEp > 0 ? Math.round((1 - epF / bm.avgEp) * 100) : 0;
                return (
                <Card title={lang==="EN"?"Benchmark — national average":"Benchmark — medie națională"} className="mb-6 border-blue-500/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold text-amber-400">{epF.toFixed(0)}</div>
                      <div className="text-[9px] opacity-40">Ep clădire</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold opacity-50">{bm.avgEp}</div>
                      <div className="text-[9px] opacity-40">Ep medie {bm.label}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold text-emerald-400">{bm.bestEp}</div>
                      <div className="text-[9px] opacity-40">Best in class</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className={cn("text-lg font-bold", pctVsAvg > 0 ? "text-emerald-400" : "text-red-400")}>{pctVsAvg > 0 ? "-" : "+"}{Math.abs(pctVsAvg)}%</div>
                      <div className="text-[9px] opacity-40">vs medie</div>
                    </div>
                  </div>
                  {/* Vizual bar benchmark */}
                  <svg viewBox="0 0 400 50" width="100%" height="45" className="overflow-visible">
                    <rect x="0" y="20" width="400" height="10" rx="5" fill={theme==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} />
                    <rect x="0" y="20" width={Math.min(400, epF / bm.worstEp * 400)} height="10" rx="5" fill={epF < bm.avgEp ? "#22c55e" : epF < bm.worstEp * 0.7 ? "#eab308" : "#ef4444"} opacity="0.8" />
                    {/* Markers */}
                    <line x1={bm.bestEp/bm.worstEp*400} y1="16" x2={bm.bestEp/bm.worstEp*400} y2="34" stroke="#22c55e" strokeWidth="2" />
                    <text x={bm.bestEp/bm.worstEp*400} y="13" textAnchor="middle" fontSize="7" fill="#22c55e">Best {bm.bestEp}</text>
                    <line x1={bm.avgEp/bm.worstEp*400} y1="16" x2={bm.avgEp/bm.worstEp*400} y2="34" stroke="#888" strokeWidth="2" strokeDasharray="3 2" />
                    <text x={bm.avgEp/bm.worstEp*400} y="44" textAnchor="middle" fontSize="7" fill="#888">Medie {bm.avgEp}</text>
                    <circle cx={Math.min(395, epF/bm.worstEp*400)} cy="25" r="5" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                    <text x={Math.min(395, epF/bm.worstEp*400)} y="13" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="bold">{epF.toFixed(0)}</text>
                  </svg>
                  <div className="text-[9px] opacity-30 mt-1">Stoc {bm.label}: {bm.stock} clădiri | An mediu constr.: {bm.avgYear} | {bm.nzebPct}% nZEB</div>
                </Card>
                );
              })()}

              {/* ── A/V FACTOR VALIDATION ── */}
              {avValidation && avValidation.msg && (
                <div className={cn("mb-4 p-3 rounded-xl border text-xs flex items-center gap-2",
                  avValidation.status === "high" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                )}>
                  <span>⚠</span> {avValidation.msg}
                </div>
              )}

              {/* ── GRAFIC AMORTIZARE INVESTIȚIE (NPV 20 ani) ── */}
              {instSummary && renewSummary && envelopeSummary && (() => {
                const Au = parseFloat(building.areaUseful) || 1;
                const costKwh = instSummary.fuel?.id === "electricitate" ? 1.30 : instSummary.fuel?.id === "gaz" ? 0.32 : 0.30;
                const annualCost = (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) * costKwh;
                const measures = [
                  { name: "Termoizolație pereți", cost: Au * 45, savePct: 0.18, color: "#3b82f6" },
                  { name: "Ferestre triple", cost: Au * 0.15 * 250, savePct: 0.12, color: "#8b5cf6" },
                  { name: "Termoizolație acoperiș", cost: Au * 0.3 * 35, savePct: 0.10, color: "#06b6d4" },
                  { name: "Pompă de căldură", cost: 12000, savePct: 0.30, color: "#22c55e" },
                  { name: "PV 5kWp", cost: 5000, savePct: 0.15, color: "#f59e0b" },
                ];
                const discount = 0.05;
                const years = 20;
                return (
                <Card title={lang==="EN"?"Investment payback (NPV 20 years)":"Amortizare investiție (NPV 20 ani)"} className="mb-6 border-amber-500/20">
                  <div className="overflow-x-auto">
                  <svg viewBox="0 0 500 200" width="100%" height="180" className="overflow-visible">
                    {/* Grid */}
                    {[0,1,2,3,4].map(i => {
                      const y = 170 - i * 35;
                      return <g key={"g"+i}><line x1="60" y1={y} x2="490" y2={y} stroke={theme==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} /><text x="56" y={y+3} textAnchor="end" fontSize="7" fill="#666">{(i*25)}%</text></g>;
                    })}
                    {/* Year labels */}
                    {[0,5,10,15,20].map(yr => {
                      const x = 60 + yr/20*430;
                      return <text key={"y"+yr} x={x} y={186} textAnchor="middle" fontSize="7" fill="#666">{yr}</text>;
                    })}
                    <text x="275" y="198" textAnchor="middle" fontSize="8" fill="#888">Ani</text>
                    {/* Cumulative savings lines per measure */}
                    {measures.map((m, mi) => {
                      const annSave = annualCost * m.savePct;
                      const points = [];
                      let cumNPV = -m.cost;
                      for (let yr = 0; yr <= years; yr++) {
                        if (yr > 0) cumNPV += annSave / Math.pow(1 + discount, yr);
                        const x = 60 + yr/years*430;
                        const pct = (cumNPV / m.cost) * 100;
                        const y = 170 - Math.max(-35, Math.min(140, (pct + 100) / 200 * 140));
                        points.push(`${x},${y}`);
                      }
                      const paybackYr = m.cost > 0 && annSave > 0 ? Math.ceil(m.cost / annSave) : 99;
                      return <g key={"m"+mi}>
                        <polyline points={points.join(" ")} fill="none" stroke={m.color} strokeWidth="1.5" opacity="0.8" />
                        <text x="492" y={parseFloat(points[points.length-1].split(",")[1])+3} fontSize="6" fill={m.color}>{m.name.slice(0,12)}</text>
                        {paybackYr <= 20 && <circle cx={60+paybackYr/20*430} cy={170-0} r="3" fill={m.color} />}
                      </g>;
                    })}
                    {/* Zero line */}
                    <line x1="60" y1="170" x2="490" y2="170" stroke="#666" strokeWidth="0.5" strokeDasharray="4 2" />
                    <text x="56" y="173" textAnchor="end" fontSize="7" fill="#f59e0b">0</text>
                  </svg>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {measures.map((m,i) => {
                      const payback = annualCost * m.savePct > 0 ? Math.ceil(m.cost / (annualCost * m.savePct)) : "—";
                      return <div key={i} className="flex items-center gap-1.5 text-[9px]">
                        <div className="w-2 h-2 rounded-full" style={{background:m.color}} />
                        <span className="opacity-60">{m.name}:</span>
                        <span className="font-bold">{payback} ani</span>
                      </div>;
                    })}
                  </div>
                  <div className="text-[9px] opacity-25 mt-1">NPV cu rată discount 5%/an, prețuri constante {(costKwh).toFixed(2)} RON/kWh</div>
                </Card>
                );
              })()}

              {/* ── CONFORMITATE nZEB / ZEB / L.238/2024 ── */}
              {instSummary && renewSummary && (
                <Card title={lang==="EN"?"Regulatory compliance":"Conformitate normativă"} className="mb-6 border-amber-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* nZEB */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                      var epF = renewSummary.ep_adjusted_m2;
                      var isN = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && renewSummary.rer >= nzeb.rer_min;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isN ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                          <div className="text-2xl font-black mb-1" style={{color:isN?"#22c55e":"#ef4444"}}>{isN?"✓":"✗"}</div>
                          <div className="text-xs font-bold">nZEB</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{getNzebEpMax(building.category, selectedClimate?.zone)} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">RER: {renewSummary.rer.toFixed(0)}/{nzeb.rer_min}%</div>
                        </div>
                      );
                    })()}
                    
                    {/* ZEB readiness */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                      var zebMax = getNzebEpMax(building.category, selectedClimate?.zone) * ZEB_FACTOR;
                      var epF = renewSummary.ep_adjusted_m2;
                      var hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                      var isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isZEB ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]")}>
                          <div className="text-2xl font-black mb-1" style={{color:isZEB?"#22c55e":"#888"}}>{isZEB?"✓":"—"}</div>
                          <div className="text-xs font-bold">{lang==="EN"?"ZEB Ready":"ZEB Ready"}</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{zebMax.toFixed(0)} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">{hasFossil ? (lang==="EN"?"Fossil fuel on-site":"Combustibil fosil on-site") : (lang==="EN"?"No fossil":"Fără fosil")}</div>
                          <div className="text-[9px] opacity-30 mt-1">EPBD IV Art.11 — 2028/2030</div>
                        </div>
                      );
                    })()}
                    
                    {/* RER decomposition L.238/2024 */}
                    <div className={cn("p-4 rounded-xl border text-center", renewSummary.rerOnSiteOk && renewSummary.rerTotalOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                      <div className="text-2xl font-black mb-1" style={{color:renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"#22c55e":"#eab308"}}>{renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"✓":"⚠"}</div>
                      <div className="text-xs font-bold">RER L.238/2024</div>
                      <div className="text-[10px] opacity-50 mt-1">On-site: {renewSummary.rerOnSite.toFixed(1)}% / min 10%</div>
                      <div className="text-[10px] opacity-50">Total: {renewSummary.rer.toFixed(1)}% / min 30%</div>
                      <div className="text-[9px] opacity-30 mt-1">Art.17 L.372/2005 mod. L.238/2024</div>
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
                        <div className="text-[9px] opacity-30 mt-1">
                          EPBD IV Art.7 {obligatory ? "— OBLIGATORIU pt. această clădire" : "— opțional (obligatoriu >1000m² din 2028)"} | Estimare conform EN 15978
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </Card>
              )}

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
                  <svg viewBox="0 0 660 180" width="100%" height="170" className="overflow-visible">
                    {(() => {
                      var data = monthlyBreakdown, maxQ = Math.max.apply(null, data.map(function(m){return m.qf_total}))||1;
                      var bW=38, gap=16, cH=130, bY=155, oX=30, els=[];
                      for(var t=0;t<=4;t++){var y=bY-(t/4)*cH; els.push(<line key={"yg"+t} x1={oX} y1={y} x2={oX+12*(bW+gap)} y2={y} stroke="#222" strokeWidth="0.5"/>); els.push(<text key={"yl"+t} x={oX-4} y={y+3} textAnchor="end" fontSize="6" fill="#555">{Math.round(maxQ*t/4)}</text>);}
                      data.forEach(function(m,i){
                        var x=oX+6+i*(bW+gap), utils=[{v:m.qf_h,c:"#ef4444"},{v:m.qf_w,c:"#f97316"},{v:m.qf_c,c:"#3b82f6"},{v:m.qf_v+m.qf_l,c:"#8b5cf6"}];
                        var cumH=0;
                        utils.forEach(function(u,ui){ var h=maxQ>0?(u.v/maxQ)*cH:0; if(h>0.5) els.push(<rect key={"b"+i+"-"+ui} x={x} y={bY-cumH-h} width={bW} height={h} fill={u.c} opacity="0.8" rx="1"/>); cumH+=h; });
                        els.push(<text key={"ml"+i} x={x+bW/2} y={bY+11} textAnchor="middle" fontSize="7" fill="#777">{m.name}</text>);
                      });
                      // Temperature line
                      var tMin=Math.min.apply(null,data.map(function(m){return m.tExt})), tMax=Math.max.apply(null,data.map(function(m){return m.tExt})), tR=Math.max(tMax-tMin,1);
                      var pts=data.map(function(m,i){ return (oX+6+i*(bW+gap)+bW/2)+","+(bY-((m.tExt-tMin)/tR)*cH*0.8-cH*0.1); }).join(" ");
                      els.push(<polyline key="tl" points={pts} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>);
                      data.forEach(function(m,i){ var x=oX+6+i*(bW+gap)+bW/2, y=bY-((m.tExt-tMin)/tR)*cH*0.8-cH*0.1; els.push(<circle key={"td"+i} cx={x} cy={y} r="2" fill="#fbbf24" opacity="0.7"/>); els.push(<text key={"tt"+i} x={x} y={y-4} textAnchor="middle" fontSize="5" fill="#fbbf24" opacity="0.7">{m.tExt.toFixed(0)}</text>); });
                      [{l:"Încălzire",c:"#ef4444"},{l:"ACM",c:"#f97316"},{l:"Răcire",c:"#3b82f6"},{l:"V+I",c:"#8b5cf6"},{l:"Temp",c:"#fbbf24"}].forEach(function(it,i){ els.push(<rect key={"lg"+i} x={oX+i*100} y={2} width={7} height={7} fill={it.c} rx="1" opacity="0.8"/>); els.push(<text key={"lt"+i} x={oX+i*100+10} y={9} fontSize="6" fill="#888">{it.l}</text>); });
                      return els;
                    })()}
                  </svg>
                </Card>
              )}


              {/* ── Flux energetic Sankey simplificat ── */}
              {instSummary && (
                <Card title={lang==="EN"?"Energy flow diagram":"Flux energetic"} className="mb-6">
                  <svg viewBox="0 0 500 140" width="100%" height="130">
                    {(() => {
                      var total = instSummary.ep_total || 1;
                      var utils = [
                        {l:"Încălzire",v:instSummary.ep_h,c:"#ef4444"},
                        {l:"ACM",v:instSummary.ep_w,c:"#f97316"},
                        {l:"Răcire",v:instSummary.ep_c,c:"#3b82f6"},
                        {l:"Ventilare",v:instSummary.ep_v,c:"#8b5cf6"},
                        {l:"Iluminat",v:instSummary.ep_l,c:"#eab308"},
                      ];
                      var els = [];
                      // Source bar (left)
                      els.push(<rect key="src" x="5" y="10" width="35" height="120" fill="#f59e0b" rx="4" opacity="0.3"/>);
                      els.push(<text key="srct" x="22" y="75" textAnchor="middle" fontSize="7" fill="#f59e0b" transform="rotate(-90,22,75)">EP Total</text>);
                      els.push(<text key="srcv" x="22" y="135" textAnchor="middle" fontSize="6" fill="#f59e0b">{total.toFixed(0)}</text>);
                      // Flow paths to utilities
                      var cumY = 10;
                      utils.forEach(function(u, i) {
                        var pct = u.v / total;
                        var h = Math.max(4, pct * 120);
                        var targetX = 380, targetY = 10 + i * 25;
                        var srcY = cumY + h/2;
                        els.push(<path key={"f"+i} d={"M40,"+srcY+" C200,"+srcY+" 250,"+((targetY+10))+" "+targetX+","+(targetY+10)} fill="none" stroke={u.c} strokeWidth={Math.max(1.5,h*0.3)} opacity="0.4"/>);
                        els.push(<rect key={"u"+i} x={targetX} y={targetY} width="110" height="20" fill={u.c} rx="3" opacity="0.2"/>);
                        els.push(<text key={"ul"+i} x={targetX+5} y={targetY+13} fontSize="7" fill={u.c}>{u.l}: {u.v.toFixed(0)} kWh ({(pct*100).toFixed(0)}%)</text>);
                        cumY += h;
                      });
                      // Renewable offset
                      if (renewSummary && renewSummary.ep_reduction > 0) {
                        els.push(<rect key="ren" x="5" y="132" width="35" height="4" fill="#22c55e" rx="1"/>);
                        els.push(<text key="rent" x="45" y="136" fontSize="6" fill="#22c55e">-{renewSummary.ep_reduction.toFixed(0)} regenerabile</text>);
                      }
                      return els;
                    })()}
                  </svg>
                </Card>
              )}

              {/* ── ESTIMARE COST ENERGIE ANUAL ── */}
              {instSummary && (
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
                            <div className="text-xl font-bold text-amber-400">{costTotal.toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON/an total</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-white">{costPerM2.toFixed(1)}</div>
                            <div className="text-[10px] opacity-40">RON/(m2 an)</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-red-400">{costHeat.toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON incalzire</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-blue-400">{(costCool + costVentLight).toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON racire+vent+il</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">{lang==="EN"?"Edit energy prices (RON/kWh)":"Editează prețuri energie (RON/kWh)"}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(energyPrices).map(function(entry) { return (
                        <div key={entry[0]} className="flex items-center gap-1">
                          <span className="text-[9px] opacity-40 w-12 truncate">{entry[0]}</span>
                          <input type="number" value={entry[1]} step="0.01" min="0"
                            onChange={function(e){setEnergyPrices(function(p){var n=Object.assign({},p);n[entry[0]]=parseFloat(e.target.value)||0;return n;});}}
                            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-right"/>
                        </div>
                      ); })}
                    </div>
                  </div>
                </Card>
              )}

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
                            <span className="text-[9px] opacity-30">{Au > 0 ? (u.qf/Au).toFixed(1) : "—"} kWh/(m²·an)</span>
                            <span className="text-[9px] opacity-30">{instSummary.qf_total > 0 ? (u.qf/instSummary.qf_total*100).toFixed(0) : 0}%</span>
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

              {/* ── COMPARAȚIE REAL vs. REFERINȚĂ ── */}
              {instSummary && (
                <Card title="Comparație clădire reală vs. clădire de referință (nZEB)">
                  {(() => {
                    const epRef = getNzebEpMax(building.category, selectedClimate?.zone) || 148;
                    const ratios = [0.45, 0.25, 0.10, 0.08, 0.12];
                    const labels = ["Încălzire","ACM","Răcire","Ventilare","Iluminat"];
                    const colors = ["#ef4444","#f97316","#3b82f6","#8b5cf6","#eab308"];
                    const realVals = [instSummary.ep_h, instSummary.ep_w, instSummary.ep_c, instSummary.ep_v, instSummary.ep_l].map(v => Au > 0 ? v/Au : 0);
                    const refVals = ratios.map(r => epRef * r);
                    const maxVal = Math.max(...realVals, ...refVals, 1);
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-1 text-[10px] font-medium opacity-60 mb-2">
                          <div className="col-span-2">Utilitate</div>
                          <div className="text-right">Real</div>
                          <div className="col-span-2 text-center">Comparație</div>
                          <div className="text-right">Ref. nZEB</div>
                          <div className="text-right">Diferență</div>
                        </div>
                        {labels.map((label, i) => {
                          const diff = realVals[i] - refVals[i];
                          const pctDiff = refVals[i] > 0 ? (diff / refVals[i] * 100) : 0;
                          return (
                            <div key={label} className="grid grid-cols-7 gap-1 items-center text-xs">
                              <div className="col-span-2 flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor:colors[i]}} />
                                {label}
                              </div>
                              <div className="text-right font-mono">{realVals[i].toFixed(1)}</div>
                              <div className="col-span-2 flex items-center gap-0.5 h-4">
                                <div className="h-full rounded-l" style={{width:`${realVals[i]/maxVal*100}%`,backgroundColor:colors[i],opacity:0.8,minWidth:"2px"}} />
                                <div className="h-full rounded-r border border-dashed border-emerald-500/50" style={{width:`${refVals[i]/maxVal*100}%`,backgroundColor:"#22c55e20",minWidth:"2px"}} />
                              </div>
                              <div className="text-right font-mono text-emerald-400/70">{refVals[i].toFixed(1)}</div>
                              <div className={`text-right font-mono font-bold ${diff > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                {diff > 0 ? "+" : ""}{pctDiff.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-white/10 grid grid-cols-7 gap-1 items-center text-xs font-bold">
                          <div className="col-span-2">TOTAL EP</div>
                          <div className="text-right font-mono">{epFinal.toFixed(1)}</div>
                          <div className="col-span-2" />
                          <div className="text-right font-mono text-emerald-400">{epRef.toFixed(1)}</div>
                          <div className={`text-right font-mono ${epFinal > epRef ? "text-red-400" : "text-emerald-400"}`}>
                            {epFinal > epRef ? "+" : ""}{((epFinal - epRef) / epRef * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] opacity-40 pt-1">
                          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-500/60" /> Clădire reală</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded border border-dashed border-emerald-500" /> Referință nZEB</span>
                          <span>Valori în kWh/(m²·an)</span>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              )}

              {/* ── TOGGLE NA:2023 ── */}
              <div className="flex items-center gap-3 mb-3 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useNA2023} onChange={e => setUseNA2023(e.target.checked)} className="accent-amber-500" />
                  <span className="text-xs font-medium">SR EN ISO 52000-1/NA:2023 (Tabel A.16)</span>
                </label>
                <div className="text-[10px] opacity-40 flex-1">
                  {useNA2023
                    ? "Factor energie ambientală = 1.0 — pompele de căldură beneficiază de recunoașterea energiei ambientale ca sursă regenerabilă (recomandat OAER)"
                    : "Mc 001-2022 original (Tabel 5.17) — factorul pentru energia ambientală = 0, pompele de căldură sunt dezavantajate"}
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

              {/* #19 Grafic radar performanță pe utilități */}
              {instSummary && (
                <Card title="Profil performanță energetică" className="mb-4">
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 300 280" width="100%" style={{maxWidth:"400px"}} className="opacity-90">
                      {(() => {
                        const cx = 150, cy = 130, maxR = 100;
                        const utils = [
                          {label:"Încălzire", val: Au > 0 ? instSummary.qf_h / Au : 0, max: 200, color:"#ef4444"},
                          {label:"ACM", val: Au > 0 ? instSummary.qf_w / Au : 0, max: 80, color:"#f97316"},
                          {label:"Răcire", val: Au > 0 ? instSummary.qf_c / Au : 0, max: 50, color:"#3b82f6"},
                          {label:"Ventilare", val: Au > 0 ? instSummary.qf_v / Au : 0, max: 20, color:"#8b5cf6"},
                          {label:"Iluminat", val: Au > 0 ? instSummary.qf_l / Au : 0, max: 30, color:"#eab308"},
                        ];
                        const n = utils.length;
                        const angleStep = (2 * Math.PI) / n;
                        const getXY = (i, r) => [cx + r * Math.sin(i * angleStep), cy - r * Math.cos(i * angleStep)];
                        // Grid circles
                        const grid = [0.25, 0.5, 0.75, 1.0].map(f => {
                          const r = maxR * f;
                          const pts = utils.map((_, i) => getXY(i, r).join(",")).join(" ");
                          return <polygon key={f} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />;
                        });
                        // Axes
                        const axes = utils.map((u, i) => {
                          const [x, y] = getXY(i, maxR + 15);
                          const [ax, ay] = getXY(i, maxR);
                          return <g key={i}><line x1={cx} y1={cy} x2={ax} y2={ay} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" /><text x={x} y={y} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)">{u.label}</text></g>;
                        });
                        // Data polygon
                        const pts = utils.map((u, i) => {
                          const r = Math.min(maxR, maxR * Math.min(u.val / u.max, 1));
                          return getXY(i, r).join(",");
                        }).join(" ");
                        // Value labels
                        const vals = utils.map((u, i) => {
                          const r = Math.min(maxR, maxR * Math.min(u.val / u.max, 1)) + 10;
                          const [x, y] = getXY(i, r);
                          return <text key={"v"+i} x={x} y={y} textAnchor="middle" fontSize="7" fill={u.color} fontWeight="bold">{u.val.toFixed(1)}</text>;
                        });
                        // nZEB reference polygon
                        const nzebVals = [49, 18, 13, 5, 6]; // Mc 001 A+ thresholds
                        const nzebPts = nzebVals.map((v, i) => {
                          const r = maxR * Math.min(v / utils[i].max, 1);
                          return getXY(i, r).join(",");
                        }).join(" ");
                        return <>{grid}{axes}<polygon points={nzebPts} fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" /><polygon points={pts} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />{vals}<text x={cx} y={cy + maxR + 40} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">— — nZEB A+ referință | —— clădire reală [kWh/m²·an]</text></>;
                      })()}
                    </svg>
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

              {/* ── COMPARAȚIE SCENARII ── */}
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
                        <div className="text-sm font-bold text-green-400">-{rehabComparison.savings.epPct.toFixed(0)}%</div>
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
                        <span className="font-medium">{rehabComparison.original.co2.toFixed(1)} → {rehabComparison.rehab.co2.toFixed(1)} <span className="text-green-400">(-{rehabComparison.savings.co2Pct.toFixed(0)}%)</span></span>
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
