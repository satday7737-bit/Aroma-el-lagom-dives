const CACHE_NAME = "ael-cache-v7"; // 수정할 때마다 v 숫자 올리기

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-init.js",
  "./manifest.json",
  "./roblecoco_icon_192.png",
  "./roblecoco_icon_512.png"
];

// 설치: 필수 파일 캐시
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 활성화: 예전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
      )
    ])
  );
});

// fetch: 기본은 캐시 우선, 없으면 네트워크
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});
