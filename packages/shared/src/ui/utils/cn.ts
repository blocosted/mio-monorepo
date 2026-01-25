/**
 * Utility for merging Tailwind CSS classes
 *
 * Combines clsx for conditional classes with tailwind-merge
 * to handle conflicting Tailwind utility classes.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
