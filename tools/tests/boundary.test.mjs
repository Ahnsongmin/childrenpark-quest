/* 공원 경계·스팟 히스테리시스 테스트 (합성 폴리곤 — mapdata.js는 전역 스크립트라 여기선 미사용) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon, distToPolylineU, inBoundary, spotTransition } from '../../js/geomath.mjs';

/* 100×100 정사각 폴리곤 (닫힌 좌표열) */
const SQ = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]];

test('pointInPolygon — 내부/외부/모서리 근처', () => {
  assert.equal(pointInPolygon(SQ, 50, 50), true);
  assert.equal(pointInPolygon(SQ, -10, 50), false);
  assert.equal(pointInPolygon(SQ, 50, 150), false);
  assert.equal(pointInPolygon(SQ, 1, 1), true);
});

test('distToPolylineU — 경계선까지 최단거리', () => {
  assert.equal(distToPolylineU(SQ, 50, -30), 30); // 위쪽 변에서 30
  assert.equal(distToPolylineU(SQ, 120, 50), 20); // 오른쪽 변에서 20
  const corner = distToPolylineU(SQ, 110, 110);   // 꼭짓점 대각 → √200
  assert.ok(Math.abs(corner - Math.hypot(10, 10)) < 1e-9);
});

test('inBoundary — 내부 true, 버퍼 안 true, 버퍼 밖 false', () => {
  assert.equal(inBoundary(SQ, 100, 100, 50, 50, 0), true);
  assert.equal(inBoundary(SQ, 100, 100, 110, 50, 20), true);   // 경계 밖 10, 버퍼 20
  assert.equal(inBoundary(SQ, 100, 100, 130, 50, 20), false);  // 경계 밖 30, 버퍼 20
  assert.equal(inBoundary(SQ, 100, 100, 500, 500, 20), false); // bbox 밖 조기 탈락
});

test('spotTransition — 입장 20 이내, 퇴장 30 밖 히스테리시스', () => {
  const spots = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 100, z: 0 }];
  const ENTER = 20, EXIT = 30;
  // 진입: 19 거리 → a
  assert.equal(spotTransition(null, 19, 0, spots, ENTER, EXIT), 'a');
  // 입장 반경 밖(21)이지만 아직 퇴장 반경 안(≤30) → 유지
  assert.equal(spotTransition('a', 25, 0, spots, ENTER, EXIT), 'a');
  // 퇴장 반경 밖(31) → 해제
  assert.equal(spotTransition('a', 31, 0, spots, ENTER, EXIT), null);
  // 근접 스팟이 없던 상태에서 21 거리는 입장 아님
  assert.equal(spotTransition(null, 21, 0, spots, ENTER, EXIT), null);
  // a에서 벗어나 b로 직접 진입
  assert.equal(spotTransition('a', 95, 0, spots, ENTER, EXIT), 'b');
  // 존재하지 않는 currentId(스팟 목록 변경 등)는 재판정
  assert.equal(spotTransition('ghost', 5, 0, spots, ENTER, EXIT), 'a');
});
