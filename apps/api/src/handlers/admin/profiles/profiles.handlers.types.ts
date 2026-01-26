/**
 * Profiles Admin Handler Types
 *
 * Typebox schemas for profiles admin endpoints.
 */

import { t } from 'elysia';

/**
 * Profile filter parameters
 */
export const ProfileFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  gender: t.Optional(t.String()),
  search: t.Optional(t.String())
});
