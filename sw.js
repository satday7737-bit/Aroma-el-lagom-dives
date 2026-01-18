// sw.js (최소 버전 - 설치 가능 조건만 만족)

self.addEventListener("install", (event) => {
  // 바로 활성화
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 지금은 따로 할 일 없음
});

// 요청 가로채기 - 여기서는 그냥 통과
self.addEventListener("fetch", (event) => {
  // 추후에 오프라인 캐시를 쓰고 싶으면 여기서 처리
});
