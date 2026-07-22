import { BATCH3_PLAN } from "./storybook-batch3.mjs";
import { PLAN, CAST } from "./daily-expansion-plan.mjs";

const STORY_RULE = {
  preA1: { sent: "정확히 페이지당 1문장. 현재형 SVO, sight words, 반복 리듬. 4~6단어 짧은 문장.", wordsTol: 8 },
  A1:    { sent: "페이지당 1~2문장. and/but 연결, 과거형 도입, 짧은 대화 1~2개. 5~9단어.", wordsTol: 12 },
  A2:    { sent: "페이지당 2문장. because/when 사용, 문제→해결 흐름, 대화. 6~11단어.", wordsTol: 15 },
  B1:    { sent: "페이지당 2~3문장. 시제 혼합, 감정·묘사·주제의식, 풍부한 대화. 7~13단어.", wordsTol: 25 },
};
const DAILY_TARGET = { 1:{w:60,p:7}, 2:{w:105,p:8}, 3:{w:175,p:10}, 4:{w:185,p:10}, 5:{w:280,p:13}, 6:{w:290,p:13} };
const DAILY_SENT = {
  1:"정확히 페이지당 1문장. 현재형 SVO·반복. 주인공 Jun.",
  2:"페이지당 1~2문장. and/but·과거형·짧은 대화.",
  3:"페이지당 2문장. because/when·원인과 결과·감정.",
  4:"페이지당 2문장. 순차적 문제해결 흐름·대화.",
  5:"페이지당 2~3문장. 공동체 맥락·시제 혼합·주제의식.",
  6:"페이지당 2~3문장. 계획·성찰·원인과 결과, 풍부한 대화.",
};

const specs = [];
for (const b of BATCH3_PLAN) {
  specs.push({ kind:"storybook", slug:b.slug, title:b.title, title_ko:b.title_ko,
    level:b.level, ageBand:b.ageBand, targetPages:b.pages, targetWords:b.words,
    summary_ko:b.summary_ko, char:b.char, brief:b.brief,
    rule:STORY_RULE[b.level].sent, wordsTol:STORY_RULE[b.level].wordsTol });
}
for (const p of PLAN) {
  if (p.num < 151) continue;
  const t = DAILY_TARGET[p.stage];
  specs.push({ kind:"daily", slug:p.slug, title:p.title, title_ko:p.title_ko,
    level:p.level, ageBand:p.ageBand, stage:p.stage, collection:"daily",
    targetPages:t.p, targetWords:t.w, topic:p.topic,
    cast:p.cast.map((c)=>CAST[c]).filter(Boolean),
    rule:DAILY_SENT[p.stage], wordsTol:Math.round(t.w*0.15) });
}
console.log(JSON.stringify(specs));
process.stderr.write(`총 ${specs.length}권\n`);
