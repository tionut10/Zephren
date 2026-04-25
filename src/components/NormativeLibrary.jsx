/**
 * NormativeLibrary — Bibliotecă normative (Sprint B Task 4)
 *
 * Bibliotecă centrală cu acces rapid la metodologii, legi, standarde EN/ISO
 * și ordine MDLPA/ANRE. Permite căutare full-text + filtrare pe categorie +
 * link către tab-ul Step 8 relevant.
 */
import { useState, useMemo } from "react";
import { cn, Card } from "./ui.jsx";
import {
  NORMATIVES,
  NORMATIVE_CATEGORIES,
  NORMATIVE_TYPES,
  searchNormatives,
} from "../data/normative-library.js";

const TAB_LABELS = {
  nzeb_check: "Verificare nZEB",
  meps: "MEPS EPBD 2024",
  verificare_U: "Verificare U",
  sri: "SRI Indicator",
  bacs: "BACS",
  tb_dinamic: "Punți termice ψ",
  glaser: "Condens Glaser",
  rehab: "Pachete reabilitare",
  pnrr: "Finanțare PNRR/AFM",
  lcc: "LCC per măsură",
  pompa: "Pompă căldură",
  gp123: "GP 123 Fotovoltaic",
  en12831: "Sarcină vârf",
  camere: "Sarcini per cameră",
  racire_orara: "Răcire orară",
  ventilare: "Ventilare",
  vmc_hr: "VMC-HR",
  acm_en15316: "ACM detaliat",
  iluminat_nat: "Iluminat natural",
  acustic: "Acustic",
  raport_audit: "Raport audit",
  cpe_tracker: "Tracker CPE",
  gwp_co2: "CO₂ Lifecycle",
  sim8760: "Profil anual",
};

function NormativeCard({ n, onJumpToTab }) {
  const [expanded, setExpanded] = useState(false);
  const cat = NORMATIVE_CATEGORIES[n.category];
  const type = NORMATIVE_TYPES[n.type];

  return (
    <div className={cn(
      "rounded-xl border transition-all overflow-hidden",
      "border-white/10 bg-slate-800/40 hover:border-white/20"
    )}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ backgroundColor: type?.color + "22", color: type?.color }}>
                {type?.icon} {n.code}
              </span>
              <span className="text-[10px] text-slate-500">{cat?.icon} {cat?.label}</span>
              <span className="text-[10px] text-slate-600">· {n.year}</span>
            </div>
            <div className="text-sm font-semibold text-white">{n.title}</div>
            <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.summary}</div>
          </div>
          <span className="text-slate-500 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
          <div className="text-[11px] text-slate-500 italic">{n.issuer}</div>

          {/* Excerpts pentru normative cu drepturi libere */}
          {n.keySections && n.keySections.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase text-amber-300 tracking-wider">
                📑 Secțiuni cheie
              </div>
              {n.keySections.map(s => (
                <details key={s.id} className="rounded-lg bg-slate-900/40 border border-white/5">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.02]">
                    {s.title}
                  </summary>
                  <div className="px-3 pb-3 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {s.excerpt}
                  </div>
                </details>
              ))}
            </div>
          ) : n.type === "asro" ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
              💰 <strong>Standard ASRO cu drepturi închise.</strong> Conținutul integral nu poate fi
              redistribuit. Achiziționați de pe <a href="https://www.asro.ro" target="_blank" rel="noopener noreferrer"
                className="text-amber-300 underline">asro.ro</a> sau standards.iteh.ai.
            </div>
          ) : null}

          {/* Linkuri */}
          <div className="flex flex-wrap gap-2">
            {n.externalUrl && (
              <a
                href={n.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-xs font-medium transition-colors"
              >
                🔗 Sursa oficială
              </a>
            )}
            {n.relatedTabs && n.relatedTabs.length > 0 && onJumpToTab && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-500 self-center">Vezi în Zephren:</span>
                {n.relatedTabs.slice(0, 4).map(tabId => (
                  <button key={tabId}
                    onClick={() => onJumpToTab(tabId)}
                    className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-[10px] font-medium transition-colors"
                  >
                    {TAB_LABELS[tabId] || tabId}
                  </button>
                ))}
                {n.relatedTabs.length > 4 && (
                  <span className="text-[10px] text-slate-600 self-center">+{n.relatedTabs.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NormativeLibrary({ onJumpToTab, lang = "RO" }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => searchNormatives(search, category), [search, category]);

  // Statistici afișaj
  const stats = useMemo(() => {
    const byType = {};
    NORMATIVES.forEach(n => { byType[n.type] = (byType[n.type] || 0) + 1; });
    return byType;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header + statistici */}
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          📚 {lang === "EN" ? "Normative Library" : "Bibliotecă normative"}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === "EN"
            ? "Quick access to methodologies, laws, EN/ISO standards and MDLPA/ANRE orders relevant for energy auditing in Romania."
            : "Acces rapid la metodologii, legi, standarde EN/ISO și ordine MDLPA/ANRE relevante pentru audit energetic în România."}
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Object.entries(NORMATIVE_TYPES).map(([k, v]) => (
            <span key={k}
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ backgroundColor: v.color + "22", color: v.color }}>
              {v.icon} {v.label} ({stats[k] || 0})
            </span>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="space-y-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={lang === "EN" ? "Search code, title, content..." : "Caută cod, titlu, conținut..."}
          aria-label={lang === "EN" ? "Search normatives" : "Caută normative"}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30"
        />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCategory("all")}
            className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
              category === "all"
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-transparent text-slate-400 border-white/10 hover:bg-white/5")}>
            {lang === "EN" ? "All" : "Toate"} ({NORMATIVES.length})
          </button>
          {Object.entries(NORMATIVE_CATEGORIES).map(([k, v]) => {
            const count = NORMATIVES.filter(n => n.category === k).length;
            if (count === 0) return null;
            return (
              <button key={k} onClick={() => setCategory(k)}
                className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                  category === k
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-transparent text-slate-400 border-white/10 hover:bg-white/5")}>
                {v.icon} {v.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Listă normative */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">
            {lang === "EN" ? "No normatives match your search." : "Niciun normativ găsit."}
          </p>
        ) : (
          filtered.map(n => (
            <NormativeCard key={n.id} n={n} onJumpToTab={onJumpToTab} />
          ))
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
        {lang === "EN"
          ? "Excerpts are summarized for guidance only. For legal/audit work, always consult the official source."
          : "Excerpts sunt rezumate orientative. Pentru documente legale/audit, consultați întotdeauna sursa oficială."}
      </div>
    </div>
  );
}
