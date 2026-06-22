/**
 * apply-en-fixes.mjs — Opus 확정 영어 수정을 seed JSON에 반영.
 * en-qa-report.json(idmap) + en-qa-fixes.json 사용. id→(slug,page,idx) 위치로 정확 매칭.
 * 원문 일치 검증(불일치 시 skip+경고 — 오손 방지). audio:true는 해당 mp3 삭제 + wordTimings 비움
 * → 이후 `AUDIO_SKIP_EXISTING=1 pnpm seed:audio <slug>` 가 그 문장만 재합성+정렬.
 * 출력: .tqa-tmp/en-fix-audio-slugs.txt (음성 재생성 대상 슬러그, 줄단위).
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const TMP = join(ROOT, ".tqa-tmp");

const report = JSON.parse(readFileSync(join(TMP, "en-qa-report.json"), "utf8"));
const idmap = JSON.parse(readFileSync(join(TMP, "en-qa-idmap.json"), "utf8"));
const fixes = JSON.parse(readFileSync(join(ROOT, "scripts", "en-qa-fixes.json"), "utf8")).fixes;

// slug → seed 파일명 캐시
const fileBySlug = {};
for (const f of readdirSync(SEED)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  try { fileBySlug[JSON.parse(readFileSync(join(SEED, f), "utf8")).slug] = f; } catch {}
}

// slug별로 묶기
const bySlug = {};
for (const fx of fixes) {
  const loc = idmap[fx.id];
  if (!loc) { console.log(`❌ id ${fx.id} idmap 없음`); continue; }
  (bySlug[loc.slug] ||= []).push({ ...fx, loc });
}

const audioSlugs = new Set();
let applied = 0, mismatch = 0, audioCnt = 0, quoteCnt = 0;

for (const [slug, items] of Object.entries(bySlug)) {
  const file = fileBySlug[slug];
  if (!file) { console.log(`❌ ${slug} seed 파일 없음`); continue; }
  const path = join(SEED, file);
  const book = JSON.parse(readFileSync(path, "utf8"));
  let dirty = false;
  for (const it of items) {
    const { page, idx, text } = it.loc;
    const p = book.pages[page - 1];
    const s = p && p.sentences[idx - 1];
    if (!s) { console.log(`❌ ${slug} p${page}s${idx} 문장 없음`); continue; }
    if (s.text !== text) {
      console.log(`⚠️ ${slug} p${page}s${idx} 원문 불일치 — skip\n   기대: ${JSON.stringify(text)}\n   실제: ${JSON.stringify(s.text)}`);
      mismatch++; continue;
    }
    s.text = it.new;
    dirty = true; applied++;
    if (it.audio) {
      audioCnt++;
      audioSlugs.add(slug);
      // 해당 문장 wordTimings 비우고 mp3/wav 삭제 → 재합성 강제
      delete s.wordTimings;
      const base = `p${page}-s${idx}`;
      for (const ext of [".mp3", ".wav"]) {
        const ap = join(PUB, slug, "audio", base + ext);
        if (existsSync(ap)) { try { unlinkSync(ap); } catch {} }
      }
    } else quoteCnt++;
  }
  if (dirty) writeFileSync(path, JSON.stringify(book, null, 2));
}

writeFileSync(join(TMP, "en-fix-audio-slugs.txt"), [...audioSlugs].sort().join("\n") + "\n");
console.log(`\n=== 적용 완료 ===`);
console.log(`반영 ${applied} (음성재생성 ${audioCnt} · 따옴표만 ${quoteCnt}) · 원문불일치 skip ${mismatch}`);
console.log(`음성 재생성 대상 책 ${audioSlugs.size}권 → .tqa-tmp/en-fix-audio-slugs.txt`);
console.log([...audioSlugs].sort().join(" "));
