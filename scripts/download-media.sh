#!/usr/bin/env bash
# One-time script to download images from the old thecanestreet.it WordPress site.
# Uses -k to bypass the expired SSL certificate.
# Run from the project root: bash scripts/download-media.sh

set -e
BASE="https://thecanestreet.it/wp-content/uploads"
DEST="./downloaded-media"

mkdir -p "$DEST"
echo "Downloading images to $DEST ..."

download() {
  local url="$BASE/$1"
  local filename=$(basename "$1")
  echo "  → $filename"
  curl -skL --insecure "$url" -o "$DEST/$filename"
}

# Staff photos
download "2022/04/michi.jpeg"
download "2022/04/lori.jpeg"
download "2022/04/fede.jpeg"
download "2022/04/marcone.jpeg"
download "2022/04/ricco.jpeg"

# Edition covers
download "2022/04/edition1.jpg"
download "2022/04/edition2.jpg"
download "2022/04/edition3-scaled.jpeg"
download "2025/08/cover-2025.jpg"

# News article covers
download "2022/04/article1-scaled.jpeg"
download "2022/04/article2-scaled.jpeg"
download "2022/04/article3-scaled.jpeg"
download "2022/04/article4-scaled.jpeg"
download "2022/04/article5-scaled.jpeg"
download "2025/06/Breaking-news.png"

echo ""
echo "Done! $(ls "$DEST" | wc -l | tr -d ' ') files downloaded to $DEST"
echo ""
echo "Next step — run this to create the bucket and upload (after supabase start):"
echo "  bash scripts/upload-media.sh"
