#!/usr/bin/env bash
# Run AFTER: supabase start && supabase db reset
# Creates the 'media' storage bucket and uploads all images.
# Run from the project root: bash scripts/upload-media.sh

set -e

# Use the env var if set, otherwise fall back to the default local Supabase service-role key.
# The default key is safe to hardcode — it only works against 127.0.0.1:54321 and is the
# same for every local Supabase instance (it's part of the open-source dev defaults).
SRK="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"
API="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}/storage/v1"
MEDIA="./downloaded-media"

echo "Creating 'media' storage bucket..."
curl -s -X POST "$API/bucket" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"id":"media","name":"media","public":true}' | grep -v message || true
echo ""

echo "Uploading images..."
for f in "$MEDIA"/*; do
  filename=$(basename "$f")
  case "${filename##*.}" in
    jpg|jpeg) ct="image/jpeg" ;;
    png) ct="image/png" ;;
    *) ct="application/octet-stream" ;;
  esac
  echo -n "  → $filename ... "
  curl -s -X POST "$API/object/media/$filename" \
    -H "Authorization: Bearer $SRK" \
    -H "Content-Type: $ct" \
    --data-binary "@$f" | grep -o '"Key":"[^"]*"' || echo "error"
done

echo ""
echo "Done! Run 'npm run dev' and visit http://localhost:3000"
