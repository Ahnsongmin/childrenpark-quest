/* UI: 바텀시트·HUD·토스트·리니워니 튜토리얼 */
import { ZONES, KEYS } from './config.js';

const $ = (id) => document.getElementById(id);

export const seen = new Set(JSON.parse(localStorage.getItem(KEYS.seen) || '[]'));

export function updateHud() {
  $('hudCount').textContent = seen.size;
}

export function markSeen(id) {
  if (seen.has(id)) return;
  seen.add(id);
  localStorage.setItem(KEYS.seen, JSON.stringify([...seen]));
  updateHud();
}

export function openSheet(lm) {
  $('shEmo').textContent = lm.emoji;
  $('shName').textContent = lm.name;
  const z = $('shZone');
  z.textContent = ZONES[lm.zone].label;
  z.style.background = ZONES[lm.zone].color;
  $('shDesc').textContent = lm.desc;
  $('sheetWrap').classList.add('open');
  markSeen(lm.id);
}

let toastTimer;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ─── 리니워니 튜토리얼 ─── */
const STEPS = [
  { text: '안녕! 우리는 공원 지킴이 <b>리니·워니</b>야! 🌳<br>공원 원정대에 온 걸 환영해!' },
  { text: '먼저 <b>너만의 탐험 캐릭터</b>를 만들어 보자!<br>옷도 갈아입힐 수 있어 👕', action: { label: '👕 캐릭터 만들러 가기', go: 'customize.html' } },
  { text: '지도 위 <b>동글동글 이모지 핀</b>을 눌러 봐.<br>어떤 곳인지 알려줄게! 많이 찾을수록 발견 수가 올라가 🗺️' },
  { text: '공원에 오면 <b>📍 버튼</b>을 눌러 봐.<br>네 캐릭터가 지도 위를 같이 걸어다녀!<br><small>위치 정보는 휴대폰 안에서만 쓰이고 저장되지 않아.</small>' },
  { text: '<b>👪 버튼</b>으로 가족과 함께 보기!<br>초대코드로 연결하면 서로의 위치가 보여서<br>잃어버릴 걱정이 없어. 그럼, 탐험 시작! 🎒' },
];

export function initTutorial() {
  const wrap = $('tuto');
  let step = 0;

  function render() {
    $('tutoText').innerHTML = STEPS[step].text;
    const act = $('tutoAction');
    if (STEPS[step].action) {
      act.style.display = 'block';
      act.textContent = STEPS[step].action.label;
      act.onclick = () => { finish(); location.href = STEPS[step].action.go; };
    } else {
      act.style.display = 'none';
    }
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

  if (!localStorage.getItem(KEYS.tutorial)) open();
}
