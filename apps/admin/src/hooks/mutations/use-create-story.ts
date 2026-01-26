/**
 * Create Story Mutation Hook
 *
 * TanStack Query mutation for creating a new story.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface CreateStoryInput {
  childProfileId: string;
  prompt: string;
}

interface CreateStoryResponse {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoryInput) => {
      return apiClient<CreateStoryResponse>('/stories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      // Invalidate stories queries to refetch the list
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    },
  });
}
