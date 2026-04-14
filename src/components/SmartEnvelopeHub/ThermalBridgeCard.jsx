/**
 * ThermalBridgeCard — cartela compactă pentru o punte termică (S4).
 *
 * Înlocuiește rând-ul legacy din Step2Envelope grid (liniile 200-218).
 *
 * Props:
 *   - bridge : { name, cat, psi, length }
 *   - index  : poziția în array
 *   - onEdit(bridge, idx)
 *   - onDelete(idx)
 */

export default function ThermalBridgeCard({ bridge, index, onEdit, onDelete }) {
  const psi = parseFloat(bridge.psi) || 0;
  const length = parseFloat(bridge.length) || 0;
  const totalLoss = psi * length;

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-white/10 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{bridge.name}</div>
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
