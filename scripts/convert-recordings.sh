#!/bin/bash
# Convert Playwright WebM recordings to MP4 (and optionally GIF)
# Outputs to e2e-recordings/ organized by phase/track.
#
# Usage:
#   ./scripts/convert-recordings.sh [--gif] [--output-dir <dir>] [--phase <1-5>] [--track <A|B|C>] [--scenario <1-27>]
#
# Examples:
#   ./scripts/convert-recordings.sh                     # Convert all recordings
#   ./scripts/convert-recordings.sh --gif               # Convert all + GIF
#   ./scripts/convert-recordings.sh --phase 3           # Track A only
#   ./scripts/convert-recordings.sh --track B           # Track B only
#   ./scripts/convert-recordings.sh --scenario 10       # Scenario 10 only
#   ./scripts/convert-recordings.sh --gif --track A     # Track A with GIF
set -euo pipefail

GIF_MODE=false
OUTPUT_DIR="e2e-recordings"
PHASE_FILTER=""
TRACK_FILTER=""
SCENARIO_FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gif) GIF_MODE=true; shift ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --phase) PHASE_FILTER="$2"; shift 2 ;;
    --track) TRACK_FILTER="$2"; shift 2 ;;
    --scenario) SCENARIO_FILTER="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Check ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is required but not installed."
  echo "Install via: brew install ffmpeg"
  exit 1
fi

# Map scenario numbers to output subdirectories
get_subdir() {
  local name="$1"
  # Check for trip-type keywords FIRST (before phase catch-all)
  # This handles Phase 1 multi-city, Phase 6 truncated names, etc.
  if echo "$name" | grep -qi "multi.city\|Multi-city\|multicity"; then
    echo "track-c-multi-city"
  elif echo "$name" | grep -qi "round.trip\|Round-trip\|roundtrip"; then
    echo "track-b-round-trip"
  elif echo "$name" | grep -qi "one.way\|One-way\|oneway"; then
    echo "track-a-one-way"
  elif echo "$name" | grep -qi "phase1\|flight-requests"; then
    echo "phase1-flight-requests"
  elif echo "$name" | grep -qi "phase2\|ambiguous"; then
    echo "phase2-ambiguous-requests"
  elif echo "$name" | grep -qi "phase3\|oneway-lifecycle\|one-way-lifecycle"; then
    echo "track-a-one-way"
  elif echo "$name" | grep -qi "phase4\|roundtrip-lifecycle\|round-trip-lifecycle"; then
    echo "track-b-round-trip"
  elif echo "$name" | grep -qi "phase5\|multicity-lifecycle\|multi-city-lifecycle"; then
    echo "track-c-multi-city"
  elif echo "$name" | grep -qi "phase6\|trip-type"; then
    # Legacy phase6 spec — route to appropriate track by trip type
    if echo "$name" | grep -qi "round"; then
      echo "track-b-round-trip"
    elif echo "$name" | grep -qi "multi"; then
      echo "track-c-multi-city"
    else
      echo "track-a-one-way"
    fi
  else
    # Fallback — put in root output dir
    echo ""
  fi
}

# Check if a file matches the current filter
matches_filter() {
  local name="$1"
  local subdir
  subdir=$(get_subdir "$name")

  # Scenario filter — match by scenario number in filename
  if [[ -n "$SCENARIO_FILTER" ]]; then
    if echo "$name" | grep -qi "scenario.*${SCENARIO_FILTER}\b\|Scenario ${SCENARIO_FILTER}[^0-9]"; then
      return 0
    fi
    return 1
  fi

  # Track filter (use tr for bash 3.2 compat on macOS)
  if [[ -n "$TRACK_FILTER" ]]; then
    local upper_track
    upper_track=$(echo "$TRACK_FILTER" | tr '[:lower:]' '[:upper:]')
    case "$upper_track" in
      A) [[ "$subdir" == "track-a-one-way" ]] && return 0 ;;
      B) [[ "$subdir" == "track-b-round-trip" ]] && return 0 ;;
      C) [[ "$subdir" == "track-c-multi-city" ]] && return 0 ;;
    esac
    return 1
  fi

  # Phase filter
  if [[ -n "$PHASE_FILTER" ]]; then
    case "$PHASE_FILTER" in
      1) [[ "$subdir" == "phase1-flight-requests" ]] && return 0 ;;
      2) [[ "$subdir" == "phase2-ambiguous-requests" ]] && return 0 ;;
      3) [[ "$subdir" == "track-a-one-way" ]] && return 0 ;;
      4) [[ "$subdir" == "track-b-round-trip" ]] && return 0 ;;
      5) [[ "$subdir" == "track-c-multi-city" ]] && return 0 ;;
    esac
    return 1
  fi

  # No filter — match everything
  return 0
}

# Convert a single WebM file
convert_one() {
  local webm="$1"
  local output_dir="$2"
  local gif_mode="$3"

  # Derive unique name from parent directory (Playwright names all videos "video.webm")
  local parent_dir
  parent_dir=$(basename "$(dirname "$webm")")
  local name="${parent_dir}"

  # Determine output subdirectory
  local subdir
  subdir=$(get_subdir "$name")

  local target_dir="$output_dir"
  if [[ -n "$subdir" ]]; then
    target_dir="${output_dir}/${subdir}"
  fi
  mkdir -p "$target_dir"

  # WebM -> MP4
  echo "Converting: $webm"
  echo "  -> ${target_dir}/${name}.mp4"
  ffmpeg -y -i "$webm" -c:v libx264 -preset fast -crf 23 "${target_dir}/${name}.mp4" 2>/dev/null
  echo "  Done."

  # WebM -> GIF (optional)
  if [ "$gif_mode" = "true" ]; then
    echo "  -> ${target_dir}/${name}.gif"
    ffmpeg -y -i "$webm" \
      -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      "${target_dir}/${name}.gif" 2>/dev/null
    echo "  Done."
  fi
  echo ""
}

# Count recordings (respecting filters)
TOTAL=0
MATCHED=0

while IFS= read -r webm; do
  TOTAL=$((TOTAL + 1))
  parent_dir=$(basename "$(dirname "$webm")")
  if matches_filter "$parent_dir"; then
    MATCHED=$((MATCHED + 1))
  fi
done < <(find test-results -name "*.webm" 2>/dev/null)

if [ "$TOTAL" -eq 0 ]; then
  echo "No WebM recordings found in test-results/."
  echo "Run 'npm run test:e2e:demo' first to generate recordings."
  exit 0
fi

if [ "$MATCHED" -eq 0 ]; then
  echo "Found $TOTAL WebM recording(s) but none match the current filter."
  [[ -n "$PHASE_FILTER" ]] && echo "  --phase $PHASE_FILTER"
  [[ -n "$TRACK_FILTER" ]] && echo "  --track $TRACK_FILTER"
  [[ -n "$SCENARIO_FILTER" ]] && echo "  --scenario $SCENARIO_FILTER"
  exit 0
fi

echo "Converting $MATCHED of $TOTAL recording(s)..."
[[ -n "$PHASE_FILTER" ]] && echo "  Filter: --phase $PHASE_FILTER"
[[ -n "$TRACK_FILTER" ]] && echo "  Filter: --track $TRACK_FILTER"
[[ -n "$SCENARIO_FILTER" ]] && echo "  Filter: --scenario $SCENARIO_FILTER"
echo ""

# Process each matching file
while IFS= read -r webm; do
  parent_dir=$(basename "$(dirname "$webm")")
  if matches_filter "$parent_dir"; then
    convert_one "$webm" "$OUTPUT_DIR" "$GIF_MODE"
  fi
done < <(find test-results -name "*.webm" 2>/dev/null)

echo "All recordings saved to: $OUTPUT_DIR"
echo ""
echo "Directory contents:"
find "$OUTPUT_DIR" -type f \( -name "*.mp4" -o -name "*.gif" \) -exec ls -lh {} \; 2>/dev/null | sort
