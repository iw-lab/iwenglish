/**
 * 결정론 난수 — xorshift128.
 * 코어에서 Math.random() 을 직접 부르는 것은 금지다(gates.sh 가 grep 으로 막는다).
 * 같은 시드 → 같은 수열이어야 D-15(결정론)와 밸런스 프로브 재현이 성립한다.
 */
export function createRng(seed = 1) {
  // 시드 하나를 4워드로 흩뿌린다(splitmix32). 0 상태는 xorshift 를 영구 0 으로 만든다.
  let s = seed >>> 0 || 0x9e3779b9;
  const next32 = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  };
  let x = next32(), y = next32(), z = next32(), w = next32();
  if ((x | y | z | w) === 0) x = 0x9e3779b9;

  const nextUint = () => {
    const t = x ^ (x << 11);
    x = y; y = z; z = w;
    w = (w ^ (w >>> 19)) ^ (t ^ (t >>> 8));
    return w >>> 0;
  };

  return {
    /** [0,1) */
    next: () => nextUint() / 4294967296,
    /** [min,max) 실수 */
    range: (min, max) => min + (nextUint() / 4294967296) * (max - min),
    /** [min,max] 정수 */
    int: (min, max) => min + (nextUint() % (max - min + 1)),
    /** 평균 0, 대략 [-1,1] 삼각분포 — 예측 오차 샘플링용(정규분포 흉내) */
    jitter: () => (nextUint() / 4294967296 + nextUint() / 4294967296) - 1,
    /** 상태 저장/복원 — 리플레이·프로브 분기용 */
    getState: () => [x, y, z, w],
    setState: (st) => { [x, y, z, w] = st; },
  };
}
