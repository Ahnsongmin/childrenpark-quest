/* 탐험 로직: 일일 배정(시드 기반)·지오펜스·도감·기록·리캡·성장·메달
   "AI 배정"의 시제품 구현 — 날짜·나이·방문 회차·이전 기록으로 결정적으로 선택.
   우선순위(팀 기획): ①안 가본 우리 ②가봤지만 탐험 미완/퀴즈 오답 ③완료한 곳 */
import { SPOTS, ANIMALS, DISCOVERIES, MEDALS, EXPLORER_TYPES } from './quests-data.js';
import { LANDMARKS } from './config.js';
import { prj } from './geo.js';
import { loadJSON, saveJSON } from './store.js';
import { M2U } from './geo.js';

const P_KEY = 'quest.profile.v1';
const L_KEY = 'quest.log.v1';
const RADIUS = 10 * M2U; // 지오펜스 반경 10m (GPS 오차 3~10m 감안한 값 — 2026-07-29 사용자 지정)

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* 결정적 난수 (같은 날·같은 회차·같은 나이 → 같은 배정) */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const strSeed = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initQuests({ onNear } = {}) {
  const profile = loadJSON(P_KEY, { age: null });
  const log = loadJSON(L_KEY, { visits: [], dex: {} });
  const save = () => saveJSON(L_KEY, log);

  const spotById = new Map(SPOTS.map((s) => [s.id, s]));
  const spotPos = new Map();
  for (const s of SPOTS) {
    const src = s.lm ? LANDMARKS.find((l) => l.id === s.lm) : s;
    spotPos.set(s.id, prj(src.lat, src.lon));
  }

  const allDone = () => log.visits.flatMap((v) => v.done);
  const spotQuizCorrect = (spotId) => allDone().some((d) => d.spot === spotId && d.type === 'quiz' && d.correct);
  const spotTouched = (spotId) => {
    const s = spotById.get(spotId);
    if (s.kind === 'animal') return s.animals.some((a) => log.dex[a]);
    return allDone().some((d) => d.spot === spotId);
  };

  function computeAssign(visitN) {
    const rng = mulberry32(strSeed(`${todayKey()}|${visitN}|${profile.age || 0}`));
    const prio = (s) => (!spotTouched(s.id) ? 0 : (s.kind === 'animal' && !spotQuizCorrect(s.id) ? 1 : 2));
    const animals = shuffled(SPOTS.filter((s) => s.kind === 'animal'), rng)
      .sort((a, b) => prio(a) - prio(b))
      .slice(0, 3).map((s) => s.id); // 전체 우리의 ~1/3만 — 예측 불가능한 재미
    const dwell = shuffled(SPOTS.filter((s) => s.kind === 'dwell'), rng)
      .sort((a, b) => prio(a) - prio(b))[0].id;
    const doneDiscs = new Set(log.visits.filter((v) => v.discDone).map((v) => v.assign.disc));
    const disc = shuffled(DISCOVERIES, rng)
      .sort((a, b) => (doneDiscs.has(a.id) ? 1 : 0) - (doneDiscs.has(b.id) ? 1 : 0))[0].id;
    return { spots: animals, dwell, disc };
  }

  function ensureVisit() {
    let v = log.visits.find((x) => x.date === todayKey());
    if (!v) {
      v = { date: todayKey(), n: log.visits.length + 1, assign: computeAssign(log.visits.length + 1), met: [], done: [], disc: [], discDone: false };
      log.visits.push(v);
      save();
    }
    return v;
  }

  const band = () => (profile.age !== null && profile.age >= 8 ? 'hard' : 'easy');
  const pickIdx = (spotId, len) => (strSeed(todayKey() + spotId) + ensureVisit().n) % len;

  let near = null;
  const announced = new Set();

  const api = {
    profile,
    setAge(age) {
      profile.age = age;
      saveJSON(P_KEY, profile);
    },
    get visit() { return ensureVisit(); },
    get near() { return near; },
    spotById: (id) => spotById.get(id),
    isAssigned(spotId) {
      const v = ensureVisit();
      return v.assign.spots.includes(spotId) || v.assign.dwell === spotId;
    },

    markMet(spotId) { // 우리 안 동물들을 발견일지에 등재 (지오펜스·마을 입장 공용)
      const s = spotById.get(spotId);
      if (!s || s.kind !== 'animal') return;
      const v = ensureVisit();
      let changed = false;
      for (const a of s.animals) {
        if (!v.met.includes(a)) { v.met.push(a); changed = true; }
        if (!log.dex[a]) { log.dex[a] = { first: v.date, photo: null }; changed = true; }
      }
      if (changed) save();
    },

    onPosition(x, z) {
      let best = null, bestD = RADIUS;
      for (const s of SPOTS) {
        const [sx, sz] = spotPos.get(s.id);
        const d = Math.hypot(sx - x, sz - z);
        if (d < bestD) { best = s; bestD = d; }
      }
      if ((best && best.id) !== (near && near.id)) {
        near = best;
        if (best && best.kind === 'animal') api.markMet(best.id); // 우리 진입 = 동물들과 만남
        const fresh = best && api.isAssigned(best.id) && !announced.has(best.id) && !api.spotDone(best.id);
        if (fresh) announced.add(best.id);
        if (onNear) onNear(best, fresh);
      }
    },

    /* 이 스팟에서 지금 할 수 있는 탐험 목록 */
    questsFor(spotId) {
      const s = spotById.get(spotId);
      const v = ensureVisit();
      const out = [];
      if (!api.isAssigned(spotId)) return out;
      if (s.kind === 'animal') {
        const quiz = s.quizzes[band()][pickIdx(spotId, s.quizzes[band()].length)];
        out.push({ type: 'quiz', quiz, done: v.done.some((d) => d.spot === spotId && d.type === 'quiz') });
        const prompt = s.observe[pickIdx(spotId + 'o', s.observe.length)];
        out.push({ type: 'observe', prompt, done: v.done.some((d) => d.spot === spotId && d.type === 'observe') });
      } else {
        out.push({ type: 'dwell', ...s.dwell, done: v.done.some((d) => d.spot === spotId && d.type === 'dwell') });
      }
      return out;
    },
    spotDone(spotId) {
      const qs = api.questsFor(spotId);
      return qs.length > 0 && qs.every((q) => q.done);
    },

    answerQuiz(spotId, choice) {
      const s = spotById.get(spotId);
      const quiz = s.quizzes[band()][pickIdx(spotId, s.quizzes[band()].length)];
      const correct = choice === quiz.correct;
      ensureVisit().done.push({ spot: spotId, type: 'quiz', q: quiz.q, choice, correct, explain: quiz.explain, ts: Date.now() });
      save();
      return { correct, explain: quiz.explain, answer: quiz.a[quiz.correct] };
    },
    saveObserve(spotId, text, photo) {
      ensureVisit().done.push({ spot: spotId, type: 'observe', text, photo: photo || null, ts: Date.now() });
      save();
    },
    completeDwell(spotId, text) {
      ensureVisit().done.push({ spot: spotId, type: 'dwell', text, ts: Date.now() });
      save();
    },
    saveFreeNote(spotId, text, photo) { // 탐험과 무관한 자유 기록(한줄 남기기)
      ensureVisit().done.push({ spot: spotId, type: 'note', text, photo: photo || null, ts: Date.now() });
      save();
    },

    discovery() {
      const v = ensureVisit();
      const def = DISCOVERIES.find((d) => d.id === v.assign.disc);
      return { def, got: v.disc, done: v.discDone };
    },
    addDiscoveryPhoto(animalId, photo) {
      const v = ensureVisit();
      const { def } = api.discovery();
      if (!log.dex[animalId]) log.dex[animalId] = { first: v.date, photo: null };
      if (photo && !log.dex[animalId].photo) log.dex[animalId].photo = photo;
      if (!v.met.includes(animalId)) v.met.push(animalId);
      let hit = false;
      if (def.targets.includes(animalId) && !v.disc.includes(animalId)) {
        v.disc.push(animalId);
        hit = true;
        if (v.disc.length >= def.need && !v.discDone) {
          v.discDone = true;
          v.done.push({ spot: null, type: 'discovery', disc: def.id, ts: Date.now() });
        }
      } else {
        v.done.push({ spot: null, type: 'photo', animal: animalId, photo, ts: Date.now() });
      }
      save();
      return { hit, def, got: v.disc, done: v.discDone };
    },

    /* 오늘의 탐험 진행: 배정 스팟 4곳 + 발견 1 */
    todayProgress() {
      const v = ensureVisit();
      const units = [...v.assign.spots, v.assign.dwell];
      const done = units.filter((id) => api.spotDone(id)).length + (v.discDone ? 1 : 0);
      return { done, total: units.length + 1 };
    },
    questCount() {
      return allDone().filter((d) => ['quiz', 'observe', 'dwell', 'discovery'].includes(d.type)).length;
    },
    medal() {
      const n = api.questCount();
      let cur = null, next = MEDALS[0];
      for (const m of MEDALS) { if (n >= m.need) cur = m; }
      next = MEDALS.find((m) => n < m.need) || null;
      return { count: n, cur, next };
    },

    dexList() {
      return Object.entries(ANIMALS).map(([id, a]) => ({ id, ...a, met: log.dex[id] || null }));
    },
    notes() {
      return log.visits.flatMap((v) => v.done
        .filter((d) => ['observe', 'dwell', 'note'].includes(d.type))
        .map((d) => ({ ...d, date: v.date, spotName: d.spot ? spotById.get(d.spot).name : '' })));
    },

    recap(visit) {
      const v = visit || ensureVisit();
      const newAnimals = Object.entries(log.dex).filter(([, m]) => m.first === v.date).map(([id]) => id);
      const quizzes = v.done.filter((d) => d.type === 'quiz');
      const noteCnt = v.done.filter((d) => ['observe', 'dwell', 'note'].includes(d.type)).length;
      const photoCnt = v.done.filter((d) => d.photo).length + v.disc.length;
      const scores = {
        observer: noteCnt,
        collector: photoCnt,
        scholar: quizzes.filter((q) => q.correct).length,
        wanderer: v.done.filter((d) => d.type === 'dwell').length * 2,
        adventurer: newAnimals.length * 0.6,
      };
      const typeId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      return {
        visit: v,
        metCount: v.met.length,
        newAnimals,
        quizzes,
        notes: v.done.filter((d) => ['observe', 'dwell', 'note'].includes(d.type)),
        photos: v.done.filter((d) => d.photo).map((d) => d.photo),
        type: EXPLORER_TYPES.find((t) => t.id === typeId),
        dexTotal: Object.keys(log.dex).length,
      };
    },
    growth() {
      return log.visits.map((v) => {
        const newA = Object.entries(log.dex).filter(([, m]) => m.first === v.date).map(([id]) => ANIMALS[id].name);
        return { n: v.n, date: v.date, met: v.met.length, newAnimals: newA, quests: v.done.filter((d) => ['quiz', 'observe', 'dwell', 'discovery'].includes(d.type)).length };
      });
    },

    /* 재방문 인사 (2회차부터, 하루 1회) */
    greeting() {
      const isNewToday = !log.visits.some((x) => x.date === todayKey());
      if (!isNewToday || log.visits.length === 0) return null;
      const n = log.visits.length + 1;
      const unmet = Object.keys(ANIMALS).filter((id) => !log.dex[id]);
      if (unmet.length) {
        const a = ANIMALS[unmet[strSeed(todayKey()) % unmet.length]];
        return `${n}번째 방문이네! 아직 만나지 못한 ${a.emoji} ${a.name} 보러 가볼까?`;
      }
      return `${n}번째 방문! 발견일지를 다 모은 진짜 탐험가네. 오늘은 좋아하는 친구를 다시 만나러 가자!`;
    },
  };

  return api;
}
