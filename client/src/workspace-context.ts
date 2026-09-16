import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase-auth';

export type WorkspaceRole = 'owner' | 'admin' | 'security' | 'developer' | 'member' | 'viewer';

export type WorkspaceContext = {
  user: User;
  session: Session;
  workspace: { id: string; name: string; slug: string } | null;
  membership: { workspace_id: string; user_id: string; role: WorkspaceRole } | null;
  role: WorkspaceRole | null;
};

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const user = session?.user;
  if (!session || !user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id,user_id,role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return { user, session, workspace: null, membership: null, role: null };

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id,name,slug')
    .eq('id', membership.workspace_id)
    .maybeSingle();
  if (workspaceError) throw workspaceError;

  return {
    user,
    session,
    workspace,
    membership: membership as WorkspaceContext['membership'],
    role: membership.role as WorkspaceRole,
  };
}

export function onWorkspaceContextChange(callback: (context: WorkspaceContext | null) => void) {
  if (!supabase) return { unsubscribe: () => undefined };
  let active = true;
  const refresh = () => getWorkspaceContext().then(context => { if (active) callback(context); });
  refresh();
  const { data } = supabase.auth.onAuthStateChange(refresh);
  return {
    unsubscribe: () => { active = false; data.subscription.unsubscribe(); },
  };
}

export const workspaceContext = { get: getWorkspaceContext, subscribe: onWorkspaceContextChange };
