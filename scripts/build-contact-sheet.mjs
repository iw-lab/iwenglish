/**
 * build-contact-sheet.mjs — 전 서재 삽화 육안 검수용 컨택트시트 HTML 생성 (2026-07-23).
 * public/seed/<slug>/{cover,pN}.webp 전수를 책별 격자로 묶어 하나의 self-contained HTML로 출력.
 * 이상한 컷을 클릭하면 빨간 테두리로 플래그 → 상단 "플래그 복사" 버튼으로 경로 목록 클립보드 복사.
 * 검출은 검증된 유일 수단(사람 눈)에 맡기고, 재생성은 복사된 목록으로 regen 스크립트에 투입.
 *
 * 출력: public/_qa/contact-sheet.html  (로컬 file:// 또는 배포본 /_qa/contact-sheet.html 로 열람)
 *   node scripts/build-contact-sheet.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "public", "seed");
const OUT_DIR = join(ROOT, "public", "_qa");
const OUT = join(OUT_DIR, "contact-sheet.html");

const pageNum = (f) => {
  const m = f.match(/^p(\d+)\.webp$/);
  return m ? Number(m[1]) : 0;
};

function collectionOf(slug) {
  try {
    const bj = JSON.parse(readFileSync(join(SEED, slug, "book.json"), "utf8"));
    return bj.collection || (slug.startsWith("daily-") ? "daily" : slug.startsWith("myth-") ? "myth" : "storybook");
  } catch {
    return slug.startsWith("daily-") ? "daily" : slug.startsWith("myth-") ? "myth" : "storybook";
  }
}
function titleOf(slug) {
  try {
    const bj = JSON.parse(readFileSync(join(SEED, slug, "book.json"), "utf8"));
    return bj.title || slug;
  } catch { return slug; }
}

const books = [];
let imgCount = 0;
for (const slug of readdirSync(SEED).sort()) {
  if (slug === "_words") continue;
  let files;
  try { files = readdirSync(join(SEED, slug)); } catch { continue; }
  const imgs = files.filter((f) => f === "cover.webp" || /^p\d+\.webp$/.test(f));
  if (!imgs.length) continue;
  imgs.sort((a, b) => {
    if (a === "cover.webp") return -1;
    if (b === "cover.webp") return 1;
    return pageNum(a) - pageNum(b);
  });
  books.push({ slug, coll: collectionOf(slug), title: titleOf(slug), imgs });
  imgCount += imgs.length;
}

const collOrder = { storybook: 0, daily: 1, myth: 2 };
books.sort((a, b) => (collOrder[a.coll] ?? 9) - (collOrder[b.coll] ?? 9) || a.slug.localeCompare(b.slug));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let body = "";
let curColl = "";
for (const b of books) {
  if (b.coll !== curColl) {
    curColl = b.coll;
    body += `<h2 class="coll">${esc(curColl)}</h2>`;
  }
  body += `<section class="book"><h3>${esc(b.title)} <span class="slug">${esc(b.slug)}</span></h3><div class="grid">`;
  for (const f of b.imgs) {
    const rel = `../seed/${b.slug}/${f}`; // OUT_DIR(public/_qa) 기준 상대경로
    const key = `public/seed/${b.slug}/${f.replace(/\.webp$/, ".png")}`; // regen 타깃은 png
    const label = f === "cover.webp" ? "cover" : f.replace(".webp", "");
    body += `<figure class="cell" data-key="${esc(key)}"><img loading="lazy" src="${esc(rel)}" alt="${esc(b.slug)} ${label}"><figcaption>${esc(label)}</figcaption></figure>`;
  }
  body += `</div></section>`;
}

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EchoTale 컨택트시트 — 삽화 육안 검수 (${imgCount}장)</title>
<style>
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;background:#faf7f0;color:#222}
  @media(prefers-color-scheme:dark){body{background:#1a1712;color:#eee}}
  header{position:sticky;top:0;z-index:10;background:rgba(250,247,240,.96);backdrop-filter:blur(8px);border-bottom:1px solid #0002;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  @media(prefers-color-scheme:dark){header{background:rgba(26,23,18,.96)}}
  header h1{font-size:15px;margin:0;font-weight:700}
  header .stat{font-size:13px;opacity:.7}
  button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid #0003;background:#e8663f;color:#fff;cursor:pointer;font-weight:600}
  button.ghost{background:transparent;color:inherit}
  #count{font-weight:700;color:#e8663f}
  main{padding:8px 16px 80px}
  h2.coll{font-size:13px;text-transform:uppercase;letter-spacing:.08em;opacity:.55;margin:28px 0 6px;border-top:2px solid #0001;padding-top:14px}
  section.book{margin:14px 0}
  section.book h3{font-size:14px;margin:6px 0;font-weight:600}
  section.book h3 .slug{font-size:11px;opacity:.45;font-weight:400}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  figure.cell{margin:0;cursor:pointer;border:3px solid transparent;border-radius:8px;overflow:hidden;background:#0001;transition:border-color .1s}
  figure.cell img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
  figure.cell figcaption{font-size:11px;text-align:center;padding:2px;opacity:.6}
  figure.cell.flag{border-color:#e8261a;box-shadow:0 0 0 2px #e8261a55}
  figure.cell.flag figcaption{background:#e8261a;color:#fff;opacity:1;font-weight:700}
  #panel{position:fixed;right:12px;bottom:12px;z-index:20}
  #toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#222;color:#fff;padding:10px 18px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:30}
</style></head><body>
<header>
  <h1>🔍 EchoTale 삽화 육안 검수</h1>
  <span class="stat">${books.length}권 · ${imgCount}장</span>
  <span class="stat">플래그 <span id="count">0</span></span>
  <button id="copy">📋 플래그 목록 복사</button>
  <button class="ghost" id="clear">초기화</button>
  <span class="stat">이상한 컷을 <b>클릭</b>하면 빨갛게 표시됩니다. 다 고른 뒤 목록을 복사해 주세요.</span>
</header>
<main>${body}</main>
<div id="toast"></div>
<script>
const flagged=new Set();
const countEl=document.getElementById('count');
const toast=(m)=>{const t=document.getElementById('toast');t.textContent=m;t.style.opacity=1;setTimeout(()=>t.style.opacity=0,1600);};
document.querySelectorAll('figure.cell').forEach(c=>{
  c.addEventListener('click',()=>{
    const k=c.dataset.key;
    if(flagged.has(k)){flagged.delete(k);c.classList.remove('flag');}
    else{flagged.add(k);c.classList.add('flag');}
    countEl.textContent=flagged.size;
  });
});
document.getElementById('copy').addEventListener('click',async()=>{
  if(!flagged.size){toast('플래그된 컷이 없습니다');return;}
  const txt=[...flagged].sort().join('\\n');
  try{await navigator.clipboard.writeText(txt);toast(flagged.size+'개 경로 복사됨');}
  catch{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(flagged.size+'개 복사됨(fallback)');}
});
document.getElementById('clear').addEventListener('click',()=>{
  flagged.clear();document.querySelectorAll('figure.cell.flag').forEach(c=>c.classList.remove('flag'));countEl.textContent=0;
});
</script></body></html>`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`✅ 컨택트시트 생성: ${OUT}`);
console.log(`   ${books.length}권 · ${imgCount}장`);
