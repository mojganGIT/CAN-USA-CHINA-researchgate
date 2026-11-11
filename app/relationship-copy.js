(function(g){
 'use strict';
 const copy={
  'No comparable series is indexed for this selection. A dated measure and matched outcome data are needed to chart a trend.':['Aucune série comparable n’est indexée pour ce choix. Une mesure datée et des résultats comparables sont nécessaires pour tracer une tendance.','该选项未收录可比序列。绘制趋势需要注明日期的措施和口径一致的结果数据。'],
  'A negative trade balance means imports exceeded exports.':['Un solde commercial négatif signifie que les importations ont dépassé les exportations.','贸易差额为负表示进口额超过出口额。'],

  'The original sources':['Les sources originales','原始来源'],
  'Use the document title, publisher and year to find the original measure. Check its product coverage, effective date and later amendments before applying it.':['Utilisez le titre, l’organisme et l’année pour retrouver la mesure originale. Vérifiez les produits visés, la date d’entrée en vigueur et les modifications ultérieures avant de l’appliquer.','用文件标题、发布机构和年份查找原始措施。使用前核查产品范围、生效日期及后续修订。'],
  'The dates shown are inventory years. A status label does not confirm whether a measure applies today.':['Les dates indiquées sont les années de l’inventaire. Le libellé du statut ne confirme pas si la mesure s’applique aujourd’hui.','所示日期是资料库标注的年份。原始状态标签不能确认措施目前是否适用。'],
  'No original document is indexed for this combination. Start by looking for a dated measure from the responsible authority.':['Aucun document original n’est indexé pour cette combinaison. Recherchez d’abord une mesure datée publiée par l’autorité responsable.','该组合尚未收录原始文件。应先查找主管机构发布且注明日期的措施。'],
  'Inspect record':['Examiner la fiche','查看记录'],
  'Open original source':['Ouvrir la source originale','打开原始来源'],
  'What the records show':['Ce que montrent les fiches','记录显示了什么'],
  'Select a document to see its finding and scope. The sequence follows recorded years.':['Choisissez un document pour lire son constat et sa portée. L’ordre suit les années consignées.','选择文件查看其发现与适用范围。顺序按记录年份排列。'],
  'Dated findings':['Constats datés','按日期排列的发现'],
  'These documents provide context from different jurisdictions. They do not establish a shared rule or a comparable outcome.':['Ces documents donnent le contexte de différentes autorités. Ils n’établissent ni une règle commune ni un résultat comparable.','这些文件提供不同管辖区的背景，不能证明存在共同规则或可比结果。'],
  'A source describes a measure, assessment or commitment. Its implementation and results require separate evidence.':['Une source décrit une mesure, une évaluation ou un engagement. La mise en œuvre et les résultats exigent des données distinctes.','来源描述措施、评估或承诺。实施情况与结果需要单独的证据。'],
  'No dated finding is indexed for this relationship and issue.':['Aucun constat daté n’est indexé pour cette relation et ce sujet.','这组关系与议题尚未收录有日期的发现。'],
  'Canadian policy implications':['Implications pour la politique canadienne','对加拿大政策的影响'],
  'What to check next':['Ce qu’il faut vérifier ensuite','下一步核查内容'],
  'Use this interpretation to identify who could be affected and what evidence would change the assessment. Apply the original measure to the product or activity in question.':['Utilisez cette interprétation pour repérer les acteurs susceptibles d’être touchés et les données qui pourraient modifier l’évaluation. Appliquez la mesure originale au produit ou à l’activité en cause.','用这段分析识别可能受到影响的主体，以及哪些证据会改变评估。应按具体产品或活动查阅原始措施。'],
  'Review the topic comparison':['Consulter la comparaison thématique','查看主题比较'],
  'Read evidence and limitations':['Lire les preuves et les limites','查看证据及其局限'],
  'Read Canadian implications':['Lire les implications pour le Canada','阅读对加拿大的影响'],
  'Read the evidence gap':['Consulter la lacune documentaire','查看证据缺口'],
  'Trade data and trends':['Données et tendances commerciales','贸易数据与趋势'],
  'Canola shipments to the United States by product':['Expéditions de canola aux États-Unis par produit','按产品划分的加拿大对美油菜产品出货量'],
  'Canadian domestic exports: broader trade context':['Exportations intérieures canadiennes : contexte commercial élargi','加拿大本国产品出口：更广泛的贸易背景'],
  'U.S. goods trade: all products':['Commerce américain de biens : tous les produits','美国货物贸易：所有产品'],
  'Canadian domestic exports to {0}':['Exportations canadiennes de produits d’origine nationale vers {0}','加拿大对{0}的本国产品出口'],
  'U.S. goods trade with {0}':['Commerce américain de biens avec {0}','美国与{0}的货物贸易'],
  'This is a broader product group, so use it as trade context for the selected issue.':['Cette série porte sur un groupe de produits plus large. Utilisez-la comme contexte commercial pour le sujet choisi.','该序列涵盖更广泛的产品类别，可作为所选议题的贸易背景。'],
  'This series covers all goods traded with the partner. It does not isolate the selected sector or product.':['Cette série couvre tous les biens échangés avec le partenaire. Elle n’isole pas le secteur ou le produit choisi.','该序列涵盖与该伙伴交易的所有货物，未单独列出所选行业或产品。'],
  'Trade measure':['Mesure commerciale','贸易指标'],
  'Trade balance':['Solde commercial','贸易差额'],
  'Canola seed':['Graines de canola','油菜籽'],
  'Canola meal':['Tourteau de canola','菜籽粕'],
  'Canola oil':['Huile de canola','菜籽油'],
  'Interactive trade chart':['Graphique commercial interactif','交互式贸易图表'],
  'Total for the period':['Total de la période','期间合计'],
  'Highest observed month':['Mois le plus élevé observé','观测值最高的月份'],
  'Change from first to last month':['Variation du premier au dernier mois','首月至末月的变化'],
  'These are totals by product over one period, not a time trend.':['Ces totaux comparent les produits sur une même période. Ils ne décrivent pas une évolution dans le temps.','这些是同一时期各产品的合计值，并非时间趋势。'],
  'The first month recorded {0}; the last recorded {1}. The highest month was {2}.':['Le premier mois a enregistré {0}, et le dernier {1}. Le mois le plus élevé était {2}.','首月为{0}，末月为{1}。最高值出现在{2}。'],
  'A complete comparison for the same months is unavailable. Missing observations are not zero.':['La comparaison pour les mêmes mois n’est pas complète. Une observation manquante ne vaut pas zéro.','无法完整比较同期月份。缺失观测值不等于零。'],
  'The total was unchanged from the same months a year earlier.':['Le total est demeuré inchangé par rapport aux mêmes mois de l’année précédente.','总额与上年同期持平。'],
  'The total was {0} higher than the same months a year earlier.':['Le total a dépassé de {0} celui des mêmes mois de l’année précédente.','总额比上年同期高出{0}。'],
  'The total was {0} lower than the same months a year earlier.':['Le total a diminué de {0} par rapport aux mêmes mois de l’année précédente.','总额比上年同期低{0}。'],
  'Canola seed tariff change: {0}':['Modification du droit sur les graines de canola : {0}','油菜籽关税变化：{0}'],
  'Inspect a month':['Examiner un mois','查看某个月份'],
  'Inspect a product':['Examiner un produit','查看某种产品'],
  '{0}: {1}. Same month in {2}: {3}.':['{0} : {1}. Même mois en {2} : {3}.','{0}：{1}。{2}年同月：{3}。'],
  'Same month a year earlier':['Même mois un an plus tôt','上年同月'],
  'This issue is documented through policy records. The dated findings above show what was recorded; a numerical trend would need a comparable outcome series.':['Ce sujet est documenté par des fiches de politique. Les constats datés ci-dessus en rendent compte ; une tendance chiffrée exigerait une série de résultats comparables.','该议题以政策记录为依据。上方列出有日期的发现；绘制数值趋势需要可比的结果序列。'],
  'The chart data could not be loaded. The dated findings above are still available.':['Les données du graphique n’ont pas pu être chargées. Les constats datés ci-dessus restent accessibles.','图表数据未能加载。上方有日期的发现仍可查阅。'],
  'Retry chart data':['Recharger les données du graphique','重新加载图表数据'],
  'No comparable observations are available for this selection.':['Aucune observation comparable n’est disponible pour ce choix.','该选项暂无可比观测值。'],
  'Loading chart data…':['Chargement des données du graphique…','正在加载图表数据…'],
  'A change in the series does not establish the effect of the selected policy.':['Une variation dans la série ne démontre pas l’effet de la politique choisie.','数据序列的变化不能证明所选政策的效果。'],
  'The latest refresh was incomplete. Check the retrieval date and data coverage.':['La dernière actualisation est incomplète. Vérifiez la date de collecte et la couverture des données.','最近一次刷新不完整。请核查获取日期及数据覆盖范围。']
 };
 function text(key,...args){
  const lang=g.DashboardI18n?.language||'en',entry=copy[key];
  const s=lang==='en'?key:entry?.[lang==='fr'?0:1]||g.InsightsCopy?.text(key,...args)||g.DashboardI18n?.t(key)||key;
  return String(s).replace(/\{(\d+)\}/g,(_,n)=>String(args[n]??''));
 }
 g.RelationshipCopy={text};
})(window);
