-- AgentGuard Step 2 prerequisite: extend the existing status enum.
-- PostgreSQL requires enum additions to commit before they are used by later DDL.

alter type public.agent_status add value if not exists 'paused';
alter type public.agent_status add value if not exists 'disabled';
