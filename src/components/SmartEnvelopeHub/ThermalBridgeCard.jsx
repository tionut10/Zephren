/**
 * ThermalBridgeCard — cartela compactă pentru o punte termică (S4).
 *
 * Afișează numele, categoria, ψ, lungimea, pierderea totală W/K.
 * Tooltip cu sursa normativă + clasa ISO 14683 (A/B/C/D) din metadate.
 *
 * Props:
 *   - bridge : { name, cat, psi, length }
 *   - index  : poziția în array
 *   - onEdit(bridge, idx)
 *   - onDelete(idx)
 */

import { getBridgeSource, classifyIsoLevel, validatePsiRange } from "../../calc/thermal-bridges-metadata.js";

const ISO_CLASS_COLOR = {
  A: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  B: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  C: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  D: "text-red-400 bg-red-500/15 border-red-500/30",
};

export default function ThermalBridgeCard({ bridge, index, onEdit, onDelete }) {
  const psi = parseFloat(bridge.psi) || 0;
  const length = parseFloat(bridge.length) || 0;
  const totalLoss = psi * length;

  const isoClass = classifyIsoLevel(psi);
  const source = getBridgeSource(bridge.name);
  const validation = validatePsiRange(bridge.name, psi);
  const outOfRange = validation && !validation.inRange;

  const tooltipText = [
    `Sursă: ${source}`,
    `Clasă ISO 14683: ${isoClass}`,
    validation
      ? `Interval tipologie: ψ ∈ [${validation.min}, ${validation.max}] W/(m·K)${outOfRange ? " ⚠ valoare în afara intervalului" : ""}`
      : null,
  ].filter(Boolean).join("\n");

  return (
    <div
      className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-white/10 transition-colors"
      title={tooltipText}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate flex items-center gap-2">
          <span className="truncate">{bridge.name}</span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${ISO_CLASS_COLOR[isoClass]}`}
            aria-label={`Clasă ISO 14683 ${isoClass}`}
          >
            {isoClass}
          </span>
          {outOfRange && (
            <span className="text-[9px] text-red-400" aria-label="Valoare în afara intervalului tipologiei">⚠</span>
          )}
        </div>
        <div className="text-[10px] opacity-40 truncate">
          {bridge.cat || "—"} · Ψ = {psi} W/(m·K)
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-xs font-mono">{length.toFixed(1)} m</div>
          <div className="text-xs font-mono text-orange-400">
            {totalLoss.toFixed(2)} W/K
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit?.(bridge, index)}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label={`Editează ${bridge.name}`}
          >✎</button>
          <button
            onClick={() => onDelete?.(index)}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            aria-label={`Șterge ${bridge.name}`}
          >✕</button>
        </div>
      </div>
    </div>
  );
}
