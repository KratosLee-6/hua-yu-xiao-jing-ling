/**
 * popup.js — 画语小精灵 弹出配置页
 */
(function() {
  'use strict';

  function $(id) { return document.getElementById(id); }
  let _providers = null;

  function showMsg(txt, type) {
    var el = $('msgLine');
    if (!el) return;
    el.textContent = txt;
    el.style.color = type === 'ok' ? '#52B788' : '#E76F51';
    if (type === 'ok') setTimeout(() => { var e = $('msgLine'); if (e) e.textContent = ''; }, 3000);
  }

  function updateApiInfo(cfg) {
    var el = $('apiInfo');
    if (!el) return;
    var key = cfg?.apiKey || '';
    var masked = key ? key.slice(0,6) + '****' + key.slice(-4) : '(未填写)';
    el.textContent = (cfg?.provider || '?').toUpperCase() + ' · ' + (cfg?.model || '') + ' · Key: ' + masked;
  }

  function renderProviders(providers, activeKey) {
    var grid = $('provGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(providers).forEach(function(key) {
      var p = providers[key];
      var btn = document.createElement('button');
      btn.className = 'prov-btn' + (key === activeKey ? ' selected' : '');
      btn.dataset.p = key; btn.dataset.ep = p.endpoint || ''; btn.dataset.m = p.model || '';
      btn.textContent = p.name || key;
      grid.appendChild(btn);
    });
    bindProvClicks();
  }

  function bindProvClicks() {
    document.querySelectorAll('.prov-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.prov-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        var ep = $('inpEndpoint'), m = $('inpModel');
        if (ep) ep.value = btn.dataset.ep || '';
        if (m) m.value = btn.dataset.m || '';
      });
    });
  }

  async function init() {
    try {
      var provRes = await chrome.runtime.sendMessage({ action: 'getProviders' });
      if (provRes?.success) _providers = provRes.data;
    } catch (_) {}

    chrome.storage.local.get(['eduConfig'], function(r) {
      var cfg = r?.eduConfig;
      var enabled = cfg ? cfg.enabled !== false : true;
      var chk = $('chkEnable');
      if (chk) chk.checked = enabled;
      var hint = $('toggleHint');
      if (hint) hint.textContent = enabled ? '已启用' : '已停用';

      if (cfg?.ai) {
        var a = cfg.ai;
        var ep = $('inpEndpoint'), m = $('inpModel'), k = $('inpKey'), tk = $('inpTokens');
        if (ep) ep.value = a.endpoint || '';
        if (m) m.value = a.model || '';
        if (k) k.value = a.apiKey || '';
        if (tk) tk.value = a.maxTokens || 8000;
        updateApiInfo(a);
      }

      var active = (cfg?.ai?.provider) || 'minimax';
      if (_providers) { renderProviders(_providers, active); }
      else { setTimeout(function() { if (_providers) renderProviders(_providers, active); }, 400); }
    });
  }

  function bind() {
    var chk = $('chkEnable');
    chk?.addEventListener('change', function() {
      var hint = $('toggleHint');
      if (hint) hint.textContent = chk.checked ? '已启用' : '已停用';
      chrome.storage.local.get(['eduConfig'], function(r) {
        var cfg = r?.eduConfig || {};
        cfg.enabled = chk.checked;
        chrome.storage.local.set({ eduConfig: cfg });
      });
    });

    $('btnOpenPanel')?.addEventListener('click', function() {
      chrome.tabs.create({ url: 'sidepanel/sidepanel.html', active: true });
    });

    // 设置折叠
    var hdr = $('settingsHeader'), body = $('settingsBody'), arrow = $('settingsArrow');
    if (hdr && body && arrow) {
      hdr.addEventListener('click', function() {
        var open = body.classList.contains('open');
        if (open) { body.classList.remove('open'); arrow.classList.remove('open'); }
        else { body.classList.add('open'); arrow.classList.add('open'); }
      });
    }

    $('btnSave')?.addEventListener('click', function() {
      var ep = $('inpEndpoint')?.value.trim() || '';
      var m = $('inpModel')?.value.trim() || '';
      var key = $('inpKey')?.value.trim() || '';
      var tk = parseInt($('inpTokens')?.value) || 8000;
      if (!ep) { showMsg('请填写 API 地址', 'err'); return; }
      if (!m) { showMsg('请填写模型名称', 'err'); return; }
      if (!key) { showMsg('请填写 API Key', 'err'); return; }

      var sel = document.querySelector('.prov-btn.selected');
      var newAi = { provider: sel?.dataset.p || 'custom', endpoint: ep, model: m, apiKey: key, maxTokens: tk, temperature: 0.7 };

      chrome.storage.local.get(['eduConfig'], function(r) {
        var cfg = r?.eduConfig || { enabled: true };
        cfg.ai = newAi;
        chrome.storage.local.set({ eduConfig: cfg }, function() {
          if (chrome.runtime.lastError) { showMsg('保存失败', 'err'); return; }
          showMsg('✅ 设置已保存', 'ok');
          updateApiInfo(newAi);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() { bind(); init(); });
})();
