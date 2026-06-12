/**
 * 그림책(픽션) 시각 QA 확정 불량컷 격리 재생성 — wave 6 (2026-06-12, 28컷/8권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/<anchor || cover.png> (캐릭터 일관성). T 항목별 anchor 필드로
 * 다른 페이지 레퍼런스 지정 가능. T 항목별 neg 필드로 NEG 교체 가능(팻말 텍스트 예외 등).
 * 메인 생성기 완주 후에만 실행할 것. 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes-w6.mjs
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
// the-long-road-to-sunrise p12 전용 — 종이 위 "arrive with everyone" 손글씨만 허용, 그 외 텍스트 금지.
const NEG_TEXT_ARRIVE =
  'STRICT: the ONLY text allowed in the image is the handwritten words "arrive with everyone" (exact spelling, lowercase) at the top of the trip-plan paper — NO other text/letters/numbers anywhere else. ' +
  "Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift). This page MUST be visually DISTINCT from the other pages of the book.";

// QA wave 6 적대검증 확정 28컷. s = 교정 장면 + 컷별 금지사항. anchor(선택) = 레퍼런스 파일명(기본 cover.png). neg(선택) = NEG 교체.
const T = [
  // ── the-accordion-under-the-bridge (2컷)
  { slug: "the-accordion-under-the-bridge", p: 8,
    char: "an old accordion with a cracked pearl button under a stone bridge, and friendly neighborhood townsfolk (same design as the cover)",
    s: `Community gathering under the stone bridge: townsfolk have brought FOLDING CHAIRS and cups of TEA, sitting together in the bridge's shade as they share songs that waited in their throats for years — the old accordion played at the center, warm slow afternoon, the bridge finally a place to stop. STRICT: folding chairs and tea cups clearly visible among gathered singing neighbors UNDER the bridge; must be visually DISTINCT from p9 (no bus passing overhead as the focus).` },
  { slug: "the-accordion-under-the-bridge", p: 12,
    char: "an old accordion with a cracked pearl button under a stone bridge, and the neighborhood people (same design as the cover)",
    s: `Warm finale: the space under the stone bridge has become a LISTENING PLACE — a small crowd of neighbors of all ages gathered close, quietly leaning in to LISTEN as someone plays the old accordion, soft golden light, the whole neighborhood connected by the music. STRICT: a gathered LISTENING crowd under the bridge is the focus; must be visually DISTINCT from p11 — NO small shelf, NO blue accordion case (those belong to p11).` },
  // ── the-archive-of-lost-colors (4컷)
  { slug: "the-archive-of-lost-colors", p: 2,
    char: "a quiet child and an ELDERLY WOMAN librarian (gray hair in a bun, glasses, cardigan) in an old library (same art style as the cover)",
    s: `In the old library: the oldest librarian — an ELDERLY WOMAN with gray hair — hands the quiet child a small BRASS CARD and POINTS toward a mysterious door hidden behind the map shelf; tall shelves, rolled maps, hushed wonder. STRICT: the librarian is an OLD WOMAN (grandmotherly, gray-haired) — absolutely NOT a bearded man, NOT a male librarian; she is pointing at the hidden door behind the map shelf.` },
  { slug: "the-archive-of-lost-colors", p: 4,
    char: "a quiet child in a tall archive of glowing color jars (same design as the cover)",
    s: `Close moment in the archive: the child REACHES OUT a hand toward the brightest RED glass jar on the shelf — but the jar stays COLD and dim, refusing to glow, and a tiny folded paper NOTE rests beside it (the note is blank, no legible writing); the child's puzzled expression, other jars glowing softly around. STRICT: the focus is one hand reaching for ONE cold red jar with a small note beside it; must be visually DISTINCT from p3 (wide archive reveal) and p5 (mailbox street scene) — NO mailbox, NO street.` },
  { slug: "the-archive-of-lost-colors", p: 5,
    char: "a quiet child and Mr. Han, a kindly elderly neighbor man, beside a faded old mailbox on a village street (same art style as the cover)",
    s: `Outdoor street scene: the child stands beside the FADED OLD MAILBOX with elderly neighbor Mr. Han, who gazes at it warmly and REMEMBERS waiting there for his sister's letters long ago — a soft nostalgic dreamlike hint of his memory in the air, gray-faded street tones. STRICT: an outdoor MAILBOX street scene with the child and the elderly neighbor talking — NOT inside the archive, NO glass jars; must be visually DISTINCT from p4.` },
  { slug: "the-archive-of-lost-colors", p: 9,
    char: "the village street with a bakery and tulip beds, townsfolk and children (same art style as the cover)",
    s: `Evening of returning colors: warm YELLOW glows back into the bakery sign (a simple wooden sign with NO legible letters) while fresh GREEN floods back into the street's tulip leaves — children and neighbors pausing in delight as color spreads through the once-gray town like a memory waking up. STRICT: an outdoor TOWN STREET scene of returning yellow and green color — NOT inside the archive, NO glowing glass jar close-up (the glowing jars belong to p10).` },
  // ── the-boy-who-mapped-the-wind (2컷)
  { slug: "the-boy-who-mapped-the-wind", p: 4,
    char: "Tae: a boy who studies the wind, with ribbons, flags, and a notebook (same design as the cover)",
    s: `At the harbor before a storm: rows of HARBOR FLAGS on tall poles SNAP HARD and stream stiff in the strong wind, dark heavy clouds gathering over the sea, boats rocking at the dock — Tae stands small in the scene watching the flags intently. STRICT: the wide HARBOR FLAGS scene is the focus (flags snapping in pre-storm wind) — NO notebook close-up, NO map close-up (the notebook/map close-up belongs to p5).` },
  { slug: "the-boy-who-mapped-the-wind", p: 10,
    char: "Tae: a boy who studies the wind, with his hand-drawn wind map (same design as the cover)",
    s: `At the school fair: Tae carefully PINS his big hand-drawn WIND MAP (arrows and swirls, no legible letters) onto a display board, with a small blank wooden sign beside it; festive school-fair booths and bunting around, classmates starting to gather curiously. STRICT: Tae actively PINNING the map at a school-fair display board is the focus; the map and sign carry NO legible text; must be visually DISTINCT from p11 (no close-up of classmates feeling wind on their cheeks).` },
  // ── the-girl-who-fixed-the-sky (3컷)
  { slug: "the-girl-who-fixed-the-sky", p: 4,
    char: "Mira: a girl carrying paper patches and a spool of silver thread, and an OLD KITE MAKER (elderly man) in his kite workshop (same art style as the cover)",
    s: `Inside the kite maker's WORKSHOP: the old kite maker, surrounded by colorful paper kites, bamboo frames and spools hanging from the walls, gently EXPLAINS to Mira that the sky cannot be mended with thread alone — Mira listens holding her snapped silver thread, warm indoor lamplight. STRICT: an INDOOR kite-workshop conversation scene — absolutely NO rainy mountain village, NO bowls collecting rain (that is a different book's concept); kites and craft tools fill the workshop.` },
  { slug: "the-girl-who-fixed-the-sky", p: 5,
    char: "Mira: a girl with a basket, collecting glowing squares of light around the village (same design as the cover)",
    s: `Around the village, Mira COLLECTS kindnesses into her basket: in one corner a brother finally speaks an APOLOGY, nearby a child SHARES LUNCH with a new student, and a warm LAMP glows in a window left on for a late neighbor — each kindness becoming a thin glowing square of light drifting into Mira's basket. STRICT: a village kindness-collecting montage with Mira and her basket of light squares — NOT on the rooftop, NO pressing a patch against the sky tear (that is p7).` },
  { slug: "the-girl-who-fixed-the-sky", p: 8,
    char: "Mira: a girl on a rooftop mending a tear in the sky with glowing patches (same design as the cover)",
    s: `Windy struggle at dusk: on the rooftop the glowing PATCHES on the sky tear FLUTTER hard in the pushing wind like nervous birds while Mira holds them steady — and DOWN BELOW in the streets, people look up and SEND MORE squares of light floating UPWARD toward her like rising lanterns. STRICT: patches fluttering in strong wind + people below sending light upward is the focus; must be visually DISTINCT from p11 (no calm conversation with the kite maker, the tear is NOT yet closed).` },
  // ── the-long-road-to-sunrise (4컷)
  { slug: "the-long-road-to-sunrise", p: 4,
    char: "two children hiking before dawn: the narrator child and cousin Jun carrying a bun bag (same design as the cover)",
    s: `Near an old STONE BRIDGE on the dark pre-dawn hill road: the narrator child has FALLEN BEHIND, stopped and breathing hard with the map drooping in hand — ahead, Jun pauses and looks BACK over his shoulder, caught between the brightening sky on the horizon and his tired cousin. STRICT: one child lagging behind near a stone bridge while the other looks back torn between sky and cousin; must be visually DISTINCT from p5 — NO dividing the load, NO handing over bags or bottles (that is p5).` },
  { slug: "the-long-road-to-sunrise", p: 7,
    char: "two children hiking before dawn: the narrator child and cousin Jun (same design as the cover)",
    s: `At the last turn of the trail: OTHER HIKERS hurry past the two children toward the summit — but Jun calmly SQUEEZES his cousin's SHOULDER with a reassuring smile, unhurried, the sky already pale gold behind them. STRICT: Jun's hand on the cousin's shoulder while other hikers stream past is the focus; must be visually DISTINCT from p3 (not the alone-and-out-of-breath scene, several passing hikers are present here).` },
  { slug: "the-long-road-to-sunrise", p: 8,
    char: "two children hiking before dawn: the narrator child and cousin Jun (same design as the cover)",
    s: `Summit arrival: the two children stand together at the TOP of the hill just as ORANGE sunrise light touches the far ROOFTOPS of their town below — a wide breathtaking view over the whole town holding its breath, the children small against the glowing horizon. STRICT: a wide SUMMIT view with orange light on the distant town rooftops; must be visually DISTINCT from p3 (this is the triumphant arrival, not a struggling mid-trail scene).` },
  { slug: "the-long-road-to-sunrise", p: 12, neg: NEG_TEXT_ARRIVE,
    char: "two children at a table planning their next trip: the narrator child and cousin Jun (same design as the cover)",
    s: `Cozy ending at home: the two children lean over a TRIP-PLAN PAPER on the table, one of them WRITING with a pencil the rule at the top of the page — the handwritten words "arrive with everyone" (exact spelling) clearly readable on the paper; warm lamplight, the old map nearby, happy conspiratorial mood. STRICT: the paper shows ONLY the handwritten words "arrive with everyone" and no other writing; indoor planning scene, not on the trail.` },
  // ── the-mirror-lake-promise (4컷)
  { slug: "the-mirror-lake-promise", p: 3,
    char: "a mountain lake and the village children (same art style as the cover)",
    s: `By the lakeside: a group of ADULTS stand together planning the cleaning day, gesturing at the water — while nearby the children exchange WORRIED looks, doubting that one day can change the next hundred days; the lake behind them is visibly MURKY and cloudy with dull greenish-brown water. STRICT: the lake water is MURKY/cloudy (absolutely NOT clear, NOT reflecting stars); daytime scene of discussing adults + worried children.` },
  { slug: "the-mirror-lake-promise", p: 9,
    char: "a mountain lake at night, slowly turning clear again (same art style as the cover)",
    s: `Quiet NIGHT on the lake: the MOON's reflection on the dark water — once broken into scattered pieces — now JOINS into one single trembling glowing CIRCLE on the calming surface; reeds silhouetted, deep blue night sky, hopeful stillness. STRICT: a NIGHT scene focused on the moon reflection forming one circle on the water; must be visually DISTINCT from p7 — NO daytime, NO school, NO map, NO planting grass (those belong to p7).` },
  { slug: "the-mirror-lake-promise", p: 10,
    char: "a clear mountain lake reflecting stars, and the village people (same art style as the cover)",
    s: `The first clear NIGHT: a CROWD of VILLAGERS of all ages — parents, elders, shopkeepers, children — gathers quietly along the shore without being asked, speaking softly and gazing at the lake that finally mirrors the starry sky again; lanterns dim, reverent hush. STRICT: a NIGHT scene with a sizeable villagers' CROWD (many adults and elders, NOT only four children) quietly watching the clear starlit lake.` },
  { slug: "the-mirror-lake-promise", p: 12,
    char: "a clear mountain lake reflecting stars and the village (same art style as the cover)",
    s: `Finale NIGHT vista: the wide mirror-still lake perfectly reflects BOTH the star-filled sky AND the warm lit windows of the little village on its shore — a grand calm double-reflection panorama, the village and the heavens resting together in the water. STRICT: NIGHT panorama where the lake reflects stars AND village lights together; must be visually DISTINCT from p7 (no daytime map/planting) and p9 (not a moon-circle close-up — this is the wide village-and-stars vista).` },
  // ── the-paper-dragon-race (6컷)
  { slug: "the-paper-dragon-race", p: 2,
    char: "colorful paper dragons folded by school children (same design as the cover)",
    s: `Close-up on a classroom DESK: one finished PAPER DRAGON proudly displayed — its LONG folded paper tail trailing across the desk and its face freshly PAINTED with bright friendly colors; crayons, paint pots and paper scraps around it, child hands just finishing. STRICT: an INDOOR desk close-up of the completed paper dragon — the dragon is absolutely NOT in a stream, NO water anywhere (the stream scenes start at p3).` },
  { slug: "the-paper-dragon-race", p: 4,
    char: "colorful paper dragons floating down a stream, and school children (same design as the cover)",
    s: `In the stream: the narrator's RED paper dragon has rushed ahead but now TIPS SIDEWAYS — clearly tilted at an angle, half-leaning into the water as the current pushes it, its long tail askew; the child watching from the bank with an "oh no" expression. STRICT: ONE red paper dragon TILTED SIDEWAYS in the water is the focus; must be visually DISTINCT from p5 (no tail dragging underwater here — this dragon leans sideways) and p6.` },
  { slug: "the-paper-dragon-race", p: 5,
    char: "colorful paper dragons floating down a stream, and Sora, a school girl (same design as the cover)",
    s: `In the stream: Sora's paper dragon moves SLOWLY because its long paper TAIL has sunk and DRAGS UNDER the WATER behind it — the soaked tail visibly submerged and pulling like an anchor while the dragon's body struggles forward; Sora watching from the bank. STRICT: the dragon's TAIL DRAGGING UNDERWATER is the clear focus (body upright but slowed); must be visually DISTINCT from p4 (not tipped sideways — this one is slowed by its sunken tail).` },
  { slug: "the-paper-dragon-race", p: 6,
    char: "school children and their colorful paper dragons by a small stream (same design as the cover)",
    s: `At the water's edge: the children have PULLED the wet paper dragons OUT of the stream and crouch together on the grassy bank, heads close, carefully EXAMINING the soggy folds and creases — curious problem-solving faces, no laughing or teasing, dragons dripping in their hands. STRICT: the dragons are OUT of the water being examined in the children's hands on the bank — NOT floating in the stream.` },
  { slug: "the-paper-dragon-race", p: 7,
    char: "school children folding colorful paper dragons at classroom desks (same design as the cover)",
    s: `Back INDOORS at the classroom desks: the children REFOLD their paper dragons for the second race — making the WINGS noticeably WIDER and the TAILS SHORTER, busy hands creasing paper, scissors and scraps about, determined teamwork energy. STRICT: an INDOOR crafting scene of refolding wider wings and shorter tails — absolutely NO stream, NOT floating on water.` },
  { slug: "the-paper-dragon-race", p: 10,
    char: "school children and their colorful paper dragons by a small stream (same design as the cover)",
    s: `Joyful ending OUTDOORS at the stream: the children stand together on the sunny bank in a happy group — arms around shoulders, some raising fists in cheer — watching their improved paper dragons drift side by side on the sparkling water; the best race was the one they fixed TOGETHER, warm golden afternoon. STRICT: an OUTDOOR streamside group-celebration composition; must be visually DISTINCT from p7 — NO classroom, NO desks, NO folding/crafting (this is the happy together-by-the-stream finale).` },
  // ── the-seed-bank-of-winter (3컷)
  { slug: "the-seed-bank-of-winter", p: 1,
    char: "a snowy Korean village in deep winter (same art style as the cover)",
    s: `Wide OUTDOOR winter opening: early snow has buried the village GARDENS under deep white DRIFTS like a closed door — fence tops and bean poles barely poking out of the smooth snow, hushed gray-white sky, a child gazing at the buried garden from a path; no seeds saved yet. STRICT: an OUTDOOR snow-buried GARDEN landscape only — absolutely NO indoor scene, NO seed sorting, NO village-hall tables (do NOT repeat the cover composition).` },
  { slug: "the-seed-bank-of-winter", p: 2,
    char: "a kind teacher and village children at the snowy village hall (same art style as the cover)",
    s: `The teacher takes action: she UNLOCKS and opens the door of the VILLAGE HALL, then SPREADS wide sheets of BROWN PAPER across the long wooden tables inside — preparing for the seed collection, her breath visible in the cold hall, snow framing the doorway and windows. STRICT: the teacher opening the village hall and laying brown paper on tables is the focus — absolutely NO accordion, NO stone bridge (those belong to a different book).` },
  { slug: "the-seed-bank-of-winter", p: 10,
    char: "village neighbors and children at the seed bank shelves (same art style as the cover)",
    s: `Early spring scene: the SNOW has finally MELTED into patches outside, and villagers come to the seed bank — each person CAREFULLY borrowing just a few labeled seed packets from the full shelves, handling them gently like treasures, promising to return more than they plant; respectful unhurried mood, green hints outside the window. STRICT: people gently BORROWING seed packets from the seed-bank shelves after the thaw (packets carry tiny blank labels with NO legible letters) — absolutely NO starry lake, NO night lake scene (that belongs to a different book).` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw6]`;
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

console.log(`🖼️ 그림책 QA wave 6 확정 ${T.length}컷 격리 재생성 (conc=1)`);
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
console.log("REGEN_SB_W6_DONE");
