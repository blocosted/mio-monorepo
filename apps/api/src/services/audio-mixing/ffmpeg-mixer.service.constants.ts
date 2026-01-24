/**
 * FFmpeg Mixer Service Constants
 *
 * Configuration values for FFmpeg audio mixing operations.
 */

import { tmpdir } from 'node:os';

/**
 * Temporary directory configuration
 */
export const TEMP_DIR_BASE = tmpdir();
export const WORKDIR_PREFIX = 'mio-story';

/**
 * FFmpeg operation timeouts
 */
export const FFMPEG_TIMEOUT_MS = 300000; // 5 minutes
export const SILENCE_GENERATION_TIMEOUT_MS = 30000; // 30 seconds
export const PROBE_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Default volume levels for each track type
 */
export const DEFAULT_VOLUMES = {
  voice: 1.0,
  music: 0.15,
  sfx: 0.8,
  ambiance: 0.3
} as const;

/**
 * Sidechain compression (ducking) defaults
 */
export const DUCKING_DEFAULTS = {
  threshold: 0.03,
  ratio: 4,
  attackMs: 5,
  releaseMs: 100
} as const;

/**
 * Output format configuration
 */
export const OUTPUT_FORMAT = {
  codec: 'libmp3lame',
  bitrate: '192k',
  sampleRate: 44100,
  channels: 2
} as const;

/**
 * Loudness normalization settings (EBU R128)
 */
export const LOUDNORM_SETTINGS = {
  /** Integrated loudness target (LUFS) */
  integratedLoudness: -16,
  /** True peak maximum (dBTP) */
  truePeak: -1.5,
  /** Loudness range (LU) */
  loudnessRange: 11
} as const;

/**
 * FFmpeg filter chain templates
 */
export const FILTER_TEMPLATES = {
  /**
   * Volume adjustment filter
   * @param volume - Volume level (0.0-1.0)
   */
  volume: (volume: number) => `volume=${volume}`,

  /**
   * Audio delay filter for SFX timing
   * @param delayMs - Delay in milliseconds
   */
  adelay: (delayMs: number) => `adelay=${delayMs}|${delayMs}`,

  /**
   * Loop filter for ambiance
   * Uses -1 for infinite loop, size=2e+09 for large buffer
   */
  aloop: () => 'aloop=loop=-1:size=2000000000',

  /**
   * Sidechain compression filter for music ducking
   * @param threshold - Threshold (0.0-1.0)
   * @param ratio - Compression ratio
   * @param attack - Attack time in ms
   * @param release - Release time in ms
   */
  sidechainCompress: (threshold: number, ratio: number, attack: number, release: number) =>
    `sidechaincompress=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release}`,

  /**
   * Audio mix filter
   * @param inputs - Number of inputs
   */
  amix: (inputs: number) => `amix=inputs=${inputs}:duration=first:normalize=0`,

  /**
   * Loudness normalization filter (EBU R128)
   */
  loudnorm: () => `loudnorm=I=${LOUDNORM_SETTINGS.integratedLoudness}:TP=${LOUDNORM_SETTINGS.truePeak}:LRA=${LOUDNORM_SETTINGS.loudnessRange}`
} as const;

/**
 * Intermediate file names used during processing
 */
export const INTERMEDIATE_FILES = {
  concatList: 'concat.txt',
  voiceTimeline: 'voice-timeline.wav',
  mixed: 'mixed.wav',
  normalized: 'normalized.wav',
  final: 'final.mp3'
} as const;

/**
 * Silence audio settings (for pauses between segments)
 */
export const SILENCE_SETTINGS = {
  format: 'wav',
  sampleRate: 44100,
  channels: 2
} as const;
