/**
 * ProposedMeasuresPanel.jsx — Sprint Suggestion Queue (16 mai 2026)
 *
 * Afișează măsurile propuse din Pas 3 + Pas 4 (catalog sugestii → coadă globală).
 *
 * Folosit în Step 7 (Audit) tab „Recomandări din Pas 3+4".
 *
 * Permite:
 *   - Vizualizare grupată per categorie (heating/cooling/acm/ventilation/lighting/pv/...)
 *   - Actualizare status (proposed → approved | rejected)
 *   - Notes auditor (free text)
 *   - Șterge măsură
 *   - Clear all (cu confirmare)
 *
 * Filozofie: măsurile aici NU modifică baseline-ul Pas 3+4 — sunt propuneri pure
 * pentru raport audit (Mc 001-2022 §10 — soluții de îmbunătățire performanță).
 */

import { useState, useCallback, useMemo } from "react";
import { Card, cn } from "./ui.jsx";
import { useProposedMeasures } from "../store/useProposedMeasures.js";
import { updateMeasure, removeMeasure, clearAll } from "../store/proposed-measures.js";
import { formatPriceRange } from "../data/suggestions-catalog.js";

// ── Mapping categorii → label + icon (mirror din SuggestionPanel + extras) ──
const CATEGORY_META = {
  heating:           { icon: "🔥", labelRO: "Încălzire",         labelEN: "Heating" },
  acm:               { icon: "🚿", labelRO: "ACM",               labelEN: "DHW" },
  cooling:           { icon: "❄️",  labelRO: "Climatizare",       labelEN: "Cooling" },
  ventilation:       { icon: "💨", labelRO: "Ventilare",         labelEN: "Ventilation" },
  lighting:          { icon: "💡", labelRO: "Iluminat",          labelEN: "Lighting" },
  pv:                { icon: "☀️", labelRO: "Fotovoltaic",       labelEN: "Photovoltaic" },
  "solar-thermal":   { icon: "🌞", labelRO: "Solar termic",      labelEN: "Solar thermal" },
  wind:              { icon: "🌬️", labelRO: "Eolian",             labelEN: "Wind" },
  biomass:           { icon: "🪵", labelRO: "Biomasă",           labelEN: "Biomass" },
  "heat-pump":       { icon: "🔄", labelRO: "Pompă căldură",     labelEN: "Heat pump" },
  chp:               { icon: "⚙️",  labelRO: "Cogenerare",        labelEN: "CHP" },
  battery:           { icon: "🔋", labelRO: "Stocare",           labelEN: "Storage" },
  "envelope-opaque": { icon: "🧱", labelRO: "Anvelopă opacă",    labelEN: "Opaque envelope" },
  "envelope-glazing":{ icon: "🪟", labelRO: "Anvelopă vitraj",   labelEN: "Glazed envelope" },
  "envelope-bridge": { icon: "🔗", labelRO: "Punți termice",     labelEN: "Thermal bridges" },
};

const SOURCE_LABELS = {
  Step3: { ro: "Pas 3 (Sisteme)",     en: "Step 3 (Systems)" },
  Step4: { ro: "Pas 4 (Regenerabil)", en: "Step 4 (Renewables)" },
  "Step7-auto": { ro: "Auto-generat", en: "Auto-generated" },
  manual: { ro: "Manual", en: "Manual" },
};

const STATUS_STYLES = {
  proposed:  "bg-violet-500/15 text-violet-200 border-violet-500/30",
  edited:    "bg-amber-500/15 text-amber-200 border-amber-500/30",
  approved:  "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  rejected:  "bg-red-500/15 text-red-200/70 border-red-500/30",
};

const STATUS_LABELS = {
  proposed:  { ro: "Propusă",  en: "Proposed" },
  edited:    { ro: "Editată",  en: "Edited" },
  approved:  { ro: "Aprobată", en: "Approved" },
  rejected:  { ro: "Respinsă", en: "Rejected" },
};

// ─── Card individual ─────────────────────────────────────────────────────────

function MeasureCard({ measure, lang, onApprove, onReject, onRemove, onNotesChange }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(measure.auditorNotes || "");

  const meta = CATEGORY_META[measure.category] || { icon: "📦", labelRO: measure.category, labelEN: measure.category };
  const sourceLbl = SOURCE_LABELS[measure.sourceStep] || { ro: measure.sourceStep, en: measure.sourceStep };
  const statusLbl = STATUS_LABELS[measure.status] || { ro: measure.status, en: measure.status };
  const price = formatPriceRange(measure.priceRange);
  const isRejected = measure.status === "rejected";

  // Detalii tehnice compacte
  const techPairs = useMemo(() => {
    const t = measure.tech || {};
    const pairs = [];
    if (t.SCOP != null) pairs.push(["SCOP", t.SCOP]);
    if (t.COP != null) pairs.push(["COP", t.COP]);
    if (t.SEER != null) pairs.push(["SEER", t.SEER]);
    if (t.EER != null) pairs.push(["EER", t.EER]);
    if (t.efficiency != null) pairs.push(["η", t.efficiency]);
    if (t.capacity_kW != null) pairs.push(["P", `${t.capacity_kW} kW`]);
    if (t.kWp != null) pairs.push(["P", `${t.kWp} kWp`]);
    if (t.recoveryEff != null) pairs.push(["η_HR", `${(t.recoveryEff * 100).toFixed(0)}%`]);
    if (t.lambda != null) pairs.push(["λ", t.lambda]);
    if (t.U != null) pairs.push(["U", t.U]);
    if (t.thickness_mm != null) pairs.push(["d", `${t.thickness_mm}mm`]);
    return pairs;
  }, [measure.tech]);

  const handleSaveNotes = () => {
    onNotesChange(measure.id, notesDraft);
    setEditingNotes(false);
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        isRejected
          ? "border-red-500/20 bg-red-500/[0.03] opacity-60"
          : measure.status === "approved"
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-white/10 bg-white/[0.02]"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl shrink-0" aria-hidden="true">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border", STATUS_STYLES[measure.status])}>
              {lang === "EN" ? statusLbl.en : statusLbl.ro}
            </span>
            <span className="text-[10px] text-white/40">
              {lang === "EN" ? sourceLbl.en : sourceLbl.ro}
            </span>
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/60 font-medium">
              {lang === "EN" ? meta.labelEN : meta.labelRO}
            </span>
          </div>
          <div className="text-sm font-semibold text-white/95 leading-tight">
            {lang === "EN" && measure.labelEN ? measure.labelEN : measure.label}
          </div>
        </div>
      </div>

      {/* Tehnic compact */}
      {techPairs.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-violet-200/70 mb-2">
          {techPairs.map(([k, v]) => (
            <span key={k} className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
              {k}=<span className="text-violet-100/90">{v}</span>
            </span>
          ))}
        </div>
      )}

      {/* Preț orientativ */}
      <div className="flex items-center justify-between text-[11px] mb-2">
        <span className="text-white/60">
          {lang === "EN" ? "Indicative cost" : "Cost orientativ"}: <span className="font-mono text-white/85">{price}</span>
        </span>
        {measure.proposedAt && (
          <span className="text-white/40 text-[10px]">
            {new Date(measure.proposedAt).toLocaleString(lang === "EN" ? "en-GB" : "ro-RO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        )}
      </div>

      {/* Notes auditor (free text) */}
      <div className="mb-2">
        {editingNotes ? (
          <div className="space-y-1.5">
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              className="w-full text-[11px] rounded-lg bg-white/5 border border-white/10 p-2 resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-amber-400/40"
              placeholder={lang === "EN" ? "Auditor notes (free text)..." : "Note auditor (text liber)..."}
              maxLength={500}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveNotes}
                className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30"
              >
                {lang === "EN" ? "Save" : "Salvează"}
              </button>
              <button
                onClick={() => { setNotesDraft(measure.auditorNotes || ""); setEditingNotes(false); }}
                className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10"
              >
                {lang === "EN" ? "Cancel" : "Anulează"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className={cn(
              "w-full text-left text-[11px] rounded-lg px-2 py-1.5 transition border",
              measure.auditorNotes
                ? "bg-amber-500/[0.05] border-amber-500/20 text-amber-100/80"
                : "bg-white/[0.02] border-white/5 text-white/40 italic"
            )}
          >
            {measure.auditorNotes || (lang === "EN" ? "+ Add note..." : "+ Adaugă notă...")}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
        {measure.status !== "approved" && (
          <button
            onClick={() => onApprove(measure.id)}
            className="text-[11px] font-medium px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
            title={lang === "EN" ? "Approve for inclusion in audit report" : "Aprobă pentru includere în raport audit"}
          >
            ✓ {lang === "EN" ? "Approve" : "Aprobă"}
          </button>
        )}
        {measure.status !== "rejected" && (
          <button
            onClick={() => onReject(measure.id)}
            className="text-[11px] font-medium px-2.5 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30"
            title={lang === "EN" ? "Reject (kept for audit trail)" : "Respinge (păstrat pentru audit trail)"}
          >
            ✕ {lang === "EN" ? "Reject" : "Respinge"}
          </button>
        )}
        <button
          onClick={() => onRemove(measure.id)}
          className="ml-auto text-[10px] text-white/40 hover:text-red-300 transition"
          title={lang === "EN" ? "Delete permanently from queue" : "Șterge definitiv din coadă"}
        >
          🗑 {lang === "EN" ? "Delete" : "Șterge"}
        </button>
      </div>
    </div>
  );
}

// ─── Container principal ─────────────────────────────────────────────────────

export default function ProposedMeasuresPanel({ lang = "RO" }) {
  // Coada doar din Pas 3 + Pas 4 (excludem Step7-auto + manual aici — pentru focus)
  const measures = useProposedMeasures({ sourceStep: ["Step3", "Step4"] });
  const [confirmClear, setConfirmClear] = useState(false);

  const handleApprove = useCallback((id) => updateMeasure(id, { status: "approved" }), []);
  const handleReject = useCallback((id) => updateMeasure(id, { status: "rejected" }), []);
  const handleRemove = useCallback((id) => removeMeasure(id), []);
  const handleNotesChange = useCallback((id, notes) => {
    updateMeasure(id, { auditorNotes: notes || null, status: "edited" });
  }, []);

  // Grupare per categorie pentru afișare ordonată
  const grouped = useMemo(() => {
    const g = {};
    for (const m of measures) {
      if (!g[m.category]) g[m.category] = [];
      g[m.category].push(m);
    }
    return g;
  }, [measures]);

  const stats = useMemo(() => {
    const s = { total: measures.length, proposed: 0, approved: 0, rejected: 0, edited: 0 };
    for (const m of measures) s[m.status] = (s[m.status] || 0) + 1;
    return s;
  }, [measures]);

  if (measures.length === 0) {
    return (
      <Card title={lang === "EN" ? "📋 Proposed measures from Steps 3+4" : "📋 Recomandări din Pas 3+4"}>
        <div className="text-center py-6 text-xs text-white/50 leading-relaxed">
          <div className="text-3xl mb-2 opacity-50">💡</div>
          <p className="font-medium text-white/70 mb-1">
            {lang === "EN" ? "No proposed measures yet" : "Nicio măsură propusă încă"}
          </p>
          <p className="opacity-70">
            {lang === "EN"
              ? `Go to Step 3 (Systems) or Step 4 (Renewables) and click "📋 Propose" on suggestions to add them here for inclusion in the audit report (Mc 001-2022 §10).`
              : `Mergi la Pas 3 (Instalații) sau Pas 4 (Regenerabile) și apasă „📋 Propune” pe sugestii pentru a le adăuga aici (raport audit Mc 001-2022 §10).`}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={lang === "EN" ? "📋 Proposed measures from Steps 3+4" : "📋 Recomandări din Pas 3+4"}>
      {/* Stats header */}
      <div className="flex items-center gap-3 flex-wrap mb-3 pb-3 border-b border-white/5 text-[11px]">
        <span className="text-white/70 font-medium">
          {stats.total} {lang === "EN" ? "measures" : "măsuri"}
        </span>
        {stats.approved > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 text-[10px]">
            ✓ {stats.approved} {lang === "EN" ? "approved" : "aprobate"}
          </span>
        )}
        {stats.proposed > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 border border-violet-500/30 text-[10px]">
            {stats.proposed} {lang === "EN" ? "pending" : "în așteptare"}
          </span>
        )}
        {stats.edited > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30 text-[10px]">
            {stats.edited} {lang === "EN" ? "edited" : "editate"}
          </span>
        )}
        {stats.rejected > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-[10px]">
            ✕ {stats.rejected} {lang === "EN" ? "rejected" : "respinse"}
          </span>
        )}

        {/* Clear all (cu confirmare) */}
        <div className="ml-auto">
          {confirmClear ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/60">
                {lang === "EN" ? "Sure?" : "Sigur?"}
              </span>
              <button
                onClick={() => { clearAll(); setConfirmClear(false); }}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30"
              >
                {lang === "EN" ? "Yes, clear all" : "Da, șterge tot"}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 hover:bg-white/10"
              >
                {lang === "EN" ? "Cancel" : "Anulează"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-[10px] text-white/40 hover:text-red-300 transition"
            >
              🗑 {lang === "EN" ? "Clear all" : "Șterge toate"}
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer Mc 001-2022 + destinații export */}
      <div className="text-[10px] text-blue-200/70 bg-blue-500/[0.05] border border-blue-500/20 rounded-lg p-2 mb-3 leading-relaxed">
        ℹ️ {lang === "EN"
          ? "These measures DO NOT modify the baseline (Steps 3+4). Approved/edited measures are auto-injected into:"
          : "Aceste măsuri NU modifică baseline-ul (Pas 3+4). Măsurile aprobate/editate sunt auto-injectate în:"}
        <ul className="mt-1 ml-3 space-y-0.5">
          <li>📄 {lang === "EN"
            ? "Annex 1+2 CPE (Step 6 — Mc 001-2022 + Ord. MDLPA 348/2026 Annex 1)"
            : "Anexa 1+2 CPE (Pas 6 — Mc 001-2022 + Ord. MDLPA 348/2026 Anexa 1)"}</li>
          <li>📋 {lang === "EN"
            ? "Full audit report PDF (Step 7 — Mc 001-2022 §10)"
            : "Raport audit complet PDF (Pas 7 — Mc 001-2022 §10)"}</li>
          <li>🏠 {lang === "EN"
            ? "Renovation passport (EPBD 2024/1275 Art. 12 + Annex VIII)"
            : "Pașaport renovare (EPBD 2024/1275 Art. 12 + Anexa VIII)"}</li>
        </ul>
        <div className="mt-1 text-amber-200/70 text-[9px] italic">
          {lang === "EN"
            ? "Only \"approved\" or \"edited\" status are injected. \"Proposed\" stays for review."
            : `Doar status „aprobat” sau „editat” sunt injectate. „Propusă” rămâne pentru review.`}
        </div>
      </div>

      {/* Grupare per categorie */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => {
          const meta = CATEGORY_META[category] || { icon: "📦", labelRO: category, labelEN: category };
          return (
            <div key={category}>
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">{meta.icon}</span>
                <span>{lang === "EN" ? meta.labelEN : meta.labelRO}</span>
                <span className="text-[10px] text-white/40 font-normal">({items.length})</span>
              </h5>
              <div className="space-y-2">
                {items.map(m => (
                  <MeasureCard
                    key={m.id}
                    measure={m}
                    lang={lang}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRemove={handleRemove}
                    onNotesChange={handleNotesChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
