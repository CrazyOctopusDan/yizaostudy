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
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
