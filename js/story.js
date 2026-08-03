/* 오늘의 리캡 스토리 — 인스타 스토리형 풀스크린 슬라이드
   구성: ①통계(체류시간·이동거리·동선 배속 재생) ②탐험 n개 완료 ③탐험별 슬라이드
        (교육=오답 복습 / 체류=관람 포인트+다음 추천 / 발견=사진 촤라락 or 정답 공개 / 관찰=기여)
        ④총평(최다 체류 장소) ⑤모험 유형(캐릭터 장비 성장)
   화면 표시와 공유 이미지는 같은 1080x1920 캔버스 하나로 렌더(WYSIWYG) */
/* global MAP */
import * as THREE from 'three';
import { ANIMALS, SPOTS, DWELL_INFO, EXPLORER_TYPES } from './quests-data.js';
import { LANDMARKS } from './config.js';
import { getPhoto } from './store.js';
import { toast } from './ui.js';
import { trackToday, spotPosOf } from './track.js';
import { paintMap } from './ground.js';
import { buildChibi, loadAvatar, saveAvatar } from './character.js';
import { M2U } from './geo.js';

const $ = (id) => document.getElementById(id);
const W = 1080, H = 1920;
const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
/* 팔레트 (리캡 데모 v4 톤) */
const PINE = '#0E2A22', FERN = '#52B788', CREAM = '#FBF6E9', AMBER = '#F2A03D', CORAL = '#E8664F', SKY = '#5BC0BE';

let slides = [], idx = 0, blobs = [], renderSeq = 0;

const spotName = (id) => SPOTS.find((s) => s.id === id)?.name || id;
const lmOf = (id) => LANDMARKS.find((l) => l.id === id) || null;
/* 을/를 조사 — 마지막 한글 글자의 받침 유무로 결정 */
function eulReul(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return '를';
  return (c - 0xAC00) % 28 ? '을' : '를';
}

/* ── 슬라이드 데이터 ── */
async function buildSlides(quests) {
  const r = quests.recap();
  const v = r.visit;
  const tk = trackToday();
  const out = [];

  /* ① 통계 — 트랙이 없으면(위치를 안 켰으면) 활동 스팟 순서를 직선으로 폴백 */
  let pts = tk.pts.map(([x, z]) => [x, z]);
  let spotsOnRoute = tk.spotOrder.map((id) => ({ id, name: spotName(id), pos: spotPosOf(id) })).filter((s) => s.pos);
  if (pts.length < 2) {
    const seen = [];
    for (const d of v.done) if (d.spot && !seen.includes(d.spot)) seen.push(d.spot);
    spotsOnRoute = seen.map((id) => ({ id, name: spotName(id), pos: spotPosOf(id) })).filter((s) => s.pos);
    pts = spotsOnRoute.map((s) => s.pos);
  }
  out.push({
    kind: 'stats', n: v.n, date: v.date,
    activeSec: tk.activeSec, distM: tk.distM, places: Object.keys(tk.staySec).length || spotsOnRoute.length,
    pts, spots: spotsOnRoute,
    hasTrack: tk.activeSec >= 60 && tk.pts.length >= 2,
    metCount: r.metCount,
  });

  /* ② 탐험 요약 */
  const cnt = (type) => v.done.filter((d) => d.type === type).length;
  const counts = { quiz: cnt('quiz'), observe: cnt('observe'), dwell: cnt('dwell'), discovery: cnt('discovery') };
  const total = counts.quiz + counts.observe + counts.dwell + counts.discovery;
  if (total > 0) out.push({ kind: 'count', n: v.n, total, counts });

  /* ③-1 교육 — 오답은 각 1장(복습), 정답은 묶어 1장 */
  const quizzes = v.done.filter((d) => d.type === 'quiz');
  for (const d of quizzes.filter((q) => !q.correct)) {
    const quiz = quests.quizFor(d.animal); // 같은 날엔 결정적으로 같은 문제
    const sameQ = quiz && quiz.q === d.q;
    out.push({
      kind: 'quizWrong', n: v.n, animal: ANIMALS[d.animal],
      q: d.q, explain: d.explain,
      myAnswer: sameQ ? quiz.a[d.choice] : null,
      answer: sameQ ? quiz.a[quiz.correct] : null,
    });
  }
  const rights = quizzes.filter((q) => q.correct);
  if (rights.length) {
    out.push({
      kind: 'quizRight', n: v.n, right: rights.length, total: quizzes.length,
      sample: rights[0], animal: ANIMALS[rights[0].animal],
    });
  }

  /* ③-2 체류 — A스팟 관람 포인트 + 다음 스팟 추천 */
  for (const d of v.done.filter((x) => x.type === 'dwell')) {
    const info = DWELL_INFO[d.spot];
    if (!info) continue;
    const nextId = info.next;
    const a = spotPosOf(d.spot), b = spotPosOf(nextId);
    const walkMin = a && b ? Math.max(1, Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) / M2U / 67)) : null;
    const photoLog = v.done.find((x) => x.spot === d.spot && x.photo);
    out.push({
      kind: 'dwell', n: v.n, spotId: d.spot, name: spotName(d.spot),
      emoji: SPOTS.find((s) => s.id === d.spot)?.emoji || '🍃',
      desc: lmOf(d.spot)?.desc || '', points: info.points, text: d.text || null,
      staySec: tk.staySec[d.spot] || 0, photoId: photoLog?.photo || null,
      next: {
        id: nextId, name: spotName(nextId),
        emoji: SPOTS.find((s) => s.id === nextId)?.emoji || '📍',
        desc: lmOf(nextId)?.desc || '', walkMin,
      },
    });
  }

  /* ③-3 발견 — 완성 시 사진 촤라락, 부분 수행 시 정답 공개 (시도 0이면 생략) */
  const disc = quests.discovery();
  if (disc.def && v.disc.length > 0) {
    const dex = quests.dexList();
    if (disc.done) {
      const items = v.disc.map((id) => ({
        id, name: ANIMALS[id].name, emoji: ANIMALS[id].emoji,
        photoId: dex.find((x) => x.id === id)?.met?.photo
          || [...v.done].reverse().find((x) => x.type === 'photo' && x.animal === id && x.photo)?.photo || null,
      }));
      out.push({ kind: 'discOk', n: v.n, def: disc.def, items });
    } else {
      out.push({
        kind: 'discPart', n: v.n, def: disc.def, got: v.disc,
        answers: disc.def.targets.map((id) => ({ id, name: ANIMALS[id].name, emoji: ANIMALS[id].emoji, desc: ANIMALS[id].desc, found: v.disc.includes(id) })),
      });
    }
  }

  /* ③-4 관찰 — 기여 강조 */
  for (const d of v.done.filter((x) => x.type === 'observe' && x.text)) {
    out.push({
      kind: 'observe', n: v.n, text: d.text,
      who: d.animal ? `${ANIMALS[d.animal].emoji} ${ANIMALS[d.animal].name}` : spotName(d.spot),
      spot: spotName(d.spot),
    });
  }

  /* ④ 총평 — 최다 체류 장소 (동물원은 마을 이름, 그 외는 장소 이름 그대로) */
  const stays = Object.entries(tk.staySec).sort((a, b) => b[1] - a[1]);
  if (stays.length) {
    const [bestId, sec] = stays[0];
    const minutes = Math.round(sec / 60);
    /* 상위 % — 서버 없는 시제품의 규칙 기반 추정치 (본사업 시 실방문 데이터로 대체) */
    const pctTop = minutes >= 25 ? Math.max(5, 30 - Math.round((minutes - 25) * 1.2)) : null;
    out.push({
      kind: 'best', n: v.n, name: spotName(bestId), minutes, pctTop,
      emoji: SPOTS.find((s) => s.id === bestId)?.emoji || '🌳',
    });
  }

  /* ⑤ 모험 유형 + 캐릭터 성장 */
  const type = r.type;
  const lv = quests.recordType(type.id);
  const av = loadAvatar();
  let gearNew = false, offerChoice = false;
  if (!av.gear) {
    av.gear = type.id;
    saveAvatar(av);
    gearNew = true;
    window.dispatchEvent(new CustomEvent('avatar-changed'));
  } else if (av.gear !== type.id) {
    offerChoice = true; // 다회차에 다른 유형 — 원하는 모습을 고르게 (성장 Lv는 별개로 누적)
  } else {
    gearNew = lv === 1;
  }
  out.push({ kind: 'type', n: v.n, type, lv, gearNew, offerChoice, dexTotal: r.dexTotal });

  return out;
}

/* ── 캔버스 유틸 ── */
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
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

function watermark(ctx, n) {
  ctx.font = `700 32px ${FONT}`;
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(`🌳 공원 원정대 · ${n}번째 탐험`, W - 50, H - 50);
}

function eyebrow(ctx, text, y, color = FERN) {
  ctx.font = `800 40px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(text, 70, y);
}

const easeOut = (p) => 1 - Math.pow(1 - p, 3);
/* delay~delay+len 구간 count-up 진행률 */
const phase = (p, delay, len) => easeOut(Math.min(1, Math.max(0, (p - delay) / len)));

/* 이미지 로드 (실패 시 null) */
function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const imgCache = new Map();
async function cachedImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, await loadImg(src));
  return imgCache.get(src);
}

/* ── 미니 지도 (동선 배경) ── */
let miniMap = null; // { canvas, sc, ox, oy }
function getMiniMap() {
  if (miniMap) return miniMap;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const sc = Math.min((W - 120) / MAP.VIEW_W, (H - 420) / MAP.VIEW_H);
  const ox = (W - MAP.VIEW_W * sc) / 2;
  const oy = (H - MAP.VIEW_H * sc) / 2;
  ctx.setTransform(sc, 0, 0, sc, ox, oy);
  paintMap(ctx);
  miniMap = { canvas: c, sc, ox, oy };
  return miniMap;
}

/* ── ① 통계 슬라이드 (동선 배속 재생 + count-up) ── */
function renderStats(ctx, s, p) {
  bgGradient(ctx, '#123D2E', '#0B231C');
  const mm = getMiniMap();
  ctx.globalAlpha = 0.3;
  ctx.drawImage(mm.canvas, 0, 0);
  ctx.globalAlpha = 1;

  /* 동선 폴리라인 — 그려지는 애니메이션 (배속 재생) */
  if (s.pts.length >= 2) {
    const px = (pt) => [mm.ox + pt[0] * mm.sc, mm.oy + pt[1] * mm.sc];
    if (!s._cum) { // 누적 길이·스팟 등장 시점 캐시
      s._cum = [0];
      for (let i = 1; i < s.pts.length; i++) {
        s._cum.push(s._cum[i - 1] + Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]));
      }
      for (const sp of s.spots) {
        let best = 0, bestD = Infinity;
        s.pts.forEach((pt, i) => {
          const d = Math.hypot(pt[0] - sp.pos[0], pt[1] - sp.pos[1]);
          if (d < bestD) { bestD = d; best = i; }
        });
        sp.frac = s._cum[best] / (s._cum[s._cum.length - 1] || 1);
      }
    }
    const totalLen = s._cum[s._cum.length - 1];
    const drawn = totalLen * easeOut(Math.min(1, p * 1.15));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    let tip = px(s.pts[0]);
    ctx.moveTo(...tip);
    for (let i = 1; i < s.pts.length; i++) {
      if (s._cum[i] <= drawn) { tip = px(s.pts[i]); ctx.lineTo(...tip); }
      else {
        const t = (drawn - s._cum[i - 1]) / (s._cum[i] - s._cum[i - 1] || 1);
        tip = px([s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * t,
          s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * t]);
        ctx.lineTo(...tip);
        break;
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 16; // 지도 위 시인성 외곽선
    ctx.stroke();
    ctx.strokeStyle = FERN; ctx.lineWidth = 9;
    ctx.stroke();
    /* 스팟 도트 — 경로가 지나가면 팝 */
    const prog = drawn / (totalLen || 1);
    s.spots.forEach((sp, i) => {
      if (prog < sp.frac) return;
      const [dx, dy] = [mm.ox + sp.pos[0] * mm.sc, mm.oy + sp.pos[1] * mm.sc];
      ctx.fillStyle = i === 0 ? AMBER : i === s.spots.length - 1 ? CORAL : FERN;
      ctx.beginPath(); ctx.arc(dx, dy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.stroke();
    });
    /* 진행 tip — 걷고 있는 나 */
    if (prog < 1) {
      ctx.fillStyle = AMBER;
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
    }
  }

  /* 텍스트 가독성 스크림 */
  const g = ctx.createLinearGradient(0, 300, 0, H);
  g.addColorStop(0, 'rgba(7,16,13,.1)'); g.addColorStop(0.5, 'rgba(7,16,13,.42)'); g.addColorStop(1, 'rgba(7,16,13,.72)');
  ctx.fillStyle = g; ctx.fillRect(0, 300, W, H - 300);

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  eyebrow(ctx, '오늘 당신은', 560);

  const stat = (num, label, y, color, ph) => {
    ctx.fillStyle = color;
    ctx.font = `800 150px ${FONT}`;
    ctx.fillText(String(num), 70, y);
    ctx.font = `600 44px ${FONT}`;
    ctx.fillStyle = `rgba(251,246,233,${0.4 + 0.4 * ph})`;
    ctx.fillText(label, 70, y + 70);
  };

  if (s.hasTrack) {
    const p1 = phase(p, 0.05, 0.3), p2 = phase(p, 0.3, 0.3), p3 = phase(p, 0.55, 0.3);
    const totalMin = Math.round(s.activeSec / 60);
    const hh = Math.floor(totalMin * p1 / 60), mn = Math.round(totalMin * p1) % 60;
    stat(hh > 0 ? `${hh}시간 ${mn}분` : `${Math.max(1, mn)}분`, '공원에 머물렀고', 780, AMBER, p1);
    stat(`${(s.distM / 1000 * p2).toFixed(1)} km`, '걸었고', 1080, SKY, p2);
    stat(`${Math.round(s.places * p3)}곳`, '들러 탐험했어요', 1380, FERN, p3);
  } else {
    /* 위치 기록이 없을 때 — 활동 중심 문구 */
    const p1 = phase(p, 0.05, 0.35), p2 = phase(p, 0.35, 0.35);
    stat(`${Math.round(s.metCount * p1)}종`, '동물 친구를 만났고', 900, AMBER, p1);
    stat(`${Math.round(s.places * p2)}곳`, '들러 추억을 남겼어요', 1250, FERN, p2);
    ctx.font = `500 34px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.55)';
    ctx.fillText('📍 위치를 켜면 다음엔 이동 거리·동선도 담아드려요', 70, 1420);
  }

  /* 동선 라벨 */
  if (s.spots.length >= 2 && p > 0.8) {
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = `rgba(251,246,233,${Math.min(1, (p - 0.8) * 5) * 0.6})`;
    const route = s.spots.map((x) => x.name).join(' → ');
    wrapText(ctx, route, W - 140, 2).forEach((l, i) => ctx.fillText(l, 70, 1580 + i * 48));
  }
  ctx.font = `600 40px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.8)';
  ctx.fillText(s.date, 70, 1720);
  watermark(ctx, s.n);
}

/* ── ② 탐험 요약 ── */
function renderCount(ctx, s) {
  bgGradient(ctx, '#2e6b34', '#164a22');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
  ctx.font = `700 60px ${FONT}`;
  ctx.fillText('오늘 총', W / 2, 660);
  ctx.fillStyle = AMBER; ctx.font = `800 300px ${FONT}`;
  ctx.fillText(String(s.total), W / 2, 980);
  ctx.fillStyle = '#fff'; ctx.font = `700 60px ${FONT}`;
  ctx.fillText('개의 탐험을 완료했어요!', W / 2, 1110);

  const labels = [['quiz', '🎓 교육'], ['observe', '🔍 관찰'], ['dwell', '🍃 쉬어가기'], ['discovery', '✨ 발견']];
  const pills = labels.filter(([k]) => s.counts[k] > 0).map(([k, l]) => `${l} ${s.counts[k]}`);
  ctx.font = `700 42px ${FONT}`;
  let y = 1280;
  for (const text of pills) {
    const w = ctx.measureText(text).width + 90;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    rrect(ctx, (W - w) / 2, y - 58, w, 84, 42); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, W / 2, y);
    y += 112;
  }
  watermark(ctx, s.n);
}

/* ── ③-1 교육 (오답 복습) ── */
function renderQuizWrong(ctx, s) {
  bgGradient(ctx, '#1A4A5C', '#0E2A2E');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  eyebrow(ctx, '🎓 오늘 배운 것', 300, SKY);
  ctx.fillStyle = CREAM; ctx.font = `800 66px ${FONT}`;
  ctx.fillText(`${s.animal.emoji} ${s.animal.name}`, 70, 400);
  ctx.font = `700 58px ${FONT}`;
  const qLines = wrapText(ctx, s.q, W - 160, 3);
  qLines.forEach((l, i) => ctx.fillText(l, 70, 520 + i * 82));
  let y = 520 + qLines.length * 82 + 60;

  /* 내 답 / 정답 박스 */
  if (s.myAnswer !== null) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    rrect(ctx, 70, y, W - 140, 240, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(251,246,233,.16)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `600 44px ${FONT}`;
    ctx.fillStyle = 'rgba(251,246,233,.6)';
    ctx.fillText('내 답', 120, y + 90);
    ctx.fillText('정답', 120, y + 190);
    ctx.textAlign = 'right';
    ctx.fillStyle = CREAM; ctx.font = `700 44px ${FONT}`;
    ctx.fillText(`${s.myAnswer} ❌`, W - 120, y + 90);
    ctx.fillStyle = AMBER;
    ctx.fillText(`${s.answer} ⭕`, W - 120, y + 190);
    ctx.textAlign = 'left';
    y += 300;
  }
  ctx.fillStyle = 'rgba(251,246,233,.85)'; ctx.font = `600 46px ${FONT}`;
  wrapText(ctx, s.explain, W - 160, 5).forEach((l, i) => ctx.fillText(l, 70, y + 40 + i * 66));
  ctx.font = `600 36px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.5)';
  ctx.fillText('🌱 틀려도 배우면 성공!', 70, H - 160);
  watermark(ctx, s.n);
}

/* ── ③-1' 교육 (정답 묶음) ── */
function renderQuizRight(ctx, s) {
  bgGradient(ctx, '#1A4A5C', '#0E2A2E');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 40px ${FONT}`; ctx.fillStyle = SKY;
  ctx.fillText('🎓 교육 탐험', W / 2, 480);
  ctx.fillStyle = CREAM; ctx.font = `800 100px ${FONT}`;
  ctx.fillText(s.right === s.total ? `${s.total}문제 모두 정답!` : `${s.right}문제 정답!`, W / 2, 640);
  ctx.font = `600 46px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.7)';
  ctx.fillText(`오늘 퀴즈 ${s.total}문제 · 정답률 ${Math.round(s.right / s.total * 100)}%`, W / 2, 740);

  /* 대표 문제 카드 */
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.font = `700 46px ${FONT}`;
  const qLines = wrapText(ctx, s.sample.q, W - 260, 3);
  ctx.font = `600 42px ${FONT}`;
  const eLines = wrapText(ctx, s.sample.explain, W - 260, 4);
  const cardH = 100 + qLines.length * 64 + 30 + eLines.length * 58 + 50;
  rrect(ctx, 70, 880, W - 140, cardH, 34); ctx.fill();
  ctx.strokeStyle = 'rgba(251,246,233,.16)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = AMBER; ctx.font = `700 40px ${FONT}`;
  ctx.fillText(`${s.animal.emoji} ${s.animal.name}의 퀴즈`, 120, 960);
  ctx.fillStyle = CREAM; ctx.font = `700 46px ${FONT}`;
  qLines.forEach((l, i) => ctx.fillText(l, 120, 1035 + i * 64));
  ctx.fillStyle = 'rgba(251,246,233,.78)'; ctx.font = `600 42px ${FONT}`;
  eLines.forEach((l, i) => ctx.fillText(l, 120, 1035 + qLines.length * 64 + 30 + i * 58));
  watermark(ctx, s.n);
}

/* ── ③-2 체류 ── */
function renderDwell(ctx, s, photo, nextPhoto) {
  bgGradient(ctx, '#3E4A34', '#141A12');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  eyebrow(ctx, '🍃 오늘 머문 스팟', 180, AMBER);

  /* A스팟 사진 (본사업: 방문객 촬영 사진 — 시제품: 일러스트/이모지 폴백) */
  const py = 220, ph = 470;
  ctx.save();
  rrect(ctx, 70, py, W - 140, ph, 30); ctx.clip();
  if (photo) drawCover(ctx, photo, 70, py, W - 140, ph);
  else {
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, '#4a6141'); g.addColorStop(1, '#243220');
    ctx.fillStyle = g; ctx.fillRect(70, py, W - 140, ph);
    ctx.font = `260px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji, W / 2, py + ph / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  ctx.fillStyle = CREAM; ctx.font = `800 68px ${FONT}`;
  ctx.fillText(`${s.emoji} ${s.name}`, 70, 790);
  if (s.staySec >= 60) {
    ctx.font = `600 36px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.55)';
    ctx.fillText(`📍 ${Math.round(s.staySec / 60)}분 머물렀어요`, 70, 848);
  }
  ctx.fillStyle = 'rgba(251,246,233,.82)'; ctx.font = `600 42px ${FONT}`;
  wrapText(ctx, s.desc, W - 160, 2).forEach((l, i) => ctx.fillText(l, 70, 920 + i * 58));

  /* 관람 포인트 */
  let y = 1070;
  for (const pt of s.points) {
    ctx.fillStyle = 'rgba(0,0,0,.24)';
    rrect(ctx, 70, y, W - 140, 130, 24); ctx.fill();
    ctx.font = `56px ${FONT}`;
    ctx.fillText(pt.emoji, 100, y + 84);
    ctx.fillStyle = CREAM; ctx.font = `700 40px ${FONT}`;
    ctx.fillText(pt.h, 200, y + 58);
    ctx.fillStyle = 'rgba(251,246,233,.65)'; ctx.font = `500 33px ${FONT}`;
    ctx.fillText(pt.d, 200, y + 106);
    y += 150;
  }

  /* 다음 스팟 추천 */
  ctx.fillStyle = FERN; ctx.font = `800 42px ${FONT}`;
  ctx.fillText('다음에는 이런 곳으로 가보는 건 어때요?', 70, y + 70);
  const cy = y + 110, ch = 330;
  ctx.fillStyle = 'rgba(251,246,233,.07)';
  rrect(ctx, 70, cy, W - 140, ch, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(251,246,233,.2)'; ctx.lineWidth = 2; ctx.stroke();
  /* 추천 스팟 사진 (좌측) */
  ctx.save();
  rrect(ctx, 92, cy + 22, 286, ch - 44, 18); ctx.clip();
  if (nextPhoto) drawCover(ctx, nextPhoto, 92, cy + 22, 286, ch - 44);
  else {
    ctx.fillStyle = '#24473A'; ctx.fillRect(92, cy + 22, 286, ch - 44);
    ctx.font = `130px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.next.emoji, 92 + 143, cy + ch / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.fillStyle = CREAM; ctx.font = `800 50px ${FONT}`;
  ctx.fillText(`${s.next.emoji} ${s.next.name}`, 410, cy + 90);
  if (s.next.walkMin) {
    ctx.font = `700 34px ${FONT}`; ctx.fillStyle = AMBER;
    ctx.fillText(`🚶 여기서 도보 약 ${s.next.walkMin}분`, 410, cy + 150);
  }
  ctx.fillStyle = 'rgba(251,246,233,.7)'; ctx.font = `500 33px ${FONT}`;
  wrapText(ctx, s.next.desc, W - 140 - 360, 3).forEach((l, i) => ctx.fillText(l, 410, cy + 205 + i * 46));
  watermark(ctx, s.n);
}

/* ── ③-3 발견 완성 (사진 촤라락) ── */
function renderDiscOk(ctx, s, imgs, cur, fade) {
  bgGradient(ctx, '#1B4332', '#0A1F1A');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = AMBER; ctx.font = `800 44px ${FONT}`;
  ctx.fillText('✨ 발견 탐험 완성!', W / 2, 240);
  ctx.fillStyle = CREAM; ctx.font = `800 72px ${FONT}`;
  ctx.fillText(`${s.def.emoji} ${s.def.title}`, W / 2, 340);

  /* 큰 사진 프레임 — 순차 전환 */
  const py = 420, ph2 = 1000;
  ctx.save();
  rrect(ctx, 90, py, W - 180, ph2, 40); ctx.clip();
  ctx.fillStyle = '#10241c'; ctx.fillRect(90, py, W - 180, ph2);
  const item = s.items[cur];
  const img = imgs[cur];
  ctx.globalAlpha = fade;
  if (img) drawCover(ctx, img, 90, py, W - 180, ph2);
  else {
    ctx.font = `420px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, W / 2, py + ph2 / 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
  /* 하단 이름 배지 */
  const lg = ctx.createLinearGradient(0, py + ph2 - 220, 0, py + ph2);
  lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = lg; ctx.fillRect(90, py + ph2 - 220, W - 180, 220);
  ctx.fillStyle = '#fff'; ctx.font = `800 60px ${FONT}`;
  ctx.fillText(`${item.emoji} ${item.name}`, W / 2, py + ph2 - 70);
  ctx.restore();

  /* 진행 도트 */
  const n = s.items.length;
  s.items.forEach((_, i) => {
    ctx.fillStyle = i === cur ? AMBER : 'rgba(251,246,233,.3)';
    ctx.beginPath();
    ctx.arc(W / 2 + (i - (n - 1) / 2) * 56, 1510, i === cur ? 14 : 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(251,246,233,.7)'; ctx.font = `600 40px ${FONT}`;
  ctx.fillText(`${s.items.map((x) => x.emoji).join(' ')} 모두 찾았어요!`, W / 2, 1620);
  watermark(ctx, s.n);
}

/* ── ③-3' 발견 부분 수행 (정답 공개) ── */
function renderDiscPart(ctx, s) {
  bgGradient(ctx, '#1B4332', '#0A1F1A');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  eyebrow(ctx, '✨ 발견 탐험', 260, AMBER);
  ctx.fillStyle = CREAM; ctx.font = `800 72px ${FONT}`;
  ctx.fillText(`${s.def.emoji} ${s.def.title}`, 70, 370);
  ctx.font = `700 48px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.8)';
  ctx.fillText(`${s.got.length} / ${s.def.need} 발견 — 아쉽게 다 못 찾았어요`, 70, 460);
  ctx.fillStyle = FERN; ctx.font = `700 44px ${FONT}`;
  ctx.fillText('정답은 이 친구들이었어요!', 70, 580);

  let y = 640;
  for (const a of s.answers.slice(0, 5)) {
    const rh = 190;
    ctx.fillStyle = a.found ? 'rgba(82,183,136,.16)' : 'rgba(0,0,0,.24)';
    rrect(ctx, 70, y, W - 140, rh, 26); ctx.fill();
    if (a.found) { ctx.strokeStyle = FERN; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.font = `84px ${FONT}`;
    ctx.fillText(a.emoji, 100, y + 118);
    ctx.fillStyle = CREAM; ctx.font = `700 44px ${FONT}`;
    ctx.fillText(`${a.name}${a.found ? ' ✅' : ''}`, 230, y + 78);
    ctx.fillStyle = 'rgba(251,246,233,.65)'; ctx.font = `500 33px ${FONT}`;
    wrapText(ctx, a.desc, W - 140 - 190, 2).forEach((l, i) => ctx.fillText(l, 230, y + 128 + i * 44));
    y += rh + 22;
  }
  ctx.fillStyle = 'rgba(251,246,233,.6)'; ctx.font = `600 38px ${FONT}`;
  ctx.fillText('다음 방문엔 모두 찾아봐요! 📷', 70, Math.min(y + 60, H - 150));
  watermark(ctx, s.n);
}

/* ── ③-4 관찰 (기여 강조) ── */
function renderObserve(ctx, s) {
  bgGradient(ctx, '#2F5D3A', '#0E2A22');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  eyebrow(ctx, '🔍 오늘의 관찰 기록', 330);
  ctx.fillStyle = CREAM; ctx.font = `800 64px ${FONT}`;
  const whoLines = wrapText(ctx, `${s.who}${eulReul(s.who)} 지켜봤어요`, W - 140, 2);
  whoLines.forEach((l, i) => ctx.fillText(l, 70, 440 + i * 88));

  /* 내가 남긴 기록 */
  ctx.font = `600 48px ${FONT}`;
  const tLines = wrapText(ctx, `“${s.text}”`, W - 260, 6);
  const boxH = 110 + tLines.length * 70 + 60;
  const by = 640;
  ctx.fillStyle = 'rgba(0,0,0,.26)';
  rrect(ctx, 70, by, W - 140, boxH, 34); ctx.fill();
  ctx.strokeStyle = 'rgba(251,246,233,.16)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(251,246,233,.55)'; ctx.font = `600 36px ${FONT}`;
  ctx.fillText(`📍 ${s.spot}에서 남긴 기록`, 120, by + 76);
  ctx.fillStyle = CREAM; ctx.font = `600 48px ${FONT}`;
  tLines.forEach((l, i) => ctx.fillText(l, 120, by + 150 + i * 70));

  let y = by + boxH + 120;
  /* 기여 pill */
  ctx.font = `700 42px ${FONT}`;
  const pillText = '🌱 소중한 기록이 사육사님께 전달돼요';
  const pw = ctx.measureText(pillText).width + 100;
  ctx.fillStyle = 'rgba(242,160,61,.16)';
  rrect(ctx, 70, y - 62, pw, 96, 48); ctx.fill();
  ctx.strokeStyle = AMBER; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.fillText(pillText, 120, y);
  ctx.fillStyle = 'rgba(251,246,233,.72)'; ctx.font = `600 42px ${FONT}`;
  wrapText(ctx, '어린이 탐험가들의 기록이 모여 동물 친구들의 건강을 지키는 데 큰 힘이 된답니다.', W - 160, 3)
    .forEach((l, i) => ctx.fillText(l, 70, y + 110 + i * 62));
  watermark(ctx, s.n);
}

/* ── ④ 총평 ── */
function renderBest(ctx, s) {
  bgGradient(ctx, '#5A2A22', '#1F1210');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CORAL; ctx.font = `800 44px ${FONT}`;
  ctx.fillText('가장 오래 머문 곳', W / 2, 480);
  ctx.font = `250px ${FONT}`;
  ctx.fillText(s.emoji, W / 2, 800);
  ctx.fillStyle = CREAM; ctx.font = `800 110px ${FONT}`;
  ctx.fillText(s.name, W / 2, 980);
  ctx.fillStyle = AMBER;
  ctx.textAlign = 'left';
  ctx.font = `800 160px ${FONT}`;
  const numW = ctx.measureText(String(s.minutes)).width;
  const x0 = (W - numW - 90) / 2;
  ctx.fillText(String(s.minutes), x0, 1200);
  ctx.font = `800 70px ${FONT}`;
  ctx.fillText('분', x0 + numW + 14, 1200);
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM; ctx.font = `700 62px ${FONT}`;
  if (s.pctTop) { // 시제품 규칙 기반 추정 — 본사업 시 실방문 통계로 대체
    ctx.fillText(`여기서 ${s.minutes}분을 보냈고`, W / 2, 1400);
    ctx.fillText('이곳을 찾은 탐험가 중', W / 2, 1490);
    ctx.fillStyle = AMBER;
    ctx.fillText(`상위 ${s.pctTop}%예요!`, W / 2, 1590);
  } else {
    ctx.fillText(`${s.name}에서`, W / 2, 1420);
    ctx.fillText('가장 많은 시간을 보냈어요', W / 2, 1510);
  }
  watermark(ctx, s.n);
}

/* ── ⑤ 유형 + 캐릭터 성장 ── */
function renderType(ctx, s, chibiImg) {
  bgGradient(ctx, '#6B4423', '#2A1B12');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = AMBER; ctx.font = `800 44px ${FONT}`;
  ctx.fillText('오늘 당신의 탐험 유형', W / 2, 290);
  ctx.fillStyle = CREAM; ctx.font = `800 96px ${FONT}`;
  ctx.fillText(`${s.type.emoji} ${s.type.name}`, W / 2, 420);
  ctx.font = `600 44px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.75)';
  ctx.fillText(s.type.desc, W / 2, 500);

  /* 캐릭터 (유형 장비 착용) */
  if (chibiImg) {
    const cw = 560, chh = 746;
    ctx.drawImage(chibiImg, (W - cw) / 2, 560, cw, chh);
  } else {
    ctx.font = `340px ${FONT}`;
    ctx.fillText(s.type.emoji, W / 2, 1050);
  }

  /* 레벨 + 장비 획득 */
  ctx.font = `800 52px ${FONT}`;
  const lvText = `${s.type.name} Lv.${s.lv}`;
  const lw = ctx.measureText(lvText).width + 110;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  rrect(ctx, (W - lw) / 2, 1360, lw, 100, 50); ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.fillText(lvText, W / 2, 1430);

  if (s.gearNew) {
    ctx.font = `800 50px ${FONT}`;
    const gt = `${s.type.gearEmoji} ${s.type.gear} 획득!`;
    const gw = ctx.measureText(gt).width + 120;
    ctx.fillStyle = 'rgba(242,160,61,.18)';
    rrect(ctx, (W - gw) / 2, 1500, gw, 104, 52); ctx.fill();
    ctx.strokeStyle = AMBER; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.fillText(gt, W / 2, 1572);
  }
  ctx.font = `600 38px ${FONT}`; ctx.fillStyle = 'rgba(251,246,233,.6)';
  ctx.fillText(`이 탐험을 많이 할수록 캐릭터가 ${s.type.name}로 자라나요`, W / 2, 1690);
  ctx.fillText(`📔 발견일지 총 ${s.dexTotal}종 · 다음 탐험에서 또 만나! 👋`, W / 2, 1760);
  watermark(ctx, s.n);
}

/* 캐릭터 이미지 — 오프스크린 three.js 렌더 (유형 장비 착용 모습) */
let chibiCache = { key: '', img: null };
async function chibiImage(gearId) {
  const av = loadAvatar();
  const key = JSON.stringify([av.gender, av.dress, av.top, av.bottom, gearId]);
  if (chibiCache.key === key && chibiCache.img) return chibiCache.img;
  try {
    const c = document.createElement('canvas');
    c.width = 540; c.height = 720;
    const rend = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
    const cam = new THREE.PerspectiveCamera(38, 540 / 720, 0.5, 200);
    cam.position.set(0, 9.5, 27);
    cam.lookAt(0, 6.4, 0);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.2));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.5);
    sun.position.set(6, 12, 8);
    sc.add(sun);
    const ch = buildChibi({ ...av, gear: gearId });
    ch.group.rotation.y = 0.3;
    sc.add(ch.group);
    rend.render(sc, cam);
    const img = await loadImg(c.toDataURL('image/png'));
    rend.dispose();
    chibiCache = { key, img };
    return img;
  } catch (_) { return null; } // WebGL 실패 시 이모지 폴백
}

/* ── 렌더 디스패치 ── */
function cacheBlob(i, seq) {
  $('storyCv').toBlob((b) => { if (seq === renderSeq) blobs[i] = b; }, 'image/jpeg', 0.9);
}

async function renderSlide(i) {
  const cv = $('storyCv'), ctx = cv.getContext('2d');
  const s = slides[i];
  const seq = ++renderSeq;
  ctx.clearRect(0, 0, W, H);

  /* 유형 변경 선택 버튼 표시/숨김 */
  const choice = $('storyChoice');
  if (s.kind === 'type' && s.offerChoice) {
    $('choiceNew').textContent = `✨ ${s.type.gearEmoji} ${s.type.gear} 차림으로 바꾸기`;
    choice.style.display = 'flex';
  } else choice.style.display = 'none';

  if (s.kind === 'stats') {
    const t0 = performance.now(), DUR = 5000;
    const step = (now) => {
      if (seq !== renderSeq) return;
      const p = Math.min(1, (now - t0) / DUR);
      ctx.clearRect(0, 0, W, H);
      renderStats(ctx, s, p);
      if (p < 1) requestAnimationFrame(step);
      else cacheBlob(i, seq);
    };
    requestAnimationFrame(step);
  } else if (s.kind === 'count') {
    renderCount(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'quizWrong') {
    renderQuizWrong(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'quizRight') {
    renderQuizRight(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'dwell') {
    /* 1차: 폴백으로 즉시 → 사진 로드되면 재렌더 */
    renderDwell(ctx, s, null, null);
    const user = s.photoId ? await loadImg(await getPhoto(s.photoId)) : null;
    const photo = user || await cachedImg(`img/spots/${s.spotId}.jpg`);
    const nextPhoto = await cachedImg(`img/spots/${s.next.id}.jpg`);
    if (seq !== renderSeq) return;
    ctx.clearRect(0, 0, W, H);
    renderDwell(ctx, s, photo, nextPhoto);
    cacheBlob(i, seq);
  } else if (s.kind === 'discOk') {
    /* 사진 촤라락 — 1.8초 간격 순환 (사용자 사진 → 그림 폴백) */
    renderDiscOk(ctx, s, [], 0, 0);
    const imgs = [];
    for (const it of s.items) {
      const user = it.photoId ? await loadImg(await getPhoto(it.photoId)) : null;
      imgs.push(user || await cachedImg(`img/animals/${it.id}.jpg`));
    }
    if (seq !== renderSeq) return;
    const t0 = performance.now(), PERIOD = 1800, FADE = 350;
    let blobDone = false;
    const step = (now) => {
      if (seq !== renderSeq) return;
      const el = now - t0;
      const cur = Math.floor(el / PERIOD) % s.items.length;
      const fade = Math.min(1, (el % PERIOD) / FADE);
      ctx.clearRect(0, 0, W, H);
      renderDiscOk(ctx, s, imgs, cur, fade);
      if (!blobDone && fade >= 1) { blobDone = true; cacheBlob(i, seq); }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else if (s.kind === 'discPart') {
    renderDiscPart(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'observe') {
    renderObserve(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'best') {
    renderBest(ctx, s); cacheBlob(i, seq);
  } else if (s.kind === 'type') {
    renderType(ctx, s, null);
    const gearId = s.offerChoice ? loadAvatar().gear : s.type.id;
    const img = await chibiImage(gearId);
    if (seq !== renderSeq) return;
    ctx.clearRect(0, 0, W, H);
    renderType(ctx, s, img);
    cacheBlob(i, seq);
  }
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
  $('storyChoice').style.display = 'none';
  renderSeq++;
}

/* ── 공유 ── */
async function shareCurrent() {
  const b = blobs[idx];
  if (!b) { toast('잠시만요, 장면을 준비하고 있어요'); return; }
  const s = slides[idx];
  const file = new File([b], `recap-${slides[0].date}-${s.kind}.jpg`, { type: 'image/jpeg' });
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

  const cv = $('storyCv');
  cv.width = W; cv.height = H;
  $('storyBars').innerHTML = slides.map(() => '<i><b></b></i>').join('');

  if (!bound) {
    bound = true;
    $('storyClose').addEventListener('click', closeStory);
    $('storyShare').addEventListener('click', shareCurrent);
    $('choiceKeep').addEventListener('click', () => {
      const s = slides[idx];
      if (s && s.kind === 'type') { s.offerChoice = false; renderSlide(idx); }
    });
    $('choiceNew').addEventListener('click', () => {
      const s = slides[idx];
      if (!s || s.kind !== 'type') return;
      const av = loadAvatar();
      av.gear = s.type.id;
      saveAvatar(av);
      s.offerChoice = false;
      s.gearNew = true;
      window.dispatchEvent(new CustomEvent('avatar-changed'));
      toast(`${s.type.gearEmoji} ${s.type.gear}을(를) 착용했어요!`);
      renderSlide(idx);
    });
    const hit = $('storyHit');
    let px = 0, pt = 0;
    hit.addEventListener('pointerdown', (e) => { px = e.clientX; pt = Date.now(); });
    hit.addEventListener('pointerup', (e) => {
      const dx = e.clientX - px, dt = Date.now() - pt;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      else if (dt < 350) go(e.clientX < window.innerWidth * 0.35 ? -1 : 1);
    });
  }

  /* 이미지 프리로드 (런타임 캐시 적재) */
  for (const s of slides) {
    if (s.kind === 'dwell') { cachedImg(`img/spots/${s.spotId}.jpg`); cachedImg(`img/spots/${s.next.id}.jpg`); }
    if (s.kind === 'discOk') s.items.forEach((it) => cachedImg(`img/animals/${it.id}.jpg`));
  }

  $('storyWrap').classList.add('open');
  updateBars();
  renderSlide(0);
}
