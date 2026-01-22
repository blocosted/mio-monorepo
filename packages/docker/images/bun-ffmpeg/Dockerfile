FROM oven/bun:1.2-alpine

# Install Node.js 22
RUN apk add --no-cache nodejs npm

# Install FFmpeg and audio processing tools
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-libs \
    sox \
    lame \
    opus-tools \
    vorbis-tools \
    flac \
    wavpack \
    libsndfile \
    libsamplerate

# Install additional audio codecs
RUN apk add --no-cache \
    x264-libs \
    x265-libs \
    libvpx \
    aom-libs

# Create working directory
WORKDIR /app

# Verify installations
RUN bun --version && \
    node --version && \
    npm --version && \
    ffmpeg -version

# Set environment variables
ENV NODE_ENV=development
ENV BUN_INSTALL_DIR=/root/.bun
ENV PATH="${BUN_INSTALL_DIR}/bin:${PATH}"

# Default command (can be overridden)
CMD ["bun", "run", "dev"]
