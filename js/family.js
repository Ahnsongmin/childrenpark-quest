/* 가족 함께 보기 — 초대코드 실시간 위치 공유 (2D 버전에서 이식, 이모지 → 이름+커스텀 캐릭터로 개편)
   payload: { id, name, av:{gender,dress,top,bottom}, x, y }  (구버전 { id, e, x, y }도 수용) */
import * as THREE from 'three';
import { SB_URL, SB_KEY, KEYS } from './config.js';
import { M2U } from './geo.js';
import { buildAvatar, makeNameSprite, DEFAULT_AVATAR } from './character.js';
import { toast } from './ui.js';

const $ = (id) => document.getElementById(id);
const ROLE = { '👩': '엄마', '👨': '아빠', '🧒': '아이', '🧓': '조부모' }; // 구버전 payload 폴백

export function initFamily(ctx) { // ctx: { scene, myPos(), getName(), setName(v), getAv() }
  const famBtn = $('famBtn');
  const famWrap = $('famWrap');
  let sb = null, famCh = null, famCode = null, lastShare = 0, famHb = null;

  const myId = sessionStorage.getItem(KEYS.myid) || (() => {
    const v = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(KEYS.myid, v);
    return v;
  })();

  const members = new Map(); // id -> { name, avKey, chibi, label, cur, tgt, phase, warnedAt }
  const famReady = () => typeof window.supabase !== 'undefined' && !SB_KEY.includes('PASTE');

  function disposeChibi(m) {
    ctx.scene.remove(m.chibi.group);
    m.chibi.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        // 캐릭터 이미지 텍스처는 캐시 공유(sharedMap) — dispose하면 다른 아바타가 깨짐
        if (o.material.map && !o.material.userData.sharedMap) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  function setMemberAvatar(m, av, name) {
    if (m.chibi) disposeChibi(m);
    m.avKey = JSON.stringify(av);
    m.name = name;
    m.chibi = buildAvatar(av, 0.8);
    m.label = makeNameSprite();
    m.label.position.y = 17;
    m.chibi.group.add(m.label);
    m.chibi.group.visible = m.cur !== null;
    if (m.cur) m.chibi.group.position.copy(m.cur);
    m.label.userData.setText(name);
    ctx.scene.add(m.chibi.group);
  }

  function parseMeta(p) { // 신·구 payload/presence 공통 해석
    const name = (p.name || '').trim() || ROLE[p.e] || '가족';
    const av = p.av && typeof p.av === 'object' ? { ...DEFAULT_AVATAR, ...p.av } : { ...DEFAULT_AVATAR };
    return { name, av };
  }

  function ensureMember(id, meta) {
    let m = members.get(id);
    if (!m) {
      m = { name: '', avKey: '', chibi: null, label: null, cur: null, tgt: new THREE.Vector3(), phase: 0, warnedAt: 0 };
      members.set(id, m);
    }
    const { name, av } = parseMeta(meta);
    if (JSON.stringify(av) !== m.avKey || name !== m.name) setMemberAvatar(m, av, name);
    return m;
  }

  function upsertMember(p) {
    if (p.id === myId) return;
    const m = ensureMember(p.id, p);
    m.tgt.set(p.x, 0, p.y);
    if (m.cur === null) { // 첫 위치는 즉시 배치
      m.cur = m.tgt.clone();
      m.chibi.group.position.copy(m.cur);
      m.chibi.group.visible = true;
    }
    renderFamList();
  }

  function labelFor(m) {
    const me = ctx.myPos();
    if (!me || m.cur === null) return m.name;
    const dm = Math.round(Math.hypot(m.cur.x - me[0], m.cur.z - me[1]) / M2U);
    if (dm > 250 && Date.now() - m.warnedAt > 60000) {
      m.warnedAt = Date.now();
      toast(`⚠️ ${m.name}와 ${dm}m 떨어졌어요!`);
    }
    return `${m.name} ${dm}m`;
  }

  function renderFamList() {
    const li = $('famList');
    if (!members.size) { li.textContent = '아직 참여한 가족이 없어요. 코드를 알려주세요!'; return; }
    const me = ctx.myPos();
    li.innerHTML = '';
    for (const m of members.values()) {
      const row = document.createElement('div');
      let dm = ' — 연결됨 (위치 기다리는 중)';
      if (m.cur !== null) dm = me ? ` — ${Math.round(Math.hypot(m.cur.x - me[0], m.cur.z - me[1]) / M2U)}m` : ' — 지도에 표시됨';
      row.textContent = `${m.name}${dm}`;
      li.appendChild(row);
    }
  }

  function shareMyPos(x, y) {
    if (!famCh || Date.now() - lastShare < 1000) return; // 1초마다 전송
    lastShare = Date.now();
    famCh.send({
      type: 'broadcast', event: 'pos',
      payload: { id: myId, name: ctx.getName(), av: ctx.getAv(), x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 },
    });
  }

  function famJoin(code) {
    if (!famReady()) { toast('가족 공유 기능을 준비하고 있어요'); return; }
    code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { toast('코드는 6자리예요'); return; }
    if (!sb) sb = window.supabase.createClient(SB_URL, SB_KEY);
    if (famCh) famLeave(false);
    famCode = code;
    famCh = sb.channel(`fam-${code}`, { config: { presence: { key: myId }, broadcast: { self: false } } });
    famCh.on('broadcast', { event: 'pos' }, ({ payload }) => upsertMember(payload));
    famCh.on('presence', { event: 'sync' }, () => {
      const st = famCh.presenceState();
      for (const [key, metas] of Object.entries(st)) {
        if (key === myId) continue;
        ensureMember(key, metas[0] || {});
      }
      for (const key of [...members.keys()]) {
        if (!st[key]) { disposeChibi(members.get(key)); members.delete(key); }
      }
      renderFamList();
    });
    famCh.subscribe((st) => {
      if (st === 'SUBSCRIBED') {
        famCh.track({ name: ctx.getName(), av: ctx.getAv() });
        famBtn.classList.add('on');
        $('famStart').style.display = 'none';
        $('famOn').style.display = 'block';
        $('famCodeShow').textContent = famCode;
        const qr = $('famQR');
        qr.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
          new QRCode(qr, { text: famLink(), width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M });
        }
        renderFamList();
        toast(`가족 코드 ${famCode} 연결됐어요`);
        clearInterval(famHb); // 4초마다 재전송 — 늦게 들어온 가족도 곧바로 나를 봄
        famHb = setInterval(() => {
          const me = ctx.myPos();
          if (me) { lastShare = 0; shareMyPos(me[0], me[1]); }
        }, 4000);
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
        toast('연결에 실패했어요. 잠시 후 다시 시도해 주세요');
        famLeave(false);
      }
    });
  }

  function famLeave(ui = true) {
    clearInterval(famHb);
    famHb = null;
    if (famCh) { famCh.unsubscribe(); famCh = null; }
    famCode = null;
    for (const m of members.values()) disposeChibi(m);
    members.clear();
    famBtn.classList.remove('on');
    $('famStart').style.display = 'block';
    $('famOn').style.display = 'none';
    if (ui) toast('가족 공유를 끝냈어요');
  }

  const famLink = () => `${location.origin}${location.pathname}?fam=${famCode}`;

  famBtn.addEventListener('click', () => famWrap.classList.add('open'));
  $('famBack').addEventListener('click', () => famWrap.classList.remove('open'));

  const nameInput = $('famName');
  nameInput.value = ctx.getName();
  nameInput.addEventListener('change', () => {
    ctx.setName(nameInput.value.trim());
    nameInput.value = ctx.getName();
    if (famCh) famCh.track({ name: ctx.getName(), av: ctx.getAv() });
  });

  $('famMake').addEventListener('click', () => {
    const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 헷갈리는 I/L/O/0/1 제외
    let code = '';
    for (let i = 0; i < 6; i++) code += abc[Math.floor(Math.random() * abc.length)];
    famJoin(code);
  });
  $('famJoin').addEventListener('click', () => famJoin($('famCode').value));
  $('famLeave').addEventListener('click', () => famLeave());
  $('famShare').addEventListener('click', async () => {
    const url = famLink();
    try {
      if (navigator.share) {
        await navigator.share({ title: '공원 원정대 — 가족 함께 보기', text: `초대코드 ${famCode} — 누르면 바로 연결돼요`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('초대 링크를 복사했어요. 가족에게 붙여넣어 보내세요!');
      }
    } catch (_) { /* 공유 취소 */ }
  });

  const famParam = new URLSearchParams(location.search).get('fam');
  if (famParam) {
    famWrap.classList.add('open');
    famJoin(famParam);
  }

  let listTick = 0;
  function update(dt, t) { // rAF에서 호출 — 가족 캐릭터를 목표 위치로 부드럽게 걷게
    for (const m of members.values()) {
      if (m.cur === null) continue;
      const dx = m.tgt.x - m.cur.x, dz = m.tgt.z - m.cur.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.15) {
        const f = 1 - Math.exp(-dt * 2.4);
        m.cur.x += dx * f;
        m.cur.z += dz * f;
        m.phase += len * f * 0.55;
        m.chibi.setPhase(m.phase);
        m.chibi.setHeading(Math.atan2(dx, dz));
      } else {
        m.chibi.idle(t);
      }
      m.chibi.group.position.copy(m.cur);
      if (ctx.camera) { // 멀리서도 알아보게 거리 기반 확대
        const d = ctx.camera.position.distanceTo(m.cur);
        m.chibi.group.scale.setScalar(0.8 * Math.min(2.4, Math.max(1, d / 240)));
      }
      m.label.userData.setText(labelFor(m));
    }
    listTick += dt;
    if (listTick > 2 && famWrap.classList.contains('open')) { listTick = 0; renderFamList(); }
  }

  return { update, shareMyPos };
}
