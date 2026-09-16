-- AgentGuard Step 4: real Approvals module.
begin;

alter table public.approval_requests add column if not exists policy_id uuid;
alter table public.approval_requests add column if not exists action text;
alter table public.approval_requests add column if not exists resource text;
alter table public.approval_requests add column if not exists reason text;
alter table public.approval_requests add column if not exists requested_by uuid;
alter table public.approval_requests add column if not exists reviewed_by uuid;
alter table public.approval_requests add column if not exists requested_at timestamptz;
alter table public.approval_requests add column if not exists reviewed_at timestamptz;
alter table public.approval_requests add column if not exists decision_reason text;
alter table public.approval_requests add column if not exists metadata jsonb;
alter table public.approval_requests add column if not exists updated_at timestamptz;

update public.approval_requests set action=coalesce(action,requested_action), resource=coalesce(resource,requested_resource), requested_by=coalesce(requested_by,requester_id), requested_at=coalesce(requested_at,created_at), reason=coalesce(reason,decision), metadata=coalesce(metadata,'{}'::jsonb), updated_at=coalesce(updated_at,created_at) where true;
update public.approval_requests set status='denied'::public.approval_status where status::text='rejected';

alter table public.approval_requests alter column agent_id set not null;
alter table public.approval_requests alter column action set not null;
alter table public.approval_requests alter column requested_at set not null;
alter table public.approval_requests alter column metadata set not null;
alter table public.approval_requests alter column updated_at set not null;
alter table public.approval_requests alter column requested_resource drop not null;
alter table public.approval_requests alter column requested_action set not null;

alter table public.approval_requests add constraint approvals_status_check check(status::text in ('pending','approved','denied','expired','cancelled'));
alter table public.approval_requests add constraint approvals_metadata_object_check check(jsonb_typeof(metadata)='object');
create unique index if not exists approvals_workspace_id_agent_id_key on public.approval_requests(workspace_id,agent_id,id);
create unique index if not exists agents_workspace_id_id_approval_key on public.agents(workspace_id,id);
create unique index if not exists policies_workspace_id_id_approval_key on public.policies(workspace_id,id);
alter table public.approval_requests add constraint approvals_agent_workspace_fk foreign key(workspace_id,agent_id) references public.agents(workspace_id,id) on delete restrict;
alter table public.approval_requests add constraint approvals_policy_workspace_fk foreign key(workspace_id,policy_id) references public.policies(workspace_id,id) on delete set null;
create index if not exists approvals_workspace_created_idx on public.approval_requests(workspace_id,requested_at desc);
create index if not exists approvals_workspace_status_idx on public.approval_requests(workspace_id,status);
create index if not exists approvals_agent_idx on public.approval_requests(agent_id);
create index if not exists approvals_policy_idx on public.approval_requests(policy_id);

create or replace function public.approval_can_review(p_workspace_id uuid)
returns boolean language sql stable security invoker set search_path=public as $$
select exists(select 1 from public.workspace_members wm where wm.workspace_id=p_workspace_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','security'));
$$;

create or replace function public.sync_approval_legacy_columns()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  new.requested_action:=new.action; new.requested_resource:=new.resource; new.requester_id:=new.requested_by; new.approver_id:=new.reviewed_by; new.decision:=new.decision_reason; new.created_at:=coalesce(new.created_at,new.requested_at,now()); new.requested_at:=coalesce(new.requested_at,new.created_at,now()); new.metadata:=coalesce(new.metadata,'{}'::jsonb); new.updated_at:=now(); return new;
end;
$$;
drop trigger if exists approvals_sync_legacy on public.approval_requests;
create trigger approvals_sync_legacy before insert or update on public.approval_requests for each row execute function public.sync_approval_legacy_columns();

create or replace function public.validate_approval_transition()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.workspace_id<>old.workspace_id or new.agent_id<>old.agent_id or coalesce(new.policy_id,'00000000-0000-0000-0000-000000000000')<>coalesce(old.policy_id,'00000000-0000-0000-0000-000000000000') or new.requested_by<>old.requested_by then raise exception 'Approval ownership and references are immutable'; end if;
    if old.status::text<>'pending' and new.status<>old.status then raise exception 'Finalized approvals cannot change status'; end if;
    if old.status::text='pending' and new.status::text not in ('pending','approved','denied','expired','cancelled') then raise exception 'Invalid approval transition'; end if;
    if new.status::text in ('approved','denied') and new.reviewed_by is null then raise exception 'Reviewer is required'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists approvals_validate_transition on public.approval_requests;
create trigger approvals_validate_transition before update on public.approval_requests for each row execute function public.validate_approval_transition();

create or replace function public.create_approval_request(p_agent_id uuid,p_action text,p_resource text default null,p_policy_id uuid default null,p_risk_level public.risk_level default 'medium',p_reason text default null,p_expires_at timestamptz default null,p_metadata jsonb default '{}'::jsonb)
returns public.approval_requests language plpgsql security invoker set search_path=public as $$
declare actor uuid:=auth.uid(); ws uuid; result public.approval_requests;
begin
  if actor is null then raise exception 'Authentication is required'; end if;
  if trim(coalesce(p_action,''))='' then raise exception 'Action is required'; end if;
  if jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))<>'object' then raise exception 'Metadata must be a JSON object'; end if;
  select a.workspace_id into ws from public.agents a where a.id=p_agent_id;
  if ws is null or not public.is_workspace_member(ws) then raise exception 'Agent is not in the current workspace'; end if;
  if p_policy_id is not null and not exists(select 1 from public.policies p where p.id=p_policy_id and p.workspace_id=ws) then raise exception 'Policy is not in the Agent workspace'; end if;
  insert into public.approval_requests(workspace_id,agent_id,policy_id,action,resource,reason,risk_level,status,requested_by,requested_at,expires_at,metadata)
  values(ws,p_agent_id,p_policy_id,trim(p_action),nullif(trim(p_resource),''),nullif(trim(p_reason),''),p_risk_level,'pending',actor,now(),p_expires_at,p_metadata)
  returning * into result;
  return result;
end;
$$;

create or replace function public.review_approval(p_approval_id uuid,p_status text,p_reason text default null)
returns public.approval_requests language plpgsql security invoker set search_path=public as $$
declare actor uuid:=auth.uid(); current_row public.approval_requests; result public.approval_requests;
begin
  if actor is null then raise exception 'Authentication is required'; end if;
  if p_status not in ('approved','denied') then raise exception 'Review status must be approved or denied'; end if;
  select * into current_row from public.approval_requests where id=p_approval_id;
  if current_row.id is null then raise exception 'Approval not found'; end if;
  if not public.approval_can_review(current_row.workspace_id) then raise exception 'You are not authorized to review approvals'; end if;
  if current_row.requested_by=actor then raise exception 'Separation of duties prevents self-approval'; end if;
  if current_row.status::text<>'pending' then raise exception 'Only pending approvals can be reviewed'; end if;
  if current_row.expires_at is not null and current_row.expires_at<=now() then update public.approval_requests set status='expired' where id=p_approval_id; raise exception 'Approval has expired'; end if;
  update public.approval_requests set status=p_status::public.approval_status, reviewed_by=actor, reviewed_at=now(), decision_reason=nullif(trim(p_reason),''), updated_at=now() where id=p_approval_id and status::text='pending' returning * into result;
  if result.id is null then raise exception 'Approval was already finalized'; end if;
  return result;
end;
$$;

create or replace function public.expire_my_workspace_approvals()
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.approval_requests ar set status='expired', updated_at=now() where ar.status::text='pending' and ar.expires_at is not null and ar.expires_at<=now() and exists(select 1 from public.workspace_members wm where wm.workspace_id=ar.workspace_id and wm.user_id=(select auth.uid()));
end;
$$;
revoke all on function public.expire_my_workspace_approvals() from public;
grant execute on function public.expire_my_workspace_approvals() to authenticated;

alter table public.approval_requests enable row level security;
drop policy if exists approvals_member_select on public.approval_requests;
drop policy if exists approvals_member_insert on public.approval_requests;
drop policy if exists approvals_reviewer_update on public.approval_requests;
drop policy if exists approvals_admin_delete on public.approval_requests;
drop policy if exists approvals_select on public.approval_requests;
drop policy if exists approvals_insert on public.approval_requests;
drop policy if exists approvals_update on public.approval_requests;
create policy approvals_select on public.approval_requests for select to authenticated using(public.is_workspace_member(workspace_id));
create policy approvals_insert on public.approval_requests for insert to authenticated with check(public.is_workspace_member(workspace_id) and requested_by=(select auth.uid()) and exists(select 1 from public.agents a where a.id=agent_id and a.workspace_id=workspace_id) and (policy_id is null or exists(select 1 from public.policies p where p.id=policy_id and p.workspace_id=workspace_id)));
create policy approvals_update on public.approval_requests for update to authenticated using(public.approval_can_review(workspace_id) or requested_by=(select auth.uid())) with check(public.approval_can_review(workspace_id) or requested_by=(select auth.uid()));

commit;
