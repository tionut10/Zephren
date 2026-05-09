/**
 * api/_deferred/price-analytics.js — Sprint Audit Prețuri P4.5 (9 mai 2026)
 *
 * Endpoint serverless pentru colectarea telemetriei de prețuri din UI Zephren.
 * Primește batch CSV/JSON exportat din `price-telemetry.js` (FIFO 1000 events
 * localStorage) și îl persistă pentru analiză agregată — calibrare viitoare a
 * `rehab-prices.js` pe baza distribuției scenarii (low/mid/high), preset-uri
 * energie, override curs EUR/RON, factor inflație aplicat, outlier flag-uri.
 *
 * STATUS: DEFERRED (folderul `_deferred/` ignorat de Vercel scanner pentru a
 * respecta limita Hobby de 12 funcții serverless). Activare:
 *   1. Upgrade Vercel Pro ($49/lună)
 *   2. `mv api/_deferred/price-analytics.js api/`
 *   3. Setează env vars: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (sau ALT backend)
 *   4. Adaugă din UI un buton „Sync analytics" în settings (sau cron Vercel auto)
 *
 * INTRARE:
 *   POST { events: [{ action, meta, timestamp }, ...], userId, sessionId }
 *
 * IEȘIRE:
 *   200 { stored: N, ts: "2026-..." }
 *   400 { error: "..." }
 *   500 { error: "..." }
 *
 * REFERINȚE:
 *   - src/data/price-telemetry.js — sursa events FIFO 1000
 *   - src/data/price-telemetry.js exportPriceEventsCSV() — format export
 */

// IMPORTANT: acest fișier NU este expus ca endpoint câtă vreme e în _deferred/.
// Mută-l direct în api/ pentru activare.

const MAX_BATCH = 1000;
const VALID_ACTIONS = [
  "Pret.scenario.changed",
  "Pret.eurRon.override",
  "Pret.eurRon.reset",
  "Pret.preset.changed",
  "Pret.inflation.applied",
  "Pret.inflation.override",
  "Pret.inflation.reset",
  "Pret.outlier.flagged",
  "Pret.currency.changed",
];

export default async function handler(req, res) {
  // CORS for browser POST din UI
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events : [];
    const userId = String(body.userId || "anonymous").slice(0, 64);
    const sessionId = String(body.sessionId || "").slice(0, 64);

    if (events.length === 0) {
      res.status(400).json({ error: "Empty events array." });
      return;
    }
    if (events.length > MAX_BATCH) {
      res.status(400).json({ error: `Batch too large: ${events.length} > ${MAX_BATCH}` });
      return;
    }

    // Validare format event
    const validated = events
      .filter(ev => ev && typeof ev.action === "string" && VALID_ACTIONS.includes(ev.action))
      .map(ev => ({
        user_id: userId,
        session_id: sessionId,
        action: ev.action,
        meta: ev.meta || {},
        client_timestamp: ev.timestamp || new Date().toISOString(),
        server_timestamp: new Date().toISOString(),
      }));

    if (validated.length === 0) {
      res.status(400).json({ error: "No valid events after filtering." });
      return;
    }

    // ── PERSIST BACKEND ──
    // Implementare default: Supabase (recomandat Zephren pentru consistency cu
    // restul stack-ului). Poate fi schimbat cu PostgreSQL direct, MongoDB, etc.
    // ───────────────────────────────────────────────────────────────────────
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      res.status(500).json({
        error: "Backend not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
      });
      return;
    }

    // Insert în tabela `price_analytics_events`
    // Schemă recomandată (SQL):
    //   CREATE TABLE price_analytics_events (
    //     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    //     user_id text NOT NULL,
    //     session_id text,
    //     action text NOT NULL,
    //     meta jsonb,
    //     client_timestamp timestamptz,
    //     server_timestamp timestamptz DEFAULT now()
    //   );
    //   CREATE INDEX idx_pae_user_action ON price_analytics_events(user_id, action);
    //   CREATE INDEX idx_pae_server_ts ON price_analytics_events(server_timestamp);
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/price_analytics_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(validated),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      res.status(500).json({ error: `Backend insert failed: ${errText.slice(0, 200)}` });
      return;
    }

    res.status(200).json({
      stored: validated.length,
      filtered: events.length - validated.length,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[price-analytics] error:", err);
    res.status(500).json({ error: String(err.message || err).slice(0, 200) });
  }
}

// Vercel serverless config — limit 10 sec (default)
export const config = {
  maxDuration: 10,
};
