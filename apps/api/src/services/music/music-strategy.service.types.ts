/**
 * Music Strategy Service Types
 *
 * Defines intelligent music placement based on story structure.
 * Supports punctual (intro/climax/outro) and continuous strategies.
 */

/**
 * Available music moods
 */
export type MusicMood = 'calm' | 'mysterious' | 'adventurous' | 'tense' | 'joyful' | 'sad' | 'magical' | 'serene';

/**
 * Music cue reason
 */
export type MusicCueReason = 'intro' | 'transition' | 'climax' | 'outro' | 'emotion-change';

/**
 * Music strategy type
 */
export type MusicStrategy =
  | 'punctual' // Music at key moments only (intro, climax, outro)
  | 'continuous' // Music throughout the story with mood changes
  | 'minimal'; // Minimal music, mostly silence

/**
 * A music cue represents a section of music to play
 */
export interface MusicCue {
  /** Start time in the story (seconds) */
  startTime: number;
  /** Duration of this music section (seconds) */
  duration: number;
  /** Mood for this section */
  mood: MusicMood;
  /** Fade in duration (seconds) */
  fadeIn: number;
  /** Fade out duration (seconds) */
  fadeOut: number;
  /** Volume level (0-1) */
  volume: number;
  /** Reason for this cue */
  reason: MusicCueReason;
}

/**
 * Input for music strategy generation
 */
export interface MusicStrategyInput {
  /** Total story duration in seconds */
  totalDuration: number;
  /** Music segments from script (if any) */
  scriptMusicSegments?: Array<{
    startTime: number;
    duration: number;
    mood: string;
  }>;
  /** Key story moments for precise placement (optional) */
  storyMoments?: Array<{
    time: number;
    type: 'climax' | 'tension' | 'resolution' | 'introduction';
  }>;
  /** Force a specific strategy (optional) */
  strategy?: MusicStrategy;
}

/**
 * Output from music strategy generation
 */
export interface MusicStrategyOutput {
  /** Recommended music cues */
  cues: MusicCue[];
  /** Strategy used */
  strategy: MusicStrategy;
  /** Total music duration in seconds */
  totalMusicDuration: number;
  /** Music coverage percentage (0-100) */
  coveragePercentage: number;
}

/**
 * Configuration for punctual music strategy
 */
export interface PunctualStrategyConfig {
  intro: {
    /** Duration as percentage of total story (0-1) */
    durationRatio: number;
    /** Default mood */
    mood: MusicMood;
    /** Fade in duration (seconds) */
    fadeIn: number;
    /** Fade out duration (seconds) */
    fadeOut: number;
    /** Volume (0-1) */
    volume: number;
  };
  climax: {
    /** Position in story as percentage (0-1) */
    positionRatio: number;
    /** Duration as percentage of total story (0-1) */
    durationRatio: number;
    /** Default mood */
    mood: MusicMood;
    /** Fade in duration (seconds) */
    fadeIn: number;
    /** Fade out duration (seconds) */
    fadeOut: number;
    /** Volume (0-1) */
    volume: number;
  };
  outro: {
    /** Position in story as percentage (0-1) */
    positionRatio: number;
    /** Duration as percentage of total story (0-1) */
    durationRatio: number;
    /** Default mood */
    mood: MusicMood;
    /** Fade in duration (seconds) */
    fadeIn: number;
    /** Fade out duration (seconds) */
    fadeOut: number;
    /** Volume (0-1) */
    volume: number;
  };
}

/**
 * Music Strategy Service Interface
 */
export interface IMusicStrategyService {
  /**
   * Generate music cues based on story structure
   *
   * @param input - Story information and optional config
   * @returns Music cues and strategy info
   */
  generateMusicCues(input: MusicStrategyInput): MusicStrategyOutput;

  /**
   * Convert script music segments to standardized cues
   *
   * @param segments - Music segments from script
   * @param totalDuration - Total story duration
   * @returns Converted music cues
   */
  convertScriptMusicToCues(segments: Array<{ startTime: number; duration: number; mood: string }>, totalDuration: number): MusicCue[];

  /**
   * Normalize a mood string to MusicMood enum
   *
   * @param mood - Raw mood string from script
   * @returns Normalized MusicMood
   */
  normalizeMood(mood: string): MusicMood;
}
