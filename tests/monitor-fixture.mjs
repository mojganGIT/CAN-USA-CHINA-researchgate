// Imported only by the offline monitor integration test. Never used in deployment.
const quote='Canada and China agreed to consult on agricultural market access and canola tariffs';
globalThis.fetch=async(url,init={})=>{
 if(process.env.FIXTURE_FAIL==='1')throw new Error('Fixture source unavailable');
 if(String(url).startsWith('https://api.openai.com/'))return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({relevant:true,quote,summary:'The fixture source reports consultations between Canada and China on agricultural market access and canola tariffs.',topics:['agriculture'],issues:['canola'],relationships:['Canada-China'],kind:'consultation',uncertainty:'Implementation and shipment outcomes are not established.'})}]}]}));
 const u=new URL(url),isHub=/news\.html$|\/press-releases$|\/cybersecurity-advisories$|\/News\/$/.test(u.pathname);
 const next=u.pathname.replace(/\.html$/,'')+'/2026/11/fixture-policy.html';
 const html=isHub?`<main><a href="${next}">Canada and China policy consultation update</a></main>`:`<meta property="article:published_time" content="2026-11-03"><main><h1>Canada China agricultural policy consultation</h1><p>${quote}. This publication describes a consultation, not proof of completed purchases or realized trade outcomes. Version ${process.env.FIXTURE_VERSION||'1'}.</p></main>`;
 return new Response(html,{headers:{'content-type':'text/html'}});
};
