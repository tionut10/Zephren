import { useState } from "react";
import MATERIALS_DB from "../data/materials.json";
import { glaserCheck } from "../calc/glaser.js";
import { T } from "../data/translations.js";
import { cn, Select, Input, Card, ResultRow } from "./ui.jsx";

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

// U_REF tables from Mc 001-2022
const U_REF_NZEB_RES = { PE:0.25, PR:0.67, PS:0.29, PT:0.15, PP:0.15, PB:0.29, PI:null, PL:0.20, SE:0.20 };
const U_REF_NZEB_NRES = { PE:0.33, PR:0.80, PS:0.35, PT:0.17, PP:0.17, PB:0.35, PI:null, PL:0.22, SE:0.22 };

function getURefNZEB(category, elementType) {
  const isRes = ["RI","RC","RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[elementType] !== undefined ? ref[elementType] : null;
}

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
export default function OpaqueModal({ element, onSave, onClose, lang, buildingCategory, heating, selectedClimate, calcOpaqueR, constructionSolutions }) {
    const [el, setEl] = useState(element || {
      name:"Element nou", type:"PE", orientation:"S", area:"",
      layers:[{ material:"", thickness:"", lambda:0, rho:0, matName:"" }]
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

    const selectMaterial = (idx, mat) => {
      updateLayer(idx, "material", mat.name);
      updateLayer(idx, "lambda", mat.lambda);
      updateLayer(idx, "rho", mat.rho);
      updateLayer(idx, "matName", mat.name);
      setActiveLayerIdx(null);
      setMatSearch("");
    };

    const { r_layers, r_total, u } = calcOpaqueR(el.layers, el.type);
    const elType = ELEMENT_TYPES.find(t => t.id === el.type);
    const uRef = getURefNZEB(buildingCategory, el.type);
    const uStatus = uRef ? (u <= uRef ? "ok" : u <= uRef * 1.3 ? "warn" : "fail") : null;

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
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">Straturi constructive (int → ext)</span>
<div className="flex gap-2"><button onClick={addLayer} className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30 transition-colors">+ Strat</button><select onChange={function(e){var sol=CONSTRUCTION_SOLUTIONS.find(function(s){return s.id===e.target.value});if(sol){setEl(function(p){return Object.assign({},p,{name:sol.name,type:sol.type,layers:sol.layers.map(function(l){return Object.assign({},l)})})});e.target.value="";}}} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-amber-400"><option value="">Soluții tip...</option>{CONSTRUCTION_SOLUTIONS.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>})}</select></div>
            </div>

            {el.layers.map((layer, idx) => (
              <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5 mr-1">{idx > 0 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx-1];ls[idx-1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▲</button>}{idx < el.layers.length-1 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx+1];ls[idx+1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▼</button>}</div><span className="text-xs opacity-30 w-5">{idx+1}.</span>
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


          {/* Secțiune transversală strat-cu-strat */}
          {el.layers.length > 0 && (
            <Card title={t("Secțiune transversală",lang)} className="mb-4">
              <svg viewBox="0 0 300 120" width="100%" height="100">
                {(() => {
                  var totalD = el.layers.reduce(function(s,l){return s+(parseFloat(l.thickness)||0);},0);
                  if (totalD <= 0) return null;
                  var x = 40, maxW = 220, els = [];
                  var catColors = {"Zidărie":"#b0b0b0","Betoane":"#808080","Termoizolații":"#fdd835","Finisaje":"#d4c4a8","Hidroizolații":"#333","Lemn":"#a1887f","Metale":"#90a4ae","Altele":"#e0e0e0"};
                  els.push(<text key="int" x="10" y="65" fontSize="8" fill="#4caf50">INT</text>);
                  els.push(<text key="ext" x="275" y="65" fontSize="8" fill="#2196f3">EXT</text>);
                  el.layers.forEach(function(l, idx) {
                    var d = parseFloat(l.thickness) || 0;
                    var w = (d / totalD) * maxW;
                    var mat = MATERIALS_DB.find(function(m){return m.name === l.material;});
                    var color = mat ? (catColors[mat.cat] || "#999") : "#999";
                    els.push(<rect key={"r"+idx} x={x} y={15} width={Math.max(2,w)} height={80} fill={color} stroke="#555" strokeWidth="0.5"/>);
                    if (w > 15) els.push(<text key={"t"+idx} x={x+w/2} y={60} textAnchor="middle" fontSize="6" fill="#333" transform={"rotate(-90,"+(x+w/2)+",60)"}>{(l.matName||l.material||"?").substring(0,15)}</text>);
                    els.push(<text key={"d"+idx} x={x+w/2} y={105} textAnchor="middle" fontSize="6" fill="#888">{d}mm</text>);
                    x += w;
                  });
                  return els;
                })()}
              </svg>
            </Card>
          )}

          {/* Results */}
          <Card title={t("Rezultate calcul",lang)} className="mb-4">
            <ResultRow label="R straturi" value={r_layers.toFixed(3)} unit="m²·K/W" />
            <ResultRow label={`R_si = ${elType?.rsi || 0} + R_se = ${elType?.rse || 0}`} value={(elType ? elType.rsi + elType.rse : 0).toFixed(2)} unit="m²·K/W" />
            <ResultRow label="R' total" value={r_total.toFixed(3)} unit="m²·K/W" />
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
