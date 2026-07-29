# NOTICE — 제3자 구성요소 및 생성 미디어 고지

이 문서는 EchoTale 저장소에 포함된 구성요소의 출처와 라이선스를 고지합니다.
소스 코드 본체의 라이선스는 [LICENSE](./LICENSE)(MIT)를 따릅니다.

---

## 1. 소스 코드

| 구분 | 라이선스 |
|---|---|
| 이 저장소가 직접 작성한 소스 코드 (`src/`, `scripts/`, 설정 파일) | **MIT License** ([LICENSE](./LICENSE)) |

## 2. 런타임 의존성 (프로덕션)

| 패키지 | 버전 | 라이선스 | 저장소 |
|---|---|---|---|
| next | 16.2.7 | MIT | https://github.com/vercel/next.js |
| react | 19.2.4 | MIT | https://github.com/facebook/react |
| react-dom | 19.2.4 | MIT | https://github.com/facebook/react |
| zustand | 5.0.14 | MIT | https://github.com/pmndrs/zustand |
| framer-motion | 12.40.0 | MIT | https://github.com/motiondivision/motion |
| recharts | 3.8.1 | MIT | https://github.com/recharts/recharts |
| lucide-react | 1.17.0 | **ISC** | https://github.com/lucide-icons/lucide |
| date-fns | 4.4.0 | MIT | https://github.com/date-fns/date-fns |
| clsx | 2.1.1 | MIT | https://github.com/lukeed/clsx |

전 항목 MIT 호환(ISC는 MIT와 실질 동등). MIT 배포와 라이선스 충돌이 없습니다.
전체 목록(개발 의존성 포함)은 `package.json` 및 `pnpm-lock.yaml`을 참조하십시오.

## 3. 생성 미디어 에셋 (`public/seed/`)

`public/seed/` 의 삽화(WebP)와 음성(MP3)은 **소스 코드가 아니라 AI로 생성한 미디어 에셋**이며,
생성 엔진이 두 갈래로 나뉩니다. 출처별 실측 집계는 다음과 같습니다.

### 3.1 삽화 (WebP, 총 3,896장)

| 생성 엔진 | 수량 | 비고 |
|---|---|---|
| OpenAI **Codex CLI 내장 이미지 생성 도구**(`$imagegen`) | 3,114장 | 생성 스크립트(`scripts/gen-book-images.mjs`, `gen-storybook-images.mjs`)가 도구를 호출할 뿐 모델을 지정하지 않으므로, 내부 이미지 모델의 공개 명칭은 단정하지 않는다 |
| **Meta AI** (`scripts/meta-image-gen.py` 경유) | **782장** (86권에 분포) | 생성 이력 전건이 `scripts/.meta-manifest.json` 에 파일 단위로 기록됨 |

> 내역: 표지 352장 + 본문 3,544장 = 총 3,896장(WebP, git 추적 기준).

> Meta AI 생성분의 파일 목록은 `scripts/.meta-manifest.json` 에서 `engine: "meta-ai"` 로
> 조회할 수 있습니다(경로는 원본 PNG 기준이며, 배포본은 동일 경로의 `.webp` 입니다).

### 3.2 음성 (MP3)

| 용도 | 생성 엔진 |
|---|---|
| 문장 낭독 | OpenAI `gpt-4o-mini-tts` (voice: `nova`) |
| 단어 발음 | OpenAI `gpt-4o-mini-tts` (voice: `nova`) |
| 단어 타임스탬프 정렬 | OpenAI `whisper-1` (전사·강제정렬, 오디오 자체는 미생성) |

### 3.3 텍스트

| 용도 | 생성 엔진 |
|---|---|
| 단어 뜻·예문(정적 사전 `public/dict.json`) | OpenAI `gpt-4o-mini` |
| 책 원문(`data/seed/*.json`) | 프로젝트 저작자가 작성·검수 (AI 초안 + 다중 교차검증 수정) |

### 3.4 생성물 이용 조건에 관한 고지

- **OpenAI 생성분**: OpenAI 이용약관상 생성 결과물(Output)의 소유권이 생성한 이용자에게
  귀속됩니다. 이에 따라 프로젝트 저작자가 코드와 동일한 MIT 조건으로 재배포합니다.
  재사용 시 OpenAI 사용정책(불법·금지 콘텐츠 금지 등)을 준수하십시오.
- **Meta AI 생성분(782장)**: 생성 사실과 대상 파일을 위와 같이 명시적으로 고지합니다.
  재배포·상업적 이용 조건은 Meta AI 서비스 약관을 따르므로, 이 에셋을 **재사용하려는
  제3자는 Meta AI의 최신 이용약관을 직접 확인**하시기 바랍니다. 프로젝트 저작자는
  이 부분에 대해 MIT 재배포를 단정하여 보증하지 않습니다.
- 위 구분과 무관하게, **소스 코드(MIT) 자체의 이용에는 아무 제약이 없습니다.**
  에셋 없이도 저장소의 생성 스크립트로 콘텐츠를 재생성할 수 있습니다.

## 4. 런타임 외부 서비스

| 서비스 | 용도 | 호출 시점 |
|---|---|---|
| `api.dictionaryapi.dev` | 정적 사전에 없는 단어의 발음기호·예문 폴백 조회 | `/api/word` 요청 중 정적 사전 미스 시에만 |

- 무료 공개 API이며 인증 키가 필요 없습니다. 이 서비스가 응답하지 않아도 앱은
  정적 사전과 로컬 발음 MP3로 정상 동작합니다.
- **런타임에 AI 모델을 호출하는 경로는 없습니다.** AI는 전부 빌드/시드 타임에만 사용되고,
  배포된 앱은 생성이 끝난 정적 자산만 재생합니다(`src/lib/openai.ts` 는 `scripts/` 에서만 import).

## 5. 개인정보

- 앱은 계정·로그인 없이 동작하며, 학습 기록은 전부 사용자 기기의 `localStorage` 에만
  저장됩니다. 학습 기록을 서버로 전송하는 경로는 없습니다.
- 이 저장소와 에셋 어디에도 실제 이용자(학생)의 개인정보가 포함되어 있지 않습니다.
- 등장인물 이름은 모두 창작이며 실존 인물과 무관합니다.

## 6. 제3자 저작물

- 외부에서 가져온 폰트·이미지·음원·텍스트는 포함되어 있지 않습니다.
- 아이콘은 `lucide-react`(ISC)를 코드 의존성으로 사용합니다.
