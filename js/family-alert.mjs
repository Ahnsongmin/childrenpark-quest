/* 가족 안전 거리 알림 — 단계 판정 순수 모듈. 브라우저·Node(단위 테스트) 공용, DOM·전역 의존 없음.
   설계 근거: 아이디어설명서 「가족 안전 지도」 — 초대코드로 연결된 구성원이 서로의 거리를 확인하고,
   설정 거리를 벗어나면 20m·50m·100m 기준으로 단계별 알림을 받는다.
   거리 계산은 각자의 기기에서 한다(위치를 서버에 저장하지 않음). 얼굴 인식·생체정보는 쓰지 않는다.
   소비: js/family.js  |  테스트: node --test tools/tests/family-alert.test.mjs */

/* 멀어질수록 단계가 올라간다. vib는 기기 진동 패턴(ms) — 단계가 셀수록 길고 잦게. */
export const ALERT_STEPS = [
  { m: 20, level: 1, icon: '🟡', name: '주의', vib: [120] },
  { m: 50, level: 2, icon: '🟠', name: '경고', vib: [80, 60, 80] },
  { m: 100, level: 3, icon: '🔴', name: '위험', vib: [140, 80, 140, 80, 140] },
];

export const ALERT_CHOICES = [0, 20, 50, 100]; // 알림 시작 거리 선택지 (0 = 끔)
export const ALERT_DEFAULT = 50;               // 기본값 — 공원에서 목소리가 닿는 거리를 넘어서는 지점
export const ALERT_COOLDOWN_MS = 30000;        // 같은 단계 재알림 최소 간격
export const ALERT_REPEAT_MS = 120000;         // 계속 떨어져 있으면 2분마다 한 번 더
export const ALERT_HYST = 0.8;                 // 단계 하강 문턱 — 경계에서 알림이 깜빡이지 않게

export const stepAt = (level) => ALERT_STEPS.find((s) => s.level === level);

/* 올라갈 땐 기준 그대로, 내려올 땐 80% 안쪽으로 들어와야 단계가 풀린다.
   50m 경계를 오가며 알림이 반복되는 것을 막기 위한 히스테리시스 — 지오펜스(geomath)와 같은 원리. */
export function stepOf(dm, prevLevel = 0) {
  let lv = 0;
  for (const s of ALERT_STEPS) {
    if (dm >= (s.level <= prevLevel ? s.m * ALERT_HYST : s.m)) lv = s.level;
  }
  return lv;
}

/* 설정한 시작 거리(from) 기준으로 이 단계를 알려야 하는가. from이 0이면 전부 끔 */
export function alertable(level, from) {
  const s = stepAt(level);
  return !!from && !!s && s.m >= from;
}

/* 저장된 설정값 정규화 — 손상된 값·구버전 값은 기본값으로.
   미설정(null·'')을 Number()에 그냥 넘기면 0(=끔)이 되어 첫 방문자가 알림을 못 받는다. */
export function normalizeFrom(raw) {
  if (raw === null || raw === undefined || raw === '') return ALERT_DEFAULT;
  const v = Number(raw);
  return ALERT_CHOICES.includes(v) ? v : ALERT_DEFAULT;
}
