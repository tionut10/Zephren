/**
 * WallSection — vedere secțiune prin perete cu gradient temperaturi prin straturi.
 *
 * Îmbunătățiri v2:
 * - Gradient cromatic pe curba termică (albastru→roșu per T)
 * - Etichete noduri plasate alternant sus/jos cu collision detection width-aware
 * - Bandă dedicată sub diagramă pentru denumirile straturilor (fără text în interior)
 * - Tooltip hover cu detalii complete per strat
 * - Highlight activ pe stratul hoverat
 */
import { useMemo, useState } from "react";
import { computeWallProfile } from "../utils/sectionProfiler.js";
import { ELEMENT_TYPES_WIZARD } from "../../utils/wizardOpaqueCalc.js";

// ── Parametri vizuali ────────────────────────────────────────────────────────
const SVG_WIDTH  = 960;
const SVG_HEIGHT = 520;
const MARGIN = { top: 60, right: 90, bottom: 130, left: 90 };
const PLOT_W = SVG_WIDTH  - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_HEIGHT - MARGIN.top  - MARGIN.bottom;

const LABEL_ABOVE_H  = 44;
const LABEL_BELOW_H  = 44;
const CURVE_TOP      = LABEL_ABOVE_H;
const CURVE_BOTTOM   = PLOT_H - LABEL_BELOW_H;
const CURVE_H        = CURVE_BOTTOM - CURVE_TOP;

// Bandă denumiri straturi (în spațiul MARGIN.bottom, sub plot)
const LAYER_STRIP_GAP = 10;
const LAYER_STRIP_H   = 38;

// ── Utilitare ────────────────────────────────────────────────────────────────
function tempToColor(T, Tmin, Tmax) {
  if (!Number.isFinite(T)) return "#94a3b8";
  const t   = Math.max(0, Math.min(1, (T - Tmin) / (Tmax - Tmin)));
  const hue = 240 - 240 * t;
  return `hsl(${hue.toFixed(0)}, 78%, 55%)`;
}

function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function makeYScale(Tmin, Tmax) {
  return (T) => CURVE_BOTTOM - ((T - Tmin) / (Tmax - Tmin)) * CURVE_H;
}

// ── Collision detection width-aware pentru etichete T ────────────────────────
function estimateLabelW(T) {
  return `${T.toFixed(1)}°`.length * 7 + 10;
}

function assignLabelRows(nodes, xScale) {
  const rows = [[], []]; // [{left, right}]
  return nodes.map((n, i) => {
    const cx    = xScale(n.x_mm);
    const lw    = estimateLabelW(n.T);
    const left  = cx - lw / 2;
    const right = cx + lw / 2;

    for (const r of [i % 2, 1 - (i % 2)]) {
      const conflict = rows[r].some(e => !(right + 6 < e.left || left - 6 > e.right));
      if (!conflict) {
        rows[r].push({ left, right });
        return r;
      }
    }
    rows[i % 2].push({ left, right });
    return i % 2;
  });
}

export default function WallSection({
  opaqueElements = [],
  selectedElementIdx: externalIdx,
  onSelectIdx,
  climate = {},
  rhInt = 50,
  colorMode = "continuous",
}) {
  const viableElements = opaqueElements.filter(
    e => Array.isArray(e.layers) && e.layers.length > 0
  );

  const [internalIdx,      setInternalIdx]      = useState(0);
  const [hoveredLayerIdx,  setHoveredLayerIdx]  = useState(null);

  const idx        = Number.isInteger(externalIdx) ? externalIdx : internalIdx;
  const clampedIdx = Math.max(0, Math.min(viableElements.length - 1, idx));
  const element    = viableElements[clampedIdx];

  const setIdx = (newIdx) => {
    if (onSelectIdx) onSelectIdx(newIdx);
    setInternalIdx(newIdx);
  };

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
      order: "exterior-first",
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

  const totalD = profile.totalThickness_mm || 1;
  const xScale = (mm) => (mm / totalD) * PLOT_W;

  const Tmin   = Math.floor(Math.min(T_ext, profile.T_dew) - 2);
  const Tmax   = Math.ceil(T_int + 2);
  const yScale = makeYScale(Tmin, Tmax);

  // ── Straturi ────────────────────────────────────────────────────────────────
  const layerRects = [];
  for (let i = 0; i < profile.nodes.length - 1; i++) {
    const a = profile.nodes[i];
    const b = profile.nodes[i + 1];
    if (b.kind !== "interface" && b.kind !== "surface") continue;
    const x = xScale(a.x_mm);
    const w = xScale(b.x_mm) - xScale(a.x_mm);
    if (w <= 0) continue;
    layerRects.push({
      x, w,
      fill:         `url(#lgrad-${i})`,
      colorIn:      tempToColor(a.T, Tmin, Tmax),
      colorOut:     tempToColor(b.T, Tmin, Tmax),
      material:     b.material,
      thickness_mm: b.thickness_mm,
      lambda:       b.lambda,
      R_layer:      b.R_layer,
      T_a: a.T, T_b: b.T,
      idx: i,
    });
  }

  // ── Curba temperaturii ───────────────────────────────────────────────────────
  const tempPath = profile.nodes
    .map(n => `${xScale(n.x_mm).toFixed(1)},${yScale(n.T).toFixed(1)}`)
    .join(" ");

  // ── Etichete T cu alternare width-aware ──────────────────────────────────────
  const labelRows = assignLabelRows(profile.nodes, xScale);

  const dewY = yScale(profile.T_dew);

  // ── Grilă T ─────────────────────────────────────────────────────────────────
  const gridStep = Math.abs(Tmax - Tmin) > 30 ? 10 : 5;
  const gridTicks = [];
  for (let T = Math.ceil(Tmin / gridStep) * gridStep; T <= Tmax; T += gridStep) {
    gridTicks.push(T);
  }

  // ── Tooltip hover ────────────────────────────────────────────────────────────
  const hl   = hoveredLayerIdx !== null ? layerRects[hoveredLayerIdx] : null;
  const ttW  = 196;
  const ttH  = 78;
  const ttX  = hl
    ? Math.max(2, Math.min(hl.x + hl.w / 2 - ttW / 2, PLOT_W - ttW - 2))
    : 0;
  const ttY  = hl ? CURVE_TOP + 6 : 0;

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      {/* Header selector element */}
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

      {/* SVG principal */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto max-w-[1100px]"
          style={{ maxHeight: "92%" }}
        >
          <defs>
            {/* Gradienți straturi */}
            {layerRects.map(l => (
              <linearGradient key={`g-${l.idx}`} id={`lgrad-${l.idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor={l.colorIn}  />
                <stop offset="100%" stopColor={l.colorOut} />
              </linearGradient>
            ))}

            {/* Gradient cromatic pe curba termică — multi-stop X-based, în spațiul local al grupului */}
            <linearGradient id="thermo-line-grad" x1="0" y1="0" x2={PLOT_W} y2="0"
                            gradientUnits="userSpaceOnUse">
              {profile.nodes.map((n, i) => (
                <stop
                  key={i}
                  offset={`${(xScale(n.x_mm) / PLOT_W * 100).toFixed(1)}%`}
                  stopColor={tempToColor(n.T, Tmin, Tmax)}
                />
              ))}
            </linearGradient>

            {/* Marker săgeată flux */}
            <marker id="arrow-heat" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24" />
            </marker>
          </defs>

          {/* ── Casete INT / EXT ──────────────────────────────────────────── */}
          <g transform={`translate(${MARGIN.left - 12}, ${MARGIN.top + CURVE_TOP + CURVE_H / 2})`}>
            <rect x={-72} y={-26} width={72} height={52} rx="6"
                  fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            <text textAnchor="middle" x={-36} y={-8}  fontSize="12" fill="#6ee7b7" fontWeight="700">🏠 INT</text>
            <text textAnchor="middle" x={-36} y={8}   fontSize="11" fill="#a7f3d0" fontFamily="monospace">{fmt(T_int, 1)}°C</text>
            <text textAnchor="middle" x={-36} y={22}  fontSize="9"  fill="#6ee7b7" opacity="0.7">Rsi={fmt(Rsi, 3)}</text>
          </g>
          <g transform={`translate(${MARGIN.left + PLOT_W + 12}, ${MARGIN.top + CURVE_TOP + CURVE_H / 2})`}>
            <rect x={0} y={-26} width={72} height={52} rx="6"
                  fill="rgba(96,165,250,0.08)" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
            <text textAnchor="middle" x={36} y={-8}  fontSize="12" fill="#93c5fd" fontWeight="700">❄ EXT</text>
            <text textAnchor="middle" x={36} y={8}   fontSize="11" fill="#bfdbfe" fontFamily="monospace">{fmt(T_ext, 1)}°C</text>
            <text textAnchor="middle" x={36} y={22}  fontSize="9"  fill="#93c5fd" opacity="0.7">Rse={fmt(Rse, 3)}</text>
          </g>

          {/* ── Grup plot principal ───────────────────────────────────────── */}
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>

            {/* Zone rezervate etichete T */}
            <rect x={0} y={0} width={PLOT_W} height={CURVE_TOP - 4}
                  fill="rgba(255,255,255,0.012)" rx="3" />
            <rect x={0} y={CURVE_BOTTOM + 4} width={PLOT_W} height={LABEL_BELOW_H - 8}
                  fill="rgba(255,255,255,0.012)" rx="3" />

            {/* Grilă T orizontală */}
            {gridTicks.map(T => (
              <g key={T}>
                <line x1={0} y1={yScale(T)} x2={PLOT_W} y2={yScale(T)}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 5" />
                <text x={-8} y={yScale(T) + 3.5} textAnchor="end" fontSize="9"
                      fill="#64748b" fontFamily="monospace">{T}°</text>
              </g>
            ))}

            {/* Separatori zonă curbă */}
            <line x1={0} y1={CURVE_TOP}    x2={PLOT_W} y2={CURVE_TOP}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="1 4" />
            <line x1={0} y1={CURVE_BOTTOM} x2={PLOT_W} y2={CURVE_BOTTOM}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="1 4" />

            {/* ── Straturi — fără text în interior ─────────────────────── */}
            {layerRects.map((l, li) => (
              <rect
                key={l.idx}
                x={l.x} y={CURVE_TOP} width={l.w} height={CURVE_H}
                fill={l.fill}
                stroke={hoveredLayerIdx === li
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.18)"}
                strokeWidth={hoveredLayerIdx === li ? 2 : 1}
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredLayerIdx(li)}
                onMouseLeave={() => setHoveredLayerIdx(null)}
              />
            ))}

            {/* ── Linie punct de rouă ───────────────────────────────────── */}
            <line x1={0} y1={dewY} x2={PLOT_W} y2={dewY}
                  stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
            <rect x={PLOT_W - 166} y={dewY - 16} width={164} height={15}
                  rx="3" fill="rgba(2,6,23,0.8)" />
            <text x={PLOT_W - 8} y={dewY - 4} textAnchor="end" fontSize="10"
                  fill="#38bdf8" fontWeight="600">
              T_rouă = {fmt(profile.T_dew, 1)}°C  (φ={rhInt}%)
            </text>

            {/* ── Curba termică — shadow + gradient cromatic ────────────── */}
            <polyline points={tempPath} fill="none"
                      stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinejoin="round" />
            {/* Linia principală cu gradient temperatură */}
            <polyline points={tempPath} fill="none"
                      stroke="url(#thermo-line-grad)" strokeWidth="3"
                      strokeLinejoin="round" />
            {/* Polyline invizibil doar pentru săgeată la capăt */}
            <polyline points={tempPath} fill="none"
                      stroke="transparent" strokeWidth="1"
                      markerEnd="url(#arrow-heat)" />

            {/* ── Etichete T cu leader-lines (sus/jos width-aware) ─────── */}
            {profile.nodes.map((n, i) => {
              const cx    = xScale(n.x_mm);
              const cy    = yScale(n.T);
              const row   = labelRows[i];
              const boxH  = 17;
              const label = `${fmt(n.T, 1)}°`;
              const labelW = label.length * 7 + 6;
              const color  = tempToColor(n.T, Tmin, Tmax);

              const labelY     = row === 0 ? CURVE_TOP - 8 - boxH : CURVE_BOTTOM + 8;
              const leaderEndY = row === 0 ? cy - 4 : cy + 4;

              return (
                <g key={i} className="select-none pointer-events-none">
                  {/* Punct pe interfață */}
                  <circle cx={cx} cy={cy} r="4.5" fill={color} stroke="#0f172a" strokeWidth="1.5" />
                  {/* Leader-line verticală */}
                  <line
                    x1={cx} y1={leaderEndY}
                    x2={cx} y2={row === 0 ? labelY + boxH : labelY}
                    stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.55"
                  />
                  {/* Box etichetă */}
                  <rect x={cx - labelW / 2} y={labelY}
                        width={labelW} height={boxH} rx="3"
                        fill="rgba(2,6,23,0.9)" stroke={color} strokeWidth="1" />
                  <text x={cx} y={labelY + boxH - 4} textAnchor="middle"
                        fontSize="10" fill={color} fontWeight="700" fontFamily="monospace">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* ── Tooltip hover strat ────────────────────────────────────── */}
            {hl && (
              <g className="pointer-events-none select-none">
                {/* Overlay highlight pe strat */}
                <rect x={hl.x} y={CURVE_TOP} width={hl.w} height={CURVE_H}
                      fill="rgba(255,255,255,0.07)" />
                {/* Box tooltip */}
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6"
                      fill="rgba(2,6,23,0.95)"
                      stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                {/* Titlu material */}
                <text x={ttX + 10} y={ttY + 18} fontSize="11" fill="#f1f5f9" fontWeight="700">
                  {(hl.material || "").length > 26
                    ? (hl.material || "").slice(0, 24) + "…"
                    : (hl.material || "—")}
                </text>
                {/* Grosime + conductivitate */}
                <text x={ttX + 10} y={ttY + 34} fontSize="10" fill="#94a3b8" fontFamily="monospace">
                  {fmt(hl.thickness_mm, 0)} mm · λ = {fmt(hl.lambda, 3)} W/mK
                </text>
                {/* Rezistență termică */}
                <text x={ttX + 10} y={ttY + 50} fontSize="10" fill="#94a3b8" fontFamily="monospace">
                  R = {fmt(hl.R_layer, 3)} m²K/W
                </text>
                {/* Interval temperatură */}
                <text x={ttX + 10} y={ttY + 66} fontSize="10" fill="#cbd5e1" fontFamily="monospace">
                  T: {fmt(hl.T_a, 1)}° → {fmt(hl.T_b, 1)}°C
                </text>
              </g>
            )}

            {/* ── Indicator flux termic ──────────────────────────────────── */}
            <g transform={`translate(${PLOT_W / 2}, ${PLOT_H - 6})`}>
              <rect x={-96} y={-14} width={192} height={16} rx="3"
                    fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <text textAnchor="middle" x={0} y={-1} fontSize="10" fill="#fcd34d">
                ← flux termic  Q = {fmt(profile.Q, 1)} W/m²  (INT → EXT)
              </text>
            </g>
          </g>

          {/* ── Bandă denumiri straturi — sub diagramă ───────────────────── */}
          {layerRects.map((l, li) => {
            const svgX     = MARGIN.left + l.x;
            const svgY     = MARGIN.top + PLOT_H + LAYER_STRIP_GAP;
            const maxChars = Math.max(4, Math.floor(l.w / 7));
            const name     = (l.material || "").length > maxChars
              ? (l.material || "").slice(0, maxChars - 1) + "…"
              : (l.material || "");
            const isHov    = hoveredLayerIdx === li;

            return (
              <g
                key={`strip-${l.idx}`}
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredLayerIdx(li)}
                onMouseLeave={() => setHoveredLayerIdx(null)}
              >
                {/* Linie conector din baza plot-ului */}
                <line
                  x1={svgX + l.w / 2} y1={MARGIN.top + PLOT_H}
                  x2={svgX + l.w / 2} y2={svgY}
                  stroke={isHov ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}
                  strokeWidth="1" strokeDasharray="2 3"
                />
                {/* Coloană strat */}
                <rect
                  x={svgX} y={svgY} width={l.w} height={LAYER_STRIP_H} rx="3"
                  fill={isHov ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.025)"}
                  stroke={isHov ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}
                  strokeWidth="1"
                />
                {/* Număr strat */}
                <text x={svgX + 5} y={svgY + 13} fontSize="8" fill="#64748b" fontWeight="700">
                  {li + 1}
                </text>
                {/* Denumire material (trunchiat) */}
                {l.w > 22 && (
                  <text
                    x={svgX + l.w / 2} y={svgY + 16}
                    textAnchor="middle" fontSize="9"
                    fill={isHov ? "#e2e8f0" : "#94a3b8"}
                  >
                    {name}
                  </text>
                )}
                {/* Grosime în mm */}
                {l.w > 32 && (
                  <text
                    x={svgX + l.w / 2} y={svgY + 30}
                    textAnchor="middle" fontSize="8"
                    fill={isHov ? "#64748b" : "#475569"}
                    fontFamily="monospace"
                  >
                    {fmt(l.thickness_mm, 0)} mm
                  </text>
                )}
              </g>
            );
          })}

          {/* Axă X label */}
          <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 8} textAnchor="middle" fontSize="11" fill="#64748b">
            Compoziție strat (mm) · ISO 6946:2017 — hover pe strat pentru detalii
          </text>
        </svg>
      </div>

      {/* Footer alertă condens */}
      <div className="px-4 py-2 border-t border-white/[0.06] text-[11px]">
        {profile.condensRisk ? (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-semibold text-red-300">Risc condens pe suprafața interioară</div>
              <div className="text-red-200/80">
                T_suprafață int. = {fmt(profile.nodes[0].T, 1)}°C &lt; T_rouă = {fmt(profile.T_dew, 1)}°C (φ={rhInt}%).
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
