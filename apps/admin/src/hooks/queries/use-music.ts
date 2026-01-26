/**
 * Music Query Hook
 *
 * TanStack Query hook for fetching music tracks with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { MusicFilters, MusicTrack, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { MusicTrack, MusicFilters };

export function useMusic(filters: MusicFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'music', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getMusic(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<MusicTrack>) => lastPage.nextCursor ?? undefined
  });
}
