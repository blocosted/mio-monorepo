/**
 * Story Query Hooks
 *
 * TanStack Query hooks for fetching story data.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface StoryCharacter {
  name: string;
  description: string;
  voiceType?: string;
}

export interface StorySetting {
  location: string;
  era: string;
  ambiance: string;
}

export interface EnrichedConcept {
  title?: string;
  mainCharacter?: StoryCharacter;
  secondaryCharacters?: StoryCharacter[];
  setting?: StorySetting;
  tone?: string;
  themes?: string[];
  synopsis?: string;
}

export interface StoryScript {
  segments?: Array<{
    type: string;
    content: unknown;
  }>;
}

export interface StoryDetail {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  enrichedConcept: EnrichedConcept | null;
  script: StoryScript | null;
  answers: Array<{
    questionId: string;
    value: string;
  }> | null;
  finalAudioUrl: string | null;
  duration: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorySegment {
  id: string;
  storyId: string;
  order: number;
  type: string;
  content: Record<string, unknown>;
  audioUrl: string | null;
  duration: number | null;
  createdAt: string;
}

export interface AudioAsset {
  id: string;
  storyId: string | null;
  segmentId: string | null;
  type: 'voice' | 'sfx' | 'music' | 'ambiance' | 'final_mix';
  url: string;
  duration: number;
  cacheKey: string | null;
  createdAt: string;
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id],
    queryFn: async () => {
      return apiClient<StoryDetail>(`/admin/stories/${id}`);
    },
    enabled: !!id,
  });
}

export function useStorySegments(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'segments'],
    queryFn: async () => {
      const response = await apiClient<{ data: StorySegment[] }>(`/admin/stories/${id}/segments`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useStoryAudioAssets(id: string) {
  return useQuery({
    queryKey: ['admin', 'stories', id, 'audio-assets'],
    queryFn: async () => {
      const response = await apiClient<{ data: AudioAsset[] }>(`/admin/stories/${id}/audio-assets`);
      return response.data;
    },
    enabled: !!id,
  });
}
