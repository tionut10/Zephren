/**
 * useAutoSaveStep1Draft — Sprint Smart Input 2026 (1.3)
 *
 * Salvare rapidă (debounce 2s) a state-ului `building` din Step 1 în localStorage,
 * pentru a preveni pierderea datelor la F5 / browser crash. Complementar cu
 * `useAutoBackup` (debounce 30s, întregul proiect, IndexedDB+Supabase).
 *
 * De ce localStorage:
 *   - sincron, fără overhead async
 *   - <10KB date Step 1 → nici pe departe limita 5MB
 *   - draft-ul e strict local — nu necesită sincronizare cloud
 *   - zero migrare schemă (vs IndexedDB version bump)
 *
 * API:
 *   useAutoSaveStep1Draft(building, { enabled })  — hook, salvează automat
 *   readStep1Draft()                              — citește draft existent
 *   clearStep1Draft()                             — șterge draft (după restaurare sau salvare proiect)
 *   hasUsableDraft(building, minDeltaFields=2)    — true dacă draft conține semnificativ mai multe câmpuri decât current
 */

import { useEffect, useRef } from "react";

const STORAGE_KEY = "zephren_step1_draft_v1";
const DEBOUNCE_MS = 2000;
const MIN_FIELDS_TO_SAVE = 2; // Nu spam-ăm cu draft-uri goale

// Câmpurile Step 1 considerate „semnificative" pentru contorul recovery
const TRACKED_FIELDS = [
  "category", "yearBuilt", "areaUseful", "locality",
  "city", "county", "structure", "floors", "volume", "areaEnvelope",
  "heightFloor", "scopCpe", "apartmentNo", "nApartments",
  "cadastralNumber", "landBook", "address",
];

function countMeaningfulFields(building) {
  if (!building || typeof building !== "object") return 0;
  let n = 0;
  for (const f of TRACKED_FIELDS) {
    const v = building[f];
    if (v != null && String(v).trim() !== "") n++;
  }
  return n;
}

function safeGetItem() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function safeSetItem(value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // QuotaExceededError / privacy mode — fail silent
  }
}

function safeRemoveItem() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API public
// ─────────────────────────────────────────────────────────────────────────────

export function readStep1Draft() {
  const raw = safeGetItem();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.building || typeof parsed.building !== "object") return null;
    return {
      building: parsed.building,
      savedAt: parsed.savedAt || null,
      fieldsCount: countMeaningfulFields(parsed.building),
    };
  } catch {
    return null;
  }
}

export function clearStep1Draft() {
  safeRemoveItem();
}

/**
 * Determină dacă draft-ul curent merită oferit utilizatorului pentru recovery.
 * Criteriu: draft trebuie să conțină cu cel puțin `minDeltaFields` câmpuri
 * mai mult decât building-ul actual (altfel e doar zgomot).
 */
export function hasUsableDraft(currentBuilding, minDeltaFields = 2) {
  const draft = readStep1Draft();
  if (!draft) return false;
  const currentCount = countMeaningfulFields(currentBuilding);
  return draft.fieldsCount >= currentCount + minDeltaFields;
}

/**
 * Hook auto-save: scrie `building` în localStorage cu debounce 2s.
 * Sare peste salvare dacă numărul de câmpuri completate < MIN_FIELDS_TO_SAVE.
 */
export function useAutoSaveStep1Draft(building, { enabled = true } = {}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const fieldsCount = countMeaningfulFields(building);
    if (fieldsCount < MIN_FIELDS_TO_SAVE) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const payload = {
        building,
        savedAt: new Date().toISOString(),
        fieldsCount,
      };
      safeSetItem(JSON.stringify(payload));
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [building, enabled]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper formatare timp relativ (pentru banner)
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
