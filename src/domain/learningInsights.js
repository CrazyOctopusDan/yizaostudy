import { getKnowledgePoint, KNOWLEDGE_POINTS } from './knowledgePoints.js';

const CASE_PREREQUISITES = ['management', 'pricing', 'civil-measurement'];

function isCompleted(status) {
  return status === 'learned' || status === 'fuzzy' || status === 'mastered';
}

function subjectProgressMap(state) {
  return Object.fromEntries(state.subjects.map((subject) => [subject.id, subject.progress || 0]));
}

function firstIncompleteHighPoint(state) {
  return KNOWLEDGE_POINTS.find((point) => {
    const status = state.knowledgeStatus[point.id]?.status || 'not-started';
    return point.importance === 'high' && !isCompleted(status);
  });
}

function buildWeaknessItems(state) {
  const fuzzyItems = state.reviewQueue
    .map((item) => {
      const point = getKnowledgePoint(item.knowledgePointId);
      if (!point) return null;
      return {
        id: point.id,
        subjectId: point.subjectId,
        title: point.title,
        chapter: point.chapter,
        reason: item.reason || '标记为模糊',
      };
    })
    .filter(Boolean);

  if (fuzzyItems.length > 0) return fuzzyItems.slice(0, 6);

  const fallback = firstIncompleteHighPoint(state);
  if (!fallback) return [];
  return [{
    id: fallback.id,
    subjectId: fallback.subjectId,
    title: fallback.title,
    chapter: fallback.chapter,
    reason: '高权重知识点尚未完成',
  }];
}

export function createLearningStrategy(state) {
  return {
    examViewpoint: '案例分析必须跟着管理、计价、计量做影子练习，不能等到最后一个月才开始。',
    pedagogyViewpoint: '已学只代表接触过；掌握需要经过不看书回忆、间隔复习和题目迁移验证。',
    scheduleRule: '9月17日前完成教材主线和章节回忆，9月17日后进入真题、错题和限时答题冲刺。',
  };
}

export function createReviewInsights(state, today) {
  const progressBySubject = subjectProgressMap(state);
  const caseSelected = state.subjects.some((subject) => subject.id === 'case-analysis' && subject.selected);
  const prerequisiteAverage = Math.round(
    CASE_PREREQUISITES.reduce((sum, subjectId) => sum + (progressBySubject[subjectId] || 0), 0) / CASE_PREREQUISITES.length,
  );
  const weaknessItems = buildWeaknessItems(state);
  const recallTarget = weaknessItems[0] || firstIncompleteHighPoint(state);
  const caseRiskLevel = caseSelected && prerequisiteAverage < 60 ? 'high' : prerequisiteAverage < 80 ? 'medium' : 'low';
  const nextActions = [];

  if (weaknessItems.length > 0) {
    nextActions.push(`先对「${weaknessItems[0].title}」做 5 分钟检索练习：合上书写出定义、公式或适用场景。`);
  }
  if (caseSelected && prerequisiteAverage < 60) {
    nextActions.push('今天追加 1 个案例影子任务：把新学知识对应到案例题模块，只做思路拆解，不限时做整题。');
  }
  if (today >= '2026-09-17') {
    nextActions.push('冲刺期停止扩张新章节，把错题、真题套卷和答题规范放在每日主线。');
  } else {
    nextActions.push('本周保持教材主线推进，但每个高权重点至少安排一次隔日复盘。');
  }

  return {
    bossRadar: {
      title: '考试 Boss 雷达',
      message: `管理、计价、计量前置平均完成率 ${prerequisiteAverage}%，案例准备度按前置知识联动评估。`,
      prerequisiteAverage,
    },
    weaknessDungeon: {
      title: '弱点副本',
      items: weaknessItems,
    },
    recallChallenge: {
      title: '今日回忆挑战',
      prompt: recallTarget
        ? `不看书说出「${recallTarget.title}」的核心定义、计算路径或适用条件，说不完整就保持“模糊”。`
        : '不看书复述今天学过的 3 个关键词，再打开教材核对遗漏。',
    },
    caseLinkage: {
      title: '案例联动提醒',
      level: caseRiskLevel,
      message: caseSelected
        ? `案例依赖管理、计价、计量；当前前置平均 ${prerequisiteAverage}%，应把相关章节同步挂到案例影子任务。`
        : '未勾选案例分析时，系统暂不安排案例影子任务。',
    },
    sprintWarning: {
      title: '冲刺警戒线',
      message: '9月17日后默认进入真题、错题、公式清单和限时答题，不再把新教材章节作为主线。',
    },
    nextActions,
  };
}
