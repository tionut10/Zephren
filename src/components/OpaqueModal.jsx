import { useState } from "react";
import MATERIALS_DB from "../data/materials.json";
import { glaserCheck } from "../calc/glaser.js";
import { T } from "../data/translations.js";
import { cn, Select, Input, Card, ResultRow } from "./ui.jsx";
import { U_REF_NZEB_RES, U_REF_NZEB_NRES, getURefNZEB } from "../data/u-reference.js";
import { FASTENER_TYPES } from "../calc/opaque.js";
import { THETA_U_DEFAULT, calcDynamicTau } from "../calc/tau-dynamic.js";
import { checkFireSafety, getRequiredFireClass } from "../calc/fire-safety.js";

function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }

// These constants are duplicated here from the main file to keep the component self-contained.
// They are small and stable (normative references).
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

const ORIENTATIONS = ["N","NE","E","SE","S","SV","V","NV","Orizontal"];

/**
 * OpaqueModal — editor for opaque building elements (walls, slabs, etc.)
 *
 * Props passed from parent scope:
 *   - element, onSave, onClose: standard modal props
 *   - lang: "RO" | "EN"
 *   - buildingCategory: building.category string (e.g. "RI","RC",...)
 *   - heating: { theta_int, ... }
 *   - selectedClimate: { theta_e, ... }
 *   - calcOpaqueR: (layers, elementType) => { r_layers, r_total, u, ... }
 *   - constructionSolutions: CONSTRUCTION_SOLUTIONS array
 */
export default function OpaqueModal({ element, onSave, onClose, lang, buildingCategory, building, heating, selectedClimate, calcOpaqueR, constructionSolutions }) {
    const [el, setEl] = useState(() => {
      const base = element || {
        name:"Element nou", type:"PE", orientation:"S", area:"",
        layers:[{ material:"", thickness:"", lambda:0, rho:0, matName:"" }],
      };
      // Sprint 22 #1 — asigură fastener default pe elemente preexistente (ΔU'' ISO 6946 Annex F)
      return { ...base, fastener: base.fastener || { type: "default", n_f: "" } };
    });
    const [matSearch, setMatSearch] = useState("");
    const [activeLayerIdx, setActiveLayerIdx] = useState(null);

    const filteredMats = matSearch.length > 1
      ? MATERIALS_DB.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()) || m.cat.toLowerCase().includes(matSearch.toLowerCase()))
      : [];

    const addLayer = () => setEl(prev => ({...prev, layers:[...prev.layers, {material:"",thickness:"",lambda:0,rho:0,matName:""}]}));
    const removeLayer = idx => setEl(prev => ({...prev, layers:prev.layers.filter((_,i)=>i!==idx)}));
    const updateLayer = (idx, key, val) => setEl(prev => {
      const layers = [...prev.layers];
      layers[idx] = {...layers[idx], [key]:val};
      return {...prev, layers};
    });

    // Fix D3 (envelope_hub_design.md, 14.04.2026):
    // selectMaterial propaga doar {material, lambda, rho, matName} — aruncând
    // câmpurile mu (permeabilitate vapori, critic pentru Glaser), cp (căldură
    // specifică, pentru inerție termică) și src (normativă sursă). Rezolvăm
    // printr-un singur setEl atomic care propagă TOATE câmpurile utile din
    // materials.json. Non-destructiv: valorile lipsă rămân 0/"".
    const selectMaterial = (idx, mat) => {
      setEl(prev => {
        const layers = [...prev.layers];
        layers[idx] = {
          ...layers[idx],
          material: mat.name,
          matName:  mat.name,
          lambda:   mat.lambda,
          rho:      mat.rho,
          // câmpuri propagate de la D3:
          mu:       mat.mu !== undefined ? mat.mu : (layers[idx].mu || 0),
          cp:       mat.cp !== undefined ? mat.cp : (layers[idx].cp || 0),
          src:      mat.src || layers[idx].src || "",
        };
        return { ...prev, layers };
      });
      setActiveLayerIdx(null);
      setMatSearch("");
    };

    const { r_layers, r_total, u, u_base, deltaU, deltaU_method, fastenerLabel } = calcOpaqueR(el.layers, el.type, el.fastener);
    const elType = ELEMENT_TYPES.find(t => t.id === el.type);
    const uRef = getURefNZEB(buildingCategory, el.type);
    const uStatus = uRef ? (u <= uRef ? "ok" : u <= uRef * 1.3 ? "warn" : "fail") : null;

    // Sprint 22 #1 — detectează dacă există strat izolant (λ < 0.06) pentru a afișa UI-ul de fixări
    const hasInsulation = el.layers.some(l => (parseFloat(l.lambda) || 1) < 0.06);
    const fastenerCfg = FASTENER_TYPES[el.fastener?.type] || FASTENER_TYPES.default;

    // Sprint 22 #17 — Verificare siguranță la foc (P118/2013 + P118/3-2015)
    // Aplicabil pe PE (perete exterior) unde izolația e expusă la foc prin fațadă.
    const fireHeight = parseFloat(building?.heightBuilding) || 0;
    const fireCheck = el.type === "PE" && el.layers.length > 0
      ? checkFireSafety(el.layers, fireHeight)
      : null;

    // Sprint 22 #3 — τ dinamic pentru spații neîncălzite (PP/PB/PS/PR)
    const isUnheatedAdjType = ["PP", "PB", "PS", "PR"].includes(el.type);
    const thetaIDefault = parseFloat(heating?.theta_int) || 20;
    const thetaEDefault = selectedClimate?.theta_e ?? -15;
    const thetaUOverride = el.theta_u;
    const hasThetaUOverride = thetaUOverride !== undefined && thetaUOverride !== null && thetaUOverride !== "" && Number.isFinite(parseFloat(thetaUOverride));
    const effectiveThetaU = hasThetaUOverride ? parseFloat(thetaUOverride) : THETA_U_DEFAULT[el.type];
    const tauDynamic = effectiveThetaU !== undefined
      ? calcDynamicTau(thetaIDefault, effectiveThetaU, thetaEDefault)
      : (elType?.tau ?? 1);

    const CONSTRUCTION_SOLUTIONS = constructionSolutions || [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Element opac</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Input label={t("Denumire",lang)} value={el.name} onChange={v => setEl(p=>({...p,name:v}))} className="col-span-2" />
            <Select label={t("Tip element",lang)} value={el.type} onChange={v => setEl(p=>({...p,type:v}))}
              options={ELEMENT_TYPES.map(t=>({value:t.id,label:t.label}))} />
            <Select label={t("Orientare",lang)} value={el.orientation} onChange={v => setEl(p=>({...p,orientation:v}))}
              options={ORIENTATIONS} />
            <Input label={t("Suprafață",lang)} value={el.area} onChange={v => setEl(p=>({...p,area:v}))} type="number" unit="m²" min="0" step="0.1" />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">Straturi constructive (ext → int)</span>
<div className="flex gap-2"><button onClick={addLayer} className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30 transition-colors">+ Strat</button><select onChange={function(e){var sol=CONSTRUCTION_SOLUTIONS.find(function(s){return s.id===e.target.value});if(sol){setEl(function(p){return Object.assign({},p,{name:sol.name,type:sol.type,layers:sol.layers.map(function(l){return Object.assign({},l)})})});e.target.value="";}}} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-amber-400"><option value="">Soluții tip...</option>{CONSTRUCTION_SOLUTIONS.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>})}</select></div>
            </div>

            {el.layers.map((layer, idx) => (
              <div key={idx} className={`border rounded-lg p-3 mb-2 ${idx === 0 ? "bg-blue-500/[0.04] border-blue-500/25" : idx === el.layers.length - 1 ? "bg-green-500/[0.04] border-green-500/25" : "bg-white/[0.03] border-white/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5 mr-1">{idx > 0 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx-1];ls[idx-1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▲</button>}{idx < el.layers.length-1 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx+1];ls[idx+1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▼</button>}</div>
                  <span className="text-xs opacity-30 w-5">{idx+1}.</span>
                  {idx === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold shrink-0">EXT</span>}
                  {idx === el.layers.length - 1 && idx !== 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-semibold shrink-0">INT</span>}
                  <div className="flex-1 relative">
                    <input value={layer.matName || ""} placeholder="Caută material..."
                      onChange={e => { updateLayer(idx, "matName", e.target.value); setMatSearch(e.target.value); setActiveLayerIdx(idx); }}
                      onFocus={() => setActiveLayerIdx(idx)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500/50" />
                    {activeLayerIdx === idx && filteredMats.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#1e1e38] border border-white/10 rounded-lg max-h-48 overflow-y-auto shadow-2xl">
                        {filteredMats.map((m, mi) => (
                          <button key={mi} onClick={() => selectMaterial(idx, m)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex justify-between items-center border-b border-white/5 last:border-0">
                            <span><span className="opacity-40">{m.cat} ›</span> {m.name}</span>
                            <span className="opacity-40">λ={m.lambda}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" value={layer.thickness} placeholder="mm"
                    onChange={e => updateLayer(idx, "thickness", e.target.value)}
                    className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50" min="0" step="1" />
                  <span className="text-xs opacity-30">mm</span>
                  <input type="number" value={layer.lambda} placeholder="λ"
                    onChange={e => updateLayer(idx, "lambda", parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50" min="0" step="0.001" />
                  <span className="text-xs opacity-30">W/mK</span>
                  {el.layers.length > 1 && (
                    <button onClick={() => removeLayer(idx)} className="text-red-400/50 hover:text-red-400 text-sm">✕</button>
                  )}
                </div>
                {layer.lambda > 0 && parseFloat(layer.thickness) > 0 && (
                  <div className="ml-7 text-xs opacity-40">
                    R = {((parseFloat(layer.thickness)/1000) / layer.lambda).toFixed(3)} m²·K/W
                    {" · "}δ = {layer.thickness} mm
                  </div>
                )}
              </div>
            ))}
          </div>


          {/* Sprint 22 #1 — Fixare mecanică izolație (ISO 6946:2017 Annex F + Mc 001-2022 Tabel 2.19) */}
          {hasInsulation && (
            <Card title={t("Fixare mecanică a izolației (ΔU″)",lang)} className="mb-4">
              <div className="text-[11px] opacity-60 mb-3">
                Dibluri / conectori metalici străbat stratul izolant și creează o punte termică distribuită.
                ΔU″ se adaugă la U conform ISO 6946:2017 Annex F.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label={t("Tip fixare",lang)}
                  value={el.fastener?.type || "default"}
                  onChange={v => setEl(p => ({...p, fastener: {...(p.fastener||{}), type: v}}))}
                  options={Object.entries(FASTENER_TYPES).map(([k,v]) => ({ value: k, label: v.label }))}
                />
                <Input
                  label={t("Număr fixări",lang)}
                  value={el.fastener?.n_f ?? ""}
                  onChange={v => setEl(p => ({...p, fastener: {...(p.fastener||{}), n_f: v}}))}
                  type="number"
                  unit="buc/m²"
                  min="0"
                  step="0.5"
                  placeholder={String(fastenerCfg.n_f_default)}
                />
              </div>
              <div className="mt-2 text-[10px] opacity-50">
                α = {fastenerCfg.alpha} · λ_f = {fastenerCfg.lambda_f} W/(m·K) · A_f = {(fastenerCfg.A_f * 1e6).toFixed(1)} mm²
                · n_f default = {fastenerCfg.n_f_default} buc/m²
              </div>
              {deltaU > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
                    ΔU″ = {deltaU.toFixed(3)} W/(m²·K)
                  </span>
                  <span className="opacity-50">{deltaU_method}</span>
                </div>
              )}
            </Card>
          )}

          {/* Sprint 22 #17 — Verificare siguranță la foc (P118/2013 + P118/3-2015) */}
          {fireCheck && (
            <Card title={t("Siguranță la foc (P118/2013)",lang)} className="mb-4">
              <div className={
                "rounded-lg p-3 text-xs border " +
                (fireCheck.verdict === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  : fireCheck.verdict === "warn"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-red-500/10 border-red-500/30 text-red-200")
              }>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">
                    {fireCheck.verdict === "ok" ? "✓ OK" : fireCheck.verdict === "warn" ? "⚠ Verificați" : "✗ NECONFORM"}
                  </span>
                  <span className="opacity-70">— {fireCheck.message}</span>
                </div>
                <div className="opacity-70 mt-1">
                  Înălțime clădire: {fireHeight > 0 ? `${fireHeight.toFixed(1)} m` : "(nesetat → ≤11m)"} ·
                  Cerință: <b>{fireCheck.requiredClass}</b> · {fireCheck.ruleRef}
                </div>
              </div>
              {fireCheck.layerResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {fireCheck.layerResults.map((lr, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white/[0.02] px-2 py-1 rounded">
                      <span className="opacity-70">{lr.name}</span>
                      <span className={
                        "font-medium " +
                        (lr.status === "ok" ? "text-emerald-400" : lr.status === "warn" ? "text-amber-400" : "text-red-400")
                      }>
                        {lr.fire_class}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Secțiune transversală strat-cu-strat */}
          {el.layers.length > 0 && (
            <Card title={t("Secțiune transversală",lang)} className="mb-4">
              {(() => {
                const SLAB_TYPES = ["PT","PP","PB","PI","PL","SE"];
                const SLAB_TOP_INT = ["PB","PL"]; // camera deasupra → INT sus, EXT jos
                const isSlab = SLAB_TYPES.includes(el.type);
                const catColors = {"Zidărie":"#b0b0b0","Betoane":"#808080","Termoizolații":"#fdd835","Finisaje":"#d4c4a8","Hidroizolații":"#333","Lemn":"#a1887f","Metale":"#90a4ae","Altele":"#e0e0e0"};
                const totalD = el.layers.reduce((s,l) => s + (parseFloat(l.thickness)||0), 0);
                if (totalD <= 0) return <div className="text-xs opacity-30 py-4 text-center">Introdu grosimi pentru previzualizare</div>;
                const svgEls = [];

                if (isSlab) {
                  // Layout vertical — benzi orizontale de sus în jos
                  const isTopInt = SLAB_TOP_INT.includes(el.type);
                  const isPi = el.type === "PI";
                  const displayLayers = isTopInt ? [...el.layers].reverse() : el.layers;
                  const topLabel = isPi ? "INT" : isTopInt ? "INT" : "EXT";
                  const botLabel = isPi ? "INT" : isTopInt ? "EXT" : "INT";
                  const topColor = topLabel === "INT" ? "#4caf50" : "#2196f3";
                  const botColor = botLabel === "INT" ? "#4caf50" : "#2196f3";
                  svgEls.push(<text key="lbl-top" x="150" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill={topColor}>{topLabel}</text>);
                  svgEls.push(<text key="lbl-bot" x="150" y="128" textAnchor="middle" fontSize="8" fontWeight="bold" fill={botColor}>{botLabel}</text>);
                  let y = 14;
                  const maxH = 106;
                  displayLayers.forEach((l, idx) => {
                    const d = parseFloat(l.thickness) || 0;
                    const h = Math.max(3, (d / totalD) * maxH);
                    const mat = MATERIALS_DB.find(m => m.name === l.material);
                    const color = mat ? (catColors[mat.cat] || "#999") : "#999";
                    svgEls.push(<rect key={"r"+idx} x={40} y={y} width={220} height={h} fill={color} stroke="#555" strokeWidth="0.5"/>);
                    if (h > 10) svgEls.push(<text key={"t"+idx} x={150} y={y + h/2 + 2.5} textAnchor="middle" fontSize="7" fill="#333">{(l.matName||l.material||"?").substring(0,30)}</text>);
                    svgEls.push(<text key={"d"+idx} x={268} y={y + h/2 + 2.5} textAnchor="start" fontSize="6" fill="#888">{d}mm</text>);
                    y += h;
                  });
                  return <svg viewBox="0 0 300 132" width="100%" height="120">{svgEls}</svg>;
                }

                // Layout orizontal — benzi verticale de la EXT (stânga) la INT (dreapta)
                svgEls.push(<text key="lbl-ext" x="10" y="65" fontSize="8" fontWeight="bold" fill="#2196f3">EXT</text>);
                svgEls.push(<text key="lbl-int" x="275" y="65" fontSize="8" fontWeight="bold" fill="#4caf50">INT</text>);
                let x = 40;
                const maxW = 220;
                el.layers.forEach((l, idx) => {
                  const d = parseFloat(l.thickness) || 0;
                  const w = Math.max(2, (d / totalD) * maxW);
                  const mat = MATERIALS_DB.find(m => m.name === l.material);
                  const color = mat ? (catColors[mat.cat] || "#999") : "#999";
                  svgEls.push(<rect key={"r"+idx} x={x} y={15} width={w} height={80} fill={color} stroke="#555" strokeWidth="0.5"/>);
                  if (w > 15) svgEls.push(<text key={"t"+idx} x={x+w/2} y={60} textAnchor="middle" fontSize="6" fill="#333" transform={"rotate(-90,"+(x+w/2)+",60)"}>{(l.matName||l.material||"?").substring(0,15)}</text>);
                  svgEls.push(<text key={"d"+idx} x={x+w/2} y={105} textAnchor="middle" fontSize="6" fill="#888">{d}mm</text>);
                  x += w;
                });
                return <svg viewBox="0 0 300 120" width="100%" height="100">{svgEls}</svg>;
              })()}
            </Card>
          )}

          {/* Sprint 22 #3 — θ_u spațiu adiacent pentru elemente PP/PB/PS/PR (Mc 001-2022 Anexa A.9.3) */}
          {isUnheatedAdjType && (
            <Card title={t("Spațiu adiacent neîncălzit (τ dinamic)",lang)} className="mb-4">
              <div className="text-[11px] opacity-60 mb-3">
                τ = (θ_i − θ_u) / (θ_i − θ_e) — Mc 001-2022 Anexa A.9.3.
                Default {el.type}: θ_u = {THETA_U_DEFAULT[el.type]}°C.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("θ_u spațiu adiacent (°C, opțional)",lang)}
                  value={el.theta_u ?? ""}
                  onChange={v => setEl(p => ({...p, theta_u: v}))}
                  type="number"
                  unit="°C"
                  step="0.5"
                  placeholder={String(THETA_U_DEFAULT[el.type])}
                />
                <div className="flex flex-col gap-1 text-[11px]">
                  <div>θ_i = {thetaIDefault.toFixed(1)} °C · θ_e = {thetaEDefault.toFixed(1)} °C</div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">τ calculat =</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                      {tauDynamic.toFixed(3)}
                    </span>
                    <span className="opacity-40">
                      {hasThetaUOverride ? "(override)" : (elType?.tau !== undefined ? `static = ${elType.tau}` : "")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          <Card title={t("Rezultate calcul",lang)} className="mb-4">
            <ResultRow label="R straturi" value={r_layers.toFixed(3)} unit="m²·K/W" />
            <ResultRow label={`R_si = ${elType?.rsi || 0} + R_se = ${elType?.rse || 0}`} value={(elType ? elType.rsi + elType.rse : 0).toFixed(2)} unit="m²·K/W" />
            <ResultRow label="R' total" value={r_total.toFixed(3)} unit="m²·K/W" />
            {hasInsulation && u_base !== undefined && (
              <ResultRow label="U_base (fără ΔU″)" value={u_base.toFixed(3)} unit="W/(m²·K)" />
            )}
            {hasInsulation && deltaU > 0 && (
              <ResultRow label={`ΔU″ (${fastenerLabel || "fixare"})`} value={deltaU.toFixed(3)} unit="W/(m²·K)" />
            )}
            <ResultRow label="U' (transmitanță)" value={u.toFixed(3)} unit="W/(m²·K)" status={uStatus} />
            {uRef && <ResultRow label={`U'max nZEB (${el.type})`} value={uRef.toFixed(2)} unit="W/(m²·K)" />}
            {(() => { var gc = glaserCheck(el.layers, parseFloat(heating?.theta_int)||20, selectedClimate?.theta_e||-15); if (!gc) return null; return <ResultRow label="Verificare condensare (Glaser)" value={gc.hasCondensation ? "RISC! ~" + gc.gc + " g/m² sezon" : "OK — fără condensare"} status={gc.hasCondensation ? "fail" : "ok"} />; })()}
          </Card>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }}
              className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors">
              Salvează
            </button>
          </div>
        </div>
      </div>
    );
}
