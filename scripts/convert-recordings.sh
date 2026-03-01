#!/bin/bash
# Convert Playwright WebM recordings to MP4 (and optionally GIF)
# Usage: ./scripts/convert-recordings.sh [--gif] [--output-dir <dir>]
set -euo pipefail

GIF_MODE=false
OUTPUT_DIR="e2e-screenshots/recordings"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gif) GIF_MODE=true; shift ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Check ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is required but not installed."
  echo "Install via: brew install ffmpeg"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Find all WebM files in test-results
shopt -s globstar nullglob
FOUND=0
for webm in test-results/**/*.webm; do
  FOUND=1
  name=$(basename "${webm%.webm}")

  # WebM -> MP4
  echo "Converting: $webm -> $OUTPUT_DIR/${name}.mp4"
  ffmpeg -y -i "$webm" -c:v libx264 -preset fast -crf 23 "$OUTPUT_DIR/${name}.mp4" 2>/dev/null
  echo "  Created: $OUTPUT_DIR/${name}.mp4"

  # WebM -> GIF (optional)
  if [ "$GIF_MODE" = true ]; then
    echo "  Converting to GIF..."
    ffmpeg -y -i "$webm" \
      -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      "$OUTPUT_DIR/${name}.gif" 2>/dev/null
    echo "  Created: $OUTPUT_DIR/${name}.gif"
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No WebM recordings found in test-results/."
  echo "Run 'npm run test:e2e:demo' first to generate recordings."
  exit 0
fi

echo ""
echo "All recordings saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
