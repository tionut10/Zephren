/**
 * useANRESync.js — Hook sincronizare tarife ANRE cu cache 24h
 *
 * ANRE nu dispune de API public. Strategia:
 * 1. Încearcă fetch de la endpoint-ul nostru serverless (api/anre-prices)
 *    care face scraping/proxy periodic
 * 2. Fallback la tarife hardcodate din energy-prices.js
 * 3. Cache local 24h în localStorage
 * 4. Permite override manual de către utilizator
 *
 * Surse tarife:
 * - ANRE Ordine tarife casnice: anre.ro → tarife reglementate
 * - OPCOM (piața spot): opcom.ro → prețuri zilnice
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ENERGY_PRICE_PRESETS, DEFAULT_ENERGY_PRICES } from '../data/energy-prices.js';

const LS_KEY = "zephren_anre_sync";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ore
const API_ENDPOINT = "/api/anre-prices";

/**
 * @typedef {{
 *   gaz: number, electricitate: number, gpl: number, motorina: number,
 *   carbune: number, biomasa: number, lemn_foc: number, termoficare: number,
 * }} PriceSet
 *
 * @typedef {{
 *   prices: PriceSet,
 *   source: 'anre_live' | 'cache' | 'hardcoded' | 'manual',
 *   lastSync: string | null,
 *   quarter: string,
 * }} SyncState
 */

/**
 * Hook pentru sincronizare tarife ANRE.
 *
 * @param {{ autoSync?: boolean, segment?: string }} options
 * @returns {{
 *   prices: PriceSet,
 *   source: string,
 *   lastSync: string | null,
 *   isSyncing: boolean,
 *   error: string | null,
 *   syncNow: () => Promise<void>,
 *   setManualPrice: (fuel: string, value: number) => void,
 *   resetToDefaults: () => void,
 *   overrides: Object,
 * }}
 */
export function useANRESync({ autoSync = true, segment = "casnic_2025" } = {}) {
  const [state, setState] = useState(/** @type {SyncState} */ ({
    prices: { ...DEFAULT_ENERGY_PRICES },
    source: "hardcoded",
    lastSync: null,
    quarter: getCurrentQuarter(),
  }));
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [overrides, setOverrides] = useState({});
  const mounted = useRef(true);

  // ── Încărcare din cache / init ───────────────────────────────────────────

  useEffect(() => {
    mounted.current = true;
    loadFromCache();
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-sync la montare (dacă cache-ul e expirat) ──────────────────────

  useEffect(() => {
    if (!autoSync) return;

    const cached = loadFromCache();
    if (!cached || isCacheExpired(cached.lastSync)) {
      syncNow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  // ── Încarcă din localStorage ─────────────────────────────────────────────

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;

      const cached = JSON.parse(raw);
      if (cached?.prices && !isCacheExpired(cached.lastSync)) {
        setState({
          prices: { ...DEFAULT_ENERGY_PRICES, ...cached.prices, ...overrides },
          source: "cache",
          lastSync: cached.lastSync,
          quarter: cached.quarter || getCurrentQuarter(),
        });
        return cached;
      }
      return cached;
    } catch (_) {
      return null;
    }
  }

  // ── Sincronizare cu API-ul serverless ────────────────────────────────────

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(`${API_ENDPOINT}?segment=${segment}`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data?.prices && typeof data.prices === "object") {
        const newState = {
          prices: { ...DEFAULT_ENERGY_PRICES, ...data.prices, ...overrides },
          source: "anre_live",
          lastSync: new Date().toISOString(),
          quarter: data.quarter || getCurrentQuarter(),
        };

        if (mounted.current) {
          setState(newState);
          // Persistă în cache
          localStorage.setItem(LS_KEY, JSON.stringify(newState));
        }
        return;
      }

      throw new Error("Format răspuns invalid");
    } catch (err) {
      // Fallback la preset-uri hardcodate
      const preset = ENERGY_PRICE_PRESETS.find(p => p.id === segment) || ENERGY_PRICE_PRESETS[0];
      const fallbackState = {
        prices: { ...preset.prices, ...overrides },
        source: "hardcoded",
        lastSync: state.lastSync,
        quarter: getCurrentQuarter(),
      };

      if (mounted.current) {
        setState(fallbackState);
        setError(`Sincronizare eșuată: ${err.message}. Se folosesc tarifele locale.`);
      }
    } finally {
      if (mounted.current) setIsSyncing(false);
    }
  }, [isSyncing, segment, overrides, state.lastSync]);

  // ── Override manual per combustibil ───────────────────────────────────────

  const setManualPrice = useCallback((fuel, value) => {
    if (typeof value !== "number" || value <= 0) return;

    setOverrides(prev => {
      const updated = { ...prev, [fuel]: value };
      setState(s => ({
        ...s,
        prices: { ...s.prices, [fuel]: value },
        source: "manual",
      }));
      return updated;
    });
  }, []);

  // ── Resetare la valori implicite ─────────────────────────────────────────

  const resetToDefaults = useCallback(() => {
    setOverrides({});
    setState({
      prices: { ...DEFAULT_ENERGY_PRICES },
      source: "hardcoded",
      lastSync: null,
      quarter: getCurrentQuarter(),
    });
    localStorage.removeItem(LS_KEY);
  }, []);

  return {
    prices: state.prices,
    source: state.source,
    lastSync: state.lastSync,
    quarter: state.quarter,
    isSyncing,
    error,
    syncNow,
    setManualPrice,
    resetToDefaults,
    overrides,
  };
}

// ── Utilitare ──────────────────────────────────────────────────────────────

function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function isCacheExpired(lastSync) {
  if (!lastSync) return true;
  return Date.now() - new Date(lastSync).getTime() > CACHE_TTL_MS;
}
