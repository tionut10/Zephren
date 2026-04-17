import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "./ui.jsx";
import {
  normalizeConsumption,
  calibrationFactor,
} from "../calc/climate-normalization.js";
import { lookupClimate } from "../data/climate-data-na-2023.js";

const LUNI = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
const LS_KEY = "zephren_measured_consumption";
const DEF_FACTOR = 10.55;

// Distribuție lunară ACM (ușor mai mare iarna din cauza apei reci din rețea)
// Sumă = 1.000 — derivat din EN 15316-3-1 Anexa
const ACM_MONTHLY_SHARE = [0.095, 0.090, 0.085, 0.082, 0.078, 0.073, 0.070, 0.073, 0.080, 0.086, 0.090, 0.098];

// Distribuție lunară iluminat (max iarna, min vara) — bază durată zi RO lat ~45°N
// Sumă = 1.000
const LIGHT_MONTHLY_SHARE = [0.120, 0.100, 0.090, 0.075, 0.065, 0.055, 0.060, 0.070, 0.080, 0.095, 0.115, 0.125];

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
  const {
    ep_total_m2 = null,
    monthly = [],
    qACM_nd = 0,
    qf_l = 0,
  } = instSummary;
  const { areaUseful = 0, city = "", climate = null } = building;

  const [modul, setModul] = useState("lunar"); // "anual" | "lunar"
  const [rows, setRows] = useState(initRows);
  const [factorConv, setFactorConv] = useState(DEF_FACTOR);
  const [anualGaz, setAnualGaz] = useState("");
  const [anualElec, setAnualElec] = useState("");
  // Sprint 8 — normalizare climatică: GZE real an facturi (opțional override)
  const [gzeRealOverride, setGzeRealOverride] = useState("");

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
      if (saved.gze_real_override != null) setGzeRealOverride(saved.gze_real_override);
    } catch { /* ignorat */ }
  }, []);

  const persist = useCallback((newRows, fc, ag, ae, mod, gzeOv = gzeRealOverride) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        monthly: newRows, factor_conv: fc, anual_gaz: ag, anual_elec: ae,
        modul: mod, gze_real_override: gzeOv,
      }));
    } catch { /* ignorat */ }
  }, [gzeRealOverride]);

  function updateRow(idx, field, val) {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    setRows(next);
    persist(next, factorConv, anualGaz, anualElec, modul);
  }

  function handleFactorConv(v) { setFactorConv(v); persist(rows, v, anualGaz, anualElec, modul); }
  function handleAnualGaz(v) { setAnualGaz(v); persist(rows, factorConv, v, anualElec, modul); }
  function handleAnualElec(v) { setAnualElec(v); persist(rows, factorConv, anualGaz, v, modul); }
  function handleModul(v) { setModul(v); persist(rows, factorConv, anualGaz, anualElec, v); }
  function handleGzeReal(v) { setGzeRealOverride(v); persist(rows, factorConv, anualGaz, anualElec, modul, v); }

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

  // ── Sprint 8 — Normalizare climatică conform SR 4839:2014 ──
  const climateData = useMemo(() => {
    if (climate && typeof climate === "object") return climate;
    return city ? lookupClimate(city) : null;
  }, [climate, city]);

  const normalization = useMemo(() => {
    if (Q_total <= 0) return null;
    const gzeOverride = parseFloat(gzeRealOverride);
    const params = {
      consumKWh: Q_total,
      gzeConventional: climateData?.gzeConv,
      tBase: 12,
    };
    if (isFinite(gzeOverride) && gzeOverride > 0) {
      params.gzeReal = gzeOverride;
    } else if (climateData?.tempMonth) {
      // Fără date zilnice reale → folosim temperaturile lunare convenționale ale
      // localității drept proxy. Fără date de teren, k_clim rezultă 1.0 — UI-ul
      // încurajează introducerea GZE_real măsurat pentru calibrare efectivă.
      params.monthlyTemps = climateData.tempMonth;
    }
    return normalizeConsumption(params);
  }, [Q_total, climateData, gzeRealOverride]);

  const Q_total_normalizat = normalization?.consumNormalizat ?? Q_total;
  const EP_masurat_normalizat = Au > 0 && Q_total_normalizat > 0 ? Q_total_normalizat / Au : null;
  const kClim = normalization?.kClim ?? 1;

  const diferenta = EP_masurat_normalizat != null && EP_calculat != null && EP_calculat !== 0
    ? ((EP_masurat_normalizat - EP_calculat) / EP_calculat) * 100 : null;

  // ── Sprint 8 Fix #5 — calcMonthly include ACM + iluminat ──
  // Mc 001-2022 Cap. 9.2: consumul total include și ACM + iluminat, nu doar Q_NH/Q_NC
  const calcMonthly = monthly.map((m, i) => {
    const qH = m?.qH_nd ?? 0;
    const qC = m?.qC_nd ?? 0;
    const qACM_m = (qACM_nd || 0) * ACM_MONTHLY_SHARE[i];
    const qL_m = (qf_l || 0) * LIGHT_MONTHLY_SHARE[i];
    return qH + qC + qACM_m + qL_m;
  });
  const r2 = modul === "lunar" ? calcR2(measuredMonthly, calcMonthly) : null;

  // ── Sprint 8 Fix #2 — Factor de calibrare c (Mc 001-2022 Cap. 9.3) ──
  const calib = useMemo(() => {
    if (EP_masurat_normalizat == null || EP_calculat == null) {
      return { c: null, status: "unknown", interpretare: null, recomandari: [] };
    }
    return calibrationFactor(EP_masurat_normalizat, EP_calculat);
  }, [EP_masurat_normalizat, EP_calculat]);

  const cColor = calib.c == null
    ? "text-slate-400"
    : calib.status === "ok"
      ? "text-emerald-400"
      : calib.status === "subestimare"
        ? "text-red-400"
        : "text-amber-400";

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
    lines.push(`EP măsurat normalizat (kWh/m²an),${EP_masurat_normalizat != null ? EP_masurat_normalizat.toFixed(1) : "—"},,,`);
    lines.push(`k_clim,${kClim.toFixed(3)},,,`);
    lines.push(`EP calculat (kWh/m²an),${EP_calculat != null ? EP_calculat.toFixed(1) : "—"},,,`);
    lines.push(`Factor calibrare c,${calib.c != null ? calib.c.toFixed(3) : "—"},,,`);
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
          <p className="text-xs text-slate-500 mt-0.5">ET pct. 6.3 — Calibrare model față de consum facturat (SR 4839:2014 + Mc 001 Cap. 9.3)</p>
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

      {/* Factor conversie + GZE normalizare (Sprint 8) */}
      <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Factor conversie gaz:</span>
          <input type="number" step="0.01" value={factorConv}
            onChange={e => handleFactorConv(e.target.value)}
            className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50" />
          <span className="text-slate-500 text-xs">kWh/m³</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-slate-400 text-xs">GZE real an (opțional):</span>
          <input type="number" step="10" min="0" value={gzeRealOverride}
            onChange={e => handleGzeReal(e.target.value)}
            placeholder={climateData?.gzeConv ? `conv. ${climateData.gzeConv}` : "—"}
            className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50" />
          <span className="text-slate-500 text-xs">K·zi/an</span>
        </div>
      </div>
      {climateData && (
        <p className="text-[11px] text-slate-500 italic -mt-3">
          GZE convențional pentru {climateData.nume} (zona {climateData.zona}): {climateData.gzeConv} K·zi/an ·
          k_clim aplicat: <span className={cn("font-mono", kClim !== 1 ? "text-amber-400" : "text-slate-400")}>{kClim.toFixed(3)}</span>
        </p>
      )}

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

      {/* KPI cards — Sprint 8: 5 carduri (adăugat factor c + normalizat) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="EP Măsurat" value={EP_masurat != null ? EP_masurat.toFixed(1) : "—"} unit="kWh/m²an" color="text-amber-300" sub="brut (nefiltrat)" />
        <KpiCard label="EP Normalizat" value={EP_masurat_normalizat != null ? EP_masurat_normalizat.toFixed(1) : "—"} unit="kWh/m²an" color="text-amber-400" sub={`k_clim = ${kClim.toFixed(3)}`} />
        <KpiCard label="EP Calculat" value={EP_calculat != null ? EP_calculat.toFixed(1) : "—"} unit="kWh/m²an" color="text-blue-400" sub="motor Zephren" />
        <KpiCard label="Factor c" value={calib.c != null ? calib.c.toFixed(3) : "—"} sub={calib.status === "ok" ? "✓ calibrat" : calib.status === "subestimare" ? "subestimează" : calib.status === "supraestimare" ? "supraestimează" : ""} color={cColor} />
        <KpiCard label="Concordanță R²" value={r2 != null ? r2.toFixed(3) : "—"} sub={fitLabel(r2)} color={fitColor(r2)} />
      </div>

      {/* Diagnoză factor c + recomandări */}
      {calib.interpretare && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm space-y-2",
          calib.status === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : calib.status === "subestimare" ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-300")}>
          <p className="font-medium">{calib.interpretare}</p>
          {calib.recomandari.length > 0 && (
            <ul className="text-xs list-disc list-inside space-y-0.5 opacity-90">
              {calib.recomandari.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Diagnoză diferență % (rămâne ca fallback) */}
      {diferenta != null && !calib.interpretare && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm",
          Math.abs(diferenta) <= 20 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : diferenta > 20 ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-blue-500/10 border-blue-500/30 text-blue-300")}>
          <span className={difColor}>Diferență: {diferenta > 0 ? "+" : ""}{diferenta.toFixed(1)}%</span>
        </div>
      )}

      {/* Grafic comparativ */}
      {modul === "lunar" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Comparație lunară (kWh)</p>
          <BarChart measuredMonthly={measuredMonthly} calculatedMonthly={calcMonthly} />
          <p className="text-[11px] text-slate-500 italic mt-2">
            Consumul calculat include Q_NH + Q_NC + Q_ACM (distribuit sezonier) + Q_L iluminat
          </p>
        </div>
      )}
    </div>
  );
}
