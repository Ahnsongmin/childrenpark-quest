/* 마을 안 디오라마 — 동물 구역에 들어가면 펼쳐지는 내부 지도
   배치 근거: 서울시설공단 동물원 관람안내(동물사별 표) + OSM 건물 실측 배치(2026-07-30).
   화면 위(-z)가 실제 북쪽. 예: 맹수마을은 코끼리사가 북쪽 끝, 맹수사가 동쪽 열을 따라
   남쪽으로 이어지는 실제 배치를 따름. 미공개 세부 위치는 구역 내 근사 배치. */
import * as THREE from 'three';
import { ANIMALS } from './quests-data.js';

const ELEV = 57 * Math.PI / 180, DIST = 175;

/* 존별 분위기: 바닥·펜 바닥·장식 */
const ZONE_STYLE = {
  predator:      { ground: '#d8d2ac', pen: '#e3d0a4', rocks: true, trees: 1 },
  herbivore:     { ground: '#cde6a8', pen: '#dcecc0', trees: 3 },
  minivillage:   { ground: '#d8e6b0', pen: '#e6dcc0', trees: 2, rocks: true },
  tropical:      { ground: '#c4ddba', pen: '#d6ecd0', trees: 4 },
  sea:           { ground: '#cfe0e8', pen: '#a5d8ef', water: true },
  monkeyvillage: { ground: '#d5e2ac', pen: '#dcd2b4', trees: 3 },
  birdcage:      { ground: '#d6e8dc', pen: '#bfe0ea', water: true, trees: 2 },
};

/* 구역별 마당 크기 + 동물별 펜(중심 x,z / 폭 w / 깊이 d) — 실제 동물사 배치 기반 */
const DEFAULT_PEN = { w: 34, d: 26 };
const ZONE_LAYOUTS = {
  predator: { // 북쪽 코끼리사(+곰사·하이에나사), 동쪽 열을 따라 맹수사, 서쪽에 소맹수사
    area: { W: 140, D: 260 },
    pens: {
      elephant: { x: 24, z: -100, w: 58, d: 38 },
      bear:     { x: -38, z: -100, w: 36, d: 32 },
      hyena:    { x: 38, z: -60 },
      lion:     { x: 38, z: -26 },
      tiger:    { x: 38, z: 6 },
      jaguar:   { x: 38, z: 38 },
      puma:     { x: 38, z: 70 },
      jackal:   { x: -38, z: -26, w: 30 },
      lynx:     { x: -38, z: 6, w: 30 },
      fox:      { x: -38, z: 38, w: 30 },
    },
  },
  herbivore: { // 북쪽 큰 방사장(얼룩말·캥거루), 남쪽 작은 목장(알파카·과나코·당나귀·미니말)
    area: { W: 130, D: 220 },
    pens: {
      zebra:     { x: -33, z: -70, w: 44, d: 34 },
      kangaroo:  { x: 33, z: -70, w: 44, d: 34 },
      alpaca:    { x: -33, z: -22 },
      guanaco:   { x: 33, z: -22 },
      donkey:    { x: -33, z: 26 },
      minihorse: { x: 33, z: 26 },
    },
  },
  minivillage: { // 수달사(물웅덩이) 동쪽 열, 미어캣·포큐파인 서쪽 열, 토끼 마당 남동쪽
    area: { W: 120, D: 200 },
    pens: {
      meerkat:   { x: -32, z: -66 },
      otter:     { x: 32, z: -66 },
      euotter:   { x: 32, z: -26 },
      porcupine: { x: -32, z: -26 },
      rabbit:    { x: 32, z: 14, w: 30, d: 24 },
    },
  },
  tropical: { // 실내관: 서쪽 벽 작은 포유류, 동쪽 벽 파충류 테라리움, 북쪽 끝 대형 게코
    area: { W: 130, D: 260 },
    pens: {
      leachianus:     { x: 0, z: -110, w: 30, d: 22 },
      squirrelmonkey: { x: -36, z: -80, w: 28, d: 22 },
      marmoset:       { x: -36, z: -48, w: 28, d: 22 },
      lemur:          { x: -36, z: -16, w: 28, d: 22 },
      hyrax:          { x: -36, z: 16, w: 28, d: 22 },
      molerat:        { x: -36, z: 48, w: 28, d: 22 },
      treeporc:       { x: -36, z: 80, w: 28, d: 22 },
      beardie:        { x: 36, z: -80, w: 28, d: 22 },
      python:         { x: 36, z: -48, w: 28, d: 22 },
      cornsnake:      { x: 36, z: -16, w: 28, d: 22 },
      bluetongue:     { x: 36, z: 16, w: 28, d: 22 },
      tortoise:       { x: 36, z: 48, w: 28, d: 22 },
      pancake:        { x: 36, z: 80, w: 28, d: 22 },
    },
  },
  sea: { // 1층 대형 관람창 앞 두 수조 — 물개 풀이 더 큼
    area: { W: 120, D: 170 },
    pens: {
      furseal: { x: -28, z: -48, w: 48, d: 36 },
      seal:    { x: 30, z: -48, w: 42, d: 36 },
    },
  },
  monkeyvillage: { // 관람로 양쪽 케이지 열 — 기번류는 북쪽 높은 케이지
    area: { W: 125, D: 220 },
    pens: {
      ygibbon: { x: -33, z: -74 },
      sgibbon: { x: 33, z: -74 },
      macaque: { x: -33, z: -32 },
      baboon:  { x: 33, z: -32 },
      pigtail: { x: -33, z: 10 },
      mantled: { x: 33, z: 10 },
    },
  },
  birdcage: { // 대형 새장: 중앙 연못 둘레 배치, 펭귄 풀 남서쪽
    area: { W: 130, D: 210 },
    pens: {
      crane:   { x: -33, z: -66 },
      pelican: { x: 33, z: -66 },
      heron:   { x: -33, z: -22 },
      stork:   { x: 33, z: -22 },
      penguin: { x: -33, z: 22 },
      ibis:    { x: 33, z: 22 },
    },
  },
};

/* 레이아웃에 없는 동물용 폴백: 남는 자리에 2열 그리드 */
function fallbackPen(i) {
  return { x: i % 2 === 0 ? -32 : 32, z: -66 + Math.floor(i / 2) * 40 };
}

function animalTexture(a) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 300;
  const ctx = c.getContext('2d');
  ctx.font = '150px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(a.emoji, 128, 120);
  let fs = 40;
  ctx.font = `800 ${fs}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  while (ctx.measureText(a.name).width > 244 && fs > 22) {
    fs -= 2;
    ctx.font = `800 ${fs}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  }
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(a.name, 128, 262);
  ctx.fillStyle = '#3a5540';
  ctx.fillText(a.name, 128, 262);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const seeded = (i, k) => ((i * 2654435761 + k * 97) >>> 0) % 1000 / 1000; // 결정적 배치용

export function createInterior({ renderer, makeChibi, onAnimalTap, onAnimalNear }) {
  let scene = null, camera = null, chibi = null, spot = null;
  let area = { W: 110, D: 180 };
  let sprites = [], spriteMeta = [];
  let penMeta = []; // 우리 접근 감지용 {aid, x, z, w, d}
  const nearSet = new Set(); // 지금 우리 곁에 있는 동물 (재진입 시 다시 트리거)
  const NEAR_DIST = 7; // 울타리에서 이만큼 안쪽으로 다가오면 '가까이'
  const moveTarget = new THREE.Vector3();
  let moving = false, phase = 0;
  const camPos = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function box(w, h, d, color, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function build(s) {
    const st = ZONE_STYLE[s.id] || ZONE_STYLE.herbivore;
    const zl = ZONE_LAYOUTS[s.id];
    area = zl ? zl.area : { W: 110, D: 180 };
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#cfe8f5');
    scene.fog = new THREE.Fog('#cfe8f5', 300, 900);
    scene.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.2));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.5);
    sun.position.set(80, 160, 60);
    scene.add(sun);

    // 바닥 + 중앙 길
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(area.W + 240, area.D + 240).rotateX(-Math.PI / 2), lambert(st.ground));
    scene.add(ground);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(20, area.D - 24).rotateX(-Math.PI / 2), lambert('#f0e6c8'));
    path.position.set(0, 0.05, 12); // 남쪽 입구에서 안쪽까지
    scene.add(path);

    // 둘레 울타리 (남쪽 가운데 24 유닛 입구 개방)
    const F = '#c9b27f', H = 4, T = 2;
    box(area.W + T, H, T, F, 0, H / 2, -area.D / 2, scene);
    box(T, H, area.D + T, F, -area.W / 2, H / 2, 0, scene);
    box(T, H, area.D + T, F, area.W / 2, H / 2, 0, scene);
    const seg = (area.W - 24) / 2;
    box(seg, H, T, F, -(12 + seg / 2), H / 2, area.D / 2, scene);
    box(seg, H, T, F, 12 + seg / 2, H / 2, area.D / 2, scene);

    // 동물 펜 — 실제 동물사 배치(ZONE_LAYOUTS) 기준
    sprites = []; spriteMeta = []; penMeta = [];
    nearSet.clear();
    s.animals.forEach((aid, i) => {
      const pen = (zl && zl.pens[aid]) || fallbackPen(i);
      const px = pen.x, pz = pen.z;
      const PW = pen.w || DEFAULT_PEN.w, PD = pen.d || DEFAULT_PEN.d;
      penMeta.push({ aid, x: px, z: pz, w: PW, d: PD });
      const penGround = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD).rotateX(-Math.PI / 2), lambert(st.pen));
      penGround.position.set(px, 0.1, pz);
      scene.add(penGround);
      const PF = '#f7f2e4', ph = 2.4, pt = 0.9;
      box(PW, ph, pt, PF, px, ph / 2, pz - PD / 2, scene);
      box(PW, ph, pt, PF, px, ph / 2, pz + PD / 2, scene);
      box(pt, ph, PD, PF, px - PW / 2, ph / 2, pz, scene);
      box(pt, ph, PD, PF, px + PW / 2, ph / 2, pz, scene);
      if (st.water) { // 물웅덩이
        const pool = new THREE.Mesh(new THREE.CircleGeometry(Math.min(9, PD / 3), 20).rotateX(-Math.PI / 2), lambert('#79c2e4'));
        pool.position.set(px + (seeded(i, 1) - 0.5) * (PW / 4), 0.2, pz + PD / 5);
        scene.add(pool);
      }
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(5, 18).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.14 }),
      );
      blob.position.set(px, 0.25, pz);
      scene.add(blob);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: animalTexture(ANIMALS[aid]) }));
      sp.scale.set(20, 23.4, 1);
      sp.position.set(px, 12, pz);
      sp.userData.animal = aid;
      scene.add(sp);
      sprites.push(sp);
      spriteMeta.push({ sp, baseY: 12, i });
    });

    // 장식: 나무·바위 (결정적 위치, 중앙 길 양옆 남쪽 구간 — 펜과 겹치지 않는 띠)
    const deco = (count, mk) => {
      for (let i = 0; i < count; i++) {
        const x = (seeded(i, 7) < 0.5 ? -1 : 1) * (13 + seeded(i, 7) * 5);
        const z = area.D / 2 - 22 - seeded(i, 13) * 36;
        mk(x, z, i);
      }
    };
    if (st.trees) deco(st.trees + 1, (x, z, i) => {
      box(2, 5, 2, '#8a6242', x, 2.5, z, scene);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + seeded(i, 3) * 2, 0), lambert('#6fbc5e'));
      leaf.position.set(x, 9, z);
      scene.add(leaf);
    });
    if (st.rocks) deco(2, (x, z, i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + seeded(i, 5) * 2, 0), lambert('#b7b2a4'));
      rock.position.set(-x, 1.5, z + 10);
      scene.add(rock);
    });

    // 내 캐릭터 — 남쪽 입구에서 시작
    chibi = makeChibi();
    chibi.group.position.set(0, 0, area.D / 2 - 8);
    chibi.setHeading(Math.PI); // 북쪽(-z) 바라보기
    scene.add(chibi.group);
    moveTarget.copy(chibi.group.position);
    moving = false;

    camera = new THREE.PerspectiveCamera(45, 1, 1, 2000);
    const frame = document.getElementById('frame');
    camera.aspect = frame.clientWidth / frame.clientHeight;
    camera.updateProjectionMatrix();
    updateCamera(1);
  }

  function updateCamera(f) {
    const p = chibi.group.position;
    camPos.set(p.x, DIST * Math.sin(ELEV), p.z + DIST * Math.cos(ELEV));
    camera.position.lerp(camPos, f);
    camera.lookAt(p.x, 5, p.z);
  }

  function dispose() {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    scene = null; camera = null; chibi = null; sprites = []; spriteMeta = [];
  }

  const api = {
    get active() { return !!scene; },
    get spot() { return spot; },
    get scene() { return scene; },
    get camera() { return camera; },

    enter(s) {
      if (scene) dispose();
      spot = s;
      build(s);
    },
    exit() {
      if (scene) dispose();
      spot = null;
    },

    resize(aspect) {
      if (!camera) return;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    walkTo(x, z) { // 데모·테스트용: 좌표로 걸어가기
      if (!scene) return;
      moveTarget.set(x, 0, z);
      moving = true;
    },

    handleTap(cx, cy) {
      if (!scene) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(sprites, false);
      if (hit.length) { onAnimalTap(hit[0].object.userData.animal, spot); return; }
      const p = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(planeY0, p)) {
        p.x = Math.max(-area.W / 2 + 6, Math.min(area.W / 2 - 6, p.x));
        p.z = Math.max(-area.D / 2 + 6, Math.min(area.D / 2 - 4, p.z));
        p.y = 0;
        moveTarget.copy(p);
        moving = true;
      }
    },

    update(dt, t) {
      if (!scene) return;
      // 캐릭터 이동
      const pos = chibi.group.position;
      if (moving) {
        const dx = moveTarget.x - pos.x, dz = moveTarget.z - pos.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.6) {
          moving = false;
        } else {
          const step = Math.min(len, 42 * dt);
          pos.x += dx / len * step;
          pos.z += dz / len * step;
          phase += step * 0.55;
          chibi.setPhase(phase);
          chibi.setHeading(Math.atan2(dx, dz));
        }
      }
      if (!moving) chibi.idle(t);
      // 우리 접근 감지 — 울타리 근처(NEAR_DIST)에 오면 알림.
      // 콜백이 false(다른 창이 열려 있어 못 보여줌)면 소비하지 않고 잠시 후 재시도.
      if (onAnimalNear) {
        for (const p of penMeta) {
          const ex = Math.max(0, Math.abs(pos.x - p.x) - p.w / 2);
          const ez = Math.max(0, Math.abs(pos.z - p.z) - p.d / 2);
          const isNear = Math.hypot(ex, ez) < NEAR_DIST;
          if (isNear && !nearSet.has(p.aid)) {
            if (!p.nextTry || t >= p.nextTry) {
              if (onAnimalNear(p.aid, spot) === false) p.nextTry = t + 1.5;
              else nearSet.add(p.aid); // 벗어났다 다시 오면 재트리거
            }
          } else if (!isNear) {
            nearSet.delete(p.aid);
          }
        }
      }
      // 동물 스프라이트 살랑살랑
      for (const m of spriteMeta) m.sp.position.y = m.baseY + Math.sin(t * 1.7 + m.i * 1.1) * 0.9;
      updateCamera(1 - Math.exp(-dt * 5));
    },
  };
  return api;
}
