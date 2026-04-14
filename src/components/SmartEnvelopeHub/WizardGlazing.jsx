/**
 * WizardGlazing — „Adaugă vitraj în 3 pași" (D5, S4).
 *
 * Overlay peste GlazingModal existent — selectare vizuală + calcul auto.
 *
 * Pas 1 — Identificare : orientare + arie + nume + categorie (fereastră / ușă vitrată)
 * Pas 2 — Vitraj + ramă: selector vizual cu 7 tipuri vitraj + 6 tipuri ramă + slider fracție ramă
 * Pas 3 — Verificare   : preview U total (cu ψ_spacer) + g efectiv + conformitate
 *
 * Formula U total = U_vitraj * (1 - fr) + U_ramă * fr + ΔU_spacer  (ISO 10077-1)
 * Identică cu GlazingModal — reutilizăm calculul pentru consistență.
 */

import { useState, useMemo, useEffect } from "react";
import { Select, Input, cn } from "../ui.jsx";
import {
  GLAZING_DB,
  FRAME_DB,
  getURefGlazing,
  computeUTotal,
} from "./utils/glazingCalc.js";

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV", "Orizontal"];

// ── Step indicator (identic cu WizardOpaque) ─────────────────────────────────
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
export default function WizardGlazing({
  onSave,
  onClose,
  buildingCategory,
  lang = "RO",
}) {
  const [step, setStep] = useState(1);
  const [element, setElement] = useState({
    name: "Fereastră nouă",
    orientation: "S",
    area: "",
    isDoor: false,
    glazingType: "Dublu vitraj Low-E",
    frameType: "PVC (5 camere)",
    frameRatio: "30",
  });

  // ── Calcul U live ──────────────────────────────────────────────────────────
  const calcResult = useMemo(
    () => computeUTotal(element.glazingType, element.frameType, element.frameRatio, element.area),
    [element.glazingType, element.frameType, element.frameRatio, element.area]
  );

  const uRef = getURefGlazing(buildingCategory, element.isDoor);
  const uStatus = calcResult.u > 0
    ? (calcResult.u <= uRef ? "ok" : calcResult.u <= uRef * 1.25 ? "warn" : "fail")
    : null;

  // ── Validare pași ──────────────────────────────────────────────────────────
  const canGoStep2 = element.name.trim() && element.orientation && parseFloat(element.area) > 0;
  const canGoStep3 = element.glazingType && element.frameType && parseFloat(element.frameRatio) > 0;
  const canSave = canGoStep3 && calcResult.u > 0;

  // Auto-update denumire când schimbă ușa
  useEffect(() => {
    if (element.isDoor && element.name === "Fereastră nouă") {
      setElement(p => ({ ...p, name: "Ușă vitrată nouă" }));
    } else if (!element.isDoor && element.name === "Ușă vitrată nouă") {
      setElement(p => ({ ...p, name: "Fereastră nouă" }));
    }
  }, [element.isDoor]);

  // ── Handler salvare ────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!canSave) return;
    onSave?.({
      name: element.name,
      orientation: element.orientation,
      area: element.area,
      glazingType: element.glazingType,
      frameType: element.frameType,
      frameRatio: element.frameRatio,
      u: calcResult.u.toFixed(2),
      g: calcResult.g.toFixed(2),
      uFrame: calcResult.uFrame,
    });
    onClose?.();
  };

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
            <span className="text-2xl">🪟</span>
            <div>
              <h3 className="text-lg font-bold text-white">Adaugă element vitrat</h3>
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
          labels={["Identificare", "Vitraj + Ramă", "Verificare"]}
        />

        {/* ════════════ PAS 1 — Identificare ════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs text-violet-200/70">
              Alege categoria (fereastră sau ușă vitrată) și setează orientarea și suprafața.
            </div>

            {/* Fereastră vs. ușă */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setElement(p => ({ ...p, isDoor: false }))}
                className={cn(
                  "flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all",
                  !element.isDoor
                    ? "border-violet-500 bg-violet-500/10 text-violet-200"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/70"
                )}
              >
                <span className="text-3xl">🪟</span>
                <span className="text-xs font-medium">Fereastră</span>
                <span className="text-[9px] opacity-50">U ref nZEB ≤ 1.11</span>
              </button>
              <button
                onClick={() => setElement(p => ({ ...p, isDoor: true }))}
                className={cn(
                  "flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all",
                  element.isDoor
                    ? "border-violet-500 bg-violet-500/10 text-violet-200"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/70"
                )}
              >
                <span className="text-3xl">🚪</span>
                <span className="text-xs font-medium">Ușă vitrată</span>
                <span className="text-[9px] opacity-50">U ref ≤ 1.30</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Denumire"
                value={element.name}
                onChange={v => setElement(p => ({ ...p, name: v }))}
                className="sm:col-span-2"
              />
              <Select
                label="Orientare"
                value={element.orientation}
                onChange={v => setElement(p => ({ ...p, orientation: v }))}
                options={ORIENTATIONS}
              />
              <Input
                label="Suprafață totală"
                value={element.area}
                onChange={v => setElement(p => ({ ...p, area: v }))}
                type="number"
                unit="m²"
                min="0"
                step="0.1"
              />
            </div>

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
              >Înainte → Vitraj</button>
            </div>
          </div>
        )}

        {/* ════════════ PAS 2 — Vitraj + Ramă ════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-xs text-violet-200/70">
              Alege tipul vitrajului și al ramei. Sistemul calculează automat U-ul total.
            </div>

            {/* Vitraj selector */}
            <div>
              <div className="text-[11px] text-white/60 mb-2">Tip vitraj ({GLAZING_DB.length} opțiuni)</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {GLAZING_DB.map(gl => (
                  <button
                    key={gl.name}
                    onClick={() => setElement(p => ({ ...p, glazingType: gl.name }))}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left",
                      element.glazingType === gl.name
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="text-xl shrink-0">{gl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{gl.name}</div>
                      <div className="text-[10px] opacity-60">{gl.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-semibold">U={gl.u}</div>
                      <div className="text-[10px] opacity-50">g={gl.g}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ramă selector */}
            <div>
              <div className="text-[11px] text-white/60 mb-2">Tip ramă ({FRAME_DB.length} opțiuni)</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {FRAME_DB.map(fr => (
                  <button
                    key={fr.name}
                    onClick={() => setElement(p => ({ ...p, frameType: fr.name }))}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all text-left",
                      element.frameType === fr.name
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="text-lg shrink-0">{fr.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{fr.name}</div>
                      <div className="text-[9px] opacity-60">{fr.desc}</div>
                    </div>
                    <div className="text-xs font-mono font-semibold shrink-0">U={fr.u}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fracție ramă slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] text-white/60">Fracție ramă</div>
                <div className="text-xs font-mono text-violet-300">{element.frameRatio}%</div>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={element.frameRatio}
                onChange={e => setElement(p => ({ ...p, frameRatio: e.target.value }))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-[9px] opacity-40 mt-0.5">
                <span>10%</span>
                <span className="text-white/50">30% tipic</span>
                <span>50%</span>
              </div>
            </div>

            {/* Preview rapid U */}
            <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider opacity-50">U total preview</div>
                <div className={cn(
                  "text-2xl font-bold font-mono",
                  uStatus === "ok"   ? "text-emerald-400" :
                  uStatus === "warn" ? "text-amber-400"   :
                  uStatus === "fail" ? "text-red-400"     : "text-white"
                )}>
                  {calcResult.u.toFixed(2)}
                </div>
              </div>
            </div>

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
              Verifică rezultatul final. Salvează pentru a adăuga la listă.
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <div className="text-[10px] text-white/40">Element</div>
                  <div className="font-medium">{element.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Orientare · Suprafață</div>
                  <div className="font-medium font-mono">{element.orientation} · {parseFloat(element.area).toFixed(1)} m²</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-white/40">Compoziție</div>
                  <div className="text-[11px]">
                    {element.glazingType} + {element.frameType} ({element.frameRatio}% ramă)
                  </div>
                </div>
              </div>

              {/* U result big */}
              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40">U total</div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    uStatus === "ok"   ? "text-emerald-400" :
                    uStatus === "warn" ? "text-amber-400"   :
                    uStatus === "fail" ? "text-red-400"     : "text-white"
                  )}>
                    {calcResult.u.toFixed(2)}
                  </div>
                  <div className="text-[10px] opacity-30">W/(m²·K)</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40">Referință nZEB</div>
                  <div className="text-lg font-mono text-white/70">{uRef.toFixed(2)}</div>
                  <div className={cn(
                    "text-[10px] font-semibold mt-1",
                    uStatus === "ok"   ? "text-emerald-400" :
                    uStatus === "warn" ? "text-amber-400"   :
                                         "text-red-400"
                  )}>
                    {uStatus === "ok"   ? "✓ CONFORM"    :
                     uStatus === "warn" ? "⚠ ACCEPTABIL" :
                                          "✗ NECONFORM"}
                  </div>
                </div>
              </div>

              {/* Breakdown detaliat */}
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-white/50">U vitraj:</span>
                  <span className="font-mono">{calcResult.uGlass.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">U ramă:</span>
                  <span className="font-mono">{calcResult.uFrame.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">ΔU spacer:</span>
                  <span className="font-mono">{calcResult.deltaUSpacer.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">g efectiv:</span>
                  <span className="font-mono">{calcResult.g.toFixed(2)}</span>
                </div>
              </div>
            </div>

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
              >✓ Salvează vitraj</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
