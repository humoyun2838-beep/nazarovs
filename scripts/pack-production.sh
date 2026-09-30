#!/usr/bin/env bash
# Build a production handoff zip (source + catalog DB, no node_modules).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%d)"
NAME="nazarov-uz"
STAGE="/tmp/${NAME}-pack-$$"
OUT_DIR="${1:-/opt/cursor/artifacts}"
ZIP="${OUT_DIR}/${NAME}-ishlab-chiqarish-${STAMP}.zip"

mkdir -p "$STAGE/$NAME" "$OUT_DIR"

tar -C "$ROOT" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=data \
  --exclude=artifacts \
  --exclude='*.zip' \
  --exclude=.env \
  --exclude=.DS_Store \
  --exclude=coverage \
  --exclude=tsconfig.tsbuildinfo \
  -cf - . | tar -C "$STAGE/$NAME" -xf -

mkdir -p "$STAGE/$NAME/data/chat-media" "$STAGE/$NAME/public/media"
: > "$STAGE/$NAME/data/chat-media/.gitkeep"
: > "$STAGE/$NAME/public/media/.gitkeep"

DB_SRC="${ROOT}/data/nazarov.db"
if [[ -f "$DB_SRC" ]]; then
  sqlite3 "$DB_SRC" ".backup '${STAGE}/${NAME}/data/nazarov.db'"
  sqlite3 "$STAGE/$NAME/data/nazarov.db" "DELETE FROM chat_messages; DELETE FROM chat_sessions; VACUUM;"
fi

{
  echo "Nazarov sayt nusxasi"
  echo "Sana (UTC): $(date -u +%FT%TZ)"
  echo "Bo‘limlar: $(sqlite3 "$STAGE/$NAME/data/nazarov.db" 'SELECT COUNT(*) FROM categories;')"
  echo "Darslar: $(sqlite3 "$STAGE/$NAME/data/nazarov.db" 'SELECT COUNT(*) FROM materials;')"
  echo "Chat (tozalangan): $(sqlite3 "$STAGE/$NAME/data/nazarov.db" 'SELECT COUNT(*) FROM chat_sessions;')"
  echo
  echo "Avval ISHGA_TUSHIRISH.md ni o‘qing."
} > "$STAGE/$NAME/SNAPSHOT.txt"

(
  cd "$STAGE"
  zip -qr "$ZIP" "$NAME"
)

rm -rf "$STAGE"
ls -lh "$ZIP"
echo "$ZIP"
