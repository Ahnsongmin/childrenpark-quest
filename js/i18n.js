/* 다국어 엔진 — 화면에 나온 한국어를 사전으로 치환한다.
   왜 소스 리팩터링이 아니라 치환 방식인가:
   문구가 15개 파일에 흩어져 있어 전면 개편은 회귀 위험이 크다. 대신
   ①DOM(텍스트 노드·속성·innerHTML) ②캔버스(fillText/measureText) 두 출구만 막으면
   기존 코드를 건드리지 않고 전부 번역된다. 사전에 없으면 한국어 그대로 나온다(안전한 폴백).

   사전 파일: js/i18n-<lang>.js → window.I18N_DICT[lang] = { T:{정확일치}, P:[[템플릿,번역]], H:{innerHTML} }
   저장 키: quest.lang.v1 (기기에만 저장, 서버 전송 없음) */
(function () {
  'use strict';

  const KEY = 'quest.lang.v1';
  const LANGS = [
    /* 국기 이모지는 Windows에서 'KR'·'GB' 글자로 깨져 보인다 → 언어 코드 배지로 표시 */
    { id: 'ko', label: '한국어', native: '한국어', flag: 'KO' },
    { id: 'en', label: 'English', native: 'English', flag: 'EN' },
  ];

  let cur = 'ko';
  try { cur = localStorage.getItem(KEY) || 'ko'; } catch (e) {}
  if (!LANGS.some((l) => l.id === cur)) cur = 'ko';

  let T = null;          // 정확일치 사전
  let PAT = [];          // 컴파일된 패턴 [{re, out}]
  let H = null;          // innerHTML 단위 사전
  let N = null;          // 고유명사(동물·구역·유형) — 문장 안에 박혀 나올 때 부분 치환용
  let NRE = null;
  let busy = false;      // 우리가 일으킨 DOM 변경은 관찰에서 무시

  /* ── 사전 로딩 ─────────────────────────────────────── */
  function loadDict(lang) {
    return new Promise((res) => {
      if (lang === 'ko') return res(null);
      const have = window.I18N_DICT && window.I18N_DICT[lang];
      if (have) return res(have);
      const s = document.createElement('script');
      s.src = 'js/i18n-' + lang + '.js';
      s.onload = () => res((window.I18N_DICT || {})[lang] || null);
      s.onerror = () => res(null);   // 사전을 못 받으면 한국어로 계속 — 서비스는 멈추지 않는다
      document.head.appendChild(s);
    });
  }

  function compile(d) {
    T = (d && d.T) || null;
    H = (d && d.H) || null;
    N = (d && d.N) || null;
    NRE = null;
    if (N) {
      // 동물 이름처럼 문장 한가운데 박혀 나오는 고유명사만 부분 치환한다.
      // 일반 문장까지 부분 치환하면 반쪽짜리 한영 혼용이 생기므로 대상을 좁혔다.
      const keys = Object.keys(N).sort((a, b) => b.length - a.length)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (keys.length) NRE = new RegExp(keys.join('|'), 'g');
    }
    PAT = [];
    if (!d || !d.P) return;
    // 고정 글자가 많은 패턴부터 검사해야 '{}종'이 '발견일지 {}종'을 가로채지 않는다
    const rows = d.P.slice().sort((a, b) =>
      b[0].replace(/\{\}/g, '').length - a[0].replace(/\{\}/g, '').length);
    for (const [ko, out] of rows) {
      const re = new RegExp('^' + ko.split('{}')
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('([\\s\\S]*?)') + '$');
      PAT.push({ re, out });
    }
  }

  /* ── 문자열 번역 ───────────────────────────────────── */
  function nouns(s) {
    return NRE && /[가-힣]/.test(s) ? s.replace(NRE, (k) => N[k]) : s;
  }

  function core(s, depth = 0) {
    if (T && T[s] !== undefined) return T[s];
    if (N && N[s] !== undefined) return N[s];
    for (const p of PAT) {
      const m = s.match(p.re);
      if (m) {
        // 자리표시자에 들어온 값도 한 번 더 사전을 태운다 ("냄새 맡기 ❌" 같은 조합 대응).
        // 깊이를 2로 제한해 패턴끼리 서로를 물고 도는 것을 막는다.
        return p.out.replace(/\{(\d+)\}/g, (_, i) => {
          const g = m[+i + 1];
          if (g === undefined || !g) return '';
          if (depth >= 2 || !/[가-힣]/.test(g)) return nouns(g);
          // 앞뒤 공백을 떼고 사전을 태운 뒤 되돌린다 (" · 다음 메달까지…" 같은 조각 대응)
          const w = g.match(/^(\s*)([\s\S]*?)(\s*)$/);
          return w[1] + core(w[2], depth + 1) + w[3];
        });
      }
    }
    return nouns(s);
  }

  function t(s) {
    if (cur === 'ko' || !s || typeof s !== 'string') return s;
    if (!/[가-힣]/.test(s)) return s;                    // 한글이 없으면 손대지 않는다
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const out = core(m[2]);
    return out === m[2] ? s : m[1] + out + m[3];
  }

  /* ── DOM 적용 ──────────────────────────────────────── */
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const SKIP = { SCRIPT: 1, STYLE: 1, CANVAS: 1, SVG: 1 };

  function textNode(n) {
    if (n.__ko === undefined || n.nodeValue !== n.__out) n.__ko = n.nodeValue;
    const v = t(n.__ko);
    if (n.nodeValue !== v) n.nodeValue = v;
    n.__out = n.nodeValue;
  }

  function attrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const now = el.getAttribute(a);
      el.__ka = el.__ka || {};
      if (el.__ka[a] === undefined || now !== el.__oa?.[a]) el.__ka[a] = now;
      const v = t(el.__ka[a]);
      if (now !== v) el.setAttribute(a, v);
      el.__oa = el.__oa || {};
      el.__oa[a] = el.getAttribute(a);
    }
  }

  function norm(html) { return html.replace(/\s+/g, ' ').trim(); }

  function walk(node) {
    if (node.nodeType === 3) return textNode(node);
    if (node.nodeType !== 1) return;
    if (SKIP[node.tagName]) return;
    attrs(node);
    // 문장이 <b>·<span>으로 쪼개진 곳은 조각별로 번역하면 어순이 깨진다 → 통째로 교체
    if (H && cur !== 'ko') {
      if (node.__kh === undefined || node.innerHTML !== node.__oh) node.__kh = node.innerHTML;
      const hit = H[norm(node.__kh)];
      if (hit !== undefined) {
        if (node.innerHTML !== hit) node.innerHTML = hit;
        node.__oh = node.innerHTML;
        return;
      }
    } else if (cur === 'ko' && node.__kh !== undefined && node.__oh === node.innerHTML) {
      node.innerHTML = node.__kh;
      node.__oh = undefined;
      return;
    }
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function applyAll(root) {
    busy = true;
    try {
      walk(root || document.body);
      if (document.title) {
        document.title = t(document.__kt || (document.__kt = document.title));
      }
      document.documentElement.lang = cur;
    } finally { busy = false; }
  }

  /* ── 캔버스 텍스트 (지도 라벨·리캡 스토리) ──────────── */
  function hookCanvas() {
    const P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!P || P.__i18n) return;
    P.__i18n = true;
    // measureText는 건드리지 않는다 — story.js가 글자를 한 개씩 더해가며 폭을 재기 때문에
    // 중간 조각이 사전에 걸리면 줄바꿈 계산이 망가진다. 폭이 필요한 곳은 story.js에서 먼저 번역한다.
    for (const fn of ['fillText', 'strokeText']) {
      const orig = P[fn];
      if (!orig) continue;
      P[fn] = function (s, ...rest) { return orig.call(this, t(s), ...rest); };
    }
  }

  /* ── 새로 그려지는 DOM 따라잡기 ────────────────────── */
  function observe() {
    const mo = new MutationObserver((muts) => {
      if (busy) return;
      busy = true;
      try {
        for (const m of muts) {
          if (m.type === 'characterData') textNode(m.target);
          else if (m.type === 'attributes') { if (m.target.nodeType === 1) attrs(m.target); }
          // childList는 바뀐 자식이 아니라 '부모'부터 훑는다 —
          // 그래야 innerHTML 통째 교체(H) 규칙이 걸려 문장이 조각나지 않는다
          else if (m.target.nodeType === 1) walk(m.target);
          else m.addedNodes.forEach((n) => { if (n.nodeType === 1 || n.nodeType === 3) walk(n); });
        }
      } finally { busy = false; }
    });
    mo.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  /* ── 언어 선택 UI ──────────────────────────────────── */
  function styleOnce() {
    if (document.getElementById('i18nCss')) return;
    const st = document.createElement('style');
    st.id = 'i18nCss';
    st.textContent = `
      #langBtn { position: absolute; right: 14px; bottom: 488px; z-index: 5;
        width: 48px; height: 48px; border-radius: 50%; border: 0; background: #fff;
        font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.2); }
      #langBtn b { display: block; font-size: 9px; font-weight: 800; color: #2e6b34;
        margin-top: -3px; letter-spacing: -.3px; }
      body.i18nPage #langBtn { position: fixed; bottom: 20px; right: 16px; }
      #langWrap { position: fixed; inset: 0; z-index: 60; display: none; }
      #langWrap.on { display: block; }
      #langBack { position: absolute; inset: 0; background: rgba(0,0,0,.35); }
      #langBox { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
        width: min(300px, 84vw); background: #fff; border-radius: 18px; padding: 18px 16px 14px;
        box-shadow: 0 12px 32px rgba(0,0,0,.28); font-family: inherit; }
      #langBox h3 { margin: 0 0 4px; font-size: 16px; color: #1f5f45; text-align: center; }
      #langBox .sub { margin: 0 0 12px; font-size: 11px; color: #7b8a80; text-align: center; line-height: 1.45; }
      #langBox button.opt { width: 100%; margin-top: 8px; padding: 12px 14px; border-radius: 12px;
        border: 1.5px solid #dde5e0; background: #fff; font-size: 15px; cursor: pointer;
        display: flex; align-items: center; gap: 10px; }
      #langBox button.opt .code { flex: none; width: 34px; padding: 3px 0; border-radius: 7px;
        background: #eef2ef; color: #55605a; font-size: 11px; font-weight: 800; text-align: center; }
      #langBox button.opt.sel { border-color: #2e7d5b; background: #eef7f2; font-weight: 700; color: #1f5f45; }
      #langBox button.opt.sel .code { background: #2e7d5b; color: #fff; }
      #langBox button.opt .chk { margin-left: auto; color: #2e7d5b; font-weight: 800; }
      #langBox .close { width: 100%; margin-top: 12px; padding: 10px; border: 0; border-radius: 10px;
        background: #f1f4f2; color: #55605a; font-size: 13px; cursor: pointer; }
    `;
    document.head.appendChild(st);
  }

  function buildUI() {
    styleOnce();
    if (document.getElementById('langBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'langBtn';
    btn.className = 'fsc';
    btn.setAttribute('aria-label', 'Language / 언어 선택');
    btn.innerHTML = '🌐<b></b>';
    (document.getElementById('frame') || document.body).appendChild(btn);
    if (!document.getElementById('frame')) document.body.classList.add('i18nPage');

    const wrap = document.createElement('div');
    wrap.id = 'langWrap';
    wrap.innerHTML = '<div id="langBack"></div><div id="langBox" role="dialog" aria-modal="true">' +
      '<h3>🌐 Language</h3>' +
      '<p class="sub">Choose your language.<br>화면에 보이는 말을 바꿀 수 있어요.</p>' +
      LANGS.map((l) => `<button class="opt" data-l="${l.id}"><span class="code">${l.flag}</span>` +
        `<span>${l.native}</span><span class="chk"></span></button>`).join('') +
      '<button class="close">닫기 / Close</button></div>';
    document.body.appendChild(wrap);

    btn.addEventListener('click', () => { mark(); wrap.classList.add('on'); });
    wrap.querySelector('#langBack').addEventListener('click', () => wrap.classList.remove('on'));
    wrap.querySelector('.close').addEventListener('click', () => wrap.classList.remove('on'));
    wrap.querySelectorAll('button.opt').forEach((b) => {
      b.addEventListener('click', () => {
        wrap.classList.remove('on');
        setLang(b.dataset.l);
      });
    });
    mark();
  }

  function mark() {
    const btn = document.getElementById('langBtn');
    if (btn) btn.querySelector('b').textContent = cur.toUpperCase();
    document.querySelectorAll('#langWrap button.opt').forEach((b) => {
      const on = b.dataset.l === cur;
      b.classList.toggle('sel', on);
      b.querySelector('.chk').textContent = on ? '✓' : '';
    });
  }

  /* 언어 선택 상자 자체는 사전 치환 대상이 아니다(원문이 이미 2개 국어) */
  function guard() {
    const box = document.getElementById('langBox');
    if (box) box.querySelectorAll('*').forEach((el) => { el.__kh = el.innerHTML; });
  }

  async function setLang(lang) {
    if (!LANGS.some((l) => l.id === lang)) return;
    cur = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    compile(await loadDict(lang));
    applyAll();
    mark();
    guard();
    window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
  }

  async function init() {
    if (cur !== 'ko') compile(await loadDict(cur));
    buildUI();
    applyAll();
    guard();
    observe();
    // 캔버스 텍스처(지도 라벨 등)는 사전이 준비된 뒤에 다시 구워야 한다
    if (cur !== 'ko') window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang: cur } }));
  }

  hookCanvas();   // 지도·캐릭터가 그려지기 전에 미리 걸어 둔다

  window.I18N = {
    t,
    get lang() { return cur; },
    set: setLang,
    langs: LANGS,
    apply: applyAll,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
