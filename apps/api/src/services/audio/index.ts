/**
 * Audio Services
 *
 * Text-to-Speech and audio generation services.
 */

// TTS Service
export { TTSService } from './tts.service';
export { TTSStore } from './tts.service.store';
export type {
    ITTSService,
    GenerateSpeechInput,
    GenerateSpeechResult,
    BatchGenerateSpeechInput,
    BatchGenerateSpeechResult,
    BatchSegment,
    BatchSegmentResult,
    CharacterArchetype,
    AudioFormat,
    VoiceSelectionOptions,
} from './tts.service.types';

// ElevenLabs Provider
export { ElevenLabsProvider } from './elevenLabs.provider';
export type {
    IElevenLabsProvider,
    ElevenLabsConvertInput,
    ElevenLabsConvertResult,
    ElevenLabsAlignment,
    ElevenLabsOutputFormat,
    ElevenLabsModel,
} from './elevenLabs.provider.types';

// Voice Registry Service
export { VoiceRegistryService } from './voice-registry.service';
export type {
    IVoiceRegistryService,
    StoredVoice,
    ApiVoice,
    SyncResult,
} from './voice-registry.service.types';

// Constants (for testing and configuration)
export {
    DEFAULT_VOICE_IDS,
    VOICE_IDS_BY_LANGUAGE,
    EMOTION_VOICE_SETTINGS,
    EMOTION_AUDIO_TAGS,
    DEFAULT_VOICE_SETTINGS,
    RATE_LIMIT_CONFIG,
    CONCURRENCY_CONFIG,
    AUDIO_FORMAT,
    ARCHETYPE_KEYWORDS,
    ARCHETYPE_PRIORITY,
    DEFAULT_TTS_MODEL,
    DEFAULT_OUTPUT_FORMAT,
} from './tts.service.constants';

// FFmpeg Mixer Service
export { FFmpegMixerService } from './ffmpeg-mixer.service';
export type {
    IFFmpegMixerService,
    MixStoryInput,
    MixStoryResult,
    FFmpegVerifyResult,
    VoiceTrackInput,
    MusicTrackInput,
    AmbianceTrackInput,
    SfxTrackInput,
    AudioFile,
} from './ffmpeg-mixer.service.types';

// FFmpeg Mixer Constants
export {
    TEMP_DIR_BASE,
    WORKDIR_PREFIX,
    FFMPEG_TIMEOUT_MS,
    DEFAULT_VOLUMES,
    DUCKING_DEFAULTS,
    OUTPUT_FORMAT,
    LOUDNORM_SETTINGS,
    FILTER_TEMPLATES,
} from './ffmpeg-mixer.service.constants';

// Sound Effects Provider
export { SoundEffectsProvider } from './soundEffects.provider';
export { SfxCategory } from './soundEffects.provider.types';
export type {
    ISoundEffectsProvider,
    SoundEffectsConvertInput,
    SoundEffectsConvertResult,
} from './soundEffects.provider.types';

// Sound Effects Service
export { SoundEffectsService } from './soundEffects.service';
export { SoundEffectsStore } from './soundEffects.service.store';
export type {
    ISoundEffectsService,
    GenerateSfxInput,
    GenerateSfxResult,
    BatchGenerateSfxInput,
    BatchGenerateSfxResult,
    BatchSfxSegment,
    BatchSfxSegmentResult,
    SfxAudioFormat,
} from './soundEffects.service.types';

// Sound Effects Constants
export {
    SFX_AUDIO_FORMAT,
    DEFAULT_SFX_OUTPUT_FORMAT,
    DEFAULT_PROMPT_INFLUENCE,
    SFX_RATE_LIMIT_CONFIG,
    SFX_CONCURRENCY_CONFIG,
    SFX_DURATION_LIMITS,
    RECOMMENDED_DURATIONS,
    CATEGORY_PROMPT_INFLUENCE,
} from './soundEffects.service.constants';

// Timeline Sync Service
export { TimelineSyncService } from './timeline-sync.service';
export type {
    ITimelineSyncService,
    TTSSegmentResult,
    SyncedStoryScript,
    VoiceSegmentTiming,
    TimelineSyncOptions,
} from './timeline-sync.service.types';

// Music Strategy Service
export { MusicStrategyService } from './music-strategy.service';
export type {
    IMusicStrategyService,
    MusicStrategyInput,
    MusicStrategyOutput,
    MusicCue,
    MusicMood,
    MusicCueReason,
    MusicStrategy,
    PunctualStrategyConfig,
} from './music-strategy.service.types';

// Ambiance Generator Service
export { AmbianceGeneratorService } from './ambiance-generator.service';
export type {
    IAmbianceGeneratorService,
    AmbianceGenerateInput,
    AmbianceGenerateResult,
    AmbianceSegmentInput,
    AmbianceSegmentResult,
} from './ambiance-generator.service.types';

// Music Generator Service
export { MusicGeneratorService } from './music-generator.service';
export type {
    IMusicGeneratorService,
    MusicGenerateInput,
    MusicGenerateResult,
    MusicSegmentInput,
    MusicSegmentResult,
    MoodPromptMapping,
} from './music-generator.service.types';
