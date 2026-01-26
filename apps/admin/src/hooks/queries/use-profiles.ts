/**
 * Profiles Query Hook
 *
 * TanStack Query hook for fetching profiles with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { ProfileFilters, AdminProfile, PaginatedResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { AdminProfile as Profile, ProfileFilters };

export function useProfiles(filters: ProfileFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'profiles', filters],
    queryFn: async ({ pageParam }) => {
      const client = getMioApiClient();
      return client.admin.getProfiles(filters, {
        cursor: pageParam,
        limit: 20
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PaginatedResponse<AdminProfile>) => lastPage.nextCursor ?? undefined
  });
}
