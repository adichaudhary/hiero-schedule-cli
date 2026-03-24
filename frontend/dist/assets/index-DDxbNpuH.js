(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const g={mainnet:"https://mainnet-public.mirrornode.hedera.com",testnet:"https://testnet.mirrornode.hedera.com",previewnet:"https://previewnet.mirrornode.hedera.com"};function x(e,t){return e!=null?"EXECUTED":t?"DELETED":"PENDING"}async function D(e,t="testnet"){var l;const s=`${g[t]??g.testnet}/api/v1/schedules/${e}`,n=await fetch(s);if(n.status===404)throw new Error(`Schedule ${e} not found on ${t}`);if(!n.ok)throw new Error(`Mirror node returned HTTP ${n.status}`);const a=await n.json(),r=x(a.executed_timestamp,!!a.deleted);return{scheduleId:e,state:r,executed:r==="EXECUTED",deleted:r==="DELETED",signaturesCollected:((l=a.signatures)==null?void 0:l.length)??0,createdAt:a.consensus_timestamp?new Date(Number(a.consensus_timestamp.split(".")[0])*1e3).toISOString():void 0,expiresAt:a.expiration_time?new Date(Number(a.expiration_time.split(".")[0])*1e3).toISOString():void 0,memo:a.memo||void 0,network:t}}async function K(e,t="testnet"){var l;const s=`${g[t]??g.testnet}/api/v1/schedules/${e}`,n=await fetch(s);if(n.status===404)throw new Error(`Schedule ${e} not found on ${t}`);if(!n.ok)throw new Error(`Mirror node returned HTTP ${n.status}`);const a=await n.json(),r=x(a.executed_timestamp,!!a.deleted);return{scheduleId:e,state:r,signaturesCollected:((l=a.signatures)==null?void 0:l.length)??0,signatures:(a.signatures??[]).map(o=>({publicKeyPrefix:o.public_key_prefix??"",type:o.type??"UNKNOWN",consensusTimestamp:o.consensus_timestamp})),network:t}}class U{constructor(t){this.timerId=null,this.startedAt=null,this.running=!1,this.options={scheduleId:t.scheduleId,network:t.network??"testnet",intervalMs:t.intervalMs??5e3,timeoutMs:t.timeoutMs??36e5,onPoll:t.onPoll,onTerminal:t.onTerminal,onTimeout:t.onTimeout,onError:t.onError}}start(){this.running||(this.running=!0,this.startedAt=Date.now(),this.schedule())}stop(){this.running=!1,this.timerId!==null&&(clearTimeout(this.timerId),this.timerId=null)}schedule(){this.timerId=setTimeout(()=>{this.poll().catch(()=>{})},this.options.intervalMs)}async poll(){var i,s,n,a,r,l,o,M;if(!this.running)return;if(Date.now()-(this.startedAt??Date.now())>=this.options.timeoutMs){this.stop(),(s=(i=this.options).onTimeout)==null||s.call(i);return}try{const d=await D(this.options.scheduleId,this.options.network);if((a=(n=this.options).onPoll)==null||a.call(n,d),d.state==="EXECUTED"||d.state==="DELETED"){this.stop(),(l=(r=this.options).onTerminal)==null||l.call(r,d);return}}catch(d){const _=d instanceof Error?d:new Error(String(d));(M=(o=this.options).onError)==null||M.call(o,_)}this.running&&this.schedule()}}const R="http://localhost:3001";let f="status",c="",m="testnet",u=null,p=!1;const b=document.getElementById("network-select"),T=document.getElementById("schedule-input"),W=document.getElementById("search-btn"),E=document.getElementById("create-btn"),I=document.getElementById("tabs"),h=document.getElementById("panel"),B=document.getElementById("create-form");function w(e){return e?new Date(e).toLocaleString(void 0,{dateStyle:"medium",timeStyle:"short"}):"—"}function P(){return new Date().toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",second:"2-digit"})}function k(e){return e==="EXECUTED"?"badge-executed":e==="DELETED"?"badge-deleted":"badge-pending"}function C(e="Fetching…"){h.innerHTML=`<div class="loading"><div class="spinner"></div>${e}</div>`}function H(e){h.innerHTML=`<div class="error-box">${e}</div>`}async function N(e,t){const i=await fetch(`${R}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),s=await i.json();if(!i.ok)throw new Error(s.error??`Server error ${i.status}`);return s}function S(){p=!p,B.style.display=p?"block":"none",E.textContent=p?"✕ Cancel":"+ Create",E.classList.toggle("cancel",p),p&&(B.innerHTML=`
    <div class="create-form-inner">
      <h3 class="form-title">Create Scheduled Transfer</h3>
      <p class="form-note">⚠️ Local dev only — credentials are sent to your local server at port 3001.</p>

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

      <div class="form-actions">
        <button id="cf-submit" class="btn-primary">Create Schedule →</button>
        <div id="cf-status" class="form-status"></div>
      </div>
    </div>
  `,document.getElementById("cf-submit").addEventListener("click",j))}async function j(){const e=document.getElementById("cf-submit"),t=document.getElementById("cf-status"),i=document.getElementById("cf-account").value.trim(),s=document.getElementById("cf-key").value.trim(),n=document.getElementById("cf-to").value.trim(),a=document.getElementById("cf-amount").value.trim(),r=document.getElementById("cf-memo").value.trim(),l=parseInt(document.getElementById("cf-expiry").value,10);if(!i||!s||!n||!a){t.innerHTML='<span class="form-error">All fields except memo are required.</span>';return}e.disabled=!0,t.innerHTML='<span class="form-info"><span class="spinner-inline"></span> Submitting to Hedera…</span>';try{const o=await N("/api/schedules",{accountId:i,privateKey:s,network:m,to:n,amount:a,memo:r||void 0,expirySeconds:l||2592e3});t.innerHTML=`<span class="form-success">✓ Created: <strong>${o.scheduleId}</strong></span>`,setTimeout(()=>{S(),T.value=o.scheduleId,c=o.scheduleId,f="status",I.style.display="flex",L("status"),y()},1200)}catch(o){t.innerHTML=`<span class="form-error">✗ ${o.message}</span>`,e.disabled=!1}}function F(){return`
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
  `}function X(){var e;(e=document.getElementById("sign-submit"))==null||e.addEventListener("click",q)}async function q(){const e=document.getElementById("sign-submit"),t=document.getElementById("sign-status"),i=document.getElementById("sign-account").value.trim(),s=document.getElementById("sign-key").value.trim();if(!i||!s){t.innerHTML='<span class="form-error">Account ID and private key are required.</span>';return}e.disabled=!0,t.innerHTML='<span class="form-info"><span class="spinner-inline"></span> Signing…</span>';try{await N(`/api/schedules/${c}/sign`,{accountId:i,privateKey:s,network:m}),t.innerHTML='<span class="form-success">✓ Signed — refreshing status…</span>',setTimeout(()=>void y(),1500)}catch(n){t.innerHTML=`<span class="form-error">✗ ${n.message}</span>`,e.disabled=!1}}async function y(){C();try{const e=await D(c,m);h.innerHTML=G(e)+(e.state==="PENDING"?F():""),e.state==="PENDING"&&X()}catch(e){H(e.message)}}function G(e){return`
    <div class="status-grid">
      <div class="stat-card">
        <div class="stat-label">State</div>
        <div class="stat-value"><span class="badge ${k(e.state)}">${e.state}</span></div>
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
        <div class="stat-value">${w(e.createdAt)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expires At</div>
        <div class="stat-value">${w(e.expiresAt)}</div>
      </div>
      ${e.memo?`
      <div class="stat-card memo-card">
        <div class="stat-label">Memo</div>
        <div class="stat-value">${e.memo}</div>
      </div>`:""}
    </div>
  `}async function J(){C();try{const e=await K(c,m);h.innerHTML=V(e)}catch(e){H(e.message)}}function V(e){const t=e.signatures.length===0?'<tr><td colspan="4" class="no-signers">No signatures collected yet.</td></tr>':e.signatures.map((i,s)=>`
        <tr>
          <td>${s+1}</td>
          <td>${i.publicKeyPrefix||"—"}</td>
          <td>${i.type}</td>
          <td>${i.consensusTimestamp?w(new Date(Number(i.consensusTimestamp.split(".")[0])*1e3).toISOString()):"—"}</td>
        </tr>
      `).join("");return`
    <div class="signers-header">
      <span class="badge ${k(e.state)}">${e.state}</span>
      <span class="signers-count">${e.signaturesCollected} signature(s) collected</span>
    </div>
    <table class="signers-table">
      <thead>
        <tr><th>#</th><th>Public Key Prefix</th><th>Type</th><th>Signed At</th></tr>
      </thead>
      <tbody>${t}</tbody>
    </table>
  `}function Y(){$(),h.innerHTML=z(),Q()}function z(){return`
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
        <span class="log-time">${P()}</span>
        <span class="log-msg warn">Ready — press Start to begin polling ${c}</span>
      </div>
    </div>
  `}function Q(){const e=document.getElementById("watch-start-btn"),t=document.getElementById("watch-stop-btn"),i=document.getElementById("interval-input");e.addEventListener("click",()=>{const s=Math.max(2,Number(i.value))*1e3;e.disabled=!0,t.disabled=!1,v(`Watching ${c} on ${m} every ${s/1e3}s…`,"warn"),Z(s,t,e)}),t.addEventListener("click",()=>{$(),e.disabled=!1,t.disabled=!0,v("Stopped.","warn")})}function v(e,t=""){const i=document.getElementById("watch-log");if(!i)return;const s=document.createElement("div");s.className="log-entry",s.innerHTML=`<span class="log-time">${P()}</span><span class="log-msg ${t}">${e}</span>`,i.appendChild(s),i.scrollTop=i.scrollHeight}function Z(e,t,i){u=new U({scheduleId:c,network:m,intervalMs:e,timeoutMs:60*60*1e3,onPoll:s=>v(`Poll → state: ${s.state}, signatures: ${s.signaturesCollected}`),onTerminal:s=>{v(`Terminal state reached: ${s.state}`,s.state==="EXECUTED"?"success":"error"),t.disabled=!0,i.disabled=!1,u=null},onTimeout:()=>{v("Watch timed out (1 hour elapsed).","error"),t.disabled=!0,i.disabled=!1,u=null},onError:s=>v(`Error: ${s.message}`,"error")}),u.start()}function $(){u==null||u.stop(),u=null}function L(e){f=e,document.querySelectorAll(".tab").forEach(t=>{t.classList.toggle("active",t.dataset.tab===e)})}function A(){$(),f==="status"&&y(),f==="signers"&&J(),f==="watch"&&Y()}function O(){const e=T.value.trim();e&&(p&&S(),c=e,m=b.value,f="status",I.style.display="flex",L("status"),y())}W.addEventListener("click",O);T.addEventListener("keydown",e=>{e.key==="Enter"&&O()});E.addEventListener("click",S);I.addEventListener("click",e=>{const t=e.target.dataset.tab;t&&t!==f&&(L(t),A())});b.addEventListener("change",()=>{m=b.value,c&&A()});
