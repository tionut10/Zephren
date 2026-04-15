/**
 * Building3D — cutie 3D schematică a clădirii, rotabilă cu mouse/touch.
 *
 * Implementare cu CSS 3D transforms pure (fără three.js, fără WebGL).
 * 6 fețe poziționate în spațiu 3D, populate cu rect-uri element colorate după U.
 * Punțile termice = bare luminoase pe muchiile cutiei, intensitate ∝ ψ·L.
 *
 * Interacțiune:
 *   - Drag cu mouse/touch → rotație liberă (rx, ry)
 *   - Click pe element opac → onSelectElement(element)
 *   - Click pe punte → onSelectBridge(bridge)
 *   - Hover → tooltip cu U, A, Q, %
 *   - Butoane UI: reset, izometric, exploded view
 */
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { uToColor, uToLabel, heatFlow, bridgeFlow, bridgeColor } from "../utils/thermalColor.js";
import { buildBuildingSchema } from "../utils/schemaBuilder.js";
import ThermalTooltip from "../components/ThermalTooltip.jsx";

// ── Configurație vizuală ─────────────────────────────────────────────────────
const SCALE = 42;          // pixeli per metru
const DEFAULT_RX = -18;    // unghi de pornire (văzut de sus-față)
const DEFAULT_RY = 30;
const EDGE_THICKNESS = 6;  // grosime bară punte termică (px)

// Unghi izometric "clasic" (aproximativ arhitectural)
const ISO_RX = -30;
const ISO_RY = 45;

// Clamps rotire
const clampRx = (v) => Math.max(-85, Math.min(10, v));

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function fmtW(w) {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w) < 1000) return `${w.toFixed(0)} W`;
  return `${(w / 1000).toFixed(2)} kW`;
}

// ── Mapare muchie → transform CSS 3D ─────────────────────────────────────────
function getEdgeTransform(edgeId, dims) {
  const L = dims.length * SCALE;   // est-vest (X)
  const W = dims.width  * SCALE;   // nord-sud (Z)
  const H = dims.height * SCALE;   // sus-jos (Y)
  const T = EDGE_THICKNESS;
  // Fiecare muchie = paralelipiped subțire. Origine în centrul cutiei.
  switch (edgeId) {
    // ── Muchii TOP (la înălțimea y = -H/2) ──
    case "top-south":  return { transform: `translate3d(${-L/2}px, ${-H/2}px, ${ W/2}px)`, width: L, height: T, depth: T };
    case "top-north":  return { transform: `translate3d(${-L/2}px, ${-H/2}px, ${-W/2}px)`, width: L, height: T, depth: T };
    case "top-east":   return { transform: `translate3d(${ L/2}px, ${-H/2}px, ${-W/2}px) rotateY(90deg)`, width: W, height: T, depth: T };
    case "top-west":   return { transform: `translate3d(${-L/2}px, ${-H/2}px, ${-W/2}px) rotateY(90deg)`, width: W, height: T, depth: T };
    // ── Muchii BOTTOM (la y = +H/2) ──
    case "bottom-south": return { transform: `translate3d(${-L/2}px, ${ H/2}px, ${ W/2}px)`, width: L, height: T, depth: T };
    case "bottom-north": return { transform: `translate3d(${-L/2}px, ${ H/2}px, ${-W/2}px)`, width: L, height: T, depth: T };
    case "bottom-east":  return { transform: `translate3d(${ L/2}px, ${ H/2}px, ${-W/2}px) rotateY(90deg)`, width: W, height: T, depth: T };
    case "bottom-west":  return { transform: `translate3d(${-L/2}px, ${ H/2}px, ${-W/2}px) rotateY(90deg)`, width: W, height: T, depth: T };
    // ── Muchii verticale (bare pe colțuri) ──
    case "vert-se":  return { transform: `translate3d(${ L/2}px, ${-H/2}px, ${ W/2}px) rotateZ(90deg)`, width: H, height: T, depth: T };
    case "vert-sw":  return { transform: `translate3d(${-L/2}px, ${-H/2}px, ${ W/2}px) rotateZ(90deg)`, width: H, height: T, depth: T };
    case "vert-ne":  return { transform: `translate3d(${ L/2}px, ${-H/2}px, ${-W/2}px) rotateZ(90deg)`, width: H, height: T, depth: T };
    case "vert-nw":  return { transform: `translate3d(${-L/2}px, ${-H/2}px, ${-W/2}px) rotateZ(90deg)`, width: H, height: T, depth: T };
    default: return null;
  }
}

// ── Mapare față → transform CSS 3D ───────────────────────────────────────────
function getFaceTransform(faceId, dims) {
  const L = dims.length * SCALE;
  const W = dims.width  * SCALE;
  const H = dims.height * SCALE;
  switch (faceId) {
    case "south":  return { transform: `translateZ(${ W/2}px)`,                           width: L, height: H };
    case "north":  return { transform: `translateZ(${-W/2}px) rotateY(180deg)`,           width: L, height: H };
    case "east":   return { transform: `translateX(${ L/2}px) rotateY(90deg)`,            width: W, height: H };
    case "west":   return { transform: `translateX(${-L/2}px) rotateY(-90deg)`,           width: W, height: H };
    case "top":    return { transform: `translateY(${-H/2}px) rotateX(90deg)`,            width: L, height: W };
    case "bottom": return { transform: `translateY(${ H/2}px) rotateX(-90deg)`,           width: L, height: W };
    default: return null;
  }
}

// Etichete în română pentru fețe
const FACE_LABEL = {
  south: "Sud",    north: "Nord",  east: "Est",
  west:  "Vest",   top: "Acoperiș", bottom: "Placă sol",
};

// ── Componentă Face — o față a cutiei cu elementele suprapuse ────────────────
function Face({
  faceId, face, dims, colorMode, dT,
  onHoverElement, onLeaveElement, onClickElement,
  exploded,
}) {
  const cfg = getFaceTransform(faceId, dims);
  if (!cfg) return null;

  // Explosion: deplasează fața spre exterior normal fețe
  const explodeVec = {
    south: `translateZ(${exploded ? 80 : 0}px)`,
    north: `translateZ(${exploded ? -80 : 0}px)`,
    east:  `translateX(${exploded ? 80 : 0}px)`,
    west:  `translateX(${exploded ? -80 : 0}px)`,
    top:   `translateY(${exploded ? -80 : 0}px)`,
    bottom:`translateY(${exploded ? 80 : 0}px)`,
  }[faceId];

  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{
        width: cfg.width,
        height: cfg.height,
        marginLeft: -cfg.width / 2,
        marginTop:  -cfg.height / 2,
        transform: `${explodeVec} ${cfg.transform}`,
        transformStyle: "preserve-3d",
        backfaceVisibility: "visible",
        transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Fundal față (ușor transparent, doar pentru context) */}
      <div className="absolute inset-0 border-2 border-white/20 bg-slate-900/30 rounded-sm overflow-hidden">
        {/* Label orientare — colț stânga-sus al fețe */}
        <div
          className="absolute top-1 left-1 text-[10px] font-bold text-white/70 bg-slate-900/80 px-1.5 py-0.5 rounded-sm select-none pointer-events-none"
          style={{ backfaceVisibility: "hidden" }}
        >
          {FACE_LABEL[faceId] || faceId}
        </div>

        {/* Rect-uri elemente */}
        {face.rects.map((r, idx) => {
          const el = r.element;
          const U = r.U;
          const color = uToColor(U, colorMode);
          const area = parseFloat(el?.area) || 0;
          const Q = heatFlow(U, area, dT);
          const isGlazing = r.kind === "glazing";
          const name = el?.name || (isGlazing ? "Vitraj" : "Perete");
          return (
            <div
              key={`${faceId}-${idx}`}
              role="button"
              tabIndex={0}
              aria-label={`${name} — U ${fmt(U, 2)} W/m²K`}
              className={`absolute cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isGlazing
                  ? "border-2 border-sky-200/80 shadow-[inset_0_0_20px_rgba(255,255,255,0.25)]"
                  : "border border-white/15"
              } hover:brightness-125 hover:z-10`}
              style={{
                left: `${r.xPct}%`,
                top: `${r.yPct}%`,
                width: `${r.wPct}%`,
                height: `${r.hPct}%`,
                backgroundColor: color,
              }}
              onMouseEnter={(e) => onHoverElement(e, { r, U, Q, name, isGlazing, faceId })}
              onMouseMove={(e) => onHoverElement(e, { r, U, Q, name, isGlazing, faceId })}
              onMouseLeave={onLeaveElement}
              onClick={() => onClickElement(r)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClickElement(r); } }}
            >
              {/* Label mic în interiorul rect-ului dacă spațiu suficient */}
              {r.wPct > 20 && r.hPct > 25 && (
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-slate-900/80 pointer-events-none mix-blend-screen select-none">
                  {Number.isFinite(U) ? `U=${fmt(U, 2)}` : name.slice(0, 12)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componentă Edge — bară punte termică pe muchia cutiei ────────────────────
function Edge({ edge, dims, dT, onHoverBridge, onLeaveBridge, onClickBridge }) {
  const cfg = getEdgeTransform(edge.edgeId, dims);
  if (!cfg) return null;
  const Q = bridgeFlow(edge.bridge.psi, edge.bridge.length, dT);
  const color = bridgeColor(edge.intensity);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Punte ${edge.bridge.name}`}
      className="absolute top-1/2 left-1/2 cursor-pointer"
      style={{
        width: cfg.width,
        height: cfg.height,
        transform: cfg.transform,
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={(e) => onHoverBridge(e, { edge, Q })}
      onMouseMove={(e) => onHoverBridge(e, { edge, Q })}
      onMouseLeave={onLeaveBridge}
      onClick={() => onClickBridge(edge)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClickBridge(edge); } }}
    >
      <div
        className="w-full h-full rounded-sm"
        style={{
          background: color,
          boxShadow: `0 0 ${6 + 12 * edge.intensity}px ${2 + 6 * edge.intensity}px ${color}`,
        }}
      />
    </div>
  );
}

// ── Componenta principală ────────────────────────────────────────────────────
export default function Building3D({
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  building = {},
  climate = {},
  calcOpaqueR,
  colorMode = "continuous",
  onSelectElement,
  onSelectBridge,
}) {
  const sceneRef = useRef(null);
  const [rx, setRx] = useState(DEFAULT_RX);
  const [ry, setRy] = useState(DEFAULT_RY);
  const [exploded, setExploded] = useState(false);
  const [tooltip, setTooltip] = useState(null);  // { x, y, data }

  // Construim schema o singură dată (memo)
  const schema = useMemo(
    () => buildBuildingSchema({
      opaqueElements, glazingElements, thermalBridges, building, calcOpaqueR, climate,
    }),
    [opaqueElements, glazingElements, thermalBridges, building, calcOpaqueR, climate]
  );

  // Total pierderi pentru % din total în tooltip
  const totalQ = useMemo(() => {
    let sum = 0;
    for (const [, face] of Object.entries(schema.faces)) {
      for (const r of face.rects) {
        sum += heatFlow(r.U, parseFloat(r.element?.area) || 0, schema.dT);
      }
    }
    for (const e of schema.bridgeEdges) {
      sum += bridgeFlow(e.bridge.psi, e.bridge.length, schema.dT);
    }
    return sum;
  }, [schema]);

  // ── Drag to rotate ────────────────────────────────────────────────────────
  const dragState = useRef({ active: false, startX: 0, startY: 0, startRx: 0, startRy: 0 });

  const onPointerDown = useCallback((e) => {
    dragState.current = { active: true, startX: e.clientX, startY: e.clientY, startRx: rx, startRy: ry };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [rx, ry]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setRy(dragState.current.startRy + dx * 0.4);
    setRx(clampRx(dragState.current.startRx - dy * 0.4));
  }, []);

  const onPointerUp = useCallback((e) => {
    dragState.current.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  // Tastatură — săgeți pentru rotire 10°/pas
  useEffect(() => {
    const onKey = (e) => {
      if (!sceneRef.current || !sceneRef.current.contains(document.activeElement)) {
        return; // Doar când scena e focalizată, nu capturăm globalul
      }
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      switch (e.key) {
        case "ArrowLeft":  setRy(v => v - 10); break;
        case "ArrowRight": setRy(v => v + 10); break;
        case "ArrowUp":    setRx(v => clampRx(v - 10)); break;
        case "ArrowDown":  setRx(v => clampRx(v + 10)); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Tooltip handlers ──────────────────────────────────────────────────────
  const handleHoverElement = useCallback((e, payload) => {
    const { r, U, Q, name, isGlazing, faceId } = payload;
    const el = r.element;
    const pct = totalQ > 0 ? (Q / totalQ) * 100 : 0;
    const rows = [
      { label: "Tip", value: isGlazing ? (el?.isDoor ? "Ușă" : "Fereastră") : (el?.type || "—") },
      { label: "Orientare", value: FACE_LABEL[faceId] || "—" },
      { label: "Arie", value: `${fmt(parseFloat(el?.area) || 0, 1)} m²` },
      { label: "U", value: `${fmt(U, 2)} W/m²K` },
      ...(colorMode === "discrete" ? [{ label: "Clasă", value: uToLabel(U) }] : []),
      { label: "ΔT", value: `${fmt(schema.dT, 1)} K` },
      { label: "Q element", value: fmtW(Q), highlight: true },
      { label: "% total", value: `${pct.toFixed(1)}%` },
    ];
    setTooltip({
      x: e.clientX, y: e.clientY,
      data: {
        title: name,
        subtitle: isGlazing ? "Element vitrat" : "Element opac",
        rows,
        accent: U > 1.0 ? "red" : U > 0.35 ? "amber" : "emerald",
      },
    });
  }, [totalQ, schema.dT, colorMode]);

  const handleHoverBridge = useCallback((e, { edge, Q }) => {
    const pct = totalQ > 0 ? (Q / totalQ) * 100 : 0;
    const b = edge.bridge;
    const rows = [
      { label: "Categorie", value: b.cat || "—" },
      { label: "ψ", value: `${fmt(b.psi, 3)} W/mK` },
      { label: "Lungime", value: `${fmt(parseFloat(b.length) || 0, 1)} m` },
      { label: "ΔT", value: `${fmt(schema.dT, 1)} K` },
      { label: "Q punte", value: fmtW(Q), highlight: true },
      { label: "% total", value: `${pct.toFixed(1)}%` },
    ];
    setTooltip({
      x: e.clientX, y: e.clientY,
      data: { title: b.name, subtitle: "Punte termică", rows, accent: "red" },
    });
  }, [totalQ, schema.dT]);

  const handleLeave = useCallback(() => setTooltip(null), []);

  const handleClickElement = useCallback((r) => {
    if (onSelectElement) onSelectElement(r);
  }, [onSelectElement]);

  const handleClickBridge = useCallback((edge) => {
    if (onSelectBridge) onSelectBridge(edge);
  }, [onSelectBridge]);

  // ── Butoane control vedere ────────────────────────────────────────────────
  const resetView = () => { setRx(DEFAULT_RX); setRy(DEFAULT_RY); };
  const isoView   = () => { setRx(ISO_RX); setRy(ISO_RY); };

  // ── Render ────────────────────────────────────────────────────────────────
  const hasData = opaqueElements.length + glazingElements.length > 0;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar vedere */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-white/[0.06] bg-white/[0.015]">
        <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Vedere 3D</span>
        <button
          onClick={resetView}
          className="text-[11px] px-2 py-1 rounded border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          title="Revine la unghiul implicit"
        >
          ⟲ Implicit
        </button>
        <button
          onClick={isoView}
          className="text-[11px] px-2 py-1 rounded border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          title="Unghi izometric (45° / -30°)"
        >
          📐 Izometric
        </button>
        <button
          onClick={() => setExploded(v => !v)}
          className={`text-[11px] px-2 py-1 rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
            exploded
              ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
              : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08]"
          }`}
          title="Desparte fețele pentru vizualizare individuală"
        >
          {exploded ? "🧩 Reasamblează" : "🧩 Desparte fețe"}
        </button>
        <div className="ml-auto text-[10px] text-white/40 font-mono">
          rx {rx.toFixed(0)}° · ry {ry.toFixed(0)}°
        </div>
      </div>

      {/* Scenă 3D */}
      <div
        ref={sceneRef}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 select-none touch-none"
        style={{ perspective: "1600px", perspectiveOrigin: "50% 40%" }}
        onPointerDown={hasData ? onPointerDown : undefined}
        onPointerMove={hasData ? onPointerMove : undefined}
        onPointerUp={hasData ? onPointerUp : undefined}
        onPointerCancel={hasData ? onPointerUp : undefined}
      >
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-center p-6">
            <div className="text-white/50">
              <div className="text-4xl mb-2" aria-hidden="true">🏗️</div>
              <div className="text-sm">Adaugă elemente de anvelopă pentru vizualizare</div>
              <div className="text-[11px] mt-1 text-white/30">
                pereți, ferestre, acoperiș, planșee, punți termice
              </div>
            </div>
          </div>
        ) : (
          <div
            className="absolute top-1/2 left-1/2 cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(-50%, -50%) rotateX(${rx}deg) rotateY(${ry}deg)`,
              transformStyle: "preserve-3d",
              transition: dragState.current.active ? "none" : "transform 0.3s ease-out",
              width: 0,
              height: 0,
            }}
          >
            {/* 6 fețe */}
            {Object.entries(schema.faces).map(([faceId, face]) => (
              <Face
                key={faceId}
                faceId={faceId}
                face={face}
                dims={schema.dims}
                colorMode={colorMode}
                dT={schema.dT}
                onHoverElement={handleHoverElement}
                onLeaveElement={handleLeave}
                onClickElement={handleClickElement}
                exploded={exploded}
              />
            ))}

            {/* Muchii punți termice */}
            {schema.bridgeEdges.map((edge, idx) => (
              <Edge
                key={`edge-${idx}`}
                edge={edge}
                dims={schema.dims}
                dT={schema.dT}
                onHoverBridge={handleHoverBridge}
                onLeaveBridge={handleLeave}
                onClickBridge={handleClickBridge}
              />
            ))}
          </div>
        )}

        {/* Hint drag */}
        {hasData && (
          <div className="absolute bottom-2 left-2 text-[10px] text-white/30 pointer-events-none select-none">
            🖱️ Trage pentru rotire · ⬅➡⬆⬇ tastatură · Click element pentru detalii
          </div>
        )}

        {/* Info total pierderi */}
        {hasData && totalQ > 0 && (
          <div className="absolute top-2 right-2 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white/80 pointer-events-none">
            <div className="text-white/50 text-[9px] uppercase tracking-wider">Pierdere totală</div>
            <div className="text-amber-300 font-bold">{fmtW(totalQ)}</div>
            <div className="text-white/40">ΔT = {fmt(schema.dT, 1)} K</div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip && <ThermalTooltip x={tooltip.x} y={tooltip.y} data={tooltip.data} />}
      </div>
    </div>
  );
}
