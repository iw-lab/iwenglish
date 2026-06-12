#!/usr/bin/env bash
# QA 확정 불량컷 재생성 w1~w6 순차 실행 (각 스크립트 내부 conc=1).
# 메인 생성 풀 완주 후에만 실행할 것. 로그: /tmp/echotale-regen-waves.log
cd /Users/iw-lab/Documents/dev/iwenglish || exit 1

for w in "" "-w2" "-w3" "-w4" "-w5" "-w6"; do
  f="scripts/regen-storybook-fixes${w}.mjs"
  echo "### WAVE ${f} $(date +%H:%M)"
  node "$f" || echo "### WARN ${f} 비정상 종료"
done

echo "### REGEN_ALL_DONE $(date +%H:%M)"
