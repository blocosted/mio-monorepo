/**
 * Cursor-Based Pagination Types
 *
 * Types for cursor-based pagination used in admin endpoints.
 * Provides better performance than offset-based pagination for large datasets.
 */

/**
 * Pagination direction
 */
export const PaginationDirection = {
  Forward: 'forward',
  Backward: 'backward'
} as const;

export type PaginationDirection = (typeof PaginationDirection)[keyof typeof PaginationDirection];

/**
 * Cursor pagination parameters for requests
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: PaginationDirection;
}

/**
 * Cursor paginated response wrapper
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

/**
 * Default pagination limit
 */
export const DEFAULT_PAGINATION_LIMIT = 20;

/**
 * Maximum pagination limit
 */
export const MAX_PAGINATION_LIMIT = 100;

/**
 * Ensure limit is within bounds
 */
export function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_PAGINATION_LIMIT;
  if (limit > MAX_PAGINATION_LIMIT) return MAX_PAGINATION_LIMIT;
  return limit;
}
