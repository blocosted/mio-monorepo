/**
 * Profiles Admin Handler Types
 *
 * Typebox schemas for profiles admin endpoints.
 */

import { t } from 'elysia';

import { GenderValues } from '@mio/shared/types';

/**
 * Typebox enum helper
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

/**
 * Profile filter parameters
 */
export const ProfileFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  gender: t.Optional(t.String()),
  search: t.Optional(t.String()),
  isTest: t.Optional(t.Boolean())
});

/**
 * Create admin profile body schema
 */
export const CreateAdminProfileBodySchema = t.Object({
  firstName: t.String({ minLength: 1, maxLength: 50 }),
  age: t.Number({ minimum: 3, maximum: 12 }),
  gender: enumValues(GenderValues)
});

export type CreateAdminProfileBody = typeof CreateAdminProfileBodySchema.static;
