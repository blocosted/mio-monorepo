/**
 * Stories Query Hook
 *
 * TanStack Query hook for fetching stories with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Story {
  id: string;
  childProfileId: string;
  title: string;
  status: string;
  theme: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
}

interface StoriesResponse {
  data: Story[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface StoryFilters {
  search?: string;
  status?: string;
  childProfileId?: string;
}

export function useStories(filters: StoryFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'stories', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<StoriesResponse>('/admin/stories', {
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
