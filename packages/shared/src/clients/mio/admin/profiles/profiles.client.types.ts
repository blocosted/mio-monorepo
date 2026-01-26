/**
 * Profiles Admin Client Types
 *
 * Typebox schemas for profiles admin endpoints.
 */

import { t } from 'elysia';

import { GenderValues } from '../../../../types';

/**
 * Typebox enum helper
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

// =============================================================================
// Profile Filters
// =============================================================================

export const ProfileFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  gender: t.Optional(t.String())
});

export type ProfileFilters = typeof ProfileFiltersSchema.static;

export const AdminProfileSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  firstName: t.String(),
  age: t.Number(),
  gender: enumValues(GenderValues),
  preferences: t.Nullable(t.Unknown()),
  createdAt: t.String(),
  updatedAt: t.String()
});

export type AdminProfile = typeof AdminProfileSchema.static;
