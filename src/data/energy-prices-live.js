/**
 * energy-prices-live.js — Sprint P2 (6 mai 2026)
 *
 * Prețuri energie LIVE de pe web pentru analiza financiară Pas 7.
 *
 * IMPORTANT — restricție de uz:
 *   - Folosit DOAR pentru analiza financiară opțională (NPV, payback, cost-optim).
 *   - CPE OFICIAL emis în Pas 6 trebuie să rămână pe preț ANRE reglementat
 *     stabil (preset `casnic_2025` din energy-prices.js) — variația spot zilnică
 *     ar produce CPE-uri diferite la re-generare, neacceptabilă MDLPA.
 *   - Toggle UI cu disclaimer obligatoriu „🌐 Spot live (orientativ — nu folosi
 *     pentru CPE oficial)".
 *
 * Surse:
 *   - Eurostat REST `nrg_pc_204` — preț electricitate consumatori casnici RO,
 *     publicare semestrială (S1/S2), CORS activ, gratuit, fără API key.
 *   - OPCOM PZU spot zilnic — Sprint P3 (necesită proxy Vercel — limit 12 funcții
 *     atins în plan curent, deferred).
 *
 * Cache: localStorage cu TTL 7 zile (Eurostat updatează la 6 luni → cache lung OK).
 */

import { getEnergyPriceFromPreset, DEFAULT_ENERGY_PRICES } from "./energy-prices.js";
import { getEurRonSync } from "./rehab-prices.js";

const EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204";
const CACHE_KEY = "zephren_eurostat_electricity_ro";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 zile

/**
 * Calculează cea mai recentă perioadă semestrială Eurostat publicată.
 * Eurostat publică:
 *   - S1 (ianuarie-iunie) → disponibil în octombrie/noiembrie același an
 *   - S2 (iulie-decembrie) → disponibil în mai/iunie anul următor
 * Returnează formatul `YYYY-S1` sau `YYYY-S2`.
 */
export function getLatestEurostatPeriod(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  // Latency Eurostat ~6 luni; ne uităm la semestrul precedent al anului trecut sau curent.
  if (m >= 6) {
    // iunie+ → S2 anul trecut e publicat
    return `${y - 1}-S2`;
  } else if (m >= 1) {
    // ian-mai → S1 anul trecut e publicat (S2 nu încă)
    return `${y - 1}-S1`;
  }
  return `${y - 2}-S2`;
}

/**
 * Fetch async preț electricitate consumatori casnici RO de la Eurostat.
 * Returnează preț în EUR/kWh + metadate (perioadă, sursă, timestamp).
 *
 * @param {string} [period] - perioadă format `YYYY-S1` sau `YYYY-S2` (default: cea mai recentă)
 * @returns {Promise<{priceEUR: number, period: string, source: string, fetchedAt: string} | null>}
 */
export async function fetchEurostatRoElectricityPrice(period = null) {
  const useTime = period || getLatestEurostatPeriod();
  // I_TAX = include all taxes (preț final consumator, comparabil cu factura ANRE)
  // currency=EUR pentru consistență internațională
  // siec=E7000 = Electricity
  // nrg_cons=TOT_KWH = toate benzile de consum
  const url = `${EUROSTAT_BASE}?geo=RO&siec=E7000&nrg_cons=TOT_KWH&tax=I_TAX&currency=EUR&time=${useTime}&format=JSON`;
  try {
    const res = await fetch(url, {
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(8000)
        : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // JSON-stat 2.0: value object cu o singură cheie "0" pentru cerere cu toate dimensiunile = 1.
    const valueMap = data?.value || {};
    const firstKey = Object.keys(valueMap)[0];
    const priceEUR = firstKey ? Number(valueMap[firstKey]) : NaN;
    if (!Number.isFinite(priceEUR) || priceEUR <= 0) return null;
    return {
      priceEUR,
      period: useTime,
      source: "Eurostat nrg_pc_204 (electricity, household, all-bands, all-taxes)",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[energy-prices-live] Eurostat fetch eșuat:", err?.message || err);
    return null;
  }
}

/**
 * Versiune sincronă — citește din cache localStorage; dacă lipsește/expirat,
 * declanșează async background fetch și returnează null (UI poate retry).
 *
 * @returns {{priceEUR: number, priceRON: number, period: string, source: string, fetchedAt: string} | null}
 */
export function getEurostatRoElectricityPriceSync() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.priceEUR || !cached?.fetchedAt) return null;
    const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
    if (ageMs > CACHE_TTL_MS) return null;
    const eurRon = getEurRonSync() || 5.05;
    return {
      ...cached,
      priceRON: Math.round(cached.priceEUR * eurRon * 100) / 100,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch + cache combo. Apelat la mount UI în Step 7 (debounced).
 * Returnează rezultat live sau null (UI cade pe fallback).
 */
export async function refreshEurostatCache() {
  const result = await fetchEurostatRoElectricityPrice();
  if (result && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {}
  }
  return result;
}

/**
 * Helper agnostic — returnează prețul live (Eurostat) dacă disponibil în cache,
 * altfel cade pe preset static `casnic_2025` ANRE.
 *
 * @param {string} fuelId - ID combustibil (electricitate / gaz / etc.)
 * @returns {{priceRON: number, source: string, isLive: boolean}}
 */
export function getEnergyPriceLiveOrFallback(fuelId) {
  // Eurostat acoperă DOAR electricitate (semestrial RO). Restul combustibililor
  // rămân pe preset static ANRE (gaz reglementat, biomasă/peleți market).
  if (fuelId === "electricitate") {
    const live = getEurostatRoElectricityPriceSync();
    if (live) {
      return {
        priceRON: live.priceRON,
        source: `Eurostat ${live.period} (live, ${new Date(live.fetchedAt).toLocaleDateString("ro-RO")})`,
        isLive: true,
      };
    }
  }
  return {
    priceRON: getEnergyPriceFromPreset(fuelId, "casnic_2025") || DEFAULT_ENERGY_PRICES[fuelId] || 0.40,
    source: "ANRE casnic 2025 (preset static)",
    isLive: false,
  };
}

/**
 * Override manual preț spot live (pentru auditori cu acces la contracte specifice).
 * Persistat în sessionStorage (doar pe sesiune).
 */
export function setUserElectricityPriceOverride(priceRonPerKwh) {
  const p = parseFloat(priceRonPerKwh);
  if (!p || p < 0.05 || p > 5) return false;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem("zephren_user_electricity_price_override", String(p));
    } catch {}
  }
  return true;
}

export function getUserElectricityPriceOverride() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const v = sessionStorage.getItem("zephren_user_electricity_price_override");
    if (!v) return null;
    const p = parseFloat(v);
    return p > 0 ? p : null;
  } catch {
    return null;
  }
}
