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

export type AgentStatus = 'active' | 'paused' | 'disabled';
export type AgentType = 'Research' | 'Finance' | 'Support' | 'Coding' | 'Operations' | 'Custom';
export type AgentProvider = 'OpenAI' | 'Anthropic' | 'Google' | 'Custom';
export type AgentEnvironment = 'Development' | 'Staging' | 'Production';
export type PolicyStatus = 'active' | 'disabled';
export type PolicyType = 'access' | 'execution' | 'data' | 'tool' | 'security';
export type PolicyEffect = 'allow' | 'deny';
export type PolicyRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PolicyRuleInput = {
  name: string;
  description?: string;
  action: string;
  resource?: string;
  effect: PolicyEffect;
  riskLevel: PolicyRiskLevel;
  approvalRequired?: boolean;
  conditions?: Record<string, unknown>;
};
export type PolicyRuleRecord = {
  id: string;
  policy_id: string;
  rule_order: number;
  name: string;
  description: string | null;
  action: string;
  resource: string | null;
  effect: PolicyEffect;
  risk_level: PolicyRiskLevel;
  approval_required: boolean;
  conditions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
export type PolicyRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  policy_type: PolicyType;
  description: string | null;
  status: PolicyStatus;
  rules: Record<string, unknown>;
  version: number;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  agent_count: number;
  rule_count: number;
};
export type AgentRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  agent_type: AgentType | null;
  provider: AgentProvider | null;
  environment: AgentEnvironment | null;
  version: string | null;
  endpoint_url: string | null;
  status: AgentStatus;
  last_seen_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

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
      supabase.from('agents').select('id,workspace_id,name,slug,status,description,agent_type,provider,environment,version,endpoint_url,last_seen_at,created_by,created_at,updated_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
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
  async getAgents(search = ''): Promise<AgentRecord[]> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const data = await this.getWorkspaceData();
    if (!data.workspaceId) return [];
    let query = supabase.from('agents').select('id,workspace_id,name,slug,status,description,agent_type,provider,environment,version,endpoint_url,last_seen_at,created_by,created_at,updated_at').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }).limit(100);
    const term = search.trim();
    if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,agent_type.ilike.%${term}%,provider.ilike.%${term}%`);
    const { data: agents, error } = await query;
    if (error) throw new Error(formatAuthError(error));
    return (agents || []) as AgentRecord[];
  },
  async createAgent(input: { name: string; agentType: AgentType; provider: AgentProvider; environment: AgentEnvironment; description?: string; version?: string; endpointUrl?: string }) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const data = await this.getWorkspaceData();
    const session = await this.getSession();
    if (!data.workspaceId || !session?.user) throw new Error('No workspace is available for this account.');
    const name = input.name.trim();
    if (!name) throw new Error('Agent name is required.');
    const { data: agent, error } = await supabase.rpc('create_agent_with_slug', {
      p_workspace_id: data.workspaceId,
      p_created_by: session.user.id,
      p_name: name,
      p_agent_type: input.agentType,
      p_provider: input.provider,
      p_environment: input.environment,
      p_description: input.description?.trim() || null,
      p_version: input.version?.trim() || null,
      p_endpoint_url: input.endpointUrl?.trim() || null,
    });
    if (error) throw new Error(formatAuthError(error));
    return agent as AgentRecord;
  },
  async updateAgent(id: string, input: Partial<{ name: string; agentType: AgentType; provider: AgentProvider; environment: AgentEnvironment; description: string; version: string; endpointUrl: string }>): Promise<AgentRecord> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const payload: Record<string, string | null> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.agentType !== undefined) payload.agent_type = input.agentType;
    if (input.provider !== undefined) payload.provider = input.provider;
    if (input.environment !== undefined) payload.environment = input.environment;
    if (input.description !== undefined) payload.description = input.description.trim() || null;
    if (input.version !== undefined) payload.version = input.version.trim() || null;
    if (input.endpointUrl !== undefined) payload.endpoint_url = input.endpointUrl.trim() || null;
    const { data: agent, error } = await supabase.from('agents').update(payload).eq('id', id).select('id,workspace_id,name,slug,status,description,agent_type,provider,environment,version,endpoint_url,last_seen_at,created_by,created_at,updated_at').single();
    if (error) throw new Error(formatAuthError(error));
    return agent as AgentRecord;
  },
  async updateAgentStatus(id: string, status: AgentStatus): Promise<AgentRecord> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data: agent, error } = await supabase.from('agents').update({ status }).eq('id', id).select('id,workspace_id,name,slug,status,description,agent_type,provider,environment,version,endpoint_url,last_seen_at,created_by,created_at,updated_at').single();
    if (error) throw new Error(formatAuthError(error));
    return agent as AgentRecord;
  },
  async deleteAgent(id: string): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw new Error(formatAuthError(error));
  },
  async getPolicies(search = ''): Promise<PolicyRecord[]> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const workspace = await this.getWorkspaceData();
    if (!workspace.workspaceId) return [];
    let query = supabase.from('policies').select('id,workspace_id,name,slug,policy_type,description,status,rules,version,is_default,created_by,created_at,updated_at').eq('workspace_id', workspace.workspaceId).order('updated_at', { ascending: false }).limit(100);
    const term = search.trim();
    if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,policy_type.eq.${term},description.ilike.%${term}%`);
    let { data, error } = await query;
    if (error) {
      const fallback = await supabase.from('policies').select('id,workspace_id,name,description,enabled,created_by,created_at,updated_at').eq('workspace_id', workspace.workspaceId).order('updated_at', { ascending: false }).limit(100);
      if (fallback.error) throw new Error(formatAuthError(error));
      data = (fallback.data || []).map(policy => ({ ...policy, slug: policy.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), policy_type: 'access', status: policy.enabled ? 'active' : 'disabled', rules: {}, version: 1, is_default: false }));
    }
    const ids = (data || []).map(policy => policy.id);
    if (!ids.length) return [];
    const [{ data: rules, error: rulesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      supabase.from('policy_rules').select('policy_id').in('policy_id', ids).limit(1000),
      supabase.from('agent_policies').select('policy_id').in('policy_id', ids).limit(1000),
    ]);
    if (rulesError) throw new Error(formatAuthError(rulesError));
    if (assignmentsError) throw new Error(formatAuthError(assignmentsError));
    const ruleCounts = (rules || []).reduce<Record<string, number>>((counts, rule) => { counts[rule.policy_id] = (counts[rule.policy_id] || 0) + 1; return counts; }, {});
    const agentCounts = (assignments || []).reduce<Record<string, number>>((counts, assignment) => { counts[assignment.policy_id] = (counts[assignment.policy_id] || 0) + 1; return counts; }, {});
    return (data || []).map(policy => ({ ...policy, agent_count: agentCounts[policy.id] || 0, rule_count: ruleCounts[policy.id] || 0 })) as PolicyRecord[];
  },
  async getPolicy(id: string) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data: policy, error } = await supabase.from('policies').select('id,workspace_id,name,slug,policy_type,description,status,rules,version,is_default,created_by,created_at,updated_at,policy_rules(id,policy_id,rule_order,name,description,action,resource,effect,risk_level,approval_required,conditions,created_at,updated_at),agent_policies(agent_id,assigned_at,agents(id,name,slug,status))').eq('id', id).single();
    if (error) throw new Error(formatAuthError(error));
    return policy;
  },
  async createPolicy(input: { name: string; policyType: PolicyType; description?: string; status?: PolicyStatus; rules?: PolicyRuleInput[] }) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const name = input.name.trim();
    if (!name) throw new Error('Policy name is required.');
    const rules = (input.rules || []).map(rule => ({ name: rule.name.trim(), description: rule.description?.trim() || null, action: rule.action.trim(), resource: rule.resource?.trim() || null, effect: rule.effect, risk_level: rule.riskLevel, approval_required: Boolean(rule.approvalRequired), conditions: rule.conditions || {} }));
    const { data, error } = await supabase.rpc('create_policy_with_rules', { p_name: name, p_description: input.description?.trim() || null, p_policy_type: input.policyType, p_status: input.status || 'disabled', p_rules: rules });
    if (error) throw new Error(formatAuthError(error));
    return data as PolicyRecord;
  },
  async updatePolicy(id: string, input: { name?: string; policyType?: PolicyType; description?: string; status?: PolicyStatus }) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const current = await this.getPolicy(id);
    const payload: Record<string, string | number | boolean | null> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.policyType !== undefined) payload.policy_type = input.policyType;
    if (input.description !== undefined) payload.description = input.description.trim() || null;
    if (input.status !== undefined) payload.status = input.status;
    const definitionChanged = input.name !== undefined && input.name.trim() !== current.name || input.policyType !== undefined && input.policyType !== current.policy_type || input.description !== undefined && (input.description.trim() || null) !== current.description || input.status !== undefined && input.status !== current.status;
    if (definitionChanged) payload.version = current.version + 1;
    const { data, error } = await supabase.from('policies').update(payload).eq('id', id).select('id,workspace_id,name,slug,policy_type,description,status,rules,version,is_default,created_by,created_at,updated_at').single();
    if (error) throw new Error(formatAuthError(error));
    return data as PolicyRecord;
  },
  async deletePolicy(id: string): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.rpc('delete_policy_safely', { p_policy_id: id });
    if (error) throw new Error(formatAuthError(error));
  },
  async createPolicyRule(policyId: string, input: PolicyRuleInput) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data: last, error: lastError } = await supabase.from('policy_rules').select('rule_order').eq('policy_id', policyId).order('rule_order', { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw new Error(formatAuthError(lastError));
    const { data, error } = await supabase.from('policy_rules').insert({ policy_id: policyId, rule_order: (last?.rule_order || 0) + 1, name: input.name.trim(), description: input.description?.trim() || null, action: input.action.trim(), resource: input.resource?.trim() || null, effect: input.effect, risk_level: input.riskLevel, approval_required: Boolean(input.approvalRequired), conditions: input.conditions || {}, permission: 'read', risk_threshold: input.riskLevel, requires_approval: Boolean(input.approvalRequired) }).select('id,policy_id,rule_order,name,description,action,resource,effect,risk_level,approval_required,conditions,created_at,updated_at').single();
    if (error) throw new Error(formatAuthError(error));
    return data as PolicyRuleRecord;
  },
  async updatePolicyRule(id: string, input: Partial<PolicyRuleInput>) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const payload: Record<string, string | boolean | Record<string, unknown> | null> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.description !== undefined) payload.description = input.description.trim() || null;
    if (input.action !== undefined) payload.action = input.action.trim();
    if (input.resource !== undefined) payload.resource = input.resource.trim() || null;
    if (input.effect !== undefined) payload.effect = input.effect;
    if (input.riskLevel !== undefined) { payload.risk_level = input.riskLevel; payload.risk_threshold = input.riskLevel; }
    if (input.approvalRequired !== undefined) { payload.approval_required = input.approvalRequired; payload.requires_approval = input.approvalRequired; }
    if (input.conditions !== undefined) payload.conditions = input.conditions;
    const { data, error } = await supabase.from('policy_rules').update(payload).eq('id', id).select('id,policy_id,rule_order,name,description,action,resource,effect,risk_level,approval_required,conditions,created_at,updated_at').single();
    if (error) throw new Error(formatAuthError(error));
    return data as PolicyRuleRecord;
  },
  async deletePolicyRule(id: string): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.from('policy_rules').delete().eq('id', id);
    if (error) throw new Error(formatAuthError(error));
  },
  async assignPolicyToAgent(agentId: string, policyId: string) {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.rpc('assign_policy_to_agent', { p_agent_id: agentId, p_policy_id: policyId });
    if (error) throw new Error(formatAuthError(error));
    return data;
  },
  async removePolicyFromAgent(agentId: string, policyId: string): Promise<void> {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.from('agent_policies').delete().eq('agent_id', agentId).eq('policy_id', policyId);
    if (error) throw new Error(formatAuthError(error));
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
