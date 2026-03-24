(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const S={mainnet:"https://mainnet-public.mirrornode.hedera.com",testnet:"https://testnet.mirrornode.hedera.com",previewnet:"https://previewnet.mirrornode.hedera.com"};function O(e,t){return e!=null?"EXECUTED":t?"DELETED":"PENDING"}async function A(e,t="testnet"){var c;const n=`${S[t]??S.testnet}/api/v1/schedules/${e}`,r=await fetch(n);if(r.status===404)throw new Error(`Schedule ${e} not found on ${t}`);if(!r.ok)throw new Error(`Mirror node returned HTTP ${r.status}`);const a=await r.json(),i=O(a.executed_timestamp,!!a.deleted);return{scheduleId:e,state:i,executed:i==="EXECUTED",deleted:i==="DELETED",signaturesCollected:((c=a.signatures)==null?void 0:c.length)??0,createdAt:a.consensus_timestamp?new Date(Number(a.consensus_timestamp.split(".")[0])*1e3).toISOString():void 0,expiresAt:a.expiration_time?new Date(Number(a.expiration_time.split(".")[0])*1e3).toISOString():void 0,memo:a.memo||void 0,network:t}}async function W(e,t="testnet"){var c;const n=`${S[t]??S.testnet}/api/v1/schedules/${e}`,r=await fetch(n);if(r.status===404)throw new Error(`Schedule ${e} not found on ${t}`);if(!r.ok)throw new Error(`Mirror node returned HTTP ${r.status}`);const a=await r.json(),i=O(a.executed_timestamp,!!a.deleted);return{scheduleId:e,state:i,signaturesCollected:((c=a.signatures)==null?void 0:c.length)??0,signatures:(a.signatures??[]).map(o=>({publicKeyPrefix:o.public_key_prefix??"",type:o.type??"UNKNOWN",consensusTimestamp:o.consensus_timestamp})),network:t}}class F{constructor(t){this.timerId=null,this.startedAt=null,this.running=!1,this.options={scheduleId:t.scheduleId,network:t.network??"testnet",intervalMs:t.intervalMs??5e3,timeoutMs:t.timeoutMs??36e5,onPoll:t.onPoll,onTerminal:t.onTerminal,onTimeout:t.onTimeout,onError:t.onError}}start(){this.running||(this.running=!0,this.startedAt=Date.now(),this.schedule())}stop(){this.running=!1,this.timerId!==null&&(clearTimeout(this.timerId),this.timerId=null)}schedule(){this.timerId=setTimeout(()=>{this.poll().catch(()=>{})},this.options.intervalMs)}async poll(){var s,n,r,a,i,c,o,h;if(!this.running)return;if(Date.now()-(this.startedAt??Date.now())>=this.options.timeoutMs){this.stop(),(n=(s=this.options).onTimeout)==null||n.call(s);return}try{const l=await A(this.options.scheduleId,this.options.network);if((a=(r=this.options).onPoll)==null||a.call(r,l),l.state==="EXECUTED"||l.state==="DELETED"){this.stop(),(c=(i=this.options).onTerminal)==null||c.call(i,l);return}}catch(l){const y=l instanceof Error?l:new Error(String(l));(h=(o=this.options).onError)==null||h.call(o,y)}this.running&&this.schedule()}}const R="http://localhost:3001";let g="status",d="",u="testnet",p=null,m=!1,b="single";const L=document.getElementById("network-select"),x=document.getElementById("schedule-input"),G=document.getElementById("search-btn"),k=document.getElementById("create-btn"),X=document.getElementById("registry-btn"),w=document.getElementById("tabs"),f=document.getElementById("panel"),j=document.getElementById("create-form");function $(e){return e?new Date(e).toLocaleString(void 0,{dateStyle:"medium",timeStyle:"short"}):"—"}function _(){return new Date().toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",second:"2-digit"})}function H(e){return e==="EXECUTED"?"badge-executed":e==="DELETED"?"badge-deleted":"badge-pending"}function M(e="Fetching…"){f.innerHTML=`<div class="loading"><div class="spinner"></div>${e}</div>`}function B(e){f.innerHTML=`<div class="error-box">${e}</div>`}async function P(e,t){const s=await fetch(`${R}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),n=await s.json();if(!s.ok)throw new Error(n.error??`Server error ${s.status}`);return n}async function z(e){const t=await fetch(`${R}${e}`),s=await t.json();if(!t.ok)throw new Error(s.error??`Server error ${t.status}`);return s}function D(){m=!m,j.style.display=m?"block":"none",k.textContent=m?"✕ Cancel":"+ Create",k.classList.toggle("cancel",m),m&&K()}function K(){j.innerHTML=`
    <div class="create-form-inner">
      <h3 class="form-title">Create Scheduled Transfer</h3>
      <p class="form-note">⚠️ Local dev only — credentials are sent to your local server at port 3001.</p>

      <div class="mode-toggle">
        <button class="mode-btn ${b==="single"?"active":""}" data-mode="single">Single Transfer</button>
        <button class="mode-btn ${b==="recurring"?"active":""}" data-mode="recurring">Recurring</button>
      </div>

      <div class="form-section-label">Your Credentials (Payer)</div>
      <div class="form-row">
        <div class="form-field">
          <label>Account ID</label>
          <input id="cf-account" type="text" placeholder="0.0.12345" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Private Key</label>
          <input id="cf-key" type="password" placeholder="302e020100..." spellcheck="false" />
        </div>
      </div>

      <div class="form-section-label">Transfer Details</div>
      <div class="form-row">
        <div class="form-field">
          <label>Recipient Account ID</label>
          <input id="cf-to" type="text" placeholder="0.0.67890" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Amount (tinybars)</label>
          <input id="cf-amount" type="text" placeholder="100000000" spellcheck="false" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Memo (optional)</label>
          <input id="cf-memo" type="text" placeholder="Payment for..." maxlength="100" />
        </div>
        <div class="form-field">
          <label>Expiry (seconds)</label>
          <input id="cf-expiry" type="number" placeholder="2592000" value="2592000" min="1" />
        </div>
      </div>

      ${b==="recurring"?`
      <div class="form-section-label">Recurring Options</div>
      <div class="form-row">
        <div class="form-field">
          <label>Number of Payments</label>
          <input id="cf-count" type="number" placeholder="12" value="3" min="1" max="50" />
        </div>
        <div class="form-field">
          <label>Interval Between Payments (seconds)</label>
          <input id="cf-interval" type="number" placeholder="2592000" value="2592000" min="1" />
        </div>
      </div>`:""}

      <div class="form-actions">
        <button id="cf-submit" class="btn-primary">
          ${b==="recurring"?"Create Recurring Schedules →":"Create Schedule →"}
        </button>
        <div id="cf-status" class="form-status"></div>
      </div>
    </div>
  `,document.querySelectorAll(".mode-btn").forEach(e=>{e.addEventListener("click",()=>{b=e.dataset.mode,K()})}),document.getElementById("cf-submit").addEventListener("click",()=>{b==="recurring"?J():V()})}async function V(){const e=document.getElementById("cf-submit"),t=document.getElementById("cf-status"),s=document.getElementById("cf-account").value.trim(),n=document.getElementById("cf-key").value.trim(),r=document.getElementById("cf-to").value.trim(),a=document.getElementById("cf-amount").value.trim(),i=document.getElementById("cf-memo").value.trim(),c=parseInt(document.getElementById("cf-expiry").value,10);if(!s||!n||!r||!a){t.innerHTML='<span class="form-error">All fields except memo are required.</span>';return}e.disabled=!0,t.innerHTML='<span class="form-info"><span class="spinner-inline"></span> Submitting to Hedera…</span>';try{const o=await P("/api/schedules",{accountId:s,privateKey:n,network:u,to:r,amount:a,memo:i||void 0,expirySeconds:c||2592e3});t.innerHTML=`<span class="form-success">✓ Created: <strong>${o.scheduleId}</strong></span>`,setTimeout(()=>{D(),x.value=o.scheduleId,d=o.scheduleId,w.style.display="flex",C("status"),I()},1200)}catch(o){t.innerHTML=`<span class="form-error">✗ ${o.message}</span>`,e.disabled=!1}}async function J(){const e=document.getElementById("cf-submit"),t=document.getElementById("cf-status"),s=document.getElementById("cf-account").value.trim(),n=document.getElementById("cf-key").value.trim(),r=document.getElementById("cf-to").value.trim(),a=document.getElementById("cf-amount").value.trim(),i=document.getElementById("cf-memo").value.trim(),c=parseInt(document.getElementById("cf-expiry").value,10),o=parseInt(document.getElementById("cf-count").value,10),h=parseInt(document.getElementById("cf-interval").value,10);if(!s||!n||!r||!a||!o){t.innerHTML='<span class="form-error">All fields except memo are required.</span>';return}e.disabled=!0,t.innerHTML=`<span class="form-info"><span class="spinner-inline"></span> Creating ${o} schedules…</span>`;try{const l=await P("/api/schedules/recurring",{accountId:s,privateKey:n,network:u,to:r,amount:a,count:o,memo:i||void 0,firstExpirySeconds:c||2592e3,intervalSeconds:h||2592e3}),y=l.results.map(v=>`<tr><td>${v.index}</td><td class="mono">${v.scheduleId}</td><td><span class="badge badge-pending">PENDING</span></td></tr>`).join(""),T=l.errors.map(v=>`<tr><td>${v.index}</td><td colspan="2" class="form-error">${v.error}</td></tr>`).join("");t.innerHTML=`
      <div style="margin-top:14px">
        <span class="form-success">✓ ${l.succeeded} of ${l.total} schedules created</span>
        <table class="signers-table" style="margin-top:10px">
          <thead><tr><th>#</th><th>Schedule ID</th><th>State</th></tr></thead>
          <tbody>${y}${T}</tbody>
        </table>
      </div>
    `,e.disabled=!1}catch(l){t.innerHTML=`<span class="form-error">✗ ${l.message}</span>`,e.disabled=!1}}async function Y(){m&&D(),w.style.display="none",d="",M("Loading registry…");try{const e=await z("/api/registry");if(e.length===0){f.innerHTML=`
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <p>No schedules in local registry yet. Create one to get started.</p>
        </div>`;return}const t=e.map(s=>`
      <tr class="registry-row" data-id="${s.scheduleId}" data-network="${s.network}">
        <td class="mono">${s.scheduleId}</td>
        <td>${s.network}</td>
        <td><span class="badge ${H(s.state)}">${s.state}</span></td>
        <td>${$(s.createdAt)}</td>
        <td>${$(s.expiresAt??null)}</td>
        <td>${(s.tags??[]).map(n=>`<span class="tag">${n}</span>`).join(" ")||"—"}</td>
      </tr>
    `).join("");f.innerHTML=`
      <div class="registry-header">
        <span class="form-title">Local Registry</span>
        <span class="signers-count">${e.length} schedule(s)</span>
      </div>
      <p class="registry-hint">Click a row to load that schedule.</p>
      <table class="signers-table">
        <thead>
          <tr>
            <th>Schedule ID</th><th>Network</th><th>State</th>
            <th>Created</th><th>Expires</th><th>Tags</th>
          </tr>
        </thead>
        <tbody>${t}</tbody>
      </table>
    `,document.querySelectorAll(".registry-row").forEach(s=>{s.addEventListener("click",()=>{const n=s.dataset.id,r=s.dataset.network;x.value=n,d=n,u=r,L.value=r,w.style.display="flex",C("status"),I()})})}catch(e){B(`Could not load registry — is the local server running?
${e.message}`)}}function Q(){return`
    <div class="sign-section">
      <div class="sign-title">Sign this Schedule</div>
      <div class="form-row">
        <div class="form-field">
          <label>Account ID</label>
          <input id="sign-account" type="text" placeholder="0.0.12345" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Private Key</label>
          <input id="sign-key" type="password" placeholder="302e020100..." spellcheck="false" />
        </div>
      </div>
      <div class="form-actions">
        <button id="sign-submit" class="btn-primary">Sign →</button>
        <div id="sign-status" class="form-status"></div>
      </div>
    </div>
  `}function Z(){var e;(e=document.getElementById("sign-submit"))==null||e.addEventListener("click",()=>void ee())}async function ee(){const e=document.getElementById("sign-submit"),t=document.getElementById("sign-status"),s=document.getElementById("sign-account").value.trim(),n=document.getElementById("sign-key").value.trim();if(!s||!n){t.innerHTML='<span class="form-error">Account ID and private key are required.</span>';return}e.disabled=!0,t.innerHTML='<span class="form-info"><span class="spinner-inline"></span> Signing…</span>';try{await P(`/api/schedules/${d}/sign`,{accountId:s,privateKey:n,network:u}),t.innerHTML='<span class="form-success">✓ Signed — refreshing status…</span>',setTimeout(()=>void I(),1500)}catch(r){t.innerHTML=`<span class="form-error">✗ ${r.message}</span>`,e.disabled=!1}}async function I(){M();try{const e=await A(d,u);f.innerHTML=te(e)+(e.state==="PENDING"?Q():""),e.state==="PENDING"&&Z()}catch(e){B(e.message)}}function te(e){return`
    <div class="status-grid">
      <div class="stat-card">
        <div class="stat-label">State</div>
        <div class="stat-value"><span class="badge ${H(e.state)}">${e.state}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Signatures Collected</div>
        <div class="stat-value">${e.signaturesCollected}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Schedule ID</div>
        <div class="stat-value">${e.scheduleId}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Network</div>
        <div class="stat-value">${e.network}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Created At</div>
        <div class="stat-value">${$(e.createdAt)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expires At</div>
        <div class="stat-value">${$(e.expiresAt)}</div>
      </div>
      ${e.memo?`<div class="stat-card memo-card"><div class="stat-label">Memo</div><div class="stat-value">${e.memo}</div></div>`:""}
    </div>
  `}async function se(){M();try{const e=await W(d,u);f.innerHTML=ne(e)}catch(e){B(e.message)}}function ne(e){const t=e.signatures.length===0?'<tr><td colspan="4" class="no-signers">No signatures collected yet.</td></tr>':e.signatures.map((s,n)=>`
        <tr>
          <td>${n+1}</td>
          <td>${s.publicKeyPrefix||"—"}</td>
          <td>${s.type}</td>
          <td>${s.consensusTimestamp?$(new Date(Number(s.consensusTimestamp.split(".")[0])*1e3).toISOString()):"—"}</td>
        </tr>`).join("");return`
    <div class="signers-header">
      <span class="badge ${H(e.state)}">${e.state}</span>
      <span class="signers-count">${e.signaturesCollected} signature(s) collected</span>
    </div>
    <table class="signers-table">
      <thead><tr><th>#</th><th>Public Key Prefix</th><th>Type</th><th>Signed At</th></tr></thead>
      <tbody>${t}</tbody>
    </table>
  `}async function ae(){M();try{const e=await A(d,u);f.innerHTML=re(e)}catch(e){B(e.message)}}function re(e){const t=e.state==="EXECUTED"?"✓":e.state==="DELETED"?"✗":"⏳";let s="",n="";if(e.createdAt&&e.expiresAt){const o=new Date(e.createdAt).getTime(),h=new Date(e.expiresAt).getTime(),l=Date.now(),y=Math.max(0,Math.min(100,(l-o)/(h-o)*100)),T=Math.round(y/100*40),v=40-T;s="█".repeat(T)+"░".repeat(v),n=`${Math.round(y)}% of expiry window elapsed`}const r=e.signaturesCollected>0?"█".repeat(Math.min(e.signaturesCollected*5,40))+"░".repeat(Math.max(0,40-e.signaturesCollected*5)):"░".repeat(40),a=64,i="─".repeat(a);return`<pre class="viz-output">${[`┌${i}┐`,`│  Schedule Lifecycle: ${e.scheduleId.padEnd(a-22)}  │`,`├${i}┤`,"│                                                                  │",`│  CREATED ──────────── PENDING ──────────── ${`${t} ${e.state}`.padEnd(18)}│`,"│                                                                  │",`├${i}┤`,`│  State:         ${e.state.padEnd(a-17)}│`,`│  Signatures:    ${String(e.signaturesCollected).padEnd(a-17)}│`,e.createdAt?`│  Created:       ${new Date(e.createdAt).toLocaleString().padEnd(a-17)}│`:null,e.expiresAt?`│  Expires:       ${new Date(e.expiresAt).toLocaleString().padEnd(a-17)}│`:null,e.memo?`│  Memo:          ${e.memo.slice(0,a-17).padEnd(a-17)}│`:null,"│                                                                  │",s?`│  Time elapsed:  ${s}│`:null,s?`│                 ${n.padEnd(a-17)}│`:null,`│  Sig progress:  ${r}│`,"│                                                                  │",`└${i}┘`].filter(Boolean).join(`
`)}</pre>`}function ie(){N(),f.innerHTML=oe(),le()}function oe(){return`
    <div class="watch-controls">
      <button id="watch-start-btn">▶ Start Watching</button>
      <button id="watch-stop-btn" disabled>■ Stop</button>
      <div class="watch-interval">
        Poll every
        <input id="interval-input" type="number" value="5" min="2" max="60" />
        seconds
      </div>
    </div>
    <div class="watch-log" id="watch-log">
      <div class="log-entry">
        <span class="log-time">${_()}</span>
        <span class="log-msg warn">Ready — press Start to begin polling ${d}</span>
      </div>
    </div>
  `}function le(){const e=document.getElementById("watch-start-btn"),t=document.getElementById("watch-stop-btn"),s=document.getElementById("interval-input");e.addEventListener("click",()=>{const n=Math.max(2,Number(s.value))*1e3;e.disabled=!0,t.disabled=!1,E(`Watching ${d} on ${u} every ${n/1e3}s…`,"warn"),ce(n,t,e)}),t.addEventListener("click",()=>{N(),e.disabled=!1,t.disabled=!0,E("Stopped.","warn")})}function E(e,t=""){const s=document.getElementById("watch-log");if(!s)return;const n=document.createElement("div");n.className="log-entry",n.innerHTML=`<span class="log-time">${_()}</span><span class="log-msg ${t}">${e}</span>`,s.appendChild(n),s.scrollTop=s.scrollHeight}function ce(e,t,s){p=new F({scheduleId:d,network:u,intervalMs:e,timeoutMs:60*60*1e3,onPoll:n=>E(`Poll → state: ${n.state}, signatures: ${n.signaturesCollected}`),onTerminal:n=>{E(`Terminal state reached: ${n.state}`,n.state==="EXECUTED"?"success":"error"),t.disabled=!0,s.disabled=!1,p=null},onTimeout:()=>{E("Watch timed out (1 hour elapsed).","error"),t.disabled=!0,s.disabled=!1,p=null},onError:n=>E(`Error: ${n.message}`,"error")}),p.start()}function N(){p==null||p.stop(),p=null}function C(e){g=e,document.querySelectorAll(".tab").forEach(t=>{t.classList.toggle("active",t.dataset.tab===e)})}function U(){N(),g==="status"&&I(),g==="signers"&&se(),g==="watch"&&ie(),g==="viz"&&ae()}function q(){const e=x.value.trim();e&&(m&&D(),d=e,u=L.value,g="status",w.style.display="flex",C("status"),I())}G.addEventListener("click",q);x.addEventListener("keydown",e=>{e.key==="Enter"&&q()});k.addEventListener("click",D);X.addEventListener("click",()=>void Y());w.addEventListener("click",e=>{const t=e.target.dataset.tab;t&&t!==g&&(C(t),U())});L.addEventListener("change",()=>{u=L.value,d&&U()});
