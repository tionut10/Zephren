/**
 * currency-context.js — Sprint Îmbunătățiri #3 (9 mai 2026)
 *
 * State global pentru moneda afișată în UI: 'auto' | 'EUR' | 'RON'.
 *
 * Persistat în localStorage. Folosit prin React.useSyncExternalStore pentru
 * a evita Context overhead — mai light, fără re-render cascade.
 *
 * 'auto' = utilizatorul vede ambele monede unde e relevant (default; toString
 * cu sufix EUR sau RON funcție de origine valoare).
 * 'EUR' = client B2B / export UE — toate sumele afișate doar EUR.
 * 'RON' = auditor RO / raport oficial — toate sumele afișate doar RON.
 */

import { getEurRonSync, REHAB_PRICES } from "./rehab-prices.js";

const STORAGE_KEY = "zephren_display_currency";
const VALID_MODES = ["auto", "EUR", "RON"];
const DEFAULT_MODE = "auto";

// ─── Subscribers (pattern useSyncExternalStore) ──────────────────────────────
const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(); } catch {}
  }
}

export function subscribeCurrencyMode(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ─── State (sincronizat cu localStorage) ─────────────────────────────────────

export function getCurrencyMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID_MODES.includes(v)) return v;
  } catch {}
  return DEFAULT_MODE;
}

export function setCurrencyMode(mode) {
  if (!VALID_MODES.includes(mode)) return false;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    notify();
    return true;
  } catch {
    return false;
  }
}

// ─── Formatare ───────────────────────────────────────────────────────────────

/**
 * Formatare valoare în moneda activă.
 *
 * @param {number} value - valoarea
 * @param {'EUR'|'RON'} sourceCurrency - moneda în care e DEFINIT value
 * @param {Object} [options]
 * @param {'auto'|'EUR'|'RON'} [options.target] - override mode global
 * @param {number} [options.eurRon] - curs override
 * @param {number} [options.decimals] - default 0
 * @returns {string} ex: "5.500 RON" / "1.080 EUR" / "1.080 EUR (5.500 RON)"
 */
export function fmtMoney(value, sourceCurrency = "RON", options = {}) {
  if (value == null) return "—";
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  const target = options.target || getCurrencyMode();
  const eurRon = options.eurRon || getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
  const decimals = options.decimals ?? 0;
  const fmtN = (n) => n.toLocaleString("ro-RO", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });

  if (target === "EUR") {
    const eurValue = sourceCurrency === "EUR" ? v : v / eurRon;
    return `${fmtN(eurValue)} EUR`;
  }
  if (target === "RON") {
    const ronValue = sourceCurrency === "RON" ? v : v * eurRon;
    return `${fmtN(ronValue)} RON`;
  }
  // auto — afișează ambele când utilitate, doar sursa altfel
  if (sourceCurrency === "EUR") {
    const ronValue = v * eurRon;
    return `${fmtN(v)} EUR (${fmtN(ronValue)} RON)`;
  }
  // sourceCurrency === "RON"
  const eurValue = v / eurRon;
  return `${fmtN(v)} RON (${fmtN(eurValue)} EUR)`;
}

/**
 * Convertor pur — fără formatare. Util pentru calcule.
 * @param {number} value
 * @param {'EUR'|'RON'} from
 * @param {'EUR'|'RON'} to
 * @param {number} [eurRon] - default live BNR
 * @returns {number}
 */
export function convertCurrency(value, from, to, eurRon) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  if (from === to) return v;
  const rate = eurRon || getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
  if (from === "EUR" && to === "RON") return v * rate;
  if (from === "RON" && to === "EUR") return v / rate;
  return v;
}

/**
 * Returnează simbolul monedei active (UI mic).
 * @returns {string} "€" | "RON" | "€/RON"
 */
export function getCurrencySymbol(target) {
  const mode = target || getCurrencyMode();
  if (mode === "EUR") return "€";
  if (mode === "RON") return "RON";
  return "€/RON";
}

// ─── Format pentru export PDF/DOCX (sync, fără React) ────────────────────────

/**
 * Sprint Audit Prețuri P4.4 (9 mai 2026) — helper specializat pentru PDF/DOCX
 * generators. Citește mode global din localStorage SINCRON (fără hook), aplică
 * curs EUR/RON canonic și returnează string formatat consistent cu UI.
 *
 * Diferența vs `fmtMoney`: target inferit automat din `getCurrencyMode()`
 * (target nu mai trebuie pasat).
 *
 * @param {number} value - valoarea
 * @param {'EUR'|'RON'} source - moneda sursă
 * @param {Object} [options]
 * @param {number} [options.eurRon] - curs (default live BNR)
 * @param {number} [options.decimals] - default 0
 * @returns {string} ex: "5.100 RON (1.000 EUR)" | "1.000 EUR" | "5.100 RON"
 */
export function formatCurrencyForExport(value, source = "RON", options = {}) {
  return fmtMoney(value, source, { ...options, target: getCurrencyMode() });
}

// ─── React hook ──────────────────────────────────────────────────────────────
// Pentru consumeri React, există un hook `useCurrencyMode` în CurrencyToggle.jsx
// care folosește useSyncExternalStore. Helperele de mai sus pot fi folosite
// direct (fără hook) în logica non-React.

export const _internals = {
  STORAGE_KEY,
  VALID_MODES,
  DEFAULT_MODE,
};
