/**
 * WizardOpaque — „Adaugă element opac în 3 pași" — v3 TEHNIC
 *
 * Îmbunătățiri vizuale v3:
 *   - Diagramă secțiune transversală EXT→INT (LayerStack) cu culori per categorie
 *   - Tabel R detaliat cu Rse / Rsi / %R per strat (ISO 6946:2017)
 *   - ConformityGauge — bară U vs U_ref cu zona nZEB marcată
 *   - Badge-uri normative ISO 6946:2017 · Mc 001-2022
 *   - Tipografie font-mono consistentă pentru toate valorile tehnice
 *   - U_ref nZEB afișat pe cardurile tip element
 */

import { useState, useMemo, useEffect } from "react";
import MATERIALS_DB from "../../data/materials.json";
import { Select, Input, cn } from "../ui.jsx";
import SuggestionPanel from "../SuggestionPanel.jsx";
import { suggestForOpaqueElement } from "../../data/suggestions-catalog.js";
import {
  ELEMENT_TYPES_WIZARD,
  LAYER_PRESETS,
  getURefNZEB,
  buildLayerFromMaterialName,
} from "./utils/wizardOpaqueCalc.js";

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV", "Orizontal"];

// ── Culori per categorie material ─────────────────────────────────────────────
function getMatColors(matName = "") {
  const n = matName.toLowerCase();
  if (/eps|xps|vat[ăa]|izola|poliur|pir|puf|mineral|rockwool|vată/.test(n))
    return { bg: "bg-yellow-500/15", border: "border-yellow-600/40", dot: "bg-yellow-400", tag: "IZOL" };
  if (/bca|cărăm|caramid|porotherm|ytong/.test(n))
    return { bg: "bg-orange-500/15", border: "border-orange-600/40", dot: "bg-orange-400", tag: "ZID" };
  if (/beton|armatur|prefabric|c20|c25/.test(n))
    return { bg: "bg-slate-500/15", border: "border-slate-500/40", dot: "bg-slate-400", tag: "BC" };
  if (/tencui|placare|gips|mortar|ipsos/.test(n))
    return { bg: "bg-stone-400/10", border: "border-stone-500/30", dot: "bg-stone-400", tag: "TEN" };
  if (/lemn|par|plywood|osb|brad|stejar|pin/.test(n))
    return { bg: "bg-amber-700/15", border: "border-amber-700/40", dot: "bg-amber-600", tag: "LEMN" };
  if (/metal|alum|otel|zinc|cupru|tablă/.test(n))
    return { bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400", tag: "MET" };
  return { bg: "bg-slate-600/10", border: "border-slate-600/30", dot: "bg-slate-500", tag: "ALT" };
}

// ── TechBadge ─────────────────────────────────────────────────────────────────
function TechBadge({ label }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-600/50 bg-slate-800/70 text-[9px] font-mono text-slate-500 tracking-wide">
      {label}
    </span>
  );
}

// ── StepIndicator tehnic ──────────────────────────────────────────────────────
function StepIndicator({ current, total, labels, sublabels }) {
  return (
    <div className="flex items-start mb-5">
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 === current;
        const done   = i + 1 < current;
        return (
          <div key={i} className="flex items-start flex-1">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold font-mono transition-colors",
                active ? "border-violet-500 bg-violet-500/15 text-violet-300"
                       : done   ? "border-slate-600 bg-slate-800/80 text-slate-400"
                                : "border-slate-700 bg-transparent text-slate-700"
              )}>
                {done ? "✓" : i + 1}
              </div>
              <div className={cn(
                "text-[9px] mt-1 text-center leading-tight font-medium",
                active ? "text-violet-300" : "text-slate-600"
              )}>
                {labels[i]}
              </div>
              {sublabels?.[i] && (
                <div className="text-[8px] text-slate-700 mt-0.5 text-center leading-tight max-w-[80px]">
                  {sublabels[i]}
                </div>
              )}
            </div>
            {i < total - 1 && (
              <div className={cn(
                "h-px mt-3 flex-1 mx-2",
                done ? "bg-slate-600" : "border-t border-dashed border-slate-700/80"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── LayerStack — secțiune transversală proporțională ─────────────────────────
function LayerStack({ layers }) {
  if (!layers.length) return null;
  const totalMm = layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);

  return (
    <div className="rounded border border-slate-700/50 overflow-hidden text-[9px] font-mono select-none">
      {/* Etichetă */}
      <div className="flex items-center bg-slate-800/70 border-b border-slate-700/40 px-2 py-0.5 text-[8px] text-slate-600 uppercase tracking-widest">
        <span className="text-sky-600/80 mr-1">EXT</span>
        <div className="flex-1 text-center">SECȚIUNE TRANSVERSALĂ · ISO 6946:2017</div>
        <span className="text-emerald-600/80 ml-1">INT</span>
      </div>
      {/* Bara proporțională */}
      <div className="flex h-11 items-stretch">
        {/* Rse */}
        <div className="flex flex-col items-center justify-center w-9 bg-sky-900/20 border-r border-slate-700/40 shrink-0 gap-0.5">
          <span className="text-sky-400/50">↔</span>
          <span className="text-[7px] text-sky-500/50 leading-none">Rse</span>
          <span className="text-[7px] text-sky-400/40 leading-none">0.04</span>
        </div>
        {/* Straturi */}
        {layers.map((layer, i) => {
          const mm  = parseFloat(layer.thickness) || 0;
          const pct = totalMm > 0 ? Math.max(5, (mm / totalMm) * 100) : 100 / layers.length;
          const c   = getMatColors(layer.material || "");
          return (
            <div
              key={i}
              style={{ width: `${pct}%` }}
              className={cn(
                "flex flex-col items-center justify-center border-r border-slate-700/30 transition-all px-0.5 gap-0.5",
                c.bg
              )}
              title={`${layer.material} — ${mm} mm`}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
              <span className="text-white/40 text-[7px] leading-none">{mm}mm</span>
            </div>
          );
        })}
        {/* Rsi */}
        <div className="flex flex-col items-center justify-center w-9 bg-emerald-900/20 border-l border-slate-700/40 shrink-0 gap-0.5">
          <span className="text-emerald-400/50">↔</span>
          <span className="text-[7px] text-emerald-500/50 leading-none">Rsi</span>
          <span className="text-[7px] text-emerald-400/40 leading-none">0.13</span>
        </div>
      </div>
      {/* Indici straturi */}
      <div className="flex items-stretch bg-slate-800/30 border-t border-slate-700/30">
        <div className="w-9 shrink-0" />
        {layers.map((layer, i) => {
          const mm  = parseFloat(layer.thickness) || 0;
          const pct = totalMm > 0 ? Math.max(5, (mm / totalMm) * 100) : 100 / layers.length;
          return (
            <div key={i} style={{ width: `${pct}%` }} className="text-[7px] text-slate-700 text-center py-0.5 overflow-hidden">
              #{i + 1}
            </div>
          );
        })}
        <div className="w-9 shrink-0" />
      </div>
    </div>
  );
}

// ── ConformityGauge — bară U vs U_ref ────────────────────────────────────────
function ConformityGauge({ u, uRef, status }) {
  if (!u || !uRef) return null;
  const max    = uRef * 2.2;
  const uPct   = Math.min(98, (u / max) * 100);
  const refPct = (uRef / max) * 100;

  return (
    <div className="space-y-1 mt-2">
      <div className="flex justify-between text-[8px] text-slate-600 font-mono">
        <span>0.000</span>
        <span className="text-violet-400/70">U_ref nZEB = {uRef.toFixed(3)}</span>
        <span>{(uRef * 2.2).toFixed(2)}</span>
      </div>
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div className="absolute left-0 top-0 h-full bg-emerald-500/15 rounded-l-full" style={{ width: `${refPct}%` }} />
        <div className="absolute top-0 h-full bg-red-500/8"      style={{ left: `${refPct}%`, right: 0 }} />
        <div className="absolute top-0 w-px h-full bg-violet-500/60" style={{ left: `${refPct}%` }} />
        <div
          className={cn(
            "absolute top-0.5 w-2 h-2 rounded-full border-2 border-slate-900 shadow transition-all",
            status === "ok"   ? "bg-emerald-400" :
            status === "warn" ? "bg-amber-400"   : "bg-red-400"
          )}
          style={{ left: `calc(${uPct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-[8px] font-mono">
        <span className="text-emerald-600/60">← ZONA nZEB</span>
        <span className="text-red-600/50">NECONFORM →</span>
      </div>
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
export default function WizardOpaque({
  onSave,
  onClose,
  onOpenAdvanced,
  calcOpaqueR,
  buildingCategory,
  lang = "RO",
}) {
  const [step, setStep] = useState(1);
  const [element, setElement] = useState({
    name: "Perete exterior",
    type: "PE",
    orientation: "S",
    area: "",
    layers: [],
  });
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [matSearch, setMatSearch]               = useState("");
  const [searchLayerIdx, setSearchLayerIdx]     = useState(null);

  useEffect(() => {
    const elType = ELEMENT_TYPES_WIZARD.find(t => t.id === element.type);
    if (elType && element.name === "Perete exterior" && element.type !== "PE") {
      setElement(p => ({ ...p, name: elType.label }));
    }
  }, [element.type]);

  const uResult = useMemo(() => {
    if (!calcOpaqueR || !element.layers.length) return null;
    try { return calcOpaqueR(element.layers, element.type); } catch { return null; }
  }, [element.layers, element.type, calcOpaqueR]);

  const uRef    = getURefNZEB(buildingCategory, element.type);
  const uStatus = uResult?.u && uRef
    ? (uResult.u <= uRef ? "ok" : uResult.u <= uRef * 1.3 ? "warn" : "fail")
    : null;

  const presets = LAYER_PRESETS[element.type] || [];

  const applyPreset = (preset) => {
    const layers = preset.layers.map(l => buildLayerFromMaterialName(l.material, l.thickness));
    setElement(p => ({ ...p, layers }));
    setSelectedPresetId(preset.id);
  };

  const addEmptyLayer = () => {
    setElement(p => ({
      ...p,
      layers: [...p.layers, { material: "", matName: "", thickness: "", lambda: 0, rho: 0, mu: 0, cp: 0, src: "" }],
    }));
    setSelectedPresetId(null);
  };

  const removeLayer  = (idx) => { setElement(p => ({ ...p, layers: p.layers.filter((_, i) => i !== idx) })); setSelectedPresetId(null); };
  const updateLayer  = (idx, key, val) => { setElement(p => { const l = [...p.layers]; l[idx] = { ...l[idx], [key]: val }; return { ...p, layers: l }; }); setSelectedPresetId(null); };

  const selectMaterialForLayer = (idx, mat) => {
    setElement(p => {
      const layers = [...p.layers];
      layers[idx] = { ...layers[idx], material: mat.name, matName: mat.name, lambda: mat.lambda ?? 0, rho: mat.rho ?? 0, mu: mat.mu ?? 0, cp: mat.cp ?? 0, src: mat.src ?? "" };
      return { ...p, layers };
    });
    setSearchLayerIdx(null);
    setMatSearch("");
    setSelectedPresetId(null);
  };

  const canGoStep2 = element.name.trim() && element.type && element.orientation && parseFloat(element.area) > 0;
  const canGoStep3 = element.layers.length > 0 && element.layers.every(l => parseFloat(l.thickness) > 0 && parseFloat(l.lambda) > 0);
  const canSave    = canGoStep3 && uResult?.u > 0;

  const filteredMats = matSearch.length > 1
    ? MATERIALS_DB.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()) || m.cat.toLowerCase().includes(matSearch.toLowerCase())).slice(0, 12)
    : [];

  const handleSave         = () => { if (!canSave) return; onSave?.(element); onClose?.(); };
  const handleOpenAdvanced = () => { onOpenAdvanced?.(element); onClose?.(); };

  const elTypeLabel = ELEMENT_TYPES_WIZARD.find(t => t.id === element.type)?.label || element.type;

  const opaqueSuggestions = useMemo(() => {
    if (step !== 3 || !uResult?.u || !uRef || !element.type) return [];
    return suggestForOpaqueElement({ elementType: element.type, uCurrent: uResult.u, uTarget: uRef, preferredTags: uStatus === "fail" ? ["nZEB"] : [], limit: 3 });
  }, [step, uResult?.u, uRef, element.type, uStatus]);

  // ── Running R total în Pas 2 ──────────────────────────────────────────────
  const runningR = useMemo(() => {
    const rSe = 0.04, rSi = 0.13;
    const rLayers = element.layers.reduce((s, l) => {
      const d = parseFloat(l.thickness) || 0, lam = parseFloat(l.lambda) || 0;
      return s + (d > 0 && lam > 0 ? (d / 1000) / lam : 0);
    }, 0);
    const rTotal = rSe + rLayers + rSi;
    return { rSe, rSi, rLayers, rTotal, u: rTotal > 0 ? 1 / rTotal : 0 };
  }, [element.layers]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1117] border border-slate-700/60 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header tehnic ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* SVG: secțiune perete stratificat */}
            <div className="w-10 h-10 flex items-center justify-center rounded border border-slate-700/60 bg-slate-800/60 shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="1"  y="3" width="3"  height="16" fill="#94a3b8" opacity="0.35" rx="0.5"/>
                <rect x="5"  y="3" width="4"  height="16" fill="#a3e635" opacity="0.30" rx="0.5"/>
                <rect x="10" y="3" width="6"  height="16" fill="#fb923c" opacity="0.35" rx="0.5"/>
                <rect x="17" y="3" width="2"  height="16" fill="#94a3b8" opacity="0.25" rx="0.5"/>
                <line x1="0" y1="3"  x2="22" y2="3"  stroke="#334155" strokeWidth="0.6"/>
                <line x1="0" y1="19" x2="22" y2="19" stroke="#334155" strokeWidth="0.6"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">Element opac — Wizard</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <TechBadge label="ISO 6946:2017" />
                <TechBadge label="Mc 001-2022" />
                <span className="text-[9px] text-slate-700 font-mono">3 pași ghidați</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700/50 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/40"
            aria-label="Închide wizard"
          >✕</button>
        </div>

        <div className="p-5">
          <StepIndicator
            current={step}
            total={3}
            labels={["Identificare", "Straturi", "Verificare"]}
            sublabels={["Tip · Orientare · Arie", "Compoziție alcătuire", "U · R · Conformitate"]}
          />

          {/* ════════════ PAS 1 — Identificare ════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
                <span className="font-mono text-violet-500/80 text-xs">§1</span>
                <span>Selectează tipul elementului opac și parametrii geometrici de intrare.</span>
              </div>

              {/* Tip element */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Tip element opac</span>
                  <TechBadge label="Mc 001-2022 §5" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {ELEMENT_TYPES_WIZARD.map(t => {
                    const uR = getURefNZEB(buildingCategory, t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setElement(p => ({ ...p, type: t.id, layers: [] }))}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2.5 rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/50",
                          element.type === t.id
                            ? "border-violet-500/70 bg-violet-500/8 text-violet-200"
                            : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600 text-slate-400"
                        )}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-[9px] font-medium text-center leading-tight">{t.label}</span>
                        {uR && (
                          <span className="text-[8px] font-mono text-slate-600 mt-0.5">U≤{uR.toFixed(2)}</span>
                        )}
                        <span className={cn(
                          "text-[8px] font-mono px-1 py-0 rounded border mt-0.5",
                          element.type === t.id
                            ? "border-violet-700/60 text-violet-400/80 bg-violet-500/10"
                            : "border-slate-700/60 text-slate-600"
                        )}>{t.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parametri geometrici */}
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mb-2">Parametri geometrici</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Denumire" value={element.name} onChange={v => setElement(p => ({ ...p, name: v }))} />
                  <Select label="Orientare" value={element.orientation} onChange={v => setElement(p => ({ ...p, orientation: v }))} options={ORIENTATIONS} />
                  <Input label="Suprafață netă" value={element.area} onChange={v => setElement(p => ({ ...p, area: v }))} type="number" unit="m²" min="0" step="0.1" />
                </div>
              </div>

              <div className="flex gap-2 justify-between pt-2 border-t border-slate-800/60">
                <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded border border-slate-700/50 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors">Anulează</button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canGoStep2}
                  className={cn(
                    "px-5 py-1.5 text-[11px] rounded font-medium transition-all",
                    canGoStep2 ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  )}
                >Continuă → Alcătuire straturi</button>
              </div>
            </div>
          )}

          {/* ════════════ PAS 2 — Straturi ════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
                <span className="font-mono text-violet-500/80 text-xs">§2</span>
                <span>Definește alcătuirea. Ordine obligatorie:
                  <span className="text-sky-400/80 font-mono mx-1">EXT</span>→
                  <span className="text-emerald-400/80 font-mono ml-1">INT</span>
                </span>
              </div>

              {/* Preset-uri soluții tipice */}
              {presets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Soluții tipice — {elTypeLabel}</span>
                    <TechBadge label="catalog intern" />
                  </div>
                  <div className="space-y-1.5">
                    {presets.map((p, pi) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={cn(
                          "w-full text-left p-2.5 rounded border-2 transition-all",
                          selectedPresetId === p.id
                            ? "border-violet-500/60 bg-violet-500/8"
                            : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-600 shrink-0">S{pi + 1}</span>
                          <span className="text-[11px] font-semibold text-slate-200">{p.label}</span>
                          <span className="ml-auto text-[9px] font-mono text-slate-600">{p.layers.length} straturi</span>
                        </div>
                        <div className="text-[9px] text-slate-600 mt-0.5 pl-5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[8px] text-slate-700 uppercase tracking-widest font-mono">
                <div className="h-px flex-1 bg-slate-800" />
                <span>SAU ALCĂTUIRE MANUALĂ</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Diagramă secțiune transversală */}
              <LayerStack layers={element.layers} />

              {/* Tabel straturi */}
              {element.layers.length === 0 ? (
                <div className="rounded border border-dashed border-slate-800 py-6 text-center text-[10px] text-slate-700 font-mono">
                  Niciun strat definit — alege un preset sau adaugă manual.
                </div>
              ) : (
                <div>
                  {/* Header coloană */}
                  <div className="grid grid-cols-[28px_1fr_68px_52px_52px_56px] gap-1 px-2 py-1 text-[8px] text-slate-600 uppercase tracking-widest font-mono border-b border-slate-800/80">
                    <span>#</span>
                    <span>Material · sursă</span>
                    <span className="text-right">d (mm)</span>
                    <span className="text-right">λ (W/mK)</span>
                    <span className="text-right">R (m²K/W)</span>
                    <span className="text-right">acțiuni</span>
                  </div>

                  <div className="space-y-1.5 mt-1.5">
                    {element.layers.map((layer, idx) => {
                      const mm  = parseFloat(layer.thickness) || 0;
                      const lam = parseFloat(layer.lambda)    || 0;
                      const R   = lam > 0 && mm > 0 ? ((mm / 1000) / lam).toFixed(3) : null;
                      const c   = getMatColors(layer.material || "");
                      const isSearch = searchLayerIdx === idx;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "rounded border transition-all",
                            isSearch ? "border-violet-500/40 bg-violet-500/5" : `${c.border} ${c.bg}`
                          )}
                        >
                          {/* Rând principal */}
                          <div className="grid grid-cols-[28px_1fr_68px_52px_52px_56px] gap-1 items-center px-2 py-2">
                            {/* Index + poziție */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <span className="text-[8px] font-mono text-slate-600">#{idx + 1}</span>
                              {idx === 0
                                ? <span className="text-[7px] font-bold text-sky-500 font-mono">EXT</span>
                                : idx === element.layers.length - 1
                                ? <span className="text-[7px] font-bold text-emerald-500 font-mono">INT</span>
                                : null
                              }
                            </div>
                            {/* Material */}
                            <div className="min-w-0">
                              <div className="text-[11px] text-slate-200 font-medium truncate">
                                {layer.material || (
                                  <span className="text-slate-600 italic text-[10px]">fără material selectat</span>
                                )}
                              </div>
                              <div className="text-[8px] font-mono text-slate-600 mt-0.5 flex items-center gap-2">
                                {c.tag && (
                                  <span className={cn("px-1 rounded border text-[7px]", c.border, "text-slate-500")}>
                                    {c.tag}
                                  </span>
                                )}
                                {layer.rho > 0 && <span>ρ={layer.rho} kg/m³</span>}
                                {layer.mu  > 0 && <span>μ={layer.mu}</span>}
                                {layer.src    && <span className="text-slate-700">[{layer.src}]</span>}
                              </div>
                            </div>
                            {/* Grosime */}
                            <div>
                              <input
                                type="number"
                                value={layer.thickness}
                                onChange={e => updateLayer(idx, "thickness", e.target.value)}
                                min="0"
                                placeholder="0"
                                className="w-full px-1.5 py-1 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-violet-500/50 text-right"
                              />
                            </div>
                            {/* Lambda — read-only */}
                            <div className="text-right px-1.5 py-1 rounded bg-slate-800/40 border border-slate-800 text-[11px] font-mono text-slate-400">
                              {lam > 0 ? lam.toFixed(3) : <span className="text-slate-700">—</span>}
                            </div>
                            {/* R strat */}
                            <div className={cn(
                              "text-right px-1.5 py-1 rounded border text-[11px] font-mono transition-colors",
                              R && parseFloat(R) > 0.4
                                ? "bg-emerald-500/8 border-emerald-700/30 text-emerald-300"
                                : "bg-slate-800/40 border-slate-800 text-slate-500"
                            )}>
                              {R ?? <span className="text-slate-700">—</span>}
                            </div>
                            {/* Acțiuni */}
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => setSearchLayerIdx(isSearch ? null : idx)}
                                className="text-[8px] px-1.5 py-1 rounded border border-violet-600/30 bg-violet-600/8 text-violet-400 hover:bg-violet-600/20 transition-colors"
                                title="Selectează material din baza de date"
                              >
                                {isSearch ? "✕" : "⊕"}
                              </button>
                              <button
                                onClick={() => removeLayer(idx)}
                                className="text-[8px] px-1.5 py-1 rounded border border-red-600/30 bg-red-600/5 text-red-400 hover:bg-red-600/20 transition-colors"
                                title="Elimină strat"
                              >✕</button>
                            </div>
                          </div>

                          {/* Căutare material inline */}
                          {isSearch && (
                            <div className="mx-2 mb-2 pt-2 border-t border-slate-800/60">
                              <input
                                type="text"
                                value={matSearch}
                                onChange={e => setMatSearch(e.target.value)}
                                placeholder="Caută în baza de date materiale (min. 2 caractere)…"
                                autoFocus
                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700/60 text-[11px] text-slate-200 focus:outline-none focus:border-violet-500/50 placeholder-slate-700"
                              />
                              {filteredMats.length > 0 && (
                                <div className="mt-1 max-h-44 overflow-y-auto rounded border border-slate-800/80 divide-y divide-slate-800/60">
                                  {filteredMats.map((mat, i) => (
                                    <button
                                      key={i}
                                      onClick={() => selectMaterialForLayer(idx, mat)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800/60 transition-colors"
                                    >
                                      <div className="text-[11px] text-slate-200 font-medium">{mat.name}</div>
                                      <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                                        {mat.cat}
                                        <span className="ml-2 text-violet-400/60">λ={mat.lambda}</span>
                                        <span className="ml-1.5">ρ={mat.rho}</span>
                                        {mat.mu  && <span className="ml-1.5">μ={mat.mu}</span>}
                                        {mat.src && <span className="ml-1.5 text-slate-700">[{mat.src}]</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Running R total */}
                  {element.layers.length > 0 && (
                    <div className="mt-2 px-3 py-1.5 rounded border border-slate-700/40 bg-slate-800/30 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-slate-600">
                        R<sub>se</sub>(0.040) + Σ({runningR.rLayers.toFixed(3)}) + R<sub>si</sub>(0.130)
                      </span>
                      <span className="text-violet-400/80 font-semibold">
                        R = {runningR.rTotal.toFixed(3)} m²K/W → U ≈ {runningR.u.toFixed(3)} W/(m²·K)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={addEmptyLayer}
                title="Straturile se introduc de la exterior spre interior"
                className="w-full py-1.5 rounded border border-dashed border-slate-700/50 hover:border-violet-500/40 hover:bg-violet-500/4 text-[9px] text-slate-600 hover:text-violet-400 font-mono uppercase tracking-wider transition-all"
              >
                + ADAUGĂ STRAT NOU  <span className="text-slate-700 normal-case">(EXT → INT)</span>
              </button>

              <div className="flex gap-2 justify-between pt-2 border-t border-slate-800/60">
                <button onClick={() => setStep(1)} className="px-3 py-1.5 text-[11px] rounded border border-slate-700/50 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors">← Înapoi</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canGoStep3}
                  className={cn(
                    "px-5 py-1.5 text-[11px] rounded font-medium transition-all",
                    canGoStep3 ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  )}
                >Continuă → Verificare</button>
              </div>
            </div>
          )}

          {/* ════════════ PAS 3 — Verificare ════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
                <span className="font-mono text-violet-500/80 text-xs">§3</span>
                <span>Verificare coeficient U și conformitate cu cerințele nZEB din Mc 001-2022.</span>
              </div>

              {/* Fișă element */}
              <div className="rounded border border-slate-700/50 overflow-hidden">
                {/* Header fișă */}
                <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700/40 flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">FIȘĂ ELEMENT OPAC</span>
                  <div className="flex gap-1.5">
                    <TechBadge label={element.type} />
                    <TechBadge label={element.orientation} />
                  </div>
                </div>

                {/* Metadate element */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-800/60">
                  {[
                    { label: "Denumire",         value: element.name,  mono: false },
                    { label: "Suprafață (m²)",   value: parseFloat(element.area || 0).toFixed(1), mono: true },
                    { label: "Straturi (nr.)",   value: element.layers.length, mono: true },
                    { label: "Grosime totală",   value: `${element.layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0)} mm`, mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="px-3 py-2">
                      <div className="text-[8px] text-slate-600 uppercase tracking-wider">{label}</div>
                      <div className={cn("text-[12px] text-slate-200 mt-0.5", mono && "font-mono")}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Tabel R detaliat */}
                <div className="border-t border-slate-800/60">
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 bg-slate-800/40 border-b border-slate-800/60 text-[8px] text-slate-600 uppercase tracking-wider font-mono">
                    <span>Strat</span>
                    <span className="text-right">d (mm)</span>
                    <span className="text-right">λ</span>
                    <span className="text-right">R (m²K/W)</span>
                    <span className="text-right">%R</span>
                  </div>

                  {/* Rse */}
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 bg-sky-900/10 border-b border-slate-800/40 text-[10px] font-mono">
                    <span className="text-sky-400/50 italic">R_se — suprafață ext.</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-sky-400/60">0.040</span>
                    <span className="text-right text-slate-700">
                      {uResult?.r_total ? `${((0.04 / uResult.r_total) * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>

                  {element.layers.map((layer, idx) => {
                    const mm  = parseFloat(layer.thickness) || 0;
                    const lam = parseFloat(layer.lambda)    || 0;
                    const R   = lam > 0 && mm > 0 ? (mm / 1000) / lam : 0;
                    const rPct = uResult?.r_total && R > 0
                      ? `${((R / uResult.r_total) * 100).toFixed(1)}%`
                      : "—";
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 border-b border-slate-800/30 hover:bg-slate-800/20 text-[10px] font-mono transition-colors"
                      >
                        <span className="text-slate-300 truncate">{layer.material || "—"}</span>
                        <span className="text-right text-slate-400">{mm}</span>
                        <span className="text-right text-slate-400">{lam > 0 ? lam.toFixed(3) : "—"}</span>
                        <span className="text-right text-slate-200">{R > 0 ? R.toFixed(3) : "—"}</span>
                        <span className="text-right text-slate-600">{rPct}</span>
                      </div>
                    );
                  })}

                  {/* Rsi */}
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 bg-emerald-900/10 border-b border-slate-800/40 text-[10px] font-mono">
                    <span className="text-emerald-400/50 italic">R_si — suprafață int.</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-emerald-400/60">0.130</span>
                    <span className="text-right text-slate-700">
                      {uResult?.r_total ? `${((0.13 / uResult.r_total) * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>

                  {/* Rând TOTAL */}
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-2 bg-slate-800/40 text-[11px] font-mono font-semibold">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">R TOTAL</span>
                    <span className="text-right text-slate-500 font-normal text-[9px]">
                      {element.layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0)} mm
                    </span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-violet-300">
                      {uResult?.r_total?.toFixed(3) ?? "—"}
                    </span>
                    <span className="text-right text-slate-600">100%</span>
                  </div>
                </div>

                {/* U + ConformityGauge */}
                <div className="p-4 border-t border-slate-700/40 bg-slate-800/20">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono mb-1">
                        Coeficient U  ·  ISO 6946:2017
                      </div>
                      <div className={cn(
                        "text-4xl font-bold font-mono tracking-tight",
                        uStatus === "ok"   ? "text-emerald-400" :
                        uStatus === "warn" ? "text-amber-400"   :
                        uStatus === "fail" ? "text-red-400"     : "text-slate-200"
                      )}>
                        {uResult?.u ? uResult.u.toFixed(3) : "—"}
                      </div>
                      <div className="text-[9px] font-mono text-slate-600 mt-0.5">W/(m²·K)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono mb-1">
                        U_ref nZEB  ·  Mc 001-2022
                      </div>
                      <div className="text-2xl font-mono text-slate-400">{uRef?.toFixed(2) ?? "—"}</div>
                      <div className="text-[8px] text-slate-600 font-mono mt-0.5">W/(m²·K)</div>
                      <div className={cn(
                        "mt-1.5 px-2 py-0.5 rounded border text-[9px] font-bold font-mono inline-block",
                        uStatus === "ok"   ? "border-emerald-600/60 bg-emerald-500/10 text-emerald-400" :
                        uStatus === "warn" ? "border-amber-600/60 bg-amber-500/10 text-amber-400"       :
                        uStatus === "fail" ? "border-red-600/60 bg-red-500/10 text-red-400"             :
                                             "border-slate-700 text-slate-600"
                      )}>
                        {uStatus === "ok"   ? "✓ CONFORM nZEB"  :
                         uStatus === "warn" ? "⚠ ACCEPTABIL"    :
                         uStatus === "fail" ? "✗ NECONFORM"     : "—"}
                      </div>
                    </div>
                  </div>
                  <ConformityGauge u={uResult?.u} uRef={uRef} status={uStatus} />
                </div>
              </div>

              {/* Sugestii orientative */}
              {opaqueSuggestions.length > 0 && (
                <SuggestionPanel
                  suggestions={opaqueSuggestions}
                  title={
                    uStatus === "fail" ? "Soluții recomandate pentru atingerea U_ref nZEB"
                    : uStatus === "warn" ? "Soluții pentru aducerea elementului în clasa A"
                    : "Alternative orientative pentru element"
                  }
                  subtitle={`Termoizolații tipice piață RO 2025-2026 — neutru, fără marcă. ${elTypeLabel}.`}
                  mode="card"
                  lang={lang}
                />
              )}

              {/* Editor avansat */}
              <button
                onClick={handleOpenAdvanced}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-slate-700/50 hover:border-slate-600 bg-slate-800/20 hover:bg-slate-800/40 text-left transition-all"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded border border-slate-700/60 bg-slate-800 text-slate-400 shrink-0">⚙</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-300">Editor avansat straturi</div>
                  <div className="text-[9px] text-slate-600 mt-0.5 font-mono">
                    Control complet: μ vapori · cp · surse normative · analiză Glaser condensare
                  </div>
                </div>
                <span className="text-slate-600 text-xs">→</span>
              </button>

              <div className="flex gap-2 justify-between pt-2 border-t border-slate-800/60">
                <button onClick={() => setStep(2)} className="px-3 py-1.5 text-[11px] rounded border border-slate-700/50 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors">← Înapoi</button>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={cn(
                    "px-5 py-1.5 text-[11px] rounded font-semibold transition-all",
                    canSave ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  )}
                >✓ Salvează element opac</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
