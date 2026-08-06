/* 계정 — 아이디와 비밀번호만으로 가입/로그인하고, 발견일지·해금 캐릭터를 계정에 저장한다.

   서버는 Supabase 함수 5개(db/accounts.sql)만 열려 있다. accounts 테이블은 RLS를 켜고 정책을
   하나도 두지 않아 공개키로는 직접 읽을 수도 쓸 수도 없다 — 비밀번호 해시가 밖으로 나가지 않는다.
   비밀번호는 서버에서 bcrypt로 해시해 저장하며 평문은 어디에도 남지 않는다.
   저장(account_save)은 로그인할 때 받은 토큰이 맞아야만 되므로 남의 아이디에 덮어쓸 수 없다.

   기기에 남는 것: 아이디와 토큰(quest.account.v1). 비밀번호는 저장하지 않는다.
   사진(IndexedDB)은 용량이 커서 동기화하지 않는다 — 사진은 그 기기에만 남는다. */
import { SB_URL, SB_KEY } from './config.js';

const SESSION_KEY = 'quest.account.v1';
const BACKUP_KEY = 'quest.prelogin.v1'; // 로그인 직전 이 기기의 기록 (되돌릴 수 있게)

/* 계정에 담는 기록 — 캐릭터·나이/체류·방문기록(발견일지)·둘러본 랜드마크 */
const SYNC_KEYS = ['quest.avatar.v1', 'quest.profile.v1', 'quest.log.v1', 'quest.seen.v1'];

export const ERRORS = {
  id_format: '아이디는 영문 소문자와 숫자 4~16자로 만들어 주세요',
  pw_short: '비밀번호는 4자 이상으로 해주세요',
  taken: '이미 쓰고 있는 아이디예요',
  bad_login: '아이디나 비밀번호가 맞지 않아요',
  bad_token: '로그인이 만료됐어요. 다시 로그인해 주세요',
  too_big: '기록이 너무 커서 저장하지 못했어요',
  network: '인터넷이 불안정해요. 잠시 뒤 다시 해주세요',
};
export const errorText = (code) => ERRORS[code] || ERRORS.network;

async function rpc(fn, body) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('network');
  return res.json();
}

export function session() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    return s && s.username && s.token ? s : null;
  } catch (_) { return null; }
}
export const isLoggedIn = () => !!session();
function setSession(username, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, token }));
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

/* 이 기기의 기록을 그대로 담아 올린다 (값은 저장된 문자열 그대로 — 형식을 해석하지 않는다) */
export function snapshot() {
  const d = {};
  for (const k of SYNC_KEYS) {
    const v = localStorage.getItem(k);
    if (v !== null) d[k] = v;
  }
  return d;
}
/* 계정에 저장돼 있던 기록을 이 기기에 덮어쓴다 */
function restore(data) {
  if (!data || typeof data !== 'object') return false;
  localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot())); // 로그인 전 기록 백업
  for (const k of SYNC_KEYS) {
    if (typeof data[k] === 'string') localStorage.setItem(k, data[k]);
    else localStorage.removeItem(k);
  }
  return true;
}

export async function idTaken(id) {
  return rpc('account_taken', { p_user: id });
}

export async function signup(id, pw) {
  const r = await rpc('account_signup', { p_user: id, p_pw: pw, p_data: snapshot() });
  if (r.ok) setSession(r.username, r.token);
  return r;
}

/* 로그인하면 계정에 저장돼 있던 기록으로 이 기기를 맞춘다.
   계정이 비어 있으면(가입만 하고 저장 전) 이 기기 기록을 그대로 두고 다음 저장 때 올린다. */
export async function login(id, pw) {
  const r = await rpc('account_login', { p_user: id, p_pw: pw });
  if (!r.ok) return r;
  const hasData = r.data && Object.keys(r.data).length > 0;
  if (hasData) restore(r.data);
  setSession(r.username, r.token);
  if (!hasData) syncNow();
  return { ...r, restored: !!hasData };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

let saving = false, pending = false;
export async function syncNow() {
  const s = session();
  if (!s || saving) { pending = !!s; return false; }
  saving = true;
  try {
    const r = await rpc('account_save', { p_user: s.username, p_token: s.token, p_data: snapshot() });
    if (!r.ok && r.error === 'bad_token') logout(); // 다른 기기에서 다시 로그인함 → 이 기기는 로그아웃
    return !!r.ok;
  } catch (_) {
    return false; // 오프라인 — 다음 변경 때 다시 시도한다
  } finally {
    saving = false;
    if (pending) { pending = false; syncNow(); }
  }
}

/* 기록이 바뀔 때마다 자동 저장.
   저장 지점이 여러 파일에 흩어져 있어(quest·story·ui) 각 파일을 고치는 대신
   localStorage 쓰기 한 곳만 지켜본다 — 놓치는 변경이 없고 기존 코드는 그대로 둔다. */
let timer = 0;
export function scheduleSync(ms = 4000) {
  if (!isLoggedIn()) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

export function initAutoSync() {
  const orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => {
    orig(k, v);
    if (SYNC_KEYS.includes(k)) scheduleSync();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) syncNow(); });
  window.addEventListener('pagehide', () => { syncNow(); });
}
