/**
 * normalizeGlazing.js — fix D2 pentru inconsistența câmp `type` vs `glazingType`.
 *
 * CONTEXT (bug aprobat prin decizie D2 în envelope_hub_design.md):
 *   - `src/components/GlazingModal.jsx` folosește `glazingType` în state-ul local.
 *   - `src/data/demoProjects.js` folosește `type` (moștenit din prima iterație).
 *   - `src/steps/Step2Envelope.jsx:114` afișează `el.glazingType` — dacă lipsește
 *     (cum e în demo-uri) apare gol în listă.
 *   - `src/energy-calc.jsx` CSV/PDF/Excel export citește `el.glazingType`.
 *
 * ABORDARE (read-only, non-invazivă):
 *   Normalizare la load-time (la `loadDemoByIndex`, `importProject`, drop-zone).
 *   NU migrăm datele în sursă (demoProjects.js rămân cu `type` → backwards compat).
 *   NU schimbăm GlazingModal (rămâne ca „sursă de adevăr" pentru câmpul canonic).
 *
 * REGULI:
 *   1. Dacă `el.glazingType` există și e non-empty → returnează elementul ca atare.
 *   2. Dacă lipsește dar există `el.type` → copiază în `glazingType`.
 *   3. Alte câmpuri rămân neatinse. Nu aruncăm niciun câmp.
 */

/**
 * Normalizează un singur element vitrat.
 * @param {Object} el - Element glazing brut.
 * @returns {Object} Element normalizat (clone shallow, nu modifică originalul).
 */
export function normalizeGlazingElement(el) {
  if (!el || typeof el !== "object") return el;
  const hasGlazingType = typeof el.glazingType === "string" && el.glazingType.trim().length > 0;
  if (hasGlazingType) return el;
  // Fallback: copiere din `type` (demo projects schema)
  if (typeof el.type === "string" && el.type.trim().length > 0) {
    return { ...el, glazingType: el.type };
  }
  return el;
}

/**
 * Normalizează o listă de elemente vitrate.
 * @param {Array} list - Listă glazingElements.
 * @returns {Array} Listă normalizată (lungime identică, elementele clonate shallow doar dacă au fost modificate).
 */
export function normalizeGlazingList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeGlazingElement);
}
