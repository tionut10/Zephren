/**
 * WizardBridges — „Identifică punți termice" (S4).
 *
 * Quick-pick vizual pe 6 categorii principale × top 4 tipuri frecvente.
 * Flux: selectează tip → introduce lungime → adaugă la listă → repetă → aplică bulk.
 *
 * Categoriile avansate (fațade cortină, structuri speciale, etc.) rămân accesibile
 * prin ThermalBridgeCatalog existent (link „Catalog extins (165 SVG)").
 *
 * Props:
 *   - onAddBulk(bridges[])   : handler care primește array de punți (append la thermalBridges)
 *   - onClose()              : închide wizard
 *   - onOpenCatalog()        : deschide ThermalBridgeCatalog extins
 *   - building               : pentru sugestii de lungimi (perimeter, nivele)
 *   - existingBridges        : pentru avertisment „deja ai X punți de acest tip"
 */

import { useState, useMemo } from "react";
import { cn, Input } from "../ui.jsx";
import {
  MAIN_CATEGORIES,
  getQuickPicks,
  suggestLength,
} from "./utils/bridgesCalc.js";

// ── Component principal ──────────────────────────────────────────────────────
export default function WizardBridges({
  onAddBulk,
  onClose,
  onOpenCatalog,
  building,
  existingBridges = [],
}) {
  const [activeCat, setActiveCat] = useState("Joncțiuni pereți");
  const [queue, setQueue] = useState([]); // punți adăugate înainte de apply
  const [showCustomLength, setShowCustomLength] = useState(null); // idx bridge curent pt custom

  const quickPicks = useMemo(() => getQuickPicks(activeCat), [activeCat]);

  // ── Handler adaugă în queue ─────────────────────────────────────────────────
  const addToQueue = (bridge, length) => {
    const len = parseFloat(length) || 0;
    if (len <= 0) return;
    setQueue(prev => [...prev, {
      name: bridge.name,
      cat: bridge.cat,
      psi: bridge.psi,
      length: len,
      _key: `${bridge.name}-${Date.now()}`,
    }]);
    setShowCustomLength(null);
  };

  const addWithSuggested = (bridge) => {
    const suggested = suggestLength(bridge.name, building);
    addToQueue(bridge, suggested);
  };

  const removeFromQueue = (idx) => {
    setQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQueueLength = (idx, newLength) => {
    setQueue(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], length: parseFloat(newLength) || 0 };
      return next;
    });
  };

  // ── Totale ────────────────────────────────────────────────────────────────
  const totalLoss = queue.reduce((s, q) => s + (q.psi * q.length), 0);
  const totalLength = queue.reduce((s, q) => s + q.length, 0);

  // ── Handler apply final ───────────────────────────────────────────────────
  const handleApply = () => {
    if (queue.length === 0) return;
    const toApply = queue.map(({ _key, ...rest }) => rest);
    onAddBulk?.(toApply);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl shadow-violet-500/10"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            <div>
              <h3 className="text-lg font-bold text-white">Identifică punți termice</h3>
              <p className="text-[11px] text-violet-300/70">Quick-pick pe categorii · aplicare bulk la sfârșit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            aria-label="Închide wizard"
          >✕</button>
        </div>

        {/* Layout 2 coloane: categorii + queue */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">

          {/* ── Coloana stângă: navigare categorii + quick-picks ─────────── */}
          <div className="space-y-3">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {MAIN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all",
                    activeCat === cat.id
                      ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/60"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="text-[10px] text-white/40 italic">
              {MAIN_CATEGORIES.find(c => c.id === activeCat)?.hint}
            </div>

            {/* Quick-picks list */}
            <div className="space-y-2">
              {quickPicks.map((bridge, idx) => {
                const alreadyAdded = queue.filter(q => q.name === bridge.name).length;
                const isActiveCustom = showCustomLength === idx;
                const suggested = suggestLength(bridge.name, building);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium flex-1 truncate">{bridge.name}</span>
                      {alreadyAdded > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                          {alreadyAdded}× în listă
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-orange-400 shrink-0">
                        ψ={bridge.psi}
                      </span>
                    </div>

                    {isActiveCustom ? (
                      <div className="mt-2 flex items-end gap-2">
                        <div className="flex-1">
                          <div className="text-[9px] text-white/40 mb-0.5">Lungime (m)</div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={suggested}
                            id={`bridge-len-${idx}`}
                            autoFocus
                            className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs focus:outline-none focus:border-violet-500/50"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const val = document.getElementById(`bridge-len-${idx}`)?.value;
                            addToQueue(bridge, val);
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-violet-500 text-white hover:bg-violet-400 font-medium"
                        >+ Adaugă</button>
                        <button
                          onClick={() => setShowCustomLength(null)}
                          className="px-2 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
                        >✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => addWithSuggested(bridge)}
                          className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                          title={`Lungime sugerată ${suggested} m pe baza geometriei`}
                        >
                          ⚡ Sugerat ({suggested} m)
                        </button>
                        <button
                          onClick={() => setShowCustomLength(idx)}
                          className="text-[10px] px-2 py-1 rounded bg-white/[0.05] text-white/70 hover:bg-white/10"
                        >
                          ✏️ Lungime custom
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Catalog extins link */}
            <button
              onClick={() => { onOpenCatalog?.(); onClose?.(); }}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 text-left"
            >
              <span className="text-lg">📖</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Catalog extins (165 ilustrații SVG)</div>
                <div className="text-[10px] opacity-60">
                  Include fațade cortină, structuri metalice, mansarde, acoperișuri verzi...
                </div>
              </div>
              <span className="text-xs shrink-0">→</span>
            </button>
          </div>

          {/* ── Coloana dreaptă: queue + totale ──────────────────────────── */}
          <div className="md:border-l md:border-white/5 md:pl-4">
            <div className="text-[11px] text-white/60 mb-2 flex items-center justify-between">
              <span>Punți pregătite pentru adăugare</span>
              <span className="font-mono text-violet-300">{queue.length}</span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8 opacity-30 text-xs">
                Încă nimic în listă.<br />
                Alege o punte din stânga.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {queue.map((q, idx) => (
                  <div
                    key={q._key}
                    className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{q.name}</div>
                      <div className="text-[9px] opacity-50 font-mono">
                        ψ={q.psi} · {(q.psi * q.length).toFixed(2)} W/K
                      </div>
                    </div>
                    <input
                      type="number"
                      value={q.length}
                      onChange={e => updateQueueLength(idx, e.target.value)}
                      min="0"
                      step="0.5"
                      className="w-16 px-2 py-1 rounded bg-white/[0.03] border border-white/10 text-[11px] font-mono focus:outline-none focus:border-violet-500/50"
                    />
                    <span className="text-[9px] opacity-50">m</span>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="text-[10px] px-1.5 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      aria-label="Elimină din listă"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Total summary */}
            {queue.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/50">Total lungime:</span>
                  <span className="font-mono font-medium">{totalLength.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/60">Pierderi suplimentare:</span>
                  <span className="font-mono font-semibold text-orange-400">{totalLoss.toFixed(2)} W/K</span>
                </div>
              </div>
            )}

            {/* Existing count */}
            {existingBridges.length > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 text-[10px] text-amber-200/80">
                ℹ {existingBridges.length} punți deja în proiect — noile se adaugă, nu înlocuiesc.
              </div>
            )}
          </div>
        </div>

        {/* ── Buttons footer ────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-between mt-5 pt-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
          >Anulează</button>
          <button
            onClick={handleApply}
            disabled={queue.length === 0}
            className={cn(
              "px-6 py-2 text-sm rounded-lg font-semibold transition-all",
              queue.length > 0
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-white/[0.05] text-white/30 cursor-not-allowed"
            )}
          >
            ✓ Adaugă {queue.length} punți
          </button>
        </div>
      </div>
    </div>
  );
}
