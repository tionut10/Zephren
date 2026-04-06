// ═══════════════════════════════════════════════════════════════
// COMPARATOR PACHETE REABILITARE — Analiză paralelă scenarii
// Generează automat 3 pachete: Minimal, Mediu, nZEB
// Include NPV, termen recuperare, clasa energetică estimată
// ═══════════════════════════════════════════════════════════════
import { calcFinancialAnalysis } from './financial.js';
import { getNzebEpMax } from './smart-rehab.js';

// Costuri unitare de referință [EUR/m²] — actualizate 2025-2026
const UNIT_COSTS = {
  wall_eps10: 42,   // Termoizolare perete EPS 10cm
  wall_eps15: 62,   // Termoizolare perete EPS 15cm
  roof_15cm:  42,   // Termoizolare acoperiș 15cm
  roof_25cm:  68,   // Termoizolare acoperiș 25cm
  windows_u13: 135, // Ferestre U≤1.30
  windows_u09: 280, // Ferestre U≤0.90
  windows_u07: 390, // Ferestre U≤0.70
  vent_hr80: 15,    // Ventilare mecanică HR 80% [EUR/m² Au]
  vent_hr90: 22,    // Ventilare mecanică HR 90%
  hp_airwater: 55,  // Pompă căldură aer-apă [EUR/m² Au]
  pv_3kwp:    180,  // PV 3 kWp [EUR/m² panou]
  led:         8,   // Înlocuire LED [EUR/m² Au]
  solar_th:    15,  // Solar termic ACM [EUR/m² Au]
};

// Reducere EP estimată [kWh/(m²·an)] per măsură față de clădire existentă
// Valorile sunt procente din gap față de nZEB
function calcMeasureReductions(epActual, nzebEpMax) {
  const gap = Math.max(0, epActual - nzebEpMax);
  return {
    wall_basic:    gap * 0.20,
    wall_enhanced: gap * 0.28,
    roof:          gap * 0.12,
    windows:       gap * 0.15,
    vent_hr:       gap * 0.18,
    hp:            epActual * 0.30,
    pv:            Math.min(epActual * 0.35, 45),
    led:           epActual * 0.05,
    solar:         epActual * 0.06,
  };
}

export function calcRehabPackages(params) {
  const {
    building,         // { areaUseful, category, yearBuilt }
    climate,          // date climatice
    epActual,         // EP actual [kWh/(m²·an)]
    wallArea,         // m²
    roofArea,         // m²
    windowArea,       // m²
    energyPriceEUR,   // EUR/kWh
    discountRate,     // %
    escalation,       // %
    period,           // ani
    classificationFn, // funcție getEnergyClass(ep)
  } = params;

  const Au = parseFloat(building?.areaUseful) || 100;
  const nzebEpMax = getNzebEpMax(building?.category || "AL", climate?.zone);
  const reductions = calcMeasureReductions(epActual, nzebEpMax);
  const wA = wallArea || Au * 0.7;
  const rA = roofArea || Au * 0.9;
  const wndA = windowArea || Au * 0.15;
  const annualSavingPerKwh = Au * energyPriceEUR;

  // ─── Pachet 1: MINIMAL ───
  const pkg1Measures = ["Izolare acoperiș 15cm", "Ferestre U≤1.30"];
  const pkg1Invest = rA * UNIT_COSTS.roof_15cm + wndA * UNIT_COSTS.windows_u13;
  const pkg1EpRed = reductions.roof + reductions.windows;
  const pkg1EpNew = Math.max(nzebEpMax * 0.5, epActual - pkg1EpRed);
  const pkg1Saving = pkg1EpRed * annualSavingPerKwh;

  // ─── Pachet 2: MEDIU ───
  const pkg2Measures = ["Izolare pereți EPS 10cm", "Izolare acoperiș 15cm", "Ferestre U≤0.90", "LED"];
  const pkg2Invest = wA * UNIT_COSTS.wall_eps10 + rA * UNIT_COSTS.roof_15cm + wndA * UNIT_COSTS.windows_u09 + Au * UNIT_COSTS.led;
  const pkg2EpRed = reductions.wall_basic + reductions.roof + reductions.windows + reductions.led;
  const pkg2EpNew = Math.max(nzebEpMax * 0.8, epActual - pkg2EpRed);
  const pkg2Saving = pkg2EpRed * annualSavingPerKwh;

  // ─── Pachet 3: nZEB ───
  const pkg3Measures = ["Izolare pereți EPS 15cm", "Izolare acoperiș 25cm", "Ferestre U≤0.70", "Ventilare HR 90%", "Pompă căldură", "PV 3 kWp/100m²", "LED + senzori"];
  const pvAreaEst = Au * 0.03; // 3% din Au = suprafață PV estimată (panou)
  const pkg3Invest = wA * UNIT_COSTS.wall_eps15 + rA * UNIT_COSTS.roof_25cm + wndA * UNIT_COSTS.windows_u07 +
                     Au * UNIT_COSTS.vent_hr90 + Au * UNIT_COSTS.hp_airwater + pvAreaEst * UNIT_COSTS.pv_3kwp + Au * UNIT_COSTS.led;
  const pkg3EpRed = reductions.wall_enhanced + reductions.roof + reductions.windows + reductions.vent_hr + reductions.hp + reductions.pv + reductions.led;
  const pkg3EpNew = Math.max(nzebEpMax * 0.3, epActual - pkg3EpRed);
  const pkg3Saving = pkg3EpRed * annualSavingPerKwh;

  function buildPackage(label, invest, epNew, annualSaving, measures, isBest) {
    const fin = calcFinancialAnalysis({
      investCost: invest,
      annualSaving: annualSaving,
      discountRate: discountRate || 5,
      escalation: escalation || 3,
      period: period || 30,
      annualEnergyKwh: annualSaving / (energyPriceEUR || 0.08),
    });
    const epClass = classificationFn ? classificationFn(epNew) : null;
    const nzebConform = epNew <= nzebEpMax;
    return {
      label, invest: Math.round(invest), epNew: Math.round(epNew * 10) / 10,
      epReduction: Math.round((epActual - epNew) * 10) / 10,
      epReductionPct: epActual > 0 ? Math.round((epActual - epNew) / epActual * 100) : 0,
      annualSaving: Math.round(annualSaving),
      measures, fin, nzebConform, isBest: isBest || false,
      epClass: epClass?.class || null,
      investPerM2: Math.round(invest / Au),
      nzebEpMax,
    };
  }

  const packages = [
    buildPackage("Minimal", pkg1Invest, pkg1EpNew, pkg1Saving, pkg1Measures),
    buildPackage("Mediu", pkg2Invest, pkg2EpNew, pkg2Saving, pkg2Measures),
    buildPackage("nZEB Integral", pkg3Invest, pkg3EpNew, pkg3Saving, pkg3Measures),
  ];

  // Marcăm cel mai eficient (cel mai bun NPV)
  let bestNPV = -Infinity, bestIdx = 0;
  packages.forEach((p, i) => { if (p.fin && p.fin.npv > bestNPV) { bestNPV = p.fin.npv; bestIdx = i; } });
  packages[bestIdx].isBest = true;

  return {
    packages,
    epActual,
    nzebEpMax,
    epGap: Math.max(0, epActual - nzebEpMax),
    Au,
    energyPriceEUR,
  };
}
