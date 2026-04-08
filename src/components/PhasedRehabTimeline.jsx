/**
 * PhasedRehabTimeline — Timeline vizual reabilitare etapizată multi-an
 * Pct. 70 — Integrează phased-rehab.js
 * Props: { measures, building, instSummary, onClose }
 */
import { useState, useMemo, useCallback } from "react";
import { calcPhasedRehabPlan, PHASING_STRATEGIES } from "../calc/phased-rehab.js";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";

// ──────────────────────────────────────────────
// Constante UI
// ──────────────────────────────────────────────
const CLASS_COLORS_BG = {
  "A+": "#00A550", "A": "#4CB848", "B": "#BDD630",
  "C": "#FFF200", "D": "#FDB913", "E": "#F37021",
  "F": "#ED1C24", "G": "#B31217",
};
const CLASS_TEXT_DARK = new Set(["B", "C"]);

const STRATEGY_ICONS = {
  quick_wins:     "⚡",
  envelope_first: "🧱",
  systems_first:  "⚙️",
  balanced:       "⚖️",
};

// ──────────────────────────────────────────────
// Sub-componente
// ──────────────────────────────────────────────
function ClassBadge({ cls, size = "sm" }) {
  const bg  = CLASS_COLORS_BG[cls] || "#666";
  const dark = CLASS_TEXT_DARK.has(cls);
  const dim  = size === "lg" ? "w-9 h-9 text-sm" : size === "xs" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs";
  return (
    <span style={{ background: bg, color: dark ? "#222" : "#fff" }}
      className={`inline-flex items-center justify-center rounded-lg font-bold flex-shrink-0 ${dim}`}>
      {cls}
    </span>
  );
}

function InputGroup({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/25">{hint}</p>}
    </div>
  );
}

// ── Grafic EP trajectory (SVG inline)
function EPTrajectoryChart({ epTrajectory, nzebThreshold, classTrajectory }) {
  if (!epTrajectory || epTrajectory.length < 2) return null;

  const W = 560, H = 140;
  const PAD = { top: 16, right: 20, bottom: 36, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxEP = Math.max(...epTrajectory, nzebThreshold * 1.1);
  const minEP = 0;
  const scaleY = (v) => PAD.top + chartH - ((v - minEP) / (maxEP - minEP)) * chartH;
  const scaleX = (i) => PAD.left + (i / (epTrajectory.length - 1)) * chartW;

  const points = epTrajectory.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");

  // Gradient fill
  const fillPoints = `${scaleX(0)},${scaleY(0)} ${points} ${scaleX(epTrajectory.length - 1)},${scaleY(0)}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 260 }}>
        {/* Grid linii orizontale */}
        {[0, 25, 50, 75, 100].map(pct => {
          const v = minEP + (maxEP - minEP) * pct / 100;
          const y = scaleY(v);
          return (
            <g key={pct}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#ffffff10" strokeWidth={1} />
              <text x={PAD.left - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#ffffff40">{Math.round(v)}</text>
            </g>
          );
        })}

        {/* Linie nZEB */}
        {nzebThreshold && (
          <g>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={scaleY(nzebThreshold)} y2={scaleY(nzebThreshold)}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,4"
            />
            <text x={W - PAD.right + 2} y={scaleY(nzebThreshold) + 4} fontSize={8} fill="#f59e0b80">nZEB</text>
          </g>
        )}

        {/* Fill area */}
        <polygon points={fillPoints} fill="#f59e0b" fillOpacity={0.07} />

        {/* Linie EP */}
        <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Puncte + clase */}
        {epTrajectory.map((v, i) => {
          const x = scaleX(i);
          const y = scaleY(v);
          const cls = classTrajectory?.[i];
          const bg = CLASS_COLORS_BG[cls] || "#666";
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={5} fill={bg} stroke="#0d0f1a" strokeWidth={1.5} />
              {/* Label an */}
              <text x={x} y={H - PAD.bottom + 12} textAnchor="middle" fontSize={9} fill="#ffffff50">
                {i === 0 ? "Acum" : `An ${i}`}
              </text>
              {/* Valoare EP */}
              <text x={x} y={y - 9} textAnchor="middle" fontSize={8} fill="#ffffff60">
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {/* Axă Y label */}
        <text
          transform={`translate(12, ${H / 2}) rotate(-90)`}
          textAnchor="middle" fontSize={9} fill="#ffffff30"
        >
          EP [kWh/(m²·an)]
        </text>
      </svg>
    </div>
  );
}

// ── Timeline coloane (faze pe ani)
function PhasesTimeline({ phases, epInitial }) {
  if (!phases || phases.length === 0) return (
    <div className="rounded-xl border border-white/10 p-4 text-center text-xs text-white/30">
      Nicio fază calculată. Verificați măsurile și bugetul.
    </div>
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: `${Math.max(phases.length * 180, 400)}px` }}>
        {/* Coloana stare inițială */}
        <div className="flex-shrink-0 w-40 rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Stare inițială</div>
          <ClassBadge cls={phases[0]?.class_after ? /* class before phase 1 */ "—" : "—"} size="lg" />
          <div className="font-mono text-xs text-white/40">{Math.round(epInitial)} kWh/m²</div>
          <div className="text-[10px] text-white/25">Buget disponibil</div>
        </div>

        {/* Faze */}
        {phases.map((phase, idx) => (
          <div key={idx} className="flex-shrink-0 w-44 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-amber-400/60 font-semibold">Anul {phase.year}</span>
              <ClassBadge cls={phase.class_after} size="sm" />
            </div>

            {/* Chip-uri măsuri */}
            <div className="flex flex-col gap-1 flex-1">
              {phase.measures.map((m, mi) => (
                <div key={mi} className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 leading-tight text-white/65">
                  {m.name || m.id}
                  {m.ep_reduction_kWh_m2 > 0 && (
                    <span className="text-green-400/70 ml-1">−{Math.round(m.ep_reduction_kWh_m2)}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Stats fază */}
            <div className="border-t border-white/10 pt-2 space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-white/30">Cost:</span>
                <span className="text-white/60 font-mono">{(phase.phaseCost_RON / 1000).toFixed(0)}k RON</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/30">EP după:</span>
                <span className="text-amber-400 font-mono">{phase.ep_after} kWh/m²</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/30">Economie/an:</span>
                <span className="text-green-400 font-mono">{(phase.annualSaving_RON / 1000).toFixed(1)}k RON</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Componenta principală
// ──────────────────────────────────────────────
export default function PhasedRehabTimeline({ measures = [], building, instSummary, onClose }) {
  const [annualBudget, setAnnualBudget] = useState(50000);
  const [strategy, setStrategy]         = useState("balanced");
  const [energyPrice, setEnergyPrice]   = useState(0.40);
  const [exporting, setExporting]       = useState(false);

  const epInitial     = instSummary?.ep_total_m2 || 200;
  const category      = building?.category || "AL";
  const areaUseful    = parseFloat(building?.areaUseful) || 100;
  const nzebThreshold = NZEB_THRESHOLDS[category]?.ep_max?.[2] || 99;

  const plan = useMemo(() => {
    if (!measures || measures.length === 0) return null;
    return calcPhasedRehabPlan(
      measures, annualBudget, strategy, epInitial,
      category, areaUseful, energyPrice
    );
  }, [measures, annualBudget, strategy, epInitial, category, areaUseful, energyPrice]);

  // Export PDF (async jsPDF)
  const handleExportPDF = useCallback(async () => {
    if (!plan) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(16);
      doc.setTextColor(30, 30, 50);
      doc.text("Plan de Reabilitare Etapizată", 20, 20);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 100);
      doc.text(`Clădire: ${building?.name || "—"}  |  Suprafață: ${areaUseful} m²  |  Categorie: ${category}`, 20, 30);
      doc.text(`Strategie: ${PHASING_STRATEGIES[strategy]}  |  Buget anual: ${annualBudget.toLocaleString("ro-RO")} RON`, 20, 36);

      doc.setFontSize(12);
      doc.setTextColor(30, 30, 50);
      doc.text("Rezumat", 20, 46);

      const summary = plan.summary;
      const rows = [
        ["EP inițial", `${summary.ep_initial} kWh/(m²·an)`, "Clasă inițială", summary.class_initial],
        ["EP final", `${summary.ep_final} kWh/(m²·an)`, "Clasă finală", summary.class_final],
        ["Reducere EP", `${summary.ep_reduction_pct}%`, "nZEB atins", summary.nzeb_reached ? "DA" : "Nu"],
        ["Cost total", `${plan.totalCost_RON.toLocaleString("ro-RO")} RON`, "Economii cumulative", `${plan.cumulativeSavings_RON.toLocaleString("ro-RO")} RON`],
        ["NPV", `${plan.npv.toLocaleString("ro-RO")} RON`, "Ani implementare", `${plan.totalYears} ani`],
      ];

      let y = 54;
      doc.setFontSize(9);
      rows.forEach(([k1, v1, k2, v2]) => {
        doc.setTextColor(100, 100, 120); doc.text(k1 + ":", 20, y);
        doc.setTextColor(30, 30, 50);   doc.text(String(v1), 60, y);
        doc.setTextColor(100, 100, 120); doc.text(k2 + ":", 110, y);
        doc.setTextColor(30, 30, 50);   doc.text(String(v2), 150, y);
        y += 7;
      });

      y += 6;
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 50);
      doc.text("Faze de implementare", 20, y);
      y += 8;

      plan.phases.forEach((phase, i) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setTextColor(245, 158, 11);
        doc.text(`Faza ${i + 1} — Anul ${phase.year}  (Clasă după: ${phase.class_after})`, 20, y);
        y += 5;
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 80);
        phase.measures.forEach(m => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`  • ${m.name || m.id} — reducere ${m.ep_reduction_kWh_m2 || 0} kWh/(m²·an) — ${(m.cost_RON || 0).toLocaleString("ro-RO")} RON`, 22, y);
          y += 5;
        });
        doc.setTextColor(100, 100, 120);
        doc.text(`    Cost fază: ${phase.phaseCost_RON.toLocaleString("ro-RO")} RON  |  EP după: ${phase.ep_after} kWh/m²  |  Economie anuală: ${phase.annualSaving_RON.toLocaleString("ro-RO")} RON/an`, 22, y);
        y += 8;
      });

      if (plan.unscheduledMeasures.length > 0) {
        if (y > 255) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setTextColor(239, 68, 68);
        doc.text(`Măsuri nealocate (buget insuficient): ${plan.unscheduledMeasures.length}`, 20, y);
        y += 6;
        doc.setFontSize(8.5);
        doc.setTextColor(120, 80, 80);
        plan.unscheduledMeasures.forEach(m => {
          doc.text(`  • ${m.name || m.id} — ${(m.cost_RON || 0).toLocaleString("ro-RO")} RON`, 22, y);
          y += 5;
        });
      }

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")} | Zephren Energy Calculator v3.4 | Mc 001-2022`, 20, 290);

      doc.save(`plan_reabilitare_etapizata_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Export PDF eșuat:", err);
    } finally {
      setExporting(false);
    }
  }, [plan, building, areaUseful, category, strategy, annualBudget]);

  const hasMeasures = measures && measures.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white/90">Plan de Reabilitare Etapizată</h2>
            <p className="text-[11px] text-white/35 mt-0.5">
              {hasMeasures ? `${measures.length} măsuri disponibile` : "Nicio măsură disponibilă — generați recomandări Smart Rehab"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {plan && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50"
              >
                {exporting ? "Export..." : "PDF ↓"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all flex items-center justify-center text-lg"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Configurare */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputGroup label="Buget anual (RON)" hint="Suma disponibilă per an">
              <div className="flex items-center gap-2">
                <input
                  type="number" min={5000} max={5000000} step={5000}
                  value={annualBudget}
                  onChange={e => setAnnualBudget(Math.max(1000, parseInt(e.target.value) || 50000))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </InputGroup>

            <InputGroup label="Preț energie (RON/kWh)" hint="Estimare cost energie termică">
              <input
                type="number" min={0.05} max={5} step={0.05}
                value={energyPrice}
                onChange={e => setEnergyPrice(Math.max(0.05, parseFloat(e.target.value) || 0.40))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 font-mono focus:outline-none focus:border-amber-500/50"
              />
            </InputGroup>

            <InputGroup label="Strategie prioritizare">
              <select
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-amber-500/50"
              >
                {Object.entries(PHASING_STRATEGIES).map(([k, label]) => (
                  <option key={k} value={k}>{STRATEGY_ICONS[k]} {label}</option>
                ))}
              </select>
            </InputGroup>
          </div>

          {!hasMeasures && (
            <div className="rounded-xl border border-white/10 bg-amber-500/5 p-6 text-center">
              <p className="text-sm text-white/40">Adăugați măsuri de reabilitare pentru a genera planul etapizat.</p>
              <p className="text-[11px] text-white/25 mt-1">Folosiți modulul Smart Rehab pentru recomandări automate.</p>
            </div>
          )}

          {plan && (
            <>
              {/* KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Reducere EP", value: `${plan.summary.ep_reduction_pct}%`, sub: `${plan.summary.ep_initial} → ${plan.summary.ep_final} kWh/m²`, color: "text-green-400" },
                  { label: "Clase", value: `${plan.summary.class_initial} → ${plan.summary.class_final}`, sub: plan.summary.nzeb_reached ? "nZEB atins ✓" : `nZEB la ${nzebThreshold} kWh/m²`, color: plan.summary.nzeb_reached ? "text-green-400" : "text-amber-400" },
                  { label: "Cost total", value: `${(plan.totalCost_RON / 1000).toFixed(0)}k RON`, sub: `${plan.totalYears} ani`, color: "text-white/80" },
                  { label: "NPV", value: `${plan.npv >= 0 ? "+" : ""}${(plan.npv / 1000).toFixed(0)}k RON`, sub: "Valoare netă prezentă", color: plan.npv >= 0 ? "text-green-400" : "text-red-400" },
                ].map((kpi, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{kpi.label}</div>
                    <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                    <div className="text-[10px] text-white/35 mt-0.5">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* EP Trajectory Chart */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                  Evoluție EP — kWh/(m²·an) per an
                </h3>
                <EPTrajectoryChart
                  epTrajectory={plan.epTrajectory}
                  nzebThreshold={nzebThreshold}
                  classTrajectory={plan.classTrajectory}
                />
              </div>

              {/* Clasă per an — badges */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                  Evoluție clasă energetică
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {plan.classTrajectory.map((cls, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <ClassBadge cls={cls} size={i === plan.classTrajectory.length - 1 ? "lg" : "sm"} />
                      <span className="text-[10px] text-white/30">{i === 0 ? "Azi" : `An ${i}`}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline faze */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                  Timeline implementare — {plan.phases.length} faze / {plan.totalYears} ani
                </h3>
                <PhasesTimeline phases={plan.phases} epInitial={epInitial} />
              </div>

              {/* Măsuri nealocate */}
              {plan.unscheduledMeasures.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-red-400/60 font-semibold mb-2">
                    Măsuri nealocate ({plan.unscheduledMeasures.length}) — buget insuficient
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {plan.unscheduledMeasures.map((m, i) => (
                      <div key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300/70">
                        {m.name || m.id} — {((m.cost_RON || 0) / 1000).toFixed(0)}k RON
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-red-400/40 mt-2">
                    Creșteți bugetul anual sau extindeți perioada de analiză pentru a include aceste măsuri.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
