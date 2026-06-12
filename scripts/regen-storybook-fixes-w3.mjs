/**
 * 그림책(픽션) 시각 QA 확정 불량컷 격리 재생성 — wave 3 (2026-06-12, 20컷/7권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/<anchor || cover.png> (캐릭터 일관성). T 항목별 anchor 필드로
 * 다른 페이지 레퍼런스 지정 가능.
 * 메인 생성기 완주 후에만 실행할 것. 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes-w3.mjs
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

// QA wave 3 적대검증 확정 20컷. s = 교정 장면 + 컷별 금지사항. anchor(선택) = 레퍼런스 파일명(기본 cover.png).
const T = [
  { slug: "the-boy-who-collected-echoes", p: 1,
    char: "Eli: a dreamy young boy with a notebook and a shoulder bag of empty glass jars (same design as the cover)",
    s: `Opening scene high in the green hills: Eli the dreamy boy walks alone along a gentle grassy hillside path, carrying his notebook and a shoulder bag full of EMPTY glass jars, curious wondering mood, wide rolling green hills around him. STRICT: NO river and NO swimming, NO crowd of children — Eli is alone on the hill path.` },
  { slug: "the-boy-who-collected-echoes", p: 10,
    char: "Eli: a dreamy young boy with a notebook and glass jars (same design as the cover)",
    s: `Quiet evening at home: Eli stands before a dusty wooden SHELF lined with many LABELED glass jars in a neat row, gazing at them thoughtfully — he realizes he kept all the sounds for himself instead of sharing their joy; soft pensive indoor light. STRICT: indoor home shelf scene, jars closed and lined up; composition must be visually DISTINCT from p7.` },
  { slug: "the-boy-who-collected-echoes", p: 11,
    char: "Eli: a dreamy young boy with a notebook and glass jars (same design as the cover)",
    s: `Bright next morning on the HIGHEST RIDGE of the hills: Eli opens the lids of his glass jars one by one and lets the echoes fly FREE — glowing luminous sound particles and soft light-streams stream out of the open jars into the wide sky, joyful releasing moment. STRICT: jars OPEN with glowing sounds escaping upward; must be visually DISTINCT from p9.` },
  { slug: "the-clever-crow", p: 1,
    char: "a glossy black crow (same design as the cover) — but NO jug in this scene",
    s: `One hot day: the glossy black crow flies through the air HIGH OVER wide DRY cracked fields under a blazing sun, very thirsty, no rain anywhere — parched yellow-brown landscape below, the crow in flight as the clear subject. STRICT: NO jug and NO pitcher anywhere in this scene; the crow is flying, not perched.` },
  { slug: "the-clever-crow", p: 5,
    char: "a glossy black crow beside a tall narrow jug of water (same design as the cover)",
    s: `The glossy black crow PUSHES against the tall narrow water jug with her body and wings, straining hard — but the jug is too heavy to move and does not tip; inside the transparent-enough jug the water level is LOW, only a little water near the BOTTOM; frustrated puzzled expression. STRICT: the water level is LOW near the bottom of the jug (NOT half full, NOT near the top); the jug stays upright.` },
  { slug: "the-clever-crow", p: 9,
    char: "a glossy black crow beside a tall narrow jug of water (same design as the cover)",
    s: `Triumphant moment: the tall narrow jug is now FILLED with small PEBBLES clearly visible inside, and the water has risen all the way NEAR THE TOP of the jug — the clever crow leans her beak into the jug's mouth and DRINKS happily at last. STRICT: pebbles visible filling the jug, water at the TOP near the rim; the crow is drinking.` },
  { slug: "the-clockwork-sparrow", p: 8,
    char: "a small brass wind-up clockwork sparrow with a little key; wild garden sparrows (same design as the cover)",
    s: `Sunny garden scene: several WILD brown sparrows perch around on branches and sing — slow notes, then quick ones, over and over — while the small brass clockwork sparrow sits among them LISTENING intently, its tiny gears just beginning to turn; warm teaching moment. STRICT: wild real sparrows ARE present and singing; this page must be visually DISTINCT from p3 (outdoor garden, many birds, no waiting child close-up).` },
  { slug: "the-clockwork-sparrow", p: 12,
    char: "a small brass wind-up clockwork sparrow with a little key; wild garden sparrows (same design as the cover)",
    s: `Joyful finale chorus in the garden: the WILD birds tilt their heads and sing back with delight, and now they ALL sing TOGETHER with the little brass clockwork sparrow in the middle — beaks open, a happy shared chorus, the clockwork sparrow finally at home among friends. STRICT: a group singing-together composition, multiple wild birds AND the clockwork sparrow all singing; must be visually DISTINCT from p11 (not a solo close-up of the clockwork sparrow).` },
  { slug: "the-island-of-forgotten-songs", p: 2,
    char: "Mara and Theo: two young friends (a girl and a boy, same design as the cover); an old fisherman",
    s: `Night on the village dock by the sea: the OLD weathered FISHERMAN leans forward in the lantern light and tells Mara and Theo the legend — pointing out toward the dark sea horizon where, far away, lies an island of forgotten songs; the two children listen wide-eyed, leaning in. STRICT: NIGHT scene with the fisherman actively telling the legend and gesturing to the sea; must be visually DISTINCT from p1 (not a generic evening overview of the village).` },
  { slug: "the-island-of-forgotten-songs", p: 7,
    char: "Mara and Theo: two young friends in a small boat (same design as the cover)",
    s: `Landing moment: the small boat touches the SOFT SAND of the shore and the mist OPENS like a parting curtain — before Mara and Theo rises a lush GREEN island full of gentle light and sound; the children look up in wonder from the beached boat. STRICT: the boat is AT the sandy shore (arrival), mist parting to reveal the green island; must be visually DISTINCT from p6 (no longer inside blinding mist).` },
  { slug: "the-island-of-forgotten-songs", p: 10,
    char: "Mara: a young girl (same design as the cover); floating melody-lights",
    s: `Tender close moment on the island: Mara stands with her EYES CLOSED, calm and moved, as one soft warm melody-light — her grandmother's lullaby — floats gently near her; she listens until she can sing it too, quietly humming along. STRICT: Mara's eyes are CLOSED, one single warm light near her; must be visually DISTINCT from p8 (not a wide view of many lights among the trees).` },
  { slug: "the-island-of-forgotten-songs", p: 11,
    char: "Mara and Theo: two young friends in a small boat (same design as the cover)",
    s: `On the small boat near the misty island: Theo speaks quietly to Mara — they cannot carry every song, but ONE is enough if they sing it for others; the two children sit in the boat cradling ONE soft glowing melody-light between them, thoughtful gentle mood, mist and the island behind. STRICT: TWO children on a BOAT at sea holding one small light — NOT the village pier, NO crowd, NOT the village finale (that is p13).` },
  { slug: "the-last-leaf-of-autumn", p: 2,
    char: "one stubborn red-gold leaf on a bare maple tree (same design as the cover)",
    s: `Cold late-autumn scene: the wind blows hard and the maple tree's branches are completely BARE — except near the VERY TOP, where ONE small red-gold leaf still holds on, trembling in the cold wind; grey chilly sky, a few leaves swirling away. STRICT: exactly ONE leaf left on the bare tree, near the top. NO boy, NO glass jars, NO bottles, NO hill with bottles (that is a different book).` },
  { slug: "the-last-leaf-of-autumn", p: 4,
    char: "one stubborn red-gold leaf on a bare maple tree; a small squirrel (same design as the cover)",
    s: `Bright cold morning: a small bushy-tailed SQUIRREL sits on a bare branch of the tree, looking UP at the one red-gold leaf still holding on near the top and laughing in cheerful surprise — it said the leaf would fall by night, yet morning came and the leaf is still there. STRICT: the squirrel looks UP at the single remaining leaf, amused happy expression; must be visually DISTINCT from p5 (NO ladybug, not an evening frost scene).` },
  { slug: "the-last-leaf-of-autumn", p: 7,
    char: "a small lost bird flying alone (the leaf's book: one red-gold leaf on a bare tree)",
    s: `High aerial winter view: a small LOST bird flies alone over wide WHITE snow-covered quiet fields stretching to the horizon — she has no path to follow and no place she knows; cold pale sky, lonely searching mood, the bird small against the vast white landscape. STRICT: lost/searching mood over snowy white fields; must be visually DISTINCT from p8 — the red leaf and the tree are NOT visible yet in this scene.` },
  { slug: "the-lighthouse-keepers-promise", p: 6,
    char: "Elias: an old kind lighthouse keeper; a tall red-and-white striped lighthouse by the sea (same design as the cover)",
    s: `Storm night just after lightning shattered the great lamp: the TOP of the tall striped lighthouse is DARK — no beam, the lamp room unlit — and inside, old keeper Elias stands shocked with his heart sinking, then sets his jaw with quiet determination, whispering that he made a promise and will keep it tonight; rain lashes the windows. STRICT: the lighthouse BEAM IS OFF — the lamp room is dark and broken, NO light beam in the sky.` },
  { slug: "the-lighthouse-keepers-promise", p: 9,
    char: "Elias's tall red-and-white striped lighthouse on the cliff; a small fishing boat with frightened young sailors",
    s: `Far out on the BLACK stormy night water: lost, frightened young sailors on a small fishing boat search the dark horizon for any sign of hope — and on the distant cliff the lighthouse TOWER TOP stays completely DARK, with only ONE tiny warm golden LANTERN glow in a small window near its base. STRICT: NO giant rotating beam — the lamp room is dark; only a tiny golden window glow; rough black sea, rain.` },
  { slug: "the-lighthouse-keepers-promise", p: 10,
    char: "Elias's tall red-and-white striped lighthouse on the cliff; a small fishing boat with young sailors",
    s: `Hopeful night turn: through the rain the sailors spot the TINY GOLDEN GLOW shining bravely from the lighthouse window — they shout with joy and TURN their small fishing boat toward that little light; the dark cliff and tower silhouette ahead, the small warm glow their only guide. STRICT: the lighthouse beam is OFF (dark lamp room) — ONLY the small golden window glow; the boat is visibly turning toward it.` },
  { slug: "the-river-that-changed-its-mind", p: 1,
    char: "a winding gentle river; a cozy village along its banks (same design as the cover)",
    s: `Peaceful opening landscape: the wide gentle river curves past the small village houses like a SHINING BLUE RIBBON, as it has for a hundred years — calm sunny day, willows and rooftops along the banks, full of quiet harmony; wide scenic view. STRICT: NO greenhouse, NO grandmother planting pots, NO glass building (that is a different book) — only the river and the village landscape.` },
  { slug: "the-river-that-changed-its-mind", p: 7,
    char: "an old grey-haired village woman; village children; the dry riverbed (same art style as the cover)",
    s: `By the DRY empty riverbed: a kind OLD woman with grey hair smiles gently and shakes her head, comforting the worried village children gathered around her — a river does not leave, she tells them, it only looks for a new way; cracked dry stones where water used to flow. STRICT: the riverbed is completely DRY — NO flowing water in the channel; warm reassuring mood despite the dry river.` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw3]`;
  const prompt = `${STYLE}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${NEG}\n${salt}`;
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

console.log(`🖼️ 그림책 QA wave 3 확정 ${T.length}컷 격리 재생성 (conc=1)`);
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
console.log("REGEN_SB_W3_DONE");
