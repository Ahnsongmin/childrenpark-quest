/* 회원가입 / 로그인 창 — 자기 DOM과 CSS를 직접 만들어 붙이므로 어느 페이지에서도 쓸 수 있다.
   여는 법: window.dispatchEvent(new CustomEvent('auth-open', { detail: { mode: 'signup' | 'login' } }))
   끝나면 'auth-changed'가 발생한다(account.js가 발생시킴) — 화면들은 이 이벤트로 상태를 갱신한다. */
import { signup, login, idTaken, errorText, isLoggedIn, session, logout, syncNow } from './account.js';

const CSS = `
#authWrap { position: fixed; inset: 0; z-index: 40; display: none; }
#authWrap.open { display: block; }
#authBack { position: absolute; inset: 0; background: rgba(15,35,20,.55); }
#authBox {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
  width: min(340px, calc(100vw - 32px)); max-height: 92dvh; overflow-y: auto;
  background: #fff; border-radius: 20px; padding: 20px 18px 16px;
  box-shadow: 0 12px 34px rgba(0,0,0,.32);
  font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif;
}
#authBox h3 { font-size: 17px; color: #2e6b34; text-align: center; }
#authBox .sub { font-size: 12px; color: #6a8a70; line-height: 1.55; margin-top: 6px; text-align: center; }
#authBox label { display: block; font-size: 11.5px; color: #7ba381; font-weight: 700; margin: 14px 0 5px; }
#authBox input {
  width: 100%; border: 2px solid #e2e8e2; border-radius: 12px; padding: 11px 12px; font-size: 15px;
}
#authBox .row { display: flex; gap: 7px; }
#authBox .row input { flex: 1; min-width: 0; }
#authBox .row button {
  flex: none; border: 2px solid #2e6b34; border-radius: 12px; background: #eef7e8; color: #2e6b34;
  font-size: 12.5px; font-weight: 800; padding: 0 12px; cursor: pointer; white-space: nowrap;
}
#authMsg { font-size: 12px; line-height: 1.5; margin-top: 10px; min-height: 17px; color: #b5544a; }
#authMsg.ok { color: #2e6b34; }
#authGo {
  width: 100%; margin-top: 14px; border: 0; border-radius: 14px; background: #2e6b34; color: #fff;
  font-size: 15px; font-weight: 800; padding: 13px; cursor: pointer;
}
#authGo:disabled { background: #cdd6cc; cursor: default; }
#authSwap { width: 100%; margin-top: 10px; border: 0; background: none; font-size: 12.5px; color: #2e6b34; cursor: pointer; }
#authClose { width: 100%; margin-top: 4px; border: 0; background: none; font-size: 12px; color: #98a; cursor: pointer; }
#authBox .priv { font-size: 10px; color: #a9b3aa; margin-top: 12px; line-height: 1.55; }
`;

const $ = (id) => document.getElementById(id);
let mode = 'signup';
let checked = ''; // 중복확인을 통과한 아이디

function build() {
  if ($('authWrap')) return;
  const st = document.createElement('style');
  st.id = 'authCss';
  st.textContent = CSS;
  document.head.appendChild(st);

  const wrap = document.createElement('div');
  wrap.id = 'authWrap';
  wrap.innerHTML = `
    <div id="authBack"></div>
    <div id="authBox" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <h3 id="authTitle">🌱 회원가입</h3>
      <p class="sub" id="authSub">아이디와 비밀번호만 있으면 돼요.<br>다음에 로그인하면 오늘의 기록을 그대로 이어서 써요!</p>
      <label for="authId" id="authIdLabel">아이디</label>
      <div class="row" id="authIdRow">
        <input id="authId" maxlength="16" autocomplete="username" placeholder="영문 소문자·숫자 4~16자">
        <button id="authCheck" type="button">중복확인</button>
      </div>
      <label for="authPw" id="authPwLabel">비밀번호</label>
      <input id="authPw" type="password" maxlength="32" autocomplete="current-password" placeholder="4자 이상">
      <p id="authMsg" role="status"></p>
      <button id="authGo">회원가입 하기</button>
      <button id="authSwap">이미 아이디가 있어요 — 로그인하기</button>
      <button id="authClose">닫기</button>
      <p class="priv">아이디와 비밀번호 말고는 아무것도 받지 않아요. 비밀번호는 알아볼 수 없게 바꿔서 보관돼요.<br>사진은 이 기기에만 남고 전송되지 않아요.</p>
    </div>`;
  document.body.appendChild(wrap);

  $('authBack').addEventListener('click', close);
  $('authClose').addEventListener('click', close);
  $('authSwap').addEventListener('click', () => setMode(mode === 'signup' ? 'login' : 'signup'));
  $('authCheck').addEventListener('click', check);
  $('authGo').addEventListener('click', submit);
  $('authId').addEventListener('input', () => { checked = ''; msg(''); });
  $('authPw').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function msg(text, ok = false) {
  const el = $('authMsg');
  el.textContent = text;
  el.classList.toggle('ok', ok);
}

function setMode(m) {
  mode = m;
  checked = '';
  /* account = 이미 로그인한 사람이 👤 버튼을 눌렀을 때 — 아이디 확인과 로그아웃만 */
  const accountMode = m === 'account';
  const signupMode = m === 'signup';
  for (const id of ['authIdLabel', 'authIdRow', 'authPwLabel', 'authPw']) {
    $(id).style.display = accountMode ? 'none' : '';
  }
  $('authTitle').textContent = accountMode ? '🔑 내 계정' : signupMode ? '🌱 회원가입' : '🔑 로그인';
  $('authSub').innerHTML = accountMode
    ? `<b>${(session() || {}).username || ''}</b>님으로 로그인 중이에요.<br>발견일지와 캐릭터가 이 아이디에 저장되고 있어요.`
    : signupMode
      ? '아이디와 비밀번호만 있으면 돼요.<br>다음에 로그인하면 오늘의 기록을 그대로 이어서 써요!'
      : '지난번에 만든 아이디로 들어오면<br>발견일지와 해금한 캐릭터가 그대로 돌아와요!';
  $('authCheck').style.display = signupMode ? 'block' : 'none';
  $('authGo').textContent = accountMode ? '로그아웃' : signupMode ? '회원가입 하기' : '로그인 하기';
  $('authSwap').style.display = accountMode ? 'none' : '';
  $('authSwap').textContent = signupMode ? '이미 아이디가 있어요 — 로그인하기' : '아이디가 없어요 — 회원가입하기';
  $('authPw').setAttribute('autocomplete', signupMode ? 'new-password' : 'current-password');
  msg('');
}

const idOf = () => $('authId').value.trim().toLowerCase();

async function check() {
  const id = idOf();
  if (!/^[a-z0-9_]{4,16}$/.test(id)) { msg(errorText('id_format')); return; }
  $('authCheck').disabled = true;
  try {
    const taken = await idTaken(id);
    if (taken) { checked = ''; msg('이미 쓰고 있는 아이디예요. 다른 걸로 해볼까요?'); }
    else { checked = id; msg('쓸 수 있는 아이디예요! 👍', true); }
  } catch (_) {
    msg(errorText('network'));
  } finally {
    $('authCheck').disabled = false;
  }
}

async function submit() {
  if (mode === 'account') { // 로그아웃 — 나가기 전에 기록을 한 번 더 올린다
    await syncNow();
    logout();
    close();
    return;
  }
  const id = idOf();
  const pw = $('authPw').value;
  if (mode === 'signup') {
    if (!/^[a-z0-9_]{4,16}$/.test(id)) { msg(errorText('id_format')); return; }
    if (pw.length < 4) { msg(errorText('pw_short')); return; }
    if (checked !== id) { msg('먼저 [중복확인]을 눌러 주세요'); return; }
  } else if (!id || !pw) {
    msg('아이디와 비밀번호를 입력해 주세요'); return;
  }

  $('authGo').disabled = true;
  msg(mode === 'signup' ? '가입하는 중이에요…' : '들어가는 중이에요…', true);
  try {
    const r = mode === 'signup' ? await signup(id, pw) : await login(id, pw);
    if (!r.ok) { msg(errorText(r.error)); return; }
    if (mode === 'signup') {
      msg(`${r.username}님, 가입 완료! 오늘 기록이 이 아이디에 저장돼요 🎉`, true);
      setTimeout(close, 1200);
    } else {
      msg(`${r.username}님, 반가워요! 기록을 불러올게요…`, true);
      // 불러온 기록으로 지도·발견일지를 다시 그리려면 새로 여는 편이 확실하다
      setTimeout(() => { location.href = 'index.html'; }, 900);
    }
  } catch (_) {
    msg(errorText('network'));
  } finally {
    $('authGo').disabled = false;
  }
}

export function open(m = 'signup') {
  build();
  setMode(m);
  $('authId').value = '';
  $('authPw').value = '';
  $('authWrap').classList.add('open');
  setTimeout(() => $('authId').focus(), 50);
}
export function close() {
  if ($('authWrap')) $('authWrap').classList.remove('open');
}
export const isOpen = () => !!($('authWrap') && $('authWrap').classList.contains('open'));

export function initAuthUI() {
  build();
  window.addEventListener('auth-open', (e) => {
    const want = (e.detail && e.detail.mode) || 'signup';
    open(isLoggedIn() ? 'account' : want); // 이미 로그인했다면 계정 화면으로
  });
}
