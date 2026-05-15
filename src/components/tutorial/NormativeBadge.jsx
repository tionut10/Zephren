// ═════════════════════════════════════════════════════════════════════════════
// NormativeBadge — badge clickable cu referință normativă
//
// Folosit pentru: Mc 001-2022, SR EN xxx, EPBD 2024/1275, Ord. MDLPA 348/2026 etc.
// Click → tooltip cu detalii + link extern (dacă există URL)
// ═════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { cn } from "../ui.jsx";

const TYPE_COLORS = {
  "mc001":   { bg: "bg-amber-500/15",   border: "border-amber-500/40",   text: "text-amber-300" },
  "sr-en":   { bg: "bg-sky-500/15",     border: "border-sky-500/40",     text: "text-sky-300" },
  "iso":     { bg: "bg-cyan-500/15",    border: "border-cyan-500/40",    text: "text-cyan-300" },
  "epbd":    { bg: "bg-violet-500/15",  border: "border-violet-500/40",  text: "text-violet-300" },
  "ord":     { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-300" },
  "lege":    { bg: "bg-rose-500/15",    border: "border-rose-500/40",    text: "text-rose-300" },
  "default": { bg: "bg-slate-700/50",   border: "border-slate-600",      text: "text-slate-300" },
};

export default function NormativeBadge({ code, title, description, url, type = "default", compact = false }) {
  const [hovered, setHovered] = useState(false);
  const c = TYPE_COLORS[type] || TYPE_COLORS.default;

  const Tag = url ? "a" : "div";
  const props = url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <span className="relative inline-block">
      <Tag
        {...props}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "inline-flex items-center gap-1 rounded font-mono font-semibold border cursor-help transition-all",
          c.bg, c.border, c.text,
          compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
          url && "hover:opacity-80"
        )}
      >
        <span>{code}</span>
        {url && <span className="text-[8px] opacity-60">↗</span>}
      </Tag>

      {hovered && (title || description) && (
        <span className="absolute bottom-full left-0 mb-1.5 z-50 w-64 rounded-lg bg-slate-900 border border-slate-700 shadow-xl p-2.5 pointer-events-none">
          {title && <div className="text-xs font-semibold text-white mb-1">{title}</div>}
          {description && <div className="text-[10px] text-slate-300 leading-relaxed">{description}</div>}
          {url && (
            <div className="text-[9px] text-amber-400 mt-1.5">Click pentru a deschide ↗</div>
          )}
        </span>
      )}
    </span>
  );
}
