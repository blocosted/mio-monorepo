/**
 * Audio Assets Service Mappers
 *
 * Maps between database rows and service-level domain models.
 */

import type { AudioAssetRow } from './audio-assets.store';
import type { AudioAsset } from './stories.service.types';

/**
 * Map a database row to an AudioAsset domain model
 */
export function mapRowToAudioAsset(row: AudioAssetRow): AudioAsset {
  return {
    id: row.id,
    storyId: row.storyId ?? '',
    segmentId: row.segmentId ?? undefined,
    type: row.type,
    url: row.url,
    duration: row.duration,
    cacheKey: row.cacheKey ?? undefined,
    createdAt: row.createdAt
  };
}

/**
 * Map multiple database rows to AudioAsset domain models
 */
export function mapRowsToAudioAssets(rows: AudioAssetRow[]): AudioAsset[] {
  return rows.map(mapRowToAudioAsset);
}
