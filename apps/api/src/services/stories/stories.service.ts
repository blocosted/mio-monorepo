/**
 * Stories Service Implementation
 *
 * Business logic for story creation and management.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { AppError, ErrorCodes } from '@mio/shared';
import { type StoryScript, JobStatus } from '@mio/shared/types';

import type { EnrichmentService } from '../llm';
import type { ProfilesService } from '../profiles';
import type { StorageService } from '../storage';
import type { AudioAssetsService } from './audio-assets.service';
import type { GenerationJobsService } from './generation-jobs.service';
import type { CreateStoryInput, EnrichedConcept, GenerationJob, PaginatedStoriesResult, Story, StoryFilterOptions, StoryPaginationOptions } from './stories.service.types';
import type { StoriesStore } from './stories.service.store';
import { getInstance, IocService, IocStore } from '../../ioc';
import { mapRowToStory } from './stories.service.map';

@injectable()
export class StoriesService {
  constructor(
    @inject(IocStore.STORIES_STORE)
    private readonly store: StoriesStore,
    @inject(IocService.PROFILES)
    private readonly profilesService: ProfilesService,
    @inject(IocService.GENERATION_JOBS)
    private readonly jobsService: GenerationJobsService,
    @inject(IocService.AUDIO_ASSETS)
    private readonly audioAssetsService: AudioAssetsService
  ) {}

  /**
   * Get the enrichment service lazily (avoids API key requirement at startup)
   */
  private getEnrichmentService(): EnrichmentService {
    return getInstance<EnrichmentService>(IocService.ENRICHMENT);
  }

  /**
   * Get the storage service lazily
   */
  private getStorageService(): StorageService {
    return getInstance<StorageService>(IocService.STORAGE);
  }

  /**
   * Create a new story from an initial prompt.
   * Ensures the child profile exists before insertion.
   */
  async create(input: CreateStoryInput): Promise<Story> {
    const profile = await this.profilesService.getById(input.childProfileId);
    if (!profile) {
      throw new AppError(ErrorCodes.NotFound, { name: 'ChildProfileNotFound' });
    }

    const row = await this.store.insert({
      childProfileId: input.childProfileId,
      initialPrompt: input.prompt,
      targetDurationMinutes: input.targetDurationMinutes
    });

    return mapRowToStory(row);
  }

  /**
   * Find a story by ID
   */
  async findById(id: string): Promise<Story | null> {
    const row = await this.store.findById(id);
    if (!row) {
      return null;
    }
    return mapRowToStory(row);
  }

  /**
   * Find all stories for a profile
   */
  async findByProfileId(profileId: string): Promise<Story[]> {
    const rows = await this.store.findByChildProfileId(profileId);
    return rows.map(mapRowToStory);
  }

  /**
   * Enrich a story with LLM-generated content
   */
  async enrichStory(id: string): Promise<EnrichedConcept> {
    const storyRow = await this.store.findById(id);
    if (!storyRow) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }

    const profile = await this.profilesService.getById(storyRow.childProfileId);
    if (!profile) {
      throw new AppError(ErrorCodes.NotFound, { name: 'ChildProfileNotFound' });
    }

    const enrichmentService = this.getEnrichmentService();
    const result = await enrichmentService.enrichStory({
      story: {
        id: storyRow.id,
        initialPrompt: storyRow.initialPrompt
      },
      profile: {
        firstName: profile.firstName,
        age: profile.age,
        gender: profile.gender,
        favoriteThemes: profile.preferences.favoriteThemes,
        avoidThemes: profile.preferences.avoidThemes,
        includeChildAsCharacter: profile.preferences.includeChildAsCharacter,
        preferredHeroGender: profile.preferences.preferredHeroGender,
        language: profile.preferences.language
      }
    });

    await this.store.updateEnrichedConcept(id, result.enrichedConcept);

    return result.enrichedConcept;
  }

  /**
   * Delete a story and cleanup associated resources
   */
  async delete(id: string): Promise<boolean> {
    const story = await this.store.findById(id);
    if (!story) {
      return false;
    }

    // Get audio assets to cleanup from S3
    const audioAssets = await this.audioAssetsService.findByStoryId(id);
    const urlsToDelete = audioAssets
      .map((asset) => asset.url)
      .filter((url): url is string => url !== null);

    // Delete files from S3 (extract paths from URLs)
    if (urlsToDelete.length > 0) {
      try {
        const storageService = this.getStorageService();
        await storageService.deleteMany(urlsToDelete);
      } catch {
        // Log but don't fail - DB cascade will still cleanup records
      }
    }

    // Delete story (cascades to segments, audio_assets, generation_jobs)
    return this.store.delete(id);
  }

  /**
   * Create a generation job for a story
   */
  async createGenerationJob(storyId: string): Promise<GenerationJob> {
    return this.jobsService.create({
      storyId,
      status: JobStatus.Pending
    });
  }

  /**
   * Delete existing generation job for a story (for regeneration)
   */
  async deleteGenerationJobByStoryId(storyId: string): Promise<void> {
    await this.jobsService.deleteByStoryId(storyId);
  }

  /**
   * Update workflow run ID for a job
   */
  async updateJobWorkflowRunId(jobId: string, workflowRunId: string): Promise<void> {
    await this.jobsService.updateWorkflowRunId(jobId, workflowRunId);
  }

  /**
   * Find stories with cursor-based pagination (delegates to store)
   */
  async findPaginated(filters: StoryFilterOptions, pagination: StoryPaginationOptions): Promise<PaginatedStoriesResult> {
    return this.store.findPaginated(filters, pagination);
  }

  /**
   * Update the initial prompt for a story (only for draft stories)
   */
  async updatePrompt(id: string, prompt: string): Promise<void> {
    const story = await this.store.findById(id);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }
    if (story.status !== 'draft') {
      throw new AppError(ErrorCodes.ValidationError, { name: 'StoryNotDraft' });
    }
    await this.store.updatePrompt(id, prompt);
  }

  /**
   * Update the script for a story
   */
  async updateScript(id: string, script: StoryScript): Promise<void> {
    const story = await this.store.findById(id);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }
    await this.store.updateScript(id, script);
  }
}
