(function(g){
 'use strict';
 const strings={
 'USTR state data directory':['Répertoire des États de l’USTR','USTR各州资料目录'],
 'Baseline source review':['Examen initial de la source','来源初始审阅日期'],

 'Source and measurement':['Source et mesure','来源与测量'],
 'Source retrieved':['Source récupérée','来源提取时间'],
 'transportation equipment':['matériel de transport','运输设备'],
 'computer & electronic products':['produits informatiques et électroniques','计算机及电子产品'],
 'food & kindred products':['produits alimentaires et connexes','食品及相关产品'],
 'primary metal manufacturing':['première transformation des métaux','初级金属制造'],
 'petroleum & coal products':['produits pétroliers et du charbon','石油及煤产品'],
 'chemicals':['produits chimiques','化学品'],
 'machinery, except electrical':['machines, sauf électriques','机械（不含电气设备）'],

 'U.S. states: export ties with Canada and China':['États américains : liens d’exportation avec le Canada et la Chine','美国各州：对加拿大和中国的出口联系'],
 'Select a state to compare its reported export markets, examine its leading manufacturing category and read the implications for Canada.':['Choisissez un État pour comparer ses marchés d’exportation déclarés, examiner sa principale catégorie manufacturière et lire les implications pour le Canada.','选择一个州，比较其已报告的出口市场、查看主要制造业类别及对加拿大的意义。'],
 'All 50 states and Washington, D.C. are selectable. Colour shows export exposure, not a policy gain or loss.':['Les 50 États et Washington, D.C. sont sélectionnables. Les couleurs montrent l’exposition des exportations, pas un gain ou une perte dû à une politique.','全部50个州及华盛顿特区均可选择。颜色反映出口敞口，不代表政策造成的得失。'],
 'State':['État','州'],
 'Trading partner':['Partenaire commercial','贸易伙伴'],
 'Map layer':['Couche cartographique','地图图层'],
 'Approximate export market share':['Part approximative du marché d’exportation','近似出口市场份额'],
 'Reported export value':['Valeur d’exportation déclarée','已报告的出口额'],
 'Profile reference year':['Année de référence des fiches','资料参考年份'],
 'Not reported in the profile':['Non indiqué dans la fiche','资料未报告'],
 'Under 5%':['Moins de 5 %','低于5%'],
 '5% to under 15%':['De 5 % à moins de 15 %','5%至不足15%'],
 '15% to under 30%':['De 15 % à moins de 30 %','15%至不足30%'],
 'At least 30%':['Au moins 30 %','至少30%'],
 'Under US$1 billion':['Moins de 1 G$ US','低于10亿美元'],
 'US$1 billion to under US$5 billion':['De 1 G$ à moins de 5 G$ US','10亿至不足50亿美元'],
 'US$5 billion to under US$10 billion':['De 5 G$ à moins de 10 G$ US','50亿至不足100亿美元'],
 'At least US$10 billion':['Au moins 10 G$ US','至少100亿美元'],
 'Selected state':['État choisi','所选州'],
 'Goods exports to {0}':['Exportations de biens vers {0}','对{0}的货物出口'],
 '{0} share of total goods exports':['Part de {0} dans les exportations totales de biens','{0}占货物出口总额的份额'],
 'Total goods exports to the world':['Exportations totales de biens vers le monde','对全球的货物出口总额'],
 'Leading manufacturing export category':['Principale catégorie d’exportation manufacturière','主要制造业出口类别'],
 'All destinations; not a bilateral sector total.':['Toutes destinations; pas un total sectoriel bilatéral.','覆盖所有目的地，并非双边行业合计。'],
 'Calculated from rounded profile values.':['Calculé à partir des valeurs arrondies de la fiche.','根据资料中的四舍五入数值计算。'],
 '{0} reports {1} in goods exports to {2} in {3}. This records a commercial connection, not the effect of an agreement.':['{0} indique {1} d’exportations de biens vers {2} en {3}. Cela établit un lien commercial, pas l’effet d’un accord.','{0}报告在{3}年对{2}的货物出口为{1}。这记录了商业联系，而非协议效果。'],
 'The profile does not report a separate value for this partner. This is an evidence gap; it does not mean the state has no trade with that market.':['La fiche n’indique pas de valeur distincte pour ce partenaire. C’est une lacune documentaire, pas la preuve d’une absence de commerce avec ce marché.','资料未单独报告该伙伴的数值。这是证据缺口，并不意味着该州与该市场没有贸易。'],
 'Canadian firms may supply, buy from or compete with this state’s businesses. Compare the two markets and the relevant products before drawing conclusions about Canadian opportunities or risks.':['Les entreprises canadiennes peuvent fournir, acheter ou concurrencer les entreprises de cet État. Comparez les deux marchés et les produits pertinents avant de conclure aux possibilités ou risques pour le Canada.','加拿大企业可能向该州企业供货、从其采购或与其竞争。判断加拿大的机会和风险前，应比较两个市场及具体产品。'],
 'Transportation equipment is relevant to questions about vehicles, aerospace and cross-border production. The state-wide category cannot show which of these products went to Canada or China.':['Le matériel de transport éclaire les questions sur les véhicules, l’aérospatiale et la production transfrontalière. Cette catégorie à l’échelle de l’État ne montre pas quels produits sont allés au Canada ou en Chine.','运输设备与汽车、航空航天及跨境生产相关。州级行业合计无法显示其中哪些产品出口到了加拿大或中国。'],
 'Computer and electronic exports provide context for Canadian technology supply chains and competition. Product-level data and export-control rules are needed to identify a specific Canadian effect.':['Les exportations informatiques et électroniques éclairent les chaînes et la concurrence technologiques canadiennes. Des données par produit et les règles de contrôle sont nécessaires pour identifier un effet canadien précis.','计算机和电子产品出口为分析加拿大技术供应链及竞争提供背景。确定具体加拿大影响，需要产品层面的数据和出口管制规则。'],
 'Food manufacturing can connect to Canadian growers and processors through sales, inputs or competition. Check product coverage and agricultural market-access rules before inferring an effect on a Canadian community.':['La fabrication alimentaire peut rejoindre les producteurs et transformateurs canadiens par les ventes, les intrants ou la concurrence. Vérifiez les produits et les règles d’accès agricole avant d’inférer un effet local au Canada.','食品制造可通过销售、投入品或竞争与加拿大种植户及加工商产生联系。推断对加拿大社区的影响前，应核查产品范围及农业准入规则。'],
 'Petroleum and coal-product exports help frame questions about energy trade and processing. Canadian sourcing links, volumes and prices require separate evidence.':['Les exportations de produits pétroliers et du charbon éclairent les questions sur l’énergie et la transformation. Les liens d’approvisionnement canadiens, les volumes et les prix nécessitent des preuves distinctes.','石油和煤产品出口有助于研究能源贸易及加工。加拿大采购联系、实物量与价格需要另有证据。'],
 'Metal exports can be relevant to Canadian industrial inputs and market competition. The profile does not identify Canadian-origin content or the effect of a tariff.':['Les exportations de métaux peuvent éclairer les intrants industriels et la concurrence au Canada. La fiche n’identifie ni le contenu d’origine canadienne ni l’effet d’un droit.','金属出口可能涉及加拿大工业投入品与市场竞争。资料无法确定加拿大原产成分或关税效果。'],
 'This is a {0} annual goods-export snapshot. The profile identifies leading markets and a manufacturing category; it is not a complete country-by-product table.':['Il s’agit d’un instantané annuel des exportations de biens de {0}. La fiche identifie les principaux marchés et une catégorie manufacturière; ce n’est pas un tableau complet par pays et produit.','这是{0}年货物出口快照。资料列出主要市场和一个制造业类别，并非完整的国家与产品交叉表。'],
 'Origin-of-movement exports can differ from the place of manufacture. These figures do not establish imports, services, jobs, new investment or a causal policy effect.':['Les exportations selon l’origine du mouvement peuvent différer du lieu de fabrication. Ces chiffres n’établissent ni importations, ni services, ni emplois, ni nouveaux investissements, ni effet causal d’une politique.','按货物流动起点归属的出口可能不同于制造地点。这些数值不能证明进口、服务、就业、新投资或政策因果效果。'],
 'Published values available for {0} of 51 jurisdictions for this selection. Missing values are not zero.':['Valeurs publiées disponibles pour {0} des 51 territoires dans cette sélection. Les valeurs manquantes ne sont pas zéro.','当前选项有51个辖区中{0}个的已公布数值。缺失值不等于零。'],
 'Alaska and Hawaii are shown as insets at different scales. Small northeastern states and D.C. use callouts.':['L’Alaska et Hawaï sont montrés en encadrés à des échelles différentes. Les petits États du Nord-Est et D.C. utilisent des renvois.','阿拉斯加和夏威夷以不同比例的插图呈现。东北部小州及特区使用引线标注。'],
 'All states: reported market connections':['Tous les États : liens commerciaux déclarés','所有州：已报告的市场联系'],
 'No quantified profile retrieved for this jurisdiction.':['Aucune fiche chiffrée récupérée pour ce territoire.','未能获取该辖区的量化资料。'],
 'Source profile':['Fiche source','来源资料'],
 'How state exports are measured':['Comment les exportations des États sont mesurées','州出口的统计方法'],
 'Read the national policy comparison':['Lire la comparaison des politiques nationales','阅读全国政策比较'],
 'Compare Canada’s provincial exposure':['Comparer l’exposition des provinces canadiennes','比较加拿大各省敞口'],
 'Source check failed; previously published values retained.':['Vérification de source échouée; valeurs précédentes conservées.','来源核查失败；保留此前已公布数值。'],
 'Geometry: U.S. Census Bureau, 2022 generalized boundaries.':['Géométrie : limites généralisées du Census Bureau, 2022.','地图边界：美国人口普查局2022年概化边界。'],
 'The source profiles do not provide complete imports or monthly partner figures. This map therefore shows reported annual export exposure only.':['Les fiches ne fournissent pas les importations complètes ni les chiffres mensuels par partenaire. La carte montre donc uniquement l’exposition annuelle déclarée des exportations.','来源资料不提供完整进口或按伙伴划分的月度数据。因此，本图仅显示已报告的年度出口敞口。'],
 'Loading U.S. state map and profiles…':['Chargement de la carte et des fiches des États…','正在加载美国州地图及资料…'],
 'The U.S. state map could not load.':['La carte des États n’a pas pu charger.','无法加载美国州地图。'],
 'Source data (JSON)':['Données sources (JSON)','来源数据（JSON）'],
 'Reference year differs from the selected map year.':['L’année de référence diffère de celle choisie sur la carte.','参考年份与所选地图年份不同。']
 };
 function text(key,...args){
  const i=g.DashboardI18n,lang=i?.language||'en';
  const result=lang==='en'?key:strings[key]?.[lang==='fr'?0:1]||i?.t(key)||key;
  return String(result).replace(/\{(\d+)\}/g,(_,n)=>String(args[n]??''));
 }
 g.USStateCopy={text};
})(window);
