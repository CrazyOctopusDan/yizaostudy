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
