/**
 * 굴절형 → 원형 후보 (사전 조회 폴백 전용).
 *
 * 왜 필요한가 — 공유 사전(dict.json)은 본문에 등장한 표면형을 그대로 키로 쓴다.
 * 책을 새로 넣고 `pnpm seed:worddict` 를 돌리지 않으면 그 책의 단어가 통째로
 * 사전에서 새고, 아이가 단어를 눌러도 한글 뜻이 안 뜬다(2026-08-25 실측: 977단어/92권).
 * 사전 재생성이 정공법이고, 이건 **다음에 또 새는 것을 막는 안전망**이다.
 *
 * 보수적으로 만든다 — 없는 뜻을 지어내는 것보다 못 찾는 게 낫다.
 * 불규칙 변화(went→go)는 다루지 않는다. 규칙 굴절만 벗긴다.
 */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  const push = (x: string) => {
    if (x.length >= 2 && x !== w && !out.includes(x)) out.push(x);
  };

  // 소유격 — dog's → dog, dogs' → dogs → dog
  if (w.endsWith("'s")) push(w.slice(0, -2));

  // 복수/3인칭 단수
  if (w.endsWith("ies") && w.length > 4) push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ves") && w.length > 4) {
    push(`${w.slice(0, -3)}f`);
    push(`${w.slice(0, -3)}fe`);
  }
  if (/(ches|shes|sses|xes|zes|oes)$/.test(w)) push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && w.length > 3)
    push(w.slice(0, -1));

  // 과거/과거분사
  if (w.endsWith("ied") && w.length > 4) push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ed") && w.length > 3) {
    push(w.slice(0, -1)); // liked → like
    push(w.slice(0, -2)); // walked → walk
    if (/([bdfglmnprt])\1ed$/.test(w)) push(w.slice(0, -3)); // stopped → stop
  }

  // 진행형
  if (w.endsWith("ing") && w.length > 4) {
    push(w.slice(0, -3)); // walking → walk
    push(`${w.slice(0, -3)}e`); // making → make
    if (/([bdgklmnprt])\1ing$/.test(w)) push(w.slice(0, -4)); // running → run
  }

  // 비교급·최상급
  if (w.endsWith("ier") && w.length > 4) push(`${w.slice(0, -3)}y`);
  if (w.endsWith("iest") && w.length > 5) push(`${w.slice(0, -4)}y`);
  if (w.endsWith("er") && w.length > 4) {
    push(w.slice(0, -2));
    push(w.slice(0, -1));
  }
  if (w.endsWith("est") && w.length > 5) {
    push(w.slice(0, -3));
    push(w.slice(0, -2));
  }

  // 부사 -ly
  if (w.endsWith("ily") && w.length > 4) push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ly") && w.length > 3) push(w.slice(0, -2));

  return out;
}
