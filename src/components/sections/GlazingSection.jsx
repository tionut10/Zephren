/**
 * GlazingSection.jsx — Viewer SVG pentru secțiunea orizontală a unei ferestre
 * (plan vedere de sus — secțiune perpendiculară pe planul sticlei).
 *
 * Afișează:
 *   - Iconiță elevație în colțul stânga-sus cu linia de secțiune marcată
 *   - Ramă stângă și dreaptă cu cercevea (sash) vizibilă + material hașurat
 *   - Pachet sticlă: foi 4mm cu gradient reflectant distinct + camere gaz colorate
 *   - Strat Low-E aurit pe fața corespunzătoare (2/3/5) cu label clar
 *   - Distanțier sus (Al rece sau warm edge — TGI)
 *   - Cote pe grosimi ramă + pachet + camere individuale
 *   - Săgeți „deschidere" indicând direcția batante
 *   - Metrici: Uw, Ug, Uf, g (SHGC)
 *
 * Props:
 *   element: { name, glazingType, frameType, frameRatio, u, g, uFrame, area, orientation }
 *   width, height, compact, showLegend, showDimensions, onClickExpand
 */

import { SectionFrame, DimensionCote, MaterialLegend, MATERIAL_CATEGORIES } from "./primitives.jsx";

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
  "PVC (5 camere)":       { cat: "plaster",  uf: 1.30, label: "PVC (5 camere)" },
  "PVC (6-7 camere)":     { cat: "plaster",  uf: 1.10, label: "PVC (6-7 camere)" },
  "Lemn stratificat":     { cat: "wood",     uf: 1.40, label: "Lemn stratificat" },
  "Aluminiu fără RPT":    { cat: "metal",    uf: 5.00, label: "Aluminiu (fără RPT)" },
  "Aluminiu cu RPT":      { cat: "metal",    uf: 2.00, label: "Aluminiu (cu RPT)" },
  "Lemn-aluminiu":        { cat: "wood",     uf: 1.20, label: "Lemn-aluminiu" },
};

// Iconiță mică de elevație în colțul stânga-sus ilustrând "de unde e luată secțiunea"
function ElevationIcon({ x = 4, y = 4 }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <rect width="52" height="40" rx="3" fill="rgba(255,255,255,0.92)" stroke="#94a3b8" strokeWidth="0.6" />
      {/* Elevație fereastră */}
      <rect x="6" y="6" width="40" height="28" fill="#dbeafe" stroke="#64748b" strokeWidth="0.7" />
      <line x1="26" y1="6" x2="26" y2="34" stroke="#64748b" strokeWidth="0.5" />
      <line x1="6" y1="20" x2="46" y2="20" stroke="#64748b" strokeWidth="0.5" />
      {/* Linia secțiunii orizontale */}
      <line x1="2" y1="20" x2="50" y2="20" stroke="#ef4444" strokeWidth="0.9" strokeDasharray="2 1.5" />
      <text x="26" y="1.5" fontSize="4" textAnchor="middle" fill="#475569">elevație</text>
      <text x="48" y="23" fontSize="5" fill="#ef4444" fontWeight="700">A–A</text>
    </g>
  );
}

export default function GlazingSection({
  element,
  width = 640,
  height = 260,
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

  // Detectare luminator/skylight (fereastră montată orizontal în acoperiș)
  const isSkylight = element.orientation === "Orizontal" || /luminator|skylight|tabatieră|tabatiera/i.test(element.name || "");

  // Dimensiuni reale mm → scală SVG
  const frameWidth_mm = 70;         // lățime profil cadru
  const sashWidth_mm = 55;          // lățime cercevea (sash) — profilul interior care ține sticla
  const paneThick_mm = 4;
  const totalPackage_mm = config.panes * paneThick_mm + config.gap * config.gap_mm;
  // Total de la exteriorul ramei stânga până la interiorul ramei dreapta (doar fereastra, fără perete)
  const totalSection_mm = 2 * frameWidth_mm + totalPackage_mm + 20;

  // Padding lateral mic pentru context (marcheaz că aici se întâlnește cu peretele)
  const sidePadding_mm = 35;
  const displaySection_mm = totalSection_mm + 2 * sidePadding_mm;

  const scale = (width - 20) / displaySection_mm;
  const px = (mm) => mm * scale;

  const startX = 10;
  const wallLeft_x = startX;
  const wallLeftEnd_x = startX + px(sidePadding_mm);
  const frameLeft_x = wallLeftEnd_x;
  const frameLeftEnd_x = frameLeft_x + px(frameWidth_mm);
  const glassStart_x = frameLeftEnd_x + px(10); // mic gap între cadru și sticlă (cercevea)
  const glassEnd_x = glassStart_x + px(totalPackage_mm);
  const frameRight_x = glassEnd_x + px(10);
  const frameRightEnd_x = frameRight_x + px(frameWidth_mm);
  const wallRight_x = frameRightEnd_x;
  const wallRightEnd_x = wallRight_x + px(sidePadding_mm);

  // Înălțime desenare
  const contentTop = 20;
  const contentBottom = height - 20;
  const contentH = contentBottom - contentTop;

  // Pachet sticlă
  const packageElements = [];
  let currentX = glassStart_x;
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

  // Low-E pe fețele corespunzătoare (numerotare 1-n de la exterior)
  const lowEPositions = [];
  if (config.lowE) {
    if (config.lowEFace === 2) lowEPositions.push({ x: glassStart_x + paneW, side: "right", face: 2 });
    if (config.lowEFace === 3) lowEPositions.push({ x: glassStart_x + paneW + gapW, side: "left", face: 3 });
    if (config.lowEFace2 === 5) lowEPositions.push({ x: glassStart_x + 2 * paneW + 2 * gapW, side: "right", face: 5 });
  }

  const isWarmEdge = /warm/i.test(element.spacerType || "") || /plastic/i.test(element.spacerType || "");
  const spacerPatternId = isWarmEdge ? "mat-spacer-warm" : "mat-spacer-al";
  const spacerY = contentTop + 6;
  const spacerHeight = 18;

  const uTotal = parseFloat(element.u) || config.u;
  const uFrame = parseFloat(element.uFrame) || frame.uf;
  const framePatternId = MATERIAL_CATEGORIES[frame.cat].patternId;

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

      {/* Banner explicativ clar — diferit pentru luminator vs fereastră verticală */}
      {!compact && (
        <div className="flex items-center gap-2 text-[11px] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-1.5">
          <span className="text-sky-400">{isSkylight ? "☀️" : "📐"}</span>
          <span className="text-sky-300/90">
            {isSkylight ? (
              <><b>Secțiune verticală prin luminator</b> (fereastră orizontală în acoperiș) — exteriorul/cerul e deasupra, interiorul camerei dedesubt. Diagrama arată sandwich-ul sticlă-gaz-sticlă perpendicular pe planul geamului.</>
            ) : (
              <><b>Vedere în plan — secțiune orizontală A-A</b> prin fereastră (privind de sus). Exteriorul este sus, interiorul jos. Peretele e prezentat doar ca context lateral.</>
            )}
          </span>
        </div>
      )}

      {/* SVG secțiune */}
      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        <SectionFrame
          width={width}
          height={height}
          orientation="vertical"
          extLabel={isSkylight ? "EXTERIOR (cer / acoperiș)" : "EXTERIOR (față exterioară fereastră)"}
          intLabel={isSkylight ? "INTERIOR (cameră sub luminator)" : "INTERIOR (cameră)"}
          padTop={compact ? 18 : 24}
          padBottom={compact ? 30 : 70}
        >
          {/* ── Context perete lateral — DOAR context, subtil ────────────────── */}
          <rect x={wallLeft_x} y={contentTop} width={wallLeftEnd_x - wallLeft_x} height={contentH} fill="#e7d5c0" opacity="0.35" />
          <rect x={wallRight_x} y={contentTop} width={wallRightEnd_x - wallRight_x} height={contentH} fill="#e7d5c0" opacity="0.35" />
          {!compact && (
            <>
              <text x={(wallLeft_x + wallLeftEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="8" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7" transform={`rotate(-90 ${(wallLeft_x + wallLeftEnd_x) / 2} ${contentTop + contentH / 2 + 3})`}>perete</text>
              <text x={(wallRight_x + wallRightEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="8" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7" transform={`rotate(-90 ${(wallRight_x + wallRightEnd_x) / 2} ${contentTop + contentH / 2 + 3})`}>perete</text>
            </>
          )}

          {/* ── FEREASTRA: zona principal-vizibilă cu borduri distincte ─────── */}
          {/* Container outline pentru a marca clar conturul ferestrei */}
          <rect x={frameLeft_x - 2} y={contentTop - 2} width={frameRightEnd_x - frameLeft_x + 4} height={contentH + 4} fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />

          {/* Ramă stângă (profil PVC/lemn/Al) */}
          <rect x={frameLeft_x} y={contentTop} width={frameLeftEnd_x - frameLeft_x} height={contentH} fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="1" />
          {/* Cercevea stânga (sash — profilul interior ce fixează sticla) */}
          <rect x={frameLeftEnd_x - px(8)} y={contentTop + 6} width={px(18)} height={contentH - 12} fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="0.7" opacity="0.85" />

          {/* Ramă dreaptă */}
          <rect x={frameRight_x} y={contentTop} width={frameRightEnd_x - frameRight_x} height={contentH} fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="1" />
          {/* Cercevea dreapta */}
          <rect x={frameRight_x - px(10)} y={contentTop + 6} width={px(18)} height={contentH - 12} fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="0.7" opacity="0.85" />

          {/* Distanțier sus (bară între foile de sticlă) */}
          <rect x={glassStart_x} y={spacerY} width={glassEnd_x - glassStart_x} height={spacerHeight} fill={`url(#${spacerPatternId})`} stroke="#334155" strokeWidth="0.7" />
          {!compact && (
            <text x={(glassStart_x + glassEnd_x) / 2} y={spacerY + spacerHeight / 2 + 3} fontSize="8" textAnchor="middle" fontWeight="700" fill={isWarmEdge ? "#451a03" : "#f1f5f9"}>
              {isWarmEdge ? "Distanțier warm edge (TGI)" : "Distanțier Al"}
            </text>
          )}

          {/* Pachet sticlă — foile mai groase vizual pentru lizibilitate */}
          {packageElements.map((e, i) => {
            const paneVisualW = e.type === "glass" ? Math.max(e.width, 8) : e.width;
            const yStart = spacerY + spacerHeight + 2;
            const yEnd = contentBottom - 8;
            return (
              <g key={i}>
                {e.type === "glass" && (
                  <>
                    {/* Glass pane — gradient distinct albastru cu margini întărite */}
                    <rect
                      x={e.x - (paneVisualW - e.width) / 2}
                      y={yStart}
                      width={paneVisualW}
                      height={yEnd - yStart}
                      fill="url(#mat-glass)"
                      stroke="#1e40af"
                      strokeWidth="1.2"
                    />
                    {/* Reflecție pentru efect visual */}
                    <line x1={e.x + e.width * 0.3} y1={yStart + 8} x2={e.x + e.width * 0.3} y2={yEnd - 8} stroke="white" strokeWidth="0.6" opacity="0.5" />
                    {!compact && (
                      <text x={e.x + e.width / 2} y={yEnd + 10} fontSize="7" textAnchor="middle" fontWeight="700" fill="#1e40af">{paneThick_mm}mm</text>
                    )}
                  </>
                )}
                {e.type === "gas" && (
                  <>
                    <rect x={e.x} y={yStart} width={e.width} height={yEnd - yStart} fill={`url(#${MATERIAL_CATEGORIES[e.gas].patternId})`} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                    {!compact && e.width > 10 && (
                      <>
                        <text x={e.x + e.width / 2} y={(yStart + yEnd) / 2 - 4} fontSize="8" textAnchor="middle" fontWeight="700" fill="#1e40af" style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.9)", strokeWidth: "2.5px" }}>
                          {e.gas === "gas_argon" ? "Ar" : e.gas === "gas_krypton" ? "Kr" : "aer"}
                        </text>
                        <text x={e.x + e.width / 2} y={(yStart + yEnd) / 2 + 8} fontSize="7" textAnchor="middle" fill="#1e40af" fontWeight="600" style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2px" }}>
                          {config.gap_mm}mm
                        </text>
                      </>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Low-E stripes — linii aurii pe fețele corespunzătoare */}
          {lowEPositions.map((pos, i) => (
            <g key={`lowe-${i}`} style={{ pointerEvents: "none" }}>
              <rect
                x={pos.side === "right" ? pos.x - 2 : pos.x}
                y={spacerY + spacerHeight + 2}
                width="2"
                height={contentBottom - 8 - (spacerY + spacerHeight + 2)}
                fill="url(#mat-lowe)"
                opacity="0.95"
              />
              {!compact && (
                <g transform={`translate(${pos.x}, ${spacerY + spacerHeight + 8})`}>
                  <rect x="-22" y="-3" width="44" height="10" fill="#fef3c7" stroke="#d97706" strokeWidth="0.5" rx="2" />
                  <text x="0" y="4" fontSize="7" textAnchor="middle" fontWeight="700" fill="#92400e">Low-E (fața {pos.face})</text>
                </g>
              )}
            </g>
          ))}

          {/* Labels ramă */}
          {!compact && (
            <>
              <text x={(frameLeft_x + frameLeftEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0f172a" transform={`rotate(-90 ${(frameLeft_x + frameLeftEnd_x) / 2} ${contentTop + contentH / 2 + 3})`} style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2.5px" }}>
                Ramă
              </text>
              <text x={(frameRight_x + frameRightEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0f172a" transform={`rotate(-90 ${(frameRight_x + frameRightEnd_x) / 2} ${contentTop + contentH / 2 + 3})`} style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2.5px" }}>
                Ramă
              </text>
              {/* Label zone: pachet sticlă */}
              <text x={(glassStart_x + glassEnd_x) / 2} y={contentBottom - 18} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0369a1" style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.92)", strokeWidth: "2.5px" }}>
                Pachet sticlă ({config.panes} foi)
              </text>
            </>
          )}

          {/* Cote dimensionale */}
          {showDimensions && !compact && (
            <>
              {/* Cotă ramă stânga */}
              <DimensionCote x1={frameLeft_x} y1={contentBottom + 8} x2={frameLeftEnd_x} y2={contentBottom + 8} label={`${frameWidth_mm}mm`} offset={10} orientation="h" />
              {/* Cotă pachet total */}
              <DimensionCote x1={glassStart_x} y1={contentBottom + 26} x2={glassEnd_x} y2={contentBottom + 26} label={`pachet ${totalPackage_mm}mm`} offset={10} orientation="h" />
              {/* Cotă cameră gaz (prima) */}
              {config.gap > 0 && (
                <DimensionCote x1={glassStart_x + paneW} y1={contentBottom + 44} x2={glassStart_x + paneW + gapW} y2={contentBottom + 44} label={`${config.gap_mm}mm`} offset={10} orientation="h" />
              )}
            </>
          )}

          {/* Iconiță elevație */}
          {!compact && <ElevationIcon x={6} y={6} />}

          {/* Săgeată "spre cameră" — INT */}
          {!compact && (
            <g>
              <line x1={(glassStart_x + glassEnd_x) / 2} y1={contentBottom + 62} x2={(glassStart_x + glassEnd_x) / 2} y2={contentBottom + 74} stroke="#15803d" strokeWidth="1.5" markerEnd="url(#sec-arrow-heat)" opacity="0.8" />
              <text x={(glassStart_x + glassEnd_x) / 2} y={contentBottom + 84} fontSize="7" textAnchor="middle" fill="#15803d" fontWeight="600">spre cameră</text>
            </g>
          )}
        </SectionFrame>
      </div>

      {/* Legendă pachet */}
      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">
            Compoziție · {config.panes} {config.panes === 1 ? "foaie" : "foi"} sticlă · {config.gap} {config.gap === 1 ? "cameră" : "camere"} gaz · {config.lowE ? `${lowEPositions.length}× Low-E` : "fără Low-E"}
          </div>
          <MaterialLegend
            items={[
              { category: frame.cat, name: frame.label, extra: <span>Uf={uFrame.toFixed(2)}</span> },
              { category: "glass", name: "Sticlă float", thickness: paneThick_mm, extra: <span>{config.panes} foi × {paneThick_mm}mm</span> },
              { category: config.gas, name: config.gas === "gas_argon" ? "Argon (90%)" : config.gas === "gas_krypton" ? "Kripton" : "Aer", thickness: config.gap_mm, extra: config.gap > 0 && <span>{config.gap} cameră{config.gap > 1 ? "e" : ""}</span> },
              config.lowE && { category: "low_e", name: `Low-E (fața ${config.lowEFace}${config.lowEFace2 ? "+" + config.lowEFace2 : ""})`, extra: <span>ε&lt;0.1</span> },
              { category: isWarmEdge ? "spacer_warm" : "spacer_al", name: isWarmEdge ? "Distanțier warm edge (TGI)" : "Distanțier aluminiu", extra: <span>Ψg≈{isWarmEdge ? "0.04" : "0.08"}</span> },
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
