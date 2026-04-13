import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";
import {
  SRI_DOMAINS,
  SRI_CLASS_LABELS,
  calculateSRI,
  getDefaultSelections,
} from "../calc/sri-indicator.js";

const CLASS_RING = {
  A: "ring-emerald-500/50 text-emerald-400",
  B: "ring-green-500/50 text-green-400",
  C: "ring-yellow-500/50 text-yellow-400",
  D: "ring-orange-500/50 text-orange-400",
  E: "ring-red-500/50 text-red-400",
};

const SCORE_BAR_COLOR = (score) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
};

export default function SRICalculator({ onResult }) {
  const [selections, setSelections] = useState(getDefaultSelections);
  const [expandedDomain, setExpandedDomain] = useState(null);

  const result = useMemo(() => {
    const r = calculateSRI(selections);
    onResult?.(r);
    return r;
  }, [selections, onResult]);

  function handleSelect(serviceId, levelIdx) {
    setSelections(prev => ({ ...prev, [serviceId]: levelIdx }));
  }

  const classInfo = SRI_CLASS_LABELS[result.class] || SRI_CLASS_LABELS.E;

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
        Smart Readiness Indicator (SRI) — Regulament UE 2020/2155
      </h3>

      {/* Scor global + Clasă */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 flex-1">
          <div className={cn("w-20 h-20 rounded-full ring-4 flex items-center justify-center flex-shrink-0",
            CLASS_RING[result.class])}>
            <div className="text-center">
              <div className="text-2xl font-black">{Math.round(result.total)}</div>
              <div className="text-[10px] opacity-60">/ 100</div>
            </div>
          </div>
          <div>
            <div className={cn("text-lg font-bold", `text-${classInfo.color}-400`)}>
              Clasă SRI: {result.class}
            </div>
            <div className="text-sm text-white/60">{classInfo.label}</div>
            <div className="text-xs text-white/30 mt-1">{classInfo.description}</div>
          </div>
        </div>

        {/* Impact pe 3 criterii */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Criterii de impact</div>
          {Object.values(result.impact).map(imp => (
            <div key={imp.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">{imp.name}</span>
                <span className="text-xs font-mono font-semibold text-white/70">{Math.round(imp.score)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", SCORE_BAR_COLOR(imp.score))}
                  style={{ width: `${imp.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recomandare */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3 text-sm text-amber-200/80">
        {result.recommendation}
      </div>

      {/* Evaluare per domeniu */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Evaluare pe domenii tehnice — click pentru detalii
        </div>

        {result.domains.map(domain => {
          const isExpanded = expandedDomain === domain.id;
          const domainDef = SRI_DOMAINS.find(d => d.id === domain.id);

          return (
            <div key={domain.id} className="border border-white/10 rounded-xl overflow-hidden">
              {/* Header domeniu */}
              <button onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/5 transition-colors text-left">
                <span className="text-lg">{domain.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/80">{domain.name}</div>
                  <div className="text-[11px] text-white/30">Pondere: {Math.round(domain.weight * 100)}%</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-300", SCORE_BAR_COLOR(domain.score))}
                      style={{ width: `${domain.score}%` }} />
                  </div>
                  <span className="text-sm font-mono font-semibold text-white/70 w-10 text-right">
                    {Math.round(domain.score)}%
                  </span>
                  <span className={cn("transition-transform", isExpanded ? "rotate-180" : "")}>
                    <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </button>

              {/* Servicii expandate */}
              {isExpanded && domainDef && (
                <div className="border-t border-white/10 bg-white/[0.01] divide-y divide-white/5">
                  {domainDef.services.map(service => {
                    const currentLevel = selections[service.id] ?? 0;
                    return (
                      <div key={service.id} className="px-4 py-3 space-y-2">
                        <div className="text-xs font-semibold text-white/60">{service.id} — {service.name}</div>
                        <div className="space-y-1">
                          {service.levels.map((level, idx) => (
                            <button key={idx} onClick={() => handleSelect(service.id, idx)}
                              className={cn("w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                                currentLevel === idx
                                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                                  : "bg-white/[0.02] border border-transparent text-white/40 hover:bg-white/5 hover:text-white/60")}>
                              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                currentLevel === idx ? "border-amber-500 bg-amber-500" : "border-white/20")}>
                                {currentLevel === idx && (
                                  <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className="flex-1">{level.label}</span>
                              <span className="text-[10px] text-white/20 font-mono">{level.score}%</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/20 text-right">
        SRI conform Regulamentul delegat (UE) 2020/2155 · Metoda B (simplificată) · 9 domenii, 16 servicii ·
        EPBD 2024/1275 Art.13 — obligatoriu nerezidențiale &gt;290 kW
      </p>
    </div>
  );
}
