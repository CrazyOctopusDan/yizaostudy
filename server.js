import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, win32 } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  addExamRecord,
  addMaterial,
  addQuestion,
  completeKnowledgePoint,
  completeTask,
  createDashboard,
  ensureTodayTasks,
  postponeTask,
  updateSubjectSelection,
} from './src/domain/planEngine.js';
import { loadState, saveState, todayIso } from './src/storage/jsonStore.js';

const DEFAULT_PORT = Number(process.env.PORT) || 4173;
const ROOT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUBLIC_DIR = join(ROOT_DIR, 'public');

export function resolveDefaultDataFile({ platform = process.platform, env = process.env, rootDir = ROOT_DIR } = {}) {
  if (env.YIZAO_DATA_DIR) {
    const pathJoin = platform === 'win32' ? win32.join : join;
    return pathJoin(env.YIZAO_DATA_DIR, 'app-data.json');
  }

  if (platform === 'win32' && env.LOCALAPPDATA) {
    return win32.join(env.LOCALAPPDATA, 'YizaoStudy', 'app-data.json');
  }

  return join(rootDir, 'data', 'app-data.json');
}

const DEFAULT_DATA_FILE = resolveDefaultDataFile();

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

function serializeDashboard(dashboard) {
  return {
    state: dashboard.state,
    profile: dashboard.state.profile,
    subjects: dashboard.state.subjects,
    materials: dashboard.state.materials,
    questions: dashboard.state.questions,
    examRecords: dashboard.state.examRecords,
    reviewQueue: dashboard.state.reviewQueue,
    knowledgeStatus: dashboard.state.knowledgeStatus,
    knowledgePoints: dashboard.knowledgePoints,
    textbookTree: dashboard.textbookTree,
    stage: dashboard.stage,
    daysLeft: dashboard.daysLeft,
    character: dashboard.character,
    selectedSubjects: dashboard.selectedSubjects,
    todayTasks: dashboard.todayTasks,
    sprintStartDate: dashboard.sprintStartDate,
    risk: dashboard.risk,
    learningStrategy: dashboard.learningStrategy,
    reviewInsights: dashboard.reviewInsights,
    resourceCatalog: dashboard.resourceCatalog,
    practiceEnabled: dashboard.practiceEnabled,
  };
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
        sendJson(response, 200, serializeDashboard(dashboard));
        return;
      }

      if (url.pathname === '/api/subjects' && request.method === 'PUT') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => updateSubjectSelection(currentState, body.selectedSubjectIds || []));
        sendJson(response, 200, serializeDashboard(createDashboard(state, today)));
        return;
      }

      const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/complete$/);
      if (taskMatch && request.method === 'POST') {
        const taskId = decodeURIComponent(taskMatch[1]);
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => completeTask(currentState, taskId, today, body));
        sendJson(response, 200, serializeDashboard(createDashboard(state, today)));
        return;
      }

      const postponeTaskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/postpone$/);
      if (postponeTaskMatch && request.method === 'POST') {
        const taskId = decodeURIComponent(postponeTaskMatch[1]);
        const state = await withState(dataFile, today, (currentState) => postponeTask(currentState, taskId, today));
        sendJson(response, 200, serializeDashboard(createDashboard(state, today)));
        return;
      }

      const knowledgePointMatch = url.pathname.match(/^\/api\/knowledge-points\/([^/]+)\/complete$/);
      if (knowledgePointMatch && request.method === 'POST') {
        const knowledgePointId = decodeURIComponent(knowledgePointMatch[1]);
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => (
          completeKnowledgePoint(currentState, knowledgePointId, today, body.masteryStatus || 'learned')
        ));
        sendJson(response, 200, serializeDashboard(createDashboard(state, today)));
        return;
      }

      if (url.pathname === '/api/materials' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addMaterial(currentState, body));
        sendJson(response, 201, serializeDashboard(createDashboard(state, today)));
        return;
      }

      if (url.pathname === '/api/questions' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addQuestion(currentState, body));
        sendJson(response, 201, serializeDashboard(createDashboard(state, today)));
        return;
      }

      if (url.pathname === '/api/exam-records' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const state = await withState(dataFile, today, (currentState) => addExamRecord(currentState, { ...body, date: body.date || today }));
        sendJson(response, 201, serializeDashboard(createDashboard(state, today)));
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

export function isMainModule(importMetaUrl, argvPath = process.argv[1]) {
  if (!argvPath) return false;
  if (/^[A-Za-z]:[\\/]/.test(argvPath)) {
    const importPath = decodeURIComponent(new URL(importMetaUrl).pathname)
      .replace(/^\/([A-Za-z]:\/)/, '$1')
      .replace(/\//g, '\\')
      .toLowerCase();
    return importPath === argvPath.replace(/\//g, '\\').toLowerCase();
  }

  return resolve(fileURLToPath(importMetaUrl)) === resolve(argvPath);
}

if (isMainModule(import.meta.url)) {
  const noOpen = process.argv.includes('--no-open');
  const server = createServer();
  server.listen(DEFAULT_PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${DEFAULT_PORT}`;
    console.log(`一造学习计划已启动：${url}`);
    if (!noOpen) openBrowser(url);
  });
}
