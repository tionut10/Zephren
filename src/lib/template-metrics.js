// ═══════════════════════════════════════════════════════════════════════════
//  Template Metrics — calcul U-values, ψ totale, EP estimat din șablon
//  Folosit în BuildingTemplateModal pentru tooltip preview on-hover
//  Conformitate: ISO 6946 + Mc 001-2022 §3 + C 107/3-2005
// ═══════════════════════════════════════════════════════════════════════════

// Rezistențe termice superficiale ISO 6946 Tab. 1
const RSI_RSE = {
  // [Rsi, Rse] în m²K/W per tip element
  PE: [0.13, 0.04], // perete exterior (flux orizontal)
  PT: [0.10, 0.04], // terasă/acoperiș plat (flux ascendent)
  PP: [0.10, 0.04], // planșeu sub pod/acoperiș înclinat
  PB: [0.17, 0.04], // planșeu peste subsol (flux descendent)
  PL: [0.17, 0.00], // placă pe sol (Rse înlocuit de termorezistența solului)
  default: [0.13, 0.04],
};

/**
 * Calculează U-value (W/m²K) pentru un element opac din straturile sale.
 * Returnează `null` dacă layers e gol/invalid.
 */
export function calcUOpaque(element) {
  if (!element?.layers?.length) return null;
  const [rsi, rse] = RSI_RSE[element.type] || RSI_RSE.default;
  let rTotal = rsi + rse;
  for (const layer of element.layers) {
    const d_m = parseFloat(layer.thickness) / 1000; // mm → m
    const lambda = parseFloat(layer.lambda);
    if (!isFinite(d_m) || !isFinite(lambda) || lambda <= 0) continue;
    rTotal += d_m / lambda;
  }
  if (rTotal <= 0) return null;
  return 1 / rTotal;
}

/** U mediu ponderat pe arie pentru un grup de elemente cu același tip. */
export function calcUWeightedAvg(elements) {
  if (!elements?.length) return null;
  let sumU_A = 0, sumA = 0;
  for (const el of elements) {
    const U = calcUOpaque(el);
    const A = parseFloat(el.area);
    if (!isFinite(U) || !isFinite(A)) continue;
    sumU_A += U * A;
    sumA += A;
  }
  return sumA > 0 ? sumU_A / sumA : null;
}

/** Grupează elementele opace per tip (PE/PT/PP/PB/PL) și calculează U mediu per grup. */
export function groupOpaqueByType(opaque) {
  const groups = {};
  for (const el of (opaque || [])) {
    const t = el.type || "PE";
    if (!groups[t]) groups[t] = [];
    groups[t].push(el);
  }
  const result = {};
  for (const [t, els] of Object.entries(groups)) {
    result[t] = { count: els.length, area: els.reduce((s, e) => s + (parseFloat(e.area) || 0), 0), U: calcUWeightedAvg(els) };
  }
  return result;
}

/** U mediu ponderat pe arie pentru ferestre. */
export function calcUGlazingAvg(glazing) {
  if (!glazing?.length) return null;
  let sumU_A = 0, sumA = 0;
  for (const g of glazing) {
    const U = parseFloat(g.u);
    const A = parseFloat(g.area);
    if (!isFinite(U) || !isFinite(A)) continue;
    sumU_A += U * A;
    sumA += A;
  }
  return sumA > 0 ? sumU_A / sumA : null;
}

/** Suma ψ × L pentru toate punțile termice (W/K). */
export function calcPsiTotal(bridges) {
  if (!bridges?.length) return { sum: 0, count: 0 };
  let sum = 0;
  for (const b of bridges) {
    const psi = parseFloat(b.psi);
    const L = parseFloat(b.length);
    if (!isFinite(psi) || !isFinite(L)) continue;
    sum += psi * L;
  }
  return { sum, count: bridges.length };
}

/** Estimează aria totală a anvelopei (m²) — sumă opace + ferestre. */
export function calcEnvelopeArea(tpl) {
  let A = 0;
  for (const el of (tpl.opaque || [])) A += parseFloat(el.area) || 0;
  for (const g of (tpl.glazing || [])) A += parseFloat(g.area) || 0;
  return A;
}

/** Procent vitraj (% din anvelopă). */
export function calcGlazingRatio(tpl) {
  const total = calcEnvelopeArea(tpl);
  if (total <= 0) return null;
  const glaz = (tpl.glazing || []).reduce((s, g) => s + (parseFloat(g.area) || 0), 0);
  return (glaz / total) * 100;
}

/** Returnează toate metricile relevante pentru afișare în tooltip. */
export function calcTemplateMetrics(tpl) {
  const groups = groupOpaqueByType(tpl.opaque);
  const psi = calcPsiTotal(tpl.bridges);
  return {
    walls:    groups.PE  || null, // pereți exteriori
    roof:     groups.PT  || groups.PP || null, // terasă SAU pod
    floor:    groups.PB  || groups.PL || null, // peste subsol SAU pe sol
    glazingU: calcUGlazingAvg(tpl.glazing),
    glazingRatio: calcGlazingRatio(tpl),
    bridgesPsi: psi,
    envelopeArea: calcEnvelopeArea(tpl),
    yearBuilt: parseInt(tpl.building?.yearBuilt) || null,
    floors: tpl.building?.floors || null,
    structure: tpl.building?.structure || null,
  };
}

/** Format helper: "0.234" → "0.23 W/m²K" sau "—" dacă null. */
export function fmtU(val) {
  if (val == null || !isFinite(val)) return "—";
  return `${val.toFixed(2)} W/m²K`;
}
