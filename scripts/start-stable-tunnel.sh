#!/usr/bin/env bash
# Keep nazarov.tunn3l.sh mapped to local Next on 3847.
#
# The relay can drop `nazarov` while the local client stays alive. Heartbeat
# every 2s + a planned client refresh (~8h) keep the mapping from sitting
# through that cliff. A second keep-alive loop (keep-nazarov-url.sh) also
# calls ensure-nazarov-up.sh so a dead supervisor is restarted.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3847}"
SUBDOMAIN="${SUBDOMAIN:-nazarov}"
PUBLIC_HOST="${PUBLIC_HOST:-${SUBDOMAIN}.tunn3l.sh}"
TUNNEL_BIN="${HOME}/.tunn3l/bin/tunn3l"
LOG="${LOG:-/tmp/nazarov-tunn3l.log}"
LOCK="${LOCK:-/tmp/nazarov-tunn3l.lock}"
CFG="${HOME}/.tunn3l/config.json"
FAIL_STREAK=0
PUBLIC_OK_SINCE=0
LAST_PUBLIC_LOG=0
CLIENT_STARTED_AT=0
# Relay mapping has dropped around ~20h of one client process. Refresh earlier.
REFRESH_SECS="${REFRESH_SECS:-28800}"

exec 9>"${LOCK}"
if ! flock -n 9; then
  echo "[tunnel] already running (lock ${LOCK})"
  exit 0
fi

mkdir -p "$(dirname "${CFG}")"
cp "${ROOT}/scripts/tunn3l.config.json" "${CFG}"

: > "${LOG}"
echo "[tunnel] supervisor start $(date -u +%FT%TZ) port=${PORT} host=${PUBLIC_HOST}" | tee -a "${LOG}"

sleep_interruptible() {
  local secs="$1"
  local i=0
  while (( i < secs )); do
    sleep 1 9>&-
    i=$((i + 1))
  done
}

health_url() {
  printf 'https://%s/api/health?t=%s' "${PUBLIC_HOST}" "$(date +%s%N)"
}

catalog_url() {
  printf 'https://%s/nazarov?t=%s' "${PUBLIC_HOST}" "$(date +%s%N)"
}

public_http() {
  local url="$1"
  curl -sS -o /tmp/nazarov-tunn3l-health.body -w '%{http_code}' \
    --max-time 8 --retry 0 \
    -H 'Cache-Control: no-cache' \
    -H 'Pragma: no-cache' \
    "${url}" 2>/tmp/nazarov-tunn3l-health.err || echo 000
}

body_snip() {
  if [[ -f /tmp/nazarov-tunn3l-health.body ]]; then
    tr '\n' ' ' </tmp/nazarov-tunn3l-health.body | head -c 160
  fi
}

local_ready() {
  curl -sf --max-time 2 "http://127.0.0.1:${PORT}/api/health" >/dev/null
}

start_tunnel() {
  if [[ ! -x "${TUNNEL_BIN}" ]]; then
    echo "[tunnel] missing ${TUNNEL_BIN}" | tee -a "${LOG}"
    exit 1
  fi
  echo "[tunnel] start ${TUNNEL_BIN} http ${PORT} --subdomain ${SUBDOMAIN} $(date -u +%FT%TZ)" >> "${LOG}"
  CLIENT_STARTED_AT="$(date +%s)"
  "${TUNNEL_BIN}" http "${PORT}" --subdomain "${SUBDOMAIN}" >> "${LOG}" 2>&1 9>&- &
  TUN_PID=$!
}

stop_tunnel() {
  if [[ -n "${TUN_PID:-}" ]] && kill -0 "${TUN_PID}" 2>/dev/null; then
    kill "${TUN_PID}" 2>/dev/null || true
    wait "${TUN_PID}" 2>/dev/null || true
  fi
  pkill -f "${TUNNEL_BIN} http ${PORT}" 2>/dev/null || true
  TUN_PID=""
}

wait_for_public() {
  local i=0
  while (( i < 45 )); do
    if [[ "$(public_http "$(health_url)")" == "200" ]]; then
      FAIL_STREAK=0
      PUBLIC_OK_SINCE="$(date +%s)"
      echo "[tunnel] public ready $(date -u +%FT%TZ) https://${PUBLIC_HOST}/nazarov" | tee -a "${LOG}"
      return 0
    fi
    sleep 1 9>&-
    i=$((i + 1))
  done
  echo "[tunnel] public not ready after wait $(date -u +%FT%TZ) body=$(body_snip)" | tee -a "${LOG}"
  return 1
}

trap '' HUP
trap 'stop_tunnel; exit 0' INT TERM

start_tunnel
wait_for_public || true

while true; do
  now="$(date +%s)"
  if ! kill -0 "${TUN_PID:-0}" 2>/dev/null; then
    echo "[tunnel] client died, restart $(date -u +%FT%TZ)" | tee -a "${LOG}"
    start_tunnel
    wait_for_public || true
    sleep 2 9>&-
    continue
  fi

  if ! local_ready; then
    echo "[tunnel] local origin down, wait $(date -u +%FT%TZ)" | tee -a "${LOG}"
    sleep 2 9>&-
    continue
  fi

  code="$(public_http "$(health_url)")"
  if [[ "${code}" == "200" ]]; then
    FAIL_STREAK=0
    if (( PUBLIC_OK_SINCE == 0 )); then
      PUBLIC_OK_SINCE="${now}"
    fi
    if (( now - LAST_PUBLIC_LOG >= 60 )); then
      echo "[tunnel] public live ${code} up=$((now - PUBLIC_OK_SINCE))s $(date -u +%FT%TZ) https://${PUBLIC_HOST}/nazarov" >> "${LOG}"
      LAST_PUBLIC_LOG="${now}"
    fi
    # Also hit the catalog so CDN/browser caches of a 404 do not linger.
    public_http "$(catalog_url)" >/dev/null || true
  else
    FAIL_STREAK=$((FAIL_STREAK + 1))
    PUBLIC_OK_SINCE=0
    echo "[tunnel] public ${code} fail=${FAIL_STREAK} $(date -u +%FT%TZ) body=$(body_snip)" | tee -a "${LOG}"
    if (( FAIL_STREAK >= 2 )); then
      echo "[tunnel] reconnect $(date -u +%FT%TZ)" | tee -a "${LOG}"
      stop_tunnel
      sleep 1 9>&-
      start_tunnel
      wait_for_public || true
      FAIL_STREAK=0
    fi
  fi

  if (( CLIENT_STARTED_AT > 0 )) && (( now - CLIENT_STARTED_AT >= REFRESH_SECS )); then
    echo "[tunnel] planned client refresh after $((now - CLIENT_STARTED_AT))s $(date -u +%FT%TZ)" | tee -a "${LOG}"
    stop_tunnel
    sleep 1 9>&-
    start_tunnel
    wait_for_public || true
  fi

  sleep_interruptible 2
done
