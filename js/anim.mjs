/* 리캡 슬라이드 등장 애니메이션 타이밍 — 순수 계산 모듈.
   브라우저·Node(단위 테스트) 공용, DOM 의존 없음.
   감각 기준은 리캡 데모 v4: 숫자 하나가 1.4초 동안 0에서 올라오고,
   한 화면에 여러 개면 0.8초씩 차례로 시작한다.
   테스트: node --test tools/tests/ */

export const COUNT_DELAY = 300;  // 슬라이드가 뜨고 숫자가 오르기 시작할 때까지
export const COUNT_DUR = 1400;   // 숫자 하나가 다 오르는 데 걸리는 시간
export const COUNT_GAP = 800;    // 다음 숫자가 시작하기까지의 간격
export const RISE_DUR = 380;     // 뱃지·pill이 떠오르는 시간

export const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* delay~delay+len 구간의 진행률 (0~1) — 통계 슬라이드가 쓰는 비율 기반 버전 */
export const phase = (p, delay, len) => easeOut(clamp01((p - delay) / len));

/* k번째 숫자의 진행률. t = 슬라이드가 뜬 뒤 경과 ms */
export const countP = (t, k = 0) => easeOut(clamp01((t - (COUNT_DELAY + k * COUNT_GAP)) / COUNT_DUR));

/* 카운트업 중인 값 */
export const upInt = (v, t, k = 0) => Math.round(v * countP(t, k));
export const upFix = (v, t, k = 0, d = 1) => (v * countP(t, k)).toFixed(d);

/* 숫자 n개짜리 슬라이드를 끝까지 재생하는 데 필요한 시간 */
export const countDur = (n, extra = 0) =>
  COUNT_DELAY + Math.max(0, n - 1) * COUNT_GAP + COUNT_DUR + 400 + extra;

/* 숫자 뒤에 따라 붙는 요소의 등장 진행률 */
export const riseP = (t, delay) => easeOut(clamp01((t - delay) / RISE_DUR));
