/**
 * TTS Service Constants
 *
 * Default voice IDs and emotion-to-voice-settings mappings
 * for ElevenLabs TTS generation.
 *
 * Supports multiple languages with language-specific voice mappings.
 */

import { Emotion } from '@mio/shared/models';
import type { ElevenLabsVoiceSettings } from '@mio/shared/models';
import type { Language } from '@mio/shared/types';
import { Language as LanguageEnum } from '@mio/shared/types';
import type { CharacterArchetype } from './tts.service.types';

/**
 * Voice ID mapping by gender
 */
type GenderVoiceIds = { male: string; female: string };

/**
 * Voice IDs organized by language, then archetype, then gender
 */
type LanguageVoiceMap = Record<Language, Record<CharacterArchetype, GenderVoiceIds>>;

/**
 * English voice IDs by archetype and gender
 *
 * Voice IDs are from ElevenLabs pre-made voices.
 */
const ENGLISH_VOICE_IDS: Record<CharacterArchetype, GenderVoiceIds> = {
    // Main narrator voices (warm, professional)
    narrator: {
        male: 'pNInz6obpgDQGcFmaJgB',    // Adam - deep, warm
        female: 'EXAVITQu4vr4xnSDxMaL',  // Sarah - clear, engaging
    },
    // Child hero voices (youthful, energetic)
    childHero: {
        male: 'jsCqWAovK2LkecY7zXl4',    // Young male voice
        female: 'MF3mGyEYCl7XYWbV9V6O',  // Young female voice
    },
    // Wise character voices (elderly, sage-like)
    wiseCharacter: {
        male: 'VR6AewLTigWG4xSOukaG',    // Arnold - wise, deep
        female: 'ThT5KcBeYPX3keUQqHPh',  // Grace - wise, warm
    },
    // Villain voices (dramatic, menacing)
    villain: {
        male: 'N2lVS1w4EtoT3dr4eOWO',    // Clyde - dramatic
        female: 'XB0fDUnXU5powFXDhCwa',  // Charlotte - mysterious
    },
    // Comedic voices (playful, expressive)
    comedic: {
        male: 'TxGEqnHWrfWFTfGW9XjX',    // Thomas - friendly
        female: '21m00Tcm4TlvDq8ikWAM',  // Rachel - cheerful
    },
    // Parent voices (nurturing, reassuring)
    parent: {
        male: 'pNInz6obpgDQGcFmaJgB',    // Adam
        female: 'EXAVITQu4vr4xnSDxMaL',  // Sarah
    },
    // Friend/sidekick voices
    friend: {
        male: 'TxGEqnHWrfWFTfGW9XjX',    // Thomas
        female: '21m00Tcm4TlvDq8ikWAM',  // Rachel
    },
    // Animal character voices (playful, expressive)
    animal: {
        male: 'TxGEqnHWrfWFTfGW9XjX',    // Thomas
        female: 'MF3mGyEYCl7XYWbV9V6O',  // Young female
    },
    // Magical/fantasy character voices
    magical: {
        male: 'VR6AewLTigWG4xSOukaG',    // Arnold
        female: 'ThT5KcBeYPX3keUQqHPh',  // Grace
    },
};

/**
 * French voice IDs by archetype and gender
 *
 * Voice IDs are from ElevenLabs pre-made French voices.
 * Note: eleven_v3 model provides excellent French support.
 */
const FRENCH_VOICE_IDS: Record<CharacterArchetype, GenderVoiceIds> = {
    // Narrateur principal (voix chaleureuse, professionnelle)
    narrator: {
        male: 'IKne3meq5aSn9XLyUdCD',    // Charlie - warm, storytelling
        female: 'XB0fDUnXU5powFXDhCwa',  // Charlotte - clear, engaging
    },
    // Heros enfant (jeune, energique)
    childHero: {
        male: 'cjVigY5qzO86Huf0OWal',    // Eric - youthful
        female: 'cgSgspJ2msm6clMCkdW9',  // Jessica - young, energetic
    },
    // Personnage sage (ancien, sage)
    wiseCharacter: {
        male: 'JBFqnCBsd6RMkjVDRZzb',    // George - wise, deep
        female: 'ThT5KcBeYPX3keUQqHPh',  // Grace - wise, warm
    },
    // Mechant (dramatique, menacant)
    villain: {
        male: 'N2lVS1w4EtoT3dr4eOWO',    // Clyde - dramatic
        female: 'XB0fDUnXU5powFXDhCwa',  // Charlotte - mysterious
    },
    // Comique (joueur, expressif)
    comedic: {
        male: 'iP95p4xoKVk53GoZ742B',    // Chris - friendly, playful
        female: 'EXAVITQu4vr4xnSDxMaL',  // Sarah - cheerful
    },
    // Parent (bienveillant, rassurant)
    parent: {
        male: 'IKne3meq5aSn9XLyUdCD',    // Charlie
        female: 'XB0fDUnXU5powFXDhCwa',  // Charlotte
    },
    // Ami/compagnon
    friend: {
        male: 'iP95p4xoKVk53GoZ742B',    // Chris
        female: 'cgSgspJ2msm6clMCkdW9',  // Jessica
    },
    // Personnage animal (joueur, expressif)
    animal: {
        male: 'cjVigY5qzO86Huf0OWal',    // Eric
        female: 'cgSgspJ2msm6clMCkdW9',  // Jessica
    },
    // Personnage magique/fantaisie
    magical: {
        male: 'JBFqnCBsd6RMkjVDRZzb',    // George
        female: 'ThT5KcBeYPX3keUQqHPh',  // Grace
    },
};

/**
 * Default voice IDs by language, archetype and gender
 */
export const VOICE_IDS_BY_LANGUAGE: LanguageVoiceMap = {
    [LanguageEnum.English]: ENGLISH_VOICE_IDS,
    [LanguageEnum.French]: FRENCH_VOICE_IDS,
};

/**
 * Default voice IDs (English) - for backwards compatibility
 *
 * @deprecated Use VOICE_IDS_BY_LANGUAGE with explicit language instead
 */
export const DEFAULT_VOICE_IDS: Record<CharacterArchetype, GenderVoiceIds> = ENGLISH_VOICE_IDS;

/**
 * Audio tags for emotional expression (eleven_v3)
 *
 * These tags are prepended to text to guide emotional delivery.
 * See: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const EMOTION_AUDIO_TAGS: Record<Emotion, string | null> = {
    [Emotion.Neutral]: null,
    [Emotion.Happy]: '[happy]',
    [Emotion.Sad]: '[sad]',
    [Emotion.Excited]: '[excited]',
    [Emotion.Scared]: '[scared]',
    [Emotion.Angry]: '[angry]',
    [Emotion.Surprised]: '[gasp]',
    [Emotion.Curious]: null,  // No specific tag, use intonation via punctuation
    [Emotion.Calm]: '[softly]',
};

/**
 * Emotion to voice settings mapping
 *
 * These settings adjust the voice delivery based on emotion:
 * - stability: Creative(0)=expressive, Natural(0.5)=balanced, Robust(1)=stable
 *   NOTE: convertWithTimestamps only supports 0, 0.5, 1.0 (values are auto-normalized)
 * - similarityBoost: How closely to match the original voice
 * - style: Amplifies the voice's natural style (0-1)
 * - speed: 0.7 (slowest) to 1.2 (fastest), 1.0 default
 *
 * Primary emotional control should use EMOTION_AUDIO_TAGS with eleven_v3.
 * These settings provide secondary modulation.
 */
export const EMOTION_VOICE_SETTINGS: Record<Emotion, ElevenLabsVoiceSettings> = {
    [Emotion.Neutral]: {
        stability: 0.5,    // Natural
        similarityBoost: 0.75,
        style: 0.0,
        speed: 1.0,
    },
    [Emotion.Happy]: {
        stability: 0,      // Creative - more expressive
        similarityBoost: 0.7,
        style: 0.5,
        speed: 1.05,
    },
    [Emotion.Sad]: {
        stability: 0.5,    // Natural - let the tag do the work
        similarityBoost: 0.8,
        style: 0.3,
        speed: 0.9,        // Slower
    },
    [Emotion.Excited]: {
        stability: 0,      // Creative - very expressive
        similarityBoost: 0.65,
        style: 0.6,
        speed: 1.1,        // Faster
    },
    [Emotion.Scared]: {
        stability: 0,      // Creative - unstable delivery
        similarityBoost: 0.7,
        style: 0.4,
        speed: 1.05,
    },
    [Emotion.Angry]: {
        stability: 0,      // Creative - intense
        similarityBoost: 0.75,
        style: 0.7,
        speed: 1.0,
    },
    [Emotion.Surprised]: {
        stability: 0,      // Creative - spontaneous
        similarityBoost: 0.65,
        style: 0.5,
        speed: 1.08,
    },
    [Emotion.Curious]: {
        stability: 0.5,    // Natural
        similarityBoost: 0.75,
        style: 0.25,
        speed: 0.95,
    },
    [Emotion.Calm]: {
        stability: 1,      // Robust - very stable
        similarityBoost: 0.85,
        style: 0.1,
        speed: 0.9,
    },
};

/**
 * Default voice settings (used when no emotion specified)
 */
export const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = EMOTION_VOICE_SETTINGS[Emotion.Neutral];

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    /** Redis key prefix for rate limiting */
    keyPrefix: 'tts:ratelimit:requests',
    /** Maximum requests per minute (ElevenLabs tier limit) */
    maxRequestsPerMinute: 50,
    /** Maximum wait time for rate limit slot (ms) */
    maxWaitMs: 30000,
    /** Initial backoff delay (ms) */
    initialBackoffMs: 500,
    /** Maximum backoff delay (ms) */
    maxBackoffMs: 5000,
    /** TTL for rate limit keys (seconds) */
    keyTtlSeconds: 120,
};

/**
 * Local concurrency configuration
 */
export const CONCURRENCY_CONFIG = {
    /** Maximum concurrent requests per instance */
    maxLocalConcurrency: 3,
};

/**
 * Audio format configuration (FFmpeg compatible)
 */
export const AUDIO_FORMAT = {
    format: 'mp3' as const,
    sampleRate: 44100 as const,
    bitrate: 128 as const,
    channels: 2 as const,
};

/**
 * Default ElevenLabs model (v3 for better expressivity and audio tags)
 */
export const DEFAULT_TTS_MODEL = 'eleven_v3' as const;

/**
 * Default output format (FFmpeg compatible: 44.1kHz stereo)
 */
export const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128' as const;

/**
 * Keywords for character archetype detection (multilingual)
 *
 * Includes both English and French keywords for each archetype.
 */
export const ARCHETYPE_KEYWORDS: Record<CharacterArchetype, string[]> = {
    narrator: [
        // English
        'narrator', 'narration', 'story', 'storyteller',
        // French
        'narrateur', 'narratrice', 'conteur', 'conteuse', 'histoire',
    ],
    childHero: [
        // English
        'child', 'kid', 'boy', 'girl', 'young', 'hero', 'protagonist',
        // French
        'enfant', 'garcon', 'fille', 'jeune', 'heros', 'heroine', 'protagoniste', 'petit', 'petite',
    ],
    wiseCharacter: [
        // English
        'wise', 'elder', 'sage', 'mentor', 'wizard', 'grandmother', 'grandfather', 'old',
        // French
        'sage', 'ancien', 'ancienne', 'mentor', 'sorcier', 'magicien', 'grand-mere', 'grand-pere', 'vieux', 'vieille',
    ],
    villain: [
        // English
        'villain', 'evil', 'bad', 'witch', 'monster', 'dragon', 'dark',
        // French
        'mechant', 'mechante', 'mal', 'mauvais', 'sorciere', 'monstre', 'dragon', 'sombre', 'vilain',
    ],
    comedic: [
        // English
        'funny', 'silly', 'comic', 'clown', 'joker', 'goofy',
        // French
        'drole', 'rigolo', 'comique', 'clown', 'bouffon', 'amusant', 'farceur',
    ],
    parent: [
        // English
        'parent', 'mom', 'dad', 'mother', 'father', 'mama', 'papa',
        // French
        'parent', 'maman', 'papa', 'mere', 'pere', 'mère', 'père',
    ],
    friend: [
        // English
        'friend', 'buddy', 'sidekick', 'companion', 'pal',
        // French
        'ami', 'amie', 'copain', 'copine', 'compagnon', 'compagne', 'camarade',
    ],
    animal: [
        // English
        'animal', 'pet', 'dog', 'cat', 'bird', 'rabbit', 'bear', 'fox', 'creature',
        // French
        'animal', 'chien', 'chat', 'oiseau', 'lapin', 'ours', 'renard', 'creature', 'loup', 'souris',
    ],
    magical: [
        // English
        'magical', 'fairy', 'elf', 'sprite', 'unicorn', 'magic', 'enchanted',
        // French
        'magique', 'fee', 'elfe', 'lutin', 'licorne', 'magie', 'enchante', 'fantastique',
    ],
};
