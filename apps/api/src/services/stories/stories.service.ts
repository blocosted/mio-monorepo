/**
 * Stories Service Implementation
 *
 * Business logic for story creation and management.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { AppError, ErrorCodes } from '@mio/shared';

import { IocStore } from '../../ioc';
import type { IProfilesStore } from '../profiles';
import type {
    CreateStoryInput,
    IStoriesService,
    IStoriesStore,
    Story,
} from './stories.service.types';
import { mapRowToStory } from './stories.service.map';

@injectable()
export class StoriesService implements IStoriesService {
    constructor(
        @inject(IocStore.STORIES_STORE)
        private readonly store: IStoriesStore,
        @inject(IocStore.PROFILES_STORE)
        private readonly profilesStore: IProfilesStore
    ) {}

    /**
     * Create a new story from an initial prompt.
     * Ensures the child profile exists before insertion.
     */
    async create(input: CreateStoryInput): Promise<Story> {
        const profile = await this.profilesStore.findById(input.childProfileId);
        if (!profile) {
            throw new AppError(ErrorCodes.NotFound, { name: 'ChildProfileNotFound' });
        }

        const row = await this.store.insert({
            childProfileId: input.childProfileId,
            initialPrompt: input.prompt,
        });

        return mapRowToStory(row);
    }
}
