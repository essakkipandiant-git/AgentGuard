(() => {
  const body = document.body;
  const toggle = document.querySelector('.menu-toggle');
  const overlay = document.querySelector('.mobile-overlay');
  const menu = document.querySelector('.mobile-menu');
  const links = document.querySelectorAll('.mobile-menu a');
  const closeMenu = () => { body.classList.remove('menu-open'); toggle?.setAttribute('aria-expanded','false'); toggle?.setAttribute('aria-label','Open menu'); if(menu) menu.hidden=true; if(overlay) overlay.hidden=true; };
  const openMenu = () => { body.classList.add('menu-open'); toggle?.setAttribute('aria-expanded','true'); toggle?.setAttribute('aria-label','Close menu'); if(menu) menu.hidden=false; if(overlay) overlay.hidden=false; };
  toggle?.addEventListener('click',()=>toggle.getAttribute('aria-expanded')==='true'?closeMenu():openMenu()); overlay?.addEventListener('click',closeMenu); links.forEach(link=>link.addEventListener('click',closeMenu)); document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu()}); window.addEventListener('resize',()=>{if(innerWidth>720) closeMenu()});

  const metrics=document.querySelectorAll('.metric');
  metrics.forEach(metric=>{const setActive=active=>{metric.classList.toggle('is-active',active);metric.setAttribute('aria-expanded',String(active))};metric.addEventListener('click',()=>{const next=!metric.classList.contains('is-active');metrics.forEach(item=>item!==metric&&item.classList.remove('is-active'));setActive(next)});metric.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(!metric.classList.contains('is-active'))}if(e.key==='Escape')setActive(false)})});

  const easeOutCubic=t=>1-Math.pow(1-t,3); const values=document.querySelectorAll('[data-target]');
  const animateMetric=(element,index)=>{if(element.dataset.counted)return;element.dataset.counted='true';const target=Number(element.dataset.target), decimals=Number(element.dataset.decimals||0), duration=1500+index*80, start=performance.now()+480+index*90;const tick=now=>{if(now<start)return requestAnimationFrame(tick);const p=Math.min((now-start)/duration,1);element.textContent=(target*easeOutCubic(p)).toFixed(decimals);if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};
  const revealObserver=new IntersectionObserver((entries,observer)=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.14}); document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
  const stats=document.querySelector('.stats-footer'); if(stats)new IntersectionObserver((entries,observer)=>{if(entries.some(e=>e.isIntersecting)){values.forEach(animateMetric);observer.disconnect()}},{threshold:.25}).observe(stats);

  const navLinks=document.querySelectorAll('.desktop-nav a, .mobile-menu a'); const sections=[...document.querySelectorAll('main section[id], .final-cta[id]')];
  const navObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===`#${entry.target.id}`))}}),{rootMargin:'-35% 0px -55% 0px',threshold:0}); sections.forEach(section=>navObserver.observe(section));

  document.querySelectorAll('.control-toggle').forEach(button=>button.addEventListener('click',()=>button.classList.toggle('active')));
  document.querySelectorAll('.state').forEach(button=>button.addEventListener('click',()=>{const states=['allow','approval','deny'];const labels={allow:'ALLOW',approval:'APPROVAL',deny:'DENY'};const current=button.dataset.state;const next=states[(states.indexOf(current)+1)%states.length];button.dataset.state=next;button.className=`state ${next}`;button.textContent=labels[next]}));
  document.querySelectorAll('.arch-node').forEach(node=>{node.addEventListener('mouseenter',()=>document.querySelectorAll('.arch-node').forEach(other=>{if(other.dataset.node===node.dataset.node)other.classList.add('highlight')}));node.addEventListener('mouseleave',()=>document.querySelectorAll('.arch-node').forEach(other=>other.classList.remove('highlight')))});

  const approvalResult=document.querySelector('.approval-result'); document.querySelector('.approve-button')?.addEventListener('click',()=>{approvalResult.textContent='ACTION APPROVED / QUEUED FOR EXECUTION';approvalResult.style.color='#b9d0b2'}); document.querySelector('.deny-button')?.addEventListener('click',()=>{approvalResult.textContent='ACTION BLOCKED / POLICY ENFORCED';approvalResult.style.color='#c79393'});
  const search=document.querySelector('#audit-search'), filter=document.querySelector('#audit-filter'), chips=document.querySelectorAll('.filter-chip'), rows=[...document.querySelectorAll('.audit-row[data-result]')];
  const applyAuditFilter=()=>{const query=(search?.value||'').toLowerCase(), selected=filter?.value||'all';rows.forEach(row=>{const matchesText=row.textContent.toLowerCase().includes(query);const matches=selected==='all'||row.dataset.result===selected||((selected==='blocked'||selected==='approval')&&row.dataset.result===selected);row.hidden=!(matchesText&&matches)});chips.forEach(chip=>chip.classList.toggle('active',chip.dataset.filter==='all'?selected==='all':chip.dataset.filter===selected))};
  search?.addEventListener('input',applyAuditFilter);filter?.addEventListener('change',applyAuditFilter);chips.forEach(chip=>chip.addEventListener('click',()=>{const value=chip.dataset.filter;filter.value=value==='approval'?'approved':value;applyAuditFilter()}));
  document.querySelector('#run-code')?.addEventListener('click',event=>{const output=document.querySelector('#terminal-output');event.currentTarget.textContent='RUNNING…';output?.classList.add('typing');setTimeout(()=>{if(output)output.innerHTML='<span>AGENTGUARD / POLICY ENGINE</span><b>ACTION: CHARGE</b><b>AGENT: finance-agent</b><b>RISK: HIGH</b><strong>RESULT: APPROVAL_REQUIRED</strong>';event.currentTarget.textContent='RUN AGAIN'},700)});
  const flowObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.querySelectorAll('.product-flow span').forEach((step,index)=>setTimeout(()=>step.classList.add('lit'),index*170));flowObserver.unobserve(entry.target)}}),{threshold:.3});const flow=document.querySelector('.product-flow');if(flow)flowObserver.observe(flow);
})();
(() => {
  const isAppRoute = location.pathname === '/dashboard' || location.pathname === '/app' || location.pathname.startsWith('/app/');
  if (!isAppRoute) return;
  document.body.classList.add('app-route');
  document.querySelectorAll('.hero-screen,body>main,.final-cta,.site-footer').forEach(el => el.hidden = true);
  const shell = document.querySelector('#app-shell'); shell.hidden = false;
  const main = document.querySelector('#app-main');
  const title = document.querySelector('#app-page-title'); const crumb = document.querySelector('#app-breadcrumb');
  const sidebar = document.querySelector('#app-sidebar');
  const toast = (titleText, bodyText = '') => { const el=document.createElement('div'); el.className='app-toast'; el.innerHTML=`<b>${titleText}</b>${bodyText}`; document.querySelector('#app-toast-stack').append(el); setTimeout(()=>el.remove(),3600); };
  const button = (label, cls='app-button') => `<button class="${cls}" type="button">${label}</button>`;
  const header = (eyebrow, heading, copy, action='') => `<div class="app-page-header"><div><span class="app-kicker">${eyebrow}</span><h2>${heading}</h2><p>${copy}</p></div><div class="app-actions">${action}</div></div>`;
  const badge = (text, kind='good') => `<span class="status-badge ${kind}">${text}</span>`;
  const metrics = `<div class="app-grid four"><div class="app-card"><span class="card-label">ACTIVE AGENTS</span><div class="metric-large"><strong>24</strong><small>+12.4% this week</small></div><div class="mini-bars"><i style="height:30%"></i><i style="height:45%"></i><i style="height:40%"></i><i style="height:60%"></i><i style="height:75%"></i><i style="height:90%"></i></div></div><div class="app-card"><span class="card-label">GOVERNED ACTIONS</span><div class="metric-large"><strong>1.28M</strong><small>+8.1% this week</small></div><div class="mini-bars"><i style="height:40%"></i><i style="height:55%"></i><i style="height:50%"></i><i style="height:78%"></i><i style="height:62%"></i><i style="height:95%"></i></div></div><div class="app-card"><span class="card-label">BLOCKED ACTIONS</span><div class="metric-large"><strong>37</strong><small>−4.3% this week</small></div><div class="mini-bars"><i style="height:80%"></i><i style="height:55%"></i><i style="height:68%"></i><i style="height:42%"></i><i style="height:28%"></i><i style="height:35%"></i></div></div><div class="app-card"><span class="card-label">PENDING APPROVALS</span><div class="metric-large"><strong>12</strong><small>+3 since yesterday</small></div><div class="mini-bars"><i style="height:35%"></i><i style="height:50%"></i><i style="height:70%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:65%"></i></div></div></div>`;
  const activity = `<div class="app-card activity-panel"><div class="panel-title"><strong>LIVE AGENT ACTIVITY</strong><span class="live-label"><i></i>LIVE</span></div><div class="activity-item"><time>09:41:02</time><b>Research Agent</b><span>Gmail / Read</span>${badge('ALLOWED')}</div><div class="activity-item"><time>09:41:04</time><b>Finance Agent</b><span>Stripe / Charge $2,400</span>${badge('APPROVAL REQUIRED','warn')}</div><div class="activity-item"><time>09:41:08</time><b>Support Agent</b><span>CRM / Update Customer</span>${badge('ALLOWED')}</div><div class="activity-item"><time>09:41:11</time><b>Code Agent</b><span>Shell / Execute</span>${badge('BLOCKED','bad')}</div><button class="row-action view-activity" type="button">View all activity →</button></div>`;
  const posture = `<div class="app-card posture-card"><div class="panel-title"><strong>SECURITY POSTURE</strong><span class="app-kicker">LAST SCAN / 12 SEC AGO</span></div><div class="posture-layout"><div><div class="score-ring"><div><strong>82</strong><small>/ 100</small></div></div><span class="score-good">GOOD</span></div><div><div class="breakdown-row"><span>Agent Identity</span><div class="bar"><i style="width:98%"></i></div><b>98%</b></div><div class="breakdown-row"><span>Policy Coverage</span><div class="bar"><i style="width:91%"></i></div><b>91%</b></div><div class="breakdown-row"><span>Tool Governance</span><div class="bar"><i style="width:87%"></i></div><b>87%</b></div><div class="breakdown-row"><span>Approval Coverage</span><div class="bar"><i style="width:74%"></i></div><b>74%</b></div><div class="breakdown-row"><span>Audit Coverage</span><div class="bar"><i style="width:99%"></i></div><b>99%</b></div></div></div><button class="row-action security-link" type="button">View security posture →</button></div>`;
  const risk = `<div class="risk-strip"><div class="risk-box"><small>CRITICAL</small><strong>2</strong></div><div class="risk-box"><small>HIGH</small><strong>7</strong></div><div class="risk-box"><small>MEDIUM</small><strong>18</strong></div><div class="risk-box"><small>LOW</small><strong>42</strong></div></div>`;
  const overview = () => `${header('OVERVIEW / SYSTEM STATUS','AgentGuard Control Center','Monitor every agent, policy and governed action from one place.',button('+ Add Agent','app-button primary'))}<div class="app-grid">${metrics}<div class="app-grid two">${posture}${activity}</div>${risk}</div>`;
  const agentRows = '<tr><td colspan="7"><div class="app-empty-state"><strong>Loading Agents…</strong><span>Loading workspace Agents from Supabase.</span></div></td></tr>';
  const agents = () => `${header('IDENTITY / AGENTS','Agents','Manage identities, permissions and security posture for every autonomous agent.',button('+ Register Agent','app-button primary'))}<div class="app-table-wrap"><div class="app-toolbar"><input class="table-search" placeholder="Search agents" aria-label="Search agents" /><span class="app-kicker">LOADING</span></div><table class="app-table"><thead><tr><th>AGENT</th><th>STATUS</th><th>RISK</th><th>TOOLS</th><th>LAST ACTIVE</th><th>POLICY</th><th>ACTION</th></tr></thead><tbody>${agentRows}</tbody></table></div>`;
  const policies = () => `${header('POLICY ENGINE / GOVERNANCE','Policies','Define exactly what agents can access, execute and change.',button('+ Create Policy','app-button primary'))}<div class="app-toolbar"><input class="table-search policy-search" placeholder="Search policies" aria-label="Search policies" /></div><div class="policy-list"><div class="app-empty-state"><strong>Loading policies…</strong><span>Loading workspace policies from Supabase.</span></div></div>`;
  const approvals = () => `${header('RISK / HUMAN REVIEW','Approvals','Review high-risk actions before they reach your infrastructure.',`<div class="app-kicker">12 PENDING / 84 APPROVED / 7 DENIED</div>`)}<div class="approval-list"><div class="approval-card"><div><span class="app-kicker">FINANCE AGENT / STRIPE</span><h3>Charge $2,400 <span class="status-badge warn">HIGH RISK</span></h3><p>Payment exceeds configured agent limit. Requested 09:41:04.</p></div><div class="approval-actions">${button('View Context')}<button class="app-button primary approve-action" type="button">Approve</button><button class="app-button danger deny-action" type="button">Deny</button></div></div><div class="approval-card"><div><span class="app-kicker">RESEARCH AGENT / DATABASE</span><h3>Write to customer_records <span class="status-badge warn">MEDIUM</span></h3><p>Write access requires human approval under research policy.</p></div><div class="approval-actions">${button('View Context')}<button class="app-button primary approve-action" type="button">Approve</button></div></div></div>`;
  const activityPage = () => `${header('OBSERVABILITY / TELEMETRY','Agent Activity','Real-time operational view of every governed action.',`<select class="app-toolbar-select"><option>All Agents</option><option>Finance Agent</option><option>Research Agent</option></select>`)}<div class="app-grid four"><div class="app-card"><span class="card-label">ACTIONS / MIN</span><div class="metric-large"><strong>1,284</strong><small>LIVE</small></div></div><div class="app-card"><span class="card-label">ACTIVE AGENTS</span><div class="metric-large"><strong>24</strong><small>+2 today</small></div></div><div class="app-card"><span class="card-label">BLOCKED</span><div class="metric-large"><strong>37</strong><small>2 critical</small></div></div><div class="app-card"><span class="card-label">PENDING</span><div class="metric-large"><strong>12</strong><small>Needs review</small></div></div></div><div class="app-card" style="margin-top:16px"><div class="panel-title"><strong>LIVE STREAM</strong><span class="live-label"><i></i>EVENTS ARRIVING</span></div>${activity.replace('<div class="app-card activity-panel">','').replace('</div>','')}</div>`;
  const audit = () => `${header('FORENSICS / COMPLETE AUDITABILITY','Audit Trail','Every policy decision. Every action. Every agent.',button('Export CSV'))}<div class="app-table-wrap"><div class="app-toolbar"><input class="audit-search" placeholder="Search events, agents, tools" /><select class="audit-filter"><option>All results</option><option>Allowed</option><option>Blocked</option><option>Approval required</option></select><span class="app-kicker">1–25 OF 2,841 EVENTS</span></div><table class="app-table"><thead><tr><th>TIMESTAMP</th><th>AGENT</th><th>ACTION</th><th>RESOURCE</th><th>POLICY</th><th>RISK</th><th>RESULT</th></tr></thead><tbody><tr><td data-label="TIMESTAMP" class="mono">09:41:02</td><td data-label="AGENT">research-agent</td><td data-label="ACTION">READ</td><td data-label="RESOURCE">Gmail</td><td data-label="POLICY">read_email</td><td data-label="RISK">LOW</td><td data-label="RESULT">${badge('ALLOWED')}</td></tr><tr><td data-label="TIMESTAMP" class="mono">09:41:07</td><td data-label="AGENT">finance-agent</td><td data-label="ACTION">CHARGE</td><td data-label="RESOURCE">Stripe</td><td data-label="POLICY">payment_limit</td><td data-label="RISK">HIGH</td><td data-label="RESULT">${badge('BLOCKED','bad')}</td></tr><tr><td data-label="TIMESTAMP" class="mono">09:41:12</td><td data-label="AGENT">support-agent</td><td data-label="ACTION">UPDATE</td><td data-label="RESOURCE">Salesforce</td><td data-label="POLICY">crm_write</td><td data-label="RISK">MEDIUM</td><td data-label="RESULT">${badge('APPROVED')}</td></tr></tbody></table></div>`;
  const integrations = () => `${header('CONTROL PLANE / CONNECTIONS','Integrations','Connect the systems your agents interact with.',button('+ Connect Integration','app-button primary'))}<div class="integration-grid">${['OpenAI','Claude','Gmail','Slack','PostgreSQL','MySQL','Salesforce','Jira','AWS','Kubernetes','Stripe','Payment APIs'].map((name,i)=>`<div class="integration-card"><div class="integration-icon">${name.slice(0,2).toUpperCase()}</div><h3>${name}</h3><p>${i%3===0?'AI model provider':'Agent tool connection'}</p>${i%3===0?badge('CONNECTED'):`<button class="app-button connect-action" type="button">Connect</button>`}</div>`).join('')}</div>`;
  const api = () => `${header('DEVELOPER PLATFORM / API','API Access','Connect AgentGuard to your existing agent infrastructure.',button('+ Create API Key','app-button primary'))}<div class="app-grid two"><div class="app-card"><div class="panel-title"><strong>API KEYS</strong><span class="app-kicker">1 ACTIVE</span></div><div class="detail-list"><div><dt>KEY</dt><dd class="secret-value">ag_live_••••••••••••</dd></div><div><dt>CREATED</dt><dd>Sep 12, 2026</dd></div><div><dt>LAST USED</dt><dd>2 min ago</dd></div><div><dt>PERMISSIONS</dt><dd>Policy Evaluation · Audit Read</dd></div></div><div class="form-footer">${button('Rotate')}<button class="app-button danger revoke-key" type="button">Revoke</button></div></div><div class="app-card"><div class="panel-title"><strong>SDK RESPONSE</strong><span class="app-kicker">JAVASCRIPT</span></div><pre class="code-block">const decision = await agentguard.authorize({\n  agent: "finance-agent",\n  tool: "stripe",\n  action: "charge",\n  amount: 2400\n});\n\n{\n  "decision": "approval_required",\n  "risk": "high",\n  "policy": "finance-v4"\n}</pre></div></div>`;
  const secrets = () => `${header('CONTROL PLANE / CREDENTIALS','Secrets','Protect credentials used by autonomous agents.',button('+ Add Secret','app-button primary'))}<div class="app-table-wrap"><table class="app-table"><thead><tr><th>SECRET NAME</th><th>USED BY</th><th>LAST ROTATED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${[['STRIPE_SECRET_KEY','Finance Agent','2 days ago','Healthy'],['DATABASE_URL','Research Agent','7 days ago','Healthy'],['SLACK_BOT_TOKEN','Support Agent','14 days ago','Rotation Due']].map(r=>`<tr><td data-label="SECRET NAME" class="agent-name">${r[0]}</td><td data-label="USED BY">${r[1]}</td><td data-label="LAST ROTATED">${r[2]}</td><td data-label="STATUS">${badge(r[3],r[3]==='Healthy'?'good':'warn')}</td><td data-label="ACTION"><button class="row-action secret-action">Rotate →</button></td></tr>`).join('')}</tbody></table></div>`;
  const incidents = () => `${header('RISK RESPONSE / INCIDENTS','Security Incidents','Investigate suspicious behavior before it becomes an outage.',button('+ Create Incident','app-button primary'))}<div class="app-grid four"><div class="app-card"><span class="card-label">CRITICAL</span><div class="metric-large"><strong>2</strong><small>Open</small></div></div><div class="app-card"><span class="card-label">HIGH</span><div class="metric-large"><strong>7</strong><small>Open</small></div></div><div class="app-card"><span class="card-label">OPEN</span><div class="metric-large"><strong>9</strong><small>Investigating</small></div></div><div class="app-card"><span class="card-label">RESOLVED</span><div class="metric-large"><strong>42</strong><small>This month</small></div></div></div><div class="incident-card" style="margin-top:16px"><span class="app-kicker">INC-2048 / DETECTED 09:42:18</span><h3>Unauthorized Data Access Attempt</h3><p>Research Agent attempted to access customer records outside its assigned data scope.</p>${badge('CRITICAL','bad')}<div class="incident-timeline"><div>Policy engine detected out-of-scope resource request.</div><div>AgentGuard blocked the database read.</div><div>Security team notified for investigation.</div></div><div class="form-footer">${button('Contain Agent','app-button danger')}${button('Block Tool')}<button class="app-button primary resolve-incident">Resolve Incident</button></div></div>`;
  const security = () => `${header('POSTURE / SECURITY','AgentGuard Security Posture','A single score for the controls that protect your autonomous infrastructure.',button('Review Recommendations','app-button primary'))}<div class="app-grid two"><div class="app-card"><div class="posture-layout"><div><div class="score-ring"><div><strong>82</strong><small>/ 100</small></div></div><span class="score-good">GOOD</span></div><div><div class="breakdown-row"><span>Identity Coverage</span><div class="bar"><i style="width:98%"></i></div><b>98%</b></div><div class="breakdown-row"><span>Policy Coverage</span><div class="bar"><i style="width:91%"></i></div><b>91%</b></div><div class="breakdown-row"><span>Tool Governance</span><div class="bar"><i style="width:87%"></i></div><b>87%</b></div><div class="breakdown-row"><span>Data Protection</span><div class="bar"><i style="width:79%"></i></div><b>79%</b></div><div class="breakdown-row"><span>Audit Coverage</span><div class="bar"><i style="width:99%"></i></div><b>99%</b></div></div></div></div><div class="app-card"><div class="panel-title"><strong>RECOMMENDATIONS</strong><span class="app-kicker">3 ACTIONS</span></div><div class="activity-item"><b>3 agents have unrestricted network access.</b><button class="row-action">Review →</button></div><div class="activity-item"><b>5 agents have policies older than 30 days.</b><button class="row-action">Review →</button></div><div class="activity-item"><b>2 integrations require re-authentication.</b><button class="row-action">Review →</button></div></div></div>`;
  const team = () => `${header('ORGANIZATION / ACCESS','Team','Manage workspace members and access.',button('+ Invite Member','app-button primary'))}<div class="app-table-wrap"><table class="app-table"><thead><tr><th>USER</th><th>ROLE</th><th>LAST ACTIVE</th><th>ACCESS</th><th>ACTION</th></tr></thead><tbody>${[['Essakki','Administrator','Now','Owner'],['Maya Chen','Security Engineer','4 min ago','Security'],['Drew Patel','Developer','18 min ago','Developer'],['Alex Kim','Viewer','2 hr ago','Viewer']].map(r=>`<tr><td data-label="USER" class="agent-name">${r[0]}</td><td data-label="ROLE">${r[1]}</td><td data-label="LAST ACTIVE">${r[2]}</td><td data-label="ACCESS">${r[3]}</td><td data-label="ACTION"><button class="row-action">Edit →</button></td></tr>`).join('')}</tbody></table></div>`;
  const settings = () => `${header('ORGANIZATION / CONFIGURATION','Settings','Configure workspace security, notifications and policy defaults.')}${['GENERAL','SECURITY','NOTIFICATIONS','POLICY','AUDIT'].map((section,i)=>`<div class="settings-section"><h3>${section}</h3>${['Workspace Name','SSO','Approval Requests','Default Policy','Retention'][i] ? `<div class="setting-row"><span>${['Workspace Name','SSO','Approval Requests','Default Policy','Retention'][i]}</span>${i===0?'<input class="field-input" value="Acme Corporation" style="max-width:220px">':i===3?'<select class="field-input" style="max-width:220px"><option>Finance Agent Policy</option><option>Restricted Policy</option></select>':'<button class="switch active" type="button"></button>'}</div>`:''}<div class="setting-row"><span>${['Workspace ID','MFA','Blocked Actions','Policy Evaluation Mode','Export Settings'][i]}</span><span class="app-kicker">${i===0?'ws_acme_8f21a':i===1?'ENFORCED':i===2?'ENABLED':i===3?'REAL-TIME':'CSV / JSON'}</span></div></div>`).join('')}<div class="settings-section"><h3>DANGER ZONE</h3><div class="setting-row"><span>Delete Workspace</span><button class="app-button danger" type="button">Delete Workspace</button></div></div>`;
  const agentDetail = () => `${header('IDENTITY / AGENT','Research Agent','agent_research_042 · Current risk LOW',button('Pause Agent'))}<div class="app-grid two"><div class="app-card"><div class="panel-title"><strong>IDENTITY</strong>${badge('● ACTIVE')}</div><dl class="detail-list"><div><dt>AGENT ID</dt><dd>agent_research_042</dd></div><div><dt>CREATED</dt><dd>Aug 24, 2026</dd></div><div><dt>OWNER</dt><dd>Essakki</dd></div><div><dt>ENVIRONMENT</dt><dd>Production</dd></div><div><dt>AUTHENTICATION</dt><dd>Service Account</dd></div></dl></div><div class="app-card"><div class="panel-title"><strong>RISK PROFILE</strong>${badge('LOW')}</div><div class="score-ring" style="margin:18px auto"><div><strong>28</strong><small>/ 100</small></div></div><p style="text-align:center;color:#777;font-size:11px">Last evaluation 12 sec ago</p></div><div class="app-card"><div class="panel-title"><strong>TOOLS</strong><span class="app-kicker">8 CONNECTED</span></div><div class="activity-item"><b>Gmail</b><span>Read / Send</span>${badge('ALLOW')}</div><div class="activity-item"><b>Postgres</b><span>Read</span>${badge('ALLOW')}</div><div class="activity-item"><b>Slack</b><span>Read</span>${badge('ALLOW')}</div><div class="activity-item"><b>Shell</b><span>Execute</span>${badge('BLOCKED','bad')}</div></div><div class="app-card"><div class="panel-title"><strong>AGENT CONTROL MAP</strong></div><div class="arch-flow"><span class="arch-node primary">RESEARCH AGENT</span><span class="flow-step">IDENTITY</span><span class="flow-step">POLICY</span><span class="flow-step">TOOLS / 8</span><span class="flow-step">AUDIT</span></div></div></div>`;
  const register = () => `${header('ONBOARDING / NEW IDENTITY','Register a new agent','Create a governed identity before connecting it to production tools.') }<div class="app-card"><div class="stepper"><span class="step active">01 Identity</span><span class="step">02 Connect</span><span class="step">03 Permissions</span><span class="step">04 Policy</span><span class="step">05 Review</span></div><div class="form-grid"><div class="field"><label>AGENT NAME</label><input name="agent-name" class="field-input" placeholder="e.g. Finance Agent" required></div><div class="field"><label>AGENT TYPE</label><select name="agent-type" class="field-input"><option>Research</option><option>Finance</option><option>Support</option><option>Coding</option><option>Operations</option><option>Custom</option></select></div><div class="field"><label>PROVIDER</label><select name="agent-provider" class="field-input"><option>OpenAI</option><option>Anthropic</option><option>Google</option><option>Custom</option></select></div><div class="field"><label>ENVIRONMENT</label><select name="agent-environment" class="field-input"><option>Production</option><option>Staging</option><option>Development</option></select></div><div class="field"><label>VERSION</label><input name="agent-version" class="field-input" placeholder="e.g. 1.0.0"></div><div class="field"><label>ENDPOINT URL</label><input name="agent-endpoint" type="url" class="field-input" placeholder="https://example.com/agent"></div><div class="field full"><label>DESCRIPTION</label><input name="agent-description" class="field-input" placeholder="What will this agent be responsible for?"></div></div><div class="form-footer"><button class="app-button" type="button" data-cancel-register>Cancel</button><button class="app-button primary register-submit" type="button">Register Agent →</button></div></div>`;
  const routePages={overview,agents,policies,approvals,activity:activityPage,audit,integrations,api,secrets,incidents,security,team,settings,'agent-detail':agentDetail,register};
  const pageNames={overview:'Overview',agents:'Agents',policies:'Policies',approvals:'Approvals',activity:'Activity',audit:'Audit Trail',integrations:'Integrations',api:'API Access',secrets:'Secrets',incidents:'Security Incidents',security:'Security Posture',team:'Team',settings:'Settings','agent-detail':'Research Agent',register:'Register Agent'};
  const routeKey=()=>{const path=location.pathname.replace(/\/$/,''); if(path==='/dashboard'||path==='/app'||path==='')return 'overview'; if(path.includes('/agents/new'))return 'register'; if(path.includes('/agents/'))return 'agent-detail'; return ({'/dashboard':'overview','/app':'overview','/app/agents':'agents','/app/policies':'policies','/app/approvals':'approvals','/app/activity':'activity','/app/audit':'audit','/app/integrations':'integrations','/app/api':'api','/app/secrets':'secrets','/app/incidents':'incidents','/app/security':'security','/app/team':'team','/app/settings':'settings'})[path]||'overview'};
  const render=()=>{const key=routeKey(); main.innerHTML=routePages[key](); title.textContent=pageNames[key];crumb.textContent=pageNames[key].toUpperCase(); document.querySelectorAll('.app-nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===key)); bindPage(key); main.scrollTop=0; window.scrollTo(0,0)};
  const navigate=href=>{history.pushState({},'',href);render();if(innerWidth<760)sidebar.classList.remove('sidebar-open')};
  const openModal=(html)=>{const modal=document.querySelector('#app-modal');modal.hidden=false;modal.innerHTML=`<div class="modal-backdrop"></div><div class="modal-panel"><button class="drawer-close modal-close">×</button>${html}</div>`;modal.querySelector('.modal-backdrop').onclick=()=>modal.hidden=true;modal.querySelector('.modal-close').onclick=()=>modal.hidden=true};
  const openDrawer=(titleText,bodyText)=>{const drawer=document.querySelector('#app-drawer');drawer.hidden=false;drawer.innerHTML=`<div class="drawer-backdrop"></div><div class="drawer-panel"><button class="drawer-close">×</button><span class="app-kicker">DETAIL VIEW</span><h2 style="margin:18px 0 10px;font-size:23px">${titleText}</h2>${bodyText}</div>`;drawer.querySelector('.drawer-backdrop').onclick=()=>drawer.hidden=true;drawer.querySelector('.drawer-close').onclick=()=>drawer.hidden=true};
  const bindPage=key=>{document.querySelectorAll('.app-nav a').forEach(a=>a.onclick=e=>{e.preventDefault();navigate(a.href)});document.querySelectorAll('.app-page-header .app-button.primary').forEach(b=>b.onclick=()=>key==='agents'?navigate('/app/agents/new'):key==='policies'?openModal('<h3>Create Policy</h3><p>Store a workspace-scoped policy and optional first rule.</p><div class="form-grid"><div class="field"><label>POLICY NAME</label><input name="policy-name" class="field-input" placeholder="e.g. Research Policy" required></div><div class="field"><label>POLICY TYPE</label><select name="policy-type" class="field-input"><option value="access">Access</option><option value="execution">Execution</option><option value="data">Data</option><option value="tool">Tool</option><option value="security">Security</option></select></div><div class="field"><label>STATUS</label><select name="policy-status" class="field-input"><option value="disabled">Disabled</option><option value="active">Active</option></select></div><div class="field full"><label>DESCRIPTION</label><input name="policy-description" class="field-input" placeholder="What should this policy govern?"></div><div class="field full"><span class="app-kicker">OPTIONAL FIRST RULE</span></div><div class="field"><label>RULE NAME</label><input name="rule-name" class="field-input" placeholder="Read customer records"></div><div class="field"><label>ACTION</label><input name="rule-action" class="field-input" placeholder="read"></div><div class="field"><label>RESOURCE</label><input name="rule-resource" class="field-input" placeholder="customer_records"></div><div class="field"><label>EFFECT</label><select name="rule-effect" class="field-input"><option value="allow">Allow</option><option value="deny">Deny</option></select></div><div class="field"><label>RISK</label><select name="rule-risk" class="field-input"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div class="field"><label><input name="rule-approval" type="checkbox"> Approval required</label></div><div class="field full"><label>CONDITIONS JSON</label><textarea name="rule-conditions" class="field-input" rows="3" placeholder="{}">{}</textarea></div></div><div class="form-footer"><button class="app-button modal-close" type="button">Cancel</button><button class="app-button primary create-policy-submit" type="button">Create Policy</button></div>'):key==='integrations'?openModal('<h3>Connect Integration</h3><p>Frontend simulation — no credentials are stored.</p><div class="field"><label>INTEGRATION</label><select class="field-input"><option>PostgreSQL</option><option>Gmail</option><option>Stripe</option></select></div><div class="form-footer"><button class="app-button primary connect-modal">Connect (simulation)</button></div>'):key==='api'?openModal('<h3>Create API Key</h3><p>This frontend-only simulation will show a masked key.</p><div class="field"><label>KEY NAME</label><input class="field-input" placeholder="Production policy evaluation"></div><div class="form-footer"><button class="app-button primary create-key">Create Key</button></div>'):key==='incidents'?toast('Incident created','Frontend-only simulation — no alert was sent.'):key==='team'?openModal('<h3>Invite workspace member</h3><p>Role-based access is simulated locally.</p><div class="field"><label>EMAIL</label><input class="field-input" placeholder="security@example.com"></div><div class="form-footer"><button class="app-button primary invite-member">Send Invite</button></div>'):key==='register'?toast('Agent registered','Frontend-only simulation — no backend connection was made.'):null);
    document.querySelectorAll('.agent-detail').forEach(b=>b.onclick=()=>navigate('/app/agents/research-agent'));document.querySelectorAll('.approve-action').forEach(b=>b.onclick=()=>{b.textContent='Approved';b.disabled=true;toast('Action approved','The simulated decision was recorded in the local UI.')});document.querySelectorAll('.deny-action').forEach(b=>b.onclick=()=>{b.textContent='Denied';b.disabled=true;toast('Action denied','The simulated decision was recorded in the local UI.')});document.querySelectorAll('.connect-action').forEach(b=>b.onclick=()=>openModal('<h3>Connect integration</h3><p>Enter credentials in your secure environment to connect this tool. This preview does not send or store secrets.</p><div class="field"><label>CONNECTION LABEL</label><input class="field-input" value="New connection"></div><div class="form-footer"><button class="app-button primary connect-modal">Connect (simulation)</button></div>'));document.querySelectorAll('.switch').forEach(s=>s.onclick=()=>s.classList.toggle('active'));document.querySelectorAll('.view-activity').forEach(b=>b.onclick=()=>navigate('/app/activity'));document.querySelector('.table-search')?.addEventListener('input',e=>document.querySelectorAll('.app-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase())));document.querySelector('.audit-search')?.addEventListener('input',e=>document.querySelectorAll('.app-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase())));document.querySelector('.register-submit')?.addEventListener('click',()=>toast('Continue to Connect','Agent onboarding step saved locally.'));document.querySelector('.resolve-incident')?.addEventListener('click',e=>{e.target.textContent='Resolved';e.target.disabled=true;toast('Incident resolved','Frontend-only simulation.')});document.querySelector('.security-link')?.addEventListener('click',()=>navigate('/app/security'))};
  document.querySelector('.sidebar-toggle')?.addEventListener('click',()=>sidebar.classList.toggle('sidebar-open'));window.addEventListener('popstate',render);
  const notifications=document.querySelector('#notification-trigger'); notifications?.addEventListener('click',()=>openDrawer('Notifications','<div class="activity-item"><b>HIGH RISK ACTION</b><span>Finance Agent requested a $2,400 Stripe charge.</span></div><div class="activity-item"><b>POLICY UPDATED</b><span>Finance Policy v4 published.</span></div><div class="activity-item"><b>AGENT BLOCKED</b><span>Code Agent attempted restricted shell execution.</span></div><div class="activity-item"><b>INTEGRATION</b><span>PostgreSQL connection requires re-authentication.</span></div>'));
  const openCommand=()=>{const palette=document.querySelector('#command-palette');palette.hidden=false;palette.innerHTML='<input class="command-input" autofocus placeholder="Search agents, policies, actions…"><div class="command-list"><div class="command-item" data-command="/app/agents/new">Add Agent <kbd>↵</kbd></div><div class="command-item" data-command="/app/policies">Create Policy <kbd>↵</kbd></div><div class="command-item" data-command="/app/approvals">Review Approvals <kbd>↵</kbd></div><div class="command-item" data-command="/app/activity">View Activity <kbd>↵</kbd></div><div class="command-item" data-command="/app/audit">Search Audit Trail <kbd>↵</kbd></div><div class="command-item" data-command="/app/settings">Open Settings <kbd>↵</kbd></div></div>';palette.querySelector('.command-input').focus();palette.querySelectorAll('.command-item').forEach(item=>item.onclick=()=>{palette.hidden=true;navigate(item.dataset.command)});}; document.querySelector('#global-search-trigger')?.addEventListener('click',openCommand);document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()}if(e.key==='Escape'){document.querySelector('#command-palette').hidden=true;document.querySelector('#app-modal').hidden=true;document.querySelector('#app-drawer').hidden=true}});
  render();
})();
(() => {
  const tab = document.querySelector('#signin');
  if (!tab) return;
  const openers = document.querySelectorAll('a[href="#signin"], a[href="/login"]');
  const closeButtons = tab.querySelectorAll('[data-close-signin]');
  const form = tab.querySelector('.signin-form');
  const error = tab.querySelector('.signin-error');
  const submit = tab.querySelector('.signin-submit');
  const googleBtn = tab.querySelector('.signin-provider');
  const password = tab.querySelector('[name="signin-password"]');
  const focusable = () => [...tab.querySelectorAll('button,input,a')].filter(el => !el.disabled);
  let lastFocused = null;

  const open = event => {
    event?.preventDefault();
    lastFocused = document.activeElement;
    tab.hidden = false;
    document.body.classList.add('signin-open');
    document.querySelector('.signin-panel h2')?.focus?.();
    tab.querySelector('[name="signin-email"]')?.focus();
  };

  const close = event => {
    event?.preventDefault();
    tab.hidden = true;
    document.body.classList.remove('signin-open');
    error.hidden = true;
    form?.reset();
    if (submit) {
      submit.disabled = false;
      submit.classList.remove('loading', 'success');
      submit.innerHTML = authMode === 'signup' ? 'Create workspace <i class="fa-solid fa-arrow-right"></i>' : 'Sign in <i class="fa-solid fa-arrow-right"></i>';
    }
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<span class="provider-mark">G</span>Continue with Google';
    }
    lastFocused?.focus?.();
  };

  openers.forEach(link => link.addEventListener('click', open));

  // Handle URL query parameters or direct /login route
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('signin') === '1' || window.location.pathname === '/login') {
    setTimeout(() => open(), 0);
  }
  if (urlParams.get('error')) {
    setTimeout(() => {
      open();
      const errParam = urlParams.get('error');
      error.textContent = errParam === 'oauth_failed'
        ? 'Google sign-in could not be completed. Please try again.'
        : decodeURIComponent(errParam);
      error.hidden = false;
    }, 50);
  }

  closeButtons.forEach(button => button.addEventListener('click', close));

  // Google OAuth click handler
  googleBtn?.addEventListener('click', async () => {
    error.hidden = true;
    googleBtn.disabled = true;
    googleBtn.innerHTML = '<span class="provider-mark"><i class="fa-solid fa-spinner fa-spin"></i></span>Connecting to Google...';
    try {
      const auth = window.AgentGuardAuth;
      if (!auth?.signInWithGoogle) throw new Error('Authentication service is initializing. Please try again in a moment.');
      await auth.signInWithGoogle();
    } catch (err) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<span class="provider-mark">G</span>Continue with Google';
      error.textContent = window.AgentGuardAuth?.formatAuthError?.(err) || err?.message || 'Google sign-in failed. Please try again.';
      error.hidden = false;
    }
  });

  // Forgot password handler
  tab.addEventListener('click', async event => {
    const link = event.target.closest('[data-forgot-password]');
    if (!link) return;
    event.preventDefault();
    const email = form.elements['signin-email'].value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      error.textContent = 'Enter your work email first, then click Forgot password.';
      error.hidden = false;
      return;
    }
    try {
      await window.AgentGuardAuth.resetPassword(email);
      error.textContent = 'Password reset instructions sent. Check your inbox.';
      error.hidden = false;
    } catch (err) {
      error.textContent = window.AgentGuardAuth?.formatAuthError?.(err) || 'Unable to send reset instructions.';
      error.hidden = false;
    }
  });

  tab.querySelector('[data-contact-signin]')?.addEventListener('click', close);

  tab.querySelector('.signin-show-password')?.addEventListener('click', event => {
    const shown = password.type === 'password';
    password.type = shown ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
    event.currentTarget.innerHTML = `<i class="fa-regular ${shown ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  let authMode = 'signin';
  const setMode = mode => {
    authMode = mode;
    const signup = mode === 'signup';
    tab.querySelector('.signin-kicker').textContent = signup ? 'ONBOARDING / CREATE WORKSPACE' : 'AUTHENTICATION / SECURE ACCESS';
    tab.querySelector('#signin-title').innerHTML = signup ? 'Secure your agents.<br><em>Create a workspace.</em>' : 'Sign in to your<br><em>control plane.</em>';
    tab.querySelector('.signin-intro').textContent = signup ? 'Create your AgentGuard workspace and put every autonomous action behind a policy.' : 'Access your governed agents, policies and live operational activity.';
    const emailLabel = form.querySelector('[name=signin-email]').closest('label');
    if (signup && !form.querySelector('[name=signin-name]')) {
      emailLabel.insertAdjacentHTML('beforebegin', '<label>FULL NAME<input name="signin-name" type="text" placeholder="Your name" required></label><label>COMPANY<input name="signin-company" type="text" placeholder="Company name" required></label>');
    }
    form.querySelector('.signin-options').innerHTML = signup
      ? '<label class="signin-remember"><input name="signin-terms" type="checkbox" required> <span>I agree to the Terms and Privacy Policy.</span></label>'
      : '<label class="signin-remember"><input type="checkbox"> <span>Remember me</span></label><a href="#signin" data-forgot-password>Forgot password?</a>';
    submit.innerHTML = signup ? 'Create workspace <i class="fa-solid fa-arrow-right"></i>' : 'Sign in <i class="fa-solid fa-arrow-right"></i>';
    const create = tab.querySelector('[data-create-account]');
    if (create) create.textContent = signup ? 'Already have an account? Sign in' : 'Create an account';
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const email = form.elements['signin-email'].value.trim();
    const pass = form.elements['signin-password'].value;
    const valid = /^\S+@\S+\.\S+$/.test(email) && pass.length >= 6 && (!form.elements['signin-name'] || (form.elements['signin-name'].value.trim() && form.elements['signin-company'].value.trim() && form.elements['signin-terms'].checked));
    
    if (!valid) {
      error.textContent = authMode === 'signup'
        ? 'Complete all fields, use a 6+ character password, and accept the terms.'
        : 'Enter a valid work email and a password of at least 6 characters.';
      error.hidden = false;
      return;
    }
    
    error.hidden = true;
    submit.disabled = true;
    submit.classList.add('loading');
    submit.textContent = 'AUTHENTICATING...';

    try {
      const auth = window.AgentGuardAuth;
      if (!auth) throw new Error('Authentication is still loading. Please try again.');
      
      if (authMode === 'signup') {
        const result = await auth.signUp(form.elements['signin-name'].value.trim(), email, pass, form.elements['signin-company'].value.trim());
        if (!result.session) {
          submit.disabled = false;
          submit.classList.remove('loading');
          submit.textContent = 'CHECK YOUR EMAIL';
          error.textContent = 'Account created. Check your inbox to confirm your email before signing in.';
          error.hidden = false;
          return;
        }
      } else {
        await auth.signIn(email, pass);
      }
      
      submit.classList.remove('loading');
      submit.classList.add('success');
      submit.innerHTML = 'ACCESS GRANTED <i class="fa-solid fa-check"></i>';
      setTimeout(() => { location.href = '/dashboard'; }, 400);
    } catch (err) {
      submit.disabled = false;
      submit.classList.remove('loading');
      submit.innerHTML = authMode === 'signup' ? 'Create workspace <i class="fa-solid fa-arrow-right"></i>' : 'Sign in <i class="fa-solid fa-arrow-right"></i>';
      error.textContent = window.AgentGuardAuth?.formatAuthError?.(err) || err?.message || 'Authentication failed. Please try again.';
      error.hidden = false;
    }
  });

  tab.querySelector('[data-create-account]')?.addEventListener('click', event => {
    event.preventDefault();
    if (authMode === 'signup') {
      setMode('signin');
    } else {
      setMode('signup');
    }
  });

  document.addEventListener('keydown', event => {
    if (tab.hidden) return;
    if (event.key === 'Escape') close(event);
    if (event.key === 'Tab') {
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();

(() => {
  const isProtected = ['/dashboard', '/app', '/agents', '/policies', '/activity', '/security'].some(
    path => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const check = () => window.AgentGuardAuth?.getSession?.().then(session => {
    if (isProtected && !session) {
      location.replace('/?signin=1');
    } else if (session && (location.pathname === '/login' || (location.pathname === '/' && location.search.includes('signin=1')))) {
      location.replace('/dashboard');
    }
  });

  setTimeout(check, 120);

  window.addEventListener('agentguard:auth-state', (e) => {
    const session = e.detail;
    if (isProtected && !session) {
      location.replace('/?signin=1');
    }
  });
})();

(() => {
  const isApp = location.pathname === '/dashboard' || location.pathname === '/app' || location.pathname.startsWith('/app/');
  if (!isApp) return;

  const auth = () => window.AgentGuardAuth;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const empty = (message, colspan = 1) => `<div class="app-empty-state"><strong>No live records yet</strong><span>${esc(message)}</span></div>`;
  const formatTime = value => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const statusBadge = (value, kind='good') => `<span class="status-badge ${kind}">${esc(String(value || '').toUpperCase())}</span>`;
  const setMetric = (label, value, sub='LIVE') => {
    const card = [...document.querySelectorAll('.app-card')].find(el => el.querySelector('.card-label')?.textContent.trim() === label);
    if (card) {
      const strong = card.querySelector('.metric-large strong');
      const small = card.querySelector('.metric-large small');
      if (strong) strong.textContent = String(value);
      if (small) small.textContent = sub;
    }
  };
  const agentStatusKind = status => status === 'active' ? 'good' : status === 'paused' ? 'warn' : 'bad';
  const renderAgentRows = records => records.length ? records.map(agent => `<tr data-agent-id="${esc(agent.id)}"><td data-label="AGENT" class="agent-name"><button class="row-action agent-detail" type="button">${esc(agent.name)} →</button><small class="app-kicker">${esc(agent.agent_type || 'TYPE NOT SET')} · ${esc(agent.provider || 'PROVIDER NOT SET')}</small></td><td data-label="STATUS">${statusBadge(`● ${agent.status}`, agentStatusKind(agent.status))}</td><td data-label="RISK">${statusBadge('—')}</td><td data-label="TOOLS">—</td><td data-label="LAST ACTIVE">${agent.last_seen_at ? formatTime(agent.last_seen_at) : 'No activity yet'}</td><td data-label="POLICY">Not configured</td><td data-label="ACTION"><button class="row-action agent-edit" type="button">Edit →</button><button class="row-action agent-status" type="button" data-next-status="${agent.status === 'active' ? 'paused' : 'active'}">${agent.status === 'active' ? 'Pause' : 'Enable'}</button><button class="row-action agent-delete" type="button">Delete</button></td></tr>`).join('') : `<tr><td colspan="7">${empty('Register an agent to begin governing autonomous actions.')}</td></tr>`;
  const renderAgentsTable = records => {
    const tbody = document.querySelector('.app-table tbody');
    if (tbody) tbody.innerHTML = renderAgentRows(records);
    const total = document.querySelector('.app-toolbar .app-kicker');
    if (total) total.textContent = `${records.length} TOTAL / ${records.filter(item => item.status === 'active').length} ACTIVE`;
  };
  const policyStatusKind = status => status === 'active' ? 'good' : status === 'disabled' ? 'bad' : 'warn';
  const renderPolicyCards = records => {
    const list = document.querySelector('.policy-list');
    if (!list) return;
    list.innerHTML = records.length ? records.map(policy => `<div class="policy-card" data-policy-id="${esc(policy.id)}"><div><h3>${esc(policy.name)}</h3><p>${esc(policy.policy_type)} · ${policy.agent_count} agents · ${policy.rule_count} rules</p><small class="app-kicker">${esc(policy.description || policy.slug)}</small></div><div class="policy-meta"><b>v${esc(policy.version)}</b><br>${statusBadge(policy.status, policyStatusKind(policy.status))}<br><small>${formatTime(policy.updated_at)}</small><br><button class="row-action policy-detail" type="button">View details →</button></div></div>`).join('') : `<div class="app-empty-state"><strong>No policies yet</strong><span>Create a policy to define governed actions for this workspace.</span></div>`;
  };
  const loadPolicies = async searchTerm => {
    const records = await auth()?.getPolicies?.(searchTerm || '');
    renderPolicyCards(records || []);
    return records || [];
  };
  const loadAgents = async searchTerm => {
    const records = await auth()?.getAgents?.(searchTerm || '');
    renderAgentsTable(records || []);
    return records || [];
  };

  const sync = async () => {
    try {
      const session = await auth()?.getSession?.();
      if (session?.user) {
        const userEmail = session.user.email || '';
        const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'User';
        const initials = userName.slice(0, 2).toUpperCase();
        document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
        const profileBtn = document.querySelector('.profile-button');
        if (profileBtn) {
          const strong = profileBtn.querySelector('strong');
          const small = profileBtn.querySelector('small');
          if (strong) strong.textContent = userName;
          if (small) small.textContent = userEmail;
        }
      }

      const data = await auth()?.getWorkspaceData?.();
      if (!data) return;

      if (data.workspaceName) {
        const wsBtn = document.querySelector('.workspace-button');
        if (wsBtn) wsBtn.innerHTML = `${esc(data.workspaceName)} <span>⌄</span>`;
      }

      setMetric('ACTIVE AGENTS', data.agents.filter(item => item.status === 'active').length, 'FROM SUPABASE');
      setMetric('GOVERNED ACTIONS', data.activity.length, 'RECENT EVENTS');
      setMetric('BLOCKED ACTIONS', data.activity.filter(item => String(item.status || '').toLowerCase() === 'blocked' || String(item.policy_decision || '').toLowerCase() === 'blocked').length, 'FROM ACTIVITY');
      setMetric('PENDING APPROVALS', data.approvals.filter(item => item.status === 'pending').length, 'FROM SUPABASE');

      const route = location.pathname;
      if (route === '/app/agents') {
        renderAgentsTable(data.agents);
      }
      if (route === '/app/policies') {
        try {
          await loadPolicies(document.querySelector('.policy-search')?.value || '');
        } catch (error) {
          const list = document.querySelector('.policy-list');
          if (list) list.innerHTML = `<div class="app-empty-state"><strong>Policies could not be loaded</strong><span>${esc(error?.message || 'Please refresh and try again.')}</span></div>`;
          console.warn('AgentGuard policy data unavailable', error);
        }
      }
      if (route === '/app/approvals') {
        const list = document.querySelector('.approval-list');
        if (list) list.innerHTML = data.approvals.length ? data.approvals.map(item => `<div class="approval-card" data-approval-id="${esc(item.id)}"><div><span class="app-kicker">${esc(item.requested_resource || 'RESOURCE')}</span><h3>${esc(item.requested_action)} ${statusBadge(item.risk_level,'warn')}</h3><p>${esc(item.status)} · Requested ${formatTime(item.created_at)}</p></div><div class="approval-actions">${item.status === 'pending' ? '<button class="app-button primary live-approve" type="button">Approve</button><button class="app-button danger live-deny" type="button">Deny</button>' : `<span class="app-kicker">${esc(item.status).toUpperCase()}</span>`}</div></div>`).join('') : empty('Approval requests will appear here when agents require human review.');
      }
      if (route === '/app/activity') {
        const items = [...document.querySelectorAll('.activity-item')];
        if (data.activity.length) {
          items.slice(0, data.activity.length).forEach((node, index) => {
            const item = data.activity[index];
            node.innerHTML = `<time>${formatTime(item.created_at)}</time><b>${esc(item.action)}</b><span>${esc(item.tool || 'Agent event')}</span>${statusBadge(item.status || item.policy_decision || 'RECORDED')}`;
          });
        } else {
          document.querySelector('.app-card[style*="margin-top"]')?.insertAdjacentHTML('beforeend', empty('Activity events will appear after governed actions are recorded.'));
        }
      }
      if (route === '/app/audit') {
        const tbody = document.querySelector('.app-table tbody');
        if (tbody) tbody.innerHTML = data.auditLogs.length ? data.auditLogs.map(item => `<tr><td data-label="TIMESTAMP" class="mono">${formatTime(item.created_at)}</td><td data-label="AGENT">—</td><td data-label="ACTION">${esc(item.action)}</td><td data-label="RESOURCE">${esc(item.resource || '—')}</td><td data-label="POLICY">—</td><td data-label="RISK">${esc(item.risk_level || '—')}</td><td data-label="RESULT">${statusBadge(item.result || 'RECORDED')}</td></tr>`).join('') : `<tr><td colspan="7">${empty('Audit events will appear here as security actions are recorded.')}</td></tr>`;
      }
    } catch (error) {
      console.warn('AgentGuard live data unavailable', error);
    }
  };

  // Sign out click handler on profile button
  document.querySelector('.profile-button')?.addEventListener('click', async () => {
    if (confirm('Sign out of AgentGuard?')) {
      await auth()?.signOut?.();
      location.replace('/');
    }
  });

  window.addEventListener('agentguard:auth-state', () => setTimeout(sync, 50));
  window.addEventListener('popstate', () => setTimeout(sync, 50));
  setTimeout(sync, 180);

  document.addEventListener('click', async event => {
    const target = event.target.closest('.live-approve, .live-deny');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const card = target.closest('[data-approval-id]');
    try {
      target.disabled = true;
      await auth().decideApproval(card.dataset.approvalId, target.classList.contains('live-approve') ? 'approved' : 'rejected');
      await sync();
    } catch (error) {
      target.disabled = false;
      console.warn('Approval decision failed', error);
    }
  }, true);

  document.addEventListener('click', async event => {
    const target = event.target.closest('.register-submit');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      target.disabled = true;
      target.textContent = 'CREATING…';
      const field = name => document.querySelector(`[name="${name}"]`);
      const name = field('agent-name')?.value?.trim() || '';
      const endpointUrl = field('agent-endpoint')?.value?.trim() || '';
      if (!name) throw new Error('Agent name is required.');
      if (endpointUrl) new URL(endpointUrl);
      await auth().createAgent({
        name,
        agentType: field('agent-type')?.value,
        provider: field('agent-provider')?.value,
        environment: field('agent-environment')?.value,
        version: field('agent-version')?.value,
        endpointUrl,
        description: field('agent-description')?.value,
      });
      target.textContent = 'AGENT CREATED';
      toast('Agent registered', 'The Agent was saved to the current workspace.');
      setTimeout(() => navigate('/app/agents'), 450);
    } catch (error) {
      target.disabled = false;
      target.textContent = 'Register Agent →';
      toast('Agent registration failed', error?.message || 'Please check the fields and try again.');
    }
  }, true);

  document.addEventListener('input', event => {
    const input = event.target.closest('.table-search');
    if (!input || location.pathname !== '/app/agents') return;
    clearTimeout(input._agentSearchTimer);
    input._agentSearchTimer = setTimeout(async () => {
      try { await loadAgents(input.value); } catch (error) { toast('Search unavailable', 'Could not load Agents from Supabase.'); }
    }, 220);
  });

  document.addEventListener('input', event => {
    const input = event.target.closest('.policy-search');
    if (!input || location.pathname !== '/app/policies') return;
    clearTimeout(input._policySearchTimer);
    input._policySearchTimer = setTimeout(async () => {
      try { await loadPolicies(input.value); } catch (error) { toast('Search unavailable', 'Could not load policies from Supabase.'); }
    }, 220);
  });

  const agentEditor = agent => `<h3>Edit Agent</h3><p>Update the registered identity metadata. Secrets are never stored here.</p><div class="form-grid"><div class="field"><label>AGENT NAME</label><input name="edit-agent-name" class="field-input" value="${esc(agent.name)}"></div><div class="field"><label>AGENT TYPE</label><select name="edit-agent-type" class="field-input">${['Research','Finance','Support','Coding','Operations','Custom'].map(value => `<option ${value === agent.agent_type ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="field"><label>PROVIDER</label><select name="edit-agent-provider" class="field-input">${['OpenAI','Anthropic','Google','Custom'].map(value => `<option ${value === agent.provider ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="field"><label>ENVIRONMENT</label><select name="edit-agent-environment" class="field-input">${['Production','Staging','Development'].map(value => `<option ${value === agent.environment ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="field"><label>VERSION</label><input name="edit-agent-version" class="field-input" value="${esc(agent.version || '')}"></div><div class="field"><label>ENDPOINT URL</label><input name="edit-agent-endpoint" type="url" class="field-input" value="${esc(agent.endpoint_url || '')}"></div><div class="field full"><label>DESCRIPTION</label><input name="edit-agent-description" class="field-input" value="${esc(agent.description || '')}"></div></div><div class="form-footer"><button class="app-button modal-close" type="button">Cancel</button><button class="app-button primary save-agent" type="button" data-agent-id="${esc(agent.id)}">Save changes</button></div>`;

  const getAgent = async id => (await auth().getAgents()).find(agent => agent.id === id);
  document.addEventListener('click', async event => {
    const target = event.target.closest('.agent-detail, .agent-edit, .agent-status, .agent-delete');
    if (!target) return;
    event.preventDefault();
    const row = target.closest('[data-agent-id]');
    if (!row) return;
    try {
      const agent = await getAgent(row.dataset.agentId);
      if (!agent) throw new Error('Agent not found.');
      if (target.classList.contains('agent-status')) {
        target.disabled = true;
        await auth().updateAgentStatus(agent.id, target.dataset.nextStatus);
        toast('Agent status updated', `${agent.name} is now ${target.dataset.nextStatus}.`);
        await sync();
      } else if (target.classList.contains('agent-delete')) {
        if (!confirm(`Delete ${agent.name}? This cannot be undone.`)) return;
        target.disabled = true;
        await auth().deleteAgent(agent.id);
        toast('Agent deleted', `${agent.name} was removed from this workspace.`);
        await sync();
      } else if (target.classList.contains('agent-edit')) {
        openModal(agentEditor(agent));
      } else {
        openDrawer(agent.name, `<p>${esc(agent.description || 'No description provided.')}</p><dl class="detail-list"><div><dt>AGENT ID</dt><dd>${esc(agent.id)}</dd></div><div><dt>SLUG</dt><dd>${esc(agent.slug)}</dd></div><div><dt>TYPE</dt><dd>${esc(agent.agent_type || '—')}</dd></div><div><dt>PROVIDER</dt><dd>${esc(agent.provider || '—')}</dd></div><div><dt>ENVIRONMENT</dt><dd>${esc(agent.environment || '—')}</dd></div><div><dt>VERSION</dt><dd>${esc(agent.version || '—')}</dd></div><div><dt>ENDPOINT</dt><dd>${esc(agent.endpoint_url || '—')}</dd></div><div><dt>STATUS</dt><dd>${esc(agent.status)}</dd></div><div><dt>CREATED</dt><dd>${esc(new Date(agent.created_at).toLocaleString())}</dd></div><div><dt>UPDATED</dt><dd>${esc(new Date(agent.updated_at).toLocaleString())}</dd></div><div><dt>LAST SEEN</dt><dd>${agent.last_seen_at ? esc(new Date(agent.last_seen_at).toLocaleString()) : 'No activity yet'}</dd></div></dl>`);
      }
    } catch (error) { toast('Agent action failed', error?.message || 'Please try again.'); }
  });

  document.addEventListener('click', async event => {
    const target = event.target.closest('.save-agent');
    if (!target) return;
    try {
      target.disabled = true;
      const value = name => document.querySelector(`[name="${name}"]`)?.value || '';
      const endpointUrl = value('edit-agent-endpoint').trim();
      if (endpointUrl) new URL(endpointUrl);
      await auth().updateAgent(target.dataset.agentId, { name: value('edit-agent-name'), agentType: value('edit-agent-type'), provider: value('edit-agent-provider'), environment: value('edit-agent-environment'), version: value('edit-agent-version'), endpointUrl, description: value('edit-agent-description') });
      document.querySelector('#app-modal').hidden = true;
      toast('Agent updated', 'The changes were saved to Supabase.');
      await sync();
    } catch (error) { target.disabled = false; toast('Agent update failed', error?.message || 'Please check the fields and try again.'); }
  });

  const setPolicyDrawer = (titleText, bodyText) => {
    const drawer = document.querySelector('#app-drawer');
    if (!drawer) return;
    drawer.hidden = false;
    drawer.innerHTML = `<div class="drawer-backdrop"></div><div class="drawer-panel"><button class="drawer-close" type="button">×</button><span class="app-kicker">POLICY DETAIL</span><h2 style="margin:18px 0 10px;font-size:23px">${esc(titleText)}</h2><div class="policy-drawer-body">${bodyText}</div></div>`;
    drawer.querySelector('.drawer-backdrop').onclick = () => drawer.hidden = true;
    drawer.querySelector('.drawer-close').onclick = () => drawer.hidden = true;
  };
  const showPolicyModal = html => {
    const modal = document.querySelector('#app-modal');
    modal.hidden = false;
    modal.innerHTML = `<div class="modal-backdrop"></div><div class="modal-panel"><button class="drawer-close modal-close" type="button">×</button>${html}</div>`;
    modal.querySelector('.modal-backdrop').onclick = () => modal.hidden = true;
    modal.querySelector('.modal-close').onclick = () => modal.hidden = true;
  };
  const renderPolicyDrawer = async policyId => {
    setPolicyDrawer('Loading policy…', '<div class="app-empty-state"><strong>Loading policy details…</strong><span>Fetching rules and Agent assignments from Supabase.</span></div>');
    try {
      const [policy, agents] = await Promise.all([auth().getPolicy(policyId), auth().getAgents()]);
      const rules = [...(policy.policy_rules || [])].sort((a, b) => a.rule_order - b.rule_order);
      const assignments = policy.agent_policies || [];
      const assignedIds = new Set(assignments.map(item => item.agent_id));
      const availableAgents = agents.filter(agent => !assignedIds.has(agent.id));
      const rulesHtml = rules.length ? rules.map(rule => `<div class="activity-item" data-rule-id="${esc(rule.id)}"><div><b>${esc(rule.name)}</b><span>${esc(rule.action)}${rule.resource ? ` · ${esc(rule.resource)}` : ''} · ${esc(rule.effect)} · ${esc(rule.risk_level)}</span><small>${rule.approval_required ? 'Approval required' : 'No approval required'} · ${esc(JSON.stringify(rule.conditions || {}))}</small></div><div><button class="row-action policy-rule-edit" type="button" data-policy-id="${esc(policy.id)}" data-rule-id="${esc(rule.id)}">Edit</button><button class="row-action policy-rule-delete" type="button" data-rule-id="${esc(rule.id)}">Delete</button></div></div>`).join('') : '<div class="app-empty-state"><strong>No rules yet</strong><span>Add a rule to define this policy’s stored governance data.</span></div>';
      const assignmentsHtml = assignments.length ? assignments.map(item => `<div class="activity-item"><b>${esc(item.agents?.name || item.agent_id)}</b><span>${esc(item.agents?.status || 'assigned')} · ${formatTime(item.assigned_at)}</span><button class="row-action policy-unassign" type="button" data-agent-id="${esc(item.agent_id)}" data-policy-id="${esc(policy.id)}">Remove</button></div>`).join('') : '<div class="app-empty-state"><strong>No Agents assigned</strong><span>Assignments are optional and workspace-scoped.</span></div>';
      const assignHtml = availableAgents.length ? `<div class="form-footer"><select class="field-input policy-agent-select"><option value="">Select an Agent</option>${availableAgents.map(agent => `<option value="${esc(agent.id)}">${esc(agent.name)}</option>`).join('')}</select><button class="app-button primary policy-assign" type="button" data-policy-id="${esc(policy.id)}">Assign</button></div>` : '<p class="app-kicker">No unassigned Agents are available.</p>';
      setPolicyDrawer(policy.name, `<p>${esc(policy.description || 'No description provided.')}</p><dl class="detail-list"><div><dt>TYPE</dt><dd>${esc(policy.policy_type)}</dd></div><div><dt>STATUS</dt><dd>${statusBadge(policy.status, policyStatusKind(policy.status))}</dd></div><div><dt>VERSION</dt><dd>v${esc(policy.version)}</dd></div><div><dt>SLUG</dt><dd>${esc(policy.slug)}</dd></div><div><dt>POLICY ID</dt><dd class="mono">${esc(policy.id)}</dd></div><div><dt>CREATED BY</dt><dd class="mono">${esc(policy.created_by)}</dd></div><div><dt>CREATED</dt><dd>${esc(new Date(policy.created_at).toLocaleString())}</dd></div><div><dt>UPDATED</dt><dd>${esc(new Date(policy.updated_at).toLocaleString())}</dd></div><div><dt>ASSIGNED AGENTS</dt><dd>${assignments.length}</dd></div><div><dt>RULES</dt><dd>${rules.length}</dd></div></dl><div class="form-footer"><button class="app-button policy-edit" type="button" data-policy-id="${esc(policy.id)}">Edit</button><button class="app-button policy-toggle" type="button" data-policy-id="${esc(policy.id)}" data-next-status="${policy.status === 'active' ? 'disabled' : 'active'}">${policy.status === 'active' ? 'Disable' : 'Enable'}</button><button class="app-button danger policy-delete" type="button" data-policy-id="${esc(policy.id)}">Delete</button></div><h3>Rules</h3><div class="activity-list">${rulesHtml}</div><button class="app-button primary policy-add-rule" type="button" data-policy-id="${esc(policy.id)}">+ Add Rule</button><h3>Assigned Agents</h3><div class="activity-list">${assignmentsHtml}</div>${assignHtml}`);
    } catch (error) { setPolicyDrawer('Policy unavailable', `<div class="app-empty-state"><strong>Could not load policy details</strong><span>${esc(error?.message || 'Please try again.')}</span></div>`); }
  };
  const policyInput = name => document.querySelector(`#app-modal [name="${name}"]`)?.value || '';
  document.addEventListener('click', async event => {
    const target = event.target.closest('.policy-detail');
    if (target) { event.preventDefault(); await renderPolicyDrawer(target.closest('[data-policy-id]')?.dataset.policyId); return; }
    const edit = event.target.closest('.policy-edit');
    if (edit) { const policy = await auth().getPolicy(edit.dataset.policyId); showPolicyModal(`<h3>Edit Policy</h3><p>Policy ID and slug remain stable. Definition changes increment the version.</p><div class="form-grid"><div class="field"><label>POLICY NAME</label><input name="edit-policy-name" class="field-input" value="${esc(policy.name)}"></div><div class="field"><label>POLICY TYPE</label><select name="edit-policy-type" class="field-input"><option value="access" ${policy.policy_type === 'access' ? 'selected' : ''}>Access</option><option value="execution" ${policy.policy_type === 'execution' ? 'selected' : ''}>Execution</option><option value="data" ${policy.policy_type === 'data' ? 'selected' : ''}>Data</option><option value="tool" ${policy.policy_type === 'tool' ? 'selected' : ''}>Tool</option><option value="security" ${policy.policy_type === 'security' ? 'selected' : ''}>Security</option></select></div><div class="field"><label>STATUS</label><select name="edit-policy-status" class="field-input"><option value="active" ${policy.status === 'active' ? 'selected' : ''}>Active</option><option value="disabled" ${policy.status === 'disabled' ? 'selected' : ''}>Disabled</option></select></div><div class="field full"><label>DESCRIPTION</label><input name="edit-policy-description" class="field-input" value="${esc(policy.description || '')}"></div></div><div class="form-footer"><button class="app-button modal-close" type="button">Cancel</button><button class="app-button primary policy-edit-submit" type="button" data-policy-id="${esc(policy.id)}">Save changes</button></div>`); return; }
    const toggle = event.target.closest('.policy-toggle');
    if (toggle) { toggle.disabled = true; try { await auth().updatePolicy(toggle.dataset.policyId, { status: toggle.dataset.nextStatus }); toast('Policy status updated', `Policy is now ${toggle.dataset.nextStatus}.`); await sync(); await renderPolicyDrawer(toggle.dataset.policyId); } catch (error) { toast('Policy update failed', error?.message || 'Please try again.'); toggle.disabled = false; } return; }
    const remove = event.target.closest('.policy-delete');
    if (remove) { if (!confirm('Delete this policy? Assigned policies must be removed first.')) return; remove.disabled = true; try { await auth().deletePolicy(remove.dataset.policyId); document.querySelector('#app-drawer').hidden = true; toast('Policy deleted', 'The policy was removed from this workspace.'); await sync(); } catch (error) { toast('Policy deletion blocked', error?.message || 'Remove Agent assignments first.'); remove.disabled = false; } return; }
    const addRule = event.target.closest('.policy-add-rule');
    if (addRule) { showPolicyModal(`<h3>Add Policy Rule</h3><p>Rules are stored for future policy evaluation; they do not enforce Agent actions yet.</p><div class="form-grid"><div class="field"><label>RULE NAME</label><input name="new-rule-name" class="field-input"></div><div class="field"><label>ACTION</label><input name="new-rule-action" class="field-input" placeholder="read"></div><div class="field"><label>RESOURCE</label><input name="new-rule-resource" class="field-input"></div><div class="field"><label>EFFECT</label><select name="new-rule-effect" class="field-input"><option value="allow">Allow</option><option value="deny">Deny</option></select></div><div class="field"><label>RISK</label><select name="new-rule-risk" class="field-input"><option>low</option><option selected>medium</option><option>high</option><option>critical</option></select></div><div class="field"><label><input name="new-rule-approval" type="checkbox"> Approval required</label></div><div class="field full"><label>CONDITIONS JSON</label><textarea name="new-rule-conditions" class="field-input" rows="3">{}</textarea></div></div><div class="form-footer"><button class="app-button modal-close" type="button">Cancel</button><button class="app-button primary policy-rule-submit" type="button" data-policy-id="${esc(addRule.dataset.policyId)}">Add Rule</button></div>`); return; }
    const ruleEdit = event.target.closest('.policy-rule-edit');
    if (ruleEdit) { const policy = await auth().getPolicy(ruleEdit.dataset.policyId); const rule = (policy.policy_rules || []).find(item => item.id === ruleEdit.dataset.ruleId); if (!rule) { toast('Rule unavailable', 'The rule could not be found.'); return; } showPolicyModal(`<h3>Edit Policy Rule</h3><div class=\"form-grid\"><div class=\"field\"><label>RULE NAME</label><input name=\"edit-rule-name\" class=\"field-input\" value=\"${esc(rule.name)}\"></div><div class=\"field\"><label>ACTION</label><input name=\"edit-rule-action\" class=\"field-input\" value=\"${esc(rule.action)}\"></div><div class=\"field\"><label>RESOURCE</label><input name=\"edit-rule-resource\" class=\"field-input\" value=\"${esc(rule.resource || '')}\"></div><div class=\"field\"><label>EFFECT</label><select name=\"edit-rule-effect\" class=\"field-input\"><option value=\"allow\" ${rule.effect === 'allow' ? 'selected' : ''}>Allow</option><option value=\"deny\" ${rule.effect === 'deny' ? 'selected' : ''}>Deny</option></select></div><div class=\"field\"><label>RISK</label><select name=\"edit-rule-risk\" class=\"field-input\"><option ${rule.risk_level === 'low' ? 'selected' : ''}>low</option><option ${rule.risk_level === 'medium' ? 'selected' : ''}>medium</option><option ${rule.risk_level === 'high' ? 'selected' : ''}>high</option><option ${rule.risk_level === 'critical' ? 'selected' : ''}>critical</option></select></div><div class=\"field\"><label><input name=\"edit-rule-approval\" type=\"checkbox\" ${rule.approval_required ? 'checked' : ''}> Approval required</label></div><div class=\"field full\"><label>CONDITIONS JSON</label><textarea name=\"edit-rule-conditions\" class=\"field-input\" rows=\"3\">${esc(JSON.stringify(rule.conditions || {}, null, 2))}</textarea></div></div><div class=\"form-footer\"><button class=\"app-button modal-close\" type=\"button\">Cancel</button><button class=\"app-button primary policy-rule-edit-submit\" type=\"button\" data-policy-id=\"${esc(policy.id)}\" data-rule-id=\"${esc(rule.id)}\">Save changes</button></div>`); return; }
    const ruleDelete = event.target.closest('.policy-rule-delete');
    if (ruleDelete) { if (!confirm('Delete this rule?')) return; try { await auth().deletePolicyRule(ruleDelete.dataset.ruleId); toast('Rule deleted', 'The policy version was updated.'); await renderPolicyDrawer(document.querySelector('.policy-add-rule')?.dataset.policyId); await sync(); } catch (error) { toast('Rule deletion failed', error?.message || 'Please try again.'); } return; }
    const assign = event.target.closest('.policy-assign');
    if (assign) { const agentId = document.querySelector('.policy-agent-select')?.value; if (!agentId) { toast('Assignment incomplete', 'Select an Agent first.'); return; } assign.disabled = true; try { await auth().assignPolicyToAgent(agentId, assign.dataset.policyId); toast('Policy assigned', 'The Agent-policy assignment was saved.'); await renderPolicyDrawer(assign.dataset.policyId); await sync(); } catch (error) { toast('Assignment failed', error?.message || 'Agent and Policy must share a workspace.'); assign.disabled = false; } return; }
    const unassign = event.target.closest('.policy-unassign');
    if (unassign) { try { await auth().removePolicyFromAgent(unassign.dataset.agentId, unassign.dataset.policyId); toast('Assignment removed', 'The Agent-policy assignment was removed.'); await renderPolicyDrawer(unassign.dataset.policyId); await sync(); } catch (error) { toast('Assignment removal failed', error?.message || 'Please try again.'); } }
  });
  document.addEventListener('click', async event => {
    const target = event.target.closest('.policy-edit-submit');
    if (!target) return;
    target.disabled = true;
    try { await auth().updatePolicy(target.dataset.policyId, { name: policyInput('edit-policy-name'), policyType: policyInput('edit-policy-type'), description: policyInput('edit-policy-description'), status: policyInput('edit-policy-status') }); document.querySelector('#app-modal').hidden = true; toast('Policy updated', 'Changes were saved and the policy version was updated.'); await sync(); await renderPolicyDrawer(target.dataset.policyId); } catch (error) { target.disabled = false; toast('Policy update failed', error?.message || 'Please check the fields.'); }
  }, true);
  document.addEventListener('click', async event => {
    const target = event.target.closest('.policy-rule-edit-submit');
    if (!target) return;
    const value = name => document.querySelector(`#app-modal [name=\"${name}\"]`)?.value || '';
    try { let conditions = {}; try { conditions = JSON.parse(value('edit-rule-conditions') || '{}'); } catch { throw new Error('Conditions must be valid JSON.'); } if (!conditions || Array.isArray(conditions) || typeof conditions !== 'object') throw new Error('Conditions must be a JSON object.'); target.disabled = true; await auth().updatePolicyRule(target.dataset.ruleId, { name: value('edit-rule-name'), action: value('edit-rule-action'), resource: value('edit-rule-resource'), effect: value('edit-rule-effect'), riskLevel: value('edit-rule-risk'), approvalRequired: document.querySelector('#app-modal [name=\"edit-rule-approval\"]')?.checked || false, conditions }); document.querySelector('#app-modal').hidden = true; toast('Rule updated', 'The policy version was updated.'); await renderPolicyDrawer(target.dataset.policyId); await sync(); } catch (error) { target.disabled = false; toast('Rule update failed', error?.message || 'Please check the rule fields.'); }
  }, true);
  document.addEventListener('click', async event => {
    const target = event.target.closest('.policy-rule-submit');
    if (!target) return;
    const value = name => document.querySelector(`#app-modal [name="${name}"]`)?.value || '';
    try { let conditions = {}; try { conditions = JSON.parse(value('new-rule-conditions') || '{}'); } catch { throw new Error('Conditions must be valid JSON.'); } if (!conditions || Array.isArray(conditions) || typeof conditions !== 'object') throw new Error('Conditions must be a JSON object.'); target.disabled = true; await auth().createPolicyRule(target.dataset.policyId, { name: value('new-rule-name'), action: value('new-rule-action'), resource: value('new-rule-resource'), effect: value('new-rule-effect'), riskLevel: value('new-rule-risk'), approvalRequired: document.querySelector('#app-modal [name="new-rule-approval"]')?.checked || false, conditions }); document.querySelector('#app-modal').hidden = true; toast('Rule added', 'The policy version was updated.'); await renderPolicyDrawer(target.dataset.policyId); await sync(); } catch (error) { target.disabled = false; toast('Rule creation failed', error?.message || 'Please check the rule fields.'); }
  }, true);
  const policyFormValue = name => document.querySelector(`#app-modal [name="${name}"]`)?.value || '';
  const readPolicyRuleForm = () => {
    const ruleName = policyFormValue('rule-name').trim();
    if (!ruleName && !policyFormValue('rule-action').trim()) return [];
    if (!ruleName || !policyFormValue('rule-action').trim()) throw new Error('Rule name and action are required.');
    let conditions = {};
    try { conditions = JSON.parse(policyFormValue('rule-conditions') || '{}'); } catch { throw new Error('Conditions must be valid JSON.'); }
    if (!conditions || Array.isArray(conditions) || typeof conditions !== 'object') throw new Error('Conditions must be a JSON object.');
    return [{ name: ruleName, action: policyFormValue('rule-action').trim(), resource: policyFormValue('rule-resource').trim(), effect: policyFormValue('rule-effect') || 'deny', riskLevel: policyFormValue('rule-risk') || 'medium', approvalRequired: document.querySelector('#app-modal [name="rule-approval"]')?.checked || false, conditions }];
  };
  document.addEventListener('click', async event => {
    const target = event.target.closest('.create-policy-submit');
    if (!target) return;
    event.preventDefault();
    try {
      target.disabled = true;
      target.textContent = 'CREATING…';
      await auth().createPolicy({ name: policyFormValue('policy-name'), description: policyFormValue('policy-description'), policyType: policyFormValue('policy-type') || 'access', status: policyFormValue('policy-status') || 'disabled', rules: readPolicyRuleForm() });
      document.querySelector('#app-modal').hidden = true;
      toast('Policy created', 'The policy and supplied rules were saved to this workspace.');
      await sync();
    } catch (error) {
      target.disabled = false;
      target.textContent = 'Create Policy';
      toast('Policy creation failed', error?.message || 'Please check the policy fields.');
    }
  }, true);
})();
