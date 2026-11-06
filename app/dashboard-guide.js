(function(g){
 'use strict';
 const translations={};
 const S=(en,fr,zh)=>(translations[en]=[fr,zh],en);
 const labels={
  home:S('Home guide','Guide d’accueil','首页指南'),
  categories:S('Eight categories','Huit catégories','八个类别'),
  countries:S('Countries and timeline: 2018 to today','Pays et chronologie : de 2018 à aujourd’hui','国家与时间线：2018年至今'),
  comparative:S('Comparative topics','Thèmes de comparaison','比较主题'),
  relationship:S('Relationship Tracker','Suivi des relations','关系追踪'),
  us:S('U.S.–China Policy and Trade','Politiques et commerce États-Unis–Chine','美中政策与贸易'),
  search:S('Search Tool','Outil de recherche','搜索工具'),
  llm:S('BYOLLM','Votre propre modèle (BYOLLM)','自带大模型（BYOLLM）'),
  subscribe:S('Subscribe','S’abonner','订阅'),
  homeMenu:S('Home menu','Menu Accueil','首页菜单'),
  compareMenu:S('Compare Topics menu','Menu Comparer les thèmes','比较主题菜单'),
  why:S('Why does it matter to Canada?','Pourquoi est-ce important pour le Canada?','为什么这对加拿大重要？'),
  use:S('How can it help policy analysis?','Comment cela aide-t-il l’analyse des politiques?','它如何帮助政策分析？'),
  changed:S('What changed?','Qu’est-ce qui a changé?','发生了什么变化？'),
  limit:S('What remains uncertain?','Qu’est-ce qui reste incertain?','还有哪些不确定性？'),
  more:S('Read more in Compare Topics','En savoir plus dans Comparer les thèmes','在“比较主题”中阅读更多'),
  map:S('Open the Canada map','Ouvrir la carte du Canada','打开加拿大地图'),
  selected:S('Selected milestones since 2018','Jalons choisis depuis 2018','2018年以来的部分关键节点'),
  how:S('How to use this section','Comment utiliser cette section','如何使用本节'),
  resources:S('Verified research and source notes','Recherche vérifiée et notes sur les sources','已核实的研究与来源说明'),
  policyUpdates:S('Verified policy and MOU records','Fiches vérifiées de politiques et de protocoles','已核实的政策与谅解备忘录'),
  usSources:S('U.S.–China research and policy sources','Recherche et sources sur les politiques États-Unis–Chine','美中研究与政策来源'),
  checked:S('Sources reviewed','Sources examinées','来源审阅日期'),
  period:S('Reference period','Période de référence','参考期'),
  originalExpiry:S('Original expiry in this snapshot; see the November 4 extension in the verified policy records.','Échéance originale de cet instantané; voir la prolongation du 4 novembre dans les fiches de politiques vérifiées.','此为该快照中的原定期限；请参阅已核实政策记录中的11月4日延期。'),
  expiry:S('Announced through','Prolongation annoncée jusqu’au','宣布延长至'),
  noMatch:S('No verified source note matches the current filters.','Aucune note vérifiée ne correspond aux filtres actuels.','当前筛选条件没有匹配的已核实来源说明。'),
  distinction:S('Official documents, statistics and independent research answer different questions. Each record explains what its source establishes and where the evidence stops.','Les documents officiels, les statistiques et la recherche indépendante répondent à des questions différentes. Chaque fiche précise les constats et les limites de sa source.','官方文件、统计数据与独立研究回答不同问题。每条记录说明来源能证实什么，以及证据的局限。'),
  timelineNote:S('This is a selection of events. See Daily Updates for new source observations and the Policy Tracker for implementation.','Voici une sélection d’événements. Consultez les mises à jour quotidiennes pour les nouvelles sources et le suivi des politiques pour la mise en œuvre.','这里列出部分事件。请查看“每日更新”了解来源动态，并查看“政策追踪”了解实施情况。'),
  open:S('Open original source','Ouvrir la source originale','打开原始来源'),
  related:S('Related source notes','Notes connexes sur les sources','相关来源说明')
 };
 const guideNotes={
  categories:S('Open a category to see its Canadian policy question and why it is worth tracking.','Ouvrez une catégorie pour découvrir la question de politique canadienne qu’elle soulève et pourquoi la suivre.','展开类别，了解相关的加拿大政策问题和追踪理由。'),
  countries:S('Follow Canada–U.S., Canada–China and U.S.–China relations. The last helps explain changes that can reach Canada indirectly.','Suivez les relations Canada–États-Unis, Canada–Chine et États-Unis–Chine. La dernière éclaire les effets indirects sur le Canada.','追踪加美、加中及美中关系。美中关系有助于理解可能间接影响加拿大的变化。'),
  comparative:S('Compare the same issue across partners, then check where Canadian exposure differs by province or territory.','Comparez le même enjeu entre partenaires, puis vérifiez où l’exposition diffère selon la province ou le territoire.','对照不同伙伴的同一议题，再查看加拿大各省和地区的敞口差异。')
 };
 const notes={
  categories:[
   S('National gains and losses can mask different pressures on Canadian exporters, manufacturers and workers.','Les gains et pertes nationaux peuvent masquer des pressions différentes sur les exportateurs, les fabricants et les travailleurs canadiens.','全国得失可能掩盖加拿大出口商、制造商和劳动者面临的不同压力。'),
   S('Compare shipments, supply chains, investment, tariffs and employment using measures that fit each sector.','Comparez les expéditions, les chaînes d’approvisionnement, les investissements, les droits et l’emploi avec des mesures adaptées à chaque secteur.','按行业适用的口径比较出货、供应链、投资、关税和就业。'),
   S('Tariff changes, new talks and security rules make broad trade totals too general to guide sector decisions.','L’évolution des tarifs, les nouveaux dialogues et les règles de sécurité rendent les totaux commerciaux trop généraux pour orienter les décisions sectorielles.','关税变化、新对话与安全规则使贸易总量不足以指导行业决策。')
  ],
  countries:[
   S('The U.S. and China shape Canadian demand, inputs and security choices through different channels.','Les États-Unis et la Chine influencent la demande, les intrants et les choix de sécurité du Canada par des canaux distincts.','美国和中国通过不同渠道影响加拿大的需求、投入品与安全选择。'),
   S('Use the timeline to choose a baseline for trade comparisons and the Canada map to check regional exposure.','Utilisez la chronologie pour définir un point de référence et la carte pour vérifier l’exposition régionale.','用时间线选取贸易比较基准，再借助加拿大地图查看区域敞口。'),
   S('The 2018 U.S. tariff actions provide a starting point. CUSMA, the Indo-Pacific Strategy and renewed China engagement in 2026 changed the policy setting.','Les mesures tarifaires américaines de 2018 offrent un point de départ. L’ACEUM, la Stratégie pour l’Indo-Pacifique et la reprise du dialogue avec la Chine en 2026 ont modifié le contexte.','2018年美国关税行动提供起点。加美墨协定、印太战略及2026年重启的对华接触改变了政策环境。')
  ],
  comparative:[
   S('U.S. supply-chain integration and Chinese market access can create opportunities and pressures for the same Canadian sector.','L’intégration des chaînes avec les États-Unis et l’accès au marché chinois peuvent créer des possibilités et des pressions pour un même secteur canadien.','与美国的供应链融合及中国市场准入可能同时给同一加拿大行业带来机会与压力。'),
   S('Compare the same product, period and unit where possible. Use gaps to identify evidence a brief still needs.','Comparez, si possible, le même produit, la même période et la même unité. Les lacunes révèlent les preuves encore nécessaires.','尽量比较同一产品、时期和单位，并明确政策简报仍需哪些证据。'),
   S('EV quotas, agricultural relief and security cooperation moved on different tracks. The same questions make those differences visible.','Les contingents de VE, les allègements agricoles et la coopération sécuritaire ont évolué différemment. Les mêmes questions rendent ces écarts visibles.','电动车配额、农业减免和安全合作沿不同路径推进。统一的问题可清楚显示差异。')
  ],
  evidence:[
   S('A national export figure, a provincial job count and a quota permit answer different questions about Canada.','Un chiffre national d’exportation, un décompte provincial d’emplois et un permis contingenté répondent à des questions différentes sur le Canada.','全国出口额、省级就业人数和配额许可回答的是不同的加拿大政策问题。'),
   S('Check the publisher, scope, reference period, unit and limits before using a claim in a brief or comparison.','Vérifiez l’éditeur, la portée, la période, l’unité et les limites avant d’utiliser une affirmation.','在简报或比较中使用结论前，核查发布者、范围、参考期、单位及局限。'),
   S('New releases and revised source pages arrive on different schedules. The dashboard keeps reviewed evidence and daily observations distinct.','Les nouvelles publications et les révisions arrivent à des rythmes différents. Le tableau de bord distingue les preuves examinées des observations quotidiennes.','新发布与来源修订的时间各不相同。仪表板将已审阅证据与每日监测动态分开。')
  ],
  tracker:[
   S('U.S.–China decisions can change markets, input costs and security risks for Canada.','Les décisions entre les États-Unis et la Chine peuvent modifier les débouchés, le coût des intrants et les risques de sécurité pour le Canada.','美中举措可能改变加拿大的市场、投入成本与安全风险。'),
   S('Choose an issue and follow each bilateral link to its evidence and unresolved questions.','Choisissez un enjeu et suivez chaque lien bilatéral jusqu’aux preuves et aux questions en suspens.','选择议题，沿每组双边关系查看证据和待解问题。'),
   S('Canada–U.S. cooperation and selective Canada–China engagement coexist with U.S.–China competition and negotiation.','La coopération Canada–États-Unis et le dialogue ciblé Canada–Chine coexistent avec la concurrence et les négociations États-Unis–Chine.','加美合作及有针对性的加中接触，与美中竞争和谈判并存。')
  ],
  policy:[
   S('A change in effective date, eligible product or expiry can affect decisions for Canadian firms and provinces.','Un changement de date d’entrée en vigueur, de produit admissible ou d’expiration peut influencer les entreprises et les provinces canadiennes.','生效日、适用产品或到期日的变化可能影响加拿大企业及各省的决策。'),
   S('Trace each measure to its source. Separate signing and implementation from evidence of shipments, investment and jobs.','Remontez chaque mesure à sa source. Distinguez signature et mise en œuvre des preuves d’expéditions, d’investissements et d’emplois.','追溯每项措施的来源，将签署与实施同出货、投资和就业证据区分开。'),
   S('New MOUs, tariff extensions and review meetings created a need to track commitments and their follow-through separately.','Les nouveaux protocoles, les prolongations tarifaires et les réunions d’examen exigent de suivre séparément les engagements et leurs suites.','新的谅解备忘录、关税减免延期及审议会议，需要分别追踪承诺和后续落实。')
  ],
  us:[
   S('U.S.–China tariff and sourcing changes can affect Canadian competitiveness and demand for Canadian inputs.','Les changements tarifaires et d’approvisionnement États-Unis–Chine peuvent toucher la compétitivité du Canada et la demande d’intrants canadiens.','美中关税与采购变化可能影响加拿大的竞争力和加拿大投入品需求。'),
   S('Compare U.S. goods trade with China and Canada. Check product coverage before interpreting shifts as trade diversion.','Comparez le commerce de biens des États-Unis avec la Chine et le Canada. Vérifiez les produits visés avant de conclure à un détournement des échanges.','比较美国与中国、加拿大的货物贸易。判断贸易转移之前，先核查产品适用范围。'),
   S('Since the 2018 tariff escalation, successive restrictions and the 2026 Board of Trade framework have changed the terms of competition.','Depuis l’escalade tarifaire de 2018, les restrictions successives et le cadre du Conseil du commerce de 2026 ont modifié les conditions de concurrence.','自2018年关税升级以来，陆续出台的限制和2026年贸易委员会框架改变了竞争条件。')
  ]
 };
 const categories={
  vehicles:[
   S('Ontario assembly and battery supply chains depend heavily on U.S. demand.','L’assemblage et les chaînes de batteries en Ontario dépendent fortement de la demande américaine.','安大略省汽车组装及电池供应链高度依赖美国需求。'),
   S('Compare imports, parts shipments and domestic production separately.','Comparez séparément les importations, les expéditions de pièces et la production canadienne.','分别比较进口、零部件出货和国内产量。'),
   S('Canada opened an import quota for eligible China-origin EVs in 2026.','Le Canada a ouvert un contingent pour les VE admissibles de Chine en 2026.','2026年加拿大向符合条件的中国原产电动车开放进口配额。')
  ],
  agriculture:[
   S('Prairie crops and coastal seafood face different market-access risks.','Les cultures des Prairies et les fruits de mer côtiers sont exposés à des risques d’accès différents.','草原省份农作物与沿海海产面临不同市场准入风险。'),
   S('Compare seed, meal and oil separately and check which products qualify for relief.','Comparez séparément graines, tourteau et huile, puis vérifiez l’admissibilité aux allègements.','分别比较籽、粕和油，并核对哪些产品适用减免。'),
   S('China reduced the canola-seed tariff and agreed to extend relief on four specified products.','La Chine a réduit le droit sur les graines de canola et accepté de prolonger l’allègement pour quatre produits.','中国降低油菜籽关税，并同意延长四类指定产品的减免。')
  ],
  energy:[
   S('The U.S. anchors Canadian oil exports; Pacific capacity offers other options.','Les États-Unis sont le principal débouché du pétrole canadien; la capacité du Pacifique offre d’autres options.','美国是加拿大石油出口的主要市场，太平洋出口能力提供更多选择。'),
   S('Separate price movements, delivered volumes and completed infrastructure.','Distinguez les mouvements de prix, les volumes livrés et les infrastructures achevées.','区分价格变动、实际交付量和已建成基础设施。'),
   S('An energy MOU and ministerial dialogue opened new discussions alongside existing exports.','Un protocole énergétique et un dialogue ministériel ont ouvert de nouvelles discussions parallèlement aux exportations existantes.','能源谅解备忘录和部长级对话在现有出口基础上开启了新讨论。')
  ],
  finance:[
   S('Foreign licensing and market conditions affect Canadian financial firms’ options.','Les permis étrangers et les conditions du marché influencent les options des institutions financières canadiennes.','外国牌照与市场状况影响加拿大金融企业的选择。'),
   S('Distinguish regulatory dialogue, company results and national sector performance.','Distinguez le dialogue réglementaire, les résultats des entreprises et la performance du secteur national.','区分监管对话、公司业绩与全国行业表现。'),
   S('The Canada–China Financial Working Group began meeting in 2026.','Le groupe de travail financier Canada–Chine a commencé à se réunir en 2026.','加中金融工作组于2026年开始举行会议。')
  ],
  technology:[
   S('Digital trade and technology controls affect markets, trusted infrastructure and inputs.','Le commerce numérique et les contrôles technologiques touchent les marchés, les infrastructures de confiance et les intrants.','数字贸易与技术管控影响市场、可信基础设施和投入品。'),
   S('Compare rule coverage and identify where commercial evidence is still missing.','Comparez la portée des règles et repérez les lacunes dans les preuves commerciales.','比较规则适用范围，找出仍缺少商业证据的领域。'),
   S('Telecommunications restrictions and U.S.–China technology controls made jurisdiction-specific rules more important.','Les restrictions en télécommunications et les contrôles États-Unis–Chine ont accru l’importance des règles propres à chaque territoire.','电信限制与美中技术管控使各司法管辖区的具体规则更加重要。')
  ],
  security:[
   S('Canada relies on continental cooperation while maintaining specific law enforcement channels with China.','Le Canada s’appuie sur la coopération continentale tout en maintenant des canaux policiers ciblés avec la Chine.','加拿大依托北美合作，同时维持特定对华执法渠道。'),
   S('Compare mandates, actions and outcomes, including enforcement on fentanyl precursors.','Comparez les mandats, les actions et les résultats, notamment sur les précurseurs du fentanyl.','比较合作任务、行动与结果，包括芬太尼前体执法。'),
   S('The RCMP and China’s Ministry of Public Security signed a crime cooperation MOU in 2026.','La GRC et le ministère chinois de la Sécurité publique ont signé un protocole de coopération en 2026.','加拿大皇家骑警与中国公安部于2026年签署打击犯罪合作谅解备忘录。')
  ],
  investment:[
   S('Foreign capital can build Canadian capacity while some transactions raise security questions.','Le capital étranger peut accroître la capacité canadienne, tandis que certaines transactions soulèvent des questions de sécurité.','外资可提升加拿大产能，但部分交易带来安全问题。'),
   S('Separate stocks, announcements, screening decisions and actual spending.','Distinguez les stocks, les annonces, les décisions d’examen et les dépenses réelles.','区分投资存量、公告、审查决定与实际支出。'),
   S('New investment dialogue makes it important to check whether talks lead to completed projects.','Le nouveau dialogue sur l’investissement invite à vérifier si les discussions débouchent sur des projets réalisés.','新投资对话使核查谈判是否带来已完成项目更为重要。')
  ],
  agreements:[
   S('Terms and follow-up decisions determine which market access Canadian exporters can use.','Les modalités et les décisions de suivi déterminent l’accès dont bénéficient les exportateurs canadiens.','协定条款与后续决定决定加拿大出口商实际可用的市场准入。'),
   S('Trace each commitment to its dates, terms and implementation notices.','Reliez chaque engagement à ses dates, modalités et avis de mise en œuvre.','追踪每项承诺的日期、条款及实施公告。'),
   S('The CUSMA review and Canada–China roadmap brought new commitments and follow-up questions.','L’examen de l’ACEUM et la feuille de route Canada–Chine ont entraîné de nouveaux engagements et de nouvelles questions de suivi.','加美墨协定审议与加中路线图带来了新承诺及后续问题。')
  ]
 };
 const countryRows=[
  ['Canada',S('Canada is the focus. Its provinces, firms and workers experience changes in trade and security differently.','Le Canada est au centre. Ses provinces, ses entreprises et ses travailleurs ressentent différemment les changements commerciaux et sécuritaires.','以加拿大为核心。各省、企业和劳动者受到贸易与安全变化的影响各不相同。')],
  ['United States',S('The United States is Canada’s largest merchandise export market and a partner in regional production and continental security.','Les États-Unis sont le principal débouché du Canada pour les marchandises et un partenaire de la production régionale et de la sécurité continentale.','美国是加拿大最大的货物出口市场，也是区域生产及北美安全伙伴。')],
  ['China',S('China offers a large alternative market and source of inputs. Its market-access and security decisions create distinct risks.','La Chine représente un grand débouché de remplacement et une source d’intrants. Ses décisions d’accès au marché et de sécurité créent des risques distincts.','中国提供重要的替代市场和投入品来源，其准入及安全决策带来不同风险。')]
 ];
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rels={'Canada-USA':'Canada–U.S.','Canada-China':'Canada–China','USA-China':'U.S.–China',Canada:'Canada'};
 const questions=copy=>'<dl class="guide-questions">'+[labels.why,labels.use,labels.changed].map((label,i)=>'<div><dt>'+E(label)+'</dt><dd>'+E(copy[i])+'</dd></div>').join('')+'</dl>';
 const link=(id,label,cls='')=>'<a href="#'+E(id)+'" data-hub="'+E(id)+'"'+(cls?' class="'+E(cls)+'"':'')+'>'+E(label)+' <span aria-hidden="true">→</span></a>';
 const context=id=>notes[id]?'<details class="guide-context" open><summary>'+E(labels.how)+'</summary>'+questions(notes[id])+'</details>':'';
 function renderRecord(r){
  const R=g.PolicyResearchRegister;
  const field=(label,copy)=>'<div><dt>'+E(label)+'</dt><dd>'+E(copy)+'</dd></div>';
  const sources=r.sources.map(s=>'<li><a href="'+E(s.url)+'" target="_blank" rel="noopener noreferrer">'+E(labels.open)+' · '+E(s.publisher)+' <span aria-hidden="true">↗</span></a></li>').join('');
  return '<details class="guide-source" data-guide-source="'+E(r.id)+'"><summary><span class="guide-source-meta"><time datetime="'+E(r.date)+'">'+E(r.date)+'</time> · '+E(rels[r.relationship])+' · '+E(R.labels[r.kind])+'</span><strong>'+E(r.title)+'</strong></summary><div class="guide-source-body"><dl class="guide-source-facts">'+field(labels.changed,r.changed)+field(labels.why,r.canada)+field(labels.limit,r.limit)+'</dl><p class="guide-source-meta">'+E(labels.checked)+': '+E(R.reviewedAt)+(r.period?' · '+E(labels.period)+': '+E(r.period):'')+(r.through?' · '+E(labels.expiry)+': '+E(r.through):'')+'</p><ul>'+sources+'</ul></div></details>';
 }
 function search(query){
  if(!g?.PolicyResearchRegister)return [];
  const normalize=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const candidates=[normalize(query),normalize(g.DashboardI18n?.searchQuery(query))].filter(Boolean).map(q=>q.split(' '));
  if(!candidates.length)return [];
  return g.PolicyResearchRegister.records.filter(r=>{
   const fields=[r.title,r.changed,r.canada,r.limit,r.date,r.period,r.through,r.kind,rels[r.relationship],...r.topics,...r.sources.map(s=>s.publisher)];
   const haystack=normalize(fields.flatMap(x=>[x,...(g.PolicyResearchRegister.translations[x]||[])]).join(' '));
   return candidates.some(words=>words.every(word=>haystack.includes(word)));
  });
 }
 function register(view,state={}){

  if(!g?.PolicyResearchRegister)return '';
  const matches=g.PolicyResearchRegister.records.filter(r=>{
   if(view==='policy'&&['statistics','analysis'].includes(r.kind))return false;
   if(view==='daily'&&r.date<'2026-11-03')return false;
   if(view==='search'&&!state.records?.includes(r))return false;
   if(view==='us'){
    if(!['USA-China','Canada-USA'].includes(r.relationship))return false;
    if(state.partner==='China'&&r.relationship!=='USA-China'||state.partner==='Canada'&&r.relationship!=='Canada-USA')return false;
    if(state.view==='policies'&&['analysis','statistics'].includes(r.kind))return false;
    if(state.year&&state.year!=='all'&&!r.date.startsWith(String(state.year)))return false;
   }
   if(state.topic&&state.topic!=='all'&&!r.topics.includes(state.topic))return false;
   if(state.relationship&&state.relationship!=='all'&&r.relationship!=='Canada'&&r.relationship!==state.relationship)return false;
   if(state.region&&state.region!=='CA'&&r.regions?.length&&!r.regions.includes(state.region))return false;
   if(state.period&&state.period!=='all'&&!r.date.startsWith(state.period))return false;
   return true;
  });
  const label=({policy:labels.policyUpdates,us:labels.usSources,compare:labels.related})[view]||labels.resources;
  if((view==='compare'||view==='search')&&!matches.length)return '';
  return '<section class="guide-register" aria-label="'+E(label)+'"><h3>'+E(label)+'</h3><p class="hub-small">'+E(labels.distinction)+'</p>'+(matches.length?matches.map(renderRecord).join(''):'<p>'+E(labels.noMatch)+'</p>')+'</section>';
 }
 const milestoneIds=['section-301-start','cusma-entry','indo-pacific-strategy','canada-china-energy-mou','canada-china-access-march','cusma-joint-review-meeting','us-china-board-framework','canada-china-relief-extension'];
 function page(id,catalog){
  const title=labels[id];if(!title)return '';
  let body='';
  if(id==='categories')body='<div class="guide-category-list">'+catalog.topics.map((t,i)=>'<details class="guide-category"><summary><span aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><strong>'+E(t.name)+'</strong></summary>'+questions(categories[t.id])+'<p>'+link('compare-topics?topic='+t.id,labels.more)+'</p></details>').join('')+'</div>';
  else if(id==='countries')body='<div class="guide-country-grid">'+countryRows.map(([name,copy])=>'<section><h3>'+E(name)+'</h3><p>'+E(copy)+'</p></section>').join('')+'</div><p>'+link('canada-implications',labels.map,'hub-secondary')+'</p><section class="guide-register"><h3>'+E(labels.selected)+'</h3><p class="hub-small">'+E(labels.timelineNote)+'</p>'+milestoneIds.map(id=>g.PolicyResearchRegister.records.find(r=>r.id===id)).filter(Boolean).map(renderRecord).join('')+'</section>';
  else body='<div class="hub-actions">'+link('compare-topics',labels.more,'hub-primary')+link('evidence-methods','Evidence & Methods','hub-secondary')+link('relationship-explorer',labels.relationship,'hub-secondary')+'</div>';
  return '<div class="wrap hub-home hub-guide"><div class="hub-page-heading"><p class="hub-eyebrow">'+E(labels.home)+'</p><h2>'+E(title)+'</h2><p>'+E(guideNotes[id])+'</p></div>'+questions(notes[id])+body+'</div>';
 }
 const api={labels,translations,guideNotes,notes,page,context,register,renderRecord,link,search};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(g)g.PolicyGuide=api;
})(typeof window==='undefined'?null:window);
