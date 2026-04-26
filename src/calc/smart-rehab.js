import { NZEB_THRESHOLDS } from '../data/energy-classes.js';
import { getPrice } from '../data/rehab-prices.js';

// getNzebEpMax: Calculate nZEB ep_max for category and climate zone
// zone: "I"-"V" string → index 0-4 în array-ul ep_max
export function getNzebEpMax(category, zone) {
  const t = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
  const zoneIdx = {"I":0,"II":1,"III":2,"IV":3,"V":4}[zone] ?? 2;
  return Array.isArray(t.ep_max) ? t.ep_max[zoneIdx] : t.ep_max;
}

// ─── Adaptori prețuri (Sprint 25 P0.1) ──────────────────────────────────────
// Sursă canonică: rehab-prices.js. Aici doar interpolare liniară pe grosime.
// Fallback (între paranteze) = valori vechi smart-rehab înainte de migrare.

function _interp(p10, p15, thickCm) {
  if (p10 == null || p15 == null) return null;
  const slope = (p15 - p10) / 5;
  return p10 + (thickCm - 10) * slope;
}

function getWallInsulCostM2(thickCm, scenario = 'mid') {
  const p10 = getPrice('envelope', 'wall_eps_10cm', scenario)?.price;
  const p15 = getPrice('envelope', 'wall_eps_15cm', scenario)?.price;
  const itp = _interp(p10, p15, Math.max(5, Math.min(25, thickCm)));
  return itp != null ? Math.round(itp) : 42;
}

function getRoofInsulCostM2(thickCm, scenario = 'mid') {
  const p15 = getPrice('envelope', 'roof_eps_15cm', scenario)?.price;
  const p25 = getPrice('envelope', 'roof_mw_25cm', scenario)?.price;
  if (p15 != null && p25 != null) {
    const slope = (p25 - p15) / 10;
    return Math.round(p15 + (Math.max(8, Math.min(30, thickCm)) - 15) * slope);
  }
  return 42;
}

function getBasementInsulCostM2(scenario = 'mid') {
  return getPrice('envelope', 'basement_xps_10cm', scenario)?.price ?? 32;
}

function getWindowsCostM2(uTarget, scenario = 'mid') {
  // uTarget: 1.40, 1.10, 0.90, 0.70
  const key = uTarget <= 0.75 ? 'windows_u070'
           : uTarget <= 0.95 ? 'windows_u090'
           : uTarget <= 1.20 ? 'windows_u110'
           : 'windows_u140';
  return getPrice('envelope', key, scenario)?.price ?? 135;
}

// Calcul economie anuală estimată [kWh/m²·an] per măsură de reabilitare
function estimateEpSaving(measure, gap, epActual) {
  const pct = { wall: 0.30, window: 0.18, roof: 0.12, pv: 0.35, hp: 0.50, vent: 0.20, solar: 0.08, led: 0.06 };
  return { wall: gap * (pct.wall), window: gap * (pct.window), roof: gap * (pct.roof),
           pv: Math.min(epActual * 0.35, 40), hp: epActual * pct.hp * 0.4, vent: gap * pct.vent,
           solar: epActual * pct.solar, led: epActual * pct.led }[measure] || 0;
}

// ═══════════════════════════════════════════════════════════════
// SUGESTII SMART REABILITARE — Motor de recomandări cu cost-eficiență
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
  const gap = Math.max(0, epActual - nzebEpMax);
  // Prețul energiei [EUR/kWh] — din combustibil principal sau default
  const energyPriceEUR = (instSummary?.energyPriceEUR) || 0.08; // ~0.08 EUR/kWh gaz, ~0.22 EUR/kWh electricitate

  function addSuggestion(priority, system, measure, epSavingM2, investPerM2, totalInvest, detail, payback) {
    const annualSavingEUR = epSavingM2 * Au * energyPriceEUR;
    const costEfficiency = annualSavingEUR > 0 ? Math.round(totalInvest / annualSavingEUR * 10) / 10 : null; // ani
    const eurPerKwhSaved = epSavingM2 > 0 ? Math.round(totalInvest / (epSavingM2 * Au) * 100) / 100 : null; // EUR/kWh·an economisit
    suggestions.push({
      priority, system, measure,
      impact: epSavingM2 > 0 ? `-${Math.round(epSavingM2)} kWh/(m²·an)` : detail,
      epSaving_m2: Math.round(epSavingM2 * 10) / 10,
      detail,
      costEstimate: Math.round(totalInvest) + " EUR",
      costPerM2: Math.round(investPerM2) + " EUR/m²",
      annualSaving: Math.round(annualSavingEUR) + " EUR/an",
      payback: payback || (costEfficiency ? costEfficiency.toFixed(1) + " ani" : "N/A"),
      costEfficiency_aniPB: costEfficiency,
      eurPerKwhSaved,
      costEfficLabel: eurPerKwhSaved ? `${eurPerKwhSaved} EUR per kWh·an economisit` : null,
    });
  }

  // ── Analiză pereți
  const walls = opaqueElements?.filter(e => e.type === "PE") || [];
  const avgUWall = walls.length ? walls.reduce((s,w) => {
    const R = (w.layers||[]).reduce((r,l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
    return s + 1/R;
  }, 0) / walls.length : 2.0;
  const wallArea = walls.reduce((s,w) => s + (parseFloat(w.area)||0), 0) || Au * 0.7;
  if (avgUWall > 0.50) {
    const thickCm = 10, costM2Wall = getWallInsulCostM2(thickCm);
    const totalCost = wallArea * costM2Wall;
    const epSav = estimateEpSaving("wall", gap, epActual);
    addSuggestion(1, "Anvelopă", "Termoizolare pereți exteriori",
      epSav, costM2Wall, totalCost,
      `U mediu pereți = ${avgUWall.toFixed(2)} W/(m²·K). Ținta nZEB: ≤0.28. Adăugare EPS 10-15cm.`);
  } else if (avgUWall > 0.35) {
    const thickCm = 5, costM2Wall = getWallInsulCostM2(thickCm);
    const totalCost = wallArea * costM2Wall;
    const epSav = estimateEpSaving("wall", gap, epActual) * 0.4;
    addSuggestion(2, "Anvelopă", "Suplimentare izolație pereți",
      epSav, costM2Wall, totalCost,
      `U mediu pereți = ${avgUWall.toFixed(2)}. Îmbunătățire cu 5cm EPS suplimentar la ≤0.22.`);
  }

  // ── Ferestre
  const avgUWin = glazingElements?.length ? glazingElements.reduce((s,e) => s + (parseFloat(e.u)||2.5), 0) / glazingElements.length : 3.0;
  const winArea = glazingElements?.reduce((s,e) => s + (parseFloat(e.area)||0), 0) || 20;
  if (avgUWin > 1.5) {
    const costM2Win = getWindowsCostM2(0.90); // tripan U≤0.90
    const totalCost = winArea * costM2Win;
    const epSav = estimateEpSaving("window", gap, epActual);
    addSuggestion(1, "Anvelopă", "Înlocuire tâmplărie exterioară",
      epSav, costM2Win, totalCost,
      `U mediu ferestre = ${avgUWin.toFixed(2)}. Ținta: ≤1.00 (tripan). Reducere semnificativă pierderi.`);
  }

  // ── Acoperiș
  const roofs = opaqueElements?.filter(e => ["PT","PP","PI"].includes(e.type)) || [];
  const avgURoof = roofs.length ? roofs.reduce((s,r) => {
    const R = (r.layers||[]).reduce((rr,l) => rr + ((parseFloat(l.thickness)||0)/1000)/(l.lambda||1), 0.14);
    return s + 1/R;
  }, 0) / roofs.length : 1.5;
  const roofArea = roofs.reduce((s,r) => s + (parseFloat(r.area)||0), 0) || Au * 0.9;
  if (avgURoof > 0.30) {
    const thickCm = 15, costM2Roof = getRoofInsulCostM2(thickCm);
    const totalCost = roofArea * costM2Roof;
    const epSav = estimateEpSaving("roof", gap, epActual);
    addSuggestion(1, "Anvelopă", "Termoizolare acoperiș/terasă",
      epSav, costM2Roof, totalCost,
      `U mediu acoperiș = ${avgURoof.toFixed(2)}. Adăugare 15-25cm vată minerală.`);
  }

  // ── PV
  if (rer < 30) {
    const pvKwp = Math.max(2, Au * 0.05); // ~5W/m² suprafață utilă
    const costPV = pvKwp * 1100; // EUR/kWp instalat (2025-2026)
    const epSav = estimateEpSaving("pv", gap, epActual);
    addSuggestion(1, "Regenerabile", "Instalare panouri fotovoltaice",
      epSav, 1100 * pvKwp / Au, costPV,
      `RER actual = ${rer.toFixed(0)}% (minim nZEB: 30%). PV ${pvKwp.toFixed(1)} kWp estimat.`);
  }

  // ── Pompă de căldură
  if (epActual > nzebEpMax * 1.2) {
    const costHP = Au * 55;
    const epSav = estimateEpSaving("hp", gap, epActual);
    addSuggestion(2, "Instalații", "Pompă de căldură aer-apă",
      epSav, 55, costHP,
      "COP 3.5-4.5. Reduce drastic consumul de energie primară. Combină cu PV pentru efect maxim.");
  }

  // ── Ventilare HR
  if (epActual > nzebEpMax) {
    const costVent = Au * 15;
    const epSav = estimateEpSaving("vent", gap, epActual);
    addSuggestion(2, "Instalații", "Ventilare mecanică cu recuperare căldură",
      epSav, 15, costVent,
      "Eficiență HR 80-90%. Reduce pierderile de ventilare menținând calitatea aerului interior.");
  }

  // ── Solar termic ACM
  const costSolar = Au * 0.04 * 380;
  const epSavSolar = estimateEpSaving("solar", gap, epActual);
  addSuggestion(3, "Regenerabile", "Panouri solar-termice pentru ACM",
    epSavSolar, 380, costSolar,
    "2-4 m² colectori per persoană. Acoperire 40-60% necesar ACM vara.");

  // ── LED
  const costLED = Au * 8;
  const epSavLED = estimateEpSaving("led", gap, epActual);
  addSuggestion(3, "Instalații", "Înlocuire iluminat cu LED + senzori prezență",
    epSavLED, 8, costLED,
    "LED eficacitate >100 lm/W. Senzori prezență în holuri, scări, grupuri sanitare. Recuperare rapidă.");

  // Sortare: prioritate principală, apoi cost-eficiență (EUR/kWh·an — mai mic = mai bun)
  return suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.eurPerKwhSaved || 999) - (b.eurPerKwhSaved || 999);
  });
}
