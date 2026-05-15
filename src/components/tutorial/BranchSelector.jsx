// ═════════════════════════════════════════════════════════════════════════════
// BranchSelector — permite auditorului să schimbe demo-ul activ (M1-M5)
//
// Conceptul "branching" în tutorial: aceeași secvență de pași, dar conținutul
// se adaptează în funcție de categoria funcțională a clădirii:
//   M1 — RA (apartament bloc)        → limite nZEB diferite, BACS nu se aplică
//   M2 — RI (casă individuală)       → caz standard, toate funcționalitățile
//   M3 — BI (birouri nerezidențial)  → BACS clasa B obligatorie >290 kW
//   M4 — ED (școală nerezidențial)   → MEPS 2030 conform Art. 9.1.b EPBD
//   M5 — RI nou ZEB                  → exemplu „clădire conformă", contrast didactic
// ═════════════════════════════════════════════════════════════════════════════

import { cn } from "../ui.jsx";

export default function BranchSelector({ demoOptions, activeDemo, setActiveDemo }) {
  return (
    <div className="bg-indigo-500/8 border-b border-indigo-500/20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="text-[10px] sm:text-xs text-indigo-300 font-semibold uppercase tracking-widest shrink-0">
            🏢 Demo activ:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {demoOptions.map((d) => {
              const isActive = d.id === activeDemo;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDemo(d.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                    isActive
                      ? "bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/30"
                      : "bg-slate-900/50 text-slate-400 border-slate-700 hover:border-indigo-500/50 hover:text-indigo-300"
                  )}
                  title={d.label}
                >
                  <span className="font-bold mr-1">{d.id}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline ml-1">{d.category} · Zona {d.zone}</span>
                  {d.primary && (
                    <span className="ml-1 px-1 py-0 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                      Recom.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="hidden lg:block text-[10px] text-indigo-300/70 ml-auto">
            Schimbă demo-ul pentru a vedea cum diferă conținutul pe categorie funcțională
          </div>
        </div>
      </div>
    </div>
  );
}
