#!/bin/bash

# Build the Bun + FFmpeg Docker image
# This script should be run from the project root

set -e

echo "🐳 Building bun-ffmpeg Docker image..."

docker build -t mio/bun-ffmpeg:latest -f packages/docker/images/bun-ffmpeg/Dockerfile .

echo "✅ Image built successfully!"
echo ""
echo "📋 Image details:"
docker images mio/bun-ffmpeg:latest
echo ""
echo "🔍 Verify installations:"
docker run --rm mio/bun-ffmpeg:latest sh -c "bun --version && node --version && ffmpeg -version | head -n 1"
echo ""
