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
import { cn } from "../ui.jsx";
import {
  PRESET_PROMPTS,
  detectIntent,
  generateResponse,
} from "./utils/assistantEngine.js";
// Sprint Pas 2 AI-First (16 mai 2026) — tab nou „Completează automat (AI)"
import { extractFromText } from "../../lib/envelope-ai-orchestrator.js";

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
  // Sprint Pas 2 AI-First (16 mai 2026)
  onAIResultsReady,    // (envelope) => Hub setAIResults() → review modal
  showToast,
}) {
  // Mode: „diagnostic" (heuristic local) vs „ai-fill" (LLM completare auto)
  const [mode, setMode] = useState("diagnostic");
  const [aiBusy, setAIBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      title: "👋 Salut! Sunt asistentul anvelopei.",
      lines: [
        "Te pot ajuta cu:",
        "• 💭 **Diagnostic local** — identificare lipsuri / conformitate U / G",
        "• 🤖 **Completare AI** — descrii clădirea, AI propune pereți+vitraje+punți",
        "Folosește comutatorul de mai jos pentru a alege modul.",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (mode === "ai-fill") {
      // Sprint Pas 2 AI-First — completare automată via AI chat envelope-fill
      setMessages((prev) => [...prev, { from: "user", title: text }]);
      setInput("");
      setAIBusy(true);
      try {
        const envelope = await extractFromText(text, building);
        const count = (envelope.opaqueElements?.length || 0) +
                      (envelope.glazingElements?.length || 0) +
                      (envelope.thermalBridges?.length || 0);
        setMessages((prev) => [...prev, {
          from: "bot",
          title: `🤖 AI a propus ${count} elemente`,
          lines: [
            `• ${envelope.opaqueElements?.length || 0} pereți / planșee`,
            `• ${envelope.glazingElements?.length || 0} vitraje`,
            `• ${envelope.thermalBridges?.length || 0} punți termice`,
            ...(envelope.assumptions || []).slice(0, 3).map((a) => `💡 ${a}`),
            "👉 Deschid modal-ul de review acum...",
          ],
          actions: [],
        }]);
        // Propagă rezultatul la părinte → review modal
        onAIResultsReady?.(envelope);
        // Închide chat-ul după ce modal-ul se deschide
        setTimeout(() => onClose?.(), 400);
      } catch (err) {
        setMessages((prev) => [...prev, {
          from: "bot",
          title: "❌ AI eșuat",
          lines: [
            `Eroare: ${err?.message || "necunoscut"}`,
            "Încearcă să descrii mai detaliat (an, materiale, dimensiuni) sau folosește un nivel inferior (Wizard / CSV).",
          ],
          actions: [],
        }]);
      } finally {
        setAIBusy(false);
      }
      return;
    }
    handleAsk(text, false);
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
              <p className="text-[11px] text-violet-300/70">
                {mode === "ai-fill"
                  ? "🤖 Completare automată AI (Sonnet 4.6 + Mc 001-2022)"
                  : "💭 Diagnostic local (heuristic, fără LLM)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
            aria-label="Închide asistent"
          >✕</button>
        </div>

        {/* Mode switcher — Sprint Pas 2 AI-First */}
        <div className="flex border-b border-white/5 px-2 pt-2">
          <button
            onClick={() => setMode("diagnostic")}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors",
              mode === "diagnostic"
                ? "bg-violet-500/15 text-violet-200 border-b-2 border-violet-400"
                : "text-white/50 hover:text-white/80 hover:bg-white/5",
            )}
            aria-pressed={mode === "diagnostic"}
          >
            💭 Diagnostic local
          </button>
          <button
            onClick={() => setMode("ai-fill")}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors",
              mode === "ai-fill"
                ? "bg-emerald-500/15 text-emerald-200 border-b-2 border-emerald-400"
                : "text-white/50 hover:text-white/80 hover:bg-white/5",
            )}
            aria-pressed={mode === "ai-fill"}
          >
            🤖 Completează automat (AI)
          </button>
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

        {/* Preset prompts — vizibile DOAR în mod diagnostic */}
        {mode === "diagnostic" && (
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
        )}

        {/* AI mode hint */}
        {mode === "ai-fill" && (
          <div className="px-4 py-2 border-t border-white/5">
            <div className="text-[10px] text-emerald-300/80 mb-1.5">
              ✨ Exemple input: „Bloc P+4 BCA 25 polistiren 10 din 1985, ferestre PVC dublu"
              · „Casă cărămidă 30 fără izolație 1965, lemn simplu" · „Birou panou prefabricat 1980 reabilitat ETICS"
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              mode === "ai-fill"
                ? "Descrie clădirea pe scurt (an, materiale, ferestre)..."
                : "Scrie o întrebare..."
            }
            disabled={aiBusy}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || aiBusy}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              !input.trim() || aiBusy
                ? "bg-white/[0.05] text-white/30 cursor-not-allowed"
                : mode === "ai-fill"
                ? "bg-emerald-500 text-white hover:bg-emerald-400"
                : "bg-violet-500 text-white hover:bg-violet-400",
            )}
          >
            {aiBusy ? "🤖 ..." : mode === "ai-fill" ? "✨ Generează" : "Trimite"}
          </button>
        </form>
      </div>
    </div>
  );
}
