/* 부트스트랩: 렌더러·씬·카메라·내 캐릭터·GPS/데모·산책 데모·가족 공유·UI */
import * as THREE from 'three';
import { prj, M2U, inPark } from './geo.js';
import { KEYS } from './config.js';
import { buildWorld } from './scene.js';
import { createMarkers } from './markers.js';
import { createCameraCtl } from './cameraCtl.js';
import { buildAvatar, loadAvatar, saveAvatar } from './character.js';
import { mountCreator } from './creator.js';
import { initAutoSync } from './account.js';
import { initAuthUI } from './auth-ui.js';
import { initFamily } from './family.js';
import { openSheet, toast, updateHud, markSeen, setHudRefresh, initTutorial } from './ui.js';
import { initQuests } from './quest.js';
import { initQuestUI } from './questUI.js';
import { createInterior } from './interior.js';
import { initChat } from './chat.js';
import { trackPosition, trackEnterSpot, trackExitSpot } from './track.js';
import { createLocationTracker } from './location.js';

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
let meChibi = buildAvatar(avatarCfg, 1.25); // 지도 위 시인성 위해 살짝 크게
meG.add(meChibi.group);

/* 리캡에서 유형 장비를 획득·교체하면 지도 아바타에 바로 반영 */
window.addEventListener('avatar-changed', () => {
  Object.assign(avatarCfg, loadAvatar());
  meG.remove(meChibi.group);
  meChibi = buildAvatar(avatarCfg, 1.25);
  meG.add(meChibi.group);
});

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

let mePhase = 0, lastMoveTs = 0, meRun = false;
let meTarget = null; // 시각 목표 좌표 — GPS는 렌더 루프에서 부드럽게 따라감(순간이동 방지)

/* 모든 위치 소스(GPS·데모·산책)의 합류점.
   instant=true(데모·산책·첫 좌표)는 즉시 스냅, GPS 갱신은 frame()에서 lerp */
function setMe(x, z, accM, { instant = true } = {}) {
  meG.visible = true;
  meTarget = [x, z];
  if (instant) meG.position.set(x, 0, z);
  meAcc.scale.setScalar(Math.max(0.001, accM > 50 ? accM * M2U : 0.001));
  famApi.shareMyPos(x, z);
  quests.onPosition(x, z); // 지오펜스: 동물 우리 근접 시 탐험 활성
  trackPosition(x, z); // 오늘의 동선·이동거리·체류시간 기록 (리캡용, 기기에만 저장)
}
/* 논리 위치는 렌더 보간과 무관하게 목표 좌표 기준 (가족 공유·입장 판정 지연 방지) */
const myPos = () => (meG.visible ? (meTarget || [meG.position.x, meG.position.z]) : null);

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
const bannerMsg = $('bannerMsg');
const locStatus = $('locStatus');
const demoTag = $('demoTag');
let demo = false, meLast = null, deniedOnce = false;
let statusHideTm = 0;

const OUT_MSG = '📍 지금은 공원 밖이에요.<br>공원에서 열면 내 위치가 표시돼요.';
const NEAR_MSG = '🎉 공원에 거의 도착했어요!<br>조금만 더 가면 캐릭터가 나타나요.';
const DENIED_MSG = '위치 권한이 꺼져 있어 캐릭터가 움직일 수 없어요.<br>브라우저 주소창의 자물쇠(또는 설정)에서 위치를 허용하면 다시 켤 수 있어요.';

function showStatus(msg, autoHideMs = 0) {
  clearTimeout(statusHideTm);
  if (!msg) { locStatus.classList.remove('show'); return; }
  locStatus.textContent = msg;
  locStatus.classList.add('show');
  if (autoHideMs) statusHideTm = setTimeout(() => locStatus.classList.remove('show'), autoHideMs);
}

/* GPS 좌표 수신(공원 안·필터/스무딩 통과분) — 캐릭터 이동·애니메이션 */
function onTrackerFix(f) {
  banner.classList.remove('show');
  locBtn.classList.add('on');
  setMe(f.x, f.z, f.accM, { instant: !meLast }); // 첫 좌표만 스냅, 이후엔 frame()에서 부드럽게
  meRun = f.animState === 'run';
  if (meLast && f.moved) {
    const mdx = f.x - meLast[0], mdz = f.z - meLast[1];
    if (Math.hypot(mdx, mdz) > 0.5) {
      mePhase += Math.hypot(mdx, mdz) * (meRun ? 0.55 : 0.4);
      lastMoveTs = Date.now();
      meChibi.setPhase(mePhase, meRun); // 속도에 따라 walk/run 진폭
      meChibi.setHeading(Math.atan2(mdx, mdz)); // 이동 방향으로 회전 (동→오른쪽, 서→왼쪽)
      setHeadingCone(Math.atan2(mdx, -mdz) * 180 / Math.PI);
    }
  }
  meLast = [f.x, f.z];
}

/* 추적 상태 → 어린이 친화 문구 */
function onTrackerState(state, extra) {
  if (state === 'requesting') {
    showStatus('📡 캐릭터가 지금 있는 곳을 찾고 있어요…');
  } else if (state === 'tracking') {
    if (extra.lowAccuracy) showStatus('📡 위치를 조금 더 정확하게 찾는 중이에요. 잠시만 기다려주세요');
    else showStatus('📍 캐릭터가 내 위치를 따라오고 있어요', 3000);
  } else if (state === 'outsidePark') {
    meG.visible = false;
    meLast = null;
    showStatus('');
    bannerMsg.innerHTML = extra.nearPark ? NEAR_MSG : OUT_MSG;
    banner.classList.add('show');
  } else if (state === 'denied') {
    locBtn.classList.remove('on');
    meG.visible = false;
    showStatus('');
    if (!deniedOnce) { toast('위치 권한 없이도 지도는 자유롭게 볼 수 있어요'); deniedOnce = true; }
    bannerMsg.innerHTML = DENIED_MSG;
    banner.classList.add('show');
  } else if (state === 'timeout' || state === 'unavailable') {
    showStatus('📡 위치를 찾지 못했어요. 하늘이 보이는 곳에서 다시 시도해 주세요', 5000);
    if (state === 'unavailable') { locBtn.classList.remove('on'); meG.visible = false; }
  } else if (state === 'idle') {
    locBtn.classList.remove('on');
    showStatus('');
  }
}

const tracker = createLocationTracker({
  project: prj,
  isInPark: inPark,
  onFix: onTrackerFix,
  onState: onTrackerState,
});

/* 위치 권한 사전 안내 — 브라우저 권한 창이 갑자기 뜨지 않게 자체 안내를 먼저 */
const PERM_INTRO_KEY = 'quest.geo.intro.v1';
async function geoPermGranted() {
  try {
    const st = await navigator.permissions.query({ name: 'geolocation' });
    return st.state === 'granted';
  } catch (_) { return false; } // 미지원 브라우저 — 안내를 먼저 보여줌
}
function startTracking() {
  enableCompass(); // 사용자 제스처 시점에 나침반 권한도 함께
  meLast = null;
  tracker.start();
}
$('permStart').addEventListener('click', () => {
  localStorage.setItem(PERM_INTRO_KEY, '1');
  $('permWrap').classList.remove('open');
  startTracking();
});
$('permLater').addEventListener('click', () => $('permWrap').classList.remove('open'));
$('permBack').addEventListener('click', () => $('permWrap').classList.remove('open'));

locBtn.addEventListener('click', async () => {
  if (demo) { exitDemo(); return; }
  if (tracker.active) {
    tracker.stop();
    meG.visible = false;
    meLast = null;
    return;
  }
  if (!('geolocation' in navigator)) { toast('이 기기는 위치를 지원하지 않아요'); return; }
  if (!localStorage.getItem(PERM_INTRO_KEY) && !(await geoPermGranted())) {
    $('permWrap').classList.add('open');
    return;
  }
  startTracking();
});

/* 백그라운드/화면 잠금 복귀 시 — 좌표가 오래 끊겼으면 추적 재시작 */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tracker.restartIfStale();
});

/* 네트워크 상태 — GPS와 별개로 구분 안내 (지도·탐험은 오프라인 캐시로 동작) */
window.addEventListener('offline', () => toast('인터넷이 잠시 끊겼어요. 지도와 탐험 기록은 계속돼요'));
window.addEventListener('online', () => toast('인터넷이 다시 연결됐어요'));

$('demoBtn').addEventListener('click', () => {
  if (tracker.active) tracker.stop(); // 시뮬레이션과 실제 GPS가 동시에 적용되지 않게
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
let simSpeedMult = 1; // __sim.speed() — 산책 데모 배속 (개발·시연용)
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
  if (tracker.active) tracker.stop();
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

/* 개발·시연용 GPS 시뮬레이터 훅 (콘솔 전용 — __walk·__quests와 동일 계열)
   acc(m): 정확도 값 조절 / teleport(lat,lon): 좌표 이동 / speed(n): 산책 배속 / outside(): 공원 밖 상태 테스트 */
let simAccM = 0;
window.__sim = {
  source: () => (walking || demo ? 'simulation' : tracker.active ? 'gps' : 'none'),
  acc(m) {
    simAccM = m;
    const p = myPos();
    if (p) setMe(p[0], p[1], m);
    return m;
  },
  teleport(lat, lon) {
    if (tracker.active) tracker.stop();
    if (!demo) { demo = true; demoTag.classList.add('show'); locBtn.classList.add('on'); }
    const [x, z] = prj(lat, lon);
    if (inPark(x, z, 20)) {
      banner.classList.remove('show');
      setMe(x, z, simAccM);
      camCtl.target.set(x, 0, z);
      camCtl.apply();
    } else {
      bannerMsg.innerHTML = OUT_MSG;
      banner.classList.add('show');
      meG.visible = false;
    }
    return [x, z];
  },
  speed(mult) { simSpeedMult = mult; return mult; },
  outside() {
    bannerMsg.innerHTML = OUT_MSG;
    banner.classList.add('show');
    meG.visible = false;
  },
};

/* ─── 가족 공유 ─── */
const famApi = initFamily({
  scene,
  camera,
  myPos,
  getName: () => avatarCfg.name || '',
  setName: (v) => { avatarCfg.name = v.slice(0, 8); saveAvatar(avatarCfg); },
  getAv: () => ({ gender: avatarCfg.gender, dress: avatarCfg.dress, top: avatarCfg.top, bottom: avatarCfg.bottom, gear: avatarCfg.gear }),
});

/* ─── 탐험 시스템 ─── */
let qui = null;
const quests = initQuests({ onNear: (spot, fresh) => { if (qui) qui.onNear(spot, fresh); } });

/* ─── 마을 안 내부 지도 ─── */
const interior = createInterior({
  renderer,
  makeChibi: () => buildAvatar(avatarCfg, 1.25),
  onAnimalTap: (animalId, spot) => qui.openAnimal(animalId, spot),
  onAnimalNear: (animalId) => qui.onAnimalNear(animalId),
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
  $('frame').classList.add('inZone');
  $('zoneName').textContent = `${spot.emoji} ${spot.name}`;
  const quizLeft = quests.quizAnimalsFor(spot.id).some((a) => !quests.animalQuizDone(a));
  $('hud').innerHTML = quizLeft
    ? '<span style="font-size:22px">👣</span><div>오늘 이 마을 친구 <b>한두 명이 🎓 퀴즈를 준비</b>했어요!<br>누굴까요? 우리 가까이 가면 튀어나와요 — 풀면 <b>📔 발견일지</b>에!</div>'
    : '<span style="font-size:22px">👣</span><div>오늘 이 마을의 퀴즈는 끝났어요!<br>동물 친구를 톡 눌러 <b>📷 사진·✏️ 한 줄</b>로 추억을 남겨봐요</div>';
  interior.enter(spot);
  trackEnterSpot(spot.id); // 마을 안 체류시간 귀속
  qui.refresh();
  toast(`${spot.emoji} ${spot.name}에 들어왔어요!`);
}
function exitZone() {
  trackExitSpot();
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
initChat();
setHudRefresh(qui.refresh);
resize();
window.__quests = quests; // 콘솔 디버그·시연용
window.__interior = interior;

/* ─── UI ─── */
updateHud();
initAuthUI();   // 회원가입·로그인 창 (리캡 화면과 캐릭터 만들기 창에서 연다)
initAutoSync(); // 로그인 상태면 기록이 바뀔 때마다 계정에 자동 저장
$('sheetBack').addEventListener('click', () => $('sheetWrap').classList.remove('open'));

/* ─── 내 캐릭터 만들기 창 ───
   들어올 때마다 띄운다 — 나이·오늘 머무는 시간은 방문마다 달라지고, 그 답으로 오늘의 탐험을 짜기 때문.
   저장돼 있던 값은 그대로 채워져 있어 그대로 [저장]만 눌러도 된다.
   앱 안의 다른 페이지(도감·사육사 화면)에서 돌아온 것은 같은 방문이므로 다시 띄우지 않는다.
   튜토리얼은 이 창을 닫은 뒤에 시작해야 두 창이 겹치지 않는다. */
let sameVisitReturn = false;
try { sameVisitReturn = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (_) { /* 잘못된 referrer → 새 방문으로 */ }
const qs = new URLSearchParams(location.search);
const autoOpen = !sameVisitReturn && !qs.get('seed') && !qs.get('walk'); // 시연·영상 캡처 모드는 방해하지 않는다
const tutorial = initTutorial({ auto: !autoOpen });

let creator = null, creatorAuto = false;
function openCreator(auto) {
  if (creator) return;
  creatorAuto = auto;
  $('createWrap').classList.add('open');
  creator = mountCreator($('createBody'), {
    saveLabel: auto ? '✅ 저장하고 탐험 시작!' : '✅ 저장하고 지도로!',
    skipLabel: auto ? '나중에 만들래요' : '',
    showTypesLink: !auto, // 들어오자마자 도감으로 새어 나가지 않게
    onSave: closeCreator,
    onSkip: closeCreator,
  });
  creator.resize(); // 모달이 열린 뒤에야 실제 크기를 알 수 있다
}
function closeCreator() {
  if (!creator) return;
  creator.dispose();
  creator = null;
  $('createWrap').classList.remove('open');
  quests.refreshPlan(); // 나이·체류 예정시간이 바뀌었으면 오늘 배정을 다시 계산
  qui.refresh();
  if (creatorAuto && !localStorage.getItem(KEYS.tutorial)) tutorial.open();
}
$('createClose').addEventListener('click', closeCreator);
$('createBack').addEventListener('click', closeCreator);
$('dressBtn').addEventListener('click', () => openCreator(false));
if (autoOpen) openCreator(true);

/* 탐험 완료(퀴즈 정답·발견 완성 등) → 2초 축하 점프 (questUI가 발화) */
let celebrateUntil = 0;
window.addEventListener('quest-celebrate', () => { celebrateUntil = Date.now() + 2000; });

/* ─── 메인 루프 ─── */
let prevTs = 0;
function frame(ts) {
  const t = ts / 1000;
  const dt = Math.min(0.1, prevTs ? t - prevTs : 0.016);
  prevTs = t;

  if (walking && !recording) {
    walkS += dt * WALK_SPEED * simSpeedMult;
    renderWalk();
    if (walkS >= ROUTE_LEN) { stopWalk(); toast('🎉 산책 완주! 랜드마크를 모두 지나왔어요'); }
  }

  markers.update(t, camera);
  famApi.update(dt, t);

  // 파랑 펄스 링
  const ph = (t % 1.6) / 1.6;
  pulse.scale.setScalar(6 + ph * 12);
  pulse.material.opacity = 0.7 * (1 - ph);

  // GPS 좌표 갱신 시 캐릭터가 순간이동하지 않게 목표 좌표로 미끄러지듯 이동
  // (데모 탭·산책은 setMe가 즉시 스냅하므로 여기선 보정량 0)
  if (meG.visible && meTarget) {
    const k = 1 - Math.exp(-8 * dt);
    meG.position.x += (meTarget[0] - meG.position.x) * k;
    meG.position.z += (meTarget[1] - meG.position.z) * k;
  }

  if (!walking && meG.visible && Date.now() < celebrateUntil) meChibi.celebrate(t); // 탐험 완료 축하 점프
  else if (!walking && meG.visible && Date.now() - lastMoveTs > 400) meChibi.idle(t);
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

if (qs.get('walk') === '1') startWalk(false);

/* ?seed=1 — 리캡 시연: 오늘 기록이 비어 있으면 시연 데이터를 채우고 스토리를 바로 연다.
   실기록이 이미 있으면 주입 없이 스토리만 연다 (실사용 데이터 보호). */
if (qs.get('seed') === '1') {
  import('./story.js').then(({ openStory }) => {
    localStorage.setItem('quest.tutorial.v2', '1'); // 시연 중 튜토리얼 생략
    $('tuto').classList.remove('show');
    if (!quests.visit.done.length) {
      quests.answerQuiz('tiger', 0);    // 오답
      quests.answerQuiz('elephant', 0); // 오답
      quests.answerQuiz('lion', 0);     // 정답
      quests.answerQuiz('alpaca', 1);   // 정답
      quests.completeDwell('palgak', '전망대에서 공원을 다 내려다봤어요');
      quests.saveObserve('minivillage', '수달이 돌멩이를 공처럼 굴리며 놀고 있었어요', null);
      const def = quests.discovery().def;
      for (const t of def.targets.slice(0, def.need)) quests.addDiscoveryPhoto(t, null);
      qui.refresh(); // 주입한 기록을 HUD 진행률에 즉시 반영 (시연 화면이 0/N으로 보이지 않게)
    }
    let tr = null;
    try { tr = JSON.parse(localStorage.getItem('quest.track.v1')); } catch (_) { /* 손상 → 새로 */ }
    const today = quests.visit.date;
    if (!tr || tr.date !== today || tr.pts.length < 2) { // 실트랙 없을 때만 시연 동선
      const pts = MAP.walkRoute.filter((_, i) => i % 2 === 0).map(([x, z], i) => [x, z, i * 30]);
      localStorage.setItem('quest.track.v1', JSON.stringify({
        date: today, t0: Date.now() - 9240000, pts, distM: 3100,
        staySec: { predator: 2520, minivillage: 610, tropical: 300, palgak: 480, botanic: 900 },
        spotOrder: ['minivillage', 'predator', 'tropical', 'palgak', 'botanic'],
        activeSec: 9240,
      }));
    }
    setTimeout(() => openStory(quests), 400);
  });
}
