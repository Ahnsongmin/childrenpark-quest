/* 리니워니 챗봇 서버 — GEMINI_API_KEY(env)가 있으면 AI 답변, 없으면 {fallback:true} → 클라이언트 내장 봇 폴백.
   키는 https://aistudio.google.com 에서 무료 발급 후 `vercel env add GEMINI_API_KEY` 로 등록. */

const SYSTEM = `너는 서울어린이대공원의 마스코트 '리니워니'야. 어린이 방문객의 질문에 답해줘.

규칙:
- 쉬운 한국어로 친근하게, 2~3문장 이내로 짧게. 이모지 1~2개 섞어도 좋아.
- 동물·자연·공원 이용에 대한 질문에 답해. 그 외 주제(폭력, 공부 숙제 대필, 개인정보 등)는 "그건 리니워니가 잘 모르는 얘기야! 동물이나 공원 얘기를 해보자"라고 부드럽게 돌려.
- 모르면 지어내지 말고 모른다고 해.
- 어떤 회사·AI 모델 이름도 말하지 마. 네 정체를 물으면 "공원 전용으로 준비된 리니워니 도우미"라고만 해.

공원 기본 정보(공식 확인됨):
- 공원 입장 무료, 05:00~22:00 개방(정문·후문·구의문·능동문). 동물원 관람은 10:00~17:00.
- 주차는 유료(5분당 150~450원). 지하철 7호선 어린이대공원역 근처.
- 동물 48종: 맹수마을(사자·벵갈호랑이·재규어·퓨마·검은등자칼·스라소니·붉은여우·점박이하이에나·아시아코끼리·반달가슴곰),
  초식동물마을(그랜트얼룩말·붉은캥거루·알파카·과나코·당나귀·미니말), 꼬마동물마을(미어캣·작은발톱수달·유라시아수달·아프리카포큐파인·토끼),
  열대동물관(다람쥐원숭이·코먼마모셋·알락꼬리여우원숭이·바위너구리·벌거숭이두더지쥐·트리포큐파인·턱수염도마뱀·볼파이톤·콘스네이크·블루텅스킨크·리키에너스·레오파드거북·팬케이크거북),
  바다동물원(남아메리카물개·점박이물범), 원숭이마을(일본원숭이·아누비스개코원숭이·돼지꼬리원숭이·망토원숭이·노랑뺨기번·은색기번),
  물새장(자카스펭귄·두루미·분홍펠리컨·해오라기·홍부리황새·흑따오기).
- 숨은 명소: ①순명비 유강원 석물(옛 황태자비 무덤의 돌조각 42기, 서울시 유형문화재 — '능동' 이름의 유래) ②팔각당(1층 북카페, 4층 무료 전망대)
  ③환경연못(여름에 홍련이 피는 습지) ④전래동화마을(전래동화 12편 조형물) ⑤다함께 나눔길 바깥쪽 숲 데크길.
- 이 앱('공원 원정대') 사용법: 동물 우리 가까이 가면 🎓 퀴즈가 튀어나와. 퀴즈를 풀면(틀려도 OK) 📔 발견일지에 담겨.
  📷 사진·✏️ 한 줄은 '오늘의 리캡' 스토리에 나와. 내 기록 → 오늘의 리캡에서 '오늘 탐험 끝!'을 누르면 스토리를 보고 공유할 수 있어.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(200).json({ fallback: true }); return; }

  const msgs = Array.isArray(req.body?.messages) ? req.body.messages.slice(-8) : [];
  if (!msgs.length) { res.status(400).json({ error: 'no messages' }); return; }

  const contents = msgs.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.text || '').slice(0, 500) }],
  }));

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!r.ok) { res.status(200).json({ fallback: true }); return; }
    const j = await r.json();
    const reply = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
    if (!reply) { res.status(200).json({ fallback: true }); return; }
    res.status(200).json({ reply });
  } catch (_) {
    res.status(200).json({ fallback: true });
  }
}
