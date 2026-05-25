# Yizao Textbook Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat knowledge-point planning with a textbook-directory tree that shows completed and incomplete study nodes clearly.

**Architecture:** Keep the app dependency-free. Add a tree-shaped textbook data module, derive flat leaf tasks from it for scheduling, and render the tree in the existing single-page app. Reuse `knowledgeStatus` for completion state so old local data remains compatible.

**Tech Stack:** Node.js built-in `node:test`, vanilla JavaScript modules, local JSON persistence, HTML/CSS tree UI.

---

## File Structure

- `src/domain/knowledgePoints.js`: Replace flat `SUBJECT_OUTLINES` generation with a textbook tree plus derived leaf nodes.
- `src/domain/planEngine.js`: Continue scheduling from leaf nodes, expose the tree in dashboard output, and support direct tree-node completion.
- `server.js`: Return `textbookTree` in all dashboard responses and allow completion of tree leaf nodes through the existing task endpoint.
- `public/app.js`: Render textbook tree, node progress, and leaf-node mastery buttons in the plan page.
- `public/styles.css`: Add tree, status, and compact progress styles.
- `tests/planEngine.test.js`: Add behavior tests for tree shape, progress aggregation, and direct node completion.
- `tests/server.test.js`: Add API smoke coverage for `textbookTree`.
- `README.md`: Document the textbook-tree planning rule and sprint-month behavior.

## Task 1: Test the Textbook Tree Contract

**Files:**
- Modify: `tests/planEngine.test.js`
- Modify: `tests/server.test.js`

- [ ] **Step 1: Add failing tests**

Add tests asserting:

```js
test('dashboard exposes textbook tree with chapters, sections, and item status', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const dashboard = createDashboard(state, '2026-05-25');
  const managementTree = dashboard.textbookTree.find((subject) => subject.subjectId === 'management');

  assert.equal(managementTree.chapters[0].title, '工程造价管理及其基本制度');
  assert.equal(managementTree.chapters[0].sections[0].title, '工程造价基本内容');
  assert.equal(managementTree.chapters[0].sections[0].items[0].title, '工程造价及计价特征');
  assert.equal(managementTree.chapters[0].sections[0].items[0].status, 'not-started');
});

test('completeKnowledgePoint updates tree status and subject progress', () => {
  const state = createInitialState({ selectedSubjectIds: ['management'], today: '2026-05-25' });
  const updated = completeKnowledgePoint(state, 'management-01-01-01', '2026-05-25', 'mastered');
  const dashboard = createDashboard(updated, '2026-05-25');
  const item = dashboard.textbookTree[0].chapters[0].sections[0].items[0];

  assert.equal(item.status, 'mastered');
  assert.ok(dashboard.selectedSubjects[0].progress > 0);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: FAIL because `textbookTree` and `completeKnowledgePoint` are not implemented.

## Task 2: Implement Textbook Tree Data

**Files:**
- Modify: `src/domain/knowledgePoints.js`

- [ ] **Step 1: Add tree constants**

Define `TEXTBOOK_TREE` with four subjects, chapters, sections, and leaf items. Leaf IDs use `subject-cc-ss-ii`, such as `management-01-01-01`.

- [ ] **Step 2: Derive flat leaf points**

Export `KNOWLEDGE_POINTS`, `getKnowledgePointsForSubject`, `getKnowledgePoint`, and `getTextbookTreeForSubject` from the tree so existing scheduling code keeps working.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: existing tests still pass except tests that need plan-engine support.

## Task 3: Implement Tree Progress and Direct Completion

**Files:**
- Modify: `src/domain/planEngine.js`
- Modify: `server.js`

- [ ] **Step 1: Add `buildTextbookTreeProgress`**

Build a dashboard tree that merges `TEXTBOOK_TREE` with `knowledgeStatus`, and computes `completedCount`, `totalCount`, and `progress` at chapter and section level.

- [ ] **Step 2: Add `completeKnowledgePoint`**

Implement direct node completion for plan-tree buttons. It updates `knowledgeStatus`, adds EXP, updates subject mastery EXP, pushes fuzzy nodes to `reviewQueue`, and recalculates subject progress.

- [ ] **Step 3: Expose `textbookTree`**

Return `textbookTree` from `createDashboard` and all serialized API responses.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all domain and server tests pass.

## Task 4: Render the Tree UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Replace plan-page knowledge list**

Render `state.dashboard.textbookTree` as nested chapter, section, and item rows. Show completion counts and status badges.

- [ ] **Step 2: Add item mastery actions**

Leaf item buttons call `/api/knowledge-points/:id/complete` with `{ masteryStatus }`.

- [ ] **Step 3: Style tree**

Add compact RPG-styled tree rows, progress bars, and status tags without nesting cards inside cards.

- [ ] **Step 4: Verify in browser**

Run the local server and confirm the plan page displays expandable-looking nested rows with clear completed and incomplete states.

## Task 5: Package and Commit

**Files:**
- Modify: `README.md`
- Create/update: `/Users/zhangyi/zhangyi/homework/yizaostudy.zip`

- [ ] **Step 1: Update README**

Document that the study plan follows public textbook directory trees and reserves the final month for sprint practice.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Create zip**

Create `yizaostudy.zip`, excluding `.git` and `data/app-data.json`.

- [ ] **Step 4: Commit and push**

Commit with:

```bash
git add .
git commit -m "feat: add textbook tree progress"
git push origin codex/yizao-study-rpg-mvp
git push origin main
```

## Self-Review

- Spec coverage: The tasks cover data, scheduling, UI, tests, docs, package, and push.
- Placeholder scan: No placeholder implementation steps remain; each task has concrete files and expected verification.
- Type consistency: The plan uses `textbookTree`, `completeKnowledgePoint`, `knowledgeStatus`, and existing mastery statuses consistently.
