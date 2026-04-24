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
import { U_REF_GLAZING, getURefNZEB } from "../../data/u-reference.js";

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
  onPreview,
  onDuplicate,
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
    uRef = getURefNZEB(buildingCategory, element.type);
  } else {
    u = parseFloat(element.u) || 0;
    uRef = ["RI", "RC", "RA"].includes(buildingCategory) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
  }

  const status = getStatus(u, uRef);
  const area = parseFloat(element.area) || 0;
  const uExcess = uRef && u > uRef ? ((u / uRef - 1) * 100) : 0;
  const warningText = status === "fail"
    ? `U = ${u.toFixed(3)} W/m²K depășește U'max = ${uRef?.toFixed(3)} cu +${uExcess.toFixed(0)}% (clasă nZEB)`
    : status === "warn"
      ? `U = ${u.toFixed(3)} W/m²K este peste U'max = ${uRef?.toFixed(3)} (toleranță ≤30%)`
      : null;

  // ── Subtitle (meta) ────────────────────────────────────────────────────────
  let subtitle = "";
  if (kind === "opaque") {
    const elType = ELEMENT_TYPES.find(t => t.id === element.type);
    const layerCount = element.layers?.length || 0;
    subtitle = `${elType?.label || element.type} · ${element.orientation || "—"} · ${layerCount} straturi`;
  } else {
    subtitle = `${element.glazingType || ""} · ${element.frameType || ""} · ${element.orientation || ""}`.replace(/^ · /, "").replace(/ · $/, "");
  }

  const clickable = typeof onPreview === "function";

  return (
    <div
      className={cn(
        "bg-white/[0.03] border rounded-lg p-3 flex items-center justify-between group transition-colors",
        status === "fail" ? "border-red-500/30 hover:border-red-500/50 bg-red-500/[0.04]" :
        status === "warn" ? "border-amber-500/25 hover:border-amber-500/40" :
        "border-white/5 hover:border-white/10",
        clickable && "cursor-pointer hover:bg-white/[0.05]"
      )}
      onClick={clickable ? () => onPreview(element, index) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPreview(element, index); } } : undefined}
      aria-label={clickable ? `Vezi secțiunea pentru ${element.name}` : undefined}
      title={warningText || undefined}
    >
      {/* Left: status + name + meta */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("text-sm shrink-0", status && STATUS_CLASS[status])}>
          {status ? STATUS_ICON[status] : "·"}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            <span className="truncate">{element.name}</span>
            {status === "fail" && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0" aria-label="Depășește U'max nZEB">
                ⚠ +{uExcess.toFixed(0)}% U'max
              </span>
            )}
            {status === "warn" && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                ⚠ U'max
              </span>
            )}
          </div>
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
            onClick={(e) => { e.stopPropagation(); onEdit?.(element, index); }}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label={`Editează ${element.name}`}
            title="Editează"
          >✎</button>
          {onDuplicate && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(element, index); }}
              className="text-xs px-2 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
              aria-label={`Duplică ${element.name}`}
              title="Duplică (creează o copie)"
            >⎘</button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(index); }}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            aria-label={`Șterge ${element.name}`}
            title="Șterge"
          >✕</button>
        </div>
      </div>
    </div>
  );
}
