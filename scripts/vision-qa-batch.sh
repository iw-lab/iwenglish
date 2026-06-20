#!/bin/zsh
# 신규 100권(daily-51~150) 페이지 이미지 3계열 vision QA 배치 (로컬VL+Gemini, 책별 resumable)
# 각 책 cover.png를 앵커로 해부학·캐릭터 드리프트 색출 → 책별 .vision-qa-3way.json에 Opus 재확인 큐 적립.
set -u
export LC_ALL=C
cd /Users/iw-lab/Documents/dev/iwenglish
LOG=.tqa-tmp/vqa.log
ENGINE=~/.claude/bin/vision-qa-3way.mjs
: > "$LOG"
echo "[vqa] $(date '+%m/%d %H:%M') 시작" >> "$LOG"

done=0
for d in public/seed/daily-*; do
  s=${d##*/}; num=${s#daily-}; num=${num%%-*}
  case "$num" in ''|*[!0-9]*) continue;; esac
  [ "$num" -lt 51 ] && continue
  [ -f "$d/cover.png" ] || { echo "[vqa] $s 커버없음 skip" >> "$LOG"; continue; }
  npng=$(ls "$d"/p*.png 2>/dev/null | wc -l | tr -d ' ')
  [ "$npng" -eq 0 ] && continue
  echo "[vqa] $s ($npng장) 검수..." >> "$LOG"
  node "$ENGINE" --dir "$d" --anchor "$d/cover.png" --glob "p*.png" --conc 3 >> "$LOG" 2>&1
  done=$((done+1))
done
echo "[vqa] $(date '+%m/%d %H:%M') 완료 — $done권 검수" >> "$LOG"

# 전 책 재확인 큐 집계
echo "[vqa] === Opus 재확인 큐 집계 ===" >> "$LOG"
node -e '
const fs=require("fs"),path=require("path");const PUB="public/seed";const hi=[],me=[],lo=[];
for(const s of fs.readdirSync(PUB)){const num=(s.match(/^daily-(\d+)/)||[])[1];if(!num||+num<51)continue;const rp=path.join(PUB,s,".vision-qa-3way.json");if(!fs.existsSync(rp))continue;let j;try{j=JSON.parse(fs.readFileSync(rp,"utf8"));}catch(e){continue;}
for(const [f,v] of Object.entries(j)){if(!v||!v.needs_opus)continue;const gl=(v.gemini&&v.gemini.text||"").split("\n").filter(l=>/HIGH/i.test(l)).slice(0,1).join("").slice(0,90);const line=`${s}/${f} [${v.confidence}] ${gl}`;if(v.confidence==="high")hi.push(line);else if(v.confidence==="med")me.push(line);else lo.push(line);}}
console.log(`재확인 큐 총 ${hi.length+me.length+lo.length}건 (high=${hi.length} med=${me.length} low=${lo.length})`);
console.log("--- HIGH ---\n"+hi.join("\n"));
console.log("--- MED ---\n"+me.join("\n"));
console.log("--- LOW(참고) ---\n"+lo.slice(0,40).join("\n"));
' >> "$LOG" 2>&1
echo "VQA_BATCH_DONE"
