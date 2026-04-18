/**
 * featureFlags.js — steaguri de funcționalități pentru activare graduală.
 *
 * Toate flag-urile respectă o ordine de precedență clară:
 *   1. URL query param (ex: ?envelopeHub=1)       — override ad-hoc pentru debugging
 *   2. localStorage                               — override persistent per browser
 *   3. Valoarea implicită din cod (DEFAULTS)      — fallback pentru producție
 *
 * Utilizare:
 *   import { isFeatureEnabled, FLAGS } from "../config/featureFlags.js";
 *   if (isFeatureEnabled(FLAGS.SMART_ENVELOPE_HUB)) { ... }
 *
 * Activare runtime (fără rebuild):
 *   URL     : https://app.example.com/?envelopeHub=1
 *   Console : localStorage.setItem("ff.envelopeHub", "1"); location.reload();
 *   Disable : localStorage.setItem("ff.envelopeHub", "0"); location.reload();
 */

export const FLAGS = Object.freeze({
  /**
   * SmartEnvelopeHub — refactor Step 2 Anvelopă (S4 GA, 14.04.2026).
   * Default ON. Când este OFF (?envelopeHub=0), se afișează grid-ul
   * clasic legacy ca fallback pentru auditori care preferă interfața veche.
   */
  SMART_ENVELOPE_HUB: "envelopeHub",

  /**
   * EPBD_2024_THRESHOLDS — rescalare A–G conform EPBD 2024/1275 Art. 19 (P1-3).
   * Default OFF (ord. 16/2023 rămâne scala curentă până la transpunere oficială RO).
   * Activare: `?useEPBD2024Thresholds=1` sau localStorage după publicarea valorilor MDLPA.
   * Termen transpunere: 29 mai 2026.
   */
  EPBD_2024_THRESHOLDS: "useEPBD2024Thresholds",
});

// Valorile implicite la momentul build-ului — editați aici când un flag devine GA.
const DEFAULTS = Object.freeze({
  [FLAGS.SMART_ENVELOPE_HUB]: true,
  [FLAGS.EPBD_2024_THRESHOLDS]: false,
});

// Querystring parsat o singură dată la load (SSR-safe guard).
const QUERY_PARAMS = (() => {
  if (typeof window === "undefined" || !window.location) return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
})();

function readLocalStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage.getItem("ff." + key);
  } catch {
    return null;
  }
}

function parseBool(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "1" || s === "true"  || s === "on"  || s === "yes") return true;
  if (s === "0" || s === "false" || s === "off" || s === "no")  return false;
  return null;
}

/**
 * Verifică dacă un flag este activ. Respectă precedența URL > localStorage > DEFAULT.
 * @param {string} flag - Cheia flag-ului (folosiți FLAGS.XXX).
 * @returns {boolean}
 */
export function isFeatureEnabled(flag) {
  if (QUERY_PARAMS) {
    const fromUrl = parseBool(QUERY_PARAMS.get(flag));
    if (fromUrl !== null) return fromUrl;
  }
  const fromLS = parseBool(readLocalStorage(flag));
  if (fromLS !== null) return fromLS;
  return Boolean(DEFAULTS[flag]);
}

/**
 * Activează/dezactivează un flag persistent (localStorage). Nu face reload.
 */
export function setFeatureFlag(flag, enabled) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem("ff." + flag, enabled ? "1" : "0");
  } catch {
    // noop — localStorage poate fi blocat (private mode)
  }
}
