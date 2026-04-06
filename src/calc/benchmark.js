// ═══════════════════════════════════════════════════════════════
// BAZĂ DE DATE CLĂDIRI SIMILARE — Benchmark performanță energetică
// Date agregate din audituri reale în România (anonimizate)
// Permite compararea ep_total cu clădiri din aceeași categorie + zonă climatică
// ═══════════════════════════════════════════════════════════════

import _benchmarkData from "../data/ep-benchmarks.json";

export const EP_BENCHMARKS = _benchmarkData.EP_BENCHMARKS;
export const ERA_LABELS = _benchmarkData.ERA_LABELS;

function getEra(year) {
  const y = parseInt(year) || 1980;
  if (y < 1950) return "pre1950";
  if (y < 1970) return "s1950_70";
  if (y < 1990) return "s1970_89";
  if (y < 2003) return "s1990_02";
  if (y < 2013) return "s2003_12";
  if (y < 2023) return "s2013_22";
  return "post2023";
}

// Percentila EP: unde se situează clădirea față de stoc similar
function calcPercentile(ep, bm) {
  if (!bm) return null;
  if (ep <= bm.p10) return { pct: 10, label: "Top 10% — Excelent", color: "#22c55e" };
  if (ep <= bm.p25) return { pct: 25, label: "Top 25% — Bun",      color: "#84cc16" };
  if (ep <= bm.p50) return { pct: 50, label: "Median — Mediu",      color: "#eab308" };
  if (ep <= bm.p75) return { pct: 75, label: "Quartila 3 — Slab",   color: "#f97316" };
  if (ep <= bm.p90) return { pct: 90, label: "Top 10% cel mai rău", color: "#ef4444" };
  return { pct: 99, label: "Extrem — necesită reabilitare urgentă", color: "#dc2626" };
}

export function calcBenchmark(params) {
  const {
    category,     // cod categorie
    zone,         // zonă climatică "I"-"V"
    epActual,     // EP actual [kWh/(m²·an)]
    yearBuilt,    // an construcție
    Au,           // arie utilă
    epAfterRehab, // EP după reabilitare (opțional)
  } = params;

  const cat = category || "AL";
  const z = zone || "III";
  const bm = EP_BENCHMARKS[cat]?.[z] || EP_BENCHMARKS.AL[z];
  if (!bm) return null;

  const era = getEra(yearBuilt);
  const percentileActual = calcPercentile(epActual, bm);
  const percentileAfter = epAfterRehab ? calcPercentile(epAfterRehab, bm) : null;

  // Potențial de economisire față de median și față de p10
  const savingToMedian = Math.max(0, epActual - bm.p50);
  const savingToTop10 = Math.max(0, epActual - bm.p10);

  // Număr estimat de clădiri similare mai eficiente [%]
  const betterThanPct = percentileActual ? 100 - percentileActual.pct : 50;

  return {
    category: cat, zone: z, era,
    eraLabel: ERA_LABELS[era] || era,
    epActual, epAfterRehab,
    benchmark: bm,
    percentileActual,
    percentileAfter,
    betterThanPct, // % din clădiri similare care sunt mai ineficiente
    savingToMedian: Math.round(savingToMedian),
    savingToTop10: Math.round(savingToTop10),
    savingToMedian_pct: bm.p50 > 0 ? Math.round(savingToMedian / bm.p50 * 100) : 0,
    nzebTarget: bm.p10, // considerăm p10 ca referință nZEB/best practice
    chart: {
      // Date pentru bar chart comparativ
      bars: [
        { label: "Clădirea dvs.", value: epActual, color: percentileActual?.color || "#6366f1", highlight: true },
        { label: "Top 10% (eficient)", value: bm.p10, color: "#22c55e" },
        { label: "Median similar", value: bm.p50, color: "#eab308" },
        { label: "Top 10% (ineficient)", value: bm.p90, color: "#ef4444" },
        ...(epAfterRehab ? [{ label: "După reabilitare", value: epAfterRehab, color: "#3b82f6", highlight: true }] : []),
      ],
    },
    verdict: percentileActual
      ? `Clădirea dvs. (${epActual} kWh/m²) se situează în ${percentileActual.label} față de stocul similar din zona ${z}`
      : "Date insuficiente pentru benchmark",
    recommendation: savingToTop10 > 20
      ? `Potențial de economisire: ${Math.round(savingToTop10)} kWh/(m²·an) față de clădirile eficiente similar`
      : "Clădirea se situează deja în rândul celor mai eficiente similar",
  };
}
