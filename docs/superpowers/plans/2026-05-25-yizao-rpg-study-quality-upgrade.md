# Yizao RPG Study Quality Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the study app behave like a practical一级造价师 preparation coach: reversible task states, dependency-aware task recommendations, categorized resource links, conditional practice navigation, and RPG-style review feedback.

**Architecture:** Keep the dependency-free Node app. Add a small static resource catalog and keep exam/study intelligence in the domain layer so the server and frontend render from structured dashboard data. Preserve existing JSON persistence and local Windows startup behavior.

**Tech Stack:** Node.js built-in test runner, vanilla JS frontend, CSS, local JSON storage.

---

### Task 1: Reversible Knowledge Status

**Files:**
- Modify: `src/domain/planEngine.js`
- Modify: `public/app.js`
- Test: `tests/planEngine.test.js`

- [ ] Add failing tests that setting a knowledge point to `not-started` clears completion and removes it from the fuzzy review queue.
- [ ] Add failing tests that changing `fuzzy` to `mastered` removes the review queue item and avoids duplicate EXP.
- [ ] Implement `not-started` support in `completeKnowledgePoint`.
- [ ] Add `取消` buttons in today tasks and textbook tree leaves.
- [ ] Run `npm test`.

### Task 2: Learning Intelligence

**Files:**
- Create: `src/domain/learningInsights.js`
- Modify: `src/domain/planEngine.js`
- Test: `tests/planEngine.test.js`

- [ ] Add failing tests that dashboard insights flag case-analysis risk when prerequisite subjects are weak.
- [ ] Add failing tests that insights recommend retrieval practice for fuzzy/high-weight items.
- [ ] Implement subject dependency analysis, plan feasibility text, and concrete next actions.
- [ ] Expose `reviewInsights` and `learningStrategy` from dashboard.
- [ ] Run `npm test`.

### Task 3: Built-In Resource Catalog and Practice Visibility

**Files:**
- Create: `src/domain/resourceCatalog.js`
- Modify: `src/domain/planEngine.js`
- Modify: `server.js`
- Modify: `public/app.js`
- Test: `tests/planEngine.test.js`
- Test: `tests/server.test.js`

- [ ] Add failing tests that dashboard includes categorized official/material/question resources.
- [ ] Add failing tests that `practiceEnabled` is true only when question-bank resources exist.
- [ ] Implement resource catalog entries with URL, category, subject, access level, and note.
- [ ] Hide the practice nav when `practiceEnabled` is false.
- [ ] Render categorized cards in the materials page before custom saved resources.
- [ ] Run `npm test`.

### Task 4: RPG Review UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: manual browser verification

- [ ] Render review insights as Boss radar, weakness dungeon, recall challenge, case linkage, and sprint warning.
- [ ] Keep the exam score form and existing progress metrics.
- [ ] Polish the UI so compact cards do not nest inside decorative cards and text wraps on mobile.
- [ ] Verify in browser at desktop and mobile widths.

### Task 5: Package, Commit, Push

**Files:**
- Modify: `README.md`
- Create/update: `/Users/zhangyi/zhangyi/homework/yizaostudy.zip`

- [ ] Update README with new status semantics, resource catalog behavior, and Windows usage.
- [ ] Run full `npm test`.
- [ ] Start local server and verify the main flows in browser.
- [ ] Recreate zip without `.git` and local user data.
- [ ] Commit and push branch.

### Self-Review

- Covers all five user requests: plan feasibility, reversible statuses, conditional question practice, categorized resources, RPG review feedback.
- No scraping or copying copyrighted questions; only external links and user-entered scores.
- Keeps implementation local and dependency-free for Windows unzip-and-run usage.
