/**
 * SFX Query Hook
 *
 * TanStack Query hook for fetching sound effects with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { SfxFilters, SfxTrack, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { SfxTrack, SfxFilters };

export function useSfx(filters: SfxFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'sfx', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getSfx(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<SfxTrack>) => lastPage.nextCursor ?? undefined
  });
}
