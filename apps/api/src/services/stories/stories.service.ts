/**
 * Stories Service Implementation
 *
 * Business logic for story creation and management.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { AppError, ErrorCodes } from '@mio/shared';
import { JobStatus } from '@mio/shared/types';

import type { IProfilesStore } from '../profiles';
import type { GenerationJobRow, GenerationJobsStore } from './generation-jobs.store';
import type { CreateStoryInput, IStoriesService, IStoriesStore, Story } from './stories.service.types';
import { IocStore } from '../../ioc/ioc.types';
import { mapRowToStory } from './stories.service.map';

@injectable()
export class StoriesService implements IStoriesService {
  constructor(
    @inject(IocStore.STORIES_STORE)
    private readonly store: IStoriesStore,
    @inject(IocStore.PROFILES_STORE)
    private readonly profilesStore: IProfilesStore,
    @inject(IocStore.GENERATION_JOBS_STORE)
    private readonly jobsStore: GenerationJobsStore
  ) {}

  /**
   * Create a new story from an initial prompt.
   * Ensures the child profile exists before insertion.
   */
  async create(input: CreateStoryInput): Promise<Story> {
    const profile = await this.profilesStore.findById(input.childProfileId);
    if (!profile) {
      throw new AppError(ErrorCodes.NotFound, { name: 'ChildProfileNotFound' });
    }

    const row = await this.store.insert({
      childProfileId: input.childProfileId,
      initialPrompt: input.prompt
    });

    return mapRowToStory(row);
  }

  /**
   * Find a story by ID
   */
  async findById(id: string): Promise<any> {
    const story = await this.store.findById(id);
    if (!story) {
      return null;
    }
    return story;
  }

  /**
   * Create a generation job for a story
   */
  async createGenerationJob(storyId: string): Promise<GenerationJobRow> {
    return this.jobsStore.create({
      storyId,
      status: JobStatus.Pending
    });
  }

  /**
   * Update workflow run ID for a job
   */
  async updateJobWorkflowRunId(jobId: string, workflowRunId: string): Promise<void> {
    await this.jobsStore.updateWorkflowRunId(jobId, workflowRunId);
  }
}
