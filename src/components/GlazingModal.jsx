import { useState, useEffect } from "react";
import { T } from "../data/translations.js";
import { Select, Input, Card, ResultRow } from "./ui.jsx";

function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }

const GLAZING_DB = [
  { name:"Simplu vitraj", u:5.80, g:0.85 },
  { name:"Dublu vitraj (4-12-4)", u:2.80, g:0.75 },
  { name:"Dublu vitraj termoizolant", u:1.60, g:0.65 },
  { name:"Dublu vitraj Low-E", u:1.10, g:0.50 },
  { name:"Triplu vitraj", u:0.90, g:0.50 },
  { name:"Triplu vitraj Low-E", u:0.70, g:0.45 },
  { name:"Triplu vitraj 2×Low-E", u:0.50, g:0.40 },
];

const FRAME_DB = [
  { name:"PVC (5 camere)", u:1.30 },
  { name:"PVC (6-7 camere)", u:1.10 },
  { name:"Lemn stratificat", u:1.40 },
  { name:"Aluminiu fără RPT", u:5.00 },
  { name:"Aluminiu cu RPT", u:2.00 },
  { name:"Lemn-aluminiu", u:1.20 },
];

const ORIENTATIONS = ["N","NE","E","SE","S","SV","V","NV","Orizontal"];

// Ferestre: nZEB rez 1.11, nZEB nerez 1.20, renovare 1.20, uși ext 1.30
const U_REF_GLAZING = { nzeb_res:1.11, nzeb_nres:1.20, renov:1.20, door:1.30 };

/**
 * GlazingModal — editor for glazing elements (windows, glass doors)
 *
 * Props passed from parent scope:
 *   - element, onSave, onClose: standard modal props
 *   - lang: "RO" | "EN"
 *   - buildingCategory: building.category string (e.g. "RI","RC",...)
 */
export default function GlazingModal({ element, onSave, onClose, lang, buildingCategory }) {
    const [el, setEl] = useState(element || {
      name:"Fereastră nouă", orientation:"S", area:"", glazingType:"Dublu vitraj termoizolant",
      frameType:"PVC (5 camere)", frameRatio:"30", u:0, g:0, uFrame:0
    });

    useEffect(() => {
      const gl = GLAZING_DB.find(g => g.name === el.glazingType);
      const fr = FRAME_DB.find(f => f.name === el.frameType);
      if (gl && fr) {
        const fRatio = (parseFloat(el.frameRatio) || 30) / 100;
        // #5 ψ_spacer per ISO 10077-1 — spacer perimeter thermal bridge
        const area = parseFloat(el.area) || 1;
        const aspect = Math.sqrt(area); // approximate square window
        const perimGlass = aspect > 0 ? 2 * (aspect + aspect * 0.7) : 4; // glass pane perimeter
        const psiSpacer = fr.name?.includes('aluminiu') ? 0.08 : 0.04; // aluminium vs thermoplastic
        const deltaU_spacer = area > 0 ? psiSpacer * perimGlass / area : 0;
        const uTotal = gl.u * (1 - fRatio) + fr.u * fRatio + deltaU_spacer;
        setEl(prev => ({...prev, u: uTotal.toFixed(2), g: (gl.g * (1 - fRatio)).toFixed(2), uFrame: fr.u}));
      }
    }, [el.glazingType, el.frameType, el.frameRatio]);

    const uRef = ["RI","RC","RA"].includes(buildingCategory) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
    const uVal = parseFloat(el.u) || 0;
    const uStatus = uVal <= uRef ? "ok" : uVal <= 1.40 ? "warn" : "fail";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Element vitrat</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Input label={t("Denumire",lang)} value={el.name} onChange={v => setEl(p=>({...p,name:v}))} className="col-span-2" />
            <Select label={t("Orientare",lang)} value={el.orientation} onChange={v => setEl(p=>({...p,orientation:v}))} options={ORIENTATIONS} />
            <Input label={t("Suprafață totală",lang)} value={el.area} onChange={v => setEl(p=>({...p,area:v}))} type="number" unit="m²" min="0" step="0.1" />
            <Select label={t("Tip vitraj",lang)} value={el.glazingType} onChange={v => setEl(p=>({...p,glazingType:v}))}
              options={GLAZING_DB.map(g=>g.name)} />
            <Select label={t("Tip ramă",lang)} value={el.frameType} onChange={v => setEl(p=>({...p,frameType:v}))}
              options={FRAME_DB.map(f=>f.name)} />
            <Input label={t("Fracție ramă",lang)} value={el.frameRatio} onChange={v => setEl(p=>({...p,frameRatio:v}))} type="number" unit="%" min="10" max="50" />
          </div>

          <Card title={t("Rezultate",lang)} className="mb-4">
            <ResultRow label="U vitraj" value={(GLAZING_DB.find(g=>g.name===el.glazingType)?.u || 0).toFixed(2)} unit="W/(m²·K)" />
            <ResultRow label="U ramă" value={(FRAME_DB.find(f=>f.name===el.frameType)?.u || 0).toFixed(2)} unit="W/(m²·K)" />
            <ResultRow label="U total fereastră" value={el.u} unit="W/(m²·K)" status={uStatus} />
            <ResultRow label="Factor solar g efectiv" value={el.g} />
            <ResultRow label="U'max nZEB" value={(["RI","RC","RA"].includes(buildingCategory) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres).toFixed(2)} unit="W/(m²·K)" />
          </Card>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
        </div>
      </div>
    );
}
