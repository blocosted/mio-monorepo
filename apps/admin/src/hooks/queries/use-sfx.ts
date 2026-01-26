/**
 * SFX Query Hook
 *
 * TanStack Query hook for fetching sound effects with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface SfxTrack {
  id: string;
  canonicalKey: string;
  category: string;
  subcategory: string;
  environment: string | null;
  intensity: string | null;
  prompt: string;
  promptInfluence: number;
  s3Url: string;
  durationSeconds: number;
  format: string;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SfxResponse {
  data: SfxTrack[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface SfxFilters {
  search?: string;
  category?: string;
  subcategory?: string;
  environment?: string;
  intensity?: string;
}

export function useSfx(filters: SfxFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'sfx', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<SfxResponse>('/admin/audio-library/sfx', {
        params: {
          ...filters,
          cursor: pageParam,
          limit: 20
        }
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
}
