/**
 * Stepper Component Types
 */

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Step {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
  progress?: number;
  completedAt?: string;
  error?: string;
}

export interface StepperProps {
  steps: Step[];
  activeStep: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export interface StepIndicatorProps {
  step: Step;
  index: number;
  isActive: boolean;
  isLast: boolean;
  onClick?: () => void;
}

export interface StepContentProps {
  step: Step;
  children: React.ReactNode;
  className?: string;
}
