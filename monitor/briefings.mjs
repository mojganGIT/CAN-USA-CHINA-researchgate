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
export function makeBriefings(doc,item,issuer){
 const body=doc.text.slice(0,12000),lead=doc.title+' '+body.slice(0,3500);
 const tags=classify(lead,issuer),headline=classify(doc.title,issuer);
 // Location, navigation and third-country mentions do not establish a bilateral event.
 const bilateral=/\b(?:Canada|Canadian)\s*(?:[-–—]|and|&)\s*(?:China|Chinese|the United States|United States|U\.S\.)|\b(?:China|Chinese)\s*(?:[-–—]|and|&)\s*(?:Canada|the United States|United States|U\.S\.)|\b(?:United States|U\.S\.)\s*(?:[-–—]|and|&)\s*(?:China|Canada)/i;
 const explicit=[...body.matchAll(new RegExp(bilateral.source,'gi'))].map(m=>m[0]).join(' ');
 tags.relationships=headline.relationships.length?headline.relationships:classify(explicit,issuer).relationships;
 if(issuer==='Canada')tags.relationships=tags.relationships.filter(r=>r.startsWith('Canada-'));
 if(issuer==='United States')tags.relationships=tags.relationships.filter(r=>r==='Canada-USA'||r==='USA-China');
 if(issuer==='China')tags.relationships=tags.relationships.filter(r=>r.endsWith('-China'));
 // A publication must name another monitored country and a policy subject.
 if(!tags.relationships.length||!tags.topics.length||!/(?:memorandum|\bmou\b|agreement|tariff|regulat|policy|dialogue|consult|readout|export|investment|joint statement|declaration|market access|trade|cooperation)/i.test(lead))return [];
 const mou=/memorand(?:um|a) of understanding|\bMOU\b/i.test(body);
 const kind=mou?'MOU':/readout|press conference|dialogue|consultation|\bmeets?\b|\bmeeting\b/i.test(lead)?'meeting':/declaration|joint statement/i.test(lead)?'recommendation':'policy';
 const status=mou?'MOU reported':kind==='meeting'?'Dialogue or readout':kind==='recommendation'?'Statement or framework':'Official announcement';
 const sentences=body.split(/(?<=[.!?])\s+/).filter(s=>s.split(/\s+/).length>=8);
 const relevant=sentences.filter(s=>/memorandum|\bmou\b|signed|tariff|agreed|implementation|dialogue|declaration/i.test(s));
 const passage=(relevant.find(s=>/memorandum|\bmou\b/i.test(s))||relevant[0]||sentences[0]||body);
 // One contiguous excerpt per source version, capped at 25 words.
 const quote=normalize(passage.split(/\s+/).slice(0,25).join(' '));
 const topic=tags.topics.find(t=>t!=='agreements')||'agreements';
 const [decisionQuestion,followUp]=lenses[topic];
 return tags.relationships.map(relationship=>({
  id:'brief-'+hash(item.url+'|'+relationship).slice(0,20),versionId:item.id,
  date:doc.publicationDate,dateType:doc.publicationDate?'source_publication':'publication_unknown',
  publicationDate:doc.publicationDate,modifiedDate:doc.modifiedDate||null,
  detectedAt:item.detectedAt,checkedAt:item.detectedAt,changeType:item.changeType,
  kind,relationship,topics:tags.topics,title:doc.title,
  changed:'The issuing authority published this policy record. Read the source excerpt for the reported development.',
  quote,canada:decisionQuestion,decisionQuestion,followUp,status,
  limit:'Automatic source report; analyst review pending. The excerpt establishes what the authority reports. Legal effect, compliance and Canadian gains or losses require separate evidence.',
  confidence:'Official source · analyst review pending',reviewState:'source_reported',
  sources:[{publisher:item.source,url:item.url,publicationDate:doc.publicationDate}],
  digest:item.digest,previousDigest:item.previousDigest||null
 }));
}
