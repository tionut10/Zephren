/**
 * bridgeIllustrations.jsx — Ilustrații SVG realiste pentru catalogul punți termice.
 *
 * Patterns materiale (din <defs>):
 *   - p-eps  : izolație EPS (galben cu diagonal stripes)
 *   - p-xps  : izolație XPS (roz-portocaliu cu diagonal stripes)
 *   - p-mw   : vată minerală (crem cu noise)
 *   - p-brick: zidărie cărămidă (roșu cu linii orizontale mortar)
 *   - p-bca  : zidărie BCA (alb-gri cu striații)
 *   - p-conc : beton armat (gri închis cu granulație + armătură indicativă)
 *   - p-wood : lemn (maro gălbui cu fibre verticale)
 *   - p-soil : sol (maro cu hașură diagonală)
 *   - p-gravel: pietriș (puncte mici aleatoare)
 *   - p-metal: profile oțel (gradient vertical gri)
 *   - g-glass: sticlă (gradient albastru)
 *   - g-int  : aer interior (crem pal)
 *   - g-ext  : aer exterior (albastru pal cu gradient)
 *   - g-heat : overlay roșu-portocaliu (zona puntii termice)
 *
 * Render: `<BridgeIllustration bridge={...} />` → SVG 320×200 cu secțiunea realistă.
 * Sigur fără `dangerouslySetInnerHTML` (nu e conținut user-provided).
 */

const W = 320;
const H = 200;

// ── Defs globale (o singură dată per SVG) ────────────────────────────────────
function Defs() {
  return (
    <defs>
      {/* EPS (galben diagonal stripes) */}
      <pattern id="p-eps" patternUnits="userSpaceOnUse" width="7" height="7">
        <rect width="7" height="7" fill="#f5c518" />
        <path d="M0,7 L7,0" stroke="#e3a70e" strokeWidth="0.6" />
        <path d="M-1,2 L2,-1 M5,8 L8,5" stroke="#fff6b0" strokeWidth="0.4" opacity="0.6" />
      </pattern>

      {/* XPS (roz-portocaliu stripes) */}
      <pattern id="p-xps" patternUnits="userSpaceOnUse" width="7" height="7">
        <rect width="7" height="7" fill="#ff9472" />
        <path d="M0,7 L7,0" stroke="#e07050" strokeWidth="0.6" />
        <path d="M-1,2 L2,-1 M5,8 L8,5" stroke="#ffd8c3" strokeWidth="0.4" opacity="0.7" />
      </pattern>

      {/* Vată minerală (crem noise) */}
      <pattern id="p-mw" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#d9c89a" />
        <circle cx="1.5" cy="2" r="0.5" fill="#8f7a4e" opacity="0.5" />
        <circle cx="4" cy="4.5" r="0.4" fill="#8f7a4e" opacity="0.5" />
        <circle cx="5" cy="1" r="0.3" fill="#fff5cd" opacity="0.7" />
      </pattern>

      {/* Cărămidă zidărie */}
      <pattern id="p-brick" patternUnits="userSpaceOnUse" width="16" height="8">
        <rect width="16" height="8" fill="#b5614d" />
        <line x1="0" y1="0" x2="16" y2="0" stroke="#e3d1b3" strokeWidth="0.8" />
        <line x1="0" y1="4" x2="16" y2="4" stroke="#e3d1b3" strokeWidth="0.8" />
        <line x1="8" y1="0" x2="8" y2="4" stroke="#e3d1b3" strokeWidth="0.7" />
        <line x1="0" y1="4" x2="0" y2="8" stroke="#e3d1b3" strokeWidth="0.7" />
        <line x1="16" y1="4" x2="16" y2="8" stroke="#e3d1b3" strokeWidth="0.7" />
      </pattern>

      {/* BCA zidărie */}
      <pattern id="p-bca" patternUnits="userSpaceOnUse" width="14" height="7">
        <rect width="14" height="7" fill="#e6e1d4" />
        <line x1="0" y1="0" x2="14" y2="0" stroke="#c4bdaa" strokeWidth="0.5" />
        <line x1="7" y1="0" x2="7" y2="7" stroke="#c4bdaa" strokeWidth="0.5" />
      </pattern>

      {/* Beton armat (gri granulat) */}
      <pattern id="p-conc" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#6f7378" />
        <circle cx="2" cy="3" r="0.6" fill="#55585c" />
        <circle cx="7" cy="7" r="0.5" fill="#8b9095" />
        <circle cx="5" cy="2" r="0.4" fill="#424549" />
        <circle cx="8" cy="4" r="0.3" fill="#8b9095" opacity="0.6" />
        <circle cx="3" cy="8" r="0.4" fill="#55585c" />
      </pattern>

      {/* Lemn (fibre verticale) */}
      <pattern id="p-wood" patternUnits="userSpaceOnUse" width="10" height="12">
        <rect width="10" height="12" fill="#c8a171" />
        <path d="M2,0 L2,12" stroke="#a07843" strokeWidth="0.6" opacity="0.7" />
        <path d="M5,0 L5,12" stroke="#8d6b3a" strokeWidth="0.5" opacity="0.6" />
        <path d="M8,0 L8,12" stroke="#a07843" strokeWidth="0.5" opacity="0.6" />
      </pattern>

      {/* Sol (hașură) */}
      <pattern id="p-soil" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#8d6e5a" />
        <path d="M0,8 L8,0" stroke="#5d4638" strokeWidth="0.7" opacity="0.5" />
        <circle cx="3" cy="3" r="0.5" fill="#6d5243" opacity="0.6" />
        <circle cx="6" cy="6" r="0.4" fill="#4a3628" opacity="0.7" />
      </pattern>

      {/* Pietriș drenaj */}
      <pattern id="p-gravel" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#c4b89f" />
        <circle cx="2" cy="3" r="1.2" fill="#9c8d74" />
        <circle cx="6" cy="6" r="1" fill="#a59977" />
        <circle cx="8.5" cy="2" r="0.8" fill="#877659" />
      </pattern>

      {/* Metal (gradient vertical) */}
      <linearGradient id="g-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d0d3d7" />
        <stop offset="50%" stopColor="#8a8e94" />
        <stop offset="100%" stopColor="#5f6267" />
      </linearGradient>

      {/* Sticlă (albastru reflex) */}
      <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7fb8e0" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#b8dff5" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#5a9fd0" stopOpacity="0.6" />
      </linearGradient>

      {/* Aer exterior (albastru pal) */}
      <linearGradient id="g-ext" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e3f2fd" />
        <stop offset="100%" stopColor="#c4e0f5" />
      </linearGradient>

      {/* Aer interior (crem cald) */}
      <linearGradient id="g-int" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff8e7" />
        <stop offset="100%" stopColor="#ffe8cc" />
      </linearGradient>

      {/* Overlay căldură punte */}
      <radialGradient id="g-heat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ff4b2b" stopOpacity="0.55" />
        <stop offset="60%" stopColor="#ff8c42" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#ff8c42" stopOpacity="0" />
      </radialGradient>

      {/* Săgeată flux termic */}
      <marker id="arrow-heat" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#ff4b2b" />
      </marker>

      {/* Armătură (linii punctate peste beton) */}
      <pattern id="p-rebar" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="transparent" />
        <circle cx="3" cy="3" r="0.7" fill="none" stroke="#2a2c2f" strokeWidth="0.4" strokeDasharray="0.8 0.8" />
      </pattern>
    </defs>
  );
}

// ── Primitive reutilizabile ──────────────────────────────────────────────────

function Label({ x, y, children, color = "#37474f", size = 9, anchor = "start", bold = false }) {
  return (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontWeight={bold ? 700 : 400} style={{ letterSpacing: "0.3px" }}>
      {children}
    </text>
  );
}

function HeatZone({ x, y, w, h, rx = 4 }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#g-heat)" />;
}

function HeatArrow({ x1, y1, x2, y2 }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff4b2b" strokeWidth="1.4" markerEnd="url(#arrow-heat)" opacity="0.85" />;
}

function PsiBadge({ psi, x = 10, y = H - 10 }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-4" y="-10" width="92" height="14" rx="3" fill="rgba(255,255,255,0.92)" stroke="#ff4b2b" strokeWidth="0.8" />
      <text x="0" y="0" fontSize="10" fontWeight="700" fill="#c62828">Ψ = {psi} W/(m·K)</text>
    </g>
  );
}

// ── Ilustrații per categorie ─────────────────────────────────────────────────

function IllustrationWallFloorIntermediate({ bridge }) {
  // Perete cu ETICS + planșeu beton intermediar penetrant
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H} fill="url(#g-int)" />
      {/* Planșeu beton (interior) */}
      <rect x={W * 0.38} y={H / 2 - 11} width={W * 0.62} height="22" fill="url(#p-conc)" />
      <rect x={W * 0.38} y={H / 2 - 11} width={W * 0.62} height="22" fill="url(#p-rebar)" opacity="0.4" />
      {/* Perete zidărie + ETICS */}
      <rect x={W * 0.32} y="10" width={W * 0.08} height={H - 20} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="10" width={W * 0.10} height={H - 20} fill="url(#p-eps)" />
      {/* Tencuială exterioară */}
      <rect x={W * 0.205} y="10" width="4" height={H - 20} fill="#e8e3d5" />
      {/* Plintă soclu */}
      <rect x={W * 0.2} y={H - 10} width={W * 0.22} height="10" fill="#78716c" />
      {/* Punte termică zona planșeu–perete */}
      <HeatZone x={W * 0.2} y={H / 2 - 20} w={W * 0.25} h={40} />
      <HeatArrow x1={W * 0.37} y1={H / 2} x2={W * 0.23} y2={H / 2} />
      {/* Linie punctată pentru întreruperea izolației */}
      <path d={`M${W * 0.34},${H / 2 - 11} L${W * 0.34},${H / 2 + 11}`} stroke="#ff4b2b" strokeWidth="1.5" strokeDasharray="3 2" />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXTERIOR</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INTERIOR</Label>
      <Label x={W * 0.23} y="30" color="#6b4800" size="8">EPS</Label>
      <Label x={W * 0.33} y="30" color="#6d2818" size="8">zidărie</Label>
      <Label x={W - 15} y={H / 2 + 4} anchor="end" color="#37474f" size="8">planșeu beton</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationWallFloorRoof({ bridge }) {
  // Perete + planșeu terasă cu atic
  return (
    <>
      <rect x="0" y="0" width={W} height={H * 0.55} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.55} width={W} height={H * 0.45} fill="url(#g-int)" />
      {/* Planșeu beton terasă */}
      <rect x={W * 0.22} y={H * 0.48} width={W - W * 0.22} height="18" fill="url(#p-conc)" />
      <rect x={W * 0.22} y={H * 0.48} width={W - W * 0.22} height="18" fill="url(#p-rebar)" opacity="0.4" />
      {/* Izolație terasă (peste planșeu) */}
      <rect x={W * 0.22} y={H * 0.35} width={W - W * 0.22} height="18" fill="url(#p-xps)" />
      {/* Membrană hidroizolație */}
      <rect x={W * 0.22} y={H * 0.33} width={W - W * 0.22} height="3" fill="#263238" />
      {/* Perete zidărie + ETICS */}
      <rect x={W * 0.32} y={H * 0.56} width={W * 0.08} height={H * 0.4} fill="url(#p-brick)" />
      <rect x={W * 0.22} y={H * 0.33} width={W * 0.10} height={H * 0.63} fill="url(#p-eps)" />
      {/* Atic */}
      <rect x={W * 0.22} y={H * 0.20} width={W * 0.18} height={H * 0.18} fill="url(#p-conc)" />
      <rect x={W * 0.20} y={H * 0.18} width="4" height={H * 0.20} fill="#e8e3d5" />
      {/* Punte termică */}
      <HeatZone x={W * 0.18} y={H * 0.42} w={W * 0.28} h={H * 0.2} />
      <HeatArrow x1={W * 0.37} y1={H * 0.55} x2={W * 0.21} y2={H * 0.55} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (pod/terasă)</Label>
      <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INTERIOR</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationWallGround({ bridge, asSoil = true }) {
  // Perete + planșeu pe sol sau peste subsol
  return (
    <>
      <rect x="0" y="0" width={W} height={H / 2} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H / 2} fill="url(#g-int)" />
      {/* Sol sau subsol */}
      <rect x="0" y={H / 2} width={W} height={H / 2} fill={asSoil ? "url(#p-soil)" : "url(#g-int)"} opacity="0.95" />
      {/* Fundație beton */}
      <rect x={W * 0.22} y={H / 2 - 4} width={W * 0.25} height={H * 0.35} fill="url(#p-conc)" />
      {/* Placă pe sol */}
      <rect x={W * 0.38} y={H / 2 - 8} width={W * 0.62} height="14" fill="url(#p-conc)" />
      <rect x={W * 0.38} y={H / 2 - 8} width={W * 0.62} height="14" fill="url(#p-rebar)" opacity="0.4" />
      {/* Izolație sub placă */}
      <rect x={W * 0.38} y={H / 2 + 6} width={W * 0.62} height="10" fill="url(#p-xps)" />
      {/* Izolație perimetrală XPS */}
      <rect x={W * 0.19} y={H / 2 - 8} width="8" height={H * 0.35} fill="url(#p-xps)" />
      {/* Perete + ETICS */}
      <rect x={W * 0.32} y="10" width={W * 0.08} height={H / 2 - 4} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="10" width={W * 0.10} height={H / 2 - 4} fill="url(#p-eps)" />
      <rect x={W * 0.205} y="10" width="4" height={H / 2 - 4} fill="#e8e3d5" />
      {/* Zonă punte */}
      <HeatZone x={W * 0.18} y={H / 2 - 18} w={W * 0.28} h={35} />
      <HeatArrow x1={W * 0.37} y1={H / 2} x2={W * 0.21} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXTERIOR</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INTERIOR</Label>
      <Label x="10" y={H - 10} color={asSoil ? "#5d4638" : "#546e7a"} size="9" bold>{asSoil ? "SOL" : "SUBSOL"}</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationCorner({ bridge, internal = false }) {
  // Colț exterior / interior — vedere în plan
  const cx = W / 2, cy = H / 2;
  if (internal) {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-int)" />
        <path d={`M0,0 L${cx},0 L${cx},${cy} L${W},${cy} L${W},${H} L0,${H} Z`} fill="url(#g-ext)" />
        <rect x={cx - 14} y="0" width="14" height={cy} fill="url(#p-brick)" />
        <rect x="0" y={cy - 14} width={cx} height="14" fill="url(#p-brick)" />
        <rect x={cx} y="0" width="10" height={cy + 10} fill="url(#p-eps)" />
        <rect x="0" y={cy} width={cx + 10} height="10" fill="url(#p-eps)" />
        <circle cx={cx} cy={cy} r="18" fill="url(#g-heat)" opacity="0.7" />
        <Label x="10" y="18" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W - 10} y={H - 10} anchor="end" color="#1976d2" size="10" bold>EXT</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }
  // exterior — un colț convex al clădirii
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={cx} y={cy} width={W - cx} height={H - cy} fill="url(#g-int)" />
      <rect x={cx - 14} y={cy} width="14" height={H - cy} fill="url(#p-brick)" />
      <rect x={cx} y={cy - 14} width={W - cx} height="14" fill="url(#p-brick)" />
      <rect x={cx - 24} y={cy} width="10" height={H - cy + 5} fill="url(#p-eps)" />
      <rect x={cx - 14} y={cy - 24} width={W - cx + 10} height="10" fill="url(#p-eps)" />
      <circle cx={cx - 7} cy={cy - 7} r="22" fill="url(#g-heat)" />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXTERIOR</Label>
      <Label x={W - 10} y={H - 10} anchor="end" color="#2e7d32" size="10" bold>INTERIOR</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationWindow({ bridge }) {
  const inInsul = bridge.name.includes("în izolație") || bridge.name.includes("complet izolat");
  const frameX = inInsul ? W * 0.22 : W * 0.32;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H} fill="url(#g-int)" />
      {/* Perete + ETICS */}
      <rect x={W * 0.32} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Glaf exterior */}
      <rect x={W * 0.18} y={H * 0.58} width={W * 0.16} height="4" fill="url(#g-metal)" />
      {/* Rama fereastră */}
      <rect x={frameX - 2} y={H * 0.22} width="22" height={H * 0.4} fill="#f4f1eb" stroke="#5a5550" strokeWidth="1" />
      {/* Sticlă */}
      <rect x={frameX + 2} y={H * 0.25} width="14" height={H * 0.35} fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.5" />
      <line x1={frameX + 5} y1={H * 0.26} x2={frameX + 5} y2={H * 0.58} stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      {/* Bandă precomprimată (doar dacă e montaj în izolație) */}
      {inInsul && <rect x={frameX - 4} y={H * 0.22} width="2" height={H * 0.4} fill="#a0522d" />}
      {/* Punte termică */}
      <HeatZone x={frameX - 10} y={H * 0.2} w="36" h={H * 0.44} />
      <HeatArrow x1={frameX + 25} y1={H * 0.42} x2={frameX - 6} y2={H * 0.42} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x="10" y={H * 0.18} color="#37474f" size="8">{inInsul ? "montaj în izolație" : "montaj standard"}</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationBalcony({ bridge }) {
  const hasBreak = bridge.name.toLowerCase().includes("ruptoare") || bridge.name.toLowerCase().includes("izokorb") || bridge.name.toLowerCase().includes("isokorb");
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.42} y="0" width={W * 0.58} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={W * 0.36} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.26} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Placa balcon + planșeu interior */}
      <rect x="20" y={H / 2 - 9} width={W * 0.26} height="18" fill="url(#p-conc)" />
      <rect x={W * 0.36} y={H / 2 - 9} width={W * 0.64} height="18" fill="url(#p-conc)" />
      <rect x="20" y={H / 2 - 9} width={W - 40} height="18" fill="url(#p-rebar)" opacity="0.35" />
      {/* Balcon - parapet */}
      <rect x="22" y={H / 2 - 40} width="5" height="32" fill="#999" />
      <rect x="22" y={H / 2 - 44} width={W * 0.24} height="5" fill="#b0b0b0" />
      {/* Ruptor termic (dacă e cazul) */}
      {hasBreak && (
        <g>
          <rect x={W * 0.34} y={H / 2 - 9} width="6" height="18" fill="#ff9800" />
          <rect x={W * 0.34} y={H / 2 - 9} width="6" height="18" fill="url(#p-mw)" opacity="0.5" />
          <Label x={W * 0.34 + 3} y={H / 2 - 14} color="#e65100" size="7" bold anchor="middle">Isokorb</Label>
        </g>
      )}
      {/* Punte termică (mare dacă neîntrerupt, mică dacă are ruptor) */}
      <HeatZone x={W * 0.24} y={H / 2 - 18} w={hasBreak ? W * 0.13 : W * 0.2} h={36} />
      {!hasBreak && <HeatArrow x1={W * 0.43} y1={H / 2} x2={W * 0.26} y2={H / 2} />}
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (balcon)</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationRoof({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.6} width={W} height={H * 0.4} fill="url(#g-int)" />
      {/* Şarpantă (triunghi simplu) */}
      <polygon points={`${W / 2},15 25,${H * 0.52} ${W - 25},${H * 0.52}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
      {/* Țigle */}
      <polygon points={`${W / 2},15 25,${H * 0.52} ${W - 25},${H * 0.52}`} fill="#8d6e47" opacity="0.7" />
      <line x1={W / 2 - 25} y1="37" x2={W / 2 + 25} y2="37" stroke="#5d4433" strokeWidth="0.5" opacity="0.8" />
      <line x1={W / 2 - 40} y1="55" x2={W / 2 + 40} y2="55" stroke="#5d4433" strokeWidth="0.5" opacity="0.8" />
      <line x1={W / 2 - 55} y1="75" x2={W / 2 + 55} y2="75" stroke="#5d4433" strokeWidth="0.5" opacity="0.8" />
      {/* Izolație între căpriori */}
      <polygon points={`${W / 2},28 38,${H * 0.50} ${W - 38},${H * 0.50} ${W / 2},28`} fill="url(#p-mw)" />
      {/* Perete */}
      <rect x={W * 0.38} y={H * 0.52} width="22" height={H * 0.5} fill="url(#p-brick)" />
      <rect x={W * 0.30} y={H * 0.52} width="24" height={H * 0.5} fill="url(#p-eps)" />
      {/* Streașină */}
      <rect x={W * 0.22} y={H * 0.48} width={W * 0.18} height="6" fill="#c8a47b" />
      {/* Punte termică la streașină */}
      <HeatZone x={W * 0.25} y={H * 0.44} w={W * 0.22} h={30} />
      <HeatArrow x1={W * 0.40} y1={H * 0.55} x2={W * 0.28} y2={H * 0.52} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationColumnBeam({ bridge }) {
  const isMetal = bridge.name.toLowerCase().includes("metalic") || bridge.name.toLowerCase().includes("oțel") || bridge.name.toLowerCase().includes("hea") || bridge.name.toLowerCase().includes("heb");
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
      {/* Perete zidărie */}
      <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      {/* ETICS */}
      <rect x={W * 0.35} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Element structural */}
      {isMetal ? (
        <g>
          {/* Profil HEA simplificat */}
          <rect x={W * 0.46} y={H * 0.15} width={W * 0.08} height={H * 0.7} fill="url(#g-metal)" stroke="#2a2c2f" strokeWidth="0.6" />
          <rect x={W * 0.46} y={H * 0.15} width={W * 0.08} height="4" fill="#2a2c2f" />
          <rect x={W * 0.46} y={H * 0.85 - 4} width={W * 0.08} height="4" fill="#2a2c2f" />
          <Label x={W * 0.50} y={H * 0.10} color="#37474f" size="8" anchor="middle" bold>HEA</Label>
        </g>
      ) : (
        <g>
          <rect x={W * 0.46} y={H * 0.15} width={W * 0.08} height={H * 0.7} fill="url(#p-conc)" />
          <rect x={W * 0.46} y={H * 0.15} width={W * 0.08} height={H * 0.7} fill="url(#p-rebar)" opacity="0.4" />
          <Label x={W * 0.50} y={H * 0.10} color="#37474f" size="8" anchor="middle" bold>beton armat</Label>
        </g>
      )}
      {/* Punte termică */}
      <HeatZone x={W * 0.34} y={H * 0.3} w={W * 0.22} h={H * 0.4} />
      <HeatArrow x1={W * 0.56} y1={H * 0.5} x2={W * 0.35} y2={H * 0.5} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationService({ bridge }) {
  const isChimney = bridge.name.toLowerCase().includes("coș");
  const isDuct = bridge.name.toLowerCase().includes("canal") || bridge.name.toLowerCase().includes("ventila");
  const isCable = bridge.name.toLowerCase().includes("cablu");
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.52} y="0" width={W * 0.48} height={H} fill="url(#g-int)" />
      <rect x={W * 0.42} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.32} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {isChimney ? (
        <g>
          <rect x={W * 0.1} y={H * 0.1} width="22" height={H * 0.85} fill="url(#p-brick)" />
          <rect x={W * 0.1 + 4} y={H * 0.1} width="14" height={H * 0.85} fill="#3a342c" />
          <Label x={W * 0.1 + 11} y={H * 0.06} color="#37474f" size="8" anchor="middle" bold>coș</Label>
        </g>
      ) : isDuct ? (
        <g>
          <rect x="20" y={H / 2 - 12} width={W - 40} height="24" fill="url(#g-metal)" stroke="#444" strokeWidth="0.6" />
          <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke="#888" strokeDasharray="2 2" strokeWidth="0.5" />
          <Label x="30" y={H / 2 - 16} color="#37474f" size="8" bold>canal ventilație</Label>
        </g>
      ) : isCable ? (
        <g>
          <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke="#2a2a2a" strokeWidth="3" />
          <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke="#c0392b" strokeWidth="1" />
          <Label x="30" y={H / 2 - 6} color="#37474f" size="8" bold>cablu electric</Label>
        </g>
      ) : (
        <g>
          {/* Țeavă generică */}
          <rect x="20" y={H / 2 - 7} width={W - 40} height="14" fill="url(#g-metal)" rx="7" />
          <Label x="30" y={H / 2 - 10} color="#37474f" size="8" bold>țeavă</Label>
        </g>
      )}
      <HeatZone x={W * 0.30} y={H / 2 - 24} w={W * 0.22} h={48} />
      <HeatArrow x1={W * 0.53} y1={H / 2} x2={W * 0.32} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationFoundation({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H * 0.35} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.45} fill="url(#g-int)" />
      <rect x="0" y={H * 0.35} width={W} height={H * 0.65} fill="url(#p-soil)" />
      {/* Pietriș drenaj */}
      <rect x={W * 0.05} y={H * 0.68} width={W * 0.25} height="14" fill="url(#p-gravel)" />
      {/* Fundație beton */}
      <rect x={W * 0.25} y={H * 0.4} width={W * 0.22} height={H * 0.55} fill="url(#p-conc)" />
      {/* Placă beton */}
      <rect x={W * 0.38} y={H * 0.40} width={W * 0.62} height="16" fill="url(#p-conc)" />
      <rect x={W * 0.38} y={H * 0.40} width={W * 0.62} height="16" fill="url(#p-rebar)" opacity="0.4" />
      {/* Izolație sub placă */}
      <rect x={W * 0.38} y={H * 0.40 + 16} width={W * 0.62} height="12" fill="url(#p-xps)" />
      {/* Izolație perimetrală */}
      <rect x={W * 0.21} y={H * 0.4} width="10" height={H * 0.55} fill="url(#p-xps)" />
      {/* Perete + ETICS */}
      <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.30} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.30} fill="url(#p-eps)" />
      <HeatZone x={W * 0.19} y={H * 0.3} w={W * 0.3} h={H * 0.22} />
      <HeatArrow x1={W * 0.37} y1={H * 0.4} x2={W * 0.23} y2={H * 0.4} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationTimber({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.45} y="0" width={W * 0.55} height={H} fill="url(#g-int)" />
      {/* Rigle/structură lemn (montanți verticali) */}
      <rect x={W * 0.35} y="10" width="10" height={H - 20} fill="url(#p-wood)" />
      <rect x={W * 0.42} y="10" width="10" height={H - 20} fill="url(#p-wood)" />
      {/* Izolație vată între montanți */}
      <rect x={W * 0.26} y="10" width={W * 0.09} height={H - 20} fill="url(#p-mw)" />
      {/* OSB interior */}
      <rect x={W * 0.52} y="10" width="6" height={H - 20} fill="#c9a575" />
      {/* Planșeu lemn intermediar */}
      <rect x={W * 0.26} y={H / 2 - 7} width={W * 0.74} height="14" fill="url(#p-wood)" />
      <HeatZone x={W * 0.22} y={H / 2 - 14} w={W * 0.28} h={28} />
      <HeatArrow x1={W * 0.46} y1={H / 2} x2={W * 0.25} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.27} y="30" color="#8f7a4e" size="8">vată</Label>
      <Label x={W * 0.36} y="30" color="#7a5320" size="8">lemn</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationETICS({ bridge }) {
  // Diblu / ancoră / profil
  const isAnchor = bridge.name.toLowerCase().includes("diblu") || bridge.name.toLowerCase().includes("ancoră") || bridge.name.toLowerCase().includes("tijă") || bridge.name.toLowerCase().includes("conector");
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
      <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.30} y="0" width={W * 0.15} height={H} fill="url(#p-eps)" />
      {/* Tencuială exterioară */}
      <rect x={W * 0.285} y="0" width="5" height={H} fill="#e8e3d5" />
      {isAnchor ? (
        <g>
          {/* Câțiva dibluri reprezentativi */}
          {[0.2, 0.45, 0.7].map((fy) => (
            <g key={fy}>
              <line x1={W * 0.29} y1={H * fy} x2={W * 0.52} y2={H * fy} stroke="#333" strokeWidth="1.5" />
              <circle cx={W * 0.29} cy={H * fy} r="2.5" fill="#ffecb3" stroke="#333" strokeWidth="0.5" />
            </g>
          ))}
          <Label x={W * 0.41} y={H * 0.15} color="#37474f" size="8" anchor="middle" bold>dibluri (χ)</Label>
        </g>
      ) : (
        <g>
          {/* Profil racord (soclu sau colț) */}
          <rect x={W * 0.28} y={H * 0.55} width="4" height={H * 0.45} fill="url(#g-metal)" />
          <rect x={W * 0.28} y={H * 0.55} width={W * 0.15} height="4" fill="url(#g-metal)" />
          <Label x={W * 0.35} y={H * 0.52} color="#37474f" size="8" anchor="middle">profil racord</Label>
        </g>
      )}
      <HeatZone x={W * 0.28} y={H * 0.3} w={W * 0.24} h={H * 0.4} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationCurtainWall({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.45} y="0" width={W * 0.55} height={H} fill="url(#g-int)" />
      {/* Planșeu beton */}
      <rect x={W * 0.15} y={H / 2 - 10} width={W - W * 0.15} height="20" fill="url(#p-conc)" />
      <rect x={W * 0.15} y={H / 2 - 10} width={W - W * 0.15} height="20" fill="url(#p-rebar)" opacity="0.4" />
      {/* Mullion vertical aluminium */}
      <rect x={W * 0.38} y="10" width="8" height={H - 20} fill="url(#g-metal)" />
      {/* Sticlă panouri */}
      <rect x={W * 0.15} y="20" width={W * 0.22} height={H / 2 - 32} fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.6" />
      <rect x={W * 0.15} y={H / 2 + 12} width={W * 0.22} height={H / 2 - 32} fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.6" />
      {/* Panou spandrel (opac între etaje) */}
      <rect x={W * 0.15} y={H / 2 - 10} width={W * 0.22} height="20" fill="#546e7a" />
      {/* Punte la mullion × planșeu */}
      <HeatZone x={W * 0.32} y={H / 2 - 20} w={W * 0.2} h="40" />
      <HeatArrow x1={W * 0.47} y1={H / 2} x2={W * 0.36} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.40} y="30" color="#37474f" size="7" anchor="middle">mullion Al</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationGenericFallback({ bridge }) {
  // Fallback — perete + punte centrală generică
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.5} y="0" width={W * 0.5} height={H} fill="url(#g-int)" />
      <rect x={W * 0.40} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.30} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      <HeatZone x={W * 0.28} y={H / 2 - 28} w={W * 0.24} h={56} />
      <HeatArrow x1={W * 0.51} y1={H / 2} x2={W * 0.32} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W / 2} y={H / 2 + 4} anchor="middle" color="#c62828" size="8" bold>{bridge.cat}</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

// ── Router principal ─────────────────────────────────────────────────────────

function pickIllustration(bridge) {
  const cat = bridge.cat || "";
  const name = (bridge.name || "").toLowerCase();

  if (cat === "Joncțiuni pereți" || cat === "Joncțiuni pereți – tipuri speciale" || cat === "Joncțiuni speciale") {
    if (name.includes("colț exterior") || name.includes("colt exterior")) return <IllustrationCorner bridge={bridge} internal={false} />;
    if (name.includes("colț interior") || name.includes("colt interior")) return <IllustrationCorner bridge={bridge} internal={true} />;
    if (name.includes("planșeu intermediar") || name.includes("planseu intermediar") || name.includes("perete int")) return <IllustrationWallFloorIntermediate bridge={bridge} />;
    if (name.includes("terasă") || name.includes("terasa") || name.includes("pod") || name.includes("cornișă") || name.includes("coamă") || name.includes("streașină") || name.includes("atic")) return <IllustrationWallFloorRoof bridge={bridge} />;
    if (name.includes("sol") || name.includes("subsol") || name.includes("fundație") || name.includes("fundatie") || name.includes("soclu") || name.includes("radier")) return <IllustrationWallGround bridge={bridge} asSoil={!name.includes("subsol")} />;
    return <IllustrationWallFloorIntermediate bridge={bridge} />;
  }

  if (cat === "Ferestre" || cat === "Ferestre și uși – tipuri speciale" || cat === "Fațade și ferestre avansate") {
    if (name.includes("cortină") || name.includes("cortina") || name.includes("spandrel") || name.includes("mullion")) return <IllustrationCurtainWall bridge={bridge} />;
    return <IllustrationWindow bridge={bridge} />;
  }

  if (cat === "Balcoane" || cat === "Balcoane avansate" || cat === "Balcoane și logii – tipuri speciale") {
    return <IllustrationBalcony bridge={bridge} />;
  }

  if (cat === "Acoperiș" || cat === "Acoperiș avansat" || cat === "Acoperiș – tipuri speciale") {
    if (name.includes("atic") || name.includes("parapet") || name.includes("terasă") || name.includes("terasa")) return <IllustrationWallFloorRoof bridge={bridge} />;
    return <IllustrationRoof bridge={bridge} />;
  }

  if (cat === "Stâlpi/grinzi" || cat === "Structuri speciale" || cat === "Structuri prefabricate") {
    return <IllustrationColumnBeam bridge={bridge} />;
  }

  if (cat === "Instalații" || cat === "Instalații avansate" || cat === "Instalații – tipuri speciale") {
    return <IllustrationService bridge={bridge} />;
  }

  if (cat === "Fundații și subsol") {
    return <IllustrationFoundation bridge={bridge} />;
  }

  if (cat === "Structuri din lemn") {
    return <IllustrationTimber bridge={bridge} />;
  }

  if (cat === "Sisteme ETICS" || cat === "Elemente punctuale (chi)") {
    return <IllustrationETICS bridge={bridge} />;
  }

  return <IllustrationGenericFallback bridge={bridge} />;
}

// ── Component public ─────────────────────────────────────────────────────────

export default function BridgeIllustration({ bridge }) {
  if (!bridge) return null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }}
      role="img"
      aria-label={`Secțiune ilustrativă: ${bridge.name}`}
    >
      <Defs />
      {pickIllustration(bridge)}
    </svg>
  );
}
