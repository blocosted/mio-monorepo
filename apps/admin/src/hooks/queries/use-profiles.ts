/**
 * Profiles Query Hook
 *
 * TanStack Query hook for fetching profiles with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Profile {
  id: string;
  firstName: string;
  age: number;
  gender: string;
  preferences: {
    themes?: string[];
    fears?: string[];
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfilesResponse {
  data: Profile[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface ProfileFilters {
  search?: string;
  gender?: string;
}

export function useProfiles(filters: ProfileFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'profiles', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<ProfilesResponse>('/admin/profiles', {
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
