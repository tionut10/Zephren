/**
 * BridgeIsotherms — vedere izoterme schematice pentru o punte termică.
 *
 * SVG 2D care arată o joncțiune tipică (colț, planșeu, balcon etc.) cu:
 *   - Geometrie schematică pereți/structură (templates per categorie)
 *   - 5-7 izoterme pre-calibrate (curbe Bézier) — albastru → roșu
 *   - Săgeată flux termic + tooltip cu ψ·L·ΔT
 *
 * NOTĂ: Izotermele sunt DIDACTICE, nu rezultatul unui calcul FEM real.
 * Pentru analiză precisă: Therm, Flixo, ANSYS.
 */
import { useMemo, useState } from "react";
import { bridgeFlow } from "../utils/thermalColor.js";

const SVG_W = 600;
const SVG_H = 460;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function fmtW(w) {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w) < 1000) return `${w.toFixed(0)} W`;
  return `${(w / 1000).toFixed(2)} kW`;
}

// ── Identifică template-ul pe baza categoriei punții ─────────────────────────
function detectTemplate(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("balcon") || c.includes("logii") || c.includes("consolă")) return "balcony";
  if (c.includes("acoperi") || c.includes("coamă") || c.includes("cornișă") || c.includes("atic")) return "roof";
  if (c.includes("ferestr") || c.includes("glaf") || c.includes("prag") || c.includes("buiandrug")) return "window";
  if (c.includes("soclu") || c.includes("subsol") || c.includes("fundație")) return "base";
  if (c.includes("stâlp") || c.includes("grindă")) return "structural";
  return "corner"; // default joncțiune colț
}

// Generează izoterme ca array de path-uri SVG
function buildIsotherms(template, T_int, T_ext) {
  // 7 izoterme distribuite uniform între T_int și T_ext
  const tempsK = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    tempsK.push(T_ext + t * (T_int - T_ext));
  }

  // Per template: definim path-urile centrale și deformăm în funcție de poziție
  const isoColor = (T) => {
    const t = (T - T_ext) / (T_int - T_ext);
    const hue = 240 - 240 * t;
    return `hsl(${hue.toFixed(0)}, 75%, 55%)`;
  };

  const lines = [];

  if (template === "corner") {
    // Colț extern: izotermele "dau ocol" colțului — concentrare la vârf
    // Geometrie: pereți L (vertical sus + orizontal stânga), colț extern în (250, 200)
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      // Distanța de la colț crește cu t (interior) → curbe mai depărtate
      const r = 30 + t * 130;
      lines.push({
        d: `M ${250 + r} 80 Q ${250 + r * 0.6} ${200 - r * 0.4} ${250 + r * 0.6} ${200} Q ${250 + r * 0.6} ${200 + r * 0.4} ${80} ${200 + r}`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  } else if (template === "balcony") {
    // Consolă balcon: placă orizontală traversează peretele
    // Pierdere mare la inserția consolei — izotermele se "trag" spre exterior
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const offset = 50 + t * 200;
      lines.push({
        d: `M ${offset} 60 C ${offset - 20} 200, ${offset + 30} 280, ${offset - 10} 400`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  } else if (template === "roof") {
    // Joncțiune perete-acoperiș (atic): izotermele coboară pe perete și ies prin atic
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const yBase = 120 + t * 60;
      lines.push({
        d: `M 60 ${yBase + 200} L 230 ${yBase + 200} Q ${280 + t * 30} ${yBase + 100} ${300 + t * 40} ${yBase - 60}`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  } else if (template === "window") {
    // Tâmplărie: glaf, prag — pierderi pe perimetru
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const o = 30 + t * 130;
      lines.push({
        d: `M ${200 - o} 80 L ${200 - o} ${380 + o * 0.3} M ${400 + o} 80 L ${400 + o} ${380 + o * 0.3}`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  } else if (template === "base") {
    // Soclu / fundație: pierderi spre sol
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const yLevel = 280 + t * 70;
      lines.push({
        d: `M 60 ${yLevel} Q 300 ${yLevel + 30} 540 ${yLevel}`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  } else {
    // Structural — stâlp/grindă în perete (linii drepte deformate de zona conductivă centrală)
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const xL = 60 + t * 180;
      const xR = 540 - t * 180;
      const xMid = 300;
      const pull = (1 - t) * 60;
      lines.push({
        d: `M ${xL} 80 C ${xMid - pull} 200, ${xMid - pull} 280, ${xL} 400 M ${xR} 80 C ${xMid + pull} 200, ${xMid + pull} 280, ${xR} 400`,
        color: isoColor(tempsK[i]),
        T: tempsK[i],
      });
    }
  }

  return lines;
}

// Backdrop schematic (pereți, structură) per template
function renderBackdrop(template) {
  const wallStyle = { fill: "#475569", stroke: "#1e293b", strokeWidth: 1 };       // gri
  const insulStyle = { fill: "#fde68a", stroke: "#92400e", strokeWidth: 1 };      // galben
  const concreteStyle = { fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 1 };

  switch (template) {
    case "corner":
      return (
        <g>
          {/* Perete vertical (sus) — strat structural + izolație */}
          <rect x={220} y={60} width={60} height={200} {...wallStyle} />
          <rect x={200} y={60} width={20} height={200} {...insulStyle} />
          {/* Perete orizontal (stânga) */}
          <rect x={60} y={200} width={220} height={60} {...wallStyle} />
          <rect x={60} y={180} width={220} height={20} {...insulStyle} />
          <text x={310} y={50} fontSize="11" fill="#cbd5e1">izolație → exterior</text>
          <text x={310} y={155} fontSize="11" fill="#cbd5e1">structură (cărămidă/beton)</text>
          <text x={310} y={235} fontSize="11" fill="#cbd5e1">colț exterior</text>
        </g>
      );
    case "balcony":
      return (
        <g>
          <rect x={60} y={60} width={120} height={400} {...wallStyle} />
          <rect x={40} y={60} width={20} height={400} {...insulStyle} />
          {/* Consolă balcon traversează izolația */}
          <rect x={40} y={210} width={400} height={50} {...concreteStyle} />
          <text x={240} y={200} fontSize="11" fill="#fbbf24" fontWeight="600">consolă balcon (punte termică)</text>
          <text x={460} y={250} fontSize="10" fill="#cbd5e1">→ exterior</text>
        </g>
      );
    case "roof":
      return (
        <g>
          <rect x={60} y={300} width={400} height={140} {...wallStyle} />
          <rect x={40} y={300} width={20} height={140} {...insulStyle} />
          {/* Atic */}
          <rect x={60} y={120} width={400} height={180} {...wallStyle} />
          <rect x={40} y={120} width={20} height={180} {...insulStyle} />
          {/* Acoperiș plan */}
          <rect x={40} y={100} width={420} height={20} {...insulStyle} />
          <text x={240} y={90} fontSize="11" fill="#cbd5e1">acoperiș + termoizolație</text>
          <text x={300} y={420} fontSize="11" fill="#cbd5e1">perete vertical</text>
        </g>
      );
    case "window":
      return (
        <g>
          {/* Perete sus */}
          <rect x={60} y={60} width={480} height={50} {...wallStyle} />
          <rect x={60} y={40} width={480} height={20} {...insulStyle} />
          {/* Perete jos */}
          <rect x={60} y={400} width={480} height={50} {...wallStyle} />
          {/* Perete stânga */}
          <rect x={60} y={110} width={140} height={290} {...wallStyle} />
          <rect x={40} y={110} width={20} height={290} {...insulStyle} />
          {/* Perete dreapta */}
          <rect x={400} y={110} width={140} height={290} {...wallStyle} />
          <rect x={540} y={110} width={20} height={290} {...insulStyle} />
          {/* Tâmplărie + sticlă */}
          <rect x={200} y={110} width={200} height={290} fill="#bfdbfe" opacity="0.5" stroke="#1e40af" strokeWidth="3" />
          <text x={300} y={250} textAnchor="middle" fontSize="12" fill="#1e3a8a" fontWeight="600">vitraj</text>
          <text x={300} y={430} textAnchor="middle" fontSize="11" fill="#cbd5e1">prag tâmplărie</text>
        </g>
      );
    case "base":
      return (
        <g>
          {/* Perete */}
          <rect x={60} y={60} width={480} height={220} {...wallStyle} />
          <rect x={60} y={40} width={480} height={20} {...insulStyle} />
          {/* Sol */}
          <rect x={0} y={350} width={SVG_W} height={110} fill="#7c2d12" stroke="#451a03" strokeWidth="1" />
          <rect x={0} y={350} width={SVG_W} height={20} fill="#a3a3a3" />
          {/* Fundație */}
          <rect x={60} y={280} width={480} height={70} {...concreteStyle} />
          <text x={SVG_W / 2} y={420} textAnchor="middle" fontSize="11" fill="#fef3c7">sol</text>
          <text x={SVG_W / 2} y={320} textAnchor="middle" fontSize="11" fill="#cbd5e1">fundație / soclu</text>
        </g>
      );
    case "structural":
    default:
      return (
        <g>
          {/* Perete cu stâlp/grindă conductivă în mijloc */}
          <rect x={60} y={60} width={480} height={380} {...wallStyle} />
          <rect x={40} y={60} width={20} height={380} {...insulStyle} />
          <rect x={540} y={60} width={20} height={380} {...insulStyle} />
          {/* Element structural traversant */}
          <rect x={260} y={60} width={80} height={380} {...concreteStyle} />
          <text x={300} y={50} textAnchor="middle" fontSize="11" fill="#fbbf24" fontWeight="600">stâlp/grindă (beton)</text>
          <text x={150} y={250} textAnchor="middle" fontSize="11" fill="#cbd5e1">izolație + zidărie</text>
        </g>
      );
  }
}

// ── Componenta principală ────────────────────────────────────────────────────
export default function BridgeIsotherms({
  thermalBridges = [],
  selectedBridgeIdx: externalIdx,
  onSelectIdx,
  climate = {},
}) {
  const [internalIdx, setInternalIdx] = useState(0);
  const idx = Number.isInteger(externalIdx) ? externalIdx : internalIdx;
  const clampedIdx = Math.max(0, Math.min(thermalBridges.length - 1, idx));
  const bridge = thermalBridges[clampedIdx];

  const setIdx = (newIdx) => {
    if (onSelectIdx) onSelectIdx(newIdx);
    setInternalIdx(newIdx);
  };

  const T_int = Number.isFinite(climate.T_int) ? climate.T_int : 20;
  const T_ext = Number.isFinite(climate.T_ext) ? climate.T_ext : -15;
  const dT = T_int - T_ext;

  const template = useMemo(() => detectTemplate(bridge?.cat), [bridge]);
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

  const psi = parseFloat(bridge?.psi) || 0;
  const length = parseFloat(bridge?.length) || 0;
  const Q = bridgeFlow(psi, length, dT);

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      {/* Header: selector punte + info */}
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
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto max-w-[700px]">
          {/* Backdrop: pereți, structură */}
          {renderBackdrop(template)}

          {/* Izoterme */}
          <g opacity="0.85">
            {isotherms.map((iso, i) => (
              <g key={i}>
                <path
                  d={iso.d}
                  fill="none"
                  stroke={iso.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 3px ${iso.color})` }}
                />
              </g>
            ))}
          </g>

          {/* Legendă izoterme T */}
          <g transform={`translate(${SVG_W - 90}, 70)`}>
            <rect x={-6} y={-12} width={86} height={isotherms.length * 16 + 22} fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.1)" rx="4" />
            <text x={0} y={0} fontSize="9" fill="#cbd5e1" fontWeight="600">Izoterme [°C]</text>
            {isotherms.map((iso, i) => (
              <g key={i} transform={`translate(0, ${(i + 1) * 14})`}>
                <line x1={0} y1={0} x2={20} y2={0} stroke={iso.color} strokeWidth="3" />
                <text x={26} y={3} fontSize="9" fill="#e2e8f0">{fmt(iso.T, 1)}</text>
              </g>
            ))}
          </g>

          {/* Etichete interior/exterior */}
          <text x={20} y={30} fontSize="11" fill="#fbbf24" fontWeight="700">
            🏠 Interior {fmt(T_int, 1)}°C
          </text>
          <text x={SVG_W - 20} y={SVG_H - 16} textAnchor="end" fontSize="11" fill="#60a5fa" fontWeight="700">
            ❄ Exterior {fmt(T_ext, 1)}°C
          </text>
        </svg>
      </div>

      {/* Footer: notă didactică */}
      <div className="px-4 py-2 border-t border-white/[0.06] bg-amber-500/[0.04]">
        <div className="text-[10px] text-amber-200/80 leading-relaxed">
          <strong className="text-amber-300">Notă:</strong> Izotermele afișate sunt schematice (pre-calibrate per categorie).
          Pentru analiză precisă cu calcul cu element finit folosește software dedicat (Therm, Flixo, ANSYS).
          Categoria detectată: <span className="font-mono text-amber-100">{bridge?.cat || "—"}</span> · template:
          <span className="font-mono text-amber-100">{template}</span>.
        </div>
      </div>
    </div>
  );
}
