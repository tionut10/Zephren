// ═══════════════════════════════════════════════════════════════
// BENCHMARKS — Referințe medii fond existent pe categorii
// Surse: ANRE, INS, Mc 001-2022 Anexa 4 — valori statistice estimative
// ═══════════════════════════════════════════════════════════════

export const BENCHMARKS = {
  RI: { label:"Casă individuală", avgEp:180, avgCO2:28, bestEp:65,  worstEp:450, stock:"~2.8M",  avgYear:1975, nzebPct:3 },
  RC: { label:"Bloc locuințe",    avgEp:220, avgCO2:35, bestEp:55,  worstEp:500, stock:"~50.000", avgYear:1978, nzebPct:1 },
  RA: { label:"Apartament",       avgEp:200, avgCO2:32, bestEp:50,  worstEp:480, stock:"~4M",     avgYear:1980, nzebPct:2 },
  BI: { label:"Birouri",          avgEp:250, avgCO2:30, bestEp:80,  worstEp:550, stock:"~15.000", avgYear:1990, nzebPct:5 },
  ED: { label:"Educație",         avgEp:200, avgCO2:25, bestEp:70,  worstEp:400, stock:"~8.000",  avgYear:1970, nzebPct:2 },
  SA: { label:"Sănătate",         avgEp:300, avgCO2:40, bestEp:100, worstEp:600, stock:"~1.500",  avgYear:1975, nzebPct:1 },
  HC: { label:"Hotel/Cazare",     avgEp:270, avgCO2:35, bestEp:90,  worstEp:550, stock:"~3.000",  avgYear:1985, nzebPct:3 },
  CO: { label:"Comercial",        avgEp:260, avgCO2:32, bestEp:85,  worstEp:520, stock:"~12.000", avgYear:1995, nzebPct:4 },
  SP: { label:"Sport",            avgEp:230, avgCO2:28, bestEp:75,  worstEp:480, stock:"~2.000",  avgYear:1980, nzebPct:2 },
  AL: { label:"Altele",           avgEp:240, avgCO2:30, bestEp:80,  worstEp:500, stock:"~5.000",  avgYear:1985, nzebPct:3 },
};
