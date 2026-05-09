/**
 * cost-index.js — Indexare costuri reabilitare via Eurostat Construction Cost Index
 *
 * Sprint Audit Prețuri Tier 1 (9 mai 2026) — actualizare automată a prețurilor
 * canonice rehab-prices.js (Q1 2026 fix) prin multiplicator de inflație construcții
 * obținut live de la Eurostat. Dacă index-ul construcții RO crește 6%/an,
 * toate prețurile se ajustează proporțional fără recalibrare manuală.
 *
 * SURSA PRIMARĂ: Eurostat sts_copi_q (Construction Cost Index, quarterly)
 * — `cpa2_1=CPA_F41001_X_410014` (Residential buildings, except community)
 * — `unit=I21` (Index 2021 = 100)
 * — `s_adj=NSA` (Non-Seasonally Adjusted)
 * — coverage: 1953-Q4 până în prezent (lag tipic ~2-3 luni vs trimestrul curent)
 * — CORS: ✅ permis pentru REST API public
 * — gratuit, fără API key
 *
 * SURSA SECUNDARĂ (fallback): factor static 1.0 (no inflation) — păstrează
 * prețurile rehab-prices Q1 2026 dacă API-ul e indisponibil.
 *
 * UTILIZARE:
 *   import { getCostInflationFactor, getCostIndexLiveOrFallback } from './cost-index.js';
 *   const factor = await getCostInflationFactor(); // ex: 1.06 = +6% inflație din baseline
 *   const adjustedPriceEUR = REHAB_PRICES.envelope.wall_eps_10cm.mid * factor;
 *
 * REFERINȚE:
 *   - Eurostat REST API: https://wikis.ec.europa.eu/display/EUROSTATHELP/API+-+Getting+started
 *   - Dataset metadata: https://ec.europa.eu/eurostat/databrowser/view/sts_copi_q
 *   - JSON-stat 2.0 spec: https://json-stat.org/
 */

import { REHAB_PRICES, getPrice, getEurRonSync } from './rehab-prices.js';

// ─── Configurare ─────────────────────────────────────────────────────────────
const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_copi_q';
const EUROSTAT_QUERY = '?geo=RO&unit=I21&s_adj=NSA&format=JSON&lang=EN';
const EUROSTAT_URL = EUROSTAT_BASE + EUROSTAT_QUERY;

// Periodă de referință = data ultimei calibrări manuale rehab-prices.js
// (rehab-prices recalibrate manual la piața RO pe baza HG 907/2016 + MDLPA +
// oferte contractori). BASE_PERIOD se derivă din BASE_DATE via dateToQuarter().
const BASE_DATE = REHAB_PRICES.last_updated || '2026-04-26';
// Helper local — definit înainte de export-ul `dateToQuarter` pentru a calcula
// BASE_PERIOD imediat la încărcarea modulului. Echivalent funcțional cu
// `dateToQuarter` exportat mai jos (păstrat acolo pentru API public).
function _toQuarter(dateISO) {
  if (!dateISO) return '2026-Q2';
  if (/^\d{4}-Q[1-4]$/.test(dateISO)) return dateISO;
  const m = String(dateISO).match(/^(\d{4})-(\d{2})/);
  if (!m) return '2026-Q2';
  return `${m[1]}-Q${Math.ceil(parseInt(m[2], 10) / 3)}`;
}
const BASE_PERIOD = _toQuarter(BASE_DATE);

// Cache 30 zile (Eurostat actualizează trimestrial cu lag 2-3 luni)
const CACHE_KEY = 'zephren_cost_index_cache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Override utilizator (sessionStorage) pentru testare/scenarii custom
const USER_OVERRIDE_KEY = 'user_cost_inflation_factor';

// Limite sanitate factor (rezistă la date corupte sau outlier extrem)
const FACTOR_MIN = 0.5;  // -50% (improbabil dar posibil în deflationary shock)
const FACTOR_MAX = 3.0;  // +200% (improbabil, prag de siguranță)

// ─── Conversie dată → perioadă Eurostat ──────────────────────────────────────

/**
 * Convertește o dată ISO (YYYY-MM-DD) în cod perioadă Eurostat (YYYY-Qx).
 * @param {string} dateISO - format YYYY-MM-DD sau YYYY-Qx (already formatted)
 * @returns {string} ex: "2026-Q1"
 */
export function dateToQuarter(dateISO) {
  if (!dateISO) return BASE_PERIOD;
  // Already in YYYY-Qx format
  if (/^\d{4}-Q[1-4]$/.test(dateISO)) return dateISO;
  const m = String(dateISO).match(/^(\d{4})-(\d{2})/);
  if (!m) return BASE_PERIOD;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

// ─── Cache localStorage cu TTL ───────────────────────────────────────────────

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {}
}

// ─── Override utilizator (sessionStorage) ────────────────────────────────────

/**
 * Override manual al factorului de inflație. Se persistă în sessionStorage.
 * @param {number} factor - între FACTOR_MIN și FACTOR_MAX (sau null pentru reset)
 * @returns {boolean} true dacă valoarea a fost acceptată
 */
export function setUserCostInflationOverride(factor) {
  if (factor == null) {
    try { sessionStorage.removeItem(USER_OVERRIDE_KEY); } catch {}
    // Sprint Îmbunătățiri #4 — telemetrie reset
    _logTelemetryLazy("inflation.reset", { context: "cost-index" });
    return true;
  }
  const f = parseFloat(factor);
  if (!Number.isFinite(f) || f < FACTOR_MIN || f > FACTOR_MAX) return false;
  try { sessionStorage.setItem(USER_OVERRIDE_KEY, String(f)); } catch {}
  // Sprint Îmbunătățiri #4 — telemetrie override
  _logTelemetryLazy("inflation.override", { factor: f, context: "cost-index" });
  return true;
}

// Lazy import pentru a evita circular dependency cu price-telemetry.js
function _logTelemetryLazy(action, meta) {
  try {
    // eslint-disable-next-line global-require
    import("./price-telemetry.js").then(m => m.logPriceEvent?.(action, meta)).catch(() => {});
  } catch {}
}

function getUserOverride() {
  try {
    const raw = sessionStorage.getItem(USER_OVERRIDE_KEY);
    if (!raw) return null;
    const f = parseFloat(raw);
    if (Number.isFinite(f) && f >= FACTOR_MIN && f <= FACTOR_MAX) return f;
    return null;
  } catch {
    return null;
  }
}

// ─── Parse JSON-stat ─────────────────────────────────────────────────────────

/**
 * Extrage seria temporală (period → value) din răspunsul JSON-stat al Eurostat.
 * @param {object} jsonStat - răspuns Eurostat
 * @returns {{period: string, value: number}[] | null}
 */
function parseJsonStatTimeSeries(jsonStat) {
  if (!jsonStat?.dimension?.time?.category?.index || !jsonStat?.value) return null;
  try {
    const timeIndex = jsonStat.dimension.time.category.index;
    const timeLabel = jsonStat.dimension.time.category.label || timeIndex;
    const values = jsonStat.value;
    // timeIndex poate fi {key: number} sau array
    const periods = Object.keys(timeIndex).sort((a, b) => timeIndex[a] - timeIndex[b]);
    const series = [];
    for (const period of periods) {
      const idx = timeIndex[period];
      const v = values[idx];
      if (typeof v === 'number' && Number.isFinite(v)) {
        series.push({ period: timeLabel[period] || period, value: v });
      }
    }
    return series;
  } catch {
    return null;
  }
}

// ─── Fetch live ──────────────────────────────────────────────────────────────

/**
 * Descarcă seria CCI (RO, residential, I21=100) de la Eurostat.
 * @returns {Promise<{period: string, value: number}[] | null>}
 */
export async function fetchEurostatCostIndex() {
  try {
    const res = await fetch(EUROSTAT_URL, {
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(10000)
        : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseJsonStatTimeSeries(data);
  } catch {
    return null;
  }
}

// ─── Calculul factorului ─────────────────────────────────────────────────────

/**
 * Calculează multiplicatorul de inflație construcții între `basePeriod` și
 * `currentPeriod`, pe baza seriei CCI Eurostat.
 *
 * @param {{period: string, value: number}[]} series
 * @param {string} basePeriod - ex: "2026-Q1"
 * @param {string} [currentPeriod] - ex: "2026-Q3" (default: ultima perioadă disponibilă)
 * @returns {number} factor (1.0 = neutru, 1.06 = +6% inflație)
 */
export function calcInflationFactor(series, basePeriod, currentPeriod) {
  if (!Array.isArray(series) || series.length === 0) return 1.0;
  const baseEntry = series.find(s => s.period === basePeriod);
  // Dacă perioada de bază nu e în serie, păstrează factor neutru
  if (!baseEntry || !(baseEntry.value > 0)) return 1.0;
  const target = currentPeriod
    ? series.find(s => s.period === currentPeriod)
    : series[series.length - 1];
  if (!target || !(target.value > 0)) return 1.0;
  const factor = target.value / baseEntry.value;
  // Sanitize
  if (!Number.isFinite(factor) || factor < FACTOR_MIN || factor > FACTOR_MAX) return 1.0;
  return Math.round(factor * 1000) / 1000; // 3 zecimale
}

// ─── API public ─────────────────────────────────────────────────────────────

/**
 * Returnează factorul de inflație construcții (RO, residential) între
 * data de bază (rehab-prices last_updated) și ultima perioadă disponibilă.
 * Asincron — folosește cache localStorage 30 zile + override sessionStorage.
 *
 * @param {Object} [options]
 * @param {string} [options.baseDate] - dată ISO de referință (default: rehab-prices.last_updated)
 * @returns {Promise<{factor: number, basePeriod: string, currentPeriod: string|null, source: 'live'|'cache'|'override'|'fallback'}>}
 */
export async function getCostInflationFactor(options = {}) {
  // 1. Override utilizator (test / what-if)
  const override = getUserOverride();
  if (override != null) {
    return { factor: override, basePeriod: BASE_PERIOD, currentPeriod: null, source: 'override' };
  }

  const baseDate = options.baseDate || BASE_DATE;
  const basePeriod = dateToQuarter(baseDate);

  // 2. Cache valid
  const cached = readCache();
  if (cached?.factor != null && cached.basePeriod === basePeriod) {
    return { ...cached, source: 'cache' };
  }

  // 3. Fetch live
  const series = await fetchEurostatCostIndex();
  if (series && series.length > 0) {
    const currentPeriod = series[series.length - 1].period;
    const factor = calcInflationFactor(series, basePeriod, currentPeriod);
    const payload = { factor, basePeriod, currentPeriod };
    writeCache(payload);
    return { ...payload, source: 'live' };
  }

  // 4. Fallback (no inflation)
  return { factor: 1.0, basePeriod, currentPeriod: null, source: 'fallback' };
}

/**
 * Versiune sincronă — folosește doar cache sau override, fără fetch.
 * Util pentru render imediat (fallback la 1.0 dacă cache-ul lipsește).
 *
 * @param {Object} [options]
 * @returns {{factor: number, basePeriod: string, currentPeriod: string|null, source: 'cache'|'override'|'fallback'}}
 */
export function getCostInflationFactorSync(options = {}) {
  const override = getUserOverride();
  if (override != null) {
    return { factor: override, basePeriod: BASE_PERIOD, currentPeriod: null, source: 'override' };
  }
  const baseDate = options.baseDate || BASE_DATE;
  const basePeriod = dateToQuarter(baseDate);
  const cached = readCache();
  if (cached?.factor != null && cached.basePeriod === basePeriod) {
    return { ...cached, source: 'cache' };
  }
  return { factor: 1.0, basePeriod, currentPeriod: null, source: 'fallback' };
}

/**
 * Helper combinat: returnează factorul + status (pentru UI banner).
 * Asincron, pre-fetch-ul actualizează cache-ul în background.
 *
 * @returns {Promise<{factor: number, basePeriod: string, currentPeriod: string|null, source: string, isLive: boolean, deltaPct: number}>}
 */
export async function getCostIndexLiveOrFallback() {
  const r = await getCostInflationFactor();
  return {
    ...r,
    isLive: r.source === 'live' || r.source === 'cache',
    deltaPct: Math.round((r.factor - 1) * 1000) / 10, // % cu 1 zecimală
  };
}

// ─── Wrappers preț ajustat la inflație ──────────────────────────────────────

/**
 * Returnează prețul unui element din catalog ajustat cu factorul de inflație
 * construcții (Eurostat). Sincron — folosește cache + fallback.
 *
 * @param {'envelope'|'heating'|'cooling'|'renewables'|'lighting'|'bacs'} category
 * @param {string} item - cheia (ex: 'wall_eps_10cm')
 * @param {'low'|'mid'|'high'} [scenario='mid']
 * @returns {{ price: number, priceBase: number, factor: number, source: string, unit: string, lifespan: number } | null}
 */
export function getInflationAdjustedPrice(category, item, scenario = 'mid') {
  const base = getPrice(category, item, scenario);
  if (!base) return null;
  const { factor, source } = getCostInflationFactorSync();
  return {
    priceBase: base.price,
    price: Math.round(base.price * factor * 100) / 100,
    factor,
    source,
    unit: base.unit,
    lifespan: base.lifespan,
  };
}

/**
 * Versiune în RON cu curs EUR/RON live BNR + factor inflație.
 *
 * @param {string} category
 * @param {string} item
 * @param {'low'|'mid'|'high'} [scenario='mid']
 * @returns {{ priceRON: number, priceEUR: number, priceBaseEUR: number, factor: number, eurRon: number, source: string, unit: string, lifespan: number } | null}
 */
export function getInflationAdjustedPriceRON(category, item, scenario = 'mid') {
  const adjusted = getInflationAdjustedPrice(category, item, scenario);
  if (!adjusted) return null;
  const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
  return {
    priceBaseEUR: adjusted.priceBase,
    priceEUR: adjusted.price,
    priceRON: Math.round(adjusted.price * eurRon),
    factor: adjusted.factor,
    eurRon,
    source: adjusted.source,
    unit: adjusted.unit,
    lifespan: adjusted.lifespan,
  };
}

// ─── Constante export pentru testare ────────────────────────────────────────

export const _internals = {
  EUROSTAT_URL,
  BASE_PERIOD,
  BASE_DATE,
  CACHE_KEY,
  CACHE_TTL_MS,
  FACTOR_MIN,
  FACTOR_MAX,
  parseJsonStatTimeSeries,
};
