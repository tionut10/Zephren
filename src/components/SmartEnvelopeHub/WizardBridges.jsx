/**
 * WizardBridges — „Identifică punți termice" — v3 TEHNIC
 *
 * Îmbunătățiri vizuale v3:
 *   - Header cu SVG thermal bridge + badge-uri ISO 10211:2017 · ISO 14683:2017
 *   - Valoare ψ color-codată pe severitate (verde/galben/portocaliu/roșu)
 *   - Bara ψ vizuală proporțională per quick-pick
 *   - Queue cu contribuție ψ×L individuală și running ΔH total
 *   - Rezumat impact: W/K total + clasificare severitate
 *   - Separatori tehnici cu etichetare normativă
 */

import { useState, useMemo } from "react";
import { cn, Input } from "../ui.jsx";
import SuggestionPanel from "../SuggestionPanel.jsx";
import { filterByCategory } from "../../data/suggestions-catalog.js";
import {
  CATEGORY_GROUPS,
  getGroupedInCategory,
  suggestLength,
  getLengthRule,
  LENGTH_RULE_GLOBAL,
  GLOBAL_TB_LEVELS,
  computeGlobalTbLoss,
} from "./utils/bridgesCalc.js";

// ── TechBadge ─────────────────────────────────────────────────────────────────
function TechBadge({ label, accent }) {
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono tracking-wide",
      accent
        ? "border-amber-700/50 bg-amber-500/10 text-amber-400/80"
        : "border-slate-600/50 bg-slate-800/70 text-slate-500"
    )}>
      {label}
    </span>
  );
}

// ── Culoare ψ pe severitate ───────────────────────────────────────────────────
function getPsiColors(psi) {
  if (psi < 0.10) return { text: "text-emerald-400", bar: "bg-emerald-500",  bg: "bg-emerald-500/10", border: "border-emerald-600/30", label: "SCĂZUT",  labelColor: "text-emerald-400/70" };
  if (psi < 0.20) return { text: "text-sky-400",     bar: "bg-sky-500",      bg: "bg-sky-500/8",      border: "border-sky-600/25",    label: "MEDIU",   labelColor: "text-sky-400/70" };
  if (psi < 0.30) return { text: "text-amber-400",   bar: "bg-amber-500",    bg: "bg-amber-500/10",   border: "border-amber-600/30",  label: "RIDICAT", labelColor: "text-amber-400/70" };
  return           { text: "text-red-400",            bar: "bg-red-500",      bg: "bg-red-500/10",     border: "border-red-600/30",    label: "CRITIC",  labelColor: "text-red-400/70" };
}

// ── Bara ψ vizuală (0 → 0.6 W/(m·K)) ────────────────────────────────────────
function PsiBar({ psi }) {
  const pct = Math.min(100, (psi / 0.6) * 100);
  const c   = getPsiColors(psi);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40">
        <div
          className={cn("h-full rounded-full transition-all", c.bar, "opacity-70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-[8px] font-mono shrink-0 w-12 text-right", c.labelColor)}>
        {c.label}
      </span>
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
export default function WizardBridges({
  onAddBulk,
  onClose,
  onOpenCatalog,
  building,
  existingBridges = [],
}) {
  const [activeGroup, setActiveGroup]   = useState("perete");
  const [activeSubCat, setActiveSubCat] = useState("__all__");
  const [queue, setQueue]               = useState([]);
  const [showCustomLength, setShowCustomLength] = useState(null);
  // P1-7: Metoda globală ΔU_tb (alternativă forfetar la Σ(ψ·L))
  const [methodMode, setMethodMode] = useState("detailed"); // "detailed" | "global"
  const [globalLevel, setGlobalLevel] = useState("B"); // A/B/C

  // Grupare punți pe sub-categorii din grupa activă (CATEGORY_GROUPS)
  const groupedPicks = useMemo(() => getGroupedInCategory(activeGroup), [activeGroup]);
  const totalInGroup = useMemo(
    () => groupedPicks.reduce((sum, g) => sum + g.bridges.length, 0),
    [groupedPicks]
  );

  // Filtrare per sub-categorie (sau toate)
  const visibleGroups = useMemo(() => {
    if (activeSubCat === "__all__") return groupedPicks;
    return groupedPicks.filter(g => g.subCat === activeSubCat);
  }, [groupedPicks, activeSubCat]);

  const activeGroupMeta = CATEGORY_GROUPS.find(g => g.key === activeGroup);

  const addToQueue = (bridge, length) => {
    const len = parseFloat(length) || 0;
    if (len <= 0) return;
    setQueue(prev => [...prev, {
      name:    bridge.name,
      cat:     bridge.cat,
      psi:     bridge.psi,
      psiCatalog: bridge.psi, // P2-3: păstrăm valoarea originală pentru detectare outlier
      length:  len,
      _key:    `${bridge.name}-${Date.now()}`,
    }]);
    setShowCustomLength(null);
  };

  const addWithSuggested  = (bridge)            => addToQueue(bridge, suggestLength(bridge.name, building));
  const removeFromQueue   = (idx)               => setQueue(prev => prev.filter((_, i) => i !== idx));
  const updateQueueLength = (idx, newLength)    => setQueue(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], length: parseFloat(newLength) || 0 };
    return next;
  });
  const updateQueuePsi    = (idx, newPsi)       => setQueue(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], psi: parseFloat(newPsi) || 0 };
    return next;
  });

  const totalLoss   = queue.reduce((s, q) => s + (q.psi * q.length), 0);
  const totalLength = queue.reduce((s, q) => s + q.length, 0);

  // P1-7: Calcul echivalent metoda globală
  const globalTbResult = useMemo(() => {
    if (methodMode !== "global") return null;
    const a = parseFloat(building?.areaEnvelope) || 0;
    return computeGlobalTbLoss(globalLevel, a);
  }, [methodMode, globalLevel, building?.areaEnvelope]);

  const bridgeSuggestions = useMemo(() => {
    if (!queue.some(q => q.psi >= 0.30)) return [];
    return filterByCategory("bridge");
  }, [queue]);

  const handleApply = () => {
    if (queue.length === 0) return;
    const toApply = queue.map(({ _key, ...rest }) => rest);
    onAddBulk?.(toApply);
    onClose?.();
  };

  // Clasificare impact global
  const severityTotal = totalLoss < 2 ? "SCĂZUT" : totalLoss < 5 ? "MODERAT" : totalLoss < 10 ? "RIDICAT" : "CRITIC";
  const severityColor = totalLoss < 2 ? "text-emerald-400 border-emerald-600/40 bg-emerald-500/8"
                      : totalLoss < 5 ? "text-sky-400 border-sky-600/40 bg-sky-500/8"
                      : totalLoss < 10 ? "text-amber-400 border-amber-600/40 bg-amber-500/8"
                      : "text-red-400 border-red-600/40 bg-red-500/8";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1117] border border-slate-700/60 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header tehnic ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* SVG: thermal bridge symbol */}
            <div className="w-10 h-10 flex items-center justify-center rounded border border-slate-700/60 bg-slate-800/60 shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                {/* Element exterior */}
                <rect x="1" y="1" width="8" height="20" fill="#475569" opacity="0.3" rx="0.5"/>
                {/* Element interior */}
                <rect x="13" y="1" width="8" height="20" fill="#475569" opacity="0.3" rx="0.5"/>
                {/* Punte termică */}
                <rect x="9" y="8" width="4" height="6" fill="#f97316" opacity="0.6" rx="0.3"/>
                {/* Flux termic linii */}
                <line x1="9"  y1="11" x2="4"  y2="11" stroke="#fb923c" strokeWidth="0.7" opacity="0.5"/>
                <line x1="13" y1="11" x2="18" y2="11" stroke="#fb923c" strokeWidth="0.7" opacity="0.5"/>
                <line x1="11" y1="8"  x2="11" y2="3"  stroke="#fb923c" strokeWidth="0.7" opacity="0.4"/>
                <line x1="11" y1="14" x2="11" y2="19" stroke="#fb923c" strokeWidth="0.7" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">Punți termice liniare — Wizard</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <TechBadge label="ISO 10211:2017" />
                <TechBadge label="ISO 14683:2017" />
                <span className="text-[9px] text-slate-700 font-mono">quick-pick categorii · aplicare bulk</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700/50 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/40"
            aria-label="Închide wizard"
          >✕</button>
        </div>

        {/* ── Notă normativă + ghidaj lungime ISO 14683 §5 ──────────────── */}
        <div className="px-5 pt-3 space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded border border-slate-800/80 bg-slate-800/20 text-[10px] text-slate-500">
            <span className="font-mono text-amber-500/80 text-xs">ψ</span>
            <span>
              Coeficientul liniar ψ [W/(m·K)] per ISO 14683. Pierdere suplimentară:
              <span className="font-mono text-slate-400 mx-1">ΔH_TB = ψ × L [W/K]</span>
              se adaugă la pierderea globală a anvelopei.
            </span>
          </div>
          {/* P0 fix: banner permanent reguli măsurare lungime */}
          <div className="flex items-start gap-2 p-2.5 rounded border border-amber-700/30 bg-amber-500/5 text-[10px] text-amber-200/80">
            <span className="font-mono text-amber-400 text-sm shrink-0">📏</span>
            <span className="leading-relaxed">
              <span className="font-semibold text-amber-300">Reguli măsurare lungime:</span>{" "}
              {LENGTH_RULE_GLOBAL}
            </span>
          </div>

          {/* P1-7: Toggle metodă calcul (detaliată vs. globală Mc 001 §3.2.6) */}
          <div className="rounded border border-slate-700/50 bg-slate-800/20 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                Metodă calcul punți termice
              </span>
              <TechBadge label="Mc 001-2022 §3.2.6" />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMethodMode("detailed")}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded border text-[10px] transition-all",
                  methodMode === "detailed"
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                    : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600 text-slate-500"
                )}
              >
                <div className="font-semibold">📐 Detaliat (ψ × L)</div>
                <div className="text-[8px] opacity-70 mt-0.5">Calcul pe punte din catalog · Σ(ψ·L) · ISO 14683</div>
              </button>
              <button
                onClick={() => setMethodMode("global")}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded border text-[10px] transition-all",
                  methodMode === "global"
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                    : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600 text-slate-500"
                )}
              >
                <div className="font-semibold">🌐 Forfetar ΔU_tb</div>
                <div className="text-[8px] opacity-70 mt-0.5">Mc 001 §3.2.6 · A/B/C · ΔU × A_env</div>
              </button>
            </div>
            {/* Selector nivel A/B/C — vizibil doar în mod global */}
            {methodMode === "global" && (
              <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="text-[8px] text-slate-600 uppercase tracking-wider font-mono">
                  Calitate execuție anvelopă
                </div>
                {GLOBAL_TB_LEVELS.map(lvl => {
                  const selected = globalLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setGlobalLevel(lvl.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded border-2 text-left transition-all",
                        selected
                          ? "border-amber-500/60 bg-amber-500/8"
                          : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/30"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-slate-200">{lvl.label}</div>
                        <div className="text-[8px] text-slate-600 font-mono truncate">{lvl.desc}</div>
                      </div>
                      <div className={cn(
                        "shrink-0 font-mono px-1.5 py-0.5 rounded border text-[10px] font-bold",
                        selected
                          ? "border-amber-600/50 bg-amber-500/10 text-amber-300"
                          : "border-slate-700/50 text-slate-500"
                      )}>
                        ΔU={lvl.deltaU.toFixed(2)}
                      </div>
                    </button>
                  );
                })}
                {/* Rezultat calcul global */}
                {globalTbResult ? (
                  <div className="mt-1 px-2 py-1.5 rounded border border-violet-700/30 bg-violet-500/5 text-[9px] font-mono text-violet-200/80 flex items-center justify-between">
                    <span>ΔU_tb × A_env = {globalTbResult.deltaU} × {parseFloat(building?.areaEnvelope || 0).toFixed(0)}</span>
                    <span className="text-violet-300 font-bold">= {globalTbResult.totalLoss.toFixed(1)} W/K</span>
                  </div>
                ) : (
                  <div className="mt-1 px-2 py-1 rounded border border-amber-700/30 bg-amber-500/5 text-[9px] text-amber-200/70 italic">
                    ⚠ Lipsește A_envelope din Pas 1 — completează pentru calcul global.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Layout 2 coloane ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-0 p-5 pt-3">

          {/* ── Coloana stângă: categorii + quick-picks ───────────────────── */}
          <div className="space-y-3 md:pr-4 md:border-r md:border-slate-800/60">

            {/* Tab-uri grupe principale (8 grupe acoperă 31 sub-categorii) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                  Categorii punți termice · ISO 14683 Anexa B
                </span>
                <span className="text-[8px] text-slate-700 font-mono">
                  {totalInGroup} punți în grupă
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_GROUPS.map(g => (
                  <button
                    key={g.key}
                    onClick={() => { setActiveGroup(g.key); setActiveSubCat("__all__"); }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] transition-all",
                      activeGroup === g.key
                        ? "border-amber-600/50 bg-amber-500/10 text-amber-300"
                        : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600 text-slate-500"
                    )}
                  >
                    <span>{g.icon}</span>
                    <span className="font-medium">{g.label}</span>
                  </button>
                ))}
              </div>
              {activeGroupMeta?.hint && (
                <div className="text-[9px] text-slate-700 font-mono mt-1.5 italic px-1">
                  {activeGroupMeta.hint}
                </div>
              )}
            </div>

            {/* Sub-categorii filtru (chips) — afișate doar dacă grupa are >1 sub-cat */}
            {groupedPicks.length > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveSubCat("__all__")}
                  className={cn(
                    "px-2 py-0.5 rounded border text-[9px] font-mono transition-all",
                    activeSubCat === "__all__"
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                      : "border-slate-700/50 text-slate-500 hover:border-slate-600"
                  )}
                >
                  toate ({totalInGroup})
                </button>
                {groupedPicks.map(g => (
                  <button
                    key={g.subCat}
                    onClick={() => setActiveSubCat(g.subCat)}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[9px] font-mono transition-all",
                      activeSubCat === g.subCat
                        ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                        : "border-slate-700/50 text-slate-500 hover:border-slate-600"
                    )}
                  >
                    {g.subCat} ({g.bridges.length})
                  </button>
                ))}
              </div>
            )}

            {/* Header coloană */}
            <div className="grid grid-cols-[1fr_64px_80px] gap-2 px-2 py-1 text-[8px] text-slate-600 uppercase tracking-widest font-mono border-b border-slate-800/60">
              <span>Tip punte termică</span>
              <span className="text-right">ψ (W/mK)</span>
              <span className="text-center">Adaugă</span>
            </div>

            {/* Listă cu separatori sub-categorie */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-0.5">
              {visibleGroups.map(group => (
                <div key={group.subCat}>
                  {/* Header sub-categorie (afișat doar când avem >1 sub-cat sau filtru e __all__) */}
                  {(activeSubCat === "__all__" && groupedPicks.length > 1) && (
                    <div className="text-[8px] text-slate-500 uppercase tracking-widest font-mono px-1 py-1 border-b border-slate-800/40 mb-1.5 flex items-center justify-between">
                      <span>{group.subCat}</span>
                      <span className="text-slate-700 normal-case">{group.bridges.length} {group.bridges.length === 1 ? "punte" : "punți"}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {group.bridges.map((bridge, idx) => {
                      const globalKey = `${group.subCat}-${idx}`;
                      const alreadyAdded = queue.filter(q => q.name === bridge.name).length;
                      const isActiveCustom = showCustomLength === globalKey;
                      const suggested = suggestLength(bridge.name, building);
                      const lengthRule = getLengthRule(bridge.name);
                      const psiC = getPsiColors(bridge.psi);

                      return (
                        <div
                          key={globalKey}
                          className={cn(
                            "rounded border transition-all",
                            isActiveCustom ? "border-violet-500/40 bg-violet-500/5" : `${psiC.border} ${psiC.bg}`
                          )}
                        >
                          <div className="grid grid-cols-[1fr_64px_80px] gap-2 items-center px-2 py-2">
                            {/* Denumire + ψ bar + tooltip lungime */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[11px] font-medium text-slate-200 truncate" title={bridge.detail || bridge.desc || ""}>
                                  {bridge.name}
                                </span>
                                {alreadyAdded > 0 && (
                                  <span className="shrink-0 text-[8px] px-1.5 py-0.5 rounded border border-amber-600/30 bg-amber-500/10 text-amber-300 font-mono">
                                    {alreadyAdded}×
                                  </span>
                                )}
                              </div>
                              <PsiBar psi={bridge.psi} />
                            </div>

                            {/* Valoare ψ */}
                            <div className="text-right">
                              <div className={cn("text-lg font-bold font-mono", psiC.text)}>
                                {bridge.psi.toFixed(2)}
                              </div>
                              <div className="text-[7px] text-slate-700 font-mono">W/(m·K)</div>
                            </div>

                            {/* Butoane adăugare */}
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => addWithSuggested(bridge)}
                                className="text-[9px] px-1.5 py-1 rounded border border-emerald-600/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15 transition-colors font-mono"
                                title={`Lungime sugerată: ${suggested} m\n${lengthRule}`}
                              >
                                ⚡ {suggested}m
                              </button>
                              <button
                                onClick={() => setShowCustomLength(isActiveCustom ? null : globalKey)}
                                className="text-[9px] px-1.5 py-1 rounded border border-slate-700/50 bg-slate-800/30 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-colors"
                                title="Introducere lungime manuală"
                              >
                                ✏ manual
                              </button>
                            </div>
                          </div>

                          {/* Câmp lungime custom + tooltip regulă măsurare */}
                          {isActiveCustom && (
                            <div className="mx-2 mb-2 pt-2 border-t border-slate-800/60 space-y-2">
                              {/* Tooltip regulă lungime per tip */}
                              <div className="flex items-start gap-1.5 px-1 py-1 rounded bg-amber-500/5 border border-amber-700/20 text-[9px] text-amber-200/80 leading-snug">
                                <span className="font-mono text-amber-400 shrink-0">📏</span>
                                <span>{lengthRule}</span>
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <div className="text-[8px] text-slate-600 font-mono mb-0.5 uppercase tracking-wider">
                                    Lungime [m] · dimensiune EXTERIOARĂ ISO 14683 §5
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    defaultValue={suggested}
                                    id={`bridge-len-${globalKey}`}
                                    autoFocus
                                    className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700/60 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-violet-500/50"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const val = document.getElementById(`bridge-len-${globalKey}`)?.value;
                                    addToQueue(bridge, val);
                                  }}
                                  className="px-3 py-1.5 text-[10px] rounded border border-violet-600/50 bg-violet-600/15 text-violet-300 hover:bg-violet-600/25 font-medium transition-colors"
                                >+ Adaugă</button>
                                <button
                                  onClick={() => setShowCustomLength(null)}
                                  className="px-2 py-1.5 text-[10px] rounded border border-slate-700/50 text-slate-500 hover:border-slate-600 transition-colors"
                                >✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {visibleGroups.length === 0 && (
                <div className="rounded border border-dashed border-slate-800 py-6 text-center text-[10px] text-slate-700 font-mono">
                  Nicio punte în filtrarea curentă.
                </div>
              )}
            </div>

            {/* Catalog extins */}
            <button
              onClick={() => { onOpenCatalog?.(); onClose?.(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-slate-700/50 hover:border-slate-600 bg-slate-800/20 hover:bg-slate-800/40 text-left transition-all"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded border border-slate-700/60 bg-slate-800 text-slate-400 text-sm shrink-0">📖</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-slate-300">Catalog extins — 165 tipologii SVG</div>
                <div className="text-[9px] text-slate-600 font-mono mt-0.5">
                  Fațade cortină · structuri metalice · mansarde · acoperișuri verzi · vernacular RO
                </div>
              </div>
              <span className="text-slate-600 text-xs">→</span>
            </button>
          </div>

          {/* ── Coloana dreaptă: queue + totale ──────────────────────────── */}
          <div className="mt-4 md:mt-0 md:pl-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                Punți pregătite pentru adăugare
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded border font-mono font-bold text-sm transition-colors",
                queue.length > 0
                  ? "border-violet-600/50 bg-violet-500/10 text-violet-300"
                  : "border-slate-700/50 text-slate-600"
              )}>
                {queue.length}
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 py-8 text-center text-[10px] text-slate-700 font-mono">
                Niciun element în listă.<br />
                <span className="text-[9px]">Selectează tipuri din stânga.</span>
              </div>
            ) : (
              <>
                {/* Header tabel queue */}
                <div className="grid grid-cols-[1fr_48px_52px_24px] gap-1 px-2 py-1 text-[8px] text-slate-600 uppercase tracking-widest font-mono border-b border-slate-800/60">
                  <span>Tip punte</span>
                  <span className="text-right">L (m)</span>
                  <span className="text-right">ΔH (W/K)</span>
                  <span></span>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {queue.map((q, idx) => {
                    const psiC = getPsiColors(q.psi);
                    const dH   = (q.psi * q.length).toFixed(3);
                    // P2-3: detectare outlier — ψ în afara intervalului ±50% catalog
                    const psiOrig = q.psiCatalog ?? q.psi;
                    const outlierThreshold = 0.5;
                    const psiOutlier = psiOrig > 0 && Math.abs(q.psi - psiOrig) / psiOrig > outlierThreshold;
                    return (
                      <div
                        key={q._key}
                        className={cn(
                          "rounded border transition-colors text-[10px] font-mono",
                          psiOutlier
                            ? "border-amber-600/50 bg-amber-500/5"
                            : "border-slate-800/60 bg-slate-800/20 hover:bg-slate-800/30"
                        )}
                      >
                        <div className="grid grid-cols-[1fr_50px_48px_52px_24px] gap-1 items-center px-2 py-1.5">
                          <div className="min-w-0">
                            <div className="text-slate-300 truncate text-[10px]">{q.name}</div>
                            <div className="text-[8px] mt-0.5 text-slate-600">
                              catalog: ψ={psiOrig.toFixed(3)}
                            </div>
                          </div>
                          {/* ψ editabil — P2-3 */}
                          <div>
                            <input
                              type="number"
                              value={q.psi}
                              onChange={e => updateQueuePsi(idx, e.target.value)}
                              min="0"
                              step="0.01"
                              title="ψ editabil — atenție dacă diferă mult de catalog"
                              className={cn(
                                "w-full px-1 py-0.5 rounded text-[10px] font-mono text-right focus:outline-none transition-colors",
                                psiOutlier
                                  ? "bg-amber-500/10 border-2 border-amber-500/50 text-amber-300 focus:border-amber-400"
                                  : "bg-slate-800/60 border border-slate-700/50 text-slate-200 focus:border-violet-500/50"
                              )}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={q.length}
                              onChange={e => updateQueueLength(idx, e.target.value)}
                              min="0"
                              step="0.5"
                              title="Lungime [m] — dimensiune EXTERIOARĂ ISO 14683 §5"
                              className="w-full px-1 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono text-slate-200 focus:outline-none focus:border-violet-500/50 text-right"
                            />
                          </div>
                          <div className={cn("text-right font-semibold", psiC.text)}>
                            {dH}
                          </div>
                          <button
                            onClick={() => removeFromQueue(idx)}
                            className="text-[8px] w-5 h-5 flex items-center justify-center rounded border border-red-600/30 bg-red-600/5 text-red-400 hover:bg-red-600/20 transition-colors"
                            aria-label="Elimină"
                          >✕</button>
                        </div>
                        {/* P2-3: warning outlier */}
                        {psiOutlier && (
                          <div className="px-2 pb-1 text-[8px] text-amber-300/80 font-mono italic flex items-center gap-1">
                            <span>⚠</span>
                            <span>ψ diferă cu &gt;{(outlierThreshold * 100).toFixed(0)}% față de catalog ({psiOrig.toFixed(3)}). Verifică sursa.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Totale + clasificare */}
            {queue.length > 0 && (
              <div className="rounded border border-slate-700/50 bg-slate-800/20 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/40">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Rezumat impact termic</span>
                </div>
                <div className="divide-y divide-slate-800/40">
                  <div className="flex justify-between items-center px-3 py-1.5 text-[10px] font-mono">
                    <span className="text-slate-500">Lungime totală:</span>
                    <span className="text-slate-300 font-semibold">{totalLength.toFixed(1)} m</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-1.5 text-[11px] font-mono">
                    <span className="text-slate-500">ΔH_TB total:</span>
                    <span className="text-amber-400 font-bold">{totalLoss.toFixed(3)} W/K</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-1.5 text-[10px] font-mono">
                    <span className="text-slate-500">Clasificare:</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded border text-[9px] font-bold",
                      severityColor
                    )}>
                      {severityTotal}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Punți existente */}
            {existingBridges.length > 0 && (
              <div className="p-2.5 rounded border border-amber-600/20 bg-amber-500/5 text-[9px] text-amber-200/70 font-mono">
                ℹ {existingBridges.length} punți deja în proiect — noile se adaugă, nu înlocuiesc.
              </div>
            )}
          </div>
        </div>

        {/* Sugestii tratare punți cu ψ ridicat */}
        {bridgeSuggestions.length > 0 && (
          <div className="mx-5 mb-4 pt-4 border-t border-slate-800/60">
            <SuggestionPanel
              suggestions={bridgeSuggestions}
              title="Soluții recomandate pentru tratarea punților termice"
              subtitle="Punți cu ψ ≥ 0.30 W/(m·K) detectate — reducerea aduce câștig de 60–80% la pierderi liniare."
              mode="card"
              showDisclaimer
            />
          </div>
        )}

        {/* ── Footer butoane ────────────────────────────────────────────── */}
        <div className="flex gap-2 justify-between mx-5 mb-5 pt-3 border-t border-slate-800/60">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] rounded border border-slate-700/50 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors"
          >Anulează</button>

          <div className="flex items-center gap-3">
            {queue.length > 0 && (
              <div className="text-[9px] font-mono text-slate-600">
                {queue.length} punți · ΔH = <span className="text-amber-400">{totalLoss.toFixed(2)} W/K</span>
              </div>
            )}
            <button
              onClick={handleApply}
              disabled={queue.length === 0}
              className={cn(
                "px-5 py-1.5 text-[11px] rounded font-semibold transition-all",
                queue.length > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              )}
            >
              ✓ Adaugă {queue.length > 0 ? `${queue.length} ` : ""}punți în proiect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
