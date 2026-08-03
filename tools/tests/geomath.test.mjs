/* 좌표 계산·필터·스무딩 단위 테스트 — 실행: node --test tools/tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCATION_CONFIG, latLonDistM, bearingRad, speedMps, animStateFor, smoothPos, acceptFix,
} from '../../js/geomath.mjs';

test('latLonDistM — 어린이대공원 위도에서 알려진 거리', () => {
  // 위도 1도 ≈ 111.19km
  const dLat = latLonDistM(37.549, 127.08, 38.549, 127.08);
  assert.ok(Math.abs(dLat - 111190) < 300, `lat degree = ${dLat}`);
  // 경도 1도 ≈ 111.19km × cos(37.549°) ≈ 88.15km (평면 근사 111km와 달라야 함)
  const dLon = latLonDistM(37.549, 127.08, 37.549, 128.08);
  assert.ok(Math.abs(dLon - 88150) < 300, `lon degree = ${dLon}`);
  // 같은 점 = 0
  assert.equal(latLonDistM(37.549, 127.08, 37.549, 127.08), 0);
  // 공원 규모(대각 ~1.5km) 정합
  const diag = latLonDistM(37.54524, 127.07462, 37.55265, 127.08941);
  assert.ok(diag > 1400 && diag < 1700, `park diagonal = ${diag}`);
});

test('bearingRad — 월드 좌표 이동 방향', () => {
  assert.equal(bearingRad(0, 1), 0);                    // +Z(남/화면 아래) 정면
  assert.equal(bearingRad(1, 0), Math.PI / 2);          // +X(동)
  assert.equal(bearingRad(-1, 0), -Math.PI / 2);        // -X(서)
  assert.ok(Math.abs(Math.abs(bearingRad(0, -1)) - Math.PI) < 1e-9); // -Z(북)
});

test('speedMps·animStateFor — 속도 → 애니메이션 상태', () => {
  assert.equal(speedMps(10, 5), 2);
  assert.equal(speedMps(10, 0), 0); // dt=0 방어
  assert.equal(animStateFor(0.1), 'idle');
  assert.equal(animStateFor(1.2), 'walk');
  assert.equal(animStateFor(3.0), 'run');
  assert.equal(animStateFor(LOCATION_CONFIG.walkThresholdMps), 'walk'); // 경계값 포함
  assert.equal(animStateFor(LOCATION_CONFIG.runThresholdMps), 'run');
});

test('smoothPos — 첫 좌표는 즉시, 이후 exponential 수렴', () => {
  assert.deepEqual(smoothPos(null, [10, 20], 0.25), [10, 20]);
  assert.deepEqual(smoothPos([0, 0], [100, 0], 0.25), [25, 0]);
  // 반복 적용 시 목표로 수렴
  let p = [0, 0];
  for (let i = 0; i < 40; i++) p = smoothPos(p, [100, 50], 0.25);
  assert.ok(Math.abs(p[0] - 100) < 1 && Math.abs(p[1] - 50) < 1, `converged to ${p}`);
});

test('acceptFix — 정확도 필터', () => {
  const at = (accM) => acceptFix(null, { lat: 37.549, lon: 127.08, accM, t: 0 });
  assert.deepEqual(at(20), { ok: true, reason: null, lowAccuracy: false });
  assert.deepEqual(at(60), { ok: true, reason: null, lowAccuracy: true });   // 50~100m: 반영하되 낮은 정확도 표시
  assert.equal(at(120).ok, false);
  assert.equal(at(120).reason, 'accuracy');                                  // 100m 초과: 보류
});

test('acceptFix — 비정상 순간이동(4.5m/s 초과) 폐기', () => {
  const prev = { lat: 37.549, lon: 127.08, accM: 10, t: 0 };
  // 10초에 ~30m (3m/s) = 정상 보행
  const walk = acceptFix(prev, { lat: 37.54927, lon: 127.08, accM: 10, t: 10000 });
  assert.equal(walk.ok, true);
  // 10초에 ~111m (11m/s) = 점프
  const jump = acceptFix(prev, { lat: 37.55, lon: 127.08, accM: 10, t: 10000 });
  assert.deepEqual([jump.ok, jump.reason], [false, 'jump']);
  // 첫 좌표(prev 없음)는 속도 필터 미적용
  assert.equal(acceptFix(null, { lat: 37.55, lon: 127.08, accM: 10, t: 10000 }).ok, true);
});
