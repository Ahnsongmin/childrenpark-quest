/* 순수 계산 모듈 — 브라우저·Node(단위 테스트) 공용. DOM·전역 MAP 의존 없음.
   좌표 필터·스무딩·지오펜스 히스테리시스·16유형 판정의 계산부가 전부 여기 모인다.
   테스트: node --test tools/tests/  (배포 제외 폴더) */

/* 위치 추적 설정 — 값 조정은 여기 한 곳에서 */
export const LOCATION_CONFIG = {
  minMovementMeters: 3,        // 이보다 작은 변화는 GPS 노이즈로 보고 이동 반영 안 함 (track.js STEP_U와 동일 기준)
  preferredAccuracyMeters: 30, // 이 이하면 좋은 신호
  lowAccuracyMeters: 50,       // 초과 시 "정확도 낮음" 표시 (기존 정확도 원 표시 기준과 동일)
  maximumAccuracyMeters: 100,  // 초과한 좌표는 반영 보류 (마지막 신뢰 위치 유지)
  smoothingFactor: 0.25,       // exponential smoothing 계수 (새 좌표 반영 비율)
  maxWalkingSpeedMps: 4.5,     // 도보 탐험에서 이보다 빠른 이동은 GPS 점프로 폐기
  walkThresholdMps: 0.4,       // 이상이면 walk 애니메이션
  runThresholdMps: 2.0,        // 이상이면 run 애니메이션
  spotEnterMeters: 10,         // 스팟 입장 판정 반경 (GPS 오차 감안 — 2026-07-29 사용자 지정값 유지)
  spotExitMeters: 20,          // 퇴장 판정 반경 (입장보다 넓게 — 경계에서 입퇴장 반복 방지)
  spotNotifyCooldownMs: 120000, // 같은 스팟 접근 알림 재표시 최소 간격
  parkEnterBufferM: 40,        // 공원 "안" 진입 판정 버퍼
  parkExitBufferM: 120,        // 공원 "밖" 이탈 판정 버퍼 (경계에서 배너 깜빡임 방지)
  parkNearM: 300,              // 공원 밖이지만 "거의 도착" 안내 반경
  staleFixMs: 30000,           // 백그라운드 복귀 시 이보다 오래된 좌표면 추적 재시작
};

/* 16유형 판정 임계값 */
export const TYPE_THRESHOLDS = {
  DIST_LONG_M: 2000,           // 이동거리 "김" 기준 (공원 외곽 한 바퀴 ≈ 2.5km)
  STAY_AVG_LONG_SEC: 480,      // 스팟 평균 체류 "김" 기준 8분 (스치면 1~3분, 관람하면 10분+)
  TRACK_MIN_ACTIVE_SEC: 600,   // 트랙을 신뢰하려면 최소 10분 활동
  TRACK_MIN_PTS: 10,           // + 최소 10개 동선 점
  FALLBACK_SPOTS_LONG: 4,      // (트랙 없음) 활동 스팟 수가 이 이상이면 이동 "김"
  FALLBACK_ACTS_PER_SPOT_LONG: 2, // (트랙 없음) 스팟당 활동 수가 이 이상이면 체류 "김"
};

const EARTH_R = 6371000;
const D2R = Math.PI / 180;

/* 위경도 두 점 거리(m) — equirectangular 근사 + 위도 보정 (공원 규모에선 Haversine과 동일 수준) */
export function latLonDistM(lat1, lon1, lat2, lon2) {
  const x = (lon2 - lon1) * D2R * Math.cos(((lat1 + lat2) / 2) * D2R);
  const y = (lat2 - lat1) * D2R;
  return EARTH_R * Math.hypot(x, y);
}

/* 이동 방향 (월드 좌표 증분 → 캐릭터 setHeading 라디안, +Z 정면 기준) */
export const bearingRad = (dx, dz) => Math.atan2(dx, dz);

export const speedMps = (distM, dtSec) => (dtSec > 0 ? distM / dtSec : 0);

/* 속도 → 애니메이션 상태 */
export function animStateFor(v, cfg = LOCATION_CONFIG) {
  if (v < cfg.walkThresholdMps) return 'idle';
  if (v < cfg.runThresholdMps) return 'walk';
  return 'run';
}

/* exponential smoothing — prev가 없으면(첫 좌표) 즉시 반영 */
export function smoothPos(prev, next, alpha) {
  if (!prev) return [next[0], next[1]];
  return [prev[0] + (next[0] - prev[0]) * alpha, prev[1] + (next[1] - prev[1]) * alpha];
}

/* GPS 좌표 수용 여부 — 정확도 필터 + 비정상 순간이동 필터
   fix: { lat, lon, accM, t(ms) } */
export function acceptFix(prevFix, fix, cfg = LOCATION_CONFIG) {
  if (fix.accM > cfg.maximumAccuracyMeters) return { ok: false, reason: 'accuracy', lowAccuracy: true };
  if (prevFix) {
    const dtSec = (fix.t - prevFix.t) / 1000;
    const dM = latLonDistM(prevFix.lat, prevFix.lon, fix.lat, fix.lon);
    if (dtSec > 0 && dM / dtSec > cfg.maxWalkingSpeedMps) return { ok: false, reason: 'jump', lowAccuracy: false };
  }
  return { ok: true, reason: null, lowAccuracy: fix.accM > cfg.lowAccuracyMeters };
}

/* 폴리곤 내부 판정 (ray casting) — pts: [[x,y],...] */
export function pointInPolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* 폴리라인까지 최단거리 (월드 유닛) */
export function distToPolylineU(pts, x, y) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    const px = x1 + t * dx - x, py = y1 + t * dy - y;
    min = Math.min(min, px * px + py * py);
  }
  return Math.sqrt(min);
}

/* 경계 판정 코어 (geo.js inPark의 계산부 — MAP 미의존) */
export function inBoundary(pts, viewW, viewH, x, y, bufferU) {
  if (x < -bufferU || y < -bufferU || x > viewW + bufferU || y > viewH + bufferU) return false;
  if (pointInPolygon(pts, x, y)) return true;
  return distToPolylineU(pts, x, y) <= bufferU;
}

/* 스팟 입퇴장 히스테리시스 — 입장 enterU / 퇴장 exitU (exitU > enterU)
   currentId: 현재 근접 중인 스팟 id(없으면 null), spots: [{id, x, z}]
   반환: 새 근접 스팟 id 또는 null */
export function spotTransition(currentId, x, z, spots, enterU, exitU) {
  if (currentId) {
    const cur = spots.find((s) => s.id === currentId);
    if (cur && Math.hypot(cur.x - x, cur.z - z) <= exitU) return currentId; // 아직 퇴장 반경 안 — 유지
  }
  let best = null, bestD = enterU;
  for (const s of spots) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bestD) { best = s.id; bestD = d; }
  }
  return best;
}

/* ── 16유형 판정 (이동축 × 탐험축) ── */

export const movementIdOf = (distLong, stayLong) =>
  (distLong ? (stayLong ? 'explorer' : 'curious') : (stayLong ? 'focus' : 'speed'));

export function avgStaySec(staySec) {
  const v = Object.values(staySec || {});
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/* 트랙(quest.track.v1)을 유형 판정에 쓸 만큼 신뢰할 수 있는지 */
export function isTrackReliable(tk, th = TYPE_THRESHOLDS) {
  return !!tk && tk.activeSec >= th.TRACK_MIN_ACTIVE_SEC && (tk.pts?.length || 0) >= th.TRACK_MIN_PTS;
}

/* 이동축 — 트랙 기반 (이동거리 × 평균 체류시간) */
export function classifyMovementFromTrack(tk, th = TYPE_THRESHOLDS) {
  return movementIdOf(tk.distM >= th.DIST_LONG_M, avgStaySec(tk.staySec) >= th.STAY_AVG_LONG_SEC);
}

/* 이동축 폴백 — 위치 기록이 없을 때 활동 기록으로 추정
   spotCount: 활동한 스팟 수, actCount: 총 활동 수 */
export function classifyMovementFromActivity({ spotCount, actCount }, th = TYPE_THRESHOLDS) {
  const distLong = spotCount >= th.FALLBACK_SPOTS_LONG;
  const stayLong = spotCount > 0 && actCount / spotCount >= th.FALLBACK_ACTS_PER_SPOT_LONG;
  return movementIdOf(distLong, stayLong);
}

/* 탐험축 — 활동 종류별 카운트로 성향 판정
   counts: { observe, quiz, dwell, discovery, note, photo }
   note(자유 기록)는 관찰 성향에 0.5, photo(자유 사진)는 발견 성향에 0.5 가중.
   동점이면 detective → fairy → boss → guide 순 우선. */
export function classifyMission(counts = {}) {
  const score = {
    detective: (counts.observe || 0) + (counts.note || 0) * 0.5,
    fairy: counts.quiz || 0,
    boss: counts.dwell || 0,
    guide: (counts.discovery || 0) + (counts.photo || 0) * 0.5,
  };
  let best = 'detective';
  for (const id of ['detective', 'fairy', 'boss', 'guide']) {
    if (score[id] > score[best]) best = id;
  }
  return best;
}
