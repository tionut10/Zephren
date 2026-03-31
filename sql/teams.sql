-- =============================================================================
-- Zephren — Multi-User / Team Schema (requires schema.sql first)
-- =============================================================================

-- 4. TEAMS
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  plan       text default 'business' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

-- Team members can view their team
create policy "teams_select_member"
  on public.teams for select
  using (
    id in (select team_id from public.team_members where user_id = auth.uid())
    or owner_id = auth.uid()
  );

-- Only owner can update/delete
create policy "teams_update_owner"
  on public.teams for update
  using (owner_id = auth.uid());

create policy "teams_insert_owner"
  on public.teams for insert
  with check (owner_id = auth.uid());

create policy "teams_delete_owner"
  on public.teams for delete
  using (owner_id = auth.uid());

-- 5. TEAM MEMBERS
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references auth.users(id),
  joined_at  timestamptz default now(),
  unique(team_id, user_id)
);

create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);

alter table public.team_members enable row level security;

-- Members can see other members of their teams
create policy "team_members_select"
  on public.team_members for select
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

-- Only owner/admin can add members
create policy "team_members_insert"
  on public.team_members for insert
  with check (
    team_id in (
      select tm.team_id from public.team_members tm
      where tm.user_id = auth.uid() and tm.role in ('owner', 'admin')
    )
  );

-- Only owner/admin can remove members
create policy "team_members_delete"
  on public.team_members for delete
  using (
    team_id in (
      select tm.team_id from public.team_members tm
      where tm.user_id = auth.uid() and tm.role in ('owner', 'admin')
    )
    or user_id = auth.uid() -- users can remove themselves
  );

-- 6. TEAM INVITATIONS
create table if not exists public.team_invitations (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  email      text not null,
  role       text default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users(id),
  status     text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(team_id, email)
);

alter table public.team_invitations enable row level security;

create policy "invitations_select"
  on public.team_invitations for select
  using (
    email = (select email from auth.users where id = auth.uid())
    or team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "invitations_insert"
  on public.team_invitations for insert
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

-- 7. SHARED PROJECTS — allow team members to access projects
-- Update projects RLS to include team access
create policy "projects_select_team"
  on public.projects for select
  using (
    user_id in (
      select tm2.user_id from public.team_members tm1
      join public.team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid()
    )
  );
