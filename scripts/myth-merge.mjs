/**
 * myth-merge.mjs — ch1 + part2 + part3 영어 JSON 병합 + 소스 정합 검증.
 * 검증: 패널 수·순서, 패널별 유닛 수, ko 원문 일치(화자 prefix 무시 비교). 불일치 시 중단.
 * 출력: scripts/myth-vol01-en.json (전체 83패널).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const S = (f) => JSON.parse(readFileSync(join(ROOT, "scripts", f), "utf8"));
const src = JSON.parse(readFileSync(join(ROOT, ".tqa-tmp", "myth-vol01-src.json"), "utf8"));

const parts = [S("myth-ch1-en.json"), S("myth-en-part2.json"), S("myth-en-part3.json")];
const panels = [];
for (const p of parts) panels.push(...p.panels);
panels.sort((a, b) => a.pageNum - b.pageNum);

// 정합 검증
const stripSpk = (s) => s.replace(/^[^:：]{1,12}[:：]\s*/, "").trim();
let errs = 0;
if (panels.length !== src.length) { console.log(`❌ 패널수 불일치: en ${panels.length} vs src ${src.length}`); errs++; }
const srcByPage = Object.fromEntries(src.map((p) => [p.pageNum, p]));
for (const ep of panels) {
  const sp = srcByPage[ep.pageNum];
  if (!sp) { console.log(`❌ p${ep.pageNum} 소스 없음`); errs++; continue; }
  const srcUnits = [...sp.captions, ...sp.bubbles.map((b) => b.text)];
  if (ep.sentences.length !== srcUnits.length) {
    console.log(`❌ p${ep.pageNum} 유닛수: en ${ep.sentences.length} vs src ${srcUnits.length}`); errs++; continue;
  }
  // ko가 소스 텍스트를 포함하는지(순서대로) 대략 확인
  ep.sentences.forEach((s, i) => {
    const koClean = stripSpk(s.ko);
    if (koClean !== srcUnits[i].trim()) {
      // 경미 차이 허용 안 함 — 출력
      console.log(`⚠️ p${ep.pageNum}s${i + 1} ko 불일치\n   en.ko: ${JSON.stringify(koClean)}\n   src  : ${JSON.stringify(srcUnits[i].trim())}`);
      errs++;
    }
  });
}

if (errs) { console.log(`\n❌ 정합 오류 ${errs}건 — 병합 중단`); process.exit(1); }

const out = { _note: "vol-01 전체 영어화 (ch1+part2+part3 병합, 소스 정합 검증 통과).", panels };
writeFileSync(join(ROOT, "scripts", "myth-vol01-en.json"), JSON.stringify(out, null, 2));
const nSent = panels.reduce((n, p) => n + p.sentences.length, 0);
console.log(`✅ 병합 완료: ${panels.length}패널 · ${nSent}문장 → scripts/myth-vol01-en.json`);
