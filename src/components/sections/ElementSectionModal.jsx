/**
 * ElementSectionModal.jsx — Modal full-screen unificat pentru vizualizarea detaliată
 * a secțiunilor de elemente (opac / vitrat / punte termică).
 *
 * Props:
 *   type: "opaque" | "glazing" | "bridge"
 *   element: obiectul corespunzător tipului
 *   climate: opțional pentru profil T (opaque)
 *   tInt: temperatură interior (opaque)
 *   bridgeDetails: metadata (fRsi, priority, isoClass) pentru bridge
 *   onClose: handler închidere
 */

import { useRef, useEffect } from "react";
import OpaqueSection from "./OpaqueSection.jsx";
import GlazingSection from "./GlazingSection.jsx";
import BridgeIllustration from "../thermal-bridges/bridgeIllustrations.jsx";

export default function ElementSectionModal({
  type,
  element,
  climate,
  tInt = 20,
  bridgeDetails,
  onClose,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();        // împiedică propagarea spre handler-ul catalogului
        e.preventDefault();
        onClose?.();
      }
    };
    // capture-phase ca să prindem Escape ÎNAINTEA altor handler-e (ex. catalogul de punți)
    document.addEventListener("keydown", handleKey, { capture: true });
    return () => document.removeEventListener("keydown", handleKey, { capture: true });
  }, [onClose]);

  function handleExportSVG() {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sectiune_${element?.name || "element"}.svg`.replace(/\s+/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportPNG() {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    // Render la 2x densitate pentru calitate bună
    const bbox = svg.getBBox?.() || { width: 800, height: 500 };
    const w = Math.max(800, bbox.width * 2);
    const h = Math.max(500, bbox.height * 2);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = function () {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dl;
        a.download = `sectiune_${element?.name || "element"}.png`.replace(/\s+/g, "_");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(dl);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const title =
    type === "opaque" ? `Secțiune element opac: ${element?.name || "—"}` :
    type === "glazing" ? `Secțiune element vitrat: ${element?.name || "—"}` :
    type === "bridge" ? `Secțiune punte termică: ${element?.name || "—"}` :
    "Secțiune element";

  // Punțile termice au nevoie de mai mult spațiu — folosim aproape întreg ecranul
  const widthClass =
    type === "bridge" ? "max-w-[96vw] xl:max-w-[1400px]" :
    type === "opaque" ? "max-w-6xl" :
    "max-w-5xl";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose?.(); }}
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`bg-[#0f1220] border border-white/10 rounded-2xl w-full ${widthClass} max-h-[96vh] flex flex-col overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">
              {type === "opaque" ? "🧱" : type === "glazing" ? "🪟" : "🔶"}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{title}</div>
              <div className="text-[11px] opacity-65 mt-0.5">
                {type === "opaque" ? "Secțiune verticală la scală · cote · profil termic"
                  : type === "glazing" ? "Secțiune plan · ramă + pachet sticlă + camere gaz · Low-E"
                  : "Secțiune constructivă · flux termic · zone condens"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExportSVG}
              className="px-3 py-1.5 text-[11px] rounded-lg border border-white/15 hover:bg-white/10 transition-colors font-mono"
              title="Exportă secțiunea ca fișier SVG (vector)"
            >
              ⬇ SVG
            </button>
            <button
              onClick={handleExportPNG}
              className="px-3 py-1.5 text-[11px] rounded-lg border border-white/15 hover:bg-white/10 transition-colors font-mono"
              title="Exportă secțiunea ca PNG 2x"
            >
              ⬇ PNG
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/10 hover:bg-white/5 flex items-center justify-center text-sm"
              aria-label="Închide"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-5">
          {type === "opaque" && element && (
            <OpaqueSection
              element={element}
              climate={climate}
              tInt={tInt}
              width={720}
              height={340}
              showTemperatureProfile={true}
              showDimensions={true}
              showLegend={true}
              compact={false}
            />
          )}
          {type === "glazing" && element && (
            <GlazingSection
              element={element}
              width={720}
              height={280}
              showDimensions={true}
              showLegend={true}
              compact={false}
            />
          )}
          {type === "bridge" && element && (
            <div className="space-y-4">
              <div className="bg-[#f7f3e8] rounded-xl overflow-hidden border border-white/5 max-w-[1280px] mx-auto">
                <BridgeIllustration
                  bridge={element}
                  details={bridgeDetails}
                  mode="detail"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-[1280px] mx-auto">
                {/* Card metadata stânga */}
                {bridgeDetails && (
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {bridgeDetails.isoClass && (
                      <div className="p-2 rounded bg-white/[0.03] border border-white/5"><b>ISO 14683:</b> clasa {bridgeDetails.isoClass}</div>
                    )}
                    {bridgeDetails.fRsi != null && (
                      <div className="p-2 rounded bg-white/[0.03] border border-white/5"><b>fRsi:</b> {bridgeDetails.fRsi.toFixed(2)}</div>
                    )}
                    {bridgeDetails.priority != null && (
                      <div className="p-2 rounded bg-white/[0.03] border border-white/5"><b>Prioritate:</b> {bridgeDetails.priority}/5</div>
                    )}
                  </div>
                )}
                {/* Card Ψ — badge mare lizibil dreapta */}
                {element.psi != null && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="font-mono font-bold text-amber-400 text-lg">Ψ = {element.psi} W/(m·K)</div>
                    {element.psi_izolat != null && (
                      <div className="text-[11px] opacity-70 mt-1">Izolat: Ψ = {element.psi_izolat} (−{Math.round((1 - element.psi_izolat / element.psi) * 100)}%)</div>
                    )}
                  </div>
                )}
              </div>
              {/* Descriere normativă */}
              {element.description && (
                <div className="max-w-[1280px] mx-auto p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[12px] leading-relaxed">
                  {element.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-white/10 bg-white/[0.02] flex justify-between text-[10px] opacity-65">
          <span>Click afară sau Esc pentru închidere</span>
          <span>
            {type === "opaque" ? "SR EN ISO 6946 · C107/3"
              : type === "glazing" ? "SR EN ISO 10077-1 · EN 673"
              : "SR EN ISO 14683 · Mc 001-2022"}
          </span>
        </div>
      </div>
    </div>
  );
}
