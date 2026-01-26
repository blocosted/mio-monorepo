/**
 * Stories Query Hook
 *
 * TanStack Query hook for fetching stories with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { StoryFilters, AdminStory, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { AdminStory as Story, StoryFilters };

export function useStories(filters: StoryFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'stories', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getStories(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<AdminStory>) => lastPage.nextCursor ?? undefined
  });
}
