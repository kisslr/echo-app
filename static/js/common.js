/**
 * 回声 - 公共函数库
 */

/* ========== API 请求封装 ========== */
var API = {
  baseURL: '',

  get: function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.baseURL + url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        var data = JSON.parse(xhr.responseText);
        callback(null, data);
      } else {
        callback(new Error('Request failed: ' + xhr.status), null);
      }
    };
    xhr.onerror = function() {
      callback(new Error('Network error'), null);
    };
    xhr.send();
  },

  post: function(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', this.baseURL + url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        var resp = JSON.parse(xhr.responseText);
        callback(null, resp);
      } else {
        callback(new Error('Request failed: ' + xhr.status), null);
      }
    };
    xhr.onerror = function() {
      callback(new Error('Network error'), null);
    };
    xhr.send(JSON.stringify(data));
  }
};

/* ========== 时间处理 ========== */
var TimeUtils = {

  getGreeting: function() {
    var hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { text: '早上好', emoji: '🌅' };
    if (hour >= 12 && hour < 18) return { text: '下午好', emoji: '☀️' };
    return { text: '晚上好', emoji: '🌙' };
  },

  formatDate: function(dateStr) {
    var date = new Date(dateStr);
    var now = new Date();
    var diff = now - date;
    var oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return this.formatTime(date);
    }
    if (diff < 2 * oneDay) {
      return '昨天 ' + this.formatTime(date);
    }
    if (diff < 7 * oneDay) {
      var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()] + ' ' + this.formatTime(date);
    }
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '/' + m + '/' + d;
  },

  formatTime: function(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  },

  formatDuration: function(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  },

  daysAgo: function(dateStr) {
    var date = new Date(dateStr);
    var now = new Date();
    var diff = now - date;
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return '今天';
    if (days === 1) return '1天前';
    return days + '天前';
  },

  currentDateStr: function() {
    var date = new Date();
    var days = ['日', '一', '二', '三', '四', '五', '六'];
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var day = days[date.getDay()];
    return y + '年' + m + '月' + d + '日 星期' + day;
  }
};

/* ========== 存储操作 ========== */
var Storage = {

  get: function(key) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  },

  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // QuotaExceededError — 5MB 上限，自动裁剪历史
      if (e.name === 'QuotaExceededError' && key.indexOf('chat_history_') === 0) {
        console.warn('localStorage 超出配额，裁剪最早20%对话');
        try {
          var saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (saved.length > 10) {
            var keepFrom = Math.floor(saved.length * 0.2);
            var trimmed = saved.slice(keepFrom);
            localStorage.setItem(key, JSON.stringify(trimmed));
            return true;
          }
        } catch (e2) { /* 裁剪失败，放弃写入 */ }
      }
      if (typeof showToast === 'function') {
        showToast('存储空间不足，旧对话已清理', 'info');
      }
      return false;
    }
  },

  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/* ========== DOM 工具 ========== */
var DOM = {
  el: function(selector) {
    return document.querySelector(selector);
  },

  all: function(selector) {
    return document.querySelectorAll(selector);
  },

  create: function(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (key === 'className') {
          el.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
          for (var sk in attrs[key]) {
            el.style[sk] = attrs[key][sk];
          }
        } else if (key.slice(0, 2) === 'on') {
          el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else {
          el.setAttribute(key, attrs[key]);
        }
      }
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(function(child) {
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else if (child) {
            el.appendChild(child);
          }
        });
      } else if (typeof children === 'string') {
        el.textContent = children;
      }
    }
    return el;
  }
};

/* ========== URL 参数 ========== */
function getQueryParam(name) {
  var match = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/* ========== 全局 FAB 按钮（智能透明：遇文字变淡，空白处全实） ========== */
function createGlobalFAB() {
  var path = window.location.pathname;

  if (path === '/chat' || path === '/record') {
    return;
  }

  if (document.getElementById('fab-btn')) return;

  var fab = document.createElement('div');
  fab.id = 'fab-btn';
  fab.title = '录制新的声音';
  fab.textContent = '+';
  fab.style.transition = 'opacity 0.25s ease';

  fab.addEventListener('click', function() {
    window.location.href = '/record';
  });

  fab.addEventListener('mousedown', function() {
    fab.style.transform = 'scale(0.9)';
  });
  fab.addEventListener('mouseup', function() {
    fab.style.transform = 'scale(1.05)';
    setTimeout(function() { fab.style.transform = 'scale(1)'; }, 100);
  });
  fab.addEventListener('mouseleave', function() {
    fab.style.transform = 'scale(1)';
  });

  document.body.appendChild(fab);

  // 智能透明度：检测 FAB 下方是否有文字/卡片内容
  var contentSelectors = [
    '.voice-card', '.empty-state', '.empty-state-card',
    '.topic-guide-card', '.topic-tag', '.tag', '.tag-cloud',
    '.timeline-item', '.tl-content', '.stat-card',
    '.greeting', '.section-title', '.section-header',
    '.chat-bubble', '.typing-indicator', '.record-progress-text',
    'p', 'h1', 'h2', 'h3', 'span[style]'
  ];

  function updateFABOpacity() {
    var rect = fab.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    // elementsFromPoint 获取该坐标下所有元素（从上到下）
    var els = document.elementsFromPoint(cx, cy);
    var hasContent = false;

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === fab || el.id === 'fab-btn') continue;
      if (el === document.body || el === document.documentElement) continue;
      if (el.classList.contains('app-container')) continue;

      // 检查是否匹配内容选择器
      for (var j = 0; j < contentSelectors.length; j++) {
        if (el.matches && el.matches(contentSelectors[j])) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) break;
    }

    fab.style.opacity = hasContent ? '0.35' : '1';
  }

  // 节流滚动监听
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        updateFABOpacity();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // 初始检测 + 内容变化时重检
  updateFABOpacity();
  window.addEventListener('resize', updateFABOpacity);

  // 暴露手动触发（数据加载后调用）
  window._updateFABOpacity = updateFABOpacity;
}

document.addEventListener('DOMContentLoaded', function() {
  createGlobalFAB();
});

/* ========== Toast 消息组件 ========== */
function showToast(message, type) {
  type = type || 'info';
  var colors = { success: '#5B8C5A', error: '#E85D3A', info: '#E8943A' };
  var toast = document.createElement('div');
  toast.style.cssText =
    'position:fixed; top:24px; left:50%; transform:translateX(-50%); ' +
    'background:' + (colors[type] || colors.info) + '; color:#fff; padding:12px 24px; ' +
    'border-radius:10px; font-size:15px; z-index:9999; ' +
    'animation: toastIn 0.3s ease; max-width:90%; text-align:center; ' +
    'pointer-events:none;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

/* ========== 数据获取函数 ========== */
function fetchVoices() {
  return fetch('/api/voices')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) return data.voices;
      throw new Error('API error');
    })
    .catch(function() {
      console.log('API不可用，从localStorage读取');
      return JSON.parse(localStorage.getItem('echo_voices') || '[]');
    });
}

function fetchStats() {
  return fetch('/api/stats')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) return data;
      throw new Error('API error');
    })
    .catch(function() {
      console.log('API不可用');
      return { total_voices: 0, total_conversations: 0, most_chatted: '暂无' };
    });
}

function saveVoiceLocally(voice) {
  var voices = JSON.parse(localStorage.getItem('echo_voices') || '[]');
  voices.unshift(voice);
  localStorage.setItem('echo_voices', JSON.stringify(voices));
}
