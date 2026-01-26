/**
 * Music Query Hook
 *
 * TanStack Query hook for fetching music tracks with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface MusicTrack {
  id: string;
  canonicalKey: string;
  mood: string;
  intensity: string | null;
  tempo: string | null;
  variationIndex: number;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface MusicResponse {
  data: MusicTrack[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface MusicFilters {
  search?: string;
  mood?: string;
  intensity?: string;
  tempo?: string;
}

export function useMusic(filters: MusicFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'music', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<MusicResponse>('/admin/audio-library/music', {
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
