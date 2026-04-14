/**
 * RampInstant (anvelopă) — SCAFFOLD S2.
 *
 * Conținut complet în Sesiunea 3:
 *   ├─ 8 soluții predefinite — pachete de pereți/vitraje/punți pentru tipologii
 *   │   (rezidențial P+4 anii '70, birouri modern, hală industrială, școală, etc.)
 *   ├─ Aplicare selectivă din cele 20 demo projects — copie doar {opaque, glazing, bridges}
 *   ├─ Pachet standard 5 punți termice (D1) — cu warning de confirmare
 *   ├─ Pachet standard 4 orientări pereți (N/S/E/V) pe baza geometriei din Step 1
 *   └─ Calculator rapid geometrie → arii (A_envelope → împărțire pe elemente)
 *
 * Stare S2: placeholder-uri vizibile cu etichetă "în curând (S3)".
 */

function PlaceholderAction({ icon, title, description, sessionTag = "S3" }) {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] text-left opacity-50 cursor-not-allowed">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-amber-200/80 flex items-center gap-2">
          {title}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/80 font-normal">
            {sessionTag}
          </span>
        </div>
        <div className="text-[10px] text-amber-100/50 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="text-amber-300/40 text-xs shrink-0">🔒</span>
    </div>
  );
}

export default function RampInstant({
  building,
  opaqueElements,
  glazingElements,
  thermalBridges,
  loadDemoByIndex,
  applyStandardBridgesPack,
  setEditingOpaque,
  setShowOpaqueModal,
  setEditingGlazing,
  setShowGlazingModal,
  setShowBridgeCatalog,
  showToast,
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-amber-200/70 mb-2">
        ⚡ Completare instantanee cu șabloane predefinite sau pachete din demo-uri.
      </div>

      {/* TODO S3: 8 soluții predefinite per tipologie clădire */}
      <PlaceholderAction
        icon="🏛️"
        title="8 soluții predefinite per tipologie"
        description="Rezidențial P+4 '70, birouri modern, hală industrială, școală, spital — completare pereți + vitraje + punți într-un click."
      />

      {/* TODO S3: aplicare selectivă din 20 demo projects */}
      <PlaceholderAction
        icon="📦"
        title="Aplică anvelopă din demo-uri existente (20 opțiuni)"
        description="Copie doar { opaque, glazing, bridges } dintr-un demo ales, păstrând restul datelor din proiectul curent."
      />

      {/* TODO S3: pachet standard 5 punți termice (D1) */}
      <PlaceholderAction
        icon="🔗"
        title="Pachet standard 5 punți termice"
        description="Auto-generare joncțiune perete-terasă, perete-planșeu, colț exterior, glaf fereastră, balcon. Estimare orientativă — cere confirmare."
      />

      {/* TODO S3: generare automată 4 pereți din areaEnvelope */}
      <PlaceholderAction
        icon="🧱"
        title="4 pereți N/S/E/V din suprafața anvelopei"
        description="Împărțire suprafață anvelopă Step 1 pe orientări (funcție de geometria aprox. a clădirii)."
      />

      {/* Shortcut-uri directe către modale existente (funcționale din S2) */}
      <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Acces rapid (modale existente)
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditingOpaque?.(null); setShowOpaqueModal?.(true); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20 transition-colors"
          >
            + Element opac
          </button>
          <button
            onClick={() => { setEditingGlazing?.(null); setShowGlazingModal?.(true); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20 transition-colors"
          >
            + Element vitrat
          </button>
          <button
            onClick={() => setShowBridgeCatalog?.(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-colors"
          >
            📖 Catalog punți
          </button>
        </div>
      </div>
    </div>
  );
}
