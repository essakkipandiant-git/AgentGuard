-- AgentGuard Step 2 security hardening.

begin;

drop policy if exists agents_insert on public.agents;
create policy agents_insert on public.agents
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_workspace_admin(workspace_id)
      or exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = agents.workspace_id
          and wm.user_id = (select auth.uid())
          and wm.role = 'developer'
      ))
  );

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
  actor_id uuid := auth.uid();
begin
  if actor_id is null or p_created_by <> actor_id then
    raise exception 'Authenticated user is required';
  end if;
  candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if candidate_slug = '' then raise exception 'Agent name is required'; end if;
  while exists (select 1 from public.agents where workspace_id = p_workspace_id and slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')) || '-' || suffix::text;
  end loop;
  insert into public.agents (workspace_id, owner_id, created_by, name, slug, description, agent_type, provider, environment, version, endpoint_url, status)
  values (p_workspace_id, actor_id, actor_id, trim(p_name), candidate_slug, nullif(trim(p_description), ''), trim(p_agent_type), trim(p_provider), trim(p_environment), nullif(trim(p_version), ''), nullif(trim(p_endpoint_url), ''), 'active')
  returning * into result;
  return result;
end;
$$;

create or replace function public.prevent_agent_workspace_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workspace_id <> old.workspace_id then
    raise exception 'Agent workspace cannot be changed';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Agent creator cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists agents_immutable_tenant on public.agents;
create trigger agents_immutable_tenant
before update on public.agents
for each row execute function public.prevent_agent_workspace_change();

commit;
