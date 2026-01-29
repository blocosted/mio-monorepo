/**
 * Story Query Hooks
 *
 * TanStack Query hooks for fetching story data.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import type {
  AdminStory,
  StorySegment,
  AudioAsset,
  ComputedTimelineResponse,
  GetStoryCharactersResponse
} from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { AdminStory as StoryDetail, StorySegment, AudioAsset, ComputedTimelineResponse, GetStoryCharactersResponse };

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

export function useStoryComputedTimeline(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'computed-timeline'],
    queryFn: async () => {
      const client = getMioApiClient();
      return client.admin.getStoryComputedTimeline(id);
    },
    enabled: !!id
  });
}

export function useStoryCharacters(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'characters'],
    queryFn: async () => {
      const client = getMioApiClient();
      return client.admin.getStoryCharacters(id);
    },
    enabled: !!id
  });
}
