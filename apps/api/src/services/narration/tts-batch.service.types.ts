/**
 * TTS Batch Service Types
 *
 * Re-exports types from the batch service for cleaner imports.
 */

export type {
  TTSSegmentInput,
  TTSBatchedSegment,
  TTSSplitResult
} from './tts-batch.service';

export {
  MIN_TTS_CHARACTERS,
  MAX_BATCH_CHARACTERS,
  BATCH_SEPARATOR
} from './tts-batch.service';
