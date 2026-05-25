import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeTask,
  completeKnowledgePoint,
  createInitialState,
  createDashboard,
  generateTodayTasks,
  normalizeState,
  postponeTask,
  summarizeRisk,
  updateSubjectSelection,
} from '../src/domain/planEngine.js';
import { KNOWLEDGE_POINTS } from '../src/domain/knowledgePoints.js';

test('createInitialState lists four subjects and enables only selected subjects', () => {
  const state = createInitialState({ selectedSubjectIds: ['management', 'pricing'], today: '2026-05-25' });
  assert.equal(state.subjects.length, 4);
  assert.deepEqual(state.subjects.filter((subject) => subject.selected).map((subject) => subject.id), ['management', 'pricing']);
});

test('generateTodayTasks creates tasks only for selected subjects', () => {
  const state = createInitialState({ selectedSubjectIds: ['civil-measurement'], today: '2026-05-25' });
  const tasks = generateTodayTasks(state, '2026-05-25');
  assert.ok(tasks.length > 0);
  assert.ok(tasks.every((task) => task.subjectId === 'civil-measurement'));
});

test('generateTodayTasks names the exact knowledge point before sprint month', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const tasks = generateTodayTasks(state, '2026-05-25');
  const studyTask = tasks.find((task) => task.sourceType === 'knowledge');

  assert.equal(studyTask.knowledgePointId, 'management-01-01-01');
  assert.match(studyTask.title, /工程造价管理及其基本制度/);
  assert.match(studyTask.description, /工程造价及计价特征/);
  assert.equal(studyTask.estimatedMinutes, 35);
});

test('createDashboard exposes textbook tree with chapters, sections, item status, and progress', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const dashboard = createDashboard(state, '2026-05-25');
  const tree = dashboard.textbookTree.find((subject) => subject.subjectId === 'management');

  assert.equal(tree.chapters[0].title, '工程造价管理及其基本制度');
  assert.equal(tree.chapters[0].sections[0].title, '工程造价基本内容');
  assert.equal(tree.chapters[0].sections[0].items[0].title, '工程造价及计价特征');
  assert.equal(tree.chapters[0].sections[0].items[0].status, 'not-started');
  assert.equal(tree.chapters[0].completedCount, 0);
  assert.ok(tree.chapters[0].totalCount > 0);
});

test('completeKnowledgePoint updates tree status, subject progress, and EXP', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const updated = completeKnowledgePoint(state, 'management-01-01-01', '2026-05-25', 'mastered');
  const dashboard = createDashboard(updated, '2026-05-25');
  const tree = dashboard.textbookTree.find((subject) => subject.subjectId === 'management');
  const item = tree.chapters[0].sections[0].items[0];

  assert.equal(item.status, 'mastered');
  assert.ok(tree.chapters[0].completedCount > 0);
  assert.ok(dashboard.selectedSubjects[0].progress > 0);
  assert.ok(dashboard.character.totalExp > 0);
});

test('completeKnowledgePoint can reset a mistaken status to not-started', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const fuzzy = completeKnowledgePoint(state, 'management-01-01-01', '2026-05-25', 'fuzzy');
  const reset = completeKnowledgePoint(fuzzy, 'management-01-01-01', '2026-05-25', 'not-started');
  const dashboard = createDashboard(reset, '2026-05-25');
  const tree = dashboard.textbookTree.find((subject) => subject.subjectId === 'management');
  const item = tree.chapters[0].sections[0].items[0];

  assert.equal(item.status, 'not-started');
  assert.equal(item.completed, false);
  assert.equal(tree.chapters[0].completedCount, 0);
  assert.equal(dashboard.character.totalExp, 0);
  assert.equal(dashboard.state.reviewQueue.some((entry) => entry.knowledgePointId === 'management-01-01-01'), false);
});

test('completeKnowledgePoint changes fuzzy to mastered without duplicate EXP', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const fuzzy = completeKnowledgePoint(state, 'management-01-01-01', '2026-05-25', 'fuzzy');
  const mastered = completeKnowledgePoint(fuzzy, 'management-01-01-01', '2026-05-26', 'mastered');

  assert.equal(mastered.knowledgeStatus['management-01-01-01'].status, 'mastered');
  assert.equal(mastered.reviewQueue.some((entry) => entry.knowledgePointId === 'management-01-01-01'), false);
  assert.equal(mastered.character.totalExp, fuzzy.character.totalExp);
});

test('generateTodayTasks reserves the final month for sprint practice instead of new knowledge', () => {
  const state = createInitialState({ selectedSubjectIds: ['pricing'], today: '2026-09-17' });
  const tasks = generateTodayTasks(state, '2026-09-17');

  assert.ok(tasks.length > 0);
  assert.ok(tasks.every((task) => task.sourceType !== 'knowledge'));
  assert.ok(tasks.some((task) => task.title.includes('冲刺')));
});

test('createDashboard flags case-analysis risk when prerequisite subjects are weak', () => {
  const state = createInitialState({
    selectedSubjectIds: ['management', 'pricing', 'civil-measurement', 'case-analysis'],
    today: '2026-08-20',
  });
  const dashboard = createDashboard(state, '2026-08-20');

  assert.equal(dashboard.learningStrategy.examViewpoint, '案例分析必须跟着管理、计价、计量做影子练习，不能等到最后一个月才开始。');
  assert.equal(dashboard.reviewInsights.caseLinkage.level, 'high');
  assert.match(dashboard.reviewInsights.caseLinkage.message, /案例/);
  assert.ok(dashboard.reviewInsights.nextActions.some((action) => action.includes('案例影子任务')));
});

test('createDashboard recommends retrieval practice for fuzzy knowledge points', () => {
  const state = createInitialState({ selectedSubjectIds: ['pricing'], today: '2026-05-25' });
  const fuzzy = completeKnowledgePoint(state, 'pricing-02-03-01', '2026-05-25', 'fuzzy');
  const dashboard = createDashboard(fuzzy, '2026-05-26');

  assert.ok(dashboard.reviewInsights.weaknessDungeon.items.some((item) => item.id === 'pricing-02-03-01'));
  assert.match(dashboard.reviewInsights.recallChallenge.prompt, /不看书/);
  assert.ok(dashboard.reviewInsights.nextActions.some((action) => action.includes('检索练习')));
});

test('createDashboard exposes categorized resources and enables practice when question banks exist', () => {
  const state = createInitialState({ selectedSubjectIds: ['pricing'], today: '2026-05-25' });
  const dashboard = createDashboard(state, '2026-05-25');

  assert.equal(dashboard.practiceEnabled, true);
  assert.ok(dashboard.resourceCatalog.official.some((resource) => resource.title.includes('考试大纲')));
  assert.ok(dashboard.resourceCatalog.questionBanks.some((resource) => resource.title.includes('真题')));
  assert.ok(dashboard.resourceCatalog.materials.some((resource) => resource.accessLevel === 'partial-free'));
});

test('completeTask awards EXP and marks task complete', () => {
  const state = createInitialState({ selectedSubjectIds: ['pricing'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25');
  const updated = completeTask(state, state.tasks[0].id, '2026-05-25', { masteryStatus: 'mastered' });
  assert.equal(updated.tasks[0].status, 'completed');
  assert.ok(updated.character.totalExp > 0);
});

test('completeTask records knowledge point mastery and review queue', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25');
  const knowledgeTask = state.tasks.find((task) => task.sourceType === 'knowledge');
  const updated = completeTask(state, knowledgeTask.id, '2026-05-25', { masteryStatus: 'fuzzy' });

  assert.equal(updated.knowledgeStatus[knowledgeTask.knowledgePointId].status, 'fuzzy');
  assert.equal(updated.reviewQueue[0].knowledgePointId, knowledgeTask.knowledgePointId);
});

test('postponeTask postpones only today task without changing knowledge status or EXP', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25');
  const knowledgeTask = state.tasks.find((task) => task.sourceType === 'knowledge');
  const postponed = postponeTask(state, knowledgeTask.id, '2026-05-25');
  const task = postponed.tasks.find((item) => item.id === knowledgeTask.id);

  assert.equal(task.status, 'postponed');
  assert.equal(task.postponedAt, '2026-05-25');
  assert.equal(postponed.knowledgeStatus[knowledgeTask.knowledgePointId].status, 'not-started');
  assert.equal(postponed.character.totalExp, 0);
  assert.equal(postponed.reviewQueue.length, 0);
});

test('normalizeState backfills knowledge status for existing data', () => {
  const legacy = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  delete legacy.knowledgeStatus;
  const normalized = normalizeState(legacy);

  assert.equal(Object.keys(normalized.knowledgeStatus).length, KNOWLEDGE_POINTS.length);
  assert.equal(normalized.knowledgeStatus['management-01-01-01'].status, 'not-started');
});

test('summarizeRisk reports lag when required tasks are missed', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25').map((task) => ({ ...task, date: '2026-05-20' }));
  const risk = summarizeRisk(state, '2026-05-25');
  assert.equal(risk.level, '明显滞后');
});

test('createDashboard refreshes today tasks after subject selection changes', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const firstDashboard = createDashboard(state, '2026-05-25');
  const changedState = updateSubjectSelection(firstDashboard.state, ['pricing']);
  const refreshedDashboard = createDashboard(changedState, '2026-05-25');

  assert.ok(refreshedDashboard.todayTasks.length > 0);
  assert.ok(refreshedDashboard.todayTasks.every((task) => task.subjectId === 'pricing'));
});
