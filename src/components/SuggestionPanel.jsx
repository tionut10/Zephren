/**
 * SuggestionPanel — Panou orientativ de soluții recomandate.
 *
 * Reutilizabil în Step 2 (wizards opac/vitraj/punte) și Step 5 (HVAC/PV/iluminat).
 *
 * Modul afișaj:
 *   - "compact"  : 1 linie/sugestie, fără descriere
 *   - "card"     : 3 carduri side-by-side (default — Step 2 wizards)
 *   - "list"     : listă verticală cu detalii complete (Step 5)
 *
 * Props:
 *   - suggestions   : Array<entry>  (rezultatul unei funcții suggestForX)
 *   - title         : string        (header — ex. „Soluții termoizolație recomandate")
 *   - subtitle      : string?       (sub header — ex. context aplicabilitate)
 *   - mode          : "compact" | "card" | "list"
 *   - onSelect      : (entry) => void  (opțional — callback la click pe sugestie)
 *   - emptyText     : string        (fallback când nu sunt sugestii)
 *   - lang          : "RO" | "EN"
 *   - showDisclaimer: boolean       (default true — afișează nota „orientativ")
 *
 * Accesibilitate:
 *   - role="region" + aria-label
 *   - butoanele cu focus-visible ring
 *   - text alternativ pentru iconițe (aria-hidden pe simboluri decorative)
 *
 * IMPORTANT: zero brand-uri. Toate sugestiile sunt generice tehnice.
 * Câmpurile brand/supplierId/affiliateUrl sunt rezervate pentru viitor.
 */

import { useMemo } from "react";
import { formatPriceRange, CATALOG_DISCLAIMER } from "../data/suggestions-catalog.js";
import { cn } from "./ui.jsx";

// ── Mapping etichete categorii ──────────────────────────────────────────────
const CATEGORY_ICONS = {
  "opaque-insulation": "🧱",
  "glazing": "🪟",
  "frame": "🔲",
  "hvac-heating": "🔥",
  "hvac-cooling": "❄️",
  "ventilation": "💨",
  "pv": "☀️",
  "lighting": "💡",
  "bridge": "🔗",
};

const TAG_COLORS = {
  "nZEB": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "passivhaus": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "premium": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "low-cost": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "fire-safe": "bg-red-500/15 text-red-300 border-red-500/30",
  "bio": "bg-lime-500/15 text-lime-300 border-lime-500/30",
  "patrimoniu": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "regenerabil": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "regenerabil-partial": "bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20",
  "fade-out-2030": "bg-amber-500/20 text-amber-200 border-amber-500/40",
  "obligatoriu": "bg-red-500/15 text-red-300 border-red-500/30",
  "passivhaus-criterii": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const TAG_LABELS_RO = {
  "nZEB": "nZEB",
  "passivhaus": "Passivhaus",
  "premium": "Premium",
  "low-cost": "Low-cost",
  "fire-safe": "Anti-foc",
  "bio": "Bio",
  "patrimoniu": "Patrimoniu",
  "regenerabil": "Regenerabil",
  "regenerabil-partial": "Reg. parțial",
  "fade-out-2030": "Tranzitoriu (2030)",
  "obligatoriu": "Obligatoriu",
  "BACS": "BACS",
};

function Tag({ name, lang = "RO" }) {
  const cls = TAG_COLORS[name] || "bg-white/[0.05] text-white/60 border-white/10";
  const label = lang === "RO" ? (TAG_LABELS_RO[name] || name) : name;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium border whitespace-nowrap",
        cls
      )}
    >
      {label}
    </span>
  );
}

// ── Format tehnic compact ───────────────────────────────────────────────────
function formatTechSummary(entry) {
  const t = entry.tech || {};
  const parts = [];
  if (t.lambda != null) parts.push(`λ=${t.lambda}`);
  if (t.thickness_mm != null) parts.push(`d=${t.thickness_mm}mm`);
  if (t.R != null) parts.push(`R=${t.R}`);
  if (t.U != null) parts.push(`U=${t.U}`);
  if (t.g != null) parts.push(`g=${t.g}`);
  if (t.COP != null) parts.push(`COP=${t.COP}`);
  if (t.SCOP != null) parts.push(`SCOP=${t.SCOP}`);
  if (t.kWp != null) parts.push(`${t.kWp}kWp`);
  if (t.capacity_kW != null) parts.push(`${t.capacity_kW}kW`);
  if (t.recoveryEff != null) parts.push(`η=${(t.recoveryEff * 100).toFixed(0)}%`);
  if (t.Rw != null) parts.push(`Rw=${t.Rw}dB`);
  if (t.psi_after != null && t.psi_before != null)
    parts.push(`ψ ${t.psi_before}→${t.psi_after}`);
  return parts.join(" · ");
}

// ── Card individual ─────────────────────────────────────────────────────────
function SuggestionCard({ entry, onSelect, mode, lang }) {
  const isCompact = mode === "compact";
  const icon = CATEGORY_ICONS[entry.category] || "📦";
  const tech = formatTechSummary(entry);
  const price = formatPriceRange(entry.priceRange);
  const meets = entry.meetsTarget;
  const sponsored = entry.sponsored;

  const interactive = typeof onSelect === "function";
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      {...(interactive
        ? {
            type: "button",
            onClick: () => onSelect(entry),
            "aria-label": `Aplică sugestia ${entry.label}`,
          }
        : {})}
      className={cn(
        "block w-full text-left rounded-xl border transition-all",
        "p-3",
        meets === false
          ? "border-amber-500/25 bg-amber-500/5"
          : "border-violet-500/20 bg-violet-500/[0.04]",
        interactive &&
          "hover:border-violet-400/50 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
        sponsored && "ring-1 ring-amber-400/30"
      )}
    >
      {/* Header — icon + label + sponsored badge */}
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-lg shrink-0" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white/95 leading-tight">
            {lang === "EN" && entry.labelEN ? entry.labelEN : entry.label}
          </div>
          {!isCompact && entry.description && (
            <div className="text-[10px] text-white/55 mt-0.5 leading-snug line-clamp-2">
              {entry.description}
            </div>
          )}
        </div>
        {sponsored && (
          <span
            className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30"
            title="Sugestie sponsorizată — disclosure"
          >
            Sponsor
          </span>
        )}
      </div>

      {/* Tehnic */}
      {tech && (
        <div className="text-[10px] font-mono text-violet-200/70 mb-1.5">
          {tech}
        </div>
      )}

      {/* Footer — preț + tags */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] text-white/60 font-medium">
          ~ <span className="font-mono text-white/85">{price}</span>
        </span>
        <div className="flex gap-1 flex-wrap">
          {(entry.tags || []).slice(0, 3).map(t => (
            <Tag key={t} name={t} lang={lang} />
          ))}
        </div>
      </div>

      {/* Status meets target */}
      {meets === false && (
        <div className="mt-1.5 text-[10px] text-amber-300/90 flex items-center gap-1">
          <span aria-hidden="true">⚠</span>
          <span>
            {lang === "EN"
              ? "Below target — combine with another solution"
              : "Sub țintă — combinați cu altă soluție"}
          </span>
        </div>
      )}

      {/* Avertizări (ex. fade-out 2030) */}
      {entry.warnings && entry.warnings.length > 0 && (
        <div className="mt-1.5 text-[9px] text-amber-300/80 leading-snug">
          {entry.warnings[0]}
        </div>
      )}
    </Wrapper>
  );
}

// ── Container principal ─────────────────────────────────────────────────────
export default function SuggestionPanel({
  suggestions = [],
  title,
  subtitle,
  mode = "card",
  onSelect,
  emptyText,
  lang = "RO",
  showDisclaimer = true,
}) {
  const items = useMemo(
    () => (Array.isArray(suggestions) ? suggestions.filter(Boolean) : []),
    [suggestions]
  );

  if (items.length === 0) {
    if (!emptyText) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/50 text-center">
        {emptyText}
      </div>
    );
  }

  const gridClasses =
    mode === "card"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
      : mode === "compact"
      ? "space-y-1.5"
      : "space-y-2";

  return (
    <section
      role="region"
      aria-label={title || (lang === "EN" ? "Recommended solutions" : "Soluții recomandate")}
      className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-transparent p-3"
    >
      {(title || subtitle) && (
        <header className="mb-2.5">
          {title && (
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">💡</span>
              <h4 className="text-xs font-bold text-violet-200">{title}</h4>
            </div>
          )}
          {subtitle && (
            <p className="text-[10px] text-white/55 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </header>
      )}

      <div className={gridClasses}>
        {items.map((entry, i) => (
          <SuggestionCard
            key={entry.id || i}
            entry={entry}
            onSelect={onSelect}
            mode={mode}
            lang={lang}
          />
        ))}
      </div>

      {showDisclaimer && (
        <p className="mt-2.5 text-[9px] text-white/40 italic leading-snug">
          {lang === "EN"
            ? "Indicative suggestions based on typical physical parameters. Prices are estimates for the RO market 2025-2026 and do NOT constitute a commercial offer."
            : CATALOG_DISCLAIMER}
        </p>
      )}
    </section>
  );
}

export { SuggestionCard };
