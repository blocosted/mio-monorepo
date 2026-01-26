/**
 * Profiles Service Mappers
 *
 * Maps between database rows and domain models.
 */

import type { ChildProfile, ProfileRow } from './profiles.service.types';

/**
 * Map a database row to a ChildProfile domain model
 */
export function mapRowToProfile(row: ProfileRow): ChildProfile {
  return {
    id: row.id,
    firstName: row.firstName,
    age: row.age,
    gender: row.gender,
    preferences: row.preferences,
    isTest: row.isTest,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/**
 * Map multiple database rows to ChildProfile domain models
 */
export function mapRowsToProfiles(rows: ProfileRow[]): ChildProfile[] {
  return rows.map(mapRowToProfile);
}
