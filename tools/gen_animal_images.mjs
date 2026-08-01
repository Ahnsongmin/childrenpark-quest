/* 스토리 리캡용 동물 이미지 일괄 생성 (개발 시점 1회 실행)
   실행: node tools/gen_animal_images.mjs           — 없는 이미지만 전부 생성
        node tools/gen_animal_images.mjs otter fox — 지정 id만 강제 재생성
   Pollinations.ai(무료·무키) → img/animals/{id}.jpg (768x1152, 9:16) */
import { PROMPTS, STYLE } from './animal_prompts.mjs';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'img', 'animals');
mkdirSync(OUT, { recursive: true });

const force = process.argv.slice(2);
const ids = force.length ? force : Object.keys(PROMPTS);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(id, seed) {
  const prompt = encodeURIComponent(`${PROMPTS[id]}, ${STYLE}`);
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=768&height=1152&seed=${seed}&nologo=true&model=flux`;
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
      const buf = await fetchImage(id, 41 + t);
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
if (fail.length) console.log(`실패분 재실행: node tools/gen_animal_images.mjs ${fail.join(' ')}`);
