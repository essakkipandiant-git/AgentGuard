import { createClient, type Session, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
}) : null;

export type AuthResult = { user: User | null; session: Session | null };

export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const rawMsg = (error as { message?: string })?.message || String(error);
  const msg = rawMsg.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (msg.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments and try again.';
  }
  if (msg.includes('oauth') || msg.includes('google') || msg.includes('provider is not enabled')) {
    return 'Google sign-in could not be completed. Please ensure Google OAuth is configured in Supabase.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Authentication service is temporarily unavailable. Please check your connection and try again.';
  }
  return rawMsg;
}

export const agentGuardAuth = {
  formatAuthError,
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(formatAuthError(error));
    return data;
  },
  async signUp(fullName: string, email: string, password: string, company: string): Promise<AuthResult> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(formatAuthError(error));
    return data;
  },
  async signInWithGoogle(): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw new Error(formatAuthError(error));
    if (data?.url) {
      window.location.href = data.url;
    }
  },
  async resetPassword(email: string): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(formatAuthError(error));
  },
  async signOut(): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(formatAuthError(error));
  },
  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Session retrieval error:', error);
      return null;
    }
    return data.session;
  },
  async getWorkspaceData() {
    if (!supabase) throw new Error('Authentication is not configured.');
    const session = await this.getSession();
    if (!session?.user) return { workspaceId: null, workspaceName: null, agents: [], policies: [], approvals: [], auditLogs: [], activity: [] };
    
    // Fetch membership and workspace
    const membership = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();
      
    if (membership.error) throw new Error(formatAuthError(membership.error));
    const workspaceId = membership.data?.workspace_id ?? null;
    if (!workspaceId) return { workspaceId: null, workspaceName: null, agents: [], policies: [], approvals: [], auditLogs: [], activity: [] };

    const workspaceRes = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .maybeSingle();

    const [agents, policies, approvals, auditLogs, activity] = await Promise.all([
      supabase.from('agents').select('id,name,status,risk_level,model,description,created_at,updated_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
      supabase.from('policies').select('id,name,description,enabled,created_at,updated_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
      supabase.from('approval_requests').select('id,requested_action,requested_resource,risk_level,status,requested_amount,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
      supabase.from('audit_logs').select('id,action,resource,result,risk_level,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
      supabase.from('activity_events').select('id,action,tool,policy_decision,risk_level,status,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
    ]);
    const firstError = [agents, policies, approvals, auditLogs, activity].find(result => result.error)?.error;
    if (firstError) throw new Error(formatAuthError(firstError));
    return {
      workspaceId,
      workspaceName: workspaceRes.data?.name || 'My Workspace',
      agents: agents.data ?? [],
      policies: policies.data ?? [],
      approvals: approvals.data ?? [],
      auditLogs: auditLogs.data ?? [],
      activity: activity.data ?? [],
    };
  },
  async createAgent(input: { name: string; description?: string; model?: string }) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const data = await this.getWorkspaceData();
    if (!data.workspaceId) throw new Error('No workspace is available for this account.');
    const session = await this.getSession();
    const { data: agent, error } = await supabase.from('agents').insert({ workspace_id: data.workspaceId, owner_id: session?.user.id, name: input.name, description: input.description || null, model: input.model || null }).select().single();
    if (error) throw new Error(formatAuthError(error));
    await supabase.from('audit_logs').insert({ workspace_id: data.workspaceId, actor_id: session?.user.id, agent_id: agent.id, action: 'agent_created', resource: agent.name, result: 'allowed' });
    return agent;
  },
  async createPolicy(input: { name: string; description?: string }) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const data = await this.getWorkspaceData();
    if (!data.workspaceId) throw new Error('No workspace is available for this account.');
    const session = await this.getSession();
    const { data: policy, error } = await supabase.from('policies').insert({ workspace_id: data.workspaceId, created_by: session?.user.id, name: input.name, description: input.description || null }).select().single();
    if (error) throw new Error(formatAuthError(error));
    await supabase.from('audit_logs').insert({ workspace_id: data.workspaceId, actor_id: session?.user.id, action: 'policy_created', resource: policy.name, result: 'allowed' });
    return policy;
  },
  async decideApproval(id: string, status: 'approved' | 'rejected') {
    if (!supabase) throw new Error('Authentication is not configured.');
    const data = await this.getWorkspaceData();
    const session = await this.getSession();
    const { data: approval, error } = await supabase.from('approval_requests').update({ status, approver_id: session?.user.id, decision: status }).eq('id', id).select().single();
    if (error) throw new Error(formatAuthError(error));
    if (data.workspaceId) await supabase.from('audit_logs').insert({ workspace_id: data.workspaceId, actor_id: session?.user.id, action: `approval_${status}`, resource: approval.requested_resource, result: status });
    return approval;
  },
};

const initializeAuth = () => {
  if (!supabase) return;

  // Handle OAuth Callback Route (/auth/callback)
  if (window.location.pathname === '/auth/callback') {
    document.body.innerHTML = `
      <main class="signin-tab" style="display:grid;min-height:100vh;place-items:center;background:#090b0e">
        <section class="signin-panel" style="text-align:center;max-width:440px">
          <div class="signin-brand" style="justify-content:center"><img src="/assets/logo.webp" alt="AgentGuard" width="48" height="48" /><span>AGENTGUARD<small>CONTROL PLANE ACCESS</small></span></div>
          <div class="signin-kicker" style="margin-top:20px">AUTHENTICATION / SECURE OAUTH HANDSHAKE</div>
          <h2 style="font-size:24px;margin:12px 0">Establishing session...</h2>
          <p class="signin-intro" id="oauth-status">Verifying cryptographic tokens with Supabase...</p>
          <div class="signin-status" style="justify-content:center;margin-top:20px"><i class="fa-solid fa-spinner fa-spin"></i> SECURE SESSION EXCHANGE IN PROGRESS</div>
        </section>
      </main>
    `;

    // Process hash or code
    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          const desc = params.get('error_description') || 'Google sign-in failed.';
          window.location.replace(`/?signin=1&error=${encodeURIComponent(desc)}`);
          return;
        }

        // Wait for session to be established by Supabase client
        let session = (await supabase!.auth.getSession()).data.session;
        if (!session) {
          // Allow up to 3 seconds for session exchange
          await new Promise<void>((resolve) => {
            const { data: sub } = supabase!.auth.onAuthStateChange((_event, newSession) => {
              if (newSession) {
                session = newSession;
                sub.subscription.unsubscribe();
                resolve();
              }
            });
            setTimeout(() => {
              sub.subscription.unsubscribe();
              resolve();
            }, 3000);
          });
        }

        if (session) {
          const statusEl = document.querySelector('#oauth-status');
          if (statusEl) statusEl.textContent = 'Session verified. Redirecting to control plane...';
          setTimeout(() => window.location.replace('/dashboard'), 400);
        } else {
          window.location.replace('/?signin=1&error=oauth_failed');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        window.location.replace('/?signin=1&error=oauth_failed');
      }
    };

    handleCallback();
    return;
  }

  // Handle Password Reset Route (/reset-password)
  if (window.location.pathname === '/reset-password') {
    document.body.innerHTML = `
      <main class="signin-tab" style="display:grid;min-height:100vh;place-items:center;background:#090b0e">
        <section class="signin-panel">
          <div class="signin-brand"><img src="/assets/logo.webp" alt="AgentGuard mark" width="42" height="42" /><span>AGENTGUARD<small>CONTROL PLANE ACCESS</small></span></div>
          <div class="signin-kicker">AUTHENTICATION / PASSWORD RESET</div>
          <h2>Set a new<br><em>password.</em></h2>
          <p class="signin-intro">Choose a new password for your AgentGuard control plane.</p>
          <form class="signin-form" id="reset-password-form">
            <label>NEW PASSWORD<input name="password" type="password" minlength="6" required placeholder="At least 6 characters" autocomplete="new-password"></label>
            <p class="signin-error" id="reset-password-error" hidden></p>
            <button class="signin-submit" type="submit">Update password <i class="fa-solid fa-arrow-right"></i></button>
          </form>
          <div class="signin-status"><i></i> SECURE AUTHENTICATION / SESSION ENCRYPTED</div>
        </section>
      </main>
    `;
    document.querySelector('#reset-password-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const errorEl = document.querySelector('#reset-password-error') as HTMLElement;
      const button = form.querySelector('button') as HTMLButtonElement;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      button.disabled = true;
      button.textContent = 'UPDATING...';
      const { error: updateError } = await supabase!.auth.updateUser({ password });
      if (updateError) {
        errorEl.textContent = formatAuthError(updateError);
        errorEl.hidden = false;
        button.disabled = false;
        button.textContent = 'Update password';
        return;
      }
      button.textContent = 'PASSWORD UPDATED';
      setTimeout(() => window.location.replace('/dashboard'), 700);
    });
    return;
  }

  const isProtectedRoute = (path: string) =>
    ['/dashboard', '/app', '/agents', '/policies', '/activity', '/security'].some(
      p => path === p || path.startsWith(`${p}/`)
    );

  supabase.auth.onAuthStateChange((_event, session) => {
    window.dispatchEvent(new CustomEvent('agentguard:auth-state', { detail: session }));
    if (isProtectedRoute(window.location.pathname) && !session) {
      window.location.replace('/?signin=1');
    }
  });

  agentGuardAuth.getSession().then(session => {
    window.dispatchEvent(new CustomEvent('agentguard:auth-state', { detail: session }));
    if (isProtectedRoute(window.location.pathname) && !session) {
      window.location.replace('/?signin=1');
    }
  });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeAuth, { once: true });
} else {
  initializeAuth();
}

(window as unknown as { AgentGuardAuth?: typeof agentGuardAuth }).AgentGuardAuth = agentGuardAuth;

