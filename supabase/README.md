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
