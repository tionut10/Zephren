// ═══════════════════════════════════════════════════════════════
// GWP LIFECYCLE — EN 15978 detaliat pe materiale
// ═══════════════════════════════════════════════════════════════
export const GWP_FACTORS = { // kgCO2eq/kg — valori medii EPD
  "Cărămidă plină":0.24, "Cărămidă cu goluri (GVP)":0.20, "BCA (beton celular autoclavizat)":0.28,
  "Beton armat":0.13, "Beton simplu":0.10, "Șapă ciment":0.12,
  "Polistiren expandat EPS 60":3.30, "Polistiren expandat EPS 80":3.30, "Polistiren expandat EPS 100":3.30,
  "Polistiren extrudat XPS":3.80, "Polistiren grafitat EPS Neo":3.50,
  "Vată minerală bazaltică":1.20, "Vată minerală de sticlă":1.05,
  "Spumă poliuretanică (PUR)":4.20, "Spumă poliizocianurică (PIR)":4.00,
  "Plută expandată":0.15, "Aerogel":5.50, "Fibră de lemn":0.12,
  "Celuloză insuflată":0.08, "Cânepă (hemp)":0.10, "Lână de oaie":0.15,
  "CLT (Cross Laminated Timber)":-0.70, "Glulam (lemn lamelat)":-0.60,
  "Lemn moale (brad/molid)":-0.50, "Lemn tare (stejar)":-0.45,
  "Gips-carton":0.35, "Tencuială var-ciment":0.12, "Tencuială decorativă":0.15,
  "Oțel":1.80, "Aluminiu":8.20, "Gresie ceramică":0.70,
  "Bitum (membrană)":0.50, "Sticlă celulară (Foamglas)":1.10,
  "Vacuum Insulation Panel (VIP)":6.00, "Perlită expandată":0.45,
};

export function calcGWPDetailed(opaqueElements, glazingElements, areaUseful, lifetime) {
  if (!opaqueElements?.length || !areaUseful) return null;
  lifetime = lifetime || 50; // ani
  let totalGWP_A = 0; // A1-A3 producție
  let totalGWP_B = 0; // B4 înlocuire (izolații la 30ani)
  let totalGWP_C = 0; // C3-C4 dezasamblare + eliminare
  let totalGWP_D = 0; // D reciclare (credit)
  const details = [];

  opaqueElements.forEach(el => {
    const area = parseFloat(el.area) || 0;
    (el.layers || []).forEach(layer => {
      const d = (parseFloat(layer.thickness) || 0) / 1000; // m
      const rho = layer.rho || 1500;
      const mass = area * d * rho; // kg
      const gwpFactor = GWP_FACTORS[layer.material || layer.matName] || 0.15; // fallback
      const gwp_a = mass * gwpFactor;
      const needsReplacement = (layer.lambda || 1) < 0.06; // izolații
      const gwp_b = needsReplacement && lifetime > 30 ? gwp_a * 0.5 : 0;
      const gwp_c = mass * 0.02; // 2% eliminare
      const gwp_d = gwpFactor < 0 ? mass * gwpFactor * -0.3 : 0; // credit reciclare lemn
      totalGWP_A += gwp_a;
      totalGWP_B += gwp_b;
      totalGWP_C += gwp_c;
      totalGWP_D += gwp_d;
      if (Math.abs(gwp_a) > 50) {
        details.push({ material: layer.material || layer.matName, mass: Math.round(mass), gwp_a: Math.round(gwp_a), gwpFactor });
      }
    });
  });
  // Ferestre
  const glazGWP = glazingElements?.reduce((s,e) => s + (parseFloat(e.area)||0) * 35, 0) || 0; // ~35 kgCO2eq/m² fereastră
  totalGWP_A += glazGWP;

  const totalGWP = totalGWP_A + totalGWP_B + totalGWP_C - totalGWP_D;
  const gwpPerM2 = totalGWP / areaUseful;
  const gwpPerM2Year = gwpPerM2 / lifetime;
  // Clasificare
  let cls, color;
  if (gwpPerM2Year <= 5) { cls = "A — Excelent"; color = "#22c55e"; }
  else if (gwpPerM2Year <= 10) { cls = "B — Bun"; color = "#84cc16"; }
  else if (gwpPerM2Year <= 15) { cls = "C — Mediu"; color = "#eab308"; }
  else if (gwpPerM2Year <= 25) { cls = "D — Ridicat"; color = "#f97316"; }
  else { cls = "E — Foarte ridicat"; color = "#ef4444"; }

  return {
    totalGWP: Math.round(totalGWP), gwpPerM2: Math.round(gwpPerM2*10)/10, gwpPerM2Year: Math.round(gwpPerM2Year*10)/10,
    gwp_A: Math.round(totalGWP_A), gwp_B: Math.round(totalGWP_B), gwp_C: Math.round(totalGWP_C), gwp_D: Math.round(totalGWP_D),
    classification: cls, color, details: details.sort((a,b) => b.gwp_a - a.gwp_a).slice(0,10), lifetime,
    benchmarkNZEB: 15, // kgCO2eq/(m²·an) — referință EPBD
  };
}
