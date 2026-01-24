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

/**
 * Story Finalization Service Interface
 */
export interface IStoryFinalizationService {
  /**
   * Upload final audio from temp to permanent location
   *
   * - Downloads from temp S3 location
   * - Uploads to final S3 location
   * - Creates audio asset record
   * - Deletes temp file
   */
  uploadFinalAudio(input: UploadFinalAudioInput): Promise<UploadFinalAudioResult>;

  /**
   * Finalize a story in the database
   *
   * - Updates story status to ready
   * - Updates job status to completed
   * - Updates Redis cache
   */
  finalizeStory(input: FinalizeStoryInput): Promise<FinalizeStoryResult>;

  /**
   * Complete finalization (upload + DB update)
   *
   * Combines uploadFinalAudio and finalizeStory into a single operation.
   */
  complete(input: { storyId: string; jobId: string; tempMixedAudioUrl: string; durationSeconds: number }): Promise<FinalizeStoryResult>;
}
