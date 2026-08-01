/* 오늘의 리캡 스토리 — 인스타 스토리형 풀스크린 슬라이드 (1화면 1동물)
   화면 표시와 공유 이미지는 같은 1080x1920 캔버스 하나로 렌더(WYSIWYG) */
import { ANIMALS } from './quests-data.js';
import { getPhoto } from './store.js';
import { toast } from './ui.js';

const $ = (id) => document.getElementById(id);
const W = 1080, H = 1920;
const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

/* spot별 이모지 폴백 배경 그라디언트 */
const SPOT_BG = {
  predator: ['#f5d8a8', '#c98f4e'], herbivore: ['#dcedc8', '#8bc34a'],
  minivillage: ['#ffe0e6', '#f48fb1'], tropical: ['#c8e6c9', '#4caf50'],
  sea: ['#b3e5fc', '#0288d1'], monkeyvillage: ['#ffe0b2', '#fb8c00'],
  birdcage: ['#e1f5fe', '#4fc3f7'],
};

let slides = [], idx = 0, blobs = [], renderSeq = 0;

/* ── 슬라이드 데이터 ── */
async function buildSlides(quests) {
  const r = quests.recap();
  const v = r.visit;
  const dex = quests.dexList();
  const out = [{ kind: 'intro', n: v.n, met: r.metCount, date: v.date,
    newAnimals: r.newAnimals.map((id) => ANIMALS[id]),
    emojis: v.met.map((id) => ANIMALS[id].emoji) }];

  for (const id of v.met) {
    const a = ANIMALS[id];
    const photoLog = [...v.done].reverse().find((d) => d.type === 'photo' && d.animal === id && d.photo);
    const dexEntry = dex.find((x) => x.id === id);
    const dexPhoto = dexEntry?.met?.first === v.date ? dexEntry.met.photo : null;
    const quiz = v.done.find((d) => d.type === 'quiz' && d.animal === id) || null;
    out.push({ kind: 'animal', id, name: a.name, emoji: a.emoji, spot: a.spot,
      photoId: photoLog?.photo || dexPhoto || null, quiz, note: null });
  }

  /* 한줄평·관찰노트를 동물 슬라이드에 부착 — animal 필드 우선, 구 기록은 spot 매칭 */
  for (const d of v.done.filter((x) => (x.type === 'note' || x.type === 'observe') && x.text)) {
    const s = out.find((sl) => sl.kind === 'animal' && !sl.note &&
      (d.animal ? sl.id === d.animal : ANIMALS[sl.id].spot === d.spot));
    if (s) { s.note = d.text; if (!s.photoId && d.photo) s.photoId = d.photo; }
  }

  out.push({ kind: 'outro', type: r.type, n: v.n, met: r.metCount, dexTotal: r.dexTotal });
  return out;
}

/* ── 캔버스 유틸 ── */
function drawCover(ctx, img) {
  const s = Math.max(W / img.width, H / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/* 한글 대응 글자 단위 줄바꿈 */
function wrapText(ctx, text, maxW, maxLines = 0) {
  const lines = []; let line = '';
  for (const ch of String(text)) {
    if (ch === '\n' || ctx.measureText(line + ch).width > maxW) {
      lines.push(line); line = ch === '\n' ? '' : ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  if (maxLines && lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].slice(0, -1) + '…';
    return cut;
  }
  return lines;
}

function scrim(ctx) {
  let g = ctx.createLinearGradient(0, 0, 0, 430);
  g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 430);
  g = ctx.createLinearGradient(0, H - 650, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.68)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 650, W, 650);
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bgGradient(ctx, from, to) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, from); g.addColorStop(1, to);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function emojiBg(ctx, slide) {
  const [from, to] = SPOT_BG[slide.spot] || ['#dcedc8', '#8bc34a'];
  bgGradient(ctx, from, to);
  ctx.font = `560px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(slide.emoji, W / 2, H / 2 - 120);
}

function watermark(ctx, n) {
  ctx.font = `700 32px ${FONT}`;
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(`🌳 공원 원정대 · ${n}번째 탐험`, W - 50, H - 50);
}

/* ── 슬라이드 렌더 ── */
function renderIntro(ctx, s) {
  bgGradient(ctx, '#2e6b34', '#8fce7a');
  ctx.textBaseline = 'alphabetic';
  /* 오늘 만난 동물 이모지 흩뿌리기 */
  ctx.globalAlpha = 0.35;
  ctx.font = `170px ${FONT}`; ctx.textAlign = 'center';
  const pos = [[160, 320], [900, 260], [190, 1620], [880, 1700], [540, 190], [140, 1000], [940, 1050], [560, 1820]];
  s.emojis.slice(0, 8).forEach((e, i) => ctx.fillText(e, pos[i][0], pos[i][1]));
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = `800 60px ${FONT}`;
  ctx.fillText('오늘 탐험 끝!', W / 2, 700);
  ctx.font = `800 100px ${FONT}`;
  ctx.fillText(`${s.n}번째 탐험`, W / 2, 850);
  ctx.font = `700 58px ${FONT}`;
  ctx.fillText(`오늘 만난 동물 ${s.met}종`, W / 2, 990);
  if (s.newAnimals.length) {
    ctx.font = `600 46px ${FONT}`;
    ctx.fillText('새로 만난 친구', W / 2, 1130);
    /* 이름 단위 줄바꿈 — 이름 중간에서 끊기지 않게 */
    const lines = []; let line = '';
    for (const a of s.newAnimals) {
      const item = `${a.emoji} ${a.name}`;
      const cand = line ? `${line}  ${item}` : item;
      if (line && ctx.measureText(cand).width > W - 200) { lines.push(line); line = item; }
      else line = cand;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 1210 + i * 66));
  }
  ctx.font = `600 42px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(s.date, W / 2, 1550);
  watermark(ctx, s.n);
}

function renderAnimal(ctx, s, img, isUserPhoto, n) {
  if (img) drawCover(ctx, img); else emojiBg(ctx, s);
  scrim(ctx);

  /* 상단: 동물 이름 */
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(`${s.emoji} ${s.name}`, 60, 160);
  ctx.font = `600 36px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText(isUserPhoto ? '📷 오늘 내가 찍은 사진' : img ? '🎨 리니워니가 그려준 그림이에요' : '', 64, 225);

  /* 퀴즈 카드 */
  if (s.quiz) {
    ctx.font = `700 44px ${FONT}`;
    const qLines = wrapText(ctx, s.quiz.q, W - 260, 3);
    ctx.font = `600 40px ${FONT}`;
    const eLines = wrapText(ctx, s.quiz.explain, W - 260, 4);
    const pad = 46, lh1 = 62, lh2 = 56;
    const cardH = pad + qLines.length * lh1 + 26 + eLines.length * lh2 + pad;
    const y0 = 300;
    ctx.fillStyle = 'rgba(255,255,255,.93)';
    rrect(ctx, 70, y0, W - 140, cardH, 34); ctx.fill();
    ctx.fillStyle = '#2e6b34'; ctx.font = `700 44px ${FONT}`;
    qLines.forEach((l, i) => ctx.fillText(`${i === 0 ? (s.quiz.correct ? '⭕ ' : '🌱 ') : ''}${l}`, 110, y0 + pad + 30 + i * lh1));
    ctx.fillStyle = '#445'; ctx.font = `600 40px ${FONT}`;
    eLines.forEach((l, i) => ctx.fillText(l, 110, y0 + pad + 30 + qLines.length * lh1 + 20 + i * lh2));
  }

  /* 하단: 한줄평 */
  if (s.note) {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = `700 50px ${FONT}`;
    const lines = wrapText(ctx, `❝ ${s.note} ❞`, W - 180, 4);
    const y0 = H - 190 - (lines.length - 1) * 70;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * 70));
  }
  watermark(ctx, n);
}

function renderOutro(ctx, s) {
  bgGradient(ctx, '#1d4a24', '#2e6b34');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `300px ${FONT}`;
  ctx.fillText(s.type.emoji, W / 2, 780);
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText('오늘의 모험 유형', W / 2, 950);
  ctx.font = `800 88px ${FONT}`;
  ctx.fillText(s.type.name, W / 2, 1080);
  ctx.font = `600 44px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.9)';
  wrapText(ctx, s.type.desc, W - 240, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1180 + i * 62));
  ctx.fillStyle = '#fff'; ctx.font = `700 54px ${FONT}`;
  ctx.fillText(`발견일지 총 ${s.dexTotal}종 달성!`, W / 2, 1400);
  ctx.font = `600 44px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText('다음 탐험에서 또 만나! 👋', W / 2, 1520);
  watermark(ctx, s.n);
}

/* 이미지 로드: 사용자 사진(dataURL) → AI 그림 → null(이모지 폴백) */
function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderSlide(i) {
  const cv = $('storyCv'), ctx = cv.getContext('2d');
  const s = slides[i];
  const seq = ++renderSeq;
  const n = slides[0].n;

  ctx.clearRect(0, 0, W, H);
  if (s.kind === 'intro') renderIntro(ctx, s);
  else if (s.kind === 'outro') renderOutro(ctx, s);
  else {
    /* 1차: 이모지 배경으로 즉시 표시 → 이미지 로드되면 재렌더 */
    renderAnimal(ctx, s, null, false, n);
    let img = null, isUser = false;
    if (s.photoId) {
      const dataUrl = await getPhoto(s.photoId);
      if (dataUrl) { img = await loadImg(dataUrl); isUser = !!img; }
    }
    if (!img) img = await loadImg(`img/animals/${s.id}.jpg`);
    if (seq !== renderSeq) return; // 다른 슬라이드로 넘어감
    if (img) renderAnimal(ctx, s, img, isUser, n);
  }
  /* 공유용 blob 캐시 (user-gesture 제약 대응) */
  cv.toBlob((b) => { if (seq === renderSeq) blobs[i] = b; }, 'image/jpeg', 0.9);
}

/* ── 내비게이션 ── */
function updateBars() {
  const bars = $('storyBars').children;
  for (let i = 0; i < bars.length; i++) {
    bars[i].classList.toggle('done', i < idx);
    bars[i].firstChild.style.width = i < idx ? '100%' : i === idx ? '100%' : '0';
    if (i === idx) bars[i].classList.remove('done');
  }
}

function go(dir) {
  const next = idx + dir;
  if (next < 0) return;
  if (next >= slides.length) { closeStory(); return; }
  idx = next;
  updateBars();
  renderSlide(idx);
}

function closeStory() {
  $('storyWrap').classList.remove('open');
  renderSeq++;
}

/* ── 공유 ── */
async function shareCurrent() {
  const b = blobs[idx];
  if (!b) { toast('잠시만요, 장면을 준비하고 있어요'); return; }
  const s = slides[idx];
  const name = s.kind === 'animal' ? s.id : s.kind;
  const file = new File([b], `recap-${slides[0].date}-${name}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (_) { /* 취소 */ }
  } else {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('이미지를 저장했어요! 인스타에 올려봐요 📸');
  }
}

/* ── 진입점 ── */
let bound = false;
export async function openStory(quests) {
  slides = await buildSlides(quests);
  idx = 0; blobs = [];

  const wrap = $('storyWrap');
  const cv = $('storyCv');
  cv.width = W; cv.height = H;

  const bars = $('storyBars');
  bars.innerHTML = slides.map(() => '<i><b></b></i>').join('');

  if (!bound) {
    bound = true;
    $('storyClose').addEventListener('click', closeStory);
    $('storyShare').addEventListener('click', shareCurrent);
    const hit = $('storyHit');
    let px = 0, pt = 0;
    hit.addEventListener('pointerdown', (e) => { px = e.clientX; pt = Date.now(); });
    hit.addEventListener('pointerup', (e) => {
      const dx = e.clientX - px, dt = Date.now() - pt;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      else if (dt < 350) go(e.clientX < window.innerWidth * 0.35 ? -1 : 1);
    });
  }

  /* 오늘 만난 동물의 AI 그림 프리로드 (런타임 캐시에 적재) */
  slides.filter((s) => s.kind === 'animal' && !s.photoId)
    .forEach((s) => { new Image().src = `img/animals/${s.id}.jpg`; });

  wrap.classList.add('open');
  updateBars();
  renderSlide(0);
}
