import { useState } from "react";
import { cn } from "./ui.jsx";

const TYPE_BADGES = {
  auto:    { label: "Auto",     color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  manual:  { label: "Manual",   color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  restore: { label: "Restaurare", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
};

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;

  if (diff < 60_000) return "acum";
  if (diff < 3_600_000) return `acum ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `acum ${Math.floor(diff / 3_600_000)} ore`;

  return d.toLocaleString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VersionHistoryPanel({
  versions = [],
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onClearAll,
  canUndo = false,
  onUndo,
}) {
  const [showAll, setShowAll]         = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saveLabel, setSaveLabel]     = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  const displayVersions = showAll ? versions : versions.slice(0, 10);

  function handleSave(e) {
    e.preventDefault();
    onSaveVersion?.(saveLabel || "Punct de restaurare manual");
    setSaveLabel("");
    setShowSaveForm(false);
  }

  function handleRestore(versionId) {
    const confirmed = window.confirm("Restaurezi această versiune? Starea curentă va fi salvată automat înainte de restaurare.");
    if (confirmed) onRestoreVersion?.(versionId);
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    onClearAll?.();
    setConfirmClear(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
          Istoric versiuni proiect
        </h3>
        <span className="text-xs text-white/30">
          {versions.length} versiuni salvate
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowSaveForm(v => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all">
          {showSaveForm ? "Anulează" : "Salvează versiune"}
        </button>

        {canUndo && (
          <button onClick={onUndo}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all">
            Undo (restaurează anterioară)
          </button>
        )}

        {versions.length > 0 && (
          <button onClick={handleClear}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              confirmClear
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/50")}>
            {confirmClear ? "Confirmi ștergerea?" : "Șterge tot"}
          </button>
        )}
      </div>

      {/* Formular salvare manuală */}
      {showSaveForm && (
        <form onSubmit={handleSave}
          className="bg-white/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
          <input value={saveLabel} onChange={e => setSaveLabel(e.target.value)}
            placeholder="Etichetă versiune (opțional)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
          <button type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all whitespace-nowrap">
            Salvează
          </button>
        </form>
      )}

      {/* Lista versiuni */}
      {versions.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm border border-white/5 rounded-xl bg-white/[0.02]">
          Nu există versiuni salvate. Versiunile se creează automat la modificări sau manual.
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayVersions.map((v, i) => {
            const badge = TYPE_BADGES[v.type] || TYPE_BADGES.auto;
            const isCurrent = i === 0;

            return (
              <div key={v.id}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors group",
                  isCurrent
                    ? "bg-amber-500/5 border-amber-500/15"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5")}>

                {/* Timeline dot */}
                <div className="flex flex-col items-center self-stretch">
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0",
                    isCurrent ? "bg-amber-500" : "bg-white/20")} />
                  {i < displayVersions.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 mt-1" />
                  )}
                </div>

                {/* Conținut */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white/80 truncate">{v.label}</span>
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border", badge.color)}>
                      {badge.label}
                    </span>
                    {isCurrent && <span className="text-[10px] text-amber-400 font-medium">CURENT</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/30">
                    <span>{fmtTime(v.timestamp)}</span>
                    <span>{fmtSize(v.size)}</span>
                    {v.diff_summary && <span className="truncate">{v.diff_summary}</span>}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isCurrent && (
                    <button onClick={() => handleRestore(v.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all whitespace-nowrap">
                      Restaurează
                    </button>
                  )}
                  <button onClick={() => onDeleteVersion?.(v.id)}
                    className="text-white/20 hover:text-red-400 transition-colors text-lg leading-none px-1">
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Afișează toate */}
      {versions.length > 10 && (
        <button onClick={() => setShowAll(v => !v)}
          className="w-full text-center py-2 text-xs text-white/30 hover:text-white/50 transition-colors">
          {showAll ? "Arată doar ultimele 10" : `Arată toate (${versions.length})`}
        </button>
      )}

      <p className="text-xs text-white/20 text-right">
        Max {50} versiuni · Salvare automată la modificări &gt;100 caractere · Min 1 min între salvări
      </p>
    </div>
  );
}
