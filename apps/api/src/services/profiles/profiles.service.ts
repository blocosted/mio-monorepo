/**
 * Profiles Service Implementation
 *
 * Business logic for child profile management.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocService } from '../../ioc';
import type {
    ChildProfile,
    CreateChildProfileInput,
    UpdateChildProfileInput,
    IProfilesService,
    IProfilesStore,
} from './profiles.service.types';
import { mapRowToProfile, mapRowsToProfiles } from './profiles.service.map';

@injectable()
export class ProfilesService implements IProfilesService {
    constructor(
        @inject(IocService.PROFILES_STORE)
        private readonly store: IProfilesStore
    ) {}

    /**
     * Create a new child profile
     */
    async create(input: CreateChildProfileInput): Promise<ChildProfile> {
        const row = await this.store.insert(input);
        return mapRowToProfile(row);
    }

    /**
     * Get a profile by ID
     */
    async getById(id: string): Promise<ChildProfile | null> {
        const row = await this.store.findById(id);
        if (!row) {
            return null;
        }
        return mapRowToProfile(row);
    }

    /**
     * Get all profiles
     */
    async getAll(): Promise<ChildProfile[]> {
        const rows = await this.store.findAll();
        return mapRowsToProfiles(rows);
    }

    /**
     * Update a profile
     */
    async update(id: string, input: UpdateChildProfileInput): Promise<ChildProfile | null> {
        const row = await this.store.update(id, input);
        if (!row) {
            return null;
        }
        return mapRowToProfile(row);
    }

    /**
     * Delete a profile
     */
    async delete(id: string): Promise<boolean> {
        return this.store.delete(id);
    }
}
