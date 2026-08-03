/* 이동 기록 — 오늘의 동선(트랙)·이동거리·스팟별 체류시간. localStorage에만 저장(기기 밖 전송 없음).
   리캡 스토리의 데이터 원천: S1 동선 배속 재생, 총평 최다 체류 장소.
   좌표는 지도 월드 유닛(1 unit ≈ 0.83m) — 미니 지도 위에 그대로 그릴 수 있다.
   GPS·데모 탭·산책 데모 모두 main.js setMe()를 지나므로 한 곳에서 수집된다. */
import { SPOTS } from './quests-data.js';
import { LANDMARKS } from './config.js';
import { prj, M2U } from './geo.js';
import { loadJSON, saveJSON } from './store.js';

const KEY = 'quest.track.v1';
const STEP_U = 3 * M2U;   // 3m 이상 움직여야 점 기록 (하루 3km ≈ 점 300개)
const JUMP_U = 150 * M2U; // 150m 초과 순간이동(데모 탭 등)은 걸은 거리에서 제외
const NEAR_U = 40 * M2U;  // 체류 귀속 반경 40m
const GAP_S = 60;         // 위치 공백 시 체류·활동으로 인정하는 상한(초)

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* 스팟 좌표 (quest.js와 동일 규칙: lm 랜드마크 좌표 재사용) */
const spotPos = new Map();
for (const s of SPOTS) {
  const src = s.lm ? LANDMARKS.find((l) => l.id === s.lm) : s;
  spotPos.set(s.id, prj(src.lat, src.lon));
}
export const spotPosOf = (id) => spotPos.get(id) || null;

let t = null;
let lastSaved = 0;
let lastPos = null, lastTs = 0;
let interiorSpot = null, interiorTimer = null;

function ensure() {
  if (t && t.date === todayKey()) return t;
  const stored = loadJSON(KEY, null);
  t = stored && stored.date === todayKey()
    ? stored
    : { date: todayKey(), t0: Date.now(), pts: [], distM: 0, staySec: {}, spotOrder: [], activeSec: 0 };
  return t;
}

function save(force) {
  const now = Date.now();
  if (!force && now - lastSaved < 3000) return;
  lastSaved = now;
  saveJSON(KEY, t);
}

function nearestSpot(x, z) {
  let best = null, bestD = NEAR_U;
  for (const [id, [sx, sz]] of spotPos) {
    const d = Math.hypot(sx - x, sz - z);
    if (d < bestD) { best = id; bestD = d; }
  }
  return best;
}

function addStay(spotId, sec) {
  if (!spotId) return;
  t.staySec[spotId] = (t.staySec[spotId] || 0) + sec;
  if (!t.spotOrder.includes(spotId)) t.spotOrder.push(spotId);
}

export function trackPosition(x, z) {
  ensure();
  const now = Date.now();
  if (lastTs) {
    const dt = Math.min(GAP_S, (now - lastTs) / 1000);
    t.activeSec += dt;
    addStay(interiorSpot || nearestSpot(x, z), dt);
  }
  lastTs = now;
  if (!lastPos || Math.hypot(x - lastPos[0], z - lastPos[1]) >= STEP_U) {
    if (lastPos) {
      const dU = Math.hypot(x - lastPos[0], z - lastPos[1]);
      if (dU <= JUMP_U) t.distM += dU / M2U;
    }
    t.pts.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, Math.round((now - t.t0) / 1000)]);
    lastPos = [x, z];
  }
  save();
}

/* 마을 안(내부 지도)은 자체 좌표계라 trackPosition이 안 불림 — 5초 심장박동으로 그 마을에 체류 귀속 */
export function trackEnterSpot(spotId) {
  ensure();
  interiorSpot = spotId;
  addStay(spotId, 0);
  save(true);
  clearInterval(interiorTimer);
  interiorTimer = setInterval(() => {
    ensure();
    t.activeSec += 5;
    addStay(interiorSpot, 5);
    lastTs = Date.now(); // 마을에서 나온 뒤 첫 위치 갱신과 이중 계산 방지
    save();
  }, 5000);
}

export function trackExitSpot() {
  interiorSpot = null;
  clearInterval(interiorTimer);
  interiorTimer = null;
  if (t) save(true);
}

export function trackToday() {
  return ensure();
}

/* 오늘 위치 기록 삭제 (개인정보 — 사용자가 직접 지울 수 있게) */
export function clearToday() {
  localStorage.removeItem(KEY);
  t = null;
  lastPos = null;
  lastTs = 0;
}
