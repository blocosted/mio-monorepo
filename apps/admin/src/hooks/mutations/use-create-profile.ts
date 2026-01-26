/**
 * Create Profile Mutation Hook
 *
 * TanStack Query mutation for creating a new test profile.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateAdminProfileBody, AdminProfile } from '@mio/shared/clients/mio';

import { getMioApiClient } from '@/lib/api/mio-client';

export type { CreateAdminProfileBody as CreateProfileInput, AdminProfile as CreateProfileResponse };

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdminProfileBody): Promise<AdminProfile> => {
      const client = getMioApiClient();
      return client.admin.createProfile(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    }
  });
}
