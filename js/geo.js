/* 좌표 변환·경계 판정 — 2D 버전에서 그대로 이식 (mapdata.js 전역 MAP 사용)
   3D 좌표계: worldX = svg x, worldZ = svg y, Y = 위. 1 unit ≈ 0.83m */
/* global MAP */
import { inBoundary } from './geomath.mjs';

export const prj = (lat, lon) => [
  (lon - MAP.LON_MIN) / (MAP.LON_MAX - MAP.LON_MIN) * MAP.VIEW_W,
  (MAP.LAT_MAX - lat) / (MAP.LAT_MAX - MAP.LAT_MIN) * MAP.VIEW_H,
];
export const M2U = MAP.VIEW_W / 1300;
export const VIEW_W = MAP.VIEW_W;
export const VIEW_H = MAP.VIEW_H;

/* 경계 판정 — 계산부는 geomath.inBoundary(단위 테스트 대상), 여기는 MAP 바인딩만 */
export function inPark(x, y, bufferM = 80) {
  return inBoundary(MAP.boundaryPts, MAP.VIEW_W, MAP.VIEW_H, x, y, bufferM * M2U);
}

/* gen_mapdata.py가 만드는 path는 "M x y L x y ... Z" 형식뿐 — 숫자만 뽑으면 좌표열 */
export function pathToPoints(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}
