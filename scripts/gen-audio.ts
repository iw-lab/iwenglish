/**
 * 문장별 음성 1회 생성 → public/seed/{slug}/audio/* + 정확한 카라오케 타이밍.
 *   ① TTS 엔진: Edge TTS(무료·기본) 또는 Gemini TTS(유료·고품질)
 *   ② faster-whisper 로 음성에서 단어별 실제 타임스탬프 추출(강제정렬) → 완벽 동기화
 *   ③ 실패 시 음절 기반 추정으로 폴백
 * 재생은 정적 파일이라 추가 비용 0.
 *
 *  실행:  pnpm seed:audio [slug]
 *         TTS_ENGINE=gemini GEMINI_TTS_VOICE=Kore pnpm seed:audio luna-and-the-lost-star
 *         EDGE_TTS_VOICE=en-US-AnaNeural pnpm seed:audio
 *  필요: python + uv (edge-tts, faster-whisper). Gemini 엔진은 GEMINI_API_KEY.
 */
import "./_env";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { estimateWordTimings, pcmToWav, pcmDurationMs } from "@/lib/audio/wav";
import { tokenizeWords } from "@/lib/utils";
import { geminiTTS, cloudTTS } from "@/lib/gemini";
import { openaiTTS, openaiTranscribeWords } from "@/lib/openai";
import type { WordTiming } from "@/types/book";

const SEED_DIR = join(process.cwd(), "data", "seed");
const PUBLIC_DIR = join(process.cwd(), "public");
const SCRIPTS = join(process.cwd(), "scripts");
const ENGINE = (process.env.TTS_ENGINE || "openai").toLowerCase(); // openai | cloud | gemini | edge
const EDGE_VOICE = process.env.EDGE_TTS_VOICE || "en-US-JennyNeural";
const GEMINI_VOICE = process.env.GEMINI_TTS_VOICE || "Kore";
const GEMINI_THROTTLE_MS = Number(process.env.GEMINI_THROTTLE_MS || 6500); // preview 10/분 대응
const CLOUD_VOICE = process.env.CLOUD_TTS_VOICE || "en-US-Chirp3-HD-Kore"; // GA, 일일 캡 없음
const CLOUD_THROTTLE_MS = Number(process.env.CLOUD_THROTTLE_MS || 250);
const OPENAI_VOICE = process.env.OPENAI_TTS_VOICE || "nova";
const OPENAI_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_THROTTLE_MS = Number(process.env.OPENAI_THROTTLE_MS || 200);
const LEAD_SHIFT = 40;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Sentence {
  text: string;
  translation_ko: string;
  audio?: string;
  wordTimings?: WordTiming[];
}
interface SeedBook {
  slug: string;
  title: string;
  pages: { sentences: Sentence[] }[];
  words?: Record<string, { audioUrl?: string }>;
}
interface WhisperWord {
  word: string;
  startMs: number;
  endMs: number;
}

function vttDurationMs(vtt: string): number {
  const re = /-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g;
  let m: RegExpExecArray | null;
  let max = 0;
  while ((m = re.exec(vtt)) !== null) {
    const ms = +m[1] * 3600000 + +m[2] * 60000 + +m[3] * 1000 + +m[4];
    if (ms > max) max = ms;
  }
  return max || 1500;
}

/** 합성 → {ext, dur}. 파일은 absBase+ext 로 저장 */
async function synth(
  text: string,
  absBase: string,
): Promise<{ ext: string; dur: number }> {
  if (ENGINE === "openai") {
    await sleep(OPENAI_THROTTLE_MS);
    const mp3 = await openaiTTS(text, OPENAI_VOICE, OPENAI_MODEL);
    if (mp3) {
      writeFileSync(absBase + ".mp3", mp3);
      return { ext: ".mp3", dur: Math.max(900, text.length * 60) };
    }
    process.stdout.write(" [Edge폴백]");
    return { ext: ".mp3", dur: edgeSynth(text, absBase + ".mp3") };
  }
  if (ENGINE === "cloud") {
    await sleep(CLOUD_THROTTLE_MS);
    const mp3 = await cloudTTS(text, CLOUD_VOICE);
    if (mp3) {
      writeFileSync(absBase + ".mp3", mp3);
      // mp3 길이는 whisper/추정으로 보정 — vtt 없으니 임시값(아래 정렬 단계가 덮어씀)
      return { ext: ".mp3", dur: Math.max(900, text.length * 60) };
    }
    process.stdout.write(" [Edge폴백]");
    return { ext: ".mp3", dur: edgeSynth(text, absBase + ".mp3") };
  }
  if (ENGINE === "gemini") {
    await sleep(GEMINI_THROTTLE_MS); // 분당 10회 제한 준수
    const pcm = await geminiTTS(text, GEMINI_VOICE);
    if (pcm) {
      writeFileSync(absBase + ".wav", pcmToWav(pcm, 24000));
      return { ext: ".wav", dur: pcmDurationMs(pcm, 24000) };
    }
    // Gemini 실패(한도/오류) → Edge 폴백 (전 책 완성 보장)
    process.stdout.write(" [Edge폴백]");
    return { ext: ".mp3", dur: edgeSynth(text, absBase + ".mp3") };
  }
  return { ext: ".mp3", dur: edgeSynth(text, absBase + ".mp3") };
}

/** Edge TTS → mp3 저장, 길이(ms) 반환 */
function edgeSynth(text: string, mp3: string): number {
  const vtt = join(tmpdir(), `et-${mp3.replace(/\W/g, "")}.vtt`);
  execFileSync(
    "uvx",
    ["edge-tts", "--voice", EDGE_VOICE, "--text", text, "--write-media", mp3, "--write-subtitles", vtt],
    { stdio: "pipe", timeout: 60000 },
  );
  let dur = 1500;
  try {
    dur = vttDurationMs(readFileSync(vtt, "utf8"));
    rmSync(vtt, { force: true });
  } catch {
    /* default */
  }
  return dur;
}

function whisperAlign(paths: string[]): Map<string, WhisperWord[]> {
  const map = new Map<string, WhisperWord[]>();
  if (paths.length === 0 || process.env.SKIP_WHISPER === "1") return map; // 추정 타이밍 사용
  // 검증된 방식: printf 로 경로를 파이프 → uv run (execFileSync input 교착 회피)
  const script = join(SCRIPTS, "whisper_align.py");
  const quoted = paths.map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(" ");
  try {
    const out = execFileSync(
      "bash",
      [
        "-c",
        `printf '%s\\n' ${quoted} | uv run --with faster-whisper python3 ${JSON.stringify(script)}`,
      ],
      {
        encoding: "utf8",
        timeout: 600000,
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    for (const line of out.split("\n")) {
      const s = line.trim();
      if (!s) continue;
      try {
        const obj = JSON.parse(s) as { path: string; words: WhisperWord[] };
        map.set(obj.path, obj.words);
      } catch {
        /* skip */
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Whisper 정렬 실패(추정 폴백): ${(e as Error).message}`);
  }
  return map;
}

/** OpenAI 전사로 단어 정렬 (같은 OpenAI TTS 음성에 최적). 동시성 제한 */
async function openaiAlign(paths: string[]): Promise<Map<string, WhisperWord[]>> {
  const map = new Map<string, WhisperWord[]>();
  const CONC = 4;
  for (let i = 0; i < paths.length; i += CONC) {
    const batch = paths.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(async (p) => [p, await openaiTranscribeWords(p)] as const),
    );
    for (const [p, words] of results) if (words) map.set(p, words);
  }
  return map;
}

function alignToTokens(text: string, words: WhisperWord[]): WordTiming[] | null {
  const tokens = tokenizeWords(text);
  if (words.length !== tokens.length) return null;
  return tokens.map((t, i) => ({
    word: t.word,
    charStart: t.charStart,
    charEnd: t.charEnd,
    startMs: Math.max(0, words[i].startMs - LEAD_SHIFT),
    endMs: Math.max(0, words[i].endMs - LEAD_SHIFT),
  }));
}

async function processBook(file: string) {
  const path = join(SEED_DIR, file);
  const book = JSON.parse(readFileSync(path, "utf8")) as SeedBook;
  const audioDir = join(PUBLIC_DIR, "seed", book.slug, "audio");
  mkdirSync(audioDir, { recursive: true });

  const voiceLabel =
    ENGINE === "openai"
      ? `OpenAI:${OPENAI_VOICE}`
      : ENGINE === "cloud"
        ? `CloudTTS:${CLOUD_VOICE}`
        : ENGINE === "gemini"
          ? `Gemini:${GEMINI_VOICE}`
          : `Edge:${EDGE_VOICE}`;
  console.log(`\n🔊 ${book.title} (${voiceLabel})`);

  // ① 음성
  // AUDIO_SKIP_EXISTING=1 : 이미 mp3+타이밍이 있는 문장은 보존(추가 페이지만 생성 → 기존 책 churn·재정렬 방지)
  const SKIP_EXISTING = process.env.AUDIO_SKIP_EXISTING === "1";
  const items: { s: Sentence; abs: string; dur: number }[] = [];
  let total = 0;
  let kept = 0;
  for (let pi = 0; pi < book.pages.length; pi++) {
    const sents = book.pages[pi].sentences;
    for (let si = 0; si < sents.length; si++) {
      total++;
      const s = sents[si];
      const base = `p${pi + 1}-s${si + 1}`;
      const mp3Abs = join(audioDir, base + ".mp3");
      if (SKIP_EXISTING && existsSync(mp3Abs) && (s.wordTimings?.length ?? 0) > 0) {
        s.audio = `/seed/${book.slug}/audio/${base}.mp3`;
        kept++;
        continue;
      }
      try {
        const { ext, dur } = await synth(s.text, join(audioDir, base));
        s.audio = `/seed/${book.slug}/audio/${base}${ext}`;
        items.push({ s, abs: join(audioDir, base + ext), dur });
        process.stdout.write(`\r  음성 ${items.length}/${total}…`);
      } catch (e) {
        console.log(`\n  ⚠️ 음성 실패: "${s.text.slice(0, 24)}…" ${(e as Error).message}`);
      }
    }
  }
  if (kept) console.log(`  ↩︎ 기존 음성 ${kept}문장 보존 · 신규 ${items.length}문장 생성`);

  // ② 단어 정렬 — OpenAI 전사 우선(같은 TTS라 싱크 정확), 실패분만 로컬 whisper, 그래도 안되면 추정
  const useOpenaiAlign =
    (process.env.ALIGN_ENGINE || (ENGINE === "openai" ? "openai" : "whisper")) ===
      "openai" && Boolean(process.env.OPENAI_API_KEY);

  let oaMap = new Map<string, WhisperWord[]>();
  if (useOpenaiAlign) {
    console.log(`\n  🎯 OpenAI 전사 정렬 중… (${items.length}문장)`);
    oaMap = await openaiAlign(items.map((it) => it.abs));
  }

  // OpenAI로 토큰수까지 맞은 것 제외한 나머지만 로컬 whisper
  const needLocal = items.filter((it) => {
    const w = oaMap.get(it.abs);
    return !(w && alignToTokens(it.s.text, w));
  });
  if (needLocal.length) {
    console.log(`  🎯 로컬 Whisper 보조 정렬… (${needLocal.length}문장)`);
  }
  const localMap = whisperAlign(needLocal.map((it) => it.abs));

  // ③ 타이밍 — OpenAI → 로컬 whisper → 추정 순
  let exact = 0;
  for (const it of items) {
    const oa = oaMap.get(it.abs);
    const fromOa = oa ? alignToTokens(it.s.text, oa) : null;
    if (fromOa) {
      it.s.wordTimings = fromOa;
      exact++;
      continue;
    }
    const lw = localMap.get(it.abs);
    const fromLw = lw ? alignToTokens(it.s.text, lw) : null;
    if (fromLw) {
      it.s.wordTimings = fromLw;
      exact++;
    } else {
      it.s.wordTimings = estimateWordTimings(it.s.text, it.dur);
    }
  }

  // ④ 단어 발음 — 기본 OFF(문장 먼저). GEN_WORDS=1 일 때만 생성.
  //    공용 폴더(_words)에 저장, 이미 만든 단어는 재생성 X (책 간 중복 방지)
  if (book.words && process.env.GEN_WORDS === "1") {
    const sharedDir = join(PUBLIC_DIR, "seed", "_words");
    mkdirSync(sharedDir, { recursive: true });
    const keys = Object.keys(book.words);
    let made = 0;
    let reused = 0;
    for (const k of keys) {
      const base = k.replace(/[^a-z0-9]+/gi, "_");
      const wav = join(sharedDir, base + ".wav");
      const mp3 = join(sharedDir, base + ".mp3");
      if (existsSync(wav)) {
        book.words[k].audioUrl = `/seed/_words/${base}.wav`;
        reused++;
        continue;
      }
      if (existsSync(mp3)) {
        book.words[k].audioUrl = `/seed/_words/${base}.mp3`;
        reused++;
        continue;
      }
      try {
        // 단어 발음은 Edge TTS 고정(무료·또렷, 문장은 OpenAI). WORD_ENGINE=openai 로 override 가능
        if ((process.env.WORD_ENGINE || "edge") === "openai") {
          const { ext } = await synth(k, join(sharedDir, base));
          book.words[k].audioUrl = `/seed/_words/${base}${ext}`;
        } else {
          edgeSynth(k, join(sharedDir, base + ".mp3"));
          book.words[k].audioUrl = `/seed/_words/${base}.mp3`;
        }
        made++;
        process.stdout.write(`\r  단어 발음 신규 ${made} · 재사용 ${reused}…`);
      } catch {
        /* skip */
      }
    }
    console.log(`\n  🔤 단어 발음 — 신규 ${made} · 재사용 ${reused} (총 ${keys.length})`);
  }

  writeFileSync(path, JSON.stringify(book, null, 2));
  console.log(`  ✅ ${items.length}문장 · 정확정렬 ${exact} / 추정 ${items.length - exact}`);
}

async function main() {
  if (!existsSync(SEED_DIR)) {
    console.error("❌ data/seed 가 없어요.");
    process.exit(1);
  }
  const filter = process.argv[2];
  const files = readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !filter || f === `${filter}.json`);
  if (files.length === 0) {
    console.error(`해당 책 없음: ${filter}`);
    process.exit(1);
  }
  const engineLabel =
    ENGINE === "openai"
      ? "OpenAI TTS(gpt-4o-mini-tts)"
      : ENGINE === "cloud"
        ? "Cloud TTS(Chirp3-HD)"
        : ENGINE === "gemini"
          ? "Gemini TTS"
          : "Edge TTS";
  console.log(`🌱 ${files.length}권 음성+정렬 시작 (${engineLabel} + Whisper)`);
  for (const f of files) await processBook(f);
  console.log("\n🎉 완료 — 새로고침하면 정확히 동기화된 낭독이 됩니다.");
}

main();
