/**
 * background.js — 画语小精灵 Service Worker
 * AI 调用代理 + 消息路由 + 教学模板引擎
 * MV3 Service Worker
 */

// 加载 画语小精灵 教学模板库
importScripts('prompts-data.js');

let CONFIG = {
  ai: {
    provider: 'minimax',
    endpoint: 'https://api.minimaxi.com/anthropic/v1/messages',
    apiKey: '',
    model: 'MiniMax-M2.7',
    temperature: 0.7,
    maxTokens: 8000
  },
  enabled: true,
  _ready: false
};

// ========== AI Provider 配置（复用8家服务商）==========
const PROVIDERS = {
  minimax: {
    name: 'MiniMax',
    endpoint: 'https://api.minimaxi.com/anthropic/v1/messages',
    model: 'MiniMax-M2.7',
    authType: 'api-key',
    apiFormat: 'anthropic',
    placeholder: '输入 MiniMax API Key（sk-cp-...）'
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入 OpenAI API Key（sk-...）'
  },
  kimi: {
    name: 'Kimi（月之暗面）',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入 Kimi API Key（sk-...）'
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入 DeepSeek API Key'
  },
  siliconflow: {
    name: '硅基流动（SiliconFlow）',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入硅基流动 API Key'
  },
  zhipu: {
    name: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入智谱 API Key'
  },
  qwen: {
    name: '通义千问（Qwen）',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '输入通义千问 API Key'
  },
  custom: {
    name: '🔧 自定义 Endpoint',
    endpoint: '',
    model: '',
    authType: 'bearer',
    apiFormat: 'openai',
    placeholder: '手动填写所有字段'
  }
};

// ========== 初始化 ==========
let _initPromise = null;

async function ensureConfig() {
  if (CONFIG._ready) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const result = await chrome.storage.local.get(['eduConfig']);
      if (result.eduConfig) {
        if (result.eduConfig.ai) CONFIG.ai = { ...CONFIG.ai, ...result.eduConfig.ai };
        if (result.eduConfig.enabled !== undefined) CONFIG.enabled = result.eduConfig.enabled;
      }
    } catch (e) { console.warn('[画语小精灵] 配置加载失败:', e); }
    CONFIG._ready = true;
  })();
  return _initPromise;
}

async function saveConfig() {
  await ensureConfig();
  const { _ready, ...store } = CONFIG;
  await chrome.storage.local.set({ eduConfig: store });
}

// ========== 消息路由 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  ensureConfig().then(() => {
    handleMessage(request, sender)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
  });
  return true;
});

async function handleMessage({ action, payload }, sender) {
  switch (action) {

    // -------- AI 配置 --------
    case 'setAiConfig':
      CONFIG.ai = { ...CONFIG.ai, ...payload };
      await saveConfig();
      return { success: true };

    case 'getAiConfig':
      return { success: true, data: CONFIG.ai };

    case 'getProviders':
      return { success: true, data: PROVIDERS };

    // -------- 教学模式 --------
    case 'getModeList':
      return { success: true, data: typeof getModeList === 'function' ? getModeList() : [] };

    case 'getLessonTypes':
      return { success: true, data: typeof getLessonTypes === 'function' ? getLessonTypes() : [] };

    case 'getGradeBands':
      return { success: true, data: typeof getGradeBands === 'function' ? getGradeBands() : [] };

    case 'getQuickCommands': {
      const mode = payload?.mode || 'student';
      return { success: true, data: typeof getQuickCommands === 'function' ? getQuickCommands(mode) : [] };
    }

    case 'getCrossDisciplinarySubjects':
      return { success: true, data: typeof getCrossDisciplinarySubjects === 'function' ? getCrossDisciplinarySubjects() : [] };

    // -------- 画作分析 --------
    case 'analyzeArtwork': {
      const { description, mode } = payload || {};
      if (!description?.trim()) throw new Error('请提供画作描述或主题');
      const { systemPrompt, userPrompt } = typeof buildArtworkAnalysisPrompt === 'function'
        ? buildArtworkAnalysisPrompt(description, mode || 'student')
        : { systemPrompt: getTeachingSystemPrompt('student'), userPrompt: `请分析这幅儿童画作：${description}` };
      return { success: true, data: await aiComplete({ prompt: userPrompt, systemPrompt, mode: 'analyze' }) };
    }

    // -------- 多元评价 --------
    case 'evaluateArtwork': {
      const { description } = payload || {};
      if (!description?.trim()) throw new Error('请提供画作描述');
      const { systemPrompt, userPrompt } = typeof buildEvaluationPrompt === 'function'
        ? buildEvaluationPrompt(description)
        : { systemPrompt: getTeachingSystemPrompt('teacher'), userPrompt: `请评价这幅学生画作：${description}` };
      return { success: true, data: await aiComplete({ prompt: userPrompt, systemPrompt, mode: 'analyze' }) };
    }

    // -------- 跨学科延伸 --------
    case 'crossDisciplinary': {
      const { description } = payload || {};
      if (!description?.trim()) throw new Error('请提供画作描述');
      const { systemPrompt, userPrompt } = typeof buildCrossDisciplinaryPrompt === 'function'
        ? buildCrossDisciplinaryPrompt(description)
        : { systemPrompt: getTeachingSystemPrompt('teacher'), userPrompt: `请分析这幅画作的跨学科延伸点：${description}` };
      return { success: true, data: await aiComplete({ prompt: userPrompt, systemPrompt, mode: 'analyze' }) };
    }

    // -------- 教案生成 --------
    case 'generateLessonPlan': {
      const inputs = payload || {};
      if (!inputs.topic?.trim()) throw new Error('请提供课题名称');
      const { systemPrompt, userPrompt } = typeof buildLessonPlanPrompt === 'function'
        ? buildLessonPlanPrompt(inputs)
        : { systemPrompt: getTeachingSystemPrompt('teacher'), userPrompt: `请生成教案：课题${inputs.topic}，年级${inputs.grade || ''}，课型${inputs.lesson_type || ''}` };
      return { success: true, data: await aiComplete({ prompt: userPrompt, systemPrompt, mode: 'generate' }) };
    }

    // -------- 快速评语 --------
    case 'quickComment': {
      const { description, commentType } = payload || {};
      if (!description?.trim()) throw new Error('请提供画作描述');
      const { systemPrompt, userPrompt } = typeof buildQuickCommentPrompt === 'function'
        ? buildQuickCommentPrompt(description, commentType || 'encouragement')
        : { systemPrompt: getTeachingSystemPrompt('student'), userPrompt: `请为这幅画写一段温暖的评语：${description}` };
      return { success: true, data: await aiComplete({ prompt: userPrompt, systemPrompt, mode: 'generate' }) };
    }

    // -------- 通用对话 --------
    case 'chatMessage': {
      const { message, mode } = payload || {};
      if (!message?.trim()) throw new Error('消息不能为空');
      return { success: true, data: await aiComplete({
        prompt: message,
        systemPrompt: getTeachingSystemPrompt(mode || 'student'),
        mode: 'analyze'
      }) };
    }

    // -------- 打开侧边栏 --------
    case 'openSidePanel':
      await chrome.tabs.create({ url: 'sidepanel/sidepanel.html', active: true });
      return { success: true };

    default:
      return { success: false, error: `未知操作: ${action}` };
  }
}

// ========== AI 调用 ==========
async function aiComplete({ prompt, systemPrompt, mode }) {
  if (!CONFIG.ai.apiKey) throw new Error('请先在设置中配置 AI API Key');

  const userContent = prompt;

  const provider = CONFIG.ai.provider;
  const providerCfg = PROVIDERS[provider] || PROVIDERS['custom'];

  function normalizeEndpoint(ep) {
    if (!ep) return null;
    ep = ep.trim();
    if (!ep.startsWith('http://') && !ep.startsWith('https://')) ep = 'https://' + ep;
    return ep;
  }

  let endpoint = normalizeEndpoint(CONFIG.ai.endpoint?.trim()) || providerCfg.endpoint || null;
  let model = CONFIG.ai.model?.trim() || providerCfg.model || 'gpt-4o-mini';

  if (provider === 'siliconflow' && !CONFIG.ai.endpoint?.trim() && model && !model.includes('/')) {
    model = 'Qwen/' + model;
  }

  // ========== 带超时和重试的 fetch ==========
  const AI_TIMEOUT_MS = 180000;
  const AI_MAX_RETRIES = 2;

  async function fetchWithRetry(url, fetchOpts) {
    let lastError;
    for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
      try {
        const resp = await fetch(url, { ...fetchOpts, signal: controller.signal });
        return resp;
      } catch (err) {
        lastError = err;
        if (attempt < AI_MAX_RETRIES && (err.name === 'AbortError' || err.name === 'TypeError')) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[画语小精灵] AI 请求失败，${delay}ms 后重试 (${attempt + 1}/${AI_MAX_RETRIES})`, err.message);
          await new Promise(r => setTimeout(r, delay));
        }
      } finally { clearTimeout(timer); }
    }
    throw lastError;
  }

  const apiFormat = providerCfg.apiFormat || 'openai';

  function buildRequestBody() {
    if (apiFormat === 'anthropic') {
      const body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: CONFIG.ai.maxTokens || 8000
      };
      if (CONFIG.ai.temperature !== undefined) body.temperature = CONFIG.ai.temperature;
      return body;
    }
    return {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: CONFIG.ai.maxTokens || 4000,
      temperature: CONFIG.ai.temperature ?? 0.7
    };
  }

  function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (apiFormat === 'anthropic') {
      headers['X-Api-Key'] = CONFIG.ai.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${CONFIG.ai.apiKey}`;
    }
    return headers;
  }

  function parseResponse(data) {
    if (apiFormat === 'anthropic') {
      const textBlock = Array.isArray(data.content) ? data.content.find(b => b.type === 'text') : null;
      return textBlock?.text || null;
    }
    return data.choices?.[0]?.message?.content || null;
  }

  let response;
  try {
    response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(buildRequestBody())
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`AI 请求超时（${AI_TIMEOUT_MS / 1000}秒），请检查网络或尝试切换模型`);
    if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      if (!CONFIG.ai.apiKey) throw new Error('请先在设置中填写 API Key');
      throw new Error(`网络请求失败，请检查：\n1. 网络连接是否正常\n2. API Endpoint 是否可访问：${endpoint}\n3. API Key 是否有效`);
    }
    throw new Error('网络错误：' + err.message);
  }

  if (!response.ok) {
    let errMsg = `API 错误 ${response.status}`;
    try {
      const errData = await response.json();
      errMsg += '：' + (errData.error?.message || JSON.stringify(errData));
    } catch (_) { errMsg += '：' + (await response.text()).slice(0, 200); }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = parseResponse(data);

  if (!content) {
    const sample = JSON.stringify(data).slice(0, 300);
    throw new Error('AI 返回内容为空，可能 API 余额不足或模型不可用。响应：' + sample);
  }
  return content;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[画语小精灵] 已安装 v1.0.0');
});
