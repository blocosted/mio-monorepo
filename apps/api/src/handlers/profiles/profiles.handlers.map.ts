/**
 * Profiles Handler Mappers
 *
 * Maps between API request/response and service layer models.
 */

import type { CreateProfileBody, ProfileResponse, UpdateProfileBody } from '@mio/shared/clients/mio/profiles';

import type { ChildProfile, CreateChildProfileInput, UpdateChildProfileInput } from '../../services/profiles/profiles.service.types';

/**
 * Map a service ChildProfile to API response DTO
 */
export function mapProfileToResponse(profile: ChildProfile): ProfileResponse {
  return {
    id: profile.id,
    firstName: profile.firstName,
    age: profile.age,
    gender: profile.gender,
    preferences: profile.preferences,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

/**
 * Map multiple profiles to API response DTOs
 */
export function mapProfilesToResponse(profiles: ChildProfile[]): ProfileResponse[] {
  return profiles.map(mapProfileToResponse);
}

/**
 * Map API request body to service input for creation
 */
export function mapCreateBodyToInput(body: CreateProfileBody): CreateChildProfileInput {
  return {
    firstName: body.firstName,
    age: body.age,
    gender: body.gender,
    preferences: body.preferences
  };
}

/**
 * Map API request body to service input for update
 */
export function mapUpdateBodyToInput(body: UpdateProfileBody): UpdateChildProfileInput {
  return {
    firstName: body.firstName,
    age: body.age,
    gender: body.gender,
    preferences: body.preferences
  };
}
