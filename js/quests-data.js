/* 탐험 콘텐츠 데이터
   보유 동물·구역: 서울시설공단 공식 동물현황(포유류 35·조류 6·파충류 7 = 48종) 및
   동물원 관람안내의 동물사별 표 기준 (2026-07-30 전수 확인)
   - https://www.sisul.or.kr/open_content/childrenpark/guidance/animal/mammals.jsp
   - https://www.sisul.or.kr/open_content/childrenpark/guidance/animal/guide.jsp
   공식 표에 동물사가 안 나오는 일부 종(스라소니·붉은여우·유라시아수달·토끼 등)은
   인접 구역으로 추정 배치 — 현장 확인 시 spot만 바꾸면 됨.
   주의: 동물원 재조성 사업(2026 착공)으로 종 구성이 바뀔 수 있음 — 배포 전 재확인 권장.
   퀴즈 정답·해설은 널리 검증된 사실만 사용 — QUIZZES는 각 동물의 desc(전수 검증됨)와
   기존 검증 퀴즈에서 파생. 관찰(observe)의 animals: 주인공 동물 — 수행 시 '만남'으로 기록(리캡에 나옴).
   발견일지 등재는 퀴즈를 풀었을 때만. */

export const ANIMALS = {
  /* 맹수마을·코끼리사 */
  lion:      { name: '사자', emoji: '🦁', spot: 'predator', desc: '무리를 이루어 사는 큰 고양잇과 동물이에요. 사냥은 주로 암사자들이 함께 해요.' },
  tiger:     { name: '벵갈호랑이', emoji: '🐯', spot: 'predator', desc: '줄무늬가 사람 지문처럼 저마다 다른 멋쟁이 맹수예요.', tags: ['stripe'] },
  jaguar:    { name: '재규어', emoji: '🐆', spot: 'predator', desc: '장미 모양 무늬 안에 점이 있는 게 표범과 다른 점이에요. 헤엄도 잘 쳐요.', tags: ['tail'] },
  puma:      { name: '퓨마', emoji: '🐈', spot: 'predator', desc: '점프 실력이 뛰어난 아메리카의 고양잇과 동물이에요.' },
  jackal:    { name: '검은등자칼', emoji: '🐺', spot: 'predator', desc: '등에 검은 안장을 얹은 듯한 무늬가 있는 아프리카의 들개예요. 부부가 평생 함께 사냥한답니다.' },
  lynx:      { name: '스라소니', emoji: '🐱', spot: 'predator', desc: '귀 끝에 뾰족한 붓털이 달린 고양잇과 동물이에요. 꼬리가 뭉툭하게 짧아요.' },
  fox:       { name: '붉은여우', emoji: '🦊', spot: 'predator', desc: '크고 뾰족한 귀와 탐스러운 꼬리를 가진 똑똑한 사냥꾼이에요.' },
  hyena:     { name: '점박이하이에나', emoji: '🐆', spot: 'predator', desc: '웃음소리 같은 특이한 소리로 대화해요. 무리의 대장은 암컷이랍니다.' },
  elephant:  { name: '아시아코끼리', emoji: '🐘', spot: 'predator', desc: '육지에서 가장 큰 동물 중 하나! 코로 냄새 맡고, 물 마시고, 인사도 해요.', tags: ['endangered'] },
  bear:      { name: '반달가슴곰', emoji: '🐻', spot: 'predator', desc: '가슴의 하얀 반달 무늬가 매력 포인트! 우리나라 천연기념물(제329호)이에요.', tags: ['endangered'] },
  /* 초식동물마을 */
  zebra:     { name: '그랜트얼룩말', emoji: '🦓', spot: 'herbivore', desc: "줄무늬가 저마다 다른 얼룩말이에요. 이곳의 '세로'는 2023년 봄 잠깐 공원 밖 나들이를 다녀와 전국적으로 유명해졌답니다.", tags: ['stripe'] },
  kangaroo:  { name: '붉은캥거루', emoji: '🦘', spot: 'herbivore', desc: '아기는 콩알만 하게 태어나 엄마 주머니에서 자라요.' },
  alpaca:    { name: '알파카', emoji: '🦙', spot: 'herbivore', desc: '남아메리카에서 온 복슬복슬 친구. 털로 옷을 만들기도 해요.' },
  guanaco:   { name: '과나코', emoji: '🦙', spot: 'herbivore', desc: '라마의 야생 친척이에요. 안데스의 높은 산에서도 거뜬히 달린답니다.' },
  donkey:    { name: '당나귀', emoji: '🫏', spot: 'herbivore', desc: '긴 귀가 매력인 힘센 친구예요. "히힝" 대신 "히호!" 하고 울어요.' },
  minihorse: { name: '미니말', emoji: '🐴', spot: 'herbivore', desc: '보통 말보다 훨씬 작은 미니 사이즈 말이에요. 성격이 순해서 인기 만점!' },
  /* 꼬마동물마을 */
  meerkat:   { name: '미어캣', emoji: '🐹', spot: 'minivillage', desc: '두 발로 서서 망을 보는 사막의 파수꾼이에요.' },
  otter:     { name: '작은발톱수달', emoji: '🦦', spot: 'minivillage', desc: '세계에서 가장 작은 수달! 물갈퀴 달린 손으로 조개도 잘 만져요.', tags: ['endangered', 'swim'] },
  euotter:   { name: '유라시아수달', emoji: '🦦', spot: 'minivillage', desc: '우리나라 강에도 사는 수달이에요. 수달은 천연기념물(제330호)! 물속 사냥의 달인이에요.', tags: ['endangered', 'swim'] },
  porcupine: { name: '아프리카포큐파인', emoji: '🦔', spot: 'minivillage', desc: '위험하면 가시를 세워 몸을 지켜요.' },
  rabbit:    { name: '토끼', emoji: '🐰', spot: 'minivillage', desc: '긴 귀로 작은 소리도 잘 듣고 더위도 식혀요. 앞니는 평생 자란답니다.' },
  /* 열대동물관 — 작은 포유류 */
  squirrelmonkey: { name: '다람쥐원숭이', emoji: '🐒', spot: 'tropical', desc: '긴 꼬리로 균형을 잡으며 나무 사이를 누비는 작은 원숭이예요.', tags: ['tail'] },
  marmoset:  { name: '코먼마모셋', emoji: '🐒', spot: 'tropical', desc: '손바닥에 올라올 만큼 작은 원숭이! 나무줄기의 달콤한 진을 갉아 먹어요.' },
  lemur:     { name: '알락꼬리여우원숭이', emoji: '🐒', spot: 'tropical', desc: '까만·하얀 고리무늬 꼬리를 깃발처럼 높이 들고 다녀요. 마다가스카르에서 온 친구예요.', tags: ['tail', 'endangered'] },
  hyrax:     { name: '바위너구리', emoji: '🐹', spot: 'tropical', desc: '토끼만 한 몸집이지만, 놀랍게도 코끼리와 먼 친척이래요!' },
  molerat:   { name: '벌거숭이두더지쥐', emoji: '🐀', spot: 'tropical', desc: '털이 거의 없는 땅속 친구예요. 개미처럼 여왕을 중심으로 무리 지어 살아요.' },
  treeporc:  { name: '트리포큐파인', emoji: '🦔', spot: 'tropical', desc: '나무 위에서 사는 호저예요. 꼬리로 나뭇가지를 감고 매달릴 수 있어요.', tags: ['tail'] },
  /* 열대동물관 — 파충류 */
  beardie:   { name: '턱수염도마뱀', emoji: '🦎', spot: 'tropical', desc: '턱밑 비늘이 수염처럼 보이는 순한 도마뱀이에요.' },
  python:    { name: '볼파이톤', emoji: '🐍', spot: 'tropical', desc: '놀라면 공처럼 몸을 동그랗게 마는 뱀이에요.' },
  cornsnake: { name: '콘스네이크', emoji: '🐍', spot: 'tropical', desc: '옥수수밭 근처에서 자주 발견되어 이런 이름이 붙은 순한 뱀이에요.' },
  bluetongue:{ name: '블루텅스킨크', emoji: '🦎', spot: 'tropical', desc: '놀라면 새파란 혀를 쏙 내밀어 "저리 가!" 하고 겁을 줘요.' },
  leachianus:{ name: '리키에너스', emoji: '🦎', spot: 'tropical', desc: '세계에서 가장 큰 도마뱀붙이(게코)예요. 뉴칼레도니아 숲에서 왔어요.' },
  tortoise:  { name: '레오파드거북', emoji: '🐢', spot: 'tropical', desc: '표범 무늬 등껍질을 가진 육지거북이에요.' },
  pancake:   { name: '팬케이크거북', emoji: '🐢', spot: 'tropical', desc: '팬케이크처럼 납작한 등껍질! 바위틈에 쏙 숨는 게 특기예요.' },
  /* 바다동물원 */
  furseal:   { name: '남아메리카물개', emoji: '🦭', spot: 'sea', desc: '겉으로 보이는 귓바퀴가 있고, 앞지느러미로 힘차게 헤엄쳐요.', tags: ['swim'] },
  seal:      { name: '점박이물범', emoji: '🦭', spot: 'sea', desc: '우리나라 백령도 바다에도 사는 천연기념물(제331호)이에요.', tags: ['endangered', 'swim'] },
  /* 원숭이마을 */
  macaque:   { name: '일본원숭이', emoji: '🐵', spot: 'monkeyvillage', desc: '추운 겨울 온천욕을 즐기는 것으로 유명한 원숭이예요.' },
  baboon:    { name: '아누비스개코원숭이', emoji: '🐒', spot: 'monkeyvillage', desc: '개처럼 긴 주둥이를 가진 원숭이. 무리 생활의 달인이에요.' },
  pigtail:   { name: '돼지꼬리원숭이', emoji: '🐵', spot: 'monkeyvillage', desc: '돼지처럼 짧고 꼬불한 꼬리 때문에 이런 이름이 붙었어요.' },
  mantled:   { name: '망토원숭이', emoji: '🐒', spot: 'monkeyvillage', desc: '수컷 어깨의 은빛 털이 멋진 망토처럼 보여요.' },
  ygibbon:   { name: '노랑뺨기번', emoji: '🦧', spot: 'monkeyvillage', desc: '수컷은 까만 몸에 노란 뺨, 암컷은 온몸이 금빛! 긴 팔로 나뭇가지를 그네 타듯 이동해요.', tags: ['endangered'] },
  sgibbon:   { name: '은색기번', emoji: '🦧', spot: 'monkeyvillage', desc: '은빛 털을 가진 긴팔원숭이예요. 인도네시아 자바섬에서만 산답니다.', tags: ['endangered'] },
  /* 물새장 */
  penguin:   { name: '자카스펭귄', emoji: '🐧', spot: 'birdcage', desc: '당나귀 울음소리를 닮은 소리를 내서 자카스(수탕나귀)라는 이름이 붙었어요.', tags: ['swim'] },
  crane:     { name: '두루미', emoji: '🦢', spot: 'birdcage', desc: '우리나라 천연기념물(제202호). 우아하게 춤추듯 걷는 큰 새예요.', tags: ['endangered'] },
  pelican:   { name: '분홍펠리컨', emoji: '🦩', spot: 'birdcage', desc: '부리 아래 큰 주머니에 물고기를 담아요.' },
  heron:     { name: '해오라기', emoji: '🐦', spot: 'birdcage', desc: '해 질 무렵부터 활동하는 밤의 사냥꾼! 물가에서 꼼짝 않고 물고기를 기다려요.' },
  stork:     { name: '홍부리황새', emoji: '🕊️', spot: 'birdcage', desc: '붉은 부리와 다리가 멋진 큰 새예요. 부리를 부딪쳐 딱딱 소리로 인사해요.' },
  ibis:      { name: '흑따오기', emoji: '🐦‍⬛', spot: 'birdcage', desc: '아래로 굽은 긴 부리로 진흙 속 먹이를 찾아내요.' },
};

/* 동물별 퀴즈 — 우리 가까이 가면 그 동물이 무작위로 내는 퀴즈.
   풀면(정답·오답 무관) 그 동물이 발견일지에 등재됨 — 발견일지 등재의 유일한 경로.
   band: 'easy'(7세 이하)·'hard'(8세 이상) — 없으면 모든 나이에 출제. */
export const QUIZZES = {
  /* 맹수마을 */
  lion: [
    { q: '사자 무리에서 사냥을 주로 하는 건 누구일까요?', a: ['암사자들', '수사자', '아기 사자'], correct: 0,
      explain: '사냥은 주로 암사자들이 힘을 합쳐서 해요. 수사자는 무리를 지키는 일을 맡아요.' },
  ],
  tiger: [
    { q: '호랑이의 줄무늬는 모두 똑같을까요?', a: ['똑같다', '저마다 다르다'], correct: 1,
      explain: '호랑이 줄무늬는 사람의 지문처럼 한 마리 한 마리 모두 달라요!' },
  ],
  jaguar: [
    { q: '재규어는 헤엄을 잘 칠까요?', a: ['잘 친다', '물을 무서워한다'], correct: 0, band: 'easy',
      explain: '재규어는 고양잇과 동물 중 드물게 헤엄을 잘 쳐요. 강가에서 사냥도 한답니다.' },
    { q: '재규어와 표범을 구별하는 방법은?', a: ['무늬 안에 점이 있다', '꼬리가 없다', '갈기가 있다'], correct: 0, band: 'hard',
      explain: '재규어는 장미 모양 무늬 안에 작은 점이 있어요. 표범 무늬에는 점이 없답니다.' },
  ],
  puma: [
    { q: '퓨마가 특히 잘하는 것은 무엇일까요?', a: ['점프', '헤엄', '노래'], correct: 0,
      explain: '퓨마는 점프 실력이 아주 뛰어난 아메리카의 고양잇과 동물이에요.' },
  ],
  jackal: [
    { q: '검은등자칼은 누구와 함께 사냥할까요?', a: ['평생 함께하는 부부', '혼자서만', '사자와 함께'], correct: 0,
      explain: '검은등자칼 부부는 평생 함께 살며 힘을 합쳐 사냥해요.' },
  ],
  lynx: [
    { q: '스라소니 귀 끝에 있는 것은 무엇일까요?', a: ['뾰족한 붓털', '방울', '뿔'], correct: 0,
      explain: '스라소니는 귀 끝에 붓처럼 뾰족한 털이 달려 있어요. 꼬리는 뭉툭하게 짧답니다.' },
  ],
  fox: [
    { q: '붉은여우의 자랑거리는 무엇일까요?', a: ['크고 뾰족한 귀와 탐스러운 꼬리', '기다란 목', '딱딱한 등껍질'], correct: 0,
      explain: '붉은여우는 크고 뾰족한 귀로 작은 소리를 듣고, 탐스러운 꼬리를 가진 똑똑한 사냥꾼이에요.' },
  ],
  hyena: [
    { q: '점박이하이에나 무리의 대장은 누구일까요?', a: ['암컷', '수컷', '가장 나이 많은 아기'], correct: 0,
      explain: '점박이하이에나 무리의 대장은 암컷이에요. 웃음소리 같은 특이한 소리로 대화한답니다.' },
  ],
  elephant: [
    { q: '코끼리는 코로 무엇을 할까요?', a: ['냄새 맡기', '물 마시기', '인사하기', '전부 다!'], correct: 3, band: 'easy',
      explain: '코끼리 코는 만능이에요! 냄새도 맡고, 물도 마시고, 서로 인사도 나눈답니다.' },
    { q: '아시아코끼리의 임신 기간은 얼마나 될까요?', a: ['6개월', '12개월', '약 22개월'], correct: 2, band: 'hard',
      explain: '코끼리는 약 22개월, 거의 2년 동안 아기를 품어요. 육지 동물 중 가장 긴 편이에요.' },
  ],
  bear: [
    { q: '반달가슴곰 가슴에 있는 무늬 모양은?', a: ['반달', '별', '하트'], correct: 0, band: 'easy',
      explain: '가슴의 하얀 반달 무늬가 매력 포인트! 그래서 이름도 반달가슴곰이에요.' },
    { q: '반달가슴곰은 우리나라 천연기념물일까요?', a: ['맞다 (제329호)', '아니다'], correct: 0, band: 'hard',
      explain: '반달가슴곰은 우리나라 천연기념물 제329호예요.' },
  ],
  /* 초식동물마을 */
  zebra: [
    { q: '얼룩말 친구들의 줄무늬는 서로 똑같을까요?', a: ['똑같다', '저마다 다르다'], correct: 1, band: 'easy',
      explain: '얼룩말 줄무늬도 저마다 달라요. 무늬로 서로를 알아본답니다.' },
    { q: '얼룩말이 무리를 지어 다니는 가장 큰 이유는?', a: ['맹수로부터 서로 지키려고', '심심해서', '길을 잘 몰라서'], correct: 0, band: 'hard',
      explain: '여럿이 모이면 줄무늬가 뒤섞여 맹수가 한 마리를 고르기 어려워져요. 함께 있으면 더 안전해요.' },
  ],
  kangaroo: [
    { q: '아기 캥거루는 어디에서 자랄까요?', a: ['엄마 주머니 속', '나무 위 둥지', '땅속 굴'], correct: 0, band: 'easy',
      explain: '아기 캥거루는 엄마 배에 있는 주머니 속에서 무럭무럭 자라요.' },
    { q: '붉은캥거루 아기는 태어날 때 얼마만 할까요?', a: ['콩알만 하다(약 2cm)', '강아지만 하다', '사람 아기만 하다'], correct: 0, band: 'hard',
      explain: '갓 태어난 캥거루는 약 2cm! 스스로 엄마 주머니까지 기어 올라가 그 안에서 자라요.' },
  ],
  alpaca: [
    { q: '알파카는 어느 대륙에서 왔을까요?', a: ['아시아', '남아메리카', '아프리카'], correct: 1,
      explain: '알파카는 남아메리카 안데스 산맥의 높은 곳에서 온 친구예요. 복슬복슬한 털로 옷을 만들기도 해요.' },
  ],
  guanaco: [
    { q: '과나코는 누구의 야생 친척일까요?', a: ['라마', '사자', '곰'], correct: 0,
      explain: '과나코는 라마의 야생 친척이에요. 안데스의 높은 산에서도 거뜬히 달린답니다.' },
  ],
  donkey: [
    { q: '당나귀는 어떻게 울까요?', a: ['히호!', '멍멍!', '야옹!'], correct: 0,
      explain: '당나귀는 "히힝" 대신 "히호!" 하고 울어요. 긴 귀가 매력인 힘센 친구랍니다.' },
  ],
  minihorse: [
    { q: '미니말은 보통 말과 비교하면?', a: ['훨씬 작다', '훨씬 크다', '똑같다'], correct: 0,
      explain: '미니말은 보통 말보다 훨씬 작은 미니 사이즈 말이에요. 성격이 순해서 인기 만점!' },
  ],
  /* 꼬마동물마을 */
  meerkat: [
    { q: '미어캣이 두 발로 서서 하는 일은 무엇일까요?', a: ['망보기', '춤추기', '키 재기'], correct: 0,
      explain: '미어캣은 번갈아 가며 두 발로 서서 하늘의 맹금류와 주변을 살피는 파수꾼이에요.' },
  ],
  otter: [
    { q: '수달이 헤엄을 잘 치는 비결은?', a: ['물갈퀴', '바퀴', '지느러미 꼬리'], correct: 0, band: 'easy',
      explain: '수달의 발가락 사이에는 물갈퀴가 있어서 물속에서 빠르게 움직일 수 있어요.' },
    { q: '작은발톱수달은 세계에서 가장 ___ 수달이에요.', a: ['작은', '큰', '빠른'], correct: 0, band: 'hard',
      explain: '작은발톱수달은 세계 수달 중 가장 작아요. 손재주가 좋아 조개도 잘 다룬답니다.' },
  ],
  euotter: [
    { q: '유라시아수달은 우리나라 강에도 살까요?', a: ['산다', '살지 않는다'], correct: 0, band: 'easy',
      explain: '유라시아수달은 우리나라 강에도 사는 물속 사냥의 달인이에요.' },
    { q: '수달은 우리나라 천연기념물일까요?', a: ['맞다 (제330호)', '아니다'], correct: 0, band: 'hard',
      explain: '수달은 우리나라 천연기념물 제330호예요.' },
  ],
  porcupine: [
    { q: '포큐파인이 몸을 지키는 방법은?', a: ['가시를 세운다', '고약한 냄새를 뿜는다', '죽은 척한다'], correct: 0,
      explain: '위험을 느끼면 온몸의 가시를 세우고 뒷걸음질로 위협해요. 가시를 쏘지는 못해요!' },
  ],
  rabbit: [
    { q: '토끼의 앞니는 어떻게 될까요?', a: ['평생 자란다', '한 번 빠지면 끝', '겨울에만 자란다'], correct: 0,
      explain: '토끼 앞니는 평생 자라요. 긴 귀로는 작은 소리도 잘 듣고 더위도 식힌답니다.' },
  ],
  /* 열대동물관 */
  squirrelmonkey: [
    { q: '다람쥐원숭이는 몸과 꼬리 중 어느 쪽이 더 길까요?', a: ['꼬리', '몸'], correct: 0, band: 'easy',
      explain: '몸보다 꼬리가 더 길어요! 긴 꼬리로 나무 사이를 누빌 때 균형을 잡는답니다.' },
    { q: '다람쥐원숭이의 긴 꼬리는 어디에 쓰일까요?', a: ['균형 잡기', '무기', '땅 파기'], correct: 0, band: 'hard',
      explain: '나무 위를 달릴 때 긴 꼬리로 균형을 잡아요. 몸보다 꼬리가 더 길답니다.' },
  ],
  marmoset: [
    { q: '코먼마모셋이 좋아하는 간식은 무엇일까요?', a: ['나무의 달콤한 진', '아이스크림', '돌멩이'], correct: 0,
      explain: '손바닥만 한 코먼마모셋은 나무줄기를 갉아 달콤한 진을 먹어요.' },
  ],
  lemur: [
    { q: '알락꼬리여우원숭이 꼬리에는 어떤 무늬가 있을까요?', a: ['까만·하얀 고리무늬', '점무늬', '무늬 없음'], correct: 0, band: 'easy',
      explain: '까만·하얀 고리무늬 꼬리를 깃발처럼 높이 들고 다녀요.' },
    { q: '알락꼬리여우원숭이는 어디에서 온 친구일까요?', a: ['마다가스카르', '북극', '한라산'], correct: 0, band: 'hard',
      explain: '여우원숭이들은 아프리카 옆 큰 섬, 마다가스카르에서만 살아요.' },
  ],
  hyrax: [
    { q: '바위너구리의 뜻밖의 먼 친척은 누구일까요?', a: ['코끼리', '토끼', '고양이'], correct: 0,
      explain: '토끼만 한 몸집이지만, 놀랍게도 코끼리와 먼 친척이래요!' },
  ],
  molerat: [
    { q: '벌거숭이두더지쥐 무리의 중심에는 누가 있을까요?', a: ['여왕', '왕', '장군'], correct: 0,
      explain: '개미처럼 여왕을 중심으로 무리 지어 사는 특별한 땅속 친구예요.' },
  ],
  treeporc: [
    { q: '트리포큐파인은 어디에서 살까요?', a: ['나무 위', '물속', '사막 한가운데'], correct: 0,
      explain: '나무 위에서 사는 호저예요. 꼬리로 나뭇가지를 감고 매달릴 수 있어요.' },
  ],
  beardie: [
    { q: '턱수염도마뱀의 「수염」은 사실 무엇일까요?', a: ['턱밑 비늘', '진짜 털', '붙인 수염'], correct: 0, band: 'easy',
      explain: '턱밑 비늘이 수염처럼 보여서 이런 이름이 붙었어요. 성격은 순한 도마뱀이랍니다.' },
    { q: '파충류가 햇볕(램프)을 쬐는 이유는?', a: ['체온을 조절하려고', '멋을 내려고', '털을 말리려고'], correct: 0, band: 'hard',
      explain: '파충류는 스스로 체온을 만들지 못하는 변온동물이라, 햇볕으로 몸을 데워요.' },
  ],
  python: [
    { q: '볼파이톤은 깜짝 놀라면 어떻게 할까요?', a: ['공처럼 몸을 동그랗게 만다', '하늘로 점프한다', '노래를 부른다'], correct: 0, band: 'easy',
      explain: '놀라면 공(ball)처럼 몸을 동그랗게 말아서 볼파이톤이라는 이름이 붙었어요.' },
    { q: '뱀은 눈꺼풀이 있을까요?', a: ['있다', '없다'], correct: 1, band: 'hard',
      explain: '뱀은 눈꺼풀 대신 투명한 비늘이 눈을 덮고 있어요. 그래서 눈을 깜빡이지 않는답니다.' },
  ],
  cornsnake: [
    { q: '콘스네이크의 이름은 어디에서 왔을까요?', a: ['옥수수밭 근처에서 자주 발견돼서', '옥수수를 먹어서', '몸이 노란색이라서'], correct: 0,
      explain: '옥수수(corn)밭 근처에서 자주 발견되어 이런 이름이 붙은 순한 뱀이에요.' },
  ],
  bluetongue: [
    { q: '블루텅스킨크는 놀라면 무엇을 보여줄까요?', a: ['새파란 혀', '빨간 배', '노란 발바닥'], correct: 0,
      explain: '놀라면 새파란 혀를 쏙 내밀어 "저리 가!" 하고 겁을 줘요.' },
  ],
  leachianus: [
    { q: '리키에너스는 세계에서 가장 ___ 게코(도마뱀붙이)예요.', a: ['큰', '작은', '시끄러운'], correct: 0,
      explain: '리키에너스는 세계에서 가장 큰 게코예요. 뉴칼레도니아 숲에서 왔답니다.' },
  ],
  tortoise: [
    { q: '거북이는 어떤 동물일까요?', a: ['파충류', '포유류', '어류'], correct: 0, band: 'easy',
      explain: '거북·뱀·도마뱀은 모두 파충류! 몸이 비늘이나 딱딱한 껍질로 덮여 있어요.' },
    { q: '레오파드거북 등껍질에는 어떤 무늬가 있을까요?', a: ['표범 무늬', '줄무늬', '체크 무늬'], correct: 0, band: 'hard',
      explain: '표범(레오파드) 무늬 등껍질을 가져서 레오파드거북이에요.' },
  ],
  pancake: [
    { q: '팬케이크거북의 특기는 무엇일까요?', a: ['바위틈에 쏙 숨기', '높이 날기', '얼음 지치기'], correct: 0,
      explain: '팬케이크처럼 납작한 등껍질 덕분에 바위틈에 쏙 숨을 수 있어요.' },
  ],
  /* 바다동물원 */
  furseal: [
    { q: '물개와 물범 중 겉으로 보이는 귀(귓바퀴)가 있는 쪽은?', a: ['물개', '물범'], correct: 0, band: 'easy',
      explain: '물개는 작은 귓바퀴가 겉으로 보여요. 물범은 귓구멍만 있답니다. 오늘 직접 확인해 봐요!' },
    { q: '물개가 헤엄칠 때 주로 쓰는 것은?', a: ['앞지느러미', '뒷지느러미', '꼬리'], correct: 0, band: 'hard',
      explain: '물개는 날개처럼 큰 앞지느러미로 날아가듯 헤엄쳐요. 물범은 반대로 뒷지느러미를 써요.' },
  ],
  seal: [
    { q: '물범이 가장 좋아하는 먹이는?', a: ['물고기', '풀', '과일'], correct: 0, band: 'easy',
      explain: '물범은 물고기를 잡아먹는 사냥꾼이에요. 수염으로 물의 흐름을 느껴 먹이를 찾아요.' },
    { q: '점박이물범은 우리나라 바다에도 살까요?', a: ['산다 (백령도)', '살지 않는다'], correct: 0, band: 'hard',
      explain: '점박이물범은 서해 백령도에 사는 우리나라 천연기념물(제331호)이에요!' },
  ],
  /* 원숭이마을 */
  macaque: [
    { q: '일본원숭이는 겨울에 무엇으로 유명할까요?', a: ['온천욕', '스키', '겨울잠'], correct: 0,
      explain: '일본원숭이는 눈 내리는 겨울에 따뜻한 온천에 몸을 담그는 것으로 유명해요.' },
  ],
  baboon: [
    { q: '개코원숭이 이름에 「개」가 들어간 이유는?', a: ['개처럼 긴 주둥이 때문', '개와 친해서', '짖는 소리 때문'], correct: 0, band: 'easy',
      explain: '개처럼 길쭉한 주둥이를 가져서 개코원숭이라고 불러요. 무리 생활의 달인이랍니다.' },
    { q: '원숭이들이 서로 털을 골라주는 이유는?', a: ['사이좋게 지내려고', '심심해서', '털을 팔려고'], correct: 0, band: 'hard',
      explain: '털 고르기는 벌레도 잡아주고 우정도 쌓는 원숭이들의 인사법이에요.' },
  ],
  pigtail: [
    { q: '돼지꼬리원숭이의 꼬리는 어떤 모양일까요?', a: ['짧고 꼬불꼬불', '길고 곧다', '꼬리가 없다'], correct: 0,
      explain: '돼지처럼 짧고 꼬불한 꼬리 때문에 돼지꼬리원숭이라는 이름이 붙었어요.' },
  ],
  mantled: [
    { q: '망토원숭이의 「망토」는 무엇일까요?', a: ['수컷 어깨의 은빛 털', '진짜 옷', '큰 날개'], correct: 0, band: 'easy',
      explain: '수컷 어깨의 은빛 털이 멋진 망토처럼 보여서 망토원숭이예요.' },
    { q: '사람 손과 원숭이 손의 공통점은?', a: ['마주 보는 엄지', '손톱이 없다', '손가락이 6개'], correct: 0, band: 'hard',
      explain: '엄지가 다른 손가락과 마주 볼 수 있어서 물건을 꽉 쥘 수 있어요. 영장류의 특별한 능력!' },
  ],
  ygibbon: [
    { q: '긴팔원숭이는 팔과 다리 중 어느 쪽이 더 길까요?', a: ['팔', '다리', '똑같다'], correct: 0, band: 'easy',
      explain: '긴팔원숭이는 다리보다 팔이 훨씬 길어요. 긴 팔로 나뭇가지를 그네 타듯 이동해요.' },
    { q: '노랑뺨기번 암컷의 몸 색은 무엇일까요?', a: ['금빛', '까만색', '초록색'], correct: 0, band: 'hard',
      explain: '수컷은 까만 몸에 노란 뺨, 암컷은 온몸이 금빛이에요. 부부가 서로 다른 색이랍니다.' },
  ],
  sgibbon: [
    { q: '은색기번은 어디에서만 살까요?', a: ['인도네시아 자바섬', '제주도', '북극'], correct: 0,
      explain: '은빛 털을 가진 은색기번은 인도네시아 자바섬에서만 산답니다.' },
  ],
  /* 물새장 */
  penguin: [
    { q: '펭귄은 하늘을 날 수 있을까요?', a: ['날 수 있다', '날 수 없다'], correct: 1, band: 'easy',
      explain: '펭귄은 하늘을 날지 못해요. 대신 날개를 지느러미처럼 써서 물속을 나는 듯 헤엄쳐요!' },
    { q: "자카스펭귄의 '자카스'는 무슨 뜻에서 왔을까요?", a: ['당나귀 울음소리를 닮아서', '몸이 작아서', '빨라서'], correct: 0, band: 'hard',
      explain: '자카스(jackass)는 수탕나귀라는 뜻! 우는 소리가 당나귀와 비슷해서 붙은 이름이에요.' },
  ],
  crane: [
    { q: '두루미는 예부터 무엇의 상징이었을까요?', a: ['장수', '용기', '부자'], correct: 0, band: 'easy',
      explain: '우아하게 춤추듯 걷는 두루미는 예부터 오래오래 사는 장수의 상징이었어요.' },
    { q: '두루미는 우리나라 천연기념물일까요?', a: ['맞다 (제202호)', '아니다'], correct: 0, band: 'hard',
      explain: '두루미는 천연기념물 제202호이자 멸종위기종이에요.' },
  ],
  pelican: [
    { q: '펠리컨 부리 아래 큰 주머니는 어디에 쓰일까요?', a: ['물고기 담기', '모자', '노래 부르기'], correct: 0,
      explain: '펠리컨은 부리 주머니를 그물처럼 써서 물고기를 물과 함께 퍼 담아요.' },
  ],
  heron: [
    { q: '해오라기가 주로 사냥하는 시간은 언제일까요?', a: ['해 질 무렵부터 밤', '한낮', '아침밥 시간'], correct: 0,
      explain: '해오라기는 해 질 무렵부터 활동하는 밤의 사냥꾼! 물가에서 꼼짝 않고 물고기를 기다려요.' },
  ],
  stork: [
    { q: '홍부리황새는 어떻게 인사할까요?', a: ['부리를 부딪쳐 딱딱 소리로', '날개를 흔들며', '노래를 부르며'], correct: 0,
      explain: '홍부리황새는 부리를 부딪쳐 딱딱 소리를 내며 인사해요. 붉은 부리와 다리가 멋지답니다.' },
  ],
  ibis: [
    { q: '흑따오기의 부리는 어떤 모양일까요?', a: ['아래로 길게 굽었다', '짧고 뭉툭하다', '위로 솟았다'], correct: 0,
      explain: '아래로 굽은 긴 부리로 진흙 속 먹이를 찾아내요.' },
  ],
};

/* kind: 'animal' | 'dwell'
   lm: 기존 랜드마크 id(좌표 재사용). lat/lon: OSM 실측 건물 중심 좌표 (원숭이마을 way 629007077, 물새장 way 629022478) */
export const SPOTS = [
  {
    id: 'predator', kind: 'animal', name: '맹수마을', emoji: '🦁', lm: 'predator',
    animals: ['lion', 'tiger', 'jaguar', 'puma', 'elephant', 'bear', 'hyena', 'jackal', 'lynx', 'fox'],
    observe: [
      { text: '코끼리가 코로 무엇을 하는지 1분만 조용히 지켜보고 적어봐요.', animals: ['elephant'] },
      { text: '지금 가장 편하게 쉬고 있는 맹수는 누구인가요? 어떤 자세인지 적어봐요.' },
    ],
  },
  {
    id: 'herbivore', kind: 'animal', name: '초식동물마을', emoji: '🦓', lm: 'herbivore',
    animals: ['zebra', 'kangaroo', 'alpaca', 'guanaco', 'donkey', 'minihorse'],
    observe: [
      { text: '얼룩말이 지금 뭘 하고 있나요? 귀가 어느 쪽을 향하는지도 살펴봐요.', animals: ['zebra'] },
      { text: '알파카의 털 색을 관찰하고, 만지면 어떤 느낌일지 상상해서 적어봐요.', animals: ['alpaca'] },
    ],
  },
  {
    id: 'minivillage', kind: 'animal', name: '꼬마동물마을', emoji: '🦦', lm: 'minivillage',
    animals: ['meerkat', 'otter', 'euotter', 'porcupine', 'rabbit'],
    observe: [
      { text: '미어캣 무리에서 지금 망을 보는 친구를 찾아봐요. 몇 마리가 서 있나요?', animals: ['meerkat'] },
      { text: '수달이 손으로 무엇을 하는지 지켜보고 적어봐요.', animals: ['otter', 'euotter'] },
    ],
  },
  {
    id: 'tropical', kind: 'animal', name: '열대동물관', emoji: '🦎', lm: 'tropical',
    animals: ['squirrelmonkey', 'marmoset', 'lemur', 'hyrax', 'molerat', 'treeporc', 'beardie', 'python', 'cornsnake', 'bluetongue', 'leachianus', 'tortoise', 'pancake'],
    observe: [
      { text: '가장 오랫동안 움직이지 않는 파충류를 찾아봐요. 숨 쉬는 게 보이나요?' },
      { text: '다람쥐원숭이가 무엇을 먹고 어떻게 이동하는지 지켜봐요.', animals: ['squirrelmonkey'] },
    ],
  },
  {
    id: 'sea', kind: 'animal', name: '바다동물원', emoji: '🦭', lm: 'sea',
    animals: ['furseal', 'seal'],
    observe: [
      { text: '물개가 물에 들어갈 때와 나올 때의 모습을 비교해서 적어봐요.', animals: ['furseal'] },
      { text: '물범이 숨을 쉬러 물 위로 몇 번 올라오는지 세어봐요.', animals: ['seal'] },
    ],
  },
  {
    id: 'monkeyvillage', kind: 'animal', name: '원숭이마을', emoji: '🐵',
    lat: 37.54901, lon: 127.08220,
    animals: ['macaque', 'baboon', 'pigtail', 'mantled', 'ygibbon', 'sgibbon'],
    observe: [
      { text: '원숭이 무리의 대장은 누구일까요? 왜 그렇게 생각했는지 적어봐요.' },
      { text: '원숭이들이 소리로 어떻게 이야기하는지 들어봐요.' },
    ],
  },
  {
    id: 'birdcage', kind: 'animal', name: '물새장', emoji: '🐧',
    lat: 37.54938, lon: 127.08228,
    animals: ['penguin', 'crane', 'pelican', 'heron', 'stork', 'ibis'],
    observe: [
      { text: '펭귄이 물에 들어가기 전에 무엇을 하는지 지켜봐요.', animals: ['penguin'] },
      { text: '두루미가 걷는 모습을 흉내 내는 말로 적어봐요. (예: 사뿐사뿐?)', animals: ['crane'] },
    ],
  },
  /* 체류 스팟 — 한적한 곳에서 잠시 머물며 기록 (혼잡 분산 취지) */
  {
    id: 'foreststage', kind: 'dwell', name: '숲속의무대', emoji: '🎭', lm: 'foreststage',
    dwell: { seconds: 60, prompt: '무대 근처에 앉아 1분만 귀를 기울여 봐요. 어떤 소리가 몇 가지나 들리나요?' },
  },
  {
    id: 'botanic', kind: 'dwell', name: '식물원', emoji: '🌷', lm: 'botanic',
    dwell: { seconds: 60, prompt: '가장 마음에 드는 식물을 하나 골라 이름표를 읽고, 왜 골랐는지 한 줄 남겨요.' },
  },
  {
    id: 'openstage', kind: 'dwell', name: '열린무대', emoji: '🎤', lm: 'openstage',
    dwell: { seconds: 60, prompt: '주변을 둘러보고 가장 마음에 드는 풍경을 말로 그려봐요.' },
  },
  {
    id: 'palgak', kind: 'dwell', name: '팔각당', emoji: '🏯', lm: 'palgak',
    dwell: { seconds: 60, prompt: '팔각당 근처에서 잠시 쉬며, 오늘 가장 기억에 남는 순간을 한 줄로 적어봐요.' },
  },
];

/* 발견 탐험 — 특정 스팟이 아니라 공원 전체를 돌며 찾기 (사진은 기기에만 저장) */
export const DISCOVERIES = [
  { id: 'stripes', title: '줄무늬 친구 찾기', emoji: '🦓',
    desc: '공원 어딘가에 줄무늬 옷을 입은 친구가 둘 있어요. 찾아서 사진으로 남겨봐요!',
    targets: ['tiger', 'zebra'], need: 2 },
  { id: 'endangered', title: '지켜주고 싶은 친구 찾기', emoji: '🌏',
    desc: '지구에서 점점 사라져 가는 멸종위기 친구들을 찾아 사진으로 남겨봐요.',
    targets: ['otter', 'euotter', 'crane', 'elephant', 'seal', 'bear', 'lemur'], need: 2 },
  { id: 'swimmers', title: '헤엄 선수 찾기', emoji: '💦',
    desc: '물속을 나는 듯 헤엄치는 선수들을 찾아봐요!',
    targets: ['furseal', 'seal', 'otter', 'euotter', 'penguin'], need: 2 },
  { id: 'tails', title: '멋진 꼬리 찾기', emoji: '✨',
    desc: '꼬리가 유난히 멋진 친구들을 찾아 사진으로 남겨봐요.',
    targets: ['jaguar', 'squirrelmonkey', 'lemur', 'treeporc'], need: 2 },
];

export const MEDALS = [
  { need: 3, name: '새싹 탐험가', emoji: '🌱' },
  { need: 8, name: '숲 탐험가', emoji: '🌳' },
  { need: 15, name: '리니워니 친구', emoji: '🦊' },
];

/* 모험 유형 — 오늘의 기록으로 계산하는 재미 요소 (규칙 기반) */
export const EXPLORER_TYPES = [
  { id: 'observer', name: '조용한 관찰가', emoji: '🔍', desc: '오래 지켜보고 기록하는 것을 좋아해요.' },
  { id: 'collector', name: '장면 수집가', emoji: '📷', desc: '멋진 순간을 사진으로 모으는 걸 좋아해요.' },
  { id: 'scholar', name: '꼬마 박사', emoji: '🎓', desc: '동물 지식 퀴즈에 강한 똑똑한 탐험가!' },
  { id: 'wanderer', name: '느긋한 산책가', emoji: '🍃', desc: '한적한 곳에서 풍경을 즐기는 탐험가예요.' },
  { id: 'adventurer', name: '씩씩한 개척가', emoji: '🧭', desc: '공원 구석구석 새로운 곳을 찾아다녀요.' },
];
