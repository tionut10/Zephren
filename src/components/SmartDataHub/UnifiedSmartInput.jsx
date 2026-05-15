/**
 * UnifiedSmartInput — Sprint Smart Input 2026 (2.2)
 *
 * Input universal multimodal pentru completare rapidă date clădire.
 * Pattern: hero card cu un singur câmp text + butoane shortcut pentru:
 *   🎤 Voice (Web Speech API)
 *   📷 Cameră / upload imagine (fallback file input + capture="environment")
 *   📎 File picker general
 *
 * Filozofie: NU înlocuiește rampele existente, ci oferă o cale rapidă deasupra
 * lor pentru auditorii care preferă să tasteze / dicteze.
 *
 * Routing:
 *   - text ≥ 10 chars → onSubmitText(text) (părintele decide: Chat AI / parser)
 *   - voce → recognition.result → input.value → submit ca text
 *   - imagine → onPickImage(file) (părintele rutează la Drawing AI sau Foto fațadă AI)
 *   - alt fișier → onPickFile(file) (părintele rutează prin detectFileType existent)
 *
 * Accessibility:
 *   - aria-label clar
 *   - Enter în input = submit text
 *   - butoanele au aria-label
 *   - mic indicator vizual la recording
 *
 * Browser compat: Web Speech API e Chromium-only (Chrome/Edge/Opera). Firefox/Safari
 * butonul 🎤 e ascuns. Detecție via `'webkitSpeechRecognition' in window`.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
// Sprint Smart Input 2026 (D3) — voice commands proceduriale
import { classifyVoiceCommand } from "./voiceCommandsRO.js";

const MIN_TEXT_CHARS = 10; // sub atât e considerat „prea scurt pentru AI"

// Sprint 2.2 — Exemple sugerate (afișate ca placeholders rotativi)
const PLACEHOLDERS = [
  "Bloc P+4 Iași 1985, 80 apartamente, gaze...",
  "Casă unifamilială Cluj, 1995, 180 mp, sobă lemne...",
  "Birouri P+3 București 2010, VRF Daikin, LED...",
  "Apartament 3 camere, 75 mp, etaj 2, vânzare...",
];

function SupportsSpeech() {
  return typeof window !== "undefined"
    && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
}

export default function UnifiedSmartInput({
  onSubmitText,
  onPickImage,
  onPickFile,
  onVoiceCommand,  // (D3) opțional: dacă există, intercept comenzi proceduriale înainte de submit
  // (D6) Autocomplete inline din templates RO
  templates,         // array de {id, label, cat} — opțional
  onApplyTemplate,   // (templateId) => void — apelat la click pe sugestie
  showToast,
  className = "",
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const speechSupported = SupportsSpeech();

  // (D6) Autocomplete inline — filtrează templates după text (substring case-insensitive)
  const autocompleteMatches = useMemo(() => {
    if (!Array.isArray(templates) || templates.length === 0) return [];
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    // Match dacă label sau id conține query-ul
    const matches = templates.filter(t => {
      const label = String(t.label || "").toLowerCase();
      const id    = String(t.id    || "").toLowerCase();
      const cat   = String(t.cat   || "").toLowerCase();
      return label.includes(q) || id.includes(q) || cat.includes(q);
    });
    // Sortăm: match la început de label > match interior
    matches.sort((a, b) => {
      const la = String(a.label || "").toLowerCase().startsWith(q) ? 0 : 1;
      const lb = String(b.label || "").toLowerCase().startsWith(q) ? 0 : 1;
      return la - lb;
    });
    return matches.slice(0, 4);
  }, [text, templates]);

  // Rotire placeholder la 4s pentru aer (utilizator vede exemple)
  useEffect(() => {
    if (text || listening) return; // nu rotim când utilizator tastează / vorbește
    const id = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [text, listening]);

  // ── Submit text ───────────────────────────────────────────────────────────
  const submitText = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_CHARS) {
      showToast?.(`Adaugă minim ${MIN_TEXT_CHARS} caractere pentru a folosi AI`, "info");
      return;
    }
    // Sprint D3 — întâi încearcă comenzi proceduriale (voice/text scurt acțiune)
    if (typeof onVoiceCommand === "function") {
      const cmd = classifyVoiceCommand(trimmed);
      if (cmd) {
        onVoiceCommand(cmd);
        setText("");
        return;
      }
    }
    if (typeof onSubmitText === "function") {
      onSubmitText(trimmed);
      setText("");
    }
  }, [text, onSubmitText, onVoiceCommand, showToast]);

  // ── Voice recognition (Web Speech API) ────────────────────────────────────
  const startListening = useCallback(() => {
    if (!speechSupported) {
      showToast?.("Reconoaștere vocală nesuportată în acest browser", "error");
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = "ro-RO";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      // Afișează interim text live
      setText(finalText + interim);
    };

    rec.onerror = (event) => {
      console.warn("[UnifiedSmartInput] speech error:", event.error);
      setListening(false);
      if (event.error === "not-allowed") {
        showToast?.("Acces microfon refuzat — verificați permisiunile browserului", "error");
      } else if (event.error === "no-speech") {
        showToast?.("Nu s-a detectat vorbire", "info");
      }
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      setListening(true);
      recognitionRef.current = rec;
    } catch (e) {
      showToast?.("Eroare pornire microfon: " + e.message, "error");
    }
  }, [speechSupported, showToast]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch { /* ignore */ }
    setListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  // ── File / image pickers ──────────────────────────────────────────────────
  const handleImagePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && typeof onPickImage === "function") onPickImage(file);
    e.target.value = "";
  }, [onPickImage]);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && typeof onPickFile === "function") onPickFile(file);
    e.target.value = "";
  }, [onPickFile]);

  // ── Keyboard: Enter = submit, Esc = clear/stop voice ──────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText();
    } else if (e.key === "Escape") {
      if (listening) stopListening();
      else setText("");
    }
  }, [submitText, listening, stopListening]);

  return (
    <div className={`rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.06] to-violet-500/[0.04] p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🪄</span>
        <span className="text-xs font-semibold text-indigo-200">Smart Input</span>
        <span className="text-[9px] uppercase tracking-wide text-indigo-300/60 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
          beta
        </span>
        <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline">
          Scrie · dictează · lipește · alege fișier
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        {/* ── Input principal ───────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "🎤 Vorbește acum..." : PLACEHOLDERS[placeholderIdx]}
            aria-label="Smart Input — descriere clădire în limbaj natural"
            disabled={listening}
            className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
              listening
                ? "border-red-500/40 bg-red-500/[0.04] placeholder:text-red-300/50"
                : "border-white/[0.08] focus:border-indigo-400/50"
            }`}
          />
          {listening && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-red-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          {/* B3 — anunț stare pentru screen readers (invizibil vizual) */}
          <span className="sr-only" aria-live="polite" role="status">
            {listening ? "Înregistrare audio activă" : ""}
          </span>
        </div>

        {/* ── Buton mic 🎤 (doar dacă suportat) ─────────────────────────── */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Oprește dictare" : "Pornește dictare (RO)"}
            aria-pressed={listening}
            title={listening ? "Oprește dictare" : "Dictează în română"}
            className={`shrink-0 px-2.5 rounded-lg border text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
              listening
                ? "border-red-500/40 bg-red-500/15 text-red-300 animate-pulse"
                : "border-indigo-500/30 bg-indigo-500/[0.08] hover:bg-indigo-500/15 text-indigo-300"
            }`}
          >
            🎤
          </button>
        )}

        {/* ── Buton imagine 📷 ──────────────────────────────────────────── */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImagePick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Fotografiază sau alege imagine"
          title="Foto fațadă / planșă"
          className="shrink-0 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/15 text-emerald-300 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          📷
        </button>

        {/* ── Buton file 📎 ─────────────────────────────────────────────── */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ifc,.epw,.csv,.txt,.json,image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFilePick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Alege fișier (IFC, EPW, CSV, PDF, JSON)"
          title="Fișier (IFC, EPW, CSV, PDF, JSON)"
          className="shrink-0 px-2.5 rounded-lg border border-sky-500/30 bg-sky-500/[0.08] hover:bg-sky-500/15 text-sky-300 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          📎
        </button>

        {/* ── Buton submit text → ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={submitText}
          disabled={text.trim().length < MIN_TEXT_CHARS || listening}
          aria-label="Trimite text la Chat AI"
          className="shrink-0 px-3 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-100 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          →
        </button>
      </div>

      {/* ── D6 — Autocomplete inline din templates RO ──────────────────── */}
      {autocompleteMatches.length > 0 && typeof onApplyTemplate === "function" && (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-1.5">
          <div className="text-[9px] text-amber-400/70 uppercase tracking-wide px-2 py-0.5">
            📋 {autocompleteMatches.length} șabloane potrivite — click pentru aplicare
          </div>
          <div className="space-y-0.5">
            {autocompleteMatches.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  onApplyTemplate(tpl.id);
                  setText("");
                  showToast?.(`Șablon aplicat: ${tpl.label}`, "success");
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-amber-500/[0.10] text-left transition-colors group"
                aria-label={`Aplică șablon: ${tpl.label}`}
              >
                <span className="text-[10px] text-amber-200/90 group-hover:text-amber-100 truncate flex-1">
                  {tpl.label}
                </span>
                {tpl.cat && (
                  <span className="text-[8px] font-mono text-amber-400/60 shrink-0">{tpl.cat}</span>
                )}
                <span className="text-amber-400/40 group-hover:text-amber-300 text-[10px] shrink-0">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Hint state ──────────────────────────────────────────────────── */}
      <div className="mt-1.5 text-[9px] text-slate-500 flex items-center gap-3 flex-wrap">
        <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">Enter</kbd> trimite</span>
        <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">Esc</kbd> {listening ? "oprește mic" : "curăță"}</span>
        {!speechSupported && (
          <span className="text-amber-400/70">⚠ Dictare nesuportată — folosește Chrome/Edge</span>
        )}
      </div>
    </div>
  );
}
