// 星月舱 Service Worker —— 离线缓存让第二次启动起秒开
// 改了代码上线后，把下面的 CACHE_VERSION 数字 +1，用户的浏览器会自动拉新版

const CACHE_VERSION = 'xingyue-v6';

// 需要缓存的本地文件
const LOCAL_ASSETS = [
    './',
    './index.html',
    './script.js',
    './style.css',
    './manifest.json'
];

// 需要缓存的外部 CDN（这里是大头！babel-standalone 那 3MB 就在里面）
const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'
];

// 安装时预缓存所有静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => {
            console.log('[SW] 预缓存所有资源');
            // 本地文件用 addAll 严格模式（任一失败整批失败）
            const localPromise = cache.addAll(LOCAL_ASSETS);
            // CDN 文件逐个 add，单个失败不影响其他（CDN 偶尔挂掉时不卡死安装）
            const cdnPromises = CDN_ASSETS.map(url =>
                cache.add(url).catch(e => console.warn('[SW] 缓存失败:', url, e))
            );
            return Promise.all([localPromise, ...cdnPromises]);
        }).then(() => self.skipWaiting()) // 立即激活，不等老 SW 退场
    );
});

// 激活时清理老版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_VERSION)
                    .map(key => {
                        console.log('[SW] 清理旧缓存:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim()) // 立即接管已打开的页面
    );
});

// 拦截网络请求 —— Stale-While-Revalidate 策略
// 先用缓存秒返回（让页面飞快），同时后台拉新版本更新缓存
self.addEventListener('fetch', event => {
    const req = event.request;
    
    // 只拦截 GET 请求，不拦截 POST 等（避免破坏 API 调用）
    if (req.method !== 'GET') return;
    
    // 不缓存 API 请求 —— 让用户的 AI 对话走真实网络
    const url = new URL(req.url);
    const isApiCall = 
        url.hostname.includes('openai') ||
        url.hostname.includes('anthropic') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('generativelanguage') ||
        url.pathname.includes('/v1/') ||
        url.pathname.includes('/v1beta/');
    if (isApiCall) return;
    
    event.respondWith(
        caches.open(CACHE_VERSION).then(cache =>
            cache.match(req).then(cached => {
                // 后台静默更新（不阻塞响应）
                const fetchAndUpdate = fetch(req).then(resp => {
                    if (resp && resp.status === 200) {
                        cache.put(req, resp.clone()).catch(() => {});
                    }
                    return resp;
                }).catch(() => cached); // 离线时 fetch 失败就用缓存兜底
                
                // 有缓存就立刻返回缓存（页面秒开），没有就等网络
                return cached || fetchAndUpdate;
            })
        )
    );
});
