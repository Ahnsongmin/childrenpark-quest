/* UI: 바텀시트·HUD·토스트·리니워니 튜토리얼 */
import { ZONES, KEYS } from './config.js';
import { SPOTS, ANIMALS } from './quests-data.js';

const $ = (id) => document.getElementById(id);

export const seen = new Set(JSON.parse(localStorage.getItem(KEYS.seen) || '[]'));

/* HUD는 questUI가 그림 — 여기선 갱신 콜백만 중계 */
let hudCb = null;
export function setHudRefresh(fn) { hudCb = fn; }
export function updateHud() { if (hudCb) hudCb(); }

export function markSeen(id) {
  if (seen.has(id)) return;
  seen.add(id);
  localStorage.setItem(KEYS.seen, JSON.stringify([...seen]));
  updateHud();
}

export function openSheet(lm, gate) {
  $('shEmo').textContent = lm.emoji;
  $('shName').textContent = lm.name;
  const z = $('shZone');
  z.textContent = ZONES[lm.zone].label;
  z.style.background = ZONES[lm.zone].color;
  $('shDesc').textContent = lm.desc;
  const spot = SPOTS.find((s) => (s.lm || s.id) === lm.id);
  const soon = $('shSoon');
  const enter = $('shEnter');
  enter.style.display = spot && spot.kind === 'animal' ? 'block' : 'none';
  if (spot) enter.dataset.spot = spot.id;
  if (spot && spot.kind === 'animal') {
    const g = gate ? gate(spot) : { ok: true };
    enter.disabled = !g.ok;
    enter.textContent = g.ok ? '🚪 마을 안 둘러보기' : '🔒 마을 가까이 가면 열려요';
    soon.innerHTML = `이곳 친구들: ${spot.animals.map((a) => `${ANIMALS[a].emoji} ${ANIMALS[a].name}`).join(' · ')}<br>가까이 가면 탐험이 열릴지도 몰라요!`;
  } else if (spot) {
    soon.textContent = '🍃 잠시 쉬어 가기 좋은 곳이에요. 가까이 가면 쉬어가기 탐험이 열릴 수도!';
  } else {
    soon.textContent = '🧭 탐험하며 천천히 지나가 봐요.';
  }
  $('sheetWrap').classList.add('open');
  markSeen(lm.id);
}

let toastTimer;
export function toast(msg, title) { // title을 주면 두 줄(제목+본문), 줄바꿈 허용·표시 시간 연장
  const t = $('toast');
  t.classList.toggle('multi', !!title);
  t.textContent = '';
  if (title) {
    const b = document.createElement('b');
    b.textContent = title;
    t.append(b, document.createElement('br'), msg);
  } else {
    t.textContent = msg;
  }
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), title ? 4500 : 2600);
}

/* ─── 리니워니 튜토리얼 ─── */
const STEPS = [
  { text: '안녕! 우리는 공원 지킴이 <b>리니·워니</b>야! 🌳<br>공원 원정대에 온 걸 환영해!' },
  { text: '<b>탐험 캐릭터</b>는 언제든 바꿀 수 있어!<br>오른쪽 <b>👕 버튼</b>을 누르면 다시 꾸밀 수 있어.<br><small>나이를 알려주면 딱 맞는 탐험을 준비할게.</small>' },
  { text: '동물 친구 <b>가까이 다가가면 💡탐험</b>이 열려!<br>퀴즈도 풀고, 관찰노트도 남겨봐.<br><small>어디서 열릴지는 비밀 — 매일 달라져!</small>' },
  { text: '공원에 오면 <b>📍 버튼</b>을 눌러 봐.<br>네 캐릭터가 지도 위를 같이 걸어다녀!<br><small>위치 정보는 휴대폰 안에서만 쓰이고 저장되지 않아.</small>' },
  { text: '<b>🎓 퀴즈를 풀면 📔 발견일지</b>에 차곡차곡!<br><b>👪 버튼</b>으로 가족과 함께 보면<br>잃어버릴 걱정도 없어. 그럼, 탐험 시작! 🎒' },
];

/* auto: 아직 안 본 사람에게 바로 열지 여부.
   첫 방문은 캐릭터 만들기 창이 먼저라, main.js가 저장 후 open()을 직접 부른다. */
export function initTutorial({ auto = true } = {}) {
  const wrap = $('tuto');
  let step = 0;

  function render() {
    $('tutoText').innerHTML = STEPS[step].text;
    $('tutoNext').textContent = step === STEPS.length - 1 ? '탐험 시작!' : '다음';
    $('tutoDots').innerHTML = STEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
  }
  function open() {
    step = 0;
    render();
    wrap.classList.add('show');
  }
  function finish() {
    wrap.classList.remove('show');
    localStorage.setItem(KEYS.tutorial, '1');
  }

  $('tutoNext').addEventListener('click', () => {
    if (step === STEPS.length - 1) { finish(); return; }
    step++;
    render();
  });
  $('tutoSkip').addEventListener('click', finish);
  $('helpBtn').addEventListener('click', open);

  if (auto && !localStorage.getItem(KEYS.tutorial)) open();
  return { open };
}
