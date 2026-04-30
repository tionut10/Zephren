/**
 * BridgeIsotherms — vedere izoterme schematice pentru o punte termică.
 *
 * SVG 2D care arată o joncțiune tipică (colț, planșeu, balcon etc.) cu:
 *   - Geometrie schematică pereți/structură (templates per categorie)
 *   - 7 izoterme pre-calibrate (curbe Bézier) — albastru → roșu
 *   - Etichete cu leader-lines clare, fără suprapunere
 *   - Indicatori EXT/INT în colțurile corecte per template
 *
 * NOTĂ: Izotermele sunt DIDACTICE, nu rezultatul unui calcul FEM real.
 */
import { useMemo, useState } from "react";
import { bridgeFlow } from "../utils/thermalColor.js";

const SVG_W = 640;
const SVG_H = 480;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}
function fmtW(w) {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w) < 1000) return `${w.toFixed(0)} W`;
  return `${(w / 1000).toFixed(2)} kW`;
}

// ── Detectare template ────────────────────────────────────────────────────────
// Detectează template după câmpul `cat` și, ca fallback, după `name`
function detectTemplate(cat, name = "") {
  const c = (String(cat || "") + " " + String(name || "")).toLowerCase();
  if (c.includes("balcon") || c.includes("logii") || c.includes("consolă")) return "balcony";
  if (c.includes("acoperi") || c.includes("coamă") || c.includes("cornișă") || c.includes("atic") || c.includes("cornisa")) return "roof";
  if (c.includes("ferestr") || c.includes("glaf") || c.includes("prag") || c.includes("buiandrug") || c.includes("parapet sub") || c.includes("tâmplărie") || c.includes("tamplarie")) return "window";
  if (c.includes("soclu") || c.includes("subsol") || c.includes("fundație") || c.includes("fundatie") || c.includes("radier")) return "base";
  if (c.includes("stâlp") || c.includes("stalp") || c.includes("grindă") || c.includes("grinda") || c.includes("panou") || c.includes("rost")) return "structural";
  return "corner";
}

// ── Izoterme Bézier per template ──────────────────────────────────────────────
function buildIsotherms(template, T_int, T_ext) {
  const N = 7;
  const isoColor = (T) => {
    const t = (T - T_ext) / (T_int - T_ext);
    const hue = 240 - 240 * t;
    return `hsl(${hue.toFixed(0)}, 75%, 55%)`;
  };
  const temps = Array.from({ length: N }, (_, i) => T_ext + (i / (N - 1)) * (T_int - T_ext));
  const lines = [];

  if (template === "corner") {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = 35 + t * 140;
      lines.push({
        d: `M ${260 + r} 90 Q ${260 + r * 0.55} ${210 - r * 0.35} ${260 + r * 0.55} ${210} Q ${260 + r * 0.55} ${210 + r * 0.35} ${90} ${210 + r}`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  } else if (template === "balcony") {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const offset = 55 + t * 200;
      lines.push({
        d: `M ${offset} 70 C ${offset - 25} 210, ${offset + 35} 300, ${offset - 15} 420`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  } else if (template === "roof") {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const yBase = 120 + t * 55;
      lines.push({
        d: `M 70 ${yBase + 200} L 240 ${yBase + 200} Q ${290 + t * 30} ${yBase + 95} ${310 + t * 40} ${yBase - 55}`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  } else if (template === "window") {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const o = 30 + t * 130;
      lines.push({
        d: `M ${210 - o} 90 L ${210 - o} ${390 + o * 0.25} M ${420 + o} 90 L ${420 + o} ${390 + o * 0.25}`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  } else if (template === "base") {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const yLevel = 275 + t * 65;
      lines.push({
        d: `M 70 ${yLevel} Q 320 ${yLevel + 28} 570 ${yLevel}`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  } else {
    // structural
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const xL = 70 + t * 175;
      const xR = 570 - t * 175;
      const pull = (1 - t) * 55;
      lines.push({
        d: `M ${xL} 90 C ${320 - pull} 210, ${320 - pull} 290, ${xL} 400 M ${xR} 90 C ${320 + pull} 210, ${320 + pull} 290, ${xR} 400`,
        color: isoColor(temps[i]), T: temps[i],
      });
    }
  }
  return lines;
}

// ── Callout helper (label cu leader-line) ─────────────────────────────────────
function Callout({ x, y, lx, ly, label, color = "#cbd5e1", size = 9, anchor = "start" }) {
  const bw  = label.length * (size * 0.58) + 10;
  const bh  = size + 8;
  const bx  = anchor === "end" ? x - bw : anchor === "middle" ? x - bw / 2 : x;
  const by  = y - bh / 2;
  return (
    <g>
      {/* Leader-line */}
      <line x1={lx} y1={ly} x2={x} y2={y}
            stroke={color} strokeWidth="0.8" opacity="0.55" />
      <circle cx={lx} cy={ly} r="2" fill={color} opacity="0.7" />
      {/* Box */}
      <rect x={bx - 2} y={by} width={bw + 4} height={bh} rx="3"
            fill="rgba(2,6,23,0.82)" stroke={color} strokeWidth="0.7" />
      <text x={x} y={by + bh - 4} textAnchor={anchor} fontSize={size}
            fill={color} fontFamily="monospace" fontWeight="600">
        {label}
      </text>
    </g>
  );
}

// ── EnvBadge — indicatori EXT/INT per colț ───────────────────────────────────
function EnvBadge({ x, y, label, T, fillColor, textColor, anchor = "start" }) {
  const bw = 68;
  const bh = 32;
  const bx = anchor === "end" ? x - bw : anchor === "middle" ? x - bw / 2 : x;
  return (
    <g>
      <rect x={bx} y={y} width={bw} height={bh} rx="5"
            fill={fillColor} stroke={textColor} strokeWidth="0.8" opacity="0.88" />
      <text x={bx + bw / 2} y={y + 11} textAnchor="middle" fontSize="10"
            fill={textColor} fontWeight="700">{label}</text>
      <text x={bx + bw / 2} y={y + 25} textAnchor="middle" fontSize="9"
            fill={textColor} fontFamily="monospace" opacity="0.9">{T}°C</text>
    </g>
  );
}

// ── Backdrop schematic per template ─────────────────────────────────────────
function renderBackdrop(template, T_int_s, T_ext_s) {
  const wallStyle   = { fill: "#475569", stroke: "#1e293b", strokeWidth: 1 };
  const insulStyle  = { fill: "#fde68a", stroke: "#92400e", strokeWidth: 1 };
  const concStyle   = { fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 1 };

  switch (template) {
    case "corner":
      return (
        <g>
          {/* Perete vertical */}
          <rect x={228} y={70} width={60} height={200} {...wallStyle} />
          <rect x={208} y={70} width={20} height={200} {...insulStyle} />
          {/* Perete orizontal */}
          <rect x={70} y={208} width={228} height={60} {...wallStyle} />
          <rect x={70} y={188} width={228} height={20} {...insulStyle} />
          {/* Callouts cu leader-lines */}
          <Callout lx={218} ly={145} x={145} y={100} label="izolație" color="#fbbf24" size={9} anchor="middle" />
          <Callout lx={258} ly={160} x={340} y={120} label="structură" color="#94a3b8" size={9} anchor="start" />
          <Callout lx={258} ly={235} x={340} y={240} label="colț ext." color="#cbd5e1" size={9} anchor="start" />
          {/* EXT/INT badges */}
          <EnvBadge x={440} y={70} label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={70} y={350} label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );

    case "balcony":
      return (
        <g>
          <rect x={70} y={70} width={120} height={400} {...wallStyle} />
          <rect x={50} y={70} width={20} height={400} {...insulStyle} />
          {/* Consolă balcon */}
          <rect x={50} y={218} width={430} height={44} {...concStyle} />
          <Callout lx={260} ly={218} x={360} y={185} label="consolă balcon (punte termică)" color="#fbbf24" size={9} anchor="start" />
          <Callout lx={60} ly={160} x={148} y={130} label="izolație" color="#fbbf24" size={9} anchor="start" />
          {/* EXT/INT */}
          <EnvBadge x={490} y={70}  label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={490} y={380} label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={160} y={280} label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );

    case "roof":
      return (
        <g>
          {/* Perete */}
          <rect x={70} y={310} width={420} height={140} {...wallStyle} />
          <rect x={50} y={310} width={20} height={140} {...insulStyle} />
          {/* Atic */}
          <rect x={70} y={130} width={420} height={180} {...wallStyle} />
          <rect x={50} y={130} width={20} height={180} {...insulStyle} />
          {/* Acoperiș */}
          <rect x={50} y={108} width={440} height={22} {...insulStyle} />
          <Callout lx={260} ly={108} x={390} y={80}  label="acoperiș + termoizolație" color="#fde68a" size={9} anchor="start" />
          <Callout lx={260} ly={380} x={390} y={380} label="perete exterior" color="#94a3b8" size={9} anchor="start" />
          {/* EXT/INT */}
          <EnvBadge x={490} y={90}  label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={70}  y={380} label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );

    case "window":
      return (
        <g>
          {/* Perete sus */}
          <rect x={70} y={70}  width={500} height={50}  {...wallStyle} />
          <rect x={70} y={50}  width={500} height={20}  {...insulStyle} />
          {/* Perete jos */}
          <rect x={70} y={415} width={500} height={50}  {...wallStyle} />
          {/* Perete stânga */}
          <rect x={70}  y={120} width={130} height={295} {...wallStyle} />
          <rect x={50}  y={120} width={20}  height={295} {...insulStyle} />
          {/* Perete dreapta */}
          <rect x={430} y={120} width={140} height={295} {...wallStyle} />
          <rect x={570} y={120} width={20}  height={295} {...insulStyle} />
          {/* Vitraj */}
          <rect x={200} y={120} width={230} height={295} fill="#bfdbfe" opacity="0.45"
                stroke="#1e40af" strokeWidth="2.5" />
          <Callout lx={315} ly={260} x={430} y={200} label="vitraj" color="#bfdbfe" size={9} anchor="start" />
          <Callout lx={315} ly={415} x={430} y={445} label="prag tâmplărie" color="#cbd5e1" size={9} anchor="start" />
          <Callout lx={60}  ly={200} x={148} y={170} label="izolație" color="#fde68a" size={9} anchor="start" />
          {/* EXT/INT */}
          <EnvBadge x={8}   y={90}  label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={8}   y={380} label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={575} y={235} label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );

    case "base":
      return (
        <g>
          {/* Perete */}
          <rect x={70} y={70}  width={500} height={210} {...wallStyle} />
          <rect x={70} y={50}  width={500} height={20}  {...insulStyle} />
          {/* Sol */}
          <rect x={0}  y={358} width={SVG_W} height={122} fill="#7c2d12" stroke="#451a03" strokeWidth="1" />
          <rect x={0}  y={358} width={SVG_W} height={18}  fill="#a3a3a3" />
          {/* Fundație */}
          <rect x={70} y={280} width={500} height={78} {...concStyle} />
          <Callout lx={320} ly={395} x={480} y={410} label="sol" color="#fef3c7" size={9} anchor="start" />
          <Callout lx={320} ly={318} x={470} y={310} label="fundație / soclu" color="#cbd5e1" size={9} anchor="start" />
          <Callout lx={70}  ly={160} x={148} y={120} label="izolație" color="#fde68a" size={9} anchor="start" />
          {/* EXT/INT */}
          <EnvBadge x={490} y={70}  label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={70}  y={200} label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );

    case "structural":
    default:
      return (
        <g>
          <rect x={70}  y={70}  width={500} height={370} {...wallStyle} />
          <rect x={50}  y={70}  width={20}  height={370} {...insulStyle} />
          <rect x={570} y={70}  width={20}  height={370} {...insulStyle} />
          {/* Stâlp/grindă conductivă centrală */}
          <rect x={270} y={70}  width={100} height={370} {...concStyle} />
          <Callout lx={320} ly={70}  x={440} y={50}  label="stâlp/grindă (beton)" color="#fbbf24" size={9} anchor="start" />
          <Callout lx={60}  ly={255} x={148} y={225} label="izolație" color="#fde68a" size={9} anchor="start" />
          <Callout lx={155} ly={255} x={148} y={280} label="zidărie" color="#94a3b8" size={9} anchor="start" />
          {/* EXT/INT */}
          <EnvBadge x={8}   y={90}  label="EXT" T={T_ext_s} fillColor="rgba(96,165,250,0.12)" textColor="#93c5fd" anchor="start" />
          <EnvBadge x={575} y={90}  label="INT" T={T_int_s} fillColor="rgba(16,185,129,0.12)" textColor="#6ee7b7" anchor="start" />
        </g>
      );
  }
}

// ── Componenta principală ─────────────────────────────────────────────────────
export default function BridgeIsotherms({
  thermalBridges = [],
  selectedBridgeIdx: externalIdx,
  onSelectIdx,
  climate = {},
}) {
  const [internalIdx, setInternalIdx] = useState(0);
  const idx        = Number.isInteger(externalIdx) ? externalIdx : internalIdx;
  const clampedIdx = Math.max(0, Math.min(thermalBridges.length - 1, idx));
  const bridge     = thermalBridges[clampedIdx];

  const setIdx = (newIdx) => {
    if (onSelectIdx) onSelectIdx(newIdx);
    setInternalIdx(newIdx);
  };

  const T_int = Number.isFinite(climate.T_int) ? climate.T_int : 20;
  const T_ext = Number.isFinite(climate.T_ext) ? climate.T_ext : -15;
  const dT    = T_int - T_ext;

  const template  = useMemo(() => detectTemplate(bridge?.cat, bridge?.name), [bridge]);
  const isotherms = useMemo(() => buildIsotherms(template, T_int, T_ext), [template, T_int, T_ext]);

  if (!thermalBridges.length) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="text-white/50">
          <div className="text-4xl mb-2" aria-hidden="true">🔗</div>
          <div className="text-sm">Nu există punți termice definite</div>
          <div className="text-[11px] mt-1 text-white/30">
            Adaugă punți (joncțiuni, console, glafuri) pentru a vizualiza izotermele
          </div>
        </div>
      </div>
    );
  }

  const psi    = parseFloat(bridge?.psi)    || 0;
  const length = parseFloat(bridge?.length) || 0;
  const Q      = bridgeFlow(psi, length, dT);

  const T_int_s = fmt(T_int, 1);
  const T_ext_s = fmt(T_ext, 1);

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.06] bg-white/[0.015] flex-wrap">
        <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Punte</span>
        <select
          value={clampedIdx}
          onChange={(e) => setIdx(parseInt(e.target.value))}
          className="text-xs bg-slate-900 border border-white/15 rounded px-2 py-1 text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 min-w-[260px]"
        >
          {thermalBridges.map((b, i) => (
            <option key={i} value={i}>
              {b.name} — ψ={fmt(b.psi, 3)} · L={fmt(b.length, 1)}m
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono">
          <span className="text-white/50">ψ = <span className="text-white font-bold">{fmt(psi, 3)}</span> W/mK</span>
          <span className="text-white/50">L = <span className="text-white font-bold">{fmt(length, 1)}</span> m</span>
          <span className="text-white/50">ΔT = <span className="text-white font-bold">{fmt(dT, 1)}</span> K</span>
          <span className="text-white/50">Q = <span className="text-amber-300 font-bold">{fmtW(Q)}</span></span>
        </div>
      </div>

      {/* SVG */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto max-w-[740px]">
          {/* Backdrop */}
          {renderBackdrop(template, T_int_s, T_ext_s)}

          {/* Izoterme */}
          <g opacity="0.82">
            {isotherms.map((iso, i) => (
              <path
                key={i}
                d={iso.d}
                fill="none"
                stroke={iso.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${iso.color})` }}
              />
            ))}
          </g>

          {/* Legendă izoterme — colț dreapta sus */}
          <g transform={`translate(${SVG_W - 94}, 16)`}>
            <rect x={-8} y={-10} width={90} height={isotherms.length * 16 + 20}
                  fill="rgba(2,6,23,0.88)" stroke="rgba(255,255,255,0.1)" rx="5" />
            <text x={0} y={4} fontSize="9" fill="#cbd5e1" fontWeight="700"
                  fontFamily="monospace">Izoterme [°C]</text>
            {isotherms.map((iso, i) => (
              <g key={i} transform={`translate(0, ${(i + 1) * 14 + 2})`}>
                <line x1={0} y1={0} x2={20} y2={0} stroke={iso.color} strokeWidth="3" />
                <text x={26} y={4} fontSize="9" fill="#e2e8f0" fontFamily="monospace">
                  {fmt(iso.T, 1)}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06] bg-amber-500/[0.04]">
        <div className="text-[10px] text-amber-200/80 leading-relaxed">
          <strong className="text-amber-300">Notă:</strong> Izotermele afișate sunt schematice (pre-calibrate per categorie).
          Pentru analiză precisă cu element finit folosește Therm, Flixo sau ANSYS.
          {" "}Categorie detectată: <span className="font-mono text-amber-100">{bridge?.cat || "—"}</span> · template:
          <span className="font-mono text-amber-100 ml-1">{template}</span>.
        </div>
      </div>
    </div>
  );
}
