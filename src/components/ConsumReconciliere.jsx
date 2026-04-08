import { useState, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";

const LUNI = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
const LS_KEY = "zephren_measured_consumption";
const DEF_FACTOR = 10.55;

function emptyRow() { return { gas_m3: "", electric_kwh: "" }; }
function initRows() { return Array.from({ length: 12 }, emptyRow); }

function calcR2(measured, calculated) {
  const pairs = measured.map((m, i) => [m, calculated[i]]).filter(([m, c]) => m != null && c != null && !isNaN(m) && !isNaN(c));
  if (pairs.length < 2) return null;
  const n = pairs.length;
  const meanM = pairs.reduce((s, [m]) => s + m, 0) / n;
  const meanC = pairs.reduce((s, [, c]) => s + c, 0) / n;
  const num = pairs.reduce((s, [m, c]) => s + (m - meanM) * (c - meanC), 0);
  const denM = Math.sqrt(pairs.reduce((s, [m]) => s + (m - meanM) ** 2, 0));
  const denC = Math.sqrt(pairs.reduce((s, [, c]) => s + (c - meanC) ** 2, 0));
  if (denM === 0 || denC === 0) return null;
  return (num / (denM * denC)) ** 2;
}

function fitLabel(r2) {
  if (r2 === null) return "—";
  if (r2 > 0.9) return "Foarte bun";
  if (r2 > 0.7) return "Bun";
  if (r2 > 0.5) return "Acceptabil";
  return "Slab — verificați datele";
}

function fitColor(r2) {
  if (r2 === null) return "text-slate-400";
  if (r2 > 0.9) return "text-emerald-400";
  if (r2 > 0.7) return "text-amber-400";
  if (r2 > 0.5) return "text-orange-400";
  return "text-red-400";
}

function KpiCard({ label, value, unit, sub, color = "text-amber-300" }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className={cn("text-2xl font-bold", color)}>{value ?? "—"}{unit && <span className="text-sm font-normal ml-1 text-slate-400">{unit}</span>}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function BarChart({ measuredMonthly, calculatedMonthly }) {
  const all = [...measuredMonthly, ...calculatedMonthly].filter(v => v > 0);
  const maxVal = all.length ? Math.max(...all) : 1;
  const W = 500, H = 160, PAD_L = 36, PAD_B = 24, PAD_T = 10, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;
  const slotW = chartW / 12;
  const barW = Math.max(slotW * 0.35, 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + chartH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#334155" strokeWidth="0.5" />
            <text x={PAD_L - 3} y={y + 3.5} textAnchor="end" fontSize="8" fill="#64748b">
              {Math.round(maxVal * f)}
            </text>
          </g>
        );
      })}
      {LUNI.map((lun, i) => {
        const cx = PAD_L + i * slotW + slotW / 2;
        const mVal = measuredMonthly[i] || 0;
        const cVal = calculatedMonthly[i] || 0;
        const mH = maxVal > 0 ? (mVal / maxVal) * chartH : 0;
        const cH = maxVal > 0 ? (cVal / maxVal) * chartH : 0;
        return (
          <g key={i}>
            <rect x={cx - barW - 1} y={PAD_T + chartH - mH} width={barW} height={mH} fill="#f59e0b" rx="1" opacity="0.85" />
            <rect x={cx + 1} y={PAD_T + chartH - cH} width={barW} height={cH} fill="#3b82f6" rx="1" opacity="0.75" />
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">{lun}</text>
          </g>
        );
      })}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + chartH} stroke="#475569" strokeWidth="1" />
      <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + chartH} y2={PAD_T + chartH} stroke="#475569" strokeWidth="1" />
      <rect x={W - PAD_R - 90} y={PAD_T} width={8} height={8} fill="#f59e0b" rx="1" />
      <text x={W - PAD_R - 79} y={PAD_T + 7} fontSize="8" fill="#94a3b8">Măsurat</text>
      <rect x={W - PAD_R - 90} y={PAD_T + 12} width={8} height={8} fill="#3b82f6" rx="1" />
      <text x={W - PAD_R - 79} y={PAD_T + 19} fontSize="8" fill="#94a3b8">Calculat</text>
    </svg>
  );
}

export default function ConsumReconciliere({ instSummary = {}, building = {} }) {
  const { ep_total_m2 = null, monthly = [] } = instSummary;
  const { areaUseful = 0 } = building;

  const [modul, setModul] = useState("lunar"); // "anual" | "lunar"
  const [rows, setRows] = useState(initRows);
  const [factorConv, setFactorConv] = useState(DEF_FACTOR);
  const [anualGaz, setAnualGaz] = useState("");
  const [anualElec, setAnualElec] = useState("");

  // localStorage init
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!saved) return;
      if (saved.factor_conv) setFactorConv(saved.factor_conv);
      if (saved.monthly?.length === 12) setRows(saved.monthly.map(r => ({ gas_m3: r.gas_m3 ?? "", electric_kwh: r.electric_kwh ?? "" })));
      if (saved.anual_gaz != null) setAnualGaz(saved.anual_gaz);
      if (saved.anual_elec != null) setAnualElec(saved.anual_elec);
      if (saved.modul) setModul(saved.modul);
    } catch { /* ignorat */ }
  }, []);

  const persist = useCallback((newRows, fc, ag, ae, mod) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ monthly: newRows, factor_conv: fc, anual_gaz: ag, anual_elec: ae, modul: mod }));
    } catch { /* ignorat */ }
  }, []);

  function updateRow(idx, field, val) {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    setRows(next);
    persist(next, factorConv, anualGaz, anualElec, modul);
  }

  function handleFactorConv(v) { setFactorConv(v); persist(rows, v, anualGaz, anualElec, modul); }
  function handleAnualGaz(v) { setAnualGaz(v); persist(rows, factorConv, v, anualElec, modul); }
  function handleAnualElec(v) { setAnualElec(v); persist(rows, factorConv, anualGaz, v, modul); }
  function handleModul(v) { setModul(v); persist(rows, factorConv, anualGaz, anualElec, v); }

  // Calcule
  const fc = parseFloat(factorConv) || DEF_FACTOR;
  const Au = parseFloat(areaUseful) || 1;

  let Q_gaz_total = 0, Q_elec_total = 0;
  const measuredMonthly = Array(12).fill(0);

  if (modul === "anual") {
    Q_gaz_total = (parseFloat(anualGaz) || 0) * fc;
    Q_elec_total = parseFloat(anualElec) || 0;
  } else {
    rows.forEach((r, i) => {
      const g = (parseFloat(r.gas_m3) || 0) * fc;
      const e = parseFloat(r.electric_kwh) || 0;
      measuredMonthly[i] = g + e;
      Q_gaz_total += g;
      Q_elec_total += e;
    });
  }

  const Q_total = Q_gaz_total + Q_elec_total;
  const EP_masurat = Au > 0 && Q_total > 0 ? Q_total / Au : null;
  const EP_calculat = ep_total_m2 ?? null;
  const diferenta = EP_masurat != null && EP_calculat != null && EP_calculat !== 0
    ? ((EP_masurat - EP_calculat) / EP_calculat) * 100 : null;

  const calcMonthly = monthly.map(m => (m?.qH_nd ?? 0) + (m?.qC_nd ?? 0));
  const r2 = modul === "lunar" ? calcR2(measuredMonthly, calcMonthly) : null;

  // Diagnoze
  let diagnoza = null;
  if (diferenta != null) {
    if (diferenta > 20) diagnoza = { tip: "warn", text: "Model subestimează consumul — verificați: infiltrații, punți termice, date climatice." };
    else if (diferenta < -20) diagnoza = { tip: "info", text: "Model supraestimează — posibil: ocupare redusă, temperaturi interioare < normativ." };
    else diagnoza = { tip: "ok", text: "✓ Model calibrat — discrepanță acceptabilă conform ET." };
  }

  // Export CSV
  function exportCSV() {
    const lines = ["Luna,Gaz (m³),Electric (kWh),Total măsurat (kWh),Calculat (kWh)"];
    LUNI.forEach((lun, i) => {
      const g = modul === "lunar" ? (parseFloat(rows[i].gas_m3) || 0) : ((parseFloat(anualGaz) || 0) / 12);
      const e = modul === "lunar" ? (parseFloat(rows[i].electric_kwh) || 0) : ((parseFloat(anualElec) || 0) / 12);
      const meas = g * fc + e;
      const calc = calcMonthly[i] ?? 0;
      lines.push(`${lun},${g.toFixed(2)},${e.toFixed(2)},${meas.toFixed(2)},${calc.toFixed(2)}`);
    });
    lines.push(`,,,,`);
    lines.push(`Total,${(Q_gaz_total / fc).toFixed(2)},${Q_elec_total.toFixed(2)},${Q_total.toFixed(2)},${(EP_calculat != null ? EP_calculat * Au : 0).toFixed(2)}`);
    lines.push(`EP măsurat (kWh/m²an),${EP_masurat != null ? EP_masurat.toFixed(1) : "—"},,,`);
    lines.push(`EP calculat (kWh/m²an),${EP_calculat != null ? EP_calculat.toFixed(1) : "—"},,,`);
    lines.push(`Diferență (%),${diferenta != null ? diferenta.toFixed(1) : "—"},,,`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "reconciliere_consum.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const difColor = diferenta == null ? "text-slate-400" : Math.abs(diferenta) <= 10 ? "text-emerald-400" : Math.abs(diferenta) <= 20 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-6 text-sm text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-amber-300">Reconciliere Consum Energetic</h2>
          <p className="text-xs text-slate-500 mt-0.5">ET pct. 6.3 — Calibrare model față de consum facturat</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden text-xs">
            {["anual","lunar"].map(m => (
              <button key={m} onClick={() => handleModul(m)}
                className={cn("px-3 py-1.5 transition-colors", modul === m ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-slate-200")}>
                {m === "anual" ? "Date anuale" : "Date lunare"}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Factor conversie */}
      <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
        <span className="text-slate-400 text-xs">Factor conversie gaz:</span>
        <input type="number" step="0.01" value={factorConv}
          onChange={e => handleFactorConv(e.target.value)}
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50" />
        <span className="text-slate-500 text-xs">kWh/m³</span>
        <span className="ml-auto text-slate-600 text-xs italic">Implicit: {DEF_FACTOR} kWh/m³ (PCS gaz natural)</span>
      </div>

      {/* Input date */}
      {modul === "anual" ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total anual</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Gaz natural (m³/an)</span>
              <input type="number" min="0" value={anualGaz} onChange={e => handleAnualGaz(e.target.value)}
                placeholder="0"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Energie electrică (kWh/an)</span>
              <input type="number" min="0" value={anualElec} onChange={e => handleAnualElec(e.target.value)}
                placeholder="0"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 gap-0 text-xs text-slate-500 uppercase tracking-wider px-4 py-2 border-b border-white/8">
            <span>Luna</span><span>Gaz (m³)</span><span>Electric (kWh)</span><span className="text-right">Total (kWh)</span>
          </div>
          <div className="divide-y divide-white/5">
            {rows.map((r, i) => {
              const g = (parseFloat(r.gas_m3) || 0) * fc;
              const e = parseFloat(r.electric_kwh) || 0;
              const tot = g + e;
              return (
                <div key={i} className={cn("grid grid-cols-4 gap-0 items-center px-4 py-1.5", i % 2 === 0 ? "" : "bg-white/2")}>
                  <span className="text-slate-400 text-xs font-medium">{LUNI[i]}</span>
                  <input type="number" min="0" value={r.gas_m3} onChange={e2 => updateRow(i, "gas_m3", e2.target.value)}
                    placeholder="0"
                    className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/40 transition-all" />
                  <input type="number" min="0" value={r.electric_kwh} onChange={e2 => updateRow(i, "electric_kwh", e2.target.value)}
                    placeholder="0"
                    className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/40 transition-all" />
                  <span className="text-right text-xs text-slate-300">{tot > 0 ? tot.toFixed(0) : "—"}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-0 px-4 py-2 border-t border-white/10 bg-white/3 text-xs font-medium">
            <span className="text-slate-400">TOTAL</span>
            <span className="text-slate-300">{(Q_gaz_total / fc).toFixed(0)} m³</span>
            <span className="text-slate-300">{Q_elec_total.toFixed(0)} kWh</span>
            <span className="text-right text-amber-300">{Q_total.toFixed(0)} kWh</span>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="EP Măsurat" value={EP_masurat != null ? EP_masurat.toFixed(1) : "—"} unit="kWh/m²an" color="text-amber-300" />
        <KpiCard label="EP Calculat" value={EP_calculat != null ? EP_calculat.toFixed(1) : "—"} unit="kWh/m²an" color="text-blue-400" />
        <KpiCard label="Diferență" value={diferenta != null ? (diferenta > 0 ? "+" : "") + diferenta.toFixed(1) : "—"} unit="%" color={difColor} />
        <KpiCard label="Concordanță R²" value={r2 != null ? r2.toFixed(3) : "—"} sub={fitLabel(r2)} color={fitColor(r2)} />
      </div>

      {/* Diagnoză */}
      {diagnoza && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm",
          diagnoza.tip === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : diagnoza.tip === "warn" ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-blue-500/10 border-blue-500/30 text-blue-300")}>
          {diagnoza.text}
        </div>
      )}

      {/* Grafic comparativ */}
      {modul === "lunar" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Comparație lunară (kWh)</p>
          <BarChart measuredMonthly={measuredMonthly} calculatedMonthly={calcMonthly} />
        </div>
      )}
    </div>
  );
}
