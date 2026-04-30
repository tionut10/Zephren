/**
 * GlazingSection.jsx — Viewer SVG pentru secțiunea orizontală a unei ferestre.
 *
 * Convenție orientare (consistentă cu OpaqueSection wall layout):
 *   - EXTERIOR pe STÂNGA, INTERIOR pe DREAPTA (axă orizontală = grosime perete)
 *   - Cadrul ferestrei se desfășoară de la stânga la dreapta (depth EXT→INT)
 *   - Foile de sticlă apar ca benzi verticale subțiri (perpendiculare pe direcția flux)
 *   - Camerele de gaz: benzi verticale între foi
 *   - Sus și jos: context perete (peretele continuând lateral)
 *
 * Afișează:
 *   - Iconiță elevație în colțul stânga-sus cu linia de secțiune A-A
 *   - Profil ramă stânga (EXT) și dreapta (INT) cu cercevea (sash) vizibilă
 *   - Pachet sticlă: foi 4mm cu numere de față (EN 12758: 1=ext, 2n=int)
 *   - Strat Low-E aurit pe fețele corespunzătoare cu badge clar
 *   - Distanțier sus + jos (Al rece sau warm edge — TGI)
 *   - Cote pe grosimi ramă + pachet + camere individuale
 *   - Flux termic INT→EXT (dreapta→stânga) în iarnă
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
      <rect width="56" height="42" rx="3" fill="rgba(255,255,255,0.95)" stroke="#94a3b8" strokeWidth="0.6" />
      {/* Elevație fereastră */}
      <rect x="6" y="8" width="44" height="28" fill="#dbeafe" stroke="#64748b" strokeWidth="0.7" />
      <line x1="28" y1="8" x2="28" y2="36" stroke="#64748b" strokeWidth="0.5" />
      <line x1="6" y1="22" x2="50" y2="22" stroke="#64748b" strokeWidth="0.5" />
      {/* Linia secțiunii orizontale */}
      <line x1="2" y1="22" x2="54" y2="22" stroke="#ef4444" strokeWidth="0.9" strokeDasharray="2 1.5" />
      <text x="28" y="5" fontSize="4.5" textAnchor="middle" fill="#475569" fontWeight="600">elevație</text>
      <text x="52" y="25" fontSize="5.5" fill="#ef4444" fontWeight="800">A–A</text>
    </g>
  );
}

export default function GlazingSection({
  element,
  width = 720,
  height = 320,
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
  const frameWidth_mm = 70;
  const sashOverlap_mm = 18;
  const paneThick_mm = 4;
  const totalPackage_mm = config.panes * paneThick_mm + config.gap * config.gap_mm;
  // Total wall thickness: ramă_EXT + (cercevea+gap) + pachet + (cercevea+gap) + ramă_INT
  const sashGap_mm = 10;
  const totalSection_mm = 2 * frameWidth_mm + 2 * sashGap_mm + totalPackage_mm;

  // Padding lateral pentru context perete extins
  const sidePadding_mm = 50;
  const displaySection_mm = totalSection_mm + 2 * sidePadding_mm;

  // padLeft/padRight în SectionFrame pentru benzile EXT/INT
  const bandPad = compact ? 32 : 62;

  const scale = (width - 12) / displaySection_mm;
  const px = (mm) => mm * scale;

  const startX = 6;
  const wallExtStart_x = startX;
  const wallExtEnd_x = startX + px(sidePadding_mm);
  const frameExtStart_x = wallExtEnd_x;
  const frameExtEnd_x = frameExtStart_x + px(frameWidth_mm);
  const glassStart_x = frameExtEnd_x + px(sashGap_mm);
  const glassEnd_x = glassStart_x + px(totalPackage_mm);
  const frameIntStart_x = glassEnd_x + px(sashGap_mm);
  const frameIntEnd_x = frameIntStart_x + px(frameWidth_mm);
  const wallIntStart_x = frameIntEnd_x;
  const wallIntEnd_x = wallIntStart_x + px(sidePadding_mm);

  // Înălțime conținut: frame ocupă o bandă orizontală centrală
  const dimensionAreaH = compact ? 26 : 60;
  const contentTop = compact ? 8 : 32;          // sub iconița elevație
  const contentBottom = height - dimensionAreaH;
  const contentH = contentBottom - contentTop;

  // Pachet sticlă — straturi verticale (perpendiculare pe direcția EXT-INT)
  const packageElements = [];
  let currentX = glassStart_x;
  const paneW = Math.max(px(paneThick_mm), 6);  // foile vizibil minim 6px
  const gapW = px(config.gap_mm);

  for (let i = 0; i < config.panes; i++) {
    packageElements.push({ type: "glass", x: currentX, width: paneW, index: i });
    currentX += paneW;
    if (i < config.panes - 1) {
      packageElements.push({ type: "gas", x: currentX, width: gapW, gas: config.gas, index: i });
      currentX += gapW;
    }
  }

  // Re-aliniere: pachetul construit cu paneW boost-at, recentrăm între frameExtEnd_x și frameIntStart_x
  const builtPackageW = currentX - glassStart_x;
  const targetPackageW = glassEnd_x - glassStart_x;
  const packageOffset = (targetPackageW - builtPackageW) / 2;
  packageElements.forEach(e => { e.x += packageOffset; });

  // Low-E pe fețele corespunzătoare (numerotare 1-n de la exterior)
  const lowEPositions = [];
  if (config.lowE) {
    // face index → poziție X în pachet
    const facePositions = {};
    let xWalk = packageElements[0].x;
    let faceIdx = 1;
    packageElements.forEach((e) => {
      if (e.type === "glass") {
        facePositions[faceIdx] = xWalk;          // fața exterioară a foii (face #2k+1)
        facePositions[faceIdx + 1] = xWalk + e.width; // fața interioară (face #2k+2)
        faceIdx += 2;
        xWalk += e.width;
      } else {
        xWalk += e.width;
      }
    });
    if (config.lowEFace && facePositions[config.lowEFace] != null) {
      lowEPositions.push({ x: facePositions[config.lowEFace], face: config.lowEFace });
    }
    if (config.lowEFace2 && facePositions[config.lowEFace2] != null) {
      lowEPositions.push({ x: facePositions[config.lowEFace2], face: config.lowEFace2 });
    }
  }

  const isWarmEdge = /warm/i.test(element.spacerType || "") || /plastic/i.test(element.spacerType || "");
  const spacerPatternId = isWarmEdge ? "mat-spacer-warm" : "mat-spacer-al";
  const spacerH = 18;

  const uTotal = parseFloat(element.u) || config.u;
  const uFrame = parseFloat(element.uFrame) || frame.uf;
  const framePatternId = MATERIAL_CATEGORIES[frame.cat].patternId;

  // viewBox util — width fără benzile EXT/INT
  const viewW = wallIntEnd_x + 6;

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

      {/* Banner explicativ */}
      {!compact && (
        <div className="flex items-center gap-2 text-[11px] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-1.5">
          <span className="text-sky-400">{isSkylight ? "☀️" : "📐"}</span>
          <span className="text-sky-300/90">
            {isSkylight ? (
              <><b>Secțiune verticală prin luminator</b> — exteriorul/cerul în stânga, interiorul în dreapta. Sandwich-ul sticlă-gaz-sticlă perpendicular pe planul geamului.</>
            ) : (
              <><b>Secțiune orizontală A-A</b> prin fereastră (vedere în plan, privind de sus). EXTERIOR la stânga, INTERIOR la dreapta — convenție identică cu peretele opac. Peretele continuă în direcția sus/jos.</>
            )}
          </span>
        </div>
      )}

      {/* SVG secțiune */}
      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        <SectionFrame
          width={viewW}
          height={height}
          orientation="horizontal"
          extLabel={isSkylight ? "EXTERIOR (cer)" : "EXTERIOR (față exterioară)"}
          intLabel={isSkylight ? "INTERIOR (cameră)" : "INTERIOR (cameră)"}
          padLeft={bandPad}
          padRight={bandPad}
        >
          {/* ── Context perete sus și jos — DOAR vizual ───────────────────────── */}
          <rect x={wallExtStart_x} y="0" width={wallExtEnd_x - wallExtStart_x} height={contentTop} fill="#e7d5c0" opacity="0.30" />
          <rect x={wallExtStart_x} y={contentBottom} width={wallExtEnd_x - wallExtStart_x} height={dimensionAreaH} fill="#e7d5c0" opacity="0.20" />
          <rect x={wallIntStart_x} y="0" width={wallIntEnd_x - wallIntStart_x} height={contentTop} fill="#e7d5c0" opacity="0.30" />
          <rect x={wallIntStart_x} y={contentBottom} width={wallIntEnd_x - wallIntStart_x} height={dimensionAreaH} fill="#e7d5c0" opacity="0.20" />
          {!compact && (
            <>
              <text x={(wallExtStart_x + wallExtEnd_x) / 2} y={contentTop / 2 + 3} fontSize="7.5" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7">↑ perete</text>
              <text x={(wallExtStart_x + wallExtEnd_x) / 2} y={contentBottom + dimensionAreaH / 2 + 3} fontSize="7.5" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7">perete ↓</text>
              <text x={(wallIntStart_x + wallIntEnd_x) / 2} y={contentTop / 2 + 3} fontSize="7.5" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7">↑ perete</text>
              <text x={(wallIntStart_x + wallIntEnd_x) / 2} y={contentBottom + dimensionAreaH / 2 + 3} fontSize="7.5" textAnchor="middle" fontWeight="600" fill="#78350f" opacity="0.7">perete ↓</text>
            </>
          )}

          {/* ── Conturul ferestrei (zonă punctată sky) ──────────────────────── */}
          <rect x={frameExtStart_x - 2} y={contentTop - 2}
            width={frameIntEnd_x - frameExtStart_x + 4}
            height={contentH + 4}
            fill="none" stroke="#0ea5e9" strokeWidth="1.4" strokeDasharray="5 3" opacity="0.7" />

          {/* ── Ramă EXT (stânga) ───────────────────────────────────────────── */}
          <rect x={frameExtStart_x} y={contentTop} width={frameExtEnd_x - frameExtStart_x} height={contentH}
            fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="1" />
          {/* Cercevea EXT — partea care ține pachetul */}
          <rect x={frameExtEnd_x - px(8)} y={contentTop + 6} width={px(sashOverlap_mm)} height={contentH - 12}
            fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="0.7" opacity="0.85" />

          {/* ── Ramă INT (dreapta) ──────────────────────────────────────────── */}
          <rect x={frameIntStart_x} y={contentTop} width={frameIntEnd_x - frameIntStart_x} height={contentH}
            fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="1" />
          {/* Cercevea INT */}
          <rect x={frameIntStart_x - px(10)} y={contentTop + 6} width={px(sashOverlap_mm)} height={contentH - 12}
            fill={`url(#${framePatternId})`} stroke="#475569" strokeWidth="0.7" opacity="0.85" />

          {/* ── Distanțier sus și jos (la marginea pachetului) ──────────────── */}
          <rect x={glassStart_x} y={contentTop} width={glassEnd_x - glassStart_x} height={spacerH}
            fill={`url(#${spacerPatternId})`} stroke="#334155" strokeWidth="0.7" />
          <rect x={glassStart_x} y={contentBottom - spacerH} width={glassEnd_x - glassStart_x} height={spacerH}
            fill={`url(#${spacerPatternId})`} stroke="#334155" strokeWidth="0.7" />
          {!compact && (
            <text x={(glassStart_x + glassEnd_x) / 2} y={contentTop + spacerH / 2 + 3}
              fontSize="8" textAnchor="middle" fontWeight="700" fill={isWarmEdge ? "#451a03" : "#f1f5f9"}>
              {isWarmEdge ? "Distanțier warm edge (TGI)" : "Distanțier Al"}
            </text>
          )}

          {/* ── Pachet sticlă — foi verticale + camere gaz ──────────────────── */}
          {packageElements.map((e, i) => {
            const yStart = contentTop + spacerH + 2;
            const yEnd = contentBottom - spacerH - 2;
            const paneIndex = e.type === "glass" ? e.index : -1;
            const faceExt = paneIndex >= 0 ? paneIndex * 2 + 1 : null;
            const faceInt = paneIndex >= 0 ? paneIndex * 2 + 2 : null;
            return (
              <g key={i}>
                {e.type === "glass" && (
                  <>
                    <rect x={e.x} y={yStart} width={e.width} height={yEnd - yStart}
                      fill="url(#mat-glass)" stroke="#1e40af" strokeWidth="1.2" />
                    {/* Reflexie centrală pentru efect vizual */}
                    <line x1={e.x + e.width * 0.3} y1={yStart + 8} x2={e.x + e.width * 0.3} y2={yEnd - 8}
                      stroke="white" strokeWidth="0.7" opacity="0.6" />
                    <line x1={e.x + e.width * 0.7} y1={yStart + 12} x2={e.x + e.width * 0.7} y2={yEnd - 12}
                      stroke="white" strokeWidth="0.4" opacity="0.35" />
                    {!compact && (
                      <>
                        {/* Numere fețe — convenție SR EN 12758 */}
                        <g style={{ pointerEvents: "none" }}>
                          <circle cx={e.x - 0.5} cy={yStart - 7} r="5.5" fill="#1e3a8a" stroke="white" strokeWidth="0.9" />
                          <text x={e.x - 0.5} y={yStart - 4.8} fontSize="7" fill="white" textAnchor="middle" fontWeight="800">{faceExt}</text>
                          <circle cx={e.x + e.width + 0.5} cy={yStart - 7} r="5.5" fill="#1e3a8a" stroke="white" strokeWidth="0.9" />
                          <text x={e.x + e.width + 0.5} y={yStart - 4.8} fontSize="7" fill="white" textAnchor="middle" fontWeight="800">{faceInt}</text>
                        </g>
                      </>
                    )}
                  </>
                )}
                {e.type === "gas" && (
                  <>
                    <rect x={e.x} y={yStart} width={e.width} height={yEnd - yStart}
                      fill={`url(#${MATERIAL_CATEGORIES[e.gas].patternId})`} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                    {!compact && e.width > 14 && (
                      <>
                        <text x={e.x + e.width / 2} y={(yStart + yEnd) / 2 - 4} fontSize="9" textAnchor="middle" fontWeight="700" fill="#1e40af"
                          style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.92)", strokeWidth: "2.5px" }}>
                          {e.gas === "gas_argon" ? "Ar" : e.gas === "gas_krypton" ? "Kr" : "aer"}
                        </text>
                        <text x={e.x + e.width / 2} y={(yStart + yEnd) / 2 + 9} fontSize="7.5" textAnchor="middle" fill="#1e40af" fontWeight="600"
                          style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2px" }}>
                          {config.gap_mm}mm
                        </text>
                      </>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* ── Low-E coating: dunga aurie pe fața respectivă ────────────────── */}
          {lowEPositions.map((pos, i) => {
            const yStart = contentTop + spacerH + 2;
            const yEnd = contentBottom - spacerH - 2;
            return (
              <g key={`lowe-${i}`} style={{ pointerEvents: "none" }}>
                <rect x={pos.x - 1} y={yStart} width="2.2" height={yEnd - yStart}
                  fill="url(#mat-lowe)" opacity="0.95" />
                {!compact && (
                  <g transform={`translate(${pos.x}, ${(yStart + yEnd) / 2})`}>
                    <rect x="-22" y="-6" width="44" height="12" fill="#fef3c7" stroke="#d97706" strokeWidth="0.5" rx="2" />
                    <text x="0" y="3" fontSize="7" textAnchor="middle" fontWeight="700" fill="#92400e">Low-E (f. {pos.face})</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Labels pe ramă (rotate 90° pentru lizibilitate) ─────────────── */}
          {!compact && (
            <>
              <text x={(frameExtStart_x + frameExtEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0f172a"
                transform={`rotate(-90 ${(frameExtStart_x + frameExtEnd_x) / 2} ${contentTop + contentH / 2 + 3})`}
                style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.9)", strokeWidth: "2.5px" }}>
                Ramă EXT
              </text>
              <text x={(frameIntStart_x + frameIntEnd_x) / 2} y={contentTop + contentH / 2 + 3} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0f172a"
                transform={`rotate(-90 ${(frameIntStart_x + frameIntEnd_x) / 2} ${contentTop + contentH / 2 + 3})`}
                style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.9)", strokeWidth: "2.5px" }}>
                Ramă INT
              </text>
              <text x={(glassStart_x + glassEnd_x) / 2} y={contentBottom - 6} fontSize="9" textAnchor="middle" fontWeight="700" fill="#0369a1"
                style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.92)", strokeWidth: "2.5px" }}>
                Pachet sticlă · {config.panes} foi
              </text>
            </>
          )}

          {/* ── Cote dimensionale sub conținut ──────────────────────────────── */}
          {showDimensions && !compact && (
            <>
              <DimensionCote x1={frameExtStart_x} y1={contentBottom + 8} x2={frameExtEnd_x} y2={contentBottom + 8}
                label={`${frameWidth_mm}mm`} offset={8} orientation="h" />
              <DimensionCote x1={glassStart_x} y1={contentBottom + 26} x2={glassEnd_x} y2={contentBottom + 26}
                label={`pachet ${totalPackage_mm}mm`} offset={8} orientation="h" />
              <DimensionCote x1={frameIntStart_x} y1={contentBottom + 8} x2={frameIntEnd_x} y2={contentBottom + 8}
                label={`${frameWidth_mm}mm`} offset={8} orientation="h" />
              {config.gap > 0 && (
                <DimensionCote x1={packageElements[0].x + paneW} y1={contentBottom + 44}
                  x2={packageElements[0].x + paneW + gapW} y2={contentBottom + 44}
                  label={`${config.gap_mm}mm`} offset={8} orientation="h" />
              )}
            </>
          )}

          {/* ── Iconiță elevație (colț stânga-sus) ─────────────────────────── */}
          {!compact && <ElevationIcon x={6} y={6} />}

          {/* ── Flux termic INT→EXT (iarnă): săgeată dreapta→stânga ────────── */}
          {!compact && (
            <g style={{ pointerEvents: "none" }}>
              <line x1={frameIntEnd_x + 4} y1={contentTop + 22} x2={frameExtStart_x - 4} y2={contentTop + 22}
                stroke="#dc2626" strokeWidth="1.6" markerEnd="url(#sec-arrow-heat)" opacity="0.85" strokeDasharray="4 2" />
              <rect x={(frameExtStart_x + frameIntEnd_x) / 2 - 56} y={contentTop + 12} width="112" height="14"
                fill="rgba(255,255,255,0.95)" rx="3" stroke="#dc2626" strokeWidth="0.4" />
              <text x={(frameExtStart_x + frameIntEnd_x) / 2} y={contentTop + 22} fontSize="8.5"
                fill="#b91c1c" textAnchor="middle" fontWeight="700">
                Flux termic ← (iarnă: INT→EXT)
              </text>
            </g>
          )}

          {/* ── Legendă fețe (colț dreapta-sus) ─────────────────────────────── */}
          {!compact && config.panes >= 2 && (
            <g transform={`translate(${wallIntEnd_x - 84}, 6)`} style={{ pointerEvents: "none" }}>
              <rect x="0" y="0" width="80" height="32" rx="3" fill="rgba(255,255,255,0.95)" stroke="#1e3a8a" strokeWidth="0.5" />
              <circle cx="9" cy="11" r="4" fill="#1e3a8a" />
              <text x="9" y="13.5" fontSize="6" fill="white" textAnchor="middle" fontWeight="800">n</text>
              <text x="16" y="14" fontSize="6.5" fill="#1e3a8a" fontWeight="700">= nr. față</text>
              <text x="4" y="24" fontSize="6" fill="#475569">SR EN 12758</text>
              <text x="4" y="30" fontSize="6" fill="#475569">1=ext · {config.panes * 2}=int</text>
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
