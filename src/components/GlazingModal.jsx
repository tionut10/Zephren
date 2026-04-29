import { useState, useEffect } from "react";
import { T } from "../data/translations.js";
import { Select, Input, Card, ResultRow } from "./ui.jsx";
import { U_REF_GLAZING } from "../data/u-reference.js";
import { calcFsh } from "../calc/shading-factor.js";

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

/**
 * GlazingModal — editor for glazing elements (windows, glass doors)
 *
 * Props passed from parent scope:
 *   - element, onSave, onClose: standard modal props
 *   - lang: "RO" | "EN"
 *   - buildingCategory: building.category string (e.g. "RI","RC",...)
 */
export default function GlazingModal({ element, onSave, onClose, lang, buildingCategory }) {
    const [el, setEl] = useState(() => {
      const base = element || {
        name:"Fereastră nouă", orientation:"S", area:"", glazingType:"Dublu vitraj termoizolant",
        frameType:"PVC (5 camere)", frameRatio:"30", u:0, g:0, uFrame:0,
      };
      // Sprint 22 #15 — asigură shading default (Mc 001-2022 Anexa E)
      return {
        ...base,
        shading: base.shading || { overhang_cm: "", fin_cm: "", hasMobile: false },
      };
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
    const uGlazingVal = GLAZING_DB.find(g => g.name === el.glazingType)?.u;
    const uFrameVal = FRAME_DB.find(f => f.name === el.frameType)?.u;

    // Sprint 22 #15 — F_sh protecție solară (Mc 001-2022 Anexa E)
    const shadingRes = calcFsh(el);

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
            <Input label={t("Fracție ramă",lang)} value={el.frameRatio} onChange={v => setEl(p=>({...p,frameRatio:v}))} type="number" unit="%" min="10" max="50" className="col-span-2" />
          </div>

          {/* Sprint 22 #15 — Protecție solară (Mc 001-2022 Anexa E) */}
          <Card title={t("Protecție solară (F_sh)",lang)} className="mb-4">
            <div className="text-[11px] opacity-60 mb-3">
              F_sh = F_h × F_f × F_mobile. Reduce aporturile solare conform Mc 001-2022 §10.4.2.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Input
                label={t("Streașină",lang)}
                value={el.shading?.overhang_cm ?? ""}
                onChange={v => setEl(p => ({...p, shading: {...(p.shading||{}), overhang_cm: v}}))}
                type="number" unit="cm" min="0" step="5"
                placeholder="0"
              />
              <Input
                label={t("Aripi laterale",lang)}
                value={el.shading?.fin_cm ?? ""}
                onChange={v => setEl(p => ({...p, shading: {...(p.shading||{}), fin_cm: v}}))}
                type="number" unit="cm" min="0" step="5"
                placeholder="0"
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={!!el.shading?.hasMobile}
                  onChange={e => setEl(p => ({...p, shading: {...(p.shading||{}), hasMobile: e.target.checked}}))}
                  className="accent-amber-500"
                />
                <span>{t("Obloane / rulouri",lang)}</span>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] flex-wrap">
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
                F_sh = {shadingRes.fsh.toFixed(3)}
              </span>
              <span className="opacity-50">
                F_h={shadingRes.fh.toFixed(2)} · F_f={shadingRes.ff.toFixed(2)} · F_m={shadingRes.fm.toFixed(2)}
              </span>
              <span className="opacity-40">(H≈{shadingRes.dims.height.toFixed(2)}m · W≈{shadingRes.dims.width.toFixed(2)}m)</span>
            </div>
          </Card>

          <Card title={t("Rezultate",lang)} className="mb-4">
            <ResultRow label="U vitraj" value={uGlazingVal != null ? uGlazingVal.toFixed(2) : "—"} unit={uGlazingVal != null ? "W/(m²·K)" : ""} />
            <ResultRow label="U ramă" value={uFrameVal != null ? uFrameVal.toFixed(2) : "—"} unit={uFrameVal != null ? "W/(m²·K)" : ""} />
            <ResultRow label="U total fereastră" value={el.u} unit="W/(m²·K)" status={uStatus} />
            <ResultRow label="Factor solar g efectiv" value={el.g} />
            <ResultRow label="F_sh protecție solară" value={shadingRes.fsh.toFixed(3)} />
            <ResultRow label="g × F_sh (efectiv cu umbrire)" value={((parseFloat(el.g)||0) * shadingRes.fsh).toFixed(3)} />
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
