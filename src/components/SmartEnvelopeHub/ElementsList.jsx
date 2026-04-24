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

function SectionHeader({ icon, title, count, filteredCount, expanded, onToggle, actionLabel, onAction, secondaryLabel, onSecondary, searchValue, onSearchChange, showSearch }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded px-1"
        >
          <span className={cn("text-[10px] transition-transform", expanded && "rotate-90")}>▸</span>
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-[10px] font-mono text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded">
            {filteredCount !== undefined && filteredCount !== count ? `${filteredCount}/${count}` : count}
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
      {showSearch && expanded && count > 5 && (
        <div className="mt-2 relative">
          <input
            type="text"
            value={searchValue || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="🔍 Caută după nume, orientare, tip…"
            className="w-full text-xs bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/30 placeholder-white/30"
            aria-label={`Caută în ${title}`}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange?.("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white/60 text-[10px] flex items-center justify-center"
              aria-label="Șterge căutarea"
            >✕</button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper — filtrare elemente pe baza unui query simplu
function filterElements(list, query, kind) {
  if (!query || !query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(el => {
    const fields = kind === "bridge"
      ? [el.name, el.cat]
      : [el.name, el.orientation, el.type, el.glazingType, el.frameType];
    return fields.filter(Boolean).some(f => String(f).toLowerCase().includes(q));
  });
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
  onDuplicateOpaque,
  onAddGlazing,
  onEditGlazing,
  onDeleteGlazing,
  onPreviewGlazing,
  onDuplicateGlazing,
  onAddBridge,
  onEditBridge,
  onDeleteBridge,
  onPreviewBridge,
  onDuplicateBridge,
  onOpenBridgeCatalog,
}) {
  // Default expanded: secțiuni cu conținut sau prima când nu există nimic
  const [expOpaque, setExpOpaque]   = useState(true);
  const [expGlazing, setExpGlazing] = useState(true);
  const [expBridges, setExpBridges] = useState(true);

  // Search queries per secțiune (active doar când >5 elemente)
  const [searchOpaque, setSearchOpaque]   = useState("");
  const [searchGlazing, setSearchGlazing] = useState("");
  const [searchBridges, setSearchBridges] = useState("");

  const filteredOpaque   = filterElements(opaqueElements, searchOpaque, "opaque");
  const filteredGlazing  = filterElements(glazingElements, searchGlazing, "glazing");
  const filteredBridges  = filterElements(thermalBridges, searchBridges, "bridge");

  return (
    <div className="space-y-5 px-4 pb-4 pt-3 border-t border-white/[0.06]">
      {/* ── Section 1: Elemente opace ─────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon="🧱"
          title="Elemente opace"
          count={opaqueElements.length}
          filteredCount={filteredOpaque.length}
          expanded={expOpaque}
          onToggle={() => setExpOpaque(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddOpaque}
          showSearch
          searchValue={searchOpaque}
          onSearchChange={setSearchOpaque}
        />
        {expOpaque && (
          opaqueElements.length === 0 ? (
            <EmptyState
              icon="🏗"
              text="Adaugă primul element opac (pereți, planșee, terasă)"
              hint="Folosește Hub-ul de mai sus sau „+Adaugă"
            />
          ) : filteredOpaque.length === 0 ? (
            <div className="text-center py-4 text-xs opacity-40">Niciun rezultat pentru „{searchOpaque}"</div>
          ) : (
            <div className="space-y-2">
              {filteredOpaque.map((el) => {
                const idx = opaqueElements.indexOf(el);
                return (
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
                    onDuplicate={onDuplicateOpaque}
                  />
                );
              })}
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
          filteredCount={filteredGlazing.length}
          expanded={expGlazing}
          onToggle={() => setExpGlazing(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddGlazing}
          showSearch
          searchValue={searchGlazing}
          onSearchChange={setSearchGlazing}
        />
        {expGlazing && (
          glazingElements.length === 0 ? (
            <EmptyState
              icon="🪟"
              text="Adaugă ferestre și uși cu vitraje"
              hint='Hub „Ghidat" pentru wizard sau „+Adaugă"'
            />
          ) : filteredGlazing.length === 0 ? (
            <div className="text-center py-4 text-xs opacity-40">Niciun rezultat pentru „{searchGlazing}"</div>
          ) : (
            <div className="space-y-2">
              {filteredGlazing.map((el) => {
                const idx = glazingElements.indexOf(el);
                return (
                  <ElementCard
                    key={idx}
                    element={el}
                    index={idx}
                    kind="glazing"
                    buildingCategory={building?.category}
                    onEdit={onEditGlazing}
                    onDelete={onDeleteGlazing}
                    onPreview={onPreviewGlazing}
                    onDuplicate={onDuplicateGlazing}
                  />
                );
              })}
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
          filteredCount={filteredBridges.length}
          expanded={expBridges}
          onToggle={() => setExpBridges(v => !v)}
          actionLabel="+ Adaugă"
          onAction={onAddBridge}
          secondaryLabel="📖 Catalog"
          onSecondary={onOpenBridgeCatalog}
          showSearch
          searchValue={searchBridges}
          onSearchChange={setSearchBridges}
        />
        {expBridges && (
          thermalBridges.length === 0 ? (
            <EmptyState
              icon="🔗"
              text="Adaugă punți termice (joncțiuni, console, glafuri)"
              hint='Hub „Instant" → Pachet 5 standard sau Hub „Ghidat" → Wizard punți'
            />
          ) : filteredBridges.length === 0 ? (
            <div className="text-center py-4 text-xs opacity-40">Niciun rezultat pentru „{searchBridges}"</div>
          ) : (
            <div className="space-y-2">
              {filteredBridges.map((b) => {
                const idx = thermalBridges.indexOf(b);
                return (
                  <ThermalBridgeCard
                    key={idx}
                    bridge={b}
                    index={idx}
                    onEdit={onEditBridge}
                    onDelete={onDeleteBridge}
                    onPreview={onPreviewBridge}
                    onDuplicate={onDuplicateBridge}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
