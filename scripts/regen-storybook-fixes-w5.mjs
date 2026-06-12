/**
 * 그림책(픽션) 시각 QA 확정 불량컷 격리 재생성 — wave 5 (2026-06-12, 11컷/5권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/<anchor || cover.png> (캐릭터 일관성). T 항목별 anchor 필드로
 * 다른 페이지 레퍼런스 지정 가능. T 항목별 neg 필드로 NEG 교체 가능(팻말 텍스트 예외 등).
 * 메인 생성기 완주 후에만 실행할 것. 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes-w5.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's storybook illustration, warm gentle light, whimsical and cozy, painterly, wholesome, friendly, full background scene, picture-book art.";
const NEG =
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift). This page MUST be visually DISTINCT from the other pages of the book.";

// QA wave 5 적대검증 확정 11컷. s = 교정 장면 + 컷별 금지사항. anchor(선택) = 레퍼런스 파일명(기본 cover.png). neg(선택) = NEG 교체.
const T = [
  { slug: "the-broken-compass", p: 1,
    char: "two children (a boy and his older sister) and Grandpa's old BRASS COMPASS with a wobbly needle (same design as the cover)",
    s: `Opening of the forest walk: the two children set off down a sunny pine-forest trail, one of them proudly holding up Grandpa's old BRASS COMPASS borrowed for the walk — bright start-of-adventure mood, backpacks, tall pines ahead. STRICT: forest-walk opening with the brass compass clearly held — NO toy circus, NO felt tent, NO paper animals (those belong to a different book).` },
  { slug: "the-broken-compass", p: 3,
    char: "two children (a boy and his older sister) walking with Grandpa's old brass compass (same design as the cover)",
    s: `Uneasy moment deeper in the woods: seen from the children's point of view, the forest PATH ahead grows visibly NARROWER than before — trees and undergrowth pressing in on both sides, the two children pausing and looking down the tightening trail with slight worry. STRICT: a narrowing-path composition (deep tightening trail as the focus) — NO creek, NO stream, NO water in this scene; must be visually DISTINCT from p4 (p4 is the stream scene).` },
  { slug: "the-quiet-circus", p: 2,
    char: "Leo: a young boy who is sensitive to loud noise (same art style as the cover)",
    s: `At the loud town circus: big bright DRUMS are being played nearby — and Leo squeezes his eyes shut and COVERS HIS EARS with both hands, overwhelmed by the booming noise; colorful circus crowd and banners around him, his discomfort clear and sympathetic. STRICT: loud drums clearly VISIBLE and Leo actively covering his ears; must be visually DISTINCT from p3 (this is the overwhelmed-at-the-loud-circus moment, not a quiet planning scene).` },
  { slug: "the-quiet-circus", p: 10,
    char: "Leo: a young boy; his friend; their tiny toy circus with paper tents and felt animals (same design as the cover)",
    s: `Sweet ending: the NEXT DAY, smiling Leo holds out a small paper TICKET shaped like a crescent MOON at the entrance of the tiny paper-and-felt toy circus — asking for the second show; his friend welcomes him in, the little paper tent and felt animals glowing warmly behind. STRICT: a moon-shaped paper ticket being handed at the TOY circus entrance — NO compass, NO grandfather handing a compass (those belong to a different book).` },
  { slug: "the-rain-painter", p: 4,
    char: "Nari: a child painting outdoors under gentle rain (same design as the cover)",
    s: `Close-up on the painting paper: RED PAINT runs DOWN the wet page like TINY RIVERS — raindrops tapping the paper, the red streaks branching and flowing in thin watery trails, Nari's hand or brush at the edge of frame; intimate paper-level composition. STRICT: a close-up of red paint streaming down wet paper — NO kite flying in the sky; must be visually DISTINCT from p2 (this is the paint-running close-up, not the kite-painting scene).` },
  { slug: "the-rain-painter", p: 5,
    char: "Nari: a child painting outdoors under gentle rain (same design as the cover)",
    s: `Emotional beat: Nari leans over her blurred painting, eyes WET and lips trembling — she ALMOST CRIES, but keeps watching the running red lines carefully; gentle rain around her easel, fragile hopeful sadness. STRICT: Nari's expression is SAD and TEARY, NOT smiling; she is only LOOKING closely at the ruined painting — NO dipping the brush in blue paint (that happens on p7).` },
  { slug: "the-secret-staircase", p: 7,
    char: "two children and their kind GRANDMA; the narrow wooden staircase hidden behind ivy (same art style as the cover)",
    s: `Gift moment: kind GRANDMA gently hands the two children small paper SEED PACKETS — seeds that love quiet sunlight — the children receiving them with both hands, eager and grateful; warm domestic light, the ivy wall or staircase hinted behind. STRICT: Grandma actively HANDING seed packets to the children is the focus; must be visually DISTINCT from p6 (no carrying watering cans up the stairs).` },
  { slug: "the-secret-staircase", p: 9,
    char: "two children and the narrow wooden staircase, now open and welcoming (same art style as the cover)",
    s: `Transformation: the wooden staircase is now BRIGHT and OPEN — the ivy pulled back like a curtain, warm sunlight pouring down the steps — and the two children climb up FREELY and happily, as if the stairs themselves are inviting them; welcoming, open, airy mood. STRICT: bright/open WELCOMING mood with children climbing the sunlit stairs; must be visually DISTINCT from p6 (not the dim water-carrying scene).` },
  { slug: "the-wandering-seed-cart", p: 1,
    char: "a wooden cart filled with labeled seed packets (same design as the cover)",
    s: `Windy opening: on a blustery day the little WOODEN SEED CART rolls INTO town along the village street — wind tossing leaves and scarves, townsfolk turning to look as the cart full of seed packets arrives; lively arrival energy, charming village houses. STRICT: a windy village-street ARRIVAL scene of the seed cart — NO clock tower, NO clock repair (those belong to a different book).` },
  { slug: "the-wandering-seed-cart", p: 2,
    char: "a wooden cart filled with labeled seed packets (same design as the cover)",
    s: `The magical detail: the wooden seed cart rolls steadily along the road ALL BY ITSELF — NOBODY pushes or pulls it — its little wheels confidently following the lane while a curious child watches from a doorway in wonder. STRICT: absolutely NOBODY is pushing, pulling or touching the cart — it moves alone; must be visually DISTINCT from p4 (no old stone wall rattling scene).` },
  { slug: "the-wandering-seed-cart", p: 8,
    char: "the village neighbors and the wooden seed cart (same art style as the cover)",
    s: `Joyful sharing: several different NEIGHBORS around the village each hold up a small SEED PACKET with a little name-tag label — delighted, showing each other, as if every packet was written just for them; the wooden cart nearby, warm community happiness. STRICT: multiple neighbors each happily HOLDING their own labeled packet (labels are tiny blank tags with NO legible letters); must be visually DISTINCT from p10 (no dusk departure, no thank-you notes in the cart).` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw5]`;
  const neg = t.neg || NEG;
  const prompt = `${STYLE}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${neg}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인이 수행). 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
    );
    const child = spawn("codex", args, {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let outBuf = "";
    // 비활동 워치독 — 새 출력 240초 부재 시 hang(에코 후 침묵) → 조기 킬
    const killTree = (sig) => {
      try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* noop */ } }
    };
    let lastData = Date.now();
    const silent = setInterval(() => {
      if (Date.now() - lastData > 240000) { clearInterval(silent); killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }
    }, 15000);
    child.stdout.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    child.stderr.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    const timer = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, PER_TIMEOUT);
    const fin = () => { clearTimeout(timer); clearInterval(silent); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

async function genOne(t) {
  const label = `${t.slug} p${t.p}`;
  const out = join(PUB, t.slug, `p${t.p}.png`);
  try { if (existsSync(out)) unlinkSync(out); } catch { /* noop */ }
  for (let a = 1; a <= 3; a++) {
    const ok = await runCodex(t);
    if (ok) { console.log(`✅ ${label}`); return true; }
    console.log(`↻ ${label} 재시도 ${a}/3`);
  }
  console.log(`⚠️ ${label} 실패`);
  return false;
}

console.log(`🖼️ 그림책 QA wave 5 확정 ${T.length}컷 격리 재생성 (conc=1)`);
const okList = [];
const failList = [];
for (const t of T) {
  await new Promise((r) => setTimeout(r, 900));
  const ok = await genOne(t);
  (ok ? okList : failList).push(`${t.slug} p${t.p}`);
}
console.log(`\n📋 결과 요약 — 성공 ${okList.length} / 실패 ${failList.length} (총 ${T.length}컷)`);
if (okList.length) console.log(`  ✅ 성공: ${okList.join(", ")}`);
if (failList.length) console.log(`  ⚠️ 실패: ${failList.join(", ")}`);
console.log("REGEN_SB_W5_DONE");
