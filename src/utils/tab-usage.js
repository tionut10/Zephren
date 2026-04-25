/**
 * Tab Usage Tracker (Sprint B Task 1)
 *
 * Urmărește frecvența de utilizare a tab-urilor Step 8 pentru a sugera
 * automat un set "Top 5 folosite" + permite pin manual.
 *
 * Storage:
 *   - zephren_tab_usage   = { [tabId]: clickCount }
 *   - zephren_pinned_tabs = ["tabId", ...] (max 5, ordine aleasă manual)
 */

const LS_USAGE = "zephren_tab_usage";
const LS_PINS = "zephren_pinned_tabs";
const MAX_PINS = 5;
const TOP_N = 5;

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** Înregistrează un click pe un tab (auto-tracking pentru Top 5). */
export function trackTabClick(tabId) {
  if (!tabId) return;
  const usage = readLS(LS_USAGE, {});
  usage[tabId] = (usage[tabId] || 0) + 1;
  writeLS(LS_USAGE, usage);
}

/** Returnează ID-urile celor mai folosite top-N tab-uri (descrescător după click count). */
export function getTopUsed(allTabIds, n = TOP_N) {
  const usage = readLS(LS_USAGE, {});
  return allTabIds
    .filter(id => (usage[id] || 0) > 0)
    .sort((a, b) => (usage[b] || 0) - (usage[a] || 0))
    .slice(0, n);
}

/** Returnează lista de tab-uri pinned manual (max 5, în ordinea adăugării). */
export function getPinnedTabs() {
  const pins = readLS(LS_PINS, []);
  return Array.isArray(pins) ? pins.slice(0, MAX_PINS) : [];
}

/** Pin/Unpin un tab. Toggle: dacă era pinned → îl scoate; altfel → îl adaugă (max 5). */
export function togglePin(tabId) {
  if (!tabId) return getPinnedTabs();
  const pins = getPinnedTabs();
  const idx = pins.indexOf(tabId);
  let next;
  if (idx >= 0) {
    next = pins.filter(id => id !== tabId);
  } else {
    if (pins.length >= MAX_PINS) {
      // Limită atinsă — înlocuiește cel mai vechi pin
      next = [...pins.slice(1), tabId];
    } else {
      next = [...pins, tabId];
    }
  }
  writeLS(LS_PINS, next);
  return next;
}

/** Verifică dacă un tab e pinned. */
export function isPinned(tabId) {
  return getPinnedTabs().includes(tabId);
}

/**
 * Returnează lista combinată "Frecvente" pentru afișare în top:
 *   - dacă utilizatorul are pin-uri manuale → folosim acelea (max 5)
 *   - altfel → top 5 auto-tracked
 *   - dacă nu există date deloc → array gol (UI ascunde rândul)
 */
export function getFrequentTabs(allTabIds) {
  const pins = getPinnedTabs();
  if (pins.length > 0) return pins;
  return getTopUsed(allTabIds, TOP_N);
}

/** Resetează datele de usage (pentru testing sau utilizator). */
export function resetUsageData() {
  try {
    localStorage.removeItem(LS_USAGE);
    localStorage.removeItem(LS_PINS);
  } catch { /* ignore */ }
}

/** Returnează numărul de click-uri pe un tab (pentru afișare counter UI). */
export function getClickCount(tabId) {
  const usage = readLS(LS_USAGE, {});
  return usage[tabId] || 0;
}

export const _internal = { LS_USAGE, LS_PINS, MAX_PINS, TOP_N };
