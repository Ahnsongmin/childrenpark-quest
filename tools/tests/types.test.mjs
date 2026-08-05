/* 16유형 판정·캐릭터 데이터 무결성 테스트 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TYPE_THRESHOLDS, isTrackReliable, classifyMovementFromTrack, classifyMovementFromActivity,
  classifyMission, avgStaySec, movementIdOf,
} from '../../js/geomath.mjs';
import {
  MOVEMENT_TYPES, MISSION_TYPES, COMBO_COLORS, ALL_COMBOS, ALL_CHARACTERS,
  getCombo, getCharacter, parseComboId, comboId, missionIdOfTypeId, LEGACY_TYPE_MAP, tint, shade,
  BASE_CHARACTERS, basesFor, getBase, baseImagePath,
} from '../../js/explorer-types.mjs';

const track = (distM, stayEach, n = 3) => ({
  distM,
  staySec: Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${i}`, stayEach])),
  activeSec: 3600,
  pts: Array.from({ length: 50 }, () => [0, 0, 0]),
});

test('이동축 4분면 — 거리×체류 임계값', () => {
  assert.equal(classifyMovementFromTrack(track(2500, 600)), 'explorer'); // 김/김 → 탐험왕
  assert.equal(classifyMovementFromTrack(track(2500, 200)), 'curious');  // 김/짧음 → 호기심왕
  assert.equal(classifyMovementFromTrack(track(800, 600)), 'focus');     // 짧음/김 → 집중왕
  assert.equal(classifyMovementFromTrack(track(800, 200)), 'speed');     // 짧음/짧음 → 스피드왕
  // 경계값 포함 확인
  assert.equal(classifyMovementFromTrack(track(TYPE_THRESHOLDS.DIST_LONG_M, TYPE_THRESHOLDS.STAY_AVG_LONG_SEC)), 'explorer');
});

test('트랙 신뢰 조건 — 10분·10점 미만이면 폴백 대상', () => {
  assert.equal(isTrackReliable(track(1000, 300)), true);
  assert.equal(isTrackReliable({ ...track(1000, 300), activeSec: 300 }), false);
  assert.equal(isTrackReliable({ ...track(1000, 300), pts: [[0, 0, 0]] }), false);
  assert.equal(isTrackReliable(null), false);
});

test('이동축 폴백 — 활동 스팟 수·스팟당 활동 수', () => {
  assert.equal(classifyMovementFromActivity({ spotCount: 5, actCount: 12 }), 'explorer'); // 4곳+ & 2개/곳+
  assert.equal(classifyMovementFromActivity({ spotCount: 4, actCount: 4 }), 'curious');
  assert.equal(classifyMovementFromActivity({ spotCount: 2, actCount: 6 }), 'focus');
  assert.equal(classifyMovementFromActivity({ spotCount: 1, actCount: 1 }), 'speed');
  assert.equal(classifyMovementFromActivity({ spotCount: 0, actCount: 0 }), 'speed'); // 활동 0 (호출측에서 fallback 처리)
});

test('탐험축 — 종류별 카운트와 가중치·동점 규칙', () => {
  assert.equal(classifyMission({ observe: 3, quiz: 1 }), 'detective');
  assert.equal(classifyMission({ quiz: 4, observe: 1 }), 'fairy');
  assert.equal(classifyMission({ dwell: 2, quiz: 1 }), 'boss');
  assert.equal(classifyMission({ discovery: 2, dwell: 1 }), 'guide');
  assert.equal(classifyMission({ note: 2 }), 'detective');          // note → 관찰 0.5
  assert.equal(classifyMission({ photo: 2, note: 1 }), 'guide');    // photo → 발견 0.5
  assert.equal(classifyMission({ quiz: 1, dwell: 1 }), 'fairy');    // 동점: detective→fairy→boss→guide 순
  assert.equal(classifyMission({}), 'detective');                   // 활동 0 기본값
});

test('avgStaySec·movementIdOf 유틸', () => {
  assert.equal(avgStaySec({ a: 100, b: 300 }), 200);
  assert.equal(avgStaySec({}), 0);
  assert.equal(avgStaySec(null), 0);
  assert.equal(movementIdOf(true, true), 'explorer');
  assert.equal(movementIdOf(false, false), 'speed');
});

test('16조합 — 색·번호·이름 무결성', () => {
  assert.equal(ALL_COMBOS.length, 16);
  assert.equal(new Set(ALL_COMBOS.map((c) => c.primaryColor)).size, 16); // 16색 전부 상이
  assert.equal(new Set(ALL_COMBOS.map((c) => c.typeNumber)).size, 16);
  const first = getCombo('explorer', 'detective');
  assert.equal(first.typeNumber, 1);
  assert.equal(first.koreanName, '탐험왕 꼬마탐정');
  assert.equal(first.primaryColor, '#2563EB');
  assert.equal(first.animal, '수달');
  assert.equal(getCombo('speed', 'guide').typeNumber, 16);
  assert.equal(getCombo('speed', 'guide').primaryColor, '#8B5CF6');
  assert.equal(getCombo('speed', 'boss').primaryColor, '#F29B76'); // 피치
  for (const c of ALL_COMBOS) {
    assert.ok(c.description.length >= 10, `${c.id} description`);
    assert.equal(c.personalityKeywords.length, 3, `${c.id} keywords`);
    assert.ok(c.props.length >= 2, `${c.id} props`);
    assert.match(c.secondaryColor, /^#[0-9a-f]{6}$/i);
  }
});

test('32캐릭터 — id 유일·성별 쌍·필드 완전성', () => {
  assert.equal(ALL_CHARACTERS.length, 32);
  assert.equal(new Set(ALL_CHARACTERS.map((c) => c.id)).size, 32);
  const boy = getCharacter('explorer', 'detective', 'm');
  const girl = getCharacter('explorer', 'detective', 'f');
  assert.equal(boy.id, 'explorer-detective-boy');
  assert.equal(girl.id, 'explorer-detective-girl');
  assert.equal(boy.primaryColor, girl.primaryColor);       // 성별 간 색 동일
  assert.equal(boy.description, girl.description);         // 성격·능력 차이 없음
  for (const ch of ALL_CHARACTERS) {
    assert.ok(ch.imagePath.startsWith('img/characters/') && ch.imagePath.endsWith('.webp'), ch.id);
    assert.ok(ch.imagePrompt.includes(ch.primaryColor), `${ch.id} prompt color`);
    assert.ok(ch.imagePrompt.includes(ch.gender === 'f' ? 'girl child explorer' : 'boy child explorer'), `${ch.id} prompt gender`);
    assert.ok(['boy', 'girl'].some((g) => ch.id.endsWith(g)));
    assert.ok(ch.koreanName && ch.movementTitle && ch.missionTitle && ch.missionCategory);
  }
  assert.equal(getCharacter('explorer', 'detective', 'x'), null);
});

test('comboId 파싱·레거시 매핑', () => {
  assert.equal(comboId('focus', 'boss'), 'focus-boss');
  assert.equal(parseComboId('focus-boss').movement.title, '집중왕');
  assert.equal(parseComboId('observer'), null);        // 구 5종 id는 combo 아님 → no-op 경로
  assert.equal(parseComboId('legacy-fairy'), null);
  assert.equal(parseComboId(null), null);
  assert.equal(missionIdOfTypeId('explorer-detective'), 'detective');
  assert.equal(missionIdOfTypeId('legacy-guide'), 'guide'); // 마이그레이션된 과거 기록도 레벨에 기여
  assert.equal(missionIdOfTypeId('observer'), null);
  for (const [oldId, missionId] of Object.entries(LEGACY_TYPE_MAP)) {
    assert.ok(MISSION_TYPES.some((m) => m.id === missionId), `${oldId}→${missionId}`);
  }
});

test('tint·shade — 유효한 hex 파생', () => {
  assert.match(tint('#2563EB'), /^#[0-9a-f]{6}$/i);
  assert.match(shade('#2563EB'), /^#[0-9a-f]{6}$/i);
  assert.equal(tint('#000000', 1), '#ffffff');
  assert.equal(shade('#ffffff', 1), '#000000');
});

test('데이터 축 정합 — MOVEMENT/MISSION 정의', () => {
  assert.deepEqual(MOVEMENT_TYPES.map((m) => m.id), ['explorer', 'curious', 'focus', 'speed']);
  assert.deepEqual(MISSION_TYPES.map((m) => m.id), ['detective', 'fairy', 'boss', 'guide']);
  assert.deepEqual(MISSION_TYPES.map((m) => m.missionCategory), ['observe', 'quiz', 'dwell', 'discovery']);
  assert.equal(Object.keys(COMBO_COLORS).length, 16);
});

test('기본 캐릭터 4종 — 성별당 2종·id·이미지 경로', () => {
  assert.equal(BASE_CHARACTERS.length, 4);
  for (const g of ['f', 'm']) {
    const list = basesFor(g);
    assert.equal(list.length, 2, `${g} 기본 캐릭터 2종`);
    assert.deepEqual(list.map((b) => b.slot).sort(), [1, 2]);
    for (const b of list) {
      assert.equal(b.gender, g);
      assert.ok(b.name && b.desc && b.emoji, b.id);
      assert.match(b.color, /^#[0-9A-Fa-f]{6}$/);
    }
  }
  assert.equal(new Set(BASE_CHARACTERS.map((b) => b.id)).size, 4);
  assert.equal(baseImagePath('f', 1), 'img/characters/base-girl-1.webp');
  assert.equal(baseImagePath('m', 2), 'img/characters/base-boy-2.webp');
  // 잘못된 값은 그 성별의 1번으로 폴백
  assert.equal(getBase('f', 99).slot, 1);
  assert.equal(getBase('x', 2).gender, 'm');
});
