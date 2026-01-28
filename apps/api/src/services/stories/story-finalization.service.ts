/**
 * Story Finalization Service Implementation
 *
 * Handles the final steps of story generation:
 * - Moving mixed audio from temp to final location
 * - Updating story and job records in database
 * - Updating cache and publishing completion events
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { AudioAssetType } from '@mio/shared/types';

import type { JobProgressService } from '../cache';
import type { AudioAssetsStore } from './audio-assets.store';
import type { GenerationJobsStore } from './generation-jobs.store';
import type { StoriesStore } from './stories.service.store';
import type {
  FinalizeStoryInput,
  FinalizeStoryResult,
  UploadFinalAudioInput,
  UploadFinalAudioResult
} from './story-finalization.service.types';
import { IocService, IocStore } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/** S3 path helpers */
const S3_PATHS = {
  getTempMixPath: (storyId: string) => `stories/${storyId}/temp/mixed.mp3`,
  getFinalAudioPath: (storyId: string) => `stories/${storyId}/final.mp3`
} as const;

/**
 * Story Finalization Service
 *
 * Coordinates final upload and database updates after story generation.
 */
@injectable()
export class StoryFinalizationService extends AbstractService {
  constructor(
    @inject(IocStore.STORIES_STORE) private readonly storiesStore: StoriesStore,
    @inject(IocStore.GENERATION_JOBS_STORE) private readonly jobsStore: GenerationJobsStore,
    @inject(IocStore.AUDIO_ASSETS_STORE) private readonly audioAssetsStore: AudioAssetsStore,
    @inject(IocService.JOB_PROGRESS) private readonly jobProgress: JobProgressService
  ) {
    super();
  }

  /**
   * Upload final audio from temp to permanent location
   */
  async uploadFinalAudio(input: UploadFinalAudioInput): Promise<UploadFinalAudioResult> {
    const { storyId, durationSeconds } = input;

    this.logger.info('Uploading final audio', { storyId });

    // Download from temp location
    const tempPath = S3_PATHS.getTempMixPath(storyId);
    const buffer = await this.storageService.download(tempPath);

    // Upload to final location
    const finalPath = S3_PATHS.getFinalAudioPath(storyId);
    const uploadResult = await this.storageService.upload(buffer, finalPath, { contentType: 'audio/mpeg' });

    // Create audio asset record
    const asset = await this.audioAssetsStore.create({
      storyId,
      type: AudioAssetType.FinalMix,
      url: uploadResult.url,
      duration: durationSeconds
    });

    // Delete temp file
    try {
      await this.storageService.delete(tempPath);
      this.logger.debug('Temp file deleted', { tempPath });
    } catch (error) {
      // Log but don't fail - temp cleanup is not critical
      this.logger.warn('Failed to delete temp file', {
        tempPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    this.logger.info('Final audio uploaded', {
      storyId,
      finalUrl: uploadResult.url,
      assetId: asset.id
    });

    return {
      finalAudioUrl: uploadResult.url,
      assetId: asset.id
    };
  }

  /**
   * Finalize a story in the database
   */
  async finalizeStory(input: FinalizeStoryInput): Promise<FinalizeStoryResult> {
    const { storyId, jobId, finalAudioUrl, durationSeconds } = input;

    this.logger.info('Finalizing story in database', { storyId, jobId });

    // Update story (status=ready, finalAudioUrl, duration)
    await this.storiesStore.finalize(storyId, {
      finalAudioUrl,
      duration: durationSeconds
    });

    // Update job (status=completed, progress=100, result)
    await this.jobsStore.complete(jobId, {
      audioUrl: finalAudioUrl,
      duration: durationSeconds
    });

    // Update Redis cache and publish completion event
    await this.jobProgress.update(jobId, {
      status: 'completed',
      progress: 100
    });

    this.logger.info('Story finalized successfully', {
      storyId,
      jobId,
      finalAudioUrl,
      durationSeconds
    });

    return {
      storyId,
      finalAudioUrl,
      durationSeconds,
      success: true
    };
  }

  /**
   * Complete finalization (upload + DB update)
   */
  async complete(input: { storyId: string; jobId: string; tempMixedAudioUrl: string; durationSeconds: number }): Promise<FinalizeStoryResult> {
    const { storyId, jobId, tempMixedAudioUrl, durationSeconds } = input;

    // Upload final audio
    const uploadResult = await this.uploadFinalAudio({
      storyId,
      tempMixedAudioUrl,
      durationSeconds
    });

    // Finalize in database
    return this.finalizeStory({
      storyId,
      jobId,
      finalAudioUrl: uploadResult.finalAudioUrl,
      durationSeconds
    });
  }

  /**
   * Finalize a story remix (no job involved)
   *
   * Used when remixing a story without going through the workflow.
   * Only updates the story record, not job records.
   */
  async finalizeStoryRemix(input: {
    storyId: string;
    finalAudioUrl: string;
    durationSeconds: number;
  }): Promise<{ storyId: string; finalAudioUrl: string; durationSeconds: number; success: boolean }> {
    const { storyId, finalAudioUrl, durationSeconds } = input;

    this.logger.info('Finalizing story remix in database', { storyId });

    // Update story (status=ready, finalAudioUrl, duration)
    await this.storiesStore.finalize(storyId, {
      finalAudioUrl,
      duration: durationSeconds
    });

    this.logger.info('Story remix finalized successfully', {
      storyId,
      finalAudioUrl,
      durationSeconds
    });

    return {
      storyId,
      finalAudioUrl,
      durationSeconds,
      success: true
    };
  }
}
