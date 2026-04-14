/**
 * envelopeHints.js — context hints „next-best-action" pentru anvelopă.
 *
 * Regulă de aur: un singur hint afișat la un moment dat, cel mai relevant.
 * Ordinea e importantă — primul match câștigă (evaluăm de la cel mai gol la
 * cel mai complet). Fiecare hint are un `action` care mapează către un ramp.
 *
 * INPUT: starea Step 2 (opaqueElements, glazingElements, thermalBridges, building,
 *        progress.pct, progress.missing).
 * OUTPUT: { icon, text, action, tone } sau null dacă nu sugerăm nimic.
 */

const TONES = Object.freeze({
  info:    "indigo",   // sugestie neutră
  prompt:  "amber",    // prompt activ (user trebuie să acționeze)
  success: "emerald",  // totul e aproape gata
});

/**
 * Returnează primul hint relevant din lista de reguli, sau null.
 *
 * @param {Object} state
 * @param {Array}  state.opaqueElements
 * @param {Array}  state.glazingElements
 * @param {Array}  state.thermalBridges
 * @param {Object} state.building
 * @param {Object} state.progress       - { pct, filled, total, missing }
 * @returns {{icon: string, text: string, action: string, tone: string}|null}
 */
export function computeEnvelopeHint(state) {
  const opaque  = state.opaqueElements  || [];
  const glazing = state.glazingElements || [];
  const bridges = state.thermalBridges  || [];
  const progress = state.progress || { pct: 0, missing: [] };
  const areaEnvelope = parseFloat(state.building?.areaEnvelope) || 0;

  // 1. Stare goală → începe cu un șablon Instant.
  if (opaque.length === 0 && glazing.length === 0 && bridges.length === 0) {
    return {
      icon: "💡",
      text: "Începe rapid: alege un șablon de tipologie (Rezidențial vechi / nZEB / Birouri) din rampa Instant.",
      action: "instant",
      tone: TONES.info,
    };
  }

  // 2. Ai geometrie din Step 1 dar nicio anvelopă → oferă generare 4 pereți.
  if (opaque.length === 0 && areaEnvelope > 0) {
    return {
      icon: "🧱",
      text: `Ai suprafața anvelopei ${areaEnvelope.toFixed(0)} m² din Step 1 — generez 4 pereți N/S/E/V automat?`,
      action: "instant",
      tone: TONES.prompt,
    };
  }

  // 3. Ai 3+ pereți dar 0 punți → oferă pachetul standard de 5 punți.
  if (opaque.length >= 3 && bridges.length === 0) {
    return {
      icon: "🔗",
      text: "Ai 3+ elemente opace — aplic pachetul standard de 5 punți termice (perete-terasă, perete-sol, colț, glaf, balcon)?",
      action: "bridges",
      tone: TONES.prompt,
    };
  }

  // 4. Ai pereți dar 0 vitraje → reamintire.
  if (opaque.length >= 2 && glazing.length === 0) {
    return {
      icon: "🪟",
      text: "Nu ai adăugat niciun element vitrat — ferestre, uși transparente, luminatoare. Sunt obligatorii pentru CPE.",
      action: "guided",
      tone: TONES.prompt,
    };
  }

  // 5. Element fără orientare setată → semnalizează direct.
  const missingOrient = opaque.find(el => !(el?.orientation && String(el.orientation).trim()));
  if (missingOrient) {
    return {
      icon: "🧭",
      text: `„${missingOrient.name || "un element opac"}" nu are orientarea setată — afectează radiația solară și pierderile estivale.`,
      action: "guided",
      tone: TONES.prompt,
    };
  }

  // 6. Element opac fără straturi valide (λ=0) → buton direct wizard.
  const brokenLayers = opaque.find(el =>
    !Array.isArray(el?.layers) || !el.layers.some(l => parseFloat(l?.lambda) > 0)
  );
  if (brokenLayers) {
    return {
      icon: "⚠️",
      text: `„${brokenLayers.name || "un element"}" nu are straturi constructive complete (λ lipsește). Deschide editor-ul.`,
      action: "guided",
      tone: TONES.prompt,
    };
  }

  // 7. Suprafață totală în afara toleranței ±10% față de areaEnvelope.
  if (areaEnvelope > 0) {
    const sum = opaque.reduce((s, el) => s + (parseFloat(el?.area) || 0), 0)
              + glazing.reduce((s, el) => s + (parseFloat(el?.area) || 0), 0);
    if (sum > 0) {
      const delta = (sum - areaEnvelope) / areaEnvelope;
      if (Math.abs(delta) > 0.10) {
        const pct = (delta * 100).toFixed(1);
        const verb = delta > 0 ? "depășește" : "sub";
        return {
          icon: "📐",
          text: `Suma elementelor ${verb} suprafața anvelopei cu ${Math.abs(pct)}% — verifică ariile.`,
          action: "guided",
          tone: TONES.prompt,
        };
      }
    }
  }

  // 8. Progres parțial între 40-79% — invită la wizard ghidat.
  if (progress.pct >= 40 && progress.pct < 80) {
    const topMissing = (progress.missing && progress.missing[0]?.label) || "completare date";
    return {
      icon: "🎯",
      text: `${progress.pct}% complet. Urmează: ${topMissing.toLowerCase()}.`,
      action: "guided",
      tone: TONES.info,
    };
  }

  // 9. Progres foarte bun (≥80%) — încurajare scurtă.
  if (progress.pct >= 80 && progress.pct < 100) {
    return {
      icon: "🚀",
      text: `${progress.pct}% complet — aproape gata. Verifică doar detaliile rămase.`,
      action: null,
      tone: TONES.success,
    };
  }

  // 10. 100% complet — niciun hint.
  return null;
}
