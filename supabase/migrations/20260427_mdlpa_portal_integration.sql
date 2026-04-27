-- ═══════════════════════════════════════════════════════════════════════════
-- Migrare: 20260427_mdlpa_portal_integration.sql
-- Sprint MDLPA Faza 0 — Integrare portal electronic Ord. 348/2026
-- Data: 27 aprilie 2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXT:
-- Ord. MDLPA 348/2026 (MO 292 / 14 apr 2026) introduce portal electronic
-- pentru depunere CPE/RAE/atestări (operațional ~8 iulie 2026).
-- Această migrare creează infrastructura de:
--   1. Audit log persistent al tuturor depunerilor (mdlpa_submissions)
--   2. Coadă de retry pentru depuneri eșuate (mdlpa_submission_queue)
--
-- IMPORTANT: Este complementară cu fluxul email existent (mdlpa-submit.js
-- Sprint 17). NU înlocuiește — adaugă layer pentru viitorul API portal.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. AUDIT LOG DEPUNERI ─────────────────────────────────────────────────
-- Toate depunerile (email + viitor API portal) sunt logate aici pentru
-- traceability GDPR + audit MDLPA + raportări financiare.

CREATE TABLE IF NOT EXISTS public.mdlpa_submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipul documentului depus
  document_type       text NOT NULL CHECK (document_type IN (
    'CPE',          -- Certificat de Performanță Energetică
    'RAE',          -- Raport de Audit Energetic
    'PASAPORT',     -- Pașaport de Renovare a Clădirii (EPBD 2024)
    'ATESTARE',     -- Cerere atestare auditor
    'EXTINDERE',    -- Cerere extindere atestat
    'REINNOIRE',   -- Reînnoire atestat
    'RAPORT_ANUAL'  -- Raportare anuală activitate auditor
  )),

  -- Identificatori unici
  document_uuid       uuid NOT NULL,                  -- UUID v5 generat de Zephren
  document_code       text,                            -- Cod intern (ex. CPE-2026-0001)
  document_hash       text NOT NULL,                   -- SHA-256 al payload-ului trimis
  payload_size_bytes  integer NOT NULL DEFAULT 0,

  -- Identitate auditor
  auditor_atestat     text NOT NULL,                   -- Nr. atestat MDLPA
  auditor_uuid        uuid,                            -- UUID intern auditor (dacă exists)

  -- Metoda de depunere
  submission_method   text NOT NULL DEFAULT 'email' CHECK (submission_method IN (
    'email',        -- Sprint 17 — email la birou.atestari@mdlpa.ro
    'portal_api',   -- Sprint MDLPA Faza 1 — API portal (cand devine disponibil)
    'cloud_link',   -- Upload Supabase + email cu link
    'manual'        -- Marker manual (utilizator a depus în alt mod)
  )),

  -- Răspuns portal
  portal_response     jsonb,                           -- Răspuns brut API portal
  portal_reference_id text,                            -- ID intern MDLPA returnat
  portal_registry_url text,                            -- URL public registru MDLPA

  -- Status
  status              text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',       -- În coadă de procesare
    'submitting',   -- În curs de trimitere
    'success',      -- Depus cu succes (confirmare portal)
    'failed',       -- Eșuat (retry posibil)
    'rejected',     -- Respins de portal (validare/conformitate)
    'cancelled'     -- Anulat de utilizator
  )),

  retry_count         integer NOT NULL DEFAULT 0,
  last_error          text,

  -- Timestamps
  submitted_at        timestamptz,                     -- Când s-a inițiat depunerea
  acknowledged_at     timestamptz,                     -- Când portal a confirmat
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdlpa_submissions_user        ON public.mdlpa_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mdlpa_submissions_status      ON public.mdlpa_submissions(status);
CREATE INDEX IF NOT EXISTS idx_mdlpa_submissions_doc_type    ON public.mdlpa_submissions(document_type);
CREATE INDEX IF NOT EXISTS idx_mdlpa_submissions_created     ON public.mdlpa_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mdlpa_submissions_doc_uuid    ON public.mdlpa_submissions(document_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mdlpa_submissions_hash  ON public.mdlpa_submissions(document_hash, status)
  WHERE status IN ('success', 'submitting');           -- previne dublarea aceleiași depuneri

-- RLS — fiecare auditor vede doar depunerile proprii
ALTER TABLE public.mdlpa_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auditors see own submissions" ON public.mdlpa_submissions;
CREATE POLICY "Auditors see own submissions" ON public.mdlpa_submissions
  FOR ALL USING (auth.uid() = user_id);

-- Trigger updated_at automat
CREATE OR REPLACE FUNCTION public.touch_mdlpa_submission_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mdlpa_submissions_updated_at ON public.mdlpa_submissions;
CREATE TRIGGER trg_mdlpa_submissions_updated_at
  BEFORE UPDATE ON public.mdlpa_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_mdlpa_submission_updated_at();


-- ─── 2. COADĂ DE RETRY ─────────────────────────────────────────────────────
-- Depunerile eșuate (timeout, 5xx, network) sunt trecute aici pentru retry
-- automat de cron (15 min). Backoff exponențial: 5min, 15min, 1h, 6h, 24h.

CREATE TABLE IF NOT EXISTS public.mdlpa_submission_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     uuid NOT NULL REFERENCES public.mdlpa_submissions(id) ON DELETE CASCADE,

  scheduled_at      timestamptz NOT NULL DEFAULT now(),
  next_attempt_at   timestamptz NOT NULL DEFAULT now() + INTERVAL '5 minutes',
  attempts          integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 10,

  last_attempt_at   timestamptz,
  last_error        text,
  last_status_code  integer,

  -- Lock optimist (cron poate rula concurrent)
  locked_until      timestamptz,
  locked_by         text,                              -- ID worker (cron run UUID)

  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdlpa_queue_next_attempt
  ON public.mdlpa_submission_queue(next_attempt_at)
  WHERE attempts < max_attempts;

CREATE INDEX IF NOT EXISTS idx_mdlpa_queue_submission
  ON public.mdlpa_submission_queue(submission_id);

-- RLS — queue-ul e administrativ, doar service_role poate accesa
ALTER TABLE public.mdlpa_submission_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Queue service role only" ON public.mdlpa_submission_queue;
CREATE POLICY "Queue service role only" ON public.mdlpa_submission_queue
  FOR ALL USING (auth.role() = 'service_role');


-- ─── 3. RPC: claim_next_queue_item ─────────────────────────────────────────
-- Atomic claim pentru cron worker (previne dublarea retry-urilor).

CREATE OR REPLACE FUNCTION public.mdlpa_claim_queue_item(p_worker_id text, p_lock_seconds int DEFAULT 300)
RETURNS TABLE(queue_id uuid, submission_id uuid, attempts int) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  UPDATE public.mdlpa_submission_queue q
  SET locked_until = now() + (p_lock_seconds || ' seconds')::interval,
      locked_by    = p_worker_id,
      attempts     = q.attempts + 1,
      last_attempt_at = now()
  WHERE q.id = (
    SELECT id FROM public.mdlpa_submission_queue
    WHERE next_attempt_at <= now()
      AND attempts < max_attempts
      AND (locked_until IS NULL OR locked_until < now())
    ORDER BY next_attempt_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.id, q.submission_id, q.attempts;
END;
$$;


-- ─── 4. RPC: schedule_next_retry ───────────────────────────────────────────
-- Calculează următorul moment de retry cu backoff exponențial.

CREATE OR REPLACE FUNCTION public.mdlpa_schedule_next_retry(
  p_queue_id uuid,
  p_error    text DEFAULT NULL,
  p_status_code int DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_attempts int;
  v_next_in interval;
BEGIN
  SELECT attempts INTO v_attempts FROM public.mdlpa_submission_queue WHERE id = p_queue_id;

  -- Backoff exponențial: 5min · 15min · 1h · 6h · 24h · 24h ...
  v_next_in := CASE
    WHEN v_attempts <= 1 THEN '5 minutes'::interval
    WHEN v_attempts = 2 THEN '15 minutes'::interval
    WHEN v_attempts = 3 THEN '1 hour'::interval
    WHEN v_attempts = 4 THEN '6 hours'::interval
    ELSE '24 hours'::interval
  END;

  UPDATE public.mdlpa_submission_queue
  SET next_attempt_at = now() + v_next_in,
      locked_until    = NULL,
      locked_by       = NULL,
      last_error      = COALESCE(p_error, last_error),
      last_status_code = COALESCE(p_status_code, last_status_code)
  WHERE id = p_queue_id;
END;
$$;


-- ─── 5. RPC: mark_queue_success ────────────────────────────────────────────
-- La success, ștergem din coadă și marcăm submission-ul.

CREATE OR REPLACE FUNCTION public.mdlpa_mark_queue_success(
  p_queue_id      uuid,
  p_portal_ref    text DEFAULT NULL,
  p_portal_url    text DEFAULT NULL,
  p_response      jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_submission_id uuid;
BEGIN
  SELECT submission_id INTO v_submission_id
  FROM public.mdlpa_submission_queue WHERE id = p_queue_id;

  UPDATE public.mdlpa_submissions
  SET status              = 'success',
      portal_reference_id = COALESCE(p_portal_ref, portal_reference_id),
      portal_registry_url = COALESCE(p_portal_url, portal_registry_url),
      portal_response     = COALESCE(p_response, portal_response),
      acknowledged_at     = now()
  WHERE id = v_submission_id;

  DELETE FROM public.mdlpa_submission_queue WHERE id = p_queue_id;
END;
$$;


-- ─── 6. ROLLBACK (manual, comentat) ─────────────────────────────────────────
-- Dacă vrei să anulezi această migrare:
--
-- DROP FUNCTION IF EXISTS public.mdlpa_mark_queue_success(uuid, text, text, jsonb);
-- DROP FUNCTION IF EXISTS public.mdlpa_schedule_next_retry(uuid, text, int);
-- DROP FUNCTION IF EXISTS public.mdlpa_claim_queue_item(text, int);
-- DROP FUNCTION IF EXISTS public.touch_mdlpa_submission_updated_at();
-- DROP TABLE IF EXISTS public.mdlpa_submission_queue;
-- DROP TABLE IF EXISTS public.mdlpa_submissions;
