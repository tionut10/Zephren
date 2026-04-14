/**
 * RampGuided — metode ghidate pas-cu-pas.
 *
 * Conținut:
 *   ├─ QuickFill Wizard — 7 ecrane cu carduri vizuale (tap/click, fără tastatură)
 *   ├─ Chat AI — descriere text liberă, Claude extrage datele
 *   ├─ Tutorial interactiv — ghid cu clădire demo precompletată
 *   └─ Formular clasic — închide hub-ul și scroll la câmpurile manuale de mai jos
 */

function ActionButton({ icon, title, description, accent = "violet", onClick, badge }) {
  const accentMap = {
    amber:   "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300",
    violet:  "border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300",
    purple:  "border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300",
    sky:     "border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-300",
    slate:   "border-slate-500/25 bg-slate-800/25 hover:bg-slate-700/30 text-slate-200",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all group ${accentMap[accent]}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold group-hover:brightness-110 flex items-center gap-2">
          {title}
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-normal">{badge}</span>}
        </div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>
    </button>
  );
}

function scrollToManualForm() {
  // Scroll la primul card "Adresa clădirii" — formularul manual de mai jos
  const target = document.querySelector('[data-manual-form-anchor]')
    || document.querySelector('h2')
    || document.body;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function RampGuided({
  onOpenQuickFill,
  onOpenChat,
  onOpenTutorial,
}) {
  return (
    <div className="space-y-2">

      {/* ── QuickFill Wizard ─────────────────────────────────────────────────── */}
      <ActionButton
        icon="⚡"
        title="QuickFill Wizard"
        description="7 ecrane cu carduri vizuale — tap/click, fără tastatură. Potrivit pentru mobile (~60 sec)."
        accent="amber"
        onClick={onOpenQuickFill}
        badge="Cel mai rapid"
      />

      {/* ── Chat AI ──────────────────────────────────────────────────────────── */}
      <ActionButton
        icon="💬"
        title="Chat AI — descriere text"
        description={'Scrie liber: "Apartament 3 camere, bloc P+4 din 1982, cazan gaz" → Claude extrage datele.'}
        accent="violet"
        onClick={onOpenChat}
      />

      {/* ── Tutorial interactiv ──────────────────────────────────────────────── */}
      {onOpenTutorial && (
        <ActionButton
          icon="🎓"
          title="Tutorial interactiv"
          description="Ghid pas cu pas cu o clădire exemplu precompletată — ideal pentru prima utilizare"
          accent="purple"
          onClick={onOpenTutorial}
        />
      )}

      {/* ── Formular clasic manual ───────────────────────────────────────────── */}
      <ActionButton
        icon="✍️"
        title="Completare manuală câmp cu câmp"
        description="Formularul clasic de mai jos — control total asupra fiecărui câmp"
        accent="slate"
        onClick={scrollToManualForm}
      />

      <div className="text-[10px] text-slate-600 italic pt-1 px-1">
        Metodele ghidate pot fi combinate — începe cu QuickFill și completează detaliile manual.
      </div>
    </div>
  );
}
