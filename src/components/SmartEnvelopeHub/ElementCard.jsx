/**
 * ElementCard — cartela compactă pentru un element opac SAU vitrat (S4).
 *
 * Înlocuiește rând-ul de listă din grid-ul legacy al Step2Envelope (liniile 104-220).
 * Status U se calculează live prin `calcOpaqueR` (opace) sau direct din `el.u` (vitrate).
 *
 * Props:
 *   - element            : obiect opaqueElement SAU glazingElement
 *   - index              : poziția în array (pentru edit/delete)
 *   - kind               : "opaque" | "glazing"
 *   - buildingCategory   : pt. U_REF lookup
 *   - calcOpaqueR        : doar pt. kind="opaque" (calcul U live)
 *   - ELEMENT_TYPES      : doar pt. kind="opaque" (label lookup)
 *   - onEdit(element, idx)
 *   - onDelete(idx)
 */

import { cn } from "../ui.jsx";

// ── U_REF tables — consistent cu OpaqueModal/GlazingModal ────────────────────
const U_REF_NZEB_RES  = { PE: 0.25, PR: 0.67, PS: 0.29, PT: 0.15, PP: 0.15, PB: 0.29, PL: 0.20, SE: 0.20, PI: null };
const U_REF_NZEB_NRES = { PE: 0.33, PR: 0.80, PS: 0.35, PT: 0.17, PP: 0.17, PB: 0.35, PL: 0.22, SE: 0.22, PI: null };
const U_REF_GLAZING_RES  = 1.11;
const U_REF_GLAZING_NRES = 1.20;

function getURefOpaque(category, type) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[type] ?? null;
}

function getURefGlazing(category) {
  return ["RI", "RC", "RA"].includes(category) ? U_REF_GLAZING_RES : U_REF_GLAZING_NRES;
}

function getStatus(u, uRef) {
  if (!Number.isFinite(u) || u <= 0 || !uRef) return null;
  if (u <= uRef)        return "ok";
  if (u <= uRef * 1.3)  return "warn";
  return "fail";
}

const STATUS_CLASS = {
  ok:   "text-emerald-400",
  warn: "text-amber-400",
  fail: "text-red-400",
};

const STATUS_ICON = {
  ok:   "✓",
  warn: "⚠",
  fail: "✗",
};

export default function ElementCard({
  element,
  index,
  kind,
  buildingCategory,
  calcOpaqueR,
  ELEMENT_TYPES = [],
  onEdit,
  onDelete,
}) {
  // ── Calcul U (opaque: live, glazing: direct) ───────────────────────────────
  let u = 0;
  let uRef = null;

  if (kind === "opaque") {
    if (calcOpaqueR) {
      try {
        const r = calcOpaqueR(element.layers, element.type) || {};
        u = r.u || 0;
      } catch { u = 0; }
    }
    uRef = getURefOpaque(buildingCategory, element.type);
  } else {
    u = parseFloat(element.u) || 0;
    uRef = getURefGlazing(buildingCategory);
  }

  const status = getStatus(u, uRef);
  const area = parseFloat(element.area) || 0;

  // ── Subtitle (meta) ────────────────────────────────────────────────────────
  let subtitle = "";
  if (kind === "opaque") {
    const elType = ELEMENT_TYPES.find(t => t.id === element.type);
    const layerCount = element.layers?.length || 0;
    subtitle = `${elType?.label || element.type} · ${element.orientation || "—"} · ${layerCount} straturi`;
  } else {
    subtitle = `${element.glazingType || ""} · ${element.frameType || ""} · ${element.orientation || ""}`.replace(/^ · /, "").replace(/ · $/, "");
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-white/10 transition-colors">
      {/* Left: status + name + meta */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("text-sm shrink-0", status && STATUS_CLASS[status])}>
          {status ? STATUS_ICON[status] : "·"}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{element.name}</div>
          <div className="text-[10px] opacity-40 truncate">{subtitle}</div>
        </div>
      </div>

      {/* Right: area + U + actions */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-xs font-mono">{area.toFixed(1)} m²</div>
          <div className={cn(
            "text-xs font-mono font-medium",
            status ? STATUS_CLASS[status] : "opacity-50"
          )}>
            U = {u > 0 ? u.toFixed(kind === "opaque" ? 3 : 2) : "—"}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit?.(element, index)}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label={`Editează ${element.name}`}
          >✎</button>
          <button
            onClick={() => onDelete?.(index)}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            aria-label={`Șterge ${element.name}`}
          >✕</button>
        </div>
      </div>
    </div>
  );
}
