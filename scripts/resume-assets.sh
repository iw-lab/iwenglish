#!/bin/bash
# 미완성 책 에셋(낭독 음성 + 일러스트) 재개 가능 파이프라인.
# 모든 단계가 멱등 — codex 쿼터로 끊겨도 재실행하면 이어서 진행.
#
#   bash scripts/resume-assets.sh audio    # 음성만 (OpenAI, 쿼터 무관)
#   bash scripts/resume-assets.sh images   # 그림만 (codex, conc=3 하드캡 준수·순차)
#   bash scripts/resume-assets.sh status   # 남은 작업량만 출력
#
# ⚠️ HARD: 이미지 생성기 2종(daily/storybook)을 동시 실행하면 conc=6이 되어
#          OAuth race 실패율 폭증 → 반드시 순차. 각각 conc=3.

cd "$(dirname "$0")/.." || exit 1
PHASE="${1:-status}"

remaining() {
  python3 - <<'PY'
import json, os, glob
books = imgs = sents = 0
for j in sorted(glob.glob('data/seed/*.json')):
    b = os.path.basename(j)[:-5]
    if b == '_words':
        continue
    d = json.load(open(j))
    need_img = need_aud = 0
    for i, p in enumerate(d['pages'], 1):
        w = f'public/seed/{b}/p{i}.webp'
        n = f'public/seed/{b}/p{i}.png'
        if not (os.path.exists(w) or os.path.exists(n)):
            need_img += 1
        for s in p['sentences']:
            if not s.get('wordTimings'):
                need_aud += 1
    cov = os.path.exists(f'public/seed/{b}/cover.webp') or os.path.exists(f'public/seed/{b}/cover.png')
    if not cov:
        need_img += 1
    if need_img or need_aud:
        books += 1
    imgs += need_img
    sents += need_aud
print(f"📊 남은 작업 — 책 {books}권 · 이미지 {imgs}장 · 음성 {sents}문장")
PY
}

case "$PHASE" in
  status)
    remaining
    ;;

  audio)
    # 이미지 페이즈와 병렬 실행 가능(다른 provider) — seed:content는 여기서 호출하지 않음.
    echo "### PHASE audio (OpenAI — codex 쿼터 무관)"

    # 🚦 프리플라이트: OpenAI 크레딧 없으면 즉시 중단(Edge 폴백은 gen-audio에서 차단됨)
    KEY=$(grep -E "^OPENAI_API_KEY=" .env.local 2>/dev/null | cut -d= -f2- | tr -d '"'"'"'')
    if [ -z "$KEY" ]; then echo "### AUDIO_BLOCKED no-key"; exit 2; fi
    PROBE=$(curl -s https://api.openai.com/v1/chat/completions \
      -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":1}' 2>/dev/null)
    if echo "$PROBE" | grep -qi "exceeded your current quota\|insufficient_quota"; then
      echo "### AUDIO_BLOCKED quota — OpenAI 크레딧 소진. 충전 후 재개:"
      echo "    https://platform.openai.com/settings/organization/billing"
      remaining
      exit 2
    fi
    echo "✅ OpenAI 쿼터 확인 — 음성 생성 시작"
    # 음성 미완성 책 슬러그를 직접 수집(daily + 픽션 모두)
    SLUGS=$(python3 - <<'PY'
import json, os, glob
out = []
for j in sorted(glob.glob('data/seed/*.json')):
    b = os.path.basename(j)[:-5]
    if b == '_words':
        continue
    d = json.load(open(j))
    if any(not s.get('wordTimings') for p in d['pages'] for s in p['sentences']):
        out.append(b)
print(' '.join(out))
PY
)
    n=$(echo "$SLUGS" | wc -w | tr -d ' ')
    echo "🔊 음성 필요 ${n}권"
    i=0
    for s in $SLUGS; do
      i=$((i+1))
      echo "=== [$i/$n] $s ==="
      TTS_ENGINE=openai ALIGN_ENGINE=openai AUDIO_SKIP_EXISTING=1 pnpm seed:audio "$s" \
        || echo "⚠️ 실패 $s (다음 재개 때 자동 재시도)"
    done
    echo "### AUDIO_PHASE_DONE"
    remaining
    ;;

  content)
    echo "### PHASE content (에셋 반영 — 음성·이미지 끝난 뒤 1회)"
    pnpm seed:content
    remaining
    ;;

  images)
    echo "### PHASE images (codex \$imagegen — conc=3 하드캡, 순차)"
    # 고아 codex 정리(직전 중단 잔재)
    pgrep -f "codex exec" >/dev/null && echo "⚠️ 기존 codex 프로세스 감지 — 정리" && pkill -9 -f "codex exec"
    # 잘린 png(<50KB) 제거 — 중단으로 깨진 산출물
    find public/seed -name "*.png" -size -50k -delete 2>/dev/null

    echo "--- 1) 표지 (daily) ---"
    node scripts/gen-book-images.mjs covers 3      || echo "⚠️ daily 표지 중단(쿼터?)"
    echo "--- 2) 표지 (storybook) ---"
    node scripts/gen-storybook-images.mjs covers 3 || echo "⚠️ 픽션 표지 중단(쿼터?)"

    echo "--- 3) 페이지 (daily, 표지 앵커) ---"
    node scripts/gen-book-images.mjs pages 3       || echo "⚠️ daily 페이지 중단(쿼터?)"
    echo "--- 4) 페이지 (storybook, 표지 앵커) ---"
    node scripts/gen-storybook-images.mjs pages 3  || echo "⚠️ 픽션 페이지 중단(쿼터?)"

    echo "--- 5) PNG→WebP ---"
    node scripts/optimize-images.mjs 8
    echo "### IMAGES_PHASE_DONE"
    remaining
    ;;

  *)
    echo "usage: resume-assets.sh [status|audio|images]"
    exit 1
    ;;
esac
