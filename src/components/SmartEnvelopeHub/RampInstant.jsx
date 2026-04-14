/**
 * RampInstant (anvelopă) — COMPLETARE S3 (14.04.2026).
 *
 * 4 acțiuni instantanee, derivate 100% din DEMO_PROJECTS:
 *   1. 8 șabloane tipologii (envelopeTemplates.js) — categorizate
 *   2. Selector 20 demo-uri — aplicare selectivă { opaque, glazing, bridges } (D6)
 *   3. Pachet 5 punți termice standard (D1) — cu confirmation + warning
 *   4. 4 pereți N/S/E/V din geometria Step 1 (+ acoperiș + planșeu)
 *
 * Shortcut-uri directe (pentru auditori experimentați):
 *   + Element opac · + Element vitrat · Catalog punți
 *
 * Toate acțiunile cu warning de „estimare orientativă" unde e cazul (D1).
 */

import { useState, useMemo } from "react";
import { ENVELOPE_TEMPLATES, groupTemplatesByCategory } from "./utils/envelopeTemplates.js";
import { canGenerateFromGeometry } from "./utils/geometryToAreas.js";
import { STANDARD_BRIDGES_PACK_WARNING } from "./utils/applyStandardBridgesPack.js";
import { DEMO_PROJECTS } from "../../data/demoProjects.js";

// ── Acțiune primară (activă / dezactivată) ─────────────────────────────────
function ActionCard({ icon, title, description, badge, disabled, disabledReason, onClick }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all group ${
        disabled
          ? "border-white/[0.06] bg-white/[0.015] text-white/30 cursor-not-allowed"
          : "border-amber-500/25 bg-amber-500/[0.04] hover:bg-amber-500/10 text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      }`}
    >
      <span className="text-xl shrink-0" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold flex items-center gap-2 flex-wrap">
          {title}
          {badge && !disabled && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-normal">
              {badge}
            </span>
          )}
          {disabled && disabledReason && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300/80 font-normal">
              {disabledReason}
            </span>
          )}
        </div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      {!disabled && <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>}
      {disabled && <span className="text-white/20 text-xs shrink-0">🔒</span>}
    </button>
  );
}

// ── Dialog inline de confirmare (nu modal, ancorat la acțiune) ──────────────
function InlineConfirm({ title, message, confirmLabel = "Confirmă", onConfirm, onCancel, accent = "amber" }) {
  const accentMap = {
    amber:  "border-amber-500/40 bg-amber-500/[0.08] text-amber-100",
    orange: "border-orange-500/40 bg-orange-500/[0.08] text-orange-100",
  };
  return (
    <div className={`mt-2 rounded-xl border-2 p-3 ${accentMap[accent] || accentMap.amber}`} role="alertdialog" aria-label={title}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold mb-1">{title}</div>
          <p className="text-[11px] opacity-80 leading-snug">{message}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button
          onClick={onCancel}
          className="text-[11px] px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/[0.09] text-white/80 hover:text-white transition-colors"
        >
          Anulează
        </button>
        <button
          onClick={onConfirm}
          className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export default function RampInstant({
  building,
  opaqueElements,
  glazingElements,
  thermalBridges,
  loadDemoByIndex,
  applyEnvelopeTemplate,
  applyDemoEnvelopeOnly,
  applyStandardBridgesPackHandler,
  apply4WallsFromGeom,
  setEditingOpaque,
  setShowOpaqueModal,
  setEditingGlazing,
  setShowGlazingModal,
  setShowBridgeCatalog,
  showToast,
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDemos, setShowDemos] = useState(false);
  const [confirmBridges, setConfirmBridges] = useState(false);
  const [confirmWalls, setConfirmWalls] = useState(false);

  const templatesByCategory = useMemo(() => groupTemplatesByCategory(), []);
  const geomCheck = useMemo(() => canGenerateFromGeometry(building), [building]);
  const hasSomeEnvelope = (opaqueElements?.length || 0) > 0 || (glazingElements?.length || 0) > 0;

  // ── Handleri ──────────────────────────────────────────────────────────────
  const handleTemplate = (templateId) => {
    applyEnvelopeTemplate?.(templateId);
    setShowTemplates(false);
  };

  const handleDemo = (idx) => {
    applyDemoEnvelopeOnly?.(idx);
    setShowDemos(false);
  };

  const handleBridges = () => {
    applyStandardBridgesPackHandler?.();
    setConfirmBridges(false);
  };

  const handleWalls = () => {
    apply4WallsFromGeom?.();
    setConfirmWalls(false);
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-amber-200/70 mb-2">
        ⚡ Completare instantanee derivată din 20 exemple demo + geometria Step 1.
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Șabloane tipologii (8)                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <ActionCard
        icon="🏛️"
        title="8 șabloane tipologii"
        description="Rezidențial vechi/nZEB, birouri, școală, hală — pachete complete { pereți + vitraje + punți } derivate din demo-uri."
        badge={`${ENVELOPE_TEMPLATES.length}`}
        onClick={() => { setShowTemplates(v => !v); setShowDemos(false); }}
      />
      {showTemplates && (
        <div className="pl-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {Object.entries(templatesByCategory).map(([category, tpls]) => (
            <div key={category}>
              <div className="text-[9px] uppercase tracking-widest text-amber-300/50 mb-1 mt-1">{category}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {tpls.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplate(tpl.id)}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.02] hover:bg-amber-500/10 hover:border-amber-500/30 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                  >
                    <span className="text-lg shrink-0" aria-hidden="true">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-amber-100 truncate">{tpl.title}</div>
                      <div className="text-[9px] text-amber-200/50 leading-tight mt-0.5">{tpl.tagline}</div>
                      <div className="text-[8px] text-amber-300/40 mt-0.5 font-mono">{tpl.uRange}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {hasSomeEnvelope && (
            <div className="mt-1.5 flex items-start gap-2 text-[9px] text-amber-300/70 bg-amber-500/[0.04] rounded-lg px-2 py-1.5 border border-amber-500/10">
              <span aria-hidden="true">ℹ️</span>
              <span>Aplicarea unui șablon <strong>înlocuiește</strong> anvelopa curentă. Poți reveni cu Ctrl+Z.</span>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Aplicare selectivă anvelopă din 20 demo-uri (D6)                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <ActionCard
        icon="📦"
        title="Aplică anvelopa dintr-un demo"
        description="Copiază doar { opaque, glazing, bridges } din oricare dintre cele 20 demo-uri, păstrând building + instalații curente."
        badge={`${DEMO_PROJECTS.length}`}
        onClick={() => { setShowDemos(v => !v); setShowTemplates(false); }}
      />
      {showDemos && (
        <div className="pl-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 max-h-72 overflow-y-auto">
          {DEMO_PROJECTS.map((d, idx) => (
            <div
              key={d.id || idx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.05] transition-all"
            >
              <span className="text-[9px] w-6 font-mono text-amber-300/50">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-amber-100 truncate">{d.title}</div>
                <div className="text-[9px] text-amber-200/40 truncate">{d.shortDesc}</div>
              </div>
              <button
                onClick={() => handleDemo(idx)}
                className="text-[9px] px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                Aplică anvelopă →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Pachet standard 5 punți termice (D1) cu confirmare                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <ActionCard
        icon="🔗"
        title="Pachet standard 5 punți termice"
        description="Auto-generare joncțiuni perete-terasă, perete-sol, colț, glaf, consolă. Lungimi din geometria Step 1."
        badge={thermalBridges?.length > 0 ? `+pack` : "5 punți"}
        disabled={(opaqueElements?.length || 0) < 1}
        disabledReason={(opaqueElements?.length || 0) < 1 ? "adaugă pereți mai întâi" : undefined}
        onClick={() => setConfirmBridges(true)}
      />
      {confirmBridges && (
        <InlineConfirm
          title="Estimare orientativă (D1)"
          message={STANDARD_BRIDGES_PACK_WARNING}
          confirmLabel="Adaugă punțile"
          onConfirm={handleBridges}
          onCancel={() => setConfirmBridges(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. 4 pereți N/S/E/V + acoperiș + planșeu din geometria Step 1        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <ActionCard
        icon="🧱"
        title="6 elemente din geometria Step 1"
        description={
          geomCheck.ok
            ? `4 pereți N/S/E/V + acoperiș terasă + placă pe sol, arii derivate din ${parseFloat(building?.areaEnvelope).toFixed(0)} m² anvelopă.`
            : "Generare pe baza suprafeței anvelopei + orientărilor cardinale. Nu completează straturile — doar ariile."
        }
        badge="6 elem"
        disabled={!geomCheck.ok}
        disabledReason={geomCheck.reason}
        onClick={() => setConfirmWalls(true)}
      />
      {confirmWalls && (
        <InlineConfirm
          title="Estimare orientativă (D1)"
          message={
            "Generăm 4 pereți exteriori cu orientări N/S/E/V (70% din anvelopă), 1 acoperiș terasă (15%) și 1 placă pe sol (15%). " +
            "Distribuția presupune clădire aprox. pătrată. Adaptează ariile după planșele reale. Straturile trebuie completate manual."
          }
          confirmLabel="Generează elementele"
          onConfirm={handleWalls}
          onCancel={() => setConfirmWalls(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Shortcut-uri directe (mod expert)                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="pt-2 mt-3 border-t border-white/[0.06] space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Acces rapid (modale existente)
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditingOpaque?.(null); setShowOpaqueModal?.(true); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            + Element opac (N)
          </button>
          <button
            onClick={() => { setEditingGlazing?.(null); setShowGlazingModal?.(true); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            + Element vitrat (G)
          </button>
          <button
            onClick={() => setShowBridgeCatalog?.(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            📖 Catalog punți (165 SVG)
          </button>
        </div>
      </div>
    </div>
  );
}
