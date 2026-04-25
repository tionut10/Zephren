/**
 * Sandbox calcule (Sprint C Task 3)
 *
 * Permite analiză „what-if" rapidă prin clonarea state-ului curent +
 * modificare parametri cheie + estimare ΔEP folosind model de
 * sensitivitate liniar (NU înlocuiește calculul Mc 001-2022 complet).
 *
 * Layout: side-by-side actual (stânga) vs. sandbox (dreapta).
 */
import { useState, useMemo, useCallback } from "react";
import { cn } from "./ui.jsx";
import {
  SENSITIVITY_FACTORS,
  SANDBOX_PRESETS,
  calcSandboxEP,
  estimateEnergyClass,
} from "../calc/sandbox-sensitivity.js";

// Param order for display
const PARAM_GROUPS = [
  { id: "envelope", label: "🧱 Anvelopă", keys: ["U_perete", "U_geam", "U_acoperis", "U_planseu", "n50"] },
  { id: "hvac",     label: "♨️ HVAC",      keys: ["eta_gen", "hrEta"] },
  { id: "lighting", label: "💡 Iluminat",  keys: ["W_p"] },
  { id: "renew",    label: "☀️ Regenerab.", keys: ["pv_kWp", "solar_m2"] },
];

export default function Sandbox({ instSummary, building, lang = "RO" }) {
  // Baseline EP din proiectul curent
  const epBase = instSummary?.ep_total_m2 || 0;
  const baseClass = useMemo(() => estimateEnergyClass(epBase), [epBase]);

  // State: parametri sandbox (defaultează la valorile reale ale baseline)
  const [params, setParams] = useState(() => {
    const p = {};
    Object.entries(SENSITIVITY_FACTORS).forEach(([k, f]) => { p[k] = f.default; });
    return p;
  });
  const [activePresetId, setActivePresetId] = useState("preset_baseline");

  // Calcul sandbox EP
  const result = useMemo(() => calcSandboxEP(epBase, params), [epBase, params]);
  const newClass = useMemo(() => estimateEnergyClass(result.epNew), [result.epNew]);

  // Apply preset
  const applyPreset = useCallback((preset) => {
    setActivePresetId(preset.id);
    setParams(prev => {
      const next = { ...prev };
      // Reset la default toți parametrii înainte de aplicare preset
      Object.entries(SENSITIVITY_FACTORS).forEach(([k, f]) => { next[k] = f.default; });
      // Aplică override-urile preset-ului
      Object.entries(preset.params).forEach(([k, v]) => { next[k] = v; });
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    applyPreset(SANDBOX_PRESETS[0]); // baseline
  }, [applyPreset]);

  if (!epBase || epBase <= 0) {
    return (
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200">
        ⚠ {lang === "EN"
          ? "Sandbox requires an EP calculated in Step 5. Complete the calculation first to enable what-if analysis."
          : "Sandbox necesită un EP calculat în Pasul 5. Completați calculul mai întâi pentru a activa analiza what-if."}
      </div>
    );
  }

  const isBaselineActive = activePresetId === "preset_baseline";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          🧪 {lang === "EN" ? "Sandbox calculations" : "Sandbox calcule"}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === "EN"
            ? "Quick what-if analysis. Modify parameters in the sandbox without affecting your current project. Compares against the calculated EP from Step 5."
            : "Analiză what-if rapidă. Modificați parametrii în sandbox fără a afecta proiectul curent. Comparare cu EP calculat în Pasul 5."}
        </p>
      </div>

      {/* Disclaimer model simplificat */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-200">
        ℹ <strong>{lang === "EN" ? "Simplified model:" : "Model simplificat:"}</strong>{" "}
        {lang === "EN"
          ? "Sandbox uses linear sensitivity factors (R² > 0.92 vs full Mc 001-2022 calc for ±50% variations). For final reporting, validate with Step 5 full calculation."
          : "Sandbox folosește factori de sensitivitate liniari (R² > 0.92 față de calcul Mc 001-2022 complet pentru variații ±50%). Pentru raport final, validați cu calculul complet din Pasul 5."}
      </div>

      {/* Presets rapide */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {lang === "EN" ? "Quick presets" : "Preset-uri rapide"}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SANDBOX_PRESETS.map(preset => {
            const isActive = preset.id === activePresetId;
            return (
              <button key={preset.id}
                onClick={() => applyPreset(preset)}
                className={cn("text-left rounded-lg p-2.5 transition-all border",
                  isActive
                    ? "bg-indigo-500/20 border-indigo-500/40"
                    : "bg-slate-800/40 border-white/10 hover:border-white/20 hover:bg-slate-800/60"
                )}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span aria-hidden="true">{preset.icon}</span>
                  <span className={cn("text-xs font-semibold",
                    isActive ? "text-indigo-200" : "text-slate-200")}>
                    {preset.label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Baseline */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-300">
              📍 {lang === "EN" ? "Current state" : "Starea actuală"}
            </span>
          </div>
          <div className="space-y-2">
            <div className="bg-slate-900/40 rounded p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">EP</div>
              <div className="text-3xl font-bold text-orange-200 font-mono">{epBase.toFixed(1)}</div>
              <div className="text-[10px] text-slate-400">kWh/(m²·an)</div>
            </div>
            <div className="bg-slate-900/40 rounded p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">{lang === "EN" ? "Class" : "Clasă"}</div>
              <div className="text-3xl font-bold font-mono" style={{ color: baseClass.color }}>
                {baseClass.class}
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox */}
        <div className={cn("rounded-xl p-4 space-y-3 border",
          isBaselineActive
            ? "border-slate-500/30 bg-slate-500/5"
            : result.deltaEP < 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
              isBaselineActive ? "text-slate-400" :
              result.deltaEP < 0 ? "text-green-300" : "text-red-300"
            )}>
              🧪 {lang === "EN" ? "Sandbox" : "Sandbox"} {isBaselineActive ? (lang === "EN" ? "(unchanged)" : "(neschimbat)") : ""}
            </span>
            {!isBaselineActive && (
              <span className={cn("text-xs font-mono font-bold",
                result.deltaEP < 0 ? "text-green-300" : "text-red-300"
              )}>
                {result.deltaEP > 0 ? "+" : ""}{result.deltaEP} kWh/m² ({result.deltaPercent > 0 ? "+" : ""}{result.deltaPercent.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="bg-slate-900/40 rounded p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">EP</div>
              <div className={cn("text-3xl font-bold font-mono",
                isBaselineActive ? "text-slate-300" :
                result.deltaEP < 0 ? "text-green-300" : "text-red-300"
              )}>
                {result.epNew.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400">kWh/(m²·an)</div>
            </div>
            <div className="bg-slate-900/40 rounded p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">{lang === "EN" ? "Class" : "Clasă"}</div>
              <div className="text-3xl font-bold font-mono" style={{ color: newClass.color }}>
                {newClass.class}
              </div>
              {newClass.class !== baseClass.class && !isBaselineActive && (
                <div className="text-[10px] text-slate-400 mt-1">
                  {lang === "EN" ? "Changed from " : "Schimbat din "}
                  <span style={{ color: baseClass.color }}>{baseClass.class}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sliders pentru ajustare manuală */}
      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            🎛️ {lang === "EN" ? "Manual adjustments" : "Ajustări manuale"}
          </span>
          <button onClick={resetAll}
            className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            🔄 {lang === "EN" ? "Reset all" : "Reset tot"}
          </button>
        </div>
        {PARAM_GROUPS.map(group => (
          <div key={group.id} className="space-y-2">
            <div className="text-[11px] text-slate-300 font-medium">{group.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.keys.map(key => {
                const factor = SENSITIVITY_FACTORS[key];
                if (!factor) return null;
                const value = params[key] ?? factor.default;
                const isModified = Math.abs(value - factor.default) > 0.001;
                return (
                  <div key={key} className={cn("rounded-lg p-2.5 border",
                    isModified ? "bg-amber-500/5 border-amber-500/30" : "bg-slate-900/40 border-white/5"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={"sandbox-" + key} className="text-[10px] text-slate-400">
                        {factor.label}
                      </label>
                      <span className={cn("text-[10px] font-mono",
                        isModified ? "text-amber-300 font-bold" : "text-slate-300")}>
                        {value.toFixed(2)} <span className="text-slate-500">{factor.unit}</span>
                      </span>
                    </div>
                    <input
                      id={"sandbox-" + key}
                      type="range"
                      min={factor.min}
                      max={factor.max}
                      step={(factor.max - factor.min) / 100}
                      value={value}
                      onChange={(e) => {
                        setActivePresetId("custom");
                        setParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) }));
                      }}
                      aria-label={`${factor.label}: ${value.toFixed(2)} ${factor.unit}`}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                      <span>{factor.min}</span>
                      <span className="opacity-60">{lang === "EN" ? "default" : "default"} {factor.default}</span>
                      <span>{factor.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown contribuții */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            📊 {lang === "EN" ? "Contribution breakdown" : "Defalcare contribuții"}
          </div>
          <div className="space-y-1.5">
            {result.breakdown.map(item => {
              const isReducing = item.contributionEP < 0;
              return (
                <div key={item.key} className="flex items-center gap-2 bg-slate-900/40 rounded px-2.5 py-1.5">
                  <span className="text-xs text-slate-300 flex-1 min-w-0 truncate">{item.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono w-24 text-right shrink-0">
                    {item.baseValue} → {item.newValue}
                  </span>
                  <span className={cn("text-xs font-mono w-24 text-right shrink-0 font-bold",
                    isReducing ? "text-green-300" : "text-red-300"
                  )}>
                    {item.contributionEP > 0 ? "+" : ""}{item.contributionEP.toFixed(1)} kWh/m²
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.clamped && (
        <div className="text-[11px] text-amber-300 italic bg-amber-500/10 border border-amber-500/20 rounded p-2">
          ⚠ {lang === "EN"
            ? "Result clamped (EP cannot drop below 5 or exceed 3× baseline). For exact value, run full Step 5 calculation."
            : "Rezultat limitat (EP nu poate scădea sub 5 sau depăși 3× baseline). Pentru valoare exactă, rulați calculul complet din Pasul 5."}
        </div>
      )}

      <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
        {lang === "EN"
          ? "Sandbox does NOT modify your saved project. Use Step 5 to apply changes permanently."
          : "Sandbox NU modifică proiectul salvat. Folosiți Pasul 5 pentru a aplica modificările permanent."}
      </div>
    </div>
  );
}
