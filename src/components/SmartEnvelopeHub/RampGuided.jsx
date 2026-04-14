/**
 * RampGuided (anvelopă) — COMPLET S4.
 *
 * Completare ghidată pas cu pas. 5 acțiuni active:
 *   ├─ 🧱 Wizard perete în 3 pași (D5) — WizardOpaque
 *   ├─ 🪟 Wizard vitraj în 3 pași     — WizardGlazing
 *   ├─ 🔗 Wizard punți termice        — WizardBridges (quick-picks + bulk)
 *   ├─ 💬 Asistent anvelopă            — EnvelopeAssistant (chat local heuristic)
 *   └─ 🎓 Tutorial interactiv          — TutorialEnvelope (5 pași)
 *
 * + Shortcut „Editor clasic element opac" → OpaqueModal existent (experți).
 */

import { useState } from "react";
import WizardOpaque from "./WizardOpaque.jsx";
import WizardGlazing from "./WizardGlazing.jsx";
import WizardBridges from "./WizardBridges.jsx";
import EnvelopeAssistant from "./EnvelopeAssistant.jsx";
import TutorialEnvelope from "./TutorialEnvelope.jsx";

function ActiveAction({ icon, title, description, onClick, accent = "violet" }) {
  const accentMap = {
    violet:  { border: "border-violet-500/25",  bg: "bg-violet-500/5",  hover: "hover:bg-violet-500/10",  text: "text-violet-300"  },
    indigo:  { border: "border-indigo-500/25",  bg: "bg-indigo-500/5",  hover: "hover:bg-indigo-500/10",  text: "text-indigo-300"  },
    emerald: { border: "border-emerald-500/25", bg: "bg-emerald-500/5", hover: "hover:bg-emerald-500/10", text: "text-emerald-300" },
  };
  const c = accentMap[accent] || accentMap.violet;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border ${c.border} ${c.bg} ${c.hover} ${c.text} text-left transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold group-hover:brightness-110">{title}</div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>
    </button>
  );
}

export default function RampGuided({
  // State (read-only)
  building,
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  envelopeSummary,
  calcOpaqueR,

  // Handlers pentru wizard-uri (cablate în SmartEnvelopeHub)
  onSaveOpaqueFromWizard,        // (el) => append la opaqueElements
  onSaveGlazingFromWizard,       // (el) => append la glazingElements
  onAddBridgesBulk,              // (bridges[]) => append la thermalBridges

  // Fallback-uri
  setEditingOpaque,
  setShowOpaqueModal,
  setShowBridgeCatalog,          // deschide ThermalBridgeCatalog extins
  onLoadDemoTutorial,            // tutorial final → încarcă demo
  onSwitchRamp,                  // (rampId) → schimbă tab curent în Hub

  showToast,
}) {
  const [showWizardOpaque, setShowWizardOpaque] = useState(false);
  const [showWizardGlazing, setShowWizardGlazing] = useState(false);
  const [showWizardBridges, setShowWizardBridges] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Handler: salvare element opac din wizard
  const handleSaveOpaque = (element) => {
    onSaveOpaqueFromWizard?.(element);
    showToast?.(`✓ Element „${element.name}" adăugat`, "success");
  };

  // Handler: salvare vitraj din wizard
  const handleSaveGlazing = (element) => {
    onSaveGlazingFromWizard?.(element);
    showToast?.(`✓ Vitraj „${element.name}" adăugat`, "success");
  };

  // Handler: deschide editor avansat (OpaqueModal) din wizard pas 3
  const handleOpenAdvanced = (prePopulated) => {
    setShowWizardOpaque(false);
    setEditingOpaque?.(prePopulated || null);
    setShowOpaqueModal?.(true);
  };

  // Handler: bulk add punți
  const handleAddBridgesBulk = (bridges) => {
    onAddBridgesBulk?.(bridges);
    showToast?.(`✓ ${bridges.length} punți adăugate`, "success");
  };

  // Handler: link "Acționează" din chat
  const handleChatAction = (kind) => {
    if (kind === "opaque")             setShowWizardOpaque(true);
    else if (kind === "glazing")       setShowWizardGlazing(true);
    else if (kind === "bridges")       setShowWizardBridges(true);
    else if (kind === "instant")       onSwitchRamp?.("instant");
    else if (kind === "scroll-compliance") {
      // Scroll la tabelul de conformitate (rendered în Step2Envelope)
      const el = document.querySelector('[data-compliance-table]');
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-violet-200/70 mb-2">
        🧭 Completare ghidată pas cu pas — wizard-uri + asistent local + tutorial.
      </div>

      {/* Wizard perete (D5) */}
      <ActiveAction
        icon="🧱"
        title="Wizard: adaugă perete în 3 pași"
        description="Pas 1: tip + orientare. Pas 2: straturi cu preset-uri populare. Pas 3: preview U + editor avansat."
        onClick={() => setShowWizardOpaque(true)}
      />

      {/* Wizard vitraj */}
      <ActiveAction
        icon="🪟"
        title="Wizard: adaugă vitraj în 3 pași"
        description="Selector vizual vitraj + ramă + fracție. Calcul U cu ψ_spacer (ISO 10077-1)."
        onClick={() => setShowWizardGlazing(true)}
      />

      {/* Wizard punți */}
      <ActiveAction
        icon="🔗"
        title="Wizard: identifică punți termice"
        description="6 categorii × top 4 quick-picks. Lungimi sugerate din geometrie. Aplicare bulk."
        onClick={() => setShowWizardBridges(true)}
      />

      {/* Asistent anvelopă */}
      <ActiveAction
        icon="💬"
        title="Asistent anvelopă"
        description='„Ce elemente am uitat?" · „Verifică-mi conformitatea U" · „Pot îmbunătăți G-ul?"'
        onClick={() => setShowAssistant(true)}
        accent="indigo"
      />

      {/* Tutorial interactiv */}
      <ActiveAction
        icon="🎓"
        title="Tutorial interactiv anvelopă"
        description="5 pași despre elemente, straturi, punți, conformitate — ideal pentru începători."
        onClick={() => setShowTutorial(true)}
        accent="emerald"
      />

      {/* Shortcut către OpaqueModal existent */}
      <div className="pt-2 mt-2 border-t border-white/[0.06]">
        <ActiveAction
          icon="✍️"
          title="Editor clasic element opac (OpaqueModal)"
          description="Formular avansat actual — control total pe straturi. Accesibil și din Pas 3 al wizard-ului."
          onClick={() => { setEditingOpaque?.(null); setShowOpaqueModal?.(true); }}
        />
      </div>

      {/* ── Overlay wizards/modals ─────────────────────────────────────── */}
      {showWizardOpaque && (
        <WizardOpaque
          onSave={handleSaveOpaque}
          onClose={() => setShowWizardOpaque(false)}
          onOpenAdvanced={handleOpenAdvanced}
          calcOpaqueR={calcOpaqueR}
          buildingCategory={building?.category}
        />
      )}

      {showWizardGlazing && (
        <WizardGlazing
          onSave={handleSaveGlazing}
          onClose={() => setShowWizardGlazing(false)}
          buildingCategory={building?.category}
        />
      )}

      {showWizardBridges && (
        <WizardBridges
          onAddBulk={handleAddBridgesBulk}
          onClose={() => setShowWizardBridges(false)}
          onOpenCatalog={() => setShowBridgeCatalog?.(true)}
          building={building}
          existingBridges={thermalBridges}
        />
      )}

      {showAssistant && (
        <EnvelopeAssistant
          onClose={() => setShowAssistant(false)}
          onActionLink={handleChatAction}
          building={building}
          opaqueElements={opaqueElements}
          glazingElements={glazingElements}
          thermalBridges={thermalBridges}
          envelopeSummary={envelopeSummary}
          calcOpaqueR={calcOpaqueR}
        />
      )}

      {showTutorial && (
        <TutorialEnvelope
          onClose={() => setShowTutorial(false)}
          onLoadDemo={onLoadDemoTutorial}
        />
      )}
    </div>
  );
}
