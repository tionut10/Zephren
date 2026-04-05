import { cn, Select, Input, Card, Badge, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";

export default function Step2Envelope({
  building, lang, selectedClimate,
  opaqueElements, setOpaqueElements,
  glazingElements, setGlazingElements,
  thermalBridges, setThermalBridges,
  envelopeSummary,
  setEditingOpaque, setShowOpaqueModal,
  setEditingGlazing, setShowGlazingModal,
  setEditingBridge, setShowBridgeModal, setShowBridgeCatalog,
  calcOpaqueR, getURefNZEB,
  ELEMENT_TYPES, U_REF_NZEB,
  glaserElementIdx, setGlaserElementIdx, glaserResult,
  summerComfortResults,
  airInfiltrationCalc, naturalLightingCalc,
  csvImportRef, importCSV,
  setStep, goToStep,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setStep(1)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 1</button>
          <h2 className="text-xl font-bold">{lang==="EN"?"Building thermal envelope":"Anvelopa termică a clădirii"}</h2>
        </div>
        <p className="text-xs opacity-40">Capitolul 2 Mc 001-2022 — Elemente opace, vitraje, punți termice</p>
            <div className="flex gap-2 mt-3">
              <button onClick={function(){csvImportRef.current && csvImportRef.current.click();}}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                📄 Import CSV
              </button>
              <input ref={csvImportRef} type="file" accept=".csv" className="hidden"
                onChange={function(e){if(e.target.files[0]){importCSV(e.target.files[0]);e.target.value="";}}} />
            </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Elemente opace */}
        <div className="xl:col-span-2 space-y-5">
          <Card title={t("Elemente opace",lang)} badge={<button onClick={() => { setEditingOpaque(null); setShowOpaqueModal(true); }}
            className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>}>
            {opaqueElements.length === 0 ? (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">🏗️</div>
                <div className="text-xs">Adaugă primul element opac (pereți, planșee, terasă)</div>
              </div>
            ) : (
              <div className="space-y-2">
                {opaqueElements.map((el, idx) => {
                  const { u } = calcOpaqueR(el.layers, el.type);
                  const uRef = getURefNZEB(building.category, el.type);
                  const status = uRef ? (u <= uRef ? "ok" : u <= uRef*1.3 ? "warn" : "fail") : null;
                  const statusIcon = status==="ok" ? "✓" : status==="warn" ? "⚠" : "✗";
                  const elType = ELEMENT_TYPES.find(t => t.id === el.type);
                  return (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>{statusIcon}</span>
                        <div>
                          <div className="text-sm font-medium">{el.name}</div>
                          <div className="text-[10px] opacity-40">{elType?.label} · {el.orientation} · {el.layers.length} straturi</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-mono">{parseFloat(el.area).toFixed(1)} m²</div>
                          <div className={cn("text-xs font-mono font-medium", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                            U = {u.toFixed(3)}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingOpaque({...el, _idx:idx}); setShowOpaqueModal(true); }}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                          <button onClick={() => setOpaqueElements(p => p.filter((_,i) => i !== idx))}
                            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Elemente vitrate */}
          <Card title={t("Elemente vitrate",lang)} badge={<button onClick={() => { setEditingGlazing(null); setShowGlazingModal(true); }}
            className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>}>
            {glazingElements.length === 0 ? (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">🪟</div>
                <div className="text-xs">Adaugă ferestre și uși cu vitraje</div>
              </div>
            ) : (
              <div className="space-y-2">
                {glazingElements.map((el, idx) => {
                  const uVal = parseFloat(el.u) || 0;
                  const status = uVal <= 1.11 ? "ok" : uVal <= 1.40 ? "warn" : "fail";
                  return (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                          {status==="ok"?"✓":status==="warn"?"⚠":"✗"}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{el.name}</div>
                          <div className="text-[10px] opacity-40">{el.glazingType} · {el.frameType} · {el.orientation}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-mono">{parseFloat(el.area).toFixed(1)} m²</div>
                          <div className={cn("text-xs font-mono font-medium", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                            U = {el.u}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingGlazing({...el, _idx:idx}); setShowGlazingModal(true); }}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                          <button onClick={() => setGlazingElements(p => p.filter((_,i) => i !== idx))}
                            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Punți termice */}
          <Card title={t("Punți termice",lang)} badge={<div className="flex gap-2">
            <button onClick={() => setShowBridgeCatalog(true)}
              className="text-xs bg-white/5 text-white/60 px-3 py-1 rounded-lg hover:bg-white/10 border border-white/10">📖 Catalog</button>
            <button onClick={() => { setEditingBridge(null); setShowBridgeModal(true); }}
              className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>
          </div>}>
            {thermalBridges.length === 0 ? (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">🔗</div>
                <div className="text-xs">Adaugă punți termice (joncțiuni, console, glafuri)</div>
              </div>
            ) : (
              <div className="space-y-2">
                {thermalBridges.map((b, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                    <div>
                      <div className="text-sm font-medium">{b.name}</div>
                      <div className="text-[10px] opacity-40">{b.cat} · Ψ = {b.psi} W/(m·K)</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-mono">{parseFloat(b.length).toFixed(1)} m</div>
                        <div className="text-xs font-mono text-orange-400">{((parseFloat(b.psi)||0)*(parseFloat(b.length)||0)).toFixed(2)} W/K</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingBridge({...b, _idx:idx}); setShowBridgeModal(true); }}
                          className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                        <button onClick={() => setThermalBridges(p => p.filter((_,i) => i !== idx))}
                          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right panel: Summary */}
        <div className="space-y-5">
          <Card title={t("Sumar anvelopă",lang)} className="sticky top-6">
            {envelopeSummary && envelopeSummary.G > 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Coeficient global G</div>
                  <div className={cn("text-4xl font-bold font-mono",
                    envelopeSummary.G < 0.5 ? "text-emerald-400" : envelopeSummary.G < 0.8 ? "text-amber-400" : "text-red-400")}>
                    {envelopeSummary.G.toFixed(3)}
                  </div>
                  <div className="text-xs opacity-30 mt-1">W/(m³·K)</div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label="Elemente opace" value={opaqueElements.length} unit="buc" />
                  <ResultRow label="Elemente vitrate" value={glazingElements.length} unit="buc" />
                  <ResultRow label="Punți termice" value={thermalBridges.length} unit="buc" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label="Pierderi transmisie" value={envelopeSummary.totalHeatLoss.toFixed(1)} unit="W/K" />
                  <ResultRow label="  din care punți termice" value={envelopeSummary.bridgeLoss.toFixed(1)} unit="W/K" />
                  <ResultRow label="Pierderi ventilare (n=0.5)" value={envelopeSummary.ventLoss.toFixed(1)} unit="W/K" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label="Suprafață totală elemente" value={envelopeSummary.totalArea.toFixed(1)} unit="m²" />
                  <ResultRow label="Volum încălzit" value={envelopeSummary.volume.toFixed(1)} unit="m³" />
                </div>

                {selectedClimate && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Estimare rapidă</div>
                      <ResultRow label="Necesar încălzire"
                        value={((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7).toFixed(0)}
                        unit="kWh/(m³·an)" />
                      <ResultRow label="Necesar specific"
                        value={(parseFloat(building.areaUseful) > 0
                          ? (((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7) * parseFloat(building.volume) / parseFloat(building.areaUseful)).toFixed(0)
                          : "—")}
                        unit="kWh/(m²·an)" />
                    </div>
                  </>
                )}

                <div className="h-px bg-white/[0.06]" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Distribuție pierderi</div>
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 90 90" width="80" height="80" className="shrink-0">
                      {(() => {
                        var oL = opaqueElements.reduce(function(s,el){ var r = calcOpaqueR(el.layers,el.type); var tau = (ELEMENT_TYPES.find(function(t){return t.id===el.type})||{}).tau||1; return s+tau*(parseFloat(el.area)||0)*r.u; },0);
                        var gL = glazingElements.reduce(function(s,el){ return s+(parseFloat(el.area)||0)*(parseFloat(el.u)||0); },0);
                        var bL = envelopeSummary.bridgeLoss, vL = envelopeSummary.ventLoss;
                        var items=[{v:oL,c:"#ef4444"},{v:gL,c:"#3b82f6"},{v:bL,c:"#f97316"},{v:vL,c:"#8b5cf6"}];
                        var tot=oL+gL+bL+vL; if(tot<=0) return null;
                        var cum=0, cx=45, cy=45, r=38, res=[];
                        items.forEach(function(it,idx){
                          var pct=it.v/tot, ang=pct*360;
                          if(pct<0.01){cum+=ang;return;}
                          var a1=(cum-90)*Math.PI/180, a2=(cum+ang-90)*Math.PI/180;
                          res.push(<path key={idx} d={"M"+cx+","+cy+" L"+(cx+r*Math.cos(a1))+","+(cy+r*Math.sin(a1))+" A"+r+","+r+" 0 "+(ang>180?1:0)+",1 "+(cx+r*Math.cos(a2))+","+(cy+r*Math.sin(a2))+" Z"} fill={it.c} opacity="0.75"/>);
                          cum+=ang;
                        });
                        res.push(<circle key="h" cx={cx} cy={cy} r="16" fill="#12141f"/>);
                        return res;
                      })()}
                    </svg>
                    <div className="space-y-1">
                      {[{l:"Opace",c:"#ef4444"},{l:"Vitraje",c:"#3b82f6"},{l:"Punți",c:"#f97316"},{l:"Ventilare",c:"#8b5cf6"}].map(function(it){ return <div key={it.l} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:it.c}}/><span className="text-[10px] opacity-60">{it.l}</span></div>; })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">📐</div>
                <div className="text-xs">Adaugă elemente constructive și completează volumul în Pasul 1 pentru a vedea rezultatele</div>
              </div>
            )}
          </Card>

          {/* Quick reference */}
          <Card title={t("Referință U'max nZEB",lang)}>
            <div className="space-y-1">
              {Object.entries(U_REF_NZEB).filter(([_,v])=>v!==null).map(([k,v]) => {
                const el = ELEMENT_TYPES.find(t=>t.id===k);
                return <ResultRow key={k} label={el?.label || k} value={v.toFixed(2)} unit="W/(m²·K)" />;
              })}
            </div>
          </Card>

        </div>
      </div>

      {/* ── ANALIZE DETALIATE (sub grid, full-width) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">

          {/* ── VERIFICARE CONDENS GLASER (ISO 13788) ── */}
          {opaqueElements.length > 0 && selectedClimate && (
            <Card title="Verificare condens Glaser (ISO 13788)">
              {/* Element selector */}
              <div className="mb-3">
                <Select label="Element analizat" value={glaserElementIdx} onChange={v => setGlaserElementIdx(parseInt(v) || 0)}
                  options={opaqueElements.map((el, i) => ({ value: i, label: `${el.name || "Element " + (i+1)} (${(ELEMENT_TYPES.find(t=>t.id===el.type)||{}).label || el.type})` }))} />
              </div>

              {glaserResult ? (
                <div className="space-y-3">
                  {/* Verdict */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: glaserResult.annualOk ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${glaserResult.annualOk ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    <span className="text-xs font-medium">{glaserResult.verdict}</span>
                    <Badge color={glaserResult.annualOk ? "green" : "red"}>
                      {glaserResult.annualOk ? "CONFORM" : "NECONFORM"}
                    </Badge>
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-white/[0.03]">
                      <div className="font-bold font-mono">{glaserResult.maxCumulative.toFixed(0)}</div>
                      <div className="text-[9px] opacity-40">Max acum. [g/m²]</div>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03]">
                      <div className="font-bold font-mono">{glaserResult.winterAccum.toFixed(0)}</div>
                      <div className="text-[9px] opacity-40">Condens iarnă [g/m²]</div>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03]">
                      <div className="font-bold font-mono">{glaserResult.summerEvap.toFixed(0)}</div>
                      <div className="text-[9px] opacity-40">Evap. vară [g/m²]</div>
                    </div>
                  </div>

                  {/* Monthly bar chart: condensation vs evaporation */}
                  <div>
                    <div className="text-[10px] opacity-30 mb-1">Condens/evaporare lunară [g/m²]</div>
                    <div className="flex items-end gap-px h-20 bg-white/[0.02] rounded p-1">
                      {glaserResult.monthly.map((m, i) => {
                        const maxVal = Math.max(...glaserResult.monthly.map(x => Math.max(x.condensation || 0, x.evaporation || 0)), 1);
                        const condPct = (m.condensation || 0) / maxVal * 100;
                        const evapPct = (m.evaporation || 0) / maxVal * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m.month}: condens=${(m.condensation||0).toFixed(1)}, evap=${(m.evaporation||0).toFixed(1)} g/m²`}>
                            {condPct > 0 && <div className="w-full rounded-t" style={{ height: `${condPct}%`, backgroundColor: "#ef4444", minHeight: "1px" }} />}
                            {evapPct > 0 && <div className="w-full rounded-t" style={{ height: `${evapPct}%`, backgroundColor: "#22c55e", minHeight: "1px" }} />}
                            <span className="text-[7px] opacity-30 mt-0.5">{m.month?.slice(0,1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 text-[9px] opacity-30 mt-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded bg-red-500 inline-block" /> Condens</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded bg-green-500 inline-block" /> Evaporare</span>
                    </div>
                  </div>

                  {/* Monthly table (collapsible) */}
                  <details>
                    <summary className="text-[10px] opacity-30 cursor-pointer hover:opacity-50">Tabel lunar detaliat</summary>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-[9px]">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-1 px-1 opacity-40">Luna</th>
                            <th className="text-right py-1 px-1 opacity-40">θe [°C]</th>
                            <th className="text-right py-1 px-1 opacity-40">Condens [g/m²]</th>
                            <th className="text-right py-1 px-1 opacity-40">Evap [g/m²]</th>
                            <th className="text-right py-1 px-1 opacity-40">Cumul [g/m²]</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {glaserResult.monthly.map((m, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1 px-1">{m.month}</td>
                              <td className="text-right py-1 px-1">{m.tExt?.toFixed(1)}</td>
                              <td className="text-right py-1 px-1" style={{ color: (m.condensation||0) > 0 ? "#ef4444" : undefined }}>{(m.condensation||0).toFixed(1)}</td>
                              <td className="text-right py-1 px-1" style={{ color: (m.evaporation||0) > 0 ? "#22c55e" : undefined }}>{(m.evaporation||0).toFixed(1)}</td>
                              <td className="text-right py-1 px-1 font-semibold">{(m.cumulative||0).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ) : (
                <div className="text-center py-4 opacity-30 text-xs">
                  Adaugă straturi la elementul opac pentru analiza Glaser
                </div>
              )}
            </Card>
          )}

          {/* ── CONFORT TERMIC VARĂ — C107/7-2002 (A1) ── */}
          {summerComfortResults.length > 0 && (
            <Card title={t("Confort termic vară",lang)} badge={<Badge color={summerComfortResults.every(r=>r?.ok) ? "green" : "amber"}>C107/7</Badge>}>
              <div className="space-y-2">
                {summerComfortResults.map((r, i) => r && (
                  <div key={i} className="p-2 rounded-lg text-xs" style={{ background: r.ok ? "rgba(34,197,94,0.03)" : "rgba(239,68,68,0.03)", border: `1px solid ${r.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate flex-1">{r.name}</span>
                      <Badge color={r.ok ? "green" : "red"}>Cat. {r.comfortCategory}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] opacity-60">
                      <span>Indice inerție D: <b className="font-mono">{r.D}</b></span>
                      <span>Amortizare ν: <b className="font-mono">{r.dampingFactor}</b></span>
                      <span>Defazaj: <b className="font-mono">{r.phaseShift}h</b></span>
                      <span>T sup. max: <b className="font-mono" style={{color: r.ok ? "#22c55e" : "#ef4444"}}>{r.tSurfMax}°C</b></span>
                    </div>
                  </div>
                ))}
                <div className="text-[9px] opacity-25 mt-1">Cat. I: ≤25°C · Cat. II: ≤26°C · Cat. III: ≤27°C · Cat. IV: &gt;27°C</div>
              </div>
            </Card>
          )}

          {/* ── DIAGRAMĂ GLASER VIZUALĂ SVG (C1) ── */}
          {glaserResult && opaqueElements[glaserElementIdx] && (
            <Card title="Diagramă Glaser — Profil temperatură și vapori">
              <svg viewBox="0 0 400 200" className="w-full" style={{minHeight:"160px"}}>
                {/* Background */}
                <rect x="0" y="0" width="400" height="200" fill="transparent" />
                <text x="200" y="12" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">Profil temperatură și presiune vapori prin element</text>
                {(() => {
                  const el = opaqueElements[glaserElementIdx];
                  const layers = el.layers || [];
                  if (!layers.length) return null;
                  const totalThick = layers.reduce((s,l) => s + (parseFloat(l.thickness)||0), 0);
                  if (totalThick <= 0) return null;
                  const tInt = 20, tExt = selectedClimate?.theta_e || -15;
                  const rSi = 0.13, rSe = 0.04;
                  // Calculate R values
                  let rLayers = layers.map(l => {
                    const d = (parseFloat(l.thickness)||0)/1000;
                    return { d, lambda: l.lambda||0.5, rho: l.rho||1500, R: d > 0 && l.lambda > 0 ? d/l.lambda : 0, name: l.material || l.matName || "?" };
                  });
                  const rTotal = rSi + rLayers.reduce((s,l) => s+l.R, 0) + rSe;
                  // Temperature profile
                  const chartLeft = 50, chartRight = 380, chartTop = 25, chartBottom = 175;
                  const chartW = chartRight - chartLeft;
                  // Draw layers
                  let xCum = chartLeft;
                  const layerRects = [];
                  const layerColors = ["rgba(239,68,68,0.08)","rgba(59,130,246,0.08)","rgba(234,179,8,0.08)","rgba(139,92,246,0.08)","rgba(34,197,94,0.08)"];
                  rLayers.forEach((l, i) => {
                    const w = (parseFloat(layers[i].thickness)||0) / totalThick * chartW;
                    layerRects.push(<rect key={"lr"+i} x={xCum} y={chartTop} width={w} height={chartBottom-chartTop} fill={layerColors[i%layerColors.length]} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />);
                    layerRects.push(<text key={"lt"+i} x={xCum+w/2} y={chartBottom+11} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="5.5" className="select-none">{(parseFloat(layers[i].thickness)||0)}mm</text>);
                    xCum += w;
                  });
                  // Temp line
                  const tempPoints = [];
                  let tCum = tInt, rCum2 = 0;
                  tempPoints.push({ x: chartLeft, t: tInt - (tInt-tExt)*rSi/rTotal });
                  rCum2 = rSi;
                  rLayers.forEach((l, i) => {
                    rCum2 += l.R;
                    const t = tInt - (tInt-tExt)*rCum2/rTotal;
                    const x = chartLeft + layers.slice(0,i+1).reduce((s,ll) => s+(parseFloat(ll.thickness)||0), 0) / totalThick * chartW;
                    tempPoints.push({ x, t });
                  });
                  const tMin = Math.min(tExt, ...tempPoints.map(p=>p.t)) - 2;
                  const tMax = Math.max(tInt, ...tempPoints.map(p=>p.t)) + 2;
                  const tToY = (t) => chartTop + (1 - (t-tMin)/(tMax-tMin)) * (chartBottom - chartTop);
                  const tempLine = tempPoints.map((p,i) => (i===0?"M":"L")+p.x.toFixed(1)+","+tToY(p.t).toFixed(1)).join(" ");
                  // Y axis labels
                  const yLabels = [];
                  for (let t = Math.ceil(tMin/5)*5; t <= tMax; t += 5) {
                    yLabels.push(<text key={"yl"+t} x={chartLeft-3} y={tToY(t)+2} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="6">{t}°</text>);
                    yLabels.push(<line key={"yg"+t} x1={chartLeft} y1={tToY(t)} x2={chartRight} y2={tToY(t)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />);
                  }
                  // Dew point line (simplified)
                  const dewPoints = tempPoints.map(p => {
                    const rh = 0.65; // assume 65% RH interior
                    const td = p.t - ((100 - rh*100) / 5);
                    return { x: p.x, t: Math.min(td, p.t) };
                  });
                  const dewLine = dewPoints.map((p,i) => (i===0?"M":"L")+p.x.toFixed(1)+","+tToY(p.t).toFixed(1)).join(" ");
                  return (
                    <>
                      {layerRects}
                      {yLabels}
                      <path d={tempLine} fill="none" stroke="#ef4444" strokeWidth="2" />
                      <path d={dewLine} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
                      {tempPoints.map((p,i) => <circle key={"tc"+i} cx={p.x} cy={tToY(p.t)} r="2.5" fill="#ef4444" />)}
                      <text x={chartLeft} y={chartBottom+22} fill="rgba(255,255,255,0.2)" fontSize="6">Int ({tInt}°C)</text>
                      <text x={chartRight} y={chartBottom+22} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="6">Ext ({tExt}°C)</text>
                      {/* Legend */}
                      <line x1={chartLeft} y1={190} x2={chartLeft+15} y2={190} stroke="#ef4444" strokeWidth="2" />
                      <text x={chartLeft+18} y={192} fill="rgba(255,255,255,0.35)" fontSize="6">Temperatură</text>
                      <line x1={chartLeft+80} y1={190} x2={chartLeft+95} y2={190} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
                      <text x={chartLeft+98} y={192} fill="rgba(255,255,255,0.35)" fontSize="6">Punct de rouă</text>
                    </>
                  );
                })()}
              </svg>
              <div className="text-[9px] opacity-20 mt-1 text-center">Dacă linia de temperatură scade sub punctul de rouă → risc condens interstițial</div>
            </Card>
          )}

          {/* ── INFILTRAȚII AER (A8) ── */}
          {airInfiltrationCalc && (
            <Card title={t("Etanșeitate la aer",lang)}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">n50 (blower door)</span>
                  <span className="text-sm font-mono font-bold" style={{color: airInfiltrationCalc.color}}>{airInfiltrationCalc.n50} h⁻¹</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Clasificare</span>
                  <Badge color={airInfiltrationCalc.n50 <= 3 ? "green" : airInfiltrationCalc.n50 <= 5 ? "amber" : "red"}>{airInfiltrationCalc.classification}</Badge>
                </div>
                <ResultRow label="Debit la 50Pa" value={airInfiltrationCalc.q50} unit="m³/h" />
                <ResultRow label="Infiltrație naturală" value={airInfiltrationCalc.nInfNat} unit="h⁻¹" />
                <ResultRow label="Pierderi estimate" value={airInfiltrationCalc.lossKW} unit="kW" />
                {airInfiltrationCalc.recommendation && (
                  <div className="text-[10px] text-amber-400/70 mt-1 p-2 rounded bg-amber-500/5 border border-amber-500/10">{airInfiltrationCalc.recommendation}</div>
                )}
              </div>
            </Card>
          )}

          {/* ── ILUMINAT NATURAL (A10) ── */}
          {naturalLightingCalc && (
            <Card title={t("Iluminat natural",lang)}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Factor lumină zi (FLZ)</span>
                  <span className="text-sm font-mono font-bold" style={{color: naturalLightingCalc.color}}>{naturalLightingCalc.flz}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Clasificare</span>
                  <Badge color={naturalLightingCalc.flz >= 3 ? "green" : naturalLightingCalc.flz >= 2 ? "amber" : "red"}>{naturalLightingCalc.classification}</Badge>
                </div>
                <ResultRow label="Raport vitrat/util" value={naturalLightingCalc.ratio} unit="%" />
                <ResultRow label="Sup. vitrată totală" value={naturalLightingCalc.glazArea} unit="m²" />
                <ResultRow label="Reducere LENI posibilă" value={naturalLightingCalc.fDaylight} unit="%" status={naturalLightingCalc.fDaylight > 20 ? "ok" : null} />
              </div>
            </Card>
          )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
        <button onClick={() => setStep(1)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
          ← Pas 1: Identificare
        </button>
        <button onClick={() => goToStep(3, 2)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
          Pasul 3: Instalații →
        </button>
      </div>
    </div>
  );
}
