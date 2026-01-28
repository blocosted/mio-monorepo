/**
 * Story-related Types and Enums
 *
 * Shared primitive types (enum-like literals) for stories.
 * Uses const assertion pattern for Typebox compatibility.
 */

/**
 * Story Status
 */
export const StoryStatusValues = ['draft', 'generating', 'ready', 'failed'] as const;
export type StoryStatus = (typeof StoryStatusValues)[number];
export const StoryStatus = {
  Draft: 'draft',
  Generating: 'generating',
  Ready: 'ready',
  Failed: 'failed'
} as const satisfies Record<string, StoryStatus>;

/**
 * Vocabulary Level
 */
export const VocabularyLevelValues = ['very_simple', 'simple', 'medium', 'advanced'] as const;
export type VocabularyLevel = (typeof VocabularyLevelValues)[number];
export const VocabularyLevel = {
  VerySimple: 'very_simple',
  Simple: 'simple',
  Medium: 'medium',
  Advanced: 'advanced'
} as const satisfies Record<string, VocabularyLevel>;

/**
 * Emotion for story segments
 *
 * Core emotions that affect voice delivery via ElevenLabs v3 audio tags.
 * @see https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const EmotionValues = ['neutral', 'happy', 'sad', 'excited', 'scared', 'angry', 'surprised', 'curious', 'calm'] as const;
export type Emotion = (typeof EmotionValues)[number];
export const Emotion = {
  Neutral: 'neutral',
  Happy: 'happy',
  Sad: 'sad',
  Excited: 'excited',
  Scared: 'scared',
  Angry: 'angry',
  Surprised: 'surprised',
  Curious: 'curious',
  Calm: 'calm'
} as const satisfies Record<string, Emotion>;

/**
 * Speech act modifiers for voice delivery
 *
 * These are additional audio tags that can modify how text is spoken,
 * independent of or in addition to the base emotion.
 *
 * @see https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const SpeechActValues = ['normal', 'whisper', 'shout', 'laugh', 'sigh', 'cry', 'sing', 'sarcastic'] as const;
export type SpeechAct = (typeof SpeechActValues)[number];
export const SpeechAct = {
  /** Normal speech (no modifier) */
  Normal: 'normal',
  /** Whispering - soft, quiet delivery */
  Whisper: 'whisper',
  /** Shouting - loud, emphatic delivery */
  Shout: 'shout',
  /** Laughing while speaking */
  Laugh: 'laugh',
  /** Sighing delivery */
  Sigh: 'sigh',
  /** Crying/tearful delivery */
  Cry: 'cry',
  /** Singing the text */
  Sing: 'sing',
  /** Sarcastic tone */
  Sarcastic: 'sarcastic'
} as const satisfies Record<string, SpeechAct>;

/**
 * Segment Type
 */
export const SegmentTypeValues = ['narration', 'dialogue', 'pause', 'sound_effect', 'music_change'] as const;
export type SegmentType = (typeof SegmentTypeValues)[number];
export const SegmentType = {
  Narration: 'narration',
  Dialogue: 'dialogue',
  Pause: 'pause',
  SoundEffect: 'sound_effect',
  MusicChange: 'music_change'
} as const satisfies Record<string, SegmentType>;

/**
 * Story Ambiance
 */
export const AmbianceValues = ['forest', 'ocean', 'space', 'castle', 'city', 'magical_realm', 'underwater', 'mountain'] as const;
export type Ambiance = (typeof AmbianceValues)[number];
export const Ambiance = {
  Forest: 'forest',
  Ocean: 'ocean',
  Space: 'space',
  Castle: 'castle',
  City: 'city',
  MagicalRealm: 'magical_realm',
  Underwater: 'underwater',
  Mountain: 'mountain'
} as const satisfies Record<string, Ambiance>;

/**
 * Story Tone
 */
export const ToneValues = ['adventurous', 'funny', 'mysterious', 'heartwarming', 'exciting', 'calm', 'educational'] as const;
export type Tone = (typeof ToneValues)[number];
export const Tone = {
  Adventurous: 'adventurous',
  Funny: 'funny',
  Mysterious: 'mysterious',
  Heartwarming: 'heartwarming',
  Exciting: 'exciting',
  Calm: 'calm',
  Educational: 'educational'
} as const satisfies Record<string, Tone>;

/**
 * Audio Asset Type
 */
export const AudioAssetTypeValues = ['voice', 'sfx', 'music', 'ambiance', 'final_mix'] as const;
export type AudioAssetType = (typeof AudioAssetTypeValues)[number];
export const AudioAssetType = {
  Voice: 'voice',
  Sfx: 'sfx',
  Music: 'music',
  Ambiance: 'ambiance',
  FinalMix: 'final_mix'
} as const satisfies Record<string, AudioAssetType>;
