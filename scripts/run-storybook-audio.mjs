/**
 * 그림책 음성 파이프라인:
 *   1) seed:worddict  — 새 단어 뜻·IPA·예문(OpenAI) → _words.json (전체 스캔, dedup)
 *   2) seed:words     — 새 단어 Edge TTS 발음 → public/seed/_words (dedup)
 *   3) 권별 seed:audio — 문장 nova 낭독 + whisper 정렬 (AUDIO_SKIP_EXISTING=1 기존 보존)
 *   4) seed:content   — content.generated + dict.json 재생성
 *   node scripts/run-storybook-audio.mjs
 *   node scripts/run-storybook-audio.mjs extra
 */
import { spawnSync } from "node:child_process";
import { STORYBOOK_PLAN } from "./storybook-plan.mjs";
import { EXTRA_STORYBOOK_PLAN } from "./storybook-extra-books.mjs";

const scope = process.argv[2] || process.env.STORYBOOK_SCOPE || "all";
const plan = scope === "extra" ? EXTRA_STORYBOOK_PLAN : STORYBOOK_PLAN;
const slugs = plan.map((b) => b.slug);
const env = {
  ...process.env,
  TTS_ENGINE: "openai",
  ALIGN_ENGINE: "openai",
  WORD_ENGINE: "edge",
  AUDIO_SKIP_EXISTING: "1",
};
const run = (args, label) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync("pnpm", args, { stdio: "inherit", env });
  console.log(r.status === 0 ? `✅ ${label}` : `⚠️ ${label} (exit ${r.status})`);
  return r.status === 0;
};

console.log(`🔊 그림책 scope=${scope} ${slugs.length}권 음성 파이프라인`);
run(["seed:worddict"], "단어 사전(worddict)");
run(["seed:words"], "단어 발음(words)");

let ok = 0;
slugs.forEach((s, i) => {
  if (run(["seed:audio", s], `[${i + 1}/${slugs.length}] ${s}`)) ok++;
});
console.log(`\n낭독 완료 ${ok}/${slugs.length}권`);

run(["seed:content"], "content 반영");
console.log("STORYBOOK_AUDIO_DONE");
