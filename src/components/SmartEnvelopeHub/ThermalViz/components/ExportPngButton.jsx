/**
 * ExportPngButton — buton universal pentru export PNG.
 *
 * Primește un `getTarget()` care returnează fie un SVGElement, fie un HTMLElement.
 * Auto-detectează tipul și folosește utilitarul corespunzător din exportPng.js.
 */
import { useState } from "react";
import { exportSvgAsPng, exportDomAsPng, downloadBlob, buildExportFilename } from "../utils/exportPng.js";

export default function ExportPngButton({ getTarget, viewName, projectName, label = "Export PNG" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const el = getTarget?.();
      if (!el) throw new Error("Target indisponibil");
      let blob;
      if (el instanceof SVGElement) {
        blob = await exportSvgAsPng(el, { pixelRatio: 2 });
      } else {
        blob = await exportDomAsPng(el, { pixelRatio: 2 });
      }
      const filename = buildExportFilename(viewName, projectName);
      downloadBlob(blob, filename);
    } catch (e) {
      console.error("[ExportPng]", e);
      setError(e.message || "Eroare la export");
    } finally {
      setBusy(false);
      // Auto-clear eroare după 4s
      if (error) setTimeout(() => setError(null), 4000);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
          busy
            ? "border-white/10 bg-white/[0.02] text-white/40 cursor-wait"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-400/40"
        }`}
        title="Salvează vizualizarea curentă ca imagine PNG (pentru raportul de audit)"
      >
        <span aria-hidden="true">{busy ? "⏳" : "📷"}</span>
        <span>{busy ? "Se generează..." : label}</span>
      </button>
      {error && (
        <span className="text-[10px] text-red-300 bg-red-500/10 px-2 py-0.5 rounded" role="alert">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
