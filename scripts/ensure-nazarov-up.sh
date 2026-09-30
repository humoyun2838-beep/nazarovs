#!/usr/bin/env bash
# One-shot: Next.js + tunnel supervisor + public mapping must be up.
# Cron and the keep loop call this. Safe to run every few seconds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${NAZAROV_PORT:-3847}"
PUBLIC="https://${NAZAROV_TUNNEL_SUBDOMAIN:-nazarov}.tunn3l.sh"
LOCAL="http://127.0.0.1:${PORT}"
LOG="/tmp/nazarov-keep.log"
FAIL_FILE="/tmp/nazarov-public-fail.count"
TMUX_CONF="/exec-daemon/tmux.portal.conf"

tmux_cmd() {
  if [ -f "$TMUX_CONF" ]; then
    tmux -f "$TMUX_CONF" "$@"
  else
    tmux "$@"
  fi
}

log() {
  echo "$(date -Is) $*" >> "$LOG"
}

ensure_session() {
  local name="$1"
  tmux_cmd has-session -t "=$name" 2>/dev/null && return 0
  tmux_cmd new-session -d -s "$name" -c "$ROOT" -- "${SHELL:-bash}" -l
  sleep 0.3
}

http_code() {
  local url="$1"
  local out
  out="$(curl -sS -o /tmp/nazarov-keep-body.txt -w '%{http_code}' \
    --max-time 6 -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
    "$url" 2>/dev/null || true)"
  case "$out" in
    [0-9][0-9][0-9]) printf '%s' "$out" ;;
    *) printf '000' ;;
  esac
}

next_ok() {
  [ "$(http_code "${LOCAL}/api/health")" = "200" ]
}

# Match the real supervisor argv only — not this script's own process list.
supervisor_ok() {
  ps -eo args= | grep -E '(^|/)bash scripts/start-stable-tunnel\.sh$' >/dev/null
}

public_ok() {
  [ "$(http_code "${PUBLIC}/api/health?k=$(date +%s%N)")" = "200" ]
}

mapping_missing() {
  grep -qi 'No tunnel found' /tmp/nazarov-keep-body.txt 2>/dev/null
}

start_next() {
  if next_ok; then return 0; fi
  ensure_session nazarov-next
  log "starting Next.js on ${PORT}"
  (
    cd "$ROOT"
    nohup npm run start >>/tmp/nazarov-next.log 2>&1 </dev/null &
  )
  local i=0
  while (( i < 25 )); do
    if next_ok; then return 0; fi
    sleep 0.4
    i=$((i + 1))
  done
}

start_supervisor() {
  if supervisor_ok; then return 0; fi
  ensure_session tunn3l-nazarov
  log "starting tunnel supervisor"
  (
    cd "$ROOT"
    nohup bash scripts/start-stable-tunnel.sh </dev/null >>/tmp/nazarov-tunn3l-supervisor.out 2>&1 &
  )
}

start_keep() {
  if ps -eo args= | grep -E '(^|/)bash scripts/keep-nazarov-url\.sh$' >/dev/null; then
    return 0
  fi
  log "starting keep loop"
  (
    cd "$ROOT"
    nohup bash scripts/keep-nazarov-url.sh </dev/null >>/tmp/nazarov-keep.log 2>&1 &
  )
}

start_next
start_supervisor
start_keep

if public_ok; then
  echo 0 > "$FAIL_FILE"
  exit 0
fi

fail=0
if [ -f "$FAIL_FILE" ]; then
  fail="$(cat "$FAIL_FILE" 2>/dev/null || echo 0)"
fi
case "$fail" in
  [0-9]*) ;;
  *) fail=0 ;;
esac
fail=$((fail + 1))
echo "$fail" > "$FAIL_FILE"
log "public down ${fail} code=$(head -c 80 /tmp/nazarov-keep-body.txt | tr '\n' ' ')"

if ! supervisor_ok; then
  start_supervisor
  exit 0
fi

# Let the supervisor reconnect first. Only nudge the client if it is stuck.
if mapping_missing && (( fail >= 3 )); then
  log "mapping missing, restarting tunn3l client"
  pkill -f '/.tunn3l/bin/tunn3l http 3847' 2>/dev/null || true
  echo 0 > "$FAIL_FILE"
  exit 0
fi

if (( fail >= 6 )); then
  log "public still down, restarting tunn3l client"
  pkill -f '/.tunn3l/bin/tunn3l http 3847' 2>/dev/null || true
  echo 0 > "$FAIL_FILE"
fi

exit 0
