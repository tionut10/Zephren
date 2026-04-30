import { useState } from "react";
import { cn, Select, Input, Card, Badge, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";
import UComplianceTable from "../components/UComplianceTable.jsx";
import SmartEnvelopeHub from "../components/SmartEnvelopeHub/SmartEnvelopeHub.jsx";
import OpaqueSection from "../components/sections/OpaqueSection.jsx";
import GlazingSection from "../components/sections/GlazingSection.jsx";
import ElementSectionModal from "../components/sections/ElementSectionModal.jsx";

export default function Step2Envelope({
  building, lang, selectedClimate,
  opaqueElements, setOpaqueElements,
  glazingElements, setGlazingElements,
  thermalBridges, setThermalBridges,
  pointThermalBridges = [], setPointThermalBridges = () => {}, // Sprint 22 #2
  envelopeSummary,
  setEditingOpaque, setShowOpaqueModal,
  setEditingGlazing, setShowGlazingModal,
  setEditingBridge, setShowBridgeModal, setShowBridgeCatalog,
  calcOpaqueR, getURefNZEB,
  ELEMENT_TYPES, U_REF_NZEB,
  avValidation,
  U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_RENOV_RES, U_REF_RENOV_NRES, U_REF_GLAZING,
  glaserElementIdx, setGlaserElementIdx, glaserResult,
  summerComfortResults,
  airInfiltrationCalc, naturalLightingCalc,
  csvImportRef, importCSV,
  setStep, goToStep,
  // SmartEnvelopeHub (S4 GA — feature flag controlled; default ON, ?envelopeHub=0 → legacy grid)
  envelopeHubEnabled = false,
  applyEnvelopeTemplate,
  applyDemoEnvelopeOnly,
  applyStandardBridgesPackHandler,
  apply4WallsFromGeom,
  onOpenJSONImport,
  onOpenIFC,
  onLoadDemoTutorial,
  showToast,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

  // ── State pentru secțiuni transversale detaliate ──
  const [sectionTab, setSectionTab] = useState("opaque"); // "opaque" | "glazing"
  const [sectionElementIdx, setSectionElementIdx] = useState(0);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  const sectionElements = sectionTab === "opaque" ? opaqueElements : glazingElements;
  const currentSectionEl = sectionElements[Math.min(sectionElementIdx, sectionElements.length - 1)] || null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3 mb-2">
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

      {/* SmartEnvelopeHub — S4 GA (default ON; ?envelopeHub=0 → legacy grid fallback). */}
      {envelopeHubEnabled && (
        <SmartEnvelopeHub
          building={building}
          opaqueElements={opaqueElements}
          glazingElements={glazingElements}
          thermalBridges={thermalBridges}
          envelopeSummary={envelopeSummary}
          calcOpaqueR={calcOpaqueR}
          ELEMENT_TYPES={ELEMENT_TYPES}
          lang={lang}
          selectedClimate={selectedClimate}
          // CRUD callback-uri modale existente (edit + catalog)
          setEditingOpaque={setEditingOpaque}
          setShowOpaqueModal={setShowOpaqueModal}
          setEditingGlazing={setEditingGlazing}
          setShowGlazingModal={setShowGlazingModal}
          setEditingBridge={setEditingBridge}
          setShowBridgeModal={setShowBridgeModal}
          setShowBridgeCatalog={setShowBridgeCatalog}
          // State mutators (S4 — necesar pentru ElementsList CRUD + wizard save)
          setOpaqueElements={setOpaqueElements}
          setGlazingElements={setGlazingElements}
          setThermalBridges={setThermalBridges}
          // RampInstant
          applyEnvelopeTemplate={applyEnvelopeTemplate}
          applyDemoEnvelopeOnly={applyDemoEnvelopeOnly}
          applyStandardBridgesPackHandler={applyStandardBridgesPackHandler}
          apply4WallsFromGeom={apply4WallsFromGeom}
          // RampFile — import
          onOpenIFC={onOpenIFC}
          onCSVImport={(e) => { if (e?.target?.files?.[0]) importCSV(e.target.files[0]); }}
          onOpenJSONImport={onOpenJSONImport}
          // RampGuided — S4 tutorial demo loader
          onLoadDemoTutorial={onLoadDemoTutorial}
          t={t}
          showToast={showToast}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Elemente opace + vitrate + punți — grid LEGACY (doar când Hub OFF, flag false) */}
        {!envelopeHubEnabled && (
        <div className="xl:col-span-2 space-y-5">
          <Card title={t("Elemente opace",lang)} badge={<button onClick={() => { setEditingOpaque(null); setShowOpaqueModal(true); }}
            className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>}>
            {opaqueElements.length === 0 ? (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">🏗️</div>
                <div className="text-xs">{t("Adaugă primul element opac (pereți, planșee, terasă)",lang)}</div>
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
                <div className="text-xs">{t("Adaugă ferestre și uși cu vitraje",lang)}</div>
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
                <div className="text-xs">{t("Adaugă punți termice (joncțiuni, console, glafuri)",lang)}</div>
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

          {/* Sprint 22 #2 — Punți termice punctuale (χ × N) — SR EN ISO 14683 §8.3 / ISO 10211 cap.7 */}
          <Card title={t("Punți punctuale (χ)",lang)} badge={
            <button
              onClick={() => setPointThermalBridges(p => [...p, { id: Date.now(), name: "Punte punctuală nouă", chi: 0.02, count: 1 }])}
              className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">
              + Adaugă
            </button>
          }>
            <div className="text-[11px] opacity-60 mb-3">
              Elemente punctuale χ [W/K] — conectori metalici, penetrații, ancore locale. H_tb_point = Σ(χ × N).
            </div>
            {pointThermalBridges.length === 0 ? (
              <div className="text-center py-6 opacity-30">
                <div className="text-2xl mb-1">·</div>
                <div className="text-xs">{t("Fără punți punctuale definite (opțional)",lang)}</div>
              </div>
            ) : (
              <div className="space-y-2">
                {pointThermalBridges.map((b, idx) => {
                  const loss = (parseFloat(b.chi) || 0) * (parseFloat(b.count) || 0);
                  return (
                    <div key={b.id || idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center gap-3">
                      <input
                        type="text"
                        value={b.name || ""}
                        onChange={e => setPointThermalBridges(p => p.map((x,i) => i===idx ? {...x, name: e.target.value} : x))}
                        placeholder="Denumire"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] opacity-40">χ=</span>
                        <input
                          type="number"
                          value={b.chi ?? ""}
                          onChange={e => setPointThermalBridges(p => p.map((x,i) => i===idx ? {...x, chi: parseFloat(e.target.value) || 0} : x))}
                          step="0.001" min="0"
                          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50"
                        />
                        <span className="text-[10px] opacity-40">W/K</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] opacity-40">N=</span>
                        <input
                          type="number"
                          value={b.count ?? ""}
                          onChange={e => setPointThermalBridges(p => p.map((x,i) => i===idx ? {...x, count: parseFloat(e.target.value) || 0} : x))}
                          step="1" min="0"
                          className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50"
                        />
                        <span className="text-[10px] opacity-40">buc</span>
                      </div>
                      <div className="text-xs font-mono text-orange-400 w-24 text-right">{loss.toFixed(3)} W/K</div>
                      <button
                        onClick={() => setPointThermalBridges(p => p.filter((_,i) => i !== idx))}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        ✕
                      </button>
                    </div>
                  );
                })}
                <div className="pt-2 text-right text-xs opacity-60">
                  {t("Total",lang)} H_tb_point = {pointThermalBridges.reduce((s,b) => s + (parseFloat(b.chi)||0)*(parseFloat(b.count)||0), 0).toFixed(3)} W/K
                </div>
              </div>
            )}
          </Card>
        </div>
        )}

        {/* Right panel: Summary. Când Hub e ON, ocupă 3 coloane (grid intern 2+1). */}
        <div className={envelopeHubEnabled
          ? "xl:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-5"
          : "space-y-5"}>
          <Card title={t("Sumar anvelopă",lang)} className={envelopeHubEnabled ? "xl:col-span-2" : ""}>
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
                  <ResultRow label={t("Elemente opace",lang)} value={opaqueElements.length} unit="buc" />
                  <ResultRow label={t("Elemente vitrate",lang)} value={glazingElements.length} unit="buc" />
                  <ResultRow label={t("Punți termice liniare",lang)} value={thermalBridges.length} unit="buc" />
                  {pointThermalBridges.length > 0 && (
                    <ResultRow label={t("Punți punctuale (χ)",lang)} value={pointThermalBridges.length} unit="buc" />
                  )}
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label={t("Pierderi transmisie",lang)} value={envelopeSummary.totalHeatLoss.toFixed(1)} unit="W/K" />
                  <ResultRow label={t("  din care punți termice",lang)} value={envelopeSummary.bridgeLoss.toFixed(1)} unit="W/K" />
                  {envelopeSummary.pointBridgeLoss > 0 && (
                    <ResultRow label={t("    · punctuale (χ×N)",lang)} value={envelopeSummary.pointBridgeLoss.toFixed(2)} unit="W/K" />
                  )}
                  <ResultRow label={t("Pierderi ventilare (n=0.5)",lang)} value={envelopeSummary.ventLoss.toFixed(1)} unit="W/K" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label={t("Suprafață totală elemente",lang)} value={envelopeSummary.totalArea.toFixed(1)} unit="m²" />
                  <ResultRow label={t("Volum încălzit",lang)} value={envelopeSummary.volume.toFixed(1)} unit="m³" />
                </div>

                {selectedClimate && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{t("Estimare rapidă",lang)}</div>
                      <ResultRow label={t("Necesar încălzire",lang)}
                        value={((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7).toFixed(0)}
                        unit="kWh/(m³·an)" />
                      <ResultRow label={t("Necesar specific",lang)}
                        value={(parseFloat(building.areaUseful) > 0
                          ? (((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7) * parseFloat(building.volume) / parseFloat(building.areaUseful)).toFixed(0)
                          : "—")}
                        unit="kWh/(m²·an)" />
                    </div>
                  </>
                )}

                <div className="h-px bg-white/[0.06]" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2 text-center">{t("Distribuție pierderi",lang)}</div>
                  <div className="flex flex-col items-center gap-3 w-full">
                    <svg viewBox="0 0 90 90" width="90" height="90" className="shrink-0">
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
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {[{l:"Opace",c:"#ef4444"},{l:"Vitraje",c:"#3b82f6"},{l:"Punți",c:"#f97316"},{l:"Ventilare",c:"#8b5cf6"}].map(function(it){ return <div key={it.l} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:it.c}}/><span className="text-[10px] opacity-60">{t(it.l,lang)}</span></div>; })}
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

          {/* Validare A/V — span complet când Hub ON, inline când Hub OFF */}
          {avValidation?.msg && (
            <div className={cn(
              `text-xs px-3 py-2 rounded-lg border ${
                avValidation.status === "low" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                : "border-orange-500/30 bg-orange-500/10 text-orange-300"
              }`,
              envelopeHubEnabled && "xl:col-span-3"
            )}>
              ⚠️ {avValidation.msg}
            </div>
          )}

        </div>
      </div>

      {/* ── CONFORMITATE U — tabel complet (data-compliance-table pt. scroll din asistent) ── */}
      {(opaqueElements.length > 0 || glazingElements.length > 0) && U_REF_NZEB_RES && (
        <div data-compliance-table>
          <Card title={t("Conformitate U față de referințe Mc 001-2022", lang)}>
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
        </div>
      )}

      {/* ── SECȚIUNI TRANSVERSALE DETALIATE (opac + vitrat) ── */}
      {(opaqueElements.length > 0 || glazingElements.length > 0) && (
        <div>
          <Card
            title={t("Secțiuni transversale detaliate", lang)}
            badge={<Badge color="amber">ISO 128 · ISO 6946 · ISO 10077</Badge>}
          >
            {/* Tabs opaque / glazing */}
            <div className="flex gap-2 mb-3 border-b border-white/10">
              <button
                onClick={() => { setSectionTab("opaque"); setSectionElementIdx(0); }}
                className={cn(
                  "px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                  sectionTab === "opaque"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-white/50 hover:text-white/80"
                )}
                disabled={opaqueElements.length === 0}
                aria-pressed={sectionTab === "opaque"}
              >
                🧱 Elemente opace <span className="opacity-50">({opaqueElements.length})</span>
              </button>
              <button
                onClick={() => { setSectionTab("glazing"); setSectionElementIdx(0); }}
                className={cn(
                  "px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                  sectionTab === "glazing"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-white/50 hover:text-white/80"
                )}
                disabled={glazingElements.length === 0}
                aria-pressed={sectionTab === "glazing"}
              >
                🪟 Elemente vitrate <span className="opacity-50">({glazingElements.length})</span>
              </button>
              <div className="ml-auto flex items-center gap-2">
                {currentSectionEl && (
                  <button
                    onClick={() => setSectionModalOpen(true)}
                    className="px-3 py-1.5 text-[11px] rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium"
                    title="Deschide vederea detaliată în modal"
                  >
                    🔍 Vizualizare detaliată
                  </button>
                )}
              </div>
            </div>

            {/* Element selector */}
            {sectionElements.length > 0 ? (
              <>
                <div className="mb-3">
                  <Select
                    label={t("Element selectat", lang)}
                    value={sectionElementIdx}
                    onChange={(v) => setSectionElementIdx(parseInt(v) || 0)}
                    options={sectionElements.map((el, i) => ({
                      value: i,
                      label: sectionTab === "opaque"
                        ? `${el.name || "Element " + (i + 1)} (${(ELEMENT_TYPES.find(t => t.id === el.type) || {}).label || el.type})`
                        : `${el.name || "Fereastră " + (i + 1)} — ${el.glazingType || "?"} · ${el.area || "?"} m²`
                    }))}
                  />
                </div>

                {currentSectionEl && sectionTab === "opaque" && (
                  <OpaqueSection
                    element={currentSectionEl}
                    climate={selectedClimate}
                    tInt={20}
                    width={640}
                    height={240}
                    showTemperatureProfile={true}
                    showDimensions={true}
                    showLegend={true}
                    onClickExpand={() => setSectionModalOpen(true)}
                  />
                )}
                {currentSectionEl && sectionTab === "glazing" && (
                  <GlazingSection
                    element={currentSectionEl}
                    width={640}
                    height={220}
                    showDimensions={true}
                    showLegend={true}
                    onClickExpand={() => setSectionModalOpen(true)}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-6 text-xs opacity-40">
                {sectionTab === "opaque"
                  ? "Adaugă elemente opace (pereți, acoperiș, planșee) pentru a vedea secțiunile."
                  : "Adaugă elemente vitrate (ferestre, uși) pentru a vedea secțiunile."}
              </div>
            )}
          </Card>

          {/* Modal vizualizare detaliată */}
          {sectionModalOpen && currentSectionEl && (
            <ElementSectionModal
              type={sectionTab}
              element={currentSectionEl}
              climate={selectedClimate}
              tInt={20}
              onClose={() => setSectionModalOpen(false)}
            />
          )}
        </div>
      )}

      {/* ── ANALIZE DETALIATE (sub grid, full-width) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

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
                      <div className="text-[10px] opacity-40">Max acum. [g/m²]</div>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03]">
                      <div className="font-bold font-mono">{glaserResult.winterAccum.toFixed(0)}</div>
                      <div className="text-[10px] opacity-40">{t("Condens iarnă [g/m²]",lang)}</div>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03]">
                      <div className="font-bold font-mono">{glaserResult.summerEvap.toFixed(0)}</div>
                      <div className="text-[10px] opacity-40">{t("Evap. vară [g/m²]",lang)}</div>
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
                            <span className="text-[8px] opacity-30 mt-0.5">{m.month?.slice(0,1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 text-[10px] opacity-30 mt-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded bg-red-500 inline-block" /> Condens</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded bg-green-500 inline-block" /> Evaporare</span>
                    </div>
                  </div>

                  {/* Monthly table (collapsible) */}
                  <details>
                    <summary className="text-[10px] opacity-30 cursor-pointer hover:opacity-50">Tabel lunar detaliat</summary>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-[10px] tabular-nums">
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
                <div className="text-[10px] opacity-25 mt-1">Cat. I: ≤25°C · Cat. II: ≤26°C · Cat. III: ≤27°C · Cat. IV: &gt;27°C</div>
              </div>
            </Card>
          )}

          {/* ── DIAGRAMĂ GLASER REALĂ — p_sat vs p_v pe axa sd (ISO 13788) ── */}
          {glaserResult && glaserResult.monthly && glaserResult.layers && glaserResult.layers.length > 0 && (
            <Card title={t("Diagramă Glaser — presiuni vapori (ISO 13788)", lang)}>
              {(() => {
                const worstIdx = glaserResult.monthly.reduce((best, m, i, arr) => (m.condensation || 0) > (arr[best].condensation || 0) ? i : best, 0);
                const month = glaserResult.monthly[worstIdx];
                const layers = glaserResult.layers;
                const iFaces = month?.interfaces || [];
                if (!iFaces.length) return <div className="text-[11px] opacity-40 text-center py-4">Interfețe indisponibile — reîncearcă după completarea straturilor.</div>;

                const sdTotal = layers.reduce((s, l) => s + (l.sd || 0), 0);
                if (sdTotal <= 0) return <div className="text-[11px] opacity-40 text-center py-4">sd = 0 — verifică μ și grosimile straturilor.</div>;
                const sdCum = [0];
                layers.forEach(l => sdCum.push(sdCum[sdCum.length - 1] + (l.sd || 0)));

                const psVals = iFaces.map(p => p.ps || 0);
                const pvVals = iFaces.map(p => p.pv || 0);
                const pMax = Math.max(...psVals, ...pvVals, 100) * 1.15;

                // Chart bounds — spațiu sus pentru chips legende straturi
                const chipsPerRow = Math.min(4, layers.length);
                const chipRows = Math.ceil(layers.length / chipsPerRow);
                const cL = 52, cR = 500, cT = 14 + chipRows * 22, cB = cT + 140;
                const cW = cR - cL, cH = cB - cT;
                const svgH = cB + 52;
                const sdToX = (sd) => cL + (sd / sdTotal) * cW;
                const pToY  = (p)  => cB - (p  / pMax)  * cH;

                // Culori straturi
                const lColors = ["#ef4444","#3b82f6","#f59e0b","#8b5cf6","#10b981","#f97316","#06b6d4"];

                // Chips legende straturi (deasupra graficului)
                const chipW = (cW - 4) / chipsPerRow;
                const layerChips = layers.map((l, i) => {
                  const row = Math.floor(i / chipsPerRow);
                  const col = i % chipsPerRow;
                  const cx = cL + col * chipW;
                  const cy = 10 + row * 22;
                  const label = (l.name || "Strat "+(i+1)).slice(0,22)+" ("+((l.d||0)*1000).toFixed(0)+"mm · sd="+((l.sd||0).toFixed(2))+"m)";
                  return (
                    <g key={"chip"+i}>
                      <rect x={cx} y={cy} width="9" height="9" rx="2" fill={lColors[i % lColors.length]} opacity="0.8" />
                      <text x={cx+13} y={cy+8} fill="rgba(255,255,255,0.65)" fontSize="8">{label}</text>
                    </g>
                  );
                });

                // Fundaluri colorate pe straturi (fără etichete)
                const layerRects = layers.map((l, i) => {
                  const x1 = sdToX(sdCum[i]);
                  const x2 = sdToX(sdCum[i+1]);
                  return (
                    <g key={"lr"+i}>
                      <rect x={x1} y={cT} width={Math.max(x2-x1,0)} height={cH}
                        fill={lColors[i % lColors.length]+"1a"} stroke={lColors[i % lColors.length]}
                        strokeWidth="0.6" strokeOpacity="0.3" />
                      {/* Linie separatoare verticală */}
                      {i > 0 && <line x1={x1} y1={cT} x2={x1} y2={cB} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="3,2" />}
                    </g>
                  );
                });

                // Grilă orizontală + etichete Y
                const yGrid = [];
                for (let i = 0; i <= 4; i++) {
                  const p = (pMax * i) / 4;
                  const y = pToY(p);
                  yGrid.push(
                    <g key={"yg"+i}>
                      <line x1={cL} y1={y} x2={cR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
                      <text x={cL-4} y={y+3} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="8">{Math.round(p)}</text>
                    </g>
                  );
                }

                // Zonă umplută condens (p_v ≥ p_sat)
                const condFill = iFaces.slice(0,-1).map((p, i) => {
                  const p2 = iFaces[i+1];
                  if ((p.pv||0) < (p.ps||0) && (p2.pv||0) < (p2.ps||0)) return null;
                  const x1 = sdToX(sdCum[i]), x2 = sdToX(sdCum[i+1]);
                  return <polygon key={"cf"+i}
                    points={`${x1},${pToY(p.pv)} ${x2},${pToY(p2.pv)} ${x2},${pToY(p2.ps)} ${x1},${pToY(p.ps)}`}
                    fill="rgba(239,68,68,0.15)" />;
                }).filter(Boolean);

                // Curbe
                const psPath = iFaces.map((p, i) => (i===0?"M":"L")+sdToX(sdCum[i]).toFixed(1)+","+pToY(p.ps).toFixed(1)).join(" ");
                const pvPath = iFaces.map((p, i) => (i===0?"M":"L")+sdToX(sdCum[i]).toFixed(1)+","+pToY(p.pv).toFixed(1)).join(" ");

                // Marcatoare condens
                const condMarkers = iFaces.map((p, i) => p.condensing ? (
                  <circle key={"cz"+i} cx={sdToX(sdCum[i])} cy={pToY(p.pv)} r="6" fill="#ef4444" opacity="0.35" />
                ) : null).filter(Boolean);

                // Ticks axă X (sd cumulativ)
                const xTicks = sdCum.map((sd, i) => (
                  <g key={"xt"+i}>
                    <line x1={sdToX(sd)} y1={cB} x2={sdToX(sd)} y2={cB+4} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
                    <text x={sdToX(sd)} y={cB+14} fill="rgba(255,255,255,0.4)" fontSize="7.5" textAnchor="middle">{sd.toFixed(2)}</text>
                  </g>
                ));

                return (
                  <>
                    <div className="text-[10px] opacity-55 mb-2 flex gap-4 flex-wrap">
                      <span>Luna critică: <b>{month.month}</b></span>
                      <span>θ<sub>e</sub> = <b>{month.tExt?.toFixed(1)}°C</b></span>
                      <span>sd<sub>total</sub> = <b>{sdTotal.toFixed(2)} m</b></span>
                      {condMarkers.length > 0
                        ? <span className="text-red-400 font-medium">⚠ {condMarkers.length} interfață cu condens</span>
                        : <span className="text-emerald-400">✓ Fără condens</span>}
                    </div>
                    <svg viewBox={`0 0 520 ${svgH}`} className="w-full" style={{ minHeight: "220px" }}>
                      {/* Chips straturi (sus) */}
                      {layerChips}

                      {/* EXT / INT */}
                      <text x={cL+2} y={cT-4} fill="rgba(255,255,255,0.35)" fontSize="8">← EXT</text>
                      <text x={cR-2} y={cT-4} fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end">INT →</text>

                      {/* Etichetă axă Y */}
                      <text x="10" y={cT + cH/2} fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="middle"
                        transform={`rotate(-90,10,${cT + cH/2})`}>p [Pa]</text>

                      {/* Grilă */}
                      {yGrid}

                      {/* Bordură grafic */}
                      <rect x={cL} y={cT} width={cW} height={cH} fill="none"
                        stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" rx="1" />

                      {/* Straturi + divizoare */}
                      {layerRects}

                      {/* Zonă condens */}
                      {condFill}

                      {/* Curbe */}
                      <path d={psPath} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d={pvPath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="8,3" strokeLinejoin="round" />

                      {/* Puncte pe curbe */}
                      {iFaces.map((p, i) => <circle key={"psc"+i} cx={sdToX(sdCum[i])} cy={pToY(p.ps)} r="3" fill="#22c55e" stroke="#0f172a" strokeWidth="1" />)}
                      {iFaces.map((p, i) => <circle key={"pvc"+i} cx={sdToX(sdCum[i])} cy={pToY(p.pv)} r="3" fill="#60a5fa" stroke="#0f172a" strokeWidth="1" />)}
                      {condMarkers}

                      {/* Axă X — valori sd */}
                      {xTicks}
                      <text x={cR} y={cB+25} fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end">sd [m]</text>

                      {/* Legendă curbe */}
                      <line x1={cL} y1={cB+40} x2={cL+20} y2={cB+40} stroke="#22c55e" strokeWidth="2.5" />
                      <circle cx={cL+10} cy={cB+40} r="3" fill="#22c55e" stroke="#0f172a" strokeWidth="1" />
                      <text x={cL+25} y={cB+44} fill="rgba(255,255,255,0.6)" fontSize="9">p_sat (saturație)</text>

                      <line x1={cL+135} y1={cB+40} x2={cL+155} y2={cB+40} stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="8,3" />
                      <circle cx={cL+145} cy={cB+40} r="3" fill="#60a5fa" stroke="#0f172a" strokeWidth="1" />
                      <text x={cL+160} y={cB+44} fill="rgba(255,255,255,0.6)" fontSize="9">p_v (vapori reali)</text>

                      {condMarkers.length > 0 && <>
                        <circle cx={cL+278} cy={cB+40} r="5" fill="#ef4444" opacity="0.4" />
                        <text x={cL+287} y={cB+44} fill="rgba(239,68,68,0.85)" fontSize="9">Condens (p_v ≥ p_sat)</text>
                      </>}
                    </svg>
                  </>
                );
              })()}
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
                <ResultRow label={t("Debit la 50Pa",lang)} value={airInfiltrationCalc.q50} unit="m³/h" />
                <ResultRow label={t("Infiltrație naturală",lang)} value={airInfiltrationCalc.nInfNat} unit="h⁻¹" />
                <ResultRow label={t("Pierderi estimate",lang)} value={airInfiltrationCalc.lossKW} unit="kW" />
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
                <ResultRow label={t("Raport vitrat/util",lang)} value={naturalLightingCalc.ratio} unit="%" />
                <ResultRow label={t("Sup. vitrată totală",lang)} value={naturalLightingCalc.glazArea} unit="m²" />
                <ResultRow label={t("Reducere LENI posibilă",lang)} value={naturalLightingCalc.fDaylight} unit="%" status={naturalLightingCalc.fDaylight > 20 ? "ok" : null} />
              </div>
            </Card>
          )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-2">
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
