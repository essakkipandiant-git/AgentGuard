# AgentGuard Supabase foundation

This directory contains the Step 1 backend foundation for AgentGuard. The migration establishes the tenant boundary used by future modules; it does not implement agents, policies, approvals, activity, audit, integrations, secrets, API access, security posture, team, settings, or overview statistics.

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per authenticated Supabase user. The primary key is the `auth.users.id`; credentials remain in `auth.users`. |
| `workspaces` | Company/customer tenant. Each row has a UUID, display name, unique slug, owner, and timestamps. |
| `workspace_members` | Membership and role join table. Its composite primary key prevents duplicate memberships. |

New signups are provisioned by the `auth.users` `on_auth_user_created` trigger. The `public.handle_new_user()` security-definer function creates or updates the profile, creates the initial workspace using the signup `company` metadata or `Personal workspace`, and adds the user as `owner`.

## Roles

The role enum preserves existing values (`owner`, `admin`, `member`, `viewer`) and adds `security` and `developer` for the later authorization model.

## RLS

- Profiles can be selected or updated only by the matching `auth.uid()`.
- Workspaces can be selected only by members; only the workspace owner can update workspace metadata.
- Workspace members can be selected only by members; membership writes require workspace owner/admin membership.
- The membership checks run through `SECURITY DEFINER` helper functions with a fixed `search_path`, preventing frontend-supplied workspace IDs from bypassing tenant isolation.

The migration also adds indexes for profile/user IDs, workspace owner IDs, workspace IDs, member user IDs, and unique workspace slugs.

## Client context

`client/src/workspace-context.ts` provides `getWorkspaceContext()` and `onWorkspaceContextChange()`. It resolves the authenticated user, first workspace membership, workspace, and role using the existing Supabase client. It is client-safe and uses only the publishable key already configured for the frontend.

## Applying the migration

The migration file is `migrations/202609160001_agentguard_backend_foundation.sql`. It has been applied to Supabase project `irjwyxdlzbuuexftwuob`. For another environment, apply it through Supabase migrations tooling rather than manually editing tables.

No new environment variables are required. The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` remain the only browser-side Supabase settings, and no service-role key is used in client code.

## Step 2: Agents

The Step 2 migrations extend the existing `agents` table with `slug`, `agent_type`, `provider`, `environment`, `version`, `endpoint_url`, `last_seen_at`, and `created_by`. Existing `owner_id`, `risk_level`, and future-module foreign keys are preserved for compatibility. No provider credentials, passwords, or secrets are stored.

Agent statuses are `active`, `paused`, and `disabled` (the legacy `archived` enum value is preserved for compatibility). Slugs are generated in the database and are unique within a workspace. The `create_agent_with_slug()` function derives the authenticated actor from `auth.uid()`, generates collision-safe slugs, and inserts the Agent into the caller's workspace.

Agent RLS permissions are:

| Role | Read | Create | Update | Status | Delete |
| --- | --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Yes | Yes |
| admin | Yes | Yes | Yes | Yes | Yes |
| developer | Yes | Yes | Yes | Yes | No |
| security | Yes | No | No | No | No |
| member | Yes | No | No | No | No |
| viewer | Yes | No | No | No | No |

RLS always remains the final boundary. Agent workspace and creator fields are immutable on update, preventing a client from moving an Agent across tenants. Search queries are issued to Supabase using case-insensitive filters on name, slug, type, and provider; another workspace's rows are never loaded for client-side filtering.

The frontend service methods are exposed by the existing `AgentGuardAuth` object: `getAgents`, `createAgent`, `updateAgent`, `updateAgentStatus`, and `deleteAgent`. The existing Agents table, registration flow, detail drawer, edit modal, status actions, confirmation, loading/error feedback, and server-side search now use those methods without changing the page's visual system.

## Step 3: Policies, Policy Rules, and Agent Assignments

Migration `202609160006_policies_rules_assignments.sql` migrates the existing compatible `policies` and `policy_rules` tables in place and adds the workspace-safe `agent_policies` join table. Policies have stable workspace-local slugs, `active`/`disabled`/`draft` status, a reliable integer version, optional default marking, and authenticated `created_by` ownership. Legacy `enabled`, `permission`, `risk_threshold`, and `requires_approval` columns remain synchronized for compatibility with the existing foundation.

`policy_rules` now stores deterministic `rule_order`, name, description, action, optional resource, `allow`/`deny` effect, low/medium/high/critical risk, approval requirement, and object-shaped JSONB conditions. Rule insert/update/delete triggers increment the parent policy version and update its timestamp. Rules are never runtime-evaluated in Step 3.

`agent_policies` uses composite workspace foreign keys to ensure the assigned Agent and Policy belong to the same workspace. The `(agent_id, policy_id)` primary key prevents duplicate assignments. A policy cannot be deleted while assigned; the safe delete RPC returns an actionable error instead of silently removing relationships.

| Role | Read policies/rules/assignments | Create/update policies and rules | Assign policies | Delete policies |
| --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Yes |
| admin | Yes | Yes | Yes | Yes |
| security | Yes | Yes | Yes | No |
| developer | Yes | Yes | Yes | No |
| member | Yes | No | No | No |
| viewer | Yes | No | No | No |

The database functions `create_policy_with_rules`, `assign_policy_to_agent`, and `delete_policy_safely` derive authorization from the authenticated session and perform workspace checks server-side. `create_policy_with_rules` creates the policy and supplied rules atomically, generates collision-safe slugs, validates statuses/effects/risks, and rejects malformed conditions. No SDK, evaluator, middleware, action interception, approval enforcement, or runtime policy engine is included.
