import { useState, useEffect, useRef } from "react";

export const cn = (...classes) => classes.filter(Boolean).join(" ");

function TooltipIcon({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative ml-1 inline-block cursor-help"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
    >
      <span className="opacity-40 text-xs select-none">ⓘ</span>
      {visible && (
        <span className="absolute right-0 bottom-full mb-2 z-50 w-48 max-w-[min(12rem,calc(100vw-1rem))] rounded-lg border border-white/20 text-xs px-3 py-2 shadow-xl pointer-events-none whitespace-normal leading-relaxed normal-case tracking-normal font-normal opacity-100" style={{background:"#111827", color:"#f9fafb"}}>
          {text}
          <span className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4" style={{borderTopColor:"#111827"}} />
        </span>
      )}
    </span>
  );
}

export function Select({ label, value, onChange, options, placeholder, className="", tooltip="", error="" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listboxId = useRef(`select-listbox-${Math.random().toString(36).slice(2)}`);
  const tooltipId = useRef(`select-tip-${Math.random().toString(36).slice(2)}`);
  const errorId = useRef(`select-err-${Math.random().toString(36).slice(2)}`);
  const selected = options.find(o => (typeof o === "string" ? o : o.value) === value);
  const selectedLabel = selected ? (typeof selected === "string" ? selected : selected.label) : (placeholder || "Selecteaza...");
  const describedBy = [tooltip ? tooltipId.current : null, error ? errorId.current : null].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={ref} style={{position:"relative"}}>
      {label && (
        <div className="relative flex items-center min-h-[2rem]">
          <label className="w-full text-xs font-medium uppercase tracking-wider opacity-60 text-center">{label}</label>
          {tooltip && <span className="absolute right-0"><TooltipIcon text={tooltip} /></span>}
        </div>
      )}
      {tooltip && <span id={tooltipId.current} className="sr-only">{tooltip}</span>}
      <button type="button" onClick={() => setOpen(!open)}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId.current}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        className={cn("bg-white/5 border rounded-lg px-3 pr-8 py-1.5 text-sm text-center focus:outline-none focus:ring-1 transition-all relative flex items-center justify-center",
          error ? "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/30" : "border-white/10 focus:border-amber-500/50 focus:ring-amber-500/30")}
        style={{minHeight:"32px"}}>
        <span className={cn("truncate", !selected && placeholder ? "opacity-40" : "")}>{selectedLabel}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{position:"absolute",right:"12px",flexShrink:0,transform:open?"rotate(180deg)":"",transition:"transform 0.15s"}}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div id={listboxId.current} role="listbox" aria-label={label || "Opțiuni"}
          className="ep-listbox absolute z-50 left-0 right-0 mt-1 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          style={{top:"100%",maxHeight:"240px",overflowY:"auto",scrollbarWidth:"thin"}}>
          {placeholder && (
            <div role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 transition-colors opacity-40">{placeholder}</div>
          )}
          {options.map((o, i) => {
            // Group header (non-selectable, optgroup-like)
            if (typeof o === "object" && o.isGroupHeader) {
              return (
                <div key={i} role="presentation"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold opacity-50 bg-white/[0.02] border-t border-b border-white/[0.05]"
                  style={{cursor:"default"}}>
                  {o.label}
                </div>
              );
            }
            const val = typeof o === "string" ? o : o.value;
            const lab = typeof o === "string" ? o : o.label;
            const tip = typeof o === "object" ? o.tooltip : null;
            const partner = typeof o === "object" && o.partnerBadge;
            const isActive = val === value;
            return (
              <div key={i} role="option" aria-selected={isActive}
                title={tip || undefined}
                onClick={() => { onChange(val); setOpen(false); }}
                className={cn("px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between gap-2",
                  isActive ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/10")}>
                <span className="truncate">{lab}</span>
                {partner && <span className="text-[9px] opacity-70 shrink-0" title="Brand partener">🤝</span>}
              </div>
            );
          })}
        </div>
      )}
      {error && <span id={errorId.current} role="alert" aria-live="polite" className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
        <span aria-hidden="true">⚠</span>{error}
      </span>}
    </div>
  );
}

export function Input({ label, value, onChange, type="text", unit, placeholder, min, max, step, className="", disabled=false, tooltip="", error="", autoComplete, ariaLabel }) {
  const tipId = useRef(`input-tip-${Math.random().toString(36).slice(2)}`);
  const errId = useRef(`input-err-${Math.random().toString(36).slice(2)}`);
  const describedBy = [tooltip ? tipId.current : null, error ? errId.current : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="relative flex items-center min-h-[2rem]">
          <label className="w-full text-xs font-medium uppercase tracking-wider opacity-60 text-center">{label}</label>
          {tooltip && <span className="absolute right-0"><TooltipIcon text={tooltip} /></span>}
        </div>
      )}
      {tooltip && <span id={tipId.current} className="sr-only">{tooltip}</span>}
      <div className="relative">
        <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          min={min} max={max} step={step} disabled={disabled}
          autoComplete={autoComplete}
          aria-label={ariaLabel || (label ? undefined : placeholder)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn("w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all",
            unit && "pr-12", disabled && "opacity-40 cursor-not-allowed",
            error && "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/30")} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40" aria-hidden="true">{unit}</span>}
      </div>
      {error && <span id={errId.current} role="alert" aria-live="polite" className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
        <span aria-hidden="true">⚠</span>{error}
      </span>}
    </div>
  );
}

export function Badge({ children, color="amber" }) {
  const colors = { amber:"bg-amber-500/15 text-amber-400 border-amber-500/20", green:"bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    red:"bg-red-500/15 text-red-400 border-red-500/20", blue:"bg-sky-500/15 text-sky-400 border-sky-500/20", purple:"bg-violet-500/15 text-violet-400 border-violet-500/20" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", colors[color])}>{children}</span>;
}

export function Card({ children, className="", title, badge, subtitle }) {
  return (
    <div className={cn("bg-white/[0.03] border border-white/[0.06] rounded-xl p-5", className)}>
      {(title||badge||subtitle) && <div className={cn("mb-4", subtitle ? "flex flex-col items-center gap-1" : "flex items-center")}>
        {!subtitle && badge && <div className="invisible pointer-events-none shrink-0">{badge}</div>}
        {title && <h3 className="flex-1 text-sm font-semibold uppercase tracking-wider opacity-70 text-center">{title}</h3>}
        {subtitle && <div className="shrink-0">{subtitle}</div>}
        {!subtitle && badge && <div className="shrink-0">{badge}</div>}
      </div>}
      {children}
    </div>
  );
}

export function ResultRow({ label, value, unit, status }) {
  const statusColors = { ok:"text-emerald-400", warn:"text-amber-400", fail:"text-red-400" };
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs opacity-60">{label}</span>
      <span className={cn("text-sm font-mono font-medium tabular-nums text-right", status ? statusColors[status] : "text-white")}>
        {value} {unit && <span className="opacity-40 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}
