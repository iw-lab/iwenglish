"use client";

// 학교 대항 순위(school-hub 키트) — 정본 = src/gb/*.js(설치 그대로, 내용 수정 금지).
// 이 앱은 Next.js + OpenNext → Cloudflare Worker 직결 배포라 Pages Functions 중계(/api/hub)가 없다.
// 그래서 **직결(direct) 모드**만 쓴다: 배포 호스트(echotale.simssijjang-d79.workers.dev)에서는
// 허브 워커(echotale-hub.simssijjang-a04.workers.dev)로 바로 가고, 로컬(localhost 등)에서는
// 키트가 자동으로 상대경로 api/hub/ 로 떨어진다(이 앱엔 그 경로가 없으니 로컬에선 "허브 안 닿음"으로
// 조용히 넘어간다 — 학교 점수만 없을 뿐 학습 자체는 막지 않는다. README "직결" 섹션 참고).
//
// 🔴 전부 동적 import — 키트 JS 는 최상위에서 document 를 바로 읽는다(gb-fullscreen.js: `const d = document;`).
//    "use client" 컴포넌트도 Next.js 가 서버에서 한 번 프리렌더하므로, 정적 import 로 끌어오면
//    그 줄에서 "document is not defined" 로 빌드가 죽는다(실측: next build 가 /read/[slug] 전수 실패).
//    그래서 클라이언트에서 실제로 쓸 때만 받는다(처음 한 번만 — 모듈 캐시).
// 🔴 ensureBoot() — mountSchoolRank·gbGate 등은 전부 이걸 먼저 기다린다. SchoolHubBoot 와
//    SchoolRank 는 서로 다른 컴포넌트의 effect 라 어느 쪽이 먼저 돌지 보장이 없다 — configureHub
//    (cfg.base 를 직결 주소로 바꾸는 호출)보다 먼저 refreshSchoolRank 가 돌면 "me" 가 이 앱에
//    없는 상대경로 api/hub/me 로 나가 404 가 났다(실측: 첫 로드 콘솔에 404 1건). 호출마다 보장한다.
import type { GbResult } from "@/gb/gb-school.js";

const HUB_DIRECT = "https://echotale-hub.simssijjang-a04.workers.dev";

let schoolMod: typeof import("@/gb/gb-school.js") | null = null;
let hubnetMod: typeof import("@/gb/hubnet.js") | null = null;
let fsMod: typeof import("@/gb/gb-fullscreen.js") | null = null;

async function loadSchool() {
  if (!schoolMod) schoolMod = await import("@/gb/gb-school.js");
  return schoolMod;
}
async function loadHubnet() {
  if (!hubnetMod) hubnetMod = await import("@/gb/hubnet.js");
  return hubnetMod;
}
async function loadFullscreen() {
  if (!fsMod) fsMod = await import("@/gb/gb-fullscreen.js");
  return fsMod;
}

let bootPromise: Promise<void> | null = null;
function ensureBoot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const { configureHub } = await loadHubnet();
      configureHub({ key: "echotale.hub.v1", direct: HUB_DIRECT });
      // "단어 학습"(복습·단어장·레벨별) 덱 1판 = 이용권 1장. 문제 묶음 과목은 이 앱 주제에 맞춰 영어.
      const { configureSchool } = await loadSchool();
      configureSchool({ playWord: "학습", quizSubject: "eng" });
    })();
  }
  return bootPromise;
}

/** 부팅 시 한 번(SchoolHubBoot 가 호출) — 여러 번 불러도 안전(가드) */
export async function bootSchoolHub() {
  await ensureBoot();
}

export async function mountSchoolRank(el: HTMLElement) {
  await ensureBoot();
  const { mountSchoolRank: mount } = await loadSchool();
  mount(el);
}

export async function refreshSchoolRank() {
  await ensureBoot();
  const { refreshSchoolRank: refresh } = await loadSchool();
  await refresh();
}

export async function gbGate(
  go: (ref: string | null) => void,
  o?: { kind?: string; chain?: boolean },
) {
  await ensureBoot();
  const { gbGate: gate } = await loadSchool();
  await gate(go, o);
}

export async function gbFinish(
  ref: string | null,
  cleared: boolean,
): Promise<GbResult | null> {
  await ensureBoot();
  const { gbFinish: finish } = await loadSchool();
  return finish(ref, cleared);
}

export async function gbLeave(ref: string | null): Promise<GbResult | null> {
  await ensureBoot();
  const { gbLeave: leave } = await loadSchool();
  return leave(ref);
}

export async function bindFullscreenButton(btn: HTMLElement | null) {
  if (!btn) return;
  const { bindFullscreenButton: bind } = await loadFullscreen();
  bind(btn);
}
