// Deterministic source reporting. Analytical prompts are labelled, never treated as outcomes.
import {hash, normalize, classify} from './core.mjs';
const lenses={
 vehicles:['Could changed access affect Canadian assembly, parts or battery suppliers?','Compare vehicle shipments, Canadian supplier contracts and regional assembly employment.'],
 agriculture:['Could Canadian growers, processors or seafood exporters gain or lose market access?','Verify product coverage and customs guidance; compare shipment quantities and values for matching periods.'],
 energy:['Does this change Canadian producers’ buyers, prices or transport options?','Check operating capacity, realized energy shipments and prices separately from proposed projects.'],
 finance:['Does this open an approved service or change Canadian financial risk?','Check regulator decisions, permitted services and completed transactions; a dialogue is not regulatory approval.'],
 technology:['Do Canadian suppliers face new sourcing, export-control or data requirements?','Verify covered technologies and licensing dates, then check Canadian contracts and completed investment.'],
 security:['Does this change Canada’s security cooperation or compliance obligations?','Check binding measures, procurement awards and operational implementation with the responsible authority.'],
 investment:['Will this produce productive capacity or supplier work in Canada?','Verify project location, financial close, actual spending and operating employment.'],
 agreements:['What changes for Canadian market access, obligations or negotiating options?','Obtain the instrument, signatories, product coverage and effective dates before treating access as implemented.']
};

export function sourceSummary(doc,item,kind){
 // The key-free path selects one source-supported passage, never a fabricated
 // paraphrase. Preserve abbreviations while locating complete sentences.
 let body=normalize(doc.text);
 if(body.startsWith(normalize(doc.title)))body=body.slice(normalize(doc.title).length).trim();
 body=body.replace(/^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\s*/i,'');
 const protectedText=body.replace(/\b(?:U\.S\.|U\.K\.|Mr\.|Ms\.|Dr\.|Ltd\.|Inc\.)/g,s=>s.replaceAll('.','\u2024'));
 const sentences=protectedText.split(/(?<=[.!?])\s+/).map(s=>s.replaceAll('\u2024','.')).filter(s=>s.split(/\s+/).length>=8);
 const subject=kind==='MOU'?/memorandum|\bmou\b/i:kind==='contract'?/contract|award/i:kind==='meeting'?/discuss|meet|dialogue|consult/i:kind==='statistics'?/export|import|percent|\d/i:/tariff|agreement|signed|agreed|suspend|extend|implement|announc|policy|trade|market access|consider|discuss/i;
 const passage=sentences.find(s=>subject.test(s)&&s.split(/\s+/).length<=25)||sentences.find(s=>subject.test(s))||sentences[0]||body;
 const words=passage.split(/\s+/).filter(Boolean),quote=normalize(words.slice(0,25).join(' '));
 const assisted=typeof item.ai?.summary==='string'&&item.ai.summary.trim();
 return {text:assisted?item.ai.summary.trim().slice(0,900):quote,method:assisted?'validated_extraction':'source_excerpt',quote,truncated:!assisted&&words.length>25,
  sourceURL:item.url,sourceDigest:item.digest||null,generatedAt:item.detectedAt,reviewState:'source_reported'};
}

export function makeBriefings(doc,item,issuer){
 issuer=/Canada|Canadian/i.test(issuer)?'Canada':/United States|USTR|U\.S\.|White House/i.test(issuer)?'United States':/China|Chinese|MOFCOM/i.test(issuer)?'China':issuer;
 const body=doc.text.slice(0,12000),lead=doc.title+' '+body.slice(0,3500);
 const tags=classify(lead,issuer),headline=classify(doc.title.replace(/[,;]\s*(?:Shenzhen|Beijing|Shanghai|Guangzhou|Vancouver|Ottawa|Washington),?\s*(?:China|Canada|(?:the )?United States)\b.*/i,''),issuer);
 // Location, navigation and third-country mentions do not establish a bilateral event.
 const bilateral=/\b(?:Canada|Canadian)\s*(?:[-–—]|and|&)\s*(?:China|Chinese|the United States|United States|U\.S\.)|\b(?:China|Chinese)\s*(?:[-–—]|and|&)\s*(?:Canada|the United States|United States|U\.S\.)|\b(?:United States|U\.S\.)\s*(?:[-–—]|and|&)\s*(?:China|Canada)/i;
 const explicit=[...body.matchAll(new RegExp(bilateral.source,'gi'))].map(m=>m[0]).join(' ');
 tags.relationships=headline.relationships.length?headline.relationships:classify(explicit,issuer).relationships;
 if(issuer==='Canada')tags.relationships=tags.relationships.filter(r=>r.startsWith('Canada-'));
 if(issuer==='United States')tags.relationships=tags.relationships.filter(r=>r==='Canada-USA'||r==='USA-China');
 if(issuer==='China')tags.relationships=tags.relationships.filter(r=>r.endsWith('-China'));
 // A publication must name another monitored country and a policy subject.
 if(!tags.relationships.length||!tags.topics.length||!/(?:memorandum|\bmou\b|agreement|tariff|regulat|policy|dialogue|consult|readout|export|investment|joint statement|declaration|market access|trade|cooperation|contract|procurement|award)/i.test(lead))return [];
 const contract=/contract|procurement/i.test(doc.title)&&/awarded|signed|contract award/i.test(body);
 const mou=/memorand(?:um|a) of understanding|\bMOU\b/i.test(doc.title);
 const framework=/declaration|joint (?:statement|outcomes)|roadmap|framework/i.test(doc.title);
 const meeting=/readout|press conference|dialogue|consultation|\bmeets?\b|\bmeeting\b/i.test(doc.title);
 const statistics=/monthly trade report|foreign direct investment,|international merchandise trade|trade in goods with/i.test(doc.title);
 // A framework or readout can mention many instruments. Its own document
 // type takes precedence; the mention does not verify a new MOU signature.
 const kind=contract?'contract':mou?'MOU':statistics?'statistics':framework?'recommendation':meeting?'meeting':'policy';
 const status=contract?'Contract award reported · review pending':kind==='MOU'?'MOU reported':kind==='meeting'?'Dialogue or readout':kind==='recommendation'?'Statement or framework':kind==='statistics'?'Data released':'Official announcement';
 const summary=sourceSummary(doc,item,kind),quote=summary.quote;
 const topic=tags.topics.find(t=>t!=='agreements')||'agreements';
 const [decisionQuestion,followUp]=lenses[topic];
 return tags.relationships.map(relationship=>({
  id:'brief-'+hash(item.url+'|'+relationship).slice(0,20),versionId:item.id,
  date:doc.publicationDate,dateType:doc.publicationDate?'source_publication':'publication_unknown',
  publicationDate:doc.publicationDate,modifiedDate:doc.modifiedDate||null,
  detectedAt:item.detectedAt,checkedAt:item.detectedAt,changeType:item.changeType,
  kind,relationship,topics:tags.topics,title:doc.title,implementationStatus:'unverified',
  changed:summary.text,sourceSummary:summary,
  quote,canada:decisionQuestion,decisionQuestion,followUp,status,
  limit:'Automatic source report; analyst review pending. The excerpt establishes what the authority reports. Legal effect, compliance and Canadian gains or losses require separate evidence.',
  confidence:'Official source · analyst review pending',reviewState:'source_reported',
  sources:[{publisher:item.source,url:item.url,publicationDate:doc.publicationDate}],
  digest:item.digest,previousDigest:item.previousDigest||null
 }));
}
