import { useState } from "react";
import { cn } from "./ui.jsx";

export const MEPS_THRESHOLDS = {
  RI: { class2030: "F", class2033: "E", ep2030: 250, ep2033: 200 },
  RC: { class2030: "F", class2033: "E", ep2030: 200, ep2033: 160 },
  BI: { class2030: "F", class2033: "E", ep2030: 180, ep2033: 150 },
  ED: { class2030: "F", class2033: "E", ep2030: 160, ep2033: 130 },
  default: { class2030: "F", class2033: "E", ep2030: 200, ep2033: 160 },
};

export function getMepsThresholdsFor(category) {
  return MEPS_THRESHOLDS[category] || MEPS_THRESHOLDS.default;
}

const CLASS_ORDER = ["A++", "A+", "A", "B", "C", "D", "E", "F", "G"];

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function classWorseOrEqual(cls, threshold) {
  const ci = CLASS_ORDER.indexOf(cls);
  const ti = CLASS_ORDER.indexOf(threshold);
  return ci !== -1 && ti !== -1 && ci >= ti;
}

export function getMepsStatus(energyClass, epTotal, category) {
  const thresholds = MEPS_THRESHOLDS[category] || MEPS_THRESHOLDS.default;
  const nonConform2030 =
    classWorseOrEqual(energyClass, thresholds.class2030) ||
    (epTotal != null && epTotal > thresholds.ep2030);
  const nonConform2033 =
    classWorseOrEqual(energyClass, thresholds.class2033) ||
    (epTotal != null && epTotal > thresholds.ep2033);

  if (nonConform2030) return { level: "red", year: 2030, thresholds };
  if (nonConform2033) return { level: "amber", year: 2033, thresholds };
  return { level: "green", year: null, thresholds };
}

const ROADMAP = [
  {
    id: 1,
    period: "2024–2026",
    title: "Audit energetic + CPE",
    desc: "Obținere certificat de performanță energetică (CPE) și raport de audit.",
    party: "Auditor energetic atestat",
    status: "done",
  },
  {
    id: 2,
    period: "2026–2028",
    title: "Proiectare reabilitare + finanțare",
    desc: "Elaborare DALI/PT, depunere cerere PNRR/BEI/granturi UE.",
    party: "Proiectant + consultant financiar",
    status: "inprogress",
  },
  {
    id: 3,
    period: "2028–2030",
    title: "Execuție lucrări de reabilitare",
    desc: "Implementare măsuri: anvelopă termică, sisteme tehnice, HVAC.",
    party: "Constructor + diriginte de șantier",
    status: "pending",
  },
  {
    id: 4,
    period: "2030",
    title: "Obținere CPE nou (clasă ≥ E / ≥ D)",
    desc: "Recertificare după reabilitare — clasă ≥ E pentru 2030, ≥ D pentru 2033.",
    party: "Auditor energetic atestat",
    status: "pending",
  },
];

const statusDot = {
  done: "bg-green-400",
  inprogress: "bg-amber-400 animate-pulse",
  pending: "bg-slate-600",
};
const statusLabel = {
  done: "Finalizat",
  inprogress: "În curs",
  pending: "Planificat",
};

export default function MEPSCheck({ instSummary = {}, building = {}, energyClass = "" }) {
  const [copied, setCopied] = useState(false);

  const epTotal = instSummary?.ep_total_m2 ?? null;
  const category = building?.category ?? "default";
  const area = building?.areaUseful ?? 0;

  const { level, year, thresholds } = getMepsStatus(energyClass, epTotal, category);

  const days2030 = daysUntil("2030-12-31");
  const days2033 = daysUntil("2033-12-31");

  const epTarget = year === 2030 ? thresholds.ep2030 : thresholds.ep2033;
  const reduction =
    epTotal && epTarget && epTotal > epTarget
      ? Math.round(((epTotal - epTarget) / epTotal) * 100)
      : 0;
  const investEstimate =
    area && reduction ? Math.round(area * 200 * (reduction / 10)) : null;

  function handleCopy() {
    const lines = [
      `=== VERIFICARE CONFORMITATE MEPS (EPBD 2024/1275 Art. 9) ===`,
      `Clasă energetică: ${energyClass || "–"}`,
      `EP total: ${epTotal != null ? epTotal + " kWh/m²an" : "–"}`,
      `Categorie clădire: ${category}`,
      level === "red"
        ? `STATUS: NON-CONFORM MEPS 2030 — Renovare obligatorie până 31 Dec 2030`
        : level === "amber"
        ? `STATUS: RISC MEPS 2033 — Renovare recomandată până 2033`
        : `STATUS: CONFORM MEPS 2030 și 2033`,
      reduction
        ? `Reducere EP necesară: ${reduction}% (țintă: ${epTarget} kWh/m²an)`
        : "",
      investEstimate ? `Investiție estimată: ~${investEstimate.toLocaleString("ro-RO")} RON` : "",
      `Generat cu Zephren Energy Calculator — ${new Date().toLocaleDateString("ro-RO")}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const isNonConforming = level !== "green";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-semibold text-white tracking-tight">
          Conformitate MEPS — EPBD 2024/1275
        </span>
        <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
          Art. 9
        </span>
      </div>

      {/* Status card */}
      <div
        className={cn(
          "rounded-xl border px-5 py-4 flex flex-col gap-2",
          level === "red" && "bg-red-500/10 border-red-500/30",
          level === "amber" && "bg-amber-500/10 border-amber-500/30",
          level === "green" && "bg-green-500/10 border-green-500/25"
        )}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p
              className={cn(
                "text-sm font-bold uppercase tracking-wide",
                level === "red" && "text-red-400",
                level === "amber" && "text-amber-400",
                level === "green" && "text-green-400"
              )}
            >
              {level === "red"
                ? "NON-CONFORM MEPS 2030 — Renovare obligatorie până 31 Dec 2030"
                : level === "amber"
                ? "RISC MEPS 2033 — Renovare recomandată până 2033"
                : "CONFORM MEPS 2030 și 2033"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {level === "red"
                ? "Clădire în percentila inferioară 15–16% — clasă F/G"
                : level === "amber"
                ? "Clădire în zona de risc 2033 — clasă E"
                : "Clădire peste pragul minim de performanță energetică"}
            </p>
          </div>
          {/* Countdown pills */}
          <div className="flex gap-2 flex-wrap">
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center min-w-[90px]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Termen 2030</p>
              <p
                className={cn(
                  "text-sm font-bold",
                  level === "red" ? "text-red-400" : "text-slate-400"
                )}
              >
                {days2030.toLocaleString("ro-RO")} zile
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center min-w-[90px]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Termen 2033</p>
              <p
                className={cn(
                  "text-sm font-bold",
                  level === "amber" ? "text-amber-400" : "text-slate-400"
                )}
              >
                {days2033.toLocaleString("ro-RO")} zile
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EP improvement required */}
      {isNonConforming && epTotal != null && (
        <div className="bg-white/4 border border-white/8 rounded-xl px-5 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reducere EP necesară
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">EP curent</p>
              <p className="text-white font-medium">{epTotal} kWh/m²an</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                EP țintă {year}
              </p>
              <p className="text-amber-300 font-medium">{epTarget} kWh/m²an</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Reducere necesară</p>
              <p
                className={cn(
                  "font-bold",
                  reduction > 30 ? "text-red-400" : "text-amber-400"
                )}
              >
                {reduction > 0 ? `${reduction}%` : "Sub prag"}
              </p>
            </div>
            {investEstimate && (
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                  Investiție estimată
                </p>
                <p className="text-green-300 font-medium">
                  ~{investEstimate.toLocaleString("ro-RO")} RON
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Estimare orientativă: 200 RON/m² per 10% reducere EP
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Renovation roadmap */}
      {isNonConforming && (
        <div className="bg-white/4 border border-white/8 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Foaie de parcurs reabilitare
          </p>
          <div className="space-y-3">
            {ROADMAP.map((step, i) => (
              <div key={step.id} className="flex gap-3 items-start">
                {/* Dot + line */}
                <div className="flex flex-col items-center pt-0.5">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      statusDot[step.status]
                    )}
                  />
                  {i < ROADMAP.length - 1 && (
                    <span className="w-px flex-1 bg-white/8 mt-1" style={{ minHeight: "24px" }} />
                  )}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-amber-300">{step.period}</span>
                    <span className="text-xs text-white font-medium">{step.title}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        step.status === "done"
                          ? "bg-green-500/15 text-green-400"
                          : step.status === "inprogress"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-slate-700 text-slate-500"
                      )}
                    >
                      {statusLabel[step.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Responsabil: {step.party}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EU context */}
      <div className="bg-blue-950/40 border border-blue-500/15 rounded-xl px-4 py-3 flex gap-3">
        <span className="text-blue-400 text-base mt-0.5 flex-shrink-0">ℹ</span>
        <p className="text-[11px] text-blue-300/80 leading-relaxed">
          <span className="font-semibold text-blue-300">EPBD 2024/1275 (recast)</span> în vigoare
          din 28 mai 2024. Transpunere în legislația națională:{" "}
          <span className="font-medium">termen 29 mai 2026</span>. Pragurile exacte vor fi
          stabilite prin ordin MDLPA. Valorile EP afișate sunt estimări orientative pentru România
          până la publicarea ordinului oficial.
        </p>
      </div>

      {/* Export */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleCopy}
          className={cn(
            "text-xs px-4 py-2 rounded-lg border font-medium transition-all",
            copied
              ? "bg-green-500/20 border-green-500/30 text-green-300"
              : "bg-white/5 border-white/10 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/25 hover:text-amber-300"
          )}
        >
          {copied ? "✓ Copiat în clipboard" : "Copiază status MEPS pentru raport"}
        </button>
      </div>
    </div>
  );
}
