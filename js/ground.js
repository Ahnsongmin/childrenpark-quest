/* 지면: 2D SVG 지도 레이어를 캔버스에 구워 텍스처 2장(공원 고해상 + 주변 저해상)으로 사용 */
import * as THREE from 'three';

/* global MAP */

/* 2D 버전의 SVG 조립 순서·색을 캔버스에 그대로 재현 (건물·물·나무는 3D 메시라 제외)
   리캡 스토리의 동선 미니 지도에서도 재사용(export) */
export function paintMap(ctx) {
  const fill = (d, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(new Path2D(d));
    ctx.globalAlpha = 1;
  };
  const stroke = (d, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(d));
  };
  for (const d of MAP.roadsMinor) stroke(d, '#d3cfc5', 9);
  for (const d of MAP.roadsMinor) stroke(d, '#f7f5f0', 6);
  for (const d of MAP.roadsMajor) stroke(d, '#e8c98a', 16);
  for (const d of MAP.roadsMajor) stroke(d, '#fbe7b8', 11);
  fill(MAP.boundary, '#d9ecbc');
  stroke(MAP.boundary, '#8fbc74', 8);
  for (const d of MAP.lawns) fill(d, '#c8e6a6', 0.9);
  for (const d of MAP.woods) fill(d, '#a9d68b', 0.95);
  for (const d of MAP.pitches) { fill(d, '#9fd6b4'); stroke(d, '#7fbf9a', 2); }
  for (const d of MAP.parkings) { fill(d, '#e3e0d5'); stroke(d, '#cfcabb', 1.5); }
  for (const d of MAP.themepark) { fill(d, '#ffd9e8', 0.75); stroke(d, '#f2a9c8', 3); }
  for (const d of MAP.zooAreas) { fill(d, '#f5deb8', 0.85); stroke(d, '#dcbe8a', 2); }
  for (const d of MAP.playgrounds) { fill(d, '#ffe9b8'); stroke(d, '#eccf8e', 2); }
  for (const d of MAP.paths) stroke(d, '#c9bfa0', 7);
  for (const d of MAP.paths) stroke(d, '#fdf6e3', 4.5);
}

/* svg 좌표영역 [x0,y0,x1,y1]을 pxW 폭 캔버스에 굽기 */
function bake(region, pxW) {
  const [x0, y0, x1, y1] = region;
  const w = x1 - x0, h = y1 - y0;
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = Math.round(pxW * h / w);
  const ctx = canvas.getContext('2d');
  const s = pxW / w;
  ctx.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
  ctx.fillStyle = '#e3e0d8'; // 도시 배경
  ctx.fillRect(x0 - 10, y0 - 10, w + 20, h + 20);
  paintMap(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildGround(renderer) {
  const g = new THREE.Group();
  const maxTex = renderer.capabilities.maxTextureSize;

  // 주변(도시): 공원 중심 기준 넉넉한 정사각 영역, 저해상
  const cx = MAP.VIEW_W / 2, cy = MAP.VIEW_H / 2, HALF = 2600;
  const outerRegion = [cx - HALF, cy - HALF, cx + HALF, cy + HALF];
  const outerTex = bake(outerRegion, 1024);
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2),
    new THREE.MeshBasicMaterial({ map: outerTex }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(cx, -0.5, cy);
  g.add(outer);

  // 공원: 고해상 (텍스처 지원 한도 내 4096)
  const parkPx = Math.min(4096, maxTex);
  const parkTex = bake([0, 0, MAP.VIEW_W, MAP.VIEW_H], parkPx);
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP.VIEW_W, MAP.VIEW_H),
    new THREE.MeshBasicMaterial({ map: parkTex }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(cx, 0, cy);
  g.add(park);

  return g;
}
