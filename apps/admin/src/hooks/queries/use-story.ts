/**
 * Story Query Hooks
 *
 * TanStack Query hooks for fetching story data.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import type { AdminStory, StorySegment, AudioAsset } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { AdminStory as StoryDetail, StorySegment, AudioAsset };

export function useStory(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id],
    queryFn: async () => {
      const client = getMioApiClient();
      return client.admin.getStory(id);
    },
    enabled: !!id
  });
}

export function useStorySegments(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'segments'],
    queryFn: async () => {
      const client = getMioApiClient();
      return client.admin.getStorySegments(id);
    },
    enabled: !!id
  });
}

export function useStoryAudioAssets(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'audio-assets'],
    queryFn: async () => {
      const client = getMioApiClient();
      return client.admin.getStoryAudioAssets(id);
    },
    enabled: !!id
  });
}
