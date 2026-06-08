/**
 * EchoTale 콘텐츠 파이프라인 — content-prep-agent + tts-timing-agent
 *
 *  실행:  pnpm seed:books            (PLANNED_BOOKS 전체)
 *         pnpm seed:books luna-and-the-lost-star   (특정 slug)
 *
 *  단계: ① 스토리(Gemini) → ② 일러스트(codex imagegen) → ③ 문장/단어 분해
 *        → ④ 사전+한글뜻(dictionary+Gemini) → ⑤ 문장 오디오+타이밍(Azure)
 *        → ⑥ 번역(Gemini) → ⑦ 이해퀴즈(Gemini) → ⑧ DB 시드 + 백업
 *
 *  필요 키: Supabase(service role) · Gemini · Azure. codex CLI(일러스트, 선택).
 */
import "./_env";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PLANNED_BOOKS, type PlannedBook } from "@/lib/data/plannedBooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureAvailability } from "@/lib/env";
import {
  geminiStory,
  geminiTranslate,
  geminiQuiz,
  geminiWordMeaning,
} from "@/lib/gemini";
import { lookupDictionary } from "@/lib/dictionary";
import { synthesizeSentence } from "@/lib/azure/tts";
import { tokenizeWords, normalizeWord } from "@/lib/utils";

const SEED_DIR = join(process.cwd(), "data", "seed");
const IMG_DIR = join(process.cwd(), "public", "seed");

function log(msg: string) {
  console.log(`  ${msg}`);
}

/** 영어 문장 분해 (약어 예외 단순 처리) */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]*/g)
    ?.map((s) => s.trim())
    .filter(Boolean) ?? [text.trim()];
}

/** codex CLI 로 일러스트 생성 (실패 시 빈 경로 반환) */
function generateIllustration(prompt: string, outPath: string): string {
  if (!process.env.ECHOTALE_GEN_IMAGES) return ""; // 명시 opt-in
  try {
    mkdirSync(IMG_DIR, { recursive: true });
    execFileSync(
      "codex",
      ["exec", `$imagegen size=1536x1024 out="${outPath}" prompt="${prompt}"`],
      { stdio: "inherit", timeout: 180000 },
    );
    return existsSync(outPath) ? `/seed/${outPath.split("/").pop()}` : "";
  } catch {
    log("⚠️ codex 일러스트 생성 실패 — 빈 표지로 진행");
    return "";
  }
}

async function uploadAudio(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  audio: Buffer,
): Promise<string> {
  await admin.storage
    .from("tts-audio")
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  const { data } = admin.storage.from("tts-audio").getPublicUrl(path);
  return data.publicUrl;
}

async function prepareBook(admin: ReturnType<typeof createAdminClient>, b: PlannedBook) {
  console.log(`\n📘 ${b.title} (${b.slug})`);

  // ① 스토리
  const story = await geminiStory(b.summary_ko, b.level, Math.ceil(b.sentences / 1.5));
  if (!story) {
    log("❌ 스토리 생성 실패 (Gemini 키 확인) — 건너뜀");
    return;
  }

  // ② 일러스트 (cover + page)
  const cover = generateIllustration(
    `children's picture book cover, warm watercolor, ${story.title}, NO text`,
    join(IMG_DIR, `${b.slug}-cover.png`),
  );

  // ⑧-a 책 upsert
  const { data: book, error: be } = await admin
    .from("books")
    .upsert(
      {
        slug: b.slug,
        title: story.title,
        title_ko: story.title_ko,
        level: b.level,
        age_band: b.ageBand,
        cover_url: cover,
        summary_ko: story.summary_ko,
        published: true,
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (be || !book) {
    log(`❌ 책 저장 실패: ${be?.message}`);
    return;
  }

  let totalWords = 0;
  const wordCache = new Set<string>();

  for (let pi = 0; pi < story.pages.length; pi++) {
    const pageText = story.pages[pi].text;
    const pageImg = generateIllustration(
      `children's picture book illustration for: ${pageText}, warm watercolor, NO text`,
      join(IMG_DIR, `${b.slug}-p${pi + 1}.png`),
    );

    const { data: page } = await admin
      .from("pages")
      .upsert(
        { book_id: book.id, page_no: pi + 1, spread: `p${pi + 1}`, image_url: pageImg },
        { onConflict: "book_id,page_no" },
      )
      .select()
      .single();
    if (!page) continue;

    // ③ 문장 분해
    const sentences = splitSentences(pageText);
    for (let si = 0; si < sentences.length; si++) {
      const text = sentences[si];
      totalWords += tokenizeWords(text).length;

      // ⑤ 오디오 + 타이밍
      let audioUrl: string | null = null;
      let timings: unknown[] = [];
      if (featureAvailability.azure()) {
        try {
          const { audio, timings: t } = await synthesizeSentence(text);
          audioUrl = await uploadAudio(
            admin,
            `${b.slug}/p${pi + 1}-s${si + 1}.mp3`,
            audio,
          );
          timings = t;
        } catch (e) {
          log(`⚠️ TTS 실패(${text.slice(0, 20)}…): ${(e as Error).message}`);
        }
      }

      // ⑥ 번역
      const translation = (await geminiTranslate(text)) ?? "";

      await admin.from("sentences").upsert(
        {
          page_id: page.id,
          ord: si,
          text,
          translation_ko: translation,
          audio_url: audioUrl,
          word_timings: timings,
        },
        { onConflict: "page_id,ord" },
      );

      // ④ 단어 사전 + 한글뜻
      for (const tok of tokenizeWords(text)) {
        const w = normalizeWord(tok.word);
        if (!w || wordCache.has(w)) continue;
        wordCache.add(w);
        const dict = await lookupDictionary(w);
        if (!dict) continue;
        const g = await geminiWordMeaning(w, dict.pos, dict.definition_en);
        await admin.from("words").upsert({
          text: w,
          lemma: w,
          ipa: dict.ipa,
          pos: dict.pos,
          meaning_ko: g?.meaning_ko ?? dict.definition_en,
          example_en: g?.example_en ?? dict.example_en,
          example_ko: g?.example_ko ?? "",
          audio_url: dict.audioUrl,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // ⑦ 이해 퀴즈
  const fullText = story.pages.map((p) => p.text).join(" ");
  const quiz = await geminiQuiz(story.title, fullText);
  if (quiz) {
    await admin.from("quizzes").delete().eq("book_id", book.id);
    await admin.from("quizzes").insert(
      quiz.map((q, i) => ({
        book_id: book.id,
        ord: i,
        question_ko: q.question_ko,
        qtype: q.type,
        options: q.options,
        answer_index: q.answerIndex,
        explain_ko: q.explain_ko,
      })),
    );
  }

  await admin.from("books").update({ word_count: totalWords }).eq("id", book.id);

  // ⑧-b 백업
  mkdirSync(SEED_DIR, { recursive: true });
  writeFileSync(
    join(SEED_DIR, `${b.slug}.json`),
    JSON.stringify({ book: story, words: [...wordCache], quiz }, null, 2),
  );
  log(`✅ 완료 — ${story.pages.length}쪽 · ${totalWords} words · ${wordCache.size} 단어`);
}

async function main() {
  if (!featureAvailability.supabase() || !featureAvailability.gemini()) {
    console.error(
      "❌ Supabase(service role) + Gemini 키가 필요해요. .env.local 을 확인하세요.",
    );
    process.exit(1);
  }
  if (!featureAvailability.azure()) {
    console.warn(
      "⚠️ Azure 키 없음 — 오디오/타이밍 없이 시드합니다(Web Speech 폴백으로 동작).",
    );
  }

  const filter = process.argv[2];
  const books = filter
    ? PLANNED_BOOKS.filter((b) => b.slug === filter)
    : PLANNED_BOOKS;
  if (books.length === 0) {
    console.error(`해당 slug 없음: ${filter}`);
    process.exit(1);
  }

  const admin = createAdminClient();
  console.log(`🌱 ${books.length}권 시드 시작`);
  for (const b of books) await prepareBook(admin, b);
  console.log("\n🎉 시드 완료");
}

// 사용하지 않는 import 경고 방지용 참조
void readFileSync;
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
