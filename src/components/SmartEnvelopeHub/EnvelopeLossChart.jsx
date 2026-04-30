/**
 * EnvelopeLossChart — grafic radial (pie) de distribuție a pierderilor termice.
 *
 * Extras din Step2Envelope.jsx:232-258 (comportament păstrat identic).
 * Afișează 4 felii:
 *   - Roșu (#ef4444)  : pierderi opace   — Σ τ·A·U
 *   - Albastru (#3b82f6): pierderi vitraje — Σ A·U
 *   - Portocaliu (#f97316): pierderi punți  — din envelopeSummary.bridgeLoss
 *   - Violet (#8b5cf6): pierderi ventilare — din envelopeSummary.ventLoss
 *
 * Feliile cu procent < 1% sunt sărite (doar avansare unghi cumulativ).
 * Hole central negru (r=16) creează efect donut.
 *
 * Props:
 *   opaqueElements   - Array<{layers, type, area}>
 *   glazingElements  - Array<{area, u}>
 *   envelopeSummary  - {bridgeLoss, ventLoss}
 *   calcOpaqueR      - (layers, type) => {u, r}
 *   ELEMENT_TYPES    - Array<{id, tau}> (tau = factor corecție τ)
 *   lang             - "RO" | "EN"
 *   t                - Traducător (key, lang) => string
 *   size             - "sm" (80px, default) sau "md" (120px)
 */

const COLORS = {
  opaque:  "#ef4444",
  glazing: "#3b82f6",
  bridge:  "#f97316",
  vent:    "#8b5cf6",
};

const LEGEND = [
  { key: "opaque",  label: "Opace" },
  { key: "glazing", label: "Vitraje" },
  { key: "bridge",  label: "Punți" },
  { key: "vent",    label: "Ventilare" },
];

export default function EnvelopeLossChart({
  opaqueElements = [],
  glazingElements = [],
  envelopeSummary,
  calcOpaqueR,
  ELEMENT_TYPES = [],
  lang = "RO",
  t = (key) => key,
  size = "sm",
}) {
  if (!envelopeSummary) return null;

  // ── Calcul pierderi pe cele 4 categorii (aceeași formulă ca în Step2Envelope) ─
  const opaqueLoss = opaqueElements.reduce((sum, el) => {
    const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : { u: 0 };
    const elType = ELEMENT_TYPES.find(x => x.id === el.type) || {};
    const tau = elType.tau ?? 1;
    return sum + tau * (parseFloat(el.area) || 0) * (r.u || 0);
  }, 0);

  const glazingLoss = glazingElements.reduce((sum, el) => {
    return sum + (parseFloat(el.area) || 0) * (parseFloat(el.u) || 0);
  }, 0);

  const bridgeLoss = envelopeSummary.bridgeLoss || 0;
  const ventLoss = envelopeSummary.ventLoss || 0;

  const slices = [
    { v: opaqueLoss,  c: COLORS.opaque  },
    { v: glazingLoss, c: COLORS.glazing },
    { v: bridgeLoss,  c: COLORS.bridge  },
    { v: ventLoss,    c: COLORS.vent    },
  ];

  const total = slices.reduce((s, it) => s + it.v, 0);

  // ── Dimensiuni SVG ──────────────────────────────────────────────────────────
  const dim = size === "md"
    ? { px: 120, cx: 60, cy: 60, r: 52, hole: 22 }
    : { px: 80,  cx: 45, cy: 45, r: 38, hole: 16 };

  // ── Render SVG (aceeași logică ca în Step2Envelope.jsx original) ────────────
  const paths = [];
  if (total > 0) {
    let cumAngle = 0;
    slices.forEach((it, idx) => {
      const pct = it.v / total;
      const ang = pct * 360;
      if (pct < 0.01) {
        cumAngle += ang;
        return;
      }
      const a1 = (cumAngle - 90) * Math.PI / 180;
      const a2 = (cumAngle + ang - 90) * Math.PI / 180;
      const x1 = dim.cx + dim.r * Math.cos(a1);
      const y1 = dim.cy + dim.r * Math.sin(a1);
      const x2 = dim.cx + dim.r * Math.cos(a2);
      const y2 = dim.cy + dim.r * Math.sin(a2);
      const largeArc = ang > 180 ? 1 : 0;
      const d = `M${dim.cx},${dim.cy} L${x1},${y1} A${dim.r},${dim.r} 0 ${largeArc},1 ${x2},${y2} Z`;
      paths.push(
        <path key={idx} d={d} fill={it.c} opacity="0.75" />
      );
      cumAngle += ang;
    });
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <svg
        viewBox={`0 0 ${dim.px === 120 ? 120 : 90} ${dim.px === 120 ? 120 : 90}`}
        width={dim.px}
        height={dim.px}
        className="shrink-0"
        aria-label={t("Distribuție pierderi", lang)}
        role="img"
      >
        {total > 0 ? (
          <>
            {paths}
            <circle cx={dim.cx} cy={dim.cy} r={dim.hole} fill="#12141f" />
          </>
        ) : (
          <circle cx={dim.cx} cy={dim.cy} r={dim.r} fill="#1a1d2a" opacity="0.4" />
        )}
      </svg>
      <div className="space-y-1">
        {LEGEND.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[item.key] }}
            />
            <span className="text-[10px] opacity-60">{t(item.label, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
