-- AgentGuard Step 2: real Agent registration and CRUD.
-- Extends the existing agents table without implementing policies, approvals, activity, or runtime execution.

begin;

alter table public.agents add column if not exists slug text;
alter table public.agents add column if not exists agent_type text;
alter table public.agents add column if not exists provider text;
alter table public.agents add column if not exists environment text;
alter table public.agents add column if not exists version text;
alter table public.agents add column if not exists endpoint_url text;
alter table public.agents add column if not exists last_seen_at timestamptz;
alter table public.agents add column if not exists created_by uuid;

update public.agents
set created_by = coalesce(created_by, owner_id)
where created_by is null and owner_id is not null;

with candidates as (
  select id, workspace_id,
    coalesce(nullif(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), ''), 'agent') as base_slug
  from public.agents where slug is null
), numbered as (
  select id, workspace_id, base_slug,
    row_number() over (partition by workspace_id, base_slug order by id) as slug_number
  from candidates
)
update public.agents a
set slug = case when n.slug_number = 1 then n.base_slug else n.base_slug || '-' || n.slug_number::text end
from numbered n where a.id = n.id;

update public.agents
set slug = 'agent-' || id::text
where slug is null;

alter table public.agents alter column slug set not null;
alter table public.agents add constraint agents_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
create unique index if not exists agents_workspace_slug_key on public.agents (workspace_id, slug);
create index if not exists agents_workspace_id_idx on public.agents (workspace_id);
create index if not exists agents_created_by_idx on public.agents (created_by);

alter table public.agents enable row level security;
drop policy if exists agents_member_select on public.agents;
drop policy if exists agents_member_write on public.agents;
drop policy if exists agents_select on public.agents;
drop policy if exists agents_insert on public.agents;
drop policy if exists agents_update on public.agents;
drop policy if exists agents_delete on public.agents;

create policy agents_select on public.agents
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy agents_insert on public.agents
  for insert to authenticated
  with check (
    public.is_workspace_admin(workspace_id)
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agents.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role = 'developer'
    )
  );

create policy agents_update on public.agents
  for update to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agents.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role = 'developer'
    )
  )
  with check (
    public.is_workspace_admin(workspace_id)
    or (
      exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = agents.workspace_id
          and wm.user_id = (select auth.uid())
          and wm.role = 'developer'
      )
      and status in ('active', 'paused', 'disabled')
    )
  );

create policy agents_delete on public.agents
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create or replace function public.create_agent_with_slug(
  p_workspace_id uuid,
  p_created_by uuid,
  p_name text,
  p_agent_type text,
  p_provider text,
  p_environment text,
  p_description text default null,
  p_version text default null,
  p_endpoint_url text default null
)
returns public.agents
language plpgsql
set search_path = public
as $$
declare
  candidate_slug text;
  suffix integer := 1;
  result public.agents;
begin
  candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if candidate_slug = '' then raise exception 'Agent name is required'; end if;
  while exists (select 1 from public.agents where workspace_id = p_workspace_id and slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')) || '-' || suffix::text;
  end loop;

  insert into public.agents (workspace_id, owner_id, created_by, name, slug, description, agent_type, provider, environment, version, endpoint_url, status)
  values (p_workspace_id, p_created_by, p_created_by, trim(p_name), candidate_slug, nullif(trim(p_description), ''), trim(p_agent_type), trim(p_provider), trim(p_environment), nullif(trim(p_version), ''), nullif(trim(p_endpoint_url), ''), 'active')
  returning * into result;
  return result;
end;
$$;

commit;
