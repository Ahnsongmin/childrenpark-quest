/* 유형 캐릭터 해금 — 그 유형으로 탐험을 마치면(리캡에서 유형이 확정되면) 해금된다.
   단일 원천은 quest.profile.v1의 types(날짜 → 유형 id). quest.js recordType()이 기록한다.
   도감(characters.html)처럼 quest.js를 초기화하지 않는 화면도 쓰므로 저장소만 읽는 얇은 모듈로 둔다. */
import { loadJSON } from './store.js';
import { parseComboId, MOVEMENT_TYPES, MISSION_TYPES } from './explorer-types.mjs';

const P_KEY = 'quest.profile.v1';

/* 해금된 16유형 조합 id 집합 (구 5유형 legacy-* 기록은 조합이 아니므로 제외) */
export function unlockedSet() {
  const profile = loadJSON(P_KEY, {});
  const types = profile && typeof profile.types === 'object' ? profile.types : {};
  const s = new Set();
  for (const v of Object.values(types)) if (parseComboId(v)) s.add(v);
  return s;
}

export const isUnlocked = (comboId, set) => (set || unlockedSet()).has(comboId);

/* 잠긴 유형의 해금 조건 안내 문구 — 어린이 친화 표현 */
export function unlockHint(combo) {
  const mv = MOVEMENT_TYPES.find((m) => m.id === combo.movementType);
  const ms = MISSION_TYPES.find((m) => m.id === combo.missionType);
  return `${mv.moveLabel} + ${mv.stayLabel} + ${ms.missionLabel}을 가장 많이 한 날, `
    + `탐험을 마치고 오늘의 리캡을 보면 해금돼요!`;
}
