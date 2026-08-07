/**
 * 녹화 재현성용 — 페이지의 Math.random 을 시드 PRNG(mulberry32)로 고정한다.
 * 단어 문제는 4지선다를 Math.random 으로 섞으므로, 고정하지 않으면 매 테이크마다
 * 정답 위치가 바뀌어 "정답 → 초록 / 오답 → 해설 공개" 연출을 스크립트로 짤 수 없다.
 * 앱 로직은 건드리지 않는다(주입은 브라우저 컨텍스트 한정).
 */
export const seedRandom = (seed) => {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
