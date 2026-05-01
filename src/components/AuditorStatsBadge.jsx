import React from "react";
import { cn } from "./ui.jsx";

/**
 * AuditorStatsBadge — mini-panel statistici auditor pentru Sidebar.
 * Mutat din Pas 6 (1 mai 2026): nu apare în CPE/Anexă, deci nu aparține pasului
 * de certificare. Afișează: certificate luna curentă, proiecte salvate, clasă curentă, RER.
 *
 * Props:
 *  - certCount       (number)   certificate emise în luna curentă
 *  - projectsCount   (number)   total proiecte salvate
 *  - currentClass    (string)   clasa energetică curentă (A+..G)
 *  - currentClassColor (string) culoarea hex/rgb pentru clasă
 *  - rer             (number)   procent surse regenerabile (0-100)
 *  - lang            ("RO"|"EN")
 */
export default function AuditorStatsBadge({
  certCount = 0,
  projectsCount = 0,
  currentClass = "—",
  currentClassColor = "#94a3b8",
  rer = 0,
  lang = "RO",
}) {
  // Afișează badge-ul când există minim un indicator activ — fie certificate emise,
  // fie proiecte salvate, fie un proiect curent cu clasă energetică calculată.
  const hasClass = currentClass && currentClass !== "—" && currentClass !== "?";
  const hasData = certCount > 0 || projectsCount > 0 || hasClass;
  if (!hasData) return null;

  const labels = {
    RO: { title: "Statistici auditor", certs: "Certificate luna", projects: "Proiecte", cls: "Clasă", rer: "RER" },
    EN: { title: "Auditor stats", certs: "Certs this month", projects: "Projects", cls: "Class", rer: "RER" },
  };
  const L = labels[lang] || labels.RO;

  return (
    <div className="mt-3 p-2.5 md:p-2 lg:p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
      <div className="text-[9px] md:text-[9px] lg:text-[10px] uppercase tracking-widest opacity-40 mb-1.5">
        {L.title}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="text-center">
          <div className="text-base lg:text-lg font-bold text-amber-400 leading-none">{certCount}</div>
          <div className="text-[8px] lg:text-[9px] opacity-40 mt-0.5 truncate">{L.certs}</div>
        </div>
        <div className="text-center">
          <div className="text-base lg:text-lg font-bold text-emerald-400 leading-none">{projectsCount}</div>
          <div className="text-[8px] lg:text-[9px] opacity-40 mt-0.5 truncate">{L.projects}</div>
        </div>
        <div className="text-center">
          <div className="text-base lg:text-lg font-bold leading-none" style={{ color: currentClassColor }}>
            {currentClass}
          </div>
          <div className="text-[8px] lg:text-[9px] opacity-40 mt-0.5 truncate">{L.cls}</div>
        </div>
        <div className="text-center">
          <div className={cn("text-base lg:text-lg font-bold leading-none", rer >= 30 ? "text-blue-400" : "text-slate-400")}>
            {rer.toFixed(0)}%
          </div>
          <div className="text-[8px] lg:text-[9px] opacity-40 mt-0.5 truncate">{L.rer}</div>
        </div>
      </div>
    </div>
  );
}
