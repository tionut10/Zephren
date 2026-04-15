/**
 * ThermalVizModal — container full-screen cu tabs A/B/C pentru vizualizarea termică.
 *
 * Tabs:
 *   A) Clădire 3D (Building3D)     — schemă rotabilă cu heatmap pe fețe
 *   B) Secțiune perete (WallSection)    — Faza 2 (placeholder deocamdată)
 *   C) Izoterme punți (BridgeIsotherms) — Faza 3 (placeholder deocamdată)
 *
 * Focus trap, ESC close, overlay click close.
 */
import { useEffect, useState, useCallback } from "react";
import Building3D from "./views/Building3D.jsx";
import ColorModeToggle, { getSavedColorMode } from "./components/ColorModeToggle.jsx";
import HeatLegend from "./components/HeatLegend.jsx";

const TABS = [
  { id: "building", icon: "🏠", label: "Clădire 3D", hint: "Schemă generală + heatmap" },
  { id: "section",  icon: "🧱", label: "Secțiune perete", hint: "Gradient temperaturi prin straturi" },
  { id: "bridges",  icon: "🔗", label: "Izoterme punți", hint: "Joncțiuni cu linii izoterme" },
];

export default function ThermalVizModal({
  isOpen,
  onClose,
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  building = {},
  climate = {},
  calcOpaqueR,
}) {
  const [activeTab, setActiveTab] = useState("building");
  const [colorMode, setColorMode] = useState(() => getSavedColorMode());
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedBridge, setSelectedBridge] = useState(null);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Blochează scroll body când modalul e deschis
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const handleSelectElement = useCallback((rect) => {
    setSelectedElement(rect);
    // Când avem view B implementat: setActiveTab("section")
  }, []);

  const handleSelectBridge = useCallback((edge) => {
    setSelectedBridge(edge);
    // Când avem view C implementat: setActiveTab("bridges")
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="thermal-viz-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="w-full h-full max-w-[1400px] max-h-[900px] flex flex-col rounded-2xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
          <span className="text-xl" aria-hidden="true">🌡️</span>
          <div className="flex-1 min-w-0">
            <h2 id="thermal-viz-title" className="text-sm font-semibold text-white truncate">
              Vizualizare interactivă transfer termic
            </h2>
            <div className="text-[10px] text-white/50 truncate">
              {building?.name || "Clădire"} · ΔT = {(climate?.T_int ?? 20) - (climate?.T_ext ?? -15)} K ·
              {" "}{opaqueElements.length} opace · {glazingElements.length} vitrate · {thermalBridges.length} punți
            </div>
          </div>
          <ColorModeToggle mode={colorMode} onChange={setColorMode} />
          <button
            onClick={onClose}
            aria-label="Închide vizualizarea"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 px-3 py-2 border-b border-white/[0.06] bg-white/[0.01]">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                activeTab === t.id
                  ? "bg-indigo-500/20 text-indigo-100 border border-indigo-400/30"
                  : "text-white/60 hover:text-white/90 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              <span className="hidden sm:inline text-[10px] text-white/40">— {t.hint}</span>
            </button>
          ))}
        </div>

        {/* Body: vederea activă + legendă laterală */}
        <div className="flex-1 flex overflow-hidden">
          {/* View principală */}
          <div className="flex-1 min-w-0 relative">
            {activeTab === "building" && (
              <Building3D
                opaqueElements={opaqueElements}
                glazingElements={glazingElements}
                thermalBridges={thermalBridges}
                building={building}
                climate={climate}
                calcOpaqueR={calcOpaqueR}
                colorMode={colorMode}
                onSelectElement={handleSelectElement}
                onSelectBridge={handleSelectBridge}
              />
            )}

            {activeTab === "section" && (
              <PlaceholderView
                icon="🧱"
                title="Secțiune prin perete — Faza 2"
                message="Această vedere va fi adăugată în etapa următoare. Va afișa straturile peretelui cu gradient de temperatură și curba T prin perete (interior → exterior)."
                selectedName={selectedElement?.element?.name}
              />
            )}

            {activeTab === "bridges" && (
              <PlaceholderView
                icon="🔗"
                title="Izoterme punți termice — Faza 3"
                message="Această vedere va fi adăugată în etapa finală. Va afișa joncțiunea cu backdrop SVG din catalog și overlay izoterme schematice."
                selectedName={selectedBridge?.bridge?.name}
              />
            )}
          </div>

          {/* Legendă laterală (desktop) */}
          <aside className="hidden lg:flex flex-col w-56 border-l border-white/[0.06] bg-white/[0.01] p-3 gap-3 overflow-y-auto">
            <HeatLegend mode={colorMode} />
            <div className="border-t border-white/[0.06] pt-3 text-[10px] text-white/50 space-y-1">
              <div className="font-semibold text-white/70 uppercase tracking-wider">Convenții</div>
              <p>• Culori = transmitanță termică U.</p>
              <p>• Bare luminoase pe muchii = punți termice (intensitate ∝ ψ·L).</p>
              <p>• Schema e parametrică (cutie dreptunghiulară), nu plan arhitectural real.</p>
            </div>
            <div className="border-t border-white/[0.06] pt-3 text-[10px] text-white/40 italic">
              Faza 1 (3D clădire) · Faza 2-3 în curs.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder pentru view-urile Faza 2/3 ───────────────────────────────────
function PlaceholderView({ icon, title, message, selectedName }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-3" aria-hidden="true">{icon}</div>
        <div className="text-base font-semibold text-white/90 mb-2">{title}</div>
        <div className="text-xs text-white/60 leading-relaxed">{message}</div>
        {selectedName && (
          <div className="mt-4 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Element selectat: <span className="font-semibold">{selectedName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
