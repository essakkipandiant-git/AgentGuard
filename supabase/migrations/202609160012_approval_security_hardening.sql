-- Step 4 approval security hardening.
begin;
create or replace function public.validate_approval_transition()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.workspace_id is distinct from old.workspace_id or new.agent_id is distinct from old.agent_id or new.policy_id is distinct from old.policy_id or new.requested_by is distinct from old.requested_by then raise exception 'Approval ownership and references are immutable'; end if;
    if old.status::text <> 'pending' and new.status <> old.status then raise exception 'Finalized approvals cannot change status'; end if;
    if old.status::text = 'pending' and new.status::text not in ('pending','approved','denied','expired','cancelled') then raise exception 'Invalid approval transition'; end if;
    if new.status::text in ('approved','denied') then
      if new.reviewed_by is null or new.reviewed_by is distinct from (select auth.uid()) or new.reviewed_at is null then raise exception 'Reviewer metadata must come from auth.uid()'; end if;
    end if;
  end if;
  return new;
end;
$$;
drop policy if exists approvals_update on public.approval_requests;
create policy approvals_update on public.approval_requests for update to authenticated using(public.approval_can_review(workspace_id)) with check(public.approval_can_review(workspace_id));
commit;
