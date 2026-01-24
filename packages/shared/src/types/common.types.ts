/**
 * Common Primitive Types (shared)
 *
 * Only primitive/shared types live here (enum-like constants + literal unions).
 * Each layer defines its own request/response interfaces.
 */

/**
 * Sort direction
 */
export const SortDirection = {
  Asc: 'asc',
  Desc: 'desc'
} as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
