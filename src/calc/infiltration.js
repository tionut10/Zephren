export function calcAirInfiltration(n50, volume, aEnvelope) {
  if (!n50 || !volume) return null;
  const qenv = n50 * volume / (aEnvelope || 1); // m³/(h·m²)
  const q50 = n50 * volume; // m³/h la 50Pa
  // Corecție de la n50 la rata naturală de infiltrație (factor 1/20 pentru clădiri protejate)
  const nInfNat = n50 / 20;
  // Clasificare etanșeitate
  let cls, color;
  if (n50 <= 0.6) { cls = "Pasivhaus"; color = "#22c55e"; }
  else if (n50 <= 1.0) { cls = "Foarte etanș"; color = "#22c55e"; }
  else if (n50 <= 3.0) { cls = "Etanș"; color = "#84cc16"; }
  else if (n50 <= 5.0) { cls = "Mediu"; color = "#eab308"; }
  else if (n50 <= 10.0) { cls = "Slab etanș"; color = "#f97316"; }
  else { cls = "Neetanș"; color = "#ef4444"; }
  return { n50, q50: Math.round(q50), qenv: Math.round(qenv*100)/100, nInfNat: Math.round(nInfNat*100)/100, classification: cls, color,
    lossKW: Math.round(nInfNat * volume * 0.34 * 30 / 1000 * 10)/10, // kW pierderi la ΔT=30K
    recommendation: n50 > 3 ? "Se recomandă test blower door și etanșare joncțiuni" : null };
}

// ═══════════════════════════════════════════════════════════════
// ILUMINAT NATURAL — Factor lumină zi (FLZ) simplificat EN 15193-1
// ═══════════════════════════════════════════════════════════════
export function calcNaturalLighting(glazingElements, areaUseful) {
  if (!glazingElements?.length || !areaUseful) return null;
  const totalGlazArea = glazingElements.reduce((s,e) => s + (parseFloat(e.area)||0), 0);
  const ratio = totalGlazArea / areaUseful;
  // FLZ simplificat ≈ raport suprafață vitrată / suprafață utilă × corecție orientare
  const orientFactors = { S:1.2, SE:1.1, SV:1.1, E:0.9, V:0.9, NE:0.7, NV:0.7, N:0.6, Oriz:1.3, Mixt:0.9 };
  let weightedFLZ = 0, totalArea = 0;
  glazingElements.forEach(e => {
    const a = parseFloat(e.area) || 0;
    const f = orientFactors[e.orientation] || 0.9;
    const g = parseFloat(e.g) || 0.65;
    weightedFLZ += a * f * g * 0.45; // factor empiric
    totalArea += a;
  });
  const flz = totalArea > 0 ? (weightedFLZ / areaUseful) * 100 : 0; // %
  // Factor reducere LENI
  const fDaylight = Math.min(0.50, Math.max(0, (flz - 1) * 0.15)); // max 50% reducere
  let cls, color;
  if (flz >= 5) { cls = "Excelent"; color = "#22c55e"; }
  else if (flz >= 3) { cls = "Bun"; color = "#84cc16"; }
  else if (flz >= 2) { cls = "Acceptabil"; color = "#eab308"; }
  else if (flz >= 1) { cls = "Insuficient"; color = "#f97316"; }
  else { cls = "Foarte slab"; color = "#ef4444"; }
  return { flz: Math.round(flz*10)/10, ratio: Math.round(ratio*1000)/10, fDaylight: Math.round(fDaylight*100),
    classification: cls, color, glazArea: Math.round(totalArea*10)/10, areaUseful };
}
