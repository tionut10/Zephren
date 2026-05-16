/**
 * proposed-measures.js — Sprint Suggestion Queue (16 mai 2026)
 *
 * Coadă globală de „măsuri propuse" generate din Pas 3 + Pas 4 (sugestii catalog).
 * Auditorul click pe „Propune" la o sugestie → intră aici → afișată în Pas 7 (Audit)
 * tab „Recomandări din Pas 3+4" unde poate fi editată/aprobată/respinsă.
 *
 * Filozofie: SEPARARE STRICTĂ baseline vs propunere.
 *   - Pas 3+4 formularele = STAREA EXISTENTĂ din clădire (CPE oficial Mc 001-2022)
 *   - Coada `proposedMeasures` = PROPUNERI auditor pentru îmbunătățire (audit Mc 001 §10)
 *
 * Sursă autoritară: Mc 001-2022 §10 (auditare energetică + recomandări măsuri)
 *                   + Ord. MDLPA 348/2026 Art. 6 alin. 1 (audit energetic AE Ici).
 *
 * Pattern: useSyncExternalStore (React 19 nativ) + localStorage persistence.
 * Zero deps externe. Compatible cu currency-context.js pattern (Sprint 9 mai 2026).
 *
 * API:
 *   - proposeMeasure(entry, meta)   → adaugă în coadă (returnează id)
 *   - removeMeasure(id)              → șterge din coadă
 *   - updateMeasure(id, partial)     → patch (status/auditorEdits/cost override)
 *   - clearAll()                     → reset coadă
 *   - getMeasures(filter?)           → snapshot read (sincron)
 *   - useProposedMeasures(selector?) → hook React (re-render minim)
 *   - subscribeProposedMeasures(cb)  → manual subscribe (non-React)
 */

const STORAGE_KEY = "zephren_proposed_measures";
const SCHEMA_VERSION = 1;

// ─── Schema & validare ──────────────────────────────────────────────────────

/**
 * Categorii valide — mapate cu surse din Pas 3 + Pas 4.
 * Extensible: pentru o categorie nouă (ex: "envelope-windows"), adaugă aici.
 */
export const MEASURE_CATEGORIES = Object.freeze([
  // Pas 3 — Sisteme tehnice (HVAC)
  "heating",
  "acm",
  "cooling",
  "ventilation",
  "lighting",
  // Pas 4 — Surse regenerabile
  "pv",
  "solar-thermal",
  "wind",
  "biomass",
  "heat-pump",
  "chp",
  "battery",
  // Future: Pas 2 anvelopă (când vom extinde)
  "envelope-opaque",
  "envelope-glazing",
  "envelope-bridge",
]);

export const MEASURE_STATUSES = Object.freeze([
  "proposed",  // doar adăugat (default)
  "edited",    // auditorul a modificat parametri
  "approved",  // marcat pentru includere în raport
  "rejected",  // marcat pentru excludere (păstrat pentru istoric)
]);

export const MEASURE_SOURCES = Object.freeze([
  "Step3",       // sugestie din Pas 3 (Systems)
  "Step4",       // sugestie din Pas 4 (Renewables)
  "Step7-auto",  // generat automat de motor sugestii Step 7 (smartSuggestions.js)
  "manual",      // auditor adăugat manual
]);

/**
 * Construiește un obiect măsură normalizat dintr-o intrare catalog + meta.
 *
 * @param {Object} entry — intrare din catalog sugestii (ex: din suggestions-catalog.js)
 * @param {Object} meta — context sursa propunerii
 * @param {string} meta.sourceStep — "Step3" | "Step4" | "Step7-auto" | "manual"
 * @param {string} meta.category — una din MEASURE_CATEGORIES
 * @returns {Object} măsură normalizată
 */
export function buildMeasure(entry, meta) {
  if (!entry || typeof entry !== "object") {
    throw new Error("buildMeasure: entry required");
  }
  const category = meta?.category;
  const sourceStep = meta?.sourceStep || "manual";
  if (!MEASURE_CATEGORIES.includes(category)) {
    throw new Error(`buildMeasure: invalid category "${category}" — must be one of ${MEASURE_CATEGORIES.join(",")}`);
  }
  if (!MEASURE_SOURCES.includes(sourceStep)) {
    throw new Error(`buildMeasure: invalid sourceStep "${sourceStep}"`);
  }
  return {
    id: _generateId(),
    sourceStep,
    category,
    catalogEntryId: entry.id || null,
    label: entry.label || entry.name || "Măsură fără denumire",
    labelEN: entry.labelEN || null,
    description: entry.description || null,
    tech: entry.tech ? { ...entry.tech } : {},
    priceRange: entry.priceRange ? { ...entry.priceRange } : null,
    tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
    subcategory: entry.subcategory || null,
    meetsTarget: entry.meetsTarget ?? null,
    warnings: Array.isArray(entry.warnings) ? [...entry.warnings] : [],
    // Audit trail
    proposedAt: new Date().toISOString(),
    status: "proposed",
    auditorEdits: null, // {} cu modificări manuale (override tech, cost, etc.)
    auditorNotes: null, // string liber
  };
}

function _generateId() {
  // Pattern simplu fără uuid lib — suficient pentru localStorage
  return `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── State + persistence ────────────────────────────────────────────────────

let _state = _loadFromStorage();
const _listeners = new Set();

function _loadFromStorage() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { schemaVersion: SCHEMA_VERSION, measures: [] };
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.measures)) {
      return parsed;
    }
    // Schema mismatch — reset
    return { schemaVersion: SCHEMA_VERSION, measures: [] };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, measures: [] };
  }
}

function _persist() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // Storage quota exceeded or disabled — silent fail
  }
}

function _notify() {
  for (const cb of _listeners) {
    try { cb(); } catch {}
  }
}

// ─── Public API — mutations ─────────────────────────────────────────────────

/**
 * Adaugă o măsură în coadă din sugestia catalog.
 * Dacă există deja o măsură cu același catalogEntryId + sourceStep, NU duplică
 * (returnează id-ul existent + marcaj `_duplicate: true`).
 *
 * @param {Object} entry — intrare catalog (din SUGGESTIONS_FOR_X())
 * @param {Object} meta — { sourceStep, category }
 * @returns {{ id: string, duplicate: boolean }} — id măsură (nouă sau existentă)
 */
export function proposeMeasure(entry, meta) {
  const measure = buildMeasure(entry, meta);
  // Deduplicare: același catalog entry + sursa = nu adaugăm a doua oară
  if (measure.catalogEntryId) {
    const existing = _state.measures.find(
      m => m.catalogEntryId === measure.catalogEntryId
        && m.sourceStep === measure.sourceStep
        && m.status !== "rejected"
    );
    if (existing) {
      return { id: existing.id, duplicate: true };
    }
  }
  _state = { ..._state, measures: [..._state.measures, measure] };
  _persist();
  _notify();
  return { id: measure.id, duplicate: false };
}

/**
 * Șterge o măsură din coadă după id.
 * @returns {boolean} true dacă a fost ștearsă
 */
export function removeMeasure(id) {
  const before = _state.measures.length;
  _state = { ..._state, measures: _state.measures.filter(m => m.id !== id) };
  if (_state.measures.length !== before) {
    _persist();
    _notify();
    return true;
  }
  return false;
}

/**
 * Actualizează parțial o măsură (status, auditorEdits, notes).
 * Câmpuri imutabile: id, sourceStep, proposedAt, catalogEntryId.
 *
 * @param {string} id
 * @param {Object} partial — câmpuri de modificat (status/auditorEdits/auditorNotes/tech)
 * @returns {boolean} true dacă a fost găsită + actualizată
 */
export function updateMeasure(id, partial) {
  if (!partial || typeof partial !== "object") return false;
  const idx = _state.measures.findIndex(m => m.id === id);
  if (idx < 0) return false;

  // Validare status dacă e prezent
  if (partial.status && !MEASURE_STATUSES.includes(partial.status)) {
    return false;
  }
  // Câmpuri protejate (NU se pot suprascrie)
  const PROTECTED = ["id", "sourceStep", "proposedAt", "catalogEntryId"];
  const sanitized = Object.fromEntries(
    Object.entries(partial).filter(([k]) => !PROTECTED.includes(k))
  );

  const updated = { ..._state.measures[idx], ...sanitized };
  const newMeasures = [..._state.measures];
  newMeasures[idx] = updated;
  _state = { ..._state, measures: newMeasures };
  _persist();
  _notify();
  return true;
}

/**
 * Șterge toate măsurile (cu confirmare auditor).
 */
export function clearAll() {
  if (_state.measures.length === 0) return false;
  _state = { ..._state, measures: [] };
  _persist();
  _notify();
  return true;
}

// ─── Public API — read ──────────────────────────────────────────────────────

/**
 * Returnează snapshot al măsurilor (sincron, fără re-render).
 *
 * @param {Object} [filter]
 * @param {string|string[]} [filter.sourceStep] — filtru per sursă ("Step3", "Step4", ...)
 * @param {string|string[]} [filter.category]   — filtru per categorie
 * @param {string|string[]} [filter.status]     — filtru per status
 * @returns {Array<Measure>}
 */
export function getMeasures(filter = {}) {
  const { sourceStep, category, status } = filter;
  let list = _state.measures;

  if (sourceStep) {
    const arr = Array.isArray(sourceStep) ? sourceStep : [sourceStep];
    list = list.filter(m => arr.includes(m.sourceStep));
  }
  if (category) {
    const arr = Array.isArray(category) ? category : [category];
    list = list.filter(m => arr.includes(m.category));
  }
  if (status) {
    const arr = Array.isArray(status) ? status : [status];
    list = list.filter(m => arr.includes(m.status));
  }
  return list;
}

/**
 * Conțeagă măsuri grupate pe sursă + categorie + status.
 */
export function getMeasuresStats() {
  const stats = {
    total: _state.measures.length,
    bySource: { Step3: 0, Step4: 0, "Step7-auto": 0, manual: 0 },
    byCategory: {},
    byStatus: { proposed: 0, edited: 0, approved: 0, rejected: 0 },
  };
  for (const m of _state.measures) {
    stats.bySource[m.sourceStep] = (stats.bySource[m.sourceStep] || 0) + 1;
    stats.byCategory[m.category] = (stats.byCategory[m.category] || 0) + 1;
    stats.byStatus[m.status] = (stats.byStatus[m.status] || 0) + 1;
  }
  return stats;
}

// ─── Subscribe (pentru useSyncExternalStore + tests) ────────────────────────

export function subscribeProposedMeasures(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

/**
 * Snapshot pentru useSyncExternalStore — referință stabilă pentru shallow compare.
 * IMPORTANT: returnează același obiect dacă nu s-a schimbat nimic.
 */
export function getProposedMeasuresSnapshot() {
  return _state;
}

// ─── Test helpers (export DOAR pentru test/dev) ─────────────────────────────

/** @internal — folosit DOAR în teste pentru reset. NU folosi în UI. */
export function _resetForTests() {
  _state = { schemaVersion: SCHEMA_VERSION, measures: [] };
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch {}
  _notify();
}

/** @internal — debug în dev console */
export function _debugDump() {
  return { ..._state, listeners: _listeners.size };
}
