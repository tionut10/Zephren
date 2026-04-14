/**
 * ChatImport — completare vocală/textuală a datelor clădirii
 * Buton flotant "💬" ce deschide un chat minimalist.
 * Utilizatorul descrie clădirea în cuvinte → Claude extrage date structurate.
 */
import { useState, useRef, useEffect, useCallback } from "react";

const EXAMPLES = [
  "Apartament 3 camere, bloc P+4 din 1982, București, cazan gaz condensare, fără izolație, vânzare",
  "Casă veche 1960, sat Moldova, sobe lemne, ferestre simple, 120m², P+M",
  "Vilă nouă 2023 Cluj, pompă căldură 12kW, PV 6kWp, VMCR 90%, pasivhaus, 180m²",
  "Birouri P+3 Brașov, VRF Daikin, LED, HR 80%, fațadă cortină, 2500m²",
];

export default function ChatImport({ onApply, showToast, isOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Controlled dacă isOpen e definit; altfel folosește starea internă
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = useCallback((valOrFn) => {
    const newVal = typeof valOrFn === "function" ? valOrFn(open) : valOrFn;
    if (onOpenChange) onOpenChange(newVal);
    else setInternalOpen(newVal);
  }, [onOpenChange, open]);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Descrie clădirea în câteva cuvinte — adresă, tip, an, instalații, scopul CPE. Extrag automat datele pentru Pașii 1–4." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastData, setLastData] = useState(null);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const { reply, data, missingFields } = await res.json();

      let assistantMsg = reply || "Am extras datele.";
      if (missingFields?.length) {
        assistantMsg += `\n\nCâmpuri lipsă: ${missingFields.slice(0, 5).join(", ")}.`;
      }

      setMessages(prev => [...prev, { role: "assistant", text: assistantMsg, data }]);
      if (data) setLastData(data);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Eroare: " + e.message }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const applyLastData = useCallback(() => {
    if (!lastData) return;
    onApply(lastData);
    showToast("Date aplicate din chat", "success");
    setOpen(false);
  }, [lastData, onApply, showToast]);

  return (
    <>
      {/* Buton flotant */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Descrie clădirea verbal"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-xl transition-all ${
          open ? "bg-indigo-600 scale-110" : "bg-[#1e2035] border border-white/15 hover:bg-indigo-600 hover:scale-105"
        }`}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Panel chat */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 w-80 rounded-2xl border border-white/10 bg-[#12141f] shadow-2xl flex flex-col"
          style={{ maxHeight: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <span className="text-base">💬</span>
            <div className="flex-1">
              <div className="text-xs font-bold">Descrie clădirea verbal</div>
              <div className="text-[10px] opacity-40">Completare automată Pași 1–4</div>
            </div>
            {lastData && (
              <button
                onClick={applyLastData}
                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all"
              >
                Aplică →
              </button>
            )}
          </div>

          {/* Mesaje */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600/70 text-white"
                    : "bg-white/[0.06] text-white/80"
                }`}>
                  {msg.text}
                  {msg.data && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] opacity-60">
                      ✓ Date extrase — apasă "Aplică" pentru a completa calculatorul
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] rounded-xl px-3 py-2 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Exemple rapide */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 space-y-1">
              <div className="text-[10px] opacity-30 mb-1">Exemple rapide:</div>
              {EXAMPLES.slice(0, 2).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setInput(ex)}
                  className="w-full text-left text-[10px] rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] px-2 py-1.5 opacity-60 hover:opacity-90 transition-all leading-snug"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/5 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descrie clădirea..."
              rows={2}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs resize-none focus:outline-none focus:border-white/20 leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 self-end rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 flex items-center justify-center text-sm transition-all shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
