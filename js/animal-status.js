/* 오늘의 동물 상태 조회 — 미션 배정이 동물의 그날 컨디션을 존중하게 만드는 층.
   원천 두 곳을 합친다(뒤가 우선):
     ① data/animal-status.js — 사육사가 붙여 넣은 정적 파일 (배포본)
     ② localStorage quest.keeper.v1 — keeper.html에서 방금 체크한 값 (현장·시연용 즉시 반영)
   서버·계정 없이 동작하며, 둘 다 비어 있으면 전체 동물을 관람 가능으로 본다. */
import { ANIMAL_STATUS } from '../data/animal-status.js';
import { loadJSON, saveJSON } from './store.js';

export const KEEPER_KEY = 'quest.keeper.v1';

const EMPTY = { indoor: false, needObserve: false, note: '' };

const merged = () => ({ ...ANIMAL_STATUS, ...loadJSON(KEEPER_KEY, {}) });

export function statusOf(animalId) {
  return { ...EMPTY, ...(merged()[animalId] || {}) };
}
export const isIndoor = (animalId) => statusOf(animalId).indoor === true;
export const needsObserve = (animalId) => statusOf(animalId).needObserve === true;
export const noteOf = (animalId) => statusOf(animalId).note || '';

/* 오늘 관람 가능한 동물만 남긴다 (내실 동물은 미션·퀴즈 후보에서 완전히 제외) */
export const visibleAnimals = (animalIds = []) => animalIds.filter((id) => !isIndoor(id));

/* keeper.html 전용 — 체크 결과 저장/조회 */
export const loadKeeper = () => loadJSON(KEEPER_KEY, {});
export function saveKeeper(map) {
  const clean = {};
  for (const [id, v] of Object.entries(map || {})) {
    if (v && (v.indoor || v.needObserve || v.note)) {
      clean[id] = { indoor: !!v.indoor, needObserve: !!v.needObserve, note: v.note || '', updated: v.updated || '' };
    }
  }
  saveJSON(KEEPER_KEY, clean);
  return clean;
}
