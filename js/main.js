/* 부트스트랩: 렌더러·씬·카메라·내 캐릭터·GPS/데모·산책 데모·가족 공유·UI */
import * as THREE from 'three';
import { prj, M2U, inPark } from './geo.js';
import { buildWorld } from './scene.js';
import { createMarkers } from './markers.js';
import { createCameraCtl } from './cameraCtl.js';
import { buildChibi, loadAvatar, saveAvatar } from './character.js';
import { initFamily } from './family.js';
import { openSheet, toast, updateHud, markSeen, setHudRefresh, initTutorial } from './ui.js';
import { initQuests } from './quest.js';
import { initQuestUI } from './questUI.js';
import { createInterior } from './interior.js';

/* global MAP — mapdata.js 전역 */
const $ = (id) => document.getElementById(id);

/* ─── 렌더러·씬·카메라 ─── */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const camera = new THREE.PerspectiveCamera(45, 1, 2, 6000);
const { scene, routeLine } = buildWorld(renderer);
const markers = createMarkers(scene);
const camCtl = createCameraCtl(camera, canvas);

function resize() {
  const frame = $('frame');
  const w = frame.clientWidth, h = frame.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  interior.resize(w / h);
}
window.addEventListener('resize', resize);

// 초기 뷰: 정문 부근
{
  const [gx, gz] = prj(37.54939, 127.07632);
  camCtl.target.set(gx, 0, gz - 60);
  camCtl.apply();
}

/* ─── 내 캐릭터 (커스터마이징 반영) ─── */
const avatarCfg = loadAvatar();
const meG = new THREE.Group();
meG.visible = false;
scene.add(meG);
const meChibi = buildChibi(avatarCfg, 1.25); // 지도 위 시인성 위해 살짝 크게
meG.add(meChibi.group);

// GPS 정확도 원 + 파랑 펄스 링 + 방향 콘 (포켓몬GO식)
const meAcc = new THREE.Mesh(
  new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.2 }),
);
meAcc.position.y = 0.18;
meAcc.scale.setScalar(0.001);
meG.add(meAcc);
const pulse = new THREE.Mesh(
  new THREE.RingGeometry(0.94, 1, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
);
pulse.position.y = 0.22;
meG.add(pulse);
const cone = new THREE.Mesh(
  new THREE.CircleGeometry(30, 14, Math.PI / 2 - 0.42, 0.84).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0, side: THREE.DoubleSide }),
);
cone.position.y = 0.2;
meG.add(cone);

let mePhase = 0, meLast = null, lastMoveTs = 0;

function setMe(x, z, accM) {
  meG.visible = true;
  meG.position.set(x, 0, z);
  meAcc.scale.setScalar(Math.max(0.001, accM > 50 ? accM * M2U : 0.001));
  famApi.shareMyPos(x, z);
  quests.onPosition(x, z); // 지오펜스: 동물 우리 근접 시 탐험 활성
}
const myPos = () => (meG.visible ? [meG.position.x, meG.position.z] : null);

/* ─── 나침반 (폰이 바라보는 방향) ─── */
function setHeadingCone(deg) {
  cone.rotation.y = -deg * Math.PI / 180;
  cone.material.opacity = 0.26;
}
function faceByHeading(deg) {
  const h = deg * Math.PI / 180;
  meChibi.setHeading(Math.atan2(Math.sin(h), -Math.cos(h))); // 북=화면 안쪽(-Z)
}
function onHeading(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iOS
  else if (typeof e.alpha === 'number' && (e.absolute || e.type === 'deviceorientationabsolute')) h = 360 - e.alpha; // Android
  if (h === null || walking) return;
  setHeadingCone(h);
  if (Date.now() - lastMoveTs > 2000) faceByHeading(h); // 이동 중엔 이동 방향이 우선
}
let compassOn = false;
async function enableCompass() {
  if (compassOn) return;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      if (await DeviceOrientationEvent.requestPermission() !== 'granted') return; // iOS 권한
      window.addEventListener('deviceorientation', onHeading);
    } else {
      window.addEventListener('deviceorientationabsolute', onHeading);
      window.addEventListener('deviceorientation', onHeading);
    }
    compassOn = true;
  } catch (_) { /* 미지원 기기 — 이동 방향 표시로 폴백 */ }
}

/* ─── GPS / 데모 모드 ─── */
const locBtn = $('locBtn');
const banner = $('banner');
const demoTag = $('demoTag');
let watching = null, demo = false, lastFix = null, deniedOnce = false;

function onFix(pos) {
  const { latitude: lat, longitude: lon, accuracy } = pos.coords;
  const now = pos.timestamp;
  if (lastFix) {
    const dt = (now - lastFix.t) / 1000;
    const dm = Math.hypot(lat - lastFix.lat, lon - lastFix.lon) * 111000;
    if (dt > 0 && dm / dt > 10) return; // 10m/s 초과 점프 폐기
  }
  lastFix = { lat, lon, t: now };
  const [x, z] = prj(lat, lon);
  if (inPark(x, z)) {
    banner.classList.remove('show');
    setMe(x, z, accuracy);
    if (meLast) {
      const mdx = x - meLast[0], mdz = z - meLast[1];
      if (Math.hypot(mdx, mdz) > 2) {
        mePhase += Math.hypot(mdx, mdz) * 0.4;
        lastMoveTs = Date.now();
        meChibi.setPhase(mePhase);
        meChibi.setHeading(Math.atan2(mdx, mdz));
        setHeadingCone(Math.atan2(mdx, -mdz) * 180 / Math.PI);
      }
    }
    meLast = [x, z];
  } else {
    banner.classList.add('show');
    meG.visible = false;
  }
}

locBtn.addEventListener('click', () => {
  if (demo) { exitDemo(); return; }
  if (watching !== null) {
    navigator.geolocation.clearWatch(watching);
    watching = null;
    locBtn.classList.remove('on');
    meG.visible = false;
    return;
  }
  if (!('geolocation' in navigator)) { toast('이 기기는 위치를 지원하지 않아요'); return; }
  enableCompass(); // 사용자 제스처 시점에 나침반 권한도 함께
  watching = navigator.geolocation.watchPosition(
    (pos) => { locBtn.classList.add('on'); onFix(pos); },
    (err) => {
      navigator.geolocation.clearWatch(watching);
      watching = null;
      locBtn.classList.remove('on');
      if (err.code === err.PERMISSION_DENIED) {
        if (!deniedOnce) { toast('위치 권한 없이도 지도는 자유롭게 볼 수 있어요'); deniedOnce = true; }
        banner.classList.add('show');
      } else {
        toast('위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요');
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
  );
});

$('demoBtn').addEventListener('click', () => {
  demo = true;
  banner.classList.remove('show');
  demoTag.classList.add('show');
  locBtn.classList.add('on');
  const [x, z] = prj(37.54939, 127.07632); // 정문에서 시작
  setMe(x, z, 0);
  camCtl.target.set(x, 0, z);
  camCtl.dist = 260;
  camCtl.apply();
  toast('데모 모드: 지도를 톡 누르면 이동해요');
});
function exitDemo() {
  demo = false;
  demoTag.classList.remove('show');
  locBtn.classList.remove('on');
  meG.visible = false;
}

/* ─── 탭: 마을 안 → interior, 마커 → 시트, 데모 모드 → 이동 ─── */
camCtl.onTap = (cx, cy) => {
  if (interior.active) { interior.handleTap(cx, cy); return; }
  const hit = camCtl.raycastSprites(cx, cy, markers.sprites);
  if (hit) { openSheet(hit.userData.lm, entryGate); return; }
  if (demo && !walking) {
    const p = camCtl.groundPoint(cx, cy);
    if (p && inPark(p.x, p.z, 20)) {
      const prev = myPos();
      if (prev) {
        const mdx = p.x - prev[0], mdz = p.z - prev[1];
        mePhase += Math.hypot(mdx, mdz) * 0.4;
        lastMoveTs = Date.now();
        meChibi.setPhase(mePhase);
        meChibi.setHeading(Math.atan2(mdx, mdz));
      }
      setMe(p.x, p.z, 0);
    }
  }
};

/* ─── 산책 데모 (자동 이동) — __walk 훅·?walk=1 그대로 유지 ─── */
const walkBtn = $('walkBtn');
const R = MAP.walkRoute;
const cum = [0];
for (let i = 1; i < R.length; i++) {
  cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
}
const ROUTE_LEN = cum[cum.length - 1];
const WALK_SPEED = 26; // 유닛/초 (실지도 기준 ≈ 도보 5배속)

function posAt(s) {
  s = Math.max(0, Math.min(ROUTE_LEN, s));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  const x = R[i - 1][0] + (R[i][0] - R[i - 1][0]) * t;
  const y = R[i - 1][1] + (R[i][1] - R[i - 1][1]) * t;
  return { x, y, dx: R[i][0] - R[i - 1][0], dy: R[i][1] - R[i - 1][1] };
}

let walking = false, walkS = 0, recording = false, distBeforeWalk = 0;
const walkVisited = new Set();

function renderWalk() {
  const p = posAt(walkS);
  setMe(p.x, p.y, 0);
  meChibi.setPhase(walkS * 0.9);
  meChibi.setHeading(Math.atan2(p.dx, p.dy));
  camCtl.target.set(p.x, 0, p.y);
  camCtl.apply();
  for (const m of markers.list) {
    if (walkVisited.has(m.lm.id)) continue;
    if (Math.hypot(m.x - p.x, m.z - p.y) < 45) {
      walkVisited.add(m.lm.id);
      m.pop = 1; // 마커 크기 펀치
      toast(`${m.lm.emoji} ${m.lm.name} 도착!`);
      markSeen(m.lm.id);
    }
  }
}

function startWalk(rec) {
  recording = !!rec;
  walking = true;
  walkS = 0;
  walkVisited.clear();
  exitDemo();
  if (watching !== null) { navigator.geolocation.clearWatch(watching); watching = null; locBtn.classList.remove('on'); }
  walkBtn.classList.add('on');
  walkBtn.textContent = '⏹';
  routeLine.visible = true;
  camCtl.panLocked = true;
  distBeforeWalk = camCtl.dist;
  camCtl.dist = 190;
  renderWalk();
}

function stopWalk() {
  walking = false;
  walkBtn.classList.remove('on');
  walkBtn.textContent = '🚶';
  routeLine.visible = false;
  camCtl.panLocked = false;
  camCtl.dist = distBeforeWalk || 560;
  meG.visible = false;
}

walkBtn.addEventListener('click', () => { walking ? stopWalk() : startWalk(false); });

window.__walk = { // 영상 캡처용 결정적 훅
  len: ROUTE_LEN,
  to(s) {
    if (!walking) startWalk(true);
    walkS = s;
    renderWalk();
    renderer.render(scene, camera); // 외부 프레임 캡처를 위해 동기 렌더
  },
  stop: stopWalk,
};

/* ─── 가족 공유 ─── */
const famApi = initFamily({
  scene,
  camera,
  myPos,
  getName: () => avatarCfg.name || '',
  setName: (v) => { avatarCfg.name = v.slice(0, 8); saveAvatar(avatarCfg); },
  getAv: () => ({ gender: avatarCfg.gender, dress: avatarCfg.dress, top: avatarCfg.top, bottom: avatarCfg.bottom }),
});

/* ─── 탐험 시스템 ─── */
let qui = null;
const quests = initQuests({ onNear: (spot, fresh) => { if (qui) qui.onNear(spot, fresh); } });

/* ─── 마을 안 내부 지도 ─── */
const interior = createInterior({
  renderer,
  makeChibi: () => buildChibi(avatarCfg, 1.25),
  onAnimalTap: (animalId, spot) => qui.openAnimal(animalId, spot),
});

/* 마을 입장 조건: 데모(탭 이동·산책)에선 자유, 실사용은 지오펜스 근접 시에만
   OPEN_ENTRY: 공모전 제출 전 확인·심사용 전면 개방 — 제출 후 false로 되돌릴 것 */
const OPEN_ENTRY = true;
function entryGate(spot) {
  if (!spot || spot.kind !== 'animal') return { ok: false, msg: '' };
  if (OPEN_ENTRY) return { ok: true, msg: '' };
  if (demo || walking) return { ok: true, msg: '' };
  if (meG.visible && quests.near && quests.near.id === spot.id) return { ok: true, msg: '' };
  return {
    ok: false,
    msg: meG.visible
      ? '마을 가까이 가면 들어갈 수 있어요'
      : '📍 위치를 켜고 마을 가까이 가면 들어갈 수 있어요',
  };
}

function enterZone(spot) {
  if (!spot || spot.kind !== 'animal') return;
  const gate = entryGate(spot);
  if (!gate.ok) { toast(gate.msg || '지금은 들어갈 수 없어요'); return; }
  if (walking) stopWalk();
  $('sheetWrap').classList.remove('open');
  qui.closeSheet();
  quests.markMet(spot.id); // 마을 입장 = 동물들과 만남
  $('frame').classList.add('inZone');
  $('zoneName').textContent = `${spot.emoji} ${spot.name}`;
  $('hud').innerHTML = '<span style="font-size:22px">👣</span><div>동물 친구를 <b>톡 눌러 인사</b>해 봐요!<br>바닥을 누르면 그곳으로 걸어가요</div>';
  interior.enter(spot);
  qui.refresh();
  toast(`${spot.emoji} ${spot.name}에 들어왔어요!`);
}
function exitZone() {
  interior.exit();
  $('frame').classList.remove('inZone');
  camCtl.apply();
  qui.refresh();
}
$('exitZone').addEventListener('click', exitZone);
$('shEnter').addEventListener('click', () => {
  $('sheetWrap').classList.remove('open');
  enterZone(quests.spotById($('shEnter').dataset.spot));
});

qui = initQuestUI(quests, { onEnterZone: enterZone });
setHudRefresh(qui.refresh);
resize();
window.__quests = quests; // 콘솔 디버그·시연용

/* ─── UI ─── */
updateHud();
initTutorial();
$('sheetBack').addEventListener('click', () => $('sheetWrap').classList.remove('open'));
$('dressBtn').addEventListener('click', () => { location.href = 'customize.html'; });

/* ─── 메인 루프 ─── */
let prevTs = 0;
function frame(ts) {
  const t = ts / 1000;
  const dt = Math.min(0.1, prevTs ? t - prevTs : 0.016);
  prevTs = t;

  if (walking && !recording) {
    walkS += dt * WALK_SPEED;
    renderWalk();
    if (walkS >= ROUTE_LEN) { stopWalk(); toast('🎉 산책 완주! 랜드마크를 모두 지나왔어요'); }
  }

  markers.update(t, camera);
  famApi.update(dt, t);

  // 파랑 펄스 링
  const ph = (t % 1.6) / 1.6;
  pulse.scale.setScalar(6 + ph * 12);
  pulse.material.opacity = 0.7 * (1 - ph);

  if (!walking && meG.visible && Date.now() - lastMoveTs > 400) meChibi.idle(t);
  if (meG.visible) { // 멀리서도 내 캐릭터가 보이게 거리 기반 확대
    meG.scale.setScalar(Math.min(2.2, Math.max(1, camera.position.distanceTo(meG.position) / 280)));
  }

  if (interior.active) {
    interior.update(dt, t);
    renderer.render(interior.scene, interior.camera);
  } else {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (new URLSearchParams(location.search).get('walk') === '1') startWalk(false);
