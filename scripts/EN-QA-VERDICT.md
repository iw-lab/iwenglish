# 영어 본문 5-way 전수검사 판정 (2026-06-22)

250권(그림책100 + daily150) / 영어문장 4,651개. 문법·비문·원어민 현용성 + 중복 검사.

## 방법론
- **3 독립계열 1차 검수**(`scripts/en-qa-5way.mjs`): 로컬 Qwen(ollama, raw 직접호출) + codex Spark(GPT, gpt-5.3-codex-spark) + Gemini(agy, Gemini 3.5 Flash High). 브릿지(CRITICAL/WARNING 템플릿) 우회해 strict pipe 포맷 강제.
- **Tier-3 Opus**: 종합·오탐필터. 그림책 단순체·한국식영어 false positive 제거, 책별 지배 시제·시점 확인 후 채택.
- **5번째 신호**: 자연스러움 의심표현만 WebSearch 용례검증.
- 커버리지 28/28 청크 전 계열 완료. **local(qwen)은 파싱 플래그 0** — 영어 능력 낮아 실질 기여 0(능력×독립성: 약체는 노이즈). 실질 신호 = Spark+Gemini 2 frontier.

## 결과
- 플래그 249건(2계열 합의 32 / 단일계열 HIGH 71 / 나머지 MED·LOW).
- **Opus 확정 수정 72건**(`scripts/en-qa-fixes.json`): 음성재생성 67 + 따옴표만 5.

### 확정 결함 패턴
1. **시제 이탈**: 과거 서사에 현재 문장(daily-6 회상부, daily-80 도입), 현재 서사에 과거(daily-70).
2. **시점(POV) 혼재**: 한 책에 "I"/"Jun·He" 섞임(daily-52·59·78).
3. **deictic 불일치**: 과거 서사 + "today/tomorrow"(daily-83·92, the-blue-door 등) → "the next day".
4. **명백 문법**: each check→checks, how many books are there→there are, two pants→two pairs of pants, breads/a bread(불가산)→bun·kinds of bread, proud for→of, felt invited→inviting, keep playing and breathe→breathing, 문장조각, 따옴표 누락 등.
5. **번역투/부자연(MED)**: water sound→sound of the water, lots of trying→practice, a good idea came to her→she had a good idea 등.

### 주요 기각(오탐·과교정)
- 1인칭 그림책 일부를 3인칭 강요(단 daily-59는 실제 혼재라 채택).
- daily-47 "because I practiced"→과거완료(단순과거 정상), daily-48 "it rained"→진행형(정상).
- daily-87 "plays"(현재시제 책이라 정상 — Spark "played" 오탐).
- #1486/#1487 따옴표(2문장에 걸친 정상 인용을 각각 미닫힘으로 오판).
- "이미 the/관사 있음"을 Spark가 누락으로 오판(#990·#2184·#2185·#4026).
- "There was a microphone, a computer, and..."(구어 허용), epilogue 현재형("Now they all play")은 의도된 장치라 유지.

## 중복 검사 (`scripts/en-dup-check.mjs`)
- 책간 동일 문장: 5건뿐, 전부 시리즈 정형 연결구(같은 주인공 Jun) — 표절 아님.
- 책쌍 유사도 ≥0.15: **0쌍**(스토리 복제 없음). 책내 중복: **0건**.

## 적용
- `apply-en-fixes.mjs`: id→(slug,page,idx) 위치 매칭 + 원문 일치 검증(불일치 0) 후 교체. audio:true는 mp3 삭제+wordTimings 비움.
- 음성: `AUDIO_SKIP_EXISTING=1 TTS_ENGINE=openai OPENAI_TTS_VOICE=nova` 로 변경 문장만 nova 재합성+정렬.
- seed:content → build → cf:deploy.
