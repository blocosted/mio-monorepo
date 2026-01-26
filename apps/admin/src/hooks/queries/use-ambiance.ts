/**
 * Ambiance Query Hook
 *
 * TanStack Query hook for fetching ambiance tracks with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface AmbianceTrack {
  id: string;
  canonicalKey: string;
  environment: string;
  subEnvironment: string | null;
  timeOfDay: string | null;
  weather: string | null;
  mood: string | null;
  prompt: string;
  promptInfluence: number;
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

interface AmbianceResponse {
  data: AmbianceTrack[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface AmbianceFilters {
  search?: string;
  environment?: string;
  subEnvironment?: string;
  timeOfDay?: string;
  weather?: string;
  mood?: string;
}

export function useAmbiance(filters: AmbianceFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'ambiance', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<AmbianceResponse>('/admin/audio-library/ambiance', {
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
