/**
 * ColorModeToggle — switcher între paleta gradient continuă și trepte nZEB.
 * Starea se persistă în localStorage (cheia "zephren-thermal-color-mode").
 */
import { useEffect } from "react";

const STORAGE_KEY = "zephren-thermal-color-mode";

export function getSavedColorMode() {
  if (typeof window === "undefined") return "continuous";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "discrete" || v === "continuous" ? v : "continuous";
  } catch {
    return "continuous";
  }
}

export default function ColorModeToggle({ mode, onChange }) {
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const btn = (id, icon, label) => (
    <button
      key={id}
      type="button"
      onClick={() => onChange(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
        mode === id
          ? "bg-indigo-500/25 text-indigo-100 shadow-inner"
          : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
      }`}
      aria-pressed={mode === id}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Paletă culori vizualizare termică"
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
    >
      {btn("continuous", "🌡️", "Gradient")}
      {btn("discrete",   "📊", "Trepte nZEB")}
    </div>
  );
}
