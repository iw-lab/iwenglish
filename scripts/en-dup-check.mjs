/**
 * en-dup-check.mjs — 250권 영어 본문 중복 검사 (결정적·무료, LLM 미사용).
 * (1) 책간 동일 문장: 서로 다른 책 여러 권에 같은 문장 반복(짧은 정형구 제외 위해 단어수/책수 가중)
 * (2) 책쌍 유사도: 정규화 문장집합 Jaccard 높은 책쌍(스토리 복제 의심)
 * (3) 책내 중복: 한 책 안에서 같은 문장 2회+
 * 출력: .tqa-tmp/dup-report.json + 콘솔 요약.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const TMP = join(ROOT, ".tqa-tmp");
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const norm = (s) =>
  s.toLowerCase().replace(/[“”"'’.,!?;:()\-—]/g, " ").replace(/\s+/g, " ").trim();
const wc = (s) => norm(s).split(" ").filter(Boolean).length;

const books = [];
for (const f of readdirSync(SEED)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  const b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  const sents = [];
  (b.pages || []).forEach((p, pi) =>
    (p.sentences || []).forEach((s, si) => {
      if (s.text) sents.push({ text: s.text, page: pi + 1, idx: si + 1, n: norm(s.text) });
    }),
  );
  books.push({ slug: b.slug, title: b.title, collection: b.collection ?? "storybook", sents });
}

// (1) 책간 동일 문장
const byNorm = new Map(); // norm → Set(slug) + sample
for (const b of books)
  for (const s of b.sents) {
    if (!byNorm.has(s.n)) byNorm.set(s.n, { books: new Set(), sample: s.text, words: wc(s.text) });
    byNorm.get(s.n).books.add(b.slug);
  }
const crossSent = [];
for (const [n, v] of byNorm) {
  const nbooks = v.books.size;
  // 의심 기준: 6단어+ 문장이 2권+ 반복, 또는 짧아도 4권+ 반복
  if ((v.words >= 6 && nbooks >= 2) || nbooks >= 4) {
    crossSent.push({ sample: v.sample, words: v.words, nbooks, books: [...v.books] });
  }
}
crossSent.sort((a, b) => b.nbooks - a.nbooks || b.words - a.words);

// (2) 책쌍 Jaccard (전체 본문 ≥6단어 문장집합 기준 — 정형구 노이즈 감소)
const setOf = (b) => new Set(b.sents.filter((s) => wc(s.text) >= 6).map((s) => s.n));
const sets = books.map((b) => ({ slug: b.slug, set: setOf(b) }));
const pairs = [];
for (let i = 0; i < sets.length; i++)
  for (let j = i + 1; j < sets.length; j++) {
    const A = sets[i].set, B = sets[j].set;
    if (A.size === 0 || B.size === 0) continue;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    if (inter === 0) continue;
    const jac = inter / (A.size + B.size - inter);
    if (jac >= 0.15) pairs.push({ a: sets[i].slug, b: sets[j].slug, jac: +jac.toFixed(3), shared: inter, aSize: A.size, bSize: B.size });
  }
pairs.sort((a, b) => b.jac - a.jac);

// (3) 책내 중복
const inBook = [];
for (const b of books) {
  const seen = new Map();
  for (const s of b.sents) {
    if (s.n.length < 3) continue;
    if (seen.has(s.n)) inBook.push({ slug: b.slug, sample: s.text, at: [seen.get(s.n), `p${s.page}s${s.idx}`] });
    else seen.set(s.n, `p${s.page}s${s.idx}`);
  }
}

const report = { generatedFrom: books.length, crossSent, pairs, inBook };
writeFileSync(join(TMP, "dup-report.json"), JSON.stringify(report, null, 2));

console.log(`=== 중복 검사 (${books.length}권) ===`);
console.log(`\n[1] 책간 동일 문장 의심: ${crossSent.length}건 (상위 25)`);
for (const c of crossSent.slice(0, 25))
  console.log(`  ${c.nbooks}권·${c.words}단어 | "${c.sample}" | ${c.books.slice(0, 6).join(",")}${c.books.length > 6 ? "…" : ""}`);
console.log(`\n[2] 책쌍 유사도 ≥0.15: ${pairs.length}쌍 (상위 20)`);
for (const p of pairs.slice(0, 20))
  console.log(`  jac=${p.jac} 공유${p.shared} | ${p.a} ↔ ${p.b}`);
console.log(`\n[3] 책내 중복 문장: ${inBook.length}건`);
for (const x of inBook.slice(0, 20)) console.log(`  ${x.slug} | "${x.sample}" | ${x.at.join(" = ")}`);
console.log(`\n리포트: .tqa-tmp/dup-report.json`);
