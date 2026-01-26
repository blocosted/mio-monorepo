/**
 * Story Mutations Hooks
 *
 * TanStack Query mutations for story operations.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Enrich Story
export function useEnrichStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient<{ id: string; status: string }>(`/stories/${storyId}/enrich`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
  });
}

// Generate Story
interface GenerateStoryInput {
  storyId: string;
  answers?: Array<{ questionId: string; value: string }>;
  targetDurationMinutes?: number;
}

interface GenerateStoryResponse {
  jobId: string;
  workflowRunId: string;
  message: string;
}

export function useGenerateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, answers = [], targetDurationMinutes = 5 }: GenerateStoryInput) => {
      return apiClient<GenerateStoryResponse>(`/stories/${storyId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ answers, targetDurationMinutes }),
      });
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
  });
}

// Delete Story
export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient<null>(`/stories/${storyId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
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
      return apiClient<{ id: string; prompt: string }>(`/admin/stories/${storyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ prompt }),
      });
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories', storyId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
  });
}
