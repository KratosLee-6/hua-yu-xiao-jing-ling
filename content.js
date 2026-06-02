/**
 * content.js — 画语小精灵 内容脚本（轻量版）
 * 教育工具无需页面抓取，保留最小骨架用于未来扩展
 */

(function () {
  'use strict';

  // 消息入口
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action } = request;
    let result;
    try {
      switch (action) {
        case 'ping':
          result = { success: true, at: Date.now(), url: window.location.href };
          break;
        default:
          result = { success: false, error: `未知操作: ${action}` };
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }
    sendResponse(result);
    return true;
  });

})();
