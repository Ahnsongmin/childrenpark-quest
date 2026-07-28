/* 좌표 변환·경계 판정 — 2D 버전에서 그대로 이식 (mapdata.js 전역 MAP 사용)
   3D 좌표계: worldX = svg x, worldZ = svg y, Y = 위. 1 unit ≈ 0.83m */
/* global MAP */

export const prj = (lat, lon) => [
  (lon - MAP.LON_MIN) / (MAP.LON_MAX - MAP.LON_MIN) * MAP.VIEW_W,
  (MAP.LAT_MAX - lat) / (MAP.LAT_MAX - MAP.LAT_MIN) * MAP.VIEW_H,
];
export const M2U = MAP.VIEW_W / 1300;
export const VIEW_W = MAP.VIEW_W;
export const VIEW_H = MAP.VIEW_H;

export function inPark(x, y, bufferM = 80) {
  const b = bufferM * M2U;
  if (x < -b || y < -b || x > MAP.VIEW_W + b || y > MAP.VIEW_H + b) return false;
  const pts = MAP.boundaryPts;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  if (inside) return true;
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    const px = x1 + t * dx - x, py = y1 + t * dy - y;
    min = Math.min(min, px * px + py * py);
  }
  return Math.sqrt(min) <= b;
}

/* gen_mapdata.py가 만드는 path는 "M x y L x y ... Z" 형식뿐 — 숫자만 뽑으면 좌표열 */
export function pathToPoints(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}
