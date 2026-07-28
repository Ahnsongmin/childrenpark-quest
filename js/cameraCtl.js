/* 카메라: 북쪽 고정 55° 틸트 내려다보기 + 터치 팬/핀치줌 (2D 버전 pointer 로직 이식) */
import * as THREE from 'three';
import { VIEW_W, VIEW_H } from './geo.js';

const ELEV = 63 * Math.PI / 180; // 지면 기준 올려본 각 (가파를수록 건물·나무 가림 감소)
const DMIN = 90, DMAX = 780;

export function createCameraCtl(camera, dom) {
  const target = new THREE.Vector3(VIEW_W / 2, 0, VIEW_H / 2);
  let dist = 560;
  const raycaster = new THREE.Raycaster();
  const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();

  const ctl = {
    target,
    get dist() { return dist; },
    set dist(v) { dist = Math.max(DMIN, Math.min(DMAX, v)); },
    panLocked: false,       // 산책 중 카메라 고정
    onTap: null,            // (clientX, clientY) — 탭(이동량<8px) 시 호출
    apply() {
      target.x = Math.max(-60, Math.min(VIEW_W + 60, target.x));
      target.z = Math.max(-60, Math.min(VIEW_H + 60, target.z));
      camera.position.set(
        target.x,
        target.y + dist * Math.sin(ELEV),
        target.z + dist * Math.cos(ELEV),
      );
      camera.lookAt(target);
    },
    groundPoint(clientX, clientY, out = new THREE.Vector3()) {
      const r = dom.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(planeY0, out) ? out : null;
    },
    raycastSprites(clientX, clientY, sprites) {
      const r = dom.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(sprites, false);
      return hits.length ? hits[0].object : null;
    },
  };

  const pointers = new Map();
  let lastDist = 0, moved = 0;
  const prevPt = new THREE.Vector3(), curPt = new THREE.Vector3();

  dom.addEventListener('pointerdown', (e) => {
    try { dom.setPointerCapture(e.pointerId); } catch (_) { /* 합성 이벤트 등 캡처 불가 시 무시 */ }
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) moved = 0; // 새 제스처 시작
    else moved += 10;                   // 두 손가락이면 탭 아님
  });
  dom.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (ctl.panLocked) { moved += 10; return; }
    if (pointers.size === 1) {
      moved += Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]);
      if (ctl.groundPoint(prev[0], prev[1], prevPt) && ctl.groundPoint(e.clientX, e.clientY, curPt)) {
        target.x += prevPt.x - curPt.x;
        target.z += prevPt.z - curPt.z;
        ctl.apply();
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (lastDist > 0) { ctl.dist = dist * lastDist / d; ctl.apply(); }
      lastDist = d;
      moved += 10;
    }
  });
  const endPointer = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) lastDist = 0;
    if (pointers.size === 0 && moved < 8 && ctl.onTap) ctl.onTap(e.clientX, e.clientY);
  };
  dom.addEventListener('pointerup', endPointer);
  dom.addEventListener('pointercancel', endPointer);
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    ctl.dist = dist * (e.deltaY < 0 ? 0.87 : 1.15);
    ctl.apply();
  }, { passive: false });

  ctl.apply();
  return ctl;
}
