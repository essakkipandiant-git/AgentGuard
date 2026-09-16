-- AgentGuard Step 1: backend foundation
-- Idempotent migration for profiles, workspaces, and workspace_members.

begin;

-- Keep the role model extensible while preserving existing memberships.
do $$
begin
  if not exists (select 1 from pg_enum where enumtypid = 'public.workspace_role'::regtype and enumlabel = 'security') then
    alter type public.workspace_role add value 'security';
  end if;
  if not exists (select 1 from pg_enum where enumtypid = 'public.workspace_role'::regtype and enumlabel = 'developer') then
    alter type public.workspace_role add value 'developer';
  end if;
exception
  when undefined_object then
    create type public.workspace_role as enum ('owner', 'admin', 'security', 'developer', 'member', 'viewer');
end;
$$;

alter table public.workspaces add column if not exists slug text;

-- Backfill stable, readable slugs without changing existing workspace names.
with candidates as (
  select
    id,
    coalesce(
      nullif(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), ''),
      'workspace'
    ) as base_slug
  from public.workspaces
  where slug is null
), numbered as (
  select id, base_slug,
    row_number() over (partition by base_slug order by id) as slug_number
  from candidates
)
update public.workspaces w
set slug = case when n.slug_number = 1 then n.base_slug else n.base_slug || '-' || n.slug_number::text end
from numbered n
where w.id = n.id;

update public.workspaces
set slug = 'workspace-' || id::text
where slug is null;

alter table public.workspaces alter column slug set not null;
create unique index if not exists workspaces_slug_key on public.workspaces (slug);

create index if not exists profiles_id_idx on public.profiles (id);
create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members (workspace_id);

-- Ensure authenticated users can only read/update their own profile.
alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Workspace visibility is membership-based; only owners may update workspace metadata.
alter table public.workspaces enable row level security;
drop policy if exists workspaces_member_select on public.workspaces;
drop policy if exists workspaces_owner_update on public.workspaces;
create policy workspaces_member_select on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_owner_update on public.workspaces
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Membership reads are tenant-scoped; membership writes are restricted to owners/admins.
alter table public.workspace_members enable row level security;
drop policy if exists members_member_select on public.workspace_members;
drop policy if exists members_admin_write on public.workspace_members;
create policy members_member_select on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy members_admin_write on public.workspace_members
  for all to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- Keep signup provisioning server-side and avoid exposing privileged credentials.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  workspace_name text;
  workspace_slug text;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  workspace_name := coalesce(nullif(new.raw_user_meta_data->>'company', ''), 'Personal workspace');
  workspace_slug := regexp_replace(lower(workspace_name), '[^a-z0-9]+', '-', 'g');
  workspace_slug := trim(both '-' from workspace_slug);
  if workspace_slug = '' then workspace_slug := 'workspace'; end if;
  workspace_slug := workspace_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.workspaces (name, slug, owner_id)
  values (workspace_name, workspace_slug, new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

commit;
