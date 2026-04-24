#!/bin/bash

# Phase 3A: Image Optimization Build Script
# Generates WebP and responsive JPEG variants for all source images
# 
# Requirements:
# - cwebp: `brew install libwebp` or `apt-get install webp`
# - ImageMagick: `brew install imagemagick` or `apt-get install imagemagick`
# 
# Usage:
# ./frontend/build-assets.sh
# 
# Output:
# - public/images/optimized/*.webp (WebP variants, 30-40% smaller)
# - public/images/optimized/*.jpg (JPEG fallbacks)

set -e

INPUT_DIR="frontend/src/assets/images"
OUTPUT_DIR="frontend/public/images/optimized"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Phase 3A: Image Optimization${NC}"
echo "Input directory: $INPUT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Track statistics
TOTAL_ORIGINAL_SIZE=0
TOTAL_WEBP_SIZE=0
TOTAL_JPEG_SIZE=0
IMAGES_PROCESSED=0

# Process each image
if [ -z "$(ls -A "$INPUT_DIR" 2>/dev/null)" ]; then
  echo -e "${BLUE}ℹ️  No images found in $INPUT_DIR${NC}"
  echo "Create some images there and run this script again."
  exit 0
fi

for img in "$INPUT_DIR"/*.{png,jpg,jpeg,PNG,JPG,JPEG} 2>/dev/null; do
  [ ! -f "$img" ] && continue

  filename=$(basename "$img")
  base="${filename%.*}"
  
  echo -e "${BLUE}Optimizing: $filename${NC}"

  # Get original file size
  original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
  TOTAL_ORIGINAL_SIZE=$((TOTAL_ORIGINAL_SIZE + original_size))

  # Generate responsive WebP variants
  echo "  Generating WebP variants..."
  
  # 200w WebP
  cwebp "$img" -q 85 -resize 200 0 -o "$OUTPUT_DIR/${base}-200w.webp" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-200w.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-200w.webp" 2>/dev/null)
  echo "    ✓ 200w: ${size}B"
  TOTAL_WEBP_SIZE=$((TOTAL_WEBP_SIZE + size))

  # 400w WebP
  cwebp "$img" -q 85 -resize 400 0 -o "$OUTPUT_DIR/${base}-400w.webp" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-400w.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-400w.webp" 2>/dev/null)
  echo "    ✓ 400w: ${size}B"
  TOTAL_WEBP_SIZE=$((TOTAL_WEBP_SIZE + size))

  # 800w WebP
  cwebp "$img" -q 85 -resize 800 0 -o "$OUTPUT_DIR/${base}-800w.webp" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-800w.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-800w.webp" 2>/dev/null)
  echo "    ✓ 800w: ${size}B"
  TOTAL_WEBP_SIZE=$((TOTAL_WEBP_SIZE + size))

  # 1600w WebP (full size, minimal resize)
  cwebp "$img" -q 85 -o "$OUTPUT_DIR/${base}-1600w.webp" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-1600w.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-1600w.webp" 2>/dev/null)
  echo "    ✓ 1600w: ${size}B"
  TOTAL_WEBP_SIZE=$((TOTAL_WEBP_SIZE + size))

  # Generate responsive JPEG fallback variants
  echo "  Generating JPEG fallback variants..."

  # 200w JPEG
  convert "$img" -quality 85 -resize 200x -strip "$OUTPUT_DIR/${base}-200w.jpg" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-200w.jpg" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-200w.jpg" 2>/dev/null)
  echo "    ✓ 200w: ${size}B"
  TOTAL_JPEG_SIZE=$((TOTAL_JPEG_SIZE + size))

  # 400w JPEG
  convert "$img" -quality 85 -resize 400x -strip "$OUTPUT_DIR/${base}-400w.jpg" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-400w.jpg" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-400w.jpg" 2>/dev/null)
  echo "    ✓ 400w: ${size}B"
  TOTAL_JPEG_SIZE=$((TOTAL_JPEG_SIZE + size))

  # 800w JPEG
  convert "$img" -quality 85 -resize 800x -strip "$OUTPUT_DIR/${base}-800w.jpg" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-800w.jpg" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-800w.jpg" 2>/dev/null)
  echo "    ✓ 800w: ${size}B"
  TOTAL_JPEG_SIZE=$((TOTAL_JPEG_SIZE + size))

  # 1600w JPEG (full size)
  convert "$img" -quality 85 -strip "$OUTPUT_DIR/${base}-1600w.jpg" 2>/dev/null
  size=$(stat -f%z "$OUTPUT_DIR/${base}-1600w.jpg" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${base}-1600w.jpg" 2>/dev/null)
  echo "    ✓ 1600w: ${size}B"
  TOTAL_JPEG_SIZE=$((TOTAL_JPEG_SIZE + size))

  IMAGES_PROCESSED=$((IMAGES_PROCESSED + 1))
  echo ""
done

# Print summary
echo -e "${GREEN}Image Optimization Complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  Images processed: $IMAGES_PROCESSED"
echo "  Original total size: ${TOTAL_ORIGINAL_SIZE}B"
echo "  WebP total size: ${TOTAL_WEBP_SIZE}B"
echo "  JPEG total size: ${TOTAL_JPEG_SIZE}B"
echo ""

if [ $TOTAL_ORIGINAL_SIZE -gt 0 ]; then
  webp_reduction=$((100 - (TOTAL_WEBP_SIZE * 100 / TOTAL_ORIGINAL_SIZE)))
  jpeg_reduction=$((100 - (TOTAL_JPEG_SIZE * 100 / TOTAL_ORIGINAL_SIZE)))
  echo "  WebP reduction: ${webp_reduction}% (vs original)"
  echo "  JPEG reduction: ${jpeg_reduction}% (vs original)"
fi

echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "✅ Ready to use with ImageOptimized component!"
echo ""
