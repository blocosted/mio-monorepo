/**
 * Story Script Models
 *
 * Timeline-based script structure for audio story generation.
 * Designed for:
 * - Precise duration control via word count budgeting
 * - Overlapping audio tracks (voice + SFX, music + narration)
 * - ElevenLabs v3 compatibility (audio tags, text-to-dialogue)
 */

import type { Language } from './profiles.types';
import type { Emotion, VocabularyLevel } from './stories.types';

/**
 * Audio track types for mixing
 */
export type AudioTrackType = 'voice' | 'sfx' | 'music' | 'ambiance';

/**
 * ElevenLabs voice settings
 */
export interface ElevenLabsVoiceSettings {
  /** Voice stability (0-1). Higher = more consistent, lower = more expressive */
  stability?: number;
  /** Similarity boost (0-1). How closely to match the original voice */
  similarityBoost?: number;
  /** Style exaggeration (0+). Amplifies the voice's style */
  style?: number;
  /** Playback speed multiplier */
  speed?: number;
}

/**
 * Character to voice mapping for ElevenLabs
 */
export interface CharacterVoiceMap {
  /** Character name as used in the script */
  characterName: string;
  /** ElevenLabs voice ID (optional, can be assigned later) */
  voiceId?: string;
  /** Description of the voice for selection/generation */
  voiceDescription: string;
  /** Default voice settings for this character */
  voiceSettings?: ElevenLabsVoiceSettings;
}

/**
 * Voice content (narration or dialogue)
 */
export interface VoiceSegmentContent {
  type: 'narration' | 'dialogue';
  /** The text to be spoken */
  text: string;
  /** Character name (required for dialogue) */
  characterName?: string;
  /** Emotion affecting delivery */
  emotion?: Emotion;
  /**
   * ElevenLabs v3 audio tags embedded in text
   * Examples: [laughs], [whispering], [excited], [sighs]
   * These are already embedded in `text`, this field is for validation
   */
  audioTags?: string[];
  /** Voice settings override for this segment */
  voiceSettings?: ElevenLabsVoiceSettings;
}

/**
 * Sound effect content
 */
export interface SfxSegmentContent {
  type: 'sfx';
  /**
   * Natural language description for ElevenLabs sound generation
   * Example: "gentle forest stream with birds chirping"
   */
  description: string;
  /**
   * Prompt influence (0-1). Higher = follows prompt more closely
   * Default: 0.3
   */
  promptInfluence?: number;
  /** Whether the sound should loop smoothly */
  loop?: boolean;
}

/**
 * Music content
 */
export interface MusicSegmentContent {
  type: 'music';
  /** Mood/style of the music */
  mood: string;
  /** Fade in duration in seconds */
  fadeInDuration?: number;
  /** Fade out duration in seconds */
  fadeOutDuration?: number;
  /** Whether to loop the music */
  loop?: boolean;
}

/**
 * Ambiance content (background atmosphere)
 */
export interface AmbianceSegmentContent {
  type: 'ambiance';
  /** Description of the ambiance */
  description: string;
  /** Volume level (0-1) */
  volume?: number;
  /** Fade in duration in seconds */
  fadeInDuration?: number;
}

/**
 * Union type for all segment content types
 */
export type SegmentContent = VoiceSegmentContent | SfxSegmentContent | MusicSegmentContent | AmbianceSegmentContent;


/**
 * Duration budget for script generation
 */
export interface DurationBudget {
  /** Total duration in seconds */
  totalSeconds: number;
  /** Time allocated for voice (narration + dialogue) */
  voiceSeconds: number;
  /** Time allocated for sound effects */
  sfxSeconds: number;
  /** Time allocated for music transitions */
  musicSeconds: number;
  /** Time allocated for pauses and breathing room */
  pauseSeconds: number;
  /** Target word count for voice content */
  targetWordCount: number;
}

/**
 * Narrative structure for 3-act story
 */
export interface NarrativeStructure {
  /** Act 1: Setup - introduce characters and setting */
  act1: {
    wordBudget: number;
    percentage: number;
    description: string;
  };
  /** Act 2: Confrontation - main conflict and development */
  act2: {
    wordBudget: number;
    percentage: number;
    description: string;
  };
  /** Act 3: Resolution - climax and conclusion */
  act3: {
    wordBudget: number;
    percentage: number;
    description: string;
  };
}

/**
 * Script generation constraints passed to LLM
 */
export interface ScriptGenerationConstraints {
  /** Duration budget breakdown */
  durationBudget: DurationBudget;
  /** Narrative structure with word allocations */
  narrativeStructure: NarrativeStructure;
  /** Minimum number of narration segments */
  minNarrationSegments: number;
  /** Minimum number of dialogue segments */
  minDialogueSegments: number;
  /** Minimum number of sound effects */
  minSfxSegments: number;
  /** Maximum consecutive segments of same type */
  maxConsecutiveSameType: number;
  /**
   * Word count inflation factor for prompt (0-1).
   * LLMs tend to generate less than requested, so we inflate the target.
   * - Claude: ~0.15 (generates ~130% of asked)
   * - OpenAI: ~0.80 (generates ~55% of asked)
   */
  wordCountInflation: number;
}

// =============================================================================
// V3 Script Types (Relative Timing)
// =============================================================================

/**
 * Timing anchor type for relative positioning
 *
 * Allows non-voice segments (SFX, music, ambiance) to be positioned
 * relative to voice segments rather than using hypothetical absolute times.
 */
export const TIMING_ANCHOR_TYPE = {
  /** Align to start of a voice segment */
  SEGMENT_START: 'segment_start',
  /** Align to end of a voice segment */
  SEGMENT_END: 'segment_end',
  /** Align to a percentage point within a voice segment */
  SEGMENT_PERCENT: 'segment_percent'
} as const;

export type TimingAnchorType = (typeof TIMING_ANCHOR_TYPE)[keyof typeof TIMING_ANCHOR_TYPE];

/**
 * Relative timing hint for non-voice segments
 *
 * LLM generates these instead of absolute startTime/duration.
 * The TimelineComputationService resolves them to absolute times
 * after TTS generation provides real durations.
 *
 * @example
 * // SFX starts 500ms before voice-003 ends
 * {
 *   anchorType: 'segment_end',
 *   anchorSegmentId: 'voice-003',
 *   offsetMs: -500
 * }
 *
 * @example
 * // Music starts at 75% through voice-001
 * {
 *   anchorType: 'segment_percent',
 *   anchorSegmentId: 'voice-001',
 *   anchorPercent: 75,
 *   offsetMs: 0
 * }
 */
export interface RelativeTimingHint {
  /** Type of anchor point */
  anchorType: TimingAnchorType;
  /** ID of the voice segment to anchor to */
  anchorSegmentId: string;
  /** Offset in milliseconds (negative = before anchor, positive = after) */
  offsetMs: number;
  /** Percentage within segment (0-100), only used with segment_percent */
  anchorPercent?: number;
}

/**
 * V3 Segment without absolute timing
 *
 * Voice segments use `order` for sequential positioning.
 * Non-voice segments use `timingHint` for relative positioning.
 */
export interface ScriptSegment {
  /** Unique segment identifier */
  id: string;
  /** Track this segment belongs to */
  trackId: string;
  /** Segment content (voice, sfx, music, ambiance) */
  content: SegmentContent;
  /** Order for voice segments (sequential, 1-based) */
  order?: number;
  /** Timing hint for non-voice segments (relative to voice) */
  timingHint?: RelativeTimingHint;
  /**
   * Estimated duration in seconds (LLM hint, not authoritative)
   * - For voice: based on word count estimate
   * - For SFX/music/ambiance: suggested duration
   */
  estimatedDuration?: number;
}

/**
 * V3 Audio track with relative timing
 */
export interface AudioTrack {
  /** Unique track identifier */
  id: string;
  /** Track type determines mixing behavior */
  type: AudioTrackType;
  /** Human-readable track name */
  name: string;
  /** Segments on this track */
  segments: ScriptSegment[];
}

/**
 * V3 Script metadata
 */
export interface ScriptMetadata {
  /** Story title */
  title: string;
  /** Target duration in seconds (what was requested) */
  targetDuration: number;
  /** Vocabulary level based on child age */
  vocabularyLevel: VocabularyLevel;
  /** Story language */
  language: Language;
  /** Total word count in voice segments (spoken words only) */
  wordCount: number;
  /** Number of voice segments */
  voiceSegmentCount: number;
  /** Number of SFX segments */
  sfxSegmentCount: number;
  /** ElevenLabs model to use */
  elevenLabsModel?: string;
  /** Pause between voice segments in seconds (default: 0.3) */
  voiceSegmentPauseSeconds?: number;
}

/**
 * V3 Story Script with Relative Timing
 *
 * Uses relative timing hints instead of absolute times.
 * Actual timeline is computed after TTS generation provides real durations.
 *
 * Key differences from V2:
 * - No absolute startTime/duration on segments
 * - Voice segments have `order` for sequential positioning
 * - Non-voice segments have `timingHint` for relative positioning
 * - Actual timeline computed by TimelineComputationService
 */
export interface StoryScript {
  /** Version identifier */
  version: 3;
  /** Script metadata */
  metadata: ScriptMetadata;
  /** Character to voice mappings */
  characters: CharacterVoiceMap[];
  /** Audio tracks (voice, sfx, music, ambiance) */
  tracks: AudioTrack[];
}
