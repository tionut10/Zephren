/**
 * WizardGlazing — „Adaugă element vitrat în 3 pași" — v3 TEHNIC
 *
 * Îmbunătățiri vizuale v3:
 *   - Header cu SVG cross-section fereastră + badge ISO 10077-1:2017
 *   - Formulă ISO 10077-1 afișată live în Pas 2:
 *       U_tot = U_gl × (1-fr) + U_fr × fr + ΔU_spacer
 *   - Tabel breakdown detaliat componente în Pas 3
 *   - ConformityGauge bară U vs U_ref
 *   - Parametri tehnici extinși per vitraj (gas, coating, τ_vis)
 *   - Badge-uri normative ISO 10077-1:2017 · SR EN 673 · nZEB
 */

import { useState, useMemo, useEffect } from "react";
import { Select, Input, cn } from "../ui.jsx";
import SuggestionPanel from "../SuggestionPanel.jsx";
import { suggestForGlazingElement } from "../../data/suggestions-catalog.js";
import {
  GLAZING_DB,
  FRAME_DB,
  SPACER_TYPES,
  getURefGlazing,
  computeUTotal,
} from "./utils/glazingCalc.js";

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV", "Orizontal"];

// ── TechBadge ─────────────────────────────────────────────────────────────────
function TechBadge({ label, accent }) {
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono tracking-wide",
      accent
        ? "border-violet-700/50 bg-violet-500/10 text-violet-400/80"
        : "border-slate-600/50 bg-slate-800/70 text-slate-500"
    )}>
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
                <div className="text-[8px] text-slate-700 mt-0.5 text-center max-w-[80px] leading-tight">
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

// ── ConformityGauge ───────────────────────────────────────────────────────────
function ConformityGauge({ u, uRef, status }) {
  if (!u || !uRef) return null;
  const max    = uRef * 2.2;
  const uPct   = Math.min(98, (u / max) * 100);
  const refPct = (uRef / max) * 100;

  return (
    <div className="space-y-1 mt-2">
      <div className="flex justify-between text-[8px] text-slate-600 font-mono">
        <span>0.00</span>
        <span className="text-violet-400/70">U_ref nZEB = {uRef.toFixed(2)}</span>
        <span>{(uRef * 2.2).toFixed(2)}</span>
      </div>
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div className="absolute left-0 top-0 h-full bg-emerald-500/15 rounded-l-full" style={{ width: `${refPct}%` }} />
        <div className="absolute top-0 h-full bg-red-500/8"                            style={{ left: `${refPct}%`, right: 0 }} />
        <div className="absolute top-0 w-px h-full bg-violet-500/60"                  style={{ left: `${refPct}%` }} />
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

// ── ComponentBar — contribuție vizuală U vitraj vs ramă vs spacer ─────────────
function ComponentBar({ uGlass, uFrame, uSpacer, frameRatio, total }) {
  if (!total) return null;
  const fr     = parseFloat(frameRatio) / 100;
  const contGl = Math.abs((uGlass  * (1 - fr)) / total * 100);
  const contFr = Math.abs((uFrame  * fr)        / total * 100);
  const contSp = Math.abs((uSpacer)              / total * 100);

  return (
    <div className="mt-2 space-y-1">
      <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono">
        Contribuție componente la U total
      </div>
      <div className="flex h-4 rounded overflow-hidden gap-px bg-slate-900">
        <div className="bg-sky-500/50 transition-all" style={{ width: `${contGl}%` }} title={`Vitraj: ${contGl.toFixed(1)}%`} />
        <div className="bg-violet-500/50 transition-all" style={{ width: `${contFr}%` }} title={`Ramă: ${contFr.toFixed(1)}%`} />
        <div className="bg-amber-500/40 transition-all" style={{ width: `${contSp}%` }} title={`ΔU spacer: ${contSp.toFixed(1)}%`} />
      </div>
      <div className="flex gap-3 text-[8px] font-mono text-slate-600">
        <span><span className="text-sky-400/70">■</span> Vitraj {contGl.toFixed(0)}%</span>
        <span><span className="text-violet-400/70">■</span> Ramă {contFr.toFixed(0)}%</span>
        <span><span className="text-amber-400/60">■</span> Spacer {contSp.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
export default function WizardGlazing({
  onSave,
  onClose,
  buildingCategory,
  lang = "RO",
}) {
  const [step, setStep] = useState(1);
  const [element, setElement] = useState({
    name:        "Fereastră nouă",
    orientation: "S",
    area:        "",
    isDoor:      false,
    glazingType: "Dublu vitraj Low-E",
    frameType:   "PVC (5 camere)",
    frameRatio:  "30",
    spacerId:    "warm_edge_std", // P1-1: ψ_spacer parametrizat
  });

  const calcResult = useMemo(
    () => computeUTotal(element.glazingType, element.frameType, element.frameRatio, element.area, element.spacerId),
    [element.glazingType, element.frameType, element.frameRatio, element.area, element.spacerId]
  );

  const uRef    = getURefGlazing(buildingCategory, element.isDoor);
  const uStatus = calcResult.u > 0
    ? (calcResult.u <= uRef ? "ok" : calcResult.u <= uRef * 1.25 ? "warn" : "fail")
    : null;

  const canGoStep2 = element.name.trim() && element.orientation && parseFloat(element.area) > 0;
  const canGoStep3 = element.glazingType && element.frameType && parseFloat(element.frameRatio) > 0;
  const canSave    = canGoStep3 && calcResult.u > 0;

  useEffect(() => {
    if (element.isDoor && element.name === "Fereastră nouă") {
      setElement(p => ({ ...p, name: "Ușă vitrată nouă" }));
    } else if (!element.isDoor && element.name === "Ușă vitrată nouă") {
      setElement(p => ({ ...p, name: "Fereastră nouă" }));
    }
  }, [element.isDoor]);

  const glazingSuggestions = useMemo(() => {
    if (step !== 3 || !calcResult?.u) return { glazings: [], frames: [] };
    return suggestForGlazingElement({
      uTarget:      uRef,
      isDoor:       element.isDoor,
      preferredTags: uStatus === "fail" ? ["nZEB"] : [],
      limit: 3,
    });
  }, [step, calcResult?.u, uRef, element.isDoor, uStatus]);

  const handleSave = () => {
    if (!canSave) return;
    onSave?.({
      name:       element.name,
      orientation: element.orientation,
      area:        element.area,
      glazingType: element.glazingType,
      frameType:   element.frameType,
      frameRatio:  element.frameRatio,
      spacerId:    element.spacerId,
      u:           calcResult.u.toFixed(2),
      g:           calcResult.g.toFixed(2),
      uFrame:      calcResult.uFrame,
      psiSpacer:   calcResult.psiSpacer,
    });
    onClose?.();
  };

  // Date vitraj și ramă selectate curent
  const selGlazing = GLAZING_DB.find(g => g.name === element.glazingType);
  const selFrame   = FRAME_DB.find(f => f.name === element.frameType);
  const fr         = parseFloat(element.frameRatio) / 100;

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
            {/* SVG: cross-section fereastră */}
            <div className="w-10 h-10 flex items-center justify-center rounded border border-slate-700/60 bg-slate-800/60 shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                {/* Ramă */}
                <rect x="2"  y="2"  width="18" height="18" rx="1" stroke="#64748b" strokeWidth="1.2" fill="none"/>
                {/* Geam */}
                <rect x="4"  y="4"  width="14" height="14" rx="0.5" fill="#7dd3fc" opacity="0.15"/>
                {/* Traversă orizontală */}
                <line x1="2" y1="11" x2="20" y2="11" stroke="#475569" strokeWidth="0.8"/>
                {/* Traversă verticală */}
                <line x1="11" y1="2" x2="11" y2="20" stroke="#475569" strokeWidth="0.8"/>
                {/* Reflexie */}
                <line x1="5" y1="5" x2="8" y2="8" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">Element vitrat — Wizard</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <TechBadge label="ISO 10077-1:2017" />
                <TechBadge label="SR EN 673" />
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
            labels={["Identificare", "Vitraj + Ramă", "Verificare"]}
            sublabels={["Tip · Orientare · Arie", "Tip vitraj · Ramă · fr", "U tot · g · Conformitate"]}
          />

          {/* ════════════ PAS 1 — Identificare ════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
                <span className="font-mono text-violet-500/80 text-xs">§1</span>
                <span>Alege categoria elementului vitrat și definește parametrii geometrici.</span>
              </div>

              {/* Selector fereastră / ușă */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Categorie element vitrat</span>
                  <TechBadge label="Mc 001-2022 §6" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      isDoor: false,
                      icon:   "🪟",
                      label:  "Fereastră",
                      sub:    "Ușă balcon · Lucarnă",
                      uRefLabel: uRef && !element.isDoor ? `U_ref nZEB ≤ ${getURefGlazing(buildingCategory, false).toFixed(2)} W/(m²·K)` : null,
                    },
                    {
                      isDoor: true,
                      icon:   "🚪",
                      label:  "Ușă vitrată",
                      sub:    "Intrare · Terasă",
                      uRefLabel: uRef && element.isDoor  ? `U_ref nZEB ≤ ${getURefGlazing(buildingCategory, true).toFixed(2)} W/(m²·K)` : null,
                    },
                  ].map(({ isDoor, icon, label, sub }) => {
                    const uR = getURefGlazing(buildingCategory, isDoor);
                    return (
                      <button
                        key={String(isDoor)}
                        onClick={() => setElement(p => ({ ...p, isDoor }))}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-4 rounded border-2 transition-all",
                          element.isDoor === isDoor
                            ? "border-violet-500/70 bg-violet-500/8 text-violet-200"
                            : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600 text-slate-400"
                        )}
                      >
                        <span className="text-3xl">{icon}</span>
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[9px] text-slate-600">{sub}</span>
                        <div className="mt-1 px-2 py-0.5 rounded border border-slate-700/50 bg-slate-800/60 text-[8px] font-mono text-slate-500">
                          U_ref ≤ {uR.toFixed(2)} W/(m²·K)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parametri geometrici */}
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mb-2">Parametri geometrici</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Denumire" value={element.name} onChange={v => setElement(p => ({ ...p, name: v }))} className="sm:col-span-2" />
                  <Select label="Orientare" value={element.orientation} onChange={v => setElement(p => ({ ...p, orientation: v }))} options={ORIENTATIONS} />
                  <Input label="Suprafață totală (toc inclus)" value={element.area} onChange={v => setElement(p => ({ ...p, area: v }))} type="number" unit="m²" min="0" step="0.01" />
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
                >Continuă → Vitraj și Ramă</button>
              </div>
            </div>
          )}

          {/* ════════════ PAS 2 — Vitraj + Ramă ════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
                <span className="font-mono text-violet-500/80 text-xs">§2</span>
                <span>Alege tipul vitrajului și al ramei. Formula:
                  <span className="font-mono text-violet-300/70 ml-1">
                    U_tot = U_gl·(1-fr) + U_fr·fr + ΔU_sp
                  </span>
                </span>
              </div>

              {/* ─ Vitraj selector ─ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    Tip vitraj ({GLAZING_DB.length} opțiuni)
                  </span>
                  <TechBadge label="SR EN 673" />
                </div>

                {/* Header coloană */}
                <div className="grid grid-cols-[32px_1fr_52px_44px] gap-1 px-2 py-1 text-[8px] text-slate-600 uppercase tracking-widest font-mono border-b border-slate-800/60 mb-1">
                  <span></span>
                  <span>Descriere vitraj</span>
                  <span className="text-right">U (W/m²K)</span>
                  <span className="text-right">g (—)</span>
                </div>

                <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
                  {GLAZING_DB.map(gl => (
                    <button
                      key={gl.name}
                      onClick={() => setElement(p => ({ ...p, glazingType: gl.name }))}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded border-2 transition-all text-left",
                        element.glazingType === gl.name
                          ? "border-sky-500/60 bg-sky-500/8"
                          : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/30"
                      )}
                    >
                      <span className="text-lg shrink-0 w-8 text-center">{gl.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-200 truncate">{gl.name}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5 font-mono truncate">{gl.desc}</div>
                      </div>
                      <div className={cn(
                        "text-right shrink-0 font-mono px-1.5 py-0.5 rounded border text-[11px] font-bold",
                        element.glazingType === gl.name
                          ? "border-sky-600/50 bg-sky-500/10 text-sky-300"
                          : "border-slate-700/50 text-slate-400"
                      )}>
                        {gl.u}
                      </div>
                      <div className="text-right shrink-0 text-[10px] font-mono text-slate-600 w-11">
                        {gl.g}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Ramă selector ─ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    Tip ramă ({FRAME_DB.length} opțiuni)
                  </span>
                  <TechBadge label="ISO 10077-2" />
                </div>

                {/* Header coloană */}
                <div className="grid grid-cols-[32px_1fr_52px] gap-1 px-2 py-1 text-[8px] text-slate-600 uppercase tracking-widest font-mono border-b border-slate-800/60 mb-1">
                  <span></span>
                  <span>Material · caracteristici</span>
                  <span className="text-right">U (W/m²K)</span>
                </div>

                <div className="space-y-0.5 max-h-44 overflow-y-auto pr-0.5">
                  {FRAME_DB.map(fr => (
                    <button
                      key={fr.name}
                      onClick={() => setElement(p => ({ ...p, frameType: fr.name }))}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded border-2 transition-all text-left",
                        element.frameType === fr.name
                          ? "border-violet-500/60 bg-violet-500/8"
                          : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/30"
                      )}
                    >
                      <span className="text-lg shrink-0 w-8 text-center">{fr.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-slate-200 truncate">{fr.name}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5 font-mono truncate">{fr.desc}</div>
                      </div>
                      <div className={cn(
                        "text-right shrink-0 font-mono px-1.5 py-0.5 rounded border text-[11px] font-bold",
                        element.frameType === fr.name
                          ? "border-violet-600/50 bg-violet-500/10 text-violet-300"
                          : "border-slate-700/50 text-slate-400"
                      )}>
                        {fr.u}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─ Fracție ramă ─ */}
              <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Fracție ramă (fr)</div>
                    <div className="text-[8px] text-slate-700 font-mono mt-0.5">ISO 10077-1 §6.2 — tipic 20–35% pentru ferestre standard</div>
                  </div>
                  <div className="text-xl font-bold font-mono text-violet-300">{element.frameRatio}%</div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={element.frameRatio}
                  onChange={e => setElement(p => ({ ...p, frameRatio: e.target.value }))}
                  className="w-full accent-violet-500 h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-700 mt-1">
                  <span>10% min.</span>
                  <span className="text-slate-600">30% tipic</span>
                  <span>50% max.</span>
                </div>
              </div>

              {/* ─ ψ_spacer (P1-1 fix: parametrizat în loc de heuristic 0.04/0.08) ─ */}
              <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Distanțier vitraj (ψ_spacer)</div>
                    <div className="text-[8px] text-slate-700 font-mono mt-0.5">EN ISO 10077-1:2017 Annex E — punte termică joncțiune ramă-geam</div>
                  </div>
                  <TechBadge label="ISO 10077-1 §E" />
                </div>
                <div className="space-y-1">
                  {SPACER_TYPES.map(sp => {
                    const selected = element.spacerId === sp.id;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => setElement(p => ({ ...p, spacerId: sp.id }))}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded border-2 text-left transition-all",
                          selected
                            ? "border-amber-500/60 bg-amber-500/8"
                            : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/30"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-slate-200 truncate">{sp.label}</div>
                          <div className="text-[8px] text-slate-600 font-mono truncate">{sp.desc}</div>
                        </div>
                        <div className={cn(
                          "shrink-0 font-mono px-1.5 py-0.5 rounded border text-[10px] font-bold",
                          selected
                            ? "border-amber-600/50 bg-amber-500/10 text-amber-300"
                            : "border-slate-700/50 text-slate-500"
                        )}>
                          ψ={sp.psi.toFixed(3)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─ Preview formulă live ISO 10077-1 ─ */}
              <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Formulă ISO 10077-1 — live</span>
                  <TechBadge label="ISO 10077-1:2017" accent />
                </div>
                {selGlazing && selFrame && (
                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                    <div className="text-slate-600">
                      U_gl={selGlazing.u} × (1−{element.frameRatio}%) + U_fr={selFrame.u} × {element.frameRatio}% + ΔU_sp
                    </div>
                    <div className="text-[9px] text-slate-700">
                      = {(selGlazing.u * (1 - fr)).toFixed(3)} + {(selFrame.u * fr).toFixed(3)} + {calcResult.deltaUSpacer?.toFixed(3) ?? "0.000"}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-800/60">
                  <span className="text-[9px] text-slate-500 font-mono">U total</span>
                  <div className={cn(
                    "text-2xl font-bold font-mono",
                    uStatus === "ok"   ? "text-emerald-400" :
                    uStatus === "warn" ? "text-amber-400"   :
                    uStatus === "fail" ? "text-red-400"     : "text-slate-200"
                  )}>
                    {calcResult.u.toFixed(2)}
                    <span className="text-[10px] font-normal text-slate-600 ml-1">W/(m²·K)</span>
                  </div>
                </div>
              </div>

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
                <span>Verificare U total și conformitate nZEB. Salvează pentru a adăuga în proiect.</span>
              </div>

              {/* Fișă element vitrat */}
              <div className="rounded border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700/40 flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">FIȘĂ ELEMENT VITRAT</span>
                  <div className="flex gap-1.5">
                    <TechBadge label={element.isDoor ? "UȘĂ" : "FEREASTR."} />
                    <TechBadge label={element.orientation} />
                  </div>
                </div>

                {/* Metadate */}
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-slate-800/60">
                  {[
                    { label: "Denumire",       value: element.name,       mono: false },
                    { label: "Suprafață",       value: `${parseFloat(element.area || 0).toFixed(2)} m²`, mono: true },
                    { label: "Fracție ramă",    value: `${element.frameRatio}%`, mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="px-3 py-2">
                      <div className="text-[8px] text-slate-600 uppercase tracking-wider">{label}</div>
                      <div className={cn("text-[12px] text-slate-200 mt-0.5", mono && "font-mono")}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Compoziție */}
                <div className="px-3 py-2 border-t border-slate-800/60">
                  <div className="text-[8px] text-slate-600 uppercase tracking-wider mb-1">Compoziție alcătuire</div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    {element.glazingType}
                    <span className="text-slate-600 mx-1.5">+</span>
                    {element.frameType}
                  </div>
                </div>

                {/* Tabel breakdown detaliat */}
                <div className="border-t border-slate-800/60">
                  <div className="grid grid-cols-[1fr_64px_52px_72px] gap-1 px-3 py-1 bg-slate-800/40 border-b border-slate-800/60 text-[8px] text-slate-600 uppercase tracking-wider font-mono">
                    <span>Componentă</span>
                    <span className="text-right">U (W/m²K)</span>
                    <span className="text-right">Pondere</span>
                    <span className="text-right">Contribuție</span>
                  </div>

                  {[
                    {
                      label: `Vitraj — ${element.glazingType}`,
                      u:     calcResult.uGlass,
                      pct:   `${((1 - fr) * 100).toFixed(0)}%`,
                      cont:  calcResult.uGlass * (1 - fr),
                      color: "text-sky-300",
                    },
                    {
                      label: `Ramă — ${element.frameType}`,
                      u:     calcResult.uFrame,
                      pct:   `${(fr * 100).toFixed(0)}%`,
                      cont:  calcResult.uFrame * fr,
                      color: "text-violet-300",
                    },
                    {
                      label: "ΔU spacer (punte liniară)",
                      u:     calcResult.deltaUSpacer,
                      pct:   "—",
                      cont:  calcResult.deltaUSpacer,
                      color: "text-amber-300",
                    },
                  ].map(({ label, u, pct, cont, color }) => (
                    <div key={label} className="grid grid-cols-[1fr_64px_52px_72px] gap-1 px-3 py-1.5 border-b border-slate-800/30 text-[10px] font-mono hover:bg-slate-800/20 transition-colors">
                      <span className="text-slate-300 truncate">{label}</span>
                      <span className={cn("text-right font-semibold", color)}>{u?.toFixed(3)}</span>
                      <span className="text-right text-slate-600">{pct}</span>
                      <span className="text-right text-slate-400">{cont?.toFixed(3)}</span>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="grid grid-cols-[1fr_64px_52px_72px] gap-1 px-3 py-2 bg-slate-800/40 text-[11px] font-mono font-semibold">
                    <span className="text-slate-400 uppercase text-[9px] tracking-wider">U TOTAL</span>
                    <span className="text-right col-span-2 text-slate-600 text-[9px]">ISO 10077-1</span>
                    <span className={cn(
                      "text-right text-lg",
                      uStatus === "ok"   ? "text-emerald-400" :
                      uStatus === "warn" ? "text-amber-400"   :
                      uStatus === "fail" ? "text-red-400"     : "text-slate-200"
                    )}>
                      {calcResult.u.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* U + ConformityGauge */}
                <div className="p-4 border-t border-slate-700/40 bg-slate-800/20">
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono mb-1">
                        U total · ISO 10077-1:2017
                      </div>
                      <div className={cn(
                        "text-4xl font-bold font-mono tracking-tight",
                        uStatus === "ok"   ? "text-emerald-400" :
                        uStatus === "warn" ? "text-amber-400"   :
                        uStatus === "fail" ? "text-red-400"     : "text-slate-200"
                      )}>
                        {calcResult.u.toFixed(2)}
                      </div>
                      <div className="text-[9px] font-mono text-slate-600 mt-0.5">W/(m²·K)</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <div className="text-[8px] text-slate-600 font-mono">U_ref nZEB · Mc 001-2022</div>
                        <div className="text-2xl font-mono text-slate-400">{uRef.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-600 font-mono">g efectiv (−)</div>
                        <div className="text-lg font-mono text-slate-400">{calcResult.g.toFixed(2)}</div>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded border text-[9px] font-bold font-mono inline-block",
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

                  <ConformityGauge u={calcResult.u} uRef={uRef} status={uStatus} />

                  <ComponentBar
                    uGlass={calcResult.uGlass}
                    uFrame={calcResult.uFrame}
                    uSpacer={calcResult.deltaUSpacer}
                    frameRatio={element.frameRatio}
                    total={calcResult.u}
                  />
                </div>
              </div>

              {/* Sugestii */}
              {(glazingSuggestions.glazings.length > 0 || glazingSuggestions.frames.length > 0) && (
                <div className="space-y-2">
                  {glazingSuggestions.glazings.length > 0 && (
                    <SuggestionPanel
                      suggestions={glazingSuggestions.glazings}
                      title={uStatus === "fail" ? "Vitraje recomandate pentru U_ref nZEB" : "Vitraje alternative orientative"}
                      subtitle={`Tipuri de vitraj — ${element.isDoor ? "ușă vitrată" : "fereastră"} — neutru, fără marcă.`}
                      mode="card"
                      lang={lang}
                      showDisclaimer={false}
                    />
                  )}
                  {glazingSuggestions.frames.length > 0 && (
                    <SuggestionPanel
                      suggestions={glazingSuggestions.frames}
                      title="Rame tâmplărie compatibile"
                      subtitle="Combinații tipice pentru obținerea unui U total optim."
                      mode="card"
                      lang={lang}
                      showDisclaimer
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-between pt-2 border-t border-slate-800/60">
                <button onClick={() => setStep(2)} className="px-3 py-1.5 text-[11px] rounded border border-slate-700/50 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors">← Înapoi</button>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={cn(
                    "px-5 py-1.5 text-[11px] rounded font-semibold transition-all",
                    canSave ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  )}
                >✓ Salvează element vitrat</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
