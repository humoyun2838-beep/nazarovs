#!/usr/bin/env bash
# Tight loop so https://nazarov.tunn3l.sh/nazarov stays mapped.
# Cron also runs ensure-nazarov-up.sh every minute if this loop dies.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="/tmp/nazarov-keep.lock"
LOG="/tmp/nazarov-keep.log"

exec 8>"$LOCK"
if ! flock -n 8; then
  echo "nazarov keep loop already running"
  exit 0
fi

install_cron() {
  if ! command -v crontab >/dev/null 2>&1; then
    echo "$(date -Is) crontab not installed; keep loop only" >> "$LOG"
    return 0
  fi
  local minute="* * * * * /bin/bash ${ROOT}/scripts/ensure-nazarov-up.sh >/tmp/nazarov-cron-ensure.log 2>&1"
  local reboot="@reboot sleep 8 && /bin/bash ${ROOT}/scripts/ensure-nazarov-up.sh >/tmp/nazarov-cron-ensure.log 2>&1"
  local current filtered
  current="$(crontab -l 2>/dev/null || true)"
  filtered="$(printf '%s\n' "$current" | grep -v 'ensure-nazarov-up.sh' || true)"
  {
    printf '%s\n' "$filtered" | grep -v '^$' || true
    printf '%s\n' "$minute"
    printf '%s\n' "$reboot"
  } | crontab -
}

trap '' HUP
install_cron || true
echo "$(date -Is) keep loop started" >> "$LOG"

while true; do
  bash "${ROOT}/scripts/ensure-nazarov-up.sh" || true
  sleep 3 8>&-
done
