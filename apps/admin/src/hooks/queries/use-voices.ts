/**
 * Voices Query Hook
 *
 * TanStack Query hook for fetching voices with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { VoiceFilters, Voice, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { Voice, VoiceFilters };

export function useVoices(filters: VoiceFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'voices', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getVoices(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<Voice>) => lastPage.nextCursor ?? undefined
  });
}
