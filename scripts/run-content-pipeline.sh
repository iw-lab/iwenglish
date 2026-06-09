#!/usr/bin/env bash
# 50권 음성→이미지 전체 양산 (백그라운드 무인 실행).
# 각 단계 실패해도 다음 단계로 진행(|| true). 진행은 ### PHASE 마커로 로깅.
cd /Users/iw-lab/Documents/dev/iwenglish || exit 1

echo "### PHASE worddict $(date +%H:%M)"
pnpm seed:worddict || echo "### WARN worddict"

echo "### PHASE words $(date +%H:%M)"
pnpm seed:words || echo "### WARN words"

echo "### PHASE audio $(date +%H:%M)"
node scripts/run-audio-batch.mjs || echo "### WARN audio"

echo "### PHASE content-audio $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-audio"

echo "### PHASE anchors $(date +%H:%M)"
node scripts/restore-cover-anchors.mjs || echo "### WARN anchors"

echo "### PHASE covers $(date +%H:%M)"
node scripts/gen-book-images.mjs covers 3 || echo "### WARN covers"

echo "### PHASE content-covers $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-covers"

echo "### PHASE pages $(date +%H:%M)"
node scripts/gen-book-images.mjs pages 3 || echo "### WARN pages"

echo "### PHASE optimize $(date +%H:%M)"
node scripts/optimize-images.mjs 8 || echo "### WARN optimize"

echo "### PHASE content-final $(date +%H:%M)"
pnpm seed:content || echo "### WARN content-final"

echo "### PIPELINE_DONE $(date +%H:%M)"
