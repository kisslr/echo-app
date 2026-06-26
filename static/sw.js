// 回声 PWA Service Worker — 离线缓存 + 全屏应用体验
var CACHE_NAME = 'echo-v3.6';
var ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/common.js',
  '/static/js/chat.js',
  '/static/js/record.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png'
];

// 安装：预缓存核心文件
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        // 部分文件不存在不影响 SW 安装
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) {
        return k !== CACHE_NAME;
      }).map(function(k) {
        return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', function(e) {
  // 跳过 API 请求和 data URI
  if (e.request.url.indexOf('/api/') !== -1 ||
      e.request.url.indexOf('data:') === 0) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp.ok && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      });
    }).catch(function() {
      // 离线且无缓存：返回空响应避免崩溃
      return new Response('', {status: 408});
    })
  );
});
