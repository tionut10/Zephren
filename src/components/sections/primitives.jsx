/**
 * primitives.jsx — Building blocks SVG reutilizabile pentru viewer-e secțiuni:
 *   - OpaqueSection (elemente opace, straturi verticale)
 *   - GlazingSection (elemente vitrate, ramă + sticlă + gaz)
 *   - BridgeSection (wrapper peste bridgeIllustrations existent)
 *
 * Convenții ISO 128-50 (hașuri) + ISO 129-1 (cote).
 * Toate primitivele sunt pure SVG, fără state. Dimensiuni externe (viewBox).
 */

import { memo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL PALETTE & HATCHES — reutilizează pattern-urile din bridgeIllustrations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Categorie → { color, patternId, label, hatchType }
 * patternId = ID-ul din <MaterialDefs/>
 */
export const MATERIAL_CATEGORIES = {
  concrete:    { color: "#6f7378", patternId: "mat-conc",   label: "Beton armat",         hatchType: "dots+rebar" },
  masonry_brick: { color: "#b5614d", patternId: "mat-brick", label: "Zidărie cărămidă",   hatchType: "brick" },
  masonry_bca: { color: "#e6e1d4", patternId: "mat-bca",    label: "Zidărie BCA",         hatchType: "blocks" },
  eps:         { color: "#f5c518", patternId: "mat-eps",    label: "EPS (polistiren)",    hatchType: "diagonal" },
  xps:         { color: "#ff9472", patternId: "mat-xps",    label: "XPS (extrudat)",      hatchType: "diagonal" },
  mineral_wool:{ color: "#d9c89a", patternId: "mat-mw",     label: "Vată minerală",       hatchType: "noise" },
  wood:        { color: "#c8a171", patternId: "mat-wood",   label: "Lemn",                hatchType: "fibers" },
  osb:         { color: "#d4a574", patternId: "mat-osb",    label: "OSB / PAL",           hatchType: "chips" },
  metal:       { color: "#8a8e94", patternId: "mat-metal",  label: "Metal",               hatchType: "solid" },
  gypsum:      { color: "#f0e9dc", patternId: "mat-gypsum", label: "Gips-carton",         hatchType: "light" },
  plaster:     { color: "#e8e3d5", patternId: "mat-plaster",label: "Tencuială",           hatchType: "light" },
  screed:      { color: "#a8a29e", patternId: "mat-screed", label: "Șapă",                hatchType: "dots" },
  membrane:    { color: "#263238", patternId: "mat-membrane",label: "Membrană HI",        hatchType: "solid" },
  vapor_barrier: { color: "#1e40af", patternId: "mat-vapor",label: "Barieră vapori",      hatchType: "solid" },
  air_gap:     { color: "#f0f9ff", patternId: "mat-airgap", label: "Spațiu aer",          hatchType: "sparse" },
  gravel:      { color: "#c4b89f", patternId: "mat-gravel", label: "Pietriș drenaj",      hatchType: "gravel" },
  soil:        { color: "#8d6e5a", patternId: "mat-soil",   label: "Sol",                 hatchType: "hatch" },
  glass:       { color: "#bae6fd", patternId: "mat-glass",  label: "Sticlă",              hatchType: "solid" },
  gas_air:     { color: "#ecfeff", patternId: "mat-gas-air",label: "Cameră aer",          hatchType: "sparse" },
  gas_argon:   { color: "#dbeafe", patternId: "mat-gas-ar", label: "Cameră Argon",        hatchType: "sparse" },
  gas_krypton: { color: "#e0e7ff", patternId: "mat-gas-kr", label: "Cameră Kripton",      hatchType: "sparse" },
  low_e:       { color: "#fbbf24", patternId: "mat-lowe",   label: "Strat Low-E",         hatchType: "solid" },
  spacer_al:   { color: "#94a3b8", patternId: "mat-spacer-al", label: "Distanțier Al",    hatchType: "solid" },
  spacer_warm: { color: "#d97706", patternId: "mat-spacer-warm", label: "Warm edge",      hatchType: "solid" },
};

/**
 * Mapare heuristică nume material → categorie.
 * Folosit pentru clasificarea straturilor din opaque layers.
 */
export function classifyMaterial(name = "") {
  const n = name.toLowerCase();
  if (/beton|bet\.? armat|rc|planșeu|planseu/.test(n)) return "concrete";
  if (/bca|gaz.?beton|ytong|celcon/.test(n)) return "masonry_bca";
  if (/cărămid|caramid|ceramic.*zidărie|porotherm/.test(n)) return "masonry_brick";
  if (/eps|polistiren expandat/.test(n)) return "eps";
  if (/xps|polistiren extrudat/.test(n)) return "xps";
  if (/vat[ăa] *mineral[ăa]|mw|rockwool|knauf/.test(n)) return "mineral_wool";
  if (/lemn|masiv|stratificat|clt|bsh/.test(n)) return "wood";
  if (/osb|pal|pfl|plac[ăa].*fibre/.test(n)) return "osb";
  if (/oțel|otel|metal|aluminiu|profil|al /.test(n)) return "metal";
  if (/gips|rigips|knauf.*carton/.test(n)) return "gypsum";
  if (/tencuial|glet|mortar(?! *ciment)/.test(n)) return "plaster";
  if (/șap|sap/.test(n)) return "screed";
  if (/membran[ăa] *hi|hidroizol|bituminos/.test(n)) return "membrane";
  if (/barier[ăa] *vapori|folie *pe/.test(n)) return "vapor_barrier";
  if (/aer|spațiu *aer|spatiu/.test(n)) return "air_gap";
  if (/pietriș|pietris|drenaj/.test(n)) return "gravel";
  if (/sol|p[ăa]m[âa]nt/.test(n)) return "soil";
  if (/sticl[ăa]|glas/.test(n)) return "glass";
  return "plaster"; // default benign
}

export function getMaterialMeta(name) {
  const cat = classifyMaterial(name);
  return { category: cat, ...MATERIAL_CATEGORIES[cat] };
}

// ═══════════════════════════════════════════════════════════════════════════
// <MaterialDefs /> — toate pattern-urile SVG într-un singur <defs>
// ═══════════════════════════════════════════════════════════════════════════

export const MaterialDefs = memo(function MaterialDefs() {
  return (
    <defs>
      {/* Beton armat — granulație + armături punctate */}
      <pattern id="mat-conc" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#6f7378" />
        <circle cx="2" cy="3" r="0.6" fill="#55585c" />
        <circle cx="7" cy="7" r="0.5" fill="#8b9095" />
        <circle cx="5" cy="2" r="0.4" fill="#424549" />
        <circle cx="8" cy="4" r="0.3" fill="#8b9095" opacity="0.6" />
        <circle cx="3" cy="8" r="0.4" fill="#55585c" />
      </pattern>

      {/* Zidărie cărămidă — linii mortar */}
      <pattern id="mat-brick" patternUnits="userSpaceOnUse" width="16" height="8">
        <rect width="16" height="8" fill="#b5614d" />
        <line x1="0" y1="0" x2="16" y2="0" stroke="#e3d1b3" strokeWidth="0.8" />
        <line x1="0" y1="4" x2="16" y2="4" stroke="#e3d1b3" strokeWidth="0.8" />
        <line x1="8" y1="0" x2="8" y2="4" stroke="#e3d1b3" strokeWidth="0.7" />
        <line x1="0" y1="4" x2="0" y2="8" stroke="#e3d1b3" strokeWidth="0.7" />
        <line x1="16" y1="4" x2="16" y2="8" stroke="#e3d1b3" strokeWidth="0.7" />
      </pattern>

      {/* BCA */}
      <pattern id="mat-bca" patternUnits="userSpaceOnUse" width="14" height="7">
        <rect width="14" height="7" fill="#e6e1d4" />
        <line x1="0" y1="0" x2="14" y2="0" stroke="#c4bdaa" strokeWidth="0.5" />
        <line x1="7" y1="0" x2="7" y2="7" stroke="#c4bdaa" strokeWidth="0.5" />
      </pattern>

      {/* EPS */}
      <pattern id="mat-eps" patternUnits="userSpaceOnUse" width="7" height="7">
        <rect width="7" height="7" fill="#f5c518" />
        <path d="M0,7 L7,0" stroke="#e3a70e" strokeWidth="0.6" />
      </pattern>

      {/* XPS */}
      <pattern id="mat-xps" patternUnits="userSpaceOnUse" width="7" height="7">
        <rect width="7" height="7" fill="#ff9472" />
        <path d="M0,7 L7,0" stroke="#e07050" strokeWidth="0.6" />
      </pattern>

      {/* Vată minerală */}
      <pattern id="mat-mw" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#d9c89a" />
        <circle cx="1.5" cy="2" r="0.5" fill="#8f7a4e" opacity="0.5" />
        <circle cx="4" cy="4.5" r="0.4" fill="#8f7a4e" opacity="0.5" />
      </pattern>

      {/* Lemn — fibre verticale */}
      <pattern id="mat-wood" patternUnits="userSpaceOnUse" width="10" height="12">
        <rect width="10" height="12" fill="#c8a171" />
        <path d="M2,0 L2,12" stroke="#a07843" strokeWidth="0.6" opacity="0.7" />
        <path d="M5,0 L5,12" stroke="#8d6b3a" strokeWidth="0.5" opacity="0.6" />
        <path d="M8,0 L8,12" stroke="#a07843" strokeWidth="0.5" opacity="0.6" />
      </pattern>

      {/* OSB — așchii */}
      <pattern id="mat-osb" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#d4a574" />
        <rect x="1" y="1" width="3" height="1.5" fill="#a07843" opacity="0.6" transform="rotate(15 2.5 1.75)" />
        <rect x="4" y="5" width="2" height="1" fill="#8d6b3a" opacity="0.7" transform="rotate(-20 5 5.5)" />
      </pattern>

      {/* Metal gradient */}
      <linearGradient id="mat-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d0d3d7" />
        <stop offset="50%" stopColor="#8a8e94" />
        <stop offset="100%" stopColor="#5f6267" />
      </linearGradient>

      {/* Gips-carton — ușor */}
      <pattern id="mat-gypsum" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#f0e9dc" />
        <circle cx="3" cy="3" r="0.3" fill="#b8a789" opacity="0.3" />
      </pattern>

      {/* Tencuială */}
      <pattern id="mat-plaster" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill="#e8e3d5" />
        <circle cx="1" cy="1" r="0.2" fill="#aaa190" opacity="0.4" />
        <circle cx="3.5" cy="3.5" r="0.2" fill="#aaa190" opacity="0.4" />
      </pattern>

      {/* Șapă */}
      <pattern id="mat-screed" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#a8a29e" />
        <circle cx="2" cy="2" r="0.4" fill="#78716c" opacity="0.6" />
        <circle cx="6" cy="5" r="0.3" fill="#78716c" opacity="0.6" />
      </pattern>

      {/* Membrană HI */}
      <pattern id="mat-membrane" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="#263238" />
      </pattern>

      {/* Barieră vapori */}
      <pattern id="mat-vapor" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="#1e40af" />
      </pattern>

      {/* Spațiu aer — punctat sparse */}
      <pattern id="mat-airgap" patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="#f0f9ff" />
        <circle cx="3" cy="3" r="0.4" fill="#93c5fd" opacity="0.5" />
        <circle cx="9" cy="9" r="0.4" fill="#93c5fd" opacity="0.5" />
      </pattern>

      {/* Pietriș */}
      <pattern id="mat-gravel" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#c4b89f" />
        <circle cx="2" cy="3" r="1.2" fill="#9c8d74" />
        <circle cx="6" cy="6" r="1" fill="#a59977" />
        <circle cx="8.5" cy="2" r="0.8" fill="#877659" />
      </pattern>

      {/* Sol */}
      <pattern id="mat-soil" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#8d6e5a" />
        <path d="M0,8 L8,0" stroke="#5d4638" strokeWidth="0.7" opacity="0.5" />
        <circle cx="3" cy="3" r="0.5" fill="#6d5243" opacity="0.6" />
      </pattern>

      {/* Sticlă — gradient transparent */}
      <linearGradient id="mat-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7fb8e0" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#b8dff5" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#5a9fd0" stopOpacity="0.5" />
      </linearGradient>

      {/* Cameră aer (vitraj) */}
      <pattern id="mat-gas-air" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#ecfeff" />
        <circle cx="4" cy="4" r="0.3" fill="#67e8f9" opacity="0.5" />
      </pattern>

      {/* Argon */}
      <pattern id="mat-gas-ar" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#dbeafe" />
        <text x="4" y="5" fontSize="3" fill="#3b82f6" textAnchor="middle" opacity="0.4">Ar</text>
      </pattern>

      {/* Kripton */}
      <pattern id="mat-gas-kr" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#e0e7ff" />
        <text x="4" y="5" fontSize="3" fill="#6366f1" textAnchor="middle" opacity="0.4">Kr</text>
      </pattern>

      {/* Low-E coating */}
      <linearGradient id="mat-lowe" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
      </linearGradient>

      {/* Distanțiere */}
      <linearGradient id="mat-spacer-al" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="mat-spacer-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>

      {/* Gradient aer exterior / interior (ambient) */}
      <linearGradient id="amb-ext" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dbeafe" />
        <stop offset="100%" stopColor="#bfdbfe" />
      </linearGradient>
      <linearGradient id="amb-int" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff8e7" />
        <stop offset="100%" stopColor="#ffe8cc" />
      </linearGradient>
      {/* Ambient — SOL (sub placă pe sol) */}
      <pattern id="amb-soil" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#8d6e5a" />
        <path d="M0,8 L8,0" stroke="#5d4638" strokeWidth="0.7" opacity="0.5" />
        <circle cx="3" cy="3" r="0.5" fill="#6d5243" opacity="0.6" />
        <circle cx="6" cy="6" r="0.4" fill="#4a3628" opacity="0.7" />
      </pattern>
      {/* Ambient — POD/SUBSOL neîncălzit (gri neutru) */}
      <linearGradient id="amb-unheated" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d4d4d8" />
        <stop offset="100%" stopColor="#a1a1aa" />
      </linearGradient>

      {/* Săgeată flux termic */}
      <marker id="sec-arrow-heat" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#ef4444" />
      </marker>
    </defs>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// <SectionFrame /> — canvas cu strip header EXT/INT + zonă interior ± footer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {number} width, height — dimensiuni viewBox interior (zona de desen utilă)
 * @param {string} extLabel — text panou exterior (ex: "EXTERIOR", "EXT (aer ext.)")
 * @param {string} intLabel — text panou interior
 * @param {"vertical"|"horizontal"} orientation — layout strips
 *   "vertical"   → EXT sus, INT jos (secțiune perete clasică)
 *   "horizontal" → EXT stânga, INT dreapta (secțiune plan — colț, fereastră)
 * @param {number} padTop, padBottom, padLeft, padRight — padding vizual pentru label strips
 * @param {React.ReactNode} children — conținutul desenat în zona interioară
 */
export function SectionFrame({
  width = 400,
  height = 300,
  extLabel = "EXTERIOR",
  intLabel = "INTERIOR",
  orientation = "vertical",
  padTop = 24,
  padBottom = 24,
  padLeft = 0,
  padRight = 0,
  children,
  showStrips = true,
  // Props opționale pentru customizare per tip element (placă pe sol, pod, etc.):
  extFill,       // SVG fill string (ex: "url(#amb-soil)")
  intFill,       // SVG fill string
  extColor,      // culoare text label EXT
  intColor,      // culoare text label INT
}) {
  const extFillFinal = extFill || "url(#amb-ext)";
  const intFillFinal = intFill || "url(#amb-int)";
  const extColorFinal = extColor || "#1e40af";
  const intColorFinal = intColor || "#15803d";

  const totalW = width + padLeft + padRight;
  const totalH = height + padTop + padBottom;

  if (orientation === "horizontal") {
    // Secțiune tip „perete" — EXT stânga, INT dreapta
    const lpad = padLeft || 62;
    const rpad = padRight || 62;
    const totalWH = width + lpad + rpad;
    return (
      <svg viewBox={`0 0 ${totalWH} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block" }}>
        <MaterialDefs />
        {showStrips && (
          <>
            <rect x="0" y="0" width={lpad} height={height} fill={extFillFinal} />
            <rect x={lpad + width} y="0" width={rpad} height={height} fill={intFillFinal} />
            <text x={lpad / 2} y={height / 2} fontSize="11" fontWeight="700" fill={extColorFinal} textAnchor="middle" transform={`rotate(-90 ${lpad / 2} ${height / 2})`}>{extLabel}</text>
            <text x={lpad + width + rpad / 2} y={height / 2} fontSize="11" fontWeight="700" fill={intColorFinal} textAnchor="middle" transform={`rotate(90 ${lpad + width + rpad / 2} ${height / 2})`}>{intLabel}</text>
          </>
        )}
        <g transform={`translate(${lpad}, 0)`}>{children}</g>
      </svg>
    );
  }

  // Secțiune tip „vertical" — EXT sus, INT jos (sau invers, via ext/intFill)
  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block" }}>
      <MaterialDefs />
      {showStrips && (
        <>
          <rect x="0" y="0" width={totalW} height={padTop} fill={extFillFinal} />
          <text x={totalW / 2} y={padTop * 0.65} fontSize="11" fontWeight="700" fill={extColorFinal} textAnchor="middle" style={{ letterSpacing: "1px" }}>{extLabel}</text>
          <rect x="0" y={padTop + height} width={totalW} height={padBottom} fill={intFillFinal} />
          <text x={totalW / 2} y={padTop + height + padBottom * 0.65} fontSize="11" fontWeight="700" fill={intColorFinal} textAnchor="middle" style={{ letterSpacing: "1px" }}>{intLabel}</text>
        </>
      )}
      <g transform={`translate(${padLeft}, ${padTop})`}>{children}</g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// <MaterialLayer /> — dreptunghi hașurat cu nume material
// ═══════════════════════════════════════════════════════════════════════════

export function MaterialLayer({ x, y, width, height, category = "plaster", name, thicknessLabel, showLabel = false }) {
  const cat = MATERIAL_CATEGORIES[category] || MATERIAL_CATEGORIES.plaster;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${cat.patternId})`} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
      {showLabel && (
        <text x={x + width / 2} y={y + height / 2 + 3} fontSize="8" fill="#263238" textAnchor="middle" fontWeight="600" style={{ pointerEvents: "none" }}>
          {name}{thicknessLabel ? ` · ${thicknessLabel}` : ""}
        </text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// <DimensionCote /> — cotă dimensională ISO 129-1
// ═══════════════════════════════════════════════════════════════════════════

export function DimensionCote({ x1, y1, x2, y2, label, offset = 14, orientation = "h", color = "#455a64" }) {
  const isH = orientation === "h";
  const ox = isH ? 0 : offset;
  const oy = isH ? offset : 0;
  const mx = (x1 + x2) / 2 + ox;
  const my = (y1 + y2) / 2 + oy;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* extensori perpendiculari */}
      <line x1={x1} y1={y1} x2={x1 + ox} y2={y1 + oy} stroke={color} strokeWidth="0.4" opacity="0.6" />
      <line x1={x2} y1={y2} x2={x2 + ox} y2={y2 + oy} stroke={color} strokeWidth="0.4" opacity="0.6" />
      {/* linie de cotă */}
      <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} stroke={color} strokeWidth="0.6" />
      {/* săgeți la capete */}
      <polygon points={`${x1 + ox - 2},${y1 + oy - 2} ${x1 + ox},${y1 + oy} ${x1 + ox - 2},${y1 + oy + 2}`} fill={color} />
      <polygon points={`${x2 + ox + 2},${y2 + oy - 2} ${x2 + ox},${y2 + oy} ${x2 + ox + 2},${y2 + oy + 2}`} fill={color} />
      {/* label centru */}
      <rect x={mx - 14} y={my - 7} width="28" height="10" fill="rgba(255,255,255,0.85)" rx="1.5" />
      <text x={mx} y={my + 1} fontSize="8" fill="#263238" textAnchor="middle" fontFamily="monospace" fontWeight="600">{label}</text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// <HeatFlowArrow /> — săgeată gradient flux termic (INT → EXT în iarnă)
// ═══════════════════════════════════════════════════════════════════════════

export function HeatFlowArrow({ x1, y1, x2, y2, label, color = "#ef4444" }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelW = label ? label.length * 5.2 + 12 : 0;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" markerEnd="url(#sec-arrow-heat)" opacity="0.9" />
      {label && (
        <g>
          <rect x={mx - labelW / 2} y={my - 17} width={labelW} height="13" rx="3" fill="rgba(255,255,255,0.92)" />
          <text x={mx} y={my - 7} fontSize="8.5" fill="#b91c1c" textAnchor="middle" fontWeight="700">{label}</text>
        </g>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// <TemperatureProfile /> — curba T(x) peste o secțiune opacă
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {Array<{x: number, t: number}>} points — punctele T la fiecare interfață
 * @param {number} xStart, xEnd — limitele orizontale ale desenului
 * @param {number} yTop, yBottom — limitele verticale (yTop < yBottom)
 * @param {number} tMin, tMax — range temperatură
 */
export function TemperatureProfile({ points, xStart, xEnd, yTop, yBottom, tMin, tMax, color = "#ef4444" }) {
  if (!points || points.length < 2) return null;
  const tToY = (t) => yBottom - ((t - tMin) / (tMax - tMin)) * (yBottom - yTop);
  const path = points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + tToY(p.t).toFixed(1)).join(" ");

  return (
    <g style={{ pointerEvents: "none" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" opacity="0.85" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={tToY(p.t)} r="2.2" fill={color} />
          <text x={p.x} y={tToY(p.t) - 5} fontSize="7" fill={color} textAnchor="middle" fontWeight="700">{p.t.toFixed(1)}°</text>
        </g>
      ))}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// <MaterialLegend /> — legendă laterală sau footer cu toate materialele folosite
// ═══════════════════════════════════════════════════════════════════════════

export function MaterialLegend({ items = [], layout = "grid" }) {
  // items: [{ category, name, thickness, lambda, mu, rho, extra }]
  if (!items.length) return null;

  return (
    <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5" : "space-y-1"}>
      {items.map((it, i) => {
        const cat = MATERIAL_CATEGORIES[it.category] || MATERIAL_CATEGORIES.plaster;
        return (
          <div key={i} className="flex items-center gap-2 text-[11px] bg-white/5 rounded px-2 py-1">
            <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
              <MaterialDefs />
              <rect x="0" y="0" width="14" height="14" fill={`url(#${cat.patternId})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{it.name || cat.label}</div>
              <div className="text-[10px] opacity-70 font-mono flex gap-2 flex-wrap">
                {it.thickness != null && <span>{it.thickness}mm</span>}
                {it.lambda != null && <span>λ={it.lambda}</span>}
                {it.mu != null && <span>μ={it.mu}</span>}
                {it.rho != null && <span>ρ={it.rho}</span>}
                {it.extra}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
