// ═══════════════════════════════════════════════════════════════
// PRICE TELEMETRY — Sprint Îmbunătățiri #4 (9 mai 2026)
// ═══════════════════════════════════════════════════════════════
//
// Înregistrează evenimente legate de prețuri pentru analitică:
//   - preset energie folosit (casnic_2025 / imm_2025 / industrial_2025 / maxim_2024)
//   - override curs EUR/RON setat de utilizator
//   - distribuție scenariu preț (low / mid / high) pe oferte
//   - factor inflație construcții aplicat
//   - utilizare wrappers getInflationAdjustedPrice
//
// Date utile pentru calibrarea viitoare a rehab-prices.js (~Q3 2026 audit).
//
// Stocaj: localStorage cu FIFO 1000 events (pattern existent partner-overrides.js).
// În producție vor fi trimise la backend prin endpoint serverless analytics.

const TELEMETRY_KEY = "zephren_price_telemetry";
const MAX_EVENTS = 1000;

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

/**
 * Înregistrează un eveniment de preț.
 * Patternul `Pret.{action}` permite filtrare ulterioară:
 *   - Pret.scenario.changed → user a schimbat low/mid/high
 *   - Pret.eurRon.override → user a setat curs manual
 *   - Pret.eurRon.reset → user a resetat la live BNR
 *   - Pret.preset.changed → user a schimbat preset energie
 *   - Pret.inflation.applied → factor inflație aplicat (live/cache/fallback)
 *   - Pret.outlier.flagged → outlier detectat în input investiție
 *
 * @param {string} action - ex: "scenario.changed", "eurRon.override"
 * @param {Object} [meta] - context suplimentar (mode, value, source, etc.)
 * @returns {boolean} true dacă a fost înregistrat
 */
export function logPriceEvent(action, meta = {}) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(TELEMETRY_KEY) || "[]";
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return false;
    events.push({
      action: `Pret.${action}`,
      meta,
      timestamp: new Date().toISOString(),
    });
    const trimmed = events.slice(-MAX_EVENTS);
    storage.setItem(TELEMETRY_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returnează toate evenimentele de preț.
 * @returns {Array<{action: string, meta: Object, timestamp: string}>}
 */
export function getPriceEvents() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Filtrează evenimentele după prefix action (ex: "scenario", "eurRon").
 * @param {string} prefix
 * @returns {Array}
 */
export function getPriceEventsByPrefix(prefix) {
  if (!prefix) return getPriceEvents();
  const target = prefix.startsWith("Pret.") ? prefix : `Pret.${prefix}`;
  return getPriceEvents().filter(ev => ev.action?.startsWith(target));
}

/**
 * Agregare evenimente per action.
 * @returns {Object<string, number>} mapping action → count
 */
export function getPriceEventsCounts() {
  const events = getPriceEvents();
  const counts = {};
  for (const ev of events) {
    if (ev.action) counts[ev.action] = (counts[ev.action] || 0) + 1;
  }
  return counts;
}

/**
 * Distribuție scenariu (low/mid/high) pe oferte din evenimentele înregistrate.
 * @returns {{low: number, mid: number, high: number, total: number}}
 */
export function getScenarioDistribution() {
  const events = getPriceEventsByPrefix("scenario.changed");
  const dist = { low: 0, mid: 0, high: 0, total: 0 };
  for (const ev of events) {
    const mode = ev.meta?.mode;
    if (mode && (mode === "low" || mode === "mid" || mode === "high")) {
      dist[mode]++;
      dist.total++;
    }
  }
  return dist;
}

/**
 * Distribuție preset energie folosit.
 * @returns {Object<string, number>} preset id → count
 */
export function getPresetDistribution() {
  const events = getPriceEventsByPrefix("preset.changed");
  const dist = {};
  for (const ev of events) {
    const presetId = ev.meta?.presetId;
    if (presetId) dist[presetId] = (dist[presetId] || 0) + 1;
  }
  return dist;
}

/**
 * Returnează ultimele N evenimente (default 50).
 * @param {number} [n=50]
 */
export function getRecentPriceEvents(n = 50) {
  return getPriceEvents().slice(-n).reverse();
}

/**
 * Șterge toate evenimentele (după export la backend sau debugging).
 */
export function clearPriceTelemetry() {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(TELEMETRY_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export CSV simplu pentru analiză externă.
 * @returns {string} CSV cu header + rows
 */
export function exportPriceEventsCSV() {
  const events = getPriceEvents();
  if (events.length === 0) return "timestamp,action,meta\n";
  const header = "timestamp,action,meta\n";
  const rows = events.map(ev => {
    const ts = ev.timestamp || "";
    const act = ev.action || "";
    const meta = JSON.stringify(ev.meta || {}).replace(/"/g, '""');
    return `${ts},${act},"${meta}"`;
  });
  return header + rows.join("\n");
}

/**
 * Sprint Audit Prețuri P4.5 (9 mai 2026) — sync events către backend serverless.
 * STATUS: DEFERRED — endpoint api/_deferred/price-analytics.js (mutat în api/
 * după upgrade Vercel Pro). Helperul de mai jos e gata, dar nu e încă apelat
 * automat. Trigger: cron Vercel sau buton manual „Sync analytics" în settings.
 *
 * @param {string} [endpoint] - URL endpoint (default: /api/price-analytics)
 * @param {string} [userId] - identificator user (default "anonymous")
 * @returns {Promise<{ ok: boolean, stored?: number, error?: string }>}
 */
export async function syncPriceTelemetryToBackend(endpoint = "/api/price-analytics", userId = "anonymous") {
  const events = getPriceEvents();
  if (events.length === 0) return { ok: true, stored: 0 };
  try {
    const sessionId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now());
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events, userId, sessionId }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `${res.status}: ${txt.slice(0, 100)}` };
    }
    const data = await res.json();
    // Clear after successful sync (avoid double-count)
    if (data?.stored > 0) clearPriceTelemetry();
    return { ok: true, stored: data?.stored || 0 };
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 100) };
  }
}

export const _internals = {
  TELEMETRY_KEY,
  MAX_EVENTS,
};
