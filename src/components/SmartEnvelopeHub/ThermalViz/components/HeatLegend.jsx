/**
 * HeatLegend — legendă cromatică pentru vizualizarea termică.
 * Afișează scara gradient continuă sau treptele nZEB, în funcție de `mode`.
 */
import { getContinuousStops, getNZEBSteps, U_MIN, U_MAX } from "../utils/thermalColor.js";

export default function HeatLegend({ mode = "continuous" }) {
  if (mode === "discrete") {
    const steps = getNZEBSteps();
    return (
      <div className="flex flex-col gap-1 text-[10px]">
        <div className="text-white/60 font-semibold uppercase tracking-wider">
          U [W/m²K] — trepte nZEB
        </div>
        <div className="flex flex-col gap-0.5">
          {steps.map((s, i) => {
            const prev = i === 0 ? 0 : steps[i - 1].max;
            const rangeLabel = s.max === Infinity
              ? `> ${prev.toFixed(2)}`
              : `${prev.toFixed(2)} – ${s.max.toFixed(2)}`;
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="inline-block w-5 h-3 rounded-sm border border-white/10"
                  style={{ backgroundColor: s.hex }}
                  aria-hidden="true"
                />
                <span className="text-white/80 font-mono w-20">{rangeLabel}</span>
                <span className="text-white/50">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Gradient continuu
  const stops = getContinuousStops(8);
  const gradientCss = `linear-gradient(to right, ${stops.map(s => `${s.color} ${s.offset}`).join(", ")})`;

  return (
    <div className="flex flex-col gap-1.5 text-[10px]">
      <div className="text-white/60 font-semibold uppercase tracking-wider">
        U [W/m²K] — gradient continuu
      </div>
      <div
        className="h-3 w-full rounded-md border border-white/10 shadow-inner"
        style={{ background: gradientCss }}
        role="img"
        aria-label="Scară cromatică U-value de la albastru (izolat) la roșu (pierdere mare)"
      />
      <div className="flex justify-between font-mono text-white/70">
        <span>❄ {U_MIN.toFixed(2)}</span>
        <span className="text-white/40">{((U_MIN + U_MAX) / 2).toFixed(2)}</span>
        <span>🔥 {U_MAX.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-white/40 text-[9px]">
        <span>izolat</span>
        <span>pierdere mare</span>
      </div>
    </div>
  );
}
