/**
 * Profiles Handler Mappers
 *
 * Maps between API request/response DTOs and service layer models.
 * Uses only primitive/shared types (enum-like literals) from @mio/shared/types.
 * Uses layer-specific types (handlers ↔ service) without `unknown`.
 */

import type { Gender } from '@mio/shared/types';
import type {
    ChildProfile,
    CreateChildProfileInput,
    UpdateChildProfileInput,
} from '../../services/profiles/profiles.service.types';
import type { CreateProfileBody, UpdateProfileBody, ProfilePreferences } from './profiles.handlers.types';

/**
 * API Response DTO for a profile
 */
export interface ProfileResponseDto {
    id: string;
    firstName: string;
    age: number;
    gender: Gender;
    preferences: ProfilePreferences;
    createdAt: string;
    updatedAt: string;
}

/**
 * Map a service ChildProfile to API response DTO
 */
export function mapProfileToResponse(profile: ChildProfile): ProfileResponseDto {
    return {
        id: profile.id,
        firstName: profile.firstName,
        age: profile.age,
        gender: profile.gender,
        preferences: profile.preferences,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
    };
}

/**
 * Map multiple profiles to API response DTOs
 */
export function mapProfilesToResponse(profiles: ChildProfile[]): ProfileResponseDto[] {
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
        preferences: body.preferences,
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
        preferences: body.preferences,
    };
}
