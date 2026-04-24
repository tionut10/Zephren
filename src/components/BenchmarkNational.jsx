import { useState, useMemo, memo } from "react";
import { cn } from "./ui.jsx";
import {
  NATIONAL_AVERAGES,
  COUNTY_AVERAGES,
  NATIONAL_CPE_STATS,
  benchmarkBuilding,
} from "../data/benchmark-national.js";

const BUILDING_TYPES = Object.entries(NATIONAL_AVERAGES).map(([key, v]) => ({
  value: key,
  label: v.label,
}));

const COUNTIES = Object.entries(COUNTY_AVERAGES)
  .sort((a, b) => a[1].label.localeCompare(b[1].label, "ro"))
  .map(([code, v]) => ({ value: code, label: v.label }));

const BAR_COLORS = {
  ep_heating:  "bg-red-500/70",
  ep_dhw:      "bg-orange-500/70",
  ep_cooling:  "bg-blue-500/70",
  ep_lighting: "bg-yellow-500/70",
};

function fmtPct(val) {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function BenchmarkNationalImpl({ epValue, buildingType: btProp, countyCode: ccProp }) {
  const [buildingType, setBuildingType] = useState(btProp || "rezidential_bloc");
  const [countyCode, setCountyCode]     = useState(ccProp || "B");
  const [userEP, setUserEP]             = useState(epValue ?? "");

  const ep = typeof epValue === "number" ? epValue : (parseFloat(userEP) || 0);
  const nat = NATIONAL_AVERAGES[buildingType];
  const county = COUNTY_AVERAGES[countyCode];

  const result = useMemo(() => {
    if (!ep || !nat) return null;
    return benchmarkBuilding(ep, buildingType, countyCode);
  }, [ep, buildingType, countyCode, nat]);

  const percentileColor = (pct) => {
    if (!result) return "text-white/40";
    if (pct === "top 10%" || pct === "top 25%") return "text-emerald-400";
    if (pct === "top 40%") return "text-green-400";
    if (pct === "medie") return "text-yellow-400";
    if (pct === "sub medie") return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
        Benchmark național — Comparare performanță energetică
      </h3>

      {/* Selectori */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white/50">Tip clădire</label>
          <select value={buildingType} onChange={e => setBuildingType(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-amber-500/50 transition-all">
            {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-white/50">Județ</label>
          <select value={countyCode} onChange={e => setCountyCode(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-amber-500/50 transition-all">
            {COUNTIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {typeof epValue !== "number" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wider text-white/50">EP clădire (kWh/m²/an)</label>
            <input type="number" min="0" max="999" step="1" value={userEP}
              onChange={e => setUserEP(e.target.value)} placeholder="ex: 142"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="EP clădirea ta" value={ep ? `${Math.round(ep)}` : "—"} unit="kWh/m²/an" color="text-amber-400" />
        <KPI label={`Medie ${nat?.label?.split(" (")[0] || "națională"}`} value={`${nat?.ep_primary || "—"}`} unit="kWh/m²/an" color="text-white/60" />
        <KPI label={`Medie ${county?.label || "județ"}`} value={`${county?.ep || "—"}`} unit="kWh/m²/an" color="text-white/60" />
        <KPI label="Poziție"
          value={result?.percentile || "—"}
          color={percentileColor(result?.percentile)} />
      </div>

      {/* Bară comparativă vizuală */}
      {result && ep > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Comparare vizuală</div>

          <CompBar label="Clădirea ta" value={ep} max={Math.max(ep, nat.ep_primary, county?.ep || 0) * 1.2} color="bg-amber-500/80" />
          <CompBar label={`Medie națională (${nat.label.split(" (")[0]})`} value={nat.ep_primary} max={Math.max(ep, nat.ep_primary, county?.ep || 0) * 1.2} color="bg-white/30" />
          {county && <CompBar label={`Medie ${county.label}`} value={county.ep} max={Math.max(ep, nat.ep_primary, county.ep) * 1.2} color="bg-blue-500/40" />}

          <div className="flex gap-4 pt-2 text-xs">
            <span className={cn("font-semibold", result.vs_national <= 0 ? "text-emerald-400" : "text-red-400")}>
              {fmtPct(result.vs_national)} vs. medie națională
            </span>
            {result.vs_county !== null && (
              <span className={cn("font-semibold", result.vs_county <= 0 ? "text-emerald-400" : "text-red-400")}>
                {fmtPct(result.vs_county)} vs. medie județ
              </span>
            )}
          </div>
        </div>
      )}

      {/* Descompunere EP pe componente — medie națională */}
      {nat && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Descompunere medie națională — {nat.label}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "ep_heating",  label: "Încălzire",  value: nat.ep_heating,  icon: "🔥" },
              { key: "ep_dhw",      label: "ACM",        value: nat.ep_dhw,      icon: "🚿" },
              { key: "ep_cooling",  label: "Răcire",     value: nat.ep_cooling,  icon: "❄️" },
              { key: "ep_lighting", label: "Iluminat",   value: nat.ep_lighting, icon: "💡" },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-sm", BAR_COLORS[item.key])} />
                <div>
                  <div className="text-xs text-white/50">{item.icon} {item.label}</div>
                  <div className="text-sm font-semibold text-white/80">{item.value} kWh/m²/an</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-white/30 pt-1">
            CO₂ mediu: {nat.co2} kgCO₂/m²/an · Clasă tipică: {nat.energy_class_typical} · CPE emise: {nat.count_cpe?.toLocaleString("ro-RO")}
          </div>
        </div>
      )}

      {/* Distribuție clase energetice naționale */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Distribuție clase energetice — {NATIONAL_CPE_STATS.total_emise.toLocaleString("ro-RO")} CPE ({NATIONAL_CPE_STATS.an_referinta})
        </div>
        <div className="flex items-end gap-1 h-24">
          {Object.entries(NATIONAL_CPE_STATS.distributie_clase).map(([cls, pct]) => {
            const classColors = {
              "A+": "bg-emerald-500", A: "bg-green-500", B: "bg-lime-500", C: "bg-yellow-500",
              D: "bg-amber-500", E: "bg-orange-500", F: "bg-red-500", G: "bg-rose-600",
            };
            return (
              <div key={cls} className="flex flex-col items-center flex-1 gap-1">
                <div className="text-[10px] text-white/40">{pct}%</div>
                <div className={cn("w-full rounded-t", classColors[cls] || "bg-white/20")}
                  style={{ height: `${Math.max(pct * 2.5, 4)}px` }} />
                <div className="text-[10px] font-bold text-white/60">{cls}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-white/25 text-right">
        Surse: {nat?.source || "MDLPA"} · Date orientative, pot varia ±15% · Zona climatică {county?.climate_zone || "—"}
      </p>
    </div>
  );
}

function KPI({ label, value, unit, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className={cn("text-xl font-bold", color || "text-white/80")}>{value}</div>
      {unit && <div className="text-[10px] text-white/30">{unit}</div>}
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

function CompBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-semibold text-white/70">{Math.round(value)} kWh/m²/an</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default memo(BenchmarkNationalImpl);
