-- ═══════════════════════════════════════════════════════════════════════════
-- Zephren — Supabase Schema (S7.4)
-- Database: PostgreSQL 15+ (Supabase default)
-- Auth: Supabase Auth (auth.users built-in)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Usage:
--   1. Copy acest fișier în Supabase Dashboard → SQL Editor → Run
--   2. Sau: `supabase db push` dacă folosești Supabase CLI
--   3. Verifică în Table Editor că cele 5 tabele sunt create
--
-- RLS (Row Level Security): ENABLE pe fiecare tabel cu policies minime.
-- Extinde policies după nevoile echipei / planul de securitate.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensii necesare ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PROFILES — profilul extins peste auth.users
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text,
  email         text NOT NULL,
  tier          text NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free', 'starter', 'standard', 'pro', 'business', 'asociatie')),
  project_count integer NOT NULL DEFAULT 0,
  cert_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);

-- Trigger: auto-populate email la signup (din auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TEAMS — echipe Business/Asociație (multi-user collaboration)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        text NOT NULL DEFAULT 'business'
              CHECK (plan IN ('business', 'asociatie')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TEAM_MEMBERS — relație user ↔ team cu roluri
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id     uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TEAM_INVITATIONS — invitații pending pentru join
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member', 'viewer')),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX IF NOT EXISTS idx_invitations_team ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.team_invitations(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PROJECTS — proiecte energetice salvate (JSONB blob)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name        text NOT NULL DEFAULT 'Proiect',
  address     text,
  category    text, -- RI, RC, RA, BI, ED, SA, HC, CO, SP, AL
  energy_class text,
  ep_total    numeric(10, 2),
  data        jsonb NOT NULL, -- întregul state (building, opaqueElements, etc.)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON public.projects(updated_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — policies minime
-- ═══════════════════════════════════════════════════════════════════════════

-- PROFILES: user poate citi/edita doar profilul propriu
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- TEAMS: user poate citi doar echipele unde e membru
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_member_select ON public.teams;
CREATE POLICY teams_member_select ON public.teams
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS teams_owner_insert ON public.teams;
CREATE POLICY teams_owner_insert ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS teams_owner_update ON public.teams;
CREATE POLICY teams_owner_update ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS teams_owner_delete ON public.teams;
CREATE POLICY teams_owner_delete ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- TEAM_MEMBERS: user poate citi doar team-urile unde e membru
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS team_members_owner_insert ON public.team_members;
CREATE POLICY team_members_owner_insert ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    OR user_id = auth.uid() -- self-insert la accept invitation
  );

DROP POLICY IF EXISTS team_members_owner_delete ON public.team_members;
CREATE POLICY team_members_owner_delete ON public.team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
  );

-- TEAM_INVITATIONS: doar membri echipă pot vedea, doar owner/admin pot crea
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_member_select ON public.team_invitations;
CREATE POLICY invitations_member_select ON public.team_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid())
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS invitations_admin_insert ON public.team_invitations;
CREATE POLICY invitations_admin_insert ON public.team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- PROJECTS: user vede doar proiectele proprii + echipă
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_owner_select ON public.projects;
CREATE POLICY projects_owner_select ON public.projects
  FOR SELECT USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS projects_owner_insert ON public.projects;
CREATE POLICY projects_owner_insert ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS projects_owner_update ON public.projects;
CREATE POLICY projects_owner_update ON public.projects
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS projects_owner_delete ON public.projects;
CREATE POLICY projects_owner_delete ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATED_AT triggers — auto-update pe update
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated ON public.teams;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP JOB (opțional) — șterge invitații expirate după 30 zile
-- Activat via pg_cron (Supabase Pro+) sau Edge Function programată
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT cron.schedule('expire-invitations', '0 0 * * *', $$
--   UPDATE public.team_invitations SET status = 'expired'
--   WHERE status = 'pending' AND expires_at < now();
-- $$);
