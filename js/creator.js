/* 캐릭터 만들기 UI — 지도 첫 진입 모달(index.html)과 꾸미기 페이지(customize.html)가 함께 쓴다.
   문구·순서·저장 규칙이 한 곳에만 있어야 두 화면이 어긋나지 않는다.
   mountCreator(root, opts) → { dispose() }  (모달을 닫을 땐 반드시 dispose — WebGL 컨텍스트 정리) */
import * as THREE from 'three';
import { buildAvatar, loadAvatar, saveAvatar, TOPS, BOTTOMS } from './character.js';
import { basesFor, baseImagePath, parseComboId, getCombo } from './explorer-types.mjs';
import { stayBandOf } from './mission-score.mjs';
import { loadJSON, saveJSON } from './store.js';
import { session, logout } from './account.js';

const P_KEY = 'quest.profile.v1';

const CSS = `
.creator { display: block; }
.creator .chead { padding: 4px 4px 10px; }
.creator .chead h1 { font-size: 19px; color: #2e6b34; }
.creator .chead p { font-size: 12px; color: #6a8a70; margin-top: 4px; line-height: 1.5; }
.creator .chead a { font-size: 12px; color: #2e6b34; font-weight: 700; }
.creator .preview { display: block; width: 100%; height: 280px; touch-action: pan-y; }
.creator .panel { margin: 0 0 12px; background: #ffffffee; border-radius: 18px; padding: 14px 16px;
  box-shadow: 0 3px 12px rgba(0,0,0,.08); }
.creator .panel h3 { font-size: 12px; color: #7ba381; margin-bottom: 8px; }
.creator .opts { display: flex; gap: 8px; flex-wrap: wrap; }
.creator .opts button {
  flex: 1; min-width: 100px; border: 2px solid #e2e8e2; border-radius: 14px; background: #fff;
  font-size: 14px; font-weight: 700; color: #445; padding: 12px 8px; cursor: pointer;
}
.creator .opts button.sel { border-color: #2e6b34; background: #eef7e8; color: #2e6b34; }
.creator .opts button:disabled { opacity: .35; cursor: default; }
.creator .swatch { display: inline-block; width: 12px; height: 12px; border-radius: 4px;
  margin-right: 6px; vertical-align: -1px; }
.creator .baseOpts { display: flex; gap: 10px; }
.creator .baseOpts button {
  flex: 1; border: 2px solid #e2e8e2; border-radius: 16px; background: #fff;
  padding: 10px 6px 12px; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; gap: 6px;
}
.creator .baseOpts button.sel { border-color: #2e6b34; background: #eef7e8; }
.creator .baseOpts img { width: 84px; height: 104px; object-fit: contain; }
.creator .baseOpts .bn { font-size: 13px; font-weight: 800; color: #445; }
.creator .baseOpts button.sel .bn { color: #2e6b34; }
.creator .gearNote {
  margin-top: 10px; background: #f2f8ee; border: 1px solid #dbe9d5; border-radius: 12px;
  padding: 9px 11px; font-size: 12px; color: #4d6b52; line-height: 1.55; display: none;
}
.creator .nameInput {
  width: 100%; border: 2px solid #e2e8e2; border-radius: 14px; padding: 12px 14px; font-size: 15px;
}
.creator .stayNote { font-size: 12px; color: #6a8a70; margin-top: 8px; line-height: 1.55; }
.creator .authPanel { display: flex; align-items: center; gap: 10px; }
.creator .authPanel p { flex: 1; font-size: 12.5px; color: #4d6b52; line-height: 1.5; margin: 0; }
.creator .authPanel b { color: #2e6b34; }
.creator .authPanel button {
  flex: none; border: 2px solid #2e6b34; border-radius: 12px; background: #2e6b34; color: #fff;
  font-size: 13px; font-weight: 800; padding: 10px 14px; cursor: pointer; white-space: nowrap;
}
.creator .authPanel button.ghost { background: #fff; color: #2e6b34; font-size: 12px; padding: 8px 11px; }
.creator .saveBtn {
  display: block; width: 100%; border: 0; border-radius: 16px;
  background: #2e6b34; color: #fff; font-size: 16px; font-weight: 800; padding: 15px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(46,107,52,.35);
}
.creator .skipBtn {
  display: block; width: 100%; margin-top: 12px; border: 0; background: none;
  font-size: 12px; color: #7ba381; text-align: center; cursor: pointer;
}
`;

function styleOnce() {
  if (document.getElementById('creatorCss')) return;
  const st = document.createElement('style');
  st.id = 'creatorCss';
  st.textContent = CSS;
  document.head.appendChild(st);
}

function markup({ saveLabel, showTypesLink, skipLabel }) {
  return `
  <div class="chead">
    <h1>👕 내 캐릭터 만들기</h1>
    <p>지도 위를 걸어다닐 나만의 캐릭터를 꾸며 보세요!</p>
    ${showTypesLink ? '<p style="margin-top:6px"><a href="characters.html">🧢 16가지 탐험 유형 도감 구경하기 →</a></p>' : ''}
  </div>
  <canvas class="preview"></canvas>

  <div class="panel">
    <h3>성별</h3>
    <div class="opts genderOpts">
      <button data-v="m">👦 남자</button>
      <button data-v="f">👧 여자</button>
    </div>
  </div>

  <div class="panel">
    <h3>기본 캐릭터 고르기</h3>
    <div class="baseOpts"></div>
    <div class="gearNote">
      지금은 탐험으로 해금한 <b class="gearName">유형 캐릭터</b>를 쓰고 있어요.
      위에서 기본 캐릭터를 고르면 기본 모습으로 돌아가요.
    </div>
  </div>

  <div class="panel spriteNote" style="display:none">
    <h3>🧢 유형 캐릭터</h3>
    <p style="font-size:12.5px;color:#5d7a63;line-height:1.6;margin:0">
      공원을 탐험하고 리캡에서 <b>오늘의 탐험 유형</b>이 정해지면 그 유형의 캐릭터가 해금돼요.
      해금한 캐릭터는 도감에서 언제든 바꿔 쓸 수 있어요.
      <a href="characters.html" style="color:#2e6b34;font-weight:700">유형 도감 보기 →</a>
    </p>
  </div>

  <div class="panel authPanel"></div>

  <div class="panel stylePanel">
    <h3>스타일</h3>
    <div class="opts styleOpts">
      <button data-v="basic">👕 티셔츠 + 바지</button>
      <button data-v="dress">👗 원피스</button>
    </div>
  </div>

  <div class="panel topPanel">
    <h3>상의</h3>
    <div class="opts topOpts"></div>
  </div>

  <div class="panel bottomPanel">
    <h3>하의</h3>
    <div class="opts bottomOpts"></div>
  </div>

  <div class="panel">
    <h3>이름 (가족 지도에 함께 표시돼요)</h3>
    <input class="nameInput" maxlength="8" placeholder="예: 민준" autocomplete="off">
  </div>

  <div class="panel">
    <h3>나이 (딱 맞는 탐험과 퀴즈를 준비해요)</h3>
    <div class="opts ageOpts">
      <button data-v="5">5~7살</button>
      <button data-v="8">8~10살</button>
      <button data-v="11">11살~</button>
    </div>
  </div>

  <div class="panel">
    <h3>오늘 얼마나 머무를 예정인가요? (탐험 개수를 맞춰 드려요)</h3>
    <div class="opts stayOpts">
      <button data-v="60">30분~1시간</button>
      <button data-v="120">1~2시간</button>
      <button data-v="180">2~3시간</button>
      <button data-v="240">3시간 이상</button>
    </div>
    <p class="stayNote"></p>
  </div>

  <button class="saveBtn">${saveLabel}</button>
  ${skipLabel ? `<button class="skipBtn">${skipLabel}</button>` : ''}`;
}

/* root 안에 캐릭터 만들기 화면을 그린다.
   onSave(cfg, profile): 저장 직후 호출 (모달 닫기·페이지 이동 등은 호출한 쪽이 결정)
   onSkip: 주면 '건너뛰기' 버튼이 생긴다 (첫 진입 모달용) */
export function mountCreator(root, { saveLabel = '✅ 저장하고 지도로!', skipLabel = '', showTypesLink = true, onSave, onSkip } = {}) {
  styleOnce();
  root.classList.add('creator');
  root.innerHTML = markup({ saveLabel, showTypesLink, skipLabel });
  const q = (sel) => root.querySelector(sel);

  const cfg = loadAvatar();
  const profile = loadJSON(P_KEY, { age: null });

  /* ─── 미리보기 씬 (턴테이블) ─── */
  const canvas = q('.preview');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
  camera.position.set(0, 9, 26);
  camera.lookAt(0, 5.6, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.2));
  const sun = new THREE.DirectionalLight('#fff6e0', 1.5);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6.6, 1, 28),
    new THREE.MeshLambertMaterial({ color: '#bfe0a8' }),
  );
  stage.position.y = -0.55;
  scene.add(stage);

  let chibi = null;
  let disposed = false; // 창을 닫은 뒤 늦게 도착하는 이미지 로딩 콜백이 지워진 DOM을 건드리지 않게
  function rebuild() {
    if (chibi) {
      scene.remove(chibi.group);
      chibi.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          // 캐릭터 이미지 텍스처는 캐시 공유(sharedMap) — dispose 금지
          if (o.material.map && !o.material.userData.sharedMap) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
    chibi = buildAvatar(cfg); // 지도와 동일한 모습(이미지 스프라이트, 실패 시 치비)
    scene.add(chibi.group);
    chibi.ready.then((isSprite) => {
      // 이미지 캐릭터일 땐 옷 선택이 외형에 반영되지 않음 → 패널 숨기고 안내
      if (!isSprite || disposed) return;
      for (const sel of ['.stylePanel', '.topPanel', '.bottomPanel']) q(sel).style.display = 'none';
      q('.spriteNote').style.display = 'block';
    });
  }
  rebuild();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return; // 모달이 닫혀 있는 동안엔 크기가 0
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let raf = 0, prev = 0;
  function frame(ts) {
    const t = ts / 1000;
    const dt = Math.min(0.1, prev ? t - prev : 0.016);
    prev = t;
    chibi.group.rotation.y += dt * 0.9; // 턴테이블
    chibi.setPhase(t * 5);              // 제자리 걷기 (살아있는 느낌)
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  /* ─── 옵션 UI ─── */
  function renderOpts(el, defs, selIdx, onPick, disabled) {
    el.innerHTML = '';
    defs.forEach((d, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="swatch" style="background:${d.color}"></span>${d.label}`;
      if (i === selIdx) b.classList.add('sel');
      b.disabled = !!disabled;
      b.addEventListener('click', () => onPick(i));
      el.appendChild(b);
    });
  }

  /* 기본 캐릭터 2종 — 성별에 맞춰 표시. 고르면 해금 캐릭터(gear)를 벗고 기본 모습으로 */
  function renderBaseOpts() {
    const el = q('.baseOpts');
    el.innerHTML = '';
    for (const b of basesFor(cfg.gender)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (!cfg.gear && cfg.base === b.slot) btn.classList.add('sel');
      btn.innerHTML = `<img src="${baseImagePath(b.gender, b.slot)}" alt="">
        <span class="bn">${b.emoji} ${b.name}</span>`;
      btn.addEventListener('click', () => { cfg.base = b.slot; cfg.gear = null; sync(); });
      el.appendChild(btn);
    }
    const parsed = parseComboId(cfg.gear);
    const gearCombo = parsed ? getCombo(parsed.movement.id, parsed.mission.id) : null;
    q('.gearNote').style.display = gearCombo ? 'block' : 'none';
    if (gearCombo) q('.gearName').textContent = `${gearCombo.animalEmoji} ${gearCombo.koreanName}`;
  }

  /* 로그인 안내 — 지난번에 해금한 캐릭터를 다시 쓰려면 여기서 로그인한다.
     로그인 중이면 아이디와 로그아웃 버튼을 보여준다. */
  function renderAuth() {
    const el = q('.authPanel');
    const s = session();
    el.innerHTML = s
      ? `<p>🔑 <b>${s.username}</b>님으로 로그인 중이에요.<br>발견일지와 캐릭터가 이 아이디에 저장돼요.</p>
         <button type="button" class="ghost">로그아웃</button>`
      : `<p>지난번에 해금한 캐릭터를 사용하려면 로그인을 해주세요!</p>
         <button type="button">🔑 로그인</button>`;
    el.querySelector('button').addEventListener('click', () => {
      if (s) { logout(); return; }
      window.dispatchEvent(new CustomEvent('auth-open', { detail: { mode: 'login' } }));
    });
  }
  renderAuth();
  window.addEventListener('auth-changed', renderAuth);

  function sync() {
    for (const b of q('.genderOpts').children) b.classList.toggle('sel', b.dataset.v === cfg.gender);
    for (const b of q('.styleOpts').children) b.classList.toggle('sel', (b.dataset.v === 'dress') === cfg.dress);
    renderBaseOpts();
    renderOpts(q('.topOpts'), TOPS, cfg.top, (i) => { cfg.top = i; sync(); }, cfg.dress);
    renderOpts(q('.bottomOpts'), BOTTOMS, cfg.bottom, (i) => { cfg.bottom = i; sync(); }, cfg.dress);
    q('.topPanel').style.opacity = cfg.dress ? 0.45 : 1;
    q('.bottomPanel').style.opacity = cfg.dress ? 0.45 : 1;
    rebuild();
  }
  for (const b of q('.genderOpts').children) b.addEventListener('click', () => { cfg.gender = b.dataset.v; sync(); });
  for (const b of q('.styleOpts').children) b.addEventListener('click', () => { cfg.dress = b.dataset.v === 'dress'; sync(); });
  q('.nameInput').value = cfg.name || '';

  const syncAge = () => {
    for (const b of q('.ageOpts').children) b.classList.toggle('sel', profile.age !== null && +b.dataset.v === profile.age);
  };
  for (const b of q('.ageOpts').children) b.addEventListener('click', () => { profile.age = +b.dataset.v; syncAge(); });
  syncAge();

  /* 체류 예정시간 → 오늘 배정할 탐험 개수 (mission-score.mjs가 단일 원천) */
  const syncStay = () => {
    const cur = profile.stayMin ?? null;
    for (const b of q('.stayOpts').children) b.classList.toggle('sel', cur !== null && +b.dataset.v === cur);
    const p = stayBandOf(cur);
    q('.stayNote').textContent = `오늘의 탐험 ${p.animal + p.dwell + (p.disc ? 1 : 0)}개를 준비해요 — 동물마을 ${p.animal}곳 · 쉼터 ${p.dwell}곳${p.disc ? ' · 발견 탐험 1개' : ''}`;
  };
  for (const b of q('.stayOpts').children) b.addEventListener('click', () => { profile.stayMin = +b.dataset.v; syncStay(); });
  syncStay();
  sync();

  q('.saveBtn').addEventListener('click', () => {
    cfg.name = q('.nameInput').value.trim().slice(0, 8);
    saveAvatar(cfg);
    saveJSON(P_KEY, profile);
    window.dispatchEvent(new CustomEvent('avatar-changed')); // 지도 아바타 즉시 반영
    if (onSave) onSave(cfg, profile);
  });
  if (skipLabel && onSkip) q('.skipBtn').addEventListener('click', () => onSkip());

  return {
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('auth-changed', renderAuth);
      renderer.dispose();
      renderer.forceContextLoss(); // 모달을 여러 번 여닫아도 WebGL 컨텍스트가 쌓이지 않게
      root.innerHTML = '';
      root.classList.remove('creator');
    },
  };
}
