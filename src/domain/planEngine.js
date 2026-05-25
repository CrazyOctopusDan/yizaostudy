import { awardExamExp, awardTaskExp, calculateLevel } from './rpg.js';
import { SUBJECTS } from './subjects.js';

export const EXAM_DATE = '2026-10-17';

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

function selectedSubjectSet(selectedSubjectIds) {
  return new Set(selectedSubjectIds.filter(Boolean));
}

export function getStage(today) {
  const remaining = daysBetween(today, EXAM_DATE);
  if (remaining > 110) return '习惯期';
  if (remaining > 60) return '系统学习期';
  if (remaining > 21) return '强化期';
  return '冲刺期';
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
  };
}

export function generateTodayTasks(state, today) {
  const stage = getStage(today);

  return state.subjects
    .filter((subject) => subject.selected)
    .flatMap((subject, index) => {
      const practicePriority = index === 0 ? 'suggested' : 'optional';
      return [
        {
          id: `${today}-${subject.id}-main`,
          date: today,
          subjectId: subject.id,
          title: `${subject.shortName} 主线学习`,
          description: `${stage}：完成一个教材小节，并记录 3 个关键点。`,
          priority: 'required',
          exp: awardTaskExp('required'),
          status: 'pending',
          sourceType: 'study',
        },
        {
          id: `${today}-${subject.id}-practice`,
          date: today,
          subjectId: subject.id,
          title: `${subject.shortName} 真题练习`,
          description: index === 0 ? '完成 10 道相关真题或错题复盘。' : '完成 5 道相关真题或错题复盘。',
          priority: practicePriority,
          exp: awardTaskExp(practicePriority),
          status: 'pending',
          sourceType: 'practice',
        },
      ];
    });
}

export function ensureTodayTasks(state, today) {
  const existing = state.tasks.some((task) => task.date === today);
  if (existing) return state;
  return { ...state, tasks: [...state.tasks, ...generateTodayTasks(state, today)] };
}

export function updateSubjectProgress(state) {
  const subjects = state.subjects.map((subject) => {
    const subjectTasks = state.tasks.filter((task) => task.subjectId === subject.id);
    if (subjectTasks.length === 0) return subject;
    const completed = subjectTasks.filter((task) => task.status === 'completed').length;
    return { ...subject, progress: Math.round((completed / subjectTasks.length) * 100) };
  });
  return { ...state, subjects };
}

export function completeTask(state, taskId, completedAt) {
  let gainedExp = 0;
  let completedSubjectId = null;

  const tasks = state.tasks.map((task) => {
    if (task.id !== taskId || task.status === 'completed') return task;
    gainedExp = task.exp;
    completedSubjectId = task.subjectId;
    return { ...task, status: 'completed', completedAt };
  });

  const subjects = state.subjects.map((subject) => {
    if (subject.id !== completedSubjectId) return subject;
    return { ...subject, masteryExp: subject.masteryExp + gainedExp };
  });

  return updateSubjectProgress({
    ...state,
    tasks,
    subjects,
    character: {
      ...state.character,
      totalExp: state.character.totalExp + gainedExp,
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
  const preparedState = ensureTodayTasks(state, today);
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
    risk: summarizeRisk(preparedState, today),
  };
}
