# Yizao Study RPG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-friendly local RPG study planner for the 2026 一级造价工程师（土建） exam.

**Architecture:** Use a dependency-free Node.js local server that serves a static single-page app and persists data to JSON files in the project directory. Keep business rules in small domain modules so plan generation, task completion, EXP, and risk can be tested without a browser.

**Tech Stack:** Node.js 24+, built-in `node:test`, vanilla HTML/CSS/JavaScript, JSON file persistence, Windows `.bat` launcher.

---

## File Structure

- `package.json`: npm scripts for starting and testing the app.
- `server.js`: local HTTP server, static file serving, JSON API routes, browser auto-open.
- `src/domain/subjects.js`: canonical four exam subjects and helper lookup.
- `src/domain/rpg.js`: EXP and level calculations.
- `src/domain/planEngine.js`: stage calculation, initial plan generation, task completion, compensation queue, risk summary.
- `src/storage/jsonStore.js`: local JSON file load/save helpers.
- `public/index.html`: single-page app shell.
- `public/styles.css`: Cozy Quest + Adventure Map visual system.
- `public/app.js`: browser client, rendering, API calls, interaction handling.
- `data/app-data.json`: seedable local data file, created on first run.
- `tests/rpg.test.js`: tests for level and EXP behavior.
- `tests/planEngine.test.js`: tests for subject selection, task generation, completion, and compensation.
- `启动学习计划.bat`: Windows launcher.
- `README.md`: Windows usage, backup, and packaging notes.
- `docs/superpowers/specs/2026-05-25-yizao-study-rpg-design.md`: copied design spec.

## Task 1: Project Skeleton and Tests

**Files:**
- Create: `package.json`
- Create: `tests/rpg.test.js`
- Create: `tests/planEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/rpg.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLevel, awardTaskExp, awardExamExp } from '../src/domain/rpg.js';

test('calculateLevel caps character level at 100', () => {
  assert.deepEqual(calculateLevel(0), { level: 1, currentExp: 0, nextLevelExp: 100, progress: 0 });
  assert.equal(calculateLevel(999999).level, 100);
});

test('awardTaskExp gives more EXP to required tasks than optional tasks', () => {
  assert.ok(awardTaskExp('required') > awardTaskExp('suggested'));
  assert.ok(awardTaskExp('suggested') > awardTaskExp('optional'));
});

test('awardExamExp rewards higher external exam scores', () => {
  assert.ok(awardExamExp({ score: 85, difficulty: 'hard' }) > awardExamExp({ score: 60, difficulty: 'hard' }));
});
```

Create `tests/planEngine.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  generateTodayTasks,
  completeTask,
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
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: FAIL because `src/domain/rpg.js` and `src/domain/planEngine.js` do not exist.

- [ ] **Step 3: Commit test skeleton**

```bash
git add package.json tests/rpg.test.js tests/planEngine.test.js
git commit -m "test: define RPG planner domain behavior"
```

## Task 2: Domain Rules

**Files:**
- Create: `src/domain/subjects.js`
- Create: `src/domain/rpg.js`
- Create: `src/domain/planEngine.js`

- [ ] **Step 1: Implement canonical subjects**

Create `src/domain/subjects.js` with four subject definitions:

```js
export const SUBJECTS = [
  { id: 'management', name: '建设工程造价管理', shortName: '管理', color: '#5f8fda' },
  { id: 'pricing', name: '建设工程计价', shortName: '计价', color: '#d28a39' },
  { id: 'civil-measurement', name: '建设工程技术与计量（土木建筑工程）', shortName: '土建计量', color: '#69a86f' },
  { id: 'case-analysis', name: '建设工程造价案例分析（土木建筑工程）', shortName: '案例', color: '#c45f73' },
];

export function getSubject(subjectId) {
  return SUBJECTS.find((subject) => subject.id === subjectId);
}
```

- [ ] **Step 2: Implement RPG rules**

Create `src/domain/rpg.js` with deterministic level and EXP rules:

```js
const TASK_EXP = {
  required: 80,
  suggested: 40,
  optional: 15,
};

export function calculateLevel(totalExp) {
  const safeExp = Math.max(0, Number(totalExp) || 0);
  const level = Math.min(100, Math.floor(safeExp / 100) + 1);
  if (level === 100) {
    return { level, currentExp: 0, nextLevelExp: 0, progress: 1 };
  }
  const currentExp = safeExp % 100;
  return { level, currentExp, nextLevelExp: 100, progress: currentExp / 100 };
}

export function awardTaskExp(priority) {
  return TASK_EXP[priority] ?? 0;
}

export function awardExamExp({ score, difficulty = 'normal' }) {
  const numericScore = Math.max(0, Math.min(100, Number(score) || 0));
  const difficultyMultiplier = difficulty === 'hard' ? 1.4 : difficulty === 'easy' ? 0.8 : 1;
  return Math.round((30 + numericScore) * difficultyMultiplier);
}
```

- [ ] **Step 3: Implement plan engine**

Create `src/domain/planEngine.js` with state creation, task generation, completion, and risk summary:

```js
import { SUBJECTS } from './subjects.js';
import { awardTaskExp, calculateLevel } from './rpg.js';

const EXAM_DATE = '2026-10-17';

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

export function getStage(today) {
  const remaining = daysBetween(today, EXAM_DATE);
  if (remaining > 110) return '习惯期';
  if (remaining > 60) return '系统学习期';
  if (remaining > 21) return '强化期';
  return '冲刺期';
}

export function createInitialState({ selectedSubjectIds = [], today = '2026-05-25' } = {}) {
  const selected = new Set(selectedSubjectIds);
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
    .flatMap((subject, index) => [
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
        priority: index === 0 ? 'suggested' : 'optional',
        exp: awardTaskExp(index === 0 ? 'suggested' : 'optional'),
        status: 'pending',
        sourceType: 'practice',
      },
    ]);
}

export function ensureTodayTasks(state, today) {
  const existing = state.tasks.some((task) => task.date === today);
  if (existing) return state;
  return { ...state, tasks: [...state.tasks, ...generateTodayTasks(state, today)] };
}

export function completeTask(state, taskId, completedAt) {
  let gainedExp = 0;
  const tasks = state.tasks.map((task) => {
    if (task.id !== taskId || task.status === 'completed') return task;
    gainedExp = task.exp;
    return { ...task, status: 'completed', completedAt };
  });
  const character = {
    ...state.character,
    totalExp: state.character.totalExp + gainedExp,
  };
  return updateSubjectProgress({ ...state, tasks, character });
}

export function updateSubjectSelection(state, selectedSubjectIds) {
  const selected = new Set(selectedSubjectIds);
  return {
    ...state,
    subjects: state.subjects.map((subject) => ({ ...subject, selected: selected.has(subject.id) })),
  };
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

export function summarizeRisk(state, today) {
  const overdueRequired = state.tasks.filter((task) => task.priority === 'required' && task.status !== 'completed' && task.date < today).length;
  if (overdueRequired >= 3) return { level: '需缩科目目标', message: '必做任务积压较多，建议减少本轮科目或启用恢复计划。' };
  if (overdueRequired >= 1) return { level: '明显滞后', message: '存在未完成主线任务，需要在未来 3-7 天分摊补回。' };
  const pendingToday = state.tasks.filter((task) => task.date === today && task.status !== 'completed').length;
  if (pendingToday > 0) return { level: '轻微滞后', message: '今日还有任务未完成，优先完成主线任务。' };
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
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test`

Expected: PASS for all 7 tests.

- [ ] **Step 5: Commit domain rules**

```bash
git add src/domain tests package.json
git commit -m "feat: add RPG study planning rules"
```

## Task 3: Local Persistence and API Server

**Files:**
- Create: `src/storage/jsonStore.js`
- Create: `server.js`

- [ ] **Step 1: Add storage and API tests manually with `node:test` where domain logic remains isolated**

No separate server test is required for MVP; verify through `npm start` and browser smoke test after implementation. Domain correctness remains covered by Task 2 tests.

- [ ] **Step 2: Implement JSON store**

Create `src/storage/jsonStore.js`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInitialState } from '../domain/planEngine.js';

export async function loadState(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const state = createInitialState({ selectedSubjectIds: ['management', 'pricing', 'civil-measurement'], today: todayIso() });
    await saveState(filePath, state);
    return state;
  }
}

export async function saveState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 3: Implement local HTTP server**

Create `server.js` with routes for dashboard, state update, task completion, subject selection, materials, questions, and external exam records.

- [ ] **Step 4: Run API smoke command**

Run: `node server.js --no-open`

Expected: logs local URL and keeps serving without errors.

- [ ] **Step 5: Commit server**

```bash
git add server.js src/storage/jsonStore.js
git commit -m "feat: add local JSON API server"
```

## Task 4: RPG Browser UI

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

- [ ] **Step 1: Implement SPA shell**

Create a page with tabs for 今日学习、学习计划、题目练习、资料库、复盘统计.

- [ ] **Step 2: Implement Cozy Adventure RPG styling**

Use warm parchment colors, card radius under 8px for tool cards where practical, map checkpoints, level bar, subject chips, and clear task buttons.

- [ ] **Step 3: Implement client behavior**

Fetch `/api/dashboard`, render tasks, complete tasks through `/api/tasks/:id/complete`, update subject selections, add materials, add questions, and add exam records.

- [ ] **Step 4: Run browser smoke test**

Run: `npm start`, open `http://localhost:4173`, complete one task, verify EXP increases and task status changes.

- [ ] **Step 5: Commit UI**

```bash
git add public
git commit -m "feat: add RPG planner web UI"
```

## Task 5: Windows Launch and Packaging

**Files:**
- Create: `启动学习计划.bat`
- Create: `README.md`
- Modify: `package.json`
- Copy: `docs/superpowers/specs/2026-05-25-yizao-study-rpg-design.md`

- [ ] **Step 1: Create Windows launcher**

The batch file checks `node --version`, prints a helpful install message when missing, starts `node server.js`, and leaves the window open for logs.

- [ ] **Step 2: Write README**

Document Windows startup, data backup, GitHub repo, and zip packaging command.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
node server.js --no-open
```

Expected: tests pass; server starts.

- [ ] **Step 4: Package zip**

Create a zip excluding `.git`, `node_modules`, and temporary files.

- [ ] **Step 5: Commit and push**

```bash
git add .
git commit -m "feat: build local yizao study RPG app"
git push origin main
```

## Self-Review

- Spec coverage: covers Windows local package, RPG UI, subject selection, task rules, EXP, external exam scores, materials, questions, local data, and future公网扩展.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: subject ids and function names are consistent across tests and implementation tasks.
