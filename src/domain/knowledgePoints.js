const SOURCES = {
  management: 'https://www.233.com/zaojia/dagang/202504/23084826926235.html',
  pricing: 'https://www.233.com/zaojia/dagang/202504/23085248923037.html',
  civilMeasurement: 'https://www.233.com/zaojia/dagang/202504/23085730355709.html',
  caseAnalysis: 'https://www.233.com/zaojia/doc/40/24561_1.html',
};

const SUBJECT_OUTLINES = [
  {
    subjectId: 'management',
    sourceUrl: SOURCES.management,
    chapters: [
      ['工程造价管理及其基本制度', ['工程造价的基本内容', '工程造价管理的组织和内容', '造价工程师管理制度', '工程造价咨询管理制度', '国内外工程造价管理发展']],
      ['相关法律法规', ['建筑法、招标投标法、政府采购法', '民法典、价格法相关内容', '质量与安全生产管理条例', '招标投标法与政府采购法实施条例']],
      ['工程项目管理', ['工程项目组成、分类与建设程序', '项目管理类型、任务及相关制度', '项目组织、计划与控制', '流水施工组织方法', '网络计划技术', '工程项目合同管理', '工程项目信息管理']],
      ['工程经济', ['资金时间价值及计算', '投资方案经济效果评价', '价值工程程序和方法', '寿命周期成本分析']],
      ['工程项目投融资', ['项目资本金制度与资金筹措', '资金成本与资本结构', '项目融资程序和方式', '工程项目税收及保险规定']],
      ['工程建设全过程造价管理', ['决策阶段造价管理', '设计阶段造价管理', '发承包阶段造价管理', '施工阶段造价管理', '竣工阶段造价管理']],
    ],
  },
  {
    subjectId: 'pricing',
    sourceUrl: SOURCES.pricing,
    chapters: [
      ['工程造价构成', ['建设项目总投资与工程造价构成', '建筑安装工程费用构成和计算', '设备及工器具购置费构成和计算', '工程建设其他费用构成和计算', '预备费和建设期利息计算', '国外工程造价构成']],
      ['工程计价方法与依据', ['工程计价方法及依据分类', '工程量清单计价方法', '人工、材料和施工机具消耗量确定', '人工、材料和施工机具单价确定', '工程计价定额编制', '工程计价信息及应用']],
      ['投资决策及设计阶段造价预测', ['决策阶段影响造价因素', '投资估算编制', '设计阶段影响造价因素', '设计概算编制', '施工图预算编制']],
      ['发承包阶段合同价款约定', ['招标工程量清单编制', '最高投标限价编制', '投标报价编制', '评标及中标价确定', '施工合同价款约定', '总承包合同价款约定', '国际工程合同价款约定']],
      ['施工阶段合同价款调整与结算', ['工程合同价款调整', '工程索赔处理原则和计算', '工程价款支付与结算', '合同价款纠纷及造价鉴定', '工程总承包和国际工程结算']],
      ['竣工决算和新增资产价值', ['竣工决算内容和编制', '新增资产价值确定']],
    ],
  },
  {
    subjectId: 'civil-measurement',
    sourceUrl: SOURCES.civilMeasurement,
    chapters: [
      ['工程地质', ['岩体的特征', '地下水的类型与特征', '常见工程地质问题及处理方法', '工程地质对工程建设的影响']],
      ['工程构造', ['工业与民用建筑分类、组成及构造', '道路工程分类、组成及构造', '桥梁工程分类、组成及构造', '涵洞工程分类、组成及构造', '地下工程分类、组成及构造']],
      ['工程材料', ['结构材料分类、特性及应用', '装饰材料分类、特性及应用', '功能材料分类、特性及应用']],
      ['工程施工技术', ['建筑工程施工技术', '道路工程施工技术', '桥梁与涵洞工程施工技术', '地下工程施工技术']],
      ['工程计量', ['工程计量基本原理和方法', '建筑面积计算规则', '土石方工程量计算', '地基处理与边坡支护工程量计算', '桩基础工程量计算', '砌筑与混凝土工程量计算', '金属结构和屋面防水工程量计算', '保温隔热与装饰工程量计算']],
    ],
  },
  {
    subjectId: 'case-analysis',
    sourceUrl: SOURCES.caseAnalysis,
    chapters: [
      ['建设项目投资估算与财务分析', ['建设项目投资估算', '建设项目财务分析', '不确定性分析与风险分析']],
      ['工程设计、施工方案技术经济分析', ['技术经济指标设置', '设计和施工方案评价', '方案比选与优化', '工程网络计划调整与优化']],
      ['工程计量与计价', ['工程计量', '工程定额和指标应用', '设计概算与施工图预算', '工程量清单计价']],
      ['工程招标投标', ['招标方式和程序', '招标文件与工程量清单', '投标报价策略', '评标定标与合同签订']],
      ['工程合同价款管理', ['合同价款调整', '工程索赔', '工程价款支付', '合同争议处理']],
      ['工程结算与决算', ['工程结算编制与审核', '竣工决算编制', '新增资产价值确定']],
    ],
  },
];

function pointWeight(chapterIndex, pointIndex) {
  if (chapterIndex <= 1 || pointIndex <= 1) return 'high';
  if (chapterIndex <= 3) return 'medium';
  return 'normal';
}

function pointMinutes(importance) {
  if (importance === 'high') return 35;
  if (importance === 'medium') return 30;
  return 25;
}

export const KNOWLEDGE_POINTS = SUBJECT_OUTLINES.flatMap((subjectOutline) =>
  subjectOutline.chapters.flatMap(([chapter, points], chapterIndex) =>
    points.map((title, pointIndex) => {
      const importance = pointWeight(chapterIndex, pointIndex);
      return {
        id: `${subjectOutline.subjectId}-${String(chapterIndex + 1).padStart(2, '0')}-${String(pointIndex + 1).padStart(2, '0')}`,
        subjectId: subjectOutline.subjectId,
        chapter,
        title,
        estimatedMinutes: pointMinutes(importance),
        importance,
        sourceUrl: subjectOutline.sourceUrl,
      };
    }),
  ),
);

export function getKnowledgePointsForSubject(subjectId) {
  return KNOWLEDGE_POINTS.filter((point) => point.subjectId === subjectId);
}

export function getKnowledgePoint(pointId) {
  return KNOWLEDGE_POINTS.find((point) => point.id === pointId);
}
