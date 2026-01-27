/**
 * Create and Generate Story Mutation Hook
 *
 * TanStack Query mutation for creating a story and triggering generation workflow.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateAndGenerateStoryBody, CreateAndGenerateStoryResponse } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { CreateAndGenerateStoryBody, CreateAndGenerateStoryResponse };

export function useCreateAndGenerateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAndGenerateStoryBody): Promise<CreateAndGenerateStoryResponse> => {
      const client = getMioApiClient();
      return client.admin.createAndGenerateStory(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] });
    }
  });
}
