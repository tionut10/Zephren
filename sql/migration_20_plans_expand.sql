-- =============================================================================
-- Zephren — Migration Sprint 20 (18 apr 2026)
-- Extindere constraint plan de la 3 la 6 valori (free/starter/standard/pro/asociatie/business)
-- + câmpuri GDPR consent + retention + DSR tracking
-- Rulați în Supabase SQL Editor în ordine.
-- =============================================================================

-- 1. PROFILES — extindere check constraint plan
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'standard', 'pro', 'asociatie', 'business'));

-- 2. PROFILES — câmpuri GDPR consent (Art. 6-7)
alter table public.profiles add column if not exists consent_privacy_at timestamptz;
alter table public.profiles add column if not exists consent_terms_at   timestamptz;
alter table public.profiles add column if not exists consent_marketing_at timestamptz;
alter table public.profiles add column if not exists privacy_version    text default '1.0';
alter table public.profiles add column if not exists terms_version      text default '1.0';

-- 3. TEAMS — extindere check constraint plan (pentru consistență)
alter table public.teams drop constraint if exists teams_plan_check;
alter table public.teams add constraint teams_plan_check
  check (plan in ('free', 'starter', 'standard', 'pro', 'asociatie', 'business'));

-- 4. PROJECTS — retenție + anonimizare (Art. 5(1)(e) GDPR + arhivare fiscală 10 ani)
alter table public.projects add column if not exists retention_until timestamptz
  default (now() + interval '10 years');
alter table public.projects add column if not exists anonymized_at  timestamptz;
alter table public.projects add column if not exists archived_at    timestamptz;

-- 5. DSR — tabela pentru cereri Art. 15-22 (acces, rectificare, ștergere, portabilitate)
create table if not exists public.data_subject_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
  status      text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  reason      text default '',
  requested_at timestamptz default now(),
  completed_at timestamptz,
  notes       text default ''
);

create index if not exists idx_dsr_user_id on public.data_subject_requests(user_id);
create index if not exists idx_dsr_status on public.data_subject_requests(status);

alter table public.data_subject_requests enable row level security;

create policy "dsr_select_own"
  on public.data_subject_requests for select
  using (auth.uid() = user_id);

create policy "dsr_insert_own"
  on public.data_subject_requests for insert
  with check (auth.uid() = user_id);

-- 6. AUDIT LOG — Art. 30 GDPR minim (cine a accesat date)
create table if not exists public.access_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,  -- 'login', 'project_read', 'project_write', 'project_delete', 'export_json', 'export_docx', 'export_xml'
  resource   text,           -- project_id sau alt identificator
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_access_log_user_id on public.access_log(user_id, created_at desc);
create index if not exists idx_access_log_action on public.access_log(action, created_at desc);

alter table public.access_log enable row level security;

-- Userul poate vedea doar propriile loguri (pentru DSR access)
create policy "access_log_select_own"
  on public.access_log for select
  using (auth.uid() = user_id);

-- Logurile se scriu doar prin service key (server-side)
-- (no insert policy → blocked for regular users; service_role bypasses RLS)

-- 7. FUNCȚIE RPC pentru drept la ștergere (Art. 17)
-- Anonymizes projects but keeps financial records (10 year retention)
create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Neautentificat';
  end if;

  -- Insert DSR request
  insert into public.data_subject_requests (user_id, request_type, status, reason)
  values (v_user_id, 'erasure', 'in_progress', 'User-initiated account deletion (Art. 17 GDPR)');

  -- Anonymize projects (keep for fiscal/audit records, remove PII)
  update public.projects
    set data = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(data, '{ownerName}', '"[ANONIMIZAT]"'),
                '{ownerEmail}', '"anonim@zephren.ro"'),
              '{ownerPhone}', '"[ANONIMIZAT]"'),
            '{buildingAddress}', '"[ANONIMIZAT]"'),
          '{cadastralNumber}', '"[ANONIMIZAT]"'),
        anonymized_at = now()
  where user_id = v_user_id;

  -- Delete certificates (no retention obligation)
  delete from public.certificates where user_id = v_user_id;

  -- Anonymize profile
  update public.profiles
    set email = 'anonim-' || id || '@zephren.ro',
        name = '[ANONIMIZAT]',
        company = ''
  where id = v_user_id;

  -- Mark DSR complete
  update public.data_subject_requests
    set status = 'completed', completed_at = now()
  where user_id = v_user_id and request_type = 'erasure' and status = 'in_progress';
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- =============================================================================
-- ROLLBACK (dacă este necesar)
-- =============================================================================
-- alter table public.profiles drop constraint profiles_plan_check;
-- alter table public.profiles add constraint profiles_plan_check
--   check (plan in ('free', 'pro', 'business'));
-- alter table public.profiles drop column consent_privacy_at, ...;
-- drop table public.data_subject_requests;
-- drop table public.access_log;
-- drop function public.request_account_deletion();
