// sw.js (최소 버전 - 설치 가능 조건만 만족)

self.addEventListener("install", (event) => {
  // 바로 활성화
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 지금은 따로 할 일 없음
});

