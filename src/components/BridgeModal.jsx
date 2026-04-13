import { useState } from "react";
import THERMAL_BRIDGES_DB from "../data/thermal-bridges.json";
import { Input, Card, ResultRow } from "./ui.jsx";
import { T } from "../data/translations.js";

export default function BridgeModal({ element, onSave, onClose, lang }) {
  const t = (key) => lang === "EN" && T[key]?.EN ? T[key].EN : key;
  const [el, setEl] = useState(element || { name:"", cat:"", psi:"", length:"", desc:"" });
  const [bridgeSearch, setBridgeSearch] = useState("");
  const [showList, setShowList] = useState(false);

  const filtered = bridgeSearch.length > 1
    ? THERMAL_BRIDGES_DB.filter(b => b.name.toLowerCase().includes(bridgeSearch.toLowerCase()) || b.cat.toLowerCase().includes(bridgeSearch.toLowerCase()))
    : THERMAL_BRIDGES_DB;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Punte termică</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="mb-4" style={{position:"relative",zIndex:20}}>
          <Input label={t("Caută tip punte termică")} value={bridgeSearch} onChange={v => { setBridgeSearch(v); setShowList(true); }} placeholder="ex: balcon, fereastră, planșeu..." />
          {showList && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"4px",background:"#1e1e38",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",maxHeight:"200px",overflowY:"auto",zIndex:30,boxShadow:"0 10px 40px rgba(0,0,0,0.8)"}}>
              {filtered.map((b, i) => (
                <button key={i} onClick={() => { setEl({name:b.name, cat:b.cat, psi:b.psi.toString(), length:el.length, desc:b.desc}); setShowList(false); setBridgeSearch(b.name); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex justify-between border-b border-white/5">
                  <span><span className="opacity-40">{b.cat} ›</span> {b.name}</span>
                  <span className="opacity-50">Ψ = {b.psi}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{position:"relative",zIndex:10}}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Input label={t("Ψ (coeficient liniar)")} value={el.psi} onChange={v => setEl(p=>({...p,psi:v}))} type="number" unit="W/(m·K)" step="0.01" />
            <Input label={t("Lungime")} value={el.length} onChange={v => setEl(p=>({...p,length:v}))} type="number" unit="m" min="0" step="0.1" />
          </div>

          {el.psi && el.length && (
            <Card title={t("Pierdere liniară")} className="mb-4">
              <ResultRow label="Ψ × l" value={((parseFloat(el.psi)||0) * (parseFloat(el.length)||0)).toFixed(2)} unit="W/K" />
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
        </div>
      </div>
    </div>
  );
}
