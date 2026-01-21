/**
 * Audio Services
 *
 * Text-to-Speech and audio generation services.
 */

// TTS Service
export { TTSService } from './tts.service';
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
    DEFAULT_TTS_MODEL,
    DEFAULT_OUTPUT_FORMAT,
} from './tts.service.constants';
