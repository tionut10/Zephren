import { NZEB_THRESHOLDS } from '../data/energy-classes.js';

// getNzebEpMax: Calculate nZEB ep_max for category and climate zone
// zone: "I"-"V" string → index 0-4 în array-ul ep_max
export function getNzebEpMax(category, zone) {
  const t = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
  const zoneIdx = {"I":0,"II":1,"III":2,"IV":3,"V":4}[zone] ?? 2; // implicit zona III
  return Array.isArray(t.ep_max) ? t.ep_max[zoneIdx] : t.ep_max;
}

// ═══════════════════════════════════════════════════════════════
// SUGESTII SMART REABILITARE — Motor de recomandări
// ═══════════════════════════════════════════════════════════════
export function calcSmartRehab(building, instSummary, renewSummary, opaqueElements, glazingElements, climate) {
  if (!instSummary) return [];
  const suggestions = [];
  const epActual = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 999;
  const rer = renewSummary?.rer || 0;
  const cat = building?.category || "AL";
  const nzeb = NZEB_THRESHOLDS[cat] || NZEB_THRESHOLDS.AL;
  const nzebEpMax = getNzebEpMax(cat, climate?.zone);
  const Au = parseFloat(building?.areaUseful) || 100;
  const gap = epActual - nzebEpMax;

  // Analiză pereți
  const walls = opaqueElements?.filter(e => e.type === "PE") || [];
  const avgUWall = walls.length ? walls.reduce((s,w) => {
    const R = (w.layers||[]).reduce((r,l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
    return s + 1/R;
  }, 0) / walls.length : 2.0;
  if (avgUWall > 0.50) suggestions.push({ priority:1, system:"Anvelopă", measure:"Termoizolare pereți exteriori", impact: Math.round(gap*0.25)+"–"+Math.round(gap*0.35)+" kWh/(m²·an)",
    detail:`U mediu pereți = ${avgUWall.toFixed(2)} W/(m²·K). Ținta nZEB: ≤0.28. Adăugare EPS 10-15cm.`, costEstimate: Math.round(Au*3.5*45)+" EUR", payback:"7-12 ani" });
  else if (avgUWall > 0.35) suggestions.push({ priority:2, system:"Anvelopă", measure:"Suplimentare izolație pereți", impact: Math.round(gap*0.10)+"–"+Math.round(gap*0.15)+" kWh/(m²·an)",
    detail:`U mediu pereți = ${avgUWall.toFixed(2)}. Se poate îmbunătăți la ≤0.22 cu 5cm EPS suplimentar.`, costEstimate: Math.round(Au*3.5*28)+" EUR", payback:"10-15 ani" });

  // Ferestre
  const avgUWin = glazingElements?.length ? glazingElements.reduce((s,e) => s + (parseFloat(e.u)||2.5), 0) / glazingElements.length : 3.0;
  if (avgUWin > 1.5) suggestions.push({ priority:1, system:"Anvelopă", measure:"Înlocuire tâmplărie exterioară", impact: Math.round(gap*0.15)+"–"+Math.round(gap*0.20)+" kWh/(m²·an)",
    detail:`U mediu ferestre = ${avgUWin.toFixed(2)}. Ținta: ≤1.00 (tripan). Economie semnificativă.`, costEstimate: Math.round((glazingElements?.reduce((s,e)=>s+(parseFloat(e.area)||0),0)||20)*280)+" EUR", payback:"8-15 ani" });

  // Acoperiș
  const roofs = opaqueElements?.filter(e => ["PT","PP","PI"].includes(e.type)) || [];
  const avgURoof = roofs.length ? roofs.reduce((s,r) => { const R = (r.layers||[]).reduce((rr,l) => rr + ((parseFloat(l.thickness)||0)/1000)/(l.lambda||1), 0.14); return s + 1/R; }, 0)/roofs.length : 1.5;
  if (avgURoof > 0.30) suggestions.push({ priority:1, system:"Anvelopă", measure:"Termoizolare acoperiș/terasă", impact: Math.round(gap*0.10)+"–"+Math.round(gap*0.15)+" kWh/(m²·an)",
    detail:`U mediu acoperiș = ${avgURoof.toFixed(2)}. Adăugare 15-25cm vată minerală.`, costEstimate: Math.round(Au*1.1*42)+" EUR", payback:"5-10 ani" });

  // PV
  if (rer < 30) suggestions.push({ priority:1, system:"Regenerabile", measure:"Instalare panouri fotovoltaice", impact: "+15–40% RER, -20–40 kWh/(m²·an)",
    detail:`RER actual = ${rer.toFixed(0)}% (minim nZEB: 30%). PV 3-5 kWp per 100m² Au.`, costEstimate: Math.round(Au*0.05*1100)+" EUR", payback:"6-10 ani" });

  // Pompă căldură
  if (epActual > nzebEpMax * 1.2) suggestions.push({ priority:2, system:"Instalații", measure:"Pompă de căldură aer-apă", impact: "-40–60% consum primar încălzire",
    detail:"COP 3.5-4.5. Reduce drastic consumul de energie primară. Combină cu PV.", costEstimate: Math.round(Au*55)+" EUR", payback:"8-14 ani" });

  // Ventilare HR
  if (epActual > nzebEpMax) suggestions.push({ priority:2, system:"Instalații", measure:"Ventilare mecanică cu recuperare căldură", impact: "-15–25% pierderi ventilare",
    detail:"Eficiență HR 80-90%. Reduce pierderile de ventilare cu menținerea calității aerului.", costEstimate: Math.round(Au*12)+" EUR", payback:"10-15 ani" });

  // Solar termic
  suggestions.push({ priority:3, system:"Regenerabile", measure:"Panouri solar-termice pentru ACM", impact: "+5–15% RER, -30–50% consum ACM",
    detail:"2-4 m² colectori per persoană. Acoperire 40-60% necesar ACM vara.", costEstimate: Math.round(Au*0.04*380)+" EUR", payback:"7-12 ani" });

  // LED
  suggestions.push({ priority:3, system:"Instalații", measure:"Înlocuire iluminat cu LED + senzori prezență", impact: "-40–70% consum iluminat",
    detail:"LED eficacitate >100 lm/W. Senzori prezență în holuri, scări, grupuri sanitare.", costEstimate: Math.round(Au*8)+" EUR", payback:"2-4 ani" });

  return suggestions.sort((a,b) => a.priority - b.priority);
}
