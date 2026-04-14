/**
 * EnvelopeAssistant — chat contextual heuristic LOCAL (S4).
 *
 * NU folosește LLM extern. Răspunde pe baza stării reale a anvelopei folosind:
 *   • STEP2_FIELDS (10 gate-uri progress tracker)
 *   • U_REF tables (nZEB / renovare)
 *   • Reguli euristice (ziduri lipsă pe orientări, A/V fără vitraje, etc.)
 *
 * Preset prompts:
 *   • „Ce pereți/elemente am uitat?"
 *   • „Verifică-mi conformitatea U"
 *   • „Pot îmbunătăți G-ul?"
 *   • „Analizează-mi anvelopa"
 *
 * Props:
 *   - building, opaqueElements, glazingElements, thermalBridges
 *   - calcOpaqueR
 *   - envelopeSummary (G coefficient + losses)
 *   - onClose()
 *   - onActionLink(kind)     : callback pentru „Acționează" buttons (kind: „opaque"/„glazing"/„bridges"/„instant")
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { computeEnvelopeProgress } from "./EnvelopeProgress.js";
import { cn } from "../ui.jsx";

// ── U_REF tables (subset — consistentă cu restul aplicației) ─────────────────
const U_REF_NZEB_RES  = { PE: 0.25, PR: 0.67, PS: 0.29, PT: 0.15, PP: 0.15, PB: 0.29, PL: 0.20, SE: 0.20 };
const U_REF_NZEB_NRES = { PE: 0.33, PR: 0.80, PS: 0.35, PT: 0.17, PP: 0.17, PB: 0.35, PL: 0.22, SE: 0.22 };
const U_REF_GLAZING_RES  = 1.11;
const U_REF_GLAZING_NRES = 1.20;

// ── Preset prompts ───────────────────────────────────────────────────────────
const PRESET_PROMPTS = [
  { id: "missing",     icon: "🔍", text: "Ce elemente am uitat?" },
  { id: "conformity",  icon: "✓",  text: "Verifică-mi conformitatea U" },
  { id: "improve-g",   icon: "📈", text: "Pot îmbunătăți G-ul?" },
  { id: "analyze-all", icon: "🧭", text: "Analizează-mi anvelopa" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getURefNZEB(category, type) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[type] ?? null;
}

function isResidential(category) {
  return ["RI", "RC", "RA"].includes(category);
}

// ── Generator răspunsuri euristice ───────────────────────────────────────────
function generateResponse(intent, ctx) {
  const { opaqueElements, glazingElements, thermalBridges, building, envelopeSummary, calcOpaqueR } = ctx;
  const cat = building?.category;
  const progress = computeEnvelopeProgress({ opaqueElements, glazingElements, thermalBridges, building, calcOpaqueR });

  // ── INTENT: „Ce am uitat?" ────────────────────────────────────────────────
  if (intent === "missing") {
    const missing = progress.missing;
    if (missing.length === 0) {
      return {
        title: "🎉 Anvelopa pare completă",
        lines: [
          "Toate cele 10 verificări esențiale sunt bifate. Continuă cu Pasul 3 (instalații).",
        ],
        actions: [],
      };
    }
    const orientations = new Set((opaqueElements || [])
      .filter(el => el.type === "PE")
      .map(el => el.orientation));
    const missingOrient = ["N", "S", "E", "V"].filter(o => !orientations.has(o) && orientations.size > 0);

    const lines = [
      `Lipsesc **${missing.length} / 10** verificări:`,
      ...missing.slice(0, 5).map(m => `• ${m.label}`),
    ];
    if (missingOrient.length > 0 && opaqueElements?.length > 0) {
      lines.push(`📍 Pereți exteriori pe orientările: **${missingOrient.join(", ")}** (verifică dacă e cazul)`);
    }

    const actions = [];
    if (missing.some(m => m.key === "hasGlazing"))    actions.push({ label: "+ Adaugă vitraj", kind: "glazing" });
    if (missing.some(m => m.key === "hasBridges"))    actions.push({ label: "+ Pachet 5 punți", kind: "bridges" });
    if (missing.some(m => ["opaqueCount","hasExternalWall","hasRoof","hasFloor"].includes(m.key)))
                                                      actions.push({ label: "+ Adaugă element opac", kind: "opaque" });

    return { title: "🔍 Lipsuri detectate", lines, actions };
  }

  // ── INTENT: „Conformitate U" ──────────────────────────────────────────────
  if (intent === "conformity") {
    const nonCompOpaque = [];
    (opaqueElements || []).forEach(el => {
      if (!calcOpaqueR) return;
      try {
        const { u } = calcOpaqueR(el.layers, el.type) || {};
        const uRef = getURefNZEB(cat, el.type);
        if (Number.isFinite(u) && uRef && u > uRef) {
          nonCompOpaque.push({ name: el.name, u: u.toFixed(3), uRef: uRef.toFixed(2), type: el.type });
        }
      } catch {/* ignore */}
    });

    const nonCompGlazing = [];
    const uRefGlazing = isResidential(cat) ? U_REF_GLAZING_RES : U_REF_GLAZING_NRES;
    (glazingElements || []).forEach(el => {
      const u = parseFloat(el.u);
      if (Number.isFinite(u) && u > uRefGlazing) {
        nonCompGlazing.push({ name: el.name, u: u.toFixed(2), uRef: uRefGlazing.toFixed(2) });
      }
    });

    if ((opaqueElements?.length || 0) === 0 && (glazingElements?.length || 0) === 0) {
      return {
        title: "⏳ Nu pot verifica încă",
        lines: ["Adaugă întâi cel puțin un element (opac sau vitrat)."],
        actions: [{ label: "+ Adaugă element opac", kind: "opaque" }],
      };
    }

    if (nonCompOpaque.length === 0 && nonCompGlazing.length === 0) {
      return {
        title: "✅ Toate elementele sunt CONFORME",
        lines: [
          `Referință utilizată: ${isResidential(cat) ? "nZEB rezidențial" : "nZEB nerezidențial"} (Mc 001-2022).`,
          `Verificate: ${opaqueElements?.length || 0} opace + ${glazingElements?.length || 0} vitrate.`,
        ],
        actions: [],
      };
    }

    const lines = [];
    if (nonCompOpaque.length > 0) {
      lines.push(`**${nonCompOpaque.length} elemente opace** depășesc U'max:`);
      nonCompOpaque.slice(0, 4).forEach(e => {
        lines.push(`• ${e.name} — U=${e.u} > ${e.uRef} (${e.type})`);
      });
    }
    if (nonCompGlazing.length > 0) {
      lines.push(`**${nonCompGlazing.length} elemente vitrate** depășesc U'max (${uRefGlazing.toFixed(2)}):`);
      nonCompGlazing.slice(0, 4).forEach(e => {
        lines.push(`• ${e.name} — U=${e.u}`);
      });
    }
    lines.push("💡 Sugestii: adaugă termoizolație suplimentară sau schimbă tipul vitrajului cu Low-E.");

    return {
      title: "⚠️ Neconformități U detectate",
      lines,
      actions: [{ label: "Vezi tabel conformitate", kind: "scroll-compliance" }],
    };
  }

  // ── INTENT: „Îmbunătățire G" ──────────────────────────────────────────────
  if (intent === "improve-g") {
    if (!envelopeSummary || envelopeSummary.G <= 0) {
      return {
        title: "⏳ G nu e calculat încă",
        lines: ["Completează elemente opace + vitrate + volum (Pasul 1) pentru a obține G."],
        actions: [],
      };
    }
    const G = envelopeSummary.G;
    const lines = [`Coeficientul G actual: **${G.toFixed(3)} W/(m³·K)**`];
    if (G < 0.5) {
      lines.push("✨ Excelent — G-ul este sub 0.5, ceea ce indică o anvelopă foarte performantă (nZEB-ready).");
    } else if (G < 0.8) {
      lines.push("📊 Acceptabil — G între 0.5-0.8. Îmbunătățiri posibile:");
      lines.push("• Mărește grosimea termoizolației la pereți (min. 15 cm EPS/vată)");
      lines.push("• Trece la triplu vitraj Low-E (U ≤ 0.7)");
      lines.push("• Rezolvă punțile termice majore (console balcon, ruptoare Schöck)");
    } else {
      lines.push("⚠️ G > 0.8 — anvelopa necesită intervenții majore:");
      lines.push("• Termosistem obligatoriu (ETICS, min. 10 cm EPS)");
      lines.push("• Schimbă toate ferestrele (min. dublu vitraj Low-E)");
      lines.push("• Identifică și corectează toate punțile termice majore");
    }

    // A/V analysis
    const area = envelopeSummary.totalArea;
    const volume = envelopeSummary.volume;
    if (area > 0 && volume > 0) {
      const av = area / volume;
      lines.push(`📐 Raport A/V = ${av.toFixed(2)} m⁻¹ — ${av < 0.6 ? "compact, favorabil" : av > 1.0 ? "dispersat, defavorabil" : "normal"}`);
    }

    return { title: "📈 Analiză G", lines, actions: [] };
  }

  // ── INTENT: „Analiză generală" ────────────────────────────────────────────
  if (intent === "analyze-all") {
    const lines = [
      `📊 **Progres Step 2**: ${progress.filled}/${progress.total} (${progress.pct}%)`,
      `🏗 Elemente: ${opaqueElements?.length || 0} opace · ${glazingElements?.length || 0} vitrate · ${thermalBridges?.length || 0} punți`,
    ];

    if (envelopeSummary?.G > 0) {
      lines.push(`📉 Coeficient G: ${envelopeSummary.G.toFixed(3)} W/(m³·K)`);
    }

    if (progress.missing.length > 0) {
      lines.push(``);
      lines.push(`⚠️ Lipsesc ${progress.missing.length} verificări — folosește „Ce elemente am uitat?"`);
    } else {
      lines.push(``);
      lines.push(`✅ Toate gate-urile de bază sunt bifate.`);
    }

    // Orientation analysis
    const peByOrientation = {};
    (opaqueElements || []).filter(el => el.type === "PE").forEach(el => {
      peByOrientation[el.orientation] = (peByOrientation[el.orientation] || 0) + 1;
    });
    const orientations = Object.keys(peByOrientation);
    if (orientations.length > 0) {
      lines.push(``);
      lines.push(`🧭 Pereți exteriori pe orientări: ${orientations.sort().join(", ")} (${orientations.length} direcții)`);
      if (orientations.length < 4) {
        lines.push(`   💡 Tipic, o clădire are pereți pe 4 direcții cardinale (N/S/E/V).`);
      }
    }

    return { title: "🧭 Analiză anvelopă", lines, actions: [] };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    title: "🤔 Nu am înțeles",
    lines: ["Încearcă unul din prompturile preset de mai jos."],
    actions: [],
  };
}

// ── Intent detection (text liber → intent preset) ────────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase();
  if (/uit|lipse|lipsa|ce.*mai.*adaug|mai.*trebui|ce.*mai.*fac/.test(t))     return "missing";
  if (/conform|u.max|u'max|verifi.*u|respect.*nzeb|depa.*referin/.test(t))   return "conformity";
  if (/imbunat|îmbunăt|optimiz|cum.*redu.*g|scad.*g|coefic.*g|cres.*g/.test(t)) return "improve-g";
  if (/analiz|verific.*anvelop|sumar|raport|stare/.test(t))                  return "analyze-all";
  return "analyze-all"; // default friendly
}

// ── Chat line rendering ──────────────────────────────────────────────────────
function renderLine(line) {
  // Simple bold parser: **text**
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="text-violet-200">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

// ── Component principal ──────────────────────────────────────────────────────
export default function EnvelopeAssistant({
  onClose,
  onActionLink,
  building,
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  envelopeSummary,
  calcOpaqueR,
}) {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      title: "👋 Salut! Sunt asistentul anvelopei.",
      lines: [
        "Te pot ajuta cu:",
        "• Identificarea elementelor lipsă",
        "• Verificarea conformității U față de Mc 001-2022",
        "• Sugestii de îmbunătățire G",
        "Folosește prompturile de mai jos sau scrie o întrebare.",
      ],
      actions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const ctx = useMemo(() => ({
    opaqueElements, glazingElements, thermalBridges, building, envelopeSummary, calcOpaqueR,
  }), [opaqueElements, glazingElements, thermalBridges, building, envelopeSummary, calcOpaqueR]);

  const handleAsk = (intentOrText, isPreset = false) => {
    const userText = isPreset
      ? PRESET_PROMPTS.find(p => p.id === intentOrText)?.text || intentOrText
      : intentOrText;
    const intent = isPreset ? intentOrText : detectIntent(userText);
    const response = generateResponse(intent, ctx);

    setMessages(prev => [
      ...prev,
      { from: "user", title: userText },
      { from: "bot", ...response },
    ]);
    setInput("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleAsk(input.trim(), false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-violet-500/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <div>
              <h3 className="text-lg font-bold text-white">Asistent anvelopă</h3>
              <p className="text-[11px] text-violet-300/70">Verificări heuristice locale (fără LLM extern)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            aria-label="Închide asistent"
          >✕</button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                msg.from === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] rounded-2xl p-3",
                msg.from === "user"
                  ? "bg-violet-500/20 border border-violet-500/30 text-violet-100"
                  : "bg-white/[0.03] border border-white/10 text-white/90"
              )}>
                {msg.from === "bot" ? (
                  <>
                    {msg.title && (
                      <div className="text-sm font-semibold mb-1.5">{msg.title}</div>
                    )}
                    {msg.lines && msg.lines.length > 0 && (
                      <div className="space-y-0.5 text-[12px] leading-relaxed">
                        {msg.lines.map((line, i) => (
                          <div key={i}>{renderLine(line)}</div>
                        ))}
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.actions.map((a, i) => (
                          <button
                            key={i}
                            onClick={() => { onActionLink?.(a.kind); onClose?.(); }}
                            className="text-[10px] px-2 py-1 rounded bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 font-medium"
                          >
                            {a.label} →
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm">{msg.title}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Preset prompts */}
        <div className="px-4 py-2 border-t border-white/5">
          <div className="text-[10px] text-white/40 mb-1.5">Preset rapid:</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_PROMPTS.map(p => (
              <button
                key={p.id}
                onClick={() => handleAsk(p.id, true)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-violet-500/20 bg-violet-500/[0.04] hover:bg-violet-500/10 text-violet-200 flex items-center gap-1"
              >
                <span>{p.icon}</span>
                <span>{p.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Scrie o întrebare..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm focus:outline-none focus:border-violet-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              input.trim()
                ? "bg-violet-500 text-white hover:bg-violet-400"
                : "bg-white/[0.05] text-white/30 cursor-not-allowed"
            )}
          >
            Trimite
          </button>
        </form>
      </div>
    </div>
  );
}
