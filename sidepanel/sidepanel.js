/**
 * sidepanel.js — 画语小精灵 侧边栏
 * v1.0.0 画作分析 / 教案生成 / 跨学科探索 / 历史记录 / 设置
 */

'use strict';

// ========== DOM 工具 ==========
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

// ========== 全局状态 ==========
const _S = {
  currentMode: 'student',
  currentTab: 'analyze',
  _providers: null,
  _loadingHistory: false
};

// ========== 消息流 ==========
function addMsg(areaId, role, content, type) {
  const area = $(areaId);
  if (!area) return;
  // 清除空状态
  const hint = area.querySelector('.empty-hint');
  if (hint) hint.style.display = 'none';

  const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const icons = { user: '👤', assistant: '🎨', tool: '🛠', error: '⚠️' };
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.id = id;

  if (type === 'loading') {
    div.innerHTML = `<div class="avatar">${icons[role] || '🎨'}</div><div class="bubble">小精灵思考中<span style="display:inline-block;width:12px;height:12px;border:2px solid #ddd;border-top-color:var(--edu-primary);border-radius:50%;animation:spin .7s linear infinite;margin-left:6px;vertical-align:middle"></span></div>`;
    div.classList.add('loading');
  } else {
    div.innerHTML = `<div class="avatar">${icons[role] || '🎨'}</div><div class="bubble">${formatContent(content)}</div>`;
  }
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  if (type !== 'loading' && areaId === '#msgAreaMain') saveHistory();
  return id;
}

function updateMsg(id, role, content) {
  const div = $(`#${id}`);
  if (!div) return;
  div.className = `msg ${role}`;
  const bubble = div.querySelector('.bubble');
  if (bubble) bubble.innerHTML = formatContent(content);
  div.querySelector('.message-area')?.scrollTo?.({ top: 999999, behavior: 'smooth' });
  if (div.closest('#msgAreaMain')) saveHistory();
}

function formatContent(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,.05);padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
    .replace(/\n/g, '<br>');
}

// ========== 历史持久化 ==========
const MAX_HISTORY = 30;

function saveHistory() {
  if (_S._loadingHistory) return;
  const area = $('#msgAreaMain');
  if (!area) return;
  const messages = [];
  area.querySelectorAll('.msg').forEach(el => {
    const bubble = el.querySelector('.bubble');
    if (!bubble || el.classList.contains('loading')) return;
    const role = el.classList.contains('user') ? 'user' :
                 el.classList.contains('assistant') ? 'assistant' :
                 el.classList.contains('tool') ? 'tool' : 'assistant';
    messages.push({ role, content: bubble.innerText });
  });
  if (messages.length > MAX_HISTORY) messages.splice(0, messages.length - MAX_HISTORY);
  chrome.storage.local.set({ artHistory: messages }).catch(() => {});
}

function loadHistory() {
  chrome.storage.local.get(['artHistory'], (result) => {
    const messages = result.artHistory;
    if (!Array.isArray(messages) || !messages.length) return;
    _S._loadingHistory = true;
    messages.forEach(m => addMsg('#msgAreaMain', m.role, m.content));
    _S._loadingHistory = false;
  });
}

function clearHistory() {
  chrome.storage.local.remove('artHistory');
  const area = $('#msgAreaMain');
  if (area) {
    area.innerHTML = '';
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.id = 'emptyHintMain';
    hint.innerHTML = '<div class="icon">🎨</div>描述一幅学生画作，我来帮您分析<br><span style="font-size:10px;color:var(--text-muted)">可以描述画面内容、颜色、构图等</span>';
    area.appendChild(hint);
  }
}

// ========== Tab 切换 ==========
function switchTab(tabName) {
  _S.currentTab = tabName;
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.panel').forEach(p => p.classList.remove('active'));
  const tab = $(`.tab[data-tab="${tabName}"]`);
  const panel = $(`#panel-${tabName}`);
  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

// ========== 模式切换 ==========
function switchMode(mode) {
  _S.currentMode = mode;
  $$('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  renderQuickCommands(mode);
}

// ========== 快捷指令 ==========
async function renderQuickCommands(mode) {
  const container = $('#quickCmds');
  if (!container) return;
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getQuickCommands', payload: { mode } });
    const cmds = res?.data || [];
    container.innerHTML = cmds.map(c =>
      `<span class="quick-cmd" data-cmd="${c.cmd}">${c.cmd}</span>`
    ).join('');
    container.querySelectorAll('.quick-cmd').forEach(el => {
      el.addEventListener('click', () => {
        const input = $('#inputMain');
        if (input) { input.value = el.dataset.cmd; input.focus(); }
      });
    });
  } catch (_) {}
}

// ========== 跨学科标签 ==========
async function renderSubjectChips() {
  const container = $('#subjectChips');
  if (!container) return;
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getCrossDisciplinarySubjects' });
    const subs = res?.data || [];
    container.innerHTML = subs.map(s =>
      `<span class="quick-cmd" style="cursor:default">${s.icon} ${s.subject}</span>`
    ).join('');
  } catch (_) {}
}

// =====================================================================
// 画作分析
// =====================================================================
function initAnalyze() {
  const input = $('#inputMain');
  const btn = $('#btnSendMain');

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMain(); }
  });
  btn?.addEventListener('click', handleSendMain);

  // 模式切换
  $$('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  renderQuickCommands('student');
}

async function handleSendMain() {
  const input = $('#inputMain');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';

  addMsg('#msgAreaMain', 'user', text);
  const loadingId = addMsg('#msgAreaMain', 'assistant', '', 'loading');

  try {
    // 判断意图：如果是教案相关关键词，走教案生成；否则走画作分析
    const isLessonPlan = /教案|备课|教学设计|板书/.test(text);
    const isEvaluation = /评价|评分|打分/.test(text);
    const isCross = /跨学科|延伸|关联/.test(text);
    const isParent = /家长|孩子.*画/.test(text);

    let action, payload;
    if (isLessonPlan) {
      action = 'generateLessonPlan';
      payload = { topic: text, grade: '小学三年级', lesson_type: '造型·表现' };
      switchMode('teacher');
    } else if (isEvaluation) {
      action = 'evaluateArtwork';
      payload = { description: text };
      switchMode('teacher');
    } else if (isCross) {
      action = 'crossDisciplinary';
      payload = { description: text };
      switchMode('teacher');
    } else if (isParent && _S.currentMode === 'student') {
      switchMode('parent');
      action = 'analyzeArtwork';
      payload = { description: text, mode: 'parent' };
    } else {
      action = 'analyzeArtwork';
      payload = { description: text, mode: _S.currentMode };
    }

    const res = await chrome.runtime.sendMessage({ action, payload });
    if (!res.success) throw new Error(res.error);
    updateMsg(loadingId, 'assistant', res.data);
  } catch (err) {
    updateMsg(loadingId, 'error', '分析失败：' + err.message);
  }
}

// =====================================================================
// 教案生成
// =====================================================================
let _lastLessonPlan = { text: '', topic: '' };

function initLesson() {
  $('#btnGenLesson')?.addEventListener('click', handleGenLesson);
  $('#btnExportPPT')?.addEventListener('click', handleExportPPT);
}

async function handleGenLesson() {
  const topic = $('#lessonTopic')?.value.trim();
  if (!topic) { alert('请填写课题名称'); return; }

  const inputs = {
    topic,
    grade: $('#lessonGrade')?.value || '小学三年级',
    duration: $('#lessonDuration')?.value || '1课时',
    lesson_type: $('#lessonType')?.value || '造型·表现',
    artwork_context: $('#lessonContext')?.value.trim() || '',
    extra: $('#lessonExtra')?.value.trim() || ''
  };

  addMsg('#msgAreaLesson', 'user', `生成教案：${topic}\n年级：${inputs.grade} | 课型：${inputs.lesson_type}`);

  const btn = $('#btnGenLesson');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }

  const loadingId = addMsg('#msgAreaLesson', 'assistant', '', 'loading');
  try {
    const res = await chrome.runtime.sendMessage({ action: 'generateLessonPlan', payload: inputs });
    if (!res.success) throw new Error(res.error);
    updateMsg(loadingId, 'assistant', res.data);
    // 保存教案文本并显示PPT导出按钮
    _lastLessonPlan = { text: res.data, topic: inputs.topic };
    const exportArea = $('#pptExportArea');
    if (exportArea) exportArea.style.display = 'block';
  } catch (err) {
    updateMsg(loadingId, 'error', '教案生成失败：' + err.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = '✨ 生成完整教案'; }

  // 自动切换到教案Tab查看结果
  const area = $('#msgAreaLesson');
  if (area) area.scrollTop = area.scrollHeight;
}

async function handleExportPPT() {
  if (!_lastLessonPlan.text) {
    alert('请先生成教案');
    return;
  }
  const btn = $('#btnExportPPT');
  if (btn) { btn.disabled = true; btn.textContent = '\u{23F3} 正在生成PPT...'; }

  try {
    if (typeof EduPPTGenerator === 'undefined') {
      throw new Error('PPT生成模块未加载，请刷新页面后重试');
    }
    const result = await EduPPTGenerator.generate(_lastLessonPlan.text, _lastLessonPlan.topic);
    if (btn) {
      btn.disabled = false;
      btn.textContent = `\u{2705} 已下载 · ${result.slideCount}页PPT`;
      btn.style.background = '#52B788';
      setTimeout(() => {
        btn.textContent = '\u{1F4E5} 导出PPT课件';
        btn.style.background = '';
      }, 3000);
    }
    addMsg('#msgAreaLesson', 'tool', `\u{2705} PPT课件已生成并下载！\n\n\u{1F4CA} 共 ${result.slideCount} 页幻灯片\n\u{1F4E6} 文件：${result.filename}\n\n用 PowerPoint 或 WPS 打开即可编辑。`);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '\u{1F4E5} 导出PPT课件'; }
    addMsg('#msgAreaLesson', 'error', `PPT导出失败：${err.message}`);
  }
}

// =====================================================================
// 跨学科
// =====================================================================
function initCross() {
  $('#btnCrossAnalyze')?.addEventListener('click', handleCrossAnalyze);
  renderSubjectChips();
}

async function handleCrossAnalyze() {
  const description = $('#crossInput')?.value.trim();
  if (!description) { alert('请输入画作描述'); return; }

  addMsg('#msgAreaCross', 'user', `跨学科探索：${description}`);

  const btn = $('#btnCrossAnalyze');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 分析中...'; }

  const loadingId = addMsg('#msgAreaCross', 'assistant', '', 'loading');
  try {
    const res = await chrome.runtime.sendMessage({ action: 'crossDisciplinary', payload: { description } });
    if (!res.success) throw new Error(res.error);
    updateMsg(loadingId, 'assistant', res.data);
  } catch (err) {
    updateMsg(loadingId, 'error', '分析失败：' + err.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔍 探索跨学科连接'; }
}

// =====================================================================
// 历史
// =====================================================================
function initHistory() {
  $('#btnClearHistory')?.addEventListener('click', () => {
    if (confirm('确定清空所有分析记录？')) clearHistory();
  });
  // 加载历史到历史Tab
  chrome.storage.local.get(['artHistory'], (result) => {
    const messages = result.artHistory;
    if (!Array.isArray(messages) || !messages.length) return;
    messages.forEach(m => addMsg('#msgAreaHistory', m.role, m.content));
  });
}

// =====================================================================
// 设置
// =====================================================================
async function initSettings() {
  // Provider切换
  $('#aiProvider')?.addEventListener('change', (e) => {
    const def = _S._providers ? _S._providers[e.target.value] : null;
    if (!def) return;
    const ep = $('#aiEndpoint'), m = $('#aiModel'), k = $('#aiApiKey');
    if (ep) ep.value = def.endpoint || '';
    if (m) m.value = def.model || '';
    if (k) { k.value = ''; k.placeholder = def.placeholder || ''; }
  });

  $('#btnSaveSettings')?.addEventListener('click', async () => {
    const aiConfig = {
      provider: $('#aiProvider')?.value || 'minimax',
      endpoint: $('#aiEndpoint')?.value.trim() || '',
      apiKey: $('#aiApiKey')?.value.trim() || '',
      model: $('#aiModel')?.value.trim() || '',
      temperature: 0.7,
      maxTokens: 4000
    };
    await chrome.runtime.sendMessage({ action: 'setAiConfig', payload: aiConfig });
    const btn = $('#btnSaveSettings');
    if (btn) { btn.textContent = '✅ 已保存'; btn.style.background = '#52B788';
      setTimeout(() => { btn.textContent = '💾 保存设置'; btn.style.background = ''; }, 2000); }
  });

  await renderProviderSelect();
  await loadSettings();
}

async function renderProviderSelect() {
  const sel = $('#aiProvider');
  if (!sel) return;
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getProviders' });
    if (res?.success) _S._providers = res.data;
  } catch (_) {}

  const providers = _S._providers || { minimax: { name: 'MiniMax', endpoint: 'https://api.minimaxi.com/anthropic/v1/messages', model: 'MiniMax-M2.7' } };
  sel.innerHTML = Object.entries(providers).map(([k, p]) =>
    `<option value="${k}">${p.name || k}</option>`
  ).join('');
}

async function loadSettings() {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getAiConfig' });
    if (!res?.success) return;
    const c = res.data || {};
    const prov = c.provider || 'minimax';
    const def = _S._providers?.[prov];

    const provSel = $('#aiProvider');
    if (provSel && provSel.querySelector(`option[value="${prov}"]`)) provSel.value = prov;

    const ep = $('#aiEndpoint'), m = $('#aiModel'), k = $('#aiApiKey');
    if (ep) ep.value = c.endpoint || (def?.endpoint || '');
    if (m) m.value = c.model || (def?.model || '');
    if (k) k.value = c.apiKey || '';
  } catch (e) { console.warn('[画语小精灵] 加载设置失败:', e); }
}

// =====================================================================
// 初始化入口
// =====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Tab 绑定
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 加载Provider
  try {
    const provRes = await chrome.runtime.sendMessage({ action: 'getProviders' });
    if (provRes?.success) _S._providers = provRes.data;
  } catch (_) {}

  // 各模块初始化
  initAnalyze();
  initLesson();
  initCross();
  initHistory();
  await initSettings();

  // 加载历史
  loadHistory();

  console.log('🎨 画语小精灵 v1.0.0 已就绪');
});
