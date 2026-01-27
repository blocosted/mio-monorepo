/**
 * Story Mutations Hooks
 *
 * TanStack Query mutations for story operations.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { GenerateStoryBody } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

// Enrich Story
export function useEnrichStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = getMioApiClient();
      return client.stories.enrichStory(storyId);
    },
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}

// Generate Story
interface GenerateStoryInput {
  storyId: string;
  answers?: Array<{ questionId: string; value: string }>;
  targetDurationMinutes?: number;
}

export function useGenerateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, answers = [], targetDurationMinutes = 5 }: GenerateStoryInput) => {
      const client = getMioApiClient();
      const body: GenerateStoryBody = { answers, targetDurationMinutes };
      return client.stories.generateStory(storyId, body);
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}

// Delete Story
export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = getMioApiClient();
      return client.stories.deleteStory(storyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}

// Update Story Prompt
interface UpdateStoryInput {
  storyId: string;
  prompt: string;
}

export function useUpdateStoryPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, prompt }: UpdateStoryInput) => {
      const client = getMioApiClient();
      return client.admin.updateStoryPrompt(storyId, prompt);
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}

// Regenerate Story
interface RegenerateStoryInput {
  storyId: string;
  targetDurationMinutes?: number;
}

export function useRegenerateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, targetDurationMinutes }: RegenerateStoryInput) => {
      const client = getMioApiClient();
      return client.admin.regenerateStory(storyId, { targetDurationMinutes });
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}
