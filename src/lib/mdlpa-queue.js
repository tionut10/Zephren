/**
 * mdlpa-queue.js — Queue + retry pentru depuneri portal MDLPA
 *
 * Sprint MDLPA Faza 0 (27 apr 2026)
 *
 * SCOP:
 *   Persistent queue pentru depuneri eșuate (network/timeout/5xx). Cron
 *   Vercel rulează la 15 min și pollează acest queue, retrying cu backoff
 *   exponențial: 5min · 15min · 1h · 6h · 24h · 24h ...
 *
 * STORAGE: Supabase (tabela `mdlpa_submission_queue`).
 * RPCs:    `mdlpa_claim_queue_item`, `mdlpa_schedule_next_retry`,
 *          `mdlpa_mark_queue_success`.
 */

import { supabase } from "./supabase.js";
import { submitDocument, healthCheck } from "./mdlpa-portal-adapter.js";
import { validateSubmissionPayload } from "./mdlpa-validator.js";

export const DEFAULT_MAX_ATTEMPTS = 10;
export const WORKER_LOCK_SECONDS  = 300; // 5 min lock per item

// ─── ENQUEUE ───────────────────────────────────────────────────────────────

/**
 * Enregistrează o depunere și o pune în coadă pentru procesare.
 * Returnează submission_id (pentru tracking în UI).
 *
 * @param {object} params
 * @param {object} params.payload — payload conform mdlpa-portal-adapter
 * @param {string} params.user_id
 * @returns {Promise<{ submission_id: string, queued: boolean }>}
 */
export async function enqueueSubmission({ payload, user_id }) {
  if (!supabase) throw new Error("Supabase neconfigurat — nu pot enqueue");
  if (!user_id) throw new Error("user_id obligatoriu pentru enqueue");

  // Pre-validare hard — refuză payload invalid înainte să atingă DB
  const validation = validateSubmissionPayload(payload);
  if (!validation.valid) {
    throw new Error(`Payload invalid: ${validation.errors.map(e => e.message).join("; ")}`);
  }

  // Hash payload pentru deduplicare
  const document_hash = await _sha256(payload.document_xml);

  // INSERT submission row (status=queued)
  const { data: subRow, error: insertErr } = await supabase
    .from("mdlpa_submissions")
    .insert({
      user_id,
      document_type:      payload.document_type,
      document_uuid:      payload.document_uuid,
      document_code:      payload.metadata?.document_code || null,
      document_hash,
      payload_size_bytes: validation.stats.payload_size_bytes,
      auditor_atestat:    payload.auditor_atestat,
      submission_method:  "portal_api",
      status:             "queued",
    })
    .select("id")
    .single();

  if (insertErr) {
    // Probabil duplicat (unique index pe document_hash + status)
    if (insertErr.code === "23505") {
      throw new Error("Această depunere este deja în curs sau finalizată cu success");
    }
    throw insertErr;
  }

  // INSERT queue row
  const { error: queueErr } = await supabase
    .from("mdlpa_submission_queue")
    .insert({
      submission_id: subRow.id,
      max_attempts:  DEFAULT_MAX_ATTEMPTS,
    });

  if (queueErr) throw queueErr;

  return { submission_id: subRow.id, queued: true };
}

// ─── PROCESARE QUEUE (cron) ────────────────────────────────────────────────

/**
 * Procesează un singur element din coadă (apelat de cron sau manual).
 * Folosește RPC atomic pentru claim + lock optimist.
 *
 * @param {string} worker_id — ID unic pentru rulare (ex: cron run UUID)
 * @returns {Promise<{ processed: boolean, success: boolean|null, queue_id: string|null }>}
 */
export async function processNextQueueItem(worker_id) {
  if (!supabase) throw new Error("Supabase neconfigurat");

  // 1. Claim atomic
  const { data: claimed, error: claimErr } = await supabase.rpc("mdlpa_claim_queue_item", {
    p_worker_id: worker_id,
    p_lock_seconds: WORKER_LOCK_SECONDS,
  });

  if (claimErr) throw claimErr;
  if (!claimed || claimed.length === 0) {
    return { processed: false, success: null, queue_id: null }; // coada e goală
  }

  const item = claimed[0];

  // 2. Health check rapid — dacă portal e down, reschedule fără să cheltuiesc retry
  const health = await healthCheck();
  if (!health.up) {
    await supabase.rpc("mdlpa_schedule_next_retry", {
      p_queue_id: item.queue_id,
      p_error: "Portal MDLPA indisponibil (health check fail)",
      p_status_code: null,
    });
    return { processed: true, success: false, queue_id: item.queue_id };
  }

  // 3. Reconstruiește payload din submission
  const { data: sub, error: subErr } = await supabase
    .from("mdlpa_submissions")
    .select("*")
    .eq("id", item.submission_id)
    .single();

  if (subErr) {
    await supabase.rpc("mdlpa_schedule_next_retry", {
      p_queue_id: item.queue_id,
      p_error: `Nu pot citi submission: ${subErr.message}`,
    });
    return { processed: true, success: false, queue_id: item.queue_id };
  }

  // ATENȚIE: payload-ul XML real ar trebui regăsit din alt storage (ex: bucket
  // "mdlpa-submissions"). Pentru Faza 0 mock, folosim un payload minimal.
  // În Faza 1 (când API e real), trebuie să stocăm XML-ul în Storage și
  // să facem o coloană `xml_storage_path` în `mdlpa_submissions`.
  const payload = {
    document_type:   sub.document_type,
    document_uuid:   sub.document_uuid,
    document_xml:    `<placeholder uuid="${sub.document_uuid}"/>`, // TBD Faza 1
    auditor_atestat: sub.auditor_atestat,
  };

  // 4. Submit
  let result;
  try {
    result = await submitDocument(payload);
  } catch (e) {
    result = { success: false, error_code: "EXCEPTION", error_message: e.message };
  }

  // 5. Marchează rezultat
  if (result.success) {
    await supabase.rpc("mdlpa_mark_queue_success", {
      p_queue_id: item.queue_id,
      p_portal_ref: result.reference_id,
      p_portal_url: result.registry_url,
      p_response: result.raw_response,
    });
  } else {
    // Erorile de validare nu se reîncearcă (sunt determinist eșuate)
    if (result.error_code === "PORTAL_VALIDATION_ERROR") {
      await supabase
        .from("mdlpa_submissions")
        .update({ status: "rejected", last_error: result.error_message })
        .eq("id", item.submission_id);
      await supabase.from("mdlpa_submission_queue").delete().eq("id", item.queue_id);
    } else {
      await supabase.rpc("mdlpa_schedule_next_retry", {
        p_queue_id: item.queue_id,
        p_error: result.error_message,
        p_status_code: result.status_code || null,
      });
    }
  }

  return { processed: true, success: result.success, queue_id: item.queue_id };
}

/**
 * Procesează tot ce poate procesa până se golește coada sau atinge un limit.
 * Util pentru rulare cron periodică.
 *
 * @param {object} opts
 * @param {string} opts.worker_id
 * @param {number} [opts.max_items=20]   — limit hard pe rulare (evităm timeout cron)
 * @returns {Promise<{ processed: number, success: number, failed: number }>}
 */
export async function drainQueue({ worker_id, max_items = 20 } = {}) {
  let processed = 0, success = 0, failed = 0;

  for (let i = 0; i < max_items; i++) {
    const r = await processNextQueueItem(worker_id);
    if (!r.processed) break;
    processed++;
    if (r.success) success++; else failed++;
  }

  return { processed, success, failed };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

async function _sha256(input) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(String(input || ""));
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback Node (foarte rar — Vite oferă crypto)
  if (typeof require !== "undefined") {
    const nodeCrypto = require("crypto");
    return nodeCrypto.createHash("sha256").update(String(input || "")).digest("hex");
  }
  throw new Error("crypto API indisponibil");
}
