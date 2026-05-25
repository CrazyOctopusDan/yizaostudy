import { awardExamExp, awardTaskExp, calculateLevel } from './rpg.js';
import { getKnowledgePoint, getKnowledgePointsForSubject, KNOWLEDGE_POINTS, TEXTBOOK_TREE } from './knowledgePoints.js';
import { SUBJECTS } from './subjects.js';

export const EXAM_DATE = '2026-10-17';
export const SPRINT_START_DATE = '2026-09-17';

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

function selectedSubjectSet(selectedSubjectIds) {
  return new Set(selectedSubjectIds.filter(Boolean));
}

export function getStage(today) {
  if (today >= SPRINT_START_DATE) return '冲刺期';
  const remaining = daysBetween(today, EXAM_DATE);
  if (remaining > 110) return '习惯期';
  if (remaining > 60) return '系统学习期';
  if (remaining > 21) return '强化期';
  return '冲刺期';
}

function createKnowledgeStatus() {
  return Object.fromEntries(
    KNOWLEDGE_POINTS.map((point) => [
      point.id,
      {
        status: 'not-started',
        reviewCount: 0,
        updatedAt: null,
      },
    ]),
  );
}

function isCompletedStatus(status) {
  return status === 'learned' || status === 'fuzzy' || status === 'mastered';
}

function summarizeNodeProgress(children) {
  const totalCount = children.reduce((sum, child) => sum + child.totalCount, 0);
  const completedCount = children.reduce((sum, child) => sum + child.completedCount, 0);
  return {
    totalCount,
    completedCount,
    progress: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}

export function buildTextbookTreeProgress(state) {
  const normalizedState = normalizeState(state);
  return TEXTBOOK_TREE.map((subject) => {
    const chapters = subject.chapters.map((chapter, chapterIndex) => {
      const sections = chapter.sections.map((section, sectionIndex) => {
        const items = section.items.map((title, itemIndex) => {
          const pointId = `${subject.subjectId}-${String(chapterIndex + 1).padStart(2, '0')}-${String(sectionIndex + 1).padStart(2, '0')}-${String(itemIndex + 1).padStart(2, '0')}`;
          const point = getKnowledgePoint(pointId);
          const status = normalizedState.knowledgeStatus[pointId]?.status || 'not-started';
          return {
            ...point,
            status,
            completed: isCompletedStatus(status),
            totalCount: 1,
            completedCount: isCompletedStatus(status) ? 1 : 0,
          };
        });

        return {
          title: section.title,
          items,
          ...summarizeNodeProgress(items),
        };
      });

      return {
        title: chapter.title,
        sections,
        ...summarizeNodeProgress(sections),
      };
    });

    return {
      subjectId: subject.subjectId,
      sourceUrl: subject.sourceUrl,
      chapters,
      ...summarizeNodeProgress(chapters),
    };
  });
}

export function normalizeState(state) {
  const existingStatus = state.knowledgeStatus || {};
  return {
    ...state,
    character: {
      name: '造价勇者',
      totalExp: 0,
      streak: 0,
      lastStudyDate: null,
      ...state.character,
    },
    materials: state.materials || [],
    questions: state.questions || [],
    examRecords: state.examRecords || [],
    reviewQueue: state.reviewQueue || [],
    knowledgeStatus: Object.fromEntries(
      KNOWLEDGE_POINTS.map((point) => [
        point.id,
        {
          status: 'not-started',
          reviewCount: 0,
          updatedAt: null,
          ...existingStatus[point.id],
        },
      ]),
    ),
  };
}

export function createInitialState({ selectedSubjectIds = [], today = '2026-05-25' } = {}) {
  const selected = selectedSubjectSet(selectedSubjectIds);

  return {
    profile: {
      examDate: EXAM_DATE,
      province: '浙江省',
      city: '嘉兴市',
      specialty: '土木建筑工程',
      createdAt: today,
    },
    character: {
      name: '造价勇者',
      totalExp: 0,
      streak: 0,
      lastStudyDate: null,
    },
    subjects: SUBJECTS.map((subject) => ({
      ...subject,
      selected: selected.has(subject.id),
      progress: 0,
      masteryExp: 0,
    })),
    tasks: [],
    materials: [],
    questions: [],
    examRecords: [],
    reviewQueue: [],
    knowledgeStatus: createKnowledgeStatus(),
  };
}

export function generateTodayTasks(state, today) {
  const normalizedState = normalizeState(state);
  const stage = getStage(today);

  return normalizedState.subjects
    .filter((subject) => subject.selected)
    .flatMap((subject, index) => {
      if (today >= SPRINT_START_DATE) {
        return [
          {
            id: `${today}-${subject.id}-sprint-paper`,
            date: today,
            subjectId: subject.id,
            title: `${subject.shortName} 冲刺刷题`,
            description: '最后一个月只安排套卷、真题、错题和薄弱点回炉，不再推进新知识点。',
            priority: index === 0 ? 'required' : 'suggested',
            exp: awardTaskExp(index === 0 ? 'required' : 'suggested'),
            status: 'pending',
            sourceType: 'practice',
          },
          {
            id: `${today}-${subject.id}-sprint-review`,
            date: today,
            subjectId: subject.id,
            title: `${subject.shortName} 薄弱点回炉`,
            description: '复盘模糊、错题和高频知识点，整理考前记忆清单。',
            priority: 'suggested',
            exp: awardTaskExp('suggested'),
            status: 'pending',
            sourceType: 'review',
          },
        ];
      }

      const nextPoint = getKnowledgePointsForSubject(subject.id).find((point) => {
        const status = normalizedState.knowledgeStatus[point.id]?.status;
        return status === 'not-started' || status === 'fuzzy';
      });

      if (!nextPoint) {
        return [
          {
            id: `${today}-${subject.id}-knowledge-review`,
            date: today,
            subjectId: subject.id,
            title: `${subject.shortName} 知识点复盘`,
            description: '本轮知识点已学完，今天复盘错题和模糊知识点。',
            priority: 'required',
            exp: awardTaskExp('required'),
            status: 'pending',
            sourceType: 'review',
          },
        ];
      }

      const practicePriority = index === 0 ? 'suggested' : 'optional';
      return [
        {
          id: `${today}-${nextPoint.id}`,
          date: today,
          subjectId: subject.id,
          knowledgePointId: nextPoint.id,
          title: `${subject.shortName} / ${nextPoint.chapter} / ${nextPoint.section}`,
          description: `${nextPoint.title}。预计 ${nextPoint.estimatedMinutes} 分钟，重要程度：${nextPoint.importance}。`,
          priority: 'required',
          exp: awardTaskExp('required'),
          status: 'pending',
          sourceType: 'knowledge',
          estimatedMinutes: nextPoint.estimatedMinutes,
          importance: nextPoint.importance,
          sourceUrl: nextPoint.sourceUrl,
        },
        {
          id: `${today}-${subject.id}-practice`,
          date: today,
          subjectId: subject.id,
          title: `${subject.shortName} 配套练习`,
          description: `围绕“${nextPoint.title}”完成 5-10 道相关题或整理 2 条易错点。`,
          priority: practicePriority,
          exp: awardTaskExp(practicePriority),
          status: 'pending',
          sourceType: 'practice',
        },
      ];
    });
}

export function ensureTodayTasks(state, today) {
  const normalizedState = normalizeState(state);
  const selectedIds = new Set(normalizedState.subjects.filter((subject) => subject.selected).map((subject) => subject.id));
  const todayTemplates = generateTodayTasks(normalizedState, today);
  const existingTodayById = new Map(normalizedState.tasks.filter((task) => task.date === today).map((task) => [task.id, task]));
  const nonTodayTasks = normalizedState.tasks.filter((task) => task.date !== today);
  const refreshedTodayTasks = todayTemplates.map((template) => {
    const existing = existingTodayById.get(template.id);
    if (!existing) return template;
    return existing.status === 'completed'
      ? { ...template, status: 'completed', completedAt: existing.completedAt, masteryStatus: existing.masteryStatus }
      : template;
  });
  const completedLegacyTodayTasks = normalizedState.tasks.filter((task) => (
    task.date === today
    && task.status === 'completed'
    && selectedIds.has(task.subjectId)
    && !todayTemplates.some((template) => template.id === task.id)
  ));

  return { ...normalizedState, tasks: [...nonTodayTasks, ...refreshedTodayTasks, ...completedLegacyTodayTasks] };
}

export function updateSubjectProgress(state) {
  const normalizedState = normalizeState(state);
  const subjects = normalizedState.subjects.map((subject) => {
    const points = getKnowledgePointsForSubject(subject.id);
    if (points.length === 0) return subject;
    const completed = points.filter((point) => {
      const status = normalizedState.knowledgeStatus[point.id]?.status;
      return isCompletedStatus(status);
    }).length;
    return { ...subject, progress: Math.round((completed / points.length) * 100) };
  });
  return { ...normalizedState, subjects };
}

export function completeKnowledgePoint(state, knowledgePointId, completedAt, masteryStatus = 'learned') {
  const normalizedState = normalizeState(state);
  const point = getKnowledgePoint(knowledgePointId);
  if (!point) return normalizedState;

  const previousStatus = normalizedState.knowledgeStatus[knowledgePointId]?.status;
  const gainedExp = isCompletedStatus(previousStatus) ? 0 : awardTaskExp('required');
  const knowledgeStatus = {
    ...normalizedState.knowledgeStatus,
    [knowledgePointId]: {
      ...normalizedState.knowledgeStatus[knowledgePointId],
      status: masteryStatus,
      updatedAt: completedAt,
    },
  };

  let reviewQueue = normalizedState.reviewQueue;
  if (masteryStatus === 'fuzzy' && !reviewQueue.some((item) => item.knowledgePointId === knowledgePointId)) {
    reviewQueue = [
      ...reviewQueue,
      {
        knowledgePointId,
        subjectId: point.subjectId,
        title: point.title,
        addedAt: completedAt,
        reason: '标记为模糊',
      },
    ];
  }

  const tasks = normalizedState.tasks.map((task) => (
    task.knowledgePointId === knowledgePointId && task.status !== 'completed'
      ? { ...task, status: 'completed', completedAt, masteryStatus }
      : task
  ));

  const subjects = normalizedState.subjects.map((subject) => (
    subject.id === point.subjectId
      ? { ...subject, masteryExp: subject.masteryExp + gainedExp }
      : subject
  ));

  return updateSubjectProgress({
    ...normalizedState,
    tasks,
    subjects,
    knowledgeStatus,
    reviewQueue,
    character: {
      ...normalizedState.character,
      totalExp: normalizedState.character.totalExp + gainedExp,
      lastStudyDate: completedAt,
    },
  });
}

export function completeTask(state, taskId, completedAt, options = {}) {
  const normalizedState = normalizeState(state);
  let gainedExp = 0;
  let completedSubjectId = null;
  let completedKnowledgePointId = null;
  const masteryStatus = options.masteryStatus || 'learned';

  const tasks = normalizedState.tasks.map((task) => {
    if (task.id !== taskId || task.status === 'completed') return task;
    gainedExp = task.exp;
    completedSubjectId = task.subjectId;
    completedKnowledgePointId = task.knowledgePointId || null;
    return { ...task, status: 'completed', completedAt, masteryStatus };
  });

  const subjects = normalizedState.subjects.map((subject) => {
    if (subject.id !== completedSubjectId) return subject;
    return { ...subject, masteryExp: subject.masteryExp + gainedExp };
  });

  const knowledgeStatus = { ...normalizedState.knowledgeStatus };
  let reviewQueue = normalizedState.reviewQueue;
  if (completedKnowledgePointId) {
    knowledgeStatus[completedKnowledgePointId] = {
      ...knowledgeStatus[completedKnowledgePointId],
      status: masteryStatus,
      updatedAt: completedAt,
    };

    if (masteryStatus === 'fuzzy') {
      const exists = reviewQueue.some((item) => item.knowledgePointId === completedKnowledgePointId);
      if (!exists) {
        const point = getKnowledgePoint(completedKnowledgePointId);
        reviewQueue = [
          ...reviewQueue,
          {
            knowledgePointId: completedKnowledgePointId,
            subjectId: completedSubjectId,
            title: point?.title || completedKnowledgePointId,
            addedAt: completedAt,
            reason: '标记为模糊',
          },
        ];
      }
    }
  }

  return updateSubjectProgress({
    ...normalizedState,
    tasks,
    subjects,
    knowledgeStatus,
    reviewQueue,
    character: {
      ...normalizedState.character,
      totalExp: normalizedState.character.totalExp + gainedExp,
      lastStudyDate: completedAt,
    },
  });
}

export function updateSubjectSelection(state, selectedSubjectIds) {
  const selected = selectedSubjectSet(selectedSubjectIds);
  return {
    ...state,
    subjects: state.subjects.map((subject) => ({ ...subject, selected: selected.has(subject.id) })),
  };
}

export function addMaterial(state, material) {
  return {
    ...state,
    materials: [
      ...state.materials,
      {
        id: material.id ?? `material-${Date.now()}`,
        title: material.title,
        url: material.url,
        subjectId: material.subjectId,
        type: material.type ?? 'link',
        notes: material.notes ?? '',
      },
    ],
  };
}

export function addQuestion(state, question) {
  return {
    ...state,
    questions: [
      ...state.questions,
      {
        id: question.id ?? `question-${Date.now()}`,
        stem: question.stem,
        answer: question.answer ?? '',
        explanation: question.explanation ?? '',
        subjectId: question.subjectId,
        year: question.year ?? '',
        sourceUrl: question.sourceUrl ?? '',
        wrong: Boolean(question.wrong),
      },
    ],
  };
}

export function addExamRecord(state, record) {
  const exp = awardExamExp({ score: record.score, difficulty: record.difficulty });
  return {
    ...state,
    character: {
      ...state.character,
      totalExp: state.character.totalExp + exp,
    },
    examRecords: [
      ...state.examRecords,
      {
        id: record.id ?? `exam-${Date.now()}`,
        subjectId: record.subjectId,
        title: record.title,
        score: Number(record.score) || 0,
        difficulty: record.difficulty ?? 'normal',
        date: record.date,
        exp,
      },
    ],
  };
}

export function summarizeRisk(state, today) {
  const overdueRequired = state.tasks.filter(
    (task) => task.priority === 'required' && task.status !== 'completed' && task.date < today,
  ).length;

  if (overdueRequired >= 3) {
    return { level: '需缩科目目标', message: '必做任务积压较多，建议减少本轮科目或启用恢复计划。' };
  }

  if (overdueRequired >= 1) {
    return { level: '明显滞后', message: '存在未完成主线任务，需要在未来 3-7 天分摊补回。' };
  }

  const pendingToday = state.tasks.filter((task) => task.date === today && task.status !== 'completed').length;
  if (pendingToday > 0) {
    return { level: '轻微滞后', message: '今日还有任务未完成，优先完成主线任务。' };
  }

  return { level: '正常', message: '今日关键任务已完成，保持节奏。' };
}

export function createDashboard(state, today) {
  const preparedState = updateSubjectProgress(ensureTodayTasks(state, today));
  const totalExp = preparedState.character.totalExp;

  return {
    state: preparedState,
    today,
    stage: getStage(today),
    daysLeft: daysBetween(today, preparedState.profile.examDate),
    character: {
      ...preparedState.character,
      ...calculateLevel(totalExp),
    },
    selectedSubjects: preparedState.subjects.filter((subject) => subject.selected),
    todayTasks: preparedState.tasks.filter((task) => task.date === today),
    knowledgePoints: KNOWLEDGE_POINTS,
    textbookTree: buildTextbookTreeProgress(preparedState),
    sprintStartDate: SPRINT_START_DATE,
    risk: summarizeRisk(preparedState, today),
  };
}
