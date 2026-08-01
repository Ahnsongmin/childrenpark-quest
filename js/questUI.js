/* 탐험 UI: 근처 카드(HUD)·탐험 시트·발견 탐험·내 기록(발견일지/관찰노트/리캡/성장) */
import { ANIMALS } from './quests-data.js';
import { savePhoto, getPhoto, fileToDataUrl } from './store.js';
import { toast, seen } from './ui.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const aNames = (ids) => ids.map((id) => `${ANIMALS[id].emoji} ${ANIMALS[id].name}`).join(', ');

export function initQuestUI(quests, opts = {}) {
  const hud = $('hud');
  const frame = $('frame');
  hud.style.pointerEvents = 'auto';
  hud.style.cursor = 'pointer';

  /* ── 사진 찍기 (기기에만 저장) ── */
  let photoCb = null;
  const photoIn = $('photoIn');
  photoIn.addEventListener('change', async () => {
    const f = photoIn.files && photoIn.files[0];
    photoIn.value = '';
    if (!f || !photoCb) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      const id = await savePhoto(dataUrl);
      photoCb(id, dataUrl);
    } catch (_) { toast('사진을 불러오지 못했어요'); }
    photoCb = null;
  });
  const askPhoto = (cb) => { photoCb = cb; photoIn.click(); };

  /* ── 근처 카드 ── */
  function renderHud() {
    if (frame.classList.contains('inZone')) return; // 마을 안에서는 interior가 HUD 관리
    const near = quests.near;
    const p = quests.todayProgress();
    if (near && near.kind === 'animal') {
      const names = near.animals.slice(0, 3).map((a) => ANIMALS[a].emoji).join(' ');
      const has = quests.isAssigned(near.id) && !quests.spotDone(near.id);
      hud.innerHTML = `
        <span style="font-size:22px">${near.emoji}</span>
        <div style="flex:1"><b style="color:#2e6b34">지금 근처: ${esc(near.name)}</b> <span style="font-size:14px">${names}</span><br>
        ${has ? '<b style="color:#d97706">💡 탐험 가능</b> — 눌러서 열어봐요' : '눌러서 기록을 남겨봐요 (📷 사진 · ✏️ 한 줄)'}</div>`;
    } else if (near) {
      const has = quests.isAssigned(near.id) && !quests.spotDone(near.id);
      hud.innerHTML = `
        <span style="font-size:22px">${near.emoji}</span>
        <div style="flex:1"><b style="color:#2e6b34">지금 근처: ${esc(near.name)}</b><br>
        ${has ? '<b style="color:#d97706">💡 쉬어가기 탐험 가능</b> — 눌러서 열어봐요' : '잠시 쉬어 가기 좋은 곳이에요'}</div>`;
    } else {
      hud.innerHTML = `
        <span style="font-size:22px">🗺️</span>
        <div style="flex:1"><b style="color:#2e6b34">오늘의 탐험 ${p.done}/${p.total}</b> · 발견일지 ${quests.dexList().filter((a) => a.met).length}종 · 랜드마크 ${seen.size}/16<br>
        동물 친구 가까이 가면 탐험이 열려요 — 눌러서 오늘의 탐험 보기</div>`;
    }
  }

  hud.addEventListener('click', () => {
    if (quests.near) openQuestSheet(quests.near);
    else openToday();
  });

  /* ── 탐험 시트 ── */
  const qWrap = $('questWrap');
  const qSheet = $('questSheet');
  $('questBack').addEventListener('click', closeSheet);
  function closeSheet() { qWrap.classList.remove('open'); renderHud(); }

  function openQuestSheet(spot) {
    const qs = quests.questsFor(spot.id);
    let html = `<div class="grip"></div><h2 style="font-size:18px;color:#223">${spot.emoji} ${esc(spot.name)}</h2>`;
    if (spot.kind === 'animal') {
      html += `<div class="chips">${spot.animals.map((a) => `<span class="chip">${ANIMALS[a].emoji} ${esc(ANIMALS[a].name)}</span>`).join('')}</div>`;
      if (opts.onEnterZone && !frame.classList.contains('inZone')) {
        html += `<div class="qrow"><button class="qbtn" id="qEnter">🚪 마을 안 둘러보기</button></div>`;
      }
    }
    for (const q of qs) {
      if (q.type === 'observe') html += observeBlock(spot, q);
      if (q.type === 'dwell') html += dwellBlock(spot, q);
    }
    if (spot.kind === 'animal') html += freeBlock(spot);
    qSheet.innerHTML = html;
    bindSheet(spot, qs);
    qWrap.classList.add('open');
    renderHud();
  }

  const doneTag = '<span class="qdone">✅ 완료</span>';

  function observeBlock(spot, q) {
    if (q.done) return `<div class="qcard">🔍 <b>관찰노트</b> ${doneTag}</div>`;
    return `<div class="qcard" id="qObs">🔍 <b>관찰노트</b>
      <p class="qq">${esc(q.prompt)}</p>
      <textarea id="obsText" rows="2" placeholder="본 것을 자유롭게 적어봐요"></textarea>
      <div class="qrow"><button class="qbtn ghost" id="obsPhoto">📷 사진 붙이기</button><button class="qbtn" id="obsSave">저장</button></div>
      <div id="obsThumb"></div></div>`;
  }
  function dwellBlock(spot, q) {
    if (q.done) return `<div class="qcard">🍃 <b>쉬어가기</b> ${doneTag}</div>`;
    return `<div class="qcard" id="qDwell">🍃 <b>쉬어가기</b>
      <p class="qq">${esc(q.prompt)}</p>
      <button class="qbtn" id="dwellStart">⏱️ ${q.seconds}초 머물기 시작</button>
      <div id="dwellArea" style="display:none">
        <textarea id="dwellText" rows="2" placeholder="느낀 것을 한 줄로 남겨요"></textarea>
        <div class="qrow"><button class="qbtn" id="dwellSave">저장</button></div>
      </div></div>`;
  }
  function freeBlock(spot) {
    return `<div class="qcard">✨ <b>자유 기록</b>
      <p class="qsub">탐험이 없어도 언제든 남길 수 있어요. 사진은 휴대폰에만 저장돼요.</p>
      <div class="qrow"><button class="qbtn ghost" id="freePhoto">📷 사진 찍기</button><button class="qbtn ghost" id="freeNote">✏️ 한 줄 남기기</button></div>
      <div id="freeArea" style="display:none"><textarea id="freeText" rows="2" placeholder="지금 이 순간을 한 줄로!"></textarea>
      <div class="qrow"><button class="qbtn" id="freeSave">저장</button></div></div></div>`;
  }

  function bindSheet(spot, qs) {
    const enter = $('qEnter');
    if (enter) enter.addEventListener('click', () => { closeSheet(); opts.onEnterZone(spot); });
    const obs = $('qObs');
    if (obs) {
      let photoId = null;
      $('obsPhoto').addEventListener('click', () => askPhoto((id, url) => {
        photoId = id;
        $('obsThumb').innerHTML = `<img src="${url}" class="qthumb">`;
      }));
      $('obsSave').addEventListener('click', () => {
        const t = $('obsText').value.trim();
        if (!t && !photoId) { toast('관찰한 내용을 적거나 사진을 붙여봐요'); return; }
        const fresh = quests.saveObserve(spot.id, t, photoId);
        toast(fresh.length ? `🔍 기록 완료! 📔 ${aNames(fresh)} 발견일지에 담겼어요!` : '🔍 관찰노트에 기록했어요!');
        openQuestSheet(spot);
      });
    }
    const dw = $('qDwell');
    if (dw) {
      $('dwellStart').addEventListener('click', () => {
        const q = qs.find((x) => x.type === 'dwell');
        let left = q.seconds;
        const btn = $('dwellStart');
        btn.disabled = true;
        const iv = setInterval(() => {
          left--;
          btn.textContent = `🍃 천천히 둘러봐요… ${left}초`;
          if (left <= 0) {
            clearInterval(iv);
            btn.style.display = 'none';
            $('dwellArea').style.display = 'block';
          }
        }, 1000);
      });
      $('dwellSave').addEventListener('click', () => {
        quests.completeDwell(spot.id, $('dwellText').value.trim());
        toast('🍃 오늘의 쉼을 기록했어요!');
        openQuestSheet(spot);
      });
    }
    const fp = $('freePhoto');
    if (fp) {
      fp.addEventListener('click', () => pickAnimalPhoto(spot.animals));
      $('freeNote').addEventListener('click', () => { $('freeArea').style.display = 'block'; });
      $('freeSave').addEventListener('click', () => {
        const t = $('freeText').value.trim();
        if (!t) return;
        quests.saveFreeNote(spot.id, t, null);
        toast('✏️ 한 줄을 남겼어요!');
        openQuestSheet(spot);
      });
    }
  }

  /* 촬영 결과: 발견 탐험 판정 + 발견일지 저장 + 동물 설명 */
  function showCaptureResult(aid, photoId) {
    const r = quests.addDiscoveryPhoto(aid, photoId);
    const a = ANIMALS[aid];
    let html = `<div class="grip"></div><h2 style="font-size:17px;color:#223">${a.emoji} ${esc(a.name)}</h2>
      <p style="margin-top:8px;font-size:14px;line-height:1.6;color:#445">${esc(a.desc)}</p>`;
    if (r.hit) {
      html += `<div class="qexplain" style="display:block">✨ <b>${r.def.emoji} ${esc(r.def.title)}</b> ${r.got.length}/${r.def.need} 발견!${r.done ? '<br>🎉 오늘의 발견 탐험 완성!' : ''}</div>`;
    }
    html += '<p class="qsub">📔 발견일지에 사진과 함께 저장됐어요.</p>';
    qSheet.innerHTML = html;
    qWrap.classList.add('open');
    renderHud();
    if (r.done) toast(`🎉 발견 탐험 "${r.def.title}" 완성!`);
  }

  /* 사진 찍고 어떤 동물인지 고르기 */
  function pickAnimalPhoto(animalIds) {
    qSheet.innerHTML = `<div class="grip"></div><h2 style="font-size:17px;color:#223">📷 누구를 찍을까요?</h2>
      <p class="qsub">찍고 나면 발견일지에 저장돼요. 사진은 휴대폰 밖으로 나가지 않아요.</p>
      <div class="chips">${animalIds.map((a) => `<button class="chip pick" data-a="${a}">${ANIMALS[a].emoji} ${esc(ANIMALS[a].name)}</button>`).join('')}</div>`;
    qSheet.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => {
      const aid = b.dataset.a;
      askPhoto((id) => showCaptureResult(aid, id));
    }));
    qWrap.classList.add('open');
  }

  /* 마을 안에서 동물을 탭했을 때: 소개 + 퀴즈/사진/한 줄/탐험 */
  function openAnimal(animalId, spot) {
    const a = ANIMALS[animalId];
    const hasQuest = spot && quests.isAssigned(spot.id) && !quests.spotDone(spot.id);
    const hasQuiz = quests.quizFor(animalId) && !quests.animalQuizDone(animalId);
    qSheet.innerHTML = `<div class="grip"></div><h2 style="font-size:18px;color:#223">${a.emoji} ${esc(a.name)}</h2>
      <p style="margin-top:8px;font-size:14px;line-height:1.6;color:#445">${esc(a.desc)}</p>
      <p class="qsub">🎓 퀴즈·📷 사진·✏️ 한 줄 — 하나만 해도 이 친구가 📔 발견일지에 담겨요.</p>
      ${hasQuiz ? `<div class="qrow"><button class="qbtn" id="anQuiz">🎓 ${esc(a.name)}의 퀴즈 풀기</button></div>` : ''}
      <div class="qrow"><button class="qbtn ghost" id="anPhoto">📷 사진 찍기</button><button class="qbtn ghost" id="anNote">✏️ 한 줄 남기기</button></div>
      ${hasQuest ? '<div class="qrow"><button class="qbtn ghost" id="anQuest">💡 이 마을의 탐험 열기</button></div>' : ''}
      <div id="anArea" style="display:none"><textarea id="anText" rows="2" placeholder="이 친구에게 하고 싶은 말이나 본 것을 적어봐요"></textarea>
      <div class="qrow"><button class="qbtn" id="anSave">저장</button></div></div>`;
    if (hasQuiz) $('anQuiz').addEventListener('click', () => openAnimalQuiz(animalId));
    $('anPhoto').addEventListener('click', () => askPhoto((id) => showCaptureResult(animalId, id)));
    $('anNote').addEventListener('click', () => { $('anArea').style.display = 'block'; });
    $('anSave').addEventListener('click', () => {
      const t = $('anText').value.trim();
      if (!t) return;
      const fresh = quests.saveFreeNote(spot ? spot.id : null, `${a.emoji} ${a.name}: ${t}`, null, animalId);
      toast(fresh.length ? `✏️ 기록 완료! 📔 ${aNames(fresh)} 발견일지에 담겼어요!` : '✏️ 기록했어요!');
      closeSheet();
    });
    if (hasQuest) $('anQuest').addEventListener('click', () => openQuestSheet(spot));
    qWrap.classList.add('open');
  }

  /* 동물 퀴즈 시트 — 우리 가까이 가면 자동으로 뜨거나, 동물 카드에서 열 수 있음 */
  function openAnimalQuiz(animalId) {
    const a = ANIMALS[animalId];
    const quiz = quests.quizFor(animalId);
    if (!quiz || quests.animalQuizDone(animalId)) { openAnimal(animalId, quests.spotById(a.spot)); return; }
    qSheet.innerHTML = `<div class="grip"></div><h2 style="font-size:18px;color:#223">🎓 ${a.emoji} ${esc(a.name)}의 퀴즈!</h2>
      <div class="qcard" id="qQuiz">
        <p class="qq">${esc(quiz.q)}</p>
        <div class="qopts">${quiz.a.map((t, i) => `<button data-i="${i}">${esc(t)}</button>`).join('')}</div>
        <div class="qexplain" id="qExplain" style="display:none"></div>
      </div>`;
    qSheet.querySelectorAll('.qopts button').forEach((b) => b.addEventListener('click', () => {
      const r = quests.answerQuiz(animalId, +b.dataset.i);
      qSheet.querySelectorAll('.qopts button').forEach((x) => { x.disabled = true; });
      b.classList.add(r.correct ? 'ok' : 'no');
      const ex = $('qExplain');
      ex.style.display = 'block';
      ex.innerHTML = `${r.correct ? '🎉 <b>정답!</b>' : `🌱 <b>정답은 "${esc(r.answer)}"</b> — 틀려도 배우면 성공!`}<br>${esc(r.explain)}`
        + (r.newAnimals.length ? `<br>📔 <b>${aNames(r.newAnimals)}</b> 발견일지에 담겼어요!` : '');
      if (r.newAnimals.length) toast(`📔 ${aNames(r.newAnimals)} 발견!`);
      renderHud();
    }));
    qWrap.classList.add('open');
  }

  /* 마을 안에서 동물 우리 가까이 갔을 때 — 그 동물이 퀴즈를 냄.
     false 반환 = 지금은 못 보여줌(다른 창 열림) → interior가 잠시 후 재시도 */
  function onAnimalNear(animalId) {
    if (!quests.quizFor(animalId) || quests.animalQuizDone(animalId)) return true; // 오늘은 낼 퀴즈 없음
    if (qWrap.classList.contains('open') || recWrap.classList.contains('open')) return false;
    const a = ANIMALS[animalId];
    toast(`💡 ${a.emoji} ${a.name}가 퀴즈를 냈어요!`);
    openAnimalQuiz(animalId);
    return true;
  }

  /* ── 오늘의 탐험 목록 (근처가 아닐 때 카드 탭) ── */
  function openToday() {
    const v = quests.visit;
    const d = quests.discovery();
    const row = (id) => {
      const s = quests.spotById(id);
      return `<div class="trow">${s.emoji} <b>${esc(s.name)}</b><span>${quests.spotDone(id) ? '✅ 완료' : '가까이 가면 열려요'}</span></div>`;
    };
    qSheet.innerHTML = `<div class="grip"></div><h2 style="font-size:18px;color:#223">🧭 오늘의 탐험</h2>
      <p class="qsub">오늘은 이 곳들에서 탐험이 기다리고 있어요. 지도를 보며 천천히 걸어가 봐요!</p>
      ${v.assign.spots.map(row).join('')}${row(v.assign.dwell)}
      <div class="trow">${d.def.emoji} <b>${esc(d.def.title)}</b><span>${d.done ? '✅ 완료' : `${d.got.length}/${d.def.need} — 공원 어디서든`}</span></div>
      <p class="qsub" style="margin-top:6px">${esc(d.def.desc)}</p>`;
    qWrap.classList.add('open');
  }

  /* ── 내 기록 ── */
  const recWrap = $('recWrap');
  $('recBack').addEventListener('click', () => recWrap.classList.remove('open'));
  $('recBtn').addEventListener('click', () => { openRecord('dex'); });
  let recTab = 'dex';

  function openRecord(tab) {
    recTab = tab || recTab;
    recWrap.classList.add('open');
    document.querySelectorAll('#recTabs button').forEach((b) => b.classList.toggle('sel', b.dataset.t === recTab));
    const body = $('recBody');
    if (recTab === 'dex') renderDex(body);
    if (recTab === 'notes') renderNotes(body);
    if (recTab === 'recap') renderRecap(body);
    if (recTab === 'growth') renderGrowth(body);
  }
  document.querySelectorAll('#recTabs button').forEach((b) => b.addEventListener('click', () => openRecord(b.dataset.t)));

  function medalLine() {
    const m = quests.medal();
    const cur = m.cur ? `${m.cur.emoji} <b>${m.cur.name}</b>` : '🥚 예비 탐험가';
    const next = m.next ? ` · 다음 메달까지 탐험 ${m.next.need - m.count}개` : ' · 최고 메달 달성!';
    return `<div class="medal">${cur} <span>(탐험 ${m.count}개 완료${next})</span></div>`;
  }

  async function renderDex(body) {
    const list = quests.dexList();
    const met = list.filter((a) => a.met);
    body.innerHTML = `${medalLine()}<p class="qsub">발견일지 <b>${met.length}</b> / ${list.length}종</p>
      <div class="dexgrid">${list.map((a) => a.met
        ? `<div class="dexcell" data-a="${a.id}"><div class="dexemo">${a.emoji}</div><div class="dexname">${esc(a.name)}</div><div class="dexdate">${a.met.first.slice(5)}</div></div>`
        : `<div class="dexcell locked"><div class="dexemo">❔</div><div class="dexname">???</div></div>`).join('')}</div>
      <p class="qsub">동물 우리 가까이 가면 🎓 퀴즈가 튀어나와요! 퀴즈·📷 사진·✏️ 한 줄을 하면 일지에 담겨요. ❔ 친구는 다음 방문에 만나러 가요!</p>`;
    for (const cell of body.querySelectorAll('.dexcell[data-a]')) {
      const a = list.find((x) => x.id === cell.dataset.a);
      if (a.met && a.met.photo) {
        const url = await getPhoto(a.met.photo);
        if (url) cell.querySelector('.dexemo').innerHTML = `<img src="${url}" class="dexphoto">`;
      }
      cell.addEventListener('click', () => {
        toast(a.desc, `${a.emoji} ${a.name}`);
      });
    }
  }

  async function renderNotes(body) {
    const notes = quests.notes().sort((a, b) => b.ts - a.ts);
    if (!notes.length) {
      body.innerHTML = '<p class="qsub">아직 기록이 없어요. 동물 친구 앞에서 🔍 관찰노트를 남겨봐요!</p>';
      return;
    }
    body.innerHTML = notes.map((n, i) => `<div class="ncard" data-i="${i}">
      <div class="ndate">${n.date} · ${esc(n.spotName)} ${n.type === 'observe' ? '🔍' : n.type === 'dwell' ? '🍃' : '✏️'}</div>
      <div>${esc(n.text || '(사진 기록)')}</div><div class="nphoto"></div></div>`).join('');
    for (const card of body.querySelectorAll('.ncard')) {
      const n = notes[+card.dataset.i];
      if (n.photo) {
        const url = await getPhoto(n.photo);
        if (url) card.querySelector('.nphoto').innerHTML = `<img src="${url}" class="qthumb">`;
      }
    }
  }

  async function renderRecap(body) {
    const r = quests.recap();
    const newNames = r.newAnimals.map((id) => `${ANIMALS[id].emoji} ${ANIMALS[id].name}`).join(', ');
    body.innerHTML = `${medalLine()}
      <div class="rcard"><b>${r.visit.n}번째 방문 · ${r.visit.date}</b><br>
      오늘 만난 동물 <b>${r.metCount}종</b> · 발견일지 총 <b>${r.dexTotal}종</b>
      ${r.newAnimals.length ? `<br>새로 만난 친구: ${newNames}` : ''}</div>
      <div class="rcard"><b>${r.type.emoji} 오늘의 모험 유형: ${r.type.name}</b><br><span class="qsub">${esc(r.type.desc)}</span></div>
      ${r.quizzes.length ? `<div class="rcard"><b>🎓 오늘 배운 것</b>${r.quizzes.map((q) => `<div class="rquiz">${q.correct ? '⭕' : '🌱'} ${esc(q.q)}<br><span class="qsub">${esc(q.explain)}</span></div>`).join('')}</div>` : ''}
      ${r.notes.length ? `<div class="rcard"><b>📝 오늘의 기록</b>${r.notes.map((n) => `<div class="rquiz">${esc(n.text || '(사진)')}</div>`).join('')}</div>` : ''}
      <div class="rphotos"></div>
      <button class="qbtn" id="shareRecap">📤 오늘의 리캡 공유하기</button>`;
    const ph = body.querySelector('.rphotos');
    for (const id of r.photos.slice(0, 8)) {
      const url = await getPhoto(id);
      if (url) ph.innerHTML += `<img src="${url}" class="qthumb">`;
    }
    $('shareRecap').addEventListener('click', async () => {
      const text = `🌳 공원 원정대 ${r.visit.n}번째 탐험!\n오늘 만난 동물 ${r.metCount}종, 발견일지 ${r.dexTotal}종 달성\n나의 모험 유형: ${r.type.emoji} ${r.type.name}\n${location.origin}`;
      try {
        if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast('리캡을 복사했어요!'); }
      } catch (_) { /* 취소 */ }
    });
  }

  function renderGrowth(body) {
    const g = quests.growth();
    if (!g.length) { body.innerHTML = '<p class="qsub">첫 탐험을 시작하면 성장 기록이 쌓여요!</p>'; return; }
    body.innerHTML = `${medalLine()}${g.map((v) => `<div class="rcard"><b>${v.n}회차</b> (${v.date})<br>
      만난 동물 ${v.met}종 · 탐험 ${v.quests}개${v.newAnimals.length ? `<br><span class="qsub">새 친구: ${v.newAnimals.join(', ')}</span>` : ''}</div>`).join('')}`;
  }

  /* ── 재방문 인사 (리니워니 말풍선) ── */
  const hello = quests.greeting();
  if (hello) {
    const g = $('greet');
    $('greetText').textContent = hello;
    g.classList.add('show');
    g.addEventListener('click', () => g.classList.remove('show'));
    setTimeout(() => g.classList.remove('show'), 9000);
  }

  renderHud();
  return {
    onNear(spot, fresh) {
      renderHud();
      if (fresh) toast(`💡 ${spot.emoji} ${spot.name}에서 탐험이 열렸어요!`);
    },
    refresh: renderHud,
    openSpot: openQuestSheet,
    openAnimal,
    openAnimalQuiz,
    onAnimalNear,
    closeSheet,
  };
}
