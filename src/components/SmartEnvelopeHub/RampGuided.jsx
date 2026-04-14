/**
 * RampGuided (anvelopă) — SCAFFOLD S2.
 *
 * Conținut complet în Sesiunea 4:
 *   ├─ Wizard "Adaugă perete în 3 pași" (D5) — ÎNLOCUIEȘTE OpaqueModal ca default
 *   │   Pas 1: Tip element (PE/PT/PP/PL/PB) + orientare + arie
 *   │   Pas 2: Straturi — selector material din bibliotecă (materials.json)
 *   │   Pas 3: Preview U + opțiune "Editor avansat straturi" (OpaqueModal pentru experți)
 *   ├─ Wizard "Adaugă vitraj în 3 pași" — simplificat peste GlazingModal
 *   ├─ Wizard "Adaugă punți termice" — catalog + quick-pick + aplicare bulk
 *   ├─ Chat AI contextual — "ce pereți am uitat?", "verifică-mi anvelopa"
 *   ├─ Tutorial interactiv anvelopă — 5 pași cu clădire exemplu
 *   └─ Analiză A/V + volum încălzit — sugestii geometrie
 *
 * Stare S2: placeholder-uri + buton către OpaqueModal existent.
 */

function PlaceholderAction({ icon, title, description, sessionTag = "S4" }) {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-violet-500/15 bg-violet-500/[0.02] text-left opacity-50 cursor-not-allowed">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-violet-200/80 flex items-center gap-2">
          {title}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300/80 font-normal">
            {sessionTag}
          </span>
        </div>
        <div className="text-[10px] text-violet-100/50 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="text-violet-300/40 text-xs shrink-0">🔒</span>
    </div>
  );
}

function ActiveAction({ icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300 text-left transition-all group"
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
  building,
  opaqueElements,
  glazingElements,
  thermalBridges,
  onOpenWizard,
  onOpenChat,
  setEditingOpaque,
  setShowOpaqueModal,
  showToast,
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-violet-200/70 mb-2">
        🧭 Completare ghidată pas cu pas — wizard-uri + chat AI.
      </div>

      {/* TODO S4: Wizard 3 pași pereți (D5) */}
      <PlaceholderAction
        icon="🧱"
        title="Wizard: adaugă perete în 3 pași"
        description="Pas 1: tip + orientare. Pas 2: straturi cu selector materials.json. Pas 3: preview U + opțiune editor avansat."
      />

      {/* TODO S4: Wizard 3 pași vitraje */}
      <PlaceholderAction
        icon="🪟"
        title="Wizard: adaugă vitraj în 3 pași"
        description="Tip ramă + U/g din catalog + cadru % + ramă dimensiune."
      />

      {/* TODO S4: Wizard punți termice */}
      <PlaceholderAction
        icon="🔗"
        title="Wizard: identifică punți din geometrie"
        description="Calculator automat lungimi joncțiuni din dimensiuni clădire + catalog 165 SVG."
      />

      {/* TODO S4: Chat AI contextual */}
      <PlaceholderAction
        icon="💬"
        title="Chat AI — verifică anvelopa"
        description="„Ce pereți am uitat?” · „Verifică-mi conformitatea U” · „Pot îmbunătăți G-ul?”"
      />

      {/* TODO S4: Tutorial interactiv */}
      <PlaceholderAction
        icon="🎓"
        title="Tutorial interactiv anvelopă"
        description="5 pași cu clădire exemplu precompletată — învață fluxul fără să pierzi proiectul curent."
      />

      {/* Shortcut către OpaqueModal existent (funcțional din S2) */}
      <div className="pt-2 mt-2 border-t border-white/[0.06]">
        <ActiveAction
          icon="✍️"
          title="Editor clasic element opac (OpaqueModal)"
          description="Formularul avansat actual — control total pe straturi. Rămâne disponibil pentru experți."
          onClick={() => { setEditingOpaque?.(null); setShowOpaqueModal?.(true); }}
        />
      </div>
    </div>
  );
}
