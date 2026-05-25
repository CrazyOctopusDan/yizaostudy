import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('Windows launchers keep the command window open and write startup logs', async () => {
  for (const fileName of ['start-yizaostudy.cmd', '启动学习计划.bat']) {
    const content = await readFile(new URL(`../${fileName}`, import.meta.url), 'utf8');

    assert.match(content, /startup\.log/);
    assert.match(content, /pause/);
    assert.match(content, /node server\.js >> "%LOG_FILE%" 2>&1/);
  }
});

test('Windows launchers detect read-only or protected folders before starting Node', async () => {
  for (const fileName of ['start-yizaostudy.cmd', '启动学习计划.bat']) {
    const content = await readFile(new URL(`../${fileName}`, import.meta.url), 'utf8');
    const writeCheckIndex = content.indexOf('WRITE_CHECK_FILE');
    const logFileIndex = content.indexOf('LOG_FILE');
    const nodeStartIndex = content.indexOf('node server.js');

    assert.ok(writeCheckIndex > -1, `${fileName} should check whether the folder is writable`);
    assert.ok(writeCheckIndex < logFileIndex, `${fileName} should check write access before creating startup.log`);
    assert.ok(writeCheckIndex < nodeStartIndex, `${fileName} should check write access before starting Node`);
    assert.match(content, /move the whole yizaostudy folder to Desktop or Documents/);
  }
});

test('Windows launchers use CRLF line endings for cmd.exe compatibility', async () => {
  for (const fileName of ['start-yizaostudy.cmd', '启动学习计划.bat']) {
    const bytes = await readFile(new URL(`../${fileName}`, import.meta.url));
    const text = bytes.toString('utf8');
    const lfCount = (text.match(/\n/g) || []).length;
    const crlfCount = (text.match(/\r\n/g) || []).length;

    assert.ok(lfCount > 0);
    assert.equal(crlfCount, lfCount);
  }
});
