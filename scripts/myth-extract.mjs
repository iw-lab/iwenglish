/**
 * myth-extract.mjs — iwrome vol-01 최종 뷰어 HTML에서 패널별 한국어 텍스트 추출.
 * 출처 = web-viewer/vol-01.html (편집 완료본). 패널 = <section class="page">.
 * 추출: pageNum, img(pNNN), captions[], bubbles[{speaker,text}], sfx[].
 * 출력: .tqa-tmp/myth-vol01-src.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
// vol 번호 인자(기본 01). 볼륨 디렉토리는 한글접미사라 prefix 매칭으로 해석.
const VOLNUM = String(process.argv[2] || "01").padStart(2, "0");
const VOLUMES = "/Users/iw-lab/Documents/dev/iwrome/greek-roman-myth-comics/volumes";
const dir = readdirSync(VOLUMES).find((d) => d.startsWith(`vol-${VOLNUM}-`));
if (!dir) { console.error(`vol-${VOLNUM}-* 디렉토리 없음`); process.exit(1); }
const VOL = join(VOLUMES, dir);
const HTML = join(VOL, "web-viewer", `vol-${VOLNUM}.html`);
const TMP = join(ROOT, ".tqa-tmp");
mkdirSync(TMP, { recursive: true });

const html = readFileSync(HTML, "utf8");
const decode = (s) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

// <section class="page"> ... </section> 단위 분할
const sections = html.split(/<section class="page">/).slice(1);
const panels = [];
for (const sec of sections) {
  const body = sec.split(/<\/section>/)[0];
  const imgM = body.match(/images\/web\/(p\d{3})\.png/);
  if (!imgM) continue;
  const img = imgM[1];
  const pageNum = parseInt(img.slice(1), 10);

  const captions = [...body.matchAll(/<div class="caption">([\s\S]*?)<\/div>/g)].map((m) => decode(m[1])).filter(Boolean);
  const bubbles = [...body.matchAll(/<div class="bubble">([\s\S]*?)<\/div>/g)].map((m) => {
    const sp = m[1].match(/<span class="bubble-speaker">([\s\S]*?)<\/span>/);
    const tx = m[1].match(/<span class="bubble-text">([\s\S]*?)<\/span>/);
    return { speaker: sp ? decode(sp[1]) : "", text: tx ? decode(tx[1]) : "" };
  }).filter((b) => b.text);
  const sfx = [...body.matchAll(/<div class="sfx"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => decode(m[1])).filter(Boolean);

  panels.push({ pageNum, img, captions, bubbles, sfx });
}
panels.sort((a, b) => a.pageNum - b.pageNum);

// 패널 이미지 실제 존재 확인
let missing = 0;
for (const p of panels) {
  if (!existsSync(join(VOL, "images", "web", p.img + ".png"))) { console.log(`⚠️ 이미지 없음: ${p.img}`); missing++; }
}

writeFileSync(join(TMP, `myth-vol${VOLNUM}-src.json`), JSON.stringify(panels, null, 2));
const totBubbles = panels.reduce((n, p) => n + p.bubbles.length, 0);
const totCaps = panels.reduce((n, p) => n + p.captions.length, 0);
console.log(`패널 ${panels.length} · 캡션 ${totCaps} · 말풍선 ${totBubbles} · sfx ${panels.reduce((n,p)=>n+p.sfx.length,0)} · 이미지누락 ${missing}`);
console.log(`페이지 범위 p${panels[0].pageNum}~p${panels[panels.length-1].pageNum}`);
// 챕터1(p1~p8) 미리보기
console.log(`\n=== ch1 p1~p8 텍스트량 ===`);
for (const p of panels.filter((x) => x.pageNum <= 8)) {
  console.log(`p${p.pageNum}: cap ${p.captions.length} · bubble ${p.bubbles.length} · sfx ${p.sfx.length}`);
}
