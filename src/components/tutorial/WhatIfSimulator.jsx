// ═════════════════════════════════════════════════════════════════════════════
// WhatIfSimulator — simulator interactiv cu slider live
//
// Permite auditorului să modifice un parametru (ex: U_perete sau Au) și să vadă
// instant efectul asupra rezultatului (ex: EP scade cu X kWh/m²a).
//
// Funcția de calcul vine din `formula` în content data:
//   formula: ({ value }) => ({ output: 232 - (value * 12), unit: "kWh/m²a" })
//
// Securitate: NU folosim eval(). Funcția trebuie să fie definită în fișierul
// de content ca closure JS pur — fără input dinamic din afara JS bundle.
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { cn } from "../ui.jsx";

export default function WhatIfSimulator({
  body,
  parameter,
  paramLabel,
  paramUnit,
  min,
  max,
  step,
  defaultValue,
  formula,           // (value) => { output, unit, label, color? }
  baseline,          // { value, output, label } — punctul de referință
  presets,           // [{ label, value }] — preset-uri (ex: "izolat 10cm" → U=0.35)
}) {
  const [value, setValue] = useState(defaultValue ?? min ?? 0);

  const result = useMemo(() => {
    try {
      return formula ? formula({ value }) : null;
    } catch (e) {
      return { output: NaN, error: e.message };
    }
  }, [value, formula]);

  const delta = useMemo(() => {
    if (!baseline?.output || !result?.output || result?.error) return null;
    const d = result.output - baseline.output;
    const pct = (d / baseline.output) * 100;
    return { absolute: d, percent: pct };
  }, [baseline, result]);

  // Color rezultat: verde dacă scade EP, roșu dacă crește, neutru dacă similar
  const deltaColor = delta?.percent < -2 ? "emerald" : delta?.percent > 2 ? "red" : "slate";

  return (
    <div className="rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 p-4 space-y-3">
      {body && <p className="text-sm text-slate-300 leading-relaxed">{body}</p>}

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300">
            {paramLabel || parameter} <span className="text-slate-500 font-normal">({paramUnit})</span>
          </label>
          <div className="font-mono text-sm font-bold text-amber-300">
            {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)} {paramUnit}
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step || 0.01}
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
          aria-label={`Slider ${paramLabel}`}
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{min} {paramUnit}</span>
          <span>{max} {paramUnit}</span>
        </div>
      </div>

      {/* Presets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => setValue(p.value)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium border transition-all",
                Math.abs(value - p.value) < 0.001
                  ? "bg-amber-500 text-slate-900 border-amber-400"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/50 hover:text-amber-300"
              )}
              title={p.description || ""}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Rezultat */}
      {result && !result.error && (
        <div className="rounded-lg bg-slate-950/70 border border-slate-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {result.label || "Rezultat calculat"}
            </div>
            {delta && (
              <div className={cn(
                "text-[10px] font-bold",
                deltaColor === "emerald" && "text-emerald-400",
                deltaColor === "red" && "text-red-400",
                deltaColor === "slate" && "text-slate-400"
              )}>
                {delta.percent > 0 ? "+" : ""}{delta.percent.toFixed(1)}%
                <span className="ml-1 opacity-70">
                  ({delta.absolute > 0 ? "+" : ""}{delta.absolute.toFixed(1)} {result.unit})
                </span>
              </div>
            )}
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {typeof result.output === "number" ? result.output.toFixed(result.decimals ?? 1) : result.output}
            <span className="text-sm font-normal text-slate-400 ml-1.5">{result.unit}</span>
          </div>
          {baseline && (
            <div className="text-[10px] text-slate-500 mt-1.5">
              Referință: {baseline.label} → <span className="font-mono">{baseline.output} {result.unit}</span>
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="text-xs text-red-400">Eroare în formulă: {result.error}</div>
      )}
    </div>
  );
}
