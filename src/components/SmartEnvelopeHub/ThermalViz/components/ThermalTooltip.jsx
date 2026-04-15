/**
 * ThermalTooltip — overlay floating afișat la hover pe un element/punte.
 * Poziționare urmărește cursorul cu offset; rămâne în cadrul viewport-ului.
 */
import { useEffect, useState } from "react";

export default function ThermalTooltip({ x, y, data }) {
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const offset = 14;
    const tipW = 260;
    const tipH = 140;
    let left = x + offset;
    let top  = y + offset;
    if (left + tipW > window.innerWidth)  left = x - tipW - offset;
    if (top  + tipH > window.innerHeight) top  = y - tipH - offset;
    setPos({ left: Math.max(4, left), top: Math.max(4, top) });
  }, [x, y]);

  if (!data) return null;

  const { title, subtitle, rows, accent = "indigo" } = data;
  const accentClass = {
    indigo:  "border-indigo-400/40 bg-indigo-950/95",
    emerald: "border-emerald-400/40 bg-emerald-950/95",
    amber:   "border-amber-400/40 bg-amber-950/95",
    red:     "border-red-400/40 bg-red-950/95",
  }[accent] || "border-indigo-400/40 bg-indigo-950/95";

  return (
    <div
      role="tooltip"
      className={`pointer-events-none fixed z-[100] min-w-[220px] max-w-[280px] rounded-lg border ${accentClass} backdrop-blur-sm shadow-2xl p-3 text-xs text-white/90`}
      style={{ left: pos.left, top: pos.top }}
    >
      {title && (
        <div className="font-semibold text-sm text-white mb-0.5 truncate">{title}</div>
      )}
      {subtitle && (
        <div className="text-[10px] text-white/60 mb-1.5">{subtitle}</div>
      )}
      {rows && rows.length > 0 && (
        <div className="space-y-0.5 font-mono">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="text-white/60">{r.label}</span>
              <span className={`text-white/95 ${r.highlight ? "font-bold text-amber-300" : ""}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
