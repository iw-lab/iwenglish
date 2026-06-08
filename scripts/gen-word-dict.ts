/**
 * 전 책 공유 사전 생성 → data/seed/_words.json
 * 모든 책의 모든 본문 단어(기능어 포함)에 뜻·IPA·예문(OpenAI) + 발음 mp3 경로.
 * 책별 수기 핵심단어는 그대로 두고, 여기엔 "전체"를 담아 런타임 조회("사전 찾는 중") 제거.
 * 이미 있는 단어는 건너뜀(resume). 비용: gpt-4o-mini 383개 ≈ 푼돈.
 *
 *   pnpm seed:worddict
 *   FORCE=1 pnpm seed:worddict   # 기존 항목도 다시 생성
 */
import "./_env";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  tokenizeWords,
  normalizeWord,
  wordAudioBase,
} from "@/lib/utils";
import { openaiWordMeaning } from "@/lib/openai";
import type { SeedWord } from "@/lib/data/staticBooks";

const SEED_DIR = join(process.cwd(), "data", "seed");
const SHARED_AUDIO = join(process.cwd(), "public", "seed", "_words");
const DICT_FILE = join(SEED_DIR, "_words.json");

interface SeedBook {
  pages: { sentences: { text: string }[] }[];
  words?: Record<string, SeedWord>;
}

function collectWords(): string[] {
  const set = new Set<string>();
  for (const f of readdirSync(SEED_DIR).filter(
    (x) => x.endsWith(".json") && !x.startsWith("_"),
  )) {
    const b = JSON.parse(readFileSync(join(SEED_DIR, f), "utf8")) as SeedBook;
    for (const p of b.pages)
      for (const s of p.sentences)
        for (const t of tokenizeWords(s.text)) {
          const w = normalizeWord(t.word);
          if (w) set.add(w);
        }
  }
  return [...set].sort();
}

async function main() {
  mkdirSync(SEED_DIR, { recursive: true });
  const force = process.env.FORCE === "1";
  const dict: Record<string, SeedWord> = existsSync(DICT_FILE)
    ? (JSON.parse(readFileSync(DICT_FILE, "utf8")) as Record<string, SeedWord>)
    : {};

  const all = collectWords();
  const todo = all.filter((w) => force || !dict[w]?.meaning_ko);
  console.log(
    `📖 공유 사전 — 전체 ${all.length} · 생성 대상 ${todo.length} · 보유 ${all.length - todo.length}`,
  );

  const CONC = 6;
  let done = 0;
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(async (w) => [w, await openaiWordMeaning(w)] as const),
    );
    for (const [w, m] of results) {
      const base = wordAudioBase(w);
      const audioUrl = existsSync(join(SHARED_AUDIO, `${base}.mp3`))
        ? `/seed/_words/${base}.mp3`
        : (dict[w]?.audioUrl ?? "");
      if (m) {
        dict[w] = {
          ipa: m.ipa,
          pos: m.pos,
          meaning_ko: m.meaning_ko,
          example_en: m.example_en,
          example_ko: m.example_ko,
          audioUrl,
        };
      } else if (dict[w]) {
        dict[w].audioUrl = audioUrl;
      }
      done++;
    }
    // 중간 저장(중단돼도 resume)
    writeFileSync(DICT_FILE, JSON.stringify(dict, null, 2));
    process.stdout.write(`\r  생성 ${done}/${todo.length}…`);
  }

  // 발음 경로는 항상 최신으로 보정(뜻 있던 항목 포함)
  for (const w of all) {
    if (!dict[w]) continue;
    const base = wordAudioBase(w);
    if (existsSync(join(SHARED_AUDIO, `${base}.mp3`)))
      dict[w].audioUrl = `/seed/_words/${base}.mp3`;
  }
  writeFileSync(DICT_FILE, JSON.stringify(dict, null, 2));
  console.log(
    `\n✅ 공유 사전 완료 — ${Object.keys(dict).length}개 → ${DICT_FILE}`,
  );
}

main();
