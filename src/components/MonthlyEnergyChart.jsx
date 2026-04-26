import React, { memo } from "react";

/**
 * MonthlyEnergyChart — Grafic SVG bilanț energetic lunar
 * Afișează necesarul de încălzire și răcire pe luni (kWh/lună)
 * cu temperaturi externe și câștiguri solare.
 *
 * Sprint 19 Performanță — wrapper memo (re-render doar la schimbare monthlyData/Au/lang/theme)
 */
function MonthlyEnergyChartImpl({ monthlyData, Au, lang, theme }) {
  if (!monthlyData || !monthlyData.length) return null;

  const maxHeat = Math.max(...monthlyData.map(d => d.qHeat || 0));
  const maxCool = Math.max(...monthlyData.map(d => d.qCool || 0));
  const maxQ = Math.max(maxHeat, maxCool, 1);
  const hasHeat = maxHeat > 0;
  const hasCool = maxCool > 0;
  if (!hasHeat && !hasCool) return null;

  const W = 540, H = 170;
  const PAD = { t: 14, r: 12, b: 32, l: 48 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const n = monthlyData.length;
  const slotW = chartW / n;
  const barPad = 2;
  const barW = hasCool ? (slotW / 2 - barPad * 2) : (slotW - barPad * 2);

  // Ticks Y
  const nTicks = 4;
  const tickStep = Math.ceil(maxQ / nTicks / 100) * 100 || 50;
  const yMax = tickStep * nTicks;
  const ticks = Array.from({ length: nTicks + 1 }, (_, i) => i * tickStep);

  const yOf = (val) => PAD.t + chartH - (val / yMax) * chartH;
  const xOf = (i) => PAD.l + i * slotW;

  const isLight = theme === "light";
  const textCol = isLight ? "#64748B" : "#9ca3af";
  const gridCol = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)";
  const heatCol = isLight ? "#EA580C" : "#f97316"; // portocaliu — încălzire (mai saturat pe light)
  const coolCol = isLight ? "#0284C7" : "#38bdf8"; // albastru — răcire (mai saturat pe light)
  const lossCol = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)"; // pierderi totale

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Grid linii orizontale */}
        {ticks.map((v) => (
          <line
            key={v}
            x1={PAD.l} x2={PAD.l + chartW}
            y1={yOf(v)} y2={yOf(v)}
            stroke={gridCol} strokeWidth="1"
          />
        ))}

        {/* Etichete Y */}
        {ticks.map((v) => (
          <text
            key={v}
            x={PAD.l - 5} y={yOf(v) + 4}
            textAnchor="end" fontSize="9" fill={textCol}
          >
            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
          </text>
        ))}

        {/* Axă Y — label */}
        <text
          x={10} y={PAD.t + chartH / 2}
          textAnchor="middle" fontSize="8" fill={textCol}
          transform={`rotate(-90, 10, ${PAD.t + chartH / 2})`}
        >
          kWh/lună
        </text>

        {/* Bare per lună */}
        {monthlyData.map((d, i) => {
          const x = xOf(i);
          const cx = x + slotW / 2;

          return (
            <g key={i}>
              {/* Bare încălzire */}
              {hasHeat && d.qHeat > 0 && (
                <rect
                  x={hasCool ? x + barPad : x + barPad}
                  y={yOf(d.qHeat)}
                  width={barW}
                  height={Math.max(1, chartH - (yOf(d.qHeat) - PAD.t))}
                  fill={heatCol}
                  opacity={0.85}
                  rx="1"
                />
              )}
              {/* Bare răcire */}
              {hasCool && d.qCool > 0 && (
                <rect
                  x={x + slotW / 2 + barPad}
                  y={yOf(d.qCool)}
                  width={barW}
                  height={Math.max(1, chartH - (yOf(d.qCool) - PAD.t))}
                  fill={coolCol}
                  opacity={0.85}
                  rx="1"
                />
              )}

              {/* Etichete luni */}
              <text
                x={cx} y={PAD.t + chartH + 14}
                textAnchor="middle" fontSize="9" fill={textCol}
              >
                {d.month}
              </text>

              {/* Temperaturi externe mici */}
              {d.tExt !== undefined && (
                <text
                  x={cx} y={PAD.t + chartH + 24}
                  textAnchor="middle" fontSize="7.5"
                  fill={d.tExt < 0 ? "#60a5fa" : d.tExt > 20 ? "#fbbf24" : textCol}
                >
                  {d.tExt > 0 ? `+${d.tExt.toFixed(0)}` : d.tExt.toFixed(0)}°
                </text>
              )}
            </g>
          );
        })}

        {/* Axă X */}
        <line
          x1={PAD.l} x2={PAD.l + chartW}
          y1={PAD.t + chartH} y2={PAD.t + chartH}
          stroke={isLight ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.15)"} strokeWidth="1"
        />

        {/* Legendă */}
        {hasHeat && (
          <g>
            <rect x={PAD.l + chartW - (hasCool ? 120 : 60)} y={PAD.t} width={10} height={8} fill={heatCol} rx="1" />
            <text x={PAD.l + chartW - (hasCool ? 107 : 47)} y={PAD.t + 8} fontSize="9" fill={textCol}>Încălzire</text>
          </g>
        )}
        {hasCool && (
          <g>
            <rect x={PAD.l + chartW - 55} y={PAD.t} width={10} height={8} fill={coolCol} rx="1" />
            <text x={PAD.l + chartW - 42} y={PAD.t + 8} fontSize="9" fill={textCol}>Răcire</text>
          </g>
        )}
      </svg>

      {/* Totale sub grafic */}
      <div className="flex gap-6 text-xs opacity-50 mt-1 justify-center">
        {hasHeat && (
          <span>
            <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: heatCol }} />
            Încălzire: {monthlyData.reduce((s, d) => s + (d.qHeat || 0), 0).toFixed(0)} kWh/an
            {Au > 0 && ` · ${(monthlyData.reduce((s, d) => s + (d.qHeat || 0), 0) / Au).toFixed(1)} kWh/(m²·an)`}
          </span>
        )}
        {hasCool && (
          <span>
            <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: coolCol }} />
            Răcire: {monthlyData.reduce((s, d) => s + (d.qCool || 0), 0).toFixed(0)} kWh/an
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(MonthlyEnergyChartImpl);
