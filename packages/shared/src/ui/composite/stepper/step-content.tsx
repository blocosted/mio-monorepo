"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "../../utils";
import { Progress } from "../../primitives/progress";
import type { Step } from "./types";

export interface StepContentPanelProps {
  step: Step;
  children?: React.ReactNode;
  className?: string;
  onExecute?: () => void;
  onReset?: () => void;
  isExecuting?: boolean;
  canExecute?: boolean;
  showAutoContinu?: boolean;
  autoContinu?: boolean;
  onAutoContinuChange?: (value: boolean) => void;
}

export function StepContentPanel({
  step,
  children,
  className,
  onExecute,
  onReset,
  isExecuting,
  canExecute = true,
  showAutoContinu,
  autoContinu,
  onAutoContinuChange,
}: StepContentPanelProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      {/* Step Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {step.status === "completed" && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {step.status === "in_progress" && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {step.status === "failed" && (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          )}
          <h3 className="text-lg font-semibold">{step.label}</h3>
        </div>
        {step.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {step.description}
          </p>
        )}
      </div>

      {/* Progress Bar (for in_progress) */}
      {step.status === "in_progress" && step.progress !== undefined && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{step.progress}%</span>
          </div>
          <Progress value={step.progress} className="h-2" />
        </div>
      )}

      {/* Error Message */}
      {step.status === "failed" && step.error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {step.error}
        </div>
      )}

      {/* Step Content */}
      {children && <div className="mb-4">{children}</div>}

      {/* Auto-continue Checkbox */}
      {showAutoContinu && onAutoContinuChange && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-continue"
            checked={autoContinu}
            onChange={(e) => onAutoContinuChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="auto-continue"
            className="text-sm text-muted-foreground"
          >
            Auto-continue to next phase
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onExecute && step.status !== "completed" && (
          <button
            type="button"
            onClick={onExecute}
            disabled={isExecuting || !canExecute}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute Phase"
            )}
          </button>
        )}

        {onReset && step.status !== "pending" && (
          <button
            type="button"
            onClick={onReset}
            disabled={isExecuting}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            Reset to This Phase
          </button>
        )}
      </div>
    </div>
  );
}
