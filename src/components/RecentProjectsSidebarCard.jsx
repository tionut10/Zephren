/**
 * RecentProjectsSidebarCard — Sprint Smart Input 2026 (D4)
 *
 * Card persistent în sidebar global care afișează top 2 proiecte recente
 * pentru duplicare rapidă. Vizibil pe TOATE pașii (1-8), nu doar Step 1.
 *
 * De ce: auditorul lucrează în paralel pe mai multe proiecte;
 * "duplică recent" e o operație care merită shortcut global, nu îngropat
 * într-o rampă din SmartDataHub care e accesibil doar pe Pas 1.
 *
 * Pattern: oglindă pattern-ul AuditorStatsBadge (sidebar mic, fade-in la hasData).
 */

import { useRecentProjects } from "../hooks/useRecentProjects.js";

export default function RecentProjectsSidebarCard({
  currentProjectId,
  currentBuilding,
  onDuplicate,
  lang = "RO",
}) {
  // Limit 2 — sidebar e îngust, nu vrem să dominăm vertical
  const { projects, loading } = useRecentProjects({
    limit: 2,
    excludeId: currentProjectId,
    prioritize: currentBuilding?.category || currentBuilding?.county
      ? { category: currentBuilding?.category, county: currentBuilding?.county }
      : null,
  });

  if (loading) return null;
  if (!projects?.length) return null;
  if (typeof onDuplicate !== "function") return null;

  const labels = {
    RO: { title: "Proiecte recente", duplicate: "Duplică" },
    EN: { title: "Recent projects", duplicate: "Duplicate" },
  };
  const L = labels[lang] || labels.RO;

  return (
    <div className="mt-3 p-2.5 md:p-2 lg:p-3 bg-emerald-500/[0.04] border border-emerald-500/[0.15] rounded-xl">
      <div className="text-[9px] md:text-[9px] lg:text-[10px] uppercase tracking-widest text-emerald-300/70 mb-1.5 flex items-center gap-1">
        <span aria-hidden="true">📋</span>
        {L.title}
      </div>
      <div className="space-y-1">
        {projects.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onDuplicate(p.raw)}
            className="w-full text-left px-2 py-1.5 rounded-md bg-white/[0.02] hover:bg-emerald-500/[0.08] border border-transparent hover:border-emerald-500/15 transition-all group"
            aria-label={`${L.duplicate}: ${p.summary.title}`}
            title={`${L.duplicate}: ${p.summary.title} (${p.summary.fieldsCount} câmpuri · ${p.savedAtShort})`}
          >
            <div className="text-[10px] md:text-[10px] lg:text-[11px] font-semibold text-emerald-100/90 truncate flex items-center gap-1">
              {p.summary.title}
              {p.isCategoryMatch && (
                <span className="text-[7px] font-bold px-1 py-0 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase">
                  match
                </span>
              )}
            </div>
            <div className="text-[8px] md:text-[8px] lg:text-[9px] text-emerald-300/50 mt-0.5 truncate">
              {p.summary.categoryLabel} · {p.savedAtShort}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
