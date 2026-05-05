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

import { createContext, useContext } from "react";

const W = 320;
const H = 200;

// Context care permite ascunderea elementelor redundante (PsiBadge, EnvBanners simple)
// când ilustrațiile sunt randate în mod card/detail (în catalog/modal)
export const BridgeRenderContext = createContext({ mode: "legacy" });

// ── Defs globale — pattern-uri tehnice ISO 128 (desen de execuție) ───────────
function Defs() {
  return (
    <defs>
      {/* EPS — triunghiuri (convenție desen tehnic pentru polistiren) */}
      <pattern id="p-eps" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#fef9e7" />
        <path d="M0,5 L5,0 L10,5 L5,10 Z" fill="none" stroke="#7a6a1a" strokeWidth="0.45" />
        <path d="M2,5 L5,2 L8,5 L5,8 Z" fill="none" stroke="#7a6a1a" strokeWidth="0.35" opacity="0.7" />
      </pattern>

      {/* XPS — triunghiuri mai dense (extrudat) cu tentă portocalie subtilă */}
      <pattern id="p-xps" patternUnits="userSpaceOnUse" width="9" height="9">
        <rect width="9" height="9" fill="#fbe9e1" />
        <path d="M0,4.5 L4.5,0 L9,4.5 L4.5,9 Z" fill="none" stroke="#9a4f30" strokeWidth="0.45" />
        <path d="M2,4.5 L4.5,2 L7,4.5 L4.5,7 Z" fill="none" stroke="#9a4f30" strokeWidth="0.35" opacity="0.7" />
      </pattern>

      {/* Vată minerală — linii ondulate (convenție desen tehnic) */}
      <pattern id="p-mw" patternUnits="userSpaceOnUse" width="14" height="6">
        <rect width="14" height="6" fill="#f4efe1" />
        <path d="M0,3 Q3.5,0 7,3 T14,3" fill="none" stroke="#7d6b3a" strokeWidth="0.45" />
        <path d="M0,5 Q3.5,2 7,5 T14,5" fill="none" stroke="#7d6b3a" strokeWidth="0.35" opacity="0.7" />
      </pattern>

      {/* Cărămidă zidărie — pattern realist cu rosturi alternante */}
      <pattern id="p-brick" patternUnits="userSpaceOnUse" width="20" height="10">
        <rect width="20" height="10" fill="#c08672" />
        {/* mortar joints */}
        <line x1="0" y1="0" x2="20" y2="0" stroke="#3a2820" strokeWidth="0.7" />
        <line x1="0" y1="5" x2="20" y2="5" stroke="#3a2820" strokeWidth="0.7" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="#3a2820" strokeWidth="0.7" />
        <line x1="10" y1="0" x2="10" y2="5" stroke="#3a2820" strokeWidth="0.6" />
        <line x1="0" y1="5" x2="0" y2="10" stroke="#3a2820" strokeWidth="0.6" />
        <line x1="20" y1="5" x2="20" y2="10" stroke="#3a2820" strokeWidth="0.6" />
      </pattern>

      {/* BCA zidărie — blocuri mari cu hașuri fine */}
      <pattern id="p-bca" patternUnits="userSpaceOnUse" width="20" height="10">
        <rect width="20" height="10" fill="#ecdfc4" />
        <line x1="0" y1="0" x2="20" y2="0" stroke="#7a6a45" strokeWidth="0.5" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="#7a6a45" strokeWidth="0.5" />
        <line x1="10" y1="0" x2="10" y2="10" stroke="#7a6a45" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="3" y2="3" stroke="#a9956c" strokeWidth="0.25" opacity="0.5" />
        <line x1="10" y1="0" x2="13" y2="3" stroke="#a9956c" strokeWidth="0.25" opacity="0.5" />
      </pattern>

      {/* Beton armat — diagonale 45° (ISO 128 — beton) */}
      <pattern id="p-conc" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#cdd1d4" />
        <path d="M0,6 L6,0" stroke="#5a5d62" strokeWidth="0.45" />
      </pattern>

      {/* Beton simplu — diagonale + puncte (ISO 128 — beton de fundație) */}
      <pattern id="p-conc-plain" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#d6d8da" />
        <path d="M0,8 L8,0" stroke="#5a5d62" strokeWidth="0.4" />
        <circle cx="2" cy="2" r="0.4" fill="#5a5d62" />
        <circle cx="6" cy="6" r="0.4" fill="#5a5d62" />
      </pattern>

      {/* Tencuială / mortar — stipple fin */}
      <pattern id="p-plaster" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#f0e9d8" />
        <circle cx="1.5" cy="1.5" r="0.25" fill="#8a7d56" />
        <circle cx="4.5" cy="4.5" r="0.25" fill="#8a7d56" />
        <circle cx="3" cy="3" r="0.18" fill="#8a7d56" opacity="0.7" />
      </pattern>

      {/* Șapă — granulație medie */}
      <pattern id="p-screed" patternUnits="userSpaceOnUse" width="7" height="7">
        <rect width="7" height="7" fill="#dcd6cc" />
        <circle cx="1.5" cy="2" r="0.4" fill="#7a7368" />
        <circle cx="5" cy="4.5" r="0.4" fill="#7a7368" />
        <circle cx="3" cy="6" r="0.3" fill="#7a7368" opacity="0.7" />
      </pattern>

      {/* Lemn — fibre paralele (ISO 128 — lemn în secțiune longitudinală) */}
      <pattern id="p-wood" patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="#d2b07c" />
        <path d="M0,3 Q7,1 14,3" fill="none" stroke="#7a5530" strokeWidth="0.5" />
        <path d="M0,7 Q7,5 14,7" fill="none" stroke="#7a5530" strokeWidth="0.5" />
        <path d="M0,11 Q7,9 14,11" fill="none" stroke="#7a5530" strokeWidth="0.5" />
      </pattern>

      {/* Sol — hașură ISO (sol natural) */}
      <pattern id="p-soil" patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="#a8896d" />
        <path d="M0,12 L12,0" stroke="#5d4638" strokeWidth="0.6" />
        <path d="M0,6 L6,0" stroke="#5d4638" strokeWidth="0.5" opacity="0.7" />
        <path d="M6,12 L12,6" stroke="#5d4638" strokeWidth="0.5" opacity="0.7" />
      </pattern>

      {/* Pietriș drenaj — cercuri mici realiste */}
      <pattern id="p-gravel" patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="#dcd2bc" />
        <circle cx="3" cy="3" r="1.4" fill="none" stroke="#6f6353" strokeWidth="0.4" />
        <circle cx="9" cy="5" r="1.1" fill="none" stroke="#6f6353" strokeWidth="0.4" />
        <circle cx="5" cy="10" r="1.3" fill="none" stroke="#6f6353" strokeWidth="0.4" />
        <circle cx="11" cy="11" r="1" fill="none" stroke="#6f6353" strokeWidth="0.4" />
      </pattern>

      {/* Metal — solid cu margine întunecată (oțel/aluminiu) */}
      <linearGradient id="g-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9aa1a8" />
        <stop offset="50%" stopColor="#6c727a" />
        <stop offset="100%" stopColor="#444a52" />
      </linearGradient>

      {/* Sticlă — gradient subtil albastru-cenușiu */}
      <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#a8c5d8" stopOpacity="0.45" />
        <stop offset="50%" stopColor="#cfdde6" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#86a0b3" stopOpacity="0.45" />
      </linearGradient>

      {/* Aer exterior — gri foarte deschis cu tentă rece */}
      <linearGradient id="g-ext" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f4f6f8" />
        <stop offset="100%" stopColor="#e2e7ec" />
      </linearGradient>

      {/* Aer interior — gri foarte deschis cu tentă caldă */}
      <linearGradient id="g-int" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbf8f3" />
        <stop offset="100%" stopColor="#f3ede2" />
      </linearGradient>

      {/* Overlay căldură punte — subtil, doar margine roșie pentru a marca zona */}
      <radialGradient id="g-heat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#d63b1f" stopOpacity="0.30" />
        <stop offset="70%" stopColor="#d63b1f" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#d63b1f" stopOpacity="0" />
      </radialGradient>

      {/* Săgeată flux termic — tehnic, capăt închis */}
      <marker id="arrow-heat" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" fill="#c62828" />
      </marker>

      {/* Armătură — cercuri pline (secțiune bară) */}
      <pattern id="p-rebar" patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="transparent" />
        <circle cx="3" cy="3" r="1" fill="#1a1c1f" stroke="#1a1c1f" strokeWidth="0.4" />
        <circle cx="3" cy="3" r="0.4" fill="#cdd1d4" />
        <circle cx="11" cy="11" r="1" fill="#1a1c1f" stroke="#1a1c1f" strokeWidth="0.4" />
        <circle cx="11" cy="11" r="0.4" fill="#cdd1d4" />
      </pattern>

      {/* Membrană / barieră — linie groasă neagră (ISO membrane) */}
      <pattern id="p-membrane" patternUnits="userSpaceOnUse" width="6" height="3">
        <rect width="6" height="3" fill="#1f2126" />
        <line x1="0" y1="1.5" x2="6" y2="1.5" stroke="#5a5d62" strokeWidth="0.3" />
      </pattern>

      {/* Pardoseală finită (parchet) — dungi paralele lungi */}
      <pattern id="p-floor" patternUnits="userSpaceOnUse" width="20" height="6">
        <rect width="20" height="6" fill="#c8a06a" />
        <line x1="0" y1="0" x2="20" y2="0" stroke="#6b4d28" strokeWidth="0.5" />
        <line x1="0" y1="6" x2="20" y2="6" stroke="#6b4d28" strokeWidth="0.5" />
        <line x1="10" y1="0" x2="10" y2="6" stroke="#6b4d28" strokeWidth="0.4" />
      </pattern>

      {/* Hașură condens (dungi diagonale albastre — risc) */}
      <pattern id="p-cond" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#0c75a8" strokeWidth="1" opacity="0.55" />
      </pattern>
    </defs>
  );
}

// ── Primitive reutilizabile ──────────────────────────────────────────────────

// Label tehnic — font monospace, label-leader subtil cu fundal alb
function Label({ x, y, children, color = "#1a1c1f", size = 8, anchor = "start", bold = false, bg = false }) {
  if (bg) {
    const text = String(children);
    const w = text.length * size * 0.55 + 6;
    const ax = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x - 3;
    return (
      <g style={{ pointerEvents: "none" }}>
        <rect x={ax} y={y - size + 1} width={w} height={size + 3} fill="rgba(255,255,255,0.92)" stroke="#5a5d62" strokeWidth="0.25" />
        <text x={x} y={y + 1} fontSize={size} fill={color} textAnchor={anchor} fontWeight={bold ? 700 : 500} fontFamily="ui-monospace, Menlo, Consolas, monospace" style={{ letterSpacing: "0.2px" }}>
          {children}
        </text>
      </g>
    );
  }
  return (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontWeight={bold ? 700 : 500} fontFamily="ui-monospace, Menlo, Consolas, monospace" style={{ letterSpacing: "0.2px" }}>
      {children}
    </text>
  );
}

// Banner EXT/INT pe margine (stil cartuș tehnic) — în card/detail mode, banner-ele
// simple "EXT"/"INT"/"INTERIOR" sunt ascunse pentru că le afișăm prominent în modal.
// Banner-ele cu detalii specifice ("POD", "SOL", "SUBSOL", "EXT (terasă)" etc.) rămân.
function EnvBanner({ x, y, w, h, label, side = "top", fill = "#dde3e9", color = "#1a3858" }) {
  const { mode } = useContext(BridgeRenderContext);
  if (mode === "card" || mode === "detail") {
    // Etichete redundante (acoperite de banner-ul extern al modalului) — ascunde
    if (/^(ext|exterior|int|interior)$/i.test((label || "").trim())) return null;
  }
  // În card/detail, dimensiuni mai mari + culori mai puternice pentru lizibilitate
  const isCardOrDetail = mode === "card" || mode === "detail";
  const fontSize = isCardOrDetail ? 9 : 7.5;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke="#1a1c1f" strokeWidth={isCardOrDetail ? 0.6 : 0.4} />
      <text x={x + w / 2} y={y + h / 2 + 3} fontSize={fontSize} fill={color} textAnchor="middle" fontWeight="700" fontFamily="ui-monospace, Menlo, Consolas, monospace" style={{ letterSpacing: "1px" }}>
        {label}
      </text>
    </g>
  );
}

// Zona punte termică — overlay subtil + contur dashed (marcare tehnică)
function HeatZone({ x, y, w, h, rx = 0 }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#g-heat)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke="#c62828" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.7" />
    </g>
  );
}

// Săgeată flux termic — linie continuă subțire cu cap închis tehnic
function HeatArrow({ x1, y1, x2, y2 }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c62828" strokeWidth="1.2" markerEnd="url(#arrow-heat)" />;
}

// Badge Ψ în stil cartuș tehnic (col dreapta-jos)
// În card/detail mode (catalog/modal), Ψ se afișează în afara SVG-ului — ascundem badge-ul.
function PsiBadge({ psi, x = 6, y = H - 6 }) {
  const { mode } = useContext(BridgeRenderContext);
  if (mode === "card" || mode === "detail") return null;
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <rect x="0" y="-12" width="100" height="14" fill="rgba(255,255,255,0.95)" stroke="#1a1c1f" strokeWidth="0.5" />
      <line x1="22" y1="-12" x2="22" y2="2" stroke="#1a1c1f" strokeWidth="0.4" />
      <text x="11" y="-2" fontSize="9" fontWeight="700" fill="#1a1c1f" textAnchor="middle" fontFamily="ui-monospace, Menlo, Consolas, monospace">Ψ</text>
      <text x="26" y="-2" fontSize="8.5" fontWeight="600" fill="#c62828" fontFamily="ui-monospace, Menlo, Consolas, monospace">{psi} W/(m·K)</text>
    </g>
  );
}

// Linie indicatoare cu leader (label la capătul liniei) — cu fundal pentru lizibilitate
function Leader({ x1, y1, x2, y2, label, anchor = "start", color = "#1a1c1f", size = 7 }) {
  // Estimare lățime text (caractere monospace ~0.6em)
  const textW = Math.max(18, label.length * size * 0.62 + 6);
  const textH = size + 4;
  const textX = x2 + (anchor === "end" ? -2 : 2);
  const rectX = anchor === "end" ? textX - textW + 2 : textX - 3;
  const rectY = y2 - size - 1;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.5" opacity="0.9" />
      <circle cx={x1} cy={y1} r="1.1" fill={color} />
      <rect x={rectX} y={rectY} width={textW} height={textH} fill="rgba(255,255,255,0.94)" stroke={color} strokeWidth="0.25" rx="1.5" />
      <text x={textX} y={y2 - 1} fontSize={size} fill={color} textAnchor={anchor} fontFamily="ui-monospace, Menlo, Consolas, monospace" fontWeight="600">
        {label}
      </text>
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

/**
 * Vertical section — perete + planșeu intermediar BA penetrant
 * conf. Mc 001-2022 § 4.4 (ψ_pl) + SR EN ISO 14683:2017 IF-pl
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Hașuri ISO 128-50 · ψ tipic: 0.40-0.85 W/(m·K) clasa C/D ISO 14683
 */
function IllustrationWallFloorIntermediate({ bridge }) {
  // Geometrie perete (de la EXT la INT) — proporțional Mc 001-2022
  const xExt = W * 0.18;
  const tFinExt = 5;        // tencuială exterioară 5mm
  const tEPS = 28;          // izolație EPS 100mm
  const tBrick = 38;        // zidărie GVP 250mm
  const tFinInt = 6;        // tencuială interioară 15mm
  const xFinExt = xExt;
  const xEPS = xFinExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yFloor = H * 0.48;
  const tFloor = 22;        // planșeu BA 200mm
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* === PERETE: 4 straturi proporționale === */}
      <rect x={xFinExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === PLANȘEU BA INTERIOR (penetrare în zidărie, izolația continuă) === */}
      <rect x={xBrick} y={yFloor - tFloor / 2} width={W - xBrick} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xBrick} y={yFloor - tFloor / 2} width={W - xBrick} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
      {/* === PARDOSEALĂ (parchet + șapă peste planșeu) === */}
      <rect x={xFinInt} y={yFloor - tFloor / 2 - 8} width={W - xFinInt} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xFinInt} y={yFloor - tFloor / 2 - 12} width={W - xFinInt} height="4" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* === ZONA PUNTE TERMICĂ (la pătrunderea planșeului în zidărie) === */}
      <HeatZone x={xEPS - 2} y={yFloor - 18} w={tEPS + tBrick + 4} h={36} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yFloor} x2={xEPS - 4} y2={yFloor} />
      {/* Izotermă — deviere prin planșeu BA (vizualizare sugestivă) */}
      <IsothermHint x={xEPS - 2} y={yFloor - 18} w={tEPS + tBrick + 4} h={36} />
      {/* === BANNERS EXT / INT === */}
      <EnvBanner x="0" y="0" w={xExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      {/* === LEADERS === */}
      <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 8} y2="6" label="EPS 100mm" anchor="end" />
      <Leader x1={xBrick + tBrick / 2} y1="22" x2={xBrick + tBrick / 2 + 10} y2="6" label="zidărie 250mm" anchor="start" />
      <Leader x1={(xBrick + W) / 2} y1={yFloor + 1} x2={W - 6} y2={yFloor + 28} label="planșeu BA 200mm" anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical section — perete + planșeu terasă cu atic
 * conf. Mc 001-2022 § 4.4 (ψ_at) + SR EN ISO 14683:2017 R-cor
 * Straturi terasă (de sus): hidroizolație 4 + XPS 150 + BA 200 + tenc.int 15 mm
 * Atic BA 250mm + capac metalic
 * ψ tipic: 0.50-0.95 W/(m·K) atic neizolat, 0.10-0.25 W/(m·K) izolat clasa B
 */
function IllustrationWallFloorRoof({ bridge }) {
  const xWallExt = W * 0.18;
  const tFinExt = 5;
  const tEPS = 28;
  const tBrick = 38;
  const tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  // Terasă (top-down)
  const yMembrane = H * 0.30;
  const yXPS = yMembrane + 3;
  const yConcTop = yXPS + 22;
  const tConc = 22;
  const yScreed = yConcTop + tConc;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={yScreed + 6} width={W} height={H - yScreed - 6} fill="url(#g-int)" />
      {/* === PERETE === */}
      <rect x={xWallExt} y={yMembrane} width={tFinExt} height={H - yMembrane} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y={yMembrane} width={tEPS} height={H - yMembrane} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yScreed} width={tBrick} height={H - yScreed} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yScreed} width={tFinInt} height={H - yScreed} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === TERASA (de sus în jos): hidroizolație → XPS → BA → șapă → tenc.int === */}
      <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xWallExt} y={yXPS} width={W - xWallExt} height="22" fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xWallExt} y={yMembrane} width={W - xWallExt} height="3" fill="url(#p-membrane)" />
      <rect x={xFinInt} y={yScreed} width={W - xFinInt} height="6" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* === ATIC === */}
      <rect x={xWallExt} y="14" width={tFinExt + tEPS + tBrick * 0.6} height={yMembrane - 14} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xWallExt} y="14" width={tFinExt + tEPS + tBrick * 0.6} height={yMembrane - 14} fill="url(#p-rebar)" opacity="0.45" />
      <rect x={xWallExt - 2} y="10" width={tFinExt + tEPS + tBrick * 0.6 + 4} height="5" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === ZONA PUNTE === */}
      <HeatZone x={xWallExt - 4} y={yMembrane - 6} w={tFinExt + tEPS + tBrick + 4} h={tConc + 18} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yConcTop + tConc / 2} x2={xEPS - 4} y2={yConcTop + tConc / 2} />
      {/* Izotermă — deviere prin atic/coltare terasă */}
      <IsothermHint x={xWallExt - 4} y={yMembrane - 6} w={tFinExt + tEPS + tBrick + 4} h={tConc + 18} />
      {/* === BANNERS === */}
      <EnvBanner x="0" y="0" w={W} h="10" label="EXT (terasă)" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
      {/* === LEADERS — pozițiile y2 scalonate, etichete cu unități explicite === */}
      <Leader x1={xEPS + tEPS / 2} y1={yScreed + 18} x2={xEPS + tEPS / 2 - 14} y2={H - 16} label="EPS 100mm" anchor="end" />
      <Leader x1={(xBrick + W) * 0.55} y1={yMembrane + 1} x2={W - 6} y2={yMembrane - 14} label="hidroizol. 4mm" anchor="end" />
      <Leader x1={(xBrick + W) * 0.65} y1={yXPS + 11} x2={W - 6} y2={yXPS + 32} label="XPS 150mm" anchor="end" />
      <Leader x1={(xBrick + W) / 2} y1={yConcTop + tConc / 2} x2={W - 6} y2={yConcTop + tConc + 22} label="BA 200mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x={W - 102} y={H - 16} />
    </>
  );
}

/**
 * Vertical section — perete + placă pe sol/peste subsol cu izolație perimetrală
 * conf. Mc 001-2022 § 4.4 (ψ_sol) + SR EN ISO 13370 + SR EN ISO 14683 GF
 * Straturi placă (sus→jos): parchet 10 + șapă 50 + EPS 80 + BA 200
 * Izolație perimetrală XPS 80mm coborâtă min. 600mm sub CTS
 * ψ tipic: 0.40-0.80 W/(m·K) neizolat, 0.10-0.25 W/(m·K) cu XPS perim. (clasa B-C)
 */
function IllustrationWallGround({ bridge, asSoil = true }) {
  const xWallExt = W * 0.18;
  const tFinExt = 5;
  const tEPS = 28;
  const tBrick = 38;
  const tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yCTS = H * 0.42;     // cota teren sistematizat
  const yFloorTop = H * 0.40; // cota pardoseală finită
  // straturi placă (sus în jos)
  const tParchet = 4;
  const tScreed = 8;
  const tEPSFloor = 12;
  const tBA = 20;
  return (
    <>
      <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
      {/* === SOL / SUBSOL === */}
      <rect x="0" y={yCTS} width={W} height={H - yCTS} fill={asSoil ? "url(#p-soil)" : "url(#g-int)"} />
      {!asSoil && <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="rgba(50,55,60,0.18)" />}
      {/* === PERETE === */}
      <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={yFloorTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === FUNDAȚIE BA (cu armătură) === */}
      <rect x={xEPS} y={yCTS - 6} width={tEPS + tBrick + tFinInt} height={H * 0.30} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xEPS} y={yCTS - 6} width={tEPS + tBrick + tFinInt} height={H * 0.30} fill="url(#p-rebar)" opacity="0.45" />
      {/* === IZOLAȚIE PERIMETRALĂ XPS 80mm coborâtă === */}
      <rect x={xWallExt - 8} y={yFloorTop - 4} width="10" height={H * 0.32} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === PLACA PE SOL: parchet → șapă → EPS → BA === */}
      <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height={tBA} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height={tBA} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xFinInt} y={yFloorTop - tEPSFloor} width={W - xFinInt} height={tEPSFloor} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yFloorTop - tEPSFloor - tScreed} width={W - xFinInt} height={tScreed} fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xFinInt} y={yFloorTop - tEPSFloor - tScreed - tParchet} width={W - xFinInt} height={tParchet} fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* === ZONA PUNTE === */}
      <HeatZone x={xWallExt - 10} y={yFloorTop - 16} w={tFinExt + tEPS + tBrick + tFinInt + 16} h={32} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yFloorTop} x2={xEPS - 10} y2={yFloorTop} />
      {/* Izotermă — deviere la racordul perete-placă (condens risc la colț interior) */}
      <IsothermHint x={xWallExt - 10} y={yFloorTop - 16} w={tFinExt + tEPS + tBrick + tFinInt + 16} h={32} />
      {/* === BANNERS === */}
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label={asSoil ? "SOL" : "SUBSOL NEÎNCĂLZIT"} fill={asSoil ? "#d6c4a8" : "#cfd8dc"} color="#3a2a1a" />
      {/* === LEADERS === */}
      <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 8} y2="6" label="EPS 100mm" anchor="end" />
      <Leader x1={xWallExt - 3} y1={yFloorTop + 30} x2={xWallExt - 24} y2={yFloorTop + 50} label="XPS perim. 80mm" anchor="end" />
      <Leader x1={W - 30} y1={yFloorTop + tBA / 2} x2={W - 6} y2={yFloorTop + tBA + 22} label="BA placă 200mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
    </>
  );
}

/**
 * Plan view section — colț 90° (exterior convex sau interior concav)
 * conf. Mc 001-2022 § 4.4 (ψ_e/ψ_i) + SR EN ISO 14683 C
 * Straturi (din EXT spre INT): tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Hașuri ISO 128-50 · ψ tipic ext: 0.05-0.15 W/(m·K) izolat,
 * 0.30-0.55 W/(m·K) neizolat · ψ tipic int: -0.05 ÷ 0.10 W/(m·K) (clasa A-C)
 */
function IllustrationCorner({ bridge, internal = false }) {
  const cx = W / 2;
  const cy = H / 2;
  const tFinExt = 4;
  const tEPS = 14;
  const tBrick = 26;
  const tFinInt = 5;

  if (internal) {
    // Colț INTERIOR (concav) — interior se află în L
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-int)" />
        <path d={`M0,0 L${cx},0 L${cx},${cy} L${W},${cy} L${W},${H} L0,${H} Z`} fill="url(#g-ext)" />
        {/* Stratificare brațul vertical (perete cu EXT la stânga, INT la dreapta) */}
        <rect x={cx - tFinExt - tEPS - tBrick - tFinInt} y="0" width={tFinExt} height={cy + tFinInt + tBrick + tEPS + tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx - tEPS - tBrick - tFinInt} y="0" width={tEPS} height={cy + tBrick + tFinInt + tEPS} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx - tBrick - tFinInt} y="0" width={tBrick} height={cy + tFinInt + tBrick} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx - tFinInt} y="0" width={tFinInt} height={cy + tFinInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Stratificare brațul orizontal */}
        <rect x="0" y={cy - tFinExt - tEPS - tBrick - tFinInt} width={cx + tFinInt + tBrick + tEPS + tFinExt} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x="0" y={cy - tEPS - tBrick - tFinInt} width={cx + tBrick + tFinInt + tEPS} height={tEPS} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x="0" y={cy - tBrick - tFinInt} width={cx + tFinInt + tBrick} height={tBrick} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x="0" y={cy - tFinInt} width={cx + tFinInt} height={tFinInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* HeatZone la unghiul intern */}
        <HeatZone x={cx - 4} y={cy - 4} w="34" h="34" />
        <HeatArrow x1={cx + 28} y1={cy + 14} x2={cx + 4} y2={cy + 4} />
        {/* Izotermă — concentrare flux termic la colțul interior concav */}
        <IsothermHint x={cx - 4} y={cy - 4} w={34} h={34} color="#3b82f6" />
        <EnvBanner x={W - 70} y="6" w="60" h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x="6" y={H - 20} w="60" h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <Leader x1={cx - tEPS / 2 - tBrick - tFinInt} y1="20" x2={cx - 90} y2="6" label="EPS 100mm" anchor="start" />
        <Leader x1={cx - tBrick / 2 - tFinInt} y1="20" x2={cx + 6} y2="6" label="zidărie 250mm" anchor="start" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Colț EXTERIOR (convex) — exterior înconjoară unghiul, INT în colțul dreapta-jos
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={cx} y={cy} width={W - cx} height={H - cy} fill="url(#g-int)" />
      {/* Brațul vertical (jos, perete) */}
      <rect x={cx - tFinExt - tEPS - tBrick - tFinInt} y={cy - tFinExt - tEPS - tBrick - tFinInt} width={tFinExt} height={H} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tEPS - tBrick - tFinInt} y={cy - tEPS - tBrick - tFinInt} width={tEPS} height={H} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tBrick - tFinInt} y={cy - tBrick - tFinInt} width={tBrick} height={H} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tFinInt} y={cy - tFinInt} width={tFinInt} height={H} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Brațul orizontal (sus, perete) */}
      <rect x={cx - tFinExt - tEPS - tBrick - tFinInt} y={cy - tFinExt - tEPS - tBrick - tFinInt} width={W} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tEPS - tBrick - tFinInt} y={cy - tEPS - tBrick - tFinInt} width={W} height={tEPS} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tBrick - tFinInt} y={cy - tBrick - tFinInt} width={W} height={tBrick} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={cx - tFinInt} y={cy - tFinInt} width={W} height={tFinInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* HeatZone la unghi convex (pe partea INT) */}
      <HeatZone x={cx - 6} y={cy - 6} w="34" h="34" />
      <HeatArrow x1={cx + 24} y1={cy + 24} x2={cx - 8} y2={cy - 8} />
      {/* Izotermă — deviere la colțul exterior convex (risc mai mic vs. concav) */}
      <IsothermHint x={cx - 6} y={cy - 6} w={34} h={34} color="#f59e0b" />
      <EnvBanner x="6" y="6" w="60" h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={W - 70} y={H - 20} w="60" h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={cx + 40} y1={cy - tEPS / 2 - tBrick - tFinInt} x2={W - 30} y2={cy - tBrick - tFinInt - 16} label="EPS 100mm" anchor="end" />
      <Leader x1={cx + 40} y1={cy - tBrick / 2 - tFinInt} x2={W - 30} y2={cy + 12} label="zidărie 250mm" anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical section — joncțiune ramă fereastră / ușă cu perete (jamb/threshold/sill)
 * conf. Mc 001-2022 § 4.4 (ψ_f) + SR EN ISO 14683 W + SR EN ISO 10077-2
 * Straturi perete: tenc.ext 5 + EPS 100-150 + zidărie 250 + tenc.int 15 mm
 * Variante: standard (ramă în planul zidăriei) / in-insulation (montaj RAL în EPS)
 *           deep-ph (Passivhaus cu consolă Compacfoam) / sill (pervaz) / threshold (prag)
 * ψ tipic: 0.05-0.12 W/(m·K) Passivhaus, 0.10-0.25 W/(m·K) RAL în izolație,
 *          0.30-0.55 W/(m·K) standard (clasa A-C ISO 14683)
 */
function IllustrationWindow({ bridge, variant }) {
  const v = variant || "standard";
  const xWallExt = W * 0.16;
  const tFinExt = 5;
  const tEPS = v === "deep-ph" ? 38 : 28;
  const tBrick = 38;
  const tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;

  // Poziția ramei (centrul):
  const frameX =
    v === "deep-ph" ? xEPS + 6 :
    v === "in-insulation" ? xEPS + tEPS / 2 - 8 :
    v === "deep-metal-sill" ? xEPS + 4 :
    xBrick + 4; // standard — în planul zidăriei

  const showHeatZone = v !== "deep-ph";
  const showPrecompBand = v === "in-insulation" || v === "deep-ph";

  // SILL — secțiune orizontală sub fereastră (parapet)
  if (v === "sill") {
    const ySill = H * 0.40;
    return (
      <>
        <rect x="0" y="0" width={W} height={ySill} fill="url(#g-ext)" />
        <rect x={xWallEnd} y={ySill} width={W - xWallEnd} height={H - ySill} fill="url(#g-int)" />
        {/* Perete sub pervaz */}
        <rect x={xWallExt} y={ySill - 4} width={tFinExt} height={H - ySill + 4} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y={ySill - 4} width={tEPS} height={H - ySill + 4} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y={ySill - 4} width={tBrick} height={H - ySill + 4} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={ySill - 4} width={tFinInt} height={H - ySill + 4} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Bandă EPS continuă sub glaf (anti-punte) */}
        <rect x={xWallExt} y={ySill - 12} width={W - xWallExt} height="8" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Glaf metalic exterior (panta scurgerii apei) */}
        <path d={`M${xWallExt - 4},${ySill - 12} L${W - 10},${ySill - 14} L${W - 10},${ySill - 10} L${xWallExt - 4},${ySill - 8} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Ramă (parțial vizibilă deasupra) */}
        <rect x={frameX - 4} y={H * 0.20} width="22" height="16" fill="#f0ece4" stroke="#5a5550" strokeWidth="0.8" />
        <rect x={frameX} y={H * 0.20 - 8} width="14" height="8" fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        {showHeatZone && <HeatZone x={xEPS - 6} y={ySill - 18} w={tEPS + tBrick + 12} h="22" />}
        <EnvBanner x="0" y="0" w={W} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xEPS + tEPS / 2} y1={H - 30} x2={xEPS + tEPS / 2 - 12} y2={H - 18} label="EPS 100mm" anchor="end" />
        <Leader x1={(xWallExt + W) / 2} y1={ySill - 8} x2={W - 6} y2={ySill - 24} label="bandă EPS" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // THRESHOLD — prag ușă exterioară (secțiune verticală)
  if (v === "threshold") {
    const yFloor = H * 0.50;
    return (
      <>
        <rect x="0" y="0" width={W} height={yFloor} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        {/* Trotuar exterior + sol */}
        <rect x="0" y={yFloor + 4} width={xWallExt} height="6" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x="0" y={yFloor + 10} width={xWallExt} height={H - yFloor - 10} fill="url(#p-soil)" />
        {/* Perete */}
        <rect x={xWallExt} y="14" width={tFinExt} height={yFloor - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={yFloor - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={yFloor - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={yFloor - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Planșeu BA + finisare interioară */}
        <rect x={xFinInt} y={yFloor} width={W - xFinInt} height="20" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xFinInt} y={yFloor} width={W - xFinInt} height="20" fill="url(#p-rebar)" opacity="0.5" />
        <rect x={xFinInt} y={yFloor + 20} width={W - xFinInt} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Ușa */}
        <rect x={xBrick + 2} y={H * 0.16} width="6" height={yFloor - H * 0.16} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick + 8} y={H * 0.16} width="14" height={yFloor - H * 0.16 - 4} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Pragul metalic cu ruptură termică */}
        <rect x={xBrick - 6} y={yFloor - 4} width={tBrick + 14} height="6" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/Ruptur|ruptoare|thermal break/i.test(bridge.name) && (
          <rect x={xBrick + 4} y={yFloor - 4} width="3" height="6" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />
        )}
        <HeatZone x={xEPS - 4} y={yFloor - 16} w={tEPS + tBrick + 8} h="24" />
        <HeatArrow x1={xBrick + tBrick / 2} y1={yFloor - 2} x2={xEPS - 6} y2={yFloor - 2} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xBrick + 12} y1={H * 0.20} x2={W - 30} y2={H * 0.06} label="ușă" anchor="end" />
        <Leader x1={xBrick + 8} y1={yFloor - 1} x2={W - 30} y2={yFloor - 20} label="prag metalic" anchor="end" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // STANDARD / IN-INSULATION / DEEP-PH / DEEP-METAL-SILL — secțiune verticală jamb
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete (4 straturi) */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Glaf exterior metalic */}
      <rect x={xWallExt - 4} y={H * 0.60} width={tFinExt + tEPS + 6} height="3" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Consolă Compacfoam pentru Passivhaus */}
      {v === "deep-ph" && (
        <>
          <rect x={frameX - 6} y={H * 0.20} width="6" height={H * 0.46} fill="#7a6a52" stroke="#1a1c1f" strokeWidth="0.5" />
          <Label x={frameX - 3} y={H * 0.18} size={7} anchor="middle" bg>Compacfoam</Label>
        </>
      )}
      {/* Ramă fereastră */}
      <rect x={frameX - 2} y={H * 0.22} width="20" height={H * 0.42} fill={v === "deep-ph" ? "#2e2a24" : "#f0ece4"} stroke="#1a1c1f" strokeWidth="0.6" />
      {/* Sticlă (dublu/triplu strat după variantă) */}
      <rect x={frameX + 2} y={H * 0.25} width="14" height={H * 0.36} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
      <line x1={frameX + 6} y1={H * 0.26} x2={frameX + 6} y2={H * 0.60} stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
      {v === "deep-ph" && <line x1={frameX + 11} y1={H * 0.26} x2={frameX + 11} y2={H * 0.60} stroke="#ffffff" strokeWidth="0.7" opacity="0.5" />}
      {/* Bandă precomprimată / etanșare */}
      {showPrecompBand && <rect x={frameX - 3} y={H * 0.22} width="2" height={H * 0.42} fill="#a0522d" stroke="#1a1c1f" strokeWidth="0.3" />}
      {/* Izolație care se întoarce peste cercevea (deep-PH) */}
      {v === "deep-ph" && <rect x={frameX + 18} y={H * 0.22} width="6" height={H * 0.42} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />}
      {/* Punte */}
      {showHeatZone && <HeatZone x={frameX - 10} y={H * 0.20} w="34" h={H * 0.46} />}
      {showHeatZone && <HeatArrow x1={frameX + 22} y1={H * 0.42} x2={frameX - 6} y2={H * 0.42} />}
      {/* Banners */}
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      {/* Leaders */}
      <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 8} y2="6" label="EPS 100mm" anchor="end" />
      <Leader x1={xBrick + tBrick / 2} y1="22" x2={xBrick + tBrick / 2 + 10} y2="6" label="zidărie 250mm" anchor="start" />
      <Leader x1={frameX + 8} y1={H * 0.78} x2={W - 30} y2={H * 0.92} label={
        v === "deep-ph" ? "montaj Passivhaus" :
        v === "in-insulation" ? "montaj RAL în EPS" :
        v === "deep-metal-sill" ? "ramă cu glaf metalic" :
        "montaj în zidărie"} anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical section — fereastră de mansardă (Velux) în acoperiș înclinat
 * conf. Mc 001-2022 § 4.4 (ψ_lum) + SR EN ISO 14683 W
 * Straturi acoperiș (sus→jos): țigle 25 + folie 1 + aerare 30 + căpriori 200 cu MW + OSB 18 + placaj GK 12 mm
 * Ramă Velux cu flashing perimetral integrat
 * ψ tipic: 0.30-0.55 W/(m·K) montaj standard, 0.10-0.20 W/(m·K) montaj cu flashing termic
 */
function IllustrationVelux({ bridge }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={H * 0.78} width={W} height={H * 0.22} fill="url(#g-int)" />
      {/* === ȘARPANTĂ ÎNCLINATĂ - 6 straturi proporționale === */}
      {/* Țigle ceramice exterior (sus pe pantă) */}
      <polygon points={`${W},14 20,${H * 0.62} ${W},${H * 0.62}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Linii rosturi țigle */}
      {[0.18, 0.30, 0.42, 0.54].map((fy, i) => (
        <line key={i} x1={30 + i * 28} y1={H * 0.62 - i * 22} x2={W} y2={H * 0.62 - i * 22} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.6" />
      ))}
      {/* Folie + aerare */}
      <polygon points={`${W},22 30,${H * 0.59} ${W},${H * 0.59}`} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Căpriori lemn + izolație MW între */}
      <polygon points={`${W},32 44,${H * 0.55} ${W},${H * 0.55}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Căpriori (vertical lemn vizibil ca dungi) */}
      {[0.30, 0.50, 0.70, 0.88].map((fx, i) => (
        <rect key={i} x={W * fx} y={H * 0.30 + i * 8} width="6" height="14" fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.4" transform={`rotate(-30, ${W * fx + 3}, ${H * 0.30 + i * 8 + 7})`} />
      ))}
      {/* OSB + placaj interior */}
      <polygon points={`${W},${H * 0.55} 56,${H * 0.55} 56,${H * 0.59} ${W},${H * 0.59}`} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
      <polygon points={`${W},${H * 0.59} 60,${H * 0.59} 60,${H * 0.62} ${W},${H * 0.62}`} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* === FEREASTRA VELUX (rotită cu panta) === */}
      <g transform={`rotate(-30, ${W * 0.58}, ${H * 0.40})`}>
        <rect x={W * 0.50} y={H * 0.32} width="58" height="32" fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.8" />
        <rect x={W * 0.50 + 3} y={H * 0.32 + 3} width="52" height="26" fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        <line x1={W * 0.50 + 6} y1={H * 0.32 + 4} x2={W * 0.50 + 6} y2={H * 0.32 + 28} stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
      </g>
      {/* Flashing BBX (etanșare metalică perimetrală) */}
      <path d={`M${W * 0.52},${H * 0.42} L${W * 0.61},${H * 0.34} L${W * 0.66},${H * 0.38} L${W * 0.56},${H * 0.46} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === PUNTE TERMICĂ === */}
      <HeatZone x={W * 0.48} y={H * 0.34} w="50" h="32" />
      <HeatArrow x1={W * 0.62} y1={H * 0.50} x2={W * 0.50} y2={H * 0.45} />
      <EnvBanner x="0" y="0" w={W} h="12" label="EXT (acoperiș)" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT (mansardă)" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={(W * 0.58)} y1={H * 0.20} x2={W - 6} y2={H * 0.10} label="Velux + flashing BBX" anchor="end" />
      <Leader x1={(W * 0.92)} y1={H * 0.45} x2={W - 6} y2={H * 0.74} label="MW 200 + căpriori" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
    </>
  );
}

/**
 * Vertical section — placă consolă balcon + perete cu/fără ruptor termic
 * conf. Mc 001-2022 § 4.4 (ψ_b) + SR EN ISO 14683 B + SR EN ISO 10211
 * Variante: uninterrupted (placă continuă, punte majoră) / loggia (semi-închis) /
 *           isokorb-k/ks/kxt (Schöck) / halfen-hit / steel-pendant (tiranți inox) / precast-gfrp
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Placă consolă BA 200mm
 * ψ tipic: 0.80-1.15 W/(m·K) neîntrerupt, 0.10-0.30 W/(m·K) cu Isokorb (clasa A-B)
 */
function IllustrationBalcony({ bridge, variant }) {
  const v = variant || "uninterrupted";
  const name = bridge.name.toLowerCase();
  const hasBreak = v !== "uninterrupted" && v !== "loggia";

  // Geometrie comună perete
  const xWallExt = W * 0.18;
  const tFinExt = 5;
  const tEPS = 28;
  const tBrick = 38;
  const tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yFloor = H * 0.48;
  const tFloor = 22;

  // Steel pendant — balcon suspendat pe tiranți inox
  if (v === "steel-pendant") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        {/* Perete */}
        <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Planșeu interior (continuu, FĂRĂ extensie balcon) */}
        <rect x={xFinInt} y={yFloor - tFloor / 2} width={W - xFinInt} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xFinInt} y={yFloor - tFloor / 2} width={W - xFinInt} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
        {/* Placa balcon SUSPENDATĂ (separată de perete, mai jos) */}
        <rect x="6" y={H * 0.65} width={xWallExt - 14} height="14" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x="6" y={H * 0.65} width={xWallExt - 14} height="14" fill="url(#p-rebar)" opacity="0.55" />
        {/* Tiranți oțel inox (2 cabluri) */}
        <line x1={W * 0.04} y1={H * 0.65} x2={xEPS - 2} y2={yFloor - tFloor / 2} stroke="url(#g-metal)" strokeWidth="2.5" />
        <line x1={W * 0.10} y1={H * 0.65} x2={xBrick - 2} y2={yFloor - tFloor / 2} stroke="url(#g-metal)" strokeWidth="2.5" />
        <circle cx={xEPS - 2} cy={yFloor - tFloor / 2} r="2" fill="#1a1c1f" />
        <circle cx={xBrick - 2} cy={yFloor - tFloor / 2} r="2" fill="#1a1c1f" />
        <HeatZone x={xEPS - 4} y={yFloor - 18} w={tEPS + tBrick + 4} h="20" />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={W * 0.07} y1={H * 0.62} x2={W * 0.04} y2={H * 0.50} label="tiranți inox" anchor="start" />
        <Leader x1={W * 0.10} y1={H * 0.66} x2={W - 30} y2={H * 0.92} label="placă suspendată" anchor="end" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Loggia — spațiu semi-închis tampon
  if (v === "loggia") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        {/* Zonă loggia (tampon) */}
        <rect x="0" y="0" width={xWallExt} height={H} fill="#ece4d2" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        {/* Parapet loggia */}
        <rect x="6" y={yFloor - 40} width="8" height="48" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x="6" y={yFloor - 44} width="22" height="6" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Planșeu continuu (loggia + interior) */}
        <rect x="6" y={yFloor - tFloor / 2} width={W - 6} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x="6" y={yFloor - tFloor / 2} width={W - 6} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
        {/* Perete spate loggia (4 straturi) */}
        <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Ușă/fereastră spre apartament */}
        <rect x={xWallEnd + 2} y={H * 0.16} width="10" height={H * 0.30} fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xWallEnd + 4} y={H * 0.18} width="6" height={H * 0.26} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        <HeatZone x={xEPS - 4} y={yFloor - 18} w={tEPS + tBrick + 8} h="20" />
        <HeatArrow x1={xBrick + tBrick / 2} y1={yFloor} x2={xEPS - 6} y2={yFloor} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="LOGGIA" fill="#e9dcb8" color="#5a3a14" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={(xBrick + W) / 2} y1={yFloor + 1} x2={W - 6} y2={H * 0.92} label="planșeu BA 200" anchor="end" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // Variante cu placă balcon continuă cu planșeul + ruptor termic opțional
  const isIsokorbKXT = v === "isokorb-kxt";
  const isIsokorbKS = v === "isokorb-ks";
  const isHalfen = v === "halfen-hit";
  const isGFRP = v === "precast-gfrp";

  const breakWidth = isIsokorbKXT ? 14 : isIsokorbKS ? 11 : isHalfen ? 10 : hasBreak ? 9 : 0;
  const breakLabel =
    isIsokorbKXT ? "Isokorb KXT 120" :
    isIsokorbKS ? "Isokorb KS oțel" :
    isHalfen ? "Halfen HIT" :
    isGFRP ? "GFRP" :
    v === "isokorb-k" ? "Isokorb K 80" : null;

  // Ruptorul se inserează exact în zidărie, păstrând EPS continuu pe exterior
  const xBreak = xBrick;

  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Placa exterioară balcon (consolă) */}
      <rect x="8" y={yFloor - tFloor / 2} width={xWallExt - 6} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x="8" y={yFloor - tFloor / 2} width={xWallExt - 6} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
      {/* Planșeu interior (după ruptor) */}
      <rect x={xBreak + breakWidth} y={yFloor - tFloor / 2} width={W - xBreak - breakWidth} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xBreak + breakWidth} y={yFloor - tFloor / 2} width={W - xBreak - breakWidth} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
      {/* Continuarea plăcii prin EPS (când fără ruptor) */}
      {!hasBreak && (
        <>
          <rect x={xWallExt} y={yFloor - tFloor / 2} width={xBrick - xWallExt} height={tFloor} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
          <rect x={xWallExt} y={yFloor - tFloor / 2} width={xBrick - xWallExt} height={tFloor} fill="url(#p-rebar)" opacity="0.55" />
        </>
      )}
      {/* Parapet */}
      <rect x="10" y={yFloor - 38} width="6" height={tFloor + 14} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x="10" y={yFloor - 44} width={xWallExt - 8} height="5" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Ruptor termic */}
      {hasBreak && (
        <g>
          <rect x={xBreak} y={yFloor - tFloor / 2 - 2} width={breakWidth} height={tFloor + 4} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
          {(isIsokorbKS || isIsokorbKXT || isHalfen) && (
            <>
              <line x1={xBreak - 14} y1={yFloor - 5} x2={xBreak + breakWidth + 14} y2={yFloor - 5} stroke="#1a1c1f" strokeWidth="1.1" />
              <line x1={xBreak - 14} y1={yFloor + 5} x2={xBreak + breakWidth + 14} y2={yFloor + 5} stroke="#1a1c1f" strokeWidth="1.1" />
              <circle cx={xBreak - 10} cy={yFloor - 5} r="1.2" fill="#1a1c1f" />
              <circle cx={xBreak + breakWidth + 10} cy={yFloor - 5} r="1.2" fill="#1a1c1f" />
            </>
          )}
          {isIsokorbKS && <rect x={xBreak} y={yFloor - 1} width={breakWidth} height="3" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />}
        </g>
      )}
      {/* Punte termică */}
      <HeatZone x={xEPS - 4} y={yFloor - 18} w={hasBreak ? tEPS + 6 : tEPS + tBrick + 8} h="36" />
      {!hasBreak && <HeatArrow x1={xBrick + tBrick / 2} y1={yFloor} x2={xEPS - 6} y2={yFloor} />}
      {/* Banners */}
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT (balcon)" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      {hasBreak && breakLabel && (
        <Leader x1={xBreak + breakWidth / 2} y1={yFloor - tFloor / 2 - 4} x2={xBreak + breakWidth / 2 + 30} y2={H * 0.18} label={breakLabel} anchor="start" />
      )}
      {hasBreak && (
        <Leader x1={(W + xWallEnd) / 2} y1={yFloor - 12} x2={W - 6} y2={H * 0.92} label={`-${isIsokorbKXT ? 90 : isIsokorbKS ? 65 : isHalfen ? 80 : 75}% pierderi`} anchor="end" />
      )}
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical sections — variante de acoperiș + perete (streașină, coamă, atic, etc.)
 * conf. Mc 001-2022 § 4.4 + SR EN ISO 14683 R/E + SR EN 15026 (acoperiș verde)
 * Variante: eaves (streașină) / ridge (coamă) / parapet (atic plat) / gable (calcan)
 *           dormer (lucarnă) / skylight (luminator) / green-ext|int (verde)
 * Straturi acoperiș plat: hidroiz. 4 + XPS 150 + BA 200 + tenc.int 15 mm
 * Straturi acoperiș înclinat: țigle 25 + folie + aerare 30 + MW 200 + OSB 18 + GK 12 mm
 * ψ tipic: 0.10-0.25 W/(m·K) eaves izolat, 0.50-0.95 W/(m·K) parapet neizolat (clasa A-D)
 */
function IllustrationRoof({ bridge, variant }) {
  const v = variant || "eaves";

  // RIDGE — coamă acoperiș cu două pante
  if (v === "ridge") {
    const yEave = H * 0.68;
    const yRidge = 18;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.78} width={W} height={H * 0.22} fill="url(#g-int)" />
        {/* Țigle ambele pante */}
        <polygon points={`${W / 2},${yRidge} 30,${yEave} ${W / 2},${yEave}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.6" />
        <polygon points={`${W / 2},${yRidge} ${W - 30},${yEave} ${W / 2},${yEave}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.6" />
        {/* Linii rosturi țigle */}
        {[0.18, 0.36, 0.54, 0.72, 0.90].map((fy, i) => {
          const yL = yRidge + (yEave - yRidge) * fy;
          const dxL = (yL - yRidge) * 0.55;
          return (
            <g key={i}>
              <line x1={W / 2 - dxL} y1={yL} x2={W / 2} y2={yL} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.5" />
              <line x1={W / 2} y1={yL} x2={W / 2 + dxL} y2={yL} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.5" />
            </g>
          );
        })}
        {/* Folie + aerare */}
        <polygon points={`${W / 2},${yRidge + 4} 38,${yEave - 4} ${W / 2},${yEave - 4}`} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
        <polygon points={`${W / 2},${yRidge + 4} ${W - 38},${yEave - 4} ${W / 2},${yEave - 4}`} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Izolație MW între căpriori */}
        <polygon points={`${W / 2},${yRidge + 12} 50,${yEave - 10} ${W / 2},${yEave - 10}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
        <polygon points={`${W / 2},${yRidge + 12} ${W - 50},${yEave - 10} ${W / 2},${yEave - 10}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* OSB intrados */}
        <polygon points={`${W / 2},${yRidge + 18} 56,${yEave - 4} ${W / 2 + 1},${yEave - 4}`} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
        <polygon points={`${W / 2},${yRidge + 18} ${W - 56},${yEave - 4} ${W / 2 - 1},${yEave - 4}`} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Capac coamă metalic */}
        <polygon points={`${W / 2 - 10},${yRidge + 4} ${W / 2 + 10},${yRidge + 4} ${W / 2 + 6},${yRidge - 6} ${W / 2 - 6},${yRidge - 6}`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        {bridge.name.toLowerCase().includes("vent") && (
          <>
            <rect x={W / 2 - 6} y={yRidge + 6} width="12" height="3" fill="#1a1c1f" />
            <Leader x1={W / 2} y1={yRidge + 6} x2={W - 30} y2={yRidge - 4} label="aerisire coamă" anchor="end" />
          </>
        )}
        <HeatZone x={W / 2 - 24} y={yRidge - 4} w="48" h="36" />
        <EnvBanner x="0" y="0" w={W} h="12" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT (pod)" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={W * 0.30} y1={H * 0.40} x2="6" y2={H * 0.55} label="MW 200mm" anchor="start" />
        <PsiBadge psi={bridge.psi} x={W - 102} y={H - 16} />
      </>
    );
  }

  // PARAPET — acoperiș plat cu atic (punte majoră la parapetul neîntrerupt)
  if (v === "parapet") {
    const xWallExt = W * 0.18;
    const tFinExt = 5, tEPS = 22, tBrick = 30, tFinInt = 6;
    const xEPS = xWallExt + tFinExt;
    const xBrick = xEPS + tEPS;
    const xFinInt = xBrick + tBrick;
    const xWallEnd = xFinInt + tFinInt;
    const yMembrane = H * 0.28;
    const yXPS = yMembrane + 3;
    const yConcTop = yXPS + 18;
    const tConc = 22;
    const yScreed = yConcTop + tConc;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={yScreed + 6} width={W} height={H - yScreed - 6} fill="url(#g-int)" />
        {/* Atic BA */}
        <rect x={xWallExt} y={H * 0.06} width={tFinExt + tEPS + tBrick * 0.7} height={yMembrane - H * 0.06} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xWallExt} y={H * 0.06} width={tFinExt + tEPS + tBrick * 0.7} height={yMembrane - H * 0.06} fill="url(#p-rebar)" opacity="0.45" />
        {/* Capac metalic atic */}
        <rect x={xWallExt - 3} y={H * 0.04} width={tFinExt + tEPS + tBrick * 0.7 + 6} height="4" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Perete (continuă sub atic) */}
        <rect x={xWallExt} y={yMembrane} width={tFinExt} height={H - yMembrane} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y={yMembrane} width={tEPS} height={H - yMembrane} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y={yScreed} width={tBrick} height={H - yScreed} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yScreed} width={tFinInt} height={H - yScreed} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Terasă: BA + XPS + hidroizolație + șapă/tenc.int */}
        <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-rebar)" opacity="0.55" />
        <rect x={xWallExt} y={yXPS} width={W - xWallExt} height="18" fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xWallExt} y={yMembrane} width={W - xWallExt} height="3" fill="url(#p-membrane)" />
        {/* Hidroizolație urcată pe atic */}
        <path d={`M${xWallExt},${yMembrane + 1.5} L${xWallExt},${H * 0.07} L${xWallExt + tFinExt + tEPS + tBrick * 0.7 + 4},${H * 0.07}`} stroke="#1a1c1f" strokeWidth="2.5" fill="none" />
        <rect x={xFinInt} y={yScreed} width={W - xFinInt} height="6" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Punte majoră atic */}
        <HeatZone x={xWallExt - 4} y={H * 0.10} w={tFinExt + tEPS + tBrick + 6} h={yConcTop - H * 0.10 + 16} />
        <HeatArrow x1={xBrick + 4} y1={yConcTop + 6} x2={xWallExt - 6} y2={yConcTop - 4} />
        <EnvBanner x="0" y="0" w={W} h="10" label="EXT (terasă)" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xWallExt + 4} y1={H * 0.16} x2={W - 30} y2={H * 0.06} label="atic BA neizolat" anchor="end" />
        <Leader x1={(xBrick + W) / 2} y1={yXPS + 9} x2={W - 6} y2={yScreed - 28} label="XPS 150mm" anchor="end" />
        <PsiBadge psi={bridge.psi} x={W - 102} y={H - 16} />
      </>
    );
  }

  // SKYLIGHT — luminator cu cadru Al pe acoperiș plat
  if (v === "skylight") {
    const yMembrane = H * 0.42;
    const tConc = 20, tXPS = 16;
    const yConcTop = yMembrane + 3;
    const yBaseInt = yConcTop + tConc;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={yBaseInt + 6} width={W} height={H - yBaseInt - 6} fill="url(#g-int)" />
        {/* Acoperiș plat: BA + XPS + hidroizolație + tenc.int */}
        <rect x="0" y={yConcTop} width={W} height={tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x="0" y={yConcTop} width={W} height={tConc} fill="url(#p-rebar)" opacity="0.55" />
        <rect x="0" y={yMembrane + 3} width={W} height={tXPS} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x="0" y={yMembrane} width={W} height="3" fill="url(#p-membrane)" />
        <rect x="0" y={yBaseInt} width={W} height="6" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Guler beton ridicat (curb) — 2 laturi */}
        <rect x={W * 0.32} y={H * 0.20} width="8" height={yConcTop - H * 0.20 + tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={W * 0.32} y={H * 0.20} width="8" height={yConcTop - H * 0.20 + tConc} fill="url(#p-rebar)" opacity="0.45" />
        <rect x={W * 0.62} y={H * 0.20} width="8" height={yConcTop - H * 0.20 + tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={W * 0.62} y={H * 0.20} width="8" height={yConcTop - H * 0.20 + tConc} fill="url(#p-rebar)" opacity="0.45" />
        {/* Izolație urcată pe guler */}
        <rect x={W * 0.30} y={H * 0.20} width="3" height={yConcTop - H * 0.20 + 4} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={W * 0.70} y={H * 0.20} width="3" height={yConcTop - H * 0.20 + 4} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Hidroizolație urcată pe guler */}
        <path d={`M${W * 0.27},${yMembrane + 1.5} L${W * 0.27},${H * 0.21} L${W * 0.32},${H * 0.21}`} stroke="#1a1c1f" strokeWidth="2" fill="none" />
        <path d={`M${W * 0.73},${yMembrane + 1.5} L${W * 0.73},${H * 0.21} L${W * 0.70},${H * 0.21}`} stroke="#1a1c1f" strokeWidth="2" fill="none" />
        {/* Cadru aluminiu */}
        <rect x={W * 0.32} y={H * 0.16} width={W * 0.38} height="5" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Sticlă (dublu strat) */}
        <rect x={W * 0.34} y={H * 0.13} width={W * 0.34} height="4" fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        <HeatZone x={W * 0.28} y={H * 0.16} w="38" h="34" />
        <HeatZone x={W * 0.62} y={H * 0.16} w="38" h="34" />
        <EnvBanner x="0" y="0" w={W} h="10" label="EXT (terasă)" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={W / 2} y1={H * 0.14} x2={W - 30} y2={H * 0.04} label="cadru Al" anchor="end" />
        <Leader x1={W * 0.52} y1={yMembrane + 12} x2={W - 30} y2={H - 18} label="XPS 150mm" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // DORMER — lucarnă: secțiune 2D transversală prin peretele lateral × acoperiș principal
  // Orientare: EXT=sus+dreapta, INT(mansardă)=jos+stânga
  // Panta acoperișului principal coboară din dreapta-sus (joncțiune) spre stânga-jos (streașină)
  if (v === "dormer") {
    // ── Punct de joncțiune (baza peretelui lateral al lucarnei pe fața ext. a acoperișului) ──
    const xJ = 174, yJ = 90;
    // ── Linia exterioară a acoperișului: din (xL, yExtL) până la (xJ, yJ), pantă ~29° ──
    const xL = 15, yExtL = 177;
    // ── Normal spre INT (perpendicular pe pantă, spre mansardă) ──
    // Calculat din direcția pantei (xJ-xL, yJ-yExtL)=(159,-87): n_INT = (87/len, 159/len)
    const nIx = 0.482, nIy = 0.877;
    // ── Offsets cumulative straturi acoperiș (de la ext spre int) ──
    const tT = 8, tS = 11, tM = 31, tO = 36; // țigle / +folie / +MW / +OSB
    // Helper offset: punct pe stratul la distanță d față de suprafața exterioară
    const o = (d) => ({ x1: xL + nIx*d, y1: yExtL + nIy*d, x2: xJ + nIx*d, y2: yJ + nIy*d });
    // Helper poligon strat între offset d1 și d2
    const lp = (d1, d2) => { const a=o(d1),b=o(d2); return `${a.x1},${a.y1} ${a.x2},${a.y2} ${b.x2},${b.y2} ${b.x1},${b.y1}`; };
    // ── Perete lateral lucarnă (vertical, fața ext la xJ) ──
    const tCl = 5, tFr = 22, tFn = 4;  // placaj / cadru+MW / finisaj
    const xIntW = xJ - tCl - tFr - tFn; // 143 — fața interioară a peretelui
    // ── Spațiu INT(mansardă): sub intradosul acoperișului + stânga xIntW ──
    // Suprafața intradosului la xIntW: y≈148; intersecție cu y=H-12: x≈70
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        {/* Spațiu INT (mansardă) */}
        <polygon points={`0,${H-12} 70,${H-12} ${xIntW},148 ${xIntW},${H-12}`} fill="url(#g-int)" />

        {/* ── Straturi acoperiș principal (EXT → INT) ── */}
        {/* Țigle ceramice */}
        <polygon points={lp(0, tT)} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.5" />
        {[0.25, 0.5, 0.75].map((f, i) => {
          const x = xL + f*(xJ-xL), y = yExtL + f*(yJ-yExtL);
          return <line key={i} x1={x} y1={y} x2={x+nIx*tT} y2={y+nIy*tT} stroke="#1a1c1f" strokeWidth="0.35" opacity="0.6" />;
        })}
        {/* Folie / membrană */}
        <polygon points={lp(tT, tS)} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* MW izolație între căpriori */}
        <polygon points={lp(tS, tM)} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* OSB + placaj intrados */}
        <polygon points={lp(tM, tO)} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />

        {/* ── Perete lateral lucarnă (vertical, secțiune) ── */}
        {/* Placaj exterior (lemn) */}
        <rect x={xJ-tCl}     y={12} width={tCl} height={yJ-12} fill="url(#p-wood)"    stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Cadru + MW izolație */}
        <rect x={xJ-tCl-tFr} y={12} width={tFr} height={yJ-12} fill="url(#p-mw)"     stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Finisaj interior */}
        <rect x={xIntW}       y={12} width={tFn} height={yJ-12} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />

        {/* ── Punte termică ψ la joncțiune ── */}
        <HeatZone x={xJ-tCl-12} y={yJ-14} w="32" h="32" />
        <HeatArrow x1={xJ+8} y1={yJ+16} x2={xJ-4} y2={yJ+4} />

        <EnvBanner x="0" y="0" w={W} h="12" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H-12} w={W} h="12" label="INT (mansardă)" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xJ-tCl/2}      y1={28}       x2={W-8} y2={18}       label="perete lucarnă"   anchor="end" />
        <Leader x1={(xL+xJ)/2-10}  y1={(yExtL+yJ)/2-6} x2={8} y2={H*0.24} label="acoperiș principal" anchor="start" />
        <Leader x1={xJ-tCl-tFr/2}  y1={50}       x2={W-8} y2={H*0.57}   label="MW izolație"      anchor="end" />
        <PsiBadge psi={bridge.psi} x={W-102} y={H-16} />
      </>
    );
  }

  // GREEN ROOF — extensiv (sedum) sau intensiv (arbuști)
  if (v === "green-extensive" || v === "green-intensive") {
    const isIntensive = v === "green-intensive";
    const xWallExt = W * 0.18;
    const tFinExt = 5, tEPS = 22, tBrick = 30, tFinInt = 6;
    const xEPS = xWallExt + tFinExt;
    const xBrick = xEPS + tEPS;
    const xFinInt = xBrick + tBrick;
    const xWallEnd = xFinInt + tFinInt;
    // Straturi terasă verde (de sus): substrat + drenaj + filtru + anti-rădăcină + hidroiz + XPS + BA
    const ySubst = isIntensive ? H * 0.16 : H * 0.30;
    const tSubst = isIntensive ? 22 : 14;
    const yDrain = ySubst + tSubst;
    const yMembrane = yDrain + 6;
    const yXPS = yMembrane + 3;
    const yConcTop = yXPS + 18;
    const tConc = 22;
    const yBaseInt = yConcTop + tConc;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={yBaseInt + 6} width={W} height={H - yBaseInt - 6} fill="url(#g-int)" />
        {/* Atic */}
        <rect x={xWallExt} y={H * 0.06} width={tFinExt + tEPS + tBrick * 0.7} height={ySubst - H * 0.06} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xWallExt} y={H * 0.06} width={tFinExt + tEPS + tBrick * 0.7} height={ySubst - H * 0.06} fill="url(#p-rebar)" opacity="0.45" />
        {/* Perete */}
        <rect x={xWallExt} y={ySubst} width={tFinExt} height={H - ySubst} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y={ySubst} width={tEPS} height={H - ySubst} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y={yBaseInt} width={tBrick} height={H - yBaseInt} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yBaseInt} width={tFinInt} height={H - yBaseInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* BA acoperiș */}
        <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xBrick} y={yConcTop} width={W - xBrick} height={tConc} fill="url(#p-rebar)" opacity="0.55" />
        {/* XPS */}
        <rect x={xWallExt} y={yXPS} width={W - xWallExt} height="18" fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Hidroizolație + anti-rădăcină */}
        <rect x={xWallExt} y={yMembrane} width={W - xWallExt} height="3" fill="url(#p-membrane)" />
        {/* Drenaj pietriș */}
        <rect x={xWallExt} y={yDrain} width={W - xWallExt} height="6" fill="url(#p-gravel)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Substrat */}
        <rect x={xWallExt} y={ySubst} width={W - xWallExt} height={tSubst} fill="#8d7b52" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Vegetație */}
        {isIntensive ? (
          <>
            <circle cx={W * 0.42} cy={ySubst - 8} r="14" fill="#4e7c1f" stroke="#1a1c1f" strokeWidth="0.4" />
            <circle cx={W * 0.42} cy={ySubst - 12} r="11" fill="#689f38" />
            <rect x={W * 0.41} y={ySubst - 4} width="2" height="6" fill="#5d4037" />
            <circle cx={W * 0.66} cy={ySubst - 4} r="6" fill="#7cb342" stroke="#1a1c1f" strokeWidth="0.4" />
            <circle cx={W * 0.84} cy={ySubst - 5} r="7" fill="#689f38" stroke="#1a1c1f" strokeWidth="0.4" />
          </>
        ) : (
          [0.28, 0.40, 0.52, 0.64, 0.76, 0.88].map((fx, i) => (
            <circle key={i} cx={W * fx} cy={ySubst - 1 + (i % 2) * 2} r="2.5" fill={i % 2 ? "#8bc34a" : "#689f38"} stroke="#1a1c1f" strokeWidth="0.3" />
          ))
        )}
        {/* Hidroizolație urcată pe atic */}
        <path d={`M${xWallExt},${yMembrane + 1.5} L${xWallExt},${H * 0.07} L${xWallExt + tFinExt + tEPS + tBrick * 0.7 + 4},${H * 0.07}`} stroke="#1a1c1f" strokeWidth="2.5" fill="none" />
        <HeatZone x={xWallExt - 4} y={yMembrane - 6} w={tFinExt + tEPS + tBrick + 6} h={tConc + 18} />
        <EnvBanner x="0" y="0" w={W} h="10" label={`EXT (verde ${isIntensive ? "intensiv" : "extensiv"})`} fill="#dcefdc" color="#15803d" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={(xBrick + W) / 2} y1={ySubst + 4} x2={W - 6} y2={ySubst - 8} label={`substrat ${tSubst * 5}`} anchor="end" />
        <Leader x1={(xBrick + W) / 2} y1={yXPS + 9} x2={W - 6} y2={yBaseInt - 6} label="XPS 150mm" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // GABLE / CALCAN — perete median proeminent deasupra acoperișului
  if (v === "gable") {
    const cx = W / 2;
    const tGable = 30;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={cx + tGable / 2} y={H * 0.30} width={W - cx - tGable / 2} height={H - H * 0.30} fill="url(#g-int)" />
        <rect x="0" y={H * 0.30} width={cx - tGable / 2} height={H - H * 0.30} fill="url(#g-int)" opacity="0.7" />
        {/* Calcan zidărie proeminent */}
        <rect x={cx - tGable / 2} y="0" width={tGable} height={H} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.6" />
        {/* Coronament calcan + capac metalic */}
        <rect x={cx - tGable / 2 - 3} y="6" width={tGable + 6} height="6" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Acoperiș înclinat 2 pante (țigle) */}
        <polygon points={`${cx},${H * 0.28} 20,${H * 0.32} 20,${H * 0.30 - 2} ${cx},${H * 0.26}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.5" />
        <polygon points={`${cx},${H * 0.28} ${W - 20},${H * 0.32} ${W - 20},${H * 0.30 - 2} ${cx},${H * 0.26}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Izolație MW între căpriori */}
        <polygon points={`${cx},${H * 0.30} 36,${H * 0.32} 36,${H * 0.34} ${cx},${H * 0.32}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
        <polygon points={`${cx},${H * 0.30} ${W - 36},${H * 0.32} ${W - 36},${H * 0.34} ${cx},${H * 0.32}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Punte: calcan lipsit de izolație */}
        <HeatZone x={cx - tGable / 2 - 4} y={H * 0.28} w={tGable + 8} h="50" />
        <HeatArrow x1={cx} y1={H * 0.40} x2={cx + 24} y2={H * 0.50} />
        <EnvBanner x="0" y="0" w={W} h="12" label="EXT (calcan)" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={cx + tGable / 2} y={H - 12} w={W - cx - tGable / 2} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={cx} y1={H * 0.50} x2={cx + 60} y2={H * 0.70} label="zidărie 250mm (neizolat)" anchor="start" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // EAVES — streașină acoperiș înclinat (default)
  const xWallExt = W * 0.32;
  const tFinExt = 5, tEPS = 22, tBrick = 30, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yEave = H * 0.50;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y={yEave} width={W - xWallEnd} height={H - yEave} fill="url(#g-int)" />
      <rect x="0" y={yEave + 4} width={xWallExt} height={H - yEave - 4} fill="url(#g-ext)" />
      {/* Țigle exterior */}
      <polygon points={`${W / 2},14 ${W * 0.20},${yEave - 4} ${W - 20},${yEave - 4}`} fill="#a06448" stroke="#1a1c1f" strokeWidth="0.6" />
      {[0.18, 0.36, 0.54, 0.72].map((fy, i) => {
        const yL = 14 + (yEave - 18) * fy;
        const dxL = (yL - 14) * 0.65;
        return <line key={i} x1={W / 2 - dxL} y1={yL} x2={W / 2 + dxL} y2={yL} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.5" />;
      })}
      {/* Folie + aerare */}
      <polygon points={`${W / 2},22 ${W * 0.22},${yEave - 8} ${W - 28},${yEave - 8}`} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Izolație MW între căpriori */}
      <polygon points={`${W / 2},30 ${W * 0.24},${yEave - 12} ${W - 36},${yEave - 12}`} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* OSB/placaj intrados */}
      <polygon points={`${W / 2},36 ${W * 0.26},${yEave - 16} ${W - 42},${yEave - 16}`} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Streașină — placa lemnoasă orizontală */}
      <rect x={xWallExt - 30} y={yEave - 6} width={xEPS - xWallExt + 30 + 2} height="5" fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Jgheab metalic (opțional) */}
      {bridge.name.toLowerCase().includes("jgheab") && (
        <path d={`M${xWallExt - 28},${yEave - 1} Q${xWallExt - 32},${yEave + 4} ${xWallExt - 26},${yEave + 6} L${xWallExt - 4},${yEave + 6} Q${xWallExt + 2},${yEave + 4} ${xWallExt - 2},${yEave - 1}`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      )}
      {/* Perete */}
      <rect x={xWallExt} y={yEave - 6} width={tFinExt} height={H - yEave + 6} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y={yEave - 12} width={tEPS} height={H - yEave + 12} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yEave} width={tBrick} height={H - yEave} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yEave} width={tFinInt} height={H - yEave} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Planșeu BA */}
      <rect x={xBrick} y={yEave - 10} width={W - xBrick} height="22" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yEave - 10} width={W - xBrick} height="22" fill="url(#p-rebar)" opacity="0.55" />
      {/* Punte la streașină */}
      <HeatZone x={xWallExt - 4} y={yEave - 18} w={tFinExt + tEPS + tBrick + 8} h="32" />
      <HeatArrow x1={xBrick + 4} y1={yEave - 2} x2={xWallExt - 6} y2={yEave - 8} />
      <EnvBanner x="0" y="0" w={W} h="12" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={W * 0.48} y1={H * 0.30} x2="6" y2={H * 0.20} label="MW 200 căpriori" anchor="start" />
      <Leader x1={xEPS + tEPS / 2} y1={H - 30} x2={xEPS - 14} y2={H - 16} label="EPS 100mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x={W - 102} y={H - 16} />
    </>
  );
}

/**
 * Vertical section — stâlp BA / metalic penetrant prin izolația perete
 * conf. Mc 001-2022 § 4.4 (ψ_st) + SR EN ISO 14683 IF + SR EN ISO 10211
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Stâlp BA 300×300 sau profil metalic HEA 200 încorporat în zidărie
 * ψ tipic: 0.35-0.65 W/(m·K) BA neizolat, 0.05-0.15 W/(m·K) cu izolație continuă (clasa A-C)
 */
function IllustrationColumnBeam({ bridge }) {
  const isMetal = /metalic|oțel|otel|hea|heb|ipe/.test(bridge.name.toLowerCase());
  const xWallExt = W * 0.18;
  const tFinExt = 5;
  const tEPS = 28;
  const tBrick = 38;
  const tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yColTop = H * 0.16;
  const yColBot = H * 0.84;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete (4 straturi) */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Stâlp penetrant — încorporat în grosimea zidăriei (întrerupe izolația) */}
      {isMetal ? (
        <g>
          {/* HEA 200 — secțiune simplificată */}
          <rect x={xEPS - 4} y={yColTop} width={tEPS + tBrick - 4} height={yColBot - yColTop} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.6" />
          <rect x={xEPS - 4} y={yColTop} width={tEPS + tBrick - 4} height="4" fill="#1a1c1f" />
          <rect x={xEPS - 4} y={yColBot - 4} width={tEPS + tBrick - 4} height="4" fill="#1a1c1f" />
        </g>
      ) : (
        <g>
          <rect x={xEPS - 4} y={yColTop} width={tEPS + tBrick - 4} height={yColBot - yColTop} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
          <rect x={xEPS - 4} y={yColTop} width={tEPS + tBrick - 4} height={yColBot - yColTop} fill="url(#p-rebar)" opacity="0.6" />
        </g>
      )}
      {/* Punte */}
      <HeatZone x={xWallExt - 2} y={H * 0.32} w={tFinExt + tEPS + tBrick + 4} h={H * 0.36} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={H / 2} x2={xWallExt - 4} y2={H / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={(xEPS + xBrick + tBrick) / 2} y1={yColTop + 6} x2={W - 30} y2="6" label={isMetal ? "stâlp HEA 200" : "stâlp BA 300"} anchor="end" />
      <Leader x1={xEPS + tEPS / 2} y1={H - 32} x2={xEPS - 14} y2={H - 18} label="EPS întrerupt" anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical section — trecere instalație (țeavă/canal/cablu) prin perete izolat
 * conf. Mc 001-2022 § 4.4 (χ punct) + SR EN ISO 14683 P + SR EN ISO 10211
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Trecere etanșă cu mufă din material izolant (PIR) sau bandă elastomeric
 * χ tipic: 0.05-0.15 W/K țeavă izolată, 0.15-0.35 W/K canal ventilație neetanș
 */
function IllustrationService({ bridge }) {
  const lname = bridge.name.toLowerCase();
  const isChimney = lname.includes("coș");
  const isDuct = lname.includes("canal") || lname.includes("ventila");
  const isCable = lname.includes("cablu");
  const xWallExt = W * 0.30;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Element care traversează */}
      {isChimney ? (
        <g>
          <rect x="14" y={H * 0.10} width="26" height={H - 16} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
          <rect x="20" y={H * 0.10} width="14" height={H - 16} fill="#3a342c" stroke="#1a1c1f" strokeWidth="0.4" />
          {/* Trecere prin perete */}
          <rect x="14" y={H / 2 - 14} width={xWallEnd - 14} height="28" fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
          <rect x="20" y={H / 2 - 7} width={xWallEnd - 20} height="14" fill="#3a342c" stroke="#1a1c1f" strokeWidth="0.4" />
        </g>
      ) : isDuct ? (
        <g>
          {/* Canal metalic + izolație MW perim. */}
          <rect x="14" y={H / 2 - 16} width={W - 28} height="32" fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
          <rect x="14" y={H / 2 - 12} width={W - 28} height="24" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
          <line x1="14" y1={H / 2} x2={W - 14} y2={H / 2} stroke="#1a1c1f" strokeDasharray="3 2" strokeWidth="0.5" />
        </g>
      ) : isCable ? (
        <g>
          {/* Tub CK + cablu */}
          <rect x="14" y={H / 2 - 8} width={W - 28} height="16" fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.5" />
          <line x1="14" y1={H / 2} x2={W - 14} y2={H / 2} stroke="#1a1c1f" strokeWidth="2" />
          <line x1="14" y1={H / 2} x2={W - 14} y2={H / 2} stroke="#c62828" strokeWidth="0.8" />
        </g>
      ) : (
        <g>
          {/* Țeavă cu izolație termică */}
          <rect x="14" y={H / 2 - 14} width={W - 28} height="28" rx="14" fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
          <rect x="14" y={H / 2 - 7} width={W - 28} height="14" rx="7" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
          <line x1="14" y1={H / 2} x2={W - 14} y2={H / 2} stroke="#1a1c1f" strokeDasharray="3 2" strokeWidth="0.4" />
        </g>
      )}
      {/* Mufă etanșare în trecerea prin EPS */}
      <rect x={xEPS - 1} y={H / 2 - 16} width={tEPS + 2} height="32" fill="none" stroke="#c62828" strokeWidth="0.7" strokeDasharray="2 2" />
      <HeatZone x={xEPS - 4} y={H / 2 - 22} w={tEPS + tBrick + 8} h="44" />
      <HeatArrow x1={xBrick + tBrick / 2} y1={H / 2} x2={xEPS - 6} y2={H / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={W / 2} y1={H / 2 - 14} x2={W - 30} y2={H * 0.06} label={isChimney ? "coș fum" : isDuct ? "canal ventilație" : isCable ? "cablu electric" : "țeavă apă"} anchor="end" />
      <Leader x1={xEPS + tEPS / 2} y1={H / 2 + 16} x2={xEPS - 14} y2={H - 18} label="mufă etanșare" anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical sections — fundații (bandă/radier/piloți/Passivhaus-L/subsol)
 * conf. Mc 001-2022 § 4.4 + SR EN ISO 13370 + SR EN ISO 14683 GF
 * Variante: strip (fundație bandă) / mat (radier) / passivhaus-l (XPS în L)
 *           raft-basement (radier + subsol) / piles (piloți forați)
 * Straturi placă: parchet 10 + șapă 50 + EPS 80 + BA 200 mm
 * ψ tipic: 0.40-0.80 W/(m·K) neizolat, 0.05-0.15 W/(m·K) Passivhaus (clasa A-D)
 */
function IllustrationFoundation({ bridge, variant }) {
  const v = variant || "strip";
  const xWallExt = W * 0.18;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;

  // PASSIVHAUS-L — izolație XPS în L (orizontal sub radier + perimetral coborât)
  if (v === "passivhaus-l") {
    const yCTS = H * 0.32;
    const yFloorTop = H * 0.36;
    const yXPSBottom = H * 0.62;
    return (
      <>
        <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
        <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
        <rect x="0" y={H * 0.85} width={W} height="14" fill="url(#p-gravel)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x="0" y={yXPSBottom} width={W} height="22" fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xWallExt - 8} y={yFloorTop - 4} width="10" height={yXPSBottom - yFloorTop + 4} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xWallExt} y={yXPSBottom - 22} width={W - xWallExt} height="22" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xWallExt} y={yXPSBottom - 22} width={W - xWallExt} height="22" fill="url(#p-rebar)" opacity="0.55" />
        <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={yFloorTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={xFinInt} y={yFloorTop - 4} width={W - xFinInt} height="4" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
        <HeatZone x={xWallExt - 12} y={yFloorTop - 8} w={tFinExt + tEPS + tBrick + 18} h="20" />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="SOL" fill="#d6c4a8" color="#3a2a1a" />
        <Leader x1={xWallExt - 3} y1={yFloorTop + 30} x2={xWallExt - 24} y2={yFloorTop + 50} label="XPS perim. 100" anchor="end" />
        <Leader x1={W * 0.7} y1={yXPSBottom + 11} x2={W - 6} y2={yXPSBottom + 32} label="XPS sub radier 200" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // MAT — radier general continuu (punte majoră perimetral)
  if (v === "mat") {
    const yCTS = H * 0.36;
    const yFloorTop = H * 0.40;
    const yMatTop = H * 0.55;
    const tMat = H * 0.28;
    return (
      <>
        <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
        <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
        <rect x="0" y={yMatTop} width={W} height={tMat} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x="0" y={yMatTop} width={W} height={tMat} fill="url(#p-rebar)" opacity="0.55" />
        <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={yMatTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={yMatTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yMatTop - 6} width={W - xFinInt} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={xFinInt} y={yMatTop - 10} width={W - xFinInt} height="4" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
        <HeatZone x="0" y={yMatTop - 14} w={W * 0.45} h="36" />
        <HeatArrow x1={xBrick + tBrick / 2} y1={yMatTop} x2={xWallExt - 6} y2={yMatTop} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="SOL" fill="#d6c4a8" color="#3a2a1a" />
        <Leader x1={W * 0.65} y1={yMatTop + tMat / 2} x2={W - 6} y2={H - 18} label="radier BA 350" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // PILES — piloți forați
  if (v === "piles") {
    const yCTS = H * 0.36;
    const yFloorTop = H * 0.40;
    const yBeamTop = H * 0.45;
    return (
      <>
        <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
        <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
        <rect x="0" y={yBeamTop} width={W} height="20" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x="0" y={yBeamTop} width={W} height="20" fill="url(#p-rebar)" opacity="0.55" />
        {[0.18, 0.50, 0.82].map((fx, i) => (
          <g key={i}>
            <rect x={W * fx - 7} y={yBeamTop + 20} width="14" height={H - yBeamTop - 20} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
            <rect x={W * fx - 7} y={yBeamTop + 20} width="14" height={H - yBeamTop - 20} fill="url(#p-rebar)" opacity="0.55" />
          </g>
        ))}
        <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={yFloorTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="14" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="14" fill="url(#p-rebar)" opacity="0.55" />
        <HeatZone x={xWallExt - 4} y={yBeamTop - 4} w={tFinExt + tEPS + tBrick + 8} h="32" />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="SOL" fill="#d6c4a8" color="#3a2a1a" />
        <Leader x1={W * 0.50} y1={H - 30} x2={W - 30} y2={H - 18} label="piloți forați Ø600" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // RAFT-BASEMENT — radier + perete subsol cu izolație XPS perim.
  if (v === "raft-basement") {
    const yCTS = H * 0.20;
    const yFloorTop = H * 0.24;
    const yBaseSlab = H * 0.78;
    return (
      <>
        <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
        <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
        <rect x={xBrick} y={yFloorTop + 14} width={W - xBrick} height={yBaseSlab - yFloorTop - 14} fill="rgba(60,72,82,0.32)" />
        <rect x={xBrick} y={yFloorTop} width={tBrick} height={yBaseSlab - yFloorTop + 6} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xBrick} y={yFloorTop} width={tBrick} height={yBaseSlab - yFloorTop + 6} fill="url(#p-rebar)" opacity="0.45" />
        <rect x={xEPS} y={yFloorTop + 4} width={tEPS} height={yBaseSlab - yFloorTop} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y={yBaseSlab} width={W - xEPS} height="14" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xEPS} y={yBaseSlab} width={W - xEPS} height="14" fill="url(#p-rebar)" opacity="0.55" />
        <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="14" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="14" fill="url(#p-rebar)" opacity="0.55" />
        <rect x={xFinInt} y={yFloorTop + 14} width={W - xFinInt} height="6" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y="14" width={tBrick} height={yFloorTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y="14" width={tFinInt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <HeatZone x={xWallExt - 4} y={yFloorTop - 6} w={tFinExt + tEPS + tBrick + 8} h="30" />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x={xBrick + 6} y={H * 0.50} w={W - xBrick - 12} h="12" label="SUBSOL NEÎNCĂLZIT" fill="#cfd8dc" color="#1a1c1f" />
        <Leader x1={xEPS + tEPS / 2} y1={H * 0.55} x2={xEPS - 26} y2={H * 0.46} label="XPS subsol" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // STRIP (default) — fundație bandă + placă pe sol cu XPS perimetral
  const yCTS = H * 0.36;
  const yFloorTop = H * 0.40;
  return (
    <>
      <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yFloorTop} fill="url(#g-int)" />
      <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
      <rect x="0" y={H * 0.74} width={W * 0.18} height="12" fill="url(#p-gravel)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Fundație bandă (talpa lărgită) */}
      <rect x={xEPS} y={yCTS - 4} width={tEPS + tBrick + tFinInt} height={H * 0.30} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xEPS - 6} y={H * 0.66} width={tEPS + tBrick + tFinInt + 12} height={H * 0.10} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xEPS} y={yCTS - 4} width={tEPS + tBrick + tFinInt} height={H * 0.40} fill="url(#p-rebar)" opacity="0.45" />
      {/* Placă pe sol */}
      <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="20" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xFinInt} y={yFloorTop} width={W - xFinInt} height="20" fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xFinInt} y={yFloorTop - 12} width={W - xFinInt} height="12" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yFloorTop - 18} width={W - xFinInt} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xFinInt} y={yFloorTop - 22} width={W - xFinInt} height="4" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* XPS perimetral */}
      <rect x={xWallExt - 8} y={yFloorTop - 4} width="10" height={H * 0.32} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Perete */}
      <rect x={xWallExt} y="14" width={tFinExt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={yFloorTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={yFloorTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={yFloorTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <HeatZone x={xWallExt - 10} y={yFloorTop - 16} w={tFinExt + tEPS + tBrick + tFinInt + 16} h="30" />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yFloorTop} x2={xWallExt - 10} y2={yFloorTop} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label="SOL" fill="#d6c4a8" color="#3a2a1a" />
      <Leader x1={xWallExt - 3} y1={yFloorTop + 30} x2={xWallExt - 24} y2={yFloorTop + 50} label="XPS perim. 80" anchor="end" />
      <Leader x1={(xEPS + xWallEnd) / 2} y1={H * 0.62} x2={W - 30} y2={H - 16} label="fundație bandă BA" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
    </>
  );
}

/**
 * Vertical sections — structuri din lemn (timber-frame / CLT / SIP / rafters)
 * conf. Mc 001-2022 § 4.4 + SR EN ISO 14683 IF + DIN 4108-2
 * Variante: timber-frame (rim joist), CLT (panou solid), SIP (sandwich OSB-EPS-OSB), rafters (căpriori)
 * Straturi timber-frame: tenc.ext 5 + placaj 4 + MW 160 între montanți + OSB 18 + GK 12 mm
 * ψ tipic: 0.05-0.12 W/(m·K) montanți izolați, 0.20-0.35 W/(m·K) rim joist (clasa A-C)
 */
function IllustrationTimber({ bridge, variant }) {
  const v = variant || "timber-frame";

  // CLT — panouri solide lemn stratificat încrucișat
  if (v === "clt") {
    const xWallExt = W * 0.18;
    const tFinExt = 5, tEPS = 22, tCLT = 30, tGK = 5;
    const xEPS = xWallExt + tFinExt;
    const xCLT = xEPS + tEPS;
    const xGK = xCLT + tCLT;
    const xWallEnd = xGK + tGK;
    const yFloor = H * 0.48;
    const tFloorCLT = 22;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        {/* Perete CLT */}
        <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xCLT} y="14" width={tCLT} height={H - 14} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Linii lamele CLT (3 vizibile) */}
        <line x1={xCLT + tCLT / 3} y1="14" x2={xCLT + tCLT / 3} y2={H} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.6" />
        <line x1={xCLT + 2 * tCLT / 3} y1="14" x2={xCLT + 2 * tCLT / 3} y2={H} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.6" />
        <rect x={xGK} y="14" width={tGK} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Planșeu CLT orizontal */}
        <rect x={xCLT} y={yFloor - tFloorCLT / 2} width={W - xCLT} height={tFloorCLT} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.6" />
        <line x1={xCLT} y1={yFloor - tFloorCLT / 4} x2={W} y2={yFloor - tFloorCLT / 4} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.6" />
        <line x1={xCLT} y1={yFloor + tFloorCLT / 4} x2={W} y2={yFloor + tFloorCLT / 4} stroke="#1a1c1f" strokeWidth="0.4" opacity="0.6" />
        {/* Conectori inox */}
        <rect x={xCLT + 6} y={yFloor - tFloorCLT / 2 - 3} width="3" height="3" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.3" />
        <rect x={xCLT + 6} y={yFloor + tFloorCLT / 2} width="3" height="3" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.3" />
        <HeatZone x={xEPS - 4} y={yFloor - tFloorCLT / 2 - 6} w={tEPS + tCLT + 8} h={tFloorCLT + 12} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xCLT + tCLT / 2} y1="22" x2={xCLT + tCLT / 2 + 14} y2="6" label="CLT 100mm" anchor="start" />
        <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 12} y2="6" label="MW 80mm" anchor="end" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // SIP — sandwich OSB + EPS + OSB
  if (v === "sip") {
    const xWallExt = W * 0.22;
    const tFinExt = 4, tOSB1 = 5, tEPS = 36, tOSB2 = 5, tGK = 5;
    const xOSB1 = xWallExt + tFinExt;
    const xEPSCore = xOSB1 + tOSB1;
    const xOSB2 = xEPSCore + tEPS;
    const xGK = xOSB2 + tOSB2;
    const xWallEnd = xGK + tGK;
    const xJoint = xEPSCore + tEPS / 2;
    const yFloor = H * 0.48;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xOSB1} y="14" width={tOSB1} height={H - 14} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPSCore} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xOSB2} y="14" width={tOSB2} height={H - 14} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xGK} y="14" width={tGK} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Joncțiune SIP - punte repetitivă */}
        <line x1={xJoint} y1="14" x2={xJoint} y2={H} stroke="#c62828" strokeWidth="1" strokeDasharray="4 2" />
        {/* Planșeu SIP orizontal */}
        <rect x={xOSB2} y={yFloor - 10} width={W - xOSB2} height="4" fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={xOSB2} y={yFloor - 6} width={W - xOSB2} height="12" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.4" />
        <rect x={xOSB2} y={yFloor + 6} width={W - xOSB2} height="4" fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
        <HeatZone x={xJoint - 6} y={H * 0.30} w="12" h={H * 0.40} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xJoint} y1={H * 0.20} x2={xJoint + 30} y2={H * 0.10} label="joncțiune SIP" anchor="start" />
        <Leader x1={xEPSCore + tEPS / 2} y1={H - 30} x2={xEPSCore + tEPS / 2 + 14} y2={H - 18} label="OSB+EPS 200+OSB" anchor="start" />
        <PsiBadge psi={bridge.psi} />
      </>
    );
  }

  // RAFTERS — căpriori înclinați cu izolație MW între
  if (v === "rafters") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x="0" y={H * 0.74} width={W} height={H * 0.26} fill="url(#g-int)" />
        <g transform="skewX(-15)">
          {/* Țiglă */}
          <rect x={-10} y={H * 0.10} width={W + 20} height="8" fill="#a06448" stroke="#1a1c1f" strokeWidth="0.5" />
          {/* Folie + aerare */}
          <rect x={-10} y={H * 0.18} width={W + 20} height="4" fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.4" />
          {/* Căpriori 60×200mm (repetitivi) */}
          {[0.05, 0.25, 0.45, 0.65, 0.85].map((fx, i) => (
            <rect key={i} x={W * fx} y={H * 0.22} width="14" height="26" fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.4" />
          ))}
          {/* Izolație MW între căpriori */}
          {[0.10, 0.30, 0.50, 0.70, 0.90].map((fx, i) => (
            <rect key={i} x={W * fx + 4} y={H * 0.22} width={W * 0.15} height="26" fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
          ))}
          {/* Membrană etanșă */}
          <rect x={-10} y={H * 0.48} width={W + 20} height="2" fill="url(#p-membrane)" />
          {/* OSB intrados */}
          <rect x={-10} y={H * 0.50} width={W + 20} height="4" fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.4" />
          {/* GK */}
          <rect x={-10} y={H * 0.54} width={W + 20} height="3" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
        </g>
        {/* Săgeți flux prin căpriori */}
        {[0.18, 0.42, 0.66, 0.88].map((fx, i) => (
          <HeatArrow key={i} x1={W * fx + 4} y1={H * 0.55} x2={W * fx - 6} y2={H * 0.30} />
        ))}
        <HeatZone x="0" y={H * 0.20} w={W} h="34" />
        <EnvBanner x="0" y="0" w={W} h="12" label="EXT (acoperiș)" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT (mansardă)" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={W * 0.30} y1={H * 0.62} x2="6" y2={H * 0.70} label="căpriori 60×200" anchor="start" />
        <PsiBadge psi={bridge.psi} x={W - 102} y={H - 16} />
      </>
    );
  }

  // TIMBER-FRAME (default) — rim joist, perete pe cadru lemn cu MW între montanți
  const xWallExt = W * 0.20;
  const tFinExt = 4, tCladding = 5, tMW = 28, tOSB = 5, tGK = 5;
  const xCladding = xWallExt + tFinExt;
  const xMW = xCladding + tCladding;
  const xOSB = xMW + tMW;
  const xGK = xOSB + tOSB;
  const xWallEnd = xGK + tGK;
  const yFloor = H * 0.48;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Tencuială + placaj */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xCladding} y="14" width={tCladding} height={H - 14} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Câmp izolație MW + montanți */}
      <rect x={xMW} y="14" width={tMW} height={H - 14} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Montanți verticali (2 vizibili) */}
      <rect x={xMW + 6} y="14" width="6" height={H - 14} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xMW + tMW - 12} y="14" width="6" height={H - 14} fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* OSB + GK */}
      <rect x={xOSB} y="14" width={tOSB} height={H - 14} fill="#c9a575" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xGK} y="14" width={tGK} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Rim joist — grindă perimetrală (punte) */}
      <rect x={xMW} y={yFloor - 12} width={tMW + tOSB + tGK} height="24" fill="#a07843" stroke="#1a1c1f" strokeWidth="0.6" />
      {/* Planșeu lemn intermediar */}
      <rect x={xWallEnd} y={yFloor - 8} width={W - xWallEnd} height="16" fill="url(#p-wood)" stroke="#1a1c1f" strokeWidth="0.5" />
      <HeatZone x={xMW - 4} y={yFloor - 18} w={tMW + tOSB + 12} h="36" />
      <HeatArrow x1={xWallEnd + 4} y1={yFloor} x2={xMW - 4} y2={yFloor} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={xMW + tMW / 2} y1="22" x2={xMW + tMW / 2 + 16} y2="6" label="MW 160mm + montanți" anchor="start" />
      <Leader x1={xMW + tMW / 2} y1={yFloor + 4} x2={W - 30} y2={H - 18} label="rim joist" anchor="end" />
      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical/Plan sections — ETICS (External Thermal Insulation Composite System)
 * conf. Mc 001-2022 § 4.4 (χ punct) + SR EN ISO 14683 P + ETAG 004 + EAD 040083-00-0404
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Variante: anchor-metal (diblu metalic 6-8/m², χ≈0.003 W/K), anchor-plastic (diblu plastic
 *   cu ac metalic în vârf, χ≈0.001 W/K — clasa A), plinth-drip (soclu cu drip + XPS perim.),
 *   corner-profile (plan colț cu profil L Al + plasă), window-band (bandă continuă sub
 *   fereastră), expansion-joint (rost dilatare cu profil + mastic), sandwich-tie (conector
 *   panou sandwich — GFRP sau inox, χ≈0.005-0.015 W/K)
 */
function IllustrationETICS({ bridge, variant }) {
  const v = variant || "anchor-metal";
  const xWallExt = W * 0.18;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;

  function WallStack({ y0 = 14, h = H - 14 }) {
    return (
      <>
        <rect x={xWallExt} y={y0} width={tFinExt} height={h} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xEPS} y={y0} width={tEPS} height={h} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBrick} y={y0} width={tBrick} height={h} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xFinInt} y={y0} width={tFinInt} height={h} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      </>
    );
  }

  // ANCHOR PLASTIC — diblu plastic cu ac metalic doar în vârf (punte termică minimă)
  if (v === "anchor-plastic") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        <WallStack />
        {[0.24, 0.46, 0.68].map((fy) => (
          <g key={fy}>
            <line x1={xWallExt + 1} y1={H * fy} x2={xBrick + 14} y2={H * fy} stroke="#f0ece4" strokeWidth="1.6" stroke-linecap="round" />
            <line x1={xBrick + 10} y1={H * fy} x2={xBrick + 14} y2={H * fy} stroke="#1a1c1f" strokeWidth="1.4" />
            <circle cx={xWallExt + 1} cy={H * fy} r="2.4" fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.5" />
          </g>
        ))}
        <HeatZone x={xEPS - 4} y={H * 0.18} w={tEPS + tBrick + 8} h={H * 0.64} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xBrick + 4} y1={H * 0.46} x2={W - 30} y2="6" label="diblu plastic + ac" anchor="end" />
        <Leader x1={(xWallExt + xBrick) / 2} y1={H * 0.92} x2={W - 30} y2={H - 8} label="χ≈0.001 W/K (A)" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
      </>
    );
  }

  // PLINTH-DRIP — soclu ETICS cu profil drip + XPS perimetral coborât sub CTS
  if (v === "plinth-drip") {
    const yCTS = H * 0.52;
    return (
      <>
        <rect x="0" y="0" width={W} height={yCTS} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yCTS} fill="url(#g-int)" />
        <rect x="0" y={yCTS} width={W} height={H - yCTS} fill="url(#p-soil)" />
        <WallStack y0="14" h={yCTS - 14} />
        {/* Fundație BA */}
        <rect x={xEPS} y={yCTS - 4} width={tEPS + tBrick + tFinInt} height={H * 0.36} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xEPS} y={yCTS - 4} width={tEPS + tBrick + tFinInt} height={H * 0.36} fill="url(#p-rebar)" opacity="0.45" />
        {/* XPS perimetral (continuat sub CTS, peste fundație) */}
        <rect x={xWallExt - 6} y={yCTS - 4} width="9" height={H * 0.32} fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Profil drip metalic la cota CTS */}
        <path d={`M${xWallExt - 10},${yCTS - 2} L${xWallExt + tFinExt + 2},${yCTS - 2} L${xWallExt + tFinExt + 2},${yCTS} L${xWallExt - 8},${yCTS} L${xWallExt - 10},${yCTS + 4} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
        <HeatZone x={xWallExt - 10} y={yCTS - 16} w={tFinExt + tEPS + tBrick + 18} h="28" />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="SOL" fill="#d6c4a8" color="#3a2a1a" />
        <Leader x1={xWallExt - 10} y1={yCTS} x2={xWallExt - 30} y2={yCTS - 14} label="drip Al" anchor="end" />
        <Leader x1={xWallExt - 2} y1={yCTS + 30} x2={xWallExt - 24} y2={yCTS + 50} label="XPS perim. 80" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // CORNER-PROFILE — plan colț cu profil L aluminiu + plasă armare
  if (v === "corner-profile") {
    const cx = W * 0.50, cy = H * 0.50;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={cx + tFinExt + tEPS + tFinInt} y={cy + tFinExt + tEPS + tFinInt} width={W - cx - tFinExt - tEPS - tFinInt} height={H - cy - tFinExt - tEPS - tFinInt} fill="url(#g-int)" />
        {/* Brațul vertical perete (dreapta jos perete) */}
        <rect x={cx + tFinExt + tEPS} y={cy} width={tBrick} height={H - cy} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx + tFinExt} y={cy} width={tEPS} height={H - cy} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx} y={cy} width={tFinExt} height={H - cy} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx + tFinExt + tEPS + tBrick} y={cy} width={tFinInt} height={H - cy} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Brațul orizontal */}
        <rect x={cx} y={cy + tFinExt + tEPS} width={W - cx} height={tBrick} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx} y={cy + tFinExt} width={W - cx} height={tEPS} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx} y={cy} width={W - cx} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={cx} y={cy + tFinExt + tEPS + tBrick} width={W - cx} height={tFinInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Profil L aluminiu pe colț */}
        <path d={`M${cx},${cy} L${cx},${cy + tFinExt + 1} L${cx + tFinExt + 1},${cy + tFinExt + 1} L${cx + tFinExt + 1},${cy} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.6" />
        {/* Plasă armare (puncte mici regulate) */}
        {[0.55, 0.65, 0.75, 0.85, 0.95].map((fx, i) => (
          <circle key={i} cx={W * fx} cy={cy + 2.5} r="0.7" fill="#1a1c1f" />
        ))}
        {[0.55, 0.65, 0.75, 0.85, 0.95].map((fy, i) => (
          <circle key={i} cx={cx + 2.5} cy={H * fy} r="0.7" fill="#1a1c1f" />
        ))}
        <HeatZone x={cx - 6} y={cy - 6} w={tFinExt + tEPS + 14} h={tFinExt + tEPS + 14} />
        <EnvBanner x="0" y="0" w={W} h="12" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={W - 50} y={H - 14} w="48" h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={cx + tFinExt / 2} y1={cy + tFinExt / 2} x2={W - 30} y2="20" label="profil L Al + plasă" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
      </>
    );
  }

  // WINDOW-BAND — bandă EPS continuă sub fereastră
  if (v === "window-band") {
    const ySill = H * 0.42;
    return (
      <>
        <rect x="0" y="0" width={W} height={ySill} fill="url(#g-ext)" />
        <rect x={xWallEnd} y={ySill} width={W - xWallEnd} height={H - ySill} fill="url(#g-int)" />
        {/* Perete sub bandă */}
        <WallStack y0={ySill - 2} h={H - ySill + 2} />
        {/* Bandă EPS (peste glaf, continuă) */}
        <rect x={xWallExt} y={ySill - 12} width={W - xWallExt} height="9" fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        {/* Glaf metalic */}
        <path d={`M${xWallExt - 4},${ySill - 12} L${W - 8},${ySill - 14} L${W - 8},${ySill - 10} L${xWallExt - 4},${ySill - 8} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
        {/* Ramă fereastră deasupra */}
        <rect x={xBrick - 2} y={H * 0.18} width="14" height={ySill - H * 0.20 - 4} fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.6" />
        <rect x={xBrick + 2} y={H * 0.20} width="6" height={ySill - H * 0.22 - 8} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
        <line x1={xBrick + 5} y1={H * 0.21} x2={xBrick + 5} y2={ySill - 16} stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
        <HeatZone x={xEPS - 4} y={ySill - 18} w={tEPS + tBrick + 10} h="22" />
        <EnvBanner x="0" y="0" w={W} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={(xWallExt + W) / 2} y1={ySill - 8} x2={W - 30} y2={ySill - 24} label="bandă EPS continuă" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 18} />
      </>
    );
  }

  // EXPANSION-JOINT — rost de dilatare ETICS cu profil + mastic
  if (v === "expansion-joint") {
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
        <WallStack />
        {/* Întrerupere izolație + profil rost */}
        <rect x={xEPS + tEPS / 2 - 3} y="14" width="6" height={H - 14} fill="#1a1c1f" />
        <rect x={xEPS + tEPS / 2 - 2} y="14" width="4" height={H - 14} fill="url(#g-metal)" />
        {/* Mastic elastic */}
        <rect x={xEPS + tEPS / 2 - 1} y="14" width="2" height={H - 14} fill="#7a4520" />
        <HeatZone x={xEPS + tEPS / 2 - 8} y="14" w="16" h={H - 14} />
        <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={xEPS + tEPS / 2} y1="22" x2={W - 30} y2="6" label="rost dilatare + mastic" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
      </>
    );
  }

  // SANDWICH-TIE — conector GFRP/inox panou sandwich (BA-EPS-BA)
  if (v === "sandwich-tie") {
    const xS1 = W * 0.18;
    const tBetExt = 18, tCore = 32, tBetInt = 40;
    const xCore = xS1 + tBetExt, xBetIn = xCore + tCore, xS1End = xBetIn + tBetInt;
    return (
      <>
        <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
        <rect x={xS1End} y="0" width={W - xS1End} height={H} fill="url(#g-int)" />
        <rect x={xS1} y="14" width={tBetExt} height={H - 14} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xCore} y="14" width={tCore} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBetIn} y="14" width={tBetInt} height={H - 14} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
        <rect x={xBetIn} y="14" width={tBetInt} height={H - 14} fill="url(#p-rebar)" opacity="0.55" />
        {/* Conectori GFRP traversând stratul izolant */}
        {[0.22, 0.45, 0.68, 0.88].map((fy, i) => (
          <g key={i}>
            <rect x={xS1 + 6} y={H * fy - 1.5} width={tBetExt + tCore + tBetInt - 12} height="3" fill={i % 2 ? "#7a8a3a" : "#5a6066"} stroke="#1a1c1f" strokeWidth="0.4" />
            <circle cx={xS1 + 6} cy={H * fy} r="2" fill="#1a1c1f" />
            <circle cx={xS1End - 6} cy={H * fy} r="2" fill="#1a1c1f" />
          </g>
        ))}
        <HeatZone x={xS1 - 4} y="10" w={xS1End - xS1 + 8} h={H - 16} />
        <EnvBanner x="0" y="0" w={xS1} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
        <EnvBanner x={xS1End} y="0" w={W - xS1End} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
        <Leader x1={(xCore + xBetIn) / 2} y1={H * 0.32} x2={W - 30} y2="6" label="conector GFRP / inox" anchor="end" />
        <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
      </>
    );
  }

  // ANCHOR-METAL (default) — diblu metalic cu cap (EJOT/Fischer), 6-8/m²
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      <WallStack />
      {[0.20, 0.36, 0.52, 0.68, 0.84].map((fy) => (
        <g key={fy}>
          <line x1={xWallExt + 1} y1={H * fy} x2={xBrick + 14} y2={H * fy} stroke="#1a1c1f" strokeWidth="1.6" />
          <circle cx={xWallExt + 1} cy={H * fy} r="2.6" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.6" />
          <circle cx={xWallExt + 1} cy={H * fy} r="1.2" fill="#1a1c1f" />
        </g>
      ))}
      <HeatZone x={xEPS - 4} y="14" w={tEPS + tBrick + 8} h={H - 18} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={xBrick + 6} y1={H * 0.20} x2={W - 30} y2="6" label="diblu metal (χ)" anchor="end" />
      <Leader x1={(xWallExt + xBrick) / 2} y1={H * 0.94} x2={W - 30} y2={H - 6} label="6–8/m² · χ≈0.003" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

/**
 * Vertical section — coș fum zidărie penetrant prin perete exterior
 * conf. Mc 001-2022 § 4.4 (χ punct cos) + SR EN ISO 14683 P + NP 086-05 (instalații fum)
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Coș 38×38 cm cu canal Ø150 + tub inox interior + spațiu aer
 * χ tipic: 0.10–0.25 W/K coș izolat, 0.25–0.50 W/K coș neizolat
 */
function IllustrationChimneyMasonry({ bridge }) {
  const xWallExt = W * 0.40;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete (4 straturi proporționale) */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Coș zidărie încorporat (penetrare perete) */}
      <rect x="14" y="14" width="56" height={H - 28} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.6" />
      {/* Spațiu aer + tub inox interior */}
      <rect x="22" y="14" width="40" height={H - 28} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.3" />
      <rect x="30" y="14" width="24" height={H - 28} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x="34" y="14" width="16" height={H - 28} fill="#3a342c" stroke="#1a1c1f" strokeWidth="0.3" />
      {/* Coroamament metalic */}
      <rect x="10" y="10" width="64" height="5" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Penetrare coș în zidărie */}
      <rect x="70" y={H / 2 - 18} width={xWallEnd - 70} height="36" fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x="78" y={H / 2 - 9} width={xWallEnd - 76} height="18" fill="#3a342c" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Zonă punte termică */}
      <HeatZone x={xEPS - 4} y={H / 2 - 24} w={tEPS + tBrick + 8} h="48" />
      <HeatArrow x1={xBrick + tBrick / 2} y1={H / 2} x2={xEPS - 6} y2={H / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1="42" y1="22" x2="6" y2="6" label="coș zidărie 380" anchor="start" />
      <Leader x1={xEPS + tEPS / 2} y1={H - 24} x2={xEPS - 14} y2={H - 8} label="EPS 100mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x={W - 106} y={H - 6} />
    </>
  );
}

/**
 * Vertical section — casetă roletă deasupra ferestrei (suprabuiandrug exterior)
 * conf. Mc 001-2022 § 4.4 (ψ_rol) + SR EN ISO 14683 W
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Casetă PVC 200×200mm cu axul rolei + ghidaj lateral aluminiu
 * ψ tipic: 0.45–0.95 W/(m·K) casetă neizolată, 0.15–0.30 izolată cu PUR (clasa B-D)
 */
function IllustrationRollerShutter({ bridge }) {
  const xWallExt = W * 0.18;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yBox = 18;
  const boxH = 38;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y={yBox + boxH} width={W - xWallEnd} height={H - yBox - boxH} fill="url(#g-int)" />
      {/* Perete sub casetă */}
      <rect x={xWallExt} y={yBox + boxH} width={tFinExt} height={H - yBox - boxH} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y={yBox + boxH} width={tEPS} height={H - yBox - boxH} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yBox + boxH} width={tBrick} height={H - yBox - boxH} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yBox + boxH} width={tFinInt} height={H - yBox - boxH} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Buiandrug BA deasupra ferestrei */}
      <rect x={xBrick - 4} y={yBox + boxH - 14} width={tBrick + 8} height="14" fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xBrick - 4} y={yBox + boxH - 14} width={tBrick + 8} height="14" fill="url(#p-rebar)" opacity="0.5" />
      {/* Casetă PVC roletă (deasupra ferestrei) */}
      <rect x={xWallExt} y={yBox} width={xWallEnd - xWallExt} height={boxH} fill="#e8e2d4" stroke="#1a1c1f" strokeWidth="0.7" />
      {/* Izolație PUR parțială în casetă (sub capac) */}
      <rect x={xWallExt + 2} y={yBox + 2} width={xWallEnd - xWallExt - 4} height="6" fill="url(#p-xps)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Rol înfășurat (cilindru) */}
      <circle cx={(xWallExt + xWallEnd) / 2} cy={yBox + boxH / 2 + 2} r="10" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      <circle cx={(xWallExt + xWallEnd) / 2} cy={yBox + boxH / 2 + 2} r="3" fill="#1a1c1f" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <line key={i} x1={(xWallExt + xWallEnd) / 2} y1={yBox + boxH / 2 + 2} x2={(xWallExt + xWallEnd) / 2 + 9 * Math.cos(deg * Math.PI / 180)} y2={yBox + boxH / 2 + 2 + 9 * Math.sin(deg * Math.PI / 180)} stroke="#1a1c1f" strokeWidth="0.4" />
      ))}
      {/* Ghidaj lateral aluminiu */}
      <rect x={xBrick - 2} y={yBox + boxH} width="3" height={H * 0.30} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Ramă fereastră dedesubt */}
      <rect x={xBrick} y={yBox + boxH + 2} width="22" height={H * 0.32} fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick + 3} y={yBox + boxH + 5} width="16" height={H * 0.28} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Punte termică */}
      <HeatZone x={xWallExt - 4} y={yBox - 4} w={xWallEnd - xWallExt + 8} h={boxH + 18} />
      <HeatArrow x1={(xWallExt + xWallEnd) / 2 + 8} y1={yBox + boxH / 2} x2={xWallExt - 6} y2={yBox + boxH / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={(xWallExt + xWallEnd) / 2} y1={yBox - 1} x2={W - 30} y2="6" label="casetă PVC roletă" anchor="end" />
      <Leader x1={xBrick + tBrick / 2} y1={yBox + boxH - 7} x2={W - 30} y2={yBox + boxH + 30} label="buiandrug BA" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

/**
 * Vertical section — nișă radiator în perete exterior (perete subțiat ≈ 50%)
 * conf. Mc 001-2022 § 4.4 (ψ_n) + SR EN ISO 14683 P
 * Straturi perete normal: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * În zona nișei: zidărie redusă la ≈ 120mm + EPS exterior
 * ψ tipic: 0.30–0.65 W/(m·K) nișă neizolată (clasa C-D ISO 14683)
 */
function IllustrationRadiatorNiche({ bridge }) {
  const xWallExt = W * 0.18;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yNicheTop = H * 0.30;
  const yNicheBot = H * 0.70;
  const tBrickReduced = 16; // perete subțiat la nișă (≈ 120mm)
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      {/* Perete normal sus și jos */}
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Zidărie completă deasupra și sub nișă */}
      <rect x={xBrick} y="14" width={tBrick} height={yNicheTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yNicheBot} width={tBrick} height={H - yNicheBot} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Zidărie SUBȚIATĂ în zona nișei (doar fașa exterioară) */}
      <rect x={xBrick} y={yNicheTop} width={tBrickReduced} height={yNicheBot - yNicheTop} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Tencuială interioară (continuă pe profil cu ștraif în nișă) */}
      <rect x={xFinInt} y="14" width={tFinInt} height={yNicheTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yNicheBot} width={tFinInt} height={H - yNicheBot} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick + tBrickReduced} y={yNicheTop} width="3" height={yNicheBot - yNicheTop} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Cotă conturul nișei */}
      <line x1={xBrick + tBrickReduced + 3} y1={yNicheTop} x2={xWallEnd} y2={yNicheTop} stroke="#1a1c1f" strokeWidth="0.4" strokeDasharray="3 2" />
      <line x1={xBrick + tBrickReduced + 3} y1={yNicheBot} x2={xWallEnd} y2={yNicheBot} stroke="#1a1c1f" strokeWidth="0.4" strokeDasharray="3 2" />
      {/* Radiator (oțel, profil vertical) */}
      <rect x={xWallEnd + 4} y={H * 0.36} width={W * 0.16} height={H * 0.28} fill="#cfd8dc" stroke="#1a1c1f" strokeWidth="0.6" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={xWallEnd + 4 + i * 8} y1={H * 0.37} x2={xWallEnd + 4 + i * 8} y2={H * 0.63} stroke="#1a1c1f" strokeWidth="0.7" />
      ))}
      {/* Conducte apă (tur/retur) */}
      <line x1={xWallEnd + 4} y1={H * 0.36} x2={xWallEnd + 4} y2={H * 0.30} stroke="#c62828" strokeWidth="1.6" />
      <line x1={xWallEnd + 4} y1={H * 0.64} x2={xWallEnd + 4} y2={H * 0.72} stroke="#1565c0" strokeWidth="1.6" />
      <HeatZone x={xEPS - 4} y={yNicheTop - 4} w={tEPS + tBrick + 8} h={yNicheBot - yNicheTop + 8} />
      <HeatArrow x1={xBrick + tBrickReduced + 4} y1={H / 2} x2={xEPS - 6} y2={H / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={xBrick + tBrickReduced / 2} y1={H / 2} x2={xWallEnd + 60} y2={H * 0.92} label="zidărie subțiată 120mm" anchor="end" />
      <Leader x1={xWallEnd + 16} y1={H * 0.50} x2={W - 30} y2={H * 0.18} label="radiator oțel" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

// Panou prefabricat mare (PAFP / IPCT '70-'80) — rost ORIZONTAL cu centură BA
// Secțiune verticală: 2 panouri suprapuse + centură + planșeu interior
function IllustrationPrecastPanel({ bridge }) {
  // Geometrie panou (de la EXT la INT) — proporțional
  const xPanel0 = W * 0.16;     // start panou
  const tFinExt = 6;             // tencuială exterioară 5mm
  const tBetExt = 14;            // strat ext BA 60mm
  const tInsul  = 18;            // izolație miez 80mm
  const tBetInt = 28;            // strat int BA 120mm
  const tFinInt = 4;             // tencuială int
  const xFinExt = xPanel0;
  const xBetExt = xFinExt + tFinExt;
  const xInsul  = xBetExt + tBetExt;
  const xBetInt = xInsul + tInsul;
  const xFinInt = xBetInt + tBetInt;
  const xPanelEnd = xFinInt + tFinInt;
  const yJoint = H * 0.50;
  const jointH = 8;

  return (
    <>
      {/* Fundal EXT/INT (ambient aer) */}
      <rect x="0" y="0" width={xPanel0} height={H} fill="url(#g-ext)" />
      <rect x={xPanelEnd} y="0" width={W - xPanelEnd} height={H} fill="url(#g-int)" />

      {/* === PANOU SUPERIOR (deasupra rostului) === */}
      <rect x={xFinExt} y="0" width={tFinExt} height={yJoint - jointH / 2} fill="url(#p-plaster)" />
      <rect x={xBetExt} y="0" width={tBetExt} height={yJoint - jointH / 2} fill="url(#p-conc)" />
      <rect x={xInsul}  y="0" width={tInsul}  height={yJoint - jointH / 2} fill="url(#p-mw)" />
      <rect x={xBetInt} y="0" width={tBetInt} height={yJoint - jointH / 2} fill="url(#p-conc)" />
      <rect x={xBetInt} y="0" width={tBetInt} height={yJoint - jointH / 2} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xFinInt} y="0" width={tFinInt} height={yJoint - jointH / 2} fill="url(#p-plaster)" />

      {/* === ROST ORIZONTAL CU CENTURĂ BA === */}
      {/* Centură beton (ocupă întreaga grosime — punte termică majoră) */}
      <rect x={xPanel0} y={yJoint - jointH / 2} width={xPanelEnd - xPanel0} height={jointH} fill="url(#p-conc)" />
      <rect x={xPanel0} y={yJoint - jointH / 2} width={xPanelEnd - xPanel0} height={jointH} fill="url(#p-rebar)" opacity="0.7" />
      {/* Mastic rost ext */}
      <rect x={xFinExt - 1} y={yJoint - jointH / 2} width="2" height={jointH} fill="#1a1c1f" />

      {/* === PANOU INFERIOR === */}
      <rect x={xFinExt} y={yJoint + jointH / 2} width={tFinExt} height={H - yJoint - jointH / 2} fill="url(#p-plaster)" />
      <rect x={xBetExt} y={yJoint + jointH / 2} width={tBetExt} height={H - yJoint - jointH / 2} fill="url(#p-conc)" />
      <rect x={xInsul}  y={yJoint + jointH / 2} width={tInsul}  height={H - yJoint - jointH / 2} fill="url(#p-mw)" />
      <rect x={xBetInt} y={yJoint + jointH / 2} width={tBetInt} height={H - yJoint - jointH / 2} fill="url(#p-conc)" />
      <rect x={xBetInt} y={yJoint + jointH / 2} width={tBetInt} height={H - yJoint - jointH / 2} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xFinInt} y={yJoint + jointH / 2} width={tFinInt} height={H - yJoint - jointH / 2} fill="url(#p-plaster)" />

      {/* === PLANȘEU BA INTERIOR (intră în centură) === */}
      <rect x={xFinInt} y={yJoint - 11} width={W - xFinInt} height="22" fill="url(#p-conc)" />
      <rect x={xFinInt} y={yJoint - 11} width={W - xFinInt} height="22" fill="url(#p-rebar)" opacity="0.55" />

      {/* === ZONA PUNTE TERMICĂ === */}
      <HeatZone x={xPanel0 - 4} y={yJoint - 18} w={xPanelEnd - xPanel0 + 8} h="36" />
      <HeatArrow x1={xFinInt - 1} y1={yJoint} x2={xFinExt - 6} y2={yJoint} />

      {/* === LINII PRINCIPALE (contururi tehnice) === */}
      <line x1={xPanel0} y1="0" x2={xPanel0} y2={H} stroke="#1a1c1f" strokeWidth="0.5" />
      <line x1={xPanelEnd} y1="0" x2={xPanelEnd} y2={H} stroke="#1a1c1f" strokeWidth="0.5" />
      <line x1={xPanel0} y1={yJoint - jointH / 2} x2={xPanelEnd} y2={yJoint - jointH / 2} stroke="#1a1c1f" strokeWidth="0.6" />
      <line x1={xPanel0} y1={yJoint + jointH / 2} x2={xPanelEnd} y2={yJoint + jointH / 2} stroke="#1a1c1f" strokeWidth="0.6" />

      {/* === BANNER EXT / INT === */}
      <EnvBanner x="0" y="0" w={xPanel0} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xPanelEnd} y="0" w={W - xPanelEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />

      {/* === ISOTERMĂ — deviere prin centură (sugestiv) === */}
      <IsothermHint x={xPanel0 - 4} y={yJoint - 18} w={xPanelEnd - xPanel0 + 8} h={36} />

      {/* === LEADERS — staggerate în zona INT pentru a evita suprapunerea etichetelor === */}
      {/* Stratul BA exterior 60mm — linia indicatoare pornește din panoul superior */}
      <Leader x1={xBetExt + tBetExt / 2} y1={yJoint - 52} x2={132} y2={16}          label="BA ext 60mm"    anchor="start" />
      {/* Miez vată minerală 80mm (adesea degradat în PAFP) */}
      <Leader x1={xInsul  + tInsul  / 2} y1={yJoint - 48} x2={162} y2={34}          label="vată min. 80mm" anchor="start" />
      {/* Stratul BA interior 120mm */}
      <Leader x1={xBetInt + tBetInt / 2} y1={yJoint - 44} x2={192} y2={52}          label="BA int 120mm"   anchor="start" />
      {/* Centură BA continuă + planșeu (zona puntii termice) */}
      <Leader x1={(xPanel0 + xPanelEnd) / 2} y1={yJoint + 1} x2={W - 22} y2={yJoint + 28} label="centură BA + planșeu" anchor="end" />
      {/* Grosime totală panou: tenc5+BA60+MW80+BA120+tenc15 = 280mm */}
      <Label x={(xPanel0 + xPanelEnd) / 2} y={H - 6} size={6.5} anchor="middle" bg={true} color="#455a64">panou 280mm</Label>

      <PsiBadge psi={bridge.psi} />
    </>
  );
}

/**
 * Vertical section — fațadă cortină (curtain wall) cu mullion aluminiu × planșeu BA
 * conf. Mc 001-2022 § 4.4 (ψ_cw) + SR EN ISO 14683 W + EN 13830 (curtain wall)
 * Straturi cortină: sticlă triplă 4-16-4-16-4 + spacer warm-edge + mullion Al cu ruptură termică
 * Spandrel: panou aluminiu 3mm + MW 80mm + tablă galv. interior
 * ψ tipic: 0.10–0.20 W/(m·K) cu ruptură termică, 0.40–0.85 fără (clasa A-D)
 */
function IllustrationCurtainWall({ bridge }) {
  const ySlabTop = H * 0.46;
  const tSlab = 22;
  const xMull = W * 0.42;
  const tMull = 10;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xMull + tMull + 14} y="0" width={W - xMull - tMull - 14} height={H} fill="url(#g-int)" />
      {/* Sticlă superioară + inferioară */}
      <rect x={xMull - 80} y="14" width="78" height={ySlabTop - 18} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.5" />
      <line x1={xMull - 76} y1="14" x2={xMull - 76} y2={ySlabTop - 4} stroke="#ffffff" strokeWidth="0.7" opacity="0.55" />
      <line x1={xMull - 6} y1="14" x2={xMull - 6} y2={ySlabTop - 4} stroke="#ffffff" strokeWidth="0.7" opacity="0.55" />
      <rect x={xMull - 80} y={ySlabTop + tSlab + 4} width="78" height={H - ySlabTop - tSlab - 18} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.5" />
      <line x1={xMull - 76} y1={ySlabTop + tSlab + 4} x2={xMull - 76} y2={H - 14} stroke="#ffffff" strokeWidth="0.7" opacity="0.55" />
      <line x1={xMull - 6} y1={ySlabTop + tSlab + 4} x2={xMull - 6} y2={H - 14} stroke="#ffffff" strokeWidth="0.7" opacity="0.55" />
      {/* Spandrel (panou opac între etaje) */}
      <rect x={xMull - 80} y={ySlabTop - 4} width="78" height={tSlab + 8} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xMull - 78} y={ySlabTop - 2} width="74" height={tSlab + 4} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Mullion vertical Al cu ruptură termică */}
      <rect x={xMull} y="6" width={tMull} height={H - 12} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xMull + 3} y="6" width="4" height={H - 12} fill="#3a342c" />
      <rect x={xMull + 4} y="6" width="2" height={H - 12} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.3" />
      {/* Planșeu BA */}
      <rect x={xMull + tMull} y={ySlabTop} width={W - xMull - tMull} height={tSlab} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xMull + tMull} y={ySlabTop} width={W - xMull - tMull} height={tSlab} fill="url(#p-rebar)" opacity="0.55" />
      {/* Pardoseală + tavan */}
      <rect x={xMull + tMull + 14} y={ySlabTop - 8} width={W - xMull - tMull - 14} height="6" fill="url(#p-screed)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xMull + tMull + 14} y={ySlabTop - 12} width={W - xMull - tMull - 14} height="4" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xMull + tMull + 14} y={ySlabTop + tSlab} width={W - xMull - tMull - 14} height="3" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Console fixare cortină pe planșeu */}
      <rect x={xMull + tMull} y={ySlabTop + 4} width="10" height="6" fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      <rect x={xMull + tMull + 10} y={ySlabTop + 4} width="3" height="3" fill="#1a1c1f" />
      <HeatZone x={xMull - 8} y={ySlabTop - 12} w={tMull + 28} h={tSlab + 24} />
      <HeatArrow x1={xMull + tMull + 8} y1={ySlabTop + tSlab / 2} x2={xMull - 4} y2={ySlabTop + tSlab / 2} />
      <EnvBanner x="0" y="0" w={xMull - 80} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xMull + tMull + 14} y="0" w={W - xMull - tMull - 14} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={xMull + 5} y1="20" x2={xMull + 28} y2="6" label="mullion Al" anchor="start" />
      <Leader x1={(xMull - 40)} y1={ySlabTop + tSlab / 2} x2="6" y2={H - 18} label="spandrel + MW" anchor="start" />
      <Leader x1={(xMull + tMull + 50)} y1={ySlabTop + tSlab / 2} x2={W - 30} y2={H - 18} label="planșeu BA 200" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

/**
 * Plan view section — rost vertical PAFP cu stâlpișor BA monolit între panouri
 * conf. Mc 001-2022 § 4.4 (ψ_e) + SR EN ISO 14683 C + STAS 2614/4-77 (panouri prefab)
 * Vedere în plan: EXT sus, INT jos. Panouri PAFP (5 straturi în plan): tenc.ext 5 + BA ext 60 + izolație MW 80 + BA int 130 + tenc.int 15 mm
 * Stâlpișor monolit BA Ø 250mm turnat în șliț (cuplaj structural panouri)
 * ψ tipic: 0.45–0.85 W/(m·K) stâlpișor neizolat (clasa D ISO 14683)
 */
function IllustrationPrecastVerticalJoint({ bridge }) {
  const cx = W / 2;
  const colW = 28;          // stâlpișor BA Ø 250mm
  // Strat panou (de sus = EXT spre jos = INT)
  const yWall0 = H * 0.18;
  const tFinExt = 5, tBetExt = 14, tInsul = 22, tBetInt = 30, tFinInt = 5;
  const yBetExt = yWall0 + tFinExt;
  const yInsul = yBetExt + tBetExt;
  const yBetInt = yInsul + tInsul;
  const yFinInt = yBetInt + tBetInt;
  const yWallEnd = yFinInt + tFinInt;
  const xPanelLstart = 8;
  const xPanelLend = cx - colW / 2;
  const xPanelRstart = cx + colW / 2;
  const xPanelRend = W - 8;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x="0" y={yWallEnd} width={W} height={H - yWallEnd} fill="url(#g-int)" />
      {/* === PANOU STÂNGA (5 straturi) === */}
      <rect x={xPanelLstart} y={yWall0} width={xPanelLend - xPanelLstart} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelLstart} y={yBetExt} width={xPanelLend - xPanelLstart} height={tBetExt} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelLstart} y={yBetExt} width={xPanelLend - xPanelLstart} height={tBetExt} fill="url(#p-rebar)" opacity="0.45" />
      <rect x={xPanelLstart} y={yInsul} width={xPanelLend - xPanelLstart} height={tInsul} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelLstart} y={yBetInt} width={xPanelLend - xPanelLstart} height={tBetInt} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelLstart} y={yBetInt} width={xPanelLend - xPanelLstart} height={tBetInt} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xPanelLstart} y={yFinInt} width={xPanelLend - xPanelLstart} height={tFinInt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === PANOU DREAPTA (simetric) === */}
      <rect x={xPanelRstart} y={yWall0} width={xPanelRend - xPanelRstart} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelRstart} y={yBetExt} width={xPanelRend - xPanelRstart} height={tBetExt} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelRstart} y={yBetExt} width={xPanelRend - xPanelRstart} height={tBetExt} fill="url(#p-rebar)" opacity="0.45" />
      <rect x={xPanelRstart} y={yInsul} width={xPanelRend - xPanelRstart} height={tInsul} fill="url(#p-mw)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelRstart} y={yBetInt} width={xPanelRend - xPanelRstart} height={tBetInt} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xPanelRstart} y={yBetInt} width={xPanelRend - xPanelRstart} height={tBetInt} fill="url(#p-rebar)" opacity="0.55" />
      <rect x={xPanelRstart} y={yFinInt} width={xPanelRend - xPanelRstart} height={tFinExt} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* === STÂLPIȘOR BA MONOLIT (în șliț, ocupă întreaga grosime panou) === */}
      <rect x={cx - colW / 2} y={yWall0} width={colW} height={yWallEnd - yWall0} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={cx - colW / 2} y={yWall0} width={colW} height={yWallEnd - yWall0} fill="url(#p-rebar)" opacity="0.7" />
      {/* Mastic etanșare rost ext (cap de panou) */}
      <rect x={cx - colW / 2 - 1} y={yWall0} width="2" height={yWallEnd - yWall0} fill="#1a1c1f" />
      <rect x={cx + colW / 2 - 1} y={yWall0} width="2" height={yWallEnd - yWall0} fill="#1a1c1f" />
      {/* Punte termică (stâlpișor = punte continuă pe toată grosimea) */}
      <HeatZone x={cx - colW / 2 - 4} y={yWall0 - 4} w={colW + 8} h={yWallEnd - yWall0 + 8} />
      <HeatArrow x1={cx} y1={yFinInt + 2} x2={cx} y2={yWall0 - 8} />
      <EnvBanner x="0" y="0" w={W} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x="0" y={H - 12} w={W} h="12" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={cx} y1={yWall0 - 1} x2={W - 30} y2={yWall0 - 12} label="stâlpișor BA Ø250" anchor="end" />
      <Leader x1={(xPanelLstart + xPanelLend) / 2} y1={yInsul + tInsul / 2} x2="6" y2={H - 16} label="MW 80mm (panou)" anchor="start" />
      <Leader x1={(xPanelRstart + xPanelRend) / 2} y1={yBetInt + tBetInt / 2} x2={W - 6} y2={H - 16} label="BA int 130mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x={W / 2 - 50} y={H - 6} />
    </>
  );
}

/**
 * Vertical section — buiandrug BA deasupra golului ferestrei
 * conf. Mc 001-2022 § 4.4 (ψ_b sup) + SR EN ISO 14683 W
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Buiandrug BA 250×200mm întrerupe izolația pe lățimea zidăriei
 * ψ tipic: 0.30–0.55 W/(m·K) standard, 0.12–0.25 W/(m·K) cu izolație continuă (clasa B-C)
 */
function IllustrationWindowLintel({ bridge }) {
  const xWallExt = W * 0.20;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yLintelTop = H * 0.20;
  const tLintel = 22; // 200mm
  const yLintelBot = yLintelTop + tLintel;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={yLintelBot} fill="url(#g-int)" />
      <rect x="0" y={yLintelBot} width={W} height={H - yLintelBot} fill="url(#g-ext)" opacity="0.4" />
      {/* Perete deasupra (4 straturi) */}
      <rect x={xWallExt} y="14" width={tFinExt} height={yLintelTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={yLintelTop - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={yLintelTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={yLintelTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Buiandrug BA — tăie izolația */}
      <rect x={xWallExt} y={yLintelTop} width={xWallEnd - xWallExt} height={tLintel} fill="url(#p-conc)" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xWallExt} y={yLintelTop} width={xWallEnd - xWallExt} height={tLintel} fill="url(#p-rebar)" opacity="0.6" />
      {/* Tencuială intradosul buiandrugului */}
      <rect x={xWallExt} y={yLintelBot} width={xWallEnd - xWallExt} height="3" fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Gol fereastră (sub buiandrug, vizibil ca aer) */}
      <rect x={xWallExt} y={yLintelBot + 3} width={xWallEnd - xWallExt} height={H - yLintelBot - 3} fill="url(#g-ext)" opacity="0.4" />
      {/* Ramă fereastră (parțial vizibilă, în partea de sus a golului) */}
      <rect x={xBrick - 2} y={yLintelBot + 4} width="14" height={H - yLintelBot - 6} fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.6" />
      <rect x={xBrick + 2} y={yLintelBot + 8} width="6" height={H - yLintelBot - 14} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
      <line x1={xBrick + 5} y1={yLintelBot + 9} x2={xBrick + 5} y2={H - 8} stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
      {/* Punte termică la buiandrug */}
      <HeatZone x={xEPS - 4} y={yLintelTop - 4} w={tEPS + tBrick + tFinInt + 4} h={tLintel + 8} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yLintelTop + tLintel / 2} x2={xEPS - 6} y2={yLintelTop + tLintel / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={(xEPS + xBrick + tBrick) / 2} y1={yLintelTop + tLintel / 2} x2={W - 30} y2="6" label="buiandrug BA 200mm" anchor="end" />
      <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 12} y2="6" label="EPS 100mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

/**
 * Vertical section — parapet sub fereastră (alegere zonă fără izolație continuă)
 * conf. Mc 001-2022 § 4.4 (ψ_b inf) + SR EN ISO 14683 W
 * Straturi perete normal (sub parapet): tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Parapet (sub fereastră): zidărie redusă cu izolație lipsă/întreruptă pe glaf exterior
 * ψ tipic: 0.25–0.45 W/(m·K) standard, 0.10–0.20 W/(m·K) cu bandă EPS continuă (clasa B-C)
 */
function IllustrationWindowParapet({ bridge }) {
  const xWallExt = W * 0.20;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  const yParapetTop = H * 0.46;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y={yParapetTop} width={W - xWallEnd} height={H - yParapetTop} fill="url(#g-int)" />
      <rect x="0" y="0" width={W} height={yParapetTop} fill="url(#g-ext)" />
      {/* Perete sub parapet (4 straturi normale) */}
      <rect x={xWallExt} y={yParapetTop} width={tFinExt} height={H - yParapetTop} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y={yParapetTop} width={tEPS} height={H - yParapetTop} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y={yParapetTop} width={tBrick} height={H - yParapetTop} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y={yParapetTop} width={tFinInt} height={H - yParapetTop} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Parapet — zidărie redusă (fără EPS pe parapet în acest exemplu) */}
      <rect x={xBrick} y="14" width={tBrick} height={yParapetTop - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={yParapetTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      {/* Tencuială ext pe parapet (mai subțire, fără EPS — punte termică) */}
      <rect x={xBrick - 4} y="14" width="4" height={yParapetTop - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Glaf exterior metalic (panta) */}
      <path d={`M${xBrick - 6},${yParapetTop - 8} L${W - 10},${yParapetTop - 11} L${W - 10},${yParapetTop - 7} L${xBrick - 6},${yParapetTop - 4} Z`} fill="url(#g-metal)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Ramă fereastră (la partea de sus a parapetului, parțial vizibilă) */}
      <rect x={xBrick - 2} y="14" width="14" height={yParapetTop - 14 - 8} fill="#f0ece4" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick + 2} y="18" width="6" height={yParapetTop - 26} fill="url(#g-glass)" stroke="#1a1c1f" strokeWidth="0.4" />
      <line x1={xBrick + 5} y1="20" x2={xBrick + 5} y2={yParapetTop - 12} stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
      {/* Glaf interior (lemn) */}
      <rect x={xFinInt + 1} y={yParapetTop - 5} width={W * 0.20} height="5" fill="url(#p-floor)" stroke="#1a1c1f" strokeWidth="0.4" />
      {/* Zonă punte termică (zidărie subțiată, fără EPS) */}
      <HeatZone x={xBrick - 6} y={H * 0.16} w={tBrick + 14} h={yParapetTop - H * 0.16 - 4} />
      <HeatArrow x1={xBrick + tBrick / 2} y1={yParapetTop - 26} x2={xBrick - 8} y2={yParapetTop - 26} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      <Leader x1={xBrick + 4} y1={H * 0.32} x2={W - 30} y2="6" label="parapet fără EPS" anchor="end" />
      <Leader x1={xEPS + tEPS / 2} y1={yParapetTop + 26} x2={xEPS - 14} y2={H - 18} label="EPS 100mm" anchor="end" />
      <PsiBadge psi={bridge.psi} x="6" y={H - 6} />
    </>
  );
}

/**
 * Vertical section — fallback generic (perete tip + punte centrală)
 * conf. Mc 001-2022 § 4.4 + SR EN ISO 14683
 * Straturi perete: tenc.ext 5 + EPS 100 + zidărie 250 + tenc.int 15 mm
 * Punte termică indicativă în mijlocul peretelui (poziție și natură nespecificate)
 */
function IllustrationGenericFallback({ bridge }) {
  const xWallExt = W * 0.34;
  const tFinExt = 5, tEPS = 28, tBrick = 38, tFinInt = 6;
  const xEPS = xWallExt + tFinExt;
  const xBrick = xEPS + tEPS;
  const xFinInt = xBrick + tBrick;
  const xWallEnd = xFinInt + tFinInt;
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="url(#g-ext)" />
      <rect x={xWallEnd} y="0" width={W - xWallEnd} height={H} fill="url(#g-int)" />
      <rect x={xWallExt} y="14" width={tFinExt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xEPS} y="14" width={tEPS} height={H - 14} fill="url(#p-eps)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xBrick} y="14" width={tBrick} height={H - 14} fill="url(#p-brick)" stroke="#1a1c1f" strokeWidth="0.5" />
      <rect x={xFinInt} y="14" width={tFinInt} height={H - 14} fill="url(#p-plaster)" stroke="#1a1c1f" strokeWidth="0.5" />
      <HeatZone x={xWallExt - 4} y={H / 2 - 30} w={xWallEnd - xWallExt + 8} h="60" />
      <HeatArrow x1={xBrick + tBrick / 2} y1={H / 2} x2={xWallExt - 6} y2={H / 2} />
      <EnvBanner x="0" y="0" w={xWallExt} h="14" label="EXT" fill="#dde3e9" color="#1a3858" />
      <EnvBanner x={xWallEnd} y="0" w={W - xWallEnd} h="14" label="INT" fill="#f0e6d3" color="#5a3a14" />
      {bridge.cat && <Label x={W / 2} y={H * 0.92} size={8} anchor="middle" bold bg>{bridge.cat}</Label>}
      <Leader x1={xEPS + tEPS / 2} y1="22" x2={xEPS + tEPS / 2 - 10} y2="6" label="EPS 100mm" anchor="end" />
      <Leader x1={xBrick + tBrick / 2} y1="22" x2={xBrick + tBrick / 2 + 10} y2="6" label="zidărie 250mm" anchor="start" />
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

  // ── Reabilitare ETICS ────────────────────────────────────────────────────────
  if (cat === "Reabilitare ETICS") {
    if (name.includes("balcon")) return <IllustrationBalcony bridge={bridge} variant="uninterrupted" />;
    if (name.includes("atic") || name.includes("parapet")) return <IllustrationRoof bridge={bridge} variant="parapet" />;
    if (name.includes("soclu") || name.includes("drip") || name.includes("cts")) return <IllustrationETICS bridge={bridge} variant="plinth-drip" />;
    if (name.includes("colț") || name.includes("colt")) return <IllustrationETICS bridge={bridge} variant="corner-profile" />;
    if (name.includes("fereastră") || name.includes("fereastra") || name.includes("aliniat") || name.includes("tăietură") || name.includes("taietura")) return <IllustrationWindow bridge={bridge} variant="in-insulation" />;
    if (name.includes("rost") || name.includes("dilatare")) return <IllustrationETICS bridge={bridge} variant="expansion-joint" />;
    return <IllustrationETICS bridge={bridge} variant="anchor-metal" />;
  }

  // ── Pasivhaus / nZEB ─────────────────────────────────────────────────────
  if (cat === "Pasivhaus / nZEB") {
    if (name.includes("fundație") || name.includes("fundatie")) return <IllustrationFoundation bridge={bridge} variant="passivhaus-l" />;
    if (name.includes("ușă") || name.includes("usa") || name.includes("prag") || name.includes("intrare")) return <IllustrationWindow bridge={bridge} variant="threshold" />;
    if (name.includes("fereastră") || name.includes("fereastra") || name.includes("tilt&turn") || name.includes("tilt-turn") || name.includes("oculus") || name.includes("bullseye") || name.includes("punctual")) return <IllustrationWindow bridge={bridge} variant="deep-ph" />;
    if (name.includes("balcon")) return <IllustrationBalcony bridge={bridge} variant="isokorb-kxt" />;
    if (name.includes("centură") || name.includes("centura") || name.includes("planșeu") || name.includes("planseu") || name.includes("intermediar")) return <IllustrationWallFloorIntermediate bridge={bridge} />;
    if (name.includes("acoperiș") || name.includes("acoperis") || name.includes("atic")) return <IllustrationRoof bridge={bridge} variant="parapet" />;
    return <IllustrationWallFloorIntermediate bridge={bridge} />;
  }

  // ── CLT / Lemn masiv ─────────────────────────────────────────────────────
  if (cat === "CLT / Lemn masiv") {
    if (name.includes("acoperiș") || name.includes("acoperis") || name.includes("cosoroabă") || name.includes("cosoroaba")) return <IllustrationTimber bridge={bridge} variant="rafters" />;
    if (name.includes("fereastră") || name.includes("fereastra") || name.includes("pivot") || name.includes("ușă") || name.includes("usa")) return <IllustrationWindow bridge={bridge} variant="deep-ph" />;
    return <IllustrationTimber bridge={bridge} variant="clt" />;
  }

  // ── Panou sandwich ────────────────────────────────────────────────────────
  if (cat === "Panou sandwich") {
    if (name.includes("colț") || name.includes("colt")) return <IllustrationETICS bridge={bridge} variant="corner-profile" />;
    if (name.includes("rost") || name.includes("nut-feder") || name.includes("îmbinare") || name.includes("imbinare")) return <IllustrationPrecastVerticalJoint bridge={bridge} />;
    return <IllustrationETICS bridge={bridge} variant="sandwich-tie" />;
  }

  // ── Balcoane moderne ──────────────────────────────────────────────────────
  if (cat === "Balcoane moderne") {
    if (name.includes("ruptor") || name.includes("isokorb")) return <IllustrationBalcony bridge={bridge} variant="isokorb-k" />;
    if (name.includes("suspendat") || name.includes("metalic") || name.includes("ancorat")) return <IllustrationBalcony bridge={bridge} variant="steel-pendant" />;
    if (name.includes("cornisă") || name.includes("cornisa")) return <IllustrationWallFloorRoof bridge={bridge} />;
    return <IllustrationBalcony bridge={bridge} variant="uninterrupted" />;
  }

  // ── Fundații moderne ──────────────────────────────────────────────────────
  if (cat === "Fundații moderne") {
    if (name.includes("centură") || name.includes("centura") || name.includes("anti-seismică") || name.includes("antiseismica")) return <IllustrationWallGround bridge={bridge} asSoil={false} />;
    if (name.includes("split-level") || name.includes("cts") || name.includes("cota") || name.includes("cotă")) return <IllustrationFoundation bridge={bridge} variant="strip" />;
    return <IllustrationWallGround bridge={bridge} asSoil={false} />;
  }

  // ── Fațadă cortină ──────────────────────────────────────────────────────────
  if (cat === "Fațadă cortină") {
    return <IllustrationCurtainWall bridge={bridge} />;
  }

  // ── Acoperiș complex ──────────────────────────────────────────────────────
  if (cat === "Acoperiș complex") {
    if (name.includes("lucarnă") || name.includes("lucarna") || name.includes("dormer")) return <IllustrationRoof bridge={bridge} variant="dormer" />;
    if (name.includes("coș") || name.includes("cos") || name.includes("chimney")) return <IllustrationChimneyMasonry bridge={bridge} />;
    if (name.includes("skydome") || name.includes("cupolă") || name.includes("cupola")) return <IllustrationRoof bridge={bridge} variant="skylight" />;
    return <IllustrationRoof bridge={bridge} variant="eaves" />;
  }

  // ── Tradițional RO ─────────────────────────────────────────────────────────
  if (cat === "Tradițional RO") {
    if (name.includes("cosoroabă") || name.includes("cosoroaba") || name.includes("wallplate")) return <IllustrationTimber bridge={bridge} variant="rafters" />;
    if (name.includes("piatră") || name.includes("piatra") || name.includes("soclu")) return <IllustrationWallGround bridge={bridge} asSoil={true} />;
    if (name.includes("buiandrug") || name.includes("lemn vechi")) return <IllustrationWindowLintel bridge={bridge} />;
    return <IllustrationGenericFallback bridge={bridge} />;
  }

  // Rutare după cuvinte-cheie din nume (pentru punți fără câmp cat, ex: demo PAFP)
  if (name.includes("rost orizontal") || (name.includes("centură") && name.includes("panou"))) return <IllustrationPrecastPanel bridge={bridge} />;
  if (name.includes("rost vertical") || name.includes("stâlpișor") || name.includes("stalpisor")) return <IllustrationPrecastVerticalJoint bridge={bridge} />;
  if (name.includes("buiandrug")) return <IllustrationWindowLintel bridge={bridge} />;
  if (name.includes("parapet sub")) return <IllustrationWindowParapet bridge={bridge} />;
  if (name.includes("glaf")) return <IllustrationWindow bridge={bridge} variant="sill" />;
  if (name.includes("colț") || name.includes("colt") || name.includes("corner")) return <IllustrationCorner bridge={bridge} internal={false} />;
  if (name.includes("soclu")) return <IllustrationWallGround bridge={bridge} asSoil={false} />;
  if (name.includes("cornișă") || name.includes("cornisa") || name.includes("coamă") || name.includes("coama")) return <IllustrationWallFloorRoof bridge={bridge} />;
  if (name.includes("terasă") || name.includes("terasa")) return <IllustrationWallFloorRoof bridge={bridge} />;

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
    // Banner-ele interne (EnvBanner) ale ilustrațiilor sunt ACCURATE per layout —
    // nu mai impunem un banner extern stânga/dreapta care e greșit pentru ground/roof.
    // PsiBadge se ascunde prin Context (vezi BridgeRenderContext) — Ψ se afișează în modal.
    // Astfel nu mai avem nevoie de clipBottom — toate leader-ele rămân vizibile.

    // Mic padding pentru aer vizual (nu mai există conflicte cu PsiBadge)
    const padTop = 4;
    const padBottom = 4;

    return (
      <BridgeRenderContext.Provider value={{ mode }}>
        <svg
          viewBox={`0 ${-padTop} ${W} ${H + padTop + padBottom}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: 6,
            minHeight: mode === "detail" ? 520 : undefined,
            background: "#fafaf5"
          }}
          role="img"
          aria-label={`Secțiune ilustrativă: ${bridge.name}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs />
          {pickIllustration(bridge)}
          {mode === "detail" && details && (
            <IllustrationOverlay
              fRsi={details.fRsi}
              priority={null}
              isoClass={null}
              condZone={condZone}
            />
          )}
        </svg>
      </BridgeRenderContext.Provider>
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
