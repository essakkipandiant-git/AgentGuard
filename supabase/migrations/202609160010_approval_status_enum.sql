-- Approval status enum prerequisite; enum additions must commit before table constraints.
begin;
alter type public.approval_status add value if not exists 'denied';
alter type public.approval_status add value if not exists 'cancelled';
commit;
