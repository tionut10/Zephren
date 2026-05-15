// ═════════════════════════════════════════════════════════════════════════════
// TutorialLayout — shell vizual pentru pagina /tutorial
//
// Compoziție:
//   ┌─ Header (logo + titlu + close)
//   ├─ ProgressBar global (8 pași)
//   ├─ DemoSwitcher (M1-M5)
//   ├─ Body
//   │   ├─ Sidebar (8 pași + secțiuni în pasul curent)
//   │   └─ Content (SectionRenderer iterează secțiunile)
//   └─ Footer (Anterior / Următor / Aplică demo)
// ═════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { cn } from "../ui.jsx";
import TutorialSidebar from "./TutorialSidebar.jsx";
import TutorialProgressBar from "./TutorialProgressBar.jsx";
import SectionRenderer from "./SectionRenderer.jsx";
import BranchSelector from "./BranchSelector.jsx";

const COLOR_MAP = {
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   dot: "bg-amber-500",   gradient: "from-amber-500 to-amber-400" },
  sky:     { bg: "bg-sky-500/10",     border: "border-sky-500/30",     text: "text-sky-400",     dot: "bg-sky-500",     gradient: "from-sky-500 to-sky-400" },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  dot: "bg-orange-500",  gradient: "from-orange-500 to-orange-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500", gradient: "from-emerald-500 to-emerald-400" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-400",  dot: "bg-violet-500",  gradient: "from-violet-500 to-violet-400" },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     dot: "bg-red-500",     gradient: "from-red-500 to-red-400" },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  dot: "bg-purple-500",  gradient: "from-purple-500 to-purple-400" },
};

export default function TutorialLayout({
  stepsMeta,
  currentStep,
  stepContent,
  loading,
  activeSection,
  setActiveSection,
  globalProgress,
  demoOptions,
  activeDemo,
  setActiveDemo,
  onGoToStep,
  onNext,
  onPrev,
  onClose,
  onApplyDemo,
}) {
  const meta = stepsMeta.find((s) => s.id === currentStep);
  const c = COLOR_MAP[meta?.color || "amber"];
  const totalSections = stepContent?.sections?.length || 0;

  // Filtrăm secțiunile pe baza demo-ului activ
  // Unele secțiuni au câmpul `applicableDemos: ["M1","M2"]` — afișate doar dacă activeDemo e în listă
  const visibleSections = useMemo(() => {
    if (!stepContent?.sections) return [];
    return stepContent.sections.filter((s) => {
      if (!s.applicableDemos) return true;
      return s.applicableDemos.includes(activeDemo);
    });
  }, [stepContent, activeDemo]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar fix — header + BranchSelector grupate într-un singur container sticky.
          Înălțime totală ~120-128px desktop / ~140px mobile. Folosit ca offset pentru sidebar
          (vezi --topbar-height variabilă CSS de mai jos). */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-slate-950/50">
        <header>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2 group">
              <img src="/logo.svg" alt="Zephren" className="h-7 sm:h-8 w-auto" />
              <span className="hidden sm:inline text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                ← Înapoi la pagina principală
              </span>
            </a>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                  Tutorial complet — flux Zephren
                </div>
                <div className="text-xs text-slate-400">
                  Pas {currentStep} din 8 · {totalSections} secțiuni
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Închide tutorialul"
                title="Esc — Închide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar global */}
          <TutorialProgressBar progress={globalProgress} colorGradient={c.gradient} />
        </header>

        {/* Demo switcher banner — inclus în topbar pentru sticky comun */}
        <BranchSelector
          demoOptions={demoOptions}
          activeDemo={activeDemo}
          setActiveDemo={setActiveDemo}
        />
      </div>

      {/* Main body */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-2 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

          {/* Sidebar — desktop. Sticky cu offset egal cu înălțimea topbar fix (~128px).
              Max-height permite scroll intern dacă sidebar e mai înalt decât viewport
              (8 pași + 21 secțiuni pe ecran scurt). */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-[136px] max-h-[calc(100vh-152px)] overflow-y-auto overflow-x-hidden rounded-2xl">
              <TutorialSidebar
                stepsMeta={stepsMeta}
                currentStep={currentStep}
                sections={visibleSections}
                activeSection={activeSection}
                onGoToStep={onGoToStep}
                onGoToSection={setActiveSection}
                colorMap={COLOR_MAP}
              />
            </div>
          </aside>

          {/* Content area */}
          <main className="flex-1 min-w-0">
            {/* Step header */}
            <div className={cn("rounded-2xl p-4 sm:p-5 mb-4 border", c.bg, c.border)}>
              <div className="flex items-start gap-3">
                <span className="text-3xl sm:text-4xl shrink-0" aria-hidden="true">{meta?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", c.text)}>
                    Pas {currentStep} · {meta?.subtitle}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {meta?.title}
                  </h1>
                  {stepContent?.intro && (
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{stepContent.intro}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile sidebar */}
            <div className="lg:hidden mb-4">
              <TutorialSidebar
                stepsMeta={stepsMeta}
                currentStep={currentStep}
                sections={visibleSections}
                activeSection={activeSection}
                onGoToStep={onGoToStep}
                onGoToSection={setActiveSection}
                colorMap={COLOR_MAP}
                mobile
              />
            </div>

            {/* Sections */}
            {loading && (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <div className="text-center">
                  <div className="inline-block animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mb-3"></div>
                  <div className="text-sm">Se încarcă conținutul pasului {currentStep}...</div>
                </div>
              </div>
            )}

            {!loading && stepContent?.error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
                <div className="font-bold mb-1">Eroare la încărcarea conținutului</div>
                <div className="text-sm">{stepContent.error}</div>
              </div>
            )}

            {!loading && !stepContent?.error && visibleSections.length === 0 && (
              <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 text-slate-400 text-center">
                Nu există secțiuni vizibile pentru demo-ul curent. Schimbă demo-ul sau pasul.
              </div>
            )}

            {!loading && !stepContent?.error && visibleSections.length > 0 && (
              <div className="space-y-4">
                {visibleSections.map((section, idx) => (
                  <SectionRenderer
                    key={section.id || idx}
                    section={section}
                    index={idx}
                    isActive={idx === activeSection}
                    onActivate={() => setActiveSection(idx)}
                    activeDemo={activeDemo}
                    stepColor={meta?.color || "amber"}
                    colorMap={COLOR_MAP}
                  />
                ))}
              </div>
            )}

            {/* Footer navigation */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-5">
              <button
                onClick={onPrev}
                disabled={currentStep === 1}
                className={cn(
                  "w-full sm:w-auto px-4 py-2 rounded-xl font-medium transition-all text-sm",
                  currentStep === 1
                    ? "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                )}
                aria-label="Pas anterior (← săgeată stânga)"
              >
                ← Anterior
              </button>

              <div className="text-[11px] text-slate-500 text-center">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] mr-1">←</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] mr-1">→</kbd>
                navigare ·
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] mx-1">Esc</kbd>
                închidere
              </div>

              {currentStep < 8 ? (
                <button
                  onClick={onNext}
                  className={cn(
                    "w-full sm:w-auto px-5 py-2 rounded-xl font-bold transition-all text-sm bg-gradient-to-r text-slate-900 shadow-lg",
                    c.gradient,
                    "hover:shadow-xl"
                  )}
                  aria-label="Pas următor (→ săgeată dreapta)"
                >
                  Următor →
                </button>
              ) : (
                <button
                  onClick={onApplyDemo}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-900 hover:shadow-xl shadow-lg transition-all text-sm"
                >
                  🎓 Aplică demo {activeDemo} & pornește auditul
                </button>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer info */}
      <footer className="border-t border-slate-800 mt-8 py-4 text-center text-[11px] text-slate-500">
        Tutorial Zephren v1 · Mc 001-2022 · Ord. MDLPA 16/2023 · EPBD 2024/1275/UE ·
        <a href="/" className="text-amber-400 hover:underline ml-1">Înapoi la Zephren</a>
      </footer>
    </div>
  );
}
