"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Settings } from "lucide-react";

import { Stepper, StepContentPanel } from "@mio/ui/stepper";
import { Alert, AlertDescription, AlertTitle } from "@mio/ui/alert";
import { Skeleton } from "@mio/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@mio/ui/card";
import { Label } from "@mio/ui/label";
import { Input } from "@mio/ui/input";
import { Button } from "@mio/ui/button";

import { usePhaseStates, type PhaseState } from "@/hooks/queries/use-phase-states";
import { useStoryAudioAssets, useStory } from "@/hooks/queries/use-story";
import { useExecutePhase, useResetToPhase, useUpdateStorySettings, type WorkflowPhase } from "@/hooks/mutations/use-phase-execution";
import {
  AudioOutput,
  ConceptOutput,
  FinalOutput,
  MixOutput,
  VoicesOutput,
  VoiceSelectionPanel,
} from "./phase-outputs";

interface StoryStepperViewProps {
  storyId: string;
  storyTitle: string;
}

export function StoryStepperView({ storyId, storyTitle }: StoryStepperViewProps) {
  const [activePhase, setActivePhase] = React.useState<WorkflowPhase>("concept");
  const [autoContinue, setAutoContinue] = React.useState(false);
  const [editingDuration, setEditingDuration] = React.useState(false);
  const [durationInput, setDurationInput] = React.useState("");

  const { data: story } = useStory(storyId);
  const { data: phaseStates, isLoading: isLoadingPhases, error: phasesError } = usePhaseStates(storyId);
  const { data: audioAssets } = useStoryAudioAssets(storyId);
  const executePhase = useExecutePhase();
  const resetToPhase = useResetToPhase();
  const updateSettings = useUpdateStorySettings();

  // Initialize duration input when story loads
  React.useEffect(() => {
    if (story?.targetDurationMinutes) {
      setDurationInput(String(story.targetDurationMinutes));
    }
  }, [story?.targetDurationMinutes]);

  // Auto-continue to next phase when current phase completes
  React.useEffect(() => {
    if (!autoContinue || !phaseStates) return;

    const currentPhaseState = phaseStates.find((p) => p.phase === activePhase);
    if (currentPhaseState?.status === "completed" && currentPhaseState.steps.every((s) => s.status === "completed")) {
      const phases: WorkflowPhase[] = ["concept", "voices", "audio", "mix", "final"];
      const currentIndex = phases.indexOf(activePhase);
      const nextPhase = phases[currentIndex + 1];

      if (nextPhase) {
        const nextPhaseState = phaseStates.find((p) => p.phase === nextPhase);
        if (nextPhaseState?.canExecute && nextPhaseState.status === "pending") {
          setActivePhase(nextPhase);
          executePhase.mutate({ storyId, phase: nextPhase });
        }
      }
    }
  }, [phaseStates, activePhase, autoContinue, storyId, executePhase]);

  if (isLoadingPhases) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (phasesError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading phases</AlertTitle>
        <AlertDescription>
          {phasesError instanceof Error ? phasesError.message : "Failed to load phase states"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!phaseStates || phaseStates.length === 0) {
    return (
      <Alert>
        <AlertTitle>No phases found</AlertTitle>
        <AlertDescription>
          This story does not have any generation phases yet.
        </AlertDescription>
      </Alert>
    );
  }

  const steps = phaseStates.map((phase) => ({
    id: phase.phase,
    label: phase.label,
    description: phase.description,
    status: phase.status,
    progress: phase.progress,
    completedAt: phase.completedAt,
    error: phase.error,
  }));

  const activePhaseState = phaseStates.find((p) => p.phase === activePhase);

  const handleStepClick = (stepId: string) => {
    setActivePhase(stepId as WorkflowPhase);
  };

  const handleExecute = () => {
    if (!activePhaseState?.canExecute) return;
    executePhase.mutate({ storyId, phase: activePhase });
  };

  const handleReset = () => {
    resetToPhase.mutate({ storyId, phase: activePhase });
  };

  const isExecuting = executePhase.isPending || activePhaseState?.status === "in_progress";

  return (
    <div className="space-y-6">
      {/* Stepper Navigation */}
      <Stepper
        steps={steps}
        activeStep={activePhase}
        onStepClick={handleStepClick}
      />

      {/* Execution Status Alert */}
      {executePhase.isSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Phase completed</AlertTitle>
          <AlertDescription>
            {executePhase.data?.stepsCompleted.join(", ")} completed successfully.
            {executePhase.data?.nextPhase && ` Next phase: ${executePhase.data.nextPhase}`}
          </AlertDescription>
        </Alert>
      )}

      {executePhase.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Phase execution failed</AlertTitle>
          <AlertDescription>
            {executePhase.error instanceof Error
              ? executePhase.error.message
              : "An error occurred while executing the phase"}
          </AlertDescription>
        </Alert>
      )}

      {/* Active Phase Content */}
      {activePhaseState && (
        <StepContentPanel
          step={{
            id: activePhaseState.phase,
            label: activePhaseState.label,
            description: activePhaseState.description,
            status: activePhaseState.status,
            progress: activePhaseState.progress,
            completedAt: activePhaseState.completedAt,
            error: activePhaseState.error,
          }}
          onExecute={handleExecute}
          onReset={handleReset}
          isExecuting={isExecuting}
          canExecute={activePhaseState.canExecute}
          showAutoContinu={activePhase !== "final"}
          autoContinu={autoContinue}
          onAutoContinuChange={setAutoContinue}
        >
          <>
            {/* Concept Phase Settings */}
            {activePhase === "concept" && (
              <ConceptPhaseSettings
                targetDurationMinutes={story?.targetDurationMinutes ?? 5}
                isEditing={editingDuration}
                durationInput={durationInput}
                onDurationInputChange={setDurationInput}
                onEditToggle={() => {
                  if (editingDuration) {
                    // Save changes
                    const newDuration = parseFloat(durationInput);
                    if (!isNaN(newDuration) && newDuration >= 0.1 && newDuration <= 30) {
                      updateSettings.mutate({
                        storyId,
                        targetDurationMinutes: newDuration,
                      });
                    }
                  }
                  setEditingDuration(!editingDuration);
                }}
                isSaving={updateSettings.isPending}
              />
            )}

            {/* Voice Selection Panel (before voice generation) */}
            {activePhase === "voices" && (
              <div className="mb-4">
                <VoiceSelectionPanel storyId={storyId} />
              </div>
            )}

            {/* Phase-specific Output */}
            {activePhaseState.output && (
              <PhaseOutputViewer
                phase={activePhase}
                output={activePhaseState.output}
                storyTitle={storyTitle}
                audioAssets={audioAssets}
              />
            )}

            {/* Sub-steps Progress */}
            {activePhaseState.steps.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Sub-steps:</p>
                <div className="space-y-2">
                  {activePhaseState.steps.map((step) => (
                    <div
                      key={step.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      {step.status === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {step.status === "in_progress" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {step.status === "pending" && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      {step.status === "failed" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="capitalize">
                        {step.name.replace(/_/g, " ")}
                      </span>
                      {step.progress !== undefined && step.status === "in_progress" && (
                        <span className="text-muted-foreground">
                          ({step.progress}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        </StepContentPanel>
      )}
    </div>
  );
}

interface PhaseOutputViewerProps {
  phase: WorkflowPhase;
  output: unknown;
  storyTitle: string;
  audioAssets?: Array<{
    id: string;
    storyId: string | null;
    segmentId: string | null;
    type: string;
    url: string;
    duration: number;
    cacheKey: string | null;
    createdAt: string;
  }>;
}

function PhaseOutputViewer({ phase, output, storyTitle, audioAssets }: PhaseOutputViewerProps) {
  switch (phase) {
    case "concept":
      return <ConceptOutput output={output as any} />;
    case "voices":
      return (
        <VoicesOutput
          output={output as any}
          audioAssets={audioAssets}
          storyTitle={storyTitle}
        />
      );
    case "audio":
      return (
        <AudioOutput
          output={output as any}
          audioAssets={audioAssets}
          storyTitle={storyTitle}
        />
      );
    case "mix":
      return <MixOutput output={output as any} storyTitle={storyTitle} />;
    case "final":
      return <FinalOutput output={output as any} storyTitle={storyTitle} />;
    default:
      return null;
  }
}

interface ConceptPhaseSettingsProps {
  targetDurationMinutes: number;
  isEditing: boolean;
  durationInput: string;
  onDurationInputChange: (value: string) => void;
  onEditToggle: () => void;
  isSaving: boolean;
}

function ConceptPhaseSettings({
  targetDurationMinutes,
  isEditing,
  durationInput,
  onDurationInputChange,
  onEditToggle,
  isSaving,
}: ConceptPhaseSettingsProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} seconds`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Generation Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="duration" className="text-sm font-medium">
              Target Duration:
            </Label>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                min={0.1}
                max={30}
                step={0.1}
                value={durationInput}
                onChange={(e) => onDurationInputChange(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
              <Button
                size="sm"
                onClick={onEditToggle}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatDuration(targetDurationMinutes)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={onEditToggle}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
