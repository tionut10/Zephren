// ═══════════════════════════════════════════════════════════════
// BAZĂ DE DATE CLĂDIRI SIMILARE — Benchmark performanță energetică
//
// ⚠️ DISCLAIMER (Sprint B Task 3 — actualizat 25 apr 2026):
// Datele sunt VALORI ORIENTATIVE, derivate din studii statistice publicate
// (UTBv 2018-2020, ICCPDC, INCERC) + extrapolare după Mc 001-2022 Anexa K
// (factori orientativi consum specific per categorie + zonă climatică).
// NU sunt date individuale din audituri reale înregistrate la MDLPA.
// Pentru benchmark oficial folosiți Registrul național CPE (mdlpa.gov.ro).
//
// Sprint B Task 3: filtrare REALĂ pe era construcției (înainte era doar afișată)
// — clădirile pre-1990 au consum tipic +25-50% față de p50 calibrat pe stocul
// post-2003; aplicăm `eraFactor` care ajustează percentilele.
// ═══════════════════════════════════════════════════════════════

import _benchmarkData from "../data/ep-benchmarks.json";

export const EP_BENCHMARKS = _benchmarkData.EP_BENCHMARKS;
export const ERA_LABELS = _benchmarkData.ERA_LABELS;

// Sprint B Task 3: factori de ajustare pe eră (sursa: extrapolare Mc 001-2022 Anexa K
// + studii UTBv Tunaru 2019, raport ICCPDC 2021 anvelopă stoc rezidențial RO)
// Referință: era post-2023 = 0.65 (clădiri nZEB), față de baseline s2003_12 = 1.00
export const ERA_FACTORS = {
  pre1950:   1.55, // clădiri istorice, anvelopă neizolată, consum mare
  s1950_70:  1.40, // primele blocuri socialiste, fără izolare
  s1970_89:  1.28, // panouri prefabricate, izolare minimă
  s1990_02:  1.10, // tranziție, materiale variabile
  s2003_12:  1.00, // baseline (după reglementări post-2002)
  s2013_22:  0.80, // standard EPBD recast 2010, izolare 8-10 cm
  post2023:  0.65, // nZEB obligatoriu, izolare 12-20 cm, recuperare HR
};

// Sursa și metoda — afișate în UI ca disclaimer
export const BENCHMARK_META = {
  source: "Studii statistice publicate (UTBv 2018-2020, ICCPDC, INCERC) + extrapolare Mc 001-2022 Anexa K",
  warningLevel: "orientativ",
  warning:
    "Date orientative neoficiale — derivate din studii statistice publicate și extrapolate. " +
    "NU reprezintă audituri reale înregistrate la MDLPA. Pentru benchmark oficial: Registrul național CPE.",
  lastUpdated: "2026-04",
};

function getEra(year) {
  // Sprint B Task 3: dacă lipsește anul → baseline (s2003_12, factor 1.00)
  // pentru a NU schimba percentilele "default" și a păstra retro-compat. cu teste.
  // Era se aplică doar când utilizatorul a completat explicit anul construcției.
  if (year === undefined || year === null || year === "") return "s2003_12";
  const y = parseInt(year);
  if (isNaN(y)) return "s2003_12";
  if (y < 1950) return "pre1950";
  if (y < 1970) return "s1950_70";
  if (y < 1990) return "s1970_89";
  if (y < 2003) return "s1990_02";
  if (y < 2013) return "s2003_12";
  if (y < 2023) return "s2013_22";
  return "post2023";
}

/**
 * Sprint B Task 3: aplică factor de eră pe TOATE percentilele benchmark.
 * Înainte: era era doar afișată. Acum filtrăm benchmark-ul după anul real al construcției.
 */
function adjustBenchmarkByEra(bm, era) {
  const factor = ERA_FACTORS[era] ?? 1.0;
  return {
    p10: Math.round(bm.p10 * factor),
    p25: Math.round(bm.p25 * factor),
    p50: Math.round(bm.p50 * factor),
    p75: Math.round(bm.p75 * factor),
    p90: Math.round(bm.p90 * factor),
    label: bm.label,
    _eraFactor: factor,
    _eraAdjusted: factor !== 1.0,
  };
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
  const bmRaw = EP_BENCHMARKS[cat]?.[z] || EP_BENCHMARKS.AL[z];
  if (!bmRaw) return null;

  const era = getEra(yearBuilt);
  // Sprint B Task 3: filtrare REALĂ pe eră — înainte era doar afișată
  const bm = adjustBenchmarkByEra(bmRaw, era);

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
    eraFactor: bm._eraFactor,
    eraAdjusted: bm._eraAdjusted,
    epActual, epAfterRehab,
    benchmark: bm,
    benchmarkRaw: bmRaw, // baseline neajustat (s2003_12), util pentru comparare
    percentileActual,
    percentileAfter,
    betterThanPct, // % din clădiri similare care sunt mai ineficiente
    savingToMedian: Math.round(savingToMedian),
    savingToTop10: Math.round(savingToTop10),
    savingToMedian_pct: bm.p50 > 0 ? Math.round(savingToMedian / bm.p50 * 100) : 0,
    nzebTarget: bm.p10, // considerăm p10 ca referință nZEB/best practice
    meta: BENCHMARK_META, // disclaimer + sursa pentru afișare
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
      ? `Clădirea dvs. (${epActual} kWh/m²) se situează în ${percentileActual.label} față de stocul similar din zona ${z}` +
        (bm._eraAdjusted ? ` (perioadă ${ERA_LABELS[era] || era}, factor ×${bm._eraFactor.toFixed(2)})` : "")
      : "Date insuficiente pentru benchmark",
    recommendation: savingToTop10 > 20
      ? `Potențial de economisire: ${Math.round(savingToTop10)} kWh/(m²·an) față de clădirile eficiente similar`
      : "Clădirea se situează deja în rândul celor mai eficiente similar",
  };
}
