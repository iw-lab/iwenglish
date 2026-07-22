export const meta = {
  name: 'echotale-author-seeds',
  description: 'EchoTale 신규 권 시드 JSON 병렬 집필 (권당 1에이전트, 자가 qa-seed 검증)',
  phases: [{ title: 'Author', detail: 'spec 읽고 data/seed/<slug>.json 작성 + qa-seed --book' }],
};

// args = ["slug1","slug2",...]  (집필할 slug 목록). 각 에이전트가 /tmp/echotale-specs.json에서 자기 spec을 읽음.
let slugs = args;
if (typeof slugs === 'string') { try { slugs = JSON.parse(slugs); } catch { slugs = slugs.split(/[\s,]+/).filter(Boolean); } }
if (slugs && !Array.isArray(slugs) && Array.isArray(slugs.slugs)) slugs = slugs.slugs;
if (!Array.isArray(slugs)) slugs = [];
log(`args 타입=${typeof args}, slugs ${slugs.length}권`);
if (!slugs.length) { log('⚠️ args에 slug 목록이 없습니다'); return { authored: [], debug: typeof args }; }

phase('Author');
log(`${slugs.length}권 집필 시작`);

const promptFor = (slug) => `EchoTale(한국 초등학생 영어 학습 PWA) 시드 책 1권을 집필한다. slug = "${slug}".

1) 먼저 이 책의 사양을 읽어라(Bash):
   node -e 'const s=require("/tmp/echotale-specs.json");console.log(JSON.stringify(s.find(e=>e.slug==="${slug}"),null,1))'

2) 이미 data/seed/${slug}.json 이 있고 \`node scripts/qa-seed.mjs --book ${slug}\` 가 🔴 ERROR 0이면, 다시 쓰지 말고 "${slug} ✓ already" 만 반환하라.

3) 아니면 data/seed/${slug}.json 파일을 아래 스키마로 **정확히** 작성하라(프로젝트 루트 = /Users/iw-lab/Documents/dev/iwenglish):
{
  "slug": "${slug}",
  "title": <spec.title 그대로>,
  "title_ko": <spec.title_ko 그대로>,
  "level": <spec.level>,
  "ageBand": <spec.ageBand>,
  ${slug.startsWith('daily-') ? '"stage": <spec.stage>, "collection": "daily",' : '// (그림책은 stage·collection 필드 없음)'}
  "summary_ko": <spec.summary_ko 있으면 그대로, 없으면 topic 기반 자연스러운 1문장 한국어 요약>,
  "pages": [ { "sentences": [ { "text": <영어 문장>, "translation_ko": <자연스러운 한국어 번역> } ] }, ... ],
  "words": {},
  "quiz": [ 5문항: { "question_ko": <한국어 질문>, "type": "mc", "options": [<보기4개>], "answerIndex": <정답 0~3>, "explain_ko": <한국어 해설> } ]
}

HARD 규칙 (기계 게이트 qa-seed가 위반을 거부함 — 반드시 통과):
- pages 수 ≈ spec.targetPages. 전 페이지 영어 단어 총합 = spec.targetWords ± spec.wordsTol.
- 문장 구조: <spec.rule>. 레벨(<spec.level>)에 맞는 어휘만.
- 영어 본문(text)에 한글 절대 금지. translation_ko는 자연스러운 한국어(직역 금지), 영문 단어 2개 이하. 마크다운 ** 금지, em-dash 절제.
- ${slug.startsWith('daily-') ? '생활영어: 주인공 Jun + spec.cast 등장인물. 한국 현대 일상 배경. spec.topic 충실.' : '그림책: spec.char 고유 캐릭터. spec.brief 서사 아크. 동화/판타지 톤 허용.'}
- quiz: 정확히 5문항, 모두 한국어, 각 보기 4개(서로 다름), answerIndex가 정답 위치(0~3), explain_ko 해설. **answerIndex를 5문항에 걸쳐 분산**(전부 0/1 금지). 정답은 본문 내용에 근거.
- 파일 작성으로만 출력. JSON을 화면에 print하지 말 것.

4) 작성 후 반드시 \`node scripts/qa-seed.mjs --book ${slug}\` 실행. 🔴 ERROR가 있으면 0이 될 때까지 파일 수정. (단어수 밴드 WARN은 근접하면 허용)

5) 한 줄만 반환: "${slug} ✓ <pages>p <words>w qa:OK" 또는 "${slug} ✗ <남은 에러>".`;

const SEED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slug: { type: 'string' },
    ok: { type: 'boolean', description: 'qa-seed --book 가 ERROR 0으로 통과했는지' },
    pages: { type: 'integer' },
    words: { type: 'integer' },
    note: { type: 'string', description: '실패 시 남은 에러 요약, 성공 시 빈 문자열' },
  },
  required: ['slug', 'ok'],
};

const results = await pipeline(
  slugs,
  (slug) => agent(promptFor(slug), {
    label: slug,
    phase: 'Author',
    model: 'sonnet',
    agentType: 'general-purpose',
    schema: SEED_SCHEMA,
  }),
);

const done = results.filter(Boolean);
const ok = done.filter((r) => r.ok);
const bad = done.filter((r) => !r.ok);
log(`완료: ${ok.length}/${slugs.length} OK · 실패 ${bad.length}`);
return {
  total: slugs.length,
  ok: ok.map((r) => r.slug),
  bad: bad.map((r) => ({ slug: r.slug, note: r.note || '' })),
  nullCount: results.length - done.length,
};
