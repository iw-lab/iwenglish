/**
 * 그림책(픽션) 시각 QA 확정 불량컷 격리 재생성 — wave 2 (2026-06-12, 37컷/19권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/<anchor || cover.png> (캐릭터 일관성). T 항목별 anchor 필드로
 * 다른 페이지 레퍼런스 지정 가능(예: the-bakers-tiny-helper p5~p10 → p2.png의 백발 노인 앵커).
 * 메인 생성기 완주 후에만 실행할 것. 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes-w2.mjs
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

// QA wave 2 적대검증 확정 37컷. s = 교정 장면 + 컷별 금지사항. anchor(선택) = 레퍼런스 파일명(기본 cover.png).
const T = [
  { slug: "bear-builds-a-chair", p: 1,
    char: "Boro: a small brown bear (same design as the cover)",
    s: `Boro the bear stands under his favorite leafy reading tree, gazing at the EMPTY ground beside the trunk and dreamily imagining a chair he wants for reading there (a book under his arm, thoughtful hopeful face). STRICT: NO finished chair anywhere in the image — the spot under the tree is empty; NOT the same composition as p7 (no bear sitting on a chair).` },
  { slug: "captain-otters-river-map", p: 9,
    char: "a cheerful otter wearing a tiny captain's hat, on a little raft",
    s: `On the little raft near a riverside cave, Captain Otter marks the cave on his nearly-finished river map while his friends — a FROG, a TURTLE and a small BAT — gather around the map; the otter thanks them and everyone looks proud. STRICT: the friends are ONLY a frog, a turtle and a bat — NO beaver, NO kingfisher, NO other animals.` },
  { slug: "fox-finds-a-scarf", p: 1,
    char: "Finn: a young orange fox (same design as the cover, but WITHOUT the scarf)",
    s: `Finn the young orange fox walks alone along a quiet snowy woodland path between snow-covered trees, soft snow falling, curious calm opening scene. STRICT: NO scarf anywhere in the image — Finn has a bare neck; NOT the cover composition.` },
  { slug: "fox-finds-a-scarf", p: 8,
    char: "Finn: a young orange fox (same design as the cover, but WITHOUT the scarf)",
    s: `Warm sunset over the snowy woods: Finn the fox stands in the glowing evening snow smiling contentedly, feeling warm inside even without a scarf; in the background a small rabbit happily wearing the striped scarf may be seen. STRICT: Finn the fox wears NO scarf — his neck is bare; only the background rabbit may wear the scarf.` },
  { slug: "llama-loses-a-button", p: 7,
    char: "Lulu: a fluffy white llama wearing a red vest",
    s: `Close-up outdoors on a sunny green grass meadow: Lulu the fluffy white llama joyfully finds her lost BLUE button lying in the grass and reaches to pick it up, relieved happy face. STRICT: the button is BLUE (NOT brown); the scene is OUTDOORS on grass (NOT an indoor rug, NO room interior).` },
  { slug: "morning-rainbow-smiles", p: 6,
    char: "a soft rainbow with a gentle smiling face",
    s: `A big friendly close-up of the soft morning rainbow itself smiling warmly across a bright sky, gentle face on the rainbow arc, joyful glowing finale mood. STRICT: composition must be DIFFERENT from p4 — NOT a window view, NO window frame; the smiling rainbow is the clear single subject.` },
  { slug: "owls-night-school", p: 6,
    char: "a wise owl teacher with glasses; a small shy bat",
    s: `Night forest classroom: the small shy BAT crouches on a tree stump with his wings tucked tightly against his body, eyes wide and afraid, whispering nervously — he is scared to glide. The owl teacher and other night animals watch kindly from the side. STRICT: the bat is NOT flying — he stays huddled on the stump; this page must be visually DISTINCT from p7 (no gliding, no wind-riding).` },
  { slug: "pink-cupcake-day", p: 3,
    char: "a pink cupcake with white cream and one cherry",
    s: `Extreme MACRO close-up of the pink cupcake focusing on the single shiny RED CHERRY sitting on top of the white cream swirl, soft warm light. STRICT: camera distance must be clearly DIFFERENT from p2 — much closer, cherry-focused; exactly ONE cherry.` },
  { slug: "pink-cupcake-day", p: 4,
    char: "a pink cupcake with white cream and one cherry",
    s: `Two happy young children sit side by side at a cozy table, sharing and eating pink cupcakes together, smiling at each other — warm friendship moment ("my friend sits with me"). STRICT: exactly TWO children sitting TOGETHER at the table; the cupcakes match the book's pink cupcake design.` },
  { slug: "silver-bell-rings", p: 2,
    char: "a small silver bell with a blue ribbon",
    s: `Close-up on the small silver bell seen from a NEW ANGLE, focusing on its pretty BLUE RIBBON tied in a bow — the ribbon is the visual focus, soft gentle light. STRICT: NOT a centered frontal composition like p1 — use a side/tilted angle or ribbon-detail crop; exactly one bell.` },
  { slug: "sleepy-little-train", p: 2,
    char: "a small sleepy green toy train",
    s: `SIDE-VIEW action angle: the small sleepy green toy train rolls along its track going "chug, chug", with soft round STEAM PUFFS rising from its chimney and wheels in motion, gentle sense of movement. STRICT: composition must be clearly DIFFERENT from p1 — side travelling angle, emphasized steam puffs, NO text or letters.` },
  { slug: "the-bakers-tiny-helper", p: 3,
    char: "a tidy little mouse; a warm bakery at night",
    s: `Night bakery interior after the old baker went home: the room is MESSY — white flour is scattered and spilled all over the wooden FLOOR, bowls and tools left out — and the tiny mouse cautiously creeps out of its small mouse hole in the wall, whiskers twitching. STRICT: the bakery is NOT tidy — flour clearly scattered ON THE FLOOR; NO baker present in this scene.` },
  { slug: "the-bakers-tiny-helper", p: 5, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `Bright morning: the OLD white-haired baker opens the bakery door and stops in amazement — the whole bakery is perfectly CLEAN and tidy, loaves lined up neatly, floor spotless; he looks around in happy surprise. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference; the bakery is clean.` },
  { slug: "the-bakers-tiny-helper", p: 6, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `Inside the tidy bakery, the OLD white-haired baker scratches his head and looks around softly puzzled, asking aloud who helped him — but no one is there; the empty clean bakery around him. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference; the mouse stays hidden (at most a tiny unseen peek from its hole).` },
  { slug: "the-bakers-tiny-helper", p: 7, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `Evening in the bakery: the OLD white-haired baker stands thoughtful with a curious wondering expression, determined to find out who his secret helper is, while the tiny mouse peeks out from its hole behind him unnoticed. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference.` },
  { slug: "the-bakers-tiny-helper", p: 8, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `Night bakery: the OLD white-haired baker HIDES behind a big sack of flour, peeking out quietly, and discovers the tiny mouse sweeping the floor with a tiny broom in the soft lamplight. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference; the mouse is sweeping the FLOOR.` },
  { slug: "the-bakers-tiny-helper", p: 9, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `The OLD white-haired baker smiles warmly and places a small piece of CHEESE on the floor for the tiny mouse, who nibbles it happily and gratefully — gentle thankful moment. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference.` },
  { slug: "the-bakers-tiny-helper", p: 10, anchor: "p2.png",
    char: "an OLD baker with WHITE hair (same man as p2: same hat and apron); a tidy little mouse",
    s: `Cozy final scene: the OLD white-haired baker and the tiny mouse share the quiet warm bakery together as good friends — the baker works at his table while the mouse sits near him, both content. STRICT: the baker is an OLD man with WHITE hair (NOT young, NOT brown hair), same hat/apron as the reference.` },
  { slug: "the-clockmakers-cat", p: 4,
    char: "a calm grey cat in an old clock shop full of clocks",
    s: `The tall GRANDFATHER CLOCK standing BY THE DOOR has STOPPED — its pendulum hangs perfectly still, its hands frozen — and the calm grey cat stares up at it, ears alert, the room feeling strangely quiet. Same clock as p3. STRICT: a TALL grandfather clock standing BY THE DOOR (NOT a small mantel clock, NOT a wall clock); pendulum visibly still.` },
  { slug: "the-clockmakers-cat", p: 7,
    char: "a calm grey cat in an old clock shop full of clocks",
    s: `The back panel of the tall grandfather clock is OPEN and the calm grey cat peers INSIDE at many small brass GEARS — one gear clearly stuck and not moving; warm lamplight glints on the brass. STRICT: the gears are INSIDE the clock's open case (NOT in a separate wooden box, NOT scattered on a table).` },
  { slug: "the-firefly-festival", p: 2,
    char: "a small rabbit",
    s: `Dusky riverside in early evening light: the small rabbit hops to the river bank and sits on the grass, waiting eagerly so she will not be late — quiet, expectant, before-the-festival mood, sky still holding fading light. STRICT: at most ONE faint firefly in the whole image (NO swarm of fireflies yet); dusk, not yet fully dark.` },
  { slug: "the-firefly-festival", p: 10,
    char: "a small rabbit holding a lit paper lantern; many fireflies",
    s: `Night riverside finale: the small rabbit lifts her glowing PAPER LANTERN high (the same lantern as p9), and the fireflies float CLOSER, gathering around her warm glow — she is now part of the festival, magical golden lights over the dark river. STRICT: the rabbit holds the same lit paper lantern as p9; fireflies drift toward her light.` },
  { slug: "the-fox-and-the-bridge", p: 6,
    char: "a clever orange fox; small forest animals",
    s: `Riverbank with NO bridge: a heavy LOG lies on the ground with ROPES tied around it, too heavy to lift, and the clever orange fox calls out to TWO strong large BIRDS flying down to help. STRICT: NO existing or finished bridge anywhere over the river; exactly TWO large birds.` },
  { slug: "the-fox-and-the-bridge", p: 7,
    char: "a clever orange fox; small forest animals",
    s: `The same TWO strong large BIRDS from p6 grip the ropes and pull the heavy LOG up high into the air, carrying it over the river, while three little mice push helpfully from below and the fox watches; teamwork in action. STRICT: exactly TWO large birds lifting with ropes (NOT three sparrows); NO pre-existing bridge over the river — the log is still in the air.` },
  { slug: "the-fox-and-the-bridge", p: 9,
    char: "a clever orange fox; small forest animals",
    s: `The clever orange fox walks slowly and happily across the new SINGLE LOG bridge lying over the river (the same plain log as p8), while his small animal friends run toward him from the far bank to hug him. STRICT: the bridge is ONE single plain LOG (NO railings, NOT a built wooden footbridge with planks).` },
  { slug: "the-garden-detective", p: 8,
    char: "Pip: a small mouse detective with a magnifying glass and notebook",
    s: `In the STRAWBERRY patch, a small brown SPARROW stands before Pip the mouse detective with her head bowed, apologizing — she was hungry and the berries smelled sweet; Pip listens with his notebook. STRICT: the bird is a SPARROW (small brown bird) and she IS present; ripe red STRAWBERRIES on low plants (NOT blackberries, NO berry bushes).` },
  { slug: "the-garden-detective", p: 9,
    char: "Pip: a small mouse detective with a magnifying glass and notebook",
    s: `Pip the mouse detective smiles warmly and reaches out a gentle paw to the small brown SPARROW — reconciliation: next time just ask, and we can share; sunny garden, kind forgiving mood. STRICT: the other character is a SPARROW, a small brown BIRD with wings and a beak (NOT a rodent, NOT a mouse).` },
  { slug: "the-moon-cookie", p: 7,
    char: "a round golden cookie shaped like the moon; Mina, a young child",
    s: `Around a cozy table, the big golden moon cookie has been cut into EXACTLY FOUR wedge pieces, and FOUR people (Mina, her family/friends) each hold ONE wedge, smiling — everyone has a piece of the moon. STRICT: exactly 4 wedge pieces total, one per person; NO whole uncut cookie anywhere, NO extra pieces on the table.` },
  { slug: "the-moon-cookie", p: 8,
    char: "Mina, a young child; a golden moon-cookie wedge",
    s: `Warm close-up: the young child Mina holds ONE golden moon-cookie WEDGE in her small hands, taking a happy bite, eyes bright — sharing made it taste brighter. STRICT: the hands are a CHILD's small hands (NOT adult hands); exactly ONE wedge piece in the image, NO whole cookie.` },
  { slug: "the-runaway-kite", p: 6,
    char: "a bright kite with a long tail; an OLD man with WHITE hair (same man as p5)",
    s: `The kind OLD white-haired man from p5 stands up high and uses a LONG BROOM to gently push the bright kite down from the low ROOFTOP where it landed, smiling kindly; the child waits below with open arms. STRICT: the helper is an OLD man with WHITE hair (same as p5, NOT young); the kite is on a ROOF being pushed down with a long broom (NOT in a tree — the tree scene is p7).` },
  { slug: "the-runaway-kite", p: 8,
    char: "a bright kite with a long tail; Mina, a girl in a yellow dotted dress",
    s: `Three-person scene under a leafy tree: a TALL BOY up in the tree gently shakes the branch, the bright kite falls, and his LITTLE SISTER in a PURPLE top catches it with delight, while Mina in her YELLOW DOTTED dress stands beside them watching happily. STRICT: the catcher is the LITTLE SISTER wearing a purple top (NOT Mina); Mina (yellow dotted dress) only stands beside and watches.` },
  { slug: "the-small-broom", p: 7,
    char: "a small straw broom with a red handle",
    s: `Hero shot: the small straw broom with its red handle stands STRAIGHT and tall, alone in the middle of a perfectly CLEAN sunlit floor — proud, accomplished mood, soft warm light around it. STRICT: the floor is completely CLEAN (NO rubbish, NO dust piles); visually DISTINCT from p3 — the broom stands proudly alone.` },
  { slug: "the-snow-lantern", p: 1,
    char: "two children: Mina and her little brother Joon, in cozy winter clothes",
    s: `Snow falls softly on a quiet evening street: Mina and her little brother Joon play happily in the fresh snow in their cozy winter clothes — opening scene, gentle excitement. STRICT: NO lantern and NO candle anywhere in the image; just children playing in falling snow.` },
  { slug: "the-snow-lantern", p: 2,
    char: "two children: Mina and her little brother Joon, in cozy winter clothes",
    s: `On the snowy street, Mina leans toward Joon with sparkling eyes, sharing her idea to make something special tonight; Joon smiles back, excited — planning moment, hands gesturing, nothing built yet. STRICT: NO finished lantern, NO lit candle, NO glowing object anywhere — only the two children talking in the snow.` },
  { slug: "the-snow-lantern", p: 3,
    char: "two children: Mina and her little brother Joon, in cozy winter clothes",
    s: `Mina and Joon kneel in the snow PACKING cold snow with their hands into a small round shape, just beginning to build — red cold hands, determined happy faces, loose snow around them. STRICT: the snow shape is UNFINISHED and under construction; NOT lit, NO candle, NO flame anywhere.` },
  { slug: "the-snow-lantern", p: 4,
    char: "two children: Mina and her little brother Joon, in cozy winter clothes",
    s: `The packed snow has become a small round snow lantern dome, and Joon carefully makes a tiny DOOR opening in the front; Mina watches proudly — but the lantern is still EMPTY and dark inside. STRICT: the snow dome is NOT lit — NO candle and NO flame yet (the candle goes in only at p5); dark unlit opening.` },
  { slug: "the-windmill-friend", p: 5,
    char: "an old friendly windmill; Mira, a village girl with braids and a skirt (same design as p4)",
    s: `On the warm lazy hill where nothing moves, MIRA the village girl with BRAIDS cups her hands around her mouth and calls out loudly to all her friends for help, the still old windmill behind her. STRICT: the caller is MIRA, a GIRL with braids and a skirt (same look as p4 — NOT a boy); the windmill sails are still, no wind.` },
  { slug: "the-windmill-friend", p: 10,
    char: "an old friendly windmill with turning sails; Mira, a village girl with braids and a skirt (same design as p4)",
    s: `Joyful finale: MIRA the girl with braids hugs the base of the old windmill as its sails turn and creak a happy song, while the villagers and children around them CHEER with raised arms. STRICT: the one hugging the windmill is MIRA — a GIRL with braids and a skirt (NOT a boy); windmill sails turning, celebrating crowd.` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw2]`;
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

console.log(`🖼️ 그림책 QA wave 2 확정 ${T.length}컷 격리 재생성 (conc=1)`);
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
console.log("REGEN_SB_W2_DONE");
