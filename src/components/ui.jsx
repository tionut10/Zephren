import { useState, useEffect, useRef } from "react";

export const cn = (...classes) => classes.filter(Boolean).join(" ");

export function Select({ label, value, onChange, options, placeholder, className="" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => (typeof o === "string" ? o : o.value) === value);
  const selectedLabel = selected ? (typeof selected === "string" ? selected : selected.label) : (placeholder || "Selecteaza...");

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={ref} style={{position:"relative"}}>
      {label && <label className="text-xs font-medium uppercase tracking-wider opacity-60">{label}</label>}
      <button type="button" onClick={() => setOpen(!open)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all flex items-center justify-between gap-2"
        style={{minHeight:"38px"}}>
        <span className={!selected && placeholder ? "opacity-40" : ""}>{selectedLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{flexShrink:0,transform:open?"rotate(180deg)":"",transition:"transform 0.15s"}}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          style={{top:"100%",background:"#1a1d2e",maxHeight:"240px",overflowY:"auto",scrollbarWidth:"thin"}}>
          {placeholder && (
            <div onClick={() => { onChange(""); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 transition-colors opacity-40">{placeholder}</div>
          )}
          {options.map((o, i) => {
            const val = typeof o === "string" ? o : o.value;
            const lab = typeof o === "string" ? o : o.label;
            const isActive = val === value;
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); }}
                className={cn("px-3 py-2 text-sm cursor-pointer transition-colors",
                  isActive ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/10")}>
                {lab}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Input({ label, value, onChange, type="text", unit, placeholder, min, max, step, className="", disabled=false, tooltip="" }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <label className="text-xs font-medium uppercase tracking-wider opacity-60">{label}{tooltip && <span className="ml-1 opacity-30 cursor-help" title={tooltip}>ⓘ</span>}</label>}
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          min={min} max={max} step={step} disabled={disabled}
          className={cn("w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all",
            unit && "pr-12", disabled && "opacity-40 cursor-not-allowed")} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40">{unit}</span>}
      </div>
    </div>
  );
}

export function Badge({ children, color="amber" }) {
  const colors = { amber:"bg-amber-500/15 text-amber-400 border-amber-500/20", green:"bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    red:"bg-red-500/15 text-red-400 border-red-500/20", blue:"bg-sky-500/15 text-sky-400 border-sky-500/20", purple:"bg-violet-500/15 text-violet-400 border-violet-500/20" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", colors[color])}>{children}</span>;
}

export function Card({ children, className="", title, badge }) {
  return (
    <div className={cn("bg-white/[0.03] border border-white/[0.06] rounded-xl p-5", className)}>
      {(title||badge) && <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70">{title}</h3>}
        {badge}
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
      <span className={cn("text-sm font-mono font-medium", status ? statusColors[status] : "text-white")}>
        {value} {unit && <span className="opacity-40 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}
