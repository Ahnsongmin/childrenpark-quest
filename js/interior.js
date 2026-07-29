/* 마을 안 디오라마 — 동물 구역에 들어가면 펼쳐지는 내부 지도
   ⚠️ 내부 배치는 실측이 아닌 연출용 예시 (펜 위치·개수는 동물 목록 기준 자동 구성) */
import * as THREE from 'three';
import { ANIMALS } from './quests-data.js';

const AREA = { W: 110, D: 180 };          // 세로형 마당: x -55..55, z -90..90 (남쪽 +z 입구)
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

/* 펜 중심 좌표 — 세로 화면에 맞춘 2열 배치 (동물 수별 고정 레이아웃) */
const LAYOUTS = {
  2: [[-30, -34], [30, -34]],
  3: [[-30, -34], [30, -34], [0, -70]],
  4: [[-30, -62], [30, -62], [-30, -22], [30, -22]],
  5: [[-30, -62], [30, -62], [-30, -22], [30, -22], [-30, 18]],
};

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

export function createInterior({ renderer, makeChibi, onAnimalTap }) {
  let scene = null, camera = null, chibi = null, spot = null;
  let sprites = [], spriteMeta = [];
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
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#cfe8f5');
    scene.fog = new THREE.Fog('#cfe8f5', 300, 900);
    scene.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.2));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.5);
    sun.position.set(80, 160, 60);
    scene.add(sun);

    // 바닥 + 중앙 길
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(AREA.W + 240, AREA.D + 240).rotateX(-Math.PI / 2), lambert(st.ground));
    scene.add(ground);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(20, AREA.D - 24).rotateX(-Math.PI / 2), lambert('#f0e6c8'));
    path.position.set(0, 0.05, 12); // 남쪽 입구에서 안쪽까지
    scene.add(path);

    // 둘레 울타리 (남쪽 가운데 24 유닛 입구 개방)
    const F = '#c9b27f', H = 4, T = 2;
    box(AREA.W + T, H, T, F, 0, H / 2, -AREA.D / 2, scene);
    box(T, H, AREA.D + T, F, -AREA.W / 2, H / 2, 0, scene);
    box(T, H, AREA.D + T, F, AREA.W / 2, H / 2, 0, scene);
    const seg = (AREA.W - 24) / 2;
    box(seg, H, T, F, -(12 + seg / 2), H / 2, AREA.D / 2, scene);
    box(seg, H, T, F, 12 + seg / 2, H / 2, AREA.D / 2, scene);

    // 동물 펜
    sprites = []; spriteMeta = [];
    const n = Math.min(s.animals.length, 5);
    const layout = LAYOUTS[n] || LAYOUTS[3];
    const PW = 38, PD = 28;
    s.animals.slice(0, 5).forEach((aid, i) => {
      const [px, pz] = layout[i];
      const penGround = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD).rotateX(-Math.PI / 2), lambert(st.pen));
      penGround.position.set(px, 0.1, pz);
      scene.add(penGround);
      const PF = '#f7f2e4', ph = 2.4, pt = 0.9;
      box(PW, ph, pt, PF, px, ph / 2, pz - PD / 2, scene);
      box(PW, ph, pt, PF, px, ph / 2, pz + PD / 2, scene);
      box(pt, ph, PD, PF, px - PW / 2, ph / 2, pz, scene);
      box(pt, ph, PD, PF, px + PW / 2, ph / 2, pz, scene);
      if (st.water) { // 물웅덩이
        const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 20).rotateX(-Math.PI / 2), lambert('#79c2e4'));
        pool.position.set(px + (seeded(i, 1) - 0.5) * 12, 0.2, pz + 6);
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

    // 장식: 나무·바위 (결정적 위치, 펜·길 피해서 가장자리)
    const deco = (count, mk) => {
      for (let i = 0; i < count; i++) {
        const x = (seeded(i, 7) < 0.5 ? -1 : 1) * (26 + seeded(i, 7) * 18);
        const z = 46 + seeded(i, 13) * 32; // 남쪽 빈 공간 (펜 없는 구역)
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
    chibi.group.position.set(0, 0, AREA.D / 2 - 8);
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

    handleTap(cx, cy) {
      if (!scene) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(sprites, false);
      if (hit.length) { onAnimalTap(hit[0].object.userData.animal, spot); return; }
      const p = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(planeY0, p)) {
        p.x = Math.max(-AREA.W / 2 + 6, Math.min(AREA.W / 2 - 6, p.x));
        p.z = Math.max(-AREA.D / 2 + 6, Math.min(AREA.D / 2 - 4, p.z));
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
      // 동물 스프라이트 살랑살랑
      for (const m of spriteMeta) m.sp.position.y = m.baseY + Math.sin(t * 1.7 + m.i * 1.1) * 0.9;
      updateCamera(1 - Math.exp(-dt * 5));
    },
  };
  return api;
}
