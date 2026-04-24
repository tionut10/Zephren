/**
 * ElementsList — 3 secțiuni listare în Hub (S4).
 *
 * Înlocuiește grid-ul legacy din Step2Envelope.jsx (liniile 93-222).
 * Secțiunile sunt COLLAPSIBLE — deschise by-default dacă au conținut.
 *
 *   1. Elemente opace       — ElementCard kind="opaque"   + buton „+Adaugă"
 *   2. Elemente vitrate     — ElementCard kind="glazing"  + buton „+Adaugă"
 *   3. Punți termice        — ThermalBridgeCard           + buton „+Adaugă" + link „Catalog"
 *
 * Empty states cu prompt spre RampGuided/RampInstant.
 */

import { useState } from "react";
import ElementCard from "./ElementCard.jsx";
import ThermalBridgeCard from "./ThermalBridgeCard.jsx";
import { cn } from "../ui.jsx";

function SectionHeader({ icon, title, count, expanded, onToggle, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded px-1"
      >
        <span className={cn("text-[10px] transition-transform", expanded && "rotate-90")}>▸</span>
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-[10px] font-mono text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded">
          {count}
        </span>
      </button>
      <div className="flex gap-2">
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="text-xs bg-white/5 text-white/60 px-3 py-1 rounded-lg hover:bg-white/10 border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onAction}
          className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon, text, hint }) {
  return (
    <div className="text-center py-6 opacity-30">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-xs">{text}</div>
      {hint && <div className="text-[10px] mt-1 opacity-70">{hint}</div>}
    </div>
  );
}

export default function ElementsList({
  // Data
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],

  // Context pt. status/U
  building,
  calcOpaqueR,
  ELEMENT_TYPES = [],

  // Callbacks CRUD
  onAddOpaque,
  onEditOpaque,
  onDeleteOpaque,
  onPreviewOpaque,
  onAddGlazing,
  onEditGlazing,
  onDeleteGlazing,
  onPreviewGlazing,
  onAddBridge,
  onEditBridge,
  onDeleteBridge,
  onPreviewBridge,
  onOpenBridgeCatalog,
}) {
  // Default expanded: secțiuni cu conținut sau prima când nu există nimic
  const [expOpaque, setExpOpaque]   = useState(true);
  const [expGlazing, setExpGlazing] = useState(true);
  const [expBridges, setExpBridges] = useState(true);

  return (
    <div className="space-y-5 px-4 pb-4 pt-3 border-t border-white/[0.06]">
      {/* ── Section 1: Elemente opace ─────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon="🧱"
          title="Elemente opace"
          count={opaqueElements.length}
          expanded={expOpaque}
          onToggle={() => setExpOpaque(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddOpaque}
        />
        {expOpaque && (
          opaqueElements.length === 0 ? (
            <EmptyState
              icon="🏗"
              text="Adaugă primul element opac (pereți, planșee, terasă)"
              hint="Folosește Hub-ul de mai sus sau „+Adaugă"
            />
          ) : (
            <div className="space-y-2">
              {opaqueElements.map((el, idx) => (
                <ElementCard
                  key={idx}
                  element={el}
                  index={idx}
                  kind="opaque"
                  buildingCategory={building?.category}
                  calcOpaqueR={calcOpaqueR}
                  ELEMENT_TYPES={ELEMENT_TYPES}
                  onEdit={onEditOpaque}
                  onDelete={onDeleteOpaque}
                  onPreview={onPreviewOpaque}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Section 2: Elemente vitrate ───────────────────────────────────── */}
      <div>
        <SectionHeader
          icon="🪟"
          title="Elemente vitrate"
          count={glazingElements.length}
          expanded={expGlazing}
          onToggle={() => setExpGlazing(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddGlazing}
        />
        {expGlazing && (
          glazingElements.length === 0 ? (
            <EmptyState
              icon="🪟"
              text="Adaugă ferestre și uși cu vitraje"
              hint='Hub „Ghidat" pentru wizard sau „+Adaugă"'
            />
          ) : (
            <div className="space-y-2">
              {glazingElements.map((el, idx) => (
                <ElementCard
                  key={idx}
                  element={el}
                  index={idx}
                  kind="glazing"
                  buildingCategory={building?.category}
                  onEdit={onEditGlazing}
                  onDelete={onDeleteGlazing}
                  onPreview={onPreviewGlazing}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Section 3: Punți termice ──────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon="🔗"
          title="Punți termice"
          count={thermalBridges.length}
          expanded={expBridges}
          onToggle={() => setExpBridges(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddBridge}
          secondaryLabel="📖 Catalog"
          onSecondary={onOpenBridgeCatalog}
        />
        {expBridges && (
          thermalBridges.length === 0 ? (
            <EmptyState
              icon="🔗"
              text="Adaugă punți termice (joncțiuni, console, glafuri)"
              hint='Hub „Instant" → Pachet 5 standard sau Hub „Ghidat" → Wizard punți'
            />
          ) : (
            <div className="space-y-2">
              {thermalBridges.map((b, idx) => (
                <ThermalBridgeCard
                  key={idx}
                  bridge={b}
                  index={idx}
                  onEdit={onEditBridge}
                  onDelete={onDeleteBridge}
                  onPreview={onPreviewBridge}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
