-- Remove legacy approval policies superseded by Step 4 role-aware RLS.
begin;
drop policy if exists approvals_admin_update on public.approval_requests;
drop policy if exists approvals_member_access on public.approval_requests;
commit;
