/**
 * DoorSection.jsx — Secțiune transversală ușă termizolată (plan/vedere de sus).
 * Toc EXT · skin exterior · miez izolant · skin interior · Toc INT
 * Referință: SR EN 14351-1 · EN ISO 10077-1
 */

import { useMemo } from "react";
import { MaterialLegend } from "./primitives.jsx";

const FRAME_CONFIGS = {
  "PVC (5 camere)":    { cat: "pvc",   uf: 1.30, label: "PVC (5 camere)"      },
  "PVC (6-7 camere)":  { cat: "pvc",   uf: 1.10, label: "PVC (6-7 camere)"    },
  "Lemn stratificat":  { cat: "wood",  uf: 1.40, label: "Lemn stratificat"     },
  "Aluminiu fără RPT": { cat: "metal", uf: 5.00, label: "Aluminiu (fără RPT)" },
  "Aluminiu cu RPT":   { cat: "metal", uf: 2.00, label: "Aluminiu (cu RPT)"   },
  "Lemn-aluminiu":     { cat: "wood",  uf: 1.20, label: "Lemn-aluminiu"        },
};

function inferInsulation(element) {
  const s = [element.name, element.glazingType || "", element.composition || ""].join(" ").toLowerCase();
  if (/pir|poliizocian/.test(s))    return { id: "PIR", label: "Miez PIR",       patId: "door-pir", fill1: "#fed7aa", fill2: "#f97316", stroke: "#ea580c" };
  if (/xps/.test(s))                return { id: "XPS", label: "Miez XPS",       patId: "door-xps", fill1: "#bfdbfe", fill2: "#60a5fa", stroke: "#3b82f6" };
  if (/eps|polistiren/.test(s))     return { id: "EPS", label: "Miez EPS",       patId: "door-eps", fill1: "#fef9c3", fill2: "#fde047", stroke: "#ca8a04" };
  if (/vat[ăa].*mineral|mineral.*wool|mw\b/.test(s)) return { id: "MW",  label: "Vată minerală", patId: "door-mw",  fill1: "#d9c89a", fill2: "#b5a06a", stroke: "#92835a" };
  if (/lemn masiv|timber|oak|stejar/.test(s))        return { id: "WOOD", label: "Lemn masiv",    patId: "door-wood",fill1: "#d4a86a", fill2: "#a07843", stroke: "#7c5c32" };
  // Default: PUR / spumă poliuretanică
  return { id: "PUR", label: "Miez PUR",       patId: "door-pur", fill1: "#fde68a", fill2: "#fbbf24", stroke: "#d97706" };
}

function inferCoreMM(element) {
  const s = [element.name, element.glazingType || "", element.composition || ""].join(" ");
  const m = s.match(/(\d+)\s*mm/);
  if (m) return parseInt(m[1]);
  const u = parseFloat(element.u) || 1.3;
  if (u <= 0.8)  return 100;
  if (u <= 1.0)  return 80;
  if (u <= 1.3)  return 60;
  if (u <= 1.6)  return 50;
  return 40;
}

function inferFacing(element) {
  const s = [element.name, element.glazingType || ""].join(" ").toLowerCase();
  if (/lemn|wood/.test(s)) return { label: "Piele lemn",    color: "#c8a171", stroke: "#8a6233" };
  return                           { label: "Tablă oțel",   color: "#94a3b8", stroke: "#64748b" };
}

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

function DoorElevationIcon({ x = 4, y = 4 }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
      <rect width="62" height="46" rx="4" fill="rgba(255,255,255,0.96)" stroke="#94a3b8" strokeWidth="0.8" />
      {/* Ușă — contur */}
      <rect x="14" y="7" width="34" height="33" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
      {/* Prag jos */}
      <rect x="12" y="38" width="38" height="2.5" fill="#94a3b8" />
      {/* Mâner */}
      <circle cx="44" cy="24" r="2.5" fill="#475569" />
      <line x1="44" y1="21.5" x2="44" y2="26.5" stroke="#475569" strokeWidth="1" />
      {/* Linie secțiune A-A */}
      <line x1="2" y1="23" x2="60" y2="23" stroke="#ef4444" strokeWidth="1" strokeDasharray="2.5 1.5" />
      <text x="31" y="5.5" fontSize="5" textAnchor="middle" fill="#475569" fontWeight="600">elevație</text>
      <text x="57" y="26" fontSize="6" fill="#ef4444" fontWeight="800">A–A</text>
    </g>
  );
}

export default function DoorSection({
  element,
  width = 720,
  height = 420,
  compact = false,
  showLegend = true,
  showDimensions = true,
  onClickExpand,
}) {
  const uid = useMemo(() => `dr${Math.random().toString(36).slice(2, 7)}`, []);

  if (!element) {
    return <div className="p-6 text-center text-xs opacity-50">Element ușă lipsă.</div>;
  }

  const frame    = FRAME_CONFIGS[element.frameType] || FRAME_CONFIGS["PVC (5 camere)"];
  const insul    = inferInsulation(element);
  const facing   = inferFacing(element);
  const coreMM   = inferCoreMM(element);
  const uTotal   = parseFloat(element.u) || 1.3;
  const uFrame   = parseFloat(element.uFrame) || frame.uf;
  const gVal     = parseFloat(element.g) || 0;
  const hasGlaz  = gVal > 0.05;

  // ── Layout ──────────────────────────────────────────────────────────────
  const EXT_BAND = 52;
  const WALL_W   = 26;
  const TOC_W    = 82;
  const SKIN_W   = 7;
  const CORE_W   = Math.max(80, Math.min(190, coreMM * 1.7));

  const usedW = 2 * EXT_BAND + 2 * WALL_W + 2 * TOC_W + 2 * SKIN_W + CORE_W;
  const ofs   = Math.max(8, (width - usedW) / 2);

  const xExtBand   = ofs;
  const xWallExt   = xExtBand  + EXT_BAND;
  const xTocExt    = xWallExt  + WALL_W;
  const xSkinExt   = xTocExt   + TOC_W;
  const xCoreStart = xSkinExt  + SKIN_W;
  const xCoreEnd   = xCoreStart + CORE_W;
  const xSkinInt   = xCoreEnd;
  const xTocInt    = xSkinInt  + SKIN_W;
  const xWallInt   = xTocInt   + TOC_W;
  const xIntBand   = xWallInt  + WALL_W;

  const FLUX_H  = compact ? 0 : 44;
  const DIM_H   = compact ? 0 : 66;
  const MAIN_Y  = FLUX_H;
  const MAIN_H  = height - FLUX_H - DIM_H;
  const midY    = MAIN_Y + MAIN_H / 2;
  const dimY    = MAIN_Y + MAIN_H;

  // Canat zone (inner margins)
  const canatY  = MAIN_Y + 12;
  const canatH  = MAIN_H - 24;

  // Centru toc EXT / INT
  const fExtCX  = xTocExt  + TOC_W / 2;
  const fIntCX  = xTocInt  + TOC_W / 2;
  const coreCX  = xCoreStart + CORE_W / 2;

  // Glazing panel (dacă ușa e parțial vitrată)
  const glazH   = hasGlaz ? Math.round(canatH * Math.min(0.55, gVal * 1.5)) : 0;
  const glazY   = canatY;
  const opaqueY = canatY + glazH;
  const opaqueH = canatH - glazH;

  // Frame fill pattern
  const frameFill   = frame.cat === "wood"  ? `url(#${uid}-fw)` :
                      frame.cat === "metal" ? `url(#${uid}-fm)` : `url(#${uid}-fp)`;
  const frameStroke = frame.cat === "metal" ? "#64748b" : "#6b7280";

  return (
    <div className={compact ? "" : "space-y-3"}>

      {/* ── Metrici header ── */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          {[
            { label: "Ud total",      val: `${uTotal.toFixed(2)} W/m²K`, accent: true },
            { label: "Uf toc",        val: `${uFrame.toFixed(2)}` },
            { label: "Miez",          val: `${coreMM} mm` },
            { label: "g (SHGC)",      val: gVal.toFixed(2) },
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
        className={compact
          ? "overflow-hidden rounded-xl border border-slate-600/25"
          : "rounded-xl overflow-hidden border border-slate-600/40"}
        onClick={onClickExpand}
        style={{ cursor: onClickExpand ? "pointer" : "default" }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
          <defs>
            {/* Toc PVC */}
            <pattern id={`${uid}-fp`} patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill="#dde3ea" />
              <line x1="0" y1="10" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.2" />
            </pattern>
            {/* Toc lemn */}
            <pattern id={`${uid}-fw`} patternUnits="userSpaceOnUse" width="10" height="12">
              <rect width="10" height="12" fill="#d4a86a" />
              <line x1="2.5" y1="0" x2="2.5" y2="12" stroke="#a07843" strokeWidth="0.8" />
              <line x1="6"   y1="0" x2="6"   y2="12" stroke="#8d6b3a" strokeWidth="0.6" />
            </pattern>
            {/* Toc metal */}
            <linearGradient id={`${uid}-fm`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#b0b7c0" />
              <stop offset="45%"  stopColor="#e8eaec" />
              <stop offset="100%" stopColor="#9ea4ab" />
            </linearGradient>
            {/* Miez PUR */}
            <pattern id={`${uid}-pur`} patternUnits="userSpaceOnUse" width="12" height="12">
              <rect width="12" height="12" fill="#fde68a" />
              <path d="M0,12 L12,0" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6" />
              <path d="M6,12 L12,6"  stroke="#f59e0b" strokeWidth="0.5" opacity="0.4" />
            </pattern>
            {/* Miez PIR */}
            <pattern id={`${uid}-pir`} patternUnits="userSpaceOnUse" width="12" height="12">
              <rect width="12" height="12" fill="#fed7aa" />
              <path d="M0,12 L12,0" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />
              <path d="M6,12 L12,6" stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
            </pattern>
            {/* Miez EPS */}
            <pattern id={`${uid}-eps`} patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill="#fef9c3" />
              <path d="M0,10 L10,0" stroke="#eab308" strokeWidth="0.7" opacity="0.55" />
            </pattern>
            {/* Miez XPS */}
            <pattern id={`${uid}-xps`} patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill="#bfdbfe" />
              <path d="M0,10 L10,0" stroke="#3b82f6" strokeWidth="0.7" opacity="0.55" />
            </pattern>
            {/* Miez vată minerală */}
            <pattern id={`${uid}-mw`} patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="#d9c89a" />
              <circle cx="2" cy="2" r="0.8" fill="#8f7a4e" opacity="0.5" />
              <circle cx="5" cy="5.5" r="0.6" fill="#8f7a4e" opacity="0.5" />
            </pattern>
            {/* Miez lemn masiv */}
            <pattern id={`${uid}-wood`} patternUnits="userSpaceOnUse" width="10" height="12">
              <rect width="10" height="12" fill="#c8a171" />
              <line x1="2" y1="0" x2="2" y2="12" stroke="#a07843" strokeWidth="0.6" opacity="0.6" />
              <line x1="5.5" y1="0" x2="5.5" y2="12" stroke="#8d6b3a" strokeWidth="0.5" opacity="0.5" />
              <line x1="8.5" y1="0" x2="8.5" y2="12" stroke="#a07843" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            {/* Sticlă (pentru zona vitrată dacă există) */}
            <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#60a5fa" />
              <stop offset="35%"  stopColor="#bfdbfe" />
              <stop offset="65%"  stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            {/* Argon (zone vitrată) */}
            <pattern id={`${uid}-ar`} patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#e0f2fe" />
              <circle cx="5"  cy="5"  r="1.8" fill="#7dd3fc" opacity="0.5" />
              <circle cx="15" cy="14" r="1.4" fill="#38bdf8" opacity="0.4" />
            </pattern>
            {/* Marker săgeată flux */}
            <marker id={`${uid}-arr`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
            </marker>
          </defs>

          {/* ══ FLUX TERMIC ══ */}
          {!compact && (
            <g>
              <rect x="0" y="0" width={width} height={FLUX_H} fill="#160303" />
              <rect x="0" y={FLUX_H - 1} width={width} height="2" fill="#7f1d1d" opacity="0.6" />
              <line
                x1={fIntCX + TOC_W * 0.5} y1={FLUX_H / 2}
                x2={fExtCX - TOC_W * 0.5} y2={FLUX_H / 2}
                stroke="#f87171" strokeWidth="4" markerEnd={`url(#${uid}-arr)`}
              />
              <text x={coreCX} y={FLUX_H / 2 - 7} fontSize="11.5" textAnchor="middle" fill="#fca5a5" fontWeight="800">
                Flux termic iarnă: INT → EXT
              </text>
              <text x={coreCX} y={FLUX_H / 2 + 9} fontSize="8" textAnchor="middle" fill="#fca5a5" opacity="0.7">
                energia termică migrează prin canat (miez izolant + feronerie)
              </text>
            </g>
          )}

          {/* ══ ZONA PRINCIPALĂ ══ */}
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
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + 16}  fontSize="7" textAnchor="middle" fill="#92400e" opacity="0.8">▲</text>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + 25}  fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
              <text x={xWallExt + WALL_W / 2} y={MAIN_Y + MAIN_H - 8} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
            </>
          )}

          {/* Context perete INT */}
          <rect x={xWallInt} y={MAIN_Y} width={WALL_W} height={MAIN_H} fill="#e7d5c0" opacity="0.65" />
          {!compact && (
            <>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + 16}  fontSize="7" textAnchor="middle" fill="#92400e" opacity="0.8">▲</text>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + 25}  fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
              <text x={xWallInt + WALL_W / 2} y={MAIN_Y + MAIN_H - 8} fontSize="6.5" textAnchor="middle" fill="#92400e" opacity="0.75">perete</text>
            </>
          )}

          {/* ── TOC EXT ── */}
          <rect x={xTocExt} y={MAIN_Y} width={TOC_W} height={MAIN_H} fill={frameFill} stroke={frameStroke} strokeWidth="1.5" />
          {!compact && (
            <>
              <rect x={fExtCX - 52} y={midY - 26} width="104" height="50" rx="6"
                fill="rgba(255,255,255,0.93)" stroke="#94a3b8" strokeWidth="1" />
              <text x={fExtCX} y={midY - 10} fontSize="11" textAnchor="middle" fontWeight="800" fill="#0f172a">Toc EXT</text>
              <text x={fExtCX} y={midY + 4}  fontSize="8.5" textAnchor="middle" fill="#475569">{frame.label}</text>
              <text x={fExtCX} y={midY + 17} fontSize="9"   textAnchor="middle" fill="#dc2626" fontWeight="700">Uf = {uFrame.toFixed(2)} W/m²K</text>
            </>
          )}

          {/* ── TOC INT ── */}
          <rect x={xTocInt} y={MAIN_Y} width={TOC_W} height={MAIN_H} fill={frameFill} stroke={frameStroke} strokeWidth="1.5" />
          {!compact && (
            <>
              <rect x={fIntCX - 52} y={midY - 26} width="104" height="50" rx="6"
                fill="rgba(255,255,255,0.93)" stroke="#94a3b8" strokeWidth="1" />
              <text x={fIntCX} y={midY - 10} fontSize="11" textAnchor="middle" fontWeight="800" fill="#0f172a">Toc INT</text>
              <text x={fIntCX} y={midY + 4}  fontSize="8.5" textAnchor="middle" fill="#475569">{frame.label}</text>
              <text x={fIntCX} y={midY + 17} fontSize="9"   textAnchor="middle" fill="#dc2626" fontWeight="700">Uf = {uFrame.toFixed(2)} W/m²K</text>
            </>
          )}

          {/* ── CANAT — SKIN EXT ── */}
          <rect x={xSkinExt} y={canatY} width={SKIN_W} height={canatH}
            fill={facing.color} stroke={facing.stroke} strokeWidth="1" />

          {/* ── CANAT — SKIN INT ── */}
          <rect x={xSkinInt} y={canatY} width={SKIN_W} height={canatH}
            fill={facing.color} stroke={facing.stroke} strokeWidth="1" />

          {/* ── CANAT — MIEZ OPAC (zona inferioară sau totală dacă fără vitraj) ── */}
          <rect
            x={xCoreStart} y={opaqueY} width={CORE_W} height={opaqueH}
            fill={`url(#${uid}-${insul.id.toLowerCase()})`}
            stroke={insul.stroke} strokeWidth="1"
          />

          {/* ── CANAT — ZONA VITRATĂ (dacă g > 0) ── */}
          {hasGlaz && glazH > 0 && (
            <g>
              {/* Sticlă float */}
              <rect x={xCoreStart + 4} y={glazY} width={6} height={glazH}
                fill={`url(#${uid}-gl)`} stroke="#1d4ed8" strokeWidth="2" />
              {/* Argon */}
              <rect x={xCoreStart + 10} y={glazY} width={CORE_W - 20} height={glazH}
                fill={`url(#${uid}-ar)`} stroke="#7dd3fc" strokeWidth="0.5" strokeDasharray="5 3" />
              {/* Sticlă float INT */}
              <rect x={xCoreEnd - 10} y={glazY} width={6} height={glazH}
                fill={`url(#${uid}-gl)`} stroke="#1d4ed8" strokeWidth="2" />
              {!compact && (
                <text x={coreCX} y={glazY + glazH / 2 + 4} fontSize="10" textAnchor="middle"
                  fill="#1e40af" fontWeight="700" style={{ paintOrder: "stroke", stroke: "rgba(224,242,254,0.95)", strokeWidth: "3px" }}>
                  Ar
                </text>
              )}
            </g>
          )}

          {/* Label canat (centru miez) */}
          {!compact && (
            <>
              <rect x={coreCX - 58} y={midY - 28} width="116" height="54" rx="7"
                fill="rgba(255,255,255,0.93)" stroke={insul.stroke} strokeWidth="1.5" />
              <text x={coreCX} y={midY - 12} fontSize="12" textAnchor="middle" fontWeight="900" fill="#0f172a">
                Canat
              </text>
              <text x={coreCX} y={midY + 3}  fontSize="9"  textAnchor="middle" fill="#475569">{insul.label}</text>
              <text x={coreCX} y={midY + 16} fontSize="9"  textAnchor="middle" fill={insul.stroke} fontWeight="700">
                ≈ {coreMM} mm
              </text>
            </>
          )}

          {/* Contur ușă (dashed) */}
          <rect
            x={xSkinExt - 2} y={canatY - 1}
            width={CORE_W + 2 * SKIN_W + 4} height={canatH + 2}
            fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 4" rx="2" opacity="0.5"
          />

          {/* Iconiță elevație */}
          {!compact && <DoorElevationIcon x={xWallExt + 4} y={MAIN_Y + 6} />}

          {/* ══ ZONA DIMENSIUNI ══ */}
          {!compact && (
            <>
              <rect x="0" y={dimY} width={width} height={DIM_H} fill="#0f172a" />
              <line x1="0" y1={dimY} x2={width} y2={dimY} stroke="#334155" strokeWidth="1" />
              {showDimensions && (
                <>
                  {dimLine(xTocExt, xSkinExt, dimY + 22, "toc", `≈ ${Math.round(TOC_W / 1.14)} mm`)}
                  {dimLine(xSkinExt, xSkinInt + SKIN_W, dimY + 22,
                    `${coreMM + 14} mm`, "canat total", "#38bdf8", "#7dd3fc")}
                  {dimLine(xTocInt, xTocInt + TOC_W, dimY + 22, "toc", `≈ ${Math.round(TOC_W / 1.14)} mm`)}
                  {dimLine(xCoreStart, xCoreEnd, dimY + 50,
                    `${coreMM} mm`, "miez izolant", "#a3e635", "#d9f99d")}
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
            Compoziție canat · {insul.id} {coreMM}mm · toc {frame.label}
            {hasGlaz ? ` · vitraj parțial (g=${gVal.toFixed(2)})` : " · panou opac"}
          </div>
          <MaterialLegend
            items={[
              { category: frame.cat === "pvc" ? "plaster" : frame.cat, name: `Toc — ${frame.label}`, extra: <span>Uf={uFrame.toFixed(2)}</span> },
              { category: frame.cat === "wood" ? "wood" : "metal", name: `Piele canat — ${facing.label}`, thickness: 1, extra: <span>~1-2mm</span> },
              { category: insul.id === "EPS" ? "eps" : insul.id === "XPS" ? "xps" : insul.id === "MW" ? "mineral_wool" : insul.id === "WOOD" ? "wood" : "eps",
                name: `Miez ${insul.id} (termoizolant)`, thickness: coreMM, extra: <span>miez canat</span> },
              ...(hasGlaz ? [{ category: "glass", name: "Sticlă float + cameră Ar", extra: <span>g={gVal.toFixed(2)}</span> }] : []),
            ]}
            layout="grid"
          />
        </div>
      )}
    </div>
  );
}
