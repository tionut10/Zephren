/**
 * ProjectTimeline — pct. 40
 * Timeline progres audit cu status per pas (complet/incomplet/în lucru)
 */
import { useMemo } from "react";

const STEP_DEFS = [
  { id: 1, label: "Identificare", icon: "🏠", checks: (s) => !!(s.building?.address && s.building?.city && s.building?.areaUseful && s.selectedClimate) },
  { id: 2, label: "Anvelopă", icon: "🧱", checks: (s) => (s.opaqueElements?.length > 0) },
  { id: 3, label: "Sisteme", icon: "⚙️", checks: (s) => !!(s.heating?.source && s.heating.source !== "NONE") },
  { id: 4, label: "Regenerabile", icon: "☀️", checks: (s) => true }, // opțional
  { id: 5, label: "Calcul", icon: "📊", checks: (s) => !!(s.instSummary) },
  { id: 6, label: "Certificat", icon: "📜", checks: (s) => !!(s.auditor?.name && s.auditor?.atestat) },
  { id: 7, label: "Audit", icon: "🔍", checks: (s) => !!(s.instSummary) },
  { id: 8, label: "Avansat", icon: "🔬", checks: (s) => true }, // opțional
];

export default function ProjectTimeline({ state, currentStep, onGoToStep, compact = false }) {
  const stepsStatus = useMemo(() =>
    STEP_DEFS.map(def => ({
      ...def,
      done: def.checks(state),
      active: def.id === currentStep,
    })),
  [state, currentStep]);

  const completedCount = stepsStatus.filter(s => s.done).length;
  const pct = Math.round(completedCount / STEP_DEFS.length * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-0.5">
          {stepsStatus.map(s => (
            <div key={s.id}
              className={`w-2 h-2 rounded-full transition-all ${s.active ? "bg-amber-400 scale-125" : s.done ? "bg-emerald-500" : "bg-white/10"}`}
              title={`Pas ${s.id}: ${s.label} — ${s.done ? "complet" : "incomplet"}`}
            />
          ))}
        </div>
        <span className="opacity-40">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-40">Progres audit</div>
        <div className="text-xs font-bold text-amber-400">{completedCount}/{STEP_DEFS.length} pași ({pct}%)</div>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {stepsStatus.map(s => (
          <button key={s.id}
            onClick={() => onGoToStep?.(s.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
              s.active ? "border-amber-500/40 bg-amber-500/10" :
              s.done ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" :
              "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-lg leading-none">{s.icon}</span>
            <span className={`text-[10px] font-medium ${s.active ? "text-amber-300" : s.done ? "text-emerald-400" : "text-white/30"}`}>
              {s.label}
            </span>
            <span className={`text-[8px] ${s.done ? "text-emerald-400" : "text-white/20"}`}>
              {s.active ? "⬤" : s.done ? "✓" : "○"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
