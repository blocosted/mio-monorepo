/**
 * Story Script Models
 *
 * Timeline-based script structure for audio story generation.
 * Designed for:
 * - Precise duration control via word count budgeting
 * - Overlapping audio tracks (voice + SFX, music + narration)
 * - ElevenLabs v3 compatibility (audio tags, text-to-dialogue)
 */

import type { Language } from '../types/profiles.types';
import { VocabularyLevel, Emotion } from './index';

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
export type SegmentContent =
  | VoiceSegmentContent
  | SfxSegmentContent
  | MusicSegmentContent
  | AmbianceSegmentContent;

/**
 * Timeline segment with absolute positioning
 */
export interface TimelineSegment {
  /** Unique segment identifier */
  id: string;
  /** Track this segment belongs to */
  trackId: string;
  /** Start time in seconds (absolute position on timeline) */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** Segment content */
  content: SegmentContent;
}

/**
 * Audio track containing segments
 */
export interface AudioTrack {
  /** Unique track identifier */
  id: string;
  /** Track type determines mixing behavior */
  type: AudioTrackType;
  /** Human-readable track name */
  name: string;
  /** Segments on this track (ordered by startTime) */
  segments: TimelineSegment[];
}

/**
 * Script metadata
 */
export interface ScriptMetadata {
  /** Story title */
  title: string;
  /** Target duration in seconds (what was requested) */
  targetDuration: number;
  /** Actual calculated duration in seconds */
  actualDuration: number;
  /** Vocabulary level based on child age */
  vocabularyLevel: VocabularyLevel;
  /** Story language */
  language: Language;
  /** Total word count in voice segments */
  wordCount: number;
  /** Number of voice segments */
  voiceSegmentCount: number;
  /** Number of SFX segments */
  sfxSegmentCount: number;
  /** ElevenLabs model to use */
  elevenLabsModel?: string;
}

/**
 * Story Script
 *
 * Timeline-based script structure supporting:
 * - Multiple overlapping audio tracks
 * - Precise duration via word count
 * - ElevenLabs v3 audio tags
 */
export interface StoryScript {
  /** Version identifier */
  version: 2;
  /** Script metadata */
  metadata: ScriptMetadata;
  /** Character to voice mappings */
  characters: CharacterVoiceMap[];
  /** Audio tracks (voice, sfx, music, ambiance) */
  tracks: AudioTrack[];
}

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
