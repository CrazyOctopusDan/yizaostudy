import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  addExamRecord,
  addMaterial,
  addQuestion,
  completeTask,
  createDashboard,
  ensureTodayTasks,
  updateSubjectSelection,
} from './src/domain/planEngine.js';
import { loadState, saveState, todayIso } from './src/storage/jsonStore.js';

const DEFAULT_PORT = Number(process.env.PORT) || 4173;
const ROOT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const DEFAULT_DATA_FILE = join(ROOT_DIR, 'data', 'app-data.json');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

async function readRequestBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const status = error.statusCode || 500;
  sendJson(response, status, { error: error.message || '服务器内部错误' });
}

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://127.0.0.1');
  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = resolve(PUBLIC_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const content = await readFile(filePath);
  response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream' });
  response.end(content);
}

async function withState(dataFile, today, mutate) {
  const currentState = await loadState(dataFile, today);
  const nextState = await mutate(currentState);
  await saveState(dataFile, nextState);
  return nextState;
}

export function createServer({ dataFile = DEFAULT_DATA_FILE } = {}) {
  return createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const today = url.searchParams.get('today') || todayIso();

      if (url.pathname === '/api/dashboard' && request.method === 'GET') {
        const state = await withState(dataFile, today, (currentState) => ensureTodayTasks(currentState, today));
        const dashboard = createDashboard(state, today);
        sendJson(response, 200, {
          profile: dashboard.state.profile,
          subjects: dashboard.state.subjects,
          materials: dashboard.state.materials,
          questions: dashboard.state.questions,
          examRecords: dashboard.state.examRecords,
          stage: dashboard.stage,
          daysLeft: dashboard.daysLeft,
          character: dashboard.character,
          selectedSubjects: dashboard.selectedSubjects,
          todayTasks: dashboard.todayTasks,
          risk: dashboard.risk,
        });
        return;
      }

      if (url.pathname === '/api/subjects' && request.method === 'PUT') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => updateSubjectSelection(currentState, body.selectedSubjectIds || []));
        sendJson(response, 200, createDashboard(state, today));
        return;
      }

      const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/complete$/);
      if (taskMatch && request.method === 'POST') {
        const taskId = decodeURIComponent(taskMatch[1]);
        const state = await withState(dataFile, today, (currentState) => completeTask(currentState, taskId, today));
        sendJson(response, 200, createDashboard(state, today));
        return;
      }

      if (url.pathname === '/api/materials' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addMaterial(currentState, body));
        sendJson(response, 201, createDashboard(state, today));
        return;
      }

      if (url.pathname === '/api/questions' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addQuestion(currentState, body));
        sendJson(response, 201, createDashboard(state, today));
        return;
      }

      if (url.pathname === '/api/exam-records' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addExamRecord(currentState, { ...body, date: body.date || today }));
        sendJson(response, 201, createDashboard(state, today));
        return;
      }

      if (request.method === 'GET') {
        await serveStatic(request, response);
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      sendError(response, error);
    }
  });
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const noOpen = process.argv.includes('--no-open');
  const server = createServer();
  server.listen(DEFAULT_PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${DEFAULT_PORT}`;
    console.log(`一造学习计划已启动：${url}`);
    if (!noOpen) openBrowser(url);
  });
}
