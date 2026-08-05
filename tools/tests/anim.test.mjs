/* 리캡 등장 애니메이션 타이밍 단위 테스트 — 실행: node --test tools/tests/
   "숫자가 한 번에 뜨지 않고 올라간다"를 코드로 고정한다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNT_DELAY, COUNT_DUR, COUNT_GAP, easeOut, countP, upInt, upFix, countDur, riseP,
} from '../../js/anim.mjs';

test('easeOut — 0에서 1로, 처음이 빠르고 끝이 느리다', () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.ok(easeOut(0.5) > 0.5, '중간에 이미 절반을 넘어야 한다(감속 곡선)');
  for (let p = 0; p < 1; p += 0.1) assert.ok(easeOut(p + 0.05) > easeOut(p), '단조 증가');
});

test('countP — 지연 전에는 0, 재생이 끝나면 1', () => {
  assert.equal(countP(0), 0);
  assert.equal(countP(COUNT_DELAY), 0, '지연이 끝나는 순간까지는 0');
  assert.equal(countP(COUNT_DELAY + COUNT_DUR), 1);
  assert.equal(countP(99999), 1);
  assert.equal(countP(Infinity), 1, '정적 렌더(공유 이미지)는 최종 상태여야 한다');
});

test('countP — k번째 숫자는 0.8초씩 늦게 시작하고, 앞 숫자와 살짝 겹친다', () => {
  const start = (k) => COUNT_DELAY + k * COUNT_GAP;
  assert.equal(countP(start(1), 1), 0, '두 번째 숫자는 제 시작 시각까지 0');
  assert.ok(countP(start(1) + 700, 1) > 0);
  /* 간격(0.8초)이 지속(1.4초)보다 짧아 앞 숫자가 끝나기 전에 다음이 시작한다 —
     참고 데모(recap_demo_v4)와 같은 겹침. 다만 앞 숫자는 이미 거의 다 올라와 있다. */
  assert.ok(COUNT_GAP < COUNT_DUR, '겹치도록 설계됨');
  assert.ok(countP(start(1), 0) > 0.9, `두 번째가 시작할 때 첫 번째는 90% 이상 (${countP(start(1), 0).toFixed(2)})`);
  assert.ok(countP(start(1), 0) < 1);
});

test('upInt — 한 번에 뜨지 않고 0에서 목표값까지 올라간다', () => {
  const seen = [];
  for (let t = 0; t <= COUNT_DELAY + COUNT_DUR; t += 100) seen.push(upInt(7, t));
  assert.equal(seen[0], 0, '시작은 0');
  assert.equal(seen[seen.length - 1], 7, '끝은 목표값');
  assert.ok(new Set(seen).size >= 5, `중간값이 충분히 나와야 한다 (본 값: ${[...new Set(seen)].join(',')})`);
  // 되돌아가지 않는다
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1], '값이 줄면 안 된다');
});

test('upFix — 소수 한 자리(거리 km)도 같은 방식으로 오른다', () => {
  assert.equal(upFix(3.1, 0), '0.0');
  assert.equal(upFix(3.1, COUNT_DELAY + COUNT_DUR), '3.1');
  const mid = parseFloat(upFix(3.1, COUNT_DELAY + 500));
  assert.ok(mid > 0 && mid < 3.1, `중간값 ${mid}`);
});

test('countDur — 숫자가 늘면 재생 시간도 늘고, 마지막 숫자가 다 오른 뒤에 끝난다', () => {
  assert.ok(countDur(2) > countDur(1));
  assert.ok(countDur(3) > countDur(2));
  for (const n of [1, 2, 3]) {
    const last = COUNT_DELAY + (n - 1) * COUNT_GAP + COUNT_DUR;
    assert.ok(countDur(n) >= last, `n=${n}: 재생 길이가 마지막 숫자보다 짧으면 안 된다`);
    assert.equal(countP(countDur(n), n - 1), 1);
  }
  assert.ok(countDur(1, 900) > countDur(1), 'extra는 뒤따르는 요소 시간만큼 늘려준다');
});

test('riseP — pill은 delay 전엔 안 보이고 380ms 뒤 완전히 나타난다', () => {
  assert.equal(riseP(0, 1700), 0);
  assert.equal(riseP(1700, 1700), 0);
  assert.ok(riseP(1900, 1700) > 0 && riseP(1900, 1700) < 1);
  assert.equal(riseP(2100, 1700), 1);
});

test('②번 슬라이드 시나리오 — 숫자가 다 오른 뒤에 pill이 차례로 뜬다', () => {
  const numDone = COUNT_DELAY + COUNT_DUR;
  assert.equal(countP(numDone), 1);
  // pill 4개가 180ms 간격으로
  const pillStart = (i) => numDone + i * 180;
  assert.equal(riseP(numDone, pillStart(0)), 0, '숫자가 막 끝난 순간엔 pill이 아직 안 보인다');
  assert.equal(riseP(pillStart(3), pillStart(0)), 1, '첫 pill은 넷째가 시작할 때 이미 다 떠 있다');
  assert.ok(riseP(pillStart(3), pillStart(3)) === 0);
  // 전체 재생 길이가 마지막 pill까지 덮는지
  assert.ok(countDur(1, 900) >= pillStart(4) + 380, '재생 시간이 마지막 pill을 덮어야 한다');
});
