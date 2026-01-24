/**
 * Story Finalization Service Tests
 *
 * Tests for the finalization service that handles final audio upload
 * and database updates. Uses mocked dependencies.
 */

import type { Logger } from '@mio/shared/server/logger';
import { AudioAssetType } from '@mio/shared/types';

import type { JobProgressService } from '../../cache';
import type { StorageService } from '../../storage';
import type { AudioAssetsStore } from '../audio-assets.store';
import type { GenerationJobsStore } from '../generation-jobs.store';
import type { StoriesStore } from '../stories.service.store';
import { StoryFinalizationService } from '../story-finalization.service';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * Create a testable StoryFinalizationService with mocked dependencies
 */
class TestableStoryFinalizationService extends StoryFinalizationService {
  private _mockLogger: Partial<Logger>;
  private _mockStorage: Partial<StorageService>;

  constructor(
    storiesStore: StoriesStore,
    jobsStore: GenerationJobsStore,
    audioAssetsStore: AudioAssetsStore,
    jobProgress: JobProgressService,
    mockLogger: Partial<Logger>,
    mockStorage: Partial<StorageService>
  ) {
    super(storiesStore, jobsStore, audioAssetsStore, jobProgress);
    this._mockLogger = mockLogger;
    this._mockStorage = mockStorage;
  }

  protected override get logger(): Logger {
    return this._mockLogger as Logger;
  }

  protected override get storageService(): StorageService {
    return this._mockStorage as StorageService;
  }
}

describe('StoryFinalizationService', () => {
  let service: TestableStoryFinalizationService;
  let mockStoriesStore: Partial<StoriesStore>;
  let mockJobsStore: Partial<GenerationJobsStore>;
  let mockAudioAssetsStore: Partial<AudioAssetsStore>;
  let mockJobProgress: Partial<JobProgressService>;
  let mockLogger: Partial<Logger>;
  let mockStorage: Partial<StorageService>;

  const storyId = 'story-123';
  const jobId = 'job-456';
  const assetId = 'asset-789';
  const finalAudioUrl = 'https://storage.example.com/stories/story-123/final.mp3';
  const durationSeconds = 120.5;

  beforeEach(() => {
    mockStoriesStore = {
      finalize: mock(() => Promise.resolve())
    };

    mockJobsStore = {
      complete: mock(() =>
        Promise.resolve({
          id: jobId,
          storyId,
          workflowRunId: null,
          status: 'completed' as const,
          progress: 100,
          currentStep: null,
          steps: [],
          result: { audioUrl: finalAudioUrl, duration: durationSeconds },
          error: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )
    };

    mockAudioAssetsStore = {
      create: mock(() =>
        Promise.resolve({
          id: assetId,
          storyId,
          segmentId: null,
          type: AudioAssetType.FinalMix,
          url: finalAudioUrl,
          duration: durationSeconds,
          cacheKey: null,
          createdAt: new Date()
        })
      )
    };

    mockJobProgress = {
      update: mock(() => Promise.resolve())
    };

    mockLogger = {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {})
    };

    mockStorage = {
      download: mock(() => Promise.resolve(Buffer.from('audio data'))),
      upload: mock(() => Promise.resolve({ url: finalAudioUrl, path: `stories/${storyId}/final.mp3` })),
      delete: mock(() => Promise.resolve())
    };

    service = new TestableStoryFinalizationService(
      mockStoriesStore as StoriesStore,
      mockJobsStore as GenerationJobsStore,
      mockAudioAssetsStore as AudioAssetsStore,
      mockJobProgress as JobProgressService,
      mockLogger,
      mockStorage
    );
  });

  describe('uploadFinalAudio()', () => {
    it('downloads from temp, uploads to final, creates asset, deletes temp', async () => {
      const result = await service.uploadFinalAudio({
        storyId,
        tempMixedAudioUrl: `stories/${storyId}/temp/mixed.mp3`,
        durationSeconds
      });

      expect(result.finalAudioUrl).toBe(finalAudioUrl);
      expect(result.assetId).toBe(assetId);

      // Verify download was called with temp path
      expect(mockStorage.download).toHaveBeenCalledWith(`stories/${storyId}/temp/mixed.mp3`);

      // Verify upload was called with final path
      expect(mockStorage.upload).toHaveBeenCalledWith(expect.any(Buffer), `stories/${storyId}/final.mp3`, { contentType: 'audio/mpeg' });

      // Verify audio asset was created
      expect(mockAudioAssetsStore.create).toHaveBeenCalledWith({
        storyId,
        type: AudioAssetType.FinalMix,
        url: finalAudioUrl,
        duration: durationSeconds
      });

      // Verify temp file was deleted
      expect(mockStorage.delete).toHaveBeenCalledWith(`stories/${storyId}/temp/mixed.mp3`);
    });

    it('continues even if temp file deletion fails', async () => {
      mockStorage.delete = mock(() => Promise.reject(new Error('Delete failed')));

      const result = await service.uploadFinalAudio({
        storyId,
        tempMixedAudioUrl: `stories/${storyId}/temp/mixed.mp3`,
        durationSeconds
      });

      expect(result.finalAudioUrl).toBe(finalAudioUrl);
      expect(result.assetId).toBe(assetId);

      // Warning should be logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('logs upload progress', async () => {
      await service.uploadFinalAudio({
        storyId,
        tempMixedAudioUrl: 'temp/path',
        durationSeconds: 60
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Uploading final audio', { storyId });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Final audio uploaded',
        expect.objectContaining({
          storyId,
          finalUrl: finalAudioUrl,
          assetId
        })
      );
    });
  });

  describe('finalizeStory()', () => {
    it('updates story, job, and cache', async () => {
      const result = await service.finalizeStory({
        storyId,
        jobId,
        finalAudioUrl,
        durationSeconds
      });

      expect(result.storyId).toBe(storyId);
      expect(result.finalAudioUrl).toBe(finalAudioUrl);
      expect(result.durationSeconds).toBe(durationSeconds);
      expect(result.success).toBe(true);

      // Verify story was finalized
      expect(mockStoriesStore.finalize).toHaveBeenCalledWith(storyId, {
        finalAudioUrl,
        duration: durationSeconds
      });

      // Verify job was completed
      expect(mockJobsStore.complete).toHaveBeenCalledWith(jobId, {
        audioUrl: finalAudioUrl,
        duration: durationSeconds
      });

      // Verify cache was updated
      expect(mockJobProgress.update).toHaveBeenCalledWith(jobId, {
        status: 'completed',
        progress: 100
      });
    });

    it('logs finalization progress', async () => {
      await service.finalizeStory({
        storyId,
        jobId,
        finalAudioUrl,
        durationSeconds
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Finalizing story in database', { storyId, jobId });
      expect(mockLogger.info).toHaveBeenCalledWith('Story finalized successfully', {
        storyId,
        jobId,
        finalAudioUrl,
        durationSeconds
      });
    });
  });

  describe('complete()', () => {
    it('calls uploadFinalAudio then finalizeStory', async () => {
      const result = await service.complete({
        storyId,
        jobId,
        tempMixedAudioUrl: `stories/${storyId}/temp/mixed.mp3`,
        durationSeconds
      });

      expect(result.storyId).toBe(storyId);
      expect(result.finalAudioUrl).toBe(finalAudioUrl);
      expect(result.durationSeconds).toBe(durationSeconds);
      expect(result.success).toBe(true);

      // Verify both storage operations happened
      expect(mockStorage.download).toHaveBeenCalled();
      expect(mockStorage.upload).toHaveBeenCalled();

      // Verify both DB operations happened
      expect(mockStoriesStore.finalize).toHaveBeenCalled();
      expect(mockJobsStore.complete).toHaveBeenCalled();
    });

    it('propagates upload errors', async () => {
      mockStorage.download = mock(() => Promise.reject(new Error('Download failed')));

      await expect(
        service.complete({
          storyId,
          jobId,
          tempMixedAudioUrl: 'temp/path',
          durationSeconds
        })
      ).rejects.toThrow('Download failed');
    });

    it('propagates finalization errors', async () => {
      mockStoriesStore.finalize = mock(() => Promise.reject(new Error('DB error')));

      await expect(
        service.complete({
          storyId,
          jobId,
          tempMixedAudioUrl: 'temp/path',
          durationSeconds
        })
      ).rejects.toThrow('DB error');
    });
  });
});
