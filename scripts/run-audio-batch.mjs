/**
 * 음성 미완성 daily 책만 골라 순차 음성 생성(OpenAI nova + whisper 정렬).
 * 기존 책은 AUDIO_SKIP_EXISTING=1 로 추가 페이지만 생성.
 *   node scripts/run-audio-batch.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SEED = join(process.cwd(), "data", "seed");
const need = [];
for (const f of readdirSync(SEED)) {
  if (!/^daily-\d+-.+\.json$/.test(f)) continue;
  const b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  const incomplete = b.pages.some((p) =>
    p.sentences.some((s) => !(s.wordTimings?.length > 0)),
  );
  if (incomplete) need.push(b.slug);
}
need.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
console.log(`🔊 음성 필요 ${need.length}권`);

let ok = 0;
const fail = [];
for (const slug of need) {
  console.log(`\n=== [${ok + fail.length + 1}/${need.length}] ${slug} ===`);
  const r = spawnSync("pnpm", ["seed:audio", slug], {
    stdio: "inherit",
    env: {
      ...process.env,
      TTS_ENGINE: "openai",
      ALIGN_ENGINE: "openai",
      AUDIO_SKIP_EXISTING: "1",
    },
  });
  if (r.status === 0) ok++;
  else {
    fail.push(slug);
    console.log(`⚠️ 실패 ${slug} (status ${r.status})`);
  }
}
console.log(`\n🔊 AUDIO_BATCH_DONE ok=${ok}/${need.length} fail=${fail.length} ${fail.join(",")}`);
