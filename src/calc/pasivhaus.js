// ═══════════════════════════════════════════════════════════════
// VERIFICARE STANDARD PASIVHAUS — PHI (Passivhaus Institut Darmstadt)
// Criterii: PHPP 10 — valabile pentru clima României (zone III-V)
// ═══════════════════════════════════════════════════════════════

import _pasivhausData from "../data/pasivhaus-data.json";

export const PH_CRITERIA = _pasivhausData.PH_CRITERIA;
export const PH_REQUIREMENTS = _pasivhausData.PH_REQUIREMENTS;

export function checkPasivhaus(params) {
  const {
    opaqueElements,
    glazingElements,
    thermalBridges,
    n50,
    hrEta,
    qH_nd_m2,      // necesar de căldură [kWh/(m²·an)] din ISO 13790
    qC_nd_m2,      // necesar de răcire
    peakHeating_Wm2, // W/m² sarcina de vârf
    ep_primary_m2, // energie primară totală [kWh/(m²·an)]
    renewableProduction_m2, // producție regenerabile [kWh/(m²·an)]
    Au, V,         // arie utilă, volum
    category,      // tip clădire
  } = params;

  const isRenov = false; // pentru EnerPHit setați true
  const criteria = isRenov ? PH_CRITERIA.enerphit : PH_CRITERIA.classic;

  // ─── Calcul U medii ───
  const walls = (opaqueElements || []).filter(e => e.type === "PE");
  const roofs = (opaqueElements || []).filter(e => ["PT","PP"].includes(e.type));
  const floors = (opaqueElements || []).filter(e => ["PL","PB"].includes(e.type));

  function avgU(els) {
    if (!els.length) return null;
    return els.reduce((s,e) => {
      const R = (e.layers||[]).reduce((r,l) => r + ((parseFloat(l.thickness)||0)/1000)/(l.lambda||1), 0.17);
      return s + 1/Math.max(R, 0.05);
    }, 0) / els.length;
  }

  const uWall  = avgU(walls);
  const uRoof  = avgU(roofs);
  const uFloor = avgU(floors);
  const uWin   = glazingElements?.length ? glazingElements.reduce((s,e) => s + (parseFloat(e.u)||2.5), 0) / glazingElements.length : null;
  const gWin   = glazingElements?.length ? glazingElements.reduce((s,e) => s + (parseFloat(e.g)||0.5), 0) / glazingElements.length : null;

  // Compacitate A/V (suprafața anvelopei / volum)
  const totalArea = (opaqueElements||[]).reduce((s,e) => s + (parseFloat(e.area)||0), 0)
                  + (glazingElements||[]).reduce((s,e) => s + (parseFloat(e.area)||0), 0);
  const aV = V && totalArea ? totalArea / V : null;

  // Fracție vitrată Sud
  const totalWinArea = (glazingElements||[]).reduce((s,e) => s + (parseFloat(e.area)||0), 0);
  const southWinArea = (glazingElements||[]).filter(e => ["S","SE","SV"].includes(e.orientation))
                                            .reduce((s,e) => s + (parseFloat(e.area)||0), 0);
  const southFraction = totalWinArea > 0 ? southWinArea / totalWinArea : 0;

  // Ψ maxim punți termice
  const maxPsi = thermalBridges?.length ? Math.max.apply(null, thermalBridges.map(tb => parseFloat(tb.psi)||0)) : null;

  // ─── Verificări ───
  const checks = [
    { id:"u_wall",    value: uWall,     pass: uWall !== null ? uWall <= 0.15 : null,    target:"≤ 0.15", unit:"W/(m²·K)", critical:true },
    { id:"u_roof",    value: uRoof,     pass: uRoof !== null ? uRoof <= 0.13 : null,    target:"≤ 0.13", unit:"W/(m²·K)", critical:true },
    { id:"u_floor",   value: uFloor,    pass: uFloor !== null ? uFloor <= 0.15 : null,  target:"≤ 0.15", unit:"W/(m²·K)", critical:true },
    { id:"u_window",  value: uWin,      pass: uWin !== null ? uWin <= 0.80 : null,      target:"≤ 0.80", unit:"W/(m²·K)", critical:true },
    { id:"g_window",  value: gWin,      pass: gWin !== null ? gWin >= 0.50 : null,      target:"≥ 0.50", unit:"-",        critical:false },
    { id:"n50",       value: n50,       pass: n50 !== null ? n50 <= criteria.pressureTest : null, target:`≤ ${criteria.pressureTest}`, unit:"ach@50Pa", critical:true },
    { id:"ventil",    value: hrEta ? Math.round(hrEta*100) : null, pass: hrEta !== null ? hrEta >= 0.75 : null, target:"≥ 75%", unit:"%HR", critical:true },
    { id:"heat_demand", value: qH_nd_m2, pass: qH_nd_m2 !== null ? qH_nd_m2 <= criteria.heatingDemand : null, target:`≤ ${criteria.heatingDemand}`, unit:"kWh/(m²·an)", critical:true },
    { id:"cool_demand", value: qC_nd_m2, pass: qC_nd_m2 !== null ? qC_nd_m2 <= criteria.coolingDemand : null, target:`≤ ${criteria.coolingDemand}`, unit:"kWh/(m²·an)", critical:false },
    { id:"peak_heat", value: peakHeating_Wm2, pass: peakHeating_Wm2 !== null ? peakHeating_Wm2 <= criteria.peakHeating : null, target:"≤ 10", unit:"W/m²", critical:true },
    { id:"tb_free",   value: maxPsi,    pass: maxPsi !== null ? maxPsi <= 0.01 : null,  target:"≤ 0.01", unit:"W/(m·K)", critical:true },
    { id:"compact",   value: aV,        pass: aV !== null ? aV <= 0.7 : null,           target:"≤ 0.7",  unit:"m⁻¹",    critical:false },
    { id:"solar_g",   value: Math.round(southFraction*100), pass: southFraction >= 0.40, target:"≥ 40%", unit:"%-vitrare Sud", critical:false },
  ].map(c => ({
    ...c,
    label: PH_REQUIREMENTS.find(r => r.id === c.id)?.label || c.id,
    value_str: c.value !== null && c.value !== undefined ? (Math.round(c.value * 100) / 100).toString() : "N/A",
  }));

  const criticalFails = checks.filter(c => c.critical && c.pass === false);
  const softFails = checks.filter(c => !c.critical && c.pass === false);
  const unknown = checks.filter(c => c.pass === null);
  const passed = checks.filter(c => c.pass === true);

  // Nivel de certificare posibil
  let achievable = null;
  if (criticalFails.length === 0) {
    const rer = renewableProduction_m2 || 0;
    if (rer >= 120) achievable = "Pasivhaus Premium";
    else if (rer >= 60) achievable = "Pasivhaus Plus";
    else achievable = "Pasivhaus Classic";
  }

  const score = Math.round(passed.length / (checks.filter(c => c.pass !== null).length || 1) * 100);

  return {
    checks,
    criticalFails, softFails, unknown, passed,
    score,
    achievable,
    isCompliant: criticalFails.length === 0,
    verdict: criticalFails.length === 0
      ? `Conformitate Pasivhaus posibilă — ${achievable}`
      : `${criticalFails.length} criteriu/criterii critice neîndeplinite`,
    color: criticalFails.length === 0 ? "#22c55e" : criticalFails.length <= 2 ? "#eab308" : "#ef4444",
    gaps: criticalFails.map(c => `${c.label}: actual ${c.value_str} ${c.unit}, necesar ${c.target} ${c.unit}`),
    uWall: uWall ? Math.round(uWall*1000)/1000 : null,
    uRoof: uRoof ? Math.round(uRoof*1000)/1000 : null,
    uWin: uWin ? Math.round(uWin*100)/100 : null,
    aV: aV ? Math.round(aV*100)/100 : null,
  };
}
