"use client";

import * as React from "react";
import { Check, Loader2, X } from "lucide-react";

import { cn } from "../../utils";
import type { StepIndicatorProps, StepStatus } from "./types";

const statusStyles: Record<StepStatus, string> = {
  pending: "border-muted-foreground/30 bg-background text-muted-foreground",
  in_progress: "border-primary bg-primary text-primary-foreground animate-pulse",
  completed: "border-green-500 bg-green-500 text-white",
  failed: "border-destructive bg-destructive text-destructive-foreground",
};

const connectorStyles: Record<StepStatus, string> = {
  pending: "bg-muted-foreground/30",
  in_progress: "bg-muted-foreground/30",
  completed: "bg-green-500",
  failed: "bg-destructive",
};

export function StepIndicator({
  step,
  index,
  isActive,
  isLast,
  onClick,
}: StepIndicatorProps) {
  const canClick = onClick && step.status !== "in_progress";

  return (
    <div className="flex items-center">
      {/* Step Circle */}
      <button
        type="button"
        onClick={canClick ? onClick : undefined}
        disabled={!canClick}
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
          statusStyles[step.status],
          isActive && step.status === "pending" && "border-primary ring-2 ring-primary/20",
          canClick && "cursor-pointer hover:ring-2 hover:ring-primary/20",
          !canClick && "cursor-default"
        )}
      >
        {step.status === "completed" ? (
          <Check className="h-5 w-5" />
        ) : step.status === "failed" ? (
          <X className="h-5 w-5" />
        ) : step.status === "in_progress" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <span>{index + 1}</span>
        )}
      </button>

      {/* Connector Line */}
      {!isLast && (
        <div
          className={cn(
            "h-0.5 w-12 sm:w-16 md:w-20 lg:w-24",
            connectorStyles[step.status]
          )}
        />
      )}
    </div>
  );
}
