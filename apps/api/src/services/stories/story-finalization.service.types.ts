/**
 * Story Finalization Service Types
 *
 * Types for handling final upload and DB updates after story generation.
 */

/**
 * Input for uploading final audio
 */
export interface UploadFinalAudioInput {
  /** Story ID */
  storyId: string;
  /** Temp URL where mixed audio is stored */
  tempMixedAudioUrl: string;
  /** Duration of the audio in seconds */
  durationSeconds: number;
}

/**
 * Result of uploading final audio
 */
export interface UploadFinalAudioResult {
  /** Final URL where audio is stored permanently */
  finalAudioUrl: string;
  /** Audio asset ID */
  assetId: string;
}

/**
 * Input for finalizing a story in the database
 */
export interface FinalizeStoryInput {
  /** Story ID */
  storyId: string;
  /** Job ID */
  jobId: string;
  /** Final audio URL */
  finalAudioUrl: string;
  /** Duration in seconds */
  durationSeconds: number;
}

/**
 * Result of story finalization
 */
export interface FinalizeStoryResult {
  /** Story ID */
  storyId: string;
  /** Final audio URL */
  finalAudioUrl: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Whether finalization was successful */
  success: boolean;
}

