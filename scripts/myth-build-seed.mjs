/**
 * myth-build-seed.mjs — 신화 영어화 JSON → EchoTale seed + 이미지(webp) 생성.
 * 입력: scripts/myth-ch1-en.json (panels[{pageNum,img,sentences[{text,ko,speaker}]}]).
 * 출력:
 *   data/seed/<slug>.json (collection:"myth", stage, pages[].sentences[{text,translation_ko,audio:null,wordTimings:[]}])
 *   public/seed/<slug>/p{N}.webp (패널 PNG→webp), cover.webp
 * 페이지 이미지 규약: 소스 pNNN.png → 순번 p{N}.webp (build-content가 p{N}.webp 참조).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const VOLUMES = "/Users/iw-lab/Documents/dev/iwrome/greek-roman-myth-comics/volumes";

// vol별 메타데이터 — 새 권 추가 시 여기에 한 항목 추가.
const VOL_META = {
  "01": {
    slug: "myth-vol01-chaos",
    title: "Chaos and the First Gods",
    title_ko: "카오스와 태초의 신들",
    level: "B1", ageBand: "11-13", stage: 1,
    summary_ko: "별이 하나둘 사라지는 밤, 김제 소녀 하라가 모악산 동굴에서 신화의 문을 열어요. 그리스로마신화 1권 — 태초의 카오스와 첫 신들의 이야기.",
  },
  "02": {
    slug: "myth-vol02-uranus",
    title: "The Age of Uranus and Gaia",
    title_ko: "우라노스와 가이아의 시대",
    level: "B1", ageBand: "11-13", stage: 2,
    summary_ko: "황금 곡식알이 빛을 잃은 밤, 하라는 다시 모악산 동굴에서 신화의 문을 열어요. 막내였던 크로노스가 새 왕이 되지만 약속을 어겨 가이아의 분노를 사고, 레아는 마지막 아기를 지키려 운명에 맞서요. 그리스로마신화 2권 — 약속이 어둠으로 변하고, 어머니의 사랑이 한 시대를 살리는 이야기.",
  },
};

const VOLNUM = String(process.argv[3] || "01").padStart(2, "0");
const META = VOL_META[VOLNUM];
if (!META) { console.error(`VOL_META에 vol-${VOLNUM} 없음`); process.exit(1); }
const dir = readdirSync(VOLUMES).find((d) => d.startsWith(`vol-${VOLNUM}-`));
if (!dir) { console.error(`vol-${VOLNUM}-* 디렉토리 없음`); process.exit(1); }
const VOL = join(VOLUMES, dir);
const WEB = join(VOL, "images", "web");
const COVER = join(VOL, `vol-${VOLNUM}-cover.png`);

const SLUG = META.slug;
const SRC = process.argv[2] || join(ROOT, "scripts", `myth-vol${VOLNUM}-en.json`);
const data = JSON.parse(readFileSync(SRC, "utf8"));

const pubDir = join(ROOT, "public", "seed", SLUG);
mkdirSync(pubDir, { recursive: true });

function toWebp(srcPng, outWebp) {
  execFileSync("cwebp", ["-q", "82", "-resize", "1280", "0", srcPng, "-o", outWebp], { stdio: "ignore" });
}

// 이미지
toWebp(COVER, join(pubDir, "cover.webp"));
const pages = [];
data.panels.forEach((p, i) => {
  const pageNo = i + 1;
  const srcPng = join(WEB, p.img + ".png");
  if (!existsSync(srcPng)) throw new Error("이미지 없음: " + srcPng);
  toWebp(srcPng, join(pubDir, `p${pageNo}.webp`));
  pages.push({
    sentences: p.sentences.map((s) => ({
      text: s.text,
      translation_ko: s.ko,
      audio: null,
      wordTimings: [],
    })),
  });
});

const book = {
  slug: SLUG,
  title: META.title,
  title_ko: META.title_ko,
  level: META.level,
  ageBand: META.ageBand,
  summary_ko: META.summary_ko,
  collection: "myth",
  stage: META.stage,
  pages,
  words: {},
  quiz: [],
};
writeFileSync(join(ROOT, "data", "seed", SLUG + ".json"), JSON.stringify(book, null, 2));

const nSent = pages.reduce((n, p) => n + p.sentences.length, 0);
console.log(`✅ seed 생성: data/seed/${SLUG}.json · ${pages.length}페이지 · ${nSent}문장`);
console.log(`✅ 이미지: public/seed/${SLUG}/ cover.webp + p1~p${pages.length}.webp`);
