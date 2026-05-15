import { useState, useMemo } from "react";
import { TYPICAL_BUILDINGS, TYPICAL_BUILDINGS_EXTRA } from "../data/typical-buildings.js";
import { canAccess } from "../lib/planGating.js";

const CAT_META = {
  RI:    { label: "Rezidențial individual", icon: "🏠", free: true },
  RC:    { label: "Rezidențial colectiv",   icon: "🏢", free: true },
  BI:    { label: "Birouri",                icon: "🏦", free: false },
  ED:    { label: "Educație",               icon: "🏫", free: false },
  CO:    { label: "Comerț",                 icon: "🛒", free: false },
  GR:    { label: "Grădinițe",              icon: "🎨", free: false },
  SPA_H: { label: "Spitale",               icon: "🏥", free: false },
  CL:    { label: "Clinici",                icon: "💊", free: false },
  HO:    { label: "Hoteluri",               icon: "🏨", free: false },
  IN:    { label: "Hale industriale",       icon: "🏭", free: false },
  AD:    { label: "Administrative",         icon: "🏛️", free: false },
  SA:    { label: "Servicii/Agrement",      icon: "🏪", free: false },
};

function extractYear(label) {
  const m = label.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

const EP_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6 };

function estimateEPClass(tpl) {
  // estimare rapidă bazată pe an + izolație din label
  const yr = parseInt(tpl.building?.yearBuilt) || extractYear(tpl.label) || 1980;
  const lbl = tpl.label.toLowerCase();
  if (lbl.includes("nzeb") || lbl.includes("pasiv") || yr >= 2022) return { cls: "A", color: "#22c55e" };
  if (yr >= 2015 || lbl.includes("eps 15") || lbl.includes("eps 20")) return { cls: "B", color: "#86efac" };
  if (yr >= 2005 || lbl.includes("eps 10") || lbl.includes("reabilitat")) return { cls: "C", color: "#fde68a" };
  if (yr >= 1990) return { cls: "D", color: "#fb923c" };
  return { cls: "E", color: "#ef4444" };
}

// Epoci constructive — praguri aliniate cu schimbări normative RO
const EPOCHS = [
  { id: "all",      label: "Orice epocă",     min: 0,    max: 9999 },
  { id: "pre1945",  label: "Pre-1945",        min: 0,    max: 1944 },
  { id: "1945_89",  label: "1945-1989",       min: 1945, max: 1989 },
  { id: "1990_07",  label: "1990-2007",       min: 1990, max: 2007 },
  { id: "2008_18",  label: "2008-2018",       min: 2008, max: 2018 },
  { id: "post2019", label: "Post-2019 nZEB",  min: 2019, max: 9999 },
];

const SORT_OPTIONS = [
  { id: "default",  label: "Implicit" },
  { id: "year_asc", label: "An ↑" },
  { id: "year_desc",label: "An ↓" },
  { id: "ep_best",  label: "Clasă EP A→G" },
  { id: "ep_worst", label: "Clasă EP G→A" },
  { id: "alpha",    label: "Alfabetic" },
];

export default function BuildingTemplateModal({ isOpen, onClose, onApply, userPlan }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeEpoch, setActiveEpoch] = useState("all");
  const [sortMode, setSortMode] = useState("default");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  const allTemplates = useMemo(() =>
    [...TYPICAL_BUILDINGS, ...(TYPICAL_BUILDINGS_EXTRA || [])],
    []
  );

  const hasFull = canAccess(userPlan, "buildingTemplatesFull");

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.cat));
    return ["all", ...cats];
  }, [allTemplates]);

  const filtered = useMemo(() => {
    const epoch = EPOCHS.find(e => e.id === activeEpoch) || EPOCHS[0];
    const list = allTemplates.filter(t => {
      const matchCat = activeCategory === "all" || t.cat === activeCategory;
      const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase());
      const yr = parseInt(t.building?.yearBuilt) || extractYear(t.label) || 1980;
      const matchEpoch = yr >= epoch.min && yr <= epoch.max;
      return matchCat && matchSearch && matchEpoch;
    });
    if (sortMode === "default") return list;
    const arr = [...list];
    if (sortMode === "year_asc" || sortMode === "year_desc") {
      arr.sort((a, b) => {
        const ya = parseInt(a.building?.yearBuilt) || extractYear(a.label) || 1980;
        const yb = parseInt(b.building?.yearBuilt) || extractYear(b.label) || 1980;
        return sortMode === "year_asc" ? ya - yb : yb - ya;
      });
    } else if (sortMode === "ep_best" || sortMode === "ep_worst") {
      arr.sort((a, b) => {
        const ra = EP_RANK[estimateEPClass(a).cls] ?? 9;
        const rb = EP_RANK[estimateEPClass(b).cls] ?? 9;
        return sortMode === "ep_best" ? ra - rb : rb - ra;
      });
    } else if (sortMode === "alpha") {
      arr.sort((a, b) => a.label.localeCompare(b.label, "ro"));
    }
    return arr;
  }, [allTemplates, activeCategory, activeEpoch, sortMode, search]);

  const isLocked = (tpl) => {
    if (hasFull) return false;
    return !CAT_META[tpl.cat]?.free;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Șabloane clădiri tip</h2>
            <p className="text-xs text-white/50 mt-0.5">Completează automat datele clădirii cu valori tipice românești</p>
          </div>
          <button onClick={onClose}
            className="text-white/40 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Filtre */}
        <div className="px-5 py-3 border-b border-white/5 shrink-0 space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Caută după descriere..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
          />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => {
              const meta = cat === "all" ? { label: "Toate", icon: "📋" } : CAT_META[cat] || { label: cat, icon: "🏗️" };
              const locked = !hasFull && cat !== "all" && !CAT_META[cat]?.free;
              return (
                <button key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    activeCategory === cat
                      ? "bg-amber-500/30 border border-amber-500/50 text-amber-200"
                      : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  }`}>
                  {meta.icon} {meta.label}
                  {locked && <span className="text-[9px] opacity-50">🔒</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 items-center flex-wrap pt-1">
            <div className="flex gap-1 flex-wrap">
              {EPOCHS.map(ep => (
                <button key={ep.id}
                  onClick={() => setActiveEpoch(ep.id)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    activeEpoch === ep.id
                      ? "bg-sky-500/25 border border-sky-500/40 text-sky-200"
                      : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                  }`}>
                  {ep.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">Sortare:</span>
              <select value={sortMode} onChange={e => setSortMode(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/70 focus:outline-none focus:border-amber-500/40">
                {SORT_OPTIONS.map(s => <option key={s.id} value={s.id} className="bg-[#1a1f2e]">{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Grid template-uri */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
          {filtered.length === 0 && (
            <div className="text-center text-white/30 py-10 text-sm">Niciun șablon găsit</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map(tpl => {
              const locked = isLocked(tpl);
              const ep = estimateEPClass(tpl);
              const meta = CAT_META[tpl.cat] || { icon: "🏗️", label: tpl.cat };
              const yr = parseInt(tpl.building?.yearBuilt) || extractYear(tpl.label) || "—";
              const au = tpl.building?.areaUseful || "—";
              const nrOpaque = tpl.opaque?.length || 0;
              const nrGlazing = tpl.glazing?.length || 0;
              const isHov = hovered === tpl.id;

              return (
                <button key={tpl.id}
                  disabled={locked}
                  onMouseEnter={() => setHovered(tpl.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (!locked) {
                      onApply(tpl.id);
                      onClose();
                    }
                  }}
                  className={`relative text-left p-3 rounded-xl border transition-all ${
                    locked
                      ? "opacity-50 cursor-not-allowed border-white/5 bg-white/2"
                      : isHov
                      ? "border-amber-500/40 bg-amber-500/10 cursor-pointer"
                      : "border-white/10 bg-white/5 hover:border-amber-500/30 cursor-pointer"
                  }`}>
                  {/* Badge clasă EP estimată */}
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: ep.color + "33", color: ep.color, border: `1px solid ${ep.color}44` }}>
                    ~{ep.cls}
                  </span>

                  {/* Titlu */}
                  <div className="flex items-start gap-2 pr-8">
                    <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-white leading-snug">{tpl.label}</div>
                      <div className="text-[10px] text-white/40 mt-1 flex gap-2 flex-wrap">
                        {au !== "—" && <span>Au: {au} m²</span>}
                        {yr !== "—" && <span>An: {yr}</span>}
                        {nrOpaque > 0 && <span>{nrOpaque} elem. opace</span>}
                        {nrGlazing > 0 && <span>{nrGlazing} vitraj</span>}
                      </div>
                    </div>
                  </div>

                  {/* Lock overlay */}
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
                      <div className="text-center">
                        <div className="text-base">🔒</div>
                        <div className="text-[10px] text-white/50 mt-0.5">AE Ici+</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-white/30">
            {filtered.length} șabloane afișate
            {!hasFull && (
              <span className="ml-2 text-amber-400/70">
                · <strong>AE Ici</strong> (1.499 RON/lună) deblochează toate 11 categoriile
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all">
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
