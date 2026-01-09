// Aroma el lagom dives 상담차트 PWA service worker

const CACHE_NAME = "aroma-consult-cache-v1";

// 캐시에 넣어둘 기본 파일들
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 설치 단계: 기본 파일 캐싱
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 활성화 단계: 예전 캐시 삭제(버전 변경 시)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 요청 가로채기: 네트워크 우선, 실패 시 캐시 fallback
self.addEventListener("fetch", event => {
  const request = event.request;

  // GET 요청만 캐싱
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // 응답을 복제해서 캐시에 저장
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 찾아보기
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 요청에 맞는 캐시가 없으면 기본 페이지라도 반환
          return caches.match("./index.html");
        });
      })
  );
});
