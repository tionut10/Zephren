/**
 * automation/mdlpa-cron-retry.js — Cron worker pentru queue MDLPA
 *
 * Sprint MDLPA Faza 0 (27 apr 2026)
 *
 * RULARE:
 *   - Vercel Cron la 15 minute: configurat în vercel.json → "crons" array
 *   - Manual: `node automation/mdlpa-cron-retry.js`
 *
 * COMPORTAMENT:
 *   1. Generează worker_id unic
 *   2. Apelează drainQueue() — procesează până la 20 itemi sau coadă goală
 *   3. Logghează rezultat (Vercel logs structurate)
 *
 * ENV VARS NECESARE:
 *   SUPABASE_URL          — URL proiect Supabase
 *   SUPABASE_SERVICE_KEY  — service_role key (NU anon!) pentru a accesa queue
 *   MDLPA_PORTAL_MODE     — "mock" (default) | "real" (după publicarea API)
 */

import { drainQueue } from "../src/lib/mdlpa-queue.js";

export default async function handler(req, res) {
  const worker_id = `cron-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  try {
    const result = await drainQueue({ worker_id, max_items: 20 });
    const durationMs = Date.now() - startedAt;

    const response = {
      ok: true,
      worker_id,
      duration_ms: durationMs,
      ...result,
      timestamp: new Date().toISOString(),
    };

    // Log structurat pentru Vercel Logs
    console.log(JSON.stringify({
      level: "info",
      event: "mdlpa_cron_done",
      ...response,
    }));

    return res.status(200).json(response);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    console.error(JSON.stringify({
      level: "error",
      event: "mdlpa_cron_error",
      worker_id,
      duration_ms: durationMs,
      error: err.message,
      stack: err.stack,
    }));
    return res.status(500).json({
      ok: false,
      worker_id,
      duration_ms: durationMs,
      error: err.message,
    });
  }
}

// Permite rulare CLI (`node automation/mdlpa-cron-retry.js`)
if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) {
  const mockReq = {};
  const mockRes = {
    status(code) { this._status = code; return this; },
    json(data)   { console.log(`[${this._status || 200}]`, JSON.stringify(data, null, 2)); return this; },
  };
  handler(mockReq, mockRes).catch(e => {
    console.error("Cron CLI error:", e);
    process.exit(1);
  });
}
