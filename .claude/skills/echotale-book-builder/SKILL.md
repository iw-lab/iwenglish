---
name: echotale-book-builder
description: EchoTale(iwenglish) 영어 그림책/생활영어 책 양산 전체 파이프라인 — 설계→텍스트→음성→그림→QA→배포. 트리거: 책 추가, 그림책 만들기, 생활영어 N권, 시드 작성, 일러스트 생성, 음성 생성, 콘텐츠 QA, 배포 전 검수.
---

# EchoTale Book Builder — 그림책·생활영어 양산 파이프라인

## 0) 한눈에 — 6단계 + 게이트

```
설계(plan) → 텍스트(seed JSON) → 음성(worddict→words→audio) → 그림(covers→pages→webp)
   → QA(기계검수 + 시각검수) → 반영·배포(seed:content → cf:deploy → 라이브 검증)
```

각 단계 뒤 **게이트 필수**: `node scripts/pipeline-gates.mjs <gate>` (worddict|words-audio|audio|covers|pages|webp|dups).
전체 현황은 언제든 `node scripts/status.mjs [--missing-only]`.

## 1) 컬렉션 2종 — 먼저 분기 결정

| | 생활영어(daily) | 그림책(픽션) |
|---|---|---|
| 시드 필드 | `collection:"daily"`, `stage:1~6` | 둘 다 **없음** (서재는 level로 그룹) |
| 주인공 | **Jun 고정** (8세 한국 소년, 빨간 티+파란 반바지) | **권마다 고유 캐릭터** (plan의 `char`) |
| 이미지 생성기 | `gen-book-images.mjs` | `gen-storybook-images.mjs` |
| 톤 | Korean modern everyday 강제 | 동화/판타지 허용 |
| 설계 척추 | 없음(시드 직접) | `scripts/storybook-plan.mjs`에 먼저 등록 |

## 2) 텍스트 — 시드 JSON 작성

`data/seed/<slug>.json`:
```
slug, title, title_ko, level(preA1|A1|A2|B1), ageBand,
stage+collection(daily만), summary_ko,
pages[{sentences[{text, translation_ko}]}],   # audio/wordTimings는 파이프라인이 채움
words: {},                                     # 비워둠 — 자동 채움
quiz[5]: {question_ko, type:"mc", options[4], answerIndex, explain_ko}
```

**난이도 사다리 (하드 명시해야 평탄화 안 됨)**:
- preA1: 6~7p, ~50~70단어, 1문장/p, 현재형 SVO·sight words, 반복 리듬 (ageBand 5-7)
- A1: 8~9p, ~90~120단어, 1~2문장/p, and/but·과거형 도입·짧은 대화 (8-10)
- A2: 10~11p, ~150~190단어, 2문장/p, because/when·문제해결 (8-10)
- B1: 12~14p, ~240~320단어, 2~3문장/p, 시제 혼합·감정·주제의식 (11-13)
- daily stage1~6 평균단어 실측: 28/42/59/68/102/201

**집필 룰**: 메타대사 금지, `**강조**` 금지, em-dash 절제, 자연스러운 한국어 번역(직역 금지), 초등 어휘.
**대량 집필 = Workflow 병렬**(권당 1에이전트, 척추 읽고 full seed 작성) → **codex 교차검수**(`node scripts/codex-review-storybooks.mjs`, 4청크 병렬, 텍스트라 OAuth race 무관) → 적발 건 파일당 1에이전트로 반영. 50권에서 70건(실문법·오역·퀴즈 불일치·레벨초과 어휘) 적발된 핵심 가치 단계 — 생략 금지.
**기계검수**: `node scripts/qa-seed.mjs` (스키마·퀴즈·레벨밴드·텍스트룰·dict 커버리지).

## 3) 음성 (자동, OpenAI nova + whisper-1 정렬)

```bash
pnpm seed:worddict                 # 새 단어 뜻·IPA → data/seed/_words.json (dedup)
pnpm seed:words                    # 새 단어 Edge TTS mp3 → public/seed/_words/ (dedup)
node scripts/run-audio-batch.mjs   # 미완성 책만 자동 선별, 순차 생성
# 또는 권 단위: TTS_ENGINE=openai ALIGN_ENGINE=openai pnpm seed:audio <slug>
pnpm seed:content
```
- 기존 책 페이지 추가 시 `AUDIO_SKIP_EXISTING=1` — 추가분만 생성, 기존 정렬 보존(churn 방지).
- 게이트: `pipeline-gates.mjs worddict && words-audio && audio` + `node scripts/qa-timings.mjs` (mp3 실존, zero-duration, 비단조, char 오프셋).

## 4) 그림 (codex $imagegen, 병렬 — HARD 룰)

```bash
node scripts/gen-{book|storybook}-images.mjs covers 3   # 표지 먼저
pnpm seed:content                                        # 표지 반영 → 표지 즉시 cwebp 변환 권장
node scripts/gen-{book|storybook}-images.mjs pages 3    # 표지를 -i 앵커로 페이지
node scripts/optimize-images.mjs 8                      # PNG→WebP(1280/q82) — 필수, prod엔 webp만
pnpm seed:content
```

### 🔴 절대 룰 (실측 사고 기반)
1. **conc=3 하드캡, 절대 초과 금지** — conc8 실측 실패율 57%(OAuth refresh race). 재시도=codex 재호출=오히려 느림. stagger 900ms.
2. **conc 조절하려 kill·restart 반복 금지** — 고아 codex 18개 누적→한 책 12개 중복→신규생성 정지 사고. 한 번 conc=3으로 정하고 끝까지. 막히면 (타 프로젝트 codex 없음 확인 후) `pkill -9 -f "codex exec"` → 잘린 png(<50KB) 삭제 → 단일 잡 재시작.
3. **순차 execFileSync 금지** — 1장 hang(0%CPU 18분+)이 전체를 막음. 반드시 spawn 풀 + 8분 SIGKILL + existsSync 검증 + 재시도 3회 (기존 생성기에 내장됨).
4. **앵커 체인**: 페이지는 cover.png를 `-i` 레퍼런스로. webp만 남았으면 `dwebp cover.webp -o cover.png` (`restore-cover-anchors.mjs`). 표지 1컷 실패 시 페이지 전에 `covers 1` 단독 보충.
5. **anti-lock**: 락 대기 금지. 세션 솔트+프로젝트 지문+타프로젝트 키워드 ban은 생성기에 내장. 동시 타 프로젝트 codex 허용.
6. 완료 감시: `while pgrep -f gen-storybook-images; do sleep 30; done` run_in_background. `sleep N && echo` 패턴 금지.

### 시각 QA (배포 전 필수 — conc 병렬은 인접 task thread-cache 혼입 실재)
1. **MD5 기계스캔 먼저**: `node scripts/pipeline-gates.mjs dups` — 책 내/책 간 바이트 동일 페이지 적발(50권 중 6쌍 실적발). 시각 에이전트는 "느슨한 중복"을 놓침.
2. **에이전트 N개 병렬 육안 검수**: 각자 4~5권씩 webp Read로 그림↔문장 대조, 불일치만 보고.
3. **불일치 컷 격리 재생성**: `regen-fixes.mjs` 패턴 — **conc=1 단독** + `[unique:<salt>]` + 강한 NEGATIVE + cover 앵커. 재생성분도 Read 육안 재검 후 cwebp 교체.
4. 그림↔문장 매핑(page i→pN.webp)은 코드상 1:1 정상 — "불일치"는 생성 drift이므로 선별 재생성만.

### 프롬프트 표준 (생성기 내장값 변경 시 준수)
- 캐릭터 압축 5~8단어, visualPrompt 1000자 이내, "EXACTLY match reference (NO drift)".
- NEG 필수: no text/letters, 5-finger hands, natural pose, NOT anime/chibi/comic, NOT 사극/그리스/연예인, (daily) Korean modern everyday / (픽션) 판타지 허용.
- 해상도 1536x1024.

## 5) 반영·배포

```bash
pnpm seed:content      # content.generated.ts + dict.json 재생성 (predev/prebuild 자동)
node scripts/status.mjs && node scripts/qa-seed.mjs && node scripts/qa-timings.mjs  # 최종 게이트
pnpm cf:deploy         # OpenNext build + Cloudflare Workers deploy
```
- **PNG 배포 제외 필수**: `public/.assetsignore`에 `**/*.png` + `.gitignore`에 `public/seed/**/*.png`. 안 하면 wrangler가 원본 png ~1GB 업로드.
- 새 책 = `/read/<slug>` SSG 자동(generateStaticParams 전수) → 0 Functions. `force-static` 금지(OpenNext 404).
- 라이브 검증: `pN.webp→200`, `pN.png→404`, 재생성 컷은 라이브 바이트 일치 확인.
- 커밋은 webp만(cover.png/페이지 png 제외), `git rm --cached`로 png 이력 보존 제외.
- Reader는 Link `prefetch={false}` 유지(RSC 프리페치 버스트→워커 503 사고). 자기 IP 부하테스트 금지.

## 6) 전체 자동 실행 (무인)

```bash
PIPELINE_STRICT=1 bash scripts/run-content-pipeline.sh   # 단계별 게이트 검증 포함
```
`BOOKS="slug1 slug2"`로 대상 필터, `IMAGE_GEN=daily|storybook` 분기. 로그 `### PHASE`/`### GATE_FAILURES` 마커.

## 도구 인벤토리

| 도구 | 역할 |
|---|---|
| `scripts/status.mjs` | 전권 자산 현황(이미지·음성·타이밍·퀴즈·dict 커버리지), `--missing-only` `--json` |
| `scripts/qa-seed.mjs` | 시드 기계검수(스키마·퀴즈·레벨밴드·텍스트룰) |
| `scripts/qa-timings.mjs` | 음성 타이밍 검수(zero-duration·비단조·오프셋) |
| `scripts/pipeline-gates.mjs` | 단계별 postcondition 게이트 + MD5 중복 스캔 |
| `scripts/storybook-plan.mjs` | 픽션 설계 척추(slug·level·char·brief) — 신규 픽션은 여기 먼저 |
| `scripts/gen-book-images.mjs` / `gen-storybook-images.mjs` | daily/픽션 일러스트 (covers\|pages [conc≤3]) |
| `scripts/run-audio-batch.mjs` | 음성 미완성 책 자동 선별 생성 |
| `scripts/optimize-images.mjs` | PNG→WebP 1280/q82 |
| `scripts/codex-review-storybooks.mjs` | codex 텍스트 교차검수(병렬 자유) |
| `scripts/regen-fixes*.mjs` | 불량 컷 conc=1 격리 재생성 템플릿 |
| `scripts/restore-cover-anchors.mjs` | webp→png 앵커 복원 |
| `scripts/scan-storybook-dups.mjs` | (구) MD5 중복 스캔 — gates의 dups로 일반화됨 |

## 트러블슈팅 (실사고 색인)

| 증상 | 원인·처치 |
|---|---|
| codex 1장에서 멈춤(0%CPU) | hang — SIGKILL 후 재시도(내장). 순차 호출 금지 |
| 재시도 폭증·시간당 한 자릿수(0%CPU 다수) | **codex 0.139+ $imagegen 자체검수 루프** — 생성 후 스스로 열어보고 재생성하다 8분 타임아웃. 프롬프트에 "1회 생성 즉시 저장·자체 검수/재생성 금지" 지시문 + **비활동 240초 워치독**(첫 출력 기준은 프롬프트 에코 때문에 무효) + 재시도 5회 — 4개 생성기 내장(2026-06-12) |
| 실패율 폭증·재시도 루프 | conc>3 OAuth race → conc=3 + stagger 900ms 고정 |
| 신규 생성 정지·중복 폭증 | 고아 codex 누적 → `pkill -9 -f "codex exec"` 후 단일 잡 |
| 다른 책/장면 그림 혼입 | codex가 generated_images 최신 파일을 주워 저장(conc=1도 발생!) → **md5 self-verify 엔진**(`regen-dedup-w7.mjs` 패턴: 생성 직후 전 자산 md5 대조, 충돌 시 폐기·재시도) + 프롬프트에 '기존 파일 줍기 금지' 명시. 재생성 후 dups 게이트 재실행 필수 |
| 리더에 "그림 준비 중" | webp 누락(png만 있음, prod 미배포) → optimize-images 재실행 |
| 카라오케 하이라이트 어긋남 | zero-duration/비단조 타이밍 → qa-timings 적발 후 해당 문장만 재생성 |
| 배포 후 그대로/503 | prefetch 버스트·캐시 — `rules-lazy/deploy-cache.md` Read |
| zsh 글로브/변수 함정 | 미매칭 글로브가 명령 전체 중단 — find 기반으로, 리스트는 리터럴 나열 |

## 연관 문서
- 메모리: `echotale-content-pipeline.md`(이력·실측), `echotale-project.md`, `echotale-opennext-503.md`
- 전역 룰: `~/.claude/rules/codex-concurrency.md`(자동 로드), `~/.claude/rules-lazy/visual-content.md`
- 전역 학습: `~/.claude/learnings/cloudflare-nextjs.md`, `tts-audio.md`
