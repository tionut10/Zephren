/**
 * useAutoSaveProjectDraft — Sprint Smart Input 2026 (D1)
 *
 * Salvare rapidă (debounce 5s) a întregului state proiect (8 pași) în localStorage,
 * pentru a preveni pierderea datelor la F5 / browser crash în orice etapă.
 *
 * Filozofie: complementar lui `useAutoBackup` (debounce 30s, IndexedDB+Supabase
 * pentru persistență de durată). Acest hook e pentru „undo F5" rapid:
 *   - 5s între salvări vs. 30s
 *   - localStorage (sincron, zero overhead) vs. IndexedDB async
 *   - O singură cheie cu întregul snapshot vs. cloud per-project
 *
 * NU înlocuiește backup-ul cloud — îl precedă. La utilizatorii fără cont,
 * useAutoBackup salvează în IDB; aici salvăm și mai rapid în LS.
 *
 * API:
 *   useAutoSaveProjectDraft(projectState, { enabled, debounceMs })
 *   readProjectDraft() → { state, savedAt, completeness } | null
 *   clearProjectDraft()
 *   hasUsableProjectDraft(currentState, minDeltaFields=3)
 */

import { useEffect, useRef } from "react";

const STORAGE_KEY = "zephren_project_full_draft_v1";
const DEFAULT_DEBOUNCE_MS = 5000;
const MIN_FIELDS = 3;

// Câmpurile pe care le numărăm pentru estimarea „completeness" snapshot:
const KEY_BUILDING_FIELDS = [
  "category", "yearBuilt", "areaUseful", "locality",
  "city", "county", "structure", "floors", "volume",
  "areaEnvelope", "heightFloor", "scopCpe", "address",
];

function countCompleteness(state) {
  if (!state || typeof state !== "object") return 0;
  let n = 0;
  // Building Step 1
  const b = state.building || {};
  for (const f of KEY_BUILDING_FIELDS) {
    const v = b[f];
    if (v != null && String(v).trim() !== "") n++;
  }
  // Step 2 anvelopă (cont elementelor)
  if (Array.isArray(state.opaqueElements))  n += state.opaqueElements.length;
  if (Array.isArray(state.glazingElements)) n += state.glazingElements.length;
  if (Array.isArray(state.thermalBridges))  n += state.thermalBridges.length;
  // Step 3 instalații (un punct dacă există config)
  if (state.heating?.source) n++;
  if (state.acm?.source)     n++;
  if (state.cooling?.system && state.cooling.system !== "NONE") n++;
  if (state.ventilation?.type) n++;
  // Step 4 regenerabile
  if (state.solarThermal?.enabled) n++;
  if (state.photovoltaic?.enabled) n++;
  if (state.heatPump?.enabled)     n++;
  if (state.biomass?.enabled)      n++;
  return n;
}

function safeGetItem() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch { return null; }
}

function safeSetItem(value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // QuotaExceeded / privacy mode — fail silent
  }
}

function safeRemoveItem() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// API public
// ─────────────────────────────────────────────────────────────────────────────

export function readProjectDraft() {
  const raw = safeGetItem();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.state || typeof parsed.state !== "object") return null;
    return {
      state: parsed.state,
      savedAt: parsed.savedAt || null,
      completeness: countCompleteness(parsed.state),
    };
  } catch {
    return null;
  }
}

export function clearProjectDraft() {
  safeRemoveItem();
}

export function hasUsableProjectDraft(currentState, minDeltaFields = MIN_FIELDS) {
  const draft = readProjectDraft();
  if (!draft) return false;
  const currentScore = countCompleteness(currentState);
  return draft.completeness >= currentScore + minDeltaFields;
}

/**
 * Hook: auto-save proiect complet (debounce default 5s).
 *
 * @param {object} projectState
 *   Combinaţia tuturor state-urilor pe care vrei să le salvezi.
 *   Ex: { building, opaqueElements, glazingElements, heating, ... }
 * @param {object} options
 *   { enabled?: boolean, debounceMs?: number }
 */
export function useAutoSaveProjectDraft(projectState, options = {}) {
  const { enabled = true, debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const completeness = countCompleteness(projectState);
    if (completeness < MIN_FIELDS) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const payload = {
        state: projectState,
        savedAt: new Date().toISOString(),
      };
      try {
        safeSetItem(JSON.stringify(payload));
      } catch {
        // serializare eșuată (cyclic ref) — silent
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [projectState, enabled, debounceMs]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Format relative timp pentru banner recovery (reutilizat din useAutoSaveStep1Draft)
// ─────────────────────────────────────────────────────────────────────────────

export function formatRelativeTime(isoString) {
  if (!isoString) return "recent";
  try {
    const then = new Date(isoString).getTime();
    if (!Number.isFinite(then)) return "recent";
    const diffMs = Date.now() - then;
    if (diffMs < 60_000) return "acum câteva secunde";
    const mins = Math.round(diffMs / 60_000);
    if (mins < 60) return `acum ${mins} ${mins === 1 ? "minut" : "minute"}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `acum ${hours} ${hours === 1 ? "oră" : "ore"}`;
    const days = Math.round(hours / 24);
    return `acum ${days} ${days === 1 ? "zi" : "zile"}`;
  } catch {
    return "recent";
  }
}

export { countCompleteness, STORAGE_KEY, MIN_FIELDS };
