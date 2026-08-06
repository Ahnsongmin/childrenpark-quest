/* 가족 안전 거리 알림 — 단계 판정·히스테리시스·설정 필터 테스트
   근거: js/family-alert.mjs (아이디어설명서 「가족 안전 지도」 20m·50m·100m 단계) */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_STEPS, ALERT_CHOICES, ALERT_DEFAULT, ALERT_HYST,
  stepAt, stepOf, alertable, normalizeFrom,
} from '../../js/family-alert.mjs';

test('단계 정의 — 20m·50m·100m 3단계, 레벨·아이콘·진동 패턴 완비', () => {
  assert.deepEqual(ALERT_STEPS.map((s) => s.m), [20, 50, 100]);
  assert.deepEqual(ALERT_STEPS.map((s) => s.level), [1, 2, 3]);
  for (const s of ALERT_STEPS) {
    assert.ok(s.icon && s.name, `${s.m}m 단계에 아이콘·이름`);
    assert.ok(Array.isArray(s.vib) && s.vib.length, `${s.m}m 단계에 진동 패턴`);
  }
  assert.deepEqual(ALERT_CHOICES, [0, 20, 50, 100]);
  assert.ok(ALERT_CHOICES.includes(ALERT_DEFAULT));
});

test('stepOf — 멀어질 때는 기준 거리 그대로 올라간다', () => {
  assert.equal(stepOf(0, 0), 0);
  assert.equal(stepOf(19, 0), 0);
  assert.equal(stepOf(20, 0), 1);  // 경계 포함
  assert.equal(stepOf(49, 0), 1);
  assert.equal(stepOf(50, 0), 2);
  assert.equal(stepOf(99, 0), 2);
  assert.equal(stepOf(100, 0), 3);
  assert.equal(stepOf(500, 0), 3); // 상한 없음 — 최고 단계 유지
});

test('히스테리시스 — 경계에서 알림이 깜빡이지 않게 80% 안쪽에서만 풀린다', () => {
  // 50m(2단계)에 있던 상태: 41m는 아직 2단계, 39m에서야 1단계로 내려온다
  assert.equal(stepOf(45, 2), 2);
  assert.equal(stepOf(50 * ALERT_HYST, 2), 2);
  assert.equal(stepOf(39, 2), 1);
  // 100m(3단계)에 있던 상태: 85m는 아직 3단계
  assert.equal(stepOf(85, 3), 3);
  assert.equal(stepOf(79, 3), 2);
  // 1단계에서 완전 해제는 16m 미만
  assert.equal(stepOf(17, 1), 1);
  assert.equal(stepOf(15, 1), 0);
});

test('alertable — 설정한 시작 거리 미만 단계는 알리지 않는다', () => {
  // 시작 100m: 20m·50m 단계는 조용, 100m 단계만 알림
  assert.equal(alertable(1, 100), false);
  assert.equal(alertable(2, 100), false);
  assert.equal(alertable(3, 100), true);
  // 시작 50m
  assert.equal(alertable(1, 50), false);
  assert.equal(alertable(2, 50), true);
  assert.equal(alertable(3, 50), true);
  // 시작 20m — 전 단계 알림
  assert.equal(alertable(1, 20), true);
  assert.equal(alertable(3, 20), true);
});

test('alertable — 끔(0)이면 어떤 단계도 알리지 않는다', () => {
  for (const lv of [0, 1, 2, 3]) assert.equal(alertable(lv, 0), false);
});

test('alertable — 단계 0(안전 거리 안)은 언제나 알림 없음', () => {
  for (const from of ALERT_CHOICES) assert.equal(alertable(0, from), false);
});

test('normalizeFrom — 저장값 정규화, 손상·구버전 값은 기본값으로', () => {
  assert.equal(normalizeFrom('20'), 20);
  assert.equal(normalizeFrom('0'), 0);      // 끔은 유효한 설정
  assert.equal(normalizeFrom(100), 100);
  assert.equal(normalizeFrom(null), ALERT_DEFAULT);      // 미설정 — Number(null)=0(끔)으로 새면 안 됨
  assert.equal(normalizeFrom(undefined), ALERT_DEFAULT);
  assert.equal(normalizeFrom(''), ALERT_DEFAULT);
  assert.equal(normalizeFrom('abc'), ALERT_DEFAULT);
  assert.equal(normalizeFrom('30'), ALERT_DEFAULT); // 선택지에 없는 값
});

test('stepAt — 레벨로 단계를 찾는다', () => {
  assert.equal(stepAt(1).m, 20);
  assert.equal(stepAt(3).m, 100);
  assert.equal(stepAt(0), undefined);
});
