#!/bin/zsh
# EchoTale 페이지 백필 루프: 현재 gen 패스 종료 대기 → missing=0/plateau까지 재실행
# gen-book-images.mjs는 png/webp 존재 시 skip → 재실행하면 실패분만 자동 재시도.
set -u
cd /Users/iw-lab/Documents/dev/iwenglish
LOG=.tqa-tmp/backfill.log
GENLOG=.tqa-tmp/gen.log
MAXPASS=12

miss() {
  node -e '
const fs=require("fs"),path=require("path");
const SEED="data/seed",PUB="public/seed";
let t=0;
for(const f of fs.readdirSync(SEED)){
  if(!f.endsWith(".json")||f.startsWith("_"))continue;
  const b=JSON.parse(fs.readFileSync(path.join(SEED,f),"utf8"));
  if(b.collection!=="daily")continue;
  const n=b.pages?.length||0,dir=path.join(PUB,b.slug);
  for(let i=1;i<=n;i++){if(!fs.existsSync(path.join(dir,`p${i}.png`))&&!fs.existsSync(path.join(dir,`p${i}.webp`)))t++;}
}
console.log(t);
'
}

echo "[backfill] $(date '+%H:%M:%S') 시작 — 현재 gen 패스 종료 대기" >> $LOG
while pgrep -f "gen-book-images" >/dev/null; do sleep 30; done
echo "[backfill] $(date '+%H:%M:%S') 1차 패스 종료 감지" >> $LOG

prev=-1; stall=0
for pass in $(seq 1 $MAXPASS); do
  m=$(miss)
  echo "[backfill] $(date '+%H:%M:%S') pass=$pass 시작전 결손=$m" >> $LOG
  if [ "$m" -eq 0 ]; then echo "[backfill] 🎉 결손 0 — 완료" >> $LOG; break; fi
  if [ "$m" -eq "$prev" ]; then
    stall=$((stall+1))
    if [ "$stall" -ge 2 ]; then echo "[backfill] ⛔ plateau(연속 진전없음) — codex 차단 추정, 중단. 남은결손=$m" >> $LOG; break; fi
  else
    stall=0
  fi
  prev=$m
  echo "[backfill] $(date '+%H:%M:%S') pass=$pass gen-book-images all 3 실행" >> $LOG
  node scripts/gen-book-images.mjs all 3 >> $GENLOG 2>&1
  after=$(miss)
  echo "[backfill] $(date '+%H:%M:%S') pass=$pass 종료 결손 $m → $after" >> $LOG
done
echo "[backfill] $(date '+%H:%M:%S') 루프 종료. 최종결손=$(miss)" >> $LOG
echo "BACKFILL_DONE final_missing=$(miss)"
