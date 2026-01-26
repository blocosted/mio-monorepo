/**
 * Create Story Mutation Hook
 *
 * TanStack Query mutation for creating a new story.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateStoryBody, StoryResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { CreateStoryBody as CreateStoryInput, StoryResponse as CreateStoryResponse };

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoryBody) => {
      const client = getMioApiClient();
      return client.stories.createStory(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}
