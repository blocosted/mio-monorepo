/**
 * Profiles Service Exports
 */

export { ProfilesService } from './profiles.service';
export { ProfilesStore } from './profiles.service.store';
export { mapRowToProfile, mapRowsToProfiles } from './profiles.service.map';
export type {
    IProfilesService,
    IProfilesStore,
    ProfileRow,
    ChildProfile,
    ChildPreferences,
    CreateChildProfileInput,
    UpdateChildProfileInput,
} from './profiles.service.types';

// Client-facing types (inferred from handler schemas)
export type {
    CreateProfileBody as CreateProfileParams,
    ProfileResponse,
} from '@mio/shared/clients/mio/profiles';
