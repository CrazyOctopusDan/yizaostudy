# Study Task Postpone and Self-Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ambiguous task cancellation with postponement and add self-check prompts before fuzzy/mastered status changes.

**Architecture:** Keep the existing Node domain layer and vanilla JS frontend. Add a domain function for postponing one dated task, expose it through a small API route, and implement a lightweight modal in `public/app.js` for self-directed recall prompts.

**Tech Stack:** Node.js built-in test runner, vanilla JavaScript, CSS.

---

### Task 1: Postpone Today Tasks

**Files:**
- Modify: `src/domain/planEngine.js`
- Modify: `server.js`
- Test: `tests/planEngine.test.js`
- Test: `tests/server.test.js`

- [ ] Add a failing domain test showing `postponeTask` marks only the task as `postponed`, leaves the knowledge point `not-started`, and does not award EXP.
- [ ] Add a failing server test for `POST /api/tasks/:id/postpone`.
- [ ] Implement `postponeTask`.
- [ ] Add the server route.
- [ ] Run `npm test -- tests/planEngine.test.js tests/server.test.js`.

### Task 2: Self-Check Dialogs

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] Rename today task `取消` to `推迟`.
- [ ] Rename textbook tree `取消` to `撤销标记`.
- [ ] Add a modal that opens before `模糊` and `掌握` status changes.
- [ ] Use subject-aware prompt copy for 管理、计价、土建计量、案例.
- [ ] Confirm button calls the existing mastery endpoint; return button closes the modal without changing state.

### Task 3: Verification and Shipping

**Files:**
- Modify: `README.md`
- Update: `/Users/zhangyi/zhangyi/homework/yizaostudy.zip`

- [ ] Update README action semantics.
- [ ] Run `npm test`.
- [ ] Verify Chrome at `http://127.0.0.1:4173/`.
- [ ] Recreate zip without `.git`, local JSON data, or nested zip files.
- [ ] Commit and push `codex/yizao-study-rpg-mvp` and `main`.
