-- Remove legacy Agent policies that would bypass the Step 2 role matrix.
begin;
drop policy if exists agents_admin_delete on public.agents;
drop policy if exists agents_member_insert on public.agents;
drop policy if exists agents_member_update on public.agents;
commit;
