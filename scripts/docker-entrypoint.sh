#!/bin/sh
set -eu
DATA_DIR="${DATA_DIR:-${RAILWAY_VOLUME_MOUNT_PATH:-/app/data}}"
mkdir -p "${DATA_DIR}/chat-media"
if [ ! -f "${DATA_DIR}/nazarov.db" ]; then
  echo "[nazarov] seeding ${DATA_DIR}/nazarov.db"
  cp /app/seed/nazarov.db "${DATA_DIR}/nazarov.db"
fi
exec node scripts/start-server.cjs
