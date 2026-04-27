/**
 * api/submit-mdlpa.js — Endpoint Vercel pentru depunere CPE/RAE/Pașaport
 * la portalul electronic MDLPA introdus prin Ord. 348/2026.
 *
 * Sprint MDLPA Faza 0 (27 apr 2026)
 *
 * METODĂ:
 *   POST /api/submit-mdlpa
 *
 * BODY:
 *   {
 *     document_type: "CPE" | "RAE" | "PASAPORT" | "ATESTARE" | "EXTINDERE" | "REINNOIRE" | "RAPORT_ANUAL",
 *     document_uuid: "uuid v4/v5",
 *     document_xml: "<xml...>",
 *     auditor_atestat: "AE12345/2024",
 *     document_pdf_base64?: "base64...",
 *     metadata?: { ... }
 *   }
 *
 * RESPONSE:
 *   200 OK    — { ok: true, submission_id, status: "queued" | "success", reference_id?, registry_url? }
 *   400 BAD   — { ok: false, errors: [{field, message}] }
 *   401 AUTH  — { ok: false, error: "Unauthorized" }
 *   429 RATE  — { ok: false, error: "Rate limit" }
 *   503 PORT  — { ok: false, error: "Portal MDLPA indisponibil — depunere pusă în coadă" }
 */

// IMPORT: foloseam direct din lib (Vercel build le include)
// NB: pe runtime serverless Node, modulele ES sunt suportate dacă "type": "module" în package.json
// În caz de probleme, varianta CommonJS prin require().

import { validateSubmissionPayload } from "../src/lib/mdlpa-validator.js";
import { submitDocument } from "../src/lib/mdlpa-portal-adapter.js";
import { drainQueue } from "../src/lib/mdlpa-queue.js";

export default async function handler(req, res) {
  // Headers CORS / cache
  res.setHeader("Cache-Control", "no-store");

  // ─── GET /api/submit-mdlpa?cron=1 → cron retry trigger (Vercel cron) ───
  // Consolidat aici pentru a respecta limita Vercel Hobby de 12 funcții.
  if (req.method === "GET") {
    const isCron = req.query?.cron === "1" || req.url?.includes("cron=1");
    if (!isCron) {
      return res.status(400).json({ ok: false, error: "Use POST to submit, or GET ?cron=1 for queue drain" });
    }

    // Verificare token cron Vercel (set automat în prod prin VERCEL_CRON_SECRET sau header x-vercel-signature)
    // În Faza 0 acceptăm orice GET cu ?cron=1 — restricția vine în Faza 1.
    const worker_id = `cron-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    try {
      const drainResult = await drainQueue({ worker_id, max_items: 20 });
      const response = {
        ok: true,
        worker_id,
        duration_ms: Date.now() - startedAt,
        ...drainResult,
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify({ level: "info", event: "mdlpa_cron_done", ...response }));
      return res.status(200).json(response);
    } catch (err) {
      console.error(JSON.stringify({
        level: "error",
        event: "mdlpa_cron_error",
        worker_id,
        error: err.message,
      }));
      return res.status(500).json({
        ok: false,
        worker_id,
        error: err.message,
        duration_ms: Date.now() - startedAt,
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: "Body JSON invalid" });
  }

  // 1. Validare payload
  const validation = validateSubmissionPayload(payload);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }

  // 2. Audit log preliminar (vom adăuga în Supabase când service_role key e disponibil server-side)
  // În Faza 0 lucrăm direct prin adapter; în Faza 1 (când API real) trecem prin queue.
  // Decizie: dacă utilizatorul e autentificat și avem queue → enqueue;
  // altfel direct submit (mod try-once).

  let result;
  try {
    result = await submitDocument(payload);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Eroare adapter MDLPA",
      detail: e.message,
    });
  }

  // 3. Răspuns
  if (result.success) {
    return res.status(200).json({
      ok: true,
      status: "success",
      reference_id: result.reference_id,
      registry_url: result.registry_url,
      acknowledged_at: result.acknowledged_at,
      mock_mode: result.raw_response?.mock === true,
    });
  }

  // Eșecul nu-i fatal — în Faza 1 va declanșa enqueue automat
  const statusCode = result.error_code === "PORTAL_VALIDATION_ERROR" ? 400 :
                     result.error_code === "PORTAL_RATE_LIMIT"        ? 429 :
                     result.error_code === "PORTAL_AUTH_ERROR"        ? 401 :
                     503; // portal indisponibil sau server error

  return res.status(statusCode).json({
    ok: false,
    error_code: result.error_code,
    error_message: result.error_message,
    mock_mode: payload && payload._mock === true,
    hint: statusCode === 503
      ? "Portal MDLPA temporar indisponibil. Reîncearcă în câteva minute sau folosește metoda email (Sprint 17)."
      : undefined,
  });
}
