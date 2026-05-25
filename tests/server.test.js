import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.js';

test('GET /api/dashboard creates local state and returns today tasks', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'yizaostudy-'));
  const dataFile = join(dataDir, 'app-data.json');
  const server = createServer({ dataFile, openBrowser: false });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/dashboard?today=2026-05-25`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.profile.city, '嘉兴市');
    assert.ok(body.todayTasks.length > 0);
    assert.ok(body.character.level >= 1);
    assert.ok(body.textbookTree.length >= 4);
    assert.equal(body.textbookTree[0].chapters[0].sections[0].items[0].status, 'not-started');
    assert.equal(body.practiceEnabled, true);
    assert.ok(body.resourceCatalog.questionBanks.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('POST /api/knowledge-points/:id/complete records direct textbook-tree mastery', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'yizaostudy-'));
  const dataFile = join(dataDir, 'app-data.json');
  const server = createServer({ dataFile, openBrowser: false });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const completeResponse = await fetch(`http://127.0.0.1:${port}/api/knowledge-points/management-01-01-01/complete?today=2026-05-25`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ masteryStatus: 'mastered' }),
    });
    const completed = await completeResponse.json();
    const item = completed.textbookTree[0].chapters[0].sections[0].items[0];

    assert.equal(completeResponse.status, 200);
    assert.equal(item.status, 'mastered');
    assert.ok(completed.character.totalExp > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('GET / serves the RPG study planner shell', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'yizaostudy-'));
  const dataFile = join(dataDir, 'app-data.json');
  const server = createServer({ dataFile, openBrowser: false });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /造价勇者/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('POST /api/tasks/:id/complete records knowledge mastery from request body', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'yizaostudy-'));
  const dataFile = join(dataDir, 'app-data.json');
  const server = createServer({ dataFile, openBrowser: false });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const dashboardResponse = await fetch(`http://127.0.0.1:${port}/api/dashboard?today=2026-05-25`);
    const dashboard = await dashboardResponse.json();
    const knowledgeTask = dashboard.todayTasks.find((task) => task.sourceType === 'knowledge');
    const completeResponse = await fetch(`http://127.0.0.1:${port}/api/tasks/${encodeURIComponent(knowledgeTask.id)}/complete?today=2026-05-25`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ masteryStatus: 'fuzzy' }),
    });
    const completed = await completeResponse.json();

    assert.equal(completeResponse.status, 200);
    assert.equal(completed.state.knowledgeStatus[knowledgeTask.knowledgePointId].status, 'fuzzy');
    assert.equal(completed.state.reviewQueue[0].knowledgePointId, knowledgeTask.knowledgePointId);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('POST /api/tasks/:id/postpone postpones today task without completing knowledge', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'yizaostudy-'));
  const dataFile = join(dataDir, 'app-data.json');
  const server = createServer({ dataFile, openBrowser: false });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const dashboardResponse = await fetch(`http://127.0.0.1:${port}/api/dashboard?today=2026-05-25`);
    const dashboard = await dashboardResponse.json();
    const knowledgeTask = dashboard.todayTasks.find((task) => task.sourceType === 'knowledge');
    const postponeResponse = await fetch(`http://127.0.0.1:${port}/api/tasks/${encodeURIComponent(knowledgeTask.id)}/postpone?today=2026-05-25`, {
      method: 'POST',
    });
    const postponed = await postponeResponse.json();
    const task = postponed.state.tasks.find((item) => item.id === knowledgeTask.id);

    assert.equal(postponeResponse.status, 200);
    assert.equal(task.status, 'postponed');
    assert.equal(postponed.state.knowledgeStatus[knowledgeTask.knowledgePointId].status, 'not-started');
    assert.equal(postponed.character.totalExp, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
