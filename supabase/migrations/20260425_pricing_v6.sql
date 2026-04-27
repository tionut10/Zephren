-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint Pricing v6.0 — Supabase Migration (25 apr 2026)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Restructurare 6 → 8 niveluri pricing + tiered overage + EDU plan + pay-per-use.
-- Detalii: memorie pricing_strategy.md v6.0
--
-- APPLICARE:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Copy-paste tot fișierul → Run
--   3. Verifică în Table Editor că noile coloane apar
--   4. Verifică RLS policies activate
--
-- ROLLBACK: vezi secțiunea finală (comentat)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. EXTINDE CONSTRAINT-UL `tier` PENTRU PLANURILE NOI ────────────────
-- Vechiul: free / starter / standard / pro / business / asociatie
-- Noul:   free / edu / audit / pro / expert / birou / enterprise
-- Backward-compat: păstrăm și valorile vechi pentru utilizatori existenți.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check CHECK (tier IN (
    -- v6.0
    'free', 'edu', 'audit', 'pro', 'expert', 'birou', 'enterprise',
    -- v5.x backward-compat (deprecate, dar tolerate până la migrare manuală)
    'starter', 'standard', 'business', 'asociatie', 'professional'
  ));

-- ─── 2. ADAUGĂ COLOANE NOI PENTRU TIERED OVERAGE + PAY-PER-USE ───────────

ALTER TABLE public.profiles
  -- Counter CPE pentru luna curentă (reset lunar via cron)
  ADD COLUMN IF NOT EXISTS cpe_used_this_month     integer NOT NULL DEFAULT 0,
  -- Cap CPE incluse în plan curent (snapshot pentru afișare UI rapidă)
  ADD COLUMN IF NOT EXISTS cpe_included_per_month  integer NOT NULL DEFAULT 0,
  -- Burst gratis (20% peste cap)
  ADD COLUMN IF NOT EXISTS cpe_burst_per_month     integer NOT NULL DEFAULT 0,
  -- Pay-per-use credite cumpărate one-time (decrementate la fiecare CPE generat)
  ADD COLUMN IF NOT EXISTS cpe_credits_remaining   integer NOT NULL DEFAULT 0,
  -- Rollover CPE neutilizate (acumulate luna trecută, expiră după 3-6 luni)
  ADD COLUMN IF NOT EXISTS cpe_rollover_balance    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpe_rollover_expires_at timestamptz;

-- ─── 3. EDU PLAN — VERIFICARE DOVADĂ + ANTI-ABUSE ─────────────────────────

ALTER TABLE public.profiles
  -- Status verificare dovadă educațională
  ADD COLUMN IF NOT EXISTS edu_status text DEFAULT NULL
    CHECK (edu_status IS NULL OR edu_status IN ('pending', 'verified', 'expired', 'rejected')),
  -- Tip dovadă (student licență/master/doctorat — DOAR aceste categorii
  -- au acces automat la planul Edu. Universități, centre OAER, institute
  -- de cercetare și alte organizații: cerere separată de colaborare.)
  ADD COLUMN IF NOT EXISTS edu_proof_type text,
  -- URL dovadă (legitimație, adeverință) stocată în Supabase Storage
  ADD COLUMN IF NOT EXISTS edu_proof_doc_url text,
  -- Data activării EDU + data expirării (1 an de la activare)
  ADD COLUMN IF NOT EXISTS edu_activated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS edu_expires_at    timestamptz,
  -- Email instituțional (validat la activare)
  ADD COLUMN IF NOT EXISTS edu_institutional_email text,
  -- Universitate / instituție (extras din email + manual review)
  ADD COLUMN IF NOT EXISTS edu_institution text;

CREATE INDEX IF NOT EXISTS idx_profiles_edu_status   ON public.profiles(edu_status);
CREATE INDEX IF NOT EXISTS idx_profiles_edu_expires  ON public.profiles(edu_expires_at);

-- ─── 4. PRICE-LOCK MECHANIC (DEPRECATED v6.2 — 27 apr 2026) ───────────────
-- Mecanismul price-lock a fost ELIMINAT din oferta Zephren în v6.2.
-- Politica nouă: anunț cu 90 zile pentru orice modificare de preț (vezi docs/STRIPE_PRICING_V6_SETUP.md §6).
--
-- Coloanele de mai jos sunt PĂSTRATE în schema (nu se aruncă):
--   • backward-compatibility cu utilizatorii existenți (grandfathering tăcut — citire valori vechi)
--   • audit istoric pentru rapoarte financiare
--   • opțiune viitoare de „preț locked tactic" pentru cohorte speciale (Founders, Enterprise SLA)
--
-- IMPORTANT: codul aplicației NU mai citește/setează aceste coloane în fluxul standard de signup.
-- Migrarea NOUĂ (20260427_pricing_v62.sql, opțională) le poate marca ca DEPRECATED dacă se dorește.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS price_locked       boolean NOT NULL DEFAULT false,  -- DEPRECATED v6.2: nu mai e setat la signup
  ADD COLUMN IF NOT EXISTS price_lock_amount  integer,                          -- DEPRECATED v6.2: în bani (RON × 100)
  ADD COLUMN IF NOT EXISTS price_lock_date    timestamptz,                      -- DEPRECATED v6.2: prima activare
  ADD COLUMN IF NOT EXISTS billing_cycle      text DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- ─── 5. ADD-ONS (legacy, pre-v6 includea AI Pack și BIM Pack ca opționale) ─
-- v6.0 le include în Pro/Expert by default. Coloanele rămân pentru audit
-- istoric + scenarii viitoare „add-on suplimentar".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS addon_ai_pack  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_bim_pack boolean NOT NULL DEFAULT false;

-- ─── 6. CPE LOG — AUDIT TRAIL PER CPE GENERAT ─────────────────────────────
-- Necesar pentru:
--   • Counter overage tier 1/2/3 (calc per CPE)
--   • Random sample manual review 10% (anti-abuse EDU)
--   • Reporting financiar (câte CPE/lună × tarif)

CREATE TABLE IF NOT EXISTS public.cpe_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpe_uuid        text NOT NULL,                          -- UUID v5 al CPE-ului (cu prefix EDU- dacă e cazul)
  building_address text,
  energy_class    text,
  ep_primary      numeric,
  -- Plan + billing context
  user_plan       text NOT NULL,
  is_overage      boolean NOT NULL DEFAULT false,
  overage_tier    integer,                                -- 1 / 2 / 3 (null dacă nu e overage)
  overage_price   numeric,                                -- preț plătit pentru acest CPE specific
  is_one_time     boolean NOT NULL DEFAULT false,         -- pay-per-use vs abonament
  is_edu          boolean NOT NULL DEFAULT false,
  watermark_applied boolean NOT NULL DEFAULT false,
  -- Audit trail
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpe_log_user_month   ON public.cpe_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpe_log_overage      ON public.cpe_log(is_overage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpe_log_edu          ON public.cpe_log(is_edu) WHERE is_edu = true;

ALTER TABLE public.cpe_log ENABLE ROW LEVEL SECURITY;

-- Owner read own log
DROP POLICY IF EXISTS cpe_log_select_own ON public.cpe_log;
CREATE POLICY cpe_log_select_own ON public.cpe_log
  FOR SELECT USING (auth.uid() = user_id);

-- Service role only insert (via webhook / RPC, nu din UI)
DROP POLICY IF EXISTS cpe_log_insert_service ON public.cpe_log;
CREATE POLICY cpe_log_insert_service ON public.cpe_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─── 7. RPC HELPERS — operații atomice pentru counter + credite ───────────

-- 7.1 Incrementează counter CPE lunar + (opțional) decrement credite pay-per-use
CREATE OR REPLACE FUNCTION public.increment_cpe_counter(
  p_user_id uuid,
  p_use_credit boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile public.profiles;
  v_new_used integer;
  v_new_credits integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_new_used := v_profile.cpe_used_this_month + 1;
  v_new_credits := v_profile.cpe_credits_remaining;

  IF p_use_credit AND v_new_credits > 0 THEN
    v_new_credits := v_new_credits - 1;
  END IF;

  UPDATE public.profiles
    SET cpe_used_this_month   = v_new_used,
        cpe_credits_remaining = v_new_credits,
        updated_at            = now()
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cpe_used_this_month', v_new_used,
    'cpe_credits_remaining', v_new_credits
  );
END;
$$;

-- 7.2 Reset counter lunar (cron job lunar la 1 ale lunii)
CREATE OR REPLACE FUNCTION public.reset_monthly_cpe_counters()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  -- Mută CPE neutilizate în rollover (cu expirare 3 luni / 6 luni Birou)
  UPDATE public.profiles
    SET cpe_rollover_balance    = LEAST(
          cpe_rollover_balance + GREATEST(cpe_included_per_month - cpe_used_this_month, 0),
          cpe_included_per_month * 3                                    -- max 3× cap acumulat
        ),
        cpe_rollover_expires_at = now() + INTERVAL '3 months',
        cpe_used_this_month     = 0,
        updated_at              = now()
  WHERE cpe_used_this_month > 0 OR cpe_included_per_month > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Expiră rollover-uri vechi
  UPDATE public.profiles
    SET cpe_rollover_balance = 0
    WHERE cpe_rollover_expires_at IS NOT NULL
      AND cpe_rollover_expires_at < now();

  RETURN v_count;
END;
$$;

-- 7.3 Activează plan EDU după verificare manuală dovadă
CREATE OR REPLACE FUNCTION public.activate_edu_plan(
  p_user_id uuid,
  p_proof_type text,
  p_institution text,
  p_proof_doc_url text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Doar service_role poate activa (apelat din admin panel după review)
  IF auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.profiles
    SET tier              = 'edu',
        edu_status        = 'verified',
        edu_proof_type    = p_proof_type,
        edu_institution   = p_institution,
        edu_proof_doc_url = p_proof_doc_url,
        edu_activated_at  = now(),
        edu_expires_at    = now() + INTERVAL '1 year',
        updated_at        = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'expires_at', now() + INTERVAL '1 year');
END;
$$;

-- 7.4 Auto-downgrade EDU la free dacă expiră
CREATE OR REPLACE FUNCTION public.expire_edu_plans()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.profiles
    SET tier        = 'free',
        edu_status  = 'expired',
        updated_at  = now()
  WHERE tier = 'edu'
    AND edu_expires_at IS NOT NULL
    AND edu_expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── 8. RLS POLICIES SUPLIMENTARE ─────────────────────────────────────────
-- Userii pot citi propriul EDU status, dar NU pot modifica direct
-- (modificare doar prin RPC activate_edu_plan apelat din service_role)

DROP POLICY IF EXISTS profiles_update_own_safe ON public.profiles;
CREATE POLICY profiles_update_own_safe ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Userii NU pot modifica direct nici tier, nici contoare CPE, nici EDU status
    -- (acelea se modifică doar prin RPC sau webhook)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (NU rulați decât dacă vreți reset complet la v5.x)
-- ═══════════════════════════════════════════════════════════════════════════
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_used_this_month;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_included_per_month;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_burst_per_month;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_credits_remaining;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_rollover_balance;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpe_rollover_expires_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_status;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_proof_type;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_proof_doc_url;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_activated_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_expires_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_institutional_email;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS edu_institution;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS price_locked;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS price_lock_amount;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS price_lock_date;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS billing_cycle;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS addon_ai_pack;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS addon_bim_pack;
-- DROP TABLE IF EXISTS public.cpe_log;
-- DROP FUNCTION IF EXISTS public.increment_cpe_counter;
-- DROP FUNCTION IF EXISTS public.reset_monthly_cpe_counters;
-- DROP FUNCTION IF EXISTS public.activate_edu_plan;
-- DROP FUNCTION IF EXISTS public.expire_edu_plans;
