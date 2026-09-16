-- AgentGuard Step 3: real Policies, Policy Rules, and Agent-Policy assignments.
-- Migrates the compatible legacy policies/policy_rules tables in place.

begin;

-- Policies: preserve legacy enabled for compatibility while adding the Step 3 model.
alter table public.policies add column if not exists slug text;
alter table public.policies add column if not exists status text;
alter table public.policies add column if not exists version integer;
alter table public.policies add column if not exists is_default boolean;

update public.policies p
set created_by = coalesce(p.created_by, w.owner_id)
from public.workspaces w
where p.workspace_id = w.id and p.created_by is null;

with candidates as (
  select id, workspace_id,
    coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'policy') as base_slug
  from public.policies where slug is null
), numbered as (
  select id, workspace_id, base_slug,
    row_number() over (partition by workspace_id, base_slug order by id) as slug_number
  from candidates
)
update public.policies p
set slug = case when n.slug_number = 1 then n.base_slug else n.base_slug || '-' || n.slug_number::text end
from numbered n where p.id = n.id;

update public.policies set slug = 'policy-' || id::text where slug is null;
update public.policies set status = case when coalesce(enabled, true) then 'active' else 'disabled' end where status is null;
update public.policies set version = 1 where version is null;
update public.policies set is_default = false where is_default is null;

alter table public.policies alter column slug set not null;
alter table public.policies alter column status set not null;
alter table public.policies alter column version set not null;
alter table public.policies alter column is_default set not null;
alter table public.policies alter column created_by set not null;
alter table public.policies add constraint policies_status_check check (status in ('active','disabled','draft'));
alter table public.policies add constraint policies_version_check check (version >= 1);
create unique index if not exists policies_workspace_slug_key on public.policies (workspace_id, slug);
create unique index if not exists policies_one_default_per_workspace on public.policies (workspace_id) where is_default;
create index if not exists policies_workspace_id_idx on public.policies (workspace_id);
create index if not exists policies_created_by_idx on public.policies (created_by);

-- Rules: retain legacy permission/risk_threshold columns and add the normalized Step 3 fields.
alter table public.policy_rules add column if not exists rule_order integer;
alter table public.policy_rules add column if not exists name text;
alter table public.policy_rules add column if not exists description text;
alter table public.policy_rules add column if not exists risk_level text;
alter table public.policy_rules add column if not exists approval_required boolean;
alter table public.policy_rules add column if not exists conditions jsonb;

with numbered as (
  select id, row_number() over (partition by policy_id order by created_at, id) as rn
  from public.policy_rules where rule_order is null
)
update public.policy_rules r set rule_order = n.rn from numbered n where r.id = n.id;
update public.policy_rules set rule_order = 1 where rule_order is null;
update public.policy_rules set name = coalesce(nullif(name, ''), initcap(coalesce(action, 'Policy rule'))) where name is null or name = '';
update public.policy_rules set risk_level = coalesce(risk_level, risk_threshold::text, 'medium') where risk_level is null;
update public.policy_rules set approval_required = coalesce(approval_required, requires_approval, false) where approval_required is null;
update public.policy_rules set conditions = '{}'::jsonb where conditions is null;

alter table public.policy_rules alter column rule_order set not null;
alter table public.policy_rules alter column name set not null;
alter table public.policy_rules alter column action set not null;
alter table public.policy_rules alter column resource drop not null;
alter table public.policy_rules alter column effect set not null;
alter table public.policy_rules alter column risk_level set not null;
alter table public.policy_rules alter column approval_required set not null;
alter table public.policy_rules alter column conditions set not null;
alter table public.policy_rules add constraint policy_rules_risk_level_check check (risk_level in ('low','medium','high','critical'));
alter table public.policy_rules add constraint policy_rules_conditions_object_check check (jsonb_typeof(conditions) = 'object');
create index if not exists policy_rules_policy_id_idx on public.policy_rules (policy_id);
create unique index if not exists policy_rules_policy_order_key on public.policy_rules (policy_id, rule_order);

-- Composite FK targets must exist before the workspace-bearing join table.
create unique index if not exists agents_workspace_id_id_key on public.agents (workspace_id, id);
create unique index if not exists policies_workspace_id_id_key on public.policies (workspace_id, id);

-- A workspace-bearing join table makes tenant isolation explicit and enforceable by composite FKs.
create table if not exists public.agent_policies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null,
  policy_id uuid not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (agent_id, policy_id),
  unique (workspace_id, agent_id, policy_id),
  foreign key (workspace_id, agent_id) references public.agents(workspace_id, id) on delete cascade,
  foreign key (workspace_id, policy_id) references public.policies(workspace_id, id) on delete cascade
);
create index if not exists agent_policies_workspace_id_idx on public.agent_policies (workspace_id);
create index if not exists agent_policies_agent_id_idx on public.agent_policies (agent_id);
create index if not exists agent_policies_policy_id_idx on public.agent_policies (policy_id);

create or replace function public.policy_role_can_manage(p_workspace_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select public.is_workspace_admin(p_workspace_id)
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('security','developer')
    );
$$;

create or replace function public.policy_role_can_delete(p_workspace_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$ select public.is_workspace_admin(p_workspace_id); $$;

-- Keep legacy enabled synchronized for existing consumers.
create or replace function public.sync_policy_enabled()
returns trigger language plpgsql set search_path = public as $$
begin
  new.enabled := new.status = 'active';
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists policies_sync_enabled on public.policies;
create trigger policies_sync_enabled before insert or update on public.policies for each row execute function public.sync_policy_enabled();

create or replace function public.bump_policy_version_on_rule_change()
returns trigger language plpgsql set search_path = public as $$
declare policy_id_value uuid;
begin
  policy_id_value := coalesce(new.policy_id, old.policy_id);
  update public.policies set version = version + 1, updated_at = now() where id = policy_id_value;
  return coalesce(new, old);
end;
$$;
drop trigger if exists policy_rules_bump_version on public.policy_rules;
create trigger policy_rules_bump_version after insert or update or delete on public.policy_rules for each row execute function public.bump_policy_version_on_rule_change();

-- Replace legacy policies with the Step 3 role matrix.
alter table public.policies enable row level security;
alter table public.policy_rules enable row level security;
alter table public.agent_policies enable row level security;

drop policy if exists policies_member_select on public.policies;
drop policy if exists policies_member_write on public.policies;
drop policy if exists policies_select on public.policies;
drop policy if exists policies_insert on public.policies;
drop policy if exists policies_update on public.policies;
drop policy if exists policies_delete on public.policies;
create policy policies_select on public.policies for select to authenticated using (public.is_workspace_member(workspace_id));
create policy policies_insert on public.policies for insert to authenticated with check (public.policy_role_can_manage(workspace_id) and created_by = (select auth.uid()));
create policy policies_update on public.policies for update to authenticated using (public.policy_role_can_manage(workspace_id)) with check (public.policy_role_can_manage(workspace_id));
create policy policies_delete on public.policies for delete to authenticated using (public.policy_role_can_delete(workspace_id));

drop policy if exists policy_rules_member_select on public.policy_rules;
drop policy if exists policy_rules_member_write on public.policy_rules;
drop policy if exists policy_rules_select on public.policy_rules;
drop policy if exists policy_rules_insert on public.policy_rules;
drop policy if exists policy_rules_update on public.policy_rules;
drop policy if exists policy_rules_delete on public.policy_rules;
create policy policy_rules_select on public.policy_rules for select to authenticated using (exists (select 1 from public.policies p where p.id = policy_id and public.is_workspace_member(p.workspace_id)));
create policy policy_rules_insert on public.policy_rules for insert to authenticated with check (exists (select 1 from public.policies p where p.id = policy_id and public.policy_role_can_manage(p.workspace_id)));
create policy policy_rules_update on public.policy_rules for update to authenticated using (exists (select 1 from public.policies p where p.id = policy_id and public.policy_role_can_manage(p.workspace_id))) with check (exists (select 1 from public.policies p where p.id = policy_id and public.policy_role_can_manage(p.workspace_id)));
create policy policy_rules_delete on public.policy_rules for delete to authenticated using (exists (select 1 from public.policies p where p.id = policy_id and public.policy_role_can_manage(p.workspace_id)));

drop policy if exists agent_policies_select on public.agent_policies;
drop policy if exists agent_policies_insert on public.agent_policies;
drop policy if exists agent_policies_delete on public.agent_policies;
create policy agent_policies_select on public.agent_policies for select to authenticated using (public.is_workspace_member(workspace_id));
create policy agent_policies_insert on public.agent_policies for insert to authenticated with check (public.policy_role_can_manage(workspace_id) and assigned_by = (select auth.uid()));
create policy agent_policies_delete on public.agent_policies for delete to authenticated using (public.policy_role_can_manage(workspace_id));

-- Atomic create: the policy and all supplied rules commit together.
create or replace function public.create_policy_with_rules(
  p_name text,
  p_description text default null,
  p_status text default 'draft',
  p_rules jsonb default '[]'::jsonb
)
returns public.policies
language plpgsql security invoker set search_path = public
as $$
declare actor_id uuid := auth.uid(); workspace_id_value uuid; policy_row public.policies; rule_json jsonb; idx integer := 0; candidate_slug text; suffix integer := 1;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select wm.workspace_id into workspace_id_value from public.workspace_members wm where wm.user_id = actor_id order by wm.created_at limit 1;
  if workspace_id_value is null or not public.policy_role_can_manage(workspace_id_value) then raise exception 'You are not authorized to create policies'; end if;
  if trim(coalesce(p_name,'')) = '' then raise exception 'Policy name is required'; end if;
  if p_status not in ('active','disabled','draft') then raise exception 'Invalid policy status'; end if;
  if jsonb_typeof(p_rules) <> 'array' then raise exception 'Rules must be an array'; end if;
  candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if candidate_slug = '' then raise exception 'Policy name is required'; end if;
  while exists (select 1 from public.policies where workspace_id = workspace_id_value and slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')) || '-' || suffix::text;
  end loop;
  insert into public.policies (workspace_id, name, slug, description, status, enabled, version, is_default, created_by)
  values (workspace_id_value, trim(p_name), candidate_slug, nullif(trim(p_description),''), p_status, p_status = 'active', 1, false, actor_id)
  returning * into policy_row;
  for rule_json in select value from jsonb_array_elements(p_rules) loop
    idx := idx + 1;
    if coalesce(trim(rule_json->>'name'),'') = '' or coalesce(trim(rule_json->>'action'),'') = '' then raise exception 'Rule name and action are required'; end if;
    if coalesce(rule_json->>'effect','deny') not in ('allow','deny') then raise exception 'Invalid rule effect'; end if;
    if coalesce(rule_json->>'risk_level','medium') not in ('low','medium','high','critical') then raise exception 'Invalid rule risk level'; end if;
    insert into public.policy_rules (policy_id, rule_order, name, description, action, resource, effect, risk_level, approval_required, conditions, permission, risk_threshold, requires_approval)
    values (policy_row.id, idx, trim(rule_json->>'name'), nullif(trim(rule_json->>'description'),''), trim(rule_json->>'action'), nullif(trim(rule_json->>'resource'),''), coalesce(rule_json->>'effect','deny'), coalesce(rule_json->>'risk_level','medium'), coalesce((rule_json->>'approval_required')::boolean,false), coalesce(rule_json->'conditions','{}'::jsonb), 'read', coalesce(rule_json->>'risk_level','medium')::risk_level, coalesce((rule_json->>'approval_required')::boolean,false));
  end loop;
  return policy_row;
end;
$$;

create or replace function public.assign_policy_to_agent(p_agent_id uuid, p_policy_id uuid)
returns public.agent_policies
language plpgsql security invoker set search_path = public
as $$
declare actor_id uuid := auth.uid(); ws uuid; result public.agent_policies;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select a.workspace_id into ws from public.agents a where a.id = p_agent_id;
  if ws is null or not exists (select 1 from public.policies p where p.id=p_policy_id and p.workspace_id=ws) then raise exception 'Agent and policy must belong to the same workspace'; end if;
  if not public.policy_role_can_manage(ws) then raise exception 'You are not authorized to assign policies'; end if;
  insert into public.agent_policies(workspace_id,agent_id,policy_id,assigned_by) values(ws,p_agent_id,p_policy_id,actor_id) on conflict (agent_id,policy_id) do nothing returning * into result;
  if result.agent_id is null then select * into result from public.agent_policies where agent_id=p_agent_id and policy_id=p_policy_id; end if;
  return result;
end;
$$;

create or replace function public.delete_policy_safely(p_policy_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare ws uuid; assigned_count integer;
begin
  select workspace_id into ws from public.policies where id=p_policy_id;
  if ws is null then raise exception 'Policy not found'; end if;
  if not public.policy_role_can_delete(ws) then raise exception 'You are not authorized to delete policies'; end if;
  select count(*) into assigned_count from public.agent_policies where policy_id=p_policy_id;
  if assigned_count > 0 then raise exception 'Remove all Agent assignments before deleting this policy'; end if;
  delete from public.policies where id=p_policy_id;
end;
$$;

commit;
