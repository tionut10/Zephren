/**
 * GlazingSection.jsx — Viewer SVG pentru secțiunea unui element vitrat
 * (fereastră, ușă vitrată) — secțiune orizontală (plan vedere de sus) cu:
 *   - Ramă stângă și dreaptă (material + Uf)
 *   - Pachet sticlă: 2-3 foi sticlă + 1-2 camere gaz
 *   - Strat Low-E (marcat distinct, poziție fața 2 sau fața 3)
 *   - Distanțier (Al / warm edge)
 *   - Cote: grosime ramă, grosime pachet, camere gaz
 *   - Metrici: Ug, Uf, Ψg, Uw, SHGC
 *
 * Props:
 *   element: { name, glazingType, frameType, frameRatio, u, g, uFrame, area, orientation }
 *   width, height: dimensiuni SVG (default 520 × 240)
 *   compact: mod thumbnail
 *   onClickExpand: handler modal
 */

import { SectionFrame, MaterialLayer, DimensionCote, MaterialLegend, MATERIAL_CATEGORIES } from "./primitives.jsx";

// Config pentru fiecare tip de vitraj — interpretăm din numele glazingType
const GLAZING_CONFIGS = {
  "Simplu vitraj":              { panes: 1, gap: 0, gap_mm: 0,  gas: "gas_air",    lowE: false, u: 5.80, g: 0.85 },
  "Dublu vitraj (4-12-4)":      { panes: 2, gap: 1, gap_mm: 12, gas: "gas_air",    lowE: false, u: 2.80, g: 0.75 },
  "Dublu vitraj termoizolant":  { panes: 2, gap: 1, gap_mm: 16, gas: "gas_argon",  lowE: false, u: 1.60, g: 0.65 },
  "Dublu vitraj Low-E":         { panes: 2, gap: 1, gap_mm: 16, gas: "gas_argon",  lowE: true,  lowEFace: 2, u: 1.10, g: 0.50 },
  "Triplu vitraj":              { panes: 3, gap: 2, gap_mm: 12, gas: "gas_argon",  lowE: false, u: 0.90, g: 0.50 },
  "Triplu vitraj Low-E":        { panes: 3, gap: 2, gap_mm: 14, gas: "gas_argon",  lowE: true,  lowEFace: 3, u: 0.70, g: 0.45 },
  "Triplu vitraj 2×Low-E":      { panes: 3, gap: 2, gap_mm: 14, gas: "gas_krypton", lowE: true, lowEFace: 2, lowEFace2: 5, u: 0.50, g: 0.40 },
};

const FRAME_CATEGORIES = {
  "PVC (5 camere)":       { cat: "plaster",  color: "#e8e3d5", uf: 1.30, label: "PVC (5 camere)" },
  "PVC (6-7 camere)":     { cat: "plaster",  color: "#ffffff", uf: 1.10, label: "PVC (6-7 camere)" },
  "Lemn stratificat":     { cat: "wood",     color: "#c8a171", uf: 1.40, label: "Lemn stratificat" },
  "Aluminiu fără RPT":    { cat: "metal",    color: "#8a8e94", uf: 5.00, label: "Aluminiu (fără RPT)" },
  "Aluminiu cu RPT":      { cat: "metal",    color: "#8a8e94", uf: 2.00, label: "Aluminiu (cu RPT)" },
  "Lemn-aluminiu":        { cat: "wood",     color: "#a16207", uf: 1.20, label: "Lemn-aluminiu" },
};

export default function GlazingSection({
  element,
  width = 520,
  height = 220,
  compact = false,
  showLegend = true,
  showDimensions = true,
  onClickExpand,
}) {
  if (!element) {
    return <div className="p-6 text-center text-xs opacity-50">Element vitrat lipsă.</div>;
  }

  const config = GLAZING_CONFIGS[element.glazingType] || GLAZING_CONFIGS["Dublu vitraj termoizolant"];
  const frame = FRAME_CATEGORIES[element.frameType] || FRAME_CATEGORIES["PVC (5 camere)"];
  const frameRatio = (parseFloat(element.frameRatio) || 30) / 100;

  // Dimensiuni secțiune (mm reale → scală SVG)
  const frameWidth_mm = 70; // lățime tipică cadru
  const paneThick_mm = 4;
  const totalPackage_mm = config.panes * paneThick_mm + config.gap * config.gap_mm;
  const totalSection_mm = 2 * frameWidth_mm + totalPackage_mm + 40; // +margin sticlă în ramă

  // Scală uniformă
  const scale = (width - 40) / totalSection_mm;
  const px = (mm) => mm * scale;

  const startX = 20;
  const frameLeftX = startX;
  const frameRightX = startX + px(frameWidth_mm) + px(totalPackage_mm) + px(40);

  const glassStartX = frameLeftX + px(frameWidth_mm);

  // Build layers list pentru pachetul de sticlă
  const packageElements = [];
  let currentX = glassStartX;
  const paneW = px(paneThick_mm);
  const gapW = px(config.gap_mm);

  for (let i = 0; i < config.panes; i++) {
    packageElements.push({ type: "glass", x: currentX, width: paneW, index: i });
    currentX += paneW;
    if (i < config.panes - 1) {
      packageElements.push({ type: "gas", x: currentX, width: gapW, gas: config.gas, index: i });
      currentX += gapW;
    }
  }

  // Determină pozițiile Low-E (face numbering: 1=ext-ext, 2=ext-int al primei foi, 3=int-ext al doua foi, etc.)
  // Într-un dublu vitraj: Face 1 | [pane 1] | Face 2 | [gap] | Face 3 | [pane 2] | Face 4
  // Low-E tipic pe face 2 sau 3 (spre cameră gaz, partea caldă)
  const lowEPositions = [];
  if (config.lowE) {
    // Face 2 → după prima foaie, la startX + paneW (stânga camerei gaz)
    if (config.lowEFace === 2) lowEPositions.push({ x: glassStartX + paneW, side: "right" });
    // Face 3 → înainte de a doua foaie, la startX + paneW + gapW
    if (config.lowEFace === 3) lowEPositions.push({ x: glassStartX + paneW + gapW, side: "left" });
    // Face 5 (triplu, 2×Low-E)
    if (config.lowEFace2 === 5) lowEPositions.push({ x: glassStartX + 2 * paneW + 2 * gapW, side: "right" });
  }

  // Spacer distanțier
  const isWarmEdge = /warm/i.test(element.spacerType || "") || /plastic/i.test(element.spacerType || "");
  const spacerPatternId = isWarmEdge ? "mat-spacer-warm" : "mat-spacer-al";
  const spacerY = 18; // pozitie vizuală în secțiune (sus)
  const spacerHeight = 16;

  // Valori U real
  const uTotal = parseFloat(element.u) || config.u;
  const uFrame = parseFloat(element.uFrame) || frame.uf;

  return (
    <div className={compact ? "space-y-0" : "space-y-3"}>
      {/* Header metrici */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <Metric label="Uw total" value={`${uTotal.toFixed(2)} W/m²K`} accent />
          <Metric label="Ug sticlă" value={`${config.u.toFixed(2)}`} />
          <Metric label="Uf ramă" value={`${uFrame.toFixed(2)}`} />
          <Metric label="g (SHGC)" value={(parseFloat(element.g) || config.g).toFixed(2)} />
        </div>
      )}

      {/* SVG secțiune */}
      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        <SectionFrame
          width={width}
          height={height}
          orientation="vertical"
          extLabel="EXTERIOR"
          intLabel="INTERIOR"
          padTop={compact ? 18 : 22}
          padBottom={compact ? 28 : 56}
        >
          {/* Zidărie/perete la stânga și dreapta ramei (context) */}
          <MaterialLayer x={0} y={0} width={frameLeftX} height={height} category="masonry_brick" />
          <MaterialLayer x={frameRightX} y={0} width={width - frameRightX} height={height} category="masonry_brick" />
          {/* EPS exterior wrapping jamb */}
          <MaterialLayer x={0} y={0} width={px(10)} height={height} category="eps" />
          <MaterialLayer x={width - px(10)} y={0} width={px(10)} height={height} category="eps" />

          {/* Ramă stânga */}
          <rect x={frameLeftX} y={0} width={px(frameWidth_mm)} height={height} fill={`url(#${MATERIAL_CATEGORIES[frame.cat].patternId})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.7" />
          {/* Ramă dreapta */}
          <rect x={frameRightX - px(frameWidth_mm)} y={0} width={px(frameWidth_mm)} height={height} fill={`url(#${MATERIAL_CATEGORIES[frame.cat].patternId})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.7" />

          {/* Spacer distanțier sus (bară metalică / warm edge) */}
          <rect x={glassStartX} y={spacerY - 6} width={px(totalPackage_mm)} height={spacerHeight} fill={`url(#${spacerPatternId})`} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
          {!compact && (
            <text x={glassStartX + px(totalPackage_mm) / 2} y={spacerY + 4} fontSize="7" textAnchor="middle" fontWeight="700" fill={isWarmEdge ? "#92400e" : "#1e293b"}>
              {isWarmEdge ? "Warm edge (TGI)" : "Distanțier Al"}
            </text>
          )}

          {/* Pachet sticlă: foi + camere gaz */}
          {packageElements.map((e, i) => (
            <g key={i}>
              {e.type === "glass" && (
                <>
                  <rect x={e.x} y={spacerY + spacerHeight - 2} width={e.width} height={height - (spacerY + spacerHeight - 2) - 10} fill="url(#mat-glass)" stroke="#3a6ea8" strokeWidth="0.6" />
                  {!compact && (
                    <text x={e.x + e.width / 2} y={height - 4} fontSize="6" textAnchor="middle" fill="#1e3a8a" opacity="0.7">{paneThick_mm}mm</text>
                  )}
                </>
              )}
              {e.type === "gas" && (
                <>
                  <rect x={e.x} y={spacerY + spacerHeight - 2} width={e.width} height={height - (spacerY + spacerHeight - 2) - 10} fill={`url(#${MATERIAL_CATEGORIES[e.gas].patternId})`} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
                  {!compact && e.width > 12 && (
                    <>
                      <text x={e.x + e.width / 2} y={height / 2 - 4} fontSize="7" textAnchor="middle" fontWeight="700" fill="#1e40af">
                        {e.gas === "gas_argon" ? "Argon" : e.gas === "gas_krypton" ? "Kripton" : "Aer"}
                      </text>
                      <text x={e.x + e.width / 2} y={height / 2 + 6} fontSize="6" textAnchor="middle" fill="#1e40af" opacity="0.7">{config.gap_mm}mm</text>
                    </>
                  )}
                </>
              )}
            </g>
          ))}

          {/* Straturi Low-E (linii aurii pe fețele respective) */}
          {lowEPositions.map((pos, i) => (
            <g key={`lowe-${i}`}>
              <rect
                x={pos.side === "right" ? pos.x - 1.8 : pos.x - 0.2}
                y={spacerY + spacerHeight - 2}
                width="1.8"
                height={height - (spacerY + spacerHeight - 2) - 10}
                fill="url(#mat-lowe)"
                opacity="0.85"
              />
              {!compact && (
                <text
                  x={pos.x}
                  y={spacerY + spacerHeight + 15}
                  fontSize="6.5"
                  fill="#92400e"
                  fontWeight="700"
                  textAnchor="middle"
                  style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.9)", strokeWidth: "2px" }}
                >
                  Low-E {config.lowEFace || "?"}
                </text>
              )}
            </g>
          ))}

          {/* Etichete ramă */}
          {!compact && (
            <>
              <text x={frameLeftX + px(frameWidth_mm) / 2} y={height / 2 + 3} fontSize="8" textAnchor="middle" fontWeight="700" fill="#0f172a" transform={`rotate(-90 ${frameLeftX + px(frameWidth_mm) / 2} ${height / 2 + 3})`} style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.7)", strokeWidth: "2px" }}>
                Ramă ({frame.label})
              </text>
            </>
          )}

          {/* Cote dimensionale */}
          {showDimensions && !compact && (
            <>
              <DimensionCote x1={frameLeftX} y1={height + 6} x2={frameLeftX + px(frameWidth_mm)} y2={height + 6} label={`${frameWidth_mm}`} offset={10} orientation="h" />
              <DimensionCote x1={glassStartX} y1={height + 22} x2={glassStartX + px(totalPackage_mm)} y2={height + 22} label={`${totalPackage_mm}`} offset={10} orientation="h" />
            </>
          )}
        </SectionFrame>
      </div>

      {/* Legendă pachet */}
      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">Compoziție ({config.panes} foi sticlă · {config.gap} cameră{config.gap > 1 ? "e" : ""} gaz · {config.lowE ? "cu Low-E" : "fără Low-E"})</div>
          <MaterialLegend
            items={[
              { category: frame.cat, name: frame.label, extra: <span>Uf={uFrame.toFixed(2)}</span> },
              { category: "glass", name: "Sticlă float", thickness: paneThick_mm, extra: <span>{config.panes} foi</span> },
              { category: config.gas, name: config.gas === "gas_argon" ? "Argon (90%)" : config.gas === "gas_krypton" ? "Kripton" : "Aer", thickness: config.gap_mm, extra: config.gap > 0 && <span>{config.gap} cameră</span> },
              config.lowE && { category: "low_e", name: `Low-E (fața ${config.lowEFace})`, extra: <span>ε&lt;0.1</span> },
              { category: isWarmEdge ? "spacer_warm" : "spacer_al", name: isWarmEdge ? "Distanțier warm edge" : "Distanțier aluminiu", extra: <span>Ψg≈{isWarmEdge ? "0.04" : "0.08"}</span> },
            ].filter(Boolean)}
            layout="grid"
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className={`p-2 rounded-lg ${accent ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.03]"}`}>
      <div className={`font-mono font-bold ${accent ? "text-amber-400" : ""}`}>{value}</div>
      <div className="text-[9px] opacity-50 mt-0.5">{label}</div>
    </div>
  );
}
