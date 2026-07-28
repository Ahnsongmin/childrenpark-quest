/* 공통 데이터: 구역, 랜드마크 16곳, 저장 키, Supabase */
export const ZONES = {
  gate:   { label: '출입구',   color: '#8b7355' },
  fun:    { label: '재미나라', color: '#e8709a' },
  animal: { label: '동물나라', color: '#e8963c' },
  nature: { label: '자연나라', color: '#4caf6e' },
  conv:   { label: '쉼터',     color: '#7d8fc9' },
};

export const LANDMARKS = [
  { id:'main-gate', name:'정문·고객안내센터', zone:'gate', lat:37.54939, lon:127.07632, emoji:'🚩',
    desc:'공원의 시작점! 고객안내소·미아보호소·의무실이 모여 있어요. 유아차와 휠체어도 여기서 빌릴 수 있어요.' },
  { id:'sangsang', name:'서울상상나라', zone:'fun', lat:37.55066, lon:127.07752, emoji:'🎨',
    desc:'아이들이 몸으로 놀며 배우는 체험형 어린이 박물관이에요.' },
  { id:'fountain', name:'음악분수', zone:'fun', lat:37.54952, lon:127.07821, emoji:'⛲',
    desc:'음악에 맞춰 물줄기가 춤추는 공원의 명물 분수예요.' },
  { id:'openstage', name:'열린무대', zone:'fun', lat:37.54894, lon:127.07776, emoji:'🎤',
    desc:'야외 공연과 행사가 열리는 큰 무대예요.' },
  { id:'kkummaru', name:'꿈마루', zone:'conv', lat:37.54923, lon:127.07936, emoji:'☕',
    desc:'공원 한가운데 있는 건축 명소. 카페와 전망 쉼터가 있어요.' },
  { id:'kkumtle', name:'꿈틀꿈틀놀이터', zone:'fun', lat:37.54810, lon:127.08020, emoji:'🛝',
    desc:'국내 최초 무장애 통합놀이터! 모든 아이가 함께 놀 수 있게 만들어졌어요.' },
  { id:'foreststage', name:'숲속의무대', zone:'fun', lat:37.54905, lon:127.08030, emoji:'🎭',
    desc:'나무로 둘러싸인 야외 공연장이에요.' },
  { id:'tropical', name:'열대동물관', zone:'animal', lat:37.54932, lon:127.08176, emoji:'🦎',
    desc:'더운 나라에서 온 동물 친구들을 만나고, 동물학교 프로그램도 열려요.' },
  { id:'minivillage', name:'꼬마동물마을', zone:'animal', lat:37.54897, lon:127.08162, emoji:'🐰',
    desc:'작고 귀여운 동물 친구들이 사는 마을이에요.' },
  { id:'predator', name:'맹수마을', zone:'animal', lat:37.54880, lon:127.08310, emoji:'🦁',
    desc:'사자와 호랑이 같은 용맹한 동물들이 사는 곳이에요.' },
  { id:'herbivore', name:'초식동물마을', zone:'animal', lat:37.54827, lon:127.08209, emoji:'🦌',
    desc:'풀을 먹고 사는 순한 동물 친구들의 마을이에요.' },
  { id:'sea', name:'바다동물원', zone:'animal', lat:37.54723, lon:127.08292, emoji:'🦭',
    desc:'바다에서 온 동물 친구들을 만나는 곳이에요.' },
  { id:'palgak', name:'팔각당', zone:'conv', lat:37.54984, lon:127.08245, emoji:'🏯',
    desc:'공원 한가운데 8각 건물. 실내놀이터와 카페가 있어 쉬어가기 좋아요.' },
  { id:'rides', name:'놀이동산', zone:'fun', lat:37.55148, lon:127.08379, emoji:'🎡',
    desc:'신나는 놀이기구가 가득한 곳! 공원 북쪽에 있어요.' },
  { id:'botanic', name:'식물원', zone:'nature', lat:37.54920, lon:127.08430, emoji:'🌷',
    desc:'신기한 식물이 가득한 온실이에요. 생태연못과 정원도 근처에 있어요.' },
  { id:'back-gate', name:'후문', zone:'gate', lat:37.55160, lon:127.08905, emoji:'🚪',
    desc:'아차산역 쪽 출입구예요. 놀이동산과 식물원이 가까워요.' },
];

export const KEYS = {
  seen: 'quest.seen.v1',
  avatar: 'quest.avatar.v1',
  tutorial: 'quest.tutorial.v2',
  myid: 'quest.myid',
};

export const SB_URL = 'https://cnvezqmnxsmdrqhagmrq.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudmV6cW1ueHNtZHJxaGFnbXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDA3NDUsImV4cCI6MjA5OTUxNjc0NX0.I_C7qe5WLGGmeNryrbjalRXxlQ_LNqnDG4GYKWRf7G8';
