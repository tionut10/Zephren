import { useState, useEffect, useMemo } from "react";
import { T } from "../data/translations.js";
import { Select, Input, Card, ResultRow } from "./ui.jsx";
import { U_REF_GLAZING, getURefGlazingFor } from "../data/u-reference.js";
import { calcFsh } from "../calc/shading-factor.js";
// Sprint Catalog NEUTRAL 30 apr 2026: import GLAZING_DB + FRAME_DB extinse
// din building-catalog.js. v1.2 (15 mai 2026): 28 vitraje + 34 rame (+12 toc uși specifice)
// v1.3 (16 mai 2026): +5 vitraje uși parțial vitrate + +5 vitraje specializate (laminat/skylight/SSG/acustic/electrocromic)
// + filterFramesByCategory pentru filtrare automată pe categoria elementului
// + filtru doorSubtype chip + hint "ușă opacă" + getURefGlazingFor() corect per element.
import { GLAZING_DB, FRAME_DB, filterFramesByCategory } from "../data/building-catalog.js";

function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }

const ORIENTATIONS = ["N","NE","E","SE","S","SV","V","NV","Orizontal"];

// v1.3 — sub-tipuri uși pentru filtru chip secundar
const DOOR_SUBTYPES = [
  { id: "all",                label: "Toate",                labelEN: "All" },
  { id: "intrare-principala", label: "Intrare principală",   labelEN: "Main entrance" },
  { id: "antifoc",            label: "Antifoc EI30/EI60",    labelEN: "Fire-rated EI30/EI60" },
  { id: "blindata",           label: "Blindată RC3/RC4",     labelEN: "Armored RC3/RC4" },
  { id: "automata-glisanta",  label: "Automată glisantă",    labelEN: "Automatic sliding" },
  { id: "tehnica",            label: "Tehnică",              labelEN: "Technical" },
  { id: "comerciala",         label: "Comercială",           labelEN: "Commercial" },
];

/**
 * GlazingModal — editor for glazing elements (windows, glass doors)
 *
 * Props passed from parent scope:
 *   - element, onSave, onClose: standard modal props
 *   - lang: "RO" | "EN"
 *   - buildingCategory: building.category string (e.g. "RI","RC",...)
 */
// Inferă frameType din câmpul name/type (ex: "Termopan PVC …" → "PVC (5 camere)")
// v1.3 (16 mai 2026) — extension legacy mapper pentru import CPE cu rame uși:
//   oțel, blindată, antifoc, automată glisantă, multi-strat PHI, lemn masiv stejar.
function inferFrameType(base) {
  if (base.frameType && FRAME_DB.find(f => f.name === base.frameType)) return base.frameType;
  const s = ((base.name || "") + " " + (base.type || "")).toLowerCase();

  // Priority 1: uși cu sub-tip specific (mai specifice → primele)
  if (s.includes("blindat") || s.includes("blindată") || s.includes("rc3") || s.includes("rc4"))
    return "Toc blindat PIR + armătură oțel (uși securitate RC3/RC4)";
  if (s.includes("antifoc") || s.includes("ei30") || s.includes("ei60") || s.includes("ei90"))
    return "Toc oțel inox antifoc EI30/EI60 (uși tehnice)";
  if (s.includes("automat") || s.includes("glisant") || (s.includes("ușă") && s.includes("public")))
    return "Cadru ușă automată glisantă comercială";
  if (s.includes("passivhaus") || s.includes("phi") || s.includes("multi-strat") || s.includes("hibrid alu-lemn-pir"))
    return "Toc multi-strat hibrid PHI (lemn+alu+PIR)";

  // Priority 2: oțel — distincție pe baza calității izolației
  if (s.includes("oțel") || s.includes("otel") || s.includes("steel")) {
    if (s.includes("premium") || s.includes("ph") || s.includes("passivhaus") || s.includes("thermopro"))
      return "Toc oțel cu RT premium (uși Hörmann ThermoPro)";
    if (s.includes("rt complexă") || s.includes("rt complex") || s.includes("nzeb") || s.includes("44") || s.includes("pur"))
      return "Toc oțel cu RT complexă (uși nZEB)";
    if (s.includes("rt") || s.includes("rupere") || s.includes("16-24") || s.includes("poliamid"))
      return "Toc oțel cu RT simplă (uși 1990-2010)";
    return "Toc oțel galvanizat fără RT (uși industriale pre-1990)";
  }

  // Priority 3: lemn masiv pentru uși vechi (pre-1990) — distinge de lemn stratificat fereastră
  if (s.includes("ușă") && s.includes("lemn") && (s.includes("masiv") || s.includes("stejar") || s.includes("fag")))
    return "Toc lemn masiv stejar/fag (uși existente pre-1990)";

  // Priority 4: rame generale (legacy behavior)
  if (s.includes("pvc")) return "PVC (5 camere)";
  if (s.includes("curtain wall") || (s.includes("aluminiu") && (s.includes("rpt") || s.includes("rupere")))) return "Aluminiu cu RPT";
  if (s.includes("aluminiu")) return "Aluminiu fără RPT";
  if (s.includes("lemn-aluminiu") || (s.includes("lemn") && s.includes("aluminiu"))) return "Lemn-aluminiu";
  if (s.includes("lemn")) return "Lemn stratificat";
  return "";
}

// Inferă glazingType din câmpul legacy `type` (ex: "Dublu vitraj clasic" → "Dublu vitraj (4-12-4)")
function inferGlazingType(base) {
  if (base.glazingType && GLAZING_DB.find(g => g.name === base.glazingType)) return base.glazingType;
  const t = (base.type || "").toLowerCase();
  if (!t) return "";
  if (t.includes("triplu") && (t.includes("low-e") || t.includes("lowe") || t.includes("argon") || t.includes("2×"))) return "Triplu vitraj 2×Low-E";
  if (t.includes("triplu") && t.includes("low")) return "Triplu vitraj Low-E";
  if (t.includes("triplu")) return "Triplu vitraj";
  if (t.includes("dublu") && (t.includes("low-e") || t.includes("lowe"))) return "Dublu vitraj Low-E";
  if (t.includes("dublu") && (t.includes("termoiz") || t.includes("argon") || t.includes("1.6") || t.includes("izol"))) return "Dublu vitraj termoizolant";
  if (t.includes("dublu")) return "Dublu vitraj (4-12-4)";
  if (t.includes("simplu")) return "Simplu vitraj";
  return "";
}

export default function GlazingModal({ element, onSave, onClose, lang, buildingCategory }) {
    const [el, setEl] = useState(() => {
      const base = element || {
        name:"Fereastră nouă", orientation:"S", area:"", glazingType:"Dublu vitraj termoizolant",
        frameType:"PVC (5 camere)", frameRatio:"30", u:0, g:0, uFrame:0,
      };
      // Sprint 22 #15 — asigură shading default (Mc 001-2022 Anexa E)
      return {
        ...base,
        glazingType: inferGlazingType(base),
        frameType: inferFrameType(base),
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

    const selectedGlazing = GLAZING_DB.find(g => g.name === el.glazingType);
    const uGlazingVal = selectedGlazing?.u;
    const uFrameVal = FRAME_DB.find(f => f.name === el.frameType)?.u;
    const gEffective = parseFloat(el.g) || 0;

    // v1.2 (15 mai 2026): filtrează rame după categoria vitrajului selectat.
    // Window/skylight → toate ramele generice + window-specific
    // Door → toate ramele generice + cele 12 toc-uri uși specifice (RT oțel, blindate, antifoc, glisante, multi-strat PHI)
    const elementCategory = selectedGlazing?.elementCategory || "window";
    const isDoor = elementCategory === "door";
    const isOpaqueDoor = isDoor && gEffective <= 0.05;

    // v1.3 — filtru chip pe doorSubtype (numai pentru categoria "door")
    const [doorSubtypeFilter, setDoorSubtypeFilter] = useState("all");
    const FILTERED_FRAMES = useMemo(() => {
      const byCategory = filterFramesByCategory(elementCategory);
      if (!isDoor || doorSubtypeFilter === "all") return byCategory;
      return byCategory.filter(f => {
        // Rame fără doorSubtype = generale (acceptate la orice filtru sub-tip)
        if (!f.doorSubtype) return true;
        return f.doorSubtype === doorSubtypeFilter;
      });
    }, [elementCategory, doorSubtypeFilter, isDoor]);

    // v1.3 — U_max nZEB corect per element (Mc 001-2022 Tab 2.4/2.5/2.7)
    const uRef = getURefGlazingFor({
      elementCategory,
      buildingCategory,
      gValue: gEffective,
      scope: "nzeb",
    });
    const uVal = parseFloat(el.u) || 0;
    const uStatus = uVal <= uRef ? "ok" : uVal <= uRef + 0.20 ? "warn" : "fail";

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
              options={FILTERED_FRAMES.map(f=>f.name)} />
            <Input label={t("Fracție ramă",lang)} value={el.frameRatio} onChange={v => setEl(p=>({...p,frameRatio:v}))} type="number" unit="%" min="10" max="50" className="col-span-2" />
          </div>

          {/* v1.3 (16 mai 2026) — Filtru chip sub-tip ușă (numai când categoria este "door") */}
          {isDoor && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">
                {t("Filtru sub-tip ușă",lang)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DOOR_SUBTYPES.map(st => {
                  const active = doorSubtypeFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDoorSubtypeFilter(st.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-full transition ${
                        active
                          ? "bg-amber-500 text-black font-medium"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {lang === "EN" ? st.labelEN : st.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] opacity-50 mt-1.5">
                {FILTERED_FRAMES.length} {t("rame compatibile",lang)} ·
                {doorSubtypeFilter === "all"
                  ? ` ${t("toate sub-tipurile",lang)}`
                  : ` ${t("filtrat",lang)}: ${DOOR_SUBTYPES.find(s=>s.id===doorSubtypeFilter)?.label}`}
              </div>
            </div>
          )}

          {/* v1.3 — Hint ușă opacă (g=0): Mc 001-2022 §4.5 — aporturi solare ignorate */}
          {isOpaqueDoor && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-200">
              <div className="font-medium mb-1">ℹ️ {t("Ușă opacă (fără vitraj)",lang)}</div>
              <div className="opacity-80">
                {t("Factor solar g=0 — aporturi solare ignorate (Mc 001-2022 §4.5).",lang)}{" "}
                {t("Prag U'max nZEB: 1.80 W/(m²·K) pentru uși opace (Tab 2.5).",lang)}
              </div>
            </div>
          )}

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
            <ResultRow
              label={isOpaqueDoor ? "U'max ușă opacă (Mc 001-2022 Tab 2.5)" : isDoor ? "U'max ușă vitrată" : "U'max nZEB"}
              value={uRef.toFixed(2)}
              unit="W/(m²·K)"
            />
          </Card>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
        </div>
      </div>
    );
}
