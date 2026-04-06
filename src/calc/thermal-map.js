// ═══════════════════════════════════════════════════════════════
// HARTĂ TERMICĂ PUNȚI TERMICE — Vizualizare SVG simplificată
// Generează un plan 2D al clădirii cu pierderi pe element colorate
// ═══════════════════════════════════════════════════════════════

// Paletă culori gradient termic (albastru = pierderi mici → roșu = pierderi mari)
function heatColor(normalized) {
  // normalized: 0 (rece/eficient) → 1 (cald/pierderi mari)
  const n = Math.max(0, Math.min(1, normalized));
  if (n < 0.25) {
    // albastru → verde
    const f = n / 0.25;
    return `rgb(${Math.round(0 + f*0)},${Math.round(100 + f*155)},${Math.round(200 - f*100)})`;
  } else if (n < 0.5) {
    // verde → galben
    const f = (n - 0.25) / 0.25;
    return `rgb(${Math.round(f*255)},255,${Math.round(100 - f*100)})`;
  } else if (n < 0.75) {
    // galben → portocaliu
    const f = (n - 0.5) / 0.25;
    return `rgb(255,${Math.round(255 - f*128)},0)`;
  } else {
    // portocaliu → roșu
    const f = (n - 0.75) / 0.25;
    return `rgb(255,${Math.round(127 - f*127)},0)`;
  }
}

// Generare SVG hartă termică pentru anvelopă
export function generateThermalMapSVG(params) {
  const { opaqueElements, glazingElements, thermalBridges, tInt, tExt, width, height } = params;
  const W = width || 600, H = height || 400;
  const tI = tInt || 20, tE = tExt || -15;
  const deltaT = tI - tE;

  // Calculăm fluxul termic per element [W/m²]
  const allElements = [];
  let maxFlux = 0;

  (opaqueElements || []).forEach(el => {
    const area = parseFloat(el.area) || 0;
    if (area <= 0) return;
    const R = (el.layers || []).reduce((r, l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
    const U = 1 / Math.max(R, 0.05);
    const tau = el.tau !== undefined ? el.tau : 1.0;
    const flux = U * tau * deltaT; // W/m²
    if (flux > maxFlux) maxFlux = flux;
    allElements.push({ type: "opaque", name: el.type + (el.name ? " " + el.name : ""), area, U: Math.round(U*100)/100, flux, tau });
  });

  (glazingElements || []).forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    if (area <= 0) return;
    const U = parseFloat(gl.u) || 2.5;
    const flux = U * deltaT;
    if (flux > maxFlux) maxFlux = flux;
    allElements.push({ type: "glazing", name: "Vitrare " + (gl.orientation || ""), area, U, flux, tau: 1.0 });
  });

  if (allElements.length === 0) return { svg: null, elements: [] };

  // Layout: elemente ca dreptunghiuri proporționale cu aria, aranjate pe rânduri
  const padding = 30;
  const labelH = 18;
  const totalArea = allElements.reduce((s, e) => s + e.area, 0);
  const availW = W - 2 * padding;
  const availH = H - 2 * padding - labelH * 2;

  // Aranjare pe rânduri (treemap simplificat)
  let svgRects = '';
  let svgLegend = '';
  let x = padding, y = padding + labelH * 2;
  const rowH = Math.min(80, availH / Math.ceil(allElements.length / 4));

  const enriched = allElements.map(el => ({
    ...el,
    normalized: maxFlux > 0 ? el.flux / maxFlux : 0,
    color: heatColor(maxFlux > 0 ? el.flux / maxFlux : 0),
    elWidth: totalArea > 0 ? Math.max(20, (el.area / totalArea) * availW) : 40,
  }));

  enriched.forEach((el, i) => {
    if (x + el.elWidth > W - padding) {
      x = padding;
      y += rowH + 8;
    }
    const rectH = rowH;
    // Dreptunghi colorat
    svgRects += `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(el.elWidth-2)}" height="${rectH}"
      fill="${el.color}" rx="4" stroke="#ffffff33" stroke-width="1">
      <title>${el.name}: U=${el.U} W/(m²·K), flux=${Math.round(el.flux)} W/m²</title>
    </rect>`;
    // Etichetă
    if (el.elWidth > 40) {
      svgRects += `<text x="${Math.round(x + el.elWidth/2)}" y="${Math.round(y + rectH/2 - 4)}"
        text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">${el.name.slice(0,10)}</text>`;
      svgRects += `<text x="${Math.round(x + el.elWidth/2)}" y="${Math.round(y + rectH/2 + 9)}"
        text-anchor="middle" font-size="8" fill="#ffffffcc">U=${el.U}</text>`;
    }
    x += el.elWidth;
  });

  // Legendă gradient
  const lgX = padding, lgY = padding;
  svgLegend += `<defs><linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${heatColor(0)}"/>
    <stop offset="33%" stop-color="${heatColor(0.33)}"/>
    <stop offset="66%" stop-color="${heatColor(0.66)}"/>
    <stop offset="100%" stop-color="${heatColor(1)}"/>
  </linearGradient></defs>`;
  svgLegend += `<rect x="${lgX}" y="${lgY}" width="200" height="10" fill="url(#heatGrad)" rx="2"/>`;
  svgLegend += `<text x="${lgX}" y="${lgY + 22}" font-size="9" fill="#999">Pierderi mici</text>`;
  svgLegend += `<text x="${lgX + 160}" y="${lgY + 22}" font-size="9" fill="#999">Pierderi mari</text>`;
  svgLegend += `<text x="${W/2}" y="${lgY + 10}" text-anchor="middle" font-size="10" fill="#ccc" font-weight="bold">
    Hartă termică anvelopă — flux maxim: ${Math.round(maxFlux)} W/m² la ΔT=${deltaT}°C
  </text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#1a1a2e" rx="8"/>
  ${svgLegend}
  ${svgRects}
</svg>`;

  return { svg, elements: enriched, maxFlux: Math.round(maxFlux) };
}

// Generare date pentru heatmap punți termice (tabel cu culori)
export function generateThermalBridgeHeatmap(thermalBridges) {
  if (!thermalBridges || !thermalBridges.length) return [];
  const maxPsiL = Math.max.apply(null, thermalBridges.map(tb => (parseFloat(tb.length)||0) * (parseFloat(tb.psi)||0)));
  return thermalBridges.map(tb => {
    const psiL = (parseFloat(tb.length)||0) * (parseFloat(tb.psi)||0);
    const normalized = maxPsiL > 0 ? psiL / maxPsiL : 0;
    return { ...tb, psiL: Math.round(psiL * 100) / 100, normalized, color: heatColor(normalized) };
  }).sort((a,b) => b.psiL - a.psiL);
}
