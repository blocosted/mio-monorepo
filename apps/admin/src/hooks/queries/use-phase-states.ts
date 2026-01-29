/**
 * Phase States Query Hook
 *
 * TanStack Query hook for fetching phase states.
 */

"use client";

import { useQuery } from "@tanstack/react-query";

import { getMioApiClient } from "@/lib/api/mio-client";

// Define local types to avoid export issues
export type PhaseStatus = "pending" | "in_progress" | "completed" | "failed";
export type WorkflowPhase = "concept" | "voices" | "audio" | "mix" | "final";

export interface StepProgress {
  name: string;
  status: PhaseStatus;
  progress?: number;
  completedAt?: string;
  error?: string;
}

export interface PhaseState {
  phase: WorkflowPhase;
  label: string;
  description: string;
  status: PhaseStatus;
  progress?: number;
  completedAt?: string;
  error?: string;
  canExecute: boolean;
  steps: StepProgress[];
  output?: unknown;
}

export function usePhaseStates(storyId: string) {
  return useQuery({
    queryKey: ["admin", "stories", storyId, "phases"],
    queryFn: async () => {
      const client = getMioApiClient();
      const response = await client.admin.getPhaseStates(storyId);
      return response.data as PhaseState[];
    },
    enabled: !!storyId,
    refetchInterval: (query) => {
      // Refetch while any phase is in progress
      const data = query.state.data;
      if (!data) return false;
      const hasInProgress = data.some((p: PhaseState) => p.status === "in_progress");
      return hasInProgress ? 2000 : false; // Poll every 2s when in progress
    },
  });
}
