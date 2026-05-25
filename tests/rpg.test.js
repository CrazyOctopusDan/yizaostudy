import test from 'node:test';
import assert from 'node:assert/strict';
import { awardExamExp, awardTaskExp, calculateLevel } from '../src/domain/rpg.js';

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
