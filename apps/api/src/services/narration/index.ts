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
export type {
  ComputedPause,
  PauseComputationConfig,
  PauseComputationContext,
  PauseContextType,
  VoiceSegmentInfo
} from './pause-computation.service.types';
export type {
  VoiceMatchResult,
  VoiceMatchScore,
  VoiceProfile,
  VoiceSpecialization,
  VoiceTone
} from './voice-assignment.service.types';
export type {
  CharacterWithVoiceRecommendations,
  GetCharactersInput,
  GetCharactersResult,
  GetRecommendedVoicesOptions,
  UpdateVoiceAssignmentsInput,
  UpdateVoiceAssignmentsResult,
  VoiceAssignmentEntry,
  VoiceInfo,
  VoiceRecommendation
} from './voice-selection.service.types';
export type {
  TTSSegmentInput,
  TTSBatchedSegment,
  TTSSplitResult
} from './tts-batch.service';

// Services
export { TTSService } from './tts.service';
export { TTSBatchService, MIN_TTS_CHARACTERS, MAX_BATCH_CHARACTERS } from './tts-batch.service';
export { TimelineComputationService } from './timeline-computation.service';
export { PauseComputationService } from './pause-computation.service';
export { VoiceMatchingService } from './voice-matching.service';
export { VoiceAssignmentService } from './voice-assignment.service';
export { VoiceSelectionService } from './voice-selection.service';
export { VoiceGenerationOrchestrator } from './voice-generation.orchestrator';
export { VoiceRegistryService } from './voice-registry.service';

// Constants
export {
  DEFAULT_VOICE_SETTINGS,
  EMOTION_AUDIO_TAGS,
  EMOTION_VOICE_SETTINGS,
  SPEECH_ACT_AUDIO_TAGS
} from './tts.service.constants';
export { PAUSE_CONTEXT_TYPE } from './pause-computation.service.types';
export {
  VoiceSpecialization as VoiceSpecializationEnum,
  VoiceTone as VoiceToneEnum
} from './voice-assignment.service.types';

// Stores
export { VoiceRegistryStore } from './voice-registry.store';
