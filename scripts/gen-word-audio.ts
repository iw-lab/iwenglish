/**
 * 모든 책의 "본문 단어 전체"에 Edge TTS 발음 mp3 생성(공용 _words 폴더, dedup).
 * 사전 핵심단어뿐 아니라 the/among/to 같은 기능어까지 → 단어 탭 시 항상 Edge 음성(할아버지 폴백 제거).
 * 문장 음성/정렬은 건드리지 않음(OpenAI 그대로). Edge 무료라 비용 0.
 *
 *   pnpm seed:words            전체
 *   EDGE_TTS_VOICE=en-US-AnaNeural pnpm seed:words
 */
import "./_env";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

import { tokenizeWords, normalizeWord, wordAudioBase } from "@/lib/utils";

const SEED_DIR = join(process.cwd(), "data", "seed");
const SHARED = join(process.cwd(), "public", "seed", "_words");
const EDGE_VOICE = process.env.EDGE_TTS_VOICE || "en-US-JennyNeural";

interface SeedBook {
  pages: { sentences: { text: string }[] }[];
}

function edgeSynth(text: string, mp3: string) {
  execFileSync(
    "uvx",
    ["edge-tts", "--voice", EDGE_VOICE, "--text", text, "--write-media", mp3],
    { stdio: "pipe", timeout: 60000 },
  );
}

function main() {
  mkdirSync(SHARED, { recursive: true });
  // base → 대표 단어(소문자 정규화). 책 전체에서 수집·dedup
  const words = new Map<string, string>();
  for (const f of readdirSync(SEED_DIR).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
    const b = JSON.parse(readFileSync(join(SEED_DIR, f), "utf8")) as SeedBook;
    for (const p of b.pages)
      for (const s of p.sentences)
        for (const t of tokenizeWords(s.text)) {
          const w = normalizeWord(t.word);
          if (!w) continue;
          const base = wordAudioBase(w);
          if (base && !words.has(base)) words.set(base, w);
        }
  }

  console.log(`🔤 고유 단어 ${words.size}개 — Edge(${EDGE_VOICE}) 생성 시작`);
  let made = 0;
  let reused = 0;
  const failedWords: string[] = [];
  for (const [base, w] of words) {
    const mp3 = join(SHARED, base + ".mp3");
    if (existsSync(mp3)) {
      if (statSync(mp3).size > 0) {
        reused++;
        continue;
      }
      rmSync(mp3, { force: true }); // 0바이트 파일 → 삭제 후 재생성
    }
    // 실패/0바이트 산출물은 삭제 후 1회 재시도
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        edgeSynth(w, mp3);
        if (existsSync(mp3) && statSync(mp3).size > 0) ok = true;
        else rmSync(mp3, { force: true });
      } catch {
        rmSync(mp3, { force: true });
      }
    }
    if (ok) {
      made++;
      if (made % 20 === 0)
        process.stdout.write(`\r  신규 ${made} · 재사용 ${reused}…`);
    } else {
      failedWords.push(w);
    }
  }
  console.log(
    `\n✅ 단어 발음 — 신규 ${made} · 재사용 ${reused} · 실패 ${failedWords.length} (총 ${words.size})`,
  );
  if (failedWords.length > 0)
    console.warn(`⚠️ 실패 단어(재실행 시 자동 재시도): ${failedWords.join(", ")}`);
}

main();
