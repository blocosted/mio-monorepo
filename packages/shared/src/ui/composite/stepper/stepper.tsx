"use client";

import * as React from "react";

import { cn } from "../../utils";
import { StepIndicator } from "./step-indicator";
import type { StepperProps } from "./types";

export function Stepper({
  steps,
  activeStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Step Indicators Row */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <StepIndicator
            key={step.id}
            step={step}
            index={index}
            isActive={step.id === activeStep}
            isLast={index === steps.length - 1}
            onClick={onStepClick ? () => onStepClick(step.id) : undefined}
          />
        ))}
      </div>

      {/* Step Labels Row */}
      <div className="mt-2 flex justify-between px-0">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          return (
            <div
              key={step.id}
              className={cn(
                "flex flex-1 flex-col items-center text-center",
                index === 0 && "items-start text-left",
                index === steps.length - 1 && "items-end text-right"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium sm:text-sm",
                  isActive && "text-primary",
                  step.status === "completed" && "text-green-600",
                  step.status === "failed" && "text-destructive",
                  step.status === "pending" && !isActive && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
