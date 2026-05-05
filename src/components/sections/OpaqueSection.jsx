/**
 * OpaqueSection.jsx — Viewer SVG pentru secțiunea unui element opac.
 *
 * Orientarea secțiunii se adaptează automat la tipul elementului (element.type):
 *   - PE, PR, PS   — perete vertical   → secțiune WALL (EXT stânga, INT dreapta, layers ca coloane)
 *   - PT, SE       — planșeu terasă    → secțiune SLAB (EXT atmosferă sus, INT jos, layers ca rânduri)
 *   - PP           — planșeu sub pod   → secțiune SLAB (POD gri sus, INT jos)
 *   - PL           — placă pe sol      → secțiune SLAB (INT sus, SOL jos)
 *   - PB           — planșeu peste subsol → secțiune SLAB (INT sus, SUBSOL gri jos)
 *   - PI           — planșeu intermediar → secțiune SLAB (INT sus, INT jos)
 *
 * Convenția ordinii straturilor: array-ul `layers` se citește de la EXTERIOR la INTERIOR
 * pentru toate tipurile (standard C107/3 și conform `wizardOpaqueCalc.js`). Pentru plăci
 * pe sol (PL) ordinea vizuală e inversată — stratul "exterior" (sol) apare jos.
 *
 * Props:
 *   element: { name, type, layers: [{ matName|material, thickness(mm), lambda, rho, mu }] }
 *   climate: { theta_e, ... } — opțional pentru profil T
 *   width, height, compact, showTemperatureProfile, showDimensions, showLegend, onClickExpand
 */

import { SectionFrame, MaterialLayer, DimensionCote, HeatFlowArrow, MaterialLegend, classifyMaterial } from "./primitives.jsx";

const MIN_LAYER_DRAW = 14; // pixels — grosimea minimă vizuală pentru lizibilitate

// Anti-coliziune 2D — împinge etichetele doar dacă bbox-urile lor se suprapun realmente.
// Două etichete cu X-uri foarte diferite (chiar dacă au Y similar) NU sunt mutate,
// astfel încât rămân lângă punctul lor de origine.
//
// rects: [{x, y, w, h, anchorX, anchorY, minY?, maxY?}]
// axis: "y" — împinge pe Y (default pentru wall section); "x" — pe X (slab section)
function avoidLabelCollisions2D(rects, axis = "y", maxIter = 30) {
  if (rects.length <= 1) return rects.map(r => ({ ...r }));
  const adj = rects.map(r => ({ ...r }));
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < adj.length - 1; i++) {
      for (let j = i + 1; j < adj.length; j++) {
        const a = adj[i], b = adj[j];
        const xOver = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const yOver = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        // Coliziune 2D doar dacă AMBELE axe au suprapunere
        if (xOver > 0 && yOver > 0) {
          if (axis === "y") {
            const push = yOver / 2 + 0.5;
            if (a.y <= b.y) { a.y -= push; b.y += push; }
            else { a.y += push; b.y -= push; }
          } else {
            const push = xOver / 2 + 0.5;
            if (a.x <= b.x) { a.x -= push; b.x += push; }
            else { a.x += push; b.x -= push; }
          }
          moved = true;
        }
      }
    }
    // Constrângere în interval [minY, maxY] / [minX, maxX] dacă specificat
    for (const r of adj) {
      if (axis === "y") {
        if (r.minY != null && r.y < r.minY) { r.y = r.minY; moved = true; }
        if (r.maxY != null && r.y + r.h > r.maxY) { r.y = r.maxY - r.h; moved = true; }
      } else {
        if (r.minX != null && r.x < r.minX) { r.x = r.minX; moved = true; }
        if (r.maxX != null && r.x + r.w > r.maxX) { r.x = r.maxX - r.w; moved = true; }
      }
    }
    if (!moved) break;
  }
  return adj;
}

// ── Configurație orientare per tip element ───────────────────────────────────
const ELEMENT_SECTION_CONFIG = {
  // Pereți verticali — orientare orizontală (EXT stânga, INT dreapta)
  PE: { layout: "wall", extLabel: "EXTERIOR (aer)",       intLabel: "INTERIOR (aer încăpere)" },
  PR: { layout: "wall", extLabel: "ROST ÎNCHIS",          intLabel: "INTERIOR" },
  PS: { layout: "wall", extLabel: "SUB CTS (sol lateral)", intLabel: "INTERIOR SUBSOL", extFill: "url(#amb-soil)", extColor: "#78350f" },
  // Planșeu terasă — atmosferă sus, interior jos
  PT: { layout: "slab_top_ext", extLabel: "EXTERIOR (acoperiș terasă)", intLabel: "INTERIOR (cameră)" },
  // Planșeu separator (bow-window) — similar terasă
  SE: { layout: "slab_top_ext", extLabel: "EXTERIOR (aer liber)",       intLabel: "INTERIOR" },
  // Planșeu sub pod neîncălzit — POD sus, INTERIOR jos
  PP: { layout: "slab_top_ext", extLabel: "POD NEÎNCĂLZIT",              intLabel: "INTERIOR (cameră)", extFill: "url(#amb-unheated)", extColor: "#475569" },
  // Placă pe sol — INTERIOR sus, SOL jos
  PL: { layout: "slab_top_int", intLabelTop: "INTERIOR (cameră)",       extLabelBottom: "SOL", extFill: "url(#amb-soil)", extColor: "#78350f" },
  // Planșeu peste subsol neîncălzit — INTERIOR sus, SUBSOL jos
  PB: { layout: "slab_top_int", intLabelTop: "INTERIOR (cameră)",       extLabelBottom: "SUBSOL NEÎNCĂLZIT", extFill: "url(#amb-unheated)", extColor: "#475569" },
  // Planșeu intermediar — INT sus + INT jos
  PI: { layout: "slab_both_int", intLabelTop: "INTERIOR (etaj sup.)",   intLabelBottom: "INTERIOR (etaj inf.)" },
};

function getSectionConfig(elementType) {
  return ELEMENT_SECTION_CONFIG[elementType] || ELEMENT_SECTION_CONFIG.PE;
}

// Calculează grosimile vizuale cu boost pentru straturile prea subțiri
function computeDrawSizes(layers, totalSpan) {
  const totalThick = layers.reduce((s, l) => s + l.thickness, 0);
  if (totalThick <= 0) return layers.map(() => 0);
  const raw = layers.map(l => (l.thickness / totalThick) * totalSpan);
  const boost = raw.map(w => w < MIN_LAYER_DRAW ? MIN_LAYER_DRAW : null);
  const totalBoost = boost.filter(x => x !== null).reduce((s, v) => s + v, 0);
  const scalable = raw.reduce((s, w, i) => boost[i] === null ? s + w : s, 0);
  const remaining = totalSpan - totalBoost;
  return raw.map((w, i) => boost[i] !== null ? boost[i] : scalable > 0 ? (w / scalable) * remaining : 0);
}

// Calculează textul afișat pe strat cu truncare pe baza spațiului
function truncateLabel(name, availableSpace) {
  const maxChars = Math.max(6, Math.floor(availableSpace / 5.2));
  return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
}

export default function OpaqueSection({
  element,
  climate,
  width = 640,
  height = 260,
  tInt = 20,
  showTemperatureProfile = true,
  showDimensions = true,
  compact = false,
  showLegend = true,
  onClickExpand,
}) {
  if (!element || !element.layers || element.layers.length === 0) {
    return (
      <div className="p-6 text-center text-xs opacity-50 bg-white/[0.03] rounded-lg border border-white/5">
        Adaugă straturi pentru a vedea secțiunea transversală.
      </div>
    );
  }

  const layers = element.layers.map(l => ({
    name: l.matName || l.material || "Strat",
    thickness: parseFloat(l.thickness) || 0,
    lambda: parseFloat(l.lambda) || 0,
    rho: parseFloat(l.rho) || null,
    mu: parseFloat(l.mu) || null,
    category: classifyMaterial(l.matName || l.material || ""),
  }));

  const totalThick = layers.reduce((s, l) => s + l.thickness, 0);
  if (totalThick <= 0) {
    return <div className="p-6 text-center text-xs opacity-50">Grosimi invalide în straturi.</div>;
  }

  const config = getSectionConfig(element.type);
  const isWall = config.layout === "wall";
  const isSoilOrientation = config.layout === "slab_top_int";

  // R total, U total, masă/m²
  const rsi = 0.13, rse = 0.04;
  const rLayers = layers.map(l => l.thickness > 0 && l.lambda > 0 ? (l.thickness / 1000) / l.lambda : 0);
  const rTotal = rsi + rLayers.reduce((s, r) => s + r, 0) + rse;
  const uTotal = rTotal > 0 ? 1 / rTotal : 0;
  const massPerM2 = layers.reduce((s, l) => l.rho ? s + (l.thickness / 1000) * l.rho : s, 0);

  // Lățimi vizuale pentru straturile de perete (folosite și în banda HTML de dedesubt)
  const wallDrawWidths = isWall ? computeDrawSizes(layers, width) : null;

  // Ordinea de afișare: pentru PB/PL/PI legenda urmează vizualul (INT sus = primul)
  const isReversedSlab = isSoilOrientation || config.layout === "slab_both_int";
  const legendLayerOrder = isReversedSlab ? [...layers].reverse() : layers;

  // Legendă
  const legendItems = legendLayerOrder.map((l, i) => ({
    category: l.category,
    name: l.name,
    thickness: l.thickness,
    lambda: l.lambda || null,
    rho: l.rho,
    mu: l.mu,
    displayIndex: i + 1,
  }));

  return (
    <div className={compact ? "space-y-0" : "space-y-3"}>
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <Metric label="Grosime totală" value={`${totalThick.toFixed(0)} mm`} />
          <Metric label="R total" value={`${rTotal.toFixed(2)} m²K/W`} />
          <Metric label="U" value={`${uTotal.toFixed(3)} W/m²K`} accent />
          <Metric label="Masă/m²" value={massPerM2 > 0 ? `${massPerM2.toFixed(0)} kg` : "—"} />
        </div>
      )}

      {/* Banner explicativ tip orientare */}
      {!compact && (
        <div className="flex items-center gap-2 text-[11px] bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
          <span>{isWall ? "🧱" : isSoilOrientation ? "🏗" : "🏠"}</span>
          <span className="text-white/70">
            {isWall
              ? <>Secțiune <b>verticală</b> prin perete — EXTERIOR la stânga, INTERIOR la dreapta, straturile dispuse pe orizontală.</>
              : config.layout === "slab_top_ext"
                ? <>Secțiune <b>orizontală</b> prin planșeu — exteriorul (cerul/pod) deasupra, interiorul camerei dedesubt.</>
                : config.layout === "slab_both_int"
                  ? <>Secțiune <b>orizontală</b> prin planșeu intermediar — ambele fețe sunt INTERIOR (etaje încălzite).</>
                  : <>Secțiune <b>orizontală</b> — interiorul camerei deasupra, {config.extLabelBottom?.toLowerCase() || "exteriorul"} dedesubt.</>}
          </span>
        </div>
      )}

      {/* Avertisment convenție introducere straturi pentru PB/PL/PI */}
      {!compact && isReversedSlab && (
        <div className="flex items-start gap-2 text-[11px] bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
          <span className="text-amber-200/80 leading-relaxed">
            <b>Convenție introducere straturi:</b>{" "}
            {element.type === "PL"
              ? <>Stratul ① trebuie să fie cel <b>mai aproape de sol</b> (exterior), stratul{" "}
                  <b>N cel mai aproape de cameră</b> (finisajul interior, ex. parchet).</>
              : element.type === "PI"
                ? <>Stratul ① = primul de sus (etajul superior), stratul N = ultimul (spre etajul inferior).</>
                : <>Stratul ① trebuie să fie cel <b>mai aproape de subsol</b> (ex. tencuiala tavanului din subsol),
                  stratul <b>N cel mai aproape de cameră</b> (finisajul podelei, ex. parchet).</>}
            {" "}Ordinea în secțiune: ① sus → N jos (sau invers față de cum introduci în editor).
          </span>
        </div>
      )}

      <div className={compact ? "" : "bg-white/[0.02] rounded-xl p-2 border border-white/5"} onClick={onClickExpand} style={{ cursor: onClickExpand ? "pointer" : "default" }}>
        {isWall
          ? renderWallSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal, wallDrawWidths })
          : renderSlabSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal })}
      </div>

      {/* ── Lista denumiri straturi planșeu (slab) — dedesubt ───────────── */}
      {!isWall && !compact && (
        <div className="flex flex-wrap gap-1.5">
          {legendLayerOrder.map((l, i) => (
            <div key={i}
              className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-[10px]"
              title={`λ=${l.lambda} W/mK · R=${l.lambda > 0 ? ((l.thickness/1000)/l.lambda).toFixed(3) : "—"} m²K/W`}>
              <span className="w-4 h-4 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center text-[7px] font-bold text-white/80 flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-white/70 font-medium">{l.name}</span>
              <span className="text-white/35 font-mono">{l.thickness} mm</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Bandă denumiri straturi — dedesubt, în afara SVG-ului ──────────── */}
      {isWall && !compact && wallDrawWidths && (
        <div className="flex rounded-lg overflow-hidden border border-white/10" style={{ gap: 0 }}>
          {layers.map((l, i) => {
            const pct = (wallDrawWidths[i] / width) * 100;
            return (
              <div
                key={i}
                style={{ width: `${pct}%`, minWidth: "24px" }}
                className="bg-white/[0.025] border-r border-white/10 last:border-r-0 px-1 py-1.5 text-center"
                title={`${l.name} · ${l.thickness} mm · λ=${l.lambda}`}
              >
                <div className="text-[8px] font-bold text-white/40 mb-0.5">{i + 1}</div>
                <div className="text-[8px] text-white/60 truncate leading-tight"
                     style={{ writingMode: pct < 8 ? "vertical-lr" : "horizontal-tb" }}>
                  {pct < 5 ? "" : truncateLabel(l.name, wallDrawWidths[i] - 8)}
                </div>
                {pct >= 8 && (
                  <div className="text-[7px] text-white/35 font-mono mt-0.5">{l.thickness} mm</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showLegend && !compact && (
        <div>
          <div className="text-[10px] opacity-65 mb-1 uppercase tracking-wider">
            Legendă materiale · ordinea:{" "}
            {isWall
              ? "exterior (E) → interior (I)"
              : isReversedSlab
                ? "interior (sus, ①) → exterior (jos)"
                : "exterior (sus, ①) → interior (jos)"}
          </div>
          <MaterialLegend items={legendItems} layout="grid" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Secțiune WALL — layout orizontal (coloane de straturi)
// ═══════════════════════════════════════════════════════════════════════════
function renderWallSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal, wallDrawWidths }) {
  const drawWidths = wallDrawWidths || computeDrawSizes(layers, width);
  const xStarts = [0];
  drawWidths.forEach(w => xStarts.push(xStarts[xStarts.length - 1] + w));

  // Profil T
  let tempPoints = null;
  if (showTemperatureProfile && climate?.theta_e !== undefined) {
    const tExt = climate.theta_e;
    // Acumulare EXT→INT: pornim cu rse (rezistența suprafeței exterioare)
    let rCum = rse;
    const pts = [{ x: 0, t: tExt + (tInt - tExt) * rse / rTotal }];
    layers.forEach((_, i) => {
      rCum += rLayers[i];
      pts.push({ x: xStarts[i + 1], t: tExt + (tInt - tExt) * rCum / rTotal });
    });
    const tMin = Math.min(tExt, ...pts.map(p => p.t)) - 1;
    const tMax = Math.max(tInt, ...pts.map(p => p.t)) + 1;
    tempPoints = { pts, tMin, tMax, yTop: 20, yBottom: height - 40 };
  }

  return (
    <SectionFrame
      width={width}
      height={height}
      orientation="horizontal"
      extLabel={config.extLabel}
      intLabel={config.intLabel}
      extFill={config.extFill}
      intFill={config.intFill}
      extColor={config.extColor}
      intColor={config.intColor}
    >
      {/* Straturi ca coloane */}
      {layers.map((l, i) => (
        <MaterialLayer key={i} x={xStarts[i]} y={0} width={drawWidths[i]} height={height} category={l.category} name={l.name} />
      ))}

      {/* Textele denumirilor straturilor sunt mutate în banda HTML de sub SVG (fără text rotit în interior) */}

      {/* Numere index strat (1, 2, 3...) — badge mic în partea de jos a fiecărui strat */}
      {!compact && layers.map((l, i) => {
        const w = drawWidths[i];
        const xc = xStarts[i] + w / 2;
        if (w < 14) return null;
        return (
          <g key={`idx-${i}`} style={{ pointerEvents: "none" }}>
            <circle cx={xc} cy={height - 14} r="7" fill="#1e293b" stroke="white" strokeWidth="1" />
            <text x={xc} y={height - 11} fontSize="8" fill="white" textAnchor="middle" fontWeight="800">{i + 1}</text>
          </g>
        );
      })}

      {/* R% per strat — badge mic deasupra fiecărui strat */}
      {!compact && layers.map((l, i) => {
        const w = drawWidths[i];
        const xc = xStarts[i] + w / 2;
        if (w < 28) return null;
        const rPct = rTotal > 0 ? (rLayers[i] / rTotal) * 100 : 0;
        return (
          <g key={`r-${i}`} style={{ pointerEvents: "none" }}>
            <rect x={xc - 18} y={6} width="36" height="11" rx="2" fill="rgba(15,23,42,0.85)" />
            <text x={xc} y={14} fontSize="7.5" fill="#fbbf24" textAnchor="middle" fontWeight="700" fontFamily="monospace">R {rPct.toFixed(0)}%</text>
          </g>
        );
      })}

      {/* Cote grosimi sub */}
      {showDimensions && !compact && layers.map((l, i) => (
        <DimensionCote key={`dim-${i}`} x1={xStarts[i]} y1={height + 6} x2={xStarts[i + 1]} y2={height + 6} label={`${l.thickness}`} offset={10} orientation="h" />
      ))}

      {/* Flux termic INT → EXT — sub zona profilului T pentru a evita suprapunerea */}
      {!compact && (
        <HeatFlowArrow x1={width - 15} y1={height - 18} x2={15} y2={height - 18} label="Flux termic (iarnă)" />
      )}

      {/* Profil T */}
      {tempPoints && (() => {
        const { pts, tMin, tMax, yTop, yBottom } = tempPoints;
        const tToY = (t) => yBottom - ((t - tMin) / (tMax - tMin)) * (yBottom - yTop);
        const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + tToY(p.t).toFixed(1)).join(" ");

        // Anti-coliziune 2D: etichetele rămân lângă punctul lor (poziție naturală deasupra),
        // doar dacă bbox-urile chiar se suprapun, una se mută (preferabil sub punct, dacă cealaltă e deasupra).
        const labelW = 30, labelH = 14;
        // Limite verticale: deasupra legendei (32) și deasupra fluxului termic (height - 28)
        const minY = compact ? 4 : 36;
        const maxY = height - 28;
        const rawLabels = pts.map((p, i) => {
          const py = tToY(p.t);
          // Plasare alternantă: punctele cu T mare (sus) → eticheta deasupra; T mic (jos) → eticheta deasupra tot
          // Default: deasupra punctului. Se poate ajusta la coliziune.
          const naturalY = py - labelH - 3;
          return {
            x: p.x - labelW / 2,
            y: Math.max(minY, Math.min(maxY - labelH, naturalY)),
            w: labelW,
            h: labelH,
            anchorX: p.x,
            anchorY: py,
            naturalY,
            minY,
            maxY,
          };
        });
        // Dacă două etichete consecutive au X-uri foarte apropiate (overlap iminent), pune una dedesubt
        for (let i = 0; i < rawLabels.length - 1; i++) {
          const a = rawLabels[i], b = rawLabels[i + 1];
          const xOver = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const yOver = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (xOver > 0 && yOver > 0) {
            // Pune eticheta cu T mai mare dedesubt (nu peste linie)
            const candidate = a.anchorY < b.anchorY ? b : a;
            const altY = candidate.anchorY + 4;
            if (altY + candidate.h <= maxY) {
              candidate.y = altY;
            }
          }
        }
        const adjLabels = avoidLabelCollisions2D(rawLabels, "y");

        // Gradient cromatic pe linia termică (albastru→roșu per temperatură)
        const tRange = tMax - tMin || 1;
        const tempHsl = (t) => {
          const frac = Math.max(0, Math.min(1, (t - tMin) / tRange));
          return `hsl(${(240 - 240 * frac).toFixed(0)},78%,50%)`;
        };

        // Etichete T: alternare sus/jos, filtrând duplicatele (ΔT < 0.3°)
        const LBL_W = 38, LBL_H = 17;
        const STRIP_TOP = compact ? 2 : 30;
        const STRIP_BTM = height - 26;

        const tLabels = [];
        let lastWallT = null;
        pts.forEach((p) => {
          if (lastWallT !== null && Math.abs(p.t - lastWallT) < 0.3) return;
          const cx   = p.x;
          const cy   = tToY(p.t);
          const row  = tLabels.length % 2;
          const labelY = row === 0
            ? Math.max(STRIP_TOP, cy - LBL_H - 6)
            : Math.min(STRIP_BTM, cy + 6);
          tLabels.push({ cx, cy, labelY, row, t: p.t });
          lastWallT = p.t;
        });

        return (
          <g style={{ pointerEvents: "none" }}>
            {/* Gradient def */}
            <defs>
              <linearGradient id="wall-temp-line-grad" x1="0" y1="0" x2={width} y2="0"
                              gradientUnits="userSpaceOnUse">
                {pts.map((p, i) => (
                  <stop key={i} offset={`${(p.x / width * 100).toFixed(1)}%`} stopColor={tempHsl(p.t)} />
                ))}
              </linearGradient>
            </defs>
            {/* Shadow */}
            <path d={path} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="5" strokeLinejoin="round" />
            {/* Linia principală cu gradient */}
            <path d={path} fill="none" stroke="url(#wall-temp-line-grad)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.95" />

            {/* Etichete T alternante sus/jos cu leader-line */}
            {tLabels.map(({ cx, cy, labelY, row, t }, i) => {
              const color  = tempHsl(t);
              const lx     = cx - LBL_W / 2;
              const leaderY1 = row === 0 ? cy - 3 : cy + 3;
              const leaderY2 = row === 0 ? labelY + LBL_H : labelY;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="3.5" fill={color} stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
                  <line x1={cx} y1={leaderY1} x2={cx} y2={leaderY2}
                        stroke={color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6" />
                  <rect x={lx} y={labelY} width={LBL_W} height={LBL_H} rx="3"
                        fill="rgba(255,255,255,0.97)" stroke={color} strokeWidth="0.8" />
                  <text x={cx} y={labelY + LBL_H - 5} fontSize="9.5" fill={color}
                        textAnchor="middle" fontWeight="700">{t.toFixed(1)}°</text>
                </g>
              );
            })}

            {!compact && (
              <g>
                <rect x="4" y="4" width="130" height="28" fill="rgba(255,255,255,0.95)" rx="3" stroke="rgba(180,0,0,0.3)" strokeWidth="0.5" />
                <circle cx="12" cy="13" r="3" fill={tempHsl(pts[0].t)} />
                <text x="19" y="15" fontSize="8.5" fill="#7f1d1d" fontWeight="700">T({tInt}° → {climate?.theta_e}°) iarnă</text>
                <text x="8" y="26" fontSize="7.5" fill="#374151" fontWeight="600">EXT {pts[0].t.toFixed(1)}° → {pts[pts.length - 1].t.toFixed(1)}° INT</text>
              </g>
            )}
          </g>
        );
      })()}
    </SectionFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Secțiune SLAB — layout vertical (rânduri de straturi)
// ═══════════════════════════════════════════════════════════════════════════
function renderSlabSection({ layers, width, height, climate, tInt, config, compact, showTemperatureProfile, showDimensions, rsi, rse, rLayers, rTotal }) {
  // Pentru layout "slab_top_int" / "slab_both_int": ordinea layers se INVERSEAZĂ vizual —
  // stratul primul din array (care e EXT prin convenție) trebuie afișat JOS, nu SUS.
  const reversed = config.layout === "slab_top_int" || config.layout === "slab_both_int";
  const displayLayers = reversed ? [...layers].reverse() : layers;
  const displayR = reversed ? [...rLayers].reverse() : rLayers;

  const drawHeights = computeDrawSizes(displayLayers, height);
  const yStarts = [0];
  drawHeights.forEach(h => yStarts.push(yStarts[yStarts.length - 1] + h));

  // Profil T (vertical — axa Y = poziție, axa X = temperatură)
  let tempPoints = null;
  if (showTemperatureProfile && climate?.theta_e !== undefined && config.layout !== "slab_both_int") {
    const tExt = climate.theta_e;
    // Acumulare EXT→INT: pornim cu rse (rezistența suprafeței exterioare)
    let rCum = rse;
    const pts = [];
    pts.push({ rPos: 0, t: tExt + (tInt - tExt) * rse / rTotal });
    rLayers.forEach((r, i) => {
      rCum += r;
      pts.push({ rPos: i + 1, t: tExt + (tInt - tExt) * rCum / rTotal });
    });
    // Convert rPos → Y coordinate
    const layerYs = reversed ? yStarts.slice().reverse() : yStarts;
    // layerYs[0] = top position for EXT-side interface if not reversed;
    // in reversed case, EXT-side interface (rPos=N) is at top of drawing, rPos=0 is at bottom
    const yMapped = pts.map(p => {
      const yIdx = reversed ? (pts.length - 1 - p.rPos) : p.rPos;
      return { y: yStarts[yIdx], t: p.t };
    });
    const tMin = Math.min(tExt, ...pts.map(p => p.t)) - 1;
    const tMax = Math.max(tInt, ...pts.map(p => p.t)) + 1;
    tempPoints = { yPts: yMapped, tMin, tMax, xLeft: 20, xRight: width - 20 };
  }

  // Labels top/bottom pentru SectionFrame:
  let extLabel, intLabel, extFill, intFill, extColor, intColor;
  if (reversed) {
    // INT pe sus, EXT (sol/subsol) pe jos
    extLabel = config.intLabelTop || "INTERIOR";
    intLabel = config.extLabelBottom || "EXTERIOR";
    extFill = "url(#amb-int)";
    intFill = config.extFill || "url(#amb-ext)";
    extColor = "#15803d";
    intColor = config.extColor || "#1e40af";
  } else if (config.layout === "slab_both_int") {
    extLabel = config.intLabelTop || "INTERIOR (etaj sup.)";
    intLabel = config.intLabelBottom || "INTERIOR (etaj inf.)";
    extFill = "url(#amb-int)";
    intFill = "url(#amb-int)";
    extColor = "#15803d";
    intColor = "#15803d";
  } else {
    // slab_top_ext (PT/PP/SE) — EXT sus, INT jos
    extLabel = config.extLabel || "EXTERIOR";
    intLabel = config.intLabel || "INTERIOR";
    extFill = config.extFill || "url(#amb-ext)";
    intFill = "url(#amb-int)";
    extColor = config.extColor || "#1e40af";
    intColor = "#15803d";
  }

  return (
    <SectionFrame
      width={width}
      height={height}
      orientation="vertical"
      extLabel={extLabel}
      intLabel={intLabel}
      extFill={extFill}
      intFill={intFill}
      extColor={extColor}
      intColor={intColor}
      padTop={compact ? 18 : 24}
      padBottom={compact ? 24 : 40}
      padLeft={compact ? 0 : 60}
      padRight={compact ? 0 : 60}
    >
      {/* Straturi ca rânduri */}
      {displayLayers.map((l, i) => (
        <MaterialLayer key={i} x={0} y={yStarts[i]} width={width} height={drawHeights[i]} category={l.category} name={l.name} />
      ))}

      {/* Textele denumirilor straturilor sunt mutate în lista HTML de sub SVG */}

      {/* Numere index strat (1, 2, 3...) — badge mic în partea dreaptă a fiecărui rând */}
      {!compact && displayLayers.map((l, i) => {
        const h = drawHeights[i];
        const yc = yStarts[i] + h / 2;
        if (h < 14) return null;
        const idx = i + 1; // mereu 1 = sus (INT pentru PB/PL, EXT pentru PT/PP)
        return (
          <g key={`idx-${i}`} style={{ pointerEvents: "none" }}>
            <circle cx={width - 14} cy={yc} r="7" fill="#1e293b" stroke="white" strokeWidth="1" />
            <text x={width - 14} y={yc + 3} fontSize="8" fill="white" textAnchor="middle" fontWeight="800">{idx}</text>
          </g>
        );
      })}

      {/* R% per strat — badge stânga */}
      {!compact && displayLayers.map((l, i) => {
        const h = drawHeights[i];
        const yc = yStarts[i] + h / 2;
        if (h < 22) return null;
        // mapare displayLayers index → rLayers index original
        const origIdx = reversed ? (displayLayers.length - 1 - i) : i;
        const rPct = rTotal > 0 ? (rLayers[origIdx] / rTotal) * 100 : 0;
        return (
          <g key={`r-${i}`} style={{ pointerEvents: "none" }}>
            <rect x={6} y={yc - 5} width="38" height="11" rx="2" fill="rgba(15,23,42,0.85)" />
            <text x={25} y={yc + 3} fontSize="7.5" fill="#fbbf24" textAnchor="middle" fontWeight="700" fontFamily="monospace">R {rPct.toFixed(0)}%</text>
          </g>
        );
      })}

      {/* Cote grosimi în stânga */}
      {showDimensions && !compact && displayLayers.map((l, i) => (
        <DimensionCote key={`dim-${i}`} x1={-8} y1={yStarts[i]} x2={-8} y2={yStarts[i + 1]} label={`${l.thickness}`} offset={-10} orientation="v" />
      ))}

      {/* Săgeată flux termic vertical */}
      {!compact && config.layout !== "slab_both_int" && (
        <g>
          {reversed ? (
            // Flux de la INT (sus) spre EXT (jos)
            <>
              <line x1={width + 20} y1={10} x2={width + 20} y2={height - 10} stroke="#ef4444" strokeWidth="1.8" markerEnd="url(#sec-arrow-heat)" opacity="0.9" />
              <text x={width + 30} y={height / 2} fontSize="8" fill="#b91c1c" fontWeight="700" stroke="white" strokeWidth="3" paintOrder="stroke" transform={`rotate(-90 ${width + 30} ${height / 2})`}>Flux termic ↓ (iarnă)</text>
            </>
          ) : (
            // Flux de la INT (jos) spre EXT (sus)
            <>
              <line x1={width + 20} y1={height - 10} x2={width + 20} y2={10} stroke="#ef4444" strokeWidth="1.8" markerEnd="url(#sec-arrow-heat)" opacity="0.9" />
              <text x={width + 30} y={height / 2} fontSize="8" fill="#b91c1c" fontWeight="700" stroke="white" strokeWidth="3" paintOrder="stroke" transform={`rotate(-90 ${width + 30} ${height / 2})`}>Flux termic ↑ (iarnă)</text>
            </>
          )}
        </g>
      )}

      {/* Profil T orizontal cu gradient cromatic (albastru→roșu per temperatură) */}
      {tempPoints && (() => {
        const { yPts, tMin, tMax, xLeft, xRight } = tempPoints;
        const tRange  = tMax - tMin || 1;
        const tToX    = (t) => xLeft + ((t - tMin) / tRange) * (xRight - xLeft);
        const tempHsl = (t) => {
          const f = Math.max(0, Math.min(1, (t - tMin) / tRange));
          return `hsl(${(240 - 240 * f).toFixed(0)},78%,48%)`;
        };
        const path = yPts.map((p, i) => (i === 0 ? "M" : "L") + tToX(p.t).toFixed(1) + "," + p.y.toFixed(1)).join(" ");

        // Gradient vertical (Y-based) pentru linia termică verticală a planșeului
        const gradId = "slab-temp-line-grad";

        // Etichete T: alternare stânga/dreapta, filtrând duplicatele (ΔT < 0.3°)
        const LBL_W = 40, LBL_H = 18;
        const tLabels = [];
        let lastLabelT = null;
        yPts.forEach((p) => {
          if (lastLabelT !== null && Math.abs(p.t - lastLabelT) < 0.3) return;
          const px   = tToX(p.t);
          const side = tLabels.length % 2 === 0 ? "left" : "right";
          const lx   = side === "left"
            ? Math.max(2, px - LBL_W - 6)
            : Math.min(width - LBL_W - 2, px + 6);
          tLabels.push({ px, py: p.y, lx, ly: p.y - LBL_H / 2, side, t: p.t });
          lastLabelT = p.t;
        });

        // Coliziune Y pe aceeași latură: împinge în jos dacă se suprapun
        for (let i = 0; i < tLabels.length - 1; i++) {
          const a = tLabels[i], b = tLabels[i + 1];
          if (a.side === b.side) {
            const yOver = Math.min(a.ly + LBL_H, b.ly + LBL_H) - Math.max(a.ly, b.ly);
            if (yOver > 0) b.ly += yOver + 2;
          }
        }

        return (
          <g style={{ pointerEvents: "none" }}>
            <defs>
              {/* Gradient vertical: top=EXT-side, bottom=INT-side pentru slab reversed */}
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2={height}
                              gradientUnits="userSpaceOnUse">
                {yPts.map((p, i) => (
                  <stop key={i}
                    offset={`${(p.y / height * 100).toFixed(1)}%`}
                    stopColor={tempHsl(p.t)} />
                ))}
              </linearGradient>
            </defs>
            {/* Shadow */}
            <path d={path} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="5" strokeLinejoin="round" />
            {/* Linia principală cu gradient */}
            <path d={path} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinejoin="round" opacity="0.95" />

            {/* Etichete T alternante stânga/dreapta */}
            {tLabels.map(({ px, py, lx, ly, side, t }, i) => {
              const color   = tempHsl(t);
              const leaderX = side === "left" ? lx + LBL_W : lx;
              return (
                <g key={i}>
                  <circle cx={px} cy={py} r="3.5" fill={color} stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
                  <line x1={px} y1={py} x2={leaderX} y2={ly + LBL_H / 2}
                        stroke={color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6" />
                  <rect x={lx} y={ly} width={LBL_W} height={LBL_H} rx="3"
                        fill="rgba(255,255,255,0.97)" stroke={color} strokeWidth="0.8" />
                  <text x={lx + LBL_W / 2} y={ly + LBL_H - 5} fontSize="9.5" fill={color}
                        textAnchor="middle" fontWeight="700">{t.toFixed(1)}°</text>
                </g>
              );
            })}

            {!compact && (
              <g>
                <rect x="4" y={height - 28} width="130" height="24" fill="rgba(255,255,255,0.95)" rx="3"
                      stroke="rgba(180,0,0,0.25)" strokeWidth="0.5" />
                <circle cx="12" cy={height - 16} r="3" fill={tempHsl(yPts[0].t)} />
                <text x="18" y={height - 13.5} fontSize="8" fill="#7f1d1d" fontWeight="700">
                  T({tInt}° → {climate?.theta_e}°) iarnă
                </text>
              </g>
            )}
          </g>
        );
      })()}
    </SectionFrame>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className={`p-2 rounded-lg ${accent ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.03]"}`}>
      <div className={`font-mono font-bold ${accent ? "text-amber-400" : ""}`}>{value}</div>
      <div className="text-[9px] opacity-65 mt-0.5">{label}</div>
    </div>
  );
}
