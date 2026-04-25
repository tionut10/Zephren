/**
 * WizardOpaque — „Adaugă perete în 3 pași" (D5, S4).
 *
 * Înlocuiește OpaqueModal ca DEFAULT pentru „+Adaugă nou" în Hub.
 * OpaqueModal rămâne accesibilă ca „Editor avansat straturi" (pas 3) pentru experți.
 *
 * Pas 1 — Identificare  : tip element + orientare + arie + nume
 * Pas 2 — Straturi      : preset popular SAU straturi custom cu selector material
 * Pas 3 — Verificare    : preview U + badge conformitate + Salvează
 *
 * Props:
 *   - onSave(element)      : handler care primește element complet (append la opaqueElements)
 *   - onClose()            : închide wizard
 *   - onOpenAdvanced(el)   : deschide OpaqueModal cu elementul pre-populat (expert mode)
 *   - calcOpaqueR          : calculator R/U (din energy-calc.jsx)
 *   - buildingCategory     : pentru U_REF (nZEB rezidențial vs. nerezidențial)
 *   - lang                 : „RO" | „EN"
 *
 * Reutilizează FIX D3 (materials.json propaga TOATE câmpurile: lambda, rho, mu, cp, src).
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

// ── Step indicator compact ───────────────────────────────────────────────────
function StepIndicator({ current, total, labels }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 === current;
        const done = i + 1 < current;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold shrink-0 transition-colors",
              active ? "bg-violet-500 text-white" :
              done   ? "bg-violet-500/30 text-violet-200" :
                       "bg-white/[0.05] text-white/40"
            )}>
              {done ? "✓" : i + 1}
            </div>
            <span className={cn(
              "text-[11px] truncate",
              active ? "text-violet-200 font-medium" : "text-white/40"
            )}>
              {labels[i]}
            </span>
            {i < total - 1 && <div className="h-px flex-1 bg-white/[0.06]" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Component principal ──────────────────────────────────────────────────────
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
  const [matSearch, setMatSearch] = useState("");
  const [searchLayerIdx, setSearchLayerIdx] = useState(null);

  // ── Auto-update denumire la schimbare tip element ──────────────────────────
  useEffect(() => {
    const elType = ELEMENT_TYPES_WIZARD.find(t => t.id === element.type);
    if (elType && element.name === "Perete exterior" && element.type !== "PE") {
      setElement(p => ({ ...p, name: elType.label }));
    }
  }, [element.type]);

  // ── Calcul U live (pas 3) ──────────────────────────────────────────────────
  const uResult = useMemo(() => {
    if (!calcOpaqueR || !element.layers.length) return null;
    try {
      return calcOpaqueR(element.layers, element.type);
    } catch {
      return null;
    }
  }, [element.layers, element.type, calcOpaqueR]);

  const uRef = getURefNZEB(buildingCategory, element.type);
  const uStatus = uResult?.u && uRef
    ? (uResult.u <= uRef ? "ok" : uResult.u <= uRef * 1.3 ? "warn" : "fail")
    : null;

  // ── Presets disponibile pentru tipul selectat ──────────────────────────────
  const presets = LAYER_PRESETS[element.type] || [];

  // ── Handler: aplică preset ─────────────────────────────────────────────────
  const applyPreset = (preset) => {
    const layers = preset.layers.map(l => buildLayerFromMaterialName(l.material, l.thickness));
    setElement(p => ({ ...p, layers }));
    setSelectedPresetId(preset.id);
  };

  // ── Handler: adaugă strat gol ──────────────────────────────────────────────
  const addEmptyLayer = () => {
    setElement(p => ({
      ...p,
      layers: [...p.layers, { material: "", matName: "", thickness: "", lambda: 0, rho: 0, mu: 0, cp: 0, src: "" }],
    }));
    setSelectedPresetId(null);
  };

  const removeLayer = (idx) => {
    setElement(p => ({ ...p, layers: p.layers.filter((_, i) => i !== idx) }));
    setSelectedPresetId(null);
  };

  const updateLayer = (idx, key, val) => {
    setElement(p => {
      const layers = [...p.layers];
      layers[idx] = { ...layers[idx], [key]: val };
      return { ...p, layers };
    });
    setSelectedPresetId(null);
  };

  const selectMaterialForLayer = (idx, mat) => {
    setElement(p => {
      const layers = [...p.layers];
      layers[idx] = {
        ...layers[idx],
        material: mat.name,
        matName: mat.name,
        lambda: mat.lambda ?? 0,
        rho: mat.rho ?? 0,
        mu: mat.mu ?? 0,
        cp: mat.cp ?? 0,
        src: mat.src ?? "",
      };
      return { ...p, layers };
    });
    setSearchLayerIdx(null);
    setMatSearch("");
    setSelectedPresetId(null);
  };

  // ── Validare pași ──────────────────────────────────────────────────────────
  const canGoStep2 = element.name.trim() && element.type && element.orientation &&
                     parseFloat(element.area) > 0;
  const canGoStep3 = element.layers.length > 0 &&
                     element.layers.every(l => parseFloat(l.thickness) > 0 && parseFloat(l.lambda) > 0);
  const canSave = canGoStep3 && uResult?.u > 0;

  // ── Căutare materiale (pas 2) ──────────────────────────────────────────────
  const filteredMats = matSearch.length > 1
    ? MATERIALS_DB.filter(m =>
        m.name.toLowerCase().includes(matSearch.toLowerCase()) ||
        m.cat.toLowerCase().includes(matSearch.toLowerCase())
      ).slice(0, 12)
    : [];

  // ── Handler: salvare finală ────────────────────────────────────────────────
  const handleSave = () => {
    if (!canSave) return;
    onSave?.(element);
    onClose?.();
  };

  // ── Handler: editor avansat (D5) ───────────────────────────────────────────
  const handleOpenAdvanced = () => {
    onOpenAdvanced?.(element);
    onClose?.();
  };

  const elTypeLabel = ELEMENT_TYPES_WIZARD.find(t => t.id === element.type)?.label || element.type;

  // ── Sugestii orientative (fără brand) ────────────────────────────────────
  // Active în Pas 3 când avem U calculat și U_ref. Recomandă termoizolații
  // capabile să ducă elementul către U_ref nZEB.
  const opaqueSuggestions = useMemo(() => {
    if (step !== 3) return [];
    if (!uResult?.u || !uRef) return [];
    if (!element.type) return [];
    return suggestForOpaqueElement({
      elementType: element.type,
      uCurrent: uResult.u,
      uTarget: uRef,
      preferredTags: uStatus === "fail" ? ["nZEB"] : [],
      limit: 3,
    });
  }, [step, uResult?.u, uRef, element.type, uStatus]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl shadow-violet-500/10"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧭</span>
            <div>
              <h3 className="text-lg font-bold text-white">Adaugă element opac</h3>
              <p className="text-[11px] text-violet-300/70">Wizard ghidat în 3 pași</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            aria-label="Închide wizard"
          >✕</button>
        </div>

        <StepIndicator
          current={step}
          total={3}
          labels={["Identificare", "Straturi", "Verificare"]}
        />

        {/* ════════════ PAS 1 — Identificare ════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs text-violet-200/70 mb-2">
              Alege tipul elementului, orientarea și suprafața.
            </div>

            {/* Tip element — selector vizual 5 carduri */}
            <div>
              <div className="text-[11px] text-white/60 mb-2">Tip element</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ELEMENT_TYPES_WIZARD.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setElement(p => ({ ...p, type: t.id, layers: [] }))}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
                      element.type === t.id
                        ? "border-violet-500 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/70"
                    )}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Denumire"
                value={element.name}
                onChange={v => setElement(p => ({ ...p, name: v }))}
              />
              <Select
                label="Orientare"
                value={element.orientation}
                onChange={v => setElement(p => ({ ...p, orientation: v }))}
                options={ORIENTATIONS}
              />
              <Input
                label="Suprafață"
                value={element.area}
                onChange={v => setElement(p => ({ ...p, area: v }))}
                type="number"
                unit="m²"
                min="0"
                step="0.1"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-between pt-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
              >Anulează</button>
              <button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className={cn(
                  "px-6 py-2 text-sm rounded-lg font-medium transition-all",
                  canGoStep2
                    ? "bg-violet-500 text-white hover:bg-violet-400"
                    : "bg-white/[0.05] text-white/30 cursor-not-allowed"
                )}
              >Înainte → Straturi</button>
            </div>
          </div>
        )}

        {/* ════════════ PAS 2 — Straturi ════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-xs text-violet-200/70">
              Alege un preset popular sau adaugă straturi custom. <span className="opacity-60">Sensul: exterior → interior.</span>
            </div>

            {/* Presets populare */}
            {presets.length > 0 && (
              <div>
                <div className="text-[11px] text-white/60 mb-2">Preset-uri populare pentru {elTypeLabel}</div>
                <div className="space-y-2">
                  {presets.map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border-2 transition-all",
                        selectedPresetId === p.id
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-violet-300">📦</span>
                        <span className="text-xs font-semibold text-white/90">{p.label}</span>
                        <span className="ml-auto text-[10px] text-white/40">{p.layers.length} straturi</span>
                      </div>
                      <div className="text-[10px] text-white/50 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <div className="h-px flex-1 bg-white/10" />
              <span>SAU ADAUGĂ MANUAL</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Listă straturi curentă */}
            {element.layers.length === 0 ? (
              <div className="text-center py-6 opacity-30 text-xs">
                Niciun strat. Alege un preset sau „+ Adaugă strat".
              </div>
            ) : (
              <div className="space-y-2">
                {element.layers.map((layer, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-white/40 font-mono">#{idx + 1}</span>
                      <div className="flex-1 text-xs font-medium truncate">
                        {layer.material || <span className="text-white/30 italic">(fără material)</span>}
                      </div>
                      <button
                        onClick={() => setSearchLayerIdx(searchLayerIdx === idx ? null : idx)}
                        className="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 hover:bg-violet-500/25"
                      >
                        {searchLayerIdx === idx ? "Închide" : "Caută material"}
                      </button>
                      <button
                        onClick={() => removeLayer(idx)}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      >✕</button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <Input
                        label="Grosime"
                        value={layer.thickness}
                        onChange={v => updateLayer(idx, "thickness", v)}
                        type="number"
                        unit="mm"
                        min="0"
                      />
                      <div>
                        <div className="text-[9px] text-white/40 mb-0.5">λ (W/(m·K))</div>
                        <div className="px-2 py-1.5 rounded bg-white/[0.03] text-[11px] font-mono">
                          {layer.lambda || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-white/40 mb-0.5">R strat (m²K/W)</div>
                        <div className="px-2 py-1.5 rounded bg-white/[0.03] text-[11px] font-mono">
                          {layer.lambda > 0 && layer.thickness > 0
                            ? ((parseFloat(layer.thickness) / 1000) / parseFloat(layer.lambda)).toFixed(3)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Material search inline */}
                    {searchLayerIdx === idx && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <input
                          type="text"
                          value={matSearch}
                          onChange={e => setMatSearch(e.target.value)}
                          placeholder="Caută material (min 2 caractere)..."
                          autoFocus
                          className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs focus:outline-none focus:border-violet-500/50"
                        />
                        {filteredMats.length > 0 && (
                          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                            {filteredMats.map((mat, i) => (
                              <button
                                key={i}
                                onClick={() => selectMaterialForLayer(idx, mat)}
                                className="w-full text-left px-3 py-1.5 rounded bg-white/[0.02] hover:bg-violet-500/10 text-xs"
                              >
                                <div className="font-medium">{mat.name}</div>
                                <div className="text-[9px] opacity-50">
                                  {mat.cat} · λ={mat.lambda} · ρ={mat.rho}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addEmptyLayer}
              className="w-full py-2 rounded-lg border border-dashed border-white/15 hover:border-violet-500/40 hover:bg-violet-500/5 text-xs text-white/50 hover:text-violet-300 transition-all"
            >
              + Adaugă strat gol
            </button>

            {/* Buttons */}
            <div className="flex gap-3 justify-between pt-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
              >← Înapoi</button>
              <button
                onClick={() => setStep(3)}
                disabled={!canGoStep3}
                className={cn(
                  "px-6 py-2 text-sm rounded-lg font-medium transition-all",
                  canGoStep3
                    ? "bg-violet-500 text-white hover:bg-violet-400"
                    : "bg-white/[0.05] text-white/30 cursor-not-allowed"
                )}
              >Înainte → Verificare</button>
            </div>
          </div>
        )}

        {/* ════════════ PAS 3 — Verificare ════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-xs text-violet-200/70">
              Verifică rezultatul. Dacă ai nevoie de control fin (µ, cp, surse etc.), deschide editorul avansat.
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <div className="text-[10px] text-white/40">Element</div>
                  <div className="font-medium">{element.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Tip / Orientare</div>
                  <div className="font-medium">{elTypeLabel} · {element.orientation}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Suprafață</div>
                  <div className="font-medium font-mono">{parseFloat(element.area).toFixed(1)} m²</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Straturi</div>
                  <div className="font-medium">{element.layers.length}</div>
                </div>
              </div>

              {/* U result */}
              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40">Coeficient U</div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    uStatus === "ok"   ? "text-emerald-400" :
                    uStatus === "warn" ? "text-amber-400"   :
                    uStatus === "fail" ? "text-red-400"     : "text-white"
                  )}>
                    {uResult?.u ? uResult.u.toFixed(3) : "—"}
                  </div>
                  <div className="text-[10px] opacity-30">W/(m²·K)</div>
                </div>
                {uRef && (
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">Referință nZEB</div>
                    <div className="text-lg font-mono text-white/70">{uRef.toFixed(2)}</div>
                    <div className={cn(
                      "text-[10px] font-semibold mt-1",
                      uStatus === "ok"   ? "text-emerald-400" :
                      uStatus === "warn" ? "text-amber-400"   :
                                           "text-red-400"
                    )}>
                      {uStatus === "ok"   ? "✓ CONFORM"         :
                       uStatus === "warn" ? "⚠ ACCEPTABIL"      :
                       uStatus === "fail" ? "✗ NECONFORM"       : ""}
                    </div>
                  </div>
                )}
              </div>

              {/* R total */}
              {uResult && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/60">
                  <span>R total: <span className="font-mono font-medium text-white/80">{uResult.r_total?.toFixed(3) || "—"}</span> m²K/W</span>
                  <span>Grosime: <span className="font-mono font-medium text-white/80">
                    {element.layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0)}
                  </span> mm</span>
                </div>
              )}
            </div>

            {/* Sugestii orientative termoizolații (fără brand) */}
            {opaqueSuggestions.length > 0 && (
              <SuggestionPanel
                suggestions={opaqueSuggestions}
                title={
                  uStatus === "fail"
                    ? "Soluții recomandate pentru atingerea U_ref nZEB"
                    : uStatus === "warn"
                    ? "Soluții pentru a aduce elementul în clasa A"
                    : "Alternative orientative pentru element"
                }
                subtitle={`Termoizolații tipice piață RO 2025-2026 — fără nume de marcă. Pentru ${elTypeLabel}.`}
                mode="card"
                lang={lang}
              />
            )}

            {/* Editor avansat link (D5) */}
            <button
              onClick={handleOpenAdvanced}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 text-left transition-all"
            >
              <span className="text-lg">⚙️</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Editor avansat straturi</div>
                <div className="text-[10px] opacity-60 mt-0.5">Control total: µ vapori, cp, surse normative, analiză Glaser.</div>
              </div>
              <span className="text-indigo-300/40 text-xs">→</span>
            </button>

            {/* Buttons */}
            <div className="flex gap-3 justify-between pt-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
              >← Înapoi</button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  "px-6 py-2 text-sm rounded-lg font-semibold transition-all",
                  canSave
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-white/[0.05] text-white/30 cursor-not-allowed"
                )}
              >✓ Salvează element</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
