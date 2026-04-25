/**
 * FAQ — Best practices & întrebări frecvente auditor (Sprint B Task 5)
 */
import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";
import { FAQ_ENTRIES, FAQ_CATEGORIES, searchFAQ } from "../data/faq-data.js";

const TAB_LABELS = {
  nzeb_check: "Verificare nZEB",
  meps: "MEPS EPBD 2024",
  verificare_U: "Verificare U",
  sri: "SRI Indicator",
  bacs: "BACS",
  tb_dinamic: "Punți termice ψ",
  glaser: "Condens Glaser",
  rehab: "Pachete reabilitare",
  pompa: "Pompă căldură",
  sonde_geo: "Sonde geotermale",
  gp123: "GP 123 Fotovoltaic",
  vmc_hr: "VMC-HR",
  acm_en15316: "ACM detaliat",
  solar_acm: "Solar termic",
  infiltratii: "Infiltrații n50",
  raport_audit: "Raport audit",
  mdlpa: "MDLPA Registru",
  cpe_tracker: "Tracker CPE",
  facturare: "Deviz servicii",
  contract: "Contract",
  efactura: "e-Factură ANAF",
};

function FAQItem({ entry, onJumpToTab, onJumpToNormative }) {
  const [open, setOpen] = useState(false);
  const cat = FAQ_CATEGORIES[entry.category];

  return (
    <div className={cn(
      "rounded-xl border transition-all overflow-hidden",
      open ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/10 bg-slate-800/40 hover:border-white/20"
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                {cat?.icon} {cat?.label}
              </span>
            </div>
            <div className="text-sm font-medium text-white">
              <span className="text-indigo-400 mr-1">Q.</span>
              {entry.question}
            </div>
          </div>
          <span className="text-slate-500 text-xs shrink-0">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
          <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
            <span className="text-emerald-400 font-bold mr-1">A.</span>
            {entry.answer}
          </div>

          {/* Linkuri rapide */}
          {(entry.relatedTabs?.length > 0 || entry.relatedNormatives?.length > 0) && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              {entry.relatedTabs?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500">Module Zephren:</span>
                  {entry.relatedTabs.map(tabId => (
                    <button key={tabId}
                      onClick={() => onJumpToTab?.(tabId)}
                      className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-[10px] font-medium transition-colors"
                    >
                      {TAB_LABELS[tabId] || tabId}
                    </button>
                  ))}
                </div>
              )}
              {entry.relatedNormatives?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500">Normative:</span>
                  {entry.relatedNormatives.map(nId => (
                    <button key={nId}
                      onClick={() => onJumpToNormative?.(nId)}
                      className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[10px] font-mono transition-colors"
                    >
                      {nId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FAQ({ onJumpToTab, onJumpToNormative, lang = "RO" }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => searchFAQ(search, category), [search, category]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          💡 {lang === "EN" ? "Best Practices & FAQ" : "Best Practices & Întrebări frecvente"}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === "EN"
            ? "20 frequently asked questions for energy auditors with quick answers and links to relevant Zephren modules and normatives."
            : "20 întrebări frecvente pentru auditori energetici cu răspunsuri scurte și linkuri rapide la modulele Zephren și normativele relevante."}
        </p>
      </div>

      {/* Search + filtre categorii */}
      <div className="space-y-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={lang === "EN" ? "Search question or keyword..." : "Caută întrebare sau cuvânt cheie..."}
          aria-label={lang === "EN" ? "Search FAQ" : "Caută în FAQ"}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30"
        />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCategory("all")}
            className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
              category === "all"
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-transparent text-slate-400 border-white/10 hover:bg-white/5")}>
            {lang === "EN" ? "All" : "Toate"} ({FAQ_ENTRIES.length})
          </button>
          {Object.entries(FAQ_CATEGORIES).map(([k, v]) => {
            const count = FAQ_ENTRIES.filter(f => f.category === k).length;
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

      {/* Listă */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">
            {lang === "EN" ? "No questions match your search." : "Nicio întrebare găsită."}
          </p>
        ) : (
          filtered.map(f => (
            <FAQItem key={f.id} entry={f}
              onJumpToTab={onJumpToTab}
              onJumpToNormative={onJumpToNormative}
            />
          ))
        )}
      </div>

      <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
        {lang === "EN"
          ? "Practical guidance based on Mc 001-2022, EN/ISO standards and current Romanian legislation."
          : "Ghid practic bazat pe Mc 001-2022, standardele EN/ISO și legislația RO curentă."}
      </div>
    </div>
  );
}
