#!/usr/bin/env bash
# 학교 허브(daum 계정) 배포·명령 — 로그인 이메일이 daum 이 아니면 멈춘다(계정이 조용히 바뀌는 사고 — 메모리 wrangler-login-switches-accounts-silently).
# 사용: tools/hub.sh deploy | tools/hub.sh <wrangler 인자…>
set -euo pipefail
cd "$(dirname "$0")/../hub"
H="$HOME/.cf-homes/daum"; [ -d "$H" ] && export HOME="$H"
who=$(npx wrangler whoami 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'email [^ ]*' | head -1 | cut -d' ' -f2 | sed 's/\.$//')
[ "$who" = "simssijjang@daum.net" ] || { echo "❌ 허브는 daum 계정 전용 — 지금 로그인: ${who:-없음}"; exit 3; }
# 🔴 echotale 특수 케이스: 게임 앱 루트에 OpenNext 가 만든 wrangler.jsonc(워커 이름 echotale · gmail 계정)가 있어서
#    --config 없이 부르면 cwd(hub/)를 무시하고 그 루트 설정으로 새 다른 계정 워커를 건드린다(실측: 10000 인증오류 · echotale 워커로 시도).
exec npx wrangler --config ./wrangler.toml "$@"
