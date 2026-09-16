-- AgentGuard Step 3 hardening: policy type/configuration and immutable tenancy.
begin;

-- Controlled taxonomy discovered from the existing Policy UI/brief.
do $$ begin
  create type public.policy_type as enum ('access','execution','data','tool','security');
exception when duplicate_object then null;
end $$;

alter table public.policies add column if not exists policy_type public.policy_type;
alter table public.policies add column if not exists rules jsonb;
update public.policies set policy_type = 'access'::public.policy_type where policy_type is null;
update public.policies set rules = '{}'::jsonb where rules is null;
alter table public.policies alter column policy_type set default 'access'::public.policy_type;
alter table public.policies alter column policy_type set not null;
alter table public.policies alter column rules set default '{}'::jsonb;
alter table public.policies alter column rules set not null;
alter table public.policies add constraint policies_rules_object_check check (jsonb_typeof(rules) = 'object');

-- Step 3 status is active/disabled; preserve existing rows by mapping draft to disabled.
update public.policies set status = 'disabled' where status = 'draft';
alter table public.policies drop constraint if exists policies_status_check;
alter table public.policies add constraint policies_status_check check (status in ('active','disabled'));

create or replace function public.prepare_policy_row()
returns trigger language plpgsql security invoker set search_path = public as $$
declare base_slug text; candidate_slug text; suffix integer := 1;
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    if new.created_by is null then raise exception 'Authentication is required'; end if;
    if new.workspace_id is null or not public.is_workspace_member(new.workspace_id) then raise exception 'Invalid workspace'; end if;
    base_slug := trim(both '-' from regexp_replace(lower(trim(new.name)), '[^a-z0-9]+', '-', 'g'));
    if base_slug = '' then raise exception 'Policy name is required'; end if;
    candidate_slug := base_slug;
    while exists (select 1 from public.policies where workspace_id = new.workspace_id and slug = candidate_slug) loop
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix::text;
    end loop;
    new.slug := candidate_slug;
    new.rules := coalesce(new.rules, '{}'::jsonb);
    new.policy_type := coalesce(new.policy_type, 'access'::public.policy_type);
    new.version := coalesce(new.version, 1);
  else
    if new.workspace_id <> old.workspace_id then raise exception 'Policy workspace cannot be changed'; end if;
    if new.created_by <> old.created_by then raise exception 'Policy creator cannot be changed'; end if;
    if new.slug <> old.slug then raise exception 'Policy slug cannot be changed'; end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists policies_prepare_row on public.policies;
create trigger policies_prepare_row before insert or update on public.policies for each row execute function public.prepare_policy_row();

-- Recreate the atomic create RPC with the controlled type and configuration JSONB.
drop function if exists public.create_policy_with_rules(text, text, text, jsonb);
create or replace function public.create_policy_with_rules(
  p_name text,
  p_description text default null,
  p_policy_type text default 'access',
  p_status text default 'disabled',
  p_rules jsonb default '{}'::jsonb
)
returns public.policies
language plpgsql security invoker set search_path = public
as $$
declare actor_id uuid := auth.uid(); workspace_id_value uuid; policy_row public.policies; rule_json jsonb; idx integer := 0;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select wm.workspace_id into workspace_id_value from public.workspace_members wm where wm.user_id = actor_id order by wm.created_at limit 1;
  if workspace_id_value is null or not public.policy_role_can_manage(workspace_id_value) then raise exception 'You are not authorized to create policies'; end if;
  if trim(coalesce(p_name,'')) = '' then raise exception 'Policy name is required'; end if;
  if p_policy_type not in ('access','execution','data','tool','security') then raise exception 'Invalid policy type'; end if;
  if p_status not in ('active','disabled') then raise exception 'Invalid policy status'; end if;
  if jsonb_typeof(p_rules) not in ('object','array') then raise exception 'Rules must be a JSON object or array'; end if;
  insert into public.policies (workspace_id, name, description, policy_type, status, enabled, version, is_default, created_by, rules)
  values (workspace_id_value, trim(p_name), nullif(trim(p_description),''), p_policy_type::public.policy_type, p_status, p_status = 'active', 1, false, actor_id, case when jsonb_typeof(p_rules) = 'object' then p_rules else jsonb_build_object('items', p_rules) end)
  returning * into policy_row;
  if jsonb_typeof(p_rules) = 'array' then
    for rule_json in select value from jsonb_array_elements(p_rules) loop
      idx := idx + 1;
      if coalesce(trim(rule_json->>'name'),'') = '' or coalesce(trim(rule_json->>'action'),'') = '' then raise exception 'Rule name and action are required'; end if;
      if coalesce(rule_json->>'effect','deny') not in ('allow','deny') then raise exception 'Invalid rule effect'; end if;
      if coalesce(rule_json->>'risk_level','medium') not in ('low','medium','high','critical') then raise exception 'Invalid rule risk level'; end if;
      insert into public.policy_rules (policy_id, rule_order, name, description, action, resource, effect, risk_level, approval_required, conditions, permission, risk_threshold, requires_approval)
      values (policy_row.id, idx, trim(rule_json->>'name'), nullif(trim(rule_json->>'description'),''), trim(rule_json->>'action'), nullif(trim(rule_json->>'resource'),''), coalesce(rule_json->>'effect','deny'), coalesce(rule_json->>'risk_level','medium'), coalesce((rule_json->>'approval_required')::boolean,false), coalesce(rule_json->'conditions','{}'::jsonb), 'read', coalesce(rule_json->>'risk_level','medium')::risk_level, coalesce((rule_json->>'approval_required')::boolean,false));
    end loop;
  end if;
  return policy_row;
end;
$$;

commit;
