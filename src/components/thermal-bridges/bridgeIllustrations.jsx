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

/**
 * Cotă dimensională cu săgeți și valoare (stil arhitectural).
 * Orientare: "h" = orizontală, "v" = verticală.
 */
function Dimension({ x1, y1, x2, y2, label, orientation = "h", offset = 8 }) {
  const dx = orientation === "h" ? 0 : offset;
  const dy = orientation === "h" ? offset : 0;
  const mx = (x1 + x2) / 2 + dx * 1.5;
  const my = (y1 + y2) / 2 + dy * 1.5;
  // extensor lines
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={x1 + dx} y2={y1 + dy} stroke="#455a64" strokeWidth="0.4" />
      <line x1={x2} y1={y2} x2={x2 + dx} y2={y2 + dy} stroke="#455a64" strokeWidth="0.4" />
      <line x1={x1 + dx} y1={y1 + dy} x2={x2 + dx} y2={y2 + dy} stroke="#455a64" strokeWidth="0.5" />
      {/* small arrow ticks */}
      <circle cx={x1 + dx} cy={y1 + dy} r="1" fill="#455a64" />
      <circle cx={x2 + dx} cy={y2 + dy} r="1" fill="#455a64" />
      <text
        x={mx}
        y={my - (orientation === "h" ? 2 : 0)}
        fontSize="8"
        fill="#263238"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Zonă de risc condensare (când fRsi < 0.75).
 * Marcată cu pattern hașurat albastru-mov + label.
 */
function CondensationZone({ x, y, w, h, fRsi }) {
  if (fRsi >= 0.80) return null;
  const severity = fRsi < 0.65 ? "severe" : fRsi < 0.75 ? "moderate" : "mild";
  const color = severity === "severe" ? "#0891b2" : severity === "moderate" ? "#06b6d4" : "#67e8f9";
  const label = severity === "severe" ? "CONDENS" : "risc cond.";
  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <pattern id={`p-cond-${severity}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="0.8" opacity="0.6" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#p-cond-${severity})`} rx="3" />
      <rect x={x} y={y} width={w} height={h} stroke={color} strokeDasharray="3 2" strokeWidth="0.7" fill="none" rx="3" />
      <g transform={`translate(${x + w - 30}, ${y + 8})`}>
        <rect x="0" y="-7" width="28" height="9" rx="2" fill={color} opacity="0.9" />
        <text x="14" y="0" fontSize="7" fontWeight="600" fill="white" textAnchor="middle">{label}</text>
      </g>
    </g>
  );
}

/**
 * Indicator isotermă — linie curbată între INT și EXT care arată unde
 * scade temperatura prin element. Sugestiv (nu calculat).
 */
function IsothermHint({ x, y, w, h, color = "#ef4444" }) {
  // Curbă simplă care arată convergența isotermelor în zona puntii
  const cx = x + w / 2;
  const path = `M ${x + 5} ${y + h / 4} Q ${cx - 5} ${y + h / 2} ${cx + 10} ${y + 3 * h / 4}`;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path d={path} stroke={color} strokeWidth="0.8" fill="none" strokeDasharray="2 2" opacity="0.7" />
      <circle cx={cx} cy={y + h / 2} r="2" fill={color} opacity="0.6" />
    </g>
  );
}

/**
 * Badge mic sus pentru clasă ISO 14683 A/B/C/D
 */
function IsoClassBadge({ isoClass, x = W - 38, y = 8 }) {
  const color = isoClass === "A" ? "#10b981" : isoClass === "B" ? "#22d3ee" : isoClass === "C" ? "#f59e0b" : "#ef4444";
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <rect x="0" y="0" width="30" height="14" rx="3" fill={color} opacity="0.95" />
      <text x="15" y="10" fontSize="9" fontWeight="700" fill="white" textAnchor="middle" fontFamily="monospace">
        ISO {isoClass}
      </text>
    </g>
  );
}

/**
 * Indicator prioritate 1-5 stele portocaliu-roșu (colț superior stânga).
 */
function PriorityBadge({ priority = 3, x = 8, y = 8 }) {
  const stars = "★".repeat(Math.max(1, Math.min(5, priority)));
  const color = priority >= 4 ? "#dc2626" : priority >= 3 ? "#f97316" : "#fbbf24";
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <rect x="0" y="0" width={5 * priority + 6} height="12" rx="2" fill="rgba(255,255,255,0.85)" />
      <text x="3" y="9" fontSize="9" fill={color} fontFamily="monospace" fontWeight="700">{stars}</text>
    </g>
  );
}

/**
 * Wrapper meta-ilustrație: primește bridge + detaliile extinse (fRsi, prioritate,
 * clasă ISO) și adaugă overlay-uri deasupra ilustrației de bază.
 */
export function IllustrationOverlay({ fRsi, priority, isoClass, condZone }) {
  return (
    <>
      {isoClass && <IsoClassBadge isoClass={isoClass} />}
      {priority != null && <PriorityBadge priority={priority} />}
      {condZone && typeof fRsi === "number" && <CondensationZone {...condZone} fRsi={fRsi} />}
    </>
  );
}

// Exportă primitive pentru utilizare ad-hoc dacă este nevoie
export { Dimension, CondensationZone, IsothermHint, IsoClassBadge, PriorityBadge };

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

function IllustrationWindow({ bridge, variant }) {
  // variant: "standard" | "in-insulation" | "deep-ph" | "sill" | "threshold" | "deep-metal-sill"
  const v = variant || "standard";

  // Poziția ramei în perete (în-plan zidărie vs. în izolație vs. foarte adânc în izolație)
  const frameX =
    v === "deep-ph" ? W * 0.19 :
    v === "in-insulation" ? W * 0.23 :
    v === "deep-metal-sill" ? W * 0.23 :
    W * 0.33; // standard — în planul zidăriei

  const showHeatZone = v !== "deep-ph"; // Passivhaus aproape zero punte
  const showPrecompBand = v === "in-insulation" || v === "deep-ph";

  // Varianta "sill" = pervazul sub fereastră (vedere secțiune orizontală)
  if (v === "sill") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.45} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.45} width={W} height={H * 0.55} fill="url(#g-int)" />
        {/* Perete + ETICS */}
        <rect x={W * 0.22} y={H * 0.45} width={W * 0.10} height={H * 0.55} fill="url(#p-eps)" />
        <rect x={W * 0.32} y={H * 0.45} width={W * 0.08} height={H * 0.55} fill="url(#p-brick)" />
        {/* Zidărie sub fereastră */}
        <rect x={W * 0.32} y={H * 0.45} width={W * 0.68} height={H * 0.28} fill="url(#p-brick)" />
        {/* Izolație continuă peste pervaz */}
        <rect x={W * 0.22} y={H * 0.4} width={W * 0.78} height="8" fill="url(#p-eps)" />
        {/* Glaf metalic exterior (cu scurgere apei) */}
        <path d={`M${W * 0.22},${H * 0.4} L${W - 10},${H * 0.4} L${W - 10},${H * 0.38} L${W * 0.22},${H * 0.42} Z`} fill="url(#g-metal)" />
        {/* Rama fereastră (vedere secțiune orizontală) */}
        <rect x={frameX - 2} y={H * 0.3} width="22" height="14" fill="#f4f1eb" stroke="#5a5550" strokeWidth="1" />
        {/* Radiator sub fereastră (nișă) */}
        <rect x={W * 0.45} y={H * 0.60} width={W * 0.25} height={H * 0.25} fill="none" stroke="#607d8b" strokeWidth="1" />
        <Label x={W / 2} y={H * 0.73} color="#607d8b" size="8" anchor="middle">radiator</Label>
        <HeatZone x={frameX - 8} y={H * 0.35} w="32" h={H * 0.16} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (sub glaf)</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INTERIOR</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Varianta "threshold" = prag ușă exterioară
  if (v === "threshold") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.5} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.5} width={W} height={H * 0.5} fill="url(#g-int)" />
        {/* Planșeu */}
        <rect x={W * 0.38} y={H * 0.5} width={W * 0.62} height="16" fill="url(#p-conc)" />
        <rect x={W * 0.38} y={H * 0.5 + 16} width={W * 0.62} height="8" fill="url(#p-xps)" />
        {/* Trotuar exterior */}
        <rect x="0" y={H * 0.52} width={W * 0.22} height={H * 0.1} fill="#9e9e9e" />
        <rect x="0" y={H * 0.62} width={W * 0.22} height={H * 0.38} fill="url(#p-soil)" />
        {/* Perete */}
        <rect x={W * 0.32} y="0" width={W * 0.08} height={H * 0.5} fill="url(#p-brick)" />
        <rect x={W * 0.22} y="0" width={W * 0.10} height={H * 0.5} fill="url(#p-eps)" />
        {/* Ușa */}
        <rect x={W * 0.40} y={H * 0.15} width="6" height={H * 0.35} fill="#6d4c41" />
        <rect x={W * 0.40 + 6} y={H * 0.15} width="12" height={H * 0.35} fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.4" />
        {/* Pragul metalic */}
        <rect x={W * 0.35} y={H * 0.49} width={W * 0.18} height="6" fill="url(#g-metal)" stroke="#333" strokeWidth="0.5" />
        {/* Ruptură termică în prag (optional - verzica dacă are în nume) */}
        {/Ruptur|ruptoare|thermal break/i.test(bridge.name) && (
          <rect x={W * 0.42} y={H * 0.49} width="3" height="6" fill="#ff9800" />
        )}
        <HeatZone x={W * 0.33} y={H * 0.45} w={W * 0.22} h="20" />
        <HeatArrow x1={W * 0.5} y1={H * 0.52} x2={W * 0.36} y2={H * 0.52} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.40} y={H * 0.12} color="#37474f" size="8">ușă</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Standard vertical jamb variants
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H} fill="url(#g-int)" />
      {/* Perete + ETICS */}
      <rect x={W * 0.32} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Glaf exterior metalic */}
      <rect x={W * 0.18} y={H * 0.58} width={W * 0.18} height="4" fill="url(#g-metal)" />
      {/* Rama fereastră */}
      <rect x={frameX - 2} y={H * 0.22} width="22" height={H * 0.4} fill={v === "deep-ph" ? "#2e2a24" : "#f4f1eb"} stroke="#5a5550" strokeWidth="1" />
      {v === "deep-ph" && (
        <>
          {/* Consolă izolantă Compacfoam (portantă pt. Passivhaus RAL) */}
          <rect x={frameX - 8} y={H * 0.21} width="6" height={H * 0.42} fill="#6b5a48" stroke="#3e352a" strokeWidth="0.4" />
          <Label x={frameX - 5} y={H * 0.2} color="#3e352a" size="7" anchor="middle" bold>Compacfoam</Label>
        </>
      )}
      {/* Sticlă */}
      <rect x={frameX + 2} y={H * 0.25} width="14" height={H * 0.35} fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.5" />
      <line x1={frameX + 5} y1={H * 0.26} x2={frameX + 5} y2={H * 0.58} stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      {v === "deep-ph" && <line x1={frameX + 10} y1={H * 0.26} x2={frameX + 10} y2={H * 0.58} stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />}
      {/* Bandă precomprimată */}
      {showPrecompBand && <rect x={frameX - 4} y={H * 0.22} width="2" height={H * 0.4} fill="#a0522d" />}
      {/* Izolație care se revenește peste cercevea (deep PH) */}
      {v === "deep-ph" && <rect x={frameX + 16} y={H * 0.22} width="6" height={H * 0.4} fill="url(#p-eps)" />}
      {/* Punte termică */}
      {showHeatZone && <HeatZone x={frameX - 10} y={H * 0.2} w="36" h={H * 0.44} />}
      {showHeatZone && <HeatArrow x1={frameX + 25} y1={H * 0.42} x2={frameX - 6} y2={H * 0.42} />}
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x="10" y={H * 0.18} color="#37474f" size="8">
        {v === "deep-ph" ? "Passivhaus RAL (console izolante)" :
         v === "in-insulation" ? "montaj în izolație + bandă PE" :
         "montaj standard (în planul zidăriei)"}
      </Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

// Velux — fereastră de mansardă în acoperiș înclinat
function IllustrationVelux({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.7} width={W} height={H * 0.3} fill="url(#g-int)" />
      {/* Şarpantă înclinată */}
      <polygon points={`${W},20 30,${H * 0.65} ${W},${H * 0.65}`} fill="url(#p-wood)" stroke="#6d4c41" strokeWidth="1" />
      {/* Ţigle */}
      <polygon points={`${W},20 30,${H * 0.65} ${W},${H * 0.65}`} fill="#8d6e47" opacity="0.4" />
      {[0.2, 0.35, 0.5, 0.65].map((fy, i) => (
        <line key={i} x1={30 + i * 30} y1={H * 0.65 - i * 20} x2={W} y2={H * 0.65 - i * 20} stroke="#5d4433" strokeWidth="0.5" opacity="0.8" />
      ))}
      {/* Izolație între căpriori */}
      <polygon points={`${W},32 44,${H * 0.59} ${W},${H * 0.59}`} fill="url(#p-mw)" />
      {/* Fereastra Velux înclinată */}
      <g transform={`rotate(-30, ${W * 0.6}, ${H * 0.42})`}>
        <rect x={W * 0.55} y={H * 0.32} width="50" height="28" fill="#f4f1eb" stroke="#5a5550" strokeWidth="1" />
        <rect x={W * 0.55 + 3} y={H * 0.32 + 3} width="44" height="22" fill="url(#g-glass)" stroke="#3a6ea8" strokeWidth="0.4" />
      </g>
      {/* Element de etanșare BBX */}
      <path d={`M${W * 0.53},${H * 0.42} L${W * 0.62},${H * 0.35} L${W * 0.66},${H * 0.39} L${W * 0.57},${H * 0.46} Z`} fill="#37474f" opacity="0.7" />
      <Label x={W * 0.62} y={H * 0.30} color="#e8e3d5" size="8" bold>Velux</Label>
      <HeatZone x={W * 0.52} y={H * 0.35} w="55" h="30" />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (acoperiș)</Label>
      <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT (mansardă)</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationBalcony({ bridge, variant }) {
  // variant: "uninterrupted" | "isokorb-k" | "isokorb-kxt" | "isokorb-ks"
  //          | "halfen-hit" | "steel-pendant" | "loggia" | "precast-gfrp"
  const v = variant || "uninterrupted";
  const name = bridge.name.toLowerCase();
  const hasBreak = v !== "uninterrupted" && v !== "loggia";

  // Steel pendant — balcon suspendat pe cabluri/tiranti metalici
  if (v === "steel-pendant") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.42} y="0" width={W * 0.58} height={H} fill="url(#g-int)" />
        <rect x={W * 0.36} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
        <rect x={W * 0.26} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
        {/* Planșeu interior */}
        <rect x={W * 0.26} y={H / 2 - 9} width={W * 0.74} height="18" fill="url(#p-conc)" />
        <rect x={W * 0.26} y={H / 2 - 9} width={W * 0.74} height="18" fill="url(#p-rebar)" opacity="0.35" />
        {/* Placa balcon MAI JOS (suspendată) */}
        <rect x="20" y={H * 0.62} width={W * 0.24} height="14" fill="url(#p-conc)" />
        <rect x="20" y={H * 0.62} width={W * 0.24} height="14" fill="url(#p-rebar)" opacity="0.35" />
        {/* Tiranti oțel inox */}
        <line x1={W * 0.05} y1={H * 0.62} x2={W * 0.32} y2={H / 2 - 9} stroke="url(#g-metal)" strokeWidth="3" />
        <line x1={W * 0.15} y1={H * 0.62} x2={W * 0.4} y2={H / 2 - 9} stroke="url(#g-metal)" strokeWidth="3" />
        <circle cx={W * 0.32} cy={H / 2 - 9} r="2.5" fill="#444" />
        <circle cx={W * 0.4} cy={H / 2 - 9} r="2.5" fill="#444" />
        <Label x={W * 0.1} y={H * 0.55} color="#37474f" size="7" bold>tiranți oțel</Label>
        <HeatZone x={W * 0.25} y={H / 2 - 16} w={W * 0.12} h={24} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (balcon suspendat)</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Loggia — spațiu semi-închis între apartament și perete exterior
  if (v === "loggia") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        {/* Zona loggia (semi-închisă, neîncălzită) */}
        <rect x={W * 0.06} y="0" width={W * 0.35} height={H} fill="#e8dab0" opacity="0.5" />
        <rect x={W * 0.45} y="0" width={W * 0.55} height={H} fill="url(#g-int)" />
        {/* Parapet beton loggia */}
        <rect x={W * 0.06} y={H / 2 - 40} width="8" height="48" fill="url(#p-conc)" />
        <rect x={W * 0.06} y={H / 2 - 44} width={W * 0.35} height="5" fill="url(#p-conc)" />
        {/* Planșeu balcon-loggia (continuu) */}
        <rect x={W * 0.06} y={H / 2 - 9} width={W * 0.94} height="18" fill="url(#p-conc)" />
        <rect x={W * 0.06} y={H / 2 - 9} width={W * 0.94} height="18" fill="url(#p-rebar)" opacity="0.35" />
        {/* Perete spate loggia */}
        <rect x={W * 0.36} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
        <rect x={W * 0.26} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
        {/* Fereastră/ușă spre apartament */}
        <rect x={W * 0.43} y={H * 0.15} width="10" height={H * 0.33} fill="#f4f1eb" stroke="#5a5550" strokeWidth="0.8" />
        <rect x={W * 0.44} y={H * 0.17} width="6" height={H * 0.29} fill="url(#g-glass)" />
        <HeatZone x={W * 0.24} y={H / 2 - 16} w={W * 0.22} h="32" />
        <HeatArrow x1={W * 0.46} y1={H / 2} x2={W * 0.25} y2={H / 2} />
        <Label x="10" y="18" color="#8c6a00" size="10" bold>LOGGIA</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Variante cu placă balcon în continuarea planșeului + opțional ruptor
  const isIsokorbKXT = v === "isokorb-kxt"; // 120mm Passivhaus
  const isIsokorbKS = v === "isokorb-ks"; // oțel-beton
  const isHalfen = v === "halfen-hit";
  const isGFRP = v === "precast-gfrp";

  const breakWidth = isIsokorbKXT ? 12 : isIsokorbKS ? 10 : isHalfen ? 9 : hasBreak ? 8 : 0;
  const breakColor = isIsokorbKS ? "#bfbfc4" : isGFRP ? "#00897b" : "#ff9800";
  const breakLabel =
    isIsokorbKXT ? "Isokorb KXT (120)" :
    isIsokorbKS ? "Isokorb KS (oțel)" :
    isHalfen ? "Halfen HIT" :
    isGFRP ? "conectori GFRP" :
    v === "isokorb-k" ? "Isokorb K (80)" : null;

  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.42} y="0" width={W * 0.58} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={W * 0.36} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.26} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Placa balcon exterior + planșeu interior */}
      <rect x="20" y={H / 2 - 9} width={W * 0.26} height="18" fill="url(#p-conc)" />
      <rect x={W * 0.36 + (hasBreak ? breakWidth : 0)} y={H / 2 - 9} width={W * 0.64 - (hasBreak ? breakWidth : 0)} height="18" fill="url(#p-conc)" />
      <rect x="20" y={H / 2 - 9} width={W - 40} height="18" fill="url(#p-rebar)" opacity="0.35" />
      {/* Parapet */}
      <rect x="22" y={H / 2 - 40} width="5" height="32" fill="#999" />
      <rect x="22" y={H / 2 - 44} width={W * 0.24} height="5" fill="#b0b0b0" />
      {/* Ruptor termic (cu tip diferit) */}
      {hasBreak && (
        <g>
          <rect x={W * 0.36} y={H / 2 - 9} width={breakWidth} height="18" fill={breakColor} />
          {/* Izolație Neopor în ruptor */}
          <rect x={W * 0.36} y={H / 2 - 9} width={breakWidth} height="18" fill="url(#p-mw)" opacity="0.45" />
          {/* Armături orizontale vizibile (oțel inox pt KS/KXT) */}
          {(isIsokorbKS || isIsokorbKXT || isHalfen) && (
            <>
              <line x1={W * 0.3} y1={H / 2 - 4} x2={W * 0.5} y2={H / 2 - 4} stroke="#222" strokeWidth="0.9" />
              <line x1={W * 0.3} y1={H / 2 + 4} x2={W * 0.5} y2={H / 2 + 4} stroke="#222" strokeWidth="0.9" />
            </>
          )}
          {/* Profil metalic oțel (pt KS) */}
          {isIsokorbKS && <rect x={W * 0.36} y={H / 2 - 2} width={breakWidth} height="4" fill="url(#g-metal)" />}
          <Label x={W * 0.36 + breakWidth / 2} y={H / 2 - 16} color={isGFRP ? "#00695c" : "#e65100"} size="7" bold anchor="middle">{breakLabel}</Label>
        </g>
      )}
      {/* Punte termică (mare dacă neîntrerupt, ~70% mai mică cu ruptor) */}
      <HeatZone x={W * 0.24} y={H / 2 - 18} w={hasBreak ? W * 0.13 : W * 0.22} h={36} />
      {!hasBreak && <HeatArrow x1={W * 0.43} y1={H / 2} x2={W * 0.26} y2={H / 2} />}
      {hasBreak && <Label x={W * 0.7} y={H * 0.15} color="#2e7d32" size="8" bold>−{isIsokorbKXT ? 90 : isIsokorbKS ? 65 : isHalfen ? 80 : 75}% pierderi</Label>}
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (balcon)</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationRoof({ bridge, variant }) {
  // variant: "eaves" | "ridge" | "skylight" | "parapet" | "dormer"
  //          | "green-extensive" | "green-intensive" | "gable"
  const v = variant || "eaves";

  // Coamă — vârful acoperișului în două pante
  if (v === "ridge") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.78} width={W} height={H * 0.22} fill="url(#g-int)" />
        {/* Două pante de acoperiș */}
        <polygon points={`${W / 2},20 30,${H * 0.72} ${W / 2},${H * 0.72}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
        <polygon points={`${W / 2},20 ${W - 30},${H * 0.72} ${W / 2},${H * 0.72}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
        {/* Țigle ambele pante */}
        {[0.15, 0.3, 0.45, 0.6].map((fy, i) => (
          <g key={i}>
            <line x1={W / 2 - 40 + i * 15} y1={60 + i * 25} x2={W / 2} y2={60 + i * 25} stroke="#5d4433" strokeWidth="0.4" opacity="0.7" />
            <line x1={W / 2} y1={60 + i * 25} x2={W / 2 + 40 - i * 15} y2={60 + i * 25} stroke="#5d4433" strokeWidth="0.4" opacity="0.7" />
          </g>
        ))}
        {/* Izolație ambele pante */}
        <polygon points={`${W / 2},34 44,${H * 0.70} ${W / 2},${H * 0.70}`} fill="url(#p-mw)" />
        <polygon points={`${W / 2},34 ${W - 44},${H * 0.70} ${W / 2},${H * 0.70}`} fill="url(#p-mw)" />
        {/* Coama — capac metalic */}
        <polygon points={`${W / 2 - 8},22 ${W / 2 + 8},22 ${W / 2 + 5},15 ${W / 2 - 5},15`} fill="url(#g-metal)" />
        {/* Ventilație la coamă (opțional) */}
        {bridge.name.toLowerCase().includes("vent") && (
          <>
            <rect x={W / 2 - 6} y="26" width="12" height="3" fill="#263238" />
            <Label x={W / 2} y="40" color="#37474f" size="7" anchor="middle">aerisire</Label>
          </>
        )}
        <HeatZone x={W / 2 - 24} y="20" w="48" h="32" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT (pod)</Label>
        <Label x={W / 2} y={H * 0.78} color="#37474f" size="8" anchor="middle" bold>coamă</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Atic / parapet — acoperiș plat cu parapet
  if (v === "parapet") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.4} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.4} width={W} height={H * 0.6} fill="url(#g-int)" />
        {/* Planșeu terasă */}
        <rect x={W * 0.24} y={H * 0.42} width={W - W * 0.24} height="18" fill="url(#p-conc)" />
        <rect x={W * 0.24} y={H * 0.42} width={W - W * 0.24} height="18" fill="url(#p-rebar)" opacity="0.4" />
        {/* Izolație XPS peste planșeu */}
        <rect x={W * 0.24} y={H * 0.30} width={W - W * 0.24} height="18" fill="url(#p-xps)" />
        {/* Membrană hidroizolație */}
        <rect x={W * 0.22} y={H * 0.28} width={W - W * 0.22} height="3" fill="#263238" />
        <path d={`M${W * 0.22},${H * 0.28} Q${W * 0.22},${H * 0.05} ${W * 0.30},${H * 0.05} L${W * 0.30},${H * 0.08}`} stroke="#263238" strokeWidth="3" fill="none" />
        {/* Parapet (atic) */}
        <rect x={W * 0.22} y={H * 0.05} width="18" height={H * 0.25} fill="url(#p-conc)" />
        <rect x={W * 0.20} y={H * 0.04} width="4" height={H * 0.27} fill="#e8e3d5" />
        <rect x={W * 0.22} y={H * 0.03} width="18" height="4" fill="url(#g-metal)" />
        {/* Perete */}
        <rect x={W * 0.32} y={H * 0.42} width="22" height={H * 0.58} fill="url(#p-brick)" />
        <rect x={W * 0.24} y={H * 0.42} width="8" height={H * 0.58} fill="url(#p-eps)" />
        {/* Punte majoră la parapet */}
        <HeatZone x={W * 0.18} y={H * 0.1} w="32" h={H * 0.32} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.31} y={H * 0.04} color="#37474f" size="8" bold>parapet</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Luminator / skylight — cadru aluminiu în acoperiș plat
  if (v === "skylight") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.55} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.55} width={W} height={H * 0.45} fill="url(#g-int)" />
        {/* Planșeu terasă */}
        <rect x="0" y={H * 0.55} width={W} height="16" fill="url(#p-conc)" />
        <rect x="0" y={H * 0.42} width={W} height="14" fill="url(#p-xps)" />
        <rect x="0" y={H * 0.40} width={W} height="3" fill="#263238" />
        {/* Cadru luminator (guler ridicat) */}
        <rect x={W * 0.35} y={H * 0.2} width="8" height={H * 0.25} fill="url(#p-conc)" />
        <rect x={W * 0.57} y={H * 0.2} width="8" height={H * 0.25} fill="url(#p-conc)" />
        {/* Izolație pe guler */}
        <rect x={W * 0.33} y={H * 0.2} width="4" height={H * 0.25} fill="url(#p-eps)" />
        <rect x={W * 0.63} y={H * 0.2} width="4" height={H * 0.25} fill="url(#p-eps)" />
        {/* Cadru aluminium */}
        <rect x={W * 0.35} y={H * 0.18} width={W * 0.3} height="6" fill="url(#g-metal)" />
        <rect x={W * 0.35} y={H * 0.18 - 4} width={W * 0.3} height="4" fill="#455a64" />
        {/* Sticlă dome/plată */}
        <rect x={W * 0.37} y={H * 0.15} width={W * 0.26} height="4" fill="url(#g-glass)" />
        {/* Punte la cadru aluminium */}
        <HeatZone x={W * 0.32} y={H * 0.15} w="36" h="30" />
        <HeatZone x={W * 0.60} y={H * 0.15} w="36" h="30" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (terasă)</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W / 2} y={H * 0.15} color="#455a64" size="8" anchor="middle" bold>skylight Al</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Lucarnă / dormer — proeminență verticală din acoperișul înclinat
  if (v === "dormer") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.8} width={W} height={H * 0.2} fill="url(#g-int)" />
        {/* Pantă acoperiș principală */}
        <polygon points={`${W},15 20,${H * 0.75} ${W},${H * 0.75}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
        <polygon points={`${W},15 20,${H * 0.75} ${W},${H * 0.75}`} fill="#8d6e47" opacity="0.5" />
        {/* Dormer box (proeminență verticală) */}
        <rect x={W * 0.3} y={H * 0.25} width={W * 0.35} height={H * 0.30} fill="#d4c3a8" stroke="#6d4c41" strokeWidth="0.8" />
        {/* Acoperiș dormer */}
        <polygon points={`${W * 0.3},${H * 0.25} ${W * 0.48},${H * 0.1} ${W * 0.65},${H * 0.25}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
        {/* Fereastră dormer */}
        <rect x={W * 0.37} y={H * 0.32} width={W * 0.21} height={H * 0.18} fill="#f4f1eb" stroke="#5a5550" strokeWidth="0.8" />
        <rect x={W * 0.39} y={H * 0.34} width={W * 0.17} height={H * 0.14} fill="url(#g-glass)" />
        {/* Punte la joncțiunea dormer-acoperiș principal */}
        <HeatZone x={W * 0.25} y={H * 0.23} w="35" h="40" />
        <HeatZone x={W * 0.60} y={H * 0.23} w="35" h="40" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT (mansardă)</Label>
        <Label x={W * 0.48} y={H * 0.24} color="#37474f" size="8" anchor="middle" bold>lucarnă</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Acoperiș verde
  if (v === "green-extensive" || v === "green-intensive") {
    const isIntensive = v === "green-intensive";
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.5} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.5} width={W} height={H * 0.5} fill="url(#g-int)" />
        {/* Planșeu beton */}
        <rect x={W * 0.2} y={H * 0.52} width={W * 0.8} height="16" fill="url(#p-conc)" />
        {/* Izolație */}
        <rect x={W * 0.2} y={H * 0.42} width={W * 0.8} height="12" fill="url(#p-xps)" />
        {/* Membrană anti-rădăcină */}
        <rect x={W * 0.2} y={H * 0.40} width={W * 0.8} height="3" fill="#263238" />
        {/* Strat drenaj (pietriș) */}
        <rect x={W * 0.2} y={H * 0.37} width={W * 0.8} height="5" fill="url(#p-gravel)" />
        {/* Substrat (gradient verde-maro) */}
        <rect x={W * 0.2} y={H * 0.25 + (isIntensive ? 0 : 6)} width={W * 0.8} height={isIntensive ? "22" : "16"} fill="#8d7b52" />
        {/* Vegetație */}
        {isIntensive ? (
          <>
            {/* Arbust */}
            <circle cx={W * 0.4} cy={H * 0.2} r="12" fill="#558b2f" />
            <circle cx={W * 0.4} cy={H * 0.17} r="10" fill="#689f38" />
            <rect x={W * 0.39} y={H * 0.22} width="2" height="8" fill="#5d4037" />
            {/* Plante mici */}
            <circle cx={W * 0.6} cy={H * 0.27} r="4" fill="#7cb342" />
            <circle cx={W * 0.75} cy={H * 0.26} r="5" fill="#689f38" />
          </>
        ) : (
          <>
            {/* Sedum / vegetație joasă */}
            {[0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85].map((fx, i) => (
              <circle key={i} cx={W * fx} cy={H * 0.28 + (i % 2) * 2} r="2.5" fill={i % 2 ? "#8bc34a" : "#689f38"} />
            ))}
          </>
        )}
        {/* Atic */}
        <rect x={W * 0.18} y={H * 0.15} width="4" height={H * 0.37} fill="#e8e3d5" />
        <rect x={W * 0.20} y={H * 0.13} width="8" height={H * 0.22} fill="url(#p-conc)" />
        {/* Perete */}
        <rect x={W * 0.30} y={H * 0.52} width="22" height={H * 0.48} fill="url(#p-brick)" />
        <rect x={W * 0.22} y={H * 0.52} width="8" height={H * 0.48} fill="url(#p-eps)" />
        <HeatZone x={W * 0.16} y={H * 0.38} w="32" h="28" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.55} y={H * 0.12} color="#33691e" size="8" bold>{isIntensive ? "acoperiș verde INTENSIV" : "acoperiș verde EXTENSIV"}</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Calcan/gable (perete median racord cu acoperiș)
  if (v === "gable") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.5} y={H * 0.3} width={W * 0.5} height={H * 0.7} fill="url(#g-int)" />
        <rect x="0" y={H * 0.3} width={W * 0.5} height={H * 0.7} fill="url(#g-int)" opacity="0.7" />
        {/* Calcan vertical gros */}
        <rect x={W * 0.45} y="0" width={W * 0.1} height={H} fill="url(#p-brick)" />
        {/* Acoperișuri înclinate pe ambele părți */}
        <polygon points={`${W / 2},20 20,${H * 0.3} ${W - 20},${H * 0.3}`} fill="#a1887f" stroke="#6d4c41" strokeWidth="1" />
        <polygon points={`${W / 2},35 36,${H * 0.28} ${W - 36},${H * 0.28}`} fill="url(#p-mw)" />
        {/* Coronament calcan (proeminent deasupra acoperișului) */}
        <rect x={W * 0.44} y="0" width={W * 0.12} height="40" fill="url(#p-brick)" />
        <rect x={W * 0.44} y="0" width={W * 0.12} height="3" fill="url(#g-metal)" />
        <HeatZone x={W * 0.4} y="30" w="38" h="40" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y={H - 10} anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W / 2} y={H * 0.5} color="#6d2818" size="8" anchor="middle" bold>calcan</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Default: "eaves" — streașină clasică
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.6} width={W} height={H * 0.4} fill="url(#g-int)" />
      {/* Şarpantă (triunghi simplu, jumătate) */}
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
      {/* Jgheab metalic (opțional) */}
      {bridge.name.toLowerCase().includes("jgheab") && (
        <path d={`M${W * 0.2},${H * 0.5} Q${W * 0.18},${H * 0.54} ${W * 0.22},${H * 0.56} L${W * 0.38},${H * 0.56} Q${W * 0.4},${H * 0.54} ${W * 0.38},${H * 0.5}`} fill="url(#g-metal)" stroke="#555" strokeWidth="0.6" />
      )}
      {/* Punte termică la streașină */}
      <HeatZone x={W * 0.25} y={H * 0.44} w={W * 0.22} h={30} />
      <HeatArrow x1={W * 0.40} y1={H * 0.55} x2={W * 0.28} y2={H * 0.52} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.3} y={H * 0.62} color="#37474f" size="8">streașină</Label>
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

function IllustrationFoundation({ bridge, variant }) {
  // variant: "mat" (radier) | "strip" (bandă) | "passivhaus-l" | "raft-basement" | "piles"
  const v = variant || "strip";

  // Passivhaus-L — izolație XPS în formă de L (sub radier + perimetrală)
  if (v === "passivhaus-l") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.3} fill="url(#g-ext)" />
        <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.4} fill="url(#g-int)" />
        <rect x="0" y={H * 0.3} width={W} height={H * 0.7} fill="url(#p-soil)" />
        {/* XPS în L — orizontal sub radier */}
        <rect x="0" y={H * 0.58} width={W} height="22" fill="url(#p-xps)" />
        {/* XPS vertical (perimetral coborât) */}
        <rect x={W * 0.20} y={H * 0.35} width="14" height={H * 0.32} fill="url(#p-xps)" />
        {/* Radier beton */}
        <rect x={W * 0.24} y={H * 0.48} width={W - W * 0.24} height="22" fill="url(#p-conc)" />
        <rect x={W * 0.24} y={H * 0.48} width={W - W * 0.24} height="22" fill="url(#p-rebar)" opacity="0.4" />
        {/* Perete + ETICS */}
        <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.38} fill="url(#p-brick)" />
        <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.38} fill="url(#p-eps)" />
        {/* Pietriș sub XPS */}
        <rect x="0" y={H * 0.8} width={W} height="12" fill="url(#p-gravel)" />
        <HeatZone x={W * 0.18} y={H * 0.35} w={W * 0.32} h={H * 0.2} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
        <Label x={W * 0.55} y={H * 0.32} color="#c2410c" size="8" bold anchor="middle">Passivhaus XPS-L</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Mat foundation (radier) — plan orizontal continuu
  if (v === "mat") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.35} fill="url(#g-ext)" />
        <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.45} fill="url(#g-int)" />
        <rect x="0" y={H * 0.35} width={W} height={H * 0.65} fill="url(#p-soil)" />
        {/* Radier gros continuu */}
        <rect x="0" y={H * 0.55} width={W} height={H * 0.3} fill="url(#p-conc)" />
        <rect x="0" y={H * 0.55} width={W} height={H * 0.3} fill="url(#p-rebar)" opacity="0.4" />
        {/* Perete + ETICS */}
        <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.55} fill="url(#p-brick)" />
        <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.45} fill="url(#p-eps)" />
        {/* Lipsă izolație sub radier — punte majoră */}
        <HeatZone x="0" y={H * 0.5} w={W * 0.5} h={H * 0.3} />
        <HeatArrow x1={W * 0.37} y1={H * 0.55} x2={W * 0.23} y2={H * 0.55} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
        <Label x={W * 0.55} y={H * 0.72} color="#e8e3d5" size="8" bold anchor="middle">radier general beton armat</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Piles — fundație pe piloți
  if (v === "piles") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.35} fill="url(#g-ext)" />
        <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.45} fill="url(#g-int)" />
        <rect x="0" y={H * 0.35} width={W} height={H * 0.65} fill="url(#p-soil)" />
        {/* Grindă de fundație pe piloți */}
        <rect x={W * 0.10} y={H * 0.4} width={W * 0.85} height="18" fill="url(#p-conc)" />
        {/* 3 piloți în sol */}
        {[0.2, 0.5, 0.8].map((fx, i) => (
          <rect key={i} x={W * fx - 6} y={H * 0.58} width="12" height={H * 0.4} fill="url(#p-conc)" />
        ))}
        {/* Perete + ETICS */}
        <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.4} fill="url(#p-brick)" />
        <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.4} fill="url(#p-eps)" />
        <HeatZone x={W * 0.18} y={H * 0.32} w={W * 0.3} h={H * 0.2} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W / 2} y={H * 0.94} color="#e8e3d5" size="8" anchor="middle" bold>piloți forați</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Raft + basement — radier + perete subsol
  if (v === "raft-basement") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.2} fill="url(#g-ext)" />
        <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.25} fill="url(#g-int)" />
        <rect x="0" y={H * 0.2} width={W} height={H * 0.8} fill="url(#p-soil)" />
        {/* Subsol spațiu (se umple cu gradient mai întunecat) */}
        <rect x={W * 0.22} y={H * 0.3} width={W - W * 0.22} height={H * 0.5} fill="#37474f" opacity="0.4" />
        {/* Perete subsol vertical */}
        <rect x={W * 0.22} y={H * 0.2} width="14" height={H * 0.65} fill="url(#p-conc)" />
        {/* Izolație XPS perimetrală */}
        <rect x={W * 0.17} y={H * 0.2} width="5" height={H * 0.65} fill="url(#p-xps)" />
        {/* Radier */}
        <rect x={W * 0.17} y={H * 0.78} width={W - W * 0.17} height="14" fill="url(#p-conc)" />
        {/* Placă peste subsol */}
        <rect x={W * 0.22} y={H * 0.25} width={W - W * 0.22} height="14" fill="url(#p-conc)" />
        <rect x={W * 0.22} y={H * 0.25 + 14} width={W - W * 0.22} height="6" fill="url(#p-xps)" />
        {/* Perete superior */}
        <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.25 - 10} fill="url(#p-brick)" />
        <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.25 - 10} fill="url(#p-eps)" />
        <HeatZone x={W * 0.14} y={H * 0.22} w="44" h="30" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.6} y={H * 0.58} color="#eceff1" size="8" anchor="middle">SUBSOL NEÎNCĂLZIT</Label>
        <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Default: "strip" — fundație bandă cu placă pe sol + izolație perimetrală
  return (
    <>
      <rect x="0" y="0" width={W} height={H * 0.35} fill="url(#g-ext)" />
      <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.45} fill="url(#g-int)" />
      <rect x="0" y={H * 0.35} width={W} height={H * 0.65} fill="url(#p-soil)" />
      <rect x={W * 0.05} y={H * 0.68} width={W * 0.25} height="14" fill="url(#p-gravel)" />
      {/* Fundație bandă (cu talpa lărgită) */}
      <rect x={W * 0.23} y={H * 0.4} width={W * 0.15} height={H * 0.35} fill="url(#p-conc)" />
      <rect x={W * 0.19} y={H * 0.7} width={W * 0.23} height={H * 0.12} fill="url(#p-conc)" />
      {/* Placă beton */}
      <rect x={W * 0.38} y={H * 0.40} width={W * 0.62} height="16" fill="url(#p-conc)" />
      <rect x={W * 0.38} y={H * 0.40} width={W * 0.62} height="16" fill="url(#p-rebar)" opacity="0.4" />
      {/* Izolație sub placă */}
      <rect x={W * 0.38} y={H * 0.40 + 16} width={W * 0.62} height="12" fill="url(#p-xps)" />
      {/* Izolație perimetrală XPS 60cm */}
      <rect x={W * 0.21} y={H * 0.4} width="10" height={H * 0.4} fill="url(#p-xps)" />
      {/* Perete + ETICS */}
      <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.30} fill="url(#p-brick)" />
      <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.30} fill="url(#p-eps)" />
      <HeatZone x={W * 0.19} y={H * 0.3} w={W * 0.3} h={H * 0.22} />
      <HeatArrow x1={W * 0.37} y1={H * 0.4} x2={W * 0.23} y2={H * 0.4} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
      <Label x={W * 0.55} y={H * 0.9} color="#e8e3d5" size="8" anchor="middle">fundație bandă + XPS perimetral</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

function IllustrationTimber({ bridge, variant }) {
  // variant: "timber-frame" | "clt" | "sip" | "rafters"
  const v = variant || "timber-frame";

  // CLT — panouri solide din lemn stratificat încrucișat
  if (v === "clt") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.5} y="0" width={W * 0.5} height={H} fill="url(#g-int)" />
        {/* ETICS exterior */}
        <rect x={W * 0.30} y="10" width={W * 0.12} height={H - 20} fill="url(#p-eps)" />
        {/* Panou CLT vertical (perete) — 3 lamelе vizibile */}
        <rect x={W * 0.42} y="10" width="6" height={H - 20} fill="url(#p-wood)" />
        <rect x={W * 0.48} y="10" width="6" height={H - 20} fill="#b88c5a" />
        <path d={`M${W * 0.48},10 L${W * 0.48},${H - 10}`} stroke="#6d4c41" strokeWidth="0.4" />
        {/* Lamele încrucișate (orizontale vizibile prin culoare) */}
        {[0.2, 0.35, 0.5, 0.65, 0.8].map((fy, i) => (
          <line key={i} x1={W * 0.48} y1={H * fy} x2={W * 0.54} y2={H * fy} stroke="#6d4c41" strokeWidth="0.5" opacity="0.6" />
        ))}
        {/* Panou CLT orizontal (planșeu) */}
        <rect x={W * 0.42} y={H / 2 - 10} width={W * 0.58} height="18" fill="url(#p-wood)" />
        <rect x={W * 0.42} y={H / 2 - 10} width={W * 0.58} height="6" fill="#b88c5a" />
        <rect x={W * 0.42} y={H / 2 + 2} width={W * 0.58} height="6" fill="#b88c5a" />
        {/* Conectori metalici */}
        <rect x={W * 0.48} y={H / 2 - 12} width="4" height="4" fill="url(#g-metal)" />
        <rect x={W * 0.48} y={H / 2 + 8} width="4" height="4" fill="url(#g-metal)" />
        <HeatZone x={W * 0.38} y={H / 2 - 18} w="30" h="36" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.48} y={H * 0.12} color="#7a5320" size="8" anchor="middle" bold>CLT solid</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // SIP — Structural Insulated Panel (sandwich OSB + EPS + OSB)
  if (v === "sip") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.5} y="0" width={W * 0.5} height={H} fill="url(#g-int)" />
        {/* Tencuială exterioară */}
        <rect x={W * 0.28} y="10" width="4" height={H - 20} fill="#e8e3d5" />
        {/* OSB exterior */}
        <rect x={W * 0.32} y="10" width="6" height={H - 20} fill="#c9a575" />
        {/* Miez EPS */}
        <rect x={W * 0.38} y="10" width={W * 0.08} height={H - 20} fill="url(#p-eps)" />
        {/* OSB interior */}
        <rect x={W * 0.46} y="10" width="6" height={H - 20} fill="#c9a575" />
        {/* Joncțiune dintre 2 panouri SIP (linie verticală sus) */}
        <line x1={W * 0.42} y1="10" x2={W * 0.42} y2={H - 10} stroke="#6d2818" strokeWidth="1" strokeDasharray="5 3" />
        <Label x={W * 0.42} y={H * 0.06} color="#c62828" size="8" anchor="middle" bold>joncțiune SIP</Label>
        {/* Planșeu SIP orizontal */}
        <rect x={W * 0.46} y={H / 2 - 10} width={W * 0.54} height="4" fill="#c9a575" />
        <rect x={W * 0.46} y={H / 2 - 6} width={W * 0.54} height="12" fill="url(#p-eps)" />
        <rect x={W * 0.46} y={H / 2 + 6} width={W * 0.54} height="4" fill="#c9a575" />
        <HeatZone x={W * 0.38} y={H / 2 - 14} w="32" h="28" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.42} y={H - 12} color="#c9a575" size="8" anchor="middle">OSB + EPS + OSB</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Rafters — căpriori înclinați cu izolație între
  if (v === "rafters") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.7} width={W} height={H * 0.3} fill="url(#g-int)" />
        {/* Plan acoperiș înclinat, vedere perpendicular pe pantă */}
        <g transform={`skewX(-15)`}>
          {/* Țiglă */}
          <rect x={-10} y={H * 0.1} width={W + 20} height="10" fill="#8d6e47" />
          {/* Aerare */}
          <rect x={-10} y={H * 0.2} width={W + 20} height="4" fill="#fff" opacity="0.3" />
          {/* Căpriori 45×200mm (repetitiv) */}
          {[0.05, 0.25, 0.45, 0.65, 0.85].map((fx, i) => (
            <rect key={i} x={W * fx} y={H * 0.24} width="12" height="22" fill="url(#p-wood)" />
          ))}
          {/* Izolație vată între căpriori */}
          {[0.12, 0.32, 0.52, 0.72, 0.92].map((fx, i) => (
            <rect key={i} x={W * fx} y={H * 0.24} width={W * 0.13} height="22" fill="url(#p-mw)" />
          ))}
          {/* Folie + OSB intrados */}
          <rect x={-10} y={H * 0.46} width={W + 20} height="2" fill="#263238" />
          <rect x={-10} y={H * 0.48} width={W + 20} height="4" fill="#c9a575" />
        </g>
        {/* Săgeți flux prin căpriori (punte repetitivă) */}
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((fx, i) => (
          <HeatArrow key={i} x1={W * fx + 5} y1={H * 0.55} x2={W * fx - 5} y2={H * 0.35} />
        ))}
        <HeatZone x={W * 0.05} y={H * 0.2} w={W * 0.9} h="32" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT (exterior)</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT (mansardă)</Label>
        <Label x={W / 2} y={H * 0.67} color="#7a5320" size="8" anchor="middle" bold>căpriori lemn 45×200mm (punte repetitivă)</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Default: timber-frame (rim joist)
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.45} y="0" width={W * 0.55} height={H} fill="url(#g-int)" />
      {/* Tencuială + placaj exterior */}
      <rect x={W * 0.24} y="10" width="3" height={H - 20} fill="#e8e3d5" />
      <rect x={W * 0.27} y="10" width="4" height={H - 20} fill="url(#p-wood)" />
      {/* Rigle/montanți verticali */}
      <rect x={W * 0.35} y="10" width="10" height={H - 20} fill="url(#p-wood)" />
      <rect x={W * 0.42} y="10" width="10" height={H - 20} fill="url(#p-wood)" />
      {/* Izolație vată între montanți */}
      <rect x={W * 0.31} y="10" width={W * 0.04} height={H - 20} fill="url(#p-mw)" />
      <rect x={W * 0.35 + 10} y="10" width={W * 0.02} height={H - 20} fill="url(#p-mw)" />
      {/* OSB + placă gips-carton interior */}
      <rect x={W * 0.52} y="10" width="4" height={H - 20} fill="#c9a575" />
      <rect x={W * 0.56} y="10" width="4" height={H - 20} fill="#f5f5f5" />
      {/* Rim joist — grinda perimetrală (punte principală) */}
      <rect x={W * 0.35} y={H / 2 - 10} width="30" height="20" fill="#a07843" stroke="#6d4c41" strokeWidth="0.6" />
      {/* Planșeu lemn intermediar */}
      <rect x={W * 0.45} y={H / 2 - 7} width={W * 0.55} height="14" fill="url(#p-wood)" />
      <HeatZone x={W * 0.31} y={H / 2 - 14} w="38" h="28" />
      <HeatArrow x1={W * 0.46} y1={H / 2} x2={W * 0.29} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.33} y="30" color="#8f7a4e" size="8">vată</Label>
      <Label x={W * 0.40} y="30" color="#7a5320" size="8">montanți</Label>
      <Label x={W * 0.50} y={H - 8} color="#a07843" size="8" bold>rim joist</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

function IllustrationETICS({ bridge, variant }) {
  // variant: "anchor-metal" | "anchor-plastic" | "plinth-drip" | "corner-profile"
  //          | "window-band" | "expansion-joint" | "sandwich-tie"
  const v = variant || "anchor-metal";

  // Diblu plastic cu ac metalic (pointed tip)
  if (v === "anchor-plastic") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
        <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
        <rect x={W * 0.30} y="0" width={W * 0.15} height={H} fill="url(#p-eps)" />
        <rect x={W * 0.285} y="0" width="5" height={H} fill="#e8e3d5" />
        {/* Câteva dibluri plastic — tijă albă + ac metalic doar în vârf */}
        {[0.2, 0.45, 0.7].map((fy) => (
          <g key={fy}>
            <line x1={W * 0.29} y1={H * fy} x2={W * 0.52} y2={H * fy} stroke="#f5f5f5" strokeWidth="2" />
            {/* Ac metalic doar în vârf (capăt interior) */}
            <line x1={W * 0.48} y1={H * fy} x2={W * 0.52} y2={H * fy} stroke="#333" strokeWidth="1.5" />
            <circle cx={W * 0.29} cy={H * fy} r="2.5" fill="#f5f5f5" stroke="#888" strokeWidth="0.5" />
          </g>
        ))}
        <HeatZone x={W * 0.28} y={H * 0.3} w={W * 0.24} h={H * 0.4} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.41} y={H * 0.13} color="#37474f" size="8" anchor="middle" bold>diblu plastic (ac metalic)</Label>
        <Label x={W * 0.5} y={H * 0.88} color="#2e7d32" size="7" anchor="middle">χ ≈ 0.001 W/K — clasă A</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Plinth-drip — soclu ETICS cu profil picurător + izolație perimetrală
  if (v === "plinth-drip") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.55} fill="url(#g-ext)" />
        <rect x={W * 0.38} y="0" width={W * 0.62} height={H * 0.55} fill="url(#g-int)" />
        <rect x="0" y={H * 0.55} width={W} height={H * 0.45} fill="url(#p-soil)" />
        {/* Placă + subplacă */}
        <rect x={W * 0.38} y={H * 0.5} width={W * 0.62} height="14" fill="url(#p-conc)" />
        {/* Perete */}
        <rect x={W * 0.32} y="10" width={W * 0.08} height={H * 0.5} fill="url(#p-brick)" />
        {/* ETICS deasupra soclu */}
        <rect x={W * 0.22} y="10" width={W * 0.10} height={H * 0.55} fill="url(#p-eps)" />
        {/* Izolație soclu XPS (coborâtă sub CTS) */}
        <rect x={W * 0.24} y={H * 0.55} width={W * 0.08} height={H * 0.35} fill="url(#p-xps)" />
        {/* Tencuială exterioară */}
        <rect x={W * 0.205} y="10" width="4" height={H * 0.55} fill="#e8e3d5" />
        <rect x={W * 0.225} y={H * 0.55} width="4" height={H * 0.35} fill="#c9c4b4" />
        {/* Profil drip (picurător) la linia de tranziție */}
        <path d={`M${W * 0.18},${H * 0.55} L${W * 0.32},${H * 0.55} L${W * 0.32},${H * 0.57} L${W * 0.22},${H * 0.57} L${W * 0.18},${H * 0.6} Z`} fill="url(#g-metal)" stroke="#333" strokeWidth="0.4" />
        <HeatZone x={W * 0.16} y={H * 0.48} w={W * 0.28} h={H * 0.18} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x="10" y={H - 10} color="#5d4638" size="9" bold>SOL</Label>
        <Label x={W * 0.08} y={H * 0.62} color="#455a64" size="8" bold>drip</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Corner profile — profil de colț ETICS (vedere plan colț)
  if (v === "corner-profile") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.55} y={H * 0.45} width={W * 0.45} height={H * 0.55} fill="url(#g-int)" />
        {/* Colț zidărie */}
        <rect x={W * 0.45} y={H * 0.45} width="14" height={H * 0.55} fill="url(#p-brick)" />
        <rect x={W * 0.45} y={H * 0.45} width={W * 0.55} height="14" fill="url(#p-brick)" />
        {/* ETICS pe colț */}
        <rect x={W * 0.30} y={H * 0.45} width={W * 0.15} height={H * 0.55} fill="url(#p-eps)" />
        <rect x={W * 0.30} y={H * 0.30} width={W * 0.70} height={W * 0.15} fill="url(#p-eps)" />
        {/* Profil de colț metalic (L-profil cu plasă) */}
        <path d={`M${W * 0.28},${H * 0.28} L${W * 0.28},${H * 0.98} L${W * 0.30},${H * 0.98} L${W * 0.30},${H * 0.3} L${W - 10},${H * 0.3} L${W - 10},${H * 0.28} Z`} fill="url(#g-metal)" />
        {/* Plasă de armare */}
        {[0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88].map((fx, i) => (
          <circle key={i} cx={W * fx} cy={H * 0.32} r="1" fill="none" stroke="#666" strokeWidth="0.4" />
        ))}
        <HeatZone x={W * 0.22} y={H * 0.22} w="32" h="32" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y={H - 10} anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.6} y={H * 0.25} color="#455a64" size="8" anchor="middle" bold>profil colț Al + plasă</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Window-band — bandă ETICS la baza ferestrelor
  if (v === "window-band") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H * 0.4} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.4} width={W} height={H * 0.6} fill="url(#g-int)" />
        {/* Zidărie sub fereastră */}
        <rect x={W * 0.32} y={H * 0.4} width={W * 0.68} height={H * 0.4} fill="url(#p-brick)" />
        {/* ETICS continuă sub glaf */}
        <rect x={W * 0.22} y={H * 0.4} width={W * 0.78} height="6" fill="url(#p-eps)" />
        <rect x={W * 0.22} y={H * 0.4} width={W * 0.10} height={H * 0.6} fill="url(#p-eps)" />
        {/* Bandă suplimentară sub fereastră (continuă peste nișa radiator) */}
        <rect x={W * 0.32} y={H * 0.4} width={W * 0.68} height="10" fill="#ffd54f" />
        <Label x={W * 0.65} y={H * 0.48} color="#f57c00" size="8" anchor="middle" bold>bandă EPS sub fereastră</Label>
        {/* Glaf metalic */}
        <rect x={W * 0.22} y={H * 0.4} width={W * 0.78} height="3" fill="url(#g-metal)" />
        {/* Fereastră (rama parțial vizibilă) */}
        <rect x={W * 0.33} y={H * 0.25} width="22" height={H * 0.15} fill="#f4f1eb" stroke="#5a5550" strokeWidth="0.8" />
        <rect x={W * 0.33 + 3} y={H * 0.27} width="16" height={H * 0.11} fill="url(#g-glass)" />
        {/* Nișă radiator (dedesubtul benzii) */}
        <rect x={W * 0.45} y={H * 0.55} width={W * 0.3} height={H * 0.25} fill="none" stroke="#607d8b" strokeWidth="1" strokeDasharray="3 2" />
        <HeatZone x={W * 0.3} y={H * 0.38} w="40" h="16" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x="10" y={H - 10} color="#2e7d32" size="10" bold>INT</Label>
        <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
      </>
    );
  }

  // Expansion joint — rost de dilatare ETICS
  if (v === "expansion-joint") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
        <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
        {/* 2 panouri ETICS cu rost */}
        <rect x={W * 0.30} y="0" width={W * 0.08} height={H} fill="url(#p-eps)" />
        <rect x={W * 0.39} y="0" width={W * 0.06} height={H} fill="url(#p-eps)" />
        {/* Rostul (vizibil ca bandă verticală) */}
        <rect x={W * 0.38} y="0" width="2" height={H} fill="#263238" />
        {/* Profil rost de dilatare (în zig-zag) */}
        <path d={`M${W * 0.375},5 L${W * 0.375},${H - 5} M${W * 0.395},5 L${W * 0.395},${H - 5}`} stroke="url(#g-metal)" strokeWidth="2" />
        {/* Mastic/mastichet elastic între profile */}
        <rect x={W * 0.383} y="0" width="6" height={H} fill="#ff6f00" opacity="0.3" />
        <HeatZone x={W * 0.33} y={H * 0.3} w="30" h="40" />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.39} y={H * 0.14} color="#e65100" size="8" anchor="middle" bold>rost dilatare</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Sandwich-tie — tijă/conector panou sandwich
  if (v === "sandwich-tie") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={W * 0.62} y="0" width={W * 0.38} height={H} fill="url(#g-int)" />
        {/* Strat exterior beton */}
        <rect x={W * 0.22} y="10" width={W * 0.08} height={H - 20} fill="url(#p-conc)" />
        {/* Miez EPS/PIR */}
        <rect x={W * 0.30} y="10" width={W * 0.22} height={H - 20} fill="url(#p-eps)" />
        {/* Strat interior beton */}
        <rect x={W * 0.52} y="10" width={W * 0.10} height={H - 20} fill="url(#p-conc)" />
        {/* Tije/conectori traversând izolația */}
        {[0.2, 0.4, 0.6, 0.8].map((fy, i) => (
          <g key={i}>
            <line x1={W * 0.25} y1={H * fy} x2={W * 0.57} y2={H * fy} stroke={i % 2 ? "#00897b" : "#bfbfc4"} strokeWidth="1.8" />
            <circle cx={W * 0.25} cy={H * fy} r="1.5" fill="#263238" />
            <circle cx={W * 0.57} cy={H * fy} r="1.5" fill="#263238" />
          </g>
        ))}
        <HeatZone x={W * 0.23} y="10" w={W * 0.34} h={H - 20} />
        <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
        <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
        <Label x={W * 0.4} y={H * 0.12} color="#37474f" size="8" anchor="middle" bold>conectori GFRP/inox</Label>
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Default: anchor-metal — diblu metalic clasic EPS
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
      <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.30} y="0" width={W * 0.15} height={H} fill="url(#p-eps)" />
      <rect x={W * 0.285} y="0" width="5" height={H} fill="#e8e3d5" />
      {/* Dibluri metalice cu cap galben (EJOT/Fischer) */}
      {[0.18, 0.35, 0.52, 0.7, 0.88].map((fy) => (
        <g key={fy}>
          <line x1={W * 0.29} y1={H * fy} x2={W * 0.52} y2={H * fy} stroke="#333" strokeWidth="1.8" />
          <circle cx={W * 0.29} cy={H * fy} r="3" fill="#ffd54f" stroke="#e65100" strokeWidth="0.5" />
        </g>
      ))}
      <HeatZone x={W * 0.27} y="10" w="50" h={H - 20} opacity="0.4" />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.41} y={H * 0.09} color="#e65100" size="8" anchor="middle" bold>dibluri metalice (χ)</Label>
      <Label x={W * 0.5} y={H * 0.95} color="#455a64" size="7" anchor="middle">6-8/m² × χ ≈ 0.003 W/K</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

// Coș de fum zidărie penetrant
function IllustrationChimneyMasonry({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.55} y="0" width={W * 0.45} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={W * 0.45} y="0" width={W * 0.10} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.30} y="0" width={W * 0.15} height={H} fill="url(#p-eps)" />
      {/* Coș (bloc zidărie independent, încorporat în perete) */}
      <rect x={W * 0.08} y="15" width="40" height={H - 30} fill="url(#p-brick)" />
      {/* Canal fum (interior coș) */}
      <rect x={W * 0.08 + 6} y="15" width="28" height={H - 30} fill="#3a342c" />
      <rect x={W * 0.08 + 10} y="15" width="20" height={H - 30} fill="#ff5722" opacity="0.3" />
      {/* Coroamament metalic */}
      <rect x={W * 0.08 - 2} y="10" width="44" height="6" fill="url(#g-metal)" />
      {/* Punte de la coș prin perete spre interior */}
      <HeatZone x={W * 0.25} y={H * 0.3} w="34" h={H * 0.4} />
      <HeatArrow x1={W * 0.47} y1={H / 2} x2={W * 0.28} y2={H / 2} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.14} y={H - 10} color="#37474f" size="8" anchor="middle" bold>coș zidărie</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

// Roletă — casetă integrată în perete
function IllustrationRollerShutter({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H * 0.35} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.35} width={W} height={H * 0.65} fill="url(#g-int)" />
      {/* Perete + ETICS sub casetă */}
      <rect x={W * 0.32} y={H * 0.35} width={W * 0.08} height={H * 0.65} fill="url(#p-brick)" />
      <rect x={W * 0.22} y={H * 0.35} width={W * 0.10} height={H * 0.65} fill="url(#p-eps)" />
      {/* Casetă roletă (cutie goală sau parțial izolată) */}
      <rect x={W * 0.22} y={H * 0.1} width={W * 0.78} height={H * 0.25} fill="#d7d1be" stroke="#5a5550" strokeWidth="1" />
      {/* Izolație PUR în cutie (parțial) */}
      <rect x={W * 0.22} y={H * 0.1} width={W * 0.78} height="6" fill="url(#p-xps)" />
      {/* Rol înfășurat */}
      <circle cx={W * 0.5} cy={H * 0.22} r="12" fill="#7a7a7a" />
      <circle cx={W * 0.5} cy={H * 0.22} r="8" fill="#5a5a5a" />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <line key={i} x1={W * 0.5} y1={H * 0.22} x2={W * 0.5 + 11 * Math.cos(deg * Math.PI / 180)} y2={H * 0.22 + 11 * Math.sin(deg * Math.PI / 180)} stroke="#333" strokeWidth="0.6" />
      ))}
      {/* Ghidaj rolete */}
      <rect x={W * 0.33} y={H * 0.32} width="3" height={H * 0.25} fill="url(#g-metal)" />
      {/* Fereastră mai jos */}
      <rect x={W * 0.33} y={H * 0.57} width="22" height={H * 0.3} fill="#f4f1eb" stroke="#5a5550" strokeWidth="0.8" />
      <rect x={W * 0.33 + 3} y={H * 0.59} width="16" height={H * 0.26} fill="url(#g-glass)" />
      <HeatZone x={W * 0.22} y={H * 0.1} w={W * 0.6} h={H * 0.25} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.5} y={H * 0.08} color="#37474f" size="8" anchor="middle" bold>casetă roletă</Label>
      <PsiBadge psi={bridge.psi} x={W - 96} y={H - 10} />
    </>
  );
}

// Radiator niche — nișă pentru radiator în perete exterior
function IllustrationRadiatorNiche({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.42} y="0" width={W * 0.58} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={W * 0.36} y="0" width={W * 0.08} height={H} fill="url(#p-brick)" />
      <rect x={W * 0.26} y="0" width={W * 0.10} height={H} fill="url(#p-eps)" />
      {/* Nișă (grosime redusă perete în spatele radiatorului) */}
      <rect x={W * 0.36} y={H * 0.3} width={W * 0.04} height={H * 0.4} fill="url(#p-brick)" />
      <rect x={W * 0.33} y={H * 0.3} width="3" height={H * 0.4} fill="#e8e3d5" />
      {/* Radiator */}
      <rect x={W * 0.43} y={H * 0.35} width={W * 0.2} height={H * 0.3} fill="#b0bec5" stroke="#546e7a" strokeWidth="0.6" />
      {[0.37, 0.42, 0.47, 0.52, 0.57, 0.62].map((fx, i) => (
        <line key={i} x1={W * fx} y1={H * 0.36} x2={W * fx} y2={H * 0.64} stroke="#546e7a" strokeWidth="1.2" />
      ))}
      {/* Conducte apă caldă */}
      <path d={`M${W * 0.43},${H * 0.36} L${W * 0.43},${H * 0.28}`} stroke="#c62828" strokeWidth="2" />
      <path d={`M${W * 0.43},${H * 0.64} L${W * 0.43},${H * 0.72}`} stroke="#1565c0" strokeWidth="2" />
      <HeatZone x={W * 0.27} y={H * 0.32} w={W * 0.14} h={H * 0.36} />
      <HeatArrow x1={W * 0.43} y1={H * 0.5} x2={W * 0.29} y2={H * 0.5} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.53} y={H * 0.33} color="#37474f" size="8" anchor="middle" bold>nișă radiator</Label>
      <Label x={W * 0.53} y={H * 0.95} color="#c62828" size="7" anchor="middle">perete subțiat ≈ 50% grosime</Label>
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

// Panou prefabricat mare (IPCT '70-'80) — rost prefabricat cu izolație slabă
function IllustrationPrecastPanel({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={W * 0.5} y="0" width={W * 0.5} height={H} fill="url(#g-int)" />
      {/* Panou sandwich prefabricat — strat ext. beton */}
      <rect x={W * 0.22} y="10" width={W * 0.06} height={H - 20} fill="url(#p-conc)" />
      {/* Miez izolant slab (stiropor vechi / vată deteriorată) */}
      <rect x={W * 0.28} y="10" width={W * 0.08} height={H - 20} fill="#e6d2a8" opacity="0.8" />
      {/* Strat interior beton */}
      <rect x={W * 0.36} y="10" width={W * 0.14} height={H - 20} fill="url(#p-conc)" />
      <rect x={W * 0.36} y="10" width={W * 0.14} height={H - 20} fill="url(#p-rebar)" opacity="0.3" />
      {/* Rost orizontal (între panouri — cu mastic degradat) */}
      <rect x={W * 0.22} y={H / 2 - 3} width={W * 0.28} height="6" fill="#37474f" />
      <path d={`M${W * 0.22},${H / 2} L${W * 0.5},${H / 2}`} stroke="#c62828" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* Planșeu interior */}
      <rect x={W * 0.5} y={H / 2 - 9} width={W * 0.5} height="18" fill="url(#p-conc)" />
      {/* Ancore metalice corodate */}
      <circle cx={W * 0.32} cy={H * 0.3} r="2" fill="#8d6e47" />
      <circle cx={W * 0.32} cy={H * 0.7} r="2" fill="#8d6e47" />
      <HeatZone x={W * 0.2} y="5" w={W * 0.32} h={H - 10} />
      <Label x="10" y="18" color="#1976d2" size="10" bold>EXT</Label>
      <Label x={W - 10} y="18" anchor="end" color="#2e7d32" size="10" bold>INT</Label>
      <Label x={W * 0.36} y={H * 0.12} color="#c62828" size="8" anchor="middle" bold>panou prefab IPCT</Label>
      <Label x={W * 0.36} y={H * 0.95} color="#37474f" size="7" anchor="middle">izolație degradată — bloc '70-'80</Label>
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

  // ── Ferestre & uși (prioritate mare pe detalii de montaj) ─────────────────
  if (cat === "Ferestre" || cat === "Ferestre și uși – tipuri speciale" || cat === "Fațade și ferestre avansate") {
    if (name.includes("velux") || name.includes("mansardă") || name.includes("mansarda")) return <IllustrationVelux bridge={bridge} />;
    if (name.includes("cortină") || name.includes("cortina") || name.includes("spandrel") || name.includes("mullion")) return <IllustrationCurtainWall bridge={bridge} />;
    if (name.includes("pervaz") || name.includes("sub fereastră") || name.includes("sub fereastra")) return <IllustrationWindow bridge={bridge} variant="sill" />;
    if (name.includes("prag") || (name.includes("ușă") && !name.includes("balcon")) || (name.includes("usa") && !name.includes("balcon"))) return <IllustrationWindow bridge={bridge} variant="threshold" />;
    if (name.includes("ușă balcon") || name.includes("usa balcon")) return <IllustrationWindow bridge={bridge} variant="threshold" />;
    if (name.includes("passivhaus") || name.includes("compacfoam") || name.includes("complet izolat") || name.includes("deep")) return <IllustrationWindow bridge={bridge} variant="deep-ph" />;
    if (name.includes("în izolație") || name.includes("in izolatie") || name.includes("planul izolației") || name.includes("planul izolatiei") || name.includes("ral")) return <IllustrationWindow bridge={bridge} variant="in-insulation" />;
    if (name.includes("bandă etics") || name.includes("banda etics")) return <IllustrationETICS bridge={bridge} variant="window-band" />;
    if (name.includes("glaf metalic")) return <IllustrationWindow bridge={bridge} variant="deep-metal-sill" />;
    if (name.includes("colț") || name.includes("colt")) return <IllustrationCorner bridge={bridge} internal={false} />;
    return <IllustrationWindow bridge={bridge} variant="standard" />;
  }

  // ── Balcoane & logii ──────────────────────────────────────────────────────
  if (cat === "Balcoane" || cat === "Balcoane avansate" || cat === "Balcoane și logii – tipuri speciale") {
    if (name.includes("loggia") || name.includes("loggie") || name.includes("logii") || name.includes("logi")) return <IllustrationBalcony bridge={bridge} variant="loggia" />;
    if (name.includes("suspendat") || name.includes("hanger") || name.includes("tiranti")) return <IllustrationBalcony bridge={bridge} variant="steel-pendant" />;
    if (name.includes("kxt") || name.includes("passivhaus")) return <IllustrationBalcony bridge={bridge} variant="isokorb-kxt" />;
    if (name.includes("isokorb ks") || name.includes("oțel-beton") || name.includes("otel-beton")) return <IllustrationBalcony bridge={bridge} variant="isokorb-ks" />;
    if (name.includes("halfen") || name.includes("hit")) return <IllustrationBalcony bridge={bridge} variant="halfen-hit" />;
    if (name.includes("isokorb k") || name.includes("ruptoare") || name.includes("ruptor")) return <IllustrationBalcony bridge={bridge} variant="isokorb-k" />;
    if (name.includes("gfrp") || name.includes("fibra de sticla") || name.includes("fibră de sticlă")) return <IllustrationBalcony bridge={bridge} variant="precast-gfrp" />;
    if (name.includes("hea") || name.includes("ipe") || name.includes("metalic")) return <IllustrationBalcony bridge={bridge} variant="steel-pendant" />;
    return <IllustrationBalcony bridge={bridge} variant="uninterrupted" />;
  }

  // ── Acoperiș ──────────────────────────────────────────────────────────────
  if (cat === "Acoperiș" || cat === "Acoperiș avansat" || cat === "Acoperiș – tipuri speciale") {
    if (name.includes("luminatoare") || name.includes("skylight") || name.includes("dome")) return <IllustrationRoof bridge={bridge} variant="skylight" />;
    if (name.includes("mansardă (dormer)") || name.includes("lucarnă") || name.includes("lucarna") || name.includes("dormer")) return <IllustrationRoof bridge={bridge} variant="dormer" />;
    if (name.includes("verde intensiv")) return <IllustrationRoof bridge={bridge} variant="green-intensive" />;
    if (name.includes("verde")) return <IllustrationRoof bridge={bridge} variant="green-extensive" />;
    if (name.includes("atic") || name.includes("parapet")) return <IllustrationRoof bridge={bridge} variant="parapet" />;
    if (name.includes("calcan") || name.includes("gable")) return <IllustrationRoof bridge={bridge} variant="gable" />;
    if (name.includes("coamă") || name.includes("coama")) return <IllustrationRoof bridge={bridge} variant="ridge" />;
    if (name.includes("terasă") || name.includes("terasa") || name.includes("inverted")) return <IllustrationWallFloorRoof bridge={bridge} />;
    if (name.includes("căpriori") || name.includes("caprior") || name.includes("rafter")) return <IllustrationTimber bridge={bridge} variant="rafters" />;
    return <IllustrationRoof bridge={bridge} variant="eaves" />;
  }

  // ── Joncțiuni pereți ──────────────────────────────────────────────────────
  if (cat === "Joncțiuni pereți" || cat === "Joncțiuni pereți – tipuri speciale" || cat === "Joncțiuni speciale") {
    if (name.includes("colț exterior") || name.includes("colt exterior")) return <IllustrationCorner bridge={bridge} internal={false} />;
    if (name.includes("colț interior") || name.includes("colt interior")) return <IllustrationCorner bridge={bridge} internal={true} />;
    if (name.includes("nișă") || name.includes("nisa") || name.includes("radiator")) return <IllustrationRadiatorNiche bridge={bridge} />;
    if (name.includes("panou prefab") || name.includes("ipct") || name.includes("bloc vechi")) return <IllustrationPrecastPanel bridge={bridge} />;
    if (name.includes("cfs") || name.includes("light steel")) return <IllustrationColumnBeam bridge={bridge} />;
    if (name.includes("timber frame") || name.includes("lemn")) return <IllustrationTimber bridge={bridge} variant="timber-frame" />;
    if (name.includes("terasă") || name.includes("terasa") || name.includes("pod") || name.includes("cornișă") || name.includes("coamă") || name.includes("streașină") || name.includes("atic")) return <IllustrationWallFloorRoof bridge={bridge} />;
    if (name.includes("scară") || name.includes("scara") || name.includes("treaptă") || name.includes("treapta")) return <IllustrationFoundation bridge={bridge} variant="strip" />;
    if (name.includes("sol") || name.includes("subsol") || name.includes("fundație") || name.includes("fundatie") || name.includes("soclu") || name.includes("radier") || name.includes("piatră") || name.includes("piatra")) return <IllustrationWallGround bridge={bridge} asSoil={!name.includes("subsol")} />;
    if (name.includes("planșeu intermediar") || name.includes("planseu intermediar") || name.includes("perete int") || name.includes("consolă beton") || name.includes("monolit")) return <IllustrationWallFloorIntermediate bridge={bridge} />;
    return <IllustrationWallFloorIntermediate bridge={bridge} />;
  }

  // ── Stâlpi, grinzi, structuri ─────────────────────────────────────────────
  if (cat === "Stâlpi/grinzi" || cat === "Structuri speciale" || cat === "Structuri prefabricate") {
    if (name.includes("panou sandwich") || name.includes("sandwich prefab") || name.includes("conector") || name.includes("tijă")) return <IllustrationETICS bridge={bridge} variant="sandwich-tie" />;
    if (name.includes("panou prefab") || name.includes("ipct")) return <IllustrationPrecastPanel bridge={bridge} />;
    if (name.includes("capete de grindă") && name.includes("lemn")) return <IllustrationTimber bridge={bridge} variant="timber-frame" />;
    return <IllustrationColumnBeam bridge={bridge} />;
  }

  // ── Instalații ────────────────────────────────────────────────────────────
  if (cat === "Instalații" || cat === "Instalații avansate" || cat === "Instalații – tipuri speciale") {
    if (name.includes("coș") || name.includes("cos") || name.includes("chimney")) {
      if (name.includes("zidărie") || name.includes("zidarie")) return <IllustrationChimneyMasonry bridge={bridge} />;
      return <IllustrationService bridge={bridge} />;
    }
    if (name.includes("roletă") || name.includes("roleta") || name.includes("jaluzele") || name.includes("casetă") || name.includes("caseta")) return <IllustrationRollerShutter bridge={bridge} />;
    return <IllustrationService bridge={bridge} />;
  }

  // ── Fundații & subsol ─────────────────────────────────────────────────────
  if (cat === "Fundații și subsol") {
    if (name.includes("passivhaus") || name.includes("xps sub radier") || name.includes("în l") || name.includes("in l")) return <IllustrationFoundation bridge={bridge} variant="passivhaus-l" />;
    if (name.includes("radier")) return <IllustrationFoundation bridge={bridge} variant="mat" />;
    if (name.includes("piloți") || name.includes("piloti")) return <IllustrationFoundation bridge={bridge} variant="piles" />;
    if (name.includes("subsol") || name.includes("pivniță") || name.includes("pivnita")) return <IllustrationFoundation bridge={bridge} variant="raft-basement" />;
    return <IllustrationFoundation bridge={bridge} variant="strip" />;
  }

  // ── Structuri din lemn ────────────────────────────────────────────────────
  if (cat === "Structuri din lemn") {
    if (name.includes("clt")) return <IllustrationTimber bridge={bridge} variant="clt" />;
    if (name.includes("sip")) return <IllustrationTimber bridge={bridge} variant="sip" />;
    if (name.includes("căpriori") || name.includes("caprior") || name.includes("șarpantă") || name.includes("sarpanta")) return <IllustrationTimber bridge={bridge} variant="rafters" />;
    if (name.includes("acoperiș") || name.includes("acoperis") || name.includes("atic")) return <IllustrationRoof bridge={bridge} variant="eaves" />;
    return <IllustrationTimber bridge={bridge} variant="timber-frame" />;
  }

  // ── Sisteme ETICS ─────────────────────────────────────────────────────────
  if (cat === "Sisteme ETICS") {
    if (name.includes("plastic")) return <IllustrationETICS bridge={bridge} variant="anchor-plastic" />;
    if (name.includes("soclu") || name.includes("drip")) return <IllustrationETICS bridge={bridge} variant="plinth-drip" />;
    if (name.includes("colț") || name.includes("colt") || name.includes("profil de colț")) return <IllustrationETICS bridge={bridge} variant="corner-profile" />;
    if (name.includes("pervaz") || name.includes("sub fereastră")) return <IllustrationETICS bridge={bridge} variant="window-band" />;
    if (name.includes("rost") || name.includes("dilatare") || name.includes("expansion")) return <IllustrationETICS bridge={bridge} variant="expansion-joint" />;
    return <IllustrationETICS bridge={bridge} variant="anchor-metal" />;
  }

  // ── Elemente punctuale (χ) ────────────────────────────────────────────────
  if (cat === "Elemente punctuale (chi)") {
    if (name.includes("plastic")) return <IllustrationETICS bridge={bridge} variant="anchor-plastic" />;
    if (name.includes("tijă") || name.includes("tija") || name.includes("conector") || name.includes("panou sandwich")) return <IllustrationETICS bridge={bridge} variant="sandwich-tie" />;
    if (name.includes("ancoră") || name.includes("ancora") || name.includes("cavity")) return <IllustrationETICS bridge={bridge} variant="anchor-metal" />;
    return <IllustrationETICS bridge={bridge} variant="anchor-metal" />;
  }

  return <IllustrationGenericFallback bridge={bridge} />;
}

// ── Component public ─────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object} props.bridge — tipologia de punte termică
 * @param {object} [props.details] — metadata suplimentare (fRsi, priority, isoClass)
 * @param {boolean} [props.showOverlays=true] — afișează PriorityBadge / IsoClassBadge / CondensationZone
 * @param {"legacy"|"card"|"detail"} [props.mode="legacy"]
 *   - "legacy" — comportament vechi (labels interne suprapuse de badge-uri)
 *   - "card"   — strip EXT/INT extern deasupra, ascunde PsiBadge intern (titlul cardului afișează deja Ψ)
 *   - "detail" — ca "card" + mai mare, include legendă
 */
export default function BridgeIllustration({ bridge, details, showOverlays = true, mode = "legacy" }) {
  if (!bridge) return null;
  const condZone = details?.fRsi != null && details.fRsi < 0.80
    ? { x: W * 0.22, y: H * 0.35, w: W * 0.30, h: H * 0.30 }
    : null;

  // Card mode: strip extern EXT/INT adaptiv per categorie + clip inferior pentru a ascunde PsiBadge-urile interne;
  // NU se adaugă IllustrationOverlay (IsoClassBadge + PriorityBadge) — afișate în cardul părinte.
  if (mode === "card" || mode === "detail") {
    // Detectare orientare per categorie/nume punte — unde este cazul
    const cat = (bridge.cat || "").toLowerCase();
    const name = (bridge.name || "").toLowerCase();
    const isRoof = /acoperiș|acoperis|terasă|terasa|atic|coamă|coama|streașină|streasina|cornișă|cornisa/.test(cat + " " + name);
    const isGround = /sol|subsol|fundație|fundatie|radier|soclu|piloți|piloti|pe sol|peste subsol/.test(cat + " " + name);
    const isCorner = /colț|colt|corner/.test(name);

    // 3 layout-uri: standard (EXT stg / INT dr), roof (EXT sus / INT jos), ground (INT sus / SOL jos)
    const layout = isRoof ? "roof" : isGround ? "ground" : isCorner ? "corner" : "standard";

    const padTop = 24;
    const padBottom = 6;
    const clipBottom = 22;
    const clipId = `clip-bridge-${(bridge.name || "x").replace(/\W/g, "").slice(0, 16)}`;

    // Etichete + culori per layout
    let leftLabel, rightLabel, leftColor, rightColor, leftFill, rightFill;
    if (layout === "roof") {
      leftLabel = "EXTERIOR (acoperiș)"; rightLabel = "INTERIOR";
      leftColor = "#1e40af"; rightColor = "#15803d";
      leftFill = "#dbeafe"; rightFill = "#dcfce7";
    } else if (layout === "ground") {
      leftLabel = "INTERIOR"; rightLabel = "SOL / SUBSOL";
      leftColor = "#15803d"; rightColor = "#78350f";
      leftFill = "#dcfce7"; rightFill = "#fef3c7";
    } else if (layout === "corner") {
      leftLabel = "EXTERIOR"; rightLabel = "INTERIOR (colț)";
      leftColor = "#1e40af"; rightColor = "#15803d";
      leftFill = "#dbeafe"; rightFill = "#dcfce7";
    } else {
      leftLabel = "EXTERIOR"; rightLabel = "INTERIOR";
      leftColor = "#1e40af"; rightColor = "#15803d";
      leftFill = "#dbeafe"; rightFill = "#dcfce7";
    }

    return (
      <svg
        viewBox={`0 ${-padTop} ${W} ${H - clipBottom + padTop + padBottom}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }}
        role="img"
        aria-label={`Secțiune ilustrativă: ${bridge.name}`}
      >
        <Defs />
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={W} height={H - clipBottom} />
          </clipPath>
        </defs>

        {/* Strip extern adaptiv — deasupra zonei desenate */}
        <rect x="0" y={-padTop} width={W / 2} height={padTop} fill={leftFill} />
        <rect x={W / 2} y={-padTop} width={W / 2} height={padTop} fill={rightFill} />
        <text x={W / 4} y={-padTop / 2 + 4} fontSize="10" fontWeight="700" fill={leftColor} textAnchor="middle" style={{ letterSpacing: "0.5px" }}>{leftLabel}</text>
        <text x={(3 * W) / 4} y={-padTop / 2 + 4} fontSize="10" fontWeight="700" fill={rightColor} textAnchor="middle" style={{ letterSpacing: "0.5px" }}>{rightLabel}</text>
        <line x1={W / 2} y1={-padTop} x2={W / 2} y2={0} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" strokeDasharray="2 2" />

        {/* Ilustrația originală — clipped pentru a exclude PsiBadge-urile interne */}
        <g clipPath={`url(#${clipId})`}>
          {pickIllustration(bridge)}
          {mode === "detail" && details && (
            <IllustrationOverlay
              fRsi={details.fRsi}
              priority={null}
              isoClass={null}
              condZone={condZone}
            />
          )}
        </g>
      </svg>
    );
  }

  // Legacy mode (backward-compat)
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
      {showOverlays && details && (
        <IllustrationOverlay
          fRsi={details.fRsi}
          priority={details.priority}
          isoClass={details.isoClass}
          condZone={condZone}
        />
      )}
    </svg>
  );
}
