/* 발견일지(도감) 등재 경로 테스트 — 🎓 퀴즈 / ✨ 발견 탐험 사진 두 가지.
   근거: 미션생성로직_확정안.md, js/quest.js addDiscoveryPhoto */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* mapdata.js는 전역 스크립트(const MAP = …)라 import가 안 된다 — 읽어서 전역에 심는다.
   geo.js가 모듈 초기화 시점에 MAP.VIEW_W를 읽으므로 quest.js import보다 먼저여야 한다. */
globalThis.MAP = new Function(`${readFileSync(new URL('../../mapdata.js', import.meta.url), 'utf8')}\nreturn MAP;`)();

/* quest.js는 기록을 localStorage에 저장한다 — 브라우저 밖에서 돌리기 위한 최소 스텁 */
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const { initQuests } = await import('../../js/quest.js');
const { ANIMALS } = await import('../../js/quests-data.js');

/* 매 테스트를 빈 기기 상태에서 시작 */
function fresh() {
  mem.clear();
  return initQuests({});
}

/* 오늘 배정된 발견 탐험의 대상 / 비대상 동물 한 마리씩 */
function pickTargets(q) {
  const { def } = q.discovery();
  const other = Object.keys(ANIMALS).find((id) => !def.targets.includes(id));
  return { def, target: def.targets[0], other };
}

test('발견 탐험 대상을 사진으로 찾으면 발견일지에 등재된다', () => {
  const q = fresh();
  const { target } = pickTargets(q);
  assert.ok(!q.dexList().find((a) => a.id === target).met, '시작 시엔 미등재');

  const r = q.addDiscoveryPhoto(target, null);
  assert.equal(r.hit, true, '발견 탐험 진행분으로 인정');
  assert.deepEqual(r.newAnimals, [target], '이번에 새로 등재된 동물로 반환');
  assert.ok(q.dexList().find((a) => a.id === target).met, '발견일지에 등재됨');
});

test('발견 탐험 대상이 아닌 동물의 자유 사진은 등재되지 않는다 — 만남만 기록', () => {
  const q = fresh();
  const { other } = pickTargets(q);

  const r = q.addDiscoveryPhoto(other, null);
  assert.equal(r.hit, false);
  assert.deepEqual(r.newAnimals, [], '등재 없음');
  assert.ok(!q.dexList().find((a) => a.id === other).met, '발견일지 미등재');
  assert.ok(q.visit.met.includes(other), '오늘 만난 동물로는 기록됨(리캡에 나옴)');
});

test('같은 대상을 두 번 찍어도 중복 등재되지 않는다', () => {
  const q = fresh();
  const { target } = pickTargets(q);

  q.addDiscoveryPhoto(target, null);
  const again = q.addDiscoveryPhoto(target, null);
  assert.equal(again.hit, false, '이미 찾은 대상');
  assert.deepEqual(again.newAnimals, []);
  assert.equal(q.dexList().filter((a) => a.met).length, 1, '도감은 1종 그대로');
});

test('need를 채운 뒤 찾은 대상도 등재된다 — 더 찾을수록 도감이 는다', () => {
  const q = fresh();
  const { def } = pickTargets(q);
  if (def.targets.length <= def.need) return; // targets가 need와 같은 탐험이면 해당 없음

  for (const t of def.targets.slice(0, def.need)) q.addDiscoveryPhoto(t, null);
  assert.equal(q.discovery().done, true, '발견 탐험 완료');

  const extra = def.targets[def.need];
  const r = q.addDiscoveryPhoto(extra, null);
  assert.deepEqual(r.newAnimals, [extra], '완료 후에 찾은 대상도 등재');
  assert.equal(q.dexList().filter((a) => a.met).length, def.need + 1);
});

test('퀴즈 등재 경로는 그대로 — 정답·오답 무관하게 등재된다', () => {
  const q = fresh();
  const spot = q.visit.assign.spots[0];
  const picks = q.quizAnimalsFor(spot);
  if (!picks.length) return; // 오늘 이 마을에 퀴즈 후보가 없으면 해당 없음

  const r = q.answerQuiz(picks[0], 99); // 존재하지 않는 보기 = 오답
  assert.equal(r.correct, false);
  assert.deepEqual(r.newAnimals, [picks[0]], '오답도 등재');
});
