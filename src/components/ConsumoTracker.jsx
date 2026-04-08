import { useState, useMemo } from "react";
import { cn, Card, Input, Select } from "./ui.jsx";

const MONTHS_RO = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEVIATII_CAUZE = [
  "Mai mulți ocupanți decât estimat",
  "Iarnă mai rece decât normal",
  "Vară mai caldă decât normal",
  "Echipamente electrice suplimentare",
  "Pierderi termice necalificate (punți termice)",
  "Sistem de încălzire mai puțin eficient în exploatare",
  "Comportament neoptim al utilizatorilor",
  "Eroare de citire contor / factură",
  "Modificări constructive neautorizate",
  "Altele",
];

function kwhFromGcal(gcal) { return gcal * 1163; }
function kwhFromMc(mc, pci = 9.5) { return mc * pci; }

function deviationColor(pct) {
  const abs = Math.abs(pct);
  if (abs <= 10) return { text: "text-emerald-400", bg: "bg-emerald-500/15", label: "Normal (±10%)" };
  if (abs <= 20) return { text: "text-amber-400",   bg: "bg-amber-500/15",   label: "Atenție (±20%)" };
  return          { text: "text-red-400",            bg: "bg-red-500/15",     label: "Abatere mare (>20%)" };
}

function ComparisonChart({ data, maxVal }) {
  if (!data || data.length === 0) return null;
  const height = 120;
  const barMaxH = 88;

  return (
    <div className="flex items-end gap-1 h-36">
      {data.map((d, i) => {
        const calcH = maxVal > 0 ? Math.max((d.calc / maxVal) * barMaxH, 2) : 2;
        const realH = maxVal > 0 && d.real != null ? Math.max((d.real / maxVal) * barMaxH, 2) : 0;
        const dev = d.real != null && d.calc > 0 ? ((d.real - d.calc) / d.calc) * 100 : null;
        const dc  = dev != null ? deviationColor(dev) : null;
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
            <div className="flex items-end gap-0.5 w-full" style={{ height: barMaxH }}>
              {/* Bar calcul */}
              <div
                className="flex-1 rounded-t bg-sky-500/50 transition-all"
                style={{ height: calcH }}
                title={`Calc: ${d.calc.toFixed(0)} kWh`}
              />
              {/* Bar real */}
              {d.real != null ? (
                <div
                  className={cn("flex-1 rounded-t transition-all", dc?.bg || "bg-white/20")}
                  style={{ height: realH }}
                  title={`Real: ${d.real.toFixed(0)} kWh`}
                />
              ) : (
                <div className="flex-1 rounded-t bg-white/10 border border-dashed border-white/20"
                  style={{ height: 16 }} title="Necompletat" />
              )}
            </div>
            <span className="text-xs text-white/40 truncate w-full text-center">{d.month}</span>
            {dev != null && (
              <span className={cn("text-[10px] font-semibold", dc?.text)}>
                {dev > 0 ? "+" : ""}{dev.toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function emptyMonths() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i,
    gaz_kwh: "",
    el_kwh: "",
    lemn_mc: "",
    gaz_gcal: "",
  }));
}

export default function ConsumoTracker({ instSummary, building, onClose }) {
  const [year, setYear]         = useState(CURRENT_YEAR);
  const [months, setMonths]     = useState(emptyMonths);
  const [cauze, setCauze]       = useState([]);
  const [showCauze, setShowCauze] = useState(false);

  // EP calcul distribuit lunar (distribuție tipică sezonieră)
  const EP_SEASONAL = [0.12, 0.11, 0.10, 0.07, 0.04, 0.02, 0.01, 0.02, 0.04, 0.07, 0.10, 0.12];

  const epTotal = parseFloat(instSummary?.ep_total_m2) || 180;
  const au      = parseFloat(building?.areaUseful) || 100;
  const annualKwh = epTotal * au;

  const chartData = useMemo(() => {
    return months.map((m, i) => {
      const calc = annualKwh * EP_SEASONAL[i];
      const gazKwh = parseFloat(m.gaz_gcal) > 0
        ? kwhFromGcal(parseFloat(m.gaz_gcal))
        : parseFloat(m.gaz_kwh) || 0;
      const elKwh  = parseFloat(m.el_kwh) || 0;
      const lemnKwh = parseFloat(m.lemn_mc) > 0 ? kwhFromMc(parseFloat(m.lemn_mc)) : 0;
      const realTotal = gazKwh + elKwh + lemnKwh;
      return {
        month: MONTHS_RO[i],
        calc,
        real: realTotal > 0 ? realTotal : null,
      };
    });
  }, [months, annualKwh]);

  const maxVal = useMemo(() => {
    return Math.max(...chartData.flatMap(d => [d.calc, d.real ?? 0]), 1);
  }, [chartData]);

  function updateMonth(idx, field, val) {
    setMonths(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  }

  function toggleCauza(c) {
    setCauze(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function exportCSV() {
    const header = ["Lună", "An", "Consum calculat (kWh)", "Gaz (kWh)", "Gaz (Gcal)", "Electricitate (kWh)", "Lemn (mc)", "Total real (kWh)", "Deviație (%)"];
    const rows = chartData.map((d, i) => {
      const m = months[i];
      const dev = d.real != null && d.calc > 0 ? (((d.real - d.calc) / d.calc) * 100).toFixed(1) : "";
      return [
        MONTHS_RO[i], year, d.calc.toFixed(1),
        m.gaz_kwh || "", m.gaz_gcal || "", m.el_kwh || "", m.lemn_mc || "",
        d.real != null ? d.real.toFixed(1) : "",
        dev,
      ];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `consum_real_${year}_${building?.address?.slice(0, 20) || "proiect"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const withDeviation = chartData.filter(d => d.real != null && d.calc > 0);
  const avgDeviation = withDeviation.length
    ? withDeviation.reduce((s, d) => s + ((d.real - d.calc) / d.calc * 100), 0) / withDeviation.length
    : null;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-5xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Urmărire Consum Real Post-Audit</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {building?.address || "Proiect"} · Comparativ cu calculul energetic
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {onClose && (
              <button onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Legendă grafic */}
          <div className="flex items-center gap-4 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-500/50" />
              Consum calculat (EP × Au)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/60" />
              Consum real (facturi)
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> ±10% normal
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" /> ±20% atenție
              <span className="w-2 h-2 rounded-full bg-red-400 ml-2" /> &gt;20% abatere
            </div>
          </div>

          {/* Grafic comparativ */}
          <Card title="Consum calculat vs. consum real (kWh/lună)">
            <ComparisonChart data={chartData} maxVal={maxVal} />
          </Card>

          {/* Statistici deviație */}
          {avgDeviation != null && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Deviație medie", value: `${avgDeviation > 0 ? "+" : ""}${avgDeviation.toFixed(1)}%`, ...deviationColor(avgDeviation) },
                { label: "Luni introduse",  value: `${withDeviation.length}/12`, text: "text-white", bg: "" },
                { label: "Consum real total", value: `${Math.round(withDeviation.reduce((s, d) => s + d.real, 0)).toLocaleString()} kWh`, text: "text-white", bg: "" },
              ].map(kpi => (
                <div key={kpi.label} className={cn("border border-white/10 rounded-xl p-4", kpi.bg || "bg-white/5")}>
                  <div className={cn("text-xl font-bold", kpi.text)}>{kpi.value}</div>
                  <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
                  {kpi.label && "Deviație medie" in kpi && kpi.label === "Deviație medie" && (
                    <div className={cn("text-xs mt-0.5", kpi.text)}>{kpi.label}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tabel introducere date */}
          <Card title="Introducere facturi lunare">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Lună</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Gaz (kWh)</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Gaz (Gcal)</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Elec. (kWh)</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Lemn (mc)</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">Total (kWh)</th>
                    <th className="py-2 px-2 text-left text-white/40 font-semibold uppercase tracking-wider">vs. Calc.</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => {
                    const d = chartData[i];
                    const dev = d.real != null && d.calc > 0
                      ? ((d.real - d.calc) / d.calc * 100)
                      : null;
                    const dc = dev != null ? deviationColor(dev) : null;
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-1.5 px-2 font-semibold text-white/70">{MONTHS_RO[i]}</td>
                        <td className="py-1.5 px-2">
                          <input value={m.gaz_kwh} onChange={e => updateMonth(i, "gaz_kwh", e.target.value)}
                            type="number" min="0" placeholder="—"
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input value={m.gaz_gcal} onChange={e => updateMonth(i, "gaz_gcal", e.target.value)}
                            type="number" min="0" step="0.01" placeholder="—"
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input value={m.el_kwh} onChange={e => updateMonth(i, "el_kwh", e.target.value)}
                            type="number" min="0" placeholder="—"
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input value={m.lemn_mc} onChange={e => updateMonth(i, "lemn_mc", e.target.value)}
                            type="number" min="0" step="0.1" placeholder="—"
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20" />
                        </td>
                        <td className="py-1.5 px-2 text-white/60 font-mono">
                          {d.real != null ? d.real.toFixed(0) : "—"}
                        </td>
                        <td className="py-1.5 px-2">
                          {dev != null ? (
                            <span className={cn("font-semibold", dc?.text)}>
                              {dev > 0 ? "+" : ""}{dev.toFixed(1)}%
                            </span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cauze deviație */}
          <div>
            <button onClick={() => setShowCauze(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white/80 transition-colors mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showCauze ? "rotate(90deg)" : "", transition: "transform 0.15s" }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Cauze posibile deviație
              {cauze.length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">{cauze.length} selectate</span>
              )}
            </button>
            {showCauze && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEVIATII_CAUZE.map(c => (
                  <label key={c}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs",
                      cauze.includes(c)
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70")}>
                    <input type="checkbox" checked={cauze.includes(c)} onChange={() => toggleCauza(c)}
                      className="accent-amber-500 w-3 h-3" />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="flex justify-end pt-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export CSV date comparație
            </button>
          </div>

          <p className="text-xs text-white/25">
            Consumul calculat este distribuit sezonier din EP total · Gaz: 1 Gcal = 1163 kWh · Lemn: PCI estimat 9,5 kWh/kg
          </p>
        </div>
      </div>
    </div>
  );
}
