/**
 * 모든 책의 "본문 단어 전체"에 발음 mp3 생성(공용 _words 폴더, dedup).
 * 사전 핵심단어뿐 아니라 the/among/to 같은 기능어까지 → 단어 탭 시 항상 음성(할아버지 폴백 제거).
 * 문장 음성/정렬은 건드리지 않음.
 *
 * 엔진(TTS_ENGINE):
 *   openai(기본) — gpt-4o-mini-tts / nova. 출력물 소유권이 사용자에게 귀속(재배포 안전).
 *   edge         — Microsoft Edge TTS(무료). 비공식 엔드포인트라 대량 재배포는 회색지대.
 *
 *   pnpm seed:words                     전체(openai, 신규만)
 *   FORCE=1 pnpm seed:words             기존 파일까지 전량 재생성(엔진 전환 시)
 *   TTS_ENGINE=edge pnpm seed:words     Edge로 생성
 *   OUT=/tmp/x ONLY=lunch,borrow FORCE=1 pnpm seed:words   특정 단어만 임시폴더로(스모크 테스트)
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
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { tokenizeWords, normalizeWord, wordAudioBase } from "@/lib/utils";
import { openaiTTS } from "@/lib/openai";

const SEED_DIR = join(process.cwd(), "data", "seed");
const SHARED = process.env.OUT || join(process.cwd(), "public", "seed", "_words");
const ENGINE = (process.env.TTS_ENGINE || "openai").toLowerCase(); // openai | edge
const EDGE_VOICE = process.env.EDGE_TTS_VOICE || "en-US-JennyNeural";
const OPENAI_VOICE = process.env.OPENAI_TTS_VOICE || "nova";
const OPENAI_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const FORCE = process.env.FORCE === "1";
const CONC = Number(process.env.CONC || (ENGINE === "openai" ? 6 : 1));
const ONLY = process.env.ONLY
  ? new Set(process.env.ONLY.split(",").map((s) => s.trim()))
  : null;

interface SeedBook {
  pages: { sentences: { text: string }[] }[];
}

function edgeSynth(text: string, mp3: string): boolean {
  try {
    execFileSync(
      "uvx",
      ["edge-tts", "--voice", EDGE_VOICE, "--text", text, "--write-media", mp3],
      { stdio: "pipe", timeout: 60000 },
    );
    return existsSync(mp3) && statSync(mp3).size > 0;
  } catch {
    rmSync(mp3, { force: true });
    return false;
  }
}

async function openaiSynth(text: string, mp3: string): Promise<boolean> {
  const buf = await openaiTTS(text, OPENAI_VOICE, OPENAI_MODEL);
  if (!buf || buf.length === 0) {
    rmSync(mp3, { force: true });
    return false;
  }
  writeFileSync(mp3, buf);
  return true;
}

async function synth(text: string, mp3: string): Promise<boolean> {
  return ENGINE === "openai" ? openaiSynth(text, mp3) : edgeSynth(text, mp3);
}

async function runPool<T>(
  items: T[],
  worker: (t: T) => Promise<void>,
  conc: number,
): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, conc) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await worker(items[idx]);
      }
    }),
  );
}

async function main() {
  mkdirSync(SHARED, { recursive: true });
  // base → 대표 단어(소문자 정규화). 책 전체에서 수집·dedup
  const words = new Map<string, string>();
  for (const f of readdirSync(SEED_DIR).filter(
    (x) => x.endsWith(".json") && !x.startsWith("_"),
  )) {
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

  // 생성 대상 선별(재사용/스킵). 엔진 전환 시 FORCE=1로 기존 파일까지 재생성.
  let reused = 0;
  const todo: { base: string; w: string; mp3: string }[] = [];
  for (const [base, w] of words) {
    if (ONLY && !ONLY.has(base)) continue;
    const mp3 = join(SHARED, base + ".mp3");
    if (!FORCE && existsSync(mp3) && statSync(mp3).size > 0) {
      reused++;
      continue;
    }
    todo.push({ base, w, mp3 });
  }

  const voiceLabel =
    ENGINE === "openai"
      ? `OpenAI ${OPENAI_MODEL}/${OPENAI_VOICE}`
      : `Edge ${EDGE_VOICE}`;
  console.log(
    `🔤 고유 단어 ${words.size}개 · 생성대상 ${todo.length} · 재사용 ${reused} — ${voiceLabel}, 동시성 ${CONC}${FORCE ? " (FORCE)" : ""}`,
  );

  let made = 0;
  const failedWords: string[] = [];
  await runPool(
    todo,
    async ({ w, mp3 }) => {
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        ok = await synth(w, mp3);
      }
      if (ok) {
        made++;
        if (made % 20 === 0)
          process.stdout.write(`\r  신규 ${made}/${todo.length}…`);
      } else {
        failedWords.push(w);
      }
    },
    CONC,
  );

  console.log(
    `\n✅ 단어 발음 — 신규 ${made} · 재사용 ${reused} · 실패 ${failedWords.length} (총 ${words.size})`,
  );
  if (failedWords.length > 0)
    console.warn(`⚠️ 실패 단어(재실행 시 자동 재시도): ${failedWords.join(", ")}`);
}

main();
