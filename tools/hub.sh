#!/usr/bin/env bash
# 학교 허브 배포·명령 — korea 계정(b3d436cf… · 2026-11-04 키트 허브 korea 이사).
#   로그인 이메일이 다르면 멈춘다(계정이 조용히 바뀌는 사고 — 메모리 wrangler-login-switches-accounts-silently).
# 🔴 저장소 루트의 wrangler.jsonc(Pages/OpenNext 용)가 있으면 wrangler 가 cwd(hub/)의 wrangler.toml 대신 그걸 집는다
#    → --config 로 hub/wrangler.toml 을 못 박는다(2026-11-03 루프파크·echotale 실측 · 키트 재설치가 이 보호를 지운 적 있음 11-04).
# 사용: tools/hub.sh deploy | tools/hub.sh <wrangler 인자…>
set -euo pipefail
cd "$(dirname "$0")/../hub"
H="$HOME/.cf-homes/korea"; [ -d "$H" ] && export HOME="$H"
export CLOUDFLARE_ACCOUNT_ID=b3d436cfca3fb9f2d1d7af777e23e8f1
WR="npx -y wrangler@4.149.0 --config $(pwd)/wrangler.toml"
who=$($WR whoami 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'email [^ ]*' | head -1 | cut -d' ' -f2 | sed 's/\.$//')
case "$who" in simssijjang@korea.kr|simssijjang+korea@gmail.com) ;; *) echo "❌ 이 허브는 korea 계정 전용 — 지금 로그인: ${who:-없음}"; exit 3;; esac
if [ "${1:-}" = deploy ]; then exec $WR deploy; fi
exec $WR "$@"
