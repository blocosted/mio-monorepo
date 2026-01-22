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
    VoiceFilterOptions,
} from './voice-registry.store';

// Services
export { TTSService } from './tts.service';
export { VoiceRegistryService } from './voice-registry.service';
export { TimelineSyncService } from './timeline-sync.service';

// Types
export type {
    ITTSService,
    GenerateSpeechInput,
    GenerateSpeechOutput,
    TTSRow,
    CreateTTSInput,
    CreateTTSRowInput,
} from './tts.service.types';
export type {
    IVoiceRegistryService,
    VoiceInfo,
    VoiceSearchFilters,
} from './voice-registry.service.types';
export type {
    ITimelineSyncService,
    SyncedSegment,
    TimelineSegment,
    TimelineSyncInput,
    TimelineSyncOutput,
} from './timeline-sync.service.types';
