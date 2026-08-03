/* 리캡 체류 슬라이드용 스팟 일러스트 일괄 생성 (개발 시점 1회 실행)
   ⚠️ 시제품용 대체 이미지 — 본사업에서는 방문객이 미션 중 촬영한 실사진으로 교체 전제.
   실행: node tools/gen_spot_images.mjs            — 없는 이미지만 생성
        node tools/gen_spot_images.mjs palgak     — 지정 id만 강제 재생성
   Pollinations.ai(무료·무키) → img/spots/{id}.jpg (768x576, 4:3) */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'img', 'spots');
mkdirSync(OUT, { recursive: true });

const STYLE = 'soft watercolor storybook illustration for children, warm pastel colors, gentle sunlight, no people, no text';
const PROMPTS = {
  foreststage: 'small outdoor wooden amphitheater stage surrounded by tall green trees in a city park',
  botanic: 'small botanical garden greenhouse with tropical plants and a lotus pond in a city park',
  openstage: 'open-air performance stage with a wide plaza in a sunny city park',
  palgak: 'elegant octagonal Korean pavilion tower building surrounded by park trees',
};

const force = process.argv.slice(2);
const ids = force.length ? force : Object.keys(PROMPTS);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(id, seed) {
  const prompt = encodeURIComponent(`${PROMPTS[id]}, ${STYLE}`);
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=768&height=576&seed=${seed}&nologo=true&model=flux`;
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error(`too small: ${buf.length}B`);
  return buf;
}

const ok = [], fail = [];
for (const id of ids) {
  if (!PROMPTS[id]) { console.log(`?? ${id}: 알 수 없는 id — 건너뜀`); continue; }
  const file = join(OUT, `${id}.jpg`);
  if (!force.length && existsSync(file)) { console.log(`-- ${id}: 이미 있음`); ok.push(id); continue; }
  let done = false;
  for (let t = 0; t < 3 && !done; t++) {
    try {
      const buf = await fetchImage(id, 17 + t);
      writeFileSync(file, buf);
      console.log(`OK ${id}: ${(buf.length / 1024).toFixed(0)}KB`);
      ok.push(id); done = true;
    } catch (e) {
      console.log(`.. ${id} 시도 ${t + 1}/3 실패: ${e.message}`);
      await sleep(2000);
    }
  }
  if (!done) fail.push(id);
  await sleep(1500);
}
console.log(`\n성공 ${ok.length} / 실패 ${fail.length}`);
if (fail.length) console.log(`실패분 재실행: node tools/gen_spot_images.mjs ${fail.join(' ')}`);
