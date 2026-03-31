-- =============================================================================
-- Zephren Energy Calculator — Supabase Schema
-- Run this in the Supabase SQL Editor to set up tables and RLS policies.
-- =============================================================================

-- 1. PROFILES
-- Stores user metadata beyond what Supabase Auth provides.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text default '',
  company    text default '',
  plan       text default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read and update only their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, company, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'company', ''),
    'free'
  );
  return new;
end;
$$;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. PROJECTS
-- Stores energy calculation projects as JSONB blobs.
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'Proiect nou',
  data       jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups by user
create index if not exists idx_projects_user_id on public.projects(user_id);

alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();


-- 3. CERTIFICATES
-- Stores generated energy performance certificates.
create table if not exists public.certificates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  class      text not null,        -- e.g. 'A', 'B', 'C', 'D', 'E', 'F', 'G'
  ep_value   numeric not null,     -- primary energy consumption kWh/m2/an
  created_at timestamptz default now()
);

create index if not exists idx_certificates_user_id on public.certificates(user_id);
create index if not exists idx_certificates_project_id on public.certificates(project_id);

alter table public.certificates enable row level security;

create policy "certificates_select_own"
  on public.certificates for select
  using (auth.uid() = user_id);

create policy "certificates_insert_own"
  on public.certificates for insert
  with check (auth.uid() = user_id);

create policy "certificates_delete_own"
  on public.certificates for delete
  using (auth.uid() = user_id);
