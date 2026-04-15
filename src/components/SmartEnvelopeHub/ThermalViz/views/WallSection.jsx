/**
 * WallSection — vedere secțiune prin perete cu gradient temperaturi prin straturi.
 *
 * SVG 2D orizontal. Fiecare strat = <rect> cu lățime ∝ grosime + gradient T
 * între temperatura interfeței interioare și cea exterioară.
 * Curba temperaturii (polyline) suprapusă peste straturi.
 * Avertisment condens dacă T_suprafață_interioară < T_rouă.
 */
import { useMemo, useState } from "react";
import { computeWallProfile } from "../utils/sectionProfiler.js";
import { uToColor } from "../utils/thermalColor.js";
import { ELEMENT_TYPES_WIZARD } from "../../utils/wizardOpaqueCalc.js";

// ── Parametri vizuali ────────────────────────────────────────────────────────
const SVG_WIDTH = 900;
const SVG_HEIGHT = 420;
const MARGIN = { top: 40, right: 80, bottom: 80, left: 80 };
const PLOT_W = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

// ── Paletă T fixă pentru curba temperaturii (indiferent de colorMode U) ─────
function tempToColor(T, Tmin, Tmax) {
  if (!Number.isFinite(T)) return "#94a3b8";
  const t = Math.max(0, Math.min(1, (T - Tmin) / (Tmax - Tmin)));
  const hue = 240 - 240 * t;
  return `hsl(${hue.toFixed(0)}, 78%, 55%)`;
}

function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

export default function WallSection({
  opaqueElements = [],
  selectedElementIdx: externalIdx,
  onSelectIdx,
  climate = {},
  rhInt = 50,
  colorMode = "continuous",
}) {
  // Filtrez doar elementele opace cu straturi
  const viableElements = opaqueElements.filter(e => Array.isArray(e.layers) && e.layers.length > 0);

  const [internalIdx, setInternalIdx] = useState(0);
  const idx = Number.isInteger(externalIdx) ? externalIdx : internalIdx;
  const clampedIdx = Math.max(0, Math.min(viableElements.length - 1, idx));
  const element = viableElements[clampedIdx];

  const setIdx = (newIdx) => {
    if (onSelectIdx) onSelectIdx(newIdx);
    setInternalIdx(newIdx);
  };

  // Rsi/Rse din tipul elementului
  const typeInfo = ELEMENT_TYPES_WIZARD.find(t => t.id === element?.type);
  const Rsi = element?._rsi ?? typeInfo?.rsi ?? 0.13;
  const Rse = element?._rse ?? typeInfo?.rse ?? 0.04;

  const T_int = Number.isFinite(climate.T_int) ? climate.T_int : 20;
  const T_ext = Number.isFinite(climate.T_ext) ? climate.T_ext : -15;

  const profile = useMemo(() => {
    if (!element) return null;
    return computeWallProfile({
      layers: element.layers,
      T_int, T_ext, Rsi, Rse, rhInt,
      order: "exterior-first",  // Presetele Zephren au strat[0]=exterior
    });
  }, [element, T_int, T_ext, Rsi, Rse, rhInt]);

  if (!viableElements.length) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="text-white/50">
          <div className="text-4xl mb-2" aria-hidden="true">🧱</div>
          <div className="text-sm">Nu există elemente opace cu straturi definite</div>
          <div className="text-[11px] mt-1 text-white/30">
            Adaugă un perete/planșeu cu compoziție stratificată pentru vizualizare
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Scara X: grosime totală → PLOT_W
  const totalD = profile.totalThickness_mm || 1;
  const xScale = (mm) => (mm / totalD) * PLOT_W;

  // Scara Y pentru temperatură (curba suprapusă)
  const Tmin = Math.floor(Math.min(T_ext, profile.T_dew) - 2);
  const Tmax = Math.ceil(T_int + 2);
  const yScale = (T) => PLOT_H - ((T - Tmin) / (Tmax - Tmin)) * PLOT_H;

  // Construim <rect>-uri straturi cu gradient între temp interfețe
  const layerRects = [];
  for (let i = 0; i < profile.nodes.length - 1; i++) {
    const a = profile.nodes[i];
    const b = profile.nodes[i + 1];
    if (b.kind !== "interface" && b.kind !== "surface") continue;
    const x = xScale(a.x_mm);
    const w = xScale(b.x_mm) - xScale(a.x_mm);
    if (w <= 0) continue;
    const colorIn  = tempToColor(a.T, Tmin, Tmax);
    const colorOut = tempToColor(b.T, Tmin, Tmax);
    layerRects.push({
      x, w,
      fill: `url(#layer-grad-${i})`,
      colorIn, colorOut,
      material: b.material,
      thickness_mm: b.thickness_mm,
      lambda: b.lambda,
      R_layer: b.R_layer,
      T_a: a.T, T_b: b.T,
      idx: i,
    });
  }

  // Curba temperaturii (polyline prin noduri)
  const tempPath = profile.nodes
    .map(n => `${xScale(n.x_mm).toFixed(1)},${yScale(n.T).toFixed(1)}`)
    .join(" ");

  // Linia punctului de rouă
  const dewY = yScale(profile.T_dew);

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      {/* Header: selector element + info global */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.06] bg-white/[0.015] flex-wrap">
        <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Element</span>
        <select
          value={clampedIdx}
          onChange={(e) => setIdx(parseInt(e.target.value))}
          className="text-xs bg-slate-900 border border-white/15 rounded px-2 py-1 text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 min-w-[200px]"
        >
          {viableElements.map((el, i) => (
            <option key={i} value={i}>
              {el.name || `Element ${i + 1}`} — {el.type || "?"} {el.orientation || ""}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono">
          <span className="text-white/50">U = <span className="text-white font-bold">{fmt(profile.U, 3)}</span> W/m²K</span>
          <span className="text-white/50">R = <span className="text-white font-bold">{fmt(profile.R_total, 3)}</span> m²K/W</span>
          <span className="text-white/50">Q = <span className="text-amber-300 font-bold">{fmt(profile.Q, 1)}</span> W/m²</span>
          <span className="text-white/50">d = <span className="text-white font-bold">{fmt(totalD, 0)}</span> mm</span>
        </div>
      </div>

      {/* SVG */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto max-w-[1100px]" style={{ maxHeight: "90%" }}>
          <defs>
            {layerRects.map(l => (
              <linearGradient key={`g-${l.idx}`} id={`layer-grad-${l.idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor={l.colorIn} />
                <stop offset="100%" stopColor={l.colorOut} />
              </linearGradient>
            ))}
            {/* Marker săgeată direcție flux */}
            <marker id="arrow-heat" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Etichete "Interior" / "Exterior" */}
          <text x={MARGIN.left - 10} y={MARGIN.top + PLOT_H / 2} textAnchor="end" fontSize="14" fill="#e2e8f0" fontWeight="600">
            🏠 Interior
          </text>
          <text x={MARGIN.left - 10} y={MARGIN.top + PLOT_H / 2 + 16} textAnchor="end" fontSize="11" fill="#94a3b8">
            {fmt(T_int, 1)}°C
          </text>
          <text x={MARGIN.left + PLOT_W + 10} y={MARGIN.top + PLOT_H / 2} textAnchor="start" fontSize="14" fill="#e2e8f0" fontWeight="600">
            ❄ Exterior
          </text>
          <text x={MARGIN.left + PLOT_W + 10} y={MARGIN.top + PLOT_H / 2 + 16} textAnchor="start" fontSize="11" fill="#94a3b8">
            {fmt(T_ext, 1)}°C
          </text>

          {/* Grup plot translated */}
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* Grila orizontală T (fiecare 5°C) */}
            {(() => {
              const ticks = [];
              const step = Math.abs(Tmax - Tmin) > 30 ? 10 : 5;
              for (let T = Math.ceil(Tmin / step) * step; T <= Tmax; T += step) {
                ticks.push(T);
              }
              return ticks.map(T => (
                <g key={T}>
                  <line x1={0} y1={yScale(T)} x2={PLOT_W} y2={yScale(T)}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
                  <text x={-6} y={yScale(T) + 3} textAnchor="end" fontSize="9" fill="#64748b">
                    {T}°
                  </text>
                </g>
              ));
            })()}

            {/* Straturi */}
            {layerRects.map(l => (
              <g key={l.idx}>
                <rect
                  x={l.x}
                  y={0}
                  width={l.w}
                  height={PLOT_H}
                  fill={l.fill}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                {/* Label strat (rotit dacă strat subțire) */}
                {l.w > 50 && l.material && (
                  <text
                    x={l.x + l.w / 2}
                    y={PLOT_H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#f1f5f9"
                    fontWeight="600"
                    className="select-none pointer-events-none"
                  >
                    <tspan x={l.x + l.w / 2} dy={0}>
                      {(l.material || "").length > 18 ? (l.material || "").slice(0, 16) + "…" : l.material}
                    </tspan>
                    <tspan x={l.x + l.w / 2} dy={12} fontSize="9" fill="#cbd5e1" fontWeight="400">
                      {fmt(l.thickness_mm, 0)} mm · λ={fmt(l.lambda, 3)}
                    </tspan>
                  </text>
                )}
                {/* Label scurt dacă strat subțire */}
                {l.w <= 50 && l.w > 10 && (
                  <text
                    x={l.x + l.w / 2}
                    y={PLOT_H - 8}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#f1f5f9"
                    transform={`rotate(-60, ${l.x + l.w / 2}, ${PLOT_H - 8})`}
                    className="select-none pointer-events-none"
                  >
                    {fmt(l.thickness_mm, 0)}mm
                  </text>
                )}
              </g>
            ))}

            {/* Linia punct de rouă */}
            <line x1={0} y1={dewY} x2={PLOT_W} y2={dewY}
                  stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
            <text x={PLOT_W - 6} y={dewY - 4} textAnchor="end" fontSize="10" fill="#38bdf8" fontWeight="600">
              T_rouă = {fmt(profile.T_dew, 1)}°C (φ={rhInt}%)
            </text>

            {/* Curba temperaturii */}
            <polyline
              points={tempPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinejoin="round"
              markerEnd="url(#arrow-heat)"
            />

            {/* Puncte pe interfețe */}
            {profile.nodes.map((n, i) => (
              <g key={i}>
                <circle cx={xScale(n.x_mm)} cy={yScale(n.T)} r="4" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
                <text
                  x={xScale(n.x_mm)}
                  y={yScale(n.T) - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#fef3c7"
                  fontWeight="600"
                  className="select-none pointer-events-none"
                >
                  {fmt(n.T, 1)}°
                </text>
              </g>
            ))}
          </g>

          {/* Axă X label */}
          <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">
            Grosime perete (mm) — flux termic →
          </text>
        </svg>
      </div>

      {/* Footer: alertă condens / info */}
      <div className="px-4 py-2 border-t border-white/[0.06] text-[11px]">
        {profile.condensRisk ? (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-semibold text-red-300">Risc condens pe suprafața interioară</div>
              <div className="text-red-200/80">
                T_suprafață interioară = {fmt(profile.nodes[0].T, 1)}°C &lt; T_rouă = {fmt(profile.T_dew, 1)}°C (la φ={rhInt}%).
                Recomandare: îmbunătățește izolația sau scade umiditatea interioară.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2">
            <span className="text-lg">✓</span>
            <div>
              <span className="font-semibold text-emerald-300">Fără risc condens</span>
              <span className="text-emerald-200/70 ml-2">
                T_suprafață int. ({fmt(profile.nodes[0].T, 1)}°C) &gt; T_rouă ({fmt(profile.T_dew, 1)}°C)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
