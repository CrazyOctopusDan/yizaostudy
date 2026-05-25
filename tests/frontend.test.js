import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('today self-check confirmation completes the today task for EXP and task progress', () => {
  assert.match(appSource, /data-self-check-task="\$\{task\.id\}"/);
  assert.match(appSource, /pendingSelfCheck = \{ knowledgePointId, masteryStatus, taskId \}/);
  assert.match(appSource, /\/api\/tasks\/\$\{encodeURIComponent\(taskId\)\}\/complete/);
});
