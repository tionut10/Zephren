/**
 * AINarrativeButton.jsx — Buton reusabil pentru generare text narativ AI
 *
 * Audit mai 2026 P1.2 — foundation caller-side pentru intent="narrative"
 * (api/ai-assistant.js F6).
 *
 * Folosit în:
 *   - report-generators.js Cap. 1 descriere + Cap. 8 concluzii
 *   - passport-docx.js intro Pașaport Renovare
 *   - OfertaReabilitare.jsx intro descriere clădire
 *   - PasaportBasic.jsx (post EPBD transpunere RO 29.05.2026)
 *
 * Workflow:
 *   1. User click „🤖 Generează"
 *   2. POST /api/ai-assistant cu intent="narrative" + section + context
 *   3. Răspuns AI → callback onGenerated(text) pentru a popula textarea
 *   4. Toast success/error
 *
 * Gating: necesită plan cu acces AI Pack (Pro+).
 */

import { useState } from "react";
import { cn } from "./ui.jsx";

const SECTION_LABELS = {
  cap1_descriere:        "Cap. 1 — Descrierea clădirii",
  cap8_concluzii:        "Cap. 8 — Concluzii audit",
  intro_pasaport:        "Intro Pașaport Renovare",
  intro_foaie_parcurs:   "Intro Foaie de Parcurs",
  recomandari_anexa_aeIIci: "Recomandări Anexa 1+2 (tier IIci)",
  summary_audit_exec:    "Sumar executiv (1 pagină)",
};

/**
 * @param {Object} props
 * @param {string} props.section — cheia secțiunii: cap1_descriere | cap8_concluzii | intro_pasaport | intro_foaie_parcurs | recomandari_anexa_aeIIci | summary_audit_exec
 * @param {Object} props.context — context complet pentru AI (building, energyClass, ep, rer, etc.)
 * @param {Function} props.onGenerated — callback(text) cu text generat
 * @param {Function} [props.showToast] — callback(message, kind, ms)
 * @param {boolean} [props.hasAccess=true] — gating AI Pack
 * @param {number} [props.sectionLength=300] — lungime țintă cuvinte
 * @param {string} [props.size="md"] — "sm" | "md" | "lg"
 * @param {string} [props.label] — text override default
 */
export default function AINarrativeButton({
  section,
  context = {},
  onGenerated,
  showToast,
  hasAccess = true,
  sectionLength = 300,
  size = "md",
  label,
}) {
  const [loading, setLoading] = useState(false);

  const sectionLabel = label || SECTION_LABELS[section] || section;

  async function generate() {
    if (!hasAccess) {
      showToast?.(
        "Generare AI necesită plan AE Ici (1.499 RON/lună) sau superior — AI Pack inclus.",
        "info",
        4000
      );
      return;
    }
    if (!section) {
      showToast?.("Section parameter obligatoriu pentru generare narrative", "error", 3000);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Generează ${sectionLabel} pentru clădirea specificată în context.`,
          intent: "narrative",
          context: {
            ...context,
            section,
            sectionLength,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const text = data?.answer || "";
      if (text) {
        onGenerated?.(text);
        showToast?.(`✅ Text AI generat (${text.length} caractere)`, "success", 3000);
      } else {
        showToast?.("Răspuns AI gol — încercați din nou.", "warning", 3000);
      }
    } catch (e) {
      showToast?.(
        `Eroare AI: ${e?.message || "necunoscut"}. Verifică internetul.`,
        "error",
        4000
      );
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses = {
    sm: "text-[10px] px-2 py-1",
    md: "text-xs px-3 py-1.5",
    lg: "text-sm px-4 py-2",
  };

  return (
    <button
      onClick={generate}
      disabled={loading || !section}
      title={`Generează ${sectionLabel} cu Claude Sonnet 4.6`}
      className={cn(
        "rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5",
        sizeClasses[size] || sizeClasses.md
      )}
    >
      {loading ? (
        <>
          <span className="inline-flex gap-0.5">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse [animation-delay:0.15s]">●</span>
            <span className="animate-pulse [animation-delay:0.3s]">●</span>
          </span>
          <span>Generare...</span>
        </>
      ) : (
        <>
          <span>🤖</span>
          <span>Generează</span>
        </>
      )}
    </button>
  );
}

// Export utility direct (fără component) pentru apel programatic
export async function fetchNarrativeAI({ section, context, sectionLength = 300 }) {
  if (!section) throw new Error("section obligatoriu");
  const response = await fetch("/api/ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: `Generează ${SECTION_LABELS[section] || section} pentru clădirea specificată.`,
      intent: "narrative",
      context: {
        ...context,
        section,
        sectionLength,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data?.answer || "";
}

export { SECTION_LABELS };
