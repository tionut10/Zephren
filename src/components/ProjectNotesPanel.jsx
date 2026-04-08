import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "./ui.jsx";

const SECTION_CONFIG = {
  anvelopa:    { label: "Anvelopă",      icon: "🏠", desc: "Note privind elementele de construcție, izolație, geamuri" },
  sisteme:     { label: "Sisteme",       icon: "⚙️", desc: "Note privind instalațiile termice, electrice, ventilație" },
  renewables:  { label: "Regenerabile",  icon: "☀️", desc: "Note privind sistemele de energie regenerabilă" },
  calcul:      { label: "Calcul",        icon: "🔢", desc: "Note privind calculele energetice, EP, clase" },
  general:     { label: "General",       icon: "📋", desc: "Observații generale, concluzii, acțiuni necesare" },
};

function lsKey(projectId, section) {
  return `zephren_notes_${projectId}_${section}`;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function ProjectNotesPanel({
  projectId = "default",
  sections: sectionsProp = ["anvelopa", "sisteme", "renewables", "calcul"],
  onClose,
}) {
  const allSections = [...new Set([...sectionsProp, "general"])];

  // Inițializare stări note din localStorage
  const [notes, setNotes] = useState(() => {
    const init = {};
    allSections.forEach(s => {
      try {
        const saved = JSON.parse(localStorage.getItem(lsKey(projectId, s)));
        init[s] = saved || { text: "", updatedAt: null };
      } catch {
        init[s] = { text: "", updatedAt: null };
      }
    });
    return init;
  });

  const [activeSection, setActiveSection] = useState(allSections[0]);
  const [saveIndicator, setSaveIndicator]  = useState({});
  const [exportStatus, setExportStatus]    = useState("");

  // Salvare debounced în localStorage
  const saveSectionToLS = useCallback((section, text) => {
    const entry = { text, updatedAt: new Date().toISOString() };
    localStorage.setItem(lsKey(projectId, section), JSON.stringify(entry));
    setNotes(prev => ({ ...prev, [section]: entry }));
    setSaveIndicator(prev => ({ ...prev, [section]: "saved" }));
    setTimeout(() => setSaveIndicator(prev => ({ ...prev, [section]: null })), 2000);
  }, [projectId]);

  const debouncedSave = useDebounce(saveSectionToLS, 1000);

  function handleChange(section, text) {
    setNotes(prev => ({ ...prev, [section]: { ...prev[section], text } }));
    setSaveIndicator(prev => ({ ...prev, [section]: "saving" }));
    debouncedSave(section, text);
  }

  // Verificare dacă o secțiune are note
  function hasNotes(section) {
    return !!(notes[section]?.text?.trim());
  }

  // Export text .txt
  function exportTxt() {
    const lines = [
      `NOTE AUDIT ENERGETIC`,
      `Proiect ID: ${projectId}`,
      `Exportat: ${new Date().toLocaleString("ro-RO")}`,
      ``,
      ...allSections.flatMap(s => {
        const n = notes[s];
        if (!n?.text?.trim()) return [];
        return [
          `--- ${SECTION_CONFIG[s]?.label || s.toUpperCase()} ---`,
          n.text.trim(),
          n.updatedAt ? `[Modificat: ${formatTimestamp(n.updatedAt)}]` : "",
          ``,
        ];
      }),
    ];
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `note_audit_${projectId}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportStatus("Exportat!");
    setTimeout(() => setExportStatus(""), 2000);
  }

  // Golire note pentru secțiunea curentă
  function clearSection(section) {
    if (!window.confirm(`Ștergi notele din secțiunea „${SECTION_CONFIG[section]?.label}"?`)) return;
    handleChange(section, "");
  }

  const totalChars = allSections.reduce((s, sec) => s + (notes[sec]?.text?.length || 0), 0);
  const activeNote = notes[activeSection] || { text: "", updatedAt: null };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-3xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Note Audit</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Proiect: {projectId} · {totalChars > 0 ? `${totalChars} caractere` : "Fără note"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportTxt} disabled={totalChars === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              {exportStatus ? (
                <span className="text-emerald-400">{exportStatus}</span>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Export .txt
                </>
              )}
            </button>
            {onClose && (
              <button onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row" style={{ minHeight: "500px" }}>
          {/* Sidebar secțiuni */}
          <div className="sm:w-48 border-b sm:border-b-0 sm:border-r border-white/10 p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible">
            {allSections.map(s => {
              const cfg   = SECTION_CONFIG[s] || { label: s, icon: "📝" };
              const active = activeSection === s;
              const hasN   = hasNotes(s);
              const isSaving = saveIndicator[s] === "saving";
              const isSaved  = saveIndicator[s] === "saved";
              return (
                <button key={s} onClick={() => setActiveSection(s)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap sm:w-full text-left",
                    active
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-white/50 hover:bg-white/10 hover:text-white/70 border border-transparent"
                  )}>
                  <span className="flex-shrink-0">{cfg.icon}</span>
                  <span className="flex-1">{cfg.label}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isSaving && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Salvare..." />
                    )}
                    {isSaved && !isSaving && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Salvat" />
                    )}
                    {hasN && !isSaving && !isSaved && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70" title="Are note" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Editor nota activă */}
          <div className="flex-1 flex flex-col p-5">
            {/* Header secțiune */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {SECTION_CONFIG[activeSection]?.icon} {SECTION_CONFIG[activeSection]?.label || activeSection}
                </h3>
                <p className="text-xs text-white/35 mt-0.5">
                  {SECTION_CONFIG[activeSection]?.desc || ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {saveIndicator[activeSection] === "saving" && (
                  <span className="text-xs text-amber-400/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Salvare...
                  </span>
                )}
                {saveIndicator[activeSection] === "saved" && (
                  <span className="text-xs text-emerald-400/80 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Salvat
                  </span>
                )}
                {hasNotes(activeSection) && (
                  <button onClick={() => clearSection(activeSection)}
                    className="text-xs text-white/25 hover:text-red-400 transition-colors">
                    Golește
                  </button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={activeNote.text}
              onChange={e => handleChange(activeSection, e.target.value)}
              placeholder={`Note pentru secțiunea „${SECTION_CONFIG[activeSection]?.label || activeSection}"...\n\nSalvare automată după 1 secundă.`}
              className="flex-1 w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 transition-all leading-relaxed"
              style={{ minHeight: "320px", scrollbarWidth: "thin" }}
            />

            {/* Footer textarea */}
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-white/25">
                {activeNote.updatedAt
                  ? `Ultima modificare: ${formatTimestamp(activeNote.updatedAt)}`
                  : "Nesalvat încă"}
              </div>
              <div className="text-xs text-white/25">
                {activeNote.text?.length || 0} caractere
              </div>
            </div>

            {/* Rezumat toate secțiunile cu note */}
            {totalChars > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <h4 className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">
                  Secțiuni cu note
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allSections.filter(s => hasNotes(s)).map(s => {
                    const cfg = SECTION_CONFIG[s] || { label: s, icon: "📝" };
                    return (
                      <button key={s} onClick={() => setActiveSection(s)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all",
                          activeSection === s
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-sky-500/10 text-sky-300/70 border-sky-500/20 hover:bg-sky-500/20"
                        )}>
                        <span>{cfg.icon}</span>
                        {cfg.label}
                        <span className="opacity-50">·</span>
                        <span className="opacity-60">{notes[s]?.text?.length || 0} car.</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-4 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-white/20">
            Salvare automată în localStorage (debounced 1s) · Note salvate per secțiune și proiect · Export disponibil ca text simplu
          </p>
        </div>
      </div>
    </div>
  );
}
