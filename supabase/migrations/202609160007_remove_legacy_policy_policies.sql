-- Remove legacy Policies/Rules policies that bypass the Step 3 role matrix.
begin;
drop policy if exists policies_admin_delete on public.policies;
drop policy if exists policies_admin_update on public.policies;
drop policy if exists policies_member_access on public.policies;
drop policy if exists rules_workspace_access on public.policy_rules;
commit;
