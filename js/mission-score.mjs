/* 미션 배정 점수 계산 — 순수 모듈. 브라우저·Node(단위 테스트) 공용, DOM·전역 의존 없음.
   설계 근거: 어린이대공원 공모전\미션생성로직_확정안.md (가중치 표와 1:1 대응)
   소비: js/quest.js  |  테스트: node --test tools/tests/ */

/* 배정 가중치 — 문서의 점수표와 같은 값. 값 조정은 여기 한 곳에서.
   중복(-50)을 최대 보너스(+40)보다 크게 둬서, 보너스가 겹쳐도 "다 한 곳"이 쉽게 되뽑히지 않게 한다. */
export const MISSION_WEIGHTS = {
  unvisited: 40,   // 발견일지에 없는 동물이 있는 우리
  needObserve: 30, // 사육사가 오늘 '특별관찰'로 지정
  lowActivity: 20, // 평소 발길이 뜸한 구역
  incomplete: 15,  // 가봤지만 미션 미완 또는 퀴즈 오답
  duplicate: -50,  // 과거 방문에서 이미 완수
};

/* 저활동 구역 — 시제품은 고정 목록(PRD의 "팔각당·식물원 방면" 근거).
   본사업에서는 요일·시간대별 평시 방문 패턴으로 대체한다(실시간 영상·이용객 추적 없음). */
export const LOW_ACTIVITY_SPOTS = new Set(['palgak', 'botanic', 'foreststage']);

/* 체류 예정시간 → 배정량. 짧게 들르는 가족에게 6개를 던지면 하나도 완수하지 못한다.
   발견 미션은 공원 곳곳에서 사진 2장을 모으는 형태라 1시간 미만에는 배정하지 않는다. */
export const STAY_BANDS = [
  { id: 'short', label: '30분~1시간', maxMin: 60, animal: 1, dwell: 1, disc: false },
  { id: 'mid', label: '1~2시간', maxMin: 120, animal: 2, dwell: 1, disc: true },
  { id: 'long', label: '2~3시간', maxMin: 180, animal: 3, dwell: 1, disc: true },
  { id: 'full', label: '3시간 이상', maxMin: Infinity, animal: 4, dwell: 1, disc: true },
];
/* 미입력 기본값 = 'long' (기존 시제품 동작인 동물마을 3 + 체류 1 + 발견 1과 동일) */
export const DEFAULT_STAY_BAND = 'long';

/* 나이 구간 — 입력 UI(5~7 / 8~10 / 11살~)와 퀴즈 band(easy/hard)를 하나로 통일.
   observeRatio: 관찰 미션 비율 (나머지는 교육 미션) */
export const AGE_BANDS = [
  { id: 'young', maxAge: 7, quizBand: 'easy', observeRatio: 0.7 },
  { id: 'mid', maxAge: 10, quizBand: 'hard', observeRatio: 0.5 },
  { id: 'old', maxAge: Infinity, quizBand: 'hard', observeRatio: 0.4 },
];

export function stayBandOf(stayMin) {
  if (stayMin === null || stayMin === undefined) return STAY_BANDS.find((b) => b.id === DEFAULT_STAY_BAND);
  return STAY_BANDS.find((b) => stayMin <= b.maxMin) || STAY_BANDS[STAY_BANDS.length - 1];
}

/* 나이 미입력은 가장 쉬운 구간으로 — 기존 동작(age>=8이면 hard, 아니면 easy)과 결과가 같다 */
export function ageBandOf(age) {
  if (age === null || age === undefined) return AGE_BANDS[0];
  return AGE_BANDS.find((b) => age <= b.maxAge) || AGE_BANDS[AGE_BANDS.length - 1];
}

/* flags: { unvisited, needObserve, lowActivity, incomplete, duplicate } — 참인 항목만 합산 */
export function scoreOf(flags = {}) {
  let score = 0;
  const reasons = [];
  for (const [key, w] of Object.entries(MISSION_WEIGHTS)) {
    if (flags[key]) { score += w; reasons.push(key); }
  }
  return { score, reasons };
}

/* 점수 내림차순 정렬. 동점은 입력 순서를 유지하므로(안정 정렬),
   호출부에서 시드 셔플한 배열을 넘기면 동점 순서까지 결정적으로 재현된다. */
export function rankSpots(spots, flagsOf) {
  return spots
    .map((spot) => ({ spot, ...scoreOf(flagsOf(spot)) }))
    .sort((a, b) => b.score - a.score);
}

/* 스팟별 미션 유형 결정.
   ① 체류 스팟은 언제나 체류 미션 (저활동 구역 3곳이 모두 체류 스팟이라 규칙이 겹치지 않는다)
   ② 사육사가 특별관찰로 지정했으면 관찰 미션 고정
   ③ 그 외에는 나이 구간의 관찰 비율로 결정 — rnd는 시드 난수(확률이 아니라 재현 가능한 결정) */
export function missionTypeFor({ kind, needObserve = false, age = null, rnd = 0 }) {
  if (kind === 'dwell') return 'dwell';
  if (needObserve) return 'observe';
  return rnd < ageBandOf(age).observeRatio ? 'observe' : 'quiz';
}
