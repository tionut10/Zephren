import { useMemo } from "react";
import { calcGWPDetailed } from "../calc/gwp.js";
import { canAccess } from "../lib/planGating.js";

// Benchmark-uri EN 15978 + EU Green Deal
const BENCHMARKS = [
  { label: "Benchmark nZEB 2024", value: 15, color: "#22c55e" },
  { label: "Țintă 2030 (-55% emisii)", value: 11, color: "#86efac" },
  { label: "Neutralitate climatică 2050", value: 5, color: "#bbf7d0" },
];

const MODULE_LABELS = {
  gwp_A1A3: { label: "A1–A3 Producție",          color: "#ef4444" },
  gwp_A4:   { label: "A4 Transport",              color: "#f97316" },
  gwp_A5:   { label: "A5 Execuție",               color: "#eab308" },
  gwp_B2B3: { label: "B2–B3 Reparații/întreținere", color: "#3b82f6" },
  gwp_B4:   { label: "B4 Înlocuire materiale",    color: "#6366f1" },
  gwp_C:    { label: "C Dezasamblare/eliminare",  color: "#8b5cf6" },
  gwp_D:    { label: "D Credit reciclare",        color: "#10b981" },
};

const CLASS_COLORS = {
  "A — Excelent":      "#22c55e",
  "B — Bun":           "#86efac",
  "C — Satisfăcător":  "#fde68a",
  "D — Moderat":       "#f97316",
  "E — Foarte ridicat": "#ef4444",
};

export default function GWPReport({ opaqueElements, glazingElements, areaUseful, userPlan }) {
  const gwpResult = useMemo(() =>
    calcGWPDetailed(opaqueElements, glazingElements, areaUseful, 50),
    [opaqueElements, glazingElements, areaUseful]
  );

  const hasAccess = canAccess(userPlan, "gwpReport");

  // Guard: fără straturi
  const hasLayers = opaqueElements?.some(el => el.layers?.length > 0);
  if (!hasLayers) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        <div className="text-3xl mb-3">🧱</div>
        <p>Adăugați straturi de materiale în Pasul 2 (Anvelopă)</p>
        <p className="text-xs text-slate-500 mt-1">Analiza GWP necesită compoziția straturilor pentru fiecare element opac</p>
      </div>
    );
  }

  if (!gwpResult) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        Nu s-au putut calcula emisiile. Verificați datele din Pasul 2.
      </div>
    );
  }

  const {
    gwpPerM2Year, gwpPerM2, totalGWP,
    gwp_A1A3, gwp_A4, gwp_A5, gwp_B2B3, gwp_B4, gwp_C, gwp_D,
    classification, details,
  } = gwpResult;

  const classColor = CLASS_COLORS[classification] || "#94a3b8";

  // Valoare totală lifecycle (fără creditul D)
  const totalPos = (gwp_A1A3 || 0) + (gwp_A4 || 0) + (gwp_A5 || 0) + (gwp_B2B3 || 0) + (gwp_B4 || 0) + (gwp_C || 0);
  const maxModule = Math.max(gwp_A1A3 || 0, gwp_A4 || 0, gwp_A5 || 0, gwp_B2B3 || 0, gwp_B4 || 0, gwp_C || 0);

  const modules = [
    { key: "gwp_A1A3", value: gwp_A1A3 },
    { key: "gwp_A4",   value: gwp_A4 },
    { key: "gwp_A5",   value: gwp_A5 },
    { key: "gwp_B2B3", value: gwp_B2B3 },
    { key: "gwp_B4",   value: gwp_B4 },
    { key: "gwp_C",    value: gwp_C },
    { key: "gwp_D",    value: gwp_D },
  ];

  // Paywall pentru Free
  if (!hasAccess) {
    return (
      <div className="relative">
        {/* Preview neclar */}
        <div className="filter blur-sm pointer-events-none select-none space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">—</div>
                <div className="text-xs text-slate-400 mt-1">—</div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 h-40" />
        </div>
        {/* Overlay upgrade */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-[#1a1f2e]/95 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xs shadow-2xl">
            <div className="text-3xl mb-2">🌿</div>
            <h3 className="text-base font-bold text-white mb-1">Raport CO₂ Lifecycle</h3>
            <p className="text-xs text-slate-400 mb-3">Analiza emisiilor EN 15978 (module A–D) cu benchmark-uri Green Deal 2030/2050</p>
            <div className="text-xs text-amber-300 font-medium">Disponibil din planul Standard</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">GWP total anvelopa</div>
          <div className="text-2xl font-bold text-white">{totalGWP?.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500">kgCO₂eq</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">GWP per m²</div>
          <div className="text-2xl font-bold text-white">{gwpPerM2?.toFixed(1)}</div>
          <div className="text-[10px] text-slate-500">kgCO₂eq/m²</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">GWP per m²/an</div>
          <div className="text-2xl font-bold" style={{ color: classColor }}>{gwpPerM2Year?.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500">kgCO₂eq/(m²·an)</div>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ background: classColor + "15", borderColor: classColor + "40" }}>
          <div className="text-xs text-slate-400 mb-1">Clasificare GWP</div>
          <div className="text-xl font-bold" style={{ color: classColor }}>{classification?.charAt(0)}</div>
          <div className="text-[10px]" style={{ color: classColor + "cc" }}>{classification}</div>
        </div>
      </div>

      {/* Benchmark linie */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="text-xs font-medium text-slate-400 mb-3">Comparare cu benchmark-uri — kgCO₂eq/(m²·an)</div>
        <div className="space-y-2">
          {/* Valoarea clădirii */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-xs text-white font-medium shrink-0">Această clădire</div>
            <div className="flex-1 bg-slate-700 rounded-full h-3 relative">
              <div className="h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, (gwpPerM2Year || 0) / 30 * 100)}%`, backgroundColor: classColor }} />
            </div>
            <div className="w-16 text-right text-xs font-mono text-white shrink-0">{gwpPerM2Year?.toFixed(2)}</div>
          </div>
          {/* Benchmark-uri */}
          {BENCHMARKS.map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <div className="w-32 text-xs text-slate-400 shrink-0">{b.label}</div>
              <div className="flex-1 bg-slate-700 rounded-full h-3 relative">
                <div className="h-3 rounded-full"
                  style={{ width: `${Math.min(100, b.value / 30 * 100)}%`, backgroundColor: b.color }} />
              </div>
              <div className="w-16 text-right text-xs font-mono shrink-0" style={{ color: b.color }}>{b.value}</div>
            </div>
          ))}
        </div>
        {/* Verdict conformitate */}
        <div className="flex gap-2 flex-wrap mt-3">
          {BENCHMARKS.map(b => {
            const ok = (gwpPerM2Year || 0) <= b.value;
            return (
              <span key={b.label} className={`text-[10px] px-2 py-0.5 rounded-full border ${ok ? "border-green-500/40 text-green-300 bg-green-900/20" : "border-slate-600 text-slate-500 bg-slate-800/50"}`}>
                {ok ? "✓" : "✗"} {b.label.split(" ")[0]} {b.label.split(" ")[1]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Grafic module lifecycle */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="text-xs font-medium text-slate-400 mb-3 uppercase">Module EN 15978 — kgCO₂eq</div>
        <div className="space-y-2">
          {modules.map(({ key, value }) => {
            const meta = MODULE_LABELS[key];
            const isCredit = key === "gwp_D";
            const absVal = Math.abs(value || 0);
            const pct = maxModule > 0 ? absVal / maxModule * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-44 text-[11px] shrink-0" style={{ color: isCredit ? meta.color : "rgb(203,213,225)" }}>
                  {meta.label}
                </div>
                <div className="flex-1 bg-slate-700 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: meta.color }} />
                </div>
                <div className="w-20 text-right text-[11px] font-mono shrink-0"
                  style={{ color: isCredit ? "#10b981" : "rgb(203,213,225)" }}>
                  {isCredit && value < 0 ? "-" : ""}{absVal.toFixed(0)} kg
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-slate-500 mt-3">
          Durată de viață analizată: 50 ani · EN 15978:2011
        </div>
      </div>

      {/* Tabel detalii pe materiale (top 10) */}
      {details?.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-3 uppercase">Detalii pe materiale (primele 10)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-left py-1.5 font-medium">Material</th>
                  <th className="text-right py-1.5 px-2 font-medium">Masă (kg)</th>
                  <th className="text-right py-1.5 px-2 font-medium">Factor (kgCO₂/kg)</th>
                  <th className="text-right py-1.5 px-2 font-medium">GWP A1-A3 (kg)</th>
                </tr>
              </thead>
              <tbody>
                {[...details]
                  .sort((a, b) => (b.gwp_a1a3 || 0) - (a.gwp_a1a3 || 0))
                  .slice(0, 10)
                  .map((d, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1.5 text-slate-300 truncate max-w-[150px]">{d.material}</td>
                      <td className="py-1.5 text-right font-mono text-slate-400 px-2">{(d.mass || 0).toFixed(0)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-400 px-2">{(d.gwpFactor || 0).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono text-white px-2">{(d.gwp_a1a3 || 0).toFixed(0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-500 italic">
        Calcul conform EN 15978:2011 — module A1–A3 (producție), A4 (transport), A5 (execuție), B2–B3 (mentenanță), B4 (înlocuire), C (eliminare), D (reciclare credit). Factori GWP din baza de date Zephren / Ecoinvent estimativ.
      </p>
    </div>
  );
}
