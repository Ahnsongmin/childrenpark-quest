/* 탐험 로직: 일일 배정(시드 기반)·지오펜스·도감·기록·리캡·성장·메달
   "AI 배정"의 시제품 구현 — 날짜·나이·방문 회차·이전 기록으로 결정적으로 선택.
   우선순위(팀 기획): ①안 가본 우리 ②가봤지만 탐험 미완/퀴즈 오답 ③완료한 곳 */
import { SPOTS, ANIMALS, QUIZZES, DISCOVERIES, MEDALS, EXPLORER_TYPES } from './quests-data.js';
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
  if (!profile.seed) { // 기기별 고유 시드 — 퀴즈 담당 동물이 사람마다 다르게 뽑히도록
    profile.seed = Math.random().toString(36).slice(2, 10);
    saveJSON(P_KEY, profile);
  }
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

    /* 발견일지 등재는 그 동물과 직접 활동했을 때만 (사진·한 줄·퀴즈·관찰) —
       마을 입장이나 지오펜스 접근만으로는 등재하지 않음 (재방문 유도) */
    meet(animalIds) {
      const v = ensureVisit();
      const fresh = [];
      for (const a of animalIds || []) {
        if (!v.met.includes(a)) v.met.push(a);
        if (!log.dex[a]) { log.dex[a] = { first: v.date, photo: null }; fresh.push(a); }
      }
      if (fresh.length || animalIds?.length) save();
      return fresh; // 이번에 처음 등재된 동물들
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
        const fresh = best && api.isAssigned(best.id) && !announced.has(best.id) && !api.spotDone(best.id);
        if (fresh) announced.add(best.id);
        if (onNear) onNear(best, fresh);
      }
    },

    /* 이 스팟에서 지금 할 수 있는 탐험 목록 (퀴즈는 동물 단위 — quizFor 참조) */
    questsFor(spotId) {
      const s = spotById.get(spotId);
      const v = ensureVisit();
      const out = [];
      if (!api.isAssigned(spotId)) return out;
      if (s.kind === 'animal') {
        const ob = s.observe[pickIdx(spotId + 'o', s.observe.length)];
        out.push({ type: 'observe', prompt: ob.text, done: v.done.some((d) => d.spot === spotId && d.type === 'observe') });
      } else {
        out.push({ type: 'dwell', ...s.dwell, done: v.done.some((d) => d.spot === spotId && d.type === 'dwell') });
      }
      return out;
    },
    spotDone(spotId) {
      const qs = api.questsFor(spotId);
      return qs.length > 0 && qs.every((q) => q.done);
    },

    /* 동물별 퀴즈 — 나이대(band)에 맞는 문제를 날짜 기반으로 결정적으로 선택 */
    quizFor(animalId) {
      const pool = QUIZZES[animalId];
      if (!pool || !pool.length) return null;
      const fit = pool.filter((x) => !x.band || x.band === band());
      const list = fit.length ? fit : pool;
      return list[pickIdx('a:' + animalId, list.length)];
    },
    /* 오늘 이 마을에서 퀴즈를 준비한 동물 1~2종 — 날짜+기기 시드로 매일·사람마다 다르게.
       이미 퀴즈를 푼 동물은 발견일지 48종을 다 채우기 전까지 다시 뽑히지 않음.
       남은 후보 중엔 아직 발견일지에 없는 동물 우선(재방문 유도). 그날 첫 계산 시점에 고정. */
    quizAnimalsFor(spotId) {
      const v = ensureVisit();
      if (!v.quizPicks) v.quizPicks = {};
      if (!v.quizPicks[spotId]) {
        const s = spotById.get(spotId);
        const rng = mulberry32(strSeed(`${todayKey()}|quiz|${spotId}|${profile.seed}`));
        const quizzed = new Set(allDone().filter((d) => d.type === 'quiz' && d.animal).map((d) => d.animal));
        const dexComplete = Object.keys(ANIMALS).every((id) => log.dex[id]);
        const pool = dexComplete ? s.animals : s.animals.filter((a) => !quizzed.has(a));
        const n = Math.min(pool.length, 1 + Math.floor(rng() * 2)); // 1~2종 (남은 후보 없으면 0)
        v.quizPicks[spotId] = shuffled(pool, rng)
          .sort((a, b) => (log.dex[a] ? 1 : 0) - (log.dex[b] ? 1 : 0))
          .slice(0, n);
        save();
      }
      return v.quizPicks[spotId];
    },
    canQuiz(animalId) { // 오늘 이 동물이 퀴즈를 낼 수 있는지
      return !!api.quizFor(animalId)
        && api.quizAnimalsFor(ANIMALS[animalId].spot).includes(animalId)
        && !api.animalQuizDone(animalId);
    },
    animalQuizDone(animalId) { // 오늘 이 동물의 퀴즈를 풀었는지
      return ensureVisit().done.some((d) => d.type === 'quiz' && d.animal === animalId);
    },
    answerQuiz(animalId, choice) {
      const quiz = api.quizFor(animalId);
      const correct = choice === quiz.correct;
      ensureVisit().done.push({ spot: ANIMALS[animalId].spot, animal: animalId, type: 'quiz', q: quiz.q, choice, correct, explain: quiz.explain, ts: Date.now() });
      save();
      const fresh = api.meet([animalId]); // 틀려도 해설로 배웠으니 '만남'으로 인정
      return { correct, explain: quiz.explain, answer: quiz.a[quiz.correct], newAnimals: fresh };
    },
    saveObserve(spotId, text, photo) {
      const s = spotById.get(spotId);
      const ob = s.observe[pickIdx(spotId + 'o', s.observe.length)];
      ensureVisit().done.push({ spot: spotId, type: 'observe', text, photo: photo || null, animal: ob.animals?.[0] || null, ts: Date.now() });
      save();
      return api.meet(ob.animals);
    },
    completeDwell(spotId, text) {
      ensureVisit().done.push({ spot: spotId, type: 'dwell', text, ts: Date.now() });
      save();
    },
    saveFreeNote(spotId, text, photo, animalId) { // 자유 기록(한줄) — 동물에게 남기면 발견일지 등재
      ensureVisit().done.push({ spot: spotId, type: 'note', text, photo: photo || null, animal: animalId || null, ts: Date.now() });
      save();
      return animalId ? api.meet([animalId]) : [];
    },

    discovery() {
      const v = ensureVisit();
      const def = DISCOVERIES.find((d) => d.id === v.assign.disc);
      return { def, got: v.disc, done: v.discDone };
    },
    addDiscoveryPhoto(animalId, photo) {
      const v = ensureVisit();
      const { def } = api.discovery();
      const fresh = api.meet([animalId]);
      if (photo && !log.dex[animalId].photo) log.dex[animalId].photo = photo;
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
      return { hit, def, got: v.disc, done: v.discDone, newAnimals: fresh };
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
