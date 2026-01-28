/**
 * Narration Services Module
 *
 * Voice-over and narration services (TTS, voice registry, voice assignment, timeline computation).
 */

// Types
export type {
  AudioFormat,
  BatchGenerateSpeechInput,
  BatchSegment,
  BatchSegmentResult,
  CharacterArchetype,
  GenerateSpeechInput,
  GenerateSpeechResult
} from './tts.service.types';
export type {
  CharacterVoiceAssignment,
  VoiceAssignmentInput,
  VoiceAssignmentResult,
  VoiceCandidate,
  VoiceSelection
} from './voice-assignment.service.types';
export type {
  VoiceGenerationInput,
  VoiceGenerationResult,
  VoiceSegmentGenerationResult
} from './voice-generation.orchestrator.types';
export type {
  ApiVoice,
  ParsedVoice,
  StoredVoice,
  SyncOptions,
  SyncResult,
  VoiceFilterOptions
} from './voice-registry.service.types';
export type {
  UpsertVoiceInput,
  VoiceRow
} from './voice-registry.store';
export { TimelineComputationService } from './timeline-computation.service';
// Services
export { TTSService } from './tts.service';
// Constants
export {
  DEFAULT_VOICE_SETTINGS,
  EMOTION_AUDIO_TAGS,
  EMOTION_VOICE_SETTINGS
} from './tts.service.constants';
export { VoiceAssignmentService } from './voice-assignment.service';
export { VoiceGenerationOrchestrator } from './voice-generation.orchestrator';
export { VoiceRegistryService } from './voice-registry.service';
// Stores
export { VoiceRegistryStore } from './voice-registry.store';
