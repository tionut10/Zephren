/**
 * OpaqueSection.jsx — Viewer SVG pentru secțiunea unui element opac.
 *
 * Orientarea secțiunii se adaptează automat la tipul elementului (element.type):
 *   - PE, PR, PS   — perete vertical   → secțiune WALL (EXT stânga, INT dreapta, layers ca coloane)
 *   - PT, SE       — planșeu terasă    → secțiune SLAB (EXT atmosferă sus, INT jos, layers ca rânduri)
 *   - PP           — planșeu sub pod   → secțiune SLAB (POD gri sus, INT jos)
 *   - PL           — placă pe sol      → secțiune SLAB (INT sus, SOL jos)
 *   - PB           — planșeu peste subsol → secțiune SLAB (INT sus, SUBSOL gri jos)
 *   - PI           — planșeu intermediar → secțiune SLAB (INT sus, INT jos)
 *
 * Convenția ordinii straturilor: array-ul `layers` se citește de la EXTERIOR la INTERIOR
 * pentru toate tipurile (standard C107/3 și conform `wizardOpaqueCalc.js`). Pentru plăci
 * pe sol (PL) ordinea vizuală e inversată — stratul "exterior" (sol) apare jos.
 *
 * Props:
 *   element: { name, type, layers: [{ matName|material, thickness(mm), lambda, rho, mu }] }
 *   climate: { theta_e, ... } — opțional pentru profil T
 *   width, height, compact, showTemperatureProfile, showDimensions, showLegend, onClickExpand
 */

import { SectionFrame, MaterialLayer, DimensionCote, HeatFlowArrow, MaterialLegend, classifyMaterial } from "./primitives.jsx";

const MIN_LAYER_DRAW = 14; // pixels — grosimea minimă vizuală pentru lizibilitate

// ── Configurație orientare per tip element ───────────────────────────────────
const ELEMENT_SECTION_CONFIG = {
  // Pereți verticali — orientare orizontală (EXT stânga, INT dreapta)
  PE: { layout: "wall", extLabel: "EXTERIOR (aer)",       intLabel: "INTERIOR (aer încăpere)" },
  PR: { layout: "wall", extLabel: "ROST ÎNCHIS",          intLabel: "INTERIOR" },
  PS: { layout: "wall", extLabel: "SUB CTS (sol lateral)", intLabel: "INTERIOR SUBSOL", extFill: "url(#amb-soil)", extColor: "#78350f" },
  // Planșeu terasă — atmosferă sus, interior jos
  PT: { layout: "slab_top_ext", extLabel: "EXTERIOR (acoperiș terasă)", intLabel: "INTERIOR (cameră)" },
  // Planșeu separator (bow-window) — similar terasă
  SE: { layout: "slab_top_ext", extLabel: "EXTERIOR (aer liber)",       intLabel: "INTERIOR" },
  // Planșeu sub pod neîncălzit — POD sus, INTERIOR jos
  PP: { layout: "slab_top_ext", extLabel: "POD NEÎNCĂLZIT",              intLabel: "INTERIOR (cameră)", extFill: "url(#amb-unheated)", extColor: "#475569" },
  // Placă pe sol — INTERIOR sus, SOL jos
  PL: { layout: "slab_top_int", intLabelTop: "INTERIOR (cameră)",       extLabelBottom: "SOL", extFill: "url(#amb-soil)", extColor: "#78350f" },
  // Planșeu peste subsol neîncălzit — INTERIOR sus, SUBSOL jos
  PB: { layout: "slab_top_int", intLabelTop: "INTERIOR (cameră)",       extLabelBottom: "SUBSOL NEÎNCĂLZIT", extFill: "url(#amb-unheated)", extColor: "#475569" },
  // Planșeu intermediar — INT sus + INT jos
  PI: { layout: "slab_both_int", intLabelTop: "INTERIOR (etaj sup.)",   intLabelBottom: "INTERIOR (etaj inf.)" },
};

function getSectionConfig(elementType) {
  return ELEMENT_SECTION_CONFIG[elementType] || ELEMENT_SECTION_CONFIG.PE;
}

// Calculează grosimile vizuale cu boost pentru straturile prea subțiri
function computeDrawSizes(layers, totalSpan) {
  const totalThick = layers.reduce((s, l) => s + l.thickness, 0);
  if (totalThick <= 0) return layers.map(() => 0);
  const raw = layers.map(l => (l.thickness / totalThick) * totalSpan);
  const boost = raw.map(w => w < MIN_LAYER_DRAW ? MIN_LAYER_DRAW : null);
  const totalBoost = boost.filter(x => x !== null).reduce((s, v) => s + v, 0);
  const scalable = raw.reduce((s, w, i) => boost[i] === null ? s + w : s, 0);
  const remaining = totalSpan - totalBoost;
  return raw.map((w, i) => boost[i] !== null ? boost[i] : scalable > 0 ? (w / scalable) * remaining : 0);
}

// Calculează textul afișat pe strat cu truncare pe baza spațiului
function truncateLabel(name, availableSpace) {
  const maxChars = Math.max(6, Math.floor(availableSpace / 5.2));
  return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
}

export default function OpaqueSection({
  element,
  climate,
  width = 640,
  height = 260,
  tInt = 20,
  showTemperatureProfile = true,
  showDimensions = true,
  compact = false,
  showLegend = true,
  onClickExpand,
}) {
  if (!element || !element.layers || element.layers.length === 0) {
    return (
      <div className="p-6 text-center text-xs opacity-50 bg-white/[0.03] rounded-lg border border-white/5">
        Adaugă straturi pentru a vedea secțiunea transversală.
      </div>
    );
  }

  const layers = element.layers.map(l => ({
    name: l.matName || l.material || "Strat",
    thickness: parseFloat(l.thickness) || 0,
    lambda: parseFloat(l.lambda) || 0,
    rho: parseFloat(l.rho) || null,
    mu: parseFloat(l.mu) || null,
    category: classifyMaterial(l.matName || l.material || ""),
  }));

  const totalThick = layers.reduce((s, l) => s + l.thickness, 0);
  if (totalThick <= 0) {
    return <div className="p-6 text-center text-xs opacity-50">Grosimi invalide în straturi.</div>;
  }

  const config = getSectionConfig(element.type);
  const isWall = config.layout === "wall";
  const isSoilOrientation = config.layout === "slab_top_int";

  // R total, U total, masă/m²
  const rsi = 0.13, rse = 0.04;
  const rLayers = layers.map(l => l.thickness > 0 && l.lambda > 0 ? (l.thickness / 1000) / l.lambda : 0);
  const rTotal = rsi + rLayers.reduce((s, r) => s + r, 0) + rse;
  const uTotal = rTotal > 0 ? 1 / rTotal : 0;
  const massPerM2 = layers.reduce((s, l) => l.rho ? s + (l.thickness / 1000) * l.rho : s, 0);

  // Legendă
  const legendItems = layers.map(l => ({
    category: l.category,
    name: l.name,
    thickness: l.thickness,
    lambda: l.lambda || null,
    rho: l.rho,
    mu: l.mu,
  }));

  return (
    <div className={compact ? "space-y-0" : "space-y-3"}>
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <Metric label="Grosime totală" value={`${totalThick.toFixed(0)} mm`} />
          <Metric label="R total" value={`${rTotal.toFixed(2)} m²K/W`} />
          <Metric label="U" value={`${uTotal.toFixed(3)} W/m²K`} accent />
          <Metric label="Masă/m²" value={massPerM2 > 0 ? `${massPerM2.toFixed(0)} kg` : "—"} />
        </div>
      )}

      {/* Banner explicativ tip orientare */}
      {!compact && (
        <div className="flex items-center gap-2 text-[11px] bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
          <span>{isWall ? "🧱" : isSoilOrientation ? "🏗" : "🏠"}</span>
          <span className="text-white/70">
            {isWall
              ? <>Secțiune <b>verticală</b> prin perete — EXTERIOR la stânga, INTERIOR la dreapta, straturile dispuse pe orizontală.</>
              : config.layout === "slab_top_ext"
                ? <>Secțiune <b>orizontală</b> prin planșeu — exteriorul (cerul/pod) deasupra, interiorul camerei dedesubt, straturile stivuite vertical.</>
                : config.layout === "slab_both_int"
                  ? <>Secțiune <b>orizontală</b> prin planșeu intermediar — ambele fețe sunt INTERIOR (etaje încălzite).</>
                  : <>Secțiune <b>orizontală</b> prin placă pe sol — interiorul camerei deasupra, solul/subsolul dedesubt.</>}
          </span>
        </div>
      )}

      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        {isWall ? renderWallSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal })
               : renderSlabSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal })}
      </div>

      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">Legendă materiale (ordinea: exterior → interior)</div>
          <MaterialLegend items={legendItems} layout="grid" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Secțiune WALL — layout orizontal (coloane de straturi)
// ═══════════════════════════════════════════════════════════════════════════
function renderWallSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal }) {
  const drawWidths = computeDrawSizes(layers, width);
  const xStarts = [0];
  drawWidths.forEach(w => xStarts.push(xStarts[xStarts.length - 1] + w));

  // Profil T
  let tempPoints = null;
  if (showTemperatureProfile && climate?.theta_e !== undefined) {
    const tExt = climate.theta_e;
    let rCum = rsi;
    const pts = [{ x: 0, t: tInt - (tInt - tExt) * rsi / rTotal }];
    layers.forEach((_, i) => {
      rCum += rLayers[i];
      pts.push({ x: xStarts[i + 1], t: tInt - (tInt - tExt) * rCum / rTotal });
    });
    const tMin = Math.min(tExt, ...pts.map(p => p.t)) - 1;
    const tMax = Math.max(tInt, ...pts.map(p => p.t)) + 1;
    tempPoints = { pts, tMin, tMax, yTop: 20, yBottom: height - 40 };
  }

  return (
    <SectionFrame
      width={width}
      height={height}
      orientation="horizontal"
      extLabel={config.extLabel}
      intLabel={config.intLabel}
      extFill={config.extFill}
      intFill={config.intFill}
      extColor={config.extColor}
      intColor={config.intColor}
    >
      {/* Straturi ca coloane */}
      {layers.map((l, i) => (
        <MaterialLayer key={i} x={xStarts[i]} y={0} width={drawWidths[i]} height={height} category={l.category} name={l.name} />
      ))}

      {/* Labels pe straturi */}
      {!compact && layers.map((l, i) => {
        const w = drawWidths[i];
        const xc = xStarts[i] + w / 2;
        const shouldRotate = w < 70;
        const availableSpace = shouldRotate ? (height - 20) : (w - 8);
        const displayName = truncateLabel(l.name, availableSpace);
        return (
          <text key={`lbl-${i}`} x={xc} y={height / 2} fontSize="9" fill="#0f172a" textAnchor="middle" fontWeight="700"
            transform={shouldRotate ? `rotate(-90 ${xc} ${height / 2})` : ""}
            style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2.5px", pointerEvents: "none" }}>
            {displayName}
          </text>
        );
      })}

      {/* Cote grosimi sub */}
      {showDimensions && !compact && layers.map((l, i) => (
        <DimensionCote key={`dim-${i}`} x1={xStarts[i]} y1={height + 6} x2={xStarts[i + 1]} y2={height + 6} label={`${l.thickness}`} offset={10} orientation="h" />
      ))}

      {/* Flux termic INT → EXT */}
      {!compact && (
        <HeatFlowArrow x1={width - 15} y1={height / 2 + 65} x2={15} y2={height / 2 + 65} label="Flux termic (iarnă)" />
      )}

      {/* Profil T */}
      {tempPoints && (() => {
        const { pts, tMin, tMax, yTop, yBottom } = tempPoints;
        const tToY = (t) => yBottom - ((t - tMin) / (tMax - tMin)) * (yBottom - yTop);
        const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + tToY(p.t).toFixed(1)).join(" ");
        return (
          <g style={{ pointerEvents: "none" }}>
            <path d={path} fill="none" stroke="#ef4444" strokeWidth="1.8" opacity="0.85" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={tToY(p.t)} r="2.2" fill="#ef4444" />
                <text x={p.x} y={tToY(p.t) - 5} fontSize="7" fill="#ef4444" textAnchor="middle" fontWeight="700">{p.t.toFixed(1)}°</text>
              </g>
            ))}
            {!compact && (
              <g>
                <rect x="4" y="4" width="120" height="26" fill="rgba(255,255,255,0.88)" rx="3" />
                <circle cx="12" cy="12" r="3" fill="#ef4444" />
                <text x="18" y="14.5" fontSize="8" fill="#7f1d1d" fontWeight="700">T({tInt}° → {climate?.theta_e}°) iarnă</text>
                <text x="8" y="25" fontSize="7" fill="#374151" opacity="0.7">EXT ← {pts[0].t.toFixed(1)}° ... {pts[pts.length - 1].t.toFixed(1)}° → INT</text>
              </g>
            )}
          </g>
        );
      })()}
    </SectionFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Secțiune SLAB — layout vertical (rânduri de straturi)
// ═══════════════════════════════════════════════════════════════════════════
function renderSlabSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal }) {
  // Pentru layout "slab_top_int" / "slab_both_int": ordinea layers se INVERSEAZĂ vizual —
  // stratul primul din array (care e EXT prin convenție) trebuie afișat JOS, nu SUS.
  const reversed = config.layout === "slab_top_int" || config.layout === "slab_both_int";
  const displayLayers = reversed ? [...layers].reverse() : layers;
  const displayR = reversed ? [...rLayers].reverse() : rLayers;

  const drawHeights = computeDrawSizes(displayLayers, height);
  const yStarts = [0];
  drawHeights.forEach(h => yStarts.push(yStarts[yStarts.length - 1] + h));

  // Profil T (vertical — axa Y = poziție, axa X = temperatură)
  let tempPoints = null;
  if (showTemperatureProfile && climate?.theta_e !== undefined && config.layout !== "slab_both_int") {
    const tExt = climate.theta_e;
    let rCum = rsi;
    // Construim punctele mergând EXT → INT (în ordinea fizică), apoi mapăm la poziții vizuale
    const pts = [];
    // interior surface (EXT side)
    pts.push({ rPos: 0, t: tInt - (tInt - tExt) * rsi / rTotal });
    rLayers.forEach((r, i) => {
      rCum += r;
      pts.push({ rPos: i + 1, t: tInt - (tInt - tExt) * rCum / rTotal });
    });
    // Convert rPos → Y coordinate
    const layerYs = reversed ? yStarts.slice().reverse() : yStarts;
    // layerYs[0] = top position for EXT-side interface if not reversed;
    // in reversed case, EXT-side interface (rPos=N) is at top of drawing, rPos=0 is at bottom
    const yMapped = pts.map(p => {
      const yIdx = reversed ? (pts.length - 1 - p.rPos) : p.rPos;
      return { y: yStarts[yIdx], t: p.t };
    });
    const tMin = Math.min(tExt, ...pts.map(p => p.t)) - 1;
    const tMax = Math.max(tInt, ...pts.map(p => p.t)) + 1;
    tempPoints = { yPts: yMapped, tMin, tMax, xLeft: 20, xRight: width - 20 };
  }

  // Labels top/bottom pentru SectionFrame:
  let extLabel, intLabel, extFill, intFill, extColor, intColor;
  if (reversed) {
    // INT pe sus, EXT (sol/subsol) pe jos
    extLabel = config.intLabelTop || "INTERIOR";
    intLabel = config.extLabelBottom || "EXTERIOR";
    extFill = "url(#amb-int)";
    intFill = config.extFill || "url(#amb-ext)";
    extColor = "#15803d";
    intColor = config.extColor || "#1e40af";
  } else if (config.layout === "slab_both_int") {
    extLabel = config.intLabelTop || "INTERIOR (etaj sup.)";
    intLabel = config.intLabelBottom || "INTERIOR (etaj inf.)";
    extFill = "url(#amb-int)";
    intFill = "url(#amb-int)";
    extColor = "#15803d";
    intColor = "#15803d";
  } else {
    // slab_top_ext (PT/PP/SE) — EXT sus, INT jos
    extLabel = config.extLabel || "EXTERIOR";
    intLabel = config.intLabel || "INTERIOR";
    extFill = config.extFill || "url(#amb-ext)";
    intFill = "url(#amb-int)";
    extColor = config.extColor || "#1e40af";
    intColor = "#15803d";
  }

  return (
    <SectionFrame
      width={width}
      height={height}
      orientation="vertical"
      extLabel={extLabel}
      intLabel={intLabel}
      extFill={extFill}
      intFill={intFill}
      extColor={extColor}
      intColor={intColor}
      padTop={compact ? 18 : 24}
      padBottom={compact ? 24 : 40}
      padLeft={compact ? 0 : 60}
      padRight={compact ? 0 : 60}
    >
      {/* Straturi ca rânduri */}
      {displayLayers.map((l, i) => (
        <MaterialLayer key={i} x={0} y={yStarts[i]} width={width} height={drawHeights[i]} category={l.category} name={l.name} />
      ))}

      {/* Labels pe rânduri */}
      {!compact && displayLayers.map((l, i) => {
        const h = drawHeights[i];
        const yc = yStarts[i] + h / 2;
        const shouldRotate = h < 22; // când stratul e prea îngust vertical, rotim textul
        const availableSpace = shouldRotate ? (width - 20) : (width - 40);
        const displayName = truncateLabel(l.name, availableSpace);
        return (
          <text key={`lbl-${i}`} x={width / 2} y={yc + 3} fontSize="9" fill="#0f172a" textAnchor="middle" fontWeight="700"
            transform={shouldRotate ? "" : ""}
            style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: "2.5px", pointerEvents: "none" }}>
            {displayName}
          </text>
        );
      })}

      {/* Cote grosimi în stânga */}
      {showDimensions && !compact && displayLayers.map((l, i) => (
        <DimensionCote key={`dim-${i}`} x1={-8} y1={yStarts[i]} x2={-8} y2={yStarts[i + 1]} label={`${l.thickness}`} offset={-10} orientation="v" />
      ))}

      {/* Săgeată flux termic vertical */}
      {!compact && config.layout !== "slab_both_int" && (
        <g>
          {reversed ? (
            // Flux de la INT (sus) spre EXT (jos)
            <>
              <line x1={width + 20} y1={10} x2={width + 20} y2={height - 10} stroke="#ef4444" strokeWidth="1.8" markerEnd="url(#sec-arrow-heat)" opacity="0.9" />
              <text x={width + 30} y={height / 2} fontSize="8" fill="#ef4444" fontWeight="700" transform={`rotate(-90 ${width + 30} ${height / 2})`}>Flux termic ↓ (iarnă)</text>
            </>
          ) : (
            // Flux de la INT (jos) spre EXT (sus)
            <>
              <line x1={width + 20} y1={height - 10} x2={width + 20} y2={10} stroke="#ef4444" strokeWidth="1.8" markerEnd="url(#sec-arrow-heat)" opacity="0.9" />
              <text x={width + 30} y={height / 2} fontSize="8" fill="#ef4444" fontWeight="700" transform={`rotate(-90 ${width + 30} ${height / 2})`}>Flux termic ↑ (iarnă)</text>
            </>
          )}
        </g>
      )}

      {/* Profil T orizontal (temperatură plotată ca o curbă de-a lungul secțiunii) */}
      {tempPoints && (() => {
        const { yPts, tMin, tMax, xLeft, xRight } = tempPoints;
        const tToX = (t) => xLeft + ((t - tMin) / (tMax - tMin)) * (xRight - xLeft);
        const path = yPts.map((p, i) => (i === 0 ? "M" : "L") + tToX(p.t).toFixed(1) + "," + p.y.toFixed(1)).join(" ");
        return (
          <g style={{ pointerEvents: "none" }}>
            <path d={path} fill="none" stroke="#ef4444" strokeWidth="1.8" opacity="0.85" />
            {yPts.map((p, i) => (
              <g key={i}>
                <circle cx={tToX(p.t)} cy={p.y} r="2.2" fill="#ef4444" />
                <text x={tToX(p.t) + 6} y={p.y + 3} fontSize="7" fill="#ef4444" fontWeight="700">{p.t.toFixed(1)}°</text>
              </g>
            ))}
            {!compact && (
              <g>
                <rect x="4" y={height - 28} width="120" height="24" fill="rgba(255,255,255,0.88)" rx="3" />
                <circle cx="12" cy={height - 16} r="3" fill="#ef4444" />
                <text x="18" y={height - 13.5} fontSize="8" fill="#7f1d1d" fontWeight="700">T({tInt}° → {climate?.theta_e}°)</text>
              </g>
            )}
          </g>
        );
      })()}
    </SectionFrame>
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
