/**
 * AI Telemetry — FIFO 500 evenimente per browser (localStorage).
 *
 * Înregistrează apeluri AI din orchestratorul Pas 2 pentru:
 *  - Audit cost (estimare bugetare lunară per auditor)
 *  - Debug latențe / eșecuri (rate de succes per intent + fileType)
 *  - Export CSV pentru raport agregat backend (când Vercel Pro)
 *
 * Pattern identic cu price-telemetry pentru consistență.
 *
 * Folosit de: envelope-ai-orchestrator.js
 */

const STORAGE_KEY = "ai-telemetry-events";
const MAX_EVENTS = 500;

const VALID_INTENTS = new Set([
  "envelope-fill",   // chat AI text/voice → opaque + glazing + bridges
  "facade-vision",   // imagine fațadă → opaque + glazing
  "drawing-vision",  // planșă PDF → building + drawing info
  "pdf-extract",     // PDF complet → full schema
  "paste-route",     // paste clipboard → dispecer
  "voice-cmd",       // comandă voce locală (fără AI)
]);

/**
 * Înregistrează un eveniment AI.
 * @param {object} ev
 * @param {string} ev.intent - una din VALID_INTENTS
 * @param {string} [ev.fileType] - facade|drawing|pdf|image|text
 * @param {number} [ev.latencyMs] - durata apelului
 * @param {boolean} ev.success
 * @param {number} [ev.confidence] - 0-1 sau "high"|"medium"|"low"
 * @param {number} [ev.elementsCount] - câte elemente returnate
 * @param {string} [ev.errorMsg]
 */
export function logAIEvent(ev) {
  if (!ev || !ev.intent) return;
  if (!VALID_INTENTS.has(ev.intent)) {
    console.warn("[ai-telemetry] intent invalid:", ev.intent);
    return;
  }
  const entry = {
    t: Date.now(),
    intent: ev.intent,
    fileType: ev.fileType || null,
    latencyMs: typeof ev.latencyMs === "number" ? Math.round(ev.latencyMs) : null,
    success: ev.success !== false,
    confidence: ev.confidence ?? null,
    elementsCount: typeof ev.elementsCount === "number" ? ev.elementsCount : null,
    errorMsg: ev.errorMsg ? String(ev.errorMsg).slice(0, 200) : null,
  };
  try {
    const list = readEvents();
    list.push(entry);
    while (list.length > MAX_EVENTS) list.shift();
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[ai-telemetry] write failed:", err?.message);
    }
  }
}

/** Citește toate evenimentele (cele mai vechi primele). */
export function readEvents() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Statistici agregate (success rate, latency medie per intent). */
export function getAIStats() {
  const events = readEvents();
  const byIntent = {};
  for (const ev of events) {
    const k = ev.intent;
    if (!byIntent[k]) {
      byIntent[k] = {
        total: 0,
        success: 0,
        fail: 0,
        avgLatencyMs: 0,
        _latencySum: 0,
        _latencyCount: 0,
      };
    }
    byIntent[k].total++;
    if (ev.success) byIntent[k].success++;
    else byIntent[k].fail++;
    if (typeof ev.latencyMs === "number") {
      byIntent[k]._latencySum += ev.latencyMs;
      byIntent[k]._latencyCount++;
    }
  }
  for (const k of Object.keys(byIntent)) {
    const o = byIntent[k];
    o.avgLatencyMs = o._latencyCount > 0 ? Math.round(o._latencySum / o._latencyCount) : 0;
    o.successRate = o.total > 0 ? o.success / o.total : 0;
    delete o._latencySum;
    delete o._latencyCount;
  }
  return {
    totalEvents: events.length,
    byIntent,
    firstEventAt: events[0]?.t || null,
    lastEventAt: events[events.length - 1]?.t || null,
  };
}

/** Export CSV pentru analiză externă. */
export function exportAIEventsCSV() {
  const events = readEvents();
  const header = "timestamp,intent,fileType,latencyMs,success,confidence,elementsCount,errorMsg";
  const rows = events.map((ev) => {
    const ts = new Date(ev.t).toISOString();
    const fileType = ev.fileType || "";
    const lat = ev.latencyMs ?? "";
    const conf = ev.confidence ?? "";
    const cnt = ev.elementsCount ?? "";
    const err = (ev.errorMsg || "").replace(/[",\n]/g, " ");
    return `${ts},${ev.intent},${fileType},${lat},${ev.success},${conf},${cnt},${err}`;
  });
  return [header, ...rows].join("\n");
}

/** Șterge toate evenimentele (testing / opt-out user). */
export function clearAIEvents() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
}

export const __testing__ = {
  STORAGE_KEY,
  MAX_EVENTS,
  VALID_INTENTS,
};
