/**
 * TMYPanel — Date climatice orare TMY (Sprint D Task 7)
 *
 * Vizualizare slider 12 luni × 24 ore pentru:
 *   • Temperatură [°C]
 *   • GHI iradianță globală orizontală [W/m²]
 *   • Umiditate relativă [%]
 *   • Viteză vânt [m/s]
 *
 * Surse date:
 *   • PVGIS TMY 5.2 (online, free, conform SR EN ISO 15927-4:2007)
 *   • Import EPW EnergyPlus (parser în calc/climate-import.js — extins)
 *   • Import CSV manual
 *
 * Mc 001-2022 §A.4 + Anexa K + SR EN ISO 15927-4:2007 (TMY hourly data)
 */
import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "./ui.jsx";
import { fetchPVGISTMY } from "../calc/pvgis.js";
import { parseEPW, parseClimateCSV } from "../calc/climate-import.js";

const MONTHS_RO = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Export TMY → CSV / JSON (Sprint B Task 1) ─────────────────────────────────
// Generează un fișier CSV cu toate valorile orare TMY (8760 dacă PVGIS real,
// 288 = 12×24 dacă aproximare lunară din EPW/CSV). Header cu metadate sub formă
// de comentarii (#) urmat de coloane month,hour,T_C,GHI_Wm2,RH_pct,wind_ms.
// Pentru JSON exportăm structura completă inclusiv metadata + monthlyHourly.
function buildTMYCSV(tmyData) {
  if (!tmyData?.monthlyHourly) return null;
  const meta = tmyData.metadata || {};
  const lines = [];
  lines.push("# TMY data export — Zephren");
  lines.push(`# Generated: ${new Date().toISOString()}`);
  if (meta.source)    lines.push(`# Source: ${meta.source}`);
  if (meta.lat != null && meta.lon != null) lines.push(`# Coordinates: ${meta.lat}°N, ${meta.lon}°E`);
  if (meta.elevation != null) lines.push(`# Elevation: ${meta.elevation} m`);
  if (meta.periods && meta.periods !== "—") lines.push(`# Period: ${meta.periods}`);
  if (meta.isLunarApprox) lines.push("# NOTE: hourly values are approximated from monthly means (288 = 12×24).");
  lines.push("# Standard: SR EN ISO 15927-4:2007 + Mc 001-2022 §A.4");
  lines.push("month,hour,T_C,GHI_Wm2,RH_pct,wind_ms");

  const T   = tmyData.monthlyHourly.T   || [];
  const GHI = tmyData.monthlyHourly.GHI || [];
  const RH  = tmyData.monthlyHourly.RH  || [];
  const WS  = tmyData.monthlyHourly.WS  || [];

  const fmt = (v) => (v == null || isNaN(v) ? "" : Number(v).toFixed(2));

  for (let m = 0; m < 12; m++) {
    for (let h = 0; h < 24; h++) {
      lines.push(`${m + 1},${h},${fmt(T[m]?.[h])},${fmt(GHI[m]?.[h])},${fmt(RH[m]?.[h])},${fmt(WS[m]?.[h])}`);
    }
  }
  return lines.join("\n");
}

function buildTMYJSON(tmyData) {
  if (!tmyData) return null;
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    standard: "SR EN ISO 15927-4:2007 + Mc 001-2022 §A.4",
    metadata: tmyData.metadata || {},
    monthlyHourly: tmyData.monthlyHourly || {},
    hourly: tmyData.hourly || [],
  }, null, 2);
}

function downloadBlob(content, filename, mime) {
  if (typeof window === "undefined" || !content) return;
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  } catch (e) {
    // Silent fail în SSR sau browser fără Blob support
  }
}

export { buildTMYCSV, buildTMYJSON };

// Parametri afișaj
const PARAMS = {
  T:   { label: "Temperatură", unit: "°C",   color: "#ef4444", colorCold: "#3b82f6", min: -25, max: 40 },
  GHI: { label: "GHI iradianță", unit: "W/m²", color: "#f59e0b", colorCold: "#1e293b", min: 0,   max: 1000 },
  RH:  { label: "Umiditate",   unit: "%",    color: "#06b6d4", colorCold: "#1e40af", min: 0,   max: 100 },
  WS:  { label: "Vânt",        unit: "m/s",  color: "#10b981", colorCold: "#064e3b", min: 0,   max: 20 },
};

function colorScale(value, min, max, colorCold, colorHot) {
  if (value == null || isNaN(value)) return "#1e293b";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Interpolare linear RGB între cold și hot
  const parseHex = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parseHex(colorCold);
  const [r2, g2, b2] = parseHex(colorHot);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export default function TMYPanel({ climate, building, lang = "RO" }) {
  const [tmyData, setTmyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [activeParam, setActiveParam] = useState("T");
  const [importStatus, setImportStatus] = useState(null);

  const epwRef = useRef(null);
  const csvRef = useRef(null);

  const lat = climate?.lat;
  const lon = climate?.lon;
  const hasCoords = lat != null && lon != null;

  const fetchTMY = useCallback(async () => {
    if (!hasCoords) {
      setError(lang === "EN" ? "Coordinates unavailable" : "Coordonate indisponibile");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPVGISTMY(lat, lon);
      setTmyData(data);
    } catch (e) {
      setError((lang === "EN" ? "PVGIS TMY error: " : "Eroare PVGIS TMY: ") + e.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, hasCoords, lang]);

  // Convert lunar (12 valori) → 12×24 plat (replicare orară)
  const lunarToHourly = useCallback((lunar12, defaultVal = 0) => {
    if (!Array.isArray(lunar12) || lunar12.length !== 12) return null;
    return lunar12.map(v => Array(24).fill(typeof v === "number" ? v : defaultVal));
  }, []);

  // Import EPW/CSV — parser-ul existent returnează lunar; replicăm la 12×24 ca aproximație
  const handleEPWImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = parseEPW(ev.target.result);
        // Construim TMY local din date lunare
        const monthlyHourly = {
          T:   lunarToHourly(data.temp_month, 10),
          GHI: lunarToHourly((data.GHI_month || []).map(g => Math.round(g * 1000 / (30 * 12))), 200), // kWh/m²/lună → W/m² mediu
          RH:  lunarToHourly(data.RH_month || Array(12).fill(60), 60),
          WS:  lunarToHourly(data.wind_month || Array(12).fill(2), 2),
        };
        setTmyData({
          hourly: [],
          monthlyHourly,
          metadata: {
            lat, lon, elevation: data.elev || null,
            source: `EPW import: ${file.name}${data.city ? " (" + data.city + ")" : ""}`,
            periods: "—",
            hours: 0,
            isLunarApprox: true,
          },
        });
        setImportStatus({ ok: true, msg: `EPW: ${file.name} (aproximare orară din date lunare)` });
      } catch (err) {
        setImportStatus({ ok: false, msg: "Eroare parsing EPW: " + err.message });
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [lat, lon, lunarToHourly]);

  const handleCSVImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = parseClimateCSV(ev.target.result);
        const monthlyHourly = {
          T:   lunarToHourly(data.temp_month, 10),
          GHI: lunarToHourly((data.GHI_month || []).map(g => Math.round(g * 1000 / (30 * 12))), 200),
          RH:  lunarToHourly(data.RH_month || Array(12).fill(60), 60),
          WS:  lunarToHourly(data.wind_month || Array(12).fill(2), 2),
        };
        setTmyData({
          hourly: [],
          monthlyHourly,
          metadata: { lat, lon, source: `CSV: ${file.name}`, periods: "—", hours: 0, isLunarApprox: true },
        });
        setImportStatus({ ok: true, msg: `CSV: ${file.name} (aproximare orară din date lunare)` });
      } catch (err) {
        setImportStatus({ ok: false, msg: "Eroare CSV: " + err.message });
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [lat, lon, lunarToHourly]);

  // Profilul orar curent + valoare la slot selectat
  const profile = useMemo(() => {
    if (!tmyData?.monthlyHourly) return null;
    const arr2D = tmyData.monthlyHourly[activeParam];
    if (!arr2D) return null;
    const value = arr2D[selectedMonth]?.[selectedHour] ?? null;
    return { arr2D, value };
  }, [tmyData, activeParam, selectedMonth, selectedHour]);

  const param = PARAMS[activeParam];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          🌡️ {lang === "EN" ? "TMY hourly climate data" : "Date climatice orare TMY"}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === "EN"
            ? "Typical Meteorological Year (TMY) — 8760 hourly values. Source: PVGIS 5.2 / EPW / CSV. Standard: SR EN ISO 15927-4:2007 + Mc 001-2022 §A.4."
            : "Typical Meteorological Year (TMY) — 8760 valori orare reprezentative. Sursă: PVGIS 5.2 / EPW / CSV. Standard: SR EN ISO 15927-4:2007 + Mc 001-2022 §A.4."}
        </p>
      </div>

      {/* Source picker — 3 opțiuni: PVGIS / EPW / CSV */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* PVGIS */}
        <div className={cn("rounded-lg border p-3 transition-all",
          tmyData && !tmyData.metadata?.isLunarApprox
            ? "bg-violet-500/10 border-violet-500/40"
            : "bg-slate-800/40 border-white/10"
        )}>
          <div className="text-xs font-semibold text-violet-300 mb-1">🛰️ PVGIS TMY</div>
          <div className="text-[10px] text-slate-500 mb-2">8760 valori reale/oră · UE Joint Research Centre</div>
          <button
            onClick={fetchTMY}
            disabled={loading || !hasCoords}
            className={cn("w-full px-2 py-1.5 rounded text-xs font-medium transition-colors",
              loading ? "bg-slate-700 text-slate-400 cursor-wait" :
              !hasCoords ? "bg-slate-800 text-slate-600 cursor-not-allowed" :
              "bg-violet-600 hover:bg-violet-500 text-white"
            )}>
            {loading
              ? <><span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />Descărcare...</>
              : (lang === "EN" ? "Fetch PVGIS TMY" : "Descarcă PVGIS TMY")}
          </button>
          {!hasCoords && (
            <div className="text-[10px] text-amber-400 mt-1">{lang === "EN" ? "Need GPS coords (Step 1)" : "Necesită coordonate (Pas 1)"}</div>
          )}
        </div>

        {/* EPW */}
        <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
          <div className="text-xs font-semibold text-blue-300 mb-1">📂 Import EPW</div>
          <div className="text-[10px] text-slate-500 mb-2">EnergyPlus Weather (lunar)</div>
          <input ref={epwRef} type="file" accept=".epw" onChange={handleEPWImport} className="hidden" />
          <button onClick={() => epwRef.current?.click()}
            className="w-full px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium">
            {lang === "EN" ? "Choose .epw" : "Alege .epw"}
          </button>
        </div>

        {/* CSV */}
        <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
          <div className="text-xs font-semibold text-emerald-300 mb-1">📋 Import CSV</div>
          <div className="text-[10px] text-slate-500 mb-2">12 rânduri lunar (T, GHI, RH, vânt)</div>
          <input ref={csvRef} type="file" accept=".csv,.txt" onChange={handleCSVImport} className="hidden" />
          <button onClick={() => csvRef.current?.click()}
            className="w-full px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium">
            {lang === "EN" ? "Choose .csv" : "Alege .csv"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          ✗ {error}
        </div>
      )}
      {importStatus && (
        <div className={cn("rounded-lg border p-2.5 text-xs",
          importStatus.ok ? "border-green-500/30 bg-green-500/10 text-green-300"
                          : "border-red-500/30 bg-red-500/10 text-red-300"
        )}>
          {importStatus.ok ? "✓" : "✗"} {importStatus.msg}
        </div>
      )}

      {/* Date încărcate — afișaj */}
      {tmyData?.monthlyHourly && profile && (
        <>
          {/* Metadata */}
          <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3 text-[11px] text-slate-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong>{lang === "EN" ? "Source" : "Sursă"}:</strong> <span className="text-violet-300">{tmyData.metadata.source}</span>
              </div>
              <div className="flex gap-3 text-[10px] text-slate-500">
                {tmyData.metadata.periods !== "—" && <span>{lang === "EN" ? "Period" : "Perioadă"}: {tmyData.metadata.periods}</span>}
                {tmyData.metadata.hours > 0 && <span>{tmyData.metadata.hours} h</span>}
                {tmyData.metadata.elevation != null && <span>Alt: {tmyData.metadata.elevation} m</span>}
              </div>
            </div>
            {tmyData.metadata.isLunarApprox && (
              <div className="text-[10px] text-amber-400 mt-1.5">
                ⚠ {lang === "EN" ? "Hourly approximation from monthly data — fetch PVGIS TMY for real 8760 values" : "Aproximare orară din date lunare — folosiți PVGIS TMY pentru valori reale 8760"}
              </div>
            )}
          </div>

          {/* Selector parametru + export CSV/JSON */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {Object.entries(PARAMS).map(([key, p]) => (
              <button key={key}
                onClick={() => setActiveParam(key)}
                className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors border",
                  activeParam === key
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700"
                )}>
                {p.label} <span className="text-[10px] opacity-60">[{p.unit}]</span>
              </button>
            ))}
            <div className="flex-1" />
            {/* Sprint B Task 1: export CSV/JSON */}
            <button
              onClick={() => {
                const csv = buildTMYCSV(tmyData);
                const stamp = new Date().toISOString().slice(0, 10);
                downloadBlob(csv, `tmy-zephren-${stamp}.csv`, "text/csv;charset=utf-8");
              }}
              className="px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 transition-colors"
              title={lang === "EN" ? "Export hourly TMY data as CSV" : "Exportă datele TMY orare ca CSV"}
            >
              📥 CSV
            </button>
            <button
              onClick={() => {
                const json = buildTMYJSON(tmyData);
                const stamp = new Date().toISOString().slice(0, 10);
                downloadBlob(json, `tmy-zephren-${stamp}.json`, "application/json;charset=utf-8");
              }}
              className="px-2.5 py-1.5 rounded text-xs font-medium bg-violet-600/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 transition-colors"
              title={lang === "EN" ? "Export complete TMY data as JSON" : "Exportă datele TMY complete ca JSON"}
            >
              📥 JSON
            </button>
          </div>

          {/* Heatmap 12 luni × 24 ore */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">
              {param.label} — heatmap 12 luni × 24 ore
            </div>
            <div className="inline-block min-w-full">
              {/* Header ore */}
              <div className="flex">
                <div className="w-10 shrink-0" />
                {Array.from({length: 24}, (_, h) => (
                  <div key={h} className="w-6 text-center text-[8px] text-slate-500">
                    {h % 6 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {/* Celule */}
              {MONTHS_RO.map((mname, m) => (
                <div key={m} className="flex">
                  <div className={cn("w-10 shrink-0 text-[10px] text-slate-300 self-center",
                    m === selectedMonth && "font-bold text-indigo-300")}>
                    {mname}
                  </div>
                  {Array.from({length: 24}, (_, h) => {
                    const v = profile.arr2D[m]?.[h];
                    const isActive = m === selectedMonth && h === selectedHour;
                    return (
                      <button key={h}
                        onClick={() => { setSelectedMonth(m); setSelectedHour(h); }}
                        className={cn("w-6 h-6 border border-slate-900 transition-all hover:ring-2 hover:ring-white/40",
                          isActive && "ring-2 ring-amber-400 z-10 relative")}
                        style={{ backgroundColor: colorScale(v, param.min, param.max, param.colorCold, param.color) }}
                        title={`${mname} ${h}:00 — ${v ?? "—"} ${param.unit}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Legendă */}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
              <span>{param.min}</span>
              <div className="flex-1 h-2 rounded" style={{
                background: `linear-gradient(90deg, ${param.colorCold}, ${param.color})`
              }} />
              <span>{param.max}</span>
              <span className="text-slate-400 ml-2">{param.unit}</span>
            </div>
          </div>

          {/* Slidere lună + oră + valoare */}
          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              🎚️ {lang === "EN" ? "Slider month × hour" : "Slider lună × oră"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Slider lună */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>{lang === "EN" ? "Month" : "Luna"}</span>
                  <span className="font-mono text-indigo-300">{MONTHS_RO[selectedMonth]}</span>
                </div>
                <input type="range" min="0" max="11" value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  aria-label={`${lang === "EN" ? "Month" : "Luna"}: ${MONTHS_RO[selectedMonth]}`}
                  className="w-full accent-indigo-500" />
                <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                  <span>Ian</span><span>Iul</span><span>Dec</span>
                </div>
              </div>

              {/* Slider oră */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>{lang === "EN" ? "Hour" : "Ora"}</span>
                  <span className="font-mono text-indigo-300">{String(selectedHour).padStart(2, "0")}:00</span>
                </div>
                <input type="range" min="0" max="23" value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                  aria-label={`${lang === "EN" ? "Hour" : "Ora"}: ${selectedHour}:00`}
                  className="w-full accent-indigo-500" />
                <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                  <span>00</span><span>12</span><span>23</span>
                </div>
              </div>

              {/* Valoare la slot */}
              <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: colorScale(profile.value, param.min, param.max, param.colorCold, param.color) + "44" }}>
                <div className="text-[10px] text-slate-300">{param.label}</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {profile.value != null ? profile.value : "—"}
                </div>
                <div className="text-[10px] text-slate-400">{param.unit}</div>
              </div>
            </div>
          </div>

          {/* Statistici sintetice */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {(() => {
              const flat = profile.arr2D.flat();
              const valid = flat.filter(v => typeof v === "number" && !isNaN(v));
              const min = Math.min(...valid);
              const max = Math.max(...valid);
              const mean = valid.reduce((s, v) => s + v, 0) / Math.max(1, valid.length);
              return [
                { label: "Min", value: min.toFixed(1), color: param.colorCold },
                { label: "Mediu", value: mean.toFixed(1), color: "#94a3b8" },
                { label: "Max", value: max.toFixed(1), color: param.color },
                { label: "Δ", value: (max - min).toFixed(1), color: "#a855f7" },
              ];
            })().map(s => (
              <div key={s.label} className="bg-slate-900/60 rounded p-2 text-center">
                <div className="text-[10px] text-slate-500">{s.label}</div>
                <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-slate-500">{param.unit}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!tmyData && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-4 text-xs text-slate-400 text-center">
          {lang === "EN"
            ? "Select a source above (PVGIS / EPW / CSV) to load TMY hourly climate data."
            : "Selectați o sursă mai sus (PVGIS / EPW / CSV) pentru a încărca date climatice orare TMY."}
        </div>
      )}

      <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
        {lang === "EN"
          ? "TMY data does NOT override calculation climate (Mc 001-2022 internal DB). For override, use „Climate Import” tab."
          : "Datele TMY NU suprascriu clima de calcul (baza internă Mc 001-2022). Pentru override, folosiți tab-ul „Import climă”."}
      </div>
    </div>
  );
}
