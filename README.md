# EchoTale · 에코테일

> **Read it. Hear it. Echo it. Speak it.** — 영어 그림책 낭독·쉐도잉 학습 PWA

Next.js 16 · React 19 · Tailwind v4 · Supabase · Gemini · Azure Speech.

---

## 현재 상태 — 골격(Skeleton) 완성

API 키 없이 **빌드·실행·동작**하는 골격이 완성됐습니다. (빌드/타입체크/린트/테스트 0 에러)

| 영역 | 상태 |
|---|---|
| 디자인 시스템 (그림책 팔레트·다크모드·난독증 폰트·글자/속도 슬라이더) | ✅ |
| 앱 셸 (하단 탭바 5개 · 서재/학습/단어장/진도/더보기) | ✅ |
| Supabase 스키마 + RLS + Storage 정책 (`supabase/migrations/`) | ✅ (적용은 키 필요) |
| 인증 (이메일 로그인/회원가입 · 세션 proxy) | ✅ (Supabase 키 필요) |
| 낭독 리더 — Read-Aloud / Sentence / Word-Tap (카라오케 엔진) | ✅ Web Speech 폴백으로 키 없이 동작 |
| 단어 탭 사전 (IPA·뜻·발음·예문) | ✅ dictionaryapi.dev 무료, 키 불필요 |
| 쉐도잉 / 따라읽기 + 발음평가 UI | ✅ UI 완성, 평가는 Azure 키 필요 (없으면 녹음·비교 모드) |
| 콘텐츠 파이프라인 (`scripts/prepare-book.ts`) | ✅ 코드 완성, 실행은 키 필요 |
| 요금제 / entitlements (상용화 대비 스텁) | ✅ 교실 모드(전권 무료) |
| 단위 테스트 (utils · SM-2) | ✅ 7 passing |

## 빠른 시작 (골격 그대로 보기 — 키 불필요)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

서재의 "출간 예정 그림책 10권"과 5대 학습 모드, 설정(테마/폰트/속도), 단어 사전 API가 바로 동작합니다.

## 콘텐츠 채우기 (키 입력 → 실데이터 시드)

```bash
cp .env.local.example .env.local     # Supabase · Gemini · Azure 키 입력
supabase db push                     # 스키마 + RLS + Storage 적용
ECHOTALE_GEN_IMAGES=1 pnpm seed:books   # codex imagegen 일러스트 + Gemini 텍스트/번역/퀴즈 + Azure 오디오/타이밍
# 특정 책만:  pnpm seed:books luna-and-the-lost-star
```

시드가 끝나면 서재에 실제 그림책이 나타나고, 카라오케 낭독·문장 모드·단어 탭·쉐도잉 발음평가가 실데이터로 동작합니다.

## 필요한 키

`.env.local.example` 참고 — Supabase / Gemini / Azure Speech 3종 필수, MyVoice·Stripe 선택.

## 아키텍처

- `src/app/(app)/*` — 하단 탭 셸이 감싸는 메인 화면들
- `src/app/read/[slug]` — 풀스크린 낭독 리더 (셸 밖)
- `src/components/reader/*` — Reader · SentenceView · ShadowingPanel
- `src/hooks/useKaraoke.ts` — 단어 동기화(Azure 타이밍 / Web Speech 폴백 이중 전략)
- `src/lib/azure/*` · `gemini.ts` · `dictionary.ts` — 외부 서비스 래퍼 (키 없으면 graceful)
- `src/lib/entitlements.ts` — 플랜 게이팅 (`NEXT_PUBLIC_BILLING_ENABLED=false` → 전권 무료)
- `scripts/prepare-book.ts` — 책꽃/Gemini → 문장·단어·오디오·퀴즈 → DB 시드 파이프라인

## 남은 작업 (키 확보 후)

1. Supabase 프로젝트 생성 → `supabase db push`
2. `pnpm seed:books` 로 그림책 10권 실제 생성·시드
3. 쉐도잉 정밀 발음평가 클라이언트 SDK 배선 (`/api/azure-token` + 브라우저 SDK)
4. SRS 복습 세션 UI · 이해 퀴즈 풀이 화면 · 교사 대시보드 CRUD
5. PWA 서비스워커(오프라인 캐시) · Playwright E2E · Vercel 배포
