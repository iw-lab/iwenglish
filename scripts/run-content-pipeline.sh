#!/usr/bin/env bash
# 콘텐츠 양산 파이프라인 (백그라운드 무인 실행) — 단계별 게이트(postcondition) 포함.
# 진행은 ### PHASE / ### GATE 마커로 로깅.
#
# 환경변수:
#   PIPELINE_STRICT=1        게이트 실패 시 즉시 중단.
#                            (기본: 경고 남기고 진행, 마지막에 ### GATE_FAILURES 요약 블록)
#   BOOKS="slug1 slug2"      대상 책 필터 — **게이트에만** 적용.
#                            생성 스크립트들(seed:worddict/words, run-audio-batch,
#                            gen-*-images, optimize-images)은 책 필터 인자를 지원하지
#                            않고 자체 resume/skip-existing 로직으로 미완성분만 처리함.
#   IMAGE_GEN=daily|storybook  이미지 단계 분기 (기본 daily).
#                            daily     → gen-book-images.mjs (공용 캐릭터 Jun)
#                            storybook → gen-storybook-images.mjs (권별 고유 캐릭터)
#
# ⚠️ codex 동시성 하드캡 = 3 (절대 3 초과 금지):
#    conc8 실측 실패율 57% — OAuth refresh race 로 재시도 폭증(재시도=codex 재호출=더 느림).
#    3 + stagger 가 재시도 0 스위트스팟. 인자로도 3 초과를 허용하지 않는다.
set -u
cd /Users/iw-lab/Documents/dev/iwenglish || exit 1

CODEX_CONC=3   # 하드캡 — 위 주석 참조. 변경 금지.
IMAGE_GEN="${IMAGE_GEN:-daily}"
GATE_FAILURES=""

# BOOKS="a b" → "--books a,b" (slug 에 공백 없음 전제, bash3 호환 위해 문자열 사용)
BOOKS_OPT=""
if [ -n "${BOOKS:-}" ]; then
  BOOKS_OPT="--books $(echo "$BOOKS" | tr ' ' ',')"
fi

# 게이트 실행: 실패 시 STRICT 면 즉시 중단, 아니면 누적 후 진행
run_gate() {
  local g="$1"
  echo "### GATE $g $(date +%H:%M)"
  # shellcheck disable=SC2086  # BOOKS_OPT 의도적 unquoted 분리
  if node scripts/pipeline-gates.mjs "$g" $BOOKS_OPT; then
    echo "### GATE_OK $g"
  else
    if [ "${PIPELINE_STRICT:-0}" = "1" ]; then
      echo "### GATE_FAIL $g — PIPELINE_STRICT=1 즉시 중단"
      exit 1
    fi
    GATE_FAILURES="$GATE_FAILURES $g"
    echo "### GATE_WARN $g (계속 진행)"
  fi
}

if [ "$IMAGE_GEN" = "storybook" ]; then
  IMG_SCRIPT="scripts/gen-storybook-images.mjs"
elif [ "$IMAGE_GEN" = "daily" ]; then
  IMG_SCRIPT="scripts/gen-book-images.mjs"
else
  echo "### ERROR IMAGE_GEN=$IMAGE_GEN (daily|storybook 만 허용)"
  exit 1
fi

echo "### PHASE worddict $(date +%H:%M)"
pnpm seed:worddict || echo "### WARN worddict"
run_gate worddict

echo "### PHASE words $(date +%H:%M)"
pnpm seed:words || echo "### WARN words"
run_gate words-audio

echo "### PHASE audio $(date +%H:%M)"
node scripts/run-audio-batch.mjs || echo "### WARN audio"
run_gate audio

echo "### PHASE content-audio $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-audio"

echo "### PHASE anchors $(date +%H:%M)"
# daily 책만 자체 필터해 cover.webp→png 복원(페이지 anchor 용) — storybook 엔 no-op
node scripts/restore-cover-anchors.mjs || echo "### WARN anchors"

echo "### PHASE covers $(date +%H:%M)"
node "$IMG_SCRIPT" covers "$CODEX_CONC" || echo "### WARN covers"
run_gate covers

echo "### PHASE content-covers $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-covers"

echo "### PHASE pages $(date +%H:%M)"
node "$IMG_SCRIPT" pages "$CODEX_CONC" || echo "### WARN pages"
run_gate pages

echo "### PHASE optimize $(date +%H:%M)"
node scripts/optimize-images.mjs 8 || echo "### WARN optimize"
run_gate webp
run_gate dups

echo "### PHASE content-final $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-final"

if [ -n "$GATE_FAILURES" ]; then
  echo "### GATE_FAILURES"
  for g in $GATE_FAILURES; do
    echo "  - $g (재확인: node scripts/pipeline-gates.mjs $g $BOOKS_OPT)"
  done
  echo "### PIPELINE_DONE $(date +%H:%M) — 게이트 실패 있음"
  exit 1
fi
echo "### PIPELINE_DONE $(date +%H:%M)"
