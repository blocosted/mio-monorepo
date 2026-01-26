/**
 * Story Segments Service
 *
 * Business logic for story segment management.
 * Wraps StorySegmentsStore and provides service-level methods.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { SegmentType } from '@mio/shared/types';

import type { CreateStorySegmentInput, StorySegmentRow, StorySegmentsStore, UpdateStorySegmentInput } from './story-segments.store';
import { IocStore } from '../../ioc/ioc.types';

@injectable()
export class StorySegmentsService {
  constructor(
    @inject(IocStore.STORY_SEGMENTS_STORE)
    private readonly store: StorySegmentsStore
  ) {}

  /**
   * Create a new story segment
   */
  async create(input: CreateStorySegmentInput): Promise<StorySegmentRow> {
    return this.store.create(input);
  }

  /**
   * Find all segments for a story, ordered by sequence
   */
  async findByStoryId(storyId: string): Promise<StorySegmentRow[]> {
    return this.store.findByStoryId(storyId);
  }

  /**
   * Find a specific segment by ID
   */
  async findById(id: string): Promise<StorySegmentRow | null> {
    return this.store.findById(id);
  }

  /**
   * Update a story segment
   */
  async update(id: string, input: UpdateStorySegmentInput): Promise<StorySegmentRow | null> {
    return this.store.update(id, input);
  }

  /**
   * Delete a story segment
   */
  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }

  /**
   * Delete all segments for a story
   */
  async deleteByStoryId(storyId: string): Promise<void> {
    return this.store.deleteByStoryId(storyId);
  }

  /**
   * Count segments for a story
   */
  async countByStoryId(storyId: string): Promise<number> {
    return this.store.countByStoryId(storyId);
  }

  /**
   * Find segments by type for a story
   */
  async findByStoryIdAndType(storyId: string, type: SegmentType): Promise<StorySegmentRow[]> {
    return this.store.findByStoryIdAndType(storyId, type);
  }
}
