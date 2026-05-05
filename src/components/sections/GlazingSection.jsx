/**
 * GlazingSection.jsx v2 — Secțiune vitrată redesignată complet.
 * Fundal ALB pentru zona principală, etichete orizontale (fără rotație),
 * bandă flux termic sus, zone dimensionale jos.
 */

import { useMemo } from "react";
import { MaterialLegend } from "./primitives.jsx";

const GLAZING_CONFIGS = {
  "Simplu vitraj":              { panes: 1, gap: 0, gap_mm: 0,  gas: "gas_air",     lowE: false, u: 5.80, g: 0.85 },
  "Dublu vitraj (4-12-4)":      { panes: 2, gap: 1, gap_mm: 12, gas: "gas_air",     lowE: false, u: 2.80, g: 0.75 },
  "Dublu vitraj termoizolant":  { panes: 2, gap: 1, gap_mm: 16, gas: "gas_argon",   lowE: false, u: 1.60, g: 0.65 },
  "Dublu vitraj Low-E":         { panes: 2, gap: 1, gap_mm: 16, gas: "gas_argon",   lowE: true,  lowEFace: 2, u: 1.10, g: 0.50 },
  "Triplu vitraj":              { panes: 3, gap: 2, gap_mm: 12, gas: "gas_argon",   lowE: false, u: 0.90, g: 0.50 },
  "Triplu vitraj Low-E":        { panes: 3, gap: 2, gap_mm: 14, gas: "gas_argon",   lowE: true,  lowEFace: 3, u: 0.70, g: 0.45 },
  "Triplu vitraj 2×Low-E":      { panes: 3, gap: 2, gap_mm: 14, gas: "gas_krypton", lowE: true,  lowEFace: 2, lowEFace2: 5, u: 0.50, g: 0.40 },
};

const FRAME_CONFIGS = {
  "PVC (5 camere)":    { cat: "pvc",   uf: 1.30, label: "PVC (5 camere)"      },
  "PVC (6-7 camere)":  { cat: "pvc",   uf: 1.10, label: "PVC (6-7 camere)"    },
  "Lemn stratificat":  { cat: "wood",  uf: 1.40, label: "Lemn stratificat"     },
  "Aluminiu fără RPT": { cat: "metal", uf: 5.00, label: "Aluminiu (fără RPT)" },
  "Aluminiu cu RPT":   { cat: "metal", uf: 2.00, label: "Aluminiu (cu RPT)"   },
  "Lemn-aluminiu":     { cat: "wood",  uf: 1.20, label: "Lemn-aluminiu"        },
};

function dimLine(x1, x2, y, label, sublabel, color = "#94a3b8", textColor = "#e2e8f0") {
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1.5" />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke={color} strokeWidth="1.5" />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} stroke={color} strokeWidth="1.5" />
      <text x={mx} y={y + 14} fontSize="10" textAnchor="middle" fill={textColor} fontWeight="700">{label}</text>
      {sublabel && <text x={mx} y={y + 25} fontSize="7.5" textAnchor="middle" fill="#64748b">{sublabel}</text>}
    </g>
  );
}

function ElevationIcon({ x = 4, y = 4 }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
      <rect width="62" height="46" rx="4" fill="rgba(255,255,255,0.96)" stroke="#94a3b8" strokeWidth="0.8" />
      <rect x="7" y="8" width="48" height="30" fill="#dbeafe" stroke="#64748b" strokeWidth="0.8" />
      <line x1="31" y1="8" x2="31" y2="38" stroke="#64748b" strokeWidth="0.6" />
      <line x1="7" y1="23" x2="55" y2="23" stroke="#64748b" strokeWidth="0.6" />
      <line x1="3" y1="23" x2="59" y2="23" stroke="#ef4444" strokeWidth="1" strokeDasharray="2.5 1.5" />
      <text x="31" y="5.5" fontSize="5" textAnchor="middle" fill="#475569" fontWeight="600">elevație</text>
      <text x="57" y="26" fontSize="6" fill="#ef4444" fontWeight="800">A–A</text>
    </g>
  );
}

export default function GlazingSection({
  element,
  width = 720,
  height = 400,
  compact = false,
  showLegend = true,
  showDimensions = true,
  onClickExpand,
}) {
  const uid = useMemo(() => `glz${Math.random().toString(36).slice(2, 7)}`, []);

  if (!element) {
    return <div className="p-6 text-center text-xs opacity-50">Element vitrat lipsă.</div>;
  }

  const config = GLAZING_CONFIGS[element.glazingType] || GLAZING_CONFIGS["Dublu vitraj termoizolant"];
  const frame  = FRAME_CONFIGS[element.frameType]    || FRAME_CONFIGS["PVC (5 camere)"];

  const uTotal    = parseFloat(element.u)      || config.u;
  const uFrame    = parseFloat(element.uFrame) || frame.uf;
  const gVal      = parseFloat(element.g)      || config.g;
  const isWarmEdge = /warm|plastic/i.test(element.spacerType || "");

  // ── Layout horizontal (px absolut) ──────────────────────────────────────
  const EXT_BAND = 52;   // bandă EXTERIOR
  const WALL_W   = 26;   // context perete
  const FRAME_W  = 128;  // ramă (reprezintă 70mm real)
  const SASH_W   = 20;   // cercevea

  // Lățime pachet sticlă: pane min 22px, gaz min 72px
  const PANE_PX  = 22;
  const GAS_PX   = config.gap > 0 ? Math.max(72, config.gap_mm * 4.5) : 0;
  const PKG_W    = config.panes * PANE_PX + config.gap * GAS_PX;

  const usedW = 2 * EXT_BAND + 2 * WALL_W + 2 * FRAME_W + 2 * SASH_W + PKG_W;
  const ofs   = Math.max(8, (width - usedW) / 2);

  const xExtBand  = ofs;
  const xWallExt  = xExtBand  + EXT_BAND;
  const xFrameExt = xWallExt  + WALL_W;
  const xSashExt  = xFrameExt + FRAME_W;
  const xPkgStart = xSashExt  + SASH_W;
  const xPkgEnd   = xPkgStart + PKG_W;
  const xSashInt  = xPkgEnd;
  const xFrameInt = xSashInt  + SASH_W;
  const xWallInt  = xFrameInt + FRAME_W;
  const xIntBand  = xWallInt  + WALL_W;

  // ── Layout vertical ──────────────────────────────────────────────────────
  const FLUX_H   = compact ? 0  : 44;
  const DIM_H    = compact ? 0  : 66;
  const MAIN_Y   = FLUX_H;
  const MAIN_H   = height - FLUX_H - DIM_H;
  const SPACER_H = compact ? 0  : 22;
  const glassY   = MAIN_Y + SPACER_H;
  const glassH   = MAIN_H - 2 * SPACER_H;
  const midY     = MAIN_Y + MAIN_H / 2;
  const dimY     = MAIN_Y + MAIN_H;

  // ── Elemente pachet ──────────────────────────────────────────────────────
  const pkgElems = [];
  let cx = xPkgStart;
  for (let i = 0; i < config.panes; i++) {
    pkgElems.push({ type: "glass", x: cx, w: PANE_PX, idx: i });
    cx += PANE_PX;
    if (i < config.panes - 1) {
      pkgElems.push({ type: "gas", x: cx, w: GAS_PX, gas: config.gas, idx: i });
      cx += GAS_PX;
    }
  }

  // ── Poziții Low-E ────────────────────────────────────────────────────────
  const lowEFaces = [];
  if (config.lowE) {
    let xw = xPkgStart, fi = 1;
    const fp = {};
    pkgElems.forEach(e => {
      if (e.type === "glass") { fp[fi] = xw; fp[fi + 1] = xw + e.w; fi += 2; xw += e.w; }
      else xw += e.w;
    });
    if (config.lowEFace  && fp[config.lowEFace]  != null) lowEFaces.push({ x: fp[config.lowEFace],  face: config.lowEFace  });
    if (config.lowEFace2 && fp[config.lowEFace2] != null) lowEFaces.push({ x: fp[config.lowEFace2], face: config.lowEFace2 });
  }

  // ── Fill ramă după material ──────────────────────────────────────────────
  const frameFill   = frame.cat === "wood" ? `url(#${uid}-fw)` : frame.cat === "metal" ? `url(#${uid}-fm)` : `url(#${uid}-fp)`;
  const frameStroke = frame.cat === "metal" ? "#64748b" : "#6b7280";
  const fExtCX = xFrameExt + FRAME_W / 2;
  const fIntCX = xFrameInt + FRAME_W / 2;
  const pkgCX  = xPkgStart + PKG_W / 2;
  const totalPkgMM = config.panes * 4 + config.gap * config.gap_mm;

  return (
    <div className={compact ? "" : "space-y-3"}>
      {/* ── Header metrici ── */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          {[
            { label: "Uw total",  val: `${uTotal.toFixed(2)} W/m²K`, accent: true },
            { label: "Ug sticlă", val: `${config.u.toFixed(2)}` },
            { label: "Uf ramă",   val: `${uFrame.toFixed(2)}` },
            { label: "g (SHGC)",  val: gVal.toFixed(2) },
          ].map(({ label, val, accent }) => (
            <div key={label} className={`p-2 rounded-lg ${accent ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.03]"}`}>
              <div className={`font-mono font-bold text-sm ${accent ? "text-amber-400" : ""}`}>{val}</div>
              <div className="text-[9px] opacity-50 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── SVG ── */}
      <div
        className={compact ? "" : "rounded-xl overflow-hidden border border-slate-600/40"}
        onClick={onClickExpand}
        style={{ cursor: onClickExpand ? "pointer" : "default" }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
          <defs>
            {/* Ramă PVC — hașură diagonală gri */}
            <pattern id={`${uid}-fp`} patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill="#dde3ea" />
              <line x1="0" y1="10" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.2" />
            </pattern>
            {/* Ramă lemn — fibre */}
            <pattern id={`${uid}-fw`} patternUnits="userSpaceOnUse" width="10" height="12">
              <rect width="10" height="12" fill="#d4a86a" />
              <line x1="2.5" y1="0" x2="2.5" y2="12" stroke="#a07843" strokeWidth="0.8" />
              <line x1="6" y1="0" x2="6" y2="12" stroke="#8d6b3a" strokeWidth="0.6" />
            </pattern>
            {/* Ramă metal — gradient */}
            <linearGradient id={`${uid}-fm`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#b0b7c0" />
              <stop offset="45%"  stopColor="#e8eaec" />
              <stop offset="100%" stopColor="#9ea4ab" />
            </linearGradient>
            {/* Sticlă — gradient orizontal cu reflexie */}
            <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#60a5fa" />
              <stop offset="30%"  stopColor="#bfdbfe" />
              <stop offset="65%"  stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            {/* Argon dots */}
            <pattern id={`${uid}-ar`} patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#e0f2fe" />
              <circle cx="5"  cy="5"  r="1.8" fill="#7dd3fc" opacity="0.5" />
              <circle cx="15" cy="14" r="1.4" fill="#38bdf8" opacity="0.4" />
              <circle cx="16" cy="4"  r="1"   fill="#7dd3fc" opacity="0.35" />
              <circle cx="4"  cy="16" r="0.9" fill="#38bdf8" opacity="0.3" />
            </pattern>
            {/* Krypton dots */}
            <pattern id={`${uid}-kr`} patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#e0e7ff" />
              <circle cx="5"  cy="5"  r="1.8" fill="#a5b4fc" opacity="0.5" />
              <circle cx="15" cy="14" r="1.4" fill="#818cf8" opacity="0.4" />
            </pattern>
            {/* Aer dots */}
            <pattern id={`${uid}-air`} patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#f0f9ff" />
              <circle cx="5"  cy="8"  r="1.2" fill="#bae6fd" opacity="0.5" />
              <circle cx="14" cy="5"  r="1"   fill="#bae6fd" opacity="0.4" />
              <circle cx="10" cy="15" r="1.1" fill="#bae6fd" opacity="0.35" />
            </pattern>
            {/* Distanțier Al */}
            <linearGradient id={`${uid}-sal`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            {/* Distanțier warm edge */}
            <linearGradient id={`${uid}-swm`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            {/* Low-E */}
            <linearGradient id={`${uid}-lowe`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.1" />
              <stop offset="25%"  stopColor="#fbbf24" stopOpacity="0.95" />
              <stop offset="75%"  stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
            </linearGradient>
            {/* Marker săgeată flux */}
            <marker id={`${uid}-arr`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
            </marker>
          </defs>

          {/* ══ FLUX TERMIC STRIP ══ */}
          {!compact && (
            <g>
              <rect x="0" y="0" width={width} height={FLUX_H} fill="#160303" />
              <rect x="0" y={FLUX_H - 1} width={width} height="2" fill="#7f1d1d" opacity="0.6" />
              <line
                x1={xFrameInt + FRAME_W * 0.55} y1={FLUX_H / 2}
                x2={xFrameExt + FRAME_W * 0.45} y2={FLUX_H / 2}
                stroke="#f87171" strokeWidth="4" markerEnd={`url(#${uid}-arr)`}
              />
              <text x={pkgCX} y={FLUX_H / 2 - 7} fontSize="11.5" textAnchor="middle" fill="#fca5a5" fontWeight="800">
                Flux termic iarnă: INT → EXT
              </text>
              <text x={pkgCX} y={FLUX_H / 2 + 9} fontSize="8" textAnchor="middle" fill="#fca5a5" opacity="0.7">
                energia termică migrează din interior spre exterior prin vitraj
              </text>
            </g>
          )}

          {/* ══ ZONA PRINCIPALĂ — fundal ALB ══ */}
          <rect x="0" y={MAIN_Y} width={width} height={MAIN_H} fill="#f8fafc" />

          {/* Banda EXTERIOR */}
          <rect x={xExtBand} y={MAIN_Y} width={EXT_BAND} height={MAIN_H} fill="#dbeafe" />
          <line x1={xWallExt} y1={MAIN_Y} x2={xWallExt} y2={MAIN_Y + MAIN_H} stroke="#93c5fd" strokeWidth="1.5" />
          {!compact && (
            <text x={xExtBand + EXT_BAND / 2} y={midY} fontSize="12" textAnchor="middle"
              fill="#1d4ed8" fontWeight="800"
              transform={`rotate(-90,${xExtBand + EXT_BAND / 2},${midY})`}>
              EXTERIOR
            </text>
          )}

          {/* Banda INTERIOR */}
          <rect x={xIntBand} y={MAIN_Y} width={EXT_BAND} height={MAIN_H} fill="#fef9c3" />
          <line x1={xIntBand} y1={MAIN_Y} x2={xIntBand} y2={MAIN_Y + MAIN_H} stroke="#fcd34d" strokeWidth="1.5" />
          {!compact && (
            <text x={xIntBand + EXT_BAND / 2} y={midY} fontSize="12" textAnchor="middle"
              fill="#92400e" fontWeight="800"
              transform={`rotate(90,${xIntBand + EXT_BAND / 2},${midY})`}>
              INTERIOR
            </text>
          )}

          {/* Context perete EXT */}
          <rect x={xWallExt} y={MAIN_Y} width={WALL_W} height={MAIN_H} fill="#e7d5c0" opacity="0.65" />
          {!compact && (
            <>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + 16} fontSize="7" textAnchor="middle" fill="#92400e" opacity="0.8">▲</text>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + 25} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + MAIN_H - 8} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + MAIN_H - 0} fontSize="7" textAnchor="middle" fill="#92400e" opacity="0.8">▼</text>
            </>
          )}

          {/* Context perete INT */}
          <rect x={xWallInt} y={MAIN_Y} width={WALL_W} height={MAIN_H} fill="#e7d5c0" opacity="0.65" />
          {!compact && (
            <>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + 16} fontSize="7" textAnchor="middle" fill="#92400e" opacity="0.8">▲</text>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + 25} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + MAIN_H - 8} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
            </>
          )}

          {/* ── RAMĂ EXT ── */}
          <rect x={xFrameExt} y={MAIN_Y} width={FRAME_W} height={MAIN_H} fill={frameFill} stroke={frameStroke} strokeWidth="1.5" />
          {/* Cercevea EXT */}
          <rect x={xSashExt - 14} y={MAIN_Y + 10} width={SASH_W + 14} height={MAIN_H - 20}
            fill={frameFill} stroke={frameStroke} strokeWidth="1" opacity="0.85" />
          {/* Label Ramă EXT */}
          {!compact && (
            <>
              <rect x={fExtCX - 52} y={midY - 26} width="104" height="50" rx="6"
                fill="rgba(255,255,255,0.93)" stroke="#94a3b8" strokeWidth="1" />
              <text x={fExtCX} y={midY - 10} fontSize="11" textAnchor="middle" fontWeight="800" fill="#0f172a">Ramă EXT</text>
              <text x={fExtCX} y={midY + 4}  fontSize="8.5" textAnchor="middle" fill="#475569">{frame.label}</text>
              <text x={fExtCX} y={midY + 17} fontSize="9"   textAnchor="middle" fill="#dc2626" fontWeight="700">Uf = {uFrame.toFixed(2)} W/m²K</text>
            </>
          )}

          {/* ── RAMĂ INT ── */}
          <rect x={xFrameInt} y={MAIN_Y} width={FRAME_W} height={MAIN_H} fill={frameFill} stroke={frameStroke} strokeWidth="1.5" />
          {/* Cercevea INT */}
          <rect x={xSashInt} y={MAIN_Y + 10} width={SASH_W + 14} height={MAIN_H - 20}
            fill={frameFill} stroke={frameStroke} strokeWidth="1" opacity="0.85" />
          {/* Label Ramă INT */}
          {!compact && (
            <>
              <rect x={fIntCX - 52} y={midY - 26} width="104" height="50" rx="6"
                fill="rgba(255,255,255,0.93)" stroke="#94a3b8" strokeWidth="1" />
              <text x={fIntCX} y={midY - 10} fontSize="11" textAnchor="middle" fontWeight="800" fill="#0f172a">Ramă INT</text>
              <text x={fIntCX} y={midY + 4}  fontSize="8.5" textAnchor="middle" fill="#475569">{frame.label}</text>
              <text x={fIntCX} y={midY + 17} fontSize="9"   textAnchor="middle" fill="#dc2626" fontWeight="700">Uf = {uFrame.toFixed(2)} W/m²K</text>
            </>
          )}

          {/* Contur fereastră (dashed) */}
          <rect x={xFrameExt - 2} y={MAIN_Y + 1}
            width={xFrameInt + FRAME_W - xFrameExt + 4} height={MAIN_H - 2}
            fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 4" rx="3" opacity="0.5" />

          {/* ── DISTANȚIER SUS ── */}
          <rect x={xPkgStart} y={MAIN_Y} width={PKG_W} height={SPACER_H}
            fill={isWarmEdge ? `url(#${uid}-swm)` : `url(#${uid}-sal)`}
            stroke={isWarmEdge ? "#92400e" : "#475569"} strokeWidth="1" />
          {!compact && (
            <text x={pkgCX} y={MAIN_Y + SPACER_H / 2 + 4} fontSize="8.5"
              textAnchor="middle" fontWeight="700" fill="white"
              style={{ paintOrder: "stroke", stroke: isWarmEdge ? "#92400e" : "#1e293b", strokeWidth: "2px" }}>
              {isWarmEdge ? "Warm edge (TGI)" : "Distanțier Al · Ψg ≈ 0.08"}
            </text>
          )}

          {/* ── DISTANȚIER JOS ── */}
          <rect x={xPkgStart} y={MAIN_Y + MAIN_H - SPACER_H} width={PKG_W} height={SPACER_H}
            fill={isWarmEdge ? `url(#${uid}-swm)` : `url(#${uid}-sal)`}
            stroke={isWarmEdge ? "#92400e" : "#475569"} strokeWidth="1" />

          {/* ── PACHETE STICLĂ ── */}
          {pkgElems.map((e, i) => {
            if (e.type === "glass") {
              return (
                <g key={i}>
                  <rect x={e.x} y={glassY} width={e.w} height={glassH}
                    fill={`url(#${uid}-gl)`} stroke="#1d4ed8" strokeWidth="2.5" />
                  {/* Reflexie */}
                  <rect x={e.x + e.w * 0.22} y={glassY + 8} width={e.w * 0.18} height={glassH - 16}
                    fill="white" opacity="0.5" rx="1" />
                  {/* Numere față — plasate în zona de sticlă, sub distanțier */}
                  {!compact && (
                    <>
                      <circle cx={e.x} cy={glassY + 13} r="8" fill="#1e40af" stroke="white" strokeWidth="1.5" />
                      <text x={e.x} y={glassY + 16.5} fontSize="9" textAnchor="middle" fill="white" fontWeight="900">
                        {e.idx * 2 + 1}
                      </text>
                      <circle cx={e.x + e.w} cy={glassY + 13} r="8" fill="#1e40af" stroke="white" strokeWidth="1.5" />
                      <text x={e.x + e.w} y={glassY + 16.5} fontSize="9" textAnchor="middle" fill="white" fontWeight="900">
                        {e.idx * 2 + 2}
                      </text>
                    </>
                  )}
                </g>
              );
            } else {
              const gasPat = e.gas === "gas_argon" ? `${uid}-ar` : e.gas === "gas_krypton" ? `${uid}-kr` : `${uid}-air`;
              const gasName = e.gas === "gas_argon" ? "Ar" : e.gas === "gas_krypton" ? "Kr" : "Aer";
              const gw = e.x + e.w / 2;
              return (
                <g key={i}>
                  <rect x={e.x} y={glassY} width={e.w} height={glassH}
                    fill={`url(#${gasPat})`} stroke="#7dd3fc" strokeWidth="0.5" strokeDasharray="5 3" />
                  {!compact && (
                    <>
                      <text x={gw} y={midY - 12} fontSize="26" textAnchor="middle" fontWeight="900"
                        fill="#1e40af" style={{ paintOrder: "stroke", stroke: "rgba(224,242,254,0.95)", strokeWidth: "4px" }}>
                        {gasName}
                      </text>
                      <text x={gw} y={midY + 12} fontSize="13" textAnchor="middle" fill="#2563eb" fontWeight="700"
                        style={{ paintOrder: "stroke", stroke: "rgba(224,242,254,0.95)", strokeWidth: "3px" }}>
                        {config.gap_mm} mm
                      </text>
                    </>
                  )}
                </g>
              );
            }
          })}

          {/* ── LOW-E ── */}
          {lowEFaces.map((pos, i) => (
            <g key={`lowe-${i}`}>
              <rect x={pos.x - 3} y={glassY} width="6" height={glassH}
                fill={`url(#${uid}-lowe)`} opacity="0.95" />
              {!compact && (
                <>
                  <line x1={pos.x} y1={glassY - 2} x2={pos.x} y2={glassY - 18}
                    stroke="#d97706" strokeWidth="1.5" />
                  <rect x={pos.x - 42} y={glassY - 32} width="84" height="16" rx="4"
                    fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
                  <text x={pos.x} y={glassY - 21} fontSize="8.5" textAnchor="middle"
                    fontWeight="700" fill="#92400e">
                    Low-E (față {pos.face}) · ε &lt; 0.1
                  </text>
                </>
              )}
            </g>
          ))}


          {/* Iconiță elevație */}
          {!compact && <ElevationIcon x={xWallExt + 4} y={MAIN_Y + 6} />}

          {/* Legendă fețe */}
          {!compact && config.panes >= 2 && (
            <g transform={`translate(${xIntBand - 92},${MAIN_Y + 6})`}>
              <rect x="0" y="0" width="88" height="38" rx="5" fill="white" stroke="#1e3a8a" strokeWidth="1" />
              <circle cx="11" cy="13" r="7" fill="#1d4ed8" />
              <text x="11" y="15.5" fontSize="8" fill="white" textAnchor="middle" fontWeight="900">n</text>
              <text x="22" y="16" fontSize="8" fill="#1e40af" fontWeight="700">= nr. față</text>
              <text x="5" y="28" fontSize="7" fill="#64748b">SR EN 12758 · 1=ext</text>
              <text x="5" y="36" fontSize="7" fill="#64748b">{config.panes * 2}=int (interior)</text>
            </g>
          )}

          {/* ══ ZONA DIMENSIUNI ══ */}
          {!compact && (
            <>
              <rect x="0" y={dimY} width={width} height={DIM_H} fill="#0f172a" />
              <line x1="0" y1={dimY} x2={width} y2={dimY} stroke="#334155" strokeWidth="1" />
              {showDimensions && (
                <>
                  {dimLine(xFrameExt, xSashExt, dimY + 22, "70 mm", "ramă EXT")}
                  {dimLine(xPkgStart, xPkgEnd, dimY + 22, `${totalPkgMM} mm`, "pachet total", "#38bdf8", "#7dd3fc")}
                  {dimLine(xFrameInt, xFrameInt + FRAME_W, dimY + 22, "70 mm", "ramă INT")}
                  {config.gap > 0 && pkgElems.filter(e => e.type === "gas").map((e, i) =>
                    dimLine(e.x, e.x + e.w, dimY + 50, `${config.gap_mm} mm`, "cameră gaz", "#60a5fa", "#93c5fd")
                  )}
                </>
              )}
            </>
          )}
        </svg>
      </div>

      {/* ── Legendă materiale ── */}
      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">
            Compoziție · {config.panes} {config.panes === 1 ? "foaie" : "foi"} sticlă
            {config.gap > 0 ? ` · ${config.gap} ${config.gap === 1 ? "cameră" : "camere"} gaz` : ""}
            {config.lowE ? ` · ${lowEFaces.length}× Low-E` : " · fără Low-E"}
          </div>
          <MaterialLegend
            items={[
              { category: frame.cat === "pvc" ? "plaster" : frame.cat, name: frame.label, extra: <span>Uf={uFrame.toFixed(2)}</span> },
              { category: "glass", name: "Sticlă float", thickness: 4, extra: <span>{config.panes} foi × 4mm</span> },
              ...(config.gap > 0 ? [{ category: config.gas, name: config.gas === "gas_argon" ? "Argon (90%)" : config.gas === "gas_krypton" ? "Kripton" : "Aer", thickness: config.gap_mm, extra: <span>{config.gap} cameră{config.gap > 1 ? "e" : ""}</span> }] : []),
              ...(config.lowE ? [{ category: "low_e", name: `Low-E (față ${config.lowEFace}${config.lowEFace2 ? "+" + config.lowEFace2 : ""})`, extra: <span>ε&lt;0.1</span> }] : []),
              { category: isWarmEdge ? "spacer_warm" : "spacer_al", name: isWarmEdge ? "Distanțier warm edge (TGI)" : "Distanțier aluminiu", extra: <span>Ψg≈{isWarmEdge ? "0.04" : "0.08"}</span> },
            ].filter(Boolean)}
            layout="grid"
          />
        </div>
      )}
    </div>
  );
}
