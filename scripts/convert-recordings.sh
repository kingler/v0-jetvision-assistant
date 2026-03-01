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

# Convert a single WebM file (called by find -exec)
convert_one() {
  local webm="$1"
  local output_dir="$2"
  local gif_mode="$3"

  # Derive unique name from parent directory (Playwright names all videos "video.webm")
  local parent_dir
  parent_dir=$(basename "$(dirname "$webm")")
  local name="${parent_dir}"

  # WebM -> MP4
  echo "Converting: $webm"
  echo "  -> ${output_dir}/${name}.mp4"
  ffmpeg -y -i "$webm" -c:v libx264 -preset fast -crf 23 "${output_dir}/${name}.mp4" 2>/dev/null
  echo "  Done."

  # WebM -> GIF (optional)
  if [ "$gif_mode" = "true" ]; then
    echo "  -> ${output_dir}/${name}.gif"
    ffmpeg -y -i "$webm" \
      -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      "${output_dir}/${name}.gif" 2>/dev/null
    echo "  Done."
  fi
  echo ""
}
export -f convert_one

# Count recordings
COUNT=$(find test-results -name "*.webm" 2>/dev/null | wc -l | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
  echo "No WebM recordings found in test-results/."
  echo "Run 'npm run test:e2e:demo' first to generate recordings."
  exit 0
fi

echo "Found $COUNT WebM recording(s). Converting..."
echo ""

# Process each file
find test-results -name "*.webm" -exec /bin/bash -c 'convert_one "$1" "$2" "$3"' _ {} "$OUTPUT_DIR" "$GIF_MODE" \;

echo "All recordings saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
