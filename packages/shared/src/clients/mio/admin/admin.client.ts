/**
 * Admin API Client
 *
 * HTTP client for admin API endpoints using Eden treaty.
 * Combines all admin sub-clients into a single facade.
 */

import type { MioApiClient } from '..';
import type { PaginatedResponse, CursorPagination } from './common';
import { VoicesAdminClient } from './voices';
import type { VoiceFilters, Voice } from './voices';
import { AudioLibraryAdminClient } from './audio-library';
import type { SfxFilters, SfxTrack, AmbianceFilters, AmbianceTrack, MusicFilters, MusicTrack } from './audio-library';
import { StoriesAdminClient } from './stories';
import type {
  StoryFilters,
  AdminStory,
  StorySegment,
  AudioAsset,
  UpdateStoryPromptResponse,
  CreateAndGenerateStoryBody,
  CreateAndGenerateStoryResponse,
  RegenerateStoryBody,
  RegenerateStoryResponse
} from './stories';
import { ProfilesAdminClient } from './profiles';
import type { ProfileFilters, AdminProfile, CreateAdminProfileBody } from './profiles';

export class MioApiAdminClient {
  public readonly client: MioApiClient;

  private readonly voices: VoicesAdminClient;
  private readonly audioLibrary: AudioLibraryAdminClient;
  private readonly stories: StoriesAdminClient;
  private readonly profiles: ProfilesAdminClient;

  constructor(client: MioApiClient) {
    this.client = client;
    this.voices = new VoicesAdminClient(client);
    this.audioLibrary = new AudioLibraryAdminClient(client);
    this.stories = new StoriesAdminClient(client);
    this.profiles = new ProfilesAdminClient(client);
  }

  // ===========================================================================
  // Voices
  // ===========================================================================

  public async getVoices(filters?: VoiceFilters, pagination?: CursorPagination): Promise<PaginatedResponse<Voice>> {
    return this.voices.getVoices(filters, pagination);
  }

  // ===========================================================================
  // SFX
  // ===========================================================================

  public async getSfx(filters?: SfxFilters, pagination?: CursorPagination): Promise<PaginatedResponse<SfxTrack>> {
    return this.audioLibrary.getSfx(filters, pagination);
  }

  // ===========================================================================
  // Ambiance
  // ===========================================================================

  public async getAmbiance(
    filters?: AmbianceFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AmbianceTrack>> {
    return this.audioLibrary.getAmbiance(filters, pagination);
  }

  // ===========================================================================
  // Music
  // ===========================================================================

  public async getMusic(filters?: MusicFilters, pagination?: CursorPagination): Promise<PaginatedResponse<MusicTrack>> {
    return this.audioLibrary.getMusic(filters, pagination);
  }

  // ===========================================================================
  // Stories
  // ===========================================================================

  public async getStories(
    filters?: StoryFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AdminStory>> {
    return this.stories.getStories(filters, pagination);
  }

  public async getStory(id: string): Promise<AdminStory> {
    return this.stories.getStory(id);
  }

  public async getStorySegments(storyId: string): Promise<StorySegment[]> {
    return this.stories.getStorySegments(storyId);
  }

  public async getStoryAudioAssets(storyId: string): Promise<AudioAsset[]> {
    return this.stories.getStoryAudioAssets(storyId);
  }

  public async updateStoryPrompt(id: string, prompt: string): Promise<UpdateStoryPromptResponse> {
    return this.stories.updateStoryPrompt(id, prompt);
  }

  public async createAndGenerateStory(body: CreateAndGenerateStoryBody): Promise<CreateAndGenerateStoryResponse> {
    return this.stories.createAndGenerateStory(body);
  }

  public async regenerateStory(storyId: string, body?: RegenerateStoryBody): Promise<RegenerateStoryResponse> {
    return this.stories.regenerateStory(storyId, body);
  }

  // ===========================================================================
  // Profiles
  // ===========================================================================

  public async getProfiles(
    filters?: ProfileFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AdminProfile>> {
    return this.profiles.getProfiles(filters, pagination);
  }

  public async createProfile(input: CreateAdminProfileBody): Promise<AdminProfile> {
    return this.profiles.createProfile(input);
  }
}
