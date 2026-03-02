#!/bin/bash
# Combine MP4 and GIF recordings into continuous full-demo videos.
#
# 1. All MP4s in e2e-recordings/ → e2e-recordings/full-demo/full-demo.mp4
# 2. All GIFs in e2e-recordings/ → e2e-recordings/full-demo/full-demo.gif
#    → also converts to e2e-recordings/full-demo/full-demo-from-gif.mp4
#
# Usage:
#   ./scripts/combine-recordings.sh                     # Combine all MP4s + all GIFs
#   ./scripts/combine-recordings.sh --mp4-only          # Combine MP4s only
#   ./scripts/combine-recordings.sh --gif-only          # Combine GIFs only
#   ./scripts/combine-recordings.sh --source-dir <dir>  # Custom source directory
#
# Requires: ffmpeg (brew install ffmpeg)
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RECORDINGS_DIR="$SCRIPT_DIR/e2e-recordings"
OUTPUT_DIR="$SCRIPT_DIR/e2e-recordings/full-demo"
DO_MP4=true
DO_GIF=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mp4-only)  DO_GIF=false; shift ;;
    --gif-only)  DO_MP4=false; shift ;;
    --source-dir) RECORDINGS_DIR="$(cd "$2" && pwd)"; shift 2 ;;
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

TMPDIR_COMBINE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_COMBINE"' EXIT

# ─── Combine MP4s ────────────────────────────────────────────────────────────

if [ "$DO_MP4" = true ]; then
  echo "=== Combining MP4 recordings ==="
  echo ""

  # Collect all MP4 files using absolute paths (exclude full-demo/ output dir)
  MP4_LIST="$TMPDIR_COMBINE/mp4-list.txt"
  : > "$MP4_LIST"

  while IFS= read -r mp4; do
    # Skip files already in full-demo/
    case "$mp4" in
      */full-demo/*) continue ;;
    esac
    echo "  Found: $(basename "$mp4")"
    echo "file '$mp4'" >> "$MP4_LIST"
  done < <(find "$RECORDINGS_DIR" -name "*.mp4" -type f 2>/dev/null | sort)

  MP4_COUNT=$(wc -l < "$MP4_LIST" | tr -d ' ')

  if [ "$MP4_COUNT" -eq 0 ]; then
    echo "  No MP4 files found in $RECORDINGS_DIR"
  else
    echo ""
    echo "  Combining $MP4_COUNT MP4 files..."

    # Check if all MP4s share the same resolution
    FIRST_RES=""
    NEEDS_REENCODE=false
    while IFS= read -r line; do
      mp4="${line#file \'}"
      mp4="${mp4%\'}"
      res=$(ffprobe -v error -select_streams v:0 \
        -show_entries stream=width,height \
        -of csv=p=0:s=x "$mp4" 2>/dev/null || echo "unknown")
      if [ -z "$FIRST_RES" ]; then
        FIRST_RES="$res"
      elif [ "$res" != "$FIRST_RES" ]; then
        NEEDS_REENCODE=true
        break
      fi
    done < "$MP4_LIST"

    OUTPUT_MP4="$OUTPUT_DIR/full-demo.mp4"

    if [ "$NEEDS_REENCODE" = true ]; then
      echo "  Mixed resolutions detected — re-encoding all to 1280x720..."
      NORM_LIST="$TMPDIR_COMBINE/mp4-norm-list.txt"
      : > "$NORM_LIST"
      IDX=0
      while IFS= read -r line; do
        mp4="${line#file \'}"
        mp4="${mp4%\'}"
        NORM_FILE="$TMPDIR_COMBINE/norm-${IDX}.mp4"
        ffmpeg -y -i "$mp4" \
          -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
          -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
          "$NORM_FILE" 2>/dev/null
        echo "file '$NORM_FILE'" >> "$NORM_LIST"
        IDX=$((IDX + 1))
      done < "$MP4_LIST"
      ffmpeg -y -f concat -safe 0 -i "$NORM_LIST" -c copy "$OUTPUT_MP4" 2>/dev/null
    else
      echo "  All MP4s are ${FIRST_RES} — stream-copying (fast)..."
      ffmpeg -y -f concat -safe 0 -i "$MP4_LIST" -c copy "$OUTPUT_MP4" 2>/dev/null
    fi

    DURATION=$(ffprobe -v error -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_MP4" 2>/dev/null || echo "?")
    SIZE=$(ls -lh "$OUTPUT_MP4" | awk '{print $5}')
    echo "  -> $OUTPUT_MP4"
    echo "     Duration: ${DURATION}s  Size: ${SIZE}"
    echo ""
  fi
fi

# ─── Combine GIFs ────────────────────────────────────────────────────────────

if [ "$DO_GIF" = true ]; then
  echo "=== Combining GIF recordings ==="
  echo ""

  # Collect all GIF files using absolute paths (exclude full-demo/ output dir)
  GIF_FILES=()
  while IFS= read -r gif; do
    case "$gif" in
      */full-demo/*) continue ;;
    esac
    echo "  Found: $(basename "$gif")"
    GIF_FILES+=("$gif")
  done < <(find "$RECORDINGS_DIR" -name "*.gif" -type f 2>/dev/null | sort)

  GIF_COUNT=${#GIF_FILES[@]}

  if [ "$GIF_COUNT" -eq 0 ]; then
    echo "  No GIF files found in $RECORDINGS_DIR"
  else
    echo ""
    echo "  Normalizing $GIF_COUNT GIFs to 800x450 and concatenating..."

    # Convert each GIF to a normalized temp MP4 at 800x450
    GIFNORM_LIST="$TMPDIR_COMBINE/gifnorm-list.txt"
    : > "$GIFNORM_LIST"
    IDX=0
    for gif in "${GIF_FILES[@]}"; do
      echo "    [$((IDX + 1))/$GIF_COUNT] $(basename "$gif")"
      NORM_FILE="$TMPDIR_COMBINE/gifnorm-${IDX}.mp4"
      ffmpeg -y -i "$gif" \
        -vf "scale=800:450:force_original_aspect_ratio=decrease,pad=800:450:(ow-iw)/2:(oh-ih)/2" \
        -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
        -r 25 \
        "$NORM_FILE" 2>/dev/null
      echo "file '$NORM_FILE'" >> "$GIFNORM_LIST"
      IDX=$((IDX + 1))
    done

    # Concat the normalized MP4s
    echo ""
    echo "  Concatenating normalized segments..."
    COMBINED_MP4="$TMPDIR_COMBINE/combined-gif.mp4"
    ffmpeg -y -f concat -safe 0 -i "$GIFNORM_LIST" -c copy "$COMBINED_MP4" 2>/dev/null

    # Convert combined MP4 -> GIF
    OUTPUT_GIF="$OUTPUT_DIR/full-demo.gif"
    echo "  Converting to GIF (800x450, 10fps)..."
    ffmpeg -y -i "$COMBINED_MP4" \
      -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      "$OUTPUT_GIF" 2>/dev/null

    GIF_SIZE=$(ls -lh "$OUTPUT_GIF" | awk '{print $5}')
    GIF_DURATION=$(ffprobe -v error -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_GIF" 2>/dev/null || echo "?")
    echo "  -> $OUTPUT_GIF"
    echo "     Duration: ${GIF_DURATION}s  Size: ${GIF_SIZE}"

    # Also save the combined MP4 from the GIF sources
    OUTPUT_GIF_MP4="$OUTPUT_DIR/full-demo-from-gif.mp4"
    cp "$COMBINED_MP4" "$OUTPUT_GIF_MP4"
    MP4_SIZE=$(ls -lh "$OUTPUT_GIF_MP4" | awk '{print $5}')
    MP4_DURATION=$(ffprobe -v error -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_GIF_MP4" 2>/dev/null || echo "?")
    echo "  -> $OUTPUT_GIF_MP4"
    echo "     Duration: ${MP4_DURATION}s  Size: ${MP4_SIZE}"
    echo ""
  fi
fi

echo "=== Done ==="
echo ""
echo "Output files:"
find "$OUTPUT_DIR" -type f \( -name "*.mp4" -o -name "*.gif" \) -exec ls -lh {} \; 2>/dev/null | sort
