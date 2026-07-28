/* 공원 원정대 서비스 워커 — 오프라인 지원 (앱 셸 사전 캐시 + 갱신형 캐시)
   배포 시 자산이 바뀌면 VERSION을 올려야 이전 캐시가 정리된다. */
const VERSION = 'quest-v5-1';
const PRECACHE = [
  './',
  'index.html',
  'customize.html',
  'mapdata.js',
  'manifest.webmanifest',
  'js/config.js', 'js/geo.js', 'js/ground.js', 'js/scene.js', 'js/markers.js',
  'js/character.js', 'js/cameraCtl.js', 'js/family.js', 'js/ui.js', 'js/main.js',
  'js/quests-data.js', 'js/quest.js', 'js/questUI.js', 'js/store.js',
  'img/liniwani.avif',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('supabase.co')) return; // 실시간 위치 공유는 항상 네트워크
  const cacheable = url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;
  // 캐시 우선 + 뒤에서 갱신(stale-while-revalidate): 오프라인에서도 열리고, 온라인이면 다음 방문에 최신
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    }),
  );
});
