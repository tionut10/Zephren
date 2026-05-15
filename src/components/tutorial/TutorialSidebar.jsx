// ═════════════════════════════════════════════════════════════════════════════
// TutorialSidebar — navigare 8 pași + secțiuni în pasul curent
//
// Desktop: sticky vertical bar (264px lățime).
// Mobile: collapsed accordion la top.
// ═════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { cn } from "../ui.jsx";

export default function TutorialSidebar({
  stepsMeta,
  currentStep,
  sections,
  activeSection,
  onGoToStep,
  onGoToSection,
  colorMap,
  mobile = false,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (mobile) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-200">
            📚 Navigare tutorial · Pas {currentStep}/8
          </span>
          <svg
            className={cn("w-4 h-4 transition-transform", mobileOpen && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileOpen && (
          <div className="border-t border-slate-800">
            <SidebarContent
              stepsMeta={stepsMeta}
              currentStep={currentStep}
              sections={sections}
              activeSection={activeSection}
              onGoToStep={(n) => { onGoToStep(n); setMobileOpen(false); }}
              onGoToSection={(idx) => { onGoToSection(idx); setMobileOpen(false); }}
              colorMap={colorMap}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className="rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden">
      <SidebarContent
        stepsMeta={stepsMeta}
        currentStep={currentStep}
        sections={sections}
        activeSection={activeSection}
        onGoToStep={onGoToStep}
        onGoToSection={onGoToSection}
        colorMap={colorMap}
      />
    </nav>
  );
}

function SidebarContent({ stepsMeta, currentStep, sections, activeSection, onGoToStep, onGoToSection, colorMap }) {
  return (
    <div>
      {/* Lista 8 pași */}
      <div className="p-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 py-1.5">
          Pașii fluxului
        </div>
        <div className="flex flex-col gap-0.5">
          {stepsMeta.map((s) => {
            const isActive = s.id === currentStep;
            const isDone = s.id < currentStep;
            const c = colorMap[s.color] || colorMap.amber;
            return (
              <button
                key={s.id}
                onClick={() => onGoToStep(s.id)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-xs",
                  isActive ? cn(c.bg, c.border, "border", c.text, "font-semibold") :
                  isDone   ? "text-emerald-400 hover:bg-emerald-500/10" :
                             "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border",
                    isActive ? cn(c.dot, "border-transparent text-white") :
                    isDone   ? "bg-emerald-600 border-emerald-500 text-white" :
                               "bg-slate-800 border-slate-700 text-slate-500"
                  )}
                >
                  {isDone ? "✓" : s.id}
                </span>
                <span className="flex-1 leading-tight truncate">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secțiunile pasului curent */}
      {sections.length > 0 && (
        <div className="border-t border-slate-800 p-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 py-1.5">
            Secțiuni în pasul {currentStep} ({sections.length})
          </div>
          <div className="flex flex-col gap-0.5 max-h-[40vh] overflow-y-auto pr-1">
            {sections.map((sec, idx) => {
              const isActive = idx === activeSection;
              return (
                <button
                  key={sec.id || idx}
                  onClick={() => {
                    onGoToSection(idx);
                    // Scroll la secțiune dacă există ancoră în DOM
                    const el = document.getElementById(`section-${sec.id || idx}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[11px] leading-tight transition-colors",
                    isActive
                      ? "bg-amber-500/15 text-amber-300 font-medium"
                      : "text-slate-500 hover:bg-slate-800/70 hover:text-slate-300"
                  )}
                  title={sec.title}
                >
                  <span className="text-slate-600 font-mono shrink-0">{(idx + 1).toString().padStart(2, "0")}</span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
