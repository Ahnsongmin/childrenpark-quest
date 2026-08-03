/* 치비 캐릭터 — 지도 아바타·가족 마커·꾸미기 미리보기·유형 도감·리캡 유형 슬라이드 공용
   설정: { gender:'m'|'f', dress:bool, top:0|1, bottom:0|1, name:string, gear:유형 combo id|null }
   gear: 16 탐험 유형 조합 id (예 'explorer-detective') — 이동 유형이 색 후드·동물 귀·꼬리를,
         탐험 성향이 손 소품(돋보기/별지팡이/배지/깃발)을 정한다. 미상 값이면 조용히 무시(하위호환). */
import * as THREE from 'three';
import { KEYS } from './config.js';
import { parseComboId, getCombo, shade } from './explorer-types.mjs';

/* 모션 감소 설정 — 축하 점프 등 큰 애니메이션 최소화 */
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const TOPS = [
  { label: '주황 티셔츠', color: '#f97316' },
  { label: '민트 줄무늬', color: '#5eead4', stripe: '#ffffff' },
];
export const BOTTOMS = [
  { label: '파랑 바지', color: '#3b5bd1' },
  { label: '카키 반바지', color: '#a08a5f' },
];
export const DRESS = { label: '분홍 원피스', color: '#f472b6' };

export const DEFAULT_AVATAR = { gender: 'm', dress: false, top: 0, bottom: 0, name: '', gear: null };

export function loadAvatar() {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS.avatar));
    if (v && typeof v === 'object') {
      const merged = { ...DEFAULT_AVATAR, ...v };
      // 구 5유형 id 등 미상 gear 폐기 — 다음 리캡에서 새 16유형으로 재장착됨
      if (merged.gear && !parseComboId(merged.gear)) merged.gear = null;
      return merged;
    }
  } catch (_) { /* 손상된 저장값 → 기본 캐릭터 */ }
  return { ...DEFAULT_AVATAR };
}
export function saveAvatar(cfg) {
  localStorage.setItem(KEYS.avatar, JSON.stringify(cfg));
}

const SKIN = '#f8c89c', HAIR_M = '#5b3d26', HAIR_F = '#7b4a2d', SHOE = '#3b4252';

function stripeTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = a; ctx.fillRect(0, 0, 8, 32);
  ctx.fillStyle = b; ctx.fillRect(0, 8, 8, 8); ctx.fillRect(0, 24, 8, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const mat = (color) => new THREE.MeshLambertMaterial({ color });

/* 키 약 12unit(≈10m 지도 스케일의 오버사이즈 캐릭터, 나무 25·건물 9~18과 조화)
   +Z를 바라보는 자세로 제작 → setHeading(atan2(dx,dz)) */
/* ── 유형 장비 메시 — body(통통 bob 그룹)에 붙여 캐릭터와 함께 움직인다 ──
   이동 유형: 색 후드 + 동물 귀·꼬리 (거북이는 모자+등딱지 가방)
   탐험 성향: 손 소품 — 반환값 { rightProp } 은 guidePose(깃발 흔들기)용 */
const HEAD_Y = 9.4;

function addHood(body, color) {
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(color));
  hood.position.y = HEAD_Y + 0.2;
  hood.rotation.x = -0.32;
  body.add(hood);
  const back = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), mat(color));
  back.scale.set(1.5, 1.0, 0.8);
  back.position.set(0, 7.0, -1.9);
  body.add(back);
}

function addMovementGear(body, info) {
  const c = info.color;
  const cm = mat(c), cd = mat(shade(c, 0.3));
  const id = info.movementId;

  if (id === 'focus') { // 거북이 — 모자 + 등딱지 가방 (후드 없음)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.45, 0.28, 18), cm);
    brim.position.y = HEAD_Y + 2.45;
    body.add(brim);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.05, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), cm);
    dome.position.y = HEAD_Y + 2.45;
    body.add(dome);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), cd);
    shell.scale.set(1.05, 1.3, 0.55);
    shell.position.set(0, 5.2, -2.0);
    body.add(shell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.22, 8, 18), cm);
    rim.scale.set(1.05, 1.3, 1);
    rim.position.set(0, 5.2, -1.6);
    body.add(rim);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), cm);
    tail.rotation.x = -Math.PI / 2 - 0.5;
    tail.position.set(0, 2.5, -1.9);
    body.add(tail);
    return;
  }

  addHood(body, c);
  if (id === 'explorer') { // 수달 — 둥근 귀 + 굵은 꼬리
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), cm);
      ear.position.set(s * 1.75, HEAD_Y + 2.6, 0.5);
      body.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.75, 3.4, 10), cd);
    tail.rotation.x = -1.25;
    tail.position.set(0, 2.5, -2.7);
    body.add(tail);
  } else if (id === 'curious') { // 다람쥐 — 뾰족 귀 + 말려 올라간 큰 꼬리
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.15, 8), cm);
      ear.position.set(s * 1.65, HEAD_Y + 3.0, 0.4);
      body.add(ear);
    }
    const puffs = [[0, 2.2, -2.5, 1.0], [0, 4.2, -3.1, 1.25], [0, 6.1, -2.5, 0.9]];
    for (const [x, y, z, r] of puffs) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cd);
      p.position.set(x, y, z);
      body.add(p);
    }
  } else if (id === 'speed') { // 토끼 — 긴 귀 + 폼폼 꼬리
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.4, 3, 8), cm);
      ear.position.set(s * 1.25, HEAD_Y + 3.6, 0);
      ear.rotation.z = -s * 0.14;
      body.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.6, 3, 8), mat('#ffe9f0'));
      inner.position.set(s * 1.25, HEAD_Y + 3.6, 0.3);
      inner.rotation.z = -s * 0.14;
      body.add(inner);
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat('#fff5ea'));
    tail.position.set(0, 3.0, -2.3);
    body.add(tail);
  }
}

function makeBook(coverColor) { // 단서 수첩·퀴즈북 공용 (왼손)
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.75, 0.3), mat(coverColor));
  g.add(cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.6, 0.14), mat('#fdf8ec'));
  pages.position.z = 0.12;
  g.add(pages);
  return g;
}

function addMissionGear(body, info) {
  const c = info.color;
  const id = info.missionId;
  let rightProp = null;

  if (id === 'detective') { // 돋보기(오른손) + 단서 수첩(왼손)
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.22, 8, 18), mat('#F2A03D'));
    g.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16),
      new THREE.MeshLambertMaterial({ color: '#9fd8e8', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    g.add(glass);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 8), mat('#8a5a2b'));
    handle.position.y = -1.6;
    g.add(handle);
    g.position.set(3.1, 4.2, 1.1);
    g.rotation.z = -0.35;
    body.add(g);
    rightProp = g;
    const book = makeBook(c);
    book.position.set(-3.0, 3.9, 0.9);
    book.rotation.z = 0.3;
    body.add(book);
  } else if (id === 'fairy') { // 별 지팡이(오른손) + 퀴즈북(왼손)
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.9, 8), mat('#f3e2b1'));
    g.add(stick);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.62), mat('#FFD34D'));
    star.position.y = 1.8;
    star.rotation.z = 0.5;
    g.add(star);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(c));
    gem.position.y = 1.1;
    g.add(gem);
    g.position.set(3.1, 4.5, 0.9);
    g.rotation.z = -0.3;
    body.add(g);
    rightProp = g;
    const book = makeBook(c);
    book.position.set(-3.0, 3.9, 0.9);
    book.rotation.z = 0.3;
    body.add(book);
  } else if (id === 'boss') { // 장소 배지(가슴) + 스탬프 가방(옆구리)
    const badge = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 14).rotateX(Math.PI / 2), mat('#FFD34D'));
    badge.add(disc);
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12).rotateX(Math.PI / 2), mat(c));
    center.position.z = 0.06;
    badge.add(center);
    badge.position.set(1.15, 6.3, 1.95);
    body.add(badge);
    const bag = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 0.85), mat(shade(c, 0.25)));
    bag.add(box);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.9), mat(c));
    flap.position.y = 0.55;
    bag.add(flap);
    bag.position.set(2.55, 3.3, -0.3);
    bag.rotation.y = 0.25;
    body.add(bag);
  } else if (id === 'guide') { // 깃발(오른손) + 나침반(왼손)
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.7, 8), mat('#c9b48a'));
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.07), mat(c));
    flag.position.set(0.95, 1.7, 0);
    g.add(flag);
    g.position.set(3.1, 4.6, 0.9);
    g.rotation.z = -0.18;
    body.add(g);
    rightProp = g;
    const comp = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.35, 14), mat('#C68A3E'));
    comp.add(disc);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.68, 14).rotateX(-Math.PI / 2), mat('#FBF6E9'));
    face.position.y = 0.19;
    comp.add(face);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.0), mat('#E8664F'));
    needle.position.y = 0.24;
    needle.rotation.y = 0.6;
    comp.add(needle);
    comp.position.set(-3.0, 3.9, 0.9);
    body.add(comp);
  }
  return rightProp;
}

/* gear(combo id) → 유형 장비 일체 부착. 미상 id는 no-op (구버전 값·가족 마커 하위호환)
   반환: 오른손 소품(깃발 등) — guidePose 애니메이션용 */
function addTypeGear(body, gearId) {
  const parsed = parseComboId(gearId);
  if (!parsed) return null;
  const full = getCombo(parsed.movement.id, parsed.mission.id);
  const info = { movementId: parsed.movement.id, missionId: parsed.mission.id, color: full.primaryColor };
  addMovementGear(body, info);
  return addMissionGear(body, info);
}

export function buildChibi(cfg = {}, scale = 1) {
  const { gender, dress, top, bottom, gear } = { ...DEFAULT_AVATAR, ...cfg };
  const root = new THREE.Group();
  const body = new THREE.Group(); // 통통 bob은 body만 (그림자는 바닥 고정)
  root.add(body);
  root.scale.setScalar(scale);

  const skinM = mat(SKIN);
  const topDef = TOPS[top] || TOPS[0];
  const topM = topDef.stripe
    ? new THREE.MeshLambertMaterial({ map: stripeTexture(topDef.color, topDef.stripe) })
    : mat(topDef.color);
  const bottomM = mat((BOTTOMS[bottom] || BOTTOMS[0]).color);
  const hairM = mat(gender === 'f' ? HAIR_F : HAIR_M);

  // 머리 (치비 비율 — 전체의 40%대)
  const headY = 9.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.7, 20, 14), skinM);
  head.position.y = headY;
  body.add(head);
  // 머리카락: 살짝 뒤로 기운 캡 (이마 노출)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(2.85, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM);
  hair.position.y = headY + 0.12;
  hair.rotation.x = -0.38;
  body.add(hair);
  if (gender === 'f') { // 양갈래
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), hairM);
      tail.scale.set(0.75, 1.5, 0.75);
      tail.position.set(s * 2.75, headY - 0.7, -0.5);
      body.add(tail);
    }
  }
  // 눈·입
  const eyeM = mat('#2c2c34');
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), eyeM);
    eye.position.set(s * 0.95, headY + 0.15, 2.35);
    body.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 12, Math.PI * 0.7), eyeM);
  mouth.position.set(0, headY - 0.95, 2.4);
  mouth.rotation.z = Math.PI + (Math.PI - Math.PI * 0.7) / 2; // 아래쪽 호 = 미소
  body.add(mouth);

  // 몸통: 원피스면 콘, 아니면 A라인 실린더
  if (dress) {
    const dressM = mat(DRESS.color);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.1, 5.4, 14), dressM);
    cone.position.y = 4.6;
    body.add(cone);
  } else {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.15, 4.3, 12), topM);
    torso.position.y = 4.6;
    body.add(torso);
  }

  // 팔 (어깨 피벗) — 원피스일 땐 소매도 원피스 색
  const armM = dress ? mat(DRESS.color) : topM;
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 2.15, 6.4, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.8, 3, 8), armM);
    arm.position.y = -1.45;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), skinM);
    hand.position.y = -2.75;
    pivot.add(hand);
    body.add(pivot);
    arms.push(pivot);
  }

  // 다리 (골반 피벗) — 원피스일 땐 맨다리(살색)
  const legM = dress ? skinM : bottomM;
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.95, 2.9, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.4, 3, 8), legM);
    leg.position.y = -1.3;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), mat(SHOE));
    shoe.scale.set(1, 0.8, 1.3);
    shoe.position.set(0, -2.45, 0.2);
    pivot.add(shoe);
    body.add(pivot);
    legs.push(pivot);
  }

  const rightProp = gear ? addTypeGear(body, gear) : null;

  // 발밑 그림자
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 }),
  );
  blob.position.y = 0.12;
  root.add(blob);

  let swing = 0; // 현재 팔다리 각도 (idle 감쇠용)
  /* celebrate/inspect/guide가 만든 자세를 걷기·정지로 돌아올 때 되돌린다 */
  function resetPose() {
    body.rotation.x = 0;
    body.scale.x = 1; body.scale.z = 1;
    arms[1].rotation.z = 0;
    if (rightProp) rightProp.rotation.x = 0;
  }
  const api = {
    group: root,
    setHeading(rad) { root.rotation.y = rad; },
    setPhase(p, run = false) { // 걷기/달리기: 이동 거리 기반 위상 — run이면 팔다리 진폭·바운스 확대
      resetPose();
      const amp = run && !REDUCED ? 1.15 : 0.85;
      swing = Math.sin(p) * amp;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.75;
      arms[1].rotation.x = swing * 0.75;
      body.position.y = Math.abs(Math.sin(p)) * (run && !REDUCED ? 0.7 : 0.4);
      body.scale.y = 1;
    },
    idle(t) { // 정지: 스윙 감쇠 + 숨쉬기
      resetPose();
      swing *= 0.86;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.75;
      arms[1].rotation.x = swing * 0.75;
      body.position.y *= 0.86;
      body.scale.y = 1 + (REDUCED ? 0 : Math.sin(t * 2.2) * 0.012);
    },
    celebrate(t) { // 축하: 점프 + 만세
      if (REDUCED) { api.idle(t); return; }
      resetPose();
      body.position.y = Math.abs(Math.sin(t * 6)) * 1.4;
      arms[0].rotation.x = -2.4;
      arms[1].rotation.x = -2.4;
      legs[0].rotation.x = 0;
      legs[1].rotation.x = 0;
    },
    inspect(t) { // 관찰: 앞으로 살짝 숙이고 확대·축소 펄스 (돋보기 들여다보는 느낌)
      if (REDUCED) { api.idle(t); return; }
      body.rotation.x = 0.22;
      const s = 1 + Math.sin(t * 5) * 0.05;
      body.scale.set(s, s, s);
      body.position.y = 0;
    },
    guide(t) { // 안내: 오른손 소품(깃발·지팡이·돋보기)을 가볍게 흔들기
      if (REDUCED) { api.idle(t); return; }
      resetPose();
      arms[1].rotation.x = -1.2;
      arms[1].rotation.z = Math.sin(t * 5) * 0.25;
      if (rightProp) rightProp.rotation.x = Math.sin(t * 5) * 0.28;
      body.position.y *= 0.86;
      body.scale.y = 1 + Math.sin(t * 2.2) * 0.012;
    },
  };
  return api;
}

/* 머리 위 이름표 스프라이트 (가족 마커·거리 표시용) */
export function makeNameSprite() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  let cur = null;
  sprite.userData.setText = (text) => {
    if (text === cur) return;
    cur = text;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = '800 56px "Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, 256, 64);
    ctx.fillStyle = '#2e5540';
    ctx.fillText(text, 256, 64);
    tex.needsUpdate = true;
  };
  sprite.scale.set(24, 6, 1);
  return sprite;
}
