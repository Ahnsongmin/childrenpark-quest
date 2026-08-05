/* 미션 배정 점수·배정량·유형 결정 단위 테스트 — 실행: node --test tools/tests/
   문서(미션생성로직_확정안.md)의 표와 코드가 어긋나면 여기서 걸린다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSION_WEIGHTS, LOW_ACTIVITY_SPOTS, STAY_BANDS, AGE_BANDS,
  stayBandOf, ageBandOf, scoreOf, rankSpots, missionTypeFor,
} from '../../js/mission-score.mjs';
import { SPOTS, ANIMALS } from '../../js/quests-data.js';

test('MISSION_WEIGHTS — 문서의 점수표와 값이 같다', () => {
  assert.deepEqual(MISSION_WEIGHTS, {
    unvisited: 40, needObserve: 30, lowActivity: 20, incomplete: 15, duplicate: -50,
  });
});

test('중복 페널티는 어떤 단일 보너스보다도 크다 — 다 한 곳이 쉽게 되뽑히지 않는다', () => {
  const maxBonus = Math.max(...Object.values(MISSION_WEIGHTS).filter((w) => w > 0));
  assert.ok(Math.abs(MISSION_WEIGHTS.duplicate) > maxBonus,
    `duplicate ${MISSION_WEIGHTS.duplicate} vs maxBonus ${maxBonus}`);
});

test('scoreOf — 참인 항목만 합산하고 이유를 함께 돌려준다', () => {
  assert.deepEqual(scoreOf({}), { score: 0, reasons: [] });
  assert.equal(scoreOf({ unvisited: true }).score, 40);
  assert.equal(scoreOf({ unvisited: true, needObserve: true }).score, 70);
  // 한 번도 안 가본 곳(+40)이 가봤지만 미완인 곳(+15)보다 항상 앞선다
  assert.ok(scoreOf({ unvisited: true }).score > scoreOf({ incomplete: true }).score);
  // 완수한 곳은 저활동 보너스가 붙어도 음수
  assert.ok(scoreOf({ duplicate: true, lowActivity: true }).score < 0);
  assert.deepEqual(scoreOf({ duplicate: true, lowActivity: true }).reasons, ['lowActivity', 'duplicate']);
});

test('rankSpots — 점수 내림차순, 동점은 입력 순서 유지(시드 셔플 재현성)', () => {
  const spots = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const flags = {
    a: { duplicate: true },          // -50
    b: { unvisited: true },          // +40
    c: { unvisited: true },          // +40  ← b와 동점
    d: { incomplete: true },         // +15
  };
  const ranked = rankSpots(spots, (s) => flags[s.id]);
  assert.deepEqual(ranked.map((r) => r.spot.id), ['b', 'c', 'd', 'a']);
  // 입력 순서를 뒤집으면 동점 둘의 순서만 뒤집힌다 = 셔플이 동점을 결정한다
  const rev = rankSpots([{ id: 'c' }, { id: 'b' }, { id: 'd' }, { id: 'a' }], (s) => flags[s.id]);
  assert.deepEqual(rev.map((r) => r.spot.id), ['c', 'b', 'd', 'a']);
});

test('stayBandOf — 체류 예정시간별 배정 개수가 문서 표와 같다', () => {
  const total = (min) => { const b = stayBandOf(min); return b.animal + b.dwell + (b.disc ? 1 : 0); };
  assert.equal(total(60), 2);   // 30분~1시간 → 동물마을 1 + 쉼터 1
  assert.equal(total(120), 4);  // 1~2시간   → 2 + 1 + 발견 1
  assert.equal(total(180), 5);  // 2~3시간   → 3 + 1 + 발견 1
  assert.equal(total(240), 6);  // 3시간 이상 → 4 + 1 + 발견 1
  // 짧은 방문에는 발견 탐험을 배정하지 않는다
  assert.equal(stayBandOf(60).disc, false);
  assert.equal(stayBandOf(120).disc, true);
  // 미입력 기본값 = 기존 시제품 동작(동물마을 3 + 쉼터 1 + 발견 1)
  assert.equal(stayBandOf(null).animal, 3);
  assert.equal(stayBandOf(undefined).id, 'long');
  // 배정량은 단조 증가한다
  const counts = STAY_BANDS.map((b) => b.animal);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b));
});

test('배정 개수가 실제 스팟 수를 넘지 않는다', () => {
  const animalSpots = SPOTS.filter((s) => s.kind === 'animal').length;
  const dwellSpots = SPOTS.filter((s) => s.kind === 'dwell').length;
  for (const b of STAY_BANDS) {
    assert.ok(b.animal <= animalSpots, `${b.id}: ${b.animal} > ${animalSpots}`);
    assert.ok(b.dwell <= dwellSpots, `${b.id}: ${b.dwell} > ${dwellSpots}`);
  }
});

test('ageBandOf — 입력 UI 구간(5~7 / 8~10 / 11~)과 퀴즈 난이도가 맞물린다', () => {
  assert.equal(ageBandOf(5).quizBand, 'easy');
  assert.equal(ageBandOf(7).quizBand, 'easy');
  assert.equal(ageBandOf(8).quizBand, 'hard');
  assert.equal(ageBandOf(11).quizBand, 'hard');
  // 미입력은 가장 쉬운 구간 — 기존 동작(age>=8이면 hard)과 결과가 같다
  assert.equal(ageBandOf(null).quizBand, 'easy');
  for (let age = 0; age <= 15; age++) {
    assert.equal(ageBandOf(age).quizBand, age >= 8 ? 'hard' : 'easy', `age ${age}`);
  }
  // 나이가 많을수록 관찰 비율이 낮아진다(지식 위주로)
  const ratios = AGE_BANDS.map((b) => b.observeRatio);
  assert.deepEqual(ratios, [...ratios].sort((a, b) => b - a));
  assert.deepEqual(ratios, [0.7, 0.5, 0.4]);
});

test('missionTypeFor — 체류 스팟 > 특별관찰 > 나이 비율 순으로 결정된다', () => {
  // 체류 스팟은 언제나 체류 미션
  assert.equal(missionTypeFor({ kind: 'dwell', needObserve: true, age: 11, rnd: 0.99 }), 'dwell');
  // 사육사가 특별관찰로 지정하면 나이·난수와 무관하게 관찰
  assert.equal(missionTypeFor({ kind: 'animal', needObserve: true, age: 11, rnd: 0.99 }), 'observe');
  // 5~7살은 관찰 70% — rnd 0.6이면 관찰, 0.8이면 교육
  assert.equal(missionTypeFor({ kind: 'animal', age: 5, rnd: 0.6 }), 'observe');
  assert.equal(missionTypeFor({ kind: 'animal', age: 5, rnd: 0.8 }), 'quiz');
  // 11살 이상은 관찰 40% — 같은 rnd 0.6이 교육으로 갈린다
  assert.equal(missionTypeFor({ kind: 'animal', age: 11, rnd: 0.6 }), 'quiz');
  assert.equal(missionTypeFor({ kind: 'animal', age: 11, rnd: 0.3 }), 'observe');
});

test('LOW_ACTIVITY_SPOTS — 실재하는 스팟 id만 담고, 전부 쉼터(체류 스팟)다', () => {
  const byId = new Map(SPOTS.map((s) => [s.id, s]));
  for (const id of LOW_ACTIVITY_SPOTS) {
    assert.ok(byId.has(id), `존재하지 않는 스팟 id: ${id}`);
    // 저활동 구역과 체류 스팟이 겹쳐야 "저활동 구역 → 체류 미션" 규칙이 성립한다
    assert.equal(byId.get(id).kind, 'dwell', `${id}는 체류 스팟이 아님`);
  }
  assert.ok(LOW_ACTIVITY_SPOTS.size > 0);
});

test('내실 동물 제외 — 우리 전체가 내실이면 그 우리는 후보에서 빠진다', () => {
  // animal-status.js의 visibleAnimals와 같은 규칙을 데이터로 검증
  const predator = SPOTS.find((s) => s.id === 'predator');
  const indoor = new Set(predator.animals); // 맹수마을 전원 내실이라고 가정
  const visible = (spot) => spot.animals.filter((a) => !indoor.has(a));
  assert.equal(visible(predator).length, 0);
  const stillOpen = SPOTS.filter((s) => s.kind === 'animal' && visible(s).length > 0);
  assert.ok(stillOpen.length > 0, '다른 우리는 남아 있어야 한다');
  assert.ok(!stillOpen.some((s) => s.id === 'predator'));
  // 일부만 내실이면 그 우리는 남고, 내실 동물만 빠진다
  const partial = new Set(['lion', 'tiger']);
  const rest = predator.animals.filter((a) => !partial.has(a));
  assert.ok(rest.length > 0 && !rest.includes('lion') && !rest.includes('tiger'));
  for (const a of rest) assert.ok(ANIMALS[a], `알 수 없는 동물 id: ${a}`);
});
