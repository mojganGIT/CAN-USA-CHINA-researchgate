// Shared by the scheduled extractor and the authenticated BYO-LLM endpoint.
export const PROVIDERS=['openai','anthropic'];
export async function complete({provider,apiKey,model,system,input,maxTokens=1200,fetchImpl=fetch}){
 if(!PROVIDERS.includes(provider))throw new Error('Unsupported provider.');
 if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>1000||/[\r\n]/.test(apiKey))throw new Error('A valid provider API key is required.');
 if(typeof model!=='string'||!model.trim()||model.length>160)throw new Error('Enter a model ID from your provider.');
 const openai=provider==='openai';
 const body=openai?{model,store:false,instructions:system,input,max_output_tokens:maxTokens}:{model,max_tokens:maxTokens,system,messages:[{role:'user',content:input}]};
 const response=await fetchImpl(openai?'https://api.openai.com/v1/responses':'https://api.anthropic.com/v1/messages',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(35000),headers:{'content-type':'application/json',...(openai?{authorization:'Bearer '+apiKey}:{'x-api-key':apiKey,'anthropic-version':'2023-06-01'})},body:JSON.stringify(body)
 });
 if(!response.ok){const kind=response.status===401||response.status===403?'Provider rejected the key or model access.':response.status===429?'Provider rate or spending limit reached.':'Provider request failed.';throw new Error(kind);}
 const data=await response.json();
 const answer=openai?(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n'):(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
 if(!answer.trim())throw new Error('The provider returned no answer. Try another model or a shorter question.');
 return {text:answer.slice(0,24000),usage:data.usage||null};
}
