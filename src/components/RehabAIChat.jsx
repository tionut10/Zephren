/**
 * RehabAIChat.jsx — Chat AI asistent reabilitare energetică (audit-mai2026 F5)
 *
 * Panel chat flotant / lateral integrat în Step 7 (Audit reabilitare).
 * Auditorul poate descrie clădirea în limbaj natural și primește sugestii
 * concrete de pachete reabilitare (anvelopă + sisteme + RES) cu cost și economie.
 *
 * Backend: multiplexare pe POST /api/ai-assistant cu `intent: "rehab-chat"`.
 * - Model: Claude Sonnet 4.6 (calitate sugestii complexe)
 * - System prompt dedicat: Mc 001-2022 Cap. 9 + prețuri RO 2026 + Casa Verde Plus
 * - Context auto-trimis: pașii 1-6 (zonă climatică, U opac, U vitraj, EP, clasă, sisteme)
 * - History max 10 mesaje (5 turns), persistat localStorage per proiect
 *
 * Gating: necesită plan Pro/Expert/Birou/Enterprise (AI Pack inclus v7.1).
 * Free/Edu: blocat cu mesaj upgrade.
 *
 * @see api/ai-assistant.js — handler cu branch intent="rehab-chat"
 * @see src/lib/anexa-recommendations-aeIIci.js — wrapper recomandări per tier
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "./ui.jsx";

const LS_KEY_PREFIX = "rehab_chat_history_";
const MAX_HISTORY = 10; // 5 turns user+assistant

/**
 * Construiește contextul pentru API din state-ul pașilor 1-6.
 * @param {Object} args — { building, envelopeSummary, instSummary, energyClass, heating, acm, opaqueAvgU, glazingAvgU }
 * @returns {Object} context pentru POST /api/ai-assistant
 */
function buildChatContext({
  building,
  envelopeSummary,
  instSummary,
  energyClass,
  heating,
  acm,
  opaqueAvgU,
  glazingAvgU,
  buget,
}) {
  return {
    building: building?.address ? {
      categorie: building.category,
      au: building.areaUseful,
      yearBuilt: building.yearBuilt,
      address: building.address,
    } : undefined,
    category: building?.category,
    energyClass: energyClass?.cls || energyClass,
    ep: instSummary?.ep_total_m2,
    rer: instSummary?.rer,
    zoneClimatica: building?.climateZone,
    uOpacMediu: opaqueAvgU,
    uVitrajMediu: glazingAvgU,
    heating: heating?.label || heating?.source,
    acm: acm?.source,
    au: building?.areaUseful,
    yearBuilt: building?.yearBuilt,
    buget,
  };
}

/**
 * RehabAIChat — Componenta principală (panel flotant cu collapse/expand).
 *
 * Props:
 * @param {Object} building — building state din Pas 1
 * @param {Object} envelopeSummary — sumar anvelopă din Pas 2
 * @param {Object} instSummary — sumar instalații din Pas 3-5 (ep_total_m2, rer)
 * @param {Object} energyClass — clasa energetică din Pas 5 ({ cls, score, color })
 * @param {Object} heating — sistem încălzire din Pas 3
 * @param {Object} acm — sistem ACM din Pas 3
 * @param {Array}  opaqueElements — pentru calcul U mediu opac
 * @param {Array}  glazingElements — pentru calcul U mediu vitraj
 * @param {string} projectId — ID proiect pentru cheia localStorage istoric
 * @param {boolean} hasAccess — true dacă utilizatorul are plan cu acces AI Pack
 * @param {Function} requireUpgrade — callback pentru afișare modal upgrade (gated)
 */
export default function RehabAIChat({
  building,
  envelopeSummary,
  instSummary,
  energyClass,
  heating,
  acm,
  opaqueElements,
  glazingElements,
  projectId = "default",
  hasAccess = true,
  requireUpgrade,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Calcul U mediu opac (pereți + planșee terasă/pod) și vitraj
  const opaqueAvgU = (() => {
    const us = (opaqueElements || [])
      .filter((el) => ["PE", "PT", "PP"].includes(el?.type))
      .map((el) => parseFloat(el?._u || el?.u) || 0)
      .filter((u) => u > 0);
    return us.length > 0 ? Math.round((us.reduce((s, u) => s + u, 0) / us.length) * 100) / 100 : null;
  })();
  const glazingAvgU = (() => {
    const us = (glazingElements || []).map((g) => parseFloat(g?.u) || 0).filter((u) => u > 0);
    return us.length > 0 ? Math.round((us.reduce((s, u) => s + u, 0) / us.length) * 100) / 100 : null;
  })();

  // Restore history din localStorage la mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_PREFIX + projectId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_HISTORY));
      }
    } catch {
      // localStorage indisponibil sau corrupted JSON — ignorăm
    }
  }, [projectId]);

  // Persist history la fiecare update
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_PREFIX + projectId, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {
      // localStorage quota / disabled — ignorăm
    }
  }, [messages, projectId]);

  // Auto-scroll la final pe mesaj nou
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    if (!hasAccess) {
      if (typeof requireUpgrade === "function") {
        requireUpgrade("Chat AI Reabilitare necesită plan AE Ici (1.499 RON/lună) sau superior — AI Pack inclus.");
      }
      return;
    }

    setError(null);
    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const context = buildChatContext({
        building, envelopeSummary, instSummary, energyClass, heating, acm,
        opaqueAvgU, glazingAvgU,
      });
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          intent: "rehab-chat",
          context,
          // history = mesajele ANTERIOARE userMsg (motor adaugă userMsg implicit)
          history: messages.slice(-MAX_HISTORY),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const answer = data?.answer || "Nu am putut genera un răspuns.";
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(`Eroare conexiune: ${e?.message || "necunoscut"}. Verifică internetul sau reîncearcă.`);
      // Rollback: păstrăm userMsg dar marcăm error
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    try {
      localStorage.removeItem(LS_KEY_PREFIX + projectId);
    } catch {
      // ignorăm
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Bubble flotant ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Chat AI reabilitare — Mc 001-2022 + prețuri 2026"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 transition-all border border-violet-400/40"
      >
        <span className="text-lg">💬</span>
        <span className="text-sm font-medium">Asistent AI</span>
      </button>
    );
  }

  // ── Panel deschis ────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl bg-slate-900 border border-violet-500/30 shadow-2xl shadow-violet-900/30">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-violet-500/10 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <div>
            <div className="text-xs font-bold text-violet-200">Asistent AI Reabilitare</div>
            <div className="text-[9px] opacity-50 text-violet-100">Mc 001-2022 · Prețuri RO 2026 · Casa Verde Plus</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              title="Șterge istoric chat"
              className="p-1.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 text-xs"
            >
              🗑
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            title="Închide chat"
            className="p-1.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Context badge */}
      {(building?.category || energyClass?.cls) && (
        <div className="px-3 py-1.5 border-b border-white/5 text-[10px] text-white/40 bg-white/[0.015]">
          Context:
          {building?.category ? <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-white/70">{building.category}</span> : null}
          {energyClass?.cls ? <span className="ml-1 px-1.5 py-0.5 rounded text-white/70" style={{ backgroundColor: energyClass.color + "20" }}>Clasa {energyClass.cls}</span> : null}
          {opaqueAvgU ? <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-white/70">U opac {opaqueAvgU}</span> : null}
          {glazingAvgU ? <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-white/70">U vitraj {glazingAvgU}</span> : null}
        </div>
      )}

      {/* Mesaje */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-xs py-8 px-2">
            <div className="text-2xl mb-2">💡</div>
            <div>Întreabă orice despre reabilitarea clădirii.</div>
            <div className="mt-3 space-y-1 text-[10px] opacity-70 text-left">
              <div>Exemple:</div>
              <div className="pl-3">• „Care e ordinea optimă a măsurilor pentru bloc PAFP '75?"</div>
              <div className="pl-3">• „Cât costă reabilitarea anvelopei la 100 m²?"</div>
              <div className="pl-3">• „Cum maximizez subvenția Casa Verde Plus?"</div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-xs max-w-[90%]",
              m.role === "user"
                ? "ml-auto bg-violet-600/20 border border-violet-500/30 text-violet-100"
                : "bg-white/5 border border-white/10 text-white/85"
            )}
          >
            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/50 max-w-[60%]">
            <span className="inline-flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse [animation-delay:0.15s]">●</span>
              <span className="animate-pulse [animation-delay:0.3s]">●</span>
            </span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-2.5 rounded-b-2xl bg-white/[0.02]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            placeholder={hasAccess ? "Întreabă AI-ul despre reabilitare..." : "Necesită plan AE Ici sau superior"}
            className="flex-1 resize-none px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 disabled:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || !hasAccess}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "..." : "Trimite"}
          </button>
        </div>
        <div className="text-[9px] text-white/30 mt-1.5 px-1">
          Enter trimite · Shift+Enter linie nouă · Răspunsuri orientative — verifică surse oficiale.
        </div>
      </div>
    </div>
  );
}

// Export auxiliar pentru testare unitară
export { buildChatContext, LS_KEY_PREFIX, MAX_HISTORY };
