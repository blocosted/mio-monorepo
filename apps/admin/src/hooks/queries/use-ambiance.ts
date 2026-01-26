/**
 * Ambiance Query Hook
 *
 * TanStack Query hook for fetching ambiance tracks with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { AmbianceFilters, AmbianceTrack, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { AmbianceTrack, AmbianceFilters };

export function useAmbiance(filters: AmbianceFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audio-library', 'ambiance', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getAmbiance(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<AmbianceTrack>) => lastPage.nextCursor ?? undefined
  });
}
