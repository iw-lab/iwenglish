/**
 * myth-apply-fixes.mjs — Opus 확정 영어 수정을 myth en.json에 반영(글로벌 id 기준).
 * 안전장치: xval 리포트의 ko·en과 이중 대조해 정확한 문장에만 적용(불일치 skip+경고).
 * 사용: node scripts/myth-apply-fixes.mjs scripts/myth-vol02-en.json scripts/myth-vol02-fixes.json .tqa-tmp/myth-xval-report.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const [enPath, fixPath, reportPath] = process.argv.slice(2);
if (!enPath || !fixPath || !reportPath) { console.error("인자: <en.json> <fixes.json> <xval-report.json>"); process.exit(1); }

const data = JSON.parse(readFileSync(enPath, "utf8"));
const fixes = JSON.parse(readFileSync(fixPath, "utf8")).fixes;
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const byId = Object.fromEntries(report.merged.map((m) => [m.id, m]));

// 패널 배열 순서대로 평탄화(참조 보존) — xval과 동일 순서
const flat = [];
for (const p of data.panels) for (const s of p.sentences) flat.push(s);

let applied = 0, skip = 0;
for (const fx of fixes) {
  const s = flat[fx.id - 1];
  const r = byId[fx.id];
  if (!s) { console.log(`❌ id ${fx.id} 범위초과`); skip++; continue; }
  if (!r) { console.log(`❌ id ${fx.id} 리포트 없음`); skip++; continue; }
  if (s.ko !== r.ko) { console.log(`⚠️ id ${fx.id} ko 불일치 — skip\n  flat: ${JSON.stringify(s.ko)}\n  rpt : ${JSON.stringify(r.ko)}`); skip++; continue; }
  if (s.text !== r.en) { console.log(`⚠️ id ${fx.id} 원문en 불일치 — skip\n  flat: ${JSON.stringify(s.text)}\n  rpt : ${JSON.stringify(r.en)}`); skip++; continue; }
  s.text = fx.new;
  applied++;
}

if (applied) writeFileSync(enPath, JSON.stringify(data, null, 2) + "\n");
console.log(`✅ 적용 ${applied} · skip ${skip} / 총 ${fixes.length}`);
