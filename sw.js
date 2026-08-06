/* 공원 원정대 서비스 워커 — 오프라인 지원 (앱 셸 사전 캐시 + 갱신형 캐시)
   배포 시 자산이 바뀌면 VERSION을 올려야 이전 캐시가 정리된다. */
const VERSION = 'quest-v19';
/* 탐험 유형 32캐릭터 일러스트 (4이동×4성향×남녀) + 기본 캐릭터 4종 — 지도 아바타·도감 공용 */
const CHARACTER_IMGS = ['explorer', 'curious', 'focus', 'speed'].flatMap((mv) =>
  ['detective', 'fairy', 'boss', 'guide'].flatMap((ms) =>
    ['girl', 'boy'].map((g) => `img/characters/${mv}-${ms}-${g}.webp`)));
const BASE_IMGS = ['girl', 'boy'].flatMap((g) => [1, 2].map((n) => `img/characters/base-${g}-${n}.webp`));
const PRECACHE = [
  ...CHARACTER_IMGS,
  ...BASE_IMGS,
  './',
  'index.html',
  'customize.html',
  'characters.html',
  'mapdata.js',
  'manifest.webmanifest',
  'js/i18n.js', 'js/i18n-en.js', 'js/config.js', 'js/geo.js', 'js/ground.js', 'js/scene.js', 'js/markers.js',
  'js/character.js', 'js/cameraCtl.js', 'js/family.js', 'js/ui.js', 'js/main.js',
  'js/quests-data.js', 'js/quest.js', 'js/questUI.js', 'js/store.js', 'js/interior.js', 'js/story.js', 'js/chat.js', 'js/track.js',
  'js/geomath.mjs', 'js/explorer-types.mjs', 'js/location.js', 'js/type-render.js', 'js/type-card.js',
  'js/unlock.js', 'js/mission-score.mjs', 'js/animal-status.js', 'data/animal-status.js', 'js/anim.mjs',
  'js/family-alert.mjs',
  'keeper.html',
  'img/liniwani.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // HTTP 캐시 우회(no-cache): 새 버전 설치 시 항상 서버에서 최신 파일을 받아 굽는다
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
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
