#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_CMD="${SUPABASE_CMD:-supabase}"

if ! command -v "$SUPABASE_CMD" >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install it first or set SUPABASE_CMD to a custom path." >&2
  exit 1
fi

echo "Applying Vision Board V2 migrations..."

"$SUPABASE_CMD" db execute --file "$ROOT_DIR/supabase/migrations/0101_vision_core.sql"
"$SUPABASE_CMD" db execute --file "$ROOT_DIR/supabase/migrations/0102_sharing_push.sql"
"$SUPABASE_CMD" db execute --file "$ROOT_DIR/supabase/migrations/0103_gratitude_mood.sql"

echo "Done. Next: create the Vision Board storage bucket migration if needed (see 0124_vision_board_storage_bucket.sql)."
