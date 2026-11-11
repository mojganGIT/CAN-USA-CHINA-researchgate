(function(g){
 'use strict';
 const strings={
  'Original inventory label':['Libellé de l’inventaire initial','原始资料库标签'],
  'The original inventory label is retained; it is not a new verification of current law. Check the source for amendments, implementation and exceptions.':['Le libellé initial est conservé; il ne constitue pas une nouvelle vérification du droit en vigueur. Consultez la source pour les modifications, la mise en œuvre et les exceptions.','保留原始资料库标签；这不构成对现行法律的重新核实。请核对来源中的修订、实施和例外条款。'],

  'Linked outcome evidence':['Preuves de résultats associées','关联结果证据'],
  'Linked observations can predate the policy or cover a different geography; links are not causal claims.':['Les observations associées peuvent précéder la politique ou couvrir une autre région; les liens n’établissent pas de causalité.','关联观察可能早于该政策，或涉及其他地域；关联不代表因果关系。'],

  'Market access, sourcing and security choices connect Canadian firms to Chinese buyers and suppliers.':['L’accès au marché, l’approvisionnement et la sécurité relient les entreprises canadiennes aux acheteurs et fournisseurs chinois.','市场准入、采购与安全选择将加拿大企业同中国买家和供应商联系起来。'],
  'Follow how U.S.–China trade and security decisions can shape Canadian competition and policy choices.':['Suivez comment les décisions commerciales et sécuritaires États-Unis–Chine peuvent influencer la concurrence et les choix du Canada.','跟踪美中贸易与安全决定如何影响加拿大的竞争环境和政策选择。'],
  'Examine cross-border production, energy trade and the rules facing Canadian firms and provinces.':['Examinez la production transfrontalière, le commerce énergétique et les règles touchant les entreprises et provinces canadiennes.','考察跨境生产、能源贸易及加拿大企业与各省面临的规则。'],

  'Canada–China Policy and Trade':['Politiques et commerce Canada–Chine','加中政策与贸易'],
  'USA–China Policy and Trade':['Politiques et commerce États-Unis–Chine','美中政策与贸易'],
  'USA–Canada Policy and Trade':['Politiques et commerce États-Unis–Canada','美加政策与贸易'],
  'Overview':['Vue d’ensemble','概览'],
  'Canada provincial map':['Carte des provinces canadiennes','加拿大省级地图'],
  'U.S. state map':['Carte des États américains','美国州级地图'],
  'Relationship sections':['Rubriques de la relation','双边关系栏目'],
  'Weekly policy briefing':['Note hebdomadaire sur les politiques','每周政策简报'],
  'Subscribe to weekly updates':['S’abonner aux mises à jour hebdomadaires','订阅每周更新'],
  'Follow the evidence from 2018–2026. Each dataset keeps its own reference period; an announcement is separate from implementation and measured results.':['Suivez les preuves de 2018 à 2026. Chaque jeu de données conserve sa période de référence; l’annonce se distingue de la mise en œuvre et des résultats mesurés.','跟踪2018至2026年的证据。各数据集保留自身参考期；公告、实施和已测得的结果分别呈现。'],
  'Only records linked to this relationship appear here. All-market Canadian context is available separately and is never allocated to a bilateral partner.':['Seules les fiches liées à cette relation apparaissent ici. Le contexte canadien tous marchés est présenté séparément et n’est jamais attribué à un partenaire bilatéral.','此处仅显示与该双边关系相关的记录。加拿大整体市场背景单独提供，不分配给某个双边伙伴。'],
  'Canada’s policy question':['Question de politique pour le Canada','加拿大的政策问题'],
  'How to use the comparison':['Comment utiliser la comparaison','如何使用比较'],
  'What changed across the period?':['Qu’est-ce qui a changé pendant cette période?','这一时期发生了什么变化？'],
  'Market access, sourcing and security choices connect Canadian firms to Chinese buyers and suppliers. The balance differs by sector and province, so commercial openings and security constraints need to be examined together.':['L’accès au marché, l’approvisionnement et la sécurité relient les entreprises canadiennes aux acheteurs et fournisseurs chinois. L’équilibre varie selon le secteur et la province; il faut examiner ensemble les débouchés et les contraintes de sécurité.','市场准入、采购与安全选择将加拿大企业同中国买家及供应商联系起来。各行业和省份的情况不同，需要同时审视商业机会与安全约束。'],
  'U.S.–China competition and negotiation can change the markets, inputs and rules facing Canadian firms. The evidence below concerns that bilateral relationship; Canadian implications are interpretation unless independently measured.':['La concurrence et les négociations États-Unis–Chine peuvent modifier les marchés, les intrants et les règles pour les entreprises canadiennes. Les preuves ci-dessous portent sur cette relation; les implications canadiennes restent une interprétation sauf mesure indépendante.','美中竞争与谈判可能改变加拿大企业面临的市场、投入品与规则。下列证据针对美中关系；对加拿大的含义属于分析，除非另有独立测量。'],
  'Canada and the U.S. share production networks, energy trade and continental security arrangements. Integration supports Canadian activity but also exposes firms and provinces to American demand and policy decisions.':['Le Canada et les États-Unis partagent des réseaux de production, des échanges énergétiques et des ententes de sécurité continentale. L’intégration soutient l’activité canadienne mais expose aussi les entreprises et provinces à la demande et aux décisions américaines.','加美共享生产网络、能源贸易及北美安全安排。一体化支持加拿大经济活动，也使企业和各省受到美国需求及政策决定的影响。'],
  'Start with one of the eight topics, follow the timeline and open the source. Compare the same product, period and unit; use the maps to examine regional exposure rather than infer local jobs from national figures.':['Choisissez l’un des huit thèmes, suivez la chronologie et ouvrez la source. Comparez le même produit, la même période et la même unité; utilisez les cartes pour examiner l’exposition régionale sans déduire l’emploi local des chiffres nationaux.','先选择八个主题之一，沿时间线查阅原始来源。比较同一产品、时期与单位；用地图分析区域敞口，避免从全国数据推断地方就业。'],
  'Tariffs, screening decisions, security measures and renewed dialogues have changed at different times since 2018. The timeline distinguishes the instrument’s event date, effective date and available outcome evidence.':['Les droits, décisions d’examen, mesures de sécurité et dialogues ont évolué à des moments différents depuis 2018. La chronologie distingue la date de l’événement, l’entrée en vigueur et les preuves de résultats disponibles.','自2018年以来，关税、投资审查、安全措施与对话在不同时间发生变化。时间线区分文件事件日、生效日及可用的结果证据。'],
  'Latest reviewed milestones':['Derniers jalons examinés','最新已审阅节点'],
  'Eight topic comparisons':['Huit comparaisons thématiques','八个主题比较'],
  'Select a topic to read its subtopics and matched evidence.':['Choisissez un thème pour lire ses sous-thèmes et les preuves correspondantes.','选择主题，查看子议题和匹配证据。'],
  'Reference year':['Année de référence','参考年份'],
  'All years: 2018–2026':['Toutes les années : 2018–2026','所有年份：2018至2026'],
  'All-market Canadian context — not a bilateral allocation':['Contexte canadien tous marchés — sans attribution bilatérale','加拿大整体市场背景——未作双边分配'],
  'Five evidence tests':['Cinq critères de preuve','五项证据检验'],
  'Open the underlying records to check units, geography and reference periods. The tests are not combined into a score.':['Ouvrez les fiches pour vérifier les unités, la zone et les périodes. Les critères ne sont pas combinés en un score.','展开底层记录，核查单位、地域和参考期。各项检验不合并成评分。'],
  'No directly matched record was established for this selection. This is an evidence gap, not zero impact.':['Aucune fiche directement correspondante n’a été établie pour cette sélection. C’est une lacune, pas un effet nul.','此选项没有已确认的直接匹配记录。这是证据缺口，不等于没有影响。'],
  'Subtopics and mechanisms':['Sous-thèmes et mécanismes','子议题与机制'],
  'Reviewed sources and historical inventory':['Sources examinées et inventaire historique','已审阅来源与历史资料库'],
  'Historical labels and years are retained. A source-page change is not automatically a legal amendment.':['Les mentions et années historiques sont conservées. Un changement de page ne constitue pas automatiquement une modification juridique.','保留原始历史标签和年份。来源页面变化不自动等于法律修订。'],
  'Period-specific source records':['Fiches sources propres à la période','特定时期的来源记录'],
  'Latest daily observations for this relationship':['Dernières observations quotidiennes pour cette relation','该双边关系的最新每日动态'],
  'No new monitored observations match this relationship. This does not establish that no policy changed.':['Aucune nouvelle observation de veille ne correspond à cette relation. Cela ne prouve pas l’absence de changement de politique.','没有匹配该关系的新监测动态。这不证明政策没有变化。'],
  'Sources are still loading; published research notes remain available.':['Les sources chargent encore; les notes publiées restent accessibles.','来源仍在加载；已发布的研究说明仍可查阅。'],
  'Some published datasets could not be refreshed. Previously loaded data and research notes remain available.':['Certains jeux de données n’ont pas pu être actualisés. Les données déjà chargées et les notes restent disponibles.','部分已发布数据集无法刷新。此前加载的数据与研究说明仍可用。'],
  'Canadian domestic exports to {0}':['Exportations intérieures canadiennes vers {0}','加拿大对{0}的本国产品出口'],
  'U.S. goods imports from {0}':['Importations américaines de biens de {0}','美国自{0}的货物进口'],
  'Same months a year earlier':['Mêmes mois un an plus tôt','上年同期月份'],
  'Canadian provincial series: {0} to {1}. U.S. goods series: 2018 to the latest published period.':['Séries provinciales canadiennes : de {0} à {1}. Séries américaines de biens : de 2018 à la dernière période publiée.','加拿大省级序列：{0}至{1}。美国货物序列：2018年至最新发布时期。'],
  'Statistical series and policy timelines have different coverage. Use the original dates; missing historical data is not filled with estimates.':['Les séries statistiques et les chronologies ont des couvertures différentes. Utilisez les dates originales; les données historiques manquantes ne sont pas estimées.','统计序列与政策时间线覆盖范围不同。请使用原始日期；不以估算填补缺失历史数据。'],
  'Compare Topics menu':['Menu de comparaison des thèmes','主题比较菜单'],
  'Unreviewed source observation':['Observation de source non examinée','未经审阅的来源动态'],
  'Event date':['Date de l’événement','事件日期'],
  'Record date':['Date de la fiche','记录日期'],
  'Source collection':['Collection de sources','来源集合'],
  'Policy or agreement':['Politique ou entente','政策或协议'],
  'Research notes':['Notes de recherche','研究说明'],
  'Historical inventory':['Inventaire historique','历史资料库'],
  'Refresh published data':['Actualiser les données publiées','刷新已发布数据'],
  'Showing {0}–{1} of {2} records':['Fiches {0} à {1} sur {2}','显示第{0}至{1}条，共{2}条'],
  'No records match these filters.':['Aucune fiche ne correspond à ces filtres.','没有符合筛选条件的记录。'],
  'Source text and data retain their publication language and measurement definitions.':['Les textes et données sources conservent leur langue de publication et leurs définitions.','来源文本与数据保留原始发布语言和测量定义。']
 };
 function text(key,...args){
  const i=g?.DashboardI18n,lang=i?.language||'en',s=lang==='en'?key:strings[key]?.[lang==='fr'?0:1]||i?.t(key)||key;
  return String(s).replace(/\{(\d+)\}/g,(_,n)=>String(args[n]??''));
 }
 const api={strings,text};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(g)g.BilateralCopy=api;
})(typeof window==='undefined'?null:window);
