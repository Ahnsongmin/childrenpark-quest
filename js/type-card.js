/* 유형 캐릭터 DOM 컴포넌트 — 도감·리캡 탭 공용
   characterAvatarEl: 유형색 원형 배경 + 캐릭터 이미지(둥실 애니메이션, 모션 감소 대응)
   typeCardHTML: "당신은 OO이에요!" 탐험 결과 카드 마크업 (리캡 탭용)
   ※ 리캡 스토리(story.js)는 공유 이미지가 목적이라 캔버스에 직접 그린다 — 데이터(recap 결과)만 공유. */
import { iEyo, shade } from './explorer-types.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const st = document.createElement('style');
  st.textContent = `
    .tcAvatar { position: relative; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; overflow: hidden; flex: none; }
    .tcAvatar img { width: 92%; height: 92%; object-fit: contain; }
    .tcAvatar .tcEmoji { font-size: 46%; line-height: 1; }
    .tcAvatar.float { animation: tcFloat 2.4s ease-in-out infinite; }
    @keyframes tcFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @media (prefers-reduced-motion: reduce) { .tcAvatar.float { animation: none; } }
    .tcCard { border-radius: 16px; padding: 14px; color: #fff; margin-top: 9px;
      text-align: center; line-height: 1.5; }
    .tcCard .tcHead { font-size: 12px; opacity: .9; font-weight: 700; }
    .tcCard .tcName { font-size: 19px; font-weight: 800; margin-top: 2px; }
    .tcCard .tcAvatar { margin: 10px auto; }
    .tcCard .tcDesc { font-size: 12.5px; opacity: .95; }
    .tcCard .tcStats { font-size: 12px; margin-top: 8px; background: rgba(0,0,0,.18);
      border-radius: 10px; padding: 7px 10px; }
    .tcKws { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tcKws span { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.2);
      border-radius: 10px; padding: 3px 9px; }
    .tcBtns { display: flex; gap: 8px; margin-top: 10px; }
    .tcBtns .qbtn { margin-top: 0 !important; }
  `;
  document.head.appendChild(st);
}

/* 유형 캐릭터 아바타 원형 — imgPromise(렌더 이미지)가 오면 채우고, 실패 시 동물 이모지 폴백 */
export function characterAvatarEl({ combo, imgPromise, size = 110, animation = 'float' }) {
  injectStyle();
  const el = document.createElement('div');
  el.className = `tcAvatar${animation === 'float' ? ' float' : ''}`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.background = `radial-gradient(circle at 50% 32%, ${combo.secondaryColor}, ${combo.primaryColor})`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${combo.koreanName} 캐릭터`);
  el.innerHTML = `<span class="tcEmoji" style="font-size:${Math.round(size * 0.46)}px">${combo.animalEmoji}</span>`;
  if (imgPromise) {
    Promise.resolve(imgPromise).then((img) => {
      if (!img) return;
      const im = document.createElement('img');
      im.src = img.src;
      im.alt = `${combo.koreanName} 캐릭터`;
      el.innerHTML = '';
      el.appendChild(im);
    });
  }
  return el;
}

/* 탐험 결과 카드 마크업 — r: quests.recap() 결과. 아바타는 #tcAvatarSlot에 호출측이 삽입 */
export function typeCardHTML(r) {
  injectStyle();
  const t = r.type;
  const m = r.typeResult?.metrics;
  let stats;
  if (r.typeResult?.fallback) {
    stats = '아직 기록이 적어요 — 탐험을 시작하면 진짜 유형이 나와요!';
  } else if (m?.hasTrack) {
    stats = `🚶 ${(m.distM / 1000).toFixed(1)}km 걸었고 · 한 곳에 평균 ${Math.max(1, Math.round(m.avgStaySec / 60))}분 머물렀어요`;
  } else {
    stats = '📍 위치를 켜면 이동거리·체류시간 분석도 담아드려요';
  }
  const mainCnt = m ? m.counts[t.missionCategory] || 0 : 0;
  const mainLine = mainCnt > 0 ? `<br>주로 한 탐험: ${t.missionLabel} ${mainCnt}번` : '';
  return `
    <div class="tcCard" style="background:linear-gradient(${esc(t.primaryColor)}, ${esc(shade(t.primaryColor, 0.45))})">
      <div class="tcHead">오늘 당신의 탐험 유형</div>
      <div class="tcName">${t.animalEmoji} 당신은 ${esc(t.koreanName)}${iEyo(t.koreanName)}!</div>
      <div id="tcAvatarSlot"></div>
      <div class="tcDesc">${esc(t.description)}</div>
      <div class="tcStats">${stats}${mainLine}</div>
      <div class="tcKws">${t.personalityKeywords.map((k) => `<span>#${esc(k)}</span>`).join('')}</div>
      <div class="tcBtns">
        <a class="qbtn ghost" href="characters.html" style="text-decoration:none;display:flex;align-items:center;justify-content:center">🧢 캐릭터 도감</a>
        <button class="qbtn" id="shareRecap" style="background:rgba(0,0,0,.28)">📤 결과 공유</button>
      </div>
    </div>`;
}
