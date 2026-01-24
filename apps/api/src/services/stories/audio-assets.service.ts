/**
 * Audio Assets Service
 *
 * Business logic for audio asset management.
 * Wraps AudioAssetsStore and provides service-level methods.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { AudioAssetType } from '@mio/shared/types';

import type { AudioAsset, CreateAudioAssetInput } from './stories.service.types';
import type { AudioAssetsStore } from './audio-assets.store';
import { IocStore } from '../../ioc/ioc.types';
import { mapRowToAudioAsset, mapRowsToAudioAssets } from './audio-assets.service.map';

@injectable()
export class AudioAssetsService {
  constructor(
    @inject(IocStore.AUDIO_ASSETS_STORE)
    private readonly store: AudioAssetsStore
  ) {}

  /**
   * Create a new audio asset
   */
  async create(input: CreateAudioAssetInput): Promise<AudioAsset> {
    const row = await this.store.create(input);
    return mapRowToAudioAsset(row);
  }

  /**
   * Find an audio asset by ID
   */
  async findById(id: string): Promise<AudioAsset | null> {
    const row = await this.store.findById(id);
    if (!row) {
      return null;
    }
    return mapRowToAudioAsset(row);
  }

  /**
   * Find all audio assets for a story
   */
  async findByStoryId(storyId: string): Promise<AudioAsset[]> {
    const rows = await this.store.findByStoryId(storyId);
    return mapRowsToAudioAssets(rows);
  }

  /**
   * Find audio assets by segment ID
   */
  async findBySegmentId(segmentId: string): Promise<AudioAsset[]> {
    const rows = await this.store.findBySegmentId(segmentId);
    return mapRowsToAudioAssets(rows);
  }

  /**
   * Find audio asset by cache key
   */
  async findByCacheKey(cacheKey: string): Promise<AudioAsset | null> {
    const row = await this.store.findByCacheKey(cacheKey);
    if (!row) {
      return null;
    }
    return mapRowToAudioAsset(row);
  }

  /**
   * Find audio assets by story and type
   */
  async findByStoryIdAndType(storyId: string, type: AudioAssetType): Promise<AudioAsset[]> {
    const rows = await this.store.findByStoryIdAndType(storyId, type);
    return mapRowsToAudioAssets(rows);
  }

  /**
   * Find final mix asset for a story
   */
  async findFinalMixByStoryId(storyId: string): Promise<AudioAsset | null> {
    const row = await this.store.findFinalMixByStoryId(storyId);
    if (!row) {
      return null;
    }
    return mapRowToAudioAsset(row);
  }

  /**
   * Delete an audio asset
   */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * Delete all audio assets for a story
   */
  async deleteByStoryId(storyId: string): Promise<void> {
    await this.store.deleteByStoryId(storyId);
  }

  /**
   * Delete all audio assets for a segment
   */
  async deleteBySegmentId(segmentId: string): Promise<void> {
    await this.store.deleteBySegmentId(segmentId);
  }

  /**
   * Count audio assets for a story
   */
  async countByStoryId(storyId: string): Promise<number> {
    return this.store.countByStoryId(storyId);
  }

  /**
   * Count audio assets by type for a story
   */
  async countByStoryIdAndType(storyId: string, type: AudioAssetType): Promise<number> {
    return this.store.countByStoryIdAndType(storyId, type);
  }
}
