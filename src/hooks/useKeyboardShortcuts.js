/**
 * useKeyboardShortcuts — pct. 41
 * Shortcuts globale: navigare pași, export, undo/redo
 */
import { useEffect, useCallback } from "react";

export function useKeyboardShortcuts({
  setStep,
  undo, redo,
  exportProject,
  exportCSV,
  showToast,
  enabled = true,
}) {
  const handleKey = useCallback((e) => {
    if (!enabled) return;
    // Ignoră când userul scrie în input/textarea
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.target?.contentEditable === "true") return;

    const ctrl = e.ctrlKey || e.metaKey;

    // Navigare pași: Alt+1 ... Alt+8
    if (e.altKey && !ctrl && e.key >= "1" && e.key <= "8") {
      e.preventDefault();
      setStep?.(parseInt(e.key));
      showToast?.(`Pas ${e.key}`, "info");
      return;
    }

    // Ctrl+Z / Ctrl+Y — Undo/Redo
    if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo?.(); return; }
    if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo?.(); return; }

    // Ctrl+S — Export JSON
    if (ctrl && e.key === "s") { e.preventDefault(); exportProject?.(); showToast?.("Proiect salvat (JSON)", "success"); return; }

    // Ctrl+E — Export CSV
    if (ctrl && e.key === "e") { e.preventDefault(); exportCSV?.(); return; }

    // Săgeți stânga/dreapta — navigare pași (când nu e input activ)
    if (e.key === "ArrowRight" && ctrl) {
      e.preventDefault();
      setStep?.(s => Math.min(8, (s || 1) + 1));
      return;
    }
    if (e.key === "ArrowLeft" && ctrl) {
      e.preventDefault();
      setStep?.(s => Math.max(1, (s || 1) - 1));
      return;
    }
  }, [enabled, setStep, undo, redo, exportProject, exportCSV, showToast]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}

// Lista shortcuts pentru afișare în UI (Help modal)
export const SHORTCUTS_LIST = [
  { keys: ["Alt", "1-8"], desc: "Navigare rapidă la pasul 1-8" },
  { keys: ["Ctrl", "→"], desc: "Pasul următor" },
  { keys: ["Ctrl", "←"], desc: "Pasul anterior" },
  { keys: ["Ctrl", "Z"], desc: "Undo" },
  { keys: ["Ctrl", "Y"], desc: "Redo" },
  { keys: ["Ctrl", "S"], desc: "Salvare JSON" },
  { keys: ["Ctrl", "E"], desc: "Export CSV" },
  { keys: ["Esc"], desc: "Închide modal activ" },
];
