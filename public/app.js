const state = {
  dashboard: null,
  currentView: 'today',
  pendingSelfCheck: null,
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

const masteryActionLabel = {
  learned: '已学',
  fuzzy: '模糊',
  mastered: '掌握',
};

const subjectSelfCheckFocus = {
  management: '制度、流程、合同条款、项目管理逻辑和全过程造价管理关系',
  pricing: '费用构成、计价依据、工程量清单、合同价款调整和结算路径',
  'civil-measurement': '工程构造、材料特性、施工技术、工程量计算规则和清单口径',
  'case-analysis': '解题步骤、数据提取、公式选择、书面表达和时间控制',
};

const statusLabel = {
  'not-started': '未开始',
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
  const practiceNav = navItems.find((item) => item.dataset.view === 'practice');
  if (practiceNav) {
    practiceNav.hidden = !state.dashboard.practiceEnabled;
  }
  if (state.currentView === 'practice' && !state.dashboard.practiceEnabled) {
    state.currentView = 'today';
  }
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
  renderSelfCheckModal();
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

  document.querySelectorAll('[data-complete-knowledge-task]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.dashboard = await api(`/api/tasks/${encodeURIComponent(button.dataset.completeKnowledgeTask)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ masteryStatus: button.dataset.masteryStatus }),
      });
      render();
    });
  });

  document.querySelectorAll('[data-open-self-check]').forEach((button) => {
    button.addEventListener('click', () => {
      openSelfCheck(button.dataset.openSelfCheck, button.dataset.masteryStatus, button.dataset.selfCheckTask || null);
    });
  });

  document.querySelectorAll('[data-postpone-task]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.dashboard = await api(`/api/tasks/${encodeURIComponent(button.dataset.postponeTask)}/postpone`, { method: 'POST' });
      render();
    });
  });
}

function renderTask(task) {
  const done = task.status === 'completed';
  const postponed = task.status === 'postponed';
  const point = task.knowledgePointId ? state.dashboard.knowledgePoints.find((item) => item.id === task.knowledgePointId) : null;
  const sourceLink = task.sourceUrl ? `<a href="${task.sourceUrl}" target="_blank" rel="noreferrer">大纲来源</a>` : '';
  const actionHtml = task.sourceType === 'knowledge'
    ? `
      <div class="mastery-actions">
        <button class="secondary-btn" data-complete-knowledge-task="${task.id}" data-mastery-status="learned" ${done || postponed ? 'disabled' : ''}>${done && task.masteryStatus === 'learned' ? '已标记：已学' : '已学'}</button>
        <button class="secondary-btn" data-open-self-check="${task.knowledgePointId}" data-self-check-task="${task.id}" data-mastery-status="fuzzy" ${done || postponed ? 'disabled' : ''}>${done && task.masteryStatus === 'fuzzy' ? '已标记：模糊' : '模糊'}</button>
        <button class="secondary-btn" data-open-self-check="${task.knowledgePointId}" data-self-check-task="${task.id}" data-mastery-status="mastered" ${done || postponed ? 'disabled' : ''}>${done && task.masteryStatus === 'mastered' ? '已标记：掌握' : '掌握'}</button>
        <button class="secondary-btn" data-postpone-task="${task.id}" ${done || postponed ? 'disabled' : ''}>${postponed ? '已推迟' : '推迟'}</button>
      </div>
    `
    : `<button class="primary-btn" data-complete-task="${task.id}" ${done ? 'disabled' : ''}>${done ? '已完成' : '完成'}</button>`;
  return `
    <article class="task ${done ? 'completed' : ''} ${postponed ? 'postponed' : ''}">
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
        <h3>教材目录树</h3>
        <p class="muted">系统会在 ${state.dashboard.sprintStartDate} 前完成已勾选科目的第一轮教材目录学习，最后一个月保留给冲刺刷题。</p>
        <div class="textbook-tree">
          ${renderTextbookTree()}
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

  document.querySelectorAll('[data-tree-mastery]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.dashboard = await api(`/api/knowledge-points/${encodeURIComponent(button.dataset.treeMastery)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ masteryStatus: button.dataset.masteryStatus }),
      });
      render();
    });
  });

  document.querySelectorAll('[data-tree-self-check]').forEach((button) => {
    button.addEventListener('click', () => {
      openSelfCheck(button.dataset.treeSelfCheck, button.dataset.masteryStatus);
    });
  });
}

function renderTextbookTree() {
  const selectedIds = new Set(state.dashboard.selectedSubjects.map((subject) => subject.id));
  const selectedTrees = state.dashboard.textbookTree.filter((tree) => selectedIds.has(tree.subjectId));
  if (selectedTrees.length === 0) return emptyHtml();

  return selectedTrees.map((tree) => `
    <section class="tree-subject">
      <div class="tree-subject-head">
        <div>
          <strong>${subjectName(tree.subjectId)}</strong>
          <p class="muted">${tree.completedCount}/${tree.totalCount} 个教材节点</p>
        </div>
        <strong>${tree.progress}%</strong>
      </div>
      <div class="bar"><span style="width:${tree.progress}%"></span></div>
      ${tree.chapters.map((chapter, chapterIndex) => renderChapter(tree.subjectId, chapter, chapterIndex)).join('')}
    </section>
  `).join('');
}

function renderChapter(subjectId, chapter, chapterIndex) {
  return `
    <details class="tree-chapter" ${chapterIndex === 0 ? 'open' : ''}>
      <summary>
        <span>${chapterIndex + 1}. ${chapter.title}</span>
        <span>${chapter.completedCount}/${chapter.totalCount} · ${chapter.progress}%</span>
      </summary>
      ${chapter.sections.map((section, sectionIndex) => renderSection(subjectId, section, sectionIndex)).join('')}
    </details>
  `;
}

function renderSection(subjectId, section, sectionIndex) {
  return `
    <div class="tree-section">
      <div class="tree-section-head">
        <strong>${sectionIndex + 1}. ${section.title}</strong>
        <span>${section.completedCount}/${section.totalCount}</span>
      </div>
      ${section.items.map((item, itemIndex) => renderTreeItem(subjectId, item, itemIndex)).join('')}
    </div>
  `;
}

function renderTreeItem(subjectId, item, itemIndex) {
  const status = item.status || 'not-started';
  const sourceLink = item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" rel="noreferrer">目录来源</a>` : '';
  return `
    <article class="tree-item ${status}">
      <div class="tree-item-main">
        <span class="tree-index">${itemIndex + 1}</span>
        <div>
          <div class="tree-title-row">
            <strong>${item.title}</strong>
            <span class="status-pill ${status}">${statusLabel[status]}</span>
          </div>
          <p class="muted">${item.estimatedMinutes} 分钟 · ${item.importance} · ${subjectName(subjectId)} ${sourceLink}</p>
        </div>
      </div>
      <div class="mastery-actions">
        <button class="secondary-btn" data-tree-mastery="${item.id}" data-mastery-status="learned" ${status === 'learned' ? 'disabled' : ''}>已学</button>
        <button class="secondary-btn" data-tree-self-check="${item.id}" data-mastery-status="fuzzy" ${status === 'fuzzy' ? 'disabled' : ''}>模糊</button>
        <button class="secondary-btn" data-tree-self-check="${item.id}" data-mastery-status="mastered" ${status === 'mastered' ? 'disabled' : ''}>掌握</button>
        <button class="secondary-btn danger-btn" data-tree-mastery="${item.id}" data-mastery-status="not-started" ${status === 'not-started' ? 'disabled' : ''}>撤销标记</button>
      </div>
    </article>
  `;
}

function openSelfCheck(knowledgePointId, masteryStatus, taskId = null) {
  const point = state.dashboard.knowledgePoints.find((item) => item.id === knowledgePointId);
  if (!point) return;
  state.pendingSelfCheck = { knowledgePointId, masteryStatus, taskId };
  renderSelfCheckModal();
}

function closeSelfCheck() {
  state.pendingSelfCheck = null;
  renderSelfCheckModal();
}

async function confirmSelfCheck() {
  if (!state.pendingSelfCheck) return;
  const { knowledgePointId, masteryStatus, taskId } = state.pendingSelfCheck;
  const path = taskId
    ? `/api/tasks/${encodeURIComponent(taskId)}/complete`
    : `/api/knowledge-points/${encodeURIComponent(knowledgePointId)}/complete`;
  state.dashboard = await api(path, {
    method: 'POST',
    body: JSON.stringify({ masteryStatus }),
  });
  state.pendingSelfCheck = null;
  render();
}

function renderSelfCheckModal() {
  const existing = document.querySelector('#selfCheckModal');
  if (existing) existing.remove();
  if (!state.pendingSelfCheck) return;

  const point = state.dashboard.knowledgePoints.find((item) => item.id === state.pendingSelfCheck.knowledgePointId);
  if (!point) return;
  const content = buildSelfCheckContent(point, state.pendingSelfCheck.masteryStatus);
  const modal = document.createElement('div');
  modal.id = 'selfCheckModal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <section class="self-check-modal" role="dialog" aria-modal="true" aria-labelledby="selfCheckTitle">
      <div class="self-check-head">
        <div>
          <p class="eyebrow">${subjectName(point.subjectId)} · ${point.chapter}</p>
          <h3 id="selfCheckTitle">${content.title}</h3>
        </div>
        <button class="secondary-btn icon-btn" data-close-self-check aria-label="关闭">×</button>
      </div>
      <p class="self-check-target">${point.section} / ${point.title}</p>
      <p>${content.intro}</p>
      <div class="self-check-focus">
        <strong>本科学习焦点</strong>
        <span>${subjectSelfCheckFocus[point.subjectId] || '定义、规则、适用条件和题目迁移'}</span>
      </div>
      <ol class="self-check-list">
        ${content.prompts.map((prompt) => `<li>${prompt}</li>`).join('')}
      </ol>
      <div class="self-check-actions">
        <button class="secondary-btn" data-close-self-check>先不标记</button>
        <button class="primary-btn" data-confirm-self-check>${content.confirmLabel}</button>
      </div>
    </section>
  `;
  document.body.append(modal);
  modal.querySelectorAll('[data-close-self-check]').forEach((button) => button.addEventListener('click', closeSelfCheck));
  modal.querySelector('[data-confirm-self-check]').addEventListener('click', confirmSelfCheck);
}

function buildSelfCheckContent(point, masteryStatus) {
  if (masteryStatus === 'fuzzy') {
    return {
      title: '标记模糊前，先定位卡点',
      intro: '不用答给系统听，只要自己确认：到底是概念、公式、适用条件、题型迁移，还是和相邻知识点的边界不清。',
      confirmLabel: '确认标记模糊',
      prompts: [
        `我能说出「${point.title}」属于哪一章、哪一节，以及它在本科目里的作用吗？`,
        '这个知识点是在解决制度流程、费用计算、工程量规则，还是案例解题步骤的问题？',
        '它和前后相邻概念最容易混淆的边界是什么？我能讲清差别吗？',
        '如果出成选择题、计算题或案例小问，我大概知道会问什么吗？',
        '现在最说不清的是教材哪句话、哪个公式、哪个规则或哪个适用条件？',
      ],
    };
  }

  return {
    title: '确认掌握前，做一次主动回忆',
    intro: '不要急着点确认。先合上资料，用自己的话完成下面几步；能说顺，再把它标为掌握。',
    confirmLabel: '确认掌握',
    prompts: [
      `不看书，用自己的话说出「${point.title}」的核心定义或判断规则。`,
      '说出它的适用条件、计算路径、处理流程或工程量口径。',
      '举一个造价工作里的使用场景，说明什么时候会用到它。',
      '说出一个常见陷阱、易错点，或和相邻知识点的区别。',
      '如果放进案例分析，它可能对应哪类步骤：数据提取、公式选择、清单计量、合同调整、结算，还是书面表达？',
    ],
  };
}

function renderPractice() {
  if (!state.dashboard.practiceEnabled) {
    document.querySelector('#practice').innerHTML = '';
    return;
  }
  const questionResources = state.dashboard.resourceCatalog.questionBanks || [];
  document.querySelector('#practice').innerHTML = `
    <div class="grid">
      <section class="panel">
        <h3>外部题库入口</h3>
        <div class="resource-grid">
          ${questionResources.map(renderResourceCard).join('') || emptyHtml()}
        </div>
      </section>
      <div class="grid two">
        <section class="panel">
          <h3>错题与真题记录</h3>
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
          <h3>记录外部练习</h3>
          <form id="questionForm" class="form-grid">
            ${subjectSelectHtml()}
            <label>年份<input name="year" placeholder="2024"></label>
            <label>题目或错因摘要<textarea name="stem" required rows="4"></textarea></label>
            <label>答案<input name="answer"></label>
            <label>解析<textarea name="explanation" rows="3"></textarea></label>
            <label>来源链接<input name="sourceUrl" type="url"></label>
            <button class="primary-btn" type="submit">保存记录</button>
          </form>
        </section>
      </div>
    </div>
  `;
  bindForm('#questionForm', '/api/questions');
}

function renderMaterials() {
  const catalog = state.dashboard.resourceCatalog;
  document.querySelector('#materials').innerHTML = `
    <div class="grid">
      <section class="panel">
        <h3>官方与学习资源</h3>
        <div class="resource-section">
          ${renderResourceGroup('官方入口', catalog.official)}
          ${renderResourceGroup('教材/讲义/真题资料', catalog.materials)}
          ${renderResourceGroup('网课直达', catalog.courses)}
          ${renderResourceGroup('题库与章节练习', catalog.questionBanks)}
        </div>
      </section>
      <div class="grid two">
        <section class="panel">
          <h3>我的资料</h3>
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
    </div>
  `;
  bindForm('#materialForm', '/api/materials');
}

function renderReview() {
  const completed = state.dashboard.todayTasks.filter((task) => task.status === 'completed').length;
  const total = state.dashboard.todayTasks.length;
  const insights = state.dashboard.reviewInsights;
  document.querySelector('#review').innerHTML = `
    <div class="grid">
      <section class="panel">
        <h3>冒险复盘</h3>
        <div class="grid three">
          <div class="list-item"><span class="muted">任务完成</span><h3>${completed}/${total}</h3></div>
          <div class="list-item"><span class="muted">角色等级</span><h3>Lv.${state.dashboard.character.level}</h3></div>
          <div class="list-item"><span class="muted">当前风险</span><h3>${state.dashboard.risk.level}</h3></div>
        </div>
        <div class="rpg-review-grid">
          <article class="rpg-card boss">
            <span>Boss 雷达</span>
            <strong>${insights.bossRadar.prerequisiteAverage}%</strong>
            <p>${insights.bossRadar.message}</p>
          </article>
          <article class="rpg-card ${insights.caseLinkage.level}">
            <span>案例联动</span>
            <strong>${insights.caseLinkage.level === 'high' ? '高风险' : insights.caseLinkage.level === 'medium' ? '关注' : '稳定'}</strong>
            <p>${insights.caseLinkage.message}</p>
          </article>
          <article class="rpg-card">
            <span>回忆挑战</span>
            <strong>主动检索</strong>
            <p>${insights.recallChallenge.prompt}</p>
          </article>
          <article class="rpg-card warning">
            <span>冲刺警戒线</span>
            <strong>${state.dashboard.sprintStartDate}</strong>
            <p>${insights.sprintWarning.message}</p>
          </article>
        </div>
      </section>
      <div class="grid two">
        <section class="panel">
          <h3>弱点副本</h3>
          <div class="list">
            ${insights.weaknessDungeon.items.map((item) => `
              <div class="list-item">
                <strong>${subjectName(item.subjectId)} · ${item.chapter}</strong>
                <p>${item.title}</p>
                <p class="muted">${item.reason}</p>
              </div>
            `).join('') || emptyHtml()}
          </div>
          <h3>下一步动作</h3>
          <div class="list">
            ${insights.nextActions.map((action) => `<div class="list-item">${action}</div>`).join('')}
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
      <section class="panel">
        <h3>计划可行性</h3>
        <div class="strategy-list">
          <p>${state.dashboard.learningStrategy.examViewpoint}</p>
          <p>${state.dashboard.learningStrategy.pedagogyViewpoint}</p>
          <p>${state.dashboard.learningStrategy.scheduleRule}</p>
        </div>
      </section>
    </div>
  `;
  bindForm('#examForm', '/api/exam-records');
}

function renderResourceGroup(title, resources = []) {
  return `
    <div class="resource-group">
      <h4>${title}</h4>
      <div class="resource-grid">
        ${resources.map(renderResourceCard).join('') || emptyHtml()}
      </div>
    </div>
  `;
}

function renderResourceCard(resource) {
  return `
    <article class="resource-card">
      <div>
        <strong>${resource.title}</strong>
        <p class="muted">${resource.note}</p>
      </div>
      <div class="resource-meta">
        <span>${resource.subjectId === 'all' ? '全科' : subjectName(resource.subjectId)}</span>
        <span>${accessLabel(resource.accessLevel)}</span>
      </div>
      <a class="primary-btn link-btn" href="${resource.url}" target="_blank" rel="noreferrer">打开</a>
    </article>
  `;
}

function accessLabel(accessLevel) {
  const labels = {
    free: '免费公开',
    'partial-free': '部分免费',
    registration: '需登录',
    unknown: '待确认',
  };
  return labels[accessLevel] || '待确认';
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
