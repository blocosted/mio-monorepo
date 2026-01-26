/**
 * Voices Query Hook
 *
 * TanStack Query hook for fetching voices with cursor-based pagination.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Voice {
  id: string;
  voiceId: string;
  name: string;
  gender: string;
  age: string;
  language: string;
  locale: string;
  accent: string;
  useCase: string;
  category: string;
  description: string;
  previewUrl: string;
  isHighQuality: boolean;
  labels: Record<string, string>;
  lastSyncedAt: string;
  createdAt: string;
}

interface VoicesResponse {
  data: Voice[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface VoiceFilters {
  search?: string;
  gender?: string;
  age?: string;
  language?: string;
  useCase?: string;
  isHighQuality?: boolean;
}

export function useVoices(filters: VoiceFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['admin', 'voices', filters],
    queryFn: async ({ pageParam }) => {
      return apiClient<VoicesResponse>('/admin/voices', {
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
