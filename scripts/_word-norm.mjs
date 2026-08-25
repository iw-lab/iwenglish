/**
 * 본문 토큰화·단어 정규화 — **스크립트 쪽 유일 정본**.
 *
 * src/lib/utils.ts 의 tokenizeWords/normalizeWord/wordAudioBase 와 같은 규칙이어야 한다.
 * 예전엔 이 규칙이 qa-seed.mjs·status.mjs·pipeline-gates.mjs 에 각각 복붙돼 있어서,
 * utils.ts 를 고쳐도 스크립트 3곳이 따라오지 않았다(2026-08-25). 여기 한 곳만 고친다.
 * 두 구현이 어긋나면 core.test.ts 의 "정규화 규칙 단일화" 테스트가 깨진다.
 */

/** 문장 → 단어 토큰 배열(원문 표기 유지) */
export function tokenize(text) {
  return (
    text
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .match(/[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g) ?? []
  )
    .map(normalizeWord)
    .filter(Boolean);
}

/** 소문자화 + 양끝 구두점(아포스트로피·하이픈 포함) 제거. 안쪽 '·- 는 보존 */
export function normalizeWord(w) {
  return w
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

/** 단어 mp3 파일명 베이스 (tae's → tae_s) */
export function wordAudioBase(w) {
  return normalizeWord(w).replace(/[^a-z0-9]+/gi, "_");
}
