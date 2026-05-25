const state = {
  dashboard: null,
  currentView: 'today',
};

const priorityLabel = {
  required: '必做',
  suggested: '建议',
  optional: '可放弃',
};

const priorityOrder = {
  required: 0,
  suggested: 1,
  optional: 2,
};

const masteryLabel = {
  learned: '已学',
  fuzzy: '模糊',
  mastered: '掌握',
};

const views = [...document.querySelectorAll('.view')];
const navItems = [...document.querySelectorAll('.nav-item')];

navItems.forEach((button) => {
  button.addEventListener('click', () => {
    state.currentView = button.dataset.view;
    render();
  });
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

async function loadDashboard() {
  state.dashboard = await api('/api/dashboard');
  render();
}

function subjectName(subjectId) {
  return state.dashboard.subjects.find((subject) => subject.id === subjectId)?.shortName || '科目';
}

function setActiveView() {
  views.forEach((view) => view.classList.toggle('active', view.id === state.currentView));
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === state.currentView));
}

function render() {
  if (!state.dashboard) return;
  setActiveView();
  document.querySelector('#daysLeft').textContent = state.dashboard.daysLeft;
  document.querySelector('#stageLine').textContent = `${state.dashboard.stage} · ${state.dashboard.risk.level} · ${state.dashboard.risk.message}`;

  renderToday();
  renderPlan();
  renderPractice();
  renderMaterials();
  renderReview();
}

function renderToday() {
  const dashboard = state.dashboard;
  const sortedTasks = [...dashboard.todayTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  document.querySelector('#today').innerHTML = `
    <div class="grid two">
      <div class="grid">
        <section class="panel">
          <h3>任务卷轴</h3>
          <div class="task-list">
            ${sortedTasks.map(renderTask).join('') || emptyHtml()}
          </div>
        </section>
        <section class="panel">
          <h3>冒险地图</h3>
          <div class="map">
            ${['营地', '章节关卡', dashboard.stage, '真题森林', '考试 Boss'].map((node, index) => `
              <div class="node ${index === 2 ? 'current' : ''}">
                <strong>${node}</strong>
                <p class="muted">${index === 2 ? '今日节点' : '待推进'}</p>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
      <aside class="grid">
        <section class="panel character-card">
          <h3>${dashboard.character.name}</h3>
          <div class="level-row">
            <span class="level">Lv.${dashboard.character.level}</span>
            <span>${dashboard.character.currentExp}/${dashboard.character.nextLevelExp || 'MAX'} EXP</span>
          </div>
          <div class="bar"><span style="width:${Math.round(dashboard.character.progress * 100)}%"></span></div>
          <div class="stat-row"><span>连续学习</span><strong>${dashboard.character.streak || 0} 天</strong></div>
          <div class="stat-row"><span>风险</span><strong>${dashboard.risk.level}</strong></div>
        </section>
        <section class="panel">
          <h3>科目队伍</h3>
          <div class="list">
            ${dashboard.selectedSubjects.map((subject) => `
              <div class="subject-row list-item">
                <span>${subject.shortName}</span>
                <strong>${subject.progress}%</strong>
              </div>
            `).join('') || emptyHtml()}
          </div>
        </section>
      </aside>
    </div>
  `;

  document.querySelectorAll('[data-complete-task]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.dashboard = await api(`/api/tasks/${encodeURIComponent(button.dataset.completeTask)}/complete`, { method: 'POST' });
      render();
    });
  });

  document.querySelectorAll('[data-mastery-task]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.dashboard = await api(`/api/tasks/${encodeURIComponent(button.dataset.masteryTask)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ masteryStatus: button.dataset.masteryStatus }),
      });
      render();
    });
  });
}

function renderTask(task) {
  const done = task.status === 'completed';
  const point = task.knowledgePointId ? state.dashboard.knowledgePoints.find((item) => item.id === task.knowledgePointId) : null;
  const sourceLink = task.sourceUrl ? `<a href="${task.sourceUrl}" target="_blank" rel="noreferrer">大纲来源</a>` : '';
  const actionHtml = task.sourceType === 'knowledge'
    ? `
      <div class="mastery-actions">
        ${Object.entries(masteryLabel).map(([status, label]) => `
          <button class="secondary-btn" data-mastery-task="${task.id}" data-mastery-status="${status}" ${done ? 'disabled' : ''}>${done && task.masteryStatus === status ? `已标记：${label}` : label}</button>
        `).join('')}
      </div>
    `
    : `<button class="primary-btn" data-complete-task="${task.id}" ${done ? 'disabled' : ''}>${done ? '已完成' : '完成'}</button>`;
  return `
    <article class="task ${done ? 'completed' : ''}">
      <div class="task-top">
        <div>
          <span class="badge ${task.priority}">${priorityLabel[task.priority]}</span>
          <strong>${task.title}</strong>
        </div>
        <strong>+${task.exp} EXP</strong>
      </div>
      <p>${task.description}</p>
      ${point ? `
        <div class="knowledge-meta">
          <span>${point.chapter}</span>
          <span>${point.title}</span>
          <span>${point.estimatedMinutes} 分钟</span>
          <span>${point.importance}</span>
          ${sourceLink}
        </div>
      ` : ''}
      <div class="task-top">
        <span class="muted">${subjectName(task.subjectId)}</span>
        ${actionHtml}
      </div>
    </article>
  `;
}

function renderPlan() {
  document.querySelector('#plan').innerHTML = `
    <div class="grid">
      <section class="panel">
        <h3>本轮备考科目</h3>
        <div class="grid three">
          ${state.dashboard.subjects.map((subject) => `
            <label class="subject-card">
              <div class="subject-row">
                <strong>${subject.shortName}</strong>
                <input type="checkbox" value="${subject.id}" ${subject.selected ? 'checked' : ''}>
              </div>
              <div class="bar"><span style="width:${subject.progress}%"></span></div>
              <span class="muted">${subject.name}</span>
            </label>
          `).join('')}
        </div>
      </section>
      <section class="panel">
        <h3>知识点进度</h3>
        <p class="muted">系统会在 ${state.dashboard.sprintStartDate} 前完成已勾选科目的第一轮知识点学习，最后一个月保留给冲刺刷题。</p>
        <div class="list">
          ${state.dashboard.selectedSubjects.map((subject) => {
            const points = state.dashboard.knowledgePoints.filter((point) => point.subjectId === subject.id);
            const learned = points.filter((point) => {
              const status = state.dashboard.knowledgeStatus[point.id]?.status;
              return ['learned', 'fuzzy', 'mastered'].includes(status);
            }).length;
            const nextPoint = points.find((point) => state.dashboard.knowledgeStatus[point.id]?.status === 'not-started');
            return `
              <div class="list-item">
                <div class="subject-row"><strong>${subject.shortName}</strong><span>${learned}/${points.length}</span></div>
                <p class="muted">下一知识点：${nextPoint ? `${nextPoint.chapter} / ${nextPoint.title}` : '第一轮已学完，进入复盘。'}</p>
              </div>
            `;
          }).join('') || emptyHtml()}
        </div>
      </section>
      <section class="panel">
        <h3>阶段路线</h3>
        <div class="map">
          ${['习惯期', '系统学习期', '强化期', '冲刺期', '考试 Boss'].map((stage) => `
            <div class="node ${state.dashboard.stage === stage ? 'current' : ''}">
              <strong>${stage}</strong>
              <p class="muted">${state.dashboard.stage === stage ? '进行中' : '路线节点'}</p>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  document.querySelectorAll('#plan input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const selectedSubjectIds = [...document.querySelectorAll('#plan input[type="checkbox"]:checked')].map((item) => item.value);
      state.dashboard = await api('/api/subjects', {
        method: 'PUT',
        body: JSON.stringify({ selectedSubjectIds }),
      });
      render();
    });
  });
}

function renderPractice() {
  document.querySelector('#practice').innerHTML = `
    <div class="grid two">
      <section class="panel">
        <h3>错题与真题</h3>
        <div class="list">
          ${state.dashboard.questions.map((question) => `
            <div class="list-item">
              <strong>${subjectName(question.subjectId)} ${question.year || ''}</strong>
              <p>${question.stem}</p>
              <p class="muted">答案：${question.answer || '未填写'}</p>
              ${question.sourceUrl ? `<a href="${question.sourceUrl}" target="_blank" rel="noreferrer">来源链接</a>` : ''}
            </div>
          `).join('') || emptyHtml()}
        </div>
      </section>
      <section class="panel">
        <h3>新增题目</h3>
        <form id="questionForm" class="form-grid">
          ${subjectSelectHtml()}
          <label>年份<input name="year" placeholder="2024"></label>
          <label>题干<textarea name="stem" required rows="4"></textarea></label>
          <label>答案<input name="answer"></label>
          <label>解析<textarea name="explanation" rows="3"></textarea></label>
          <label>来源链接<input name="sourceUrl" type="url"></label>
          <button class="primary-btn" type="submit">保存题目</button>
        </form>
      </section>
    </div>
  `;
  bindForm('#questionForm', '/api/questions');
}

function renderMaterials() {
  document.querySelector('#materials').innerHTML = `
    <div class="grid two">
      <section class="panel">
        <h3>资料列表</h3>
        <div class="list">
          ${state.dashboard.materials.map((material) => `
            <div class="list-item">
              <strong>${material.title}</strong>
              <p class="muted">${subjectName(material.subjectId)} · ${material.type}</p>
              ${material.url ? `<a href="${material.url}" target="_blank" rel="noreferrer">${material.url}</a>` : ''}
              ${material.notes ? `<p>${material.notes}</p>` : ''}
            </div>
          `).join('') || emptyHtml()}
        </div>
      </section>
      <section class="panel">
        <h3>新增资料</h3>
        <form id="materialForm" class="form-grid">
          ${subjectSelectHtml()}
          <label>标题<input name="title" required></label>
          <label>类型<select name="type"><option value="book">教材</option><option value="course">网课</option><option value="pdf">PDF</option><option value="link">链接</option></select></label>
          <label>链接或本地路径<input name="url"></label>
          <label>备注<textarea name="notes" rows="3"></textarea></label>
          <button class="primary-btn" type="submit">保存资料</button>
        </form>
      </section>
    </div>
  `;
  bindForm('#materialForm', '/api/materials');
}

function renderReview() {
  const completed = state.dashboard.todayTasks.filter((task) => task.status === 'completed').length;
  const total = state.dashboard.todayTasks.length;
  document.querySelector('#review').innerHTML = `
    <div class="grid two">
      <section class="panel">
        <h3>今日复盘</h3>
        <div class="grid three">
          <div class="list-item"><span class="muted">任务完成</span><h3>${completed}/${total}</h3></div>
          <div class="list-item"><span class="muted">角色等级</span><h3>Lv.${state.dashboard.character.level}</h3></div>
          <div class="list-item"><span class="muted">当前风险</span><h3>${state.dashboard.risk.level}</h3></div>
        </div>
        <h3>模糊知识点</h3>
        <div class="list">
          ${state.dashboard.reviewQueue.map((item) => `
            <div class="list-item">
              <strong>${subjectName(item.subjectId)}</strong>
              <p>${item.title}</p>
              <p class="muted">${item.reason}</p>
            </div>
          `).join('') || emptyHtml()}
        </div>
      </section>
      <section class="panel">
        <h3>外部考试记录</h3>
        <form id="examForm" class="form-grid">
          ${subjectSelectHtml()}
          <label>名称<input name="title" required placeholder="2021 管理真题"></label>
          <label>得分<input name="score" type="number" min="0" max="100" required></label>
          <label>难度<select name="difficulty"><option value="normal">普通</option><option value="hard">较难</option><option value="easy">简单</option></select></label>
          <button class="primary-btn" type="submit">记录得分</button>
        </form>
        <div class="list">
          ${state.dashboard.examRecords.map((record) => `
            <div class="list-item">
              <strong>${record.title}</strong>
              <p class="muted">${subjectName(record.subjectId)} · ${record.score} 分 · +${record.exp} EXP</p>
            </div>
          `).join('') || emptyHtml()}
        </div>
      </section>
    </div>
  `;
  bindForm('#examForm', '/api/exam-records');
}

function subjectSelectHtml() {
  return `
    <label>科目
      <select name="subjectId" required>
        ${state.dashboard.subjects.map((subject) => `<option value="${subject.id}">${subject.shortName}</option>`).join('')}
      </select>
    </label>
  `;
}

function bindForm(selector, endpoint) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    state.dashboard = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.reset();
    render();
  });
}

function emptyHtml() {
  return document.querySelector('#emptyTemplate').innerHTML;
}

loadDashboard().catch((error) => {
  document.querySelector('.main').innerHTML = `<section class="panel"><h3>启动失败</h3><p>${error.message}</p></section>`;
});
