"use client";

import type { Word } from "@/types/book";
import { normalizeWord } from "@/lib/utils";
import { lemmaCandidates } from "@/lib/lemma";

interface RawEntry {
  ipa?: string;
  pos?: string;
  meaning_ko?: string;
  example_en?: string;
  example_ko?: string;
  audioUrl?: string;
}

let cache: Record<string, RawEntry> | null = null;
let inflight: Promise<Record<string, RawEntry>> | null = null;

/**
 * 정적 사전(/dict.json) 1회 로드·캐시 — 단어 탭마다 서버 호출 없이(Functions 0).
 * 실패는 캐시하지 않는다: 오프라인 상태에서 한 번 실패한 결과를 영구 캐시하면
 * 네트워크가 돌아와도 새로고침 전까지 사전 조회가 죽은 채로 남는다.
 */
async function load(): Promise<Record<string, RawEntry>> {
  if (cache) return cache;
  if (!inflight)
    inflight = fetch("/dict.json")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((json: Record<string, RawEntry>) => {
        cache = json; // 성공했을 때만 영구 캐시
        return json;
      })
      .catch(() => {
        inflight = null; // 다음 호출에서 다시 시도할 수 있게 되돌린다
        return {};
      });
  return inflight;
}

function toWord(key: string, e: RawEntry, lemma = key): Word {
  return {
    text: key,
    lemma,
    ipa: e.ipa ?? "",
    pos: e.pos ?? "",
    meaning_ko: e.meaning_ko ?? "",
    example_en: e.example_en ?? "",
    example_ko: e.example_ko ?? "",
    // 원형으로 찾아온 경우 원형의 mp3 를 쓰면 "waddles" 를 눌렀는데 "waddle" 이
    // 들린다 — 표면형이 다르면 음원을 비워 Web Speech 가 실제 단어를 읽게 한다.
    audioUrl: lemma === key ? (e.audioUrl ?? "") : "",
  };
}

/** 정적 사전에서 단어 조회. 없으면 null(→ /api/word 폴백) */
export async function getDictWord(raw: string): Promise<Word | null> {
  const key = normalizeWord(raw);
  if (!key) return null;
  const d = await load();
  const e = d[key];
  if (e?.meaning_ko) return toWord(key, e);

  // 표면형이 없으면 규칙 굴절을 벗겨 원형으로 한 번 더 — 사전 재생성을 놓친
  // 신간의 단어가 통째로 "뜻 없음"으로 새는 것을 막는 안전망(src/lib/lemma.ts 주석 참고).
  for (const base of lemmaCandidates(key)) {
    const b = d[base];
    if (b?.meaning_ko) return toWord(key, b, base);
  }
  return null;
}
