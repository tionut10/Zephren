/**
 * ThermalVizButton — trigger pentru ThermalVizModal.
 * Self-contained: ține state-ul isOpen intern și transmite props-urile de date modalului.
 * Disabled dacă nu există niciun element de anvelopă (opac + vitrat + punte = 0).
 */
import { useState } from "react";
import ThermalVizModal from "./ThermalVizModal.jsx";

export default function ThermalVizButton({
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  building = {},
  climate = {},
  calcOpaqueR,
  variant = "default",   // "default" | "compact"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const totalCount = opaqueElements.length + glazingElements.length + thermalBridges.length;
  const disabled = totalCount === 0;

  const buttonBase =
    "inline-flex items-center gap-2 rounded-lg border font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60";
  const activeClasses = disabled
    ? "border-white/10 bg-white/[0.02] text-white/30 cursor-not-allowed"
    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-400/40 cursor-pointer";

  const sizeClasses = variant === "compact"
    ? "px-2.5 py-1 text-[11px]"
    : "px-3 py-1.5 text-xs";

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        aria-label="Deschide vizualizarea termică interactivă"
        title={disabled
          ? "Adaugă cel puțin un element de anvelopă pentru a vizualiza"
          : "Vizualizare termică 3D — transfer căldură prin anvelopă"}
        className={`${buttonBase} ${activeClasses} ${sizeClasses}`}
      >
        <span aria-hidden="true">🌡️</span>
        <span>Vizualizare termică</span>
        {!disabled && totalCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-100 font-mono">
            {totalCount}
          </span>
        )}
      </button>

      <ThermalVizModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        opaqueElements={opaqueElements}
        glazingElements={glazingElements}
        thermalBridges={thermalBridges}
        building={building}
        climate={climate}
        calcOpaqueR={calcOpaqueR}
      />
    </>
  );
}
