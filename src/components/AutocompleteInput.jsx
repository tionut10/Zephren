import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";

/**
 * AutocompleteInput — câmp text cu dropdown de sugestii
 *
 * Props:
 *   label        — etichetă
 *   value        — valoarea curentă (controlled)
 *   onChange     — callback(value: string)
 *   onSelect     — callback(item: object) — apelat când utilizatorul selectează o sugestie
 *   suggestions  — array de string-uri sau obiecte { label, value, sub }
 *   onSearch     — async fn(query) => items[] — fetch dinamic (ex: OSM)
 *   debounce     — ms debounce pentru onSearch (default 300)
 *   placeholder  — placeholder
 *   className    — clase suplimentare
 *   maxItems     — max sugestii afișate (default 8)
 *   disabled     — dezactivat
 */
export default function AutocompleteInput({
  label,
  value = "",
  onChange,
  onSelect,
  suggestions = [],
  onSearch,
  debounce: debounceMs = 300,
  placeholder = "",
  className = "",
  maxItems = 8,
  disabled = false,
  onFocusCapture,
  autoComplete,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const timerRef = useRef(null);
  const mouseDownRef = useRef(false);
  const justSelectedRef = useRef(false);
  // Ref stabil pentru suggestions — evită recrearea filterLocal la fiecare render
  const suggestionsRef = useRef(suggestions);
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);

  // Filtrare locală din `suggestions` — deps stabile (nu include suggestions direct)
  const filterLocal = useCallback((q) => {
    if (!q || q.length < 1) return [];
    const lower = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (suggestionsRef.current || [])
      .filter((s) => {
        const text = (typeof s === "string" ? s : s.label || s.value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return text.startsWith(lower) || text.includes(lower);
      })
      .slice(0, maxItems)
      .map((s) => (typeof s === "string" ? { label: s, value: s } : s));
  }, [maxItems]); // suggestions accesat prin ref, nu prin dep

  // Actualizează sugestiile când se schimbă valoarea
  useEffect(() => {
    // Nu redeschide dropdown-ul dacă tocmai s-a selectat o sugestie
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const q = value?.trim() || "";
    if (!q || q.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }

    // Sugestii locale imediate
    const localItems = filterLocal(q);
    if (localItems.length > 0 || !onSearch) {
      setItems(localItems);
      setOpen(localItems.length > 0);
    }

    // Fetch dinamic dacă există `onSearch`
    if (onSearch && q.length >= 2) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const result = await onSearch(q);
          if (result?.length > 0) {
            setItems(result.slice(0, maxItems));
            setOpen(true);
          }
        } catch {
          // ignoră erori de fetch
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    }

    return () => clearTimeout(timerRef.current);
  }, [value, filterLocal, onSearch, debounceMs, maxItems]);

  // Reset index la schimbarea listei
  useEffect(() => { setActiveIdx(-1); }, [items]);

  const handleSelect = (item) => {
    const val = typeof item === "string" ? item : item.value || item.label;
    justSelectedRef.current = true;
    onChange?.(val);
    onSelect?.(item);
    setOpen(false);
    setItems([]);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(items[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // Scroll activ în view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx];
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={ariaLabel || label}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            onFocusCapture?.();
            if (items.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // Întârziere pentru a permite click pe item
            if (!mouseDownRef.current) setOpen(false);
          }}
          className={cn(
            "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm",
            "focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] transition-all",
            "placeholder:opacity-20",
            disabled && "opacity-40 cursor-not-allowed"
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-amber-400 border-t-transparent animate-spin" />
        )}
      </div>

      {open && items.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-2xl overflow-hidden"
          style={{ maxHeight: "240px", overflowY: "auto" }}
        >
          <ul ref={listRef} className="py-1">
            {items.map((item, i) => {
              const label_ = typeof item === "string" ? item : item.label || item.value;
              const sub = typeof item === "object" ? item.sub : null;
              return (
                <li
                  key={i}
                  onMouseDown={() => { mouseDownRef.current = true; }}
                  onMouseUp={() => { mouseDownRef.current = false; }}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors",
                    i === activeIdx
                      ? "bg-amber-500/15 text-amber-300"
                      : "hover:bg-white/[0.05] text-white/80"
                  )}
                >
                  <span>{label_}</span>
                  {sub && (
                    <span className="text-[10px] opacity-40 ml-2 shrink-0">{sub}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
