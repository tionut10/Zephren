// ─────────────────────────────────────────────────────────────────────────────
// PhaseHeader.jsx — Divizor vizual de fază pentru Pas 7 Audit (Mc 001-2022)
// Sprint reorg-pas7 (16 mai 2026)
//
// Folosit pentru a marca cele 8 faze logice ale auditului energetic conform
// Mc 001-2022 §11 + Ord. 2237/2010 Anexa 1 + EPBD 2024/1275 Art. 9+12:
//   F1 Diagnostic, F2 Input documentar, F3 Identificare măsuri,
//   F4 Prioritizare, F5 Analiză economică, F6 Roadmap,
//   F7 Conformare, F8 Output export dosar.
//
// API:
//   <PhaseHeader icon="📊" title="F1 · Diagnostic"
//                normative="Mc 001-2022 §8.2 + EN 16247-2"
//                color="amber" hideIfEmpty>
//     {cards…}
//   </PhaseHeader>
//
// Comportament hideIfEmpty (default true): dacă toți copiii sunt
// null/false/undefined (ex. plan IIci fără acces la GradeGate-uri),
// header-ul NU se randează — evităm secțiuni goale orfane.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { cn } from "./ui.jsx";

const COLOR_MAP = {
  amber:   { text: "text-amber-300",   bg: "bg-amber-500/30"   },
  violet:  { text: "text-violet-300",  bg: "bg-violet-500/30"  },
  blue:    { text: "text-blue-300",    bg: "bg-blue-500/30"    },
  emerald: { text: "text-emerald-300", bg: "bg-emerald-500/30" },
  red:     { text: "text-red-300",     bg: "bg-red-500/30"     },
  green:   { text: "text-green-300",   bg: "bg-green-500/30"   },
};

export function PhaseHeader({
  icon,
  title,
  normative,
  color = "amber",
  hideIfEmpty = true,
  children,
}) {
  // Safety: dacă toți copiii sunt null/false/undefined → nu randa nimic.
  // React.Children.toArray filtrează automat null/undefined/false/true.
  if (hideIfEmpty) {
    const visibleChildren = React.Children.toArray(children).filter(Boolean);
    if (visibleChildren.length === 0) return null;
  }

  const c = COLOR_MAP[color] || COLOR_MAP.amber;

  return (
    <>
      <div className="flex items-center gap-3 mt-8 mb-3 first:mt-0">
        <div className={cn("h-px flex-1", c.bg)} />
        <div className="flex items-center gap-2">
          {icon && <span className="text-base leading-none">{icon}</span>}
          <div className={cn("text-[11px] font-bold uppercase tracking-wider", c.text)}>
            {title}
          </div>
          {normative && (
            <span className="text-[9px] opacity-50 italic font-normal normal-case">
              · {normative}
            </span>
          )}
        </div>
        <div className={cn("h-px flex-1", c.bg)} />
      </div>
      {children}
    </>
  );
}

export default PhaseHeader;
