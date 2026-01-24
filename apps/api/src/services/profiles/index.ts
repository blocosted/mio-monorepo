/**
 * Profiles Service Exports
 */

// Client-facing types (inferred from handler schemas)
export type {
  CreateProfileBody as CreateProfileParams,
  ProfileResponse
} from '@mio/shared/clients/mio/profiles';

export type {
  ChildPreferences,
  ChildProfile,
  CreateChildProfileInput,
  IProfilesService,
  IProfilesStore,
  ProfileRow,
  UpdateChildProfileInput
} from './profiles.service.types';
export { ProfilesService } from './profiles.service';
export { mapRowsToProfiles, mapRowToProfile } from './profiles.service.map';
export { ProfilesStore } from './profiles.service.store';
