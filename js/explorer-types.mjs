/* 탐험 유형 데이터 단일 원천 — 이동 유형 4종 × 탐험 성향 4종 = 16유형, 남/여 32캐릭터.
   판정 로직은 geomath.mjs(classifyMovement·classifyMission), 소비는 quest.js·story.js·characters.html.
   Node 단위 테스트에서 직접 import할 수 있게 DOM·전역 의존 없음(.mjs). */

/* ── 이동 유형 4종 (이동거리 × 한 장소당 체류시간) ── */
export const MOVEMENT_TYPES = [
  { id: 'explorer', title: '탐험왕', animal: '수달', animalEmoji: '🦦',
    movementDistance: 'long', stayDuration: 'long',
    moveLabel: '많이 걸어요', stayLabel: '한 곳에 오래 머물러요',
    desc: '공원 곳곳을 넓게 다니면서도 마음에 드는 곳은 오래 즐겨요.' },
  { id: 'curious', title: '호기심왕', animal: '다람쥐', animalEmoji: '🐿️',
    movementDistance: 'long', stayDuration: 'short',
    moveLabel: '많이 걸어요', stayLabel: '짧게 여러 곳을 들러요',
    desc: '새로운 곳이 궁금해서 이곳저곳 부지런히 돌아다녀요.' },
  { id: 'focus', title: '집중왕', animal: '거북이', animalEmoji: '🐢',
    movementDistance: 'short', stayDuration: 'long',
    moveLabel: '가까운 곳 위주로 다녀요', stayLabel: '한 곳에 오래 머물러요',
    desc: '좋아하는 곳에 자리 잡고 천천히 깊게 즐겨요.' },
  { id: 'speed', title: '스피드왕', animal: '토끼', animalEmoji: '🐰',
    movementDistance: 'short', stayDuration: 'short',
    moveLabel: '가까운 곳 위주로 다녀요', stayLabel: '짧게 여러 곳을 들러요',
    desc: '가까운 곳을 재빠르게 둘러보는 날쌘 탐험가예요.' },
];

/* ── 탐험 성향 4종 (주로 하는 탐험 종류) ── */
export const MISSION_TYPES = [
  { id: 'detective', title: '꼬마탐정', missionCategory: 'observe', missionLabel: '🔍 관찰 탐험',
    props: ['돋보기', '단서 수첩'], propEmoji: '🔍',
    desc: '동물 친구를 자세히 지켜보고 기록하는 걸 좋아해요.' },
  { id: 'fairy', title: '정답요정', missionCategory: 'quiz', missionLabel: '🎓 교육 탐험',
    props: ['별 지팡이', '퀴즈북'], propEmoji: '🪄',
    desc: '퀴즈를 풀며 새로운 지식을 모으는 걸 좋아해요.' },
  { id: 'boss', title: '골목대장', missionCategory: 'dwell', missionLabel: '🍃 체류 탐험',
    props: ['장소 배지', '스탬프 가방'], propEmoji: '🎖️',
    desc: '마음에 드는 장소에 머물며 그곳을 내 것으로 만들어요.' },
  { id: 'guide', title: '길라잡이', missionCategory: 'discovery', missionLabel: '✨ 발견 탐험',
    props: ['공원 지도', '나침반', '작은 깃발'], propEmoji: '🚩',
    desc: '숨은 친구와 장소를 찾아내고 길을 안내하는 걸 좋아해요.' },
];

/* ── 16조합 고유색 (요구 지정색) ── */
export const COMBO_COLORS = {
  'explorer-detective': '#2563EB', // 코발트 블루
  'explorer-fairy': '#38BDF8',     // 스카이 블루
  'explorer-boss': '#14B8A6',      // 틸
  'explorer-guide': '#1E3A8A',     // 네이비
  'curious-detective': '#C66A20',  // 오렌지 브라운
  'curious-fairy': '#F4B740',      // 골든 옐로
  'curious-boss': '#F26B5B',       // 코랄
  'curious-guide': '#D98B17',      // 앰버
  'focus-detective': '#6B7D35',    // 올리브 그린
  'focus-fairy': '#4DB6AC',        // 아쿠아 민트
  'focus-boss': '#287A4B',         // 포레스트 그린
  'focus-guide': '#8DBF3F',        // 라임 그린
  'speed-detective': '#F58CB8',    // 베이비 핑크
  'speed-fairy': '#EC4899',        // 핫핑크
  'speed-boss': '#F29B76',         // 피치
  'speed-guide': '#8B5CF6',        // 라벤더 퍼플
};

/* 조합별 설명(어린이 친화, 남녀 공통 — 성별 고정관념 없음)과 성격 키워드 */
const COMBO_TEXT = {
  'explorer-detective': { desc: '공원 곳곳을 오래 탐험하며 작은 단서도 놓치지 않는 관찰력이 뛰어난 탐험가예요.', keywords: ['끈기', '관찰력', '호기심'] },
  'explorer-fairy': { desc: '공원을 넓게 누비며 퀴즈와 새 지식을 차곡차곡 모으는 똑똑한 탐험가예요.', keywords: ['탐구심', '활발함', '똑똑함'] },
  'explorer-boss': { desc: '멀리까지 걸어가 마음에 드는 곳마다 오래 머물며 구석구석 정복하는 친구예요.', keywords: ['도전정신', '여유', '성취감'] },
  'explorer-guide': { desc: '공원 전체를 돌며 숨은 장소를 찾아내는 든든한 길 안내 전문가예요.', keywords: ['리더십', '방향감각', '용감함'] },
  'curious-detective': { desc: '여기저기 빠르게 다니면서도 작은 변화 하나 놓치지 않는 눈썰미 좋은 친구예요.', keywords: ['눈썰미', '재빠름', '호기심'] },
  'curious-fairy': { desc: '새로운 장소를 빠르게 찾아다니며 퀴즈와 지식을 모으는 것을 좋아해요.', keywords: ['호기심', '명랑함', '배움'] },
  'curious-boss': { desc: '이곳저곳 부지런히 다니며 좋아하는 장소마다 도장을 콕콕 찍는 씩씩한 친구예요.', keywords: ['부지런함', '씩씩함', '열정'] },
  'curious-guide': { desc: '궁금한 곳이 생기면 바로 달려가 새로운 길을 척척 찾아내는 친구예요.', keywords: ['모험심', '순발력', '길눈'] },
  'focus-detective': { desc: '한 곳에 오래 머물며 동물 친구의 작은 몸짓까지 자세히 지켜보는 관찰 박사예요.', keywords: ['집중력', '차분함', '세심함'] },
  'focus-fairy': { desc: '좋아하는 곳에 자리 잡고 퀴즈를 곰곰이 풀어내는 차분한 친구예요.', keywords: ['차분함', '끈기', '지혜'] },
  'focus-boss': { desc: '마음에 드는 장소에서 오래 머물며 그곳의 매력을 깊이 발견하는 친구예요.', keywords: ['느긋함', '깊이', '애정'] },
  'focus-guide': { desc: '머무는 곳 주변을 찬찬히 살펴 남들이 못 본 보물 같은 장소를 찾아내요.', keywords: ['세심함', '발견', '꼼꼼함'] },
  'speed-detective': { desc: '가까운 곳을 재빠르게 둘러보며 순간의 장면을 놓치지 않고 잡아내는 친구예요.', keywords: ['민첩함', '순간포착', '재치'] },
  'speed-fairy': { desc: '번개처럼 움직이며 퀴즈를 척척 풀어내는 재빠른 척척박사예요.', keywords: ['재빠름', '명석함', '자신감'] },
  'speed-boss': { desc: '좋아하는 곳 근처에서 알차게 놀며 나만의 아지트를 만드는 친구예요.', keywords: ['활발함', '친근함', '알참'] },
  'speed-guide': { desc: '가까운 곳을 빠르게 살펴보며 다음 목적지를 척척 찾아내는 길 찾기 전문가예요.', keywords: ['방향감각', '재빠름', '똑똑함'] },
};

/* 옛 5유형 → 새 성향 매핑 (저장된 profile.types·avatar.gear 마이그레이션용)
   collector(사진 수집)는 발견 성향(guide)에 귀속 */
export const LEGACY_TYPE_MAP = {
  observer: 'detective',
  scholar: 'fairy',
  wanderer: 'boss',
  adventurer: 'guide',
  collector: 'guide',
};

/* 이에요/예요 조사 — 마지막 한글 글자의 받침 유무 (유형명 문구 공용) */
export function iEyo(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return '이에요';
  return (c - 0xAC00) % 28 ? '이에요' : '예요';
}

export const comboId = (movementId, missionId) => `${movementId}-${missionId}`;

const MOVE_BY_ID = new Map(MOVEMENT_TYPES.map((m) => [m.id, m]));
const MISSION_BY_ID = new Map(MISSION_TYPES.map((m) => [m.id, m]));

/* combo id → { movement, mission } 정의 객체. 미상 id면 null (구버전 gear 값 안전 처리) */
export function parseComboId(id) {
  if (typeof id !== 'string') return null;
  const [m, s] = id.split('-');
  const movement = MOVE_BY_ID.get(m), mission = MISSION_BY_ID.get(s);
  return movement && mission ? { movement, mission } : null;
}

/* profile.types 값('explorer-detective' | 'legacy-detective')에서 성향 id만 추출 — 레벨 누적 기준 */
export function missionIdOfTypeId(typeId) {
  if (typeof typeId !== 'string') return null;
  const s = typeId.split('-')[1];
  return MISSION_BY_ID.has(s) ? s : null;
}

/* 밝은 파생색 (카드 배경용 파스텔 — 흰색과 혼합) */
export function tint(hex, ratio = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(v + (255 - v) * ratio).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/* 어두운 파생색 (그라데이션 하단용) */
export function shade(hex, ratio = 0.45) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(v * (1 - ratio)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/* 16유형 조합 객체 */
export function getCombo(movementId, missionId) {
  const movement = MOVE_BY_ID.get(movementId), mission = MISSION_BY_ID.get(missionId);
  if (!movement || !mission) return null;
  const id = comboId(movementId, missionId);
  const mi = MOVEMENT_TYPES.indexOf(movement), si = MISSION_TYPES.indexOf(mission);
  const text = COMBO_TEXT[id];
  return {
    id,
    typeNumber: mi * 4 + si + 1,
    movementType: movementId,
    missionType: missionId,
    koreanName: `${movement.title} ${mission.title}`,
    movementTitle: movement.title,
    missionTitle: mission.title,
    animal: movement.animal,
    animalEmoji: movement.animalEmoji,
    primaryColor: COMBO_COLORS[id],
    secondaryColor: tint(COMBO_COLORS[id]),
    movementDistance: movement.movementDistance,
    stayDuration: movement.stayDuration,
    moveLabel: movement.moveLabel,
    stayLabel: movement.stayLabel,
    missionCategory: mission.missionCategory,
    missionLabel: mission.missionLabel,
    description: text.desc,
    personalityKeywords: text.keywords,
    props: mission.props,
    propEmoji: mission.propEmoji,
  };
}

export const ALL_COMBOS = MOVEMENT_TYPES.flatMap((m) => MISSION_TYPES.map((s) => getCombo(m.id, s.id)));

/* ── 32캐릭터 (16유형 × 남/여) ── */

const ANIMAL_EN = { explorer: 'otter', curious: 'squirrel', focus: 'turtle', speed: 'rabbit' };
const ANIMAL_FEATURE = {
  explorer: 'otter-ear hood with a thick otter tail',
  curious: 'squirrel-ear hood with a big fluffy curled squirrel tail',
  focus: 'turtle-shell backpack and a turtle-motif cap',
  speed: 'long rabbit-ear hood with a small pom-pom rabbit tail',
};
const PROPS_EN = {
  detective: 'holding a magnifying glass and a small clue notebook',
  fairy: 'holding a star wand and a quiz book',
  boss: 'wearing a place badge and carrying a stamp collecting bag',
  guide: 'holding a park map, a compass and a small flag',
};

/* 이미지 생성 프롬프트 — 공통 스타일 + 유형별 요소 (향후 webp 캐릭터 생성용) */
function buildImagePrompt(combo, gender) {
  const who = gender === 'f' ? 'girl child explorer' : 'boy child explorer';
  return [
    'Cute high-quality 3D chibi game character, full body, front three-quarter view,',
    'oversized head, big glossy expressive eyes, soft rounded features,',
    'polished animated feature style, child-friendly, adorable collectible mascot,',
    'consistent body proportions, soft studio lighting, subtle ground shadow,',
    'highly detailed explorer outfit and props, isolated on transparent background, no text, no frame.',
    `A ${who} in a ${ANIMAL_EN[combo.movementType]}-themed outfit: ${ANIMAL_FEATURE[combo.movementType]},`,
    `main outfit color ${combo.primaryColor}, ${PROPS_EN[combo.missionType]},`,
    'small explorer backpack, comfy sneakers, Seoul Children\'s Grand Park explorer mood,',
    `expression and pose showing personality: ${combo.personalityKeywords.join(', ')}.`,
  ].join(' ');
}

/* 캐릭터 1명 — gender: 'm' | 'f' (기존 avatar.gender 규약) */
export function getCharacter(movementId, missionId, gender) {
  const combo = getCombo(movementId, missionId);
  if (!combo || (gender !== 'm' && gender !== 'f')) return null;
  const g = gender === 'f' ? 'girl' : 'boy';
  const id = `${movementId}-${missionId}-${g}`;
  return {
    ...combo,
    id,
    comboId: combo.id,
    gender,
    genderLabel: gender === 'f' ? '여자 캐릭터' : '남자 캐릭터',
    imagePath: `img/characters/${id}.webp`, // 아직 없음 — 로드 실패 시 치비 렌더 폴백
    imagePrompt: buildImagePrompt(combo, gender),
  };
}

export const ALL_CHARACTERS = ALL_COMBOS.flatMap((c) => ['m', 'f'].map((g) => getCharacter(c.movementType, c.missionType, g)));
