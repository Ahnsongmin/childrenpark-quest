/* three.js 씬: 조명·안개·건물·나무·물·산책 경로 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pathToPoints } from './geo.js';
import { buildGround } from './ground.js';

/* global MAP — mapdata.js 전역 */

const ROOFS = ['#f9b8a2', '#a9d6c9', '#f5d78e', '#b8c8f0', '#f2b8d4'];
const WALL = '#fff4e0';

function buildBuildings() {
  const geos = [];
  const wall = new THREE.Color(WALL);
  MAP.buildings.forEach((d, i) => {
    let pts = pathToPoints(d);
    if (pts.length < 3) return;
    // Shape는 XY 평면 → (x, -y)로 넣고 rotateX(-90°) 하면 바닥이 (x, z=y)로 놓임
    const v2 = pts.map(([x, y]) => new THREE.Vector2(x, -y));
    if (THREE.ShapeUtils.area(v2) < 0) v2.reverse();
    const shape = new THREE.Shape(v2);
    const h = 9 + ((i * 2654435761 >>> 0) % 1000) / 1000 * 9; // 9~18 unit, id별 고정
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    // 그룹 0 = 지붕·바닥 캡, 그룹 1 = 벽 → 정점색으로 지붕만 파스텔
    const roof = new THREE.Color(ROOFS[i % ROOFS.length]);
    const n = geo.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (const grp of geo.groups) {
      const c = grp.materialIndex === 0 ? roof : wall;
      for (let k = grp.start; k < grp.start + grp.count; k++) {
        colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.clearGroups();
    geos.push(geo);
  });
  const merged = mergeGeometries(geos);
  const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
  geos.forEach((g) => g.dispose());
  return mesh;
}

function buildTrees() {
  const g = new THREE.Group();
  const n = MAP.trees.length;
  const trunkGeo = new THREE.CylinderGeometry(0.9, 1.4, 1, 6);
  trunkGeo.translate(0, 0.5, 0); // 바닥 기준으로 세우기
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#8a6242' }), n);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const greens = ['#5fae52', '#6fbc5e', '#4f9e48'].map((c) => new THREE.Color(c));
  MAP.trees.forEach(([x, y, s], i) => {
    const trunkH = s * 0.22, leafR = s * 0.23;
    m.compose(new THREE.Vector3(x, 0, y), q, new THREE.Vector3(1, trunkH, 1));
    trunks.setMatrixAt(i, m);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 2.4) % Math.PI); // 잎 방향만 다양하게
    m.compose(new THREE.Vector3(x, trunkH + leafR * 0.55, y), q, new THREE.Vector3(leafR, leafR, leafR));
    leaves.setMatrixAt(i, m);
    q.identity();
    leaves.setColorAt(i, greens[i % 3]);
  });
  g.add(trunks, leaves);
  return g;
}

function buildWater() {
  const geos = [];
  for (const d of MAP.water) {
    const pts = pathToPoints(d);
    if (pts.length < 3) continue;
    const v2 = pts.map(([x, y]) => new THREE.Vector2(x, -y));
    if (THREE.ShapeUtils.area(v2) < 0) v2.reverse();
    const geo = new THREE.ShapeGeometry(new THREE.Shape(v2));
    geo.rotateX(-Math.PI / 2);
    geos.push(geo);
  }
  const mesh = new THREE.Mesh(
    mergeGeometries(geos),
    new THREE.MeshLambertMaterial({ color: '#8ecdec', transparent: true, opacity: 0.92 }),
  );
  mesh.position.y = 0.4;
  geos.forEach((g) => g.dispose());
  return mesh;
}

export function buildWorld(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe8f5');
  scene.fog = new THREE.Fog('#cfe8f5', 900, 2600);

  scene.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.15));
  const sun = new THREE.DirectionalLight('#fff6e0', 1.6);
  sun.position.set(400, 700, 100);
  scene.add(sun);

  scene.add(buildGround(renderer));
  scene.add(buildBuildings());
  scene.add(buildTrees());
  scene.add(buildWater());

  // 산책 경로 점선 (산책 중에만 표시)
  const routePts = MAP.walkRoute.map(([x, y]) => new THREE.Vector3(x, 0.7, y));
  const routeGeo = new THREE.BufferGeometry().setFromPoints(routePts);
  const routeLine = new THREE.Line(routeGeo, new THREE.LineDashedMaterial({
    color: '#f5a623', dashSize: 5, gapSize: 9, transparent: true, opacity: 0.9,
  }));
  routeLine.computeLineDistances();
  routeLine.visible = false;
  scene.add(routeLine);

  return { scene, routeLine };
}
