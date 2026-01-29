/**
 * Phase Execution Mutation Hooks
 *
 * TanStack Query mutations for executing and resetting phases.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getMioApiClient } from "@/lib/api/mio-client";

// Define local types to avoid export issues
export type WorkflowPhase = "concept" | "voices" | "audio" | "mix" | "final";

export interface ExecutePhaseResponse {
  success: boolean;
  phase: WorkflowPhase;
  nextPhase?: WorkflowPhase;
  stepsCompleted: string[];
  output?: unknown;
  error?: string;
}

export interface ResetToPhaseResponse {
  success: boolean;
  phase: WorkflowPhase;
  phasesReset: WorkflowPhase[];
}

interface ExecutePhaseInput {
  storyId: string;
  phase: WorkflowPhase;
  targetDurationMinutes?: number;
}

interface ResetToPhaseInput {
  storyId: string;
  phase: WorkflowPhase;
}

export function useExecutePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExecutePhaseInput) => {
      const client = getMioApiClient();
      return client.admin.executePhase(input.storyId, input.phase, {
        targetDurationMinutes: input.targetDurationMinutes,
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate phase states to refresh
      queryClient.invalidateQueries({
        queryKey: ["admin", "stories", variables.storyId, "phases"],
      });
      // Also invalidate story data as it may have changed
      queryClient.invalidateQueries({
        queryKey: ["admin", "stories", variables.storyId],
      });
      // And audio assets
      queryClient.invalidateQueries({
        queryKey: ["admin", "stories", variables.storyId, "audio-assets"],
      });
    },
  });
}

export function useResetToPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResetToPhaseInput) => {
      const client = getMioApiClient();
      return client.admin.resetToPhase(input.storyId, input.phase);
    },
    onSuccess: (_data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ["admin", "stories", variables.storyId],
      });
    },
  });
}

interface UpdateStorySettingsInput {
  storyId: string;
  targetDurationMinutes?: number;
}

export interface UpdateStorySettingsResponse {
  success: boolean;
  targetDurationMinutes?: number;
}

export function useUpdateStorySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStorySettingsInput) => {
      const client = getMioApiClient();
      return client.admin.updateStorySettings(input.storyId, {
        targetDurationMinutes: input.targetDurationMinutes,
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate story data to refresh
      queryClient.invalidateQueries({
        queryKey: ["admin", "stories", variables.storyId],
      });
    },
  });
}
