import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInitialState } from '../domain/planEngine.js';

export async function loadState(filePath, today = todayIso()) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const state = createInitialState({
      selectedSubjectIds: ['management', 'pricing', 'civil-measurement'],
      today,
    });
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
