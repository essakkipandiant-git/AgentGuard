-- Keep policies.rules as the canonical future-evaluation configuration snapshot.
begin;
create or replace function public.sync_policy_rules_json()
returns trigger language plpgsql security invoker set search_path = public as $$
declare policy_id_value uuid;
begin
  policy_id_value := coalesce(new.policy_id, old.policy_id);
  update public.policies p
  set rules = jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('name', r.name, 'description', r.description, 'action', r.action, 'resource', r.resource, 'effect', r.effect, 'risk_level', r.risk_level, 'approval_required', r.approval_required, 'conditions', r.conditions) order by r.rule_order) from public.policy_rules r where r.policy_id = policy_id_value), '[]'::jsonb)), updated_at = now()
  where p.id = policy_id_value;
  return coalesce(new, old);
end;
$$;
drop trigger if exists policy_rules_sync_json on public.policy_rules;
create trigger policy_rules_sync_json after insert or update or delete on public.policy_rules for each row execute function public.sync_policy_rules_json();
commit;
