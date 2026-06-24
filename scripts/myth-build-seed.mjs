/**
 * myth-build-seed.mjs — 신화 영어화 JSON → EchoTale seed + 이미지(webp) 생성.
 * 입력: scripts/myth-ch1-en.json (panels[{pageNum,img,sentences[{text,ko,speaker}]}]).
 * 출력:
 *   data/seed/<slug>.json (collection:"myth", stage, pages[].sentences[{text,translation_ko,audio:null,wordTimings:[]}])
 *   public/seed/<slug>/p{N}.webp (패널 PNG→webp), cover.webp
 * 페이지 이미지 규약: 소스 pNNN.png → 순번 p{N}.webp (build-content가 p{N}.webp 참조).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const VOL = "/Users/iw-lab/Documents/dev/iwrome/greek-roman-myth-comics/volumes/vol-01-카오스와-태초의-신들";
const WEB = join(VOL, "images", "web");
const COVER = join(VOL, "vol-01-cover.png");

const SLUG = "myth-vol01-chaos";
const SRC = process.argv[2] || join(ROOT, "scripts", "myth-ch1-en.json");
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
  title: "Chaos and the First Gods",
  title_ko: "카오스와 태초의 신들",
  level: "B1",
  ageBand: "11-13",
  summary_ko: "별이 하나둘 사라지는 밤, 김제 소녀 하라가 모악산 동굴에서 신화의 문을 열어요. 그리스로마신화 1권 — 태초의 카오스와 첫 신들의 이야기.",
  collection: "myth",
  stage: 1,
  pages,
  words: {},
  quiz: [],
};
writeFileSync(join(ROOT, "data", "seed", SLUG + ".json"), JSON.stringify(book, null, 2));

const nSent = pages.reduce((n, p) => n + p.sentences.length, 0);
console.log(`✅ seed 생성: data/seed/${SLUG}.json · ${pages.length}페이지 · ${nSent}문장`);
console.log(`✅ 이미지: public/seed/${SLUG}/ cover.webp + p1~p${pages.length}.webp`);
