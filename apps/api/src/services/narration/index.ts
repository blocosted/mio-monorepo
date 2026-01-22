/**
 * Narration Services Module
 *
 * Voice-over and narration services (TTS, voice registry, timeline sync).
 */

// Stores
export { VoiceRegistryStore } from './voice-registry.store';
export { TTSStore } from './tts.service.store';
export type {
    VoiceRow,
    UpsertVoiceInput,
} from './voice-registry.store';

// Services
export { TTSService } from './tts.service';
export { VoiceRegistryService } from './voice-registry.service';
export { TimelineSyncService } from './timeline-sync.service';

// Types
export type {
    ITTSService,
    GenerateSpeechInput,
    GenerateSpeechResult,
    BatchGenerateSpeechInput,
    BatchSegment,
    BatchSegmentResult,
    AudioFormat,
    CharacterArchetype,
} from './tts.service.types';
export type {
    IVoiceRegistryService,
    StoredVoice,
    ApiVoice,
    ParsedVoice,
    VoiceFilterOptions,
    SyncResult,
    SyncOptions,
} from './voice-registry.service.types';
export type {
    ITimelineSyncService,
    TTSSegmentResult,
    VoiceSegmentTiming,
    SyncMetadata,
    SyncedStoryScript,
    TimelineSyncOptions,
} from './timeline-sync.service.types';

// Constants
export {
    VOICE_IDS_BY_LANGUAGE,
    DEFAULT_VOICE_IDS,
    EMOTION_AUDIO_TAGS,
    EMOTION_VOICE_SETTINGS,
    DEFAULT_VOICE_SETTINGS,
    ARCHETYPE_PRIORITY,
    ARCHETYPE_KEYWORDS,
} from './tts.service.constants';
