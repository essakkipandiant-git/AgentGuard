-- Explicitly qualify approval workspace references in INSERT RLS.
begin;
drop policy if exists approvals_insert on public.approval_requests;
create policy approvals_insert on public.approval_requests for insert to authenticated
with check (
  public.is_workspace_member(approval_requests.workspace_id)
  and approval_requests.requested_by = (select auth.uid())
  and exists (select 1 from public.agents a where a.id=approval_requests.agent_id and a.workspace_id=approval_requests.workspace_id)
  and (approval_requests.policy_id is null or exists (select 1 from public.policies p where p.id=approval_requests.policy_id and p.workspace_id=approval_requests.workspace_id))
);
commit;
