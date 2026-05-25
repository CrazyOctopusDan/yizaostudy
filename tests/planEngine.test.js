import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeTask,
  createInitialState,
  generateTodayTasks,
  summarizeRisk,
} from '../src/domain/planEngine.js';

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

test('completeTask awards EXP and marks task complete', () => {
  const state = createInitialState({ selectedSubjectIds: ['pricing'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25');
  const updated = completeTask(state, state.tasks[0].id, '2026-05-25');
  assert.equal(updated.tasks[0].status, 'completed');
  assert.ok(updated.character.totalExp > 0);
});

test('summarizeRisk reports lag when required tasks are missed', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  state.tasks = generateTodayTasks(state, '2026-05-25').map((task) => ({ ...task, date: '2026-05-20' }));
  const risk = summarizeRisk(state, '2026-05-25');
  assert.equal(risk.level, '明显滞后');
});
