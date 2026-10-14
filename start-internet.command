#!/bin/zsh
cd "${0:A:h}"
export PATH="/Users/apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
mkdir -p artifacts/public-access
if ! curl -fsS --max-time 2 http://127.0.0.1:3850/api/health >/dev/null; then
  nohup ./start-codex.command >artifacts/public-access/server.log 2>&1 </dev/null &
  for i in {1..20}; do
    curl -fsS --max-time 2 http://127.0.0.1:3850/api/health >/dev/null 2>&1 && break
    sleep 1
  done
fi
if [[ -f artifacts/public-access/tunnel.pid ]] && kill -0 "$(cat artifacts/public-access/tunnel.pid)" 2>/dev/null && ! grep -Eq 'Unauthorized: Tunnel not found|Tunnel server stopped' artifacts/public-access/tunnel.log; then
  echo 'Internet ulanishi allaqachon ishlayapti.'
else
  nohup ./.tools/cloudflared tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:3850 >artifacts/public-access/tunnel.log 2>&1 </dev/null &
  echo $! >artifacts/public-access/tunnel.pid
fi
for i in {1..30}; do
  PUBLIC_URL=$(sed -nE 's/.*(https:\/\/[a-z0-9-]+\.trycloudflare\.com).*/\1/p' artifacts/public-access/tunnel.log | head -1)
  if [[ -n "$PUBLIC_URL" ]]; then
    printf 'Mijoz: %s/nazarov\nAdmin: %s/admin/login\nOperator: %s/operator\n' "$PUBLIC_URL" "$PUBLIC_URL" "$PUBLIC_URL" | tee artifacts/public-access/urls.txt
    wait
    exit 0
  fi
  sleep 1
done
echo 'Tunnel hali tayyor emas. artifacts/public-access/tunnel.log faylini tekshiring.'
exit 1
