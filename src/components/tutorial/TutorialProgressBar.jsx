// ═════════════════════════════════════════════════════════════════════════════
// TutorialProgressBar — bara de progres globală (0-100%)
// Folosită în header-ul TutorialLayout
// ═════════════════════════════════════════════════════════════════════════════

import { cn } from "../ui.jsx";

export default function TutorialProgressBar({ progress, colorGradient }) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <div className="h-1 bg-slate-900 overflow-hidden">
      <div
        className={cn("h-full transition-all duration-500 bg-gradient-to-r", colorGradient || "from-amber-500 to-amber-400")}
        style={{ width: `${p}%` }}
        role="progressbar"
        aria-valuenow={p}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progres tutorial: ${p}%`}
      />
    </div>
  );
}
