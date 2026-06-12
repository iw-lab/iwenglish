/**
 * 그림책(픽션) 시각 QA 확정 불량컷 격리 재생성 — wave 4 (2026-06-12, 28컷/11권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/<anchor || cover.png> (캐릭터 일관성). T 항목별 anchor 필드로
 * 다른 페이지 레퍼런스 지정 가능. T 항목별 neg 필드로 NEG 교체 가능(팻말 텍스트 예외 등).
 * 메인 생성기 완주 후에만 실행할 것. 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes-w4.mjs
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
// 예외 NEG — the-library-at-the-end-of-the-lane p5 전용: 팻말의 "Take one, leave one" 텍스트만 허용
const NEG_SIGN =
  'STRICT: the ONLY text allowed in the image is the hand-drawn sign reading EXACTLY "Take one, leave one" — legible, correctly spelled, no other letters/words/numbers anywhere else. ' +
  "Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift). This page MUST be visually DISTINCT from the other pages of the book.";

// QA wave 4 적대검증 확정 28컷. s = 교정 장면 + 컷별 금지사항. anchor(선택) = 레퍼런스 파일명(기본 cover.png). neg(선택) = NEG 교체.
const T = [
  { slug: "maple-learns-to-wait", p: 6,
    char: "Maple: a young maple leaf character on a small branch (same design as the cover), now fully turned RED and GOLD",
    s: `One windy morning, Maple the little maple leaf — now glowing RED and GOLD after the long wait — feels ready at last: she perches on her branch as a fresh wind rustles the tree, expectant and brave, autumn colors all around. STRICT: Maple and the surrounding maple leaves are RED/GOLD autumn colors (after p5's change), NOT green.` },
  { slug: "maple-learns-to-wait", p: 7,
    char: "Maple: a small red-and-gold maple leaf character (same design as the cover)",
    s: `The flying moment: Maple the red-gold maple leaf DANCES DOWN through the open air — twirling and spinning mid-fall between the tree and the ground, joyful free motion, soft wind lines and sky around her. STRICT: the leaf is IN THE AIR falling and spinning, NOT attached to the branch.` },
  { slug: "maple-learns-to-wait", p: 8,
    char: "Maple: a small red-and-gold maple leaf character (same design as the cover)",
    s: `Gentle ending: Maple the red-gold maple leaf rests softly on the autumn ground — waiting has made her beautiful; warm low light, fallen-leaf carpet, peaceful satisfied mood, the old tree in the background. STRICT: outdoor autumn nature scene only — NO desk, NO envelope, NO star stickers (those belong to a different book).` },
  { slug: "the-backyard-camp", p: 1,
    char: "a family (children and Dad) at home, same art style as the cover",
    s: `Rainy-day opening indoors: the children and Dad stand at the living-room WINDOW looking out at the rain, disappointed — they could not drive to the forest today; gray wet glass, cozy but wistful indoor light. STRICT: NO tent anywhere in this scene (the blanket tent is built later in the book).` },
  { slug: "the-backyard-camp", p: 4,
    char: "two children and a small blanket tent in a backyard (same design as the cover)",
    s: `In the backyard: a child crawls halfway into the small BLANKET TENT (a blanket tied between two chairs) and places a glowing FLASHLIGHT inside — warm light blooming under the blanket, excited careful expression. STRICT: backyard blanket-tent scene only — NO harbor, NO old sailor (those belong to a different book).` },
  { slug: "the-backyard-camp", p: 5,
    char: "two children near a small blanket tent in a backyard (same design as the cover)",
    s: `Just after sunset in the backyard: the children sit barefoot on the cool evening GRASS near the blanket tent, breathing in the fresh cool smell of grass after sunset — dusky purple-orange sky, first stars, calm sensory moment. STRICT: an outdoor dusk-garden mood shot; must be visually DISTINCT from p7 (no house-as-mountain composition).` },
  { slug: "the-backyard-camp", p: 8,
    char: "two children and Dad with a small blanket tent in a backyard (same design as the cover)",
    s: `Warm finale: the backyard has become a true adventure — the children and Dad sit happily around their glowing blanket tent under the night sky, flashlight light spilling out, fireflies and stars, triumphant cozy ending mood. STRICT: backyard camp finale only — NOT a blue door in a garden wall (that is a different book).` },
  { slug: "the-blue-door", p: 8,
    char: "a bright blue door in an old garden wall (same design as the cover)",
    s: `Hopeful ending: early next-morning light — the child gazes from a distance toward the bright BLUE DOOR in the garden wall, full of anticipation about visiting the flower path again tomorrow; the door is CLOSED, soft morning glow, longing happy mood. STRICT: the door is closed and seen from afar (or through a morning window); must be visually DISTINCT from p7 (not the same closing-the-door-at-dusk moment).` },
  { slug: "the-bridge-between-two-hills", p: 1,
    char: "two tiny villages of small animals on two facing green hills (same art style as the cover)",
    s: `Wide opening landscape: TWO small villages sit on TWO green hills, with a DEEP empty valley between them — no one has ever crossed it; tiny rooftops on each hilltop, vast open gap of air and valley floor between, quiet distant mood. STRICT: there is NO bridge at all — the valley is completely empty.` },
  { slug: "the-bridge-between-two-hills", p: 2,
    char: "rabbits' village on the west hill and moles' village on the east hill (same art style as the cover)",
    s: `The two villages: on the WEST hill live the RABBITS and on the EAST hill live the MOLES — villagers on each hilltop pause and gaze curiously across the wide valley, wondering who lives so far away; both hill villages visible. STRICT: NO bridge anywhere — only the two separate hill villages and the empty valley.` },
  { slug: "the-bridge-between-two-hills", p: 3,
    char: "Pip: a young rabbit with soft fur and long ears (same design as the cover)",
    s: `Night scene: Pip the young RABBIT stands alone at the EDGE of the valley on the west hill, gazing across the dark gap — on the far hill, TINY warm lights blink in the distance; starry sky, wistful longing mood. STRICT: NO bridge — only the empty night valley and the distant blinking lights.` },
  { slug: "the-bridge-between-two-hills", p: 4,
    char: "Tam: a young MOLE with brown velvety fur, tiny eyes, a pink nose and broad shovel-like front paws (same art style as the cover)",
    s: `Mirror scene on the east hill: Tam the young MOLE stands at the valley edge looking toward the west hill, dreaming of crossing the valley and meeting a new friend — soft dreamy light, the wide gap before him. STRICT: NO bridge; Tam is a MOLE (brown velvety fur, tiny eyes, pink nose, shovel-like paws), NOT a squirrel, NO orange bushy tail.` },
  { slug: "the-bridge-between-two-hills", p: 7,
    char: "Pip the young rabbit and Tam the young mole, each building a half-bridge from their own hill (same design as the cover)",
    s: `The hard days: strong WIND sweeps the wide valley and a wooden PLANK slips and FALLS from the half-built bridge, tumbling down into the gap — the young builders watch it drop, discouraged, wanting to give up; tense windy moment. STRICT: a plank is visibly FALLING in mid-air; must be visually DISTINCT from p6 (this is the struggle scene, not calm building).` },
  { slug: "the-bridge-between-two-hills", p: 9,
    char: "the two half-bridges over the valley (same art style as the cover)",
    s: `Close-up over the middle of the valley: the TWO halves of the wooden rope bridge have crept toward each other for weeks — now only ONE SMALL GAP remains between their ends, planks and ropes almost touching high over the valley; suspenseful hopeful framing on the gap itself. STRICT: a NEAR-MEETING close composition focused on the final small gap; must be visually DISTINCT from p8 (not a wide morning view from the hillside).` },
  { slug: "the-bridge-between-two-hills", p: 10,
    char: "Pip: a young rabbit; Tam: a young MOLE with brown velvety fur, tiny eyes, a pink nose and broad shovel-like front paws (same art style as the cover)",
    s: `The meeting: Pip the rabbit lays the FINAL plank and looks up — straight into the friendly eyes of Tam the MOLE on the other side; both burst out laughing, delighted, meeting at the middle of the finished bridge high over the valley. STRICT: Tam is a MOLE (brown velvety fur, tiny eyes, pink nose, shovel-like front paws), NOT a squirrel, NO orange bushy tail.` },
  { slug: "the-bridge-between-two-hills", p: 11,
    char: "Pip the young rabbit and Tam the young MOLE (brown velvety fur, tiny eyes, pink nose, shovel-like paws); rabbit and mole villagers (same art style as the cover)",
    s: `Joyful crossing: hand in paw, Pip the rabbit and Tam the MOLE walk back and forth across the finished bridge they built together — behind them, rabbits from the west hill and MOLES from the east hill stream onto the bridge, eager to finally meet; bright happy daylight. STRICT: Tam and the east-hill villagers are MOLES (velvety brown, tiny eyes, pink noses), NOT squirrels.` },
  { slug: "the-clock-on-the-hill", p: 2,
    char: "a tall wooden clock tower on a grassy hill (same design as the cover)",
    s: `Quiet Monday morning: the tall wooden clock tower stands on the EMPTY grassy hill — its hands have STOPPED, frozen exactly at SEVEN O'CLOCK; still morning light, no one around, an odd silent stillness instead of the usual chime. STRICT: the clock hands point exactly to 7:00 and the hill is EMPTY — NO crowd of children, no people.` },
  { slug: "the-envelope-of-wishes", p: 3,
    char: "a cream envelope covered with small star stamps (same design as the cover)",
    s: `Street chase view: the cream star-stamped ENVELOPE rides the wind — it skips HIGH OVER the bakery's hanging shop sign and is just vanishing around the street CORNER; charming village street, the envelope alone in the air as the clear subject, motion and breeze. STRICT: the envelope is FLYING AWAY on the wind by itself — NOBODY is holding it; the bakery sign has no legible letters.` },
  { slug: "the-girl-who-planted-light", p: 3,
    char: "Mira: a hopeful girl with a small lantern, living in a dim grey valley (same design as the cover)",
    s: `The discovery: one dim EVENING in the grey valley, Mira opens her PALM and finds a TINY SEED glowing faintly in her hand — soft warm pinpoint of light against the dusk, her face lit with quiet wonder as she decides to plant light, one seed at a time. STRICT: an intimate girl-and-glowing-seed moment — NO bridge festival, NO crowd of rabbits (those belong to a different book).` },
  { slug: "the-girl-who-planted-light", p: 5,
    char: "Mira: a hopeful girl with a small lantern (same design as the cover)",
    s: `Faithful nights: Mira kneels by the small BARE-SOIL patch near her door at night, pouring water from a little can and whispering quiet words to the buried seed — the wind is COLD and SHARP, her scarf and hair blowing, lantern glow beside her, patient devoted mood. STRICT: the soil is BARE — NO blooming flowers and NO glowing shoot yet (the flower only appears later).` },
  { slug: "the-library-at-the-end-of-the-lane", p: 5,
    char: "Min: a child with the tiny blue library cabinet under a street tree (same design as the cover)",
    neg: NEG_SIGN,
    s: `Sign-making moment: Min kneels by the tiny blue library cabinet and proudly finishes a small hand-drawn SIGN that reads exactly "Take one, leave one", hanging it on the cabinet — friends watching happily, warm afternoon lane light. STRICT: the sign text must read EXACTLY "Take one, leave one" — legible and correctly spelled; no other text anywhere in the image.` },
  { slug: "the-night-market-of-stars", p: 1,
    char: "Mina: a young girl in nightclothes (same design as the cover)",
    s: `Dream opening: one quiet night Mina falls asleep by her window while watching the sky — and above the ROOFTOPS a shimmering SILVER PATH opens high into the starry night, curving up from her house toward the heavens; magical hushed beginning. STRICT: night rooftops + silver sky-path only — NO fisherman, NO tide clock, NO grey sea village (those belong to a different book).` },
  { slug: "the-night-market-of-stars", p: 8,
    char: "Mina: a young girl; an old wise GOLDEN star with patient kind eyes (same design as the cover)",
    s: `Comfort scene at the star market: the old GOLDEN star floats gently DOWN to sad Mina — her shoulders dropped, pockets empty — and LISTENS to her with patient kind eyes, warm golden glow against the night stalls; quiet empathetic moment. STRICT: the golden star is LISTENING to a sad Mina (no gift is being given yet); must be visually DISTINCT from p12 (this is NOT the moment a star is placed in her hands).` },
  { slug: "the-night-market-of-stars", p: 9,
    char: "Mina: a young girl; an old wise GOLDEN star with patient kind eyes (same design as the cover)",
    s: `The golden star SPEAKS to Mina — telling her that wishes, songs and kindness can never truly be bought, and the finest gifts are given freely from one heart to another; the star gestures warmly toward the glowing market stalls around them, Mina looking up thoughtfully. STRICT: an active TALKING/teaching composition (star addressing Mina, market behind); must be visually DISTINCT from p10 (NO dropped basket, NO rolling marbles, NO green star).` },
  { slug: "the-secret-of-the-tide-clock", p: 1,
    char: "Mina: a young fisher girl; her old fisherman grandfather and his small boat (same design as the cover)",
    s: `Opening by the GRAY sea: the small fishing village sits along the cold gray shore — Mina stands with her old fisherman GRANDFATHER beside his small weathered BOAT that smells of salt and rope; nets, rope coils, muted gray-blue palette, calm introductory wide scene. STRICT: NO clock and NO clock close-up in this scene (the tide clock first appears on p2).` },
  { slug: "the-secret-of-the-tide-clock", p: 7,
    char: "Mina: a young fisher girl; her old fisherman grandfather; the old wooden one-handed tide clock on the wall (same design as the cover)",
    s: `Indoor teaching moment: GRANDFATHER stands by the old wooden tide clock and EXPLAINS to Mina — gesturing gently toward a bright full MOON visible through the window — that the moon pulls the water like a quiet hand, and the old clock simply listens; Mina looks up at him, absorbed; warm lamplight. STRICT: grandfather MUST appear, actively explaining; calm indoor scene — must be visually DISTINCT from p8 (NO storm, NO bruised gray sky).` },
  { slug: "the-secret-of-the-tide-clock", p: 8,
    char: "the gray seaside village; distant small fishing boats (same art style as the cover)",
    s: `The turn: one afternoon the sky over the sea turns a HEAVY, BRUISED GRAY — dark storm clouds gathering and rolling in, the wind growing sharp, and FAR OUT on the open water the small fishing boats are still at sea; ominous threatening seascape, whitecaps rising. STRICT: storm clouds gathering, ominous dark gray sky, boats far out at sea — a tense outdoor storm-warning scene.` },
  { slug: "the-storyteller-of-the-harbor", p: 13,
    char: "Mira: a young girl finding her voice; Captain Ferro: an old sailor with white hair and kind tired eyes; harbor children (same design as the cover)",
    s: `Legacy ending at the harbor: on a warm orange EVENING dock, MIRA now stands telling the story — children gathered around her like little birds — while old Captain Ferro sits to the side, listening with a PROUD, PEACEFUL smile; lanterns, masts and calm water behind, the harbor alive with her voice. STRICT: harbor dock at dusk only — NO backyard blanket tent, NO flashlight (those belong to a different book).` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw4]`;
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

console.log(`🖼️ 그림책 QA wave 4 확정 ${T.length}컷 격리 재생성 (conc=1)`);
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
console.log("REGEN_SB_W4_DONE");
