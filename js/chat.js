/* 리니워니 챗봇 — /api/chat(AI, env-gated)에 먼저 묻고, 실패하면 내장 지식 봇으로 답한다.
   내장 봇: 동물 48종 desc·퀴즈 해설 + 공식 확인된 공원 정보(요금·시간·숨은 명소) */
import { ANIMALS, QUIZZES } from './quests-data.js';
import { toast } from './ui.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 흔한 부르는 말 → 동물 id (이름 자체는 아래에서 자동 매칭) */
const ALIAS = {
  수달: 'otter', 호랑이: 'tiger', 사자: 'lion', 곰: 'bear', 반달곰: 'bear', 코끼리: 'elephant',
  여우: 'fox', 얼룩말: 'zebra', 캥거루: 'kangaroo', 미니말: 'minihorse', 조랑말: 'minihorse', 원숭이: 'macaque',
  긴팔원숭이: 'ygibbon', 기번: 'ygibbon', 펭귄: 'penguin', 두루미: 'crane',
  펠리컨: 'pelican', 황새: 'stork', 따오기: 'ibis', 뱀: 'python', 도마뱀: 'beardie',
  거북: 'tortoise', 거북이: 'tortoise', 게코: 'leachianus', 물개: 'furseal', 물범: 'seal',
  하이에나: 'hyena', 자칼: 'jackal', 호저: 'porcupine', 고슴도치: 'porcupine', 두더지: 'molerat',
};

function findAnimal(q) {
  const t = q.replace(/\s/g, '');
  for (const [id, a] of Object.entries(ANIMALS)) if (t.includes(a.name.replace(/\s/g, ''))) return id;
  let hit = null, len = 0;
  for (const [alias, id] of Object.entries(ALIAS)) {
    if (t.includes(alias) && alias.length > len) { hit = id; len = alias.length; }
  }
  return hit;
}

function localAnswer(q) {
  const aid = findAnimal(q);
  if (aid) {
    const a = ANIMALS[aid];
    const quiz = QUIZZES[aid]?.[0];
    return `${a.emoji} ${a.name}! ${a.desc}${quiz ? ` 하나 더 — ${quiz.explain}` : ''} 우리 가까이 오면 퀴즈도 준비할게!`;
  }
  const rules = [
    [/입장료|요금|얼마|무료|돈/, '공원 입장은 무료야! 🆓 새벽 5시부터 밤 10시까지 열려 있어. 동물원 관람은 오전 10시~오후 5시란다. (주차는 유료야!)'],
    [/몇\s*시|시간|언제\s*(열|닫|여|해)|개장|폐장|문\s*닫/, '공원은 새벽 5시~밤 10시까지 열려 있어. 동물 친구들은 오전 10시~오후 5시에 만날 수 있어! 🕐'],
    [/숨은|명소|조용|한적|비밀|어디\s*가/, '리니워니만 아는 곳 알려줄게! 🤫 ①유강원 석물 — 옛날 황태자비 무덤의 돌조각 42개가 남아 있어(능동이라는 이름도 여기서 왔대!) ②팔각당 4층 무료 전망대 ③여름에 홍련이 피는 환경연못 ④전래동화마을. 가봤어?'],
    [/발견일지|도감|등재|채우/, '📔 발견일지는 🎓 퀴즈를 풀어야 채워져! 틀려도 괜찮아, 배우면 성공이거든. 동물 우리 가까이 가면 퀴즈가 튀어나올 거야!'],
    [/스토리|리캡|공유/, '내 기록 → 🌟 오늘의 리캡에서 "🎬 오늘 탐험 끝!"을 눌러봐. 오늘 만난 동물들이 스토리로 착착 넘어가고, 마음에 드는 장면은 📤 이미지로 공유할 수 있어!'],
    [/사진/, '동물 친구를 톡 누르고 📷 사진 찍기를 하면 오늘의 리캡 스토리에 나와! 사진은 네 휴대폰 밖으로 나가지 않으니 안심해. 📱'],
    [/퀴즈/, '매일 마을마다 한두 친구가 🎓 퀴즈를 준비해! 누군지는 비밀 — 우리 가까이 가면 튀어나와. 풀면 발견일지에 담긴단다!'],
    [/주차|차\s*타|버스|지하철|어떻게\s*가/, '지하철 7호선 어린이대공원역에서 가까워! 🚇 주차장은 유료(5분당 150~450원)니까 대중교통이 편할 거야.'],
    [/안녕|하이|반가|누구|누굴|뭐야|정체/, '안녕! 나는 공원 지킴이 리니워니야 🦊 동물 친구들, 공원 이용, 숨은 명소… 뭐든 물어봐!'],
    [/고마|감사|잘\s*가|바이|빠이/, '천만에! 즐거운 탐험 되길 바라 🌳 또 궁금하면 언제든 불러줘!'],
  ];
  for (const [re, ans] of rules) if (re.test(q)) return ans;
  return '음, 그건 리니워니가 아직 배우는 중이야! 🤔 동물 이름(수달, 미어캣, 펭귄…)이나 "숨은 명소", "발견일지 어떻게 채워?"처럼 물어봐 줘!';
}

/* ── UI ── */
const history = []; // { role: 'user'|'bot', text }
let busy = false;

function addMsg(role, text) {
  history.push({ role, text });
  const div = document.createElement('div');
  div.className = `cmsg ${role}`;
  div.innerHTML = esc(text);
  $('chatMsgs').appendChild(div);
  $('chatMsgs').scrollTop = $('chatMsgs').scrollHeight;
  return div;
}

async function ask(q) {
  if (busy) return;
  busy = true;
  addMsg('user', q);
  const wait = document.createElement('div');
  wait.className = 'cmsg bot wait';
  wait.textContent = '· · ·';
  $('chatMsgs').appendChild(wait);
  $('chatMsgs').scrollTop = $('chatMsgs').scrollHeight;

  let reply = null;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-6) }),
      signal: AbortSignal.timeout(22000),
    });
    if (r.ok) reply = (await r.json()).reply || null;
  } catch (_) { /* 오프라인·타임아웃 → 내장 봇 */ }
  if (!reply) reply = localAnswer(q);

  wait.remove();
  addMsg('bot', reply);
  busy = false;
}

const CHIPS = ['수달은 뭘 잘해?', '숨은 명소 알려줘', '발견일지 어떻게 채워?', '입장료 있어?'];

export function initChat() {
  $('chatBtn').addEventListener('click', () => {
    $('chatWrap').classList.add('open');
    if (!history.length) addMsg('bot', '안녕! 나는 공원 지킴이 리니워니야 🦊 동물이든 공원이든 궁금한 걸 물어봐!');
    $('chatText').focus();
  });
  $('chatBack').addEventListener('click', () => $('chatWrap').classList.remove('open'));
  $('chatClose').addEventListener('click', () => $('chatWrap').classList.remove('open'));

  $('chatChips').innerHTML = CHIPS.map((c) => `<button class="chip">${esc(c)}</button>`).join('');
  $('chatChips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));

  const send = () => {
    const t = $('chatText').value.trim();
    if (!t) return;
    if (t.length > 200) { toast('조금만 짧게 물어봐 줘!'); return; }
    $('chatText').value = '';
    ask(t);
  };
  $('chatSend').addEventListener('click', send);
  $('chatText').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}
