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
  ELEMENT_TYPES_WIZARD_FULL,
  LAYER_PRESETS,
  getURefNZEB,
  buildLayerFromMaterialName,
} from "./utils/wizardOpaqueCalc.js";
import { FASTENER_TYPES } from "../../calc/opaque.js";
import { calcGlaserCondens } from "../../calc/glaser-condens.js";

// Climat default Zone II (București) pentru Glaser preview.
// Surse: STAS 1907/1-97 + Mc 001-2022 Anexa C clima orientativă.
const DEFAULT_CLIMATE_ZONE_II = {
  temp_month: [-2.0, -0.5, 4.5, 11.0, 16.5, 20.0, 22.5, 22.0, 17.0, 11.0, 5.0, 0.0],
  rh_month:   [85,    82,   75,   65,   60,   60,   58,   60,   65,   72,   80,   85],
  zone: "II",
};

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV", "Orizontal"];

// ── Grupare 16 tipuri pe categorie pentru UI compactă (P0 fix) ───────────────
// Fiecare grup are titlu + listă tipuri din ELEMENT_TYPES_WIZARD_FULL.
// `inEnvelope:false` (PI, PI_INTERMED) afișate la final, dezactivate vizual.
const TYPE_GROUPS = [
  { key: "perete",   label: "Pereți",         ids: ["PE", "PR", "PS", "AT"] },
  { key: "acoperis", label: "Acoperișuri",    ids: ["PT", "PA", "PM", "PP", "AC_VERDE"] },
  { key: "planseu",  label: "Planșee / plăci", ids: ["PL", "PB", "PV"] },
  { key: "usa",      label: "Uși opace",      ids: ["US", "UN"] },
  { key: "interior", label: "Interior (informativ — fără calcul anvelopă)", ids: ["PI", "PI_INTERMED"] },
];

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
// P0 fix: Rsi/Rse dinamic per tip element (ISO 6946:2017 Tabel 7).
// Default fallback PE (Rsi=0.13, Rse=0.04) dacă nu se primesc props.
function LayerStack({ layers, rsi = 0.13, rse = 0.04 }) {
  if (!layers.length) return null;
  const totalMm = layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);

  return (
    <div className="rounded-lg border border-slate-700/50 overflow-hidden font-mono select-none">
      {/* Etichetă */}
      <div className="flex items-center bg-slate-800/80 border-b border-slate-700/40 px-3 py-1 text-[10px] text-slate-400 uppercase tracking-widest">
        <span className="text-sky-400 mr-2 font-bold">◀ EXT</span>
        <div className="flex-1 text-center text-slate-500">SECȚIUNE TRANSVERSALĂ · ISO 6946:2017</div>
        <span className="text-emerald-400 ml-2 font-bold">INT ▶</span>
      </div>
      {/* Bara proporțională */}
      <div className="flex h-24 items-stretch">
        {/* Rse */}
        <div className="flex flex-col items-center justify-center w-14 bg-sky-900/30 border-r border-slate-700/40 shrink-0 gap-1">
          <span className="text-sky-400 text-base leading-none">↔</span>
          <span className="text-[10px] text-sky-300 leading-none font-bold">Rse</span>
          <span className="text-[9px] text-sky-400/70 leading-none">{rse.toFixed(2)}</span>
          <span className="text-[8px] text-sky-500/60 leading-none">m²K/W</span>
        </div>
        {/* Straturi */}
        {layers.map((layer, i) => {
          const mm  = parseFloat(layer.thickness) || 0;
          const pct = totalMm > 0 ? Math.max(5, (mm / totalMm) * 100) : 100 / layers.length;
          const c   = getMatColors(layer.material || "");
          const matName = layer.material || `Strat ${i + 1}`;
          const shortName = matName.length > 14 ? matName.slice(0, 13) + "…" : matName;
          return (
            <div
              key={i}
              style={{ width: `${pct}%` }}
              className={cn(
                "flex flex-col items-center justify-center border-r border-slate-700/30 transition-all px-1 gap-1 relative overflow-hidden",
                c.bg
              )}
              title={`${matName} — ${mm} mm`}
            >
              <div className={cn("w-2 h-2 rounded-full ring-1 ring-white/20", c.dot)} />
              <span className="text-white/85 text-[10px] leading-tight font-semibold text-center truncate w-full px-0.5">{shortName}</span>
              <span className="text-white/55 text-[9px] leading-none font-mono">{mm}<span className="text-white/35">mm</span></span>
            </div>
          );
        })}
        {/* Rsi */}
        <div className="flex flex-col items-center justify-center w-14 bg-emerald-900/30 border-l border-slate-700/40 shrink-0 gap-1">
          <span className="text-emerald-400 text-base leading-none">↔</span>
          <span className="text-[10px] text-emerald-300 leading-none font-bold">Rsi</span>
          <span className="text-[9px] text-emerald-400/70 leading-none">{rsi.toFixed(2)}</span>
          <span className="text-[8px] text-emerald-500/60 leading-none">m²K/W</span>
        </div>
      </div>
      {/* Indici straturi */}
      <div className="flex items-stretch bg-slate-800/40 border-t border-slate-700/30">
        <div className="w-14 shrink-0 text-[8px] text-sky-500/60 text-center py-1">aer ext</div>
        {layers.map((layer, i) => {
          const mm  = parseFloat(layer.thickness) || 0;
          const pct = totalMm > 0 ? Math.max(5, (mm / totalMm) * 100) : 100 / layers.length;
          return (
            <div key={i} style={{ width: `${pct}%` }} className="text-[9px] text-slate-400 text-center py-1 overflow-hidden font-bold border-r border-slate-700/20">
              #{i + 1}
            </div>
          );
        })}
        <div className="w-14 shrink-0 text-[8px] text-emerald-500/60 text-center py-1">aer int</div>
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
  selectedClimate, // P1-6: pentru Glaser cu climat real, fallback la Zone II
  lang = "RO",
}) {
  const [step, setStep] = useState(1);
  const [element, setElement] = useState({
    name: "Perete exterior",
    type: "PE",
    orientation: "S",
    area: "",
    layers: [],
    fastener: { type: "default", n_f: undefined }, // P1-12: ΔU'' Annex F selector
  });
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [matSearch, setMatSearch]               = useState("");
  const [searchLayerIdx, setSearchLayerIdx]     = useState(null);

  useEffect(() => {
    const elType = ELEMENT_TYPES_WIZARD_FULL.find(t => t.id === element.type);
    if (elType && element.name === "Perete exterior" && element.type !== "PE") {
      setElement(p => ({ ...p, name: elType.label }));
    }
  }, [element.type]);

  // ── P0 fix: Rsi/Rse dinamic din tipul element ────────────────────────────
  const currentType = ELEMENT_TYPES_WIZARD_FULL.find(t => t.id === element.type);
  const dynRsi = currentType?.rsi ?? 0.13;
  const dynRse = currentType?.rse ?? 0.04;

  const uResult = useMemo(() => {
    if (!calcOpaqueR || !element.layers.length) return null;
    // P1-12: pasăm fastener pentru calcul ΔU'' Annex F (forțează utilizarea selectorului)
    try { return calcOpaqueR(element.layers, element.type, element.fastener); } catch { return null; }
  }, [element.layers, element.type, element.fastener, calcOpaqueR]);

  // Detectare strat izolant pentru afișare condiționată selector fastener
  const hasInsulation = useMemo(
    () => element.layers.some(l => (parseFloat(l.lambda) || 1) < 0.06),
    [element.layers]
  );

  // P1-6: Glaser condens — preview live cu climat real sau fallback Zone II
  const glaserResult = useMemo(() => {
    if (!element.layers.length || step !== 3) return null;
    if (!element.layers.every(l => parseFloat(l.thickness) > 0 && parseFloat(l.lambda) > 0)) return null;
    const climateData = selectedClimate?.temp_month
      ? {
          temp_month: selectedClimate.temp_month,
          rh_month: selectedClimate.rh_month || DEFAULT_CLIMATE_ZONE_II.rh_month,
          zone: selectedClimate.zone || "II",
        }
      : DEFAULT_CLIMATE_ZONE_II;
    try {
      return calcGlaserCondens(element, climateData);
    } catch {
      return null;
    }
  }, [element, step, selectedClimate]);

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
  // P2-5: duplicare element — salvează curent + resetează la Pas 1 cu același tip/orientare
  const handleSaveAndDuplicate = () => {
    if (!canSave) return;
    onSave?.(element);
    setElement(p => ({
      ...p,
      // Păstrează tipul + structura strat ca șablon, doar incrementează numele
      name: `${p.name} (copie)`,
      area: "",
    }));
    setStep(1);
  };

  const elTypeLabel = ELEMENT_TYPES_WIZARD_FULL.find(t => t.id === element.type)?.label || element.type;

  const opaqueSuggestions = useMemo(() => {
    if (step !== 3 || !uResult?.u || !uRef || !element.type) return [];
    return suggestForOpaqueElement({ elementType: element.type, uCurrent: uResult.u, uTarget: uRef, preferredTags: uStatus === "fail" ? ["nZEB"] : [], limit: 3 });
  }, [step, uResult?.u, uRef, element.type, uStatus]);

  // ── Running R total în Pas 2 ──────────────────────────────────────────────
  // P0 fix: Rsi/Rse dinamic per tip element (ISO 6946:2017 Tabel 7).
  const runningR = useMemo(() => {
    const rSe = dynRse, rSi = dynRsi;
    const rLayers = element.layers.reduce((s, l) => {
      const d = parseFloat(l.thickness) || 0, lam = parseFloat(l.lambda) || 0;
      return s + (d > 0 && lam > 0 ? (d / 1000) / lam : 0);
    }, 0);
    const rTotal = rSe + rLayers + rSi;
    return { rSe, rSi, rLayers, rTotal, u: rTotal > 0 ? 1 / rTotal : 0 };
  }, [element.layers, dynRsi, dynRse]);

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

              {/* Tip element — 16 tipuri grupate pe categorii (P0 fix) ─────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    Tip element opac · {ELEMENT_TYPES_WIZARD_FULL.length} tipuri
                  </span>
                  <TechBadge label="Mc 001-2022 §5" />
                </div>
                <div className="space-y-2">
                  {TYPE_GROUPS.map(group => {
                    const types = group.ids
                      .map(id => ELEMENT_TYPES_WIZARD_FULL.find(t => t.id === id))
                      .filter(Boolean);
                    if (!types.length) return null;
                    const isInfo = group.key === "interior";
                    return (
                      <div key={group.key}>
                        <div className={cn(
                          "text-[8px] uppercase tracking-widest font-mono mb-1 px-0.5",
                          isInfo ? "text-slate-600 italic" : "text-slate-500"
                        )}>
                          {group.label}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {types.map(t => {
                            const uR = getURefNZEB(buildingCategory, t.id);
                            const selected = element.type === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => setElement(p => ({ ...p, type: t.id, layers: [] }))}
                                title={t.description || t.label}
                                className={cn(
                                  "flex flex-col items-center gap-1 p-2 rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/50",
                                  selected
                                    ? "border-violet-500/70 bg-violet-500/8 text-violet-200"
                                    : isInfo
                                      ? "border-slate-800/60 bg-slate-800/20 hover:border-slate-700 text-slate-600 opacity-70"
                                      : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600 text-slate-400"
                                )}
                              >
                                <span className="text-lg">{t.icon}</span>
                                <span className="text-[9px] font-medium text-center leading-tight line-clamp-2">{t.shortLabel || t.label}</span>
                                {uR ? (
                                  <span className="text-[8px] font-mono text-slate-600 leading-none">U≤{uR.toFixed(2)}</span>
                                ) : (
                                  <span className="text-[8px] font-mono text-slate-700 leading-none italic">—</span>
                                )}
                                <span className={cn(
                                  "text-[8px] font-mono px-1 py-0 rounded border leading-tight",
                                  selected
                                    ? "border-violet-700/60 text-violet-400/80 bg-violet-500/10"
                                    : "border-slate-700/60 text-slate-600"
                                )}>{t.id}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Info Rsi/Rse dinamic per tip selectat */}
                {currentType && (
                  <div className="mt-2 px-3 py-1.5 rounded border border-slate-800/60 bg-slate-800/20 text-[9px] font-mono text-slate-500 flex items-center justify-between">
                    <span>
                      <span className="text-violet-400/80">{currentType.id}</span> · {currentType.label}
                    </span>
                    <span className="text-slate-600">
                      Rsi=<span className="text-emerald-400/80">{dynRsi.toFixed(2)}</span> · Rse=<span className="text-sky-400/80">{dynRse.toFixed(2)}</span> m²K/W
                    </span>
                  </div>
                )}
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
              <LayerStack layers={element.layers} rsi={dynRsi} rse={dynRse} />

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
                      // P2-1: validări non-blocante (warning vizual)
                      const dWarning = mm > 0 && (mm < 1 || mm > 1000);
                      const lambdaWarning = lam > 0 && (lam < 0.01 || lam > 5.0);
                      const dWarningMsg = mm < 1 ? "d < 1 mm — verifică unitatea" : mm > 1000 ? "d > 1000 mm — strat anormal de gros" : "";
                      const lambdaWarningMsg = lam < 0.01 ? "λ < 0.01 W/(m·K) — sub vacuum-insulation panel; verifică sursa" : lam > 5.0 ? "λ > 5.0 W/(m·K) — peste oțel; verifică sursa" : "";

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
                            {/* Grosime — P2-1 validare ∈ (1, 1000) mm */}
                            <div>
                              <input
                                type="number"
                                value={layer.thickness}
                                onChange={e => updateLayer(idx, "thickness", e.target.value)}
                                min="0"
                                placeholder="0"
                                title={dWarningMsg || `Grosime [mm]${mm > 0 ? ` — recomandat 1-1000` : ""}`}
                                className={cn(
                                  "w-full px-1.5 py-1 rounded text-[11px] font-mono text-right focus:outline-none transition-colors",
                                  dWarning
                                    ? "bg-amber-500/10 border-2 border-amber-500/50 text-amber-300 focus:border-amber-400"
                                    : "bg-slate-800/60 border border-slate-700/50 text-slate-200 focus:border-violet-500/50"
                                )}
                              />
                            </div>
                            {/* Lambda — read-only · P2-1 warning out-of-range */}
                            <div
                              title={lambdaWarningMsg || (lam > 0 ? `λ = ${lam.toFixed(3)} W/(m·K)` : "λ nedefinit")}
                              className={cn(
                                "text-right px-1.5 py-1 rounded text-[11px] font-mono transition-colors",
                                lambdaWarning
                                  ? "bg-amber-500/10 border-2 border-amber-500/50 text-amber-300"
                                  : "bg-slate-800/40 border border-slate-800 text-slate-400"
                              )}
                            >
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

                  {/* Running R total — Rsi/Rse dinamic per tip element */}
                  {element.layers.length > 0 && (
                    <div className="mt-2 px-3 py-1.5 rounded border border-slate-700/40 bg-slate-800/30 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-slate-600">
                        R<sub>se</sub>({dynRse.toFixed(3)}) + Σ({runningR.rLayers.toFixed(3)}) + R<sub>si</sub>({dynRsi.toFixed(3)})
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

                  {/* Rse — dinamic per tip element */}
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 bg-sky-900/10 border-b border-slate-800/40 text-[10px] font-mono">
                    <span className="text-sky-400/50 italic">R_se — suprafață ext.</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-sky-400/60">{dynRse.toFixed(3)}</span>
                    <span className="text-right text-slate-700">
                      {uResult?.r_total ? `${((dynRse / uResult.r_total) * 100).toFixed(1)}%` : "—"}
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

                  {/* Rsi — dinamic per tip element */}
                  <div className="grid grid-cols-[1fr_52px_52px_64px_52px] gap-1 px-3 py-1 bg-emerald-900/10 border-b border-slate-800/40 text-[10px] font-mono">
                    <span className="text-emerald-400/50 italic">R_si — suprafață int.</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-slate-700">—</span>
                    <span className="text-right text-emerald-400/60">{dynRsi.toFixed(3)}</span>
                    <span className="text-right text-slate-700">
                      {uResult?.r_total ? `${((dynRsi / uResult.r_total) * 100).toFixed(1)}%` : "—"}
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

              {/* P1-12: Selector fixări mecanice ΔU'' (Annex F) — vizibil DOAR cu izolație */}
              {hasInsulation && (
                <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                        Fixări mecanice (ΔU'' Annex F)
                      </div>
                      <div className="text-[8px] text-slate-700 font-mono mt-0.5">
                        ISO 6946:2017 Annex F — corecție pentru fixatori în straturi izolante
                      </div>
                    </div>
                    <TechBadge label="ISO 6946 §F" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {Object.entries(FASTENER_TYPES).map(([id, ft]) => {
                      const selected = element.fastener?.type === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setElement(p => ({ ...p, fastener: { ...p.fastener, type: id } }))}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded border-2 text-left transition-all",
                            selected
                              ? "border-violet-500/60 bg-violet-500/8"
                              : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/30"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-slate-200 truncate">
                              {ft.label}
                            </div>
                            <div className="text-[8px] text-slate-600 font-mono">
                              ΔU forfetar = {ft.deltaU_flat.toFixed(3)} W/(m²·K)
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Display rezultat ΔU' calculat exact (dacă există) */}
                  {uResult?.deltaU > 0 && (
                    <div className="mt-2 px-2 py-1 rounded border border-violet-700/30 bg-violet-500/5 text-[9px] font-mono text-violet-300/80 flex items-center justify-between">
                      <span>ΔU calculat exact (Annex F): <strong>{uResult.deltaU.toFixed(3)}</strong> W/(m²·K)</span>
                      <span className="text-[8px] text-slate-600 italic">{uResult.deltaU_method}</span>
                    </div>
                  )}
                </div>
              )}

              {/* P1-6: Verificare Glaser condens (SR EN ISO 13788) — afișat doar dacă layers complete */}
              {glaserResult && (
                <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                        Verificare condens vapori (Glaser)
                      </div>
                      <div className="text-[8px] text-slate-700 font-mono mt-0.5">
                        SR EN ISO 13788:2012 + C 107/6-2002 · climat {selectedClimate?.zone || "II"} (București default)
                      </div>
                    </div>
                    <TechBadge label="ISO 13788" />
                  </div>

                  {/* Verdict principal */}
                  <div className={cn(
                    "px-3 py-2 rounded border-2 flex items-center justify-between",
                    glaserResult.hasCondens
                      ? glaserResult.annualOk
                        ? "border-amber-600/50 bg-amber-500/8"
                        : "border-red-600/50 bg-red-500/8"
                      : "border-emerald-600/50 bg-emerald-500/8"
                  )}>
                    <div>
                      <div className={cn(
                        "text-[11px] font-semibold",
                        glaserResult.hasCondens
                          ? glaserResult.annualOk ? "text-amber-300" : "text-red-300"
                          : "text-emerald-300"
                      )}>
                        {glaserResult.hasCondens
                          ? glaserResult.annualOk
                            ? "⚠ Condens iarna, evaporează vara — ACCEPTABIL"
                            : "✗ Condens net pozitiv anual — NECONFORM C 107/6"
                          : "✓ Fără risc condens"}
                      </div>
                      <div className="text-[8px] font-mono text-slate-600 mt-0.5">
                        {glaserResult.verdict || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                        Acumulat anual
                      </div>
                      <div className={cn(
                        "text-sm font-mono font-bold",
                        glaserResult.hasCondens ? "text-amber-300" : "text-emerald-300"
                      )}>
                        {glaserResult.totalCondensYear_kg_m2.toFixed(3)}
                      </div>
                      <div className="text-[8px] text-slate-700 font-mono">kg/m²·an</div>
                    </div>
                  </div>

                  {/* Bilanț net (winter - summer evap) */}
                  {glaserResult.hasCondens && (
                    <div className="mt-2 px-2 py-1 rounded bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-slate-500">
                        Bilanț net (acumulat iarna − evaporat vara):
                      </span>
                      <span className={cn(
                        "font-bold",
                        glaserResult.balancePerYear_kg_m2 <= 0 ? "text-emerald-300" :
                          glaserResult.balancePerYear_kg_m2 < 0.5 ? "text-amber-300" : "text-red-300"
                      )}>
                        {glaserResult.balancePerYear_kg_m2.toFixed(3)} kg/m²·an
                      </span>
                    </div>
                  )}

                  {/* Notă μ lipsă (lipsă date — calc aproximativ) */}
                  {element.layers.some(l => !l.mu) && (
                    <div className="mt-2 px-2 py-1 rounded bg-amber-500/5 border border-amber-700/20 text-[8px] text-amber-200/70 font-mono italic">
                      ⚠ Unele straturi nu au μ (permeabilitate vapori) definit — calculul Glaser folosește valori implicite. Pentru rezultate precise, completează μ în Editor avansat.
                    </div>
                  )}

                  {!selectedClimate?.temp_month && (
                    <div className="mt-2 px-2 py-1 rounded bg-slate-800/40 border border-slate-700/40 text-[8px] text-slate-600 font-mono italic">
                      ℹ Folosit climat default Zone II (București). Pentru climat real, completează din Pas 1.
                    </div>
                  )}
                </div>
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
                <div className="flex gap-1.5">
                  {/* P2-5: Salvează + duplică pentru a crea rapid mai multe orientări */}
                  <button
                    onClick={handleSaveAndDuplicate}
                    disabled={!canSave}
                    title="Salvează acest element și deschide din nou wizard cu aceleași straturi pentru duplicare rapidă (alta orientare/arie)"
                    className={cn(
                      "px-3 py-1.5 text-[11px] rounded font-medium transition-all",
                      canSave ? "border border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20" : "border border-slate-800 bg-slate-800 text-slate-600 cursor-not-allowed"
                    )}
                  >+ Salvează & duplică</button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
