/**
 * TutorialEnvelope — tutorial interactiv 5 pași pentru Step 2 Anvelopă (S4).
 *
 * Obiective:
 *   1. Introduce conceptul anvelopei termice (ce compune, de ce importă)
 *   2. Tipuri de elemente (PE, PT, PP, PL, PB) + orientări cardinale
 *   3. Straturi (sens ext→int, λ, d, impact U)
 *   4. Punți termice (ψ·L, pachetul standard 5 punți)
 *   5. Verificare conformitate (U'max nZEB, coeficient G)
 *
 * Stare: read-only (nu modifică opaqueElements/glazingElements/thermalBridges).
 * Opțional, la final: încărcare clădire demo pentru practică.
 *
 * Props:
 *   - onClose()
 *   - onLoadDemo()    : deschide RampInstant demo loader (opțional final)
 */

import { useState } from "react";
import { cn } from "../ui.jsx";

const STEPS = [
  {
    id: 1,
    icon: "🏗",
    title: "Ce este anvelopa termică?",
    intro: 'Anvelopa este „pielea" clădirii — toate suprafețele care separă spațiul încălzit de exterior/neîncălzit.',
    content: [
      { emoji: "🧱", label: "Elemente opace",  desc: "Pereți, planșee, terase, plăci pe sol" },
      { emoji: "🪟", label: "Elemente vitrate", desc: "Ferestre, uși vitrate, luminatoare" },
      { emoji: "🔗", label: "Punți termice",    desc: "Joncțiuni unde căldura scapă (colțuri, balcoane, glafuri)" },
    ],
    footer: "Mc 001-2022 — Cap. 2 cere caracterizarea completă a acestor 3 categorii.",
  },
  {
    id: 2,
    icon: "🧭",
    title: "Tipuri de elemente opace",
    intro: 'Fiecare tip de element are un factor τ (tau) diferit, care reprezintă „cât de mult contează termic".',
    content: [
      { emoji: "🧱", label: "PE — Perete exterior",         desc: "τ=1.0 · Contactul direct cu exteriorul. Cel mai frecvent tip.", extra: "Orientare: N/S/E/V/NE/..." },
      { emoji: "🏛", label: "PT — Planșeu terasă",          desc: "τ=1.0 · Acoperiș plat circulabil. Pierderi mari dacă neizolat." },
      { emoji: "🏠", label: "PP — Planșeu sub pod",         desc: "τ=0.9 · Izolat în pod necirculabil. Economic." },
      { emoji: "🏗", label: "PL — Placă pe sol",            desc: "τ=0.5 · Contact cu solul. Izolație sub șapă." },
      { emoji: "🕳", label: "PB — Planșeu peste subsol",    desc: "τ=0.5 · Subsol neîncălzit. Izolație sub planșeu." },
    ],
    footer: "💡 Factorul τ reduce pierderile pentru elementele care nu dau direct în exterior (pod, subsol).",
  },
  {
    id: 3,
    icon: "📐",
    title: "Straturi și coeficient U",
    intro: "Un element opac este format din straturi succesive, fiecare cu conductivitate λ și grosime d.",
    content: [
      { emoji: "1️⃣", label: "Sensul: EXTERIOR → INTERIOR", desc: "Wizard-ul introduce straturile în această ordine." },
      { emoji: "λ",   label: "Conductivitate λ [W/(m·K)]", desc: "Cât de ușor conduce căldura. Mai mic = mai bun izolator." },
      { emoji: "d",   label: "Grosime d [mm]",              desc: "Rezistența R = d/λ crește cu grosimea." },
      { emoji: "U",   label: "U = 1 / (Rsi + ΣR + Rse)",    desc: "Coeficient transfer căldură. Mai mic = mai bine." },
    ],
    footer: "📊 Exemplu: cărămidă 30cm + EPS 10cm → U ≈ 0.27 W/(m²·K) — la limita nZEB rezidențial (0.25).",
  },
  {
    id: 4,
    icon: "🔗",
    title: "Punți termice (ψ·L)",
    intro: "Punțile termice sunt linii unde izolația e întreruptă. Exemple: colțuri, balcoane, joncțiuni planșeu.",
    content: [
      { emoji: "ψ",   label: "Coeficient liniar ψ [W/(m·K)]", desc: "Pierdere suplimentară per metru liniar" },
      { emoji: "L",   label: "Lungimea punții [m]",           desc: "Perimetru sau sumă joncțiuni" },
      { emoji: "Σ",   label: "Pierdere = ψ · L [W/K]",        desc: "Se adaugă la pierderile prin elemente" },
      { emoji: "📦",  label: "Pachet standard 5 punți",       desc: "Planșeu intermediar, terasă, subsol, soclu, colț — disponibil în tab Instant" },
    ],
    footer: "⚠️ Punțile pot adăuga 10-30% la pierderi totale — nu le ignora!",
  },
  {
    id: 5,
    icon: "✓",
    title: "Verificare conformitate",
    intro: "După introducere, sistemul compară automat cu valorile de referință și calculează coeficientul G.",
    content: [
      { emoji: "✓", label: "U'max nZEB",        desc: "Rezidențial: PE≤0.25, PT≤0.15, ferestre≤1.11 · Nerezidențial: puțin mai relaxat" },
      { emoji: "📊", label: "Coeficient global G", desc: "G < 0.5 W/(m³·K) = excelent · 0.5-0.8 = acceptabil · > 0.8 = necesită intervenții" },
      { emoji: "📐", label: "Raport A/V",         desc: "Suprafață anvelopă / volum încălzit. Compact < 0.6 m⁻¹ = favorabil" },
      { emoji: "🎯", label: "Tabel conformitate", desc: "Apare automat când ai cel puțin 1 element — vezi status per element" },
    ],
    footer: '🎓 Ai parcurs tutorialul. Încarcă o clădire demo pentru practică sau începe cu „+Adaugă" în Hub.',
  },
];

export default function TutorialEnvelope({ onClose, onLoadDemo }) {
  const [step, setStep] = useState(1);
  const current = STEPS.find(s => s.id === step);

  const handleFinish = () => {
    onClose?.();
  };

  const handleLoadDemo = () => {
    onLoadDemo?.();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl shadow-violet-500/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <div>
              <h3 className="text-lg font-bold text-white">Tutorial Anvelopă</h3>
              <p className="text-[11px] text-violet-300/70">Pas {step} din {STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            aria-label="Închide tutorial"
          >✕</button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between mb-1 text-[10px] text-white/40">
            {STEPS.map(s => (
              <span
                key={s.id}
                className={cn(
                  "transition-colors",
                  s.id === step ? "text-violet-300 font-medium" :
                  s.id < step  ? "text-violet-500/60" : ""
                )}
              >
                {s.id === step ? s.icon : (s.id < step ? "✓" : s.id)}
              </span>
            ))}
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-5">
          {/* Icon + title + intro */}
          <div className="flex items-start gap-3">
            <span className="text-4xl shrink-0">{current.icon}</span>
            <div>
              <h4 className="text-base font-bold text-white mb-1">{current.title}</h4>
              <p className="text-[12px] text-white/70 leading-relaxed">{current.intro}</p>
            </div>
          </div>

          {/* Content items */}
          <div className="space-y-2">
            {current.content.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]"
              >
                <span className="text-xl shrink-0 w-7 text-center">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{item.label}</div>
                  <div className="text-[11px] text-white/60 mt-0.5 leading-snug">{item.desc}</div>
                  {item.extra && (
                    <div className="text-[10px] text-violet-300/70 mt-0.5 italic">{item.extra}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          {current.footer && (
            <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 p-3 text-[11px] text-amber-200/90 leading-relaxed">
              {current.footer}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-between pt-3 border-t border-white/5">
          <button
            onClick={step > 1 ? () => setStep(step - 1) : onClose}
            className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-white/70"
          >
            {step > 1 ? "← Înapoi" : "Anulează"}
          </button>

          <div className="flex gap-2">
            {step === STEPS.length && onLoadDemo && (
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2 text-sm rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 font-medium border border-amber-500/30"
              >
                🎯 Încarcă demo
              </button>
            )}
            <button
              onClick={step < STEPS.length ? () => setStep(step + 1) : handleFinish}
              className="px-6 py-2 text-sm rounded-lg bg-violet-500 text-white hover:bg-violet-400 font-medium"
            >
              {step < STEPS.length ? "Înainte →" : "✓ Am înțeles"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
