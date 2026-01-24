/**
 * Ambiance Generator Service Types
 *
 * Service for generating ambient background sounds using ElevenLabs SFX API.
 * Supports looping for longer durations and fade effects.
 */

/**
 * Input for generating an ambient sound
 */
export interface AmbianceGenerateInput {
  /** Natural language description of the ambient sound */
  description: string;
  /** Target duration in seconds (will loop if source is shorter) */
  targetDurationSeconds: number;
  /** Fade in duration in seconds (default: 1.0) */
  fadeInDuration?: number;
  /** Fade out duration in seconds (default: 2.0) */
  fadeOutDuration?: number;
  /** Volume level 0-1 (default: 0.3) */
  volume?: number;
  /** Prompt influence for ElevenLabs (0-1, default: 0.3) */
  promptInfluence?: number;
}

/**
 * Result of ambient sound generation
 */
export interface AmbianceGenerateResult {
  /** Generated audio buffer */
  audio: Buffer;
  /** Actual duration in seconds */
  durationSeconds: number;
  /** Original description */
  description: string;
  /** Whether the audio was looped to reach target duration */
  looped: boolean;
  /** Source clip duration before looping */
  sourceClipDurationSeconds: number;
  /** S3 storage URL (shared path for deduplication) */
  url: string;
  /** Whether result came from persistent library */
  fromLibrary?: boolean;
}

/**
 * Input for generating ambiance from a script segment
 */
export interface AmbianceSegmentInput {
  /** Segment ID from the script */
  id: string;
  /** Description for generation */
  description: string;
  /** Start time in the story (seconds) */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** Volume level 0-1 */
  volume?: number;
  /** Fade in duration in seconds */
  fadeInDuration?: number;
}

/**
 * Result of generating ambiance for a script segment
 */
export interface AmbianceSegmentResult {
  /** Segment ID */
  id: string;
  /** Whether generation succeeded */
  success: boolean;
  /** Generated audio buffer (if success) */
  audio?: Buffer;
  /** Actual duration in seconds */
  durationSeconds?: number;
  /** Start time from script */
  startTime: number;
  /** Error message (if failed) */
  error?: string;
  /** Output filename */
  outputFile?: string;
}

/**
 * Ambiance Generator Service Interface
 */
export interface IAmbianceGeneratorService {
  /**
   * Generate an ambient sound track
   *
   * @param input - Generation parameters
   * @returns Generated ambient audio
   */
  generate(input: AmbianceGenerateInput): Promise<AmbianceGenerateResult>;

  /**
   * Generate ambient sound for a script segment
   *
   * @param segment - Segment from script
   * @returns Generation result
   */
  generateForSegment(segment: AmbianceSegmentInput): Promise<AmbianceSegmentResult>;
}
