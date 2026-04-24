/**
 * OpaqueSection.jsx — Viewer SVG pentru secțiunea unui element opac
 * (perete, acoperiș, planșeu) cu straturi la scală + cote + materiale hașurate.
 *
 * Props:
 *   element: { name, type, layers: [{ matName|material, thickness(mm), lambda, rho, mu }] }
 *   climate: { theta_e, theta_i_design? } — opțional pentru profil T
 *   width, height: dimensiuni SVG (default 460 × 280)
 *   showTemperatureProfile: toggle pentru curba T(x) suprapusă
 *   showDimensions: toggle pentru cote grosimi
 *   compact: mod thumbnail (ascunde cotele, labels material, legendă)
 *   onClickExpand: handler pentru extinderea în modal
 */

import { SectionFrame, MaterialLayer, DimensionCote, HeatFlowArrow, TemperatureProfile, MaterialLegend, classifyMaterial, getMaterialMeta } from "./primitives.jsx";

const MIN_LAYER_DRAW_WIDTH = 14; // pixels — grosimea minimă vizuală pentru labele lizibile

export default function OpaqueSection({
  element,
  climate,
  width = 460,
  height = 240,
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
    return (
      <div className="p-6 text-center text-xs opacity-50">Grosimi invalide în straturi.</div>
    );
  }

  // Scală vizuală: straturile foarte subțiri (<15mm) primesc minim MIN_LAYER_DRAW_WIDTH pentru lizibilitate,
  // straturile groase păstrează proporția corectă pe restul lățimii disponibile.
  const drawWidths = (() => {
    const raw = layers.map(l => (l.thickness / totalThick) * width);
    // Identifică stratele care sunt sub pragul minim la scală reală
    const thin = raw.map((w, i) => w < MIN_LAYER_DRAW_WIDTH ? MIN_LAYER_DRAW_WIDTH : null);
    const totalMin = thin.filter(x => x !== null).reduce((s, v) => s + v, 0);
    const scalable = raw.reduce((s, w, i) => thin[i] === null ? s + w : s, 0);
    const remainingW = width - totalMin;
    // Alocă remainingW între stratele scalabile, proporțional
    return raw.map((w, i) => thin[i] !== null ? thin[i] : (w / scalable) * remainingW);
  })();

  // Calculează xStart cumulative
  const xStarts = [0];
  drawWidths.forEach(w => xStarts.push(xStarts[xStarts.length - 1] + w));

  // R total, U total, masă/m²
  const rsi = 0.13, rse = 0.04;
  const rLayers = layers.map(l => l.thickness > 0 && l.lambda > 0 ? (l.thickness / 1000) / l.lambda : 0);
  const rTotal = rsi + rLayers.reduce((s, r) => s + r, 0) + rse;
  const uTotal = rTotal > 0 ? 1 / rTotal : 0;
  const massPerM2 = layers.reduce((s, l) => l.rho ? s + (l.thickness / 1000) * l.rho : s, 0);

  // Profil temperatură (simplu, linear după R)
  let tempPoints = null;
  if (showTemperatureProfile && climate?.theta_e !== undefined) {
    const tExt = climate.theta_e;
    const drawH = height;
    const drawTop = 20;
    const drawBottom = drawH - 40;
    // T la fiecare interfață
    let rCum = rsi;
    const pts = [{ x: xStarts[0], t: tInt - (tInt - tExt) * rsi / rTotal }];
    layers.forEach((_, i) => {
      rCum += rLayers[i];
      pts.push({ x: xStarts[i + 1], t: tInt - (tInt - tExt) * rCum / rTotal });
    });
    const tMin = Math.min(tExt, ...pts.map(p => p.t)) - 1;
    const tMax = Math.max(tInt, ...pts.map(p => p.t)) + 1;
    tempPoints = { pts, tMin, tMax, yTop: drawTop, yBottom: drawBottom };
  }

  const legendItems = layers.map(l => ({
    category: l.category,
    name: l.name,
    thickness: l.thickness,
    lambda: l.lambda || null,
    rho: l.rho,
    mu: l.mu,
    extra: null,
  }));

  return (
    <div className={compact ? "space-y-0" : "space-y-3"}>
      {/* Header cu metrici cheie */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <Metric label="Grosime totală" value={`${totalThick.toFixed(0)} mm`} />
          <Metric label="R total" value={`${rTotal.toFixed(2)} m²K/W`} />
          <Metric label="U" value={`${uTotal.toFixed(3)} W/m²K`} accent />
          <Metric label="Masă/m²" value={massPerM2 > 0 ? `${massPerM2.toFixed(0)} kg` : "—"} />
        </div>
      )}

      {/* SVG secțiune */}
      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        <SectionFrame
          width={width}
          height={height}
          orientation="vertical"
          extLabel={element.type === "roof" ? "EXTERIOR (acoperiș)" : element.type === "floor_ground" ? "EXTERIOR (sol)" : "EXTERIOR"}
          intLabel="INTERIOR (aer încăpere)"
          padTop={compact ? 18 : 24}
          padBottom={compact ? 40 : 56}
        >
          {/* Straturi */}
          {layers.map((l, i) => (
            <MaterialLayer
              key={i}
              x={xStarts[i]}
              y={0}
              width={drawWidths[i]}
              height={height}
              category={l.category}
              name={l.name}
            />
          ))}

          {/* Etichete materiale pe fiecare strat (rotite dacă strat prea îngust) */}
          {!compact && layers.map((l, i) => {
            const w = drawWidths[i];
            const xc = xStarts[i] + w / 2;
            const shouldRotate = w < 50;
            return (
              <g key={`lbl-${i}`} style={{ pointerEvents: "none" }}>
                <text
                  x={xc}
                  y={height / 2}
                  fontSize="9"
                  fill="#0f172a"
                  textAnchor="middle"
                  fontWeight="700"
                  transform={shouldRotate ? `rotate(-90 ${xc} ${height / 2})` : ""}
                  style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.7)", strokeWidth: "2px" }}
                >
                  {l.name.length > 18 ? l.name.slice(0, 18) + "…" : l.name}
                </text>
              </g>
            );
          })}

          {/* Cote grosimi sub SVG */}
          {showDimensions && !compact && layers.map((l, i) => (
            <DimensionCote
              key={`dim-${i}`}
              x1={xStarts[i]}
              y1={height + 6}
              x2={xStarts[i + 1]}
              y2={height + 6}
              label={`${l.thickness}`}
              offset={10}
              orientation="h"
            />
          ))}

          {/* Săgeată flux termic — INT spre EXT */}
          {!compact && (
            <HeatFlowArrow
              x1={width - 15}
              y1={height / 2 + 60}
              x2={15}
              y2={height / 2 + 60}
              label="Flux termic"
            />
          )}

          {/* Profil temperatură overlay */}
          {tempPoints && (
            <TemperatureProfile
              points={tempPoints.pts}
              xStart={0}
              xEnd={width}
              yTop={tempPoints.yTop}
              yBottom={tempPoints.yBottom}
              tMin={tempPoints.tMin}
              tMax={tempPoints.tMax}
            />
          )}

          {/* Legendă temperatură (sus stânga) */}
          {tempPoints && !compact && (
            <g style={{ pointerEvents: "none" }}>
              <rect x="4" y="4" width="92" height="26" fill="rgba(255,255,255,0.88)" rx="3" />
              <circle cx="12" cy="12" r="3" fill="#ef4444" />
              <text x="18" y="14.5" fontSize="8" fill="#7f1d1d" fontWeight="700">T({tInt}° → {climate?.theta_e}°)</text>
              <text x="8" y="25" fontSize="7" fill="#374151" opacity="0.7">Profil termic — iarnă</text>
            </g>
          )}
        </SectionFrame>
      </div>

      {/* Legendă materiale */}
      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">Legendă materiale (ext → int)</div>
          <MaterialLegend items={legendItems} layout="grid" />
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
