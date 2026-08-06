/* 가족 함께 보기 — 초대코드 실시간 위치 공유 (2D 버전에서 이식, 이모지 → 이름+커스텀 캐릭터로 개편)
   payload: { id, name, av:{gender,dress,top,bottom}, x, y }  (구버전 { id, e, x, y }도 수용) */
import * as THREE from 'three';
import { SB_URL, SB_KEY, KEYS } from './config.js';
import { M2U } from './geo.js';
import { buildAvatar, makeNameSprite, DEFAULT_AVATAR } from './character.js';
import { toast } from './ui.js';
import {
  ALERT_COOLDOWN_MS, ALERT_REPEAT_MS, stepAt, stepOf, alertable as alertableFor, normalizeFrom,
} from './family-alert.mjs';

const $ = (id) => document.getElementById(id);
const ROLE = { '👩': '엄마', '👨': '아빠', '🧒': '아이', '🧓': '조부모' }; // 구버전 payload 폴백
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initFamily(ctx) { // ctx: { scene, myPos(), getName(), setName(v), getAv() }
  const famBtn = $('famBtn');
  const famWrap = $('famWrap');
  let sb = null, famCh = null, famCode = null, lastShare = 0, famHb = null, famWatch = null;

  const myId = sessionStorage.getItem(KEYS.myid) || (() => {
    const v = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(KEYS.myid, v);
    return v;
  })();

  const members = new Map(); // id -> { id, name, avKey, chibi, label, cur, tgt, phase, level, alertLevel, alertAt }
  const famReady = () => typeof window.supabase !== 'undefined' && !SB_KEY.includes('PASTE');

  /* 알림 시작 거리(m). 0이면 끔 — 기기에만 저장 */
  const alertFrom = () => normalizeFrom(localStorage.getItem(KEYS.famAlert));
  const alertable = (level) => alertableFor(level, alertFrom());

  function fireAlert(m, level, dm) {
    const s = stepAt(level);
    m.alertLevel = level;
    m.alertAt = Date.now();
    toast(`${s.icon} ${s.name} — ${m.name}와 ${dm}m 떨어졌어요!`);
    try { navigator.vibrate?.(s.vib); } catch (_) { /* 진동 미지원 기기 */ }
  }

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
      m = {
        id, name: '', avKey: '', chibi: null, label: null, cur: null, tgt: new THREE.Vector3(), phase: 0,
        level: 0, alertLevel: 0, alertAt: 0, // 안전 거리 알림 상태
      };
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

  /* 나와의 거리(m). 내 위치나 상대 위치가 아직 없으면 null.
     기준은 m.cur(화면에서 부드럽게 따라가는 위치)가 아니라 m.tgt(마지막으로 받은 실제 위치) —
     안전 알림이 걷는 연출의 이징만큼 늦게 울면 안 되고, 화면이 멈춰도 값이 정확해야 한다. */
  function distM(m) {
    const me = ctx.myPos();
    if (!me || m.cur === null) return null;
    return Math.round(Math.hypot(m.tgt.x - me[0], m.tgt.z - me[1]) / M2U);
  }

  /* 단계 판정 — 올라가면 알리고, 계속 떨어져 있으면 2분마다 한 번 더, 돌아오면 해제 안내.
     같은 계산을 상대 기기도 하므로 양쪽이 함께 알림을 받는다(브로드캐스트는 위치가 없는 쪽을 위한 보강). */
  function checkDistance(m) {
    const dm = distM(m);
    if (dm === null) return;
    const prev = m.level;
    const lv = stepOf(dm, prev);
    m.level = lv;
    if (lv !== prev && famWrap.classList.contains('open')) renderFamList(); // 단계가 바뀌면 목록도 바로
    if (lv > prev && alertable(lv)) {
      if (Date.now() - m.alertAt > ALERT_COOLDOWN_MS || lv > m.alertLevel) {
        fireAlert(m, lv, dm);
        sendAlert(m, lv, dm);
      }
    } else if (lv > 0 && lv === prev && m.alertLevel && Date.now() - m.alertAt > ALERT_REPEAT_MS && alertable(lv)) {
      fireAlert(m, lv, dm); // 계속 떨어져 있음 — 잊지 않도록 한 번 더
    } else if (lv === 0 && m.alertLevel) {
      m.alertLevel = 0;
      toast(`🟢 ${m.name}와 다시 가까워졌어요 (${dm}m)`);
    }
  }

  function labelFor(m) {
    const dm = distM(m);
    if (dm === null) return m.name;
    const s = m.level ? stepAt(m.level) : null;
    return s && alertable(m.level) ? `${s.icon} ${m.name} ${dm}m` : `${m.name} ${dm}m`;
  }

  function renderFamList() {
    const li = $('famList');
    if (!members.size) { li.textContent = '아직 참여한 가족이 없어요. 코드를 알려주세요!'; return; }
    li.innerHTML = '';
    for (const m of members.values()) {
      const row = document.createElement('div');
      const dm = distM(m);
      if (dm === null) {
        row.textContent = `${m.name}${m.cur === null ? ' — 연결됨 (위치 기다리는 중)' : ' — 지도에 표시됨'}`;
      } else if (alertable(m.level)) {
        const s = stepAt(m.level);
        row.innerHTML = `${esc(m.name)} — <span class="far s${s.level}">${s.icon} ${dm}m ${s.name}</span>`;
      } else {
        row.textContent = `${m.name} — ${dm}m`;
      }
      li.appendChild(row);
    }
  }

  /* 상대에게도 알림 — 그쪽 위치정보가 아직 없어 스스로 계산하지 못하는 경우를 위한 보강.
     좌표가 아니라 '누구와 몇 m, 몇 단계'만 실어 보낸다(저장 없음). */
  function sendAlert(m, level, dm) {
    if (!famCh) return;
    famCh.send({
      type: 'broadcast', event: 'alert',
      payload: { from: myId, name: ctx.getName(), to: m.id, level, dm },
    });
  }

  function onRemoteAlert(p) {
    if (p.to !== myId) return;
    const m = members.get(p.from);
    if (!m || !alertable(p.level)) return;
    if (Date.now() - m.alertAt < ALERT_COOLDOWN_MS) return; // 내 기기가 이미 같은 상황을 알렸다
    m.level = Math.max(m.level, p.level);
    fireAlert(m, p.level, p.dm);
    renderFamList();
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
    famCh.on('broadcast', { event: 'alert' }, ({ payload }) => onRemoteAlert(payload));
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
        /* 안전 거리 판정은 1초 타이머로 — rAF에 묶으면 화면이 가려졌을 때 알림이 멈춘다 */
        clearInterval(famWatch);
        famWatch = setInterval(() => {
          for (const m of members.values()) checkDistance(m);
        }, 1000);
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
        toast('연결에 실패했어요. 잠시 후 다시 시도해 주세요');
        famLeave(false);
      }
    });
  }

  function famLeave(ui = true) {
    clearInterval(famHb);
    clearInterval(famWatch);
    famHb = null;
    famWatch = null;
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

  /* 안전 거리 알림 설정 — 20 / 50 / 100m 중 시작 거리 선택, 0이면 끔 */
  function renderAlertSetting() {
    const from = alertFrom();
    for (const b of document.querySelectorAll('#famAlert .arow button')) {
      b.classList.toggle('on', Number(b.dataset.d) === from);
    }
    $('famAlertSub').textContent = from
      ? `${from}m 이상 떨어지면 알려드려요. 더 멀어지면 🟡20m·🟠50m·🔴100m 단계로 알림이 세져요. 가족 모두의 기기에서 함께 울려요.`
      : '거리 알림을 받지 않아요. 지도에서 가족 위치는 계속 보여요.';
  }
  for (const b of document.querySelectorAll('#famAlert .arow button')) {
    b.addEventListener('click', () => {
      localStorage.setItem(KEYS.famAlert, b.dataset.d);
      for (const m of members.values()) { m.level = 0; m.alertLevel = 0; m.alertAt = 0; } // 설정 바꾸면 단계 초기화
      renderAlertSetting();
      renderFamList();
    });
  }
  renderAlertSetting();

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
