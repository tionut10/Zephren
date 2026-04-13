import { useState } from "react";
import { cn } from "./ui.jsx";
import { useANRESync } from "../hooks/useANRESync.js";
import { PRICE_LABELS, PRICE_ICONS } from "../data/energy-prices.js";

const SOURCE_LABELS = {
  anre_live: { label: "ANRE Live", color: "text-emerald-400", badge: "bg-emerald-500/20 border-emerald-500/30" },
  cache:     { label: "Cache local", color: "text-blue-400", badge: "bg-blue-500/20 border-blue-500/30" },
  hardcoded: { label: "Tarife locale", color: "text-yellow-400", badge: "bg-yellow-500/20 border-yellow-500/30" },
  manual:    { label: "Editare manuală", color: "text-amber-400", badge: "bg-amber-500/20 border-amber-500/30" },
};

const SEGMENTS = [
  { value: "casnic_2025",     label: "Casnic reglementat 2025" },
  { value: "imm_2025",        label: "IMM / Comercial 2025" },
  { value: "industrial_2025", label: "Industrial 2025" },
];

export default function ANRESyncPanel({ onPricesChange }) {
  const [segment, setSegment] = useState("casnic_2025");
  const [editingFuel, setEditingFuel] = useState(null);
  const [editValue, setEditValue] = useState("");

  const {
    prices, source, lastSync, quarter, isSyncing, error,
    syncNow, setManualPrice, resetToDefaults, overrides,
  } = useANRESync({ autoSync: true, segment });

  const srcInfo = SOURCE_LABELS[source] || SOURCE_LABELS.hardcoded;

  function handleEdit(fuel) {
    setEditingFuel(fuel);
    setEditValue(String(prices[fuel] ?? ""));
  }

  function handleSaveEdit(fuel) {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0) {
      setManualPrice(fuel, val);
      onPricesChange?.({ ...prices, [fuel]: val });
    }
    setEditingFuel(null);
  }

  function handleKeyDown(e, fuel) {
    if (e.key === "Enter") handleSaveEdit(fuel);
    if (e.key === "Escape") setEditingFuel(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
          Tarife energie — Sincronizare ANRE
        </h3>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border", srcInfo.badge)}>
            {srcInfo.label}
          </span>
          {quarter && <span className="text-xs text-white/30">{quarter}</span>}
        </div>
      </div>

      {/* Segment selector + acțiuni */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={segment} onChange={e => setSegment(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-amber-500/50 transition-all">
          {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button onClick={syncNow} disabled={isSyncing}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
            isSyncing
              ? "bg-white/5 text-white/30 border-white/10 cursor-wait"
              : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30")}>
          {isSyncing ? "Se sincronizează..." : "Sincronizează ANRE"}
        </button>

        {Object.keys(overrides).length > 0 && (
          <button onClick={resetToDefaults}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-all">
            Resetează la implicit
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tabel tarife */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Combustibil</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-white/40">Tarif (RON/kWh)</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white/40">Sursă</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white/40">Editare</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(prices).map(fuel => {
              const isOverridden = fuel in overrides;
              const isEditing = editingFuel === fuel;

              return (
                <tr key={fuel} className={cn("border-b border-white/5 hover:bg-white/5 transition-colors",
                  isOverridden && "bg-amber-500/5")}>
                  <td className="px-3 py-2.5 text-white/80">
                    <span className="mr-2">{PRICE_ICONS[fuel] || "•"}</span>
                    {PRICE_LABELS[fuel] || fuel}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {isEditing ? (
                      <input type="number" step="0.01" min="0" value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, fuel)}
                        onBlur={() => handleSaveEdit(fuel)}
                        autoFocus
                        className="w-24 bg-white/10 border border-amber-500/50 rounded px-2 py-1 text-sm text-right text-white/90 focus:outline-none" />
                    ) : (
                      <span className={cn("font-mono font-semibold",
                        isOverridden ? "text-amber-300" : "text-white/70")}>
                        {prices[fuel]?.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {isOverridden ? (
                      <span className="text-xs text-amber-400">manual</span>
                    ) : (
                      <span className="text-xs text-white/30">{source}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {!isEditing && (
                      <button onClick={() => handleEdit(fuel)}
                        className="text-white/25 hover:text-amber-400 transition-colors text-xs">
                        editare
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-white/25 gap-2">
        <span>
          Ultima sincronizare: {lastSync ? new Date(lastSync).toLocaleString("ro-RO") : "niciodată"}
          {" · "}Cache 24h · Click „editare" pentru override manual
        </span>
        <span>
          Surse: ANRE tarife reglementate · OPCOM piața spot · Furnizori
        </span>
      </div>
    </div>
  );
}
