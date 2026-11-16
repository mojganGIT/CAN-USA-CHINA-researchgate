(function(){
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let feed={changes:[],lastRunStatus:'loading'},signedIn=false,key='',model='',provider='openai',answer='',answerSources=[],warning='',evidenceSelection=null;
 const root=document.getElementById('root'),chrome=document.getElementById('agent-tools');
 function date(s){return s?new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(s))+' ET':'Not yet completed';}
 function banner(){chrome.innerHTML=`<div class="automation-nav"><div><strong>Daily policy monitor</strong><span>${feed.lastSuccessfulRun?'Last successful check: '+E(date(feed.lastSuccessfulRun)):'No successful scan recorded yet'} · ${E(feed.lastRunStatus||'unknown')}</span></div></div>`;}
 function safeLink(url,label){try{const u=new URL(url);return u.protocol==='https:'?`<a href="${E(u.href)}" target="_blank" rel="noopener noreferrer">${E(label)} ↗</a>`:'';}catch{return '';}}
 function updates(){window.DailyBriefing.show(root,feed);}
 function isDailyRoute(){return location.hash.split('?')[0]==='#daily-updates';}
 function llm(){

  root.innerHTML=`<div class="wrap"><section class="panel automation"><h2>Bring your own LLM</h2><p>Use your OpenAI or Anthropic API account for a source-grounded briefing. Explanations use the reviewed outcomes records, preserving source dates, geography and attribution limits. Up to 12 relevant records are supplied per request. Your question, selected public evidence and key pass through this dashboard’s authenticated API to your chosen provider. Provider usage is billed to your account. Responses are AI interpretations, not changes to the public research inventory.</p><p>${signedIn?'You are signed in.':'Sign in to send a request: <a href="/.auth/login/github?post_login_redirect_uri=/%23your-llm">GitHub</a> or <a href="/.auth/login/aad?post_login_redirect_uri=/%23your-llm">Microsoft</a>.'}</p><form id="byo-form"><div class="automation-fields"><label for="byo-provider">Provider<select id="byo-provider"><option value="openai" ${provider==='openai'?'selected':''}>OpenAI</option><option value="anthropic" ${provider==='anthropic'?'selected':''}>Anthropic</option></select></label><label for="byo-model">Model ID<input id="byo-model" value="${E(model)}" placeholder="Model ID available in your provider account" required maxlength="160" autocomplete="off"></label></div><label for="byo-key">Provider API key<input id="byo-key" type="password" placeholder="Session only; never saved" required autocomplete="off" maxlength="1000"></label><p class="note">The key stays in this page’s memory until cleared, refreshed or closed. It is not written to cookies, local storage, the repository or application logs.</p><label for="byo-question">Policy question<textarea id="byo-question" required minlength="5" maxlength="5000" rows="4" placeholder="For example: compare Canada’s EV market-access approach with U.S. restrictions."></textarea></label><label class="consent"><input id="byo-scope" type="checkbox" ${evidenceSelection?'checked':''}> Use the selected evidence only (${E(evidenceSelection?.label||window.PolicyExplorer?.model()?.topic.name||'no selection')})</label><label class="consent"><input id="byo-consent" type="checkbox" required> I agree to send my question and the selected public source records to this provider using my API key.</label><div class="chips"><button type="submit" class="btn primary" ${signedIn?'':'disabled'}>Generate cited briefing</button><button type="button" class="btn" id="byo-clear">Clear key and answer</button><button type="button" class="btn" data-agent-view="explorer">Back to evidence explorer</button></div><p id="byo-status" role="status" aria-live="polite"></p></form><section id="byo-answer" aria-live="polite">${answerHTML()}</section></section></div>`;
  root.querySelector('#byo-key').value=key;
  root.querySelector('#byo-key').addEventListener('input',e=>key=e.target.value);
  root.querySelector('#byo-provider').addEventListener('change',e=>{provider=e.target.value;key='';root.querySelector('#byo-key').value='';});
  root.querySelector('#byo-model').addEventListener('input',e=>model=e.target.value);
  root.querySelector('#byo-clear').addEventListener('click',()=>{key='';answer='';answerSources=[];warning='';root.querySelector('#byo-key').value='';root.querySelector('#byo-answer').innerHTML='';root.querySelector('#byo-status').textContent='Key and answer cleared.';});
  root.querySelector('#byo-form').addEventListener('submit',async e=>{
   e.preventDefault();if(!signedIn||!root.querySelector('#byo-consent').checked)return;
   const status=root.querySelector('#byo-status'),button=e.submitter;button.disabled=true;status.textContent='Requesting a source-grounded briefing from your provider…';
   try{
    const question=root.querySelector('#byo-question').value;
    const selection=window.PolicyExplorer?.model();
    const scoped=root.querySelector('#byo-scope').checked;
    const recordIds=scoped?(evidenceSelection?.ids||selection?.items?.map(r=>r.id)||[]):[];
    const response=await fetch('/api/llm',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({provider,model,apiKey:key,question,recordIds,requireSelection:scoped,language:window.DashboardI18n?.language||'en',retrievalQuery:(window.DashboardI18n?.searchQuery(question)||'').slice(0,500)}),signal:AbortSignal.timeout(45000)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'The request failed. Sign in and check your provider settings.');
    answer=data.answer;answerSources=data.sources;warning=data.warning;root.querySelector('#byo-answer').innerHTML=answerHTML();status.textContent='Briefing generated. Check the source IDs and dates below.';
   }catch(e){status.textContent=e.name==='TimeoutError'?'Request timed out. Try again.':e.message;}finally{button.disabled=false;}
  });
 }
 function answerHTML(){return answer?`<h3>Your model’s briefing</h3><p class="note">${E(warning)}</p><div class="automation-answer" translate="no">${E(answer)}</div><h4>Evidence supplied to the model</h4><ul>${answerSources.map(r=>`<li>[${E(r.id)}] ${safeLink(r.url,r.title)} · ${E(r.classification)}</li>`).join('')}</ul>`:'';}
 function show(view){if(view==='updates')updates();else if(view==='llm')llm();else if(view==='explorer')window.HomeHub?.navigate('relationship-explorer');}
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-agent-view]');
  if(!button)return;
  if(button.dataset.agentView==='updates'&&window.HomeHub)window.HomeHub.navigate('daily-updates');
  else show(button.dataset.agentView);
 });
 window.addEventListener('pagehide',()=>{key='';answer='';});
 async function refreshFeed(){
  try{const response=await fetch('policy-updates.json',{cache:'no-store'});if(!response.ok)throw Error('Update status unavailable');const data=await response.json();if(!Array.isArray(data.changes))throw Error('Invalid update feed');feed=data;banner();window.dispatchEvent(new Event('policy-updates-loaded'));if(isDailyRoute())updates();return true;}
  catch{feed={...feed,lastRunStatus:'unavailable'};banner();window.dispatchEvent(new Event('policy-updates-loaded'));if(isDailyRoute())updates();return false;}
 }
 window.PolicyLive={get feed(){return feed;},show,refresh:refreshFeed,setEvidenceSelection(ids,label){evidenceSelection={ids:[...ids],label};}};banner();
 Promise.allSettled([refreshFeed(),fetch('/.auth/me',{cache:'no-store'}).then(r=>r.json()).then(data=>{signedIn=!!data.clientPrincipal;})]).then(()=>{if(isDailyRoute())updates();if(location.hash==='#your-llm')llm();});
 setInterval(()=>{if(!document.hidden)refreshFeed();},5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFeed();});
})();

