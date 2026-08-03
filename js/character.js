/* 치비 캐릭터 — 지도 아바타·가족 마커·꾸미기 미리보기·리캡 유형 슬라이드 공용
   설정: { gender:'m'|'f', dress:bool, top:0|1, bottom:0|1, name:string, gear:유형id|null }
   gear: 리캡의 모험 유형으로 획득하는 장비 (observer=돋보기 · collector=카메라 ·
         scholar=학사모 · wanderer=밀짚모자 · adventurer=나침반) */
import * as THREE from 'three';
import { KEYS } from './config.js';

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
    if (v && typeof v === 'object') return { ...DEFAULT_AVATAR, ...v };
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
/* 유형 장비 메시 — body(통통 bob 그룹)에 붙여 캐릭터와 함께 움직인다 */
function addGear(body, gear) {
  const headY = 9.4;
  if (gear === 'observer') { // 돋보기 (오른손)
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
  } else if (gear === 'collector') { // 카메라 (가슴)
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 0.8), mat('#3b4252'));
    g.add(box);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 12).rotateX(Math.PI / 2), mat('#9fd8e8'));
    lens.position.z = 0.5;
    g.add(lens);
    g.position.set(0, 5.6, 2.0);
    body.add(g);
  } else if (gear === 'scholar') { // 학사모 (머리)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.9, 12), mat('#2c2c34'));
    cap.position.y = headY + 2.9;
    body.add(cap);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 4.6), mat('#2c2c34'));
    plate.position.y = headY + 3.45;
    plate.rotation.y = Math.PI / 4;
    body.add(plate);
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat('#F2A03D'));
    tassel.position.set(2.1, headY + 3.0, 2.1);
    body.add(tassel);
  } else if (gear === 'wanderer') { // 밀짚모자 (머리)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.9, 0.3, 18), mat('#e7c56a'));
    brim.position.y = headY + 2.7;
    body.add(brim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat('#e7c56a'));
    dome.position.y = headY + 2.7;
    body.add(dome);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.12, 0.5, 16), mat('#c2543e'));
    band.position.y = headY + 2.95;
    body.add(band);
  } else if (gear === 'adventurer') { // 나침반 (왼손)
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.35, 14), mat('#C68A3E'));
    g.add(disc);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.68, 14).rotateX(-Math.PI / 2), mat('#FBF6E9'));
    face.position.y = 0.19;
    g.add(face);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.0), mat('#E8664F'));
    needle.position.y = 0.24;
    needle.rotation.y = 0.6;
    g.add(needle);
    g.position.set(-3.0, 3.9, 0.9);
    body.add(g);
  }
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

  if (gear) addGear(body, gear);

  // 발밑 그림자
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 }),
  );
  blob.position.y = 0.12;
  root.add(blob);

  let swing = 0; // 현재 팔다리 각도 (idle 감쇠용)
  const api = {
    group: root,
    setHeading(rad) { root.rotation.y = rad; },
    setPhase(p) { // 걷기: 이동 거리 기반 위상
      swing = Math.sin(p) * 0.85;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.75;
      arms[1].rotation.x = swing * 0.75;
      body.position.y = Math.abs(Math.sin(p)) * 0.4;
    },
    idle(t) { // 정지: 스윙 감쇠 + 숨쉬기
      swing *= 0.86;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.75;
      arms[1].rotation.x = swing * 0.75;
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
