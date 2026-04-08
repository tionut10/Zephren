/**
 * MonteCarloEP — Analiză incertitudine EP prin simulare Monte Carlo
 * Metodologie: N=1000 iterații, distribuție normală (Box-Muller),
 * interval de încredere 90% [P5–P95], diagramă tornado sensibilitate
 */
import { useState, useEffect, useMemo } from "react";
import { cn } from "./ui.jsx";

// Limite nZEB orientative per categorie (kWh/m²an) — Mc001/2022
const NZEB_LIMITS = {
  residential:    100,
  office:          90,
  education:       85,
  hotel:          110,
  healthcare:     120,
  commercial:     105,
  default:        100,
};

function getNzebLimit(category) {
  if (!category) return NZEB_LIMITS.default;
  const key = String(category).toLowerCase();
  for (const [k, v] of Object.entries(NZEB_LIMITS)) {
    if (key.includes(k)) return v;
  }
  return NZEB_LIMITS.default;
}

// Box-Muller — eșantionare distribuție normală standard
function randn() {
  let u, v;
  do { u = Math.random(); } while (u === 0);
  v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sample(mean, uncertPct) {
  const sigma = Math.abs(mean) * (uncertPct / 100);
  return mean + sigma * randn();
}

const DEFAULT_PARAMS = [
  { id: "u_perete",  label: "U_perete",      unit: "W/m²K", mean: 0.40,  unc: 15 },
  { id: "u_fereastra",label:"U_fereastra",   unit: "W/m²K", mean: 1.40,  unc: 10 },
  { id: "n50",       label: "n50",            unit: "h⁻¹",  mean: 4.0,   unc: 25 },
  { id: "t_ext",     label: "Temp. ext.",     unit: "°C",   mean: -15,   unc: 5  },
  { id: "ocupare",   label: "Ocupare",        unit: "pers/m²",mean:0.04,  unc: 30 },
  { id: "randament", label: "Randament sist.",unit: "%",    mean: 92,    unc: 8  },
];

function runMonteCarlo(params, epBase, N = 1000) {
  const base = Object.fromEntries(params.map(p => [p.id, p.mean]));
  const results = [];

  for (let i = 0; i < N; i++) {
    const s = Object.fromEntries(params.map(p => [p.id, sample(p.mean, p.unc)]));
    // EP simplificat: scalăm EP_base după raportul parametrilor față de valorile de bază
    // Câștiguri interne reduc EP proporțional cu ocuparea
    const internalGainFactor = 1 - 0.05 * ((s.ocupare - base.ocupare) / Math.abs(base.ocupare || 1));
    const ep_i = epBase
      * (s.u_perete   / base.u_perete)
      * (s.n50        / base.n50)
      / (s.randament  / base.randament)
      * (Math.abs(s.t_ext) / Math.abs(base.t_ext))
      * internalGainFactor;
    results.push(ep_i);
  }
  results.sort((a, b) => a - b);
  return results;
}

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(sorted, epLimit) {
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const p5  = percentile(sorted, 5);
  const p25 = percentile(sorted, 25);
  const p50 = percentile(sorted, 50);
  const p75 = percentile(sorted, 75);
  const p95 = percentile(sorted, 95);
  const cv  = (std / mean) * 100;
  const probExceed = (sorted.filter(v => v > epLimit).length / n) * 100;
  return { mean, std, cv, p5, p25, p50, p75, p95, probExceed };
}

function buildHistogram(sorted, bins = 20) {
  const min = sorted[0], max = sorted[sorted.length - 1];
  const width = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  for (const v of sorted) {
    const idx = Math.min(Math.floor((v - min) / width), bins - 1);
    counts[idx]++;
  }
  return { counts, min, max, width, total: sorted.length };
}

function computeTornado(params, epBase) {
  return params.map(p => {
    const base = Object.fromEntries(params.map(q => [q.id, q.mean]));
    const sigma = Math.abs(p.mean) * (p.unc / 100);
    const up = { ...base, [p.id]: p.mean + sigma };
    const dn = { ...base, [p.id]: p.mean - sigma };
    function calcEP(s) {
      const internalGainFactor = 1 - 0.05 * ((s.ocupare - base.ocupare) / Math.abs(base.ocupare || 1));
      return epBase
        * (s.u_perete   / base.u_perete)
        * (s.n50        / base.n50)
        / (s.randament  / base.randament)
        * (Math.abs(s.t_ext) / Math.abs(base.t_ext))
        * internalGainFactor;
    }
    const epUp = calcEP(up);
    const epDn = calcEP(dn);
    return { id: p.id, label: p.label, unit: p.unit, epUp, epDn, impact: Math.abs(epUp - epDn) };
  }).sort((a, b) => b.impact - a.impact);
}

// ── SVG Histogram ────────────────────────────────────────────────────────────
function Histogram({ sorted, stats, epBase, epLimit }) {
  const W = 540, H = 200, PAD = { top: 12, right: 20, bottom: 36, left: 44 };
  const { counts, min, max, width } = buildHistogram(sorted, 20);
  const maxCount = Math.max(...counts);
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const binW = chartW / counts.length;

  function xOf(val) {
    return PAD.left + ((val - min) / (max - min || 1)) * chartW;
  }
  function yOf(count) {
    return PAD.top + chartH - (count / maxCount) * chartH;
  }

  const xTicks = [min, stats.p25, stats.p50, stats.p75, max].map(v => ({ v, x: xOf(v) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Bins */}
      {counts.map((c, i) => {
        const binMin = min + i * width;
        const binMax = binMin + width;
        const midVal = (binMin + binMax) / 2;
        let fill = "#f59e0b"; // amber (middle)
        if (midVal < stats.p25) fill = "#22c55e";       // green
        else if (midVal > stats.p75) fill = "#ef4444";  // red
        const x = PAD.left + i * binW;
        const barH = (c / maxCount) * chartH;
        const y = PAD.top + chartH - barH;
        return (
          <rect key={i} x={x + 1} y={y} width={Math.max(binW - 2, 1)} height={barH}
            fill={fill} fillOpacity={0.75} rx={1} />
        );
      })}

      {/* Dashed vertical lines */}
      {[
        { val: epBase,    color: "#60a5fa", label: "EP₀" },
        { val: stats.p5,  color: "#4ade80", label: "P5"  },
        { val: stats.p95, color: "#f87171", label: "P95" },
        { val: epLimit,   color: "#c084fc", label: "nZEB"},
      ].map(({ val, color, label }) => {
        const x = xOf(val);
        if (x < PAD.left || x > W - PAD.right) return null;
        return (
          <g key={label}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
              stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={x + 3} y={PAD.top + 10} fill={color} fontSize={9} fontFamily="monospace">{label}</text>
          </g>
        );
      })}

      {/* Y-axis label */}
      <text x={PAD.left - 6} y={PAD.top + chartH / 2} fill="#94a3b8" fontSize={9}
        textAnchor="middle" dominantBaseline="middle"
        transform={`rotate(-90, ${PAD.left - 26}, ${PAD.top + chartH / 2})`}>
        Frecvență (%)
      </text>

      {/* Y-axis ticks */}
      {[0, 25, 50, 75, 100].map(pct => {
        const count = (pct / 100) * maxCount;
        const y = yOf(count);
        const freqPct = ((pct / 100) * maxCount / sorted.length * 100).toFixed(0);
        return (
          <g key={pct}>
            <line x1={PAD.left - 4} y1={y} x2={PAD.left} y2={y} stroke="#475569" strokeWidth={1} />
            <text x={PAD.left - 6} y={y} fill="#94a3b8" fontSize={8} textAnchor="end" dominantBaseline="middle">
              {freqPct}%
            </text>
          </g>
        );
      })}

      {/* X-axis */}
      <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH}
        stroke="#475569" strokeWidth={1} />
      {xTicks.map(({ v, x }) => (
        <g key={v}>
          <line x1={x} y1={PAD.top + chartH} x2={x} y2={PAD.top + chartH + 4} stroke="#475569" strokeWidth={1} />
          <text x={x} y={PAD.top + chartH + 13} fill="#94a3b8" fontSize={8} textAnchor="middle">
            {v.toFixed(0)}
          </text>
        </g>
      ))}
      <text x={PAD.left + chartW / 2} y={H - 4} fill="#94a3b8" fontSize={9} textAnchor="middle">
        EP (kWh/m²an)
      </text>
    </svg>
  );
}

// ── SVG Tornado ──────────────────────────────────────────────────────────────
function TornadoChart({ tornado, epBase }) {
  const W = 540, ROW = 28, PAD = { top: 8, left: 120, right: 20, bottom: 8 };
  const H = PAD.top + tornado.length * ROW + PAD.bottom;
  const chartW = W - PAD.left - PAD.right;
  const maxImpact = Math.max(...tornado.map(t => t.impact), 1);
  const midX = PAD.left + chartW / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H + 10 }}>
      {tornado.map((t, i) => {
        const y = PAD.top + i * ROW;
        const halfImpact = (t.impact / 2 / maxImpact) * (chartW / 2);
        const epUpDelta = t.epUp - epBase;
        const epDnDelta = t.epDn - epBase;

        // Bar from center: positive delta goes right (bad), negative left (good)
        const posRight = Math.max(epUpDelta, epDnDelta);
        const posLeft  = Math.min(epUpDelta, epDnDelta);
        const barR = Math.abs(posRight / maxImpact) * (chartW / 2);
        const barL = Math.abs(posLeft  / maxImpact) * (chartW / 2);

        return (
          <g key={t.id}>
            {/* Label */}
            <text x={PAD.left - 6} y={y + ROW / 2} fill="#cbd5e1" fontSize={10}
              textAnchor="end" dominantBaseline="middle">
              {t.label}
            </text>
            {/* +σ bar (right of center) */}
            <rect x={midX} y={y + 4} width={barR} height={ROW - 8}
              fill="#f87171" fillOpacity={0.7} rx={2} />
            {/* -σ bar (left of center) */}
            <rect x={midX - barL} y={y + 4} width={barL} height={ROW - 8}
              fill="#4ade80" fillOpacity={0.7} rx={2} />
            {/* Impact label */}
            <text x={midX + barR + 4} y={y + ROW / 2} fill="#94a3b8" fontSize={8} dominantBaseline="middle">
              ±{t.impact.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Center line */}
      <line x1={midX} y1={PAD.top} x2={midX} y2={H - PAD.bottom}
        stroke="#64748b" strokeWidth={1} strokeDasharray="3 2" />

      {/* Axis labels */}
      <text x={PAD.left + 4} y={PAD.top - 1} fill="#94a3b8" fontSize={8}>−σ (mai bun)</text>
      <text x={W - PAD.right - 4} y={PAD.top - 1} fill="#94a3b8" fontSize={8} textAnchor="end">+σ (mai slab)</text>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function MonteCarloEP({ instSummary = {}, building = {} }) {
  const epBase = instSummary?.ep_total_m2 ?? instSummary?.ep_heating_m2 ?? 120;
  const nzebLimit = getNzebLimit(building?.category);

  const [params, setParams] = useState(() =>
    DEFAULT_PARAMS.map(p => {
      // Pre-fill U_perete din instSummary dacă există
      if (p.id === "u_perete" && instSummary?.ep_heating_m2) {
        // Estimare: U_perete proporțional cu EP_incalzire / referință 120 kWh/m²
        const scale = (instSummary.ep_heating_m2 / 120);
        return { ...p, mean: +(p.mean * scale).toFixed(3) };
      }
      return { ...p };
    })
  );
  const [epLimit, setEpLimit] = useState(nzebLimit);
  const [results, setResults] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [runCount, setRunCount] = useState(0);

  function runSim() {
    const t0 = performance.now();
    const sorted = runMonteCarlo(params, epBase, 1000);
    const stats  = computeStats(sorted, epLimit);
    const tornado = computeTornado(params, epBase);
    setResults({ sorted, stats, tornado });
    setElapsed(+(performance.now() - t0).toFixed(1));
    setRunCount(c => c + 1);
  }

  // Rulare automată la montare
  useEffect(() => { runSim(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateParam(id, field, rawVal) {
    const val = parseFloat(rawVal);
    if (isNaN(val)) return;
    setParams(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  }

  const stats   = results?.stats;
  const sorted  = results?.sorted;
  const tornado = results?.tornado;

  const inputCls = "bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-right w-24 focus:outline-none focus:border-amber-500/50 transition-colors";

  return (
    <div className="flex flex-col gap-6 text-slate-200">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">Simulare Monte Carlo — Incertitudine EP</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            EP de bază: <span className="text-amber-300 font-mono">{epBase.toFixed(1)} kWh/m²an</span>
            {" · "}N = 1 000 iterații{" · "}distribuție normală (Box-Muller)
          </p>
        </div>
        <button
          onClick={runSim}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm font-medium transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Rulează din nou
          {runCount > 0 && (
            <span className="text-xs text-slate-400 font-normal">(#{runCount} · {elapsed} ms)</span>
          )}
        </button>
      </div>

      {/* Tabel parametri */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-sm font-medium text-slate-300">Parametri incerți — editabili</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <th className="px-4 py-2 text-left">Parametru</th>
              <th className="px-4 py-2 text-left">Unitate</th>
              <th className="px-4 py-2 text-right">Medie (μ)</th>
              <th className="px-4 py-2 text-right">Incertitudine (±%)</th>
              <th className="px-4 py-2 text-right text-slate-600">σ</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => {
              const sigma = Math.abs(p.mean) * (p.unc / 100);
              return (
                <tr key={p.id} className={cn("border-b border-white/5", i % 2 === 0 ? "bg-white/[0.02]" : "")}>
                  <td className="px-4 py-2 font-medium text-slate-200">{p.label}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">{p.unit}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={p.mean} step="any"
                      onChange={e => updateParam(p.id, "mean", e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={p.unc} min={1} max={50} step={1}
                      onChange={e => updateParam(p.id, "unc", e.target.value)}
                      className={inputCls} />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500 font-mono text-xs">
                    ±{sigma.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Statistici */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "P5",     val: stats.p5,   color: "text-green-400",  sub: "limită inferioară 90%CI" },
            { label: "Mediană",val: stats.p50,  color: "text-amber-400",  sub: "P50" },
            { label: "P95",    val: stats.p95,  color: "text-red-400",    sub: "limită superioară 90%CI" },
            { label: "CV",     val: stats.cv,   color: stats.cv > 20 ? "text-red-400" : "text-slate-300",
              sub: "coef. variație", suffix: "%" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</span>
              <span className={cn("text-xl font-bold font-mono", s.color)}>
                {s.val.toFixed(1)}{s.suffix ?? " kWh"}
              </span>
              <span className="text-xs text-slate-600">{s.sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* Histogram */}
      {sorted && stats && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10">
            <span className="text-sm font-medium text-slate-300">Distribuție EP simulat</span>
            <span className="text-xs text-slate-500 ml-3">
              verde &lt; P25 · amber P25–P75 · roșu &gt; P75
            </span>
          </div>
          <div className="p-4">
            <Histogram sorted={sorted} stats={stats} epBase={epBase} epLimit={epLimit} />
          </div>
        </div>
      )}

      {/* Tornado */}
      {tornado && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10">
            <span className="text-sm font-medium text-slate-300">Diagramă tornado — sensibilitate ±1σ</span>
          </div>
          <div className="p-4">
            <TornadoChart tornado={tornado} epBase={epBase} />
          </div>
        </div>
      )}

      {/* Limită nZEB configurabilă */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-sm text-slate-400">Limită nZEB de referință:</span>
        <input type="number" value={epLimit} min={30} max={300} step={5}
          onChange={e => setEpLimit(+e.target.value)}
          className={cn(inputCls, "w-28")} />
        <span className="text-xs text-slate-500">kWh/m²an</span>
        <button onClick={runSim}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 transition-all">
          Recalculează
        </button>
      </div>

      {/* Interpretare */}
      {stats && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col gap-2 text-sm">
          <p className="font-medium text-violet-300">Interpretare rezultate</p>
          <p className="text-slate-300">
            Interval de încredere 90%:{" "}
            <span className="font-mono text-green-400">{stats.p5.toFixed(1)}</span>
            {" – "}
            <span className="font-mono text-red-400">{stats.p95.toFixed(1)}</span>
            {" kWh/m²an"}
          </p>
          <p className="text-slate-300">
            Probabilitate depășire limită nZEB ({epLimit} kWh/m²):{" "}
            <span className={cn("font-mono font-semibold",
              stats.probExceed > 50 ? "text-red-400" : stats.probExceed > 20 ? "text-amber-400" : "text-green-400")}>
              {stats.probExceed.toFixed(1)}%
            </span>
          </p>
          <p className="text-slate-300">
            Medie: <span className="font-mono text-amber-300">{stats.mean.toFixed(1)} kWh/m²an</span>
            {" · "}StdDev: <span className="font-mono text-slate-400">{stats.std.toFixed(1)}</span>
            {" · "}CV: <span className={cn("font-mono", stats.cv > 20 ? "text-red-400" : "text-slate-400")}>
              {stats.cv.toFixed(1)}%
            </span>
          </p>
          {stats.cv > 20 && (
            <p className="mt-1 text-amber-300 flex items-start gap-2">
              <span>⚠️</span>
              <span>
                Incertitudine ridicată — recomandăm verificare pe teren a U-values și
                măsurători blower-door pentru n50.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
