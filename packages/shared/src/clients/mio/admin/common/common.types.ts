/**
 * Common Admin Client Types
 *
 * Shared Typebox schemas for pagination.
 */

import { t } from 'elysia';

// =============================================================================
// Pagination
// =============================================================================

export const CursorPaginationSchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
});

export type CursorPagination = typeof CursorPaginationSchema.static;

// =============================================================================
// Paginated Response
// =============================================================================

export const PaginatedResponseSchema = <T extends ReturnType<typeof t.Object>>(itemSchema: T) =>
  t.Object({
    data: t.Array(itemSchema),
    nextCursor: t.Nullable(t.String()),
    prevCursor: t.Nullable(t.String()),
    hasMore: t.Boolean()
  });

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}
