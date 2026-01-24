/**
 * FFmpeg Mixer Service Types
 *
 * Type definitions for the audio mixing service.
 */

/**
 * Audio file reference with metadata
 */
export interface AudioFile {
  /** Path to the audio file (local or S3 key) */
  path: string;
  /** Duration in seconds */
  duration: number;
  /** Start time in the mix (seconds from beginning) */
  startTime?: number;
  /** Volume level (0.0 to 1.0, default 1.0) */
  volume?: number;
}

/**
 * Voice track input with segments and pauses
 */
export interface VoiceTrackInput {
  /** Voice audio segments in order */
  segments: AudioFile[];
  /** Pause durations between segments (index i = pause after segment i) */
  pauses: Map<number, number>;
}

/**
 * Music track input with ducking configuration
 */
export interface MusicTrackInput {
  /** Music file */
  file: AudioFile;
  /** Volume level (typically 0.15 for background music) */
  volume: number;
  /** Enable sidechain compression (ducking) when voice is present */
  enableDucking: boolean;
  /** Ducking configuration */
  ducking?: {
    /** Threshold for ducking activation (0.0-1.0, default 0.03) */
    threshold: number;
    /** Compression ratio (default 4) */
    ratio: number;
    /** Attack time in ms (default 5) */
    attackMs: number;
    /** Release time in ms (default 100) */
    releaseMs: number;
  };
}

/**
 * Ambiance track input with loop configuration
 */
export interface AmbianceTrackInput {
  /** Ambiance audio file */
  file: AudioFile;
  /** Volume level (typically 0.3) */
  volume: number;
  /** Loop the ambiance to match story length */
  loop: boolean;
}

/**
 * Sound effect track input with timing
 */
export interface SfxTrackInput {
  /** SFX files with their start times */
  files: AudioFile[];
  /** Default volume for SFX (typically 0.8) */
  volume: number;
}

/**
 * Complete mix parameters for a story
 */
export interface MixStoryInput {
  /** Unique story identifier */
  storyId: string;
  /** Voice track (narration + character voices) */
  voice: VoiceTrackInput;
  /** Background music (optional) */
  music?: MusicTrackInput;
  /** Ambient sounds (optional) */
  ambiance?: AmbianceTrackInput;
  /** Sound effects (optional) */
  sfx?: SfxTrackInput;
  /** Output format settings */
  output?: {
    /** Target bitrate (default 192k) */
    bitrate?: string;
    /** Sample rate (default 44100) */
    sampleRate?: number;
    /** Channel count (default 2 for stereo) */
    channels?: number;
  };
}

/**
 * Result of mixing a story
 */
export interface MixStoryResult {
  /** Mixed audio as buffer */
  audio: Buffer;
  /** Total duration in seconds */
  duration: number;
  /** Audio format metadata */
  format: {
    codec: string;
    bitrate: string;
    sampleRate: number;
    channels: number;
  };
}

/**
 * FFmpeg verification result
 */
export interface FFmpegVerifyResult {
  /** FFmpeg version string */
  version: string;
  /** Available codecs */
  codecs: {
    libmp3lame: boolean;
    aac: boolean;
    pcm_s16le: boolean;
  };
}

/**
 * FFmpeg Mixer Service Interface
 */
export interface IFFmpegMixerService {
  /**
   * Mix all audio tracks into a final story audio file
   */
  mixStory(input: MixStoryInput): Promise<MixStoryResult>;

  /**
   * Generate a silence audio file of specified duration
   */
  generateSilence(durationSeconds: number, outputPath: string): Promise<string>;

  /**
   * Verify FFmpeg is installed and has required codecs
   */
  verifyFFmpegInstalled(): Promise<FFmpegVerifyResult>;

  /**
   * Clean up temporary work directory
   */
  cleanupWorkdir(workdirPath: string): Promise<void>;
}
